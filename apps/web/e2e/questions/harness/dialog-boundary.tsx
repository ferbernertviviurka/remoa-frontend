// TEST ONLY: one synthetic loader rejection, then the production ConfigDialog. No API mutation is triggered.
import {useMemo,useState} from 'react';
import {DeferredQuestionDialog} from '@/features/questions/lazy-dialogs';
export function DialogBoundaryHarness(){
 const[open,setOpen]=useState(false);
 const load=useMemo(()=>{let attempts=0;return async()=>{attempts++;if(attempts===1){await new Promise(resolve=>setTimeout(resolve,1200));throw new Error('Test-only synthetic module rejection');}const module=await import('@/features/questions/config-dialog');return{default:module.ConfigDialog};};},[]);
 return <section><h1 className="font-display text-3xl">Teste sintético da fronteira de diálogo</h1><p className="my-4">Falha de carregamento simulada; o formulário de configuração é o componente real. Nenhuma sessão será criada neste teste.</p><button className="min-h-11 rounded-btn border border-border px-4" onClick={()=>setOpen(true)}>Abrir configuração de teste</button><DeferredQuestionDialog load={load} props={{open,onOpenChange:setOpen}}/></section>;
}
