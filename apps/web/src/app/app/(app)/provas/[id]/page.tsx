import {notFound} from 'next/navigation';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import { ExamDetailScreen } from '@/features/questions/exams-screen';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {const flags=await getQuestionFeatureFlags();if(!flags.catalog)notFound(); const { id } = await params; return <ExamDetailScreen examId={id} sessionsEnabled={flags.sessions}/>; }
