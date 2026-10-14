import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
export default function dynamic<P extends object>(load: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>, opts?: { loading?: () => ReactElement }) {
  const L = lazy(async () => { const m = await load(); return 'default' in (m as object) ? (m as { default: ComponentType<P> }) : { default: m as ComponentType<P> }; });
  return (p: P) => <Suspense fallback={opts?.loading ? opts.loading() : null}><L {...p} /></Suspense>;
}
