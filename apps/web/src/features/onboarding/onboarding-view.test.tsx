import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingView } from './onboarding-view';

const push = vi.fn();
vi.stubGlobal('location', { assign: push });
const api = vi.fn();
const track = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const ok = { ok: true, data: {} };
const body = (i: number) => JSON.parse((api.mock.calls[i]![1] as RequestInit).body as string);

describe('OnboardingView', () => {
  it('saves each answer, tracks the steps and hands off to Novo mapa with ?de=onboarding', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '5º–6º ano' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enamed 2027.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'USP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clínica Médica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Do meu PDF/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o primeiro mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=pdf&de=onboarding'));
    expect(body(0)).toEqual({ segment: 'y5_6' });
    expect(body(1)).toEqual({ goals: ['enamed_2027_1', 'residencia_usp'] });
    expect(body(2)).toEqual({ area: 'CM' });
    expect(body(3)).toEqual({ startPath: 'pdf' });
    expect(api.mock.calls[4]![0]).toBe('/v1/onboarding/complete');
    expect(track.mock.calls.map((c) => c[0])).toEqual(['onboarding_step', 'onboarding_step', 'onboarding_step', 'onboarding_completed']);
    expect(track).toHaveBeenLastCalledWith('onboarding_completed', { path: 'pdf' });
  });

  it('"Pular por enquanto" completes without answers and goes to Hoje', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pular por enquanto' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/hoje'));
    expect(api).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_completed', { path: 'skipped' });
  });

  it('a failed save stays on the step with an alert', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    render(<OnboardingView initial={{ answers: { segment: 'y5_6' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos salvar agora');
    expect(push).not.toHaveBeenCalled();
  });

  it('objetivos: até 5; no limite os não marcados travam e desmarcar libera', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: { segment: 'y5_6' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    for (const n of ['Enamed 2027.1', 'Enamed 2027.2', 'Enamed 2028.1', 'Enamed 2028.2', 'ENARE']) fireEvent.click(await screen.findByRole('button', { name: n }));
    expect(screen.getByText('5 de 5 escolhidos')).toBeVisible();
    expect(screen.getByRole('button', { name: 'USP' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ENARE' }));
    expect(screen.getByRole('button', { name: 'USP' })).toBeEnabled();
  });

  it('áreas: todas aparecem, só Clínica Médica seleciona; as outras trazem "Em breve" e ficam desabilitadas', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: { segment: 'y5_6', goals: ['enamed_2027_1'] } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    for (const n of ['Cirurgia', 'Ginecologia e Obstetrícia', 'Pediatria', 'Medicina Preventiva e Saúde Coletiva']) {
      const b = await screen.findByRole('button', { name: new RegExp(`^${n}`) });
      expect(b).toBeDisabled();
      expect(b).toHaveTextContent('Em breve');
    }
    expect(screen.getByRole('button', { name: 'Clínica Médica' })).toBeEnabled();
  });

  it('"Em branco" vai direto ao passo 2 da criação de mapa', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: { segment: 'y5_6', goals: ['enamed_2027_1'], area: 'CM' } }} />);
    for (let i = 0; i < 3; i++) fireEvent.click(await screen.findAllByRole('button', { name: 'Continuar' }).then((b) => b[0]!));
    fireEvent.click(await screen.findByRole('button', { name: /Em branco/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o primeiro mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=blank&de=onboarding'));
  });

  it('conta sem tipo de usuário (Google): primeiro passo pergunta e grava no perfil', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} needsUserType />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conte quem você é');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Professor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ userType: 'professor' }) }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Em que momento');
  });
});
