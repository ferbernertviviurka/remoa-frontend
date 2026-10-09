'use client';
import Link from 'next/link';
import {actionLink} from '@/features/questions/shared';
import { questionCandidateSchema,questionDraftUpdateInputSchema,type QuestionReviewDetail } from '@remoa/contracts';
import { CandidateEditor } from './candidate-editor';
import { saveQuestionDraft } from './api';
import { tq } from './labels';
/** UI adapter shares the content form; no staging record is written or invented on the server. */
export function QuestionDraftEditor({question:q,onSaved}:{question:QuestionReviewDetail;onSaved:()=>void}){
 const candidate=questionCandidateSchema.parse({id:q.id,importId:q.id,chunkId:null,ordinal:q.version,originalNumber:null,payload:{stem:q.stem,ownStem:q.ownStem??undefined,contextBindings:q.contextBindings,alternatives:q.alternatives,correctKey:q.correctKey,explanation:q.explanation,areaId:q.areaId,topicId:q.topicId,annulled:q.availability==='annulled',keyFinal:q.keyFinal,integrityConfirmed:q.integrityConfirmed,imagesConfirmed:false,assets:q.assets.map(a=>({id:a.id,objectKey:a.objectKey,alt:a.alt,provenance:a.provenance})),imageRefs:[]},confidence:{},provenance:q.assets.map(a=>a.provenance),issues:[],fingerprint:q.contentHash,duplicateOf:null,questionId:q.id,state:'accepted',revision:q.version,createdAt:new Date(0),updatedAt:new Date(0)});
 return <><CandidateEditor candidate={candidate} importId={q.id} readOnlyStructure={q.contextManaged} title={tq('questionsAdmin.rectify')} onSaved={onSaved} onSaveContent={async content=>{const input=questionDraftUpdateInputSchema.parse({expectedContentHash:q.contentHash,content});await saveQuestionDraft(q.id,input);}}/>{q.contextManaged?<Link className={actionLink} href="/admin/questoes/importacoes">{tq('questionsAdmin.contextStagingLink')}</Link>:null}</>;
}
