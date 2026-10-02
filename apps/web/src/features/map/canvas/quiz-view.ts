import type { ChallengeItemPublic } from '@remoa/contracts';
import type { NodeChallengeRole } from '@remoa/ui';
import type { Graph } from './graph';

/**
 * What the map shows while a challenge item is open (G01 T6). Everything that could be the canonical answer is masked here:
 * the tested card's back (hidden_card), its title when the title is the answer (`cardTitle === ''`), the hidden step and
 * the later ones (next_step: only the revealed steps come from the item), and the label of the asked connection (edge).
 */
export type QuizView = {
  cardId: string;
  neighbors: ReadonlySet<string>;
  hideSummary: boolean;
  hideTitle: boolean;
  /** next_step: texts of steps 1..k; null = no step list override. */
  revealed: readonly string[] | null;
  hiddenEdges: ReadonlySet<string>;
};

export function quizView(item: ChallengeItemPublic | null | undefined, graph: Graph): QuizView | null {
  if (!item) return null;
  const neighbors = new Set<string>();
  for (const e of graph.edges) {
    if (e.source === item.cardId) neighbors.add(e.target);
    else if (e.target === item.cardId) neighbors.add(e.source);
  }
  const title = new Map(graph.nodes.map((n) => [n.id, n.data.card.title]));
  const asked = item.context.edge;
  const hiddenEdges = new Set(
    asked ? graph.edges.filter((e) => title.get(e.source) === asked.fromTitle && title.get(e.target) === asked.toTitle).map((e) => e.id) : [],
  );
  return {
    cardId: item.cardId,
    neighbors,
    hideSummary: item.mode === 'hidden_card',
    hideTitle: item.cardTitle === '',
    revealed: item.mode === 'next_step' ? (item.context.revealed ?? []) : null,
    hiddenEdges,
  };
}

export const quizRole = (q: QuizView | null, id: string): NodeChallengeRole | undefined =>
  !q ? undefined : id === q.cardId ? 'target' : q.neighbors.has(id) ? 'neighbor' : 'dim';
