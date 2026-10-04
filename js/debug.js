/**
 * debug.js - debug-панель (?debug=1): Reset state, Toggle Plus, Deny camera, Exports = 0,
 * Jump to screen (DEV-DOC "Стек і структура": дебаг-панель).
 * Живе ПОЗА #app: на десктопі - колонка поруч з рамкою; на вузькому екрані (<= 430, телефон
 * і рендер) - прихована, відкривається потрійним тапом у зоні статус-бару або параметром panel=1.
 * Так панель не потрапляє в PNG екранів (render-app.mjs знімає #app з debug=1).
 */

import * as store from './state.js';
import { SCREENS, isBuilt } from './screens/registry.js';
import { copy } from './copy.js';
import { lastHaptic } from './haptic.js';
import * as router from './router.js';
import { h, esc } from './ui.js';

const t = copy.debug;

function jumpItems() {
  const items = [];
  for (const [id, entry] of Object.entries(SCREENS)) {
    items.push({ id, params: {}, label: `${id} · ${copy.screens[id] || id}`, entry });
    if (entry.slides) {
      for (let i = 1; i < entry.slides; i++) {
        items.push({ id, params: { slide: String(i) }, label: `${id} · ${copy.S01.slides[i].tag}`, entry, sub: true });
      }
    }
    if (entry.states) {
      for (const st of entry.states) {
        items.push({ id, params: { state: st }, label: `${id} · ${copy.s04States[st] || st}`, entry, sub: true });
      }
    }
  }
  return items;
}

function statusHTML(s) {
  const rows = [
    [t.statusPlan, s.isPlus ? t.planPlus : t.planFree],
    [t.statusCamera, s.permissions.camera],
    [t.statusPhotos, s.permissions.photos],
    [t.statusExports, `${store.selectors.exportsLeft(s)} / ${s.exports.limit}`],
    [t.statusHaptic, lastHaptic() || t.none],
  ];
  return rows.map(([k, v]) => `<div class="debug__kv"><span>${esc(k)}</span><span class="debug__v">${esc(v)}</span></div>`).join('');
}

export function mountDebug(stage, appEl) {
  const params = router.parseHash().params;
  const panel = h(`
    <aside class="debug" data-theme="light" aria-label="${esc(t.title)}">
      <div class="debug__scroll">
        <p class="debug__title t-mono-caption">${esc(t.title)}</p>
        <div class="debug__status"></div>
        <p class="debug__h t-mono-caption">${esc(t.actions)}</p>
        <div class="debug__actions">
          <button class="debug__btn pressable" type="button" data-debug="reset">${esc(t.reset)}</button>
          <button class="debug__btn pressable" type="button" data-debug="plus">${esc(t.togglePlus)}</button>
          <button class="debug__btn pressable" type="button" data-debug="deny">${esc(t.denyCamera)}</button>
          <button class="debug__btn pressable" type="button" data-debug="deny-photos">${esc(t.denyPhotos)}</button>
          <button class="debug__btn pressable" type="button" data-debug="exports0">${esc(t.exportsZero)}</button>
        </div>
        <p class="debug__h t-mono-caption">${esc(t.jump)}</p>
        <div class="debug__jump"></div>
        <p class="debug__hint t-footnote">${esc(t.hintNarrow)}</p>
      </div>
    </aside>`);

  const jump = panel.querySelector('.debug__jump');
  jumpItems().forEach((it, i) => {
    const built = isBuilt(it.id);
    const b = h(`
      <button class="debug__jump-item pressable${it.sub ? ' debug__jump-item--sub' : ''}" type="button" data-jump="${i}">
        <span class="debug__jump-label">${esc(it.label)}</span>
        <span class="debug__jump-meta">${esc(it.entry.type)}${built ? '' : ` · ${esc(t.notBuilt)}`}</span>
      </button>`);
    if (!built) b.classList.add('is-not-built');
    b.addEventListener('click', () => {
      router.jump(it.id, it.params);
      if (window.matchMedia('(max-width: 430px)').matches) panel.classList.remove('is-open');
    });
    b.dataset.route = JSON.stringify({ id: it.id, params: it.params });
    jump.append(b);
  });

  panel.addEventListener('click', (e) => {
    const a = e.target.closest('[data-debug]');
    if (!a) return;
    const s = store.get();
    switch (a.dataset.debug) {
      case 'reset':
        store.reset();
        router.jump('S01');
        break;
      case 'plus': store.set({ isPlus: !s.isPlus }); break;
      case 'deny': store.set({ permissions: { camera: 'denied' } }); break;
      case 'deny-photos': store.set({ permissions: { photos: 'denied' } }); break; // Phase 4: T01 одразу при експорті (FR-6.4)
      case 'exports0': store.set({ exports: { used: s.exports.limit } }); break;
      default: break;
    }
  });

  const status = panel.querySelector('.debug__status');
  const paint = () => { status.innerHTML = statusHTML(store.get()); };
  const markRoute = (r) => {
    jump.querySelectorAll('.debug__jump-item').forEach((b) => {
      const it = JSON.parse(b.dataset.route);
      const on = r && it.id === r.id && (it.params.state || it.params.slide || '') === (r.params.state || r.params.slide || '');
      b.classList.toggle('is-current', Boolean(on));
    });
  };
  paint();
  store.subscribe(paint);
  window.addEventListener('kadro:haptic', paint);
  router.onRouteChange((r) => { paint(); markRoute(r); });
  markRoute(router.currentRoute());

  if (params.panel === '1') panel.classList.add('is-open');

  // потрійний тап у зоні статус-бару - показати/сховати (вузький екран)
  let taps = [];
  appEl.addEventListener('pointerdown', (e) => {
    const r = appEl.getBoundingClientRect();
    const safeTop = parseFloat(getComputedStyle(appEl).getPropertyValue('--safe-top')) || 0;
    if (e.clientY - r.top > safeTop) return;
    const now = performance.now();
    taps = taps.filter((x) => now - x < 600);
    taps.push(now);
    if (taps.length >= 3) { taps = []; panel.classList.toggle('is-open'); }
  });

  stage.append(panel);
  return panel;
}
