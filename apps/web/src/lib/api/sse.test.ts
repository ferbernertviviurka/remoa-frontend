import { describe, expect, it } from 'vitest';
import { readResultStream } from './sse';

function chunks(parts: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(enc.encode(part));
      controller.close();
    },
  });
}

describe('readResultStream', () => {
  it('delivers feedback before the verdict, even when a chunk is split', async () => {
    const raw = 'data: {"feedback":"Faltou "}\n\ndata: {"feedback":"volume."}\n\ndata: {"result":{"verdict":"partial"}}\n\n';
    const seen: string[] = [];
    const result = await readResultStream<{ verdict: string }>(chunks([raw.slice(0, 18), raw.slice(18)]), (piece) => seen.push(piece));
    expect(seen.join('')).toBe('Faltou volume.');
    expect(result.ok && result.data.verdict).toBe('partial');
  });

  it('returns the error event instead of a verdict', async () => {
    const raw = 'data: {"error":{"code":"conflict","message":"grade in progress"}}\n\n';
    const result = await readResultStream(chunks([raw]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatchObject({ code: 'conflict', message: 'grade in progress' });
  });

  it('passes progress events on, in order, before the result', async () => {
    const raw = 'data: {"progress":{"generated":0,"requested":10}}\n\ndata: {"progress":{"generated":5,"requested":10}}\n\ndata: {"result":{"n":10}}\n\n';
    const seen: unknown[] = [];
    const result = await readResultStream<{ n: number }>(chunks([raw.slice(0, 30), raw.slice(30)]), undefined, (p) => seen.push(p));
    expect(seen).toEqual([{ generated: 0, requested: 10 }, { generated: 5, requested: 10 }]);
    expect(result.ok && result.data.n).toBe(10);
  });
});
