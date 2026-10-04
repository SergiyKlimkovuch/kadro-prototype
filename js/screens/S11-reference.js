/**
 * S11 Reference - DEV-DOC "### S10 Inspo та S11 Reference", FR-8.2, скріни 29, 32 (PerPic).
 * Тип screen (push з S10), тема світла. Навбар Back · "Reference" · зірочка (favorite, solid-коло над рівним фоном);
 * фото 3:4 з великим радіусом (на скріні майже на всю ширину); назва (Title 2); primary "Use as pose guide" внизу (user-іконка:
 * найближча з Heroicons до "людина в рамці" зі скріна 32) -> S04 з накладкою (applyPoseGuide).
 * Референс: params.id (типово inspo-02 "Hallway satin look" - приклад зі скріна 32 і DEV-DOC). Фото - заглушка (CREDITS.md).
 * Зірочка пише в той самий state.inspoFavs, що й картка S10 (S10 під шаром оновлюється через store).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { icon } from '../icons.js';
import { h, esc } from '../ui.js';
import { navBar, button } from '../components.js';
import { byId, titleOf, isFav, toggleFav, inspoPhoto, applyPoseGuide, DEBUG_POSE_ID } from '../inspo.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.S11;

function favButton() {
  return '<button class="icon-btn icon-btn--solid" type="button" data-action="fav"></button>';
}

function skeleton(item) {
  return `
  <section class="ref" data-theme="light">
    ${navBar({ title: t.title, backLabel: copy.S10.nav.back, end: favButton() })}
    <div class="ref__scroll" data-scroll>
      <div class="ref__photo">${inspoPhoto(item, 'inspo-photo--hero')}</div>
      <h2 class="ref__title t-title2">${esc(titleOf(item.id))}</h2>
    </div>
    <footer class="ref__footer">
      ${button({ label: t.usePose, variant: 'primary', block: true, iconName: 'user', action: 'use', attrs: `aria-label="${esc(t.a11y.usePose)}"` })}
    </footer>
  </section>`;
}

function sync(el, state, id) {
  const on = isFav(state, id);
  const btn = el.querySelector('[data-action="fav"]');
  btn.innerHTML = icon('star', on ? 'solid' : 'outline');
  btn.setAttribute('aria-label', on ? t.a11y.unfavorite : t.a11y.favorite);
}

export function render(initial, ctx) {
  applyRouteParams(ctx.params, { overCamera: true });
  const item = byId(ctx.params.id) || byId(DEBUG_POSE_ID);
  const el = h(skeleton(item));
  el._id = item.id;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a || a.getAttribute('aria-disabled') === 'true') return;
    if (a.dataset.action === 'back') ctx.router.back();
    else if (a.dataset.action === 'fav') toggleFav(item.id);
    else if (a.dataset.action === 'use') applyPoseGuide(item.id, ctx.router);
  });
  sync(el, store.get(), item.id);
  return el;
}

export function update(el, state) {
  sync(el, state, el._id);
}
