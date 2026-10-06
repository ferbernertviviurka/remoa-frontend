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
    fireEvent.change(await screen.findByLabelText('Instituição de ensino'), { target: { value: 'usp' } });
    fireEvent.click((await screen.findAllByRole('option'))[0]!);
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
    expect(api.mock.calls[1]![0]).toBe('/v1/account/profile'); // G20: institution goes through the profile PATCH
    expect(body(1).institution.schoolId).toBeTruthy();
    expect(body(2)).toEqual({ goals: ['enamed_2027_1', 'residencia_usp'] });
    expect(body(3)).toEqual({ area: 'CM' });
    expect(body(4)).toEqual({ startPath: 'pdf' });
    expect(api.mock.calls[5]![0]).toBe('/v1/onboarding/complete');
    expect(track.mock.calls.map((c) => c[0])).toEqual(['onboarding_step', 'onboarding_step', 'onboarding_step', 'onboarding_step', 'onboarding_completed']);
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
    fireEvent.click(await screen.findByRole('button', { name: 'Pular este passo' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Pular este passo' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    for (let i = 0; i < 2; i++) fireEvent.click(await screen.findAllByRole('button', { name: 'Continuar' }).then((b) => b[0]!));
    fireEvent.click(await screen.findByRole('button', { name: /Em branco/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o primeiro mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=blank&de=onboarding'));
  });

  it('G20: conta sem nome, telefone e tipo: o 1º passo pede os três, não dá para pular e grava num PATCH', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} missing={['name', 'phone', 'userType']} profile={{ name: 'Ana do Google', phone: null, school: null, schoolId: null }} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conte quem você é');
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana do Google'); // pré-preenchido do Google
    expect(screen.queryByRole('button', { name: 'Pular este passo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pular por enquanto' })).toBeNull();
    const go = screen.getByRole('button', { name: 'Continuar' });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '123' } });
    expect(screen.getByRole('alert')).toHaveTextContent('telefone com DDD');
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11912345678' } });
    expect(go).toBeDisabled(); // falta o tipo
    fireEvent.click(screen.getByRole('button', { name: 'Professor' }));
    fireEvent.click(go);
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ name: 'Ana do Google', phone: '(11) 91234-5678', userType: 'professor' }) }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Em que momento');
  });

  it('G20: só o tipo faltando (cadastro por e-mail): pede só o tipo', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} missing={['userType']} />);
    expect(screen.queryByLabelText('Nome')).toBeNull();
    expect(screen.queryByLabelText('Telefone')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Professor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ userType: 'professor' }) }));
  });

  it('G20: onboarding já concluído (profileOnly): só esse passo e volta ao destino', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} missing={['phone']} profileOnly next="/app/mapas" />);
    expect(screen.queryByRole('button', { name: 'Pular por enquanto' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11912345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas'));
    expect(body(0)).toEqual({ phone: '(11) 91234-5678' });
    expect(track).not.toHaveBeenCalled();
  });

  it('G20: "Não estudo medicina" é a última opção do momento e muda o título da instituição', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: {} }} />);
    const options = screen.getAllByRole('button').map((b) => b.textContent);
    expect(options.indexOf('Não estudo medicina')).toBe(options.indexOf('Médico em atividade') + 1);
    fireEvent.click(screen.getByRole('button', { name: 'Não estudo medicina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Qual instituição de ensino?');
    expect(body(0)).toEqual({ segment: 'not_med' });
  });

  it('G20: instituição em texto livre grava schoolId null; pular não grava nada', async () => {
    api.mockResolvedValue(ok);
    render(<OnboardingView initial={{ answers: { segment: 'y5_6' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(await screen.findByLabelText('Instituição de ensino'), { target: { value: 'Escola Exemplo' } });
    fireEvent.click(await screen.findByRole('option', { name: /Usar “Escola Exemplo”/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/account/profile', { method: 'PATCH', body: JSON.stringify({ institution: { schoolId: null, name: 'Escola Exemplo' } }) }));
    cleanup();
    api.mockClear();
    render(<OnboardingView initial={{ answers: { segment: 'y5_6' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Quais são os seus objetivos?');
    expect(api).toHaveBeenCalledTimes(1); // só o segmento
  });
});
