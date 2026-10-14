import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {BuilderScreen} from './builder-screen';

const ID=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const SEED='a'.repeat(32);const AREA=ID(900);const TOPIC=ID(910);const BOARD=ID(920);
const push=vi.fn();
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
vi.mock('next/link',()=>({default:({href,...p}:{href:string})=><a href={href} {...p}/>}));

type Call={path:string;init?:RequestInit};
let genReply:{ok:true;data:unknown}|{ok:false;error:{code:string;message:string}};let tplList:unknown[];let calls:Call[];let available:number;let pool:number;let startResults:Array<{ok:true;data:unknown}|{ok:false;error:{code:string;message:string}}>;let templateReply:'ok'|'limit';let revalidateReply:{ok:boolean;unavailable:string[];updated:{id:string;latestId:string}[]};
const item=(n:number,pinned=false)=>({questionId:ID(n),canonicalId:ID(n),version:1,areaId:AREA,topicId:null,origin:'official_exam',difficulty:'medium',stemPreview:`Enunciado sintético ${n}`,sourceLabel:null,validation:null,pinned});
const body=(c:Call)=>JSON.parse(String(c.init?.body));
const last=(p:string)=>[...calls].reverse().find(c=>c.path===p);
const session={id:ID(700),mode:'study',status:'active',revision:1,startedAt:new Date().toISOString(),deadline:null,finishedAt:null,serverTime:new Date().toISOString(),items:[]};

let progressEvents:unknown[];let boardContent:{cardCount:number;areaIds:string[];topicIds:string[]};
vi.mock('@/lib/api',()=>({api:vi.fn(async(path:string,init?:RequestInit,_f?:unknown,onProgress?:(p:unknown)=>void)=>{
  calls.push({path,init});
  if(path==='/v1/challenge-ai/taxonomy?kind=topic')return {ok:true,data:[{id:TOPIC,name:'Asma'}]};
  if(path.startsWith('/v1/challenge-ai/taxonomy'))return {ok:true,data:[{id:AREA,name:'Clínica Médica'}]};
  if(path==='/v1/boards')return {ok:true,data:[{id:BOARD,title:'Mapa sintético'}]};
  if(path==='/v1/exam-builder/generate'){progressEvents.forEach(p=>onProgress?.(p));return genReply;}
  if(path.startsWith('/v1/exam-builder/board-content'))return {ok:true,data:{boardId:BOARD,matrixItemIds:[],...boardContent}};
  if(path==='/v1/exam-templates'&&!init?.method)return {ok:true,data:{items:tplList,limit:3}};
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

beforeEach(()=>{progressEvents=[];boardContent={cardCount:0,areaIds:[],topicIds:[]};tplList=[];genReply={ok:true,data:{questionIds:[ID(71),ID(72)],requested:2,reused:1,generated:1,shortfall:0,stoppedBy:null,shortfallReason:null}};calls=[];available=100;pool=100;startResults=[];templateReply='ok';revalidateReply={ok:true,unavailable:[],updated:[]};push.mockClear();sessionStorage.clear();});
afterEach(cleanup);
const init={ids:[],matrixItemIds:[]};
const next=()=>fireEvent.click(screen.getByRole('button',{name:'Continuar'}));
const toContent=()=>{next();next();};
const toReview=()=>{next();next();next();next();};
const ready=async()=>{toReview();await screen.findByText('Enunciado sintético 1');};
const h2=(name:string)=>screen.getByRole('heading',{level:2,name});
const choose=(name:RegExp)=>fireEvent.click(screen.getByRole('button',{name}));
// Radix Select scrolls the chosen option into view; jsdom has no scrollIntoView.
beforeAll(()=>Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:vi.fn()}));
const pick=async(label:string,option:string)=>{fireEvent.keyDown(screen.getByRole('combobox',{name:label}),{key:'Enter',code:'Enter'});fireEvent.click(await screen.findByRole('option',{name:option}));};
const previews=()=>calls.filter(c=>c.path==='/v1/exam-builder/preview').map(body);

describe('presets (FR-22)',()=>{
  it('ENAMED applies 100 questions, simulado, 3 min and is marked as approximation',async()=>{
    render(<BuilderScreen init={init}/>);toContent();choose(/Por modo/);
    choose(/Formato ENAMED/);expect(screen.getByText(/Aproximação/)).toBeTruthy();
    next();next();
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:100,mode:'simulation',timePerQuestionSec:180,distribution:'balanced'}}));
  });
  it('Treino rápido and Revisar meus erros set progress and count',async()=>{
    render(<BuilderScreen init={init}/>);toContent();choose(/Por modo/);
    choose(/Treino rápido/);next();next();
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:10,progress:'unseen'}}));
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}));fireEvent.click(screen.getByRole('button',{name:'Voltar'}));
    choose(/Revisar meus erros/);next();next();
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:20,progress:'wrong'}}));
  });
});

describe('stepper navigation and validation (D-1846)',()=>{
  it('order is Prova → Origem → Conteúdo → Formato → Revisar; focus follows each heading and Voltar returns',()=>{
    render(<BuilderScreen init={init}/>);
    expect(h2('Sua prova')).toBeTruthy();
    expect(screen.getByRole('list',{name:'Etapas da prova'}).querySelector('[aria-current="step"]')?.textContent).toContain('Prova');
    next();expect(document.activeElement).toBe(h2('De onde vêm as questões?'));
    next();expect(document.activeElement).toBe(h2('Como filtrar as questões?'));
    next();expect(document.activeElement).toBe(h2('Formato da prova'));
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}));expect(document.activeElement).toBe(h2('Como filtrar as questões?'));
  });
  it('name, map and count are asked once, in step 1; Formato does not repeat them',()=>{
    render(<BuilderScreen init={init}/>);
    expect(screen.getByRole('textbox',{name:'Nome da prova'})).toBeTruthy();
    expect(screen.getByRole('combobox',{name:'Mapa (opcional)'})).toBeTruthy();
    expect(screen.getByRole('spinbutton',{name:'Quantidade de questões'})).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton',{name:'Quantidade de questões'}),{target:{value:'0'}});next();
    expect(screen.getByRole('alert').textContent).toMatch(/1 a 200 questões/);
    fireEvent.click(screen.getByRole('button',{name:'40 questões'}));next();next();next();
    expect(h2('Formato da prova')).toBeTruthy();
    expect(screen.queryByRole('textbox',{name:'Nome da prova'})).toBeNull();
    expect(screen.queryByRole('spinbutton',{name:'Quantidade de questões'})).toBeNull();
    expect(screen.queryByRole('combobox',{name:'Mapa (opcional)'})).toBeNull();
  });
  it('the map is optional; with a map, AI origin needs use-existing or generate',async()=>{
    render(<BuilderScreen init={init}/>);
    next();choose(/Questões da IA/);
    expect(screen.queryByRole('checkbox',{name:/já criou/})).toBeNull(); // no map: the AI generates by theme
    expect(screen.getByText(/A IA cria as 20 questões da prova/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}));
    await pick('Mapa (opcional)','Mapa sintético');next();
    fireEvent.click(screen.getByRole('checkbox',{name:/já criou/}));next();
    expect(screen.getByRole('alert').textContent).toMatch(/usar as questões que a IA já criou, criar novas/);
    fireEvent.click(screen.getByRole('checkbox',{name:/cria questões novas/}));next();
    expect(h2('Como filtrar as questões?')).toBeTruthy();
  });
  it('Por matéria needs at least one topic',async()=>{
    render(<BuilderScreen init={init}/>);toContent();choose(/Por matéria/);next();
    expect(screen.getByRole('alert').textContent).toMatch(/ao menos uma matéria/);
    await pick('Matérias','Asma');next();expect(h2('Formato da prova')).toBeTruthy();
  });
});

describe('filter modes map to params',()=>{
  it('Por especialidade: areas checklist, no topics, params without topics',async()=>{
    render(<BuilderScreen init={init}/>);toContent();
    expect(await screen.findByRole('checkbox',{name:/Clínica Médica · 100 disponíveis/})).toBeTruthy();
    expect(screen.queryByRole('combobox',{name:'Matérias'})).toBeNull();
    next();next();await screen.findByText('Enunciado sintético 1');
    expect(previews().at(-1)).toMatchObject({params:{areaIds:[],topicIds:[],source:'catalog',boardId:null}});
  });
  it('Por matéria sets topicIds (and the availability filter carries them)',async()=>{
    render(<BuilderScreen init={init}/>);toContent();choose(/Por matéria/);await pick('Matérias','Asma');next();next();
    await screen.findByText('Enunciado sintético 1');
    expect(previews().at(-1)).toMatchObject({params:{topicIds:[TOPIC]}});
    expect(body(last('/v1/exam-builder/availability')!)).toMatchObject({topicIds:[TOPIC]});
  });
  it('Totalmente personalizada offers areas, matérias, dificuldade and progresso',async()=>{
    render(<BuilderScreen init={init}/>);toContent();choose(/Totalmente personalizada/);
    expect(await screen.findByRole('checkbox',{name:/Clínica Médica/})).toBeTruthy();
    expect(screen.getByRole('combobox',{name:'Matérias'})).toBeTruthy();
    expect(screen.getByText('Progresso')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Fácil'}));await pick('Matérias','Asma');next();
    expect(screen.queryByText('Dificuldade')).toBeNull(); // already set in the previous step
    next();await screen.findByText('Enunciado sintético 1');
    expect(previews().at(-1)).toMatchObject({params:{difficulties:['easy'],topicIds:[TOPIC]}});
  });
  it('Por especialidade asks for difficulty in the Formato step',()=>{
    render(<BuilderScreen init={init}/>);toContent();next();
    fireEvent.click(screen.getByRole('button',{name:'Difícil'}));expect(screen.getByRole('button',{name:'Difícil'}).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('map as base (D-1846)',()=>{
  const mapFlow=async()=>{render(<BuilderScreen init={init}/>);await pick('Mapa (opcional)','Mapa sintético');next();choose(/Questões da IA/);fireEvent.click(screen.getByRole('checkbox',{name:/cria questões novas/}));next();next();next();};
  it('calls generate only when the button is clicked, with {boardId,count,difficulty}, and pins the ids',async()=>{
    await mapFlow();
    await screen.findByText('Enunciado sintético 1');
    expect(screen.getByText(/limite diário de IA/)).toBeTruthy();
    expect(last('/v1/exam-builder/generate')).toBeUndefined();
    expect(previews().at(-1)).toMatchObject({params:{source:'ai',boardId:BOARD}});
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    await screen.findByText('Prontas e fixadas na prova: 1 reaproveitadas e 1 novas.');
    expect(body(last('/v1/exam-builder/generate')!)).toEqual({boardId:BOARD,count:20,difficulty:'mixed'});
    expect(calls.filter(c=>c.path==='/v1/exam-builder/generate')).toHaveLength(1);
    expect(screen.queryByRole('button',{name:'Gerar 20 questões com IA'})).toBeNull(); // no second charge by a repeat click
    await waitFor(()=>expect(previews().at(-1).pinnedIds).toEqual([ID(71),ID(72)]));
    expect(screen.getByRole('button',{name:'Desafixar a questão 1'})).toBeTruthy();
  });
  it('shows the daily-limit message when the AI quota ran out and keeps what exists',async()=>{
    genReply={ok:true,data:{questionIds:[ID(71)],requested:10,reused:1,generated:0,shortfall:9,stoppedBy:'quota',shortfallReason:'quota'}};
    await mapFlow();await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    expect(await screen.findByText(/limite diário de IA do seu plano acabou/)).toBeTruthy();
    expect(screen.getByText('Reunimos 1 de 10 questões')).toBeTruthy();
    expect(screen.queryByRole('button',{name:/Gerar mais/})).toBeNull(); // quota is over: no point offering more
    // the preview reloads with the pinned ids right after generating; Começar is enabled again once it is ready
    await waitFor(()=>expect((screen.getByRole('button',{name:'Começar prova'}) as HTMLButtonElement).disabled).toBe(false));
  });
  it('an empty map (empty_scope) says what to do instead of a generic error',async()=>{
    genReply={ok:false,error:{code:'validation',message:'empty_scope'}};
    await mapFlow();await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    expect(await screen.findByText(/ainda não tem cards para a IA usar/)).toBeTruthy();
  });
  it('a quota error from the API is also explained',async()=>{
    genReply={ok:false,error:{code:'quota_exceeded',message:'ai_question_batches'}};
    await mapFlow();await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    expect(await screen.findByText(/limite diário de IA acabou/)).toBeTruthy();
  });
  it('only-existing questions: no generate card; Banco + IA asks for a map and shows the card',async()=>{
    render(<BuilderScreen init={init}/>);await pick('Mapa (opcional)','Mapa sintético');next();choose(/Questões da IA/);next();next();next();
    await screen.findByText('Enunciado sintético 1');
    expect(screen.queryByText('Questões novas da IA')).toBeNull();
    expect(previews().at(-1)).toMatchObject({params:{source:'ai',boardId:BOARD}});
    cleanup();calls=[];
    render(<BuilderScreen init={init}/>);await pick('Mapa (opcional)','Mapa sintético');next();choose(/Banco e questões novas/);next();next();next();await screen.findByText('Enunciado sintético 1');
    expect(previews().at(-1)).toMatchObject({params:{source:'catalog_and_ai',boardId:BOARD}});
    expect(screen.getByRole('button',{name:'Gerar 10 questões com IA'})).toBeTruthy();
  });
  it('without a map the AI needs a theme (areas/matérias) in Conteúdo',async()=>{
    render(<BuilderScreen init={init}/>);next();choose(/Questões da IA/);next();
    expect(screen.getByRole('heading',{name:'Tema das questões'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:/Por modo/})).toBeNull();
    next();expect(screen.getByRole('alert').textContent).toMatch(/ao menos uma área ou matéria/);
    fireEvent.click(await screen.findByRole('checkbox',{name:'Clínica Médica'}));next();
    expect(h2('Formato da prova')).toBeTruthy();
    next();await screen.findByRole('button',{name:'Gerar 20 questões com IA'});
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{source:'ai',boardId:null,areaIds:[AREA]}}));
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    await waitFor(()=>expect(body(last('/v1/exam-builder/generate')!)).toEqual({boardId:null,count:20,difficulty:'mixed',areaIds:[AREA],topicIds:[],theme:null}));
    expect(new Headers(last('/v1/exam-builder/generate')!.init!.headers).get('accept')).toBe('text/event-stream');
  });
  it('a free theme alone is enough without a map',async()=>{
    render(<BuilderScreen init={init}/>);next();choose(/Questões da IA/);next();
    fireEvent.change(screen.getByRole('textbox',{name:'Tema (opcional)'}),{target:{value:'  sepse  '}});next();next();
    fireEvent.click(await screen.findByRole('button',{name:'Gerar 20 questões com IA'}));
    await waitFor(()=>expect(body(last('/v1/exam-builder/generate')!)).toMatchObject({boardId:null,areaIds:[],theme:'sepse'}));
  });
  it('a map with content pre-fills Conteúdo (areas and matérias)',async()=>{
    boardContent={cardCount:4,areaIds:[AREA],topicIds:[TOPIC]};
    render(<BuilderScreen init={init}/>);await pick('Mapa (opcional)','Mapa sintético');next();next();
    expect(await screen.findByText('Conteúdo preenchido a partir do mapa Mapa sintético. Ajuste se quiser.')).toBeTruthy();
    expect(screen.getByRole('button',{name:/Totalmente personalizada/}).getAttribute('aria-pressed')).toBe('true');
    next();next();await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{areaIds:[AREA],topicIds:[TOPIC]}}));
  });
  it('an empty map pre-fills nothing',async()=>{
    render(<BuilderScreen init={init}/>);await pick('Mapa (opcional)','Mapa sintético');
    await waitFor(()=>expect(calls.some(c=>c.path===`/v1/exam-builder/board-content?boardId=${BOARD}`)).toBe(true));
    next();next();expect(screen.queryByText(/Conteúdo preenchido/)).toBeNull();
  });
  it('while generating, shows a live "x de n" counter and progress',async()=>{
    let resolve:(v:unknown)=>void=()=>undefined;
    genReply=new Promise(r=>{resolve=r;}) as unknown as typeof genReply;
    progressEvents=[{generated:5,requested:20},{bogus:true}];
    await mapFlow();await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    // the stream said 5 of 20; the big number counts up to it, and a malformed event is ignored
    expect(await screen.findByRole('status',{name:'Questões geradas: 5 de 20'})).toBeTruthy();
    expect(screen.getByRole('progressbar',{name:'Questões geradas: 5 de 20'})).toBeTruthy();
    await waitFor(()=>expect(screen.getByText('5 de 20')).toBeTruthy());
    resolve({ok:true,data:{questionIds:[ID(71),ID(72)],requested:2,reused:1,generated:1,shortfall:0,stoppedBy:null,shortfallReason:null}});
    expect(await screen.findByText('Prontas e fixadas na prova: 1 reaproveitadas e 1 novas.')).toBeTruthy();
    expect(screen.queryByRole('status',{name:/Questões geradas/})).toBeNull();
  });
  it('a generation shortfall is informative and offers to generate the rest',async()=>{
    genReply={ok:true,data:{questionIds:[ID(71)],requested:3,reused:0,generated:1,shortfall:2,stoppedBy:null,shortfallReason:'rejected'}};
    await mapFlow();await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getByRole('button',{name:'Gerar 20 questões com IA'}));
    expect(await screen.findByText('Reunimos 1 de 3 questões')).toBeTruthy();
    expect(screen.getByText(/não passaram nas nossas checagens/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull(); // not an error
    genReply={ok:true,data:{questionIds:[ID(73),ID(74)],requested:2,reused:0,generated:2,shortfall:0,stoppedBy:null,shortfallReason:null}};
    fireEvent.click(screen.getByRole('button',{name:'Gerar mais 2 com IA'}));
    await waitFor(()=>expect(calls.filter(c=>c.path==='/v1/exam-builder/generate').map(body).at(-1)).toMatchObject({count:2}));
    expect(await screen.findByText('Prontas e fixadas na prova: 0 reaproveitadas e 3 novas.')).toBeTruthy();
  });
});

describe('deep links',()=>{
  it('?matrixItemIds= lands on Conteúdo with the map filter visible and applied',async()=>{
    render(<BuilderScreen init={{ids:[],matrixItemIds:[ID(30)]}}/>);
    expect(h2('Como filtrar as questões?')).toBeTruthy();
    expect(screen.getByText('Filtrando pelos assuntos do mapa (1).')).toBeTruthy();
    next();next();await screen.findByText('Enunciado sintético 1');
    expect(previews().at(-1)).toMatchObject({params:{matrixItemIds:[ID(30)],source:'catalog'}});
  });
  it('?preset= lands on Por modo with the preset selected',()=>{
    render(<BuilderScreen init={{ids:[],matrixItemIds:[],preset:'enamed'}}/>);
    expect(h2('Como filtrar as questões?')).toBeTruthy();
    expect(screen.getByRole('button',{name:/Por modo/}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button',{name:/Formato ENAMED/}).getAttribute('aria-pressed')).toBe('true');
  });
  it('?source=ai (the "Gerar com IA" buttons) starts on Prova with the AI origin chosen',()=>{
    render(<BuilderScreen init={{ids:[],matrixItemIds:[],source:'ai'}}/>);
    expect(h2('Sua prova')).toBeTruthy();next();
    expect(screen.getByRole('button',{name:/Questões da IA/}).getAttribute('aria-pressed')).toBe('true');
  });
  it('?ids= lands on Formato',()=>{
    render(<BuilderScreen init={{ids:[ID(5)],matrixItemIds:[]}}/>);
    expect(h2('Formato da prova')).toBeTruthy();
  });
  it('applying a saved template jumps to Revisar e começar',async()=>{
    tplList=[{id:ID(801),name:'Meu modelo',params:{source:'catalog',areaIds:[],topicIds:[],matrixItemIds:[],difficulties:[],progress:'all',boardId:null,count:12,distribution:'balanced',timePerQuestionSec:null,mode:'study',shuffle:false},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
    render(<BuilderScreen init={init}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Usar Meu modelo'}));
    expect(h2('Revisar e começar')).toBeTruthy();
    await waitFor(()=>expect(previews().at(-1)).toMatchObject({params:{count:12}}));
  });
});

describe('shortfall (FR-26)',()=>{
  it('says "Reunimos X de N" (neutral, not an alert) and never completes from AI on its own',async()=>{
    available=3;pool=3;
    render(<BuilderScreen init={init}/>);await ready();
    expect(await screen.findByText('Reunimos 3 de 20 questões')).toBeTruthy();
    expect(screen.getByText('Não há mais questões com esses filtros no banco.')).toBeTruthy();
    expect(previews().every(p=>p.params.source==='catalog')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Seguir com 3'}));
    await waitFor(()=>expect(previews().at(-1).params.count).toBe(3));
    expect(previews().every(p=>p.params.source==='catalog')).toBe(true);
  });
  it('"Completar com questões da IA" is an explicit choice',async()=>{
    available=3;pool=3;
    render(<BuilderScreen init={init}/>);await ready();
    fireEvent.click(await screen.findByRole('button',{name:'Completar com questões da IA'}));
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
    render(<BuilderScreen init={{ids:[ID(5),ID(6)],matrixItemIds:[]}}/>);next();
    await screen.findByText('Enunciado sintético 5');
    expect(previews()[0]).toMatchObject({pinnedIds:[ID(5),ID(6)],params:{count:2}});
    expect(screen.getByRole('button',{name:'Desafixar a questão 1'})).toBeTruthy();
  });
});

describe('Começar (FR-30, FR-32, FR-33)',()=>{
  it('is disabled with 0 questions',async()=>{
    available=0;pool=0;
    render(<BuilderScreen init={init}/>);toReview();
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
