import {test} from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {RemoteFiles} from '../src/remote/files';
import {startRemoteLocal} from '../src/remote/http';

for(const prefix of ['/','/pto-swimlane/'])test('automatic authorization and per-conversation history selection '+prefix,async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-analysis-'));
 let files=await new RemoteFiles(root).init();let active=true;
 const verify=(a:string)=>a==='Bearer a'&&active?'a':a==='Bearer b'?'b':null;
 let server=await startRemoteLocal(files,path.resolve('dist'),verify,{basePath:prefix,ownerActive:o=>o==='b'||active});
 const clients:Client[]=[];
 const connect=async(owner='a')=>{const c=new Client({name:'analysis-test',version:'1'});clients.push(c);await c.connect(new StreamableHTTPClientTransport(new URL(server.origin+prefix+'mcp'),{requestInit:{headers:{Authorization:'Bearer '+owner}}}));return c;};
 const call=async(c:Client,name:string,args={})=>{const r=await c.callTool({name,arguments:args});return {error:r.isError,...JSON.parse((r.content as any)[0].text)};};
 const redeem=async(v:any,cookie='')=>{const p=new URLSearchParams(new URL(v.upload_url).hash.slice(1));const r=await fetch(server.origin+prefix+'api/redeem',{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({view:p.get('view'),grant:p.get('grant')})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0]??'',...await r.json()};};
 const browser=async(v:any,s:any,suffix='',method='GET',body?:any,extra={})=>{const r=await fetch(server.origin+prefix+'api/views/'+v.view_session_id+suffix,{method,headers:{Origin:server.origin,Cookie:s.cookie,'X-PTO-CSRF':s.csrf,'X-PTO-Analysis':v.analysis_session_id,'Content-Type':'application/json',...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
 const fixture=await readFile('tests/fixtures/L2-synthetic/merged_swimlane.json');
 const upload=async(view:string,name:string,raw=fixture)=>{const u=await files.create('a',view);await files.write('a',u.upload_id,'trace',(async function*(){yield raw;})());const parsed=await files.parse('a',u.upload_id,name,false);await parsed.finished;return files.state.current('a',view);};
 try{
  let a=await connect();const b=await connect('b');
  const history=await call(a,'create_upload_session');
  // An entry issued before the upgrade has no analysis_grants row and still works.
  const legacyToken='legacy-test-only';files.state.db.prepare('INSERT INTO grants VALUES(?,?,?,?)').run(createHash('sha256').update(legacyToken).digest('hex'),'a',history.view_session_id,Date.now()+60000);
  const legacy=await redeem({upload_url:server.origin+prefix+'#view='+history.view_session_id+'&grant='+legacyToken});assert.equal(legacy.status,200);assert.equal(legacy.analysis_session_id,null);
  const first=await upload(history.view_session_id,'first-L2.json');
  const second=await upload(history.view_session_id,'second-L2.json');
  const one=await call(a,'create_upload_session'),two=await call(a,'create_upload_session');
  assert.notEqual(one.analysis_session_id,two.analysis_session_id);
  let session=await redeem(one);assert.equal(session.status,200);
  assert.equal((await redeem(one)).code,'INVALID_GRANT');
  assert.equal((await call(b,'get_analysis_session',{analysis_session_id:one.analysis_session_id})).code,'ANALYSIS_EXPIRED');
  assert.equal((await call(b,'create_upload_session',{analysis_session_id:one.analysis_session_id})).code,'ANALYSIS_EXPIRED');
  const runs=await browser(one,session,'/runs');assert.ok(runs.items.some((r:any)=>r.id===history.view_session_id));
  assert.equal((await browser(one,session,'/runs/'+history.view_session_id+'/open','POST',{dataset_id:first.active_dataset.id},{'X-PTO-CSRF':''})).status,403);
  const foreign=await call(b,'create_upload_session');
  assert.equal((await browser(one,session,'/runs/'+foreign.view_session_id+'/open','POST',{})).code,'NOT_FOUND');
  const choose=()=>browser(one,session,'/runs/'+history.view_session_id+'/open','POST',{dataset_id:first.active_dataset.id});
  const entry=await choose(),stale=await choose();
  // Signing an entry alone must not change what the conversation queries.
  assert.equal((await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id})).view_session_id,one.view_session_id);
  const selectedSession=await redeem(entry);assert.equal(selectedSession.status,200);
  assert.equal((await redeem(stale)).code,'ANALYSIS_CHANGED');
  const selected=await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id});
  assert.equal(selected.view_session_id,history.view_session_id);assert.equal(selected.active_dataset.id,first.active_dataset.id);
  assert.equal((await call(a,'get_view_session',{view_session_id:history.view_session_id})).active_dataset.id,second.active_dataset.id);
  assert.equal((await call(a,'get_analysis_session',{analysis_session_id:two.analysis_session_id})).view_session_id,two.view_session_id);
  assert.equal((await call(a,'query_tasks',{dataset_id:selected.active_dataset.id,limit:1})).filename,'first-L2.json');
  const target={...entry,view_session_id:history.view_session_id};
  const datasetList=await browser(target,selectedSession,'/datasets');assert.ok(datasetList.items.find((d:any)=>d.id===first.active_dataset.id).selected);
  assert.equal((await browser(target,selectedSession,'/datasets/delete','POST',{dataset_ids:[first.active_dataset.id]})).code,'ACTIVE_DATASET');
  // A fresh entry for the same browser/view preserves CSRF in other tabs.
  const renewed=await call(a,'create_upload_session',{analysis_session_id:one.analysis_session_id});
  const reused=await redeem(renewed,selectedSession.cookie);assert.equal(reused.csrf,selectedSession.csrf);
  assert.equal((await browser(target,selectedSession,'/runs/'+history.view_session_id+'/open','POST',{dataset_id:first.active_dataset.id})).status,200);
  // Expire cookies only, then reenter from the conversation without losing selection/quota.
  const before=files.state.current('a',history.view_session_id);
  files.state.db.prepare('UPDATE browser_sessions SET expires=0').run();
  assert.equal((await browser(target,selectedSession)).code,'SESSION_EXPIRED');
  const fresh=await call(a,'create_upload_session',{analysis_session_id:one.analysis_session_id});
  assert.equal(fresh.active_dataset.id,first.active_dataset.id);session=await redeem(fresh);assert.equal(session.status,200);
  assert.equal((await browser(target,session)).active_dataset.id,first.active_dataset.id);
  assert.equal(files.state.current('a',history.view_session_id).generation,before.generation);
  assert.equal(files.state.listDatasets('a',history.view_session_id).items.length,2);
  assert.equal(files.state.current('a',history.view_session_id).expires_at,before.expires_at);
  // Failed replacement preserves the selected old version, even if global active is newer.
  const failed=await browser(target,session,'/uploads','POST');
  await files.write('a',failed.upload_id,'trace',(async function*(){yield Buffer.from('{}');})());
  await(await files.parse('a',failed.upload_id,'broken.json',false)).finished;
  assert.equal((await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id})).active_dataset.id,first.active_dataset.id);
  const good=await browser(target,session,'/uploads','POST');
  await files.write('a',good.upload_id,'trace',(async function*(){yield fixture;})());
  await(await files.parse('a',good.upload_id,'third-L2.json',false)).finished;
  const uploaded=await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id});assert.equal(uploaded.active_dataset.filename,'third-L2.json');
  await files.deleteDataset('a',first.active_dataset.id);
  assert.equal((await call(a,'create_upload_session',{analysis_session_id:one.analysis_session_id})).active_dataset.id,uploaded.active_dataset.id);
  // Persistent selection after process restart, using the same context ID.
  const port=Number(new URL(server.origin).port);await Promise.all(clients.map(c=>c.close()));await server.close();await files.dispose();
  files=await new RemoteFiles(root).init();server=await startRemoteLocal(files,path.resolve('dist'),verify,{basePath:prefix,port,ownerActive:o=>o==='b'||active});a=await connect();
  assert.equal((await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id})).active_dataset.id,uploaded.active_dataset.id);
  const expireGrant=await call(a,'create_upload_session',{analysis_session_id:one.analysis_session_id});files.state.db.prepare('UPDATE grants SET expires=0').run();assert.equal((await redeem(expireGrant)).code,'INVALID_GRANT');
  const revokedGrant=await call(a,'create_upload_session',{analysis_session_id:one.analysis_session_id});active=false;assert.equal((await redeem(revokedGrant)).code,'INVALID_GRANT');assert.equal((await browser(target,session)).code,'SESSION_EXPIRED');active=true;
  files.state.db.prepare('UPDATE views SET expires=0 WHERE id=?').run(history.view_session_id);
  assert.equal((await call(a,'get_analysis_session',{analysis_session_id:one.analysis_session_id})).code,'NOT_FOUND');
 }finally{await Promise.all(clients.map(c=>c.close()));await server.close();await files.dispose();await rm(root,{recursive:true,force:true});}
});
