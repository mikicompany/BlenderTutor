// Murmur — on-device voice notes. Nothing here uses the network.
import * as whisper from './whisper.js';

// ---------- Storage (on the phone only) ----------
const KEY = 'murmur:v1';
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.notes) && Array.isArray(s.tasks)) return s;
  } catch (_) { /* ignore */ }
  return { work: false, notes: [], tasks: [], tab: 'notes' };
}
const state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* ignore */ } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Transcript -> action items (rules, on-device) ----------
const VERBS = 'call|phone|ring|email|e-mail|text|message|ping|send|book|buy|order|pay|schedule|set|fix|finish|write|review|check|update|prepare|follow|ask|tell|remind|pick|drop|clean|plan|submit|sign|renew|cancel|file|print|return|reply|respond|invite|meet|organize|organise|research|look|find|get|make|take|bring|move|read|draft|share|post|upload|test|confirm|contact|arrange|reserve|install|charge|wash|water|feed|walk|collect|deliver|ship|backup|back|start|stop|try|talk|visit|go|see|grab|print|study|practice|practise|learn|clear|sort|tidy|book';
const VERB_START = new RegExp(`^(${VERBS})\\b`, 'i');
const FILLER = /\b(um+|uh+|erm+|hmm+|ah+|you know|i mean|kind of|sort of|basically|actually|literally|like,)\b[,]?\s*/gi;
const LEAD_INS = [
  /^(ok(ay)?|so|and|also|then|well|alright|all right|right|now|oh|plus|first(ly)?|second(ly)?|next|finally|lastly)[,\s]+/i,
  /^(i|we)\s+(really\s+|also\s+|still\s+)?(need|have|got|gotta|must|should|ought)\s+(to\s+)?/i,
  /^(i|we)('m| am| are|'re)\s+(going|gonna)\s+(to\s+)?/i,
  /^(i|we)('ll| will)\s+(need to\s+|have to\s+)?/i,
  /^(i|we)\s+want\s+to\s+/i,
  /^(i('d| would) like to)\s+/i,
  /^(you|someone)\s+(need|needs|have|has)\s+to\s+/i,
  /^(don'?t|do not)\s+forget\s+(to\s+)?/i,
  /^(remember|remind me)\s+(to\s+)?/i,
  /^(make sure\s+(to|that)?\s*)/i,
  /^(let'?s|lets)\s+/i,
  /^(can|could|would)\s+(you|someone|somebody)\s+(please\s+)?/i,
  /^(please)\s+/i,
  /^(to\s*do|todo|action item|task|reminder|note to self)[:,\s]+/i,
  /^(gotta|need to|have to|got to|must)\s+/i,
];
const URGENT = /\b(urgent(ly)?|asap|as soon as possible|right away|immediately|critical|top priority|high priority|first thing)\b[:,]?\s*/i;
const DUE = [
  /\b(today|tonight|this (morning|afternoon|evening))\b/i,
  /\b(tomorrow( morning| afternoon| evening| night)?)\b/i,
  /\b(by|before|on|next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|weekend|eod|end of (the )?(day|week|month))\b/i,
  /\b(end of (the )?(day|week|month))\b/i,
  /\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.|o'?clock)\b/i,
  /\b(on|by)\s+(the\s+)?\d{1,2}(st|nd|rd|th)\b/i,
];

function splitIntoChunks(text) {
  const out = [];
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?;])\s+/);
  for (const s of sentences) {
    // Spoken joins: "..., and then call Jim", "... and also book flights"
    const parts = s.split(/,?\s+(?:and then|after that|and also|then also|another thing is|also)\s+/i);
    for (const part of parts) {
      // "call Jim, book flights and email Sara": split at a comma / "and" only
      // when what follows starts with an action verb ("salt and pepper" stays whole).
      const tokens = part.split(/(,\s+(?:and\s+)?|\s+and\s+)/i); // text, sep, text, sep, ...
      let cur = tokens[0];
      for (let i = 1; i < tokens.length; i += 2) {
        const next = tokens[i + 1] || '';
        if (VERB_START.test(next.trim())) { out.push(cur); cur = next; } else cur += tokens[i] + next;
      }
      out.push(cur);
    }
  }
  return out.map(s => s.trim()).filter(Boolean);
}

function toActionItem(raw) {
  let t = raw.replace(FILLER, '').replace(/\s+/g, ' ').trim();
  let priority = 'normal';
  if (URGENT.test(t)) { priority = 'high'; t = t.replace(URGENT, '').trim(); }
  t = t.replace(/^[,.;:\s]+|[.!?;,\s]+$/g, '');
  let prev;
  do { // peel stacked lead-ins: "okay so I need to ..."
    prev = t;
    for (const re of LEAD_INS) t = t.replace(re, '');
    t = t.trim();
  } while (t !== prev && t.length);
  if (!t || (t.split(' ').length < 2 && t.length < 4)) return null; // noise like "ok"
  if (/^(thanks|thank you|bye|hello|hi|hey|yeah|yes|no|okay|ok)$/i.test(t)) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  let due = null;
  for (const re of DUE) { const m = t.match(re); if (m) { due = m[0].replace(/^(by|before|on)\s+/i, ''); break; } }
  return { id: uid(), text: t, done: false, due, priority, created: Date.now() };
}

export function textToActionItems(text) {
  return splitIntoChunks(text).map(toActionItem).filter(Boolean);
}

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const main = $('main'), mic = $('mic'), hint = $('hint'), live = $('live');
const workToggle = $('workToggle'), modeLabel = $('modeLabel'), toastEl = $('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

let recorder = null, timer = null, modelReady = false;
const transcribing = []; // recordings being transcribed right now (in memory)

function setHint() {
  if (recorder) return;
  if (!modelReady) { hint.textContent = 'Loading speech model… you can start recording'; return; }
  hint.textContent = state.work ? 'Tap to speak — becomes action items' : 'Tap to start talking';
}

function applyMode() {
  document.body.classList.toggle('work', state.work);
  workToggle.checked = state.work;
  modeLabel.textContent = state.work ? 'Work mode on' : 'Work mode off';
  setHint();
}

function setTab(tab) {
  state.tab = tab; save();
  $('tab-notes').setAttribute('aria-selected', tab === 'notes');
  $('tab-tasks').setAttribute('aria-selected', tab === 'tasks');
  render();
}

function transcribingHtml() {
  return transcribing.map(() => `<li class="card pending"><span class="spinner"></span>
    <div class="body"><div class="label">Transcribing…</div><div class="src">Whisper is running on your phone</div></div></li>`).join('');
}

function render() {
  $('notesCount').textContent = state.notes.length;
  $('tasksCount').textContent = state.tasks.filter(t => !t.done).length;

  if (state.tab === 'notes') {
    if (!state.notes.length && !transcribing.length) {
      main.innerHTML = '<p class="empty">No transcripts yet.<br>Tap the mic and start talking.</p>'; return;
    }
    const tools = `<div class="toolbar">
      ${state.work && state.notes.length ? '<button data-act="move-all">Move all to action items</button>' : ''}
      ${state.notes.length ? '<button data-act="copy-notes">Copy all</button>' : ''}
    </div>`;
    main.innerHTML = tools + '<ul class="list">' + transcribingHtml() + state.notes.map(n => `
      <li class="card note" data-id="${n.id}">
        <div class="meta"><span>${fmt(n.created)}</span>
          <span><button class="linkish" data-act="to-tasks">→ Action items</button>
          <button class="icon-btn" data-act="del-note" aria-label="Delete">×</button></span></div>
        <p>${esc(n.text)}</p>
      </li>`).join('') + '</ul>';
  } else {
    if (!state.tasks.length && !transcribing.length) {
      main.innerHTML = '<p class="empty">No action items yet.<br>Turn on <b>Work mode</b> and start talking.</p>'; return;
    }
    const open = state.tasks.filter(t => !t.done), done = state.tasks.filter(t => t.done);
    const tools = `<div class="toolbar">
      ${open.length ? '<button data-act="copy-tasks">Copy list</button>' : ''}
      ${done.length ? '<button data-act="clear-done">Clear done</button>' : ''}
    </div>`;
    main.innerHTML = tools + '<ul class="list">' + transcribingHtml() + [...open, ...done].map(t => `
      <li class="card task ${t.done ? 'done' : ''}" data-id="${t.id}">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-act="toggle" aria-label="Done" />
        <div class="body">
          <div class="text" contenteditable="true" spellcheck="false" data-act="edit">${esc(t.text)}</div>
          ${t.priority === 'high' ? '<span class="tag high">urgent</span>' : ''}
          ${t.due ? `<span class="tag due">${esc(t.due)}</span>` : ''}
          <span class="tag">${fmt(t.created)}</span>
        </div>
        <button class="icon-btn" data-act="del-task" aria-label="Delete">×</button>
      </li>`).join('') + '</ul>';
  }
}

function addTasks(items) {
  state.tasks.unshift(...items); // newest batch on top, in spoken order
  toast(items.length ? `+${items.length} action item${items.length > 1 ? 's' : ''}` : 'Nothing actionable found');
}

function addTranscript(text) {
  text = text.trim();
  if (!text) return;
  if (state.work) {
    addTasks(textToActionItems(text));
    if (state.tab !== 'tasks') return setTab('tasks');
  } else {
    state.notes.unshift({ id: uid(), text, created: Date.now() });
  }
  save(); render();
}

function moveNotesToTasks(ids) {
  const moving = state.notes.filter(n => !ids || ids.includes(n.id));
  if (!moving.length) return;
  state.notes = state.notes.filter(n => !moving.includes(n));
  const items = moving.flatMap(n => textToActionItems(n.text).map(i => ({ ...i, created: n.created })));
  addTasks(items);
  save(); setTab('tasks');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); return; } catch (_) { /* fall back */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Copy failed'); }
  ta.remove();
}

main.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const li = el.closest('li'), id = li && li.dataset.id, act = el.dataset.act;
  if (act === 'del-note') { state.notes = state.notes.filter(n => n.id !== id); save(); render(); }
  else if (act === 'to-tasks') moveNotesToTasks([id]);
  else if (act === 'move-all') moveNotesToTasks(null);
  else if (act === 'copy-notes') copyText(state.notes.map(n => `${fmt(n.created)}\n${n.text}`).join('\n\n'));
  else if (act === 'del-task') { state.tasks = state.tasks.filter(t => t.id !== id); save(); render(); }
  else if (act === 'toggle') { const t = state.tasks.find(t => t.id === id); if (t) { t.done = el.checked; save(); render(); } }
  else if (act === 'clear-done') { state.tasks = state.tasks.filter(t => !t.done); save(); render(); }
  else if (act === 'copy-tasks') {
    copyText(state.tasks.filter(t => !t.done)
      .map(t => `☐ ${t.text}${t.due ? ` (${t.due})` : ''}${t.priority === 'high' ? ' [urgent]' : ''}`).join('\n'));
  }
});
main.addEventListener('focusout', e => {
  if (e.target.dataset.act !== 'edit') return;
  const id = e.target.closest('li').dataset.id, t = state.tasks.find(t => t.id === id);
  if (!t) return;
  const v = e.target.textContent.trim();
  if (!v) state.tasks = state.tasks.filter(x => x !== t); else t.text = v;
  save(); render();
});
main.addEventListener('keydown', e => {
  if (e.target.dataset.act === 'edit' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
});

$('tab-notes').onclick = () => setTab('notes');
$('tab-tasks').onclick = () => setTab('tasks');
workToggle.onchange = () => {
  state.work = workToggle.checked; save(); applyMode();
  if (state.work && state.notes.length) toast('Tip: “Move all to action items” is in Transcripts');
  setTab(state.work ? 'tasks' : 'notes');
};

// ---------- Recording ----------
async function startRecording() {
  const r = new whisper.Recorder();
  try { await r.start(); } catch (_) { toast('Microphone permission is needed to record'); return; }
  recorder = r;
  mic.classList.add('rec'); mic.setAttribute('aria-label', 'Stop recording');
  hint.textContent = 'Recording… tap to stop';
  live.classList.add('show');
  const tick = () => {
    const s = Math.floor((Date.now() - r.startedAt) / 1000);
    live.innerHTML = `<span class="rec-dot"></span> Recording ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}
      <span class="interim">— words appear after you stop</span>`;
  };
  tick(); timer = setInterval(tick, 500);
}

async function stopRecording() {
  const r = recorder; recorder = null;
  clearInterval(timer);
  live.classList.remove('show');
  mic.classList.remove('rec'); mic.setAttribute('aria-label', 'Start recording');
  setHint();
  const blob = await r.stop();
  const job = {};
  transcribing.push(job);
  if (state.work && state.tab !== 'tasks') setTab('tasks'); else render();
  try {
    const text = await whisper.transcribe(blob);
    if (!text) toast('Didn’t catch anything');
    transcribing.splice(transcribing.indexOf(job), 1);
    text ? addTranscript(text) : render();
  } catch (err) {
    transcribing.splice(transcribing.indexOf(job), 1);
    render();
    toast('Transcription failed: ' + (err.message || err));
  }
}

mic.onclick = () => (recorder ? stopRecording() : startRecording());

// ---------- Boot ----------
applyMode();
setTab(state.tab || 'notes');
whisper.warmUp()
  .then(() => { modelReady = true; setHint(); })
  .catch(err => { hint.textContent = 'Speech model failed to load: ' + err.message; });

window.__murmur = { textToActionItems }; // for testing
