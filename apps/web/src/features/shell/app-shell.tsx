import type { ReactNode } from "react";
import type { AccountSnapshot, BoardSummary, Entitlements } from "@remoa/contracts";
import { serverApi } from "@/lib/api/server";
import { BottomNav } from "./bottom-nav";
import { EntitlementsProvider } from "./entitlements";
import { Navbar, RailSlot } from "./navbar";
import { MainSlot, NavPendingProvider } from "./nav-pending";
import { Rail } from "./rail";

export async function AppShell({ children }: { children: ReactNode }) {
  // A failing API must never break the shell: no badge instead.
  // ponytail: /me is the full account snapshot; a slim "rail identity" endpoint if it shows in the shell's latency.
  const [boards, me, entitlements] = await Promise.all([
    serverApi<BoardSummary[]>("/v1/boards")
      .then((r) => (r.ok ? r.data : []))
      .catch(() => []),
    serverApi<AccountSnapshot>("/v1/account/me")
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null),
    serverApi<Entitlements>("/v1/billing/entitlements")
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null),
  ]);
  const account = me && { name: me.profile.name, email: me.email, color: me.profile.avatarColor, src: me.avatarUrls?.small };
  const dueTotal = boards.reduce((a, b) => a + b.dueCount, 0);
  return (
    <NavPendingProvider>
      <EntitlementsProvider initial={entitlements}>
      <div className="flex min-h-dvh flex-col bg-canvas text-text">
        <div className="sticky top-0 z-20 hidden md:block">
          <Navbar account={account} />
        </div>
        <div className="flex flex-1">
          <RailSlot>
            <Rail dueTotal={dueTotal} account={account} />
          </RailSlot>
          <main className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
            <MainSlot>{children}</MainSlot>
          </main>
          <BottomNav dueTotal={dueTotal} />
        </div>
      </div>
      </EntitlementsProvider>
    </NavPendingProvider>
  );
}
