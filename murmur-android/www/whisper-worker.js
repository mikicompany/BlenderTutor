// On-device speech-to-text with Whisper, running in a Web Worker.
// Everything is loaded from files packaged inside the app: no network at all.
import { pipeline, env, Tensor } from './vendor/transformers.min.js';

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
// Use several CPU cores when the page is cross-origin isolated (MainActivity sends
// the COOP/COEP headers); otherwise WebAssembly can only use one thread.
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
  ? Math.max(1, Math.min(4, (self.navigator.hardwareConcurrency || 2) - 1))
  : 1;

const MODEL = 'onnx-community/whisper-small';
const LANGS = ['en', 'es'];                 // the languages Murmur listens for
let loading = null;

function load() {
  return (loading ||= pipeline('automatic-speech-recognition', MODEL, { device: 'wasm', dtype: 'q8' })
    .catch(e => { loading = null; throw e; }));
}

const sot = g => new Tensor('int64', BigInt64Array.from([BigInt(g.decoder_start_token_id)]), [1, 1]);

// Which of English/Spanish is being spoken? Runs Whisper's first decoding step
// (the language token) and compares only those two, so it can't drift to
// Portuguese or Italian. Note: leaving `language` unset in the pipeline does NOT
// auto-detect in this library — it silently assumes English and translates.
function pickLanguage(asr, logitsTensor) {
  const g = asr.model.generation_config;
  const vocab = logitsTensor.dims.at(-1);
  const logits = logitsTensor.data.slice(-vocab);
  const scores = LANGS.map(l => logits[g.lang_to_id[`<|${l}|>`]]);
  const best = scores[0] >= scores[1] ? 0 : 1;
  return { lang: LANGS[best], margin: Math.abs(scores[0] - scores[1]) };
}

function choose(detected, audio, fallback) {
  // Very short notes carry little evidence; if it's a close call, keep the last language used.
  const shortAndUnsure = audio.length < 16000 * 4 && detected.margin < 2;
  return shortAndUnsure && LANGS.includes(fallback) ? fallback : detected.lang;
}

// language: 'en' | 'es' (user's choice) or 'auto'; fallback: language to use
// when auto-detection is unsure (very short notes) — the last one spoken.
// Auto adds one extra encoder pass (~a third of the time); picking EN/ES skips it.
async function transcribe(audio, language, fallback) {
  const asr = await load();
  let lang = language, auto = false;
  if (!LANGS.includes(lang)) {
    const { input_features } = await asr.processor(audio.subarray(0, 16000 * 30));
    const out = await asr.model({ input_features, decoder_input_ids: sot(asr.model.generation_config) });
    lang = choose(pickLanguage(asr, out.logits), audio, fallback);
    auto = true;
  }
  const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe', language: lang });
  const text = (Array.isArray(out) ? out.map(o => o.text).join(' ') : out.text).trim();
  return { text, lang, auto };
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'load') {
      await load();
      postMessage({ id, type: 'ready' });
    } else if (type === 'transcribe') {
      postMessage({ id, type: 'result', ...(await transcribe(data.audio, data.language, data.fallback)) });
    }
  } catch (err) {
    postMessage({ id, type: 'error', message: String((err && err.message) || err) });
  }
};
