/** Bounded JSON download; progress counts decoded bytes, matching the streamed body. */
export async function requestJson(url:string,options:RequestInit={},progress?:(loaded:number,total:number)=>void,idleMs=15000,totalMs=120000){
 const controller=new AbortController();let idle:ReturnType<typeof setTimeout>;
 const reset=()=>{clearTimeout(idle);idle=setTimeout(()=>controller.abort(),idleMs);};
 const deadline=setTimeout(()=>controller.abort(),totalMs);reset();
 try{
  const r=await fetch(url,{...options,signal:controller.signal});reset();
  const reader=r.body?.getReader(),decoder=new TextDecoder(),parts:string[]=[];let loaded=0;
  const total=Number(r.headers.get('X-PTO-Decoded-Length')??0);
  if(reader){for(;;){const {done,value}=await reader.read();if(done)break;reset();loaded+=value.byteLength;parts.push(decoder.decode(value,{stream:true}));if(r.ok)progress?.(loaded,total);}parts.push(decoder.decode());}
  else parts.push(await r.text());
  let data:any;try{data=JSON.parse(parts.join(''));}catch{throw Error('服务器响应格式错误');}
  if(!r.ok){const e:any=Error(data.code??'服务器请求失败');e.status=r.status;throw e;}return data;
 }catch(e){if(controller.signal.aborted)throw Error('结果请求超时，请重试载入，无需重新上传');throw e;}
 finally{clearTimeout(idle!);clearTimeout(deadline);}
}
