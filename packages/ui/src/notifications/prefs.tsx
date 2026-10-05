'use client';

import * as RS from '@radix-ui/react-switch';
import { FilterChip } from '../filter-chip';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';
import { CompactSwitch, SwitchTrack } from './compact-switch';

/** Linha da matriz. `app: null` = não se aplica (só e-mail). `emailLocked` = sempre enviado (cadeado). `muted` = a pausa de lembretes vale para a linha. */
export type PrefRow = { id: string; title: string; description: string; app: boolean | null; email: boolean; emailLocked?: boolean; muted?: boolean };

/**
 * NotificationPrefsTable (F26 FR-6): grade "Como avisar você" com interruptores App e E-mail (`role="switch"`, alvo 56 × 44).
 * Linhas fixas (conta, suporte) mostram cadeado com `lockedLabel` (leitor de tela) e `lockedHint` (tooltip nativo + texto de apoio); a linha só e-mail mostra "—" no App.
 * Quando `muted`, o interruptor de e-mail esmaece em 200 ms (continua clicável: a escolha é mantida para quando a pausa acabar).
 * Textos por props; `cellLabel(title, 'app' | 'email')` monta "Título no app" / "Título por e-mail".
 */
export type NotificationPrefsTableProps = {
  rows: ReadonlyArray<PrefRow>;
  typeHeader: string;
  appHeader: string;
  emailHeader: string;
  notApplicableLabel: string;
  lockedLabel: string;
  lockedHint: string;
  cellLabel: (title: string, channel: 'app' | 'email') => string;
  onChange: (id: string, channel: 'app' | 'email', value: boolean) => void;
};

const GRID = 'grid grid-cols-[minmax(0,1fr)_56px_56px] items-center gap-2';

export function NotificationPrefsTable({ rows, typeHeader, appHeader, emailHeader, notApplicableLabel, lockedLabel, lockedHint, cellLabel, onChange }: NotificationPrefsTableProps) {
  return (
    <div role="table" aria-label={`${appHeader} / ${emailHeader}`}>
      <div role="row" className={`${GRID} px-1 pb-1 pt-3 text-xs font-bold uppercase tracking-[.08em] text-muted`}>
        <span role="columnheader" className="sr-only">{typeHeader}</span>
        <span role="columnheader" className="text-center">{appHeader}</span>
        <span role="columnheader" className="text-center">{emailHeader}</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`${GRID} min-h-16 border-t border-divider p-1`}>
          <span role="rowheader" className="flex flex-col leading-[1.3]">
            <span className="text-[14.5px] font-bold">{r.title}</span>
            <span className="text-[12.5px] text-muted">{r.description}</span>
          </span>
          <span role="cell" className="flex justify-center">
            {r.app === null ? (
              <span role="img" aria-label={notApplicableLabel} className="text-unknown-soft">—</span>
            ) : (
              <CompactSwitch size="cell" hideLabel label={cellLabel(r.title, 'app')} checked={r.app} onCheckedChange={(v) => onChange(r.id, 'app', v)} />
            )}
          </span>
          <span role="cell" className="flex justify-center">
            {r.emailLocked ? (
              <span role="img" title={lockedHint} aria-label={`${lockedLabel}. ${lockedHint}`} className="flex h-11 w-14 items-center justify-center text-muted"><Icon name="lock" size={18} /></span>
            ) : (
              <CompactSwitch size="cell" hideLabel muted={r.muted} label={cellLabel(r.title, 'email')} checked={r.email} onCheckedChange={(v) => onChange(r.id, 'email', v)} />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** PauseRemindersRow (F26 FR-6): a linha inteira é o interruptor (`role="switch"`); ligado = fundo âmbar. Ligar esmaece os interruptores `muted` da tabela (200 ms). */
export type PauseRemindersRowProps = { title: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void };

export function PauseRemindersRow({ title, description, checked, onCheckedChange }: PauseRemindersRowProps) {
  return (
    <RS.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={`group box-border flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-[18px] border-[1.5px] px-3.5 py-1.5 text-left text-ink transition-colors duration-[250ms] ${checked ? 'border-watch-on-dark bg-watch-bg' : 'border-border-strong bg-surface'} ${focusRing}`}
    >
      <span className="flex grow flex-col leading-[1.3]">
        <span className="font-bold">{title}</span>
        <span className="text-[12.5px] text-muted">{description}</span>
      </span>
      <SwitchTrack size="row" tone="watch" />
    </RS.Root>
  );
}

/** ReminderTimeChoice (F26 FR-6): título, escolha única de horário (chips de 44 px, `aria-pressed`) e nota de fuso. */
export type ReminderTimeChoiceProps = { title: string; groupLabel: string; note: string; options: ReadonlyArray<string>; value: string; onChange: (value: string) => void };

export function ReminderTimeChoice({ title, groupLabel, note, options, value, onChange }: ReminderTimeChoiceProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-divider px-1 pb-1 pt-3.5">
      <span className="text-[14.5px] font-bold">{title}</span>
      <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-2">
        {options.map((o) => <FilterChip key={o} pressed={value === o} onClick={() => onChange(o)}>{o}</FilterChip>)}
      </div>
      <span className="text-[12.5px] text-muted">{note}</span>
    </div>
  );
}

/** CategoryChips: filtro de categoria da página com contagem de não lidas (só aparece se > 0). Grupo com `aria-label`. */
export type CategoryChipsProps = { label: string; items: ReadonlyArray<{ id: string; label: string; count: number }>; value: string; onChange: (id: string) => void };

export function CategoryChips({ label, items, value, onChange }: CategoryChipsProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((c) => <FilterChip key={c.id} pressed={value === c.id} count={c.count > 0 ? c.count : undefined} onClick={() => onChange(c.id)}>{c.label}</FilterChip>)}
    </div>
  );
}
