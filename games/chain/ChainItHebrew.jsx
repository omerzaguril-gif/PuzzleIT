import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, Check, RotateCcw, Trophy, Clock, ChevronLeft, X } from 'lucide-react';

// ==========================================================================
// SOUND
// ==========================================================================
let _ctx = null;
function ctx() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) { try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}
function tone({ freq, duration = 0.12, type = 'sine', volume = 0.12, delay = 0 }) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator(), gain = a.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t); osc.stop(t + duration + 0.05);
}
const SFX = {
  correct: () => { tone({ freq: 523 }); tone({ freq: 659, delay: 0.06 }); tone({ freq: 784, duration: 0.2, delay: 0.12 }); },
  wrong:   () => { tone({ freq: 175, type: 'sawtooth', volume: 0.07 }); tone({ freq: 120, type: 'sawtooth', volume: 0.07, delay: 0.08 }); },
  hint:    () => { tone({ freq: 880, duration: 0.08, volume: 0.07 }); tone({ freq: 1174, duration: 0.09, volume: 0.06, delay: 0.05 }); },
  finish:  () => {
    tone({ freq: 55, duration: 1.0, volume: 0.18 });
    [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, duration: 1.3, volume: 0.09, delay: 0.35 + i * 0.02 }));
    tone({ freq: 1568, duration: 0.12, volume: 0.07, delay: 0.6 });
    tone({ freq: 2093, duration: 0.12, volume: 0.06, delay: 0.75 });
  },
};

// ==========================================================================
// CHAINS
// ==========================================================================
// Sourced from a directed graph of Hebrew collocations: an edge A->B exists when
// "A B" is a real phrase. Word length is deliberately never shown — a first
// letter of ס after בית could be ספר or סוהר, and resolving that by trial is the
// puzzle rather than a flaw in it.
//
// IMPORTANT for editors: `word` is the ONLY thing validated against the
// player's input (compared letters-only, niqqud/punctuation stripped) — it
// must always be the dictionary/absolute form. `link` is just the display
// caption shown once a word is solved, and it is a fully independent string
// per entry. That means the previous word CAN be shown in a different
// inflected/construct form in different links (e.g. "ראש השנה" here, "שנה
// טובה" for the next word) without any contradiction — Hebrew smichut and
// ה-הידיעה changes are cosmetic in the caption, never in what gets typed.
// What must NEVER happen is picking a caption whose real-world phrase simply
// isn't used that way (e.g. "ראש שנה" without the ה, or "טובה הנאה" instead
// of "טובת הנאה") — verify the caption is something a native speaker would
// actually say, not just two words glued together. Also avoid captions that
// are only real as a FRAGMENT of a longer fixed expression (e.g. "תחזית
// מזג" is never said on its own — it only exists inside "תחזית מזג
// האוויר") — every caption must stand on its own as something a native
// speaker would actually say as a complete two-word unit.
//
// Chain length policy: every chain has at least 5 words (4 links) and at
// most 10 words (9 links). Edges may repeat across chains (e.g. "טוב לב"
// and "לב זהב" each appear in more than one chain below) — that's fine,
// since chains are paths through the same shared graph, not required to be
// disjoint.
//
// A structural note worth remembering when adding more chains: chains
// extend well through NOUNS (a noun can always start a new smichut/
// construct with a following noun) and almost always dead-end at an
// ADJECTIVE, because Hebrew adjectives follow their noun rather than head
// a further noun phrase forward (e.g. "קיצוני", "עמוקה", "קשה", "מהיר" as
// a *current* word essentially never continues). Favor routing new chains
// through chains of nouns, and treat landing on a plain adjective as a
// natural, acceptable place to end a chain rather than something to force
// past.
//
// CONSTRUCT-STATE DISPLAY (`displayWord`): when a solved word changes its
// spelling as it becomes the FIRST half of the next collocation — most
// commonly Hebrew feminine nouns ending ה that take ת in smichut (מדינה→
// מדינת, משטרה→משטרת, ממשלה→ממשלת, טיסה→טיסת), but other construct-state
// shifts happen too (לימוד→לימודי) — add an optional `displayWord` field to
// that entry with the changed spelling. It ONLY affects what's shown on the
// ladder once the word is given or solved; `word` is untouched and remains
// the plain/dictionary form the player actually has to type and that hints
// reveal letters from. Example: { word: 'מדינה', link: 'עד מדינה',
// displayWord: 'מדינת' }, { word: 'ישראל', link: 'מדינת ישראל' } — the
// player types "מדינה", but once solved the ladder shows "מדינת" so the
// next link ("מדינת ישראל") reads correctly. If a GIVEN (first) word is
// already known to only ever appear in its construct form (e.g. "עוגת",
// "תשומת", "מכונת"), just write that form directly in `word` instead —
// there's nothing to validate for a given word, so no `displayWord` is
// needed there. Most collocations involve no spelling change at all (e.g.
// noun+adjective like "עיר גדולה") — `displayWord` is only for the entries
// where the word itself actually changes.
const CHAINS = [
  { id: 'c1', difficulty: 'קל', theme: 'ערב שבת ותורה', words: [
      { word: 'נר',    given: true },
      { word: 'שבת',   link: 'נר שבת' },
      { word: 'שלום',  link: 'שבת שלום' },
      { word: 'בית',   link: 'שלום בית' },
      { word: 'ספר',   link: 'בית ספר' },
      { word: 'תורה',  link: 'ספר תורה' },
      { word: 'שבכתב', link: 'תורה שבכתב' },
  ]},
  { id: 'c2', difficulty: 'קל', theme: 'מזמן לתור', words: [
      { word: 'שעון', given: true },
      { word: 'חול',  link: 'שעון חול' },
      { word: 'ים',   link: 'חול ים' },
      { word: 'סוף',  link: 'ים סוף' },
      { word: 'שבוע', link: 'סוף שבוע' },
      { word: 'הבא',  link: 'שבוע הבא' },
      { word: 'בתור', link: 'הבא בתור' },
  ]},
  { id: 'c3', difficulty: 'בינוני', theme: 'מהבנק אל הרוחות', words: [
      { word: 'מספר',  given: true },
      { word: 'חשבון', link: 'מספר חשבון' },
      { word: 'בנק',   link: 'חשבון בנק' },
      { word: 'דם',    link: 'בנק דם' },
      { word: 'קר',    link: 'דם קר' },
      { word: 'רוח',   link: 'קר רוח' },
      { word: 'רפאים', link: 'רוח רפאים' },
  ]},
  { id: 'c4', difficulty: 'קשה', theme: 'מהחזר קרן ועד עד מדינה', words: [
      { word: 'החזר',  given: true },
      { word: 'קרן',   link: 'החזר קרן' },
      { word: 'אור',   link: 'קרן אור' },
      { word: 'ירוק',  link: 'אור ירוק' },
      { word: 'עד',    link: 'ירוק עד' },
      { word: 'מדינה', link: 'עד מדינה', displayWord: 'מדינת' },
      { word: 'ישראל', link: 'מדינת ישראל' },
  ]},
  { id: 'c5', difficulty: 'בינוני', theme: 'מלב זהב לביצה קשה', words: [
      { word: 'תשומת', given: true },
      { word: 'לב',    link: 'תשומת לב' },
      { word: 'זהב',   link: 'לב זהב' },
      { word: 'שחור',  link: 'זהב שחור' },
      { word: 'לבן',   link: 'שחור לבן' },
      { word: 'ביצה',  link: 'לבן ביצה' },
      { word: 'קשה',   link: 'ביצה קשה' },
  ]},
  { id: 'c6', difficulty: 'בינוני', theme: 'מעוגה למלון בוטיק', words: [
      { word: 'עוגת',   given: true },
      { word: 'שוקולד', link: 'עוגת שוקולד' },
      { word: 'חלב',    link: 'שוקולד חלב' },
      { word: 'אם',     link: 'חלב אם' },
      { word: 'בית',    link: 'אם בית' },
      { word: 'מלון',   link: 'בית מלון' },
      { word: 'בוטיק',  link: 'מלון בוטיק' },
  ]},
  { id: 'c7', difficulty: 'בינוני', theme: 'מגן חיות ללב זהב', words: [
      { word: 'גן',    given: true },
      { word: 'חיות',  link: 'גן חיות' },
      { word: 'בר',    link: 'חיות בר' },
      { word: 'מזל',   link: 'בר מזל' },
      { word: 'טוב',   link: 'מזל טוב' },
      { word: 'לב',    link: 'טוב לב' },
      { word: 'זהב',   link: 'לב זהב' },
  ]},
  { id: 'c8', difficulty: 'בינוני', theme: 'מכאב ראש לאבן חן', words: [
      { word: 'כאב',  given: true },
      { word: 'ראש',  link: 'כאב ראש' },
      { word: 'חודש', link: 'ראש חודש' },
      { word: 'טוב',  link: 'חודש טוב' },
      { word: 'לב',   link: 'טוב לב' },
      { word: 'אבן',  link: 'לב אבן' },
      { word: 'חן',   link: 'אבן חן' },
  ]},
  { id: 'c9', difficulty: 'קשה', theme: 'משינויי אקלים לחיים טובים', words: [
      { word: 'שינויי', given: true },
      { word: 'אקלים',  link: 'שינויי אקלים' },
      { word: 'חם',     link: 'אקלים חם' },
      { word: 'מזג',    link: 'חם מזג' },
      { word: 'אוויר',  link: 'מזג אוויר' },
      { word: 'קר',     link: 'אוויר קר' },
      { word: 'רוח',    link: 'קר רוח' },
      { word: 'חיים',   link: 'רוח חיים' },
      { word: 'טובים',  link: 'חיים טובים' },
  ]},
  { id: 'c10', difficulty: 'קל', theme: 'מכל יום ללב שבור', words: [
      { word: 'כל',    given: true },
      { word: 'יום',   link: 'כל יום' },
      { word: 'טוב',   link: 'יום טוב' },
      { word: 'לב',    link: 'טוב לב' },
      { word: 'שבור',  link: 'לב שבור' },
  ]},
  { id: 'c11', difficulty: 'בינוני', theme: 'מכאב ראש לאחדות לאומית', words: [
      { word: 'כאב',      given: true },
      { word: 'ראש',      link: 'כאב ראש' },
      { word: 'ממשלה',    link: 'ראש ממשלה', displayWord: 'ממשלת' },
      { word: 'אחדות',    link: 'ממשלת אחדות' },
      { word: 'לאומית',   link: 'אחדות לאומית' },
  ]},
  { id: 'c12', difficulty: 'בינוני', theme: 'מהערכת מצב לקרב מגע', words: [
      { word: 'הערכת', given: true },
      { word: 'מצב',   link: 'הערכת מצב' },
      { word: 'רוח',   link: 'מצב רוח' },
      { word: 'קרב',   link: 'רוח קרב' },
      { word: 'מגע',   link: 'קרב מגע' },
  ]},
  { id: 'c13', difficulty: 'קל', theme: 'מבית ספר לנהיגה בטוחה', words: [
      { word: 'בית',    given: true },
      { word: 'ספר',    link: 'בית ספר' },
      { word: 'לימוד',  link: 'ספר לימוד', displayWord: 'לימודי' },
      { word: 'נהיגה',  link: 'לימודי נהיגה' },
      { word: 'בטוחה',  link: 'נהיגה בטוחה' },
  ]},
  { id: 'c14', difficulty: 'בינוני', theme: 'מלחץ אוויר לרוח גבית', words: [
      { word: 'לחץ',   given: true },
      { word: 'אוויר', link: 'לחץ אוויר' },
      { word: 'קר',    link: 'אוויר קר' },
      { word: 'רוח',   link: 'קר רוח' },
      { word: 'גבית',  link: 'רוח גבית' },
  ]},
  { id: 'c15', difficulty: 'בינוני', theme: 'מכרטיס ביקור למלון בוטיק', words: [
      { word: 'כרטיס', given: true },
      { word: 'ביקור', link: 'כרטיס ביקור' },
      { word: 'בית',   link: 'ביקור בית' },
      { word: 'מלון',  link: 'בית מלון' },
      { word: 'בוטיק', link: 'מלון בוטיק' },
  ]},
  { id: 'c16', difficulty: 'קשה', theme: 'מכרטיס טיסה ללבן בוהק', words: [
      { word: 'כרטיס', given: true },
      { word: 'טיסה',  link: 'כרטיס טיסה', displayWord: 'טיסת' },
      { word: 'לילה',  link: 'טיסת לילה' },
      { word: 'טוב',   link: 'לילה טוב' },
      { word: 'לב',    link: 'טוב לב' },
      { word: 'זהב',   link: 'לב זהב' },
      { word: 'שחור',  link: 'זהב שחור' },
      { word: 'לבן',   link: 'שחור לבן' },
      { word: 'בוהק',  link: 'לבן בוהק' },
  ]},
  { id: 'c17', difficulty: 'קשה', theme: 'מרחוב ראשי לימין ושמאל', words: [
      { word: 'רחוב',    given: true },
      { word: 'ראשי',    link: 'רחוב ראשי' },
      { word: 'ממשלה',   link: 'ראשי ממשלה', displayWord: 'ממשלת' },
      { word: 'ימין',    link: 'ממשלת ימין' },
      { word: 'שמאל',    link: 'ימין שמאל' },
  ]},
];

const HINT_PENALTY = 3;

const strip = s => (s || '').trim().replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function ChainItHebrew() {
  const [chainIndex, setChainIndex] = useState(0);
  const chain = CHAINS[chainIndex];

  const [step, setStep] = useState(1);
  const [revealed, setRevealed] = useState(1);
  const [guess, setGuess] = useState('');       // only the letters typed AFTER the revealed prefix
  const [tried, setTried] = useState([]);       // wrong full-word attempts for the current blank
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const inputRef = useRef(null);

  const done = step >= chain.words.length;
  const target = done ? null : chain.words[step].word;
  const prefix = done ? '' : target.slice(0, revealed);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed(e => e + 0.1), 100);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => { inputRef.current?.focus(); }, [step, chainIndex]);

  const reset = useCallback((index = chainIndex) => {
    setChainIndex(index);
    setStep(1); setRevealed(1); setGuess(''); setTried([]);
    setHints(0); setMisses(0); setElapsed(0); setRunning(true); setShake(false);
  }, [chainIndex]);

  const submit = useCallback(() => {
    if (done || !guess.trim()) return;
    const attempt = prefix + guess;

    if (strip(attempt) === strip(target)) {
      SFX.correct();
      setGuess(''); setTried([]);
      const next = step + 1;
      setStep(next); setRevealed(1);
      if (next >= chain.words.length) { setRunning(false); SFX.finish(); }
      return;
    }

    // Wrong: clear the typed continuation but keep a record of the full
    // attempted word, so the player never burns time retyping something
    // they already ruled out.
    SFX.wrong();
    setMisses(m => m + 1);
    setTried(t => (t.includes(attempt) ? t : [...t, attempt]));
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
    setGuess('');
  }, [chain.words.length, done, guess, prefix, step, target]);

  const useHint = useCallback(() => {
    if (done || revealed >= target.length) return;
    SFX.hint();
    const nextLetter = target[revealed];
    // If the player already typed the letter that's about to be revealed as
    // part of the fixed prefix, drop it from their in-progress continuation
    // instead of discarding everything they've typed so far.
    setGuess(g => (g && g[0] === nextLetter) ? g.slice(1) : '');
    setRevealed(r => r + 1);
    setHints(h => h + 1);
    setElapsed(e => e + HINT_PENALTY);
    inputRef.current?.focus();
  }, [done, revealed, target]);

  const solvedCount = step - 1;
  const totalBlanks = chain.words.length - 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');
        * { direction: rtl; box-sizing: border-box; }
        body, div, span, button, input { font-family: 'Assistant', system-ui, sans-serif; }
        .mono { font-family: 'Space Mono', monospace; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
        .shake { animation: shake .4s ease-in-out; }
        @keyframes pop { from{transform:scale(.8);opacity:0} to{transform:scale(1);opacity:1} }
        .pop { animation: pop .3s cubic-bezier(.2,.9,.3,1.4); }
      `}</style>

      <div dir="rtl" className="min-h-screen text-white px-5 py-6"
        style={{ background: `radial-gradient(ellipse at top,#1B1B3A 0%,transparent 50%),
                              radial-gradient(ellipse at bottom,#10102A 0%,transparent 50%),#08081A` }}>
        <div className="max-w-md mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span className="mono text-sm font-bold">{fmt(elapsed)}</span>
            </div>
            <div className="text-center">
              <div className="text-[10px] tracking-[0.35em] text-white/45 font-bold">שרשרת</div>
              <div className="font-black text-lg -mt-0.5">חבר את המילים</div>
            </div>
            <button onClick={() => reset()} aria-label="התחלה מחדש"
              className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
              <RotateCcw className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
            {CHAINS.map((c, i) => (
              <button key={c.id} onClick={() => reset(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  i === chainIndex ? 'text-white' : 'bg-white/5 text-white/45 hover:bg-white/10'}`}
                style={i === chainIndex ? { background: 'linear-gradient(135deg,#22D3EE,#8B5CF6)' } : {}}>
                {i + 1} · {c.difficulty}
              </button>
            ))}
          </div>

          {/* the ladder */}
          <div className={`space-y-2 mb-5 ${shake ? 'shake' : ''}`}>
            {chain.words.map((entry, i) => {
              const solved = i < step;
              const current = i === step;

              // Only the given word and solved words ever show their full length.
              // A pending word shows its revealed prefix followed by an ellipsis,
              // so the player gains letters without learning how many remain.
              // `displayWord`, when present, replaces `word` ONLY in this display
              // (given/solved) — it never affects what the player has to type or
              // what hints reveal, which always come from `word`.
              let display, styleObj;
              if (entry.given) {
                display = entry.displayWord || entry.word;
                styleObj = { background: 'rgba(255,255,255,.13)', border: '2px solid rgba(255,255,255,.28)' };
              } else if (solved) {
                display = entry.displayWord || entry.word;
                styleObj = { background: 'linear-gradient(135deg,#22D3EE2e,#8B5CF62e)', border: '2px solid #8B5CF688' };
              } else if (current) {
                display = entry.word.slice(0, revealed) + '…';
                styleObj = { background: 'rgba(255,255,255,.10)', border: '2px solid #22D3EE99' };
              } else {
                display = entry.word[0] + '…';
                styleObj = { background: 'rgba(255,255,255,.02)', border: '2px dashed rgba(255,255,255,.13)', color: 'rgba(255,255,255,.4)' };
              }

              return (
                <div key={i}>
                  <div className={`flex justify-center ${current ? 'pop' : ''}`}>
                    <div className="min-w-[130px] px-5 h-12 rounded-2xl grid place-items-center
                                    text-xl font-black tracking-wide transition-all"
                      style={styleObj}>
                      {display}
                    </div>
                  </div>
                  {(solved || entry.given) && (
                    <div className="text-center text-[11px] text-white/40 mt-1">
                      {entry.given ? 'מילת הפתיחה' : entry.link}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {done ? (
            <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-6 text-center">
              <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg,#22D3EE,#8B5CF6)', boxShadow: '0 0 36px #8B5CF666' }}>
                <Trophy className="w-8 h-8" strokeWidth={2.3} />
              </div>
              <div className="text-2xl font-black mb-1">השרשרת הושלמה</div>
              <div className="mono text-4xl font-black" style={{ color: '#22D3EE' }}>{fmt(elapsed)}</div>
              <div className="text-white/45 text-xs mt-2">
                {hints === 0 ? 'בלי רמזים' : `${hints} רמזים · ${hints * HINT_PENALTY} שניות קנס`}
                {misses > 0 && ` · ${misses} ניחושים שגויים`}
              </div>
              {chainIndex < CHAINS.length - 1 && (
                <button onClick={() => reset(chainIndex + 1)}
                  className="w-full mt-5 py-3.5 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#22D3EE,#8B5CF6)' }}>
                  <span>לשרשרת הבאה</span><ChevronLeft className="w-5 h-5" strokeWidth={3} />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tried.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {tried.map((word, i) => (
                    <span key={i}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25
                                 text-red-300/80 text-xs font-bold line-through flex items-center gap-1">
                      <X className="w-3 h-3" strokeWidth={3} />{word}
                    </span>
                  ))}
                </div>
              )}

              {/* The revealed prefix is fixed, inline text inside the same box —
                  the player types the rest of the word directly after it,
                  continuing the existing letters rather than starting a
                  separate blank field. */}
              <div dir="rtl" onClick={() => inputRef.current?.focus()}
                className={`w-full px-5 py-4 rounded-2xl flex items-center gap-0.5
                           bg-white/[0.06] border-2 border-white/10 focus-within:border-white/30 cursor-text
                           ${shake ? 'shake' : ''}`}>
                <span className="text-lg font-black text-white tracking-wide select-none">{prefix}</span>
                <input ref={inputRef} value={guess} dir="rtl"
                  onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  style={{ width: `${Math.max(guess.length, 1) + 0.5}ch` }}
                  className="bg-transparent outline-none text-lg font-black text-white tracking-wide min-w-[0.6ch]" />
              </div>

              <div className="flex gap-2.5">
                <button onClick={submit} disabled={!guess.trim()}
                  className="flex-1 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2
                             disabled:opacity-30 transition-transform hover:scale-[1.02] active:scale-[.98]"
                  style={{ background: 'linear-gradient(135deg,#22D3EE,#8B5CF6)' }}>
                  <Check className="w-5 h-5" strokeWidth={3} /><span>בדיקה</span>
                </button>
                <button onClick={useHint} disabled={revealed >= target.length}
                  className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold
                             hover:bg-white/10 flex items-center gap-2 disabled:opacity-30">
                  <Lightbulb className="w-5 h-5" />
                  <span className="text-sm">רמז<span className="text-white/50"> +{HINT_PENALTY}ש׳</span></span>
                </button>
              </div>

              <p className="text-center text-white/35 text-xs">
                {solvedCount}/{totalBlanks} · כל רמז חושף אות נוספת ומוסיף {HINT_PENALTY} שניות
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
