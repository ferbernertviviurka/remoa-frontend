import { getQuestionFeatureFlags } from '@/features/questions/server-flags';
import {LegacyQuestionBank} from '@/features/questions/legacy-bank';
import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { QuestionsHub } from '@/features/questions/questions-hub';

export function generateMetadata(): Metadata {
  return { title: t('challengeAi.bankTitle') };
}

// The (app) layout already requires a session (AppShell); API calls carry the user's token.
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const flags=await getQuestionFeatureFlags();return flags.catalog?<QuestionsHub initialState={state} sessionsEnabled={flags.sessions}/>:<LegacyQuestionBank/>;
}
