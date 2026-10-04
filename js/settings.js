/**
 * settings.js - спільний каркас S12 і підекранів S12-<розділ> (DEV-DOC "### S12", FR-9).
 * Світла тема, grouped-список на --bg-grouped, NavBar (Back + заголовок), скрол зі списками.
 * Екран збирає тіло з listSection()/listRow() (components.js) і віддає сюди; тут - спільна поведінка:
 *   - Back (data-action="back"), тогли (data-toggle = ключ state.settings, пишуть у store);
 *   - pull-down меню рядків (data-menu = ім'я з `menus`), ?open=<ім'я> відкриває меню одразу (debug / рендер);
 *   - решта data-action - в `actions`; disabled-рядки (aria-disabled) ігноруються.
 * Меню стоїть над рівним світлим фоном -> solid (CLAUDE.md 1.7, open-questions #72).
 */

import * as store from './state.js';
import { copy } from './copy.js';
import { h, openMenu, showToast } from './ui.js';
import { navBar } from './components.js';
import { haptic } from './haptic.js';
import { applyRouteParams } from './route-params.js';

/** Розмітка каркаса: NavBar + скрол-контейнер з тілом (hero - необов'язковий блок над списками) */
export function shellHTML({ title, hero = '', body }) {
  return `
    <section class="stg" data-theme="light">
      ${navBar({ title, backLabel: copy.S12.a11y.back })}
      <div class="stg__scroll" data-scroll>
        ${hero}
        ${body}
      </div>
    </section>`;
}

/** Пункти pull-down меню: values -> options; label(v) - текст, tag(v) - Plus-позначка */
export function menuOptions(values, { label, tag }) {
  return values.map((v) => ({ value: v, label: label(v), tag: tag?.(v) }));
}

/** Тогли за state.settings: синхронізація aria-checked (transition працює, бо вузол не перестворюється) */
export function syncToggles(el, state) {
  el.querySelectorAll('[data-toggle]').forEach((t) => {
    t.setAttribute('aria-checked', String(Boolean(state.settings[t.dataset.toggle])));
  });
}

/** Значення + aria-label рядка-меню */
export function syncMenuRow(el, name, valueText, ariaLabel) {
  const row = el.querySelector(`[data-menu="${name}"]`);
  if (!row) return;
  const v = row.querySelector('.list-row__value');
  if (v && v.textContent !== valueText) v.textContent = valueText;
  if (ariaLabel) row.setAttribute('aria-label', ariaLabel);
}

/**
 * Збирає екран: html -> Element + обробники.
 * menus: { <name>: (anchor, ctx) => void } - відкриває меню рядка data-menu="<name>"
 * actions: { <action>: (target, ctx) => void }
 * sync(el, state): точкове оновлення значень (викликається і одразу, і з update())
 */
export function mountSettings(html, ctx, { menus = {}, actions = {}, sync }) {
  const el = h(html);
  el.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle]');
    if (toggleBtn) {
      haptic('light');
      const key = toggleBtn.dataset.toggle;
      store.set({ settings: { [key]: !store.get().settings[key] } });
      return;
    }
    const menuRow = e.target.closest('[data-menu]');
    if (menuRow) {
      haptic('light');
      menus[menuRow.dataset.menu]?.(menuRow, ctx);
      return;
    }
    const a = e.target.closest('[data-action]');
    if (!a || a.getAttribute('aria-disabled') === 'true') return;
    if (a.dataset.action === 'back') { ctx.router.back(); return; }
    actions[a.dataset.action]?.(a, ctx);
  });
  sync?.(el, store.get());
  syncToggles(el, store.get());
  const open = ctx.params.open;
  if (open && menus[open]) {
    requestAnimationFrame(() => {
      const row = el.querySelector(`[data-menu="${open}"]`);
      if (row) { row.scrollIntoView({ block: 'center' }); menus[open](row, ctx); }
    });
  }
  return el;
}

/** Застосувати параметри роуту один раз у render() (plus=, camera=, settings=, storage=, ...) */
export function startState(ctx) {
  return applyRouteParams(ctx.params, { overCamera: true });
}

/** pull-down меню рядка: solid над рівним фоном */
export function pickMenu(anchor, { options, value, onSelect }) {
  return openMenu({ anchor, options, value, onSelect, solid: true });
}

/** Тост поверх світлого екрана (тема береться з верхнього шару) */
export function toast(message, kind = 'info') {
  return showToast({ kind, message });
}
