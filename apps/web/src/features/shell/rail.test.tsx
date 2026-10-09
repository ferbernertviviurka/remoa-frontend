import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Rail } from './rail';

vi.mock('@/features/questions/flags',()=>({useQuestionFeatureFlags:()=>({import:true,catalog:true,sessions:true}),questionDestinationEnabled:()=>true}));
const push = vi.fn();
let pathname = '/';
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push }), useSearchParams: () => search }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Rail', () => {
  it('marks Hoje as current on /app/hoje and shows the due badge on Revisar', () => {
    pathname = '/app/hoje';
    render(<Rail dueTotal={12} />);
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Mapas/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveTextContent('12');
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAccessibleName(/12/);
  });

  it('marks the section by prefix and hides the badge at zero', () => {
    pathname = '/app/mapas/abc';
    render(<Rail dueTotal={0} />);
    expect(screen.getByRole('link', { name: 'Mapas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Hoje' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Revisar' }).textContent).toBe('Revisar');
  });

  it('the challenge mode of a map belongs to Revisar', () => {
    pathname = '/app/mapas/abc';
    search = new URLSearchParams('modo=desafio');
    render(<Rail dueTotal={0} />);
    expect(screen.getByRole('link', { name: 'Revisar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Mapas' })).not.toHaveAttribute('aria-current');
    search = new URLSearchParams();
  });

  it('leaves the account to the navbar (D-607)', () => {
    render(<Rail />);
    expect(screen.queryByRole('button', { name: 'Minha conta' })).toBeNull();
  });
});

describe('Rail Calendário (F25 FR-1)', () => {
  it('sits after Revisar (4th link) and pulses a dot only when something starts within 24 h', () => {
    pathname = '/app/calendario';
    const { rerender } = render(<Rail />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(9); // Progresso is still on the rail (Q-107)
    expect(links[3]).toHaveAccessibleName('Calendário');
    expect(links[3]).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Há compromisso nas próximas 24 horas')).toBeNull();
    rerender(<Rail calendarSoon />);
    expect(screen.getByRole('link', { name: /Calendário/ })).toHaveAccessibleName(/Há compromisso nas próximas 24 horas/);
  });
});

describe('Rail admin item (F19 FR-11)', () => {
  it('is absent for non-admins and a link to /admin for admins', () => {
    pathname = '/app/hoje';
    const { rerender } = render(<Rail dueTotal={0} />);
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    rerender(<Rail dueTotal={0} isAdmin />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });
});
