(() => {
  const story = document.querySelector('.core-story');
  if (!story) return;
  const scene = story.querySelector('.core-story__scene');
  const canvas = story.querySelector('.core-story__canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const tabs = Array.from(story.querySelectorAll('[data-core-step]'));
  const caption = story.querySelector('[data-core-caption]');
  const compactLayout = matchMedia('(max-width: 767px), (max-height: 560px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const roles = [
    ['sales-desk', 'Sales'], ['customer-care', 'Care'], ['collections', 'Cash'],
    ['payables-check', 'Payables'], ['books', 'Books'], ['people-desk', 'People'], ['owners-brief', 'Brief']
  ];
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  // The bottom "Run a company for a day" button fades in once the incoming-work list has moved up out of its way.
  const quickAt = p => ease(.28,.36,p);
  // The intro has faded out by the time the first step's headline arrives (at .21), so the two never show together.
  const introGone = p => ease(.08,.21,p);
  function ease(start, end, value) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }
  function label(key) {
    const localized = typeof tr === 'function' ? tr(key) : '';
    return localized || key;
  }

  const routes = {
    wa: { role:'sales-desk', destination:'erp' },
    teams: { role:'people-desk', destination:'teams' },
    slack: { role:'owners-brief', destination:'slack' },
    mail: { role:'collections', destination:'erp' },
    phone: { role:'customer-care', destination:'crm' },
    invoice: { role:'payables-check', destination:'mail' },
    internal: { role:'books', destination:'erp' },
    credit: { role:'customer-care', destination:'erp' }
  };
  const destinations = [
    ['erp','core.erp'], ['crm','CRM'], ['sql','SQL'], ['microsoft','Microsoft 365'],
    ['teams','Teams'], ['slack','Slack'], ['mail','core.maildraft']
  ];

  // Small channel and system marks share one renderer in the scene and the phone legend.
  function mark(g, id, x, y, size = 14) {
    g.save();
    g.translate(x, y);
    g.scale(size / 16, size / 16);
    function tile(x, y, w, h, radius, fill) {
      g.beginPath();
      g.roundRect(x, y, w, h, radius);
      g.fillStyle = fill;
      g.fill();
    }
    function disk(x, y, r, fill) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = fill;
      g.fill();
    }
    function glyph(value, x, y, size, fill) {
      g.font = '700 ' + size + 'px Onest, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = fill;
      g.fillText(value, x, y);
    }
    function stroke(points, color, weight = 1.3) {
      g.beginPath();
      g.moveTo(...points[0]);
      points.slice(1).forEach(point => g.lineTo(...point));
      g.strokeStyle = color;
      g.lineWidth = weight;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
    }
    switch (id) {
      case 'wa':
        disk(8, 7.6, 7, '#21a769');
        tile(1.3, 9.4, 5, 5.7, 1, '#21a769');
        stroke([[5,4.8],[4.6,6.6],[5.8,9.2],[8.5,11],[11.2,11],[11.3,9.5],[9.7,8.6]], '#fff', 1.65);
        break;
      case 'teams':
        tile(9, 6, 6.7, 7.1, 2, '#5057a5');
        disk(12, 3.5, 2.4, '#7a7dcc');
        tile(4, 0.7, 7, 13.9, 3, '#7b80d1');
        tile(.3, 4, 9.7, 9.4, 1.6, '#5356ae');
        glyph('T', 5.2, 8.8, 6.9, '#fff');
        break;
      case 'slack':
        tile(0.7, 5.8, 6.8, 3, 1.5, '#36c5f0'); disk(6, 3.75, 1.45, '#36c5f0');
        tile(8.2, 1, 3, 6.6, 1.5, '#2eb67d'); disk(13.25, 6.05, 1.45, '#2eb67d');
        tile(8.2, 8.3, 6.6, 3, 1.5, '#ecb22e'); disk(9.7, 13.5, 1.45, '#ecb22e');
        tile(5.08, 9.5, 3, 6.1, 1.5, '#e01e5a'); disk(3, 11.3, 1.45, '#e01e5a');
        break;
      case 'microsoft':
        tile(.8,.8,6.8,6.8,0,'#f25022'); tile(8.4,.8,6.8,6.8,0,'#7fba00');
        tile(.8,8.4,6.8,6.8,0,'#00a4ef'); tile(8.4,8.4,6.8,6.8,0,'#ffb900');
        break;
      case 'erp':
      case 'sap':
        g.beginPath(); g.moveTo(.1,3); g.lineTo(16,3); g.lineTo(10.5,13); g.lineTo(.1,13); g.closePath();
        g.fillStyle = '#168ac0'; g.fill();
        glyph('SAP', 6.45, 8.1, 5.8, '#fff');
        break;
      case 'internal':
        tile(1,1,14,14,3,'#e0ece3');
        for (const row of [3.5,9]) {
          for (const col of [3.5,9]) tile(col,row,3.5,3.5,.6,'#4b765d');
        }
        break;
      case 'sql':
        tile(3,4,10,9.7,2.6,'#566aba');
        g.beginPath(); g.ellipse(8,4.4,5,2.65,0,0,Math.PI*2); g.fillStyle='#8998d8'; g.fill();
        stroke([[4.4,7.3],[6,8],[10,8],[11.6,7.3]],'#d6dcf4',.9);
        stroke([[4.4,10.1],[6,10.8],[10,10.8],[11.6,10.1]],'#d6dcf4',.9);
        break;
      case 'crm':
        tile(1,1,14,14,3,'#e7def2');
        disk(8,5.8,2.1,'#8257a4'); tile(4.3,8.5,7.4,3.8,1.5,'#8257a4');
        break;
      case 'eq':
        tile(3,1.3,10,13.4,1.5,'#cee4da');
        stroke([[5.5,5.1],[10.5,5.1]],'#416d5c'); stroke([[5.5,8],[10.5,8]],'#416d5c');
        stroke([[5.5,10.9],[8.6,10.9]],'#416d5c');
        break;
      case 'mail':
        tile(.6,2.6,14.8,10.8,2,'#cfe0ee');
        stroke([[2.1,4.6],[8,9],[13.9,4.6]],'#53738c',1.45);
        break;
      case 'phone':
        tile(1.6,1.1,12.8,13.8,3,'#e0e9df');
        stroke([[5,4.4],[4.4,6.2],[5.9,9.1],[8.6,11.4],[10.8,11.3],[11.5,9.6]],'#4a7057',1.65);
        break;
    }
    g.restore();
  }

  document.querySelectorAll('[data-core-app]').forEach(icon => {
    icon.width = 32;
    icon.height = 32;
    mark(icon.getContext('2d'), icon.dataset.coreApp, 0, 0, 32);
  });

  let width = 0;
  let height = 0;
  let ratio = 1;
  let progress = 0;
  let selected = 0;
  let tabUsed = false;
  let manual = 0;
  let manualStart = 0;
  let manualFrom = 0;
  let visible = true;
  let frameId = 0;
  let lastFrame = 0;
  let camera;
  let paintedProgress = -1;
  let paintedCompact;

  const frame = story.querySelector('.core-story__frame');
  const intro = story.querySelector('.core-story__intro');
  const footer = story.querySelector('.core-story__footer');
  const quickStart = footer.querySelector('.core-story__quick-start');
  const header = document.querySelector('.n-hdr');
  const rail = story.querySelector('.core-story__parts');
  const insight = story.querySelector('.core-story__insight');
  const partButtons = Array.from(rail.querySelectorAll('button'));
  const fields = ['title','detail','key','value'].map(key => [key,insight.querySelector('[data-insight="' + key + '"]')]);
  const hitRegions = [];
  let translation = { x:0, y:0, scale:1 };
  let hovered = '';
  let focused = '';
  let pinned = '';
  let activePart = '';
  let hideTimer;

  const intake = story.querySelector('.core-story__intake');
  const intakeInsight = story.querySelector('.core-story__intake-insight');
  const routeDetails = intakeInsight.querySelector('[data-core-route-details]');
  const orderTrace = intakeInsight.querySelector('[data-core-trace]');
  const traceSteps = [...orderTrace.children];
  const gateCase = story.querySelector('[data-core-gate-case]');
  const approve = gateCase.querySelector('[data-core-approve]');
  const gateResult = gateCase.querySelector('[data-core-gate-result]');
  const intakeButtons = Array.from(intake.querySelectorAll('[data-core-intake]'));
  const output = story.querySelector('.core-story__result');
  const destinationChips = [...story.querySelectorAll('[data-core-destination]')];
  const outputIcon = output.querySelector('canvas');
  const intakeFields = Object.fromEntries(Array.from(intakeInsight.querySelectorAll('[data-intake-field]'), el => [el.dataset.intakeField, el]));
  const destinationNames = Object.fromEntries(destinations);
  let intakeHover = '';
  let intakeFocus = '';
  let intakePinned = '';
  let routeSource = '';
  let scenarioId = 'wa';
  let routeStart = 0;
  let routeLeaveTimer;
  let routeTimer, autoTimer, autoSource = '', autoIndex = 0, interacted = false;
  let traceStep = -1;
  let gateApproved = false;
  let openGateOnCompact = false;
  const mobile = matchMedia('(max-width: 767px)');
  output.hidden = true;

  const sceneScenario = () => selected === 2 || (selected === 3 && gateApproved) ? 'credit' : scenarioId;
  const routeDuration = () => routeSource === 'wa' ? 2800 : 3300;

  function showDestination(ready) {
    const destination = routes[sceneScenario()].destination;
    story.toggleAttribute('data-output-ready', ready);
    destinationChips.forEach(el => {
      const active = ready && el.dataset.coreDestination === destination;
      el.classList.toggle('is-active', active);
      el.toggleAttribute('data-active', active);
      if (active) el.append(output);
    });
    output.hidden = !ready;
  }

  function scenarioText(field, source = sceneScenario()) {
    return label('core.route.' + source + '.' + field);
  }

  function setScenarioCopy() {
    const { role, destination } = routes[sceneScenario()];
    intakeFields.entry.textContent = scenarioText('entry');
    intakeFields.check.textContent = scenarioText('check');
    intakeFields.role.textContent = label('s.page.' + role);
    intakeFields.output.textContent = scenarioText('output') + ' → ' + label(destinationNames[destination]);
    output.querySelector('[data-output="title"]').textContent = scenarioText('output');
    output.querySelector('[data-output="meta"]').textContent = scenarioText('meta');
    outputIcon.width = outputIcon.height = 36;
    mark(outputIcon.getContext('2d'), destination, 0, 0, 36);
    caption.dataset.i = selected === 2 && !gateApproved ? 'core.gate.caption'
      : selected >= 2 ? 'core.route.' + sceneScenario() + '.meta' : 'core.caption' + selected;
    caption.textContent = label(caption.dataset.i);
  }

  function updateIntake() {
    const next = selected < 2 ? intakeHover || intakeFocus || intakePinned || autoSource : '';
    const changed = next !== routeSource;
    if (next && next !== routeSource) {
      scenarioId = next;
      routeStart = performance.now();
      traceStep = -1;
      clearTimeout(hideTimer);
      hovered = focused = pinned = '';
    }
    routeSource = next;
    if (changed || !next) {
      clearTimeout(routeTimer);
      showDestination(selected === 3 || (!!next && reduce.matches));
      if (next && !reduce.matches) routeTimer = setTimeout(() => { showDestination(true); schedule(); }, routeDuration());
    }
    orderTrace.hidden = next !== 'wa' || selected !== 0;
    routeDetails.hidden = !orderTrace.hidden;
    for (const button of intakeButtons) {
      const id = button.dataset.coreIntake;
      button.toggleAttribute('data-active', id === next);
      button.setAttribute('aria-pressed', String(intakePinned === id));
    }
    setScenarioCopy();
    showPart();
    schedule();
  }

  function updateOrderTrace(now) {
    if (orderTrace.hidden) return;
    const elapsed = now - routeStart;
    const position = reduce.matches || elapsed >= routeDuration() ? 2 : elapsed >= 900 ? 1 : 0;
    if (position === traceStep) return;
    traceStep = position;
    traceSteps.forEach((step, i) => {
      step.toggleAttribute('data-complete', i < position);
      if (i === position) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  approve.addEventListener('click', () => {
    if (gateApproved) return;
    gateApproved = true;
    gateCase.dataset.approved = '';
    approve.setAttribute('aria-disabled', 'true');
    approve.dataset.i = 'core.gate.approved';
    approve.textContent = label(approve.dataset.i);
    gateResult.hidden = false;
    setScenarioCopy();
    schedule();
  });

  function hideIntakeHover() {
    clearTimeout(routeLeaveTimer);
    routeLeaveTimer = setTimeout(() => {
      intakeHover = '';
      updateIntake();
    },120);
  }

  function cancelAutomatic() {
    if (interacted) return;
    interacted = true;
    clearTimeout(autoTimer);
    autoSource = '';
    story.removeAttribute('data-intake-invitation');
    updateIntake();
  }

  function autoRoute() {
    if (interacted || reduce.matches) return;
    if (selected === 0 && visible && !document.hidden) {
      autoSource = intakeButtons[autoIndex].dataset.coreIntake;
      autoIndex = (autoIndex + 1) % intakeButtons.length;
      updateIntake();
    }
    autoTimer = setTimeout(autoRoute, 4000);
  }

  story.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') cancelAutomatic(); }, { once: true });
  // A finger that starts a scroll is not a choice: touch only stops the demo through a tap on a button (click).
  window.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') cancelAutomatic(); });
  window.addEventListener('keydown', cancelAutomatic, { once: true });
  if (!reduce.matches) {
    story.setAttribute('data-intake-invitation', '');
    autoTimer = setTimeout(autoRoute, 2000);
  }

  for (const button of intakeButtons) {
    const id = button.dataset.coreIntake;
    button.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      cancelAutomatic();
      clearTimeout(routeLeaveTimer);
      intakeHover = id;
      updateIntake();
    });
    button.addEventListener('pointerleave', hideIntakeHover);
    button.addEventListener('focus', () => {
      // A pointer click changes the pinned route. Keyboard focus shows a temporary preview.
      if (!button.matches(':focus-visible')) return;
      intakeFocus = id;
      updateIntake();
    });
    button.addEventListener('blur', () => {
      intakeFocus = '';
      updateIntake();
    });
    button.addEventListener('click', () => {
      cancelAutomatic();
      clearTimeout(routeLeaveTimer);
      intakePinned = intakePinned === id ? '' : id;
      intakeHover = intakeFocus = '';
      updateIntake();
      if (mobile.matches && !intakeInsight.hidden) intakeInsight.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
  }
  intakeInsight.addEventListener('pointerenter', () => clearTimeout(routeLeaveTimer));
  intakeInsight.addEventListener('pointerleave', hideIntakeHover);
  story.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !routeSource) return;
    clearTimeout(routeLeaveTimer);
    intakeHover = intakeFocus = intakePinned = '';
    updateIntake();
  });

  function describePart() {
    if (!activePart) return;
    const { role, destination } = routes[sceneScenario()];
    const roleName = label('s.page.' + role);
    const outputLabel = scenarioText('output') + ' → ' + label(destinationNames[destination]);
    const details = {
      intake: ['core.case', scenarioText('entry')],
      core: ['core.assigned', roleName],
      memory: ['core.assigned', roleName],
      checks: ['core.case', scenarioText('check')],
      gate: ['core.case', scenarioText('check')],
      record: ['core.case', scenarioText('meta')],
      systems: ['core.next', outputLabel]
    };
    for (const [key, field] of fields) {
      if (key === 'key') field.textContent = label(details[activePart][0]);
      else if (key === 'value') field.textContent = details[activePart][1];
      else field.textContent = label('core.part.'+activePart+'.'+key);
    }
  }

  function showPart() {
    const next = selected === 1 ? hovered || focused || pinned : '';
    intakeInsight.hidden = !routeSource || !!next;
    story.toggleAttribute('data-intake-preview',!!routeSource && !next);
    if (next === activePart) return;
    activePart = next;
    insight.hidden = !activePart;
    rail.toggleAttribute('data-has-active', !!activePart);
    for (const b of partButtons) {
      const current = b.dataset.corePart === activePart;
      b.toggleAttribute('data-active', current);
      b.setAttribute('aria-expanded', String(current));
    }
    if (activePart) describePart();
    schedule();
  }

  function hoverPart(id) {
    clearTimeout(hideTimer);
    if (id) {
      hovered = id;
      showPart();
    } else {
      hideTimer = setTimeout(() => { hovered = ''; showPart(); }, 210);
    }
  }

  function hitPart(e) {
    if (selected !== 1) return '';
    const canvasBounds = canvas.getBoundingClientRect();
    const x = (e.clientX - canvasBounds.left - translation.x) / translation.scale;
    const y = (e.clientY - canvasBounds.top - translation.y) / translation.scale;
    for (let i = hitRegions.length-1; i >= 0; i--) {
      const path = hitRegions[i].points;
      let inside = false;
      for (let j = 0, k = path.length-1; j < path.length; k=j++) {
        const [ax, ay] = path[j];
        const [bx, by] = path[k];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) return hitRegions[i].id;
    }
    return '';
  }

  function choosePart(id) {
    if (pinned === id) {
      pinned = '';
      hovered = '';
      focused = '';
    } else {
      pinned = id;
      hovered = '';
      if (!id) focused = '';
    }
    showPart();
  }

  function drawPartLines() {
    const cb = canvas.getBoundingClientRect();
    partButtons.forEach(button => {
      const hit = hitRegions.find(region => region.id === button.dataset.corePart);
      if (!hit) return;
      const bounds = button.getBoundingClientRect();
      const x = (bounds.left - cb.left - translation.x) / translation.scale;
      const y = (bounds.top + Math.min(bounds.height/2,17) - cb.top - translation.y) / translation.scale;
      const end = x - 8;
      const elbow = Math.max(hit.anchor[0]+12,end-33);
      const emphasis = hit.id === activePart;
      ctx.save();
      if (activePart && !emphasis) ctx.globalAlpha *= .25;
      line([hit.anchor,[elbow,y],[end,y]],emphasis ? '#20704a' : '#95ab9c',emphasis ? 1.35 : .78);
      dot(...hit.anchor,emphasis ? 2.7 : 1.6,emphasis ? '#20704a' : '#688876');
      ctx.restore();
    });
  }

  frame.addEventListener('pointermove',e => {
    if (e.pointerType !== 'mouse' || selected !== 1 || e.target.closest('.core-story__parts,.core-story__insight,.core-story__intake,.core-story__intake-insight')) return;
    const id = hitPart(e);
    frame.toggleAttribute('data-hit',!!id);
    hoverPart(id);
  });
  frame.addEventListener('pointerleave',() => {
    frame.removeAttribute('data-hit');
    hoverPart('');
  });
  frame.addEventListener('click',e => {
    if (selected === 1 && !e.target.closest('a,button,.core-story__insight,.core-story__intake,.core-story__intake-insight')) choosePart(hitPart(e));
  });
  insight.addEventListener('pointerenter',() => clearTimeout(hideTimer));
  insight.addEventListener('pointerleave',() => hoverPart(''));
  for (const button of partButtons) {
    const id = button.dataset.corePart;
    button.addEventListener('pointerenter',e => { if (e.pointerType === 'mouse') hoverPart(id); });
    button.addEventListener('pointerleave',e => { if (e.pointerType === 'mouse') hoverPart(''); });
    button.addEventListener('focus',() => { focused = id; showPart(); });
    button.addEventListener('blur',() => { focused = ''; showPart(); });
    button.addEventListener('click',() => {
      choosePart(id);
      if (!insight.hidden && compactLayout.matches) insight.scrollIntoView({ block:'nearest', behavior:reduce.matches ? 'instant' : 'smooth' });
    });
  }
  document.addEventListener('keydown',e => {
    if (e.key !== 'Escape' || !activePart) return;
    clearTimeout(hideTimer);
    hovered = focused = pinned = '';
    showPart();
  });



  function remeasure() {
    const box = canvas.getBoundingClientRect();
    const nextRatio = Math.min(devicePixelRatio || 1, 2);
    if (width !== box.width || height !== box.height || ratio !== nextRatio) {
      width = box.width;
      height = box.height;
      ratio = nextRatio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    // The incoming-work list sits between the intro's last row and the step tabs, never on either. Where the left
    // column is short its rows tighten, as they do on short screens, and the two gaps share what room is left. Where
    // there is none, it still starts below the intro: any overflow falls on the tab row, which it leaves as it moves.
    intake.style.removeProperty('--core-intake-top');
    story.removeAttribute('data-intake-tight');
    if (!compactLayout.matches && !reduce.matches) {
      const end = Math.min(height * .83, footer.offsetTop - quickStart.offsetHeight - 24);
      scene.style.setProperty('--core-intake-end', end + 'px');
      const links = intro.querySelector('.core-story__links');
      const introEnd = intro.offsetTop + links.offsetTop + links.offsetHeight;
      const tabsTop = footer.offsetTop + footer.querySelector('.core-story__tabs').offsetTop;
      const base = (parseFloat(getComputedStyle(intake).getPropertyValue('--core-intake-top')) || 41) * height / 100;
      if (tabsTop - introEnd - intake.offsetHeight < 32) story.setAttribute('data-intake-tight', '');
      const room = tabsTop - introEnd - intake.offsetHeight;
      const start = room >= 32 ? clamp(base, introEnd + 16, tabsTop - 16 - intake.offsetHeight) : introEnd + Math.max(0, room) / 2;
      intake.style.setProperty('--core-intake-top', start + 'px');
    }
    schedule();
  }

  function project(x, y, z) {
    const { scale, tilt, c, s, cx, cy } = camera;
    return [cx + (x * c - y * s) * scale, cy + ((x * s + y * c) * tilt - z) * scale];
  }

  function plane(z, draw) {
    const { scale, tilt, c, s, cx, cy } = camera;
    ctx.save();
    ctx.transform(c * scale, s * tilt * scale, -s * scale, c * tilt * scale, cx, cy - z * scale);
    draw();
    ctx.restore();
  }

  function line(points, stroke, thickness = .85) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const p of points.slice(1)) ctx.lineTo(...p);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = thickness;
    ctx.stroke();
  }

  function dot(x, y, size, fill) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function box(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  function slab(w, h, z, depth, colors) {
    const x = w / 2;
    const y = h / 2;
    const radius = 15;
    // The two visible edges share the outline of the curved top face.
    const edge = [];
    for (const [cx, cy, start, end] of [
      [x - radius, -y + radius, -Math.PI / 2, 0],
      [x - radius, y - radius, 0, Math.PI / 2],
      [-x + radius, y - radius, Math.PI / 2, Math.PI]
    ]) {
      for (let i = 0; i <= 8; i++) {
        const a = lerp(start, end, i / 8);
        edge.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
      }
    }
    const top = edge.map(([px, py]) => project(px, py, z));
    const bottom = edge.map(([px, py]) => project(px, py, z - depth));
    const gradient = ctx.createLinearGradient(top[0][0], 0, top.at(-1)[0], 0);
    gradient.addColorStop(0, colors[2]);
    gradient.addColorStop(1, colors[3]);
    ctx.beginPath();
    ctx.moveTo(...top[0]);
    for (const pt of top.slice(1)) ctx.lineTo(...pt);
    for (const pt of bottom.toReversed()) ctx.lineTo(...pt);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#586a5e';
    ctx.lineWidth = .85;
    ctx.stroke();
    plane(z, () => {
      const finish = ctx.createLinearGradient(-x, -y, x, y);
      finish.addColorStop(0, colors[0]);
      finish.addColorStop(1, colors[1]);
      box(-x, -y, w, h, radius, finish, '#67796c');
      box(-x + 4, -y + 4, w - 8, h - 8, 11, null, 'rgba(255,255,255,.77)');
    });
  }

  function bolt(x, y) {
    dot(x, y, 4.5, '#8d9e91');
    dot(x, y, 3.25, '#f3f6f0');
    line([[x - 1.8, y], [x + 1.8, y]], '#809184', .9);
  }

  function textAt(value, x, y, size, color, weight = 500, family = 'Onest, sans-serif', maxWidth) {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.fillText(value,x,y,maxWidth ?? width);
  }

  function inputLine(from, to, clock, index, color = '#83998d', moving = true) {
    const dir = Math.sign(to[0] - from[0]);
    const join = from[0] + (to[0] - from[0]) * .48;
    const elbow = Math.min(42, Math.abs(to[0] - from[0]) * .24);
    const points = [from, [join, from[1]], [join + elbow * dir, to[1]], to];
    line(points, color);
    dot(...from, 2, '#607d6c');
    if (reduce.matches || !moving) return;
    const cycle = clock / 2800 + index * .24;
    pulseAlong(points,cycle-Math.floor(cycle),2.8,'#306748');
  }

  function pulseAlong(points, progress, radius, color) {
    const lengths = points.slice(1).map((pt,i) => Math.hypot(pt[0]-points[i][0],pt[1]-points[i][1]));
    let remaining = progress*lengths.reduce((a,b) => a+b,0);
    for (let i=0; i<lengths.length; i++) {
      if (remaining > lengths[i] && i<lengths.length-1) { remaining-=lengths[i]; continue; }
      const amount = lengths[i] ? clamp(remaining/lengths[i]) : 0;
      dot(lerp(points[i][0],points[i+1][0],amount),lerp(points[i][1],points[i+1][1],amount),radius,color);
      break;
    }
  }

  function drawInputs(z, clock, spread, opacity) {
    if (opacity <= .01) return;
    const compact = camera.compact;
    const canvasBox = canvas.getBoundingClientRect();
    for (const [i, button] of intakeButtons.entries()) {
      const id = button.dataset.coreIntake;
      const active = id === routeSource;
      if (compact && !active) continue;
      const buttonBox = button.getBoundingClientRect();
      if (!buttonBox.width) continue;
      const scale = translation.scale;
      const port = project(-180, -76 + i*24, z);
      const from = compact
        ? [(buttonBox.left+buttonBox.width/2-canvasBox.left-translation.x)/scale,-translation.y/scale+2]
        : [(buttonBox.right-canvasBox.left-translation.x)/scale+6,(buttonBox.top+buttonBox.height/2-canvasBox.top-translation.y)/scale];
      const points = compact
        ? [from,[from[0],from[1]+18],[port[0]-18,port[1]-14],port]
        : [from,[from[0]+18,from[1]],[Math.max(from[0]+18,port[0]-31),port[1]],port];
      ctx.save();
      ctx.globalAlpha = opacity * (active ? 1 : lerp(.82, .50, spread));
      line(points,active ? '#50936d' : '#abbcb0',active ? 1.65/scale : .86/scale);
      dot(...from,active ? 2.8/scale : 1.75/scale,active ? '#267a50' : '#798f81');
      if (active) {
        if (reduce.matches) dot(...port,3/scale,'#1e8050');
        else {
          const elapsed = Math.max(0, clock - routeStart);
          const trip = routeSource === 'wa' ? ease(0,900,elapsed) : clamp(((elapsed+8)%1650)/1000);
          pulseAlong(points,trip,3.8/scale,'#1e8050');
        }
      }
      ctx.restore();
    }
  }

  function appChip(id, name, x, y, width, active = false) {
    box(x, y - 11, width, 22, 5, active ? '#e3f0e2' : '#fcfcf9', active ? '#82aa8b' : '#d4dfd6');
    mark(ctx,id,x+5,y-6,12);
    textAt(name,x+22,y,11,'#344d3d',600);
  }

  function drawConnections(z, opacity, clock, delivery) {
    if (opacity <= .01) return;
    const route = routeSource ? (reduce.matches ? 1 : ease(1950,routeDuration(),clock-routeStart)) : 0;
    if (camera.compact) {
      if (route) {
        const port = project(160, 50, z);
        const end = [608,620];
        const points = [port,[port[0]+16,port[1]+16],[end[0],end[1]-18],end];
        ctx.save(); ctx.globalAlpha = route;
        line(points, '#448962', 1.45);
        pulseAlong(points,route,3,'#306748');
        ctx.restore();
      }
      return;
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    const right = camera.small ? 608+width/2-130 : 1035;
    const outY = camera.small ? camera.cy-106 : 304;
    textAt(label('core.destinations'), right, outY - 23, 10, '#5d7565', 650);
    destinations.forEach(([id, name], i) => {
      const y = outY + i * 27;
      const target = project(189,-101+i*32,z-3);
      const match = id === routes[sceneScenario()].destination;
      const active = match && (delivery || route >= .99);
      if (match && route && !delivery) {
        const end = [right-7,y], bend = lerp(target[0],end[0],.48);
        const points = [target,[bend,target[1]],[bend+18,y],end];
        ctx.save(); ctx.globalAlpha *= route;
        line(points,'#448962',1.45);
        pulseAlong(points,route,3,'#306748');
        ctx.restore();
      } else if (active) inputLine(target,[right-7,y],clock,i,'#448962',true);
      else inputLine([right-7,y],target,clock,i,'#a6b8ac',false);
      appChip(id,label(name),right,y,128,active);
    });
    ctx.restore();
  }

  function deliveryCard(opacity) {
    if (camera.compact || opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    const x = camera.small ? 608 + width / 2 - 222 : 946;
    const baseline = (camera.small ? 620 - height + 202 : 224) + (1 - opacity) * 12;
    box(x, baseline - 55, camera.small ? 219 : 238, 68, 8, '#fbfdf8', '#a9c1ae');
    const destination = routes[sceneScenario()].destination;
    mark(ctx,destination,x+10,baseline-41,19);
    textAt(label('core.next') + ' · ' + label(destinationNames[destination]),x+37,baseline-38,10,'#4d7858',650);
    textAt(scenarioText('output'),x+37,baseline-21,13,'#214631',700,undefined,camera.small ? 169 : 194);
    textAt(scenarioText('meta'),x+10,baseline-1,11.5,'#596d60',500,undefined,camera.small ? 199 : 218);
    ctx.restore();
  }

  // Each visual slice and its accessible button share one identifier.
  const dimensions = [
    { id:'systems', x:390, y:246, closed:9, open:0, depth:11, draw:network },
    { id:'record', x:358, y:220, closed:15, open:112, depth:7, draw:record },
    { id:'gate', x:359, y:222, closed:21, open:224, depth:8, draw:gatePlate },
    { id:'checks', x:352, y:218, closed:27, open:336, depth:7, draw:checks },
    { id:'memory', x:352, y:218, closed:33, open:448, depth:8, draw:memory },
    { id:'core', x:359, y:223, closed:43, open:560, depth:13, draw:tiles },
    { id:'intake', x:366, y:230, closed:56, open:676, depth:14, draw:enclosure }
  ];

  function network() {
    for (let row = -77; row <= 77; row += 22) {
      for (let col = -142; col <= 142; col += 18) box(col-2.3, row-2.3, 4.6, 4.6, 1.7, '#c3d1c6', '#83998b');
    }
    box(-158,-98,316,196,8,null,'#a2b5a7');
  }

  function record() {
    box(-115,-73,230,146,9,'#eff4ec','#9daf9f');
    for (let row = -45; row <= 45; row += 30) {
      dot(-95,row,3,'#5e866b');
      line([[-80,row],[82,row]],'#9db2a2',1.7);
      box(61,row-7,35,14,3,'#d4e5d4','#92ac98');
    }
  }

  function gatePlate() {
    box(-109,-72,218,144,8,'#eef3e9','#99ad9d');
    box(-48,-38,96,76,9,'#f0dab4','#ab7e45');
    line([[-57,0],[-75,0],[-75,22],[-95,22]],'#879e8c',2);
    line([[57,0],[75,0],[75,-22],[95,-22]],'#879e8c',2);
    line([[-20,0],[-7,12],[24,-17]],'#775631',4);
  }

  function checks() {
    for (const [x, tint] of [[-116,'#e6eee5'],[12,'#f8ecda']]) {
      box(x,-71,104,142,7,tint,'#9eb0a0');
      box(x+13,-54,78,18,3,'#d9e8d8','#a9bdab');
      for (let row = -16; row <= 47; row += 16) line([[x+14,row],[x+86,row]],'#93a99a',1.4);
    }
    line([[-11,5],[11,5]],'#8c7352',2.2);
    dot(0,5,2.8,'#b1824c');
  }

  function memory() {
    box(-150, -78, 300, 156, 8, '#e4eae0', '#9aab9e');
    for (let x = -124; x < 110; x += 53) {
      box(x,-52,26,104,3,'#b7cbbb','#92a99a');
      for (let y = -35; y <= 35; y += 17) line([[x+3,y],[x+23,y]],'#8fa99b');
    }
  }

  function tiles(close, dispatch) {
    box(-159,-90,318,180,7,'#d4e2d2','#92a999');
    for (const [x,y] of [[-165,-97],[165,-97],[-165,97],[165,97]]) bolt(x,y);
    roles.forEach(([key, short], i) => {
      const x = -143 + i % 4 * 57;
      const y = i < 4 ? -67 : 1;
      const on = key === routes[sceneScenario()].role && (close > .36 || !!routeSource);
      box(x,y+3,51,54,4,'#899e90','#809789');
      box(x,y,51,53,4,on ? '#9accaa' : '#eff3ea',on ? '#41775a' : '#8ca092');
      line([[x+9,y+14],[x+19,y+14],[x+19,y+22],[x+32,y+22]],on ? '#346d4b' : '#799282',1.5);
      dot(x+33,y+22,2,'#729783');
      const role = label('s.page.' + key).split(' ')[0].slice(0,8);
      textAt(document.documentElement.lang === 'az' ? role : short,x+6,y+38,9,'#294c38',650);
    });
    const amber = close > .34 && !(sceneScenario() === 'credit' && gateApproved);
    box(90,-67,55,121,5,amber ? '#d2a666' : '#a3baaa','#82998a');
    box(90,-71,55,120,5,amber ? '#f6deb1' : '#dfeae0',amber ? '#b6803d' : '#82998a');
    for (let y = -52; y <= 26; y += 13) line([[100,y],[134,y]],amber ? '#b3844a' : '#96ad9d');
    box(101,-22,33,38,5,amber ? '#e8bb72' : '#bfd5c5',amber ? '#9c6d32' : '#8fa998');
    line([[111,-8],[124,-8]], '#664b2e',2);
    line([[111,2],[124,2]], '#664b2e',2);
    if (close > .26) {
      const t = ease(.27,.86,close);
      const i = roles.findIndex(([id]) => id === routes[sceneScenario()].role);
      const x = -117 + i%4*57;
      const y = i<4 ? -49 : 19;
      const path = [[x,y],[81,y],[81,-12],[96,-12]];
      line(path,'#8b805f',1.6);
      pulseAlong(path,t,3.1,amber ? '#a46e32' : '#448962');

    }
  }

  function enclosure() {
    box(-166,-99,332,198,9,null,'#b1bdb1');
    box(-160,-93,320,186,7,null,'#e6ebe3');
    for (const [x,y] of [[-154,-83],[154,-83],[-154,83],[154,83]]) bolt(x,y);
    for (let y = -72; y < -32; y += 7) line([[-137,y],[-116,y]],'#a0b2a5');
    for (let x = 105; x <= 137; x += 8) line([[x,57],[x,73]],'#9aaf9f');
    box(-91,-31,52,52,13,'#255b3f','#18472e');
    line([[-77,8],[-77,-19],[-54,8],[-54,-19]],'#f4f8ef',3.6);
    dot(-49,-21,3.5,'#9fd7ac');
    textAt('NowAI',-26,-3,38,'#273c30',650);
    textAt('CORE',-24,27,11,'#5b7465',600,'ui-monospace, monospace');
  }

  function faceRegion(layer, z) {
    const w = layer.x / 2;
    const h = layer.y / 2;
    return [
      project(-w,-h,z), project(w,-h,z), project(w,h,z),
      project(-w,h,z-layer.depth), project(-w,h,z), project(-w,-h,z)
    ];
  }

  // The stack keeps clear of the words around it. Below it are the step tabs, and the button above them once it shows:
  // the stack always stays GAP px above them, rising as far as a screen's proportions need. Above it are the words at
  // the top left, which the stack keeps GAP px from and the incoming-work lines LINE_GAP px from, the decision card and
  // the slice list while they show, and the top of the scene, which it keeps CEILING px from. Where rising would break
  // one of those, the stack is drawn smaller instead (down to MIN_FIT of its size). The size for every moment of the
  // story is worked out once per layout and smoothed, so the stack glides between sizes as the page scrolls.
  const GAP = 40;
  const LINE_GAP = 14;
  const CEILING = 12;
  const MIN_FIT = .72;
  const PLAN_STEPS = 80;
  const PLAN_REACH = 5;   // plan steps either side that each size must also suit
  const tabRow = footer.querySelector('.core-story__tabs');
  const rings = new Map();
  let plan = null;
  let planKey = '';
  let planTime = -Infinity;

  function outline(w, h, radius = 15, steps = 2) {   // a slab's rounded outline, as points around it
    const key = w + 'x' + h;
    if (rings.has(key)) return rings.get(key);
    const x = w / 2;
    const y = h / 2;
    const points = [];
    for (const [ox, oy, start] of [
      [x - radius, -y + radius, -Math.PI / 2], [x - radius, y - radius, 0],
      [-x + radius, y - radius, Math.PI / 2], [-x + radius, -y + radius, Math.PI]
    ]) {
      for (let i = 0; i <= steps; i++) {
        const a = start + i / steps * Math.PI / 2;
        points.push([ox + radius * Math.cos(a), oy + radius * Math.sin(a)]);
      }
    }
    rings.set(key, points);
    return points;
  }

  function span(points, x0, x1) {   // the highest and the lowest point of a convex outline between x0 and x1
    let high = Infinity;
    let low = -Infinity;
    points.forEach(([ax, ay], i) => {
      const [bx, by] = points[(i + 1) % points.length];
      const ys = ax >= x0 && ax <= x1 ? [ay] : [];
      for (const x of [x0, x1]) if ((ax - x) * (bx - x) < 0) ys.push(ay + (by - ay) * (x - ax) / (bx - ax));
      for (const y of ys) {
        high = Math.min(high, y);
        low = Math.max(low, y);
      }
    });
    return { high, low };
  }

  function crosses(a, b, [x0, y0, x1, y1]) {   // whether the straight line from a to b enters the box
    let t0 = 0;
    let t1 = 1;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (!p) {
        if (q < 0) return false;
        continue;
      }
      if (p < 0) t0 = Math.max(t0, q / p);
      else t1 = Math.min(t1, q / p);
      if (t0 > t1) return false;
    }
    return true;
  }

  function layersAt(separate) {
    return dimensions.map(layer => ({ ...layer, z: lerp(layer.closed,layer.open,separate) }));
  }

  function stackAt(cam, drawing, close, k, buttonWeight) {   // the stack at size k, risen just enough above the words below
    const { cx, cy, scale, tilt, c, s } = cam;
    const P = (x, y, z, lift = 0) => [cx + (x * c - y * s) * scale * k, cy - lift + ((x * s + y * c) * tilt - z) * scale * k];
    const faces = drawing.filter(layer => !(layer.id === 'intake' && close > .55)).map(layer => {
      const lid = layer.id === 'intake';   // the lid lifts away and fades as the stack closes
      const z = layer.z + (lid ? close * 100 : 0);
      const ring = outline(layer.x, layer.y);
      return { shown:!lid || close < .38, top:ring.map(([x, y]) => P(x, y, z)), under:ring.map(([x, y]) => P(x, y, z - layer.depth)) };
    });
    let lift = 0;
    for (const { under } of faces) {
      for (const [[x0, top, x1], weight] of [[plan.tabs, 1], [plan.button, buttonWeight]]) {
        if (weight > 0) lift = Math.max(lift, (span(under, x0, x1).low - top) * weight);
      }
    }
    return { P, faces, lift };
  }

  function planFit(now) {
    const key = [width, height, document.documentElement.lang, document.fonts?.status, footer.offsetHeight, quickStart.offsetWidth, intake.style.getPropertyValue('--core-intake-top'), story.hasAttribute('data-intake-tight')].join('|');
    if (key === planKey || (plan && now - planTime < 180)) return;   // while a window is being resized, plan when it rests
    planKey = key;
    planTime = now;
    const cb = canvas.getBoundingClientRect();
    const { x:tx, y:ty, scale:sk } = translation;
    const toScene = (box, pad) => [
      (box.left - cb.left - tx) / sk - pad, (box.top - cb.top - ty) / sk - pad,
      (box.right - cb.left - tx) / sk + pad, (box.bottom - cb.top - ty) / sk + pad
    ];
    const linesOf = (el, shift = 0) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter(box => box.width > 1)
        .map(box => ({ left:box.left, right:box.right, top:box.top - shift, bottom:box.bottom - shift }));
    };
    // The words at the top left: the intro, and each step's own headline where it stands once shown.
    const holder = story.querySelector('.core-story__chapter');
    const introWords = [...intro.querySelectorAll('h1, p')].flatMap(el => linesOf(el))
      .concat([...intro.querySelectorAll('.core-story__links a')].map(link => link.getBoundingClientRect()));
    const stepWords = [...holder.children].map(step => {
      const shift = step.getBoundingClientRect().top - holder.getBoundingClientRect().top;
      return [...step.children].flatMap(el => linesOf(el, shift));
    });
    // The incoming-work list before and after it moves down: it travels in a straight line between the two.
    const travel = scene.style.getPropertyValue('--core-intake-travel');
    scene.style.setProperty('--core-intake-travel', 0);
    const chipsFrom = intakeButtons.map(button => button.getBoundingClientRect());
    scene.style.setProperty('--core-intake-travel', 1);
    const chipsTo = intakeButtons.map(button => button.getBoundingClientRect());
    scene.style.setProperty('--core-intake-travel', travel);
    plan = { tabs:toScene(tabRow.getBoundingClientRect(), GAP / sk), button:toScene(quickStart.getBoundingClientRect(), GAP / sk), sizes:[] };
    const cards = [gateCase, rail].map(el => toScene(el.getBoundingClientRect(), GAP / sk));   // the decision card and the slice list
    const roof = (CEILING - ty) / sk;
    const needed = [];
    for (let i = 0; i <= PLAN_STEPS; i++) {
      const p = i / PLAN_STEPS;
      const { camera:cam, spread, close, separate } = cameraAt(p, false);
      const drawing = layersAt(separate);
      const step = p > .765 ? 3 : p > .49 ? 2 : p > .21 ? 1 : 0;
      const words = step ? stepWords[step - 1] : introWords;
      const wordsShown = step ? introGone(p) : 1 - introGone(p);
      const above = words.map(box => toScene(box, GAP / sk));
      const t = ease(.10,.36,p);
      const chips = chipsFrom.map((from, j) => ({ top:lerp(from.top,chipsTo[j].top,t), bottom:lerp(from.bottom,chipsTo[j].bottom,t), right:lerp(from.right,chipsTo[j].right,t) }));
      const chipsTop = Math.min(...chips.map(chip => chip.top));
      // The lines climb from the incoming-work list to the stack: only the words above the list can be in their way.
      const overLines = words.filter(box => box.bottom + LINE_GAP < chipsTop).map(box => toScene(box, LINE_GAP / sk));
      const starts = chips.map(chip => [(chip.right - cb.left - tx) / sk + 6, ((chip.top + chip.bottom) / 2 - cb.top - ty) / sk]);
      const portZ = lerp(drawing[0].z, drawing.at(-1).z, spread);
      const at = k => stackAt(cam, drawing, close, k, quickAt(p));
      const clearOf = boxes => ({ faces, lift }) => boxes.every(([x0, y0, x1, y1]) => faces.every(({ shown, top, under }) =>
        !shown || span(top, x0, x1).high - lift >= y1 || span(under, x0, x1).low - lift <= y0));
      const rules = [
        [1, ({ faces, lift }) => faces.every(({ shown, top }) => !shown || Math.min(...top.map(([, y]) => y)) - lift >= roof)],
        [wordsShown, clearOf(above)],
        [ease(.49,.56,p) * (1 - ease(.70,.765,p)), clearOf([cards[0]])],
        [ease(.20,.35,p) * (1 - ease(.43,.56,p)), clearOf([cards[1]])],
        [overLines.length ? wordsShown * (1 - ease(.40,.53,p)) : 0, ({ P, lift }) => starts.every((from, j) => {
          const port = P(-180, -76 + j * 24, portZ, lift);
          const path = [from, [from[0] + 18, from[1]], [Math.max(from[0] + 18, port[0] - 31), port[1]], port];
          return path.slice(1).every((point, n) => !overLines.some(box => crosses(path[n], point, box)));
        })]
      ];
      needed.push(Math.min(...rules.map(([weight, rule]) => {   // the largest size each rule allows, by how visible it is
        if (weight < .01 || rule(at(1))) return 1;
        let small = MIN_FIT;
        let large = 1;
        if (rule(at(small))) {
          for (let n = 0; n < 7; n++) {
            const mid = (small + large) / 2;
            if (rule(at(mid))) small = mid;
            else large = mid;
          }
        }
        return 1 - weight * (1 - small);
      })));
    }
    // Never larger than any moment close by needs, then averaged, so the size changes gently with the scroll.
    const near = (list, i) => list.slice(Math.max(0, i - PLAN_REACH), i + PLAN_REACH + 1);
    const floor = needed.map((_, i) => Math.min(...near(needed, i)));
    plan.sizes = floor.map((_, i) => near(floor, i).reduce((sum, size) => sum + size, 0) / near(floor, i).length);
  }

  function fitStack(drawing, now, close) {
    if (camera.compact) return;
    planFit(now);
    const x = clamp(progress) * PLAN_STEPS;
    const i = Math.min(PLAN_STEPS - 1, Math.floor(x));
    const k = lerp(plan.sizes[i], plan.sizes[i + 1], x - i);
    camera.cy -= stackAt(camera, drawing, close, k, quickAt(progress)).lift;   // exact for this moment: the tabs keep their gap
    camera.scale *= k;
  }

  function drawSlabs(now, spread, close, dispatch, intakeOpacity, partsOpacity, destinationsOpacity) {
    const separate = spread * (1 - ease(.04,.85,close));
    const drawing = layersAt(separate);
    fitStack(drawing, now, close);
    const coreZ = drawing.find(layer => layer.id === 'core').z;
    const baseZ = drawing[0].z;
    const outputFade = ease(.30,1,dispatch);
    const under = project(0,0,baseZ-12);
    ctx.save();
    ctx.translate(under[0]+16,under[1]+25);
    ctx.scale(camera.scale,camera.scale*.42);
    const shadow = ctx.createRadialGradient(0,0,8,0,0,258);
    shadow.addColorStop(0,'rgba(47,66,55,.15)');
    shadow.addColorStop(1,'rgba(104,117,103,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(-270,-270,540,540);
    ctx.restore();

    drawInputs(lerp(baseZ, drawing.at(-1).z, spread), now, spread, intakeOpacity);
    drawConnections(baseZ,destinationsOpacity,now,false);
    drawConnections(coreZ,outputFade,now,true);
    if (separate > .2) {
      ctx.save();
      ctx.setLineDash([2,5]);
      line([project(0,0,baseZ),project(0,0,drawing.at(-1).z)],'#9bad9f',.75);
      ctx.restore();
    }

    const steel = ['#f7f8f3','#dfe8de','#a4b3a8','#d4ddd3'];
    const muted = ['#f1f5ee','#dbe8da','#a0b3a5','#cad8cd'];
    const focusColors = ['#edf7ed','#d2ead5','#83a58e','#b2c8b7'];
    hitRegions.length = 0;
    for (const layer of drawing) {
      const lid = layer.id === 'intake';
      let z = layer.z;
      let alpha = !lid ? 1 : 1 - ease(.05,.6,close);
      if (alpha <= .01) continue;
      if (lid) z += close * 100;
      const current = activePart === layer.id || (!!routeSource && layer.id === 'intake');
      if (selected === 1 && activePart && !current) alpha *= .25;
      ctx.save();
      ctx.globalAlpha = alpha;
      slab(layer.x,layer.y,z,layer.depth,current ? focusColors : layer.id === 'core' ? muted : steel);
      plane(z,() => layer.draw(close,dispatch));
      ctx.restore();
      if (partsOpacity > .01) hitRegions.push({ id:layer.id, points:faceRegion(layer,z), anchor:project(layer.x/2,-layer.y/2+13,z) });
    }

    if (partsOpacity > .01 && !camera.compact) {
      ctx.save();
      ctx.globalAlpha = partsOpacity;
      drawPartLines();
      ctx.restore();
    }
    if (!camera.compact && selected === 2) {
      ctx.save();
      ctx.globalAlpha = ease(.49,.56,progress) * (1-ease(.70,.765,progress));
      const bounds = gateCase.getBoundingClientRect();
      const cb = canvas.getBoundingClientRect();
      const x = (bounds.left - cb.left - translation.x) / translation.scale;
      const y = (bounds.top + 24 - cb.top - translation.y) / translation.scale;
      const anchor = project(130,-15,coreZ);
      const color = gateApproved ? '#448962' : '#ac7d41';
      line([anchor,[x-34,y],[x-5,y]],color,1);
      dot(...anchor,2,color);
      ctx.restore();
    }
    if (!story.hasAttribute('data-output-ready')) deliveryCard(outputFade);
  }

  function cameraAt(p, compact) {   // how far the stack has opened, closed and sent its result at progress p, and the camera on it
    const small = width < 770;
    const spread = ease(.05,.35,p);
    const close = ease(.41,.66,p);
    const dispatch = ease(.77,.96,p);
    const theta = .55 + .13 * spread - .17 * close;
    const ports = Math.max(1-spread,dispatch);
    const separate = spread * (1-ease(.04,.85,close));
    const mediumScale = Math.min(width/615,(height-330)/405);
    const fittedScale = Math.min(mediumScale,(width-278)/466);
    const restScale = small ? (compact ? Math.min(width/495,height/328) : lerp(mediumScale,fittedScale,ports)) : 1;
    const towerScale = compact ? Math.min(width/470,(height-22)/790) : small ? Math.min(.62,(height-120)/790) : .64;
    const restX = 608 + (small ? (compact ? 0 : 21-27*ports-35*dispatch) : 8*spread-12*close-46*dispatch);
    const restY = small ? 620-height*(compact ? .39 : .35)-(compact ? 0 : 20*dispatch) : lerp(397,425,spread)+18*close-42*dispatch;
    const towerY = small ? 620-height*(compact ? .09 : .20) : 513;
    return {
      spread, close, dispatch, separate,
      camera: {
        small,
        compact,
        scale:lerp(restScale*(1+.08*close),towerScale,separate),
        tilt: .52 + .03*spread + .16*close,
        c: Math.cos(theta),
        s: Math.sin(theta),
        cx:lerp(restX, 590,separate),
        cy:lerp(restY, towerY,separate)
      }
    };
  }

  function display(now) {
    frameId = 0;
    if (!visible || !width || !height) return;
    const elapsed = now - lastFrame;
    if (lastFrame && !reduce.matches && elapsed < 15) { schedule(); return; }
    lastFrame = now;
    const compact = compactLayout.matches || reduce.matches;
    if (!compact) {
      const top = story.getBoundingClientRect().top;
      const target = clamp((header.offsetHeight - top) / Math.max(1, story.offsetHeight - scene.offsetHeight));
      // Blend fast wheel and trackpad updates without moving the page itself.
      progress = paintedCompact !== false || Math.abs(target - progress) < .001
        ? target
        : lerp(progress, target, 1 - Math.exp(-Math.min(elapsed, 50) / 45));
    } else {
      if (tabUsed || reduce.matches) progress = reduce.matches ? manual : lerp(manualFrom, manual, ease(0, 670, now - manualStart));
      else {
        // Phones: until a step is chosen, the stack opens a little as it scrolls into view (a finger cannot trigger it any other way).
        const top = canvas.getBoundingClientRect().top;
        progress = .2 * ease(0, 1, clamp((innerHeight - top) / (innerHeight * .75)));
      }
    }
    const step = progress > .765 ? 3 : progress > .49 ? 2 : progress > .21 ? 1 : 0;
    if (step !== selected) {
      selected = step;
      story.dataset.chapter = step;
      if (step !== 1) {
        clearTimeout(hideTimer);
        hovered = focused = pinned = '';
        frame.removeAttribute('data-hit');
        showPart();
      }
      if (step > 1) intakeHover = intakeFocus = '';
      updateIntake();
      tabs.forEach((tab, i) => {
        if (i === step) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      });
    }
    const spread = ease(.05,.35,progress);
    const close = ease(.41,.66,progress);
    const dispatch = ease(.77,.96,progress);
    const partsOpacity = compact ? Number(step === 1) : ease(.20,.35,progress) * (1 - ease(.43,.56,progress));
    const intakeOpacity = compact ? Number(step < 2) : 1 - ease(.40,.53,progress);
    const destinationsOpacity = compact ? 1 - spread : 1 - ease(.09,.20,progress);
    if (progress !== paintedProgress || compact !== paintedCompact) {
      // The text, controls and connector lines follow the same timeline as the stack.
      scene.style.setProperty('--core-intro-opacity', 1 - introGone(progress));
      scene.style.setProperty('--core-parts-opacity', partsOpacity);
      scene.style.setProperty('--core-intake-opacity', intakeOpacity);
      scene.style.setProperty('--core-intake-travel', ease(.10,.36,progress));
      scene.style.setProperty('--core-quick-opacity', quickAt(progress));
      scene.style.setProperty('--core-gate-opacity', ease(.49,.56,progress) * (1 - ease(.70,.765,progress)));
      // The example card belongs to the first step: it fades where it is before the next step's headline arrives.
      const card = 1 - ease(.12,.20,progress);
      scene.style.setProperty('--core-card-opacity', card);
      scene.style.setProperty('--core-card-visibility', card > .01 ? 'visible' : 'hidden');
      quickStart.inert = compact || quickAt(progress) < .3;
      gateCase.hidden = compact && step !== 2;
      gateCase.inert = step !== 2;
      intro.inert = !compact && step > 0;
      rail.inert = step !== 1;
      intake.inert = step > 1;
      paintedProgress = progress;
      paintedCompact = compact;
    }
    if (openGateOnCompact && step === 2) {
      openGateOnCompact = false;
      gateCase.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      gateCase.focus({ preventScroll: true });
    }
    updateOrderTrace(now);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const small = width < 770;
    const sceneScale = small ? 1 : Math.min(width / 1216, height / 620);
    translation = { x:(width - 1216*sceneScale)/2, y:height - 620*sceneScale, scale:sceneScale };
    ctx.translate(translation.x,translation.y);
    ctx.scale(translation.scale,translation.scale);
    camera = cameraAt(progress, compact).camera;
    drawSlabs(now, spread, close, dispatch, intakeOpacity, partsOpacity, destinationsOpacity);
    if (!reduce.matches) schedule();
  }

  function schedule() {
    if (!frameId) frameId = requestAnimationFrame(display);
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => {
    const positions = [0, .355, .69, .98];
    tabUsed = true;
    manualFrom = progress;
    manual = positions[i];
    manualStart = performance.now();
    openGateOnCompact = i === 2 && (compactLayout.matches || reduce.matches);
    if (!compactLayout.matches && !reduce.matches) {
      const start = scrollY + story.getBoundingClientRect().top - header.offsetHeight;
      scrollTo({ top: start + positions[i] * (story.offsetHeight - scene.offsetHeight), behavior: 'smooth' });
    }
    schedule();
  }));

  window.addEventListener('resize', remeasure, { passive: true });
  reduce.addEventListener('change', () => { cancelAutomatic(); if (routeSource) { clearTimeout(routeTimer); showDestination(true); } remeasure(); });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(remeasure);
    observer.observe(canvas);
    observer.observe(footer);
  }
  if (window.SITE?.onLang) SITE.onLang(() => { setScenarioCopy(); describePart(); remeasure(); });   // new words: new room
  if (document.fonts?.ready) document.fonts.ready.then(remeasure);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
    }, { rootMargin: '120px' });
    observer.observe(story);
  }
  setScenarioCopy();
  remeasure();
})();
