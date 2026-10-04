/**
 * S08 Session gallery - DEV-DOC "### S08 Session gallery", FR-6.1, FR-6.3, FR-6.4, скрін 42.
 * Тип screen (push), тема світла (CLAUDE.md 1.8): під навбаром рівний фон -> кнопки solid, не glass (1.7).
 *
 * Композиція (скрін 42): навбар Back · заголовок · "Export session" (primary pill) · "..." (solid);
 * під ним (free) рядок ліміту і посилання "Export without limits" -> M01; лічильники Picks · All photos ·
 * Favorites (StatCounter-фільтри); сітка 3 колонки PhotoGridItem. Тап по кадру -> S09 (modal).
 *
 * Сесія: params.session (id) або остання у state.sessions. Порожній state.sessions (мініатюра S04 без сесій,
 * open-questions #26) -> copy.S08.empty.session. Параметри відладки: seed=, picks=, favs=, kept=, look= (demo-seed.js),
 * plus=1|0, used=<n>, photos=notDetermined|granted|denied (route-params.js).
 *
 * Екран перемальовується точково (export update): перестворення DOM скидало б фокус у tablist лічильників.
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { icon } from '../icons.js';
import { h, esc, openMenu, openAlert } from '../ui.js';
import { iconButton, badge, phAttr } from '../components.js';
import { haptic } from '../haptic.js';
import { seedFromParams } from '../demo-seed.js';
import { applyRouteParams } from '../route-params.js';
import { sessionFor, counts, filtered, removeSession, daysToReset } from '../gallery.js';
import { requestExport } from '../export.js';

const t = copy.S08;
const SECTIONS = ['picks', 'all', 'favorites'];

/* ---------- розмітка ---------- */

function skeleton() {
  return `
  <section class="gal" data-theme="light">
    <header class="gal__nav">
      ${iconButton({ name: 'chevron-left', label: t.a11y.back, variant: 'solid', action: 'back' })}
      <h1 class="gal__title t-headline" data-bind="title"></h1>
      <button class="btn btn--primary btn--sm gal__export" type="button" data-action="export" data-bind="export"><span>${esc(t.saveAll)}</span></button>
      <button class="icon-btn icon-btn--solid" type="button" data-action="more" data-bind="more" aria-haspopup="menu" aria-label="${esc(t.a11y.more)}">${icon('ellipsis-horizontal')}</button>
    </header>
    <div class="gal__scroll" data-scroll>
      <div class="gal__limit" data-bind="limit"></div>
      <div class="gal__stats" role="tablist">
        ${SECTIONS.map((k) => `
          <button class="stat pressable" type="button" role="tab" data-filter="${k}" aria-selected="false" tabindex="-1">
            <span class="stat__label t-mono-caption">${esc(t.sections[k])}</span>
            <span class="stat__value" data-bind="count-${k}"></span>
          </button>`).join('')}
      </div>
      <div class="gal__grid" role="tabpanel" data-bind="grid"></div>
      <div class="gal__empty" data-bind="empty" hidden></div>
    </div>
  </section>`;
}

function tileHTML({ photo, index }, total) {
  const overlay = photo.pick || photo.fav;
  return `
    <button class="pgi pressable" type="button" data-photo="${index}"
      aria-label="${esc(t.a11y.photo(index + 1, total, { pick: photo.pick, fav: photo.fav }))}">
      <span class="pgi__frame" data-overlay="${overlay}">
        <img class="pgi__img" src="${esc(photo.src)}" alt="" draggable="false"${phAttr(photo)}>
        ${photo.pick ? badge({ label: t.pickBadge, variant: 'plus', className: 'pgi__badge' }) : ''}
        ${photo.fav ? icon('heart', 'solid', { className: 'pgi__heart' }) : ''}
      </span>
    </button>`;
}

function limitHTML(state) {
  if (state.isPlus) return '';
  const left = store.selectors.exportsLeft(state);
  const days = daysToReset(state.exports.resetAt);
  return `
    <p class="gal__limit-text t-footnote">${esc(t.limit(left, days))}</p>
    <button class="gal__upgrade t-footnote" type="button" data-action="upgrade">${esc(t.upgrade)}</button>`;
}

function emptyHTML(kind) {
  const e = t.empty[kind];
  return `
    ${icon(kind === 'favorites' ? 'heart' : 'photo', 'outline', { className: 'gal__empty-icon' })}
    <h2 class="gal__empty-title t-headline">${esc(e.title)}</h2>
    <p class="gal__empty-text t-footnote">${esc(e.message)}</p>`;
}

/* ---------- точкове оновлення ---------- */

function sync(el, state, ctx) {
  const ui = ctx.ui;
  const q = (s) => el.querySelector(s);
  const session = sessionFor(state, ui.sessionId);
  const photos = session?.photos || [];
  const c = counts(photos);
  const list = filtered(photos, ui.filter);

  q('[data-bind="title"]').textContent = session ? t.title(session.startedAt) : copy.screens.S08;

  const exportBtn = q('[data-bind="export"]');
  exportBtn.setAttribute('aria-disabled', String(photos.length === 0));
  exportBtn.setAttribute('aria-label', t.a11y.saveAll(photos.length));
  q('[data-bind="more"]').setAttribute('aria-disabled', String(!session));

  const limit = q('[data-bind="limit"]');
  const limitSig = state.isPlus ? 'plus' : `${store.selectors.exportsLeft(state)}|${state.exports.resetAt}`;
  if (ui.limitSig !== limitSig) {
    limit.innerHTML = limitHTML(state);
    limit.hidden = state.isPlus;
    ui.limitSig = limitSig;
  }

  const tabs = [...el.querySelectorAll('.stat')];
  tabs.forEach((b) => {
    const k = b.dataset.filter;
    const on = k === ui.filter;
    b.setAttribute('aria-selected', String(on));
    b.setAttribute('tabindex', on ? '0' : '-1');
    q(`[data-bind="count-${k}"]`).textContent = t.count(c[k]);
  });

  const grid = q('[data-bind="grid"]');
  const empty = q('[data-bind="empty"]');
  const gridSig = JSON.stringify([ui.filter, list.map((x) => [x.photo.id, x.photo.pick, x.photo.fav])]);
  if (ui.gridSig !== gridSig) {
    grid.innerHTML = list.map((x) => tileHTML(x, photos.length)).join('');
    ui.gridSig = gridSig;
  }
  grid.hidden = list.length === 0;
  empty.hidden = list.length !== 0;
  if (list.length === 0) {
    const kind = photos.length === 0 ? 'session' : ui.filter === 'favorites' ? 'favorites' : 'picks';
    empty.innerHTML = emptyHTML(kind);
  }
}

/* ---------- дії ---------- */

function confirmDeleteSession(el, ctx) {
  const session = sessionFor(store.get(), ctx.ui.sessionId);
  if (!session) return;
  const a = t.deleteAlert;
  openAlert({
    title: a.title,
    message: a.message(session.photos.length),
    actions: [
      { label: a.cancel, preferred: true },
      {
        label: a.confirm,
        role: 'destructive',
        onTap: async () => {
          haptic('medium');
          // спершу Back (S08 не має миготіти порожнім станом під час виїзду), потім видалення
          await ctx.router.back();
          removeSession(session.id);
        },
      },
    ],
  });
}

function onAction(el, action, target, ctx) {
  const s = store.get();
  const session = sessionFor(s, ctx.ui.sessionId);
  switch (action) {
    case 'back': ctx.router.back(); break;
    case 'more':
      if (!session) break;
      haptic('light');
      openMenu({
        anchor: target,
        options: [{ value: 'delete', label: t.menu.delete, destructive: true }],
        value: null,
        role: 'action',
        solid: true, // #72: світлий рівний фон під меню
        onSelect: () => confirmDeleteSession(el, ctx),
      });
      break;
    case 'export':
      if (session) requestExport(session.photos, { scope: 'session', router: ctx.router });
      break;
    case 'upgrade': haptic('light'); ctx.router.push('M01', { source: 'export' }); break;
    default: break;
  }
}

export function render(state, ctx) {
  const ui = { filter: 'all', sessionId: ctx.params.session || null, limitSig: null, gridSig: null };
  ctx.ui = ui;
  // тестові дані й стани - один раз за життя шару (render не повторюється, але seed ідемпотентний лише за id)
  seedFromParams(ctx.params);
  const st = applyRouteParams(ctx.params, { overCamera: true });

  const el = h(skeleton());
  el.addEventListener('click', (e) => {
    const stat = e.target.closest('.stat');
    if (stat) {
      if (ui.filter !== stat.dataset.filter) { haptic('light'); ui.filter = stat.dataset.filter; sync(el, store.get(), ctx); }
      return;
    }
    const tile = e.target.closest('[data-photo]');
    if (tile) {
      const session = sessionFor(store.get(), ui.sessionId);
      if (session) ctx.router.push('S09', { session: session.id, index: tile.dataset.photo });
      return;
    }
    const a = e.target.closest('[data-action]');
    if (a && a.getAttribute('aria-disabled') !== 'true') onAction(el, a.dataset.action, a, ctx);
  });
  // WAI-ARIA Tabs: ←/→ переносять фокус і вибирають (automatic activation), Home/End - крайні.
  // radioKeys з ui.js не підходить: він синхронізує tabindex за aria-checked, а в tabs - aria-selected.
  el.querySelector('.gal__stats').addEventListener('keydown', (e) => {
    const tabs = [...el.querySelectorAll('.stat')];
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
    if (next == null) return;
    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });
  sync(el, st, ctx);
  return el;
}

export function update(el, state, ctx) {
  sync(el, state, ctx);
}
