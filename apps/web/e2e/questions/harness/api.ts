/** Test-only transport: same HTTP DTO validation in production feature wrappers, without Supabase/shared API. */
import type {Result} from '@remoa/contracts';
export async function api<T>(path:string,init?:RequestInit):Promise<Result<T>>{const headers=new Headers(init?.headers);if(init?.body&&!(init.body instanceof FormData))headers.set('content-type','application/json');const response=await fetch(path,{...init,headers});const body=await response.json();return response.ok?body:{ok:false,error:body.error};}
export const apiBase=()=>location.origin;
export const sessionToken=async()=> 'test-only-stub-token';
