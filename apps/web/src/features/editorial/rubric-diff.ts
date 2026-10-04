export type RubricPoint = { text: string; essential: boolean };

const keyOf = (point: RubricPoint) => `${point.text.trim()}\0${point.essential ? '1' : '0'}`;

/** What changed between the stored rubric and the previous one. Blank lines are ignored. */
export function rubricPointDiff(previous: RubricPoint[], current: RubricPoint[]) {
  const prev = new Map(previous.filter((p) => p.text.trim()).map((p) => [keyOf(p), p.text.trim()]));
  const next = new Map(current.filter((p) => p.text.trim()).map((p) => [keyOf(p), p.text.trim()]));
  return {
    removed: [...prev.entries()].filter(([key]) => !next.has(key)).map(([, text]) => text),
    added: [...next.entries()].filter(([key]) => !prev.has(key)).map(([, text]) => text),
  };
}
