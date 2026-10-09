import {cache} from 'react';
import {questionFeatureFlagsSchema} from '@remoa/contracts';
import {serverApi} from '@/lib/api/server';
/** Request-local deduplication; no production/environment assumptions in the browser. */
const closed={import:false,catalog:false,sessions:false};
/** A failed read must not turn the bank page into a 500. The route stays closed until the API answers. */
export const getQuestionFeatureFlags=cache(async()=>{try{const result=await serverApi<unknown>('/v1/question-features');if(!result.ok)return closed;return questionFeatureFlagsSchema.parse(result.data);}catch{return closed;}});
