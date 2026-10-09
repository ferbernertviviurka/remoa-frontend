import { ImportDetailScreen } from '@/features/admin/questions/import-detail-screen';
import { requireAdmin } from '@/features/admin/shared/api';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdmin();const{id}=await params;return <div className="min-w-0 p-4 md:p-8"><ImportDetailScreen id={id}/></div>;}
