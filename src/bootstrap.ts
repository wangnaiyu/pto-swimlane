window.staticPath=new URL('.',location.href).pathname.replace(/\/$/,'');window.ascTheme='dark';window.ascLang='zh';window.extensionQuery={_viewType:'swimGraph'};
window.vscode={getState:()=>({}),setState:()=>{},postMessage:()=>{}};
import('./main').catch(()=>{const status=document.getElementById('startup-status');if(status){status.textContent='页面启动失败，请重新加载。';document.getElementById('startup-retry')?.removeAttribute('hidden');}});
