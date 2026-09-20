// Read-only, one sample per fresh process. Local performance observations, not server capacity proof.
import {Store} from '../src/mcp/store.ts';
import {realpath} from 'node:fs/promises';
import {serialize} from 'node:v8';
import path from 'node:path';
const sample=process.argv[2];
if(!process.env.PTO_TESTDATA_ROOT||!['2M','23M'].includes(sample))throw Error('Set PTO_TESTDATA_ROOT and pass 2M or 23M');
const root=await realpath(path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end',sample));
const store=new Store([root],128*1048576,1),start=performance.now();
const d=await store.load(path.join(root,'merged_swimlane.json'),path.join(root,'dyn_topo.txt'));
const serializedBytes=serialize(d).length;
console.log(JSON.stringify({sample,tasks:d.tasks.length,elapsed_ms:Math.round(performance.now()-start),serialized_bytes:serializedBytes,peak_rss_kib:process.resourceUsage().maxRSS,heap_used_bytes:process.memoryUsage().heapUsed,node:process.versions.node,platform:process.platform}));
