import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {apiMiddleware} from './server';
const here=fileURLToPath(new URL('.',import.meta.url));const qh=fileURLToPath(new URL('../../questions/harness/',import.meta.url));const src=fileURLToPath(new URL('../../../src/',import.meta.url));
// Own port (4327): other sessions own :3000/:4317. Test API only; no Supabase, no Remoa API.
export default {root:here,define:{'process.env.NEXT_PUBLIC_APP_VERSION':JSON.stringify('f34-test-only')},plugins:[react(),{name:'f34-test-api-only',configureServer(server:{middlewares:{use:(h:typeof apiMiddleware)=>void}}){server.middlewares.use(apiMiddleware);}}],
  resolve:{alias:[{find:/^next\/link$/,replacement:qh+'link.tsx'},{find:/^next\/navigation$/,replacement:qh+'navigation.ts'},{find:/^@\/lib\/api$/,replacement:qh+'api.ts'},{find:'@',replacement:src}]},
  server:{host:'127.0.0.1',port:4327,strictPort:true,fs:{allow:[fileURLToPath(new URL('../../../../../..',import.meta.url))]}},css:{postcss:fileURLToPath(new URL('../../../',import.meta.url))}};
