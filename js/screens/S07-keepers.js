/**
 * S07 Your keepers - DEV-DOC "### S07 Your keepers", PRD FR-5.3, скрін 38.
 * Тип modal, тема темна (CLAUDE.md 1.8). Рахує лише kept === true (open-questions #40).
 *
 * Композиція (скрін 38): розмите фото як фон; зверху Skip + Done (як у S06, без тега);
 * glass-картка по центру: стопка мініатюр з бейджем кількості -> заголовок -> mono-підпис "2 of 3 kept" ->
 * primary "Open gallery" (S08) -> secondary "Export selects" (експорт відібраних); нижче - кругла Undo (назад у S06).
 * Вхід картки: scale .9 -> 1 + fade 350 мс, бейдж pop (DEV-DOC "Your keepers"); reduced motion - fade 150 мс.
 *
 * Skip і Done на S07 ведуть у S08 (галерея): відбір уже зроблено, окремого "скасування" немає (open-questions - див. звіт).
 * Параметри (debug / рендер): seed=N&kept=mix[&picks&favs&look] - demo-seed.js.
 */

import { copy } from '../copy.js';
import * as review from '../review.js';
import * as uiKit from '../ui.js';
import { seedFromParams } from '../demo-seed.js';
import { h, esc } from '../ui.js';
import { icon } from '../icons.js';
import { reducedMotion, cssMs } from '../router.js';
import { reviewBar, reviewBackdrop, paintBackdrop, phAttr, iconButton, button } from '../components.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.S07;
const a = copy.S07.a11y;

const curve = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
const q = (el, sel) => el.querySelector(sel);

/* ---------- розмітка ---------- */

function thumbsHTML(kept) {
  const img = (p, cls) => `<span class="keepers-card__thumb ${cls}"><img src="${esc(p.src)}" alt=""${phAttr(p)}></span>`;
  if (kept.length === 0) {
    return `<span class="keepers-card__thumb keepers-card__thumb--empty">${icon('photo', 'outline')}</span>`;
  }
  if (kept.length === 1) return img(kept[0], 'keepers-card__thumb--front');
  return img(kept[kept.length - 2], 'keepers-card__thumb--back') + img(kept[kept.length - 1], 'keepers-card__thumb--front');
}

function skeleton(session) {
  const s = review.stats(session);
  const kept = session ? session.photos.filter((p) => p.kept === true) : [];
  const exportDisabled = s.kept === 0;
  return `
    <section class="review review--s07" data-theme="dark" aria-label="${esc(copy.screens.S07)}">
      ${reviewBackdrop()}
      ${reviewBar({ skipLabel: copy.S06.skip, skipAria: copy.S06.a11y.skip, doneLabel: copy.S06.done, doneHint: copy.S06.a11y.done, idPrefix: 'kp' })}
      <div class="review__body">
        <div class="keepers-card glass" data-bind="card">
          <div class="keepers-card__stack" data-count="${Math.min(kept.length, 2)}" role="img" aria-label="${esc(a.stack(s.kept))}">
            ${thumbsHTML(kept)}
            <span class="count-badge" data-bind="badge" aria-hidden="true">${s.kept}</span>
          </div>
          <h2 class="keepers-card__title t-title2">${esc(t.title)}</h2>
          <p class="keepers-card__summary t-mono-caption" aria-hidden="true">${esc(t.summary(s.kept, s.total))}</p>
          <p class="sr-only">${esc(a.summary(s.kept, s.dropped))}</p>
          <div class="keepers-card__actions">
            ${button({ label: t.open, variant: 'primary', block: true, iconName: 'photo', action: 'open' })}
            ${button({ label: t.save, variant: 'secondary', block: true, iconName: 'arrow-down-tray', action: 'save', disabled: exportDisabled })}
          </div>
        </div>
        <div class="kp__undo">
          ${iconButton({ name: 'arrow-uturn-left', label: a.undo, className: 'icon-btn--lg', action: 'undo' })}
        </div>
      </div>
    </section>`;
}

/* ---------- вхід картки ---------- */

function enter(el) {
  const card = q(el, '[data-bind="card"]');
  const badge = q(el, '[data-bind="badge"]');
  const dur = cssMs('--dur-keepers');
  const ease = curve(el, '--ease-ios');
  if (reducedMotion()) {
    card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: curve(el, '--ease-out') });
    return;
  }
  card.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: dur, easing: ease });
  // бейдж pop: 0 -> 1.15 -> 1 після того, як картка майже стала на місце (--pulse-scale = той самий "імпульс", що в S05)
  const pop = parseFloat(curve(el, '--pulse-scale'));
  badge.animate(
    [{ transform: 'scale(0)', opacity: 0 }, { transform: `scale(${pop})`, opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: cssMs('--dur-pulse') + 100, delay: dur / 2, easing: curve(el, '--ease-out'), fill: 'backwards' },
  );
}

/* ---------- експорт відібраних ---------- */

async function exportSelects(ctx, session) {
  const photos = session ? session.photos.filter((p) => p.kept === true) : [];
  if (!photos.length) return;
  let mod = null;
  try {
    mod = await import('../export.js'); // будує інший білдер (Phase 4: A02 / T01 / M01, ліміт); інтерфейс - requestExport
  } catch {
    mod = null;
  }
  if (!mod) {
    // TODO: S08/A02/T01, етап 4 DEV-DOC: до злиття з export.js - службовий тост "not built", без вигаданого UI
    uiKit.showToast({ kind: 'info', message: copy.debug.toastStub('S07', t.save) });
    return;
  }
  await mod.requestExport(photos, { scope: 'selects', router: ctx.router, ui: uiKit });
}

/* ---------- контракт модуля ---------- */

export function render(state, ctx) {
  seedFromParams(ctx.params);
  applyRouteParams(ctx.params, { overCamera: true }); // used=, plus=, photos= - як у S08/S09
  const session = review.currentSession();
  const el = h(skeleton(session));
  el._ui = { done: false };

  const keptPhotos = session ? session.photos.filter((p) => p.kept === true) : [];
  const bgPhoto = keptPhotos[keptPhotos.length - 1] || session?.photos[0];
  paintBackdrop(q(el, '.review-bg'), bgPhoto?.src, false, Boolean(bgPhoto?.ph));

  const undoBtn = q(el, '[data-action="undo"]');
  if (!session || !review.canUndo(session.id)) undoBtn.setAttribute('aria-disabled', 'true');

  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || target.getAttribute('aria-disabled') === 'true' || el._ui.done) return;
    switch (target.dataset.action) {
      case 'open':
      case 'skip':
      case 'done':
        el._ui.done = true;
        ctx.router.replace('S08'); // галерея замінює модалку: Back з S08 -> S04
        break;
      case 'save': exportSelects(ctx, review.currentSession()); break;
      case 'undo':
        if (review.undo(session.id)) { el._ui.done = true; ctx.router.replace('S06'); }
        break;
      default: break;
    }
  });

  let tries = 0;
  const mount = () => {
    if (!el.isConnected) { if (tries++ < 120) requestAnimationFrame(mount); return; }
    enter(el);
  };
  requestAnimationFrame(mount);
  return el;
}

/** Екран статичний між рішеннями: store.set (експорт, ліміт) не перестворює картку */
export function update() {}
