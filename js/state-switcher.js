/**
 * state-switcher.js - вибір екрана і його стану біля рамки (десктоп). Службовий, не UI продукту.
 * Два нативні select: "Screen" (усі роути реєстру) і "State" (варіанти поточного екрана з
 * copy.debug.switcher.states). Вибір -> router.jump(id, params). Поза #app, на <= 430 прихований
 * (рендер і телефон не бачать). Показується завжди, не лише з ?debug=1.
 */
import { SCREENS, isBuilt } from './screens/registry.js';
import { copy } from './copy.js';
import * as router from './router.js';
import { h, esc } from './ui.js';

const t = copy.debug.switcher;

const sameParams = (a, b) => Object.entries(b).every(([k, v]) => a[k] === v);

export function mountStateSwitcher(stage) {
  const ids = Object.keys(SCREENS).filter((id) => !id.startsWith('_'));
  const root = h(`
    <aside class="switcher" data-theme="light" aria-label="${esc(t.screen)}">
      <label class="switcher__field t-mono-caption">${esc(t.screen)}
        <select class="switcher__select" data-switch="screen">
          ${ids.map((id) => `<option value="${esc(id)}">${esc(id)} · ${esc(copy.screens[id] || id)}${isBuilt(id) ? '' : ` (${esc(t.notBuilt)})`}</option>`).join('')}
        </select>
      </label>
      <label class="switcher__field t-mono-caption">${esc(t.state)}
        <select class="switcher__select" data-switch="state"></select>
      </label>
    </aside>`);
  const screenSel = root.querySelector('[data-switch="screen"]');
  const stateSel = root.querySelector('[data-switch="state"]');
  let variants = [];

  function fillStates(id, params) {
    variants = t.states[id] || [];
    if (!variants.length) {
      stateSel.innerHTML = `<option>${esc(t.single)}</option>`;
      stateSel.disabled = true;
      return;
    }
    stateSel.disabled = false;
    stateSel.innerHTML = variants.map(([label], i) => `<option value="${i}">${esc(label)}</option>`).join('');
    const cur = variants.findIndex(([, p]) => sameParams(params, p));
    stateSel.value = String(cur >= 0 ? cur : 0);
  }

  function sync(r) {
    if (!r || !SCREENS[r.id]) return;
    screenSel.value = r.id;
    fillStates(r.id, r.params);
  }

  screenSel.addEventListener('change', () => {
    const id = screenSel.value;
    const first = (t.states[id] || [])[0];
    router.jump(id, first ? first[1] : {});
  });
  stateSel.addEventListener('change', () => {
    const v = variants[Number(stateSel.value)];
    if (v) router.jump(screenSel.value, v[1]);
  });

  router.onRouteChange(sync);
  sync(router.currentRoute());
  stage.append(root);
}
