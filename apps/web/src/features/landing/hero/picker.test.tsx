import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { healthCourseCodes } from '@remoa/contracts';
import { strings } from '@remoa/strings/full';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
import { HeroSection } from './hero-section';
import { COURSE_CODES, fetchCourses, staticCourses } from './courses';
import { signupHref } from '../shell/signup-href';

const flags = { launchPhase: 'open' as const, betaFounder: false, approvedContent: false, ia: { pdf: 'live' as const, gerar: 'soon' as const, corrigir: 'live' as const, resumo: 'soon' as const } };
const p = strings.landing.picker;
const cta = () => screen.getByRole('link', { name: strings.landing.hero.cta.primary }).getAttribute('href');

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('api down'))); // static fallback list
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('hero course picker (FR-37)', () => {
  it('static fallback list equals the contract course codes', () => {
    expect([...COURSE_CODES]).toEqual([...healthCourseCodes]);
    expect(staticCourses().every((c) => c.name.length > 0)).toBe(true);
  });

  it('shows the 7 popular chips and no message before a choice; CTA has only de=landing', () => {
    render(<HeroSection h1="a" flags={flags} />);
    const group = screen.getByRole('group', { name: p.chipsLabel });
    expect(group.querySelectorAll('button')).toHaveLength(7);
    expect(cta()).toBe('/cadastro?de=landing');
  });

  it('a chosen course rides the CTA href; Medicina names the ENAMED maps (no availability claim, D-1863), other courses say "a caminho" without promising ready maps', () => {
    render(<HeroSection h1="a" flags={flags} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enfermagem' }));
    expect(cta()).toBe('/cadastro?curso=nursing&de=landing');
    const msg = screen.getByText(/^Para Enfermagem:/);
    expect(msg.textContent).toContain('a caminho');
    expect(msg.textContent).not.toContain('já no ar');
    fireEvent.click(screen.getByRole('button', { name: 'Medicina' }));
    expect(cta()).toBe('/cadastro?curso=medicine&de=landing');
    expect(screen.getByText(/^Para Medicina:/).textContent).toContain('mapas do ENAMED');
    expect(screen.getByText(/^Para Medicina:/).textContent).not.toContain('já no ar');
  });

  it('typing in the combobox picks a course from the list', async () => {
    const { container } = render(<HeroSection h1="a" flags={flags} />);
    // D-1865: the Autocomplete chunk is not loaded in the page load window; the first pointer/focus on the island loads it
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.pointerOver(container.querySelector('[data-island="pending"]')!);
    const input = await screen.findByRole('combobox', {}, { timeout: 3000 });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'fisio' } });
    fireEvent.click(await screen.findByRole('option', { name: /^Fisio/ }));
    await waitFor(() => expect(cta()).toBe('/cadastro?curso=physiotherapy&de=landing'));
  });

  it('uses the API list (with goals) when available and keeps the static one when it fails', async () => {
    const ok = { ok: true, json: async () => ({ ok: true, data: [{ code: 'nursing', name: 'Enfermagem', aliases: [], suggestedGoals: ['provas_faculdade', 'enade'] }] }) };
    expect((await fetchCourses('http://x', undefined) ?? [])).toEqual([]); // fetch rejects -> null -> []
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok));
    const list = await fetchCourses('http://x');
    expect(list?.[0]).toMatchObject({ code: 'nursing', goals: ['provas_faculdade', 'enade'] });
  });
});

describe('signupHref', () => {
  it('builds /cadastro?curso=&de=landing&plano=', () => {
    expect(signupHref()).toBe('/cadastro?de=landing');
    expect(signupHref({ curso: 'nursing', plano: 'pro_annual' })).toBe('/cadastro?curso=nursing&de=landing&plano=pro_annual');
  });
});
