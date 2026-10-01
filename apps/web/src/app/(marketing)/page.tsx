import Link from 'next/link';
import { t } from '@remoa/strings';
import { Logo } from '@remoa/ui';

const cta = 'inline-flex min-h-[46px] items-center justify-center rounded-btn px-4 font-display text-sm font-bold';

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 p-6">
      <div className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <Logo size={40} />
        {t('common.appName')}
      </div>
      <h1 className="font-display text-4xl font-extrabold text-text">{t('landing.tagline')}</h1>
      <p className="text-base text-muted">{t('landing.subtitle')}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cadastro" className={`${cta} bg-primary text-on-primary`}>{t('landing.cta')}</Link>
        <Link href="/entrar" className={`${cta} border border-border bg-surface text-text`}>{t('landing.signIn')}</Link>
      </div>
    </main>
  );
}
