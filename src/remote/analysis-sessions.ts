/** Conversation selection is independent of browser cookies and shared view state. */
import {randomUUID} from 'node:crypto';
import {RemoteState} from './state';
import {fail} from '../mcp/store';

export class AnalysisSessions {
 constructor(private state:RemoteState){
  state.db.exec(`CREATE TABLE IF NOT EXISTS analysis_sessions(
   id TEXT PRIMARY KEY, owner TEXT NOT NULL, view_id TEXT NOT NULL,
   dataset_id TEXT, pending_upload TEXT, revision INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS analysis_sessions_owner ON analysis_sessions(owner);`);
 }
 get(owner:string,id:string){
  const row=this.state.db.prepare('SELECT * FROM analysis_sessions WHERE id=? AND owner=? AND expires>?').get(id,owner,this.state.now()) as any;
  return row??fail('ANALYSIS_EXPIRED','对话关联已过期，请重新发起性能分析');
 }
 create(owner:string,view:string){
  const v=this.state.view(owner,view),id=randomUUID();
  this.state.db.prepare('INSERT INTO analysis_sessions(id,owner,view_id,dataset_id,expires) VALUES(?,?,?,?,?)').run(id,owner,view,v.active,this.state.now()+this.state.policy.retentionMs);
  return this.get(owner,id);
 }
 current(owner:string,id:string){
  const a=this.get(owner,id),current=this.state.current(owner,a.view_id);
  const upload=a.pending_upload?this.state.upload(owner,a.pending_upload):null;
  const selected=upload?.state==='ready'?this.state.dataset(owner,upload.dataset):a.dataset_id?this.state.dataset(owner,a.dataset_id):current.active_dataset;
  return {...current,active_dataset:selected,analysis_session_id:a.id,selection_revision:a.revision,selection_expires_at:a.expires};
 }
 select(owner:string,id:string,view:string,dataset:string|null,revision:number,force=false){
  const a=this.get(owner,id);this.state.view(owner,view);
  if(dataset&&this.state.dataset(owner,dataset).view_id!==view)fail('NOT_FOUND','文件不属于该分析');
  if(a.revision!==revision)fail('ANALYSIS_CHANGED','此对话已选择其他文件，请重新打开分析入口');
  if(force||a.view_id!==view||a.dataset_id!==dataset)this.state.db.prepare('UPDATE analysis_sessions SET view_id=?,dataset_id=?,pending_upload=NULL,revision=revision+1 WHERE id=?').run(view,dataset,id);
  return this.get(owner,id);
 }
 followUpload(owner:string,id:string,uploadId:string,revision:number){
  const a=this.get(owner,id),upload=this.state.upload(owner,uploadId);
  if(a.revision!==revision||a.view_id!==upload.view_id)fail('ANALYSIS_CHANGED','当前对话已切换文件');
  // Keep the previous selected version if parsing fails; adopt only successful output.
  const current=this.current(owner,id);
  this.state.db.prepare('UPDATE analysis_sessions SET dataset_id=?,pending_upload=?,revision=revision+1 WHERE id=?').run(current.active_dataset?.id??null,uploadId,id);
 }
 cleanup(){this.state.db.prepare('DELETE FROM analysis_sessions WHERE expires<=?').run(this.state.now());}
}
