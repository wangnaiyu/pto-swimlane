import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.env.PTO_TESTDATA_ROOT;
if(!root)throw Error('PTO_TESTDATA_ROOT is required for browser validation');
const out='.local/verification';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173')&&!r.url().startsWith('data:'))remote.push(r.url());});
const result={date:new Date().toISOString(),browser:browser.version(),viewport:{width:1440,height:1000},samples:[]};
const state=()=>page.evaluate(()=>{const s=document.querySelector('.swim-global-container').__vueParentComponent.setupState;return {scale:s.viewState.scale,offsetX:s.viewState.offsetX,offsetY:s.viewState.offsetY,scrollTop:[...document.querySelectorAll('*')].reduce((sum,e)=>sum+e.scrollTop,0),selected:s.selectedEvent?.id,task:s.selectedEvent?.args?.taskId,depMode:s.viewState.depMode};});
try{
 await page.goto('http://127.0.0.1:5173');
 for(const [id,x] of [['2M',1220],['23M',850]]){
  const version=await page.locator('.local-bar').getAttribute('data-version');
  const start=Date.now();
  // Exercise actual local file selection, not only the convenience sample endpoint.
  await page.locator('input[type=file]').setInputFiles(['merged_swimlane.json','dyn_topo.txt'].map(f=>path.join(root,'mix/end2end',id,f)));
  await expect(page.locator('.local-bar')).not.toHaveAttribute('data-version',version);
  await expect(page.locator('.local-bar')).toContainText('解析');
  await expect(page.locator('.events-canvas').first()).toBeVisible();
  await page.waitForFunction(()=>{const s=document.querySelector('.swim-global-container')?.__vueParentComponent?.setupState;return s&&!s.loading&&s.viewState.canvasCssWidth>0;});
  const readyMs=Date.now()-start; await page.waitForTimeout(250);
  await page.mouse.click(x,347);await expect(page.locator('.details-panel')).toContainText('Incoming');await expect(page.locator('.details-panel')).toContainText('Outgoing');
  const selected=await state();expect(selected.task).toBeDefined();
  await expect(page.locator('.dependency-canvas')).toBeVisible();
  const detail=await page.locator('.details-panel').innerText();expect(detail).toContain('start_time');
  await page.locator('.button-group button').filter({has:page.locator('img[alt=left]')}).click();
  await expect(page.locator('.button-group button.relevent-highlight img')).toHaveAttribute('alt','left');
  await page.locator('.button-group button').filter({has:page.locator('img[alt=right]')}).click();
  await expect(page.locator('.button-group button.relevent-highlight img')).toHaveAttribute('alt','right');
  await page.locator('.button-group button').filter({has:page.locator('img[alt=all]')}).click();
  const beforeZoom=await state();await page.locator('#swim-header-increase').first().click();
  await page.waitForFunction(scale=>document.querySelector('.swim-global-container').__vueParentComponent.setupState.viewState.scale>scale,beforeZoom.scale);
  const zoomed=await state();
  await page.mouse.move(700,400);await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
  await page.waitForFunction(x=>document.querySelector('.swim-global-container').__vueParentComponent.setupState.viewState.offsetX!==x,zoomed.offsetX);
  const panned=await state();
  await page.mouse.move(700,400);await page.mouse.wheel(0,350);await page.waitForTimeout(200);
  const scrolled=await state();expect(scrolled.scrollTop).toBeGreaterThan(panned.scrollTop);
  await page.mouse.move(50,20);await page.screenshot({path:`${out}/${id}-details.png`});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const metrics=await cdp.send('Performance.getMetrics');await cdp.detach();
  result.samples.push({id,readyMs,workerParseLabel:await page.locator('.local-bar').innerText(),selected,zoomed,panned,scrolled,jsHeapUsedMiB:Math.round(metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value/1048576),checks:['local-file-read','task-detail','dependency-predecessor-successor-toggle','zoom-button','keyboard-pan','vertical-wheel']});
 }
 // Reopen without sidecar and verify original flow fallback renders.
 await page.locator('input[type=file]').setInputFiles(path.join(root,'mix/end2end/2M/merged_swimlane.json'));
 await expect(page.locator('.events-canvas').first()).toBeVisible();await page.waitForTimeout(500);await page.mouse.click(1220,347);await expect(page.locator('.details-panel')).toContainText('Incoming');
 // Invalid data is surfaced, and a subsequent valid open recovers.
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});await expect(page.getByRole('alert')).toContainText('Error');
 await page.getByRole('button',{name:'2M 样例',exact:true}).click();await expect(page.locator('.events-canvas').first()).toBeVisible();
 await page.waitForTimeout(300);await page.screenshot({path:out+'/2M-overview.png'});
 result.errors=errors;result.remoteRequests=remote;expect(errors).toEqual([]);expect(remote).toEqual([]);
 result.status='passed';console.log(JSON.stringify(result,null,2));
}finally{await writeFile(out+'/browser-results.json',JSON.stringify(result,null,2));await browser.close();}
