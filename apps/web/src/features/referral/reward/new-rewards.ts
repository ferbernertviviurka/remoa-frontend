import type { ReferralFriend, ReferralSummary } from '@remoa/contracts';

/** Só no navegador (FR-5/FR-12): quais indicações qualificadas o usuário já viu, e se vale consultar o summary fora da página. */
const SEEN_KEY = 'remoa:referral-seen';
const HINT_KEY = 'remoa:referral-pending';

const read = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* sem armazenamento: o aviso só não persiste */ }
};

export const qualifiedIds = (s: Pick<ReferralSummary, 'friends'>) => s.friends.filter((f) => f.status === 'qualified').map((f) => f.id);

export function readSeen(): Set<string> | null {
  const raw = read(SEEN_KEY);
  if (raw === null) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? new Set(v.filter((x): x is string => typeof x === 'string')) : null;
  } catch {
    return null;
  }
}
export const writeSeen = (ids: string[]) => write(SEEN_KEY, JSON.stringify(ids));

/** Amigos que passaram a "primeiro mapa criado" desde a última vez. Sem registro anterior, nada é novo (só semeia). */
export function newlyQualified(seen: ReadonlySet<string> | null, s: Pick<ReferralSummary, 'friends'>): ReferralFriend[] {
  if (!seen) return [];
  return s.friends.filter((f) => f.status === 'qualified' && !seen.has(f.id));
}

/** Consulta fora da página só com indicação pendente ou depois de compartilhar (D-413). */
export const readHint = () => read(HINT_KEY) === '1';
export const writeHint = (on: boolean) => write(HINT_KEY, on ? '1' : '0');
