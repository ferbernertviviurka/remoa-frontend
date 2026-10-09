import {notFound} from 'next/navigation';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import { UploadScreen } from '@/features/admin/questions/upload-screen';
import { requireAdmin } from '@/features/admin/shared/api';
export default async function Page(){await requireAdmin();if(!(await getQuestionFeatureFlags()).import)notFound();return <div className="min-w-0 p-4 md:p-8"><UploadScreen/></div>;}
