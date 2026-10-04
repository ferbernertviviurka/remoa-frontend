import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Icon } from '../icons';
import { StatusPill } from '../support';
import { AdminSidebar, AdminHeader, AdminSearch, PeriodSegmented, StatCard, BarChart, AdminSection, AttentionItem, SummaryChip, FilterGroup, DataTable, PersonCell, Drawer, DrawerFacts, DrawerTimeline, DrawerAuditTrail, DrawerActions, ReasonDialog, type DataColumn } from './index';

/**
 * Painel admin (F19). Referência: `docs/design/v2/screens/admin-*.png` (1440 × 900). Visual propositalmente diferente do app: barra lateral escura (`--admin-nav`).
 * Todo texto chega por props (aqui, exemplos); no app vem de `@remoa/strings` (`admin.*`). Movimento: `data-motion="reduced"` mostra o quadro final.
 * Regras de uso: (1) nenhuma tela admin sem checagem de papel no servidor (404 para não-admin); (2) toda ação sensível abre `ReasonDialog` (motivo ≥ 8) e a API grava a auditoria na mesma transação;
 * (3) tabelas são `DataTable` (semântica `<table>`, 25 por página, busca e filtros no servidor); (4) a gaveta mostra o recibo da auditoria em `DrawerAuditTrail`.
 */
const meta = { title: 'Admin/Componentes', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: 'grid' as const, href: '#' },
  { id: 'users', label: 'Usuários', icon: 'users' as const, href: '#' },
  { id: 'maps', label: 'Mapas', icon: 'maps' as const, href: '#' },
  { id: 'payments', label: 'Transações', icon: 'creditCard' as const, href: '#' },
  { id: 'referrals', label: 'Indicações', icon: 'gift' as const, href: '#' },
  { id: 'support', label: 'Suporte', icon: 'lifebuoy' as const, href: '#', badge: 9, badgeLabel: '9 chamados abertos' },
  { id: 'audit', label: 'Auditoria', icon: 'audit' as const, href: '#' },
];
const sidebar = <AdminSidebar aria-label="Administração" brandLabel="remoa" badge="ADMIN" items={navItems} activeId="overview" account={{ initial: 'V', name: 'Você', email: 'admin@admin.com' }} backLabel="Voltar ao app" backHref="#" />;

export const BarraLateral: S = { render: () => <div className="flex h-[900px]">{sidebar}</div> };

const bars = (k: number) => Array.from({ length: 12 }, (_, i) => (6 + ((i * 7 + k * 5) % 11) * 2 + (i > 8 ? 6 : 0)) / 34);
const series = Array.from({ length: 30 }, (_, i) => { const a = 14 + ((i * 7 + 3) % 11); return { a, b: Math.round(a * 2.6 + ((i * 5) % 7)) }; });

export const VisaoGeral: S = {
  render: function Render() {
    const [p, setP] = useState('30');
    return (
      <div className="flex min-h-[900px] bg-canvas">
        {sidebar}
        <main className="min-w-0 flex-1">
          <AdminHeader title="Visão geral" subtitle="Dados de exemplo · atualizado agora">
            <PeriodSegmented aria-label="Período" options={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }, { value: '90', label: '90 dias' }]} value={p} onValueChange={setP} />
            <Button variant="secondary" size="sm" icon={<Icon name="download" size={18} />}>Exportar</Button>
          </AdminHeader>
          <div className="flex flex-col gap-[22px] px-10 pb-14 pt-[26px]">
            <div className="grid grid-cols-3 gap-[18px]">
              <StatCard index={0} label="Total de contas" value="1.284" icon="users" delta="+312" bars={bars(1)} />
              <StatCard index={1} label="Total de mapas" value="3.906" icon="maps" delta="+803" bars={bars(2)} sparkTone="soft" />
              <StatCard index={2} label="Assinantes Pro" value="142" icon="sparkle" delta="+11" bars={bars(3)} />
              <StatCard index={3} label="Receita no período" value="R$ 5.538,00" icon="creditCard" delta="+8%" bars={bars(4)} />
              <StatCard index={4} label="Indicações qualificadas" value="37" icon="gift" delta="+9" bars={bars(5)} sparkTone="soft" />
              <StatCard index={5} label="Chamados abertos" value="9" icon="lifebuoy" delta="3 sem resposta" tone="warn" sparkTone="warn" bars={bars(6)} />
            </div>
            <div className="grid grid-cols-[1fr_400px] gap-[22px]">
              <BarChart animationKey={p} title="Crescimento no período" aria-label="Gráfico de novas contas e novos mapas por dia" series={series} legend={['Novas contas', 'Novos mapas']} startLabel="há 30 dias" endLabel="hoje" />
              <AdminSection title="Precisa de atenção">
                <div className="flex flex-col gap-3 px-6 pb-6">
                  <AttentionItem count={2} tone="warn" text="indicações em revisão por possível fraude" href="#" />
                  <AttentionItem count={2} tone="bad" text="pagamentos falharam nas últimas 24 horas" href="#" />
                  <AttentionItem count={1} tone="info" text="mapa seed aguardando revisão médica" href="#" />
                </div>
              </AdminSection>
            </div>
          </div>
        </main>
      </div>
    );
  },
};

type U = { id: string; name: string; email: string; plan: string; maps: string; status: string; tone: 'ok' | 'warn' | 'bad'; created: string };
const users: U[] = [
  { id: 'u1', name: 'Gabi Lopes', email: 'gabi.lopes@exemplo.com', plan: 'Free', maps: '1 mapa · 6 cards', status: 'Ativo', tone: 'ok', created: 'há 12 min' },
  { id: 'u5', name: 'Karen Alves', email: 'karen.alves@exemplo.com', plan: 'Free', maps: '1 mapa · 9 cards', status: 'Pendente', tone: 'warn', created: 'há 3 h' },
  { id: 'u9', name: 'Diego Lima', email: 'diego.lima@exemplo.com', plan: 'Free', maps: '2 mapas · 120 cards', status: 'Suspenso', tone: 'bad', created: '2 out' },
];
const cols: DataColumn<U>[] = [
  { key: 'user', header: 'Usuário', cell: (u) => <PersonCell name={u.name} sub={u.email} /> },
  { key: 'plan', header: 'Plano', cell: (u) => u.plan },
  { key: 'maps', header: 'Mapas e cards', cell: (u) => u.maps },
  { key: 'status', header: 'Status', cell: (u) => <StatusPill tone={u.tone}>{u.status}</StatusPill> },
  { key: 'created', header: 'Criado', cell: (u) => <span className="text-[13.5px] text-muted">{u.created}</span> },
];
const common = { caption: 'Usuários', columns: cols, rowKey: (u: U) => u.id, emptyText: 'Nada encontrado com esses filtros.' };

export const Tabela: S = { render: () => <div className="bg-canvas p-10"><DataTable {...common} rows={users} onRowSelect={() => undefined} rowLabel={(u) => `Abrir ${u.name}`} pagination={{ page: 1, total: 12, onPageChange: () => undefined, summary: 'Mostrando 1–3 de 12', navLabel: 'Paginação', prevLabel: 'Anterior', nextLabel: 'Próxima' }} /></div> };
export const TabelaVazia: S = { render: () => <div className="bg-canvas p-10"><DataTable {...common} rows={[]} /></div> };
export const TabelaCarregando: S = { render: () => <div className="bg-canvas p-10"><DataTable {...common} rows={[]} status="loading" loadingLabel="Carregando usuários" /></div> };
export const TabelaComErro: S = { render: () => <div className="bg-canvas p-10"><DataTable {...common} rows={[]} status="error" errorText="Não foi possível carregar os usuários." retryLabel="Tentar de novo" onRetry={() => undefined} /></div> };

/** Fluxo completo: linha → gaveta → ação com motivo → recibo da auditoria (id `a_1050`) também na gaveta. */
export const UsuariosComGavetaEMotivo: S = {
  render: function Render() {
    const [sel, setSel] = useState<U | null>(null);
    const [ask, setAsk] = useState(false);
    const [trail, setTrail] = useState<{ id: string; text: string }[]>([]);
    const [q, setQ] = useState('');
    return (
      <div className="flex min-h-[900px] bg-canvas">
        {sidebar}
        <main className="min-w-0 flex-1">
          <AdminHeader title="Usuários" subtitle="Gestão de contas, planos e acessos"><AdminSearch label="Buscar" placeholder="Buscar por nome ou e-mail" value={q} onValueChange={setQ} /></AdminHeader>
          <div className="flex flex-col gap-[18px] px-10 py-[26px]">
            <div className="flex flex-wrap gap-2.5"><SummaryChip tone="brand" value={12} label="contas" /><SummaryChip value={9} label="ativas" /><SummaryChip tone="warn" value={2} label="pendentes" /><SummaryChip tone="bad" value={1} label="suspensas" /></div>
            <FilterGroup label="Status" options={[{ value: 'all', label: 'Todos' }, { value: 'on', label: 'Ativo' }]} value="all" onValueChange={() => undefined} />
            <DataTable {...common} rows={users} selectedKey={sel?.id} onRowSelect={(u) => { setSel(u); setTrail([]); }} rowLabel={(u) => `Abrir ${u.name}`} />
          </div>
        </main>
        <Drawer open={!!sel} onOpenChange={(o) => !o && setSel(null)} title={sel?.name ?? ''} subtitle={sel?.email} badge={sel ? <StatusPill tone={sel.tone}>{sel.status}</StatusPill> : null} closeLabel="Fechar" footer={<DrawerActions note="Toda ação pede um motivo e fica registrada na auditoria."><Button variant="secondary" size="sm" onClick={() => setAsk(true)}>Suspender</Button></DrawerActions>}>
          <DrawerFacts items={[{ k: 'ID', v: 'U8-7K2' }, { k: 'Plano', v: sel?.plan }, { k: 'Mapas e cards', v: sel?.maps }]} />
          <DrawerTimeline title="Linha do tempo" steps={[{ label: 'Conta criada', when: '2 out' }, { label: 'E-mail confirmado' }]} />
          <DrawerAuditTrail title="Registrado agora na auditoria" entries={trail} />
        </Drawer>
        <ReasonDialog open={ask} onOpenChange={setAsk} danger title="Suspender conta" summary={`${sel?.name ?? ''} perde o acesso na hora. Os dados ficam intactos.`} reasonLabel="Motivo (obrigatório)" tooShortText="Escreva um motivo com pelo menos 8 caracteres." errorText="Não foi possível concluir. Tente de novo." confirmLabel="Suspender" cancelLabel="Cancelar" doneLabel="Concluir" receiptText={(id) => `Ação registrada na auditoria (${id})`} onConfirm={async () => ({ auditId: 'a_1050' })} onConfirmed={(id) => setTrail((t) => [{ id, text: 'Conta suspensa' }, ...t])} />
      </div>
    );
  },
};
