import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
import {questionDestinationEnabled,readQuestionFeatureFlags,useQuestionFeatureFlags} from './flags';
vi.mock('@/lib/api',()=>({api:vi.fn()}));
import {api} from '@/lib/api';
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('keeps exposure disabled during loading and when the authenticated read fails',async()=>{vi.mocked(api).mockRejectedValue(new Error('offline'));const{result}=renderHook(()=>useQuestionFeatureFlags());expect(result.current).toEqual({import:false,catalog:false,sessions:false});await waitFor(()=>expect(api).toHaveBeenCalled());expect(result.current.catalog).toBe(false);expect(questionDestinationEnabled('/app/provas',result.current)).toBe(false);expect(questionDestinationEnabled('/app/banco-de-questoes',result.current)).toBe(true);expect(questionDestinationEnabled('/app/mapas',result.current)).toBe(true);});
it('reads independent flags rather than assuming development enables all actions',async()=>{vi.mocked(api).mockResolvedValue({ok:true,data:{import:false,catalog:true,sessions:false}});const{result}=renderHook(()=>useQuestionFeatureFlags());await waitFor(()=>expect(result.current.catalog).toBe(true));expect(result.current.sessions).toBe(false);expect(result.current.import).toBe(false);expect(questionDestinationEnabled('/app/banco-de-questoes',result.current)).toBe(true);});
it('rejects malformed flags without releasing a destination',async()=>{vi.mocked(api).mockResolvedValue({ok:true,data:{import:false,catalog:'true',sessions:true}});const{result}=renderHook(()=>useQuestionFeatureFlags());await waitFor(()=>expect(api).toHaveBeenCalled());expect(result.current).toEqual({import:false,catalog:false,sessions:false});expect(questionDestinationEnabled('/app/banco-de-questoes',result.current)).toBe(true);expect(questionDestinationEnabled('/app/provas',result.current)).toBe(false);});
it('stays disabled if its lazy schema cannot load and makes no unvalidated request',async()=>{const result=await readQuestionFeatureFlags(()=>Promise.reject(new Error('chunk unavailable')));expect(result).toEqual({import:false,catalog:false,sessions:false});expect(api).not.toHaveBeenCalled();expect(questionDestinationEnabled('/app/provas',result)).toBe(false);expect(questionDestinationEnabled('/app/banco-de-questoes',result)).toBe(true);});

it('does not release an older enabled result after a newer denied focus refresh',async()=>{
 let firstResolve!:(value:Awaited<ReturnType<typeof api>>)=>void;let latestResolve!:(value:Awaited<ReturnType<typeof api>>)=>void;
 vi.mocked(api).mockImplementationOnce(()=>new Promise(resolve=>{firstResolve=resolve;})).mockImplementationOnce(()=>new Promise(resolve=>{latestResolve=resolve;}));
 const{result}=renderHook(()=>useQuestionFeatureFlags());await waitFor(()=>expect(api).toHaveBeenCalledTimes(1));
 act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(api).toHaveBeenCalledTimes(2));
 await act(async()=>{latestResolve({ok:false,error:{code:'forbidden',message:'disabled'}});});
 await act(async()=>{firstResolve({ok:true,data:{import:true,catalog:true,sessions:true}});});
 expect(result.current).toEqual({import:false,catalog:false,sessions:false});
});
