(() => {
  const tabs = document.querySelector('[data-dist-tabs]');
  if (!tabs) return;
  const buttons = [...tabs.querySelectorAll('[data-dist-tab]')];
  const panels = buttons.map(button => document.getElementById(button.getAttribute('aria-controls')));

  function select(selected) {
    buttons.forEach((button, index) => {
      const active = button === selected;
      button.setAttribute('aria-pressed', String(active));
      panels[index].hidden = !active;
    });
  }

  for (const button of buttons) {
    button.addEventListener('click', () => select(button));
  }
  tabs.hidden = false;
})();
