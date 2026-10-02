import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { t } from '@remoa/strings';
import { PlansError } from '@/features/plans/plans-error';
import { PlansProvider } from '@/features/plans/plans-context';
import { PlansView } from '@/features/plans/plans-view';
import { loadPlans } from '@/features/plans/load-plans';
import { getUser } from '@/server/auth/session';

export function generateMetadata(): Metadata {
  return { title: t('plans.pages.index') };
}

type Search = { periodo?: string; de?: string; cancelado?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  if (!(await getUser())) {
    const back = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === 'string')).toString();
    redirect(`/entrar?next=${encodeURIComponent(`/planos${back ? `?${back}` : ''}`)}`);
  }
  const initial = await loadPlans(q.periodo);
  if (!initial) return <PlansError />;
  return (
    <PlansProvider initial={initial}>
      <PlansView from={q.de} canceled={q.cancelado === '1'} />
    </PlansProvider>
  );
}
