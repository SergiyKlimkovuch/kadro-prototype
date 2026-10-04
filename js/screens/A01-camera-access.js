/**
 * A01 Camera access alert (FR-1.2, ref 05) - системний алерт iOS поверх S02 (тема dark від S02).
 * Don't Allow -> permissions.camera = denied -> S04 off; OK -> granted -> S04 live.
 * Компонент - Alert (components.md); іконку застосунку з референсу не відтворюємо.
 */
import { copy } from '../copy.js';
import * as store from '../state.js';
import { haptic } from '../haptic.js';

const t = copy.A01;

export function render(state, ctx) {
  // OK -> S04 без state: перший вхід, щоб показався coach (FR-1.4), як і в open-settings.
  const finish = (camera, st) => {
    store.set({ permissions: { camera }, onboarded: true });
    ctx.router.jump('S04', st ? { state: st } : {});
  };
  return {
    title: t.title,
    message: t.message,
    actions: [
      { label: t.dontAllow, onTap: () => { haptic('light'); finish('denied', 'off'); } },
      { label: t.ok, preferred: true, onTap: () => { haptic('success'); finish('granted'); } },
    ],
  };
}
