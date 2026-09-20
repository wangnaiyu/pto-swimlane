import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {RemoteFiles,FILE_TEST_POLICY} from '../src/remote/files';
async function* bytes(b:Buffer){yield b;}
test('size-aware queue: large job runs alone, newer selection supersedes queued input, queue drains',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-queue-')),raw=await readFile('tests/fixtures/L2-synthetic/merged_swimlane.json');const f=await new RemoteFiles(root,{...FILE_TEST_POLICY,maxConcurrent:2,smallFileBytes:raw.length+1,maxQueued:10}).init();
 try{const a=await f.create('a'),b=await f.create('b'),c=await f.create('c');await f.write('a',a.upload_id,'trace',bytes(raw));await f.write('b',b.upload_id,'trace',bytes(Buffer.concat([raw,Buffer.from('   ')])));await f.write('c',c.upload_id,'trace',bytes(raw));
 const one=await f.parse('a',a.upload_id,'small.json',false),two=await f.parse('b',b.upload_id,'large.json',false),three=await f.parse('c',c.upload_id,'old.json',false);
 const next=await f.create('c',c.view_session_id);await f.write('c',next.upload_id,'trace',bytes(raw));const four=await f.parse('c',next.upload_id,'new.json',false);
 let violation=false;const check=setInterval(()=>{if(f.jobs.has(b.upload_id)&&f.jobs.size!==1)violation=true;},1);
 await Promise.all([one.finished,two.finished,three.finished,four.finished]);clearInterval(check);assert.equal(violation,false);assert.equal(f.state.upload('c',c.upload_id).state,'superseded');assert.equal(f.state.current('c',c.view_session_id).active_dataset.filename,'new.json');assert.equal(f.state.upload('b',b.upload_id).state,'ready');assert.equal(f.queue.length,0);
 }finally{await f.dispose();await rm(root,{recursive:true,force:true});}
});
