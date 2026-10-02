import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { strings } from '@remoa/strings';
import { FeaturesSection, HowSection, MoreSection, ProblemSection, ReadyMarquee } from './index';

afterEach(() => {
  cleanup();
  window.__remoaEvents = [];
});

describe('landing sections', () => {
  test('explorer: 6 tabs, active image has the right alt, selecting fires feature_tab_selected', () => {
    render(<FeaturesSection />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(screen.getByAltText(strings.landing.featureAlts.map)).toBeTruthy();
    expect(screen.getByText('Imagem da plataforma: mapa de conceitos')).toBeTruthy();
    fireEvent.click(tabs[4]!);
    expect(screen.getByAltText(strings.landing.featureAlts.fsrs).getAttribute('loading')).toBe('lazy');
    expect(screen.getByText('Imagem da plataforma: lembrança estimada')).toBeTruthy();
    expect(window.__remoaEvents).toContainEqual({ event: 'feature_tab_selected', props: { feature: 'fsrs', platform: 'web' } });
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
