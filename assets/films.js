/* The two NowAI films.
   - Home: the 24-second desk film plays by itself, silently and on a loop, while at least half of it is on screen; not
     when the reader asks for reduced motion or to save data. "Play with sound" starts it again from the beginning with sound.
   - Platform: the 18-second film plays where it is, with sound and the browser's own controls, when its button is pressed.
   Neither video downloads until it is about to play; small frames get the 720p file. */
(function () {
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"/><path d="M15.4 8.8a4.6 4.6 0 0 1 0 6.4M17.9 6.3a8.2 8.2 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"/><path d="M15.6 9.6l4.8 4.8m0-4.8l-4.8 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  const lang = () => (document.documentElement.lang === "az" ? "az" : "en");
  const t = key => { try { const e = I18N[key]; return (e && (e[lang()] || e.en)) || key; } catch (err) { return key; } };
  const label = (el, key) => { el.dataset.ia = key; el.setAttribute("aria-label", t(key)); };
  const calm = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const start = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  function load(v, cssWidth) {   // the 1080p file only where it shows (wide frame, sharp screen)
    if (v.getAttribute("src")) return;
    const px = cssWidth * (window.devicePixelRatio || 1);
    v.src = px > (+v.dataset.big || 900) ? v.dataset.srcLg : v.dataset.srcSm;
  }

  /* Home: the desk film, in its own section. */
  const frame = document.querySelector('[data-film="desk"]');
  if (frame) {
    const v = frame.querySelector("video"), bar = frame.querySelector(".n-film__bar i");
    const soundBtn = frame.querySelector("[data-film-sound]"), toggle = frame.querySelector("[data-film-toggle]"), mute = frame.querySelector("[data-film-mute]");
    let inView = false, userPaused = false, withSound = false;
    const auto = () => !calm.matches && !saveData;
    const show = withControls => { soundBtn.hidden = withControls; toggle.hidden = mute.hidden = !withControls; };
    const sync = () => {
      toggle.innerHTML = v.paused ? ICON.play : ICON.pause; label(toggle, v.paused ? "film.play" : "film.pause");
      mute.innerHTML = v.muted ? ICON.muted : ICON.sound; label(mute, v.muted ? "film.unmute" : "film.mute");
    };
    const tick = () => { if (v.duration) bar.style.transform = "scaleX(" + (v.currentTime / v.duration) + ")"; if (!v.paused) requestAnimationFrame(tick); };
    const playWithSound = () => {
      load(v, frame.clientWidth); withSound = true; userPaused = false;
      v.loop = false; v.muted = false; v.currentTime = 0; start(v); show(true); sync();
    };
    new IntersectionObserver(entries => entries.forEach(e => {
      inView = e.isIntersecting && e.intersectionRatio >= 0.5;
      if (inView) { if (!userPaused && (withSound || auto())) { load(v, frame.clientWidth); start(v); } }
      else if (!v.paused) v.pause();
    }), { threshold: [0, 0.5, 1] }).observe(frame);
    soundBtn.addEventListener("click", e => { e.stopPropagation(); playWithSound(); });
    toggle.addEventListener("click", e => { e.stopPropagation(); if (v.paused) { userPaused = false; start(v); } else { userPaused = true; v.pause(); } });
    mute.addEventListener("click", e => { e.stopPropagation(); v.muted = !v.muted; sync(); });
    frame.addEventListener("click", () => { if (!withSound) playWithSound(); else toggle.click(); });   // a tap on the film itself
    v.addEventListener("play", () => { sync(); requestAnimationFrame(tick); });
    v.addEventListener("pause", sync);
    v.addEventListener("ended", () => {   // after a play with sound: back to the silent loop, ready to play again
      withSound = false; v.muted = true; v.loop = true; show(false); sync();
      if (inView && auto()) start(v);
    });
    show(false); sync();
    if (window.SITE && SITE.onLang) SITE.onLang(sync);
  }

  /* Platform: the 18-second film, played where it is. */
  document.querySelectorAll('[data-film="inline"]').forEach(box => {
    const v = box.querySelector("video"), play = box.querySelector("[data-film-play]");
    play.addEventListener("click", () => {
      load(v, box.clientWidth); play.hidden = true; v.controls = true; v.muted = false; v.currentTime = 0; start(v); v.focus({ preventScroll: true });
    });
    v.addEventListener("ended", () => { v.controls = false; play.hidden = false; play.focus({ preventScroll: true }); });   // ready to play again
    new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && !v.paused) v.pause(); })).observe(box);   // scrolled away: it waits
  });
})();
