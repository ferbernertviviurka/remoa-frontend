import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/api/server',()=>({serverApi:vi.fn()}));
import {serverApi} from '@/lib/api/server';
import {getQuestionFeatureFlags} from './server-flags';
afterEach(()=>vi.clearAllMocks());
it('old backend without the endpoint disables F33 and preserves legacy route handling',async()=>{vi.mocked(serverApi).mockResolvedValue({ok:false,error:{code:'not_found',message:'not found'}});expect(await getQuestionFeatureFlags()).toEqual({import:false,catalog:false,sessions:false});});
it('authentication failures never release catalog or silently become successful reads',async()=>{for(const code of ['forbidden','unauthorized'] as const){vi.mocked(serverApi).mockResolvedValue({ok:false,error:{code,message:code}});await expect(getQuestionFeatureFlags()).rejects.toThrow(code);}});
it('validates rollout response strictly',async()=>{vi.mocked(serverApi).mockResolvedValue({ok:true,data:{import:true,catalog:true,sessions:false,correctKey:'LEAK'}});await expect(getQuestionFeatureFlags()).rejects.toThrow();});
