import { describe, expect, it } from 'vitest';
import type { ChallengeItemPublic } from '@remoa/contracts';
import type { Graph } from './graph';
import { quizView } from './quiz-view';

const node = (id: string, title: string) => ({ id, type: 'card', position: { x: 0, y: 0 }, data: { card: { id, title } } });
const edge = (id: string, source: string, target: string, label: string) => ({ id, source, target, type: 'link', data: { label } });
const graph = {
  nodes: [node('a', 'Sepse'), node('b', 'Choque'), node('c', 'Lactato'), node('d', 'Caso')],
  edges: [edge('e1', 'a', 'b', 'evolui para'), edge('e2', 'c', 'b', 'estratifica')],
} as unknown as Graph;
const item = (o: Partial<ChallengeItemPublic>) => ({ id: 'i', cardId: 'b', boardId: 'x', cardTitle: 'Choque', subId: null, mode: 'hidden_card', prompt: 'p', context: { neighbors: [] }, grading: 'none', ...o }) as ChallengeItemPublic;

describe('quizView', () => {
  it('no session = no view', () => {
    expect(quizView(undefined, graph)).toBeNull();
    expect(quizView(item({}), graph)!.cardId).toBe('b');
  });

  it('hides only the connection being asked (by its ends), a title that is the answer and the occlusion image', () => {
    const q = quizView(item({ mode: 'edge', cardTitle: '', context: { neighbors: [], edge: { fromTitle: 'Sepse', toTitle: 'Choque' } } }), graph)!;
    expect([...q.hiddenEdges]).toEqual(['e1']);
    expect(q.hideTitle).toBe(true);
    expect(q.hideImage).toBe(false);
    expect(quizView(item({ mode: 'occlusion' }), graph)!.hideImage).toBe(true);
  });

  it('next_step carries only the revealed steps', () => {
    expect(quizView(item({ mode: 'next_step', context: { neighbors: [], revealed: ['1', '2'] } }), graph)!.revealed).toEqual(['1', '2']);
    expect(quizView(item({}), graph)!.revealed).toBeNull();
  });
});
