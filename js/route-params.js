/**
 * route-params.js - параметри стану в URL роуту (CLAUDE.md 1.11: debug відкриває будь-який
 * екран у будь-якому стані; рендер - tools/screen-render --query).
 *
 *   session=<presetId>  S04: SessionChip з пресетом (configured = true), напр. S04?session=outfit
 *   preset=<presetId>   H02/H03: значення пресета (без configured), напр. H02?preset=outfit
 *   look=<id|назва>     state.lookId: id з data.js (warm/cool/mono) або назва/слаг (honey, blue-hour, "Blue Hour", graphite);
 *                       нерозпізнане - ігнорується, поточний look лишається; free + locked - не застосовується;
 *                       H04 додатково ставить цей стиль по центру каруселі
 *   plus=1|0            isPlus
 *   aspect=<r>          camera.aspect (3:4, 9:16, 1:1, 4:3, 16:9)
 *   used=<n>            exports.used (S08: used=3 -> "2 exports left"); photos=notDetermined|granted|denied -> permissions.photos
 *   camera=notDetermined|granted|denied   permissions.camera (S12-permissions)
 *   settings=grid:0,level:1,saveMode:picks  state.settings: 0/1 -> boolean, інше - рядок; невідомі ключі ігноруються (S12-*)
 *   storage=mock|empty  state.storage: типові mock-розміри або 0 KB (S12-storage)
 *   pose=<id inspo|1|0>  state.poseGuide: inspo-NN (або 1 = типовий референс) вмикає накладку pose guide, 0 вимикає; opacity=<0.1..0.7>
 *   open=<name>         S12-*: одразу відкрити pull-down меню рядка (data-menu), для відладки і рендеру
 *
 * Застосовується один раз при першому рендері роуту (не в update), звичайним store.set -
 * екрани під листом (S04) теж оновлюються.
 */

import * as store from './state.js';
import { defaults } from './state.js';
import { presets, looks, aspectRatios } from './data.js';
import { copy } from './copy.js';
import { byId, DEBUG_POSE_ID, POSE_OPACITY } from './inspo.js';

export function presetValues(id) {
  const p = presets.find((x) => x.id === id);
  return p ? { delay: p.delay, count: p.count, interval: p.interval, presetId: p.id } : null;
}

const warned = new Set(); // одне попередження на значення (роут перемальовується багато разів)

/** "warm" | "honey" | "Honey" -> id з data.js */
export function lookIdFrom(param) {
  if (!param) return null;
  const norm = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, ''); // "Blue Hour" = "blue-hour" = "bluehour"
  const q = norm(param);
  const byId = looks.find((l) => norm(l.id) === q);
  if (byId) return byId.id;
  const byName = looks.find((l) => norm(copy.looks[l.id] || '') === q);
  if (!byName && !warned.has(q)) { warned.add(q); console.warn(`route-params: look "${param}" не розпізнано - лишаю поточний`); }
  return byName ? byName.id : null;
}

/** Pose guide (FR-8.3): ?pose= і ?opacity= для відладки S04 / S05 без проходу через S10 / S11 */
export function poseGuidePatch(params = {}) {
  const patch = {};
  if (params.pose === '0') patch.inspoId = null;
  else if (params.pose === '1') patch.inspoId = DEBUG_POSE_ID;
  else if (params.pose && byId(params.pose)) patch.inspoId = params.pose;
  const o = parseFloat(params.opacity);
  if (!Number.isNaN(o)) patch.opacity = Math.min(POSE_OPACITY.max, Math.max(POSE_OPACITY.min, o));
  return Object.keys(patch).length ? { poseGuide: patch } : null;
}

/** opts.overCamera - роут лежить поверх S04 (листи): coach mark S04 до цього вже пройдений */
export function applyRouteParams(params = {}, { overCamera = false } = {}) {
  const s = store.get();
  const patch = {};
  if (params.plus === '1' || params.plus === '0') patch.isPlus = params.plus === '1';
  if (params.aspect && aspectRatios.includes(params.aspect)) patch.camera = { aspect: params.aspect };
  // Phase 4 (S08, S09, A02, T01): лічильник експорту і дозвіл Photos для детермінованих кадрів
  if (params.used != null && !Number.isNaN(parseInt(params.used, 10))) patch.exports = { used: Math.max(0, parseInt(params.used, 10)) };
  if (['notDetermined', 'granted', 'denied'].includes(params.photos)) patch.permissions = { photos: params.photos };
  if (['notDetermined', 'granted', 'denied'].includes(params.camera)) patch.permissions = { ...patch.permissions, camera: params.camera };
  if (params.settings) {
    const known = Object.keys(s.settings);
    const next = {};
    for (const pair of params.settings.split(',')) {
      const [k, v] = pair.split(':');
      if (!known.includes(k)) continue;
      next[k] = v === '0' ? false : v === '1' ? true : v;
    }
    if (Object.keys(next).length) patch.settings = next;
  }
  if (params.storage === 'empty') patch.storage = { usedMb: 0, generatedMb: 0, orphanedCount: 0, orphanedMb: 0 };
  if (params.storage === 'mock') patch.storage = defaults().storage;
  if (params.session) {
    const v = presetValues(params.session);
    if (v) patch.session = { ...v, configured: true };
  } else if (params.preset) {
    const v = presetValues(params.preset);
    if (v) patch.session = v;
  }
  if (params.look) {
    // locked-стиль у free не застосовується (FR-7.3) - H04 лише ставить його по центру
    const look = looks.find((l) => l.id === lookIdFrom(params.look));
    const plus = patch.isPlus ?? s.isPlus;
    if (look && (!look.plus || plus)) patch.lookId = look.id;
  }
  // сесія вже налаштована (session=) або лист поверх S04 - coach mark (FR-1.4) уже пройдений
  if ((overCamera || params.session) && !s.coachSeen) patch.coachSeen = true;
  Object.assign(patch, poseGuidePatch(params));
  if (Object.keys(patch).length) store.set(patch);
  return store.get();
}
