// G28-P QA: Landing production components (LandingPage tree, blog/enamed-slides stubbed, pricebook synthetic 3900/34900/59900), picker -> CTA href. Not production, not SSR HTML.
import {chromium,expect} from '@playwright/test';import {mk,base,out} from './lib.mjs';import path from 'node:path';
const {ok,step,scan,done}=mk('landing: production components in a browser harness (client render, not SSR), synthetic pricebook');
const browser=await chromium.launch();
for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const W=(n)=>`${n} ${width}`;
  await page.goto(base+'/?page=landing');await expect(page.getByText('Para toda a área da saúde').first()).toBeVisible();
  for(let y=0;y<14;y++){await page.evaluate((h)=>window.scrollBy(0,h),1200);await page.waitForTimeout(350);}await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(800);
  const text=await page.locator('body').innerText();
  await step(W('tag "Para toda a área da saúde"'),()=>/Para toda a área da saúde/.test(text));
  await step(W('"Para quem é" section lists courses, no promise'),()=>/PARA QUEM É/i.test(text)&&/Enfermagem/.test(text)&&/Feito para toda a área da saúde/.test(text));
  await step(W('FAQ first item "O Remoa é só para Medicina?"'),async()=>{const first=await page.locator('#faq button[aria-expanded], section:has-text("Perguntas frequentes") button[aria-expanded], section:has-text("Perguntas frequentes") summary').first().innerText();return /O Remoa é só para Medicina\?/.test(first)||{first};});
  await step(W('ENAMED "para Medicina", marked Em breve (no ready-content promise)'),()=>/PARA MEDICINA, EM BREVE/i.test(text)||/ENAMED, para Medicina/i.test(text));
  await step(W('no "já no ar" anywhere / no "banco de questões"'),()=>({jaNoAr:(text.match(/já no ar/gi)||[]).length,banco:(text.match(/banco de questões/gi)||[]).length}).jaNoAr===0&&!/banco de questões/i.test(text));
  await step(W('no claims of ready content for other areas (grep "prontos|prontas" contexts)'),async()=>{const ctxs=[...text.matchAll(/.{50}(mapas? prontos?|prontas?).{60}/gi)].map(m=>m[0].replace(/\n/g,' '));const bad=ctxs.filter(c=>/Enfermagem|Odontologia|Farm|Fisio|Nutri|Psico|toda a área/i.test(c)&&!/Medicina|Enamed|ENAMED/i.test(c));return bad.length===0||{bad,ctxs};});
  await step(W('prices R$ 39 / 349 / 599 unchanged'),()=>{const m=text.match(/R\$\s?\d[\d.,]*/g)||[];return (/39/.test(m.join())&&/349/.test(m.join())&&/599/.test(m.join()))||{m};});
  // picker
  await step(W('picker: pick Enfermagem -> every signup CTA carries curso=nursing'),async()=>{await page.getByText('Enfermagem',{exact:true}).first().click();await page.waitForTimeout(400);const hrefs=await page.evaluate(()=>[...document.querySelectorAll('a[href*="cadastro"]')].map(a=>a.getAttribute('href')));return hrefs.length>0&&hrefs.every(h=>/curso=nursing/.test(h))||{hrefs};});
  await step(W('picker: plan CTAs keep plano= and add curso'),async()=>{const hrefs=await page.evaluate(()=>[...document.querySelectorAll('a[href*="plano="]')].map(a=>a.getAttribute('href')));return hrefs.length>0&&hrefs.every(h=>/plano=/.test(h)&&/curso=nursing/.test(h)&&/de=landing/.test(h))||{hrefs};});
  await step(W('picker keyboard reachable'),async()=>{let hit=false;for(let i=0;i<60&&!hit;i++){await page.keyboard.press('Tab');hit=await page.evaluate(()=>/Odontologia|Farmácia|Fisioterapia|Nutrição|Psicologia|Medicina/.test(document.activeElement?.textContent||'')&&document.activeElement?.closest('[data-course-picker],[role=radiogroup],[role=group],div')!==null);}return hit;});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`landing-hero-${width}.png`)});
  await scan(page,'landing',width);
  ok(W('no JS exceptions'),errors.length===0,{errors});await ctx.close();
}
await browser.close();done('report-landing.json');
