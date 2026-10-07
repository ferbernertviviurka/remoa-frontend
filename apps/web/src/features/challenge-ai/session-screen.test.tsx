import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(calls[1]!.url).toContain(`/v1/challenge-ai/attempts/${ATTEMPT}/dispute`);
    expect(calls[1]!.body).toEqual({ attemptId: ATTEMPT });
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
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.body).toMatchObject({ answer: { kind: 'order', stepIds: ['s2', 's1', 's3'] } });
  });

  it('occlusion: masks without labels; the answer is a label', async () => {
    mount(start({ id: ITEM, position: 0, type: 'occlusion', stem: 'Nomeie a região.', assetId: BOARD, maskId: 'm1', masks: [{ id: 'm1', label: SECRET, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }] }));
    expect(screen.getByRole('img', { name: 'Imagem com regiões cobertas' })).toBeVisible();
    assertNoSecret();
    fireEvent.change(screen.getByRole('textbox', { name: 'Sua resposta' }), { target: { value: 'baço' } });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    await waitFor(() => expect(calls).toHaveLength(1));
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

  it('full screen: fixed layer with min height 100dvh and an exit link to the map', () => {
    mount(start(objective));
    const link = screen.getByRole('link', { name: 'Sair do desafio' });
    expect(link).toHaveAttribute('href', `/app/mapas/${BOARD}`);
    expect(document.querySelector('.min-h-\\[100dvh\\]')).not.toBeNull();
  });
});
