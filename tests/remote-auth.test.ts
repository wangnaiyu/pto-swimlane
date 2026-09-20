import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {startAuthProbe} from '../src/remote/auth-probe';
const fixture=fileURLToPath(new URL('./fixtures/L2-synthetic',import.meta.url));
test('D1 Streamable HTTP: L2 owner access, cross-owner denial, reconnect and revocation',async()=>{
 const server=await startAuthProbe(fixture);const clients:Client[]=[];
 const connect=async(token:string)=>{const c=new Client({name:'d1-protocol-test',version:'1.0'});clients.push(c);await c.connect(new StreamableHTTPClientTransport(new URL(server.url+'/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}}));return c;};
 const call=async(c:Client,name:string,args={})=>{const r=await c.callTool({name,arguments:args});return {error:r.isError,data:JSON.parse((r.content as any)[0].text)};};
 try{
  const a=await connect(server.credentials[0].token),b=await connect(server.credentials[1].token);
  assert.equal((await call(a,'probe_identity')).data.owner,'test-a');assert.equal((await call(b,'probe_identity')).data.owner,'test-b');
  const ds=(await call(a,'probe_open_l2')).data;assert.equal(ds.task_count,3);
  const own=await call(a,'probe_query',{dataset_id:ds.dataset_id});assert.equal(own.data.items[0].duration_ns,5000);
  const denied=await call(b,'probe_query',{dataset_id:ds.dataset_id});assert.equal(denied.error,true);assert.equal(denied.data.code,'DATASET_NOT_FOUND');
  await a.close();const reconnected=await connect(server.credentials[0].token);assert.equal((await call(reconnected,'probe_query',{dataset_id:ds.dataset_id})).data.total,3);
  assert.equal((await fetch(server.url+'/mcp',{method:'POST'})).status,401);
  assert.equal((await fetch(server.url+'/mcp',{method:'POST',headers:{Authorization:'Bearer invalid'}})).status,401);
  assert.equal((await fetch(server.url+'/mcp',{method:'POST',headers:{Authorization:`Bearer ${server.credentials[1].token}`,Origin:'https://untrusted.example'}})).status,403);
  server.revoke('test-a');assert.equal((await fetch(server.url+'/mcp',{method:'POST',headers:{Authorization:`Bearer ${server.credentials[0].token}`}})).status,401);
 }finally{await Promise.all(clients.map(c=>c.close()));await server.close();}
});
