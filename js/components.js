/**
 * components.js - HTML-будівники компонентів з components.css, щоб екрани не дублювали розмітку.
 * Повертають рядки; поведінку екран вішає делегуванням через data-action.
 * Індекс і джерела - docs/design-system/components.md.
 */

import { icon } from './icons.js';
import { esc } from './ui.js';
import { cssMs } from './router.js';

/** Button: variant primary | secondary (glass) | fill | text; size 'sm'; block; icon - назва Heroicons */
export function button({ label, variant = 'primary', size, block = false, iconName, action, disabled = false, attrs = '' }) {
  const cls = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', block ? 'btn--block' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" type="button"${action ? ` data-action="${action}"` : ''}${disabled ? ' aria-disabled="true"' : ''} ${attrs}>${iconName ? icon(iconName) : ''}<span>${esc(label)}</span></button>`;
}

/** IconButton: variant glass | solid | plain; size 'sm'; label - обов'язковий aria-label */
export function iconButton({ name, label, variant = 'glass', size, solid = false, action, attrs = '', className = '' }) {
  const cls = ['icon-btn', `icon-btn--${variant}`, size === 'sm' ? 'icon-btn--sm' : '', className].filter(Boolean).join(' ');
  return `<button class="${cls}" type="button" aria-label="${esc(label)}"${action ? ` data-action="${action}"` : ''} ${attrs}>${icon(name, solid ? 'solid' : 'outline')}</button>`;
}

/** SegmentChip окремий (дія) */
export function segmentChip({ label, iconName, action, attrs = '' }) {
  return `<button class="segment-chip" type="button"${action ? ` data-action="${action}"` : ''} ${attrs}>${iconName ? icon(iconName) : ''}<span>${esc(label)}</span></button>`;
}

/** SegmentChip-група з одиночним вибором (radiogroup) */
export function segmentGroup({ name, items, value, label }) {
  const btns = items.map((it) => `<button class="segment-group__item" type="button" role="radio" aria-checked="${String(it.value) === String(value)}" data-segment="${esc(name)}" data-value="${esc(it.value)}">${esc(it.label)}</button>`).join('');
  return `<div class="segment-group" role="radiogroup" aria-label="${esc(label)}" data-segment-group="${esc(name)}">${btns}</div>`;
}

/** SessionChip collapsed */
export function sessionChip({ text, expandLabel, resetLabel }) {
  return `
    <div class="session-chip">
      <button class="session-chip__main" type="button" data-action="session-expand" aria-label="${esc(expandLabel)}">
        ${icon('clock')}
        <span class="session-chip__text" data-bind="session-text">${esc(text)}</span>
        ${icon('chevron-up', 'outline', { className: 'session-chip__chevron' })}
      </button>
      <button class="icon-btn icon-btn--solid icon-btn--sm" type="button" data-action="session-reset" aria-label="${esc(resetLabel)}">${icon('x-mark')}</button>
    </div>`;
}

/** Toggle (role=switch) */
export function toggle({ name, checked, label, local = false }) {
  return `<button class="toggle" type="button" role="switch" aria-checked="${Boolean(checked)}" aria-label="${esc(label)}" data-toggle="${esc(name)}"${local ? ' data-local' : ''}><span class="toggle__track-on"></span><span class="toggle__knob"></span></button>`;
}

/**
 * ListRow: kind chevron | value | toggle | menu | static | action | external.
 * { title, subtitle, glyph, value, kind, name, checked, action, local, disabled, ariaLabel }
 *  - static: не тапабельний рядок "назва - значення" (S12-storage Used, S12-permissions статус, S12-about Plan)
 *  - action: тапабельний без хвоста (Restore Purchases, Clear generated images)
 *  - external: тапабельний з іконкою "відкриває поза застосунком" замість chevron (Terms, Settings)
 *  - disabled: aria-disabled (глобальне .5 і pointer-events: none)
 */
export function listRow({ title, subtitle, glyph, value, kind = 'chevron', name, checked, action, local = false, disabled = false, ariaLabel }) {
  const lead = glyph ? `<span class="list-row__glyph">${icon(glyph)}</span>` : '';
  const body = `<span class="list-row__content"><span class="list-row__title">${esc(title)}</span>${subtitle ? `<span class="list-row__subtitle" data-bind="${esc(name || '')}-subtitle">${esc(subtitle)}</span>` : ''}</span>`;
  const dis = disabled ? ' aria-disabled="true"' : '';
  const aria = ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : '';
  const val = value != null ? `<span class="list-row__value" data-bind="${esc(name || '')}-value">${esc(value)}</span>` : '';
  if (kind === 'toggle') {
    return `<div class="list-row">${lead}${body}${toggle({ name, checked, label: title, local })}</div>`;
  }
  if (kind === 'menu') {
    return `<button class="list-row list-row--tappable list-row--menu" type="button" data-menu="${esc(name)}" aria-haspopup="menu"${aria}>${lead}${body}<span class="list-row__value" data-bind="${esc(name)}-value">${esc(value)}</span>${icon('chevron-up-down', 'outline', { className: 'list-row__chevron' })}</button>`;
  }
  if (kind === 'static') {
    return `<div class="list-row">${lead}${body}${val}</div>`;
  }
  const tail = { action: '', external: icon('arrow-top-right-on-square', 'outline', { className: 'list-row__chevron' }) }[kind]
    ?? icon('chevron-right', 'outline', { className: 'list-row__chevron' });
  return `<button class="list-row list-row--tappable" type="button"${action ? ` data-action="${action}"` : ''}${dis}${aria}>${lead}${body}${val}${tail}</button>`;
}

/** NavBar (push-екрани S12, S10, S11): Back (solid, над рівним фоном) + заголовок по центру; end - HTML кнопок справа */
export function navBar({ title, backLabel, end = '', className = '' }) {
  return `
    <header class="navbar${className ? ` ${className}` : ''}">
      ${iconButton({ name: 'chevron-left', label: backLabel, variant: 'solid', action: 'back' })}
      <h1 class="navbar__title t-headline">${esc(title)}</h1>
      ${end ? `<div class="navbar__end">${end}</div>` : ''}
    </header>`;
}

/** ListGroup з секцією */
export function listSection({ header, footer, rows, glyphs = false }) {
  return `
    <section class="list-section">
      ${header ? `<h3 class="list-section__header">${esc(header)}</h3>` : ''}
      <div class="list-group${glyphs ? ' list-group--glyphs' : ''}">${rows.join('')}</div>
      ${footer ? `<p class="list-section__footer">${esc(footer)}</p>` : ''}
    </section>`;
}

/** PageIndicator: count крапок, активна - index */
export function pageIndicator({ count, index, label }) {
  const dots = Array.from({ length: count }, (_, i) => `<span class="page-indicator__dot"${i === index ? ' aria-current="true"' : ''}></span>`).join('');
  return `<div class="page-indicator" role="img" aria-label="${esc(label)}">${dots}</div>`;
}

/** Вордмарк brand.md: size sm | md | lg */
export function wordmark({ name, size = 'sm' }) {
  return `<span class="wordmark${size !== 'sm' ? ` wordmark--${size}` : ''}" aria-label="${esc(name)}">${esc(name.toLowerCase())}<span class="wordmark__dot">.</span></span>`;
}

/* ---------- Phase 4: S06 Review / S07 Your keepers ---------- */

/** Атрибут-позначка кадру-заглушки (demo-seed ph: true) для Figma-handoff: ' data-photo-placeholder="session-frame"' або '' */
export function phAttr(photo) {
  return photo && photo.ph ? ' data-photo-placeholder="session-frame"' : '';
}

/** ReviewBackdrop: порожній шар; наповнюється paintBackdrop() */
export function reviewBackdrop() {
  return '<div class="review-bg" aria-hidden="true"></div>';
}

/**
 * Поставити розмите фото у ReviewBackdrop. animate - кросфейд нового шару (--dur-swipe; reduced motion -> 150 мс),
 * старий шар знімається після завершення.
 */
export function paintBackdrop(container, src, animate = false, placeholder = false) {
  if (!container) return;
  if (placeholder) container.setAttribute('data-photo-placeholder', 'session-frame'); else container.removeAttribute('data-photo-placeholder');
  if (container.dataset.src === (src || '')) return;
  container.dataset.src = src || '';
  const old = [...container.querySelectorAll('.review-bg__img')];
  if (!src) { old.forEach((n) => n.remove()); return; }
  const img = document.createElement('img');
  img.className = 'review-bg__img';
  img.alt = '';
  img.src = src;
  container.append(img);
  if (animate && old.length) {
    const anim = img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: cssMs('--dur-swipe'), easing: getComputedStyle(container).getPropertyValue('--ease-out').trim() });
    anim.finished.catch(() => {}).then(() => old.forEach((n) => n.remove()));
  } else {
    old.forEach((n) => n.remove());
  }
}

/**
 * ReviewBar: [Skip] [тег] [Done]. tag - рядок (S06 "3 left") або '' (S07). Done не має aria-label:
 * видимий підпис = доступне ім'я (voice control), пояснення - в sr-only через aria-describedby.
 */
export function reviewBar({ skipLabel, skipAria, doneLabel, doneHint, tag = '', tagBind = '', idPrefix = 'review' }) {
  const doneId = `${idPrefix}-done-desc`;
  return `
    <header class="review-bar">
      ${button({ label: skipLabel, variant: 'secondary', iconName: 'x-mark', action: 'skip', attrs: `aria-label="${esc(skipAria)}"` })}
      <p class="review-bar__tag t-mono-caption"${tagBind ? ` data-bind="${tagBind}"` : ''}>${esc(tag)}</p>
      ${button({ label: doneLabel, variant: 'primary', iconName: 'check', action: 'done', attrs: `aria-describedby="${doneId}"` })}
    </header>
    <span class="sr-only" id="${doneId}">${esc(doneHint)}</span>`;
}

/* ---------- Phase 3: листи H01-H04 ---------- */

/** Badge (ShipSwift SWStatusBadge): variant neutral | plus; iconName - Heroicons */
export function badge({ label, variant = 'neutral', iconName, className = '' }) {
  return `<span class="badge badge--${variant}${className ? ` ${className}` : ''}">${iconName ? icon(iconName, 'solid') : ''}${esc(label)}</span>`;
}

/**
 * PresetCard (radio): фото-фон (заглушка), назва, значення, галочка на вибраному.
 * data-theme="dark": текст білий на фото незалежно від теми листа.
 */
export function presetCard({ id, name, values, selected, label }) {
  return `
    <button class="preset-card pressable" type="button" role="radio" aria-checked="${Boolean(selected)}" aria-label="${esc(label)}" data-theme="dark" data-preset="${esc(id)}">
      <span class="preset-card__media" data-photo-placeholder="preset-${esc(id)}" aria-hidden="true"></span>
      <span class="preset-card__name" aria-hidden="true">${esc(name)}</span>
      <span class="preset-card__values" aria-hidden="true">${esc(values)}</span>
      ${icon('check-circle', 'solid', { className: 'preset-card__check' })}
    </button>`;
}

/**
 * LookCard (radio): базове фото (заглушка) + CSS-фільтр стилю, назва під карткою;
 * badgeLabel - бейдж Plus на locked-стилі у free.
 */
export function lookCard({ id, name, filter, selected, label, badgeLabel }) {
  return `
    <button class="look-card" type="button" role="radio" aria-checked="${Boolean(selected)}" aria-label="${esc(label)}" data-look="${esc(id)}">
      <span class="look-card__frame" aria-hidden="true">
        <span class="look-card__media" data-photo-placeholder="look-base" style="--look-filter: ${esc(filter)}"></span>
        ${badgeLabel ? badge({ label: badgeLabel, variant: 'plus', iconName: 'lock-closed', className: 'look-card__badge' }) : ''}
      </span>
      <span class="look-card__label" aria-hidden="true">${esc(name)}</span>
    </button>`;
}

/**
 * WheelPicker - набір барабанів з однією смугою вибору (iOS UIPickerView, multi-component).
 * columns: [{ name, label, values: number[], value, unit, valueText, rowText }]
 * Кожен барабан - role="spinbutton" (стрілки на клавіатурі), рядки aria-hidden.
 */
export function wheelSet({ columns }) {
  const labels = columns.map((c) => `<p class="wheel-set__label t-mono-caption" aria-hidden="true">${esc(c.label)}</p>`).join('');
  const wheels = columns.map((c) => {
    const rows = c.values.map((v) => `<div class="wheel__row" data-value="${v}">${esc(c.rowText(v))}</div>`).join('');
    return `
      <div class="wheel">
        <div class="wheel__scroll" role="spinbutton" tabindex="0" data-wheel="${esc(c.name)}"
          aria-label="${esc(c.label)}" aria-valuenow="${c.value}" aria-valuetext="${esc(c.valueText(c.value))}"
          aria-valuemin="${c.values[0]}" aria-valuemax="${c.values[c.values.length - 1]}">${rows}</div>
        <span class="wheel__unit" aria-hidden="true" data-unit="${esc(c.name)}">${esc(c.unit(c.value))}</span>
      </div>`;
  }).join('');
  return `<div class="wheel-set"><div class="wheel-set__labels">${labels}</div><div class="wheel-set__wheels">${wheels}</div></div>`;
}

/* ---------- Phase 6: S10 Inspo, S11 Reference, Pose guide ---------- */

/** SegmentChip sm з емодзі і вибором (aria-pressed): чіпи категорій S10. emoji - виняток open-questions #11 */
export function categoryChip({ id, emoji, img, label, ariaLabel, pressed }) {
  return `<button class="segment-chip segment-chip--sm" type="button" aria-pressed="${Boolean(pressed)}" aria-label="${esc(ariaLabel)}" data-category="${esc(id)}"><span class="segment-chip__emoji" aria-hidden="true">${img ? `<img class="segment-chip__emoji-img" src="${esc(img)}" alt="" draggable="false">` : emoji}</span><span aria-hidden="true">${esc(label)}</span></button>`;
}

/** Slider (ComponentsKit SliderVM small): value/min/max/step у одиницях значення; --slider-p = частка 0..1 */
export function slider({ name, value, min, max, step, label, valueText }) {
  const p = (value - min) / (max - min);
  return `
    <div class="slider" role="slider" tabindex="0" data-slider="${esc(name)}" aria-label="${esc(label)}"
      aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${esc(valueText)}"
      data-min="${min}" data-max="${max}" data-step="${step}" style="--slider-p: ${p}">
      <span class="slider__bar"></span><span class="slider__handle"></span><span class="slider__rest"></span>
    </div>`;
}

/** SearchField (ShipSwift SWSearchBar): капсула з лупою, input, кнопка очищення (з'являється, коли є текст) */
export function searchField({ placeholder, label, clearLabel, value = '' }) {
  return `
    <div class="search-field" role="search">
      ${icon('magnifying-glass')}
      <input class="search-field__input" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false"
        placeholder="${esc(placeholder)}" aria-label="${esc(label)}" value="${esc(value)}" data-bind="query">
      <button class="icon-btn icon-btn--plain icon-btn--sm search-field__clear" type="button" data-action="search-clear" aria-label="${esc(clearLabel)}"${value ? '' : ' hidden'}>${icon('x-circle', 'solid')}</button>
    </div>`;
}
