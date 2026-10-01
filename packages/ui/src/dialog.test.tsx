import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './dialog';
import { Button } from './button';
import { violations } from './test-utils';

const ui = (
  <Dialog title="Título" description="Descrição" closeLabel="Fechar" trigger={<Button>Abrir</Button>}>
    conteúdo
  </Dialog>
);

describe('Dialog', () => {
  it('sem violações axe (aberto)', async () => {
    render(ui);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await violations(document.body)).toEqual([]);
  });
  it('abre e fecha com Esc', async () => {
    render(ui);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('size="full" ocupa a tela inteira', async () => {
    render(
      <Dialog title="Editor" closeLabel="Fechar" size="full" trigger={<Button>Abrir</Button>}>
        x
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Editor' })).toHaveClass('inset-0');
    expect(await violations(document.body)).toEqual([]);
  });
});
