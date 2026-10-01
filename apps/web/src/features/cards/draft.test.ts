import { describe, expect, it } from 'vitest';
import { sepseCards } from '@remoa/contracts/mocks';
import { buildSaveInput, previewOf, toDraft, type Draft } from './draft';

const id = '00000000-0000-4000-8000-000000000999';
const asset = '00000000-0000-4000-8000-000000000777';
const fresh = (type: Draft['type']) => toDraft({ id, type, title: 'Novo', front: null, back: null, source: null, payload: {} });

describe('toDraft', () => {
  it('treats an empty payload (card born from a map op) as a new card', () => {
    const flow = fresh('flow');
    expect(flow.type === 'flow' && flow.steps).toHaveLength(2);
    const c = fresh('case');
    expect(c.type === 'case' && Object.values(c.stages)).toEqual(['', '', '', '']);
    const img = fresh('image');
    expect(img.type === 'image' && [img.assetId, img.masks]).toEqual([null, []]);
  });

  it('reads stored payloads', () => {
    const flow = toDraft(sepseCards[3]!);
    expect(flow.type === 'flow' && flow.steps.map((s) => s.id)).toEqual(['step-1', 'step-2', 'step-3', 'step-4', 'step-5']);
    const c = toDraft(sepseCards[5]!);
    expect(c.type === 'case' && c.stages.diagnosis).toBe('Sepse de foco urinário.');
  });
});

describe('buildSaveInput', () => {
  it('concept: trims, empty texts become null', () => {
    const r = buildSaveInput({ ...fresh('concept'), title: ' Sepse ', back: '**Disfunção**', source: '  ' });
    expect(r).toEqual({ ok: true, data: { type: 'concept', title: 'Sepse', front: null, back: '**Disfunção**', source: null, payload: {} } });
  });

  it('rejects an empty title', () => {
    expect(buildSaveInput({ ...fresh('concept'), title: '  ' })).toEqual({ ok: false, errors: ['Dê um título ao card.'] });
  });

  it('flow: needs text in every step and keeps notes only when filled', () => {
    const d = fresh('flow');
    if (d.type !== 'flow') throw new Error();
    expect(buildSaveInput(d)).toEqual({ ok: false, errors: ['Preencha o texto de todos os passos.'] });
    const ok = buildSaveInput({ ...d, steps: [{ ...d.steps[0]!, text: 'a', note: ' ' }, { ...d.steps[1]!, text: 'b', note: 'n' }] });
    expect(ok.ok && ok.data.payload).toEqual({ steps: [{ id: d.steps[0]!.id, text: 'a' }, { id: d.steps[1]!.id, text: 'b', note: 'n' }] });
    expect(ok.ok && previewOf(ok.data)).toEqual({ steps: 2 });
    expect(buildSaveInput({ ...d, steps: [{ ...d.steps[0]!, text: 'a' }] })).toEqual({ ok: false, errors: ['Um fluxograma tem de 2 a 12 passos.'] });
  });

  it('case: omits empty stages, keeps order, needs at least one', () => {
    const d = fresh('case');
    if (d.type !== 'case') throw new Error();
    expect(buildSaveInput(d)).toEqual({ ok: false, errors: ['Preencha pelo menos uma etapa do caso.'] });
    const ok = buildSaveInput({ ...d, stages: { ...d.stages, management: 'Pacote', presentation: 'Febre' } });
    expect(ok.ok && ok.data.payload).toEqual({ caseSteps: [{ stage: 'presentation', text: 'Febre' }, { stage: 'management', text: 'Pacote' }] });
    expect(ok.ok && previewOf(ok.data)).toEqual({ stages: ['presentation', 'management'] });
  });

  it('image: needs an asset and labelled masks', () => {
    const d = fresh('image');
    if (d.type !== 'image') throw new Error();
    expect(buildSaveInput(d)).toEqual({ ok: false, errors: ['Envie uma imagem antes de salvar.'] });
    const polygon = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const mask = { id: crypto.randomUUID(), polygon, label: ' ' };
    expect(buildSaveInput({ ...d, assetId: asset, masks: [mask] })).toEqual({ ok: false, errors: ['Toda máscara precisa de um rótulo.'] });
    const ok = buildSaveInput({ ...d, assetId: asset, masks: [{ ...mask, label: 'Aorta' }] });
    expect(ok.ok && previewOf(ok.data)).toEqual({ masks: 1, assetId: asset });
    expect(ok.ok && previewOf({ ...ok.data, type: 'concept', payload: {} })).toBeUndefined();
  });

  it('too long text gets a generic message', () => {
    expect(buildSaveInput({ ...fresh('concept'), title: 'x', source: 'y'.repeat(1001) })).toEqual({ ok: false, errors: ['Algum campo passou do tamanho máximo.'] });
  });
});
