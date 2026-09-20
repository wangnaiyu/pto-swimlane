/** Explicit localhost trial harness. Generates temporary test identities; no public mode. */
import {parseArgs} from 'node:util';import path from 'node:path';import {mkdir,writeFile,rm} from 'node:fs/promises';import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {RemoteFiles} from './files';import {startRemoteLocal} from './http';
const {values}=parseArgs({options:{storage:{type:'string'},'connection-dir':{type:'string'}}});
if(!values.storage||!values['connection-dir'])throw Error('Use --storage <private directory> --connection-dir <new private directory>');
const connectionDir=path.resolve(values['connection-dir']);await mkdir(path.dirname(connectionDir),{recursive:true,mode:0o700});await mkdir(connectionDir,{mode:0o700}); // refuse overwrite
const credentials=['test-a','test-b'].map(owner=>({owner,token:randomBytes(32).toString('base64url')}));const digest=(s:string)=>createHash('sha256').update(s).digest();const hashes=credentials.map(c=>({owner:c.owner,hash:digest(c.token)})),expires=Date.now()+3600000;
const files=await new RemoteFiles(path.resolve(values.storage)).init();const server=await startRemoteLocal(files,fileURLToPath(new URL('../../dist',import.meta.url)),header=>{if(Date.now()>=expires||!header.startsWith('Bearer '))return null;const h=digest(header.slice(7));return hashes.find(c=>timingSafeEqual(c.hash,h))?.owner??null;});
await writeFile(path.join(connectionDir,'connection.json'),JSON.stringify({url:server.origin+'/mcp',expires_at:expires,credentials},null,2),{flag:'wx',mode:0o600});
await writeFile(path.join(connectionDir,'codex-config.toml'),`[mcp_servers.pto_remote_local]\nurl = ${JSON.stringify(server.origin+'/mcp')}\nbearer_token_env_var = "PTO_REMOTE_LOCAL_TOKEN"\n`,{flag:'wx',mode:0o600});
console.log(`Local-only Batch D candidate listening at ${server.origin}. Temporary connection files written to the requested private directory; expire in one hour. Never commit or paste credentials.`);
let stopping=false;async function stop(){if(stopping)return;stopping=true;await server.close();await files.dispose();await rm(path.join(connectionDir,'connection.json'),{force:true});}
process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
