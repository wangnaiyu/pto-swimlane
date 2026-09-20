import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {RemoteState,LOCAL_TEST_POLICY} from '../src/remote/state';
const d=(id:string)=>({id,filename:id+'.json',sha256:id,topo_sha256:null,parser_version:'0.3.1'});
test('D2 durable generations: newer success wins, failure retains snapshot, isolation/restart/delete/expiry',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pto-state-'));let now=1000;let s=new RemoteState(path.join(root,'state.db'),LOCAL_TEST_POLICY,()=>now);
 try{
  const old=s.create('a');s.transition('a',old.upload_id,['pending'],'parsing');
  const latest=s.create('a',old.view_session_id);s.transition('a',latest.upload_id,['pending'],'parsing');assert.equal(s.commit('a',latest.upload_id,d('new')),true);
  assert.equal(s.commit('a',old.upload_id,d('old')),false);assert.equal(s.current('a',old.view_session_id).active_dataset.id,'new');
  s.failUpload('a',old.upload_id,'OLD_ERROR');assert.equal(s.current('a',old.view_session_id).upload.state,'ready');
  const failed=s.create('a',old.view_session_id);s.transition('a',failed.upload_id,['pending'],'parsing');s.failUpload('a',failed.upload_id,'INVALID_TOPO');assert.equal(s.current('a',old.view_session_id).active_dataset.id,'new');assert.equal(s.current('a',old.view_session_id).version,1);
  assert.throws(()=>s.dataset('b','new'),/不存在/);assert.throws(()=>s.create('b',old.view_session_id),/不存在/);
  const second=s.create('a');s.transition('a',second.upload_id,['pending'],'parsing');s.dispose();s=new RemoteState(path.join(root,'state.db'),LOCAL_TEST_POLICY,()=>now);s.recover();assert.equal(s.current('a',second.view_session_id).upload.error,'SERVER_RESTART');assert.equal(s.dataset('a','new').filename,'new.json');
  s.markDeleting('a',old.view_session_id);assert.throws(()=>s.dataset('a','new'),/不存在/);s.finishDelete(old.view_session_id);assert.throws(()=>s.current('a',old.view_session_id),/不存在/);
  now+=LOCAL_TEST_POLICY.retentionMs+1;assert.throws(()=>s.current('a',second.view_session_id),/不存在/);assert.equal(s.expired().length,1);
 }finally{s.dispose();await rm(root,{recursive:true,force:true});}
});

test('unlimited views retain independent IDs, ownership, dataset quota and expiry',()=>{
 let now=1000;const s=new RemoteState(':memory:',{...LOCAL_TEST_POLICY,maxViews:0,maxDatasets:1},()=>now);
 try{
  const ids=Array.from({length:6},()=>s.open('a').view_session_id);assert.equal(new Set(ids).size,6);
  const u=s.create('a');s.transition('a',u.upload_id,['pending'],'parsing');s.commit('a',u.upload_id,d('one'));
  assert.ok(s.open('a').view_session_id);assert.throws(()=>s.create('a',u.view_session_id),/数据集/);
  assert.throws(()=>s.current('b',ids[0]),/不存在/);
  now+=LOCAL_TEST_POLICY.retentionMs+1;assert.throws(()=>s.current('a',ids[0]),/不存在/);
 }finally{s.dispose();}
});

test('dataset quota is isolated per view and enforced again at commit',()=>{
 const s=new RemoteState(':memory:',{...LOCAL_TEST_POLICY,maxDatasets:1});
 try{
  const a=s.create('owner');s.transition('owner',a.upload_id,['pending'],'parsing');s.commit('owner',a.upload_id,d('a'));
  assert.throws(()=>s.create('owner',a.view_session_id),/数据集/);
  const b=s.create('owner');s.transition('owner',b.upload_id,['pending'],'parsing');assert.equal(s.commit('owner',b.upload_id,d('b')),true);
  assert.equal(s.listDatasets('owner',a.view_session_id).items.length,1);assert.equal(s.listDatasets('owner',b.view_session_id).items.length,1);
  assert.throws(()=>s.create('other',b.view_session_id),/不存在/);
  s.policy.maxDatasets=2;const pending=s.create('owner',b.view_session_id);s.transition('owner',pending.upload_id,['pending'],'parsing');s.policy.maxDatasets=1;
  assert.throws(()=>s.commit('owner',pending.upload_id,d('blocked')),/数据集/);
 }finally{s.dispose();}
});

test('run lifecycle: owner isolation, current/busy protection, reversible inactivity, fixed expiry',()=>{
 let now=1000;const s=new RemoteState(':memory:',LOCAL_TEST_POLICY,()=>now);
 try{const current=s.open('a').view_session_id,u=s.create('a');s.transition('a',u.upload_id,['pending'],'parsing');
 assert.throws(()=>s.setRunState('a',current,'inactive',current),/当前分析/);assert.throws(()=>s.setRunState('a',u.view_session_id,'inactive',current),/正在/);
 s.commit('a',u.upload_id,d('retained'));const expiry=s.current('a',u.view_session_id).expires_at;
 s.renameRun('a',u.view_session_id,'测试分析');s.setRunState('a',u.view_session_id,'inactive',current);assert.throws(()=>s.current('a',u.view_session_id),/不存在/);assert.equal(s.listRuns('b').length,0);assert.throws(()=>s.setRunState('b',u.view_session_id,'open'),/不存在/);
 now+=100;s.setRunState('a',u.view_session_id,'open',current);assert.equal(s.current('a',u.view_session_id).active_dataset.id,'retained');assert.equal(s.current('a',u.view_session_id).expires_at,expiry);
 now=expiry;assert.equal(s.listRuns('a').find(v=>v.id===u.view_session_id)?.state,'expired');assert.throws(()=>s.setRunState('a',u.view_session_id,'open'),/过期/);
 }finally{s.dispose();}
});
