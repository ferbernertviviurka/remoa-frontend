'use client';
import {Component,lazy,Suspense,useEffect,useRef,useState,type ComponentProps,type ComponentType,type ReactNode} from 'react';
import {t} from './labels';
type OpenProps={open:boolean;onOpenChange:(open:boolean)=>void};
type BoundaryProps={open:boolean;onRetry:()=>void;onClose:()=>void;children:ReactNode};
class DialogLoadBoundary extends Component<BoundaryProps,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?(this.props.open?<PendingDialog failed onRetry={this.props.onRetry} onClose={this.props.onClose}/>:null):this.props.children;}
}
function PendingDialog({failed=false,onClose,onRetry}:{failed?:boolean;onClose:()=>void;onRetry?:()=>void}){
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[onClose]);
 return <div className="rounded-card border border-border bg-surface p-4" aria-busy={!failed}><p role={failed?'alert':'status'}>{t(failed?'questions.dialogLoadError':'common.loading')}</p><div className="mt-3 flex gap-3">{failed?<button type="button" className="min-h-11 rounded-btn border border-border px-4" onClick={onRetry}>{t('common.retry')}</button>:null}<button type="button" className="min-h-11 rounded-btn border border-border px-4" onClick={onClose}>{t('common.close')}</button></div></div>;
}
export function DeferredQuestionDialog<P extends OpenProps>({load,props}:{load:()=>Promise<{default:ComponentType<P>}>;props:P}){
 const[activated,setActivated]=useState(props.open);const[entry,setEntry]=useState(()=>({attempt:0,component:lazy(load)}));const trigger=useRef<HTMLElement|null>(null);const wasOpen=useRef(false);
 useEffect(()=>{if(props.open){if(!wasOpen.current)trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setActivated(true);}wasOpen.current=props.open;},[props.open]);
 const DialogComponent=entry.component;
 const change=(open:boolean)=>{props.onOpenChange(open);if(!open)requestAnimationFrame(()=>{if(trigger.current?.isConnected)trigger.current.focus();});};
 if(!activated&&!props.open)return null;
 return <DialogLoadBoundary key={entry.attempt} open={props.open} onClose={()=>change(false)} onRetry={()=>setEntry(value=>({attempt:value.attempt+1,component:lazy(load)}))}><Suspense fallback={props.open?<PendingDialog onClose={()=>change(false)}/>:null}><DialogComponent {...props} onOpenChange={change}/></Suspense></DialogLoadBoundary>;
}
const config=()=>import('./config-dialog').then(module=>({default:module.ConfigDialog}));
const personal=()=>import('./personal-dialog').then(module=>({default:module.PersonalDialog}));
const report=()=>import('./report-dialog').then(module=>({default:module.ReportDialog}));
export const ConfigDialog=(props:ComponentProps<typeof import('./config-dialog').ConfigDialog>)=><DeferredQuestionDialog load={config} props={props}/>;
export const PersonalDialog=(props:ComponentProps<typeof import('./personal-dialog').PersonalDialog>)=><DeferredQuestionDialog load={personal} props={props}/>;
export const ReportDialog=(props:ComponentProps<typeof import('./report-dialog').ReportDialog>)=><DeferredQuestionDialog load={report} props={props}/>;
