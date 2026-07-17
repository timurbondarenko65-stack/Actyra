// ----------------------------------------------------------------
// Actyra — main.js
// Mobile nav, reveal on scroll, header state
// ----------------------------------------------------------------

(function () {
  'use strict';

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Chiudi il menu quando si clicca un link
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on scroll con IntersectionObserver
  const revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealItems.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealItems.forEach(function (el) { observer.observe(el); });
  } else {
    // Fallback: mostra subito tutto
    revealItems.forEach(function (el) { el.classList.add('in-view'); });
  }

  // Header shadow su scroll
  const header = document.querySelector('.site-header');
  if (header) {
    let lastY = 0;
    window.addEventListener('scroll', function () {
      const y = window.scrollY;
      if (y > 10 && lastY <= 10) {
        header.style.borderBottomColor = 'rgba(30, 35, 33, 0.24)';
      } else if (y <= 10 && lastY > 10) {
        header.style.borderBottomColor = '';
      }
      lastY = y;
    }, { passive: true });
  }
})();
