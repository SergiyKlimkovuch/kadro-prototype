/**
 * S12-permissions - FR-9 (Camera, Photos (export), Open iOS Settings), скрін 14b. Світла тема.
 * Статуси - з state.permissions (granted | denied | notDetermined) через copy.S12permissions.status; рядки не тапабельні.
 * Рядок "Settings" (рішення #54, пояснення під ним - #86): у вебі нема системних налаштувань, тому імітація - тост
 * copy.stub; змінити статуси в тесті можна через debug (Deny camera / Deny photos) або ?camera= / ?photos=.
 */

import { copy } from '../copy.js';
import { listRow, listSection } from '../components.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, toast } from '../settings.js';

const t = copy.S12permissions;

function bodyHTML(s) {
  const rows = [
    listRow({ title: t.rows.camera, value: t.status.camera[s.permissions.camera], kind: 'static', name: 'camera' }),
    listRow({ title: t.rows.photos, value: t.status.photos[s.permissions.photos], kind: 'static', name: 'photos' }),
    listRow({ title: t.rows.settings, subtitle: t.settingsHint, kind: 'external', name: 'settings', action: 'settings', ariaLabel: t.a11y.settings }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

function sync(el, s) {
  const set = (name, text) => {
    const n = el.querySelector(`[data-bind="${name}-value"]`);
    if (n && n.textContent !== text) n.textContent = text;
  };
  set('camera', t.status.camera[s.permissions.camera]);
  set('photos', t.status.photos[s.permissions.photos]);
}

export function render(state, ctx) {
  const s = startState(ctx);
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {
    sync,
    actions: { settings: () => { haptic('light'); toast(t.stub); } },
  });
}

export function update(el, state) {
  sync(el, state);
}
