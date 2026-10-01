import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EdgeLabel } from './edge-label';
import { violations } from './test-utils';

const base = { emptyText: 'Sem rótulo não vira pergunta', inputLabel: 'Rótulo da conexão', buttonLabel: 'Editar rótulo' };

describe('EdgeLabel', () => {
  it('sem rótulo mostra o aviso', () => {
    render(<EdgeLabel {...base} label={null} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Editar rótulo' })).toHaveTextContent('Sem rótulo não vira pergunta');
  });
  it('Enter salva o texto novo', async () => {
    const onSave = vi.fn();
    render(<EdgeLabel {...base} label={null} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox', { name: 'Rótulo da conexão' }), ' causa {Enter}');
    expect(onSave).toHaveBeenCalledExactlyOnceWith('causa');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('Esc cancela e blur sem mudança não salva', async () => {
    const onSave = vi.fn();
    render(<EdgeLabel {...base} label="causa" onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), 'x{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.tab();
    expect(onSave).not.toHaveBeenCalled();
  });
  it('apagar o texto salva null', async () => {
    const onSave = vi.fn();
    render(<EdgeLabel {...base} label="causa" onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.tab();
    expect(onSave).toHaveBeenCalledExactlyOnceWith(null);
  });
  it('sem violações axe', async () => {
    const { container } = render(<EdgeLabel {...base} label="causa" onSave={vi.fn()} />);
    expect(await violations(container)).toEqual([]);
  });
});
