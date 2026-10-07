import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { BankScreen } from '@/features/challenge-ai/bank-screen';

export function generateMetadata(): Metadata {
  return { title: t('challengeAi.bankTitle') };
}

// The (app) layout already requires a session (AppShell); API calls carry the user's token.
export default function Page() {
  return <BankScreen />;
}
