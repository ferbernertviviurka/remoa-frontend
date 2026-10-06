import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { strings } from '@remoa/strings';
import { landingViewedProps, scrollPercent } from '../analytics';
import { buildFaqItems } from './faq';
import { pricebookPath } from './pricebook';
import { parseH, parseV } from './variants';

const post = vi.hoisted(() => vi.fn());
vi.mock('./waitlist', async (orig) => ({ ...(await orig<typeof import('./waitlist')>()), postWaitlist: post }));
import { WaitlistCta } from './waitlist-cta';

afterEach(() => { cleanup(); window.__remoaEvents = []; post.mockReset(); });

describe('variants', () => {
  test('h defaults to a; v only counts in waitlist phase', () => {
    expect(parseH(undefined)).toBe('a');
    expect(parseH('zzz')).toBe('a');
    expect(parseH(['c', 'a'])).toBe('c');
    expect(parseV('29', 'waitlist')).toBe('29');
    expect(parseV('49', 'open')).toBeNull();
    expect(parseV('30', 'waitlist')).toBeNull();
  });
  test('pricebook URL appends ?v= only with a variant', () => {
    expect(pricebookPath(null)).toBe('/v1/public/pricebook');
    expect(pricebookPath('49')).toBe('/v1/public/pricebook?v=49');
  });
});

describe('analytics props', () => {
  test('UTMs clipped, referrer is hostname only', () => {
    const p = landingViewedProps(`?utm_source=${'x'.repeat(200)}&utm_medium=cpc&email=a@b.co`, 'https://www.google.com/search?q=secret', '29', 'b');
    expect(p.utm_source).toHaveLength(80);
    expect(p).toMatchObject({ utm_medium: 'cpc', utm_campaign: null, referrer: 'www.google.com', variant: '29', h1: 'b' });
    expect(JSON.stringify(p)).not.toContain('a@b.co');
    expect(landingViewedProps('', '', null, 'a').referrer).toBeNull();
    expect(landingViewedProps('', 'not a url', null, 'a').referrer).toBeNull();
  });
  test('scroll percent', () => {
    expect(scrollPercent(0, 800, 800)).toBe(100);
    expect(scrollPercent(600, 800, 2800)).toBe(50);
  });
});

describe('faq items', () => {
  test('approved-only items hidden without the flag', () => {
    const off = buildFaqItems(false);
    expect(off.length).toBeLessThanOrEqual(strings.landing.faq.items.length);
    expect(buildFaqItems(true).length).toBe(strings.landing.faq.items.length);
  });
});

describe('WaitlistCta', () => {
  const fill = (email: string) => {
    fireEvent.change(screen.getByLabelText(strings.landing.waitlist.email.label), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: strings.landing.waitlist.submit }));
  };
  test('invalid email shows an error without calling the API', () => {
    render(<WaitlistCta phase="waitlist" variant={null} />);
    fill('nope');
    expect(screen.getByRole('alert').textContent).toBe(strings.landing.waitlist.validation.emailInvalid);
    expect(post).not.toHaveBeenCalled();
  });
  test('success: message, waitlist_joined, reset', async () => {
    post.mockResolvedValue({ kind: 'ok' });
    render(<WaitlistCta phase="waitlist" variant="29" />);
    fill('a@b.co');
    const ok = await screen.findByRole('status');
    await waitFor(() => expect(document.activeElement).toBe(ok));
    expect(post).toHaveBeenCalledWith({ email: 'a@b.co', segment: 'y5_6', variant: '29', honeypot: '' });
    expect(window.__remoaEvents).toContainEqual({ event: 'waitlist_joined', props: { segment: 'y5_6', variant: '29', platform: 'web', plan: 'free', appVersion: '0.0.0' } });
    fireEvent.click(screen.getByRole('button', { name: strings.landing.waitlist.success.alternate }));
    expect((screen.getByLabelText(strings.landing.waitlist.email.label) as HTMLInputElement).value).toBe('');
  });
  test('429 shows the rate-limit message; network error shows the generic one', async () => {
    post.mockResolvedValueOnce({ kind: 'rate_limited', message: 'Muitas tentativas.' });
    render(<WaitlistCta phase="waitlist" variant={null} />);
    fill('a@b.co');
    expect((await screen.findByRole('alert')).textContent).toBe(strings.landing.waitlist.errors.rateLimited);
    post.mockResolvedValueOnce({ kind: 'error' });
    fill('a@b.co');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(strings.landing.waitlist.errors.submit));
    expect(window.__remoaEvents).toEqual([]);
  });
  test('open phase links to sign-up instead of the form', () => {
    render(<WaitlistCta phase="open" variant={null} />);
    expect(screen.getByRole('link', { name: strings.landing.ctaSection.primary }).getAttribute('href')).toBe('/cadastro');
    expect(screen.queryByLabelText(strings.landing.waitlist.email.label)).toBeNull();
  });
});

describe('LandingHeader (D-320)', () => {
  test('signed out: Entrar + sign-up; signed in: one CTA back into /app', async () => {
    const { LandingHeader } = await import('./landing-header');
    const { rerender } = render(<LandingHeader blogLabel="Blog" phase="open" />);
    expect(screen.getAllByRole('link', { name: strings.landing.nav.signIn })[0]?.getAttribute('href')).toBe('/entrar');
    expect(screen.queryByRole('link', { name: strings.landing.nav.openApp })).toBeNull();
    rerender(<LandingHeader blogLabel="Blog" phase="open" signedIn />);
    expect(screen.getAllByRole('link', { name: strings.landing.nav.openApp })[0]?.getAttribute('href')).toBe('/app');
    expect(screen.queryByRole('link', { name: strings.landing.nav.signIn })).toBeNull();
  });
});

describe('hasSessionCookie (D-534)', () => {
  test('only the Supabase auth cookie (plain or chunked) counts', async () => {
    const { hasSessionCookie } = await import('./landing-header');
    expect(hasSessionCookie('')).toBe(false);
    expect(hasSessionCookie('remoa-motion=full; sb-abc-auth-token-code-verifier=x')).toBe(false);
    expect(hasSessionCookie('sb-127-auth-token=base64-x')).toBe(true);
    expect(hasSessionCookie('a=1; sb-abc-auth-token.0=x; sb-abc-auth-token.1=y')).toBe(true);
  });
});

describe('landing_cta_clicked (D-370)', () => {
  const sent = () => window.__remoaEvents?.filter((e) => e.event === 'landing_cta_clicked').map((e) => e.props);
  test('header: waitlist/create, signin and open_app carry location + cta', async () => {
    const { LandingHeader } = await import('./landing-header');
    const { rerender } = render(<LandingHeader blogLabel="Blog" phase="waitlist" />);
    fireEvent.click(screen.getAllByRole('link', { name: strings.landing.nav.createMap })[0]!);
    fireEvent.click(screen.getAllByRole('link', { name: strings.landing.nav.signIn })[0]!);
    rerender(<LandingHeader blogLabel="Blog" phase="open" signedIn />);
    fireEvent.click(screen.getAllByRole('link', { name: strings.landing.nav.openApp })[0]!);
    await waitFor(() => expect(sent()).toEqual([
      { location: 'header', cta: 'waitlist', platform: 'web', plan: 'free', appVersion: '0.0.0' },
      { location: 'header', cta: 'signin', platform: 'web', plan: 'free', appVersion: '0.0.0' },
      { location: 'header', cta: 'open_app', platform: 'web', plan: 'free', appVersion: '0.0.0' },
    ]));
  });
  test('final: open phase sign-up link', async () => {
    render(<WaitlistCta phase="open" variant={null} />);
    fireEvent.click(screen.getByRole('link', { name: strings.landing.ctaSection.primary }));
    await waitFor(() => expect(sent()).toEqual([{ location: 'final', cta: 'create', platform: 'web', plan: 'free', appVersion: '0.0.0' }]));
  });
});
