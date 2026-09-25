// ============================================================
// תוכן המשחקים (חידות, שרשראות, מילים).
// ============================================================
// מקור האמת הוא Supabase (טבלאות puzzles / chains / wordcrack_words, נערכות ממסך הניהול).
// אם טבלה ריקה או שאין חיבור, משתמשים בתוכן ההתחלתי שבקוד (seed).
import PUZZLES_SEED from '../games/puzzlit/puzzles.json';
import { CHAINS as CHAINS_SEED } from '../games/chain/chains.js';
import { WORDS_DEFAULT as WORDS_SEED } from '../games/wordcrack/words.js';
import { supabase } from './store.js';

export const SEED = { puzzles: PUZZLES_SEED, chains: CHAINS_SEED, words: WORDS_SEED };

const byNum = (a, b) => a.num - b.num;
const cache = {
  puzzles: [...PUZZLES_SEED].sort(byNum),
  chains: CHAINS_SEED,
  words: WORDS_SEED,
};

export const getPuzzles = () => cache.puzzles;
export const getChains = () => cache.chains;
export const getWords = () => cache.words;

// ---- row <-> object
export const puzzleFromRow = r => ({
  id: r.id, num: r.num, level: r.level, imageFile: r.image,
  answer: r.answer, hints: r.hints, explanation: r.explanation,
});
export const puzzleToRow = p => ({
  id: p.id, num: p.num, level: p.level, image: p.imageFile,
  answer: p.answer, hints: p.hints, explanation: p.explanation,
  updated_at: new Date().toISOString(),
});
export const chainFromRow = r => ({ id: r.id, sort: r.sort, difficulty: r.difficulty, theme: r.theme, words: r.words });
export const chainToRow = (c, sort) => ({
  id: c.id, sort: sort ?? c.sort ?? 0, difficulty: c.difficulty, theme: c.theme || null,
  words: c.words, updated_at: new Date().toISOString(),
});
export const wordFromRow = r => ({ word: r.word, sort: r.sort, clues: r.clues, accepts: r.accepts || [] });
export const wordToRow = (w, sort) => ({
  word: w.word, sort: sort ?? w.sort ?? 0, clues: w.clues, accepts: w.accepts || [],
  updated_at: new Date().toISOString(),
});

async function fetchAll(table, order) {
  const { data, error } = await supabase.from(table).select('*').order(order).range(0, 4999);
  if (error) throw error;
  return data;
}

// Loads all three banks. Returns which tables were empty (for the admin import).
export async function loadContent() {
  const empty = { puzzles: true, chains: true, words: true };
  if (!supabase) return empty;
  const [p, c, w] = await Promise.all([
    fetchAll('puzzles', 'num').catch(() => []),
    fetchAll('chains', 'sort').catch(() => []),
    fetchAll('wordcrack_words', 'sort').catch(() => []),
  ]);
  if (p.length) { cache.puzzles = p.map(puzzleFromRow).sort(byNum); empty.puzzles = false; }
  if (c.length) { cache.chains = c.map(chainFromRow); empty.chains = false; }
  if (w.length) { cache.words = w.map(wordFromRow); empty.words = false; }
  return empty;
}

// ---- admin writes (RLS allows them only for the admin email)
async function check(res) {
  const { error } = await res;
  if (error) throw new Error(error.message);
}

export async function importSeed(kind) {
  if (kind === 'puzzles') await check(supabase.from('puzzles').upsert(SEED.puzzles.map(puzzleToRow)));
  if (kind === 'chains') await check(supabase.from('chains').upsert(SEED.chains.map((c, i) => chainToRow(c, i))));
  if (kind === 'words') await check(supabase.from('wordcrack_words').upsert(SEED.words.map((w, i) => wordToRow(w, i))));
}

export async function savePuzzle(p) {
  await check(supabase.from('puzzles').upsert(puzzleToRow(p)));
  cache.puzzles = [...cache.puzzles.filter(x => x.id !== p.id), p].sort(byNum);
}
export async function deletePuzzle(id) {
  await check(supabase.from('puzzles').delete().eq('id', id));
  cache.puzzles = cache.puzzles.filter(x => x.id !== id);
}
export async function uploadPuzzleImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('puzzle-images').upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from('puzzle-images').getPublicUrl(path).data.publicUrl;
}

export async function saveChain(c) {
  const idx = cache.chains.findIndex(x => x.id === c.id);
  const sort = idx >= 0 ? (cache.chains[idx].sort ?? idx) : Math.max(0, ...cache.chains.map((x, i) => x.sort ?? i)) + 1;
  const next = { ...c, sort };
  await check(supabase.from('chains').upsert(chainToRow(next)));
  cache.chains = idx >= 0 ? cache.chains.map(x => (x.id === c.id ? next : x)) : [...cache.chains, next];
}
export async function deleteChain(id) {
  await check(supabase.from('chains').delete().eq('id', id));
  cache.chains = cache.chains.filter(x => x.id !== id);
}

export async function saveWord(w, originalWord) {
  const idx = cache.words.findIndex(x => x.word === (originalWord ?? w.word));
  const sort = idx >= 0 ? (cache.words[idx].sort ?? idx) : cache.words.length;
  const next = { ...w, sort };
  if (originalWord && originalWord !== w.word) {
    await check(supabase.from('wordcrack_words').delete().eq('word', originalWord));
  }
  await check(supabase.from('wordcrack_words').upsert(wordToRow(next)));
  cache.words = idx >= 0 ? cache.words.map((x, i) => (i === idx ? next : x)) : [...cache.words, next];
}
export async function deleteWord(word) {
  await check(supabase.from('wordcrack_words').delete().eq('word', word));
  cache.words = cache.words.filter(x => x.word !== word);
}
