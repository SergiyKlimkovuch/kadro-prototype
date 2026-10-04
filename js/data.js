/**
 * data.js - статичні набори (DEV-DOC "Дані (data.js)", PRD FR-3, FR-7, FR-8).
 * Назви - у copy.js (copy.presets / copy.looks / copy.inspoCategories / copy.plans).
 */

/** PRD FR-3.2: діапазони значень сесії */
export const ranges = {
  delay: [0, 3, 5, 10, 15, 30],          // с
  count: { min: 1, max: 50 },            // фото
  interval: { min: 1, max: 10 },         // с
};

/** PRD FR-3.3 / DEV-DOC: delay · count · interval */
export const presets = [
  { id: 'quick', delay: 3, count: 5, interval: 1 },
  { id: 'portrait', delay: 10, count: 20, interval: 2 },
  { id: 'outfit', delay: 15, count: 30, interval: 3 },
  { id: 'couples', delay: 15, count: 20, interval: 3 },
];

/**
 * DEV-DOC: standard (free, без фільтра) + 3 Plus-стилі з CSS-фільтрами.
 * Кількість і назви - open-questions #3 (плейсхолдер). Картка Look = одне базове фото
 * з assets/looks/ + filter (open-questions #14); фото додається в етапі 3.
 */
export const looks = [
  { id: 'standard', plus: false, filter: 'none' },
  { id: 'warm', plus: true, filter: 'sepia(.25) saturate(1.3) contrast(1.05) brightness(1.05)' },
  // cool: sepia + hue-rotate ~180deg дає справжній холодний (синьо-блакитний) відтінок; saturate/contrast - [approx], підібрано на PNG (verifier: колишній фільтр майже не відрізнявся від Standard)
  { id: 'cool', plus: true, filter: 'sepia(.3) hue-rotate(180deg) saturate(1.2) contrast(1.1)' },
  { id: 'mono', plus: true, filter: 'grayscale(1) contrast(1.2)' },
];

/** PRD FR-8.1. Емодзі чіпів - виняток open-questions #11; img - Apple-емодзі PNG 64 (assets/emoji, джерело - набір замовника, CREDITS.md). Назви - copy.inspoCategories. Два ряди по 4 чіпи. */
export const inspoCategories = [
  { id: 'favorites', emoji: '⭐', img: 'assets/emoji/2b50.png' },
  { id: 'ootd', emoji: '👗', img: 'assets/emoji/1f457.png' },
  { id: 'goingOut', emoji: '🥂', img: 'assets/emoji/1f942.png' },
  { id: 'city', emoji: '🌆', img: 'assets/emoji/1f306.png' },
  { id: 'cafe', emoji: '☕', img: 'assets/emoji/2615.png' },
  { id: 'travel', emoji: '✈️', img: 'assets/emoji/2708.png' },
  { id: 'birthday', emoji: '🎂', img: 'assets/emoji/1f382.png' },
  { id: 'besties', emoji: '👯', img: null }, // PNG немає в наборі - системний емодзі
];

/**
 * Записи { id, category, fav, src }: назви й alt - copy.S10.items[id]. src: null до появи фото (етап 6, open-questions #4;
 * без фото builder ставить data-photo-placeholder, пропорція 3:4). Favorites - віртуальна категорія (fav: true).
 */
export const inspo = [
  { id: 'inspo-01', category: 'ootd', fav: true, src: null },
  { id: 'inspo-02', category: 'ootd', fav: true, src: null },
  { id: 'inspo-03', category: 'ootd', fav: false, src: null },
  { id: 'inspo-04', category: 'ootd', fav: false, src: null },
  { id: 'inspo-05', category: 'goingOut', fav: false, src: null },
  { id: 'inspo-06', category: 'goingOut', fav: false, src: null },
  { id: 'inspo-07', category: 'goingOut', fav: false, src: null },
  { id: 'inspo-08', category: 'city', fav: true, src: null },
  { id: 'inspo-09', category: 'city', fav: false, src: null },
  { id: 'inspo-10', category: 'city', fav: false, src: null },
  { id: 'inspo-11', category: 'cafe', fav: false, src: null },
  { id: 'inspo-12', category: 'cafe', fav: false, src: null },
  { id: 'inspo-13', category: 'cafe', fav: false, src: null },
  { id: 'inspo-14', category: 'travel', fav: false, src: null },
  { id: 'inspo-15', category: 'travel', fav: false, src: null },
  { id: 'inspo-16', category: 'travel', fav: false, src: null },
  { id: 'inspo-17', category: 'birthday', fav: false, src: null },
  { id: 'inspo-18', category: 'birthday', fav: false, src: null },
  { id: 'inspo-19', category: 'besties', fav: false, src: null },
  { id: 'inspo-20', category: 'besties', fav: false, src: null },
];

/** DEV-DOC M01 */
export const plans = [
  { id: 'annual', price: 29.99, currency: 'USD', period: 'year', trialDays: 7, perWeek: 0.58, defaultSelected: true },
  { id: 'weekly', price: 2.99, currency: 'USD', period: 'week', trialDays: 0 },
];

/** DEV-DOC S04 / H01 */
export const aspectRatios = ['3:4', '9:16', '1:1', '4:3', '16:9'];
export const focalLengths = [26, 35, 50];
export const flashModes = ['off', 'on', 'auto'];
