import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BellButton } from './bell-button';
import { NotificationGroups, NotificationEmpty } from './notification-item';
import { NotificationPopover, type NotificationTab } from './notification-popover';
import { CategoryChips, NotificationPrefsTable, PauseRemindersRow, ReminderTimeChoice } from './prefs';
import { CompactSwitch } from './compact-switch';
import { formatMeta, groupsOf, prefRows, sample } from './fixtures';
import type { NotificationView } from './types';

/**
 * Central de notificações (F26). Referência: `docs/design/v2/screens/sino-aberto.png`, `sino-vazio.png`, `notificacoes-pagina.png`, `notificacoes-pausa.png` (1440 × 900).
 * Todo texto chega por props (aqui, exemplos); no app vem de `@remoa/strings` (`notifications.*`).
 * Regras de uso: `BellButton` é sempre o `trigger` do `NotificationPopover`; o item do popover é um link com o ponto de "Marcar como lida" como botão irmão (nunca aninhado);
 * a página usa `NotificationItem variant="page"` via `NotificationGroups`. Movimento: sacudida, mola e cascata desligam com "Reduzir movimento".
 */
const meta = { title: 'Notificações/Central', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj;

const common = { markReadLabel: 'Marcar como lida', formatMeta };

function PopoverDemo({ initial = sample, state = 'ready', defaultOpen = true, initialTab = 'all' }: { initial?: ReadonlyArray<NotificationView>; state?: 'ready' | 'loading' | 'error'; defaultOpen?: boolean; initialTab?: NotificationTab }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<NotificationTab>(initialTab);
  const unread = items.filter((i) => i.unread).length;
  const shown = tab === 'unread' ? items.filter((i) => i.unread) : items;
  const read = (id: string) => setItems((l) => l.map((i) => (i.id === id ? { ...i, unread: false } : i)));
  return (
    <div className="flex h-[900px] justify-end p-4 pr-12">
      <NotificationPopover
        trigger={<BellButton count={unread} label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'} />}
        open={open}
        onOpenChange={setOpen}
        dialogLabel="Central de notificações"
        title="Notificações"
        markAllLabel="Marcar tudo como lido"
        onMarkAll={() => setItems((l) => l.map((i) => ({ ...i, unread: false })))}
        settingsLabel="Preferências de notificação"
        settingsHref="#preferencias"
        tabsLabel="Filtrar"
        tabAllLabel="Todas"
        tabUnreadLabel="Não lidas"
        tab={tab}
        onTabChange={setTab}
        unreadCount={unread}
        seeAllLabel="Ver todas as notificações"
        seeAllHref="#todas"
        emptyLabel="Nenhuma notificação por aqui."
        allReadLabel="Tudo lido. Bom trabalho."
        state={state}
        loadingLabel="Carregando notificações…"
        error={{ message: 'Não foi possível carregar as notificações.', retryLabel: 'Tentar de novo', onRetry: () => undefined }}
        groups={groupsOf(shown)}
        onOpen={read}
        onMarkRead={read}
        {...common}
      />
    </div>
  );
}

export const SinoAberto: S = { render: () => <PopoverDemo /> };
export const SinoVazio: S = { render: () => <PopoverDemo initial={[]} /> };
export const TudoLido: S = { render: () => <PopoverDemo initial={sample.map((i) => ({ ...i, unread: false }))} initialTab="unread" /> };
export const Carregando: S = { render: () => <PopoverDemo state="loading" /> };
export const Erro: S = { render: () => <PopoverDemo state="error" /> };
export const SinoFechado: S = { render: () => <PopoverDemo defaultOpen={false} /> };
export const SinoSemNaoLidas: S = { render: () => <div className="p-8"><BellButton count={0} label="Notificações" /></div> };
export const SelosNove: S = { render: () => <div className="flex gap-8 p-8"><BellButton count={3} label="Notificações, 3 não lidas" /><BellButton count={9} label="Notificações, 9 não lidas" /><BellButton count={27} label="Notificações, 27 não lidas" /></div> };

function PageDemo({ pause = false }: { pause?: boolean }) {
  const [items, setItems] = useState(sample);
  const [cat, setCat] = useState('all');
  const [only, setOnly] = useState(false);
  const [paused, setPaused] = useState(pause);
  const [time, setTime] = useState('07:00');
  const [rows, setRows] = useState(prefRows(true));
  const names: Record<string, string> = { all: 'Todas', Calendário: 'Calendário', Revisão: 'Revisão', Mapas: 'Mapas', Indicações: 'Indicações', Suporte: 'Suporte', 'Conta e cobrança': 'Conta e cobrança', Loja: 'Loja' };
  const chips = Object.keys(names).map((id) => ({ id, label: names[id]!, count: items.filter((i) => i.unread && (id === 'all' || i.category === id)).length }));
  const shown = items.filter((i) => (cat === 'all' || i.category === cat) && (!only || i.unread));
  const read = (id: string) => setItems((l) => l.map((i) => (i.id === id ? { ...i, unread: false } : i)));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_440px] items-start gap-7 bg-canvas p-12">
      <section aria-label="Suas notificações" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <CategoryChips label="Categoria" items={chips} value={cat} onChange={setCat} />
          <CompactSwitch size="filter" label="Só não lidas" checked={only} onCheckedChange={setOnly} />
        </div>
        <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
          {shown.length === 0 ? <NotificationEmpty size="page" text="Nada por aqui ainda." /> : (
            <NotificationGroups variant="page" groups={groupsOf(shown)} formatMeta={formatMeta} markReadLabel="Marcar como lida" openLabel="Abrir" removeLabel="Remover notificação" onOpen={read} onMarkRead={read} onRemove={(id) => setItems((l) => l.filter((i) => i.id !== id))} />
          )}
        </div>
      </section>
      <aside aria-labelledby="t-pref" className="flex flex-col gap-1.5 rounded-[30px] border border-border bg-surface p-6">
        <h2 id="t-pref" className="m-0 font-display text-2xl font-extrabold tracking-[-0.025em]">Como avisar você</h2>
        <p className="m-0 mb-2 text-sm text-muted">Escolha onde cada tipo de aviso aparece.</p>
        <PauseRemindersRow title="Pausar e-mails de lembrete" description="Calendário, revisão e “volte quando sumir”. E-mails de conta continuam." checked={paused} onCheckedChange={setPaused} />
        <NotificationPrefsTable
          rows={rows.map((r) => ({ ...r, muted: paused && !!r.muted }))}
          typeHeader="Tipo de aviso" appHeader="App" emailHeader="E-mail" notApplicableLabel="Não se aplica" lockedLabel="Sempre enviado" lockedHint="Sempre enviamos"
          cellLabel={(title, ch) => (ch === 'app' ? `${title} no app` : `${title} por e-mail`)}
          onChange={(id, ch, v) => setRows((l) => l.map((r) => (r.id === id ? { ...r, [ch]: v } : r)))}
        />
        <ReminderTimeChoice title="Horário do lembrete de revisão" groupLabel="Horário" note="Horário de Brasília (GMT−3). Só enviamos se houver cards para revisar." options={['07:00', '08:00', '12:00', '20:00']} value={time} onChange={setTime} />
        <span className="pt-2.5 text-[12.5px] leading-normal text-muted">Todo e-mail de lembrete tem um link para parar de receber aquele tipo de aviso.</span>
      </aside>
    </div>
  );
}

export const Pagina: S = { render: () => <PageDemo /> };
export const PaginaComPausa: S = { render: () => <PageDemo pause /> };
