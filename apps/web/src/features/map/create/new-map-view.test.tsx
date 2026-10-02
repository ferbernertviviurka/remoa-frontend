import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MatrixItem } from '@remoa/contracts';
import { NewMapView } from './new-map-view';

const push = vi.fn();
const api = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

const items: MatrixItem[] = [
  { id: 'i1', area: 'CM', code: '1', title: 'Sepse e choque séptico', parentId: null, targetCards: 40 },
  { id: 'i2', area: 'CM', code: '2', title: 'Pneumonia', parentId: null, targetCards: 30 },
];
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NewMapView', () => {
  it('blank path: 3 steps, suggested name follows the item until edited, POST with matrixItemId', async () => {
    api.mockResolvedValue({ ok: true, data: { id: 'new1' } });
    render(<NewMapView items={items} initialPath="blank" />);
    expect(screen.getByRole('button', { name: /Em branco/ }).getAttribute('aria-pressed')).toBe('true');
    next();
    expect((screen.getByLabelText('Nome do mapa') as HTMLInputElement).value).toBe('Sepse e choque séptico');
    fireEvent.click(screen.getByRole('button', { name: 'Pneumonia' }));
    expect((screen.getByLabelText('Nome do mapa') as HTMLInputElement).value).toBe('Pneumonia');
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Meu mapa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sepse e choque séptico' }));
    expect((screen.getByLabelText('Nome do mapa') as HTMLInputElement).value).toBe('Meu mapa'); // touched: not overwritten
    next();
    expect(screen.getByText('Tudo pronto para criar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/mapas/new1'));
    expect(api).toHaveBeenCalledWith('/v1/boards', { method: 'POST', body: JSON.stringify({ title: 'Meu mapa', area: 'CM', matrixItemId: 'i1' }) });
    expect(track).toHaveBeenCalledWith('board_created', {});
  });

  it('fires board_linked_to_matrix with suggested = the picked item was suggested', async () => {
    api.mockImplementation(async (path: string) =>
      path.startsWith('/v1/matrix/suggest') ? { ok: true, data: [items[1]] } : { ok: true, data: { id: 'new1' } },
    );
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    await screen.findByRole('button', { name: 'Pneumonia' });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Sepse|Pneumonia/ })[0]).toHaveAccessibleName('Pneumonia')); // suggestion first
    fireEvent.click(screen.getByRole('button', { name: 'Pneumonia' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith('board_linked_to_matrix', { count: 1, suggestedCount: 1 });
  });

  it('shows the API error and stays when create fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'quota_exceeded', message: 'x' } });
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Criar mapa' }));
    await screen.findByText('Você chegou ao limite do seu plano.');
    expect(push).not.toHaveBeenCalled();
  });

  it('only Clínica Médica is selectable (D-083); Voltar returns', () => {
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    const areas = screen.getByRole('group', { name: 'Grande área' });
    expect((within(areas).getByRole('button', { name: 'Clínica Médica' }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(areas).getByRole('button', { name: 'Cirurgia' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(areas).getAllByRole('button')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Como você quer começar?')).toBeTruthy();
  });

  it('PDF path: CTA needs a file, then opens "Em breve" and never calls the API', async () => {
    render(<NewMapView items={items} initialPath="pdf" />);
    next();
    next();
    const cta = screen.getByRole('button', { name: 'Gerar rascunho do mapa' }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'apostila.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByText('apostila.pdf')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunho do mapa' }));
    expect(await screen.findByRole('dialog', { name: 'Em breve' })).toBeTruthy();
    // Only the debounced matrix suggestion (F07) may have fired; nothing was generated or imported.
    expect(api.mock.calls.filter(([path]) => !String(path).includes('/v1/matrix/suggest'))).toHaveLength(0);
  });

  it('mapa pronto path: nothing to pick yet, CTA disabled', () => {
    render(<NewMapView items={items} initialPath="seed" />);
    next();
    next();
    expect((screen.getByRole('button', { name: 'Adicionar ao meu mapa' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('live preview mirrors the name', () => {
    render(<NewMapView items={items} initialPath="blank" />);
    next();
    fireEvent.change(screen.getByLabelText('Nome do mapa'), { target: { value: 'Choque' } });
    expect(within(screen.getByLabelText('Prévia do seu mapa')).getAllByText('Choque').length).toBeGreaterThan(0);
  });
});

describe('NewMapView: painel explicativo', () => {
  it('trocar a alternativa troca título, passos e limites (via TextMorph) e o painel nunca inventa número', () => {
    render(<NewMapView items={items} initialPath="pdf" />);
    const panel = () => [...document.querySelectorAll('h2[torph-root] [torph-sr]')].map((e) => e.textContent); // TextMorph keeps the real text in torph-sr
    expect(panel()).toContain('Do PDF ao rascunho');
    expect(screen.getAllByText(/Gerações de mapa por mês: 1 no Free, 20 no Pro/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Do meu Anki/ }));
    expect(panel()).toContain('Do Anki para o mapa');
    expect(screen.getAllByText(/Até 5\.000 cards por importação no Free e 20\.000 no Pro/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /De um mapa pronto/ }));
    expect(panel()).toContain('Mapas prontos e revisados');
    expect(screen.getAllByText(/Ainda não disponível/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Em branco/ }));
    expect(panel()).toContain('Comece do zero');
  });

  it('measured paragraphs: one TextMorph per line once the container can be measured', () => {
    const ctx = { font: '', measureText: (x: string) => ({ width: x.length * 8 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
    render(<NewMapView items={items} initialPath="blank" />);
    const lines = [...document.querySelectorAll('li p [torph-root]')];
    expect(lines.length).toBeGreaterThan(3); // 3 steps, each wrapped in >= 1 line (200 px / 8 px = 25 chars)
    fireEvent.click(screen.getByRole('button', { name: /Do meu PDF/ }));
    expect(document.querySelector('li p')?.textContent).toContain('PDF');
    vi.restoreAllMocks();
  });
});
