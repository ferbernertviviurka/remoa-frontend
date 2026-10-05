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

describe('F23 FR-14: title of at least 2 characters', () => {
  it('rejects 1 character, accepts 2', () => {
    expect(buildSaveInput({ ...fresh('concept'), title: ' A ' }).ok).toBe(false);
    expect(buildSaveInput({ ...fresh('concept'), title: 'AB' }).ok).toBe(true);
  });
});

describe('G06: Conteúdo and images everywhere', () => {
  it('note: title, text and image only; never a back or a rubric payload', () => {
    const d = fresh('note');
    expect(d.type).toBe('note');
    const r = buildSaveInput({ ...d, title: 'Fisiopatologia', front: 'Texto **livre**', back: 'ignorado', frontAssetId: asset, backAssetId: asset });
    expect(r).toEqual({ ok: true, data: { type: 'note', title: 'Fisiopatologia', shape: 'rect', front: 'Texto **livre**', frontAssetId: asset, backAssetId: null, back: null, source: null, payload: {} } });
    expect(r.ok && previewOf(r.data)).toBeUndefined();
  });

  it('answer image (concept/flow/case), step and stage images round-trip; an image on an empty stage goes with it', () => {
    const c = buildSaveInput({ ...fresh('concept'), backAssetId: asset });
    expect(c.ok && c.data.backAssetId).toBe(asset);
    const f = toDraft({ id, type: 'flow', title: 'Fl', front: null, back: null, source: null, backAssetId: asset, payload: { steps: [{ id: 'a', text: 'um', assetId: asset }, { id: 'b', text: 'dois' }] } });
    expect(f.backAssetId).toBe(asset);
    const fb = buildSaveInput(f);
    expect(fb.ok && fb.data.type === 'flow' && fb.data.payload.steps).toEqual([{ id: 'a', text: 'um', assetId: asset }, { id: 'b', text: 'dois' }]);
    const k = toDraft({ id, type: 'case', title: 'Ca', front: null, back: null, source: null, payload: { caseSteps: [{ stage: 'workup', text: 'ECG', assetId: asset }] } });
    if (k.type !== 'case') throw new Error();
    expect(k.stageAssets.workup).toBe(asset);
    const kb = buildSaveInput({ ...k, stageAssets: { ...k.stageAssets, management: asset } }); // management has no text
    expect(kb.ok && kb.data.type === 'case' && kb.data.payload.caseSteps).toEqual([{ stage: 'workup', text: 'ECG', assetId: asset }]);
    const img = buildSaveInput({ ...fresh('image'), assetId: asset, backAssetId: asset } as Draft);
    expect(img.ok && img.data.backAssetId).toBeNull(); // image cards answer with their masks
  });
});

describe('buildSaveInput', () => {
  it('concept: trims, empty texts become null', () => {
    const r = buildSaveInput({ ...fresh('concept'), title: ' Sepse ', back: '**Disfunção**', source: '  ' });
    expect(r).toEqual({ ok: true, data: { type: 'concept', title: 'Sepse', shape: 'rect', front: null, frontAssetId: null, backAssetId: null, back: '**Disfunção**', source: null, payload: {} } });
  });

  it('D-095/D-096: concept keeps its shape and question image; other types are always rect', () => {
    const r = buildSaveInput({ ...fresh('concept'), title: 'Sepse', shape: 'diamond', frontAssetId: asset });
    expect(r.ok && [r.data.shape, r.data.frontAssetId]).toEqual(['diamond', asset]);
    const c = fresh('case');
    if (c.type !== 'case') throw new Error();
    const k = buildSaveInput({ ...c, shape: 'circle', stages: { ...c.stages, diagnosis: 'Sepse' } });
    expect(k.ok && k.data.shape).toBe('rect');
    expect(toDraft({ id, type: 'flow', title: 'F', front: null, back: null, source: null, shape: 'hexagon', payload: {} }).shape).toBe('rect');
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
    expect(buildSaveInput({ ...fresh('concept'), title: 'xx', source: 'y'.repeat(1001) })).toEqual({ ok: false, errors: ['Algum campo passou do tamanho máximo.'] });
  });
});
