/** Personal bearer credentials: persist verification digests only; no OAuth implementation. */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const digest=(s:string)=>createHash('sha256').update(s).digest();
export class Credentials {
 constructor(public db:DatabaseSync,public now=()=>Date.now()){
  db.exec('CREATE TABLE IF NOT EXISTS credentials(owner TEXT PRIMARY KEY,digest TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)');
 }
 active(owner:string){return !!this.db.prepare('SELECT owner FROM credentials WHERE owner=? AND revoked=0 AND (expires=0 OR expires>?)').get(owner,this.now());}
 clearSessions(owner:string){for(const table of ['grants','browser_sessions'])if(this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))this.db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(owner);}
 issue(owner:string,expires=0){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(owner)||!Number.isSafeInteger(expires)||(expires!==0 && expires<=this.now()))throw Error('Invalid owner or expiry');
  const token=randomBytes(32).toString('base64url');
  this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('INSERT INTO credentials(owner,digest,expires,revoked) VALUES(?,?,?,0) ON CONFLICT(owner) DO UPDATE SET digest=excluded.digest,expires=excluded.expires,revoked=0').run(owner,digest(token).toString('hex'),expires);this.clearSessions(owner);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}return token;
 }
 verify(header:string){if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))return null;const value=digest(header.slice(7));let owner:string|null=null;for(const row of this.db.prepare('SELECT owner,digest FROM credentials WHERE revoked=0 AND (expires=0 OR expires>?)').all(this.now()) as {owner:string;digest:string}[]){const expected=Buffer.from(row.digest,'hex');if(expected.length===value.length&&timingSafeEqual(expected,value))owner=row.owner;}return owner;}
 remove(owner:string){this.db.exec('BEGIN IMMEDIATE');try{this.clearSessions(owner);this.db.prepare('DELETE FROM credentials WHERE owner=?').run(owner);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 revoke(owner:string){this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('UPDATE credentials SET revoked=1 WHERE owner=?').run(owner);this.clearSessions(owner);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
