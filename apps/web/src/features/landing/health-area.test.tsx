import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PublicPriceBook } from '@remoa/contracts';
import { strings } from '@remoa/strings/full';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
import { AreasSection, MoreSection, ProblemSection, ReadyMarquee } from './sections';
import { CompareSection, FaqSection, PlansSection } from './plans';
import { HeroSection } from './hero';
import { WaitlistCta } from './shell/waitlist-cta';
import { buildFaqItems } from './shell/faq';
import { setSelectedCourse } from './shell/selected-course';

const flags = { launchPhase: 'open' as const, betaFounder: false, approvedContent: false, ia: { pdf: 'live' as const, gerar: 'soon' as const, corrigir: 'live' as const, resumo: 'soon' as const } };
const book: PublicPriceBook = { monthly: { amount: 3900 }, annual: { amount: 34900 }, lifetime: { amount: 59990 }, currency: 'brl', founder: false };

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Para quem é (#areas, FR-38)', () => {
  it('lists the courses (not "Não é da área da saúde"), the three cards and the Enamed note', () => {
    const { container } = render(<AreasSection />);
    expect(container.querySelector('section#areas')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: strings.landing.areas.title })).toBeTruthy();
    expect(screen.getByText('Enfermagem')).toBeTruthy();
    expect(screen.getByText(strings.landing.areas.more)).toBeTruthy();
    expect(screen.queryByText(strings.landing.courses.not_health.name)).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(strings.landing.areas.cards.map((c) => c.title));
    expect(screen.getByText(/o Enamed aparece para estudantes de Medicina/)).toBeTruthy();
  });
});

describe('FAQ (FR-40)', () => {
  it('first question is "O Remoa é só para Medicina?" and the JSON-LD list is the same list', () => {
    const items = buildFaqItems(false);
    expect(items[0]!.q).toBe('O Remoa é só para Medicina?');
    expect(items[0]!.a).toContain('a caminho');
    expect(items.find((i) => i.q === 'Serve para o Enamed 2027?')!.a).toMatch(/^Para estudantes de Medicina, sim/);
    render(<FaqSection items={items} />);
    expect(screen.getAllByRole('button')[0]!.textContent).toContain('O Remoa é só para Medicina?');
  });
});

describe('plans keep their prices and carry curso + plano (FR-37)', () => {
  it('prices unchanged and CTAs carry the chosen course and the plan', () => {
    setSelectedCourse('pharmacy');
    render(<PlansSection priceBook={book} flags={{ launchPhase: 'open', betaFounder: false, approvedContent: false }} />);
    expect(screen.getByText(/R\$\s*39/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*599/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(strings.landing.plans.period.annual) }));
    expect(screen.getByText(/R\$\s*349/)).toBeTruthy();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/cadastro?curso=pharmacy&de=landing',
      '/cadastro?curso=pharmacy&de=landing&plano=pro_annual',
      '/cadastro?curso=pharmacy&de=landing&plano=founder',
    ]);
  });

  it('final CTA also carries the course', () => {
    setSelectedCourse('dentistry');
    render(<WaitlistCta phase="open" variant={null} />);
    expect(screen.getByRole('link', { name: strings.landing.ctaSection.primary }).getAttribute('href')).toBe('/cadastro?curso=dentistry&de=landing');
  });
});

describe('no question bank on the Landing (existing rule)', () => {
  it('no "banco de questões" in the rendered sections, the FAQ list or the header labels', () => {
    const { container } = render(
      <>
        <HeroSection h1="a" flags={flags} />
        <ReadyMarquee />
        <AreasSection />
        <ProblemSection />
        <MoreSection flags={flags} />
        <CompareSection />
        <PlansSection priceBook={book} flags={{ launchPhase: 'open', betaFounder: false, approvedContent: false }} />
        <FaqSection items={buildFaqItems(true)} />
      </>,
    );
    expect(container.textContent!.toLowerCase()).not.toContain('banco de quest');
  });
});

describe('health-area positioning (FR-37/39/42)', () => {
  it('hero tag and subtitle talk about the whole health area; footer disclaimer is professional-neutral', () => {
    expect(strings.landing.hero.tag).toBe('Para toda a área da saúde');
    expect(strings.landing.hero.subtitle).toContain('mapa vivo da sua área');
    expect(strings.landing.footer.disclaimer).toBe('Ferramenta de estudo. Não substitui diretrizes, protocolos nem supervisão profissional.');
    expect(strings.landing.enamed.lead).toMatch(/Para quem estuda Medicina/);
    expect(strings.landing.enamed.lead).toMatch(/Mais áreas da saúde a caminho/);
  });
});
