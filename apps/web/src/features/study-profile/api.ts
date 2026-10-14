import type {HealthCourse,Institution,ProfileCapabilities,StudyGoal,StudyProfile,StudyProfileInput,ReferenceSuggestionInput} from '@remoa/contracts';
import {api} from '@/lib/api';

/** F35 (CCR-160, D-1850). One shape for every caller: the server already applies profileCapabilities. */
export type StudyProfileState={profile:StudyProfile|null;capabilities:ProfileCapabilities};
const json=(method:string,body:unknown):RequestInit=>({method,body:JSON.stringify(body),headers:{'content-type':'application/json'}});

export const getStudyProfile=()=>api<StudyProfileState>('/v1/account/study-profile');
export const saveStudyProfile=(input:StudyProfileInput)=>api<StudyProfileState>('/v1/account/study-profile',json('PUT',input));
export const confirmStudyProfile=(input:StudyProfileInput)=>api<StudyProfileState>('/v1/account/study-profile/confirm',json('POST',input));
export const suggestReference=(input:ReferenceSuggestionInput)=>api<null>('/v1/account/study-profile/suggestions',json('POST',input));

/** Public (Landing and signup work signed out). Courses are a short list: callers cache it. */
export const listCourses=()=>api<HealthCourse[]>('/v1/public/reference/courses');
export const listGoals=(course?:string)=>api<StudyGoal[]>(`/v1/public/reference/goals${course?`?course=${encodeURIComponent(course)}`:''}`);
export const searchInstitutions=(q:string,uf?:string,signal?:AbortSignal)=>
  api<Institution[]>(`/v1/public/reference/institutions?${new URLSearchParams({q,...(uf?{uf}:{})})}`,{signal});
