import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { Logo, SiteFooter } from '@remoa/ui';
import { landingFlags } from '@/features/landing/flags';
import { LandingHeader } from '@/features/landing/shell';
import type { AccountSnapshot } from '@remoa/contracts';
import { getUser } from '@/server/auth/session';
import { serverApi } from '@/lib/api/server';

const skip = 'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:flex focus:min-h-11 focus:items-center focus:rounded-[14px] focus:bg-primary focus:px-4 focus:font-bold focus:text-on-primary';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const { launchPhase } = landingFlags();
  const user = await getUser();
  // Avatar is a nicety: a failing /me just hides it.
  const me = user ? await serverApi<AccountSnapshot>('/v1/account/me').then((r) => (r.ok ? r.data : null)).catch(() => null) : null;
  const account = me && { name: me.profile.name, email: me.email, color: me.profile.avatarColor, src: me.avatarUrls?.small };
  return (
    <>
      <a href="#conteudo" className={skip}>{t('landing.nav.skipLink')}</a>
      <LandingHeader phase={launchPhase} signedIn={!!user} account={account} />
      <main id="conteudo" className="relative overflow-x-clip pt-[76px]">{children}</main>
      <SiteFooter
        brand={<Logo size={30} withWordmark />}
        tagline={t('landing.footer.tagline')}
        navLabel={t('landing.footer.navLabel')}
        links={[
          { items: [
            { href: '/#como-funciona', label: t('landing.footer.links.howWorks') },
            { href: '/#recursos', label: t('landing.footer.links.features') },
            { href: '/#planos', label: t('landing.footer.links.plans') },
            { href: '/#faq', label: t('landing.footer.links.faq') },
          ] },
          { items: [
            { href: '/termos', label: t('landing.footer.links.terms') },
            { href: '/privacidade', label: t('landing.footer.links.privacy') },
            { href: 'mailto:contato@remoa.app', label: t('landing.footer.links.contact') },
          ] },
        ]}
        disclaimer={t('landing.footer.disclaimer')}
        copyright={t('landing.footer.copyright', { year: new Date().getFullYear() })}
      />
    </>
  );
}
