import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { Logo, SiteFooter } from '@remoa/ui';
import { LEGAL_CONFIG } from '@/features/legal/config';
import { landingFlags } from '@/features/landing/flags';
import { LandingHeader } from '@/features/landing/shell/landing-header'; // direct: the shell barrel would ship WaitlistCta too (D-535)

const skip = 'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:flex focus:min-h-11 focus:items-center focus:rounded-[14px] focus:bg-primary focus:px-4 focus:font-bold focus:text-on-primary';

// D-534: no session read here (it made `/` dynamic); the header swaps to "Abrir o app" + avatar on the client (D-320).
export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { launchPhase } = landingFlags();
  const dpoEmail = LEGAL_CONFIG.vars.dpoEmail;
  return (
    <>
      <a href="#conteudo" className={skip}>{t('landing.nav.skipLink')}</a>
      <LandingHeader phase={launchPhase} blogLabel={t('blog.navigation.blog')} />
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
            { href: '/termos-de-uso', label: t('blog.footer.termsLink') },
            { href: '/politica-de-privacidade', label: t('blog.footer.privacyLink') },
            { href: '/blog', label: t('blog.navigation.blog') },
            ...(dpoEmail ? [{ href: `mailto:${dpoEmail}`, label: t('blog.footer.contact') }] : []),
          ] },
        ]}
        disclaimer={t('landing.footer.disclaimer')}
        copyright={t('landing.footer.copyright', { year: new Date().getFullYear() })}
      />
    </>
  );
}
