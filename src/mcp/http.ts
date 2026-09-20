import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import type {Store} from './store';
export async function serveViewer(store:Store,dist:string){
 await readFile(path.join(dist,'index.html'));const token=randomBytes(32).toString('hex');let origin='';
 const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'};
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
  const send=(status:number,body:string,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(body);};
  if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin))return send(403,'Forbidden origin');
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'Read-only viewer');
  try{const u=new URL(req.url!,origin);
   if(u.pathname.startsWith('/api/')){
    if(req.headers.authorization!==`Bearer ${token}`)return send(403,'Forbidden');
    const m=/^\/api\/datasets\/([0-9a-f-]+)$/.exec(u.pathname);if(!m)return send(404,'Not found');const ds=store.datasets.get(m[1]);if(!ds)return send(404,'数据集已关闭，请让 agent 重新打开');
    return send(200,req.method==='HEAD'?'':ds.snapshot,'application/json; charset=utf-8');
   }
   const relative=decodeURIComponent(u.pathname)==='/'?'index.html':decodeURIComponent(u.pathname).slice(1);const resolved=await realpath(path.resolve(dist,relative));if(!resolved.startsWith(dist+path.sep))return send(403,'Forbidden');
   const content=await readFile(resolved);res.writeHead(200,{'Content-Type':types[path.extname(resolved)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
  }catch{return send(404,'Not found');}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${(server.address() as any).port}`;
 return {url:(id:string)=>`${origin}/#dataset=${id}&token=${token}`,close:()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})};
}
