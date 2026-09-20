import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RemoteFiles,FILE_TEST_POLICY} from '../src/remote/files';
const fixture=fileURLToPath(new URL('./fixtures/L2-synthetic',import.meta.url));
async function* bytes(b:Buffer){yield b;}
test('D2 real parser child: upload/immutable query/restart/invalid topo/limits/delete',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-files-'));let f=await new RemoteFiles(root).init();
 try{const trace=await readFile(path.join(fixture,'merged_swimlane.json')),topo=await readFile(path.join(fixture,'dyn_topo.txt'));
  const u=f.state.create('a');await f.write('a',u.upload_id,'trace',bytes(trace));await f.write('a',u.upload_id,'topo',bytes(topo));await (await f.parse('a',u.upload_id,'L2.json',true)).finished;
  const active=f.state.current('a',u.view_session_id).active_dataset;assert(active);assert.equal((await f.query('a',{dataset_id:active.id,sort:'duration_desc',limit:1})).items[0].duration_ns,5000);await assert.rejects(()=>f.query('b',{dataset_id:active.id}),/不存在/);
  const bad=f.state.create('a',u.view_session_id);await f.write('a',bad.upload_id,'trace',bytes(trace));await f.write('a',bad.upload_id,'topo',bytes(Buffer.from('bad topo')));await (await f.parse('a',bad.upload_id,'bad.json',true)).finished;assert.equal(f.state.upload('a',bad.upload_id).state,'failed');assert.equal(f.state.current('a',u.view_session_id).active_dataset.id,active.id);
  await f.dispose();f=await new RemoteFiles(root).init();assert.equal((await f.query('a',{dataset_id:active.id,limit:1})).filename,'L2.json');
  const tooBig=f.state.create('a',u.view_session_id);f.policy.maxBytes=1;await assert.rejects(()=>f.write('a',tooBig.upload_id,'trace',bytes(trace)),/限额/);f.policy.maxBytes=FILE_TEST_POLICY.maxBytes;
  await f.delete('a',u.view_session_id);await assert.rejects(()=>f.dataset('a',active.id),/不存在/);
 }finally{await f.dispose();await rm(root,{recursive:true,force:true});}
});
