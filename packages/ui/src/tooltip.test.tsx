import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './button';
import { Tooltip } from './tooltip';

function Blocked() {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip label="Faltam 3 cards" open={open} onOpenChange={setOpen}>
      <Button aria-disabled="true" onClick={(e) => { e.preventDefault(); setOpen(true); }}>Desafiar</Button>
    </Tooltip>
  );
}

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

describe('Tooltip', () => {
  it('abre no foco pelo teclado', async () => {
    render(<Tooltip label="Dica"><Button>Ir</Button></Tooltip>);
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Dica');
  });
  it('controlado: abre no clique/toque de um botão aria-disabled', async () => {
    render(<Blocked />);
    const b = screen.getByRole('button', { name: 'Desafiar' });
    expect(b).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(b);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Faltam 3 cards');
  });
});
