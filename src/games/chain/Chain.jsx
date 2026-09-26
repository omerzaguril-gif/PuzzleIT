// שרשרת — מבוסס על games/chain/ChainItHebrew.jsx. לוגיקת המשחק (אורך מילה לא נחשף, קלט אחרי הקידומת,
// רמז = אות + שניות קנס, צ'יפים של ניחושים שגויים, displayWord) הועתקה כמו שהיא.
// תוספות:
//   - מסך רשימה של כל השרשראות, כולן פתוחות (עומר, 25.9.2026: אין כרגע הגבלה יומית).
//     הנושא (theme) לא מוצג בכוונה, כי הוא מסגיר מילים מהשרשרת.
//   - נקודות רק על השלמה ראשונה של כל שרשרת. שרשרת שהושלמה מציגה את התוצאה.
//   - כפתור הרמז מציג "המילה חשופה" כשאין מה לחשוף.
//   - ההתקדמות נשמרת לכל שרשרת: יציאה באמצע עוצרת את השעון, וחזרה ממשיכה מאותה נקודה.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, Check, Trophy, Clock, X, ChevronLeft } from 'lucide-react';
import { getChains } from '../../lib/content.js';
import { SFX } from './sfx.js';
import { store } from '../../lib/store.js';
import { chainToHub } from '../../lib/scoring.js';

const HINT_PENALTY = 5; // עומר, 26.9.2026 (היה 3)

const strip = s => (s || '').trim().replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const BG = `radial-gradient(ellipse at top,#1B1B3A 0%,transparent 50%),
            radial-gradient(ellipse at bottom,#10102A 0%,transparent 50%),#08081A`;
const GRAD = 'linear-gradient(135deg,#22D3EE,#8B5CF6)';

export default function Chain({ paused, onScore, setInProgress }) {
  const CHAINS = getChains();
  const [progress, setProgress] = useState(null); // { chains: { [id]: savedState } }
  const [current, setCurrent] = useState(null);   // index into CHAINS, null = list

  useEffect(() => {
    store.loadProgress('chain')
      .then(p => setProgress(p?.chains ? p : { chains: {} }))
      .catch(() => setProgress({ chains: {} }));
  }, []);

  useEffect(() => { if (current == null) setInProgress(false); }, [current, setInProgress]);

  const save = useCallback((id, data) => {
    setProgress(prev => {
      const next = { chains: { ...prev.chains, [id]: data } };
      store.saveProgress('chain', next).catch(() => {});
      return next;
    });
  }, []);

  const nextIndex = i => {
    for (let k = 1; k < CHAINS.length; k++) {
      const j = (i + k) % CHAINS.length;
      if (!progress.chains[CHAINS[j].id]?.finished) return j;
    }
    return null;
  };

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
      <div dir="rtl" className="chain-root min-h-[calc(100vh-48px)] text-white px-5 py-6" style={{ background: BG }}>
        {!progress ? <div className="text-center text-white/50 pt-10">טוען…</div>
          : current == null ? <ChainList progress={progress} onPick={setCurrent} />
          : (
            <ChainGame key={CHAINS[current].id} chain={CHAINS[current]} index={current}
              saved={progress.chains[CHAINS[current].id]} onSave={save}
              paused={paused} onScore={onScore} setInProgress={setInProgress}
              onList={() => setCurrent(null)}
              onNext={nextIndex(current) != null ? () => setCurrent(nextIndex(current)) : null} />
          )}
      </div>
    </>
  );
}

function ChainList({ progress, onPick }) {
  const CHAINS = getChains();
  const doneCount = CHAINS.filter(c => progress.chains[c.id]?.finished).length;
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-5">
        <div className="text-[10px] tracking-[0.35em] text-white/45 font-bold">שרשרת</div>
        <div className="font-black text-2xl">בחרו שרשרת</div>
        <div className="text-white/45 text-sm mt-1">{doneCount} מתוך {CHAINS.length} הושלמו</div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CHAINS.map((c, i) => {
          const s = progress.chains[c.id];
          return (
            <button key={c.id} onClick={() => onPick(i)}
              className="rounded-2xl p-3 text-center border transition-transform hover:scale-[1.03]"
              style={s?.finished
                ? { background: 'linear-gradient(135deg,#22D3EE2e,#8B5CF62e)', borderColor: '#8B5CF688' }
                : { background: 'rgba(255,255,255,.05)', borderColor: s ? '#22D3EE99' : 'rgba(255,255,255,.1)' }}>
              <div className="font-black text-xl">{i + 1}</div>
              <div className="text-[11px] text-white/55 font-bold">{c.difficulty} · {c.words.length - 1} מילים</div>
              <div className="text-[11px] mt-1 mono font-bold" style={{ color: '#22D3EE', minHeight: 16 }}>
                {s?.finished ? `✓ ${fmt(s.elapsed)}` : s ? 'בתהליך' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChainGame({ chain, index, saved, onSave, paused, onScore, setInProgress, onList, onNext }) {
  const loaded = true;
  const [step, setStep] = useState(saved?.step ?? 1);
  const [revealed, setRevealed] = useState(saved?.revealed ?? 1);
  const [guess, setGuess] = useState('');       // only the letters typed AFTER the revealed prefix
  const [tried, setTried] = useState(saved?.tried ?? []); // wrong full-word attempts for the current blank
  const [hints, setHints] = useState(saved?.hints ?? 0);
  const [misses, setMisses] = useState(saved?.misses ?? 0);
  const [shake, setShake] = useState(false);
  const [elapsed, setElapsed] = useState(saved?.elapsed ?? 0);
  const [hubPoints, setHubPoints] = useState(saved?.hubPoints ?? null);
  const inputRef = useRef(null);
  // How many letters of the known prefix the player has re-typed (and we dropped) at the
  // start of the current attempt. Lets "ים" be typed in full after the given "י" without
  // becoming "יים", while a real double letter (ממשלה after "מ") still works: only the
  // first re-typed copy of each known letter is dropped.
  const skipRef = useRef(0);
  const clearGuess = () => { skipRef.current = 0; setGuess(''); };
  const onType = v => {
    if (guess === '') {
      let i = 0;
      let k = skipRef.current;
      while (i < v.length && k < prefix.length && v[i] === prefix[k]) { i++; k++; }
      skipRef.current = k;
      v = v.slice(i);
    }
    setGuess(v);
  };

  const done = step >= chain.words.length;
  const target = done ? null : chain.words[step].word;
  const prefix = done ? '' : target.slice(0, revealed);
  const running = loaded && !done && !paused;

  // Persist on every meaningful change, and the running clock on the way out.
  const snapshot = useRef(null);
  snapshot.current = { step, revealed, hints, misses, elapsed, tried, finished: done, hubPoints };
  useEffect(() => {
    onSave(chain.id, snapshot.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, revealed, hints, misses, tried, done, hubPoints]);
  useEffect(() => () => onSave(chain.id, snapshot.current), [chain.id, onSave]);

  useEffect(() => { setInProgress(loaded && !done); }, [loaded, done, setInProgress]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed(e => e + 0.1), 100);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => { if (!paused) inputRef.current?.focus(); }, [step, loaded, paused]);

  // Current word solved (typed correctly, or fully revealed by hints): move to the next one.
  const advance = useCallback((totalSeconds, totalHints) => {
    SFX.correct();
    clearGuess(); setTried([]);
    const next = step + 1;
    setStep(next); setRevealed(1);
    if (next >= chain.words.length) {
      SFX.finish();
      const pts = chainToHub({ seconds: totalSeconds, blanks: chain.words.length - 1 });
      setHubPoints(pts);
      onScore(pts, { chainId: chain.id, seconds: Math.round(totalSeconds * 10) / 10, hints: totalHints, misses });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, step, misses, onScore]);

  const submit = useCallback(() => {
    if (done || paused || !guess.trim()) return;
    const attempt = prefix + guess;

    if (strip(attempt) === strip(target)) {
      advance(elapsed, hints);
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
    clearGuess();
  }, [done, paused, guess, prefix, target, elapsed, hints, advance]);

  const useHint = useCallback(() => {
    if (done || paused || revealed >= target.length) return;
    SFX.hint();
    const nextLetter = target[revealed];
    // If the player already typed the letter that's about to be revealed as
    // part of the fixed prefix, drop it from their in-progress continuation
    // instead of discarding everything they've typed so far.
    skipRef.current = 0;
    setGuess(g => (g && g[0] === nextLetter) ? g.slice(1) : '');
    setRevealed(r => r + 1);
    setHints(h => h + 1);
    setElapsed(e => e + HINT_PENALTY);
    inputRef.current?.focus();
    // The hint revealed the last letter: the word counts as solved.
    if (revealed + 1 >= target.length) advance(elapsed + HINT_PENALTY, hints + 1);
  }, [done, paused, revealed, target, elapsed, hints, advance]);

  const solvedCount = step - 1;
  const totalBlanks = chain.words.length - 1;
  const fullyRevealed = !done && revealed >= target.length;

  return (
        <div className="max-w-md mx-auto">
          <button onClick={onList} className="text-sm font-bold text-white/50 mb-3">→ כל השרשראות</button>

          <div className="flex items-center justify-between mb-5">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span className="mono text-sm font-bold">{fmt(elapsed)}</span>
            </div>
            <div className="text-center">
              <div className="text-[10px] tracking-[0.35em] text-white/45 font-bold">שרשרת {index + 1}</div>
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
                    {current ? (
                      // The player types straight into the current pill, right after the
                      // known letters. The pill only grows with what was typed, so the
                      // word's length is never revealed.
                      <div onClick={() => inputRef.current?.focus()}
                        className={`min-w-[130px] px-5 h-12 rounded-2xl flex items-center justify-center cursor-text
                                    text-xl font-black tracking-wide transition-all ${shake ? 'shake' : ''}`}
                        style={styleObj}>
                        <span className="select-none">{prefix}</span>
                        <input ref={inputRef} value={guess} dir="rtl" aria-label="השלמת המילה"
                          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                          onChange={e => onType(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submit()}
                          style={{ width: `${Math.max(guess.length, 1) + 0.3}ch` }}
                          className="bg-transparent outline-none text-xl font-black text-white tracking-wide min-w-[0.6ch] p-0" />
                        {!guess && <span className="text-white/40 select-none">…</span>}
                      </div>
                    ) : (
                      <div className="min-w-[130px] px-5 h-12 rounded-2xl grid place-items-center
                                      text-xl font-black tracking-wide transition-all"
                        style={styleObj}>
                        {display}
                      </div>
                    )}
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
              {onNext && (
                <button onClick={onNext}
                  className="w-full mt-5 py-3.5 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
                  style={{ background: GRAD }}>
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
  );
}
