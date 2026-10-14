// G28-P QA: Rail/MobileMenu/Hoje slot/Coverage gate/ConfirmBanner production components, capabilities from the REAL API on isolated DB. Not production.
import {chromium,expect} from '@playwright/test';import {execFileSync} from 'node:child_process';import {mk,base} from './lib.mjs';
const DB='postgresql://postgres:postgres@127.0.0.1:54322/remoa_f33_test_g28p_qa';
const {ok,step,scan,done}=mk('menu by profile: production components, real API/SQL on isolated DB');
const post=async(id,method,path,body)=>(await fetch(base+path,{method,headers:{authorization:`Bearer ${id}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined})).json();
const user=async(kind)=>(await (await fetch(base+'/__test/user'+(kind?`?kind=${kind}`:''))).json()).id;
const put=(id,b)=>post(id,'PUT','/v1/account/study-profile',b);
const profiles={
  'no-row':async()=>user(),
  'migration':async()=>{const id=await user('migration');execFileSync('psql',[DB,'-qc',`insert into study_profiles (user_id, source, goals) values ('${id}','migration','{enamed}')`]);return id;},
  'medicine+graduacao':async()=>{const id=await user();await put(id,{situation:'graduacao',course:'medicine',goals:['enamed'],period:9});return id;},
  'medicine+residente':async()=>{const id=await user();await put(id,{situation:'residente',course:'medicine',goals:['residencia_medica']});return id;},
  'nursing':async()=>{const id=await user();await put(id,{situation:'graduacao',course:'nursing',goals:['provas_curso'],period:3});return id;},
  'other_health':async()=>{const id=await user();await put(id,{situation:'profissional',course:'other_health',courseOtherText:'Quiropraxia',goals:['atualizacao_profissional']});return id;},
  'not_health':async()=>{const id=await user();await put(id,{situation:'preparando',course:'not_health',nonHealthTopic:'Direito',goals:['aprender_por_conta']});return id;},
};
const expectEnamed={'no-row':true,'migration':true,'medicine+graduacao':true,'medicine+residente':false,'nursing':false,'other_health':false,'not_health':false};
const expectBanner={'no-row':true,'migration':true};
const browser=await chromium.launch();
for(const [name,make] of Object.entries(profiles)){
  const id=await make();
  for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});await ctx.addInitScript((t)=>localStorage.setItem('g28p-token',t),id);
    const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const W=(n)=>`${name}: ${n} ${width}`;
    await page.goto(base+'/?page=menu');await page.waitForFunction(()=>document.querySelector('[data-loaded="1"]'));await page.waitForTimeout(400);
    const want=expectEnamed[name];
    if(width===1440)await step(W('rail Enamed link '+(want?'shown':'hidden')),async()=>{const n=await page.locator('#rail-wrap a[href="/app/cobertura"]').count();return (n>0)===want||{n};});
    else await step(W('mobile menu Enamed '+(want?'shown':'hidden')),async()=>{await page.getByRole('button',{name:/Abrir menu/i}).click();const dlg=page.getByRole('dialog');await expect(dlg).toBeVisible();const n=await dlg.locator('a[href="/app/cobertura"]').count();await page.keyboard.press('Escape');return (n>0)===want||{n};});
    await step(W('Hoje coverage '+(want?'Enamed':'focus prompt (no Enamed)')),async()=>{const has=await page.getByTestId('enamed-cov').count()>0;const prompt=await page.getByText('Defina o seu foco').count()>0;return want?has&&!prompt:(!has&&prompt)||{has,prompt};});
    await step(W('banner "Confirme o seu estudo" '+(!!expectBanner[name])),async()=>{const n=await page.getByText('Confirme o seu estudo').count();return (n>0)===!!expectBanner[name]||{n};});
    await page.goto(base+'/?page=coverage&path=/app/cobertura');await page.waitForFunction(()=>document.querySelector('[data-loaded="1"]'));await page.waitForTimeout(400);
    await step(W('/app/cobertura '+(want?'Enamed':'notice not error')),async()=>{const gate=await page.getByText('Disponível para estudantes de Medicina').count();const link=await page.getByRole('link',{name:'Alterar o meu estudo'}).getAttribute('href').catch(()=>null);return want?gate===0:(gate>0&&/conta\/perfil\?campo=estudo/.test(link))||{gate,link};});
    if(['nursing','medicine+graduacao','migration'].includes(name))await scan(page,name+' coverage',width);
    ok(W('no JS exceptions'),errors.length===0,{errors});await ctx.close();
  }
}
await browser.close();done('report-menu.json');
