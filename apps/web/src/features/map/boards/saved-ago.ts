import { t } from '@remoa/strings';

/** "agora" / "há 3 min" / "há 2 h" / "ontem" / "há 4 dias" / "há 2 semanas" from an ISO date (the card shows "Salvo {time}"). */
export function savedAgo(iso: Date | string, now: number): string {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return t('library.ago.now');
  if (min < 60) return t('library.ago.minutes', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('library.ago.hours', { n: h });
  const d = Math.floor(h / 24);
  if (d === 1) return t('library.ago.yesterday');
  return d < 7 ? t('library.ago.days', { n: d }) : t('library.ago.weeks', { n: Math.floor(d / 7) });
}

/** Search key: no accents, no case. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
