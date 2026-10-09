/** CCR138/140 production UI with strict synthetic HTTP only; root executes exclusively. */
import {chromium,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),base=process.env.F33_UI_BASE_URL??'http://127.0.0.1:4317';
const parsed=new URL(base);if(parsed.protocol!=='http:'||!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.username||parsed.password)throw new Error('Local isolated UI harness required');
const dir=fileURLToPath(new URL('./artifacts/result-review/',import.meta.url));fs.mkdirSync(dir,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const checks=[],measurements=[],axeChecks=[],browser=await chromium.launch({channel:'chromium'});
const limits=['Synthetic nonmedical HTTP fixtures only; no SQL/auth/R2/provider/Next SSR verification','Figure is the authorial harness SVG, not a medical or restricted PDF','Counts and scores come from typed synthetic report responses; no clinical review or public acquisition claim'];
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const reset=async(scenario,editorial=false)=>{const response=await page.request.get(`${base}/__test/reset?scenario=${scenario}`);expect(response.status()).toBe(200);await page.goto(editorial?`${base}/app/editorial/questoes/${id(401)}?role=admin`:`${base}/app/simulados/${id(310)}`);};
 const calls=async()=> (await(await page.request.get(`${base}/__test/calls`)).json()).data;
 const subject=()=>page.getByRole('region',{name:'Resultado por assunto'});
 const comparison=()=>page.getByRole('region',{name:'Comparação com o acervo atual'});
 const verify=async()=>{
  // Wait for committed styles, loaded fonts and finite transitions, without masking violations.
  await page.evaluate(async()=>{
   await Promise.race([document.fonts.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Fonts did not settle')),5000))]);
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const animations=document.getAnimations().filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().iterations));
   if(animations.length)await Promise.race([Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Finite animations did not settle')),3000))]);
  });
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const details=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(value=>({id:value.id,impact:value.impact,description:value.description,help:value.help,nodes:value.nodes.map(node=>({target:node.target,html:node.html,failureSummary:node.failureSummary}))})));
  axeChecks.push({width,check:checks.length+1,violations:details});fs.writeFileSync(path.join(dir,'axe-details.json'),JSON.stringify(axeChecks,null,2));const violations=details.map(value=>value.id);expect(violations).toEqual([]);
  const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);expect(scrollWidth).toBeLessThanOrEqual(width);expect(errors).toEqual([]);return{scrollWidth,axeViolations:violations,jsErrors:[...errors]};
 };
 const shot=async(name,region)=>{await verify();if(region)await region.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`${name}-${width}-viewport.png`)});if(region)await region.screenshot({path:path.join(dir,`${name}-${width}-panel.png`)});};
 const run=async(name,fn)=>{try{await fn();checks.push({name,width,passed:true,...await verify()});}catch(error){checks.push({name,width,passed:false,error:error.message});await page.screenshot({path:path.join(dir,`failure-${width}-viewport.png`)});throw error;}};
 await run('Finished review exposes only authorized final choices, figure and distractors; distinct do not know and unanswered',async()=>{
  await reset('result-review-finished');await expect(page.getByText('1 de 4 questões corretas',{exact:true})).toBeVisible();const first=page.getByRole('article',{name:'Questão 1'});
  const stem=await first.locator('p.font-display.whitespace-pre-wrap').filter({hasText:/^Documento autoral sintético de engenharia\./}).textContent();expect(stem.length).toBeGreaterThanOrEqual(19970);expect(stem.endsWith(' NÃO se aplica.')).toBe(true);
  await expect(first.getByText('Sua resposta: B',{exact:true})).toBeVisible();await expect(first.getByText('Sua alternativa',{exact:true})).toBeVisible();await expect(first.getByText('Alternativa correta',{exact:true})).toBeVisible();await expect(first.getByText(/Comentário revisado da alternativa sintética B/)).toBeVisible();await expect(first.getByText('Existe uma versão mais recente')).toBeVisible();
  const image=first.getByRole('img',{name:'Figura autoral: dois círculos roxos de tamanhos distintos'});await expect.poll(async()=>image.evaluate(node=>[node.naturalWidth,node.naturalHeight])).toEqual([1600,600]);await expect(image).toHaveAttribute('src',`${base}/diagram.svg`);
  await expect(page.getByRole('article',{name:'Questão 2'}).getByText('Você marcou Não sei.')).toBeVisible();await expect(page.getByRole('article',{name:'Questão 3'}).getByText('Você não respondeu esta questão.')).toBeVisible();await expect(page.getByRole('article',{name:'Questão 4'}).getByText(/Gabarito:/)).toHaveCount(0);await expect(page.getByRole('radio')).toHaveCount(0);
  const network=await calls();expect(network.filter(call=>call.path.endsWith('/reference'))).toHaveLength(0);measurements.push({width,stemCharacters:stem.length,imageNaturalPixels:[1600,600],originalScore:[1,4]});await shot('finished-choices',first.getByText('Sua resposta: B',{exact:true}));await shot('authorized-figure',image);
 });
 await run('Per-subject outcomes preserve annulled counts and unknown taxonomy without UUID labels',async()=>{
  await reset('result-review-finished');await expect(subject().getByText('Assunto autoral demonstrativo')).toBeVisible();await expect(subject().getByText('Acertos: 0 · Questões válidas: 2')).toBeVisible();await expect(subject().getByText('1 anulada',{exact:true})).toBeVisible();await expect(subject().getByText('Sem classificação por assunto')).toBeVisible();await expect(subject().getByText('Assunto não identificado')).toBeVisible();expect(await subject().textContent()).not.toContain(id(399));await shot('subject-outcomes',subject());
  await reset('result-review-taxonomy-unknown');await expect(subject().getByRole('status')).toHaveCount(0);await expect(subject().getByText('Assunto não identificado')).toHaveCount(2);await expect(subject().getByText('Acertos: 1 · 1 questão válida')).toBeVisible();await shot('unknown-taxonomy',subject());
 });
 await run('Taxonomy HTTP failure preserves counts and explicit keyboard retry loads names',async()=>{
  await reset('result-review-taxonomy-error');await expect(subject().getByRole('alert')).toBeVisible();await expect(subject().getByText('Acertos: 0 · Questões válidas: 2')).toBeVisible();const retry=subject().getByRole('button',{name:'Tentar de novo'});await retry.focus();await expect(retry).toBeFocused();await page.keyboard.press('Enter');await expect(subject().getByText('Assunto autoral demonstrativo')).toBeVisible();await expect(subject().getByRole('alert')).toHaveCount(0);await expect(page.getByText('1 de 4 questões corretas',{exact:true})).toBeVisible();await shot('taxonomy-retry',subject());
 });
 await run('Partial recalculation identifies ordinal, original number and full original stem without replacement score',async()=>{
  await reset('result-review-finished');await expect(page.getByText('1 de 4 questões corretas',{exact:true})).toBeVisible();expect((await calls()).some(call=>call.path.endsWith('/recalculation'))).toBe(false);const action=comparison().getByRole('button',{name:'Comparar com versões atuais'});await action.focus();await expect(action).toBeFocused();await page.keyboard.press('Enter');await expect(comparison().getByText('A comparação está incompleta. Não há uma nova nota para esta tentativa.')).toBeVisible();await expect(comparison().getByRole('heading',{name:'Questão 1',exact:true})).toBeVisible();await expect(comparison().getByText('Número original: 11')).toBeVisible();await expect(comparison().getByText('Versão original 1 · versão comparada 2')).toBeVisible();await expect(comparison().getByText('Conteúdo não comparável')).toBeVisible();expect((await comparison().textContent()).includes('NÃO se aplica.')).toBe(true);await expect(comparison().getByText(/de .* questões corretas/)).toHaveCount(0);await expect(page.getByText('1 de 4 questões corretas',{exact:true})).toHaveCount(1);await shot('partial-comparison',comparison().getByText('Conteúdo não comparável'));
 });
 await run('Active simulator exposes no answer keys or report/reference content in HTTP, DOM or storage',async()=>{
  await reset('result-review-active');await expect(page.getByRole('radio').first()).toBeVisible();await expect(page.getByRole('region',{name:'Resultado por assunto'})).toHaveCount(0);const network=await calls();expect(network.some(call=>/\/(report|reference|recalculation)$/.test(call.path))).toBe(false);
  const response=await page.request.get(`${base}/v1/question-sessions/${id(310)}`),payload=await response.json();expect(payload.data.status).toBe('active');expect(payload.data.items.every(item=>item.answered===false&&item.selectedKey===null)).toBe(true);expect(JSON.stringify(payload)).not.toMatch(/correctKey|distractorNotes|explanation|referenceRef|objectKey/);
  const local=await page.evaluate(()=>({html:document.documentElement.innerHTML,storage:JSON.stringify({local:{...localStorage},session:{...sessionStorage}})}));expect(local.html).not.toMatch(/Comentário autoral sintético|Comentário revisado da alternativa|Gabarito:/);expect(local.storage).not.toMatch(/correctKey|distractorNotes|explanation|referenceRef/);
  for(const endpoint of [`/v1/question-sessions/${id(310)}/report`,`/v1/question-sessions/${id(310)}/items/${id(321)}/reference`]){const denied=await page.request.get(base+endpoint);expect(denied.status()).toBe(403);expect(JSON.stringify(await denied.json())).not.toMatch(/correctKey|explanation|distractorNotes/);}
  await shot('active-reference-gate',page.getByRole('radio').first());
 });
 await run('Authorized reviewed annulled publication requires reason/current hash and keeps dialog focus behavior',async()=>{
  await reset('result-review-annulled-approved',true);const publish=page.getByRole('button',{name:'Publicar questão',exact:true});await expect(publish).toBeEnabled();await expect(page.getByText('Gabarito: Sem gabarito',{exact:true})).toBeVisible();await publish.focus();await page.keyboard.press('Enter');let dialog=page.getByRole('dialog',{name:'Publicar questão'});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(publish).toBeFocused();await publish.click();dialog=page.getByRole('dialog',{name:'Publicar questão'});await expect(dialog.getByRole('button',{name:'Publicar questão'})).toBeDisabled();const reason='Publicar anulada autoral sintética no histórico revisado';await dialog.getByLabel('Motivo desta operação').fill(reason);await shot('annulled-publication-reason',dialog);await dialog.getByRole('button',{name:'Publicar questão'}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Retirar de circulação'})).toBeEnabled();const requests=(await calls()).filter(call=>call.method==='POST'&&call.path.endsWith('/publish'));expect(requests).toHaveLength(1);expect(requests[0].body).toEqual({expectedContentHash:'c'.repeat(64),revision:2,reason});await expect(page.getByText('Gabarito: Sem gabarito',{exact:true})).toBeVisible();await shot('annulled-published',page.getByRole('button',{name:'Retirar de circulação'}));
 });
 await run('Annulled review never relaxes missing medical/source authorization or withdrawn/unavailable gates',async()=>{
  for(const suffix of ['no-review','no-rights','no-source','withdrawn','unavailable']){await reset('result-review-annulled-'+suffix,true);await expect(page.getByText('Anulada autoral de teste: nenhum conteúdo clínico.')).toBeVisible();await expect(page.getByRole('button',{name:'Publicar questão',exact:true})).toBeDisabled();expect((await calls()).some(call=>call.method==='POST'&&call.path.endsWith('/publish'))).toBe(false);await verify();}await shot('annulled-denied',page.getByRole('button',{name:'Publicar questão',exact:true}));
 });
 await context.close();
}}
catch(error){console.error(error.message);process.exitCode=1;}
finally{fs.writeFileSync(path.join(dir,'result-review-report.json'),JSON.stringify({kind:'Production components, strict synthetic HTTP only — CCR138/140',limits,measurements,axeDetailsArtifact:'axe-details.json',checks},null,2));await browser.close();}
if(checks.length!==14||checks.some(check=>!check.passed))process.exitCode=1;
