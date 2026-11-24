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
if (!['auto', 'en', 'es'].includes(state.lang)) state.lang = 'auto';
const phoneLang = /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* ignore */ } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Transcript -> action items (rules, on-device, English + Spanish) ----------
const RULES = {
  en: {
    // A clause that starts with one of these is its own task.
    verb: /^(call|phone|ring|email|e-mail|text|message|ping|send|book|buy|order|pay|schedule|set|fix|finish|write|review|check|update|prepare|follow|ask|tell|remind|pick|drop|clean|plan|submit|sign|renew|cancel|file|print|return|reply|respond|invite|meet|organi[sz]e|research|look|find|get|make|take|bring|move|read|draft|share|post|upload|test|confirm|contact|arrange|reserve|install|charge|wash|water|feed|walk|collect|deliver|ship|back|start|stop|try|talk|visit|go|see|grab|study|practi[cs]e|learn|clear|sort|tidy|cook)\b/i,
    filler: /\b(um+|uh+|erm+|hmm+|ah+|you know|i mean|kind of|sort of|basically|actually|literally|like,)\b[,]?\s*/gi,
    joins: /,?\s+(?:and then|after that|and also|then also|another thing is|also)\s+/i,
    and: /(,\s+(?:and\s+)?|\s+and\s+)/i,
    leadIns: [
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
    ],
    tail: /[,\s]+(please)$/i,
    urgent: /\b(urgent(ly)?|asap|as soon as possible|right away|immediately|critical|top priority|high priority|first thing)\b[:,]?\s*/i,
    due: [
      /\b(today|tonight|this (morning|afternoon|evening))\b/i,
      /\b(tomorrow( morning| afternoon| evening| night)?)\b/i,
      /\b(by|before|on|next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|weekend|eod|end of (the )?(day|week|month))\b/i,
      /\b(end of (the )?(day|week|month))\b/i,
      /\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.|o'?clock)\b/i,
      /\b(on|by)\s+(the\s+)?\d{1,2}(st|nd|rd|th)\b/i,
    ],
    dueStrip: /^(by|before|on)\s+/i,
    noise: /^(thanks|thank you|bye|hello|hi|hey|yeah|yes|no|okay|ok)$/i,
  },
  es: {
    // Infinitives and tú-imperatives ("llamar", "llama", "llámale", "mándale"...)
    verb: /^(ll[aá]m|envi|env[ií]|mand|m[aá]nd|compr|reserv|pag|revis|escrib|termin|prepar|agend|program|confirm|contact|busc|b[uú]sc|recog|limpi|habl|h[aá]bl|pregunt|avis|av[ií]s|llev|tra[ei]|hac|haz|arregl|cancel|renov|renuev|imprim|respond|contest|actualiz|organiz|plane|planific|investig|le[eé]|sub|compart|firm|entreg|ped|pid|sac|s[aá]c|pon|apunt|anot|regal|visit|cocin|lav|estudi|practic|pas|p[aá]s|cit|revis|dej|d[eé]j|cerr|cierr|abr|instal|carg|recuerd|record|averigu|consigu|consegu|cambi|devolv|devuelv|di\b|ve\b|ir\b|ven\b)\p{L}*/iu,
    filler: /\b(eh+|em+|mm+|ehm+|o sea|digamos|este,|como que)\s*,?\s*/giu,
    joins: /,?\s+(?:y luego|y despu[eé]s|despu[eé]s de eso|y tambi[eé]n|tambi[eé]n|adem[aá]s|otra cosa es|otra cosa)\s*,?\s+/iu,
    and: /(,\s+(?:y\s+)?|\s+y\s+)/i,
    leadIns: [
      /^(bueno|pues|entonces|y|tambi[eé]n|adem[aá]s|luego|despu[eé]s|primero|segundo|tercero|por [uú]ltimo|finalmente|ok|okey|vale|oye|a ver|ah|ay)[,\s]+/iu,
      /^(yo\s+|nosotros\s+)?(tengo|tenemos|tienes|tiene|tendr[ií]a|tendr[ií]amos)\s+que\s+/iu,
      /^(yo\s+)?(necesito|necesitamos|necesitas|necesita)\s+(que\s+)?/iu,
      /^(hay|habr[ií]a|habr[aá])\s+que\s+/iu,
      /^(yo\s+)?(debo|debemos|debes|deber[ií]a|deber[ií]amos)\s+(de\s+)?/iu,
      /^(yo\s+)?(voy|vamos)\s+a\s+/iu,
      /^(yo\s+)?(quiero|queremos|quisiera)\s+/iu,
      /^(que\s+)?no\s+(se\s+me\s+|te\s+|se\s+nos\s+)?olvid(e|es|en)\s+(de\s+)?/iu,
      /^(acu[eé]rdate|recuerda|recu[eé]rdame|recordar)\s+(de\s+|que\s+)?/iu,
      /^(aseg[uú]rate|asegurarse|asegurarme)\s+de\s+(que\s+)?/iu,
      /^(por favor)[,\s]+/iu,
      /^(puedes|podr[ií]as|me\s+puedes|me\s+podr[ií]as)\s+/iu,
      /^(tarea|pendiente|recordatorio|nota|apunte)[:,\s]+/iu,
      /^(me\s+falta|falta)\s+/iu,
    ],
    tail: /[,\s]+(por favor)$/iu,
    urgent: /\b(urgente(mente)?|cuanto antes|lo antes posible|lo m[aá]s pronto posible|inmediatamente|ya mismo|de inmediato|prioridad|es importante|a primera hora)\b[:,]?\s*/iu,
    due: [
      /\b(pasado mañana)\b/iu,
      /\b(hoy|esta noche|esta tarde|esta mañana)\b/iu,
      /\b(mañana( por la (mañana|tarde|noche))?)\b/iu,
      /\b(para el|antes del|el|este|el pr[oó]ximo|la pr[oó]xima|esta)\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|semana|mes|fin de semana)\b/iu,
      /\b(fin de (mes|semana))\b/iu,
      /\b(a|antes de|para)\s+las\s+\d{1,2}(:\d{2})?(\s+(de la (mañana|tarde|noche)|am|pm))?/iu,
      /\b(para el|el)\s+\d{1,2}(\s+de\s+\p{L}+)?\b/iu,
    ],
    dueStrip: /^(para el|antes del|el|para|antes de)\s+/iu,
    noise: /^(gracias|adi[oó]s|hola|s[ií]|no|vale|ok|okey|bueno)$/iu,
  },
};

// Rough guess when the language isn't known (e.g. older notes): count common words.
function guessLang(text) {
  const words = text.toLowerCase().match(/\p{L}+/gu) || [];
  const es = new Set(['que', 'de', 'la', 'el', 'y', 'en', 'los', 'las', 'para', 'con', 'una', 'un', 'por', 'tengo', 'hay', 'mañana', 'hoy', 'llamar', 'no', 'es', 'del', 'al', 'lo', 'se', 'mi', 'necesito']);
  const en = new Set(['the', 'to', 'and', 'of', 'a', 'in', 'for', 'with', 'need', 'tomorrow', 'today', 'call', 'is', 'it', 'on', 'my', 'i', 'have', 'this', 'that']);
  let e = 0, s = 0;
  for (const w of words) { if (es.has(w)) s++; if (en.has(w)) e++; }
  return s > e ? 'es' : 'en';
}

function splitIntoChunks(text, R) {
  const out = [];
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?;])\s+/);
  for (const s of sentences) {
    // Spoken joins: "..., and then call Jim" / "... y luego llamar a Juan"
    for (const part of s.split(R.joins)) {
      // "call Jim, book flights and email Sara": split at a comma / "and" only when
      // what follows starts with an action verb ("salt and pepper" stays whole).
      const tokens = part.split(R.and); // text, sep, text, sep, ...
      let cur = tokens[0];
      for (let i = 1; i < tokens.length; i += 2) {
        const next = tokens[i + 1] || '';
        if (R.verb.test(next.trim())) { out.push(cur); cur = next; } else cur += tokens[i] + next;
      }
      out.push(cur);
    }
  }
  return out.map(s => s.trim()).filter(Boolean);
}

function toActionItem(raw, R, lang) {
  let t = raw.replace(R.filler, '').replace(/\s+/g, ' ').trim();
  let priority = 'normal';
  if (R.urgent.test(t)) { priority = 'high'; t = t.replace(R.urgent, '').trim(); }
  t = t.replace(/^[,.;:¡¿\s]+|[.!?;,\s]+$/g, '').replace(R.tail, '');
  let prev;
  do { // peel stacked lead-ins: "okay so I need to ..." / "bueno, entonces tengo que ..."
    prev = t;
    for (const re of R.leadIns) t = t.replace(re, '');
    t = t.replace(/^[,\s]+/, '').trim();
  } while (t !== prev && t.length);
  if (!t || (t.split(' ').length < 2 && t.length < 4) || R.noise.test(t)) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  let due = null;
  for (const re of R.due) { const m = t.match(re); if (m) { due = m[0].replace(R.dueStrip, ''); break; } }
  return { id: uid(), text: t, done: false, due, priority, lang, created: Date.now() };
}

export function textToActionItems(text, lang) {
  lang = RULES[lang] ? lang : guessLang(text);
  const R = RULES[lang];
  return splitIntoChunks(text, R).map(c => toActionItem(c, R, lang)).filter(Boolean);
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
        <div class="meta"><span>${fmt(n.created)}${n.lang ? ` <span class="tag lang">${n.lang.toUpperCase()}</span>` : ''}</span>
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

function addTranscript(text, lang) {
  text = text.trim();
  if (!text) return;
  if (state.work) {
    addTasks(textToActionItems(text, lang));
    if (state.tab !== 'tasks') return setTab('tasks');
  } else {
    state.notes.unshift({ id: uid(), text, lang, created: Date.now() });
  }
  save(); render();
}

function moveNotesToTasks(ids) {
  const moving = state.notes.filter(n => !ids || ids.includes(n.id));
  if (!moving.length) return;
  state.notes = state.notes.filter(n => !moving.includes(n));
  const items = moving.flatMap(n => textToActionItems(n.text, n.lang).map(i => ({ ...i, created: n.created })));
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
    const { text, lang } = await whisper.transcribe(blob, state.lang, state.lastLang || phoneLang);
    if (text) { state.lastLang = lang; save(); } else toast('Didn’t catch anything');
    transcribing.splice(transcribing.indexOf(job), 1);
    text ? addTranscript(text, lang) : render();
  } catch (err) {
    transcribing.splice(transcribing.indexOf(job), 1);
    render();
    toast('Transcription failed: ' + (err.message || err));
  }
}

mic.onclick = () => (recorder ? stopRecording() : startRecording());

// Language: Auto (detects English or Spanish each time) or fixed.
const langBox = $('langs');
function applyLang() {
  for (const b of langBox.querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.lang === state.lang);
}
langBox.onclick = e => {
  const b = e.target.closest('button[data-lang]'); if (!b) return;
  state.lang = b.dataset.lang; save(); applyLang();
  toast({ auto: 'Auto: detects English or Spanish', en: 'Always English', es: 'Siempre español' }[state.lang]);
};
applyLang();

// ---------- Boot ----------
applyMode();
setTab(state.tab || 'notes');
whisper.warmUp()
  .then(() => { modelReady = true; setHint(); })
  .catch(err => { hint.textContent = 'Speech model failed to load: ' + err.message; });

window.__murmur = { textToActionItems }; // for testing
