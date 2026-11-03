import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
if(!process.env.PTO_INSTALLED_PREFIX)throw Error('Set PTO_INSTALLED_PREFIX');
const root=path.resolve(process.env.PTO_INSTALLED_PREFIX,'node_modules/pto-swimlane'),entry=path.join(root,'bin/pto-swimlane.mjs'),fixture=path.join(root,'tests/fixtures/L2-synthetic');
const config=JSON.parse(execFileSync(process.execPath,[entry,'config','--allow-root',fixture],{encoding:'utf8'}));
assert.equal(config.mcpServers['pto-swimlane'].args[0],entry);
assert.equal(JSON.parse(execFileSync(process.execPath,[entry,'doctor'],{encoding:'utf8'})).status,'ok');
const clients=[];const outputs=[];
try{
 for(let n=0;n<2;n++){
 const c=new Client({name:'installed-package-test',version:'1'});clients.push(c);await c.connect(new StdioClientTransport({...config.mcpServers['pto-swimlane'],cwd:'/tmp'}));
 const call=async(name,args)=>{const r=await c.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return r.structuredContent;};
 assert.equal(c.getServerVersion().version,JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version);
 assert.equal((await c.listTools()).tools.length,4);
 const d=await call('open_swimlane',{trace_path:path.join(fixture,'merged_swimlane.json')});assert.equal(d.task_count,3);
 const q=await call('query_tasks',{dataset_id:d.dataset_id,sort:'duration_desc',limit:1});assert.equal(q.items[0].duration_ns,5000);
 const t=q.items[0];await call('get_task',{dataset_id:d.dataset_id,seqNo:t.seqNo,taskId:t.taskId});
 const u=new URL(d.viewer_url);assert.equal((await fetch(u.origin)).status,200);
 const denied=await c.callTool({name:'open_swimlane',arguments:{trace_path:'/tmp/outside.json'}});assert.equal(denied.isError,true);
 outputs.push({d,origin:u.origin,call});
 }
 assert.notEqual(outputs[0].origin,outputs[1].origin);
 assert.equal((await clients[1].callTool({name:'query_tasks',arguments:{dataset_id:outputs[0].d.dataset_id}})).isError,true);
 for(const o of outputs)await o.call('close_swimlane',{dataset_id:o.d.dataset_id});
 for(const c of clients)await c.close();
 for(const o of outputs)await assert.rejects(fetch(o.origin));
 const report={status:'passed',checks:['installed doctor/config','four tools','L2 maximum 5000 ns','viewer HTTP','file boundary','two-process isolation','exit closes listener'],node:process.versions.node};
 await writeFile(path.join(process.env.PTO_INSTALLED_PREFIX,'installed-results.json'),JSON.stringify(report,null,2));console.log(report);
}finally{for(const c of clients)await c.close();}
