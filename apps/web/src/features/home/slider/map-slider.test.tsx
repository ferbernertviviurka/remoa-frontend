import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BoardSummary } from '@remoa/contracts';
import { MapSlider } from './map-slider';

const push = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
let plan: { limits: { boards: number | null } } | null = null;
vi.mock('@/features/shell/entitlements', () => ({ useEntitlements: () => ({ entitlements: plan }) }));

// jsdom has no layout: fake the Swiper instance so the component's wiring is what is tested.
type Fake = { isBeginning: boolean; isEnd: boolean; isLocked: boolean; activeIndex: number; previousIndex: number; params: { slidesPerView: number }; slidePrev: () => void; slideNext: () => void };
let inst: Fake;
let props: Record<string, unknown> = {};
vi.mock('swiper/react', () => ({
  Swiper: (p: Record<string, unknown> & { children: React.ReactNode; onSwiper: (s: Fake) => void }) => {
    props = p;
    useEffect(() => p.onSwiper(inst), []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="swiper">{p.children}</div>;
  },
  SwiperSlide: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <div onClick={onClick}>{children}</div>,
}));

const board = (i: number) => ({ id: `b${i}`, title: `Mapa ${i}`, area: 'CM', dueCount: 0, cardCount: 3, edgeCount: 2, updatedAt: new Date(`2026-09-${10 + i}T10:00:00Z`), stateCounts: { review: 0, watch: 0, steady: 1, unknown: 1 }, preview: { nodes: [], edges: [] } }) as unknown as BoardSummary;
const maps = (n: number) => Array.from({ length: n }, (_, i) => board(i + 1));

beforeEach(() => {
  plan = { limits: { boards: null } };
  inst = { isBeginning: true, isEnd: false, isLocked: false, activeIndex: 0, previousIndex: 0, params: { slidesPerView: 3 }, slidePrev: vi.fn(), slideNext: vi.fn() };
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('data-motion'); });

const prev = () => screen.getByRole('button', { name: 'Mapas anteriores' });
const next = () => screen.getByRole('button', { name: 'Próximos mapas' });

describe('MapSlider', () => {
  it('start edge: prev disabled; counter only above 3 slides; arrows call the instance', () => {
    render(<MapSlider maps={maps(6)} />);
    expect(prev()).toBeDisabled();
    expect(next()).toBeEnabled();
    expect(screen.getByText('1–3 de 6')).toBeInTheDocument();
    fireEvent.click(next());
    expect(inst.slideNext).toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Continue de onde parou' })).toHaveAttribute('aria-roledescription', 'carrossel');
  });

  it('end edge disables next; no overflow disables both; no counter with 3 or fewer', () => {
    inst.isBeginning = false; inst.isEnd = true;
    const { unmount } = render(<MapSlider maps={maps(6)} />);
    expect(prev()).toBeEnabled();
    expect(next()).toBeDisabled();
    unmount();
    inst.isBeginning = true; inst.isLocked = true;
    render(<MapSlider maps={maps(2)} />);
    expect(prev()).toBeDisabled();
    expect(next()).toBeDisabled();
    expect(screen.queryByText(/^\d–\d de \d/)).toBeNull();
  });

  it('speed 550, 0 with data-motion=reduced or the system preference', () => {
    const { unmount } = render(<MapSlider maps={maps(2)} />);
    expect(props.speed).toBe(550);
    unmount();
    document.documentElement.dataset.motion = 'reduced';
    render(<MapSlider maps={maps(2)} />);
    expect(props.speed).toBe(0);
    cleanup();
    document.documentElement.dataset.motion = 'full';
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    render(<MapSlider maps={maps(2)} />);
    expect(props.speed).toBe(550); // data-motion=full beats the system
  });

  it('events: slide change tracks direction and index; slide click tracks kind', () => {
    plan = { limits: { boards: 2 } };
    render(<MapSlider maps={maps(2)} />);
    (props.onSlideChange as (s: Fake) => void)({ ...inst, activeIndex: 1, previousIndex: 0 });
    expect(track).toHaveBeenCalledWith('map_slider_navigated', { direction: 'next', index: 1 });
    (props.onSlideChange as (s: Fake) => void)({ ...inst, activeIndex: 0, previousIndex: 1 });
    expect(track).toHaveBeenCalledWith('map_slider_navigated', { direction: 'prev', index: 0 });
    fireEvent.click(screen.getByRole('link', { name: 'Abrir o mapa Mapa 1' }));
    expect(track).toHaveBeenCalledWith('map_slide_clicked', { kind: 'map' });
  });

  it('Free at the limit: locked card CTA tracks the upgrade and goes to /planos', () => {
    plan = { limits: { boards: 2 } };
    render(<MapSlider maps={maps(2)} />);
    expect(screen.getByText('O Free permite até 2 mapas. Faça upgrade para criar o próximo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fazer upgrade/ }));
    expect(track).toHaveBeenCalledWith('upgrade_clicked', { source: 'map_slider_lock' });
    expect(track).toHaveBeenCalledWith('map_slide_clicked', { kind: 'locked' });
    expect(push).toHaveBeenCalledWith('/app/planos?de=map_slider_lock');
  });

  it('Free with 1 map: new card with the remaining count links to /mapas/novo', () => {
    plan = { limits: { boards: 2 } };
    render(<MapSlider maps={maps(1)} />);
    expect(screen.getByText('Você ainda pode criar 1 mapa no plano Free.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar um novo mapa' })).toHaveAttribute('href', '/app/mapas/novo');
  });
});
