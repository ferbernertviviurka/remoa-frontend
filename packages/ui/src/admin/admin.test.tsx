import { useState, type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSidebar, AdminHeader, AdminSearch, PeriodSegmented, StatCard, BarChart, AdminSection, AttentionItem, SummaryChip, FilterGroup, DataTable, PersonCell, Drawer, DrawerFacts, DrawerTimeline, DrawerAuditTrail, DrawerActions, ReasonDialog, StatusPill, type DataColumn } from '../index';
import { violations } from '../test-utils';

const items = [
  { id: 'overview', label: 'Visão geral', icon: 'grid' as const, href: '/admin' },
  { id: 'support', label: 'Suporte', icon: 'lifebuoy' as const, href: '/admin/suporte', badge: 9, badgeLabel: '9 chamados abertos' },
];

describe('AdminSidebar', () => {
  it('é uma nav nomeada; item ativo com aria-current; contador legível; Voltar ao app', async () => {
    const { container } = render(<AdminSidebar aria-label="Administração" brandLabel="remoa" badge="ADMIN" items={items} activeId="overview" account={{ initial: 'V', name: 'Você', email: 'admin@admin.com' }} backLabel="Voltar ao app" backHref="/" />);
    const nav = screen.getByRole('navigation', { name: 'Administração' });
    expect(nav).toHaveClass('w-[264px]');
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Suporte/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('9 chamados abertos')).toHaveClass('sr-only');
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao app' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'remoa' })).toHaveAttribute('href', '/'); // G14: the logo goes back to the app too
    expect(await violations(container)).toEqual([]);
  });
});

describe('AdminHeader, AdminSearch e PeriodSegmented', () => {
  it('h1 de página e busca com rótulo', async () => {
    const onValueChange = vi.fn();
    const { container } = render(<AdminHeader title="Usuários" subtitle="Gestão de contas"><AdminSearch label="Buscar" placeholder="Buscar por nome ou e-mail" value="" onValueChange={onValueChange} /></AdminHeader>);
    expect(screen.getByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'a');
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(await violations(container)).toEqual([]);
  });
  it('o marcador desliza para a opção escolhida (400 ms) e aria-pressed acompanha', async () => {
    function P() {
      const [v, setV] = useState('30');
      return <PeriodSegmented aria-label="Período" options={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }, { value: '90', label: '90 dias' }]} value={v} onValueChange={setV} />;
    }
    const { container } = render(<P />);
    const marker = screen.getByTestId('period-marker');
    expect(marker.style.transform).toBe('translateX(100%)');
    expect(marker.className).toContain('duration-[400ms]');
    await userEvent.click(screen.getByRole('button', { name: '90 dias' }));
    expect(marker.style.transform).toBe('translateX(200%)');
    expect(screen.getByRole('button', { name: '90 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '30 dias' })).toHaveAttribute('aria-pressed', 'false');
    expect(await violations(container)).toEqual([]);
  });
});

describe('StatCard, BarChart e blocos', () => {
  it('KPI com cascata, variação e mini-barras decorativas', async () => {
    const { container } = render(<StatCard label="Total de contas" value="1.284" icon="users" delta="+312" bars={[0.2, 0.5, 1]} index={2} />);
    const art = screen.getByRole('article');
    expect(art.style.animationDelay).toBe('140ms');
    expect(art).toHaveTextContent('Total de contas');
    expect(art).toHaveTextContent('1.284');
    expect(art).toHaveTextContent('+312');
    const bars = container.querySelectorAll('.growy');
    expect(bars).toHaveLength(3);
    expect((bars[1] as HTMLElement).style.animationDelay).toBe('40ms');
    expect(bars[0]?.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(await violations(container)).toEqual([]);
  });
  it('gráfico é uma imagem nomeada, 18 ms entre barras', async () => {
    const { container } = render(<BarChart title="Crescimento no período" aria-label="Gráfico de novas contas e novos mapas por dia" series={[{ a: 1, b: 2 }, { a: 2, b: 4 }]} legend={['Novas contas', 'Novos mapas']} startLabel="há 30 dias" endLabel="hoje" />);
    expect(screen.getByRole('img', { name: /Gráfico de novas contas/ })).toBeInTheDocument();
    const bars = container.querySelectorAll('.growy');
    expect(bars).toHaveLength(4);
    expect((bars[2] as HTMLElement).style.animationDelay).toBe('18ms');
    expect((bars[3] as HTMLElement).style.height).toBe('100%');
    expect(await violations(container)).toEqual([]);
  });
  it('seção, atenção, resumo e filtros', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <AdminSection title="Precisa de atenção" action={<a href="/x">Ver todas</a>}>
        <AttentionItem count={2} text="indicações em revisão" href="/admin/indicacoes" />
        <SummaryChip value={12} label="contas" />
        <FilterGroup label="Status" options={[{ value: 'all', label: 'Todos' }, { value: 'on', label: 'Ativo' }]} value="all" onValueChange={onValueChange} />
      </AdminSection>,
    );
    expect(screen.getByRole('link', { name: '2 indicações em revisão' })).toHaveAttribute('href', '/admin/indicacoes');
    const g = screen.getByRole('group', { name: 'Status' });
    expect(within(g).getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(g).getByRole('button', { name: 'Ativo' }));
    expect(onValueChange).toHaveBeenCalledWith('on');
    expect(await violations(container)).toEqual([]);
  });
});

type U = { id: string; name: string; email: string; plan: string; status: string };
const users: U[] = [
  { id: 'u1', name: 'Gabi Lopes', email: 'gabi@exemplo.com', plan: 'Free', status: 'Ativo' },
  { id: 'u2', name: 'Hugo Pires', email: 'hugo@exemplo.com', plan: 'Pro', status: 'Pendente' },
];
const cols: DataColumn<U>[] = [
  { key: 'user', header: 'Usuário', cell: (u) => <PersonCell name={u.name} sub={u.email} /> },
  { key: 'plan', header: 'Plano', cell: (u) => u.plan },
  { key: 'status', header: 'Status', cell: (u) => <StatusPill tone="ok">{u.status}</StatusPill> },
];
const base = { caption: 'Usuários', columns: cols, rowKey: (u: U) => u.id, emptyText: 'Nada encontrado com esses filtros.' };

describe('DataTable', () => {
  it('é uma <table> semântica com caption, cabeçalhos de coluna e linhas; linhas entram em cascata de 70 ms', async () => {
    const { container } = render(<DataTable {...base} rows={users} />);
    const t = screen.getByRole('table', { name: 'Usuários' });
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Usuário', 'Plano', 'Status']);
    expect(within(t).getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    const rows = within(t).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect((rows[2] as HTMLElement).style.animationDelay).toBe('70ms');
    expect(within(t).getByRole('cell', { name: /Gabi Lopes/ })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('selecionar linha: botão da coluna principal com aria-pressed; clique na linha também', async () => {
    const onRowSelect = vi.fn();
    const { container } = render(<DataTable {...base} rows={users} onRowSelect={onRowSelect} selectedKey="u2" rowLabel={(u) => `Abrir ${u.name}`} />);
    expect(screen.getByRole('button', { name: 'Abrir Hugo Pires' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Abrir Gabi Lopes' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Gabi Lopes' }));
    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith(users[0]);
    await userEvent.click(screen.getByText('Pro'));
    expect(onRowSelect).toHaveBeenLastCalledWith(users[1]);
    expect(await violations(container)).toEqual([]);
  });
  it('estados: vazio, carregando (aria-busy) e erro com tentar de novo', async () => {
    const onRetry = vi.fn();
    const { rerender, container } = render(<DataTable {...base} rows={[]} />);
    expect(screen.getByText('Nada encontrado com esses filtros.')).toBeInTheDocument();
    rerender(<DataTable {...base} rows={[]} status="loading" loadingLabel="Carregando usuários" />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando usuários');
    rerender(<DataTable {...base} rows={[]} status="error" errorText="Não foi possível carregar." retryLabel="Tentar de novo" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalled();
    expect(await violations(container)).toEqual([]);
  });
  it('paginação de 25 por página: Anterior desabilitado na 1ª, Próxima avança', async () => {
    const onPageChange = vi.fn();
    const pg = { page: 1, total: 60, onPageChange, summary: 'Mostrando 1–25 de 60', navLabel: 'Paginação', prevLabel: 'Anterior', nextLabel: 'Próxima' };
    const { rerender } = render(<DataTable {...base} rows={users} pagination={pg} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    rerender(<DataTable {...base} rows={users} pagination={{ ...pg, page: 3 }} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});

describe('Drawer', () => {
  function D() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Abrir gaveta</button>
        <Drawer open={open} onOpenChange={setOpen} title="Carla Souza" subtitle="carla@exemplo.com" badge={<StatusPill tone="ok">Ativo</StatusPill>} closeLabel="Fechar" footer={<DrawerActions note="Toda ação pede um motivo."><button type="button">Suspender</button></DrawerActions>}>
          <DrawerFacts items={[{ k: 'ID', v: 'U8-7K2' }]} />
          <DrawerTimeline title="Linha do tempo" steps={[{ label: 'Conta criada', when: '2 out' }]} />
          <DrawerAuditTrail title="Registrado agora na auditoria" entries={[{ id: 'a_1050', text: 'Suspensão' }]} />
        </Drawer>
      </>
    );
  }
  it('abre da direita como dialog; foco preso; Esc fecha e devolve o foco', async () => {
    render(<D />);
    const opener = screen.getByRole('button', { name: 'Abrir gaveta' });
    await userEvent.click(opener);
    const d = await screen.findByRole('dialog', { name: 'Carla Souza' });
    expect(d).toHaveClass('inright');
    expect(d).toHaveClass('w-[480px]');
    expect(within(d).getByText('U8-7K2')).toBeInTheDocument();
    expect(within(d).getByRole('list')).toBeInTheDocument();
    expect(within(d).getByText('a_1050')).toBeInTheDocument();
    for (let i = 0; i < 8; i++) {
      await userEvent.tab();
      expect(d.contains(document.activeElement)).toBe(true);
    }
    expect(await violations(document.body)).toEqual([]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

describe('ReasonDialog', () => {
  const props = { title: 'Suspender conta', summary: 'Carla Souza perde o acesso na hora.', reasonLabel: 'Motivo (obrigatório)', tooShortText: 'Escreva ao menos 8 caracteres.', errorText: 'Não foi possível concluir.', confirmLabel: 'Suspender', cancelLabel: 'Cancelar', doneLabel: 'Concluir', receiptText: (id: string) => `Ação registrada na auditoria (${id})` };
  it('é alertdialog com resumo e campo de motivo; motivo curto não confirma', async () => {
    const onConfirm = vi.fn();
    render(<ReasonDialog open onOpenChange={() => undefined} onConfirm={onConfirm} {...props} />);
    const d = screen.getByRole('alertdialog', { name: 'Suspender conta' });
    expect(d).toHaveAccessibleDescription('Carla Souza perde o acesso na hora.');
    const field = within(d).getByLabelText('Motivo (obrigatório)');
    await userEvent.type(field, 'curto');
    await userEvent.click(within(d).getByRole('button', { name: 'Suspender' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(within(d).getByRole('alert')).toHaveTextContent('Escreva ao menos 8 caracteres.');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(await violations(document.body)).toEqual([]);
  });
  it('espaços nas pontas não contam; com 8+ chama onConfirm com o motivo e mostra o recibo da auditoria', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ auditId: 'a_1050' });
    const onConfirmed = vi.fn();
    const onOpenChange = vi.fn();
    render(<ReasonDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} onConfirmed={onConfirmed} {...props} />);
    await userEvent.type(screen.getByLabelText('Motivo (obrigatório)'), '   abuso   ');
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText('Motivo (obrigatório)'));
    await userEvent.type(screen.getByLabelText('Motivo (obrigatório)'), 'Abuso confirmado em 3 contas');
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(onConfirm).toHaveBeenCalledWith('Abuso confirmado em 3 contas');
    expect(await screen.findByRole('status')).toHaveTextContent('Ação registrada na auditoria (a_1050)');
    expect(onConfirmed).toHaveBeenCalledWith('a_1050');
    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it('falha do servidor mostra o erro e mantém o motivo; Esc cancela', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('x'));
    const onOpenChange = vi.fn();
    render(<ReasonDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} {...props} />);
    await userEvent.type(screen.getByLabelText('Motivo (obrigatório)'), 'Motivo suficiente');
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(await screen.findByText('Não foi possível concluir.')).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo (obrigatório)')).toHaveValue('Motivo suficiente');
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('AttentionItem as', () => {
  it('renders through a custom link component (client-side navigation)', () => {
    const Custom = ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) => <a data-custom href={href} className={className}>{children}</a>;
    render(<AttentionItem as={Custom} count={1} text="falhas" href="/x" />);
    expect(screen.getByRole('link', { name: '1 falhas' })).toHaveAttribute('data-custom');
  });
});

describe('PersonCell', () => {
  it('drops the initials circle with avatar={false}', () => {
    const { container, rerender } = render(<PersonCell name="Sepse" sub="Clínica Médica" />);
    expect(container.textContent).toContain('S');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    rerender(<PersonCell name="Sepse" sub="Clínica Médica" avatar={false} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
