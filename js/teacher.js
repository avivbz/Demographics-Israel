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

  function randomCode() {
    var a = window.APP.ROOM_CODE_ALPHABET, n = window.APP.ROOM_CODE_LENGTH, s = '';
    for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  function createRoom() {
    var code = randomCode();
    backend.createRoom(code).then(function () {
      state.code = code;
      el.setup.classList.add('hidden');
      el.console.classList.remove('hidden');
      showRoomCode(code);
      listenMeta();
      switchAnswerListener(0);
    });
  }

  function showRoomCode(code) {
    el.roomCode.textContent = code;
    var url = location.href.replace(/teacher\.html.*$/, 'index.html') + '?room=' + code;
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
    el.baseRow.textContent = BASES[q.base];
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
    el.legend.innerHTML =
      '<div class="legend-head"><span></span><span>קטגוריה</span>' +
      '<span class="guess">ניחוש</span><span class="truth' + (state.phase === 'revealed' ? '' : ' hidden') + '">אמת</span></div>';
    legendCells = {};
    q.categories.forEach(function (cat) {
      var item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        '<span class="swatch" style="background:' + cat.color + '"></span>' +
        '<span class="name">' + escapeHtml(cat.name) + '</span>' +
        '<span class="guess" data-guess>—</span>' +
        '<span class="truth' + (state.phase === 'revealed' ? '' : ' hidden') + '" data-truth>' + cat.truth + '</span>';
      el.legend.appendChild(item);
      legendCells[cat.key] = {
        guess: item.querySelector('[data-guess]'),
        truth: item.querySelector('[data-truth]')
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
    // חשיפת עמודת האמת במקרא + הנעת המספרים
    el.legend.querySelectorAll('.truth').forEach(function (n) { n.classList.remove('hidden'); });
    q.categories.forEach(function (cat) {
      legendCells[cat.key].truth.textContent = cat.truth;
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
