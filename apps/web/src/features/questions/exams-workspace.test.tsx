import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ExamPaperPublic} from '@remoa/contracts';
import {mockQuestionSessionsPage,mockQuestionSession,mockCatalogQuestion} from '@remoa/contracts/mocks';
import {ExamsScreen,ExamDetailScreen} from './exams-screen';
vi.mock('./api',async original=>({...await original<typeof import('./api')>(),getExam:vi.fn(),createSession:vi.fn(),listExamCourses:vi.fn().mockResolvedValue([]),listExamCatalog:vi.fn()}));
vi.mock('./session-history-api',()=>({listSessionHistory:vi.fn()}));
import {listExamCatalog,getExam,createSession,listExamCourses} from './api';
const push=vi.fn();
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
import {listSessionHistory} from './session-history-api';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const paper=(n:number,name:string,institution:string,year:number):ExamPaperPublic=>({id:id(n),name,institution,year,edition:'Única',booklet:'A',sourceId:id(40+n),version:1,durationSec:7200,questionCount:40,status:'published'});
const papers=[paper(1,'Residência multiprofissional','Instituição Alfa',2025),paper(2,'Residência médica','Instituição Beta',2024)];
beforeEach(()=>{push.mockClear();vi.mocked(getExam).mockReset();vi.mocked(createSession).mockReset().mockResolvedValue(mockQuestionSession);vi.mocked(listExamCourses).mockResolvedValue([]);vi.mocked(listExamCatalog).mockReset().mockResolvedValue({items:[],total:0,nextCursor:null});vi.mocked(listSessionHistory).mockReset().mockResolvedValue({items:[],nextCursor:null});});
afterEach(cleanup);
it('offers the real catalog builder first and keeps the AI origin explicit, with honest zero papers',async()=>{
 render(<ExamsScreen/>);
 expect(screen.getByRole('link',{name:'Criar prova personalizada'})).toHaveAttribute('href','/app/banco-de-questoes/prova');
 expect(screen.getByRole('link',{name:'Gerar com IA'})).toHaveAttribute('href','/app/banco-de-questoes/prova?source=ai');
 await screen.findByText('Ainda não há provas de origem disponíveis.');
 expect(screen.getByText(/seleções por prova de origem aparecem aqui quando publicadas/)).toBeInTheDocument();
 expect(screen.queryByText('A administração está trabalhando nisso')).toBeNull();
 expect(screen.getByRole('link',{name:'Explorar banco de questões'})).toHaveAttribute('href','/app/banco-de-questoes');
});
it('starts paper and saved-session requests independently; a paper failure does not hide saved work',async()=>{
 vi.mocked(listExamCatalog).mockRejectedValue(new Error('network'));
 vi.mocked(listSessionHistory).mockResolvedValue(mockQuestionSessionsPage);
 render(<ExamsScreen/>);
 await screen.findByRole('alert');
 expect(listExamCatalog).toHaveBeenCalledWith({limit:25},expect.any(AbortSignal));
 expect(listSessionHistory).toHaveBeenCalledWith({limit:20},expect.any(AbortSignal));
 expect(await screen.findByRole('link',{name:'Continuar sessão'})).toHaveAttribute('href',expect.stringContaining('/app/simulados/'));
 expect(screen.queryByText('Ainda não há provas de origem disponíveis.')).toBeNull();
 vi.mocked(listExamCatalog).mockImplementation(async query=>{const items=papers.filter(p=>`${p.name} ${p.institution}`.toLowerCase().includes((query.search??'').toLowerCase()));return {items,total:items.length,nextCursor:null};});
 fireEvent.click(within(screen.getByRole('alert')).getByRole('button',{name:'Tentar de novo'}));
 await screen.findByRole('heading',{name:'Residência médica'});
 expect(screen.queryByRole('alert')).toBeNull();
});
it('searches real papers and distinguishes no matches from an empty collection',async()=>{
 vi.mocked(listExamCatalog).mockImplementation(async query=>{const items=papers.filter(p=>`${p.name} ${p.institution}`.toLowerCase().includes((query.search??'').toLowerCase()));return {items,total:items.length,nextCursor:null};});
 render(<ExamsScreen/>);
 const search=await screen.findByRole('searchbox',{name:'Buscar instituição ou prova'});
 fireEvent.change(search,{target:{value:'Beta'}});
 await vi.waitFor(()=>expect(vi.mocked(listExamCatalog).mock.calls.at(-1)?.[0]).toMatchObject({search:'Beta'}));
 await screen.findByRole('heading',{name:'Residência médica'});
 expect(screen.queryByRole('heading',{name:'Residência multiprofissional'})).toBeNull();
 fireEvent.change(search,{target:{value:'inexistente'}});
 await screen.findByText('Nenhuma prova de origem encontrada');
 expect(screen.queryByText('Ainda não há provas de origem disponíveis.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));
 expect(await screen.findAllByRole('link',{name:'Abrir caderno'})).toHaveLength(2);
});
it('shows a saved-history failure with retry instead of claiming the student has no attempts',async()=>{
 vi.mocked(listSessionHistory).mockRejectedValue(new Error('network'));
 render(<ExamsScreen/>);
 const region=screen.getByRole('region',{name:'Minhas provas e simulados'});
 await within(region).findByRole('alert');
 expect(within(region).queryByText('Você ainda não fez provas nem simulados.')).toBeNull();
 vi.mocked(listSessionHistory).mockResolvedValue({items:[],nextCursor:null});
 fireEvent.click(within(region).getByRole('button',{name:'Tentar de novo'}));
 await within(region).findByText('Você ainda não fez provas nem simulados.');
});
it('aborts both requests on unmount and prevents a late paper reply from replacing a new screen',async()=>{
 let late!:(value:{items:ExamPaperPublic[];total:number;nextCursor:null})=>void;
 vi.mocked(listExamCatalog).mockReturnValueOnce(new Promise(resolve=>{late=resolve;}));
 const first=render(<ExamsScreen/>);
 const signal=vi.mocked(listExamCatalog).mock.calls[0]![1]!;
 const historySignal=vi.mocked(listSessionHistory).mock.calls[0]![1]!;
 first.unmount();expect(signal.aborted).toBe(true);expect(historySignal?.aborted).toBe(true);
 render(<ExamsScreen/>);await screen.findByText('Ainda não há provas de origem disponíveis.');
 late({items:papers,total:2,nextCursor:null});expect(screen.queryByRole('heading',{name:'Residência médica'})).toBeNull();
});

it('keeps the first page on pagination failure and retries the same cursor without duplicating items',async()=>{
 vi.mocked(listExamCatalog).mockResolvedValueOnce({items:[papers[0]!],total:2,nextCursor:'next'}).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({items:papers,total:2,nextCursor:null});
 render(<ExamsScreen/>);await screen.findByRole('heading',{name:'Residência multiprofissional'});
 fireEvent.click(screen.getByRole('button',{name:'Carregar mais provas de origem'}));
 const error=await screen.findByRole('alert');expect(screen.getByRole('heading',{name:'Residência multiprofissional'})).toBeInTheDocument();
 fireEvent.click(within(error).getByRole('button',{name:'Tentar de novo'}));
 await screen.findByRole('heading',{name:'Residência médica'});
 expect(screen.getAllByRole('link',{name:'Abrir caderno'})).toHaveLength(2);
 expect(vi.mocked(listExamCatalog).mock.calls[2]![0]).toMatchObject({cursor:'next',limit:25});
});
it('shows partial source coverage and starts only the explicit scorable count, without claiming a complete original paper',async()=>{
 vi.mocked(getExam).mockResolvedValue({paper:{...papers[0]!,questionCount:12,professionCode:'nursing',coverage:{kind:'source_excerpt',expectedQuestionCount:null,availableQuestionCount:12,scorableQuestionCount:9}},questions:[{...mockCatalogQuestion,occurrences:{items:[{examId:id(1),name:'Seleção de origem',institution:'Fonte sintética',year:2025,edition:'Única',booklet:'A',ordinal:2,originalNumber:'97',sourceId:id(50),sourceLabel:'Fonte sintética'}],total:1,truncated:false}}]});
 render(<ExamDetailScreen examId={id(1)}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Treinar com 9 questões'}));
 const dialog=await screen.findByRole('dialog');
 expect(within(dialog).getByRole('spinbutton',{name:'Quantidade de questões'})).toHaveValue(9);
 expect(within(dialog).getByText('Seleção parcial')).toBeInTheDocument();
 expect(screen.getAllByText('Número original: 97').length).toBeGreaterThan(0);
 expect(screen.queryByText('Número original: 1')).toBeNull();
 expect(screen.queryByText('A ordem e a numeração do caderno são preservadas.')).toBeNull();
 expect(screen.getByText(/anuladas ou com pendências/)).toBeInTheDocument();
 fireEvent.click(within(dialog).getByRole('button',{name:'Começar sessão'}));
 await vi.waitFor(()=>expect(createSession).toHaveBeenCalledWith(expect.objectContaining({examId:id(1),count:9,mode:'study'}),expect.any(String)));
 expect(push).toHaveBeenCalledWith(`/app/simulados/${mockQuestionSession.id}`);
});
it('limits a large partial selection to 200 explicitly and disables a zero-scorable selection',async()=>{
 vi.mocked(getExam).mockResolvedValue({paper:{...papers[0]!,questionCount:300,coverage:{kind:'source_excerpt',expectedQuestionCount:null,availableQuestionCount:300,scorableQuestionCount:250}},questions:[]});
 const view=render(<ExamDetailScreen examId={id(1)}/>);
 expect(await screen.findByRole('button',{name:'Treinar com 200 questões'})).toBeEnabled();
 expect(screen.getByText(/Cada treino reúne até 200/)).toBeInTheDocument();view.unmount();
 vi.mocked(getExam).mockResolvedValue({paper:{...papers[0]!,questionCount:10,coverage:{kind:'source_excerpt',expectedQuestionCount:null,availableQuestionCount:10,scorableQuestionCount:0}},questions:[]});
 render(<ExamDetailScreen examId={id(1)}/>);
 expect(await screen.findByRole('button',{name:'Treinar com 0 questões'})).toBeDisabled();
 expect(screen.getByText('Esta seleção está disponível apenas para consulta.')).toBeInTheDocument();
});
it('exposes course-reference failure separately and retries it without converting the paper catalog to an empty error state',async()=>{
 vi.mocked(listExamCatalog).mockResolvedValue({items:papers,total:2,nextCursor:null});vi.mocked(listExamCourses).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
 render(<ExamsScreen/>);const alert=await screen.findByRole('alert');
 expect(within(alert).getByText('Não conseguimos carregar os cursos para filtrar')).toBeInTheDocument();
 expect(await screen.findByRole('heading',{name:'Residência médica'})).toBeInTheDocument();
 fireEvent.click(within(alert).getByRole('button',{name:'Tentar de novo'}));
 await vi.waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
});

it('filters the entire catalog by the chosen course and resets the cursor rather than filtering one loaded page',async()=>{
 Element.prototype.scrollIntoView??=()=>undefined;
 vi.mocked(listExamCourses).mockResolvedValue([{code:'nursing',name:'Enfermagem',aliases:['enf'],kind:'course',councilCode:'COREN',suggestedGoals:[]}]);
 vi.mocked(listExamCatalog).mockResolvedValue({items:papers,total:841,nextCursor:'old-cursor'});
 render(<ExamsScreen/>);await screen.findByRole('heading',{name:'Residência médica'});
 fireEvent.keyDown(screen.getByRole('combobox',{name:'Curso'}),{key:'Enter'});
 const option=await screen.findByRole('option',{name:'Enfermagem'});fireEvent.keyDown(option,{key:'Enter'});
 await vi.waitFor(()=>expect(vi.mocked(listExamCatalog).mock.calls.at(-1)?.[0]).toEqual({limit:25,course:'nursing'}));
});
it('keeps the personalized builder hidden when its route flag is closed',async()=>{
 render(<ExamsScreen builderEnabled={false}/>);await screen.findByText('Ainda não há provas de origem disponíveis.');
 expect(screen.queryByRole('link',{name:'Criar prova personalizada'})).toBeNull();
 expect(screen.queryByRole('link',{name:'Gerar com IA'})).toBeNull();
});
