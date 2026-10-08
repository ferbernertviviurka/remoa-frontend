import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Position, type EdgeProps, type NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';
import { MOBILE_MAP_SEMANTIC_ZOOM, type Card } from '@remoa/contracts';
import type { CardNode, LinkEdge } from '../../canvas/graph';
import { MobileCardNode, MobileLinkEdge, MobileNodesContext, isOverviewZoom, matchesQuery, mobileEnds, type MobileNodesCtx } from '.';

const zoom = vi.hoisted(() => ({ value: 1 }));
vi.mock('@xyflow/react', async (orig) => ({
  ...(await orig<typeof import('@xyflow/react')>()),
  useStore: (sel: (s: { transform: number[] }) => unknown) => sel({ transform: [0, 0, zoom.value] }),
  useInternalNode: () => undefined,
  Handle: () => null,
  BaseEdge: ({ path, markerEnd, style }: { path: string; markerEnd?: string; style?: { strokeWidth?: number } }) => (
    <path d={path} data-testid="edge" data-marker={markerEnd ?? ''} data-width={style?.strokeWidth} />
  ),
  EdgeLabelRenderer: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ ok: false })) }));

const card = (o: Partial<Card> = {}): Card => ({
  id: 'c1', boardId: 'b', type: 'concept', title: 'Sepse', shape: 'rect', frontAssetId: null, backAssetId: null, size: null, tags: [], front: 'Disfunção orgânica grave.', back: null,
  source: null, status: 'draft', order: 0, reviewerId: null, updatedAt: new Date(), position: { x: 0, y: 0 }, ...o,
} as Card);
const ctx = (o: Partial<MobileNodesCtx> = {}): MobileNodesCtx => ({
  heat: { c1: { r: 0.58, state: 'review', due: new Date('2020-01-01') } } as MobileNodesCtx['heat'], query: '', heatLayer: true, labels: true, selectedId: null, endOfToday: Date.now(),
  selectCard: () => {}, prepare: async () => false, ...o,
});
const node = (c: Card, selected = false) => ({ id: c.id, data: { card: c }, selected }) as unknown as NodeProps<CardNode>;
const edge = (label: string | null) => ({ id: 'e1', source: 'c1', target: 'c2', sourceX: 0, sourceY: 0, targetX: 100, targetY: 50, sourcePosition: Position.Right, targetPosition: Position.Left, data: { label } }) as unknown as EdgeProps<LinkEdge>;
const withCtx = (c: MobileNodesCtx, ui: ReactNode) => <MobileNodesContext.Provider value={c}>{ui}</MobileNodesContext.Provider>;

beforeEach(() => { zoom.value = 1; });
afterEach(cleanup);

describe('zoom semântico (FR-6)', () => {
  it('o limiar vem do contrato: 80% ainda é completo, abaixo é visão geral', () => {
    expect(isOverviewZoom(MOBILE_MAP_SEMANTIC_ZOOM)).toBe(false);
    expect(isOverviewZoom(0.79)).toBe(true);
  });
  it('card: completo a 100% e a 80%; visão geral a 60% (sem resumo nem lembrança, título 19 px)', () => {
    const { rerender } = render(withCtx(ctx(), <MobileCardNode {...node(card())} />));
    expect(screen.getByText('Disfunção orgânica grave.')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
    zoom.value = 0.8;
    rerender(withCtx(ctx(), <MobileCardNode {...node(card())} />));
    expect(screen.getByText('Disfunção orgânica grave.')).toBeInTheDocument();
    zoom.value = 0.6;
    rerender(withCtx(ctx(), <MobileCardNode {...node(card())} />));
    expect(screen.queryByText('Disfunção orgânica grave.')).toBeNull();
    expect(screen.queryByText('58%')).toBeNull();
    expect(screen.getByText('Sepse')).toHaveStyle({ fontSize: 'var(--map-text-overview)' });
    expect(screen.getByText('Revisitar')).toBeInTheDocument();
  });
  it('conexão: rótulos a 100%, sem rótulos abaixo de 80% ou com a camada desligada', () => {
    const { rerender } = render(withCtx(ctx(), <MobileLinkEdge {...edge('suspeita')} />));
    expect(screen.getByText('suspeita')).toBeInTheDocument();
    zoom.value = 0.6;
    rerender(withCtx(ctx(), <MobileLinkEdge {...edge('suspeita')} />));
    expect(screen.queryByText('suspeita')).toBeNull();
    expect(screen.getByTestId('edge')).toBeInTheDocument(); // a linha continua
    zoom.value = 1;
    rerender(withCtx(ctx({ labels: false }), <MobileLinkEdge {...edge('suspeita')} />));
    expect(screen.queryByText('suspeita')).toBeNull();
  });
});

describe('traçado da conexão (D-1572)', () => {
  const a = { x: 0, y: 0, w: 150, h: 100 };
  it('colunas diferentes saem pelos lados, mesmo com o alvo bem abaixo; um sobre o outro, por cima/baixo', () => {
    expect(mobileEnds(a, { x: 300, y: 900, w: 150, h: 100 })).toMatchObject({ sourcePosition: Position.Right, targetPosition: Position.Left, sourceX: 150, targetX: 300 });
    expect(mobileEnds(a, { x: -300, y: 900, w: 150, h: 100 })).toMatchObject({ sourcePosition: Position.Left, targetPosition: Position.Right, sourceX: 0, targetX: -150 });
    expect(mobileEnds(a, { x: 40, y: 300, w: 150, h: 100 })).toMatchObject({ sourcePosition: Position.Bottom, targetPosition: Position.Top });
  });
  it('uma curva só de card a card, sem trecho reto compartilhado entre colunas', () => {
    render(<svg>{withCtx(ctx(), <MobileLinkEdge {...edge('a')} />)}</svg>);
    const d = screen.getByTestId('edge').getAttribute('d')!;
    expect(d).toMatch(/^M\s?0,0 C/);
    expect(d).not.toMatch(/[LQ]/);
  });
});

describe('estados e seleção do card', () => {
  it.each([['review', 'Revisitar'], ['watch', 'Acompanhar'], ['steady', 'Mais estável'], ['unknown', 'Sem revisões']] as const)('estado %s mostra "%s"', (state, text) => {
    render(withCtx(ctx({ heat: state === 'unknown' ? {} : ({ c1: { r: 0.9, state } } as never) }), <MobileCardNode {...node(card())} />));
    expect(screen.getByText(text)).toBeInTheDocument();
  });
  it('nome acessível com título, tipo, estado, lembrança e vencimento; clique seleciona', () => {
    const selectCard = vi.fn();
    render(withCtx(ctx({ selectCard }), <MobileCardNode {...node(card(), true)} />));
    const b = screen.getByRole('button', { name: 'Sepse, Conceito, Revisitar, lembrança 58%, vence hoje' });
    expect(b).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(b);
    expect(selectCard).toHaveBeenCalledWith('c1');
  });
  it('fluxograma sem o texto dos passos mostra a contagem', () => {
    render(withCtx(ctx(), <MobileCardNode {...node(card({ type: 'flow', front: null, preview: { steps: 5 } } as never))} />));
    expect(screen.getByText('5 passos')).toBeInTheDocument();
  });
});

describe('busca (FR-3)', () => {
  it('matchesQuery ignora acento e caixa; vazio casa tudo', () => {
    expect(matchesQuery('', 'x')).toBe(true);
    expect(matchesQuery('LACTATO', 'Dosar lactáto')).toBe(true);
    expect(matchesQuery('choque', 'Sepse', null)).toBe(false);
  });
  it('sem correspondência esmaece; limpar restaura', () => {
    const { rerender } = render(withCtx(ctx({ query: 'choque' }), <MobileCardNode {...node(card())} />));
    expect(screen.getByRole('button')).toHaveAttribute('data-dimmed');
    rerender(withCtx(ctx({ query: 'sepse' }), <MobileCardNode {...node(card())} />));
    expect(screen.getByRole('button')).not.toHaveAttribute('data-dimmed');
  });
});

describe('conexões do celular (FR-7)', () => {
  it('sem rótulo aparece em âmbar e vira botão quando editável', () => {
    const editLabel = vi.fn();
    render(withCtx(ctx({ editLabel }), <MobileLinkEdge {...edge(null)} />));
    const b = screen.getByRole('button', { name: /rótulo/i });
    expect(b).toHaveTextContent('sem rótulo');
    expect(b.className).toContain('--state-watch-bg');
    fireEvent.click(b);
    expect(editLabel).toHaveBeenCalledWith('e1');
  });
  it('as do card selecionado ficam na cor da marca e mais grossas (seta acompanha)', () => {
    const { container, rerender } = render(<svg>{withCtx(ctx(), <MobileLinkEdge {...edge('a')} />)}</svg>);
    expect(container.querySelector('marker path')).toHaveAttribute('fill', 'var(--state-unknown-soft)');
    rerender(<svg>{withCtx(ctx({ selectedId: 'c2' }), <MobileLinkEdge {...edge('a')} />)}</svg>);
    expect(container.querySelector('marker path')).toHaveAttribute('fill', 'var(--primary)');
  });
  it('visão geral (< 80%): conexão sem seta e com traço mais grosso (MapaMobileVisao)', () => {
    const { container, rerender } = render(<svg>{withCtx(ctx(), <MobileLinkEdge {...edge('a')} />)}</svg>);
    expect(screen.getByTestId('edge')).toHaveAttribute('data-marker', 'url(#mm-arrow-e1)');
    expect(screen.getByTestId('edge')).toHaveAttribute('data-width', '2.2');
    zoom.value = 0.6;
    rerender(<svg>{withCtx(ctx(), <MobileLinkEdge {...edge('a')} />)}</svg>);
    expect(container.querySelector('marker')).toBeNull();
    expect(screen.getByTestId('edge')).toHaveAttribute('data-marker', '');
    expect(screen.getByTestId('edge')).toHaveAttribute('data-width', '3.6');
    zoom.value = 1;
  });
});
