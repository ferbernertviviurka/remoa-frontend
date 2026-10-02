import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { Logo, SiteFooter } from '@remoa/ui';
import { landingFlags } from '@/features/landing/flags';
import { LandingHeader } from '@/features/landing/shell';

const skip = 'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:flex focus:min-h-11 focus:items-center focus:rounded-[14px] focus:bg-primary focus:px-4 focus:font-bold focus:text-on-primary';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { launchPhase } = landingFlags();
  return (
    <>
      <a href="#conteudo" className={skip}>{t('landing.nav.skipLink')}</a>
      <LandingHeader phase={launchPhase} />
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
