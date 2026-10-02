import { permanentRedirect } from 'next/navigation';

/** D-180: /precos moved to /planos; `periodo` and `de` survive the redirect. */
export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string }> }) {
  const { periodo, de } = await searchParams;
  const q = new URLSearchParams();
  if (periodo) q.set('periodo', periodo);
  if (de) q.set('de', de);
  permanentRedirect(`/planos${q.size ? `?${q}` : ''}`);
}
