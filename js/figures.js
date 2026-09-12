/* ============================================================================
   לוח 100 הדמויות + חישובים
   ----------------------------------------------------------------------------
   - allocate100: מחלק חלוקה (אחוזים/ממוצעים) ל-100 דמויות שלמות בשיטת
     "השארית הגדולה" (largest remainder), כך שהסכום תמיד בדיוק 100.
   - averageAnswers: ממוצע כיתתי של כל הקטגוריות על פני כל ההגשות.
   - FigureBoard: רשת של 100 אייקוני אדם שמתעדכנת ומונפשת.
   ============================================================================ */

(function () {
  'use strict';

  /* חלוקת 100 דמויות לפי ערכים (לאו דווקא שלמים) בשיטת השארית הגדולה.
     keys: סדר הקטגוריות. values: אובייקט key->number. מחזיר key->integer. */
  function allocate100(keys, values) {
    const raw = keys.map(k => Math.max(0, Number(values[k]) || 0));
    const total = raw.reduce((a, b) => a + b, 0);
    if (total <= 0) return keys.map(() => 0);
    const scaled = raw.map(v => (v / total) * 100);
    const floors = scaled.map(Math.floor);
    let remainder = 100 - floors.reduce((a, b) => a + b, 0);
    const order = scaled
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    const out = floors.slice();
    for (let k = 0; k < remainder; k++) out[order[k % order.length].i]++;
    const result = {};
    keys.forEach((k, i) => { result[k] = out[i]; });
    return result;
  }

  /* ממוצע כיתתי: answers = { clientId: {values:{key:n}} }.
     מחזיר { count, avg:{key:number} } כאשר avg הוא ממוצע פשוט של כל ההגשות. */
  function averageAnswers(question, answers) {
    const keys = question.categories.map(c => c.key);
    const ids = answers ? Object.keys(answers) : [];
    const avg = {};
    keys.forEach(k => { avg[k] = 0; });
    if (ids.length === 0) return { count: 0, avg };
    ids.forEach(id => {
      const v = (answers[id] && answers[id].values) || {};
      keys.forEach(k => { avg[k] += Number(v[k]) || 0; });
    });
    keys.forEach(k => { avg[k] = avg[k] / ids.length; });
    return { count: ids.length, avg };
  }

  /* SVG של דמות אדם (viewBox 24x24). הצבע נקבע דרך fill. */
  var PERSON_PATH =
    'M12 12.8c2.4 0 4.3-2 4.3-4.4S14.4 4 12 4 7.7 6 7.7 8.4 9.6 12.8 12 12.8z' +
    'M12 14.2c-3.6 0-8 1.8-8 5.3V21h16v-1.5c0-3.5-4.4-5.3-8-5.3z';

  function FigureBoard(container) {
    this.el = container;
    this.el.classList.add('figure-board');
    this.el.setAttribute('role', 'img');
    this.cells = [];
    this._build();
  }

  FigureBoard.prototype._build = function () {
    this.el.innerHTML = '';
    var ns = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 100; i++) {
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'figure');
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', PERSON_PATH);
      svg.appendChild(path);
      this.el.appendChild(svg);
      this.cells.push(svg);
    }
  };

  /* צובע את 100 הדמויות לפי חלוקה. question לצבעים, dist = key->integer(סכום 100).
     animate=true מוסיף השהיה מדורגת לאפקט "מעבר". */
  FigureBoard.prototype.render = function (question, dist, animate) {
    var order = question.categories;
    var idx = 0;
    for (var c = 0; c < order.length; c++) {
      var cat = order[c];
      var n = dist[cat.key] || 0;
      for (var j = 0; j < n && idx < 100; j++, idx++) {
        this._paint(this.cells[idx], cat.color, animate, idx);
      }
    }
    // שאריות (כשאין הגשות) — אפור נייטרלי
    for (; idx < 100; idx++) {
      this._paint(this.cells[idx], null, animate, idx);
    }
  };

  FigureBoard.prototype._paint = function (cell, color, animate, idx) {
    if (animate) {
      cell.style.transitionDelay = (idx * 6) + 'ms';
    } else {
      cell.style.transitionDelay = '0ms';
    }
    if (color) {
      cell.style.color = color;
      cell.classList.remove('figure--empty');
    } else {
      cell.style.color = '';
      cell.classList.add('figure--empty');
    }
  };

  window.Figures = {
    allocate100: allocate100,
    averageAnswers: averageAnswers,
    FigureBoard: FigureBoard
  };
})();
