import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardPeek, ConnectBanner, EdgeLabelField, type CardPeekProps } from '.';
import { violations } from '../test-utils';

const peek = (o: Partial<CardPeekProps> = {}) => (
  <CardPeek
    ariaLabel="Card selecionado" typeLabel="Conceito" state="review" stateLabel="Revisitar" title="Choque séptico" summary="Vasopressor para PAM"
    recall={0.58} nextLabel="58% · vence hoje" closeLabel="Fechar" reviewLabel="Revisar este conceito" editLabel="Editar card" connectLabel="Conectar a outro card"
    onClose={() => {}} onReview={() => {}} onEdit={() => {}} onConnect={() => {}} {...o}
  />
);

describe('CardPeek', () => {
  it('mostra tipo, estado, título, resumo e próxima revisão; sem violações axe', async () => {
    const { container } = render(peek());
    expect(screen.getByRole('region', { name: 'Card selecionado' })).toBeInTheDocument();
    for (const x of ['Conceito', 'Revisitar', 'Choque séptico', 'Vasopressor para PAM', '58% · vence hoje']) expect(screen.getByText(x)).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('as quatro ações disparam', async () => {
    const f = { onClose: vi.fn(), onReview: vi.fn(), onEdit: vi.fn(), onConnect: vi.fn() };
    render(peek(f));
    await userEvent.click(screen.getByRole('button', { name: 'Revisar este conceito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar card' }));
    await userEvent.click(screen.getByRole('button', { name: 'Conectar a outro card' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    for (const fn of Object.values(f)) expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('ConnectBanner e EdgeLabelField', () => {
  it('a faixa cancela', async () => {
    const onCancel = vi.fn();
    const { container } = render(<ConnectBanner text="Toque no card que se liga a “X”" cancelLabel="Cancelar conexão" onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar conexão' }));
    expect(onCancel).toHaveBeenCalled();
    expect(await violations(container)).toEqual([]);
  });
  const field = (o = {}) => <EdgeLabelField ariaLabel="Rótulo da conexão" inputLabel="Rótulo (pergunta)" placeholder="Ex." saveLabel="Salvar" skipLabel="Pular" onSave={() => {}} onSkip={() => {}} {...o} />;
  it('foca o campo, salva com Enter, pula com o botão e com Esc', async () => {
    const onSave = vi.fn(), onSkip = vi.fn();
    const { container } = render(field({ onSave, onSkip }));
    const input = screen.getByRole('textbox', { name: 'Rótulo (pergunta)' });
    expect(input).toHaveFocus();
    await userEvent.type(input, ' evolui para {Enter}');
    expect(onSave).toHaveBeenCalledWith('evolui para');
    await userEvent.click(screen.getByRole('button', { name: 'Pular' }));
    await userEvent.keyboard('{Escape}');
    expect(onSkip).toHaveBeenCalledTimes(2);
    expect(await violations(container)).toEqual([]);
  });
});
