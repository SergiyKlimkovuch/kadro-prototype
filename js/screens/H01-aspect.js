/**
 * H01 Aspect ratio - DEV-DOC "### H01 Aspect ratio", PRD FR-2.5, скрін 23.
 * Лист detent fit (висота за вмістом, до 50%) поверх S04 (тема листа = тема S04, світла). Заголовок + Done, підпис,
 * SegmentChip-група 3:4 · 9:16 · 1:1 · 4:3 · 16:9 (radiogroup, aria-checked).
 * Вибір одразу пише state.camera.aspect - видошукач S04 позаду анімує висоту (300 мс, S04 .vf).
 * Параметри: ?aspect=9:16 (route-params.js).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { h, sheetHeaderHTML, radioKeys } from '../ui.js';
import { segmentGroup } from '../components.js';
import { haptic } from '../haptic.js';
import { aspectRatios } from '../data.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.H01;

export function render(state, ctx) {
  const s = applyRouteParams(ctx.params, { overCamera: true });
  const el = h(`
    <div class="sheet__content h01">
      ${sheetHeaderHTML({ title: t.title, subtitle: t.subtitle })}
      <div class="sheet__body" data-scroll>
        ${segmentGroup({
          name: 'aspect',
          label: t.a11y.group,
          value: s.camera.aspect,
          items: aspectRatios.map((r) => ({ value: r, label: t.chip(r) })),
        })}
      </div>
    </div>`);
  // aria-label кожного чіпа - з озвученням ("9 by 16, tall"), видимий текст лишається "9:16"
  el.querySelectorAll('[data-segment="aspect"]').forEach((b) => b.setAttribute('aria-label', t.a11y.chip(b.dataset.value)));

  radioKeys(el.querySelector('[data-segment-group]'));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-segment="aspect"]');
    if (!b) return;
    if (store.get().camera.aspect === b.dataset.value) return;
    haptic('light');
    store.set({ camera: { aspect: b.dataset.value } });
  });
  return el;
}

export function update(el, state) {
  el.querySelectorAll('[data-segment="aspect"]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.value === state.camera.aspect));
  });
}
