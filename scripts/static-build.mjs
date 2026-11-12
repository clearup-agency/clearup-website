// Cross-platform `STATIC_EXPORT=1 next build` (the inline VAR=x form does not work in Windows cmd,
// which is what npm uses there). Extra env files: node --env-file=... scripts/static-build.mjs
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const r = spawnSync(process.execPath, [next, 'build'], { stdio: 'inherit', env: { ...process.env, STATIC_EXPORT: '1' } });
process.exit(r.status ?? 1);
