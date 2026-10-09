'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {QuestionDocumentPagePreview} from '@remoa/contracts';
import {previewDocumentPage} from './api';
import {adminQuestionError,tq} from './labels';
import {MarkerPreview,type MarkerBox,type MarkerPageImage} from './marker-preview';
/** Original server-rendered PNG only. There is no reconstructed page or PDF-readiness fallback. */
export function MarkerPagePreview({importId,documentId,page,bbox,onChange,onReady}:{importId:string;documentId:string;page:number;bbox:MarkerBox|null;onChange:(box:MarkerBox)=>void;onReady:(ready:boolean)=>void}){
 const[image,setImage]=useState<MarkerPageImage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[version,setVersion]=useState(0);const sequence=useRef(0),current=useRef<{identity:string;expires:number;page:number}|null>(null),callback=useRef(onReady);
 useEffect(()=>{callback.current=onReady;},[onReady]);
 useEffect(()=>{const generation=++sequence.current,abort=new AbortController();let expiry:ReturnType<typeof setTimeout>|undefined;current.current=null;callback.current(false);setLoading(true);setImage(null);setError(null);void previewDocumentPage(importId,documentId,page,abort.signal).then((data:QuestionDocumentPagePreview)=>{if(abort.signal.aborted||sequence.current!==generation)return;const identity=JSON.stringify([importId,documentId,data.documentSha256,page,data.imageSha256,generation]);current.current={identity,expires:Date.now()+data.expiresInSec*1000,page};setLoading(false);setImage({identity,url:data.url,width:data.width,height:data.height});expiry=setTimeout(()=>{current.current=null;callback.current(false);setImage(null);setError(tq('questionsAdmin.previewExpired'));},data.expiresInSec*1000);}).catch(e=>{if(!abort.signal.aborted&&sequence.current===generation){setError(adminQuestionError(e));setLoading(false);}});return()=>{abort.abort();if(expiry)clearTimeout(expiry);current.current=null;};},[importId,documentId,page,version]);
 const ready=useCallback((state:{identity:string;ready:boolean})=>{const active=current.current;callback.current(Boolean(state.ready&&active&&state.identity===active.identity&&active.page===page&&active.expires>Date.now()));},[page]);
 return <MarkerPreview image={image} bbox={bbox} loading={loading} error={error} onChange={onChange} onReady={ready} onRetry={()=>{current.current=null;callback.current(false);setImage(null);setVersion(value=>value+1);}}/>;
}
