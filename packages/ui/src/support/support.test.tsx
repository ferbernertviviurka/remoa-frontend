import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportFab, SupportModal, TypeChips, ContextDisclosure, FileChip, Thread, TicketList, SupportSuccess, StatusPill } from './index';
import { violations } from '../test-utils';

describe('SupportFab', () => {
  it('é um botão com aria-label, aria-haspopup="dialog" e selo de não lidas', async () => {
    const onClick = vi.fn();
    const { container } = render(<SupportFab label="Suporte" aria-label="Abrir suporte, 2 respostas" unread={2} onClick={onClick} />);
    const b = screen.getByRole('button', { name: 'Abrir suporte, 2 respostas' });
    expect(b).toHaveAttribute('aria-haspopup', 'dialog');
    expect(b).toHaveClass('h-[60px]');
    expect(screen.getByTestId('support-fab-badge')).toHaveTextContent('2');
    expect(screen.getByTestId('support-fab-badge')).toHaveClass('pulse');
    expect(await violations(container)).toEqual([]);
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalled();
  });
  it('sem não lidas, sem selo', () => {
    render(<SupportFab label="Suporte" aria-label="Abrir suporte" />);
    expect(screen.queryByTestId('support-fab-badge')).toBeNull();
  });
});

function Demo({ dirty = false, onDirtyClose }: { dirty?: boolean; onDirtyClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('novo');
  return (
    <>
      <SupportFab label="Suporte" aria-label="Abrir suporte" onClick={() => setOpen(true)} />
      <SupportModal open={open} onOpenChange={setOpen} title="Fale com o suporte" description="Conte o que aconteceu." closeLabel="Fechar" tabsLabel="Suporte" tabs={[{ value: 'novo', label: 'Novo chamado' }, { value: 'chamados', label: 'Meus chamados', count: 1 }]} activeTab={tab} onTabChange={setTab} dirty={dirty} onDirtyClose={onDirtyClose}>
        <button type="button">Primeiro</button>
        <button type="button">Último</button>
      </SupportModal>
    </>
  );
}

describe('SupportModal', () => {
  it('abre como dialog modal nomeado, com abas e contador; sem violações axe', async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir suporte' }));
    const d = await screen.findByRole('dialog', { name: 'Fale com o suporte' });
    expect(d).toHaveAccessibleDescription('Conte o que aconteceu.');
    expect(d).toHaveClass('w-[620px]');
    expect(d).toHaveClass('max-h-[calc(100vh-64px)]');
    expect(within(d).getByRole('tab', { name: 'Meus chamados 1' })).toBeInTheDocument();
    expect(within(d).getByRole('tabpanel')).toBeInTheDocument();
    expect(await violations(document.body)).toEqual([]);
  });
  it('setas movem entre as abas (tabindex móvel)', async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir suporte' }));
    const novo = await screen.findByRole('tab', { name: 'Novo chamado' });
    expect(novo).toHaveAttribute('aria-selected', 'true');
    novo.focus();
    await userEvent.keyboard('{ArrowRight}');
    const ch = screen.getByRole('tab', { name: /Meus chamados/ });
    expect(ch).toHaveAttribute('aria-selected', 'true');
    expect(ch).toHaveFocus();
    expect(ch).toHaveAttribute('tabindex', '0');
  });
  it('prende o foco, fecha com Esc e devolve o foco ao botão', async () => {
    render(<Demo />);
    const fab = screen.getByRole('button', { name: 'Abrir suporte' });
    await userEvent.click(fab);
    const d = await screen.findByRole('dialog');
    for (let i = 0; i < 12; i++) {
      await userEvent.tab();
      expect(d.contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(fab).toHaveFocus());
  });
  it('com texto não enviado, Esc e X pedem confirmação em vez de fechar', async () => {
    const onDirtyClose = vi.fn();
    render(<Demo dirty onDirtyClose={onDirtyClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir suporte' }));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onDirtyClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onDirtyClose).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('TypeChips', () => {
  it('escolha única com aria-pressed; clicar de novo desmarca', async () => {
    const onChange = vi.fn();
    const opts = [{ value: 'bug', label: 'Algo não funciona' }, { value: 'sug', label: 'Sugestão' }];
    const { rerender, container } = render(<TypeChips legend="Sobre o que é?" groupLabel="Tipo de chamado" options={opts} value="" onChange={onChange} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('button', { name: 'Sugestão' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Sugestão' }));
    expect(onChange).toHaveBeenLastCalledWith('sug');
    rerender(<TypeChips legend="Sobre o que é?" groupLabel="Tipo de chamado" options={opts} value="sug" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Sugestão' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Sugestão' }).className).toMatch(/h-11/);
    await userEvent.click(screen.getByRole('button', { name: 'Sugestão' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('ContextDisclosure', () => {
  const items = [{ k: 'Tela atual', v: 'Hoje' }, { k: 'Plano', v: 'Free' }];
  it('expande a lista (aria-expanded; fechada fica inert) e o interruptor liga e desliga', async () => {
    const onEnabledChange = vi.fn();
    const { container } = render(<ContextDisclosure title="Informações técnicas enviadas junto" switchLabel="Incluir informações técnicas" enabled onEnabledChange={onEnabledChange} items={items} note="Nunca enviamos o conteúdo dos seus mapas." />);
    const btn = screen.getByRole('button', { name: 'Informações técnicas enviadas junto' });
    const region = document.getElementById(btn.getAttribute('aria-controls') ?? '');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(region).toHaveAttribute('inert');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(region).not.toHaveAttribute('inert');
    expect(region?.className).toContain('duration-[400ms]');
    expect(screen.getByText('Tela atual')).toBeInTheDocument();
    const sw = screen.getByRole('switch', { name: 'Incluir informações técnicas' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(await violations(container)).toEqual([]);
  });
});

describe('FileChip', () => {
  it('remove pelo botão com rótulo completo', async () => {
    const onRemove = vi.fn();
    render(<FileChip name="captura.png" removeLabel="Remover captura.png" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover captura.png' }));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('Thread', () => {
  it('é um log aria-live; nota interna tem variante âmbar e o rótulo no lugar do autor', async () => {
    const { container } = render(
      <Thread aria-label="Conversa" internalLabel="Nota interna" variant="admin" messages={[
        { id: '1', author: 'Hugo Pires', when: 'há 18 min', body: 'Não salva.', side: 'other' },
        { id: '2', author: 'Você', when: 'agora', body: 'Vou olhar.', side: 'self' },
        { id: '3', author: 'Você', when: 'agora', body: 'Reproduzi no Chrome.', side: 'self', internal: true },
      ]} />,
    );
    const log = screen.getByRole('log', { name: 'Conversa' });
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(within(log).getByText('Nota interna · agora')).toBeInTheDocument();
    const note = screen.getByText('Reproduzi no Chrome.');
    expect(note.className).toContain('bg-watch-bg');
    expect(screen.getByText('Vou olhar.').className).toContain('bg-primary');
    expect(await violations(container)).toEqual([]);
  });
});

describe('TicketList', () => {
  const items = [
    { id: '1038', subject: 'Não consigo importar', meta: '#1038 · Algo não funciona · 1 out', statusLabel: 'Respondido', status: 'ok' as const, unread: true, unreadLabel: 'Resposta não lida' },
    { id: '1021', subject: 'Cobrança duplicada', meta: '#1021 · Cobrança e plano · 24 set', statusLabel: 'Resolvido', status: 'muted' as const },
  ];
  it('lista botões com status e ponto de não lida; clique seleciona', async () => {
    const onSelect = vi.fn();
    const { container } = render(<TicketList aria-label="Meus chamados" items={items} onSelect={onSelect} emptyText="Nenhum chamado." />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Resposta não lida' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /Cobrança duplicada/ }));
    expect(onSelect).toHaveBeenCalledWith('1021');
  });
  it('vazia mostra o texto', () => {
    render(<TicketList aria-label="Meus chamados" items={[]} onSelect={() => undefined} emptyText="Nenhum chamado." />);
    expect(screen.getByText('Nenhum chamado.')).toBeInTheDocument();
  });
});

describe('SupportSuccess e StatusPill', () => {
  it('anuncia o número do chamado com role=status e desenha anel e check', async () => {
    const { container } = render(<SupportSuccess title="Chamado #1042 enviado." text="Recebemos." actions={<button type="button">Fechar</button>} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chamado #1042 enviado.');
    expect(container.querySelector('.draw')).not.toBeNull();
    expect(container.querySelector('.drawc')).not.toBeNull();
    expect(await violations(container)).toEqual([]);
  });
  it('StatusPill mostra o texto do estado', () => {
    render(<StatusPill tone="warn">Aberto</StatusPill>);
    expect(screen.getByText('Aberto').className).toContain('bg-watch-bg');
  });
});
