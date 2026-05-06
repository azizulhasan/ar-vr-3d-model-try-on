"use strict";
(self["webpackChunkar_try_on"] = self["webpackChunkar_try_on"] || []).push([["tryon-controller"],{

/***/ "./public/js/tryon/tryon-anchors.js":
/*!******************************************!*\
  !*** ./public/js/tryon/tryon-anchors.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   computeAnchor: () => (/* binding */ computeAnchor),
/* harmony export */   detectAccessoryFromMode: () => (/* binding */ detectAccessoryFromMode)
/* harmony export */ });
/**
 * Map MediaPipe Face Landmarker output to a 2D anchor (position, scale,
 * rotation) on the preview canvas. Phase-1 anchors: glasses (nose-bridge,
 * eye-line) and hats (forehead-top, head transform).
 *
 * Pro overrides this via the `atlas_ar_tryon_landmark_pipeline` filter (PHP)
 * by injecting a JS hook before this module runs. For now Free implements
 * static defaults.
 *
 * MediaPipe face mesh landmark index reference (subset):
 *   168 — nose bridge (between eyebrows)
 *   1   — nose tip
 *   33  — right eye outer corner
 *   263 — left eye outer corner
 *   10  — forehead top center
 *   152 — chin
 */

var IDX = {
  noseBridge: 168,
  noseTip: 1,
  eyeRight: 33,
  eyeLeft: 263,
  foreheadTop: 10,
  chin: 152
};

/**
 * @param {Array<{x:number,y:number,z:number}>} landmarks Normalized 0..1.
 * @param {string} mode 'face' (default), 'face-glasses', 'face-hat'.
 * @param {{width:number,height:number}} canvas
 * @returns {{x:number,y:number,width:number,rotation:number}|null}
 */
function computeAnchor(landmarks, mode, canvas) {
  var accessory = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'glasses';
  if (!landmarks || landmarks.length < 200) return null;
  var eyeR = landmarks[IDX.eyeRight];
  var eyeL = landmarks[IDX.eyeLeft];
  if (!eyeR || !eyeL) return null;
  var eyeRx = eyeR.x * canvas.width;
  var eyeRy = eyeR.y * canvas.height;
  var eyeLx = eyeL.x * canvas.width;
  var eyeLy = eyeL.y * canvas.height;
  var eyeDistance = Math.hypot(eyeLx - eyeRx, eyeLy - eyeRy);
  var rotation = Math.atan2(eyeLy - eyeRy, eyeLx - eyeRx);
  if (accessory === 'hat') {
    var forehead = landmarks[IDX.foreheadTop];
    if (!forehead) return null;
    // Hat sits above forehead, centered on head, ~2.4x eye-distance wide.
    return {
      x: forehead.x * canvas.width,
      y: forehead.y * canvas.height - eyeDistance * 0.7,
      width: eyeDistance * 2.4,
      rotation: rotation
    };
  }

  // Default: glasses on nose-bridge, scaled to eye-distance.
  var bridge = landmarks[IDX.noseBridge];
  if (!bridge) return null;
  return {
    x: bridge.x * canvas.width,
    y: bridge.y * canvas.height,
    width: eyeDistance * 2.0,
    rotation: rotation
  };
}
function detectAccessoryFromMode(mode) {
  if (mode === 'face-hat' || mode === 'hat') return 'hat';
  // face, face-glasses, glasses, anything else → glasses (default)
  return 'glasses';
}

/***/ }),

/***/ "./public/js/tryon/tryon-controller.js":
/*!*********************************************!*\
  !*** ./public/js/tryon/tryon-controller.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   startTryOn: () => (/* binding */ startTryOn)
/* harmony export */ });
/* harmony import */ var _tryon_ui_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./tryon-ui.js */ "./public/js/tryon/tryon-ui.js");
/* harmony import */ var _tryon_anchors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./tryon-anchors.js */ "./public/js/tryon/tryon-anchors.js");
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/**
 * Try-On controller. Coordinates webcam → worker (MediaPipe) → 2D canvas
 * compositor. Implements Pattern 1.5 from the integration plan: render the
 * 3D product GLB to a sprite via <model-viewer>.toBlob(), then draw that
 * sprite on the live webcam canvas at landmark-derived anchor positions.
 *
 * Pattern 2 (parallel three.js overlay) is reserved for Pro phases that
 * need depth ordering (clothing, occlusion).
 */



var VIDEO_WIDTH = 640;
var VIDEO_HEIGHT = 480;
function startTryOn(_x) {
  return _startTryOn.apply(this, arguments);
}

/**
 * Build a snapshot dataURL from the live canvas. When `watermark` is true
 * (Free tier), draws a small "Powered by AtlasAR" badge at the bottom-right
 * corner of a CLONED canvas — never mutates the live preview canvas.
 */
function _startTryOn() {
  _startTryOn = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2(_ref) {
    var productId, mode, glbSrc, config, onClose, ui, accessory, granted, stream, overlaySprite, worker, lastLandmarks, lastFacialMatrix, detectInflight, frames, lastFpsAt, running, workerReady, ctx, tick;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          tick = function _tick() {
            if (!running || !ui.isOpen) return;
            ctx.save();
            // Mirror so user feels natural ("selfie" view).
            ctx.translate(ui.canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(ui.video, 0, 0, ui.canvas.width, ui.canvas.height);
            ctx.restore();
            if (lastLandmarks) {
              var anchor = overlaySprite ? (0,_tryon_anchors_js__WEBPACK_IMPORTED_MODULE_1__.computeAnchor)(lastLandmarks, mode, ui.canvas, accessory) : null;
              // Pro pipeline hook: per-product calibration overrides.
              if (anchor && window.atlasArTryonPipeline && typeof window.atlasArTryonPipeline.adjustAnchor === 'function') {
                try {
                  anchor = window.atlasArTryonPipeline.adjustAnchor(anchor, {
                    productId: productId,
                    mode: mode,
                    accessory: accessory
                  }) || anchor;
                } catch (e) {
                  /* keep default anchor on failure */
                }
              }

              // Pattern 2 — Pro three.js renderer hook. When defined, it
              // owns the accessory render (depth-occluded GLB overlay) and
              // the 2D `ctx.drawImage(sprite, ...)` path is skipped.
              var renderedByPro = false;
              if (window.atlasArTryonPipeline && typeof window.atlasArTryonPipeline.render === 'function') {
                try {
                  var ok = window.atlasArTryonPipeline.render({
                    ctx: ctx,
                    canvas: ui.canvas,
                    video: ui.video,
                    landmarks: lastLandmarks,
                    facialMatrix: lastFacialMatrix,
                    anchor: anchor,
                    sprite: overlaySprite,
                    productId: productId,
                    mode: mode,
                    accessory: accessory,
                    glbSrc: glbSrc
                  });
                  renderedByPro = ok !== false;
                } catch (e) {
                  console.warn('[AtlasAR] Pro render hook failed; falling back to 2D.', e);
                }
              }
              if (!renderedByPro && anchor && overlaySprite) {
                // Mirror anchor x because we drew video mirrored.
                var ax = ui.canvas.width - anchor.x;
                var w = anchor.width;
                var h = w * (overlaySprite.height / overlaySprite.width);
                ctx.save();
                ctx.translate(ax, anchor.y);
                ctx.rotate(-anchor.rotation);
                ctx.drawImage(overlaySprite, -w / 2, -h / 2, w, h);
                ctx.restore();
              }
            }

            // Send next frame to worker if it's idle and ready.
            if (workerReady && !detectInflight && ui.video.readyState >= 2) {
              detectInflight = true;
              createImageBitmap(ui.video).then(function (bitmap) {
                worker.postMessage({
                  type: 'detect',
                  bitmap: bitmap,
                  ts: performance.now()
                }, [bitmap]);
              })["catch"](function () {
                detectInflight = false;
              });
            }
            frames += 1;
            var now = performance.now();
            if (now - lastFpsAt >= 1000) {
              ui.setFps(Math.round(frames * 1000 / (now - lastFpsAt)));
              frames = 0;
              lastFpsAt = now;
            }
            requestAnimationFrame(tick);
          };
          productId = _ref.productId, mode = _ref.mode, glbSrc = _ref.glbSrc, config = _ref.config, onClose = _ref.onClose;
          ui = (0,_tryon_ui_js__WEBPACK_IMPORTED_MODULE_0__.createUI)({
            config: config,
            productId: productId
          });
          document.body.appendChild(ui.root);
          ui.canvas.width = VIDEO_WIDTH;
          ui.canvas.height = VIDEO_HEIGHT;
          accessory = (0,_tryon_anchors_js__WEBPACK_IMPORTED_MODULE_1__.detectAccessoryFromMode)(mode);
          _context2.next = 9;
          return ui.askConsent();
        case 9:
          granted = _context2.sent;
          if (granted) {
            _context2.next = 13;
            break;
          }
          ui.close();
          return _context2.abrupt("return", null);
        case 13:
          _context2.prev = 13;
          _context2.next = 16;
          return navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: {
                ideal: VIDEO_WIDTH
              },
              height: {
                ideal: VIDEO_HEIGHT
              }
            },
            audio: false
          });
        case 16:
          stream = _context2.sent;
          _context2.next = 24;
          break;
        case 19:
          _context2.prev = 19;
          _context2.t0 = _context2["catch"](13);
          ui.showError('Camera permission denied. Please grant access to use Try It On.');
          console.error('[AtlasAR] getUserMedia failed:', _context2.t0);
          return _context2.abrupt("return", null);
        case 24:
          ui.video.srcObject = stream;
          _context2.next = 27;
          return ui.video.play();
        case 27:
          ui.showStage();
          ui.setStatus('Loading face model…');
          _context2.next = 31;
          return captureProductSprite(productId, glbSrc);
        case 31:
          overlaySprite = _context2.sent;
          if (!overlaySprite) {
            ui.setStatus('No 3D model found on page');
          } else {
            // Expose for debugging.
            window.__tryon_debug = window.__tryon_debug || {};
            window.__tryon_debug.sprite = overlaySprite;
            window.__tryon_debug.mode = mode;
          }
          worker = new Worker(new URL(/* webpackChunkName: "tryon-face-worker" */
          /* worker import */ __webpack_require__.p + __webpack_require__.u("tryon-face-worker"), __webpack_require__.b), {
            type: undefined
          });
          worker.postMessage({
            type: 'init',
            modelUrl: config.models && config.models.face,
            wasmBase: config.models && config.models.wasm_base,
            options: config.worker_options && _typeof(config.worker_options) === 'object' ? config.worker_options : {}
          });
          lastLandmarks = null;
          lastFacialMatrix = null;
          detectInflight = false;
          frames = 0;
          lastFpsAt = performance.now();
          running = true;
          workerReady = false;
          worker.onmessage = function (ev) {
            var msg = ev.data || {};
            if (msg.type === 'boot') {
              ui.setStatus('Worker booted, loading face model…');
            } else if (msg.type === 'ready') {
              workerReady = true;
              ui.setStatus('');
            } else if (msg.type === 'result') {
              lastLandmarks = msg.landmarks;
              lastFacialMatrix = msg.facialMatrix || null;
              detectInflight = false;
              // Lightweight debug snapshot — no per-frame console spam.
              window.__tryon_debug = window.__tryon_debug || {};
              window.__tryon_debug.landmarks = msg.landmarks;
              window.__tryon_debug.facialMatrix = lastFacialMatrix;
              window.__tryon_debug.lastResultAt = Date.now();
            } else if (msg.type === 'error') {
              ui.showError(msg.message || 'Face tracker failed');
              console.error('[AtlasAR Try-On worker error]', msg.message);
              running = false;
            }
          };
          worker.onerror = function (e) {
            console.error('[AtlasAR Try-On worker.onerror]', e.message, e.filename, e.lineno);
            ui.showError('Worker error: ' + e.message);
          };
          ctx = ui.canvas.getContext('2d');
          requestAnimationFrame(tick);
          ui.onSnapshot = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            var dataUrl, a;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  dataUrl = buildSnapshotDataUrl(ui.canvas, !!config.watermark); // Direct download.
                  a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = "tryon-".concat(productId, "-").concat(Date.now(), ".png");
                  document.body.appendChild(a);
                  a.click();
                  a.remove();

                  // Optional: persist to media library if logged in.
                  if (!(config.rest_url && config.rest_nonce)) {
                    _context.next = 16;
                    break;
                  }
                  _context.prev = 8;
                  _context.next = 11;
                  return fetch("".concat(config.rest_url, "/tryon/snapshot"), {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-WP-Nonce': config.rest_nonce
                    },
                    body: JSON.stringify({
                      image: dataUrl,
                      product_id: productId
                    })
                  });
                case 11:
                  _context.next = 16;
                  break;
                case 13:
                  _context.prev = 13;
                  _context.t0 = _context["catch"](8);
                  console.warn('[AtlasAR] Snapshot upload failed:', _context.t0);
                case 16:
                case "end":
                  return _context.stop();
              }
            }, _callee, null, [[8, 13]]);
          }));
          ui.onClose = function () {
            running = false;
            stream.getTracks().forEach(function (t) {
              return t.stop();
            });
            worker.postMessage({
              type: 'dispose'
            });
            worker.terminate();
            if (typeof onClose === 'function') onClose();
          };
          return _context2.abrupt("return", ui);
        case 49:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[13, 19]]);
  }));
  return _startTryOn.apply(this, arguments);
}
function buildSnapshotDataUrl(srcCanvas, watermark) {
  if (!watermark) {
    return srcCanvas.toDataURL('image/png');
  }
  var out = document.createElement('canvas');
  out.width = srcCanvas.width;
  out.height = srcCanvas.height;
  var ctx = out.getContext('2d');
  if (!ctx) return srcCanvas.toDataURL('image/png');
  ctx.drawImage(srcCanvas, 0, 0);
  var text = 'Powered by AtlasAR';
  var fontSize = Math.max(11, Math.round(out.width * 0.022));
  ctx.font = "600 ".concat(fontSize, "px system-ui, -apple-system, Segoe UI, sans-serif");
  var padX = 10,
    padY = 6;
  var textWidth = ctx.measureText(text).width;
  var boxW = textWidth + padX * 2;
  var boxH = fontSize + padY * 2;
  var x = out.width - boxW - 10;
  var y = out.height - boxH - 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  var r = 8;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxW - r, y);
  ctx.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
  ctx.lineTo(x + boxW, y + boxH - r);
  ctx.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
  ctx.lineTo(x + r, y + boxH);
  ctx.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + boxH / 2);
  return out.toDataURL('image/png');
}

/**
 * Ensure the <model-viewer> custom element is registered. The plugin lazy-
 * loads google-model-viewer.js when an on-page mv enters viewport, but in
 * the try-on flow the on-page viewer is often hidden behind a toggle so the
 * lazy-loader never fires. We force-load the module ourselves.
 */
function ensureModelViewerLoaded() {
  return _ensureModelViewerLoaded.apply(this, arguments);
}
/**
 * Render the product GLB to a sprite via a transient off-screen <model-viewer>.
 *
 * The on-page model-viewer is often lazy-loaded, hidden behind a toggle, or
 * angled to a non-front pose — none of which gives a usable try-on sprite.
 * We read its `src`, build a temporary off-screen instance forced to a
 * front-facing camera-orbit, await load, then snapshot.
 */
function _ensureModelViewerLoaded() {
  _ensureModelViewerLoaded = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    var cfg, base, src;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          if (!(window.customElements && window.customElements.get('model-viewer'))) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", true);
        case 2:
          cfg = window.atlas_ar_tryon || {};
          base = cfg.plugin_url || '/';
          src = "".concat(base, "public/js/google-model-viewer.js");
          _context3.next = 7;
          return new Promise(function (resolve, reject) {
            var existing = document.querySelector("script[src=\"".concat(src, "\"]"));
            if (existing) {
              existing.addEventListener('load', resolve, {
                once: true
              });
              existing.addEventListener('error', reject, {
                once: true
              });
              return;
            }
            var s = document.createElement('script');
            s.type = 'module';
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        case 7:
          if (!window.customElements) {
            _context3.next = 10;
            break;
          }
          _context3.next = 10;
          return window.customElements.whenDefined('model-viewer');
        case 10:
          return _context3.abrupt("return", true);
        case 11:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _ensureModelViewerLoaded.apply(this, arguments);
}
function captureProductSprite(_x2, _x3) {
  return _captureProductSprite.apply(this, arguments);
}
function _captureProductSprite() {
  _captureProductSprite = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4(productId, explicitSrc) {
    var src, candidates, source, off, loaded, blob;
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          src = '';
          if (explicitSrc && typeof explicitSrc === 'string') {
            src = explicitSrc;
          }
          if (!src) {
            candidates = [document.querySelector("model-viewer[data-product-id=\"".concat(productId, "\"]")), document.querySelector("model-viewer[product-id=\"".concat(productId, "\"]")), document.querySelector('model-viewer.atlas_ar_model_viewer'), document.querySelector('model-viewer')].filter(Boolean);
            source = candidates[0];
            if (source) src = source.getAttribute('src') || '';
          }
          if (src) {
            _context4.next = 5;
            break;
          }
          return _context4.abrupt("return", null);
        case 5:
          _context4.prev = 5;
          _context4.next = 8;
          return ensureModelViewerLoaded();
        case 8:
          _context4.next = 14;
          break;
        case 10:
          _context4.prev = 10;
          _context4.t0 = _context4["catch"](5);
          console.warn('[AtlasAR] model-viewer module failed to load', _context4.t0);
          return _context4.abrupt("return", null);
        case 14:
          off = document.createElement('model-viewer'); // MUST be in viewport AND non-transparent for model-viewer to render frames.
          // clip-path hides visually while leaving the element paintable.
          off.style.cssText = ['position:fixed', 'top:0', 'right:0', 'width:512px', 'height:512px', 'clip-path:inset(0 0 100% 100%)', 'pointer-events:none', 'z-index:1'].join(';');
          off.setAttribute('src', src);
          off.setAttribute('camera-orbit', '0deg 90deg auto');
          off.setAttribute('exposure', '1');
          off.setAttribute('shadow-intensity', '0');
          off.setAttribute('environment-image', 'neutral');
          off.setAttribute('disable-zoom', '');
          off.setAttribute('loading', 'eager');
          off.setAttribute('reveal', 'auto');
          document.body.appendChild(off);
          _context4.next = 27;
          return new Promise(function (resolve) {
            var settled = false;
            var finish = function finish(ok) {
              if (settled) return;
              settled = true;
              resolve(ok);
            };
            off.addEventListener('load', function () {
              return finish(true);
            }, {
              once: true
            });
            off.addEventListener('error', function () {
              return finish(false);
            }, {
              once: true
            });
            setTimeout(function () {
              return finish(false);
            }, 10000);
          });
        case 27:
          loaded = _context4.sent;
          if (!(!loaded || typeof off.toBlob !== 'function')) {
            _context4.next = 32;
            break;
          }
          off.remove();
          console.warn('[AtlasAR] Snapshot model-viewer failed to load', src);
          return _context4.abrupt("return", null);
        case 32:
          _context4.next = 34;
          return new Promise(function (resolve) {
            return requestAnimationFrame(function () {
              return requestAnimationFrame(resolve);
            });
          });
        case 34:
          _context4.prev = 34;
          _context4.next = 37;
          return off.toBlob({
            mimeType: 'image/png',
            idealAspect: false
          });
        case 37:
          blob = _context4.sent;
          off.remove();
          if (blob) {
            _context4.next = 41;
            break;
          }
          return _context4.abrupt("return", null);
        case 41:
          _context4.next = 43;
          return createImageBitmap(blob);
        case 43:
          return _context4.abrupt("return", _context4.sent);
        case 46:
          _context4.prev = 46;
          _context4.t1 = _context4["catch"](34);
          off.remove();
          console.warn('[AtlasAR] Failed to snapshot model-viewer:', _context4.t1);
          return _context4.abrupt("return", null);
        case 51:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[5, 10], [34, 46]]);
  }));
  return _captureProductSprite.apply(this, arguments);
}

/***/ }),

/***/ "./public/js/tryon/tryon-ui.js":
/*!*************************************!*\
  !*** ./public/js/tryon/tryon-ui.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createUI: () => (/* binding */ createUI)
/* harmony export */ });
/**
 * Try-On modal UI. Pure DOM, no React. Handles consent gate,
 * webcam preview, snapshot, error states, close.
 *
 * Returns a controller-friendly handle that the controller wires up.
 */

function createUI(_ref) {
  var config = _ref.config,
    productId = _ref.productId;
  var root = document.createElement('div');
  root.className = 'art-tryon-modal';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = "\n\t\t<div class=\"art-tryon-backdrop\" data-action=\"close\"></div>\n\t\t<div class=\"art-tryon-panel\">\n\t\t\t<button class=\"art-tryon-close\" type=\"button\" data-action=\"close\" aria-label=\"Close try-on\">&times;</button>\n\t\t\t<div class=\"art-tryon-stage\">\n\t\t\t\t<video class=\"art-tryon-video\" autoplay playsinline muted></video>\n\t\t\t\t<canvas class=\"art-tryon-canvas\"></canvas>\n\t\t\t\t<div class=\"art-tryon-status\" aria-live=\"polite\">Loading\u2026</div>\n\t\t\t</div>\n\t\t\t<div class=\"art-tryon-consent\">\n\t\t\t\t<h3>Try it on yourself</h3>\n\t\t\t\t<p class=\"art-tryon-consent-text\">".concat(escapeHtml(config.consent_text || 'Allow camera access to try this on virtually. Video stays on your device.'), "</p>\n\t\t\t\t<button type=\"button\" class=\"art-tryon-consent-allow button button-primary\">Allow camera</button>\n\t\t\t\t<button type=\"button\" class=\"art-tryon-consent-deny button\" data-action=\"close\">Cancel</button>\n\t\t\t</div>\n\t\t\t<div class=\"art-tryon-toolbar\" hidden>\n\t\t\t\t<button type=\"button\" class=\"art-tryon-snapshot button button-primary\" ").concat(config.snapshot ? '' : 'hidden', ">Snapshot</button>\n\t\t\t\t<span class=\"art-tryon-fps\"></span>\n\t\t\t</div>\n\t\t\t<div class=\"art-tryon-error\" hidden></div>\n\t\t</div>\n\t");
  var video = root.querySelector('.art-tryon-video');
  var canvas = root.querySelector('.art-tryon-canvas');
  var statusEl = root.querySelector('.art-tryon-status');
  var consentEl = root.querySelector('.art-tryon-consent');
  var toolbar = root.querySelector('.art-tryon-toolbar');
  var errorEl = root.querySelector('.art-tryon-error');
  var snapshotBtn = root.querySelector('.art-tryon-snapshot');
  var allowBtn = root.querySelector('.art-tryon-consent-allow');
  var fpsEl = root.querySelector('.art-tryon-fps');
  var isOpen = true;
  var onCloseCb = null;
  var onSnapshotCb = null;
  var consentResolve = null;
  root.addEventListener('click', function (e) {
    var action = e.target.dataset && e.target.dataset.action;
    if (action === 'close') close();
  });
  allowBtn.addEventListener('click', function () {
    if (consentResolve) consentResolve(true);
  });
  snapshotBtn.addEventListener('click', function () {
    if (onSnapshotCb) onSnapshotCb();
  });
  document.addEventListener('keydown', escHandler);
  function escHandler(e) {
    if (e.key === 'Escape' && isOpen) close();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('keydown', escHandler);
    root.remove();
    if (onCloseCb) onCloseCb();
  }
  function setStatus(text) {
    statusEl.textContent = text || '';
    statusEl.hidden = !text;
  }
  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function showStage() {
    consentEl.hidden = true;
    toolbar.hidden = false;
  }
  function askConsent() {
    return new Promise(function (resolve) {
      consentResolve = resolve;
    });
  }
  function setFps(fps) {
    fpsEl.textContent = fps ? "".concat(fps, " fps") : '';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }
  return {
    root: root,
    video: video,
    canvas: canvas,
    productId: productId,
    get isOpen() {
      return isOpen;
    },
    setStatus: setStatus,
    showError: showError,
    showStage: showStage,
    askConsent: askConsent,
    setFps: setFps,
    close: close,
    set onClose(fn) {
      onCloseCb = fn;
    },
    set onSnapshot(fn) {
      onSnapshotCb = fn;
    }
  };
}

/***/ })

}]);