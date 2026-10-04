/**
 * export.js - логіка експорту (DEV-DOC S08, FR-6.3, FR-6.4, open-questions #2, #53).
 * Викликається з S08 (scope 'session'), S09 ('photo') і S07 ('selects').
 *
 *   requestExport(photos, { scope, router, ui }) -> Promise<'exported' | 'paywall' | 'denied' | 'empty'>
 *
 * Послідовність:
 *   1. free і exports.used >= exports.limit  -> M01 (source=export); ліміт не списується.
 *   2. permissions.photos === 'notDetermined' -> A02 (Allow/OK -> granted і експорт триває; Don't Allow -> denied -> T01).
 *   3. permissions.photos === 'denied'        -> T01 одразу; ЛІМІТ НЕ СПИСУЄТЬСЯ (FR-6.4).
 *   4. granted -> "збереження": тост copy.S08.toast.saved(n) і ОДИН раз exports.used + 1 для free
 *      (рішення #53: один запит експорту = одне списання, незалежно від кількості фото; Plus не рахується).
 * Фото нікуди реально не пишуться - це симуляція (DEV-DOC "Що імітуємо").
 */
import { copy } from './copy.js';
import * as store from './state.js';
import { haptic } from './haptic.js';
import { openAlert, showToast } from './ui.js';
import * as routerModule from './router.js';

let inFlight = false;

/** Опис A02 (alert) для routed-екрана і для ad-hoc виклику; onResult('granted' | 'denied') */
export function photosAlertDescriptor(onResult) {
  const t = copy.A02;
  return {
    title: t.title,
    message: t.message,
    actions: [
      { label: t.dontAllow, onTap: () => { haptic('light'); store.set({ permissions: { photos: 'denied' } }); onResult('denied'); } },
      { label: t.ok, preferred: true, onTap: () => { store.set({ permissions: { photos: 'granted' } }); onResult('granted'); } },
    ],
  };
}

/**
 * Опис T01 (error-тост). Дія "Settings" - ІМІТАЦІЯ переходу в iOS Settings (як Settings на S04.off):
 * користувач ніби вмикає доступ там і повертається, тож permissions.photos = 'granted'. Повторний експорт
 * автоматично не запускаємо - користувач сам натисне Export ще раз.
 */
export function exportErrorDescriptor() {
  const t = copy.T01;
  return {
    kind: 'error',
    message: t.message,
    action: {
      label: t.action,
      ariaLabel: t.a11y.action,
      onTap: () => { haptic('light'); store.set({ permissions: { photos: 'granted' } }); },
    },
  };
}

function askPhotosAccess(ui) {
  return new Promise((resolve) => {
    ui.openAlert(photosAlertDescriptor(resolve));
  });
}

export async function requestExport(photos, { scope, router = routerModule.api, ui = { openAlert, showToast } } = {}) {
  const n = photos?.length || 0;
  if (n === 0) return 'empty';
  if (inFlight) return 'busy';
  inFlight = true;
  try {
    const s = store.get();
    if (!s.isPlus && s.exports.used >= s.exports.limit) {
      router.push('M01', { source: 'export' });
      return 'paywall';
    }

    let access = s.permissions.photos;
    if (access === 'notDetermined') access = await askPhotosAccess(ui);

    if (access !== 'granted') {
      haptic('warning');
      ui.showToast(exportErrorDescriptor());
      return 'denied';
    }

    haptic('success');
    ui.showToast({ kind: 'info', message: copy.S08.toast.saved(n) });
    const cur = store.get();
    if (!cur.isPlus) store.set({ exports: { used: cur.exports.used + 1 } });
    document.dispatchEvent(new CustomEvent('kadro:export', { detail: { scope, count: n } }));
    return 'exported';
  } finally {
    inFlight = false;
  }
}
