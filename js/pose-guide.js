/**
 * pose-guide.js - Pose guide (FR-8.3, скрін 33): напівпрозора накладка референса на видошукач + панель керування.
 * paintPoseOverlay(el, state) - накладка в слоті [data-slot="pose-guide"] (S04 і S05; на S05 лише накладка, без панелі).
 * mountPosePanel(root, ctx) / syncPosePanel(root, state) - панель у [data-slot="pose-guide-panel"] (лише S04):
 * мініатюра референса, слайдер прозорості, ×. Прозорість і референс - state.poseGuide.
 */

import { copy } from './copy.js';
import * as store from './state.js';
import { icon } from './icons.js';
import { esc } from './ui.js';
import { slider } from './components.js';
import { mountSlider, setSlider } from './slider.js';
import { haptic } from './haptic.js';
import { byId, inspoPhoto, titleOf, POSE_OPACITY } from './inspo.js';

const t = copy.poseGuide;

/** Референс зі store або null (poseGuide.inspoId вказує на неіснуючий запис -> накладки немає) */
export function activeReference(state) {
  const id = state.poseGuide.inspoId;
  return id ? byId(id) : null;
}

export function paintPoseOverlay(root, state) {
  const slot = root.querySelector('[data-slot="pose-guide"]');
  if (!slot) return;
  const item = activeReference(state);
  slot.style.setProperty('--pose-o', String(state.poseGuide.opacity));
  const key = item ? item.id : '';
  if (slot.dataset.ref !== key) {
    slot.dataset.ref = key;
    slot.innerHTML = item ? inspoPhoto(item, 'inspo-photo--overlay', { decorative: true }) : ''; // назву озвучує панель
  }
  slot.hidden = !item;
}

function panelHTML(item, state) {
  const o = state.poseGuide.opacity;
  return `
    <div class="pose-panel glass" role="group" aria-label="${esc(t.a11y.panel)}">
      <span class="pose-panel__thumb" role="img" aria-label="${esc(t.a11y.thumbnail(titleOf(item.id)))}">${inspoPhoto(item, 'inspo-photo--thumb', { decorative: true })}</span>
      ${slider({ name: 'pose-opacity', value: o, min: POSE_OPACITY.min, max: POSE_OPACITY.max, step: POSE_OPACITY.step, label: t.a11y.opacity, valueText: t.opacityValue(o) })}
      <button class="icon-btn icon-btn--plain icon-btn--sm pose-panel__close" type="button" data-action="pose-close" aria-label="${esc(t.a11y.close)}">${icon('x-mark')}</button>
    </div>`;
}

/** Панель будується лише при зміні референса; слайдер оновлюється точково (ручка не втрачає pointer capture) */
export function syncPosePanel(root, state) {
  const slot = root.querySelector('[data-slot="pose-guide-panel"]');
  if (!slot) return;
  const item = activeReference(state);
  const key = item ? item.id : '';
  if (slot.dataset.ref !== key) {
    slot.dataset.ref = key;
    slot.innerHTML = item ? panelHTML(item, state) : '';
    const sl = slot.querySelector('.slider');
    if (sl) {
      mountSlider(sl, { onInput: (v) => store.set({ poseGuide: { opacity: v } }) });
    }
  }
  slot.hidden = !item;
  const sl = slot.querySelector('.slider');
  if (sl) setSlider(sl, state.poseGuide.opacity, t.opacityValue(state.poseGuide.opacity));
}

/** × закриває накладку (inspoId = null); повертає true, якщо дію оброблено */
export function closePoseGuide() {
  haptic('light');
  store.set({ poseGuide: { inspoId: null } });
}
