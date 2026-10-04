/**
 * _placeholder.js - плейсхолдер для ще не збудованого екрана з інвентарю.
 * НЕ вигаданий UI екрана: лише debug-позначка "not built" у контейнері потрібного типу
 * (screen / modal / sheet / alert / toast), щоб роутер, debug Jump і рендер працювали
 * для всіх 22 роутів з першого етапу. Замінюється модулем екрана в його етапі.
 */

import { copy } from '../copy.js';
import { h, esc } from '../ui.js';

function nameOf(id) {
  return copy.screens[id] || id;
}

function stateNote(ctx) {
  const s = ctx.params.state;
  return s ? ` · state=${s}` : '';
}

function body(ctx) {
  const { id, entry } = ctx;
  return `
    <div class="placeholder__card">
      <p class="placeholder__tag t-mono-caption">${esc(copy.debug.placeholderTag)}</p>
      <p class="placeholder__id t-title2">${esc(id)}${esc(stateNote(ctx))}</p>
      <p class="placeholder__name t-body">${esc(nameOf(id))}</p>
      <p class="placeholder__note t-footnote">${esc(copy.debug.placeholderNote(entry.phase, entry.type))}</p>
      ${ctx.entry.parent ? `<button class="placeholder__back pressable" type="button" data-placeholder-back>${esc(copy.debug.placeholderBack)}</button>` : ''}
    </div>`;
}

export function render(state, ctx) {
  const { entry, id } = ctx;

  if (entry.type === 'alert') {
    return {
      title: `${id} · ${nameOf(id)}`,
      message: copy.debug.placeholderNote(entry.phase, entry.type),
      actions: [{ label: copy.debug.placeholderBack, preferred: true }],
    };
  }
  if (entry.type === 'toast') {
    return { kind: 'error', message: copy.debug.toastStub(id, nameOf(id)) }; // T01 - error-тост (DEV-DOC)
  }

  if (entry.type === 'sheet') {
    const el = h(`<div class="sheet__content placeholder placeholder--sheet"><div class="sheet__body">${body(ctx)}</div></div>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-placeholder-back]')) ctx.router.back(); });
    return el;
  }

  const el = h(`<div class="placeholder placeholder--full"><div class="placeholder__center">${body(ctx)}</div></div>`);
  el.dataset.theme = entry.theme || 'light';
  el.addEventListener('click', (e) => { if (e.target.closest('[data-placeholder-back]')) ctx.router.back(); });
  return el;
}
