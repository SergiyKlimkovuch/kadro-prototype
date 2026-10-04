/**
 * review.js - спільна логіка відбору для S06 Review і S07 Your keepers (open-questions #40).
 *
 * Модель: кадр сесії має kept: null (ще не переглянуто) | true (Keep) | false (Drop).
 * Рішення пишуться в store одразу (S07 і S08 рахують лише kept === true), порядок рішень -
 * в історії модуля (пам'ять сторінки, як і самі кадри), щоб Undo повертав ОСТАННЮ картку,
 * навіть після переходу S06 -> S07 -> назад.
 * Огляд завжди стосується ОСТАННЬОЇ сесії зі state.sessions (щойно знята, або demo-seed).
 */

import * as store from './state.js';

/** [{ sid, pid }] у порядку ухвалення рішень */
const history = [];

export function currentSession(state = store.get()) {
  return state.sessions[state.sessions.length - 1] || null;
}

/** Кадри, що чекають рішення, за порядком зйомки */
export function pending(session) {
  return session ? session.photos.filter((p) => p.kept === null) : [];
}

export function stats(session) {
  const photos = session ? session.photos : [];
  const kept = photos.filter((p) => p.kept === true).length;
  const dropped = photos.filter((p) => p.kept === false).length;
  return { total: photos.length, kept, dropped, pending: photos.length - kept - dropped };
}

function patchPhotos(sid, fn) {
  const s = store.get();
  store.set({
    sessions: s.sessions.map((x) => (x.id === sid ? { ...x, photos: x.photos.map(fn) } : x)),
  });
}

/** Keep (true) / Drop (false) для одного кадра */
export function decide(sid, pid, kept) {
  patchPhotos(sid, (p) => (p.id === pid ? { ...p, kept } : p));
  history.push({ sid, pid });
}

/** Done до кінця: нерозібрані кадри вважаються Keep (DEV-DOC S06). Кожен іде в історію, щоб Undo з S07 працював покроково */
export function keepRemaining(sid) {
  const s = store.get().sessions.find((x) => x.id === sid);
  if (!s) return;
  const ids = pending(s).map((p) => p.id);
  if (!ids.length) return;
  patchPhotos(sid, (p) => (ids.includes(p.id) ? { ...p, kept: true } : p));
  ids.forEach((pid) => history.push({ sid, pid }));
}

function lastDecided(session) {
  for (let i = history.length - 1; i >= 0; i--) {
    const e = history[i];
    const p = e.sid === session.id && session.photos.find((x) => x.id === e.pid);
    if (p && p.kept !== null) return { entry: i, photo: p };
  }
  // історії немає (debug-сесія з kept=mix): останній кадр із рішенням за порядком
  for (let i = session.photos.length - 1; i >= 0; i--) {
    if (session.photos[i].kept !== null) return { entry: -1, photo: session.photos[i] };
  }
  return null;
}

export function canUndo(sid) {
  const session = store.get().sessions.find((x) => x.id === sid);
  return Boolean(session && lastDecided(session));
}

/** Скасувати останнє рішення -> { photo, wasKept } (photo уже з kept: null) або null */
export function undo(sid) {
  const session = store.get().sessions.find((x) => x.id === sid);
  const last = session && lastDecided(session);
  if (!last) return null;
  if (last.entry >= 0) history.splice(last.entry, 1);
  const wasKept = last.photo.kept === true;
  patchPhotos(sid, (p) => (p.id === last.photo.id ? { ...p, kept: null } : p));
  const fresh = store.get().sessions.find((x) => x.id === sid).photos.find((p) => p.id === last.photo.id);
  return { photo: fresh, wasKept };
}
