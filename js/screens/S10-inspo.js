/**
 * S10 Inspo - DEV-DOC "### S10 Inspo та S11 Reference", FR-8.1, скрін 27 (28 - "+" -> New Inspo: Next, заглушка).
 * Тип screen (push з S04, іконка INSPO), тема світла (CLAUDE.md 1.8).
 *
 * Композиція (скрін 27): навбар Back · "Inspo" · "+" · пошук (solid-кола над рівним фоном); два ряди горизонтальних
 * чіпів категорій з емодзі (4 + 4, окремі скрол-ряди); сітка 2 колонки, картка 3:4 з зіркою зліва зверху (favorite)
 * і pose-іконкою справа зверху (-> S04 з накладкою). Тап на картку -> S11.
 *
 * Фільтр: чіп = тогл (повторний тап знімає; нічого не вибрано = усі); Favorites = state.inspoFavs. Пошук - за назвою
 * і описом кадру (copy.S10.items), поверх чіпа; рядок пошуку заміщає навбар, Cancel закриває. Порожні стани: copy.S10.search/emptyCategory.
 * Фото - заглушки (data.js src: null, assets/CREDITS.md "Placeholders"), пропорція 3:4.
 * Параметри відладки: cat=<id категорії>, q=<запит> (відкриває рядок пошуку).
 *
 * Сітка перемальовується лише при зміні відфільтрованого набору/обраного (сигнатура), фокус повертається на ту саму кнопку.
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { icon } from '../icons.js';
import { h, esc, showToast } from '../ui.js';
import { iconButton, navBar, categoryChip, searchField, button } from '../components.js';
import { haptic } from '../haptic.js';
import { inspo, inspoCategories } from '../data.js';
import { titleOf, isFav, toggleFav, inspoPhoto, applyPoseGuide } from '../inspo.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.S10;
const ROWS = [inspoCategories.slice(0, 4), inspoCategories.slice(4)];

/* ---------- розмітка ---------- */

function skeleton() {
  const rows = ROWS.map((row, i) => `
    <div class="insp__row" data-row="${i}">
      ${row.map((c) => categoryChip({ id: c.id, emoji: c.emoji, img: c.img, label: copy.inspoCategories[c.id], ariaLabel: t.a11y.category(copy.inspoCategories[c.id], false), pressed: false })).join('')}
    </div>`).join('');
  const end = `${iconButton({ name: 'plus', label: t.nav.add, variant: 'solid', action: 'add' })}${iconButton({ name: 'magnifying-glass', label: t.nav.search, variant: 'solid', action: 'search-open' })}`;
  return `
  <section class="insp" data-theme="light">
    ${navBar({ title: t.title, backLabel: t.nav.back, end, className: 'insp__nav' })}
    <div class="insp__search" hidden>
      ${searchField({ placeholder: t.search.placeholder, label: t.nav.search, clearLabel: t.search.clear })}
      ${button({ label: t.search.cancel, variant: 'text', size: 'sm', action: 'search-close' })}
    </div>
    <div class="insp__chips" role="group" aria-label="${esc(t.a11y.categories)}">${rows}</div>
    <div class="insp__scroll" data-scroll>
      <div class="insp__grid" data-bind="grid"></div>
      <div class="insp__empty" data-bind="empty" hidden></div>
    </div>
    <p class="sr-only" aria-live="polite" data-bind="live"></p>
  </section>`;
}

function cardHTML(item, state) {
  const title = titleOf(item.id);
  const fav = isFav(state, item.id);
  return `
    <div class="insp__cell">
      <div class="insp-card" data-theme="dark">
        <button class="insp-card__open pressable" type="button" data-open="${item.id}" aria-label="${esc(t.a11y.open(title))}">${inspoPhoto(item, 'inspo-photo--card')}</button>
        <button class="icon-btn icon-btn--glass icon-btn--sm insp-card__fav" type="button" data-fav="${item.id}" aria-label="${esc(fav ? t.a11y.unfavorite(title) : t.a11y.favorite(title))}">${icon('star', fav ? 'solid' : 'outline')}</button>
        <button class="icon-btn icon-btn--glass icon-btn--sm insp-card__pose" type="button" data-pose="${item.id}" aria-label="${esc(t.a11y.pose(title))}">${icon('user')}</button>
      </div>
    </div>`;
}

function emptyHTML(ui) {
  const q = ui.query.trim();
  if (q) {
    return `${icon('magnifying-glass', 'outline', { className: 'insp__empty-icon' })}
      <h2 class="insp__empty-title t-headline">${esc(t.search.emptyTitle(q))}</h2>
      <p class="insp__empty-text t-footnote">${esc(t.search.emptyMessage)}</p>`;
  }
  const e = t.emptyCategory[ui.category] || t.emptyCategory.default;
  return `${icon(ui.category === 'favorites' ? 'star' : 'photo', 'outline', { className: 'insp__empty-icon' })}
    <h2 class="insp__empty-title t-headline">${esc(e.title)}</h2>
    <p class="insp__empty-text t-footnote">${esc(e.message)}</p>`;
}

/* ---------- фільтр ---------- */

function visible(state, ui) {
  const q = ui.query.trim().toLowerCase();
  return inspo.filter((x) => {
    if (ui.category === 'favorites' ? !isFav(state, x.id) : ui.category && x.category !== ui.category) return false;
    if (!q) return true;
    const it = t.items[x.id];
    return `${it.title} ${it.alt}`.toLowerCase().includes(q); // за назвою і описом кадру: "street" знаходить Neon crosswalk
  });
}

/* ---------- точкове оновлення ---------- */

function sync(el, state, ui) {
  const q = (s) => el.querySelector(s);
  const list = visible(state, ui);

  // чіпи
  el.querySelectorAll('[data-category]').forEach((b) => {
    const on = b.dataset.category === ui.category;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', t.a11y.category(copy.inspoCategories[b.dataset.category], on));
  });

  // режим пошуку: рядок замість навбара
  q('.navbar').hidden = ui.searching;
  q('.insp__search').hidden = !ui.searching;
  q('.search-field__clear').hidden = ui.query === '';

  // сітка
  const grid = q('[data-bind="grid"]');
  const sig = JSON.stringify([list.map((x) => [x.id, isFav(state, x.id)])]);
  if (ui.sig !== sig) {
    const focused = document.activeElement?.dataset?.fav || document.activeElement?.dataset?.pose;
    const kind = document.activeElement?.dataset?.fav ? 'fav' : 'pose';
    grid.innerHTML = list.map((x) => cardHTML(x, state)).join('');
    if (focused && el.contains(document.activeElement) === false) q(`[data-${kind}="${focused}"]`)?.focus({ preventScroll: true });
    ui.sig = sig;
    q('[data-bind="live"]').textContent = t.a11y.resultCount(list.length);
  }
  grid.hidden = list.length === 0;
  const empty = q('[data-bind="empty"]');
  empty.hidden = list.length !== 0;
  if (list.length === 0) empty.innerHTML = emptyHTML(ui);
}

/* ---------- дії ---------- */

function openSearch(el, ui) {
  ui.searching = true;
  sync(el, store.get(), ui);
  el.querySelector('.search-field__input').focus({ preventScroll: true });
}

function closeSearch(el, ui) {
  ui.searching = false;
  ui.query = '';
  el.querySelector('.search-field__input').value = '';
  sync(el, store.get(), ui);
  el.querySelector('[data-action="search-open"]')?.focus({ preventScroll: true });
}

export function render(initial, ctx) {
  const state = applyRouteParams(ctx.params, { overCamera: true });
  const known = inspoCategories.some((c) => c.id === ctx.params.cat);
  const ui = { category: known ? ctx.params.cat : null, query: ctx.params.q || '', searching: Boolean(ctx.params.q), sig: null };
  const el = h(skeleton());
  el._ui = ui;
  const input = el.querySelector('.search-field__input');
  input.value = ui.query;

  el.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (chip) {
      haptic('light');
      ui.category = ui.category === chip.dataset.category ? null : chip.dataset.category;
      sync(el, store.get(), ui);
      return;
    }
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(fav.dataset.fav); return; }
    const pose = e.target.closest('[data-pose]');
    if (pose) { applyPoseGuide(pose.dataset.pose, ctx.router); return; }
    const open = e.target.closest('[data-open]');
    if (open) { haptic('light'); ctx.router.push('S11', { id: open.dataset.open }); return; }
    const a = e.target.closest('[data-action]');
    if (!a || a.getAttribute('aria-disabled') === 'true') return;
    switch (a.dataset.action) {
      case 'back': ctx.router.back(); break;
      case 'add': haptic('light'); showToast({ kind: 'info', message: t.plusSoon }); break; // TODO: New Inspo (скрін 28), Next DEV-DOC
      case 'search-open': haptic('light'); openSearch(el, ui); break;
      case 'search-close': haptic('light'); closeSearch(el, ui); break;
      case 'search-clear': haptic('light'); ui.query = ''; input.value = ''; input.focus({ preventScroll: true }); sync(el, store.get(), ui); break;
      default: break;
    }
  });
  input.addEventListener('input', () => { ui.query = input.value; sync(el, store.get(), ui); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.searching) closeSearch(el, ui); });

  sync(el, state, ui);
  return el;
}

export function update(el, state) {
  sync(el, state, el._ui);
}
