import axe from 'axe-core';

/** axe on the container; color-contrast does not work in jsdom. */
export async function violations(container: Element) {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}
