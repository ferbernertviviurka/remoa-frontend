import { studyProfileInputSchema } from '@remoa/contracts';
// Test double of the server action: same zod gate as production, then the test API creates auth.users with the metadata Supabase would store.
export async function signUp(input: { email: string; password: string; name: string; studyProfile?: unknown; next?: string }) {
  const sp = input.studyProfile ? studyProfileInputSchema.safeParse({ ...(input.studyProfile as object), context: 'signup' }) : null;
  const meta = { name: input.name, ...(sp?.success ? { study_profile: sp.data } : {}) };
  (window as unknown as { __signup: unknown }).__signup = { email: input.email, hasPassword: !!input.password, meta };
  const r = await fetch('/__test/signup', { method: 'POST', body: JSON.stringify({ email: input.email, name: input.name, study_profile: sp?.success ? sp.data : undefined }) });
  const j = await r.json(); localStorage.setItem('g28p-last-signup', JSON.stringify(j));
  return { ok: true as const };
}
export async function resendConfirmation() { return { ok: true as const }; }
export type AuthResult = { ok: true } | { ok: false; error: { code: string; message: string } };
const ok = async () => ({ ok: true as const });
export const signIn = ok, sendMagicLink = ok, signInWithGoogle = ok, requestPasswordReset = ok, updatePassword = ok, signOut = ok, reauthenticate = ok;
