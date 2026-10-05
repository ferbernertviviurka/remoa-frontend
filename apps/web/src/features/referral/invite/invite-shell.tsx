import type { ReactNode } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Logo } from '@remoa/ui';

/** Header (logo + "Já tenho conta · Entrar") and footer (regulamento, FR-25) shared by `/i/[code]` and `/regulamento-indicacao`. */
export function InviteShell({ children, next }: { children: ReactNode; next?: string }) {
  const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-text">
      <header className="border-b border-divider">
        <div className="mx-auto flex h-[76px] w-full max-w-[1280px] items-center justify-between px-4 sm:px-10">
          <Link href="/" className={`flex items-center rounded-lg ${focus}`}><Logo size={24} withWordmark /></Link>
          <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar'} className={`flex min-h-11 items-center px-1.5 font-bold text-ink no-underline ${focus}`}>{t('referral.invite.headerSignIn')}</Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-divider">
        <div className="mx-auto flex w-full max-w-[1280px] items-center px-4 py-3 sm:px-10">
          <Link href="/regulamento-indicacao" className={`inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep underline ${focus}`}>{t('referral.regulation.footer')}</Link>
        </div>
      </footer>
    </div>
  );
}
