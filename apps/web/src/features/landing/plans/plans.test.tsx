import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PLAN_LIMITS, annualDiscountPercent, type PublicPriceBook } from '@remoa/contracts';
import { strings } from '@remoa/strings';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
import { CompareSection, FaqSection, PlansSection } from '.';

const book: PublicPriceBook = { monthly: { amount: 3900 }, annual: { amount: 34900 }, currency: 'brl', founder: false };
const flags = { launchPhase: 'waitlist', betaFounder: false, approvedContent: false } as const;
afterEach(() => { cleanup(); track.mockClear(); });

describe('PlansSection', () => {
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

  it('CTAs go to #cta in waitlist and /cadastro when open; founder badge only with the flag', () => {
    const { unmount } = render(<PlansSection priceBook={book} flags={flags} />);
    expect(screen.queryByText(strings.landing.plans.pro.founder)).toBeNull();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#cta', '#cta']);
    unmount();
    render(<PlansSection priceBook={book} flags={{ launchPhase: 'open', betaFounder: true, approvedContent: false }} />);
    expect(screen.getByText(strings.landing.plans.pro.founder)).toBeTruthy();
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/cadastro', '/cadastro']);
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
