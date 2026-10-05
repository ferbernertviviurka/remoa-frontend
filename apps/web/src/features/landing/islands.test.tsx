import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { island } from './islands';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { document.body.innerHTML = ''; });

describe('island (D-535)', () => {
  it('keeps the server DOM through hydration and only renders the component after its chunk loads', async () => {
    let release!: () => void;
    const loaded = new Promise<void>((r) => { release = r; });
    const Island = island<{ label: string }>(() => loaded.then(() => ({ label }: { label: string }) => <p>client {label}</p>));
    const root = document.createElement('div');
    root.innerHTML = '<div class="contents" data-island="pending"><section id="x"><p>server html</p></section></div>';
    document.body.append(root);

    await act(async () => { hydrateRoot(root, <Island label="a" />); });
    expect(root.textContent).toBe('server html');

    await act(async () => { release(); await new Promise((r) => setTimeout(r, 120)); }); // load event + idle (setTimeout in jsdom)
    expect(root.textContent).toBe('client a');
  });
});
