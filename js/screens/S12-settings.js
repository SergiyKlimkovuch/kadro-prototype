/**
 * S12 Settings main - DEV-DOC "### S12 Settings", FR-9, скріни 07, 08. Тип screen (push з шестерні S04), тема світла.
 * Композиція (07): NavBar Back + "Settings"; hero: wordmark 34 + слоган; банер Upgrade (--accent-gradient, лише free);
 * секції Camera (Capture defaults, Viewfinder, Feedback), Library (Saving, Storage), Kadro (Permissions, About & Support).
 * Підпис рядка - значення зі store (copy.S12.rows.*.summary), оновлюється точково (update) без перестворення DOM.
 * Банер -> M01?source=settings (M01 будує інша група: до її готовності - плейсхолдер роутера).
 * Відхід від 07/08: без App Language, Community, соцмереж, окремого Privacy (поза FR-9, open-questions #87).
 * Для Plus банер ховається (DEV-DOC); рядок copy.S12.plusSection не показуємо (open-questions #101).
 */

import { copy } from '../copy.js';
import { esc } from '../ui.js';
import { icon } from '../icons.js';
import { listRow, listSection, wordmark } from '../components.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState } from '../settings.js';

const t = copy.S12;

/** Рядок -> роут, іконка (Heroicons; "хвиля" PerPic для Feedback - speaker-wave як найближча) */
const ROWS = [
  { key: 'captureDefaults', route: 'S12-capture-defaults', glyph: 'clock' },
  { key: 'viewfinder', route: 'S12-viewfinder', glyph: 'viewfinder-circle' },
  { key: 'feedback', route: 'S12-feedback', glyph: 'speaker-wave' },
  { key: 'saving', route: 'S12-saving', glyph: 'arrow-down-tray' },
  { key: 'storage', route: 'S12-storage', glyph: 'circle-stack' },
  { key: 'permissions', route: 'S12-permissions', glyph: 'shield-check' },
  { key: 'about', route: 'S12-about', glyph: 'information-circle' },
];

/** Підпис рядка зі state (summary-функції content-writer) */
function summaryOf(key, s) {
  switch (key) {
    case 'captureDefaults': return t.rows.captureDefaults.summary(s.session);
    case 'viewfinder': return t.rows.viewfinder.summary(s.camera, s.settings);
    case 'feedback': return t.rows.feedback.summary(s.settings);
    case 'saving': return t.rows.saving.summary(s.settings.saveMode);
    case 'storage': return t.rows.storage.summary(s.storage.usedMb);
    case 'permissions': return t.rows.permissions.summary(s.permissions);
    default: return t.rows.about.summary;
  }
}

function row(key, s) {
  const r = ROWS.find((x) => x.key === key);
  return listRow({
    title: t.rows[key].title,
    subtitle: summaryOf(key, s),
    glyph: r.glyph,
    name: key,
    action: `open:${r.route}`,
  });
}

function bannerHTML() {
  return `
    <section class="list-section stg__banner">
      <button class="upgrade-banner pressable" type="button" data-action="upgrade" aria-label="${esc(t.a11y.upgrade)}">
        ${icon('sparkles', 'solid', { className: 'upgrade-banner__icon' })}
        <span class="upgrade-banner__text">
          <span class="upgrade-banner__title t-headline">${esc(t.upgrade.title)}</span>
          <span class="upgrade-banner__subtitle t-footnote">${esc(t.upgrade.subtitle)}</span>
        </span>
        ${icon('chevron-right', 'outline', { className: 'upgrade-banner__chevron' })}
      </button>
    </section>`;
}

function bodyHTML(s) {
  return `
    <div data-bind="banner">${s.isPlus ? '' : bannerHTML()}</div>
    ${listSection({ header: t.sections.camera, glyphs: true, rows: ['captureDefaults', 'viewfinder', 'feedback'].map((k) => row(k, s)) })}
    ${listSection({ header: t.sections.library, glyphs: true, rows: ['saving', 'storage'].map((k) => row(k, s)) })}
    ${listSection({ header: t.sections.app, glyphs: true, rows: ['permissions', 'about'].map((k) => row(k, s)) })}`;
}

function sync(el, s) {
  ROWS.forEach(({ key }) => {
    const n = el.querySelector(`[data-bind="${key}-subtitle"]`);
    const text = summaryOf(key, s);
    if (n && n.textContent !== text) n.textContent = text;
    n?.closest('.list-row')?.setAttribute('aria-label', t.a11y.row(t.rows[key].title, text));
  });
  const slot = el.querySelector('[data-bind="banner"]');
  const shown = Boolean(slot.firstElementChild);
  if (s.isPlus === shown) slot.innerHTML = s.isPlus ? '' : bannerHTML();
}

export function render(state, ctx) {
  const s = startState(ctx);
  const hero = `
    <div class="stg__hero">
      ${wordmark({ name: t.wordmarkLabel, size: 'lg' })}
      <p class="stg__tagline t-footnote">${esc(t.tagline)}</p>
    </div>`;
  return mountSettings(shellHTML({ title: t.title, hero, body: bodyHTML(s) }), ctx, {
    sync,
    actions: {
      upgrade: () => { haptic('light'); ctx.router.push('M01', { source: 'settings' }); },
      ...Object.fromEntries(ROWS.map((r) => [`open:${r.route}`, () => ctx.router.push(r.route)])),
    },
  });
}

export function update(el, state) {
  sync(el, state);
}
