/**
 * S12-storage - FR-9 (Used, Generated looks, Clear generated images, Remove orphaned files), скрін 14. Світла тема.
 * Розміри - [mock] (state.storage, початкові значення з copy.S12.mock). Clear generated images -> Alert (destructive) -> generatedMb = 0,
 * usedMb зменшується; рядок disabled при 0 (скрін 14: сірий). Remove orphaned files -> Alert -> тост з кількістю;
 * немає файлів -> одразу тост "No orphaned files found". Рядок Storage в S12 main оновлюється через store.
 */

import { copy } from '../copy.js';
import * as store from '../state.js';
import { listRow, listSection } from '../components.js';
import { openAlert } from '../ui.js';
import { haptic } from '../haptic.js';
import { shellHTML, mountSettings, startState, toast } from '../settings.js';

const t = copy.S12storage;

function bodyHTML(s) {
  const rows = [
    listRow({ title: t.rows.used, value: t.size(s.storage.usedMb), kind: 'static', name: 'used' }),
    listRow({ title: t.rows.generated, value: t.size(s.storage.generatedMb), kind: 'static', name: 'generated' }),
    listRow({ title: t.rows.clear, kind: 'action', action: 'clear', disabled: s.storage.generatedMb <= 0 }),
    listRow({ title: t.rows.orphaned, kind: 'action', action: 'orphaned' }),
  ];
  return listSection({ header: t.header, footer: t.footer, rows });
}

function sync(el, s) {
  const set = (name, text) => {
    const n = el.querySelector(`[data-bind="${name}-value"]`);
    if (n && n.textContent !== text) n.textContent = text;
  };
  set('used', t.size(s.storage.usedMb));
  set('generated', t.size(s.storage.generatedMb));
  const clear = el.querySelector('[data-action="clear"]');
  if (clear) clear.setAttribute('aria-disabled', String(s.storage.generatedMb <= 0));
}

function confirmClear() {
  const a = t.clearAlert;
  openAlert({
    title: a.title,
    message: a.message,
    actions: [
      { label: a.cancel, preferred: true },
      {
        label: a.confirm,
        role: 'destructive',
        onTap: () => {
          const { storage } = store.get();
          haptic('success');
          store.set({ storage: { generatedMb: 0, usedMb: Math.max(0, storage.usedMb - storage.generatedMb) } });
          toast(t.toast.cleared(storage.generatedMb));
        },
      },
    ],
  });
}

function confirmOrphaned() {
  const { storage } = store.get();
  if (storage.orphanedCount <= 0) { toast(t.toast.orphanedNone); return; }
  const a = t.orphanedAlert;
  openAlert({
    title: a.title,
    message: a.message,
    actions: [
      { label: a.cancel, preferred: true },
      {
        label: a.confirm,
        role: 'destructive',
        onTap: () => {
          const cur = store.get().storage;
          haptic('success');
          store.set({ storage: { orphanedCount: 0, orphanedMb: 0, usedMb: Math.max(0, cur.usedMb - cur.orphanedMb) } });
          toast(t.toast.orphanedRemoved(cur.orphanedCount, cur.orphanedMb));
        },
      },
    ],
  });
}

export function render(state, ctx) {
  const s = startState(ctx);
  return mountSettings(shellHTML({ title: t.title, body: bodyHTML(s) }), ctx, {
    sync,
    actions: { clear: confirmClear, orphaned: confirmOrphaned },
  });
}

export function update(el, state) {
  sync(el, state);
}
