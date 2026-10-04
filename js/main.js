/**
 * main.js - старт прототипу: назва документа, роутер, debug-панель (?debug=1).
 */

import { copy } from './copy.js';
import * as router from './router.js';
import { mountDebug } from './debug.js';
import { mountStateSwitcher } from './state-switcher.js';

document.title = copy.app.documentTitle;

const app = document.getElementById('app');
const stage = document.querySelector('.stage');

await router.init(app);

if (router.parseHash().params.debug === '1') {
  document.body.classList.add('has-debug');
  mountDebug(stage, app);
}

mountStateSwitcher(stage);

window.__APP_READY__ = true;
