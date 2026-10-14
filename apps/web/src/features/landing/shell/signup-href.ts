/** F35 FR-37: signup URL contract `/cadastro?curso=<courseCode>&de=landing[&plano=<planId>]` (the signup lane reads these). */
export function signupHref(o: { curso?: string | null; plano?: string } = {}): string {
  const p = new URLSearchParams();
  if (o.curso) p.set('curso', o.curso);
  p.set('de', 'landing');
  if (o.plano) p.set('plano', o.plano);
  return `/cadastro?${p}`;
}
