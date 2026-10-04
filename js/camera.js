/**
 * camera.js - getUserMedia для видошукача (DEV-DOC "Що імітуємо": камера).
 * Якщо доступу немає (відмова, headless, немає пристрою, не HTTPS) - attach() повертає false,
 * і екран лишає статичну заглушку (S04: .vf__media[data-photo-placeholder]).
 * Одночасно живе один потік: новий attach() зупиняє попередній (S04 перемонтується роутером
 * без хука знищення, тож стару <video> вже не потрібно).
 */

let active = null; // { video, stream, facing }

function stop() {
  if (!active) return;
  active.stream.getTracks().forEach((t) => t.stop());
  if (active.video) active.video.srcObject = null;
  active = null;
}

/** facing: 'back' | 'front' (state.camera.facing) -> Promise<boolean> */
export async function attach(video, facing) {
  if (active && active.video === video && active.facing === facing) return true;
  stop();
  const md = navigator.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') return false;
  try {
    const stream = await md.getUserMedia({
      video: { facingMode: { ideal: facing === 'front' ? 'user' : 'environment' } },
      audio: false,
    });
    if (!video.isConnected) { stream.getTracks().forEach((t) => t.stop()); return false; }
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => {});
    active = { video, stream, facing };
    return true;
  } catch {
    return false;
  }
}

export function detach() {
  stop();
}

export function isLive() {
  return Boolean(active);
}

/**
 * S05: другий <video> (зменшений видошукач) показує ТОЙ САМИЙ потік, що й S04, без нового
 * getUserMedia - інакше attach() зупинив би потік S04 під модалкою, і після S05 камера S04 була б мертва.
 * -> true, якщо потік є і під'єднаний.
 */
export function mirror(video) {
  if (!active || !video) return false;
  if (video.srcObject !== active.stream) {
    video.srcObject = active.stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }
  return true;
}

/* ---------- Capture (DEV-DOC "Що імітуємо": зйомка кадру) ---------- */

const CAPTURE_LONG_SIDE = 1200;  // px довгої сторони кадру; лише прототип (dataURL живе в пам'яті, не в localStorage)
const CAPTURE_QUALITY = 0.82;    // JPEG
const STUB_JITTER = 0.12;        // [approx] випадковий зсув центру заглушки, частка кадру (DEV-DOC: "копія з випадковим зсувом/кропом")
const STUB_CROP = 0.08;          // [approx] випадковий додатковий кроп заглушки

function cssVar(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function frameSize(aspect) {
  const [w, h] = String(aspect || '3:4').split(':').map(Number);
  const r = w / h;
  return r >= 1
    ? { w: CAPTURE_LONG_SIDE, h: Math.round(CAPTURE_LONG_SIDE / r) }
    : { w: Math.round(CAPTURE_LONG_SIDE * r), h: CAPTURE_LONG_SIDE };
}

/** Заглушка без камери: та сама радіальна заливка, що .vf__media (токени теми з styleSource), з випадковим зсувом/кропом */
function drawStub(ctx, w, h, styleSource) {
  const src = styleSource || document.documentElement;
  const c1 = cssVar(src, '--fill-raised');
  const c2 = cssVar(src, '--surface');
  const c3 = cssVar(src, '--bg');
  const crop = 1 + Math.random() * STUB_CROP;
  const cx = w * (0.5 + (Math.random() * 2 - 1) * STUB_JITTER);
  const cy = h * (0.3 + (Math.random() * 2 - 1) * STUB_JITTER);
  const r = Math.max(w, h) * 0.8 * crop;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, c1);
  g.addColorStop(0.55, c2);
  g.addColorStop(1, c3);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Знімок кадру -> dataURL (JPEG). Джерело - активний потік (<video> S04/S05), інакше заглушка.
 * { aspect '3:4', filter - CSS filter Look (DEV-DOC "Дані": запікається через ctx.filter), zoom (focal / 26),
 *   mirror (фронтальна), exposure (-1..1) і exposureRange (як .vf__media brightness), styleSource - елемент з токенами теми }
 */
export function capture({ aspect = '3:4', filter = 'none', zoom = 1, mirror: flip = false, exposure = 0, exposureRange = 0.5, styleSource } = {}) {
  const { w, h } = frameSize(aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const bright = 1 + exposure * exposureRange;
  const parts = [filter && filter !== 'none' ? filter : '', bright !== 1 ? `brightness(${bright})` : ''].filter(Boolean);
  ctx.filter = parts.length ? parts.join(' ') : 'none';

  const video = active?.video;
  if (video && video.readyState >= 2 && video.videoWidth) {
    // object-fit: cover + зум фокусної (як transform: scale на .vf__media)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(w / vw, h / vh) * zoom;
    const sw = w / scale;
    const sh = h / scale;
    ctx.save();
    if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
    ctx.restore();
  } else {
    drawStub(ctx, w, h, styleSource);
  }
  return canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
}
