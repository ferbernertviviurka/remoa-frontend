import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {QuestionPublic} from '@remoa/contracts';
import {QuestionProvenance} from './provenance';
import {MapLink} from './shared';
import {startSavedDiscursive,QuestionsApiError} from './api';
const mocks=vi.hoisted(()=>({push:vi.fn(),remember:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}));
vi.mock('./api',async original=>({...await original<typeof import('./api')>(),startSavedDiscursive:vi.fn()}));
vi.mock('@/features/challenge-ai/session-screen',()=>({rememberChallengeAiSession:mocks.remember}));
const id='550e8400-e29b-41d4-a716-446655440000';
const question:QuestionPublic={id,canonicalId:id,version:1,type:'objective',stem:'Enunciado sintético',alternatives:[{key:'A',text:'Primeira'},{key:'B',text:'Segunda'}],origin:'official_exam',visibility:'public',availability:'active',difficulty:'medium',topicId:null,areaId:null,sourceId:id,sourceLabel:'Fonte sintética',reviewed:false,assets:[],boardId:null,cardIds:[],createdAt:new Date()};
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('bounded public provenance',()=>{
 it('renders booklet provenance and the real bounded total without private keys',()=>{
  render(<QuestionProvenance question={{...question,occurrences:{items:[{examId:id,name:'Prova sintética',institution:'Instituição sintética',year:2025,edition:'2025',booklet:'Caderno verde',ordinal:2,originalNumber:'03',sourceId:id,sourceLabel:'Fonte da prova'}],total:11,truncated:true}}}/>);
  expect(screen.getByText('11 ocorrências em provas')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Prova sintética'})).toHaveAttribute('href',`/app/provas/${id}`);
  expect(screen.getByText(/Número original: 03/)).toBeInTheDocument();
  expect(screen.getByText('Exibindo 1 de 11 ocorrências autorizadas.')).toBeInTheDocument();
  expect(document.body.innerHTML).not.toMatch(/correctKey|objectKey|sourceId|referenceRef/);
 });
 it('does not invent exam occurrences for a private generated question',()=>{
  render(<QuestionProvenance question={{...question,origin:'ai_generated',visibility:'private',sourceId:null,sourceLabel:null}}/>);
  expect(document.body.textContent).toBe('');
 });
});
describe('selected saved discursive question',()=>{
 it('starts exactly the selected item and hands its session to the existing challenge screen',async()=>{
  const session={id,boardId:id,format:'generated' as const,status:'active' as const,total:1,position:0,startedAt:new Date(),expiresAt:new Date(),current:{id,position:0,type:'discursive' as const,stem:question.stem},aiUnits:1};
  vi.mocked(startSavedDiscursive).mockResolvedValue({session});
  render(<MapLink question={{...question,type:'discursive',alternatives:null,origin:'ai_generated',visibility:'private',boardId:id}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Responder esta questão discursiva'}));
  await waitFor(()=>expect(startSavedDiscursive).toHaveBeenCalledWith(id));
  await waitFor(()=>expect(mocks.remember).toHaveBeenCalledWith({...session,startedAt:session.startedAt.toISOString(),expiresAt:session.expiresAt.toISOString()}));
  expect(mocks.push).toHaveBeenCalledWith(`/app/mapas/${id}/desafio-ia?session=${id}`);
 });
 it('keeps the selected item visible after a denied start and does not open a general challenge',async()=>{
  vi.mocked(startSavedDiscursive).mockRejectedValue(new QuestionsApiError('not_found'));
  render(<MapLink question={{...question,type:'discursive',alternatives:null,boardId:id}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Responder esta questão discursiva'}));
  await screen.findByRole('alert');expect(mocks.push).not.toHaveBeenCalled();expect(mocks.remember).not.toHaveBeenCalled();
 });
});
