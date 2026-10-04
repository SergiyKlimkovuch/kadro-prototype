/**
 * S02 Camera pre-permission (FR-1.2, DEV-DOC "S02"). Тема dark (open-questions #7).
 * Layout: плитка з іконкою камери -> заголовок -> підзаголовок -> 3 пункти -> Allow camera -> Not now.
 * Allow camera -> A01. Not now -> S04 (стан off), onboarded = true.
 */
import { copy } from '../copy.js';
import * as store from '../state.js';
import { h, esc } from '../ui.js';
import { icon } from '../icons.js';
import { button } from '../components.js';

const t = copy.S02;
const GLYPHS = { timer: 'clock', device: 'device-phone-mobile', noAccount: 'user' };

export function render(state, ctx) {
  const rows = t.points.map((p) => `
    <div class="list-row">
      <span class="list-row__glyph">${icon(GLYPHS[p.id])}</span>
      <span class="list-row__content">
        <span class="list-row__title">${esc(p.title)}</span>
        <span class="list-row__subtitle">${esc(p.text)}</span>
      </span>
    </div>`).join('');

  const el = h(`
    <div class="s02" data-theme="dark">
      <div class="s02__scroll" data-scroll>
        <div class="s02__tile">${icon('camera', 'outline', { className: 'icon--hero' })}</div>
        <h1 class="s02__title t-large-title">${esc(t.title)}</h1>
        <p class="s02__subtitle t-body t-secondary">${esc(t.subtitle)}</p>
        <div class="s02__points"><div class="list-group list-group--glyphs">${rows}</div></div>
      </div>
      <div class="s02__actions">
        ${button({ label: t.allow, variant: 'primary', block: true, action: 'allow' })}
        ${button({ label: copy.common.notNow, variant: 'text', block: true, action: 'not-now' })}
        <p class="s02__footnote t-footnote t-secondary">${esc(t.footnote)}</p>
      </div>
    </div>`);

  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'allow') ctx.router.push('A01');
    if (a.dataset.action === 'not-now') {
      store.set({ onboarded: true });
      ctx.router.jump('S04', { state: 'off' });
    }
  });
  return el;
}

export function update() {}
