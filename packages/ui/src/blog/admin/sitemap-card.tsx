'use client';

import { useId, useState } from 'react';
import { Icon } from '../../icons';
import { focusRing } from '../../button-styles';

/**
 * SitemapCard (F27 FR-3, topo de `/admin/blog`): `title` ("Sitemap: 42 URLs"), `description` ("Atualizado hoje às 03:00 · próxima atualização automática amanhã às 03:00…"),
 * botão `showUrlsLabel`/`hideUrlsLabel` (alterna a tabela `urls`: endereço, tipo e `lastmod`; `aria-expanded`, `pop` 400 ms), link `sitemapHref` ("sitemap.xml", nova aba)
 * e "Atualizar agora" (`onRefresh`; enquanto a promessa não resolve o botão fica desabilitado com `aria-busy`). A ação é registrada na auditoria no servidor (`withAdmin`);
 * este componente só chama `onRefresh`. Todos os textos por props.
 */
export type SitemapUrl = { path: string; type: string; lastmod: string };
export type SitemapCardProps = {
  title: string;
  description: string;
  urls: ReadonlyArray<SitemapUrl>;
  columns: { path: string; type: string; lastmod: string };
  showUrlsLabel: string;
  hideUrlsLabel: string;
  sitemapHref: string;
  sitemapLabel: string;
  refreshLabel: string;
  onRefresh: () => void | Promise<unknown>;
};

const btn = `flex h-11 items-center gap-1.5 rounded-[13px] border-[1.5px] border-border-strong bg-surface px-4 text-sm font-bold text-ink hover:border-primary ${focusRing}`;

export function SitemapCard({ title, description, urls, columns, showUrlsLabel, hideUrlsLabel, sitemapHref, sitemapLabel, refreshLabel, onRefresh }: SitemapCardProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const regionId = useId();
  const refresh = async () => {
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label={title} className="flex flex-col gap-3.5 rounded-list border border-border bg-surface px-6 py-5">
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[15px] bg-primary-tint text-primary-deep"><Icon name="list" size={24} /></span>
        <span className="flex min-w-[240px] grow flex-col leading-[1.35]">
          <span className="text-[17px] font-extrabold">{title}</span>
          <span className="text-[13.5px] text-muted">{description}</span>
        </span>
        <button type="button" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((v) => !v)} className={btn}>{open ? hideUrlsLabel : showUrlsLabel}</button>
        <a href={sitemapHref} target="_blank" rel="noopener" className={`${btn} no-underline`}>
          {sitemapLabel}
          <Icon name="share" size={16} aria-hidden="true" />
        </a>
        <button type="button" onClick={refresh} disabled={busy} aria-busy={busy} className={`flex h-11 items-center gap-2 rounded-[13px] bg-panel-dark px-[18px] text-sm font-bold text-on-dark disabled:opacity-60 ${focusRing}`}>
          <Icon name="clock" size={18} aria-hidden="true" />
          {refreshLabel}
        </button>
      </div>
      {open ? (
        <div id={regionId} className="pop overflow-x-auto border-t border-divider pt-2.5">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs tracking-[0.1em] text-muted uppercase">
                <th scope="col" className="px-1 py-1.5 font-bold">{columns.path}</th>
                <th scope="col" className="w-[140px] px-1 py-1.5 font-bold">{columns.type}</th>
                <th scope="col" className="w-[140px] px-1 py-1.5 font-bold">{columns.lastmod}</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((u) => (
                <tr key={u.path} className="border-t border-divider">
                  <td className="max-w-0 truncate px-1 py-2 font-mono text-[13px]">{u.path}</td>
                  <td className="px-1 py-2 text-muted">{u.type}</td>
                  <td className="px-1 py-2 text-muted">{u.lastmod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
