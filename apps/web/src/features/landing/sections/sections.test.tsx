import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { strings } from '@remoa/strings';
import { FeaturesSection, HowSection, MoreSection, ProblemSection, ReadyMarquee } from './index';

afterEach(() => {
  cleanup();
  window.__remoaEvents = [];
});

describe('landing sections', () => {
  test('explorer: 6 tabs, active image has the right alt, selecting fires feature_tab_selected', async () => {
    render(<FeaturesSection />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(screen.getByAltText(strings.landing.featureAlts.map)).toBeTruthy();
    expect(screen.getByText('Imagem da plataforma: mapa de conceitos')).toBeTruthy();
    fireEvent.click(tabs[4]!);
    expect(screen.getByAltText(strings.landing.featureAlts.fsrs).getAttribute('loading')).toBe('lazy');
    expect(screen.getByText('Imagem da plataforma: lembrança estimada')).toBeTruthy();
    await waitFor(() => expect(window.__remoaEvents).toContainEqual({ event: 'feature_tab_selected', props: { feature: 'fsrs', platform: 'web', plan: 'free', appVersion: '0.0.0' } }));
  });

  test('explorer auto-advances only while visible, and stops once the user picks a tab', () => {
    vi.useFakeTimers();
    let fire: (v: boolean) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class { constructor(cb: (e: { isIntersecting: boolean }[]) => void) { fire = (v) => cb([{ isIntersecting: v }]); } observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width'), addEventListener() {}, removeEventListener() {} }));
    try {
      render(<FeaturesSection />);
      const selected = () => screen.getAllByRole('tab').findIndex((t) => t.getAttribute('aria-selected') === 'true');
      act(() => vi.advanceTimersByTime(7000));
      expect(selected()).toBe(0);
      act(() => fire(true));
      expect(document.querySelector('.lp-step-fill')).toBeTruthy();
      act(() => vi.advanceTimersByTime(6000));
      expect(selected()).toBe(1);
      act(() => fire(false));
      act(() => vi.advanceTimersByTime(12000));
      expect(selected()).toBe(1);
      act(() => fire(true));
      fireEvent.click(screen.getAllByRole('tab')[4]!);
      act(() => vi.advanceTimersByTime(12000));
      expect(selected()).toBe(4);
      expect(document.querySelector('.lp-step-fill')).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  test('problem, how, more render all their texts', () => {
    render(<><ProblemSection /><HowSection /><MoreSection flags={{ approvedContent: true }} /></>);
    for (const c of strings.landing.problem.cards) {
      expect(screen.getByText(c.text)).toBeTruthy();
      expect(screen.getByText(c.chip)).toBeTruthy();
    }
    for (const s of strings.landing.how.steps) expect(screen.getByRole('heading', { name: s.title })).toBeTruthy();
    for (const tile of strings.landing.more.tiles.slice(0, 3)) {
      const img = screen.getByAltText(tile.alt);
      expect(img.getAttribute('width')).toBe('640');
      expect(img.getAttribute('height')).toBe('420');
    }
    expect(screen.getByText(strings.landing.more.tiles[3]!.textApproved)).toBeTruthy();
    expect(screen.getByText('Surviving Sepsis Campaign 2021')).toBeTruthy();
  });

  test('flag off: no reviewer claims, prontos tile hidden, draft provenance; flag on: approved variants', () => {
    const L = strings.landing;
    const off = render(<><ReadyMarquee /><FeaturesSection /><MoreSection /></>);
    fireEvent.click(screen.getAllByRole('tab')[3]!);
    expect(screen.getAllByText(L.ready.title).length).toBeGreaterThan(0);
    expect(screen.getByAltText(L.featureAlts.grading)).toBeTruthy();
    expect(screen.queryByText(L.explorer.items[3]!.benefitsApproved[0]!)).toBeNull();
    expect(screen.getByText(L.explorer.items[3]!.benefits[0]!)).toBeTruthy();
    expect(screen.queryByText(L.more.tiles[1]!.title)).toBeNull();
    expect(screen.getByText(L.hero.map.provenanceDraft)).toBeTruthy();
    expect(screen.queryByText(L.hero.chips.reviewed)).toBeNull();
    off.unmount();
    const flags = { approvedContent: true };
    render(<><ReadyMarquee flags={flags} /><FeaturesSection flags={flags} /><MoreSection flags={flags} /></>);
    fireEvent.click(screen.getAllByRole('tab')[3]!);
    expect(screen.getAllByText(L.ready.titleApproved).length).toBeGreaterThan(0);
    expect(screen.getByAltText(L.featureAlts.gradingApproved)).toBeTruthy();
    expect(screen.getByText(L.explorer.items[3]!.benefitsApproved[0]!)).toBeTruthy();
    expect(screen.getByText(L.more.tiles[1]!.title)).toBeTruthy();
    expect(screen.getByText(L.hero.chips.reviewed)).toBeTruthy();
    expect(screen.queryByText(L.hero.map.provenanceDraft)).toBeNull();
  });

  test('marquee exposes a pause button and the ready title', () => {
    render(<ReadyMarquee />);
    expect(screen.getByRole('button', { name: strings.landing.ready.pauseAria })).toBeTruthy();
    expect(within(document.body).getAllByText(strings.landing.ready.title).length).toBeGreaterThan(0);
  });
});
