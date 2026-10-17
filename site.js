(() => {
  'use strict';
  const translations = window.PORTFOLIO_TRANSLATIONS;
  const storageKey = 'xinyuan-portfolio-language';
  const mobile = window.matchMedia('(max-width: 760px)');
  const sidebar = document.getElementById('site-sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  const menuBackdrop = document.querySelector('.menu-backdrop');
  const toast = document.getElementById('copy-status');
  const sections = [...document.querySelectorAll('main > section[id]')];
  const sectionLinks = [...document.querySelectorAll('.nav-link')].filter(link => link.getAttribute('href').startsWith('#'));
  let currentLanguage = 'en';
  let toastTimer;
  let toastMessage = null;
  let scrollQueued = false;
  try { if (localStorage.getItem(storageKey) === 'zh') currentLanguage = 'zh'; }
  catch (_) { /* English is the first-visit fallback without browser storage. */ }
  const requestedLanguage = new URL(location.href).searchParams.get('lang');
  const hasRequestedLanguage = ['en', 'zh'].includes(requestedLanguage);
  if (hasRequestedLanguage) currentLanguage = requestedLanguage;

  function t(key, values = {}) {
    const text = translations[currentLanguage][key] ?? translations.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
  }

  function updateNavigation() {
    if (!sections.length || !sectionLinks.length) { scrollQueued = false; return; }
    let active = sections[0].id;
    for (const section of sections) if (section.getBoundingClientRect().top <= 180) active = section.id;
    sectionLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${active}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollQueued = false;
  }

  function applyLanguage(language, persist = false) {
    currentLanguage = language === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    document.title = t(document.body.dataset.titleKey || 'page.title');
    document.querySelector('meta[name="description"]').content = t(document.body.dataset.descriptionKey || 'page.description');
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    for (const attribute of ['aria-label', 'alt']) {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
        element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
      });
    }
    document.querySelectorAll('[data-language-toggle]').forEach(button => {
      button.hidden = false;
      button.setAttribute('aria-label', t('language.switch'));
      button.title = t('language.switch');
      const label = button.querySelector('[data-language-label]');
      label.textContent = currentLanguage === 'en' ? '中文' : 'EN';
      label.lang = currentLanguage === 'en' ? 'zh-CN' : 'en';
    });
    menuToggle.setAttribute('aria-label', t(menuToggle.getAttribute('aria-expanded') === 'true' ? 'navigation.close' : 'navigation.open'));
    document.querySelectorAll('a[data-language-link]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('lang', currentLanguage);
      link.href = url.href;
    });
    if (toastMessage) toast.textContent = t(toastMessage.key, toastMessage.values);
    if (persist) {
      try { localStorage.setItem(storageKey, currentLanguage); } catch (_) { /* The switch remains usable. */ }
      if (new URL(location.href).searchParams.has('lang')) {
        const url = new URL(location.href);
        url.searchParams.set('lang', currentLanguage);
        try { history.replaceState(null, '', url); } catch (_) { /* Some file previews restrict history. */ }
      }
    }
    document.dispatchEvent(new CustomEvent('portfolio:languagechange', {detail: {language: currentLanguage}}));
    updateNavigation();
  }

  function setMenu(open, returnFocus = true) {
    const isOpen = mobile.matches && open;
    document.body.classList.toggle('menu-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', t(isOpen ? 'navigation.close' : 'navigation.open'));
    menuBackdrop.hidden = !isOpen;
    sidebar.inert = mobile.matches && !isOpen;
    if (isOpen) sidebar.querySelector('.nav-link').focus();
    else if (returnFocus && mobile.matches) menuToggle.focus({preventScroll: true});
  }
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menuBackdrop.addEventListener('click', () => setMenu(false));
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { if (mobile.matches) setMenu(false, false); }));
  mobile.addEventListener('change', () => setMenu(false, false));
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('menu-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
    if (event.key === 'Tab') {
      const focusable = [...document.querySelectorAll('.mobile-actions a, .mobile-actions button'), ...sidebar.querySelectorAll('a, button')].filter(element => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateNavigation); }
  }, {passive: true});
  window.addEventListener('resize', updateNavigation, {passive: true});

  function showToast(key, values) {
    clearTimeout(toastTimer);
    toastMessage = {key, values};
    toast.textContent = t(key, values);
    toast.classList.add('visible');
    toastTimer = setTimeout(() => { toast.classList.remove('visible'); toast.textContent = ''; toastMessage = null; }, 4000);
  }
  async function copyValue(value) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(value); return true; } catch (_) { /* Local preview fallback. */ }
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.className = 'sr-only';
    input.setAttribute('readonly', '');
    document.body.append(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    input.remove();
    return copied;
  }
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const copied = await copyValue(button.dataset.copy);
    showToast(copied ? 'copy.success' : 'copy.failure', {id: button.dataset.copy});
    button.focus({preventScroll: true});
  }));
  document.querySelectorAll('[data-year]').forEach(year => { year.textContent = String(new Date().getFullYear()); });
  document.querySelectorAll('[data-language-toggle]').forEach(button => button.addEventListener('click', () => applyLanguage(currentLanguage === 'en' ? 'zh' : 'en', true)));
  window.PhotographySite = {t, getLanguage: () => currentLanguage};
  setMenu(false, false);
  applyLanguage(currentLanguage, hasRequestedLanguage);
})();
