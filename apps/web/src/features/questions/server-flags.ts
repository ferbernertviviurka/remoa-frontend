import {cache} from 'react';
import {questionFeatureFlagsSchema} from '@remoa/contracts';
import {serverApi} from '@/lib/api/server';
/** Request-local deduplication; no production/environment assumptions in the browser. */
export const getQuestionFeatureFlags=cache(async()=>{const result=await serverApi<unknown>('/v1/question-features');if(!result.ok){if(result.error.code==='not_found')return {import:false,catalog:false,sessions:false};throw new Error(result.error.code);}return questionFeatureFlagsSchema.parse(result.data);});
