import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { rememberGenerationNotice } from './start-ai';
import { SESSION_STORAGE_PREFIX, SessionScreen, rememberChallengeAiSession, toAnswerResult, toPublicItem } from './session-screen';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }));
vi.mock('@/features/cards/upload', () => ({ useAsset: () => ({ urls: { w800: '/img.webp' } }) }));

const SECRET = 'GABARITO-SECRETO-7f3a';
const SESSION = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const ATTEMPT = '33333333-3333-4333-8333-333333333333';
const BOARD = '44444444-4444-4444-8444-444444444444';

const leaky = { correct_key: SECRET, correctKey: SECRET, expected_answer: SECRET, expectedAnswer: SECRET, referenceRef: SECRET, reference_ref: SECRET, rubric: SECRET, keyPoints: [SECRET] };

const objective = {
  id: ITEM,
  position: 0,
  type: 'objective',
  stem: 'Qual o primeiro passo na sepse?',
  alternatives: [
    { key: 'A', text: 'Lactato', ...leaky },
    { key: 'B', text: 'Hemoculturas' },
    { key: 'C', text: 'Alta' },
    { key: 'D', text: 'Observar' },
  ],
  ...leaky,
};
const start = (current: unknown, extra: Record<string, unknown> = {}) => ({
  id: SESSION,
  boardId: BOARD,
  format: 'generated',
  status: 'active',
  total: 5,
  position: 0,
  expiresAt: '2026-10-07T12:00:00.000Z',
  aiUnits: 3,
  current,
  ...leaky,
  ...extra,
});
const verdict = (p: Record<string, unknown> = {}) => ({
  attemptId: ATTEMPT,
  attemptNo: 1,
  verdict: 'incorrect',
  gradedBy: 'deterministic',
  rating: 'again',
  feedback: 'Reveja a ordem das condutas.',
  hint: null,
  canRetry: false,
  manipulation: false,
  ...leaky,
  ...p,
});

type Call = { url: string; body: Record<string, unknown> };
let calls: Call[] = [];
let reply: (url: string) => { status: number; body: unknown } = () => ({ status: 200, body: { ok: true, data: verdict() } });

beforeEach(() => {
  calls = [];
  reply = () => ({ status: 200, body: { ok: true, data: verdict() } });
  sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {} });
    const r = reply(String(url));
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = (initial?: unknown) => render(<SessionScreen sessionId={SESSION} boardId={BOARD} initial={initial} />);
const assertNoSecret = () => {
  expect(document.body.textContent ?? '').not.toContain(SECRET);
  expect(document.body.innerHTML).not.toContain(SECRET);
};
const status = () => screen.getAllByRole('status').find((el) => el.getAttribute('aria-live') === 'polite')!;

describe('SessionScreen (F32 T7)', () => {
  it('never renders the answer key, before or after answering (FR-36)', async () => {
    mount(start(objective));
    expect(screen.getByRole('heading', { level: 1, name: 'Qual o primeiro passo na sepse?' })).toBeVisible();
    assertNoSecret();

    fireEvent.click(screen.getByRole('radio', { name: /Hemoculturas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    assertNoSecret();
  });

  it('says how many questions the batch actually delivered', () => {
    rememberGenerationNotice(SESSION, { requested: 5, shortfall: 3, stoppedBy: null });
    mount(start(objective));
    expect(screen.getByText('Entregamos 2 de 5 perguntas. As outras não ficaram fiéis ao mapa.')).toBeVisible();
    assertNoSecret();
  });

  it('stores only the sanitized session and item (no reference field)', () => {
    rememberChallengeAiSession(start(objective));
    const stored = sessionStorage.getItem(SESSION_STORAGE_PREFIX + SESSION)!;
    expect(stored).toContain('Hemoculturas');
    expect(stored).not.toContain(SECRET);
    const item = toPublicItem(objective)!;
    expect(JSON.stringify(item)).not.toContain(SECRET);
    expect(Object.keys(item).sort()).toEqual(['alternatives', 'id', 'position', 'stem', 'type']);
    expect(JSON.stringify(toAnswerResult(verdict()))).not.toContain(SECRET);
    expect(toPublicItem({ ...objective, alternatives: [] })).toBeNull();
    expect(toPublicItem('x')).toBeNull();
  });

  it('A–D are real radios; the answer goes to POST /answers and the verdict is announced politely', async () => {
    mount(start(objective));
    const group = screen.getByRole('group', { name: 'Alternativas' });
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Confirmar alternativa' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Hemoculturas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    expect(calls[0]!.url).toContain(`/v1/challenge-ai/sessions/${SESSION}/answers`);
    expect(calls[0]!.body).toMatchObject({ itemId: ITEM, answer: { kind: 'choice', key: 'B' } });
    expect(status()).toHaveAttribute('aria-live', 'polite');
    expect(status()).toHaveTextContent('Reveja a ordem das condutas.');
    expect(screen.getByRole('radio', { name: /Hemoculturas/ })).toBeDisabled();
  });

  it('after a final verdict, the next question comes from GET /sessions/:id', async () => {
    const nextId = '55555555-5555-4555-8555-555555555555';
    mount(start(objective));
    fireEvent.click(screen.getByRole('radio', { name: /Lactato/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    reply = (url) => url.includes('/answers')
      ? { status: 200, body: { ok: true, data: verdict() } }
      : { status: 200, body: { ok: true, data: start({ id: nextId, position: 1, type: 'discursive', stem: 'Cite um critério de sepse.' }, { position: 1 }) } };
    fireEvent.click(screen.getByRole('button', { name: 'Próxima pergunta' }));
    await screen.findByRole('heading', { level: 1, name: 'Cite um critério de sepse.' });
    expect(calls.some((c) => c.url.includes(`/v1/challenge-ai/sessions/${SESSION}`) && !c.url.includes('/answers'))).toBe(true);
    assertNoSecret();
  });

  it('has no self-grading or grade editing control', async () => {
    mount(start(objective));
    fireEvent.click(screen.getByRole('radio', { name: /Lactato/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    for (const name of [/Acertei/, /Errei/, /^Correta/, /^Fácil/, /^Bom/, /Não lembrei/]) expect(screen.queryByRole('button', { name })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('"Não sei" submits dont_know; pending verdict shows without Discordar', async () => {
    reply = () => ({ status: 200, body: { ok: true, data: verdict({ verdict: null, gradedBy: 'pending', rating: null, feedback: null }) } });
    mount(start({ id: ITEM, position: 0, type: 'discursive', stem: 'Defina sepse.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Não sei' }));
    await waitFor(() => expect(status()).toHaveTextContent('Pendente de correção'));
    expect(calls[0]!.body).toMatchObject({ itemId: ITEM, answer: { kind: 'dont_know' } });
    expect(screen.queryByRole('button', { name: 'Discordar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima pergunta' })).toBeVisible();
  });

  it('the last pending answer finishes the session and does not render a planted key', async () => {
    reply = (url) => {
      if (url.includes('/answers')) return { status: 200, body: { ok: true, data: verdict({ verdict: null, gradedBy: 'pending', rating: null, feedback: null }) } };
      if (url.includes('/finish')) {
        return {
          status: 200,
          body: {
            ok: true,
            data: {
              score: { correct: 0, partial: 0, incorrect: 1, pending: 0, unanswered: 0 },
              percent: 0,
              timing: { totalMs: 125_000, avgMs: 42_000 },
              items: [{ itemId: ITEM, stem: 'Defina sepse.', verdict: 'incorrect', feedback: 'Revise o gatilho.', elapsedMs: 42_000, expectedAnswer: SECRET }],
              advice: {
                message: 'Revise os critérios de sepse.',
                cards: [{ cardId: ITEM, title: 'Sepse', reason: 'Base da pergunta.', expectedAnswer: SECRET }],
                maps: [{ boardId: BOARD, title: 'Choque', ready: true, reason: null }],
              },
            },
          },
        };
      }
      return { status: 200, body: { ok: true, data: start(null) } };
    };
    mount(start({ id: ITEM, position: 0, type: 'discursive', stem: 'Defina sepse.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Não sei' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Próxima pergunta' }));
    await screen.findByRole('heading', { level: 1, name: 'Resultado do desafio' });
    expect(screen.getByRole('img', { name: '0% de aproveitamento' })).toBeVisible();
    expect(screen.getByText('Erros').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Tempo total').nextSibling).toHaveTextContent('2 min 05 s');
    expect(screen.getByText('Tempo médio por pergunta').nextSibling).toHaveTextContent('42 s');
    expect(screen.getByText('Revise os critérios de sepse.')).toBeVisible();
    expect(screen.getByRole('link', { name: /Sepse/ })).toHaveAttribute('href', `/app/mapas/${BOARD}?card=${ITEM}`);
    expect(screen.getByRole('link', { name: /Choque/ })).toHaveAttribute('href', `/app/mapas/prontos/${BOARD}`);
    expect(calls.some((c) => c.url.includes('/finish') && c.body && Object.keys(c.body).length === 0)).toBe(true);
    assertNoSecret();
  });

  it('Discordar posts /attempts/:id/dispute and confirms', async () => {
    mount(start({ id: ITEM, position: 0, type: 'discursive', stem: 'Defina sepse.' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Sua resposta' }), { target: { value: 'disfunção orgânica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    expect(calls[0]!.body).toMatchObject({ answer: { kind: 'text', text: 'disfunção orgânica' } });
    reply = () => ({ status: 200, body: { ok: true, data: { attemptId: ATTEMPT } } });
    fireEvent.click(screen.getByRole('button', { name: 'Discordar' }));
    await screen.findByText('Obrigado. Vamos revisar esta correção.');
    expect(calls.at(-1)!.url).toContain(`/v1/challenge-ai/attempts/${ATTEMPT}/dispute`);
    expect(calls.at(-1)!.body).toEqual({ attemptId: ATTEMPT });
  });

  it('bank item: AI label, "can err" notice and Reportar erro; read from sessionStorage', async () => {
    rememberChallengeAiSession(start({ id: ITEM, position: 1, type: 'discursive', stem: 'Defina sepse.', ...leaky }, { position: 1 }));
    mount();
    expect(await screen.findByRole('heading', { level: 1, name: 'Defina sepse.' })).toBeVisible();
    expect(screen.getByText('2 de 5')).toBeVisible();
    expect(screen.getByText('Gerada por IA, no estilo ENAMED. Não é questão oficial.')).toBeVisible();
    expect(screen.getByText('A IA pode errar. Confira a fonte no card.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Reportar erro' }));
    await screen.findByText('Obrigado. Registramos para melhorar a correção.');
    expect(calls[0]!.url).toContain(`/v1/challenge-ai/items/${ITEM}/report`);
    assertNoSecret();
  });

  it('map item: no AI-generated label', () => {
    mount(start({ id: ITEM, position: 0, type: 'hidden_card', stem: 'Qual conceito está oculto?' }));
    expect(screen.queryByText(/Gerada por IA/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reportar erro' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Sua resposta' }).tagName).toBe('TEXTAREA');
  });

  it('next_step: reorders with real selects and sends stepIds', async () => {
    mount(start({ id: ITEM, position: 0, type: 'next_step', stem: 'Ordene.', steps: [{ id: 's1', text: 'Volume' }, { id: 's2', text: 'Culturas' }, { id: 's3', text: 'Antibiótico' }] }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Culturas' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]!.body).toMatchObject({ answer: { kind: 'order', stepIds: ['s2', 's1', 's3'] } });
  });

  it('occlusion: masks without labels; the answer is a label', async () => {
    mount(start({ id: ITEM, position: 0, type: 'occlusion', stem: 'Nomeie a região.', assetId: BOARD, maskId: 'm1', masks: [{ id: 'm1', label: SECRET, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }] }));
    expect(screen.getByRole('img', { name: 'Imagem com regiões cobertas' })).toBeVisible();
    assertNoSecret();
    fireEvent.change(screen.getByRole('textbox', { name: 'Sua resposta' }), { target: { value: 'baço' } });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]!.body).toMatchObject({ answer: { kind: 'label', text: 'baço' } });
  });

  it('canRetry: Tentar de novo unlocks the answer for a second attempt', async () => {
    reply = () => ({ status: 200, body: { ok: true, data: verdict({ verdict: 'partial', canRetry: true, hint: 'Pense na perfusão.' }) } });
    mount(start({ id: ITEM, position: 0, type: 'discursive', stem: 'Defina sepse.' }));
    const box = screen.getByRole('textbox', { name: 'Sua resposta' });
    fireEvent.change(box, { target: { value: 'infecção' } });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await waitFor(() => expect(status()).toHaveTextContent('Parcial'));
    expect(status()).toHaveTextContent('Pense na perfusão.');
    expect(box).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(box).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Corrigir resposta' })).toBeEnabled();
  });

  it('answer error and a payload that does not fit the public schema', async () => {
    reply = () => ({ status: 500, body: { ok: false, error: { code: 'internal', message: 'x' } } });
    mount(start({ id: ITEM, position: 0, type: 'discursive', stem: 'Defina sepse.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Não sei' }));
    await screen.findByText('Não conseguimos registrar a resposta. Tente de novo.');
    cleanup();
    mount(start({ id: ITEM, type: 'objective', stem: 'x', correct_key: SECRET }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não conseguimos montar a sessão.');
    assertNoSecret();
  });

  it('last question: the button says Finalizar desafio and opens the result', async () => {
    reply = (url) => url.includes('/finish')
      ? { status: 200, body: { ok: true, data: { score: { correct: 1, partial: 0, incorrect: 0, pending: 0, unanswered: 0 }, percent: 100, timing: { totalMs: 9_000, avgMs: 9_000 }, items: [], advice: null } } }
      : url.includes('/answers') ? { status: 200, body: { ok: true, data: verdict({ verdict: 'correct', rating: 'good' }) } }
      : { status: 200, body: { ok: true, data: start(null, { position: 5 }) } };
    mount(start(objective, { position: 4 }));
    fireEvent.click(screen.getByRole('radio', { name: /Hemoculturas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    await waitFor(() => expect(status()).toHaveTextContent('Acertou!'));
    expect(screen.queryByRole('button', { name: 'Próxima pergunta' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar desafio' }));
    await screen.findByRole('heading', { level: 1, name: 'Resultado do desafio' });
    expect(screen.getByText('Mandou bem! Continue revisando para manter.')).toBeVisible();
  });

  it('prefetches the next question as soon as the answer is final, and Próxima uses it', async () => {
    const nextId = '55555555-5555-4555-8555-555555555555';
    reply = (url) => url.includes('/answers')
      ? { status: 200, body: { ok: true, data: verdict() } }
      : { status: 200, body: { ok: true, data: start({ id: nextId, position: 1, type: 'discursive', stem: 'Cite um critério de sepse.' }, { position: 1 }) } };
    mount(start(objective));
    fireEvent.click(screen.getByRole('radio', { name: /Lactato/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    const gets = () => calls.filter((c) => c.url.endsWith(`/v1/challenge-ai/sessions/${SESSION}`));
    await waitFor(() => expect(gets()).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Próxima pergunta' }));
    await screen.findByRole('heading', { level: 1, name: 'Cite um critério de sepse.' });
    expect(gets()).toHaveLength(1);
  });

  it('times the question and the session, and sends elapsedMs', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date('2026-10-07T10:00:30.000Z'));
      mount(start(objective, { startedAt: '2026-10-07T10:00:00.000Z' }));
      expect(screen.getByText('No desafio').nextSibling).toHaveTextContent('00:30');
      expect(screen.getByText('Nesta pergunta').nextSibling).toHaveTextContent('00:00');
      act(() => vi.advanceTimersByTime(65_000));
      expect(screen.getByText('Nesta pergunta').nextSibling).toHaveTextContent('01:05');
      expect(screen.getByText('No desafio').nextSibling).toHaveTextContent('01:35');
      fireEvent.click(screen.getByRole('radio', { name: /Lactato/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar alternativa' }));
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() => expect(status()).toHaveTextContent('Incorreta'));
    expect(calls[0]!.body.elapsedMs).toBe(65_000);
  });

  it('full screen: fixed layer with min height 100dvh and an exit link to the map', () => {
    mount(start(objective));
    const link = screen.getByRole('link', { name: 'Sair do desafio' });
    expect(link).toHaveAttribute('href', `/app/mapas/${BOARD}`);
    expect(document.querySelector('.min-h-\\[100dvh\\]')).not.toBeNull();
  });
});
