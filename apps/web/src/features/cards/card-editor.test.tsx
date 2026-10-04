import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Card, CardDetail, SaveCardInput } from '@remoa/contracts';
import * as mocks from '@remoa/contracts/mocks';
import { retrievabilityFixture, sepseCardIds, sepseCards } from '@remoa/contracts/mocks';
import { CardEditor } from './card-editor';
import { clearAssetCache } from './upload';
import { violations } from './test-utils';

const api = vi.fn();
const track = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const U = mocks.fixtureUserId;
const imageId = '00000000-0000-4000-8000-000000000901';
const caseId = '00000000-0000-4000-8000-000000000902';
const base = sepseCards[0]!;
const extra: Record<string, CardDetail> = {
  [imageId]: { ...base, id: imageId, type: 'image', title: 'Coração', front: null, back: null, payload: {} as never, rubric: null },
  [caseId]: { ...base, id: caseId, type: 'case', title: 'Novo caso', front: null, back: null, payload: {} as never, rubric: null },
};

/** Routes the browser API client to the contract mocks (same validation as the real API). */
function route(path: string, init?: RequestInit) {
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const card = /^\/v1\/cards\/(.+)$/.exec(path)?.[1];
  if (card && extra[card]) {
    if (init?.method !== 'PUT') return { ok: true, data: extra[card] };
    const parsed = (body as SaveCardInput);
    return { ok: true, data: { ...extra[card], ...parsed, preview: undefined } };
  }
  if (card) return init?.method === 'PUT' ? mocks.saveCard(U, card, body) : mocks.getCard(U, card);
  const asset = /^\/v1\/assets\/(.+)$/.exec(path)?.[1];
  if (asset) return mocks.getAsset(U, asset);
  if (path === '/v1/uploads/sign') return mocks.signUpload(U, body);
  if (path === '/v1/uploads/complete') return mocks.completeUpload(U, body);
  throw new Error(`unexpected ${path}`);
}

const prepare = vi.fn(async () => true);
const onSaved = vi.fn();
const onClose = vi.fn();
const asCard = (d: CardDetail): Card => d;
const editor = (card: CardDetail, subs?: Parameters<typeof CardEditor>[0]['subs']) =>
  render(<CardEditor card={asCard(card)} subs={subs} prepare={prepare} onSaved={onSaved} onClose={onClose} />);
const form = () => screen.findByRole('form');

beforeEach(() => {
  api.mockImplementation(async (p: string, i?: RequestInit) => route(p, i));
  clearAssetCache();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CardEditor: concept', () => {
  it('loads, edits and saves through PUT; tracks card_edited; refreshes the map node and closes', async () => {
    editor(base);
    await form();
    expect(screen.getByLabelText('Título')).toHaveValue('Sepse');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sepse (Sepsis-3)' } });
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: '**Disfunção** orgânica' } });
    expect(within(screen.getByRole('region', { name: 'Prévia da resposta' })).getByText('Disfunção').tagName).toBe('STRONG');
    fireEvent.change(screen.getByLabelText('Fonte (texto ou URL)'), { target: { value: 'SSC 2021' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(prepare).toHaveBeenCalledWith(base.id);
    const [detail, input] = onSaved.mock.calls[0]!;
    expect(input).toEqual({ type: 'concept', title: 'Sepse (Sepsis-3)', shape: 'rect', front: base.front, frontAssetId: null, backAssetId: null, back: '**Disfunção** orgânica', source: 'SSC 2021', payload: {} });
    expect(detail.title).toBe('Sepse (Sepsis-3)');
    expect(track).toHaveBeenCalledWith('card_edited', { type: 'concept' });
    expect(onClose).toHaveBeenCalled();
  });

  it('invalid input is not sent (FR-8); Esc cancels; Ctrl+Enter saves from a textarea', async () => {
    editor(sepseCards[1]!);
    await form();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: ' ' } });
    fireEvent.keyDown(screen.getByLabelText('Resposta'), { key: 'Enter', ctrlKey: true });
    expect(await screen.findByText('Dê um título ao card.')).toBeInTheDocument();
    expect(api.mock.calls.filter(([, i]) => i?.method === 'PUT')).toHaveLength(0);
    fireEvent.keyDown(screen.getByLabelText('Título'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not PUT when the card never reached the server', async () => {
    prepare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    editor(base);
    await form();
    fireEvent.submit(await form());
    expect(await screen.findByText('O card ainda não chegou ao servidor. Confira a conexão e tente de novo.')).toBeInTheDocument();
    expect(api.mock.calls.filter(([, i]) => i?.method === 'PUT')).toHaveLength(0);
  });

  it('shows the read-only rubric, without the old "Gerar rubrica" placeholder (F05)', async () => {
    editor(base);
    await form();
    expect(screen.getByText('Disfunção orgânica com risco de vida')).toBeInTheDocument();
    expect(screen.getAllByText('Essencial')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Gerar rubrica · Em breve' })).toBeNull();
  });

  it('axe: no violations', async () => {
    const { container } = editor(base);
    await form();
    expect(await violations(container)).toEqual([]);
  });
});

describe('CardEditor: flow', () => {
  const flow = sepseCards.find((c) => c.id === sepseCardIds.pacote)!;
  const stepTexts = () => screen.getAllByRole('textbox', { name: /^Passo \d+$/ }).map((i) => (i as HTMLInputElement).value);

  // dnd-kit measures rects; jsdom has none: lay the steps out 100px apart.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const li = this.closest('li[data-step-id]');
      const i = li ? [...li.parentElement!.children].indexOf(li) : 0;
      return { x: 0, y: i * 100, top: i * 100, left: 0, width: 300, height: 80, right: 300, bottom: i * 100 + 80, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('colours step 5 "Revisitar" from the FSRS mock (FR-2)', async () => {
    editor(flow, retrievabilityFixture[sepseCardIds.pacote]!.subs);
    await form();
    const step5 = screen.getByLabelText('Passo 5').closest('li')!;
    expect(within(step5).getByText('Revisitar')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Passo 1').closest('li')!).getByText('Mais estável')).toBeInTheDocument();
  });

  it('adds and removes steps, never below 2', async () => {
    editor(flow);
    await form();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    expect(stepTexts()).toHaveLength(6);
    expect(track).toHaveBeenCalledWith('flow_step_added', {});
    for (let n = 6; n > 2; n--) fireEvent.click(screen.getByRole('button', { name: `Remover passo ${n}` }));
    expect(stepTexts()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Remover passo 1' })).toBeDisabled();
  });

  it('reorders with the keyboard (space, arrow down, space) and saves the new order', async () => {
    editor(flow);
    await form();
    const handle = screen.getByRole('button', { name: 'Reordenar passo 1' });
    act(() => handle.focus());
    const tick = () => act(() => new Promise((r) => setTimeout(r, 0))); // dnd-kit attaches its key listener on the next tick
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    await tick();
    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    await tick();
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    await tick();
    await waitFor(() => expect(stepTexts().slice(0, 2)).toEqual(['Colher hemoculturas antes do antimicrobiano', 'Dosar lactato']));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![1].payload.steps.map((s: { id: string }) => s.id)).toEqual(['step-2', 'step-1', 'step-3', 'step-4', 'step-5']);
  });

  it('axe: no violations', async () => {
    const { container } = editor(flow, retrievabilityFixture[sepseCardIds.pacote]!.subs);
    await form();
    expect(await violations(container)).toEqual([]);
  });
});

describe('CardEditor: case', () => {
  it('a card born from a map op ({} payload) starts empty; empty stages are omitted on save', async () => {
    editor(extra[caseId]!);
    await form();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Preencha pelo menos uma etapa do caso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Apresentação'), { target: { value: 'Febre e confusão' } });
    fireEvent.change(screen.getByLabelText('Conduta'), { target: { value: 'Pacote da primeira hora' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![1].payload).toEqual({
      caseSteps: [{ stage: 'presentation', text: 'Febre e confusão' }, { stage: 'management', text: 'Pacote da primeira hora' }],
    });
  });

  it('G06: each stage explains itself in a tooltip, reachable by keyboard', async () => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver; // Radix tooltip measures its arrow
    editor(extra[caseId]!);
    await form();
    const help = screen.getByRole('button', { name: 'O que é Exames?' });
    act(() => help.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/o desafio mostra as etapas anteriores e pergunta os exames/);
  });

  it('axe: no violations', async () => {
    const { container } = editor(sepseCards.find((c) => c.id === sepseCardIds.caso)!);
    await form();
    expect(await violations(container)).toEqual([]);
  });
});

describe('CardEditor: note (Conteúdo, D-200)', () => {
  const noteId = '00000000-0000-4000-8000-000000000903';
  beforeEach(() => {
    extra[noteId] = { ...base, id: noteId, type: 'note', title: 'Novo conteúdo', front: null, back: null, payload: {}, rubric: null };
  });

  it('title, text and image only: no answer, no rubric; saves type note', async () => {
    editor(extra[noteId]!);
    await form();
    expect(screen.getByText(/não entra no desafio nem na revisão/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Resposta')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Rubrica' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Imagem da pergunta (opcional)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Sepse é **disfunção** orgânica.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![1]).toMatchObject({ type: 'note', front: 'Sepse é **disfunção** orgânica.', back: null, backAssetId: null, payload: {} });
  });
});

describe('CardEditor: image', () => {
  class FakeXHR {
    static fail = false;
    static last: FakeXHR | null = null;
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    status = 0;
    headers: Record<string, string> = {};
    method = '';
    open(m: string) {
      this.method = m;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    send() {
      FakeXHR.last = this;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      setTimeout(() => {
        if (FakeXHR.fail) this.onerror?.();
        else {
          this.status = 200;
          this.onload?.();
        }
      }, 0);
    }
  }
  beforeEach(() => {
    FakeXHR.fail = false;
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
  });
  afterEach(() => vi.unstubAllGlobals());

  const file = (name: string, type: string, size = 2048) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };
  const pick = (f: File) => fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [f] } });

  const pickIn = (group: HTMLElement, f: File) => fireEvent.change(group.querySelector('input[type="file"]')!, { target: { files: [f] } });

  it('G06: answer image (backAssetId) and an image on a flow step go into the PUT (D-201)', async () => {
    editor(sepseCards.find((c) => c.id === sepseCardIds.qsofa)!); // not `base`: the mock store keeps what the PUT saved
    await form();
    pickIn(screen.getByRole('group', { name: 'Imagem da resposta (opcional)' }), file('a.png', 'image/png'));
    expect(await screen.findByRole('button', { name: 'Remover imagem da resposta' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![1].backAssetId).toEqual(expect.any(String));
    expect(onSaved.mock.calls[0]![1].frontAssetId).toBeNull();
    cleanup();
    onSaved.mockClear();

    editor(sepseCards.find((c) => c.id === sepseCardIds.pacote)!);
    await form();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar imagem ao passo 2' }));
    pickIn(screen.getByRole('group', { name: 'Imagem do passo 2 (opcional)' }), file('s.png', 'image/png'));
    expect(await screen.findByRole('button', { name: 'Remover imagem do passo 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar imagem' })).toBeInTheDocument(); // compact slot: the uploader folds back
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const steps = onSaved.mock.calls[0]![1].payload.steps as { assetId?: string }[];
    expect(steps.map((x) => !!x.assetId)).toEqual([false, true, false, false, false]);
  });

  it('G02 concept: question image (add, remove, add again) and shape picker go into the PUT (D-095, D-096)', async () => {
    editor(base);
    await form();
    const group = screen.getByRole('group', { name: 'Formato no mapa' });
    expect(within(group).getAllByRole('button')).toHaveLength(5);
    expect(within(group).getByRole('button', { name: 'Retângulo' })).toHaveAttribute('aria-pressed', 'true');
    pick(file('q.png', 'image/png'));
    expect(await screen.findByRole('button', { name: 'Remover imagem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar imagem' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.getByText('Aparece na frente do card e no desafio.')).toBeInTheDocument();
    pick(file('q.png', 'image/png'));
    await screen.findByRole('button', { name: 'Remover imagem' });
    fireEvent.click(within(group).getByRole('button', { name: 'Losango' }));
    expect(within(group).getByRole('button', { name: 'Losango' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No mapa, a imagem da pergunta só aparece no formato Retângulo.')).toBeInTheDocument();
    await screen.findByText('Formato salvo.'); // G04: the shape saves on its own (without the unsaved image)
    expect(onSaved.mock.calls[0]![1]).toMatchObject({ shape: 'diamond', frontAssetId: null });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
    const [, input] = onSaved.mock.calls[1]!;
    expect(input.shape).toBe('diamond');
    expect(input.frontAssetId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects other formats and > 10 MB before uploading', async () => {
    editor(extra[imageId]!);
    await form();
    pick(file('a.gif', 'image/gif'));
    expect(await screen.findByText('Formato não aceito. Use JPG, PNG ou WebP.')).toBeInTheDocument();
    pick(file('a.png', 'image/png', 11 * 1024 * 1024));
    expect(await screen.findByText('A imagem passa de 10 MB. Reduza e tente de novo.')).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1); // only the GET of the card
  });

  it('needs attribution when the license is not "own" (licença não escolhida)', async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    editor(extra[imageId]!);
    await form();
    const select = screen.getByRole('combobox', { name: 'Licença da imagem' });
    expect(select).toHaveTextContent('Própria');
    expect(screen.queryByLabelText('Autoria / atribuição')).toBeNull();
    fireEvent.keyDown(select, { key: 'Enter' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Servier Medical Art' }), { key: 'Enter' });
    expect(select).toHaveTextContent('Servier Medical Art');
    pick(file('a.png', 'image/png'));
    expect(await screen.findByText('Licença não escolhida: informe a autoria da imagem para essa licença.')).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Autoria / atribuição'), { target: { value: 'Servier, CC BY 4.0' } });
    pick(file('a.png', 'image/png'));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/v1/uploads/complete', { method: 'POST', body: expect.stringContaining('"license":"servier","attribution":"Servier, CC BY 4.0"') }),
    );
  });

  it('uploads sign → PUT → complete, shows the thumbnail and saves with the asset; failure offers retry', async () => {
    FakeXHR.fail = true;
    editor(extra[imageId]!);
    await form();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Envie uma imagem antes de salvar.')).toBeInTheDocument();

    pick(file('a.png', 'image/png', 4096));
    expect(await screen.findByText('O envio da imagem falhou.')).toBeInTheDocument();
    expect(FakeXHR.last?.method).toBe('PUT');
    expect(FakeXHR.last?.headers['Content-Type']).toBe('image/png');

    FakeXHR.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('img', { name: 'Imagem do card Coração' })).toHaveAttribute('src', expect.stringContaining('-800.webp'));
    expect(track).toHaveBeenCalledWith('image_uploaded', { sizeKb: 4 });
    expect(api).toHaveBeenCalledWith('/v1/uploads/complete', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText('0 máscaras')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![1].payload).toEqual({ assetId: expect.any(String), masks: [] });
  });

  it('a failed save from the full-screen mask editor is reported inside the dialog', async () => {
    editor(extra[imageId]!);
    await form();
    pick(file('a.png', 'image/png', 4096));
    await screen.findByRole('img', { name: 'Imagem do card Coração' });
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir editor de máscaras' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar máscara' }));
    api.mockImplementation(async (p: string, i?: RequestInit) =>
      i?.method === 'PUT' ? { ok: false, error: { code: 'internal', message: 'x' } } : route(p, i),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('axe: no violations', async () => {
    const { container } = editor(extra[imageId]!);
    await form();
    expect(await violations(container)).toEqual([]);
  });
});

describe('CardEditor: shape autosave (G04)', () => {
  const names = { rect: 'Retângulo', pill: 'Pílula', circle: 'Círculo', diamond: 'Losango', hexagon: 'Hexágono' } as const;
  type S = keyof typeof names;
  /** The contract mocks keep state between tests: start from whatever shape the server has now. */
  const shapeEditor = async () => {
    const onShape = vi.fn();
    render(<CardEditor card={asCard(base)} prepare={prepare} onSaved={onSaved} onClose={onClose} onShape={onShape} />);
    await form();
    const group = screen.getByRole('group', { name: 'Formato no mapa' });
    const current = (Object.keys(names) as S[]).find((k) => within(group).getByRole('button', { name: names[k] }).getAttribute('aria-pressed') === 'true')!;
    const [a, b] = (Object.keys(names) as S[]).filter((k) => k !== current);
    const pick = (k: S) => fireEvent.click(within(group).getByRole('button', { name: names[k] }));
    return { onShape, current, a: a!, b: b!, pick, group };
  };
  const puts = () => api.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'PUT').map(([, i]) => JSON.parse(String((i as RequestInit).body)));

  it('previews on the node at once and PUTs only the shape over what the server has; Cancelar keeps it', async () => {
    const { onShape, a, pick } = await shapeEditor();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Não salvo' } });
    pick(a);
    expect(onShape).toHaveBeenCalledWith(base.id, a); // before the PUT answers
    expect(await screen.findByText('Formato salvo.')).toBeInTheDocument();
    expect(puts()).toHaveLength(1);
    expect(puts()[0]).toMatchObject({ shape: a });
    expect(puts()[0].title).not.toBe('Não salvo'); // the unsaved draft stays out
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled(); // the editor stays open
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onShape).toHaveBeenCalledTimes(1); // no rollback on cancel
  });

  it('a failed PUT rolls the node and the picker back to the saved shape', async () => {
    const { onShape, current, a, pick, group } = await shapeEditor();
    api.mockImplementation(async (p: string, i?: RequestInit) => (i?.method === 'PUT' ? { ok: false, error: { code: 'internal', message: 'x' } } : route(p, i)));
    pick(a);
    expect(await screen.findByText('Não deu para salvar o formato. Voltamos ao anterior.')).toBeInTheDocument();
    expect(onShape.mock.calls).toEqual([[base.id, a], [base.id, current]]);
    expect(within(group).getByRole('button', { name: names[current] })).toHaveAttribute('aria-pressed', 'true');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('quick picks: PUTs one at a time and the last pick wins; Salvar waits for them', async () => {
    const { onShape, a, b, pick } = await shapeEditor();
    pick(a);
    pick(b);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(puts().map((x) => x.shape)).toEqual([a, b, b]);
    expect(onShape.mock.calls.map((c) => c[1])).toEqual([a, b]);
  });
});
