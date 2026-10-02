import type { ReactNode } from 'react';

/**
 * CanvasPanel: painel flutuante do editor (aside 340 px, raio 26, sombra de flutuante). O chamador posiciona
 * (`absolute right-5 top-5 bottom-5`) ou o coloca em grid; aqui só a casca. `aria-label` obrigatório
 * ("Painel do mapa"). Conteúdo: InspectorTabs + corpo rolável, ou QuestionPanel.
 */
export function CanvasPanel({ 'aria-label': ariaLabel, children }: { 'aria-label': string; children: ReactNode }) {
  return (
    <aside aria-label={ariaLabel} className="box-border flex h-full w-[340px] flex-col overflow-hidden rounded-[26px] border border-border bg-surface text-(--cv-ink) shadow-[0_22px_56px_rgba(36,26,92,.14)]">
      {children}
    </aside>
  );
}
