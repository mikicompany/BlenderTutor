// On-device speech-to-text with Whisper (runs in a Web Worker).
// The library and model files are cached by the browser after the first
// download, so transcription works with no connection afterwards.
// The library is fetched once from jsDelivr (pinned version) and kept in Cache
// Storage, then imported from a blob URL — so after the first download it loads
// with no connection, like the model files it manages.
const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js';
const LIB_CACHE = 'murmur-lib';

let libPromise = null;
function loadLib() {
  return (libPromise ||= (async () => {
    const cache = await caches.open(LIB_CACHE);
    let res = await cache.match(LIB_URL);
    if (!res) {
      res = await fetch(LIB_URL);
      if (!res.ok) throw new Error(`Couldn't download Whisper engine (${res.status})`);
      await cache.put(LIB_URL, res.clone());
    }
    const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/javascript' }));
    const lib = await import(url);
    lib.env.allowLocalModels = false;
    return lib;
  })().catch(e => { libPromise = null; throw e; }));
}

const MODELS = {
  tiny: 'onnx-community/whisper-tiny',
  base: 'onnx-community/whisper-base',
};

let asr = null;      // loaded pipeline
let current = null;  // model size it was loaded for
let loading = null;  // in-flight load promise

function load(size) {
  if (asr && current === size) return Promise.resolve(asr);
  if (loading && current === size) return loading;
  current = size;
  asr = null;
  // WASM + 8-bit weights everywhere: same files on every device (so the cache
  // is predictable offline) and it runs on any phone browser.
  loading = loadLib().then(({ pipeline }) => pipeline('automatic-speech-recognition', MODELS[size], {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: p => {
      if (p.status === 'progress_total') {
        postMessage({ type: 'progress', loaded: p.loaded, total: p.total, progress: p.progress });
      }
    },
  })).then(p => { asr = p; return p; }).finally(() => { loading = null; });
  return loading;
}

async function transcribe(audio, language) {
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
      await load(data.size);
      postMessage({ id, type: 'ready' });
    } else if (type === 'transcribe') {
      await load(data.size);
      const text = await transcribe(data.audio, data.language);
      postMessage({ id, type: 'result', text });
    }
  } catch (err) {
    postMessage({ id, type: 'error', message: String(err && err.message || err) });
  }
};
