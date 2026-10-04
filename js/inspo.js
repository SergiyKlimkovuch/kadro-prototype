/**
 * inspo.js - спільна логіка S10 Inspo, S11 Reference і Pose guide (S04/S05): дані, обране, фото-заглушка,
 * застосування pose guide. Назви й alt - copy.S10.items[id]; записи - data.js `inspo`.
 * Обране - state.inspoFavs (PERSISTED); накладка - state.poseGuide { inspoId, opacity } (не зберігається).
 */

import { copy } from './copy.js';
import * as store from './state.js';
import { icon } from './icons.js';
import { esc } from './ui.js';
import { haptic } from './haptic.js';
import { inspo as items } from './data.js';

/** Діапазон прозорості накладки: DEV-DOC S04 "слайдер прозорості 10-70%"; крок 5% - [approx] */
export const POSE_OPACITY = { min: 0.1, max: 0.7, step: 0.05 };
/** Референс за замовчуванням для debug ?state=pose-guide (Hallway satin look - скрін 32 PerPic) */
export const DEBUG_POSE_ID = 'inspo-02';

export const byId = (id) => items.find((x) => x.id === id) || null;
export const titleOf = (id) => copy.S10.items[id]?.title ?? '';
export const isFav = (state, id) => state.inspoFavs.includes(id);

export function toggleFav(id) {
  const favs = store.get().inspoFavs;
  haptic('light');
  store.set({ inspoFavs: favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id] });
}

/**
 * Фото референса 3:4. Без src (Unsplash недоступний, assets/CREDITS.md "Placeholders") - нейтральна заливка
 * з тоном за індексом і glyph `user` (Heroicons: позa; найближчий кандидат, див. components.md Icon).
 * decorative - без alt/role (накладка і мініатюра в панелі: назву озвучує сусідній елемент). Контейнер завжди є, щоб пропорція не залежала від наявності фото.
 */
export function inspoPhoto(item, className = '', { decorative = false } = {}) {
  const alt = decorative ? '' : copy.S10.a11y.photo(copy.S10.items[item.id]?.alt ?? '');
  const cls = `inspo-photo${className ? ` ${className}` : ''}`;
  if (item.src) {
    return `<span class="${cls}"><img class="inspo-photo__img" src="${esc(item.src)}" alt="${esc(alt)}" draggable="false"></span>`;
  }
  const tone = (items.indexOf(item) % 3) + 1;
  return `<span class="${cls}" data-tone="${tone}" data-photo-placeholder="${esc(item.id)}" ${decorative ? 'aria-hidden="true"' : `role="img" aria-label="${esc(alt)}"`}>${icon('user', 'solid', { className: 'inspo-photo__glyph' })}</span>`;
}

/**
 * "Use as pose guide": ставить референс у store і повертає на S04 (S10/S11 лежать поверх нього в стеку).
 * Назад - звичайні pop-и роутера (анімація), накладка вже видна під шаром, що від'їжджає.
 */
export async function applyPoseGuide(id, router) {
  haptic('medium');
  store.set({ poseGuide: { inspoId: id } });
  for (let guard = 0; guard < 4 && router.currentRoute()?.id !== 'S04' && router.canGoBack(); guard++) {
    await router.back();
  }
}
