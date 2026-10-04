/**
 * slider.js - поведінка Slider (components.md "Slider"; ComponentsKit SUSlider: смуга - крок - ручка - залишок).
 * mountSlider(el, { onInput, format }) - Pointer Events (тач і миша), клавіатура (стрілки, PageUp/Down, Home/End).
 * setSlider(el, value, text) - точкове оновлення без перебудови (екран синхронізує зі store).
 * Значення прив'язується до кроку data-step (ComponentsKit SliderVM.steppedValue).
 * Кадр без анімації: лише CSS-змінна --slider-p, transition немає (ручка йде за пальцем 1:1).
 */

const num = (el, k) => Number(el.dataset[k]);

function snap(el, v) {
  const min = num(el, 'min');
  const max = num(el, 'max');
  const step = num(el, 'step');
  const stepped = step > 0 ? Math.round((v - min) / step) * step + min : v;
  return Math.round(Math.min(max, Math.max(min, stepped)) * 1000) / 1000;
}

export function setSlider(el, value, text) {
  const min = num(el, 'min');
  const max = num(el, 'max');
  el.style.setProperty('--slider-p', String((value - min) / (max - min)));
  el.setAttribute('aria-valuenow', String(value));
  if (text != null) el.setAttribute('aria-valuetext', text);
}

export function mountSlider(el, { onInput }) {
  const min = num(el, 'min');
  const max = num(el, 'max');
  const step = num(el, 'step');
  let drag = null;

  const current = () => Number(el.getAttribute('aria-valuenow'));
  const emit = (v) => {
    const next = snap(el, v);
    if (next !== current()) onInput(next);
  };

  /** значення за x курсора: центр ручки = left + p * usable + space + handleW / 2 */
  const valueAt = (clientX, grabOffset) => {
    const r = el.getBoundingClientRect();
    const handle = el.querySelector('.slider__handle').getBoundingClientRect();
    const space = parseFloat(getComputedStyle(el).getPropertyValue('--slider-space')) || 0;
    const usable = Math.max(1, r.width - handle.width - 2 * space);
    const p = (clientX - grabOffset - r.left - space - handle.width / 2) / usable;
    return min + Math.min(1, Math.max(0, p)) * (max - min);
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    el.setPointerCapture(e.pointerId);
    const handle = el.querySelector('.slider__handle').getBoundingClientRect();
    const onHandle = e.clientX >= handle.left && e.clientX <= handle.right;
    // схопив ручку - не стрибає до курсора; тап по смузі - ручка переходить під курсор
    drag = { id: e.pointerId, grab: onHandle ? e.clientX - (handle.left + handle.width / 2) : 0 };
    emit(valueAt(e.clientX, drag.grab));
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    emit(valueAt(e.clientX, drag.grab));
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  el.addEventListener('keydown', (e) => {
    const big = step * 2;
    const next = {
      ArrowRight: current() + step, ArrowUp: current() + step,
      ArrowLeft: current() - step, ArrowDown: current() - step,
      PageUp: current() + big, PageDown: current() - big,
      Home: min, End: max,
    }[e.key];
    if (next == null) return;
    e.preventDefault();
    emit(next);
  });
}
