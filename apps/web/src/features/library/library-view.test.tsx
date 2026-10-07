import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { violations } from '../cards/test-utils';
import { LibraryView } from './library-view';
import { ReportButton } from './report-button';
import { PublicSeedList, PublicSeedPage } from './public-seeds';

const api = vi.fn();
const push = vi.fn();
const handle = vi.fn(() => false);
vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ handle, show: () => undefined }) }));

const seed = (o: object) => ({ id: '1', title: 'Sepse', area: 'CM', temporalMark: 'Enamed 2026.2', version: 2, badges: [], contentVersion: '2026.1', cardCount: 90, estimatedMinutes: 135, levels: [1, 2], reviewerName: 'Ana Lima', reviewerCrm: '123456-SP', ...o });

afterEach(() => { cleanup(); api.mockReset(); push.mockReset(); handle.mockReset(); handle.mockReturnValue(false); });

describe('LibraryView', () => {
  it('lists ready maps with stats, reviewer seal, Top 10 badge only where present, and the legal notice', async () => {
    api.mockResolvedValue({ ok: true, data: [seed({ badges: ['top10_enamed'] }), seed({ id: '2', title: 'Pneumonia' })] });
    const { container } = render(<LibraryView />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Sepse' })).toBeVisible();
    expect(screen.getAllByText('Top 10 ENAMED')).toHaveLength(1);
    expect(screen.getAllByText('Revisado por Dr(a). Ana Lima, CRM 123456-SP')).toHaveLength(2);
    expect(screen.getAllByText(/90 cards · ~135 min · Versão 2026.1/)).toHaveLength(2);
    expect(screen.getByText(/Conteúdo educacional\. Não substitui diretriz clínica nem supervisão\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso');
    expect(await violations(container)).toEqual([]);
  });

  it('filters by title and Usar copies, then opens the copy; a quota error goes to the paywall', async () => {
    api.mockImplementation((path: string) => Promise.resolve(path.includes('/copy') ? { ok: true, data: { id: 'c1' } } : { ok: true, data: [seed({}), seed({ id: '2', title: 'Pneumonia' })] }));
    render(<LibraryView />);
    await screen.findByText('Pneumonia');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pneu' } });
    expect(screen.queryByRole('heading', { name: 'Sepse' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Usar este mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/c1'));
    expect(api).toHaveBeenCalledWith('/v1/editorial/copy', expect.objectContaining({ method: 'POST', body: JSON.stringify({ boardId: '2' }) }));
  });

  it('shows the paywall when the plan does not allow the copy', async () => {
    handle.mockReturnValue(true);
    api.mockImplementation((path: string) => Promise.resolve(path.includes('/copy') ? { ok: false, error: { code: 'quota_exceeded', message: 'boards' } } : { ok: true, data: [seed({})] }));
    render(<LibraryView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Usar este mapa' }));
    await waitFor(() => expect(handle).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});

describe('ReportButton', () => {
  it('sends the note for the card to the reviewer queue', async () => {
    api.mockResolvedValue({ ok: true, data: { id: 'q1' } });
    render(<ReportButton cardId="card-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reportar erro' }));
    const send = await screen.findByRole('button', { name: 'Enviar' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('O que está errado?'), { target: { value: 'dose errada' } });
    fireEvent.click(send);
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/editorial/report', expect.objectContaining({ body: JSON.stringify({ cardId: 'card-1', note: 'dose errada' }) })));
    expect(await screen.findByText('Recebido. Um revisor vai analisar este card.')).toBeVisible();
  });
});

describe('public ready maps and didactics', () => {
  const card = { title: 'Choque séptico', front: 'Qual a 1a droga?', back: 'Noradrenalina', sources: [{ doc: 'SSC', local: 'rec 3' }], didactics: { porQue: 'Mantém a perfusão.', macete: { tipo: 'sigla', texto: 'NORA', explicacao: 'Noradrenalina primeiro' }, pegadinha: 'Não é dopamina.', naProva: 'Cai em todo ano.', naDiretriz: { texto: 'Preferir noradrenalina', data: '2026-03-23' } } };
  const pub = { slug: 'sepse', title: 'Sepse', area: 'CM', temporalMark: 'Enamed 2026.2', version: 2, badges: ['top10_enamed'], contentVersion: '2026.1', cardCount: 90, estimatedMinutes: 135, levels: [1], reviewerName: 'Ana Lima', reviewerCrm: '123456-SP' };

  it('public list links to the sample page with badge, reviewer and the legal notice', async () => {
    const { container } = render(<PublicSeedList seeds={[pub]} />);
    expect(screen.getByRole('link', { name: 'Sepse' })).toHaveAttribute('href', '/mapas-prontos/sepse');
    expect(screen.getByText('Top 10 ENAMED')).toBeVisible();
    expect(screen.getByText('Revisado por Dr(a). Ana Lima, CRM 123456-SP')).toBeVisible();
    expect(screen.getByText(/Conteúdo educacional\./)).toBeVisible();
    expect(await violations(container)).toEqual([]);
  });

  it('public sample page shows the didactics per card and sends "Usar este mapa" to sign-up then the library', async () => {
    const { container } = render(<PublicSeedPage seed={{ ...pub, sample: [card] }} />);
    expect(screen.getByRole('link', { name: 'Usar este mapa' })).toHaveAttribute('href', `/cadastro?next=${encodeURIComponent('/app/mapas?aba=biblioteca')}`);
    expect(screen.getByText(/Mantém a perfusão\./)).toBeVisible();
    expect(screen.getByText(/NORA\. Noradrenalina primeiro/)).toBeVisible();
    expect(screen.getByText(/Não é dopamina\./)).toBeVisible();
    expect(screen.getByText(/Cai em todo ano\./)).toBeVisible();
    expect(screen.getByText(/Preferir noradrenalina/)).toBeVisible();
    expect(screen.getByText(/Fontes: SSC rec 3/)).toBeVisible();
    expect(await violations(container)).toEqual([]);
  });
});
