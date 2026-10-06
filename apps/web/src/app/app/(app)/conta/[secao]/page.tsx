import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { accountSections, type AccountSection } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { SectionView } from '@/features/account/shell/section-view';

const t = withStrings({ account: more.account });

const valid = (s: string): s is AccountSection => (accountSections as readonly string[]).includes(s);

export async function generateMetadata({ params }: { params: Promise<{ secao: string }> }): Promise<Metadata> {
  const { secao } = await params;
  return { title: valid(secao) ? t(`account.pages.${secao}`) : t('pages.account') };
}

export default async function Page({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!valid(secao)) notFound();
  return <SectionView section={secao} />;
}
