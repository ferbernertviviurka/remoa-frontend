// G28-P QA: Conta "Seu estudo" (StudySection) + Rail, production components, REAL API/SQL on isolated DB. Not production.
import {chromium,expect} from '@playwright/test';import {execFileSync} from 'node:child_process';import {mk,base,out} from './lib.mjs';import path from 'node:path';
const DB='postgresql://postgres:postgres@127.0.0.1:54322/remoa_f33_test_g28p_qa';
const {ok,step,scan,done}=mk('conta Seu estudo: production components, real API/SQL on isolated DB');
const user=async(kind)=>(await (await fetch(base+'/__test/user'+(kind?`?kind=${kind}`:''))).json()).id;
const put=async(id,b)=>(await fetch(base+'/v1/account/study-profile',{method:'PUT',headers:{authorization:`Bearer ${id}`,'content-type':'application/json'},body:JSON.stringify(b)})).json();
const browser=await chromium.launch();
for(const width of [1440,390]){
  const W=(n)=>`${n} ${width}`;
  const mkctx=async(id)=>{const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});await ctx.addInitScript((t)=>localStorage.setItem('g28p-token',t),id);return ctx;};
  // A) medicine+graduacao -> edit to Enfermagem -> menu updates live
  let id=await user();await put(id,{situation:'graduacao',course:'medicine',goals:['enamed'],period:9,institutionText:'Minha faculdade'});
  let ctx=await mkctx(id);let page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?page=conta&path=/app/conta/perfil');await expect(page.getByText('SEU FOCO',{exact:true})).toBeVisible();await page.waitForTimeout(600);
  await step(W('focus card + register % + shortcuts (medicine grad: Abrir mapas do ENAMED)'),async()=>{await expect(page.getByText('Estudante de Medicina · 9º período')).toBeVisible();await expect(page.getByText(/\d+% completo/)).toBeVisible();await expect(page.getByRole('navigation',{name:'Atalhos do seu estudo'}).getByRole('link',{name:'Abrir mapas do ENAMED'})).toBeVisible();await expect(page.getByRole('link',{name:'Novo mapa'})).toBeVisible();});
  if(width===1440)await step(W('rail shows Enamed before edit'),async()=>(await page.locator('#rail-wrap a[href="/app/cobertura"]').count())===1);
  await page.screenshot({path:path.join(out,`conta-estudo-${width}.png`),fullPage:true});await scan(page,'conta view',width);
  await page.getByRole('button',{name:'Editar'}).click();await expect(page.getByRole('combobox',{name:'Curso ou área'})).toBeVisible();await scan(page,'conta edit',width);
  const course=page.getByRole('combobox',{name:'Curso ou área'});
  await step(W('inline edit: switch to Enfermagem via keyboard, save'),async()=>{await course.click();await course.fill('enferm');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(course).toHaveValue('Enfermagem');
    const goals=page.getByRole('button',{name:'Provas da faculdade'});await goals.click();await page.getByRole('button',{name:'Salvar'}).click();await expect(page.getByText('Seu estudo foi atualizado.')).toBeVisible();});
  await step(W('after save: focus card, shortcuts and menu update without reload'),async()=>{await expect(page.getByText(/Estudante de Enfermagem/)).toBeVisible();await expect(page.getByRole('link',{name:'Abrir mapas do ENAMED'})).toHaveCount(0);if(width===1440)return (await page.locator('#rail-wrap a[href="/app/cobertura"]').count())===0;});
  await step(W('persisted in DB (real API): course nursing, source profile'),async()=>{const r=await (await fetch(base+'/v1/account/study-profile',{headers:{authorization:`Bearer ${id}`}})).json();return r.data.profile.course==='nursing'&&r.data.profile.source==='profile'&&r.data.capabilities.showEnamed===false||{r};});
  await step(W('audit row written (study_profile_audit, fields only)'),async()=>{const n=execFileSync('psql',[DB,'-Atc',`select count(*), string_agg(fields::text,';') from study_profile_audit where user_id='${id}'`]).toString().trim();return /^[1-9]/.test(n)||{n};});
  ok(W('no JS exceptions'),errors.length===0,{errors});await ctx.close();
  // B) migration user: banner, confirm via edit removes banner
  id=await user('migration');execFileSync('psql',[DB,'-qc',`insert into study_profiles (user_id, source, goals) values ('${id}','migration','{enamed}')`]);
  ctx=await mkctx(id);page=await ctx.newPage();await page.goto(base+'/?page=conta&path=/app/conta/perfil');await expect(page.getByText('SEU FOCO',{exact:true})).toBeVisible();await page.waitForTimeout(600);
  await step(W('migration: banner + focus empty (no course inferred)'),async()=>{await expect(page.getByText('Confirme o seu estudo')).toBeVisible();await expect(page.getByText('Conte o que você estuda')).toBeVisible();});
  await step(W('migration: confirm via edit (course medicine) removes banner, source profile'),async()=>{await page.getByRole('button',{name:'Editar'}).click();const c=page.getByRole('combobox',{name:'Curso ou área'});await c.click();await c.fill('medicina');await page.getByRole('option',{name:'Medicina'}).first().click();
    await page.getByRole('radio',{name:/Estudante/}).click();const en=page.getByRole('button',{name:'ENAMED',exact:true});if(await en.getAttribute('aria-pressed')!=='true')await en.click();
    await page.getByRole('button',{name:'Salvar'}).click();await expect(page.getByText('Seu estudo foi atualizado.')).toBeVisible();await expect(page.getByText('Confirme o seu estudo')).toHaveCount(0);const r=await (await fetch(base+'/v1/account/study-profile',{headers:{authorization:`Bearer ${id}`}})).json();return r.data.profile.source==='profile'||{r};});
  await ctx.close();
}
await browser.close();done('report-conta.json');
