import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AnswerOutput, ChallengeItemPublic, Result } from '@remoa/contracts';
import { graderVerdictFixture, mocks, preview, resetMocks, fixtureUserId } from '@remoa/contracts/mocks';
import { ChallengePanel } from './challenge-panel';
import { ChallengeProvider, useChallenge, type Scope } from './provider';

// user-event is not a dependency of apps/web: a tiny shim over fireEvent covers click/type/keys.
const userEvent = {
  setup: () => ({
    click: async (el: Element) => void fireEvent.click(el),
    type: async (el: Element, v: string) => void fireEvent.change(el, { target: { value: (el as HTMLTextAreaElement).value + v } }),
    keyboard: async (key: string) => void fireEvent.keyDown(document.activeElement ?? document.body, { key: key.replace(/[{}]/g, '') }),
  }),
};
const track = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const onExit = vi.fn();
const onRated = vi.fn();
const BOARD = 'b-panel';
function Harness({ scope }: { scope: Scope }) {
  const ch = useChallenge();
  useEffect(() => ch.ensure(scope), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <ChallengePanel scope={scope} boardId={BOARD} heat={{}} onExit={onExit} onRated={onRated} />;
}
const mount = (scope: Scope = { kind: 'board', boardId: BOARD }) => render(<ChallengeProvider><Harness scope={scope} /></ChallengeProvider>);

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
  shape = (x) => x.slice(0, 3).map((i) => ({ ...i, boardId: BOARD })).map((i, n) => (n === 0 ? { ...i, grading: 'none' as const, options: ['a', 'b', 'c', 'd'] } : text(i)));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ready = () => screen.findByRole('heading', { level: 2 });
const rating = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const suggested = (name: string) => rating(name).getAttribute('data-suggested') === 'true';

const daily: Scope = { kind: 'daily' };
const reveal = () => screen.getByRole('button', { name: 'Revelar resposta' });

describe('ChallengePanel', () => {
  it('board session "Eu respondo": write, reveal, Acertei/Errei with the next interval; no AI call (D-576/D-577)', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans();
    mount();
    await ready();
    expect(screen.getByText('1 de 3')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progresso da sessão' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('challenge_started', expect.objectContaining({ kind: 'board', items: 3 }));
    expect(screen.queryByRole('group', { name: 'Alternativas' })).toBeNull();
    const voz = screen.getByRole('button', { name: /Voz/ });
    expect(voz).toBeDisabled();
    expect(voz).toHaveTextContent('Em breve');

    await user.type(screen.getByLabelText('Sua resposta'), 'disfunção orgânica');
    await user.click(reveal());
    await waitFor(() => expect(screen.getByText('Resposta canônica')).toBeVisible());
    expect(calls.answer![0]).toMatchObject({ inputKind: 'text', text: 'disfunção orgânica' });
    expect(screen.getByText(/disfunção orgânica/, { selector: 'p' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Você acertou?' })).toBeVisible();
    expect(rating('Acertei')).toHaveTextContent(/tecla 2/);
    expect(rating('Errei')).toHaveTextContent(/tecla 1/);
    expect(screen.queryByRole('button', { name: /^Fácil/ })).toBeNull();

    await user.click(rating('Acertei'));
    await waitFor(() => expect(screen.getByText('2 de 3')).toBeVisible());
    expect(calls.rate![0]).toMatchObject({ grade: 'good', overridden: false });
    expect(onRated).toHaveBeenCalled();
  });

  it('nothing written = plain self reveal; keys: Space reveals, 1 = Errei, 2 = Acertei; typing does not fire them', async () => {
    const user = userEvent.setup();
    mount();
    await ready();
    const box = screen.getByLabelText('Sua resposta');
    for (const key of [' ', '1', '2', 'Escape']) fireEvent.keyDown(box, { key });
    expect(calls.answer).toBeUndefined();
    expect(calls.skip).toBeUndefined();
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard(' ');
    await screen.findByRole('button', { name: /^Errei/ });
    expect(calls.answer![0]).toMatchObject({ inputKind: 'self' });
    await user.keyboard('1');
    await waitFor(() => expect(screen.getByText('2 de 3')).toBeVisible());
    expect(calls.rate!.at(-1)).toMatchObject({ grade: 'again' });
    await user.keyboard(' ');
    await screen.findByRole('button', { name: /^Acertei/ });
    await user.keyboard('2');
    await waitFor(() => expect(calls.rate!.at(-1)).toMatchObject({ grade: 'good' }));
  });

  it('Ctrl+Enter inside the textarea reveals', async () => {
    mount();
    await ready();
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'abc' } });
    fireEvent.keyDown(screen.getByLabelText('Sua resposta'), { key: 'Enter', ctrlKey: true });
    await screen.findByRole('button', { name: /^Acertei/ });
    expect(calls.answer![0]).toMatchObject({ inputKind: 'text', text: 'abc' });
  });

  it('daily queue (Revisar hoje) keeps the 4 grades with intervals and 1–4', async () => {
    const user = userEvent.setup();
    mount(daily);
    await ready();
    await user.click(reveal());
    await screen.findByRole('button', { name: /^Bom/ });
    for (const g of ['Não lembrei', 'Difícil', 'Bom', 'Fácil']) expect(rating(g)).toBeEnabled();
    expect(rating('Bom')).toHaveTextContent(/(hoje|dia).*tecla 3/);
    await user.keyboard('4');
    await waitFor(() => expect(calls.rate!.at(-1)).toMatchObject({ grade: 'easy' }));
  });

  it('a verdict (AI sessions, F20) still shows: VerdictBox, suggestion, override and dispute', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans({ verdict: graderVerdictFixture, suggestedGrade: 'hard' });
    mount(daily);
    await ready();
    await user.type(screen.getByLabelText('Sua resposta'), 'x');
    await user.click(reveal());
    const box = (await screen.findByText('Quase lá')).closest('[role="status"]') as HTMLElement;
    expect(within(box).getByText(new RegExp(graderVerdictFixture.matched[0]!))).toBeVisible();
    expect(suggested('Difícil')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Discordo da correção' }));
    await screen.findByText(/Vamos revisar esta correção/);
    expect(track).toHaveBeenCalledWith('answer_disputed', {});
    await user.click(rating('Bom'));
    await waitFor(() => expect(track).toHaveBeenCalledWith('grade_overridden', {}));
  });

  it('gradeLocked: only "Não lembrei" is offered', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans({ verdict: { ...graderVerdictFixture, verdict: 'incorrect', criticalError: true }, suggestedGrade: 'again', gradeLocked: true });
    mount(daily);
    await ready();
    await user.click(reveal());
    await screen.findByText(/Nota travada/);
    for (const g of ['Difícil', 'Bom', 'Fácil']) expect(screen.queryByRole('button', { name: new RegExp(`^${g}`) })).toBeNull();
  });

  it('fallback quota: alert, link and paywall event', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans({ fallback: 'quota' });
    mount(daily);
    await ready();
    await user.click(reveal());
    await screen.findByText(/correções por IA de hoje acabaram/);
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/app/planos?de=ai_quota');
    expect(track).toHaveBeenCalledWith('paywall_viewed', { reason: 'ai_quota' });
  });

  it('AI result: warning, escaped feedback, flag button, fallback notice (G22)', async () => {
    const user = userEvent.setup();
    overrides.answer = async () =>
      ans({
        verdict: { ...graderVerdictFixture, feedback: '<img src=x onerror="window.hacked=1">ok', ai: { status: 'fallback', code: 'provider_error', message: null, callId: 'g-9' } },
        suggestedGrade: 'good',
      });
    mount(daily);
    await ready();
    await user.type(screen.getByLabelText('Sua resposta'), 'x');
    await user.click(reveal());
    await screen.findByText(/correção automática, sem IA/);
    expect(screen.getByText('A IA pode errar. Confira a fonte.')).toBeVisible();
    expect(document.querySelector('script, img[onerror]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Essa correção está errada' })).toBeVisible();
  });

  it('AI answer failure offers "Tentar de novo" and sends again', async () => {
    const user = userEvent.setup();
    shape = (x) => x.slice(0, 3).map((i) => ({ ...i, boardId: BOARD })).map(text);
    let n = 0;
    overrides.start = async (b) => {
      const r = await mocks.startSession(fixtureUserId, b as never);
      return r.ok ? { ok: true, data: { ...r.data, items: shape(r.data.items), options: { gradingMode: 'ai', order: 'flow', answerMode: 'write' } } } : r;
    };
    overrides.answer = async () => (n++ === 0 ? { ok: false, error: { code: 'internal', message: 'boom' } } : ans());
    function WithAi() {
      const ch = useChallenge();
      useEffect(() => ch.ensure({ kind: 'daily' }, { gradingMode: 'ai', order: 'flow', answerMode: 'write' }), []); // eslint-disable-line react-hooks/exhaustive-deps
      return <ChallengePanel scope={{ kind: 'daily' }} boardId={BOARD} heat={{}} onExit={onExit} onRated={onRated} />;
    }
    render(<ChallengeProvider><WithAi /></ChallengeProvider>);
    await ready();
    await user.type(screen.getByLabelText('Sua resposta'), 'minha resposta');
    await user.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.getByText('Resposta canônica')).toBeVisible());
    expect(calls.answer).toHaveLength(2);
  });

  it('skip: Esc skips and moves the item to the end; the 409 limit disables Pular', async () => {
    const user = userEvent.setup();
    mount();
    const first = (await ready()).textContent;
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(first));
    expect(calls.skip).toHaveLength(1);
    overrides.skip = async () => ({ ok: false, error: { code: 'conflict', message: 'skip limit reached' } });
    await user.click(screen.getByRole('button', { name: 'Pular' }));
    await screen.findByText(/já foi pulado duas vezes/);
    expect(screen.getByRole('button', { name: 'Pular' })).toBeDisabled();
  });

  it('summary after the last mark, tracking, and "Mais 5" reuses the chosen options', async () => {
    const user = userEvent.setup();
    const opts = { gradingMode: 'self', order: 'flow', answerMode: 'write' } as const;
    function WithOptions() {
      const ch = useChallenge();
      useEffect(() => ch.ensure({ kind: 'board', boardId: BOARD }, opts), []); // eslint-disable-line react-hooks/exhaustive-deps
      return <ChallengePanel scope={{ kind: 'board', boardId: BOARD }} boardId={BOARD} heat={{}} onExit={onExit} onRated={onRated} />;
    }
    render(<ChallengeProvider><WithOptions /></ChallengeProvider>);
    for (let n = 0; n < 3; n++) {
      await ready();
      await user.click(reveal());
      await user.click(await screen.findByRole('button', { name: n === 0 ? /^Errei/ : /^Acertei/ }));
    }
    await screen.findByRole('heading', { name: 'Sessão concluída' });
    expect(calls.start![0]).toMatchObject({ options: opts });
    expect(screen.getByText('Acertos').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Erros').nextSibling).toHaveTextContent('1');
    expect(track).toHaveBeenCalledWith('challenge_finished', expect.objectContaining({ correct: 2, wrong: 1 }));
    await user.click(screen.getByRole('button', { name: 'Mais 5' }));
    await ready();
    expect(calls.start!.at(-1)).toMatchObject({ kind: 'board', boardId: BOARD, limit: 5, options: opts });
  });

  it('"Sair do desafio" in the summary calls onExit', async () => {
    const user = userEvent.setup();
    shape = (x) => x.slice(0, 1).map((i) => ({ ...i, boardId: BOARD }));
    mount();
    await ready();
    await user.click(reveal());
    await user.click(await screen.findByRole('button', { name: /^Acertei/ }));
    await user.click(await screen.findByRole('button', { name: 'Sair do desafio' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('below the minimum the panel explains and never starts (D-579)', async () => {
    render(<ChallengeProvider><ChallengePanel scope={{ kind: 'board', boardId: BOARD }} boardId={BOARD} heat={{}} onExit={onExit} onRated={onRated} missing={4} /></ChallengeProvider>);
    expect(await screen.findByText(/Faltam 4/)).toBeVisible();
    expect(calls.start).toBeUndefined();
  });

  it('the server 422 challenge_min_cards shows the same explanation', async () => {
    overrides.start = async () => ({ ok: false, error: { code: 'validation', message: 'challenge_min_cards' } });
    mount();
    await screen.findByText('Ainda faltam cards para o desafio');
  });

  it('empty session shows the friendly state', async () => {
    shape = () => [];
    mount();
    await screen.findByText('Nada para revisar agora');
  });

  it('daily queue: an item from another map moves the editor there, keeping the session', async () => {
    shape = (x) => x.slice(0, 2).map((i) => ({ ...i, boardId: 'outro-mapa' }));
    mount(daily);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/app/mapas/outro-mapa?modo=desafio&sessao=diaria', { scroll: false }));
    expect(calls.start![0]).toMatchObject({ kind: 'daily' });
    expect(calls.start![0]!.options).toBeUndefined();
    expect(calls.start).toHaveLength(1);
  });

  it('the canonical answer is not in the DOM nor requested before /answer; it shows after', async () => {
    const user = userEvent.setup();
    overrides.answer = async () => ans({ canonical: 'RESPOSTA-SECRETA' });
    mount();
    await ready();
    expect(document.body.textContent).not.toContain('RESPOSTA-SECRETA');
    await user.type(screen.getByLabelText('Sua resposta'), 'x');
    expect(calls.answer).toBeUndefined(); // typing is not answering
    await user.click(reveal());
    await screen.findByText('RESPOSTA-SECRETA');
  });
});
