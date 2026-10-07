import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CHALLENGE_OPTION_AVAILABLE } from '@remoa/contracts';
import { ChallengeSetupDialog } from './setup-dialog';

const push = vi.fn();
const api = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));

const BOARD = '3f2b8c1e-9d4a-4c55-8a10-0b6f2d7e1a11';
const CARD = '7a1c4e92-5b3d-4f08-9c21-1d8e6a0b3f22';
const SESSION = '9e5d2a40-1c7b-4b36-8f64-2a3c5d7e9b33';

const open = (props: Partial<Parameters<typeof ChallengeSetupDialog>[0]> = {}) => {
  const onStart = vi.fn();
  const onOpenChange = vi.fn();
  render(<ChallengeSetupDialog open onOpenChange={onOpenChange} onStart={onStart} boardId={BOARD} {...props} />);
  return { onStart, onOpenChange };
};
const aiRow = () => screen.getByRole('button', { name: /IA responde/ });
const cost = (n: number) => `Esta sessão usa ${n} correções de IA`;

beforeEach(() => {
  api.mockResolvedValue({ ok: true, data: { id: SESSION } });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('ChallengeSetupDialog: desafio com IA (F32)', () => {
  it('keeps the old flag false: the AI row works here without turning it on', () => {
    expect(CHALLENGE_OPTION_AVAILABLE.gradingMode.ai).toBe(false);
    open();
    expect(aiRow()).toBeEnabled();
  });

  it('self mode shows no AI fields and no cost line', () => {
    open();
    expect(screen.queryByText(/correções de IA/)).toBeNull();
    expect(screen.getByRole('button', { name: /Aleatório/ })).toBeInTheDocument();
  });

  it('selecting "IA responde" reveals the cost line before the start', () => {
    open();
    fireEvent.click(aiRow());
    expect(screen.getByText(cost(5))).toBeInTheDocument(); // 10 questions, generated, mixed type: about half use AI
    expect(screen.queryByRole('button', { name: /Aleatório/ })).toBeNull();
  });

  it('counts only AI-graded items: objective costs 0, discursive costs all, map format counts every card item', () => {
    open();
    fireEvent.click(aiRow());
    fireEvent.click(screen.getByRole('radio', { name: 'Discursiva' }));
    expect(screen.getByText(cost(10))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Objetiva (A a D)' }));
    expect(screen.getByText(cost(0))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '15' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Perguntas do mapa, a IA corrige' }));
    expect(screen.queryByRole('radio', { name: 'Discursiva' })).toBeNull(); // type only for generated
    expect(screen.getByText(cost(15))).toBeInTheDocument();
  });

  it('POSTs the config to /v1/challenge-ai/sessions and goes to the AI session; never starts the old one', async () => {
    const secret = 'gabarito-secreto-nao-mostrar';
    api.mockResolvedValue({
      ok: true,
      data: {
        id: SESSION,
        total: 1,
        position: 0,
        current: { id: '11111111-1111-4111-8111-111111111111', position: 0, type: 'discursive', stem: 'Defina sepse.', correct_key: secret },
      },
    });
    const { onStart } = open();
    fireEvent.click(aiRow());
    fireEvent.click(screen.getByRole('radio', { name: 'Difícil' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Discursiva' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Corrigir no final' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Simulado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/app/mapas/${BOARD}/desafio-ia?session=${SESSION}`));
    expect(api).toHaveBeenCalledTimes(1);
    const [path, init] = api.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/v1/challenge-ai/sessions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      boardId: BOARD,
      scope: { kind: 'board' },
      format: 'generated',
      n: 10,
      difficulty: 'hard',
      questionType: 'discursive',
      grading: 'end',
      timerSec: null,
      preset: 'mock',
    });
    expect(onStart).not.toHaveBeenCalled();
    const stored = sessionStorage.getItem(`remoa:challenge-ai:${SESSION}`);
    expect(stored).toContain('Defina sepse.');
    expect(stored).not.toContain(secret);
  });

  it('format "map" sends no questionType', async () => {
    open();
    fireEvent.click(aiRow());
    fireEvent.click(screen.getByRole('radio', { name: 'Perguntas do mapa, a IA corrige' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(JSON.parse((api.mock.calls[0] as [string, RequestInit])[1].body as string)).not.toHaveProperty('questionType');
  });

  it('from a card the scope is locked to it and the count goes from 1 to 5', async () => {
    open({ cardId: CARD });
    fireEvent.click(aiRow());
    expect(screen.getByText('Este card')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'O mapa inteiro' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '10' })).toBeNull();
    for (const n of ['1', '2', '3', '4', '5']) expect(screen.getByRole('radio', { name: n })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    await waitFor(() => expect(api).toHaveBeenCalled());
    const body = JSON.parse((api.mock.calls[0] as [string, RequestInit])[1].body as string) as { scope: unknown; n: number };
    expect(body.scope).toEqual({ kind: 'card', cardId: CARD });
    expect(body.n).toBe(4);
  });

  it('shows an error and stays on the dialog when the API refuses', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'quota', message: 'x' } });
    open();
    fireEvent.click(aiRow());
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe('ChallengeSetupDialog: Eu respondo (inalterado)', () => {
  it('starts the old challenge with the chosen order and never calls the AI endpoint', () => {
    const { onStart } = open({ hasTrail: true });
    fireEvent.click(screen.getByRole('button', { name: /Seguindo o fluxo das setas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    expect(onStart).toHaveBeenCalledWith({ gradingMode: 'self', order: 'flow', answerMode: 'write' }, 'trail');
    expect(api).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('switching back from the AI row to self hides the AI fields and starts the old way', () => {
    const { onStart } = open();
    fireEvent.click(aiRow());
    fireEvent.click(screen.getByRole('button', { name: /Eu respondo/ }));
    expect(screen.queryByText(/correções de IA/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Começar desafio' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(api).not.toHaveBeenCalled();
  });

  it('without a board the AI row stays "Em breve" (nothing to send)', () => {
    open({ boardId: undefined });
    expect(aiRow()).toBeDisabled();
  });
});
