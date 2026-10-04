/**
 * H04 Look - DEV-DOC "### H04 Look", PRD FR-7.1-7.3, скрін 26.
 * Лист medium-tall (62%) поверх S04: видошукач лишається видимим, фільтр видно під час вибору: "Look" + Done, підпис, карусель LookCard зі snap по центру,
 * назва й опис центрального стилю.
 *  - Центральний стиль = вибраний (radio). Доступний (free або isPlus) - одразу state.lookId,
 *    видошукач S04 позаду показує CSS-фільтр (S04 --vf-look).
 *  - Locked (plus) у free: бейдж PLUS, стиль НЕ застосовується; Done -> M01 (source=look, слайд Style).
 *  - Тап на картку - докрутити її до центру; зміна центру - haptic('light').
 * Фото: базове фото Look ще не завантажене - заглушка data-photo-placeholder="look-base" з
 * градієнтом --ph-look, на якому читається фільтр (assets/CREDITS.md "Placeholders").
 * Параметри: ?look=warm|honey, ?plus=1 (route-params.js).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { h, esc, sheetHeaderHTML, radioKeys } from '../ui.js';
import { lookCard } from '../components.js';
import { icon } from '../icons.js';
import { haptic } from '../haptic.js';
import { looks } from '../data.js';
import { applyRouteParams, lookIdFrom } from '../route-params.js';
import { snapScroll } from '../snap-scroll.js';

const t = copy.H04;

const isLocked = (look, state) => look.plus && !state.isPlus;

function cardsHTML(state, centerId) {
  return looks.map((l) => {
    const name = t.lookName(l.id);
    const locked = isLocked(l, state);
    return lookCard({
      id: l.id,
      name,
      filter: l.filter,
      selected: l.id === centerId,
      label: locked ? t.a11y.locked(name) : t.a11y.look(name),
      badgeLabel: locked ? t.badge : '',
    });
  }).join('');
}

function infoHTML(state, centerId) {
  const look = looks.find((l) => l.id === centerId) || looks[0];
  return `
    <h3 class="h04__name t-title2">${esc(t.lookName(look.id))}</h3>
    <p class="h04__desc t-body">${esc(t.descriptions[look.id])}</p>
    ${isLocked(look, state) ? `<p class="h04__hint t-footnote">${icon('lock-closed', 'solid', { className: 'icon--xs' })}<span>${esc(t.lockedHint)}</span></p>` : ''}`;
}

export function render(state, ctx) {
  const s = applyRouteParams(ctx.params, { overCamera: true });
  const fromParam = lookIdFrom(ctx.params.look);
  const ui = { centerId: fromParam || s.lookId, sig: `${s.isPlus}` };
  if (!looks.some((l) => l.id === ui.centerId)) ui.centerId = looks[0].id;

  const el = h(`
    <div class="sheet__content h04">
      ${sheetHeaderHTML({ title: t.title, subtitle: t.subtitle })}
      <div class="sheet__body" data-scroll>
        <div class="carousel carousel--center h04__looks" role="radiogroup" aria-label="${esc(t.a11y.carousel)}">${cardsHTML(s, ui.centerId)}</div>
        <div class="h04__info" aria-live="polite">${infoHTML(s, ui.centerId)}</div>
      </div>
    </div>`);
  el._ui = ui;

  const strip = el.querySelector('.h04__looks');
  radioKeys(strip);
  const cards = () => [...strip.querySelectorAll('.look-card')];

  function apply(id) {
    const look = looks.find((l) => l.id === id);
    const st = store.get();
    if (look && !isLocked(look, st) && st.lookId !== id) store.set({ lookId: id });
  }

  function center(i) {
    const look = looks[i];
    if (ui.target) return; // іде програмний скрол до обраної картки: проміжні картки не вибираємо
    if (!look || look.id === ui.centerId) return;
    ui.centerId = look.id;
    haptic('light');
    sync(el, store.get());
    apply(look.id);
  }

  const unlock = () => { ui.target = false; };
  const snap = snapScroll(strip, { axis: 'x', align: 'center', items: cards, onChange: center, onSettle: unlock });

  /** Вибір картки (тап або клавіатура): aria-checked і look оновлюються одразу, скрол докручується окремо */
  function choose(i) {
    const look = looks[i];
    if (!look) return;
    ui.target = false;
    center(i);
    ui.target = true; // скрол іде -> onChange ігноруємо до onSettle (з запасним таймером, якщо скролити нікуди)
    clearTimeout(ui.targetTimer);
    ui.targetTimer = setTimeout(unlock, 900);
    snap.scrollTo(i);
  }
  requestAnimationFrame(() => snap.jumpTo(looks.findIndex((l) => l.id === ui.centerId)));
  apply(ui.centerId); // ?look= одразу застосовується до видошукача (якщо доступний)

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-done]')) {
      const look = looks.find((l) => l.id === ui.centerId);
      if (look && isLocked(look, store.get())) {
        // locked у free: не закриваємо лист, відкриваємо пейвол зі слайдом Style
        e.stopPropagation();
        ctx.router.push('M01', { source: 'look' });
      }
      return;
    }
    const card = e.target.closest('[data-look]');
    if (card) choose(cards().indexOf(card));
  });
  return el;
}

function sync(el, state) {
  const ui = el._ui;
  el.querySelectorAll('[data-look]').forEach((c) => {
    c.setAttribute('aria-checked', String(c.dataset.look === ui.centerId));
  });
  // бейджі й підписи залежать від isPlus: перебудовуємо лише вміст карток, не стрічку (скрол зберігається)
  const sig = `${state.isPlus}`;
  if (ui.sig !== sig) {
    ui.sig = sig;
    looks.forEach((l) => {
      const card = el.querySelector(`[data-look="${l.id}"]`);
      const fresh = h(lookCard({
        id: l.id,
        name: t.lookName(l.id),
        filter: l.filter,
        selected: l.id === ui.centerId,
        label: isLocked(l, state) ? t.a11y.locked(t.lookName(l.id)) : t.a11y.look(t.lookName(l.id)),
        badgeLabel: isLocked(l, state) ? t.badge : '',
      }));
      card.replaceChildren(...fresh.childNodes);
      card.setAttribute('aria-label', fresh.getAttribute('aria-label'));
    });
  }
  el.querySelector('.h04__info').innerHTML = infoHTML(state, ui.centerId);
}

export function update(el, state) {
  if (!el._ui) return;
  const before = el._ui.sig;
  sync(el, state);
  // Plus увімкнено, поки лист відкритий (debug / покупка): центральний стиль застосовується
  if (before !== el._ui.sig && state.isPlus && state.lookId !== el._ui.centerId) {
    queueMicrotask(() => store.set({ lookId: el._ui.centerId }));
  }
}
