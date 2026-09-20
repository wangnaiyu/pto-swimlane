import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {request} from 'node:http';
import {RemoteFiles} from '../src/remote/files';import {startRemoteLocal} from '../src/remote/http';import {Credentials} from '../src/remote/credentials';
test('HTTPS prefix: trusted host/origin, scoped Secure cookies, expiry/rotation/revocation reach browser sessions',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-proxy-')),files=await new RemoteFiles(root).init();let now=Date.now();const auth=new Credentials(files.state.db,()=>now),token=auth.issue('alice',now+60000),publicOrigin='https://swimlane.example';
 const server=await startRemoteLocal(files,path.resolve('dist'),h=>auth.verify(h),{basePath:'/pto-swimlane/',publicOrigin,ownerActive:o=>auth.active(o)});
 const send=(url:string,body?:any,headers:Record<string,string>={})=>new Promise<{status:number;headers:any;body:any}>((resolve,reject)=>{const r=request(server.listenOrigin+url,{method:body?'POST':'GET',headers:{Host:'swimlane.example',Origin:publicOrigin,'Content-Type':'application/json',...headers}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{let b:any;try{b=JSON.parse(text);}catch{b=text;}resolve({status:res.statusCode!,headers:res.headers,body:b});});});r.on('error',reject);r.end(body?JSON.stringify(body):undefined);});
 const create=async(t:string)=>{const r=await send('/pto-swimlane/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'create_upload_session',arguments:{}}},{Authorization:'Bearer '+t,Accept:'application/json, text/event-stream'});assert.equal(r.status,200);const v=JSON.parse(r.body.result.content[0].text);assert.ok(v.upload_url.startsWith(publicOrigin+'/pto-swimlane/#'));return v;};
 const redeem=async(v:any)=>{const p=new URLSearchParams(new URL(v.upload_url).hash.slice(1));return send('/pto-swimlane/api/redeem',{view:p.get('view'),grant:p.get('grant')});};
 try{
  assert.equal((await send('/api/redeem',{})).status,404);assert.equal((await send('/mcp',{})).status,404);
  assert.equal((await send('/pto-swimlane/',undefined,{Host:'evil.example'})).status,403);assert.equal((await send('/pto-swimlane/',undefined,{Origin:'https://evil.example'})).status,403);
  const v=await create(token),r=await redeem(v);assert.equal(r.status,200);const cookie=r.headers['set-cookie'][0];assert.match(cookie,/; Secure/);assert.match(cookie,/Path=\/pto-swimlane\/api\//);const url='/pto-swimlane/api/views/'+v.view_session_id,headers={Cookie:cookie.split(';')[0]};assert.equal((await send(url,undefined,headers)).status,200);
  now+=60001;assert.equal(auth.verify('Bearer '+token),null);assert.equal((await send(url,undefined,headers)).status,401);
  const replacement=auth.issue('alice',now+60000);assert.equal(auth.verify('Bearer '+token),null);const v2=await create(replacement),r2=await redeem(v2);assert.equal(r2.status,200);auth.revoke('alice');assert.equal(auth.verify('Bearer '+replacement),null);assert.equal((await send('/pto-swimlane/api/views/'+v2.view_session_id,undefined,{Cookie:r2.headers['set-cookie'][0].split(';')[0]})).status,401);
  assert.equal(files.state.db.prepare('SELECT count(*) n FROM browser_sessions').get()?.n,0);
 }finally{await server.close();await files.dispose();await rm(root,{recursive:true,force:true});}
});
