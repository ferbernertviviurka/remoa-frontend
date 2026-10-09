// QA only: gzip the union of initial JS and mandatory lazy validators; never execute emitted bundles.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const next=path.join(web,'.next');
const pages=JSON.parse(fs.readFileSync(path.join(next,'app-build-manifest.json'),'utf8')).pages;
const lazy=JSON.parse(fs.readFileSync(path.join(next,'react-loadable-manifest.json'),'utf8'));
const filesFor=(prefix,leaf)=>Object.entries(lazy).filter(([key])=>key.startsWith(prefix)&&key.endsWith(leaf)).flatMap(([,value])=>value.files).filter(file=>file.endsWith('.js'));
const schemas=(prefix)=>filesFor(prefix,'./schema-loaders').concat(filesFor(prefix,'@remoa/contracts'));
const flags=filesFor('features/questions/flags.ts','./flag-schema');
const sum=files=>Math.round([...new Set(files)].reduce((n,file)=>n+zlib.gzipSync(fs.readFileSync(path.join(next,file))).length,0)/1024*10)/10;
const rows=[];
for(const [route,initial] of Object.entries(pages)){
 if(!route.includes('/questoes/')&&!route.includes('/banco-de-questoes/')&&!route.includes('/provas/')&&!route.includes('/simulados/'))continue;
 const student=route.includes('/banco-de-questoes/')||route.includes('/provas/')||route.includes('/simulados/');
 const mandatory=[...flags,...schemas(student?'features/questions/api.ts':'features/admin/questions/api.ts')];
 if(student&&!route.includes('/simulados/[id]/'))mandatory.push(...filesFor('features/questions/api.ts','zod'));
 const initialJs=initial.filter(file=>file.endsWith('.js'));
 const extra=[...new Set(mandatory)].filter(file=>!initialJs.includes(file));
 const base={route,initialGzipKiB:sum(initialJs),mandatoryAsyncGzipKiB:sum(extra),flowUnionGzipKiB:sum([...initialJs,...extra]),initialFiles:initialJs,mandatoryAsyncFiles:extra};
 rows.push(base);
 if(student){
  const dialogs=route.includes('/banco-de-questoes/')||route.includes('/simulados/[id]/')?['config','personal','report']:['config'];
  for(const dialog of dialogs){
   const optional=filesFor('features/questions/lazy-dialogs.tsx',`./${dialog}-dialog`);
   if(optional.length)rows.push({...base,route:route+'#'+dialog+'-dialog',flowUnionGzipKiB:sum([...initialJs,...extra,...optional]),dialogAdditionalGzipKiB:sum(optional.filter(file=>![...initialJs,...extra].includes(file)))});
  }
 }
 if(route.includes('/editorial/questoes/[id]/')){
  const draft=filesFor('features/admin/questions/deferred-draft-editor.tsx','./draft-editor');
  if(draft.length)rows.push({...base,route:route+'#authorized-admin-draft-editor',flowUnionGzipKiB:sum([...initialJs,...extra,...draft]),draftAdditionalGzipKiB:sum(draft.filter(file=>![...initialJs,...extra].includes(file)))});
 }
 if(route.includes('/banco-de-questoes/')){
  const selected=Object.entries(lazy).filter(([key])=>key.startsWith('features/questions/shared.tsx')).flatMap(([,value])=>value.files).filter(file=>file.endsWith('.js'));
  rows.push({...base,route:route+'#selected-discursive',flowUnionGzipKiB:sum([...initialJs,...extra,...selected]),selectedAdditionalGzipKiB:sum(selected.filter(file=>![...initialJs,...extra].includes(file)))});
 }
}
const output={measuredAt:new Date().toISOString(),metric:'gzip KiB (1024 bytes), unique emitted JS files; includes lazy schema loads triggered by initial authenticated reads',limitations:'Static union; excludes CSS, API JSON, HTTP headers, later optional dialogs and external authentication; not a browser network measurement',rows};
const destination=path.join(web,'e2e/questions/artifacts/bundle-flow-report.json');fs.writeFileSync(destination,JSON.stringify(output,null,2)+'\n');process.stdout.write(JSON.stringify(rows.map(({route,initialGzipKiB,mandatoryAsyncGzipKiB,flowUnionGzipKiB,selectedAdditionalGzipKiB,dialogAdditionalGzipKiB,draftAdditionalGzipKiB})=>({route,initialGzipKiB,mandatoryAsyncGzipKiB,flowUnionGzipKiB,selectedAdditionalGzipKiB,dialogAdditionalGzipKiB,draftAdditionalGzipKiB})),null,2)+'\n');
