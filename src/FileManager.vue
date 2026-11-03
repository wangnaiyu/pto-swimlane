<script setup lang="ts">
import {ref,computed} from 'vue';
const props=defineProps<{remote:any}>();
const dialog=ref<HTMLDialogElement>(),items=ref<any[]>([]),selected=ref<string[]>([]),loading=ref(false),deleting=ref(false),confirming=ref(false),error=ref(''),result=ref('');
const removable=computed(()=>items.value.filter(d=>!d.active&&!d.selected));
const summary=computed(()=>selected.value.map(id=>items.value.find(d=>d.id===id)?.filename??id).join('、'));
const explain=(e:any)=>({SESSION_EXPIRED:'浏览器授权已过期，请让 Agent 重新打开分析入口。',ACTIVE_DATASET:'不能删除当前使用的数据集，请刷新列表后重试。',NOT_FOUND:'部分文件已被删除，请刷新列表。'} as any)[e?.message]??'操作失败，请重试。';
async function load(){loading.value=true;error.value='';try{items.value=(await props.remote.listFiles()).items;selected.value=[];confirming.value=false;}catch(e){error.value=explain(e);}finally{loading.value=false;}}
async function open(){dialog.value?.showModal();result.value='';await load();}
async function remove(){deleting.value=true;error.value='';const ids=[...selected.value];try{const r=await props.remote.deleteFiles(ids);await load();result.value=`已删除 ${r.deleted.length} 份数据集`;if(r.failed.length)error.value=`${r.failed.length} 份删除失败，请重试。`;}catch(e){error.value=explain(e);confirming.value=false;}finally{deleting.value=false;}}
function close(){if(!deleting.value)dialog.value?.close();}
</script>
<template>
<button class="pto-file-button manager-trigger" :disabled="!remote.ready.value" @click="open">管理文件</button>
<Teleport to="body"><dialog ref="dialog" class="file-manager" aria-labelledby="file-manager-title" @cancel="deleting && $event.preventDefault()">
<header><h2 id="file-manager-title">管理文件</h2><button class="pto-file-button manager-trigger" :disabled="deleting" @click="close">关闭</button></header>
<p>当前会话共 {{items.length}} 份数据集。当前使用的版本已保护，可多选删除旧版本以释放配额。</p>
<p v-if="error" role="alert">{{error}}</p><p v-if="result" role="status">{{result}}</p>
<p v-if="loading" role="status">正在加载文件列表…</p>
<template v-else><label class="select-all"><input type="checkbox" :disabled="deleting || !removable.length" :checked="!!removable.length && selected.length===removable.length" @change="selected=($event.target as HTMLInputElement).checked ? removable.map(d=>d.id) : [];confirming=false" /> 全选可删除版本</label>
<div class="file-list"><label v-for="d in items" :key="d.id" class="file-row"><input v-model="selected" type="checkbox" :value="d.id" :disabled="d.active || d.selected || deleting" :aria-label="`${d.filename} ${d.id}`" @change="confirming=false"/><span><strong>{{d.filename}}</strong><small>{{new Date(d.created).toLocaleString('zh-CN')}} · {{d.id}}</small></span><b v-if="d.active || d.selected" class="current-badge">当前使用</b></label><p v-if="!items.length">当前会话暂无数据集。</p></div>
</template>
<footer><template v-if="confirming"><p>确认永久删除所选 {{selected.length}} 份旧数据集？<br />{{summary}}</p><button class="pto-file-button" :disabled="deleting" @click="confirming=false">取消</button><button class="pto-file-button" :disabled="deleting" @click="remove">{{deleting?'正在删除…':'确认删除'}}</button></template><template v-else><span>已选择 {{selected.length}} 份</span><button class="pto-file-button" :disabled="loading || deleting" @click="load">刷新列表</button><button class="pto-file-button" :disabled="!selected.length || loading || deleting" @click="confirming=true">删除所选（{{selected.length}}）</button></template></footer>
</dialog></Teleport>
</template>
<style>
/* Lightweight PTO surface-1, radius-xl, secondary buttons and 14px body adaptation. */
.pto-file-button.manager-trigger{width:auto;flex:0 0 auto;padding:0 12px}.file-manager{margin:auto;inset:0;box-sizing:border-box;width:min(760px,calc(100vw - 32px));max-height:85vh;padding:24px;border:1px solid rgba(255,255,255,.06);border-radius:16px;background:#161616;color:rgba(255,255,255,.9);box-shadow:0 24px 80px rgba(0,0,0,.5);font:14px/1.5 Arial,sans-serif}.file-manager::backdrop{background:rgba(0,0,0,.6)}.file-manager header,.file-manager footer{display:flex;align-items:center;gap:12px}.file-manager header{justify-content:space-between}.file-manager h2{margin:0;font-size:18px;font-weight:600}.file-manager footer{justify-content:flex-end;flex-wrap:wrap;margin-top:20px}.file-manager footer p{width:100%;overflow-wrap:anywhere}.file-manager .file-list{max-height:40vh;overflow:auto;margin-top:12px}.file-row{display:flex;align-items:center;gap:12px;padding:14px 8px;border-bottom:1px solid rgba(255,255,255,.06)}.file-row span{flex:1;min-width:0;overflow-wrap:anywhere}.file-row small{display:block;font-size:12px;color:rgba(255,255,255,.6)}.file-row strong{font-weight:500}.current-badge{font-size:12px;font-weight:500;padding:3px 8px;border-radius:6px;background:#262626;white-space:nowrap}.file-manager input[type=checkbox]{width:16px;height:16px;accent-color:#a49cf5}.file-manager [role=alert]{color:#ffb4b4}.select-all{display:flex;align-items:center;gap:12px}
</style>
