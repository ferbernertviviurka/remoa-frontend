import type { NextConfig } from 'next';

// D-323: a parte logada mudou para `/app/*`; links e favoritos antigos seguem valendo (308, a query vai junto).
const moved = ['hoje', 'mapas', 'revisar', 'cobertura', 'loja', 'conta', 'planos', 'editorial', 'progresso', 'm/revisar'];

const config: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0' }, // F11 FR-4: appVersion on every event
  transpilePackages: ['@remoa/contracts', '@remoa/strings', '@remoa/ui'],
  // G11 (D-357): rewrites the @remoa/ui barrel into per-file imports, so a page only ships the client components it uses (landing: 338 → 226 KB).
  experimental: { optimizePackageImports: ['@remoa/ui'] },
  // lint roda via `pnpm lint` (ESLint flat config na raiz), não no build
  eslint: { ignoreDuringBuilds: true },
  // D-534: `/` is static; only the A/B variants (`?v=`, `?h=`) go to the per-request `/lp` (the query goes along).
  async rewrites() {
    return { beforeFiles: ['v', 'h'].map((key) => ({ source: '/', has: [{ type: 'query' as const, key }], destination: '/lp' })), afterFiles: [], fallback: [] };
  },
  async redirects() {
    return [
      { source: '/app', destination: '/app/hoje', permanent: false },
      ...moved.map((p) => ({ source: `/${p}/:rest*`, destination: `/app/${p}/:rest*`, permanent: true })),
    ];
  },
};
export default config;
