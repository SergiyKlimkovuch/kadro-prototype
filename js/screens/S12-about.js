/**
 * S12-about - FR-9 (About, Rate, Share, Support, Email feedback, Restore Purchases, Redeem Code, Privacy, Terms), скрін 15. Світла тема.
 * Три групи: Kadro (з іконками: About, Rate, Share, Support, Email), Purchases (Plan, Restore Purchases, Redeem Code),
 * Legal (Privacy, Terms; ті самі підписи, що на M01). Внизу - версія [mock].
 * Відхід від скріна 15: без Join the Community / Instagram / TikTok / Become a Creator (поза FR-9, open-questions #87).
 * Дії-імітації: About -> Alert з описом; Rate / Support / Email / Privacy / Terms / Redeem -> тост "opens in the full app"
 * (як на M01); Share -> navigator.share, якщо є, інакше тост; Restore -> тост залежно від isPlus (покупок у прототипі немає).
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { esc, openAlert } from '../ui.js';
import { listRow, listSection } from '../components.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, toast } from '../settings.js';

const t = copy.S12about;

function bodyHTML(s) {
  const r = t.rows;
  const app = [
    listRow({ title: r.about, glyph: 'information-circle', kind: 'action', action: 'about' }),
    listRow({ title: r.rate, glyph: 'star', kind: 'external', action: 'stub:rate' }),
    listRow({ title: r.share, glyph: 'arrow-up-on-square', kind: 'action', action: 'share' }),
    listRow({ title: r.support, glyph: 'question-mark-circle', kind: 'external', action: 'stub:support' }),
    listRow({ title: r.email, glyph: 'envelope', kind: 'external', action: 'stub:email' }),
  ];
  const purchases = [
    listRow({ title: t.plan.title, value: s.isPlus ? t.plan.plus : t.plan.free, kind: 'static', name: 'plan' }),
    listRow({ title: r.restore, kind: 'action', action: 'restore' }),
    listRow({ title: r.redeem, kind: 'action', action: 'redeem' }),
  ];
  const legal = [
    listRow({ title: r.privacy, kind: 'external', action: 'stub:privacy' }),
    listRow({ title: r.terms, kind: 'external', action: 'stub:terms' }),
  ];
  return `
    ${listSection({ header: t.headers.app, glyphs: true, rows: app })}
    ${listSection({ header: t.headers.purchases, rows: purchases })}
    ${listSection({ header: t.headers.legal, rows: legal })}
    <p class="stg__version t-mono-caption">${esc(t.version(t.mock.version, t.mock.build))}</p>`;
}

function sync(el, s) {
  const n = el.querySelector('[data-bind="plan-value"]');
  const text = s.isPlus ? t.plan.plus : t.plan.free;
  if (n && n.textContent !== text) n.textContent = text;
}

const stubKeys = { rate: 'rate', support: 'support', email: 'email', privacy: 'privacy', terms: 'terms' };

export function render(state, ctx) {
  const s = startState(ctx);
  const actions = {
    about: () => {
      haptic('light');
      openAlert({
        title: t.rows.about,
        message: t.aboutText,
        actions: [{ label: copy.common.close, preferred: true }],
      });
    },
    share: async () => {
      haptic('light');
      try {
        if (navigator.share) { await navigator.share({ text: t.shareMessage }); return; }
      } catch {
        return; // користувач закрив лист
      }
      toast(t.toast.stub(t.rows.share));
    },
    restore: () => {
      haptic('light');
      toast(store.get().isPlus ? t.toast.restored : t.toast.nothingToRestore);
    },
    redeem: () => { haptic('light'); toast(copy.M01.toast.redeemStub); },
  };
  Object.keys(stubKeys).forEach((k) => {
    actions[`stub:${k}`] = () => { haptic('light'); toast(t.toast.stub(t.rows[stubKeys[k]])); };
  });
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, { sync, actions });
}

export function update(el, state) {
  sync(el, state);
}
