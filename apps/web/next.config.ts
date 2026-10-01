import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@remoa/contracts', '@remoa/strings', '@remoa/ui'],
  // lint roda via `pnpm lint` (ESLint flat config na raiz), não no build
  eslint: { ignoreDuringBuilds: true },
};
export default config;
