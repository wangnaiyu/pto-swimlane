import { parseFiles } from './index';
self.onmessage=async ({data})=>{try{const start=performance.now();const result=await parseFiles(data.trace,data.topo);self.postMessage({result,parseMs:performance.now()-start});}catch(e){self.postMessage({error:String(e)});}};
