export type ShareTarget = 'whatsapp' | 'telegram' | 'email';

/** FR-5: o link volta ao fim da mensagem se o usuário o apagou. */
export const withLink = (message: string, link: string) => (message.includes(link) ? message : `${message.trimEnd()} ${link}`.trim());

/** FR-6: URL de cada canal. A mensagem já vai com o link (`withLink`); no Telegram o link vai à parte (`url=`) e sai do texto. */
export function shareUrl(target: ShareTarget, { message, link, subject }: { message: string; link: string; subject: string }): string {
  const text = withLink(message, link);
  if (target === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (target === 'telegram') return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text.split(link).join('').trim())}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
