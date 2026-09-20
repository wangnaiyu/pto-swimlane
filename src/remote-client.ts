import {ref} from 'vue';
import {requestJson} from './result-request';
export function remoteClient(hooks:{generation:()=>number;begin:()=>number;prepare?:()=>void;show:(s:any)=>void;clear:()=>void;busy:(b:boolean)=>void;notice:(s:string)=>void}){
 const syncVisible=ref(false);
 const syncId=ref(''),syncPrompt=ref(''),syncConfirmed=ref(false),syncMessage=ref(''),syncBusy=ref(false);
 const loadError=ref('');let failedDataset='';
 const recoveryNeeded=ref(false),failureReason=ref('');
 const failUpload=(reason:string)=>{uploadFailed.value=true;failureReason.value=reason;hooks.notice(reason);};
 const message=(e:any)=>({SESSION_EXPIRED:'浏览器授权已过期或未建立。请在原对话重新打开入口；仍在保留期内的泳道图会自动恢复，无需重复上传。',INVALID_GRANT:'此入口已使用或过期，请在原对话重新生成入口。',DATASET_LIMIT:'数据集数量已达上限，请点击“管理文件”删除不需要的旧数据集',NOT_FOUND:'查看会话不存在或已超过保留期，请返回原对话确认。'} as Record<string,string>)[e?.message]??String(e);
 const uploading=ref(false),percent=ref(0),selectedName=ref(''),uploadFailed=ref(false);
 const view=ref(''),grant=ref(''),ready=ref(false),progress=ref(''),dataset=ref('');let warning='',csrf='',timer:ReturnType<typeof setTimeout>|undefined,stopped=false,polling=false,transmitting=0;
 const apiRoot=new URL('api/',document.baseURI).pathname;
 const syncKey=()=>`pto-sync:${view.value}`;
 function saveSync(){try{sessionStorage.setItem(syncKey(),JSON.stringify({id:syncId.value,prompt:syncPrompt.value}));}catch{}}
 function restoreSync(){try{const s=JSON.parse(sessionStorage.getItem(syncKey())??'null');if(s?.id){syncId.value=s.id;syncPrompt.value=s.prompt??'';}}catch{}}
 const base=()=>`${apiRoot}views/${encodeURIComponent(view.value)}`;
 const api=(url:string,options:RequestInit={},onProgress?:(loaded:number,total:number)=>void)=>requestJson(url,{...options,headers:{'X-PTO-CSRF':csrf,...options.headers}},onProgress);
 function init(){const p=new URLSearchParams(location.hash.slice(1));const next=p.get('view')??'';if(next!==view.value){loadError.value='';failedDataset='';hooks.begin();progress.value='正在恢复分析…';syncId.value='';syncPrompt.value='';syncConfirmed.value=false;syncMessage.value='';syncVisible.value=false;hooks.clear();dataset.value='';ready.value=false;csrf='';}view.value=next;if(!syncId.value)restoreSync();grant.value=p.get('grant')??'';if(grant.value){history.replaceState(null,'',`#view=${encodeURIComponent(view.value)}`);}if(view.value&&!grant.value){ready.value=true;void poll();}}
 async function enter(){const r=hooks.begin();try{const s=await api(apiRoot+'redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({view:view.value,grant:grant.value})});if(r!==hooks.generation())return;csrf=s.csrf;grant.value='';recoveryNeeded.value=false;ready.value=true;hooks.notice('');await poll();}catch(e){recoveryNeeded.value=true;hooks.notice(message(e));}finally{hooks.busy(false);}}
 async function poll(){if(stopped||polling||!ready.value)return;polling=true;const request=hooks.generation();let loadingId='';try{
  if(transmitting)return;
  const state=await api(base());if(request!==hooks.generation()||stopped)return;csrf=state.csrf;if(syncId.value){const requestedSync=syncId.value;const status=await api(base()+'/sync/'+encodeURIComponent(requestedSync));if(request!==hooks.generation()||requestedSync!==syncId.value)return;syncConfirmed.value=status.confirmed;if(status.expired){syncId.value='';syncPrompt.value='';saveSync();syncMessage.value='同步口令已过期，请点击重新同步后粘贴新口令';}else if(status.confirmed){syncPrompt.value='';syncMessage.value='';syncVisible.value=false;saveSync();}}
  const upload=state.upload;if(!state.active_dataset&&!['queued','parsing','uploading'].includes(upload?.state))hooks.busy(false);progress.value=({pending:'请选择文件',uploading:'正在上传…',queued:'等待解析…',parsing:'正在服务器解析…',failed:'上传或解析失败',expired:'上传已过期',superseded:'已被新的上传替代'} as any)[upload?.state]??'';
  if(['failed','expired'].includes(upload?.state)){failUpload(`${message(Error(upload.error??'上传已过期'))}${dataset.value?'；当前仍显示上次成功的文件':''}`);hooks.busy(false);}
  if(state.active_dataset&&state.active_dataset.id!==dataset.value&&state.active_dataset.id!==failedDataset){
   loadingId=state.active_dataset.id;loadError.value='';hooks.busy(true);hooks.prepare?.();progress.value='正在下载结果…';
   const snapshot=await api(base()+'/datasets/'+loadingId,{},(loaded,total)=>{if(request===hooks.generation()&&!stopped)progress.value=total?`正在下载结果… ${Math.min(100,Math.floor(loaded/total*100))}%`:`正在下载结果… ${(loaded/1048576).toFixed(1)} MB`;});
   if(request!==hooks.generation()||stopped)return;progress.value='正在校验结果…';
   const latest=await api(base());if(request!==hooks.generation()||stopped)return;
   if(latest.version!==state.version||latest.active_dataset?.id!==loadingId){hooks.busy(false);return;}
   dataset.value=loadingId;failedDataset='';warning=(snapshot.warnings??[]).join('；');uploadFailed.value=false;failureReason.value='';selectedName.value=snapshot.title;hooks.show(snapshot);hooks.busy(false);
  }
  if(upload?.state==='ready'){hooks.busy(false);if(!uploadFailed.value&&!loadError.value)hooks.notice(warning);}
 }catch(e:any){if(request===hooks.generation()){hooks.notice(message(e));if(!loadingId){loadError.value='分析状态读取失败，请重试载入';hooks.busy(false);}if(loadingId){failedDataset=loadingId;loadError.value='结果载入失败，请重试，无需重新上传';hooks.notice('');hooks.busy(false);}if([401,404,410].includes(e.status)){loadError.value='';hooks.clear();dataset.value='';ready.value=false;syncConfirmed.value=false;recoveryNeeded.value=e.status===401;hooks.busy(false);}}}finally{polling=false;if(ready.value&&!stopped){clearTimeout(timer);timer=setTimeout(()=>void poll(),['等待解析…','正在服务器解析…','正在载入结果…'].includes(progress.value)?500:2000);}}}
 async function upload(files:File[]){
  if(!files.length||uploading.value)return;
  const trace=files.filter(f=>f.name.endsWith('.json')),topo=files.filter(f=>f.name==='dyn_topo.txt');
  uploadFailed.value=false;failureReason.value='';selectedName.value=files.map(f=>f.name).join('、');
  if(trace.length!==1||topo.length>1||files.length!==trace.length+topo.length||files.some(f=>f.size>80000000)){failUpload('请选择一个泳道 JSON，可同时选择同组 dyn_topo.txt；每个文件不超过 80 MB');return;}
  loadError.value='';failedDataset='';hooks.prepare?.();const request=hooks.begin();hooks.notice('');progress.value='正在准备上传…';transmitting=request;uploading.value=true;percent.value=0;
  try{
   const prepared: {slot:string;body:Blob;compressed:boolean}[]=[];
   for(const [slot,file] of [['trace',trace[0]],['topo',topo[0]]] as const){if(!file)continue;let body:Blob=file,compressed=false;
    if(file.size>=1024*1024&&typeof CompressionStream!=='undefined'){const gz=await new Response(file.stream().pipeThrough(new CompressionStream('gzip'))).blob();if(gz.size<file.size){body=gz;compressed=true;}}
    prepared.push({slot,body,compressed});
   }
   if(request!==hooks.generation())return;
   const u=await api(base()+'/uploads',{method:'POST'});if(request!==hooks.generation())return;
   const total=prepared.reduce((n,f)=>n+f.body.size,0);let sent=0;progress.value='正在上传…';
   for(const file of prepared){await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',base()+'/uploads/'+u.upload_id+'/'+file.slot);xhr.setRequestHeader('X-PTO-CSRF',csrf);if(file.compressed)xhr.setRequestHeader('Content-Encoding','gzip');xhr.timeout=600000;
    xhr.upload.onprogress=e=>{if(request===hooks.generation())percent.value=Math.min(99,Math.floor((sent+e.loaded)/total*100));};
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve();else{let code='UPLOAD_FAILED';try{code=JSON.parse(xhr.responseText).code??code;}catch{}reject(Error(code));}};
    xhr.onerror=()=>reject(Error('上传连接中断'));xhr.ontimeout=()=>reject(Error('上传超时'));xhr.onabort=()=>reject(Error('上传已取消'));xhr.send(file.body);
   });sent+=file.body.size;if(request!==hooks.generation())return;}
   percent.value=100;uploading.value=false;progress.value='正在服务器解析…';
   await api(base()+'/uploads/'+u.upload_id+'/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:trace[0].name,has_topo:!!topo[0]})});if(request!==hooks.generation())return;
  }catch(e:any){if(request===hooks.generation()){failUpload(`${message(e)}${dataset.value && e?.message!=='DATASET_LIMIT'?'；当前仍显示上次成功的文件':''}`);hooks.busy(false);}}
  finally{if(transmitting===request){transmitting=0;uploading.value=false;void poll();}}
 }
 async function copySync(){try{await navigator.clipboard.writeText(syncPrompt.value);syncMessage.value='口令已复制，请粘贴到当前对话，等待 Agent 确认';}catch{syncMessage.value='请复制下方口令，粘贴到当前对话';}}
 async function requestSync(){if(syncBusy.value||!dataset.value)return;syncVisible.value=true;if(syncId.value&&syncPrompt.value&&!syncConfirmed.value){await copySync();return;}const target=view.value;syncBusy.value=true;syncConfirmed.value=false;try{const r=await api(base()+'/sync',{method:'POST'});if(view.value!==target)return;syncId.value=r.sync_id;syncPrompt.value=r.prompt;saveSync();await copySync();}catch(e){syncMessage.value=message(e);}finally{syncBusy.value=false;}}

 function stop(){stopped=true;clearTimeout(timer);}
 return {syncVisible,copySync,loadError,retryLoad:()=>{failedDataset='';loadError.value='';void poll();},listRuns:()=>api(base()+'/runs'),runAction:(id:string,action:string,data:any={})=>api(base()+'/runs/'+encodeURIComponent(id)+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),syncPrompt,syncMessage,syncConfirmed,syncBusy,requestSync,failureReason,listFiles:()=>api(base()+'/datasets'),deleteFiles:(ids:string[])=>api(base()+'/datasets/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset_ids:ids})}),recoveryNeeded,uploading,percent,selectedName,uploadFailed,view,grant,ready,progress,dataset,init,enter,upload,stop};
}
