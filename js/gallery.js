/**
 * gallery.js - спільні похідні й мутації сесій для S08 і S09 (state.sessions, DEV-DOC "Модель стану").
 * Форма: session = { id, startedAt, lookId, photos: [{ id, src, kept, pick, fav }] }.
 * Мутації завжди створюють нові масиви (store.set замінює масиви цілком) - екрани оновлюються через subscribe.
 */
import * as store from './state.js';

/**
 * Сесія за id; id не задано - остання (мініатюра S04, S06 Skip, S07 Open gallery).
 * id задано, але сесії вже немає (видалена) - null, а не "остання": S09 не має підмінити сесію під собою.
 */
export function sessionFor(state, id) {
  if (id) return state.sessions.find((s) => s.id === id) || null;
  return state.sessions[state.sessions.length - 1] || null;
}

/** Лічильники блоків S08: Picks · All photos · Favorites */
export function counts(photos) {
  return {
    picks: photos.filter((p) => p.pick).length,
    all: photos.length,
    favorites: photos.filter((p) => p.fav).length,
  };
}

const FILTERS = {
  picks: (p) => p.pick,
  all: () => true,
  favorites: (p) => p.fav,
};

/** Кадри блоку з їхніми індексами в сесії (S09 гортає всю сесію, стартуючи з реального індексу) */
export function filtered(photos, filter) {
  const test = FILTERS[filter] || FILTERS.all;
  return photos.map((photo, index) => ({ photo, index })).filter((x) => test(x.photo));
}

function mapSession(sessionId, fn) {
  const s = store.get();
  store.set({ sessions: s.sessions.map((x) => (x.id === sessionId ? fn(x) : x)) });
}

export function patchPhoto(sessionId, photoId, patch) {
  mapSession(sessionId, (x) => ({ ...x, photos: x.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p)) }));
}

export function removePhoto(sessionId, photoId) {
  mapSession(sessionId, (x) => ({ ...x, photos: x.photos.filter((p) => p.id !== photoId) }));
}

export function removeSession(sessionId) {
  const s = store.get();
  store.set({ sessions: s.sessions.filter((x) => x.id !== sessionId) });
}

/** Скільки днів до скидання тижневого ліміту (state.exports.resetAt); минулу дату зсуваємо на тиждень уперед */
export function daysToReset(resetAt, now = Date.now()) {
  const DAY = 86400000;
  let d = Math.ceil((Date.parse(resetAt) - now) / DAY);
  if (Number.isNaN(d)) return 7;
  while (d < 0) d += 7;
  return d;
}
