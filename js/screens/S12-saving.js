/**
 * S12-saving - FR-9 (Save to Photos: Manually / Ask after each session / Auto-save picks (Plus) / Auto-save everything (Plus);
 * Keep originals), скріни 12, 13. Світла тема, push з S12.
 * Меню пише state.settings.saveMode. Plus-режими з тегом PLUS: у free тап -> M01 (source: saving), режим не змінюється.
 * Значення в рядку - copy.short ("Ask each time"): повний підпис "Ask after each session" не влазить поруч з назвою (375 pt);
 * у меню і в aria-label - повний (label). Auto-save у прототипі лише зберігає вибір: самого автозбереження немає
 * (PRD відносить його до Next, open-questions #88).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { listRow, listSection } from '../components.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, menuOptions, pickMenu, syncMenuRow, syncToggles } from '../settings.js';

const t = copy.S12saving;
const MODES = ['manual', 'ask', 'picks', 'all'];
const PLUS_MODES = ['picks', 'all'];

function bodyHTML(s) {
  const rows = [
    listRow({ title: t.rows.mode, value: t.modes[s.settings.saveMode].short, kind: 'menu', name: 'mode' }),
    listRow({ title: t.rows.originals, kind: 'toggle', name: 'keepOriginals', checked: s.settings.keepOriginals }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

function sync(el, s) {
  const m = t.modes[s.settings.saveMode];
  syncMenuRow(el, 'mode', m.short, `${t.rows.mode}, ${m.label}`);
}

export function render(state, ctx) {
  const s = startState(ctx);
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {
    sync,
    menus: {
      mode: (anchor) => {
        const cur = store.get();
        pickMenu(anchor, {
          options: menuOptions(MODES, {
            label: (m) => t.modes[m].label,
            tag: (m) => (PLUS_MODES.includes(m) && !cur.isPlus ? t.plusTag : undefined),
          }),
          value: cur.settings.saveMode,
          onSelect: (m) => {
            if (PLUS_MODES.includes(m) && !store.get().isPlus) { ctx.router.push('M01', { source: 'saving' }); return; }
            haptic('light');
            store.set({ settings: { saveMode: m } });
          },
        });
      },
    },
  });
}

export function update(el, state) {
  sync(el, state);
  syncToggles(el, state);
}
