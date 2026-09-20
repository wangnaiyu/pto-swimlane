import {readdir,lstat} from 'node:fs/promises';import path from 'node:path';import {fail} from '../mcp/store';
/** Conservative raw/snapshot disk budget. In-flight reservations are counted in addition to existing bytes. */
export class StorageBudget {
 private reserved=new Map<string,number>();private serial:Promise<void>=Promise.resolve();
 constructor(private root:string,private limit?:number){}
 private async bytes(dir:string):Promise<number>{let total=0;for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),s=await lstat(file);if(s.isSymbolicLink())fail('INVALID_PATH','存储目录包含符号链接');total+=s.isDirectory()?await this.bytes(file):s.size;}return total;}
 async reserve(key:string,bytes:number){if(!this.limit)return;const previous=this.serial;let release!:()=>void;this.serial=new Promise(r=>release=r);await previous;try{const used=await this.bytes(path.join(this.root,'uploads'))+await this.bytes(path.join(this.root,'datasets'));const pending=[...this.reserved.values()].reduce((a,b)=>a+b,0);if(used+pending+bytes>this.limit)fail('STORAGE_LIMIT','存储额度不足，请删除不需要的会话后重试');this.reserved.set(key,bytes);}finally{release();}}
 release(key:string){this.reserved.delete(key);}
}
