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
});
