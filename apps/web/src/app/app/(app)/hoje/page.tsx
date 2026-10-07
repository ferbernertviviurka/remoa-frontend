import type {
  BoardSummary,
  CoverageRow,
  CardDetail,
  HomeSummary,
  QueueItem,
  RetrievabilityMap,
  OnboardingState,
  AccountSnapshot,
  UpcomingEvents,
} from "@remoa/contracts";
import { Suspense } from "react";
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { EmptyState } from "@/features/shell/empty-state";
import { HomeView, CoverageRows, type FirstInQueue } from "@/features/home/home-view";
import { LibraryBanner } from "@/features/home/library-banner";
import { CalendarStrip, UpcomingCard } from "@/features/home/home-calendar";
import { ActivationChecklist } from "@/features/onboarding/activation-checklist";
import { SkeletonBlock } from "@remoa/ui";
import { serverApi } from "@/lib/api/server";

const t = withStrings({ home: more.home });

const data = <T,>(r: { ok: true; data: T } | { ok: false }, fallback: T): T =>
  r.ok ? r.data : fallback;

/**
 * "A fila começa por X": título e lembrança estimada do primeiro item vencido. Falha silenciosa: só some a frase.
 * D-996 (P-443b, FR-47): the title comes from one card (GET /v1/cards/:id), not the whole BoardGraph; and the card and the retrievability
 * go out together. CCR: `QueueItem.title?` would drop the card call (the queue already reads the card row); the code uses it when it arrives.
 */
async function firstInQueue(): Promise<FirstInQueue | undefined> {
  const q = await serverApi<QueueItem[]>("/v1/review/queue?limit=1");
  const item = q.ok ? q.data[0] : undefined;
  if (!item || item.reason !== "due") return undefined;
  const inline = (item as QueueItem & { title?: string }).title;
  const [c, r] = await Promise.all([
    inline ? Promise.resolve(undefined) : serverApi<CardDetail>(`/v1/cards/${item.cardId}`),
    serverApi<RetrievabilityMap>(`/v1/review/retrievability?boardId=${item.boardId}`),
  ]);
  const title = inline ?? (c?.ok ? c.data.title : undefined);
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

/** Independent sections (D-996): each awaits its own (React-cached) GET, so the hero never waits for them. */
async function Checklist() {
  const ob = await serverApi<OnboardingState>("/v1/onboarding");
  return <ActivationChecklist items={ob.ok ? ob.data.checklist : []} />;
}
async function CalendarSlot({ part, now }: { part: "strip" | "card"; now: Date }) {
  const [upcoming, me] = await Promise.all([
    // F25 FR-17: the shell asks the same path (limit 4), so it is one request per render.
    serverApi<UpcomingEvents>("/v1/calendar/upcoming?limit=4"),
    serverApi<AccountSnapshot>("/v1/account/me"),
  ]);
  if (!upcoming.ok) return null;
  return part === "strip" ? (
    <CalendarStrip upcoming={upcoming.data} />
  ) : (
    <UpcomingCard upcoming={upcoming.data} timeZone={me.ok ? me.data.profile.timezone : "America/Sao_Paulo"} now={now} />
  );
}
async function Coverage() {
  const coverage = await serverApi<CoverageRow[]>("/v1/coverage");
  return <CoverageRows coverage={data(coverage, [])} />;
}

export default async function Page() {
  const now = new Date();
  const first = firstInQueue().catch(() => undefined); // dispara já, em paralelo com o resto
  // The hero needs only /home + /boards. Everything else streams in its own Suspense.
  const [home, boards, seeds] = await Promise.all([
    serverApi<HomeSummary>("/v1/home"),
    serverApi<BoardSummary[]>("/v1/boards?include=preview"),
    serverApi<{ id: string }[]>("/v1/editorial/seeds"),
  ]);
  const libraryBanner = seeds.ok && seeds.data.length > 0 ? <LibraryBanner /> : null;
  if (!home.ok)
    return <EmptyState title={t("pages.home")} body={t("home.loadError")} />;
  return (
    <HomeView
      now={now}
      summary={home.data}
      boards={data(boards, [])}
      coverage={[]}
      slots={{
        libraryBanner,
        checklist: <Suspense fallback={null}><Checklist /></Suspense>,
        calendarStrip: <Suspense fallback={null}><CalendarSlot part="strip" now={now} /></Suspense>,
        calendarCard: <Suspense fallback={null}><CalendarSlot part="card" now={now} /></Suspense>,
        coverage: (
          <Suspense fallback={<SkeletonBlock width={300} height={14} radius={7} />}>
            <Coverage />
          </Suspense>
        ),
      }}
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
