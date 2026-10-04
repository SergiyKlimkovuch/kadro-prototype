/**
 * S06 Review - DEV-DOC "### S06 Review", PRD FR-5.1, FR-5.2, скріни 36 (свайп), 37 (Drop).
 * Тип modal, тема темна (CLAUDE.md 1.8). Рішення пишуться в state.sessions[].photos[].kept через js/review.js.
 *
 * Композиція (скрін 36): розмита поточна картка як фон; зверху glass Skip · mono "N left" · біла Done;
 * стопка з 3 карток (зсув і поворот 2-4°); знизу підказка і ряд Drop · Undo · Keep.
 * Drop / Keep - a11y-альтернатива свайпам (PRD NFR, [+]); клавіатура: ←/→ = Drop/Keep, Backspace / Z = Undo.
 *
 * Жест (Pointer Events: миша й тач; skills swiftui-gestures + apple-design): hysteresis 10 px, картка йде за
 * пальцем з поворотом до 12°, напис Keep / Drop з непрозорістю за відстанню; поріг 35% ширини АБО швидкість
 * > 0.5 px/мс (DEV-DOC), інакше пружина назад (transition на transform). Вихід за край 280 мс, Undo 280 мс.
 *
 * Рішення відкритих питань: Skip лишає kept: null у нерозібраних кадрах (вже ухвалені рішення зберігаються) і веде в S08;
 * Done: нерозібрані = Keep -> S07; остання картка -> S07 (open-questions #40).
 *
 * Параметри (debug / рендер): seed=N[&picks&kept&favs&look] - demo-seed.js; drag=<0..1>&dir=keep|drop - статичний стан
 * "картка тягнеться на N% ширини" (детермінований PNG).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import * as review from '../review.js';
import { seedFromParams } from '../demo-seed.js';
import { h, esc } from '../ui.js';
import { reducedMotion, cssMs } from '../router.js';
import { reviewBar, reviewBackdrop, paintBackdrop, phAttr, badge, iconButton, button } from '../components.js';
import { haptic } from '../haptic.js';

const t = copy.S06;
const a = copy.S06.a11y;

/* Поведінка жесту - DEV-DOC S06 і "Анімації" (не візуальні значення, у tokens.css не живуть) */
const THRESHOLD = 0.35;    // частка ширини екрана
const VELOCITY = 0.5;      // px/мс
const MAX_ROTATION = 12;   // deg, "поворот до 12°"
const HYSTERESIS = 10;     // px, apple-design §10
const VELOCITY_WINDOW = 100; // мс, вікно вимірювання швидкості
const VISIBLE = 3;         // карток у стопці

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const curve = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

/* ---------- розмітка ---------- */

function cardHTML(photo, idx, total) {
  return `
    <div class="swipe-card" role="group" data-id="${esc(photo.id)}" aria-label="${esc(a.card(idx, total, photo.pick))}">
      <img class="swipe-card__img" src="${esc(photo.src)}" alt="" draggable="false"${phAttr(photo)}>
      ${photo.pick ? badge({ label: t.pickBadge, variant: 'plus', iconName: 'sparkles', className: 'swipe-card__badge' }) : ''}
      <span class="swipe-card__stamp swipe-card__stamp--keep" aria-hidden="true">${esc(t.keep)}</span>
      <span class="swipe-card__stamp swipe-card__stamp--drop" aria-hidden="true">${esc(t.drop)}</span>
    </div>`;
}

function skeleton(empty, count) {
  const body = empty
    ? `
      <div class="review__body review__empty" data-bind="body">
        <h2 class="t-title2">${esc(t.empty.title)}</h2>
        <p class="t-body review__empty-text">${esc(t.empty.message)}</p>
        ${button({ label: t.empty.action, variant: 'primary', action: 'back' })}
      </div>`
    : `
      ${reviewBar({ skipLabel: t.skip, skipAria: a.skip, doneLabel: t.done, doneHint: a.done, tag: t.left(count), tagBind: 'tag', idPrefix: 'rv' })}
      <div class="review__body" data-bind="body">
        <div class="rv__stack" data-bind="stack" aria-describedby="rv-gesture"></div>
        <p class="rv__hint t-mono-caption" aria-hidden="true">${esc(t.hint)}</p>
        <div class="rv__actions">
          ${iconButton({ name: 'x-mark', label: a.drop, className: 'icon-btn--lg icon-btn--drop', action: 'drop' })}
          ${iconButton({ name: 'arrow-uturn-left', label: a.undo, className: 'icon-btn--lg', action: 'undo' })}
          ${iconButton({ name: 'check', label: a.keep, className: 'icon-btn--lg icon-btn--keep', action: 'keep' })}
        </div>
      </div>
      <p class="sr-only" id="rv-gesture">${esc(a.gestureHint)}</p>`;
  return `
    <section class="review review--s06" data-theme="dark" data-state="${empty ? 'empty' : 'review'}" aria-label="${esc(copy.screens.S06)}">
      ${empty ? '' : reviewBackdrop()}
      ${body}
      <p class="sr-only" aria-live="polite" data-bind="live"></p>
    </section>`;
}

/* ---------- малювання ---------- */

const q = (el, sel) => el.querySelector(sel);

function announce(el, text) {
  const live = q(el, '[data-bind="live"]');
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = text; }); // однаковий текст підряд теж має прозвучати
}

function paintMeta(el, ui, animateBg) {
  q(el, '[data-bind="tag"]').textContent = t.left(ui.queue.length);
  paintBackdrop(q(el, '.review-bg'), ui.queue[0]?.src, animateBg, Boolean(ui.queue[0]?.ph));
  const undo = q(el, '[data-action="undo"]');
  if (review.canUndo(ui.sid)) undo.removeAttribute('aria-disabled'); else undo.setAttribute('aria-disabled', 'true');
}

/** Стопка: перші VISIBLE карток черги; depth = позиція (CSS переносить transform між depth через transition) */
function paintStack(el, ui, { fresh = false } = {}) {
  const stack = q(el, '[data-bind="stack"]');
  const want = ui.queue.slice(0, VISIBLE);
  for (const [id, card] of ui.cards) {
    if (!want.some((p) => p.id === id)) { card.remove(); ui.cards.delete(id); }
  }
  want.forEach((p, i) => {
    let card = ui.cards.get(p.id);
    if (!card) {
      card = h(cardHTML(p, ui.index.get(p.id), ui.total));
      ui.cards.set(p.id, card);
      stack.append(card);
      if (fresh && i === VISIBLE - 1 && !reducedMotion()) {
        card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: cssMs('--dur-swipe'), easing: curve(el, '--ease-out') });
      }
    }
    card.dataset.depth = String(i);
    card.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
  });
}

/* ---------- рішення ---------- */

function setStamps(card, dx, width) {
  const span = THRESHOLD * width - HYSTERESIS;
  const o = clamp((Math.abs(dx) - HYSTERESIS) / span, 0, 1);
  card.style.setProperty('--keep-o', dx > 0 ? String(o) : '0');
  card.style.setProperty('--drop-o', dx < 0 ? String(o) : '0');
}

function dragTo(card, dx, dy, width) {
  const rot = reducedMotion() ? 0 : MAX_ROTATION * clamp(dx / (width / 2), -1, 1);
  card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  setStamps(card, dx, width);
}

function springBack(card) {
  card.classList.remove('is-dragging');
  card.style.transform = '';
  card.style.removeProperty('--keep-o');
  card.style.removeProperty('--drop-o');
}

/** Картка вилітає за край (280 мс) і знімається; reduced motion - fade 150 мс без польоту */
function fly(el, card, dir) {
  const sign = dir === 'keep' ? 1 : -1;
  const width = el.clientWidth;
  card.style.setProperty(dir === 'keep' ? '--keep-o' : '--drop-o', '1');
  const from = getComputedStyle(card).transform;
  card.classList.remove('is-dragging');
  card.dataset.state = 'out';
  card.removeAttribute('data-depth');
  card.setAttribute('aria-hidden', 'true');
  let anim;
  if (reducedMotion()) {
    anim = card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: cssMs('--dur-swipe'), easing: curve(el, '--ease-out'), fill: 'forwards' });
  } else {
    card.style.transform = '';
    anim = card.animate(
      [{ transform: from }, { transform: `translate(${sign * width}px, 0) rotate(${sign * MAX_ROTATION}deg)` }],
      { duration: cssMs('--dur-swipe'), easing: curve(el, '--ease-ios'), fill: 'forwards' },
    );
  }
  anim.finished.then(() => card.remove(), () => card.remove());
}

function commit(el, ctx, ui, dir) {
  if (ui.done || !ui.queue.length) return;
  const photo = ui.queue.shift();
  const card = ui.cards.get(photo.id);
  ui.cards.delete(photo.id);
  review.decide(ui.sid, photo.id, dir === 'keep');
  haptic('medium'); // DEV-DOC: medium - Keep / Drop
  announce(el, dir === 'keep' ? a.kept(ui.index.get(photo.id)) : a.dropped(ui.index.get(photo.id)));
  if (card) fly(el, card, dir);
  paintStack(el, ui, { fresh: true });
  paintMeta(el, ui, true);
  if (!ui.queue.length) {
    // остання картка -> S07, коли вона вже вилетіла
    ui.leaveTimer = setTimeout(() => leave(el, ctx, ui, 'S07'), cssMs('--dur-swipe'));
  }
}

function undo(el, ui) {
  if (ui.done) return;
  clearTimeout(ui.leaveTimer);
  const r = review.undo(ui.sid);
  if (!r) return;
  const session = store.get().sessions.find((x) => x.id === ui.sid);
  ui.queue = review.pending(session);
  paintStack(el, ui);
  paintMeta(el, ui, true);
  announce(el, a.undone);
  const card = ui.cards.get(r.photo.id);
  if (!card) return;
  const sign = r.wasKept ? 1 : -1; // повертається з того боку, куди пішла
  if (reducedMotion()) {
    card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: cssMs('--dur-swipe'), easing: curve(el, '--ease-out') });
  } else {
    card.animate(
      [{ transform: `translate(${sign * el.clientWidth}px, 0) rotate(${sign * MAX_ROTATION}deg)` }, { transform: 'translate(0px, 0) rotate(0deg)' }],
      { duration: cssMs('--dur-swipe'), easing: curve(el, '--ease-ios') },
    );
  }
}

/** Вихід з екрана: listeners знімаються до replace, бо роутер не викликає onClose при replace */
function leave(el, ctx, ui, to) {
  if (ui.done) return;
  ui.done = true;
  ui.cleanup();
  ctx.router.replace(to);
}

/* ---------- жест ---------- */

function setupGesture(el, ctx, ui) {
  const onDown = (e) => {
    if (ui.done || !ui.queue.length || ui.drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;
    const card = ui.cards.get(ui.queue[0].id);
    if (!card) return;
    ui.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, started: false, samples: [], card, dx: 0 };
  };
  const onMove = (e) => {
    const d = ui.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < HYSTERESIS) return;
      d.started = true;
      d.x0 = e.clientX; // відлік від моменту, коли жест "почався": без стрибка картки
      d.y0 = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch { /* синтетичний pointer */ }
      d.card.classList.add('is-dragging');
    }
    d.dx = e.clientX - d.x0;
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    while (d.samples.length > 1 && e.timeStamp - d.samples[0].t > VELOCITY_WINDOW) d.samples.shift();
    dragTo(d.card, d.dx, e.clientY - d.y0, el.clientWidth);
  };
  const onUp = (e) => {
    const d = ui.drag;
    if (!d || e.pointerId !== d.id) return;
    ui.drag = null;
    if (!d.started) return;
    try { el.releasePointerCapture(e.pointerId); } catch { /* вже знято */ }
    const s = d.samples;
    const stale = s.length && e.timeStamp - s[s.length - 1].t > VELOCITY_WINDOW; // зупинився перед відпусканням - не fling
    const v = !stale && s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const byDistance = Math.abs(d.dx) > THRESHOLD * el.clientWidth;
    const byVelocity = Math.abs(v) > VELOCITY && (d.dx === 0 || Math.sign(v) === Math.sign(d.dx));
    if (e.type !== 'pointercancel' && (byDistance || byVelocity)) {
      commit(el, ctx, ui, (byDistance ? d.dx : v) > 0 ? 'keep' : 'drop');
    } else {
      springBack(d.card);
    }
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

/* ---------- контракт модуля ---------- */

export function render(state, ctx) {
  seedFromParams(ctx.params);
  const session = review.currentSession();
  const queue = review.pending(session);
  const empty = queue.length === 0;
  const el = h(skeleton(empty, queue.length));
  const ui = {
    sid: session?.id || null,
    total: session ? session.photos.length : 0,
    index: new Map(session ? session.photos.map((p, i) => [p.id, i + 1]) : []),
    queue, cards: new Map(), drag: null, done: false, mounted: false, leaveTimer: 0, cleanup: () => {},
  };
  el._ui = ui;

  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || target.getAttribute('aria-disabled') === 'true' || ui.done) return;
    switch (target.dataset.action) {
      case 'keep': commit(el, ctx, ui, 'keep'); break;
      case 'drop': commit(el, ctx, ui, 'drop'); break;
      case 'undo': undo(el, ui); break;
      case 'done':
        clearTimeout(ui.leaveTimer);
        review.keepRemaining(ui.sid); // нерозібрані = Keep
        leave(el, ctx, ui, 'S07');
        break;
      case 'skip': clearTimeout(ui.leaveTimer); leave(el, ctx, ui, 'S08'); break; // без відбору: kept лишається null
      case 'back': ctx.router.back(); break;
      default: break;
    }
  });

  if (empty) return el;

  paintStack(el, ui);
  paintMeta(el, ui, false);
  setupGesture(el, ctx, ui);

  // клавіатура: ←/→ = Drop/Keep, Backspace / Z = Undo. Listener на window - знімається при виході
  const onKey = (e) => {
    if (!el.isConnected) { if (ui.mounted) ui.cleanup(); return; }
    if (ui.done || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === 'arrowright') commit(el, ctx, ui, 'keep');
    else if (key === 'arrowleft') commit(el, ctx, ui, 'drop');
    else if (key === 'backspace' || key === 'z') undo(el, ui);
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  ui.cleanup = () => { window.removeEventListener('keydown', onKey); clearTimeout(ui.leaveTimer); ui.cleanup = () => {}; };

  let tries = 0;
  const mount = () => {
    if (ui.done) return;
    if (!el.isConnected) { if (tries++ < 120) requestAnimationFrame(mount); return; }
    ui.mounted = true;
    // debug: статичний стан "картка тягнеться" (drag=0.4&dir=keep)
    const p = parseFloat(ctx.params.drag);
    if (p > 0 && ui.queue.length) {
      const card = ui.cards.get(ui.queue[0].id);
      const sign = ctx.params.dir === 'drop' ? -1 : 1;
      card.classList.add('is-dragging');
      dragTo(card, sign * p * el.clientWidth, 0, el.clientWidth);
    }
  };
  requestAnimationFrame(mount);
  return el;
}

/** Екран малює себе сам (стан кадрів уже в DOM): store.set після кожного рішення не має перестворювати стопку */
export function update() {}

/** Back / debug jump: знімаємо window-listener (replace знімає його у leave()) */
export function onClose(el) {
  el._ui?.cleanup();
  return null;
}
