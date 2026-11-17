import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'docs');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Bundle the worker as a classic IIFE worker (not an ESM worker).
await esbuild.build({
  entryPoints: [join(root, 'src/worker.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  outfile: join(out, 'worker.js'),
  alias: { 'onnxruntime-node': 'onnxruntime-web' },
  define: { 'process.env.NODE_ENV': '"production"' }
});

await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  outfile: join(out, 'main.js'),
  define: { 'process.env.NODE_ENV': '"production"' }
});

cpSync(join(root, 'src/index.html'), join(out, 'index.html'));
const ortDist = join(root, 'node_modules/onnxruntime-web/dist');
for (const file of [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs'
]) cpSync(join(ortDist, file), join(out, file));
cpSync(join(root, 'node_modules/demucs/htdemucs.onnx'), join(out, 'htdemucs.onnx'));
console.log('Free Vocal Studio v6.0 built into docs/');
