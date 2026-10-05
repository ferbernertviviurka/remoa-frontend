import { createClient } from '@/lib/supabase/client';

/**
 * G14 (D-585): sign out straight from the browser and land on /entrar.
 * The old path (server action + `window.location.assign('/')`) re-rendered the whole protected tree inside the action
 * response (cookies changed) and then fully loaded the landing. Here: one call to Supabase Auth (it revokes the session,
 * so the API refuses the token on the next request, D-565) and the cookies go with it; then a full load of the light
 * /entrar, which also drops every in-memory route payload (back button can't show cached private pages).
 * Returns false when Supabase refused (network): the session is still live and the user stays put.
 */
export async function signOutToLogin(to = '/entrar'): Promise<boolean> {
  // D-320: 'local' ends only this device ("Encerrar os outros" lives in /app/conta/seguranca).
  const { error } = await createClient().auth.signOut({ scope: 'local' });
  if (error) return false;
  window.location.replace(to);
  return true;
}
