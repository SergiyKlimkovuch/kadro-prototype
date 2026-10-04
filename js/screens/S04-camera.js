/**
 * S04 Camera (main) - DEV-DOC "### S04 Camera (main)", FR-1.3, FR-1.4, FR-2.1-2.7.
 * Тема світла (CLAUDE.md 1.8), root-екран. Стани (параметр ?state=):
 *   live        - видошукач з камерою або заглушкою (getUserMedia, js/camera.js)
 *   off         - FR-1.3: "Camera is off" + Settings (імітація дозволу -> live)
 *   coach       - FR-1.4: затемнення + підсвічений чіп Photo Session, "Step 1 of 3"
 *   pose-guide  - FR-8.3: накладка референса (слот pose-guide) + панель (слот pose-guide-panel); насправді накладка = state.poseGuide.inspoId
 *                 (ставить S10/S11), тож вона живе у будь-якому стані live; ?state=pose-guide лише підставляє типовий референс для відладки
 * Без параметра: permissions.camera === 'denied' -> off; інакше live, а coach - якщо !state.coachSeen.
 *
 * Екран перемальовується точково (export update), а не з нуля: інакше не спрацюють transitions
 * висоти видошукача (300 мс), зуму фокусної і перемикача.
 */

import { copy, APP_NAME } from '../copy.js';
import * as store from '../state.js';
import { icon } from '../icons.js';
import { h, esc, openMenu, showToast, radioKeys } from '../ui.js';
import { cssMs } from '../router.js';
import { iconButton, button, segmentChip, sessionChip, wordmark } from '../components.js';
import { haptic } from '../haptic.js';
import { looks as looksData, focalLengths, flashModes } from '../data.js';
import * as camera from '../camera.js';
import { applyRouteParams } from '../route-params.js';
import { paintPoseOverlay, syncPosePanel, closePoseGuide, activeReference } from '../pose-guide.js';
import { DEBUG_POSE_ID, titleOf } from '../inspo.js';

const t = copy.S04;
const BASE_FOCAL = focalLengths[0];   // 26 mm - основна камера, зум = focal / 26
const FOCUS_HYSTERESIS = 10;          // px, apple-design §10

/* ---------- стан екрана ---------- */

function resolveView(state, params) {
  const p = params.state;
  if (p === 'off' || p === 'coach' || p === 'live' || p === 'pose-guide') return p;
  return state.permissions.camera === 'denied' ? 'off' : 'live';
}

function coachVisible(state, params, ui) {
  if (ui.coachDismissed) return false;
  const view = resolveView(state, params);
  if (view === 'coach') return true;
  if (params.state) return false;                   // явний ?state=live|off|pose-guide
  return view === 'live' && !state.coachSeen;       // перший вхід у S04 (FR-1.4)
}

function ratioOf(aspect) {
  const [w, hh] = aspect.split(':').map(Number);
  return w / hh;
}

/* ---------- розмітка ---------- */

function modesHTML(state, coach) {
  if (state.session.configured) {
    return sessionChip({
      text: t.sessionChip(state.session),
      expandLabel: copy.a11y.expandSession,
      resetLabel: copy.a11y.resetSession,
    });
  }
  const sessionBtn = segmentChip({
    label: t.mode.session,
    iconName: 'clock',
    action: 'mode-session',
    attrs: coach ? 'data-spotlight="true"' : '',
  });
  const boothBtn = segmentChip({ label: t.mode.booth, iconName: 'rectangle-stack', action: 'mode-booth' });
  const card = coach ? `
    <div class="coach-card chrome" role="group" aria-label="${esc(t.coach.title)}">
      <p class="coach-card__step t-mono-caption">${esc(t.coach.step(1, 3))}</p>
      <h2 class="coach-card__title t-headline">${esc(t.coach.title)}</h2>
      <p class="coach-card__text t-footnote">${esc(t.coach.message)}</p>
      ${button({ label: t.coach.skip, variant: 'fill', size: 'sm', action: 'coach-skip' })}
    </div>` : '';
  return `${card}<div class="cam__modes-row">${sessionBtn}${boothBtn}</div>`;
}

function focalRowHTML(focal) {
  return focalLengths.map((mm) => `
    <button class="focal-btn" type="button" role="radio" aria-checked="${mm === focal}"
      aria-label="${esc(t.a11y.focal(mm))}" data-action="focal-select" data-value="${mm}">
      <span class="focal-btn__disc">${mm}</span>
    </button>`).join('');
}

function skeleton() {
  return `
  <section class="cam" data-theme="light">
    <header class="cam__header">
      <div class="cam__slot">${iconButton({ name: 'cog-6-tooth', label: copy.a11y.settings, variant: 'plain', action: 'settings' })}</div>
      ${wordmark({ name: APP_NAME })}
      <div class="cam__slot cam__slot--end"><button class="btn btn--text btn--sm cam__inspo" type="button" data-action="inspo"><span>${esc(t.header.inspo)}</span></button></div>
    </header>

    <div class="cam__stage">
      <div class="vf" data-theme="dark">
        <div class="vf__clip" data-vf>
          <div class="vf__media" data-photo-placeholder="camera-viewfinder">
            <video class="vf__video" playsinline muted autoplay></video>
          </div>
          <div class="vf__grid" aria-hidden="true">
            <i class="vf__line vf__line--v1"></i><i class="vf__line vf__line--v2"></i>
            <i class="vf__line vf__line--h1"></i><i class="vf__line vf__line--h2"></i>
          </div>
          <div class="vf__level" aria-hidden="true"><i class="vf__level-seg"></i><i class="vf__level-seg vf__level-seg--on"></i><i class="vf__level-seg"></i></div>
          <div class="vf__off">
            ${icon('video-camera-slash', 'outline', { className: 'vf__off-icon' })}
            <h2 class="vf__off-title t-headline">${esc(t.off.title)}</h2>
            <p class="vf__off-text t-footnote">${esc(t.off.message)}</p>
            ${button({ label: t.off.action, variant: 'primary', size: 'sm', action: 'open-settings' })}
          </div>
          <div class="vf__pose" data-slot="pose-guide"></div>
          <div class="vf__focus" aria-hidden="true"><span class="vf__focus-frame"></span>${icon('sun', 'outline', { className: 'vf__focus-sun' })}</div>
        </div>
        <div class="vf__pose-panel" data-slot="pose-guide-panel"></div>
        <button class="icon-btn icon-btn--glass icon-btn--sm vf__more" type="button" data-action="vf-more" aria-haspopup="menu" aria-label="${esc(t.a11y.more)}">${icon('ellipsis-horizontal')}</button>
        <button class="focal-badge glass" type="button" data-action="focal-toggle" aria-expanded="false"></button>
      </div>
    </div>

    <div class="cam__panel">
      <div class="cam__modes" data-bind="modes"></div>
      <div class="cam__controls">
        <div class="cam__col cam__col--start"><button class="btn btn--text btn--sm cam__aspect" type="button" data-action="aspect"><span data-bind="aspect"></span></button></div>
        <div class="cam__col"><button class="icon-btn icon-btn--plain" type="button" data-action="flash" data-bind="flash"></button></div>
        <div class="cam__col cam__col--end"><button class="icon-btn icon-btn--plain cam__flip" type="button" data-action="flip" aria-label="${esc(t.a11y.flipCamera)}">${icon('arrow-path')}</button></div>
      </div>
      <div class="cam__focals" role="radiogroup" aria-label="${esc(t.a11y.focalGroup)}" data-bind="focals"></div>
    </div>

    <footer class="cam__bottom">
      <button class="cam__tile pressable" type="button" data-action="thumb" data-bind="thumb"></button>
      <button class="cam__start pressable" type="button" data-action="start" aria-label="${esc(t.a11y.startSession)}">${icon('sparkles', 'solid')}</button>
      <button class="cam__tile pressable" type="button" data-action="look" aria-label="${esc(t.a11y.look)}">${icon('film')}</button>
    </footer>

    <div class="cam__scrim" aria-hidden="true"></div>
    <p class="sr-only" aria-live="polite" data-bind="live"></p>
  </section>`;
}

/* ---------- точкове оновлення з store ---------- */

function sync(el, state) {
  const ui = el._ui;
  const { camera: cam, settings } = state;
  const view = resolveView(state, ui.params);
  const off = view === 'off';
  const coach = coachVisible(state, ui.params, ui);
  const ratio = ratioOf(cam.aspect);
  const q = (s) => el.querySelector(s);

  el.dataset.view = view;
  el.classList.toggle('is-coach', coach);
  el.classList.toggle('is-focal-open', ui.focalOpen);

  const vf = q('.vf');
  vf.style.setProperty('--vf-r', String(ratio));
  vf.style.setProperty('--vf-zoom', String(cam.focal / BASE_FOCAL));
  vf.style.setProperty('--vf-mirror', cam.facing === 'front' ? '-1' : '1');
  vf.style.setProperty('--vf-exp', String(ui.liveExposure ?? cam.exposure));
  const look = looksData.find((l) => l.id === state.lookId);
  vf.style.setProperty('--vf-look', look && look.filter !== 'none' ? look.filter : 'brightness(1)');
  vf.dataset.aspect = cam.aspect;
  vf.dataset.facing = cam.facing;
  vf.dataset.grid = String(settings.grid);
  vf.dataset.level = String(settings.level);

  // фокусна
  const badge = q('.focal-badge');
  badge.textContent = t.focalLabel(cam.focal);
  badge.setAttribute('aria-label', t.a11y.focal(cam.focal));
  badge.setAttribute('aria-expanded', String(ui.focalOpen));
  const focals = q('[data-bind="focals"]');
  if (ui.sig.focals !== cam.focal) { focals.innerHTML = focalRowHTML(cam.focal); ui.sig.focals = cam.focal; }
  q('.cam__controls').inert = ui.focalOpen;
  q('.cam__modes').inert = ui.focalOpen;
  focals.inert = !ui.focalOpen;

  // aspect ratio, спалах
  q('[data-bind="aspect"]').textContent = t.aspectLabel(cam.aspect);
  q('.cam__aspect').setAttribute('aria-label', t.a11y.aspect(cam.aspect));
  const flashBtn = q('[data-bind="flash"]');
  if (ui.sig.flash !== cam.flash) {
    flashBtn.innerHTML = icon(cam.flash === 'off' ? 'bolt-slash' : 'bolt', cam.flash === 'on' ? 'solid' : 'outline');
    flashBtn.setAttribute('aria-label', t.a11y.flash[cam.flash]);
    flashBtn.dataset.flash = cam.flash;
    ui.sig.flash = cam.flash;
  }
  flashBtn.setAttribute('aria-disabled', String(off));
  q('.cam__flip').setAttribute('aria-disabled', String(off));
  q('.cam__flip').dataset.facing = cam.facing;

  // ряд під видошукачем: чіпи / SessionChip (+ картка coach)
  const modesSig = `${state.session.configured}|${state.session.configured ? t.sessionChip(state.session) : ''}|${coach}`;
  if (ui.sig.modes !== modesSig) {
    q('[data-bind="modes"]').innerHTML = modesHTML(state, coach);
    ui.sig.modes = modesSig;
  }

  // pose guide: накладка + панель (FR-8.3); оголошення лише при зміні після першого малювання
  paintPoseOverlay(el, state);
  syncPosePanel(el, state);
  const pose = activeReference(state);
  const poseKey = pose ? pose.id : '';
  if (ui.sig.pose !== undefined && ui.sig.pose !== poseKey) {
    const live = q('[data-bind="live"]');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = pose ? copy.poseGuide.states.applied(titleOf(pose.id)) : copy.poseGuide.states.hidden; });
  }
  ui.sig.pose = poseKey;

  // мініатюра останньої сесії
  const last = state.sessions[state.sessions.length - 1];
  const src = last?.photos?.[0]?.src || '';
  if (ui.sig.thumb !== src) {
    const thumb = q('[data-bind="thumb"]');
    thumb.innerHTML = src ? `<img class="cam__thumb-img" src="${esc(src)}" alt="">` : icon('photo');
    thumb.setAttribute('aria-label', src ? t.a11y.thumbnail : t.a11y.thumbnailEmpty);
    ui.sig.thumb = src;
  }

  // камера: потік лише коли дозвіл імітовано і екран не off
  const wantStream = state.permissions.camera === 'granted' && !off;
  const key = wantStream ? cam.facing : '';
  if (ui.sig.stream !== key) {
    ui.sig.stream = key;
    const media = q('.vf__media');
    if (!wantStream) { camera.detach(); media.classList.remove('has-stream'); }
    else camera.attach(q('.vf__video'), cam.facing).then((ok) => { if (ui.sig.stream === key) media.classList.toggle('has-stream', ok); });
  }
}

/* ---------- жести і дії ---------- */

function placeFocus(el, ui, e) {
  const clip = el.querySelector('.vf__clip');
  const r = clip.getBoundingClientRect();
  const focus = el.querySelector('.vf__focus');
  const half = parseFloat(getComputedStyle(focus).getPropertyValue('--focus-frame')) / 2 || 0;
  const x = Math.min(Math.max(e.clientX - r.left, half), r.width - half);
  const y = Math.min(Math.max(e.clientY - r.top, half), r.height - half);
  focus.style.left = `${x - half}px`;
  focus.style.top = `${y - half}px`;
  focus.classList.remove('is-on');
  void focus.offsetWidth; // перезапуск scale 1.4 -> 1
  focus.classList.add('is-on');
}

function scheduleHide(el, ui) {
  clearTimeout(ui.hideTimer);
  ui.hideTimer = setTimeout(() => el.querySelector('.vf__focus').classList.remove('is-on'), cssMs('--focus-hold'));
}

function bindFocus(el) {
  const ui = el._ui;
  const clip = el.querySelector('.vf__clip');
  clip.addEventListener('pointerdown', (e) => {
    if (el.dataset.view === 'off' || e.button > 0) return;
    clip.setPointerCapture(e.pointerId);
    clearTimeout(ui.hideTimer);
    placeFocus(el, ui, e);
    ui.drag = { id: e.pointerId, y0: e.clientY, e0: store.get().camera.exposure, h: clip.getBoundingClientRect().height, moved: false };
  });
  clip.addEventListener('pointermove', (e) => {
    const d = ui.drag;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dy) < FOCUS_HYSTERESIS) return;
    d.moved = true;
    ui.liveExposure = Math.min(1, Math.max(-1, d.e0 - dy / (d.h / 2)));
    el.querySelector('.vf').style.setProperty('--vf-exp', String(ui.liveExposure));
    clearTimeout(ui.hideTimer);
  });
  const end = (e) => {
    const d = ui.drag;
    if (!d || e.pointerId !== d.id) return;
    ui.drag = null;
    if (d.moved) {
      const exposure = Math.round(ui.liveExposure * 100) / 100;
      ui.liveExposure = null;
      store.set({ camera: { exposure } });
    }
    haptic('light');
    scheduleHide(el, ui);
  };
  clip.addEventListener('pointerup', end);
  clip.addEventListener('pointercancel', end);
}

function openViewfinderMenu(btn) {
  const s = store.get().settings;
  openMenu({
    anchor: btn,
    options: [
      { value: 'grid', label: t.menu.grid, checked: s.grid },
      { value: 'level', label: t.menu.level, checked: s.level },
      { value: 'countdownSound', label: t.menu.timerSound, checked: s.countdownSound },
    ],
    role: 'checkbox',
    onSelect: (key) => {
      haptic('light');
      store.set({ settings: { [key]: !store.get().settings[key] } });
    },
  });
}

function onAction(el, action, target, ctx) {
  const ui = el._ui;
  const s = store.get();
  const { router } = ctx;
  switch (action) {
    case 'settings': router.push('S12'); break;
    case 'inspo': router.push('S10'); break;
    case 'aspect': haptic('light'); router.push('H01'); break;
    case 'flash': {
      const next = flashModes[(flashModes.indexOf(s.camera.flash) + 1) % flashModes.length];
      haptic('light');
      store.set({ camera: { flash: next } });
      break;
    }
    case 'flip':
      haptic('light');
      store.set({ camera: { facing: s.camera.facing === 'back' ? 'front' : 'back' } });
      break;
    case 'mode-session':
    case 'session-expand':
      haptic('light');
      if (el.classList.contains('is-coach')) { ui.coachDismissed = true; store.set({ coachSeen: true }); } // тап на підсвічений чіп = крок 1 виконано
      router.push('H02');
      break;
    case 'mode-booth': haptic('light'); router.push('M01', { source: 'booth' }); break;
    case 'session-reset': haptic('light'); store.set({ session: { configured: false } }); break;
    case 'thumb': router.push('S08'); break;
    case 'look': haptic('light'); router.push('H04'); break;
    case 'start': haptic('medium'); router.push('S05'); break; // без налаштованої сесії - Capture defaults (S05 читає state.session)
    case 'focal-toggle':
      ui.focalOpen = !ui.focalOpen;
      if (!s.focalHintSeen) {
        store.set({ focalHintSeen: true }, { silent: true });
        showToast({ kind: 'info', message: t.focalHint });
      }
      haptic('light');
      sync(el, store.get());
      break;
    case 'focal-select':
      haptic('light');
      ui.focalOpen = false;
      store.set({ camera: { focal: Number(target.dataset.value) } });
      sync(el, store.get());
      break;
    case 'vf-more': openViewfinderMenu(target); break;
    case 'pose-close': closePoseGuide(); break;
    case 'open-settings':
      // iOS Settings імітуємо: дозвіл granted -> перебудова екрана без ?state=off
      store.set({ permissions: { camera: 'granted' } });
      router.jump('S04');
      break;
    case 'coach-skip':
      ui.coachDismissed = true;
      store.set({ coachSeen: true });
      break;
    default: break;
  }
}

/* ---------- контракт модуля ---------- */

export function render(initial, ctx) {
  let state = applyRouteParams(ctx.params); // ?session=outfit -> SessionChip, ?aspect=, ?plus= (route-params.js)
  if (ctx.params.state === 'pose-guide' && !state.poseGuide.inspoId) {
    store.set({ poseGuide: { inspoId: DEBUG_POSE_ID } }); // відладка: стан pose-guide без проходу через S10/S11
    state = store.get();
  } else if (['live', 'off', 'coach'].includes(ctx.params.state) && state.poseGuide.inspoId) {
    store.set({ poseGuide: { inspoId: null } }); // відладка: явний стан без накладки (в реальній навігації ?state= не буває)
    state = store.get();
  }
  const el = h(skeleton());
  el._ui = { params: ctx.params, coachDismissed: false, focalOpen: false, liveExposure: null, hideTimer: null, drag: null, sig: {} };
  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || target.getAttribute('aria-disabled') === 'true') return;
    onAction(el, target.dataset.action, target, ctx);
  });
  radioKeys(el.querySelector('[data-bind="focals"]'), { selectOnMove: false });
  bindFocus(el);
  sync(el, state);
  return el;
}

export function update(el, state) {
  sync(el, state);
}
