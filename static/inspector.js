// ================================================================
// Actyra — Demo di ispezione qualità con rete neurale
// ----------------------------------------------------------------
// Un nastro trasportatore anima componenti di occhialeria (lenti,
// aste, montature) verso uno scanner. Ogni pezzo può avere un
// difetto (graffio, scheggiatura, macchia). La "rete" lo classifica
// con un'accuratezza che dipende dal livello di addestramento
// selezionato: è la dimostrazione visiva del principio "più esempi
// vede, meno sbaglia".
// Le statistiche (ispezionati, rilevati, errori, precisione) sono
// conteggi reali della sessione, aggiornati a ogni pezzo.
// ================================================================

(function () {
  'use strict';

  const track = document.getElementById('conveyor-track');
  if (!track) return; // non siamo sulla pagina demo

  const scanner     = document.getElementById('scanner-zone');
  const statInsp    = document.getElementById('stat-inspected');
  const statFound   = document.getElementById('stat-found');
  const statErrors  = document.getElementById('stat-errors');
  const statAcc     = document.getElementById('stat-accuracy');
  const lastVerdict = document.getElementById('last-verdict');
  const lvlButtons  = document.querySelectorAll('.training-btn');

  // ---------- Livelli di addestramento ----------
  const LEVELS = {
    l1: { accuracy: 0.62, name: '100 esempi' },
    l2: { accuracy: 0.90, name: '10.000 esempi' },
    l3: { accuracy: 0.995, name: '1.000.000 esempi' }
  };
  let currentLevel = 'l1';

  // ---------- Tipi di pezzo (SVG inline) ----------
  // Ogni pezzo è un componente stilizzato dell'occhialeria.
  const PIECE_TYPES = [
    { // lente
      base: '<ellipse cx="40" cy="40" rx="30" ry="24" fill="url(#gradLens)" stroke="#3A3E3C" stroke-width="1.5"/>'
    },
    { // asta
      base: '<rect x="8" y="34" width="64" height="9" rx="4.5" fill="#8A5F2D" stroke="#3A3E3C" stroke-width="1.2"/>' +
            '<circle cx="14" cy="38.5" r="2.2" fill="#3A3E3C"/>'
    },
    { // frontale
      base: '<path d="M10 36 Q18 26 30 32 Q40 36 50 32 Q62 26 70 36 L70 44 Q62 36 50 40 Q40 44 30 40 Q18 36 10 44 Z" fill="#1F4B48" stroke="#163634" stroke-width="1.2"/>'
    }
  ];

  // Difetti disegnati sopra il pezzo. `mark` è visibile da subito
  // (sottile), `flag` è l'evidenziazione rossa dopo il rilevamento.
  const DEFECTS = [
    {
      name: 'graffio',
      mark: '<path d="M26 30 L54 50" stroke="rgba(30,35,33,0.45)" stroke-width="1.6" stroke-linecap="round"/>',
      flag: '<path d="M26 30 L54 50" stroke="#A63D2F" stroke-width="2.4" stroke-linecap="round"/>'
    },
    {
      name: 'scheggiatura',
      mark: '<circle cx="63" cy="30" r="5" fill="#F6F5F1" stroke="rgba(30,35,33,0.4)" stroke-width="1.2"/>',
      flag: '<circle cx="63" cy="30" r="6" fill="none" stroke="#A63D2F" stroke-width="2.4"/>'
    },
    {
      name: 'macchia',
      mark: '<path d="M36 44 q4 -6 9 -2 q6 3 2 8 q-5 5 -9 1 q-4 -3 -2 -7 Z" fill="rgba(30,35,33,0.35)"/>',
      flag: '<path d="M36 44 q4 -6 9 -2 q6 3 2 8 q-5 5 -9 1 q-4 -3 -2 -7 Z" fill="#A63D2F" opacity="0.85"/>'
    }
  ];

  const SVG_DEFS =
    '<defs><radialGradient id="gradLens" cx="0.35" cy="0.3" r="1">' +
    '<stop offset="0%" stop-color="#EDF3F2"/><stop offset="100%" stop-color="#C9D6D4"/>' +
    '</radialGradient></defs>';

  function buildPieceSVG(type, defect, flagged) {
    let inner = SVG_DEFS + PIECE_TYPES[type].base;
    if (defect >= 0) inner += flagged ? DEFECTS[defect].flag : DEFECTS[defect].mark;
    return '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>';
  }

  // ---------- Stato della linea ----------
  const DEFECT_RATE   = 0.45;
  const SPEED         = 85;    // px/s
  const SPAWN_EVERY   = 2100;  // ms
  const SCAN_MS       = 750;   // pausa sotto lo scanner

  const PIECE_W      = 80;   // larghezza pezzo in px
  const MIN_GAP      = 14;   // distanza minima tra pezzi in coda
  const BADGE_MS     = 2600; // dopo quanto il verdetto sparisce

  let pieces = [];
  let stats = { inspected: 0, found: 0, missed: 0, falseAlarm: 0 };
  let lastSpawn = 0;
  let rafId = null;
  let lastTs = null;
  let running = true;

  function spawnPiece() {
    const type = Math.floor(Math.random() * PIECE_TYPES.length);
    const defective = Math.random() < DEFECT_RATE;
    const defect = defective ? Math.floor(Math.random() * DEFECTS.length) : -1;

    const el = document.createElement('div');
    el.className = 'piece';
    el.innerHTML = buildPieceSVG(type, defect, false);

    const badge = document.createElement('div');
    badge.className = 'piece-badge';
    el.appendChild(badge);

    track.appendChild(el);
    pieces.push({ el, badge, x: -90, type, defect, state: 'moving', scanT: 0 });
  }

  function scannerCenter() {
    return scanner.offsetLeft + scanner.offsetWidth / 2;
  }

  // La classificazione: giusta con probabilità = accuratezza del livello.
  function classify(piece) {
    const acc = LEVELS[currentLevel].accuracy;
    const correct = Math.random() < acc;
    const isDef = piece.defect >= 0;
    const saysDefect = correct ? isDef : !isDef;

    stats.inspected++;
    let verdictText, verdictClass;

    if (saysDefect && isDef) {
      stats.found++;
      verdictText = 'DIFETTO: ' + DEFECTS[piece.defect].name;
      verdictClass = 'bad';
      piece.el.innerHTML = buildPieceSVG(piece.type, piece.defect, true);
      piece.el.appendChild(piece.badge);
    } else if (!saysDefect && !isDef) {
      verdictText = 'OK';
      verdictClass = 'good';
    } else if (saysDefect && !isDef) {
      stats.falseAlarm++;
      verdictText = 'FALSO ALLARME';
      verdictClass = 'warn';
    } else {
      stats.missed++;
      verdictText = 'DIFETTO NON VISTO';
      verdictClass = 'warn';
    }

    piece.badge.textContent = verdictText;
    piece.badge.classList.add('show', verdictClass);
    // Il verdetto resta leggibile qualche secondo, poi sparisce:
    // evita badge accatastati o tagliati sul bordo destro del nastro.
    setTimeout(() => piece.badge.classList.remove('show'), BADGE_MS);
    updateStats(verdictText, verdictClass);
  }

  function updateStats(verdict, cls) {
    statInsp.textContent  = stats.inspected;
    statFound.textContent = stats.found;
    const errors = stats.missed + stats.falseAlarm;
    statErrors.textContent = errors;
    const acc = stats.inspected ? Math.round(100 * (stats.inspected - errors) / stats.inspected) : 100;
    statAcc.textContent = acc + '%';
    if (verdict) {
      lastVerdict.textContent = 'Ultimo esito: ' + verdict.toLowerCase();
      lastVerdict.className = 'last-verdict ' + cls;
    }
  }

  function tick(ts) {
    if (!running) return;
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50) / 1000;
    lastTs = ts;

    const width = track.clientWidth;
    const scanX = scannerCenter();
    let scannerBusy = pieces.some(q => q.state === 'scanning');

    // Spawn solo se la zona d'ingresso è libera
    const entryClear = !pieces.some(q => q.x < PIECE_W + MIN_GAP);
    if (ts - lastSpawn > SPAWN_EVERY && entryClear) {
      lastSpawn = ts;
      spawnPiece();
    }

    // Ordinati per posizione decrescente: si processa prima chi è più
    // avanti, così ogni pezzo si accoda a quello immediatamente davanti.
    const ordered = pieces.slice().sort((a, b) => b.x - a.x);
    let aheadX = Infinity;

    for (const p of ordered) {
      if (p.state === 'moving') {
        let nx = p.x + SPEED * dt;

        // 1) Non superare lo scanner se è occupato: fermarsi in attesa
        if (scannerBusy && p.x + PIECE_W / 2 < scanX) {
          nx = Math.min(nx, scanX - PIECE_W - MIN_GAP / 2);
        }

        // 2) Non tamponare il pezzo immediatamente davanti
        if (aheadX < Infinity) {
          nx = Math.min(nx, aheadX - PIECE_W - MIN_GAP);
        }

        p.x = Math.max(p.x, nx);

        // Arrivo allo scanner (solo se libero): centrato, non "a occhio"
        if (!scannerBusy && p.x + PIECE_W / 2 >= scanX - 2) {
          p.x = scanX - PIECE_W / 2;
          p.state = 'scanning';
          p.scanT = 0;
          scannerBusy = true;
          scanner.classList.add('active');
        }
      } else if (p.state === 'scanning') {
        p.scanT += dt * 1000;
        if (p.scanT >= SCAN_MS) {
          classify(p);
          p.state = 'done';
          scanner.classList.remove('active');
        }
      } else { // done: esce dal nastro dissolvendosi sul bordo
        p.x += SPEED * dt;
        const fadeStart = width - PIECE_W - 20;
        if (p.x > fadeStart) {
          p.el.style.opacity = Math.max(0, 1 - (p.x - fadeStart) / PIECE_W);
        }
        if (p.x > width + 20) {
          p.el.remove();
          pieces.splice(pieces.indexOf(p), 1);
          continue;
        }
      }

      p.el.style.transform = 'translateX(' + p.x + 'px)';
      aheadX = p.x;
    }

    rafId = requestAnimationFrame(tick);
  }

  function resetLine() {
    pieces.forEach(p => p.el.remove());
    pieces = [];
    stats = { inspected: 0, found: 0, missed: 0, falseAlarm: 0 };
    scanner.classList.remove('active');
    lastTs = null;
    lastSpawn = 0;
    updateStats(null, '');
    lastVerdict.textContent = 'In attesa del primo pezzo.';
    lastVerdict.className = 'last-verdict';
  }

  function selectLevel(lvl) {
    currentLevel = lvl;
    lvlButtons.forEach(b => b.classList.toggle('selected', b.dataset.lvl === lvl));
    resetLine();
  }

  lvlButtons.forEach(b => {
    b.addEventListener('click', () => selectLevel(b.dataset.lvl));
  });

  // Pausa quando il tab non è visibile (risparmia CPU, evita salti)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    } else {
      running = true;
      lastTs = null;
      rafId = requestAnimationFrame(tick);
    }
  });

  // Riduzione del movimento: mostra la linea ferma con un pezzo di esempio
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  selectLevel('l1');
  if (!reduceMotion) {
    rafId = requestAnimationFrame(tick);
  } else {
    spawnPiece();
    const p = pieces[0];
    p.x = scannerCenter() - 40;
    p.el.style.transform = 'translateX(' + p.x + 'px)';
    classify(p);
  }
})();
