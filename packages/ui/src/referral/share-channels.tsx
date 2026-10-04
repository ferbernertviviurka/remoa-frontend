import { Icon, type IconName } from '../icons';
import { focusRing } from '../button-styles';

export type ShareChannel = 'whatsapp' | 'telegram' | 'email' | 'more';
const icon: Record<ShareChannel, IconName> = { whatsapp: 'chat', telegram: 'send', email: 'mail', more: 'share' };

export interface ShareChannelsProps {
  /** Rótulo do grupo ("Compartilhar") */
  'aria-label': string;
  /** Canais exibidos, na ordem, com o texto de cada botão */
  channels: ReadonlyArray<{ id: ShareChannel; label: string }>;
  /** Só avisa qual canal foi escolhido; abrir `wa.me`, `t.me`, `mailto:` ou a Web Share API é do app */
  onShare: (channel: ShareChannel) => void;
}

/** ShareChannels (F18 FR-6): grade de 4 botões (WhatsApp, Telegram, e-mail, Mais opções). Só apresentação + callback. */
export function ShareChannels({ channels, onShare, ...rest }: ShareChannelsProps) {
  return (
    <div role="group" aria-label={rest['aria-label']} className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
      {channels.map((c) => (
        <button key={c.id} type="button" onClick={() => onShare(c.id)} className={['lift flex h-[54px] items-center justify-center gap-2.5 rounded-[16px] border-[1.5px] border-border-strong bg-surface text-[15px] font-bold text-ink', focusRing].join(' ')}>
          <Icon name={icon[c.id]} size={20} />
          {c.label}
        </button>
      ))}
    </div>
  );
}
