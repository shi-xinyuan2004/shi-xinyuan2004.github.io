(() => {
  'use strict';
  const {t, getLanguage} = window.PhotographySite;
  const date = document.getElementById('travel-date');
  const hours = document.getElementById('travel-hours');
  const people = document.getElementById('travel-people');
  const location = document.getElementById('travel-location');
  const estimate = document.getElementById('travel-estimate');
  const enquiry = document.getElementById('travel-whatsapp');
  const rates = Object.freeze({hourly:300});

  function render() {
    const length = Number(hours.value);
    const total = length * rates.hourly;
    estimate.textContent = `AED ${new Intl.NumberFormat(getLanguage() === 'zh' ? 'zh-CN' : 'en-US').format(total)}`;
    location.placeholder = t('travel.optional');
    const message = t('travel.message', {
      date: date.value || t('travel.dateFlexible'),
      hours: length,
      people: t(`travel.${people.value}`),
      location: location.value.trim() || t('travel.locationFlexible'),
      total
    });
    const url = new URL('https://wa.me/971509856429');
    url.searchParams.set('text', message);
    enquiry.href = url.href;
  }

  for (const field of [date, hours, people, location]) {
    field.addEventListener('input', render);
    field.addEventListener('change', render);
  }
  document.addEventListener('portfolio:languagechange', render);
  render();
})();
