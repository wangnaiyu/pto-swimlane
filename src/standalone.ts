import { ref } from 'vue';
export const current=ref<any>(null);
export const notice=ref('');
export const config={ZoomInShortcut:'w',ZoomOutShortcut:'s',leftmoveShortcut:'a',rightmoveShortcut:'d',connectionLevel:1,showPerformancePanel:false,showIsMixMode:false,kernelTextRending:['taskName','taskLabel'],aicpuColorRending:'name',perfColorReding:'perfName',kernelColorRending:'subGraph',hashOrderRending:'cubeMergeHashOrder'};
const refs=new Map();
function reference(key:string){if(!refs.has(key))refs.set(key,ref());return refs.get(key);}
export const server=new Proxy({
 getOtherData:async()=>({configuration:config,title:current.value.title.replace(/\.json$/,''),swimPath:current.value.title,isPerfSwim:false,isMsProf:false}),
 getData:async()=>new ReadableStream({start(c){c.enqueue({type:'first',data:current.value.data});c.close();}}),
 getShortCutKeyCfg:async()=>({configration:config}),
 showMessage:async(m:any)=>{notice.value=m?.paramObj?.text ?? '操作提示';},
 checkSys:async()=>{reference('CheckSysResult').value={sustem:'browser'};},
 getPerformanceInfo:async()=>({}),
 saveRendingMode:async()=>{}, changeUserCfgConnection:async()=>{},changeUserCfgPerformance:async()=>{},changeUserCfgIsMixMode:async()=>{},
}, {get(target:any,key:string){if(key in target)return target[key];if(/Result$|^return|^noSwim|Warn$|Error$|^SaveDirPath$/.test(key)){if(!refs.has(key))refs.set(key,ref());return refs.get(key);}return async()=>{notice.value='第一阶段仅提供泳道查看，此功能尚未接入。';};}});
