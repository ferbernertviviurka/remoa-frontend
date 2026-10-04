// F16 FR-15 (D-513): shared body for /termos and /privacidade, mirroring /regulamento-indicacao (shell, draft badge, note).
import { t } from '@remoa/strings';
import { Tag } from '@remoa/ui';
import { InviteShell } from '@/features/referral/invite/invite-shell';

const termsOrder = ['who', 'service', 'account', 'content', 'medical', 'payments', 'referral', 'conduct', 'deletion', 'changes'] as const;
const privacyOrder = ['controller', 'collected', 'purposes', 'processors', 'retention', 'admin', 'rights', 'security', 'referral', 'changes'] as const;

type Section = { key: string; title: string; body: string };

const sections = (kind: 'terms' | 'privacy'): Section[] =>
  kind === 'terms'
    ? termsOrder.map((k) => ({ key: k, title: t(`legal.terms.sections.${k}.title`), body: t(`legal.terms.sections.${k}.body`) }))
    : privacyOrder.map((k) => ({ key: k, title: t(`legal.privacy.sections.${k}.title`), body: t(`legal.privacy.sections.${k}.body`) }));

export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  return (
    <InviteShell>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 py-10 sm:py-14">
        <Tag tone="watch">{t('legal.draftBadge')}</Tag>
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[40px]">{kind === 'terms' ? t('legal.terms.pageTitle') : t('legal.privacy.pageTitle')}</h1>
        <p role="note" className="m-0 text-[15px] text-muted">{t('legal.draftNote')}</p>
        <p className="m-0 text-[15px] text-muted">{t('legal.updatedAt')}</p>
        {sections(kind).map((s) => (
          <section key={s.key} className="flex flex-col gap-2">
            <h2 className="m-0 font-display text-[20px] font-bold text-ink">{s.title}</h2>
            <p className="m-0 text-base leading-relaxed text-ink">{s.body}</p>
          </section>
        ))}
      </main>
    </InviteShell>
  );
}
