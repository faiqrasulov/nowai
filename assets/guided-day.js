(() => {
  // Guided cases on try.html: the same choices as the full day, the records shown in their own systems,
  // numbers in the reader's format, and the decision kept on screen on a phone.
  const demo = window.NOWAI_DM;
  const modes = document.querySelector('[data-day-mode]');
  const guide = document.querySelector('[data-day-guide]');
  if (!demo || !modes || !guide) return;

  const { workflowGuide, tr } = demo;
  const choices = [...modes.querySelectorAll('[data-day-mode-choice]')];
  const note = document.querySelector('[data-day-note]');
  const steps = [...guide.querySelectorAll('[data-guide-step]')];
  const languages = [...guide.querySelectorAll('[data-guide-lang]')];
  const workspace = guide.querySelector('[data-guide-workspace]');
  const title = guide.querySelector('#day-guide-title');
  const roleIcon = guide.querySelector('[data-guide-role-icon]');
  const party = guide.querySelector('[data-guide-party]');
  const reference = guide.querySelector('[data-guide-reference]');
  const label = (key) => tr('try.guide.' + key);
  // The site's own number format: 3,800 and 4.20 in English; 3 800 and 4,20 in Azerbaijani and Russian.
  // (Chrome's built-in Azerbaijani format falls back to the English one, so it is not used.)
  const format = (n, digits = 0) => {
    const en = demo.lang() === 'en';
    const [whole, part] = Math.abs(n).toFixed(digits).split('.');
    return (n < 0 ? '−' : '') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : ' ') + (part ? (en ? '.' : ',') + part : '');
  };
  const count = (n) => format(n);
  const money = (n, digits = 0) => format(n, digits) + ' AZN';
  let mode = '';
  let current = 0;
  let visited = 0;
  let decided = false;
  const isCredit = () => mode === 'credit';
  const ACTS = {
    guide: { approve: 'try.a.holdmail', review: 'try.a.review', pay: 'try.a.payfull' },
    credit: { approve: 'try.a.cnok', review: 'try.a.cnteam' },
  };

  function fill(text, record) {
    const values = {
      total: money(record.total ?? 0), difference: money(record.difference ?? 0), amount: money(record.amount ?? 0),
      limit: money(record.limit ?? 0), qty: count(record.quantity ?? 0), number: record.number ?? '',
      contract: money(record.contract ?? 0, 2), billed: money(record.billed ?? 0, 2),
    };
    return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  }
  const say = (key, record) => fill(label(key), record);

  function el(name, className, value) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  }

  function icon(name) {
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS(mark.namespaceURI, 'use');
    mark.setAttribute('class', 'n-ic');
    mark.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#ic-' + name);
    mark.append(use);
    return mark;
  }

  function card(heading, value, message) {
    const node = el('div', 'n-day-guide__record');
    node.append(el('small', '', heading), el('strong', '', value));
    if (message) node.append(el('p', '', message));
    return node;
  }

  function details(summary, content, lang) {
    const box = el('details', 'n-day-guide__sources');
    box.append(el('summary', '', summary));
    if (typeof content === 'string') {
      const message = el('p', '', content);
      if (lang) message.lang = lang;
      box.append(message);
    } else box.append(content);
    return box;
  }

  function evidence(rows) {
    const node = el('dl', 'n-day-guide__data');
    for (const [key, value, alert] of rows) {
      const field = el('div');
      field.toggleAttribute('data-alert', !!alert);
      field.append(el('dt', '', label(key)), el('dd', '', value));
      node.append(field);
    }
    return node;
  }

  function action(text, onClick, type = 'primary', key = text) {
    const button = el('button', 'n-btn n-btn--' + type + ' n-day-guide__action', text);
    button.type = 'button';
    button.dataset.guideAction = key;
    button.addEventListener('click', onClick);
    return button;
  }
  const step = (key, onClick, type) => action(label(key), onClick, type, key);

  function outcomeText(record) {
    if (isCredit()) {
      return record.decision === 'approve' ? ['credit.sent', 'credit.sent.note'] : ['credit.referred', 'credit.referred.note'];
    }
    return { approve: ['send', 'record'], review: ['hold.title', 'hold.result'], pay: ['pay.title', 'pay.result'] }[record.decision];
  }

  function copyFor(index, record) {
    if (index === 3) return outcomeText(record);
    if (index === 2 && record.decision) return ['decision.recorded', 'decision.reviewed'];
    return (isCredit() ? [
      ['credit.intake', 'credit.intro'], ['credit.checked', 'credit.checked.note'], ['credit.gate', 'credit.gate.note'],
    ] : [
      ['received', 'arrived'], ['mismatch', 'match'], ['approval', 'await'],
    ])[index];
  }

  function facts(record) {
    const quantity = ['qty', count(record.quantity) + ' · ' + record.product];
    return isCredit() ? [
      quantity, ['credit.unit', money(record.unit)],
      ['credit.amount', money(record.amount), true], ['credit.limit', money(record.limit)],
    ] : [
      quantity, ['contract', money(record.contract, 2)],
      ['billed', money(record.billed, 2), true], ['difference', money(record.difference), true],
      ['total', money(record.total)],
    ];
  }

  // What Payables Check looked at for BK-0412, each with its result.
  function invoiceChecks(record) {
    const list = el('dl', 'n-day-guide__checks');
    for (const [key, value, alert] of [
      ['checks.po', label('checks.po.v')], ['checks.dn', say('checks.dn.v', record)],
      ['checks.price', say('checks.price.v', record), true], ['checks.eq', label('checks.eq.v')],
    ]) {
      const row = el('div');
      row.toggleAttribute('data-alert', !!alert);
      row.append(el('dt', '', label(key)), el('dd', '', value));
      list.append(row);
    }
    return list;
  }

  function renderIntake(content, record) {
    if (isCredit()) {
      content.append(details(label('credit.original'), record.message, 'ru'), step('credit.check', () => view(1, true)));
      return;
    }
    content.append(
      card(label('inbox') + ' · ' + record.timestamp, record.party, label('attachment') + ' · ' + record.number),
      step('start', () => view(1, true)),
    );
  }

  function renderChecks(content, record) {
    content.append(
      evidence(facts(record)),
      isCredit() ? details(label('sources'), record.evidence) : details(label('sources'), invoiceChecks(record)),
      step(isCredit() ? 'credit.review' : 'review', () => view(2, true)),
    );
  }

  function decide(choice) {
    workflowGuide.decide(choice);
    if (workflowGuide.record()?.decision) { decided = true; view(3, true); }
  }

  function decisionOption(choice, record) {
    const option = el('div', 'n-day-guide__option');
    const scenario = isCredit() ? 'credit' : 'invoice';
    const button = action(tr(ACTS[mode][choice]), () => decide(choice), choice === 'approve' ? 'primary' : 'secondary', choice);
    const help = el('p', '', say('preview.' + scenario + '.' + choice, record));
    help.id = 'day-guide-option-' + choice;
    button.setAttribute('aria-describedby', help.id);
    option.append(button, help);
    return option;
  }

  function renderDecision(content, record) {
    const review = el('div', 'n-day-guide__review');
    const brief = evidence(facts(record));
    brief.classList.add('n-day-guide__brief');
    const message = el('div', 'n-day-guide__message');
    message.append(isCredit()
      ? card(label('credit.draft'), money(record.amount), label('credit.draft.note'))
      : card(label('draft') + ' · ' + record.party, tr('try.ml.s2'), label('email.body')));
    const actions = el('div', 'n-day-guide__choices');
    if (record.decision) actions.append(step('step.result', () => view(3, true), 'secondary'));
    else {
      message.append(el('p', 'n-day-guide__choice-label', label('choice')));
      actions.append(...Object.keys(ACTS[mode]).map(choice => decisionOption(choice, record)));
    }
    message.append(actions);
    review.append(brief, message);
    content.append(review);
  }

  // A small picture of the record in the system that holds it.
  function system(kind, heading, rows, extra) {
    const box = el('div', 'n-day-guide__sys n-day-guide__sys--' + kind);
    box.append(el('p', 'n-day-guide__sys-bar', heading));
    const table = el('div', 'n-day-guide__sys-rows');
    for (const row of rows) {
      const line = el('div', 'n-day-guide__sys-row');
      for (const cell of row) {
        if (cell && typeof cell === 'object') line.append(el('span', cell.cls || '', cell.text));
        else line.append(el('span', '', cell));
      }
      table.append(line);
    }
    box.append(table);
    if (extra) box.append(extra);
    return box;
  }

  function handoffs(record) {
    const section = el('div', 'n-day-guide__handoffs');
    const list = el('ul', 'n-day-guide__routes');
    function add(iconName, systemName, recipient, status, ref, proof) {
      const row = el('li', 'n-day-guide__route');
      const description = el('div');
      description.append(el('small', '', systemName), el('strong', '', recipient), el('p', '', status));
      if (ref) description.append(el('span', 'n-day-guide__route-ref', ref));
      if (proof) description.append(proof);
      row.append(icon(iconName), description);
      list.append(row);
    }
    const queue = (task) => system('queue', label('rec.queue'), [[{ text: task, cls: 'is-main' }, { text: label('rec.evidence'), cls: 'is-tag' }]]);
    if (isCredit()) {
      if (record.review) {
        add('gate', label('queue.system'), label(record.review.team), label('queue.created'), record.review.reference, queue(say('rec.task.care', record)));
      }
      if (record.doc) {
        const balance = el('p', 'n-day-guide__sys-note', label('rec.balance') + ': ' + money(record.before) + ' → ' + money(record.after));
        add('ledger', label('onec.system'), label('accounting'), label('onec.recorded'), record.doc.no + ' · ' + money(record.amount),
          system('c1', label('rec.1c'), [[record.doc.t, record.doc.no, record.doc.type, record.doc.cust, { text: record.doc.total, cls: 'is-num' }, record.doc.state]], balance));
      } else {
        add('ledger', label('onec.system'), record.party, label('rec.balance') + ': ' + money(record.after) + ', ' + label('rec.unchanged'));
      }
      if (record.reply) {
        const chat = el('div', 'n-day-guide__sys n-day-guide__sys--chat');
        chat.append(el('p', 'n-day-guide__sys-bar', 'WhatsApp · ' + record.party));
        const bubble = el('p', 'n-day-guide__bubble', record.reply);
        bubble.lang = 'ru';
        bubble.append(el('time', '', record.replyTime || ''));
        chat.append(bubble);
        add('chat', 'WhatsApp', record.party, label(record.doc ? 'whatsapp.confirmed' : 'whatsapp.updated'), null, chat);
      }
    } else {
      if (record.review) {
        add('gate', label('queue.system'), label(record.review.team), label('queue.created'), record.review.reference, queue(say('rec.task.purch', record)));
      }
      if (record.mail) {
        const bar = record.mail.draft ? label('rec.drafts') : label('rec.sent');
        const rows = [[label('rec.to') + ': ' + record.party, { text: record.mail.subj, cls: 'is-main' }, record.mail.t]];
        const tag = record.mail.draft ? el('p', 'n-day-guide__sys-note is-amber', label('rec.notsent')) : null;
        add('mail', label(record.mail.draft ? 'mail.draft.system' : 'mail.system'), record.party, label(record.mail.draft ? 'mail.draft' : 'mail.sent'), record.number,
          system('mail', bar, rows, tag));
      }
      if (record.order) {
        add('bank', label('bank.system'), label('accounting'), record.order.st === 'held' ? label('bank.held') : label('bank.sign'), money(record.order.v),
          system('bank', label('rec.bank'), [[record.party, record.order.label, { text: format(record.order.v, 2), cls: 'is-num' }, { text: record.order.status, cls: record.order.st === 'held' ? 'is-flag' : 'is-tag' }]]));
      }
    }
    section.append(el('h5', '', label('routes')), list);
    return section;
  }

  function renderResult(content, record) {
    content.append(handoffs(record));
    if (!isCredit()) {
      const mail = record.notice;
      content.append(mail
        ? details(label('mail.read'), tr(mail.subj) + ' — ' + tr(mail.body))
        : record.draft ? details(label('mail.read-draft'), label('email.body')) : document.createTextNode(''));
      content.append(evidence([['difference', money(record.difference)], ['total', money(record.total)]]));
    }
    content.append(step('replay', () => start(true), 'secondary'));
  }

  // On a phone, make sure the choices themselves are on screen when the Gate opens.
  function keepChoicesInView() {
    const box = workspace.querySelector('.n-day-guide__choices');
    if (!box) return;
    const bottom = box.getBoundingClientRect().bottom;
    if (bottom > innerHeight - 8) window.scrollBy({ top: bottom - innerHeight + 24, behavior: 'instant' });
  }

  function view(index, focus = false) {
    const record = workflowGuide.record();
    if (!record) return;
    current = index;
    visited = Math.max(index, visited);
    party.textContent = record.party;
    reference.textContent = record.number || record.timestamp;
    const titleKey = isCredit() ? 'credit.title' : 'title';
    title.dataset.i = 'try.guide.' + titleKey;
    title.textContent = label(titleKey);
    roleIcon.setAttribute('href', isCredit() ? '#ic-role-care' : '#ic-role-payables');
    for (const [i, button] of steps.entries()) {
      button.disabled = i > visited;
      button.parentElement.toggleAttribute('data-complete', i < visited);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    for (const button of languages) {
      button.setAttribute('aria-pressed', button.dataset.guideLang === demo.lang());
    }
    const [headingKey, description] = copyFor(index, record);
    const content = el('div', 'n-day-guide__content');
    const heading = el('h4', '', label(headingKey));
    heading.tabIndex = -1;
    content.append(
      el('p', 'n-day-guide__eyebrow', steps[index].querySelector('b').textContent),
      heading,
      el('p', 'n-day-guide__desc', say(description, record)),
    );
    [renderIntake, renderChecks, renderDecision, renderResult][index](content, record);
    workspace.replaceChildren(content);
    if (focus) {
      heading.focus({ preventScroll: true });
      const header = document.querySelector('.n-hdr')?.offsetHeight ?? 0;
      const top = heading.getBoundingClientRect().top;
      if (top < header + 8 || (index === 3 && top > header + 120)) {
        heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (index === 2 && innerWidth < 768) keepChoicesInView();
    }
  }

  function start(focus = false) {
    workflowGuide.open(mode);
    visited = 0;
    view(0, focus);
  }

  function select(next) {
    if (mode === next) return;
    mode = next;
    for (const button of choices) {
      button.setAttribute('aria-pressed', button.dataset.dayModeChoice === mode);
    }
    guide.hidden = mode === 'day';
    demo.root.hidden = mode !== 'day';
    if (note) note.hidden = !(mode === 'day' && decided);
    if (mode === 'day') workflowGuide.close();
    else start();
  }

  for (const button of choices) {
    button.addEventListener('click', () => select(button.dataset.dayModeChoice));
  }
  for (const [i, button] of steps.entries()) button.addEventListener('click', () => view(i));
  for (const button of languages) button.addEventListener('click', () => {
    demo.setLang(button.dataset.guideLang);
    view(current);
  });
  window.SITE?.onLang(() => { if (mode !== 'day') view(current); });
  const directDay = () => location.hash === '#demo' || new URLSearchParams(location.search).get('case') === 'credit-note';
  window.addEventListener('hashchange', () => { if (directDay()) select('day'); });

  modes.hidden = false;
  select(directDay() ? 'day' : 'guide');
})();
