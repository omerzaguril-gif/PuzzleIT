// PUZZLIT — חידות ויזואליות, על בסיס מאגר 196 החידות (PUZZLIT_Visual_Puzzles.md).
// עיצוב: "הקלף הוא הכוכב" — לבן נקי, כחול #2E5BFF, Assistant, וגרדיאנט לכל שלב.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronLeft, Lightbulb, Mic, RotateCcw, Shuffle, Delete } from 'lucide-react';
import {
  PUZZLES, STAGES, stageOf, stageGradient, puzzlesInStage, dailyPuzzle,
  imageUrl, checkAnswer, normalize, xpFor,
} from './logic.js';
import { israelDate } from '../../lib/dates.js';
import { store } from '../../lib/store.js';
import { puzzlitToHub } from '../../lib/scoring.js';

const BLUE = '#2E5BFF';
const EMPTY = { solved: {}, xp: 0 };

export default function Puzzlit({ paused, onScore, setInProgress }) {
  const [progress, setProgress] = useState(null);
  const [view, setView] = useState({ name: 'home' });
  const today = useRef(israelDate()).current;
  const daily = dailyPuzzle(today);

  useEffect(() => {
    store.loadProgress('puzzlit').then(p => setProgress(p || EMPTY)).catch(() => setProgress(EMPTY));
  }, []);

  useEffect(() => { setInProgress(view.name === 'puzzle'); }, [view.name, setInProgress]);

  const solve = useCallback((puzzle, hintsUsed) => {
    const first = !progress.solved[puzzle.id];
    const xp = first ? xpFor(puzzle, hintsUsed) : 0;
    const hub = first ? puzzlitToHub({ stage: stageOf(puzzle), hintsUsed }) : 0;
    if (first) {
      const next = {
        ...progress,
        xp: progress.xp + xp,
        solved: { ...progress.solved, [puzzle.id]: { hints: hintsUsed, xp, at: new Date().toISOString() } },
      };
      setProgress(next);
      store.saveProgress('puzzlit', next).catch(() => {});
      onScore(hub, { puzzleId: puzzle.id, level: puzzle.level, hintsUsed });
    }
    setView(v => ({ ...v, name: 'solution', puzzle, hintsUsed, xp, hub, first }));
  }, [progress, onScore]);

  if (!progress) return <div className="text-center text-[#6B6B6B] pt-10">טוען…</div>;

  const openPuzzle = (puzzle, from) => setView({ name: 'puzzle', puzzle, from });

  return (
    <div dir="rtl" className="min-h-[calc(100vh-48px)] bg-white text-[#0A0A0A] px-4 py-5" style={{ fontFamily: "'Assistant', sans-serif" }}>
      <div className="max-w-[520px] mx-auto">
        {view.name === 'home' && (
          <Home progress={progress} daily={daily}
            onDaily={() => openPuzzle(daily, 'home')}
            onStage={n => setView({ name: 'stage', stage: n })} />
        )}
        {view.name === 'stage' && (
          <StageView stage={STAGES[view.stage - 1]} progress={progress}
            onBack={() => setView({ name: 'home' })}
            onPick={p => openPuzzle(p, 'stage')} />
        )}
        {view.name === 'puzzle' && (
          <PuzzleView key={view.puzzle.id} puzzle={view.puzzle} paused={paused}
            isDaily={view.puzzle.id === daily.id}
            alreadySolved={!!progress.solved[view.puzzle.id]}
            onBack={() => setView(view.from === 'stage' ? { name: 'stage', stage: stageOf(view.puzzle) } : { name: 'home' })}
            onSolve={solve} />
        )}
        {view.name === 'solution' && (
          <SolutionView {...view}
            onNext={() => {
              const list = puzzlesInStage(stageOf(view.puzzle));
              const next = list.find(p => p.num > view.puzzle.num && !progress.solved[p.id])
                || list.find(p => !progress.solved[p.id]);
              if (next && view.from === 'stage') openPuzzle(next, 'stage');
              else setView(view.from === 'stage' ? { name: 'stage', stage: stageOf(view.puzzle) } : { name: 'home' });
            }}
            nextLabel={view.from === 'stage' ? 'לחידה הבאה' : 'חזרה'} />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ home
function Home({ progress, daily, onDaily, onStage }) {
  const solvedCount = Object.keys(progress.solved).length;
  const dailySolved = !!progress.solved[daily.id];
  return (
    <>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-3xl font-black tracking-tight">PUZZLIT</div>
          <div className="text-sm text-[#6B6B6B]">{solvedCount} מתוך {PUZZLES.length} חידות נפתרו</div>
        </div>
        <div className="text-left">
          <div className="text-[11px] text-[#6B6B6B] font-semibold">XP</div>
          <div className="text-2xl font-black leading-none" style={{ color: BLUE }}>{progress.xp.toLocaleString('he-IL')}</div>
        </div>
      </div>

      <button onClick={onDaily}
        className="w-full flex items-center gap-4 p-3 rounded-3xl border-[1.5px] border-[#ECECEC] shadow-[0_4px_24px_rgba(0,0,0,0.06)] mb-6 text-right">
        <img src={imageUrl(daily)} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: BLUE }}>
            <Calendar className="w-4 h-4" /> חידת היום
          </div>
          <div className="text-lg font-bold">חידה #{daily.num}</div>
          <div className="text-sm text-[#6B6B6B]">{dailySolved ? 'פתרתם אותה ✓' : 'אותה חידה לכולם, היום בלבד'}</div>
        </div>
        <ChevronLeft className="w-5 h-5 text-[#6B6B6B]" />
      </button>

      <div className="text-sm font-bold text-[#6B6B6B] mb-2.5">שלבים</div>
      <div className="grid grid-cols-2 gap-3">
        {STAGES.map(s => {
          const list = puzzlesInStage(s.n);
          const done = list.filter(p => progress.solved[p.id]).length;
          return (
            <button key={s.n} onClick={() => onStage(s.n)}
              className="rounded-3xl p-4 text-right text-white shadow-md transition-transform hover:-translate-y-0.5"
              style={{ background: stageGradient(s) }}>
              <div className="text-xs font-bold opacity-80">שלב {s.n} · {s.theme}</div>
              <div className="text-xl font-black mb-3">{s.name}</div>
              <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${(done / list.length) * 100}%` }} />
              </div>
              <div className="text-xs font-bold mt-1.5 opacity-90">{done}/{list.length}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ stage
function StageView({ stage, progress, onBack, onPick }) {
  const list = puzzlesInStage(stage.n);
  return (
    <>
      <div className="rounded-3xl p-5 text-white mb-4" style={{ background: stageGradient(stage) }}>
        <button onClick={onBack} className="text-sm font-bold opacity-90 mb-1">→ כל השלבים</button>
        <div className="text-xs font-bold opacity-80">שלב {stage.n} · {stage.theme}</div>
        <div className="text-2xl font-black">{stage.name}</div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {list.map(p => {
          const solved = !!progress.solved[p.id];
          return (
            <button key={p.id} onClick={() => onPick(p)} className="relative aspect-square rounded-2xl overflow-hidden border border-[#ECECEC]">
              <img src={imageUrl(p)} alt="" loading="lazy" className={`w-full h-full object-cover ${solved ? 'opacity-45' : ''}`} />
              <span className="absolute top-1.5 right-1.5 text-[11px] font-bold bg-white/90 rounded-md px-1.5">#{p.num}</span>
              {solved && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="w-9 h-9 rounded-full grid place-items-center text-white" style={{ background: '#00A86B' }}>
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ puzzle
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PuzzleView({ puzzle, paused, isDaily, alreadySolved, onBack, onSolve }) {
  const stage = STAGES[stageOf(puzzle) - 1];
  const primary = puzzle.answer.primary;
  const wordLens = useMemo(() => primary.split(/\s+/).filter(Boolean).map(w => w.length), [primary]);
  const letters = useMemo(() => primary.replace(/\s+/g, '').split(''), [primary]);
  const [tiles, setTiles] = useState(() => shuffled(letters.map((ch, id) => ({ id, ch }))));
  const [placed, setPlaced] = useState(() => Array(letters.length).fill(null)); // tile id per slot
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState(null); // { text, tone }
  const [shake, setShake] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const used = new Set(placed.filter(v => v != null));
  const tileById = id => tiles.find(t => t.id === id);
  const full = placed.every(v => v != null);
  const hintKeys = Object.keys(puzzle.hints).sort();

  const tryAnswer = useCallback((text, source) => {
    const res = checkAnswer(text, puzzle);
    if (res.correct) { onSolve(puzzle, hintsUsed); return; }
    setShake(true);
    setTimeout(() => setShake(false), 350);
    if (source === 'voice') setFeedback({ text: `שמענו: "${text}". ${res.close ? 'כמעט!' : 'לא בדיוק, נסו שוב'}`, tone: res.close ? 'close' : 'bad' });
    else setFeedback({ text: res.close ? 'כמעט! נסו לסדר מחדש' : 'לא בדיוק, נסו שוב', tone: res.close ? 'close' : 'bad' });
  }, [puzzle, hintsUsed, onSolve]);

  const placeTile = useCallback(id => {
    setFeedback(null);
    setPlaced(p => {
      if (p.includes(id)) return p;
      const i = p.indexOf(null);
      if (i === -1) return p;
      const n = [...p];
      n[i] = id;
      return n;
    });
  }, []);

  const removeAt = i => { setFeedback(null); setPlaced(p => { const n = [...p]; n[i] = null; return n; }); };
  const backspace = useCallback(() => {
    setFeedback(null);
    setPlaced(p => {
      const last = p.map((v, i) => (v != null ? i : -1)).filter(i => i >= 0).pop();
      if (last == null) return p;
      const n = [...p];
      n[last] = null;
      return n;
    });
  }, []);

  // When the last slot fills, check the answer.
  useEffect(() => {
    if (full) tryAnswer(placed.map(id => tileById(id).ch).join(''), 'tiles');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  // Physical keyboard: a Hebrew letter picks a matching unused tile.
  useEffect(() => {
    if (paused) return;
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
      if (!/^[א-ת]$/.test(e.key)) return;
      const k = normalize(e.key);
      setPlaced(p => {
        const inUse = new Set(p.filter(v => v != null));
        const tile = tiles.find(t => !inUse.has(t.id) && normalize(t.ch) === k);
        const i = p.indexOf(null);
        if (!tile || i === -1) return p;
        const n = [...p];
        n[i] = tile.id;
        return n;
      });
      setFeedback(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, tiles, backspace]);

  const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const listen = () => {
    if (!SpeechRec || listening) return;
    const rec = new SpeechRec();
    rec.lang = 'he-IL';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = e => {
      const alts = Array.from(e.results[0]).map(a => a.transcript);
      const hit = alts.find(a => checkAnswer(a, puzzle).correct);
      tryAnswer(hit || alts[0], 'voice');
    };
    rec.onerror = () => setFeedback({ text: 'לא הצלחנו לשמוע. נסו שוב', tone: 'bad' });
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };
  useEffect(() => () => recRef.current?.abort?.(), []);

  // Slot index offsets per word.
  let offset = 0;
  const words = wordLens.map(len => { const start = offset; offset += len; return { start, len }; });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-sm font-bold text-[#6B6B6B]">→ חזרה</button>
        <div className="text-sm font-bold px-3 py-1 rounded-full text-white" style={{ background: stageGradient(stage) }}>
          {isDaily ? 'חידת היום · ' : ''}שלב {stage.n} · #{puzzle.num}
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[min(90vw,440px)] aspect-square rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.08)] mb-4 ${shake ? 'hub-shake' : ''}`}>
        <img src={imageUrl(puzzle)} alt="חידה ויזואלית" className="w-full h-full object-cover" />
      </div>

      {hintsUsed > 0 && (
        <div className="space-y-1.5 mb-3">
          {hintKeys.slice(0, hintsUsed).map(k => (
            <div key={k} className="flex gap-2 items-start text-[15px] bg-[#F3F6FF] rounded-2xl px-3 py-2 hub-pop">
              <Lightbulb className="w-4 h-4 mt-1 shrink-0" style={{ color: BLUE }} />
              <span>{puzzle.hints[k]}</span>
            </div>
          ))}
        </div>
      )}

      {/* answer slots, grouped by word */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        {words.map((w, wi) => (
          <div key={wi} className="flex gap-1">
            {Array.from({ length: w.len }, (_, j) => {
              const i = w.start + j;
              const id = placed[i];
              return (
                <button key={i} onClick={() => id != null && removeAt(i)}
                  className="w-9 h-11 rounded-xl text-xl font-bold grid place-items-center border-2"
                  style={id != null
                    ? { borderColor: BLUE, background: '#F3F6FF' }
                    : { borderColor: '#E2E2E2', background: '#FAFAF7' }}>
                  {id != null ? tileById(id).ch : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={`text-center text-sm font-bold min-h-5 mb-2 ${feedback?.tone === 'close' ? 'text-[#E08A00]' : 'text-[#E63946]'}`}>
        {feedback?.text || ''}
      </div>

      {/* letter bank */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-4">
        {tiles.map(t => (
          <button key={t.id} onClick={() => placeTile(t.id)} disabled={used.has(t.id)}
            className="w-10 h-11 rounded-xl text-xl font-bold bg-white border-[1.5px] border-[#E2E2E2] shadow-sm transition-opacity disabled:opacity-20 active:scale-95">
            {t.ch}
          </button>
        ))}
      </div>

      <div className="flex gap-2 justify-center mb-3">
        <ToolBtn onClick={backspace} label="מחיקה"><Delete className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => { setPlaced(Array(letters.length).fill(null)); setFeedback(null); }} label="ניקוי"><RotateCcw className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => setTiles(t => shuffled(t))} label="ערבוב"><Shuffle className="w-4 h-4" /></ToolBtn>
        {SpeechRec && (
          <ToolBtn onClick={listen} label={listening ? 'מקשיב…' : 'בקול'} active={listening}><Mic className="w-4 h-4" /></ToolBtn>
        )}
      </div>

      <button onClick={() => setHintsUsed(h => Math.min(h + 1, hintKeys.length))} disabled={hintsUsed >= hintKeys.length}
        className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border-[1.5px] disabled:opacity-40"
        style={{ borderColor: BLUE, color: BLUE }}>
        <Lightbulb className="w-5 h-5" />
        {hintsUsed >= hintKeys.length ? 'אין עוד רמזים' : `רמז ${hintsUsed + 1} מתוך ${hintKeys.length} (−20%)`}
      </button>
      <div className="text-center text-xs text-[#6B6B6B] mt-2">
        {alreadySolved ? 'כבר פתרתם את החידה הזו, אין נקודות נוספות' : `שווה ${xpFor(puzzle, hintsUsed)} XP`}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, label, children, active }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-[1.5px]"
      style={active ? { borderColor: BLUE, color: BLUE, background: '#F3F6FF' } : { borderColor: '#E2E2E2', color: '#444' }}>
      {children}{label}
    </button>
  );
}

// ------------------------------------------------------------------ solution
function SolutionView({ puzzle, hintsUsed, xp, hub, first, onNext, nextLabel }) {
  const stage = STAGES[stageOf(puzzle) - 1];
  return (
    <div className="text-center">
      <img src={imageUrl(puzzle)} alt="" className="w-40 h-40 mx-auto rounded-3xl object-cover shadow-md mb-4 hub-pop" />
      <div className="text-sm font-bold mb-1" style={{ color: '#00A86B' }}>✓ נכון!</div>
      <div className="text-3xl font-black mb-5 leading-tight">{puzzle.explanation.finalPhrase}</div>

      <ol className="text-right space-y-2 mb-6">
        {puzzle.explanation.steps.map((s, i) => (
          <li key={i} className="flex gap-3 bg-[#FAFAF7] rounded-2xl px-4 py-3 hub-fade-up" style={{ animationDelay: `${0.3 + i * 0.4}s` }}>
            <span className="w-6 h-6 shrink-0 rounded-full text-white text-sm font-bold grid place-items-center" style={{ background: stageGradient(stage) }}>{i + 1}</span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>

      {first ? (
        <div className="text-lg font-black mb-5" style={{ color: BLUE }}>
          +{xp} XP{hintsUsed > 0 && <span className="text-sm text-[#6B6B6B] font-semibold"> · {hintsUsed} רמזים</span>}
          <div className="text-sm font-semibold text-[#6B6B6B]">+{hub} לניקוד הכולל</div>
        </div>
      ) : (
        <div className="text-sm text-[#6B6B6B] mb-5">החידה כבר נפתרה בעבר</div>
      )}

      <button onClick={onNext} className="w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2" style={{ background: BLUE }}>
        {nextLabel} <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}
