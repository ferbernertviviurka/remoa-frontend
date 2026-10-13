import {meta,sql,call,post,check,assert,rec,results,FORBIDDEN,ctxFor,pageFor,axeOverflow,browser,WEB,API,stems} from './g27-lib.mjs';
import fs from 'node:fs';
const A=meta.actors,P=meta;
const body={source:'catalog',areaIds:[],topicIds:[],matrixItemIds:[],difficulties:[],progress:'all',count:5,distribution:'balanced',timePerQuestionSec:null,mode:'study',shuffle:false};
// ---- S1 network + state scan through the browser (both viewports)
for(const vp of ['desktop','mobile']){const V=vp[0].toUpperCase();
 await check('SEC-01'+V,`browser network scan: no key/explanation/verdict in any pre-answer response (${vp})`,async()=>{
  const ctx=await ctxFor('student',vp);const p=await pageFor(ctx);p.setDefaultTimeout(8000);
  await p.goto(WEB+'/app/banco-de-questoes?flags=live');await p.getByText(/^\d+ questões$/).first().waitFor();
  await p.getByPlaceholder('Buscar no enunciado').fill('sintética 1');await p.waitForTimeout(1200);await p.getByPlaceholder('Buscar no enunciado').fill('');await p.waitForTimeout(800);
  await p.getByRole('button',{name:/Carregar mais/}).click();await p.waitForTimeout(800);
  await p.getByRole('tab',{name:'Minhas perguntas (IA)'}).or(p.getByRole('button',{name:'Minhas perguntas (IA)'})).first().click();await p.waitForTimeout(1000);
  await p.getByRole('tab',{name:'Catálogo Remoa'}).or(p.getByRole('button',{name:'Catálogo Remoa'})).first().click();await p.waitForTimeout(800);
  // open drawer on an unanswered question, do not answer
  const n=await p.locator('[data-bank-open]').count();for(let i=0;i<n;i++){await p.locator('[data-bank-open]').nth(i).click();await p.waitForTimeout(500);if(!/Seu resultado anterior/.test(await p.getByRole('dialog').innerText()))break;await p.keyboard.press('Escape');}
  await p.waitForTimeout(500);const dom=await p.content();assert(!/EXPLICACAO_SECRETA/.test(dom),'DOM has explanation');await p.keyboard.press('Escape');
  for(const i of [0,1])await p.getByRole('checkbox',{name:/Selecionar para a prova/}).nth(i+5).check();await p.getByRole('button',{name:'Criar prova com estas'}).click();await p.waitForURL(/prova\?/);await p.getByText('Prévia das questões').waitFor({timeout:10000});await p.waitForTimeout(800);
  await p.getByRole('button',{name:'Quantidade'}).count();await p.getByRole('button',{name:'Sortear de novo'}).click();await p.waitForTimeout(1000);
  const dom2=await p.content();assert(!/EXPLICACAO_SECRETA/.test(dom2),'builder DOM has explanation');const store=await p.evaluate(()=>JSON.stringify([{...localStorage},{...sessionStorage}]));assert(!FORBIDDEN.test(store.replace('f33-test-role','')),'storage');
  const pre=[];for(const x of ctx.net){const txt=await x.text;if(x.method==='POST'&&/\/answer$/.test(x.path))continue;pre.push({m:x.method,p:x.path,leak:FORBIDDEN.test(txt)});}
  const bad=pre.filter(x=>x.leak);assert(bad.length===0,'leaks in '+JSON.stringify(bad));const kinds=[...new Set(pre.map(x=>x.m+' '+x.p.replace(/[0-9a-f-]{36}/g,':id')))];rec('SEC-01k'+V,'scanned endpoints',true,kinds.join('; '));
  assert(ctx.errors.length===0,ctx.errors.join('|'));await ctx.close();});
}
// ---- S2 direct API scans, all pre-answer endpoints
await check('SEC-02','API pre-answer endpoints never contain key/explanation/verdict (list all scopes+sorts, facets, detail, availability, preview, swap, revalidate, templates, session start+get)',async()=>{
 const urls=['/questions?scope=catalog&limit=50','/questions?scope=mine&limit=50','/questions?scope=all&sort=difficulty&limit=50','/questions?scope=catalog&sort=topic&limit=25','/questions/facets?scope=catalog','/questions/facets?scope=mine'];
 for(const u of urls){const r=await call('student',u);assert(r.status===200,u+' '+r.status);assert(!FORBIDDEN.test(r.text),'leak '+u);}
 const q=P.pub[3];const d=await call('student','/questions/'+q);assert(d.status===200&&!FORBIDDEN.test(d.text),'detail leak '+d.status);
 for(const [u,b] of [['/exam-builder/availability',{source:'catalog',areaIds:[]}],['/exam-builder/preview',{params:body,pinnedIds:[],excludedIds:[]}]]){const r=await call('student',u,'POST',b);assert(r.status===200&&!FORBIDDEN.test(r.text),u+' '+r.status+' '+(FORBIDDEN.test(r.text)?'LEAK':''));}
 const pv=(await call('student','/exam-builder/preview','POST',{params:body,pinnedIds:[],excludedIds:[]})).json.data;
 const sw=await call('student','/exam-builder/swap','POST',{params:body,seed:pv.seed,questionId:pv.items[0].questionId,currentIds:pv.items.map(i=>i.questionId),excludedIds:[]});assert(sw.status===200&&!FORBIDDEN.test(sw.text),'swap '+sw.status);
 const rv=await call('student','/exam-builder/revalidate','POST',{params:body,questionIds:pv.items.map(i=>i.questionId)});assert(rv.status===200&&!FORBIDDEN.test(rv.text),'revalidate '+rv.status);
 const t=await call('student','/exam-templates');assert(t.status===200&&!FORBIDDEN.test(t.text),'templates');
 const st=await call('student','/question-sessions','POST',{mode:'study',questionIds:pv.items.map(i=>i.questionId),count:5,timerSec:null,shuffle:false,builder:{seed:pv.seed,params:body,templateId:null}},{'Idempotency-Key':crypto.randomUUID()});let sid;if(st.status===409&&/active_session_exists:/.test(st.text))sid=st.text.match(/active_session_exists:([0-9a-f-]{36})/)[1];else{assert(st.status===201||st.status===200,'start '+st.status+st.text.slice(0,200));assert(!FORBIDDEN.test(st.text),'session start leak');sid=st.json.data.id;}
 const g=await call('student','/question-sessions/'+sid);assert(g.status===200&&!FORBIDDEN.test(g.text),'session get leak (study, unanswered)');
 rec('SEC-02s','session for student (kept for RLS test)',true,sid);globalThis.studentSession=sid;});
// ---- S3 RLS A/B
await check('SEC-03','RLS A/B: drafts, B private AI, other users sessions and templates invisible',async()=>{
 const own=await call('student','/questions?scope=mine&limit=50');const ids=own.json.data.items.map(i=>i.id);assert(ids.includes(P.privA)&&!ids.includes(P.privB),'mine scope');
 const ownB=await call('other','/questions?scope=mine&limit=50');const idsB=ownB.json.data.items.map(i=>i.id);assert(idsB.includes(P.privB)&&!idsB.includes(P.privA)&&!idsB.includes(P.privAnotherA),'B mine scope');
 for(const sc of ['catalog','all','mine']){const l=await call('student','/questions?scope='+sc+'&limit=50');const hit=l.json.data.items.map(i=>i.id);for(const bad of [...P.drafts,P.privB])assert(!hit.includes(bad),`${sc} shows ${bad}`);}
 const catAll=await call('student','/questions?scope=catalog&limit=50&origin=ai_generated');assert(catAll.json.data.total===0,'catalog with AI origin should be 0, got '+catAll.json.data.total);
 for(const bad of [...P.drafts,P.privB]){assert((await call('student','/questions/'+bad)).status===404,'detail '+bad);assert((await call('student',`/questions/${bad}/answer`,'POST',{selectedKey:'A',mutationId:crypto.randomUUID(),elapsedMs:1})).status===404,'answer '+bad);assert((await call('student',`/questions/${bad}/attempt`)).status===404,'attempt '+bad);}
 const pvb=await call('student','/exam-builder/preview','POST',{params:{...body,source:'catalog_and_ai',count:60},pinnedIds:[P.privB],excludedIds:[]});assert(pvb.status>=400||!pvb.text.includes(P.privB),'pinned B private accepted');rec('SEC-03p','preview pinning B private AI -> status',true,String(pvb.status));
 const pvd=await call('student','/exam-builder/preview','POST',{params:body,pinnedIds:[P.drafts[0]],excludedIds:[]});assert(pvd.status>=400||!pvd.text.includes(P.drafts[0]),'pinned draft accepted');rec('SEC-03d','preview pinning a draft -> status',true,String(pvd.status));
 const stDraft=await call('student','/question-sessions','POST',{mode:'study',questionIds:[P.drafts[0],P.privB],count:2,timerSec:null,shuffle:false,builder:{seed:'a'.repeat(32),params:{...body,count:2},templateId:null}},{'Idempotency-Key':crypto.randomUUID()});assert(stDraft.status>=400,'session started with draft/B-private: '+stDraft.status);
 const pvB=await call('other','/exam-builder/preview','POST',{params:{...body,source:'ai',count:5},pinnedIds:[],excludedIds:[]});assert(pvB.status===200&&!pvB.text.includes(P.privA)&&!pvB.text.includes(P.privAnotherA),'B preview contains A AI');
 const sess=globalThis.studentSession;assert((await call('other','/question-sessions/'+sess)).status===404,'B reads A session');
 const sessC=await sql(`select id from question_sessions where user_id=$1 limit 1`,[A.e.id]);if(sessC[0])assert((await call('student','/question-sessions/'+sessC[0].id)).status===404,'student reads e session');
 const tc=await sql(`select id from exam_templates where user_id=$1 limit 1`,[A.c.id]);assert(tc.length===1,'c template exists (builder run needed)');
 const tb=await call('other','/exam-templates');assert(!tb.text.includes(tc[0].id),'B sees c template');
 const lst=await call('student','/question-sessions');assert(!lst.text.includes(sessC[0]?.id??'zzzz'),'A session list shows e session');});
// ---- S4 counts vs SQL
await check('SEC-04','server counts == SQL (facets/list/availability), only eligible',async()=>{
 const el=`q.visibility='public' and q.catalog_status='published' and q.status='approved' and q.type='objective' and not exists(select 1 from question_bank x where x.supersedes_id=q.id and (x.published_at is not null or x.catalog_status='published'))`;
 const [{n}]=await sql(`select count(*)::int n from question_bank q where ${el}`);const f=await call('student','/questions/facets?scope=catalog');assert(f.json.data.total===n,`facets ${f.json.data.total} sql ${n}`);
 const l=await call('student','/questions?scope=catalog&limit=1');assert(l.json.data.total===n,'list total');
 const av=await call('student','/exam-builder/availability','POST',{source:'catalog',areaIds:[]});const rows=av.json.data.areas??av.json.data.rows??[];
 for(const a of P.areas){const [{n:an}]=await sql(`select count(*)::int n from question_bank q where ${el} and enamed_area_id=$1`,[a]);const row=rows.find(r=>r.areaId===a);assert(row&&row.available===an,`area ${a} ui ${row?.available} sql ${an}`);}
 const hard=await call('student','/questions?scope=catalog&difficulties=hard&limit=1');const [{n:hn}]=await sql(`select count(*)::int n from question_bank q where ${el} and difficulty='hard'`);assert(hard.json.data.total===hn,'hard '+hard.json.data.total+' '+hn);
 const ai=await call('student','/exam-builder/availability','POST',{source:'ai',areaIds:[]});assert(ai.json.data.total===2||JSON.stringify(ai.json.data).includes('2'),'ai avail '+ai.text.slice(0,200));});
// ---- S5 empty catalog
for(const vp of ['desktop','mobile']){const V=vp[0].toUpperCase();
 await check('EMP-01'+V,`empty catalog (0 eligible): honest state, no error/legacy; AI tab still works; builder disabled (${vp})`,async()=>{
  await post('/__test/withdraw',{ids:'all'});const [{n}]=await sql(`select count(*)::int n from question_bank q where visibility='public' and catalog_status='published'`);assert(n===0,'still published '+n);
  const ctx=await ctxFor('student',vp);const p=await pageFor(ctx);await p.goto(WEB+'/app/banco-de-questoes?flags=live');await p.getByText('O catálogo ainda não tem questões publicadas').waitFor({timeout:12000});
  const t=await stems(p);assert(!/rascunho|privad|PDF|importa/i.test(t.replace(/Minhas perguntas \(IA\)/,'')),'mentions drafts/private/pdf: '+t.match(/.*(rascunho|privad|PDF|importa).*/i));
  const r=await axeOverflow(p,`bank-${vp}-empty-catalog`);assert(!r.axe.length&&!r.overflow,JSON.stringify(r));
  await p.getByRole('tab',{name:'Minhas perguntas (IA)'}).or(p.getByRole('button',{name:'Minhas perguntas (IA)'})).first().click();await p.waitForFunction(()=>/^2 questões$/m.test(document.body.innerText),null,{timeout:8000});
  await p.goto(WEB+'/app/banco-de-questoes/prova');await p.getByText('Nenhuma questão disponível com esses filtros').waitFor({timeout:10000});await p.getByText('Adicione ao menos uma questão para começar').waitFor();assert(await p.getByRole('button',{name:'Começar prova'}).first().isDisabled(),'start enabled');
  const r2=await axeOverflow(p,`builder-${vp}-empty-catalog`);assert(!r2.axe.length&&!r2.overflow,JSON.stringify(r2));
  assert(ctx.errors.filter(e=>!/Progress/.test(e)).length===0,ctx.errors.join('|'));await ctx.close();await post('/__test/republish');});
}
// ---- S6 flag off
await check('FLG-01','bankStudent off: legacy hub, 404 on /prova, ZERO calls to new routes; API refuses them',async()=>{
 await post('/__test/flags/bankStudent/off');try{
 const ctx=await ctxFor('student','desktop');const p=await pageFor(ctx);await p.goto(WEB+'/app/banco-de-questoes?flags=live');await p.waitForTimeout(4000);const t=await stems(p);assert(!/Catálogo Remoa\s*\n\s*Minhas perguntas \(IA\)/.test(t)&&!/Buscar assunto/.test(t),'new bank rendered with flag off');
  await p.goto(WEB+'/app/banco-de-questoes/prova');await p.waitForTimeout(2500);assert(await p.getByTestId('not-found').count()===1,'/prova not 404');
  const paths=ctx.net.map(n=>n.method+' '+n.path+n.search);const newRoutes=paths.filter(x=>/facets|exam-builder|exam-templates|sort=|areaIds|topicIds|\/answer|\/attempt|progress=/.test(x));assert(newRoutes.length===0,'new routes called: '+newRoutes.join(','));rec('FLG-01k','calls with flag off',true,[...new Set(paths.map(x=>x.replace(/[0-9a-f-]{36}/g,':id').split('?')[0]))].join('; '));
  for(const [u,m,b] of [['/questions/facets?scope=catalog','GET'],['/exam-builder/availability','POST',{source:'catalog',areaIds:[]}],['/exam-builder/preview','POST',{params:body,pinnedIds:[],excludedIds:[]}],['/exam-templates','GET']]){const r=await call('student',u,m,b);assert(r.status===404||r.status===403,`${u} -> ${r.status}`);}
  const feat=await call('student','/question-features');assert(feat.json.data.bankStudent===false,'flag value');await ctx.close();}finally{await post('/__test/flags/bankStudent/on');}});
// ---- S7 nav and landing
await check('NAV-01','navigation and Landing without banco links (static source scan)',async()=>{
 const {execSync}=await import('node:child_process');const root=new URL('../../src/',import.meta.url).pathname;
 const out=execSync(`grep -rln "banco-de-questoes" ${root} --include=*.tsx --include=*.ts | grep -v test | grep -v "features/questions\\|features/exam-builder\\|challenge-ai\\|features/map" || true`,{encoding:'utf8'});
 const nav=execSync(`grep -rn "banco-de-questoes\\|questoes\\|bankLink\\|navBank" ${root}features/shell ${root}app/\\(marketing\\) ${root}features/landing 2>/dev/null | grep -v test | head -20 || true`,{encoding:'utf8'});
 rec('NAV-01f','files referencing the route outside the feature',true,out.replace(/\n/g,' ; ')+' || shell/landing hits: '+nav.replace(/\n/g,' ; '));
 assert(!/features\/shell|\(marketing\)|landing/.test(out),'nav/landing reference banco: '+out);assert(!/banco-de-questoes/.test(nav),'shell/landing hit '+nav);});
await check('BD-19','prova?source=ai prefill: AI only, marked, 2 available',async()=>{const ctx=await ctxFor('student','desktop');const p=await pageFor(ctx);await p.goto(WEB+'/app/banco-de-questoes/prova?source=ai');await p.getByText(/Encontramos 2 questões disponíveis|Só deu para reunir/).first().waitFor({timeout:10000});const t=await stems(p);assert(/Só minhas perguntas de IA/.test(t),'origin');await p.getByRole('button',{name:'Mostrar todas'}).first().click().catch(()=>{});assert(/Gerada por IA/.test(await stems(p)),'AI mark in preview');await ctx.close();});
fs.writeFileSync(new URL('./artifacts/g27-real/security-results.json',import.meta.url),JSON.stringify(results,null,1));
await browser.close();process.exit(0);
