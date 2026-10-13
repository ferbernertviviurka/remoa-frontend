// F34 Criador de prova: componentes reais + API HTTP sintética (rótulo "synthetic"). Não é E2E de backend.
// Uso (em apps/web): pnpm exec vite --config e2e/exam-builder/harness/vite.config.mts   e depois   node e2e/exam-builder/verify-ui.mjs
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const require=createRequire(import.meta.url);const here=fileURLToPath(new URL('.',import.meta.url));
const axe=require.resolve('axe-core/axe.min.js');const base='http://127.0.0.1:4327';
const out=path.join(here,'artifacts');fs.mkdirSync(out,{recursive:true});
const report={kind:'synthetic HTTP API, production components',checks:[]};
const ok=(name,passed,extra={})=>{report.checks.push({name,passed,...extra});};
const scan=async(page,name,width)=>{await page.addScriptTag({path:axe});
  const r=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  ok(`axe ${name} ${width}`,r.violations.length===0,{violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});ok(`no horizontal scroll ${name} ${width}`,!overflow);};
(async()=>{
  const browser=await chromium.launch({headless:true});
  for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.request.get(base+'/__test/reset');await page.goto(base+'/');
    await expect(page.getByRole('heading',{level:1,name:'Criador de prova'})).toBeVisible();
    await expect(page.getByText('Enunciado sintético 1,')).toBeVisible();await expect(page.getByText('Encontramos 40 questões disponíveis')).toBeVisible();
    await page.screenshot({path:path.join(out,`criador-${width}.png`),fullPage:true});await scan(page,'builder',width);
    // swap / remove / pin / reshuffle
    await page.getByRole('button',{name:'Trocar a questão 2'}).click();await expect(page.getByText('Enunciado sintético 90,')).toBeVisible();
    await page.getByRole('button',{name:'Remover a questão 1'}).click();await expect(page.getByText('Enunciado sintético 1,')).toHaveCount(0);
    await page.getByRole('button',{name:'Fixar a questão 1'}).click();await expect(page.getByRole('button',{name:'Desafixar a questão 1'})).toHaveAttribute('aria-pressed','true');
    // keyboard: Tab until "Começar prova" (summary) is focused, Enter opens the confirmation dialog
    let focused=false;for(let i=0;i<120&&!focused;i++){await page.keyboard.press('Tab');focused=await page.evaluate(()=>document.activeElement?.textContent==='Começar prova');}
    ok(`keyboard reaches Começar ${width}`,focused);
    await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText(/gabarito aparece depois de cada questão/)).toBeVisible();
    await scan(page,'confirm',width);
    // exam_changed → what changed → accept → start again
    await page.request.get(base+'/__test/mode?v=changed');
    await page.getByRole('dialog').getByRole('button',{name:'Começar prova'}).click();
    await expect(page.getByText('1 saem da prova por não estarem mais disponíveis.')).toBeVisible();await scan(page,'changed',width);
    await page.getByRole('button',{name:'Aceitar mudanças'}).click();
    await page.getByRole('button',{name:'Começar prova'}).first().click();
    await page.getByRole('dialog').getByRole('button',{name:'Começar prova'}).click();
    await page.waitForURL(/\/app\/simulados\//);ok(`navigates to execution ${width}`,true);
    const log=(await (await page.request.get(base+'/__test/log')).json()).data;
    ok(`POST question-sessions carried Idempotency-Key ${width}`,log.filter(l=>l.startsWith('POST /v1/question-sessions')&&l.includes('key=')).length===2);
    // active session
    await page.request.get(base+'/__test/mode?v=active');await page.goto(base+'/');await expect(page.getByText('Enunciado sintético 1,')).toBeVisible();
    await page.getByRole('button',{name:'Começar prova'}).first().click();await page.getByRole('dialog').getByRole('button',{name:'Começar prova'}).click();
    await expect(page.getByRole('link',{name:'Retomar prova'})).toHaveAttribute('href',/\/app\/simulados\/00000000-0000-4000-8000-000000000333/);
    ok(`no JS exceptions ${width}`,errors.length===0,{errors});await ctx.close();
  }
  await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks.filter(c=>!c.passed),null,2),`${report.checks.length} checks`);
  if(report.checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
