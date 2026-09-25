// בדיקת המאגרים של שלושת המשחקים. מריצים: npm run check-data
// נכשל (exit 1) אם יש הפרה של כלל שאסור לשבור.
import fs from 'node:fs';
import { WORDS_DEFAULT } from '../src/games/wordcrack/words.js';
import { CHAINS } from '../src/games/chain/chains.js';

const puzzles = JSON.parse(fs.readFileSync(new URL('../src/games/puzzlit/puzzles.json', import.meta.url)));
const imgDir = new URL('../public/puzzlit/images/', import.meta.url);
const errors = [];
const warnings = [];
const HEB_ONLY = /^[א-ת ]+$/;
const stripNiqqud = s => s.replace(/[֑-ׇ]/g, '');

// ---- PUZZLIT
const ids = new Set(), nums = new Set();
for (const p of puzzles) {
  const tag = `PUZZLIT ${p.id}`;
  if (ids.has(p.id)) errors.push(`${tag}: id כפול`);
  if (nums.has(p.num)) errors.push(`${tag}: num כפול`);
  ids.add(p.id); nums.add(p.num);
  if (!HEB_ONLY.test(p.answer.primary)) errors.push(`${tag}: התשובה חייבת להיות אותיות עבריות ורווחים בלבד ("${p.answer.primary}")`);
  // וריאציות משרתות את הקלט הקולי ומנורמלות לפני השוואה, לכן גרש/גרשיים מותרים בהן
  for (const a of p.answer.accepted) if (!/^[א-ת '"׳״]+$/.test(a)) errors.push(`${tag}: וריאציה לא חוקית "${a}"`);
  if (!p.hints?.['1'] || !p.hints?.['2']) errors.push(`${tag}: חסר רמז`);
  if (!p.explanation?.steps?.length || !p.explanation?.finalPhrase) errors.push(`${tag}: חסר הסבר`);
  if (!fs.existsSync(new URL(p.imageFile, imgDir))) errors.push(`${tag}: התמונה ${p.imageFile} לא נמצאה`);
  // דליפת מילה מהתשובה לרמז (מילים של 3+ אותיות; בדיקת שורש מלאה עדיין ידנית)
  const answerWords = p.answer.primary.split(' ').filter(w => w.length >= 3);
  for (const k of ['1', '2']) {
    const hintWords = stripNiqqud(p.hints[k] || '').split(/[^א-ת]+/);
    const leak = answerWords.find(w => hintWords.includes(w));
    if (leak) errors.push(`${tag}: רמז ${k} מכיל מילה מהתשובה ("${leak}")`);
  }
}

// ---- Chains
const chainIds = new Set();
for (const c of CHAINS) {
  const tag = `CHAIN ${c.id}`;
  if (chainIds.has(c.id)) errors.push(`${tag}: id כפול`);
  chainIds.add(c.id);
  const w = c.words;
  if (w.length < 5 || w.length > 10) errors.push(`${tag}: ${w.length} מילים (מותר 5–10)`);
  if (!w[0].given || w.slice(1).some(x => x.given)) errors.push(`${tag}: רק המילה הראשונה מסומנת given`);
  if (new Set(w.map(x => x.word)).size !== w.length) errors.push(`${tag}: מילה חוזרת`);
  w.forEach((x, i) => {
    if (!HEB_ONLY.test(x.word)) errors.push(`${tag}: "${x.word}" לא אותיות עבריות בלבד`);
    if (i === 0) return;
    const prev = w[i - 1].displayWord || w[i - 1].word;
    if (!x.link) errors.push(`${tag}: חסר link ל"${x.word}"`);
    else if (!x.link.includes(x.word) || !x.link.includes(prev)) errors.push(`${tag}: הצירוף "${x.link}" לא מכיל את "${prev}" ואת "${x.word}"`);
    if (x.word[0] === w[i - 1].word[0]) warnings.push(`${tag}: "${w[i - 1].word}" ו"${x.word}" מתחילות באותה אות`);
  });
}

// ---- Word crack
const seen = new Set();
for (const w of WORDS_DEFAULT) {
  const tag = `WORDCRACK ${w.word}`;
  if (seen.has(w.word)) errors.push(`${tag}: כפול`);
  seen.add(w.word);
  if (w.clues.length !== 5) errors.push(`${tag}: ${w.clues.length} רמזים (צריך 5)`);
  for (const c of w.clues) if (/\s/.test(c.trim())) errors.push(`${tag}: הרמז "${c}" אינו מילה בודדת`);
  // מילים של 2 אותיות מופיעות בתוך מילים אחרות במקרה (ים → גלים), ולכן נבדקות רק בהתאמה מלאה
  if (w.clues.some(c => c === w.word || (w.word.length >= 3 && c.includes(w.word)))) errors.push(`${tag}: רמז מכיל את התשובה`);
}

console.log(`PUZZLIT: ${puzzles.length} חידות · שרשרת: ${CHAINS.length} שרשראות · פיצוח מילים: ${WORDS_DEFAULT.length} מילים`);
for (const w of warnings) console.log('⚠️ ', w);
for (const e of errors) console.log('❌', e);
if (errors.length) process.exit(1);
console.log('✓ כל הבדיקות עברו');
