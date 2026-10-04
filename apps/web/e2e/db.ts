import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const url = () => process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';

/** Test-only SQL against the local Supabase (fixtures the API cannot write, and assertions on stored rows). */
export function psql(sql: string): string {
  return execFileSync('psql', [url(), '-q', '-t', '-A', '-c', sql]).toString().trim();
}
