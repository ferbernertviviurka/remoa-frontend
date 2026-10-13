import {meta,sql,call,check,assert,rec,results,ctxFor,pageFor,axeOverflow,browser,WEB,stems} from './g27-lib.mjs';
import fs from 'node:fs';
for(const [vp,role] of [['desktop','g'],['mobile','h']]){const V=vp[0].toUpperCase();
 await check('EX-01'+V,`execute builder session (study) answering all, conclude, result with gabarito from server (${vp})`,async()=>{
  const [{id,n}]=await sql(`select s.id,(select count(*)::int from question_session_items i where i.session_id=s.id) n from question_sessions s where s.user_id=$1 and s.status='active'`,[meta.actors[role].id]);assert(n>=1,'no session');
  const ctx=await ctxFor(role,vp);const p=await pageFor(ctx);p.setDefaultTimeout(10000);await p.goto(WEB+'/app/simulados/'+id);await p.getByText(/Questão 1 de/).waitFor();
  let leak=false;for(let i=0;i<n;i++){await p.getByText('Alternativa sintética C').first().click();await p.getByRole('button',{name:'Confirmar resposta'}).click();await p.waitForTimeout(900);const t=await stems(p);if(i===0)rec('EX-01f'+V,'study feedback after confirm',true,t.replace(/\n/g,' | ').slice(t.indexOf('Gabarito')>=0?t.indexOf('Gabarito')-40:0,(t.indexOf('Gabarito')>=0?t.indexOf('Gabarito'):0)+160));
   if(i<n-1)await p.getByRole('button',{name:'Próxima questão'}).click();await p.waitForTimeout(400);}
  const r1=await axeOverflow(p,`exec-${vp}-last-question`);assert(!r1.axe.length&&!r1.overflow,JSON.stringify(r1));
  await p.getByRole('button',{name:'Concluir sessão'}).click();await p.waitForTimeout(1200);const dl=p.getByRole('dialog');if(await dl.count())await dl.getByRole('button',{name:/Concluir|Finalizar|Confirmar/}).first().click();await p.waitForTimeout(2500);
  const t=await stems(p);assert(/acerto|Acerto|Resultado|resultado/.test(t),'no result view: '+t.slice(0,200));
  const [{st,att}]=await sql(`select s.status st,(select count(*)::int from question_session_items i where i.session_id=s.id) att from question_sessions s where s.id=$1`,[id]);assert(st==='finished','status '+st);
  rec('EX-01r'+V,'result text',true,t.replace(/\n/g,' | ').slice(0,300));const r=await axeOverflow(p,`exec-${vp}-result`);assert(!r.axe.length&&!r.overflow,JSON.stringify(r));assert(ctx.errors.length===0,ctx.errors.join('|'));await ctx.close();});
}
fs.writeFileSync(new URL('./artifacts/g27-real/exec-results.json',import.meta.url),JSON.stringify(results,null,1));await browser.close();process.exit(0);
