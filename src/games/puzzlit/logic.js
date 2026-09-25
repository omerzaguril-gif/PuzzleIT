// PUZZLIT — לוגיקה לפי PUZZLIT_Visual_Puzzles.md (מאגר 196 החידות).
import PUZZLES_RAW from './puzzles.json';
import { dayNumber } from '../../lib/dates.js';

export const PUZZLES = [...PUZZLES_RAW].sort((a, b) => a.num - b.num);
export const IMAGE_BASE = `${import.meta.env.BASE_URL}puzzlit/images/`;
export const imageUrl = p => IMAGE_BASE + p.imageFile;

// §3: השלב נגזר מ-level. רמות 6 עד 10 מתמזגות לשלב 6.
export const STAGES = [
  { n: 1, name: 'המתחילים', theme: 'קריסטל', from: '#22D3EE', to: '#3B82F6' },
  { n: 2, name: 'התחזקות', theme: 'ערפילית', from: '#A855F7', to: '#EC4899' },
  { n: 3, name: 'הבינוני', theme: 'גחלת', from: '#F97316', to: '#EF4444' },
  { n: 4, name: 'המאתגרים', theme: 'זהב', from: '#F59E0B', to: '#DC2626' },
  { n: 5, name: 'הקשוחים', theme: 'תהום', from: '#10B981', to: '#0EA5E9' },
  { n: 6, name: 'האגדות', theme: 'אוניקס', from: '#6366F1', to: '#8B5CF6' },
];
export const stageOf = p => Math.min(p.level, 6);
export const stageGradient = s => `linear-gradient(135deg, ${s.from}, ${s.to})`;
export const puzzlesInStage = n => PUZZLES.filter(p => stageOf(p) === n);

// חידה יומית דטרמיניסטית: אותה חידה לכל השחקנים באותו יום (שעון ישראל).
export function dailyPuzzle(date) {
  return PUZZLES[dayNumber(date) % PUZZLES.length];
}

// §5: נרמול — הסרת ניקוד, פיסוק וכל הרווחים; איחוד אותיות סופיות.
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[ךםןףץ]/g, c => FINALS[c])
    .replace(/[^א-תa-z0-9]/g, '');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// §5: השוואה מול primary ומול כל accepted. Levenshtein <= 2 נחשב נכון; 3 מציג "כמעט!".
export const TOLERANCE = 2;
export function checkAnswer(input, puzzle) {
  const n = normalize(input);
  if (!n) return { correct: false, close: false };
  const targets = [puzzle.answer.primary, ...puzzle.answer.accepted].map(normalize);
  const d = Math.min(...targets.map(t => levenshtein(n, t)));
  return { correct: d <= TOLERANCE, close: d === TOLERANCE + 1 };
}

// ניקוד פנימי (XP), לפי PUZZLIT_BUILD_PROMPT: בסיס לפי רמה × 0.8 לכל רמז.
// הבסיס הורחב לשישה שלבים (הפרומט הגדיר רק 5 רמות).
const STAGE_XP = [100, 200, 400, 700, 1200, 1800];
export function xpFor(puzzle, hintsUsed) {
  return Math.round(STAGE_XP[stageOf(puzzle) - 1] * Math.pow(0.8, hintsUsed));
}
