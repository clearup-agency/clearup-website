import next from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...next, ...coreWebVitals, ...typescript,
  { ignores: ['.next/**', 'out/**', 'site/**', 'node_modules/**', 'next-env.d.ts', 'scripts/**', 'test/**'] },
  {
    rules: {
      // the concept uses plain <img> on purpose (static export, CMS CDN URLs, no image server)
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
export default config;
