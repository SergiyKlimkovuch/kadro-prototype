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

/** Ціна з plan (data.js): money({ price: 29.99, currency: 'USD' }) -> "$29.99". Прототип - лише USD [mock]; у проді рядок дає StoreKit. */
const money = ({ price, currency = 'USD' }) => `${currency === 'USD' ? '$' : `${currency} `}${price.toFixed(2)}`;

/** Розмір сховища в МБ: 0 -> "0 KB", 48.2 -> "48.2 MB", 1536 -> "1.5 GB" */
const storageSize = (mb) => {
  if (mb <= 0) return '0 KB';
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
};

/** Слово статусу дозволу в підписі S12 main: granted -> "on", denied -> "off", notDetermined -> "not asked" */
const permWord = (s) => ({ granted: 'on', denied: 'off', notDetermined: 'not asked' }[s] || 'not asked');

/** Посилання покупок/legal: спільні для M01 і S12-about (один підпис на дію) */
const PURCHASE_LINKS = { restore: 'Restore Purchases', redeem: 'Redeem Code', terms: 'Terms', privacy: 'Privacy' };

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
    links: PURCHASE_LINKS,
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

  /**
   * M01 Paywall (PRD "Вимоги до пейволу", Guideline 3.1.2, ref 16-20). Темна тема; тон тут продає.
   * Ціни НЕ хардкодимо: усе через plans з data.js (у проді - StoreKit/RevenueCat), копі лише форматує.
   * Plan = { id, price, currency, period, trialDays, perWeek? } (див. data.js). Прототип - US, USD [mock].
   * Рядки слайдів - власні (PerPic: "Set the rhythm. Step into frame." тощо не повторюємо).
   * Слайд 5 (Booth) лишається, Photo Booth - open-questions #79. Теги/лічильники - регістр задає CSS.
   * Найдовший CTA: "Start 7-day free trial" (22 знаки).
   */
  M01: {
    slides: [
      { id: 'capture', tag: 'Capture', line: 'Set the timer, step back, and shoot a whole series.' },
      { id: 'inspo', tag: 'Inspo', line: 'Pick a pose and line up with it on screen.' },
      { id: 'style', tag: 'Style', line: 'Give every photo a Look that fits the mood.' },
      { id: 'pick', tag: 'Pick', line: 'We flag the strongest shot of each session.' },
      { id: 'booth', tag: 'Photo Booth', line: 'Four quick frames, one photo strip.' },
    ],
    slideNumber: (i) => pad2(i),                         // "01" на картці (i з 1)
    pageIndicator: (i, n) => `${pad2(i)} / ${pad2(n)}`,  // "02 / 05"
    plansGroup: 'Choose a plan',                         // a11y radiogroup; на екрані заголовка немає
    plan: {
      annual: {
        name: 'Annual',                                  // = copy.plans.annual
        badge: (days) => `${days} days free`,            // бейдж на Annual: trialDays з data.js
        price: (p) => `${money(p)} / year`,
        perWeek: (p) => `${money({ price: p.perWeek, currency: p.currency })} / week`, // "$0.58 / week"
      },
      weekly: {
        name: 'Weekly',                                  // = copy.plans.weekly
        price: (p) => `${money(p)} / week`,
      },
    },
    cta: {
      annual: (days) => `Start ${days}-day free trial`,
      weekly: 'Continue',                                // = common.continue (one label per intent)
    },
    /** Умови під CTA (3.1.2): ціна + автопродовження. Не обіцяємо "Cancel anytime" без шляху скасування. */
    terms: {
      annual: (p) => `${p.trialDays} days free, then ${money(p)} per year. Renews automatically until you cancel.`,
      weekly: (p) => `${money(p)} per week. Renews automatically until you cancel.`,
      manage: 'Cancel anytime in your Apple Account settings.',
    },
    restore: PURCHASE_LINKS.restore,
    termsLink: PURCHASE_LINKS.terms,
    privacyLink: PURCHASE_LINKS.privacy,
    redeem: PURCHASE_LINKS.redeem,
    toast: {
      restored: 'Purchases restored',
      nothingToRestore: 'No purchases to restore',
      redeemStub: 'Offer codes work in the App Store build',   // [mock] у проді - системний лист RevenueCat
      linkStub: (name) => `${name} opens in the full app`,
    },
    a11y: {
      close: 'Close',                                    // = a11y.close
      carousel: 'Plus features',
      slide: (i, n, tag) => `${tag}, ${i} of ${n}`,
      plan: (name, detail, selected) => `${name}, ${detail}${selected ? ', selected' : ''}`,
    },
  },

  /**
   * A03 Purchase sheet (імітація системного листа StoreKit, FR-монетизація). Це "системний" вигляд,
   * тому сухо, як в Apple: назва, план, ціна, Subscribe. [mock] - прототип нічого не списує.
   * Потік: Subscribe -> 1 с спінер -> "You're all set" -> закриття, isPlus = true.
   */
  A03: {
    title: 'Subscribe',
    app: APP_NAME,
    planLine: (planName) => `${PLAN_NAME} · ${planName}`,         // "Kadro Plus · Annual"
    // Рядок вартості: Annual з trial -> "7 days free, then $29.99 per year"; Weekly -> "$2.99 per week"
    priceLine: (p) => (p.trialDays > 0
      ? `${p.trialDays} days free, then ${money(p)} per ${p.period}`
      : `${money(p)} per ${p.period}`),
    renewal: 'Renews automatically until you cancel.',
    account: 'Apple Account',
    subscribe: 'Subscribe',                                         // системна кнопка листа
    cancel: 'Cancel',                                               // = common.cancel
    processing: 'Processing…',
    success: {
      title: "You're all set",
      message: `${PLAN_NAME} is on. Enjoy unlimited exports and every Look.`,
    },
    a11y: { sheet: 'Purchase confirmation', spinner: 'Processing purchase', cancel: 'Cancel purchase' },
  },

  /**
   * S12 Settings main (FR-9, ref 07-08). Grouped list: логотип + слоган, банер Upgrade (ховається для Plus),
   * секції Camera / Library / Kadro. Рядок = назва + підпис-значення (mono, регістр лишаємо як є).
   * Summary-и - функції від state.settings / state.session / state.camera; формат "·" як sessionSummary.
   * Не включаємо з PerPic: App Language, Community, соцмережі (поза FR-9).
   */
  S12: {
    title: 'Settings',
    wordmarkLabel: APP_NAME,                              // a11y логотипа; сам wordmark - компонент
    tagline: 'Your hands-free photographer',              // = copy.app.tagline (brand.md)
    upgrade: {
      title: `Upgrade to ${PLAN_NAME}`,
      subtitle: 'Unlock every feature',
    },
    sections: { camera: 'Camera', library: 'Library', app: APP_NAME },
    rows: {
      captureDefaults: {
        title: 'Capture defaults',
        summary: sessionSummary,                          // = copy.S04.sessionChip (one label per intent)
      },
      viewfinder: {
        title: 'Viewfinder',
        // "3:4 · Grid · Level"; вимкнені елементи не показуємо
        summary: (cam, s) => [cam.aspect, s.grid && 'Grid', s.level && 'Level'].filter(Boolean).join(' · '),
      },
      feedback: {
        title: 'Feedback',
        // "Flash · Haptics"; нічого не ввімкнено -> "All off"
        summary: (s) => [s.flashBeforeShot && 'Flash', s.haptics && 'Haptics', s.countdownSound && 'Sound']
          .filter(Boolean).join(' · ') || 'All off',
      },
      saving: { title: 'Saving', summary: (mode) => copy.S12saving.modes[mode].short },
      storage: { title: 'Storage', summary: (usedMb) => storageSize(usedMb) },
      permissions: {
        title: 'Permissions',
        // "Camera on · Photos not asked"
        summary: (perm) => `Camera ${permWord(perm.camera)} · Photos ${permWord(perm.photos)}`,
      },
      about: { title: 'About & Support', summary: `${APP_NAME}, purchases and help` },
    },
    plusSection: { title: PLAN_NAME, summary: 'Active' }, // опційно: рядок статусу для Plus замість банера
    a11y: {
      back: 'Back',
      upgrade: `Upgrade to ${PLAN_NAME}. Unlock every feature.`,
      row: (title, summary) => `${title}, ${summary}`,
    },
    mock: { usedMb: 48.2, generatedMb: 12.6 },            // [mock] сховище; Storage і рядок Storage беруть звідси
  },

  /** S12-capture-defaults (FR-9: Start delay, Interval, Photo count, Default look). Pull-down меню. */
  S12capture: {
    title: 'Capture defaults',
    header: 'New sessions',
    rows: { delay: 'Start delay', interval: 'Interval', count: 'Photo count', look: 'Default look' },
    delayOption: (n) => (n === 0 ? 'No delay' : `${n}s`),
    intervalOption: (n) => `${n}s`,
    countOption: (n) => plural(n, 'photo'),
    lookOption: (id) => copy.looks[id],
    plusTag: PLUS_BADGE,                                  // позначка Plus-стилю в меню -> M01 (source: look)
    footer: 'These values are the starting point for every new session.',
    a11y: { menu: (title, value) => `${title}, ${value}. Opens a menu.` },
  },

  /** S12-viewfinder (FR-9: Default aspect ratio, Composition grid, Level guide, Keep screen awake). */
  S12viewfinder: {
    title: 'Viewfinder',
    header: 'Framing',
    rows: { aspect: 'Default aspect ratio', grid: 'Composition grid', level: 'Level guide', awake: 'Keep screen awake' },
    footer: 'The ratio frames the viewfinder and your photos. Keep screen awake applies only while the camera is open.',
    a11y: { aspect: (r) => `Default aspect ratio, ${ratioSpoken(r)}. Opens a menu.` },
  },

  /** S12-feedback (FR-9: Flash before shot, Haptics, [+] Countdown sound). Лише тогли. */
  S12feedback: {
    title: 'Feedback',
    header: 'During a session',
    rows: { flash: 'Flash before shot', haptics: 'Haptics', sound: 'Countdown sound' },
    footer: 'Flash before shot gives a brief light cue just ahead of each photo. Countdown sound ticks through the last three seconds.',
  },

  /**
   * S12-saving (FR-9). saveMode з state.settings: manual | ask | picks | all. Picks/all - Plus -> M01 (source: saving).
   * "Auto-save" - майбутня фіча (PRD Next); експорт-лімітів у копі не обіцяємо. short - підпис рядка в S12 main.
   */
  S12saving: {
    title: 'Saving',
    header: 'Exporting',
    rows: { mode: 'Save to Photos', originals: 'Keep originals' },
    modes: {
      manual: { label: 'Manually', short: 'Manually' },
      ask: { label: 'Ask after each session', short: 'Ask each time' },
      picks: { label: 'Auto-save picks', short: 'Picks' },
      all: { label: 'Auto-save everything', short: 'Everything' },
    },
    plusTag: PLUS_BADGE,
    footer: `Photos stay in ${APP_NAME} until you export them. With Keep originals on, untouched captures remain on your iPhone.`,
  },

  /** S12-storage (FR-9). Розміри - [mock] з copy.S12.mock; storageSize форматує KB/MB/GB. */
  S12storage: {
    title: 'Storage',
    header: 'On this iPhone',
    rows: { used: 'Used', generated: 'Generated looks', clear: 'Clear generated images', orphaned: 'Remove orphaned files' },
    size: storageSize,                                    // (mb) -> "48.2 MB"; 0 -> "0 KB"
    footer: 'Clearing frees the space used by styled copies. Your originals and thumbnails are not touched.',
    clearAlert: {
      title: 'Clear generated images?',
      message: 'Styled copies are rebuilt when you open a photo. Originals stay as they are.',
      confirm: 'Clear',
      cancel: 'Cancel',                                   // = common.cancel
    },
    orphanedAlert: {
      title: 'Remove orphaned files?',
      message: 'This deletes leftover files that no longer belong to any session.',
      confirm: 'Remove',
      cancel: 'Cancel',
    },
    toast: {
      cleared: (mb) => `Cleared ${storageSize(mb)}`,
      orphanedRemoved: (n, mb) => `Removed ${plural(n, 'file')} · ${storageSize(mb)}`,
      orphanedNone: 'No orphaned files found',
    },
    mock: { orphanedCount: 3, orphanedMb: 1.4 },          // [mock] результат "Remove orphaned files"
  },

  /**
   * S12-permissions (FR-9). Дія переходу в системні налаштування скрізь підписана "Settings" (#54):
   * рядок = common.settings, під ним пояснення. Статуси: camera granted/denied/notDetermined; photos - те саме.
   */
  S12permissions: {
    title: 'Permissions',
    header: 'Access',
    rows: { camera: 'Camera', photos: 'Photos (export)', settings: 'Settings' },
    status: {
      camera: { granted: 'On', denied: 'Off', notDetermined: 'Not asked' },
      photos: { granted: 'Add only', denied: 'Off', notDetermined: 'Not asked' },
    },
    settingsHint: 'Change access in iOS Settings',        // підпис під рядком Settings; сам рядок - 'Settings'
    footer: `${APP_NAME} only adds photos you choose to export. It never browses your library.`,
    a11y: { settings: 'Settings. Opens the iOS Settings app.' },
    stub: 'Settings opens iOS Settings on a real device', // тост у прототипі
  },

  /** S12-about (FR-9: About, Rate, Share, Support, Email feedback, Restore Purchases, Redeem Code, Privacy, Terms). */
  S12about: {
    title: 'About & Support',
    headers: { app: APP_NAME, purchases: 'Purchases', legal: 'Legal' },
    version: (v, build) => `Version ${v} (${build})`,
    mock: { version: '1.0', build: 1 },                   // [mock]
    rows: {
      about: `About ${APP_NAME}`,
      rate: `Rate ${APP_NAME}`,
      share: `Share ${APP_NAME}`,
      support: 'Support',
      email: 'Email feedback',
      restore: PURCHASE_LINKS.restore,
      redeem: PURCHASE_LINKS.redeem,
      privacy: PURCHASE_LINKS.privacy,
      terms: PURCHASE_LINKS.terms,
    },
    plan: { title: 'Plan', free: 'Free', plus: PLAN_NAME },   // рядок статусу над Purchases
    aboutText: `${APP_NAME} is a hands-free photographer: set a timer, strike a pose, and keep the best shots. Everything stays on your iPhone.`,
    shareMessage: `Try ${APP_NAME}: a timer camera that shoots a whole series while you pose.`, // [mock] текст share-листа
    toast: {
      restored: 'Purchases restored',
      nothingToRestore: 'No purchases to restore',
      stub: (name) => `${name} opens in the full app`,
    },
    a11y: { external: (title) => `${title}. Opens outside the app.` },
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
        M01: [
          ['Slide 1 Capture · Annual', { slide: '0', plus: '0' }], ['Slide 2 Inspo', { slide: '1', plus: '0' }], ['Slide 3 Style (from Look)', { slide: '2', plus: '0' }],
          ['Slide 4 Pick (from export)', { slide: '3', plus: '0' }], ['Slide 5 Photo Booth', { slide: '4', plus: '0' }], ['Weekly selected', { slide: '0', plan: 'weekly', plus: '0' }],
        ],
        A03: [['Annual', { plan: 'annual', plus: '0' }], ['Weekly', { plan: 'weekly', plus: '0' }], ['Processing', { plan: 'annual', state: 'processing', plus: '0' }], ['Success', { plan: 'annual', state: 'success', plus: '0' }]],
        A02: [['Photos not determined', { seed: '8', photos: 'notDetermined' }]],
        T01: [['Photos denied', { seed: '8', photos: 'denied' }]],
        S12: [['Free (Upgrade banner)', { plus: '0' }], ['Plus (no banner)', { plus: '1' }]],
        'S12-capture-defaults': [['Defaults (Portrait)', { preset: 'portrait' }], ['Outfit values', { preset: 'outfit' }], ['Delay menu', { preset: 'portrait', open: 'delay' }], ['Photo count menu', { preset: 'portrait', open: 'count' }], ['Look menu (free)', { plus: '0', open: 'look' }], ['Look menu (Plus)', { plus: '1', open: 'look' }]],
        'S12-viewfinder': [['All on', { settings: 'grid:1,level:1,keepAwake:1' }], ['All off', { settings: 'grid:0,level:0,keepAwake:0' }], ['Aspect menu', { open: 'aspect' }], ['9:16', { aspect: '9:16' }]],
        'S12-feedback': [['All on', { settings: 'flashBeforeShot:1,haptics:1,countdownSound:1' }], ['All off', { settings: 'flashBeforeShot:0,haptics:0,countdownSound:0' }]],
        'S12-saving': [['Manually', { plus: '0', settings: 'saveMode:manual' }], ['Menu (free)', { plus: '0', settings: 'saveMode:manual', open: 'mode' }], ['Menu (Plus)', { plus: '1', settings: 'saveMode:manual', open: 'mode' }], ['Auto-save picks (Plus)', { plus: '1', settings: 'saveMode:picks' }]],
        'S12-storage': [['Mock data', { storage: 'mock' }], ['Empty (0 KB)', { storage: 'empty' }]],
        'S12-permissions': [['Camera on, Photos not asked', { camera: 'granted', photos: 'notDetermined' }], ['Camera off, Photos not asked', { camera: 'denied', photos: 'notDetermined' }], ['All off', { camera: 'denied', photos: 'denied' }], ['All on', { camera: 'granted', photos: 'granted' }]],
        'S12-about': [['Free', { plus: '0' }], ['Plus', { plus: '1' }]],
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
