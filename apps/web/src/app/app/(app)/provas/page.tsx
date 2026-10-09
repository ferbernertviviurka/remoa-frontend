import {notFound} from 'next/navigation';
import {getQuestionFeatureFlags} from '@/features/questions/server-flags';
import { t } from '@remoa/strings';
import { ExamsScreen } from '@/features/questions/exams-screen';
export const generateMetadata = () => ({ title: t('questions.examsTitle') });
export default async function Page() {const flags=await getQuestionFeatureFlags();if(!flags.catalog)notFound(); return <ExamsScreen sessionsEnabled={flags.sessions}/>; }
