import {chromium,expect} from '@playwright/test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';import path from 'node:path';
if(!process.env.PTO_TESTDATA_ROOT)throw Error('Set PTO_TESTDATA_ROOT');
const c=new Client({name:'race-test',version:'1'});await c.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve(process.env.PTO_MCP_ENTRY??'bin/pto-swimlane.mjs'),'--allow-root',path.resolve('tests/fixtures/L2-synthetic')]}));
const d=(await c.callTool({name:'open_swimlane',arguments:{trace_path:path.resolve('tests/fixtures/L2-synthetic/merged_swimlane.json')}})).structuredContent;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.addInitScript(()=>{const Native=window.Worker;window.Worker=class extends Native{postMessage(...args){const cb=this.onmessage;this.onmessage=e=>{window.__workerQueued=true;setTimeout(()=>cb(e),1200)};super.postMessage(...args)}}});
 await p.goto(new URL(d.viewer_url).origin);
 await p.locator('input[type=file]').setInputFiles([path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end/23M/merged_swimlane.json'),path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end/23M/dyn_topo.txt')]);
 await p.waitForFunction(()=>window.__workerQueued);
 await p.goto(d.viewer_url);await expect(p.locator('.local-bar')).toContainText('已连接 agent');
 await p.waitForTimeout(1600);
 console.log('After delayed local parse:',await p.locator('.local-bar').innerText());
 await expect(p.locator('.local-bar')).toContainText('已连接 agent');await expect(p.locator('.thread-labels-loop')).toContainText(['L2 synthetic lane']);
 await expect(p.locator('.events-canvas').first()).toBeVisible();
 const box=await p.locator('.events-canvas').first().boundingBox();
 await p.mouse.click(box.x+box.width*0.55,box.y+8);
 await expect(p.locator('.details-panel')).toContainText('L2_synthetic_task_2');
 await expect(p.locator('.details-panel')).toContainText('Incoming1');
 await expect(p.locator('.details-panel')).toContainText('Outgoing1');
 for(const mode of ['left','right','all']){await p.locator('.button-group button').filter({has:p.locator(`img[alt=${mode}]`)}).click();await expect(p.locator('.button-group button.relevent-highlight img')).toHaveAttribute('alt',mode);}
 // The inverse direction: a delayed MCP response must not replace a later local choice.
 await p.goto(new URL(d.viewer_url).origin);await p.waitForLoadState('networkidle');
 let fetched;const requestSeen=new Promise(resolve=>fetched=resolve);let release;const gate=new Promise(resolve=>release=resolve);
 await p.route('**/api/datasets/*',async route=>{const response=await route.fetch();fetched();await gate;await route.fulfill({response});});
 await p.goto(d.viewer_url);await requestSeen;
 // Busy intentionally disables user input; dispatch represents a file-read operation already queued by the browser.
 await p.locator('input[type=file]').evaluate(el=>el.disabled=false);
 await p.locator('input[type=file]').setInputFiles([path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end/23M/merged_swimlane.json'),path.join(process.env.PTO_TESTDATA_ROOT,'mix/end2end/23M/dyn_topo.txt')]);
 await expect(p.locator('.local-bar')).toContainText('仅在浏览器中打开');release();await p.waitForTimeout(300);
 await expect(p.locator('.local-bar')).toContainText('仅在浏览器中打开');
 await p.unroute('**/api/datasets/*');await p.reload();await expect(p.locator('.local-bar')).toContainText('已连接 agent');await expect(p.locator('.thread-labels-loop')).toContainText(['L2 synthetic lane']);
 expect(errors).toEqual([]);console.log('PASS: both load orders, L2 task detail and dependencies, reload; no page errors.');
}finally{await b.close();await c.close();}
