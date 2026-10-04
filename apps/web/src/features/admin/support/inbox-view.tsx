'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTicketNumber, type AdminTicketDetail, type AdminTicketMessage, type AdminTicketPage, type SupportTicketStatus } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { AdminHeader, AdminSearch, Button, Icon, StatusPill, Switch, Textarea, Thread, type StatusTone, type ThreadMessage } from '@remoa/ui';
import { runAdminAction } from '../shared/actions';
import { formatWhen } from '../shared/format';

const tone: Record<SupportTicketStatus, StatusTone> = { open: 'warn', in_review: 'info', answered: 'ok', resolved: 'muted' };
const statusLabel: Record<SupportTicketStatus, string> = {
  open: t('admin.support.filters.statusOpen'),
  in_review: t('admin.support.filters.statusInProgress'),
  answered: t('admin.support.filters.statusAnswered'),
  resolved: t('admin.support.filters.statusResolved'),
};
const typeLabel = {
  bug: t('admin.support.detail.types.broken'),
  billing: t('admin.support.detail.types.billing'),
  content: t('admin.support.detail.types.medical'),
  suggestion: t('admin.support.detail.types.suggestion'),
  other: t('admin.support.detail.types.other'),
};
const planLabel = { free: t('admin.overview.plans.free'), pro: t('admin.overview.plans.pro'), founder: t('admin.overview.plans.founder') };
const macros = [
  { title: t('admin.macros.replyMoreInfo'), body: t('admin.macros.replyMoreInfoBody') },
  { title: t('admin.macros.replyInvestigating'), body: t('admin.macros.replyInvestigatingBody') },
  { title: t('admin.macros.replyResolved'), body: t('admin.macros.replyResolvedBody') },
];
const filters: Array<{ value: SupportTicketStatus | ''; key: 'all' | SupportTicketStatus; label: string }> = [
  { value: '', key: 'all', label: t('admin.support.filters.statusAll') },
  { value: 'open', key: 'open', label: statusLabel.open },
  { value: 'in_review', key: 'in_review', label: statusLabel.in_review },
  { value: 'answered', key: 'answered', label: statusLabel.answered },
  { value: 'resolved', key: 'resolved', label: statusLabel.resolved },
];

export type InboxQuery = { status: string; q: string; t: string };

const href = (q: InboxQuery) => {
  const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v));
  return `/admin/suporte${p.size ? `?${p}` : ''}`;
};
const person = (u: { name: string | null; email: string | null } | null) => u?.name ?? u?.email ?? t('admin.support.detail.unknownUser');

export function InboxView({ page, ticket, query }: { page: AdminTicketPage; ticket: AdminTicketDetail | null; query: InboxQuery }) {
  const router = useRouter();
  const [, start] = useTransition();
  const go = (next: Partial<InboxQuery>) => start(() => router.replace(href({ ...query, ...next }), { scroll: false }));

  const [q, setQ] = useState(query.q);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(() => go({ q: q.trim(), t: '' }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on the typed text only
  }, [q]);

  return (
    <>
      <AdminHeader title={t('admin.support.label')} subtitle={t(page.counts.open === 1 ? 'admin.support.summary.openUnassigned' : 'admin.support.summary.openUnassignedMany', { count: page.counts.open, unassigned: page.counts.unassigned })}>
        <AdminSearch label={t('admin.support.list.searchLabel')} placeholder={t('admin.support.list.searchPlaceholder')} value={q} onValueChange={setQ} />
      </AdminHeader>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:h-[calc(100dvh-84px)] lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-r border-border bg-surface">
          <div role="group" aria-label={t('admin.support.list.filterLabel')} className="flex flex-wrap gap-2 border-b border-border px-5 py-[18px]">
            {filters.map((f) => {
              const on = (query.status || '') === f.value;
              return (
                <button key={f.key} type="button" aria-pressed={on} onClick={() => go({ status: f.value, t: '' })} className={`flex h-11 cursor-pointer items-center gap-2 rounded-pill border-[1.5px] px-3.5 text-[13.5px] font-bold transition-colors duration-200 motion-reduce:transition-none ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'}`}>
                  {f.label}
                  <span className="text-[12.5px] opacity-80">{page.counts[f.key]}</span>
                </button>
              );
            })}
          </div>
          <ul aria-label={t('admin.support.list.ariaLabel')} className="m-0 flex min-h-0 flex-1 list-none flex-col overflow-auto p-0">
            {page.items.map((k) => (
              <li key={k.id}>
                <button type="button" aria-pressed={k.id === query.t} onClick={() => go({ t: k.id })} className={`box-border flex w-full cursor-pointer flex-col gap-1.5 border-0 border-b border-border px-5 py-4 text-left transition-colors duration-200 motion-reduce:transition-none ${k.id === query.t ? 'bg-primary-tint' : 'bg-surface hover:bg-canvas'}`}>
                  <span className="flex items-center justify-between gap-2.5">
                    <span className="truncate text-[15px] font-bold">{k.subject}</span>
                    <StatusPill tone={tone[k.status]} size="sm">{statusLabel[k.status]}</StatusPill>
                  </span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <span>{formatTicketNumber(k.number)}</span><span aria-hidden="true">·</span><span>{person(k.user)}</span><span aria-hidden="true">·</span><span suppressHydrationWarning>{formatWhen(k.lastUserMessageAt)}</span>
                  </span>
                  {k.preview ? <span className="truncate text-[13.5px] text-muted">{k.preview}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {page.items.length === 0 ? <p className="m-0 px-5 py-10 text-center text-muted">{t('admin.support.list.empty')}</p> : null}
        </div>
        {ticket ? <Conversation key={ticket.id} ticket={ticket} /> : <p className="m-0 bg-canvas px-7 py-10 text-muted">{t('admin.support.detail.pick')}</p>}
      </div>
    </>
  );
}

function threadOf(ms: AdminTicketMessage[], owner: AdminTicketDetail['user']): ThreadMessage[] {
  return ms.map((m) => ({
    id: m.id,
    author: m.authorType === 'user' ? person(m.author ?? owner) : m.authorType === 'system' ? t('admin.support.detail.system') : (m.author?.name ?? t('admin.support.detail.team')),
    when: formatWhen(m.createdAt),
    side: m.authorType === 'user' ? 'other' : 'self',
    internal: m.internal,
    body: (
      <>
        {m.body}
        {m.attachments.length ? (
          <span className="mt-2 flex flex-wrap gap-2">
            {m.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer noopener" className="block size-20 overflow-hidden rounded-lg border border-border">
                <img src={a.url} alt={t('admin.support.detail.attachment')} className="size-full object-cover" />
              </a>
            ))}
          </span>
        ) : null}
      </>
    ),
  }));
}

function Conversation({ ticket }: { ticket: AdminTicketDetail }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState<'send' | 'assign' | 'resolve' | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // Routine inbox actions take no typed reason: the server writes the same text (D-432, D-468).
  const reason = `Atendimento do chamado ${formatTicketNumber(ticket.number)}`;
  async function run(kind: 'send' | 'assign' | 'resolve') {
    setBusy(kind); setError(''); setDone('');
    const r = kind === 'send'
      ? await runAdminAction(`/tickets/${ticket.id}/messages`, { reason, body: body.trim(), internal })
      : await runAdminAction(`/tickets/${ticket.id}/${kind}`, { reason });
    setBusy(null);
    if (!r.ok) return setError(t('admin.support.reply.error'));
    if (kind === 'send') { setBody(''); setDone(t(internal ? 'admin.support.reply.successNote' : 'admin.support.reply.successTicket')); }
    router.refresh();
  }

  const ctx = ticket.context;
  const closed = ticket.status === 'resolved';
  return (
    <div className="pop flex min-h-0 flex-col bg-canvas">
      <div className="flex items-start justify-between gap-4 border-b border-border bg-surface px-7 py-[22px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.025em]">{ticket.subject}</h2>
          <span className="flex flex-wrap items-center gap-2 text-[13.5px] text-muted">
            <span>{formatTicketNumber(ticket.number)}</span><span aria-hidden="true">·</span>
            {ticket.user ? <Link href={`/admin/usuarios?u=${ticket.user.id}`} className="font-bold text-primary-deep">{person(ticket.user)}</Link> : <span>{person(null)}</span>}
            <span aria-hidden="true">·</span><span>{typeLabel[ticket.type]}</span><span aria-hidden="true">·</span><span>{t('admin.support.detail.planLabel', { plan: planLabel[ticket.plan] })}</span>
          </span>
        </div>
        <span className="flex shrink-0 flex-wrap justify-end gap-2">
          <StatusPill tone={tone[ticket.status]}>{statusLabel[ticket.status]}</StatusPill>
          <StatusPill tone="muted">{t('admin.support.detail.assigned', { name: ticket.assignedTo ? person(ticket.assignedTo) : t('admin.support.detail.noAssignee') })}</StatusPill>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-7 py-[22px]">
        <Thread variant="admin" aria-label={t('admin.support.detail.messages')} messages={threadOf(ticket.messages, ticket.user)} internalLabel={t('admin.support.detail.internalNoteLabel')} />
        {ctx ? (
          <div className="flex flex-wrap justify-between gap-3 rounded-[18px] border border-border bg-surface px-[18px] py-3.5 text-[13.5px]">
            <span className="text-muted">{t('admin.support.detail.technicalInfo')}</span>
            <span className="font-semibold">{t('admin.support.detail.technicalSummary', { screen: ctx.screen, browser: ctx.browser, os: ctx.os, version: ctx.appVersion })}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-border bg-surface px-7 pb-[22px] pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-bold text-muted">{t('admin.support.macros.label')}</span>
          {macros.map((m) => (
            <Button key={m.title} type="button" variant="secondary" size="sm" onClick={() => setBody(m.body)}>{m.title}</Button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-muted">
            <span aria-hidden="true">{t('admin.support.detail.internalNoteLabel')}</span>
            <Switch size="lg" hideLabel label={t('admin.support.detail.internalNoteLabel')} checked={internal} onCheckedChange={setInternal} />
          </span>
        </div>
        <div data-internal={internal || undefined} className={internal ? 'rounded-2xl bg-watch-bg p-2' : ''}>
          <Textarea label={t('admin.support.reply.label')} placeholder={t('admin.support.reply.placeholder')} rows={3} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
          {internal ? <p className="m-0 pt-1 text-[12.5px] font-semibold text-watch-text">{t('admin.support.detail.internalNoteHint')}</p> : null}
        </div>
        <div role="status" className="min-h-0 text-[13px] font-semibold text-primary-deep">{done}</div>
        {error ? <p role="alert" className="m-0 text-[13px] font-semibold text-review-text">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="flex gap-2">
            <Button type="button" variant="secondary" disabled={!!busy} loading={busy === 'assign'} onClick={() => void run('assign')}>{t('admin.support.actions.assignToMe')}</Button>
            <Button type="button" variant="secondary" icon={<Icon name="check" size={18} />} disabled={!!busy || closed} loading={busy === 'resolve'} onClick={() => void run('resolve')}>{t('admin.support.actions.markResolved')}</Button>
          </span>
          <Button type="button" icon={<Icon name="send" size={18} />} disabled={!body.trim() || !!busy} loading={busy === 'send'} loadingLabel={t('admin.support.reply.sending')} onClick={() => void run('send')}>
            {t(internal ? 'admin.support.actions.sendNote' : 'admin.support.actions.sendReply')}
          </Button>
        </div>
      </div>
    </div>
  );
}
