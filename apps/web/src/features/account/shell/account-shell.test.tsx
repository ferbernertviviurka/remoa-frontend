import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { accountDeletionFixture, accountFreeFixture, accountProFixture } from '@remoa/contracts/mocks';
import { Wrap } from '../test-utils';
import { AccountShell } from './account-shell';

const push = vi.fn();
const api = vi.fn();
const track = vi.fn();
let segment: string | null = 'perfil';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }), useSelectedLayoutSegment: () => segment, useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const signOutToLogin = vi.fn(async () => true);
vi.mock('@/features/auth/sign-out', () => ({ signOutToLogin: () => signOutToLogin() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const view = (initial = accountFreeFixture) => render(<Wrap initial={initial}><AccountShell><p>conteudo</p></AccountShell></Wrap>);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  segment = 'perfil';
});

describe('AccountShell', () => {
  it('hero shows name, plan and completeness; subnav marks the current section', () => {
    view();
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Souza' })).toBeVisible();
    expect(screen.getByText('Perfil 60% completo')).toBeVisible();
    expect(screen.getByText('4 dias seguidos')).toBeVisible();
    expect(screen.getByRole('link', { name: /Perfil/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Plano e uso/ })).not.toHaveAttribute('aria-current');
  });

  it('pending chips are buttons: photo opens the dialog, reminder goes to preferences, both tracked', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Ligar lembrete' }));
    expect(push).toHaveBeenCalledWith('/app/conta/preferencias');
    expect(track).toHaveBeenCalledWith('completeness_chip_clicked', { item: 'reminder' });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(screen.getByRole('dialog', { name: 'Foto de perfil' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Definir objetivo' })).toBeNull(); // goal is done
  });

  it('100% shows "Perfil completo" and no pending chips', () => {
    view(accountProFixture);
    expect(screen.getByText('Perfil completo')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Adicionar|Ligar/ })).toBeNull();
  });

  it('scheduled deletion: banner with the date, cancel posts and refreshes', async () => {
    api.mockResolvedValue({ ok: true, data: accountFreeFixture });
    view(accountDeletionFixture);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar exclusão' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/deletion/cancel', { method: 'POST' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar exclusão' })).toBeNull());
    expect(track).toHaveBeenCalledWith('deletion_canceled', {});
  });

  it('offline disables actions and says so', () => {
    view(accountDeletionFixture);
    window.dispatchEvent(new Event('offline'));
    return waitFor(() => {
      expect(screen.getByText('Sem conexão. Reconecte para alterar sua conta.')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Cancelar exclusão' })).toBeDisabled();
    });
  });

  it('has "Sair da conta" at the end of the subnav', () => {
    view();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
  });

  it('Sair da conta signs out from the browser; a refusal keeps the user here with a toast (G14 D-585)', async () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(signOutToLogin).toHaveBeenCalledTimes(1));
    signOutToLogin.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByText('Não conseguimos concluir agora. Tente de novo.')).toBeInTheDocument();
  });
});
