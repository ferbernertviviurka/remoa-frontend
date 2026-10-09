import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['e2e/questions/harness/catalog-history-fixtures.test.ts'],exclude:['node_modules/**']}});
