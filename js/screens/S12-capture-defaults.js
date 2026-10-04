/**
 * S12-capture-defaults - FR-9 (Start delay, Interval, Photo count, Default look), скріни 09, 10. Світла тема, push з S12.
 * Рядки-меню (pull-down, ListRow menu): значення пишуться в state.session (S04 SessionChip / H02 / S05 беруть їх як
 * стартові) і state.lookId. Composition grid тут не дублюємо - лише у Viewfinder (open-questions #82).
 * Ручна зміна скидає presetId, якщо значення не збігаються з жодним пресетом (як H03).
 * Plus-стиль у меню Default look: тег PLUS, у free тап -> M01 (source: look), стиль не застосовується (FR-7.3).
 * Меню показує поточне значення, навіть якщо його немає в типовому ряді (відредаговане в H03).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { listRow, listSection } from '../components.js';
import { ranges, presets, looks } from '../data.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, menuOptions, pickMenu, syncMenuRow } from '../settings.js';

const t = copy.S12capture;

/** Типові ряди меню (скрін 09: 0s…30s; скрін 10: 5…100 photos) [approx] */
const INTERVALS = [1, 2, 3, 5, 10];
const COUNTS = [5, 10, 15, 20, 30, 50];

const withCurrent = (list, v) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b));

const FIELDS = {
  delay: { title: t.rows.delay, values: () => ranges.delay, label: t.delayOption, read: (s) => s.session.delay },
  interval: { title: t.rows.interval, values: () => INTERVALS, label: t.intervalOption, read: (s) => s.session.interval },
  count: { title: t.rows.count, values: () => COUNTS, label: t.countOption, read: (s) => s.session.count },
};

function matchPreset(v) {
  return presets.find((p) => p.delay === v.delay && p.count === v.count && p.interval === v.interval)?.id ?? null;
}

function lookText(s) {
  return t.lookOption(s.lookId);
}

function valueOf(name, s) {
  return name === 'look' ? lookText(s) : FIELDS[name].label(FIELDS[name].read(s));
}

function bodyHTML(s) {
  const rows = [
    ...['delay', 'interval', 'count'].map((n) => listRow({ title: FIELDS[n].title, value: valueOf(n, s), kind: 'menu', name: n })),
    listRow({ title: t.rows.look, value: valueOf('look', s), kind: 'menu', name: 'look' }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

function sync(el, s) {
  ['delay', 'interval', 'count', 'look'].forEach((n) => {
    const title = n === 'look' ? t.rows.look : FIELDS[n].title;
    const v = valueOf(n, s);
    syncMenuRow(el, n, v, t.a11y.menu(title, v));
  });
}

export function render(state, ctx) {
  const s = startState(ctx);
  const field = (name) => (anchor) => {
    const cur = store.get();
    const f = FIELDS[name];
    const value = f.read(cur);
    pickMenu(anchor, {
      options: menuOptions(withCurrent(f.values(), value), { label: f.label }),
      value,
      onSelect: (v) => {
        haptic('light');
        const next = { ...store.get().session, [name]: v };
        store.set({ session: { [name]: v, presetId: matchPreset(next) } });
      },
    });
  };
  const lookMenu = (anchor) => {
    const cur = store.get();
    pickMenu(anchor, {
      options: menuOptions(looks.map((l) => l.id), {
        label: t.lookOption,
        tag: (id) => (looks.find((l) => l.id === id).plus && !cur.isPlus ? t.plusTag : undefined),
      }),
      value: cur.lookId,
      onSelect: (id) => {
        const look = looks.find((l) => l.id === id);
        if (look.plus && !store.get().isPlus) { ctx.router.push('M01', { source: 'look' }); return; }
        haptic('light');
        store.set({ lookId: id });
      },
    });
  };
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {
    sync,
    menus: { delay: field('delay'), interval: field('interval'), count: field('count'), look: lookMenu },
  });
}

export function update(el, state) {
  sync(el, state);
}
