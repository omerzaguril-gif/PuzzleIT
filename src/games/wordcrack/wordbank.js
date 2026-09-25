// מאגר פיצוח מילים + עריכות המנהל (override ב-localStorage). הלוגיקה הועתקה כמו שהיא מהקובץ המקורי.
import { WORDS_DEFAULT } from './words.js';

export { WORDS_DEFAULT };
export const ADMIN_EMAIL = 'omerzaguril@gmail.com';
export const OVERRIDES_KEY = 'wordCrackOverrides_v1';

export function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

export function saveOverrides(ov) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(ov));
    return true;
  } catch (e) {
    return false;
  }
}

export function getEffectiveWords() {
  const ov = loadOverrides();
  return WORDS_DEFAULT.map(w => {
    if (ov[w.word] && Array.isArray(ov[w.word].clues) && ov[w.word].clues.length === 5) {
      return { word: w.word, clues: [...ov[w.word].clues], accepts: w.accepts };
    }
    return w;
  });
}
