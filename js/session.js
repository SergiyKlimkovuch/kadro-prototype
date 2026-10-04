/**
 * session.js - таймер сесії зйомки (DEV-DOC "### Таймер сесії (session.js)", PRD FR-4.1-4.5).
 *
 * Час рахується від performance.now(), а не сумою setTimeout: наступний кадр = ПЛАНОВИЙ час
 * попереднього + interval (run.nextShotAt += interval), тож затримка rAF чи capture не накопичується
 * (PRD: відхилення <= 150 мс; DoD: 20 кадрів x 2 с = delay + 38 с ± 0.5 с).
 *
 * phase: 'countdown' -> (кадр) -> 'countdown' ... -> 'done' | 'stopped'; 'paused' - вкладка прихована (FR-4.5).
 * Модуль не знає про DOM екрана: S05 підписується на події (subscribe) і сам малює й навігує.
 * Події: start, frame (кожен rAF: left, progress), second (змінилась цифра), beat (3-2-1),
 *        shot, pause, pause-visible, resume, finish.
 * Store: state.run дзеркалить фазу, номер кадру і кадри (оновлюється на кадр/фазу, не щокадрово);
 *        по завершенню - запис у state.sessions (DEV-DOC "Модель стану").
 */

import * as store from './state.js';
import * as camera from './camera.js';
import { haptic } from './haptic.js';
import { looks, focalLengths } from './data.js';

/* DEV-DOC "Що імітуємо": "Звук відліку - Web Audio, короткий тік 880 Hz" */
const BEEP_HZ = 880;
const BEEP_MS = 70;           // [approx] "короткий тік"
const BEEP_GAIN = 0.25;       // [approx]
const BEAT_FROM = 3;          // FR-4.3: тік і пульсація за 3, 2, 1 с до кадру
/* open-questions #37 (рішення білду): пауза < 1 с (шторка сповіщень) - продовжуємо одразу, стан не показуємо;
   >= 1 с - після повернення 1 с видно "Paused", потім таймер іде далі з того самого місця */
const PAUSE_SHOW_AFTER = 1000;
const PAUSE_HOLD = 1000;
const EXPOSURE_RANGE = 0.5;   // = --exposure-range (tokens.css), brightness на .vf__media

const now = () => performance.now();

let run = null;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(type, extra = {}) {
  const snap = snapshot();
  listeners.forEach((fn) => fn({ type, run: snap, ...extra }));
}

/** Що бачить екран у цей момент */
export function snapshot() {
  if (!run) return null;
  const left = run.phase === 'paused' ? run.pausedLeft : run.nextShotAt - now();
  const span = (run.shotIndex === 0 ? run.delay : run.interval) * 1000;
  return {
    id: run.id,
    phase: run.phase,
    shotIndex: run.shotIndex,
    count: run.count,
    delay: run.delay,
    interval: run.interval,
    first: run.shotIndex === 0,
    left,
    secondsLeft: Math.max(1, Math.ceil(left / 1000)),
    progress: span > 0 ? Math.min(1, Math.max(0, 1 - left / span)) : 1,
    photos: run.photos,
    shotTimes: run.shotTimes,
    startedAt: run.startedAt,
    startedPerf: run.startedPerf,
  };
}

export function isRunning() {
  return Boolean(run) && (run.phase === 'countdown' || run.phase === 'paused');
}

/* ---------- store ---------- */

function publish() {
  store.set({
    run: run ? {
      id: run.id,
      phase: run.phase,
      shotIndex: run.shotIndex,
      count: run.count,
      delay: run.delay,
      interval: run.interval,
      photos: run.photos,
    } : null,
  });
}

/* ---------- звук (Web Audio) ---------- */

let audio = null;

let gestured = false; // AudioContext створюємо лише після жесту (інакше Chrome/Safari попереджають і не стартують)

function audioCtx() {
  if (audio) return audio;
  if (!gestured) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { audio = new AC(); } catch { audio = null; }
  return audio;
}

// iOS Safari відкриває звук лише всередині жесту: розблоковуємо контекст першим дотиком будь-де
// (тап на старт у S04 - теж жест, але S05 монтується вже після нього, асинхронно).
function unlockAudio() {
  gestured = true;
  const ctx = audioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}
window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

function beep() {
  if (!store.get().settings.countdownSound) return;
  const ctx = audioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const dur = BEEP_MS / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = BEEP_HZ;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(BEEP_GAIN, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* звук - необов'язковий шар */
  }
}

/* ---------- Keep screen awake (FR-4.5, settings.keepAwake) ---------- */

let wakeLock = null;
let lockPending = false; // запит у польоті: другий lock (resume) не створюємо

async function lockScreen() {
  if (!store.get().settings.keepAwake || wakeLock || lockPending) return;
  if (!(navigator.wakeLock && typeof navigator.wakeLock.request === 'function')) return;
  const owner = run;
  lockPending = true;
  try {
    const wl = await navigator.wakeLock.request('screen');
    // поки чекали, сесія могла завершитись / замінитись - тоді звільняємо одразу (#52)
    if (!run || run !== owner || !isRunning()) {
      try { wl.release?.(); } catch { /* вже звільнено */ }
      return;
    }
    wakeLock = wl;
    wl.addEventListener?.('release', () => { if (wakeLock === wl) wakeLock = null; });
  } catch {
    wakeLock = null; // немає дозволу / не HTTPS / вкладка прихована
  } finally {
    lockPending = false;
  }
}

function unlockScreen() {
  const wl = wakeLock;
  wakeLock = null;
  try { wl?.release?.(); } catch { /* вже звільнено */ }
}

/* ---------- кадр ---------- */

function captureFrame() {
  const s = store.get();
  const look = looks.find((l) => l.id === s.lookId);
  return camera.capture({
    aspect: s.camera.aspect,
    filter: look ? look.filter : 'none',
    zoom: s.camera.focal / focalLengths[0],
    mirror: s.camera.facing === 'front',
    exposure: s.camera.exposure,
    exposureRange: EXPOSURE_RANGE,
    styleSource: run?.styleSource,
  });
}

let photoSeq = 0;

function shoot() {
  const t = now();
  const photo = { id: `p${Date.now().toString(36)}${(photoSeq++).toString(36)}`, src: captureFrame() };
  run.photos = [...run.photos, photo];
  run.shotTimes.push(t);
  run.shotIndex++;
  if (store.get().settings.haptics) haptic('medium'); // DEV-DOC: medium - кадр
  const done = run.shotIndex >= run.count;
  if (!done) {
    run.nextShotAt += run.interval * 1000; // від планового часу, не від фактичного
    run.lastSec = null;
  }
  emit('shot', { photo, index: run.shotIndex });
  if (done) finish('done');
  else publish();
}

/* ---------- цикл ---------- */

function alive() {
  if (!run.isAlive) return true;
  const ok = run.isAlive();
  if (ok) run.wasAlive = true;
  return ok || !run.wasAlive; // до першого монтування елемент ще не в DOM
}

function loop() {
  run && (run.raf = 0);
  if (!run || run.phase !== 'countdown') return;
  if (!alive()) { abort(); return; }
  const left = run.nextShotAt - now();
  if (left <= 0) {
    shoot();
    if (!run || run.phase !== 'countdown') return;
  }
  const snap = snapshot();
  if (snap.secondsLeft !== run.lastSec) {
    const first = run.lastSec === null;
    run.lastSec = snap.secondsLeft;
    emit('second', { firstOfSpan: first });
    if (snap.secondsLeft <= BEAT_FROM) {
      beep();
      emit('beat', { seconds: snap.secondsLeft });
    }
  }
  emit('frame');
  run.raf = requestAnimationFrame(loop);
}

/**
 * start({ delay, count, interval }, { styleSource, isAlive })
 * styleSource - елемент з токенами теми (заглушка кадру); isAlive() - чи живий екран
 * (запасний захист: основний вихід - хук onClose екрана S05 у router.js; isAlive тихо зупиняє сесію, якщо шар зник іншим шляхом).
 */
export function start({ delay, count, interval }, { styleSource = null, isAlive = null } = {}) {
  abort();
  const s = store.get();
  const t0 = now();
  run = {
    id: `s${Date.now().toString(36)}`,
    startedAt: new Date().toISOString(),
    startedPerf: t0,
    lookId: s.lookId,
    phase: 'countdown',
    shotIndex: 0,
    delay: Number(delay),
    count: Math.max(1, Number(count)),
    interval: Number(interval),
    photos: [],
    shotTimes: [],
    nextShotAt: t0 + Number(delay) * 1000,
    lastSec: null,
    pausedLeft: 0,
    pausedAt: 0,
    autoPaused: false,
    styleSource,
    isAlive,
    wasAlive: false,
    raf: 0,
    resumeTimer: 0,
  };
  lockScreen();
  publish();
  emit('start');
  loop();
}

/** Picks (мок, DEV-DOC "Picks"): max(1, round(n / 10)) випадкових, без першого й останнього кадру */
function markPicks(photos) {
  const n = photos.length;
  if (!n) return [];
  const want = Math.max(1, Math.round(n / 10));
  let pool = photos.map((_, i) => i);
  if (n > 2) pool = pool.slice(1, -1);
  const chosen = new Set();
  while (chosen.size < Math.min(want, pool.length)) {
    chosen.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  // kept: null - ще не переглянуто в Review (S06 вирішує keep / drop)
  return photos.map((p, i) => ({ id: p.id, src: p.src, kept: null, pick: chosen.has(i), fav: false }));
}

function finish(reason) {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  clearTimeout(run.resumeTimer);
  run.phase = reason; // 'done' | 'stopped'
  unlockScreen();
  const finished = run;
  let session = null;
  if (finished.photos.length) {
    session = { id: finished.id, startedAt: finished.startedAt, lookId: finished.lookId, photos: markPicks(finished.photos) };
  }
  const snap = snapshot();
  run = null;
  const s = store.get();
  store.set({ run: null, ...(session ? { sessions: [...s.sessions, session] } : {}) });
  listeners.forEach((fn) => fn({ type: 'finish', reason, session, run: snap }));
}

/** Stop (FR-4.4): зняті кадри зберігаються -> екран веде в Review; 0 кадрів -> S04 */
export function stop() {
  if (!isRunning()) return;
  finish('stopped');
}

/** Тихе скасування без запису й навігації (екран зник, новий start) */
export function abort() {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  clearTimeout(run.resumeTimer);
  run = null;
  unlockScreen();
  store.set({ run: null }, { silent: true });
}

/* ---------- пауза (FR-4.5, open-questions #37) ---------- */

export function pause({ auto = false } = {}) {
  if (!run || run.phase !== 'countdown') return;
  cancelAnimationFrame(run.raf);
  run.pausedLeft = run.nextShotAt - now();
  run.pausedAt = now();
  run.autoPaused = auto;
  run.phase = 'paused';
  publish();
  emit('pause');
}

export function resume() {
  if (!run || run.phase !== 'paused') return;
  clearTimeout(run.resumeTimer);
  run.nextShotAt = now() + run.pausedLeft; // залишок до кадру не губиться, кадри не пропускаються
  run.phase = 'countdown';
  run.autoPaused = false;
  lockScreen(); // wake lock знімається системою, коли вкладка прихована
  publish();
  emit('resume');
  loop();
}

document.addEventListener('visibilitychange', () => {
  if (!run) return;
  if (document.visibilityState === 'hidden') {
    pause({ auto: true });
    return;
  }
  if (run.phase !== 'paused' || !run.autoPaused) return;
  const away = now() - run.pausedAt;
  if (away < PAUSE_SHOW_AFTER) {
    resume();
    return;
  }
  emit('pause-visible');
  run.resumeTimer = setTimeout(resume, PAUSE_HOLD);
});
