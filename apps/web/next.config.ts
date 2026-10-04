import type { NextConfig } from 'next';

// D-323: a parte logada mudou para `/app/*`; links e favoritos antigos seguem valendo (308, a query vai junto).
const moved = ['hoje', 'mapas', 'revisar', 'cobertura', 'loja', 'conta', 'planos', 'editorial', 'progresso', 'm/revisar'];

const config: NextConfig = {
  transpilePackages: ['@remoa/contracts', '@remoa/strings', '@remoa/ui'],
  // G11 (D-357): rewrites the @remoa/ui barrel into per-file imports, so a page only ships the client components it uses (landing: 338 → 226 KB).
  experimental: { optimizePackageImports: ['@remoa/ui'] },
  // lint roda via `pnpm lint` (ESLint flat config na raiz), não no build
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: '/app', destination: '/app/hoje', permanent: false },
      ...moved.map((p) => ({ source: `/${p}/:rest*`, destination: `/app/${p}/:rest*`, permanent: true })),
    ];
  },
};
export default config;
