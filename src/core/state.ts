let state:any={}; export const pullState=()=>state; export const pushState=(s:any)=>{state={...state,...s};};
