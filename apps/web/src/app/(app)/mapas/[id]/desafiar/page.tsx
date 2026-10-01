import { notFound } from 'next/navigation';
import type { BoardGraph } from '@remoa/contracts';
import { ChallengeSession } from '@/features/challenge/session';
import { serverApi } from '@/lib/api/server';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await serverApi<BoardGraph>(`/v1/boards/${encodeURIComponent(id)}`);
  if (!r.ok) {
    if (r.error.code === 'not_found' || r.error.code === 'validation') notFound();
    throw new Error(r.error.message);
  }
  return <ChallengeSession kind="board" boardId={id} boardTitle={r.data.board.title} />;
}
