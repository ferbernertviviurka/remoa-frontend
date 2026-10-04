import type { ComponentType, ReactNode } from 'react';
import { focusRing } from '../button-styles';
import { Logo } from '../logo';

type LinkLike = ComponentType<{ href: string; 'aria-label'?: string; className?: string; children?: ReactNode }> | 'a';

/**
 * AppNavbar: <header> de 64 px em largura total (fundo --surface, borda inferior, z-20 para o painel do plano ficar sobre o conteúdo).
 * Esquerda: símbolo + wordmark `remoa` (link `home.href`, `home.label` = aria-label, ex.: "Remoa, ir para Hoje"; `home.as` troca por next/link) e `chip` (slot: <PlanPopover trigger={<PlanChip/>}/>).
 * Direita: `actions` (slot, ex.: botão "Fazer upgrade", só no Free).
 */
export type AppNavbarProps = { home: { href: string; label: string; as?: LinkLike }; chip?: ReactNode; actions?: ReactNode };

export function AppNavbar({ home, chip, actions }: AppNavbarProps) {
  const As: LinkLike = home.as ?? 'a';
  return (
    <header className="relative z-20 box-border flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-border bg-surface pl-5 pr-6">
      <div className="flex items-center gap-[18px]">
        <As href={home.href} aria-label={home.label} className={`flex h-11 items-center no-underline ${focusRing}`}>
          <Logo withWordmark size={30} />
        </As>
        {chip}
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
}
