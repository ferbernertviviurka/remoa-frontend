import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PLAN_LIMITS, annualDiscountPercent, type PublicPriceBook } from '@remoa/contracts';
import { strings } from '@remoa/strings';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
import { CompareSection, FaqSection, PlansSection } from '.';

const book: PublicPriceBook = { monthly: { amount: 3900 }, annual: { amount: 34900 }, lifetime: { amount: 59990 }, currency: 'brl', founder: false };
const flags = { launchPhase: 'waitlist', betaFounder: false, approvedContent: false } as const;
afterEach(() => { cleanup(); track.mockClear(); });

describe('PlansSection', () => {
  it('CTAs fire landing_cta_clicked per plan and launch phase', () => {
    const { rerender } = render(<PlansSection priceBook={book} flags={flags} />);
    fireEvent.click(screen.getByRole('link', { name: strings.landing.plans.cta.free }));
    fireEvent.click(screen.getAllByRole('link', { name: strings.landing.plans.cta.waitlist })[0]!); // Pro (Founder is the last)
    rerender(<PlansSection priceBook={book} flags={{ ...flags, launchPhase: 'open' }} />);
    fireEvent.click(screen.getByRole('link', { name: strings.landing.plans.cta.pro }));
    expect(track.mock.calls.filter((c) => c[0] === 'landing_cta_clicked').map((c) => c[1])).toEqual([
      { location: 'plans_free', cta: 'waitlist' },
      { location: 'plans_pro', cta: 'waitlist' },
      { location: 'plans_pro', cta: 'create' },
    ]);
  });


  it('renders limits from contracts and prices from the book; toggle swaps price, label and fires pricing_toggled', () => {
    render(<PlansSection priceBook={book} flags={flags} />);
    expect(screen.getByText(`${PLAN_LIMITS.free.limits.boards} mapas`)).toBeTruthy();
    expect(screen.getByText(`${PLAN_LIMITS.free.limits.cards} cards`)).toBeTruthy();
    expect(screen.getByText(/R\$\s*39/)).toBeTruthy();
    const pct = annualDiscountPercent(book);
    expect(pct).toBe(25);
    expect(screen.getByText(`-${pct}%`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(strings.landing.plans.period.annual) }));
    expect(screen.getByText(/R\$\s*349/)).toBeTruthy();
    expect(track).toHaveBeenCalledWith('pricing_toggled', { period: 'annual' });
  });

  it('Mensal/Anual: preço, período e nota trocam via Torph; com movimento reduzido a troca é direta', async () => {
    const mm = (reduce: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
    // com movimento reduzido o Torph não monta: o texto é o do próprio DOM
    const sr = (c: HTMLElement) => (c.querySelector('[torph-root]') ? [...c.querySelectorAll('[torph-sr]')].map((e) => e.textContent) : [c.textContent]);
    for (const reduce of [false, true]) {
      mm(reduce);
      const { container, unmount } = render(<PlansSection priceBook={book} flags={flags} />);
      expect(sr(container).some((x) => x?.includes(strings.landing.plans.cadence.monthly))).toBe(true);
      const annualBtn = screen.getByRole('button', { name: new RegExp(strings.landing.plans.period.annual) });
      fireEvent.pointerEnter(annualBtn); // a mão chega perto do seletor: o Torph passa a baixar (D-560)
      fireEvent.click(annualBtn);
      await waitFor(() => expect(container.querySelector('[torph-root]') === null).toBe(reduce), { timeout: 5000 }); // Torph carrega sob demanda (D-560)
      expect(sr(container).some((x) => x?.includes(strings.landing.plans.cadence.annual))).toBe(true);
      expect(sr(container).some((x) => /349/.test(x ?? ''))).toBe(true);
      expect(sr(container).some((x) => /por mês/.test(x ?? ''))).toBe(true);
      expect(container.querySelector('[torph-root]') === null).toBe(reduce);
      unmount();
    }
    vi.unstubAllGlobals();
  });

  it('CTAs go to #cta in waitlist and /cadastro when open; founder badge only with the flag', () => {
    const { unmount } = render(<PlansSection priceBook={book} flags={flags} />);
    expect(screen.queryByText(strings.landing.plans.pro.founder)).toBeNull();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#cta', '#cta', '#cta']);
    unmount();
    render(<PlansSection priceBook={book} flags={{ launchPhase: 'open', betaFounder: true, approvedContent: false }} />);
    expect(screen.getByText(strings.landing.plans.pro.founder)).toBeTruthy();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/cadastro', '/cadastro', '/cadastro']);
  });

  it('Founder card: one-time lifetime price from the book, unaffected by the period toggle, CTA tracked as plans_founder', () => {
    const { rerender } = render(<PlansSection priceBook={book} flags={flags} />);
    const card = () => within(screen.getByRole('article', { name: strings.landing.plans.founder.name }));
    expect(card().getAllByText(strings.landing.plans.cadence.founder).length).toBeGreaterThan(0);
    expect(card().getAllByText(strings.landing.plans.notes.founder).length).toBeGreaterThan(0);
    expect(card().getAllByText(/R\$\s*599,90/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(strings.landing.plans.period.annual) }));
    expect(card().getAllByText(/R\$\s*599,90/).length).toBeGreaterThan(0);
    fireEvent.click(card().getByRole('link', { name: strings.landing.plans.cta.waitlist }));
    rerender(<PlansSection priceBook={book} flags={{ ...flags, launchPhase: 'open' }} />);
    fireEvent.click(card().getByRole('link', { name: strings.landing.plans.cta.founder }));
    expect(track.mock.calls.filter((c) => c[0] === 'landing_cta_clicked').map((c) => c[1])).toEqual([
      { location: 'plans_founder', cta: 'waitlist' },
      { location: 'plans_founder', cta: 'create' },
    ]);
  });

  it('an API without lifetime (pre D-375) still shows Free and Pro, just no Founder card', () => {
    render(<PlansSection priceBook={{ ...book, lifetime: undefined }} flags={flags} />);
    expect(screen.getByText(strings.landing.plans.pro.name)).toBeTruthy();
    expect(screen.queryByText(strings.landing.plans.founder.name)).toBeNull();
  });

  it('swaps the Pro feature list only with approvedContent', () => {
    const pro = strings.landing.plans.pro as { features: readonly string[]; featuresApproved?: readonly string[] };
    const extra = pro.featuresApproved?.at(-1) ?? '';
    const { unmount } = render(<PlansSection priceBook={book} flags={flags} />);
    expect(screen.queryByText(extra)).toBeNull();
    unmount();
    render(<PlansSection priceBook={book} flags={{ ...flags, approvedContent: true }} />);
    expect(screen.getByText(extra)).toBeTruthy();
  });

  it('uses the variant price from the book (?v=29)', () => {
    render(<PlansSection priceBook={{ ...book, monthly: { amount: 2900 }, annual: { amount: 24900 }, variant: '29' }} flags={flags} />);
    expect(screen.getByText(/R\$\s*29/)).toBeTruthy();
  });
});

describe('FaqSection', () => {
  const items = [{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }, { q: 'Q3', a: 'A3' }];
  it('first open, one at a time, faq_opened with index', () => {
    render(<FaqSection items={items} />);
    const q = (n: string) => screen.getByRole('button', { name: n });
    expect(q('Q1').getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(q('Q3'));
    expect(q('Q3').getAttribute('aria-expanded')).toBe('true');
    expect(q('Q1').getAttribute('aria-expanded')).toBe('false');
    expect(track).toHaveBeenCalledWith('faq_opened', { index: 2 });
    track.mockClear();
    fireEvent.click(q('Q3'));
    expect(track).not.toHaveBeenCalled();
  });
});

describe('CompareSection', () => {
  it('renders a table with the 7 rows, 3 columns and the footnote with month/year', () => {
    render(<CompareSection />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(1 + strings.landing.compare.rows.length);
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toContain(strings.landing.compare.columns.remoa);
    expect(screen.getByText(new RegExp(`/${new Date().getFullYear()}`))).toBeTruthy();
  });
});
