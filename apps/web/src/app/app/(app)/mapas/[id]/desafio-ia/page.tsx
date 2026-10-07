import { redirect } from 'next/navigation';
import { SessionScreen } from '@/features/challenge-ai/session-screen';

// F32 T7: "Desafio com IA" session (?session=<id>). Without a session id, back to the map.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session?: string | string[] }> }) {
  const [{ id }, { session }] = await Promise.all([params, searchParams]);
  const sessionId = typeof session === 'string' && session ? session : null;
  if (!sessionId) redirect(`/app/mapas/${encodeURIComponent(id)}`);
  return <SessionScreen boardId={id} sessionId={sessionId} />;
}
