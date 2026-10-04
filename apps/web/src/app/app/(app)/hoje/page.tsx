import type {
  BoardSummary,
  CoverageRow,
  HomeSummary,
  QueueItem,
  RetrievabilityMap,
  BoardGraph,
} from "@remoa/contracts";
import { Suspense } from "react";
import { t } from "@remoa/strings";
import { EmptyState } from "@/features/shell/empty-state";
import { HomeView, type FirstInQueue } from "@/features/home/home-view";
import { SkeletonBlock } from "@remoa/ui";
import { serverApi } from "@/lib/api/server";

const data = <T,>(r: { ok: true; data: T } | { ok: false }, fallback: T): T =>
  r.ok ? r.data : fallback;

/** "A fila começa por X": título e lembrança estimada do primeiro item vencido da fila. Falha silenciosa: só some a frase. */
async function firstInQueue(): Promise<FirstInQueue | undefined> {
  const q = await serverApi<QueueItem[]>("/v1/review/queue?limit=1");
  const item = q.ok ? q.data[0] : undefined;
  if (!item || item.reason !== "due") return undefined;
  const [g, r] = await Promise.all([
    serverApi<BoardGraph>(`/v1/boards/${item.boardId}`),
    serverApi<RetrievabilityMap>(
      `/v1/review/retrievability?boardId=${item.boardId}`,
    ),
  ]);
  const title = g.ok
    ? g.data.cards.find((c) => c.id === item.cardId)?.title
    : undefined;
  const rr = r.ok ? r.data[item.cardId]?.r : undefined;
  return title && rr !== undefined
    ? { title, pct: Math.round(rr * 100) }
    : undefined;
}

export const metadata = { title: t("pages.home") };

/** Streamed: o hero aparece sem esperar a frase (fila → título + lembrança). */
async function QueueStart({
  first,
}: {
  first: Promise<FirstInQueue | undefined>;
}) {
  const f = await first;
  return f ? t("home.queueStart", { card: f.title, pct: f.pct }) : null;
}

export default async function Page() {
  const first = firstInQueue().catch(() => undefined); // dispara já, em paralelo com o resto
  const [home, boards, coverage] = await Promise.all([
    serverApi<HomeSummary>("/v1/home"),
    serverApi<BoardSummary[]>("/v1/boards"),
    serverApi<CoverageRow[]>("/v1/coverage"),
  ]);
  if (!home.ok)
    return <EmptyState title={t("pages.home")} body={t("home.loadError")} />;
  return (
    <HomeView
      now={new Date()}
      summary={home.data}
      boards={data(boards, [])}
      coverage={data(coverage, [])}
      queueStart={
        <Suspense
          fallback={<SkeletonBlock width={300} height={14} radius={7} />}
        >
          <QueueStart first={first} />
        </Suspense>
      }
    />
  );
}
