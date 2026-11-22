/* The NowAI workspace's reading layer, as used on the website. It runs in test mode: an answer key stands in for
   the AI reader, so nothing is read live and nothing is sent anywhere. Typed text gets a small keyword stand-in. */
(function (root) {
  'use strict';

  const PARALLEL = 2;
  const AI = { status: 'checking', mock: true, maxImages: 0, version: 'reader-1', busy: 0, done: 0, failed: 0 };
  let truth = null;
  const listeners = [];
  AI.onStatus = f => { listeners.push(f); f(AI); };
  const tell = () => listeners.forEach(f => { try { f(AI); } catch (e) { /* screen only */ } });
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  AI.ready = (async () => { AI.status = 'mock'; tell(); return AI; })();   // this page never connects to an AI service

  // ------------------------------------------------------------ the queue
  const queue = [];
  function run() {
    while (AI.busy < PARALLEL && queue.length) {
      const job = queue.shift(); AI.busy++; tell();
      job.go().then(job.res, job.rej).finally(() => { AI.busy--; tell(); run(); });
    }
  }
  const enqueue = go => new Promise((res, rej) => { queue.push({ go, res, rej }); run(); });

  // read(item) -> {reading, ms, by}. Never throws: a failure comes back as {reading: {error}} so the item can go to a person.
  AI.read = item => enqueue(async () => {
    const t0 = performance.now();
    try { await sleep(600 + Math.random() * 700); return { reading: await mockRead(item), ms: Math.round(performance.now() - t0), by: 'the answer key (test mode)' }; }
    catch (e) { AI.failed++; return { reading: { error: (e && e.message) || 'the reading failed' }, ms: Math.round(performance.now() - t0), by: 'the answer key (test mode)' }; }
  });

  // The owner's questions: in test mode there is no AI to answer them.
  AI.answer = () => enqueue(async () => ({ answer: 'In test mode there is no AI to answer questions.' }));

  // ------------------------------------------------------------ the answer key, and a small stand-in for typed text
  async function mockRead(item) {
    if (!truth) { try { truth = root.NOWAI_TRUTH || await (await fetch('samples/truth.json')).json(); } catch (e) { truth = {}; } }
    if (truth[item.id]) return JSON.parse(JSON.stringify(truth[item.id]));
    const t = String(item.text || '').toLowerCase();
    const num = (t.match(/\d+(?:[.,]\d+)?/) || [])[0];
    if (/sınıq|sınıb|broken|damag|разбит/.test(t)) return { kind: 'damage', item: t, quantity: num ? Number(num.replace(',', '.')) : 1, unit: /palet|pallet/.test(t) ? 'pallet' : 'piece', wants: 'replacement', summary: 'Damaged goods (test mode reading).' };
    if (/ödəyəcə|pay |заплачу|оплачу/.test(t)) return { kind: 'payment-promise', day: /cümə|friday|пятниц/.test(t) ? 'Friday' : null, amount: null, summary: 'A promise to pay (test mode reading).' };
    if (/icazə|day off|выходн|отпуск/.test(t)) return { kind: 'leave-request', day: /cümə|friday|пятниц/.test(t) ? 'Friday' : null, summary: 'A day off (test mode reading).' };
    const lines = [];
    for (const part of t.split(/[,;\n]| və | and | и /)) {
      const n = part.match(/(\d+(?:[.,]\d+)?)/); if (!n) continue;
      lines.push({ text: part.replace(n[0], '').trim(), qty: Number(n[0].replace(',', '.')), unit: (part.match(/kisə|ton|ədəd|bag|t\b|шт/) || [null])[0] });
    }
    if (lines.length) return { kind: 'order', lines, summary: 'An order (test mode reading).' };
    return { kind: 'question', summary: 'A question (test mode reading).' };
  }

  if (typeof module === 'object' && module.exports) module.exports = AI;
  else root.NOWAI_AI = AI;
})(typeof self !== 'undefined' ? self : this);
