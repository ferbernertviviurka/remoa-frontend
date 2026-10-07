import { notFound } from 'next/navigation';
import type { BoardGraph } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { SummaryScreen } from '@/features/challenge-ai/summary-screen';

/** F32 T9: "Resumo com IA" of the map. Card titles come from the board so the cited cards read as names. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await serverApi<BoardGraph>(`/v1/boards/${encodeURIComponent(id)}`);
  if (!r.ok) {
    if (r.error.code === 'not_found' || r.error.code === 'validation') notFound();
    throw new Error(r.error.message);
  }
  const cardTitles = Object.fromEntries(r.data.cards.map((c) => [c.id, c.title]));
  return <SummaryScreen boardId={id} cardTitles={cardTitles} />;
}
