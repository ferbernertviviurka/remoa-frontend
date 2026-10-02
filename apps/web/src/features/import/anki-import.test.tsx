import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApkgSummary } from '@remoa/contracts';
import { AnkiImportFlow } from './anki-import-flow';
import { useAnkiImport } from './use-anki-import';

const api = vi.fn();
const track = vi.fn();
const handle = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ show: vi.fn(), handle }) }));
vi.mock('./upload', () => ({ putApkg: async () => true }));

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
  api.mockImplementation(async (path: string) => {
    if (path in over) return over[path];
    if (path === '/v1/imports/anki/sign') return { ok: true, data: { url: 'http://u', key: 'k' } };
    if (path === '/v1/imports/anki/inspect') return { ok: true, data: summary };
    if (path === '/v1/billing/entitlements') return { ok: true, data: { ankiImportMaxCards: 3 } };
    if (path === '/v1/imports/anki') return { ok: true, data: { importId: 'i1' } };
    if (path === '/v1/imports/i1') return { ok: true, data: { importId: 'i1', status: 'done', processed: 5, total: 5, error: null } };
    if (path === '/v1/imports/i1/report') return { ok: true, data: report };
    return { ok: false, error: { code: 'not_found', message: path } };
  });
}

const open = vi.fn();
function Harness() {
  const a = useAnkiImport();
  return (
    <>
      <button onClick={() => void a.start(new File(['x'], 'a.apkg'))}>go</button>
      {a.state.kind !== 'idle' ? <AnkiImportFlow state={a.state} onPlan={a.setPlan} onConfirm={() => void a.confirm()} onReset={a.reset} onOpen={open} /> : null}
    </>
  );
}
const toPreview = async () => {
  render(<Harness />);
  fireEvent.click(screen.getByText('go'));
  await screen.findByText('Tipos de nota');
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Anki import', () => {
  it('preview: decks, mapping rules, cap warning, and the sample follows the title field', async () => {
    routes();
    await toPreview();
    expect(screen.getByText('vira o mapa “Clínica”')).toBeTruthy();
    expect(screen.getByText('vira coluna e “Fonte” do card')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('até 3');
    const table = screen.getByRole('table', { name: 'Amostra de Basic' });
    expect(table.textContent).toContain('Critério de sepse'); // derived title
    fireEvent.keyDown(screen.getByRole('combobox', { name: /^Título/ }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Tema' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Amostra de Basic' }).querySelector('tbody td')?.textContent).toBe('Sepse-3'));
  });

  it('import: posts the plan, shows the report and fires anki_imported', async () => {
    routes();
    await toPreview();
    fireEvent.click(screen.getByRole('checkbox', { name: /^Clínica \(/ })); // parent off: sub decks too
    fireEvent.click(screen.getByRole('checkbox', { name: /Sepse/ }));
    fireEvent.click(screen.getByRole('button', { name: /Importar 3 cards/ }));
    await screen.findByText('Relatório da importação');
    const body = JSON.parse((api.mock.calls.find((c) => c[0] === '/v1/imports/anki')![1] as RequestInit).body as string);
    expect(body.plan.deckIds).toEqual(['d2']);
    expect(body.plan.estimatedCards).toBe(3);
    expect(body.plan.mappings[0]).toMatchObject({ noteTypeId: 'n1', front: 'Front', back: 'Back', title: null });
    expect(track).toHaveBeenCalledWith('anki_imported', { decks: 1, cards: 4, media: 1, durationMs: 2500, skipped: 2, area: 'CM', matrixItems: 0, access: 'owner', adjusted: false, target: 'new' });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o mapa' }));
    expect(open).toHaveBeenCalledWith('b1');
  });

  it('402 quota_exceeded opens the paywall and keeps the preview', async () => {
    const err = { code: 'quota_exceeded', message: 'cards' };
    routes({ '/v1/imports/anki': { ok: false, error: err } });
    handle.mockReturnValue(true);
    await toPreview();
    fireEvent.click(screen.getByRole('button', { name: /Importar 5 cards/ }));
    await waitFor(() => expect(handle).toHaveBeenCalledWith(err));
    expect(screen.getByText('Tipos de nota')).toBeTruthy();
  });

  it('inspect 422 shows the server message', async () => {
    routes({ '/v1/imports/anki/inspect': { ok: false, error: { code: 'validation', message: 'Exporte com “Suporte a versões antigas”.' } } });
    render(<Harness />);
    fireEvent.click(screen.getByText('go'));
    expect((await screen.findByRole('alert')).textContent).toContain('versões antigas');
  });
});
