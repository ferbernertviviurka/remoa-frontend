import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor,within} from '@testing-library/react';
import {mockQuestionSessionsPage} from '@remoa/contracts/mocks';
import {ExamsScreen} from './exams-screen';
vi.mock('./api',async o=>({...await o<typeof import('./api')>(),listExamCourses:vi.fn().mockResolvedValue([]),listExamCatalog:vi.fn().mockResolvedValue({items:[],total:0,nextCursor:null}),getExam:vi.fn()}));
vi.mock('@/features/exam-builder/train-topic-link',()=>({AiExamLink:()=>null,aiExamHref:'/app/banco-de-questoes/prova?source=ai'}));
vi.mock('./session-history-api',()=>({listSessionHistory:vi.fn()}));
import {listSessionHistory} from './session-history-api';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
beforeEach(()=>{vi.mocked(listSessionHistory).mockResolvedValue({nextCursor:null,items:[{...mockQuestionSessionsPage.items[0]!,id:id(1),status:'active',mode:'simulation'},{...mockQuestionSessionsPage.items[0]!,id:id(2),status:'finished',mode:'study'}]});});afterEach(cleanup);
it('lists started and finished sessions on /app/provas with resume and result links',async()=>{
 render(<ExamsScreen/>);
 const section=await screen.findByRole('region',{name:'Minhas provas e simulados'});
 const links=within(section).getAllByRole('link');
 expect(links.map(l=>l.getAttribute('href'))).toEqual(expect.arrayContaining([`/app/simulados/${id(1)}`,`/app/simulados/${id(2)}`,'/app/simulados']));
 expect(within(section).getByRole('link',{name:'Continuar sessão'})).toBeInTheDocument();
 expect(within(section).getByRole('link',{name:'Ver resultado'})).toBeInTheDocument();
 await waitFor(()=>expect(listSessionHistory).toHaveBeenCalledWith({limit:20},expect.anything()));
});
