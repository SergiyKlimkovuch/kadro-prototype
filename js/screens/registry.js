/**
 * registry.js - інвентар екранів (DEV-DOC "Інвентар екранів" + open-questions #8, #9).
 * type: screen (push) | modal | sheet | alert | overlay | toast.
 * parent - що лежить під шаром, коли роут відкрито напряму за URL (debug / рендер).
 * theme - CLAUDE.md 1.8 + open-questions #7. Для sheet/alert/toast тема береться з шару під ним.
 * load - модуль екрана; без load роут показує плейсхолдер "not built" (screens/_placeholder.js).
 * Будуєш екран -> додай load: () => import('./<ID>-<slug>.js').
 */

export const SCREENS = {
  S01: { type: 'screen', theme: 'dark', phase: 2, root: true, slides: 4, load: () => import('./S01-onboarding.js') },
  S02: { type: 'screen', theme: 'dark', phase: 2, parent: 'S01', load: () => import('./S02-pre-permission.js') },
  A01: { type: 'alert', phase: 2, parent: 'S02', load: () => import('./A01-camera-access.js') },
  S04: { type: 'screen', theme: 'light', phase: 2, root: true, load: () => import('./S04-camera.js'), states: ['live', 'off', 'coach', 'pose-guide'] },
  H01: { type: 'sheet', detent: 'fit', phase: 3, parent: 'S04', load: () => import('./H01-aspect.js') },
  H02: { type: 'sheet', detent: 'medium', phase: 3, parent: 'S04', load: () => import('./H02-session.js') },
  H03: { type: 'sheet', detent: 'medium', phase: 3, parent: 'H02', load: () => import('./H03-edit-values.js') },
  H04: { type: 'sheet', detent: 'medium-tall', phase: 3, parent: 'S04', load: () => import('./H04-look.js') },
  S05: { type: 'modal', theme: 'dark', phase: 3, parent: 'S04', load: () => import('./S05-capture.js'), states: ['paused'] },
  S06: { type: 'modal', theme: 'dark', phase: 4, parent: 'S04', load: () => import('./S06-review.js') },
  S07: { type: 'modal', theme: 'dark', phase: 4, parent: 'S04', load: () => import('./S07-keepers.js') },
  S08: { type: 'screen', theme: 'light', phase: 4, parent: 'S04', load: () => import('./S08-gallery.js') },
  S09: { type: 'modal', theme: 'dark', phase: 4, parent: 'S08', load: () => import('./S09-viewer.js') },
  A02: { type: 'alert', phase: 4, parent: 'S08', load: () => import('./A02-photos-access.js') },
  T01: { type: 'toast', phase: 4, parent: 'S08', load: () => import('./T01-export-error.js') },
  S10: { type: 'screen', theme: 'light', phase: 6, parent: 'S04', load: () => import('./S10-inspo.js') },
  S11: { type: 'screen', theme: 'light', phase: 6, parent: 'S10', load: () => import('./S11-reference.js') },
  M01: { type: 'modal', theme: 'dark', phase: 5, parent: 'S04', load: () => import('./M01-paywall.js') },
  A03: { type: 'sheet', detent: 'fit', phase: 5, parent: 'M01', load: () => import('./A03-purchase.js') },
  S12: { type: 'screen', theme: 'light', phase: 5, parent: 'S04', load: () => import('./S12-settings.js') },
  'S12-capture-defaults': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-capture-defaults.js') },
  'S12-viewfinder': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-viewfinder.js') },
  'S12-feedback': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-feedback.js') },
  'S12-saving': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-saving.js') },
  'S12-storage': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-storage.js') },
  'S12-permissions': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-permissions.js') },
  'S12-about': { type: 'screen', theme: 'light', phase: 5, parent: 'S12', load: () => import('./S12-about.js') },

  /* Службові роути (не з інвентарю продукту) */
  _components: { type: 'screen', theme: 'light', phase: 1, root: true, load: () => import('./_components.js') },
};

export function entryFor(id) {
  return SCREENS[id] || null;
}

export function isBuilt(id) {
  return Boolean(SCREENS[id]?.load);
}

/** Ланцюжок від кореня до id через parent (для відкриття роуту напряму) */
export function chainFor(id) {
  const chain = [];
  let cur = id;
  const seen = new Set();
  while (cur && SCREENS[cur] && !seen.has(cur)) {
    seen.add(cur);
    chain.unshift(cur);
    cur = SCREENS[cur].parent;
  }
  return chain;
}
