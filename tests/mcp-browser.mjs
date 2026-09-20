import {chromium,expect} from '@playwright/test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
if(!process.env.PTO_TESTDATA_ROOT)throw Error('Set PTO_TESTDATA_ROOT');
const root=path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end');
const client=new Client({name:'browser-acceptance',version:'1.0.0'});await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('bin/pto-swimlane.mjs'),'--allow-root',root]}));
const call=async(name,args)=>{const result=await client.callTool({name,arguments:args});if(result.isError)throw Error(JSON.stringify(result));return result.structuredContent;};
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('data:'))remote.push(r.url());});const result={date:new Date().toISOString(),samples:[]};await mkdir('.local/verification',{recursive:true});
try{
 for(const [sample,x] of [['2M',1220],['23M',850]]){
  const d=await call('open_swimlane',{trace_path:path.join(root,sample,'merged_swimlane.json')});const before=await call('query_tasks',{dataset_id:d.dataset_id,limit:3,sort:'duration_desc'});
  await page.goto('about:blank');await page.goto(d.viewer_url);await expect(page.locator('.local-bar')).toHaveAttribute('data-version','1');await expect(page.locator('.events-canvas').first()).toBeVisible();await page.waitForTimeout(500);await page.mouse.click(x,347);await expect(page.locator('.details-panel')).toContainText('Incoming');await expect(page.locator('.details-panel')).toContainText('Outgoing');
  for(const mode of ['left','right','all']){await page.locator('.button-group button').filter({has:page.locator(`img[alt=${mode}]`)}).click();await expect(page.locator('.button-group button.relevent-highlight img')).toHaveAttribute('alt',mode);}
  // Production build: verify rendered pixels change, without dev-only Vue internals.
  const canvas=page.locator('.events-canvas').first();const a=await canvas.screenshot();await page.locator('#swim-header-increase').first().click();await page.waitForTimeout(150);const b=await canvas.screenshot();expect(a.equals(b)).toBe(false);
  await page.mouse.move(700,400);await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');const c=await canvas.screenshot();expect(b.equals(c)).toBe(false);
  expect(await call('query_tasks',{dataset_id:d.dataset_id,limit:3,sort:'duration_desc'})).toEqual(before);
  const replacement=await call('open_swimlane',{trace_path:path.join(root,sample,'merged_swimlane.json')});
  await page.goto(replacement.viewer_url);await expect(page.locator('.local-bar')).toHaveAttribute('data-version','2');await expect(canvas).toBeVisible();
  await call('close_swimlane',{dataset_id:replacement.dataset_id});
  await page.goto(d.viewer_url);await expect(page.locator('.local-bar')).toHaveAttribute('data-version','3');
  await page.mouse.move(40,20);await page.screenshot({path:`.local/verification/${sample}-mcp.png`});
  await call('close_swimlane',{dataset_id:d.dataset_id});await page.reload();await expect(page.getByRole('alert')).toContainText('数据集已关闭');result.samples.push({sample,taskCount:d.task_count,checks:['mcp-url-production-view','detail','dependency-modes','zoom-pixels','pan-pixels','query-snapshot-unchanged','same-tab-dataset-switch','closed-page-error']});
 }
 expect(errors).toEqual([]);expect(remote).toEqual([]);result.status='passed';result.errors=errors;result.remoteRequests=remote;
}finally{await writeFile('.local/verification/mcp-browser-results.json',JSON.stringify(result,null,2));await browser.close();await client.close();}
console.log(JSON.stringify(result,null,2));
