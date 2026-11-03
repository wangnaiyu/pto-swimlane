import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {RemoteFiles} from '../src/remote/files';import {AnalysisSessions} from '../src/remote/analysis-sessions';
import {TaskFocus} from '../src/remote/task-focus';import {startRemoteLocal} from '../src/remote/http';
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-focus-test-')),files=await new RemoteFiles(root).init();
 const view=files.state.open('a'),upload=await files.create('a',view.view_session_id);
 const bytes=await readFile('tests/fixtures/L2-synthetic/merged_swimlane.json');
 await files.write('a',upload.upload_id,'trace',(async function*(){yield bytes;})());await(await files.parse('a',upload.upload_id,'L2-focus.json',false)).finished;
 const analyses=new AnalysisSessions(files.state),a=analyses.create('a',view.view_session_id),state=analyses.current('a',a.id);
 return {root,files,analyses,a,state,dispose:async()=>{await files.dispose();await rm(root,{recursive:true,force:true});}};
}
test('native focus: exact identity, exclusive claim, isolation, expiry, supersession and selection race',async()=>{
 const f=await fixture();let now=Date.now();const focus=new TaskFocus(f.files,f.analyses,()=>now),a={analysis_session_id:f.a.id,dataset_id:f.state.active_dataset!.id,seqNo:'0',taskId:'2'};
 const claim={page_id:randomUUID(),dataset_id:a.dataset_id,version:f.state.version,selection_revision:f.state.selection_revision};
 const take=(analysis=f.a.id,b=claim)=>focus.claim('a',f.state.view_session_id,analysis,'cookie',b);
 try{
  await assert.rejects(focus.create('b',a),{code:'ANALYSIS_EXPIRED'});
  await assert.rejects(focus.create('a',{...a,dataset_id:randomUUID()}),{code:'DATASET_MISMATCH'});
  await assert.rejects(focus.create('a',{...a,taskId:'missing'}),{code:'TASK_NOT_FOUND'});
  await assert.rejects(focus.create('a',{...a,analysis_session_id:undefined}),{code:'FOCUS_CONTEXT_REQUIRED'});
  const first=await focus.create('a',a),second=await focus.create('a',a);
  assert.equal(focus.status('a',first.focus_request_id).status,'superseded');
  assert.throws(()=>focus.status('b',second.focus_request_id),{code:'FOCUS_NOT_FOUND'});
  const other=f.analyses.create('a',f.state.view_session_id);assert.equal(take(other.id).command,null);
  assert.equal(take(f.a.id,{...claim,dataset_id:randomUUID()}).command,null);
  assert.equal(take().command!.focus_request_id,second.focus_request_id);assert.equal(take().command,null);
  const ack={...claim,event_id:second.task.event_id,seqNo:'0',taskId:'2',applied:true};
  assert.throws(()=>focus.acknowledge('a',f.state.view_session_id,f.a.id,'cookie',second.focus_request_id,{...ack,page_id:randomUUID()}),{code:'FOCUS_NOT_FOUND'});
  assert.throws(()=>focus.acknowledge('a',f.state.view_session_id,f.a.id,'cookie',second.focus_request_id,{...ack,taskId:'1'}),{code:'FOCUS_IDENTITY_MISMATCH'});
  assert.equal(focus.status('a',second.focus_request_id).status,'claimed');
  const done=focus.acknowledge('a',f.state.view_session_id,f.a.id,'cookie',second.focus_request_id,ack);assert.equal(done.status,'applied');assert.equal(done.task.taskId,'2');assert.ok(done.completed_at);
  assert.equal(focus.acknowledge('a',f.state.view_session_id,f.a.id,'cookie',second.focus_request_id,{...ack,applied:false}).status,'applied');
  const pending=await focus.create('a',a);now+=30001;assert.equal(focus.status('a',pending.focus_request_id).status,'expired');assert.equal(take().command,null);
  const changed=await focus.create('a',a);take();f.analyses.select('a',f.a.id,f.state.view_session_id,a.dataset_id,f.a.revision,true);
  assert.equal(focus.acknowledge('a',f.state.view_session_id,f.a.id,'cookie',changed.focus_request_id,ack).code,'SELECTION_CHANGED');
  const legacy=await focus.create('a',{...a,analysis_session_id:undefined,view_session_id:f.state.view_session_id});
  assert.equal(focus.claim('a',f.state.view_session_id,undefined,'cookie',{...claim,selection_revision:undefined}).command!.focus_request_id,legacy.focus_request_id);
  now+=600001;focus.cleanup();assert.throws(()=>focus.status('a',legacy.focus_request_id),{code:'FOCUS_NOT_FOUND'});
 }finally{await f.dispose();}
});
for(const prefix of ['/','/pto-swimlane/'])test('native focus MCP and protected browser protocol '+prefix,async()=>{
 const f=await fixture(),server=await startRemoteLocal(f.files,path.resolve('dist'),a=>a==='Bearer a'?'a':null,{basePath:prefix});
 const client=new Client({name:'focus-test',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(server.origin+prefix+'mcp'),{requestInit:{headers:{Authorization:'Bearer a'}}}));
 const call=async(name:string,args={})=>{const r=await client.callTool({name,arguments:args});return {...JSON.parse((r.content as any)[0].text),isError:r.isError};};
 try{
  const list=await client.listTools();assert.equal(list.tools.find(t=>t.name==='focus_task')?.annotations?.destructiveHint,false);
  const entry=await call('create_upload_session',{analysis_session_id:f.a.id}),p=new URLSearchParams(new URL(entry.upload_url).hash.slice(1));
  const r=await fetch(server.origin+prefix+'api/redeem',{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json'},body:JSON.stringify({view:f.state.view_session_id,grant:p.get('grant')})});const auth:any=await r.json(),cookie=r.headers.get('set-cookie')!.split(';')[0];
  const browser=async(suffix:string,body:any,extra={})=>{const res=await fetch(server.origin+prefix+'api/views/'+f.state.view_session_id+'/focus/'+suffix,{method:'POST',headers:{Origin:server.origin,Cookie:cookie,'X-PTO-CSRF':auth.csrf,'X-PTO-Analysis':f.a.id,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});return {http:res.status,...await res.json()};};
  const args={analysis_session_id:f.a.id,dataset_id:f.state.active_dataset!.id,seqNo:'0',taskId:'2'},cmd=await call('focus_task',args);assert.equal(cmd.status,'queued');
  const b={page_id:randomUUID(),dataset_id:args.dataset_id,version:f.state.version,selection_revision:f.state.selection_revision};
  assert.equal((await browser('claim',b,{'X-PTO-CSRF':''})).http,403);
  assert.equal((await browser('claim',b,{Cookie:''})).http,401);
  assert.equal((await browser('claim',b,{Origin:'https://invalid.example'})).http,403);
  assert.equal((await browser('claim',{...b,page_id:'bad'})).http,400);
  assert.equal((await browser('claim',b)).command.focus_request_id,cmd.focus_request_id);
  assert.equal((await browser('claim',{...b,page_id:randomUUID()})).command,null);
  assert.equal((await call('get_focus_status',{focus_request_id:cmd.focus_request_id})).status,'claimed');
  assert.equal((await browser(cmd.focus_request_id+'/ack',{...b,event_id:cmd.task.event_id,seqNo:'0',taskId:'2',applied:true})).status,'applied');
  assert.equal((await call('get_focus_status',{focus_request_id:cmd.focus_request_id})).status,'applied');
 }finally{await client.close();await server.close();await f.dispose();}
});
