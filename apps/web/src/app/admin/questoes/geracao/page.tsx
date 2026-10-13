import { GenerationOpsScreen } from '@/features/admin/questions/generation-ops-screen';
import { requireAdmin } from '@/features/admin/shared/api';
export default async function Page(){await requireAdmin();return <div className="min-w-0 p-4 md:p-8"><GenerationOpsScreen/></div>;}
