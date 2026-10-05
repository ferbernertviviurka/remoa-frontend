'use client';

import { useEffect, useRef, useState } from 'react';
import { addressSchema, brUfs, normalizeBrPhone, sexes, signUpProfileInputSchema, userTypes, type Address, type Sex, type UserType } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { ChoiceChip, Input, Select } from '@remoa/ui';

/** G14 S1 (D-594–D-596): dados pessoais do cadastro e do perfil. PII: vive só em estado local e vai ao PATCH /v1/account/profile; nunca em log/evento. */
export type AddressDraft = { cep: string; street: string; number: string; complement: string; district: string; city: string; uf: string };
export type PersonalValues = { userType: UserType | null; sex: Sex | null; phone: string; address: AddressDraft };
export type PersonalErrors = Partial<Record<'userType' | 'phone' | 'address', string>>;

export const emptyAddress: AddressDraft = { cep: '', street: '', number: '', complement: '', district: '', city: '', uf: '' };
export const emptyPersonal: PersonalValues = { userType: null, sex: null, phone: '', address: emptyAddress };

const digits = (s: string) => s.replace(/\D/g, '');
/** "11912345678" -> "(11) 91234-5678"; incomplete input keeps a partial mask. */
export function maskPhone(input: string): string {
  const d = digits(input.startsWith('+55') ? input.slice(3) : input).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  const cut = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, cut)}${d.length > cut ? `-${d.slice(cut)}` : ''}`;
}
export const maskCep = (input: string) => {
  const d = digits(input).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const addressTouched = (a: AddressDraft) => Object.values(a).some((v) => v.trim() !== '');

/** Profile -> form values (phone shown masked). */
export function toPersonalValues(p: { userType: UserType | null; sex: Sex | null; phone: string | null; address: Address | null }): PersonalValues {
  const a = p.address;
  return {
    userType: p.userType,
    sex: p.sex,
    phone: p.phone ? maskPhone(p.phone) : '',
    address: a ? { cep: maskCep(a.cep), street: a.street, number: a.number, complement: a.complement ?? '', district: a.district, city: a.city, uf: a.uf } : emptyAddress,
  };
}

/** Validates with the contract schemas. `payload` has no nulls (optional blocks left empty are omitted); `clear` lists what the profile form is clearing. */
export function validatePersonal(v: PersonalValues, opts: { userType?: boolean } = {}): { errors: PersonalErrors; payload: Partial<ReturnType<typeof signUpProfileInputSchema.parse>> | null } {
  const errors: PersonalErrors = {};
  if (opts.userType !== false && !v.userType) errors.userType = t('personal.userType.required');
  if (v.phone.trim() && !normalizeBrPhone(v.phone)) errors.phone = t('personal.phone.invalid');
  const address = addressTouched(v.address) ? addressSchema.safeParse({ ...v.address, complement: v.address.complement }) : null;
  if (address && !address.success) errors.address = t('personal.address.incomplete');
  if (Object.keys(errors).length) return { errors, payload: null };
  const parsed = (opts.userType === false ? signUpProfileInputSchema.partial() : signUpProfileInputSchema).safeParse({
    ...(v.userType ? { userType: v.userType } : {}),
    ...(v.sex ? { sex: v.sex } : {}),
    ...(v.phone.trim() ? { phone: v.phone } : {}),
    ...(address?.success ? { address: address.data } : {}),
  });
  return parsed.success ? { errors, payload: parsed.data } : { errors: { address: t('personal.address.incomplete') }, payload: null };
}

type Lookup = 'idle' | 'loading' | 'found' | 'notFound' | 'offline';
type ViaCep = { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

export async function fetchCep(cep: string, signal?: AbortSignal): Promise<Lookup | { street: string; district: string; city: string; uf: string }> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
    if (!res.ok) return res.status === 400 ? 'notFound' : 'offline';
    const j = (await res.json()) as ViaCep;
    if (j.erro) return 'notFound';
    return { street: j.logradouro ?? '', district: j.bairro ?? '', city: j.localidade ?? '', uf: j.uf ?? '' };
  } catch {
    return 'offline';
  }
}

const FieldNote = ({ id, tone, children }: { id: string; tone: 'error' | 'muted'; children: string }) => (
  <p id={id} role={tone === 'error' ? 'alert' : 'status'} className={`m-0 text-sm ${tone === 'error' ? 'font-semibold text-review-text' : 'text-muted'}`}>{children}</p>
);

type Props = {
  value: PersonalValues;
  onChange: (v: PersonalValues) => void;
  errors?: PersonalErrors;
  /** Prefix for element ids (the sign-up and the profile can both exist in a page). */
  idPrefix?: string;
  /** The sign-up does not ask it (the onboarding does). */
  hideUserType?: boolean;
};

export function PersonalFields({ value, onChange, errors = {}, idPrefix = 'pf', hideUserType = false }: Props) {
  const [lookup, setLookup] = useState<Lookup>('idle');
  const abort = useRef<AbortController | null>(null);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => () => abort.current?.abort(), []);

  const set = <K extends keyof PersonalValues>(k: K, v: PersonalValues[K]) => onChange({ ...latest.current, [k]: v });
  const setAddr = (patch: Partial<AddressDraft>) => set('address', { ...latest.current.address, ...patch });

  async function onCep(raw: string) {
    const cep = maskCep(raw);
    setAddr({ cep });
    abort.current?.abort();
    if (digits(cep).length !== 8) return setLookup('idle');
    const ctl = (abort.current = new AbortController());
    setLookup('loading');
    const r = await fetchCep(digits(cep), ctl.signal);
    if (ctl.signal.aborted) return;
    if (typeof r === 'string') return setLookup(r);
    setLookup('found');
    // Fields stay editable; the lookup only fills what ViaCEP knows (a CEP without street, e.g. a whole city, keeps what was typed).
    const a = latest.current.address;
    setAddr({ street: r.street || a.street, district: r.district || a.district, city: r.city || a.city, uf: (brUfs as readonly string[]).includes(r.uf) ? r.uf : a.uf });
  }

  const a = value.address;
  const p = idPrefix;
  const cepNote = lookup === 'loading' ? t('personal.address.searching') : lookup === 'notFound' ? t('personal.address.notFound') : lookup === 'offline' ? t('personal.address.offline') : lookup === 'found' ? t('personal.address.found') : null;
  return (
    <>
      {hideUserType ? null : <div className="flex flex-col gap-2">
        <span className="font-bold text-ink">{t('personal.userType.label')}</span>
        <ChoiceChip label={t('personal.userType.label')} options={userTypes.map((u) => ({ value: u, label: t(`personal.userType.${u}`) }))} value={value.userType} onValueChange={(u) => set('userType', u as UserType)} />
        {errors.userType ? <FieldNote id={`${p}-type-err`} tone="error">{errors.userType}</FieldNote> : null}
      </div>}
      <div className="flex flex-col gap-2">
        <span className="font-bold text-ink">{t('personal.sex.label')}</span>
        <ChoiceChip label={t('personal.sex.label')} options={sexes.map((s) => ({ value: s, label: t(`personal.sex.${s}` as StringKey) }))} value={value.sex} onValueChange={(s) => set('sex', s as Sex)} />
      </div>
      <div className="flex flex-col gap-2">
        <Input label={t('personal.phone.label')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t('personal.phone.placeholder')} value={value.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? `${p}-phone-err` : undefined} />
        {errors.phone ? <FieldNote id={`${p}-phone-err`} tone="error">{errors.phone}</FieldNote> : null}
      </div>
      <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="mb-3 p-0 font-bold text-ink">{t('personal.address.title')}</legend>
        <div className="flex flex-col gap-2">
          <Input label={t('personal.address.cep')} inputMode="numeric" autoComplete="postal-code" placeholder={t('personal.address.cepPlaceholder')} value={a.cep} onChange={(e) => void onCep(e.target.value)} aria-invalid={lookup === 'notFound' || undefined} aria-describedby={cepNote ? `${p}-cep-note` : undefined} />
          {cepNote ? <FieldNote id={`${p}-cep-note`} tone={lookup === 'notFound' ? 'error' : 'muted'}>{cepNote}</FieldNote> : null}
        </div>
        <Input label={t('personal.address.street')} autoComplete="address-line1" value={a.street} onChange={(e) => setAddr({ street: e.target.value })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Input label={t('personal.address.number')} autoComplete="off" value={a.number} maxLength={10} onChange={(e) => setAddr({ number: e.target.value })} aria-describedby={`${p}-num-help`} />
            <span id={`${p}-num-help`} className="text-[13px] text-muted">{t('personal.address.numberHelp')}</span>
          </div>
          <Input label={t('personal.address.complement')} autoComplete="address-line2" value={a.complement} maxLength={60} onChange={(e) => setAddr({ complement: e.target.value })} />
        </div>
        <Input label={t('personal.address.district')} value={a.district} onChange={(e) => setAddr({ district: e.target.value })} />
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
          <Input label={t('personal.address.city')} autoComplete="address-level2" value={a.city} onChange={(e) => setAddr({ city: e.target.value })} />
          <Select label={t('personal.address.uf')} placeholder={t('personal.address.ufPlaceholder')} options={brUfs.map((u) => ({ value: u, label: `${u} · ${t(`personal.address.ufNames.${u}`)}` }))} value={a.uf} onValueChange={(uf) => setAddr({ uf })} />
        </div>
        {errors.address ? <FieldNote id={`${p}-addr-err`} tone="error">{errors.address}</FieldNote> : null}
      </fieldset>
    </>
  );
}
