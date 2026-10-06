import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardHandles, CardPeek, ConnectBanner, EdgeLabelField, type CardPeekProps } from '.';
import { violations } from '../test-utils';

const peek = (o: Partial<CardPeekProps> = {}) => (
  <CardPeek
    ariaLabel="Card selecionado" typeLabel="Conceito" state="review" stateLabel="Revisitar" title="Choque séptico" summary="Vasopressor para PAM"
    recall={0.58} nextLabel="58% · vence hoje" closeLabel="Fechar" reviewLabel="Revisar este conceito" editLabel="Editar card" editText="Editar" connectLabel="Conectar a outro card" connectText="Conectar"
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
  it('D-1207: Conectar e Editar têm texto visível (não só ícone)', () => {
    render(peek());
    expect(screen.getByRole('button', { name: 'Conectar a outro card' })).toHaveTextContent('Conectar');
    expect(screen.getByRole('button', { name: 'Editar card' })).toHaveTextContent('Editar');
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

describe('CardHandles (D-1207)', () => {
  // jsdom has no PointerEvent: without it fireEvent drops clientX and pointerId
  beforeAll(() => {
    window.PointerEvent ??= class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    } as unknown as typeof PointerEvent;
  });
  const handles = (o = {}) => <CardHandles connectLabel="Conectar Sepse a outro card" resizeLabel="Redimensionar Sepse" onConnect={() => {}} onResize={() => {}} onResizeStep={() => {}} {...o} />;
  it('bolinha conecta; alças fora do gesto do React Flow e com alvo de 44 px; sem violações axe', async () => {
    const onConnect = vi.fn();
    const { container } = render(handles({ onConnect }));
    await userEvent.click(screen.getByRole('button', { name: 'Conectar Sepse a outro card' }));
    expect(onConnect).toHaveBeenCalledTimes(1);
    for (const b of screen.getAllByRole('button')) expect(b).toHaveClass('nodrag', 'nopan', 'size-11');
    expect(await violations(container)).toEqual([]);
  });
  it('arrastar a alça do canto informa o deslocamento e o fim', () => {
    const onResize = vi.fn();
    render(handles({ onResize }));
    const grip = screen.getByRole('button', { name: 'Redimensionar Sepse' });
    fireEvent.pointerDown(grip, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 140, clientY: 120 });
    fireEvent.pointerMove(grip, { pointerId: 2, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientX: 160, clientY: 130 });
    expect(onResize.mock.calls).toEqual([[40, 20, false], [40, 20, true]]);
  });
  it('setas do teclado mudam um passo', async () => {
    const onResizeStep = vi.fn();
    render(handles({ onResizeStep }));
    screen.getByRole('button', { name: 'Redimensionar Sepse' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowUp}');
    expect(onResizeStep.mock.calls).toEqual([[1, 0], [0, -1]]);
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
