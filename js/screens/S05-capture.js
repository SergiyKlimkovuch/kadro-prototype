/**
 * S05 Session capture - DEV-DOC "### S05 Session capture", PRD FR-4.1-4.5, скріни 34, 35.
 * Тип modal, тема темна (CLAUDE.md 1.8). Таймер - js/session.js (performance.now, плановий час кадру).
 *
 * Композиція (скріни 34/35, виміри - у components.css / screens.css з [approx]):
 *   ProgressPanel на всю ширину: mono-тег зліва, лічильник "4 / 20" справа, цифра відліку 96 по центру;
 *   біла заливка росте зліва направо за час до кадру, текст над нею інвертується (mix-blend difference).
 *   Зменшений Viewfinder (той самий .vf, що S04: потік камери / заглушка, Look-фільтр, слот pose guide).
 *   Нижній ряд з трьох рівних колонок: ShotThumb · StopButton · кількість знятих (0 - порожньо).
 *   Кадр: білий спалах 120 мс (settings.flashBeforeShot), мініатюра летить з видошукача в куток 400 мс.
 *
 * Параметри (?debug=1 і рендер):
 *   delay=3&count=5&interval=1      - живий запуск з цими значеннями (інакше state.session = Capture defaults або налаштована сесія)
 *   frame=<с до кадру>&shot=<№ наступного кадру, з 1>[&count&interval|delay]
 *                                   - статичний кадр без таймера (детермінований PNG); знятих = shot - 1
 *   state=paused                    - статичний стан паузи (open-questions #37); з frame - на тому ж кадрі
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import * as session from '../session.js';
import * as camera from '../camera.js';
import { icon } from '../icons.js';
import { h, esc } from '../ui.js';
import { reducedMotion, cssMs } from '../router.js';
import { looks as looksData, focalLengths } from '../data.js';

const t = copy.S05;
const a = copy.S05.a11y;
const BIG_FROM = 3;           // #49: = BEAT_FROM у session.js
const LIVE_COUNTDOWN_MIN = 4; // озвучувати 3-2-1 лише коли відлік >= 4 с, інакше черга VoiceOver не встигає за кадрами

/* ---------- параметри ---------- */

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

function sessionValues(state, params) {
  const s = state.session; // налаштована сесія або Capture defaults (S04: старт без налаштувань)
  return {
    delay: num(params.delay) ?? s.delay,
    count: num(params.count) ?? s.count,
    interval: num(params.interval) ?? s.interval,
  };
}

/** Статичний знімок стану для debug/рендеру - або null (живий режим) */
function staticSnapshot(state, params) {
  const paused = params.state === 'paused';
  if (params.frame == null && !paused) return null;
  const v = sessionValues(state, params);
  const shot = Math.min(v.count, Math.max(1, num(params.shot) ?? 1));
  const shotIndex = shot - 1;
  const span = (shotIndex === 0 ? v.delay : v.interval) * 1000;
  const left = (num(params.frame) ?? Math.max(1, Math.ceil((span / 1000) * 0.6))) * 1000;
  return {
    phase: paused ? 'paused' : 'countdown',
    shotIndex,
    count: v.count,
    first: shotIndex === 0,
    left,
    secondsLeft: Math.max(1, Math.ceil(left / 1000)),
    progress: span > 0 ? Math.min(1, Math.max(0, 1 - left / span)) : 1,
    photos: [],
  };
}

/* ---------- розмітка ---------- */

function skeleton() {
  return `
  <section class="cap" data-theme="dark" data-phase="countdown" aria-label="${esc(copy.screens.S05)}">
    <header class="progress-panel cap__panel">
      <div class="progress-panel__fill" data-bind="fill" aria-hidden="true"></div>
      <div class="progress-panel__ink">
        <div class="cap__meta">
          <p class="cap__tag t-mono-caption" data-bind="tag"></p>
          <p class="cap__counter t-mono-caption"><span aria-hidden="true" data-bind="counter"></span><span class="sr-only" data-bind="counter-sr"></span></p>
        </div>
        <p class="countdown cap__countdown" aria-hidden="true"><span class="countdown__digit t-countdown" data-bind="digit"></span></p>
      </div>
    </header>

    <div class="cap__stage">
      <div class="vf vf--capture" data-theme="dark">
        <div class="vf__clip">
          <div class="vf__media" data-photo-placeholder="camera-viewfinder">
            <video class="vf__video" playsinline muted autoplay></video>
          </div>
          <div class="vf__pose" data-slot="pose-guide"></div>
          <div class="vf__notice" data-bind="notice">
            <p class="vf__notice-text t-footnote">${esc(t.paused.message)}</p>
          </div>
        </div>
      </div>
    </div>

    <footer class="cap__bottom">
      <div class="cap__col"><div class="shot-thumb" role="img" data-bind="thumb"></div></div>
      <div class="cap__col"><button class="stop-btn" type="button" data-action="stop" aria-label="${esc(a.stop)}"><span class="stop-btn__square"></span></button></div>
      <div class="cap__col"><span class="cap__taken t-large-title" data-bind="taken" aria-hidden="true"></span></div>
    </footer>

    <div class="beat-pulse" aria-hidden="true"></div>
    <div class="capture-flash" aria-hidden="true"></div>
    <p class="sr-only" aria-live="polite" data-bind="live"></p>
  </section>`;
}

/* ---------- малювання ---------- */

function q(el, sel) {
  return el.querySelector(sel);
}

function paintViewfinder(el, state) {
  const vf = q(el, '.vf');
  const cam = state.camera;
  const [w, hh] = cam.aspect.split(':').map(Number);
  vf.style.setProperty('--vf-r', String(w / hh));
  vf.style.setProperty('--vf-zoom', String(cam.focal / focalLengths[0]));
  vf.style.setProperty('--vf-mirror', cam.facing === 'front' ? '-1' : '1');
  vf.style.setProperty('--vf-exp', String(cam.exposure));
  const look = looksData.find((l) => l.id === state.lookId);
  vf.style.setProperty('--vf-look', look && look.filter !== 'none' ? look.filter : 'brightness(1)');
  vf.dataset.aspect = cam.aspect;
}

function paintCountdown(el, snap) {
  const ui = el._ui;
  const paused = snap.phase === 'paused';
  el.dataset.phase = paused ? 'paused' : 'countdown';
  el.dataset.big = String(snap.secondsLeft <= BIG_FROM); // #49: останні 3 с - цифра ≈ 160 pt
  const tag = paused ? t.paused.tag : (snap.first ? t.tagFirst : t.tagNext);
  if (ui.sig.tag !== tag) { q(el, '[data-bind="tag"]').textContent = tag; ui.sig.tag = tag; }
  const n = Math.min(snap.shotIndex + 1, snap.count);
  const counterSig = `${n}/${snap.count}`;
  if (ui.sig.counter !== counterSig) {
    q(el, '[data-bind="counter"]').textContent = t.counter(n, snap.count);
    q(el, '[data-bind="counter-sr"]').textContent = a.counter(n, snap.count); // озвучка в sr-only, не aria-label на <p> (#52)
    ui.sig.counter = counterSig;
  }
  if (ui.sig.digit !== snap.secondsLeft) {
    q(el, '[data-bind="digit"]').textContent = String(snap.secondsLeft);
    ui.sig.digit = snap.secondsLeft;
  }
  // ProgressBar: лише transform (DEV-DOC "Анімації"), оновлення щокадрово без transition
  q(el, '[data-bind="fill"]').style.transform = `scaleX(${snap.progress})`;
}

function paintThumb(el, photos) {
  const thumb = q(el, '[data-bind="thumb"]');
  const last = photos[photos.length - 1];
  const src = last ? last.src : '';
  if (el._ui.sig.thumb !== src) {
    thumb.innerHTML = src ? `<img class="shot-thumb__img" src="${src}" alt="">` : icon('photo', 'outline', { className: 'icon--sm' });
    thumb.classList.toggle('is-empty', !src);
    el._ui.sig.thumb = src;
  }
  thumb.setAttribute('aria-label', a.thumbnail(photos.length));
  q(el, '[data-bind="taken"]').textContent = photos.length ? t.takenCount(photos.length) : '';
}

function announce(el, text) {
  const live = q(el, '[data-bind="live"]');
  live.textContent = '';
  // повторний однаковий текст теж має прозвучати
  requestAnimationFrame(() => { live.textContent = text; });
}

/* ---------- момент кадру ---------- */

/** Крива з tokens.css (WAAPI не читає var(), тому беремо обчислене значення) */
const curve = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

/** Пульсація 3-2-1 (#49): цифра scale base -> base x 1.15 -> base + біле кільце/заливка на весь екран. Завжди (#39). */
function pulse(el) {
  const digit = q(el, '[data-bind="digit"]');
  const beat = q(el, '.beat-pulse');
  if (reducedMotion()) {
    // без руху: цифра статично збільшена (CSS), кільце - fade 150 мс
    beat.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: cssMs('--dur-reduced'), easing: curve(el, '--ease-out') });
    return;
  }
  const s = parseFloat(curve(el, '--pulse-scale'));
  const base = el.dataset.big === 'true' ? parseFloat(curve(el, '--countdown-big-scale')) : 1;
  digit.animate(
    [{ transform: `scale(${base})` }, { transform: `scale(${base * s})` }, { transform: `scale(${base})` }],
    { duration: cssMs('--dur-pulse'), easing: curve(el, '--ease-out') },
  );
  beat.animate([{ opacity: 1 }, { opacity: 0 }], { duration: cssMs('--dur-beat'), easing: curve(el, '--ease-out') });
}

function flash(el) {
  if (!store.get().settings.flashBeforeShot) return;
  const f = q(el, '.capture-flash');
  // 120 мс: одразу білий, згасання opacity (DEV-DOC "Кадр")
  f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: cssMs('--dur-flash'), easing: curve(el, '--ease-out') });
}

/** Мініатюра "влітає" з видошукача в куток (FLIP: елемент у кінцевій позиції, старт - трансформ з рамки видошукача) */
function flyThumb(el, photo, photos) {
  const ui = el._ui;
  if (reducedMotion()) {
    paintThumb(el, photos);
    const img = q(el, '.shot-thumb__img');
    img?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: cssMs('--dur-reduced'), easing: curve(el, '--ease-out') });
    return;
  }
  const root = el.getBoundingClientRect();
  const from = q(el, '.vf').getBoundingClientRect();
  const to = q(el, '[data-bind="thumb"]').getBoundingClientRect();
  const fly = h(`<img class="shot-thumb shot-thumb--fly" src="${photo.src}" alt="" aria-hidden="true">`);
  fly.style.left = `${to.left - root.left}px`;
  fly.style.top = `${to.top - root.top}px`;
  el.append(fly);
  const s = Math.min(from.width / to.width, from.height / to.height); // квадрат-копія стартує всередині рамки видошукача
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const anim = fly.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }],
    { duration: cssMs('--dur-thumb-fly'), easing: curve(el, '--ease-ios') },
  );
  ui.flying = (ui.flying || 0) + 1;
  anim.finished.catch(() => {}).then(() => {
    ui.flying--;
    paintThumb(el, photos);
    fly.remove();
  });
}

/* ---------- події сесії ---------- */

function onSession(el, ctx, ev) {
  const ui = el._ui;
  if (!el.isConnected && ui.mounted) { ui.unsub?.(); return; } // екран прибрано (debug jump) - сесія сама зупиниться через isAlive
  const snap = ev.run;
  switch (ev.type) {
    case 'start':
      paintCountdown(el, snap);
      announce(el, a.countdownStart(snap.secondsLeft, snap.first));
      break;
    case 'frame':
      paintCountdown(el, snap);
      break;
    case 'second':
      if (ev.firstOfSpan && !snap.first && snap.left / 1000 >= LIVE_COUNTDOWN_MIN) {
        announce(el, a.countdownStart(snap.secondsLeft, false));
      }
      break;
    case 'beat': {
      pulse(el);
      const span = snap.first ? snap.delay : snap.interval;
      if (span >= LIVE_COUNTDOWN_MIN) announce(el, a.countdown(ev.seconds));
      break;
    }
    case 'shot':
      flash(el);
      flyThumb(el, ev.photo, snap.photos);
      if (!ui.flying) paintThumb(el, snap.photos);
      q(el, '[data-bind="taken"]').textContent = t.takenCount(snap.photos.length); // лічильник +1 одразу
      paintCountdown(el, snap);
      announce(el, a.shotTaken(ev.index, snap.count));
      break;
    case 'pause':
      paintCountdown(el, snap);
      announce(el, a.paused);
      break;
    case 'pause-visible':
      paintCountdown(el, snap);
      break;
    case 'resume':
      paintCountdown(el, snap);
      announce(el, a.resumed);
      break;
    case 'finish':
      if (ui.closing) break; // шар закривається роутером (onClose)
      ui.unsub?.();
      ui.finished = true;
      announce(el, a.finished);
      // Stop або останній кадр -> S06; Stop при 0 кадрів -> S04 без Review (DEV-DOC S05)
      if (ev.session) ctx.router.replace('S06');
      else ctx.router.back();
      break;
    default: break;
  }
}

/* ---------- камера в зменшеному видошукачі ---------- */

function attachStream(el) {
  const ui = el._ui;
  const media = q(el, '.vf__media');
  const ok = camera.mirror(q(el, '.vf__video'));
  media.classList.toggle('has-stream', ok);
  // S04 під модалкою отримує потік асинхронно (відкриття за URL) - дочекатись, без нового getUserMedia
  if (!ok && store.get().permissions.camera === 'granted' && ui.streamTries < 20 && !ui.finished) {
    ui.streamTries++;
    setTimeout(() => { if (el.isConnected || !ui.mounted) attachStream(el); }, 250);
  }
}

/* ---------- контракт модуля ---------- */

export function render(state, ctx) {
  const el = h(skeleton());
  el._ui = { sig: {}, mounted: false, finished: false, flying: 0, streamTries: 0, unsub: null };
  const ui = el._ui;
  paintViewfinder(el, state);

  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || target.getAttribute('aria-disabled') === 'true') return;
    if (target.dataset.action === 'stop') {
      if (ui.static) { ctx.router.back(); return; }
      session.stop();
    }
  });

  const snap = staticSnapshot(state, ctx.params);
  if (snap) {
    // debug / рендер: детермінований стан без таймера; знятих = shot - 1 (заглушки-кадри)
    ui.static = true;
    paintCountdown(el, snap);
    q(el, '.beat-pulse').classList.toggle('is-static', snap.phase !== 'paused' && snap.secondsLeft <= BIG_FROM); // детермінований пік пульсації для PNG
    paintThumb(el, []);
    const mount = () => {
      if (!el.isConnected) { requestAnimationFrame(mount); return; }
      ui.mounted = true;
      // токени теми для заглушки-кадру читаються лише з елемента в DOM
      const photos = Array.from({ length: snap.shotIndex }, (_, i) => ({ id: `debug${i}`, src: camera.capture({ aspect: state.camera.aspect, styleSource: el }) }));
      paintThumb(el, photos);
      q(el, '[data-bind="taken"]').textContent = photos.length ? t.takenCount(photos.length) : '';
      attachStream(el);
    };
    requestAnimationFrame(mount);
    return el;
  }

  const v = sessionValues(state, ctx.params);
  paintCountdown(el, { phase: 'countdown', shotIndex: 0, count: v.count, first: true, secondsLeft: Math.max(1, Math.ceil(v.delay)), progress: 0 });
  paintThumb(el, []);
  ui.unsub = session.subscribe((ev) => onSession(el, ctx, ev));

  // старт - коли модалка в DOM (render викликається до вставки шару)
  const begin = () => {
    if (ui.finished) return;
    if (!el.isConnected) { requestAnimationFrame(begin); return; }
    ui.mounted = true;
    attachStream(el);
    session.start(v, { styleSource: el, isAlive: () => el.isConnected });
  };
  requestAnimationFrame(begin);
  return el;
}

export function update(el, state) {
  paintViewfinder(el, state);
}

/**
 * #51: Back (роутер) / browser back / debug jump під час живої сесії = Stop (FR-4.4); edge-swipe на модалці не застосовується.
 * Зняті кадри зберігаються у state.sessions (session.stop). Back з кадрами -> роутер відкриває S06
 * поверх S04; 0 кадрів -> лишається S04. Debug jump: сесія зберігається, навігацію визначає jump.
 */
export function onClose(el, ctx, reason) {
  const ui = el._ui;
  if (!ui || ui.static || ui.finished) return null;
  ui.closing = true;
  ui.unsub?.();
  const taken = session.snapshot()?.photos.length || 0;
  if (session.isRunning()) session.stop(); else session.abort();
  return reason === 'back' && taken ? { open: 'S06' } : null;
}
