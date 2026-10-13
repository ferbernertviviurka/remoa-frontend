/* eslint-disable @typescript-eslint/no-explicit-any -- synthetic request bodies, QA harness only */
/** Synthetic, nonmedical fixtures for the exam builder. Runs only inside the explicitly started Vite QA harness. */
import type {IncomingMessage,ServerResponse} from 'node:http';
const ID=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const A=ID(901),B=ID(902);const now=()=>new Date().toISOString();const SEED='b'.repeat(32);
const AV={[A]:25,[B]:15};
let state={sessions:0,startMode:'ok' as 'ok'|'changed'|'active',templates:[] as any[],log:[] as string[]};
const item=(n:number,pinned:boolean)=>({questionId:ID(n),canonicalId:ID(n),version:1,areaId:n%2?A:B,topicId:null,origin:'official_exam',difficulty:'medium',stemPreview:`Enunciado sintético ${n}, sem conteúdo médico.`,sourceLabel:null,validation:n%5===0?{kind:'remoa_institutional',label:'Remoa'}:null,pinned});
const send=(res:ServerResponse,status:number,data:unknown)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(status<300?{ok:true,data}:data));};
const read=(req:IncomingMessage)=>new Promise<any>(r=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>r(s?JSON.parse(s):{}));});
export async function apiMiddleware(req:IncomingMessage,res:ServerResponse,next:()=>void){
  const url=new URL(req.url??'/','http://x');const p=url.pathname;
  if(p==='/__test/reset'){state={sessions:0,startMode:'ok',templates:[],log:[]};return send(res,200,{ok:true});}
  if(p==='/__test/mode'){state.startMode=url.searchParams.get('v') as any;return send(res,200,{ok:true});}
  if(p==='/__test/log')return send(res,200,state.log);
  if(!p.startsWith('/v1/'))return next();
  const b=req.method==='POST'?await read(req):{};state.log.push(`${req.method} ${p}${req.headers['idempotency-key']?` key=${req.headers['idempotency-key']}`:''}`);
  if(p==='/v1/boards')return send(res,200,[{id:ID(920),title:'Mapa sintético'}]);
  if(p==='/v1/exam-builder/generate')return send(res,200,{questionIds:[ID(71),ID(72)],requested:b.count,reused:1,generated:1,shortfall:0,stoppedBy:null});
  if(p==='/v1/challenge-ai/taxonomy'&&url.searchParams.get('kind')==='topic')return send(res,200,[{id:ID(910),name:'Matéria sintética'}]);
  if(p==='/v1/challenge-ai/taxonomy')return send(res,200,[{id:A,name:'Área sintética A'},{id:B,name:'Área sintética B'}]);
  if(p==='/v1/exam-templates'&&req.method==='GET')return send(res,200,{items:state.templates,limit:3});
  if(p==='/v1/exam-templates'){const t={id:ID(800+state.templates.length),name:b.name,params:b.params,createdAt:now(),updatedAt:now()};state.templates.unshift(t);return send(res,200,t);}
  if(p==='/v1/exam-builder/availability')return send(res,200,{total:40,areas:[{areaId:A,available:AV[A]},{areaId:B,available:AV[B]}]});
  if(p==='/v1/exam-builder/preview'){
    const n=Math.min(b.params.count,40);const ids:number[]=b.pinnedIds.map((x:string)=>Number(x.slice(-12)));
    for(let i=1;ids.length<n;i++)if(!ids.includes(i)&&!b.excludedIds.includes(ID(i)))ids.push(i);
    return send(res,200,{seed:SEED,allocation:{rows:[{areaId:A,available:25,target:Math.ceil(b.params.count/2),allocated:Math.min(25,Math.ceil(n/2))},{areaId:B,available:15,target:Math.floor(b.params.count/2),allocated:Math.min(15,Math.floor(n/2))}],requested:b.params.count,allocated:n,shortfall:b.params.count-n},items:ids.slice(0,n).map(i=>item(i,b.pinnedIds.includes(ID(i))))});
  }
  if(p==='/v1/exam-builder/swap')return send(res,200,{item:item(90,false)});
  if(p==='/v1/exam-builder/revalidate')return send(res,200,{ok:false,unavailable:[ID(2)],updated:[]});
  if(p==='/v1/calendar/labels')return send(res,200,{labels:[{id:ID(950),name:'Prova',color:'orange',systemKey:'exam',position:0,hidden:false,eventCount:0}]});
  if(p==='/v1/calendar/events')return send(res,200,{id:ID(951)});
  if(p==='/v1/question-sessions'){
    if(state.startMode==='changed'){state.startMode='ok';return send(res,409,{ok:false,error:{code:'conflict',message:'exam_changed'}});}
    if(state.startMode==='active')return send(res,409,{ok:false,error:{code:'conflict',message:`active_session_exists:${ID(333)}`}});
    state.sessions++;return send(res,200,{id:ID(700),mode:b.mode,status:'active',revision:1,startedAt:now(),deadline:null,finishedAt:null,serverTime:now(),items:[]});
  }
  return send(res,404,{ok:false,error:{code:'not_found',message:p}});
}
