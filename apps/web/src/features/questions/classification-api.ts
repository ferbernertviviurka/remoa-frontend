import {questionClassificationCatalogSchema,type HealthCourseCode} from '@remoa/contracts';
import {request,QuestionsApiError} from './request';

/** Course-specific public scoring eligibility, distinct from the ENAMED generation taxonomy. */
export const listClassification=(course:HealthCourseCode,signal?:AbortSignal)=>request(`/v1/questions/classification?course=${encodeURIComponent(course)}`,questionClassificationCatalogSchema,{signal}).then(data=>{if(data.course!==course)throw new QuestionsApiError('invalid_response');return data;});
