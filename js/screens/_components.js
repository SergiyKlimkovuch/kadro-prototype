/**
 * _components.js - службовий роут #/_components: галерея компонентів у світлій і темній темах
 * з робочими станами (press-feedback, перемикання через store, sheet / alert / toast / menu, push / modal).
 * Параметри: theme=light|dark|both (типово both), open=sheet|sheet-large|alert|alert-destructive|toast|toast-error|menu
 * (автовідкриття для рендеру в PNG).
 * Скло демонструється лише над тест-патерном (CLAUDE.md 1.7: над рівним фоном скло не ставимо).
 */

import { copy, APP_NAME } from '../copy.js';
import { aspectRatios, focalLengths, ranges } from '../data.js';
import * as store from '../state.js';
import { haptic } from '../haptic.js';
import { h, esc, openSheet, openAlert, showToast, openMenu } from '../ui.js';
import { button, iconButton, segmentChip, segmentGroup, sessionChip, listRow, listSection, wordmark } from '../components.js';

const d = copy.demo;

function section(title, inner) {
  return `<section class="demo__section"><h2 class="demo__h t-mono-caption">${esc(title)}</h2>${inner}</section>`;
}

function aspectGroup(state) {
  return segmentGroup({ name: 'aspect', label: d.aspectCaption, value: state.camera.aspect, items: aspectRatios.map((r) => ({ value: r, label: r })) });
}

function focalGroup(state) {
  return segmentGroup({ name: 'focal', label: d.focalCaption, value: state.camera.focal, items: focalLengths.map((f) => ({ value: f, label: d.focal(f) })) });
}

function listDemo(state) {
  return listSection({
    header: d.listHeader,
    footer: d.listFooter,
    glyphs: true,
    rows: [
      listRow({ title: d.rowCaptureDefaults, subtitle: d.rowCaptureDefaultsValue(state.session), glyph: 'clock', name: 'capture', action: 'row-capture' }),
      listRow({ title: d.rowAspect, value: state.camera.aspect, glyph: 'viewfinder-circle', name: 'aspect', action: 'row-aspect' }),
      listRow({ title: d.rowGrid, glyph: 'table-cells', kind: 'toggle', name: 'grid', checked: state.settings.grid }),
      listRow({ title: d.rowLevel, glyph: 'adjustments-horizontal', kind: 'toggle', name: 'level', checked: state.settings.level }),
      // статичний приклад стану off: перемикається лише в DOM (data-local), store не чіпає
      listRow({ title: d.rowOffDemo, glyph: 'speaker-x-mark', kind: 'toggle', name: 'demoOff', checked: false, local: true }),
      listRow({ title: d.rowDelay, glyph: 'clock', kind: 'menu', name: 'delay', value: d.delayValue(state.session.delay) }),
    ],
  });
}

function themeBlock(theme, state) {
  const label = theme === 'dark' ? d.themeDark : d.themeLight;
  return `
  <div class="demo__theme" data-theme="${theme}">
    <p class="demo__theme-label t-mono-caption">${esc(label)}</p>

    ${section(d.secTypography, `
      <p class="t-large-title demo__line">${esc(d.typeLargeTitle)}</p>
      <p class="t-title2 demo__line">${esc(d.typeTitle2)}</p>
      <p class="t-headline demo__line">${esc(d.typeHeadline)}</p>
      <p class="t-body demo__line">${esc(d.typeBody)}</p>
      <p class="t-footnote t-secondary demo__line">${esc(d.typeFootnote)}</p>
      <p class="t-mono-caption demo__line">${esc(d.typeMono)}</p>
      <p class="t-countdown demo__line">${esc(d.typeCountdown)}</p>`)}

    ${section(d.secWordmark, `
      <div class="demo__row demo__row--baseline">${wordmark({ name: APP_NAME })}${wordmark({ name: APP_NAME, size: 'md' })}${wordmark({ name: APP_NAME, size: 'lg' })}</div>`)}

    ${section(d.secButton, `
      <div class="demo__stack">${button({ label: d.btnPrimary, variant: 'primary', block: true, action: 'tap' })}</div>
      <div class="demo__row">
        ${button({ label: copy.common.done, variant: 'fill', size: 'sm', action: 'tap' })}
        ${button({ label: d.btnText, variant: 'text', action: 'tap' })}
        ${button({ label: d.btnDisabled, variant: 'primary', disabled: true })}
      </div>
      <p class="demo__note t-footnote t-secondary">${esc(d.overGlass)}</p>
      <div class="demo__backdrop">
        <div class="demo__row">
          ${button({ label: d.btnSecondary, variant: 'secondary', iconName: 'arrow-down-tray', action: 'tap' })}
          ${button({ label: copy.common.done, variant: 'primary', iconName: 'check', action: 'tap' })}
        </div>
      </div>`)}

    ${section(d.secIconButton, `
      <div class="demo__row">
        ${iconButton({ name: 'chevron-left', label: copy.a11y.back, variant: 'solid', action: 'tap-icon' })}
        ${iconButton({ name: 'cog-6-tooth', label: copy.a11y.settings, variant: 'plain', action: 'tap-icon' })}
        ${iconButton({ name: 'ellipsis-horizontal', label: copy.a11y.more, variant: 'plain', action: 'tap-icon' })}
      </div>
      <div class="demo__backdrop">
        <div class="demo__row">
          ${iconButton({ name: 'x-mark', label: copy.a11y.close, variant: 'glass', action: 'tap-icon' })}
          ${iconButton({ name: 'heart', label: copy.a11y.favorite, variant: 'glass', action: 'tap-icon' })}
          ${iconButton({ name: 'arrow-down-tray', label: copy.a11y.save, variant: 'glass', action: 'tap-icon' })}
          ${iconButton({ name: 'trash', label: copy.a11y.delete, variant: 'glass', action: 'tap-icon' })}
        </div>
      </div>`)}

    ${section(d.secSegment, `
      <div class="demo__row demo__row--fill">
        ${segmentChip({ label: d.chipSession, iconName: 'clock', action: 'tap' })}
        ${segmentChip({ label: d.chipBooth, iconName: 'rectangle-stack', action: 'tap' })}
      </div>
      <div class="demo__row">${aspectGroup(state)}</div>
      <div class="demo__row">${focalGroup(state)}</div>`)}

    ${section(d.secSessionChip, sessionChip({ text: d.sessionChip(state.session), expandLabel: copy.a11y.expandSession, resetLabel: copy.a11y.resetSession }))}

    <div class="demo__section demo__section--flush">
      <h2 class="demo__h demo__h--inset t-mono-caption">${esc(d.secList)}</h2>
      ${listDemo(state)}
    </div>

    ${section(`${d.secSheet} · ${d.secAlert} · ${d.secToast}`, `
      <div class="demo__row">
        ${button({ label: d.openSheetMedium, variant: 'fill', size: 'sm', action: 'sheet' })}
        ${button({ label: d.openSheetLarge, variant: 'fill', size: 'sm', action: 'sheet-large' })}
      </div>
      <div class="demo__row">
        ${button({ label: d.openAlert, variant: 'fill', size: 'sm', action: 'alert' })}
        ${button({ label: d.openAlertDestructive, variant: 'fill', size: 'sm', action: 'alert-destructive' })}
      </div>
      <div class="demo__row">
        ${button({ label: d.showToastInfo, variant: 'fill', size: 'sm', action: 'toast' })}
        ${button({ label: d.showToastError, variant: 'fill', size: 'sm', action: 'toast-error' })}
      </div>`)}

    ${section(d.secRouter, `
      <div class="demo__row">
        ${button({ label: d.pushScreen, variant: 'fill', size: 'sm', action: 'push' })}
        ${button({ label: d.openModal, variant: 'fill', size: 'sm', action: 'modal' })}
      </div>
      <p class="demo__note t-footnote t-secondary">${esc(d.swipeHint)}</p>`)}
  </div>`;
}

function themesFor(params) {
  if (params.theme === 'light') return ['light'];
  if (params.theme === 'dark') return ['dark'];
  return ['light', 'dark'];
}

/* ---------- дії ---------- */

function themeOf(el) {
  return el.closest('[data-theme]')?.dataset.theme || 'light';
}

function openAspectSheet(theme) {
  openSheet({
    theme,
    title: d.sheetAspectTitle,
    subtitle: d.sheetAspectSubtitle,
    getState: store.get,
    body: (s) => {
      const el = h(`<div>${aspectGroup(s)}</div>`);
      bindSegments(el);
      return el;
    },
  });
}

function openLargeSheet(theme) {
  openSheet({
    theme,
    detent: 'large',
    title: d.sheetLargeTitle,
    subtitle: d.sheetLargeSubtitle,
    getState: store.get,
    body: (s) => {
      const el = h(`<div class="demo__sheet-list">${listSection({ rows: [
        listRow({ title: d.rowGrid, kind: 'toggle', name: 'grid', checked: s.settings.grid }),
        listRow({ title: d.rowLevel, kind: 'toggle', name: 'level', checked: s.settings.level }),
      ] })}</div>`);
      bindToggles(el);
      return el;
    },
  });
}

function doAlert(theme, destructive) {
  if (destructive) {
    openAlert({
      theme,
      title: d.alertDeleteTitle,
      message: d.alertDeleteMessage,
      actions: [{ label: copy.common.cancel }, { label: copy.common.delete, role: 'destructive', onTap: () => haptic('medium') }],
    });
  } else {
    openAlert({
      theme,
      title: d.alertTitle,
      message: d.alertMessage,
      actions: [{ label: copy.common.dontAllow }, { label: copy.common.allow, preferred: true }],
    });
  }
}

function doToast(theme, error) {
  if (error) {
    haptic('warning');
    showToast({ theme, kind: 'error', message: d.toastError, action: { label: copy.common.settings } });
  } else {
    haptic('success');
    showToast({ theme, kind: 'info', message: d.toastInfo });
  }
}

function doMenu(anchor, theme) {
  const s = store.get();
  openMenu({
    anchor: anchor.querySelector('.list-row__value') || anchor,
    theme,
    value: s.session.delay,
    options: ranges.delay.map((v) => ({ value: v, label: d.delayValue(v) })),
    onSelect: (v) => { haptic('light'); store.set({ session: { delay: v } }); },
  });
}

function bindSegments(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-segment]');
    if (!b) return;
    const name = b.dataset.segment;
    const v = b.dataset.value;
    haptic('light');
    if (name === 'aspect') store.set({ camera: { aspect: v } });
    if (name === 'focal') store.set({ camera: { focal: Number(v) } });
  });
}

function bindToggles(root) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (!t) return;
    const name = t.dataset.toggle;
    haptic('light');
    if (t.hasAttribute('data-local')) {
      t.setAttribute('aria-checked', String(t.getAttribute('aria-checked') !== 'true'));
      return;
    }
    store.set({ settings: { [name]: !store.get().settings[name] } });
  });
}

function onClick(e, ctx) {
  const menuRow = e.target.closest('[data-menu]');
  if (menuRow) { doMenu(menuRow, themeOf(menuRow)); return; }
  const a = e.target.closest('[data-action]');
  if (!a || a.getAttribute('aria-disabled') === 'true') return;
  const theme = themeOf(a);
  switch (a.dataset.action) {
    case 'tap':
      haptic('light');
      showToast({ theme, message: d.tapped(a.textContent.trim()) });
      break;
    case 'tap-icon':
      haptic('light');
      showToast({ theme, message: d.tapped(a.getAttribute('aria-label')) });
      break;
    case 'session-expand':
    case 'row-aspect':
    case 'sheet': openAspectSheet(theme); break;
    case 'sheet-large': openLargeSheet(theme); break;
    case 'session-reset':
      haptic('light');
      store.set({ session: { configured: false } });
      showToast({ theme, message: d.sessionCleared });
      break;
    case 'alert': doAlert(theme, false); break;
    case 'alert-destructive': doAlert(theme, true); break;
    case 'toast': doToast(theme, false); break;
    case 'toast-error': doToast(theme, true); break;
    case 'row-capture': ctx.router.push('S12-capture-defaults'); break;
    case 'push': ctx.router.push('S12-about'); break;
    case 'modal': ctx.router.push('M01'); break;
    default: break;
  }
}

function autoOpen(root, ctx) {
  const what = ctx.params.open;
  if (!what) return;
  const theme = ctx.params.theme === 'dark' ? 'dark' : 'light';
  requestAnimationFrame(() => {
    if (what === 'sheet') openAspectSheet(theme);
    else if (what === 'sheet-large') openLargeSheet(theme);
    else if (what === 'alert') doAlert(theme, false);
    else if (what === 'alert-destructive') doAlert(theme, true);
    else if (what === 'toast') showToast({ theme, kind: 'info', message: d.toastInfo, hold: 60000 });
    else if (what === 'toast-error') showToast({ theme, kind: 'error', message: d.toastError, action: { label: copy.common.settings }, hold: 60000 });
    else if (what === 'menu') {
      const row = root.querySelector(`[data-theme="${theme}"] [data-menu="delay"]`) || root.querySelector('[data-menu="delay"]');
      row.scrollIntoView({ block: 'center' });
      doMenu(row, theme);
    }
  });
}

/* ---------- контракт модуля ---------- */

export function render(state, ctx) {
  const themes = themesFor(ctx.params);
  const root = h(`
    <div class="demo" data-theme="${themes[0]}">
      <div class="scroll demo__scroll" data-scroll>
        <h1 class="demo__title t-large-title">${esc(d.title)}</h1>
        ${themes.map((t) => themeBlock(t, state)).join('')}
      </div>
    </div>`);
  bindSegments(root);
  bindToggles(root);
  root.addEventListener('click', (e) => onClick(e, ctx));
  autoOpen(root, ctx);
  return root;
}

/** Точкове оновлення - щоб тогли/сегменти анімувались, а не перемальовувались */
export function update(root, state) {
  root.querySelectorAll('[data-segment="aspect"]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === state.camera.aspect)));
  root.querySelectorAll('[data-segment="focal"]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.value) === state.camera.focal)));
  root.querySelectorAll('[data-toggle]:not([data-local])').forEach((t) => t.setAttribute('aria-checked', String(Boolean(state.settings[t.dataset.toggle]))));
  root.querySelectorAll('[data-bind="session-text"]').forEach((n) => { n.textContent = d.sessionChip(state.session); });
  root.querySelectorAll('[data-bind="capture-subtitle"]').forEach((n) => { n.textContent = d.rowCaptureDefaultsValue(state.session); });
  root.querySelectorAll('[data-bind="aspect-value"]').forEach((n) => { n.textContent = state.camera.aspect; });
  root.querySelectorAll('[data-bind="delay-value"]').forEach((n) => { n.textContent = d.delayValue(state.session.delay); });
}
