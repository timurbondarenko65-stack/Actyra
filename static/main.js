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

  // Logo: reagisce alla vicinanza del puntatore e alla pressione.
  // Scrive --prox (0 lontano → 1 sopra) e --dx/--dy (direzione di arrivo)
  // sul marchio; il resto lo fa il CSS.
  const brand = document.querySelector('.brand');
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (brand && !calmo) {
    const RAGGIO = 170;       // px entro cui il logo inizia a rispondere
    let rect = null;          // posizione del marchio, ricalcolata solo se serve
    let pending = false;
    let attivo = false;       // evita di riscrivere le variabili quando è già a riposo

    const invalida = function () { rect = null; };
    window.addEventListener('resize', invalida);
    window.addEventListener('scroll', invalida, { passive: true });

    const aggiorna = function (mx, my) {
      if (!rect) rect = brand.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > RAGGIO) {
        if (attivo) {
          brand.style.setProperty('--prox', '0');
          attivo = false;
        }
        return;
      }

      const t = 1 - dist / RAGGIO;
      const prox = t * t * (3 - 2 * t);  // smoothstep: entra e esce senza scatti
      const norm = Math.max(dist, 1);

      brand.style.setProperty('--prox', prox.toFixed(3));
      brand.style.setProperty('--dx', (dx / norm).toFixed(3));
      brand.style.setProperty('--dy', (dy / norm).toFixed(3));
      attivo = true;
    };

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        aggiorna(e.clientX, e.clientY);
      });
    }, { passive: true });

    // Pressione: schiacciata sotto il dito, poi rientro elastico con l'onda.
    let timerTap = null;

    brand.addEventListener('pointerdown', function () {
      brand.classList.remove('is-tapped');
      void brand.offsetWidth;              // riavvia l'animazione dell'onda
      brand.style.setProperty('--press', '1');
      brand.classList.add('is-pressing');
    });

    const rilascia = function () {
      if (brand.style.getPropertyValue('--press') !== '1') return;
      brand.style.setProperty('--press', '0');
      brand.classList.remove('is-pressing');
      brand.classList.add('is-tapped');
      clearTimeout(timerTap);
      timerTap = setTimeout(function () { brand.classList.remove('is-tapped'); }, 600);
    };

    window.addEventListener('pointerup', rilascia);
    window.addEventListener('pointercancel', rilascia);
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
