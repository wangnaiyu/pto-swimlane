import {mkdir,lstat,open,rm,readFile,rename,readdir,writeFile} from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {fork,ChildProcess} from 'node:child_process';
import {deserialize} from 'node:v8';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const tsxLoader=createRequire(import.meta.url).resolve('tsx');
import {Store,ToolError,fail} from '../mcp/store';
import {RemoteState,LOCAL_TEST_POLICY,Policy} from './state';
import {StorageBudget} from './storage-budget';
export const FILE_TEST_POLICY={maxBytes:16*1048576,maxConcurrent:2,parseTimeoutMs:30000,parseMemoryMiB:256};
export type FilePolicy=typeof FILE_TEST_POLICY & {maxStorageBytes?:number;maxSnapshotBytes?:number;smallFileBytes?:number;maxQueued?:number;maxCacheDatasets?:number};
export class RemoteFiles {
 queue:Array<{owner:string;id:string;filename:string;hasTopo:boolean;weight:number;done:()=>void}>=[];weights=new Map<string,number>();pumping=false;stopping=false;
 starting=new Map<string,string>();budget:StorageBudget;
 state!:RemoteState; cache=new Store([],0,0);jobs=new Map<string,{owner:string,child:ChildProcess}>();writing=new Set<string>();locked=false;
 constructor(public root:string,public policy:FilePolicy={...FILE_TEST_POLICY},public statePolicy:Policy=LOCAL_TEST_POLICY){this.budget=new StorageBudget(root,policy.maxStorageBytes);if(policy.maxStorageBytes&&!policy.maxSnapshotBytes)throw Error("Storage budget requires snapshot bound");}
 async init(){try{await mkdir(this.root,{recursive:true,mode:0o700});const stat=await lstat(this.root);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Storage root must be a private real directory');for(const p of ['uploads','datasets']){await mkdir(path.join(this.root,p),{recursive:true,mode:0o700});const s=await lstat(path.join(this.root,p));if(s.isSymbolicLink()||!s.isDirectory())throw Error('Unsafe storage directory');}
  const lock=await open(path.join(this.root,'server.lock'),'wx',0o600);await lock.writeFile(String(process.pid));await lock.close();this.locked=true;
  for(const n of ['state.db','state.db-wal','state.db-shm']){const info=await lstat(path.join(this.root,n)).catch(()=>null);if(info?.isSymbolicLink())throw Error('Unsafe database path');}
  this.state=new RemoteState(path.join(this.root,'state.db'),this.statePolicy);this.state.recover();
  for(const id of await readdir(path.join(this.root,'datasets'))){if(!this.state.db.prepare('SELECT id FROM datasets WHERE id=?').get(id))await rm(path.join(this.root,'datasets',id),{recursive:true,force:true});}
  for(const entry of await readdir(path.join(this.root,'uploads')))await rm(path.join(this.root,'uploads',entry),{recursive:true,force:true});await this.cleanup();return this;}catch(e){this.state?.dispose();if(this.locked)await rm(path.join(this.root,'server.lock'),{force:true});this.locked=false;throw e;}}
 dir(id:string){if(!/^[0-9a-f-]{36}$/.test(id))fail('NOT_FOUND','上传不存在');return path.join(this.root,'uploads',id);}
 async create(owner:string,id?:string){const result=this.state.create(owner,id);const cancel:string[]=[];for(const [upload,j] of this.jobs){const u=this.state.db.prepare('SELECT view_id FROM uploads WHERE id=?').get(upload) as any;if(u?.view_id===result.view_session_id){cancel.push(upload);j.child.kill('SIGKILL');}}const deadline=Date.now()+5000;while(cancel.some(k=>this.jobs.has(k))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));await this.cleanupUploads();return result;}
 async cleanupUploads(){const rows=this.state.db.prepare("SELECT id,state,expires FROM uploads WHERE state IN ('failed','superseded','expired') OR expires<=?").all(Date.now()) as any[];for(const u of rows){if(!this.jobs.has(u.id)&&![...this.writing].some(k=>k.startsWith(u.id+':')))await rm(this.dir(u.id),{recursive:true,force:true});}}
 async write(owner:string,id:string,slot:string,stream:AsyncIterable<Uint8Array>){
  if(!['trace','topo'].includes(slot))fail('INVALID_SLOT','只允许 trace/topo');const u=this.state.upload(owner,id);this.state.transition(owner,id,['pending','uploading'],'uploading');
  const key=id+':'+slot;if(this.writing.has(key))fail('UPLOAD_CONFLICT','此文件正在上传');this.writing.add(key);
  const dir=this.dir(id);let handle:any;try{await mkdir(dir,{mode:0o700});}catch(e:any){if(e.code!=='EEXIST'){this.writing.delete(key);throw e;}}
  try{await this.budget.reserve(key,this.policy.maxBytes);const s=await lstat(dir);if(!s.isDirectory()||s.isSymbolicLink())fail('INVALID_PATH','上传目录无效');handle=await open(path.join(dir,slot==='trace'?'merged_swimlane.json':'dyn_topo.txt'),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);let size=0;
   for await(const chunk of stream){size+=chunk.length;if(size>this.policy.maxBytes)fail('FILE_TOO_LARGE','文件超过本机测试限额');if(this.state.upload(owner,id).state!=='uploading')fail('UPLOAD_CONFLICT','上传已失效');await handle.write(chunk);}
   if(size===0)fail(slot==='topo'?'INVALID_TOPO':'INVALID_TRACE','文件为空');return {upload_id:id,slot,bytes:size};
  }catch(e){try{this.state.failUpload(owner,id,e instanceof ToolError?e.code:'UPLOAD_FAILED');}catch{}throw e;}finally{await handle?.close();this.writing.delete(key);this.budget.release(key);await this.cleanupUploads();}
 }
 async parse(owner:string,id:string,filename:string,hasTopo:boolean){
  if(!this.policy.smallFileBytes)return this.parseNow(owner,id,filename,hasTopo);
  if(this.stopping||this.queue.length>=(this.policy.maxQueued??100))fail('PARSE_LIMIT','解析队列已满，请稍后重试');
  if(filename.length<1||filename.length>200||/[\x00-\x1f/\\]/.test(filename))fail('INVALID_FILENAME','文件名无效');
  if([...this.writing].some(k=>k.startsWith(id+':')))fail('UPLOAD_CONFLICT','文件仍在上传');
  this.state.upload(owner,id);const dir=this.dir(id);let size=(await lstat(path.join(dir,'merged_swimlane.json'))).size;
  if(hasTopo)size+=(await lstat(path.join(dir,'dyn_topo.txt'))).size;
  const weight=size>this.policy.smallFileBytes?this.policy.maxConcurrent:1;
  this.state.transition(owner,id,['uploading'],'queued');let done!:()=>void;const finished=new Promise<void>(r=>done=r);
  this.queue.push({owner,id,filename,hasTopo,weight,done});void this.pump();return {upload_id:id,state:'queued',finished};
 }
 async pump(){if(this.pumping||this.stopping)return;this.pumping=true;try{while(this.queue.length&&!this.stopping){const q=this.queue[0];
  try{if(this.state.upload(q.owner,q.id).state!=='queued'){this.queue.shift();q.done();continue;}}catch{this.queue.shift();q.done();continue;}
  const used=[...this.weights.values()].reduce((a,b)=>a+b,0);
  if(used+q.weight>this.policy.maxConcurrent||[...this.jobs.values()].some(j=>j.owner===q.owner))break;
  this.queue.shift();this.weights.set(q.id,q.weight);
  try{const running=await this.parseNow(q.owner,q.id,q.filename,q.hasTopo);void running.finished.finally(()=>{this.weights.delete(q.id);q.done();void this.pump();});}
  catch(e){try{this.state.failUpload(q.owner,q.id,e instanceof ToolError?e.code:'PARSE_ERROR');}catch{}this.weights.delete(q.id);q.done();}
 }}finally{this.pumping=false;}}
 async parseNow(owner:string,id:string,filename:string,hasTopo:boolean){
  if(filename.length<1||filename.length>200||/[\x00-\x1f/\\]/.test(filename))fail('INVALID_FILENAME','文件名无效');
  if(this.jobs.size+this.starting.size>=this.policy.maxConcurrent||[...this.jobs.values()].some(j=>j.owner===owner)||[...this.starting.values()].includes(owner))fail('PARSE_LIMIT','解析忙，请稍后重试');
  if([...this.writing].some(k=>k.startsWith(id+':')))fail('UPLOAD_CONFLICT','文件仍在上传');
  const dir=this.dir(id);this.starting.set(id,owner);let child:ChildProcess;try{await this.budget.reserve(id+':parse',this.policy.maxSnapshotBytes??0);await lstat(path.join(dir,'merged_swimlane.json')).catch(()=>fail('INVALID_TRACE','缺少泳道文件'));if(hasTopo)await lstat(path.join(dir,'dyn_topo.txt')).catch(()=>fail('INVALID_TOPO','缺少显式拓扑'));else if(await lstat(path.join(dir,'dyn_topo.txt')).then(()=>true,()=>false))fail('INVALID_TOPO','已上传拓扑必须显式启用');
  this.state.transition(owner,id,this.policy.smallFileBytes?['queued']:['uploading'],'parsing');
  child=fork(fileURLToPath(new URL('./parse-child.ts',import.meta.url)),[dir,hasTopo?'yes':'no',String(this.policy.maxBytes),String(this.policy.maxSnapshotBytes??0)],{execArgv:['--import',tsxLoader,`--max-old-space-size=${this.policy.parseMemoryMiB}`],stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH}});
  this.jobs.set(id,{owner,child});}catch(e){this.budget.release(id+':parse');throw e;}finally{this.starting.delete(id);}let result:any,timeout=false;child.on('message',m=>result=m);
  const timer=setTimeout(()=>{timeout=true;child.kill('SIGKILL');},this.policy.parseTimeoutMs);
  // Exit, not message, is the commit boundary: no worker can still write afterwards.
  const finished=new Promise<void>(resolve=>{let ended=false;const end=async(code:number|null)=>{if(ended)return;ended=true;clearTimeout(timer);let uncommittedTarget:string|undefined;try{
   if(code!==0||!result?.ok)throw new ToolError(timeout?'PARSE_TIMEOUT':result?.code??'PARSE_ERROR','解析失败');
   const dsid=result.id;if(typeof dsid!=='string'||! /^[0-9a-f-]{36}$/.test(dsid))throw new ToolError('PARSE_ERROR','解析结果标识无效');
   const sha=async(file:string)=>{const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');};
   const sha256=await sha(path.join(dir,'merged_swimlane.json')),topo_sha256=hasTopo?await sha(path.join(dir,'dyn_topo.txt')):null;
   // Persist private raw inputs with the immutable parsed snapshot.
   const target=path.join(this.root,'datasets',dsid);await mkdir(target,{mode:0o700});uncommittedTarget=target;await rename(path.join(dir,'parsed.bin'),path.join(target,'parsed.bin'));await rename(path.join(dir,'merged_swimlane.json'),path.join(target,'merged_swimlane.json'));if(hasTopo)await rename(path.join(dir,'dyn_topo.txt'),path.join(target,'dyn_topo.txt'));
   let committed=false;try{committed=this.state.commit(owner,id,{id:dsid,filename,sha256,topo_sha256,parser_version:'0.3.1'});}finally{if(!committed)await rm(target,{recursive:true,force:true});else uncommittedTarget=undefined;}
  }catch(e){try{this.state.failUpload(owner,id,e instanceof ToolError?e.code:'PARSE_ERROR');}catch{}}finally{if(uncommittedTarget)await rm(uncommittedTarget,{recursive:true,force:true});await rm(dir,{recursive:true,force:true});this.jobs.delete(id);this.budget.release(id+':parse');resolve();}};child.once('error',()=>void end(-1));child.once('exit',code=>void end(code));});
  return {upload_id:id,state:'parsing',finished};
 }
 async dataset(owner:string,id:string){const meta=this.state.dataset(owner,id);if(!this.cache.datasets.has(id)){const d=deserialize(await readFile(path.join(this.root,'datasets',meta.id,'parsed.bin')));d.title=meta.filename;d.snapshot=JSON.stringify({data:d.data,title:meta.filename,parseMs:d.parseMs,dataset_id:id,warnings:d.warnings,dependency_source:d.dependency_source});if(this.cache.datasets.size>=(this.policy.maxCacheDatasets??2))this.cache.datasets.delete(this.cache.datasets.keys().next().value!);this.cache.datasets.set(id,d);}return {meta,data:this.cache.get(id)};}
 async query(owner:string,a:any){const {meta}=await this.dataset(owner,a.dataset_id);return {...this.cache.query(a),filename:meta.filename,sha256:meta.sha256,dependency_source:meta.topo_sha256?'dyn_topo':'trace_flow',warnings:meta.topo_sha256?[]:['未提供 dyn_topo.txt，使用 trace flow；可能没有完整任务依赖。']};}
 async detail(owner:string,a:any){const {meta}=await this.dataset(owner,a.dataset_id);return {...this.cache.detail(a),filename:meta.filename,sha256:meta.sha256};}
 async listRuns(owner:string){const items=this.state.listRuns(owner);for(const v of items){let bytes=0;for(const d of v.datasets as any[]){try{for(const name of await readdir(path.join(this.root,'datasets',d.id))){const st=await lstat(path.join(this.root,'datasets',d.id,name));if(st.isFile())bytes+=st.size;}}catch(e:any){if(e.code!=='ENOENT')throw e;}}(v as any).bytes=bytes;}return {items};}
 close(owner:string,id:string){const result=this.state.close(owner,id);for(const [upload,j] of this.jobs){const u=this.state.db.prepare('SELECT view_id FROM uploads WHERE id=?').get(upload) as any;if(u?.view_id===id)j.child.kill('SIGKILL');}for(const d of this.state.db.prepare('SELECT id FROM datasets WHERE view_id=?').all(id) as any[])this.cache.datasets.delete(d.id);return result;}
 async delete(owner:string,id:string){const records=this.state.markDeleting(owner,id);for(const u of records.uploads as any[]){this.jobs.get(u.id)?.child.kill('SIGKILL');await rm(this.dir(u.id),{recursive:true,force:true});}for(const d of records.datasets as any[]){this.cache.datasets.delete(d.id);await rm(path.join(this.root,'datasets',d.id),{recursive:true,force:true});}this.state.finishDelete(id);return {view_session_id:id,deleted:true};}
 async deleteDataset(owner:string,id:string){const d=this.state.dataset(owner,id),v=this.state.view(owner,d.view_id);if(v.active===id)fail('ACTIVE_DATASET','这是当前使用的数据集；请先上传替换或明确删除整个查看会话');await rm(path.join(this.root,'datasets',id),{recursive:true,force:true});this.cache.datasets.delete(id);this.state.transaction(()=>{this.state.db.prepare('UPDATE uploads SET dataset=NULL WHERE dataset=?').run(id);this.state.db.prepare('DELETE FROM datasets WHERE id=?').run(id);});return {dataset_id:id,deleted:true};}
 async cleanup(){for(const v of this.state.expired())await this.delete(v.owner,v.id);await this.cleanupUploads();}
 async dispose(){this.stopping=true;for(const q of this.queue){try{this.state.failUpload(q.owner,q.id,'SERVER_STOP');}catch{}q.done();}this.queue=[];while(this.pumping||this.starting.size)await new Promise(r=>setTimeout(r,10));for(const j of this.jobs.values())j.child.kill('SIGKILL');while(this.jobs.size)await new Promise(r=>setTimeout(r,10));this.cache.datasets.clear();this.state.dispose();if(this.locked)await rm(path.join(this.root,'server.lock'),{force:true});this.locked=false;}
}
