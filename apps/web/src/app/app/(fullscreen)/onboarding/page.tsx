import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { OnboardingState } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { OnboardingView } from '@/features/onboarding/onboarding-view';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('onboarding.title') };

// Tela cheia, fora do layout (app): é para onde ele redireciona, então aqui não há laço (F12 FR-4).
export default async function Page() {
  const r = await serverApi<OnboardingState>('/v1/onboarding');
  if (r.ok && r.data.doneAt) redirect('/app/hoje');
  return <OnboardingView initial={{ answers: r.ok ? r.data.answers : {} }} />;
}
