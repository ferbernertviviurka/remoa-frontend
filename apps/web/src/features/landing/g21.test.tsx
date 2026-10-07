import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { strings } from '@remoa/strings/landing';
import { iaFeatures } from './flags';
import { CalendarSection } from './calendar/calendar-section';
import { EnamedSlider } from './enamed/enamed-slider';
import { enamedSlides } from './enamed/slides';
import { IaSection } from './ia/ia-section';
import { iaCardBody, iaLead } from './ia/ia-copy';

afterEach(() => { cleanup(); vi.useRealTimers(); window.__remoaEvents = []; });

const ia = strings.landing.ia;
const en = strings.landing.enamed;

describe('ia honesty', () => {
  it('every IA feature is live (no "Em breve"), and PDF stays a Pro link', () => {
    const features = iaFeatures();
    expect(iaLead(features)).toBe(ia.lead);
    expect(iaCardBody('gerar', 'soon')).toBe(ia.cards.gerar.soonBody);
    expect(iaCardBody('resumo', 'live')).toBe(ia.cards.resumo.body);
    expect(iaCardBody('pdf', 'live')).toBe(ia.cards.pdf.body);
    expect(ia.lead + ia.leadPartial + ia.warning).not.toMatch(/anti-cola/i);
    render(<IaSection features={features} />);
    expect(screen.getByRole('heading', { level: 2, name: ia.title })).toBeTruthy();
    expect(screen.queryByText(ia.soon)).toBeNull();
    expect(screen.getByRole('link', { name: ia.pro })).toHaveAttribute('href', '/#planos');
    expect(screen.getByRole('img', { name: ia.playerLabel })).toBeTruthy();
    expect(screen.getByText(ia.warning)).toBeTruthy();
  });

  it('uses the full lead only when every feature is live', () => {
    const live = { pdf: 'live', gerar: 'live', corrigir: 'live', resumo: 'live' } as const;
    expect(iaLead(live)).toBe(ia.lead);
  });
});

describe('enamed slides', () => {
  const seed = (title: string, slug: string, topicArea: string) => ({
    title, slug, badges: ['top10_enamed'], area: 'CM', topicArea,
  });

  it('keeps catalog order and drops maps that are not published', () => {
    const slides = enamedSlides([
      seed('Ética médica e declaração de óbito', 'etica', 'Saúde Coletiva'),
      seed('Sepse e choque séptico', 'sepse', 'Clínica Médica'),
      { title: 'Rascunho', slug: 'rascunho', badges: [], area: 'CM', topicArea: null },
    ]);
    expect(slides.map((s) => s.slug)).toEqual(['sepse', 'etica']);
    expect(slides[0]).toMatchObject({ areaLabel: 'Clínica Médica', tone: 'cm', blurb: en.themes[0].blurb });
    expect(slides[1]?.tone).toBe('sc');
  });
});

describe('enamed slider', () => {
  const slides = en.themes.map((item, i) => ({
    slug: `t-${i}`, title: item.title, blurb: item.blurb, areaLabel: 'Clínica Médica', tone: 'cm' as const,
  }));

  it('counter follows the native scroll, has no dots and does not autoplay', () => {
    vi.useFakeTimers();
    render(<EnamedSlider slides={slides} />);
    expect(screen.getByText('Temas 1 de 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.prev })).toBeDisabled();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    const region = screen.getByRole('region', { name: en.region });
    Object.defineProperty(region.firstElementChild, 'offsetWidth', { value: 300 });
    Object.defineProperties(region, { clientWidth: { value: 375 }, scrollWidth: { value: 3000 }, scrollLeft: { value: 600, writable: true } });
    fireEvent.scroll(region);
    expect(screen.getByText('Temas 3 de 10')).toBeTruthy();
    region.scrollLeft = 2625;
    fireEvent.scroll(region);
    expect(screen.getByText('Temas 10 de 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.next })).toBeDisabled();
    vi.advanceTimersByTime(20000);
    expect(screen.getByText('Temas 10 de 10')).toBeTruthy();
    vi.useRealTimers();
  });
});

describe('calendar section', () => {
  it('names the five kinds, the four views and the stopped-scene alternative', () => {
    render(<CalendarSection />);
    for (const kind of strings.landing.calendar.kinds) expect(screen.getAllByText(kind).length).toBeGreaterThan(0);
    expect(screen.getByText(strings.landing.calendar.views)).toBeTruthy();
    expect(screen.getByText(strings.landing.calendar.kindsNote)).toBeTruthy();
    expect(screen.getByRole('img', { name: strings.landing.calendar.playerLabel })).toBeTruthy();
  });
});

describe('demo css', () => {
  const css = readFileSync(join(process.cwd(), 'src/features/landing/demos.css'), 'utf8');
  it('pauses off screen, respects reduced motion and only animates transform, opacity and clip-path', () => {
    expect(css).toContain('animation-play-state: paused');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('.ia-sc3');
    expect(css).toContain('.ca-sc2');
    expect(css).toMatch(/height: 540px/);
    expect(css).toMatch(/height: 640px/);
    const frames = css.match(/@keyframes[\s\S]*?}\s*(?=@|\n@media|$)/g) ?? [];
    for (const frame of frames) {
      expect(frame).not.toMatch(/background\s*:/);
      expect(frame).not.toMatch(/box-shadow\s*:/);
    }
  });
});
