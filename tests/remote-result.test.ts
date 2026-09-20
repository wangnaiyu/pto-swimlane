import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {requestJson} from '../src/result-request';
test('result stream progress, HTTP errors and stalled body recovery',async()=>{
 const server=createServer((req,res)=>{if(req.url==='/stall'){res.writeHead(200,{'Content-Type':'application/json'});res.write('{');return;}if(req.url==='/denied'){res.writeHead(401);res.end('{"code":"SESSION_EXPIRED"}');return;}res.setHeader('X-PTO-Decoded-Length','11');res.end('{"ok":true}');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{const progress:number[][]=[];assert.deepEqual(await requestJson(base,{},(a,b)=>progress.push([a,b])),{ok:true});assert.deepEqual(progress.at(-1),[11,11]);await assert.rejects(requestJson(base+'/denied'),(e:any)=>e.status===401&&e.message==='SESSION_EXPIRED');await assert.rejects(requestJson(base+'/stall',{},undefined,80,1000),/请求超时/);assert.deepEqual(await requestJson(base),{ok:true});}
 finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
