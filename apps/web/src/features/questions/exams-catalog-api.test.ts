import {beforeEach,expect,it,vi} from 'vitest';
import {api} from '@/lib/api';
import {listExamCatalog} from './api';
vi.mock('@/lib/api',()=>({api:vi.fn()}));
const id='00000000-0000-4000-8000-000000000001';
const paper={id,name:'Seleção documental',institution:'Instituição',year:2025,edition:'Única',booklet:'A',sourceId:id,version:1,durationSec:null,questionCount:10,status:'published'};
beforeEach(()=>vi.mocked(api).mockReset());
it('normalizes a legacy array only after the new route explicitly returns not_found',async()=>{
 vi.mocked(api).mockResolvedValueOnce({ok:false,error:{code:'not_found',message:'not_found'}}).mockResolvedValueOnce({ok:true,data:[paper]});
 const result=await listExamCatalog({limit:25});
 expect(result).toEqual({items:[paper],total:1,nextCursor:null});
 expect(result.items[0]!.coverage).toBeUndefined();
 expect(vi.mocked(api).mock.calls.map(call=>call[0])).toEqual(['/v1/exams/catalog?limit=25','/v1/exams']);
});
it.each(['internal','unauthorized','forbidden'] as const)('keeps genuine %s errors instead of falling back or fabricating an empty list',async code=>{
 vi.mocked(api).mockResolvedValue({ok:false,error:{code,message:code}});
 await expect(listExamCatalog({limit:25})).rejects.toMatchObject({code});expect(api).toHaveBeenCalledTimes(1);
});
it('does not mask an invalid paged contract as a legacy empty collection',async()=>{
 vi.mocked(api).mockResolvedValue({ok:true,data:{items:[],total:841,nextCursor:3}});
 await expect(listExamCatalog({limit:25})).rejects.toMatchObject({code:'invalid_response'});expect(api).toHaveBeenCalledTimes(1);
});
it('preserves real paging and source coverage without leaking a key',async()=>{
 const value={items:[{...paper,coverage:{kind:'source_excerpt',expectedQuestionCount:null,availableQuestionCount:10,scorableQuestionCount:8}}],total:841,nextCursor:'cursor'};
 vi.mocked(api).mockResolvedValue({ok:true,data:value});
 expect(await listExamCatalog({limit:25,course:'physical_education',search:'Saúde'})).toEqual(value);
 expect(api).toHaveBeenCalledWith('/v1/exams/catalog?limit=25&course=physical_education&search=Sa%C3%BAde',{signal:undefined});
});
