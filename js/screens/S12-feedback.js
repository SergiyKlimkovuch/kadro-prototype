/**
 * S12-feedback - FR-9 (Flash before shot, Haptics, [+] Countdown sound). Лише тогли (скрін 11-стиль, без референсу окремого екрана).
 * Flash before shot -> білий спалах у S05 (settings.flashBeforeShot), Countdown sound -> тік у session.js,
 * Haptics -> виклики haptic() (у вебі лише позначки для нативу). Що саме робить Flash - open-questions #83.
 */

import { copy } from '../copy.js';
import { listRow, listSection } from '../components.js';
import { shellHTML, mountSettings, startState, syncToggles } from '../settings.js';

const t = copy.S12feedback;

function bodyHTML(s) {
  const rows = [
    listRow({ title: t.rows.flash, kind: 'toggle', name: 'flashBeforeShot', checked: s.settings.flashBeforeShot }),
    listRow({ title: t.rows.haptics, kind: 'toggle', name: 'haptics', checked: s.settings.haptics }),
    listRow({ title: t.rows.sound, kind: 'toggle', name: 'countdownSound', checked: s.settings.countdownSound }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

export function render(state, ctx) {
  const s = startState(ctx);
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {});
}

export function update(el, state) {
  syncToggles(el, state);
}
