import { redirect } from 'next/navigation';
import type { ProfileRole } from '@remoa/contracts';
import { createClient } from '@/lib/supabase/server';

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Redirects to /entrar when signed out. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/entrar');
  return user;
}

/** Redirects to /mapas when the profile role is not in `roles` (e.g. requireRole(['reviewer','admin']) in the editorial layout). */
export async function requireRole(roles: readonly ProfileRole[]) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!data || !roles.includes(data.role as ProfileRole)) redirect('/app/mapas');
  return user;
}
