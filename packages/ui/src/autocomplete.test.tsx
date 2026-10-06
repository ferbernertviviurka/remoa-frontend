import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autocomplete, type AutocompleteValue } from './autocomplete';
import { violations } from './test-utils';

const OPTS = [
  { value: 'usp', label: 'Universidade de São Paulo', hint: 'São Paulo · SP', keywords: ['USP'] },
  { value: 'ufmg', label: 'Universidade Federal de Minas Gerais', hint: 'Belo Horizonte · MG', keywords: ['UFMG'] },
  { value: 'ufpr', label: 'Universidade Federal do Paraná', hint: 'Curitiba · PR', keywords: ['UFPR'] },
];

let last: AutocompleteValue | null | undefined;
function Demo(p: Partial<React.ComponentProps<typeof Autocomplete>>) {
  const [v, setV] = useState<AutocompleteValue | null>(null);
  return (
    <Autocomplete
      label="Instituição"
      options={OPTS}
      value={v}
      onValueChange={(n) => { last = n; setV(n); }}
      emptyLabel="Nada"
      clearAriaLabel="Limpar"
      {...p}
    />
  );
}

describe('Autocomplete', () => {
  beforeEach(() => { last = undefined; });

  it('axe fechado e aberto', async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    expect(await violations(container)).toEqual([]);
    await user.click(screen.getByRole('combobox'));
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it('filtra sem acento por nome, sigla e cidade', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const cb = screen.getByRole('combobox');
    await user.type(cb, 'sao paulo');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.clear(cb);
    await user.type(cb, 'ufmg');
    expect(screen.getByRole('option').textContent).toContain('Minas Gerais');
    await user.clear(cb);
    await user.type(cb, 'curitiba');
    expect(screen.getByRole('option').textContent).toContain('Paraná');
    expect(cb).toHaveAttribute('aria-expanded', 'true');
  });

  it('teclado: setas, End, Home, Enter e Esc', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const cb = screen.getByRole('combobox');
    await user.click(cb);
    await user.keyboard('{ArrowDown}');
    expect(cb.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]!.id);
    await user.keyboard('{End}');
    expect(cb.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2]!.id);
    await user.keyboard('{Home}{Enter}');
    expect(last).toEqual({ value: 'usp', label: 'Universidade de São Paulo' });
    expect(cb).toHaveValue('Universidade de São Paulo');
    expect(cb).toHaveAttribute('aria-expanded', 'false');
    await user.click(cb);
    await user.keyboard('{Escape}');
    expect(cb).toHaveAttribute('aria-expanded', 'false');
  });

  it('texto livre devolve value null', async () => {
    const user = userEvent.setup();
    render(<Demo allowCustom customLabel={(t) => `Usar “${t}”`} />);
    await user.type(screen.getByRole('combobox'), 'Faculdade X');
    await user.click(screen.getByRole('option', { name: 'Usar “Faculdade X”' }));
    expect(last).toEqual({ value: null, label: 'Faculdade X' });
  });

  it('vazio mostra emptyLabel; limpar zera', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const cb = screen.getByRole('combobox');
    await user.type(cb, 'zzz');
    expect(screen.getByText('Nada')).toBeInTheDocument();
    await user.clear(cb);
    await user.click(screen.getByRole('option', { name: /Paraná/ }));
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(last).toBeNull();
    expect(cb).toHaveValue('');
  });

  it('limita a renderização e avisa', async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ value: `v${i}`, label: `Escola ${i}` }));
    const user = userEvent.setup();
    render(<Demo options={many} moreLabel={(n) => `Primeiras ${n}`} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(50);
    expect(screen.getByText('Primeiras 50')).toBeInTheDocument();
  });

  it('erro liga aria-invalid e descrição', () => {
    render(<Demo error="Obrigatório" />);
    const cb = screen.getByRole('combobox');
    expect(cb).toHaveAttribute('aria-invalid', 'true');
    expect(cb).toHaveAccessibleDescription('Obrigatório');
  });
});
