import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EmailsPreview } from './preview';

const mail = { subject: 'Confirme seu e-mail', preheader: 'Falta um passo', html: '<p>oi</p>', text: 'oi em texto', class: 'transactional', bytes: 2048 };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('EmailsPreview', () => {
  it('lista versões, mostra assunto e alterna para texto simples', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => ({ ok: true, data: url.endsWith('/v1/dev/emails') ? [{ template: 'account-confirm', versions: ['signup', 'email_change'] }] : mail }) })));
    render(<EmailsPreview />);
    expect(await screen.findByText('Confirme seu e-mail')).toBeTruthy();
    expect(screen.getByText('Transacional')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'account-confirm · email_change' })).toBeTruthy();
    expect(screen.getByTitle('Prévia do e-mail').getAttribute('sandbox')).toBe('');
    fireEvent.click(screen.getByRole('radio', { name: 'Texto simples' }));
    expect(screen.getByText('oi em texto')).toBeTruthy();
  });

  it('mostra erro quando a API não responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    render(<EmailsPreview />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Não foi possível/);
  });
});
