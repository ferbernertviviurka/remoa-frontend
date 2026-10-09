/** Human page selectors are one-based; duplicates and malformed tokens are errors, never silently skipped. */
export function parseExcludedPages(value:string):number[]|null{
  if(!value.trim())return [];
  const entries=value.split(',').map(v=>v.trim());
  if(entries.some(v=>!/^\d+$/.test(v)))return null;
  const pages=entries.map(Number);
  return pages.every(v=>v>=1&&v<=500)&&new Set(pages).size===pages.length?pages:null;
}
export function pdfFileError(file:File|null):'missing'|'type'|'size'|null{
  if(!file)return 'missing';
  if(!file.name.toLowerCase().endsWith('.pdf')||(file.type&&file.type!=='application/pdf'))return 'type';
  if(file.size>100*1024*1024)return 'size';
  return null;
}

/** Blank means all original answer-key PDF pages. A valid selection is canonical and sorted. */
export function parseAnswerKeyPages(value:string):number[]|null|undefined{
  if(!value.trim())return null;
  const pages=parseExcludedPages(value);
  return pages===null?undefined:pages.sort((a,b)=>a-b);
}
