/** D1 localhost-only protocol probe. Not the production authentication service. */
import {createServer} from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {z} from 'zod';
import {Store,ToolError} from '../mcp/store';
import path from 'node:path';
const digest=(s:string)=>createHash('sha256').update(s).digest();
export async function startAuthProbe(fixtureRoot:string){
 const credentials=[{owner:'test-a',token:randomBytes(32).toString('base64url')},{owner:'test-b',token:randomBytes(32).toString('base64url')}];
 const identities=credentials.map(c=>({owner:c.owner,hash:digest(c.token),revoked:false}));
 const store=new Store([fixtureRoot],1024*1024,4),owners=new Map<string,string>();
 const transports=new Set<StreamableHTTPServerTransport>();
 const http=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   if(req.headers.host!==new URL(url).host || req.headers.origin && req.headers.origin!==url){res.writeHead(403).end();return;}
   if(req.url!=='/mcp'){res.writeHead(404).end();return;}
   const value=req.headers.authorization??'';
   const h=digest(value.startsWith('Bearer ')?value.slice(7):'');
   const identity=identities.find(i=>!i.revoked&&timingSafeEqual(i.hash,h));
   if(!identity){res.writeHead(401,{'WWW-Authenticate':'Bearer'}).end();return;}
   if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'}).end();return;}
   const chunks:Buffer[]=[];let size=0;
   for await(const c of req){size+=c.length;if(size>16384){res.writeHead(413).end();return;}chunks.push(c);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{res.writeHead(400).end();return;}
   const mcp=new McpServer({name:'pto-swimlane-auth-probe',version:'0.3.1-d1'},{instructions:'Local D1 authentication experiment using artificial L2 only. probe_open_l2 loads a fixed synthetic fixture. Do not read local files or credentials. Query the returned dataset with probe_query and report actual results. This is not a production upload service.'});
   const register=(name:string,inputSchema:any,fn:(a:any)=>any)=>mcp.registerTool(name,{inputSchema,description:name},async(a:any)=>{try{const result=await fn(a);return {content:[{type:'text' as const,text:JSON.stringify(result)}]};}catch(e){return {isError:true,content:[{type:'text' as const,text:JSON.stringify({code:e instanceof ToolError?e.code:'INTERNAL_ERROR'})}]};}});
   register('probe_identity',{},()=>({owner:identity.owner,mode:'local-auth-probe'}));
   register('probe_open_l2',{},async()=>{const d=await store.load(path.join(fixtureRoot,'merged_swimlane.json'));owners.set(d.id,identity.owner);return {dataset_id:d.id,owner:identity.owner,data_level:'L2',task_count:d.tasks.length};});
   register('probe_query',{dataset_id:z.string().uuid()},a=>{if(owners.get(a.dataset_id)!==identity.owner)throw new ToolError('DATASET_NOT_FOUND','');return store.query({...a,sort:'duration_desc',limit:1});});
   const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});transports.add(transport);
   res.once('close',()=>{transports.delete(transport);void transport.close();void mcp.close();});
   await mcp.connect(transport);await transport.handleRequest(req,res,body);
  }catch{if(!res.headersSent)res.writeHead(500);res.end();}
 });
 http.requestTimeout=10000;http.headersTimeout=10000;
 let url='';await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));
 url=`http://127.0.0.1:${(http.address() as any).port}`;
 return {url,credentials,revoke:(owner:string)=>{const i=identities.find(i=>i.owner===owner);if(i)i.revoked=true;},close:async()=>{await Promise.all([...transports].map(t=>t.close()));http.closeAllConnections();await new Promise<void>(resolve=>http.close(()=>resolve()));store.datasets.clear();}};
}
