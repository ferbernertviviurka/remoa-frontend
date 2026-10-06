import type { Area, BoardAccess } from '@remoa/contracts';
import { SHARE_PASSWORD_MAX, SHARE_PASSWORD_MIN } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ newMapAbout: more.newMapAbout });

export type AboutMap = { title: string; area: Area; matrixItemIds: string[]; access: BoardAccess; password: string };
export const emptyAboutMap = (title = '', matrixItemIds: string[] = []): AboutMap => ({ title, area: 'CM', matrixItemIds, access: 'owner', password: '' });

/** FR-2/FR-3/FR-7 validation; `{}` = ready to submit. */
export function aboutErrors(v: AboutMap): { title?: string; password?: string } {
  const e: { title?: string; password?: string } = {};
  if (!v.title.trim()) e.title = t('newMapAbout.nameRequired');
  else if (v.title.trim().length > 120) e.title = t('newMapAbout.nameTooLong');
  if (v.access === 'password' && (v.password.length < SHARE_PASSWORD_MIN || v.password.length > SHARE_PASSWORD_MAX)) e.password = t('newMapAbout.passwordRequired');
  return e;
}

/** What `POST /v1/boards` and the import `board` take (password only for Privado, D-502). */
export const aboutPayload = (v: AboutMap) => ({
  title: v.title.trim(),
  area: v.area,
  matrixItemIds: v.area === 'CM' ? v.matrixItemIds : [],
  access: v.access,
  ...(v.access === 'password' ? { password: v.password } : {}),
});
