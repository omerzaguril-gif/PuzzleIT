// פיצוח מילים — גרסת React של games/word-crack/word-crack-solo.html.
// החוקים, הניקוד, הטיימר ובדיקת התשובה זהים למקור. מה שעבר ל-Hub:
// התפריט הראשי, מסך ההסבר, כפתור היציאה + modal האישור (GameShell), ומסך הניהול (Admin).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './wordcrack.css';
import { getEffectiveWords } from './wordbank.js';
import { wordCrackToHub } from '../../lib/scoring.js';

const MAX_CLUES = 5;
const ROUND_SECONDS = 120;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str) {
  return str.trim().replace(/[֑-ׇ]/g, '').replace(/["'׳״]/g, '');
}

function autoPluralVariants(word) {
  const v = [];
  if (word.endsWith('ה')) v.push(word.slice(0, -1) + 'ות');
  v.push(word + 'ים');
  v.push(word + 'ות');
  return v;
}

function isCorrectGuess(current, val) {
  const normVal = normalize(val);
  const target = normalize(current.word);
  if (normVal === target) return true;
  if (current.accepts.some(a => normalize(a) === normVal)) return true;
  if (autoPluralVariants(current.word).some(v => normalize(v) === normVal)) return true;
  return false;
}

function pointsForClueCount(cluesShown) {
  // 1 clue -> 5 pts, 2 -> 4, 3 -> 3, 4 -> 2, 5 -> 1
  return Math.max(1, (MAX_CLUES + 1) - cluesShown);
}

const fmtTime = t => {
  const m = Math.floor(Math.max(t, 0) / 60);
  const s = Math.max(t, 0) % 60;
  return m + ':' + String(s).padStart(2, '0');
};

export default function WordCrack({ paused, onExit, onScore, setInProgress }) {
  const [phase, setPhase] = useState('play'); // play | end
  const [current, setCurrent] = useState(null);
  const [clueIndex, setClueIndex] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundLocked, setRoundLocked] = useState(false); // the brief solved-word reveal pause
  const [solvedWord, setSolvedWord] = useState(null);
  const [feedback, setFeedback] = useState({ text: ' ', correct: false });
  const [guess, setGuess] = useState('');
  const [wrongAnim, setWrongAnim] = useState(false);
  const [history, setHistory] = useState([]);

  const poolRef = useRef([]);
  const recordedRef = useRef(true); // true when there's no in-progress word to record
  const inputRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = { current, clueIndex, wrongGuesses, score };

  const recordCurrentWord = useCallback((solved, pts) => {
    const { current: cur, clueIndex: ci, wrongGuesses: wg } = stateRef.current;
    if (!cur || recordedRef.current) return;
    recordedRef.current = true;
    setHistory(h => [...h, {
      word: cur.word,
      solved,
      guesses: [...wg],
      cluesUsed: ci + 1,
      cluesShown: cur.clues.slice(0, ci + 1),
      points: pts || 0,
    }]);
  }, []);

  const nextWord = useCallback(() => {
    if (poolRef.current.length === 0) poolRef.current = shuffle(getEffectiveWords());
    setCurrent(poolRef.current.pop());
    setClueIndex(0);
    setWrongGuesses([]);
    recordedRef.current = false;
    setGuess('');
    setFeedback({ text: ' ', correct: false });
    setSolvedWord(null);
  }, []);

  const startGame = useCallback(() => {
    poolRef.current = shuffle(getEffectiveWords());
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setHistory([]);
    setRoundLocked(false);
    setPhase('play');
    nextWord();
  }, [nextWord]);

  useEffect(() => { startGame(); }, [startGame]);
  useEffect(() => { setInProgress(phase === 'play'); }, [phase, setInProgress]);

  const endGame = useCallback(() => {
    recordCurrentWord(false, 0);
    setPhase('end');
    const pts = stateRef.current.score;
    onScore(wordCrackToHub({ points: pts }), { rawPoints: pts });
  }, [onScore, recordCurrentWord]);

  // Timer: 1s ticks, stopped while paused (help / exit modal) and during the solved-word reveal.
  const running = phase === 'play' && !paused && !roundLocked;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (phase === 'play' && !roundLocked && timeLeft <= 0) {
      setTimeLeft(0);
      endGame();
    }
  }, [timeLeft, phase, roundLocked, endGame]);

  useEffect(() => {
    if (phase === 'play' && !paused && !roundLocked) inputRef.current?.focus();
  }, [phase, paused, roundLocked, current]);

  function skipWord() {
    if (phase !== 'play' || paused || roundLocked || timeLeft <= 0) return;
    recordCurrentWord(false, 0);
    nextWord();
  }

  function tryGuess() {
    if (phase !== 'play' || paused || roundLocked) return;
    const rawVal = guess;
    const val = normalize(rawVal);
    if (!val) return;

    if (isCorrectGuess(current, val)) {
      const cluesShown = clueIndex + 1;
      const pts = pointsForClueCount(cluesShown);
      setScore(s => s + pts);
      stateRef.current.score += pts;
      setFeedback({ text: '‎+' + pts + ' נקודות (עם ' + cluesShown + ' רמזים)', correct: true });
      recordCurrentWord(true, pts);

      setRoundLocked(true);
      setSolvedWord(current.word);
      setGuess('');
      setTimeout(() => {
        // The timer is stopped during the reveal, so time is still left: next word, timer resumes.
        setRoundLocked(false);
        nextWord();
      }, 500);
      return;
    }

    if (rawVal.trim()) setWrongGuesses(w => [...w, rawVal.trim()]);
    setFeedback({ text: 'לא זה — הנה רמז נוסף', correct: false });
    setWrongAnim(true);
    setTimeout(() => setWrongAnim(false), 300);
    if (clueIndex < MAX_CLUES - 1) setClueIndex(c => c + 1);
    setGuess('');
  }

  if (phase === 'end') {
    return (
      <div className="wc">
        <div className="wrap">
          <div className="overlay">
            <h2>🎉 הזמן נגמר!</h2>
            <div className="score-num">{score}</div>
            <p>נקודות שאספת · +{wordCrackToHub({ points: score })} לניקוד הכולל</p>
            <button onClick={startGame}>שחקו שוב</button>
            <button className="secondary-btn" onClick={onExit}>לתפריט הראשי</button>
            <div className="report">
              {history.length === 0 ? (
                <div className="report-empty">לא הספקת להתחיל אף חידה הפעם</div>
              ) : history.map((item, i) => (
                <div className="report-item" key={i}>
                  <div className="report-head">
                    <span className={'report-icon ' + (item.solved ? 'solved' : 'unsolved')}>{item.solved ? '✓' : '✗'}</span>
                    <span>{item.word}</span>
                    {item.solved && <span className="report-pts">+{item.points} נק׳</span>}
                  </div>
                  <div className="report-detail">
                    ניחושים שלך: {item.guesses.length ? item.guesses.join(', ') : 'ללא ניחושים שגויים'}
                    <br />הרמזים שקיבלת: {item.cluesShown.join(', ')}
                    {!item.solved && <><br />התשובה הנכונה: <b>{item.word}</b></>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return <div className="wc" />;

  return (
    <div className="wc">
      <div className="wrap">
        <div className="tagline">כמה מילים תצליחו לפצח בשתי דקות?</div>
        <div className="hud">
          <div className={'stat' + (timeLeft <= 20 ? ' low' : '')} id="timer">
            <div className="num">{fmtTime(timeLeft)}</div>
            <div className="label">זמן נותר</div>
          </div>
          <div className="stat">
            <div className="num">{score}</div>
            <div className="label">נקודות</div>
          </div>
        </div>

        <div className="card">
          <div className="clue-label">
            <span>הרמזים שלך</span>
            <span className="clue-count">רמז {clueIndex + 1} מתוך {MAX_CLUES}</span>
          </div>
          <div className="clues">
            {solvedWord ? (
              <div className="solved-reveal">✓ {solvedWord}</div>
            ) : current.clues.slice(0, clueIndex + 1).map((c, i) => (
              <div key={i} className={'clue-word' + (i > 0 ? ' secondary' : '')}>{c}</div>
            ))}
          </div>

          <input ref={inputRef} type="text" id="guess" placeholder="הקלידו ניחוש..." autoComplete="off"
            className={wrongAnim ? 'wrong' : ''} value={guess} disabled={roundLocked}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') tryGuess(); }} />
          <div className="action-row">
            <button id="guessBtn" onClick={tryGuess}>נחש!</button>
            <button className="skip-btn" onClick={skipWord}>דלג ⏭</button>
          </div>
          <div className={'feedback' + (feedback.correct ? ' correct' : '')}>{feedback.text}</div>

          <div className="wrong-guesses">
            <div className="wg-label">ניחושים קודמים למילה הזו:</div>
            <div className="wg-list">
              {wrongGuesses.map((w, i) => <span key={i} className="wg-chip">{w}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
