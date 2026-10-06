import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadApkg } from './upload';

vi.mock('@/lib/api', () => ({ api: vi.fn(), apiBase: () => 'http://api.test', sessionToken: async () => 'tok' }));

class FakeXHR {
  static last: FakeXHR | null = null;
  url = '';
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = '';
  upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  open(_m: string, url: string) { this.url = url; FakeXHR.last = this; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  send(body: unknown) { this.body = body; }
}

afterEach(() => vi.unstubAllGlobals());

describe('uploadApkg (D-1443)', () => {
  it('POSTs the file itself to the API with the session token, reports progress and returns the key', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const file = new File(['PK'], 'deck.apkg');
    const pct = vi.fn();
    const p = uploadApkg(file, pct);
    await vi.waitFor(() => expect(FakeXHR.last?.body).toBe(file));
    const x = FakeXHR.last!;
    expect(x.url).toBe('http://api.test/v1/imports/anki/direct');
    expect(x.headers.authorization).toBe('Bearer tok');
    x.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    expect(pct).toHaveBeenCalledWith(50);
    Object.assign(x, { status: 200, responseText: JSON.stringify({ ok: true, data: { key: 'imports/u/k.apkg' } }) });
    x.onload?.();
    expect(await p).toEqual({ ok: true, data: { key: 'imports/u/k.apkg' } });
  });

  it('413 without a JSON body and network errors resolve as failures', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const big = uploadApkg(new File(['x'], 'a.apkg'), () => undefined);
    await vi.waitFor(() => expect(FakeXHR.last?.body).toBeTruthy());
    Object.assign(FakeXHR.last!, { status: 413, responseText: '' });
    FakeXHR.last!.onload?.();
    expect(await big).toMatchObject({ ok: false, error: { code: 'validation' } });
    FakeXHR.last = null;
    const down = uploadApkg(new File(['x'], 'a.apkg'), () => undefined);
    await vi.waitFor(() => expect(FakeXHR.last?.body).toBeTruthy());
    FakeXHR.last!.onerror?.();
    expect(await down).toMatchObject({ ok: false, error: { code: 'internal' } });
  });
});
