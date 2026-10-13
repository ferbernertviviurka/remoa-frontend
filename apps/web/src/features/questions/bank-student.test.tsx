import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QuestionsHub } from './questions-hub';
import type { QuestionPublic } from '@remoa/contracts';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const base: QuestionPublic = { id: ID(1), canonicalId: ID(1), version: 1, type: 'objective', stem: 'Enunciado sintético 1', alternatives: [{ key: 'A', text: 'Alternativa sintética A' }, { key: 'B', text: 'Alternativa sintética B' }], origin: 'official_exam', visibility: 'public', availability: 'active', difficulty: 'medium', topicId: null, areaId: null, sourceId: null, sourceLabel: 'Fonte sintética', reviewed: true, validation: { kind: 'remoa_institutional', label: 'Remoa' }, assets: [], boardId: null, cardIds: [], createdAt: new Date('2026-10-08T12:00:00.000Z') };
const q = (n: number, extra: Partial<QuestionPublic> = {}): QuestionPublic => ({ ...base, id: ID(n), canonicalId: ID(n), stem: `Enunciado sintético ${n}`, ...extra });
const attempt = { questionId: ID(1), selectedKey: 'A', result: 'correct', answeredAt: '2026-10-13T12:00:00.000Z', reference: { questionId: ID(1), version: 1, correctKey: 'A', explanation: 'Comentário liberado só após responder', distractorNotes: null, annulled: false, reviewed: true, reviewerName: null, reviewerCrm: null, referenceDate: null, sourceUrl: null, obsolete: false } };

type Handler = (url: URL, init?: RequestInit) => unknown | Promise<unknown>;
let lists: Handler; let facets: Handler; let calls: string[]; let answers: unknown[]; const push = vi.fn();
const ok = (data: unknown) => ({ ok: true, data });
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: vi.fn(async (path: string, init?: RequestInit) => {
  calls.push(path); const url = new URL(path, 'http://x');
  if (url.pathname === '/v1/questions/facets') return facets(url, init);
  if (url.pathname === '/v1/questions') return lists(url, init);
  if (url.pathname.endsWith('/attempt')) return ok({ last: null });
  if (url.pathname.endsWith('/answer')) { answers.push(JSON.parse(String(init?.body))); return ok(attempt); }
  if (url.pathname.endsWith('/user-state')) return ok({ favorite: true, doubtful: false, annotation: '' });
  return ok([]);
}) }));
const fac = (extra = {}) => ({ total: 3, difficulties: [{ value: 'easy', count: 2 }], institutions: [{ name: 'Inst A', count: 3 }], years: [{ year: 2025, count: 3 }], ...extra });
const page = (items: QuestionPublic[], nextCursor: string | null = null, total = items.length) => ok({ items, nextCursor, total });
const bank = () => render(<QuestionsHub bankStudent />);
beforeEach(() => { calls = []; answers = []; push.mockClear(); lists = () => page([q(1), q(2)]); facets = () => ok(fac()); });
afterEach(cleanup);

describe('F34 banco do aluno (HTTP sintético)', () => {
  it('flag off keeps the legacy hub and never calls a new route', async () => {
    render(<QuestionsHub />);
    await waitFor(() => expect(calls.some((c) => c.startsWith('/v1/questions?'))).toBe(true));
    expect(calls.some((c) => c.includes('/facets') || c.endsWith('/attempt') || c.endsWith('/answer'))).toBe(false);
    expect(screen.queryByText('Catálogo Remoa')).toBeNull();
  });

  it('lists with the seal "Validado pela Remoa", progress badge and catalog scope', async () => {
    lists = () => page([q(1, { progress: 'wrong' }), q(2)]);
    bank();
    await screen.findByText('Enunciado sintético 1');
    expect(screen.getAllByText('Validado pela Remoa').length).toBe(2);
    expect(screen.queryByText('Revisada por médico')).toBeNull();
    expect(screen.getByText('Errou')).toBeInTheDocument();
    expect(calls.some((c) => c.includes('scope=catalog'))).toBe(true);
  });

  it('AI tab is Minhas perguntas: "Gerada por IA" and no seal', async () => {
    lists = (u) => page(u.searchParams.get('origin') === 'ai_generated' ? [q(3, { origin: 'ai_generated', validation: { kind: 'remoa_institutional', label: 'Remoa' } })] : [q(1)]);
    bank();
    fireEvent.click(await screen.findByRole('button', { name: 'Minhas perguntas (IA)' }));
    await screen.findByText('Enunciado sintético 3');
    expect(screen.getAllByText('Gerada por IA').length).toBeGreaterThan(0);
    expect(screen.queryByText('Validado pela Remoa')).toBeNull();
    expect(calls.some((c) => c.includes('scope=mine') && c.includes('origin=ai_generated'))).toBe(true);
  });

  it('error is an alert with retry, never an empty list', async () => {
    let fail = true; lists = () => (fail ? { ok: false, error: { code: 'internal', message: 'x' } } : page([q(1)]));
    bank();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Não conseguimos carregar as questões/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma questão com esses filtros')).toBeNull();
    expect(screen.queryByText('O catálogo ainda não tem questões publicadas')).toBeNull();
    fail = false; fireEvent.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByText('Enunciado sintético 1');
  });

  it('catalog without published questions is distinct from an empty filter', async () => {
    lists = () => page([]); facets = () => ok(fac({ total: 0 }));
    bank();
    await screen.findByText('O catálogo ainda não tem questões publicadas');
    cleanup();
    lists = () => page([]); facets = (u) => ok(fac({ total: u.searchParams.has('topicQuery') ? 0 : 5 }));
    bank();
    await screen.findByText('Nenhuma questão com esses filtros');
    expect(screen.queryByText('O catálogo ainda não tem questões publicadas')).toBeNull();
  });

  it('load more: failure stays inline, keeps rows, focuses retry, then focuses the first new row', async () => {
    let fails = 1;
    lists = (u) => { if (!u.searchParams.get('cursor')) return page([q(1), q(2)], 'c1', 4); if (fails-- > 0) return { ok: false, error: { code: 'internal', message: 'x' } }; return page([q(3), q(4)], null, 4); };
    bank();
    await screen.findByText('Enunciado sintético 2');
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais 2' }));
    const alert = await screen.findByRole('alert');
    expect(screen.getByText('Enunciado sintético 2')).toBeInTheDocument();
    const retry = within(alert).getByRole('button', { name: 'Tentar de novo' });
    await waitFor(() => expect(retry).toHaveFocus());
    fireEvent.click(retry);
    await screen.findByText('Enunciado sintético 4');
    await waitFor(() => expect(document.activeElement?.getAttribute('data-bank-open')).toBe(ID(3)));
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('a stale slow response never replaces the current search', async () => {
    let release: () => void = () => undefined; const gate = new Promise<void>((r) => { release = r; });
    lists = async (u) => { const s = u.searchParams.get('search'); if (s === 'lenta') { await gate; return page([q(8, { stem: 'Resposta velha' })]); } if (s === 'rapida') return page([q(9, { stem: 'Resposta atual' })]); return page([q(1)]); };
    bank();
    await screen.findByText('Enunciado sintético 1');
    const box = screen.getByLabelText('Buscar no enunciado');
    fireEvent.change(box, { target: { value: 'lenta' } });
    await waitFor(() => expect(calls.some((c) => c.includes('search=lenta'))).toBe(true), { timeout: 2000 });
    fireEvent.change(box, { target: { value: 'rapida' } });
    await screen.findByText('Resposta atual');
    await act(async () => { release(); await gate; });
    expect(screen.queryByText('Resposta velha')).toBeNull();
    expect(screen.getByText('Resposta atual')).toBeInTheDocument();
  });

  it('topic autocomplete: debounce 200 ms, keyboard, counts, empty message, chip, clear resets the cursor', async () => {
    const topics = [{ id: ID(50), name: 'Cardiologia sintética', count: 4 }];
    facets = (u) => { const tq = u.searchParams.get('topicQuery'); return ok(tq ? { total: 1, topics: tq === 'zzz' ? [] : topics } : fac()); };
    lists = (u) => (u.searchParams.get('cursor') ? page([q(3)]) : page([q(1)], 'c1', 30));
    bank();
    await screen.findByText('Enunciado sintético 1');
    const box = screen.getByRole('combobox', { name: 'Assunto' });
    box.focus();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(box, { target: { value: 'c' } }); fireEvent.change(box, { target: { value: 'ca' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(calls.filter((c) => c.includes('topicQuery=')).length).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(80); });
    vi.useRealTimers();
    expect(calls.filter((c) => c.includes('topicQuery=')).length).toBe(1);
    await screen.findByRole('option', { name: 'Cardiologia sintética · 4' });
    fireEvent.keyDown(box, { key: 'ArrowDown' }); fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(calls.some((c) => c.includes(`topicIds=${ID(50)}`))).toBe(true));
    expect(await screen.findByRole('button', { name: 'Remover assunto Cardiologia sintética' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Limpar filtros (1)' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Limpar filtros/ })).toBeNull());
    expect(calls.filter((c) => c.startsWith('/v1/questions?')).at(-1)).not.toContain('cursor=');
    fireEvent.change(box, { target: { value: 'zzz' } });
    await screen.findByText('Nenhum assunto encontrado', {}, { timeout: 2000 });
    fireEvent.keyDown(box, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Nenhum assunto encontrado')).toBeNull());
  });

  it('multivalue facets send repeated params', async () => {
    bank();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Fácil (2)' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Inst A (3)' }));
    await waitFor(() => expect(calls.some((c) => c.startsWith('/v1/questions?') && c.includes('difficulties=easy') && c.includes('institutions=Inst+A'))).toBe(true));
  });

  it('answer comes only from the answer response: nothing before, nothing in the list payload', async () => {
    bank();
    await screen.findByText('Enunciado sintético 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver questão' })[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /A\. Alternativa sintética A/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Comentário liberado');
    expect(document.body.textContent).not.toContain('Gabarito');
    expect(within(dialog).getByRole('button', { name: 'Responder' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: /A\. Alternativa sintética A/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Responder' }));
    await within(dialog).findByText('Comentário liberado só após responder');
    expect(answers).toEqual([{ selectedKey: 'A', mutationId: expect.any(String), elapsedMs: expect.any(Number) }]);
    expect(within(dialog).getByText('Você acertou')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Refazer' }));
    expect(screen.queryByText('Comentário liberado só após responder')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Reportar erro' })).toBeInTheDocument();
  });

  it('a list item carrying a key is rejected, never rendered', async () => {
    lists = () => page([{ ...q(1), correctKey: 'SEGREDO' } as unknown as QuestionPublic]);
    bank();
    await screen.findByRole('alert');
    expect(document.body.textContent).not.toContain('SEGREDO');
  });

  it('selection bar: count, clear, create exam navigates with the ids; drawer adds too', async () => {
    bank();
    await screen.findByText('Enunciado sintético 1');
    const boxes = screen.getAllByRole('checkbox', { name: /Selecionar para a prova/ });
    fireEvent.click(boxes[0]!);
    await screen.findByText('1 questão selecionada');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver questão' })[1]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar à prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await screen.findByText('2 questões selecionadas');
    fireEvent.click(screen.getByRole('button', { name: 'Criar prova com estas' }));
    expect(push).toHaveBeenCalledWith(`/app/banco-de-questoes/prova?ids=${ID(1)},${ID(2)}`);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));
    expect(screen.queryByText('2 questões selecionadas')).toBeNull();
  });

  it('discursive AI question is not answered here', async () => {
    lists = () => page([q(5, { type: 'discursive', alternatives: null, origin: 'ai_generated', validation: null })]);
    bank();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver questão' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/corrigidas no Desafio/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Responder' })).toBeNull();
  });
});
