/**
 * H03 Edit session values - DEV-DOC "### H02 Session / H03 Edit values", PRD FR-3.2.
 * Лист medium поверх H02: заголовок + Done, три барабани WheelPicker (Delay 0/3/5/10/15/30,
 * Photos 1-50, Interval 1-10), "Save as preset" - заглушка Next (бейдж Soon + тост).
 *  - Барабани змінюють локальну чернетку; store не чіпаємо до Done (закриття свайпом = скасування).
 *  - Done -> H02 з новими значеннями; presetId = пресет з тими самими значеннями або null
 *    (галочка в H02 знімається, FR-3.3).
 *  - Кожен крок барабана - haptic('light') (вибір значення, DEV-DOC).
 * Параметри: ?preset=outfit (route-params.js).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { h, esc, sheetHeaderHTML, showToast } from '../ui.js';
import { wheelSet, badge } from '../components.js';
import { haptic } from '../haptic.js';
import { presets, ranges } from '../data.js';
import { applyRouteParams } from '../route-params.js';
import { snapScroll } from '../snap-scroll.js';

const t = copy.H03;
const KEYS = ['delay', 'count', 'interval'];

const span = ({ min, max }) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const VALUES = { delay: ranges.delay, count: span(ranges.count), interval: span(ranges.interval) };

function unitFor(key, n) {
  const u = t.units[key];
  return typeof u === 'function' ? u(n) : u;
}

/** Найближче допустиме значення (сесія з localStorage могла мати значення поза набором) */
function nearestIndex(list, v) {
  let best = 0;
  list.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(list[best] - v)) best = i; });
  return best;
}

function matchPreset(d) {
  const p = presets.find((x) => x.delay === d.delay && x.count === d.count && x.interval === d.interval);
  return p ? p.id : null;
}

export function render(state, ctx) {
  const s = applyRouteParams(ctx.params, { overCamera: true });
  const draft = {};
  KEYS.forEach((k) => { draft[k] = VALUES[k][nearestIndex(VALUES[k], s.session[k])]; });

  const el = h(`
    <div class="sheet__content h03">
      ${sheetHeaderHTML({ title: t.title })}
      <div class="sheet__body" data-scroll>
        ${wheelSet({
          columns: KEYS.map((k) => ({
            name: k,
            label: t.labels[k],
            values: VALUES[k],
            value: draft[k],
            unit: (n) => unitFor(k, n),
            valueText: t.a11y.picker[k],
            rowText: t.pickerValue,
          })),
        })}
        <!-- TODO: власні пресети - Next, поза MVP (PRD "Скоуп"); кнопка aria-disabled, тап лишає тост "coming soon" -->
        <button class="btn btn--fill btn--block h03__save" type="button" aria-disabled="true" data-action="save-preset" aria-label="${esc(t.a11y.saveAsPreset)}">
          <span>${esc(t.saveAsPreset)}</span>${badge({ label: t.soonBadge, className: 'h03__soon' })}
        </button>
      </div>
    </div>`);

  // барабани: snap по центру, живе оновлення одиниці й aria, haptic на кожен крок
  const wheels = {};
  KEYS.forEach((k) => {
    const scroller = el.querySelector(`[data-wheel="${k}"]`);
    const rows = () => [...scroller.querySelectorAll('.wheel__row')];
    const unit = el.querySelector(`[data-unit="${k}"]`);
    const setValue = (i) => {
      const v = VALUES[k][i];
      if (v === undefined || v === draft[k]) return;
      draft[k] = v;
      haptic('light');
      unit.textContent = unitFor(k, v);
      scroller.setAttribute('aria-valuenow', String(v));
      scroller.setAttribute('aria-valuetext', t.a11y.picker[k](v));
    };
    const snap = snapScroll(scroller, { axis: 'y', align: 'center', items: rows, onChange: setValue });
    wheels[k] = snap;

    // тап по рядку - докрутити до нього (як у UIPickerView)
    scroller.addEventListener('click', (e) => {
      const row = e.target.closest('.wheel__row');
      if (row) snap.scrollTo(rows().indexOf(row));
    });
    // клавіатура: spinbutton - стрілки, Home / End
    scroller.addEventListener('keydown', (e) => {
      const i = VALUES[k].indexOf(draft[k]);
      const last = VALUES[k].length - 1;
      const next = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const j = Math.min(last, Math.max(0, next));
      setValue(j);
      snap.scrollTo(j);
    });
  });

  // початкова позиція барабанів - коли лист уже в DOM і має розміри
  requestAnimationFrame(() => {
    KEYS.forEach((k) => wheels[k].jumpTo(VALUES[k].indexOf(draft[k])));
  });

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-done]')) {
      // Done -> H02 з новими значеннями; лист закриває createSheetLayer (router.back)
      store.set({ session: { ...draft, presetId: matchPreset(draft) } });
      return;
    }
    if (e.target.closest('[data-action="save-preset"]')) {
      haptic('light');
      showToast({ kind: 'info', message: t.soonToast });
    }
  });
  return el;
}

/** Чернетка живе в листі: зміни store (напр. debug Toggle Plus) барабани не скидають */
export function update() {}
