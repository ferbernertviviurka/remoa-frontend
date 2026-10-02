'use client';

import {
  useId,
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { focusRing } from './button';
import { Icon } from './icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  /** When set, the option is grouped under this key */
  group?: string;
}

export interface ComboboxProps {
  /** Visible label above the control */
  label: string;
  /** Placeholder inside the search field */
  placeholder?: string;
  /** All options (flat list; use `group` for grouping) */
  options: ReadonlyArray<ComboboxOption>;
  /** Optional suggestion bucket shown before the main list */
  suggestions?: ReadonlyArray<ComboboxOption>;
  /** Prop label for the suggestions section header */
  suggestionsLabel?: string;
  /** Current selected values */
  value: string[];
  /** Callback when selection changes */
  onValueChange: (next: string[]) => void;
  /** Maximum number of selected items; selection is blocked above this */
  max?: number;
  /** Message announced and shown when max is reached */
  maxMessage?: string;
  /** aria-label for each chip's remove button. Receives the option label: called as removeChipAriaLabel(label) */
  removeChipAriaLabel?: (label: string) => string;
  /** Text shown when no options match the query */
  emptyLabel?: string;
  /** When set, the combobox is inert and shows this message instead of the listbox */
  disabledMessage?: string;
}

// ---------------------------------------------------------------------------
// Accent-agnostic filter (NFD + strip diacritics)
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matches(option: ComboboxOption, query: string): boolean {
  const q = normalise(query);
  return normalise(option.label).includes(q) || normalise(option.description ?? '').includes(q);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Chip({
  label,
  onRemove,
  removeAriaLabel,
  disabled,
}: {
  label: string;
  onRemove: () => void;
  removeAriaLabel: string;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex max-w-[180px] items-center gap-1 rounded-pill bg-primary-tint px-2.5 py-1 text-sm font-semibold text-primary-deep">
      <span className="truncate">{label}</span>
      {!disabled && (
        <button
          type="button"
          aria-label={removeAriaLabel}
          onClick={onRemove}
          className={`-mr-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary hover:text-on-primary ${focusRing}`}
        >
          <Icon name="close" size={12} strokeWidth={2.4} />
        </button>
      )}
    </span>
  );
}

function OptionItem({
  option,
  selected,
  highlighted,
  id,
  onSelect,
}: {
  option: ComboboxOption;
  selected: boolean;
  highlighted: boolean;
  id: string;
  onSelect: () => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      data-highlighted={highlighted || undefined}
      onClick={onSelect}
      className={[
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm outline-none transition-colors duration-100',
        highlighted ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-canvas',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
          selected
            ? 'border-primary bg-primary text-on-primary'
            : 'border-border-strong bg-surface',
        ].join(' ')}
      >
        {selected && <Icon name="check" size={12} strokeWidth={2.4} />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{option.label}</span>
        {option.description && (
          <span className="text-xs text-muted">{option.description}</span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Combobox
// ---------------------------------------------------------------------------

/**
 * Combobox multi com busca, grupos, chips e estado vazio.
 * WAI-ARIA combobox + listbox; Radix Popover para posicionamento.
 * Sem prop className (D-024). Texto e aria-labels por prop (D-028).
 */
export function Combobox({
  label,
  placeholder,
  options,
  suggestions,
  suggestionsLabel,
  value,
  onValueChange,
  max,
  maxMessage,
  removeChipAriaLabel,
  emptyLabel = 'Nenhum resultado',
  disabledMessage,
}: ComboboxProps) {
  const inputId = useId();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDisabled = Boolean(disabledMessage);
  const atMax = max != null && value.length >= max;

  // Build flat options list (suggestions de-duped from main list by value set)
  const suggestionValues = new Set((suggestions ?? []).map((s) => s.value));
  const filtered = options.filter((o) => matches(o, query));
  const filteredSuggestions = (suggestions ?? []).filter((o) => matches(o, query));

  // Build flat display list: [suggestions…, main filtered (excluding suggestion dupes)…]
  const mainFiltered = filtered.filter((o) => !suggestionValues.has(o.value));

  // Group the main list
  type GroupEntry = { type: 'group'; label: string } | { type: 'option'; option: ComboboxOption };
  const entries: GroupEntry[] = [];
  const seenGroups = new Set<string>();
  for (const opt of mainFiltered) {
    const g = opt.group;
    if (g && !seenGroups.has(g)) {
      seenGroups.add(g);
      entries.push({ type: 'group', label: g });
    }
    entries.push({ type: 'option', option: opt });
  }

  // Flat selectable items for keyboard nav
  const flatItems: ComboboxOption[] = [
    ...filteredSuggestions,
    ...mainFiltered,
  ];

  // Deduplicate (same value may appear in both)
  const seen = new Set<string>();
  const flatUnique = flatItems.filter((o) => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });

  const optionId = (v: string) => `${listboxId}-opt-${v}`;

  const toggle = useCallback(
    (opt: ComboboxOption) => {
      if (atMax && !value.includes(opt.value)) return;
      const next = value.includes(opt.value)
        ? value.filter((v) => v !== opt.value)
        : [...value, opt.value];
      onValueChange(next);
    },
    [value, onValueChange, atMax],
  );

  const remove = useCallback(
    (v: string) => onValueChange(value.filter((x) => x !== v)),
    [value, onValueChange],
  );

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, open]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, flatUnique.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatUnique[highlightedIndex]) {
          toggle(flatUnique[highlightedIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        inputRef.current?.focus();
        break;
      case 'Backspace':
        if (query === '' && value.length > 0) {
          e.preventDefault();
          remove(value[value.length - 1]!);
        }
        break;
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-highlighted]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightedIndex]);

  const selectedOptions = value
    .map((v) => options.find((o) => o.value === v) ?? suggestions?.find((o) => o.value === v))
    .filter(Boolean) as ComboboxOption[];

  return (
    <div className="flex flex-col gap-2">
      <label
        id={`${inputId}-label`}
        htmlFor={inputId}
        className="font-bold text-ink"
      >
        {label}
      </label>

      {/* Disabled state */}
      {isDisabled ? (
        <div
          aria-disabled="true"
          className={`flex min-h-[52px] flex-wrap items-center gap-2 rounded-field border-[1.5px] border-border bg-canvas px-4 py-2 text-sm text-muted`}
        >
          {disabledMessage}
        </div>
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Anchor asChild>
            <div
              onClick={() => { inputRef.current?.focus(); setOpen(true); }}
              className={[
                'flex min-h-[52px] flex-wrap items-center gap-2 rounded-field border-[1.5px] bg-surface px-4 py-2 transition-[border-color] duration-150 cursor-text',
                open ? 'border-primary' : 'border-border-strong hover:border-primary',
              ].join(' ')}
            >
              {selectedOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  onRemove={() => remove(opt.value)}
                  removeAriaLabel={removeChipAriaLabel ? removeChipAriaLabel(opt.label) : `Remover ${opt.label}`}
                />
              ))}
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  highlightedIndex >= 0 && flatUnique[highlightedIndex]
                    ? optionId(flatUnique[highlightedIndex].value)
                    : undefined
                }
                aria-labelledby={`${inputId}-label`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!open) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setOpen(true)}
                placeholder={value.length === 0 ? placeholder : undefined}
                className={`min-w-[120px] flex-1 bg-transparent text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted outline-none ${focusRing}`}
              />
            </div>
          </Popover.Anchor>

          <Popover.Portal>
            <Popover.Content
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={() => setOpen(false)}
              sideOffset={6}
              align="start"
              aria-label={label}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-map border border-border bg-surface p-1 shadow-lift"
            >
              <div>
                <div
                  id={listboxId}
                  ref={listRef}
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label={label}
                  className="max-h-[280px] overflow-y-auto"
                >
                  {/* Max reached message */}
                  {atMax && maxMessage && (
                    <div role="status" className="px-3 py-2 text-xs font-semibold text-muted">
                      {maxMessage}
                    </div>
                  )}

                  {/* Suggestions section */}
                  {filteredSuggestions.length > 0 && suggestionsLabel && (
                    <>
                      <div
                        aria-hidden="true"
                        className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted"
                      >
                        {suggestionsLabel}
                      </div>
                      {filteredSuggestions.map((opt, idx) => (
                        <OptionItem
                          key={opt.value}
                          option={opt}
                          selected={value.includes(opt.value)}
                          highlighted={highlightedIndex === idx}
                          id={optionId(opt.value)}
                          onSelect={() => toggle(opt)}
                        />
                      ))}
                      {mainFiltered.length > 0 && (
                        <div aria-hidden="true" className="my-1 border-t border-border" />
                      )}
                    </>
                  )}

                  {/* Main grouped list */}
                  {entries.map((entry) => {
                    if (entry.type === 'group') {
                      return (
                        <div
                          key={`g-${entry.label}`}
                          aria-hidden="true"
                          className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted"
                        >
                          {entry.label}
                        </div>
                      );
                    }
                    const opt = entry.option;
                    const flatIdx = filteredSuggestions.length + mainFiltered.indexOf(opt);
                    return (
                      <OptionItem
                        key={opt.value}
                        option={opt}
                        selected={value.includes(opt.value)}
                        highlighted={highlightedIndex === flatIdx}
                        id={optionId(opt.value)}
                        onSelect={() => toggle(opt)}
                      />
                    );
                  })}

                  {/* Empty state */}
                  {flatUnique.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted">{emptyLabel}</div>
                  )}
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
