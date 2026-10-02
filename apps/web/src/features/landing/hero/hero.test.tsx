import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { strings } from '@remoa/strings';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
import { HeroSection } from './hero-section';

const h = strings.landing.hero;
const flags = { launchPhase: 'waitlist' as const, betaFounder: false, approvedContent: false };
let io: IntersectionObserverCallback | undefined;
let reduced = false;

beforeEach(() => {
  io = undefined;
  reduced = false;
  vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { io = cb; } observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); track.mockClear(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('data-motion'); });

const stage = () => screen.getByRole('img', { name: h.stageAria });
const enter = () => act(() => io?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

describe('HeroSection', () => {
  it.each(['a', 'b', 'c'] as const)('renders the H1 variant %s as the only h1', (v) => {
    render(<HeroSection h1={v} flags={flags} />);
    const all = screen.getAllByRole('heading', { level: 1 });
    expect(all).toHaveLength(1);
    expect(all[0]!.textContent).toBe(h.h1[v]);
  });

  it('CTA hrefs per launch phase, and hero_cta_clicked', () => {
    const { unmount } = render(<HeroSection h1="a" flags={flags} />);
    expect(screen.getByRole('link', { name: h.cta.primary }).getAttribute('href')).toBe('#cta');
    expect(screen.getByRole('link', { name: h.cta.secondary }).getAttribute('href')).toBe('#experimente');
    fireEvent.click(screen.getByRole('link', { name: h.cta.secondary }));
    expect(track).toHaveBeenCalledWith('hero_cta_clicked', { cta: 'demo' });
    unmount();
    render(<HeroSection h1="a" flags={{ ...flags, launchPhase: 'open' }} />);
    const create = screen.getByRole('link', { name: h.cta.primary });
    create.addEventListener('click', (e) => e.preventDefault()); // jsdom has no navigation
    fireEvent.click(create);
    expect(create.getAttribute('href')).toBe('/cadastro');
    expect(track).toHaveBeenCalledWith('hero_cta_clicked', { cta: 'create' });
  });

  it('"Revisado por médico" chip and the approved rubric line only with approvedContent (FR-21)', () => {
    const { container, unmount } = render(<HeroSection h1="a" flags={flags} />);
    expect(container.textContent).not.toContain(h.chips.reviewed);
    expect(container.textContent).toContain(h.map.rubricLine);
    expect(container.textContent).toContain(h.map.provenanceDraft);
    expect(container.textContent).not.toContain(h.map.rubricLineApproved);
    unmount();
    const r = render(<HeroSection h1="a" flags={{ ...flags, approvedContent: true }} />);
    expect(r.container.textContent).toContain(h.chips.reviewed);
    expect(r.container.textContent).toContain(h.map.rubricLineApproved);
    expect(r.container.textContent).not.toContain(h.map.provenanceDraft);
  });

  it('server/first render is the final frame; plays on viewport entry; replay remounts and fires hero_replayed', () => {
    render(<HeroSection h1="a" flags={flags} />);
    expect(stage().hasAttribute('data-play')).toBe(false);
    expect(stage().textContent).toContain(h.map.verdictText);
    enter();
    expect(stage().hasAttribute('data-play')).toBe(true);
    const before = stage();
    fireEvent.click(screen.getByRole('button', { name: h.replay }));
    expect(track).toHaveBeenCalledWith('hero_replayed', {});
    expect(stage()).not.toBe(before); // remounted (key)
    expect(stage().hasAttribute('data-play')).toBe(true);
  });

  it.each([['system', () => { reduced = true; }], ['data-motion', () => { document.documentElement.dataset.motion = 'reduced'; }]])('reduced motion (%s) keeps the final frame without data-play', (_n, set) => {
    set();
    render(<HeroSection h1="a" flags={flags} />);
    enter();
    fireEvent.click(screen.getByRole('button', { name: h.replay }));
    expect(io).toBeUndefined();
    expect(stage().hasAttribute('data-play')).toBe(false);
    expect(stage().textContent).toContain(h.map.verdictText);
  });

  it('the stage is described for screen readers and its animated parts are hidden', () => {
    render(<HeroSection h1="a" flags={flags} />);
    const desc = document.getElementById(stage().getAttribute('aria-describedby')!);
    expect(desc?.textContent).toContain(h.map.answer);
    expect(desc?.textContent).toContain(h.map.verdict);
    expect(stage().querySelector('.hx-window')?.getAttribute('aria-hidden')).toBe('true');
  });
});
