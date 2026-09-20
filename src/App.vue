<script setup lang="ts">
import {ref,onMounted,onUnmounted,defineAsyncComponent,getCurrentInstance,h,computed} from 'vue';
import {remoteClient} from './remote-client';
import FileManager from './FileManager.vue';
import RunManager from './RunManager.vue';
const app=getCurrentInstance()!.appContext.app;
let graphPromise:Promise<any>|undefined;
const loadGraph=()=>graphPromise??=(import('./graph-entry').then(m=>m.loadGraph(app)).catch(e=>{graphPromise=undefined;throw e;}));
const SwimGraph=defineAsyncComponent({loader:loadGraph,delay:0,loadingComponent:{render:()=>h('p',{role:'status',style:'padding:24px'},'正在加载泳道图…')},errorComponent:{render:()=>h('p',{role:'alert',style:'padding:24px'},'泳道图加载失败，请刷新重试。')}});
import {useTheme} from './theme/use-theme';
import {current,notice} from './standalone';
useTheme();
const recoveryCopied=ref(false);
const recoveryPrompt=computed(()=>`请保持 view_session_id=${remote.view.value}，重新生成并在内置浏览器打开泳道入口，恢复已有数据，不重新上传。`);
async function copyRecovery(){try{await navigator.clipboard.writeText(recoveryPrompt.value);recoveryCopied.value=true;}catch{recoveryCopied.value=false;}}
const toolbar=ref<HTMLDivElement>();let toolbarObserver:ResizeObserver|undefined;
const fileInput=ref<HTMLInputElement>(),localName=ref(''),localFailed=ref(false);
const busy=ref(false), version=ref(0), elapsed=ref(0), sourceLabel=ref('仅在浏览器中打开');
const mcpMode=ref(new URLSearchParams(location.hash.slice(1)).has('dataset'));
let requestVersion=0;
const remoteMode=ref(new URLSearchParams(location.hash.slice(1)).has('view'));
const remote=remoteClient({prepare:()=>{void loadGraph().catch(()=>{});},generation:()=>requestVersion,begin:()=>{busy.value=true;return ++requestVersion;},show:s=>{sourceLabel.value='已连接 agent';current.value={data:s.data,title:s.title};elapsed.value=s.parseMs;version.value++;},clear:()=>{current.value=null;},busy:b=>busy.value=b,notice:s=>notice.value=s});

const fileLabel=computed(()=>remoteMode.value?(remote.uploadFailed.value?'上传失败':remote.selectedName.value||current.value?.title||'未选择文件'):(localFailed.value?'上传失败':localName.value||current.value?.title||'未选择文件'));
function beginLoad(){const request=++requestVersion;busy.value=true;notice.value='';current.value=null;return request;}
async function loadDataset(){
 if(remoteMode.value){remote.init();return;}
 const request=beginLoad();
 mcpMode.value=new URLSearchParams(location.hash.slice(1)).has('dataset');
 if(!mcpMode.value){busy.value=false;return;}
 const params=new URLSearchParams(location.hash.slice(1));busy.value=true;notice.value='';current.value=null;
 try{const response=await fetch(`/api/datasets/${encodeURIComponent(params.get('dataset')??'')}`,{headers:{Authorization:`Bearer ${params.get('token')??''}`}});
 if(!response.ok)throw Error(await response.text());const snapshot=await response.json();if(request!==requestVersion)return;
 sourceLabel.value='已连接 agent';current.value={data:snapshot.data,title:snapshot.title};elapsed.value=snapshot.parseMs;version.value++;
 }catch(error){if(request===requestVersion)notice.value=String(error);}finally{if(request===requestVersion)busy.value=false;}
}
onMounted(()=>{toolbarObserver=new ResizeObserver(()=>{document.documentElement.style.setProperty('--upload-bar-height',`${toolbar.value?.offsetHeight??40}px`);});if(toolbar.value)toolbarObserver.observe(toolbar.value);if(remoteMode.value)remote.init();else void loadDataset();window.addEventListener('hashchange',loadDataset);});
onUnmounted(()=>{toolbarObserver?.disconnect();remote.stop();requestVersion++;window.removeEventListener('hashchange',loadDataset);});
async function open(trace:string,topo:string,title:string,request:number){
 if(request!==requestVersion)return;
 const worker=new Worker(new URL('./parser/worker.ts',import.meta.url),{type:'module'});
 try { const result:any=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);worker.onerror=e=>reject(Error(e.message));worker.postMessage({trace,topo});});
 if(request!==requestVersion)return;
 sourceLabel.value='仅在浏览器中打开';current.value={data:result.result,title};elapsed.value=Math.round(result.parseMs);version.value++;
 }catch(e){if(request===requestVersion)notice.value=String(e);}finally{worker.terminate();if(request===requestVersion)busy.value=false;}
}
async function local(e:Event){
 const files=Array.from((e.target as HTMLInputElement).files??[]);if(!files.length)return;localName.value=files.map(f=>f.name).join('、');localFailed.value=false;if(remoteMode.value){(e.target as HTMLInputElement).value='';await remote.upload(files);return;}const trace=files.find(f=>f.name.endsWith('.json'));const topo=files.find(f=>f.name==='dyn_topo.txt');
 if(!trace){notice.value='请选择泳道 JSON，可同时选择 dyn_topo.txt';return;}
 const request=beginLoad();
 try {await open(await trace.text(),topo?await topo.text():'',trace.name,request);}catch(e){if(request===requestVersion){notice.value=String(e);busy.value=false;}}
}
async function sample(id:string){const request=beginLoad();try{const r=await fetch(`/__sample/${id}`);if(!r.ok)throw Error(await r.text());const d=await r.json();await open(d.trace,d.topo,`${id} / merged_swimlane.json`,request);}catch(e){if(request===requestVersion){notice.value=String(e);busy.value=false;}}}
</script>
<template>
 <div ref="toolbar" class="local-bar" :data-version="version" :data-dataset="remote.dataset.value">
  <button v-if="remoteMode && remote.grant.value" @click="remote.enter">进入上传页面</button>
  <input ref="fileInput" class="file-input" aria-label="打开本地泳道和拓扑文件" type="file" accept=".json,.txt" multiple :disabled="remoteMode ? !remote.ready.value || remote.uploading.value : busy" @change="local" />
  <RunManager v-if="remoteMode" :remote="remote" />
  <FileManager v-if="remoteMode" :remote="remote" />
  <button class="pto-file-button upload-button" :disabled="remoteMode ? !remote.ready.value || remote.uploading.value : busy" @click="fileInput?.click()">{{remoteMode && remote.uploading.value ? `正在上传... ${remote.percent.value}%` : '选择文件'}}</button>
  <span v-if="!busy && !(remoteMode && (remote.uploadFailed.value || !remote.ready.value || remote.loadError.value))" class="file-status" :title="fileLabel">{{fileLabel}}</span>
  <span v-if="current && !busy && !(remoteMode && remote.uploadFailed.value)" class="parse-time">解析 {{elapsed}} ms</span>
  <button v-if="!mcpMode && !remoteMode" :disabled="busy" @click="sample('2M')">2M 样例</button><button v-if="!mcpMode && !remoteMode" :disabled="busy" @click="sample('23M')">23M 样例</button>
  <span v-if="remoteMode && busy" class="upload-status" role="status">{{remote.uploading.value ? '等待上传...' : remote.progress.value}}</span><span v-else-if="busy" role="status">正在本地解析…</span>
  <span v-if="remoteMode && remote.loadError.value" role="alert">{{remote.loadError.value}} <button class="pto-file-button sync-button" @click="remote.retryLoad">重试载入</button></span>
  <span v-if="remoteMode && remote.uploadFailed.value" class="failure-explanation" role="alert"><strong>上传失败</strong> · {{remote.failureReason.value}}</span>
  <span v-else-if="remoteMode && notice" role="alert" class="remote-notice" :title="notice">{{notice}}</span>
  <span v-if="remoteMode" class="agent-status" :title="remote.syncConfirmed.value ? 'Agent 已确认此分析；不代表实时在线' : '请在当前对话完成同步确认'">{{remote.syncConfirmed.value ? '已连接 Agent' : '未连接 Agent'}} <button class="pto-file-button sync-button" :disabled="!remote.ready.value || !remote.dataset.value || remote.syncBusy.value" @click="remote.requestSync">重新同步</button></span>
  <span v-else-if="current" class="agent-status" tabindex="0" :title="remote.dataset.value ? `当前数据集 ID：${remote.dataset.value}` : sourceLabel">{{sourceLabel}}</span>
 </div>
 <div v-if="remoteMode && remote.syncVisible.value" class="sync-instructions" role="region" aria-label="同步 Agent" @keydown.esc="remote.syncVisible.value=false"><div class="sync-header"><p role="status">{{remote.syncMessage.value}}</p><button v-if="remote.syncPrompt.value" class="pto-file-button sync-button" @click="remote.copySync">复制口令</button><button class="pto-file-button sync-button" @click="remote.syncVisible.value=false">关闭同步提示</button></div><textarea v-if="remote.syncPrompt.value" aria-label="同步口令" readonly :value="remote.syncPrompt.value" /></div>
 <p v-if="notice && !remoteMode" role="alert" class="notice">{{notice}}</p>
 <div v-if="remoteMode && remote.recoveryNeeded.value" class="empty" role="status"><p>返回原对话，点击“重新打开泳道图”，或复制以下口令：</p><p>{{recoveryPrompt}}</p><button class="pto-file-button" @click="copyRecovery">{{recoveryCopied ? '已复制' : '复制恢复口令'}}</button></div>
 <SwimGraph v-if="current" :key="version" />
 <div v-else-if="!busy && !remote.recoveryNeeded.value" class="empty">选择 merged_swimlane.json，可同时选择同组 dyn_topo.txt。{{remoteMode ? "文件直接上传到服务器解析；随后在原对话继续提问即可。" : "文件在本机浏览器解析。"}}</div>
</template>
<style>
body{margin:0;font-family:Arial,sans-serif;font-size:13px;color:var(--devui-text);background:var(--devui-base-bg)} .local-bar{min-height:40px;height:auto;display:flex;align-items:center;gap:12px;padding:0 12px;background:var(--devui-base-bg);color:var(--devui-text);font:12px sans-serif;box-sizing:border-box} .local-bar input{max-width:210px} .local-bar label{flex-shrink:0} .file-status,.remote-notice{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .file-status{flex:0 1 auto;max-width:40%}.parse-time,.agent-status{flex-shrink:0}.agent-status{margin-left:auto}.upload-status{white-space:nowrap} .remote-notice{max-width:45%} .notice{position:fixed;bottom:8px;left:16px;z-index:9999;background:var(--devui-base-bg);padding:8px;color:var(--devui-text)} .empty{padding:40px;color:var(--devui-text);font:14px sans-serif} .swim-global-container{height:calc(100vh - var(--upload-bar-height,40px))!important}
/* PTO secondary entry button: components.css button-sm, radius-lg, disabled opacity.
   Minimal local adaptation explicitly requested; no design-system bundle or shell import. */
.file-input{display:none}
.pto-file-button{width:164px;flex:0 0 164px;height:30px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0 8px;border-radius:12px;background:color-mix(in srgb,#1c1c1c 92%,white 3%);border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 2px 8px rgba(0,0,0,.16);color:rgba(255,255,255,.9);font:500 12px/1 Arial,sans-serif;white-space:nowrap;cursor:pointer;transition:background .15s,opacity .15s}
.local-bar > .manager-trigger{margin-right:-4px}
.sync-instructions{padding:8px 16px;font-size:14px;line-height:1.5}.sync-instructions textarea{width:100%;box-sizing:border-box;min-height:64px;background:#161616;color:inherit;font-size:12px}.pto-file-button.sync-button{width:auto;flex:0 0 auto;margin-left:8px}
.pto-file-button:hover{background:#262626}.pto-file-button:active{background:color-mix(in srgb,#262626 84%,black)}.pto-file-button:focus-visible{outline:2px solid #8c9eff;outline-offset:2px}.pto-file-button:disabled{opacity:.42;cursor:not-allowed}
.failure-explanation{flex:1;min-width:100px;white-space:normal;line-height:1.5;padding:8px 0}.failure-explanation strong{white-space:nowrap}
</style>

<style>
.pto-file-button.upload-button{width:144px;flex-basis:144px}
</style>

<style>
.sync-instructions{position:fixed;top:var(--upload-bar-height,40px);left:12px;right:12px;z-index:10000;background:var(--devui-base-bg);border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 8px 24px #0006}.sync-header{display:flex;align-items:center;gap:8px}.sync-header p{flex:1}.sync-instructions textarea{max-height:180px}
</style>
