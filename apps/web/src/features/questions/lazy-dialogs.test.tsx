import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {useState} from 'react';
import {DeferredQuestionDialog} from './lazy-dialogs';
afterEach(()=>cleanup());
function Draft({open,onOpenChange}:{open:boolean;onOpenChange:(v:boolean)=>void}){const[value,setValue]=useState('');return open?<div role="dialog"><input aria-label="Draft" value={value} onChange={event=>setValue(event.target.value)}/><button onClick={()=>onOpenChange(false)}>Close draft</button></div>:null;}
it('loads only on first open and preserves the mounted draft across close and reopen',async()=>{
 const load=vi.fn(async()=>({default:Draft}));const change=vi.fn();const view=render(<DeferredQuestionDialog load={load} props={{open:false,onOpenChange:change}}/>);expect(load).not.toHaveBeenCalled();
 view.rerender(<DeferredQuestionDialog load={load} props={{open:true,onOpenChange:change}}/>);fireEvent.change(await screen.findByLabelText('Draft'),{target:{value:'Saved locally'}});
 view.rerender(<DeferredQuestionDialog load={load} props={{open:false,onOpenChange:change}}/>);expect(screen.queryByLabelText('Draft')).not.toBeInTheDocument();
 view.rerender(<DeferredQuestionDialog load={load} props={{open:true,onOpenChange:change}}/>);expect(await screen.findByLabelText('Draft')).toHaveValue('Saved locally');expect(load).toHaveBeenCalledOnce();
});
it('offers local retry and close after a chunk failure, then loads the dialog',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);const load=vi.fn<()=>Promise<{default:typeof Draft}>>().mockRejectedValueOnce(new Error('synthetic chunk unavailable')).mockResolvedValueOnce({default:Draft});const change=vi.fn();
 try{render(<DeferredQuestionDialog load={load} props={{open:true,onOpenChange:change}}/>);await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));expect(await screen.findByLabelText('Draft')).toBeInTheDocument();expect(load).toHaveBeenCalledTimes(2);}finally{log.mockRestore();}
});
it('allows Escape while loading and restores the trigger without requesting another dialog',async()=>{
 const trigger=document.createElement('button');document.body.append(trigger);trigger.focus();const load=vi.fn(()=>new Promise<{default:typeof Draft}>(()=>undefined));const change=vi.fn();
 render(<DeferredQuestionDialog load={load} props={{open:true,onOpenChange:change}}/>);await screen.findByRole('status');fireEvent.keyDown(window,{key:'Escape'});expect(change).toHaveBeenCalledWith(false);await act(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));});await waitFor(()=>expect(trigger).toHaveFocus());trigger.remove();
});
