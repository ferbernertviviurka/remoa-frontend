import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {BuilderScreen} from './builder-screen';

const ID=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const SEED='a'.repeat(32);const AREA=ID(900);
const push=vi.fn();
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
vi.mock('next/link',()=>({default:({href,...p}:{href:string})=><a href={href} {...p}/>}));

type Call={path:string;init?:RequestInit};
let calls:Call[];let available:number;let pool:number;let startResults:Array<{ok:true;data:unknown}|{ok:false;error:{code:string;message:string}}>;let templateReply:'ok'|'limit';let revalidateReply:{ok:boolean;unavailable:string[];updated:{id:string;latestId:string}[]};
const item=(n:number,pinned=false)=>({questionId:ID(n),canonicalId:ID(n),version:1,areaId:AREA,topicId:null,origin:'official_exam',difficulty:'medium',stemPreview:`Enunciado sintético ${n}`,sourceLabel:null,validation:null,pinned});
const body=(c:Call)=>JSON.parse(String(c.init?.body));
const last=(p:string)=>[...calls].reverse().find(c=>c.path===p);
const session={id:ID(700),mode:'study',status:'active',revision:1,startedAt:new Date().toISOString(),deadline:null,finishedAt:null,serverTime:new Date().toISOString(),items:[]};

vi.mock('@/lib/api',()=>({api:vi.fn(async(path:string,init?:RequestInit)=>{
  calls.push({path,init});
  if(path.startsWith('/v1/challenge-ai/taxonomy'))return {ok:true,data:[{id:AREA,name:'Clínica Médica'}]};
  if(path==='/v1/exam-templates'&&!init?.method)return {ok:true,data:{items:[],limit:3}};
  if(path==='/v1/exam-templates')return templateReply==='limit'?{ok:false,error:{code:'limit_reached',message:'limit_reached'}}:{ok:true,data:{id:ID(800),name:'x',params:JSON.parse(String(init!.body)).params,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}};
  if(path==='/v1/exam-builder/availability')return {ok:true,data:{total:available,areas:[{areaId:AREA,available}]}};
  if(path==='/v1/exam-builder/preview'){
    const b=JSON.parse(String(init!.body));const n=Math.min(b.params.count,pool);const ids=[...b.pinnedIds.map((id:string)=>Number(id.slice(-12)))];
    for(let i=1;ids.length<n;i++)if(!ids.includes(i)&&!b.excludedIds.includes(ID(i)))ids.push(i);
    return {ok:true,data:{seed:SEED,allocation:{rows:[{areaId:AREA,available,target:b.params.count,allocated:n}],requested:b.params.count,allocated:n,shortfall:b.params.count-n},items:ids.slice(0,n).map(i=>item(i,b.pinnedIds.includes(ID(i))))}};
  }
  if(path==='/v1/exam-builder/swap')return {ok:true,data:{item:item(50)}};
  if(path==='/v1/exam-builder/revalidate')return {ok:true,data:revalidateReply};
  if(path==='/v1/question-sessions')return startResults.shift()??{ok:true,data:session};
  return {ok:false,error:{code:'not_found',message:path}};
})}));

beforeEach(()=>{calls=[];available=100;pool=100;startResults=[];templateReply='ok';revalidateReply={ok:true,unavailable:[],updated:[]};push.mockClear();sessionStorage.clear();});
afterEach(cleanup);
const init={ids:[],matrixItemIds:[]};
const ready=async()=>{await screen.findByText('Enunciado sintético 1');};
const previews=()=>calls.filter(c=>c.path==='/v1/exam-builder/preview').map(body);

describe('presets (FR-22)',()=>{
  it('ENAMED applies 100 questions, simulado, 3 min and is marked as approximation',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:/Formato ENAMED/}));
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:100,mode:'simulation',timePerQuestionSec:180,distribution:'balanced'}}));
    expect(screen.getByText(/Aproximação/)).toBeTruthy();
  });
  it('Treino rápido and Revisar meus erros set progress and count',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:/Treino rápido/}));
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:10,progress:'unseen'}}));
    fireEvent.click(screen.getByRole('button',{name:/Revisar meus erros/}));
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:20,progress:'wrong'}}));
  });
});

describe('shortfall (FR-26)',()=>{
  it('warns "Só deu para reunir X de N" and never completes from AI on its own',async()=>{
    available=3;pool=3;
    render(<BuilderScreen init={init}/>);await ready();
    expect(await screen.findByText('Só deu para reunir 3 de 20')).toBeTruthy();
    expect(previews().every(p=>p.params.source==='catalog')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Aceitar 3'}));
    await waitFor(()=>expect(previews().at(-1).params.count).toBe(3));
    expect(previews().every(p=>p.params.source==='catalog')).toBe(true);
  });
  it('"Incluir minhas perguntas de IA" is an explicit choice',async()=>{
    available=3;pool=3;
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(await screen.findByRole('button',{name:'Incluir minhas perguntas de IA'}));
    await waitFor(()=>expect(previews().at(-1).params.source).toBe('catalog_and_ai'));
  });
});

describe('preview actions (FR-27)',()=>{
  it('shows the first 7 and "e mais n", then every question on demand',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    expect(screen.getAllByRole('listitem').filter(li=>/Enunciado/.test(li.textContent??''))).toHaveLength(7);
    expect(screen.getByText('e mais 13')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Mostrar todas'}));
    expect(screen.getAllByRole('listitem').filter(li=>/Enunciado/.test(li.textContent??''))).toHaveLength(20);
  });
  it('Trocar calls swap and replaces only that question; never shows answer fields',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Trocar a questão 2'}));
    await screen.findByText('Enunciado sintético 50');
    expect(screen.queryByText('Enunciado sintético 2')).toBeNull();
    expect(screen.queryByText(/gabarito|correctKey|explicação/i)).toBeNull();
  });
  it('Remover drops the question and lowers the total; it does not come back on reshuffle',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Remover a questão 1'}));
    expect(screen.queryByText('Enunciado sintético 1')).toBeNull();
    expect(within(screen.getByRole('complementary')).getByText('19')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Sortear de novo'}));
    await waitFor(()=>expect(previews().at(-1).excludedIds).toContain(ID(1)));
  });
  it('Fixar keeps the question on Sortear de novo',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Fixar a questão 3'}));
    expect(screen.getByRole('button',{name:'Desafixar a questão 3'}).getAttribute('aria-pressed')).toBe('true');
    const before=previews().length;
    fireEvent.click(screen.getByRole('button',{name:'Sortear de novo'}));
    await waitFor(()=>expect(previews().length).toBeGreaterThan(before));
    expect(previews().at(-1).pinnedIds).toEqual([ID(3)]);
  });
  it('?ids= from the selection arrive pinned',async()=>{
    render(<BuilderScreen init={{ids:[ID(5),ID(6)],matrixItemIds:[]}}/>);
    await screen.findByText('Enunciado sintético 5');
    expect(previews()[0]).toMatchObject({pinnedIds:[ID(5),ID(6)],params:{count:2}});
    expect(screen.getByRole('button',{name:'Desafixar a questão 1'})).toBeTruthy();
  });
});

describe('Começar (FR-30, FR-32, FR-33)',()=>{
  it('is disabled with 0 questions',async()=>{
    available=0;pool=0;
    render(<BuilderScreen init={init}/>);
    await screen.findByText('Nenhuma questão disponível com esses filtros');
    await waitFor(()=>expect(screen.queryByText('Sorteando questões')).toBeNull());
    expect((screen.getByRole('button',{name:'Começar prova'}) as HTMLButtonElement).disabled).toBe(true);
  });
  it('confirmation states gabarito rule, then POSTs questionIds + builder and navigates',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Começar prova'}));
    expect(await screen.findByText(/gabarito aparece depois de cada questão/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Começar prova'}));
    await waitFor(()=>expect(push).toHaveBeenCalledWith(`/app/simulados/${ID(700)}`));
    const post=last('/v1/question-sessions')!;const b=body(post);
    expect(b.questionIds).toHaveLength(20);expect(b.builder).toMatchObject({seed:SEED,params:{count:20}});
    expect((post.init!.headers as Record<string,string>)['Idempotency-Key']).toMatch(/[0-9a-f-]{36}/);
  });
  it('reuses the same Idempotency-Key when retrying the same preview',async()=>{
    startResults=[{ok:false,error:{code:'internal',message:'boom'}}];
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Começar prova'}));
    const start=()=>fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Começar prova'}));
    start();await screen.findByText(/Não foi possível começar/);start();
    await waitFor(()=>expect(push).toHaveBeenCalled());
    const keys=calls.filter(c=>c.path==='/v1/question-sessions').map(c=>(c.init!.headers as Record<string,string>)['Idempotency-Key']);
    expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  });
  it('409 exam_changed revalidates, shows what changed and lets the user accept',async()=>{
    startResults=[{ok:false,error:{code:'conflict',message:'exam_changed'}}];
    revalidateReply={ok:false,unavailable:[ID(2)],updated:[{id:ID(3),latestId:ID(60)}]};
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Começar prova'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Começar prova'}));
    expect(await screen.findByText('1 saem da prova por não estarem mais disponíveis.')).toBeTruthy();
    expect(screen.getByText('1 foram trocadas pela versão mais recente.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Aceitar mudanças'}));
    await waitFor(()=>expect(screen.queryByText('Enunciado sintético 2')).toBeNull());
    expect(within(screen.getByRole('complementary')).getByText('19')).toBeTruthy();
  });
  it('409 active_session_exists offers Retomar to the running session',async()=>{
    startResults=[{ok:false,error:{code:'conflict',message:`active_session_exists:${ID(333)}`}}];
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Começar prova'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Começar prova'}));
    const link=await screen.findByRole('link',{name:'Retomar prova'});
    expect(link.getAttribute('href')).toBe(`/app/simulados/${ID(333)}`);
  });
});

describe('templates and calendar (FR-29, FR-31, FR-39)',()=>{
  it('saves a template with name and params, not the question list',async()=>{
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Salvar como modelo'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Salvar modelo'}));
    expect(await screen.findByText('Modelo salvo.')).toBeTruthy();
    const b=body(last('/v1/exam-templates')!);expect(Object.keys(b).sort()).toEqual(['name','params']);
  });
  it('shows the plan-limit message on limit_reached',async()=>{
    templateReply='limit';
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(screen.getByRole('button',{name:'Salvar como modelo'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Salvar modelo'}));
    expect(await screen.findByText(/limite de modelos/)).toBeTruthy();
  });
});
