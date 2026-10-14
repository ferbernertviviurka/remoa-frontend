import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const stubs = here + 'stubs/';
const src = fileURLToPath(new URL('../../../src/', import.meta.url));
const qh = fileURLToPath(new URL('../../questions/harness/', import.meta.url));
// G28-P QA harness. Own port 4328; production components; real Hono API on :4400 (isolated test DB) behind the /v1 proxy. Not production.
export default {
  root: here,
  define: { 'process.env.NEXT_PUBLIC_APP_VERSION': JSON.stringify('g28p-qa'), 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('') },
  plugins: [react()],
  resolve: { alias: [
    { find: /^next\/link$/, replacement: qh + 'link.tsx' },
    { find: /^next\/navigation$/, replacement: stubs + 'navigation.ts' },
    { find: /^next\/dynamic$/, replacement: stubs + 'dynamic.tsx' },
    { find: /^@\/lib\/api$/, replacement: stubs + 'api.ts' },
    { find: /^@\/lib\/api\/base$/, replacement: stubs + 'base.ts' },
    { find: /^@\/lib\/cache$/, replacement: stubs + 'cache.ts' },
    { find: /^@\/server\/auth\/actions$/, replacement: stubs + 'auth-actions.ts' },
    { find: /^@\/lib\/supabase\/client$/, replacement: stubs + 'supabase-client.ts' },
    { find: /^@\/features\/referral\/invite\/actions$/, replacement: stubs + 'referral-actions.ts' },
    { find: /^\.\/blog\/landing-blog$/, replacement: stubs + "landing-blog.tsx" },
    { find: /^\.\/enamed\/load-enamed$/, replacement: stubs + 'load-enamed.ts' },
    { find: '@', replacement: src },
  ] },
  server: { host: '127.0.0.1', port: 4328, strictPort: true, proxy: { '/v1': 'http://127.0.0.1:4400', '/__test': 'http://127.0.0.1:4400' }, fs: { allow: [fileURLToPath(new URL('../../../../../..', import.meta.url))] } },
  css: { postcss: fileURLToPath(new URL('../../../', import.meta.url)) },
};
