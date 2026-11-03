/** Durable owner/view/upload state, independent of authentication choice and transport. */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fail} from '../mcp/store';
export type Policy={maxViews:number;maxDatasets:number;retentionMs:number;uploadMs:number};
export const LOCAL_TEST_POLICY:Policy={maxViews:0,maxDatasets:4,retentionMs:86400000,uploadMs:900000};
export class RemoteState {
 db:DatabaseSync;
 constructor(file:string,public policy=LOCAL_TEST_POLICY,public now=()=>Date.now()){
  this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS views(id TEXT PRIMARY KEY,owner TEXT NOT NULL,generation INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 0,active TEXT,state TEXT NOT NULL DEFAULT 'open',expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,view_id TEXT NOT NULL REFERENCES views(id),generation INTEGER NOT NULL,state TEXT NOT NULL,error TEXT,dataset TEXT,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS datasets(id TEXT PRIMARY KEY,view_id TEXT NOT NULL REFERENCES views(id),filename TEXT NOT NULL,sha256 TEXT NOT NULL,topo_sha256 TEXT,parser_version TEXT NOT NULL,created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS views_owner ON views(owner);
  CREATE INDEX IF NOT EXISTS uploads_view ON uploads(view_id);
  CREATE INDEX IF NOT EXISTS datasets_view ON datasets(view_id);`);
  const columns=this.db.prepare('PRAGMA table_info(views)').all() as any[];
  if(!columns.some(c=>c.name==='created')){this.db.exec('ALTER TABLE views ADD COLUMN created INTEGER NOT NULL DEFAULT 0');this.db.prepare('UPDATE views SET created=expires-?').run(this.policy.retentionMs);}
  if(!columns.some(c=>c.name==='name'))this.db.exec("ALTER TABLE views ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  this.db.exec("UPDATE views SET state='inactive',active=(SELECT id FROM datasets WHERE view_id=views.id ORDER BY created DESC LIMIT 1) WHERE state='closed'");
 }
 transaction<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 view(owner:string,id:string){const v=this.db.prepare("SELECT * FROM views WHERE id=? AND owner=? AND state='open' AND expires>?").get(id,owner,this.now()) as any;return v??fail('NOT_FOUND','查看会话不存在或已失效');}
 open(owner:string,id?:string){return this.transaction(()=>{if(id)return this.current(owner,id);const count=this.db.prepare("SELECT count(*) n FROM views WHERE owner=? AND state='open' AND expires>?").get(owner,this.now()) as any;if(this.policy.maxViews>0 && count.n>=this.policy.maxViews)fail('VIEW_LIMIT','查看会话数量达到限制');const viewId=randomUUID();this.db.prepare('INSERT INTO views(id,owner,expires,created) VALUES(?,?,?,?)').run(viewId,owner,this.now()+this.policy.retentionMs,this.now());return this.current(owner,viewId);});}
 listDatasets(owner:string,id:string){const v=this.view(owner,id);return {view_session_id:id,active_dataset_id:v.active,items:(this.db.prepare('SELECT id,filename,created FROM datasets WHERE view_id=? ORDER BY created DESC').all(id) as any[]).map(d=>({...d,active:d.id===v.active}))};}
 create(owner:string,id?:string){return this.transaction(()=>{
  let v:any;
  if(id)v=this.view(owner,id);else{const count=this.db.prepare("SELECT count(*) n FROM views WHERE owner=? AND state='open' AND expires>?").get(owner,this.now()) as any;if(this.policy.maxViews>0 && count.n>=this.policy.maxViews)fail('VIEW_LIMIT','达到本机测试会话限额');id=randomUUID();this.db.prepare('INSERT INTO views(id,owner,expires,created) VALUES(?,?,?,?)').run(id,owner,this.now()+this.policy.retentionMs,this.now());v=this.view(owner,id!);}
  const count=this.db.prepare('SELECT count(*) n FROM datasets WHERE view_id=?').get(v.id) as any;
  if(count.n>=this.policy.maxDatasets)fail('DATASET_LIMIT','数据集数量达到限制，请让 agent 列出并删除不需要的旧数据集');
  this.db.prepare("UPDATE uploads SET state='superseded',error=NULL WHERE view_id=? AND state IN ('pending','uploading','queued','parsing')").run(id!);
  const generation=v.generation+1,upload=randomUUID();this.db.prepare('UPDATE views SET generation=? WHERE id=?').run(generation,id!);
  this.db.prepare("INSERT INTO uploads(id,view_id,generation,state,expires) VALUES(?,?,?,'pending',?)").run(upload,id!,generation,this.now()+this.policy.uploadMs);
  return {view_session_id:id!,upload_id:upload,generation};
 });}
 upload(owner:string,id:string){const u=this.db.prepare('SELECT * FROM uploads WHERE id=?').get(id) as any;if(!u)fail('NOT_FOUND','上传不存在');this.view(owner,u.view_id);if(u.expires<=this.now()&&!['ready','failed','superseded'].includes(u.state)){this.db.prepare("UPDATE uploads SET state='expired' WHERE id=?").run(id);u.state='expired';}return u;}
 transition(owner:string,id:string,from:string[],to:string){const u=this.upload(owner,id),v=this.view(owner,u.view_id);if(v.generation!==u.generation||!from.includes(u.state))fail('UPLOAD_CONFLICT','上传已失效或状态不允许');this.db.prepare('UPDATE uploads SET state=? WHERE id=?').run(to,id);return u;}
 failUpload(owner:string,id:string,code:string){const u=this.upload(owner,id),v=this.view(owner,u.view_id);if(v.generation===u.generation&&['uploading','queued','parsing','pending'].includes(u.state))this.db.prepare("UPDATE uploads SET state='failed',error=? WHERE id=?").run(code,id);}
 commit(owner:string,upload:string,d:{id:string;filename:string;sha256:string;topo_sha256:string|null;parser_version:string}){return this.transaction(()=>{
  const u=this.upload(owner,upload),v=this.view(owner,u.view_id);if(v.generation!==u.generation||u.state!=='parsing')return false;
  const count=this.db.prepare('SELECT count(*) n FROM datasets WHERE view_id=?').get(v.id) as any;
  if(count.n>=this.policy.maxDatasets)fail('DATASET_LIMIT','达到数据集限额');
  this.db.prepare('INSERT INTO datasets VALUES(?,?,?,?,?,?,?)').run(d.id,v.id,d.filename,d.sha256,d.topo_sha256,d.parser_version,this.now());
  this.db.prepare('UPDATE views SET active=?,version=version+1 WHERE id=? AND generation=?').run(d.id,v.id,u.generation);
  this.db.prepare("UPDATE uploads SET state='ready',dataset=? WHERE id=?").run(d.id,u.id);return true;
 });}
 dataset(owner:string,id:string){const d=this.db.prepare('SELECT * FROM datasets WHERE id=?').get(id) as any;if(!d)fail('NOT_FOUND','数据集不存在');this.view(owner,d.view_id);return d;}
 current(owner:string,id:string){const v=this.view(owner,id),u=this.db.prepare('SELECT * FROM uploads WHERE view_id=? ORDER BY generation DESC LIMIT 1').get(id) as any;return {view_session_id:v.id,version:v.version,generation:v.generation,active_dataset:v.active?this.dataset(owner,v.active):null,upload:u?this.upload(owner,u.id):null,expires_at:v.expires};}
 run(owner:string,id:string){const v=this.db.prepare('SELECT * FROM views WHERE id=? AND owner=?').get(id,owner) as any;if(!v)fail('NOT_FOUND','分析不存在');return v;}
 busy(id:string){return !!this.db.prepare("SELECT id FROM uploads WHERE view_id=? AND state IN ('uploading','queued','parsing') AND expires>?").get(id,this.now());}
 protect(owner:string,id:string,current?:string){const v=this.run(owner,id);if(id===current)fail('CURRENT_VIEW','当前分析受保护');if(this.busy(id))fail('VIEW_BUSY','分析正在上传、排队或解析');return v;}
 listRuns(owner:string){return (this.db.prepare('SELECT * FROM views WHERE owner=? ORDER BY created DESC,id DESC').all(owner) as any[]).map(v=>({id:v.id,name:v.name||new Date(v.created).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' 创建的分析',created:v.created,expires_at:v.expires,state:v.expires<=this.now()?'expired':v.state==='open'?'active':v.state,busy:this.busy(v.id),datasets:this.db.prepare('SELECT id,filename,created FROM datasets WHERE view_id=? ORDER BY created DESC').all(v.id)}));}
 setRunState(owner:string,id:string,state:'open'|'inactive',current?:string){return this.transaction(()=>{const v=this.protect(owner,id,current);if(v.expires<=this.now()||v.state==='deleting')fail('VIEW_EXPIRED','分析已过期');this.db.prepare('UPDATE views SET state=? WHERE id=?').run(state,id);return {view_session_id:id,state:state==='open'?'active':'inactive',expires_at:v.expires};});}
 renameRun(owner:string,id:string,name:string){this.run(owner,id);if(!name.trim()||name.length>100)fail('INVALID_NAME','名称需为 1–100 个字符');this.db.prepare('UPDATE views SET name=? WHERE id=?').run(name.trim(),id);return {renamed:true};}
 close(owner:string,id:string){return this.setRunState(owner,id,'inactive');}
 // Physical deletion belongs to the file adapter. Marking closed first revokes all access.
 markDeleting(owner:string,id:string){const v=this.db.prepare('SELECT * FROM views WHERE id=? AND owner=?').get(id,owner) as any;if(!v)fail('NOT_FOUND','会话不存在');this.db.prepare("UPDATE views SET state='deleting',active=NULL WHERE id=?").run(id);return {uploads:this.db.prepare('SELECT id FROM uploads WHERE view_id=?').all(id),datasets:this.db.prepare('SELECT id FROM datasets WHERE view_id=?').all(id)};}
 finishDelete(id:string){this.transaction(()=>{this.db.prepare('DELETE FROM uploads WHERE view_id=?').run(id);this.db.prepare('DELETE FROM datasets WHERE view_id=?').run(id);this.db.prepare('DELETE FROM views WHERE id=?').run(id);});}
 recover(){this.db.exec("UPDATE uploads SET state='failed',error='SERVER_RESTART' WHERE state IN ('pending','uploading','queued','parsing')");}
 expired(){return this.db.prepare('SELECT id,owner FROM views WHERE expires<=? OR state=?').all(this.now(),'deleting') as any[];}
 dispose(){this.db.close();}
}
