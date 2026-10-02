'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { Button } from './button';
import { Icon } from './icons';
import { focusRing } from './button';

/**
 * Dropzone: área de envio do Novo mapa. Sem `file`: caixa tracejada (2 px --primary, raio 26, fundo tint) com ícone, `title`, `description` e o botão `buttonLabel`;
 * aceita arrastar e soltar. `onFiles(files)` dispara por arrastar ou por escolher; `accept` (ex.: ".pdf"). Texto todo por props.
 * Com `file` ({ name, meta }): vira a linha do arquivo escolhido (borda 1,5 px --primary, raio 22) com o botão `replaceLabel` ("Trocar"), que chama `onReplace`.
 */
export type DropzoneProps = {
  title: string;
  description: string;
  buttonLabel: string;
  accept?: string;
  onFiles: (files: FileList) => void;
  file?: { name: string; meta: string } | null;
  replaceLabel?: string;
  onReplace?: () => void;
};

export function Dropzone({ title, description, buttonLabel, accept, onFiles, file, replaceLabel, onReplace }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const labelId = useId();
  if (file) {
    return (
      <div className="flex items-center gap-3.5 rounded-[22px] border-[1.5px] border-primary bg-surface px-5 py-[18px]">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-primary-tint text-primary-deep"><Icon name="file" /></span>
        <span className="flex grow flex-col leading-[1.35]">
          <span className="font-bold">{file.name}</span>
          <span className="text-[13px] text-muted">{file.meta}</span>
        </span>
        {replaceLabel ? (
          <button type="button" onClick={onReplace} className={`h-10 rounded-[12px] border border-border-strong bg-surface px-3.5 text-[13px] font-bold ${focusRing}`}>
            {replaceLabel}
          </button>
        ) : null}
      </div>
    );
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      data-over={over || undefined}
      className="flex flex-col items-center gap-3 rounded-list border-2 border-dashed border-primary bg-primary-tint px-6 py-10 text-center data-[over=true]:bg-border"
    >
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[18px] bg-surface text-primary-deep"><Icon name="upload" size={26} /></span>
      <span id={labelId} className="font-display text-xl font-bold">{title}</span>
      <span className="text-muted">{description}</span>
      <input ref={input} type="file" accept={accept} aria-labelledby={labelId} hidden onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); }} />
      <Button onClick={() => input.current?.click()}>{buttonLabel}</Button>
    </div>
  );
}
