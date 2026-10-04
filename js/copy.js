/**
 * copy.js - усі тексти UI (EN, US). CLAUDE.md 1.10: інлайн-текстів в екранах немає.
 * Фаза 1 (каркас): назва, спільні дії, назви інвентарю для debug, тексти debug-панелі
 * і демо-сторінки компонентів. Екранна копі S01-S12 додається content-writer-ом
 * у відповідні неймспейси перед білдом екрана.
 * Рядки з позначкою [draft] - чернетки з DEV-DOC/PRD, фінал за content-writer.
 */

export const APP_NAME = 'Kadro';                 // brand.md
export const PLAN_NAME = `${APP_NAME} Plus`;     // brand.md: тариф
export const PLUS_BADGE = 'PLUS';                // brand.md: бейдж у UI

/** Однина/множина: plural(1, 'photo') -> "1 photo", plural(3, 'photo') -> "3 photos" */
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Підсумок сесії - один формат для SessionChip (S04, FR-2.7) і рядка Capture defaults (S12):
 * той самий намір - те саме формулювання. Формат PerPic "15s · 30 photos · 3s interval"
 * не копіюємо (CLAUDE.md 1.5). Delay 0 -> "No delay"; при 1 фото інтервал не має сенсу -> не показуємо.
 * Найдовший варіант: "15s delay · 30 photos · 3s apart" (33 знаки).
 */
const sessionSummary = (s) => [
  s.delay === 0 ? 'No delay' : `${s.delay}s delay`,
  plural(s.count, 'photo'),
  ...(s.count > 1 ? [`${s.interval}s apart`] : []),
].join(' · ');

/** Озвучення співвідношення для VoiceOver: "9:16" -> "9 by 16" */
const ratioSpoken = (r) => r.replace(':', ' by ');

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad2 = (n) => String(n).padStart(2, '0');

/** Час доби 24h: timeOfDay(ts) -> "18:44" (S08 заголовок, S09 мета) */
const timeOfDay = (ts) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** Заголовок сесії: sessionTitle(ts) -> "Fri 18:44" (FR-6.1). Власний формат: день тижня + час, без місяця */
const sessionTitle = (ts) => `${WEEKDAYS[new Date(ts).getDay()]} ${timeOfDay(ts)}`;

/** Коли оновиться ліміт: 0 -> "today", 1 -> "tomorrow", n -> "in n days" */
const resetsIn = (days) => (days <= 0 ? 'resets today' : days === 1 ? 'resets tomorrow' : `resets in ${days} days`);

/**
 * Рядок ліміту S08 (FR-6.3, open-questions #2: ліміт - state.exports.limit, число в копі не хардкодимо).
 * Одиниця в UI - "export" (як на кнопках Export): один намір - одне слово (open-questions #53).
 * exportsLeft(3, 4) -> "3 exports left this week · resets in 4 days"; 1 -> "1 export left"; 0 -> "No exports left ..."
 */
const exportsLeft = (n, days) =>
  `${n <= 0 ? 'No exports' : plural(n, 'export')} left this week · ${resetsIn(days)}`;

export const copy = {
  app: {
    tagline: 'Your hands-free photographer',     // brand.md
    documentTitle: `${APP_NAME} - prototype`,
  },

  common: {
    done: 'Done',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    continue: 'Continue',
    notNow: 'Not now',
    settings: 'Settings',
    allow: 'Allow',
    dontAllow: "Don't Allow",
    delete: 'Delete',
  },

  /** aria-label для icon-only кнопок (twostraws--swiftui-pro: кожна іконка-кнопка має підпис) */
  a11y: {
    settings: 'Settings',
    back: 'Back',
    close: 'Close',
    more: 'More',
    flash: 'Flash',
    flipCamera: 'Flip camera',
    favorite: 'Favorite',
    resetSession: 'Clear session',
    expandSession: 'Edit session',
    save: 'Save to Photos',
    delete: 'Delete',
  },

  /**
   * S01 Onboarding (FR-1.1). Теги - структура PRD (CSS робить uppercase).
   * Кнопка "Continue" - common.continue (one label per intent), на всіх 4 слайдах.
   */
  S01: {
    footnote: 'No sign-up needed. Your shots live on your iPhone.', // один варіант підпису на всіх слайдах
    slides: [ // без підзаголовків: тег -> заголовок -> індикатор (DEV-DOC layout)
      { id: 'capture', tag: 'Capture', title: 'Set it down. Strike a pose.' },
      { id: 'inspo', tag: 'Inspo', title: 'Know the pose before the shot.' },
      { id: 'style', tag: 'Style', title: 'A film look to match your mood.' },
      { id: 'picks', tag: 'Picks', title: 'Shoot a lot. Keep your favorites.' },
    ],
    pageIndicator: (i, n) => `Page ${i} of ${n}`,       // a11y індикатора сторінок
    countdown: ['3', '2', '1'],                          // анімація відліку на CAPTURE
  },

  /** S02 Camera pre-permission (FR-1.2). Кнопки: primary "Allow camera", text = common.notNow */
  S02: {
    title: 'Camera access',
    subtitle: `${APP_NAME} needs your camera to take the photos.`,
    points: [
      { id: 'timer', title: 'Shoot on a timer', text: 'Set it down, step back, and let it take the shots.' },
      { id: 'device', title: 'Stays on your iPhone', text: 'Your shots are stored on this device. Sharing is your call.' },
      { id: 'noAccount', title: 'No account needed', text: 'Start shooting right away.' },
    ],
    allow: 'Allow camera',
    footnote: 'You can change this anytime in Settings.',
  },

  /** A01 Системний алерт доступу до камери (FR-1.2, ref 05). Стиль iOS; Allow-кнопка системна - "OK". */
  A01: {
    title: `“${APP_NAME}” Would Like to Access the Camera`,
    message: `${APP_NAME} needs the camera to shoot your timed sessions. Your shots are stored on your device.`, // = NSCameraUsageDescription
    dontAllow: "Don't Allow",   // = common.dontAllow
    ok: 'OK',
  },

  /** S04 Camera (FR-1.3, 1.4, 2.x). Лічильники/режими - mono-теги, регістр задає CSS. */
  S04: {
    header: { inspo: 'Inspo' },                         // "Inspo" - текстова кнопка праворуч (шестерня - copy.a11y.settings)
    aspectLabel: (r) => r,                              // "3:4" як є
    focalUnit: 'mm',
    focalLabel: (mm) => `${mm} mm`,                     // бейдж на видошукачі
    focalHint: 'Tap to change focal length. Lower is wider, higher is closer.', // FR-2.3, один раз при першому тапі
    flash: { off: 'Off', on: 'On', auto: 'Auto' },
    mode: { session: 'Photo Session', booth: 'Photo Booth' },
    sessionChip: sessionSummary,                        // FR-2.7: "10s delay · 20 photos · 2s apart"; × і розгортання - copy.a11y.resetSession / expandSession
    menu: {                                             // меню "…" у видошукачі
      grid: 'Grid',
      level: 'Level',
      timerSound: 'Timer sound',
    },
    off: {                                              // FR-1.3
      title: 'Camera is off',
      message: 'Turn on camera access in Settings to start shooting.',
      action: 'Settings',
    },
    coach: {                                            // FR-1.4
      step: (n, total) => `Step ${n} of ${total}`,
      title: 'Shoot a series on a timer',
      message: 'Set a timer, put your phone down, and the shots take themselves.',
      skip: 'Skip for now',
    },
    a11y: {
      flash: { off: 'Flash off', on: 'Flash on', auto: 'Flash auto' },
      flipCamera: 'Flip camera',
      aspect: (r) => `Aspect ratio ${r}`,
      focal: (mm) => `Focal length ${mm} millimeters`,
      more: 'Viewfinder options',                       // кнопка "…"
      thumbnail: 'Last session',
      thumbnailEmpty: 'No sessions yet',
      startSession: 'Start session',
      look: 'Look',
      focalGroup: 'Focal length',                      // aria-label radiogroup фокальних кнопок
    },
  },

  /**
   * H01 Aspect ratio (FR-2.5, ref 23). Лист fit (висота за вмістом); Done - copy.common.done.
   * Підписи PerPic ("Crops the photo you save", "...both use this ratio") не повторюємо.
   * Підзаголовки листів - без крапки (H01, H04 однаково).
   */
  H01: {
    title: 'Aspect ratio',
    subtitle: 'Sets the frame for the viewfinder and your photos',
    chip: (r) => r,                                     // видимий текст чіпа "9:16"
    a11y: {
      group: 'Aspect ratio',                            // aria-label radiogroup; вибір - aria-checked
      chip: (r) => {                                    // "9 by 16, tall"
        const hint = { '3:4': 'standard', '9:16': 'tall', '1:1': 'square', '4:3': 'landscape', '16:9': 'wide' }[r];
        return hint ? `${ratioSpoken(r)}, ${hint}` : ratioSpoken(r);
      },
    },
  },

  /**
   * H02 Session (FR-3.1, 3.3, ref 24-25). Done - copy.common.done.
   * Лейбли Delay / Photos / Interval - з PRD. Одиниця Photos - "photos" (у PerPic "shots").
   * Число і одиниця - окремі вузли: valueNumber велике, unit дрібне.
   */
  H02: {
    title: 'Session',
    valuesHeader: 'Session values',
    labels: { delay: 'Delay', count: 'Photos', interval: 'Interval' },
    units: {
      delay: 's',
      count: (n) => (n === 1 ? 'photo' : 'photos'),     // "1 photo" / "20 photos"
      interval: 's',
    },
    presetsHeader: 'Presets',
    presetName: (id) => copy.presets[id],               // назви - copy.presets (PRD FR-3.3)
    presetValues: (p) => `${p.delay}s · ${p.count} · ${p.interval}s`, // "10s · 20 · 2s" (PRD FR-3.3)
    a11y: {
      edit: 'Edit session values',                      // олівець -> H03
      value: {                                          // озвучення колонок: "Delay, 10 seconds"
        delay: (n) => (n === 0 ? 'Delay, none' : `Delay, ${plural(n, 'second')}`),
        count: (n) => `Photos, ${n}`,
        interval: (n) => `Interval, ${plural(n, 'second')}`,
      },
      presetsGroup: 'Presets',                          // aria-label radiogroup каруселі
      // Стан "вибраний" - через role="radio" + aria-checked, у label не дублюємо; галочка aria-hidden
      preset: (name, p) =>
        `${name}. ${p.delay === 0 ? 'No delay' : `${plural(p.delay, 'second')} delay`}, ${plural(p.count, 'photo')}, ${plural(p.interval, 'second')} apart`,
    },
  },

  /**
   * H03 Edit session values (FR-3.2). Заголовок = блок H02, бо це той самий набір значень.
   * Кнопка: copy.common.done (Cancel у H03 немає, open-questions #44). "Save as preset" - заглушка Next.
   */
  H03: {
    title: 'Session values',
    labels: { delay: 'Delay', count: 'Photos', interval: 'Interval' }, // = H02.labels
    units: { delay: 's', count: (n) => (n === 1 ? 'photo' : 'photos'), interval: 's' }, // = H02.units
    pickerValue: (n) => `${n}`,                         // рядок барабана - лише число, одиниця в заголовку колонки
    saveAsPreset: 'Save as preset',
    soonBadge: 'Soon',                                  // бейдж біля "Save as preset" (mono, регістр - CSS)
    soonToast: 'Custom presets are coming soon',        // тост на тап по заглушці
    a11y: {
      picker: {                                         // aria-valuetext барабанів
        delay: (n) => (n === 0 ? 'No delay' : plural(n, 'second')),
        count: (n) => plural(n, 'photo'),
        interval: (n) => plural(n, 'second'),
      },
      saveAsPreset: 'Save as preset, coming soon',
    },
  },

  /**
   * H04 Look (FR-7.1, 7.2, ref 26). Лист medium-tall; Done - copy.common.done
   * (на locked-стилі у free Done веде в M01, слайд Style - текст кнопки той самий).
   * Назви - copy.looks (вигадані, без плівок і камер). Описи відповідають CSS-фільтрам data.js:
   * у фільтрах немає зерна і віньєтки - в описах їх теж немає.
   */
  H04: {
    title: 'Look',
    subtitle: 'Sets the mood of every photo in this session',
    lookName: (id) => copy.looks[id],
    descriptions: {
      standard: 'True-to-life color, nothing added.',
      warm: 'Golden, sun-warmed color with a soft glow.',
      cool: 'Crisp, cool tones with a clean digital snap.',
      mono: 'Rich black and white with deep contrast.',
    },
    badge: PLUS_BADGE,                                  // бейдж на locked-картці
    lockedHint: `Included with ${PLAN_NAME}`,           // опційний рядок під описом locked-стилю у free
    a11y: {
      carousel: 'Looks',                                // aria-label radiogroup; вибір - aria-checked
      look: (name) => name,
      locked: (name) => `${name}, requires ${PLAN_NAME}`,
    },
  },

  /**
   * S05 Session capture (FR-4.1-4.5, ref 34-35). Mono-теги - звичайний регістр, uppercase робить CSS.
   * "Next photo" з PRD = дослівно PerPic -> власний тег: перед першим кадром (delay) "First shot in",
   * далі "Next shot in"; цифра відліку під тегом читається як продовження фрази.
   * Лічильник показує номер наступного кадру: counter(shotIndex + 1, count) -> "4 / 30".
   */
  S05: {
    tagFirst: 'First shot in',
    tagNext: 'Next shot in',
    counter: (i, n) => `${i} / ${n}`,
    takenCount: (n) => `${n}`,                          // число біля мініатюри; 0 - не показуємо
    paused: {                                           // FR-4.5: застосунок згорнуто -> phase 'paused'
      tag: 'Paused',
      message: 'Your photos so far are safe. The timer picks up where it left off.',
    },
    a11y: {
      stop: 'Stop session',
      counter: (i, n) => `Photo ${i} of ${n}`,
      thumbnail: (n) => (n === 0 ? 'No photos yet' : `Last photo, ${plural(n, 'photo')} taken`),
      // aria-live="polite": озвучуємо не кожну секунду, а старт відліку, 3-2-1 і момент кадру
      countdown: (s) => plural(s, 'second'),
      countdownStart: (s, first) => `${first ? 'First' : 'Next'} shot in ${plural(s, 'second')}`,
      shotTaken: (i, n) => `Photo ${i} of ${n} taken`,
      paused: 'Session paused',
      resumed: 'Session resumed',
      finished: 'Session complete',
    },
  },

  /**
   * S06 Review (FR-5.1, 5.2, ref 36-37). Mono-теги - звичайний регістр, uppercase робить CSS.
   * Власні формулювання замість PerPic: підказка свайпів, "Perfect pick" -> "Top pick".
   * Skip / Done - короткі дієслова, без іконок у тексті (✓ / × - іконки Heroicons у розмітці).
   */
  S06: {
    left: (n) => `${n} left`,                           // тег у навбарі: скільки карток лишилось
    hint: 'Right keeps it, left drops it',              // підказка під стопкою
    keep: 'Keep',                                       // напис на картці при свайпі вправо = підпис кнопки (a11y-альтернатива)
    drop: 'Drop',                                       // напис на картці при свайпі вліво = підпис кнопки
    skip: 'Skip',
    done: 'Done',                                       // = common.done
    undo: 'Undo',                                       // підпис кнопки, якщо є текст; на макеті - іконка
    pickBadge: 'Top pick',                              // FR-5.2, = copy.S08.pickBadge
    empty: {                                            // зайшли без кадрів (debug)
      title: 'Nothing to review',
      message: 'Shoot a session and your photos will land here.',
      action: 'Back to camera',
    },
    a11y: {
      skip: 'Skip review',
      done: 'Finish review. Photos you have not reviewed are kept.',
      undo: 'Undo last choice',
      keep: 'Keep photo',
      drop: 'Drop photo',
      card: (i, n, isPick) => `Photo ${i} of ${n}${isPick ? ', top pick' : ''}`,
      left: (n) => `${plural(n, 'photo')} left to review`,
      kept: (i) => `Kept photo ${i}`,                   // aria-live після жесту/кнопки
      dropped: (i) => `Dropped photo ${i}`,
      undone: 'Last choice undone',
      gestureHint: 'Swipe right to keep, left to drop, or use the Keep and Drop buttons',
    },
  },

  /**
   * S07 Your keepers (FR-5.3, ref 38). Заголовок, підпис і кнопки PerPic ("Your keepers",
   * "2 KEPT · 1 DROPPED", "View photos", "Save photos") не повторюємо.
   * "Selects" - фотографський термін для відібраних кадрів. Підпис: "2 of 3 kept" (без однин).
   */
  S07: {
    title: 'Your selects',
    summary: (kept, total) => `${kept} of ${total} kept`,
    open: 'Open gallery',                               // -> S08
    save: 'Export selects',                             // експорт keepers (один намір, S07)
    a11y: {
      stack: (kept) => `${plural(kept, 'photo')} kept`,        // стопка мініатюр з бейджем
      summary: (kept, dropped) => `${plural(kept, 'photo')} kept, ${plural(dropped, 'photo')} dropped`,
      undo: 'Undo and return to review',
    },
  },

  /**
   * S08 Session gallery (FR-6.1, 6.3, ref 42). Один намір - одне слово: Export.
   * "Export selects" (S07, лише відібрані), "Export session" (S08, усі кадри), "Export" (S09, один кадр).
   * Рядок ліміту і посилання - власні (PerPic: "N exports remaining... Resets in X days", "Get unlimited exports").
   */
  S08: {
    title: sessionTitle,                                // title(startedAt) -> "Fri 18:44"
    saveAll: 'Export session',                          // навбар; усі кадри сесії
    menu: { delete: 'Delete session' },
    sections: { picks: 'Picks', all: 'All photos', favorites: 'Favorites' },
    count: (n) => `${n}`,                               // лічильник біля лейбла
    pickBadge: 'Top pick',                              // = copy.S06.pickBadge
    limit: exportsLeft,                                 // (n, days); лише free, для Plus рядка немає
    upgrade: 'Export without limits',                   // посилання -> M01 (source: export)
    empty: {
      picks: { title: 'No picks here', message: 'Picks appear when a session has enough shots to choose from.' },
      favorites: { title: 'No favorites yet', message: 'Open a photo and tap the heart to collect it here.' },
      session: { title: 'No photos in this session', message: 'Take a new session to fill this gallery.' },
    },
    toast: {
      saved: (n) => `${plural(n, 'photo')} added to Photos`,
    },
    deleteAlert: {
      title: 'Delete this session?',
      message: (n) => `${plural(n, 'photo')} will be removed from ${APP_NAME}. Copies already in Photos stay there.`,
      confirm: 'Delete session',
      cancel: 'Cancel',                                 // = common.cancel
    },
    a11y: {
      back: 'Back',
      more: 'Session options',
      saveAll: (n) => `Export all ${plural(n, 'photo')} to Photos`,
      photo: (i, n, o = {}) => `Photo ${i} of ${n}${o.pick ? ', top pick' : ''}${o.fav ? ', favorite' : ''}`,
      favoriteMark: 'Favorite',                         // сердечко на мініатюрі
      limit: (n, days) => exportsLeft(n, days),
    },
  },

  /**
   * S09 Photo viewer (FR-6.2, ref 39). Підписи під glass-кнопками: Favorite · Save · Delete.
   * Мета справа зверху: "Honey · 18:46" (Look + час кадру).
   */
  S09: {
    meta: (lookName, ts) => `${lookName} · ${timeOfDay(ts)}`,
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    save: 'Export',                                     // один кадр; той самий термін, що S07/S08 і ліміт
    delete: 'Delete',                                   // = common.delete
    deleteAlert: {
      title: 'Delete this photo?',
      message: `It will be removed from this session. A copy already in Photos stays there.`,
      confirm: 'Delete',
      cancel: 'Cancel',
    },
    a11y: {
      close: 'Close photo',
      position: (i, n) => `Photo ${i} of ${n}`,         // aria-live при свайпі між фото
      swipeHint: 'Swipe left or right for other photos. Swipe down to close.',
      favorite: 'Add to favorites',
      unfavorite: 'Remove from favorites',
      save: 'Export photo to Photos',
      delete: 'Delete photo',
    },
  },

  /**
   * A02 Системний алерт Photos, add-only (FR-6.4, ref 40). Add-only запит iOS: "Don't Allow" / "OK"
   * (як у A01). Текст message = NSPhotoLibraryAddUsageDescription; стиль системний.
   */
  A02: {
    title: `“${APP_NAME}” Would Like to Add to Your Photos`,
    message: `${APP_NAME} adds the photos you choose to your library. It can only add, and never reads what is already there.`,
    dontAllow: "Don't Allow",                           // = common.dontAllow
    ok: 'OK',
  },

  /**
   * T01 Error toast (FR-6.4 [+], ref 41): причина + вихід, не "Couldn't save".
   * Кнопка = common.settings (один підпис на дію: так само на S04.off, #54).
   * Ліміт не списується - це окремий рядок-примітка (за потреби - другий рядок тоста).
   */
  T01: {
    message: 'Photos access is off. Turn it on in Settings to export.',
    action: 'Settings',                                 // = common.settings
    note: 'Nothing was exported and your weekly limit is unchanged.',
    a11y: { action: 'Settings' },
  },

  /** Назви з "Інвентар екранів" DEV-DOC - лише для debug і плейсхолдерів */
  screens: {
    S01: 'Onboarding',
    S02: 'Camera pre-permission',
    A01: 'Camera access alert',
    S04: 'Camera (main)',
    H01: 'Aspect ratio',
    H02: 'Session',
    H03: 'Edit session values',
    H04: 'Look',
    S05: 'Session capture',
    S06: 'Review',
    S07: 'Your keepers',
    S08: 'Session gallery',
    S09: 'Photo viewer',
    A02: 'Photos access alert',
    T01: 'Export error toast',
    S10: 'Inspo',
    S11: 'Reference',
    M01: 'Paywall',
    A03: 'Purchase sheet (StoreKit)',
    S12: 'Settings',
    'S12-capture-defaults': 'Settings · Capture defaults',
    'S12-viewfinder': 'Settings · Viewfinder',
    'S12-feedback': 'Settings · Feedback',
    'S12-saving': 'Settings · Saving',
    'S12-storage': 'Settings · Storage',
    'S12-permissions': 'Settings · Permissions',
    'S12-about': 'Settings · About',
    _components: 'Component gallery',
  },

  /** Стани S04 з DEV-DOC (для debug Jump) */
  s04States: {
    live: 'live',
    off: 'off (Camera is off)',
    coach: 'coach (Step 1 of 3)',
    'pose-guide': 'pose guide',
  },

  debug: {
    title: 'Debug',
    statusPlan: 'Plan',
    planFree: 'Free',
    planPlus: 'Plus',
    statusCamera: 'Camera',
    statusPhotos: 'Photos',
    statusExports: 'Exports left',
    statusHaptic: 'Last haptic',
    none: '-',
    actions: 'Actions',
    reset: 'Reset state',
    togglePlus: 'Toggle Plus',
    denyCamera: 'Deny camera',
    denyPhotos: 'Deny photos',
    exportsZero: 'Exports = 0',
    jump: 'Jump to screen',
    notBuilt: 'not built',
    phase: (n) => `Phase ${n}`,
    hintNarrow: 'Triple-tap the status bar area to show or hide this panel.',
    // Перемикач стану екрана поруч із рамкою (state-switcher.js). Рядок: [підпис, параметри роуту].
    // Кожен варіант явно ставить plus/used, щоб стан не залежав від попереднього вибору.
    switcher: {
      screen: 'Screen',
      state: 'State',
      notBuilt: 'not built',
      single: 'Default',
      states: {
        S01: [['Slide 1', { slide: '0' }], ['Slide 2', { slide: '1' }], ['Slide 3', { slide: '2' }], ['Slide 4', { slide: '3' }]],
        S04: [['Live', { state: 'live' }], ['Camera off', { state: 'off' }], ['Coach mark', { state: 'coach' }], ['Pose guide', { state: 'pose-guide' }], ['Session chip (Outfit)', { session: 'outfit' }]],
        H01: [['3:4', { aspect: '3:4' }], ['9:16', { aspect: '9:16' }], ['1:1', { aspect: '1:1' }], ['4:3', { aspect: '4:3' }], ['16:9', { aspect: '16:9' }]],
        H02: [['Defaults', {}], ['Outfit preset', { preset: 'outfit' }]],
        H03: [['Defaults', {}], ['Outfit preset', { preset: 'outfit' }]],
        H04: [['Free', { plus: '0' }], ['Plus', { plus: '1' }], ['Honey selected (free, locked)', { plus: '0', look: 'honey' }]],
        S05: [['Countdown', { delay: '10' }], ['Mid-session', { frame: '5', shot: '2', count: '8', interval: '2' }], ['Paused', { state: 'paused' }]],
        S06: [['Stack, 8 left', { seed: '8', picks: '1,5' }], ['Dragging: Keep', { seed: '8', picks: '1,5', drag: '0.5', dir: 'keep' }], ['Dragging: Drop', { seed: '8', picks: '1,5', drag: '0.5', dir: 'drop' }]],
        S07: [['Free, 2 left', { seed: '8', kept: 'mix', plus: '0', used: '3' }], ['Free, limit reached', { seed: '8', kept: 'mix', plus: '0', used: '5' }], ['Plus', { seed: '8', kept: 'mix', plus: '1' }]],
        S08: [['Free, 2 left', { seed: '8', kept: 'mix', plus: '0', used: '3' }], ['Free, limit reached', { seed: '8', kept: 'mix', plus: '0', used: '5' }], ['Plus', { seed: '8', kept: 'mix', plus: '1' }], ['With favorites', { seed: '8', kept: 'mix', plus: '0', used: '3', favs: '1,2' }]],
        S09: [['Free', { seed: '8', index: '2', plus: '0', used: '3' }], ['Favorite', { seed: '8', index: '2', favs: '2', plus: '0', used: '3' }], ['Plus', { seed: '8', index: '2', plus: '1' }]],
        A02: [['Photos not determined', { seed: '8', photos: 'notDetermined' }]],
        T01: [['Photos denied', { seed: '8', photos: 'denied' }]],
      },
    },
    placeholderTag: 'Not built',
    placeholderNote: (n, type) => `Placeholder · ${type} · built in phase ${n} of DEV‑DOC`, // ‑ - нерозривний дефіс, без переносу "DEV-/DOC"
    placeholderBack: 'Back',
    toastStub: (id, name) => `${id} · ${name} · not built`,
  },

  /** Демо-роут #/_components. Тексти-зразки беруть чернетки DEV-DOC, де вони є. */
  demo: {
    title: 'Components',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    secTypography: 'Typography',
    secWordmark: 'Wordmark',
    secButton: 'Button',
    secIconButton: 'IconButton',
    secSegment: 'SegmentChip',
    secSessionChip: 'SessionChip',
    secList: 'ListGroup / ListRow',
    secSheet: 'Sheet',
    secAlert: 'Alert',
    secToast: 'Toast',
    secRouter: 'Router',
    overGlass: 'Glass - only over a rich background (test pattern below)',
    typeLargeTitle: 'Large Title',
    typeTitle2: 'Title 2',
    typeHeadline: 'Headline',
    typeBody: 'Body',
    typeFootnote: 'Footnote',
    typeMono: 'Mono caption',
    typeCountdown: '3',
    btnPrimary: 'Continue',                       // [draft] DEV-DOC S01
    btnSecondary: 'Save photos',                  // [draft] DEV-DOC S07
    btnText: 'Not now',                           // [draft] DEV-DOC S02
    btnDisabled: 'View photos',                   // [draft] DEV-DOC S07
    chipSession: 'Photo Session',                 // DEV-DOC S04
    chipBooth: 'Photo Booth',                     // DEV-DOC S04
    tapped: (label) => `${label} tapped`,
    aspectCaption: 'Aspect ratio',
    focalCaption: 'Focal length',
    focal: (mm) => `${mm}`,
    sessionChip: sessionSummary,                  // = copy.S04.sessionChip
    sessionCleared: 'Session cleared',
    listHeader: 'Camera',
    rowCaptureDefaults: 'Capture defaults',
    rowCaptureDefaultsValue: sessionSummary,      // = copy.S04.sessionChip (one label per intent)
    rowAspect: 'Default aspect ratio',
    rowGrid: 'Composition grid',
    rowLevel: 'Level guide',
    rowOffDemo: 'Toggle · off',
    rowDelay: 'Start delay',
    delayValue: (n) => `${n}s`,
    listFooter: 'These values are the starting point for every new session.',
    openSheetMedium: 'Open sheet · medium',
    openSheetLarge: 'Open sheet · large',
    sheetAspectTitle: 'Aspect ratio',             // [draft] DEV-DOC H01
    sheetAspectSubtitle: 'Sets the frame for the viewfinder and your photos', // = copy.H01.subtitle
    sheetLargeTitle: 'Look',                      // = copy.H04.title
    sheetLargeSubtitle: 'Sets the mood of every photo in this session',      // = copy.H04.subtitle
    openAlert: 'Open alert',
    openAlertDestructive: 'Open destructive alert',
    alertTitle: `Allow ${APP_NAME} to use the camera?`,
    alertMessage: 'The camera is only used while you shoot. Photos stay on this iPhone.',
    alertDeleteTitle: 'Delete this photo?',
    alertDeleteMessage: 'It will be removed from this session.',
    showToastInfo: 'Show info toast',
    showToastError: 'Show error toast',
    toastInfo: 'Saved 2 photos',                  // [draft] DEV-DOC S08
    toastError: 'Photos access is off. Turn it on in Settings to save.', // [draft] DEV-DOC T01
    pushScreen: 'Push screen (S12 · About)',
    openModal: 'Open modal (M01)',
    swipeHint: 'Pushed screens close with a swipe from the left edge.',
  },

  /** Назви наборів data.js (PRD FR-3.3, FR-8.1; Looks - open-questions #3) */
  presets: {
    quick: 'Quick Shot',
    portrait: 'Portrait',
    outfit: 'Outfit',
    couples: 'Couples',
  },
  /** FR-7.2: вигадані назви, без реальних плівок і камер. Кількість - open-questions #3. Описи - copy.H04.descriptions */
  looks: {
    standard: 'Standard',     // FR-7.2: free
    warm: 'Honey',            // теплий плівковий
    cool: 'Blue Hour',        // холодний цифровий
    mono: 'Graphite',         // ч/б
  },
  inspoCategories: {
    favorites: 'Favorites',
    ootd: 'OOTD',
    goingOut: 'Going Out',
    city: 'City',
    cafe: 'Cafe',
    travel: 'Travel',
    birthday: 'Birthday',
    besties: 'Besties',
  },
  plans: {
    annual: 'Annual',
    weekly: 'Weekly',
  },
};
