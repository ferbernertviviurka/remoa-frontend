import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`);
});
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to), notFound: () => { throw new Error('notFound'); } }));

import Page from '@/app/(app)/conta/page';
import SecaoPage from '@/app/(app)/conta/[secao]/page';

const go = (q: object) => Page({ searchParams: Promise.resolve(q) }).catch((e: Error) => e.message);

describe('/conta', () => {
  it('redirects to perfil and keeps the Stripe return flags for plano', async () => {
    expect(await go({})).toBe('redirect:/conta/perfil');
    expect(await go({ checkout: 'ok' })).toBe('redirect:/conta/plano?checkout=ok');
    expect(await go({ portal: 'ok' })).toBe('redirect:/conta/plano?portal=ok');
  });
  it('unknown section is a 404', async () => {
    await expect(SecaoPage({ params: Promise.resolve({ secao: 'nada' }) })).rejects.toThrow('notFound');
  });
});
