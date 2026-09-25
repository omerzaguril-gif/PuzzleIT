// ולידציה של תוכן לפני שמירה ממסך הניהול. אותם כללים כמו scripts/check-data.mjs.
const HEB_ONLY = /^[א-ת ]+$/;
const HEB_VARIANT = /^[א-ת '"׳״]+$/;
const stripNiqqud = s => (s || '').replace(/[֑-ׇ]/g, '');
export const cleanSpaces = s => (s || '').replace(/\s+/g, ' ').trim();

export function validatePuzzle(p, all) {
  const e = [];
  if (!p.imageFile) e.push('חסרה תמונה');
  if (!Number.isInteger(p.num) || p.num < 1) e.push('מספר חידה חייב להיות מספר שלם חיובי');
  else if (all.some(x => x.num === p.num && x.id !== p.id)) e.push(`המספר ${p.num} כבר תפוס`);
  if (!(p.level >= 1 && p.level <= 10)) e.push('רמה בין 1 ל-10');
  const primary = p.answer.primary;
  if (!primary) e.push('חסרה תשובה');
  else if (!HEB_ONLY.test(primary)) e.push('התשובה: אותיות עבריות ורווחים בלבד (בלי ספרות, לטינית או פיסוק)');
  for (const a of p.answer.accepted) if (!HEB_VARIANT.test(a)) e.push(`תשובה נוספת לא חוקית: "${a}"`);
  const answerWords = (primary || '').split(' ').filter(w => w.length >= 3);
  for (const k of ['1', '2']) {
    const h = p.hints[k];
    if (!h) { e.push(`חסר רמז ${k}`); continue; }
    const hintWords = stripNiqqud(h).split(/[^א-ת]+/);
    const leak = answerWords.find(w => hintWords.includes(w));
    if (leak) e.push(`רמז ${k} מכיל מילה מהתשובה: "${leak}"`);
  }
  if (!p.explanation.steps.length) e.push('חסר הסבר (לפחות שלב אחד)');
  if (!p.explanation.finalPhrase) e.push('חסר משפט סיום');
  return e;
}

export function validateWord(w, all, originalWord) {
  const e = [];
  if (!w.word) e.push('חסרה מילה');
  else if (!HEB_ONLY.test(w.word) || w.word.includes(' ')) e.push('המילה: מילה אחת, אותיות עבריות בלבד');
  else if (all.some(x => x.word === w.word && x.word !== originalWord)) e.push(`המילה "${w.word}" כבר קיימת`);
  if (w.clues.length !== 5) e.push('צריך בדיוק 5 רמזים');
  w.clues.forEach((c, i) => {
    if (!c) e.push(`רמז ${i + 1} ריק`);
    else if (/\s/.test(c)) e.push(`רמז ${i + 1} ("${c}") חייב להיות מילה אחת`);
    else if (w.word && (c === w.word || (w.word.length >= 3 && c.includes(w.word)))) e.push(`רמז ${i + 1} מכיל את התשובה`);
  });
  for (const a of w.accepts) if (!HEB_ONLY.test(a)) e.push(`וריאציה לא חוקית: "${a}"`);
  return e;
}

export const suggestLink = (prev, cur) => cleanSpaces(`${prev?.displayWord || prev?.word || ''} ${cur?.word || ''}`);

export function validateChain(c) {
  const e = [];
  const w = c.words;
  if (!['קל', 'בינוני', 'קשה'].includes(c.difficulty)) e.push('בחרו רמת קושי');
  if (w.length < 5 || w.length > 10) e.push(`שרשרת צריכה 5 עד 10 מילים (יש ${w.length})`);
  const seen = new Set();
  w.forEach((x, i) => {
    if (!x.word) { e.push(`מילה ${i + 1} ריקה`); return; }
    if (!HEB_ONLY.test(x.word)) e.push(`"${x.word}": אותיות עבריות בלבד`);
    if (x.displayWord && !HEB_ONLY.test(x.displayWord)) e.push(`"${x.displayWord}": אותיות עבריות בלבד`);
    if (seen.has(x.word)) e.push(`"${x.word}" מופיעה פעמיים`);
    seen.add(x.word);
    if (i === 0) return;
    const prev = w[i - 1].displayWord || w[i - 1].word;
    if (!x.link) e.push(`חסר צירוף למילה "${x.word}"`);
    else if (!x.link.includes(x.word) || !x.link.includes(prev)) e.push(`הצירוף "${x.link}" צריך לכלול את "${prev}" ואת "${x.word}"`);
  });
  return e;
}
