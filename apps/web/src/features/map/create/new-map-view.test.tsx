import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PLAN_LIMITS, type MatrixItem } from '@remoa/contracts';
import { NewMapView } from './new-map-view';

const push = vi.fn();
const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
const handle = vi.fn<(e: { code: string; message?: string }) => boolean>(() => false);
const show = vi.fn();
let ent: { limits: { ai_generations: number | null } } | null = null; // useEntitlements without a provider = null (no client-side gate)
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ({ entitlements: ent }) }));
vi.mock('@/features/billing/paywall', () => ({ usePaywall: () => ({ show: (r: string) => show(r), handle: (e: { code: string; message?: string }) => handle(e) }) }));
vi.mock('@/features/import/upload', () => ({ uploadApkg: async () => ({ ok: true, data: { key: 'k' } }) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));

const items: MatrixItem[] = [
  { id: 'i1', area: 'CM', code: '1', title: 'Sepse e choque séptico', parentId: null, targetCards: 40 },
  { id: 'i2', area: 'CM', code: '2', title: 'Pneumonia', parentId: null, targetCards: 30 },
];
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
const name = () => screen.getByLabelText('Nome do mapa') as HTMLInputElement;
const pickItem = async (q: string, label: string) => {
  const box = screen.getByRole('combobox', { name: 'Itens da matriz' });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: q } });
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(label) }));
};
const posted = (path: string) => JSON.parse((api.mock.calls.find((c) => c[0] === path)![1] as RequestInit).body as string);

Object.assign(Element.prototype, { scrollIntoView: () => undefined, hasPointerCapture: () => false, releasePointerCapture: () => undefined });

afterEach(() => {
  ent = null;
  cleanup();
  vi.clearAllMocks();
});

describe('NewMapView: "Sobre o mapa" (F17)', () => {
  it('Em branco: 2 steps, name first with focus, several items by accent-free search, access, one POST with everything (FR-2, FR-5, FR-17)', async () => {
    api.mockImplementation(async (path: string) => (path === '/v1/boards' ? { ok: true, data: { id: 'new1' } } : { ok: true, data: [] }));
    render(<NewMapView items={items} initialPath="blank" />);
    expect(screen.getByRole('button', { name: /Em branco/ }).getAttribute('aria-pressed')).toBe('true');
    next();
    await waitFor(() => expect(document.activeElement).toBe(name()));
    // DOM (= Tab) order: name → area → items → access
    const order = [name(), screen.getByRole('group', { name: 'Grande área' }), screen.getByRole('combobox', { name: 'Itens da matriz' }), screen.getByRole('radio', { name: 'Só eu' })];
    order.slice(1).forEach((el, i) => expect(order[i]!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    fireEvent.change(name(), { target: { value: 'Meu mapa' } });
    await pickItem('SÉPSE', 'Sepse e choque séptico');
    await pickItem('pneumo', 'Pneumonia');
    fireEvent.click(screen.getByRole('radio', { name: 'Público' }));
    expect(screen.getByText('Quem tiver o link pode ver e copiar.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/new1'));
    expect(posted('/v1/boards')).toEqual({ title: 'Meu mapa', area: 'CM', matrixItemIds: ['i1', 'i2'], access: 'public' });
    expect(track).toHaveBeenCalledWith('board_created', {});
    expect(track).toHaveBeenCalledWith('board_linked_to_matrix', { count: 2, suggestedCount: 0 });
    expect(track).toHaveBeenCalledWith('board_access_changed', { from: 'owner', to: 'public', source: 'create' });
  });

  it('keeps the Criar mapa button loading after the POST until the navigation resolves', async () => {
    api.mockImplementation(async (path: string) => (path === '/v1/boards' ? { ok: true, data: { id: 'new1' } } : { ok: true, data: [] }));
    let arrive!: () => void;
    push.mockReturnValueOnce(new Promise<void>((r) => (arrive = r))); // router.push in a transition: pending until the route renders
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    fireEvent.change(name(), { target: { value: 'Meu mapa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/new1'));
    await new Promise((r) => setTimeout(r, 20)); // busy already false (finally ran)
    expect(document.querySelector('[data-loading]')).not.toBeNull();
    arrive();
    await waitFor(() => expect(document.querySelector('[data-loading]')).toBeNull());
  });

  it('empty name and Privado without password block the CTA with the errors on the fields (FR-3, FR-7)', async () => {
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    expect(await screen.findByText('Dê um nome ao mapa.')).toBeTruthy();
    fireEvent.change(name(), { target: { value: 'Sepse' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Privado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    expect(await screen.findByText('A senha é obrigatória para mapas privados.')).toBeTruthy();
    expect(api.mock.calls.some((c) => c[0] === '/v1/boards')).toBe(false);
    fireEvent.change(screen.getByLabelText('Senha do mapa'), { target: { value: 'turma2026' } });
    api.mockResolvedValue({ ok: true, data: { id: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/p1'));
    expect(posted('/v1/boards')).toMatchObject({ access: 'password', password: 'turma2026' });
  });

  it('Outro assunto: no matrix, own message, posts area OUTRO with no items (D-1470)', async () => {
    api.mockImplementation(async (path: string) => (path === '/v1/boards' ? { ok: true, data: { id: 'n' } } : { ok: true, data: [] }));
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    fireEvent.click(within(screen.getByRole('group', { name: 'Grande área' })).getByRole('button', { name: 'Outro assunto' }));
    expect(screen.getByText('Mapas de outro assunto não usam a matriz Enamed.')).toBeTruthy();
    fireEvent.change(name(), { target: { value: 'Direito Civil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(posted('/v1/boards')).toEqual({ title: 'Direito Civil', area: 'OUTRO', matrixItemIds: [], access: 'owner' });
  });

  it('the 6 areas are clickable; leaving CM clears the items, says so, and the picker shows the no-matrix message (FR-4, FR-6)', async () => {
    api.mockImplementation(async (path: string) => (path === '/v1/boards' ? { ok: true, data: { id: 'n' } } : { ok: true, data: [] }));
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    const areas = screen.getByRole('group', { name: 'Grande área' });
    expect(within(areas).getAllByRole('button').every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    expect(within(areas).getAllByRole('button')).toHaveLength(6);
    await pickItem('sepse', 'Sepse');
    fireEvent.click(within(areas).getByRole('button', { name: 'Pediatria' }));
    expect(screen.getByText('Os itens foram limpos porque a área mudou.')).toBeTruthy();
    expect(screen.getByText('A matriz Enamed desta área ainda não está disponível.')).toBeTruthy();
    fireEvent.change(name(), { target: { value: 'Puericultura' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(posted('/v1/boards')).toEqual({ title: 'Puericultura', area: 'PED', matrixItemIds: [], access: 'owner' });
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Como você quer começar?')).toBeTruthy();
  });

  it('shows the API error and stays when create fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', message: 'x' } });
    render(<NewMapView items={items} initialPath="blank" initialItemId="i1" initialStep={1} />);
    expect(name().value).toBe('Sepse e choque séptico'); // ?item= preselects and names
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await screen.findByText('Você chegou ao limite do seu plano.');
    expect(push).not.toHaveBeenCalled();
  });

  it('Anki: file → upload on choosing → "Sobre o mapa" named after the root deck → same name asks existing vs new (FR-1, FR-3, FR-11)', async () => {
    const summary = { decks: [{ id: 'd', name: 'Cardio', cardCount: 2, noteCount: 2 }], noteTypes: [{ id: 'n', name: 'Basic', kind: 'basic', fields: ['Front', 'Back'], noteCount: 2, samples: [{ Front: 'a', Back: 'b' }] }], cardCount: 2, mediaCount: 0 };
    api.mockImplementation(async (path: string) => {
      if (path === '/v1/imports/anki/inspect') return { ok: true, data: summary };
      if (path.startsWith('/v1/imports/anki/existing')) return { ok: true, data: { board: { id: 'old', title: 'Cardio' } } };
      if (path === '/v1/imports/anki') return { ok: true, data: { importId: 'i1' } };
      if (path === '/v1/imports/i1') return { ok: true, data: { importId: 'i1', status: 'done', processed: 2, total: 2, error: null } };
      if (path === '/v1/imports/i1/report') return { ok: true, data: { importId: 'i1', boardIds: ['old'], imported: 0, skippedDuplicate: 2, skippedEmpty: 0, missingMedia: 0, durationMs: 10 } };
      return { ok: true, data: [] };
    });
    render(<NewMapView items={items} initialPath="anki" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'deck.apkg')] } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false));
    next();
    expect(name().value).toBe('Cardio');
    expect((await screen.findByTestId('import-summary')).textContent).toContain('2 cards');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 cards' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Importar no mapa existente (cards repetidos são ignorados)' }));
    await screen.findByText('Relatório da importação');
    expect(posted('/v1/imports/anki').board).toEqual({ title: 'Cardio', area: 'CM', matrixItemIds: [], target: { boardId: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa' }));
    expect(push).toHaveBeenCalledWith('/app/mapas/old');
  });

  it('Anki: Voltar from "Sobre o mapa" keeps the inspected file (FR-1)', async () => {
    const summary = { decks: [{ id: 'd', name: 'Cardio', cardCount: 1, noteCount: 1 }], noteTypes: [], cardCount: 1, mediaCount: 0 };
    api.mockImplementation(async (path: string) =>
      path === '/v1/imports/anki/inspect' ? { ok: true, data: summary } : { ok: true, data: [] },
    );
    render(<NewMapView items={items} initialPath="anki" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'deck.apkg')] } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('deck.apkg')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false);
    expect(api.mock.calls.filter((c) => c[0] === '/v1/imports/anki/inspect')).toHaveLength(1);
  });

  it('PDF on Free (ai_generations 0): the paywall opens with reason pdf and nothing is uploaded', async () => {
    ent = { limits: { ai_generations: PLAN_LIMITS.free.limits.ai_generations } };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    await waitFor(() => expect(show).toHaveBeenCalledWith('pdf'));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('PDF path: file first, then "Sobre o mapa"; area, items and access go in the multipart `board` (D-532)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, data: { boardId: 'pdf1', cards: 3, edges: 2 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['(Sepse e choque septico exige noradrenalina imediata)'], 'apostila.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByText('apostila.pdf')).toBeTruthy();
    next();
    expect(name().value).toBe('apostila');
    await pickItem('sepse', 'Sepse');
    fireEvent.click(screen.getByRole('radio', { name: 'Público' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/pdf1'));
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: FormData; headers: Record<string, string> }];
    expect(url).toMatch(/\/v1\/ai\/generate-pdf$/);
    expect(init.body.get('file')).toBeInstanceOf(File);
    expect(JSON.parse(String(init.body.get('board')))).toEqual({ title: 'apostila', area: 'CM', matrixItemIds: ['i1'], access: 'public' });
    expect(init.headers['content-type']).toBeUndefined();
    expect(api.mock.calls.some((c) => c[0] === '/v1/matrix/links')).toBe(false);
    vi.unstubAllGlobals();
  });

  it.each([
    [422, { code: 'validation', message: 'pdf_too_large' }, 'O PDF passa de 10 MB. Envie um arquivo menor ou divida o material.'],
    [422, { code: 'validation', message: 'pdf_invalid' }, 'Este arquivo não é um PDF. Escolha um arquivo .pdf.'],
    [429, { code: 'rate_limited', message: 'x' }, 'Muitas tentativas. Espere um pouco e tente de novo.'],
    [503, { code: 'ai_unavailable', message: 'ai_not_configured' }, 'A geração de mapas por IA não está disponível neste ambiente. Crie o mapa em branco ou tente mais tarde.'],
    [503, { code: 'ai_unavailable', message: 'provider down' }, 'A IA está indisponível agora. Tente em instantes.'],
  ])('PDF %i before the job starts shows its own message (D-499)', async (status, error, text) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status, json: async () => ({ error }) }));
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    expect(await screen.findByText(text)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('PDF 402 (Free map limit) opens the paywall, no inline error (D-499)', async () => {
    const error = { code: 'quota_exceeded', message: 'boards' };
    handle.mockReturnValueOnce(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 402, json: async () => ({ error }) }));
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    await waitFor(() => expect(handle).toHaveBeenCalledWith(error));
    expect(screen.queryByRole('alert')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('PDF path shows generation progress before opening the map', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { jobId: '11111111-1111-4111-8111-111111111111' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const jobId = '11111111-1111-4111-8111-111111111111';
    let polls = 0;
    api.mockImplementation(async (path: string) => {
      if (!String(path).includes('/v1/ai/jobs/')) return { ok: true, data: [] };
      polls += 1;
      if (polls === 1) return { ok: true, data: { jobId, status: 'running', progress: 30, stage: 'extract', boardId: null, error: null } };
      return { ok: true, data: { jobId, status: 'done', progress: 100, stage: null, boardId: 'pdf1', error: null, cards: 4, edges: 1, pages: 12 } };
    });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['texto longo o bastante para o pdf'], 'apostila.pdf', { type: 'application/pdf' })] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    expect(await screen.findByRole('progressbar', { name: 'Progresso da geração do mapa' })).toBeTruthy();
    expect(await screen.findByText('Extraindo conceitos… 30%')).toBeTruthy();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/mapas/pdf1'));
    expect(track).toHaveBeenCalledWith('board_generated_from_pdf', expect.objectContaining({ cards: 4, edges: 1, pages: 12 }));
    vi.unstubAllGlobals();
  });

  it('failed job shows the server message and "Tentar de novo" calls /retry; dropped cards are told before opening (G22)', async () => {
    const jobId = '11111111-1111-4111-8111-111111111111';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { jobId } }) }));
    let failed = true;
    api.mockImplementation(async (path: string) => {
      if (String(path).endsWith('/retry')) return { ok: true, data: {} };
      if (!String(path).includes('/v1/ai/jobs/')) return { ok: true, data: [] };
      if (failed) return { ok: true, data: { jobId, status: 'failed', progress: 0, stage: null, boardId: null, error: 'no_sourced_cards', ai: { status: 'error', code: 'no_sourced_cards', message: 'Nenhum card tinha trecho de origem.' } } };
      return { ok: true, data: { jobId, status: 'done', progress: 100, stage: null, boardId: 'pdf1', error: null, cards: 4, edges: 1, pages: 2, dropped: 3 } };
    });
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['texto longo o bastante para o pdf'], 'a.pdf', { type: 'application/pdf' })] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    expect(await screen.findByText('Nenhum card tinha trecho de origem.')).toBeTruthy();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText(/3 cards foram descartados/)).toBeTruthy();
    expect(api).toHaveBeenCalledWith(`/v1/ai/jobs/${jobId}/retry`, { method: 'POST' });
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o mapa' }));
    expect(push).toHaveBeenCalledWith('/app/mapas/pdf1');
    vi.unstubAllGlobals();
  });

  it('mapa pronto path: published seeds are listed; until then the edition is still in review', async () => {
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="seed" />);
    next();
    expect(await screen.findByText('Os mapas prontos aparecem aqui quando a revisão editorial publicar a primeira edição.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Adicionar ao meu mapa' })).toBeNull();
  });

  it('live preview mirrors the name', () => {
    api.mockResolvedValue({ ok: true, data: [] });
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    fireEvent.change(name(), { target: { value: 'Choque' } });
    expect(within(screen.getByLabelText('Prévia do seu mapa')).getAllByText('Choque').length).toBeGreaterThan(0);
  });
});

describe('NewMapView: painel explicativo', () => {
  it('trocar a alternativa troca título, passos e limites (via TextMorph) e o painel nunca inventa número', async () => {
    render(<NewMapView items={items} initialPath="pdf" />);
    const panel = () => [...document.querySelectorAll('h2[torph-root] [torph-sr]')].map((e) => e.textContent); // TextMorph keeps the real text in torph-sr
    await waitFor(() => expect(panel()).toContain('Do PDF ao rascunho')); // Torph arrives after the first paint (P-512)
    expect(screen.getAllByText(new RegExp(`Mapas gerados de PDF: não incluso no Free, ${PLAN_LIMITS.pro.limits.ai_generations} por mês no Pro`)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Do meu Anki/ }));
    expect(panel()).toContain('Do Anki para o mapa');
    expect(screen.getAllByText(new RegExp(`Free: ${PLAN_LIMITS.free.ankiImports} importação de até ${PLAN_LIMITS.free.ankiImportMaxCards} cards\\. Pro: sem limite`)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /De um mapa pronto/ }));
    expect(panel()).toContain('Mapas prontos e revisados');
    expect(screen.getAllByText(/A lista mostra a edição já publicada pela revisão editorial/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Em branco/ }));
    expect(panel()).toContain('Comece do zero');
  });

  it('measured paragraphs: one TextMorph per line once the container can be measured', async () => {
    const ctx = { font: '', measureText: (x: string) => ({ width: x.length * 8 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
    render(<NewMapView items={items} initialPath="blank" />);
    await waitFor(() => expect(document.querySelectorAll('li p [torph-root]').length).toBeGreaterThan(3)); // Torph after the first paint (P-512)
    const lines = [...document.querySelectorAll('li p [torph-root]')];
    expect(lines.length).toBeGreaterThan(3); // 3 steps, each wrapped in >= 1 line (200 px / 8 px = 25 chars)
    fireEvent.click(screen.getByRole('button', { name: /Do meu PDF/ }));
    expect(document.querySelector('li p')?.textContent).toContain('PDF');
    vi.restoreAllMocks();
  });
});
