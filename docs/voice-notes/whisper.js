// Main-thread side of offline Whisper: recording, audio decoding, worker calls.
const MODEL_IDS = { tiny: 'onnx-community/whisper-tiny', base: 'onnx-community/whisper-base' };

let worker = null, seq = 0, progressFn = null;
const waiting = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') { progressFn && progressFn(data); return; }
    const w = waiting.get(data.id);
    if (!w) return;
    waiting.delete(data.id);
    data.type === 'error' ? w.reject(new Error(data.message)) : w.resolve(data);
  };
  worker.onerror = e => {
    for (const w of waiting.values()) w.reject(new Error(e.message || 'Whisper failed to start'));
    waiting.clear();
    worker = null;
  };
  return worker;
}

function call(msg, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id }, transfer);
  });
}

export const onProgress = fn => { progressFn = fn; };

export async function download(size) {
  try { await navigator.storage?.persist?.(); } catch (_) { /* best effort */ }
  await call({ type: 'load', size });
}

/** True when this model's weights are already in the browser cache. */
export async function isCached(size) {
  try {
    if (!('caches' in self)) return false;
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    const id = MODEL_IDS[size];
    const lib = await (await caches.open('murmur-lib')).keys();
    return lib.length > 0 && keys.some(r => r.url.includes(id) && r.url.includes('/onnx/'));
  } catch (_) { return false; }
}

export async function transcribe(blob, size) {
  const audio = await toMono16k(blob);
  if (audio.length < 16000 * 0.3) return ''; // under 0.3s: nothing said
  const language = (navigator.language || 'en').slice(0, 2).toLowerCase();
  const res = await call({ type: 'transcribe', size, audio, language }, [audio.buffer]);
  return res.text;
}

// Whisper wants 16 kHz mono float samples.
async function toMono16k(blob) {
  const bytes = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  let decoded;
  try {
    const ctx = new AC({ sampleRate: 16000 });
    try { decoded = await ctx.decodeAudioData(bytes.slice(0)); } finally { ctx.close(); }
  } catch (_) {
    const ctx = new AC();
    try { decoded = await ctx.decodeAudioData(bytes.slice(0)); } finally { ctx.close(); }
  }
  if (decoded.sampleRate !== 16000 || decoded.numberOfChannels !== 1) {
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    decoded = await off.startRendering();
  }
  return new Float32Array(decoded.getChannelData(0));
}

export class Recorder {
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = e => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.startedAt = Date.now();
  }
  stop() {
    return new Promise(resolve => {
      this.rec.onstop = () => {
        this.stream.getTracks().forEach(t => t.stop());
        resolve(new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' }));
      };
      this.rec.stop();
    });
  }
}
