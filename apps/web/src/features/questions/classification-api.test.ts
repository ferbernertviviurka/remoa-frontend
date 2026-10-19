import {beforeEach,expect,it,vi} from 'vitest';
import {listClassification} from './classification-api';
vi.mock('@/lib/api',()=>({api:vi.fn()}));
import {api} from '@/lib/api';
const data={course:'nursing',total:312,unclassifiedArea:312,unclassifiedTopic:312,areas:[]};
beforeEach(()=>vi.mocked(api).mockReset());
it('loads the strict authenticated course taxonomy and rejects a different course or answer data',async()=>{
 vi.mocked(api).mockResolvedValue({ok:true,data});await expect(listClassification('nursing')).resolves.toEqual(data);expect(vi.mocked(api).mock.calls[0]?.[0]).toBe('/v1/questions/classification?course=nursing');
 for(const value of [{...data,course:'medicine'},{...data,correctKey:'A'},{...data,total:1}]){vi.mocked(api).mockResolvedValue({ok:true,data:value});await expect(listClassification('nursing')).rejects.toMatchObject({code:'invalid_response'});}
});
it('keeps deployment-window 404 and real service 500 failures as errors instead of empty taxonomy',async()=>{
 for(const code of ['not_found','internal','forbidden'] as const){vi.mocked(api).mockResolvedValue({ok:false,error:{code,message:'failed'}});await expect(listClassification('nursing')).rejects.toMatchObject({code});}
 expect(api).toHaveBeenCalledTimes(3);
});
