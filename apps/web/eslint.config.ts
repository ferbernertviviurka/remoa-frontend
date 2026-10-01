import base from '../../eslint.config';
import remoa from '@remoa/strings/eslint';

export default [
  ...base,
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx', 'src/**/*.stories.tsx'],
    plugins: { remoa },
    rules: { 'remoa/no-literal-strings': 'error' },
  },
];
