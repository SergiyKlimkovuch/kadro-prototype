/**
 * A02 Photos access alert (FR-6.4, скрін 40) - системний алерт iOS поверх поточного екрана (тема - від шару під ним).
 * Компонент - Alert (components.md; ComponentsKit AlertVM); іконку Photos зі скріну не відтворюємо.
 * Don't Allow -> permissions.photos = denied -> T01; OK -> granted.
 *
 * Звичайний шлях - requestExport() у js/export.js: той самий опис (photosAlertDescriptor) відкривається ad-hoc
 * і продовжує експорт. Цей роут потрібен debug Jump і рендеру (#/A02): тут експорту немає,
 * тож Don't Allow лише показує T01 (як у реальному потоці), OK - ставить granted.
 */
import * as store from '../state.js';
import { seedFromParams } from '../demo-seed.js';
import { applyRouteParams } from '../route-params.js';
import { showToast } from '../ui.js';
import { photosAlertDescriptor, exportErrorDescriptor } from '../export.js';
import { haptic } from '../haptic.js';

export function render(state, ctx) {
  if (!ctx.ui) {
    ctx.ui = { init: true };
    seedFromParams(ctx.params);
    applyRouteParams(ctx.params, { overCamera: true });
  }
  return photosAlertDescriptor((result) => {
    if (result === 'denied') { haptic('warning'); showToast(exportErrorDescriptor()); }
    else haptic('success');
  });
}
