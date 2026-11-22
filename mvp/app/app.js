/* The NowAI live workspace's screen. It runs the example morning on a clock, sends what arrives to the AI reader,
   hands what was read to the engine, and draws the result: incoming work, the seven roles, the roles' messages to
   each other, the Gate, and a drawer with each item's evidence. Nothing here decides anything: the engine does.
   English, Azerbaijani and Russian (i18n.js). Cards that did not change are kept as they are between redraws, so a
   card under the pointer never flickers. */
(function () {
  'use strict';
  const E = window.NOWAI_ENGINE, W = window.NOWAI_WORLD, AI = window.NOWAI_AI, I = window.NOWAI_I18N;
  const $ = s => document.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const SPEEDS = { slow: 3000, normal: 1500, fast: 350 };   // real milliseconds per minute of the example clock
  const END = E.toMin('09:15');
  let st, speed = 'normal', playing = false, timer = null, acting = 'all', drawer = null, started = false;
  const seen = new Set(), seals = [], sealQ = []; let sealing = false;
  const fileBlobs = {}, blobUrls = {};   // live items' dropped files, for the drawer
  const blobUrl = id => blobUrls[id] || (blobUrls[id] = URL.createObjectURL(fileBlobs[id]));
  const beamQ = []; let beaming = false, focusKey = null, focusRef = null, pinned = false;   // focusRef: the card under the pointer; its case is worked out on every draw
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ language
  let lang = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    let s = null; try { s = localStorage.getItem('nowai-lang'); } catch (e) { /* private window */ }
    return I.LANGS.includes(q) ? q : I.LANGS.includes(s) ? s : 'en';
  })();
  const t = (k, p) => I.ui(lang, k, p), tr = s => I.tr(lang, s), N = s => I.loc(lang, s);
  const F = (x, d) => I.num(lang, E.fmt(x, d));
  const low = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const jobOf = p => low(I.job(lang, p.job));
  function applyStatic() {
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i]')) el.textContent = t(el.dataset.i);
    for (const el of document.querySelectorAll('[data-ip]')) el.placeholder = t(el.dataset.ip);
    for (const el of document.querySelectorAll('[data-it]')) el.title = t(el.dataset.it);
    for (const b of document.querySelectorAll('#langSw button')) b.classList.toggle('on', b.dataset.l === lang);
    fillSelects();
  }
  function setLang(l) {
    if (!I.LANGS.includes(l) || l === lang) return;
    lang = l; try { localStorage.setItem('nowai-lang', l); } catch (e) { /* fine */ }
    kept.clear(); lastDrawer = ''; applyStatic(); schedule();
  }

  // ------------------------------------------------------------ the day
  function newDay() {
    pause(); st = E.createDay(W, { start: '07:30' }); seen.clear(); seals.length = 0; sealQ.length = 0; kept.clear();
    st.listeners.push(ev => { if (ev.type === 'record') { sealQ.push(ev.entry); sealNext(); } if (ev.type === 'message') beamQ.push(ev.msg); schedule(); });
    beamQ.length = 0; focusKey = null; focusRef = null; pinned = false;
    st.record.forEach(e => sealQ.push(e)); sealNext();
    started = false; closeDrawer(); render();
  }
  function tick() {
    if (!playing) return;
    st.clock = Math.min(END, st.clock + 1);
    E.advanceTo(st, st.clock).forEach(read);
    if (st.clock >= END) pause();
    schedule();
  }
  function play() { if (playing) return; started = true; playing = true; timer = setInterval(tick, SPEEDS[speed]); schedule(); }
  function pause() { playing = false; clearInterval(timer); timer = null; schedule(); }
  function nextEvent() {
    started = true;
    const next = W.morning.filter(e => !st.released.includes(e.id)).sort((x, y) => E.toMin(x.at) - E.toMin(y.at))[0];
    if (!next) return;
    st.clock = Math.max(st.clock, E.toMin(next.at));
    E.advanceTo(st, st.clock).forEach(read); schedule();
  }
  async function read(it) {
    it.fromName = E.fromName(st, it.from);
    if (fileBlobs[it.id]) it.fileBlob = fileBlobs[it.id];
    schedule();
    const r = await AI.read(it);
    if (!st.items.includes(it)) return;   // the day was reset while it was reading
    E.applyReading(st, it.id, r.reading, { ms: r.ms, by: r.by });
    schedule();
  }

  // ------------------------------------------------------------ the Record's seals: SHA-256 of the last seal and the line (English, whatever the screen shows)
  const canon = v => JSON.stringify(v, Object.keys(v).sort());
  async function sha(text) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function sealNext() {
    if (sealing || !sealQ.length || !(window.crypto && crypto.subtle)) return;
    sealing = true;
    const day = st;
    while (sealQ.length) {
      const e = sealQ.shift(), prev = seals.length ? seals[seals.length - 1] : '';
      const s = await sha(prev + '\n' + canon({ n: e.n, at: e.at, by: e.by, action: e.action, text: e.text }));
      if (day !== st) break;
      seals.push(s);
    }
    sealing = false; schedule();
  }
  async function verify() {
    let prev = '', bad = 0;
    for (let i = 0; i < st.record.length && i < seals.length; i++) {
      const e = st.record[i], s = await sha(prev + '\n' + canon({ n: e.n, at: e.at, by: e.by, action: e.action, text: e.text }));
      if (s !== seals[i]) { bad = i + 1; break; }
      prev = s;
    }
    return bad;
  }

  // ------------------------------------------------------------ drawing without flicker
  // A redraw builds each card afresh, but keeps the card already on screen if it would look the same, and puts
  // children back only when the list really changed. A new card is born with its highlight, never animated into it.
  const kept = new Map();
  function keep(key, node, lit, isNew) {
    const html = node.outerHTML, old = kept.get(key);
    let use = node;
    if (old && old.html === html) use = old.node; else { kept.set(key, { html, node }); if (isNew) node.classList.add('new'); }
    use.classList.toggle('lit', !!lit);
    return use;
  }
  function setKids(parent, nodes) {
    const cur = parent.children;
    if (cur.length === nodes.length && nodes.every((n, i) => cur[i] === n)) return;
    parent.replaceChildren(...nodes);
  }
  const litKey = k => !!focusKey && k === focusKey;
  const litKeys = ks => !!focusKey && ks.split(' ').includes(focusKey);

  let frame = 0;
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); }); }
  const people = Object.fromEntries(W.people.map(p => [p.id, p]));
  const chanIcon = {
    whatsapp: ['wa', 'M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5z', true],
    email: ['em', 'M2 3.5h12v9H2zM2.5 4l5.5 4.5L13.5 4', false],
    voice: ['vo', 'M3 9v-2M5.5 11V5M8 13V3M10.5 11V5M13 9V7', false],
    file: ['bk', 'M4 2h6l3 3v9H4zM6 8h5M6 11h5', false],
    staff: ['st', 'M6 7.8a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM2 13c.6-2.4 2.2-3.6 4-3.6s3.4 1.2 4 3.6M11 4.5h3M11 7h3', false]
  };
  function icon(ch) {
    const [cls, d, fill] = chanIcon[ch] || chanIcon.file;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    svg.setAttribute('viewBox', '0 0 16 16'); p.setAttribute('d', d);
    if (fill) p.setAttribute('fill', 'currentColor'); else { p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.5'); p.setAttribute('stroke-linecap', 'round'); }
    svg.append(p); return h('div', { class: 'ic ' + cls }, svg);
  }
  const roleOf = rid => (W.roles.find(r => r.id === rid) || {}).name || '';
  const roleL = rid => I.role(lang, roleOf(rid));

  function render() {
    if (!st) return;
    if (focusRef) focusKey = caseKey(focusRef);   // a message read into a case keeps its highlight
    renderHeader(); renderIncoming(); renderTiles(); renderRoles(); renderTalk(); renderGate(); renderFoot(); renderStart();
    if (drawer) drawer();
    applyFocus(); runBeams();
  }

  function renderHeader() {
    const chip = $('#aiChip'), status = AI.status;
    chip.className = 'live' + (status === 'mock' ? ' mock' : status === 'live' ? '' : ' off');
    const label = status === 'live' ? t('liveAI') + (AI.busy ? ' · ' + t('nowN', { n: AI.busy }) : '') : status === 'mock' ? t('testMode') : status === 'checking' ? t('connecting') : t('aiOff');
    if (chip.textContent !== label) chip.replaceChildren(h('i'), label);
    $('#clockT').textContent = E.toHHMM(st.clock);
    const p = $('#play'), pl = playing ? t('pause') : (started ? t('resume') : t('start'));
    if (p.textContent !== pl) p.textContent = pl;
    p.classList.toggle('on', playing);
    $('#speed').value = speed; $('#acting').value = acting;
  }
  function fillSelects() {
    const sel = $('#acting');
    sel.replaceChildren(h('option', { value: 'all' }, t('everyone')), ...W.people.map(p => h('option', { value: p.id }, N(p.name) + ' · ' + jobOf(p))));
    sel.value = acting;
    const snd = $('#sender'), was = snd.value;
    const senders = [...W.customers.filter(c => ['zaur', 'sebuhi', 'ferid', 'cavid', 'kenan'].includes(c.id)).map(c => [c.id, N(c.name) + ' · ' + N(c.where), 'whatsapp']),
      ...W.suppliers.map(s => [s.id, s.name + ' · ' + t('supplierLbl'), 'email']), ...W.staff.slice(0, 2).map(s => [s.id, N(s.name) + ' · ' + low(I.job(lang, s.job)), 'staff'])];
    snd.replaceChildren(...senders.map(([v, label, ch]) => h('option', { value: v, 'data-ch': ch }, label)));
    if (was) snd.value = was;
  }

  function stTag(s) { const k = 'st_' + s; const v = t(k); return v === k ? s : v; }
  function itemTags(it) {
    const tags = [];
    if (it.status === 'reading') tags.push(h('span', { class: 'tag n' }, it.read ? t('tagReading') : t('tagArrived')));
    if (it.status === 'failed') tags.push(h('span', { class: 'tag g' }, t('tagFailed')));
    if (it.role) tags.push(h('span', { class: 'tag' }, roleL(it.role)));
    const cs = it.caseId && st.cases[it.caseId];
    if (cs) {
      const g = st.gate.find(x => x.ref === cs.id && x.status === 'waiting');
      if (g) tags.push(h('span', { class: 'tag g' }, t('tagGate', { name: N(people[g.who].name) })));
      else if (cs.type === 'order') tags.push(h('span', { class: 'tag' }, cs.status === 'confirmed' ? t('tagOrder', { x: F(cs.total) }) : cs.status === 'waiting-payment' ? t('tagWaits', { x: F(cs.partAmount, 0) }) : stTag(cs.status)));
      else if (cs.type === 'supplier-invoice') tags.push(h('span', { class: 'tag' + (cs.held ? ' g' : '') }, cs.status === 'held' ? t('tagHeld', { x: F(cs.held) }) : cs.status === 'accepted' ? t('tagAccepted') : t('tagChecked')));
      else if (cs.type === 'damage') tags.push(h('span', { class: 'tag' }, cs.status === 'credited' ? t('tagCredit', { x: F(cs.gross) }) : stTag(cs.status)));
      else if (cs.type === 'leave') tags.push(h('span', { class: 'tag' }, stTag(cs.status)));
    }
    if (it.channel === 'file' && it.from === 'bank') tags.push(h('span', { class: 'tag n' }, t('tagBooks', { a: st.bank.matched.length, b: W.bank.lines.length })));
    const promise = it.role === 'collections' && st.customers[it.from] && st.customers[it.from].promises.length;
    if (promise) tags.push(h('span', { class: 'tag' }, t('tagPromise')));
    if (it.readMs) tags.push(h('span', { class: 'tag n' }, (it.readBy === 'the AI reader' ? t('tagAI') : /answer key/.test(it.readBy || '') ? t('tagKey') : t('tagBy', { x: it.readBy })) + ' · ' + I.num(lang, (it.readMs / 1000).toFixed(1)) + ' s'));
    return tags;
  }
  function renderIncoming() {
    const feed = $('#feed'), atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
    const items = st.items;
    $('#inCount').textContent = items.length ? t('soFar', { n: items.length }) : t('nothingYet');
    setKids(feed, items.length ? items.map(it => {
      const isNew = !seen.has(it.id); seen.add(it.id);
      const key = caseKey(it.id), who = N(E.fromName(st, it.from)), text = it.subject || it.text || (it.file ? t('aFile') : '');
      const img = /\.(jpe?g|png)$/i.test(it.file || '') ? it.file : it.photo ? it.photo : (fileBlobs[it.id] && fileBlobs[it.id].type.startsWith('image/') ? blobUrl(it.id) : null);
      const node = h('button', { class: 'it' + (it.status === 'reading' ? ' reading' : ''), 'data-key': key, 'data-ref': it.id, onclick: () => openItem(it.id), title: t('openEvidence') },
        icon(it.channel),
        h('div', {}, h('div', { class: 'top' }, h('b', {}, who), h('time', {}, it.at)),
          h('p', {}, (it.channel === 'voice' ? t('voiceNote') + ' ' + (it.seconds ? '0:' + String(it.seconds).padStart(2, '0') : '') + ' · ' : '') + (text.length > 90 ? text.slice(0, 88) + '…' : text)),
          img ? h('img', { class: 'thumb', src: img, alt: t('photoAlt') }) : null,
          h('div', {}, itemTags(it))));
      return keep('it:' + it.id, node, litKey(key), isNew);
    }) : [keep('it:empty', h('div', { class: 'empty' }, t('emptyIncoming')))]);
    if (atBottom) feed.scrollTop = feed.scrollHeight;
  }

  function renderTiles() {
    const m = E.metrics(st);
    const tile = (k, v, s, warn) => keep('tile:' + k, h('div', { class: 'tile' + (warn ? ' g' : '') }, h('span', {}, k), h('b', {}, v), h('small', {}, s)));
    setKids($('#tiles'), [
      tile(t('tArrived'), String(m.arrived), t('tArrivedSub')),
      tile(t('tDone'), String(m.done), m.withPerson ? t('ofN', { n: m.arrived }) + ' · ' + t('withPerson', { n: m.withPerson }) : m.arrived ? t('ofN', { n: m.arrived }) + ' · ' + t('checkedDrafted') : t('checkedDrafted')),
      tile(t('tGate'), String(m.waiting), m.waiting ? t('forPeople', { n: m.waitingFor.length }) : t('nothingWaiting'), m.waiting > 0),
      tile(t('tHeld'), F(m.held, m.held % 1 ? 2 : 0) + ' AZN', t('aboveAgreed'), m.held > 0),
      tile(t('tCredit'), t('nOver', { n: m.dealersOver.length }), t('ofDealers', { n: m.dealers }), m.dealersOver.length > 0)]);
  }

  function roleFigure(rid) {
    const cases = Object.values(st.cases).filter(c => c.role === rid), last = cases[cases.length - 1];
    if (rid === 'sales') { const o = cases.filter(c => c.type === 'order').pop(); return o ? F(o.total) + ' AZN' : '—'; }
    if (rid === 'collections') { const o = Object.values(st.cases).filter(c => c.type === 'order').pop(); if (o) { const c = st.customers[o.customer]; return F(E.balance(c), 0) + ' / ' + F(c.limit, 0); } return cases.length ? t('figOverdue', { n: cases.length }) : '—'; }
    if (rid === 'payables') { const held = st.holds.filter(x => x.status === 'held').reduce((s, x) => s + x.amount, 0); return held ? t('figHeld', { x: F(held, held % 1 ? 2 : 0) }) : (cases.length ? t('figChecked', { n: cases.length }) : '—'); }
    if (rid === 'care') return last && last.value != null ? F(last.value) + ' AZN' : '—';
    if (rid === 'books') return st.bank.cashIn ? t('figOf', { a: st.bank.matched.length, b: W.bank.lines.length }) : '—';
    if (rid === 'people') return cases.length ? t('figReq', { n: cases.length }) : '—';
    return '';
  }
  function roleLine(rid) {
    const name = roleOf(rid), e = [...st.record].reverse().find(x => x.by === name);
    const r = W.roles.find(x => x.id === rid), s = e ? tr(e.text) : I.does(lang, rid, r.does) + '.';
    return s.length > 120 ? s.slice(0, 118) + '…' : s;
  }
  function renderRoles() {
    const out = [];
    for (const r of W.roles) {
      const v = E.roleView(st, r.id), reading = v.items.some(i => i.status === 'reading');
      const status = v.gate.length ? [t('bGate'), ' g'] : reading ? [t('bReading'), ''] : null;   // a badge only when it matters
      if (r.id === 'brief') {
        const b = E.brief(st);
        out.push(keep('role:brief', h('button', { class: 'role brief' + (st.items.length ? ' busy' : ''), onclick: openBrief },
          h('div', { class: 'rh' }, h('span', { class: 'dot' }), h('b', {}, I.role(lang, r.name)), h('span', { class: 'st2' }, t('forAysel'))),
          h('div', { class: 'lg', style: 'font-size:12.5px' }, b.lines.map((l, i) => [i ? ' · ' : '', tr(l.k) + ' ', h('b', {}, tr(l.v))])),
          h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.min(100, 12 * st.items.length) + '%' })))));
        continue;
      }
      const keys = roleKeys(r.id);
      out.push(keep('role:' + r.id, h('button', { class: 'role' + (v.busy || v.items.length ? ' busy' : ' idle'), 'data-role': r.id, 'data-keys': keys, onclick: () => openRole(r.id) },
        h('div', { class: 'rh' }, h('span', { class: 'dot' }), h('b', {}, I.role(lang, r.name))),
        h('div', { class: 'big' }, h('span', { class: 'fig' }, roleFigure(r.id)), status ? h('span', { class: 'st2' + status[1] }, status[0]) : null), h('div', { class: 'lg' }, roleLine(r.id)),
        h('div', { class: 'bar' }, h('i', { class: v.gate.length ? 'w' : '', style: 'width:' + (v.items.length || v.cases.length ? (v.gate.length ? 66 : 100) : 0) + '%' }))), litKeys(keys)));
    }
    setKids($('#roles'), out);
  }

  const msgNode = m => h('div', { class: 'm', 'data-key': caseKey(m.ref), 'data-ref': m.ref || '', 'data-mid': m.id }, h('time', {}, m.at), h('div', { class: 'bub' }, h('b', {}, N(m.from)), h('span', { class: 'arr' }, '→'), h('b', {}, N(m.to)), ' · ' + tr(m.text)));
  function renderTalk() {
    const box = $('#msgs'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    setKids(box, st.messages.length ? st.messages.map(m => {
      const isNew = !seen.has(m.id); seen.add(m.id);
      return keep('m:' + m.id, msgNode(m), litKey(caseKey(m.ref)), isNew);
    }) : [keep('m:empty', h('div', { class: 'empty' }, t('emptyTalk')))]);
    if (atBottom) box.scrollTop = box.scrollHeight;
  }

  function renderGate() {
    const waiting = st.gate.filter(g => g.status === 'waiting' && (acting === 'all' || g.who === acting));
    const done = st.gate.filter(g => g.status !== 'waiting' && (acting === 'all' || g.who === acting)).slice(-6).reverse();
    $('#gateCount').textContent = t('waiting', { n: waiting.length });
    const card = g => {
      const isNew = !seen.has(g.id); seen.add(g.id);
      const p = people[g.who], key = caseKey(g.ref);
      const node = h('div', { class: 'gc' + (g === waiting[0] ? ' first' : '') + (g.status !== 'waiting' ? ' done' : ''), 'data-key': key, 'data-ref': g.ref, 'data-who': g.who },
        h('div', { class: 'who' }, h('span', { class: 'av' }, N(p.name)[0]), N(p.name) + ' · ' + jobOf(p)),
        h('h3', {}, tr(g.title)), g.evidence && g.evidence.length ? h('div', { class: 'ev' }, g.evidence.map((e, i) => [i ? h('br') : null, tr(e)])) : null,
        g.status === 'waiting'
          ? h('div', { class: 'acts' }, g.choices.map(c => h('button', { class: 'btn amb' + (c.primary ? ' pri' : ''), 'data-choice': c.id, onclick: () => decide(g, c) }, tr(c.label) + (c.amount ? ' (' + F(c.amount, 0) + ' AZN)' : ''))))
          : h('div', { class: 'outcome' }, g.status === 'withdrawn' ? (g.note ? tr(g.note) : t('noLonger')) : '✓ ' + N(people[g.by || g.who].name) + ': ' + tr((g.choices.find(c => c.id === g.choice) || {}).label) + ' · ' + g.decidedAt));
      return keep('g:' + g.id, node, litKey(key), isNew);
    };
    setKids($('#gq'), waiting.length || done.length ? [...waiting.map(card), ...done.map(card)] : [keep('g:empty:' + acting, h('div', { class: 'empty' }, acting === 'all' ? t('emptyGate') : t('emptyGateFor', { name: N(people[acting].name) })))]);
  }
  function decide(g, c) { E.decide(st, g.id, c.id, g.who); schedule(); }

  function renderFoot() {
    const last = st.record[st.record.length - 1];
    $('#sealN').textContent = t('sealed', { n: seals.length });
    $('#lastStep').textContent = last ? ' · ' + t('last') + ' ' + last.at + ' ' + tr(last.text).slice(0, 90) : '';
  }
  function renderStart() { $('#start').hidden = $('#startScrim').hidden = !!started; }

  // ------------------------------------------------------------ the drawer: repainted only when what it shows changed
  let lastDrawer = '';
  function openDrawer(title, body) { lastDrawer = ''; drawer = () => paintDrawer(title, body); paintDrawer(title, body); }
  function closeDrawer() { drawer = null; lastDrawer = ''; pinned = false; focusKey = null; focusRef = null; applyFocus(); const d = $('#drawer'); if (d) { d.hidden = true; $('#scrim').hidden = true; } }
  function paintDrawer(title, body) {
    const d = $('#drawer'); d.hidden = false; $('#scrim').hidden = false;
    const head = h('div', { class: 'dh' }, h('h2', {}, typeof title === 'function' ? title() : title), h('button', { class: 'ctl x', onclick: closeDrawer, 'aria-label': t('close') }, t('close')));
    const db = h('div', { class: 'db' }, body()), html = head.outerHTML + db.outerHTML;
    if (html === lastDrawer) return;   // nothing changed: keep the images, the scroll and anything being typed
    lastDrawer = html;
    const old = d.querySelector('.db'), keepTop = old ? old.scrollTop : 0, act = document.activeElement;
    const typing = act && d.contains(act) && act.dataset && act.dataset.keep ? { k: act.dataset.keep, v: act.value, s: act.selectionStart } : null;
    d.replaceChildren(head, db);
    db.scrollTop = keepTop;
    if (typing) { const el = db.querySelector('[data-keep="' + typing.k + '"]'); if (el) { el.value = typing.v; el.focus(); try { el.setSelectionRange(typing.s, typing.s); } catch (e) { /* fine */ } } }
  }
  const sec = (title, ...kids) => h('div', { class: 'sec' }, h('h4', {}, title), ...kids);
  const recordFor = refs => st.record.filter(e => e.data && refs.some(r => r && (e.data.item === r || e.data.case === r || e.data.ref === r || e.data.gate === r)));
  function recLines(list) {
    return list.length ? list.map(e => h('div', { class: 'rec' }, h('span', {}, e.at), h('span', { class: 'h' }, seals[e.n - 1] ? seals[e.n - 1].slice(0, 6) : '…'), h('span', {}, N(e.by) + ': ' + tr(e.text)))) : h('div', { class: 'empty' }, t('nothingRec'));
  }
  function draftsFor(refs) {
    const ds = st.drafts.filter(d => refs.includes(d.ref));
    return ds.length ? ds.map(d => {
      const body = d.lang === 'az' ? d.text : tr(d.text);   // replies keep the Azerbaijani the customer would get; NowAI's own notes follow the screen
      const transl = d.lang === 'az' && d.en && lang !== 'az' ? (lang === 'en' ? d.en : tr(d.en)) : null;
      return h('div', { class: 'draft' }, h('div', { class: 'meta' }, h('span', {}, tr(d.kind) + (d.byRule ? t('byRule') : '') + ' · ' + t('to', { x: N(d.to) }) + ' · ' + d.at), h('span', { class: 'ns' + (d.status === 'withdrawn' ? ' withdrawn' : '') }, t('ds_' + d.status))),
        body, transl ? h('div', { class: 'en' }, t('translation') + transl) : null, null);
    }) : h('div', { class: 'empty' }, t('noDrafts'));
  }
  function readingTable(it) {
    const r = it.reading; if (!r) return h('div', { class: 'empty' }, it.status === 'reading' ? t('readingNow') : t('nothingToRead'));
    if (r.error) return h('div', { class: 'quote' }, t('readerFailed', { e: r.error }));
    const rows = [];
    if (r.lines) rows.push(h('table', { class: 'kv' }, h('tr', {}, h('th', {}, t('asWritten')), h('th', {}, t('qty')), h('th', {}, t('unit')), r.lines[0] && r.lines[0].price != null ? [h('th', {}, t('price')), h('th', {}, t('amount'))] : null),
      r.lines.map(l => h('tr', {}, h('td', {}, l.text || l.description), h('td', { class: 'n' }, l.qty == null ? '?' : I.num(lang, l.qty)), h('td', {}, l.unit || ''), l.price != null ? [h('td', { class: 'n' }, F(l.price)), h('td', { class: 'n' }, F(l.amount))] : null))));
    const facts = Object.entries(r).filter(([k, v]) => !['lines', 'unreadable', 'kind'].includes(k) && v != null && typeof v !== 'object');
    if (facts.length) rows.push(h('table', { class: 'kv' }, facts.map(([k, v]) => { const kk = t('k_' + k); return h('tr', {}, h('th', {}, kk === 'k_' + k ? k : kk), h('td', {}, String(v))); })));
    if (r.unreadable && r.unreadable.length) rows.push(h('div', { class: 'quote' }, t('notReadable', { x: r.unreadable.join(', ') })));
    rows.push(h('details', {}, h('summary', {}, t('rawReturned')), h('div', { class: 'raw' }, JSON.stringify(r, null, 1))));
    return rows;
  }
  function checksFor(cs) {
    if (!cs) return h('div', { class: 'empty' }, t('noChecks'));
    const out = [], ok = (good, text) => out.push(h('div', { class: 'chk' + (good ? '' : ' bad') }, h('b', {}, good ? '✓' : '!'), h('span', {}, text)));
    if (cs.type === 'order') {
      for (const l of cs.lines) ok(true, t('ckLine', { q: I.num(lang, l.qty), u: I.unit(lang, l.unit), p: F(l.price), a: F(l.amount), name: N(l.name) }));
      ok(true, t('ckTotal', { net: F(cs.net), vat: F(cs.vat), total: F(cs.total) }));
      for (const s of cs.short) ok(false, t('ckShort', { name: N(s.name), have: I.num(lang, s.have), later: I.num(lang, s.later), u: I.unit(lang, s.unit), when: s.when ? I.day(lang, s.when) : null, whenAcc: s.when ? I.day(lang, s.when, true) : null }));
      if (cs.after != null) ok(cs.over <= 0, t('ckCredit', { open: F(cs.open), total: F(cs.total), after: F(cs.after), limit: F(st.customers[cs.customer].limit), over: cs.over > 0 ? F(cs.over) : null }));
    } else if (cs.type === 'supplier-invoice') {
      if (!cs.findings.length) ok(true, t('ckInvOk'));
      for (const f of cs.findings) ok(false, tr(f.text));
      ok(true, t('ckInvTot', { net: F(cs.net), vat: F(cs.vat), total: F(cs.total) }));
    } else if (cs.type === 'damage') {
      const it = W.items.find(i => i.code === cs.code);
      ok(true, t('ckDmg', { q: cs.qty, p: F(it.price), v: F(cs.value), g: F(cs.gross), pal: it.perPallet || null }));
      ok(cs.value <= W.rules.creditNoteAbove, t('ckDmgRule', { r: F(W.rules.creditNoteAbove, 0), name: N(people[W.rules.creditNotes].name) }));
      ok(true, t('ckOnce', { c: cs.outcome || null }));
    } else if (cs.type === 'promise') {
      ok(true, t('ckPromise', { a: F(cs.amount), day: I.day(lang, cs.day), dayAcc: I.day(lang, cs.day, true), at: cs.at }));
      if (cs.overdue) ok(false, t('ckOverdue', { inv: cs.overdue.inv, late: cs.overdue.late }));
      ok(true, t('ckMatch'));
    } else if (cs.type === 'leave') {
      const route = st.routes.find(r => r.id === cs.route);
      ok(!route, route ? t('ckRoute', { driver: N(W.deliveries.routes.find(r => r.id === cs.route).driver), route: N(route.route) }) : t('ckNoRoute'));
    }
    return out;
  }
  function openItem(iid) {
    focusRef = iid; focusKey = caseKey(iid); pinned = true; applyFocus();
    openDrawer(() => t('evidence'), () => {
      const it = st.items.find(i => i.id === iid); if (!it) return h('div', { class: 'empty' }, t('gone'));
      const cs = it.caseId && st.cases[it.caseId], src = it.file, blob = fileBlobs[it.id];
      const orig = [];
      if (blob) orig.push(blob.type.startsWith('image/') ? h('img', { class: 'orig', src: blobUrl(it.id), alt: t('photoAlt') }) : h('iframe', { class: 'orig', src: blobUrl(it.id), title: t('photoAlt') }));
      else if (/\.(jpe?g|png)$/i.test(src || '')) orig.push(h('img', { class: 'orig', src, alt: t('photoAlt') }));
      else if (/\.pdf$/i.test(src || '')) orig.push(h('img', { class: 'orig', src: src.replace(/\.pdf$/i, '_p1.jpg'), alt: t('pdfAlt') }), h('a', { href: src, target: '_blank', rel: 'noopener' }, t('openPdf')));
      if (it.photo) orig.push(h('img', { class: 'orig', src: it.photo, alt: t('voicePhotoAlt') }));
      const ev = W.morning.find(e => e.id === it.id);
      if (ev && ev.sample) orig.push(h('div', { class: 'sample' }, tr(ev.sample)));
      if (it.from === 'bank') orig.push(h('table', { class: 'kv' }, h('tr', {}, h('th', {}, t('payer')), h('th', {}, t('reference')), h('th', {}, 'AZN')), W.bank.lines.map(l => h('tr', {}, h('td', {}, N(l.payer)), h('td', {}, l.ref || t('none')), h('td', { class: 'n' }, F(l.amount))))));
      const transl = lang === 'en' ? it.textEn : lang === 'ru' ? (ev && ev.textRu) : null;
      return [
        h('div', { class: 'quote' }, N(E.fromName(st, it.from)) + ' · ' + I.ch(lang, it.channel) + ' · ' + it.at + (it.live ? ' · ' + t('sentByYou') : ''), it.text ? h('div', { style: 'margin-top:6px' }, '“' + it.text + '”') : null, transl ? h('small', {}, t('translation') + transl) : null),
        orig.length ? sec(t('whatArrived'), ...orig) : null,
        it.read ? sec(t('whatRead') + (it.readMs ? ' · ' + tr(it.readBy) + ', ' + I.num(lang, (it.readMs / 1000).toFixed(1)) + ' s' : ''), readingTable(it),
          it.status === 'failed' ? h('div', { class: 'retry' }, h('button', { class: 'btn pri', onclick: () => { if (E.retryItem(st, it.id)) read(it); } }, t('readAgain')), h('small', { style: 'color:var(--mute)' }, t('readAgainNote'))) : null) : null,
        sec(t('codeChecked'), checksFor(cs)),
        sec(t('neverSent'), draftsFor([cs && cs.id, it.id])),
        sec(t('recordSec'), recLines(recordFor([it.id, cs && cs.id, ...st.gate.filter(g => g.ref === (cs && cs.id) || g.ref === it.id).map(g => g.id)])))
      ];
    });
  }
  function openRole(rid) {
    openDrawer(() => roleL(rid), () => {
      const v = E.roleView(st, rid), name = roleOf(rid);
      const msgs = st.messages.filter(m => m.from === name || m.to === name);
      return [
        h('div', { class: 'quote' }, I.does(lang, rid, W.roles.find(r => r.id === rid).does) + '.'),
        sec(t('workHandled'), v.items.length ? v.items.map(it => h('button', { class: 'it', onclick: () => openItem(it.id) }, icon(it.channel), h('div', {}, h('div', { class: 'top' }, h('b', {}, N(E.fromName(st, it.from))), h('time', {}, it.at)), h('div', {}, itemTags(it))))) : h('div', { class: 'empty' }, t('nothingRec'))),
        sec(t('msgsWith'), msgs.length ? msgs.map(msgNode) : h('div', { class: 'empty' }, t('noneYet'))),
        sec(t('stepsIn'), recLines(st.record.filter(e => e.by === name)))
      ];
    });
  }
  function openBrief() {
    let answer = null, asking = false;
    const ask = async q => {
      if (!q || asking) return;
      if (AI.status !== 'live') { answer = t('noAIAnswer'); drawer && drawer(); return; }
      asking = true; answer = t('thinking'); drawer && drawer();
      const r = await AI.answer(q, E.snapshot(st), lang); answer = r.answer; asking = false; drawer && drawer();
    };
    openDrawer(() => t('briefTitle'), () => {
      const b = E.brief(st), input = h('input', { type: 'text', 'data-keep': 'ask', placeholder: t('askPh'), onkeydown: e => { if (e.key === 'Enter') ask(e.target.value); } });
      return [
        sec(t('liveAt', { t: b.at }), b.lines.map(l => h('div', { class: 'bl' + (l.warn ? ' warn' : '') }, h('span', {}, tr(l.k)), h('b', {}, tr(l.v))))),
        sec(t('askNowAI'), h('div', { class: 'ask' }, input, h('button', { class: 'btn pri', onclick: () => ask(input.value) }, t('ask'))), answer ? h('div', { class: 'ans' }, answer) : h('small', { style: 'color:var(--mute)' }, t('factsOnly'))),
        sec(t('decisionsTaken'), st.gate.filter(g => g.status === 'decided').map(g => h('div', { class: 'chk' }, h('b', {}, '✓'), h('span', {}, N(people[g.who].name) + ': ' + tr((g.choices.find(c => c.id === g.choice) || {}).label) + ' · ' + tr(g.title)))))
      ];
    });
  }
  function openRecord() {
    let result = null;
    openDrawer(() => t('recordTitle'), () => [
      h('div', { class: 'quote' }, t('recordIntro')),
      h('div', { class: 'ask' }, h('button', { class: 'btn pri', onclick: async () => { const bad = await verify(); result = bad ? t('brokenAt', { n: bad }) : t('sealsOk', { n: seals.length }); drawer && drawer(); } }, t('checkSeals')), result ? h('span', { style: 'align-self:center;font-weight:600;color:var(--leaf)' }, result) : null),
      sec(t('nSteps', { n: st.record.length }), recLines(st.record))
    ]);
  }

  // ------------------------------------------------------------ one case, followed across the screen
  // Every card carries the case it belongs to. Hovering one lights that case in all three columns; opening its evidence pins it.
  function caseKey(ref) {
    if (!ref || !st) return null;
    if (st.cases[ref]) return ref;
    const it = st.items.find(i => i.id === ref);
    if (it) { if (it.caseId) return it.caseId; const c = Object.values(st.cases).find(x => x.item === it.id); if (c) return c.id; }
    const g = st.gate.find(x => x.id === ref); if (g) return caseKey(g.ref);
    return ref;
  }
  function roleKeys(rid) {
    const name = roleOf(rid), keys = new Set();
    for (const cs of Object.values(st.cases)) if (cs.role === rid) keys.add(cs.id);
    for (const it of st.items) if (it.role === rid) keys.add(caseKey(it.id));
    for (const m of st.messages) if (m.from === name || m.to === name) keys.add(caseKey(m.ref));
    for (const g of st.gate) if (g.role === rid) keys.add(caseKey(g.ref));
    return [...keys].filter(Boolean).join(' ');
  }
  function applyFocus() {
    const root = document.querySelector('.nw'); if (!root) return;
    root.classList.toggle('focusing', !!focusKey);
    for (const el of root.querySelectorAll('main [data-key], main [data-keys]')) {
      const lit = !!focusKey && (el.dataset.key === focusKey || (el.dataset.keys || '').split(' ').includes(focusKey));
      if (el.classList.contains('lit') !== lit) el.classList.toggle('lit', lit);
    }
  }
  function setupFocus() {
    const root = document.querySelector('.nw');
    root.addEventListener('mouseover', e => {
      if (pinned) return;
      const el = e.target.closest('main [data-ref]'), r = el ? el.dataset.ref || null : null;
      if (r !== focusRef) { focusRef = r; focusKey = caseKey(r); applyFocus(); }
    });
    root.addEventListener('mouseleave', () => { if (!pinned && focusRef) { focusRef = null; focusKey = null; applyFocus(); } });
  }

  // ------------------------------------------------------------ hand-offs: a packet from one role's card to another's
  const roleIdByName = name => (W.roles.find(r => r.name === name) || {}).id;
  function endpoint(name) {
    const rid = roleIdByName(name);
    if (rid) return document.querySelector('.role[data-role="' + rid + '"]');
    const p = W.people.find(x => x.name === name);
    if (p) return document.querySelector('.gc[data-who="' + p.id + '"]:not(.done)') || document.querySelector('.panel.gate');
    return null;
  }
  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, ok: r.width > 0 && r.bottom > 0 && r.top < innerHeight }; };
  function runBeams() {
    if (beaming || !beamQ.length) return;
    while (beamQ.length > 5) beamQ.shift();   // fast clock: keep up rather than replay a backlog
    const m = beamQ.shift(), a = endpoint(m.from), b = endpoint(m.to);
    const row = document.querySelector('.m[data-mid="' + m.id + '"]');
    if (!a || !b || !centre(a).ok || !centre(b).ok || drawer) { runBeams(); return; }
    beaming = true;
    if (row) row.classList.add('now');
    if (calm) { b.classList.add('recv'); setTimeout(() => { b.classList.remove('recv'); if (row) row.classList.remove('now'); beaming = false; runBeams(); }, 500); return; }
    const svg = $('#beams'), ns = 'http://www.w3.org/2000/svg', p1 = centre(a), p2 = centre(b);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2, dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(90, len * 0.25), cx = mx - dy / len * bend, cy = my + dx / len * bend;
    const path = document.createElementNS(ns, 'path'); path.setAttribute('d', 'M' + p1.x + ' ' + p1.y + ' Q' + cx + ' ' + cy + ' ' + p2.x + ' ' + p2.y); path.setAttribute('class', 'trail');
    const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('r', '5');
    svg.append(path, dot); a.classList.add('send');
    const L = path.getTotalLength(), T = 720, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / T), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, pt = path.getPointAtLength(e * L);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      path.style.opacity = String(0.45 * Math.sin(Math.PI * k)); path.style.strokeDasharray = L; path.style.strokeDashoffset = String(L * (1 - e));
      if (k < 1) return requestAnimationFrame(step);
      path.remove(); dot.remove(); a.classList.remove('send');
      const b2 = endpoint(m.to) || b; b2.classList.add('recv');
      setTimeout(() => { b2.classList.remove('recv'); if (row) row.classList.remove('now'); }, 900);
      setTimeout(() => { beaming = false; runBeams(); }, 160);
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------ sending something in
  function setupComposer() {
    const box = $('#compose'), sel = $('#sender'), text = $('#text'), fileIn = $('#file'), fileName = $('#fileName');
    let file = null;
    const pick = f => { file = f || null; fileName.textContent = file ? file.name : ''; };
    fileIn.addEventListener('change', () => pick(fileIn.files[0]));
    box.addEventListener('dragover', e => { e.preventDefault(); });   // no drop target: test mode reads no files
    box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('drop'); });   // test mode reads no files
    $('#send').addEventListener('click', () => {
      const tx = text.value.trim(); if (!tx && !file) return;
      started = true;
      const opt = sel.selectedOptions[0], ch = opt.getAttribute('data-ch');
      const kind = file && /pdf/i.test(file.type) && ch === 'email' ? 'supplier-invoice' : 'classify';
      const it = E.addItem(st, { channel: ch, from: sel.value, text: tx, kind });
      if (file) { fileBlobs[it.id] = file; it.file = file.name; }
      text.value = ''; pick(null); fileIn.value = '';
      read(it); schedule();
    });
  }

  // ------------------------------------------------------------ start
  function showBanner() { const b = $('#banner'); b.hidden = AI.status === 'live' || AI.status === 'checking'; b.className = 'banner' + (AI.status === 'mock' ? ' mock' : ''); b.textContent = AI.status === 'mock' ? t('bannerMock') : t('bannerOff'); }
  function setup() {
    $('#play').addEventListener('click', () => playing ? pause() : play());
    $('#next').addEventListener('click', nextEvent);
    $('#speed').addEventListener('change', e => { speed = e.target.value; if (playing) { pause(); play(); } });
    $('#acting').addEventListener('change', e => { acting = e.target.value; schedule(); });
    $('#newDay').addEventListener('click', newDay);
    $('#recordBtn').addEventListener('click', openRecord);
    $('#scrim').addEventListener('click', closeDrawer);
    for (const b of document.querySelectorAll('#langSw button')) b.addEventListener('click', () => { setLang(b.dataset.l); showBanner(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (drawer) closeDrawer(); else { focusKey = null; focusRef = null; pinned = false; applyFocus(); } } });
    $('#startGo').addEventListener('click', play);
    applyStatic(); setupComposer(); setupFocus();
    AI.onStatus(() => { showBanner(); schedule(); });
    newDay();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
