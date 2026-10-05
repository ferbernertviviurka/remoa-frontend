import type { APIRequestContext } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** G14 D-579: a board challenge needs 10 challengeable cards. Adds `n` Q&A cards far right of the fixture (x ≥ 1400). */
export async function padForChallenge(request: APIRequestContext, headers: Record<string, string>, boardId: string, n: number) {
  const ops = Array.from({ length: n }, (_, i) => ({
    op: 'createCard', opId: crypto.randomUUID(), boardId,
    card: { id: crypto.randomUUID(), type: 'concept', title: `Extra ${i + 1}`, position: { x: 1400 + (i % 2) * 300, y: 120 + Math.floor(i / 2) * 160 } },
  }));
  const r = await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } });
  if (!r.ok()) throw new Error(`padForChallenge: ${r.status()}`);
}
