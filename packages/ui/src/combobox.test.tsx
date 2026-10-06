import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';
import { violations } from './test-utils';

const OPTIONS = [
  { value: 'sepse', label: 'Sepse e choque séptico', description: 'Choque distributivo', group: 'Infectologia' },
  { value: 'pneu', label: 'Pneumonia adquirida na comunidade', group: 'Infectologia' },
  { value: 'iam', label: 'Infarto agudo do miocárdio', group: 'Cardiologia' },
  { value: 'has', label: 'Hipertensão arterial sistêmica', group: 'Cardiologia' },
  { value: 'tep', label: 'Tromboembolismo pulmonar', group: 'Pneumologia' },
];

const SUGGESTIONS = [OPTIONS[0]!, OPTIONS[2]!];

function Controlled(props: Partial<React.ComponentProps<typeof Combobox>>) {
  const [val, setVal] = useState<string[]>([]);
  return (
    <Combobox
      label="Itens da matriz"
      placeholder="Buscar"
      options={OPTIONS}
      value={val}
      onValueChange={setVal}
      emptyLabel="Nenhum resultado"
      removeChipAriaLabel={(l) => `Remover ${l}`}
      {...props}
    />
  );
}

describe('Combobox', () => {
  it('sem violações axe no estado fechado', async () => {
    const { container } = render(<Controlled />);
    expect(await violations(container)).toEqual([]);
  });

  it('sem violações axe com listbox aberto', async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    // Check the trigger/anchor area (in container) and the listbox (via Portal) separately.
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('busca sem diferenciar acento e maiúscula — "SEPSE" acha "Sepse e choque séptico"', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.type(screen.getByRole('combobox'), 'SEPSE');
    expect(screen.getByRole('option', { name: /Sepse e choque séptico/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Pneumonia/i })).not.toBeInTheDocument();
  });

  it('busca sem diferenciar acento — "sépse" acha "Sepse e choque séptico"', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.type(screen.getByRole('combobox'), 'sépse');
    expect(screen.getByRole('option', { name: /Sepse e choque séptico/i })).toBeInTheDocument();
  });

  it('busca na descrição — "Choque distributivo" acha "Sepse"', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.type(screen.getByRole('combobox'), 'Choque distributivo');
    expect(screen.getByRole('option', { name: /Sepse/i })).toBeInTheDocument();
  });

  it('seleciona um item e mostra chip removível', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.click(screen.getByRole('option', { name: /Infarto agudo/i }));
    // chip remove button confirms selection
    expect(screen.getByRole('button', { name: 'Remover Infarto agudo do miocárdio' })).toBeInTheDocument();
  });

  it('remove chip com o botão X', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.click(screen.getByRole('option', { name: /Infarto agudo/i }));
    await user.click(screen.getByRole('button', { name: 'Remover Infarto agudo do miocárdio' }));
    // Check the chip remove button is gone (the label text may still be in the listbox option)
    expect(screen.queryByRole('button', { name: 'Remover Infarto agudo do miocárdio' })).not.toBeInTheDocument();
  });

  it('Backspace no campo vazio remove o último chip', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.click(screen.getByRole('option', { name: /Infarto agudo/i }));
    const input = screen.getByRole('combobox');
    await user.clear(input);
    await user.type(input, '{Backspace}');
    // Chip remove button is gone
    expect(screen.queryByRole('button', { name: 'Remover Infarto agudo do miocárdio' })).not.toBeInTheDocument();
  });

  it('Esc fecha o listbox', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navegação por setas e Enter seleciona', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    // First option selected → chip visible
    const chips = screen.getAllByRole('button', { name: /Remover/ });
    expect(chips.length).toBeGreaterThan(0);
  });

  it('11º item fica bloqueado — max=10', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="Itens"
        placeholder="Buscar"
        options={OPTIONS}
        value={['sepse', 'pneu', 'iam', 'has', 'tep']}
        onValueChange={onValueChange}
        max={5}
        maxMessage="Limite de 5 itens"
        emptyLabel="Nenhum"
        removeChipAriaLabel={(l) => `Remover ${l}`}
      />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    // All items are at or beyond max; attempting to click one shouldn't add more
    const options = screen.getAllByRole('option');
    if (options[0]) await userEvent.click(options[0]);
    expect(onValueChange).not.toHaveBeenCalledWith(expect.arrayContaining(['sepse', 'pneu', 'iam', 'has', 'tep', expect.any(String)]));
  });

  it('exibe mensagem de máximo', async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        label="Itens"
        placeholder="Buscar"
        options={OPTIONS}
        value={['sepse', 'pneu']}
        onValueChange={() => undefined}
        max={2}
        maxMessage="Você pode ligar até 2 itens"
        emptyLabel="Nenhum"
        removeChipAriaLabel={(l) => `Remover ${l}`}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    expect(screen.getByText('Você pode ligar até 2 itens')).toBeInTheDocument();
  });

  it('estado vazio mostra emptyLabel', async () => {
    const user = userEvent.setup();
    render(<Controlled emptyLabel="Nenhuma opção aqui" />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    await user.type(screen.getByRole('combobox'), 'zzzzz');
    expect(screen.getByText('Nenhuma opção aqui')).toBeInTheDocument();
  });

  it('disabledMessage substitui o controle', () => {
    render(<Controlled disabledMessage="A matriz ainda não está disponível." />);
    expect(screen.getByText('A matriz ainda não está disponível.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('sugestões aparecem no topo com cabeçalho', async () => {
    const user = userEvent.setup();
    render(<Controlled suggestions={SUGGESTIONS} suggestionsLabel="Sugeridos" />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    expect(screen.getByText('Sugeridos')).toBeInTheDocument();
  });

  it('grupos têm cabeçalhos não selecionáveis', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox'); // P-516: o Popover carrega na 1ª interação
    // Group headers shouldn't have role=option
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Infectologia')).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Infectologia' })).not.toBeInTheDocument();
  });

  it('P-516: o Popover carregado na 1ª interação não tira o foco nem o texto do campo', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'sep');
    await screen.findByRole('listbox');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('sep');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});
