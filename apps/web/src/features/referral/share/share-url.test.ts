import { describe, expect, it } from 'vitest';
import { shareUrl, withLink } from './share-url';

const link = 'https://remoa.app/i/4K2F9QXM';
const subject = 'Convite para o Remoa';

describe('shareUrl', () => {
  it('WhatsApp: wa.me com a mensagem codificada', () => {
    const u = new URL(shareUrl('whatsapp', { message: `Oi & tchau ${link}`, link, subject }));
    expect(u.origin + u.pathname).toBe('https://wa.me/');
    expect(u.searchParams.get('text')).toBe(`Oi & tchau ${link}`);
  });
  it('Telegram: link em url= e fora do texto', () => {
    const u = new URL(shareUrl('telegram', { message: `Veja ${link}`, link, subject }));
    expect(u.host).toBe('t.me');
    expect(u.searchParams.get('url')).toBe(link);
    expect(u.searchParams.get('text')).toBe('Veja');
  });
  it('e-mail: mailto com assunto e corpo', () => {
    const u = shareUrl('email', { message: `Veja ${link}`, link, subject });
    expect(u.startsWith('mailto:?subject=Convite%20para%20o%20Remoa&body=')).toBe(true);
    expect(decodeURIComponent(u.split('body=')[1]!)).toBe(`Veja ${link}`);
  });
  it('acrescenta o link quando a mensagem o perdeu', () => {
    expect(withLink('Oi ', link)).toBe(`Oi ${link}`);
    expect(new URL(shareUrl('whatsapp', { message: 'Oi', link, subject })).searchParams.get('text')).toBe(`Oi ${link}`);
  });
});
