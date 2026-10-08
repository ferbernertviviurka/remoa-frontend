import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CardRubricEditor } from './rubric-editor';

const CARD = '00000000-0000-4000-8000-0000000000aa';
const SECRET = 'SECRET_KEY_ZZ';
let reply: { ok: true; data: Record<string, unknown> } | { ok: false; error: { code: string; message: string } };
const calls: Array<{ path: string; init?: RequestInit }> = [];

vi.mock('@/lib/api', () => ({
  api: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return reply;
  }),
}));

const rubric = { essentialPoints: ['Ponto sintético'], acceptedVariants: ['outra forma'], criticalErrors: ['dose errada'], status: 'auto' };

beforeEach(() => {
  calls.length = 0;
  reply = { ok: true, data: { ...rubric, expectedAnswer: SECRET } };
});
afterEach(cleanup);

describe('CardRubricEditor', () => {
  it('shows the points and drops a planted answer', async () => {
    render(<CardRubricEditor cardId={CARD} />);
    expect(await screen.findByDisplayValue('Ponto sintético')).toBeTruthy();
    expect(screen.getByDisplayValue('outra forma')).toBeTruthy();
    expect(screen.getByDisplayValue('dose errada')).toBeTruthy();
    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getByRole('button', { name: 'Salvar rubrica' })).toBeTruthy();
  });

  it('saves the three lists and does not send the answer', async () => {
    render(<CardRubricEditor cardId={CARD} />);
    const box = await screen.findByLabelText('Pontos essenciais');
    fireEvent.change(box, { target: { value: 'Ponto novo' } });
    reply = { ok: true, data: { essentialPoints: ['Ponto novo'], acceptedVariants: ['outra forma'], criticalErrors: ['dose errada'], status: 'edited' } };
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rubrica' }));
    await waitFor(() => expect(screen.getByText('Rubrica salva.')).toBeTruthy());
    const post = calls.find((c) => c.init?.method === 'POST');
    expect(post?.path).toBe(`/v1/challenge-ai/cards/${CARD}/rubric`);
    expect(JSON.parse(String(post?.init?.body))).toEqual({
      essentialPoints: ['Ponto novo'], acceptedVariants: ['outra forma'], criticalErrors: ['dose errada'],
    });
    expect(document.body.textContent).not.toContain(SECRET);
  });

  it('an approved rubric has no save button', async () => {
    reply = { ok: true, data: { ...rubric, status: 'approved' } };
    render(<CardRubricEditor cardId={CARD} />);
    expect(await screen.findByText('Rubrica aprovada. Ela não muda por aqui.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar rubrica' })).toBeNull();
    expect(screen.getByLabelText('Pontos essenciais')).toBeDisabled();
  });
});
