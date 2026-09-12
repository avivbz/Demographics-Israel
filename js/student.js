/* ============================================================================
   לוגיקת מסך התלמיד
   ============================================================================ */
(function () {
  'use strict';

  var backend = window.createBackend();
  var QUESTIONS = window.QUESTIONS;
  var BASES = window.BASES;

  // מזהה אנונימי יציב למכשיר
  var clientId = localStorage.getItem('demostudent:id');
  if (!clientId) {
    clientId = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('demostudent:id', clientId);
  }

  var state = { code: null, activeQuestion: null, phase: null, answeredFor: {} };

  var el = {
    demoFlag: document.getElementById('demoFlag'),
    join: document.getElementById('joinView'),
    codeInput: document.getElementById('codeInput'),
    joinBtn: document.getElementById('joinBtn'),
    joinErr: document.getElementById('joinErr'),
    play: document.getElementById('playView'),
    baseRow: document.getElementById('baseRow'),
    roundTag: document.getElementById('roundTag'),
    prompt: document.getElementById('prompt'),
    note: document.getElementById('note'),
    form: document.getElementById('answerForm'),
    rows: document.getElementById('answerRows'),
    sumBar: document.getElementById('sumBar'),
    sumText: document.getElementById('sumText'),
    submitBtn: document.getElementById('submitBtn'),
    waiting: document.getElementById('waitingView'),
    waitMsg: document.getElementById('waitMsg'),
    waitSub: document.getElementById('waitSub')
  };

  if (window.BACKEND_IS_LOCAL) el.demoFlag.classList.remove('hidden');

  /* ---------- הצטרפות ---------- */
  var params = new URLSearchParams(location.search);
  var preRoom = (params.get('room') || '').toUpperCase();
  if (preRoom) el.codeInput.value = preRoom;

  el.joinBtn.addEventListener('click', tryJoin);
  el.codeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryJoin(); });

  function tryJoin() {
    var code = (el.codeInput.value || '').trim().toUpperCase();
    if (!code) { return; }
    backend.roomExists(code).then(function (exists) {
      if (!exists) { el.joinErr.textContent = 'לא נמצא חדר עם הקוד הזה. בדקו מול המורה.'; return; }
      state.code = code;
      el.join.classList.add('hidden');
      el.play.classList.remove('hidden');
      listen();
    });
  }

  /* ---------- האזנה למצב החדר ---------- */
  function listen() {
    backend.onMeta(state.code, function (meta) {
      if (!meta) return;
      var changed = meta.activeQuestion !== state.activeQuestion || meta.phase !== state.phase;
      state.activeQuestion = meta.activeQuestion;
      state.phase = meta.phase;
      if (changed) renderQuestion();
    });
  }

  function currentQ() { return QUESTIONS[state.activeQuestion]; }

  function renderQuestion() {
    var q = currentQ();
    if (!q) return;
    el.baseRow.innerHTML = window.baseRowHtml(q);
    el.roundTag.textContent = q.round;
    el.prompt.textContent = q.prompt;
    el.note.textContent = q.note || '';

    var already = !!state.answeredFor[state.activeQuestion];

    if (state.phase === 'revealed') {
      showWaiting('נחשפת חלוקת האמת', 'הביטו במסך המורה 👀');
      return;
    }
    if (already) {
      showWaiting('התשובה נשלחה ✅', 'ממתינים שהמורה ימשיך…');
      return;
    }
    showForm(q);
  }

  function showForm(q) {
    el.waiting.classList.add('hidden');
    el.form.classList.remove('hidden');
    el.rows.innerHTML = '';
    q.categories.forEach(function (cat) {
      var row = document.createElement('label');
      row.className = 'answer-row';
      row.innerHTML =
        '<span class="label"><span class="swatch" style="background:' + cat.color + '"></span>' +
        escapeHtml(cat.name) + '</span>';
      var input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.inputMode = 'numeric';
      input.value = '';
      input.dataset.key = cat.key;
      input.addEventListener('input', updateSum);
      row.appendChild(input);
      el.rows.appendChild(row);
    });
    updateSum();
  }

  function getInputs() {
    return Array.prototype.slice.call(el.rows.querySelectorAll('input'));
  }

  function updateSum() {
    var sum = 0, allFilled = true;
    getInputs().forEach(function (inp) {
      if (inp.value === '') allFilled = false;
      sum += Number(inp.value) || 0;
    });
    el.sumText.textContent = 'סכום: ' + sum + ' / 100';
    el.sumBar.classList.toggle('ok', sum === 100);
    el.sumBar.classList.toggle('over', sum > 100);
    el.submitBtn.disabled = !(sum === 100 && allFilled);
  }

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var values = {};
    getInputs().forEach(function (inp) { values[inp.dataset.key] = Number(inp.value) || 0; });
    el.submitBtn.disabled = true;
    backend.submitAnswer(state.code, state.activeQuestion, clientId, values).then(function () {
      state.answeredFor[state.activeQuestion] = true;
      showWaiting('התשובה נשלחה ✅', 'ממתינים שהמורה ימשיך…');
    }).catch(function () {
      el.submitBtn.disabled = false;
      alert('שליחה נכשלה. נסו שוב.');
    });
  });

  function showForm_hide() { el.form.classList.add('hidden'); }

  function showWaiting(msg, sub) {
    showForm_hide();
    el.waiting.classList.remove('hidden');
    el.waitMsg.textContent = msg;
    el.waitSub.textContent = sub || '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
