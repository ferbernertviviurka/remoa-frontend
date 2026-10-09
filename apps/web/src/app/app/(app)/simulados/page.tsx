import {notFound} from 'next/navigation';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import { t } from '@/features/questions/labels';
import { SessionsScreen } from '@/features/questions/exams-screen';
export const generateMetadata = () => ({ title: t('questions.sessions') });
export default async function Page() {if(!(await getQuestionFeatureFlags()).sessions)notFound(); return <SessionsScreen />; }
