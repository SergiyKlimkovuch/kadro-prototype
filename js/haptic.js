/**
 * haptic.js - заглушка. Haptics у вебі не імітуємо (DEV-DOC "Що імітуємо"),
 * виклик лише позначає місце для нативу. Debug-панель показує останній виклик.
 * light - вибір чіпа/пресету; medium - кадр, Keep/Drop; success - експорт, покупка;
 * warning - помилка експорту (DEV-DOC "Анімації та мікровзаємодії").
 */

const KINDS = new Set(['light', 'medium', 'success', 'warning']);
let last = null;

export function haptic(kind) {
  if (!KINDS.has(kind)) throw new Error(`haptic(): невідомий тип "${kind}"`);
  last = kind;
  window.dispatchEvent(new CustomEvent('kadro:haptic', { detail: kind }));
}

export function lastHaptic() {
  return last;
}
