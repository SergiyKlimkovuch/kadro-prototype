/**
 * state.js - єдиний store (DEV-DOC "Модель стану і логіка").
 * set(patch) робить глибоке злиття простих об'єктів (масиви й null замінюються цілком)
 * і сповіщає підписників (роутер перемальовує відкриті шари).
 * localStorage - лише налаштування, Plus і лічильник експорту; усе в try/catch
 * (приватний режим Safari не має ламати застосунок - DEV-DOC DoD).
 */

import { copy } from './copy.js';
import { inspo } from './data.js';

const STORAGE_KEY = 'kadro.state.v1';
const PERSISTED = ['onboarded', 'coachSeen', 'focalHintSeen', 'permissions', 'isPlus', 'exports', 'camera', 'session', 'lookId', 'settings', 'storage', 'inspoFavs'];

export function defaults() {
  return {
    route: { stack: ['S01'], sheet: null, modal: null },
    onboarded: false,
    coachSeen: false,        // S04 coach mark (FR-1.4): показується один раз
    focalHintSeen: false,    // S04 підказка першого тапа на фокусну (FR-2.3)
    permissions: { camera: 'notDetermined', photos: 'notDetermined' }, // granted | denied
    isPlus: false,
    exports: { used: 0, limit: 5, resetAt: '2026-10-10' },              // limit - open-questions #2
    camera: { facing: 'back', aspect: '3:4', flash: 'off', focal: 26, exposure: 0 },
    session: { delay: 10, count: 20, interval: 2, presetId: 'portrait', configured: false },
    lookId: 'standard',
    poseGuide: { inspoId: null, opacity: 0.4 }, // inspoId != null = накладка увімкнена (S04/S05); не зберігається між запусками
    inspoFavs: inspo.filter((x) => x.fav).map((x) => x.id), // S10/S11: id обраних референсів (стартові - fav у data.js)
    settings: {
      grid: true, level: true, keepAwake: true, flashBeforeShot: true,
      haptics: true, countdownSound: true, saveMode: 'manual', keepOriginals: true,
    },
    // S12-storage: [mock] розміри з copy (open-questions #100); Clear / Remove orphaned їх зменшують
    storage: {
      usedMb: copy.S12.mock.usedMb,
      generatedMb: copy.S12.mock.generatedMb,
      orphanedCount: copy.S12storage.mock.orphanedCount,
      orphanedMb: copy.S12storage.mock.orphanedMb,
    },
    run: null,
    sessions: [],
  };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function merge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    return merge(defaults(), pick(JSON.parse(raw), PERSISTED));
  } catch {
    return defaults();
  }
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pick(state, PERSISTED)));
  } catch {
    /* приватний режим / квота - працюємо лише в пам'яті */
  }
}

let state = load();
const subscribers = new Set();

export function get() {
  return state;
}

/**
 * set({ isPlus: true }) / set({ camera: { aspect: '1:1' } })
 * opts.silent - без перемальовки (роутер дзеркалить свій стек у state.route).
 */
export function set(patch, { silent = false } = {}) {
  state = merge(state, patch);
  save();
  if (!silent) subscribers.forEach((fn) => fn(state, patch));
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function reset() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* див. save() */
  }
  state = defaults();
  subscribers.forEach((fn) => fn(state, null));
}

/** Похідні значення - щоб екрани не рахували їх кожен по-своєму */
export const selectors = {
  exportsLeft: (s) => Math.max(0, s.exports.limit - s.exports.used),
  look: (s, looks) => looks.find((l) => l.id === s.lookId) || looks[0],
};
