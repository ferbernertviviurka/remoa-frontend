import type { Result } from '@remoa/contracts';
import { readErrorBody } from './error-body';

type StreamEvent = { feedback?: unknown; result?: unknown; error?: unknown };

/** Reads an SSE body of `{ feedback }`, then `{ result }` or `{ error }`. */
export async function readResultStream<T>(stream: ReadableStream<Uint8Array>, onFeedback?: (chunk: string) => void): Promise<Result<T>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let result: Result<T> | null = null;
  const take = (block: string) => {
    const line = block.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return;
    let event: StreamEvent;
    try {
      event = JSON.parse(line.slice(6)) as StreamEvent;
    } catch {
      return;
    }
    if (typeof event.feedback === 'string') onFeedback?.(event.feedback);
    if ('result' in event) result = { ok: true, data: event.result as T };
    const error = event.error ? readErrorBody({ error: event.error }) : null;
    if (error) result = { ok: false, error };
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) take(part);
  }
  if (buf.trim()) take(buf);
  return result ?? { ok: false, error: { code: 'internal', message: 'network' } };
}
