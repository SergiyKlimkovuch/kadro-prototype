/**
 * S09 Photo viewer - DEV-DOC "### S09 Photo viewer", FR-6.2, скрін 39.
 * Тип modal (знизу 450 мс), тема темна (CLAUDE.md 1.8). Чорний фон, кадр по центру.
 *   - свайп вліво/вправо = інший кадр сесії (PhotoPager: scroll-snap + snapScroll для миші), ←/→ на клавіатурі;
 *   - свайп вниз = закрити (Pointer Events: хід за пальцем, поріг > 25% висоти або > .25 px/мс - як Sheet), Esc, ×;
 *   - зверху glass × і мета "Look · час"; знизу glass Favorite · Export · Delete (Liquid Glass над фото, CLAUDE.md 1.7).
 * Параметри: session=<id> (інакше остання сесія), index=<n> (початковий кадр), seed=, picks=, favs=, plus=, used=, photos=.
 * Екран оновлюється точково (export update): перестворення pager скидало б позицію скролу.
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { icon } from '../icons.js';
import { h, esc, openAlert } from '../ui.js';
import { iconButton, phAttr } from '../components.js';
import { haptic } from '../haptic.js';
import { seedFromParams } from '../demo-seed.js';
import { applyRouteParams } from '../route-params.js';
import { sessionFor, patchPhoto, removePhoto } from '../gallery.js';
import { requestExport } from '../export.js';
import { snapScroll } from '../snap-scroll.js';

const t = copy.S09;
const HYSTERESIS = 10;          // px: apple-design §10 (свайп екрана), різниця між тапом і жестом
const CLOSE_FRACTION = 0.25;    // DEV-DOC "Анімації": закриття drag > 25% висоти (як Sheet в ui.js)
const CLOSE_VELOCITY = 0.25;    // px/мс = 250 pt/с, ComponentsKit ModalAnimation

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- розмітка ---------- */

function pagesHTML(photos) {
  return photos.map((p, i) => `
    <div class="pager__page" role="group" aria-roledescription="slide" aria-label="${esc(t.a11y.position(i + 1, photos.length))}">
      <img class="pager__img" src="${esc(p.src)}" alt="" draggable="false"${phAttr(p)}>
    </div>`).join('');
}

function skeleton() {
  return `
  <section class="viewer" data-theme="dark" tabindex="-1">
    <div class="viewer__stage">
      <div class="pager" data-scroll role="region" aria-roledescription="carousel" aria-label="${esc(t.a11y.swipeHint)}" tabindex="0"></div>
    </div>
    <div class="viewer__top">
      ${iconButton({ name: 'x-mark', label: t.a11y.close, variant: 'glass', action: 'close' })}
      <p class="viewer__meta t-mono-caption" data-bind="meta"></p>
    </div>
    <div class="viewer__bottom">
      <div class="viewer__action">
        <button class="icon-btn icon-btn--glass icon-btn--lg" type="button" data-action="favorite" data-bind="favorite"></button>
        <span class="viewer__caption t-mono-caption" data-bind="favorite-caption" aria-hidden="true"></span>
      </div>
      <div class="viewer__action">
        <button class="icon-btn icon-btn--glass icon-btn--lg" type="button" data-action="export" aria-label="${esc(t.a11y.save)}">${icon('arrow-down-tray')}</button>
        <span class="viewer__caption t-mono-caption" aria-hidden="true">${esc(t.save)}</span>
      </div>
      <div class="viewer__action">
        <button class="icon-btn icon-btn--glass icon-btn--lg" type="button" data-action="delete" aria-label="${esc(t.a11y.delete)}">${icon('trash')}</button>
        <span class="viewer__caption t-mono-caption" aria-hidden="true">${esc(t.delete)}</span>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-bind="live"></p>
  </section>`;
}

function emptyHTML() {
  const e = copy.S08.empty.session;
  return `
    <div class="viewer__empty">
      <h2 class="t-headline">${esc(e.title)}</h2>
      <p class="viewer__empty-text t-footnote">${esc(e.message)}</p>
    </div>`;
}

/* ---------- синхронізація ---------- */

function current(ctx) {
  const session = sessionFor(store.get(), ctx.ui.sessionId);
  const photo = session?.photos[ctx.ui.index];
  return { session, photo };
}

/** Мета, Favorite, aria-live для поточного кадру */
function syncCurrent(el, ctx) {
  const { session, photo } = current(ctx);
  if (!photo) return;
  const q = (s) => el.querySelector(s);
  // у кадру немає власного часу (форма session.js) - показуємо час старту сесії; photo.ts - якщо з'явиться
  q('[data-bind="meta"]').textContent = t.meta(copy.looks[session.lookId] || copy.looks.standard, photo.ts ?? session.startedAt);
  const fav = q('[data-bind="favorite"]');
  fav.innerHTML = icon('heart', photo.fav ? 'solid' : 'outline');
  fav.setAttribute('aria-label', photo.fav ? t.a11y.unfavorite : t.a11y.favorite);
  fav.setAttribute('aria-pressed', String(photo.fav));
  q('[data-bind="favorite-caption"]').textContent = photo.fav ? t.unfavorite : t.favorite;
}

function sync(el, state, ctx) {
  const ui = ctx.ui;
  const session = sessionFor(state, ui.sessionId);
  const photos = session?.photos || [];
  if (photos.length === 0) return; // сесію або останній кадр видалено - шар зараз закриється
  ui.index = clamp(ui.index, 0, photos.length - 1);
  const sig = photos.map((p) => p.id).join('|');
  if (ui.sig !== sig) {
    const pager = el.querySelector('.pager');
    pager.innerHTML = pagesHTML(photos);
    ui.sig = sig;
    ui.snap?.jumpTo(ui.index); // елемент уже в DOM, коли це update
  }
  syncCurrent(el, ctx);
}

/* ---------- дії ---------- */

function confirmDelete(ctx) {
  const { session, photo } = current(ctx);
  if (!photo) return;
  const a = t.deleteAlert;
  openAlert({
    title: a.title,
    message: a.message,
    actions: [
      { label: a.cancel, preferred: true },
      {
        label: a.confirm,
        role: 'destructive',
        onTap: async () => {
          haptic('medium');
          if (session.photos.length === 1) await ctx.router.back(); // останній кадр -> закрити, потім видалити
          removePhoto(session.id, photo.id);
        },
      },
    ],
  });
}

function onAction(el, action, ctx) {
  const { session, photo } = current(ctx);
  if (!photo) { if (action === 'close') ctx.router.back(); return; }
  switch (action) {
    case 'close': ctx.router.back(); break;
    case 'favorite': haptic('light'); patchPhoto(session.id, photo.id, { fav: !photo.fav }); break;
    case 'export': requestExport([photo], { scope: 'photo', router: ctx.router }); break;
    case 'delete': confirmDelete(ctx); break;
    default: break;
  }
}

/* ---------- жести ---------- */

/** Свайп вниз = закрити: шар (.layer) їде за пальцем, Pointer Events (тач і миша) */
function bindDismiss(el, ctx) {
  const stage = el.querySelector('.viewer__stage');
  let d = null;
  const layer = () => el.closest('.layer');

  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: null, y: 0, h: el.getBoundingClientRect().height, samples: [] };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.mode) {
      if (Math.hypot(dx, dy) < HYSTERESIS) return;
      d.mode = dy > 0 && Math.abs(dy) > Math.abs(dx) ? 'close' : 'pager';
      if (d.mode === 'close') {
        stage.setPointerCapture(e.pointerId);
        layer()?.classList.add('is-dragging');
      }
    }
    if (d.mode !== 'close') return;
    d.y = Math.max(0, dy);
    layer().style.transform = `translateY(${d.y}px)`;
    d.samples.push({ y: e.clientY, t: performance.now() });
    if (d.samples.length > 5) d.samples.shift();
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const g = d;
    d = null;
    if (g.mode !== 'close') return;
    const s = g.samples;
    // швидкість на відпусканні: якщо палець завмер (>100 мс без руху) - це не кидок
    const stale = s.length > 0 && performance.now() - s[s.length - 1].t > 100;
    const v = s.length > 1 && !stale ? (s[s.length - 1].y - s[0].y) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    layer()?.classList.remove('is-dragging');
    if (e.type !== 'pointercancel' && (g.y > g.h * CLOSE_FRACTION || v > CLOSE_VELOCITY)) ctx.router.back(); // inline transform знімає onClose
    else layer()?.style.removeProperty('transform'); // повернення пружиною (transition шару)
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}

/** ←/→ - сусідній кадр, Esc - закрити. Слухач на document: фокус губиться після alert, але шар лишається активним */
function bindKeys(el, ctx) {
  const onKey = (e) => {
    if (!el.isConnected) { el._ac?.abort(); return; }
    if (!el.hasAttribute('data-screen')) return; // активний шар - лише верхній роут
    if (document.querySelector('.alert-layer')) return;
    const photos = sessionFor(store.get(), ctx.ui.sessionId)?.photos || [];
    if (e.key === 'Escape') { e.preventDefault(); ctx.router.back(); return; }
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = clamp(ctx.ui.index + step, 0, photos.length - 1);
    if (next !== ctx.ui.index) ctx.ui.snap.scrollTo(next);
  };
  document.addEventListener('keydown', onKey, { signal: el._ac.signal });
}

export function render(state, ctx) {
  const ui = {
    sessionId: ctx.params.session || null,
    index: Math.max(0, parseInt(ctx.params.index, 10) || 0),
    sig: null,
    snap: null,
  };
  ctx.ui = ui;
  seedFromParams(ctx.params);
  const st = applyRouteParams(ctx.params, { overCamera: true });

  const session = sessionFor(st, ui.sessionId);
  if (session) ui.sessionId = session.id;

  const el = h(skeleton());
  el._ac = new AbortController(); // усі глобальні слухачі екрана (#75)
  if (!session || session.photos.length === 0) {
    el.querySelector('.viewer__stage').remove();
    el.querySelector('.viewer__bottom').remove();
    el.append(h(emptyHTML()));
  }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a) onAction(el, a.dataset.action, ctx);
  });

  const pager = el.querySelector('.pager');
  if (pager) {
    ui.snap = snapScroll(pager, {
      axis: 'x',
      align: 'center',
      maxStep: 1,
      items: () => [...pager.children],
      onChange: (i) => {
        if (i === ui.index) return;
        ui.index = i;
        syncCurrent(el, ctx);
        el.querySelector('[data-bind="live"]').textContent = t.a11y.position(i + 1, (sessionFor(store.get(), ui.sessionId)?.photos.length) || 0);
      },
    });
    sync(el, st, ctx);
    // стартовий кадр: scrollLeft потребує розкладки, а el ще не в DOM - ставимо після вставки
    requestAnimationFrame(() => ui.snap.jumpTo(ui.index));
    // зміна розміру (поворот, адресний рядок Safari, знімок елемента в рендері) зсуває scrollLeft - вирівнюємо на поточний кадр
    // (браузер перераховує snap-позицію вже ПІСЛЯ resize-події, тому перевірка відкладена на кадр і на паузу)
    const realign = () => {
      if (!el.isConnected) { el._ac?.abort(); return; }
      const fix = () => { if (pager.clientWidth && ui.snap && !pager.classList.contains('is-dragging')) ui.snap.jumpTo(ui.index); };
      requestAnimationFrame(() => requestAnimationFrame(fix));
      setTimeout(fix, 150);
    };
    window.addEventListener('resize', realign, { signal: el._ac.signal });
    bindDismiss(el, ctx);
    bindKeys(el, ctx);
  }
  return el;
}

export function update(el, state, ctx) {
  if (ctx.ui.snap) sync(el, state, ctx);
}

/** Шар знімається (Back / свайп вниз / rebuild): знімаємо inline-зсув жесту, далі transition шару довозить його вниз */
export function onClose(el) {
  el._ac?.abort(); // document keydown і window resize знімаються разом (#75)
  el.closest('.layer')?.style.removeProperty('transform');
  return null;
}
