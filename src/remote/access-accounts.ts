import {randomUUID} from 'node:crypto';
import {Credentials} from './credentials';
/** Administrator-only account metadata. Authentication still uses the existing credential digests. */
export class AccessAccounts {
 constructor(public credentials:Credentials){credentials.db.exec('CREATE TABLE IF NOT EXISTS access_profiles(owner TEXT PRIMARY KEY,name TEXT NOT NULL,created INTEGER NOT NULL)');}
 private require(id:string){const row=this.credentials.db.prepare('SELECT owner,expires,revoked FROM credentials WHERE owner=?').get(id);if(!row)throw Error('用户 ID 不存在');return row;}
 create(name:string){
  name=name.trim();if(!name||name.length>80||/[\x00-\x1f\x7f]/.test(name))throw Error('姓名须为 1–80 个可见字符');
  const id='user-'+randomUUID();const token=this.credentials.issue(id);
  try{this.credentials.db.prepare('INSERT INTO access_profiles VALUES(?,?,?)').run(id,name,Date.now());}catch(e){this.credentials.remove(id);throw e;}
  return {id,name,token};
 }
 reset(id:string){this.require(id);const token=this.credentials.issue(id);return {id,token};}
 disable(id:string){this.require(id);this.credentials.revoke(id);}
 enable(id:string){const r=this.require(id);if(Number(r.expires)!==0&&Number(r.expires)<=Date.now())throw Error('旧凭据已过期，请 reset 换发永久 token');this.credentials.db.prepare('UPDATE credentials SET revoked=0 WHERE owner=?').run(id);}
 list(){return this.credentials.db.prepare('SELECT c.owner AS id,coalesce(p.name,c.owner) AS name,p.created AS created,c.expires,c.revoked FROM credentials c LEFT JOIN access_profiles p ON p.owner=c.owner ORDER BY p.created DESC,c.owner').all().map(r=>({id:String(r.id),name:String(r.name),created:r.created===null?null:Number(r.created),status:r.revoked?'disabled':Number(r.expires)!==0&&Number(r.expires)<=Date.now()?'expired':'enabled',expires:Number(r.expires)}));}
}
