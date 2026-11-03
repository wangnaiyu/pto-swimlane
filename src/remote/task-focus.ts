/** Ephemeral, bounded UI commands. Never replay actions after a server restart. */
import {randomUUID} from 'node:crypto';
import {RemoteFiles} from './files';
import {AnalysisSessions} from './analysis-sessions';
import {fail} from '../mcp/store';
export type FocusInput={analysis_session_id?:string;view_session_id?:string;dataset_id:string;seqNo:string;taskId:string};
type Command={id:string;owner:string;view:string;analysis?:string;dataset:string;stamp:string;task:any;filename:string;sha256:string;created:number;expires:number;status:'queued'|'claimed'|'applied'|'failed'|'expired'|'superseded';browser?:string;page?:string;code?:string;completed?:number};
export class TaskFocus {
 private commands=new Map<string,Command>();
 constructor(private files:RemoteFiles,private analyses:AnalysisSessions,private now=Date.now){}
 private current(owner:string,view?:string,analysis?:string){
  if(!view&&!analysis)fail('FOCUS_CONTEXT_REQUIRED','需要当前对话或查看会话');
  const s=analysis?this.analyses.current(owner,analysis):this.files.state.current(owner,view!);
  if(view&&s.view_session_id!==view)fail('ANALYSIS_CHANGED','当前对话已切换查看会话');
  return s;
 }
 private stamp(s:any){return JSON.stringify([s.view_session_id,s.active_dataset?.id,s.version,s.selection_revision]);}
 private refresh(c:Command){
  if(!['queued','claimed'].includes(c.status))return;
  if(c.expires<=this.now()){c.status='expired';c.code='BROWSER_NOT_ACKNOWLEDGED';return;}
  try{if(this.stamp(this.current(c.owner,c.view,c.analysis))!==c.stamp)throw Error();}
  catch{c.status='failed';c.code='SELECTION_CHANGED';}
 }
 cleanup(){for(const [id,c] of this.commands){this.refresh(c);if(this.now()-c.created>600000)this.commands.delete(id);}}
 private result(c:Command){this.refresh(c);return {focus_request_id:c.id,status:c.status,code:c.code,view_session_id:c.view,analysis_session_id:c.analysis,dataset_id:c.dataset,filename:c.filename,sha256:c.sha256,task:c.task,time_unit:'ns',created_at:c.created,expires_at:c.expires,completed_at:c.completed,instructions:c.status==='applied'?'The browser confirmed selection and visibility at completed_at. This is a receipt, not a guarantee of its later state.':['queued','claimed'].includes(c.status)?'Not yet located. Call get_focus_status with focus_request_id a bounded number of times. Only applied confirms selection and scrolling. Keep the matching swimlane page open and visible. If expired, reopen the same analysis via create_upload_session, open its fresh upload_url, then issue a NEW focus_task.':'No successful location receipt. Resolve the current analysis before retrying. Never report success for this status.'};}
 async create(owner:string,a:FocusInput){
  this.cleanup();const s=this.current(owner,a.view_session_id,a.analysis_session_id);
  if(s.active_dataset?.id!==a.dataset_id)fail('DATASET_MISMATCH','指定文件不是当前分析选择');
  const stamp=this.stamp(s),detail=await this.files.detail(owner,{...a,limit:1});
  if(this.stamp(this.current(owner,a.view_session_id,a.analysis_session_id))!==stamp)fail('ANALYSIS_CHANGED','查询期间文件已切换');
  if(this.commands.size>=2000||[...this.commands.values()].filter(c=>c.owner===owner).length>=100)fail('FOCUS_LIMIT','定位请求过多，请稍后重试');
  for(const c of this.commands.values())if(c.owner===owner&&c.view===s.view_session_id&&c.analysis===a.analysis_session_id&&['queued','claimed'].includes(c.status))c.status='superseded';
  const c:Command={id:randomUUID(),owner,view:s.view_session_id,analysis:a.analysis_session_id,dataset:a.dataset_id,stamp,task:detail.task,filename:detail.filename,sha256:detail.sha256,created:this.now(),expires:this.now()+30000,status:'queued'};
  this.commands.set(c.id,c);return this.result(c);
 }
 status(owner:string,id:string){const c=this.commands.get(id);if(!c||c.owner!==owner||this.now()-c.created>600000)fail('FOCUS_NOT_FOUND','定位请求不存在或回执已清理');return this.result(c!);}
 claim(owner:string,view:string,analysis:string|undefined,browser:string,b:any){
  this.cleanup();const s=this.current(owner,view,analysis);
  if(s.active_dataset?.id!==b.dataset_id||s.version!==b.version||s.selection_revision!==b.selection_revision)return {command:null};
  const c=[...this.commands.values()].find(c=>c.owner===owner&&c.view===view&&c.analysis===analysis&&c.status==='queued');
  if(!c)return {command:null};c.status='claimed';c.browser=browser;c.page=b.page_id;return {command:this.result(c)};
 }
 acknowledge(owner:string,view:string,analysis:string|undefined,browser:string,id:string,b:any){
  const c=this.commands.get(id);if(!c||c.owner!==owner||c.view!==view||c.analysis!==analysis||c.browser!==browser||c.page!==b.page_id)fail('FOCUS_NOT_FOUND','定位请求不属于当前页面');
  this.refresh(c!);if(c!.status!=='claimed')return this.result(c!);
  if(b.dataset_id!==c!.dataset||b.event_id!==c!.task.event_id||b.seqNo!==c!.task.seqNo||b.taskId!==c!.task.taskId)fail('FOCUS_IDENTITY_MISMATCH','定位回执身份不匹配');
  c!.status=b.applied?'applied':'failed';c!.code=b.applied?undefined:b.code??'BROWSER_FOCUS_FAILED';c!.completed=this.now();return this.result(c!);
 }
}
