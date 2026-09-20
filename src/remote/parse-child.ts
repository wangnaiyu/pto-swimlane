import {writeFile,realpath} from 'node:fs/promises';
import {serialize} from 'node:v8';
import {Store,ToolError} from '../mcp/store';
import path from 'node:path';
// Parent supplies only its private upload directory. Never receives client local paths.
const [dir,hasTopo,maxBytes,maxSnapshotBytes]=process.argv.slice(2);
try{const store=new Store([await realpath(dir)],Number(maxBytes),1);const d=await store.load(path.join(dir,'merged_swimlane.json'),hasTopo==='yes'?path.join(dir,'dyn_topo.txt'):undefined);const binary=serialize(d);if(Number(maxSnapshotBytes)>0&&binary.length>Number(maxSnapshotBytes))throw new ToolError('SNAPSHOT_LIMIT','解析结果超过资源限额');await writeFile(path.join(dir,'parsed.bin'),binary,{flag:'wx',mode:0o600});process.send?.({ok:true,id:d.id});}
catch(e){process.send?.({ok:false,code:e instanceof ToolError?e.code:'PARSE_ERROR'});process.exitCode=1;}
