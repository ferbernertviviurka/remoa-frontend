/** Test-only adapter: real HTTP handlers, with an unsigned local actor from the isolated test server. */
import type {Result} from '@remoa/contracts';
const base='http://127.0.0.1:4341';
let metadata:Promise<{actors:Record<string,{id:string;token:string}>}>|null=null;
async function actorToken(){metadata??=fetch(base+'/__test/meta').then(r=>r.json());const data=await metadata;const role=localStorage.getItem('f33-test-role')??'student';return data.actors[role]?.token??'';}
export async function api<T>(path:string,init?:RequestInit):Promise<Result<T>>{const headers=new Headers(init?.headers);headers.set('authorization','Bearer '+await actorToken());if(init?.body&&!(init.body instanceof FormData))headers.set('content-type','application/json');const response=await fetch(base+path,{...init,headers});const body=await response.json();return response.ok?body:{ok:false,error:body.error};}
export const apiBase=()=>base;
export const sessionToken=()=>actorToken();
