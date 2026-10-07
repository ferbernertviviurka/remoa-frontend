import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BankScreen } from './bank-screen';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SECRET = 'SECRET_KEY_ZZ';
const stats = { seen: 0, correct: 0, partial: 0, incorrect: 0 };
const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: ID(n), boardId: ID(900), type: 'objective', difficulty: 'hard', stem: `Enunciado da questão ${n}`, source: 'ai', status: 'draft',
  enamedAreaId: null, enamedDomainId: null, enamedTopicId: null, enamedTopicName: null, enamedConfirmed: true, stats, createdAt: '2026-10-07T10:00:00.000Z',
  // A faulty server could leak these; the screen must never render them.
  correct_key: SECRET, expectedAnswer: SECRET, ...over,
});
const board = { id: ID(900), title: 'Sepse', area: 'clinica-medica', status: 'private', updatedAt: '2026-10-07T10:00:00.000Z', cardCount: 3, edgeCount: 2 };

let bank: unknown[];
let archiveReply: { ok: boolean; error?: { code: string; message: string } };
let confirmReply: { ok: boolean; error?: { code: string; message: string } } | null;
const calls: Array<{ path: string; init?: RequestInit }> = [];
vi.mock('@/lib/api', () => ({
  api: vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (path === '/v1/boards') return { ok: true, data: [board] };
    if (path.endsWith('/archive')) return archiveReply.ok ? { ok: true, data: null } : { ok: false, error: archiveReply.error };
    if (path.endsWith('/confirm')) return confirmReply ?? { ok: true, data: {} };
    if (init?.method === 'POST') return { ok: true, data: {} };
    if (path.startsWith('/v1/challenge-ai/topics')) return { ok: true, data: [{ id: ID(7), name: 'Sepse' }, { id: ID(8), name: 'Pneumonia' }] };
    if (path.startsWith('/v1/challenge-ai/bank')) return bank === null ? { ok: false, error: { code: 'internal', message: 'x' } } : { ok: true, data: bank };
    return { ok: false, error: { code: 'not_found', message: path } };
  }),
}));

const bankCalls = () => calls.filter((c) => c.path.startsWith('/v1/challenge-ai/bank') && c.init?.method !== 'POST');

beforeEach(() => { calls.length = 0; bank = [row(1), row(2, { type: 'discursive', difficulty: 'easy', source: 'student' })]; archiveReply = { ok: true }; confirmReply = null; });
afterEach(cleanup);

describe('Banco de questões', () => {
  it('lista enunciado, dificuldade, tipo e rótulo de IA, e nunca mostra o gabarito', async () => {
    const { container } = render(<BankScreen />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Banco de questões' })).toBeInTheDocument();
    const first = await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    expect(within(first).getByText('Enunciado da questão 1')).toBeInTheDocument();
    expect(within(first).getByText('Difícil')).toBeInTheDocument();
    expect(within(first).getByText('Objetiva (A a D)')).toBeInTheDocument();
    expect(within(first).getByText('Gerada por IA, no estilo ENAMED. Não é questão oficial.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reportar erro' })).toHaveLength(2);
    expect(container.textContent).not.toContain(SECRET);
    expect(document.body.innerHTML).not.toContain(SECRET);
    expect(screen.queryByRole('textbox')).toBeNull(); // sem formulário de edição
    expect(bankCalls()[0]!.path).toBe('/v1/challenge-ai/bank');
  });

  it('filtros viram parâmetros da consulta', async () => {
    render(<BankScreen />);
    await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Difícil' }));
    await waitFor(() => expect(bankCalls().at(-1)!.path).toBe('/v1/challenge-ai/bank?difficulty=hard'));
    fireEvent.click(screen.getByRole('button', { name: 'Discursiva' }));
    await waitFor(() => expect(bankCalls().at(-1)!.path).toBe('/v1/challenge-ai/bank?difficulty=hard&type=discursive'));
    fireEvent.click(screen.getByRole('button', { name: 'Rascunho' }));
    await waitFor(() => expect(bankCalls().at(-1)!.path).toBe('/v1/challenge-ai/bank?difficulty=hard&type=discursive&status=draft'));
    expect(screen.getByRole('button', { name: 'Difícil' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filtro de mapa usa o id do mapa', async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    render(<BankScreen />);
    await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    await waitFor(() => expect(calls.some((c) => c.path === '/v1/boards')).toBe(true));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Mapa' }), { key: 'Enter' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Sepse' }), { key: 'Enter' });
    await waitFor(() => expect(bankCalls().at(-1)!.path).toBe(`/v1/challenge-ai/bank?board=${ID(900)}`));
  });

  it('arquivar faz POST na rota do item e recarrega a lista', async () => {
    render(<BankScreen />);
    const first = await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    const before = bankCalls().length;
    bank = [row(2)];
    fireEvent.click(within(first).getByRole('button', { name: 'Arquivar' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Enunciado da questão 1' })).toBeNull());
    const post = calls.find((c) => c.path === `/v1/challenge-ai/bank/${ID(1)}/archive`);
    expect(post?.init?.method).toBe('POST');
    expect(bankCalls().length).toBeGreaterThan(before);
  });

  it('editar envia o enunciado novo e não o gabarito', async () => {
    render(<BankScreen />);
    const first = await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    fireEvent.click(within(first).getByRole('button', { name: 'Editar' }));
    const field = within(first).getByLabelText('Editar');
    fireEvent.change(field, { target: { value: 'Enunciado reescrito' } });
    fireEvent.click(within(first).getByRole('button', { name: 'Salvar pergunta' }));
    await waitFor(() => expect(calls.some((c) => c.path === `/v1/challenge-ai/bank/${ID(1)}` && c.init?.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.path === `/v1/challenge-ai/bank/${ID(1)}` && c.init?.method === 'POST');
    expect(post?.init?.body).toBe(JSON.stringify({ stem: 'Enunciado reescrito' }));
    expect(String(post?.init?.body)).not.toContain(SECRET);
  });

  it('erro do corpo da API ao arquivar aparece na tela e a questão continua na lista', async () => {
    archiveReply = { ok: false, error: { code: 'not_found', message: 'Questão não encontrada.' } };
    render(<BankScreen />);
    const first = await screen.findByRole('article', { name: 'Enunciado da questão 1' });
    fireEvent.click(within(first).getByRole('button', { name: 'Arquivar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Questão não encontrada.');
    expect(screen.getByRole('article', { name: 'Enunciado da questão 1' })).toBeInTheDocument();
  });

  it('questão arquivada não oferece arquivar de novo; Reportar abre o suporte', async () => {
    bank = [row(3, { status: 'archived' })];
    const opened = vi.fn();
    window.addEventListener('remoa:open-support', opened);
    render(<BankScreen />);
    const item = await screen.findByRole('article', { name: 'Enunciado da questão 3' });
    expect(within(item).queryByRole('button', { name: 'Arquivar' })).toBeNull();
    fireEvent.click(within(item).getByRole('button', { name: 'Reportar erro' }));
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener('remoa:open-support', opened);
  });

  it('tema sugerido pede confirmação e manda o id do tema da lista', async () => {
    bank = [row(4, { enamedTopicId: ID(7), enamedTopicName: 'Sepse', enamedConfirmed: false })];
    render(<BankScreen />);
    const item = await screen.findByRole('article', { name: 'Enunciado da questão 4' });
    expect(within(item).getByText('Tema sugerido: Sepse')).toBeInTheDocument();
    fireEvent.click(within(item).getByRole('button', { name: 'Confirmar tema' }));
    await waitFor(() => expect(calls.some((c) => c.path === `/v1/challenge-ai/bank/${ID(4)}/confirm` && c.init?.body === JSON.stringify({ topicId: ID(7) }))).toBe(true));
  });

  it('sem tema sugerido, a lista fechada grava o tema escolhido', async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    bank = [row(5, { enamedTopicId: null, enamedTopicName: null, enamedConfirmed: false })];
    render(<BankScreen />);
    const item = await screen.findByRole('article', { name: 'Enunciado da questão 5' });
    await waitFor(() => expect(calls.some((c) => c.path.startsWith('/v1/challenge-ai/topics'))).toBe(true));
    fireEvent.keyDown(within(item).getByRole('combobox', { name: 'Tema do ENAMED' }), { key: 'Enter' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Pneumonia' }), { key: 'Enter' });
    await waitFor(() => expect(calls.some((c) => c.path === `/v1/challenge-ai/bank/${ID(5)}/confirm` && c.init?.body === JSON.stringify({ topicId: ID(8) }))).toBe(true));
  });

  it('código cru de tema fora da lista vira frase', async () => {
    bank = [row(6, { enamedTopicId: ID(7), enamedTopicName: 'Sepse', enamedConfirmed: false })];
    confirmReply = { ok: false, error: { code: 'validation', message: 'topic_not_in_list' } };
    render(<BankScreen />);
    const item = await screen.findByRole('article', { name: 'Enunciado da questão 6' });
    fireEvent.click(within(item).getByRole('button', { name: 'Confirmar tema' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha um tema da lista desta área.');
    expect(screen.queryByText('topic_not_in_list')).toBeNull();
  });

  it('falha ao listar mostra erro com Tentar de novo, que recarrega', async () => {
    bank = null as unknown as unknown[];
    render(<BankScreen />);
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    bank = [row(1)];
    fireEvent.click(retry);
    expect(await screen.findByRole('article', { name: 'Enunciado da questão 1' })).toBeInTheDocument();
  });
});
