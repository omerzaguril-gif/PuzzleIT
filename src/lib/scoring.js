// ============================================================
// ניקוד הוליסטי: המרת התוצאה של כל משחק לנקודות Hub אחידות.
// ============================================================
// חלופה א' (אושרה ע"י עומר, 25.9.2026): "איזון לפי זמן משחק" — מאמץ טוב של כ-2 דקות בכל משחק שווה בערך 100 נקודות.
// הניקוד הפנימי של כל משחק לא משתנה. זו רק שכבת המרה מעליו.

export const GAMES = {
  wordcrack: 'פיצוח מילים',
  puzzlit: 'חידות ויזואליות',
  chain: 'שרשרת',
};

// פיצוח מילים: הנקודות של הסיבוב (1–5 למילה) × 3.
export function wordCrackToHub({ points }) {
  return Math.round(points * 3);
}

// PUZZLIT: בסיס לפי שלב × 0.8 בחזקת מספר הרמזים (הקנס של המשחק עצמו).
const PUZZLIT_STAGE_BASE = [10, 20, 30, 45, 60, 80];
export function puzzlitToHub({ stage, hintsUsed }) {
  return Math.round(PUZZLIT_STAGE_BASE[stage - 1] * Math.pow(0.8, hintsUsed));
}

// שרשרת: זמן יעד של 15 שניות למילה. בזמן היעד = 100, מהר יותר עד 150, לאט יותר עד מינימום 10.
export function chainToHub({ seconds, blanks }) {
  const target = blanks * 15;
  return Math.max(10, Math.round(100 * Math.min(1.5, target / Math.max(seconds, 1))));
}
