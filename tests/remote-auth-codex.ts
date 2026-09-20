// Authorized D1 real Codex client experiment: artificial L2 only, ephemeral configuration.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startAuthProbe} from '../src/remote/auth-probe';
const project=fileURLToPath(new URL('..',import.meta.url));
const probe=await startAuthProbe(path.join(project,'tests/fixtures/L2-synthetic'));
let timer:ReturnType<typeof setTimeout>|undefined;
try{
 const prompt='Authorized local MCP authentication experiment. Only artificial L2 data is available. Use only pto_remote_probe MCP tools. Call probe_identity, then probe_open_l2, then probe_query with the returned dataset_id. Report owner, task_count, taskId and duration_ns from actual results. Do not use shell, browse, read credentials, or change files.';
 const args=['exec','--ephemeral','--ignore-user-config','--sandbox','read-only','--json','-C',project,'-c',`mcp_servers.pto_remote_probe.url=${JSON.stringify(probe.url+'/mcp')}`,'-c','mcp_servers.pto_remote_probe.bearer_token_env_var="PTO_D1_EPHEMERAL_TOKEN"','-c','mcp_servers.pto_remote_probe.tools.probe_identity.approval_mode="approve"','-c','mcp_servers.pto_remote_probe.tools.probe_open_l2.approval_mode="approve"','-c','mcp_servers.pto_remote_probe.tools.probe_query.approval_mode="approve"',prompt];
 const child=spawn(process.env.CODEX_BIN??'codex',args,{cwd:project,env:{...process.env,PTO_D1_EPHEMERAL_TOKEN:probe.credentials[0].token},stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
 timer=setTimeout(()=>child.kill('SIGTERM'),180000);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 for(const c of probe.credentials){stdout=stdout.replaceAll(c.token,'[REDACTED]');stderr=stderr.replaceAll(c.token,'[REDACTED]');}
 await mkdir(path.join(project,'.local/verification'),{recursive:true});await writeFile(path.join(project,'.local/verification/d1-codex.jsonl'),stdout);await writeFile(path.join(project,'.local/verification/d1-codex.stderr'),stderr);
 assert.equal(code,0,'Codex exit must succeed; inspect redacted evidence');
 const calls=stdout.split('\n').filter(Boolean).map(s=>{try{return JSON.parse(s);}catch{return {};}}).filter(e=>e.type==='item.completed'&&e.item?.type==='mcp_tool_call').map(e=>e.item);
 for(const name of ['probe_identity','probe_open_l2','probe_query'])assert(calls.some(i=>i.tool===name&&i.status==='completed'&&!i.error&&!i.result?.is_error),`Missing successful ${name}`);
 // Validate returned tool evidence, not the model's prose alone.
 const evidence=JSON.stringify(calls);assert(evidence.includes('test-a'));assert(evidence.includes('5000'));
 console.log('D1 Codex CLI real tool calls passed: authenticated identity, fixed L2 load, bounded query (5000 ns). Desktop UI not covered.');
}finally{if(timer)clearTimeout(timer);await probe.close();}
