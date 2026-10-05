import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Card, CardDetail } from '@remoa/contracts';
import { PLAN_LIMITS, planDefinition } from '@remoa/contracts';
import { sepseCards } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';
import { useMobileCardCreator, type CardCreatorHost } from './mobile-card-creator';
import { clearAssetCache } from '../upload';
import { violations } from '../test-utils';

const api = vi.fn();
const push = vi.fn();
const show = vi.fn();
let ent: unknown = null;
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ show, handle: () => false }) }));
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ({ entitlements: ent }) }));

const base = sepseCards[0]!;
const detail = (type: Card['type'], payload: unknown): CardDetail => ({ ...base, id: `00000000-0000-4000-8000-0000000009${type.length}1`, type, title: 'Novo', front: null, back: null, payload: payload as never, rubric: null });
let current: CardDetail = base;

function route(path: string, init?: RequestInit) {
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  if (/^\/v1\/cards\//.test(path)) {
    if (init?.method !== 'PUT') return { ok: true, data: current };
    return { ok: true, data: { ...current, ...body, preview: undefined } };
  }
  throw new Error(`unexpected ${path}`);
}

const host: { [K in keyof CardCreatorHost]: ReturnType<typeof vi.fn> } = {
  createCard: vi.fn(),
  discardCard: vi.fn(),
  getCard: vi.fn(),
  prepare: vi.fn(async () => true),
  onSaved: vi.fn(),
  focusCard: vi.fn(),
  subs: vi.fn(),
  onShape: vi.fn(),
};

function Harness() {
  const c = useMobileCardCreator(host as unknown as CardCreatorHost);
  return (
    <>
      <button onClick={c.openSheet}>abrir</button>
      <button onClick={() => c.openEditor(base.id)}>editar</button>
      {c.element}
    </>
  );
}
const open = () => {
  const r = render(
    <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
      <Harness />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
  return r;
};
const pick = async (name: string) => fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
const editorOpen = () => screen.findByRole('form');

function as(type: Card['type'], payload: unknown = {}) {
  current = detail(type, payload);
  host.createCard.mockReturnValue(current.id);
  host.getCard.mockReturnValue(current);
}

beforeEach(() => {
  ent = null;
  api.mockImplementation(async (p: string, i?: RequestInit) => route(p, i));
  clearAssetCache();
  as('concept');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('create sheet → editor', () => {
  it('Conceito: creates the card on the map, opens "Novo conceito", saves and focuses the card', async () => {
    open();
    await pick('Conceito');
    expect(host.createCard).toHaveBeenCalledWith('concept');
    await editorOpen();
    expect(screen.getAllByText('Novo conceito').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Lactato na sepse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(host.onSaved).toHaveBeenCalledOnce());
    await waitFor(() => expect(host.focusCard).toHaveBeenCalledWith(current.id));
    expect(host.discardCard).not.toHaveBeenCalled();
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('Fluxograma: steps are required and validated per field; nothing is sent', async () => {
    as('flow', { steps: [{ id: 'a', text: '' }, { id: 'b', text: '' }] });
    open();
    await pick('Fluxograma');
    await editorOpen();
    expect(screen.getAllByText('Novo fluxograma').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(api.mock.calls.filter(([, i]) => i?.method === 'PUT')).toHaveLength(0);
    expect(host.onSaved).not.toHaveBeenCalled();
  });

  it('Caso clínico: four stages; Imagem: image field', async () => {
    as('case', { caseSteps: [] });
    open();
    await pick('Caso clínico');
    await editorOpen();
    expect(screen.getAllByText('Novo caso clínico').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Apresentação')).toBeInTheDocument();
    cleanup();
    as('image', { assetId: null, masks: [] });
    open();
    await pick('Imagem');
    await editorOpen();
    expect(screen.getAllByText('Nova imagem').length).toBeGreaterThan(0);
  });

  it('blank title is refused with the field message', async () => {
    open();
    await pick('Conceito');
    await editorOpen();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(host.onSaved).not.toHaveBeenCalled();
  });

  it('Cancelar with edits asks first; keeping edits stays, discarding removes the new card', async () => {
    open();
    await pick('Conceito');
    await editorOpen();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mudei' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const ask = await screen.findByRole('dialog', { name: 'Descartar as alterações?' });
    fireEvent.click(within(ask).getByRole('button', { name: 'Continuar editando' }));
    expect(host.discardCard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(host.discardCard).toHaveBeenCalledWith(current.id);
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
  });

  it('Cancelar without edits closes at once; an existing card is not removed (openEditor)', async () => {
    host.getCard.mockReturnValue(base);
    render(
      <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'editar' }));
    await editorOpen();
    expect(screen.getAllByText('Editar conceito').length).toBeGreaterThan(0);
    current = base;
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    expect(host.discardCard).not.toHaveBeenCalled();
  });

  it('Free at the card limit: tapping an option opens the upgrade sheet and creates nothing', async () => {
    ent = { plan: 'free', limits: PLAN_LIMITS.free.limits, newCardsPerDay: 10, ankiImportMaxCards: 200, ankiImports: 1, ankiImportsUsed: 0, usage: { ai_grades: 0, ai_generations: 0, boards: 0, cards: planDefinition('free').cards } };
    open();
    await pick('Conceito');
    expect(show).toHaveBeenCalledWith('cards');
    expect(host.createCard).not.toHaveBeenCalled();
  });

  it('PDF and Anki go to the import flow', async () => {
    open();
    await pick('Importar PDF');
    expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=pdf');
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    await pick('Importar do Anki');
    expect(push).toHaveBeenCalledWith('/app/mapas/novo?caminho=anki');
  });

  it('Tirar foto: camera input; a bad file is refused and no card is created', async () => {
    open();
    const input = screen.getByLabelText('Tirar foto do atlas ou da apostila') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBe('environment');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(/Não deu para usar essa foto/)).toBeInTheDocument();
    expect(host.createCard).not.toHaveBeenCalled();
  });

  it('axe: sheet and editor have no violations', async () => {
    open();
    expect(await violations(document.body)).toEqual([]);
    await pick('Conceito');
    await editorOpen();
    expect(await violations(document.body)).toEqual([]);
  });
});
