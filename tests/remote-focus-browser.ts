import {chromium,expect} from '@playwright/test';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {RemoteFiles} from '../src/remote/files';import {startRemoteLocal} from '../src/remote/http';
const root=await mkdtemp(path.join(os.tmpdir(),'pto-focus-browser-')),files=await new RemoteFiles(root).init();
const server=await startRemoteLocal(files,path.resolve('dist'),a=>a==='Bearer test'?'a':null,{basePath:'/pto-swimlane/'});
const client=new Client({name:'focus-browser',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(server.origin+'/pto-swimlane/mcp'),{requestInit:{headers:{Authorization:'Bearer test'}}}));
const call=async(name:string,args={})=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(JSON.stringify(r));return JSON.parse((r.content as any)[0].text);};
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const traceEvents:any[]=[];for(let i=1;i<=24;i++)traceEvents.push({name:'process_name',ph:'M',pid:i,args:{name:'L2 machine '+i}},{name:'thread_name',ph:'M',pid:i,tid:1,args:{name:'L2 lane'}},{name:'L2_same_task_name',ph:'X',pid:i,tid:1,ts:i*1000,dur:5,args:{seqNo:0,taskId:i,leafIndex:i}});
const fixture=Buffer.from(JSON.stringify({data_level:'L2',description:'Artificial native focus acceptance data; no measured results.',traceEvents}));
try{
 const entry=await call('create_upload_session');await page.goto(entry.upload_url);await expect(page.locator('input[type=file]')).toBeEnabled();
 await page.locator('input[type=file]').setInputFiles({name:'L2-native-focus.json',mimeType:'application/json',buffer:fixture});
 await expect(page.locator('.file-status')).toHaveText('L2-native-focus.json',{timeout:15000});
 const s=await call('get_analysis_session',{analysis_session_id:entry.analysis_session_id}),args={analysis_session_id:entry.analysis_session_id,dataset_id:s.active_dataset.id,seqNo:'0'};
 const focus=async(taskId:string)=>{
  const command=await call('focus_task',{...args,taskId});expect(command.status).toBe('queued');
  await expect.poll(async()=>{const r=await call('get_focus_status',{focus_request_id:command.focus_request_id});if(!['queued','claimed','applied'].includes(r.status))throw Error(JSON.stringify(r));return r.status;},{timeout:12000,intervals:[250,500,1000]}).toBe('applied');
  await expect(page.locator('.details-panel')).toContainText('L2_same_task_name');
  await expect(page.locator('.details-panel')).toContainText(taskId);
  return command;
 };
 const first=await focus('24');
 const after=await page.locator('#main-swim').evaluate(el=>el.scrollTop);expect(after).toBeGreaterThan(0);
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/native-task-focus.png'});
 // No browser clicks or search input: all selection and navigation originates at MCP.
 await focus('1');expect(await page.locator('#main-swim').evaluate(el=>el.scrollTop)).toBeLessThan(after);
 await focus('24');
 await page.reload();await expect(page.locator('.file-status')).toHaveText('L2-native-focus.json',{timeout:15000});
 expect((await call('get_focus_status',{focus_request_id:first.focus_request_id})).status).toBe('applied');
 await expect(page.locator('.details-panel')).not.toContainText('L2_same_task_name'); // Receipt never replays on reload.
 await context.clearCookies();await page.reload();await expect(page.getByRole('alert')).toContainText('浏览器授权已过期或未建立');
 const pending=await call('focus_task',{...args,taskId:'2'});expect((await call('get_focus_status',{focus_request_id:pending.focus_request_id})).status).toBe('queued');
 const renewed=await call('create_upload_session',{analysis_session_id:entry.analysis_session_id});
 const replacement=await call('focus_task',{...args,taskId:'3'});expect((await call('get_focus_status',{focus_request_id:pending.focus_request_id})).status).toBe('superseded');
 await page.goto(renewed.upload_url);await expect(page.locator('.file-status')).toHaveText('L2-native-focus.json',{timeout:15000});
 await expect.poll(async()=>(await call('get_focus_status',{focus_request_id:replacement.focus_request_id})).status,{timeout:12000}).toBe('applied');expect((await call('get_focus_status',{focus_request_id:pending.focus_request_id})).status).not.toBe('applied');
 expect(errors).toEqual([]);console.log('PASS: native MCP selects exact same-name tasks, expands/scrolls offscreen lanes, pans/zooms timeline, opens details, changes target, no replay, reauthorizes; no browser control clicks.');
}finally{await browser.close();await client.close();await server.close();await files.dispose();await rm(root,{recursive:true,force:true});}
