'use client';

// F17 FR-21: "Propriedades do mapa" — name, matrix items and access after creation, with the same form as "Sobre o mapa".
// Area and items come from the API (`board.matrixItemIds`, D-532); a new area makes the server drop the items of other areas.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Board, MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { AboutMapForm, aboutErrors, aboutPayload, type AboutMap } from '@/features/map/create/about-map-form';
import { useMatrixSuggestions } from '@/features/coverage/matrix-suggestions';

type Props = { board: Pick<Board, 'id' | 'title' | 'area' | 'access' | 'matrixItemIds'>; open: boolean; onOpenChange: (o: boolean) => void };

const post = (path: string, method: 'POST' | 'DELETE', body: object) => api(path, { method, body: JSON.stringify(body) });

export function MapPropertiesDialog({ board, open, onOpenChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const initial: AboutMap = { title: board.title, area: board.area, matrixItemIds: board.matrixItemIds ?? [], access: board.access, password: '' };
  const [value, setValue] = useState(initial);
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const suggestions = useMatrixSuggestions(open ? value.title : '', 300);

  useEffect(() => {
    if (!open) return;
    setValue({ title: board.title, area: board.area, matrixItemIds: board.matrixItemIds ?? [], access: board.access, password: '' });
    setTried(false);
    setFailed(false);
    void Promise.resolve(api<MatrixItem[]>('/v1/matrix/items?area=CM')).then((r) => setItems(r?.ok ? r.data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opened
  }, [open]);

  async function save() {
    const errors = aboutErrors(value);
    if (errors.title || (errors.password && !(board.access === 'password' && value.access === 'password' && !value.password))) return setTried(true);
    setBusy(true);
    setFailed(false);
    const p = aboutPayload(value);
    let before = initial.matrixItemIds;
    const patch = { ...(p.title !== board.title ? { title: p.title } : {}), ...(p.area !== board.area ? { area: p.area } : {}) };
    if (Object.keys(patch).length) {
      // Sequential: the PATCH reply says which items survived the area change, so the link diff below starts from it.
      const r = await api<Board>(`/v1/boards/${board.id}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => null);
      if (!r?.ok) {
        setBusy(false);
        return setFailed(true);
      }
      before = r.data.matrixItemIds ?? [];
    }
    const calls: Promise<{ ok: boolean }>[] = [];
    for (const id of p.matrixItemIds.filter((i) => !before.includes(i))) calls.push(post('/v1/matrix/links', 'POST', { boardId: board.id, matrixItemId: id }));
    for (const id of before.filter((i) => !p.matrixItemIds.includes(i))) calls.push(post('/v1/matrix/links', 'DELETE', { boardId: board.id, matrixItemId: id }));
    if (p.access !== board.access || p.password) {
      calls.push(api(`/v1/boards/${board.id}/share`, { method: 'PUT', body: JSON.stringify({ access: p.access, ...(p.password ? { password: p.password } : {}) }) }));
    }
    const results = await Promise.all(calls.map((c) => c.catch(() => ({ ok: false }))));
    setBusy(false);
    if (p.access !== board.access && results.every((r) => r.ok)) track('board_access_changed', { from: board.access, to: p.access, source: 'properties' });
    if (results.some((r) => !r.ok)) return setFailed(true);
    toast({ title: t('mapProps.saved') });
    router.refresh();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('mapProps.title')} description={t('mapProps.desc')} closeLabel={t('common.close')} size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-5"
      >
        <AboutMapForm value={value} onChange={setValue} items={items} suggestions={suggestions} showErrors={tried} passwordOptional={board.access === 'password'} />
        {value.area !== board.area ? <p role="status" className="m-0 text-sm font-semibold">{t('mapProps.areaWarning')}</p> : null}
        {failed ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('mapProps.error')}</p> : null}
        <Button type="submit" loading={busy} loadingLabel={t('common.loading')}>{t('mapProps.save')}</Button>
      </form>
    </Dialog>
  );
}
