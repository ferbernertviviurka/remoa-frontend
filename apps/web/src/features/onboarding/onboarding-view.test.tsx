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
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clínica Médica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Do meu PDF/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o primeiro mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=pdf&de=onboarding'));
    expect(body(0)).toEqual({ segment: 'y5_6' });
    expect(body(1)).toEqual({ goal: 'enamed_2027_1' });
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
});
