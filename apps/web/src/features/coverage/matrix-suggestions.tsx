'use client';

import { useEffect, useState } from 'react';
import type { MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Icon } from '@remoa/ui';
import { api } from '@/lib/api';

/** Up to 3 matrix items similar to `title` (trigram, server side). Fails silent: no suggestions, the user can still pick by hand. */
export function useMatrixSuggestions(title: string, debounceMs = 0): MatrixItem[] {
  const [items, setItems] = useState<MatrixItem[]>([]);
  useEffect(() => {
    const q = title.trim();
    if (!q) return setItems([]);
    let live = true;
    const id = setTimeout(() => {
      api<MatrixItem[]>(`/v1/matrix/suggest?title=${encodeURIComponent(q)}`)
        .then((r) => live && setItems(r.ok && Array.isArray(r.data) ? r.data.slice(0, 3) : []))
        .catch(() => undefined);
    }, debounceMs);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [title, debounceMs]);
  return items;
}

/** F07 in the editor: one click links the map to its best suggestion (≤ 1 click, FRD goal). D-098: was a list in the map panel. */
export function MatrixLinkButton({ title, onPick }: { title: string; onPick: (item: MatrixItem) => void | Promise<void> }) {
  const [item] = useMatrixSuggestions(title);
  if (!item) return null;
  return (
    <Button size="sm" variant="secondary" icon={<Icon name="link" size={18} />} onClick={() => void onPick(item)}>
      {t('editor.suggestLink', { item: item.title })}
    </Button>
  );
}
