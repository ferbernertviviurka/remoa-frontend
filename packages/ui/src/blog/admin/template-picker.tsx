'use client';

import { focusRing } from '../../button-styles';
import type { BlogTemplate } from '../types';

/** Miniatura em esboço de cada template (decorativa, `aria-hidden`): Leitura (coluna única), Guia (índice lateral) e Destaque (capa escura e círculos numerados). */
export function TemplateThumb({ template, height }: { template: BlogTemplate; height: number }) {
  const bar = 'block rounded-[3px] bg-border-strong';
  return (
    <span aria-hidden="true" className="block w-full overflow-hidden rounded-[14px] border border-border bg-surface" style={{ height }}>
      {template === 'leitura' ? (
        <span className="flex flex-col items-center gap-[5px] px-3.5 py-2.5">
          <span className="block h-2 w-3/5 rounded-[3px] bg-unknown-soft" />
          <span className={`${bar} h-1.5 w-[44%]`} />
          <span className="my-[3px] block h-[34px] w-[78%] rounded-[7px] bg-steady-on-dark" />
          <span className={`${bar} h-1.5 w-[52%]`} />
          <span className={`${bar} h-1.5 w-[52%]`} />
          <span className={`${bar} h-1.5 w-[46%]`} />
        </span>
      ) : null}
      {template === 'guia' ? (
        <>
          <span className="flex items-center gap-2.5 bg-primary-tint px-3 py-[9px]">
            <span className="flex flex-1 flex-col gap-[5px]"><span className="block h-2 w-[86%] rounded-[3px] bg-unknown-soft" /><span className={`${bar} h-1.5 w-3/5`} /></span>
            <span className="block h-[34px] w-2/5 rounded-[7px] bg-steady-on-dark" />
          </span>
          <span className="flex gap-2.5 px-3 py-[9px]">
            <span className="flex w-[30%] flex-col gap-1 rounded-md border border-border p-[5px]"><span className={`${bar} h-1.5 w-[90%]`} /><span className={`${bar} h-1.5 w-[70%]`} /><span className={`${bar} h-1.5 w-4/5`} /></span>
            <span className="flex flex-1 flex-col gap-[5px]"><span className={`${bar} h-1.5 w-full`} /><span className={`${bar} h-1.5 w-[92%]`} /><span className={`${bar} h-1.5 w-[96%]`} /><span className={`${bar} h-1.5 w-[70%]`} /></span>
          </span>
        </>
      ) : null}
      {template === 'destaque' ? (
        <>
          <span className="flex flex-col gap-1.5 bg-panel-dark px-3.5 py-3"><span className="block h-[9px] w-[78%] rounded-[3px] bg-on-dark" /><span className="block h-1.5 w-[52%] rounded-[3px] bg-steady-on-dark" /></span>
          <span className="flex flex-col gap-1.5 px-3.5 py-[9px]">
            <span className="flex items-center gap-1.5"><span className="size-3.5 rounded-full bg-primary" /><span className="block h-[7px] w-1/2 rounded-[3px] bg-unknown-soft" /></span>
            <span className={`${bar} h-1.5 w-[92%]`} />
            <span className={`${bar} h-1.5 w-4/5`} />
            <span className="flex items-center gap-1.5"><span className="size-3.5 rounded-full bg-primary" /><span className="block h-[7px] w-[42%] rounded-[3px] bg-unknown-soft" /></span>
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * TemplatePicker (F27 FR-4/7): escolha do template (Leitura, Guia, Destaque) com miniatura e descrição. Usado no modal "Novo post" (`layout="grid"`: 3 colunas,
 * miniatura de 128 px) e no painel Publicação (`layout="list"`: linhas com miniatura de 112 × 84). Grupo de botões `aria-pressed` (mock), borda de 2 px que troca em 200 ms.
 * Controlado: `value` + `onChange`. Textos (`name`, `description`) por props.
 */
export type TemplatePickerProps = {
  label: string;
  value: BlogTemplate;
  onChange: (value: BlogTemplate) => void;
  options: ReadonlyArray<{ value: BlogTemplate; name: string; description: string }>;
  layout?: 'grid' | 'list';
};

export function TemplatePicker({ label, value, onChange, options, layout = 'grid' }: TemplatePickerProps) {
  const grid = layout === 'grid';
  return (
    <div role="group" aria-label={label} className={grid ? 'grid grid-cols-1 gap-3.5 md:grid-cols-3' : 'flex flex-col gap-2.5'}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`box-border flex min-h-11 rounded-[20px] border-2 p-3 text-left text-ink transition-[background-color,border-color] duration-200 ${grid ? 'flex-col gap-2.5' : 'items-center gap-3 rounded-2xl p-2'} ${focusRing} ${on ? 'border-primary bg-primary-tint' : 'border-border bg-surface hover:border-border-strong'}`}
          >
            <span className={grid ? 'block w-full' : 'block w-28 shrink-0'}><TemplateThumb template={o.value} height={grid ? 128 : 84} /></span>
            <span className="flex flex-col leading-[1.3]">
              <span className="font-extrabold">{o.name}</span>
              <span className={`text-muted ${grid ? 'text-[13px]' : 'text-[12.5px]'}`}>{o.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
