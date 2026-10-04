'use client';

import { useCallback, useEffect, useState } from 'react';
import { supportErrors, type SupportTicketDetail, type SupportTicketStatus, type SupportTicketSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, StatusPill, Textarea, Thread, TicketList, type StatusTone, type ThreadMessage } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { getMyTicket, listMyTickets, markTicketRead, replyToTicket } from './api';
import { typeText } from './support-form';

const tone: Record<SupportTicketStatus, StatusTone> = { open: 'warn', in_review: 'info', answered: 'ok', resolved: 'muted' };
const label: Record<SupportTicketStatus, string> = { open: t('support.tickets.statuses.open'), in_review: t('support.tickets.statuses.inProgress'), answered: t('support.tickets.statuses.answered'), resolved: t('support.tickets.statuses.resolved') };
const day = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
const when = (d: Date | string) => `${day(d)}, ${new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

/** Unread/answered first, then most recently updated (suporte-chamados.png). */
export const sortTickets = (l: SupportTicketSummary[]) => {
  const rank = (k: SupportTicketSummary) => (k.unread || k.status === 'answered' ? 0 : 1);
  return [...l].sort((a, b) => rank(a) - rank(b) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
};

export type MyTicketsProps = { openId: string | null; onOpenIdChange: (id: string | null) => void; onUnreadChange: () => void; reloadKey: number };

export function MyTickets({ openId, onOpenIdChange, onUnreadChange, reloadKey }: MyTicketsProps) {
  const [list, setList] = useState<SupportTicketSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (openId) return;
    let live = true;
    listMyTickets().then((r) => live && (r.ok ? (setList(r.data), setFailed(false)) : setFailed(true))).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [openId, reloadKey]);

  if (openId) return <TicketDetail id={openId} onBack={() => onOpenIdChange(null)} onRead={onUnreadChange} />;
  if (failed) return <p role="alert" className="m-0 px-7 py-8 text-center text-muted">{t('support.errors.fetchTickets')}</p>;
  if (!list) return <p role="status" className="m-0 px-7 py-8 text-center text-muted">{t('support.errors.loading')}</p>;
  return (
    <div className="px-[22px] py-[18px]">
      <TicketList
        aria-label={t('support.tickets.list.ariaLabel')}
        emptyText={t('support.tickets.empty')}
        onSelect={onOpenIdChange}
        items={sortTickets(list).map((k) => ({
          id: k.id, subject: k.subject, meta: `#${k.number} · ${typeText(k.type)} · ${day(k.createdAt)}`,
          statusLabel: label[k.status], status: tone[k.status], unread: k.unread, unreadLabel: t('support.tickets.list.unread'),
        }))}
      />
    </div>
  );
}

function TicketDetail({ id, onBack, onRead }: { id: string; onBack: () => void; onRead: () => void }) {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getMyTicket(id);
      if (!r.ok) return setFailed(true);
      setTicket(r.data);
      void markTicketRead(id).then(onRead); // GET does not mark as read; opening does, then the badge refreshes
    } catch { setFailed(true); }
  }, [id, onRead]);
  useEffect(() => { void load(); }, [load]);

  async function reply() {
    if (!body.trim() || sending) return;
    setSending(true); setError('');
    try {
      const r = await replyToTicket(id, { body, attachments: [] });
      if (!r.ok) return setError(r.error.message === supportErrors.closed ? t('support.thread.closedError') : t('support.thread.replyError'));
      track('support_replied', {});
      setTicket(r.data); setBody('');
    } catch { setError(t('support.thread.replyError')); } finally { setSending(false); }
  }

  if (failed) return <p role="alert" className="m-0 px-7 py-8 text-center text-muted">{t('support.errors.fetchTicket')}</p>;
  if (!ticket) return <p role="status" className="m-0 px-7 py-8 text-center text-muted">{t('support.errors.loading')}</p>;
  const messages: ThreadMessage[] = ticket.messages.map((m) => ({
    id: m.id, author: m.authorType === 'user' ? t('support.thread.you') : t('support.thread.team'), when: when(m.createdAt), body: m.body, side: m.authorType === 'user' ? 'self' : 'other',
  }));
  return (
    <div className="flex flex-col gap-4 px-7 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="quiet" size="sm" onClick={onBack}>{t('support.modal.back')}</Button>
        <StatusPill tone={tone[ticket.status]}>{label[ticket.status]}</StatusPill>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 font-display text-xl font-extrabold tracking-[-0.02em]">{ticket.subject}</h3>
        <span className="text-[13px] text-muted">#{ticket.number} · {typeText(ticket.type)} · {day(ticket.createdAt)}</span>
      </div>
      <Thread aria-label={t('support.thread.ariaLabel', { number: ticket.number })} messages={messages} />
      <Textarea label={t('support.thread.replyLabel')} placeholder={t('support.thread.replyPlaceholder')} rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      {error ? <p role="alert" className="m-0 text-[13px] font-semibold text-review-text">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!body.trim() || sending} loading={sending} loadingLabel={t('support.thread.replying')} onClick={() => void reply()}>{t('support.thread.reply')}</Button>
      </div>
    </div>
  );
}
