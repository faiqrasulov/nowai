/* ---------- Language ---------- */
let LANG = "en";

function tr(key) {
  const e = I18N[key];
  if (!e) return key;
  const s = e[LANG] ?? e.en;
  return LANG === "az" ? s.replace(/(\d) (?=\d{3}(?!\d))/g, "$1 ") : s;
}

function rich(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/@([\wəüöğışçƏÜÖĞİŞÇ]+)/g, '<span class="at">@$1</span>');
}

/* EN 18,420.50 / AZ 18 420,50 */
function fmtNum(v, dec = 0) {
  const [i, d] = Math.abs(v).toFixed(dec).split(".");
  const sep = LANG === "az" ? " " : ",", point = LANG === "az" ? "," : ".";
  const body = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (v < 0 ? "−" : "") + body + (d ? point + d : "");
}

function applyLang() {
  const root = document.documentElement;
  root.lang = LANG;
  document.querySelectorAll("[data-i]").forEach(el => { el.textContent = tr(el.dataset.i); });
  document.querySelectorAll("[data-ih]").forEach(el => { el.innerHTML = rich(tr(el.dataset.ih)); });
  document.querySelectorAll("[data-ia]").forEach(el => { el.setAttribute("aria-label", tr(el.dataset.ia)); });
  document.querySelectorAll("[data-n]").forEach(el => {
    const raw = el.dataset.n, dec = raw.includes(".") ? raw.split(".")[1].length : 0;
    el.textContent = fmtNum(parseFloat(raw), dec);
  });
}

/* NowAI site runtime. One wrapped block: it exposes only window.SITE and reassigns the global rich()
   from core.js (copied above this block at build time) so strings can carry relative links.
   Sends nothing, stores only the language choice under "nowai-lang". */
(() => {
  const coreRich = rich;
  rich = s => coreRich(s).replace(/\[([^\]]+)\]\(([a-z0-9._\/#-]+)\)/g, '<a href="$2">$1</a>');

  const listeners = [];
  const root = document.documentElement;
  const body = document.body;
  const slug = body.dataset.page || "home";

  function pageTitle() {
    return slug === "home" ? tr("s.page.home.title") : tr("s.page." + slug) + " · NowAI";
  }

  function setLang(l, remember = true) {
    LANG = l === "az" ? "az" : "en";
    root.lang = LANG;
    applyLang();
    document.title = pageTitle();
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
    if (remember) { try { localStorage.setItem("nowai-lang", LANG); } catch (e) { /* storage may be blocked */ } }
    listeners.forEach(fn => { try { fn(LANG); } catch (e) { console.error(e); } });
  }

  function onLang(fn) { listeners.push(fn); }

  function fmtAZN(v, dec = 0) { return fmtNum(v, dec) + "\u00a0AZN"; }

  function fmtMult(v) { return (LANG === "az" ? v.toFixed(1).replace(".", ",") : v.toFixed(1)) + "×"; }

  /* ---------- Header menus: click or Enter/Space opens; one open at a time; Esc or outside click closes ---------- */
  const navBtns = Array.from(document.querySelectorAll(".n-nav__btn"));
  let openBtn = null;

  function panelOf(btn) { return document.getElementById(btn.getAttribute("aria-controls")); }

  function closeMenu(focus) {
    if (!openBtn) return;
    const b = openBtn;
    b.setAttribute("aria-expanded", "false");
    const p = panelOf(b);
    if (p) p.hidden = true;
    openBtn = null;
    if (focus) b.focus();
  }

  function openMenu(btn) {
    if (openBtn && openBtn !== btn) closeMenu(false);
    btn.setAttribute("aria-expanded", "true");
    const p = panelOf(btn);
    if (p) p.hidden = false;
    openBtn = btn;
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      if (openBtn === btn) closeMenu(false); else openMenu(btn);
    });
  });

  document.addEventListener("click", e => {
    if (!openBtn) return;
    const p = panelOf(openBtn);
    if (p && p.contains(e.target)) {
      if (e.target.closest("a")) closeMenu(false);
      return;
    }
    closeMenu(false);
  });

  /* ---------- Drawer (below 1080px): full height from the right; locks body scroll; Esc closes ---------- */
  const drawer = document.getElementById("n-drawer");
  const burger = document.querySelector(".n-burger");
  let lastFocus = null;

  function setDrawer(open) {
    if (!drawer || !burger) return;
    if (open) {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      root.classList.add("n-lock");
      requestAnimationFrame(() => drawer.classList.add("n-drawer--open"));
      burger.setAttribute("aria-expanded", "true");
      const c = drawer.querySelector(".n-drawer__close");
      if (c) c.focus();
    } else {
      drawer.classList.remove("n-drawer--open");
      root.classList.remove("n-lock");
      burger.setAttribute("aria-expanded", "false");
      drawer.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }

  if (burger && drawer) {
    burger.addEventListener("click", () => setDrawer(burger.getAttribute("aria-expanded") !== "true"));
    drawer.querySelectorAll(".n-drawer__close, [data-close]").forEach(el => el.addEventListener("click", () => setDrawer(false)));
    drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setDrawer(false)));
    drawer.querySelectorAll(".n-acc__btn").forEach(b => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!open));
      const p = document.getElementById(b.getAttribute("aria-controls"));
      if (p) p.hidden = open;
    }));
    drawer.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const f = Array.from(drawer.querySelectorAll("a, button")).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener("resize", () => { if (window.innerWidth >= 1080 && !drawer.hidden) setDrawer(false); });
  }

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (drawer && !drawer.hidden) { setDrawer(false); return; }
    if (openBtn) closeMenu(true);
  });

  /* ---------- Message originals (message language contract v2, {{orig:…}}) ----------
     The main line is in the page language. The chip opens the original line; CSS hides the whole chip when the
     original language is the page language. Without JavaScript the chip and the original stay hidden. */
  document.querySelectorAll(".n-orig__chip").forEach(b => {
    const t = document.getElementById(b.getAttribute("aria-controls"));
    if (!t) return;
    b.hidden = false;
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      t.hidden = !open;
    });
  });

  /* ---------- Week reel ({{week}} on industry pages; SITEMAP.md 3.5) ----------
     A ledger of five moments. Each row plays two beats: without NowAI (the red side lands with what it cost), then
     with NowAI (the green side wipes in: the role, what would change, what a person approves). Played rows stay
     filled, so the finished reel is the before/after at a glance; the totals under the rows step once per beat
     (never a count-up). Below 1080px one row shows at a time (Show all and reduced motion list all five).
     Autoplays once when 35% is in view. Holds while keyboard focus is on a control other than play/pause, while the
     reel is out of view and (below 1080px) while a real mouse moves over the rows; pauses when the tab hides or
     Details opens. The caption speaks only after the visitor has used the reel. Reduced motion (also switched on
     mid-play or while paused): no autoplay, the finished ledger. Print: the finished ledger. Without JavaScript:
     every row filled, the full lines and the final totals.
     The role ledger ({{role_ledger}} on role pages, .n-reel--roles) is the same component without the totals
     table: five companies are never added up, so there is nothing to step, and at the end the caption announces
     its own line ([data-fin]), never a total. Each row also names its industry (.n-reel__ind). */
  const reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const narrowMQ = window.matchMedia ? window.matchMedia("(max-width: 1079px)") : null;

  function initReel(fig) {
    const ctl = fig.querySelector("[data-reel-ctl]");
    const rows = Array.from(fig.querySelectorAll(".n-reel__row"));
    if (!ctl || !rows.length) return;
    const list = fig.querySelector(".n-reel__rows");
    const stops = Array.from(ctl.querySelectorAll("[data-stop]"));
    const pp = ctl.querySelector("[data-pp]");
    const all = ctl.querySelector("[data-all]");
    const now = ctl.querySelector("[data-now]");
    const replay = fig.querySelector("[data-replay]");
    const finH = fig.querySelector(".n-reel__fin") || fig.querySelector("[data-fin]");   // the role ledger: no totals
    const trs = Array.from(fig.querySelectorAll(".n-reel__tot tbody tr"));
    const tvW = trs.map(r => r.querySelector(".n-reel__cv--without [data-tv]"));
    const tvN = trs.map(r => r.querySelector(".n-reel__cv--with [data-tv]"));
    const gaps = trs.map(r => r.querySelector("[data-g]"));
    const nums = s => (s || "").trim().split(/\s+/).filter(Boolean).map(Number);
    const steps = { without: rows.map(r => nums(r.dataset.without)), with: rows.map(r => nums(r.dataset.with)) };
    const stake = trs.map((_, k) => steps.without.reduce((a, s) => a + (s[k] || 0), 0));
    const last = rows.length - 1, LAND = 600;
    let cur = 0, beat = "without", state = "idle", timer = 0, landT = 0, left = 0, t0 = 0;
    let hover = false, focusHold = false, away = false, touched = false;

    const held = () => hover || focusHold || away;
    const still = () => !!(reduceMQ && reduceMQ.matches);
    const narrow = () => !!(narrowMQ && narrowMQ.matches);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const share = (x, k) => (stake[k] > 0 ? Math.min(1, x / stake[k]) : 0).toFixed(3);
    const text = el => (el ? el.textContent.trim().replace(/\s+/g, " ") : "");

    // What has landed on row i: "" nothing yet, "w" the red side, "w n" both sides.
    function land(i) {
      if (state === "done" || i < cur) return "w n";
      if (state === "idle" || i > cur) return "";
      return beat === "with" ? "w n" : "w";
    }

    // A beat lasts as long as its one line needs in the current language. The first row teaches the pattern; below
    // 1080px the with-NowAI beat is the card's last look, so it stays a second longer.
    function dwell() {
      const c = text(rows[cur].querySelector(".n-reel__side--" + beat + " .n-reel__line")).length || 60;
      const base = beat === "without" ? clamp(600 + 16 * c, 1600, 2600) : clamp(1200 + 18 * c, 2400, 3600);
      return base + (cur === 0 ? 600 : 0) + (beat === "with" && narrow() ? 1000 : 0);
    }

    function label() {
      const t = state === "playing" ? tr("s.wk.pause") : state === "done" ? tr("s.wk.replay") : tr("s.wk.play");
      pp.setAttribute("aria-label", t);
      pp.title = t;
      pp.dataset.state = state;
    }

    function put(el, v, flash) {
      if (!el) return;
      const raw = String(Math.round(v * 100) / 100), td = el.closest("td"), moved = el.dataset.n !== raw;
      el.dataset.n = raw;                       // applyLang (EN/AZ switch) re-renders from data-n
      el.textContent = fmtNum(parseFloat(raw), raw.includes(".") ? raw.split(".")[1].length : 0);
      if (!td) return;
      td.classList.remove("is-step");
      if (flash && moved) { void td.offsetWidth; td.classList.add("is-step"); }
    }

    // The totals: what has landed so far, one step per beat (never a count-up), after the row's own amount shows.
    // The WEEK checks keep with <= without at every stop, so the green part of a bar never passes the stripes.
    // A role ledger has no totals table: nothing to step.
    function totals(animate) {
      clearTimeout(landT);
      if (!trs.length) return;
      const w = trs.map(() => 0), n = trs.map(() => 0);
      rows.forEach((_, i) => {
        const l = land(i);
        if (l.includes("w")) steps.without[i].forEach((v, k) => { w[k] += v || 0; });
        if (l.includes("n")) steps.with[i].forEach((v, k) => { n[k] += v || 0; });
      });
      const apply = () => trs.forEach((_, k) => {
        put(tvW[k], w[k], animate);
        put(tvN[k], n[k], animate);
        if (gaps[k]) { gaps[k].style.setProperty("--gw", share(w[k], k)); gaps[k].style.setProperty("--gn", share(n[k], k)); }
      });
      if (animate) landT = setTimeout(apply, LAND); else apply();
    }

    // The caption is a polite live region only once the visitor has used the reel; autoplay alone stays silent.
    function say(t) {
      if (!now) return;
      now.setAttribute("aria-live", touched ? "polite" : "off");
      now.textContent = t;
    }

    function caption() {
      if (state === "idle") { say(""); return; }
      if (state === "done") { say(text(finH)); return; }
      const r = rows[cur], side = r.querySelector(".n-reel__side--" + beat);
      say([r.querySelector(".n-reel__ind"), r.querySelector(".n-reel__when"), r.querySelector(".n-reel__h"),
        side && side.querySelector(".n-reel__k"), side && side.querySelector(".n-reel__line")].map(text).filter(Boolean)
        .join(" · "));
    }

    // Keyboard focus never falls to the page: if the focused control just hid, focus the current stop.
    function keepFocus() {
      const a = document.activeElement;
      if (!a || a === document.body || !fig.contains(a)) return;
      if (a.offsetParent === null || getComputedStyle(a).visibility === "hidden") (stops[cur] || pp).focus();
    }

    function closeMore(i) {
      const r = rows[i], b = r && r.querySelector("[data-more]");
      if (!r || !r.classList.contains("is-open")) return;
      r.classList.remove("is-open");
      if (b) b.setAttribute("aria-expanded", "false");
    }

    function render(animate) {
      const a = animate && !still();
      fig.classList.toggle("is-still", !a);
      fig.classList.toggle("is-done", state === "done");
      fig.dataset.beat = beat;
      rows.forEach((r, j) => {
        r.dataset.land = land(j);
        r.classList.toggle("is-now", j === cur && (state === "playing" || state === "paused"));
        r.classList.toggle("is-shown", j === cur);
      });
      stops.forEach((b, j) => {
        b.dataset.fill = state === "done" || j < cur ? "done" : state === "idle" || j > cur ? ""
          : beat === "without" ? "without" : state === "playing" || b.classList.contains("is-running") ? "with" : "done";
        if (j === cur && state !== "idle") b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (replay) replay.hidden = state !== "done";
      if (all) all.hidden = state === "done";
      totals(a);
      caption();
      keepFocus();
    }

    // Count down what is left of the current beat, unless something holds the reel (then the fill stays frozen).
    function run() {
      clearTimeout(timer);
      if (state !== "playing") return;
      if (held()) { fig.classList.add("is-held"); return; }
      fig.classList.remove("is-held");
      t0 = Date.now();
      timer = setTimeout(next, left);
    }

    // A fresh beat: its own length, the stop's half-fill restarted.
    function tick() {
      clearTimeout(timer);
      left = dwell();
      fig.style.setProperty("--n-reel-dwell", left + "ms");
      fig.classList.remove("is-held");
      stops.forEach(s => s.classList.remove("is-running"));
      const b = stops[cur];
      if (b) { void b.offsetWidth; b.classList.add("is-running"); }
      run();
    }

    function hold() {
      if (state !== "playing" || fig.classList.contains("is-held")) return;
      clearTimeout(timer);
      left = Math.max(0, left - (Date.now() - t0));
      fig.classList.add("is-held");
    }

    // Resume only a reel that is actually held while playing; a running timer is never restarted with stale time.
    function release() { if (!held() && state === "playing" && fig.classList.contains("is-held")) run(); }

    function next() {
      if (beat === "without") beat = "with";
      else if (cur < last) { if (narrow()) closeMore(cur); cur += 1; beat = "without"; }
      else { finish(true); return; }
      render(true);
      tick();
    }

    function finish(animate) {
      clearTimeout(timer);
      stops.forEach(s => s.classList.remove("is-running"));
      fig.classList.remove("is-held");
      cur = last; beat = "with"; state = "done";
      render(animate);
      label();
    }

    // Back to the empty ledger: titles on the left, every side waiting, the totals at zero, every Details closed,
    // and (below 1080px) one card at a time again.
    function reset() {
      fig.classList.remove("is-all");
      clearTimeout(timer);
      stops.forEach(s => s.classList.remove("is-running"));
      cur = 0; beat = "without"; state = "idle";
      rows.forEach((_, i) => closeMore(i));
      render(false);
    }

    // The finished ledger with every row listed, also below 1080px (Show all, reduced motion). A natural end of
    // autoplay keeps the one-card stage, so nothing jumps unless the visitor asks for it.
    function showAll() {
      finish(false);
      fig.classList.add("is-all");
    }

    function play(fromStart) {
      clearTimeout(timer);
      const b = stops[cur];
      const resume = !fromStart && state === "paused" && !!b && b.classList.contains("is-running");
      if (fromStart || state === "done") reset();
      const first = state === "idle";
      state = "playing";
      label();
      if (resume) { run(); return; }                 // Play after Pause mid-beat: the frozen fill goes on
      if (first) { render(true); tick(); return; }   // the first row lands
      next();                                        // paused on a resolved row: on with the next beat
    }

    function pause() {
      if (state !== "playing") return;
      hold();
      clearTimeout(timer);
      state = "paused";
      fig.classList.add("is-held");
      label();
    }

    // Brings row j into view when a visitor's jump left it off screen or under the sticky bars (only on their
    // action). The row's scroll-margin-top is the clearance: the header, plus the sticky controls below 760px.
    function reveal(j) {
      const b = rows[j].getBoundingClientRect();
      const m = parseFloat(getComputedStyle(rows[j]).scrollMarginTop) || 0;
      if (b.top < m || b.bottom > (window.innerHeight || 800)) {
        rows[j].scrollIntoView({ block: b.top < m ? "start" : "nearest", behavior: still() ? "auto" : "smooth" });
      }
    }

    // A stop, Details, or keyboard focus on a row not played yet: that row shown resolved (both sides), paused.
    // After the end it only brings that row forward (below 1080px, the visible card); the ledger is never rewound.
    function jump(j) {
      touched = true;
      if (state === "done") {
        if (j !== cur && narrow() && !fig.classList.contains("is-all")) closeMore(cur);
        cur = j;
        render(false);
        say([rows[j].querySelector(".n-reel__ind"), rows[j].querySelector(".n-reel__when"),
          rows[j].querySelector(".n-reel__h")].map(text).filter(Boolean).join(" · "));
        reveal(j);
        return;
      }
      pause();
      stops.forEach(s => s.classList.remove("is-running"));
      if (j !== cur && narrow()) closeMore(cur);
      state = "paused"; cur = j; beat = "with";
      render(true);
      label();
      reveal(j);
    }

    pp.addEventListener("click", () => {
      touched = true;
      if (state === "playing") pause(); else play(state === "done");
    });
    // Both buttons are about to hide: keyboard focus moves to the reel's own play/pause first.
    if (replay) replay.addEventListener("click", () => { touched = true; pp.focus(); play(true); });
    if (all) all.addEventListener("click", () => { touched = true; pp.focus(); showAll(); });
    stops.forEach((b, j) => b.addEventListener("click", () => jump(j)));
    rows.forEach((r, j) => {
      const more = r.querySelector("[data-more]");
      if (!more) return;
      more.hidden = false;
      more.addEventListener("click", () => {
        const open = more.getAttribute("aria-expanded") !== "true";
        more.setAttribute("aria-expanded", String(open));
        r.classList.toggle("is-open", open);
        if (!open) return;
        touched = true;
        if (state !== "done" && land(j) !== "w n") jump(j); else pause();
      });
    });
    // A moving mouse holds the reel only below 1080px, where the next card replaces the one being read. On the
    // desktop ledger played rows stay in view, so the reel goes on. Never on touch, never for content scrolling
    // under a resting pointer.
    if (list) {
      list.addEventListener("pointermove", e => {
        if (!narrow()) return;
        const moved = e.movementX === undefined || e.movementX !== 0 || e.movementY !== 0;
        if (e.pointerType === "mouse" && moved && !hover) { hover = true; hold(); }
      });
      list.addEventListener("pointerleave", () => { if (hover) { hover = false; release(); } });
    }
    fig.addEventListener("focusin", e => {
      let kb = false;
      try { kb = e.target !== pp && e.target.matches(":focus-visible"); } catch (err) { kb = false; }
      focusHold = kb;
      // Keyboard focus that lands on a link in a row not played yet (its content is transparent) shows that row.
      const r = kb && e.target.closest(".n-reel__side") ? e.target.closest(".n-reel__row") : null;
      const j = r ? rows.indexOf(r) : -1;
      if (j >= 0 && state !== "done" && land(j) !== "w n") { jump(j); return; }
      if (kb) hold(); else release();
    });
    fig.addEventListener("focusout", e => {
      if (e.relatedTarget && fig.contains(e.relatedTarget)) return;
      focusHold = false;
      release();
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && state === "playing") pause(); });
    if (reduceMQ) {
      const onMotion = e => { if (e.matches && state !== "done") showAll(); };
      if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotion);
      else if (reduceMQ.addListener) reduceMQ.addListener(onMotion);
    }
    onLang(() => { label(); caption(); });         // numbers re-render from data-n; the next beat's length follows

    // Printing or saving a PDF mid-play (or before the reel plays) prints the finished ledger: every row is
    // printed in full, so the totals, bars, tally labels and end heading must be final too.
    window.addEventListener("beforeprint", () => { if (state !== "done") finish(false); });

    ctl.hidden = false;
    fig.classList.add("is-live");
    if (still()) { showAll(); return; }
    reset();
    label();
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      setTimeout(() => { if (!touched && state === "idle" && !still()) play(false); }, 400);
    };
    if ("IntersectionObserver" in window) {
      // Stays connected: the first time 35% is in view the reel starts; whenever it leaves the viewport it holds,
      // and it goes on when it comes back.
      const io = new IntersectionObserver(es => {
        const e = es[es.length - 1];
        const vh = window.innerHeight || 800;
        if (!started && e.isIntersecting && (e.intersectionRatio >= 0.35 || e.intersectionRect.height >= 0.35 * vh)) go();
        const out = !e.isIntersecting;
        if (out === away) return;
        away = out;
        if (away) hold(); else release();
      }, { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.75] });
      io.observe(fig);
    } else go();
  }

  /* ---------- Language switch ---------- */
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

  let stored = "en";
  try { stored = localStorage.getItem("nowai-lang") || "en"; } catch (e) { /* storage may be blocked */ }
  if (stored === "az") setLang("az", false);
  root.classList.remove("lang-pending");

  document.querySelectorAll("[data-reel]").forEach(initReel);

  window.SITE = { setLang, onLang, fmtAZN, fmtMult };
})();
