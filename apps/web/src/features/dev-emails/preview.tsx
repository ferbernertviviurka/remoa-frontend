'use client';

import { useEffect, useState } from 'react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Segmented, Tag } from '@remoa/ui';
import { apiBase } from '@/lib/api/base';

const t = withStrings({ devEmails: more.devEmails });

export type DevEmailList = Array<{ template: string; versions: string[] }>;
export type DevEmail = { subject: string; preheader: string; html: string; text: string; class: 'transactional' | 'reminder' | 'list'; bytes: number };

const getJson = async <T,>(path: string): Promise<T> => {
  const res = await fetch(`${apiBase()}${path}`);
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { data: T }).data;
};

export function EmailsPreview() {
  const [list, setList] = useState<DevEmailList | null>(null);
  const [sel, setSel] = useState<{ template: string; version: string } | null>(null);
  const [mail, setMail] = useState<DevEmail | null>(null);
  const [width, setWidth] = useState('600');
  const [view, setView] = useState('html');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getJson<DevEmailList>('/v1/dev/emails')
      .then((l) => {
        setList(l);
        const first = l[0];
        if (first?.versions[0]) setSel({ template: first.template, version: first.versions[0] });
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!sel) return;
    let live = true;
    getJson<DevEmail>(`/v1/dev/emails/${sel.template}/${sel.version}`)
      .then((m) => live && (setMail(m), setFailed(false)))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [sel]);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-6">
      <h1 className="m-0 font-display text-[28px] font-extrabold text-text">{t('devEmails.title')}</h1>
      {failed ? <p role="alert" className="m-0 text-sm font-semibold text-review-text">{t('devEmails.error')}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav aria-label={t('devEmails.templates')} className="flex flex-col gap-3">
          {(list ?? []).map((l) => (
            <div key={l.template} className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-muted">{l.template}</span>
              {l.versions.map((v) => {
                const on = sel?.template === l.template && sel.version === v;
                return (
                  <Button key={v} variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => setSel({ template: l.template, version: v })}>
                    {`${l.template} · ${v}`}
                  </Button>
                );
              })}
            </div>
          ))}
        </nav>
        <section className="flex min-w-0 flex-col gap-4">
          {mail ? (
            <>
              <dl className="m-0 grid gap-1 text-sm">
                <dt className="font-bold text-muted">{t('devEmails.subject')}</dt>
                <dd className="m-0 text-text" data-testid="email-subject">{mail.subject}</dd>
                <dt className="font-bold text-muted">{t('devEmails.preheader')}</dt>
                <dd className="m-0 text-text">{mail.preheader}</dd>
              </dl>
              <div className="flex flex-wrap items-center gap-3">
                <Tag>{t(`devEmails.classes.${mail.class}`)}</Tag>
                <Tag tone="unknown">{`${t('devEmails.size')}: ${t('devEmails.kb', { kb: (mail.bytes / 1024).toFixed(1) })}`}</Tag>
                <Segmented aria-label={t('devEmails.width')} value={width} onValueChange={setWidth} options={[{ value: '600', label: t('devEmails.desktop') }, { value: '360', label: t('devEmails.mobile') }]} />
                <Segmented aria-label={t('devEmails.view')} value={view} onValueChange={setView} options={[{ value: 'html', label: t('devEmails.html') }, { value: 'text', label: t('devEmails.text') }]} />
              </div>
              {view === 'html' ? (
                <iframe title={t('devEmails.frame')} sandbox="" srcDoc={mail.html} style={{ width: `${width}px`, maxWidth: '100%', height: 720, border: '1px solid var(--border)', background: '#fff' }} />
              ) : (
                <pre className="m-0 overflow-auto whitespace-pre-wrap rounded-btn border border-border bg-surface p-4 text-sm text-text">{mail.text}</pre>
              )}
            </>
          ) : failed ? null : <p className="m-0 text-muted">{t('devEmails.loading')}</p>}
        </section>
      </div>
    </main>
  );
}
