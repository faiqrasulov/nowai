/* The NowAI workspace's engine. Plain code, no AI: it turns what arrives into work, does every sum, sends messages
   between roles, puts decisions at the Gate for named people, and applies what each decision changes. */
(function (root) {
  'use strict';

  const r2 = x => Math.round((x + 1e-9) * 100) / 100;
  const sum = (list, f) => r2(list.reduce((s, x) => s + f(x), 0));
  const fmt = (x, d = 2) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const azn = x => fmt(x) + ' AZN';
  const clone = x => JSON.parse(JSON.stringify(x));
  const toMin = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const toHHMM = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(Math.round(min % 60)).padStart(2, '0');

  // ---------------------------------------------------------------- the day
  function createDay(world, opts = {}) {
    const W = clone(world);
    const st = {
      world: W, clock: toMin(opts.start || '07:30'), seq: 0,
      items: [],          // everything that arrived: chats, emails, voice notes, files
      cases: {},          // the work each item became, by case id
      gate: [],           // decisions waiting for (or taken by) named people
      messages: [],       // role-to-role and role-to-person messages
      drafts: [],         // replies and documents prepared, never sent
      record: [],         // what happened, in order (sealed by the page)
      customers: Object.fromEntries(W.customers.map(c => [c.id, { ...c, open: c.open.map(o => ({ ...o })), promises: [] }])),
      stock: clone(W.stock.onHand), routes: clone(W.deliveries.routes),
      bank: { matched: [], unmatched: [], cashIn: 0 },
      holds: [],          // money held from suppliers
      released: [],       // morning events already released
      listeners: []
    };
    log(st, 'NowAI', 'day.start', 'The day starts: ' + W.company.weekday + ', ' + W.company.day + '.');
    return st;
  }

  const id = (st, p) => p + (++st.seq).toString(36).padStart(3, '0');
  const now = st => toHHMM(st.clock);
  const person = (st, pid) => st.world.people.find(p => p.id === pid);
  const roleName = (st, rid) => (st.world.roles.find(r => r.id === rid) || { name: rid }).name;
  const customer = (st, cid) => st.customers[cid];
  const balance = c => sum(c.open, o => o.amount);
  const itemByCode = (st, code) => st.world.items.find(i => i.code === code);
  function emit(st, what) { for (const f of st.listeners) try { f(what) } catch (e) { /* a screen error must not stop the day */ } }
  function log(st, by, action, text, data) { const e = { n: st.record.length + 1, at: now(st), by, action, text, data: data || null }; st.record.push(e); emit(st, { type: 'record', entry: e }); return e; }
  function say(st, from, to, text, ref) { const m = { id: id(st, 'msg'), at: now(st), from, to, text, ref: ref || null }; st.messages.push(m); emit(st, { type: 'message', msg: m }); log(st, from, 'message', from + ' → ' + to + ': ' + text, { ref }); return m; }
  function draft(st, kind, to, lang, text, ref, extra) { const d = { id: id(st, 'd'), at: now(st), kind, to, lang, text, ref, status: 'not sent', ...(extra || {}) }; st.drafts.push(d); log(st, 'NowAI', 'draft', 'Drafted ' + kind + ' for ' + to + ' (not sent).', { ref, draft: d.id }); emit(st, { type: 'draft', draft: d }); return d; }
  function ask(st, who, role, title, evidence, choices, ref, extra) {
    const g = { id: id(st, 'g'), at: now(st), who, role, title, evidence, choices, ref, status: 'waiting', ...(extra || {}) };
    st.gate.push(g); log(st, roleName(st, role), 'gate.ask', 'At the Gate for ' + person(st, who).name + ': ' + title, { gate: g.id, ref }); emit(st, { type: 'gate', gate: g }); return g;
  }

  // ---------------------------------------------------------------- the clock: the morning arrives
  // Releases every morning event due by `time` and returns the new items (those that need reading go to the AI).
  function advanceTo(st, time) {
    const t = typeof time === 'number' ? time : toMin(time), out = [];
    st.clock = Math.max(st.clock, t);
    for (const ev of [...st.world.morning].sort((x, y) => toMin(x.at) - toMin(y.at))) {   // in time order, whatever the list's order
      if (st.released.includes(ev.id) || toMin(ev.at) > st.clock) continue;
      st.released.push(ev.id);
      const at = st.clock; st.clock = toMin(ev.at);   // what it causes is stamped with the event's own time
      if (ev.does === 'overdue-check') overdueCheck(st);
      else if (ev.does === 'bank-file') bankFile(st, ev);
      else out.push(arrive(st, { ...ev }));
      st.clock = at;
    }
    emit(st, { type: 'clock', at: now(st) });
    return out;
  }

  function arrive(st, ev) {
    const it = { id: ev.id || id(st, 'in'), at: ev.at || now(st), channel: ev.channel, from: ev.from, read: ev.read, text: ev.text || '',
      textEn: ev.textEn || '', file: ev.file || null, photo: ev.photo || null, subject: ev.subject || '', seconds: ev.seconds || null,
      status: ev.read ? 'reading' : 'done', role: null, caseId: null, reading: null, live: !!ev.live };
    st.items.push(it);
    log(st, 'Intake', 'arrived', 'Arrived by ' + it.channel + ' from ' + fromName(st, it.from) + (it.file ? ' (with a file)' : '') + '.', { item: it.id });
    emit(st, { type: 'item', item: it });
    return it;
  }
  function fromName(st, from) {
    const c = st.customers[from]; if (c) return c.name + ' (' + c.where + ')';
    const s = st.world.suppliers.find(x => x.id === from); if (s) return s.name;
    const p = st.world.staff.find(x => x.id === from); if (p) return p.name + ' (' + p.job.toLowerCase() + ')';
    if (from === 'bank') return 'Bank statement';
    return from || 'someone';
  }

  // A typed item: arrives now, and is read like any other.
  function addItem(st, { channel, from, text, file, kind }) {
    return arrive(st, { id: id(st, 'live'), at: now(st), channel: channel || 'whatsapp', from: from || 'unknown', read: kind || 'classify', text, file, live: true });
  }

  // ---------------------------------------------------------------- what the AI read becomes work (all code)
  function applyReading(st, itemId, reading, meta = {}) {
    const it = st.items.find(i => i.id === itemId); if (!it) throw new Error('no item ' + itemId);
    it.reading = reading; it.readMs = meta.ms || null; it.readBy = meta.by || 'AI';
    if (!reading || reading.error) { toPerson(st, it, 'The reader could not read this' + (reading && reading.error ? ' (' + reading.error + ')' : '') + '.'); it.status = 'failed'; emit(st, { type: 'item', item: it }); return it; }
    log(st, 'Intake', 'read', 'Read by ' + it.readBy + (meta.ms ? ' in ' + (meta.ms / 1000).toFixed(1) + ' s' : '') + '.', { item: it.id });
    const kind = it.read === 'classify' ? (reading.kind || 'other') : it.read;
    if (kind === 'photo-list' || kind === 'order') salesOrder(st, it, reading);
    else if (kind === 'supplier-invoice') supplierInvoice(st, it, reading);
    else if (kind === 'voice-text' || kind === 'complaint' || kind === 'damage') damage(st, it, reading);
    else if (kind === 'chat' || kind === 'payment-promise' || kind === 'leave-request') chat(st, it, reading);
    else toPerson(st, it, 'This does not fit a rule NowAI has, so a person should answer.');
    it.status = it.status === 'reading' ? 'done' : it.status;
    emit(st, { type: 'item', item: it });
    return it;
  }

  // A failed read can be tried again: its card at the Gate is withdrawn and the item goes back to the reader.
  function retryItem(st, itemId) {
    const it = st.items.find(i => i.id === itemId); if (!it || it.status !== 'failed') return null;
    for (const g of st.gate) if (g.ref === it.id && g.status === 'waiting') { g.status = 'withdrawn'; g.note = 'Read again.'; emit(st, { type: 'gate', gate: g }); }
    it.status = 'reading'; it.role = null; it.reading = null;
    log(st, 'Intake', 'reread', 'Sent to the reader again.', { item: it.id });
    emit(st, { type: 'item', item: it }); return it;
  }

  // Anything NowAI should not decide by itself goes to a person, with what it read.
  function toPerson(st, it, why) {
    it.role = 'care'; it.status = 'gate';
    ask(st, 'kamran', 'care', 'A message needs a person: ' + fromName(st, it.from), [why, it.text ? '“' + it.text.slice(0, 160) + '”' : ''].filter(Boolean),
      [{ id: 'answer', label: 'I will answer it', primary: true }, { id: 'ignore', label: 'Nothing to do' }], it.id);
  }

  // 1. Sales Desk: an order list, read from a photo or a message.
  function matchItem(st, text) {
    const t = String(text || '').toLowerCase();
    return st.world.items.find(i => i.words.some(w => t.includes(w)) && (!i.size || new RegExp('(^|\\D)' + i.size + '(\\D|$)').test(t))) || null;
  }
  function salesOrder(st, it, reading) {
    it.role = 'sales';
    const c = customer(st, it.from) || null, W = st.world, lines = [], unknown = [];
    for (const l of reading.lines || []) {
      const item = matchItem(st, l.text || l.item);
      const qty = Number(String(l.qty).replace(',', '.'));
      if (!item || !(qty > 0)) { unknown.push(l.text || l.item || '?'); continue; }
      lines.push({ code: item.code, name: item.name, unit: item.unit, qty, price: item.price, amount: r2(qty * item.price) });
    }
    const cs = { id: id(st, 'c'), item: it.id, role: 'sales', type: 'order', customer: it.from, lines, unknown, status: 'priced' };
    cs.net = sum(lines, l => l.amount); cs.vat = r2(cs.net * W.company.vatRate); cs.total = r2(cs.net + cs.vat);
    cs.short = lines.filter(l => st.stock[l.code] !== undefined && st.stock[l.code] < l.qty)
      .map(l => ({ code: l.code, name: l.name, unit: l.unit, have: st.stock[l.code], need: l.qty, later: r2(l.qty - st.stock[l.code]), when: W.stock.incoming.items[l.code] ? W.stock.incoming.day : null }));
    st.cases[cs.id] = cs; it.caseId = cs.id;
    log(st, 'Sales Desk', 'priced', 'Priced ' + lines.length + ' lines at today\'s list: ' + azn(cs.net) + ', ' + azn(cs.total) + ' with ƏDV.', { case: cs.id, lines });
    for (const s of cs.short) log(st, 'Sales Desk', 'stock', s.name + ': ' + s.have + ' ' + s.unit + ' in stock, ' + s.later + ' ' + s.unit + (s.when ? ' on ' + s.when + '\'s truck.' : ' to order.'), { case: cs.id });
    if (unknown.length) { toPerson(st, it, 'Some lines were not on the price list: ' + unknown.join(', ') + '.'); return; }
    if (!c) { cs.status = 'ready'; return; }
    // Sales Desk asks Collections; Collections answers from the dealer's open invoices.
    say(st, 'Sales Desk', 'Collections', 'What is ' + c.name + '\'s balance and limit?', cs.id);
    creditCheck(st, cs, true);
  }
  function creditCheck(st, cs, first) {
    const c = customer(st, cs.customer), open = balance(c), after = r2(open + cs.total), over = r2(after - c.limit);
    cs.open = open; cs.after = after; cs.over = over;
    const g = st.gate.find(x => x.ref === cs.id && x.status === 'waiting');
    if (over <= 0) {
      say(st, 'Collections', 'Sales Desk', azn(open) + ' open of ' + fmt(c.limit, 0) + '. This order fits within the limit.', cs.id);
      if (g) { g.status = 'withdrawn'; g.note = 'No longer needed: the order now fits the limit.'; emit(st, { type: 'gate', gate: g }); }
      cs.status = 'ready'; confirmOrder(st, cs, 'within the limit'); return;
    }
    const evidence = ['Quote ' + fmt(cs.total) + ' · open ' + fmt(open) + ' · limit ' + fmt(c.limit) + ' → ' + fmt(after), 'Over the limit by ' + azn(over) + '.'];
    if (cs.short.length) evidence.push(cs.short.map(s => s.name + ': ' + s.have + ' ' + s.unit + ' now, ' + s.later + ' ' + s.unit + ' ' + (s.when ? 'on ' + s.when : 'later')).join('; '));
    if (first) {
      say(st, 'Collections', 'Sales Desk', azn(open) + ' open of ' + fmt(c.limit, 0) + '. This quote would take ' + c.name + ' to ' + fmt(after) + ', so it goes to ' + person(st, st.world.rules.overCreditLimit).name + '.', cs.id);
      cs.status = 'gate';
      ask(st, st.world.rules.overCreditLimit, 'sales', c.name + '\'s quote takes him over his credit limit', evidence, [
        { id: 'approve', label: 'Approve over limit', primary: true },
        { id: 'part', label: 'Ask for part payment', amount: partPayment(over) },
        { id: 'decline', label: 'Decline' }], cs.id, { amounts: { open, total: cs.total, limit: c.limit, over } });
    } else if (g) {
      g.evidence = evidence; g.amounts = { open, total: cs.total, limit: c.limit, over };
      const p = g.choices.find(ch => ch.id === 'part'); if (p) p.amount = partPayment(over);
      say(st, 'Collections', 'Sales Desk', c.name + '\'s balance is now ' + azn(open) + '. The order takes him ' + azn(over) + ' over the limit' + (cs.lastOver ? ', not ' + azn(cs.lastOver) : '') + '.', cs.id);
      emit(st, { type: 'gate', gate: g });
    }
    cs.lastOver = over;
  }
  const partPayment = over => Math.ceil(over / 10) * 10;   // the smallest round amount that brings him under
  function confirmOrder(st, cs, why) {
    const c = customer(st, cs.customer);
    cs.status = 'confirmed';
    const later = cs.short.map(s => s.later + ' ' + s.unit + ' of ' + s.name.toLowerCase() + ' on ' + (s.when || 'the next truck')).join(', ');
    draft(st, 'order for 1C', '1C', 'en', 'Sales order for ' + c.name + ': ' + cs.lines.map(l => l.qty + ' ' + l.unit + ' ' + l.name).join('; ') + '. ' + azn(cs.total) + ' with ƏDV.', cs.id);
    draft(st, 'WhatsApp reply', c.name, 'az', 'Salam, ' + c.name + ' bəy. Sifarişiniz qəbul olundu: ' + fmt(cs.total) + ' AZN (ƏDV daxil).' + (later ? ' ' + 'Qalan hissə cümə günü çatdırılacaq.' : '') + ' Sabah obyektə çatdırırıq.', cs.id,
      { en: 'Hello ' + c.name + '. Your order is confirmed: ' + azn(cs.total) + ' with ƏDV.' + (later ? ' The rest (' + later + ') follows on Friday.' : '') + ' Delivery to the site tomorrow.' });
    c.open.push({ inv: 'SO-' + cs.id.toUpperCase(), amount: cs.total, due: st.world.company.tomorrow, pending: true });
    log(st, 'Sales Desk', 'confirmed', 'Order for ' + c.name + ' confirmed (' + why + ').', { case: cs.id });
  }

  // 2. Payables Check: a supplier invoice against the agreed price.
  function supplierInvoice(st, it, r) {
    it.role = 'payables';
    const sup = st.world.suppliers.find(s => s.id === it.from) || st.world.suppliers.find(s => (r.supplier || '').toLowerCase().includes(s.name.split(' ')[0].toLowerCase()));
    const cs = { id: id(st, 'c'), item: it.id, role: 'payables', type: 'supplier-invoice', supplier: sup ? sup.id : null, invoiceNo: r.invoiceNo, findings: [], status: 'checked' };
    st.cases[cs.id] = cs; it.caseId = cs.id;
    const lines = (r.lines || []).map(l => ({ ...l, qty: Number(l.qty), price: Number(l.price), amount: Number(l.amount) }));
    for (const l of lines) {
      const item = matchItem(st, l.description), agreed = sup && item && sup.agreed[item.code];
      if (r2(l.qty * l.price) !== r2(l.amount)) cs.findings.push({ type: 'line-sum', text: l.description + ': ' + l.qty + ' × ' + fmt(l.price) + ' = ' + fmt(r2(l.qty * l.price)) + ', invoice says ' + fmt(l.amount) });
      if (agreed && l.price > agreed.price) {
        const diff = r2((l.price - agreed.price) * l.qty);
        cs.findings.push({ type: 'price', item: item.code, qty: l.qty, unit: agreed.unit, billed: l.price, agreed: agreed.price, diff, text: l.qty + ' ' + agreed.unit + ' × (' + fmt(l.price) + ' − ' + fmt(agreed.price) + ') = ' + azn(diff) + ', by code' });
      }
    }
    const net = sum(lines, l => l.amount), vat = r2(net * st.world.company.vatRate);
    if (r.net != null && r2(r.net) !== net) cs.findings.push({ type: 'total', text: 'Lines add up to ' + fmt(net) + ', invoice says ' + fmt(r.net) });
    if (r.vat != null && r2(r.vat) !== vat) cs.findings.push({ type: 'vat', text: 'ƏDV 18% of ' + fmt(net) + ' is ' + fmt(vat) + ', invoice says ' + fmt(r.vat) });
    cs.net = net; cs.vat = vat; cs.total = r2(net + vat);
    log(st, 'Payables Check', 'checked', 'Checked ' + (r.invoiceNo || 'the invoice') + ' against the agreed prices: ' + (cs.findings.length ? cs.findings.length + ' difference(s).' : 'it matches.'), { case: cs.id, findings: cs.findings });
    const price = cs.findings.find(f => f.type === 'price');
    if (!cs.findings.length) { cs.status = 'ok'; say(st, 'Payables Check', 'Books', (r.invoiceNo || 'The invoice') + ' matches the agreed prices. Prepare it for 1C.', cs.id); return; }
    const held = price ? price.diff : 0;
    if (held) st.holds.push({ case: cs.id, supplier: sup.name, amount: held, status: 'held' });
    cs.status = 'gate'; cs.held = held;
    say(st, 'Payables Check', 'Books', 'Hold the posting of ' + (r.invoiceNo || 'this invoice') + ' until ' + person(st, st.world.rules.supplierPriceDiffers).name + ' decides.', cs.id);
    ask(st, st.world.rules.supplierPriceDiffers, 'payables', (sup ? sup.name : 'A supplier') + ' billed ' + (price ? 'above the agreed price' : 'with a difference'), cs.findings.map(f => f.text), [
      { id: 'hold', label: 'Hold and ask for a corrected invoice', primary: true },
      { id: 'accept', label: 'Accept the price' }], cs.id, { amounts: { held } });
  }

  // 3. Customer Care: damaged goods, from a voice note or a message. The customer is made good once: a free
  //    replacement or a credit, never both. Either is a cost, so above the rule a person chooses.
  function damage(st, it, r) {
    it.role = 'care';
    const item = matchItem(st, r.item) || itemByCode(st, 'GAS-BLK'), c = customer(st, it.from);
    let qty = Number(r.quantity) || 0;
    if (/pallet|palet|поддон/i.test(String(r.unit || '')) && item.perPallet) qty = qty * item.perPallet;
    const value = r2(qty * item.price), vat = r2(value * st.world.company.vatRate), gross = r2(value + vat), rule = st.world.rules.creditNoteAbove;
    const wantsReplacement = /replac|əvəz|замен|new one|yenisi/i.test(String(r.wants || 'replacement'));
    const cs = { id: id(st, 'c'), item: it.id, role: 'care', type: 'damage', customer: it.from, code: item.code, qty, value, vat, gross, credit: value, status: 'checked', wants: r.wants || 'replacement' };
    st.cases[cs.id] = cs; it.caseId = cs.id;
    log(st, 'Customer Care', 'damage', 'Broken ' + item.name.toLowerCase() + ': ' + qty + ' × ' + fmt(item.price) + ' = ' + azn(value) + (value > rule ? ', above the ' + fmt(rule, 0) + ' AZN rule.' : '.'), { case: cs.id });
    if (value <= rule) { if (wantsReplacement) replaceFree(st, cs, 'within the rule'); else creditNote(st, cs, 'within the rule'); return; }
    cs.status = 'gate';
    const pallets = item.perPallet && qty % item.perPallet === 0 ? qty / item.perPallet : null;
    const what = pallets ? pallets + ' pallet' + (pallets > 1 ? 's' : '') + ' of ' + (item.code === 'GAS-BLK' ? 'gas blocks' : item.name.toLowerCase()) : qty + ' × ' + item.name.toLowerCase();
    const replace = { id: 'replace', label: 'Replace them free on Friday', primary: wantsReplacement }, credit = { id: 'credit', label: 'Credit ' + fmt(gross) + ' AZN instead', primary: !wantsReplacement };
    ask(st, st.world.rules.creditNotes, 'care', (c ? c.name : 'A customer') + ': ' + what + ' arrived broken. Replace or credit?', [
      qty + ' × ' + fmt(item.price) + ' = ' + azn(value) + ' + ƏDV ' + fmt(vat) + ' = ' + azn(gross) + ' · above the ' + fmt(rule, 0) + ' AZN rule',
      (c ? c.name + ', ' + c.where : '') + ' · asks for: ' + (r.wants || 'replacement') + (it.photo ? ' · photo attached' : '')],
      [...(wantsReplacement ? [replace, credit] : [credit, replace]), { id: 'photos', label: 'Ask for more photos' }], cs.id, { amounts: { value, vat, gross } });
  }
  function replaceFree(st, cs, why) {
    const c = customer(st, cs.customer), item = itemByCode(st, cs.code), pallets = item.perPallet ? r2(cs.qty / item.perPallet) : null;
    const what = pallets ? pallets + ' pallet' + (pallets === 1 ? '' : 's') : cs.qty + ' pieces';
    cs.status = 'replacing'; cs.outcome = 'replace';
    draft(st, 'replacement note for 1C', '1C', 'en', 'Free replacement for ' + (c ? c.name : 'the customer') + ': ' + cs.qty + ' × ' + item.name + ' (' + azn(cs.value) + ' at the sale price), broken in delivery; ' + why + '. Prepared, not posted. No credit.', cs.id);
    const route = st.routes.find(r => /yasamal/i.test(r.route));
    say(st, 'Customer Care', 'Tural', 'A free replacement of ' + what + ' for ' + (c ? c.where : 'the customer') + ' is drafted for Friday morning' + (route ? ' on ' + route.truck : '') + '. Confirm the truck?', cs.id);
    ask(st, 'tural', 'care', 'Replacement to ' + (c ? c.where : 'the customer') + ' on Friday morning', [what + ' of ' + item.name.toLowerCase() + (route ? ' · ' + route.truck + ', ' + route.driver : '')],
      [{ id: 'confirm', label: 'Confirm the truck', primary: true }, { id: 'later', label: 'Move to Saturday' }], cs.id, { kind: 'redelivery' });
    draft(st, 'WhatsApp reply', c ? c.name : 'customer', 'az', 'Salam, ' + (c ? c.name : '') + ' bəy. Sınıq bloklar üçün üzr istəyirik; əvəzini cümə səhəri pulsuz göndəririk.', cs.id,
      { en: 'Hello. We are sorry about the broken blocks; free replacements come on Friday morning.' });
  }
  function creditNote(st, cs, why) {
    const c = customer(st, cs.customer), item = itemByCode(st, cs.code);
    cs.status = 'credited'; cs.outcome = 'credit';
    draft(st, 'credit note for 1C', '1C', 'en', 'Credit note for ' + (c ? c.name : 'the customer') + ': ' + cs.qty + ' × ' + item.name + ', ' + azn(cs.value) + ' + ƏDV ' + fmt(cs.vat) + ' = ' + azn(cs.gross) + ' (' + why + '). Prepared, not posted. No replacement.', cs.id);
    say(st, 'Customer Care', 'Books', 'A credit of ' + azn(cs.gross) + ' for ' + (c ? c.name : 'the customer') + ' is prepared for 1C. No replacement goes out.', cs.id);
    draft(st, 'WhatsApp reply', c ? c.name : 'customer', 'az', 'Salam, ' + (c ? c.name : '') + ' bəy. Sınıq bloklar üçün üzr istəyirik; ' + fmt(cs.gross) + ' AZN məbləğində kredit qeydə alındı.', cs.id,
      { en: 'Hello. We are sorry about the broken blocks; a credit of ' + azn(cs.gross) + ' is recorded.' });
  }

  // 4. Collections: the overdue check at 08:40, and payment promises.
  function overdueCheck(st) {
    const day = st.world.company.day;
    for (const c of Object.values(st.customers)) for (const o of c.open) {
      if (o.pending) continue;
      const late = Math.round((Date.parse(day) - Date.parse(o.due)) / 864e5);
      if (late < 30) continue;
      const promised = Object.values(st.cases).find(x => x.type === 'promise' && x.customer === c.id && x.status === 'promised');
      if (promised) {   // he already said when he will pay: no reminder today
        promised.overdue = { inv: o.inv, amount: o.amount, late };
        log(st, 'Collections', 'overdue', c.name + ': ' + o.inv + ', ' + azn(o.amount) + ', ' + late + ' days overdue. He promised to pay on ' + promised.day + ' (' + promised.at + '), so no reminder today.', { case: promised.id });
        continue;
      }
      const cs = { id: id(st, 'c'), role: 'collections', type: 'overdue', customer: c.id, inv: o.inv, amount: o.amount, late, status: 'reminder drafted' };
      st.cases[cs.id] = cs;
      log(st, 'Collections', 'overdue', c.name + ': ' + o.inv + ', ' + azn(o.amount) + ', ' + late + ' days overdue. Reminder drafted from the approved template.', { case: cs.id });
      draft(st, 'reminder (approved template)', c.name, 'az', 'Salam, ' + c.name + ' bəy. ' + o.inv + ' üzrə ' + fmt(o.amount) + ' AZN ödənişin ' + late + ' gün gecikdiyini xatırladırıq. Ödəniş tarixini bildirə bilərsinizmi?', cs.id,
        { en: 'Hello. A reminder that ' + azn(o.amount) + ' on ' + o.inv + ' is ' + late + ' days overdue. Could you tell us when you will pay?', template: st.world.rules.reminderTemplate, byRule: true });
    }
  }
  function chat(st, it, r) {
    const intent = r.intent || r.kind;
    if (intent === 'payment-promise' || intent === 'payment_promise') {
      it.role = 'collections';
      const c = customer(st, it.from), od = Object.values(st.cases).find(x => x.type === 'overdue' && x.customer === it.from);
      const amount = r.amount ? Number(r.amount) : (od ? od.amount : balance(c)), day = r.day || 'Friday';
      c.promises.push({ day, amount, at: it.at });
      const cs = { id: id(st, 'c'), item: it.id, role: 'collections', type: 'promise', customer: it.from, amount, day, at: it.at, status: 'promised' };
      st.cases[cs.id] = cs; it.caseId = cs.id;
      if (od) {   // read after the overdue check: the reminder was only drafted, so it is withdrawn, not sent
        od.status = 'promised'; cs.overdue = { inv: od.inv, amount: od.amount, late: od.late };
        for (const d of st.drafts) if (d.ref === od.id && d.status === 'not sent') d.status = 'withdrawn';
        log(st, 'Collections', 'reminder.withdrawn', 'Reminder to ' + c.name + ' withdrawn: he had already promised to pay (' + it.at + ').', { case: od.id });
      }
      log(st, 'Collections', 'promise', c.name + ' promised ' + azn(amount) + ' on ' + day + '.', { case: cs.id, item: it.id });
      say(st, 'Collections', 'Books', c.name + ' promised ' + azn(amount) + ' on ' + day + '. Match it when it lands.', cs.id);
      return;
    }
    if (intent === 'leave-request' || intent === 'leave_request') {
      it.role = 'people';
      const staff = st.world.staff.find(s => s.id === it.from), route = st.routes.find(x => staff && x.driver === staff.name);
      const cs = { id: id(st, 'c'), item: it.id, role: 'people', type: 'leave', staff: it.from, day: r.day || 'Friday', route: route ? route.id : null, status: 'checked' };
      st.cases[cs.id] = cs; it.caseId = cs.id;
      if (!route) { cs.status = 'ok'; draft(st, 'staff reply', staff ? staff.name : 'staff', 'az', 'Salam. İcazəniz qeydə alındı.', cs.id, { en: 'Your day off is recorded.' }); log(st, 'People Desk', 'leave', 'Leave recorded: no route on that day.', { case: cs.id }); return; }
      cs.status = 'gate';
      log(st, 'People Desk', 'leave', staff.name + ' asks for ' + cs.day + ' off; he drives the ' + route.route + ' route.', { case: cs.id });
      ask(st, st.world.rules.staffLeave, 'people', staff.name + ' asks for ' + cs.day + ' off; he drives the ' + route.route + ' route',
        [route.truck + ' · ' + route.route + ' · spare driver: ' + st.world.deliveries.spareDrivers.join(', ')],
        [{ id: 'approve', label: 'Approve and reassign', primary: true }, { id: 'decline', label: 'Decline' }], cs.id);
      return;
    }
    if (intent === 'order') return salesOrder(st, it, r);
    if (intent === 'damage' || intent === 'complaint') return damage(st, it, r);
    toPerson(st, it, 'NowAI is not sure what this asks for.');
  }

  // 5. Books: yesterday's bank file at 09:00.
  function bankFile(st, ev) {
    const W = st.world, lines = W.bank.lines;
    const it = arrive(st, { id: ev.id, at: ev.at, channel: 'file', from: 'bank', read: null, file: ev.file, subject: W.bank.file });
    it.role = 'books';
    for (const l of lines) {
      const owner = Object.values(st.customers).find(c => c.open.some(o => o.inv === l.ref && r2(o.amount) === r2(l.amount)));
      if (owner) { owner.open = owner.open.filter(o => o.inv !== l.ref); st.bank.matched.push({ ...l, customer: owner.id }); }
      else st.bank.unmatched.push({ ...l });
    }
    st.bank.cashIn = sum(lines, l => l.amount);
    log(st, 'Books', 'matched', 'Bank file: ' + lines.length + ' payments, ' + azn(st.bank.cashIn) + '. ' + st.bank.matched.length + ' matched to invoices, ' + st.bank.unmatched.length + ' without a reference.', { item: it.id });
    for (const u of st.bank.unmatched) {
      const guess = Object.values(st.customers).find(c => c.payer && c.payer === u.payer);
      const cs = { id: id(st, 'c'), item: it.id, role: 'books', type: 'unmatched', amount: u.amount, payer: u.payer, guess: guess ? guess.id : null, status: 'asking' };
      st.cases[cs.id] = cs;
      say(st, 'Books', 'Collections', azn(u.amount) + ' came in from ' + u.payer + ' with no reference. Do you know whose it is?', cs.id);
      if (guess) {
        const inv = guess.open.filter(o => !o.pending)[0];
        say(st, 'Collections', 'Books', 'Most likely ' + guess.name + '\'s part payment' + (inv ? ' on ' + inv.inv : '') + ': the payer is ' + u.payer + '. Asking ' + person(st, W.rules.unmatchedPayment).name + ' to confirm before it is allocated.', cs.id);
        cs.status = 'gate'; cs.inv = inv ? inv.inv : null;
        ask(st, W.rules.unmatchedPayment, 'books', 'Is the ' + azn(u.amount) + ' from ' + u.payer + ' ' + guess.name + '\'s payment?', [azn(u.amount) + ' · no reference · payer ' + u.payer, guess.name + ' has ' + azn(balance(guess)) + ' open' + (inv ? '; ' + inv.inv + ' is ' + azn(inv.amount) : '')],
          [{ id: 'confirm', label: 'Yes, it is ' + guess.name + '\'s' + (inv ? ': allocate to ' + inv.inv : ''), primary: true }, { id: 'unknown', label: 'No, keep it unmatched' }], cs.id, { amounts: { amount: u.amount } });
      }
    }
    emit(st, { type: 'item', item: it });
  }

  // ---------------------------------------------------------------- decisions at the Gate
  function decide(st, gateId, choiceId, actingAs) {
    const g = st.gate.find(x => x.id === gateId); if (!g || g.status !== 'waiting') return null;
    const choice = g.choices.find(c => c.id === choiceId); if (!choice) throw new Error('no choice ' + choiceId);
    g.status = 'decided'; g.choice = choiceId; g.decidedAt = now(st); g.by = actingAs || g.who;
    log(st, person(st, g.by) ? person(st, g.by).name + ' (role-play)' : g.by, 'gate.decide', person(st, g.who).name + ' chose “' + choice.label + '”: ' + g.title + '.', { gate: g.id, choice: choiceId });
    const cs = st.cases[g.ref], it = st.items.find(i => i.id === g.ref);
    if (cs && cs.type === 'order') {
      const c = customer(st, cs.customer);
      if (choiceId === 'approve') confirmOrder(st, cs, 'approved over the limit by ' + person(st, g.who).name);
      else if (choiceId === 'part') {
        cs.status = 'waiting-payment'; cs.partAmount = choice.amount;
        draft(st, 'WhatsApp reply', c.name, 'az', 'Salam, ' + c.name + ' bəy. Sifarişiniz hazırdır: ' + fmt(cs.total) + ' AZN. Göndərişdən əvvəl ' + fmt(choice.amount, 0) + ' AZN qismən ödəniş xahiş edirik.', cs.id,
          { en: 'Hello ' + c.name + '. Your order is ready: ' + azn(cs.total) + '. Before we load it, please pay ' + fmt(choice.amount, 0) + ' AZN of your balance.' });
        say(st, 'Sales Desk', 'Collections', 'Order for ' + c.name + ' waits for a part payment of ' + fmt(choice.amount, 0) + ' AZN. Tell me when it lands.', cs.id);
      } else { cs.status = 'declined'; draft(st, 'WhatsApp reply', c.name, 'az', 'Salam, ' + c.name + ' bəy. Təəssüf ki, kredit limitiniz bu sifarişə imkan vermir. Ödənişdən sonra məmnuniyyətlə göndərəcəyik.', cs.id, { en: 'Hello. Your credit limit does not allow this order; we will gladly send it after a payment.' }); }
    } else if (cs && cs.type === 'supplier-invoice') {
      const hold = st.holds.find(h => h.case === cs.id), sup = st.world.suppliers.find(s => s.id === cs.supplier);
      if (choiceId === 'hold') {
        cs.status = 'held';
        draft(st, 'email to supplier', sup ? sup.name : 'supplier', 'az', 'Salam. ' + cs.invoiceNo + ' saylı hesab-fakturada armaturun qiyməti razılaşdırılmış qiymətdən yüksəkdir (1 240,00 AZN/ton əvəzinə 1 310,00). Düzəldilmiş hesab-faktura göndərməyinizi xahiş edirik.', cs.id,
          { en: 'Hello. On invoice ' + cs.invoiceNo + ' the rebar price is above the agreed price (1,310.00 instead of 1,240.00 AZN a tonne). Please send a corrected invoice.' });
        say(st, 'Payables Check', 'Books', 'Keep ' + cs.invoiceNo + ' on hold: a corrected invoice is requested.', cs.id);
      } else { cs.status = 'accepted'; if (hold) hold.status = 'released'; say(st, 'Payables Check', 'Books', 'Prepare ' + cs.invoiceNo + ' for 1C at the invoice price: ' + person(st, g.who).name + ' accepted it.', cs.id); }
    } else if (g.kind === 'redelivery') {
      if (cs) { cs.redelivery = choiceId === 'confirm' ? 'Friday morning' : 'Saturday'; cs.status = 'replacement booked'; }
      log(st, 'Customer Care', 'redelivery', 'Replacement ' + (choiceId === 'confirm' ? 'confirmed for Friday morning' : 'moved to Saturday') + ' by ' + person(st, g.who).name + '.', { gate: g.id, case: cs && cs.id });
    } else if (cs && cs.type === 'damage') {
      if (choiceId === 'replace') replaceFree(st, cs, 'chosen by ' + person(st, g.who).name);
      else if (choiceId === 'credit') creditNote(st, cs, 'chosen by ' + person(st, g.who).name);
      else if (choiceId === 'photos') { cs.status = 'asked'; const c = customer(st, cs.customer); draft(st, 'WhatsApp reply', c ? c.name : 'customer', 'az', 'Salam. Zəhmət olmasa, sınıq blokların daha bir neçə şəklini göndərin.', cs.id, { en: 'Hello. Please send a few more photos of the broken blocks.' }); }
      else { cs.status = 'declined'; }
    } else if (cs && cs.type === 'unmatched') {
      if (choiceId === 'confirm' && cs.guess) {
        const c = customer(st, cs.guess), inv = c.open.find(o => o.inv === cs.inv) || c.open.filter(o => !o.pending)[0];
        if (inv) inv.amount = r2(inv.amount - cs.amount);
        c.open = c.open.filter(o => o.amount > 0.004);
        st.bank.matched.push({ payer: cs.payer, ref: inv ? inv.inv : '', amount: cs.amount, customer: c.id, confirmedBy: g.who });
        st.bank.unmatched = st.bank.unmatched.filter(u => !(u.payer === cs.payer && u.amount === cs.amount));
        cs.status = 'allocated';
        draft(st, 'payment entry for 1C', '1C', 'en', azn(cs.amount) + ' from ' + cs.payer + ' allocated to ' + c.name + (inv ? ', ' + inv.inv : '') + ' (confirmed by ' + person(st, g.who).name + '). Prepared, not posted.', cs.id);
        say(st, 'Books', 'Collections', azn(cs.amount) + ' from ' + cs.payer + ' allocated to ' + c.name + (inv ? ' (' + inv.inv + ')' : '') + '. Entry prepared for 1C, not posted.', cs.id);
        // Collections tells Sales Desk if an order of his is waiting on credit.
        for (const o of Object.values(st.cases)) if (o.type === 'order' && o.customer === c.id && ['gate', 'waiting-payment'].includes(o.status)) creditCheck(st, o, false);
      } else cs.status = 'unmatched';
    } else if (cs && cs.type === 'leave') {
      const staff = st.world.staff.find(s => s.id === cs.staff), route = st.routes.find(r => r.id === cs.route);
      if (choiceId === 'approve' && route) { const spare = st.world.deliveries.spareDrivers[0]; route.driver = spare; cs.status = 'approved'; draft(st, 'staff reply', staff.name, 'az', 'Salam, ' + staff.name + '. Cümə günü icazənizi təsdiqlədik; Sumqayıt marşrutunu ' + spare + ' sürəcək.', cs.id, { en: 'Your Friday off is approved; ' + spare + ' drives the Sumqayıt route.' }); log(st, 'People Desk', 'reassigned', route.route + ' route reassigned to ' + spare + '.', { case: cs.id }); }
      else { cs.status = 'declined'; draft(st, 'staff reply', staff.name, 'az', 'Salam, ' + staff.name + '. Təəssüf ki, cümə günü marşrutunuz var; başqa gün təklif edə bilərikmi?', cs.id, { en: 'Sorry, you have a route on Friday; can we offer another day?' }); }
    } else if (it) { it.status = 'done'; }
    emit(st, { type: 'gate', gate: g });
    return g;
  }

  // ---------------------------------------------------------------- what the screens show (derived, never stored)
  const waitsFor = (st, it, waiting) => waiting.some(g => g.ref === it.id || Object.values(st.cases).some(cs => cs.id === g.ref && (cs.item === it.id || it.caseId === cs.id)));
  function metrics(st) {
    const waiting = st.gate.filter(g => g.status === 'waiting');
    const over = Object.values(st.customers).filter(c => c.kind === 'dealer' && balance(c) > c.limit).map(c => c.id);
    const pendingOver = Object.values(st.cases).filter(cs => cs.type === 'order' && cs.status === 'gate' && cs.over > 0).map(cs => cs.customer);
    return {
      arrived: st.items.length, reading: st.items.filter(i => i.status === 'reading').length,
      withPerson: st.items.filter(i => i.status !== 'reading' && waitsFor(st, i, waiting)).length,
      done: st.items.filter(i => i.status !== 'reading' && i.status !== 'failed' && !waitsFor(st, i, waiting)).length,
      waiting: waiting.length, waitingFor: [...new Set(waiting.map(g => g.who))], held: sum(st.holds.filter(h => h.status === 'held'), h => h.amount),
      dealersOver: [...new Set([...over, ...pendingOver])], dealers: st.world.customers.filter(c => c.kind === 'dealer').length + st.world.otherDealers,
      cashIn: st.bank.cashIn, matched: st.bank.matched.length, bankLines: st.world.bank.lines.length
    };
  }
  function roleView(st, rid) {
    const items = st.items.filter(i => i.role === rid), cases = Object.values(st.cases).filter(c => c.role === rid);
    const gate = st.gate.filter(g => g.role === rid && g.status === 'waiting');
    return { id: rid, name: roleName(st, rid), items, cases, gate, busy: items.some(i => i.status === 'reading') || gate.length > 0 };
  }
  function brief(st) {
    const m = metrics(st);
    const lines = [
      { k: 'Cash in yesterday', v: m.cashIn ? azn(m.cashIn) : 'bank file at 09:00' },
      { k: 'Dealers over their limit', v: String(m.dealersOver.length), warn: m.dealersOver.length > 0 },
      { k: 'Held from suppliers', v: azn(m.held), warn: m.held > 0 },
      { k: 'Decisions waiting', v: String(m.waiting) + (m.waitingFor.length ? ' · ' + m.waitingFor.map(p => person(st, p).name).join(', ') : ''), warn: m.waiting > 0 }
    ];
    const promises = Object.values(st.customers).flatMap(c => c.promises.map(p => c.name + ': ' + azn(p.amount) + ' on ' + p.day));
    if (promises.length) lines.push({ k: 'Payments promised', v: promises.join('; ') });
    return { for: 'Aysel', at: now(st), lines };
  }
  // A short snapshot for the AI to answer the owner's questions from (facts only).
  function snapshot(st) {
    const m = metrics(st);
    return {
      company: st.world.company.name, time: now(st), metrics: m,
      waiting: st.gate.filter(g => g.status === 'waiting').map(g => ({ for: person(st, g.who).name, title: g.title, evidence: g.evidence })),
      decided: st.gate.filter(g => g.status === 'decided').map(g => ({ by: person(st, g.who).name, title: g.title, choice: g.choices.find(c => c.id === g.choice).label })),
      dealers: Object.values(st.customers).filter(c => c.open.length || c.promises.length).map(c => ({ name: c.name, where: c.where, open: balance(c), limit: c.limit, promises: c.promises })),
      holds: st.holds, drafts: st.drafts.map(d => ({ kind: d.kind, to: d.to, en: d.en || d.text })), lastSteps: st.record.slice(-12).map(e => e.at + ' ' + e.text)
    };
  }

  const E = { createDay, advanceTo, addItem, applyReading, retryItem, decide, metrics, roleView, brief, snapshot, toMin, toHHMM, r2, fmt, azn, balance, fromName };
  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.NOWAI_ENGINE = E;
})(typeof self !== 'undefined' ? self : this);
