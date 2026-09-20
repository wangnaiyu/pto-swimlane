/** Explicit reverse-proxy runner; configuration has no baked-in trial capacity claims. */
import {readFile,lstat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {RemoteFiles} from './files';import {startRemoteLocal} from './http';import {Credentials} from './credentials';
process.umask(0o077);
const filename=process.argv[2];if(!filename)throw Error('Pass a private deployment configuration JSON path');
const info=await lstat(filename);if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077))throw Error('Configuration must be a private regular file');
const c=JSON.parse(await readFile(filename,'utf8'));
if(!Number.isInteger(c.requestTimeoutMs)||c.requestTimeoutMs<60000||c.requestTimeoutMs>900000)throw Error('Explicit bounded requestTimeoutMs required');
if(!path.isAbsolute(c.storage??'')||!Number.isInteger(c.port)||c.port<1024||c.port>65535||!c.publicOrigin||!c.basePath)throw Error('Explicit storage, port, HTTPS publicOrigin and basePath required');
for(const [name,value] of Object.entries({...c.filePolicy,...c.statePolicy}))if(!Number.isSafeInteger(value)||(name==='maxViews'?Number(value)<0:Number(value)<=0))throw Error('Invalid policy field '+name);
for(const key of ['maxBytes','maxConcurrent','parseTimeoutMs','parseMemoryMiB','maxStorageBytes','maxSnapshotBytes','smallFileBytes','maxQueued','maxCacheDatasets'])if(!c.filePolicy?.[key])throw Error('Missing filePolicy '+key);
for(const key of ['maxDatasets','retentionMs','uploadMs'])if(!c.statePolicy?.[key])throw Error('Missing statePolicy '+key);
if(!Number.isSafeInteger(c.statePolicy?.maxViews)||c.statePolicy.maxViews<0)throw Error('Invalid statePolicy maxViews (0 means unlimited)');
const files=await new RemoteFiles(c.storage,c.filePolicy,c.statePolicy).init();const auth=new Credentials(files.state.db);
let server;try{server=await startRemoteLocal(files,fileURLToPath(new URL('../../dist',import.meta.url)),h=>auth.verify(h),{basePath:c.basePath,publicOrigin:c.publicOrigin,port:c.port,requestTimeoutMs:c.requestTimeoutMs,ownerActive:o=>auth.active(o)});}catch(e){await files.dispose();throw e;}
console.log('PTO Swimlane proxy backend listening on '+server.listenOrigin+'; external base '+c.publicOrigin+c.basePath);
let stopping=false;async function stop(){if(stopping)return;stopping=true;await server!.close();await files.dispose();}
process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
