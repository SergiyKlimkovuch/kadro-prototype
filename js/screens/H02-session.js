/**
 * H02 Session - DEV-DOC "### H02 Session / H03 Edit values", PRD FR-3.1, FR-3.3, FR-2.7; скріни 24, 25.
 * Лист medium поверх S04: "Session" + Done; блок "Session values" (Delay / Photos / Interval +
 * олівець -> H03); "Presets" - карусель PresetCard (radiogroup).
 *  - Тап на пресет: values = пресет, presetId = id, галочка (FR-3.3), haptic light (DEV-DOC).
 *  - Ручна зміна в H03 ставить presetId = null -> галочка знімається.
 *  - Done -> S04 з SessionChip: state.session.configured = true (FR-2.7).
 *    Закриття свайпом / тапом по фону - configured = true лише якщо щось змінено (open-questions #41, onClose).
 * Параметри: ?preset=outfit (route-params.js).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { h, esc, sheetHeaderHTML, radioKeys } from '../ui.js';
import { presetCard } from '../components.js';
import { icon } from '../icons.js';
import { haptic } from '../haptic.js';
import { presets } from '../data.js';
import { applyRouteParams } from '../route-params.js';
import { snapScroll } from '../snap-scroll.js';

const t = copy.H02;
const KEYS = ['delay', 'count', 'interval'];

function unitFor(key, n) {
  const u = t.units[key];
  return typeof u === 'function' ? u(n) : u;
}

function valuesHTML(session) {
  const cols = KEYS.map((k) => `
    <div class="h02-values__col" role="group" aria-label="${esc(t.a11y.value[k](session[k]))}">
      <span class="h02-values__label t-mono-caption" aria-hidden="true">${esc(t.labels[k])}</span>
      <span class="h02-values__value" aria-hidden="true"><span class="h02-values__num" data-bind="${k}">${session[k]}</span><span class="h02-values__unit" data-bind="${k}-unit">${esc(unitFor(k, session[k]))}</span></span>
    </div>`).join('');
  return `
    <div class="h02-values">
      ${cols}
      <button class="icon-btn icon-btn--plain h02-values__edit" type="button" data-action="edit" aria-label="${esc(t.a11y.edit)}">${icon('pencil')}</button>
    </div>`;
}

function presetsHTML(session) {
  return presets.map((p) => presetCard({
    id: p.id,
    name: t.presetName(p.id),
    values: t.presetValues(p),
    selected: session.presetId === p.id,
    label: t.a11y.preset(t.presetName(p.id), p),
  })).join('');
}

export function render(state, ctx) {
  const s = applyRouteParams(ctx.params, { overCamera: true });
  const el = h(`
    <div class="sheet__content h02">
      ${sheetHeaderHTML({ title: t.title })}
      <div class="sheet__body" data-scroll>
        <h3 class="sheet__section-title">${esc(t.valuesHeader)}</h3>
        ${valuesHTML(s.session)}
        <h3 class="sheet__section-title h02__presets-header">${esc(t.presetsHeader)}</h3>
        <div class="carousel h02__presets" role="radiogroup" aria-label="${esc(t.a11y.presetsGroup)}">${presetsHTML(s.session)}</div>
      </div>
    </div>`);

  // #41: закриття свайпом / скримом ставить configured лише якщо користувач щось змінив у листі
  const sv = s.session;
  el._ui = { initial: `${sv.delay}|${sv.count}|${sv.interval}|${sv.presetId}`, tapped: false };
  const strip = el.querySelector('.h02__presets');
  radioKeys(strip);
  const cards = () => [...strip.querySelectorAll('.preset-card')];
  const snap = snapScroll(strip, { axis: 'x', align: 'start', items: cards });

  // вибраний пресет у полі зору, коли лист відкрито (outfit/couples - за правим краєм)
  requestAnimationFrame(() => {
    const i = presets.findIndex((p) => p.id === store.get().session.presetId);
    if (i > 0) snap.jumpTo(i);
  });

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-done]')) {
      // Done -> S04 з SessionChip; сам лист закриває createSheetLayer (router.back)
      store.set({ session: { configured: true } });
      return;
    }
    if (e.target.closest('[data-action="edit"]')) {
      haptic('light');
      ctx.router.push('H03');
      return;
    }
    const card = e.target.closest('[data-preset]');
    if (card) {
      const p = presets.find((x) => x.id === card.dataset.preset);
      if (!p) return;
      haptic('light');
      el._ui.tapped = true;
      store.set({ session: { delay: p.delay, count: p.count, interval: p.interval, presetId: p.id } });
      snap.scrollTo(cards().indexOf(card));
    }
  });
  return el;
}

export function update(el, state) {
  const { session } = state;
  KEYS.forEach((k) => {
    el.querySelector(`[data-bind="${k}"]`).textContent = String(session[k]);
    el.querySelector(`[data-bind="${k}-unit"]`).textContent = unitFor(k, session[k]);
    el.querySelector(`[data-bind="${k}"]`).closest('[role="group"]').setAttribute('aria-label', t.a11y.value[k](session[k]));
  });
  el.querySelectorAll('[data-preset]').forEach((c) => {
    c.setAttribute('aria-checked', String(c.dataset.preset === session.presetId));
  });
}

/**
 * Хук роутера (reason 'back': Done, свайп, скрим): зміни в листі (тап пресету або значення з H03) -> SessionChip на S04.
 * Без змін - configured не чіпаємо (відкрив і закрив = чіпа немає).
 */
export function onClose(el, ctx, reason) {
  const ui = el._ui;
  if (!ui || reason !== 'back') return null;
  const sv = store.get().session;
  const changed = ui.tapped || `${sv.delay}|${sv.count}|${sv.interval}|${sv.presetId}` !== ui.initial;
  if (changed && !sv.configured) store.set({ session: { configured: true } });
  return null;
}
