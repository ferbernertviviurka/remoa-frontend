import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushOffline, queueOffline, challengeClient } from './client';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }));

const body = { sessionId: 's', itemId: 'i', durationMs: 1, inputKind: 'text', text: 'noradrenalina' };

beforeEach(() => {
  localStorage.clear();
  api.mockReset();
});

describe('offline answers', () => {
  it('keeps a dropped answer and sends it again when the network returns', async () => {
    queueOffline(body);
    api.mockRejectedValueOnce(new Error('offline'));
    const synced = vi.fn();
    await flushOffline(synced);
    expect(synced).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('remoa-offline-answers') ?? '[]')).toHaveLength(1);

    api.mockResolvedValueOnce({ ok: true, data: {} });
    await flushOffline(synced);
    expect(synced).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem('remoa-offline-answers') ?? '[]')).toEqual([]);
  });

  it('drops an answer the server rejects and does not count it as synced', async () => {
    queueOffline(body);
    api.mockResolvedValueOnce({ ok: false, error: { code: 'validation', message: 'expired' } });
    const synced = vi.fn();
    await flushOffline(synced);
    expect(synced).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('remoa-offline-answers') ?? '[]')).toEqual([]);
  });

  it('lets the student rate offline and sends the answer when the network returns', async () => {
    api.mockRejectedValueOnce(new Error('offline'));
    const saved = await challengeClient.answer({ sessionId: 's', itemId: 'i', durationMs: 1, inputKind: 'text', text: 'noradrenalina' });
    expect(saved.ok && saved.data.fallback).toBe('grader_error');
    expect(JSON.parse(localStorage.getItem('remoa-offline-answers') ?? '[]')).toHaveLength(1);
    api.mockResolvedValueOnce({ ok: true, data: {} });
    const synced = vi.fn();
    await flushOffline(synced);
    expect(synced).toHaveBeenCalledOnce();
  });

  it('reopens the loaded queue when start cannot reach the API', async () => {
    const data = { sessionId: '11111111-1111-4111-8111-111111111111', items: [{ id: 'item-1' }] };
    api.mockResolvedValueOnce({ ok: true, data });
    await challengeClient.start({ kind: 'daily' });
    api.mockRejectedValueOnce(new Error('offline'));
    const again = await challengeClient.start({ kind: 'daily' });
    expect(again.ok && again.data).toEqual(data);
    api.mockRejectedValueOnce(new Error('offline'));
    const other = await challengeClient.start({ kind: 'board', boardId: '22222222-2222-4222-8222-222222222222' });
    expect(other.ok).toBe(false);
  });

  it('shows feedback chunks before the answer is stored', async () => {
    api.mockImplementation(async (_path: string, _init: RequestInit, onFeedback?: (chunk: string) => void) => {
      onFeedback?.('Faltou ');
      onFeedback?.('volume.');
      return { ok: true, data: { fallback: null } };
    });
    const chunks: string[] = [];
    const saved = await challengeClient.answer(body, (chunk) => chunks.push(chunk));
    expect(saved.ok).toBe(true);
    expect(chunks.join('')).toBe('Faltou volume.');
    expect(api).toHaveBeenCalledWith('/v1/challenge/answer', expect.objectContaining({ headers: { accept: 'text/event-stream' }, body: JSON.stringify(body) }), expect.any(Function));
  });

  it('keeps the session close until the network accepts it', async () => {
    api.mockRejectedValueOnce(new Error('offline'));
    const closed = await challengeClient.finish({ sessionId: 's' });
    expect(closed.ok).toBe(false);
    expect(JSON.parse(localStorage.getItem('remoa-offline-answers') ?? '[]')).toEqual([{ path: 'finish', body: { sessionId: 's' } }]);
    api.mockResolvedValueOnce({ ok: true, data: {} });
    const synced = vi.fn();
    await flushOffline(synced);
    expect(synced).toHaveBeenCalledOnce();
    expect(api).toHaveBeenLastCalledWith('/v1/challenge/finish', expect.objectContaining({ method: 'POST' }));
  });
});
