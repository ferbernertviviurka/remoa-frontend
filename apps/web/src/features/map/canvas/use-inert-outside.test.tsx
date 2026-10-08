import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useInertOutside } from './use-inert-outside';

function Page({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useInertOutside(ref, active);
  return (
    <div>
      <nav data-testid="nav">
        <a href="#">Mapas</a>
      </nav>
      <main>
        <header data-testid="header">
          <button>Renomear</button>
          <p aria-live="polite" data-testid="status">
            Salvo
          </p>
        </header>
        <section>
          <div data-testid="map">mapa</div>
          <div data-inert-keep="" data-testid="pill">
            <button>Sair</button>
          </div>
          <div ref={ref} data-testid="panel">
            <button>Revelar</button>
          </div>
        </section>
      </main>
      <div data-testid="already" inert>
        x
      </div>
    </div>
  );
}

afterEach(cleanup);

describe('useInertOutside (D-1573)', () => {
  it('makes everything outside the layer inert, except kept elements and live regions; restores on deactivation', () => {
    const { rerender } = render(<Page active />);
    expect(screen.getByTestId('nav')).toHaveAttribute('inert');
    expect(screen.getByTestId('map')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Renomear', hidden: true })).toHaveAttribute('inert');
    expect(screen.getByTestId('header')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('status')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('pill')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('panel')).not.toHaveAttribute('inert');

    rerender(<Page active={false} />);
    for (const id of ['nav', 'map']) expect(screen.getByTestId(id)).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Renomear' })).not.toHaveAttribute('inert');
    expect(screen.getByTestId('already')).toHaveAttribute('inert');
  });

  it('inactive touches nothing', () => {
    render(<Page active={false} />);
    expect(screen.getByTestId('nav')).not.toHaveAttribute('inert');
  });
});
