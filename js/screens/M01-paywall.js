/**
 * M01 Paywall (DEV-DOC "M01 Paywall", PRD "Вимоги до пейволу", FR монетизація, скріни 16-20). Тема dark.
 * Layout: хедер (вордмарк по центру, × справа - видимий одразу) -> карусель 5 карток (свайп, автопрокрутка 4 с)
 *   -> індикатор (крапки + "02 / 05") -> [+] два плани Annual / Weekly (radiogroup) -> CTA -> умови (3.1.2)
 *   -> Restore · Redeem · Terms · Privacy.
 * Параметри роуту: source=settings|look|export|booth (стартовий слайд), slide=0..4 (debug, перебиває source),
 *   plan=annual|weekly (debug). Вибраний план і слайд - локальний стан екрана (UI-стан, не доменні дані).
 * CTA -> A03 (push, plan у параметрі). Успішна покупка (A03) ставить isPlus і закриває A03 + M01.
 * Фото: Unsplash недоступний для автоматичного пошуку -> заглушки data-photo-placeholder (assets/CREDITS.md).
 */
import { copy, APP_NAME } from '../copy.js';
import { plans } from '../data.js';
import * as store from '../state.js';
import { h, esc, showToast, radioKeys } from '../ui.js';
import { icon } from '../icons.js';
import { button, iconButton, badge, wordmark, pageIndicator } from '../components.js';
import { swipePager } from '../pager.js';
import { haptic } from '../haptic.js';
import { reducedMotion } from '../router.js';
import { applyRouteParams } from '../route-params.js';

const t = copy.M01;
const N = t.slides.length;
const planOf = (id) => plans.find((p) => p.id === id);

/* source -> id слайда (DEV-DOC: "source визначає стартовий слайд"; PRD: тап на Look -> Style).
   export -> Pick: рішення білду, open-questions #89. settings / saving / upgrade / невідомий -> перший. */
const START_SLIDE = { look: 'style', booth: 'booth', export: 'pick' };

function startIndex(params) {
  const explicit = parseInt(params.slide, 10);
  if (!Number.isNaN(explicit)) return Math.min(N - 1, Math.max(0, explicit));
  const id = START_SLIDE[params.source];
  const i = t.slides.findIndex((s) => s.id === id);
  return i === -1 ? 0 : i;
}

function slideHTML(s, i) {
  return `
    <div class="m01__slide" role="group" aria-roledescription="slide" aria-label="${esc(t.a11y.slide(i + 1, N, s.tag))}">
      <div class="m01__card-area">
        <!-- photo placeholder: фото Unsplash для слайда "${esc(s.tag)}" - див. assets/CREDITS.md -->
        <div class="m01-card m01-card--${esc(s.id)}" data-photo-placeholder="M01 slide ${esc(s.id)} card">
          <span class="m01-card__num t-mono-caption" aria-hidden="true">${esc(t.slideNumber(i + 1))}</span>
          <div class="m01-card__text">
            <p class="m01-card__tag t-mono-caption">${esc(s.tag)}</p>
            <p class="m01-card__line t-body">${esc(s.line)}</p>
          </div>
        </div>
      </div>
    </div>`;
}

/** PlanCard (ShipSwift SWPaywallView.demoPlanRow + ComponentsKit RadioGroup): radio, назва [+ бейдж], підрядок, ціна праворуч */
function planHTML(p, selected) {
  const annual = p.id === 'annual';
  const c = t.plan[p.id];
  const detail = annual ? c.price(p) : '';
  const right = annual ? c.perWeek(p) : c.price(p);
  return `
    <button class="plan pressable" type="button" role="radio" aria-checked="${selected}" data-plan="${esc(p.id)}"
      aria-label="${esc(t.a11y.plan(c.name, annual ? `${c.price(p)}, ${c.perWeek(p)}` : c.price(p), false))}">
      <span class="plan__radio" aria-hidden="true"></span>
      <span class="plan__body">
        <span class="plan__name-row">
          <span class="plan__name t-headline">${esc(c.name)}</span>
          ${annual && p.trialDays ? badge({ label: c.badge(p.trialDays), variant: 'accent', className: 'plan__badge' }) : ''}
        </span>
        ${detail ? `<span class="plan__detail t-footnote">${esc(detail)}</span>` : ''}
      </span>
      <span class="plan__price t-headline tabular">${esc(right)}</span>
    </button>`;
}

export function render(state, ctx) {
  applyRouteParams(ctx.params, { overCamera: true }); // plus=0|1 (debug); пейвол лежить поверх S04 - coach mark уже пройдений
  const ui = {
    plan: planOf(ctx.params.plan) ? ctx.params.plan : (plans.find((p) => p.defaultSelected) || plans[0]).id,
    // без автопрокрутки: slide= (debug / рендер), reduced motion, і вхід із цільовим слайдом (look / booth / export) -
    // інакше через 4 с контекст (Style після тапа на платний Look) зникає. Автопрокрутка - open-questions #90
    stopped: Boolean(ctx.params.slide) || reducedMotion() || Boolean(START_SLIDE[ctx.params.source]),
  };
  const start = startIndex(ctx.params);

  const el = h(`
    <div class="m01" data-theme="dark">
      <header class="m01__header">
        ${wordmark({ name: APP_NAME, size: 'md' })}
        ${iconButton({ name: 'x-mark', label: t.a11y.close, variant: 'plain', action: 'close', className: 'm01__close' })}
      </header>
      <div class="m01__viewport" role="region" aria-roledescription="carousel" aria-label="${esc(t.a11y.carousel)}" data-scroll>
        <div class="m01__track">${t.slides.map(slideHTML).join('')}</div>
      </div>
      <div class="m01__pager">
        ${pageIndicator({ count: N, index: start, label: t.pageIndicator(start + 1, N) })}
        <span class="m01__counter t-mono-caption" data-bind="counter">${esc(t.pageIndicator(start + 1, N))}</span>
      </div>
      <div class="m01__plans" role="radiogroup" aria-label="${esc(t.plansGroup)}">
        ${plans.map((p) => planHTML(p, p.id === ui.plan)).join('')}
      </div>
      <div class="m01__cta">${button({ label: '', variant: 'accent', block: true, action: 'cta' })}</div>
      <p class="m01__terms t-footnote t-secondary" data-bind="terms"></p>
      <nav class="m01__links" aria-label="${esc(APP_NAME)}">
        ${button({ label: t.restore, variant: 'text', size: 'sm', action: 'restore' })}
        ${button({ label: t.redeem, variant: 'text', size: 'sm', action: 'redeem' })}
        ${button({ label: t.termsLink, variant: 'text', size: 'sm', action: 'terms' })}
        ${button({ label: t.privacyLink, variant: 'text', size: 'sm', action: 'privacy' })}
      </nav>
    </div>`);

  const q = (s) => el.querySelector(s);
  const slides = [...el.querySelectorAll('.m01__slide')];
  const dots = [...q('.page-indicator').children];
  const indicator = q('.page-indicator');

  function syncSlide(i) {
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    const label = t.pageIndicator(i + 1, N);
    indicator.setAttribute('aria-label', label);
    q('[data-bind="counter"]').textContent = label;
    slides.forEach((sl, k) => { // неактивні слайди недоступні для AT і фокусу
      sl.toggleAttribute('inert', k !== i);
      if (k === i) sl.removeAttribute('aria-hidden'); else sl.setAttribute('aria-hidden', 'true');
    });
  }

  function syncPlan() {
    const p = planOf(ui.plan);
    el.querySelectorAll('[data-plan]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.plan === ui.plan)));
    q('[data-action="cta"] span').textContent = ui.plan === 'annual' ? t.cta.annual(p.trialDays) : t.cta.weekly;
    q('[data-bind="terms"]').textContent = `${t.terms[ui.plan](p)} ${t.terms.manage}`;
  }

  const pager = swipePager({
    viewport: q('.m01__viewport'),
    track: q('.m01__track'),
    count: N,
    initial: start,
    onChange: (i) => syncSlide(i),
    onUser: () => { ui.stopped = true; },
  });
  syncSlide(start);
  syncPlan();
  radioKeys(q('.m01__plans'));

  /* Автопрокрутка кожні --carousel-step (DEV-DOC 4 с); перший жест / вибір плану назавжди зупиняє.
     Лист A03 поверх (шар inert) - пауза. Після останнього - перший. */
  const step = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--carousel-step')) || 4000;
  const timer = setInterval(() => {
    if (!el.isConnected) { clearInterval(timer); return; }
    if (ui.stopped || el.closest('[inert]')) return;
    pager.go((pager.index + 1) % N);
  }, step);
  el._timer = timer;

  const toast = (message) => showToast({ kind: 'info', message });

  el.addEventListener('click', (e) => {
    const planBtn = e.target.closest('[data-plan]');
    if (planBtn) {
      if (ui.plan !== planBtn.dataset.plan) {
        ui.plan = planBtn.dataset.plan;
        haptic('light');
        syncPlan();
      }
      return;
    }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    switch (a.dataset.action) {
      case 'close': haptic('light'); ctx.router.back(); break;
      case 'cta': haptic('medium'); ctx.router.push('A03', { plan: ui.plan }); break;
      case 'restore': haptic('light'); toast(store.get().isPlus ? t.toast.restored : t.toast.nothingToRestore); break;
      case 'redeem': haptic('light'); toast(t.toast.redeemStub); break;
      case 'terms': haptic('light'); toast(t.toast.linkStub(t.termsLink)); break;
      case 'privacy': haptic('light'); toast(t.toast.linkStub(t.privacyLink)); break;
      default: break;
    }
  });

  return el;
}

/** Store не перемальовує пейвол: слайд і план - локальний стан */
export function update() {}

export function onClose(el) {
  clearInterval(el._timer);
}
