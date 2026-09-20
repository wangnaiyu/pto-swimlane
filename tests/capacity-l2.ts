/** Artificial capacity workload only: never reads external sample directories. */
import {Store} from '../src/mcp/store';
import {mkdir,open,stat,writeFile} from 'node:fs/promises';
import {serialize} from 'node:v8';
import path from 'node:path';
const [mode,dir,mb='30',padding='1024']=process.argv.slice(2);
if(!['generate','parse'].includes(mode)||!dir)throw Error('generate|parse <directory> [decimal MB] [padding bytes]');
const file=path.join(dir,'merged_swimlane.json');
if(mode==='generate'){
 if(![1,30,80].includes(Number(mb))||![0,1024].includes(Number(padding)))throw Error('Unsupported bounded L2 profile');
 await mkdir(dir,{recursive:true});const h=await open(file,'wx',0o600);let bytes=0,tasks=0;
 const put=async(s:string)=>{bytes+=Buffer.byteLength(s);await h.write(s);};
 try{await put('{"data_level":"L2","description":"Artificial capacity workload, no measured data","traceEvents":[{"name":"process_name","ph":"M","pid":1,"args":{"name":"Machine"}},{"name":"thread_name","ph":"M","pid":1,"tid":1,"args":{"name":"L2 capacity lane"}}');
 while(bytes<Number(mb)*1e6){tasks++;await put(','+JSON.stringify({name:'L2_capacity_task_'+tasks,ph:'X',pid:1,tid:1,ts:tasks*3,dur:2,args:{seqNo:0,taskId:tasks,leafIndex:tasks,description:'x'.repeat(Number(padding))}}));}
 await put(']}');}finally{await h.close();}console.log(JSON.stringify({kind:'generated',data_level:'L2',bytes,tasks,padding:Number(padding)}));
}else{
 const store=new Store([path.resolve(dir)],81e6,1),start=performance.now();
 const d=await store.load(file);const binary=serialize(d);await writeFile(path.join(dir,'parsed.bin'),binary);
 console.log(JSON.stringify({kind:'parsed',data_level:'L2',input_bytes:(await stat(file)).size,tasks:d.tasks.length,elapsed_ms:Math.round(performance.now()-start),serialized_bytes:binary.length,peak_rss_kib:process.resourceUsage().maxRSS,node:process.versions.node,platform:process.platform}));
}
