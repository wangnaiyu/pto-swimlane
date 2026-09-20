import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import path from 'node:path';
export async function setup(action,args){
 const project=fileURLToPath(new URL('..',import.meta.url));
 const {values}=parseArgs({args,options:{'allow-root':{type:'string',multiple:true}}});
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<22||(major===22&&minor<12))throw Error('需要 Node.js 22.12 或更新版本');
 await readFile(path.join(project,'dist/index.html'));
 await import('tsx/esm/api');await import('@modelcontextprotocol/sdk/client/index.js');
 const roots=await Promise.all((values['allow-root']??[]).map(async r=>{const resolved=await realpath(r);if(!(await stat(resolved)).isDirectory())throw Error('--allow-root 必须是目录');return resolved;}));
 if(action==='config'&&!roots.length)throw Error('请通过 --allow-root 明确选择允许读取的目录');
 if(action==='doctor'){console.log(JSON.stringify({status:'ok',node:process.versions.node,entry:path.join(project,'bin/pto-swimlane.mjs'),viewer:'present',allowedRoots:roots},null,2));return;}
 console.log(JSON.stringify({mcpServers:{'pto-swimlane':{type:'stdio',command:process.execPath,args:[path.join(project,'bin/pto-swimlane.mjs'),...roots.flatMap(r=>['--allow-root',r])]}}},null,2));
}
