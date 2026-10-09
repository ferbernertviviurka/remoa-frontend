'use client';
import { Input } from '@remoa/ui';
import { tq } from './labels';
/** Local field values stay as entered; shared validators decide whether the marker is valid. */
export type MarkerFieldsValue = { page:string;x:string;y:string;width:string;height:string };
export const emptyMarker:MarkerFieldsValue={page:'',x:'',y:'',width:'',height:''};
export function MarkerFields({value,onChange}:{value:MarkerFieldsValue;onChange:(value:MarkerFieldsValue)=>void}){
 const fields=[['page','markerPage'],['x','markerX'],['y','markerY'],['width','markerWidth'],['height','markerHeight']] as const;
 return <fieldset className="space-y-3"><legend className="font-semibold">{tq('questionsAdmin.markerTitle')}</legend><p className="text-sm text-muted">{tq('questionsAdmin.markerHelp')}</p><div className="grid grid-cols-2 gap-3">{fields.map(([field,label])=><Input key={field} label={tq(`questionsAdmin.${label}`)} type="number" step={field==='page'?1:'any'} min={field==='page'?1:0} max={field==='page'?500:100} value={value[field]} onChange={event=>onChange({...value,[field]:event.target.value})}/>)}</div></fieldset>;
}
