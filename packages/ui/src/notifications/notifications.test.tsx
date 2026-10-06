import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BellButton } from './bell-button';
import { NotificationGroups } from './notification-item';
import { NotificationPopover, type NotificationTab } from './notification-popover';
import { CategoryChips, NotificationPrefsTable, PauseRemindersRow, ReminderTimeChoice } from './prefs';
import { formatMeta, groupsOf, prefRows, sample } from './fixtures';
import { violations } from '../test-utils';

describe('BellButton', () => {
  it('selo com contagem, 9+ e some em 0; aria-expanded vem por prop', () => {
    const { rerender } = render(<BellButton count={3} label="Notificações, 3 não lidas" aria-expanded={false} />);
    const b = screen.getByRole('button', { name: 'Notificações, 3 não lidas' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(b).toHaveTextContent('3');
    expect(screen.getByTestId('bell-icon').className).toContain('nt-shake');
    rerender(<BellButton count={12} label="x" />);
    expect(screen.getByRole('button')).toHaveTextContent('9+');
    rerender(<BellButton count={0} label="x" />);
    expect(screen.getByRole('button')).toHaveTextContent('');
    expect(screen.getByTestId('bell-icon').className).not.toContain('nt-shake');
  });
  it('reinicia a sacudida quando a contagem sobe', () => {
    const { rerender } = render(<BellButton count={1} label="x" />);
    const first = screen.getByTestId('bell-icon');
    rerender(<BellButton count={2} label="x" />);
    expect(screen.getByTestId('bell-icon')).not.toBe(first);
  });
  it('alvo de 44 px (size-11) e sem violações axe', async () => {
    const { container } = render(<BellButton count={2} label="Notificações, 2 não lidas" />);
    expect(screen.getByRole('button').className).toContain('size-11');
    expect(await violations(container)).toEqual([]);
  });
});

function Demo({ initialOpen = true, state = 'ready' as 'ready' | 'loading' | 'error', items = sample }) {
  const [list, setList] = useState(items);
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState<NotificationTab>('all');
  const unread = list.filter((i) => i.unread).length;
  const shown = tab === 'unread' ? list.filter((i) => i.unread) : list;
  const read = (id: string) => setList((l) => l.map((i) => (i.id === id ? { ...i, unread: false } : i)));
  return (
    <>
      <NotificationPopover
        trigger={<BellButton count={unread} label="Notificações" />} open={open} onOpenChange={setOpen} dialogLabel="Central de notificações" title="Notificações" markAllLabel="Marcar tudo como lido"
        onMarkAll={() => setList((l) => l.map((i) => ({ ...i, unread: false })))} settingsLabel="Preferências de notificação" settingsHref="/notificacoes" tabsLabel="Filtrar" tabAllLabel="Todas" tabUnreadLabel="Não lidas"
        tab={tab} onTabChange={setTab} unreadCount={unread} seeAllLabel="Ver todas as notificações" seeAllHref="/notificacoes" emptyLabel="Nenhuma notificação por aqui." allReadLabel="Tudo lido. Bom trabalho."
        state={state} loadingLabel="Carregando…" error={{ message: 'Falhou', retryLabel: 'Tentar de novo', onRetry: () => setList(items) }}
        groups={groupsOf(shown)} formatMeta={formatMeta} markReadLabel="Marcar como lida" onOpen={read} onMarkRead={read}
      />
    </>
  );
}

describe('NotificationPopover', () => {
  it('abre como dialog com foco no título, abas e grupos; sem violações axe', async () => {
    render(<Demo />);
    const dialog = await screen.findByRole('dialog', { name: 'Central de notificações' });
    expect(screen.getByRole('heading', { name: 'Notificações' })).toHaveFocus();
    expect(within(dialog).getByRole('tablist', { name: 'Filtrar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: /Não lidas/ })).toHaveTextContent('3');
    for (const g of ['Hoje', 'Ontem', 'Esta semana', 'Antes']) expect(within(dialog).getByRole('group', { name: g })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/notificacoes');
    expect(await violations(document.body)).toEqual([]);
  });
  it('ponto marca como lida sem navegar; contagem e aba atualizam; "Marcar tudo" some em 0', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    await screen.findByRole('dialog');
    await u.click(screen.getAllByRole('button', { name: 'Marcar como lida' })[0]!);
    expect(screen.getByRole('tab', { name: /Não lidas/ })).toHaveTextContent('2');
    await u.click(screen.getByRole('button', { name: 'Marcar tudo como lido' }));
    expect(screen.queryByRole('button', { name: 'Marcar tudo como lido' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcar como lida' })).toBeNull();
  });
  it('aba Não lidas sem itens mostra "Tudo lido"; vazio mostra mensagem de vazio', async () => {
    const u = userEvent.setup();
    const { unmount } = render(<Demo items={sample.map((i) => ({ ...i, unread: false }))} />);
    await u.click(await screen.findByRole('tab', { name: 'Não lidas' }));
    expect(screen.getByText('Tudo lido. Bom trabalho.')).toBeInTheDocument();
    unmount();
    render(<Demo items={[]} />);
    expect(await screen.findByText('Nenhuma notificação por aqui.')).toBeInTheDocument();
  });
  it('Esc fecha e devolve o foco ao sino', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    await screen.findByRole('dialog');
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Notificações' })).toHaveFocus();
  });
  it('fechado: o sino já é o gatilho e o painel só monta no clique (P-512); Esc devolve o foco', async () => {
    const u = userEvent.setup();
    render(<Demo initialOpen={false} />);
    const bell = screen.getByRole('button', { name: 'Notificações' });
    expect(bell).toHaveAttribute('aria-haspopup', 'dialog');
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
    await u.click(bell);
    expect(await screen.findByRole('dialog', { name: 'Central de notificações' })).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(bell).toHaveAttribute('aria-controls', screen.getByRole('dialog').id);
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bell).toHaveFocus();
  });
  it('carregando mostra região de status; erro mostra "Tentar de novo"', async () => {
    const { unmount } = render(<Demo state="loading" />);
    expect(await screen.findByRole('status')).toHaveAttribute('aria-busy', 'true');
    unmount();
    render(<Demo state="error" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
  it('itens entram em cascata de 35 ms', async () => {
    render(<Demo />);
    const links = (await screen.findAllByRole('link', { name: /há |ontem|out|set/ })).map((a) => a.parentElement!);
    expect(links[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(links[2]).toHaveStyle({ animationDelay: '70ms' });
  });
});

describe('NotificationItem (página)', () => {
  it('Abrir, Marcar como lida e Remover chamam os callbacks; lida não tem o botão de marcar', async () => {
    const u = userEvent.setup();
    const onRemove = vi.fn(); const onMarkRead = vi.fn(); const onOpen = vi.fn();
    const { container } = render(<NotificationGroups variant="page" groups={groupsOf(sample.slice(0, 3))} formatMeta={formatMeta} markReadLabel="Marcar como lida" openLabel="Abrir" removeLabel="Remover notificação" onRemove={onRemove} onMarkRead={onMarkRead} onOpen={onOpen} />);
    expect(screen.getAllByRole('button', { name: 'Marcar como lida' })).toHaveLength(2);
    await u.click(screen.getAllByRole('button', { name: 'Marcar como lida' })[0]!);
    await u.click(screen.getAllByRole('button', { name: 'Remover notificação' })[2]!);
    expect(onMarkRead).toHaveBeenCalledWith('n1');
    expect(onRemove).toHaveBeenCalledWith('n3');
    const abrir = screen.getAllByRole('link', { name: 'Abrir' })[0]!;
    abrir.addEventListener('click', (e) => e.preventDefault());
    await u.click(abrir);
    expect(onOpen).toHaveBeenCalledWith('n1');
    expect(await violations(container)).toEqual([]);
  });
  it('não lida em negrito', () => {
    render(<NotificationGroups groups={groupsOf(sample.slice(0, 3))} formatMeta={formatMeta} markReadLabel="Marcar como lida" />);
    expect(screen.getByText(sample[0]!.title).className).toContain('font-extrabold');
    expect(screen.getByText(sample[2]!.title).className).not.toContain('font-extrabold');
  });
});

describe('Preferências', () => {
  const tableProps = { typeHeader: 'Tipo de aviso', appHeader: 'App', emailHeader: 'E-mail', notApplicableLabel: 'Não se aplica', lockedLabel: 'Sempre enviado', lockedHint: 'Sempre enviamos', cellLabel: (t: string, c: 'app' | 'email') => (c === 'app' ? `${t} no app` : `${t} por e-mail`) };
  it('interruptores role=switch, cadeado e linha só e-mail; muted esmaece sem desabilitar', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<NotificationPrefsTable rows={prefRows(true)} onChange={onChange} {...tableProps} />);
    const sw = screen.getByRole('switch', { name: 'Lembrete de revisão por e-mail' });
    expect(sw).toBeChecked();
    expect(sw.className).toContain('opacity-45');
    expect(screen.getByRole('switch', { name: 'Mapa pronto por e-mail' }).className).not.toContain('opacity-45');
    await u.click(sw);
    expect(onChange).toHaveBeenCalledWith('review', 'email', false);
    expect(screen.getAllByRole('img', { name: /Sempre enviado/ })).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Não se aplica' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Volte quando sumir no app' })).toBeNull();
    expect(await violations(container)).toEqual([]);
  });
  it('pausa, horário e chips de categoria', async () => {
    const u = userEvent.setup();
    const onPause = vi.fn(); const onTime = vi.fn(); const onCat = vi.fn();
    const { container } = render(
      <>
        <PauseRemindersRow title="Pausar e-mails de lembrete" description="Calendário…" checked={false} onCheckedChange={onPause} />
        <ReminderTimeChoice title="Horário" groupLabel="Horário" note="Brasília" options={['07:00', '08:00', '12:00', '20:00']} value="07:00" onChange={onTime} />
        <CategoryChips label="Categoria" value="all" onChange={onCat} items={[{ id: 'all', label: 'Todas', count: 3 }, { id: 'rev', label: 'Revisão', count: 0 }]} />
      </>,
    );
    await u.click(screen.getByRole('switch', { name: /Pausar e-mails de lembrete/ }));
    expect(onPause).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: '07:00' })).toHaveAttribute('aria-pressed', 'true');
    await u.click(screen.getByRole('button', { name: '20:00' }));
    expect(onTime).toHaveBeenCalledWith('20:00');
    expect(screen.getByRole('button', { name: /Todas/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Revisão' })).toHaveTextContent(/^Revisão$/);
    await u.click(screen.getByRole('button', { name: 'Revisão' }));
    expect(onCat).toHaveBeenCalledWith('rev');
    expect(await violations(container)).toEqual([]);
  });
});
