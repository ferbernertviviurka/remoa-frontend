import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const url = () => process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';

/** Test-only SQL against the local Supabase (fixtures the API cannot write, and assertions on stored rows). */
export function psql(sql: string): string {
  return execFileSync('psql', [url(), '-q', '-t', '-A', '-c', sql]).toString().trim();
}

/**
 * D-1213: every new account starts with 15 days of Pro (sign-up trigger). Specs are written for the plan they set up, so the shared
 * sign-up helpers take the trial off. Returns how many trial grants were removed (0 if the account does not exist yet).
 */
export function dropTrial(email: string): number {
  const e = email.replace(/'/g, "''");
  return Number(psql(`with d as (delete from entitlement_grants g using auth.users u where u.id = g.user_id and g.source = 'trial' and lower(u.email) = lower('${e}') returning 1) select count(*) from d`));
}
