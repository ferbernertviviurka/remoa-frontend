import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { RATE_LIMIT_BACKOFF_MS, useAutosave } from './use-autosave';

type V = Record<string, unknown>;
const setup = (send: (p: V) => Promise<{ ok: true } | { ok: false; error: { code: string; message: string } }>, initial: V = { title: 'Primeiro título', slug: 'a' }) =>
  renderHook(({ values }: { values: V }) => useAutosave({ values, initial, send }), { initialProps: { values: initial } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave (D-910)', () => {
  it('waits 5 s without edits and sends only the changed field', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const h = setup(send);
    h.rerender({ values: { title: 'Primeiro títul', slug: 'a' } });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    h.rerender({ values: { title: 'Primeiro título novo', slug: 'a' } }); // typing restarts the 5 s
    await act(() => vi.advanceTimersByTimeAsync(4900));
    expect(send).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ title: 'Primeiro título novo' });
    expect(h.result.current.state).toBe('saved');
  });

  it('sends nothing when nothing changed (also on flush/blur) and skips undefined (invalid) fields', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const h = setup(send);
    await act(async () => { await h.result.current.flush(); });
    h.rerender({ values: { title: undefined, slug: 'a' } });
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps typing made during a slow save and sends it next (no lost edits)', async () => {
    let release!: () => void;
    const send = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { release = () => r({ ok: true }); }))
      .mockResolvedValue({ ok: true });
    const h = setup(send);
    h.rerender({ values: { title: 'Versão 1 do título', slug: 'a' } });
    let first!: Promise<boolean>;
    act(() => { first = h.result.current.flush(); });
    h.rerender({ values: { title: 'Versão 2 do título', slug: 'a' } }); // typed while the PATCH is in flight
    await act(async () => { release(); await first; });
    expect(send).toHaveBeenNthCalledWith(1, { title: 'Versão 1 do título' });
    expect(send).toHaveBeenNthCalledWith(2, { title: 'Versão 2 do título' });
    expect(h.result.current.state).toBe('saved');
  });

  it('on 429 shows the error and retries once after the back-off', async () => {
    const limited = { ok: false as const, error: { code: 'rate_limited', message: 'rate_limited' } };
    const send = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(limited).mockResolvedValue({ ok: true });
    const h = setup(send);
    h.rerender({ values: { title: 'Título alterado aqui', slug: 'a' } });
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(send).toHaveBeenCalledTimes(1);
    expect(h.result.current.state).toBe('error');
    await act(() => vi.advanceTimersByTimeAsync(RATE_LIMIT_BACKOFF_MS));
    expect(send).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(RATE_LIMIT_BACKOFF_MS * 2));
    expect(send).toHaveBeenCalledTimes(2); // only once
    expect(h.result.current.unsaved).toBe(true);
  });
});
