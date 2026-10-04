/**
 * demo-seed.js - тестові сесії для debug (Phase 4: S06-S09 відкриваються без живої зйомки).
 *
 * Не UI продукту: лише наповнює state.sessions кадрами-заглушками (нейтральна заливка з токенів + відтінок, без фото -
 * CLAUDE.md 1.12: фото PerPic/випадкових не підставляємо). Форма запису збігається з session.js finish():
 *   session = { id, startedAt, lookId, photos: [{ id, src, kept, pick, fav }] }
 *   kept: null (не переглянуто) | true | false;  pick: boolean;  fav: boolean.
 *
 * Параметри роуту (читає seedFromParams, викликається з render() екрана):
 *   seed=<N>          додати сесію з N кадрами (типово 8), якщо state.sessions порожній
 *   picks=<i,i,...>   індекси кадрів із pick (типово перші два з не-крайніх)
 *   kept=<none|all|mix>  none (null, типово) | all (true) | mix (чергування true/false)
 *   favs=<i,i,...>    індекси улюблених
 *   look=<id>         lookId сесії (типово state.lookId)
 *   ts=<ms>           startedAt (типово фіксований Fri 18:44 для детермінованих кадрів)
 * Ідемпотентно: якщо в state.sessions уже є сесія з id 'demo-<N>', нічого не додає.
 */
import * as store from './state.js';

// Fri Oct 02 2026 18:44 (локальний час) - формат copy.sessionTitle -> "Fri 18:44"
const DEFAULT_TS = new Date(2026, 9, 2, 18, 44).getTime();

/** Токен з :root (tokens.css) - canvas не читає var(), тому беремо обчислене значення */
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Відтінки кадрів-заглушок чергуються з токенів заглушок (небо, земля, акцент) - без літералів кольору в JS */
const TINTS = ['--ph-sky', '--ph-ground', '--accent'];

/** Кадр-заглушка 3:4: нейтральна заливка --ph-neutral + слабкий відтінок токена (щоб кадри відрізнялись у стопці/сітці) */
function stubFrame(i) {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 400;
  const g = c.getContext('2d');
  g.fillStyle = token('--ph-neutral'); g.fillRect(0, 0, 300, 400);
  g.globalAlpha = 0.3; g.fillStyle = token(TINTS[i % TINTS.length]); g.fillRect(0, 0, 300, 400);
  // силует-плашка, щоб кадри читались як "зйомка", а не плоска заливка
  g.globalAlpha = 0.4; g.fillStyle = token('--black');
  g.beginPath(); g.ellipse(150, 170, 46, 56, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(96, 226, 108, 174);
  return c.toDataURL('image/jpeg', 0.7);
}

function list(v) {
  return String(v || '').split(',').map((x) => parseInt(x, 10)).filter((x) => !Number.isNaN(x));
}

export function makeSession({ n = 8, picks = null, kept = 'none', favs = [], lookId = 'standard', ts = DEFAULT_TS } = {}) {
  const pickSet = new Set(picks ?? (n > 2 ? [Math.min(1, n - 1), Math.min(Math.max(n - 3, 1), n - 1)] : [0]));
  const favSet = new Set(favs);
  const photos = Array.from({ length: n }, (_, i) => ({
    id: `demo-${n}-p${i}`,
    src: stubFrame(i),
    ph: true, // заглушка (CREDITS.md "Placeholders" -> session-frame); живі кадри S05 цього прапора не мають
    kept: kept === 'all' ? true : kept === 'mix' ? i % 2 === 0 : null,
    pick: pickSet.has(i),
    fav: favSet.has(i),
  }));
  return { id: `demo-${n}`, startedAt: ts, lookId, photos };
}

/** Викликати з render() екрана. params - об'єкт параметрів роуту. Повертає true, якщо сесію додано. */
export function seedFromParams(params = {}) {
  if (params.seed == null) return false;
  const n = Math.max(1, Math.min(50, parseInt(params.seed, 10) || 8));
  const s = store.get();
  if (s.sessions.some((x) => x.id === `demo-${n}`)) return false;
  const session = makeSession({
    n,
    picks: params.picks != null ? list(params.picks) : null,
    kept: params.kept || 'none',
    favs: list(params.favs),
    lookId: params.look || s.lookId,
    ts: params.ts ? parseInt(params.ts, 10) : DEFAULT_TS,
  });
  store.set({ sessions: [...s.sessions, session] });
  return true;
}
