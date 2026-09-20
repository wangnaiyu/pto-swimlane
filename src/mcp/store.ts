import {realpath,open,stat as fileStat} from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {parseFiles,parseTopo} from '../parser/index';
export class ToolError extends Error { constructor(public code:string,message:string){super(message);} }
export const fail=(code:string,message:string):never=>{throw new ToolError(code,message);};
const inside=(root:string,file:string)=>{const r=path.relative(root,file);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
export class Store {
 datasets=new Map<string,any>(); pending=0;
 constructor(public roots:string[],public maxBytes=128*1024*1024,public maxDatasets=4){}
 async read(file:string){
  if(!path.isAbsolute(file))fail('INVALID_PATH','需要本机绝对路径');
  let resolved:string;try{resolved=await realpath(file);}catch(e:any){if(e.code==='ENOENT')fail('FILE_NOT_FOUND','文件不存在');throw e;}
  if(!this.roots.some(r=>inside(r,resolved)))fail('PATH_DENIED','文件不在启动配置允许的目录内');
  const handle=await open(resolved,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const stat=await handle.stat();if(!stat.isFile())fail('INVALID_FILE','只允许普通文件');if(stat.size>this.maxBytes)fail('FILE_TOO_LARGE','文件超过容量限制');
   // Recheck after opening. No writes are made to user files.
   const actual=await fileStat(resolved);if(actual.ino!==stat.ino||actual.dev!==stat.dev||await realpath(file)!==resolved)fail('FILE_CHANGED','读取时路径发生变化，请重试');
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of handle.createReadStream({autoClose:false})){size+=chunk.length;if(size>this.maxBytes)fail('FILE_TOO_LARGE','读取时文件超过容量限制');chunks.push(chunk);}
   const after=await handle.stat();if(stat.size!==after.size||stat.mtimeMs!==after.mtimeMs)fail('FILE_CHANGED','读取时文件发生变化，请重试');
   return {text:Buffer.concat(chunks).toString('utf8'),resolved};
  }finally{await handle.close();}
 }
 async load(tracePath:string,topoPath?:string){
  if(this.datasets.size+this.pending>=this.maxDatasets)fail('DATASET_LIMIT','请先 close_swimlane 释放一个数据集');this.pending++;
  try{
   const trace=await this.read(tracePath);let topo='',source='trace_flow';const warnings:string[]=[];
   if(topoPath){topo=(await this.read(topoPath)).text;if(!topo.trim())fail('INVALID_TOPO','显式拓扑文件为空');source='dyn_topo';}
   else{try{topo=(await this.read(path.join(path.dirname(trace.resolved),'dyn_topo.txt'))).text;if(!topo.trim())fail('INVALID_TOPO','同目录拓扑文件为空');source='dyn_topo';}catch(e){if(e instanceof ToolError&&e.code==='FILE_NOT_FOUND')warnings.push('未发现 dyn_topo.txt，使用 trace flow；可能没有完整任务依赖。');else throw e;}}
   let raw:any;try{raw=JSON.parse(trace.text);}catch{fail('INVALID_TRACE','泳道 JSON 格式错误');}
   if(!Array.isArray(raw?.traceEvents))fail('INVALID_TRACE','需要 traceEvents 数组');
   for(const event of raw.traceEvents){for(const k of ['seqNo','taskId']){const v=event.args?.[k];if(typeof v==='number'&&!Number.isSafeInteger(v))fail('UNSAFE_TASK_ID',`${k} 超出安全整数范围，请在源 JSON 使用字符串`);}}
   const start=performance.now();let data:any;try{data=await parseFiles(trace.text,topo);}catch(e){fail('PARSE_ERROR',String(e).slice(0,500));}
   const tasks:any[]=[],events=new Map<string,any>(),byKey=new Map<string,any>(),lanes=new Set<string>();
   for(const p of Object.values(data.processes) as any[])for(const t of Object.values(p.threads) as any[])for(const e of t.events){
    const lane=`${p.pid}/${t.tid}`;events.set(e.id,{e,lane});
    if(e.args?.seqNo!==undefined&&e.args?.taskId!==undefined){const key=JSON.stringify([String(e.args.seqNo),String(e.args.taskId)]);if(byKey.has(key))fail('DUPLICATE_TASK','解析结果包含重复 seqNo/taskId');
     const item={seqNo:String(e.args.seqNo),taskId:String(e.args.taskId),name:String(e.name),process_name:String(p.processName),pid:String(p.pid),thread_name:String(t.threadName),lane,start_ns:e.startTime,duration_ns:e.duration,event_id:e.id};tasks.push(item);byKey.set(key,item);lanes.add(lane);}
   }
   if(source==='dyn_topo'){
    const graph=parseTopo(topo);const keys=new Set(tasks.map(t=>`${t.seqNo}-${t.taskId}`));
    for(const key of keys){if(!graph[key])fail('TOPO_MISMATCH','拓扑缺少泳道中的任务');for(const successor of graph[key].successors)if(!keys.has(successor))fail('TOPO_MISMATCH','拓扑后继在泳道中不存在');}
   }
   const id=randomUUID();const ds={id,title:path.basename(path.dirname(trace.resolved))+' / '+path.basename(trace.resolved),data,tasks,byKey,events,parseMs:Math.round(performance.now()-start),dependency_source:source,warnings,lanes:[...lanes],created_at:new Date().toISOString()};
   // Serialized snapshot is independent of any browser UI mutations.
   ds['snapshot']=JSON.stringify({data,title:ds.title,parseMs:ds.parseMs,dataset_id:id});this.datasets.set(id,ds);return ds;
  }finally{this.pending--;}
 }
 get(id:string){return this.datasets.get(id)??fail('DATASET_NOT_FOUND','数据集已关闭或不属于当前 MCP 进程，请重新打开');}
 summary(e:any){return {...e,name:e.name.slice(0,500)};}
 page(items:any[],cursor:string|undefined,limit=50,scope:string){
  let offset=0;const tag=createHash('sha256').update(scope).digest('hex').slice(0,16);
  if(cursor){try{const c=JSON.parse(Buffer.from(cursor,'base64url').toString());if(c.tag!==tag||!Number.isInteger(c.offset)||c.offset<0||c.offset>items.length)throw Error();offset=c.offset;}catch{fail('INVALID_CURSOR','分页游标无效或查询条件已改变');}}
  const page:any[]=[];let bytes=0;for(const item of items.slice(offset,offset+limit)){const s=this.summary(item),n=Buffer.byteLength(JSON.stringify(s));if(bytes+n>24000&&page.length)break;page.push(s);bytes+=n;}
  const next=offset+page.length;return {items:page,total:items.length,next_cursor:next<items.length?Buffer.from(JSON.stringify({offset:next,tag})).toString('base64url'):null};
 }
 query(a:any){const d=this.get(a.dataset_id);if(a.start_ns!==undefined&&a.end_ns!==undefined&&a.start_ns>a.end_ns)fail('INVALID_RANGE','start_ns 不能大于 end_ns');
  const tasks=d.tasks.filter((t:any)=>(!a.name||t.name.toLowerCase().includes(a.name.toLowerCase()))&&(!a.lane||t.lane===a.lane)&&(!a.process_name||t.process_name===a.process_name)&&(a.start_ns===undefined||t.start_ns+t.duration_ns>=a.start_ns)&&(a.end_ns===undefined||t.start_ns<=a.end_ns)&&(a.min_duration_ns===undefined||t.duration_ns>=a.min_duration_ns));
  tasks.sort((x:any,y:any)=>(a.sort==='duration_desc'?y.duration_ns-x.duration_ns:x.start_ns-y.start_ns)||x.event_id.localeCompare(y.event_id));
  return {dataset_id:d.id,time_unit:'ns',time_origin:'minimum trace timestamp',...this.page(tasks,a.cursor,a.limit,JSON.stringify([d.id,a.name??'',a.lane??'',a.process_name??'',a.start_ns,a.end_ns,a.min_duration_ns,a.sort??'start_asc']))};
 }
 detail(a:any){const d=this.get(a.dataset_id),t=d.byKey.get(JSON.stringify([a.seqNo,a.taskId]));if(!t)fail('TASK_NOT_FOUND','未找到该 seqNo/taskId');const {e}=d.events.get(t.event_id);
  const direction=a.direction??'both',refs=[...(direction!=='successors'?(e.dependencies?.predecessors??[]).map((id:string)=>({id,direction:'predecessor'})):[]),...(direction!=='predecessors'?(e.dependencies?.successors??[]).map((id:string)=>({id,direction:'successor'})):[])];
  const deps=refs.map((ref:any)=>{const target=d.events.get(ref.id);return {event_id:ref.id,direction:ref.direction,name:target?.e.name??'(unresolved)',seqNo:target?.e.args?.seqNo===undefined?null:String(target.e.args.seqNo),taskId:target?.e.args?.taskId===undefined?null:String(target.e.args.taskId),lane:target?.lane,unresolved:!target};});
  // Bound even large nested args (e.g. syncEvents). Scalar details only; report omitted fields.
  const args:Record<string,unknown>={},omitted:string[]=[];let bytes=0;
  for(const [key,value] of Object.entries(e.args??{})){const n=Buffer.byteLength(JSON.stringify([key,value]));if(value!==null&&typeof value==='object'||n>2000||bytes+n>8000){omitted.push(key.slice(0,100));continue;}args[key]=value;bytes+=n;}
  return {dataset_id:d.id,task:this.summary(t),args,omitted_arg_fields:omitted.slice(0,50),time_unit:'ns',time_origin:'minimum trace timestamp',dependency_source:d.dependency_source,dependencies:this.page(deps,a.cursor,a.limit,JSON.stringify([d.id,t.event_id,direction]))};
 }
 close(id:string){this.get(id);this.datasets.delete(id);return {dataset_id:id,closed:true};}
}
