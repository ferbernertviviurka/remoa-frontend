import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/api',()=>({api:vi.fn()}));
import {api} from '@/lib/api';
import {getUserState,listQuestionTaxonomy,listQuestions,startSavedDiscursive} from './api';

beforeEach(()=>vi.resetAllMocks());
describe('lazy API schema boundary',()=>{
 it('rejects a malformed catalogue before exposing it to the screen',async()=>{
  vi.mocked(api).mockResolvedValue({ok:true,data:{items:[{stem:'Unchecked'}]}});
  await expect(listQuestions({scope:'catalog'})).rejects.toMatchObject({code:'invalid_response'});
 });
 it('retains personal-state defaults and strict response validation',async()=>{
  vi.mocked(api).mockResolvedValue({ok:true,data:{favorite:true,doubtful:false,annotation:'Saved'}});
  await expect(getUserState('item')).resolves.toEqual({favorite:true,doubtful:false,annotation:'Saved'});
  vi.mocked(api).mockResolvedValue({ok:true,data:{favorite:'yes'}});
  await expect(getUserState('item')).rejects.toMatchObject({code:'invalid_response'});
 });
 it('validates taxonomy options after loading their schema',async()=>{
  vi.mocked(api).mockResolvedValue({ok:true,data:[{id:'not-a-uuid',name:'Unchecked'}]});
  await expect(listQuestionTaxonomy('area')).rejects.toMatchObject({code:'invalid_response'});
 });
 it('keeps a selected-start denial and never substitutes a general challenge',async()=>{
  vi.mocked(api).mockResolvedValue({ok:false,error:{code:'not_found',message:'question_unavailable'}});
  await expect(startSavedDiscursive('private/item')).rejects.toMatchObject({code:'not_found',detail:'question_unavailable'});
  expect(api).toHaveBeenCalledOnce();
  expect(api).toHaveBeenCalledWith('/v1/challenge-ai/bank/private%2Fitem/start',{method:'POST',body:'{}'});
 });
});
