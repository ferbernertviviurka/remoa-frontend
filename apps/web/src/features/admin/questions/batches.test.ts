import { expect, it } from 'vitest';
import { runBatches } from './batches';

it('D-1840: sends 500 per call in order and resumes the failed batch with the same key', async () => {
  const items = Array.from({ length: 1201 }, (_, i) => i);
  const keys: string[] = [];
  const calls: { size: number; key: string }[] = [];
  let fail = true;
  const call = async (chunk: number[], key: string) => {
    calls.push({ size: chunk.length, key });
    if (calls.length === 2 && fail) { fail = false; throw new Error('network'); }
    return { results: chunk };
  };
  let done = 0, seen = 0;
  const onBatch = (d: number, r: number[]) => { done = d; seen += r.length; };
  await expect(runBatches(items, keys, 0, call, onBatch)).rejects.toThrow('network');
  expect(done).toBe(1);
  await runBatches(items, keys, done, call, onBatch);
  expect(calls.map((c) => c.size)).toEqual([500, 500, 500, 201]);
  expect(calls[2]!.key).toBe(calls[1]!.key); // the retry of batch 2 replays its key
  expect(new Set(calls.map((c) => c.key)).size).toBe(3);
  expect([done, seen]).toEqual([3, 1201]);
});
