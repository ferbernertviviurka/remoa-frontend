import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import type { QueueStatus } from './op-queue';

const t = withStrings({ map: more.map });

/** "Salvo há 2 min" (D-086: the editor shows its own save state). `savedAt` null = nothing saved this session → board.updatedAt. */
export function saveText(status: Pick<QueueStatus, 'state' | 'savedAt'>, updatedAt: Date | string, now: number): string {
  if (status.state === 'saving') return t('editor.saving');
  if (status.state === 'offline') return t('map.save.offline');
  if (status.state === 'error') return t('map.save.error');
  const min = Math.max(0, Math.floor((now - (status.savedAt ?? new Date(updatedAt).getTime())) / 60_000));
  if (min < 1) return t('editor.savedNow');
  const time = min < 60 ? t('map.ago.minutes', { n: min }) : t('map.ago.hours', { n: Math.floor(min / 60) });
  return t('editor.savedLabel', { time });
}
