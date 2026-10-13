import React from 'react';
import {createRoot} from 'react-dom/client';
import '@/app/globals.css';
import './style.css';
import {BuilderScreen} from '@/features/exam-builder/builder-screen';
const q=new URLSearchParams(location.search);const list=(k:string)=>(q.get(k)??'').split(',').filter(Boolean);
createRoot(document.getElementById('root')!).render(<><aside className="border-b border-border bg-surface px-4 py-3 text-sm">Harness de teste — respostas sintéticas de API; nenhuma gravação no Remoa.</aside><main className="min-w-0 p-4 md:p-8"><BuilderScreen init={{ids:list('ids'),matrixItemIds:[],...(q.get('source')==='ai'?{source:'ai' as const}:{})}}/></main></>);
