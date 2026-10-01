import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MAX_MASKS_PER_IMAGE, type CardMask } from '@remoa/contracts';
import { MaskEditor } from './mask-editor';
import { rectToPolygon } from './polygon';
import { violations } from './test-utils';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

let latest: CardMask[] = [];
function Harness({ initial = [] }: { initial?: CardMask[] }) {
  const [masks, setMasks] = useState(initial);
  latest = masks;
  return <MaskEditor src="https://x.test/img-1600.webp" alt="Imagem do card Coração" masks={masks} onChange={setMasks} />;
}

const surface = () => {
  const svg = screen.getByRole('group', { name: 'Área de desenho das máscaras' });
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 500, x: 0, y: 0, right: 1000, bottom: 500, toJSON: () => ({}) } as DOMRect);
  return svg;
};
const dragRect = (svg: Element, a: [number, number], b: [number, number]) => {
  fireEvent.pointerDown(svg, { button: 0, clientX: a[0], clientY: a[1] });
  fireEvent.pointerMove(svg, { clientX: b[0], clientY: b[1] });
  fireEvent.pointerUp(svg, { clientX: b[0], clientY: b[1] });
};
const click = (svg: Element, x: number, y: number) => fireEvent.pointerDown(svg, { button: 0, clientX: x, clientY: y });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MaskEditor', () => {
  it('a drag draws a rectangle: 4-point polygon in 0..1, default label, selected, tracked', () => {
    render(<Harness />);
    const svg = surface();
    dragRect(svg, [100, 100], [300, 250]);
    expect(latest).toHaveLength(1);
    expect(latest[0]!.polygon).toEqual(rectToPolygon({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.5 }));
    expect(latest[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByLabelText('Rótulo da máscara')).toHaveValue('Região 1');
    expect(screen.getByRole('button', { name: 'Máscara: Região 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(track).toHaveBeenCalledWith('mask_created', {});
    expect(screen.getByText(`1 de ${MAX_MASKS_PER_IMAGE} máscaras`)).toBeInTheDocument();
  });

  it('a click (no drag) does not create a mask', () => {
    render(<Harness />);
    dragRect(surface(), [100, 100], [102, 101]);
    expect(latest).toHaveLength(0);
  });

  it('polygon: clicks then clicking the first point closes it; Enter and double-click also close', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'Polígono' }));
    const svg = surface();
    click(svg, 100, 100);
    click(svg, 400, 100);
    click(svg, 250, 300);
    click(svg, 103, 102); // within 12px of the first point
    expect(latest).toHaveLength(1);
    expect(latest[0]!.polygon).toHaveLength(3);

    click(svg, 500, 100);
    click(svg, 700, 100);
    click(svg, 600, 300);
    fireEvent.keyDown(svg, { key: 'Enter' });
    expect(latest).toHaveLength(2);

    click(svg, 800, 100);
    click(svg, 900, 100);
    click(svg, 850, 300);
    click(svg, 850, 300); // second click of the double click
    fireEvent.doubleClick(svg);
    expect(latest).toHaveLength(3);
    expect(latest[2]!.polygon).toHaveLength(3);
  });

  it('select tool: move by drag, resize by corner, relabel, delete with the Delete key', () => {
    const initial: CardMask[] = [{ id: crypto.randomUUID(), polygon: rectToPolygon({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }), label: 'Aorta' }];
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Selecionar' }));
    const svg = surface();
    // move: grab inside (200,150) and drag 100px right
    fireEvent.pointerDown(svg, { button: 0, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(svg, { clientX: 300, clientY: 150 });
    fireEvent.pointerUp(svg, { clientX: 300, clientY: 150 });
    expect(latest[0]!.polygon[0]!.x).toBeCloseTo(0.2);
    // resize: bottom-right corner is now at (400, 200)
    fireEvent.pointerDown(svg, { button: 0, clientX: 400, clientY: 200 });
    fireEvent.pointerMove(svg, { clientX: 600, clientY: 400 });
    fireEvent.pointerUp(svg, { clientX: 600, clientY: 400 });
    expect(latest[0]!.polygon[2]).toEqual({ x: 0.6, y: 0.8 });
    expect(latest[0]!.polygon[0]!.x).toBeCloseTo(0.2);
    // arrows move it
    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect(latest[0]!.polygon[0]!.x).toBeCloseTo(0.19);
    fireEvent.change(screen.getByLabelText('Rótulo da máscara'), { target: { value: 'Arco aórtico' } });
    expect(latest[0]!.label).toBe('Arco aórtico');
    fireEvent.keyDown(screen.getByLabelText('Rótulo da máscara'), { key: 'Delete' }); // typing: not a delete
    expect(latest).toHaveLength(1);
    fireEvent.keyDown(svg, { key: 'Delete' });
    expect(latest).toHaveLength(0);
  });

  it('clicking empty space deselects; the delete button removes the selection', () => {
    const initial: CardMask[] = [{ id: crypto.randomUUID(), polygon: rectToPolygon({ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }), label: 'A' }];
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Selecionar' }));
    const svg = surface();
    click(svg, 150, 75);
    fireEvent.pointerUp(svg, { clientX: 150, clientY: 75 });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir máscara' }));
    expect(latest).toHaveLength(0);
    click(svg, 900, 400);
    expect(screen.queryByLabelText('Rótulo da máscara')).toBeNull();
  });

  it(`stops at ${MAX_MASKS_PER_IMAGE} masks with a message`, () => {
    const initial = Array.from({ length: MAX_MASKS_PER_IMAGE }, (_, i) => ({ id: crypto.randomUUID(), polygon: rectToPolygon({ x: 0, y: 0 }, { x: 0.01, y: 0.01 }), label: `M${i}` }));
    render(<Harness initial={initial} />);
    expect(screen.getByText(`Limite de ${MAX_MASKS_PER_IMAGE} máscaras por imagem.`)).toBeInTheDocument();
    dragRect(surface(), [100, 100], [300, 300]);
    expect(latest).toHaveLength(MAX_MASKS_PER_IMAGE);
  });

  it('keyboard path: "Adicionar máscara" creates a centred rectangle without a pointer', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar máscara' }));
    expect(latest).toHaveLength(1);
    expect(latest[0]!.polygon).toEqual(rectToPolygon({ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.6 }));
    expect(track).toHaveBeenCalledWith('mask_created', {});
  });

  it('polygon closes by itself at 64 vertices (contract max) instead of failing on save', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'Polígono' }));
    const svg = surface();
    for (let i = 0; i < 65; i++) click(svg, 100 + (i % 2) * 400 + i * 5, 100 + i * 4);
    expect(latest).toHaveLength(1);
    expect(latest[0]!.polygon.length).toBeLessThanOrEqual(64);
  });

  it('axe: no violations', async () => {
    const initial: CardMask[] = [{ id: crypto.randomUUID(), polygon: rectToPolygon({ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }), label: 'A' }];
    const { container } = render(<Harness initial={initial} />);
    expect(await violations(container)).toEqual([]);
  });
});
