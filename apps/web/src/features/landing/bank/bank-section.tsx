import { strings, t } from '@remoa/strings/landing';
import { Section, Icon, buttonVariants, focusRing } from '@remoa/ui';

const b = strings.landing.bank;
// Public eligible-question milestone verified on 2026-10-19; not the full catalogue total.
const publicQuestionMilestoneThousands = 27;
const createHref = `/entrar?next=${encodeURIComponent('/app/prova/nova-prova')}`;
const browseHref = `/entrar?next=${encodeURIComponent('/app/provas')}`;
const cta = `${focusRing} inline-flex min-h-12 items-center justify-center gap-2 rounded-btn px-5 py-3 text-[15px] font-bold`;

export function BankSection() {
  return (
    <Section id="banco" eyebrow={b.eyebrow} title={t('landing.bank.title', { n: publicQuestionMilestoneThousands })} lead={b.lead}>
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {b.steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 rounded-3xl border border-border bg-surface p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-white" aria-hidden>{i + 1}</span>
              <div><h3 className="font-display text-xl font-extrabold tracking-tight">{step.title}</h3><p className="mt-1 text-[15px] leading-normal text-muted">{step.text}</p></div>
            </li>
          ))}
        </ol>
        <div className="rounded-[28px] bg-panel-dark p-6 text-on-dark md:p-8">
          <Icon name="file" size={32}/>
          <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight">{b.coverage}</h3>
          <p className="mt-3 text-on-dark-muted">{b.coverageHelp}</p>
          <div className="mt-6 flex flex-col gap-3 sm:items-start">
            <a href={createHref} className={`${cta} ${buttonVariants.light}`}>{b.create}<Icon name="right" size={18}/></a>
            <a href={browseHref} className={`${cta} ${buttonVariants['outline-light']}`}>{b.browse}</a>
          </div>
        </div>
      </div>
    </Section>
  );
}
