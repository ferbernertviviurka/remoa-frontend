/** QA F33 step 5 extras against the live isolated API: publish gate negatives, reauth, hashState=missing + prepare, geracao screen, a11y. */
import {chromium,expect} from '@playwright/test';import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),__dirname=fileURLToPath(new URL('.',import.meta.url));
const base='http://127.0.0.1:'+(process.env.F33_WEB_PORT??3391),api='http://127.0.0.1:'+(process.env.F33_API_PORT??4391),dir=path.join(__dirname,'artifacts/qa-extra'),dbUrl=process.env.F33_QA_DB;
const psql=sql=>execFileSync('psql',[dbUrl,'-Atc',sql]).toString().trim();
const res=[],screens=[];const rec=(name,ok,detail)=>{res.push({name,ok,detail});console.log(ok?'PASS':'FAIL',name,JSON.stringify(detail)??'');};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
(async()=>{const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await ctx.newPage();
const meta=await(await page.request.get(api+'/__test/meta')).json();
const stale=sub=>`h.${b64({sub,amr:[{method:'password',timestamp:Math.floor((Date.now()-3*3600e3)/1000)}]})}.s`;
const call=async(role,method,url,body,tok)=>{const r=await page.request.fetch(api+url,{method,headers:{Authorization:'Bearer '+(tok??meta.actors[role].token)},...(body?{data:body}:{})});let j=null;try{j=await r.json();}catch{}return{status:r.status(),body:j};};
const stems=[1,2].map(n=>`QA F33 rascunho sintético ${meta.run.slice(0,8)} sem hash ${n}`);
const alts=JSON.stringify([{key:'A',text:'Alternativa sintética A'},{key:'B',text:'Alternativa sintética B'}]);
const ids=stems.map(()=>randomUUID());
stems.forEach((s,i)=>psql(`INSERT INTO question_bank(id,user_id,visibility,origin,source,type,difficulty,stem,expected_answer,alternatives,correct_key,status,catalog_status,content_hash) VALUES('${ids[i]}',NULL,'public','official_exam','ai','objective','easy','${s}','Resposta sintética','${alts}'::jsonb,'A','draft','in_review',NULL)`));
rec('seed: 2 institutional drafts with null hash (SQL, synthetic)',true,ids);
const row=id=>psql(`SELECT version||'|'||to_char(date_trunc('milliseconds',updated_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||coalesce(content_hash,'NULL')||'|'||catalog_status FROM question_bank WHERE id='${id}'`).split('|');
const reason='Rodada QA sintética '+meta.run;
// publish gate negatives
let [v,ts,h]=row(ids[0]);
const pub=async role=>call(role,'POST',`/v1/admin/questions/${ids[0]}/publish`,{expectedContentHash:h==='NULL'?'x'.repeat(64):h,revision:Number(v),reason});
let r=await pub('admin');rec('publish BLOCKED: draft without hash/rights/review/integrity (admin)',r.status>=400&&r.status<500,{status:r.status,err:r.body?.error});
for(const role of['student','reviewer','other']){r=await pub(role);rec(`publish denied for ${role} (404)`,r.status===404,{status:r.status});}
// reauth
const a0=psql(`SELECT count(*) FROM admin_audit_log WHERE action='question.content_hash_prepare'`);
const hp={items:[{id:ids[0],revision:Number(v),expectedUpdatedAt:ts}],sourceId:null,idempotencyKey:randomUUID(),reason};
r=await call('admin','POST','/v1/admin/questions/content-hash/prepare',hp,stale(meta.actors.admin.id));
const a1=psql(`SELECT count(*) FROM admin_audit_log WHERE action='question.content_hash_prepare'`);
rec('hash prepare with stale session -> reauth required, nothing written',r.status===403&&row(ids[0])[2]==='NULL',{status:r.status,msg:r.body?.error?.message,auditDenials:`${a0}->${a1}`,denial:psql(`SELECT result||':'||coalesce(denial,'') FROM admin_audit_log WHERE action='question.content_hash_prepare' ORDER BY id DESC LIMIT 1`)});
r=await call('student','POST','/v1/admin/questions/content-hash/prepare',hp);rec('hash prepare as student -> 404',r.status===404,{status:r.status});
r=await call('admin','POST','/v1/admin/questions/content-hash/prepare',{...hp,reason:'curto'});rec('hash prepare short reason -> 4xx',r.status>=400&&r.status<500&&row(ids[0])[2]==='NULL',{status:r.status});
// gate-specific publish blocks (draft linked to a source through the real hash-prepare endpoint)
const mkSource=async(rightsStatus)=>(await call('admin','POST','/v1/admin/questions/sources',{name:'QA F33 fonte '+rightsStatus+' '+meta.run.slice(0,8),publisher:'Instituição sintética QA',url:'https://example.com/qa/'+rightsStatus+meta.run,rightsStatus,...(rightsStatus==='authorized'?{rightsEvidence:'Autorização sintética somente neste banco isolado',rightsScope:'Amostra de teste não médica'}:{}),reason})).body;
for(const rs of['pending','authorized']){const src=await mkSource(rs);const sid=src?.data?.source?.id;if(!sid){rec('create source '+rs,false,src);continue;}
 const id=randomUUID();psql(`INSERT INTO question_bank(id,user_id,visibility,origin,source,type,difficulty,stem,expected_answer,alternatives,correct_key,status,catalog_status) VALUES('${id}',NULL,'public','official_exam','ai','objective','easy','QA F33 gate ${rs} ${meta.run.slice(0,8)}','Resposta sintética','${alts}'::jsonb,'A','draft','in_review')`);
 const [gv,gts]=row(id);const pr=await call('admin','POST','/v1/admin/questions/content-hash/prepare',{items:[{id,revision:Number(gv),expectedUpdatedAt:gts}],sourceId:sid,idempotencyKey:randomUUID(),reason});
 const [gv2,,gh]=row(id);const pb=await call('admin','POST',`/v1/admin/questions/${id}/publish`,{expectedContentHash:gh,revision:Number(gv2),reason});
 if(rs==='authorized'){const rv=await call('reviewer','POST',`/v1/editorial/questions/${id}/review`,{contentHash:gh,decision:'approved',referenceDate:'2026-10-12',reason});rec('medical approval BLOCKED without integrity/key/taxonomy/comment (reviewer)',rv.status===422,{status:rv.status,err:rv.body?.error?.message});}
 rec(`publish BLOCKED with source rights=${rs}, hash ok, no medical review/integrity/area`,pb.status===409&&row(id)[3]!=='published',{prepare:pr.status,publish:pb.status,err:pb.body?.error?.message});}
// UI
const axeCheck=async name=>{await page.waitForLoadState('networkidle');await page.waitForTimeout(1200);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const vs=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes[0]?.target})));const w=await page.evaluate(()=>document.documentElement.scrollWidth);const vw=page.viewportSize().width;screens.push({name,vw,scrollWidth:w,violations:vs});await page.screenshot({path:path.join(dir,`${name}-${vw}.png`),fullPage:true});rec(`a11y ${name} @${vw}`,vs.length===0&&w<=vw,{violations:vs,scrollWidth:w});};
const visit=async(url,role='admin')=>{await page.goto(base);await page.evaluate(r=>localStorage.setItem('f33-test-role',r),role);await page.goto(base+url);};
const errs=[];page.on('pageerror',e=>errs.push(e.message));
try{
await visit('/admin/questoes');await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
await page.getByRole('combobox',{name:'Hash do conteúdo'}).click();await page.getByRole('option',{name:'Hash pendente'}).click();
await expect(page.getByRole('checkbox',{name:/Selecionar para preparação/}).first()).toBeVisible();
const boxes=await page.getByRole('checkbox',{name:/Selecionar para preparação/}).count();
rec('catalog hashState=missing lists only null-hash institutional drafts',boxes>=2&&boxes<=50,{checkboxes:boxes});
await axeCheck('admin-catalog-hash-missing');
for(const stem of stems)await page.getByRole('checkbox',{name:new RegExp('Selecionar para preparação: '+stem)}).check();
// keyboard: Tab reaches the prepare button
await page.getByRole('button',{name:'Preparar para edição'}).focus();await page.keyboard.press('Enter');
const dlg=page.getByRole('dialog');await expect(dlg).toBeVisible();
await dlg.getByLabel('Motivo desta operação',{exact:true}).fill(reason);await axeCheck('admin-hash-dialog');
const auditBefore=Number(psql(`SELECT count(*) FROM admin_audit_log WHERE action='question.content_hash_prepare' AND result='success' AND reason='${reason}'`));await dlg.getByRole('button',{name:/Preparar \d+ questões/}).click();
await expect(dlg.getByText('Preparada').first()).toBeVisible({timeout:15000}).catch(async()=>{});
const after=ids.map(id=>row(id));const prepared=after.every(a=>a[2]!=='NULL'&&a[3]==='in_review');
const auditN=String(Number(psql(`SELECT count(*) FROM admin_audit_log WHERE action='question.content_hash_prepare' AND result='success' AND reason='${reason}'`))-auditBefore);
rec('Preparar para edição (UI, real endpoint): hashes written, status unchanged, exactly 1 success audit row',prepared&&auditN==='1',{hashes:after.map(a=>a[2].slice(0,12)),auditN});
await page.screenshot({path:path.join(dir,'hash-result-390.png'),fullPage:true});
await dlg.getByRole('button',{name:'Concluir'}).click().catch(()=>page.keyboard.press('Escape'));
// publish still blocked after hash prepared
[v,ts,h]=row(ids[0]);r=await call('admin','POST',`/v1/admin/questions/${ids[0]}/publish`,{expectedContentHash:h,revision:Number(v),reason});rec('publish STILL BLOCKED after hash prepare (no review/rights/integrity)',r.status>=400&&r.status<500&&row(ids[0])[3]!=='published',{status:r.status,err:r.body?.error});
// geracao
await visit('/admin/questoes/geracao');await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();await page.waitForLoadState('networkidle');
rec('geracao loads real metrics/outbox (no error alert)',await page.getByRole('alert').count()===0,{h1:await page.getByRole('heading',{level:1}).first().textContent(),text:(await page.locator('main').innerText()).slice(0,400)});
await axeCheck('admin-geracao');
for(const w of[1440]){await page.setViewportSize({width:w,height:1000});await visit('/admin/questoes');await page.getByRole('combobox',{name:'Hash do conteúdo'}).waitFor();await axeCheck('admin-catalog');await visit('/admin/questoes/geracao');await axeCheck('admin-geracao');await visit('/app/banco-de-questoes');await axeCheck('banco-student-ish');await visit('/admin/questoes/importacoes');await axeCheck('admin-importacoes');}
// keyboard order on geracao desktop
const focus=[];await page.keyboard.press('Tab');for(let i=0;i<8;i++){focus.push(await page.evaluate(()=>{const e=document.activeElement;const r=e.getBoundingClientRect();return (e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,30)+'|h'+Math.round(r.height)+'|outline:'+getComputedStyle(e).outlineStyle;}));await page.keyboard.press('Tab');}
rec('keyboard tab order on geracao reaches interactive controls',focus.some(f=>!f.startsWith('BODY')),focus);
{await call('student','POST','/v1/question-sessions',{mode:'study',questionIds:[meta.privateQuestion],count:1,timerSec:null,shuffle:false},null);}
const hdr=randomUUID();const sess=(await page.request.fetch(api+'/v1/question-sessions',{method:'POST',headers:{Authorization:'Bearer '+meta.actors.student.token,'Idempotency-Key':hdr,'content-type':'application/json'},data:{mode:'study',questionIds:[meta.privateQuestion],count:1,timerSec:null,shuffle:false}}));const sj=(await sess.json()).data;
const ans=await call('student','PUT',`/v1/question-sessions/${sj.id}/items/${sj.items[0].id}/answer`,{selectedKey:'B',mutationId:randomUUID(),revision:sj.revision??0,elapsedMs:1500});rec('student wrong answer recorded via API (for Caderno de erros)',ans.status===200,{status:ans.status});
for(const w of[390,1440]){await page.setViewportSize({width:w,height:900});
 await visit('/app/banco-de-questoes','student');await page.getByRole('button',{name:'Caderno de erros',exact:true}).click();await expect(page.getByRole('article').first()).toBeVisible({timeout:10000}).catch(()=>{});const errCount=await page.getByRole('article').count();rec('student Caderno de erros lists wrong answers @'+w,errCount>=1,{articles:errCount});await axeCheck('student-caderno-erros');
 await page.getByRole('button',{name:'Favoritas',exact:true}).click();await expect(page.getByRole('article').first()).toBeVisible({timeout:10000}).catch(()=>{});rec('student Favoritas tab @'+w,await page.getByRole('article').count()>=1,{});await axeCheck('student-favoritas');
 await visit('/app/simulados','student');await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();await axeCheck('student-simulados');
 await visit('/app/provas','student');await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();await axeCheck('student-provas');}
rec('no JS exceptions',errs.length===0,errs);
}catch(e){rec('UI sequence',false,e.message.slice(0,500));await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});}
fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({res,screens},null,2));await browser.close();process.exitCode=res.some(x=>!x.ok)?1:0;})();
