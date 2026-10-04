/**
 * router.js - hash-роутер і стек шарів (DEV-DOC "Стек і структура", CLAUDE.md 1.11).
 *
 * URL: #/<ID>?<params>  - параметри ПІСЛЯ хеша (#/S04?debug=1&state=off), бо так їх
 * будує tools/screen-render/render-app.mjs.
 *
 * Стек шарів у #app (знизу вгору): screen | modal | overlay | sheet | alert | toast.
 * - push(id): screen - зсув справа 350 мс, попередній -30% і затемнення; modal - знизу 450 мс;
 *   sheet / alert / toast - через ui.js.
 * - back(): закрити верхній роут-шар (той самий шлях назад - apple-design §7).
 * - Свайп від лівого краю = back для screen (Pointer Events: тач і миша).
 * - Відкриття роуту напряму будує ланцюжок parent-ів з registry.js без анімації.
 *
 * Контракт рендеру: корінь активного (верхнього роут-) шару має data-screen="<ID>",
 * його скрол-контейнер - data-scroll. У неактивних шарів атрибути перейменовуються
 * на data-screen-inactive / data-scroll-inactive, щоб querySelector знаходив саме активний.
 *
 * Контракт модуля екрана (js/screens/<ID>-<slug>.js):
 *   export function render(state, ctx) -> HTMLElement   (screen / modal / overlay / sheet)
 *                                      -> { title, message, actions }  (alert)
 *                                      -> { kind, message, action }    (toast)
 *   export function update(el, state, ctx)   - необов'язково: точкове оновлення без
 *                                              перестворення DOM (щоб працювали transitions)
 *   export function onClose(el, ctx, reason) - необов'язково: шар знімається НЕ самим екраном
 *                                              (reason 'back' - Back / edge-swipe / history,
 *                                               'rebuild' - debug jump / зміна хеша). Може повернути
 *                                              { open: '<ID>' }: після закриття (лише 'back') роутер
 *                                              робить push цього роуту. Так S05 Back = Stop (#51).
 *   ctx = { id, params, entry, built, router }
 */

import * as store from './state.js';
import { entryFor, chainFor } from './screens/registry.js';
import * as placeholder from './screens/_placeholder.js';
import { createSheetLayer, createAlertLayer, createToast } from './ui.js';

const STICKY_PARAMS = ['debug', 'panel'];
const SWIPE_HYSTERESIS = 10;        // px, apple-design §10
const SWIPE_COMMIT_PROGRESS = 0.5;  // [approx] половина ширини
const SWIPE_COMMIT_VELOCITY = 0.5;  // px/мс, як поріг свайпу Review у DEV-DOC

let app = null;
let toastHost = null;
const layers = [];
const routeListeners = new Set();
let ignoreNextHash = false;
let historyDepth = 0;
let busy = Promise.resolve();

/* ---------- утиліти ---------- */

export function appRoot() {
  return app;
}

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Тривалість з tokens.css у мс (з урахуванням reduced motion) */
export function cssMs(name) {
  const varName = reducedMotion() ? '--dur-reduced' : name;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000 || 0;
}

export function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function waitTransition(el, ms) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (e) => { if (e.target === el) finish(); };
    el.addEventListener('transitionend', onEnd);
    setTimeout(finish, ms + 60);
  });
}

export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const qi = raw.indexOf('?');
  const path = qi === -1 ? raw : raw.slice(0, qi);
  const query = qi === -1 ? '' : raw.slice(qi + 1);
  return { id: decodeURIComponent(path) || null, params: Object.fromEntries(new URLSearchParams(query)) };
}

function stickyParams() {
  const { params } = parseHash();
  const out = {};
  for (const k of STICKY_PARAMS) if (params[k] != null) out[k] = params[k];
  return out;
}

function ownParams(params) {
  const out = { ...params };
  for (const k of STICKY_PARAMS) delete out[k];
  return out;
}

export function hashFor(id, params = {}) {
  const q = new URLSearchParams({ ...stickyParams(), ...ownParams(params) }).toString();
  return `#/${id}${q ? `?${q}` : ''}`;
}

function sameRoute(a, b) {
  return a.id === b.id && JSON.stringify(ownParams(a.params)) === JSON.stringify(ownParams(b.params));
}

function defaultRoute() {
  return store.get().onboarded ? 'S04' : 'S01';
}

/** Тема для шару без власної теми (sheet / alert / toast) - тема верхнього screen/modal */
export function currentTheme() {
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].kind === 'screen' || layers[i].kind === 'modal') return layers[i].theme;
  }
  return 'light';
}

export function getToastHost() {
  return toastHost;
}

/* ---------- реєстр шарів (ui.js реєструє ad-hoc шари: демо-листи, меню, тости) ---------- */

export function registerLayer(layer) {
  layers.push(layer);
  syncActive();
}

export function unregisterLayer(layer) {
  const i = layers.indexOf(layer);
  if (i !== -1) layers.splice(i, 1);
  syncActive();
}

function topRouted() {
  for (let i = layers.length - 1; i >= 0; i--) if (layers[i].routed) return layers[i];
  return null;
}

function routedLayers() {
  return layers.filter((l) => l.routed);
}

function renameAttr(el, from, to) {
  const v = el.getAttribute(from);
  if (v === null) return;
  el.removeAttribute(from);
  el.setAttribute(to, v);
}

function syncActive() {
  const active = topRouted();
  let topFull = -1;
  layers.forEach((l, i) => { if (l.kind === 'screen' || l.kind === 'modal') topFull = i; });

  layers.forEach((l, i) => {
    if (l.screenEl && l.id) {
      if (l === active) {
        l.screenEl.setAttribute('data-screen', l.id);
        l.screenEl.removeAttribute('data-screen-inactive');
      } else {
        l.screenEl.removeAttribute('data-screen');
        l.screenEl.setAttribute('data-screen-inactive', l.id);
      }
    }
    l.el.querySelectorAll('[data-scroll], [data-scroll-inactive]').forEach((s) => {
      if (l === active) renameAttr(s, 'data-scroll-inactive', 'data-scroll');
      else renameAttr(s, 'data-scroll', 'data-scroll-inactive');
    });
    l.el.inert = i < topFull;
  });

  const r = routedLayers();
  store.set({
    route: {
      stack: r.filter((l) => l.kind === 'screen').map((l) => l.id),
      sheet: [...r].reverse().find((l) => l.kind === 'sheet')?.id || null,
      modal: [...r].reverse().find((l) => l.kind === 'modal')?.id || null,
    },
  }, { silent: true });

  const cur = currentRoute();
  routeListeners.forEach((fn) => fn(cur));
}

export function currentRoute() {
  const t = topRouted();
  return t ? { id: t.id, params: t.params } : null;
}

export function onRouteChange(fn) {
  routeListeners.add(fn);
  return () => routeListeners.delete(fn);
}

/* ---------- монтування роут-шарів ---------- */

async function loadModule(entry) {
  return entry.load ? entry.load() : placeholder;
}

function previousScreenLayer(before) {
  const idx = before ? layers.indexOf(before) : layers.length;
  for (let i = idx - 1; i >= 0; i--) if (layers[i].kind === 'screen') return layers[i];
  return null;
}

async function mountRoute(id, params, { animate }) {
  const entry = entryFor(id);
  const mod = await loadModule(entry);
  const ctx = { id, params, entry, built: Boolean(entry.load), router: api };
  const state = store.get();
  const theme = entry.theme || currentTheme();
  const base = { id, params, entry, mod, ctx, theme, routed: true, kind: entry.type };

  if (entry.type === 'screen' || entry.type === 'modal' || entry.type === 'overlay') {
    const el = document.createElement('section');
    el.className = `layer layer--${entry.type}`;
    el.dataset.theme = theme;
    const node = mod.render(state, ctx);
    node.dataset.theme = node.dataset.theme || theme;
    el.append(node);
    const layer = { ...base, el, screenEl: node, node };
    layer.refresh = (s) => refreshNode(layer, s);
    layer.close = (anim) => closeFullLayer(layer, anim);
    app.insertBefore(el, toastHost);
    layers.push(layer);
    if (animate) await animateIn(layer);
    return layer;
  }

  if (entry.type === 'sheet') {
    const node = mod.render(state, ctx);
    const sheet = createSheetLayer({ theme, detent: entry.detent, content: node, onRequestClose: () => back() });
    const layer = { ...base, el: sheet.el, screenEl: sheet.panel, node };
    layer.refresh = (s) => refreshNode(layer, s);
    layer.close = (anim) => sheet.close(anim);
    app.insertBefore(sheet.el, toastHost);
    layers.push(layer);
    await sheet.open(animate);
    return layer;
  }

  if (entry.type === 'alert') {
    const desc = mod.render(state, ctx);
    const alert = createAlertLayer({ theme, ...desc, onAction: () => back() });
    const layer = { ...base, el: alert.el, screenEl: alert.panel };
    layer.close = (anim) => alert.close(anim);
    app.insertBefore(alert.el, toastHost);
    layers.push(layer);
    await alert.open(animate);
    return layer;
  }

  if (entry.type === 'toast') {
    const desc = mod.render(state, ctx);
    const toast = createToast({ theme, ...desc, onHidden: () => { if (topRouted() === layer) back(); } });
    const layer = { ...base, el: toast.el, screenEl: toast.el };
    layer.close = (anim) => toast.close(anim);
    layers.push(layer);
    await toast.open(animate);
    return layer;
  }

  throw new Error(`router: невідомий тип "${entry.type}" для ${id}`);
}

function refreshNode(layer, state) {
  const { mod, ctx } = layer;
  if (typeof mod.update === 'function') {
    mod.update(layer.node, state, ctx);
    return;
  }
  const oldScroll = layer.node.querySelector('[data-scroll], [data-scroll-inactive]');
  const top = oldScroll ? oldScroll.scrollTop : 0;
  const next = mod.render(state, ctx);
  next.dataset.theme = next.dataset.theme || layer.theme;
  layer.node.replaceWith(next);
  if (layer.screenEl === layer.node) layer.screenEl = next;
  layer.node = next;
  const newScroll = next.querySelector('[data-scroll], [data-scroll-inactive]');
  if (newScroll) newScroll.scrollTop = top;
}

async function animateIn(layer) {
  const el = layer.el;
  if (layer.kind === 'screen') {
    const prev = previousScreenLayer(layer);
    el.dataset.pose = 'right';
    await nextFrame();
    el.removeAttribute('data-pose');
    if (prev) prev.el.dataset.pose = 'behind';
    await waitTransition(el, cssMs('--dur-push'));
  } else if (layer.kind === 'modal') {
    el.dataset.pose = 'below';
    await nextFrame();
    el.removeAttribute('data-pose');
    await waitTransition(el, cssMs('--dur-modal'));
  } else if (layer.kind === 'overlay') {
    el.dataset.pose = 'out';
    await nextFrame();
    el.removeAttribute('data-pose');
    await waitTransition(el, cssMs('--dur-alert'));
  }
}

async function closeFullLayer(layer, animate) {
  const el = layer.el;
  if (animate) {
    if (layer.kind === 'screen') {
      const prev = previousScreenLayer(layer);
      el.dataset.pose = 'right';
      if (prev) prev.el.removeAttribute('data-pose');
      await waitTransition(el, cssMs('--dur-push'));
    } else if (layer.kind === 'modal') {
      el.dataset.pose = 'below';
      await waitTransition(el, cssMs('--dur-modal'));
    } else {
      el.dataset.pose = 'out';
      await waitTransition(el, cssMs('--dur-alert'));
    }
  } else if (layer.kind === 'screen') {
    const prev = previousScreenLayer(layer);
    if (prev) prev.el.removeAttribute('data-pose');
  }
  el.remove();
}

/* ---------- навігація ---------- */

function queue(fn) {
  busy = busy.then(fn).catch((e) => { console.error(e); });
  return busy;
}

async function rebuild(route) {
  for (const l of [...layers].reverse()) {
    if (l.routed && typeof l.mod?.onClose === 'function') l.mod.onClose(l.node, l.ctx, 'rebuild');
    if (l.close) await l.close(false);
    else l.el.remove();
  }
  layers.length = 0;
  historyDepth = 0;

  let { id, params } = route;
  if (!id || !entryFor(id)) {
    if (id) console.warn(`router: роуту "${id}" немає в registry.js - відкриваю типовий`);
    id = defaultRoute();
    params = {};
    window.history.replaceState(null, '', hashFor(id, params));
  }
  for (const cid of chainFor(id)) {
    await mountRoute(cid, cid === id ? params : {}, { animate: false });
  }
  // попередні screen-шари одразу в позі "behind" (без анімації)
  const screens = layers.filter((l) => l.kind === 'screen');
  screens.slice(0, -1).forEach((l) => { l.el.dataset.pose = 'behind'; });
  syncActive();
}

async function doPush(id, params) {
  const entry = entryFor(id);
  if (!entry) {
    console.warn(`router.push: роуту "${id}" немає в registry.js`);
    return;
  }
  const layer = mountRoute(id, params, { animate: true });
  window.history.pushState(null, '', hashFor(id, params));
  historyDepth++;
  syncActiveSoon();
  await layer;
  syncActive();
}

function syncActiveSoon() {
  requestAnimationFrame(syncActive);
}

async function closeTop({ touchHistory }) {
  const routed = routedLayers();
  if (routed.length < 2) return false;
  const top = routed[routed.length - 1];
  // ad-hoc шари поверх роут-шару закриваємо разом з ним
  for (const l of layers.slice(layers.indexOf(top) + 1).reverse()) {
    if (l.close) await l.close(true);
    const i = layers.indexOf(l);
    if (i !== -1) layers.splice(i, 1);
  }
  const follow = typeof top.mod?.onClose === 'function' ? top.mod.onClose(top.node, top.ctx, 'back') : null;
  const closing = top.close(true);
  layers.splice(layers.indexOf(top), 1);
  syncActive();
  if (touchHistory) {
    const next = topRouted();
    if (historyDepth > 0) {
      historyDepth--;
      ignoreNextHash = true;
      window.history.back();
    } else if (next) {
      window.history.replaceState(null, '', hashFor(next.id, next.params));
    }
  }
  await closing;
  if (follow?.open && entryFor(follow.open)) await doPush(follow.open, follow.params || {});
  return true;
}

function onHashChange() {
  if (ignoreNextHash) {
    ignoreNextHash = false;
    return;
  }
  const r = parseHash();
  const routed = routedLayers();
  const top = routed[routed.length - 1];
  const prev = routed[routed.length - 2];
  if (top && sameRoute(top, r)) return;
  if (prev && sameRoute(prev, r)) {
    historyDepth = Math.max(0, historyDepth - 1);
    queue(() => closeTop({ touchHistory: false }));
    return;
  }
  queue(() => rebuild(r));
}

/* ---------- свайп від лівого краю = back ---------- */

function setupEdgeSwipe() {
  let drag = null;
  const edge = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge-swipe')) || 0;

  app.addEventListener('pointerdown', (e) => {
    const rect = app.getBoundingClientRect();
    if (e.clientX - rect.left > edge()) return;
    const top = layers[layers.length - 1];
    if (!top || !top.routed || top.kind !== 'screen') return;
    const prev = previousScreenLayer(top);
    if (!prev) return;
    drag = { top, prev, id: e.pointerId, x0: e.clientX, width: rect.width, started: false, samples: [] };
  });

  app.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = Math.max(0, e.clientX - drag.x0);
    if (!drag.started) {
      if (dx < SWIPE_HYSTERESIS) return;
      drag.started = true;
      app.setPointerCapture(e.pointerId);
      drag.top.el.classList.add('is-dragging');
      drag.prev.el.classList.add('is-dragging');
    }
    const p = Math.min(1, dx / drag.width);
    drag.top.el.style.transform = `translateX(${dx}px)`;
    drag.prev.el.style.transform = `translateX(${-30 * (1 - p)}%)`;
    drag.prev.el.style.setProperty('--scrim-o', String(1 - p));
    drag.samples.push({ x: e.clientX, t: performance.now() });
    if (drag.samples.length > 5) drag.samples.shift();
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.started) return;
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const p = (e.clientX - d.x0) / d.width;
    d.top.el.classList.remove('is-dragging');
    d.prev.el.classList.remove('is-dragging');
    d.top.el.style.transform = '';
    d.prev.el.style.transform = '';
    d.prev.el.style.removeProperty('--scrim-o');
    if (p > SWIPE_COMMIT_PROGRESS || v > SWIPE_COMMIT_VELOCITY) back();
  };
  app.addEventListener('pointerup', end);
  app.addEventListener('pointercancel', end);
}

/* ---------- публічний API ---------- */

export function push(id, params = {}) {
  return queue(() => doPush(id, params));
}

export function back() {
  return queue(() => closeTop({ touchHistory: true }));
}

/** Debug "Jump to screen": заміна всього стеку без анімації */
export function jump(id, params = {}) {
  return queue(async () => {
    window.history.replaceState(null, '', hashFor(id, params));
    await rebuild({ id, params });
  });
}

/**
 * Заміна верхнього роут-шару новим (S05 -> S06: модалка зйомки змінюється модалкою Review,
 * назад з Review веде у S04, а не в завершену зйомку). Новий шар в'їжджає з анімацією,
 * старий знімається під ним без анімації; історія - replaceState (кнопка Back браузера -> S04).
 */
export function replace(id, params = {}) {
  return queue(async () => {
    if (!entryFor(id)) {
      console.warn(`router.replace: роуту "${id}" немає в registry.js`);
      return;
    }
    const routed = routedLayers();
    const old = routed.length > 1 ? routed[routed.length - 1] : null;
    const mounting = mountRoute(id, params, { animate: true });
    syncActiveSoon();
    await mounting;
    if (old) {
      for (const l of layers.slice(layers.indexOf(old) + 1)) {
        if (l.routed) continue;
        if (l.close) await l.close(false);
        const i = layers.indexOf(l);
        if (i !== -1) layers.splice(i, 1);
      }
      await old.close(false);
      layers.splice(layers.indexOf(old), 1);
    }
    window.history.replaceState(null, '', hashFor(id, params));
    syncActive();
  });
}

export function canGoBack() {
  return routedLayers().length > 1;
}

/** Перемальовка відкритих шарів при зміні store */
function refreshAll(state) {
  for (const l of layers) if (typeof l.refresh === 'function') l.refresh(state);
  syncActive();
}

export async function init(rootEl) {
  app = rootEl;
  toastHost = document.createElement('div');
  toastHost.className = 'toast-host';
  toastHost.setAttribute('aria-live', 'polite');
  app.append(toastHost);
  window.addEventListener('hashchange', onHashChange);
  store.subscribe(refreshAll);
  setupEdgeSwipe();
  await queue(() => rebuild(parseHash()));
}

export const api = { push, back, jump, replace, canGoBack, currentRoute, parseHash, hashFor };
