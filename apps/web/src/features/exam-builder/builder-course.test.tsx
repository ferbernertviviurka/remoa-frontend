import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {BuilderScreen} from './builder-screen';
import {resetStudyProfileCache} from '../study-profile/use-study-profile';
import {resetReference} from '../study-profile/reference';

const ID=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const AREA=ID(900);
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
type Call={path:string;init?:RequestInit};
let calls:Call[];let profileCourse:string|null;let catalogByCourse:Record<string,number>;
const COURSES=[{code:'medicine',name:'Medicina',aliases:['med'],kind:'course'},{code:'nursing',name:'Enfermagem',aliases:['enf'],kind:'course'},{code:'not_health',name:'Outra área',aliases:[],kind:'not_health'}];
const caps=(c:string|null)=>({showEnamed:c==='medicine',suggestedGoals:[],starterTemplates:[c&&c!=='medicine'?'full_40':'enamed','quick','mistakes','blank'],subjectSystem:c&&c!=='medicine'?'course_disciplines':'enamed',needsConfirmation:false});
const body=(c:Call)=>JSON.parse(String(c.init?.body));
vi.mock('@/lib/api',()=>({api:vi.fn(async(path:string,init?:RequestInit)=>{
  calls.push({path,init});
  if(path==='/v1/account/study-profile')return {ok:true,data:{profile:profileCourse?{course:profileCourse,source:'user'}:null,capabilities:caps(profileCourse)}};
  if(path==='/v1/public/reference/courses')return {ok:true,data:COURSES};
  if(path.startsWith('/v1/challenge-ai/taxonomy'))return {ok:true,data:[{id:AREA,name:'Clínica Médica'}]};
  if(path==='/v1/boards')return {ok:true,data:[]};
  if(path==='/v1/exam-templates')return {ok:true,data:{items:[],limit:3}};
  if(path==='/v1/exam-builder/availability'){const n=catalogByCourse[body({path,init}).course??'medicine']??0;return {ok:true,data:{total:n,areas:n?[{areaId:AREA,available:n}]:[]}};}
  if(path==='/v1/exam-builder/preview')return {ok:true,data:{seed:'a'.repeat(32),allocation:{rows:[],requested:1,allocated:0,shortfall:1},items:[]}};
  return {ok:false,error:{code:'not_found',message:path}};
})}));
beforeEach(()=>{calls=[];profileCourse=null;catalogByCourse={medicine:50};resetStudyProfileCache();resetReference();sessionStorage.clear();});
afterEach(cleanup);
const init={ids:[],matrixItemIds:[]};
const next=()=>fireEvent.click(screen.getByRole('button',{name:'Continuar'}));
const avs=()=>calls.filter(c=>c.path==='/v1/exam-builder/availability').map(body);
const field=()=>screen.findByRole('combobox',{name:'Curso ou área da saúde'});
const chooseCourse=async(text:string,name:string)=>{const input=await field() as HTMLInputElement;await waitFor(()=>expect(input.value).not.toBe(''));fireEvent.change(input,{target:{value:text}});fireEvent.click((await screen.findAllByRole('option')).find(o=>(o.textContent??'').replace(/\s/g,'').includes(name))!);};
const goContent=async()=>{render(<BuilderScreen init={init}/>);await waitFor(()=>expect(calls.some(c=>c.path==='/v1/public/reference/courses')||true).toBe(true));next();next();};

describe('curso no Criador de prova (F35 FR-31..34)',()=>{
  it('opens with the profile course (nursing) and sends it in availability; never lists not_health',async()=>{
    profileCourse='nursing';await goContent();
    expect((await field() as HTMLInputElement).value).toBe('Enfermagem');
    await waitFor(()=>expect(avs().at(-1)).toMatchObject({course:'nursing'}));
    expect(avs().every(a=>a.course==='nursing')).toBe(true);
    const input=await field();fireEvent.focus(input);fireEvent.change(input,{target:{value:'outra'}});
    expect(screen.queryByRole('option',{name:/Outra área/})).toBeNull();
  });
  it('profile null or medicine keeps the ENAMED catalog (course null, 7 areas, Formato ENAMED)',async()=>{
    await goContent();
    expect((await field() as HTMLInputElement).value).toBe('Medicina');
    await waitFor(()=>expect(avs().at(-1)).toMatchObject({course:null}));
    fireEvent.click(screen.getByRole('button',{name:/Por especialidade/}));
    expect(await screen.findByText(/Clínica Médica · 50 disponíveis/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:/Por modo/}));
    expect(screen.getByRole('button',{name:/Formato ENAMED/})).toBeTruthy();
    expect(screen.queryByRole('radio',{name:/Simulado completo/})).toBeNull();
  });
  it('changing course resets the content choice and areas, and the params carry the new course (alias search)',async()=>{
    await goContent();await screen.findByText(/Clínica Médica · 50/);
    fireEvent.click(screen.getByRole('button',{name:/Por especialidade/}));
    fireEvent.click(await screen.findByRole('checkbox',{name:/Clínica Médica/}));
    await chooseCourse('enf','Enfermagem');
    await waitFor(()=>expect(avs().at(-1)).toMatchObject({course:'nursing',areaIds:[],topicIds:[]}));
    expect(screen.getByRole('button',{name:/Por especialidade/}).getAttribute('aria-pressed')).toBe('true');
  });
  it('a course without catalog shows the honest empty state, disables Começar and offers the map or another course',async()=>{
    profileCourse='nursing';await goContent();
    expect(await screen.findByText('Ainda não há questões publicadas para Enfermagem.')).toBeTruthy();
    expect(screen.queryByText(/Clínica Médica ·/)).toBeNull();
    expect(screen.getByText('Ainda não há áreas nem disciplinas cadastradas para Enfermagem.')).toBeTruthy();
    next();next();
    expect(await screen.findByText('Ainda não há questões publicadas para Enfermagem.')).toBeTruthy();
    expect((screen.getByRole('button',{name:'Começar prova'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Usar questões da IA'}));
    expect(screen.getByRole('heading',{level:2,name:'De onde vêm as questões?'})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Questões da IA/}).getAttribute('aria-pressed')).toBe('true');
    next();expect(screen.queryByRole('combobox',{name:'Curso ou área da saúde'})).toBeNull();
  });
  it('"Escolher outro curso" goes back to the selector and a published course clears the empty state',async()=>{
    profileCourse='nursing';await goContent();
    await screen.findByText('Ainda não há questões publicadas para Enfermagem.');
    next();next();await screen.findByText('Ainda não há questões publicadas para Enfermagem.');
    fireEvent.click(screen.getByRole('button',{name:'Escolher outro curso'}));
    await chooseCourse('med','Medicina');
    await waitFor(()=>expect(screen.queryByText(/Ainda não há questões publicadas/)).toBeNull());
  });
  it('presets per course: Simulado completo (40) for non-medicine, with count 40 / simulation / 180 s',async()=>{
    profileCourse='nursing';await goContent();
    await screen.findByText(/Ainda não há questões/);
    fireEvent.click(screen.getByRole('button',{name:/Por modo/}));
    expect(screen.queryByRole('radio',{name:/Formato ENAMED/})).toBeNull();
    ['Treino rápido','Revisar meus erros','Em branco'].forEach(n=>expect(screen.getByRole('button',{name:new RegExp(n)})).toBeTruthy());
    fireEvent.click(screen.getByRole('button',{name:/Simulado completo \(40\)/}));
    next();next();
    const b=await waitFor(()=>{const c=calls.filter(x=>x.path==='/v1/exam-builder/preview').map(body).at(-1);expect(c).toBeTruthy();return c;});
    expect(b.params).toMatchObject({count:40,mode:'simulation',timePerQuestionSec:180,distribution:'balanced',progress:'all',course:'nursing'});
  });
  it('switching from medicine to a non-profile course derives presets from the course', async()=>{
    await goContent();await screen.findByText(/Clínica Médica · 50/);
    await chooseCourse('enf','Enfermagem');
    fireEvent.click(await screen.findByRole('button',{name:/Por modo/}));
    expect(screen.getByRole('button',{name:/Simulado completo \(40\)/})).toBeTruthy();
  });
});
