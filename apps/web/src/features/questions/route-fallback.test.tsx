import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
vi.mock('@/features/questions/server-flags',()=>({getQuestionFeatureFlags:vi.fn()}));
vi.mock('next/dynamic',()=>({default:()=>()=> <p>Legacy private question bank</p>}));
vi.mock('./questions-hub',()=>({QuestionsHub:({initialState,sessionsEnabled}:{initialState?:string;sessionsEnabled:boolean})=><p data-sessions={String(sessionsEnabled)}>Question catalogue {initialState}</p>}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NEXT_NOT_FOUND');}}));
vi.mock('@/features/exam-builder/builder-screen',()=>({BuilderScreen:({init}:{init:unknown})=><output aria-label="Builder initialization">{JSON.stringify(init)}</output>}));
import {getQuestionFeatureFlags} from './server-flags';
import NewExamPage from '@/app/app/(app)/prova/nova-prova/page';
import LegacyExamPage from '@/app/app/(app)/banco-de-questoes/prova/page';
import Page from '@/app/app/(app)/banco-de-questoes/page';
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('keeps the private legacy bank when the new catalogue is disabled',async()=>{vi.mocked(getQuestionFeatureFlags).mockResolvedValue({catalog:false,sessions:false,import:false,bankStudent:false});render(await Page({searchParams:Promise.resolve({})}));expect(screen.getByText('Legacy private question bank')).toBeInTheDocument();expect(screen.queryByText(/Question catalogue/)).not.toBeInTheDocument();});
it('renders the new catalogue with its independent session flag and initial filter',async()=>{vi.mocked(getQuestionFeatureFlags).mockResolvedValue({catalog:true,sessions:false,import:false,bankStudent:false});render(await Page({searchParams:Promise.resolve({state:'wrong'})}));expect(screen.getByText('Question catalogue wrong')).toHaveAttribute('data-sessions','false');expect(screen.queryByText('Legacy private question bank')).not.toBeInTheDocument();});

it('opens the new exam route with the same real builder and AI server parameters as the legacy route',async()=>{
 vi.mocked(getQuestionFeatureFlags).mockResolvedValue({catalog:true,sessions:true,import:false,bankStudent:true});
 const id='00000000-0000-4000-8000-000000000001';
 expect(NewExamPage).toBe(LegacyExamPage);
 render(await NewExamPage({searchParams:Promise.resolve({source:'ai',ids:`${id},invalid,${id}`,matrixItemIds:id})}));
 expect(JSON.parse(screen.getByLabelText('Builder initialization').textContent??'{}')).toEqual({source:'ai',ids:[id],matrixItemIds:[id]});
});
it('opens catalog creation on the new route without silently choosing AI',async()=>{
 vi.mocked(getQuestionFeatureFlags).mockResolvedValue({catalog:true,sessions:true,import:false,bankStudent:true});
 render(await NewExamPage({searchParams:Promise.resolve({})}));
 expect(JSON.parse(screen.getByLabelText('Builder initialization').textContent??'{}')).toEqual({ids:[],matrixItemIds:[]});
});
it('keeps the new exam route closed when the builder feature is disabled',async()=>{
 vi.mocked(getQuestionFeatureFlags).mockResolvedValue({catalog:true,sessions:true,import:false,bankStudent:false});
 await expect(NewExamPage({searchParams:Promise.resolve({source:'ai'})})).rejects.toThrow('NEXT_NOT_FOUND');
});
