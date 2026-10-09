// Browser QA of the real deferred dialog + real ConfigDialog, with a synthetic test-only loader failure. No DB/SSR verification.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
const require=createRequire(import.meta.url);const here=fileURLToPath(new URL('.',import.meta.url));const dir=path.join(here,'artifacts/dialog-boundary');fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});const checks=[];
const shot=async name=>{await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(item=>item.id));expect(violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual((await page.viewportSize()).width);await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});checks.push({state:name,passed:true,axeViolations:violations.length});};
try{
 await page.goto('http://127.0.0.1:4317/qa/dialog-boundary');const trigger=page.getByRole('button',{name:'Abrir configuração de teste'});await trigger.click();await expect(page.getByRole('status')).toBeVisible();await shot('loading-390');await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.waitForTimeout(1400);await trigger.click();await expect(page.getByRole('alert')).toBeVisible();await shot('failure-390');await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('button',{name:'Tentar de novo'}).click();await expect(page.getByRole('dialog')).toBeVisible();const count=page.getByLabel('Quantidade de questões',{exact:true});await count.fill('7');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();await trigger.click();await expect(count).toHaveValue('7');await shot('loaded-draft-390');await page.setViewportSize({width:1440,height:1000});await shot('loaded-draft-1440');
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({kind:'UI browser + synthetic loader failure; real production DeferredQuestionDialog and ConfigDialog. API stub only; no PostgreSQL, Next SSR or external auth.',checks,focusEscapeDraft:true},null,2));
}catch(error){await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({kind:'test-only synthetic loader QA',checks,error:error.message},null,2));throw error;}finally{await browser.close();}
