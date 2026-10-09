import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {questionSessionPublicSchema,questionSessionReportSchema,questionSessionRecalculationSchema} from '@remoa/contracts';
import {SessionResult} from './session-result';
import {SessionScreen} from './session-screen';
import {SubjectResults} from './subject-results';
import {RecalculationPanel} from './recalculation-panel';
import {listQuestionTaxonomy,getSessionRecalculation,createSession,getSession,getReport} from './api';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('./api',async original=>({...await original<typeof import('./api')>(),listQuestionTaxonomy:vi.fn(),getSessionRecalculation:vi.fn(),createSession:vi.fn(),addSessionCardsToReview:vi.fn(),getSession:vi.fn(),getReport:vi.fn()}));
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const question=(n:number)=>({id:id(n),canonicalId:id(n),version:1,type:'objective',stem:`Enunciado autoral sintético ${n}`,alternatives:[{key:'A',text:'Alternativa um'},{key:'B',text:'Alternativa dois'}],origin:'official_exam',visibility:'public',availability:'active',difficulty:'medium',topicId:id(90),areaId:id(91),sourceId:null,sourceLabel:null,reviewed:true,assets:[],boardId:null,cardIds:[],createdAt:new Date()});
const reference=(n:number)=>({questionId:id(n),version:1,correctKey:'A',explanation:`Comentário sintético ${n}`,distractorNotes:null,annulled:false,reviewed:true,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01',sourceUrl:null,obsolete:false});
const session=questionSessionPublicSchema.parse({id:id(100),mode:'simulation',status:'finished',revision:3,startedAt:new Date(),deadline:null,finishedAt:new Date(),serverTime:new Date(),items:[
 {id:id(11),position:0,question:{...question(1),assets:[{id:id(80),alt:'Figura autoral de relação entre partes',url:'https://example.com/authorized.png',provenance:null}]},originalNumber:'03',selectedKey:'B',answered:true,doubtful:false,revision:1},
 {id:id(12),position:1,question:question(2),originalNumber:'05',selectedKey:null,answered:true,doubtful:false,revision:1},
 {id:id(13),position:2,question:{...question(3),topicId:null,areaId:null},originalNumber:null,selectedKey:null,answered:false,doubtful:false,revision:0},
 {id:id(14),position:3,question:{...question(4),availability:'annulled'},originalNumber:'08',selectedKey:'A',answered:true,doubtful:false,revision:1},
]});
const report=questionSessionReportSchema.parse({sessionId:session.id,version:1,correct:0,incorrect:2,unanswered:1,annulled:1,denominator:3,score:0,items:[
 {itemId:id(11),result:'incorrect',reference:{...reference(1),distractorNotes:{B:'Comentário revisado da alternativa dois'},obsolete:true}},
 {itemId:id(12),result:'incorrect',reference:reference(2)},
 {itemId:id(13),result:'unanswered',reference:reference(3)},
 {itemId:id(14),result:'annulled',reference:{...reference(4),correctKey:null,annulled:true}},
]});
const partial=questionSessionRecalculationSchema.parse({sessionId:session.id,originalVersion:1,calculatedAt:new Date(),complete:false,aggregates:null,items:[{itemId:id(11),originalQuestionId:id(1),originalQuestionVersion:1,comparedQuestionId:id(101),comparedQuestionVersion:2,outcome:'not_comparable',reasonCode:'content_not_comparable',reference:null}]});
beforeEach(()=>{vi.mocked(listQuestionTaxonomy).mockImplementation(async kind=>kind==='topic'?[{id:id(90),name:'Interpretação sintética'}]:[{id:id(91),name:'Área autoral'}]);vi.mocked(getSessionRecalculation).mockResolvedValue(partial);});
afterEach(()=>{cleanup();vi.resetAllMocks();});
describe('finished report review',()=>{
 it('shows selections, authorized figure, distractors and distinct do not know/unanswered states',async()=>{
  render(<SessionResult session={session} report={report}/>);await screen.findByText('Interpretação sintética');
  const first=within(screen.getByRole('article',{name:'Questão 1'}));
  expect(first.getByText('Número original: 03')).toBeInTheDocument();expect(first.getByText('Sua resposta: B')).toBeInTheDocument();expect(first.getByText('Sua alternativa')).toBeInTheDocument();expect(first.getByText('Alternativa correta')).toBeInTheDocument();
  expect(first.getByRole('img',{name:'Figura autoral de relação entre partes'})).toHaveAttribute('src','https://example.com/authorized.png');expect(first.getByText(/Comentário revisado da alternativa dois/)).toBeInTheDocument();expect(first.getByText('Existe uma versão mais recente')).toBeInTheDocument();
  expect(within(screen.getByRole('article',{name:'Questão 2'})).getByText('Você marcou Não sei.')).toBeInTheDocument();expect(within(screen.getByRole('article',{name:'Questão 3'})).getByText('Você não respondeu esta questão.')).toBeInTheDocument();
  expect(within(screen.getByRole('article',{name:'Questão 4'})).queryByText(/Gabarito:/)).not.toBeInTheDocument();expect(screen.queryByRole('radio')).not.toBeInTheDocument();expect(screen.getByText('0 de 3 questões corretas')).toBeInTheDocument();
 });
 it('groups report outcomes by subject, excluding annulled from denominators',async()=>{
  render(<SessionResult session={session} report={report}/>);await screen.findByText('Interpretação sintética');const subjects=within(screen.getByRole('region',{name:'Resultado por assunto'}));
  expect(subjects.getByText('Acertos: 0 · Questões válidas: 2')).toBeInTheDocument();expect(subjects.getByText('1 anulada')).toBeInTheDocument();expect(subjects.getByText('Sem classificação por assunto')).toBeInTheDocument();expect(subjects.getByText('Acertos: 0 · 1 questão válida')).toBeInTheDocument();expect(subjects.queryByText(id(90))).not.toBeInTheDocument();
 });
 it('identifies the original question in partial recalculation without replacing historical score',async()=>{
  render(<SessionResult session={session} report={report}/>);await screen.findByText('Interpretação sintética');expect(getSessionRecalculation).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Comparar com versões atuais'}));
  const comparison=within(screen.getByRole('region',{name:'Comparação com o acervo atual'}));await comparison.findByText('A comparação está incompleta. Não há uma nova nota para esta tentativa.');expect(comparison.getByRole('heading',{name:'Questão 1'})).toBeInTheDocument();expect(comparison.getByText('Número original: 03')).toBeInTheDocument();expect(comparison.getByText('Enunciado autoral sintético 1')).toBeInTheDocument();expect(comparison.queryByText(/Gabarito:/)).not.toBeInTheDocument();expect(comparison.queryByText(/de .* questão/)).not.toBeInTheDocument();expect(screen.getByText('0 de 3 questões corretas')).toBeInTheDocument();
 });
 it('retains the figure description on an image error',async()=>{
  render(<SessionResult session={session} report={report}/>);await screen.findByText('Interpretação sintética');fireEvent.error(screen.getByRole('img'));expect(screen.getByText('Não conseguimos mostrar esta imagem. A descrição permanece disponível.')).toBeInTheDocument();expect(screen.getByText('Figura autoral de relação entre partes')).toBeInTheDocument();
 });
 it('does not render or fetch results while active',()=>{
  render(<SessionResult session={{...session,status:'active',finishedAt:null}} report={report}/>);expect(screen.queryByText('Resultado por assunto')).not.toBeInTheDocument();expect(document.body.textContent).not.toContain('Comentário sintético');expect(listQuestionTaxonomy).not.toHaveBeenCalled();
 });
 it('preserves results after retry creation fails',async()=>{
  vi.mocked(createSession).mockRejectedValue(new Error('network'));render(<SessionResult session={session} report={report}/>);await screen.findByText('Interpretação sintética');fireEvent.click(screen.getByRole('button',{name:'Refazer erros'}));await screen.findByRole('alert');expect(screen.getByText('0 de 3 questões corretas')).toBeInTheDocument();expect(createSession).toHaveBeenCalledWith({mode:'study',questionIds:[id(1),id(2)],count:2,timerSec:null,shuffle:false},expect.any(String));
 });
});
describe('taxonomy and comparison boundaries',()=>{
 it('does not let an old report replace the active attempt after route identity changes',async()=>{
  let release!:(value:typeof report)=>void;
  vi.mocked(getSession).mockResolvedValueOnce(session).mockResolvedValueOnce({...session,id:id(200),status:'active',finishedAt:null,items:[{...session.items[0]!,answered:false,selectedKey:null}]});
  vi.mocked(getReport).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  const view=render(<SessionScreen sessionId={session.id}/>);await waitFor(()=>expect(getReport).toHaveBeenCalledWith(session.id));
  view.rerender(<SessionScreen sessionId={id(200)}/>);await screen.findByRole('radio',{name:/Alternativa um/});
  await act(async()=>{release(report);});expect(screen.getByRole('radio',{name:/Alternativa um/})).toBeEnabled();expect(screen.queryByText('Resultado por assunto')).not.toBeInTheDocument();expect(screen.queryByText('Comentário sintético 1')).not.toBeInTheDocument();
 });

 it('preserves counts and unknown labels on failed taxonomy; retries without displaying UUIDs',async()=>{
  vi.mocked(listQuestionTaxonomy).mockRejectedValueOnce(new Error('network'));render(<SubjectResults session={session} report={report}/>);await screen.findByRole('alert');expect(screen.getByText('Assunto não identificado')).toBeInTheDocument();expect(screen.getByText('Acertos: 0 · Questões válidas: 2')).toBeInTheDocument();expect(document.body.textContent).not.toContain(id(90));fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByText('Interpretação sintética');
 });
 it('does not turn a missing topic name into a zero count',async()=>{
  vi.mocked(listQuestionTaxonomy).mockResolvedValue([]);render(<SubjectResults session={session} report={report}/>);await waitFor(()=>expect(screen.queryByRole('status')).not.toBeInTheDocument());expect(screen.getByText('Assunto não identificado')).toBeInTheDocument();expect(screen.getByText('Acertos: 0 · Questões válidas: 2')).toBeInTheDocument();
 });
 it('shows no score for a subject with only annulled questions',async()=>{
  render(<SubjectResults session={{...session,items:[session.items[3]!]}} report={{...report,items:[report.items[3]!]}}/>);await screen.findByText('Interpretação sintética');expect(screen.getByText('Nenhuma questão válida para pontuação neste assunto.')).toBeInTheDocument();expect(screen.queryByText(/Acertos:/)).not.toBeInTheDocument();expect(screen.getByText('1 anulada')).toBeInTheDocument();
 });
 it('ignores stale taxonomy after switching attempts',async()=>{
  let release!:(value:Awaited<ReturnType<typeof listQuestionTaxonomy>>)=>void;const previous=new Promise<Awaited<ReturnType<typeof listQuestionTaxonomy>>>(resolve=>{release=resolve;});vi.mocked(listQuestionTaxonomy).mockImplementationOnce(()=>previous);
  const view=render(<SubjectResults session={session} report={report}/>);view.rerender(<SubjectResults session={{...session,id:id(200)}} report={{...report,sessionId:id(200)}}/>);await screen.findByText('Interpretação sintética');await act(async()=>{release([{id:id(91),name:'Nome antigo indevido'}]);});expect(screen.queryByText('Nome antigo indevido')).not.toBeInTheDocument();
 });
 it('ignores a stale comparison response after session changes',async()=>{
  let release!:(value:typeof partial)=>void;vi.mocked(getSessionRecalculation).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const view=render(<RecalculationPanel sessionId={session.id} items={session.items}/>);fireEvent.click(screen.getByRole('button',{name:'Comparar com versões atuais'}));view.rerender(<RecalculationPanel sessionId={id(200)} items={[]}/>);await act(async()=>{release(partial);});expect(screen.queryByText('Conteúdo não comparável')).not.toBeInTheDocument();
 });
 it('retries a failed comparison without inventing aggregates',async()=>{
  vi.mocked(getSessionRecalculation).mockRejectedValueOnce(new Error('network'));render(<RecalculationPanel sessionId={session.id} items={session.items}/>);fireEvent.click(screen.getByRole('button',{name:'Comparar com versões atuais'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Comparar com versões atuais'}));await screen.findByText('Conteúdo não comparável');
 });
 it('wraps the full long stem and preserves its final negation',async()=>{
  const stem='x'.repeat(19980)+' NÃO se aplica.';const long={...session,items:[{...session.items[0]!,question:{...session.items[0]!.question,stem,alternatives:[{key:'A' as const,text:'https://example.com/'+ 'x'.repeat(200)},{key:'B' as const,text:'Não se aplica'}]}}]};render(<SessionResult session={long} report={{...report,items:[report.items[0]!]}}/>);await screen.findByText('Interpretação sintética');expect(screen.getByText(stem)).toHaveClass('break-words','whitespace-pre-wrap');expect(screen.getByText(stem)).toHaveTextContent(/NÃO se aplica\.$/);
 });
});
