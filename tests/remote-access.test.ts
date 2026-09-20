import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Credentials} from '../src/remote/credentials';
import {AccessAccounts} from '../src/remote/access-accounts';
test('named accounts support suspend/enable/reset without losing ownership or exposing token hashes',()=>{
 const db=new DatabaseSync(':memory:');const creds=new Credentials(db);const a=new AccessAccounts(creds);
 try{db.exec('CREATE TABLE grants(owner TEXT); CREATE TABLE browser_sessions(owner TEXT)');
 const first=a.create('测试同事');const second=a.create('测试同事');assert.notEqual(first.id,second.id);assert.equal(creds.verify('Bearer '+first.token),first.id);
 db.prepare('INSERT INTO browser_sessions VALUES(?)').run(first.id);a.disable(first.id);assert.equal(creds.verify('Bearer '+first.token),null);assert.equal((db.prepare('SELECT count(*) n FROM browser_sessions').get() as any).n,0);
 a.enable(first.id);assert.equal(creds.verify('Bearer '+first.token),first.id);
 const reset=a.reset(first.id);assert.equal(reset.id,first.id);assert.equal(creds.verify('Bearer '+first.token),null);assert.equal(creds.verify('Bearer '+reset.token),first.id);
 const listed=a.list();assert.equal(listed.find(x=>x.id===first.id)?.name,'测试同事');assert(!JSON.stringify(listed).includes(reset.token));assert(!('digest' in listed[0]));assert.throws(()=>a.enable('missing'));assert.throws(()=>a.create('\u001b[31m'));
 }finally{db.close();}
});
test('legacy accounts remain visible and expired credentials cannot be enabled',()=>{
 const db=new DatabaseSync(':memory:');const c=new Credentials(db);c.issue('legacy');const a=new AccessAccounts(c);
 assert.equal(a.list()[0].name,'legacy');db.prepare('UPDATE credentials SET expires=1 WHERE owner=?').run('legacy');assert.throws(()=>a.enable('legacy'));db.close();
});
