import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EditorialView } from './editorial-view';

const api = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }));

afterEach(() => {
  cleanup();
  api.mockReset();
});

function ready() {
  api.mockImplementation((path: string) => {
    if (String(path).startsWith('/v1/editorial/queue')) {
      return Promise.resolve({ ok: true, data: { items: [], total: 0, boards: [], reviewer: { name: 'Revisor', crm: null } } });
    }
    if (path === '/v1/editorial/drafts') return Promise.resolve({ ok: true, data: [{ id: 'board-1', title: 'Sepse' }] });
    if (path === '/v1/editorial/metrics') return Promise.resolve({ ok: true, data: { submitted: 0, overridden: 0, agreement: null } });
    if (path === '/v1/editorial/publish') return Promise.resolve({ ok: true, data: { version: 2 } });
    return Promise.resolve({ ok: false, error: { code: 'internal', message: 'x' } });
  });
}

describe('EditorialView publish', () => {
  it('publishes the edition text and the temporal mark, not the review note', async () => {
    ready();
    render(<EditorialView />);
    expect(await screen.findByRole('button', { name: 'Publicar versão' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'pedir ajuste neste card' } });
    fireEvent.change(screen.getByLabelText('O que mudou nesta edição'), { target: { value: 'Pacote da primeira hora' } });
    fireEvent.change(screen.getByLabelText('Marco temporal'), { target: { value: 'Enamed 2027.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar versão' }));
    const publish = api.mock.calls.find((call) => call[0] === '/v1/editorial/publish');
    expect(publish?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ boardId: 'board-1', changelog: 'Pacote da primeira hora', temporalMark: 'Enamed 2027.1' }),
    });
  });

  it('does not publish when the temporal mark is empty', async () => {
    ready();
    render(<EditorialView />);
    expect(await screen.findByRole('button', { name: 'Publicar versão' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Marco temporal'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar versão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o marco temporal da edição.');
    expect(api.mock.calls.some((call) => call[0] === '/v1/editorial/publish')).toBe(false);
  });
});

const item = { id: 'ri1', cardId: 'c1', boardId: 'b1', title: 'Card A', front: 'F', back: 'B', source: null, points: [{ text: 'p', essential: true }], previousPoints: [], status: 'pending', flagSource: 'draft', note: null, answerText: null, verdict: null, feedback: null, criticalError: false };

function withAction(path: string, error: { code: string; message: string }, queueTotal = 1) {
  api.mockImplementation((p: string) => {
    if (String(p).startsWith('/v1/editorial/queue')) return Promise.resolve({ ok: true, data: { items: [item], total: queueTotal, boards: [], reviewer: { name: 'R', crm: null } } });
    if (p === '/v1/editorial/drafts') return Promise.resolve({ ok: true, data: [{ id: 'board-1', title: 'Sepse' }] });
    if (p === '/v1/editorial/metrics') return Promise.resolve({ ok: true, data: { submitted: 0, overridden: 0, agreement: null } });
    if (p === path) return Promise.resolve({ ok: false, error });
    return Promise.resolve({ ok: false, error: { code: 'internal', message: 'x' } });
  });
}

describe('EditorialView rule 6 responses', () => {
  it('403 for admin on decide says only the medical reviewer signs', async () => {
    withAction('/v1/editorial/decide', { code: 'forbidden', message: 'reviewer only' });
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Só o revisor médico assina.');
  });

  it('403 for admin on publish and dispute uses the same message', async () => {
    withAction('/v1/editorial/publish', { code: 'forbidden', message: 'reviewer only' });
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar versão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Só o revisor médico assina.');
    cleanup();
    withAction('/v1/editorial/dispute', { code: 'forbidden', message: 'reviewer only' });
    api.mockImplementation((p: string) => {
      if (String(p).startsWith('/v1/editorial/queue')) return Promise.resolve({ ok: true, data: { items: [{ ...item, flagSource: 'user_disagree' }], total: 1, boards: [], reviewer: { name: 'R', crm: null } } });
      if (p === '/v1/editorial/dispute') return Promise.resolve({ ok: false, error: { code: 'forbidden', message: 'reviewer only' } });
      return Promise.resolve({ ok: true, data: [] });
    });
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rubrica estava certa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Só o revisor médico assina.');
  });

  it('422 reviewer_crm_required asks for the CRM with a link to the field', async () => {
    withAction('/v1/editorial/decide', { code: 'validation', message: 'reviewer_crm_required' });
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu CRM para assinar decisões.');
    expect(screen.getByRole('link', { name: 'Informar CRM' })).toHaveAttribute('href', '#editorial-crm');
  });

  it('409 says the item changed and reloads the queue', async () => {
    withAction('/v1/editorial/decide', { code: 'conflict', message: 'already decided' });
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('já foi decidido');
    const queueCalls = api.mock.calls.filter((c) => String(c[0]).startsWith('/v1/editorial/queue'));
    expect(queueCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('CRM form 422 shows the expected format', async () => {
    withAction('/v1/editorial/crm', { code: 'validation', message: 'crm' });
    render(<EditorialView />);
    fireEvent.change(await screen.findByLabelText('CRM'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar CRM' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('123456-SP');
  });

  it('publish blocked shows how many cards are still draft', async () => {
    withAction('/v1/editorial/publish', { code: 'validation', message: 'cards still draft' }, 3);
    render(<EditorialView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar versão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('3 cards em rascunho');
  });
});
