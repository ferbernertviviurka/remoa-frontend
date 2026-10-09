import {notFound} from 'next/navigation';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import { SessionScreen } from '@/features/questions/session-screen';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {if(!(await getQuestionFeatureFlags()).sessions)notFound(); const { id } = await params; return <SessionScreen key={id} sessionId={id} />; }
