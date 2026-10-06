'use client';

import type { ApkgSummary, FieldMapping } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Card, Checkbox, Select, Tag } from '@remoa/ui';
import { applyMapping } from './plan';
import type { Plan } from './use-anki-import';

const t = withStrings({ import: more.import });
type StringKey = Parameters<typeof t>[0];

const DERIVE = '__derive';
const NONE = '__none';
type Kind = ApkgSummary['noteTypes'][number]['kind'];

type Props = { summary: ApkgSummary; plan: Plan; onChange: (plan: Plan) => void };

/** F06 FR-3 inside F17 "Ajustar importação" (FR-9): decks → colunas, note types → card type + fields, 5-row sample that follows the field selects. */
export function AnkiPreview({ summary, plan, onChange }: Props) {
  // Toggling a deck toggles its sub decks too: the server imports the whole subtree of every selected deck.
  const toggleDeck = (id: string, on: boolean) => {
    const name = summary.decks.find((d) => d.id === id)?.name ?? '';
    const tree = summary.decks.filter((d) => d.id === id || d.name.startsWith(`${name}::`)).map((d) => d.id);
    onChange({ ...plan, deckIds: on ? [...new Set([...plan.deckIds, ...tree])] : plan.deckIds.filter((d) => !tree.includes(d)) });
  };
  const setMapping = (m: FieldMapping) => onChange({ ...plan, mappings: plan.mappings.map((x) => (x.noteTypeId === m.noteTypeId ? m : x)) });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="import-decks">
        <h2 id="import-decks" className="font-display text-lg font-bold">{t('import.decks.title')}</h2>
        <Card>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {summary.decks.map((d) => {
              const parts = d.name.split('::');
              const depth = parts.length - 1;
              const short = parts[depth] ?? d.name;
              return (
                <li key={d.id} style={{ paddingLeft: depth * 20 }} className="flex flex-wrap items-center justify-between gap-2">
                  <Checkbox label={`${short} (${d.noteCount})`} checked={plan.deckIds.includes(d.id)} onCheckedChange={(v) => toggleDeck(d.id, v === true)} />
                  <span className="text-xs text-muted">{depth === 0 ? t('import.decks.root') : t('import.decks.sub')}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        {plan.deckIds.length === 0 ? <p role="alert" className="text-sm font-semibold text-review">{t('import.noDeck')}</p> : null}
        <p className="text-sm text-muted">{t('import.rules')}</p>
        <p className="text-sm text-muted">{t('import.serverCounts')}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="import-nt">
        <h2 id="import-nt" className="font-display text-lg font-bold">{t('import.noteTypes.title')}</h2>
        {summary.noteTypes.map((nt) => {
          const m = plan.mappings.find((x) => x.noteTypeId === nt.id);
          if (!m) return null;
          const fields = nt.fields.map((f) => ({ value: f, label: f }));
          return (
            <Card key={nt.id}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold">{nt.name}</h3>
                  <Tag tone="unknown">{t(`import.kind.${nt.kind}` as StringKey)}</Tag>
                  <span className="text-xs text-muted">{t('import.noteTypes.count', { n: nt.noteCount })}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label={`${t('import.field.cardType')} (${nt.name})`}
                    value={m.cardType}
                    onValueChange={(v) => setMapping({ ...m, cardType: v as FieldMapping['cardType'] })}
                    options={(['concept', 'image'] as const).map((c) => ({ value: c, label: t(`import.cardType.${c}` as StringKey) }))}
                  />
                  <Select
                    label={`${t('import.field.title')} (${nt.name})`}
                    value={m.title ?? DERIVE}
                    onValueChange={(v) => setMapping({ ...m, title: v === DERIVE ? null : v })}
                    options={[{ value: DERIVE, label: t('import.field.deriveTitle') }, ...fields]}
                  />
                  <Select label={`${t('import.field.front')} (${nt.name})`} value={m.front} onValueChange={(v) => setMapping({ ...m, front: v })} options={fields} />
                  <Select
                    label={`${t('import.field.back')} (${nt.name})`}
                    value={m.back ?? NONE}
                    onValueChange={(v) => setMapping({ ...m, back: v === NONE ? null : v })}
                    options={[{ value: NONE, label: t('import.field.none') }, ...fields]}
                  />
                </div>
                <SampleTable name={nt.name} kind={nt.kind} samples={nt.samples} mapping={m} />
              </div>
            </Card>
          );
        })}
      </section>

    </div>
  );
}

function SampleTable({ name, kind, samples, mapping }: { name: string; kind: Kind; samples: Record<string, string>[]; mapping: FieldMapping }) {
  const cell = (s: string) => s || t('import.sample.empty');
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{t('import.sample.title', { name })}</caption>
        <thead>
          <tr className="border-b border-divider text-xs text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">{t('import.sample.colTitle')}</th>
            <th scope="col" className="py-2 pr-3 font-semibold">{t('import.sample.colFront')}</th>
            <th scope="col" className="py-2 font-semibold">{t('import.sample.colBack')}</th>
          </tr>
        </thead>
        <tbody>
          {samples.slice(0, 5).map((s, i) => {
            const p = applyMapping(s, mapping, kind);
            return (
              <tr key={i} className="border-b border-divider align-top last:border-0">
                <td className="py-2 pr-3 font-semibold">{cell(p.title)}</td>
                <td className="py-2 pr-3">{cell(p.front)}</td>
                <td className="py-2">{cell(p.back)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
