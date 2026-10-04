/**
 * snap-scroll.js - поведінка стрічок зі scroll-snap: Carousel (H02 пресети, H04 стилі) і
 * WheelPicker (H03). Компоненти - components.css, індекс - docs/design-system/components.md.
 *
 * Тач і колесо миші - нативний скрол + CSS scroll-snap (нічого не емулюємо).
 * Миша - drag через Pointer Events (CLAUDE.md 1.9: жести тачем і мишею): стрічка йде за
 * курсором 1:1 з місця захоплення, після відпускання - проєкція імпульсу і доводка до
 * найближчої точки біля спроєктованої позиції (emilkowalski--apple-design §6, §10).
 *
 * snapScroll(scroller, { axis, align, items, onChange, onSettle }) -> { index, scrollTo }
 *   onChange(i) - елемент біля точки прив'язки змінився (живий скрол, без чекання зупинки)
 *   onSettle(i) - скрол зупинився
 *   maxStep     - (миша) на скільки елементів від стартового може полетіти кидок; типово без обмеження
 */

import { reducedMotion } from './router.js';

const HYSTERESIS = 4;      // px: менший рух - це тап, а не drag (apple-design §10 дає 10 для свайпів екрана)
const DECELERATION = 0.998; // apple-design §6: decelerationRate звичайного скролу
const SETTLE_MS = 120;     // [approx] пауза без scroll-подій = зупинка (scrollend є не в усіх Safari)

/** apple-design §6: project(v) у px для v у px/мс */
function project(v) {
  return (v * DECELERATION) / (1 - DECELERATION);
}

function targetFor(scroller, el, axis, align) {
  if (axis === 'y') {
    return align === 'center' ? el.offsetTop + el.offsetHeight / 2 - scroller.clientHeight / 2 : el.offsetTop;
  }
  if (align === 'center') return el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
  const pad = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
  return el.offsetLeft - pad;
}

function maxScroll(scroller, axis) {
  return axis === 'y' ? scroller.scrollHeight - scroller.clientHeight : scroller.scrollWidth - scroller.clientWidth;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function snapScroll(scroller, { axis = 'x', align = 'center', items, onChange, onSettle, maxStep = Infinity }) {
  const getItems = () => (typeof items === 'function' ? items() : items);
  const pos = () => (axis === 'y' ? scroller.scrollTop : scroller.scrollLeft);
  const setPos = (v) => { if (axis === 'y') scroller.scrollTop = v; else scroller.scrollLeft = v; };

  function nearest(at = pos()) {
    const list = getItems();
    const max = maxScroll(scroller, axis);
    let best = 0;
    let bestD = Infinity;
    list.forEach((el, i) => {
      const d = Math.abs(clamp(targetFor(scroller, el, axis, align), 0, max) - at);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function scrollTo(i, { smooth = true } = {}) {
    const el = getItems()[i];
    if (!el) return;
    const v = clamp(targetFor(scroller, el, axis, align), 0, maxScroll(scroller, axis));
    const behavior = smooth && !reducedMotion() ? 'smooth' : 'auto';
    scroller.scrollTo(axis === 'y' ? { top: v, behavior } : { left: v, behavior });
  }

  let current = -1;
  let settleTimer = null;
  let raf = 0;
  let dragging = null;
  let suppressClick = false;

  function check() {
    raf = 0;
    const i = nearest();
    if (i !== current) {
      current = i;
      onChange?.(i);
    }
  }

  scroller.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(check);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (dragging) return;
      check();
      onSettle?.(current);
    }, SETTLE_MS);
  }, { passive: true });

  /* ---- миша: drag ---- */
  scroller.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = { id: e.pointerId, p0: axis === 'y' ? e.clientY : e.clientX, s0: pos(), started: false, samples: [] };
  });
  scroller.addEventListener('pointermove', (e) => {
    const d = dragging;
    if (!d || e.pointerId !== d.id) return;
    const p = axis === 'y' ? e.clientY : e.clientX;
    const delta = p - d.p0;
    if (!d.started) {
      if (Math.abs(delta) < HYSTERESIS) return;
      d.started = true;
      scroller.setPointerCapture(e.pointerId);
      scroller.classList.add('is-dragging');
      scroller.style.scrollSnapType = 'none'; // інакше snap смикає стрічку під курсором
    }
    setPos(d.s0 - delta);
    d.samples.push({ p, t: performance.now() });
    if (d.samples.length > 5) d.samples.shift();
  });
  const end = (e) => {
    const d = dragging;
    if (!d || e.pointerId !== d.id) return;
    dragging = null;
    if (!d.started) return;
    suppressClick = true;
    scroller.classList.remove('is-dragging');
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].p - s[0].p) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const from = nearest(d.s0);
    // maxStep: кидок не пролітає більше за N елементів від стартового (пейджер S09 = 1, як paging UIScrollView)
    const i = clamp(nearest(pos() - project(v)), from - maxStep, from + maxStep);
    scrollTo(i);
    // snap повертаємо після доводки, щоб він не перебив плавний scrollTo
    setTimeout(() => { scroller.style.scrollSnapType = ''; }, reducedMotion() ? 0 : 400);
  };
  scroller.addEventListener('pointerup', end);
  scroller.addEventListener('pointercancel', end);
  // клік після drag - не тап по картці
  scroller.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  return {
    scrollTo,
    index: () => (current === -1 ? nearest() : current),
    /** без анімації і без onChange: початкова позиція після вставки в DOM */
    jumpTo(i) {
      scrollTo(i, { smooth: false });
      current = i;
    },
  };
}
