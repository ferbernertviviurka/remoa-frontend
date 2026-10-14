import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {questionSessionPublicSchema,questionSessionReportSchema,type QuestionAnswerInput,type QuestionSessionPublic} from '@remoa/contracts';
import {SessionScreen} from './session-screen';
import {SessionResult} from './session-result';
import {finishSession,getSession,saveAnswer,saveUserState} from './api';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('./api',async original=>({...await original<typeof import('./api')>(),getSession:vi.fn(),getReport:vi.fn(),saveAnswer:vi.fn(),finishSession:vi.fn(),saveUserState:vi.fn(),getReference:vi.fn(),listQuestionTaxonomy:vi.fn(async()=>[])}));
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const question=(n:number,origin='official_exam')=>({id:id(n),canonicalId:id(n),version:1,type:'objective',stem:`Enunciado sintético ${n}`,alternatives:[{key:'A',text:`Alternativa A${n}`},{key:'B',text:`Alternativa B${n}`}],origin,visibility:'public',availability:'active',difficulty:'medium',topicId:null,areaId:null,sourceId:null,sourceLabel:null,reviewed:true,assets:[],boardId:null,cardIds:[],userState:{favorite:false,doubtful:false,annotation:''},createdAt:new Date()});
const item=(n:number,origin?:string)=>({id:id(10+n),position:n-1,question:question(n,origin),originalNumber:null,selectedKey:null,answered:false,doubtful:false,revision:0});
let current:QuestionSessionPublic;
const report=(correct:number,denominator:number)=>questionSessionReportSchema.parse({sessionId:id(100),version:1,correct,incorrect:denominator-correct,unanswered:0,annulled:0,denominator,score:denominator?correct/denominator:0,items:[]});
const put=()=>vi.mocked(saveAnswer).mock.calls;
beforeEach(()=>{
 document.documentElement.dataset.motion='reduced';sessionStorage.clear();
 current=questionSessionPublicSchema.parse({id:id(100),mode:'simulation',status:'active',revision:0,startedAt:new Date(),deadline:null,finishedAt:null,serverTime:new Date(),items:[item(1,'ai_generated'),item(2)]});
 vi.mocked(getSession).mockImplementation(async()=>current);
 vi.mocked(saveAnswer).mockImplementation(async(_s,itemId,input:QuestionAnswerInput)=>{current={...current,items:current.items.map(i=>i.id===itemId?{...i,answered:true,selectedKey:input.selectedKey,revision:input.revision+1}:i)};return {itemId,selectedKey:input.selectedKey,revision:input.revision+1,savedAt:new Date()};});
 vi.mocked(finishSession).mockImplementation(async()=>{current={...current,status:'finished',finishedAt:new Date()};return report(2,2);});
 vi.mocked(saveUserState).mockImplementation(async(_q,input)=>({favorite:false,doubtful:false,annotation:'',...input}));
});
afterEach(()=>{cleanup();vi.clearAllMocks();});
const pick=async(n:number,key:'A'|'B')=>{fireEvent.click(await screen.findByRole('radio',{name:new RegExp(`Alternativa ${key}${n}`)}));fireEvent.click(screen.getByRole('button',{name:'Salvar resposta'}));};

describe('G29 simulation session',()=>{
 it('shows a real skeleton while loading',()=>{vi.mocked(getSession).mockImplementation(()=>new Promise(()=>undefined));render(<SessionScreen sessionId={id(100)}/>);const region=screen.getByRole('status');expect(region).toHaveAttribute('aria-busy','true');expect(region.querySelectorAll('.remoa-skeleton').length).toBeGreaterThan(10);});
 it('save keeps the answer in memory, moves to the next question and marks it in the navigator',async()=>{
  render(<SessionScreen sessionId={id(100)}/>);await pick(1,'A');
  expect(await screen.findByText('Enunciado sintético 2')).toBeInTheDocument();expect(put()).toHaveLength(0);
  expect(screen.getByRole('button',{name:'Abrir questão 1, respondida'})).toBeInTheDocument();expect(screen.getByText('Resposta guardada. Ela será enviada quando você concluir.')).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem(`remoa:session-drafts:${id(100)}`)!)[id(11)].selectedKey).toBe('A');
 });
 it('blocks finishing until every question is answered, then shows the purple banner and sends everything at the end',async()=>{
  render(<SessionScreen sessionId={id(100)}/>);await screen.findByText('Enunciado sintético 1');
  expect(screen.getByRole('button',{name:'Concluir sessão'})).toBeDisabled();expect(screen.getByText('Responda todas as questões para concluir. Faltam 2.')).toBeInTheDocument();
  await pick(1,'A');await screen.findByText('Enunciado sintético 2');expect(screen.queryByText('Todas as questões respondidas')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Não sei'}));
  expect(await screen.findByRole('heading',{name:'Todas as questões respondidas'})).toBeInTheDocument();expect(screen.getByText('Tudo respondido. Agora você pode concluir.')).toBeInTheDocument();expect(put()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Enviar respostas'}));fireEvent.click(await screen.findByRole('button',{name:'Concluir e ver resultado'}));
  await screen.findByText('2 de 2 questões corretas');
  expect(put().map(c=>[c[1],c[2].selectedKey])).toEqual([[id(11),'A'],[id(12),null]]);expect(finishSession).toHaveBeenCalledTimes(1);
  expect(vi.mocked(saveAnswer).mock.invocationCallOrder.at(-1)!).toBeLessThan(vi.mocked(finishSession).mock.invocationCallOrder[0]!);
  expect(sessionStorage.getItem(`remoa:session-drafts:${id(100)}`)).toBeNull();
 });
 it('a failed send keeps unsent answers and retries with the same mutation',async()=>{
  vi.mocked(saveAnswer).mockRejectedValueOnce(new Error('network'));
  render(<SessionScreen sessionId={id(100)}/>);await pick(1,'B');await pick(2,'A');
  fireEvent.click(await screen.findByRole('button',{name:'Enviar respostas'}));fireEvent.click(await screen.findByRole('button',{name:'Concluir e ver resultado'}));
  expect((await screen.findAllByText('Não conseguimos enviar todas as respostas. Elas continuam guardadas neste navegador; tente de novo.')).length).toBeGreaterThan(0);
  expect(finishSession).not.toHaveBeenCalled();expect(Object.keys(JSON.parse(sessionStorage.getItem(`remoa:session-drafts:${id(100)}`)!))).toHaveLength(2);
  fireEvent.click(screen.getByRole('button',{name:'Concluir e ver resultado'}));await screen.findByText('2 de 2 questões corretas');
  expect(put()[1]![2].mutationId).toBe(put()[0]![2].mutationId);expect(put()).toHaveLength(3);
 });
 it('restores kept answers from the browser after a reload',async()=>{
  sessionStorage.setItem(`remoa:session-drafts:${id(100)}`,JSON.stringify({[id(11)]:{selectedKey:'B',mutationId:id(900),elapsedMs:10}}));
  render(<SessionScreen sessionId={id(100)}/>);expect(await screen.findByText('Enunciado sintético 2')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Abrir questão 1, respondida'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Questão anterior'}));expect(await screen.findByRole('radio',{name:/Alternativa B1/})).toBeChecked();
 });
 it('heart favorites the question and turns pressed',async()=>{
  render(<SessionScreen sessionId={id(100)}/>);fireEvent.click(await screen.findByRole('button',{name:'Favoritar questão',pressed:false}));
  expect(await screen.findByRole('button',{name:'Favoritar questão',pressed:true})).toBeInTheDocument();expect(saveUserState).toHaveBeenCalledWith(id(1),{favorite:true});
 });
 it('doubt dialog uses the design-system checkbox and closes on save',async()=>{
  render(<SessionScreen sessionId={id(100)}/>);fireEvent.click(await screen.findByRole('button',{name:'Marcar dúvida'}));
  const dialog=await screen.findByRole('dialog',{name:'Marcar dúvida'});const box=within(dialog).getByRole('checkbox',{name:'Tenho dúvida nesta questão'});expect(box).toHaveAttribute('data-state','checked');
  fireEvent.change(within(dialog).getByLabelText('Anotação pessoal'),{target:{value:'Revisar critério'}});fireEvent.click(within(dialog).getByRole('button',{name:'Salvar marcação'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(saveUserState).toHaveBeenCalledWith(id(1),{doubtful:true,annotation:'Revisar critério'});
  expect(screen.getByText('Revisar critério')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Editar dúvida marcada'})).toBeInTheDocument();
 });
 it('AI origin pill is blue with the AI icon',async()=>{render(<SessionScreen sessionId={id(100)}/>);const pill=await screen.findByText('Gerada por IA');expect(pill.className).toContain('bg-ai-bg');expect(pill.querySelector('svg')).not.toBeNull();});
});

describe('G29 result banner',()=>{
 const finished=()=>({...current,status:'finished' as const,finishedAt:new Date()});
 it('below 70% shows the red banner',()=>{render(<SessionResult session={finished()} report={report(1,3)}/>);const banner=screen.getByRole('region',{name:'1 de 3 questões corretas'});expect(banner.className).toContain('bg-danger-bg');expect(within(banner).getByText('33% de acertos')).toBeInTheDocument();expect(within(banner).getByText(/Abaixo de 70%/)).toBeInTheDocument();});
 it('70% or more stays positive',()=>{render(<SessionResult session={finished()} report={report(7,10)}/>);const banner=screen.getByRole('region',{name:'7 de 10 questões corretas'});expect(banner.className).not.toContain('bg-danger-bg');expect(within(banner).getByText(/Bom resultado/)).toBeInTheDocument();});
});
