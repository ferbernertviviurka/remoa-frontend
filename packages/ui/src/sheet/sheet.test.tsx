import { useState } from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from './bottom-sheet';
import { CreateCardSheet, type CreateCardSheetProps } from './create-card-sheet';
import { FullSheet } from './full-sheet';
import { violations } from '../test-utils';

function Demo({ height }: { height?: 'auto' | 'half' | 'full' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Painel" closeLabel="Fechar painel" height={height}>
        <button>Dentro</button>
        <button>Outro</button>
      </BottomSheet>
    </>
  );
}

const labels = Object.fromEntries(
  ['concept', 'flowchart', 'case', 'image', 'photo', 'ai', 'pdf', 'anki'].map((k) => [k, { title: `T-${k}`, description: `D-${k}` }]),
) as CreateCardSheetProps['labels'];

const sheetProps = (over: Partial<CreateCardSheetProps> = {}): CreateCardSheetProps => ({
  open: true,
  title: 'Criar card',
  closeLabel: 'Fechar',
  groups: { scratch: 'Do zero', fast: 'Mais rápido' },
  labels,
  badges: { pro: 'Pro', soon: 'Em breve' },
  onSelect: () => {},
  ...over,
});

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
}

// jsdom não tem PointerEvent: clientY precisa ser definido à mão
const ptr = (el: Element, type: string, clientY: number) => {
  const e = createEvent[type as 'pointerDown'](el, { button: 0 });
  Object.defineProperty(e, 'clientY', { value: clientY });
  fireEvent(el, e);
};
const at = (t: number, f: () => void) => {
  vi.spyOn(performance, 'now').mockReturnValue(t);
  f();
};

describe('BottomSheet', () => {
  it('dialog modal, axe ok, foco vai para dentro e volta ao gatilho', async () => {
    render(<Demo />);
    await open();
    const d = screen.getByRole('dialog', { name: 'Painel' });
    expect(d).toBeInTheDocument();
    expect(d.contains(document.activeElement)).toBe(true);
    expect(await violations(document.body)).toEqual([]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });
  it('fecha pela alça', async () => {
    render(<Demo />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar painel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('fecha tocando no scrim', async () => {
    render(<Demo />);
    await open();
    const scrim = document.querySelector('.remoa-bscrim') as HTMLElement;
    await userEvent.click(scrim);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('foco preso: Tab circula dentro do painel', async () => {
    render(<Demo />);
    await open();
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    }
  });
  it('arrastar para baixo além do limiar fecha; arrasto curto e lento volta', () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const handle = screen.getByRole('button', { name: 'Fechar painel' }).parentElement as HTMLElement;
    at(0, () => ptr(handle, 'pointerDown', 100));
    at(400, () => ptr(handle, 'pointerMove', 140));
    at(800, () => ptr(handle, 'pointerUp', 140));
    expect((document.querySelector('.remoa-bsheet') as HTMLElement).style.transform).toBe('');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    at(1000, () => ptr(handle, 'pointerDown', 100));
    at(1400, () => ptr(handle, 'pointerMove', 260));
    at(1800, () => ptr(handle, 'pointerUp', 260));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('arrasto rápido e curto (flick) fecha', () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const handle = screen.getByRole('button', { name: 'Fechar painel' }).parentElement as HTMLElement;
    at(0, () => ptr(handle, 'pointerDown', 100));
    at(40, () => ptr(handle, 'pointerMove', 150));
    at(50, () => ptr(handle, 'pointerUp', 150));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('BottomSheet footer', () => {
  it('footer fica dentro do diálogo (por cima do scrim, foco alcança), fora do painel que desliza, e reserva o rodapé', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="Painel" closeLabel="Fechar painel" footer={<button onClick={onClose}>Fechar barra</button>}>
        <p>conteúdo</p>
      </BottomSheet>,
    );
    const footer = screen.getByRole('button', { name: 'Fechar barra' });
    expect(screen.getByRole('dialog').contains(footer)).toBe(true);
    expect(document.querySelector('.remoa-bsheet')!.contains(footer)).toBe(false); // parado enquanto o painel anima
    expect((screen.getByText('conteúdo').parentElement as HTMLElement).style.paddingBottom).toContain('104px');
    await userEvent.click(footer);
    expect(onClose).toHaveBeenCalled();
    expect(await violations(document.body)).toEqual([]);
  });
});

describe('FullSheet', () => {
  function Editor({ onOpenChange = () => {} }: { onOpenChange?: (o: boolean) => void }) {
    return (
      <FullSheet open title="Novo conceito" onOpenChange={onOpenChange} start={<button onClick={() => onOpenChange(false)}>Cancelar</button>} end={<button>Salvar</button>}>
        <label>
          Título <input />
        </label>
      </FullSheet>
    );
  }
  it('dialog com título visível, Cancelar e Salvar no topo, sem X; axe ok', async () => {
    render(<Editor />);
    const d = screen.getByRole('dialog', { name: 'Novo conceito' });
    expect(d).toHaveClass('remoa-fsheet');
    expect(screen.getByRole('heading', { name: 'Novo conceito' })).toBeVisible();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancelar', 'Salvar']); // nenhum X extra
    expect(d.contains(document.activeElement)).toBe(true);
    expect(await violations(document.body)).toEqual([]);
  });
  it('Esc e Cancelar pedem para fechar', async () => {
    const onOpenChange = vi.fn();
    render(<Editor onOpenChange={onOpenChange} />);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('CreateCardSheet', () => {
  it('mostra as 8 opções em 2 grupos, com alvo ≥ 44 px (min-h) e axe ok', async () => {
    render(<CreateCardSheet {...sheetProps()} />);
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^T-/ })).toHaveLength(8);
    expect(screen.getByRole('button', { name: /T-concept/ })).toHaveClass('min-h-[92px]');
    expect(await violations(document.body)).toEqual([]);
  });
  it('chama onSelect com o tipo', async () => {
    const onSelect = vi.fn();
    render(<CreateCardSheet {...sheetProps({ onSelect })} />);
    await userEvent.click(screen.getByRole('button', { name: /T-photo/ }));
    expect(onSelect).toHaveBeenCalledWith('photo');
  });
  it('bloqueio por plano: pill Pro, onBlocked em vez de onSelect, hint por props', async () => {
    const onSelect = vi.fn();
    const onBlocked = vi.fn();
    render(
      <CreateCardSheet
        {...sheetProps({ onSelect, onBlocked, availability: { pdf: { status: 'limit', hint: 'cota do mês esgotada' }, ai: { status: 'pro', hint: 'restam 0 hoje' } } })}
      />,
    );
    const pdf = screen.getByRole('button', { name: /T-pdf/ });
    expect(pdf).toHaveAttribute('aria-disabled', 'true');
    expect(pdf).toHaveTextContent('cota do mês esgotada');
    await userEvent.click(pdf);
    await userEvent.click(screen.getByRole('button', { name: /T-ai/ }));
    expect(onBlocked).toHaveBeenNthCalledWith(1, 'pdf', 'limit');
    expect(onBlocked).toHaveBeenNthCalledWith(2, 'ai', 'pro');
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(await violations(document.body)).toEqual([]);
  });
  it('Em breve: desabilitada e sem chamada', async () => {
    const onSelect = vi.fn();
    render(<CreateCardSheet {...sheetProps({ onSelect, availability: { anki: { status: 'soon' } } })} />);
    const anki = screen.getByRole('button', { name: /T-anki/ });
    expect(anki).toBeDisabled();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    await userEvent.click(anki);
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('Esc fecha', async () => {
    const onOpenChange = vi.fn();
    render(<CreateCardSheet {...sheetProps({ onOpenChange })} />);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it('movimento reduzido: sem animação própria (regra CSS por data-motion/sistema)', () => {
    document.documentElement.dataset.motion = 'reduced';
    render(<CreateCardSheet {...sheetProps()} />);
    expect(screen.getByRole('dialog')).toHaveClass('remoa-bsheet-host'); // animation: none em tokens.css/motion.css
    delete document.documentElement.dataset.motion;
  });
});
