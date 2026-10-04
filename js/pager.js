/**
 * pager.js - горизонтальний свайп-пейджер на трекові (M01 Paywall; та сама механіка, що в S01).
 * Pointer Events (миша й тач): 1:1 за пальцем, hysteresis 10 px (apple-design §10), поріг - --slide-snap
 * або швидкість --slide-fling, на краях опір (зсув / 4). Трек: width = count x 100%, слайди flex 0 0 (100/count)%.
 *
 *   const pager = swipePager({ viewport, track, count, initial, onChange(i, { user }) });
 *   pager.go(i, { user: true });  pager.index
 *
 * onChange викликається після кожної зміни індексу; user: true - зміна від жесту/кнопки (автопрокрутка - false).
 * onUser() - перший жест користувача (M01 зупиняє автопрокрутку).
 */
import { haptic } from './haptic.js';

export function swipePager({ viewport, track, count, initial = 0, onChange, onUser }) {
  let index = Math.min(count - 1, Math.max(0, initial));

  function apply(animate = true) {
    track.classList.toggle('is-dragging', !animate);
    track.style.transform = `translateX(${(-index * 100) / count}%)`;
  }
  function go(i, { user = false, silent = false } = {}) {
    const next = Math.max(0, Math.min(count - 1, i));
    const changed = next !== index;
    index = next;
    if (changed && user) haptic('light');
    apply(true);
    if (changed && !silent) onChange?.(index, { user });
  }
  apply(false);

  let drag = null;
  viewport.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x0: e.clientX, w: viewport.getBoundingClientRect().width, started: false, samples: [] };
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.started) {
      if (Math.abs(dx) < 10) return;
      drag.started = true;
      onUser?.();
      try { viewport.setPointerCapture(e.pointerId); } catch { /* вказівник уже неактивний */ }
      track.classList.add('is-dragging');
    }
    let off = dx;
    if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) off = dx / 4;
    track.style.transform = `translateX(calc(${(-index * 100) / count}% + ${off}px))`;
    drag.samples.push({ x: e.clientX, t: performance.now() });
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.started) return;
    if (e.type === 'pointercancel' || !d.samples.length) { apply(true); return; }
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const dx = s[s.length - 1].x - d.x0;
    const cs = getComputedStyle(viewport);
    const snap = (d.w * parseFloat(cs.getPropertyValue('--slide-snap'))) / 100;
    const fling = parseFloat(cs.getPropertyValue('--slide-fling'));
    let next = index;
    if (dx < -snap || v < -fling) next = index + 1;
    else if (dx > snap || v > fling) next = index - 1;
    go(next, { user: true });
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  return { go, get index() { return index; } };
}
