(() => {
  'use strict';
  const {t, getLanguage} = window.PhotographySite;
  const rates = Object.freeze({phone:199, equipment:40, group:50, deposit:100, minimumHours:2, dayHours:10, daySolo:1590, dayGroup:1990});
  const state = {mode:'hourly', equipment:'phone', party:'solo', hours:2};
  const equipment = document.getElementById('session-equipment');
  const party = document.getElementById('session-party');
  const duration = document.getElementById('session-hours');
  const number = value => new Intl.NumberFormat(getLanguage()==='zh'?'zh-CN':'en-US', {minimumFractionDigits:Number.isInteger(value)?0:2, maximumFractionDigits:2}).format(value);
  const formatHours = value => new Intl.NumberFormat(getLanguage()==='zh'?'zh-CN':'en-US', {maximumFractionDigits:1}).format(value);
  const money = value => `AED ${number(value)}`;

  function renderQuote() {
    const fullDay = state.mode === 'day';
    const hours = fullDay ? rates.dayHours : state.hours;
    const isGroup = state.party === 'group';
    const camera = fullDay || state.equipment === 'camera';
    const base = fullDay ? (isGroup ? rates.dayGroup : rates.daySolo) : rates.phone * hours;
    const equipmentCost = !fullDay && camera ? rates.equipment * hours : 0;
    const groupCost = !fullDay && isGroup ? rates.group * hours : 0;
    const total = base + equipmentCost + groupCost;
    const partyName = t(isGroup ? 'rates.group' : 'rates.solo');
    const modeName = t(fullDay ? 'plan.fullDay' : 'plan.hourly');
    const equipmentName = t(camera ? 'plan.camera' : 'plan.phone');
    document.querySelectorAll('[data-session-mode]').forEach(button => {
      const selected = button.dataset.sessionMode === state.mode;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    equipment.disabled = fullDay;
    equipment.value = camera ? 'camera' : 'phone';
    party.value = state.party;
    duration.disabled = fullDay;
    duration.value = String(hours);
    duration.setAttribute('aria-valuetext', t('plan.hours', {hours:formatHours(hours)}));
    document.getElementById('session-hours-label').textContent = t('plan.hours', {hours:formatHours(hours)});
    document.getElementById('session-duration-note').textContent = t(fullDay ? 'plan.dayDuration' : 'plan.minimum');
    document.getElementById('quote-base-label').textContent = fullDay ? t('plan.dayLine', {party:partyName}) : t('plan.baseLine', {hours:formatHours(hours)});
    document.getElementById('quote-base').textContent = money(base);
    document.getElementById('quote-equipment-row').hidden = !equipmentCost;
    document.getElementById('quote-equipment').textContent = money(equipmentCost);
    document.getElementById('quote-group-row').hidden = !groupCost;
    document.getElementById('quote-group').textContent = money(groupCost);
    document.getElementById('quote-total').textContent = money(total);
    document.getElementById('quote-deposit').textContent = money(rates.deposit);
    document.getElementById('quote-balance').textContent = money(total-rates.deposit);
    const message = t('plan.message', {mode:modeName, equipment:equipmentName, party:partyName, hours:formatHours(hours), total:number(total)});
    const enquiry = new URL('https://wa.me/971509856429');
    enquiry.searchParams.set('text', message);
    document.getElementById('quote-enquiry').href = enquiry.href;
    document.querySelectorAll('[data-price]').forEach(element => {
      const values = {...rates, camera:rates.phone+rates.equipment};
      element.textContent = number(values[element.dataset.price]);
    });
  }

  document.querySelectorAll('[data-session-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.sessionMode; renderQuote(); }));
  equipment.addEventListener('change', () => {
    if (!equipment.disabled) state.equipment = equipment.value === 'camera' ? 'camera' : 'phone';
    renderQuote();
  });
  party.addEventListener('change', () => { state.party = party.value === 'group' ? 'group' : 'solo'; renderQuote(); });
  duration.addEventListener('input', () => {
    const requested = Number(duration.value);
    state.hours = Math.max(rates.minimumHours, Math.min(rates.dayHours, Math.round(requested*2)/2));
    renderQuote();
  });
  const showPlan = () => {
    document.getElementById('plan').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    document.getElementById('plan-title').focus({preventScroll:true});
  };
  document.querySelectorAll('[data-choose-equipment]').forEach(button => button.addEventListener('click', () => {
    state.mode = 'hourly'; state.equipment = button.dataset.chooseEquipment; renderQuote(); showPlan();
  }));
  document.querySelector('[data-choose-day]').addEventListener('click', () => { state.mode = 'day'; renderQuote(); showPlan(); });
  document.addEventListener('portfolio:languagechange', renderQuote);
  document.getElementById('session-planner').hidden = false;
  renderQuote();
})();
