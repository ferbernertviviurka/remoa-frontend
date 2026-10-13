/** F33/G26 step 3: production components in the Vite harness + SYNTHETIC HTTP via page.route (no Next SSR, no backend, no DB). Run against an isolated listener: F33_UI_BASE_URL=http://127.0.0.1:4391 */
import {chromium,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),base=process.env.F33_UI_BASE_URL??'http://127.0.0.1:4391';
const url=new URL(base);if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||['3000','4000'].includes(url.port))throw new Error('Own local port required');
const dir=fileURLToPath(new URL('./artifacts/pagination/',import.meta.url));fs.mkdirSync(dir,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,ts='2026-10-09T12:00:00.000Z';
const audit={id:1,createdAt:ts,actorType:'admin',actor:null,action:'question.import_view',targetType:'route',targetId:'/v1/admin/questions/imports/page',targetLabel:null,reason:'Consultar importações sintéticas',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null};
const job=(n,status='review')=>({id:id(n),answerKeyPages:null,revision:0,status,totalPages:88,completedPages:88,candidates:100+n,accepted:0,rejected:0,duplicate:0,costCents:0,errorCode:null,updatedAt:ts});
const sess=(n,status='finished')=>({id:id(5000+n),mode:n%2?'study':'simulation',status,revision:0,startedAt:ts,deadline:null,finishedAt:status==='finished'?ts:null,serverTime:ts,count:10,answeredCount:n%11});
const json=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{ok:true,data}:{ok:false,error:{code:'internal',message:'synthetic_failure'}})});
// 65 imports: 25/25/15; cursor encodes the offset
const imports=Array.from({length:65},(_,i)=>job(i+1,i%13===0?'failed':'review'));
const importPage=(all,u,pageSize)=>{const q=u.searchParams,off=q.get('cursor')?Number(q.get('cursor').slice(1)):0,end=off+pageSize;return{items:all.slice(off,end),nextCursor:end<all.length?`c${end}`:null,audit};};
// 45 sessions: 20/20/5; the very last (oldest) is still active
const sessions=Array.from({length:45},(_,i)=>sess(i+1,i===44?'active':'finished'));
const sessPage=(all,u)=>{const q=u.searchParams,off=q.get('cursor')?Number(q.get('cursor').slice(1)):0,end=off+20;return{items:all.slice(off,end),nextCursor:end<all.length?`c${end}`:null};};
const checks=[],browser=await chromium.launch({channel:'chromium'});
try{for(const [label,opts] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},hasTouch:true,isMobile:true}]]){
 const context=await browser.newContext(opts);const page=await context.newPage(),errors=[],hits=[];page.on('pageerror',e=>errors.push(e.message));
 const verify=async()=>{await page.evaluate(()=>document.fonts.ready);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const v=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.html)})));expect(v).toEqual([]);const w=await page.evaluate(()=>document.documentElement.scrollWidth);expect(w).toBeLessThanOrEqual(opts.viewport.width);expect(errors).toEqual([]);return{axe:v.length,scrollWidth:w};};
 const run=async(name,fn)=>{try{await fn();checks.push({name,viewport:label,passed:true,...await verify()});}catch(e){checks.push({name,viewport:label,passed:false,error:e.message});await page.screenshot({path:path.join(dir,`failure-${label}.png`)});throw e;}};
 const mount=async(pattern,handler)=>{await page.unrouteAll({behavior:'ignoreErrors'});hits.length=0;await page.route(pattern,route=>{const u=new URL(route.request().url());hits.push(u);return handler(route,u);});};
 const imp=()=>page.getByRole('region',{name:'Importações de provas'}),articles=r=>r.getByRole('article');
 const impRoute=(all=imports,flags={import:true,catalog:true,sessions:true,bankStudent:false})=>mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,flags);if(u.pathname==='/v1/admin/questions/imports/page')return json(route,importPage(all.filter(j=>!u.searchParams.get('status')||j.status===u.searchParams.get('status')),u,25));return route.continue();});
 await run('imports: 65 rows load 25/25/15, keyboard-only, focus lands on first new row, no duplicates',async()=>{
  await impRoute();await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(25);
  const more=imp().getByRole('button',{name:'Carregar mais importações'});await more.focus();await page.keyboard.press('Enter');await expect(articles(imp())).toHaveCount(50);
  await expect.poll(()=>page.evaluate(()=>document.activeElement?.closest('[data-import-id]')?.getAttribute('data-import-id'))).toBe(id(26));
  await more.focus();await page.keyboard.press('Enter');await expect(articles(imp())).toHaveCount(65);await expect(more).toHaveCount(0);
  const links=await imp().getByRole('link').evaluateAll(n=>n.map(a=>a.getAttribute('href')));expect(new Set(links).size).toBe(65);
  expect(hits.filter(u=>u.pathname.endsWith('/imports/page')).map(u=>u.searchParams.get('cursor'))).toEqual([null,'c25','c50']);
  await page.screenshot({path:path.join(dir,`imports-65-${label}.png`)});
 });
 await run('imports: search resets the cursor and returns only matches',async()=>{
  await impRoute();await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(25);await imp().getByRole('button',{name:'Carregar mais importações'}).click();await expect(articles(imp())).toHaveCount(50);
  await impRoute(imports.slice(0,3));await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(3);await expect(imp().getByRole('button',{name:'Carregar mais importações'})).toHaveCount(0);
 });
 await run('imports: filter change after page 2 refetches without cursor',async()=>{
  await impRoute();await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(25);await imp().getByRole('button',{name:'Carregar mais importações'}).click();await expect(articles(imp())).toHaveCount(50);
  hits.length=0;await imp().getByRole('combobox',{name:'Estado da importação'}).click();await page.getByRole('option',{name:/Falhou|Falha/}).first().click();
  await expect.poll(()=>hits.filter(u=>u.pathname.endsWith('/imports/page')).length).toBeGreaterThan(0);
  const last=hits.filter(u=>u.pathname.endsWith('/imports/page')).at(-1);expect(last.searchParams.get('status')).toBe('failed');expect(last.searchParams.has('cursor')).toBe(false);await expect(articles(imp())).toHaveCount(imports.filter(j=>j.status==='failed').length);
 });
 await run('imports: stale slow search never replaces the current one',async()=>{
  let release,entered;const gate=new Promise(r=>{release=r;}),enteredP=new Promise(r=>{entered=r;});
  await mount('**/v1/**',async(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,{import:true,catalog:true,sessions:true,bankStudent:false});if(u.pathname!=='/v1/admin/questions/imports/page')return route.continue();const s=u.searchParams.get('search');if(s==='lenta'){entered();await gate;return json(route,importPage(imports.slice(10,14),u,25)).catch(()=>{});}if(s==='rapida')return json(route,importPage(imports.slice(0,2),u,25));return json(route,importPage(imports,u,25));});
  await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(25);const s=imp().getByLabel('Buscar importações por prova, instituição, caderno ou fonte');
  await s.fill('lenta');await enteredP;await s.fill('rapida');await expect(articles(imp())).toHaveCount(2);release();await page.waitForTimeout(400);await expect(articles(imp())).toHaveCount(2);
 });
 await run('imports: page-2 failure keeps loaded rows, shows alert, keyboard retry restores focus on the new row',async()=>{
  let n=0;await mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,{import:true,catalog:true,sessions:true,bankStudent:false});if(u.pathname!=='/v1/admin/questions/imports/page')return route.continue();if(u.searchParams.get('cursor')&&n++===0)return json(route,null,503);return json(route,importPage(imports,u,25));});
  await page.goto(base+'/admin/questoes/importacoes');await expect(articles(imp())).toHaveCount(25);const more=imp().getByRole('button',{name:'Carregar mais importações'});await more.focus();await page.keyboard.press('Enter');
  await expect(imp().getByRole('alert')).toBeVisible();await expect(articles(imp())).toHaveCount(25);await expect(imp().getByText('Nenhuma prova importada')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.activeElement?.hasAttribute('data-import-retry'))).toBe(true);await page.keyboard.press('Enter');await expect(articles(imp())).toHaveCount(50);await expect(imp().getByRole('alert')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.activeElement?.closest('[data-import-id]')?.getAttribute('data-import-id'))).toBe(id(26));
 });
 await run('imports: first-page 503 is an error with retry, never empty or legacy listing',async()=>{
  let n=0;await mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,{import:true,catalog:true,sessions:true,bankStudent:false});if(u.pathname==='/v1/admin/questions/imports/page'){if(n++===0)return json(route,null,503);return json(route,importPage(imports,u,25));}return route.continue();});
  await page.goto(base+'/admin/questoes/importacoes');await expect(imp().getByRole('alert')).toBeVisible();await expect(imp().getByText('Nenhuma prova importada')).toHaveCount(0);await expect(articles(imp())).toHaveCount(0);const legacyBefore=hits.filter(u=>u.pathname==='/v1/admin/questions/imports').length;await imp().getByRole('button',{name:'Tentar de novo'}).click();await expect(articles(imp())).toHaveCount(25);
  expect(hits.filter(u=>u.pathname==='/v1/admin/questions/imports').length).toBe(legacyBefore); // ponytail: the one legacy call is the pre-flags boot read; the retry never falls back
 });
 await run('imports: flag off never calls the paginated route',async()=>{
  await impRoute(imports,{import:false,catalog:true,sessions:true,bankStudent:false});await page.goto(base+'/admin/questoes/importacoes');await expect(imp().getByText(/importação está desativada/)).toBeVisible();expect(hits.some(u=>u.pathname.endsWith('/imports/page'))).toBe(false);
 });
 const ses=()=>page.getByRole('main');const sessRoute=(all=sessions,flags={import:true,catalog:true,sessions:true,bankStudent:false})=>mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,flags);if(u.pathname==='/v1/question-sessions/history'){const st=u.searchParams.get('status');return json(route,sessPage(st?all.filter(s=>s.status===st):all,u));}return route.continue();});
 await run('sessions: 45 load 20/20/5 including the old active one (server state), keyboard-only',async()=>{
  await sessRoute();await page.goto(base+'/app/simulados');await expect(ses().getByRole('article')).toHaveCount(20);const more=ses().getByRole('button',{name:'Carregar tentativas anteriores'});
  await more.focus();await page.keyboard.press('Enter');await expect(ses().getByRole('article')).toHaveCount(40);await expect.poll(()=>page.evaluate(()=>document.activeElement?.closest('[data-session-id]')?.getAttribute('data-session-id'))).toBe(id(5021));
  await more.focus();await page.keyboard.press('Enter');await expect(ses().getByRole('article')).toHaveCount(45);await expect(more).toHaveCount(0);
  await expect(page.locator(`[data-session-id="${id(5045)}"]`).getByText('Em andamento')).toBeVisible();
  expect(hits.filter(u=>u.pathname.endsWith('/history')).map(u=>u.searchParams.get('cursor'))).toEqual([null,'c20','c40']);await page.screenshot({path:path.join(dir,`sessions-45-${label}.png`)});
 });
 await run('sessions: status filter resets the cursor; page-2 503 keeps rows with retry; first-page 503 is an error',async()=>{
  await sessRoute();await page.goto(base+'/app/simulados');await expect(ses().getByRole('article')).toHaveCount(20);await ses().getByRole('button',{name:'Carregar tentativas anteriores'}).click();await expect(ses().getByRole('article')).toHaveCount(40);
  hits.length=0;await ses().getByRole('combobox',{name:'Estado da tentativa'}).click();await page.getByRole('option',{name:'Em andamento'}).click();await expect(ses().getByRole('article')).toHaveCount(1);
  const last=hits.filter(u=>u.pathname.endsWith('/history')).at(-1);expect(last.searchParams.get('status')).toBe('active');expect(last.searchParams.has('cursor')).toBe(false);
  let n=0;await mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,{import:true,catalog:true,sessions:true,bankStudent:false});if(u.pathname!=='/v1/question-sessions/history')return route.continue();if(u.searchParams.get('cursor')&&n++===0)return json(route,null,503);return json(route,sessPage(sessions,u));});
  await page.goto(base+'/app/simulados');await expect(ses().getByRole('article')).toHaveCount(20);await ses().getByRole('button',{name:'Carregar tentativas anteriores'}).click();await expect(ses().getByRole('alert')).toBeVisible();await expect(ses().getByRole('article')).toHaveCount(20);
  await ses().getByRole('button',{name:'Tentar de novo'}).click();await expect(ses().getByRole('article')).toHaveCount(40);
  await mount('**/v1/**',(route,u)=>{if(u.pathname==='/v1/question-features')return json(route,{import:true,catalog:true,sessions:true,bankStudent:false});if(u.pathname==='/v1/question-sessions/history')return json(route,null,503);return route.continue();});
  await page.goto(base+'/app/simulados');await expect(ses().getByRole('alert')).toBeVisible();await expect(ses().getByText('Nenhuma tentativa ainda')).toHaveCount(0);await expect(ses().getByRole('article')).toHaveCount(0);
 });
 await run('sessions: flag off never calls the history route',async()=>{
  await sessRoute(sessions,{import:true,catalog:true,sessions:false,bankStudent:false});await page.goto(base+'/app/simulados');await expect(ses().getByText('O histórico de tentativas está indisponível neste momento.')).toBeVisible();expect(hits.some(u=>u.pathname.endsWith('/history'))).toBe(false);
 });
 await context.close();
}}
catch(e){console.error(e.message);process.exitCode=1;}
finally{fs.writeFileSync(path.join(dir,'pagination-report.json'),JSON.stringify({kind:'production components in Vite harness, synthetic HTTP via page.route; no Next SSR/backend/DB',checks},null,2));await browser.close();console.log(checks.map(c=>`${c.passed?'PASS':'FAIL'} ${c.viewport} ${c.name}${c.error?' :: '+c.error.split('\n')[0]:''}`).join('\n'));}
if(checks.length!==20||checks.some(c=>!c.passed))process.exitCode=1;
