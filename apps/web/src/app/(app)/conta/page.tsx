import { redirect } from 'next/navigation';

/** `/conta` → `/conta/perfil`; the Stripe return flags (`?checkout=ok`, `?portal=ok`) go to the plan section. */
export default async function Page({ searchParams }: { searchParams: Promise<{ checkout?: string; portal?: string }> }) {
  const q = await searchParams;
  const flag = q.checkout === 'ok' ? 'checkout=ok' : q.portal === 'ok' ? 'portal=ok' : null;
  redirect(flag ? `/conta/plano?${flag}` : '/conta/perfil');
}
