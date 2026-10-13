/** G27 QA phase 4 helpers. Real API (4361) + isolated PostgreSQL, synthetic content, local, NOT production. */
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
export const API='http://127.0.0.1:4361',WEB='http://127.0.0.1:4362';
export const dir=fileURLToPath(new URL('./artifacts/g27-real/',import.meta.url));fs.mkdirSync(dir,{recursive:true});
export const meta=await (await fetch(API+'/__test/meta')).json();
export const sql=async(q,p=[])=>(await fetch(API+'/__test/sql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({q,p})})).json();
export const post=(p,b={})=>fetch(API+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());
export const call=async(role,p,method='GET',body,headers={})=>{const r=await fetch(API+'/v1'+p,{method,headers:{authorization:'Bearer '+meta.actors[role].token,...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}return{status:r.status,text,json};};
export const results=[];
export const rec=(id,name,pass,detail='')=>{results.push({id,name,pass,detail});console.log((pass?'PASS ':'FAIL ')+id+' '+name+(detail?' :: '+String(detail).slice(0,300):''));};
export const check=async(id,name,fn)=>{try{const d=await fn();if(d===undefined||d===true)rec(id,name,true);else rec(id,name,false,typeof d==='string'?d:JSON.stringify(d));}catch(e){rec(id,name,false,e.message.split('\n')[0]);}};
export const assert=(c,m)=>{if(!c)throw new Error(m);};
export const FORBIDDEN=/correctKey|correct_key|explanation|verdict|distractorNotes|expectedAnswer|EXPLICACAO_SECRETA|reviewerCrm|12345-SP/;
export const browser=await chromium.launch({channel:'chromium'});
export async function ctxFor(role,vp){
 const context=await browser.newContext(vp==='mobile'?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1440,height:900}});
 await context.addInitScript(r=>localStorage.setItem('f33-test-role',r),role);
 const net=[];context.on('response',res=>{const u=new URL(res.url());if(u.port!=='4361'||!u.pathname.startsWith('/v1'))return;const rq=res.request();net.push({method:rq.method(),path:u.pathname,search:u.search,body:rq.postData(),status:res.status(),text:res.text().catch(()=>''),t:Date.now()});});
 context.net=net;context.errors=[];return context;
}
export async function pageFor(context){const p=await context.newPage();p.on('pageerror',e=>context.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/404|favicon/.test(m.text()))context.errors.push('console:'+m.text());});return p;}
export async function axeOverflow(page,label){
 await page.evaluate(()=>document.fonts.ready);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const v=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>x.id+'x'+x.nodes.length+' '+(x.nodes[0]?.target?.join(' ')??'')));
 const ov=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 await page.screenshot({path:path.join(dir,label+'.png'),fullPage:true});
 return{axe:v,overflow:ov};
}
export const stems=page=>page.locator('main').innerText();
