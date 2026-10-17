(() => {
  'use strict';
  const {t, getLanguage} = window.PhotographySite;
  const images = window.PORTFOLIO_IMAGES || [];
  const categories = new Set(['landmarks', 'art', 'water']);
  const gallery = document.getElementById('photo-gallery');
  const filters = [...document.querySelectorAll('.filter-button')];
  const dialog = document.getElementById('lightbox');
  const viewerImage = document.getElementById('lightbox-image');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const archiveToggle = document.querySelector('.archive-toggle');
  const compactGallery = window.matchMedia('(max-width: 1000px)');
  const wideGallery = window.matchMedia('(min-width: 1800px)');
  let currentFilter = 'all';
  let showingArchive = false;
  let visibleImages = images.filter(image => image.featured);
  let viewerIndex = 0;
  let galleryTrigger = null;

  function imageText(image, field) {
    return getLanguage() === 'zh' ? (image[`${field}Zh`] || image[field]) : image[field];
  }

  function updatePhotoLanguage(button, image) {
    const title = imageText(image, 'title');
    button.setAttribute('aria-label', t('photo.open', {title}));
    button.querySelector('img').alt = imageText(image, 'alt');
    button.querySelector('.photo-title').textContent = title;
    button.querySelector('.photo-note').textContent = t(`category.${image.category}`);
    const fallback = button.querySelector('.photo-error');
    if (fallback) fallback.textContent = t('photo.unavailable', {title});
  }

  function updateGalleryStatus() {
    document.getElementById('gallery-status').textContent = t('gallery.status', {
      count: visibleImages.length,
      category: t(currentFilter === 'all' ? (showingArchive ? 'gallery.archive' : 'gallery.all') : `category.${currentFilter}`)
    });
  }

  function updateCounts() {
    const collection = showingArchive ? images : images.filter(image => image.featured);
    document.querySelectorAll('[data-count]').forEach(count => {
      count.textContent = count.dataset.count === 'all' ? collection.length :
        collection.filter(image => image.category === count.dataset.count).length;
    });
    archiveToggle.querySelector('.archive-count').textContent = showingArchive ? '' : images.length;
    archiveToggle.querySelector('[data-i18n]').textContent = t(showingArchive ? 'gallery.showSelected' : 'gallery.showAll');
    archiveToggle.setAttribute('aria-expanded', String(showingArchive));
  }

  function renderGallery() {
    const collection = showingArchive ? images : images.filter(image => image.featured);
    visibleImages = currentFilter === 'all' ? collection : collection.filter(image => image.category === currentFilter);
    const preferredPerRow = compactGallery.matches ? 2 : wideGallery.matches ? 4 : 3;
    const rowCount = Math.max(1, Math.floor(visibleImages.length / preferredPerRow));
    const baseSize = Math.floor(visibleImages.length / rowCount);
    const largerRows = visibleImages.length % rowCount;
    const rows = [];
    let index = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const rowSize = baseSize + (rowIndex >= rowCount - largerRows ? 1 : 0);
      const rowImages = visibleImages.slice(index, index + rowSize);
      const row = document.createElement('div');
      row.className = 'photo-row';
      row.style.gridTemplateColumns = rowImages.map(image => `minmax(0, ${image.width / image.height}fr)`).join(' ');
      rows.push(row);
      rowImages.forEach((image, rowOffset) => {
        const imageIndex = index + rowOffset;
        const figure = document.createElement('figure');
        figure.className = 'photo';
        const button = document.createElement('button');
        button.className = 'photo-button';
        button.type = 'button';
        button.dataset.photoId = image.id;
        const img = new Image();
        img.src = image.thumb || image.src;
        img.alt = imageText(image, 'alt');
        img.width = image.width;
        img.height = image.height;
        img.loading = imageIndex < 3 ? 'eager' : 'lazy';
        img.decoding = 'async';
        if (imageIndex === 0) img.fetchPriority = 'high';
        img.addEventListener('error', () => {
          const fallback = document.createElement('span');
          fallback.className = 'photo-error';
          fallback.textContent = t('photo.unavailable', {title: imageText(image, 'title')});
          button.append(fallback);
        }, {once: true});
        const shade = document.createElement('span');
        shade.className = 'photo-shade';
        shade.setAttribute('aria-hidden', 'true');
        const caption = document.createElement('span');
        caption.className = 'photo-caption';
        caption.setAttribute('aria-hidden', 'true');
        const captionCopy = document.createElement('span');
        const title = document.createElement('strong');
        title.className = 'photo-title';
        const note = document.createElement('small');
        note.className = 'photo-note';
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        captionCopy.append(title, note);
        caption.append(captionCopy, arrow);
        button.append(img, shade, caption);
        updatePhotoLanguage(button, image);
        button.addEventListener('click', () => openViewer(imageIndex, button));
        figure.append(button);
        row.append(figure);
      });
      index += rowSize;
    }
    gallery.replaceChildren(...rows);
    updateCounts();
    updateGalleryStatus();
  }

  function setFilter(filter) {
    if (filter !== 'all' && !categories.has(filter)) return;
    currentFilter = filter;
    filters.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderGallery();
  }

  filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  archiveToggle.addEventListener('click', () => {
    showingArchive = !showingArchive;
    renderGallery();
    if (!showingArchive) document.querySelector('.gallery-toolbar').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
  });
  compactGallery.addEventListener('change', renderGallery);
  wideGallery.addEventListener('change', renderGallery);
  function displayViewerImage() {
    const image = visibleImages[viewerIndex];
    if (viewerImage.getAttribute('src') !== image.src) viewerImage.src = image.src;
    viewerImage.alt = t('viewer.alt', {alt: imageText(image, 'alt')});
    document.getElementById('lightbox-title').textContent = imageText(image, 'title');
    document.getElementById('lightbox-category').textContent = t('viewer.category', {category: t(`category.${image.category}`)});
    document.getElementById('lightbox-counter').textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(visibleImages.length).padStart(2, '0')}`;
    document.getElementById('lightbox-counter').setAttribute('aria-label', t('viewer.counter', {current: viewerIndex + 1, total: visibleImages.length}));
  }

  function openViewer(index, trigger) {
    galleryTrigger = trigger;
    viewerIndex = index;
    displayViewerImage();
    document.body.classList.add('viewer-open');
    dialog.showModal();
    document.querySelector('.lightbox-close').focus();
  }

  function nextImage(step) {
    viewerIndex = (viewerIndex + step + visibleImages.length) % visibleImages.length;
    displayViewerImage();
  }

  document.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  document.querySelector('.lightbox-prev').addEventListener('click', () => nextImage(-1));
  document.querySelector('.lightbox-next').addEventListener('click', () => nextImage(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    galleryTrigger?.focus({preventScroll: true});
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); nextImage(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); nextImage(-1); }
  });

  document.addEventListener('portfolio:languagechange', () => {
    gallery.querySelectorAll('.photo-button').forEach(button => {
      updatePhotoLanguage(button, images.find(image => image.id === button.dataset.photoId));
    });
    updateGalleryStatus();
    updateCounts();
    if (dialog.open) displayViewerImage();
  });
  renderGallery();
})();
