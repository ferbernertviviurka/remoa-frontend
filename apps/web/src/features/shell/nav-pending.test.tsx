import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MainSlot, NavPendingProvider } from './nav-pending';
import { Rail, items } from './rail';
import { MobileMenu } from './mobile-menu';

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

  it.each(items.map((i) => i.href))('rail %s: active + skeleton on the click itself, page on the route change', (href) => {
    pathname = href === '/app/hoje' ? '/app/mapas' : '/app/hoje';
    const { rerender } = render(app());
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === href)!;
    fireEvent.click(link, { button: 0 });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(screen.queryByText('página real')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    pathname = href;
    rerender(app());
    expect(screen.getByText('página real')).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('the item of the current page, a ⌘-click or a click from a sub-route that stays put show no skeleton', () => {
    pathname = '/app/mapas';
    render(app());
    fireEvent.click(screen.getByRole('link', { name: 'Mapas' }), { button: 0 });
    fireEvent.click(screen.getByRole('link', { name: /^Revisar/ }), { button: 0, metaKey: true });
    expect(screen.getByText('página real')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mapas' })).toHaveAttribute('aria-current', 'page');
  });

  it('from the map editor, Mapas shows the boards skeleton (the item was already lit)', () => {
    pathname = '/app/mapas/00000000-0000-4000-8000-000000000001';
    render(app());
    fireEvent.click(screen.getByRole('link', { name: 'Mapas' }), { button: 0 });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('MobileMenu', () => {
  const phone = () => (
    <NavPendingProvider>
      <MobileMenu />
      <MainSlot><p>página real</p></MainSlot>
    </NavPendingProvider>
  );
  it.each(['/app/revisar', '/app/mapas', '/app/cobertura', '/app/loja', '/app/conta/perfil'])('%s: active + skeleton on the click', (href) => {
    pathname = '/app/hoje';
    const { rerender } = render(phone());
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === href)!;
    fireEvent.click(link, { button: 0 });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('dialog')).toBeNull(); // fecha ao navegar
    pathname = href;
    rerender(phone());
    expect(screen.getByText('página real')).toBeInTheDocument();
  });
});

describe('MobileMenu a11y', () => {
  it('Esc fecha o menu', () => {
    pathname = '/app/hoje';
    render(<NavPendingProvider><MobileMenu isAdmin /></NavPendingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
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
