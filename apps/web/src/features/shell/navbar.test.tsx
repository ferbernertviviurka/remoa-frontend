import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PLAN_LIMITS, type Entitlements } from '@remoa/contracts';
import { Navbar, showNavbar } from './navbar';
import { EntitlementsProvider } from './entitlements';

const push = vi.fn();
const track = vi.fn();
let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a), rememberPlan: () => undefined }));
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ ok: false })) }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); pathname = '/'; });

const free: Entitlements = {
  plan: 'free', status: null, ...PLAN_LIMITS.free, limits: { ...PLAN_LIMITS.free.limits, cards: 200 }, usage: { ai_grades: 20, ai_generations: 0, boards: 1, cards: 170 }, ankiImportsUsed: 0, renewsAt: null, cancelAtPeriodEnd: false, graceUntil: null,
};
const pro: Entitlements = { ...free, plan: 'pro', status: 'active', ...PLAN_LIMITS.pro, usage: { ...free.usage, ai_generations: 3 }, renewsAt: new Date('2026-11-15T12:00:00Z') };

const founder: Entitlements = { ...pro, plan: 'founder', renewsAt: null, limits: { ...pro.limits, ai_generations: null } };

// the panel (Radix) downloads on the first interaction with the chip (P-512): wait for it
const open = async (e: Entitlements | null) => {
  render(<EntitlementsProvider initial={e}><Navbar /></EntitlementsProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
  return screen.findByRole('dialog');
};

describe('showNavbar', () => {
  it('is on for shell routes and off in the map editor', () => {
    for (const p of ['/', '/app/hoje', '/app/mapas', '/app/revisar', '/app/conta/plano']) expect(showNavbar(p)).toBe(true);
    expect(showNavbar('/app/mapas/abc')).toBe(false);
  });
  it('renders in the editor too (D-607: global "Buscar ou comandar")', () => {
    pathname = '/app/mapas/abc';
    render(<EntitlementsProvider initial={free}><Navbar /></EntitlementsProvider>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    pathname = '/app/hoje';
  });
});

describe('Navbar avatar', () => {
  it('links to /conta with the account name and photo', () => {
    render(<EntitlementsProvider initial={free}><Navbar account={{ name: 'Ana Souza', email: 'a@b.c', color: 1 }} /></EntitlementsProvider>);
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/app/conta/perfil'); // G14 D-584
    expect(screen.getByText('AS')).toBeInTheDocument();
  });
});

describe('Navbar referral entries', () => {
  it.each([['free', free], ['pro', pro]] as const)('%s: navbar button and plan panel link carry the origin', async (_n, e) => {
    render(<EntitlementsProvider initial={e}><Navbar /></EntitlementsProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Indique e ganhe' }));
    expect(push).toHaveBeenLastCalledWith('/app/indicar?de=navbar');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ganhe Pro indicando um amigo' }));
    expect(push).toHaveBeenLastCalledWith('/app/indicar?de=plan_panel');
  });
});

describe('Navbar plan panel', () => {
  it('Founder: chip and panel say Founder, no renewal date, no upgrade nor manage button', async () => {
    render(<EntitlementsProvider initial={founder}><Navbar /></EntitlementsProvider>);
    expect(screen.getByText('Plano Founder')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    const panel = within(await screen.findByRole('dialog'));
    expect(panel.getByText('Você é Founder')).toBeInTheDocument();
    expect(panel.queryByText(/Renova em/)).toBeNull();
    expect(panel.queryByRole('button', { name: 'Fazer upgrade' })).toBeNull();
    expect(panel.queryByRole('button', { name: 'Gerenciar assinatura' })).toBeNull();
  });

  it('Free: meters, upgrade button and CTA fire events and go to /planos', async () => {
    render(<EntitlementsProvider initial={free}><Navbar /></EntitlementsProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Fazer upgrade' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'navbar_upgrade' });
    expect(push).toHaveBeenCalledWith('/app/planos?de=navbar_upgrade');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    expect(track).toHaveBeenCalledWith('plan_popover_opened', { trigger: 'keyboard' });
    await screen.findByRole('dialog');
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('170 de 200')).toBeInTheDocument();
    expect(screen.getByText('Não incluso')).toBeInTheDocument(); // Free: mapas de PDF (ai_generations 0)
    expect(screen.getByText('Com o Pro você ganha')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fazer upgrade' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'plan_popover' });
  });

  it('Pro: renewal date, unlimited meters, manage, no upgrade or benefits', async () => {
    await open(pro);
    expect(screen.getByText(/Renova em 15 de novembro de 2026/)).toBeInTheDocument();
    expect(screen.getByText(`3 de ${PLAN_LIMITS.pro.limits.ai_generations}`)).toBeInTheDocument();
    expect(screen.getByText(`20 de ${PLAN_LIMITS.pro.limits.ai_grades}`)).toBeInTheDocument();
    expect(screen.getAllByText('Ilimitados')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Gerenciar assinatura' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fazer upgrade' })).toBeNull();
    expect(screen.queryByText('Com o Pro você ganha')).toBeNull();
  });

  it('free trial (D-1213): "Pro · teste" chip, end date and days left, subscribe instead of the Stripe portal', async () => {
    const end = new Date(Date.now() + 3 * 86_400_000 - 60_000);
    const trial: Entitlements = { ...pro, status: null, renewsAt: null, grantUntil: end, trialUntil: end };
    render(<EntitlementsProvider initial={trial}><Navbar /></EntitlementsProvider>);
    expect(screen.getByText('Pro · teste')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fazer upgrade' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes do plano' }));
    const panel = within(await screen.findByRole('dialog'));
    expect(panel.getByText('Você está no teste grátis do Pro')).toBeInTheDocument();
    expect(panel.getByText(/Faltam 3 dias\. Depois, a conta volta para o Free/)).toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Gerenciar assinatura' })).toBeNull();
    fireEvent.click(panel.getByRole('button', { name: 'Assinar o Pro' }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'plan_popover' });
    expect(push).toHaveBeenLastCalledWith('/app/planos?de=plan_popover');
  });

  it('referral months after the trial: plain Pro chip, "Pro grátis até" text', async () => {
    const trialEnd = new Date(Date.now() + 2 * 86_400_000);
    const gift: Entitlements = { ...pro, status: null, renewsAt: null, grantUntil: new Date(trialEnd.getTime() + 30 * 86_400_000), trialUntil: trialEnd };
    await open(gift);
    expect(screen.getByText('Plano Pro')).toBeInTheDocument();
    expect(screen.getByText('Você está no Pro grátis')).toBeInTheDocument();
    expect(screen.getByText(/Seu Pro grátis vai até/)).toBeInTheDocument();
  });

  it('Pro past due shows the grace warning', async () => {
    await open({ ...pro, graceUntil: new Date('2026-11-22T12:00:00Z') });
    expect(screen.getByText(/O Pro continua ativo até 22 de novembro de 2026/)).toBeInTheDocument();
  });

  it('legacy account (more maps than the Free limit) shows the legacy notice', async () => {
    await open({ ...free, usage: { ...free.usage, boards: 3 } });
    expect(screen.getByText('Você tem 3 mapas; o Free permite 2')).toBeInTheDocument();
  });

  it('error state offers retry', async () => {
    await open(null);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
