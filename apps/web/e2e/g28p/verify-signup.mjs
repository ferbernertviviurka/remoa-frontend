// G28-P QA: production components (SignUpWizard) + REAL Hono API on isolated DB through a test-only auth double. Not production, not full-stack e2e.
import {chromium,expect} from '@playwright/test';import {mk,base,out} from './lib.mjs';import path from 'node:path';
const {ok,step,scan,done}=mk('signup: production components, real API/SQL on isolated DB, test auth double');
const browser=await chromium.launch();
for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?page=signup&plano=pro_annual&curso=nursing');await expect(page.getByLabel('Seu nome')).toBeVisible();await page.waitForTimeout(1200);
  const W=(n)=>`${n} ${width}`;
  await step(W('plan box + 3 steps'),async()=>{await expect(page.locator('p',{hasText:'Plano escolhido:'})).toContainText('Pro anual');await expect(page.getByText('Revisar').first()).toBeVisible();});
  await scan(page,'step1',width);
  await step(W('step1 validation blocks'),async()=>{await page.getByRole('button',{name:'Continuar'}).first().click();await expect(page.getByText('Seu estudo')).toHaveCount(0).catch(()=>{});return (await page.getByLabel('Seu nome').isVisible());});
  await page.getByLabel('Seu nome').fill('Ana Teste');await page.getByLabel('E-mail').fill(`ana${Date.now()}@example.com`);await page.getByLabel('Senha').first().fill('abcdef123456');
  await page.getByRole('button',{name:'Continuar'}).first().click();await expect(page.getByRole('heading',{level:1,name:'Seu estudo'})).toBeVisible();
  await page.screenshot({path:path.join(out,`signup-estudo-${width}.png`),fullPage:true});
  await step(W('course preselected Enfermagem from ?curso'),()=>expect(page.getByRole('combobox',{name:'Curso ou área'})).toHaveValue('Enfermagem'));
  await step(W('autofill box council COREN + suggested goal, Desfazer'),async()=>{await expect(page.getByText('Conselho: COREN')).toBeVisible();await expect(page.getByText(/Objetivo sugerido: Residência em enfermagem/)).toBeVisible();await expect(page.getByRole('button',{name:'Desfazer'})).toBeVisible();});
  await scan(page,'step2',width);
  await step(W('step2 validation (no course/goal) blocks and says why'),async()=>{const pg=await ctx.newPage();await pg.goto(base+'/?page=signup');await expect(pg.getByLabel('Seu nome')).toBeVisible();await pg.waitForTimeout(1200);
    await pg.getByLabel('Seu nome').fill('Ana Teste');await pg.getByLabel('E-mail').fill('v@example.com');await pg.getByLabel('Senha').first().fill('abcdef123456');await pg.getByRole('button',{name:'Continuar'}).first().click();
    await expect(pg.getByRole('heading',{level:1,name:'Seu estudo'})).toBeVisible();await pg.getByRole('button',{name:'Continuar'}).first().click();
    await expect(pg.getByText('Escolha o seu curso.')).toBeVisible();await expect(pg.getByText('Escolha o seu curso e pelo menos um foco de estudo.')).toBeVisible();await expect(pg.getByRole('heading',{level:1,name:'Seu estudo'})).toBeVisible();await scan(pg,'step2-errors',width);await pg.close();});
  await page.getByRole('radio',{name:/Estudante/}).click();
  await step(W('período only for graduacao'),async()=>{await expect(page.getByRole('button',{name:'Próximo período'})).toBeVisible();await expect(page.getByLabel(/Número no conselho/)).toHaveCount(0);await page.getByRole('radio',{name:/Residente/}).click();await expect(page.getByRole('button',{name:'Próximo período'})).toHaveCount(0);await page.getByRole('radio',{name:/Estudante/}).click();});
  await step(W('D-1862: signup never asks council number (even profissional)'),async()=>{await page.getByRole('radio',{name:/Profissional/}).click();await expect(page.getByLabel(/Número no conselho/)).toHaveCount(0);await page.getByRole('radio',{name:/Estudante/}).click();});
  await step(W('Desfazer removes auto goal'),async()=>{await page.getByRole('button',{name:'Desfazer'}).click();await expect(page.getByText(/Objetivo sugerido/)).toHaveCount(0);});
  // switch to Farmácia by accent-less typing + keyboard
  const course=page.getByRole('combobox',{name:'Curso ou área'});
  await step(W('"farmacia" finds Farmácia (keyboard select)'),async()=>{await course.click();await course.fill('farmacia');await expect(page.getByRole('option',{name:/Farmácia/})).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(course).toHaveValue('Farmácia');await expect(page.getByText('Conselho: CRF')).toBeVisible();});
  await step(W('user-picked goal survives course switch; auto goal updates'),async()=>{await page.getByRole('button',{name:'Idiomas'}).click();await expect(page.getByRole('button',{name:'Idiomas'})).toHaveAttribute('aria-pressed','true');
    await course.fill('odonto');await page.getByRole('option',{name:/Odontologia/}).click();await expect(page.getByText('Conselho: CRO')).toBeVisible();await expect(page.getByRole('button',{name:'Idiomas'})).toHaveAttribute('aria-pressed','true');});
  await step(W('"tecnico" finds técnico course'),async()=>{await course.fill('tecnico');const n=await page.getByRole('option').allInnerTexts();return n.some(x=>/Técnico/i.test(x))||{n};});
  await page.getByRole('option').first().click();
  await step(W('Outro curso da saúde → free text; "Usar" never blocks'),async()=>{await course.fill('Biomedicina esotérica');const use=page.getByRole('option',{name:/Usar/});await expect(use).toBeVisible();await use.click();});
  await step(W('not_health asks "O que você estuda?"'),async()=>{await course.fill('nao e da area');await page.getByRole('option',{name:/Não é da área da saúde/}).click();await expect(page.getByLabel('O que você estuda?')).toBeVisible();});
  // back to nursing for submit
  await course.fill('enfermagem');await page.getByRole('option',{name:'Enfermagem'}).first().click();
  const inst=page.getByRole('combobox',{name:'Instituição de ensino'});
  await step(W('institution "ufpr" fills city/UF/type'),async()=>{await inst.click();await inst.fill('ufpr');await page.getByRole('option',{name:/Universidade Federal do Paraná/}).click();const body=await page.locator('form').innerText();return /Curitiba/.test(body)&&/PR/.test(body)&&/Pública/.test(body)||{body:body.slice(0,300)};});
  await step(W('institution "sao paulo" async search'),async()=>{await inst.fill('sao paulo');await expect(page.getByRole('option').first()).toBeVisible();const n=await page.getByRole('option').count();return n>0;});
  await step(W('institution "Usar o que digitei" accepted'),async()=>{await inst.fill('Faculdade Inventada do Vale');await page.getByRole('option',{name:/Usar/}).click();return true;});
  await page.getByRole('radio',{name:/Estudante/}).click();
  await step(W('step2 continue (goals needed)'),async()=>{if(await page.getByText(/Objetivo sugerido/).count()===0){await page.getByRole('button',{name:'Provas do curso'}).click();}await page.getByRole('button',{name:'Continuar'}).first().click();await expect(page.getByRole('heading',{level:1,name:'Confira e crie a conta'})).toBeVisible();});
  await scan(page,'step3',width);await page.screenshot({path:path.join(out,`signup-revisar-${width}.png`),fullPage:true});
  await step(W('consent required'),async()=>{await page.getByRole('button',{name:'Criar conta'}).first().click();await expect(page.getByRole('heading',{level:1,name:'Confira e crie a conta'})).toBeVisible();return (await page.evaluate(()=>window.__signup))===undefined;});
  await step(W('draft keeps no password and no council number'),async()=>{const raw=await page.evaluate(()=>JSON.stringify({l:{...localStorage},s:{...sessionStorage}}));return !/abcdef123456/.test(raw)||{raw:raw.slice(0,200)};});
  await page.getByRole('checkbox').first().check();
  await step(W('submit sends metadata study_profile (course nursing)'),async()=>{await page.getByRole('button',{name:'Criar conta'}).first().click();await page.waitForFunction(()=>window.__signup);const s=await page.evaluate(()=>window.__signup);return s.meta.study_profile?.course==='nursing'&&s.hasPassword&&!('password' in s.meta)||{s};});
  await step(W('adoption: real API GET study-profile as new user (source signup)'),async()=>{await page.waitForFunction(()=>localStorage.getItem('g28p-last-signup'));const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('g28p-last-signup')).id);const r=await (await page.request.get(base+'/v1/account/study-profile',{headers:{authorization:`Bearer ${id}`}})).json();return r.data.profile?.source==='signup'&&r.data.profile.course==='nursing'&&r.data.capabilities.showEnamed===false||{r};});
  ok(W('no JS exceptions'),errors.length===0,{errors});await ctx.close();
}
await browser.close();done('report-signup.json');
