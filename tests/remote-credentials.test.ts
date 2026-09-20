import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Credentials} from '../src/remote/credentials';
test('permanent tokens remain valid, revocation/deletion clear browser sessions',()=>{
 const db=new DatabaseSync(':memory:');let now=1000;const c=new Credentials(db,()=>now);
 try{db.exec('CREATE TABLE grants(owner TEXT); CREATE TABLE browser_sessions(owner TEXT)');const token=c.issue('a');now+=365*86400000;assert.equal(c.verify('Bearer '+token),'a');assert(c.active('a'));
 db.prepare('INSERT INTO grants VALUES(?)').run('a');db.prepare('INSERT INTO browser_sessions VALUES(?)').run('a');c.revoke('a');assert.equal(c.verify('Bearer '+token),null);assert(!c.active('a'));assert.equal((db.prepare('SELECT count(*) n FROM browser_sessions').get() as any).n,0);
 const next=c.issue('a');c.remove('a');assert.equal(c.verify('Bearer '+next),null);assert.equal((db.prepare('SELECT count(*) n FROM credentials').get() as any).n,0);
 }finally{db.close();}
});
