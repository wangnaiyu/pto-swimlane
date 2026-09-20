import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseFiles,parseTopo} from '../src/parser/index';
const root=process.env.PTO_TESTDATA_ROOT;
for(const [id,count,edges] of [['2M',393,910],['23M',3081,7182]] as const){
 test(`${id}: original task identities, times and topology survive extraction`,{skip:!root},async()=>{
  const dir=path.join(root!,'mix/end2end',id);const trace=await readFile(path.join(dir,'merged_swimlane.json'),'utf8'),topo=await readFile(path.join(dir,'dyn_topo.txt'),'utf8');
  const raw=JSON.parse(trace); const result=await parseFiles(trace,topo);
  const events:any[]=Object.values(result.processes).flatMap((p:any)=>Object.values(p.threads).flatMap((t:any)=>t.events));
  const tasks=events.filter(e=>e.args?.taskId!==undefined);const map=new Map(events.map(e=>[e.id,e]));
  assert.equal(tasks.length,count);assert.equal(new Set(tasks.map(e=>`${e.args.seqNo}-${e.args.taskId}`)).size,count);
  const tsMin=Math.min(...raw.traceEvents.filter((e:any)=>typeof e.ts==='number').map((e:any)=>e.ts));
  const originals=new Map(raw.traceEvents.filter((e:any)=>e.ph==='X'&&e.args?.taskId!==undefined).map((e:any)=>[`${e.args.seqNo}-${e.args.taskId}`,e]));
  const graph=parseTopo(topo);let actualEdges=0;
  for(const e of tasks){const key=`${e.args.seqNo}-${e.args.taskId}`,source:any=originals.get(key);assert.equal(e.startTime,Math.round(source.ts*1000-tsMin*1000));assert.ok(Math.abs(e.duration-source.dur*1000)<1.01);
   const succ=e.dependencies.successors.map((v:string)=>{assert.ok(map.has(v));const t=map.get(v);return `${t.args.seqNo}-${t.args.taskId}`;});assert.deepEqual(succ.sort(),graph[key].successors.slice().sort());actualEdges+=succ.length;
  }
  assert.equal(actualEdges,edges);
  const missingTopo=await parseFiles(trace);assert.ok(Object.keys(missingTopo.processes).length===2);
 });
}
test('invalid inputs fail explicitly',async()=>{
 await assert.rejects(parseFiles('{'),SyntaxError);await assert.rejects(parseFiles('{"traceEvents":[]}'));
 assert.throws(()=>parseTopo('a,b\n1,2'));assert.throws(()=>parseTopo('seqNo,taskId,leafIndex,successors\n0,1,2,\n0,1,2,'));
});
