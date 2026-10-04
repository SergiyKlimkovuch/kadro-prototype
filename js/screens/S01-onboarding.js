/**
 * S01 Onboarding (FR-1.1, DEV-DOC "S01"). Тема dark (CLAUDE.md 1.8).
 * Layout: вордмарк -> картка (фото Unsplash) -> тег -> заголовок -> підзаголовок -> PageIndicator
 *   -> Continue -> підпис. Continue або свайп = наступний слайд; на 4-му -> S02.
 * Параметр ?slide=0..3 - стартовий слайд (debug / рендер). Поточний слайд - локальний стан
 * екрана (не store): це UI-стан сторінки, не доменні дані.
 * Фото: Unsplash недоступний для автоматичного пошуку -> заглушки data-photo-placeholder
 * (prototype/assets/CREDITS.md, розділ "Placeholders").
 */
import { copy, APP_NAME } from '../copy.js';
import { h, esc } from '../ui.js';
import { icon } from '../icons.js';
import { button, wordmark, pageIndicator } from '../components.js';
import { haptic } from '../haptic.js';
import { reducedMotion, cssMs } from '../router.js';

const t = copy.S01;
const N = t.slides.length;

function slideHTML(s, i) {
  const count = s.id === 'capture'
    ? `<span class="s01-card__count t-countdown" data-count aria-hidden="true">${esc(t.countdown[0])}</span>` : '';
  return `
    <div class="s01__slide" role="group" aria-roledescription="slide" aria-label="${esc(t.pageIndicator(i + 1, N))}">
      <div class="s01__card-area">
        <!-- photo placeholder: фото Unsplash для слайда "${esc(s.tag)}" - див. assets/CREDITS.md -->
        <div class="s01-card" data-photo-placeholder="S01 slide ${esc(s.id)} card">${count}</div>
      </div>
      <div class="s01__text">
        <p class="s01__tag t-mono-caption t-secondary">${esc(s.tag)}</p>
        <h1 class="s01__title t-large-title">${esc(s.title)}</h1>
      </div>
    </div>`;
}

export function render(state, ctx) {
  let index = Math.min(N - 1, Math.max(0, parseInt(ctx.params.slide, 10) || 0));
  const el = h(`
    <div class="s01" data-theme="dark">
      <header class="s01__header">${wordmark({ name: APP_NAME, size: 'md' })}</header>
      <div class="s01__viewport" data-scroll>
        <div class="s01__track">${t.slides.map(slideHTML).join('')}</div>
      </div>
      <div class="s01__controls">
        ${pageIndicator({ count: N, index, label: t.pageIndicator(index + 1, N) })}
        <div class="s01__cta">${button({ label: copy.common.continue, variant: 'primary', block: true, action: 'continue' })}</div>
        <p class="s01__footnote t-footnote t-secondary">${icon('lock-closed', 'outline', { className: 'icon--xs' })}<span>${esc(t.footnote)}</span></p>
      </div>
    </div>`);

  const viewport = el.querySelector('.s01__viewport');
  const track = el.querySelector('.s01__track');
  const indicator = el.querySelector('.page-indicator');
  const dots = [...indicator.children];
  const countEl = el.querySelector('[data-count]');
  const slides = [...el.querySelectorAll('.s01__slide')];

  function apply(animate = true) {
    track.classList.toggle('is-dragging', !animate);
    track.style.transform = `translateX(${(-index * 100) / N}%)`;
    dots.forEach((d, i) => {
      if (i === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    indicator.setAttribute('aria-label', t.pageIndicator(index + 1, N));
    slides.forEach((sl, i) => { // неактивні слайди недоступні для AT і фокусу
      sl.toggleAttribute('inert', i !== index);
      if (i === index) sl.removeAttribute('aria-hidden'); else sl.setAttribute('aria-hidden', 'true');
    });
  }
  function go(i) {
    index = Math.max(0, Math.min(N - 1, i));
    haptic('light');
    apply(true);
  }
  apply(false);

  /* Continue: слайд -> слайд, на останньому -> S02 */
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="continue"]')) return;
    if (index < N - 1) go(index + 1);
    else ctx.router.push('S02');
  });

  /* Свайп (Pointer Events: миша й тач). 1:1 за пальцем, hysteresis 10 px (apple-design §10),
     поріг - чверть ширини або швидкість; на краях опір (зсув / 4). */
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
      try { viewport.setPointerCapture(e.pointerId); } catch { /* вказівник уже неактивний */ }
      track.classList.add('is-dragging');
    }
    let off = dx;
    if ((index === 0 && dx > 0) || (index === N - 1 && dx < 0)) off = dx / 4;
    track.style.transform = `translateX(calc(${(-index * 100) / N}% + ${off}px))`;
    drag.samples.push({ x: e.clientX, t: performance.now() });
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.started) return;
    // pointercancel (напр. браузер забрав жест) - не свайп: пружина назад. clientX === 0 без руху - так само.
    if (e.type === 'pointercancel' || !d.samples.length || (e.clientX === 0 && d.x0 !== 0 && Math.abs(d.samples[d.samples.length - 1].x - e.clientX) > d.w / 2)) {
      apply(true);
      return;
    }
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const dx = d.samples[d.samples.length - 1].x - d.x0; // кінцева позиція = остання реальна, не clientX події
    const cs = getComputedStyle(el);
    const snap = (d.w * parseFloat(cs.getPropertyValue('--slide-snap'))) / 100;
    const fling = parseFloat(cs.getPropertyValue('--slide-fling'));
    let next = index;
    if (dx < -snap || v < -fling) next = index + 1;
    else if (dx > snap || v > fling) next = index - 1;
    if (next < 0 || next > N - 1) next = index;
    if (next !== index) haptic('light');
    index = next;
    apply(true);
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  /* CAPTURE: відлік 3-2-1 на картці. Reduced motion -> статична "3", без таймера. */
  if (countEl && !reducedMotion()) {
    let n = 0;
    const timer = setInterval(() => {
      if (!el.isConnected) { clearInterval(timer); return; }
      if (index !== 0) return;
      n = (n + 1) % t.countdown.length;
      countEl.textContent = t.countdown[n];
      countEl.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
        { duration: cssMs('--dur-pulse'), easing: 'ease-out' },
      );
    }, 1000); // [approx] крок відліку 1 с, як у таймері сесії
  }
  return el;
}

/** Без перемальовки при зміні store - щоб не скидати слайд */
export function update() {}
