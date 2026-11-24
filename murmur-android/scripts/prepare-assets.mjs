// Puts everything Whisper needs inside www/ so the app never touches the network:
// the transformers.js library, the ONNX Runtime WebAssembly engine, and the
// Whisper model files (downloaded once at build time, pinned to a revision).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
const nm = join(root, 'node_modules');

const MODEL = 'onnx-community/whisper-base';
const REVISION = '27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c';
const MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('copied ', to.slice(root.length + 1));
}

// 1. Library + engine from node_modules (versions pinned in package.json).
copy(join(nm, '@huggingface/transformers/dist/transformers.min.js'), join(www, 'vendor/transformers.min.js'));
for (const f of ['ort-wasm-simd-threaded.asyncify.wasm', 'ort-wasm-simd-threaded.asyncify.mjs']) {
  copy(join(nm, 'onnxruntime-web/dist', f), join(www, 'vendor/ort', f));
}

// 2. Model files (skipped when already present).
for (const f of MODEL_FILES) {
  const dest = join(www, 'models', MODEL, f);
  if (existsSync(dest) && statSync(dest).size > 0) { console.log('present', dest.slice(root.length + 1)); continue; }
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://huggingface.co/${MODEL}/resolve/${REVISION}/${f}`;
  console.log('fetch  ', url);
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', dest, url], { stdio: 'inherit' });
}
console.log('assets ready');
