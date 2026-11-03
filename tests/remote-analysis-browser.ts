import {chromium,expect} from '@playwright/test';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {RemoteFiles} from '../src/remote/files';import {startRemoteLocal} from '../src/remote/http';
const root=await mkdtemp(path.join(os.tmpdir(),'pto-analysis-browser-')),files=await new RemoteFiles(root).init();
const prefix='/pto-swimlane/';
const server=await startRemoteLocal(files,path.resolve('dist'),a=>a==='Bearer browser-test'?'a':null,{basePath:prefix});
const client=new Client({name:'analysis-browser',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(server.origin+prefix+'mcp'),{requestInit:{headers:{Authorization:'Bearer browser-test'}}}));
const call=async(name:string,args={})=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(JSON.stringify(r));return JSON.parse((r.content as any)[0].text);};
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors:string[]=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
const fixture=await readFile('tests/fixtures/L2-synthetic/merged_swimlane.json');
const input=page.locator('input[type=file]');
const ready=async(p:any,id:string)=>expect(p.locator('.local-bar')).toHaveAttribute('data-dataset',id,{timeout:15000});
try{
 const history=await call('create_upload_session');await page.goto(history.upload_url);
 await expect(input).toBeEnabled();await expect(page.getByText('进入上传页面')).toHaveCount(0);expect(page.url()).not.toContain('grant=');
 await input.setInputFiles({name:'first-L2.json',mimeType:'application/json',buffer:fixture});
 await expect(page.locator('.file-status')).toHaveText('first-L2.json',{timeout:15000});
 const first=(await call('get_analysis_session',{analysis_session_id:history.analysis_session_id})).active_dataset;
 await input.setInputFiles({name:'second-L2.json',mimeType:'application/json',buffer:fixture});
 await expect(page.locator('.file-status')).toHaveText('second-L2.json',{timeout:15000});
 const second=(await call('get_analysis_session',{analysis_session_id:history.analysis_session_id})).active_dataset;
 // Browser credential expiry plus a genuinely NEW conversation.
 await context.clearCookies();await page.reload();await expect(page.getByRole('alert')).toContainText('浏览器授权已过期或未建立');
 const conversation=await call('create_upload_session');await page.goto(conversation.upload_url);
 await expect(input).toBeEnabled();await expect(page.getByRole('button',{name:'使用历史文件',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'使用历史文件',exact:true}).click();
 const runs=page.getByRole('dialog',{name:'运行记录'}),run=runs.locator(`[data-run-id="${history.view_session_id}"]`);
 await expect(run).toContainText('first-L2.json');
 await run.locator('p').filter({hasText:'first-L2.json'}).getByRole('button',{name:'使用此文件',exact:true}).click();
 await ready(page,first.id);await expect(page.locator('.agent-status')).toContainText('已关联当前对话');
 const selected=await call('get_analysis_session',{analysis_session_id:conversation.analysis_session_id});
 expect(selected.view_session_id).toBe(history.view_session_id);expect(selected.active_dataset.id).toBe(first.id);
 expect((await call('query_tasks',{dataset_id:selected.active_dataset.id,limit:1})).filename).toBe('first-L2.json');
 await page.goto(conversation.view_url);await ready(page,first.id); // Original stable entry follows the selected history.
 await page.reload();await ready(page,first.id);expect(page.url()).toContain('analysis='+conversation.analysis_session_id);
 // Another conversation in the SAME browser selects the same view's latest file.
 const parallel=await call('create_upload_session',{view_session_id:history.view_session_id});
 const tab=await context.newPage();await tab.goto(parallel.upload_url);await ready(tab,second.id);
 await ready(page,first.id);expect((await call('get_analysis_session',{analysis_session_id:conversation.analysis_session_id})).active_dataset.id).toBe(first.id);
 // Failed upload must not replace selected old history with the view's global active file.
 await input.setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.locator('.failure-explanation')).toContainText('上传失败',{timeout:15000});await ready(page,first.id);
 expect((await call('get_analysis_session',{analysis_session_id:conversation.analysis_session_id})).active_dataset.id).toBe(first.id);
 await input.setInputFiles({name:'third-L2.json',mimeType:'application/json',buffer:fixture});
 await expect(page.locator('.file-status')).toHaveText('third-L2.json',{timeout:15000});
 expect((await call('get_analysis_session',{analysis_session_id:conversation.analysis_session_id})).active_dataset.filename).toBe('third-L2.json');
 await ready(tab,second.id);expect((await call('get_analysis_session',{analysis_session_id:parallel.analysis_session_id})).active_dataset.id).toBe(second.id);
 // Reauthorize the same conversation after expiry without upload or manual confirmation.
 await context.clearCookies();const renewed=await call('create_upload_session',{analysis_session_id:conversation.analysis_session_id});
 await page.goto(renewed.upload_url);await expect(page.locator('.file-status')).toHaveText('third-L2.json',{timeout:15000});
 expect(files.state.listDatasets('a',history.view_session_id).items.length).toBe(3);
 await page.getByRole('button',{name:'运行记录',exact:true}).click();
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/automatic-auth-history.png'});
 await runs.getByRole('button',{name:'关闭',exact:true}).click();
 // A consumed entry fails visibly and offers recovery; it cannot re-select an old file.
 await page.goto(renewed.upload_url);await expect(page.getByRole('alert')).toContainText('此入口已使用或过期');await expect(page.getByText('复制恢复口令')).toBeVisible();
 expect(errors).toEqual([]);
 console.log('PASS: automatic entry, expired-cookie new conversation, historical version selection, no copied sync, same-browser conversation isolation, reload, failed replacement, renewal and replay recovery.');
}finally{await browser.close();await client.close();await server.close();await files.dispose();await rm(root,{recursive:true,force:true});}
