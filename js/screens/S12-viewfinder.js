/**
 * S12-viewfinder - FR-9 (Default aspect ratio, Composition grid, Level guide, Keep screen awake), скрін 11.
 * Aspect - pull-down меню, пише state.camera.aspect (той самий, що H01: окремого "default" у моделі стану немає,
 * open-questions #102). Grid / Level реально вмикають сітку і рівень у видошукачі S04 (S04 читає settings.grid / level),
 * Keep screen awake - Wake Lock у session.js (FR-4.5).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { listRow, listSection } from '../components.js';
import { aspectRatios } from '../data.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, menuOptions, pickMenu, syncMenuRow, syncToggles } from '../settings.js';

const t = copy.S12viewfinder;

function bodyHTML(s) {
  const rows = [
    listRow({ title: t.rows.aspect, value: s.camera.aspect, kind: 'menu', name: 'aspect' }),
    listRow({ title: t.rows.grid, kind: 'toggle', name: 'grid', checked: s.settings.grid }),
    listRow({ title: t.rows.level, kind: 'toggle', name: 'level', checked: s.settings.level }),
    listRow({ title: t.rows.awake, kind: 'toggle', name: 'keepAwake', checked: s.settings.keepAwake }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

function sync(el, s) {
  syncMenuRow(el, 'aspect', copy.H01.chip(s.camera.aspect), t.a11y.aspect(s.camera.aspect));
}

export function render(state, ctx) {
  const s = startState(ctx);
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {
    sync,
    menus: {
      aspect: (anchor) => pickMenu(anchor, {
        options: menuOptions(aspectRatios, { label: copy.H01.chip }),
        value: store.get().camera.aspect,
        onSelect: (r) => { haptic('light'); store.set({ camera: { aspect: r } }); },
      }),
    },
  });
}

export function update(el, state) {
  sync(el, state);
  syncToggles(el, state);
}
