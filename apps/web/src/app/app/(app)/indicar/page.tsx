import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { t } from '@remoa/strings/full';
import { ReferralView } from '@/features/referral/referral-view';
import { getUser } from '@/server/auth/session';

export function generateMetadata(): Metadata {
  return { title: t('referral.pageTitle') };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const q = await searchParams;
  if (!(await getUser())) redirect(`/entrar?next=${encodeURIComponent(`/app/indicar${q.de ? `?de=${encodeURIComponent(q.de)}` : ''}`)}`);
  return <ReferralView from={q.de} />;
}
