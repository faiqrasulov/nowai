/* NowAI workspace: the screen. It runs the example morning by itself on the example clock, sends what arrives to the
   AI reader, hands what was read to the engine, and draws Inbox, Team and Record from the engine's state.
   It decides nothing: the engine does. English, Azerbaijani, Russian (i18n.js for the engine's sentences, ui_text.js for this screen). */
(function () {
  'use strict';
  const E = window.NOWAI_ENGINE, W = window.NOWAI_WORLD, AI = window.NOWAI_AI, I = window.NOWAI_I18N, U = window.NOWAI_UI;
  const $ = s => document.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  const PATHS = {
    whatsapp: 'M8 1.8a6.2 6.2 0 0 0-5.3 9.4L1.8 14.2l3.1-.8A6.2 6.2 0 1 0 8 1.8z', email: 'M2 3.5h12v9H2zM2.5 4l5.5 4.5L13.5 4',
    voice: 'M3 9V7M5.5 11V5M8 13V3M10.5 11V5M13 9V7', photo: 'M2 3.5h12v9H2zM2 11l3.5-3.5 3 3L11 8l3 3M11 6.2h.01',
    file: 'M4 2h6l3 3v9H4zM6 8h5M6 11h5', check: 'M8 1.8l5 2v4.2c0 3-2.2 5-5 6.2C5.2 13 3 11 3 8V3.8zM5.8 8l1.6 1.6 3-3.2',
    arrive: 'M2.5 9.5h3l1 2h3l1-2h3M2.5 9.5L4 3.5h8l1.5 6v3h-11z', eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 9.7a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
    decide: 'M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM5.5 8l1.8 1.8L10.8 6.2', doc: 'M4 2h6l3 3v9H4zM6 8.5h5M6 11h3', dots: 'M3.2 8h1.2M7.4 8h1.2M11.6 8h1.2',
    close: 'M4 4l8 8M12 4l-8 8', staff: 'M6 7.8a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM2 13c.6-2.4 2.2-3.6 4-3.6s3.4 1.2 4 3.6M11 4.5h3M11 7h3'
  };
  function svg(name) { const s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true'); p.setAttribute('d', PATHS[name] || PATHS.file); s.append(p); return s; }

  // ------------------------------------------------------------ state
  const START = '08:30', END = E.toMin('09:30'), SPEEDS = { normal: 1500, fast: 500 };
  let st, view = 'inbox', filter = 'all', roleFilter = null, recFilter = null, selected = null, userChose = false, pickDone = false, pane = 'list';
  let mode = 'normal', timer = null, loaded = false, lastDetail = null, toastTimer = null, pending = false;
  const seals = [], sealQ = []; let sealing = false;
  const fileBlobs = {}, blobUrls = {}, outcomes = {}, fresh = new Map(), seen = new Set(), mine = new Set();
  const stepsOpen = new Set(), chipSeen = new Map(), chipNew = new Map();   // "Show every step" per entry; which step chips were already drawn; chips still sliding in
  const blobUrl = id => blobUrls[id] || (blobUrls[id] = URL.createObjectURL(fileBlobs[id]));
  const people = Object.fromEntries(W.people.map(p => [p.id, p]));
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } };

  // Dates: the example day runs live from the engine. Its date is the example's own, not the calendar's, and the page calls it
  // "Example day". Earlier working days come from samples/history.json (example data, made for this page).
  const TODAY = W.company.day, FIRST = '2026-10-26', plus = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const workBefore = iso => { let d = plus(iso, -1); while ([0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay())) d = plus(d, -1); return d; };
  const PRESETS = { today: [TODAY, TODAY], yest: [workBefore(TODAY), workBefore(TODAY)], 7: [plus(TODAY, -6), TODAY], 30: [plus(TODAY, -29), TODAY] };
  const narrow = matchMedia('(max-width: 820px)');   // phones: the Inbox scrolls as one page, the detail replaces the list
  const pageScroll = matchMedia('(max-width: 820px), (min-width: 821px) and (max-height: 860px)');   // also short laptop screens (app.css)
  let genesis = null, listScroll = 0;   // genesis: the seal the example day's first line is sealed onto (the history's last seal; '' without history)
  let range = { preset: 'today', from: TODAY, to: TODAY }, hist = null, recQ = '', recRole = '', sealNote = null, sealVer = 0, recSig = null, dlTimer = null;
  const histDay = new Map(), histEntry = new Map(), sealByDay = new Map(), textMemo = new Map();
  const isToday = () => range.preset === 'today', incToday = () => range.to >= TODAY, multiDay = () => range.from !== range.to;
  const histIn = () => hist ? hist.days.filter(d => d.date >= range.from && d.date <= range.to) : [];   // oldest first
  const isHist = e => e.kind === 'hist', wrap = x => ({ id: x.id, kind: 'hist', h: x, at: x.at, date: x.date });
  function loadHistory() {
    fetch('samples/history.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { hist = j; for (const d of j.days) { histDay.set(d.date, d); for (const e of d.entries) histEntry.set(e.id, e); } genesis = j.lastSeal || ''; sealNext(); render(); })
      .catch(err => { hist = { days: [], failed: true }; genesis = ''; sealNext(); console.warn('history.json did not load', err); render(); });   // opened as a file: no earlier days
  }

  let lang = (() => { const q = new URLSearchParams(location.search).get('lang'), s = lsGet('nowai-lang'); return I.LANGS.includes(q) ? q : I.LANGS.includes(s) ? s : 'en'; })();
  const t = (k, p) => U.t(lang, k, p), tr = s => I.tr(lang, s), N = s => I.loc(lang, s), F = (x, d) => I.num(lang, E.fmt(x, d));
  const low = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const roleName = rid => I.role(lang, (W.roles.find(r => r.id === rid) || {}).name || rid);
  const jobOf = p => low(I.job(lang, p.job));
  const whoRec = by => / \(role-play\)$/.test(by) ? t('asYou', { name: who(by) }) : who(by);   // a decision made on this page: the viewer, acting as that person
  function who(by) { const b = String(by).replace(/ \(role-play\)$/, ''); if (b === 'Intake' || b === 'NowAI') return t('by_' + b); const r = I.role(lang, b); return r !== b ? r : N(b); }

  function applyStatic() {
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i]')) el.textContent = t(el.dataset.i);
    for (const el of document.querySelectorAll('[data-ip]')) el.placeholder = t(el.dataset.ip);
    for (const el of document.querySelectorAll('[data-it]')) el.title = t(el.dataset.it);
    for (const el of document.querySelectorAll('[data-ia]')) el.setAttribute('aria-label', t(el.dataset.ia));
    for (const b of document.querySelectorAll('[data-l]')) b.setAttribute('aria-pressed', String(b.dataset.l === lang));
    $('#testChip').title = t('testTip'); $('#dateErr').textContent = t('dateErr'); $('#dpTodayDate').textContent = ' · ' + U.dayShort(lang, TODAY);
    recSig = null; $('#recRole')._sig = null;
    fillFrom();
  }
  function setLang(l) { if (!I.LANGS.includes(l) || l === lang) return; lang = l; lsSet('nowai-lang', l); applyStatic(); lastDetail = null; render(true); }

  // ------------------------------------------------------------ the day
  function newDay() {
    stopTimer(); st = E.createDay(W, { start: START });
    seals.length = 0; sealQ.length = 0; sealByDay.delete(TODAY); sealNote = null; recSig = null; for (const k of Object.keys(outcomes)) delete outcomes[k];
    fresh.clear(); seen.clear(); mine.clear(); stepsOpen.clear(); chipSeen.clear(); chipNew.clear(); loaded = false;
    st.listeners.push(ev => { if (ev.type === 'record') { sealQ.push(ev.entry); sealNext(); } schedule(); });
    st.record.forEach(e => sealQ.push(e)); sealNext();
    selected = null; userChose = false; pickDone = false; pane = 'list'; filter = 'all'; roleFilter = null; recFilter = null; lastDetail = null; hideToast();
    E.advanceTo(st, START).forEach(read);
    buildEntries().forEach(e => seen.add(e.id)); loaded = true;
    render(true); startTimer();
  }
  function startTimer() { stopTimer(); if (mode === 'stop' || st.clock >= END) return; timer = setInterval(tick, SPEEDS[mode]); }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }
  function tick() {
    st.clock = Math.min(END, st.clock + 1);
    E.advanceTo(st, st.clock).forEach(read);
    if (st.clock >= END) stopTimer();
    schedule();
  }
  async function read(it) {
    it.fromName = E.fromName(st, it.from);
    if (fileBlobs[it.id]) it.fileBlob = fileBlobs[it.id];
    schedule();
    const r = await AI.read(it);
    if (!st.items.includes(it)) return;   // the day was restarted while it was reading
    E.applyReading(st, it.id, r.reading, { ms: r.ms, by: r.by });
    schedule();
  }
  function decide(gid, cid) {
    const before = st.record.length;
    const g = E.decide(st, gid, cid, st.gate.find(x => x.id === gid).who);
    if (g) outcomes[gid] = [before + 1, st.record.length];   // record lines 'before+1' .. 'length' = the decision's own line, then what it caused
    schedule();
  }

  // ------------------------------------------------------------ the Record's seals (SHA-256 of the last seal and the line)
  const canon = v => JSON.stringify(v, Object.keys(v).sort());
  async function sha(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function sealNext() {
    if (sealing || !sealQ.length || genesis === null || !(window.crypto && crypto.subtle)) return;
    sealing = true; const day = st;
    while (sealQ.length) {
      const e = sealQ.shift(), prev = seals.length ? seals[seals.length - 1] : genesis;
      const s = await sha(prev + '\n' + canon({ n: e.n, at: e.at, by: e.by, action: e.action, text: e.text }));
      if (day !== st) break;
      seals.push(s);
    }
    sealing = false; schedule();
  }
  async function verifyLines(lines, sealOf, start) {   // recompute the chain from the lines and compare it with the stored seals
    let prev = start || '';
    for (let i = 0; i < lines.length; i++) {
      const e = lines[i], s = await sha(prev + '\n' + canon({ n: e.n, at: e.at, by: e.by, action: e.action, text: e.text }));
      if (s !== sealOf(i)) return { bad: i + 1, n: lines.length };
      prev = s;
    }
    return { bad: 0, n: lines.length };
  }
  async function verify() {
    while (sealing || sealQ.length || genesis === null) await new Promise(r => setTimeout(r, 25));
    return verifyLines(st.record.slice(0, seals.length), i => seals[i], genesis);
  }
  // "Check the seals" for every day of the range: the example history and, if the range has it, today
  async function checkRange() {
    const key = range.from + '|' + range.to, days = [], bad = [];
    let steps = 0;
    // each day must also run on from the day before: a missing, added or moved day breaks the chain at its first step
    const lastSeal = d => d && d.record.length ? d.record[d.record.length - 1].seal : '';
    for (const d of histIn()) {
      const k = hist.days.indexOf(d), link = k > 0 ? lastSeal(hist.days[k - 1]) : '';
      const r = (d.prevSeal || '') !== link ? { bad: 1, n: d.record.length } : await verifyLines(d.record, i => d.record[i].seal, d.prevSeal);
      sealByDay.set(d.date, { ...r }); days.push(d.date); steps += r.n; if (r.bad) bad.push(U.dayShort(lang, d.date) + ' (' + t('sealDayBad', { n: r.bad }) + ')');
    }
    if (incToday()) {
      const r = hist && !hist.failed && genesis !== (hist.lastSeal || '') ? { bad: 1, n: st.record.length } : await verify();
      sealByDay.set(TODAY, { ...r, len: st.record.length }); days.push(TODAY); steps += r.n; if (r.bad) bad.push(U.dayShort(lang, TODAY) + ' (' + t('sealDayBad', { n: r.bad }) + ')');
    }
    sealNote = { key, len: st.record.length, bad: bad.length > 0, text: !days.length ? t('sealsNone') : bad.length ? t('sealsRangeBad', { d: days.length, list: bad.join(', ') }) : t('sealsRange', { d: days.length, ns: F(steps, 0), n: steps }) };
    sealVer++; render();
  }

  // ------------------------------------------------------------ what the screen lists: derived from the engine's state
  function buildEntries() {
    const list = st.items.map((it, i) => ({ id: it.id, kind: 'item', it, at: it.at, ord: i }));
    const m4 = W.morning.find(e => e.does === 'overdue-check');
    if (m4 && st.released.includes(m4.id)) list.push({ id: m4.id, kind: 'check', at: m4.at, ord: -1 });
    return list.sort((a, b) => (E.toMin(b.at) - E.toMin(a.at)) || (b.ord - a.ord));
  }
  const caseOf = it => it.caseId && st.cases[it.caseId];
  const isImg = it => /\.(jpe?g|png|webp)$/i.test(it.file || '') || (fileBlobs[it.id] && /^image\//.test(fileBlobs[it.id].type));
  const isPdf = it => /\.pdf$/i.test(it.file || '') || (fileBlobs[it.id] && /pdf/i.test(fileBlobs[it.id].type));
  const overdueCases = () => Object.values(st.cases).filter(c => c.type === 'overdue' || (c.type === 'promise' && c.overdue));
  function entryCases(e) {
    if (e.kind === 'check') return overdueCases();
    return Object.values(st.cases).filter(c => c.item === e.it.id || c.id === e.it.caseId);
  }
  function gatesOf(e) {
    if (e.kind !== 'item') return [];
    const ids = new Set([e.it.id, ...entryCases(e).map(c => c.id)]);
    return st.gate.filter(g => ids.has(g.ref));
  }
  function refsOf(e) {
    const ids = e.kind === 'check' ? entryCases(e).map(c => c.id) : [e.it.id, ...entryCases(e).map(c => c.id)];
    return [...ids, ...gatesOf(e).map(g => g.id)];
  }
  const recordFor = refs => st.record.filter(e => e.data && refs.some(r => r && (e.data.item === r || e.data.case === r || e.data.ref === r || e.data.gate === r)));
  function entryRecord(e) {
    const rec = recordFor(refsOf(e));
    return e.kind === 'check' ? rec.filter(r => ['overdue', 'reminder.withdrawn', 'draft'].includes(r.action)) : rec;   // the check's own steps, not the promise it met
  }
  function chipKind(e) {
    if (isHist(e)) return e.h.outcome === 'decided' ? { k: 'decided', who: e.h.decidedBy } : { k: 'done' };
    if (e.kind === 'check') return { k: 'done' };
    if (e.it.status === 'reading') return { k: 'reading' };
    if (e.it.status === 'failed') return { k: 'failed' };
    const gs = gatesOf(e), w = gs.filter(g => g.status === 'waiting'), d = gs.filter(g => g.status === 'decided');
    if (w.length) return { k: 'wait', who: w[0].who };
    if (d.length) return { k: 'decided', who: d[d.length - 1].who };
    return { k: 'done' };
  }
  function chipNode(c) {
    const map = { reading: ['blue', t('cReading')], wait: ['amb', c.who && t('cWait', { x: c.who && N(people[c.who].name) })], decided: ['grey', c.who && t('cDecided', { x: N(people[c.who].name) })], done: ['green', t('cDone')], failed: ['red', t('cFailed')] };
    return h('span', { class: 'chip status ' + map[c.k][0] }, map[c.k][1]);
  }
  function roleOfEntry(e) { return isHist(e) ? e.h.role : e.kind === 'check' ? 'collections' : e.it.role; }
  function sender(e) {
    if (isHist(e)) {
      const f = e.h.from, c = W.customers.find(x => x.id === f), s = W.suppliers.find(x => x.id === f), p = W.staff.find(x => x.id === f);
      if (f === 'bank') return { name: t('bankStatement'), place: t('ch_file') };
      if (f === 'system') return { name: roleName('collections'), place: t('senderCheck') };
      if (c) return { name: N(c.name), place: N(c.where) };
      if (s) return { name: s.name, place: t('supplier') };
      if (p) return { name: N(p.name), place: low(I.job(lang, p.job)) };
      return { name: N(f), place: '' };
    }
    if (e.kind === 'check') return { name: roleName('collections'), place: t('senderCheck') };
    const it = e.it, c = st.customers[it.from], s = W.suppliers.find(x => x.id === it.from), p = W.staff.find(x => x.id === it.from);
    if (it.from === 'bank') return { name: t('bankStatement'), place: W.bank.file };
    if (c) return { name: N(c.name), place: N(c.where) };
    if (s) return { name: s.name, place: t('supplier') };
    if (p) return { name: N(p.name), place: low(I.job(lang, p.job)) };
    return { name: N(it.from || '?'), place: '' };
  }
  function msgText(it) {
    const ev = W.morning.find(x => x.id === it.id) || {};
    return lang === 'ru' && ev.textRu ? ev.textRu : (it.textEn || it.text || '');
  }
  const lineOf = e => { const s = lineOf0(e); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  function lineOf0(e) {
    if (isHist(e)) {   // the entry carries its sentence's key and numbers, so it reads in every language
      const p = { ...e.h.lp };
      if (p.x != null) p.x = F(p.x);
      if (p.day) { p.dayAcc = I.day(lang, p.day, true); p.day = I.day(lang, p.day); }
      if (p.name) p.name = N(p.name);
      return t(e.h.lk, p);
    }
    if (e.kind === 'check') return t('lineCheck', { n: Object.values(st.cases).filter(c => c.type === 'overdue' && c.status === 'reminder drafted').length });
    const it = e.it, cs = caseOf(it), r = it.reading;
    if (it.status === 'failed') return t('cFailed');
    if (it.from === 'bank') return t('lineBank', { a: st.bank.matched.length, b: W.bank.lines.length });
    if (it.status === 'reading') { const s = it.subject || msgText(it); return s.length > 64 ? s.slice(0, 62) + '…' : s; }
    if (cs) {
      if (cs.type === 'order') return cs.unknown && cs.unknown.length ? t('lineOrderUnknown', { n: cs.unknown.length }) : t('lineOrder', { x: F(cs.total), photo: it.read === 'photo-list' || (it.live && isImg(it)) });
      if (cs.type === 'supplier-invoice') return cs.held ? t('lineInvoiceAbove', { no: cs.invoiceNo, x: F(cs.held) }) : cs.findings.length ? t('lineInvoiceDiff', { no: cs.invoiceNo }) : t('lineInvoiceOk', { no: cs.invoiceNo });
      if (cs.type === 'promise') return t('linePromise', { x: F(cs.amount), day: I.day(lang, cs.day), dayAcc: I.day(lang, cs.day, true) });
      if (cs.type === 'damage') { const item = W.items.find(x => x.code === cs.code); return t('lineDamage', { pallets: item.perPallet && cs.qty % item.perPallet === 0 ? cs.qty / item.perPallet : 0, qty: cs.qty, name: N(item.name), x: F(cs.gross) }); }
      if (cs.type === 'leave') return t('lineLeave', { day: I.day(lang, cs.day), dayAcc: I.day(lang, cs.day, true) });
    }
    if (r && r.summary) return r.summary;
    return gatesOf(e).length ? t('lineNeedsPerson') : (it.text.length > 70 ? it.text.slice(0, 68) + '…' : it.text);
  }
  function channelOf(e) {
    if (isHist(e)) return e.h.channel;
    if (e.kind === 'check') return 'system';
    const it = e.it; return it.channel === 'whatsapp' && it.file && isImg(it) ? 'photo' : it.channel;
  }
  const iconOf = ch => ({ system: 'check', photo: 'photo', whatsapp: 'whatsapp', email: 'email', voice: 'voice', file: 'file', staff: 'staff' }[ch] || 'file');

  // ------------------------------------------------------------ drawing: replace a block only if it would look different
  function put(box, nodes) {
    const html = nodes.map(n => n.outerHTML).join('');
    if (box._h === html) return false;
    box._h = html;
    const a = document.activeElement, fk = a && box.contains(a) ? a.dataset.fk : null;
    box.replaceChildren(...nodes);
    if (fk) { const el = [...box.querySelectorAll('[data-fk]')].find(x => x.dataset.fk === fk); if (el) el.focus({ preventScroll: true }); }
    return true;
  }
  function schedule() { if (!pending) { pending = true; setTimeout(() => { pending = false; render(); }, 30); } }

  function render() {
    if (!st) return;
    const es = buildEntries();
    trackArrivals(es);
    const groups = rangeGroups(es), flat = groups.flatMap(g => g.entries);
    pickInitial(es, flat);
    renderHeader(es);
    if (view === 'inbox') renderInbox(es, groups, flat); else if (view === 'team') renderTeam(es); else renderRecord(es, flat);
    $('#footR').textContent = t('footR', { n: seals.length });
  }
  function trackArrivals(es) {
    for (const e of es) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (!loaded || mine.has(e.id)) continue;
      fresh.set(e.id, Date.now() + 4000); setTimeout(schedule, 4100);
      showToast(e);
    }
  }
  function pickInitial(es, flat) {
    if (selected && !flat.some(e => e.id === selected)) { selected = null; userChose = false; pickDone = false; }   // the dates changed
    if (selected || userChose || pickDone || !flat.length) return;
    if (incToday() && es.length) {
      if (st.items.some(i => i.status === 'reading')) return;
      const waiting = es.filter(e => chipKind(e).k === 'wait');
      selected = (waiting.length ? waiting[waiting.length - 1] : es[es.length - 1]).id;
    } else selected = flat[0].id;
    pickDone = true;
  }
  // ---- the dates shown: Today is the live day; earlier working days are example history
  const rangeLabel = () => isToday() ? t('today') : U.rangeShort(lang, range.from, range.to);
  function rangeGroups(es) {   // newest day first
    const out = [];
    if (incToday()) out.push({ date: TODAY, entries: es });
    for (const d of histIn().slice().reverse()) out.push({ date: d.date, entries: d.entries.slice().reverse().map(wrap) });
    return out;
  }
  function rangeStats(es) {
    const days = histIn().map(d => { let a = 0, b = 0, held = 0; for (const e of d.entries) { if (e.outcome === 'decided') b++; else a++; held += e.heldAmount || 0; } return { date: d.date, n: d.entries.length, a, b, w: 0, held: Math.round(held * 100) / 100 }; });
    if (incToday()) { const m = E.metrics(st), k = e => chipKind(e).k; days.push({ date: TODAY, n: m.arrived + (es.some(e => e.kind === 'check') ? 1 : 0), a: es.filter(e => k(e) === 'done').length, b: es.filter(e => k(e) === 'decided').length, w: m.waiting, held: m.held }); }
    const sum = k => days.reduce((s, d) => s + d[k], 0);
    return { days, n: sum('n'), a: sum('a'), b: sum('b'), w: sum('w'), held: Math.round(sum('held') * 100) / 100 };
  }
  function setRange(preset, from, to) {
    range = { preset, from, to }; selected = null; userChose = false; pickDone = false; lastDetail = null; recFilter = null; sealNote = null; pane = 'list';
    $('#dlRes').textContent = ''; closeDateMenu(); render();
  }
  function closeDateMenu() { $('#dateMenu').hidden = true; $('#dateBtn').setAttribute('aria-expanded', 'false'); }
  function toggleDateMenu() {
    const m = $('#dateMenu'); m.hidden = !m.hidden; $('#dateBtn').setAttribute('aria-expanded', String(!m.hidden));
    if (!m.hidden) { closeMenu(); $('#dp-' + range.preset).focus(); }
  }
  function applyCustom(ev) {
    ev.preventDefault();
    const a = $('#dFrom').value, b = $('#dTo').value, ok = /^\d{4}-\d\d-\d\d$/.test(a) && /^\d{4}-\d\d-\d\d$/.test(b) && a >= FIRST && b <= TODAY && a <= b;
    $('#dateErr').hidden = ok; if (!ok) { $('#dateErr').textContent = t('dateErr'); return; }
    setRange('custom', a, b); $('#dateBtn').focus();
  }
  function openEntry(id) {   // from a toast or a chip in the Record
    hideToast(); filter = 'all'; roleFilter = null; view = 'inbox';
    for (const x of ['inbox', 'team', 'record']) $('#view-' + x).hidden = x !== 'inbox';
    select(id);
  }
  function renderHeader(es) {
    const label = isToday() ? t('today') + ' · ' + E.toHHMM(st.clock) : rangeLabel();
    $('#dateTxt').textContent = label; $('#dateBtn').setAttribute('aria-label', t('dateLbl') + ': ' + label); $('#dateX').hidden = isToday();
    fitHeader();
    const noHist = !!(hist && hist.failed);
    for (const b of document.querySelectorAll('[data-preset]')) { b.setAttribute('aria-pressed', String(b.dataset.preset === String(range.preset))); b.disabled = noHist && b.dataset.preset !== 'today'; }
    $('#histNote').hidden = !noHist;
    const m = E.metrics(st), c = $('#inboxCount'); c.hidden = !m.waiting; c.textContent = m.waiting; c.setAttribute('aria-label', t('tWait') + ': ' + m.waiting);
    for (const [id, on] of [['inbox', view === 'inbox'], ['team', view === 'team'], ['record', view === 'record']]) { const b = $('#tab-' + id); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    for (const b of document.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(b.dataset.speed === mode));
  }
  function fitHeader() {   // one row when it fits; two rows, as on narrower screens, when the dates would reach the tabs (long Russian labels)
    const hd = $('.hd'), sig = innerWidth + '|' + lang + '|' + $('#dateTxt').textContent.length;
    if (hd._sig === sig) return;
    hd._sig = sig; hd.classList.remove('two');
    if (innerWidth <= 1180) return;
    const tb = $('.tabs').getBoundingClientRect(), br = $('.brand').getBoundingClientRect();   // the right-hand group can spill leftwards out of its own box: measure what is in it
    const left = Math.min(...[...$('.hr').children].map(x => x.getBoundingClientRect()).filter(x => x.width).map(x => x.left));
    if (tb.right > left - 8 || br.right > tb.left - 8) hd.classList.add('two');
  }
  function setView(v) {
    view = v;
    for (const x of ['inbox', 'team', 'record']) $('#view-' + x).hidden = x !== v;
    closeMenu(); render();
  }

  // ------------------------------------------------------------ Inbox
  function renderInbox(es, groups, flat) {
    // "Handled by NowAI alone" counts only what NowAI finished alone; what a person decided is counted under "Decided by people".
    const S = rangeStats(es), now = isToday(), m = E.metrics(st), held = S.held ? F(S.held, 2) : '0';
    put($('#tiles'), [
      h('div', { class: 'tile' }, h('b', {}, S.n), h('span', {}, t(now ? 'tMsgs' : 'tMsgsR'))),
      h('div', { class: 'tile good' }, h('b', {}, S.a), h('span', {}, t('tDone'))),
      now && m.waiting ? h('button', { type: 'button', class: 'tile wait', id: 'tileWait', 'data-fk': 'tileWait', title: t('tWaitTip'), onclick: () => { roleFilter = null; filter = 'need'; render(); } }, h('b', {}, m.waiting), h('span', {}, t('tWait')))
        : h('div', { class: 'tile' }, h('b', {}, S.b), h('span', {}, t('tDecided') + (S.w ? ' · ' + t('nWaiting', { n: S.w }) : ''))),
      h('div', { class: 'tile' }, h('b', {}, held), h('span', {}, t('tHeld')))]);
    put($('#summary'), [h('span', {}, h('span', { class: 'w' }, now ? t('sumLine', { w: m.waiting, held: held, m: S.n }) : t('sumRange', { m: S.n, a: S.a, b: S.b, w: S.w, held })))]);
    renderChart(S);
    $('#exNote').hidden = now;
    const keep = e => !roleFilter || roleOfEntry(e) === roleFilter, base = flat.filter(keep), needN = base.filter(e => chipKind(e).k === 'wait').length;
    put($('#filters'), [['all', t('fAll')], ['need', t('fNeed', { n: needN })], ['done', t('fDone')]].map(([k, label]) =>
      h('button', { type: 'button', id: 'f-' + k, 'data-fk': 'f-' + k, 'aria-pressed': String(filter === k), onclick: () => { filter = k; render(); } }, label)));
    put($('#roleChipBox'), roleFilter ? [pill(t('onlyX', { x: roleName(roleFilter) }), 'roleX', () => { roleFilter = null; render(); })] : []);
    const pass = e => filter === 'need' ? chipKind(e).k === 'wait' : filter === 'done' ? ['done', 'decided'].includes(chipKind(e).k) : true;
    const box = $('#list'), sc = pageScroll.matches ? $('#view-inbox') : box, h0 = sc.scrollHeight, s0 = sc.scrollTop, nodes = [];
    for (const g of groups) {   // a past range is grouped by day, newest first, with a sticky day header
      const l = g.entries.filter(keep).filter(pass); if (!l.length) continue;
      if (!now) nodes.push(h('div', { class: 'dayhd' }, t('dayHdr', { day: U.dayLong(lang, g.date), n: l.length, ns: F(l.length, 0) })));
      for (const e of l) nodes.push(rowNode(e));
    }
    if (!nodes.length) nodes.push(h('div', { class: 'empty' }, t(!flat.length ? (now ? 'emptyAll' : 'emptyRange') : roleFilter && filter === 'all' ? 'emptyRole' : filter === 'need' ? 'emptyNeed' : filter === 'done' ? 'emptyDone' : 'emptyAll')));
    if (put(box, nodes) && s0 > 0) sc.scrollTop = s0 + (sc.scrollHeight - h0);   // a new entry on top must not push what is being read
    renderDetail(flat);
    $('#view-inbox').dataset.pane = pane;
    const app = $('#app'), chrome = $('.hd').offsetHeight + $('.ft').offsetHeight + 28;   // the detail beside a page-scrolling list fills what the header and footer leave
    if (app._ch !== chrome) { app._ch = chrome; app.style.setProperty('--chrome-h', chrome + 'px'); }
    const intro = $('#intro'); if (intro.dataset.gone !== '1') intro.hidden = false;   // "Got it" lasts for the visit: the site stores only the language
  }
  function pill(label, id, fn) { return h('button', { type: 'button', class: 'pill', id, 'data-fk': id, 'aria-label': label + ' (' + t('removeFilter') + ')', onclick: fn }, label, (() => { const s = svg('close'); return s; })()); }
  function rowNode(e) {
    const inf = sender(e), c = chipKind(e), sel = e.id === selected, fr = (fresh.get(e.id) || 0) > Date.now();
    return h('button', { type: 'button', class: 'row' + (fr ? ' fresh' : '') + (sel ? ' sel' : ''), 'data-id': e.id, 'data-fk': 'row:' + e.id, 'aria-current': sel ? 'true' : null, onclick: () => select(e.id) },
      h('span', { class: 'ic' }, svg(iconOf(channelOf(e)))),
      h('span', { class: 'rb' }, h('span', { class: 'r1' }, h('b', {}, inf.name), h('span', { class: 'pl' }, inf.place), h('time', {}, e.at)), h('span', { class: 'r2' }, lineOf(e)), h('span', { class: 'r3' }, chipNode(c))));
  }
  function select(id) { if (narrow.matches && pane === 'list') listScroll = $('#view-inbox').scrollTop; selected = id; userChose = true; pickDone = true; pane = 'detail'; render(); }

  // ---- the detail
  function recText(e) {
    if (e.action === 'read') {
      const m = e.text.match(/^Read by (.+?)(?: in ([\d.]+) s)?\.$/);
      if (m) { const by = /answer key/.test(m[1]) ? t('byKey') : m[1]; return m[2] ? t('readLine', { by, s: I.num(lang, m[2]) }) : t('readLineNo', { by }); }
    }
    if (e.action === 'message') { const m = e.text.match(/^(.+?) → (.+?): ([\s\S]*)$/); if (m) return who(m[1]) + ' → ' + who(m[2]) + ': ' + tr(m[3]); }
    return tr(e.text);
  }
  function renderDetail(flat) {
    const box = $('#detail'), e = flat.find(x => x.id === selected);
    if (!e) { put(box, [h('p', { class: 'empty' }, t('readingFirst'))]); lastDetail = null; return; }
    const node = buildDetail(e), changed = put(box, [node]);
    if (lastDetail !== selected) { box.scrollTop = 0; lastDetail = selected; if (narrow.matches && pane === 'detail') $('#view-inbox').scrollTop = 0; }
    return changed;
  }
  function buildDetail(e) {
    // Three parts: the heading, the decisions (a column of their own on wide screens, so the buttons are always in view;
    // right under the heading elsewhere), and the story (the message, NowAI at work, drafts).
    if (isHist(e)) return histDetail(e);
    const inf = sender(e), c = chipKind(e), ch = channelOf(e), it = e.it, top = [], side = [], body = [];
    top.push(h('div', { class: 'dhead glass' }, h('div', {},h('h2', {}, inf.name), h('p', { class: 'meta' }, [inf.place, t('ch_' + ch), e.at].filter(Boolean).join(' · '))), chipNode(c)));
    if (e.kind === 'item' && it.status === 'failed') top.push(h('div', { class: 'failbox' }, h('span', {}, t('readFailed')), h('button', { type: 'button', class: 'btn', id: 'readAgain', 'data-fk': 'readAgain', onclick: () => { if (E.retryItem(st, it.id)) read(it); } }, t('readAgain'))));
    const gs = gatesOf(e), waiting = gs.filter(g => g.status === 'waiting'), decided = gs.filter(g => g.status === 'decided').reverse(), withdrawn = gs.filter(g => g.status === 'withdrawn');
    body.push(e.kind === 'check' ? foundSection() : messageSection(e));
    const refs = refsOf(e), rec = entryRecord(e);
    body.push(workSection(e, rec));
    for (const g of waiting) side.push(waitPanel(g));
    for (const g of decided) side.push(decidedPanel(g));
    for (const g of withdrawn) side.push(h('div', { class: 'dec done glass' }, h('p', { class: 'chosen' }, g.note ? tr(g.note) : tr(g.title))));
    const ds = st.drafts.filter(d => refs.includes(d.ref));
    if (ds.length) body.push(h('div', { class: 'dsec' }, h('h3', {}, t('secDrafts')), h('div', { class: 'drafts' }, ds.map(draftNode))));
    body.push(h('div', {}, h('button', { type: 'button', class: 'linkbtn', id: 'toRecord', 'data-fk': 'toRecord', onclick: () => { recFilter = e.id; setView('record'); } }, t('recLink', { n: rec.length }))));
    return h('div', { class: 'din' + (side.length ? '' : ' noside') }, h('div', { class: 'dtop' }, top), side.length ? h('div', { class: 'dside' }, side) : null, h('div', { class: 'dbody' }, body));
  }
  // a past entry: read-only. Who sent it, the one line, the outcome, any money held, and its steps as a timeline.
  function histDetail(e) {
    const x = e.h, inf = sender(e), c = chipKind(e), p = people[x.decidedBy], day = histDay.get(x.date), lines = x.steps.map(n => day.record[n - 1]);
    const head = h('div', { class: 'dhead glass' }, h('div', {}, h('h2', {}, inf.name), h('p', { class: 'meta' }, [inf.place, t('ch_' + x.channel), U.dayShort(lang, x.date) + ' · ' + x.at].filter(Boolean).join(' · '))), chipNode(c));
    const out = h('div', { class: 'dec done glass' },
      p ? h('div', { class: 'who' }, h('span', { class: 'av' }, N(p.name)[0]), h('span', {}, h('b', {}, N(p.name)), h('span', { class: 'job' }, jobOf(p)))) : null,
      h('p', { class: 'chosen' + (p ? '' : ' first') }, p ? t('outDecided', { name: N(p.name), choice: tr(x.choice) }) : t('outDone')),
      x.heldAmount ? h('p', { class: 'held' }, t('heldLine', { x: F(x.heldAmount) })) : null);
    const steps = h('div', { class: 'dsec glass hsteps' }, h('h3', {}, t('secSteps')),
      h('ol', { class: 'tl' }, lines.map(r => h('li', {}, h('time', {}, r.at), h('span', {}, h('span', { class: 'chip role' }, whoRec(r.by)), recText(r))))));
    const link = h('div', {}, h('button', { type: 'button', class: 'linkbtn', id: 'toRecord', 'data-fk': 'toRecord', onclick: () => { recFilter = e.id; setView('record'); } }, t('recLink', { n: lines.length })));
    return h('div', { class: 'din noside' }, h('div', { class: 'dtop' }, head),
      h('div', { class: 'dbody' }, h('div', { class: 'bubble' }, h('blockquote', {}, lineOf(e))), out, steps, link, h('p', { class: 'exnote' }, t('exHist'))));
  }
  // "NowAI at work": the orb and one short white chip per step, written from the same Record lines the full timeline shows
  function chipText(r, e) {
    const gate = r.data && r.data.gate && st.gate.find(g => g.id === r.data.gate);
    if (r.action === 'read') { if (/answer key/.test(r.text)) return t('chipReadKey'); const m = r.text.match(/ in ([\d.]+) s\.$/); return m ? t(chipPhoto(e) ? 'chipReadPhoto' : 'chipRead', { s: I.num(lang, m[1]) }) : t('chipReadNo'); }
    if (r.action === 'gate.ask' && gate) return t('cWait', { x: N(people[gate.who].name) });
    if (r.action === 'gate.decide' && gate) return t('cDecided', { x: N(people[gate.who].name) });
    if (r.action === 'priced') { const m = r.text.match(/([\d,]+\.\d+) AZN with/); if (m) return who(r.by) + ': ' + t('chipPriced', { x: I.num(lang, m[1]) }); }
    if (r.action === 'message') { const m = r.text.match(/^(.+?) → (.+?): /); if (m) return who(m[1]) + ' → ' + who(m[2]); }   // the step's name; the sentence is in the title and in "Show every step"
    return short(who(r.by) + ': ' + recText(r).replace(/\.$/, ''), 40);
  }
  function short(s, n) { if (s.length <= n) return s; const c = s.slice(0, n - 1), i = c.lastIndexOf(' '); return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[,:;]$/, '') + '…'; }
  const chipPhoto = e => e.kind === 'item' && channelOf(e) === 'photo';
  const chipIcon = (r, e) => r.action === 'read' ? (chipPhoto(e) ? 'photo' : 'file') : r.action === 'gate.ask' ? 'staff' : r.action === 'message' ? 'whatsapp' : r.action === 'draft' ? 'email' : 'check';
  function workSection(e, rec) {
    const open = stepsOpen.has(e.id), first = !chipSeen.has(e.id), seenSet = chipSeen.get(e.id) || new Set(), now = Date.now(), chips = [];
    chipSeen.set(e.id, seenSet);
    const steps = [];   // one chip per step; a question and its answer between the same two roles share one chip; the stock line stays in the full timeline
    for (const r of rec) {
      if (r.action === 'arrived' || r.action === 'stock') continue;
      const m = r.action === 'message' && r.text.match(/^(.+?) → (.+?): /), pair = m && [m[1], m[2]].sort().join('|'), last = steps[steps.length - 1];
      if (m && last && last.pair === pair) { last.rs.push(r); last.both = true; } else steps.push({ rs: [r], pair, both: false });
    }
    for (const s of steps) {
      const r = s.rs[0], k = s.rs[s.rs.length - 1].n, key = e.id + ':' + k;
      if (!first && !seenSet.has(k) && loaded) chipNew.set(key, now + 1200);
      s.rs.forEach(x => seenSet.add(x.n));
      const label = s.both ? chipText(r, e).replace(' → ', ' ↔ ') : chipText(r, e);
      chips.push(h('li', { class: (chipNew.get(key) || 0) > now ? 'new' : null, title: s.rs.map(x => x.at + ' · ' + who(x.by) + ': ' + recText(x)).join('\n') }, svg(chipIcon(r, e)), h('span', {}, label)));
    }
    if (e.kind === 'item' && e.it.status === 'reading') chips.push(h('li', { title: t('cReading') }, svg('file'), h('span', {}, t('cReading'))));
    return h('div', { class: 'atwork glass' }, h('span', { class: 'orb', 'aria-hidden': 'true' }),
      h('div', { class: 'wk-b' }, h('p', { class: 'wk-t' }, t('secWork')), h('ul', { class: 'chips' }, chips),
        h('button', { type: 'button', class: 'linkbtn wk-tog', id: 'stepsBtn', 'data-fk': 'stepsBtn', 'aria-expanded': String(open), 'aria-controls': 'stepsList', onclick: () => { if (stepsOpen.has(e.id)) stepsOpen.delete(e.id); else stepsOpen.add(e.id); render(); } }, t(open ? 'hideSteps' : 'showSteps')),
        h('ol', { class: 'tl', id: 'stepsList', hidden: !open }, rec.map(r => h('li', {}, h('time', {}, r.at), h('span', {}, h('span', { class: 'chip role' }, whoRec(r.by)), recText(r)))))));
  }
  function waitPanel(g) {
    const p = people[g.who], ups = st.messages.filter(m => m.ref === g.ref && m.from === 'Collections' && m.to === 'Sales Desk');
    return h('div', { class: 'dec glass', 'data-gate': g.id },
      h('div', { class: 'who' }, h('span', { class: 'av' }, N(p.name)[0]), h('span', {}, h('b', {}, N(p.name)), h('span', { class: 'job' }, jobOf(p)))),
      h('p', { class: 'as' }, t('decideAs', { name: N(p.name) })),
      h('h3', {}, tr(g.title)),
      g.evidence && g.evidence.length ? h('ul', {}, g.evidence.map(x => h('li', {}, tr(x)))) : null,
      ups.length > 1 ? h('p', { class: 'upd' }, t('updatedAt', { at: ups[ups.length - 1].at }) + ': ' + tr(ups[ups.length - 1].text)) : null,
      h('div', { class: 'acts' }, g.choices.map(c => h('button', { type: 'button', class: 'btn ' + (c.primary ? 'pri' : 'out'), id: 'ch-' + g.id + '-' + c.id, 'data-fk': 'ch-' + g.id + '-' + c.id, 'data-choice': c.id, onclick: () => decide(g.id, c.id) }, choiceLabel(c)))));
  }
  const choiceLabel = c => tr(c.label) + (c.amount ? ' (' + F(c.amount, 0) + ' AZN)' : '');
  function decidedPanel(g) {
    const p = people[g.who], c = g.choices.find(x => x.id === g.choice), o = outcomes[g.id];
    const after = o ? st.record.slice(o[0], o[1]).filter(r => r.action !== 'gate.decide') : [];
    return h('div', { class: 'dec done glass' },
      h('div', { class: 'who' }, h('span', { class: 'av' }, N(p.name)[0]), h('span', {}, h('b', {}, N(p.name)), h('span', { class: 'job' }, jobOf(p)))),
      h('p', { class: 'chosen' }, t('chose', { name: N(people[g.by || g.who].name), choice: choiceLabel(c), at: g.decidedAt })),
      after.length ? [h('p', { class: 'nxt' }, t('nextHappened')), h('ul', { class: 'mini' }, after.map(r => h('li', { title: r.at + ' · ' + recText(r) }, h('time', {}, r.at), recText(r))))] : null);
  }
  function msgLang(it) {
    const r = it.reading && it.reading.language; if (r) return r;
    return /[а-яё]/i.test(it.text) ? 'ru' : /[əıöüşçğ]|\b(salam|sabah|lazım|kisə|sifariş)/i.test(it.text) ? 'az' : 'en';
  }
  function messageSection(e) {
    const it = e.it;
    if (it.from === 'bank') {
      const total = W.bank.lines.reduce((s, l) => s + l.amount, 0), isM = l => st.bank.matched.some(x => x.payer === l.payer && x.amount === l.amount);
      return h('div', { class: 'bubble' }, h('span', { class: 'bk' }, t('secFile')), t('bankSummary', { file: W.bank.file, n: W.bank.lines.length, x: F(total) }),
        h('details', { class: 'pay' }, h('summary', {}, t('showPayments', { n: W.bank.lines.length })),
          h('table', { class: 'kv' }, h('thead', {}, h('tr', {}, h('th', {}, t('thPayer')), h('th', {}, t('thRef')), h('th', { class: 'n' }, 'AZN'), h('th', {}, t('thStatus')))),
            h('tbody', {}, W.bank.lines.map(l => h('tr', { class: isM(l) ? '' : 'open' }, h('td', {}, N(l.payer)), h('td', {}, l.ref || t('noRef')), h('td', { class: 'n' }, F(l.amount)), h('td', {}, isM(l) ? t('payMatched') : t('payOpen'))))))));
    }
    const L = msgLang(it), ev = W.morning.find(x => x.id === it.id) || {}, sum = it.reading && it.reading.summary;
    let tl = null, tlLabel = null;
    if (L !== lang) {
      if (lang === 'ru' && ev.textRu) { tl = ev.textRu; tlLabel = t('inRussian'); }
      else if (L !== 'en' && (it.textEn || sum)) { tl = it.textEn || sum; tlLabel = t('inEnglish'); }
    }
    const atts = [], src = it.file, blob = fileBlobs[it.id];
    const photo = blob && isImg(it) ? blobUrl(it.id) : /\.(jpe?g|png|webp)$/i.test(src || '') ? src : null;
    const sample = ev.sample ? tr(ev.sample) : '';
    const thumb = (u, alt) => h('button', { type: 'button', class: 'thumb', id: 'thumb-' + atts.length, 'data-fk': 'thumb-' + atts.length, 'aria-label': t('openPhoto'), onclick: () => openOverlay(u, alt, sample) }, h('img', { src: u, alt }));
    if (photo) atts.push(thumb(photo, t('photoAlt')));
    if (it.photo) atts.push(thumb(it.photo, t('photoAlt')));
    if (isPdf(it)) {
      const pdf = blob ? blobUrl(it.id) : src;
      if (!blob) atts.push(thumb(src.replace(/\.pdf$/i, '_p1.jpg'), t('pdfAlt')));
      atts.push(h('a', { class: 'lnk', href: pdf, target: '_blank', rel: 'noopener', id: 'pdfLink' }, t('openPdf')));
    } else if (blob && !isImg(it)) atts.push(h('span', {}, t('fileAlt') + ': ' + it.file));
    return h('div', { class: 'bubble' },
      it.channel === 'voice' && it.seconds ? h('span', { class: 'bk' }, t('voiceLen', { len: '0:' + String(it.seconds).padStart(2, '0') })) : null,
      it.subject ? h('span', { class: 'bk' }, h('b', {}, it.subject)) : null,
      it.text ? h('blockquote', { lang: L }, it.text) : null,
      tl ? h('p', { class: 'tr' }, h('b', {}, tlLabel + ': '), tl) : null,
      atts.length ? h('div', { class: 'atts' }, atts) : null);
  }
  function foundSection() {
    const rows = [];
    for (const c of overdueCases()) {
      const cu = st.customers[c.customer], inv = c.type === 'overdue' ? c : c.overdue, p = { name: N(cu.name), inv: inv.inv, x: F(inv.amount || c.amount), late: inv.late };
      if (c.type === 'promise') rows.push(h('li', {}, t('foundPromised', { ...p, day: I.day(lang, c.day) })));
      else if (c.status === 'reminder drafted') rows.push(h('li', {}, t('foundReminder', p)));
    }
    return h('div', { class: 'bubble' }, h('span', { class: 'bk' }, t('secFound')), rows.length ? h('ul', { class: 'found' }, rows) : t('foundNone'));
  }
  function draftNode(d) {
    const own = d.lang === 'az' ? d.text : tr(d.text), withdrawn = d.status === 'withdrawn';
    const trn = d.lang === 'az' && d.en && lang !== 'az' ? (lang === 'en' ? d.en : tr(d.en)) : null;
    return h('div', { class: 'draft glass' }, h('div', { class: 'dh' }, h('span', {}, h('b', {}, tr(d.kind)), ' · ' + t('draftTo', { x: N(d.to) }) + ' · ' + d.at), withdrawn ? h('span', { class: 'chip tag' }, t('cWithdrawn')) : null),
      h('p', { lang: d.lang }, own), trn ? h('p', { class: 'tr' }, h('b', {}, (lang === 'en' ? t('inEnglish') : t('inRussian')) + ': '), trn) : null);
  }

  // ------------------------------------------------------------ Team
  const READS = { 'photo-list': 'sales', 'supplier-invoice': 'payables', 'voice-text': 'care' };
  function renderTeam(es) {
    const nodes = [], lines = rangeLines(), live = incToday(), multi = multiDay(), hs = histIn(), dm = d => U.rangeShort(lang, d, d);
    for (const r of W.roles) {
      const name = r.name;
      if (r.id === 'brief') {
        if (!live) continue;
        const b = E.brief(st);
        nodes.push(h('div', { class: 'rcard brief' }, h('div', { class: 'top' }, h('span', { class: 'nm' }, roleName(r.id)), h('span', { class: 'state' }, t('briefFor', { name: N(b.for), at: b.at }))),
          h('span', { class: 'does' }, I.does(lang, r.id, r.does) + '.'),
          h('div', { class: 'bl' }, b.lines.map(l => h('div', { class: l.warn ? 'warn' : '' }, tr(l.k), h('b', {}, tr(l.v)))))));
        continue;
      }
      const steps = lines.filter(x => x.r.by === name), last3 = steps.slice(-3).reverse(), asked = steps.filter(x => x.r.action === 'gate.ask').length;
      let n = hs.reduce((s, d) => s + d.entries.filter(x => x.role === r.id).length, 0), state = null;
      if (live) {
        const v = E.roleView(st, r.id), wait = [...new Set(v.gate.map(g => g.who))];
        n += v.items.length + (r.id === 'collections' && st.released.includes('m4') ? 1 : 0);
        const working = st.items.some(i => i.status === 'reading' && READS[i.read] === r.id) || (st.record.filter(x => x.by === name).length && st.clock - E.toMin(st.record.filter(x => x.by === name).slice(-1)[0].at) <= 3);
        const k = wait.length ? 'wait' : working ? 'work' : 'quiet';
        state = h('span', { class: 'state' }, h('span', { class: 'dot ' + k }), k === 'wait' ? t('teamWait', { x: wait.map(x => N(people[x].name)).join(', ') }) : k === 'work' ? t('teamWorking') : t('teamQuiet'));
      }
      nodes.push(h('button', { type: 'button', class: 'rcard', id: 'role-' + r.id, 'data-fk': 'role-' + r.id, title: t('openRole'), onclick: () => { roleFilter = r.id; filter = 'all'; setView('inbox'); } },
        h('span', { class: 'top' }, h('span', { class: 'nm' }, roleName(r.id)), state),
        h('span', { class: 'does' }, I.does(lang, r.id, r.does) + '.'),
        h('span', { class: 'today' }, t('rcCounts', { n, ns: F(n, 0), m: asked, ms: F(asked, 0) })),
        h('span', { class: 'ls' }, h('span', { class: 'h' }, t('lastSteps')), last3.length ? last3.map(x => h('span', { class: 'st' }, h('time', {}, (multi ? dm(x.date) + ' ' : '') + x.r.at), h('span', {}, recText(x.r)))) : h('span', { class: 'st' }, t('noSteps')))));
    }
    put($('#team'), nodes);
  }
  function rangeLines() {   // every Record line of the range, oldest first
    const out = [];
    for (const d of histIn()) for (const r of d.record) out.push({ date: d.date, r });
    if (incToday()) for (const r of st.record) out.push({ date: TODAY, r });
    return out;
  }

  // ------------------------------------------------------------ the bars for a range: per working day, handled by NowAI alone / decided by people
  function renderChart(S) {
    const box = $('#chartBox'), days = S.days, show = multiDay() && days.length > 0;
    box.hidden = !show; if (!show) return;
    const n = days.length, L = 34, T = 18, PH = 64, B = 46, HH = T + PH + B;
    // the days share the box's width (at least 32 px a day; a narrow box scrolls sideways)
    const slot = Math.max(32, Math.floor((box.clientWidth - 28 - L - 8) / n) || 32), WW = L + n * slot + 8;
    const mx = Math.max(4, ...days.map(d => Math.max(d.n, d.a + d.b))), top = Math.ceil(mx / 4) * 4, y = v => T + PH - (v / top) * PH;
    const sv = (tag, a, ...k) => { const el = document.createElementNS(NS, tag); for (const [kk, v] of Object.entries(a || {})) el.setAttribute(kk, v); for (const x of k.flat()) if (x != null) el.append(x); return el; };
    const parts = [];
    for (const v of [0, top / 2, top]) parts.push(sv('line', { x1: L, x2: WW - 4, y1: y(v), y2: y(v), class: v ? 'gl' : 'gl base' }), sv('text', { x: L - 6, y: y(v) + 4, class: 'ax', 'text-anchor': 'end' }, String(v)));
    let prevMonth = '';
    const tipOf = d => t('chTip', { day: U.dayShort(lang, d.date), n: d.n, a: d.a, b: d.b, w: d.w });
    const setTip = s => { const el = $('#chTitleTxt'); if (el) el.textContent = s || t('chTitle'); };
    days.forEach((d, i) => {
      const cx = L + i * slot + slot / 2, bw = Math.min(44, Math.round(slot * .58)), tot = d.a + d.b, all = Math.max(d.n, tot), month = U.rangeShort(lang, d.date, d.date).split(' ')[1];
      if (d.a) parts.push(sv('rect', { x: cx - bw / 2, y: y(d.a), width: bw, height: (d.a / top) * PH, rx: 3, class: 'b-done' }));
      if (d.b) parts.push(sv('rect', { x: cx - bw / 2, y: y(tot), width: bw, height: (d.b / top) * PH, rx: 3, class: 'b-dec' }));
      if (all > tot) parts.push(sv('rect', { x: cx - bw / 2, y: y(all), width: bw, height: ((all - tot) / top) * PH, rx: 3, class: 'b-wait' }));   // waiting for a person or being read
      parts.push(sv('text', { x: cx, y: y(all) - 5, class: 'bv', 'text-anchor': 'middle' }, String(all)),
        sv('text', { x: cx, y: T + PH + 15, class: 'xl', 'text-anchor': 'middle' }, String(+d.date.slice(8))), sv('text', { x: cx, y: T + PH + 28, class: 'xl2', 'text-anchor': 'middle' }, U.wdShort(lang, d.date)));
      if (month !== prevMonth) { parts.push(sv('text', { x: cx, y: T + PH + 40, class: 'xl2 mo', 'text-anchor': 'middle' }, month)); prevMonth = month; }
      const tip = tipOf(d), hit = sv('rect', { x: L + i * slot, y: 0, width: slot, height: HH, class: 'hit', tabindex: 0, role: 'img', 'aria-label': tip });
      hit.addEventListener('mouseenter', () => setTip(tip)); hit.addEventListener('focus', () => setTip(tip)); hit.addEventListener('click', () => setTip(tip));
      hit.addEventListener('mouseleave', () => setTip(null)); hit.addEventListener('blur', () => setTip(null));
      parts.push(hit);
    });
    const lg = (c, label) => h('span', { class: 'lg' }, h('i', { class: 'sw ' + c }), label);
    put(box, [h('div', { class: 'chhd' }, h('span', { class: 'chtitle', id: 'chTitleTxt', 'aria-live': 'polite' }, t('chTitle')), h('span', { class: 'legend' }, lg('done', t('lgDone')), lg('dcd', t('lgDecided')), days.some(d => d.n > d.a + d.b) ? lg('wt', t('lgWait')) : null)),
      h('div', { class: 'chscroll' }, sv('svg', { width: WW, height: HH, viewBox: '0 0 ' + WW + ' ' + HH, role: 'group', 'aria-label': t('chTitle'), class: 'chart' }, parts))]);
  }

  // ------------------------------------------------------------ Record: one scrolling list for the range, grouped by day
  const CHUNK = 160;
  const KIND_LBL = { order: 'kOrder', 'supplier-invoice': 'kInvoice', invoice: 'kInvoice', promise: 'kPromise', damage: 'kDamage', leave: 'kLeave', bank: 'kBank', check: 'kCheck' };
  const ACT_ICON = { arrived: 'arrive', reread: 'arrive', read: 'eye', priced: 'check', stock: 'check', checked: 'check', damage: 'check', overdue: 'check', matched: 'check', promise: 'check', leave: 'check', confirmed: 'check', 'gate.ask': 'staff', 'gate.decide': 'decide', draft: 'doc' };
  const baseBy = by => String(by).replace(/ \(role-play\)$/, '');
  let recRows = [], recDrawn = 0, recLastDate = null, recDayN = new Map(), recEsMap = new Map(), recBase = null, recPrevLen = 0;
  function roleClass(by) { const b = baseBy(by), r = W.roles.find(x => x.name === b); return r ? 'rc-' + r.id : b === 'Intake' ? 'rc-intake' : b === 'NowAI' ? 'rc-nowai' : 'rc-person'; }
  function rowText(r) {
    if (r.live) return recText(r);
    const k = r.date + '#' + r.n + '#' + lang; let s = textMemo.get(k);
    if (s == null) { s = recText(r); textMemo.set(k, s); }
    return s;
  }
  function refLabel(ref) {
    const x = histEntry.get(ref), e = x ? null : recEsMap.get(ref); if (!x && !e) return '';
    let k = 'kOther';
    if (x) k = KIND_LBL[x.kind] || 'kOther'; else if (e.kind === 'check') k = 'kCheck'; else if (e.it.from === 'bank') k = 'kBank'; else { const cs = caseOf(e.it); k = (cs && KIND_LBL[cs.type]) || 'kOther'; }
    return sender(x ? wrap(x) : e).name + ' · ' + t(k);
  }
  function allRecordRows(es) {   // newest day first, newest line first inside a day
    const rows = [];
    if (incToday()) {
      const tm = new Map(); for (const e of es) for (const r of entryRecord(e)) if (!tm.has(r.n)) tm.set(r.n, e.id);
      for (let i = st.record.length - 1; i >= 0; i--) { const r = st.record[i]; rows.push({ date: TODAY, n: r.n, at: r.at, by: r.by, action: r.action, text: r.text, ref: tm.get(r.n) || null, seal: seals[r.n - 1] || '', live: true }); }
    }
    for (const d of histIn().slice().reverse()) for (let i = d.record.length - 1; i >= 0; i--) { const r = d.record[i]; rows.push({ date: d.date, n: r.n, at: r.at, by: r.by, action: r.action, text: r.text, ref: r.ref, seal: r.seal, live: false }); }
    return rows;
  }
  function sealState(date) { const s = sealByDay.get(date); return !s || (date === TODAY && s.len !== st.record.length) ? null : s; }
  function dayHeadRec(date) {
    const s = sealState(date), n = recDayN.get(date) || 0;
    return h('div', { class: 'rday' }, h('b', {}, U.dayLong(lang, date)), h('span', { class: 'rdn' }, ' · ' + t('stepsN', { n, ns: F(n, 0) })),
      h('span', { class: 'rds' + (s ? (s.bad ? ' bad' : ' ok') : '') }, s ? h('i', { class: 'sdot' }) : null, s ? (s.bad ? t('sealDayBad', { n: s.bad }) : t('sealDayOk')) : t('seal1')));
  }
  function recRow(r) {
    const label = r.ref ? refLabel(r.ref) : '';
    return h('div', { class: 'rr' },
      h('time', { class: 'rt' }, r.at), h('span', { class: 'ri' }, svg(ACT_ICON[r.action] || 'dots')),
      h('span', { class: 'chip rl ' + roleClass(r.by) }, whoRec(r.by)),
      h('span', { class: 'rx' }, rowText(r)),
      label ? h('button', { type: 'button', class: 'eref', 'data-ref': r.ref, title: t('recOpenEntry') }, label) : h('span', { class: 'eref none' }),
      h('code', { class: 'rseal', title: r.seal || '' }, r.seal ? r.seal.slice(0, 8) : '…'));
  }
  function appendRows(to) {
    const box = $('#recList'), frag = document.createDocumentFragment();
    for (let i = recDrawn; i < to; i++) { const r = recRows[i]; if (r.date !== recLastDate) { frag.append(dayHeadRec(r.date)); recLastDate = r.date; } frag.append(recRow(r)); }
    recDrawn = Math.max(recDrawn, to); box.append(frag);
  }
  function renderRecord(es, flat) {
    if (recFilter && !flat.some(x => x.id === recFilter)) recFilter = null;
    const all = allRecordRows(es), bys = [...new Set(all.map(r => baseBy(r.by)))], order = [...W.roles.map(r => r.name), 'Intake', 'NowAI'];
    bys.sort((a, b) => { const x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || a.localeCompare(b); });
    if (recRole && !bys.includes(recRole)) recRole = '';
    const sel = $('#recRole'), osig = bys.join('|') + lang;
    if (sel._sig !== osig) { sel.replaceChildren(h('option', { value: '' }, t('recRoleAll')), ...bys.map(b => h('option', { value: b }, who(b)))); sel._sig = osig; }
    sel.value = recRole;
    const fe = recFilter && flat.find(x => x.id === recFilter), tset = fe && !isHist(fe) ? new Set(entryRecord(fe).map(x => x.n)) : null;
    recEsMap = new Map(es.map(e => [e.id, e]));
    let rows = all;
    if (recFilter) rows = rows.filter(r => r.live ? (tset && tset.has(r.n)) : r.ref === recFilter);
    if (recRole) rows = rows.filter(r => baseBy(r.by) === recRole);
    const norm = s => String(s).toLocaleLowerCase(lang).replace(/(\d)[\s\u00a0\u202f,](?=\d{3}(?!\d))/g, '$1').replace(/(\d),(\d)/g, '$1.$2'), q = norm(recQ.trim());
    if (q) rows = rows.filter(r => norm(whoRec(r.by) + ' ' + rowText(r) + ' ' + (r.ref ? refLabel(r.ref) : '') + ' ' + U.dayLong(lang, r.date)).includes(q));
    const rl = rangeLabel(), narrowed = rows.length !== all.length;
    $('#recSub').textContent = narrowed ? t('recShowing', { range: rl, as: F(rows.length, 0), n: all.length, ns: F(all.length, 0) }) : t('recRange', { range: rl, n: all.length, ns: F(all.length, 0) });
    put($('#recChipBox'), fe ? [pill(t('onlyX', { x: sender(fe).name }), 'recX', () => { recFilter = null; render(); })] : []);
    if (sealNote && (sealNote.key !== range.from + '|' + range.to || (incToday() && sealNote.len !== st.record.length))) sealNote = null;
    const res = $('#sealRes'); res.textContent = sealNote ? sealNote.text : ''; res.className = 'sealres' + (sealNote && sealNote.bad ? ' bad' : '');
    const box = $('#recList'), base = [range.from, range.to, lang, recQ, recRole, recFilter].join('|'), sig = base + '|' + rows.length + '|' + seals.length + '|' + sealVer;
    if (recSig === sig) return; recSig = sig;
    const same = recBase === base, s0 = box.scrollTop, h0 = box.scrollHeight, grown = rows.length - recPrevLen;
    const wasDrawn = recDrawn;
    recBase = base; recPrevLen = rows.length; recRows = rows; recDayN = new Map(); for (const r of rows) recDayN.set(r.date, (recDayN.get(r.date) || 0) + 1);
    box.replaceChildren(); recDrawn = 0; recLastDate = null;
    if (!rows.length) {
      box.append(h('div', { class: 'recempty' }, h('b', {}, t('recNothing')), h('p', {}, t('recNothingSub')), (recQ || recRole || recFilter) ? h('button', { type: 'button', class: 'btn', id: 'recClear' }, t('recClear')) : null));
      return;
    }
    appendRows(Math.min(rows.length, same ? Math.max(CHUNK, wasDrawn + Math.max(0, grown)) : CHUNK));
    box.scrollTop = same && s0 > 0 ? s0 + (box.scrollHeight - h0) : 0;
  }
  // ---- Download Excel: the rows the Record shows now, a summary row per day, and what the file is
  async function saveFile(filename, blob) {   // the browser's own download: a short-lived link, clicked once and removed
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; a.hidden = true; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }
  function dlMsg(s) { const el = $('#dlRes'); el.textContent = s; clearTimeout(dlTimer); dlTimer = setTimeout(() => { el.textContent = ''; }, 9000); }
  async function downloadExcel() {
    const X = window.NOWAI_XLSX;
    if (!recRows.length) { dlMsg(t('dlNone')); return; }
    const es = buildEntries(), flatRows = recRows.slice().reverse();   // oldest first in the file
    const roleOfRef = ref => { const x = histEntry.get(ref), e = x ? null : recEsMap.get(ref); return x ? roleName(x.role) : e ? roleName(roleOfEntry(e)) : ''; };
    const B = k => ({ v: t(k), s: 'bold' });
    const rec = [[B('xlDate'), B('xlTime'), B('xlStep'), B('xlWho'), B('xlRole'), B('xlWhat'), B('xlEntry'), B('xlSeal')]];
    for (const r of flatRows) rec.push([{ v: X.day(r.date), s: 'date' }, { v: X.time(r.at), s: 'time' }, r.n, whoRec(r.by), r.ref ? roleOfRef(r.ref) : '', rowText(r), r.ref ? refLabel(r.ref) : '', r.seal || '']);
    const S = rangeStats(es), sum = [[B('xlDate'), B('xlMsgs'), B('tDone'), B('tDecided'), B('xlWaiting'), B('tHeld')]];
    for (const d of S.days) sum.push([{ v: X.day(d.date), s: 'date' }, d.n, d.a, d.b, Math.max(0, d.n - d.a - d.b), { v: d.held, s: 'money' }]);
    const filters = [recRole ? t('xlFWho', { x: who(recRole) }) : '', recQ.trim() ? t('xlFSearch', { x: recQ.trim() }) : '', recFilter ? t('xlFEntry', { x: refLabel(recFilter) || recFilter }) : ''].filter(Boolean);
    const about = [[B('xlAboutTitle')], [t('xlAbout1')], [t('xlAbout2')], [t('footL')], [''], [t('xlRange', { range: rangeLabel() + (isToday() ? ' · ' + U.dayShort(lang, TODAY) : '') + ' ' + range.to.slice(0, 4) })],
      [filters.length ? t('xlFilters', { x: filters.join(' · ') }) : t('xlNoFilter')], [t('xlSumNote')]];
    const blob = await X.write([
      { name: t('xlRecord'), rows: rec, widths: [12, 7, 9, 20, 20, 90, 30, 66], freeze: true, filter: true },
      { name: t('xlSummary'), rows: sum, widths: [12, 12, 26, 22, 12, 28], freeze: true },
      { name: t('xlAbout'), rows: about.map(r => r.map(c => typeof c === 'string' ? { v: c, s: 'wrap' } : c)), widths: [110] }]);
    const file = 'NowAI_Record_' + range.from + '_to_' + range.to + (filters.length ? '_filtered' : '') + '.xlsx';
    const res = await saveFile(file, blob);
    dlMsg(res === 'saved' ? t('dlSaved', { file }) : res === 'downloaded' ? t('dlDownloaded', { file }) : t('dlNot'));
  }

  // ------------------------------------------------------------ toast, overlay, menu, dialog
  function showToast(e) {
    $('#toastText').textContent = t('toastNew', { x: sender(e).name });
    $('#toast').hidden = false; $('#toast').dataset.id = e.id;
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 6000);
  }
  function hideToast() { clearTimeout(toastTimer); $('#toast').hidden = true; }
  let ovlFrom = null;
  function openOverlay(u, alt, cap) { ovlFrom = document.activeElement; $('#ovlImg').src = u; $('#ovlImg').alt = alt; $('#ovlCap').textContent = cap || ''; $('#ovl').hidden = false; $('#ovlClose').focus(); }
  function closeOverlay() { $('#ovl').hidden = true; $('#ovlImg').removeAttribute('src'); if (ovlFrom && document.contains(ovlFrom)) ovlFrom.focus(); }
  function closeMenu() { $('#menu').hidden = true; $('#moreBtn').setAttribute('aria-expanded', 'false'); }
  function toggleMenu() { const m = $('#menu'); closeDateMenu(); m.hidden = !m.hidden; $('#moreBtn').setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) $('#speed-normal').focus(); }
  function setMode(m) { mode = m; if (m === 'stop') stopTimer(); else startTimer(); render(); }

  function fillFrom() {
    const sel = $('#msgFrom'), was = sel.value;
    const opt = (v, label) => h('option', { value: v }, label);
    sel.replaceChildren(
      h('optgroup', { label: t('gCust') }, W.customers.map(c => opt(c.id, N(c.name) + ' · ' + N(c.where)))),
      h('optgroup', { label: t('gSup') }, W.suppliers.map(s => opt(s.id, s.name))),
      h('optgroup', { label: t('gStaff') }, W.staff.map(s => opt(s.id, N(s.name) + ' · ' + low(I.job(lang, s.job))))));
    sel.value = was || 'ferid';
  }
  let dlgFrom = null;
  function openDlg() { dlgFrom = document.activeElement; closeMenu(); $('#msgErr').hidden = true; $('#dlgScrim').hidden = false; $('#msgText').focus(); }
  function closeDlg() { $('#dlgScrim').hidden = true; if (dlgFrom && document.contains(dlgFrom)) dlgFrom.focus(); }
  function sendIn(ev) {
    ev.preventDefault();
    const tx = $('#msgText').value.trim(), file = $('#msgFile').files[0] || null;
    if (!tx && !file) { const er = $('#msgErr'); er.textContent = t('needText'); er.hidden = false; $('#msgText').focus(); return; }
    const from = $('#msgFrom').value, how = $('#msgHow').value;
    const ch = how === 'whatsapp' && W.staff.some(s => s.id === from) ? 'staff' : how;
    const kind = file && /pdf/i.test(file.type) && W.suppliers.some(s => s.id === from) ? 'supplier-invoice' : 'classify';
    const it = E.addItem(st, { channel: ch, from, text: tx, kind });
    if (file) { fileBlobs[it.id] = file; it.file = file.name; }
    mine.add(it.id); $('#msgText').value = ''; $('#msgFile').value = '';
    closeDlg(); filter = 'all'; roleFilter = null; view = 'inbox';
    for (const x of ['inbox', 'team', 'record']) $('#view-' + x).hidden = x !== 'inbox';
    if (!isToday()) setRange('today', TODAY, TODAY);
    read(it); select(it.id);
  }

  // ------------------------------------------------------------ start
  function setup() {
    for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => setView(b.dataset.view));
    for (const b of document.querySelectorAll('[data-l]')) b.addEventListener('click', () => { setLang(b.dataset.l); });
    for (const b of document.querySelectorAll('[data-speed]')) b.addEventListener('click', () => { setMode(b.dataset.speed); closeMenu(); });
    $('#restartBtn').addEventListener('click', () => { mode = 'normal'; closeMenu(); newDay(); });
    $('#moreBtn').addEventListener('click', toggleMenu);
    $('#newBtn').addEventListener('click', openDlg);
    $('#dlgCancel').addEventListener('click', closeDlg); $('#dlg').addEventListener('submit', sendIn);
    $('#dlgScrim').addEventListener('mousedown', e => { if (e.target === $('#dlgScrim')) closeDlg(); });
    $('#ovlClose').addEventListener('click', closeOverlay); $('#ovl').addEventListener('click', e => { if (e.target === $('#ovl')) closeOverlay(); });
    $('#backBtn').addEventListener('click', () => { pane = 'list'; render(); if (narrow.matches) $('#view-inbox').scrollTop = listScroll; });
    $('#introOk').addEventListener('click', () => { $('#intro').dataset.gone = '1'; $('#intro').hidden = true; });
    $('#toastOpen').addEventListener('click', () => {   // a new message always arrives today: go back to Today and open it
      const id = $('#toast').dataset.id; if (!isToday()) setRange('today', TODAY, TODAY); openEntry(id);
    });
    $('#sealBtn').addEventListener('click', () => { checkRange(); });
    $('#dateBtn').addEventListener('click', toggleDateMenu);
    $('#dateX').addEventListener('click', () => { setRange('today', TODAY, TODAY); $('#dateBtn').focus(); });
    for (const b of document.querySelectorAll('[data-preset]')) b.addEventListener('click', () => {
      const p = b.dataset.preset;
      if (p === 'custom') { const box = $('#customBox'); box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden) $('#dFrom').focus(); return; }
      setRange(p, PRESETS[p][0], PRESETS[p][1]); $('#dateBtn').focus();
    });
    $('#customBox').addEventListener('submit', applyCustom);
    $('#recQ').addEventListener('input', () => { clearTimeout(setup.qt); setup.qt = setTimeout(() => { recQ = $('#recQ').value; render(); }, 120); });
    $('#recRole').addEventListener('change', () => { recRole = $('#recRole').value; render(); });
    $('#dlBtn').addEventListener('click', downloadExcel);
    $('#recList').addEventListener('click', e => {
      const c = e.target.closest('.eref[data-ref]'); if (c) { openEntry(c.dataset.ref); return; }
      if (e.target.closest('#recClear')) { recQ = ''; recRole = ''; recFilter = null; $('#recQ').value = ''; render(); }
    });
    $('#recList').addEventListener('scroll', () => { const b = $('#recList'); if (recDrawn < recRows.length && b.scrollTop + b.clientHeight > b.scrollHeight - 900) appendRows(Math.min(recRows.length, recDrawn + CHUNK)); }, { passive: true });
    document.addEventListener('click', e => {
      if (!$('#menu').hidden && !e.target.closest('.morewrap')) closeMenu();
      if (!$('#dateMenu').hidden && !e.target.closest('.datewrap')) closeDateMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!$('#ovl').hidden) closeOverlay(); else if (!$('#dlgScrim').hidden) closeDlg(); else if (!$('#dateMenu').hidden) { closeDateMenu(); $('#dateBtn').focus(); } else if (!$('#menu').hidden) { closeMenu(); $('#moreBtn').focus(); } return; }
      if (e.key === 'Tab' && !$('#dlgScrim').hidden) {   // keep the keyboard inside the dialog
        const f = [...$('#dlg').querySelectorAll('select,textarea,input,button')].filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => { $('.hd')._sig = null; fitHeader(); });
    applyStatic(); newDay(); loadHistory();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
