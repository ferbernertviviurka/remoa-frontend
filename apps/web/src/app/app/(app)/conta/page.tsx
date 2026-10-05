import { redirect } from 'next/navigation';

/** `/app/conta` → `/app/conta/perfil`; the Stripe return flags (`?checkout=ok`, `?portal=ok`) go to the plan section. */
export default async function Page({ searchParams }: { searchParams: Promise<{ checkout?: string; portal?: string }> }) {
  const q = await searchParams;
  const flag = q.checkout === 'ok' ? 'checkout=ok' : q.portal === 'ok' ? 'portal=ok' : null;
  redirect(flag ? `/app/conta/plano?${flag}` : '/app/conta/perfil');
}
