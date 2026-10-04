/**
 * T01 Export error toast (FR-6.4 [+], скрін 41) - error-тост поверх S08 / S09: причина + вихід "Settings"
 * (замість "Couldn't save"). Компонент - Toast (components.md, kind error). Ліміт експорту не списується.
 * Звичайний шлях - requestExport() (js/export.js) показує цей самий опис ad-hoc; роут - для debug Jump і рендеру.
 * Дія Settings - імітація переходу в iOS Settings (permissions.photos = granted), див. export.js.
 */
import { seedFromParams } from '../demo-seed.js';
import { applyRouteParams } from '../route-params.js';
import { exportErrorDescriptor } from '../export.js';

export function render(state, ctx) {
  if (!ctx.ui) {
    ctx.ui = { init: true };
    seedFromParams(ctx.params);
    applyRouteParams(ctx.params, { overCamera: true });
  }
  return exportErrorDescriptor();
}
