'use client';
import {Component,lazy,Suspense,useState,type ReactNode} from 'react';
import type {QuestionReviewDetail} from '@remoa/contracts';
import {Alert,Button} from '@remoa/ui';
import {t} from '@remoa/strings';
import {tq} from './labels';
const load=()=>import('./draft-editor').then(module=>({default:module.QuestionDraftEditor}));
class DraftLoadBoundary extends Component<{children:ReactNode;onRetry:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<Alert role="alert" tone="review" title={tq('questionsAdmin.loadError')}><Button variant="secondary" onClick={this.props.onRetry}>{t('common.retry')}</Button></Alert>:this.props.children;}
}
/** The caller mounts this only for authorized admins viewing draft/in-review content. Render validation stays inside the real editor. */
export function DeferredDraftEditor(props:{question:QuestionReviewDetail;onSaved:()=>void}){
 const[entry,setEntry]=useState(()=>({attempt:0,component:lazy(load)}));const Editor=entry.component;
 return <DraftLoadBoundary key={entry.attempt} onRetry={()=>setEntry(value=>({attempt:value.attempt+1,component:lazy(load)}))}><Suspense fallback={<p role="status">{t('common.loading')}</p>}><Editor {...props}/></Suspense></DraftLoadBoundary>;
}
