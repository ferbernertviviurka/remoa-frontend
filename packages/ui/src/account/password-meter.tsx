import { Icon } from '../icons';

/**
 * PasswordMeter: 4 segmentos + rótulo em texto (a força nunca só por cor) + checklist.
 * Recebe o resultado pronto de `passwordStrength` (`@remoa/contracts`): `score` 0–4, `label` ("Fraca"...), `checks`.
 * `doneLabel`/`todoLabel` são os textos ocultos de cada item ("cumprido"/"pendente"). Rótulo é role=status.
 */
export type PasswordCheck = { id: string; label: string; ok: boolean };
export type PasswordMeterProps = { score: number; label: string; checks: ReadonlyArray<PasswordCheck>; doneLabel: string; todoLabel: string };

export function PasswordMeter({ score, label, checks, doneLabel, todoLabel }: PasswordMeterProps) {
  const s = Math.min(4, Math.max(0, Math.trunc(score)));
  const seg = s <= 1 ? 'bg-review' : s === 2 ? 'bg-watch' : 'bg-primary';
  const text = s <= 1 ? 'text-review-text' : s === 2 ? 'text-watch-text' : 'text-primary-deep';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex grow gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} data-testid="pw-seg" data-on={s >= i} className={`h-2 flex-1 rounded-[4px] transition-colors duration-200 ${s >= i ? seg : 'bg-border'}`} />
          ))}
        </span>
        <span role="status" className={`min-w-20 text-right text-sm font-bold ${text}`}>{label}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <li key={c.id} className={`flex items-center gap-2.5 text-sm ${c.ok ? 'text-ink' : 'text-muted'}`}>
            <span aria-hidden="true" className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill border-[1.5px] ${c.ok ? 'border-primary bg-primary text-on-primary' : 'border-unknown-soft bg-surface'}`}>
              {c.ok ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
            </span>
            {c.label}
            <span className="sr-only">{c.ok ? doneLabel : todoLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
