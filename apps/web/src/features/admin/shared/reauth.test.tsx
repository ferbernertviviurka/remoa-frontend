import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { errorCode, isReauth, sessionExpired } from './reauth';

const me = vi.fn();
vi.mock('./api', () => ({ requireAdmin: () => me() }));
vi.mock('./admin-nav', () => ({ AdminNav: () => <nav /> }));
vi.mock('./session-expired', () => ({ SessionExpired: () => <p>expirou</p> }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NF'); } }));
const { unwrap } = await import('../list-kit/server');
const { default: AdminLayout } = await import('@/app/admin/layout');

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const mount = async (authenticatedAt: Date) => {
  me.mockResolvedValue({ name: 'A', email: 'a@b.c', openTickets: 0, authenticatedAt });
  render(await AdminLayout({ children: <p>dados</p> }));
};

describe('isReauth', () => {
  it('matches only forbidden + reauth_required', () => {
    expect(isReauth({ code: 'forbidden', message: 'reauth_required' })).toBe(true);
    expect(errorCode({ code: 'forbidden', message: 'reauth_required' })).toBe('reauth_required');
    expect(isReauth({ code: 'reauth_required', message: 'x' })).toBe(false);
    expect(isReauth({ code: 'forbidden', message: 'account_suspended' })).toBe(false);
    expect(errorCode({ code: 'internal', message: 'x' })).toBe('internal');
  });
  it('sessionExpired after 12 h', () => {
    expect(sessionExpired(hoursAgo(13))).toBe(true);
    expect(sessionExpired(hoursAgo(11))).toBe(false);
  });
});

describe('admin layout gate', () => {
  it('expired session shows the expired screen instead of the page', async () => {
    await mount(hoursAgo(48));
    expect(screen.getByText('expirou')).toBeInTheDocument();
    expect(screen.queryByText('dados')).not.toBeInTheDocument();
  });
  it('fresh session renders children', async () => {
    await mount(hoursAgo(1));
    expect(screen.getByText('dados')).toBeInTheDocument();
  });
});

it('list errors reach the views as reauth_required for the real API shape', () => {
  expect(unwrap({ ok: false, error: { code: 'forbidden', message: 'reauth_required' } })).toEqual({ data: null, error: 'reauth_required' });
});
