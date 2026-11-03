<script setup lang="ts">
import {ref} from 'vue';
const props=defineProps<{remote:any}>();
const dialog=ref<HTMLDialogElement>(),items=ref<any[]>([]),loading=ref(false),working=ref(false),error=ref(''),selected=ref<any>(null),editing=ref(''),name=ref('');
const time=(n:number)=>new Date(n).toLocaleString('zh-CN');
const state=(r:any)=>r.busy?'处理中':({active:'可用',inactive:'已停用',expired:'已过期',deleting:'正在删除'} as any)[r.state]??r.state;
const protectedRun=(r:any)=>r.id===props.remote.view.value||r.busy;
const message=(e:any)=>({CURRENT_VIEW:'当前分析受保护，请先切换到其他分析。',VIEW_BUSY:'该分析正在上传、排队或解析，请稍后重试。',VIEW_EXPIRED:'该分析已过期，将自动删除。',NOT_FOUND:'分析不存在、已停用或已被删除，请刷新列表。',SESSION_EXPIRED:'浏览器授权已过期，请让 Agent 重新打开分析入口。'} as any)[e?.message]??'操作失败，请重试。';
async function load(){loading.value=true;error.value='';try{items.value=(await props.remote.listRuns()).items;}catch(e){error.value=message(e);}finally{loading.value=false;}}
async function open(){selected.value=null;editing.value='';dialog.value?.showModal();await load();}
async function act(r:any,action:string,data:any={}){working.value=true;error.value='';try{const result=await props.remote.runAction(r.id,action,data);if(action==='open'){dialog.value?.close();location.hash=new URL(result.upload_url).hash;return;}selected.value=null;editing.value='';await load();}catch(e){error.value=message(e);}finally{working.value=false;}}
function close(){if(!working.value)dialog.value?.close();}
</script>
<template>
<button class="pto-file-button manager-trigger" :disabled="!remote.ready.value || remote.uploading.value" @click="open">{{remote.dataset.value ? '运行记录' : '使用历史文件'}}</button>
<Teleport to="body"><dialog ref="dialog" class="file-manager run-manager" aria-labelledby="run-manager-title" @cancel="working && $event.preventDefault()">
<header><h2 id="run-manager-title">运行记录</h2><button class="pto-file-button manager-trigger" :disabled="working" @click="close">关闭</button></header>
<p>分析会话创建后保留 7 天，持续使用、停用不会自动延长到期时间，到期后将自动删除。</p>
<p v-if="error" role="alert">{{error}}</p><p v-if="loading" role="status">正在加载运行记录…</p>
<div v-else class="run-list">
<article v-for="r in items" :key="r.id" class="run-row" :data-run-id="r.id">
<div class="run-title"><strong>{{r.name}}</strong><b v-if="r.id===remote.view.value" class="current-badge">当前分析</b><b class="current-badge">{{state(r)}}</b></div>
<p v-if="!r.datasets.length">尚未上传文件</p>
<p v-for="d in r.datasets" :key="d.id"><span>{{d.filename}}</span> <button class="pto-file-button manager-trigger" :disabled="working || r.state!=='active' || remote.uploading.value" @click="act(r,'open',{dataset_id:d.id})">使用此文件</button><small> · {{time(d.created)}}</small></p>
<small>{{r.datasets.length}} 份数据集 · {{(r.bytes/1048576).toFixed(1)}} MiB · 创建 {{time(r.created)}} · 到期 {{time(r.expires_at)}}</small>
<div v-if="editing===r.id" class="run-actions"><input v-model="name" aria-label="分析名称" maxlength="100" /><button class="pto-file-button manager-trigger" :disabled="working||!name.trim()" @click="act(r,'rename',{name})">保存名称</button><button class="pto-file-button manager-trigger" :disabled="working" @click="editing=''">取消</button></div>
<div v-else class="run-actions">
<button class="pto-file-button manager-trigger" :disabled="working||r.state!=='active'||r.id===remote.view.value" @click="act(r,'open')">打开查看</button>
<button class="pto-file-button manager-trigger" :disabled="working||!['active','inactive'].includes(r.state)" @click="editing=r.id;name=r.name">重命名</button>
<button class="pto-file-button manager-trigger" :disabled="working||protectedRun(r)||!['active','inactive'].includes(r.state)" @click="act(r,r.state==='inactive'?'active':'inactive')">{{r.state==='inactive'?'恢复':'停用'}}</button>
<button class="pto-file-button manager-trigger" :disabled="working||protectedRun(r)||r.state==='deleting'" @click="selected=r">删除分析</button>
</div>
</article><p v-if="!items.length">暂无运行记录。</p>
</div>
<footer v-if="selected"><p>确认永久删除“{{selected.name}}”及其 {{selected.datasets.length}} 份数据集？删除后无法恢复。</p><button class="pto-file-button" :disabled="working" @click="selected=null">取消</button><button class="pto-file-button" :disabled="working" @click="act(selected,'delete')">{{working?'正在删除…':'确认删除分析'}}</button></footer>
<footer v-else><button class="pto-file-button" :disabled="loading||working" @click="load">刷新列表</button></footer>
</dialog></Teleport>
</template>
<style>
.run-manager{width:min(900px,calc(100vw - 32px))}.run-list{max-height:55vh;overflow:auto;margin-top:12px}.run-row{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06)}.run-title,.run-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.run-title strong{flex:1;overflow-wrap:anywhere;font-weight:500}.run-row p{margin:8px 0;overflow-wrap:anywhere}.run-row small{font-size:12px;color:rgba(255,255,255,.6)}.run-actions{margin-top:12px}.run-actions input{background:#262626;color:inherit;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:6px 8px;font-size:14px;min-width:200px}
</style>
