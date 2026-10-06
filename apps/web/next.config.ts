import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

// D-323: a parte logada mudou para `/app/*`; links e favoritos antigos seguem valendo (308, a query vai junto).
const moved = ['hoje', 'mapas', 'revisar', 'cobertura', 'loja', 'conta', 'planos', 'editorial', 'progresso', 'm/revisar'];

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next', // build de medição sem pisar no `.next` do dev server
  env: { NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0' }, // F11 FR-4: appVersion on every event
  transpilePackages: ['@remoa/contracts', '@remoa/strings', '@remoa/ui'],
  // G11 (D-357): rewrites the @remoa/ui barrel into per-file imports, so a page only ships the client components it uses (landing: 338 → 226 KB).
  // G21 FR-48: + os pacotes com barrel que o app importa (não há lib de ícones: os ícones são de @remoa/ui).
  // G21 FR-52 (D-979): `staleTimes.dynamic` fica no padrão do Next 15 (0) até existir teste de frescor da navegação (ARCH-REVIEW);
  // depois: `staleTimes: { dynamic: 30 }` e as Server Actions que invalidam tag já limpam o cache do roteador.
  experimental: { optimizePackageImports: ['@remoa/ui', '@xyflow/react', '@dnd-kit/core', '@tiptap/react'] },
  // G21 FR-51: AVIF/WebP (as únicas imagens de `next/image` hoje são SVGs ilustrativos, que o Next não reprocessa).
  images: { formats: ['image/avif', 'image/webp'] },
  // P-507 (D-1072): no App Router, cada layout e cada página é uma entrada; o padrão do Next (`minSize: 20000`) não separa grupos
  // pequenos de módulos comuns, que então vão duplicados no chunk do layout e no da página (Dialog, botão, cliente da API...).
  // Um mínimo menor tira a duplicata do First Load. `SPLIT_MIN` só para medir outros valores.
  webpack(cfg, { isServer, dev }) {
    const split = cfg.optimization?.splitChunks;
    if (!isServer && !dev && split) split.minSize = Number(process.env.SPLIT_MIN ?? 5000);
    return cfg;
  },
  // F27: metadados no <head> para todo User-Agent (o streaming do Next 15 os põe no <body>; o Lighthouse não vê a meta description e SEO cai para 92)
  htmlLimitedBots: /.*/,
  // lint roda via `pnpm lint` (ESLint flat config na raiz), não no build
  eslint: { ignoreDuringBuilds: true },
  // G14: build de medição com a árvore compartilhada no meio de outra lane; o typecheck de verdade é o `pnpm check`
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === '1' },
  // D-534: `/` is static; only the A/B variants (`?v=`, `?h=`) go to the per-request `/lp` (the query goes along).
  async rewrites() {
    // P-410: same for the blog search: `/blog` stays static ISR, only `/blog?q=` renders per request (`/blog-busca`).
    return {
      beforeFiles: [
        ...['v', 'h'].map((key) => ({ source: '/', has: [{ type: 'query' as const, key }], destination: '/lp' })),
        { source: '/blog', has: [{ type: 'query' as const, key: 'q' }], destination: '/blog-busca' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: '/app', destination: '/app/hoje', permanent: false },
      // D-904: the legal pages moved to their long names (301/308 permanent).
      { source: '/termos', destination: '/termos-de-uso', permanent: true },
      { source: '/privacidade', destination: '/politica-de-privacidade', permanent: true },
      ...moved.map((p) => ({ source: `/${p}/:rest*`, destination: `/app/${p}/:rest*`, permanent: true })),
    ];
  },
};
// G21 FR-48: `ANALYZE=1 NEXT_DIST_DIR=.next-perfN next build` gera os relatórios em <dist>/analyze (nunca no `.next` compartilhado).
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === '1', openAnalyzer: false });
export default withAnalyzer(config);
