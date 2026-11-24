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
  if (!state.whisper) state.whisper = { always: false, size: 'base' }; // offline speech-to-text
  const transcribing = []; // recordings being transcribed on-device (in memory only)
  let whisperMod = null, whisperReady = false, dl = null; // dl: download progress {loaded,total}
  const loadWhisper = () => (whisperMod ||= import('./whisper.js'));

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
    if (!listening) {
      const dev = useWhisper() ? ' (on-device)' : '';
      hint.textContent = (state.work ? 'Tap to speak — becomes action items' : 'Tap to start talking') + dev;
    }
  }

  function setTab(tab) {
    state.tab = tab; save();
    $('tab-notes').setAttribute('aria-selected', tab === 'notes');
    $('tab-tasks').setAttribute('aria-selected', tab === 'tasks');
    render();
  }

  function transcribingHtml() {
    return transcribing.map(() => {
      const pct = dl && dl.total ? Math.round(dl.loaded / dl.total * 100) : null;
      const label = dl ? `Downloading offline model… ${pct ?? 0}%` : 'Transcribing on device…';
      const sub = dl ? `${(dl.loaded / 1e6).toFixed(0)} / ${(dl.total / 1e6).toFixed(0)} MB — one-time download` : 'Whisper is running on your phone';
      return `<li class="card pending"><span class="spinner"></span>
        <div class="body"><div class="label">${label}</div><div class="src">${sub}</div>
        ${dl ? `<div class="bar"><i style="width:${pct ?? 0}%"></i></div>` : ''}</div></li>`;
    }).join('');
  }

  // Batches of items that were made with the basic rules because the AI was unreachable.
  function redoBatches() {
    const groups = new Map();
    for (const t of state.tasks) if (t.basicBatch) {
      if (!groups.has(t.basicBatch)) groups.set(t.basicBatch, []);
      groups.get(t.basicBatch).push(t);
    }
    return [...groups.values()].filter(g => g.every(t => !t.done));
  }

  function render() {
    $('notesCount').textContent = state.notes.length;
    $('tasksCount').textContent = state.tasks.filter(t => !t.done).length;

    if (state.tab === 'notes') {
      if (!state.notes.length && !transcribing.length) { main.innerHTML = '<p class="empty">No transcripts yet.<br>Tap the mic and start talking.</p>'; return; }
      const tools = `<div class="toolbar">
        ${state.work ? '<button data-act="move-all">Move all to action items</button>' : ''}
        <button data-act="copy-notes">Copy all</button>
      </div>`;
      main.innerHTML = tools + '<ul class="list">' + transcribingHtml() + state.notes.map(n => `
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
      if (!state.tasks.length && !state.pending.length && !transcribing.length) {
        main.innerHTML = `<p class="empty">No action items yet.<br>Turn on <b>Work mode</b> and start talking.</p>`; return;
      }
      const open = state.tasks.filter(t => !t.done), done = state.tasks.filter(t => t.done);
      const redo = aiOn() && navigator.onLine ? redoBatches() : [];
      const redoCount = redo.reduce((n, g) => n + g.length, 0);
      const tools = `<div class="toolbar">
        ${redoCount ? `<button data-act="redo-ai" class="ai-btn">✨ Redo ${redoCount} offline item${redoCount > 1 ? 's' : ''} with AI</button>` : ''}
        <button data-act="share-tasks">Share</button>
        ${done.length ? '<button data-act="clear-done">Clear done</button>' : ''}
      </div>`;
      main.innerHTML = tools + '<ul class="list">' + transcribingHtml() + pendingHtml + [...open, ...done].map(t => `
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
        let items = null, failMsg = null, basicBatch = null;
        if (aiOn() && !navigator.onLine) {
          basicBatch = p.id; // offline: use the rules now, offer an AI redo once back online
        } else if (aiOn()) {
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
            basicBatch = p.id;
          }
        }
        if (!items) items = textToActionItems(p.text).map(i => ({ ...i, created: p.created, ...(basicBatch && { basicBatch, source: p.text }) }));
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
    else if (act === 'redo-ai') {
      for (const g of redoBatches()) {
        state.tasks = state.tasks.filter(t => !g.includes(t));
        state.pending.unshift({ id: uid(), text: g[0].source, created: g[0].created });
      }
      save(); render(); processPending();
    }
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

  // ---------- Offline Whisper ----------
  const canRecord = !!(navigator.mediaDevices && window.MediaRecorder);
  // Whisper when asked for, when the device is offline (live recognition needs a
  // connection), or when the browser has no live recognition at all.
  function useWhisper() {
    if (!canRecord) return false;
    return state.whisper.always || !SR || (!navigator.onLine && whisperReady);
  }

  let recorder = null, timer = null;
  async function startWhisper() {
    if (!navigator.onLine && !whisperReady) {
      toast('Offline model not downloaded yet — get it in Settings while online'); return;
    }
    const w = await loadWhisper();
    recorder = new w.Recorder();
    try { await recorder.start(); } catch (_) { recorder = null; toast('Microphone permission denied'); return; }
    listening = true;
    mic.classList.add('rec'); mic.setAttribute('aria-label', 'Stop recording');
    hint.textContent = 'Recording on device… tap to stop';
    live.classList.add('show');
    const tick = () => {
      const s = Math.floor((Date.now() - recorder.startedAt) / 1000);
      live.innerHTML = `<span class="rec-dot"></span> Recording ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}
        <span class="interim">— words appear after you stop</span>`;
    };
    tick(); timer = setInterval(tick, 500);
  }

  async function stopWhisper() {
    listening = false;
    clearInterval(timer);
    live.classList.remove('show');
    mic.classList.remove('rec'); mic.setAttribute('aria-label', 'Start recording');
    applyMode();
    const r = recorder; recorder = null;
    if (!r) return;
    const blob = await r.stop();
    const job = {};
    transcribing.push(job);
    if (state.work && state.tab !== 'tasks') setTab('tasks'); else render();
    try {
      const w = await loadWhisper();
      if (!whisperReady && !(await w.isCached(state.whisper.size))) dl = { loaded: 0, total: 0 };
      const text = await w.transcribe(blob, state.whisper.size);
      whisperReady = true;
      transcribing.splice(transcribing.indexOf(job), 1);
      dl = null;
      if (text) addTranscript(text); else { toast('Didn’t catch anything'); render(); }
    } catch (err) {
      transcribing.splice(transcribing.indexOf(job), 1);
      dl = null; render();
      toast('Transcription failed: ' + (err.message || err));
    }
  }

  mic.onclick = () => {
    if (listening) return recorder ? stopWhisper() : stop();
    if (useWhisper()) return startWhisper();
    if (!SR) { $('typed').focus(); return; }
    start();
  };

  if (!SR && !canRecord) {
    $('typebox').classList.add('show');
    hint.textContent = 'Voice input needs Chrome (Android) or Safari (iPhone)';
  }
  $('typedSend').onclick = () => { addTranscript($('typed').value); $('typed').value = ''; };

  // Live recognition dies in the background; a Whisper recording can keep going.
  document.addEventListener('visibilitychange', () => { if (document.hidden && listening && !recorder) stop(); });

  // ---------- Settings ----------
  const dlg = $('settings'), keyInput = $('apiKey'), aiToggle = $('aiToggle'), aiStatus = $('aiStatus');
  function refreshAIStatus() {
    const k = getKey();
    aiStatus.textContent = !k ? 'Basic' : state.ai === false ? 'AI paused' : 'AI on';
    aiStatus.className = 'ai-pill ' + (aiOn() ? 'on' : '');
  }
  const wAlways = $('whisperAlways'), wSize = $('whisperSize'), wStatus = $('whisperStatus'), wBtn = $('whisperDownload');
  async function refreshWhisperStatus() {
    const w = await loadWhisper().catch(() => null);
    const size = wSize.value;
    const cached = w ? await w.isCached(size) : false;
    if (size === state.whisper.size) whisperReady = cached;
    if (dl && wBtn.disabled) return; // download in progress: progress handler owns the text
    wStatus.textContent = cached ? '✓ Downloaded — works with no connection' : 'Not downloaded yet';
    wStatus.className = 'w-status ' + (cached ? 'ok' : '');
    wBtn.hidden = cached;
  }
  wSize.onchange = refreshWhisperStatus;
  wBtn.onclick = async e => {
    e.preventDefault();
    if (!navigator.onLine) { toast('Connect to the internet to download'); return; }
    wBtn.disabled = true; dl = { loaded: 0, total: 0 };
    wStatus.textContent = 'Starting download…';
    try {
      const w = await loadWhisper();
      await w.download(wSize.value);
      toast('Offline model ready');
    } catch (err) {
      toast('Download failed: ' + (err.message || err));
    } finally {
      dl = null; wBtn.disabled = false;
      refreshWhisperStatus(); render();
    }
  };
  loadWhisper().then(w => w.onProgress(p => {
    dl = { loaded: p.loaded, total: p.total };
    const pct = p.total ? Math.round(p.loaded / p.total * 100) : 0;
    if (dlg.open && wBtn.disabled) wStatus.textContent = `Downloading… ${pct}% (${(p.loaded / 1e6).toFixed(0)} / ${(p.total / 1e6).toFixed(0)} MB)`;
    if (transcribing.length) render();
  })).catch(() => {});

  $('settingsBtn').onclick = () => {
    keyInput.value = getKey();
    aiToggle.checked = state.ai !== false;
    wAlways.checked = !!state.whisper.always;
    wSize.value = state.whisper.size;
    wAlways.disabled = wSize.disabled = !canRecord;
    refreshWhisperStatus();
    dlg.showModal();
  };
  $('saveKey').onclick = e => {
    e.preventDefault();
    const k = keyInput.value.trim();
    if (k && !/^sk-ant-/.test(k)) { toast('That doesn’t look like an Anthropic key (sk-ant-…)'); return; }
    setKey(k);
    state.ai = aiToggle.checked;
    if (wSize.value !== state.whisper.size) whisperReady = false;
    state.whisper = { always: wAlways.checked, size: wSize.value };
    save(); applyMode(); refreshWhisperStatus();
    dlg.close(); refreshAIStatus();
    toast(k ? (state.ai ? 'Saved — AI action items on' : 'Saved — AI paused') : 'Saved');
    if (k) loadAI().catch(() => {});
    processPending();
  };
  $('removeKey').onclick = e => { e.preventDefault(); keyInput.value = ''; };
  $('closeSettings').onclick = e => { e.preventDefault(); dlg.close(); };
  aiStatus.onclick = () => $('settingsBtn').click();
  window.addEventListener('online', () => { processPending(); applyMode(); render(); });
  window.addEventListener('offline', () => { applyMode(); render(); });

  // ---------- Boot ----------
  loadWhisper().then(w => w.isCached(state.whisper.size)).then(c => { whisperReady = c; applyMode(); }).catch(() => {});
  applyMode();
  refreshAIStatus();
  setTab(state.tab || 'notes');
  processPending();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  window.__murmur = { textToActionItems }; // for testing
})();
