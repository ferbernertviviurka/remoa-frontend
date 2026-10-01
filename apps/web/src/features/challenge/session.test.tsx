import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AnswerOutput, ChallengeItemPublic, Result } from '@remoa/contracts';
import { graderVerdictFixture, mocks, preview, resetMocks, fixtureUserId } from '@remoa/contracts/mocks';
import { ChallengeSession } from './session';

// user-event is not a dependency of apps/web: a tiny shim over fireEvent covers click/type/keys.
const userEvent = {
  setup: () => ({
    click: async (el: Element) => void fireEvent.click(el),
    type: async (el: Element, v: string) => void fireEvent.change(el, { target: { value: (el as HTMLTextAreaElement).value + v } }),
    keyboard: async (key: string) => void fireEvent.keyDown(document.activeElement ?? document.body, { key: key.replace(/[{}]/g, '') }),
  }),
};
const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

type Body = Record<string, unknown>;
const calls: Record<string, Body[]> = {};
let overrides: Record<string, (b: Body) => Promise<Result<unknown>>> = {};
let shape: (items: ChallengeItemPublic[]) => ChallengeItemPublic[] = (x) => x;

// Routes /v1/challenge/<verb> to the contract mocks, so the client sees real contract shapes.
const route = async (path: string, init: RequestInit) => {
  const verb = path.split('/').pop()!;
  const body = JSON.parse(String(init.body)) as Body;
  (calls[verb] ??= []).push(body);
  if (overrides[verb]) return overrides[verb](body);
  const u = fixtureUserId;
  switch (verb) {
    case 'start': {
      const r = await mocks.startSession(u, body as never);
      return r.ok ? { ok: true, data: { ...r.data, items: shape(r.data.items) } } : r;
    }
    case 'answer':
      return mocks.answer(u, body as never);
    case 'rate':
      return mocks.rate(u, body as never);
    case 'dispute':
      return mocks.dispute(u, body as never);
    case 'skip':
      return mocks.skip(u, body as never);
    default:
      return mocks.finishSession(u, body.sessionId as string);
  }
};
vi.mock('@/lib/api', () => ({ api: (path: string, init: RequestInit) => route(path, init) }));

const ans = (p: Partial<AnswerOutput> = {}): Result<AnswerOutput> => ({
  ok: true,
  data: { canonical: 'Resposta canônica', verdict: null, suggestedGrade: null, gradeLocked: false, fallback: null, preview: preview(null, new Date()), ...p },
});
const text = (i: ChallengeItemPublic): ChallengeItemPublic => ({ ...i, grading: 'rubric_own', options: undefined });

beforeEach(() => {
  resetMocks();
  for (const k of Object.keys(calls)) delete calls[k];
  overrides = {};
  shape = (x) => x.slice(0, 3).map((i, n) => (n === 0 ? { ...i, grading: 'none' as const, options: ['a', 'b', 'c', 'd'] } : text(i)));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ready = () => screen.findByRole('heading', { level: 2 });
const rating = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('ChallengeSession', () => {
  it('self flow: reveal shows canonical and 4 ratings with intervals, rating moves to the next item', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans();
    render(<ChallengeSession kind="daily" />);
    await ready();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sua revisão de hoje');
    expect(screen.getByText('1 de 3')).toBeVisible();
    expect(screen.getByText('Sem rubrica aprovada: autoavaliação')).toBeVisible();
    expect(track).toHaveBeenCalledWith('challenge_started', expect.objectContaining({ kind: 'daily', items: 3 }));

    await user.click(screen.getByRole('button', { name: 'Revelar resposta' }));
    await waitFor(() => expect(screen.getByText('Resposta canônica')).toBeVisible());
    expect(calls.answer![0]).toMatchObject({ inputKind: 'self' });
    expect(calls.answer![0]!.durationMs).toBeTypeOf('number');
    for (const g of ['Não lembrei', 'Difícil', 'Bom', 'Fácil']) expect(rating(g)).toBeEnabled();
    expect(rating('Bom')).toHaveTextContent(/Bom.*(hoje|dia)/);
    expect(track).toHaveBeenCalledWith('answer_submitted', expect.objectContaining({ inputKind: 'self', verdict: null }));

    await user.click(rating('Bom'));
    await waitFor(() => expect(screen.getByText('2 de 3')).toBeVisible());
    expect(calls.rate![0]).toMatchObject({ grade: 'good', overridden: false });
  });

  it('mcq flow: suggested grade comes pre-selected', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans({ suggestedGrade: 'good' });
    render(<ChallengeSession kind="daily" />);
    await ready();
    await user.click(screen.getAllByRole('radio')[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(rating('Bom')).toHaveAttribute('aria-pressed', 'true'));
    expect(calls.answer![0]).toMatchObject({ inputKind: 'mcq', optionIndex: 0 });
    expect(rating('Fácil')).toHaveAttribute('aria-pressed', 'false');
  });

  async function toTextItem(user: ReturnType<typeof userEvent.setup>) {
    render(<ChallengeSession kind="daily" />);
    await ready();
    await user.click(screen.getByRole('button', { name: 'Revelar resposta' })); // item 0 is self-only
    await user.click(await screen.findByRole('button', { name: /^Bom/ }));
    await waitFor(() => expect(screen.getByText('2 de 3')).toBeVisible());
  }
  const answerText = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Sua resposta'), 'disfunção orgânica');
    await user.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
  };

  it('text flow: VerdictBox lists matched/missing, rubrica sua, override fires grade_overridden', async () => {
    const user = userEvent.setup();
    overrides.answer = async (b) => (b.inputKind === 'text' ? ans({ verdict: graderVerdictFixture, suggestedGrade: 'hard' }) : mocks.answer(fixtureUserId, b as never));
    await toTextItem(user);
    await answerText(user);
    const box = await screen.findByText('Quase lá');
    const status = box.closest('[role="status"]') as HTMLElement;
    expect(within(status).getByText(graderVerdictFixture.matched[0]!)).toBeVisible();
    expect(within(status).getByText(graderVerdictFixture.missing[0]!)).toBeVisible();
    expect(within(status).getByText('Rubrica sua')).toBeVisible();
    expect(rating('Difícil')).toHaveAttribute('aria-pressed', 'true');
    expect(calls.answer!.at(-1)).toMatchObject({ inputKind: 'text', text: 'disfunção orgânica' });

    await user.click(rating('Bom'));
    await waitFor(() => expect(track).toHaveBeenCalledWith('grade_overridden', {}));
    expect(calls.rate!.at(-1)).toMatchObject({ grade: 'good', overridden: true });
  });

  it('gradeLocked: only "Não lembrei" is enabled, with an explanation', async () => {
    const user = userEvent.setup();
    overrides.answer = async (b) =>
      b.inputKind === 'text'
        ? ans({ verdict: { ...graderVerdictFixture, verdict: 'incorrect', criticalError: true }, suggestedGrade: 'again', gradeLocked: true })
        : mocks.answer(fixtureUserId, b as never);
    await toTextItem(user);
    await answerText(user);
    await screen.findByText(/Nota travada/);
    expect(rating('Não lembrei')).toBeEnabled();
    for (const g of ['Difícil', 'Bom', 'Fácil']) expect(rating(g)).toBeDisabled();
  });

  it.each([
    ['no_rubric', /Sem rubrica aprovada para corrigir/],
    ['grader_error', /correção automática falhou/],
    ['quota', /correções por IA de hoje acabaram/],
  ] as const)('fallback %s: alert + self-rating', async (fallback, msg) => {
    const user = userEvent.setup();
    overrides.answer = async (b) => (b.inputKind === 'text' ? ans({ fallback }) : mocks.answer(fixtureUserId, b as never));
    await toTextItem(user);
    await answerText(user);
    await screen.findByText(msg);
    expect(rating('Bom')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Discordo da correção' })).toBeNull();
    if (fallback === 'quota') {
      expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/conta');
      expect(track).toHaveBeenCalledWith('paywall_viewed', { reason: 'ai_quota' });
    } else expect(track).not.toHaveBeenCalledWith('paywall_viewed', expect.anything());
  });

  it('dispute: posts and confirms', async () => {
    const user = userEvent.setup();
    overrides.answer = async (b) => (b.inputKind === 'text' ? ans({ verdict: graderVerdictFixture, suggestedGrade: 'hard' }) : mocks.answer(fixtureUserId, b as never));
    await toTextItem(user);
    await answerText(user);
    await user.click(await screen.findByRole('button', { name: 'Discordo da correção' }));
    await screen.findByText(/Vamos revisar esta correção/);
    expect(calls.dispute).toHaveLength(1);
    expect(track).toHaveBeenCalledWith('answer_disputed', {});
  });

  it('skip: Esc skips and moves the item to the end; the 409 limit disables Pular', async () => {
    const user = userEvent.setup();
    render(<ChallengeSession kind="daily" />);
    const first = (await ready()).textContent;
    await user.keyboard('{Escape}');
    await waitFor(() => expect((screen.getByRole('heading', { level: 2 })).textContent).not.toBe(first));
    expect(calls.skip).toHaveLength(1);
    overrides.skip = async () => ({ ok: false, error: { code: 'conflict', message: 'skip limit reached' } });
    await user.click(screen.getByRole('button', { name: 'Pular' }));
    await screen.findByText(/já foi pulado duas vezes/);
    expect(screen.getByRole('button', { name: 'Pular' })).toBeDisabled();
  });

  it('shortcuts: Enter reveals, 1-4 grade; typing in the textarea does not fire them', async () => {
    const user = userEvent.setup();
    await toTextItem(user);
    const box = screen.getByLabelText('Sua resposta');
    fireEvent.change(box, { target: { value: '3' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.keyDown(box, { key: 'Escape' });
    fireEvent.keyDown(box, { key: '3' });
    expect(calls.answer).toHaveLength(1); // only item 0's reveal
    expect(calls.skip).toBeUndefined();
    fireEvent.change(box, { target: { value: '' } });
    screen.getByRole('heading', { level: 2 }).focus();
    await user.keyboard('{Enter}'); // empty text -> reveal
    await screen.findByRole('button', { name: /^Fácil/ });
    await user.keyboard('4');
    await waitFor(() => expect(screen.getByText('3 de 3')).toBeVisible());
    expect(calls.rate!.at(-1)).toMatchObject({ grade: 'easy' });
  });

  it('Ctrl+Enter inside the textarea corrects the answer', async () => {
    const user = userEvent.setup();
    overrides.answer = async (b) => (b.inputKind === 'text' ? ans({ verdict: graderVerdictFixture, suggestedGrade: 'good' }) : mocks.answer(fixtureUserId, b as never));
    await toTextItem(user);
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'abc' } });
    fireEvent.keyDown(screen.getByLabelText('Sua resposta'), { key: 'Enter', ctrlKey: true });
    await screen.findByText('Quase lá');
  });

  it('summary after the last rating, tracking, and "Mais 5" starts a 5-item session', async () => {
    const user = userEvent.setup();
    render(<ChallengeSession kind="daily" />);
    for (let n = 0; n < 3; n++) {
      await ready();
      await user.click(screen.getByRole('button', { name: 'Revelar resposta' }));
      await user.click(await screen.findByRole('button', { name: n === 0 ? /^Não lembrei/ : /^Bom/ }));
    }
    await screen.findByRole('heading', { name: 'Sessão concluída' });
    expect(screen.getByText('Acertos').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Erros').nextSibling).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Abrir no mapa/ })).toHaveAttribute('href', expect.stringMatching(/^\/mapas\//));
    expect(screen.getByRole('link', { name: 'Voltar para Revisar hoje' })).toHaveAttribute('href', '/revisar');
    expect(track).toHaveBeenCalledWith('challenge_finished', expect.objectContaining({ correct: 2, wrong: 1 }));

    await user.click(screen.getByRole('button', { name: 'Mais 5' }));
    await ready();
    expect(calls.start!.at(-1)).toMatchObject({ kind: 'daily', limit: 5 });
  });

  it('empty session shows the friendly state', async () => {
    shape = () => [];
    render(<ChallengeSession kind="daily" />);
    await screen.findByText('Nada para revisar agora');
  });

  it('board session sends boardId and uses the board title', async () => {
    render(<ChallengeSession kind="board" boardId="b1" boardTitle="Sepse" />);
    await ready();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Desafiar este mapa');
    expect(screen.getByText('Sepse')).toBeVisible();
    expect(calls.start![0]).toMatchObject({ kind: 'board', boardId: 'b1' });
  });
});
