import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/api',()=>({api:vi.fn()}));
import {api} from '@/lib/api';
import {getImportParserWarnings} from './api';
import {warningFixture} from './parser-warnings.test-fixtures';
import {testId} from './recovery.test-fixtures';
beforeEach(()=>vi.resetAllMocks());
it('validates the exact private snapshot and forwards the abort signal on a readonly GET',async()=>{vi.mocked(api).mockResolvedValue({ok:true,data:warningFixture()});const signal=new AbortController().signal;await expect(getImportParserWarnings(testId,signal)).resolves.toMatchObject({attempt:1,ocrVersion:null});expect(api).toHaveBeenCalledExactlyOnceWith(`/v1/admin/questions/imports/${testId}/parser-warnings`,{signal});});
it('rejects mismatched imports, absent diagnostics fabricated as zero, unsafe extra fields and uncoded text',async()=>{for(const patch of [{importId:'550e8400-e29b-41d4-a716-446655440001'},{availability:'not_available',reason:'not_recorded'},{objectKey:'private/leak'},{items:[{source:'exam',code:'clinical free text',count:1}]}]){vi.mocked(api).mockResolvedValue({ok:true,data:{...warningFixture(),...patch}});await expect(getImportParserWarnings(testId)).rejects.toMatchObject({code:patch.importId?'validation':'invalid_response'});}});
