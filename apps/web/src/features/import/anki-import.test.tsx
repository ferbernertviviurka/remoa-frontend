import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PLAN_LIMITS, type ApkgSummary } from '@remoa/contracts';
import { AnkiImportFlow } from './anki-import-flow';
import { useAnkiImport } from './use-anki-import';

const api = vi.fn();
const track = vi.fn();
const handle = vi.fn();
const show = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ show: (r: string) => show(r), handle }) }));
const upload = vi.fn();
vi.mock('./upload', () => ({ uploadApkg: (...a: unknown[]) => upload(...a) }));

// Radix Select under jsdom
Object.assign(Element.prototype, { scrollIntoView: () => undefined, hasPointerCapture: () => false, releasePointerCapture: () => undefined });

const summary: ApkgSummary = {
  decks: [{ id: 'd1', name: 'Clínica', cardCount: 2, noteCount: 2 }, { id: 'd2', name: 'Clínica::Sepse', cardCount: 3, noteCount: 3 }],
  noteTypes: [{ id: 'n1', name: 'Basic', kind: 'basic', fields: ['Front', 'Back', 'Tema'], noteCount: 5, samples: [{ Front: 'Critério de sepse', Back: 'SOFA ≥ 2', Tema: 'Sepse-3' }] }],
  cardCount: 5,
  mediaCount: 1,
};
const report = { importId: 'i1', boardIds: ['b1'], imported: 4, skippedDuplicate: 1, skippedEmpty: 0, missingMedia: 1, durationMs: 2500 };

function routes(over: Record<string, unknown> = {}) {
  upload.mockResolvedValue({ ok: true, data: { key: 'k' } });
  api.mockImplementation(async (path: string) => {
    if (path in over) return over[path];
    if (path === '/v1/imports/anki/inspect') return { ok: true, data: summary };
    if (path === '/v1/billing/entitlements') return { ok: true, data: { ankiImportMaxCards: 3 } };
    if (path === '/v1/imports/anki') return { ok: true, data: { importId: 'i1' } };
    if (path === '/v1/imports/i1') return { ok: true, data: { importId: 'i1', status: 'done', processed: 5, total: 5, error: null } };
    if (path === '/v1/imports/i1/report') return { ok: true, data: report };
    if (path.startsWith('/v1/imports/anki/existing')) return { ok: true, data: { board: path.includes('Velho') ? { id: 'b0', title: 'Velho' } : null } };
    return { ok: false, error: { code: 'not_found', message: path } };
  });
}

const open = vi.fn();
const found = vi.fn();
const board = { title: 'Sepse', area: 'CM', matrixItemIds: ['m1', 'm2'], access: 'public', target: 'new' } as const;
function Harness() {
  const a = useAnkiImport();
  return (
    <>
      <button onClick={() => void a.start(new File(['x'], 'a.apkg'))}>go</button>
      <button onClick={() => void a.confirm({ ...board, matrixItemIds: [...board.matrixItemIds] }, { suggestedCount: 1 })}>confirm</button>
      <button onClick={() => void a.findExisting('Velho').then(found)}>existing</button>
      {a.state.kind === 'preview' && a.state.submitError ? <p>{a.state.submitError}</p> : null}
      {a.state.kind !== 'idle' ? <AnkiImportFlow state={a.state} onPlan={a.setPlan} onAdjustOpened={a.markAdjusted} onReset={a.reset} onOpen={open} /> : null}
    </>
  );
}
const toPreview = async () => {
  render(<Harness />);
  fireEvent.click(screen.getByText('go'));
  await screen.findByTestId('import-summary');
};
const adjust = () => fireEvent.click(screen.getByRole('button', { name: 'Ajustar importação' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Anki import', () => {
  it('summary (FR-8): one card, cap alert, 3 examples, no field select until "Ajustar importação" opens', async () => {
    routes();
    await toPreview();
    expect(screen.getByTestId('import-summary').textContent).toBe('5 cards · 1 imagem · 2 baralhos (viram colunas)');
    expect(screen.getByRole('alert').textContent).toContain('até 3');
    expect(screen.getByText('Critério de sepse')).toBeTruthy(); // example front
    expect(screen.queryByText('Tipos de nota')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    adjust();
    expect(await screen.findByText('Tipos de nota')).toBeTruthy();
    expect(track).toHaveBeenCalledWith('anki_import_adjust_opened', {});
    adjust();
    adjust();
    expect(track.mock.calls.filter((c) => c[0] === 'anki_import_adjust_opened')).toHaveLength(1);
  });

  it('adjust (FR-9): decks are columns, the sample follows the title field, unchecking lowers N', async () => {
    routes();
    await toPreview();
    adjust();
    expect(await screen.findByText('vira coluna do mapa')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Amostra de Basic' });
    expect(table.textContent).toContain('Critério de sepse'); // derived title
    fireEvent.keyDown(screen.getByRole('combobox', { name: /^Título/ }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Tema' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Amostra de Basic' }).querySelector('tbody td')?.textContent).toBe('Sepse-3'));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Clínica \(/ })); // the server imports a deck's whole subtree
    expect(screen.getByTestId('import-summary').textContent).toContain('0 card ·');
  });

  it('confirm (FR-10): posts the plan and the board, one "Abrir mapa", anki_imported with the F17 props', async () => {
    routes();
    await toPreview();
    adjust();
    fireEvent.click(await screen.findByRole('checkbox', { name: /^Clínica \(/ })); // parent off: sub decks too
    fireEvent.click(screen.getByRole('checkbox', { name: /Sepse/ }));
    fireEvent.click(screen.getByText('confirm'));
    await screen.findByText('Relatório da importação');
    const body = JSON.parse((api.mock.calls.find((c) => c[0] === '/v1/imports/anki')![1] as RequestInit).body as string);
    expect(body.plan.deckIds).toEqual(['d2']);
    expect(body.plan.estimatedCards).toBe(3);
    expect(body.plan.mappings[0]).toMatchObject({ noteTypeId: 'n1', front: 'Front', back: 'Back', title: null });
    expect(body.board).toEqual(board);
    expect(track).toHaveBeenCalledWith('anki_imported', { decks: 1, cards: 4, media: 1, durationMs: 2500, skipped: 2, area: 'CM', matrixItems: 2, access: 'public', adjusted: true, target: 'new' });
    expect(track).toHaveBeenCalledWith('board_linked_to_matrix', { count: 2, suggestedCount: 1 });
    expect(track).toHaveBeenCalledWith('board_access_changed', { from: 'owner', to: 'public', source: 'create' });
    expect(screen.getAllByRole('button', { name: /Abrir/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa' }));
    expect(open).toHaveBeenCalledWith('b1');
  });

  it('402 quota_exceeded opens the paywall and keeps the summary', async () => {
    const err = { code: 'quota_exceeded', message: 'cards' };
    routes({ '/v1/imports/anki': { ok: false, error: err } });
    handle.mockReturnValue(true);
    await toPreview();
    fireEvent.click(screen.getByText('confirm'));
    await waitFor(() => expect(handle).toHaveBeenCalledWith(err));
    expect(screen.getByTestId('import-summary')).toBeTruthy();
  });

  it('422 on start goes back to the summary with the server message (nothing lost)', async () => {
    routes({ '/v1/imports/anki': { ok: false, error: { code: 'validation', message: 'Item de outra área' } } });
    handle.mockReturnValue(false);
    await toPreview();
    fireEvent.click(screen.getByText('confirm'));
    expect(await screen.findByText('Item de outra área')).toBeTruthy();
    expect(screen.getByTestId('import-summary')).toBeTruthy();
  });

  it('findExisting returns the own board with the same name (FR-11)', async () => {
    routes();
    render(<Harness />);
    fireEvent.click(screen.getByText('existing'));
    await waitFor(() => expect(found).toHaveBeenCalledWith({ id: 'b0', title: 'Velho' }));
    expect(api).toHaveBeenCalledWith('/v1/imports/anki/existing?title=Velho');
  });

  it('inspect 422 shows the server message', async () => {
    routes({ '/v1/imports/anki/inspect': { ok: false, error: { code: 'validation', message: 'Exporte com “Suporte a versões antigas”.' } } });
    render(<Harness />);
    fireEvent.click(screen.getByText('go'));
    expect((await screen.findByRole('alert')).textContent).toContain('versões antigas');
  });

  it('Free with its import used: paywall "anki" before any upload (D-648)', async () => {
    routes({ '/v1/billing/entitlements': { ok: true, data: { ankiImportMaxCards: PLAN_LIMITS.free.ankiImportMaxCards, ankiImports: PLAN_LIMITS.free.ankiImports, ankiImportsUsed: PLAN_LIMITS.free.ankiImports } } });
    render(<Harness />);
    fireEvent.click(screen.getByText('go'));
    await waitFor(() => expect(show).toHaveBeenCalledWith('anki'));
    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByTestId('import-summary')).toBeNull();
  });

  it('a 402 from the server on upload opens the paywall instead of an error', async () => {
    routes();
    upload.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', message: 'anki' } });
    handle.mockReturnValue(true);
    render(<Harness />);
    fireEvent.click(screen.getByText('go'));
    await waitFor(() => expect(handle).toHaveBeenCalledWith({ code: 'quota_exceeded', message: 'anki' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a failed upload (413, not a zip, network) shows the upload error and inspects nothing (D-1443)', async () => {
    routes();
    upload.mockResolvedValue({ ok: false, error: { code: 'validation', message: 'file_too_large' } });
    handle.mockReturnValue(false);
    render(<Harness />);
    fireEvent.click(screen.getByText('go'));
    expect((await screen.findByRole('alert')).textContent).toContain('Não conseguimos enviar o arquivo');
    expect(api.mock.calls.some((c) => c[0] === '/v1/imports/anki/inspect')).toBe(false);
  });

  it('Pro (no per-file cap, unlimited imports): goes to the summary without the cap alert', async () => {
    routes({ '/v1/billing/entitlements': { ok: true, data: { ankiImportMaxCards: null, ankiImports: null, ankiImportsUsed: 4 } } });
    await toPreview();
    expect(show).not.toHaveBeenCalled();
    expect(screen.queryByText('Acima do limite do plano')).toBeNull();
  });
});
