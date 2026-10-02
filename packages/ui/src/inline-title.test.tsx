import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineTitle } from './inline-title';
import { violations } from './test-utils';

const base = { value: 'Sepse', inputLabel: 'Nome do mapa', editHint: 'Renomear mapa' };

describe('InlineTitle', () => {
  it('em repouso é um h1 com botão, sem input', () => {
    render(<InlineTitle {...base} onSave={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sepse');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('clique vira edição; Enter salva só se mudou', async () => {
    const onSave = vi.fn();
    render(<InlineTitle {...base} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /Sepse/ }));
    const input = screen.getByRole('textbox', { name: 'Nome do mapa' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Sepse grave{Enter}');
    expect(onSave).toHaveBeenCalledExactlyOnceWith('Sepse grave');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('Esc cancela; vazio não salva', async () => {
    const onSave = vi.fn();
    render(<InlineTitle {...base} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /Sepse/ }));
    await userEvent.type(screen.getByRole('textbox'), 'xyz{Escape}');
    await userEvent.click(screen.getByRole('button', { name: /Sepse/ }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.keyboard('{Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('sem violações axe', async () => {
    const { container } = render(<InlineTitle {...base} onSave={vi.fn()} />);
    expect(await violations(container)).toEqual([]);
  });
});
