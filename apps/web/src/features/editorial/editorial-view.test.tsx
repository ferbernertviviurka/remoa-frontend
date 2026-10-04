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
