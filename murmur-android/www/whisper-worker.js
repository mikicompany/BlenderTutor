// On-device speech-to-text with Whisper, running in a Web Worker.
// Everything is loaded from files packaged inside the app: no network at all.
import { pipeline, env } from './vendor/transformers.min.js';

env.allowRemoteModels = false;              // never fetch models from the internet
env.allowLocalModels = true;
// Must be a path, not a full URL: the library only checks local files for
// existence (tokenizer, preprocessor) when the path isn't a URL.
env.localModelPath = '/models/';
env.useBrowserCache = false;                // files are already on disk; don't duplicate them
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('./vendor/ort/ort-wasm-simd-threaded.asyncify.mjs', self.location).href,
  wasm: new URL('./vendor/ort/ort-wasm-simd-threaded.asyncify.wasm', self.location).href,
};
env.backends.onnx.wasm.numThreads = 1;      // no cross-origin isolation in the WebView

const MODEL = 'onnx-community/whisper-base';
let loading = null;

function load() {
  return (loading ||= pipeline('automatic-speech-recognition', MODEL, { device: 'wasm', dtype: 'q8' })
    .catch(e => { loading = null; throw e; }));
}

async function transcribe(audio, language) {
  const asr = await load();
  const opts = { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' };
  if (language) opts.language = language;
  let out;
  try {
    out = await asr(audio, opts);
  } catch (e) {
    if (!language) throw e;
    delete opts.language; // unsupported language code: let Whisper detect it
    out = await asr(audio, opts);
  }
  return (Array.isArray(out) ? out.map(o => o.text).join(' ') : out.text).trim();
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'load') {
      await load();
      postMessage({ id, type: 'ready' });
    } else if (type === 'transcribe') {
      postMessage({ id, type: 'result', text: await transcribe(data.audio, data.language) });
    }
  } catch (err) {
    postMessage({ id, type: 'error', message: String((err && err.message) || err) });
  }
};
