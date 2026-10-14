import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autocomplete, type AutocompleteOption, type AutocompleteValue } from './autocomplete';
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
    expect(last).toMatchObject({ value: 'usp', label: 'Universidade de São Paulo', custom: false });
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
    expect(last).toEqual({ value: null, label: 'Faculdade X', custom: true });
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

describe('Autocomplete assíncrono', () => {
  const deferred = () => {
    let resolve!: (v: ReadonlyArray<AutocompleteOption>) => void;
    const promise = new Promise<ReadonlyArray<AutocompleteOption>>((r) => { resolve = r; });
    return { promise, resolve };
  };
  const type = (t: string) => fireEvent.change(screen.getByRole('combobox'), { target: { value: t } });
  beforeEach(() => { vi.useFakeTimers(); last = undefined; });
  afterEach(() => vi.useRealTimers());

  it('debounce 200ms, mínimo 2 caracteres e uma única busca', async () => {
    const load = vi.fn().mockResolvedValue([]);
    render(<Demo options={[]} loadOptions={load} />);
    type('u');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(load).not.toHaveBeenCalled();
    type('ur'); type('uro'); type('urol');
    await act(() => vi.advanceTimersByTimeAsync(199));
    expect(load).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]![0]).toBe('urol');
  });

  it('ignora resposta antiga e aborta a anterior', async () => {
    const d1 = deferred(); const d2 = deferred();
    const signals: AbortSignal[] = [];
    const load = vi.fn((_q: string, s: AbortSignal) => { signals.push(s); return signals.length === 1 ? d1.promise : d2.promise; });
    render(<Demo options={[]} loadOptions={load} />);
    type('ab');
    await act(() => vi.advanceTimersByTimeAsync(200));
    type('abc');
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(signals[0]!.aborted).toBe(true);
    expect(screen.getByText('Buscando…')).toHaveAttribute('aria-live', 'polite');
    await act(async () => { d2.resolve([{ value: 'novo', label: 'Novo', description: 'Curitiba · PR' }]); });
    await act(async () => { d1.resolve([{ value: 'velho', label: 'Velho' }]); });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['NovoCuritiba · PR']);
    expect(screen.queryByText('Buscando…')).toBeNull();
  });

  it('vazio, texto livre sempre disponível e option no callback', async () => {
    const load = vi.fn().mockResolvedValue([]);
    render(<Demo options={[]} loadOptions={load} allowCustom />);
    type('xyz');
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(screen.getByRole('option').textContent).toContain('xyz');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(last).toEqual({ value: null, label: 'xyz', custom: true });
  });

  it('empty state sem allowCustom; escolhe com teclado e devolve option', async () => {
    const opt = { value: 'a', label: 'Alfa', description: 'X · SP' };
    const load = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([opt]);
    render(<Demo options={[]} loadOptions={load} />);
    type('zz');
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(screen.getByText('Nada')).toBeInTheDocument();
    type('al');
    await act(() => vi.advanceTimersByTimeAsync(200));
    const cb = screen.getByRole('combobox');
    fireEvent.keyDown(cb, { key: 'ArrowDown' });
    expect(cb).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id);
    fireEvent.keyDown(cb, { key: 'Enter' });
    expect(last).toEqual({ value: 'a', label: 'Alfa', custom: false, option: opt });
  });

  it('Esc fecha e Tab sai sem escolher', async () => {
    const load = vi.fn().mockResolvedValue([{ value: 'a', label: 'Alfa' }]);
    render(<Demo options={[]} loadOptions={load} />);
    const cb = screen.getByRole('combobox');
    type('al');
    await act(() => vi.advanceTimersByTimeAsync(200));
    fireEvent.keyDown(cb, { key: 'ArrowDown' });
    fireEvent.keyDown(cb, { key: 'Tab' });
    expect(last).toBeUndefined();
    expect(cb).toHaveAttribute('aria-expanded', 'false');
    type('al');
    await act(() => vi.advanceTimersByTimeAsync(200));
    fireEvent.keyDown(cb, { key: 'Escape' });
    expect(cb).toHaveAttribute('aria-expanded', 'false');
    expect(last).toBeUndefined();
  });

  it('axe com lista assíncrona aberta', async () => {
    const load = vi.fn().mockResolvedValue([{ value: 'a', label: 'Alfa', description: 'X · SP' }]);
    const { container } = render(<Demo options={[]} loadOptions={load} allowCustom />);
    type('al');
    await act(() => vi.advanceTimersByTimeAsync(200));
    vi.useRealTimers();
    expect(await violations(container)).toEqual([]);
  });
});

describe('Autocomplete estático: acento', () => {
  it('farmacia e tecnico acham com acento', async () => {
    const user = userEvent.setup();
    render(<Demo options={[{ value: 'f', label: 'Farmácia' }, { value: 't', label: 'Técnico(a) em Enfermagem' }]} />);
    const cb = screen.getByRole('combobox');
    await user.type(cb, 'FARMACIA');
    expect(screen.getByRole('option').textContent).toBe('Farmácia');
    await user.clear(cb);
    await user.type(cb, 'tecnico');
    expect(screen.getByRole('option').textContent).toBe('Técnico(a) em Enfermagem');
  });
});
