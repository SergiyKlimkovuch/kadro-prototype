/**
 * ui.js - презентація шарів-компонентів: Sheet, Alert, Toast, Menu (pull-down).
 * Використовується роутером (роут-шари H01-H04, A01-A03, T01) і екранами (ad-hoc).
 * Числа й поведінка - docs/design-system/components.md; значення - tokens.css.
 */

import { appRoot, cssMs, nextFrame, waitTransition, registerLayer, unregisterLayer, currentTheme, getToastHost } from './router.js';
import { icon } from './icons.js';
import { copy } from './copy.js';

/* ---------- DOM-хелпери ---------- */

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** h('<div>...</div>') -> Element */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---------- Sheet ----------
   ComponentsKit BottomModalVM + ModalAnimation: drag вниз 1:1, вгору - rubber band,
   закриття при зсуві > 25% висоти (DEV-DOC) або швидкості > 250 pt/с (ModalAnimation). */

const SHEET_CLOSE_FRACTION = 0.25;
const SHEET_CLOSE_VELOCITY = 0.25; // px/мс = 250 pt/с

function rubberBand(t) {
  const dim = 20;
  const coef = 0.2;
  return (1 - 1 / ((t * coef) / dim + 1)) * dim; // ComponentsKit ModalAnimation.rubberBandClamp
}

/** Шапка листа: заголовок Title 2 + Done (btn--fill, бо під ним рівна поверхня листа) */
export function sheetHeaderHTML({ title, subtitle, doneLabel = copy.common.done }) {
  return `
    <div class="sheet__header">
      <h2 class="sheet__title t-title2">${esc(title)}</h2>
      <button class="btn btn--fill btn--sm" type="button" data-sheet-done>${esc(doneLabel)}</button>
    </div>
    ${subtitle ? `<p class="sheet__subtitle t-footnote">${esc(subtitle)}</p>` : ''}`;
}

export function createSheetLayer({ theme, detent = 'medium', content, onRequestClose }) {
  const el = h(`
    <div class="layer sheet-layer" data-pose="out">
      <div class="scrim"></div>
      <div class="sheet sheet--${['large', 'medium-tall', 'fit'].includes(detent) ? detent : 'medium'} chrome" role="dialog" aria-modal="true">
        <div class="sheet__grabber" aria-hidden="true"></div>
      </div>
    </div>`);
  el.dataset.theme = theme;
  const panel = el.querySelector('.sheet');
  panel.append(content);

  el.querySelector('.scrim').addEventListener('click', () => onRequestClose());
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-done]')) onRequestClose();
  });

  // drag за grabber / шапку
  let drag = null;
  panel.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.sheet__grabber, .sheet__header, .sheet__subtitle')) return;
    if (e.target.closest('button')) return;
    drag = { id: e.pointerId, y0: e.clientY, h: panel.getBoundingClientRect().height, samples: [], started: false };
  });
  panel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.started) {
      if (Math.abs(dy) < 4) return;
      drag.started = true;
      panel.setPointerCapture(e.pointerId);
      panel.classList.add('is-dragging');
    }
    const offset = dy > 0 ? dy : -rubberBand(-dy);
    panel.style.transform = `translateY(${offset}px)`;
    drag.offset = offset;
    drag.samples.push({ y: e.clientY, t: performance.now() });
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.started) return;
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].y - s[0].y) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    panel.classList.remove('is-dragging');
    panel.style.transform = '';
    if ((d.offset || 0) > d.h * SHEET_CLOSE_FRACTION || v > SHEET_CLOSE_VELOCITY) onRequestClose();
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);

  return {
    el,
    panel,
    async open(animate = true) {
      if (!el.isConnected) appRoot().append(el);
      if (!animate) { el.removeAttribute('data-pose'); return; }
      await nextFrame();
      el.removeAttribute('data-pose');
      await waitTransition(panel, cssMs('--dur-sheet'));
    },
    async close(animate = true) {
      if (animate) {
        el.dataset.pose = 'out';
        await waitTransition(panel, cssMs('--dur-sheet'));
      }
      el.remove();
    },
  };
}

/**
 * Ad-hoc лист (не роут): openSheet({ title, subtitle, detent, body: (state) => Element })
 * Повертає { close }.
 */
export function openSheet({ title, subtitle, detent = 'medium', theme = currentTheme(), body, getState }) {
  const content = h('<div class="sheet__content"></div>');
  content.innerHTML = sheetHeaderHTML({ title, subtitle });
  const bodyWrap = h('<div class="sheet__body"></div>');
  content.append(bodyWrap);
  const renderBody = (state) => { bodyWrap.replaceChildren(body(state)); };
  renderBody(getState());

  const layer = { kind: 'sheet', routed: false };
  const sheet = createSheetLayer({ theme, detent, content, onRequestClose: () => close() });
  Object.assign(layer, { el: sheet.el, refresh: renderBody, close: (a) => sheet.close(a) });
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await sheet.close(true);
    unregisterLayer(layer);
  }
  appRoot().insertBefore(sheet.el, getToastHost());
  registerLayer(layer);
  sheet.open(true);
  return { close };
}

/* ---------- Alert ----------
   ComponentsKit AlertVM: center modal .small, кнопки 44, spacing 12, не закривається
   тапом по скриму; > 2 кнопок - вертикально. iOS 26 вигляд (ліве вирівнювання) - скріни 05, 40. */

export function createAlertLayer({ theme, title, message, actions = [], onAction }) {
  const vertical = actions.length > 2;
  const el = h(`
    <div class="layer alert-layer" data-pose="out">
      <div class="scrim"></div>
      <div class="alert chrome" role="alertdialog" aria-modal="true">
        <h2 class="alert__title t-headline">${esc(title)}</h2>
        ${message ? `<p class="alert__message t-footnote">${esc(message)}</p>` : ''}
        <div class="alert__actions${vertical ? ' alert__actions--vertical' : ''}"></div>
      </div>
    </div>`);
  el.dataset.theme = theme;
  const panel = el.querySelector('.alert');
  const row = el.querySelector('.alert__actions');
  actions.forEach((a) => {
    const b = h(`<button class="alert__btn" type="button">${esc(a.label)}</button>`);
    if (a.preferred) b.classList.add('alert__btn--preferred');
    if (a.role === 'destructive') b.classList.add('alert__btn--destructive');
    b.addEventListener('click', () => {
      a.onTap?.();
      onAction?.(a);
    });
    row.append(b);
  });
  return {
    el,
    panel,
    async open(animate = true) {
      if (!el.isConnected) appRoot().append(el);
      if (!animate) { el.removeAttribute('data-pose'); return; }
      await nextFrame();
      el.removeAttribute('data-pose');
      await waitTransition(panel, cssMs('--dur-alert'));
    },
    async close(animate = true) {
      if (animate) {
        el.dataset.pose = 'out';
        await waitTransition(panel, cssMs('--dur-alert'));
      }
      el.remove();
    },
  };
}

/** Ad-hoc alert: openAlert({ title, message, actions: [{ label, role, preferred, onTap }] }) */
export function openAlert({ theme = currentTheme(), ...desc }) {
  const layer = { kind: 'alert', routed: false };
  const alert = createAlertLayer({ theme, ...desc, onAction: () => close() });
  Object.assign(layer, { el: alert.el, close: (a) => alert.close(a) });
  async function close() {
    await alert.close(true);
    unregisterLayer(layer);
  }
  appRoot().insertBefore(alert.el, getToastHost());
  registerLayer(layer);
  alert.open(true);
  return { close };
}

/* ---------- Toast ----------
   ShipSwift SWAlert: капсула з іконкою; info - information-circle, error - exclamation-triangle.
   DEV-DOC: зверху, 250 мс, автозакриття 2.5 с. */

const TOAST_ICONS = { info: 'information-circle', error: 'exclamation-triangle' };

function holdMs() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toast-hold')) || 0;
}

export function createToast({ theme, kind = 'info', message, action, hold, onHidden }) {
  const el = h(`
    <div class="toast toast--${kind} chrome" role="status" data-pose="out">
      ${icon(TOAST_ICONS[kind] || TOAST_ICONS.info)}
      <span class="toast__text">${esc(message)}</span>
    </div>`);
  el.dataset.theme = theme;
  let timer = null;
  let closed = false;
  const api = {
    el,
    async open(animate = true) {
      getToastHost().append(el);
      if (animate) await nextFrame();
      el.removeAttribute('data-pose');
      timer = setTimeout(() => api.close(true), hold ?? holdMs());
    },
    async close(animate = true) {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      if (animate) {
        el.dataset.pose = 'out';
        await waitTransition(el, cssMs('--dur-toast'));
      }
      el.remove();
      onHidden?.();
    },
  };
  if (action) {
    const b = h(`<button class="toast__action" type="button"${action.ariaLabel ? ` aria-label="${esc(action.ariaLabel)}"` : ''}>${esc(action.label)}</button>`);
    b.addEventListener('click', () => { action.onTap?.(); api.close(true); });
    el.append(b);
  }
  return api;
}

/** showToast({ kind: 'info'|'error', message, action: { label, onTap } }) */
export function showToast({ theme = currentTheme(), ...desc }) {
  const t = createToast({ theme, ...desc });
  t.open(true);
  return t;
}

/* ---------- Menu (pull-down) ----------
   Скрін 09: скляне меню поверх рядка, галочка біля вибраного. Поява - scale .95 + fade
   з точки тригера (emilkowalski--animate "Dropdown"). */

/**
 * role: 'radio' (вибір одного значення, типово) | 'checkbox' (незалежні перемикачі, options[].checked)
 *       | 'action' (прості дії без стану, `menuitem`, без галочки; options[].destructive - червоний пункт, S08 Delete session)
 */
export function openMenu({ anchor, options, value, onSelect, role = 'radio', solid = false, theme = currentTheme() }) {
  const app = appRoot();
  const layer = h('<div class="layer menu-layer"></div>');
  layer.dataset.theme = theme;
  // solid: меню над рівним світлим фоном (S08) - суцільна заливка, не скло (CLAUDE.md 1.7)
  const menu = h(`<div class="menu ${solid ? 'menu--solid' : 'chrome'}" role="menu" data-pose="out"></div>`);
  const itemRole = { checkbox: 'menuitemcheckbox', action: 'menuitem' }[role] || 'menuitemradio';
  options.forEach((o) => {
    const b = h(`
      <button class="menu__item${o.destructive ? ' menu__item--destructive' : ''}" type="button" role="${itemRole}"${role === 'action' ? '' : ` aria-checked="${o.checked ?? o.value === value}"`}>
        ${role === 'action' ? '' : icon('check', 'outline', { className: 'menu__check' })}
        <span>${esc(o.label)}</span>
      </button>`);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(o.value);
      close();
    });
    menu.append(b);
  });
  layer.append(menu);
  app.insertBefore(layer, getToastHost());

  // позиція: правий край і верх - як у тригера (меню накриває рядок, скрін 09)
  const a = anchor.getBoundingClientRect();
  const r = app.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  const right = Math.max(0, r.right - a.right);
  let top = a.top - r.top;
  if (top + m.height > r.height) top = Math.max(0, a.bottom - r.top - m.height);
  menu.style.right = `${right}px`;
  menu.style.top = `${top}px`;

  const reg = { kind: 'popover', routed: false, el: layer, close: () => close() };
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    menu.dataset.pose = 'out';
    await waitTransition(menu, cssMs('--dur-popover'));
    layer.remove();
    unregisterLayer(reg);
  }
  layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
  registerLayer(reg);
  requestAnimationFrame(() => requestAnimationFrame(() => menu.removeAttribute('data-pose')));
  return { close };
}

/* ---------- Radiogroup: клавіатура (WAI-ARIA radio group) ----------
   Roving tabindex (Tab потрапляє лише на вибраний), ←/→/↑/↓ - сусідній, Home/End - перший/останній.
   selectOnMove: true - рух одразу вибирає (click на елемент: усі наші групи вибирають по click);
   false - рух лише переносить фокус, вибір - Enter/Space (S04: вибір фокальної згортає ряд). */
export function radioKeys(group, { itemSelector = '[role="radio"]', selectOnMove = true } = {}) {
  const items = () => [...group.querySelectorAll(itemSelector)];
  const sync = () => {
    const list = items();
    const checked = list.find((b) => b.getAttribute('aria-checked') === 'true') || list[0];
    list.forEach((b) => b.setAttribute('tabindex', b === checked ? '0' : '-1'));
  };
  group.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (i === -1) return;
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    else return;
    e.preventDefault();
    // Фокус і tabindex переходять на сусіда ОДРАЗУ (наступний натиск рахується від нього, а не від ще не
    // оновленого aria-checked: у каруселі H04 вибір оновлюється після плавного скролу), потім - вибір.
    const target = list[next];
    list.forEach((b) => b.setAttribute('tabindex', b === target ? '0' : '-1'));
    target.focus();
    if (selectOnMove) target.click();
    // елемент може бути перестворений (innerHTML) - повертаємо фокус на елемент з тим самим індексом
    requestAnimationFrame(() => {
      const fresh = items()[next];
      if (fresh && document.activeElement !== fresh) { fresh.setAttribute('tabindex', '0'); fresh.focus(); }
    });
  });
  new MutationObserver(sync).observe(group, { attributes: true, attributeFilter: ['aria-checked'], subtree: true, childList: true });
  sync();
}
