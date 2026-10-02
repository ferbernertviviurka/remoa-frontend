import type { UsageTone } from '../account/usage-meter';

/** UsageCaption (F15 FR-4): "Você usa 2 de 2" na coluna do plano atual. Tom: normal | warn (âmbar, ≥ 80%) | danger (laranja, 100%). O texto vem pronto por `children`. */
const color: Record<Exclude<UsageTone, 'unlimited'>, string> = { normal: 'text-ink-2', warn: 'text-watch-text', danger: 'text-review-text' };

export function UsageCaption({ children, tone = 'normal' }: { children: string; tone?: Exclude<UsageTone, 'unlimited'> }) {
  return <span data-tone={tone} className={`mt-2 block text-[13px] font-semibold ${color[tone]}`}>{children}</span>;
}
