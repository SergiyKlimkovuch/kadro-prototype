/**
 * A03 Purchase sheet (DEV-DOC M01: "A03 - імітація StoreKit: назва плану, ціна, кнопка Subscribe"). Лист поверх M01,
 * тема - від M01 (dark). Це імітація: нічого не списується ([mock], у проді - RevenueCat, open-questions #80).
 * Потік: Subscribe -> "Processing…" (спінер, --purchase-processing = 1 с) -> "You're all set" (--purchase-done-hold)
 *   -> isPlus = true (на показі успіху), закрити A03 і M01, тост, повернення туди, звідки відкрили пейвол.
 * Параметри роуту: plan=annual|weekly; state=processing|success (debug: зупиняє потік на цьому кроці).
 * Закриття листа (Cancel, скрим, drag) під час обробки скасовує покупку: onClose гасить таймери, isPlus не ставиться.
 */
import { copy } from '../copy.js';
import { plans } from '../data.js';
import * as store from '../state.js';
import { h, esc, sheetHeaderHTML, showToast } from '../ui.js';
import { icon } from '../icons.js';
import { button } from '../components.js';
import { haptic } from '../haptic.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.A03;

const cssNumber = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

export function render(state, ctx) {
  applyRouteParams(ctx.params, { overCamera: true }); // plus=0|1 (debug)
  const plan = plans.find((p) => p.id === ctx.params.plan) || plans.find((p) => p.defaultSelected) || plans[0];
  const planName = copy.M01.plan[plan.id].name;
  const ui = { phase: 'ready', timers: [] };

  const el = h(`
    <div class="sheet__content a03" role="group" aria-label="${esc(t.a11y.sheet)}">
      ${sheetHeaderHTML({ title: t.title, doneLabel: t.cancel })}
      <div class="sheet__body a03__body" data-scroll>
        <div class="a03__ready" data-view="ready">
          <div class="a03__card">
            <div class="a03__row">
              <p class="a03__app t-headline">${esc(t.app)}</p>
              <p class="a03__plan t-footnote t-secondary">${esc(t.planLine(planName))}</p>
            </div>
            <div class="a03__row a03__row--rule">
              <p class="a03__price t-body tabular">${esc(t.priceLine(plan))}</p>
              <p class="a03__renewal t-footnote t-secondary">${esc(t.renewal)}</p>
            </div>
            <div class="a03__row a03__row--rule a03__account">
              ${icon('user', 'outline', { className: 'a03__account-icon' })}
              <span class="t-body">${esc(t.account)}</span>
            </div>
          </div>
        </div>
        <div class="a03__busy" data-view="processing" hidden>
          <span class="spinner" role="img" aria-label="${esc(t.a11y.spinner)}"></span>
          <p class="a03__status t-headline" role="status">${esc(t.processing)}</p>
        </div>
        <div class="a03__done" data-view="success" hidden>
          ${icon('check-circle', 'solid', { className: 'a03__done-icon' })}
          <h2 class="a03__done-title t-title2">${esc(t.success.title)}</h2>
          <p class="a03__done-text t-footnote t-secondary">${esc(t.success.message)}</p>
        </div>
        <div class="a03__action" data-view="ready">${button({ label: t.subscribe, variant: 'primary', block: true, action: 'subscribe' })}</div>
      </div>
    </div>`);

  const cancel = el.querySelector('[data-sheet-done]');
  cancel.setAttribute('aria-label', t.a11y.cancel);

  function show(phase) {
    ui.phase = phase;
    el.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== phase; });
    cancel.setAttribute('aria-disabled', String(phase === 'success')); // успіх - вже не скасувати
  }

  const later = (fn, ms) => { ui.timers.push(setTimeout(fn, ms)); };

  function succeed(autoClose) {
    show('success');
    haptic('success');
    store.set({ isPlus: true }); // [mock] покупка успішна: розблоковує Looks, знімає ліміт експорту
    if (!autoClose) return;
    later(async () => {
      await ctx.router.back(); // A03
      await ctx.router.back(); // M01 -> екран, звідки відкрили
      showToast({ kind: 'info', message: t.success.message });
    }, cssNumber('--purchase-done-hold'));
  }

  function subscribe() {
    show('processing');
    later(() => succeed(true), cssNumber('--purchase-processing'));
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="subscribe"]') && ui.phase === 'ready') { haptic('medium'); subscribe(); }
  });

  el._cancel = () => { ui.timers.forEach(clearTimeout); ui.timers = []; };

  // debug: state=processing (стоп на спінері) / success (без закриття і без isPlus-автозакриття)
  if (ctx.params.state === 'processing') show('processing');
  else if (ctx.params.state === 'success') show('success');
  else show('ready');
  return el;
}

/** Store не перемальовує лист: фаза покупки - локальний стан */
export function update() {}

export function onClose(el) {
  el._cancel?.();
}
