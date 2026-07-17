// ================================================================
// Actyra — Sasso, Carta, Forbici contro una rete che impara
// ----------------------------------------------------------------
// Apprendimento REALE nel browser, non simulato:
// una MLP 9 -> 14 -> 3 (softmax) prevede la PROSSIMA mossa del
// giocatore a partire dalle sue ultime tre, e gioca il contro.
// A ogni round la rete viene addestrata via discesa del gradiente
// (cross-entropy) sulla mossa che il giocatore ha appena fatto.
// Nei primi round tira a caso; se il giocatore ha uno schema,
// comincia a leggerlo nel giro di 10-20 mosse.
// ================================================================

(function () {
  'use strict';

  const btns = document.querySelectorAll('.rps-btn');
  if (!btns.length) return; // non siamo sulla pagina sfida

  const MOVES  = ['sasso', 'carta', 'forbici'];
  const EMOJI  = ['✊', '✋', '✌️'];
  const BEATS  = [1, 2, 0]; // BEATS[m] = mossa che batte m

  // ---------- Rete: 9 -> 14 -> 3 ----------
  const IN = 9, HID = 14, OUT = 3;
  const LR = 0.22;

  let w1, b1, w2, b2;

  function initNet() {
    const rnd = () => (Math.random() - 0.5) * 0.6;
    w1 = Array.from({ length: HID * IN }, rnd);
    b1 = new Array(HID).fill(0);
    w2 = Array.from({ length: OUT * HID }, rnd);
    b2 = new Array(OUT).fill(0);
  }

  function forward(x) {
    const h = new Array(HID), hraw = new Array(HID);
    for (let j = 0; j < HID; j++) {
      let s = b1[j];
      for (let i = 0; i < IN; i++) s += w1[j * IN + i] * x[i];
      hraw[j] = s;
      h[j] = s > 0 ? s : 0;
    }
    const z = new Array(OUT);
    for (let k = 0; k < OUT; k++) {
      let s = b2[k];
      for (let j = 0; j < HID; j++) s += w2[k * HID + j] * h[j];
      z[k] = s;
    }
    const m = Math.max(...z);
    const ez = z.map(v => Math.exp(v - m));
    const sum = ez.reduce((a, v) => a + v, 0);
    return { probs: ez.map(v => v / sum), h, hraw };
  }

  // Un passo di SGD: la rete doveva prevedere `target` (mossa reale)
  function train(x, target) {
    const { probs, h } = forward(x);
    const dz = probs.slice();
    dz[target] -= 1; // dL/dz per softmax + cross-entropy

    // Strato di uscita
    const dh = new Array(HID).fill(0);
    for (let k = 0; k < OUT; k++) {
      for (let j = 0; j < HID; j++) {
        dh[j] += dz[k] * w2[k * HID + j];
        w2[k * HID + j] -= LR * dz[k] * h[j];
      }
      b2[k] -= LR * dz[k];
    }
    // Strato nascosto (ReLU)
    for (let j = 0; j < HID; j++) {
      if (h[j] <= 0) continue;
      for (let i = 0; i < IN; i++) {
        w1[j * IN + i] -= LR * dh[j] * x[i];
      }
      b1[j] -= LR * dh[j];
    }
  }

  function encode(history) {
    const x = new Array(IN).fill(0);
    // ultime 3 mosse del giocatore, one-hot
    for (let t = 0; t < 3; t++) {
      const mv = history[history.length - 1 - t];
      if (mv !== undefined) x[t * 3 + mv] = 1;
    }
    return x;
  }

  // ---------- Stato partita ----------
  let history = [];       // mosse del giocatore
  let outcomes = [];      // 1 = vince rete, 0 = pareggio, -1 = vince giocatore
  let score = { you: 0, draw: 0, net: 0 };
  let rounds = 0;

  // ---------- UI ----------
  const elYou     = document.getElementById('rps-you');
  const elDraw    = document.getElementById('rps-draw');
  const elNet     = document.getElementById('rps-net');
  const elResult  = document.getElementById('rps-result');
  const elDetail  = document.getElementById('rps-detail');
  const elHandY   = document.getElementById('rps-hand-you');
  const elHandN   = document.getElementById('rps-hand-net');
  const elReadBar = document.getElementById('rps-read-fill');
  const elReadPct = document.getElementById('rps-read-pct');
  const elRounds  = document.getElementById('rps-rounds');
  const resetBtn  = document.getElementById('rps-reset');

  function updateReadMeter() {
    // Quanto la rete "legge" il giocatore: vittorie rete sulle ultime
    // 12 mosse non pareggiate. 33% = tira a caso, di più = ti ha letto.
    const recent = outcomes.filter(o => o !== 0).slice(-12);
    let pct = 33;
    if (recent.length >= 4) {
      pct = Math.round(100 * recent.filter(o => o === 1).length / recent.length);
    }
    elReadBar.style.width = pct + '%';
    elReadPct.textContent = pct + '%';
    elReadBar.classList.toggle('hot', pct >= 55);
  }

  function play(playerMove) {
    const x = encode(history);
    const { probs } = forward(x);

    // La rete sceglie: contro della mossa prevista.
    // Prima di avere storia (3 mosse) tira a caso, dichiaratamente.
    let netMove, predicted = -1, conf = 0;
    if (history.length < 3) {
      netMove = Math.floor(Math.random() * 3);
    } else {
      predicted = probs.indexOf(Math.max(...probs));
      conf = Math.round(probs[predicted] * 100);
      netMove = BEATS[predicted];
    }

    // Addestra sulla mossa reale appena fatta
    if (history.length >= 3) train(x, playerMove);
    history.push(playerMove);
    rounds++;

    // Esito
    let outcome, msg;
    if (netMove === playerMove) {
      outcome = 0; score.draw++;
      msg = 'Pareggio.';
    } else if (BEATS[playerMove] === netMove) {
      outcome = 1; score.net++;
      msg = 'Round alla rete.';
    } else {
      outcome = -1; score.you++;
      msg = 'Round a te.';
    }
    outcomes.push(outcome);

    // Aggiorna UI
    elHandY.textContent = EMOJI[playerMove];
    elHandN.textContent = EMOJI[netMove];
    elHandY.classList.remove('pop'); elHandN.classList.remove('pop');
    void elHandY.offsetWidth; // riavvia l'animazione
    elHandY.classList.add('pop'); elHandN.classList.add('pop');

    elResult.textContent = msg;
    elResult.className = 'rps-result ' + (outcome === 1 ? 'net' : outcome === -1 ? 'you' : '');

    if (predicted >= 0) {
      elDetail.textContent = 'La rete prevedeva ' + MOVES[predicted] + ' (' + conf + '%) e ha giocato ' + MOVES[netMove] + '.';
    } else {
      elDetail.textContent = 'Prime mosse: la rete non ha ancora dati su di te, tira a caso.';
    }

    elYou.textContent = score.you;
    elDraw.textContent = score.draw;
    elNet.textContent = score.net;
    elRounds.textContent = rounds;
    updateReadMeter();
  }

  function reset() {
    initNet();
    history = [];
    outcomes = [];
    score = { you: 0, draw: 0, net: 0 };
    rounds = 0;
    elYou.textContent = '0';
    elDraw.textContent = '0';
    elNet.textContent = '0';
    elRounds.textContent = '0';
    elHandY.textContent = '?';
    elHandN.textContent = '?';
    elResult.textContent = 'Fai la prima mossa.';
    elResult.className = 'rps-result';
    elDetail.textContent = 'La rete parte da zero: pesi casuali, nessun dato su di te.';
    updateReadMeter();
  }

  btns.forEach((b, i) => b.addEventListener('click', () => play(i)));
  resetBtn.addEventListener('click', reset);

  initNet();
  reset();
})();
