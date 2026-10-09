import { QuestionEditorialDetail } from '@/features/editorial/questions/detail-screen';
import { requireRole } from '@/server/auth/session';
import { createClient } from '@/lib/supabase/server';
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await requireRole(['reviewer','admin']);const client=await createClient();const{data}=await client.from('profiles').select('role').eq('user_id',user.id).single();const{id}=await params;return <QuestionEditorialDetail id={id} canReview={data?.role==='reviewer'} canAdmin={data?.role==='admin'}/>;}
