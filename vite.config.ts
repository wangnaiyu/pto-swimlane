import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath,URL} from 'node:url';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export default defineConfig({base:'./',build:{cssCodeSplit:false},plugins:[vue(),{name:'local-samples',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith('/__sample/'))return next();const id=req.url.slice(10);if(!['2M','23M'].includes(id)){res.statusCode=404;return res.end('Unknown sample');}try{const root=process.env.PTO_TESTDATA_ROOT;if(!root)throw Error('请设置 PTO_TESTDATA_ROOT 为本地 PTO-TestData 目录');const folder=path.join(root,'mix/end2end',id);const [trace,topo]=await Promise.all(['merged_swimlane.json','dyn_topo.txt'].map(f=>readFile(path.join(folder,f),'utf8')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({trace,topo}));}catch(e){res.statusCode=400;res.end(String(e));}});}}],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},publicDir:'public',server:{host:'127.0.0.1',port:5173,strictPort:true},css:{preprocessorOptions:{scss:{silenceDeprecations:['import','legacy-js-api']}}}});
