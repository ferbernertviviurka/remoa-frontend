import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { missingRequiredProfile, type AccountSnapshot, type OnboardingState } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { OnboardingView } from '@/features/onboarding/onboarding-view';
import { serverApi } from '@/lib/api/server';
import { safeNext } from '@/lib/safe-next';

const t = withStrings({ onboarding: more.onboarding });

export const metadata: Metadata = { title: t('onboarding.title') };

// Tela cheia, fora do layout (app): é para onde ele redireciona, então aqui não há laço (F12 FR-4).
// G20: com o onboarding já feito mas nome/telefone/tipo faltando, mostra só o passo "Conte quem você é" e volta para `next`.
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  const [r, me] = await Promise.all([serverApi<OnboardingState>('/v1/onboarding'), serverApi<AccountSnapshot>('/v1/account/me')]);
  const missing = me.ok ? missingRequiredProfile(me.data.profile) : [];
  const done = r.ok && !!r.data.doneAt;
  if (done && missing.length === 0) redirect(next);
  const p = me.ok ? me.data.profile : null;
  return (
    <OnboardingView
      initial={{ answers: r.ok ? r.data.answers : {} }}
      missing={missing}
      profileOnly={done}
      next={next}
      profile={p ? { name: p.name, phone: p.phone, school: p.school, schoolId: p.schoolId } : undefined}
    />
  );
}
