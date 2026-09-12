/* ============================================================================
   לוגיקת קונסולת המורה / מסך המקרן
   ============================================================================ */
(function () {
  'use strict';

  var backend = window.createBackend();
  var QUESTIONS = window.QUESTIONS;
  var BASES = window.BASES;
  var F = window.Figures;

  var state = { code: null, activeQuestion: 0, phase: 'collecting', answers: {} };
  var board = null;
  var legendCells = {};   // key -> {guess, truth}
  var lastPhase = null;   // לזיהוי המעבר collecting→revealed להרצת אנימציה

  var el = {
    demoFlag: document.getElementById('demoFlag'),
    // מסכי פתיחה
    defView: document.getElementById('defView'),
    defBody: document.getElementById('defBody'),
    toPopBtn: document.getElementById('toPopBtn'),
    popView: document.getElementById('popView'),
    popBody: document.getElementById('popBody'),
    popBackBtn: document.getElementById('popBackBtn'),
    toSetupBtn: document.getElementById('toSetupBtn'),
    setupBackBtn: document.getElementById('setupBackBtn'),
    // הקמת חדר + קונסולה
    setup: document.getElementById('setupView'),
    createBtn: document.getElementById('createBtn'),
    console: document.getElementById('consoleView'),
    roomCode: document.getElementById('roomCode'),
    joinLink: document.getElementById('joinLink'),
    qr: document.getElementById('qr'),
    baseRow: document.getElementById('baseRow'),
    roundTag: document.getElementById('roundTag'),
    prompt: document.getElementById('prompt'),
    note: document.getElementById('note'),
    dots: document.getElementById('navDots'),
    count: document.getElementById('count'),
    boardEl: document.getElementById('board'),
    legend: document.getElementById('legend'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    revealBtn: document.getElementById('revealBtn')
  };

  if (window.BACKEND_IS_LOCAL) el.demoFlag.classList.remove('hidden');
  board = new F.FigureBoard(el.boardEl);

  el.createBtn.addEventListener('click', createRoom);
  el.prevBtn.addEventListener('click', function () { goTo(state.activeQuestion - 1); });
  el.nextBtn.addEventListener('click', function () { goTo(state.activeQuestion + 1); });
  el.revealBtn.addEventListener('click', reveal);

  /* ---------- ניווט מסכי פתיחה (צד מורה בלבד) ---------- */
  el.toPopBtn.addEventListener('click', function () { showScreen('pop'); });
  el.popBackBtn.addEventListener('click', function () { showScreen('def'); });
  el.toSetupBtn.addEventListener('click', function () { showScreen('setup'); });
  el.setupBackBtn.addEventListener('click', function () { showScreen('pop'); });

  var SCREENS = { def: el.defView, pop: el.popView, setup: el.setup, console: el.console };
  function showScreen(name) {
    Object.keys(SCREENS).forEach(function (k) { SCREENS[k].classList.add('hidden'); });
    SCREENS[name].classList.remove('hidden');
    if (name === 'pop') startPopAnimation();
    window.scrollTo(0, 0);
  }

  renderDefinition();
  renderPopulation();
  showScreen('def');

  /* ---------- מסך 1: הגדרת דמוגרפיה ---------- */
  function renderDefinition() {
    var d = window.DEMOGRAPHY;
    var cards = d.cards.map(function (c) {
      return '<div class="def-card">' +
        '<div class="def-card-head"><span class="def-ico">' + c.icon + '</span>' +
        '<span class="def-card-title">' + escapeHtml(c.title) + '</span></div>' +
        '<p class="def-card-desc">' + escapeHtml(c.desc) + '</p></div>';
    }).join('');
    var ety = d.etymology.map(function (e) {
      return '<div class="ety-row"><span class="ety-term">' + escapeHtml(e.term) +
        '</span> ← <span class="ety-mean">' + escapeHtml(e.meaning) + '</span></div>';
    }).join('');
    el.defBody.innerHTML =
      '<div class="def-grid">' +
        '<div class="def-box">' +
          '<h3>הגדרה</h3>' +
          '<p class="def-text">' + escapeHtml(d.definition) + '</p>' +
          '<div class="ety"><div class="ety-head">מקור המונח מיוונית:</div>' + ety + '</div>' +
        '</div>' +
        '<div class="def-cards">' + cards + '</div>' +
      '</div>';
  }

  /* ---------- מסך 2: כמה אנשים חיים בישראל? ---------- */
  var popAnimated = false;
  function renderPopulation() {
    var p = window.POPULATION;
    var totalPct = 100;
    var forPct = (p.total.value ? (0.304 / p.total.value) * 100 : 0);
    var israelPct = 100 - forPct;
    var ejPct = (p.total.value ? (0.35 / p.total.value) * 100 : 0);

    var cards = p.breakdown.map(function (b) {
      return '<div class="pop-card pop-' + b.tone + '">' +
        '<div class="pop-card-val">' + escapeHtml(b.value) + '</div>' +
        '<div class="pop-card-title">' + escapeHtml(b.title) + '</div>' +
        '<div class="pop-card-desc">' + escapeHtml(b.desc) + '</div></div>';
    }).join('');

    el.popBody.innerHTML =
      '<div class="pop-source">' + escapeHtml(p.source) + '</div>' +
      '<div class="pop-hero">' +
        '<span class="pop-num" id="popIsraelis" data-target="' + p.israelis.value + '" data-dec="0">0</span>' +
        '<span class="pop-num-unit">' + escapeHtml(p.israelis.unit) + ' ' + escapeHtml(p.israelis.label) + '</span>' +
      '</div>' +
      '<div class="pop-bar" aria-hidden="true">' +
        '<div class="pop-seg pop-seg-isr" style="width:0" data-w="' + israelPct.toFixed(2) + '">' +
          '<span class="pop-seg-label">ישראלים ≈ 10 מיליון</span>' +
          '<div class="pop-ej" style="width:0" data-w="' + (ejPct / israelPct * 100).toFixed(2) + '" title="מזרח ירושלים"></div>' +
        '</div>' +
        '<div class="pop-seg pop-seg-for" style="width:0" data-w="' + forPct.toFixed(2) + '"></div>' +
      '</div>' +
      '<div class="pop-total-line">סה"כ מי שחי בישראל דרך קבע: ' +
        '<b id="popTotal" data-target="' + p.total.value + '" data-dec="3">0</b> ' + escapeHtml(p.total.unit) + '</div>' +
      '<div class="pop-cards">' + cards + '</div>';
  }

  function startPopAnimation() {
    // מריצים פעם אחת בלבד
    if (popAnimated) return;
    popAnimated = true;
    // מילוי הפסים
    el.popBody.querySelectorAll('[data-w]').forEach(function (seg) {
      requestAnimationFrame(function () { seg.style.width = seg.getAttribute('data-w') + '%'; });
    });
    // ספירת מספרים
    el.popBody.querySelectorAll('[data-target]').forEach(function (n) {
      countUp(n, parseFloat(n.getAttribute('data-target')), parseInt(n.getAttribute('data-dec'), 10) || 0, 1200);
    });
    // חשיפה מדורגת של הכרטיסים
    var cards = el.popBody.querySelectorAll('.pop-card');
    cards.forEach(function (c, i) {
      c.style.animationDelay = (400 + i * 350) + 'ms';
      c.classList.add('reveal');
    });
  }

  function countUp(node, target, decimals, duration) {
    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
      else node.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(step);
  }

  function randomCode() {
    var a = window.APP.ROOM_CODE_ALPHABET, n = window.APP.ROOM_CODE_LENGTH, s = '';
    for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  function createRoom() {
    var code = randomCode();
    backend.createRoom(code).then(function () {
      state.code = code;
      showScreen('console');
      showRoomCode(code);
      listenMeta();
      switchAnswerListener(0);
    });
  }

  function showRoomCode(code) {
    el.roomCode.textContent = code;
    // בונים כתובת לתיקייה (מסירים את שם הקובץ ואת ה-query) ומצרפים index.html
    var dir = location.href.replace(/[^/]*(\?.*)?(#.*)?$/, '');
    var url = dir + 'index.html?room=' + code;
    el.joinLink.textContent = url;
    el.joinLink.href = url;
    renderQR(url);
  }

  function renderQR(url) {
    el.qr.innerHTML = '';
    if (window.QRCode) {
      try { new window.QRCode(el.qr, { text: url, width: 160, height: 160 }); return; }
      catch (e) { /* נפילה חיננית לקישור בלבד */ }
    }
    el.qr.innerHTML = '<div class="muted">סרקו/הקלידו את הקישור למעלה</div>';
  }

  /* ---------- מצב החדר ---------- */
  function listenMeta() {
    backend.onMeta(state.code, function (meta) {
      if (!meta) return;
      state.activeQuestion = meta.activeQuestion;
      state.phase = meta.phase;
      renderQuestion();
      updateControls();
    });
  }

  function switchAnswerListener(q) {
    // ניקוי כל המאזינים (כולל q) כדי למנוע רישום כפול
    QUESTIONS.forEach(function (_, i) { backend.offAnswers(state.code, i); });
    backend.onAnswers(state.code, q, function (answers) {
      state.answers = answers || {};
      if (state.phase !== 'revealed') updateBoard();
      else updateCount();
    });
  }

  function currentQ() { return QUESTIONS[state.activeQuestion]; }

  function renderQuestion() {
    var q = currentQ();
    el.baseRow.innerHTML = window.baseRowHtml(q);
    el.roundTag.textContent = q.round + ' · ' + q.title;
    el.prompt.textContent = q.prompt;
    el.note.textContent = q.note || '';
    buildLegend(q);
    buildDots();
    switchAnswerListener(state.activeQuestion);

    var becameRevealed = (lastPhase !== 'revealed' && state.phase === 'revealed');
    if (state.phase === 'revealed') {
      // ממלאים את עמודת הניחוש לפי ההגשות, ואז מנפישים אל האמת
      paintGuessLegend(q);
      showTruth(becameRevealed);  // אנימציה רק ברגע החשיפה עצמו
    } else {
      updateBoard();
    }
    lastPhase = state.phase;
  }

  // ממלא את עמודת ה"ניחוש" במקרא מתוך ההגשות שנאספו (בלי לגעת בלוח)
  function paintGuessLegend(q) {
    var keys = q.categories.map(function (c) { return c.key; });
    var agg = F.averageAnswers(q, state.answers);
    var dist = F.allocate100(keys, agg.avg);
    q.categories.forEach(function (cat) {
      legendCells[cat.key].guess.textContent = agg.count ? dist[cat.key] : '—';
    });
  }

  function buildDots() {
    el.dots.innerHTML = '';
    QUESTIONS.forEach(function (_, i) {
      var d = document.createElement('span');
      d.className = 'dot' + (i === state.activeQuestion ? ' active' : '');
      el.dots.appendChild(d);
    });
  }

  function buildLegend(q) {
    var hide = state.phase === 'revealed' ? '' : ' hidden';
    el.legend.innerHTML =
      '<div class="legend-head"><span></span><span>קטגוריה</span>' +
      '<span class="guess">ניחוש</span>' +
      '<span class="truth' + hide + '">מתוך 100</span>' +
      '<span class="truth' + hide + '">אחוז בפועל</span></div>';
    legendCells = {};
    q.categories.forEach(function (cat) {
      var item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        '<span class="swatch" style="background:' + cat.color + '"></span>' +
        '<span class="name">' + escapeHtml(cat.name) + '</span>' +
        '<span class="guess" data-guess>—</span>' +
        '<span class="truth' + hide + '" data-truth>' + cat.truth + '</span>' +
        '<span class="truth pct' + hide + '" data-pct>' + escapeHtml(cat.pct) + '</span>';
      el.legend.appendChild(item);
      legendCells[cat.key] = {
        guess: item.querySelector('[data-guess]'),
        truth: item.querySelector('[data-truth]'),
        pct: item.querySelector('[data-pct]')
      };
    });
  }

  function updateCount() {
    var n = Object.keys(state.answers || {}).length;
    el.count.textContent = n + ' הגשות';
  }

  function updateBoard() {
    var q = currentQ();
    updateCount();
    var keys = q.categories.map(function (c) { return c.key; });
    var agg = F.averageAnswers(q, state.answers);
    var dist = F.allocate100(keys, agg.avg);
    board.render(q, dist, false);
    q.categories.forEach(function (cat) {
      legendCells[cat.key].guess.textContent = agg.count ? dist[cat.key] : '—';
    });
  }

  /* ---------- חשיפת אמת עם אנימציה ---------- */
  function reveal() {
    backend.setMeta(state.code, { phase: 'revealed' });
  }

  function showTruth(animate) {
    var q = currentQ();
    var keys = q.categories.map(function (c) { return c.key; });
    var truth = {};
    q.categories.forEach(function (c) { truth[c.key] = c.truth; });
    board.render(q, truth, animate !== false);
    // חשיפת עמודות האמת (מתוך 100 + אחוז בפועל) והנעת המספרים
    el.legend.querySelectorAll('.truth').forEach(function (n) { n.classList.remove('hidden'); });
    q.categories.forEach(function (cat) {
      legendCells[cat.key].truth.textContent = cat.truth;
      legendCells[cat.key].pct.textContent = cat.pct;
      legendCells[cat.key].truth.classList.add('pulse');
    });
    updateCount();
  }

  function updateControls() {
    el.prevBtn.disabled = state.activeQuestion <= 0;
    el.nextBtn.disabled = state.activeQuestion >= QUESTIONS.length - 1;
    el.revealBtn.disabled = state.phase === 'revealed';
    el.revealBtn.textContent = state.phase === 'revealed' ? 'האמת נחשפה' : 'חשוף אמת';
  }

  function goTo(i) {
    if (i < 0 || i >= QUESTIONS.length) return;
    backend.setMeta(state.code, { activeQuestion: i, phase: 'collecting' });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
