import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Entitlements } from '@remoa/contracts';
import { Navbar, showNavbar } from './navbar';
import { EntitlementsProvider } from './entitlements';

const push = vi.fn();
const track = vi.fn();
let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ ok: false })) }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); pathname = '/'; });

const free: Entitlements = {
  plan: 'free', status: null, limits: { ai_grades: 20, ai_generations: 1, boards: 2, cards: 200 }, usage: { ai_grades: 20, ai_generations: 0, boards: 1, cards: 170 },
  newCardsPerDay: 10, ankiImportMaxCards: 5000, renewsAt: null, cancelAtPeriodEnd: false, graceUntil: null,
};
const pro: Entitlements = { ...free, plan: 'pro', status: 'active', limits: { ai_grades: null, ai_generations: 20, boards: null, cards: null }, usage: { ...free.usage, ai_generations: 3 }, renewsAt: new Date('2026-11-15T12:00:00Z') };

const founder: Entitlements = { ...pro, plan: 'founder', renewsAt: null, limits: { ...pro.limits, ai_generations: null } };

const open = (e: Entitlements | null) => {
  render(<EntitlementsProvider initial={e}><Navbar /></EntitlementsProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
};

describe('showNavbar', () => {
  it('is on for shell routes and off in the map editor', () => {
    for (const p of ['/', '/app/hoje', '/app/mapas', '/app/revisar', '/app/conta/plano']) expect(showNavbar(p)).toBe(true);
    expect(showNavbar('/app/mapas/abc')).toBe(false);
  });
  it('renders nothing in the editor', () => {
    pathname = '/app/mapas/abc';
    render(<EntitlementsProvider initial={free}><Navbar /></EntitlementsProvider>);
    expect(screen.queryByRole('banner')).toBeNull();
  });
});

describe('Navbar avatar', () => {
  it('links to /conta with the account name and photo', () => {
    render(<EntitlementsProvider initial={free}><Navbar account={{ name: 'Ana Souza', email: 'a@b.c', color: 1 }} /></EntitlementsProvider>);
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/app/conta');
    expect(screen.getByText('AS')).toBeInTheDocument();
  });
});

describe('Navbar referral entries', () => {
  it.each([['free', free], ['pro', pro]] as const)('%s: navbar button and plan panel link carry the origin', (_n, e) => {
    render(<EntitlementsProvider initial={e}><Navbar /></EntitlementsProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Indique e ganhe' }));
    expect(push).toHaveBeenLastCalledWith('/app/indicar?de=navbar');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ganhe Pro indicando um amigo' }));
    expect(push).toHaveBeenLastCalledWith('/app/indicar?de=plan_panel');
  });
});

describe('Navbar plan panel', () => {
  it('Founder: chip and panel say Founder, no renewal date, no upgrade nor manage button', () => {
    render(<EntitlementsProvider initial={founder}><Navbar /></EntitlementsProvider>);
    expect(screen.getByText('Plano Founder')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    const panel = within(screen.getByRole('dialog'));
    expect(panel.getByText('Você é Founder')).toBeInTheDocument();
    expect(panel.queryByText(/Renova em/)).toBeNull();
    expect(panel.queryByRole('button', { name: 'Fazer upgrade' })).toBeNull();
    expect(panel.queryByRole('button', { name: 'Gerenciar assinatura' })).toBeNull();
  });

  it('Free: meters, upgrade button and CTA fire events and go to /planos', () => {
    render(<EntitlementsProvider initial={free}><Navbar /></EntitlementsProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Fazer upgrade' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'navbar_upgrade' });
    expect(push).toHaveBeenCalledWith('/app/planos?de=navbar_upgrade');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    expect(track).toHaveBeenCalledWith('plan_popover_opened', { trigger: 'keyboard' });
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('170 de 200')).toBeInTheDocument();
    expect(screen.getByText('Com o Pro você ganha')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fazer upgrade' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'plan_popover' });
  });

  it('Pro: renewal date, unlimited meters, manage, no upgrade or benefits', () => {
    open(pro);
    expect(screen.getByText(/Renova em 15 de novembro de 2026/)).toBeInTheDocument();
    expect(screen.getByText('3 de 20')).toBeInTheDocument();
    expect(screen.getAllByText('Ilimitados')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Gerenciar assinatura' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fazer upgrade' })).toBeNull();
    expect(screen.queryByText('Com o Pro você ganha')).toBeNull();
  });

  it('Pro past due shows the grace warning', () => {
    open({ ...pro, graceUntil: new Date('2026-11-22T12:00:00Z') });
    expect(screen.getByText(/O Pro continua ativo até 22 de novembro de 2026/)).toBeInTheDocument();
  });

  it('legacy account (more maps than the Free limit) shows the legacy notice', () => {
    open({ ...free, usage: { ...free.usage, boards: 3 } });
    expect(screen.getByText('Você tem 3 mapas; o Free permite 2')).toBeInTheDocument();
  });

  it('error state offers retry', () => {
    open(null);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
