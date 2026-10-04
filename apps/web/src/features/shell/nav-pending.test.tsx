import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MainSlot, NavPendingProvider } from './nav-pending';
import { Rail } from './rail';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
afterEach(cleanup);

const app = () => (
  <NavPendingProvider>
    <Rail />
    <MainSlot><p>página real</p></MainSlot>
  </NavPendingProvider>
);

describe('MainSlot', () => {
  it('rail click shows the destination skeleton instead of the stale page; the route change shows the real page', () => {
    pathname = '/';
    const { rerender } = render(app());
    expect(screen.getByText('página real')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Mapas' }), { button: 0 });
    expect(screen.queryByText('página real')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('link', { name: 'Mapas' })).toHaveAttribute('aria-current', 'page');
    pathname = '/app/mapas';
    rerender(app());
    expect(screen.getByText('página real')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('without a rail click (back/forward, full load) never shows a skeleton', () => {
    pathname = '/app/revisar';
    render(app());
    expect(screen.getByText('página real')).toBeInTheDocument();
  });

  it('tabs without a skeleton keep the current page', () => {
    pathname = '/';
    render(app());
    fireEvent.click(screen.getByRole('link', { name: 'Loja' }), { button: 0 });
    expect(screen.getByText('página real')).toBeInTheDocument();
  });
});

describe('PendingLink (G02)', () => {
  it('a map tile click shows the editor skeleton until the route changes; modifier clicks do not', async () => {
    const { PendingLink } = await import('./nav-pending');
    pathname = '/app/mapas';
    const id = '00000000-0000-4000-8000-000000000001';
    const page = () => (
      <NavPendingProvider>
        <PendingLink href={`/app/mapas/${id}`}>Sepse</PendingLink>
        <MainSlot><p>página real</p></MainSlot>
      </NavPendingProvider>
    );
    const { rerender } = render(page());
    fireEvent.click(screen.getByRole('link', { name: 'Sepse' }), { button: 0, metaKey: true });
    expect(screen.getByText('página real')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Sepse' }), { button: 0 });
    expect(screen.queryByText('página real')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    pathname = `/app/mapas/${id}`;
    rerender(page());
    expect(screen.getByText('página real')).toBeInTheDocument();
  });
});
