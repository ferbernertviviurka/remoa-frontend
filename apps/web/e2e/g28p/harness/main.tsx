import React, { Suspense, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/app/globals.css';
import './style.css';
import { ToastProvider } from '@remoa/ui';
import type { AccountSnapshot } from '@remoa/contracts';
import { accountFreeFixture } from '@remoa/contracts/mocks';
import { SignUpWizard } from '@/features/auth/sign-up-wizard';
import { isSignupPlan } from '@/features/auth/signup-params';
import { AccountProvider } from '@/features/account/shell/account-context';
import { StudySection } from '@/features/account/profile/study-section';
import { ConfirmBanner } from '@/features/study-profile/confirm-banner';
import { CoverageGate } from '@/features/coverage/coverage-gate';
import { CoverageSlot } from '@/features/home/coverage-slot';
import { useStudyProfile } from '@/features/study-profile/use-study-profile';
import { NavPendingProvider } from '@/features/shell/nav-pending';
import { Rail } from '@/features/shell/rail';
import { MobileMenu } from '@/features/shell/mobile-menu';
import { LandingPage } from '@/features/landing/landing-page';

const q = new URLSearchParams(location.search);
const page = q.get('page') ?? 'signup';
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

function Conta() {
  // /v1/account/me needs Supabase admin (not available in isolation): fixture snapshot WITHOUT studyProfile -> StudySection reads the real /v1/account/study-profile.
  const acc = { ...accountFreeFixture, studyProfile: undefined, capabilities: undefined } as unknown as AccountSnapshot;
  return <NavPendingProvider><div className="flex"><div id="rail-wrap" className="hidden min-[900px]:block"><Rail /></div><main className="min-w-0 flex-1 p-4"><AccountProvider initial={acc}><ConfirmBanner /><StudySection openEditor={q.get('campo') === 'estudo'} /></AccountProvider></main></div></NavPendingProvider>;
}
function Menu() {
  const { capabilities, loaded } = useStudyProfile();
  return (
    <NavPendingProvider>
      <div data-caps={JSON.stringify(capabilities)} data-loaded={loaded ? '1' : '0'} />
      <ConfirmBanner />
      <div className="flex">
        <div className="hidden min-[900px]:block" id="rail-wrap"><Rail /></div>
        <main className="p-4">
          <div className="min-[900px]:hidden"><MobileMenu /></div>
          <section aria-label="Hoje (coverage slot)"><CoverageSlot><p data-testid="enamed-cov">Cobertura Enamed visível</p></CoverageSlot></section>
          {page === 'coverage' && (capabilities.showEnamed ? <p>Cobertura Enamed (rota)</p> : loaded ? <CoverageGate /> : null)}
        </main>
      </div>
    </NavPendingProvider>
  );
}
function Landing() {
  const [el, setEl] = useState<ReactNode>(null);
  useEffect(() => { void LandingPage({ h1: 'a' as never, variant: null }).then(setEl); }, []);
  return <>{el}</>;
}
const View = () => page === 'signup' ? (
  <SignUpWizard plan={isSignupPlan(q.get('plano') ?? undefined) ? (q.get('plano') as never) : undefined} course={(q.get('curso') as never) ?? undefined} referred={false} />
) : page === 'conta' ? <Conta /> : page === 'landing' ? <Landing /> : <Menu />;
createRoot(document.getElementById('root')!).render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><Suspense fallback={null}><View /></Suspense></ToastProvider>);
