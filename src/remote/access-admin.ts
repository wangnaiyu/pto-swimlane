/** Run via the server's pto-swimlane-access wrapper. Secrets only on an interactive terminal or a new private file. */
import {parseArgs} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {lstat,open} from 'node:fs/promises';
import path from 'node:path';
import {Credentials} from './credentials';
import {AccessAccounts} from './access-accounts';
process.umask(0o077);
async function main(){
 const {values,positionals}=parseArgs({allowPositionals:true,options:{database:{type:'string',default:'/data/state.db'},name:{type:'string'},output:{type:'string'}}});
 const [action,id]=positionals;
 if(!['create','list','disable','revoke','enable','reset'].includes(action)||positionals.length>(['create','list'].includes(action)?1:2))throw Error('用法：create --name "姓名" | list | disable 用户ID | enable 用户ID | reset 用户ID');
 if(action==='create'&&!values.name)throw Error('create 需要 --name "姓名"');
 if(!['create','list'].includes(action)&&!id)throw Error('请提供用户 ID（list 可查看）');
 const secret=['create','reset'].includes(action);
 if(secret&&!values.output&&!process.stdout.isTTY)throw Error('Token 仅在交互终端显示；自动化请指定 --output 新的私密文件');
 const file=await lstat(values.database!);if(!file.isFile()||file.isSymbolicLink()||(file.mode&0o077))throw Error('数据库必须是现有的私密普通文件');
 let output:Awaited<ReturnType<typeof open>>|undefined;
 if(secret&&values.output){const parent=await lstat(path.dirname(path.resolve(values.output)));if(!parent.isDirectory()||parent.isSymbolicLink()||(parent.mode&0o077))throw Error('输出目录必须为私密目录（0700）');output=await open(values.output,'wx',0o600);}
 const db=new DatabaseSync(values.database!);db.exec('PRAGMA busy_timeout=5000');
 try{const a=new AccessAccounts(new Credentials(db));
 if(secret){const result=action==='create'?a.create(values.name!):a.reset(id);
  if(output){await output.writeFile(JSON.stringify(result)+'\n');console.log('Token 已写入指定私密文件；未在终端显示。');}
  else{console.log('用户 ID：'+result.id);console.log('个人 Token（仅此一次显示，请通过私密渠道发送）：');console.log(result.token);console.log('Token 永久有效，管理员可停用。重置后旧 Token 立即失效。');}
 }else if(action==='list'){console.table(a.list().map(r=>({ID:r.id,姓名:r.name,状态:r.status,创建:r.created?new Date(r.created).toISOString():'历史账号',到期:r.expires?new Date(r.expires).toISOString():'永久'})));}
 else if(action==='enable'){a.enable(id);console.log('已恢复用户；使用原 Token 重新连接，浏览器需重新授权。');}
 else{a.disable(id);console.log('已停用用户，并清除浏览器授权；分析数据仍按原保留规则管理。');}
 }finally{db.close();await output?.close();}
}
main().catch(e=>{console.error('操作未完成：'+(e instanceof Error?e.message:'未知错误'));process.exitCode=1;});
