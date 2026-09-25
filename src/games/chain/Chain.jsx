// שרשרת — מבוסס על games/chain/ChainItHebrew.jsx. לוגיקת המשחק (אורך מילה לא נחשף, קלט אחרי הקידומת,
// רמז = אות + 3 שניות, צ'יפים של ניחושים שגויים, displayWord) הועתקה כמו שהיא.
// שינויים לפי ה-spec (LovableUpdate_ChainGame.md):
//   - שרשרת אחת ליום לפי שעון ישראל, זהה לכל השחקנים, ניסיון אחד ליום (במקום בורר של כל השרשראות).
//     עד שיהיה לוח שיבוץ בפאנל הניהול, השרשרת של היום נבחרת דטרמיניסטית מהמאגר לפי התאריך.
//   - כפתור הרמז מציג "המילה חשופה" כשאין מה לחשוף.
//   - ההתקדמות נשמרת: יציאה באמצע והשעון עוצר, חזרה ממשיכה מאותה נקודה.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, Check, Trophy, Clock, X } from 'lucide-react';
import { CHAINS } from './chains.js';
import { SFX } from './sfx.js';
import { israelDate, dayNumber } from '../../lib/dates.js';
import { store } from '../../lib/store.js';
import { chainToHub } from '../../lib/scoring.js';

const HINT_PENALTY = 3;

const strip = s => (s || '').trim().replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function chainForDate(date) {
  return CHAINS[dayNumber(date) % CHAINS.length];
}

export default function Chain({ paused, onScore, setInProgress }) {
  const today = useRef(israelDate()).current;
  const chain = chainForDate(today);

  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [revealed, setRevealed] = useState(1);
  const [guess, setGuess] = useState('');       // only the letters typed AFTER the revealed prefix
  const [tried, setTried] = useState([]);       // wrong full-word attempts for the current blank
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hubPoints, setHubPoints] = useState(null);
  const inputRef = useRef(null);

  const done = step >= chain.words.length;
  const target = done ? null : chain.words[step].word;
  const prefix = done ? '' : target.slice(0, revealed);
  const running = loaded && !done && !paused;

  // Restore today's progress (or the finished result).
  useEffect(() => {
    let alive = true;
    store.loadProgress('chain').then(p => {
      if (!alive) return;
      if (p && p.date === today && p.chainId === chain.id) {
        setStep(p.step); setRevealed(p.revealed); setHints(p.hints);
        setMisses(p.misses); setElapsed(p.elapsed); setTried(p.tried || []);
        setHubPoints(p.hubPoints ?? null);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { alive = false; };
  }, [today, chain.id]);

  // Persist on every meaningful change, and the running clock on the way out.
  const snapshot = useRef(null);
  snapshot.current = { date: today, chainId: chain.id, step, revealed, hints, misses, elapsed, tried, finished: done, hubPoints };
  useEffect(() => {
    if (loaded) store.saveProgress('chain', snapshot.current).catch(() => {});
  }, [loaded, step, revealed, hints, misses, tried, done, hubPoints]);
  useEffect(() => () => {
    if (snapshot.current) store.saveProgress('chain', snapshot.current).catch(() => {});
  }, []);

  useEffect(() => { setInProgress(loaded && !done); }, [loaded, done, setInProgress]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed(e => e + 0.1), 100);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => { if (!paused) inputRef.current?.focus(); }, [step, loaded, paused]);

  const submit = useCallback(() => {
    if (done || paused || !guess.trim()) return;
    const attempt = prefix + guess;

    if (strip(attempt) === strip(target)) {
      SFX.correct();
      setGuess(''); setTried([]);
      const next = step + 1;
      setStep(next); setRevealed(1);
      if (next >= chain.words.length) {
        SFX.finish();
        const pts = chainToHub({ seconds: elapsed, blanks: chain.words.length - 1 });
        setHubPoints(pts);
        onScore(pts, { chainId: chain.id, date: today, seconds: Math.round(elapsed * 10) / 10, hints, misses });
      }
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
  }, [chain, done, paused, guess, prefix, step, target, elapsed, hints, misses, onScore, today]);

  const useHint = useCallback(() => {
    if (done || paused || revealed >= target.length) return;
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
  }, [done, paused, revealed, target]);

  const solvedCount = step - 1;
  const totalBlanks = chain.words.length - 1;
  const fullyRevealed = !done && revealed >= target.length;

  return (
    <>
      <style>{`
        .chain-root, .chain-root * { direction: rtl; box-sizing: border-box; font-family: 'Assistant', system-ui, sans-serif; }
        .chain-root .mono { font-family: 'Space Mono', monospace; }
        @keyframes chain-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
        .chain-root .shake { animation: chain-shake .4s ease-in-out; }
        @keyframes chain-pop { from{transform:scale(.8);opacity:0} to{transform:scale(1);opacity:1} }
        .chain-root .pop { animation: chain-pop .3s cubic-bezier(.2,.9,.3,1.4); }
      `}</style>

      <div dir="rtl" className="chain-root min-h-[calc(100vh-48px)] text-white px-5 py-6"
        style={{ background: `radial-gradient(ellipse at top,#1B1B3A 0%,transparent 50%),
                              radial-gradient(ellipse at bottom,#10102A 0%,transparent 50%),#08081A` }}>
        {!loaded ? <div className="text-center text-white/50 pt-10">טוען…</div> : (
        <div className="max-w-md mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span className="mono text-sm font-bold">{fmt(elapsed)}</span>
            </div>
            <div className="text-center">
              <div className="text-[10px] tracking-[0.35em] text-white/45 font-bold">השרשרת של היום</div>
              <div className="font-black text-lg -mt-0.5">חבר את המילים</div>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/60">
              {chain.difficulty}
            </div>
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
              {hubPoints != null && (
                <div className="mt-3 text-sm font-bold text-white/80">+{hubPoints} לניקוד הכולל</div>
              )}
              <div className="mt-5 text-white/60 text-sm">השרשרת הבאה תחכה לכם מחר 🌙</div>
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
                <button onClick={useHint} disabled={fullyRevealed}
                  className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold
                             hover:bg-white/10 flex items-center gap-2 disabled:opacity-30">
                  <Lightbulb className="w-5 h-5" />
                  {fullyRevealed
                    ? <span className="text-sm">המילה חשופה</span>
                    : <span className="text-sm">רמז<span className="text-white/50"> +{HINT_PENALTY}ש׳</span></span>}
                </button>
              </div>

              <p className="text-center text-white/35 text-xs">
                {solvedCount}/{totalBlanks} · כל רמז חושף אות נוספת ומוסיף {HINT_PENALTY} שניות
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </>
  );
}
