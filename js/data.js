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

/** PRD FR-8.1. Емодзі чіпів (open-questions #11) обирається в етапі 6 разом з копі S10. */
export const inspoCategories = [
  { id: 'favorites', emoji: null },
  { id: 'ootd', emoji: null },
  { id: 'goingOut', emoji: null },
  { id: 'city', emoji: null },
  { id: 'cafe', emoji: null },
  { id: 'travel', emoji: null },
  { id: 'birthday', emoji: null },
  { id: 'besties', emoji: null },
];

/** 12-16 записів { id, title, category, src } з фото Unsplash - етап 6 (open-questions #4) */
export const inspo = [];

/** DEV-DOC M01 */
export const plans = [
  { id: 'annual', price: 29.99, currency: 'USD', period: 'year', trialDays: 7, perWeek: 0.58, defaultSelected: true },
  { id: 'weekly', price: 2.99, currency: 'USD', period: 'week', trialDays: 0 },
];

/** DEV-DOC S04 / H01 */
export const aspectRatios = ['3:4', '9:16', '1:1', '4:3', '16:9'];
export const focalLengths = [26, 35, 50];
export const flashModes = ['off', 'on', 'auto'];
