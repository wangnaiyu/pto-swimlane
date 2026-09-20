// Optional real model test. Only the artificial L2 fixture is allowed.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const project=fileURLToPath(new URL('..',import.meta.url));const root=path.join(project,'tests/fixtures/L2-synthetic');
const prompt=`This is an authorized MCP acceptance test using entirely artificial L2 data, not internal measurements. Use only pto_swimlane MCP tools. Do not use shell, browse, or modify files. Call open_swimlane on ${root}/merged_swimlane.json; query_tasks with duration_desc and limit 1; get_task for the result with limit 2; close_swimlane. Report actual count, seqNo/taskId, duration_ns and success. No other work.`;
const args=['exec','--ephemeral','--ignore-user-config','--sandbox','read-only','--json','-C',project,'-c',`mcp_servers.pto_swimlane.command=${JSON.stringify(process.execPath)}`,'-c',`mcp_servers.pto_swimlane.args=${JSON.stringify([path.join(project,'bin/pto-swimlane.mjs'),'--allow-root',root])}`,prompt];
await mkdir(path.join(project,'.local/verification'),{recursive:true});const child=spawn(process.env.CODEX_BIN??'codex',args,{cwd:project,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);const timer=setTimeout(()=>child.kill('SIGTERM'),180000);
try{const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});await writeFile(path.join(project,'.local/verification/codex-mcp-L2.jsonl'),stdout);await writeFile(path.join(project,'.local/verification/codex-mcp-L2.stderr'),stderr);
 const items=stdout.split('\n').filter(Boolean).map(s=>{try{return JSON.parse(s);}catch{return {};}}).filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').map(e=>e.item);
 const names=['open_swimlane','query_tasks','get_task','close_swimlane'];for(const name of names){if(!items.some(i=>i.tool===name&&i.status==='completed'&&!i.error&&!i.result?.is_error))throw Error(`No successful ${name}; inspect local evidence`);}
 if(code!==0)throw Error(`Codex exit ${code}`);console.log('Codex CLI L2 four-tool acceptance passed.');
}finally{clearTimeout(timer);}
