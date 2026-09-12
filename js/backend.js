/* ============================================================================
   שכבת תקשורת ("חדר")
   ----------------------------------------------------------------------------
   ממשק אחיד למורה ולתלמיד, עם שתי מימושים:

   1) FirebaseBackend — Realtime Database, סנכרון אמיתי בין מכשירים.
      פעיל כאשר js/config.js מכיל apiKey + databaseURL.

   2) LocalBackend — גיבוי לבדיקה מקומית (BroadcastChannel + localStorage).
      מסנכרן רק בין כרטיסיות באותו דפדפן. פעיל כשאין Firebase config.

   מבנה הנתונים:
     rooms/{CODE}/meta    = { activeQuestion: 0..3, phase: 'collecting'|'revealed', createdAt }
     rooms/{CODE}/answers/{qIndex}/{clientId} = { values:{key:n}, ts }

   הממשק:
     backend.createRoom(code)                       -> Promise
     backend.roomExists(code)                       -> Promise<boolean>
     backend.onMeta(code, cb)                        (cb(meta|null))
     backend.setMeta(code, patch)                   -> Promise
     backend.submitAnswer(code, q, clientId, values)-> Promise
     backend.onAnswers(code, q, cb)                  (cb(answersObj))
     backend.offAnswers(code, q)
   ============================================================================ */

(function () {
  'use strict';

  /* ----------------------------- Firebase ----------------------------- */
  function FirebaseBackend() {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    this.db = firebase.database();
    this._answerRefs = {};
  }
  FirebaseBackend.prototype.createRoom = function (code) {
    return this.db.ref('rooms/' + code + '/meta').set({
      activeQuestion: 0,
      phase: 'collecting',
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
  };
  FirebaseBackend.prototype.roomExists = function (code) {
    return this.db.ref('rooms/' + code + '/meta').once('value')
      .then(function (snap) { return snap.exists(); });
  };
  FirebaseBackend.prototype.onMeta = function (code, cb) {
    this.db.ref('rooms/' + code + '/meta').on('value', function (snap) {
      cb(snap.val());
    });
  };
  FirebaseBackend.prototype.setMeta = function (code, patch) {
    return this.db.ref('rooms/' + code + '/meta').update(patch);
  };
  FirebaseBackend.prototype.submitAnswer = function (code, q, clientId, values) {
    return this.db.ref('rooms/' + code + '/answers/' + q + '/' + clientId).set({
      values: values,
      ts: firebase.database.ServerValue.TIMESTAMP
    });
  };
  FirebaseBackend.prototype.onAnswers = function (code, q, cb) {
    var ref = this.db.ref('rooms/' + code + '/answers/' + q);
    this._answerRefs[q] = ref;
    ref.on('value', function (snap) { cb(snap.val() || {}); });
  };
  FirebaseBackend.prototype.offAnswers = function (code, q) {
    if (this._answerRefs[q]) { this._answerRefs[q].off(); delete this._answerRefs[q]; }
  };

  /* ------------------------ Local (fallback) ------------------------ */
  function LocalBackend() {
    this._channels = {};
    this._metaCbs = {};
    this._answerCbs = {};  // code -> { q -> cb }
    var self = this;
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('demoroom:') === 0) {
        var code = e.key.slice('demoroom:'.length);
        self._fire(code);
      }
    });
  }
  LocalBackend.prototype._key = function (code) { return 'demoroom:' + code; };
  LocalBackend.prototype._read = function (code) {
    try { return JSON.parse(localStorage.getItem(this._key(code))) || null; }
    catch (e) { return null; }
  };
  LocalBackend.prototype._write = function (code, state) {
    localStorage.setItem(this._key(code), JSON.stringify(state));
    this._fire(code);
    this._chan(code).postMessage('update');
  };
  LocalBackend.prototype._chan = function (code) {
    if (!this._channels[code]) {
      var self = this;
      var ch = new BroadcastChannel('demoroom:' + code);
      ch.onmessage = function () { self._fire(code); };
      this._channels[code] = ch;
    }
    return this._channels[code];
  };
  LocalBackend.prototype._fire = function (code) {
    var state = this._read(code);
    if (this._metaCbs[code]) this._metaCbs[code]((state && state.meta) || null);
    var cbs = this._answerCbs[code] || {};
    Object.keys(cbs).forEach(function (q) {
      cbs[q](((state && state.answers && state.answers[q]) || {}));
    });
  };
  LocalBackend.prototype.createRoom = function (code) {
    this._write(code, { meta: { activeQuestion: 0, phase: 'collecting', createdAt: Date.now() }, answers: {} });
    this._chan(code);
    return Promise.resolve();
  };
  LocalBackend.prototype.roomExists = function (code) {
    return Promise.resolve(!!this._read(code));
  };
  LocalBackend.prototype.onMeta = function (code, cb) {
    this._metaCbs[code] = cb;
    this._chan(code);
    cb((this._read(code) || {}).meta || null);
  };
  LocalBackend.prototype.setMeta = function (code, patch) {
    var state = this._read(code) || { meta: {}, answers: {} };
    state.meta = Object.assign({}, state.meta, patch);
    this._write(code, state);
    return Promise.resolve();
  };
  LocalBackend.prototype.submitAnswer = function (code, q, clientId, values) {
    var state = this._read(code) || { meta: {}, answers: {} };
    state.answers = state.answers || {};
    state.answers[q] = state.answers[q] || {};
    state.answers[q][clientId] = { values: values, ts: Date.now() };
    this._write(code, state);
    return Promise.resolve();
  };
  LocalBackend.prototype.onAnswers = function (code, q, cb) {
    this._answerCbs[code] = this._answerCbs[code] || {};
    this._answerCbs[code][q] = cb;
    this._chan(code);
    cb(((this._read(code) || {}).answers || {})[q] || {});
  };
  LocalBackend.prototype.offAnswers = function (code, q) {
    if (this._answerCbs[code]) delete this._answerCbs[code][q];
  };

  window.createBackend = function () {
    if (window.FIREBASE_ENABLED && window.firebase && firebase.database) {
      return new FirebaseBackend();
    }
    return new LocalBackend();
  };
  window.BACKEND_IS_LOCAL = !window.FIREBASE_ENABLED;
})();
