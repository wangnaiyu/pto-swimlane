import {loadMaterialColorUtilities} from './color-list';
import { parseSwimLaneInfo } from './process';
export function parseTopo(text: string) {
  const rows=text.trim().split(/\r?\n/).map(line=>line.split(',').map(v=>v.trim()));
  if (!text.trim()) return {};
  const h=rows.shift()!; const seq=h.indexOf('seqNo'),task=h.indexOf('taskId'),leaf=h.indexOf('leafIndex'),succ=h.indexOf('successors');
  if ([seq,task,leaf,succ].some(x=>x<0)) throw new Error('dyn_topo.txt 缺少必要表头');
  const result: Record<string,any>={};
  for (const r of rows) { if (!r.join('')) continue; const key=`${r[seq]}-${r[task]}`; if(result[key]) throw new Error(`重复任务 ${key}`); result[key]={leafIndex:r[leaf],successors:r.slice(succ).filter(Boolean).map(v=>`${r[seq]}-${v}`)}; }
  return result;
}
export async function parseFiles(traceText: string, topoText='') {
  await loadMaterialColorUtilities();
  const raw=JSON.parse(traceText);
  if(!Array.isArray(raw?.traceEvents) || !raw.traceEvents.length) throw new Error('需要非空 traceEvents 的 merged_swimlane.json');
  const data=await parseSwimLaneInfo(raw,{},parseTopo(topoText),{});
  if(data.errMsg) throw new Error(data.errMsg);
  data.lane2line=Object.fromEntries(data.lane2line); data.processes=Object.fromEntries(data.processes); data.processExpanded=Object.fromEntries(data.processExpanded);
  for(const process of Object.values(data.processes) as any[]) process.threads=Object.fromEntries(process.threads);
  data.pmuValid=false; data.counterEvents=[];
  return data;
}
