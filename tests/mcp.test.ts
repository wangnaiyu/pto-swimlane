import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm,readFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {get as httpGet} from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {Store} from '../src/mcp/store';
const root=process.env.PTO_TESTDATA_ROOT;if(!root)throw Error('Set PTO_TESTDATA_ROOT (real fixtures required)');
const dir=path.resolve(root,'mix/end2end');const entry=path.resolve('bin/pto-swimlane.mjs');
const out='.local/verification';await mkdir(out,{recursive:true});
test('STDIO real fixtures, bounded queries, dependencies, viewer access and lifecycle',async()=>{
 const c=new Client({name:'pto-swimlane-test',version:'1.0.0'});const transport=new StdioClientTransport({command:process.execPath,args:[entry,'--allow-root',dir],stderr:'pipe'});let logs='';transport.stderr?.on('data',b=>logs+=b);await c.connect(transport);
 const call=async(name:string,args:any,error?:string)=>{const r=await c.callTool({name,arguments:args});const d=JSON.parse((r.content as any)[0].text);if(error){assert.equal(r.isError,true);assert.equal(d.code,error);}else assert.ok(!r.isError,JSON.stringify(d));return d;};
 const results:any[]=[];let lastURL='';
 try{
  assert.deepEqual((await c.listTools()).tools.map(t=>t.name).sort(),['close_swimlane','get_task','open_swimlane','query_tasks']);
  for(const [sample,count,edgeCount] of [['2M',393,910],['23M',3081,7182]] as const){
   const start=performance.now();const d=await call('open_swimlane',{trace_path:path.join(dir,sample,'merged_swimlane.json')});assert.equal(d.task_count,count);assert.equal(d.dependency_source,'dyn_topo');lastURL=d.viewer_url;
   const url=new URL(d.viewer_url),params=new URLSearchParams(url.hash.slice(1));const api=url.origin+'/api/datasets/'+d.dataset_id;const auth={Authorization:'Bearer '+params.get('token')};
   assert.equal((await fetch(api)).status,403);assert.equal((await fetch(api,{headers:{...auth,Origin:'https://evil.example'}})).status,403);assert.equal(await new Promise(resolve=>{httpGet(api,{headers:{...auth,Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});}),403);
   const snap=await (await fetch(api,{headers:auth})).json();assert.equal(snap.dataset_id,d.dataset_id);
   let cursor:any=undefined,all:any[]=[];do{const page=await call('query_tasks',{dataset_id:d.dataset_id,limit:7,...(cursor?{cursor}:{})});all.push(...page.items);cursor=page.next_cursor;}while(cursor);assert.equal(all.length,count);assert.equal(new Set(all.map(t=>t.event_id)).size,count);
   const q=await call('query_tasks',{dataset_id:d.dataset_id,sort:'duration_desc',process_name:'Machine View',limit:3});assert.ok(q.items[0].duration_ns>=q.items[1].duration_ns);assert.ok(q.items.every((t:any)=>t.process_name==='Machine View'));assert.equal((await call('query_tasks',{dataset_id:d.dataset_id,process_name:'missing-process'})).total,0);await call('query_tasks',{dataset_id:d.dataset_id,cursor:q.next_cursor},'INVALID_CURSOR');
   const task=q.items[0];const detail=await call('get_task',{dataset_id:d.dataset_id,seqNo:task.seqNo,taskId:task.taskId,limit:1});assert.deepEqual(detail.task,task);
   let edges=0;for(const p of Object.values(snap.data.processes) as any[])for(const t of Object.values(p.threads) as any[])for(const e of t.events)if(e.args?.taskId!==undefined)edges+=e.dependencies.successors.length;assert.equal(edges,edgeCount);
   let refs:any[]=[];let dc:any=undefined;do{const detail=await call('get_task',{dataset_id:d.dataset_id,seqNo:task.seqNo,taskId:task.taskId,limit:1,...(dc?{cursor:dc}:{})});refs.push(...detail.dependencies.items);dc=detail.dependencies.next_cursor;}while(dc);
   const event=(Object.values(snap.data.processes) as any[]).flatMap(p=>Object.values(p.threads).flatMap((t:any)=>t.events)).find(e=>e.id===task.event_id);assert.deepEqual(refs.filter(r=>r.direction==='successor').map(r=>r.event_id),event.dependencies.successors);
   await call('get_task',{dataset_id:d.dataset_id,seqNo:'missing',taskId:'missing'},'TASK_NOT_FOUND');await call('query_tasks',{dataset_id:d.dataset_id,start_ns:10,end_ns:1},'INVALID_RANGE');
   await call('close_swimlane',{dataset_id:d.dataset_id});assert.equal((await fetch(api,{headers:auth})).status,404);await call('query_tasks',{dataset_id:d.dataset_id},'DATASET_NOT_FOUND');
   results.push({sample,taskCount:count,successors:edges,elapsedMs:Math.round(performance.now()-start),parseMs:d.parse_ms});
  }
  await call('open_swimlane',{trace_path:'relative.json'},'INVALID_PATH');await call('open_swimlane',{trace_path:entry},'PATH_DENIED');await call('open_swimlane',{trace_path:path.join(dir,'2M')},'INVALID_FILE');
  const ids=[];for(let i=0;i<4;i++)ids.push((await call('open_swimlane',{trace_path:path.join(dir,'2M/merged_swimlane.json')})).dataset_id);
  await call('open_swimlane',{trace_path:path.join(dir,'2M/merged_swimlane.json')},'DATASET_LIMIT');await call('close_swimlane',{dataset_id:ids[0]});await call('open_swimlane',{trace_path:path.join(dir,'2M/merged_swimlane.json')});
 }finally{await c.close();}
 await assert.rejects(fetch(lastURL));assert.equal(logs,'');await writeFile(out+'/mcp-results.json',JSON.stringify({status:'passed',date:new Date().toISOString(),samples:results,checks:['tools-list','real-stdio','pagination','task-detail','snapshot-topology','access-control','capacity','close','shutdown'],stderr:logs},null,2));
});
test('file boundaries, missing sidecar, invalid data, snapshot stability and precise identifiers',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'pto-mcp-test-'));let allowed=path.join(tmp,'allowed');await mkdir(allowed);allowed=await realpath(allowed);const store=new Store([allowed]);
 try{
  const trace=await readFile(path.join(dir,'2M/merged_swimlane.json'),'utf8');const file=path.join(allowed,'trace.json');await writeFile(file,trace);const ds=await store.load(file);assert.equal(ds.dependency_source,'trace_flow');assert.equal(ds.warnings.length,1);
  const before=store.query({dataset_id:ds.id});await writeFile(file,'{');assert.deepEqual(store.query({dataset_id:ds.id}),before);await assert.rejects(store.load(file),{code:'INVALID_TRACE'});
  const outside=path.join(tmp,'outside.json');await writeFile(outside,trace);const link=path.join(allowed,'link.json');await symlink(outside,link);await assert.rejects(store.load(link),{code:'PATH_DENIED'});
  await writeFile(file,trace);await assert.rejects(store.load(file,path.join(allowed,'missing.txt')),{code:'FILE_NOT_FOUND'});
  await writeFile(path.join(allowed,'dyn_topo.txt'),'wrong');await assert.rejects(store.load(file),{code:'PARSE_ERROR'});await rm(path.join(allowed,'dyn_topo.txt'));
  await assert.rejects(new Store([allowed],1).load(file),{code:'FILE_TOO_LARGE'});
  const raw=JSON.parse(trace);const e=raw.traceEvents.find((e:any)=>e.args?.taskId!==undefined);e.args.taskId=9007199254740992;await writeFile(file,JSON.stringify(raw));await assert.rejects(store.load(file),{code:'UNSAFE_TASK_ID'});
 }finally{await rm(tmp,{recursive:true,force:true});}
});
