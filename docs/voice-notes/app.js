(() => {
  'use strict';

  // ---------- Storage ----------
  const KEY = 'murmur:v1';
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.notes) && Array.isArray(s.tasks)) return s;
    } catch (_) { /* ignore */ }
    return { work: false, notes: [], tasks: [], tab: 'notes' };
  };
  const state = load();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  if (!Array.isArray(state.pending)) state.pending = []; // transcripts waiting for the AI

  // API key lives in its own slot so exports/debugging of state never include it.
  const KEY_SLOT = 'murmur:apikey';
  const getKey = () => { try { return localStorage.getItem(KEY_SLOT) || ''; } catch (_) { return ''; } };
  const setKey = k => { try { k ? localStorage.setItem(KEY_SLOT, k) : localStorage.removeItem(KEY_SLOT); } catch (_) { /* ignore */ } };
  const aiOn = () => !!getKey() && state.ai !== false;
  let aiModule = null;
  const loadAI = () => (aiModule ||= import('./ai.js'));

  // ---------- Transcript -> action items ----------
  const FILLER = /\b(um+|uh+|erm|hmm+|you know|i mean|like,|basically|actually|literally)\b[,]?\s*/gi;
  const LEAD_INS = [
    /^(ok(ay)?|so|and|also|then|well|alright|right|now|oh)[,\s]+/i,
    /^(and\s+)?(then\s+)?/i,
    /^(i|we)\s+(really\s+)?(need|have|got|gotta|must|should|ought)\s+(to\s+)?/i,
    /^(i|we)('m| am| are|'re)\s+(going|gonna)\s+(to\s+)?/i,
    /^(i|we)('ll| will)\s+/i,
    /^(i|we)\s+want\s+to\s+/i,
    /^(i('d| would) like to)\s+/i,
    /^(we|you)\s+(need|have)\s+to\s+/i,
    /^(don'?t|do not)\s+forget\s+(to\s+)?/i,
    /^(remember|remind me)\s+(to\s+)?/i,
    /^(make sure\s+(to|that)?\s*)/i,
    /^(let'?s|lets)\s+/i,
    /^(can|could|would)\s+(you|someone|somebody)\s+(please\s+)?/i,
    /^(please)\s+/i,
    /^(to\s*do|todo|action item|task)[:,\s]+/i,
    /^(gotta|need to|have to|got to)\s+/i,
  ];
  const DUE = [
    /\b(today|tonight|this (morning|afternoon|evening))\b/i,
    /\b(tomorrow( morning| afternoon| night)?)\b/i,
    /\b(by|before|on|next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|weekend|eod|end of (the )?(day|week|month))\b/i,
    /\b(asap|eod|end of (the )?(day|week|month))\b/i,
    /\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?\b/i,
  ];

  function splitIntoChunks(text) {
    return text
      .replace(/\s+/g, ' ')
      // sentence ends, semicolons, and spoken separators become splits
      .split(/(?<=[.!?;])\s+|\s+(?:and then|after that|and also|another thing is)\s+/i)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function toActionItem(raw) {
    let t = raw.replace(FILLER, '').replace(/\s+/g, ' ').trim();
    t = t.replace(/[.!?;,\s]+$/, '');
    let prev;
    do { // peel stacked lead-ins: "okay so I need to ..."
      prev = t;
      for (const re of LEAD_INS) t = t.replace(re, '');
      t = t.trim();
    } while (t !== prev && t.length);
    if (t.split(' ').length < 2 && t.length < 4) return null; // drop noise like "ok"
    t = t.charAt(0).toUpperCase() + t.slice(1);
    let due = null;
    for (const re of DUE) { const m = t.match(re); if (m) { due = m[0].replace(/^(by|before|on)\s+/i, ''); break; } }
    return { id: uid(), text: t, done: false, due, created: Date.now(), source: raw };
  }

  function textToActionItems(text) {
    return splitIntoChunks(text).map(toActionItem).filter(Boolean);
  }

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const main = $('main'), mic = $('mic'), hint = $('hint'), live = $('live');
  const workToggle = $('workToggle'), modeLabel = $('modeLabel');
  const toastEl = $('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  function applyMode() {
    document.body.classList.toggle('work', state.work);
    workToggle.checked = state.work;
    modeLabel.textContent = state.work ? 'Work mode on' : 'Work mode off';
    if (!listening) hint.textContent = state.work ? 'Tap to speak — becomes action items' : 'Tap to start talking';
  }

  function setTab(tab) {
    state.tab = tab; save();
    $('tab-notes').setAttribute('aria-selected', tab === 'notes');
    $('tab-tasks').setAttribute('aria-selected', tab === 'tasks');
    render();
  }

  function render() {
    $('notesCount').textContent = state.notes.length;
    $('tasksCount').textContent = state.tasks.filter(t => !t.done).length;

    if (state.tab === 'notes') {
      if (!state.notes.length) { main.innerHTML = '<p class="empty">No transcripts yet.<br>Tap the mic and start talking.</p>'; return; }
      const tools = `<div class="toolbar">
        ${state.work ? '<button data-act="move-all">Move all to action items</button>' : ''}
        <button data-act="copy-notes">Copy all</button>
      </div>`;
      main.innerHTML = tools + '<ul class="list">' + state.notes.map(n => `
        <li class="card note" data-id="${n.id}">
          <div class="meta"><span>${fmt(n.created)}</span>
            <span><button class="linkish" data-act="to-tasks">→ Action items</button>
            <button class="icon-btn" data-act="del-note" aria-label="Delete">×</button></span></div>
          <p>${esc(n.text)}</p>
        </li>`).join('') + '</ul>';
    } else {
      const pendingHtml = state.pending.map(p => `
        <li class="card pending"><span class="spinner"></span>
          <div class="body"><div class="label">Organizing with AI…</div><div class="src">${esc(p.text)}</div></div></li>`).join('');
      if (!state.tasks.length && !state.pending.length) {
        main.innerHTML = `<p class="empty">No action items yet.<br>Turn on <b>Work mode</b> and start talking.</p>`; return;
      }
      const open = state.tasks.filter(t => !t.done), done = state.tasks.filter(t => t.done);
      const tools = `<div class="toolbar">
        <button data-act="share-tasks">Share</button>
        ${done.length ? '<button data-act="clear-done">Clear done</button>' : ''}
      </div>`;
      main.innerHTML = tools + '<ul class="list">' + pendingHtml + [...open, ...done].map(t => `
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

  function pushTasks(items) {
    state.tasks.unshift(...items); // newest batch on top, in spoken order
    toast(items.length ? `+${items.length} action item${items.length > 1 ? 's' : ''}` : 'Nothing actionable found');
  }

  // Turn one transcript into action items: AI when configured, rules otherwise.
  // The transcript sits in state.pending (persisted) until it has been processed,
  // so nothing is lost if the app is closed mid-request.
  let working = false;
  async function processPending() {
    if (working) return;
    working = true;
    try {
      while (state.pending.length) {
        const p = state.pending[state.pending.length - 1]; // oldest first
        let items = null, failMsg = null;
        if (aiOn()) {
          if (!navigator.onLine) break; // keep it queued; retried when back online
          try {
            const ai = await loadAI();
            const open = state.tasks.filter(t => !t.done).map(t => t.text);
            items = (await ai.organize(getKey(), p.text, open)).map(i => ({
              id: uid(), text: i.text, done: false, due: i.due || null, priority: i.priority,
              created: p.created, source: p.text, ai: true,
            }));
          } catch (err) {
            const ai = await loadAI().catch(() => null);
            failMsg = (ai ? ai.describeError(err) : 'AI unavailable') + ' — used basic mode';
          }
        }
        if (!items) items = textToActionItems(p.text).map(i => ({ ...i, created: p.created }));
        state.pending = state.pending.filter(x => x !== p);
        pushTasks(items);
        if (failMsg) toast(failMsg);
        save(); render();
      }
    } finally {
      working = false;
    }
  }

  function queueForTasks(text, created = Date.now()) {
    state.pending.unshift({ id: uid(), text, created });
    save();
    if (state.tab !== 'tasks') setTab('tasks'); else render();
    processPending();
  }

  function addTranscript(text) {
    text = text.trim();
    if (!text) return;
    if (state.work) return queueForTasks(text);
    state.notes.unshift({ id: uid(), text, created: Date.now() });
    save(); render();
  }

  function moveNotesToTasks(ids) {
    const moving = state.notes.filter(n => !ids || ids.includes(n.id));
    if (!moving.length) return;
    state.notes = state.notes.filter(n => !moving.includes(n));
    // One request for the batch so the AI can merge overlapping notes.
    const text = moving.slice().reverse().map(n => n.text).join('\n\n');
    queueForTasks(text, moving[0].created);
  }

  async function shareOrCopy(text, title) {
    if (navigator.share) {
      try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('Copied'); } catch (_) { toast('Copy failed'); }
  }

  main.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const li = el.closest('li'), id = li && li.dataset.id, act = el.dataset.act;
    if (act === 'del-note') { state.notes = state.notes.filter(n => n.id !== id); save(); render(); }
    else if (act === 'to-tasks') moveNotesToTasks([id]);
    else if (act === 'move-all') moveNotesToTasks(null);
    else if (act === 'copy-notes') shareOrCopy(state.notes.map(n => `${fmt(n.created)}\n${n.text}`).join('\n\n'), 'Transcripts');
    else if (act === 'del-task') { state.tasks = state.tasks.filter(t => t.id !== id); save(); render(); }
    else if (act === 'toggle') { const t = state.tasks.find(t => t.id === id); if (t) { t.done = el.checked; save(); render(); } }
    else if (act === 'clear-done') { state.tasks = state.tasks.filter(t => !t.done); save(); render(); }
    else if (act === 'share-tasks') {
      const open = state.tasks.filter(t => !t.done);
      shareOrCopy(open.map(t => `☐ ${t.text}${t.due ? ` (${t.due})` : ''}`).join('\n'), 'Action items');
    }
  });
  main.addEventListener('focusout', e => {
    if (e.target.dataset.act !== 'edit') return;
    const id = e.target.closest('li').dataset.id, t = state.tasks.find(t => t.id === id);
    const v = e.target.textContent.trim();
    if (!t) return;
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

  // ---------- Speech recognition ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, finalBuf = '', interimBuf = '';

  function showLive() {
    live.classList.toggle('show', listening);
    live.innerHTML = esc(finalBuf) + ' <span class="interim">' + esc(interimBuf) + '</span>';
    live.scrollTop = live.scrollHeight;
  }

  function flush() {
    const text = (finalBuf + ' ' + interimBuf).trim();
    finalBuf = ''; interimBuf = '';
    if (text) addTranscript(text);
  }

  function start() {
    if (!SR) return;
    rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = e => {
      interimBuf = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += (finalBuf ? ' ' : '') + r[0].transcript.trim();
        else interimBuf += r[0].transcript;
      }
      showLive();
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast('Microphone permission denied'); stop();
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        toast('Speech error: ' + e.error);
      }
    };
    // Mobile browsers end sessions on silence; keep going until the user taps stop.
    rec.onend = () => {
      if (listening) { try { rec.start(); } catch (_) { stop(); } }
    };
    try { rec.start(); } catch (_) { return; }
    listening = true;
    mic.classList.add('rec'); mic.setAttribute('aria-label', 'Stop recording');
    hint.textContent = state.work ? 'Listening… tap to turn into action items' : 'Listening… tap to stop';
    showLive();
  }

  function stop() {
    listening = false;
    if (rec) { rec.onend = null; try { rec.stop(); } catch (_) { /* ignore */ } }
    // give the engine a moment to deliver its last final result
    setTimeout(() => { flush(); showLive(); }, 350);
    mic.classList.remove('rec'); mic.setAttribute('aria-label', 'Start recording');
    applyMode();
  }

  mic.onclick = () => {
    if (!SR) { $('typed').focus(); return; }
    listening ? stop() : start();
  };

  if (!SR) {
    $('typebox').classList.add('show');
    hint.textContent = 'Voice input needs Chrome (Android) or Safari (iPhone)';
  }
  $('typedSend').onclick = () => { addTranscript($('typed').value); $('typed').value = ''; };

  document.addEventListener('visibilitychange', () => { if (document.hidden && listening) stop(); });

  // ---------- Settings ----------
  const dlg = $('settings'), keyInput = $('apiKey'), aiToggle = $('aiToggle'), aiStatus = $('aiStatus');
  function refreshAIStatus() {
    const k = getKey();
    aiStatus.textContent = !k ? 'Basic' : state.ai === false ? 'AI paused' : 'AI on';
    aiStatus.className = 'ai-pill ' + (aiOn() ? 'on' : '');
  }
  $('settingsBtn').onclick = () => {
    keyInput.value = getKey();
    aiToggle.checked = state.ai !== false;
    dlg.showModal();
  };
  $('saveKey').onclick = e => {
    e.preventDefault();
    const k = keyInput.value.trim();
    if (k && !/^sk-ant-/.test(k)) { toast('That doesn’t look like an Anthropic key (sk-ant-…)'); return; }
    setKey(k);
    state.ai = aiToggle.checked; save();
    dlg.close(); refreshAIStatus();
    toast(k ? (state.ai ? 'AI action items on' : 'Key saved, AI paused') : 'Key removed');
    if (k) loadAI().catch(() => {});
    processPending();
  };
  $('removeKey').onclick = e => { e.preventDefault(); keyInput.value = ''; };
  $('closeSettings').onclick = e => { e.preventDefault(); dlg.close(); };
  aiStatus.onclick = () => $('settingsBtn').click();
  window.addEventListener('online', processPending);

  // ---------- Boot ----------
  applyMode();
  refreshAIStatus();
  setTab(state.tab || 'notes');
  processPending();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  window.__murmur = { textToActionItems }; // for testing
})();
