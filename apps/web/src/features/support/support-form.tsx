'use client';

import { useEffect, useRef, useState } from 'react';
import { SUPPORT_LIMITS, supportErrors, supportTicketTypes, type SupportContext, type SupportTicketType } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, ContextDisclosure, FileChip, Icon, Input, Textarea, TypeChips } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { submitSupportTicket, uploadAttachment } from './api';
import { collectContext, contextItems } from './context';
import { clearDraft, loadDraft, saveDraft } from './draft';

const typeLabel = { bug: 'broken', billing: 'billing', content: 'medical', suggestion: 'suggestion', other: 'other' } as const;
export const typeText = (type: SupportTicketType) => t(`support.form.type.options.${typeLabel[type]}`);
const typeOptions = supportTicketTypes.map((value) => ({ value, label: typeText(value) }));
const okMime = ['image/png', 'image/jpeg'];
const L = SUPPORT_LIMITS;

export type SupportFormProps = { email: string; plan: string; pathname: string; onDirtyChange: (dirty: boolean) => void; onSent: (number: number) => void; onSeeDuplicate: () => void; onCancel: () => void };

export function SupportForm({ email, plan, pathname, onDirtyChange, onSent, onSeeDuplicate, onCancel }: SupportFormProps) {
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [withContext, setWithContext] = useState(true);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [sending, setSending] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d) { setType(d.type); setSubject(d.subject); setDescription(d.description); }
  }, []);
  const dirty = !!(type || subject.trim() || description.trim() || files.length);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const edit = (next: { type?: string; subject?: string; description?: string }) => {
    const n = { type, subject, description, ...next };
    setType(n.type); setSubject(n.subject); setDescription(n.description);
    saveDraft(n);
  };

  const subjectLen = subject.trim().length;
  const descLen = description.trim().length;
  const invalid =
    !type ? t('support.form.type.required')
    : subjectLen < L.subjectMin || subjectLen > L.subjectMax ? t('support.form.subject.error')
    : descLen < L.descriptionMin || descLen > L.descriptionMax ? t('support.form.description.error')
    : null;
  const context: SupportContext = collectContext(pathname, plan);

  function pick(list: FileList | null) {
    const next = [...files];
    setFileError('');
    for (const f of Array.from(list ?? [])) {
      if (!okMime.includes(f.type) || f.size > L.attachmentMaxBytes) setFileError(t('support.form.attachments.error'));
      else if (next.length >= L.attachmentsMax) setFileError(t('support.form.attachments.limitReached'));
      else next.push(f);
    }
    setFiles(next);
    if (picker.current) picker.current.value = '';
  }

  async function submit() {
    if (invalid || sending) return;
    setSending(true); setError(null); setDuplicate(false);
    try {
      const keys: string[] = [];
      for (const f of files) {
        const up = await uploadAttachment(f);
        if (!up.ok) throw new Error(up.error.message);
        keys.push(up.data);
      }
      const r = await submitSupportTicket({ type: type as SupportTicketType, subject, description, attachments: keys, context: withContext ? context : null });
      if (!r.ok) {
        const m = r.error.message;
        setDuplicate(m === supportErrors.duplicate);
        setError(m === supportErrors.duplicate ? t('support.submission.duplicate') : m === supportErrors.rateLimited ? t('support.submission.rateLimited') : t('support.submission.error'));
        return;
      }
      track('support_submitted', { type: type as SupportTicketType, hasAttachment: files.length > 0, context: withContext });
      clearDraft();
      setType(''); setSubject(''); setDescription(''); setFiles([]);
      onSent(r.data.number);
    } catch {
      setError(t('support.submission.error')); // network or upload failure: the draft is already saved
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      aria-label={t('support.form.label')}
      noValidate
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="flex flex-col gap-5 px-7 pb-6 pt-5"
    >
      <TypeChips legend={t('support.form.type.legend')} groupLabel={t('support.form.type.label')} options={typeOptions} value={type} onChange={(v) => edit({ type: v })} />
      <Input label={t('support.form.subject.label')} placeholder={t('support.form.subject.placeholder')} maxLength={L.subjectMax} value={subject} onChange={(e) => edit({ subject: e.target.value })} />
      <div className="flex flex-col gap-1.5">
        <Textarea label={t('support.form.description.label')} placeholder={t('support.form.description.placeholder')} rows={5} maxLength={L.descriptionMax} value={description} onChange={(e) => edit({ description: e.target.value })} />
        <div className="flex justify-between text-[13px] text-muted">
          <span>{t('support.form.description.hint')}</span>
          <span>{t('support.form.description.charCount', { count: description.length })}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3.5">
          <input ref={picker} type="file" accept="image/png,image/jpeg" multiple hidden tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files)} />
          <Button type="button" variant="secondary" size="sm" icon={<Icon name="paperclip" size={18} />} onClick={() => picker.current?.click()}>
            {t('support.form.attachments.add')}
          </Button>
          <span className="text-[13px] text-muted">{t('support.form.attachments.hint')}</span>
        </div>
        {files.length ? (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <FileChip key={`${f.name}-${i}`} name={f.name} removeLabel={t('support.form.attachments.remove', { name: f.name })} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
            ))}
          </div>
        ) : null}
        {fileError ? <p role="alert" className="m-0 text-[13px] font-semibold text-review-text">{fileError}</p> : null}
      </div>
      <ContextDisclosure
        title={t('support.technical.title')}
        switchLabel={t('support.technical.toggle')}
        enabled={withContext}
        onEnabledChange={setWithContext}
        items={withContext ? contextItems(context) : [{ k: t('support.technical.offKey'), v: t('support.technical.offValue') }]}
        note={t('support.technical.note')}
      />
      {error ? (
        <Alert tone="review" title={error} role="alert">
          {duplicate ? <Button type="button" variant="secondary" size="sm" onClick={onSeeDuplicate}>{t('support.successScreen.viewTickets')}</Button> : <Button type="button" variant="secondary" size="sm" onClick={() => void submit()}>{t('support.submission.tryAgain')}</Button>}
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col text-[13.5px] text-muted">
          <span>{t('support.form.email.replyTo')} <strong className="text-ink">{email}</strong></span>
          {dirty && invalid ? <span>{invalid}</span> : null}
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" onClick={onCancel}>{t('support.form.cancel')}</Button>
          <Button type="submit" disabled={!!invalid || sending} loading={sending} loadingLabel={t('support.submission.sending')} icon={<Icon name="send" size={18} />}>
            {t('support.form.submit')}
          </Button>
        </div>
      </div>
    </form>
  );
}
