import type { ChallengeItemPublic } from '@remoa/contracts';
import type { Graph } from './graph';

/**
 * What the map shows while a challenge item is open (G01 T6, D-097). The canvas is blurred and only the tested card is drawn
 * sharp on top, front only (never the back). Everything that could be the canonical answer is still masked in the DOM:
 * its title when the title is the answer (`cardTitle === ''`), the hidden step and the later ones (next_step: only the
 * revealed steps come from the item), the image whose masked regions are asked (occlusion) and the label of the asked
 * connection (edge).
 */
export type QuizView = {
  cardId: string;
  hideTitle: boolean;
  /** occlusion: the bare image would show the covered regions; the panel draws it with the masks. */
  hideImage: boolean;
  /** next_step: texts of steps 1..k; null = no step list override. */
  revealed: readonly string[] | null;
  hiddenEdges: ReadonlySet<string>;
};

export function quizView(item: ChallengeItemPublic | null | undefined, graph: Graph): QuizView | null {
  if (!item) return null;
  const title = new Map(graph.nodes.map((n) => [n.id, n.data.card.title]));
  const asked = item.context.edge;
  const hiddenEdges = new Set(
    asked ? graph.edges.filter((e) => title.get(e.source) === asked.fromTitle && title.get(e.target) === asked.toTitle).map((e) => e.id) : [],
  );
  return {
    cardId: item.cardId,
    hideTitle: item.cardTitle === '',
    hideImage: item.mode === 'occlusion',
    revealed: item.mode === 'next_step' ? (item.context.revealed ?? []) : null,
    hiddenEdges,
  };
}
