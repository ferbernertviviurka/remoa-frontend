'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  normalizeReferralCode,
  magicLinkInputSchema as magicSchema,
  signInInputSchema as signInSchema,
  signUpInputSchema as signUpSchema,
  type ErrorCode,
  type MagicLinkInput,
  type SignInInput,
  type SignUpInput,
} from '@remoa/contracts';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

export type AuthResult = { ok: true } | { ok: false; error: { code: ErrorCode; message: string } };
const fail = (code: ErrorCode, message: string): AuthResult => ({ ok: false, error: { code, message } });
const invalid = () => fail('validation', 'invalid input');


async function origin() {
  const h = await headers();
  return h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
}

function fromSupabase(e: { status?: number; code?: string; message: string }): AuthResult {
  if (e.code === 'user_already_exists' || e.code === 'email_exists') return fail('conflict', e.message);
  if (e.status === 429) return fail('rate_limited', e.message);
  if (e.status && e.status >= 500) return fail('internal', e.message);
  return fail('unauthorized', e.message);
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const p = signUpSchema.safeParse(input);
  if (!p.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { data: p.data.name ? { name: p.data.name } : undefined },
  });
  return error ? fromSupabase(error) : { ok: true }; // local config has confirmations off: session is set immediately
}

export async function signIn(input: SignInInput): Promise<AuthResult> {
  const p = signInSchema.safeParse(input);
  if (!p.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  return error ? fromSupabase(error) : { ok: true };
}

export async function sendMagicLink(input: MagicLinkInput): Promise<AuthResult> {
  const p = magicSchema.safeParse(input);
  if (!p.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: p.data.email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(p.data.next))}` },
  });
  return error ? fromSupabase(error) : { ok: true };
}

/** `rf` = invite code (F18, D-383): rides in the `redirectTo` because Supabase's own `state` is not ours. Malformed codes are dropped. */
export async function signInWithGoogle(input?: { next?: string; rf?: string }): Promise<AuthResult> {
  if (process.env.NEXT_PUBLIC_AUTH_GOOGLE !== '1') return fail('forbidden', 'google sign-in disabled');
  const rf = input?.rf ? normalizeReferralCode(input.rf) : null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(input?.next))}${rf ? `&rf=${rf}` : ''}` },
  });
  if (error) return fromSupabase(error);
  redirect(data.url); // throws NEXT_REDIRECT on success
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient();
  // D-320: 'local' encerra só este aparelho; o padrão 'global' derrubava a sessão em todos ("Encerrar os outros" fica em /app/conta/seguranca).
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return error ? fromSupabase(error) : { ok: true };
}

/** G14/D-588: admin session > 12 h. New password sign-in for the CURRENT user (email from the session, never from the client) renews the amr timestamp the API checks. */
export async function reauthenticate(password: string): Promise<AuthResult> {
  if (!password) return invalid();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return fail('unauthorized', 'no session');
  const { error } = await supabase.auth.signInWithPassword({ email: data.user.email, password });
  return error ? fromSupabase(error) : { ok: true };
}
