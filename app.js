(() => {
  'use strict';
  const config = window.FTAP_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const list = (value) => Array.isArray(value) ? value : [];
  const node = (tag, className, text) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = String(text);
    return result;
  };
  const paragraph = (text, className = '') => node('p', className, text);
  const initials = (name) => String(name || 'FTAP').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  function safeImage(source) {
    if (typeof source !== 'string' || !source.trim()) return '';
    try {
      const url = new URL(source, document.baseURI);
      return ['https:', 'http:', 'file:'].includes(url.protocol) ? source : '';
    } catch { return ''; }
  }
  function avatar(person) {
    const source = safeImage(person.image);
    const fallback = node('div', 'member-avatar initials-avatar', initials(person.name));
    fallback.setAttribute('aria-hidden', 'true');
    if (!source) return fallback;
    const image = node('img', 'member-avatar');
    image.src = source;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
    return image;
  }

  const menu = $('.menu-toggle');
  const nav = $('#site-nav');
  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a,button').forEach(item => item.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menu.focus(); }
  });
  const mobileQuery = window.matchMedia('(max-width: 800px)');
  mobileQuery.addEventListener('change', closeMenu);

  function showDialog(dialog) {
    document.querySelectorAll('dialog[open]').forEach(open => open.close());
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }
  document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  }));

  function discordInvite() {
    try {
      const invite = new URL(config.discordInvite);
      const allowed = ['discord.gg', 'discord.com', 'www.discord.com', 'www.discord.gg'];
      return invite.protocol === 'https:' && allowed.includes(invite.hostname) ? invite.href : '';
    } catch { return ''; }
  }
  function joinDiscord() {
    const invite = discordInvite();
    if (invite) window.open(invite, '_blank', 'noopener,noreferrer');
    else showDialog($('#join-dialog'));
  }
  document.querySelectorAll('[data-join]').forEach(button => button.addEventListener('click', joinDiscord));
  function openApplication() { showDialog($('#application-dialog')); }
  document.querySelectorAll('[data-apply],[data-dialog-apply]').forEach(button => button.addEventListener('click', openApplication));

  function openContent(category, title) {
    $('#content-dialog-category').textContent = category;
    $('#content-dialog-title').textContent = title;
    $('#content-dialog-body').replaceChildren();
    $('#content-dialog-actions').replaceChildren();
    return $('#content-dialog');
  }

  const announcements = list(config.announcements).filter(item => item && item.title);
  if (announcements.length) {
    const target = $('#announcement-list');
    target.replaceChildren();
    announcements.forEach((item, index) => {
      const button = node('button', 'announcement');
      button.type = 'button';
      const image = node('img', 'announcement-art');
      image.src = safeImage(item.image) || 'assets/hero.png'; image.alt = ''; image.loading = 'lazy';
      image.style.objectPosition = item.imagePosition || (index % 2 ? '48% 45%' : '78% 56%');
      const content = node('div');
      content.append(paragraph(item.category || 'Community', 'section-label'), node('h3', '', item.title), paragraph(item.summary || ''));
      const more = node('span', 'read-more', 'Read more');
      const arrow = node('span', '', '→'); arrow.setAttribute('aria-hidden', 'true'); more.append(arrow); content.append(more);
      button.append(image, content);
      button.addEventListener('click', () => {
        const dialog = openContent(item.category || 'Community', item.title);
        $('#content-dialog-body').append(paragraph(item.body || item.summary || ''));
        showDialog(dialog);
      });
      target.append(button);
    });
  }

  const members = list(config.members).filter(person => person && person.name);
  if (members.length) {
    const target = $('#member-list'); target.replaceChildren();
    members.forEach(person => {
      const card = node('button', 'member-card'); card.type = 'button';
      card.append(avatar(person), node('h3', '', person.name), paragraph(person.role || 'Community member', 'section-label'), paragraph(list(person.games).join(' · ') || person.playstyle || 'Part of the FTAP party'));
      card.setAttribute('aria-label', `Meet ${person.name}`);
      card.addEventListener('click', () => {
        const dialog = openContent(person.role || 'Community member', person.name);
        const body = $('#content-dialog-body');
        body.append(paragraph([person.pronouns, person.playstyle].filter(Boolean).join(' · '), 'profile-games'));
        if (list(person.games).length) body.append(paragraph(list(person.games).join(' · '), 'profile-games'));
        if (person.bio) body.append(paragraph(person.bio));
        if (person.quote) body.append(paragraph(person.quote, 'profile-quote'));
        showDialog(dialog);
      });
      target.append(card);
    });
  }

  const staff = list(config.staff).filter(person => person && person.name);
  if (staff.length) {
    const target = $('#staff-list'); target.replaceChildren();
    staff.forEach(person => {
      const row = node('article', 'staff-row');
      const content = node('div');
      content.append(node('h3', '', person.name), paragraph(person.role || 'Staff', 'section-label'));
      if (person.bio) content.append(paragraph(person.bio));
      row.append(avatar(person), content); target.append(row);
    });
  }

  function eventTimes(event) {
    const start = new Date(event.startsAt);
    const suppliedEnd = new Date(event.endsAt);
    const end = !Number.isNaN(+suppliedEnd) && suppliedEnd > start ? suppliedEnd : new Date(+start + 3600000);
    return { start, end };
  }
  const events = list(config.events).filter(event => event && event.title && !Number.isNaN(+eventTimes(event).start) && eventTimes(event).end > new Date()).sort((a, b) => eventTimes(a).start - eventTimes(b).start);
  function localEventDate(date) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date);
  }
  function downloadFile(contents, filename, type) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const escapeCalendar = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  function foldCalendarLine(line) {
    let output = '', length = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (length + size > 75) { output += '\r\n '; length = 1; }
      output += char; length += size;
    }
    return output;
  }
  function downloadCalendar(event, index) {
    const { start, end } = eventTimes(event);
    const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FTAP//Community Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:ftap-${+start}-${index}@community.local`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escapeCalendar(event.title)}`, `DESCRIPTION:${escapeCalendar(event.description)}`, `LOCATION:${escapeCalendar(event.location || 'Discord')}`, 'END:VEVENT', 'END:VCALENDAR'];
    downloadFile(lines.map(foldCalendarLine).join('\r\n') + '\r\n', 'ftap-event.ics', 'text/calendar;charset=utf-8');
  }
  if (events.length) {
    const target = $('#event-list'); target.hidden = false; target.replaceChildren(paragraph('Upcoming events · Your local time', 'section-label red-label'));
    events.forEach((event, index) => {
      const { start, end } = eventTimes(event);
      const button = node('button', 'event-card'); button.type = 'button';
      const date = node('span', 'event-date');
      date.append(node('strong', '', start.getDate()), node('span', '', start.toLocaleDateString(undefined, { month: 'short' })));
      const content = node('span'); content.append(node('h3', '', event.title), paragraph(localEventDate(start)));
      button.append(date, content);
      button.addEventListener('click', () => {
        const dialog = openContent(event.type || 'Community event', event.title);
        $('#content-dialog-body').append(paragraph(`${localEventDate(start)}\nUntil ${localEventDate(end)}\n${event.location || 'Discord'}`, 'profile-games'), paragraph(event.description || 'Find the party in Discord.'));
        const calendar = node('button', 'button button-primary', 'Add to calendar'); calendar.type = 'button'; calendar.addEventListener('click', () => downloadCalendar(event, index));
        $('#content-dialog-actions').append(calendar); showDialog(dialog);
      }); target.append(button);
    });
  }

  // Manual carousel: it stays on the selected slide while visitors read.
  const carousel = $('#event-carousel');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('.event-slide')];
    const dots = [...carousel.querySelectorAll('.carousel-dot')];
    const titles = ['Year-End Civil War', '2025 · Smoke Spammers'];
    let current = 0;
    function showEventSlide(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== current;
        slide.classList.toggle('is-active', i === current);
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      carousel.querySelector('.carousel-position').textContent = `${current + 1} / ${slides.length} · ${titles[current]}`;
    }
    carousel.classList.add('is-ready');
    showEventSlide(0);
    carousel.querySelector('[data-carousel-previous]').addEventListener('click', () => showEventSlide(current - 1));
    carousel.querySelector('[data-carousel-next]').addEventListener('click', () => showEventSlide(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => showEventSlide(i)));
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showEventSlide(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let touchStart;
    carousel.addEventListener('pointerdown', event => {
      touchStart = event.pointerType === 'touch' && !event.target.closest('button') ? { x: event.clientX, y: event.clientY } : null;
    });
    carousel.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showEventSlide(current + (dx < 0 ? 1 : -1));
    });
    carousel.addEventListener('pointercancel', () => { touchStart = null; });
  }

  // One team at a time; all lineups remain available without JavaScript.
  const teamsCarousel = $('#teams-carousel');
  if (teamsCarousel) {
    const slides = [...teamsCarousel.querySelectorAll('.team-slide')];
    const tabs = [...teamsCarousel.querySelectorAll('.team-tab')];
    let current = 0;
    function showTeam(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== current;
        slide.classList.toggle('is-active', i === current);
      });
      tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === current)));
      teamsCarousel.querySelector('.team-carousel-position').textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} · Team ${String.fromCharCode(65 + current)}`;
    }
    teamsCarousel.classList.add('is-ready');
    showTeam(0);
    tabs.forEach((tab, i) => tab.addEventListener('click', () => showTeam(i)));
    teamsCarousel.querySelector('[data-team-previous]').addEventListener('click', () => showTeam(current - 1));
    teamsCarousel.querySelector('[data-team-next]').addEventListener('click', () => showTeam(current + 1));
    teamsCarousel.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      showTeam(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
      if (event.target.closest('.team-tab')) tabs[current].focus();
    });
    let touchStart;
    teamsCarousel.addEventListener('pointerdown', event => {
      touchStart = event.pointerType === 'touch' && !event.target.closest('button') ? { x: event.clientX, y: event.clientY } : null;
    });
    teamsCarousel.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showTeam(current + (dx < 0 ? 1 : -1));
    });
    teamsCarousel.addEventListener('pointercancel', () => { touchStart = null; });
  }

  const gallery = list(config.gallery).filter(item => item && safeImage(item.src));
  let galleryIndex = 0;
  function displayGallery(index) {
    if (!gallery.length) return;
    galleryIndex = (index + gallery.length) % gallery.length;
    const item = gallery[galleryIndex];
    $('#gallery-dialog-image').src = item.src;
    $('#gallery-dialog-image').alt = item.alt || item.title || 'FTAP community image';
    $('#gallery-dialog-title').textContent = item.title || 'Community memory';
    $('#gallery-dialog-category').textContent = item.category || 'Community gallery';
    $('#gallery-dialog-caption').textContent = item.caption || '';
    $('#gallery-position').textContent = `${galleryIndex + 1} / ${gallery.length}`;
    $('#gallery-controls').hidden = gallery.length < 2;
  }
  const galleryTarget = $('#gallery-list');
  if (gallery.length) {
    gallery.forEach((item, index) => {
      const button = node('button', 'gallery-item'); button.type = 'button';
      button.setAttribute('aria-label', `View ${item.title || 'community image'}`);
      const image = node('img', 'gallery-image'); image.src = item.src; image.alt = item.alt || item.title || 'FTAP community image'; image.loading = 'lazy'; image.width = 1672; image.height = 941;
      const caption = node('span', 'gallery-item-caption'); const title = node('span');
      title.append(paragraph(item.category || 'Community gallery', 'section-label'), node('h3', '', item.title || 'Community memory'));
      caption.append(title, node('span', 'gallery-open', 'View image')); button.append(image, caption);
      button.addEventListener('click', () => { displayGallery(index); showDialog($('#gallery-dialog')); }); galleryTarget.append(button);
    });
  } else {
    const empty = node('div', 'gallery-empty'); empty.append(node('h3', '', 'Our highlight reel is on the way.')); galleryTarget.append(empty);
  }
  $('#gallery-previous').addEventListener('click', () => displayGallery(galleryIndex - 1));
  $('#gallery-next').addEventListener('click', () => displayGallery(galleryIndex + 1));
  $('#gallery-dialog').addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); displayGallery(galleryIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); displayGallery(galleryIndex + 1); }
  });

  const rules = list(config.rules).filter(rule => rule && rule.title);
  if (rules.length) {
    const target = $('#rules-list'); target.replaceChildren();
    rules.forEach(rule => { const item = node('li'); item.append(node('h3', '', rule.title), paragraph(rule.text || '')); target.append(item); });
  }
  const faqs = list(config.faqs).filter(faq => faq && faq.question);
  if (faqs.length) {
    const target = $('#faq-list'); target.replaceChildren();
    faqs.forEach(faq => { const item = node('details'); item.append(node('summary', '', faq.question), paragraph(faq.answer || '')); target.append(item); });
  }

  const form = $('#application-form');
  const result = $('#application-result');
  const message = $('#application-message');
  form.querySelectorAll('[required]').forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const field of form.querySelectorAll('[required]')) {
      if (!field.value.trim()) { field.setCustomValidity('Please add a little detail.'); field.reportValidity(); return; }
    }
    const data = new FormData(form);
    const value = key => String(data.get(key) || '').trim();
    message.value = `FTAP — Introduction / Application\n\nDiscord name: ${value('name')}\nFavorite games: ${value('games')}\nUsual play time: ${value('availability')}\nPlay style: ${value('playstyle')}\n\nA little about me:\n${value('intro')}`;
    $('#application-instructions').textContent = config.applicationChannel ? `Your message is ready. Copy it and share it in ${config.applicationChannel} in Discord.` : 'Your message is ready. Copy it and share it in Discord.';
    $('#copy-status').textContent = ''; form.hidden = true; result.hidden = false; message.focus();
  });
  $('#copy-application').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Manual copy required');
      await navigator.clipboard.writeText(message.value);
      $('#copy-status').textContent = 'Copied. Share your message in Discord when you are ready.';
    } catch {
      message.focus(); message.select();
      $('#copy-status').textContent = 'Your message is selected. Press Ctrl+C (or Command+C) to copy, or download the text file.';
    }
  });
  $('#download-application').addEventListener('click', () => downloadFile(message.value, 'ftap-introduction.txt', 'text/plain;charset=utf-8'));
  $('#edit-application').addEventListener('click', () => { result.hidden = true; form.hidden = false; form.elements.name.focus(); });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  let observer;
  function configureMotion() {
    if (observer) observer.disconnect();
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      document.body.classList.remove('motion-ready'); reveals.forEach(item => item.classList.add('is-visible')); return;
    }
    document.body.classList.add('motion-ready');
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(item => observer.observe(item));
  }
  configureMotion(); reducedMotion.addEventListener('change', configureMotion);
})();
