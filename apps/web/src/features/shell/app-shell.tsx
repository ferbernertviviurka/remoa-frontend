import type { ReactNode } from "react";
import type { AccountSnapshot, BoardSummary, Entitlements, ReviewHub, UpcomingEvents } from "@remoa/contracts";
import { t } from "@remoa/strings";
import { Logo } from "@remoa/ui";
import { serverApi } from "@/lib/api/server";
import { MobileMenu } from "./mobile-menu";
import { EntitlementsProvider } from "./entitlements";
import { Navbar, RailSlot } from "./navbar";
import { NotificationBell, NotificationsProvider } from "@/features/notifications";
import { ReferralProvider } from "@/features/referral/reward/referral-provider";
import { MainSlot, NavPendingProvider, PendingLink } from "./nav-pending";
import { Rail } from "./rail";
import { CommandPaletteProvider, PaletteButton } from "./command-palette";
import { ChallengeTourHost } from "@/features/challenge/tour";

const shellPaths = ["/v1/boards", "/v1/account/me", "/v1/billing/entitlements", "/v1/review/hub", "/v1/calendar/upcoming?limit=4"] as const;
/** D-995: starts the shell's GETs early (the layout calls it before its guards); same paths as below, so serverApi's per-render dedupe makes them one request each. */
export const prefetchShell = () => Promise.allSettled(shellPaths.map((p) => serverApi(p)));

export async function AppShell({ children }: { children: ReactNode }) {
  // A failing API must never break the shell: no badge instead.
  // ponytail: /me is the full account snapshot; a slim "rail identity" endpoint if it shows in the shell's latency.
  const [boards, me, entitlements, hub, upcoming] = await Promise.all([
    serverApi<BoardSummary[]>("/v1/boards")
      .then((r) => (r.ok ? r.data : []))
      .catch(() => []),
    serverApi<AccountSnapshot>("/v1/account/me")
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null),
    serverApi<Entitlements>("/v1/billing/entitlements")
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null),
    // G15 FR-1: the badge is the default queue (due + new up to the plan limit), the same number /revisar shows
    serverApi<ReviewHub>("/v1/review/hub")
      .then((r) => (r.ok ? r.data.queue.defaultCount : null))
      .catch(() => null),
    // F25 FR-1: the Calendário dot. Same path as Hoje's card (limit 4), so one request per render (serverApi dedupes GETs).
    serverApi<UpcomingEvents>("/v1/calendar/upcoming?limit=4")
      .then((r) => (r.ok ? r.data.within24h : false))
      .catch(() => false),
  ]);
  const account = me && { name: me.profile.name, email: me.email, color: me.profile.avatarColor, src: me.avatarUrls?.small };
  const dueTotal = hub ?? boards.reduce((a, b) => a + b.dueCount, 0);
  return (
    <NavPendingProvider>
      <EntitlementsProvider initial={entitlements}>
      <ReferralProvider>
      <NotificationsProvider timezone={me?.profile.timezone} userId={me?.profile.userId}>
      <CommandPaletteProvider>
      <div className="flex min-h-dvh flex-col bg-canvas text-text">
        <header data-shell-chrome="" className="sticky top-0 z-20 flex h-[65px] items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <PendingLink href="/app/hoje" aria-label={t("pages.logoLink")} className="inline-flex min-h-11 items-center">
            <Logo size={28} withWordmark />
          </PendingLink>
          <span className="ml-auto flex items-center gap-2">
            <PaletteButton compact />
            <NotificationBell />
            <MobileMenu dueTotal={dueTotal} isAdmin={me?.isAdmin ?? false} />
          </span>
        </header>
        <div className="sticky top-0 z-20 hidden md:block">
          <Navbar account={account} />
        </div>
        <div className="flex flex-1">
          <RailSlot>
            <Rail dueTotal={dueTotal} calendarSoon={upcoming} isAdmin={me?.isAdmin ?? false /* F19 FR-11, D-471: cosmetic; /v1/admin/* re-checks */} />
          </RailSlot>
          <main className="min-w-0 flex-1 p-4 md:p-6">
            <MainSlot>{children}</MainSlot>
          </main>
        </div>
      </div>
      <ChallengeTourHost />
      </CommandPaletteProvider>
      </NotificationsProvider>
      </ReferralProvider>
      </EntitlementsProvider>
    </NavPendingProvider>
  );
}
