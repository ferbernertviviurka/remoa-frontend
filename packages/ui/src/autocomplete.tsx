'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { focusRing } from './button-styles';
import { Icon } from './icons';

export interface AutocompleteOption {
  value: string;
  label: string;
  /** Linha secundária, ex.: "Cidade · UF" */
  hint?: string;
  /** Termos extras buscáveis (sigla, apelidos); não são exibidos */
  keywords?: ReadonlyArray<string>;
}

export interface AutocompleteValue {
  /** null = texto livre (não está na lista) */
  value: string | null;
  label: string;
}

export interface AutocompleteProps {
  label: string;
  options: ReadonlyArray<AutocompleteOption>;
  value: AutocompleteValue | null;
  onValueChange: (next: AutocompleteValue | null) => void;
  placeholder?: string;
  /** Mostra a opção final de texto livre */
  allowCustom?: boolean;
  /** Texto da opção de texto livre; recebe o que foi digitado */
  customLabel?: (text: string) => string;
  emptyLabel?: string;
  /** Aviso quando há mais resultados que o limite; recebe o limite */
  moreLabel?: (shown: number) => string;
  /** aria-label do botão de limpar */
  clearAriaLabel?: string;
  invalid?: boolean;
  /** Mensagem de erro (implica invalid) */
  error?: string;
  disabled?: boolean;
  /** Máximo de resultados renderizados (padrão 50) */
  limit?: number;
}

/** Normaliza (NFD, sem acento, minúsculas) mantendo o índice de cada char original. */
function fold(s: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  [...s].forEach((ch, i) => {
    const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const c of n) {
      text += c;
      map.push(i);
    }
  });
  return { text, map };
}

const norm = (s: string) => fold(s).text;

function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = norm(query.trim());
  if (!q) return text;
  const chars = [...text];
  const { text: f, map } = fold(text);
  const at = f.indexOf(q);
  if (at < 0) return text;
  const from = map[at]!;
  const to = map[at + q.length - 1]! + 1;
  return (
    <>
      {chars.slice(0, from).join('')}
      <mark className="rounded-[3px] bg-primary-tint px-0.5 font-bold text-primary-deep">{chars.slice(from, to).join('')}</mark>
      {chars.slice(to).join('')}
    </>
  );
}

/**
 * Seleção única com busca (sem acento) e texto livre opcional. ARIA 1.2 combobox + listbox.
 * Sem prop className (D-024). Texto e aria-labels por prop (D-028).
 */
export function Autocomplete({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  allowCustom = false,
  customLabel = (t) => `Usar “${t}”`,
  emptyLabel = 'Nenhum resultado',
  moreLabel = (n) => `Mostrando os primeiros ${n}. Refine a busca.`,
  clearAriaLabel = 'Limpar',
  invalid,
  error,
  disabled,
  limit = 50,
}: AutocompleteProps) {
  const uid = useId();
  const listboxId = `${uid}-list`;
  const errorId = `${uid}-err`;
  const [open, setOpen] = useState(false);
  /** null = não está editando: o campo mostra o rótulo do valor atual */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const text = query ?? value?.label ?? '';
  const q = norm((query ?? '').trim());
  const matched = q
    ? options.filter((o) => norm([o.label, o.hint ?? '', ...(o.keywords ?? [])].join(' ')).includes(q))
    : options;
  const shown = matched.slice(0, limit);
  const customText = (query ?? '').trim();
  const showCustom = allowCustom && customText !== '';
  // itens navegáveis: resultados + (opcional) texto livre
  const total = shown.length + (showCustom ? 1 : 0);
  const optId = (i: number) => `${uid}-opt-${i}`;

  useEffect(() => setActive(-1), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function choose(i: number) {
    if (i < shown.length) {
      const o = shown[i]!;
      onValueChange({ value: o.value, label: o.label });
    } else if (showCustom) {
      onValueChange({ value: null, label: customText });
    }
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => (total ? (i + 1) % total : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => (total ? (i <= 0 ? total - 1 : i - 1) : -1));
        break;
      case 'Home':
        if (total) { e.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (total) { e.preventDefault(); setActive(total - 1); }
        break;
      case 'Enter':
        e.preventDefault();
        if (active >= 0) choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  }

  const hasError = invalid || Boolean(error);
  const border = hasError
    ? 'border-review'
    : open
      ? 'border-primary'
      : 'border-border-strong hover:border-primary';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${uid}-input`} className="font-bold text-ink">{label}</label>
      <Popover.Root open={open && !disabled} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <Popover.Anchor asChild>
          <div className={`flex min-h-[52px] items-center gap-1 rounded-field border-[1.5px] bg-surface pl-4 pr-1 transition-[border-color] duration-150 ${border} ${disabled ? 'opacity-60' : ''}`}>
            <input
              ref={inputRef}
              id={`${uid}-input`}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={disabled}
              placeholder={placeholder}
              value={text}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className={`min-h-11 min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted ${focusRing}`}
            />
            {text !== '' && !disabled && (
              <button
                type="button"
                aria-label={clearAriaLabel}
                onClick={() => {
                  onValueChange(null);
                  setQuery(null);
                  inputRef.current?.focus();
                }}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink ${focusRing}`}
              >
                <Icon name="close" size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (e.target === inputRef.current) e.preventDefault();
              else close();
            }}
            aria-label={label}
            sideOffset={6}
            align="start"
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-map border border-border bg-surface p-1 shadow-lift"
          >
            <div
              id={listboxId}
              ref={listRef}
              role="listbox"
              aria-label={label}
              className="max-h-[280px] overflow-y-auto"
              // mantém o foco no input ao clicar
              onMouseDown={(e) => e.preventDefault()}
            >
              {shown.map((o, i) => (
                <div
                  key={o.value}
                  id={optId(i)}
                  role="option"
                  aria-selected={value?.value === o.value}
                  data-active={active === i || undefined}
                  onClick={() => choose(i)}
                  className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-[10px] px-3 py-2 text-sm ${active === i ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-canvas'}`}
                >
                  <span className="font-semibold"><Highlight text={o.label} query={query ?? ''} /></span>
                  {o.hint && <span className="text-xs text-muted"><Highlight text={o.hint} query={query ?? ''} /></span>}
                </div>
              ))}
              {matched.length > shown.length && (
                <div role="status" className="px-3 py-2 text-xs font-semibold text-muted">{moreLabel(shown.length)}</div>
              )}
              {shown.length === 0 && !showCustom && (
                <div role="status" className="px-3 py-4 text-center text-sm text-muted">{emptyLabel}</div>
              )}
              {showCustom && (
                <div
                  id={optId(shown.length)}
                  role="option"
                  aria-selected={value?.value === null && value.label === customText}
                  data-active={active === shown.length || undefined}
                  onClick={() => choose(shown.length)}
                  className={`flex min-h-11 cursor-pointer items-center rounded-[10px] px-3 py-2 text-sm font-semibold ${active === shown.length ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-canvas'}`}
                >
                  {customLabel(customText)}
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-review-text">{error}</p>
      )}
    </div>
  );
}
