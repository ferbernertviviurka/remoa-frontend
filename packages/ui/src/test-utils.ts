import axe from 'axe-core';

/** Roda axe no container; color-contrast não funciona em jsdom. */
export async function violations(container: Element) {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return r.violations.map((v) => v.id);
}
