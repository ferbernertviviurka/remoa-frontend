import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GenerateExamDialog, maxBatches } from './generate-exam-dialog';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const push = vi.fn();
let aiBodies: string[] = [];
let aiReply: unknown = { ok: true, data: { id: ID(30) } };
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({
  api: vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/v1/boards') return { ok: true, data: [{ id: ID(9), title: 'Mapa de clínica' }] };
    if (path.startsWith('/v1/challenge-ai/taxonomy?kind=area')) return { ok: true, data: [{ id: ID(40), name: 'Cardiologia' }] };
    if (path.startsWith('/v1/challenge-ai/taxonomy')) return { ok: true, data: [{ id: ID(41), name: 'Insuficiência cardíaca' }] };
    if (path === '/v1/challenge-ai/sessions' && init?.method === 'POST') { aiBodies.push(String(init.body)); return aiReply; }
    return { ok: false, error: { code: 'not_found', message: path } };
  }),
}));

beforeEach(() => { push.mockReset(); aiBodies = []; aiReply = { ok: true, data: { id: ID(30) } }; });
afterEach(cleanup);

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
const pick = async (label: string, typed: string, option: RegExp) => {
  const box = screen.getByRole('combobox', { name: label });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: typed } });
  fireEvent.click(await screen.findByRole('option', { name: option, hidden: true }));
};
const open = () => render(<GenerateExamDialog open onOpenChange={() => undefined} />);

it('walks Mapa → Assunto → Formato → Revisar, validating the map and moving focus to each step', async () => {
  open();
  expect(screen.getByRole('list', { name: 'Etapas para gerar a prova' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Mapa' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  next();
  expect(await screen.findByText('Escolha um mapa para gerar as questões.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Mapa' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Conteúdo' })).toBeEnabled());
  await pick('Conteúdo', 'clín', /Mapa de clínica/);
  next();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Assunto' })).toHaveFocus());
  await pick('Especialidade', 'Cardio', /Cardiologia/);
  next();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Formato' })).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: /Estudo/ }));
  fireEvent.click(screen.getByRole('radio', { name: '20' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Objetiva' }));
  next();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Revisar' })).toHaveFocus());
  expect(screen.getByText('Mapa de clínica')).toBeInTheDocument();
  expect(screen.getByText('Cardiologia')).toBeInTheDocument();
  expect(screen.getByText('20 questões')).toBeInTheDocument();
  expect(screen.getByText(/limite diário de IA do seu plano.*no máximo 2\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar e começar' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/app/mapas/${ID(9)}/desafio-ia?session=${ID(30)}`));
  expect(JSON.parse(aiBodies[0]!)).toMatchObject({ boardId: ID(9), n: 20, questionType: 'objective', grading: 'immediate', preset: 'practice', enamedTopicId: ID(40), timerSec: 30 * 60 });
});

it('blocks Formato with an invalid time, goes back without losing choices and edits from Revisar', async () => {
  open();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Conteúdo' })).toBeEnabled());
  await pick('Conteúdo', 'clín', /Mapa de clínica/);
  next(); next();
  const perQuestion = await screen.findByLabelText('Tempo por questão (segundos)');
  fireEvent.change(perQuestion, { target: { value: '5' } });
  next();
  expect(screen.getByText('Use de 30 a 600 segundos por questão e de 0 a 240 minutos no total.')).toBeInTheDocument();
  expect(perQuestion).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(perQuestion, { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('Tempo total (minutos)'), { target: { value: '0' } });
  next();
  expect(await screen.findByText('Sem limite de tempo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Alterar Conteúdo' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Mapa' })).toHaveFocus());
  expect(screen.getByRole('combobox', { name: 'Conteúdo' })).toHaveValue('Mapa de clínica');
  next(); next(); next();
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar e começar' }));
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(JSON.parse(aiBodies[0]!)).toMatchObject({ n: 10, questionType: 'mixed', grading: 'end', timerSec: null });
});

it('shows the quota message when the plan limit is reached and stays on Revisar', async () => {
  aiReply = { ok: false, error: { code: 'quota_exceeded', message: 'q' } };
  open();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Conteúdo' })).toBeEnabled());
  await pick('Conteúdo', 'clín', /Mapa de clínica/);
  next(); next(); next();
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar e começar' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Você chegou ao limite diário de IA do seu plano.');
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Revisar' })).toBeInTheDocument();
});

it('bounds AI batches per answer type', () => {
  expect(maxBatches(10, 'objective')).toBe(1);
  expect(maxBatches(15, 'discursive')).toBe(2);
  expect(maxBatches(10, 'mixed')).toBe(2);
});
