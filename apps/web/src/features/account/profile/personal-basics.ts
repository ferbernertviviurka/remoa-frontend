// P-514 (D-1080): what the onboarding and the sign-up need before the personal-data form (Radix Select, zod schemas) loads.
import type { Sex, UserType } from '@remoa/contracts';

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
