'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { areas, boardAccess, type Area, type BoardAccess, type MatrixItem } from '@remoa/contracts';
import { MAX_MATRIX_ITEMS_PER_BOARD, SHARE_PASSWORD_MAX, SHARE_PASSWORD_MIN } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Combobox, FilterChip, Input, PasswordInput, Segmented } from '@remoa/ui';

const t = withStrings({ boards: more.boards, boardsAccess: more.boardsAccess, importExisting: more.importExisting, newMapAbout: more.newMapAbout });
type StringKey = Parameters<typeof t>[0];

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

type Props = {
  value: AboutMap;
  onChange: (v: AboutMap) => void;
  /** All CM matrix items (groups included: they label the leaves). */
  items: ReadonlyArray<MatrixItem>;
  suggestions: ReadonlyArray<MatrixItem>;
  showErrors: boolean;
  /** FR-11: importing into an existing map keeps its access. */
  accessLocked?: boolean;
  /** FR-21: the map is already Privado, so an empty password keeps the current one. */
  passwordOptional?: boolean;
};

/**
 * F17 "Sobre o mapa" (FR-2, FR-4–FR-7), the same form on the Anki, PDF and Em branco paths:
 * name (focused) → area (5, changing clears the items) → matrix items (search, up to 10) → access (+ password on Privado).
 */
export function AboutMapForm({ value, onChange, items, suggestions, showErrors, accessLocked = false, passwordOptional = false }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const ids = { nameErr: useId(), access: useId() };
  const [areaCleared, setAreaCleared] = useState(false);
  useEffect(() => nameRef.current?.focus(), []);
  const errors = showErrors ? aboutErrors(value) : {};
  if (passwordOptional && !value.password) delete errors.password;
  const set = (patch: Partial<AboutMap>) => onChange({ ...value, ...patch });

  const parents = new Map(items.map((i) => [i.id, i.title]));
  const leaves = items.filter((i) => !items.some((c) => c.parentId === i.id));
  const option = (i: MatrixItem) => ({ value: i.id, label: i.title, description: i.code, group: i.parentId ? parents.get(i.parentId) : undefined });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Input
          ref={nameRef}
          label={t('newMapAbout.nameLabel')}
          value={value.title}
          maxLength={120}
          required
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? ids.nameErr : undefined}
          onChange={(e) => set({ title: e.target.value })}
        />
        {errors.title ? <p id={ids.nameErr} className="m-0 text-sm font-semibold text-review">{errors.title}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-bold">{t('newMapAbout.areaLabel')}</span>
        <div role="group" aria-label={t('newMapAbout.areaLabel')} className="flex flex-wrap gap-2.5">
          {areas.map((a) => (
            <FilterChip
              key={a}
              pressed={value.area === a}
              onClick={() => {
                if (a === value.area) return;
                setAreaCleared(value.matrixItemIds.length > 0);
                set({ area: a, matrixItemIds: [] });
              }}
            >
              {t(`boards.area.${a}` as StringKey)}
            </FilterChip>
          ))}
        </div>
        {areaCleared ? <p role="status" className="m-0 text-sm text-muted">{t('newMapAbout.areaChangedWarning')}</p> : null}
      </div>

      <Combobox
        label={t('newMapAbout.itemsLabel')}
        placeholder={t('newMapAbout.searchPlaceholder')}
        options={leaves.map(option)}
        suggestions={value.area === 'CM' ? suggestions.filter((s) => leaves.some((l) => l.id === s.id)).map(option) : []}
        suggestionsLabel={t('newMapAbout.suggestionsLabel')}
        value={value.matrixItemIds}
        onValueChange={(next) => {
          setAreaCleared(false);
          set({ matrixItemIds: next });
        }}
        max={MAX_MATRIX_ITEMS_PER_BOARD}
        maxMessage={t('newMapAbout.itemsMax', { max: MAX_MATRIX_ITEMS_PER_BOARD })}
        removeChipAriaLabel={(label) => t('newMapAbout.removeItem', { label })}
        emptyLabel={t('newMapAbout.emptySearch')}
        disabledMessage={value.area === 'CM' ? undefined : t('newMapAbout.noMatrixMessage')}
      />

      <div className="flex flex-col gap-2">
        <span className="font-bold">{t('newMapAbout.accessLabel')}</span>
        {accessLocked ? (
          <p className="m-0 text-sm text-muted">{t('importExisting.accessWarning')}</p>
        ) : (
          <>
            <Segmented
              aria-label={t('newMapAbout.accessLabel')}
              value={value.access}
              onValueChange={(a) => set({ access: a as BoardAccess, password: a === 'password' ? value.password : '' })}
              options={boardAccess.map((a) => ({ value: a, label: t(`boardsAccess.${a}`), describedBy: value.access === a ? ids.access : undefined }))}
            />
            <p id={ids.access} className="m-0 text-sm text-muted">{t(`boardsAccess.${value.access}Desc`)}</p>
            {value.access === 'password' ? (
              <PasswordInput
                label={t('newMapAbout.passwordLabel')}
                showAriaLabel={t('newMapAbout.passwordShowAriaLabel')}
                hideAriaLabel={t('newMapAbout.passwordHideAriaLabel')}
                hint={t('newMapAbout.passwordHint')}
                error={errors.password}
                autocomplete="new-password"
                minLength={SHARE_PASSWORD_MIN}
                maxLength={SHARE_PASSWORD_MAX}
                required
                value={value.password}
                onChange={(e) => set({ password: e.target.value })}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
