'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
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

export async function signInWithGoogle(input?: { next?: string }): Promise<AuthResult> {
  if (process.env.NEXT_PUBLIC_AUTH_GOOGLE !== '1') return fail('forbidden', 'google sign-in disabled');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(input?.next))}` },
  });
  if (error) return fromSupabase(error);
  redirect(data.url); // throws NEXT_REDIRECT on success
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return error ? fromSupabase(error) : { ok: true };
}
