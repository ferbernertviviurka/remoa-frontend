/** D-1840: the API takes at most 500 items per call (one audit row each). Calls run one after another; keys[b] is that batch's
 * idempotencyKey, kept across retries so a resend after a lost response replays instead of writing twice. Resume with from = batches done. */
export const BATCH_SIZE = 500;
export const batchCount = (n: number) => Math.ceil(n / BATCH_SIZE);
export async function runBatches<I, R>(items: I[], keys: string[], from: number, call: (chunk: I[], key: string) => Promise<{ results: R[] }>, onBatch: (done: number, results: R[]) => void) {
  for (let b = from; b < batchCount(items.length); b++) {
    keys[b] ??= crypto.randomUUID();
    const r = await call(items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE), keys[b]!);
    onBatch(b + 1, r.results);
  }
}
