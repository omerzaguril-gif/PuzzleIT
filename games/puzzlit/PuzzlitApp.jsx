import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Flame, Lightbulb, X, Upload, ChevronLeft, ChevronRight, RotateCcw, Check, Sparkles, Calendar, User, Layers } from 'lucide-react';

// ============================================================
// SEED PUZZLES
// ============================================================
const SEED_PUZZLES = [
  {
    id: 'p_001',
    level: 1,
    mechanisms: ['negation', 'spatial'],
    category: 'proverb',
    categoryLabel: 'פתגם',
    categoryVisible: true,
    answer: {
      primary: 'אין חדש תחת השמש',
      accepted: ['אין חדש תחת השמש'],
      fuzzyTolerance: 2,
    },
    hints: {
      1: 'יש שלילה — שים לב ל-X האדום',
      2: 'הביטוי הוא פתגם עתיק ממגילת קהלת',
      3: 'הביטוי מתחיל ב-"אין חדש..."',
    },
    maxHints: 3,
    explanation: {
      steps: [
        'השמש בחלק העליון של הקלף מסמלת "תחת השמש"',
        'ה-X האדום על המילה NEW פירושו "אין חדש"',
        'צירוף השניים: "אין חדש תחת השמש"',
      ],
      finalPhrase: 'אין חדש תחת השמש',
    },
    basePoints: 100,
  },
  {
    id: 'p_002',
    level: 2,
    mechanisms: ['repetition', 'digit_in_text'],
    category: 'proverb',
    categoryLabel: 'פתגם',
    categoryVisible: true,
    answer: {
      primary: 'טובים השניים מן האחד',
      accepted: ['טובים השניים מן האחד', 'טובים השנים מן האחד'],
      fuzzyTolerance: 2,
    },
    hints: {
      1: 'שים לב לחזרה — משהו שמופיע פעמיים מייצג את המספר "שניים"',
      2: 'הספרה שמופיעה בקלף מחליפה מילה שנשמעת דומה',
    },
    maxHints: 2,
    explanation: {
      steps: [
        'המילה "טובים" מופיעה פעמיים → "טובים השניים"',
        'ה-מ ביחד עם הספרה 1 = "מאחד" (= "מן האחד")',
        'צירוף: "טובים השניים מן האחד"',
      ],
      finalPhrase: 'טובים השניים מן האחד',
    },
    basePoints: 200,
  },
  {
    id: 'p_003',
    level: 2,
    mechanisms: ['anagram'],
    category: 'place',
    categoryLabel: 'שם מקום',
    categoryVisible: true,
    answer: {
      primary: 'אוסטרליה',
      accepted: ['אוסטרליה'],
      fuzzyTolerance: 1,
    },
    hints: {
      1: 'זו יבשת',
      2: 'מתחילה באות "א"',
    },
    maxHints: 2,
    explanation: {
      steps: [
        'האותיות המפוזרות הן: ר, ה, ל, א, ט, ו, י, ס',
        'סידור מחדש לפי הסדר הנכון: א, ו, ס, ט, ר, ל, י, ה',
        'התשובה: אוסטרליה',
      ],
      finalPhrase: 'אוסטרליה',
    },
    basePoints: 200,
  },
  {
    id: 'p_004',
    level: 2,
    mechanisms: ['spatial'],
    category: 'proverb',
    categoryLabel: 'ביטוי מקראי',
    categoryVisible: true,
    answer: {
      primary: 'עין תחת עין',
      accepted: ['עין תחת עין'],
      fuzzyTolerance: 1,
    },
    hints: {
      1: 'המיקום של הרכיבים הוא הרמז — מי נמצא מתחת למי?',
      2: 'הביטוי מגיע מספר שמות',
    },
    maxHints: 2,
    explanation: {
      steps: [
        'שני איורי עיניים בקלף',
        'העין התחתונה נמצאת תחת (מתחת) לעין העליונה',
        'קריאה ישירה של המיקום: "עין תחת עין"',
      ],
      finalPhrase: 'עין תחת עין',
    },
    basePoints: 200,
  },
  {
    id: 'p_005',
    level: 4,
    mechanisms: ['negation', 'embedding'],
    category: 'slang',
    categoryLabel: null,
    categoryVisible: false,
    answer: {
      primary: 'סבבה',
      accepted: ['סבבה'],
      fuzzyTolerance: 1,
    },
    hints: {
      1: 'החטיף הכתום הוא במבה. מה קורה כשמורידים את האות המסומנת?',
    },
    maxHints: 1,
    explanation: {
      steps: [
        'ה-ס בצד ימין + במבה (החטיף הכתום)',
        'ה-X האדום על ה-מ מסמן להסיר אותה: במבה → בבה',
        'ס + בבה = סבבה',
      ],
      finalPhrase: 'סבבה',
    },
    basePoints: 700,
  },
];

// ============================================================
// UTILITIES
// ============================================================
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')      // remove niqqud
    .replace(/[.,!?"'׳״\-–—()]/g, '')      // remove punctuation
    .replace(/\s+/g, '');                  // remove all whitespace
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function checkAnswer(userAnswer, puzzle) {
  if (!userAnswer.trim()) return 'empty';
  const n = normalize(userAnswer);
  const accepted = puzzle.answer.accepted.map(normalize);
  if (accepted.includes(n)) return 'correct';
  const distances = accepted.map(a => levenshtein(n, a));
  const min = Math.min(...distances);
  if (min <= puzzle.answer.fuzzyTolerance) return 'correct';
  if (min <= puzzle.answer.fuzzyTolerance + 2) return 'close';
  return 'wrong';
}

function calculateScore(puzzle, hintsUsed) {
  const base = puzzle.basePoints;
  const hintPenalty = Math.pow(0.8, hintsUsed);
  return Math.round(base * hintPenalty);
}

// ============================================================
// PUZZLE CARDS - SVG renderers
// ============================================================
const CARD_RENDERERS = {
  p_001: () => (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <g>
        <circle cx="200" cy="105" r="35" fill="#FCD34D" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * Math.PI / 180;
          const x1 = 200 + Math.cos(angle) * 45;
          const y1 = 105 + Math.sin(angle) * 45;
          const x2 = 200 + Math.cos(angle) * 65;
          const y2 = 105 + Math.sin(angle) * 65;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />;
        })}
      </g>
      <text x="200" y="275" fontSize="72" fontWeight="900" textAnchor="middle" fill="#0A0A0A" letterSpacing="4">NEW</text>
      <g stroke="#E63946" strokeWidth="10" strokeLinecap="round">
        <line x1="125" y1="225" x2="275" y2="290" />
        <line x1="275" y1="225" x2="125" y2="290" />
      </g>
    </svg>
  ),

  p_002: () => (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <g>
        <rect x="55" y="100" width="130" height="80" rx="12" fill="#F5F5F0" stroke="#0A0A0A" strokeWidth="2" />
        <text x="120" y="153" fontSize="36" fontWeight="700" textAnchor="middle" fill="#0A0A0A">טובים</text>
        <rect x="215" y="100" width="130" height="80" rx="12" fill="#F5F5F0" stroke="#0A0A0A" strokeWidth="2" />
        <text x="280" y="153" fontSize="36" fontWeight="700" textAnchor="middle" fill="#0A0A0A">טובים</text>
      </g>
      <line x1="140" y1="240" x2="260" y2="240" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
      <text x="240" y="335" fontSize="64" fontWeight="800" textAnchor="middle" fill="#0A0A0A">מ</text>
      <text x="160" y="335" fontSize="64" fontWeight="800" textAnchor="middle" fill="#2E5BFF">1</text>
    </svg>
  ),

  p_003: () => {
    const letters = [
      { letter: 'ר', x: 60, y: 135, rot: -5 },
      { letter: 'ה', x: 135, y: 118, rot: 3 },
      { letter: 'ל', x: 210, y: 140, rot: -2 },
      { letter: 'א', x: 285, y: 120, rot: 4 },
      { letter: 'ט', x: 350, y: 150, rot: -3 },
      { letter: 'ו', x: 95, y: 260, rot: 2 },
      { letter: 'י', x: 200, y: 275, rot: -4 },
      { letter: 'ס', x: 305, y: 265, rot: 3 },
    ];
    return (
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <text x="200" y="55" fontSize="18" fontWeight="500" textAnchor="middle" fill="#6B6B6B">אנגרם — סדר את האותיות</text>
        {letters.map((t, i) => (
          <g key={i} transform={`rotate(${t.rot} ${t.x} ${t.y})`}>
            <rect x={t.x - 25} y={t.y - 30} width="50" height="60" rx="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
            <text x={t.x} y={t.y + 12} fontSize="34" fontWeight="700" textAnchor="middle" fill="#0A0A0A">{t.letter}</text>
          </g>
        ))}
      </svg>
    );
  },

  p_004: () => (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {/* Top eye */}
      <g transform="translate(200, 135)">
        <ellipse cx="0" cy="0" rx="65" ry="32" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="4" />
        <circle cx="0" cy="0" r="20" fill="#0A0A0A" />
        <circle cx="7" cy="-7" r="6" fill="#FFFFFF" />
      </g>
      {/* Bottom eye */}
      <g transform="translate(200, 275)">
        <ellipse cx="0" cy="0" rx="65" ry="32" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="4" />
        <circle cx="0" cy="0" r="20" fill="#0A0A0A" />
        <circle cx="7" cy="-7" r="6" fill="#FFFFFF" />
      </g>
    </svg>
  ),

  p_005: () => {
    const bambaLetters = [
      { letter: 'ב', x: 250, hasX: false },
      { letter: 'מ', x: 190, hasX: true },
      { letter: 'ב', x: 130, hasX: false },
      { letter: 'ה', x: 70, hasX: false },
    ];
    return (
      <svg viewBox="0 0 400 400" className="w-full h-full">
        {/* ס on the right */}
        <g>
          <rect x="315" y="175" width="60" height="70" rx="10" fill="#F5F5F0" stroke="#0A0A0A" strokeWidth="2" />
          <text x="345" y="228" fontSize="42" fontWeight="800" textAnchor="middle" fill="#0A0A0A">ס</text>
        </g>
        {/* + */}
        <text x="290" y="222" fontSize="36" fontWeight="700" textAnchor="middle" fill="#6B6B6B">+</text>
        {/* במבה */}
        {bambaLetters.map((t, i) => (
          <g key={i}>
            <rect x={t.x - 22} y="175" width="44" height="70" rx="8" fill="#F97316" />
            <text x={t.x} y="228" fontSize="34" fontWeight="800" textAnchor="middle" fill="#FFFFFF">{t.letter}</text>
            {t.hasX && (
              <g stroke="#E63946" strokeWidth="6" strokeLinecap="round">
                <line x1={t.x - 18} y1="185" x2={t.x + 18} y2="235" />
                <line x1={t.x + 18} y1="185" x2={t.x - 18} y2="235" />
              </g>
            )}
          </g>
        ))}
      </svg>
    );
  },
};

function PlaceholderCard({ puzzle }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex flex-col items-center justify-center p-8">
      <Layers className="w-16 h-16 text-gray-400 mb-3" />
      <div className="text-gray-500 font-semibold text-base mb-1 text-center">קלף ויזואלי טרם הועלה</div>
      <div className="text-gray-400 text-sm">מזהה: {puzzle.id}</div>
      {puzzle.categoryLabel && (
        <div className="mt-3 px-3 py-1 bg-white rounded-full text-xs text-gray-600 font-medium">
          {puzzle.categoryLabel}
        </div>
      )}
    </div>
  );
}

function PuzzleCardDisplay({ puzzle, size = 'large' }) {
  const Renderer = CARD_RENDERERS[puzzle.id];
  const maxWidth = size === 'small' ? 'max-w-[220px]' : 'max-w-md';
  return (
    <div className={`bg-white rounded-3xl shadow-lg p-6 aspect-square w-full ${maxWidth} mx-auto`}>
      {Renderer ? <Renderer /> : <PlaceholderCard puzzle={puzzle} />}
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function BackHeader({ title, subtitle, onBack }) {
  return (
    <div className="mb-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
        <ChevronRight className="w-5 h-5" />
        <span className="text-sm font-medium">חזרה</span>
      </button>
      <h1 className="text-3xl font-black text-[#0A0A0A]">{title}</h1>
      {subtitle && <p className="text-[#6B6B6B] mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}

function LevelDots({ level }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-[#0A0A0A]' : 'bg-[#E5E5E0]'}`} />
      ))}
    </div>
  );
}

// ============================================================
// SCREENS
// ============================================================
function HomeScreen({ onNavigate, playerState, totalPuzzles }) {
  const solvedCount = playerState.solvedPuzzles.length;
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black tracking-tight text-[#0A0A0A]">PUZZLIT</h1>
          {playerState.streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-600">{playerState.streak}</span>
            </div>
          )}
        </div>

        <p className="text-lg text-[#6B6B6B] mb-8 leading-relaxed">
          חידות ויזואליות. חשיבה מחוץ לקופסה.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onNavigate('campaign')}
            className="w-full bg-white rounded-2xl p-5 text-right shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-[#2E5BFF]/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-[#0A0A0A] mb-1">קמפיין</div>
                <div className="text-sm text-[#6B6B6B]">{solvedCount}/{totalPuzzles} חידות נפתרו</div>
              </div>
              <div className="bg-[#2E5BFF]/10 rounded-full p-3">
                <Sparkles className="w-6 h-6 text-[#2E5BFF]" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('daily')}
            className="w-full bg-white rounded-2xl p-5 text-right shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-[#00A86B]/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-[#0A0A0A] mb-1">חידה יומית</div>
                <div className="text-sm text-[#6B6B6B]">חידה חדשה בכל יום</div>
              </div>
              <div className="bg-[#00A86B]/10 rounded-full p-3">
                <Calendar className="w-6 h-6 text-[#00A86B]" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="w-full bg-white rounded-2xl p-5 text-right shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-[#0A0A0A] mb-1">פרופיל</div>
                <div className="text-sm text-[#6B6B6B]">{playerState.totalXp.toLocaleString()} XP</div>
              </div>
              <div className="bg-orange-500/10 rounded-full p-3">
                <User className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-[#6B6B6B]">
          פרוטוטייפ • ההתקדמות לא נשמרת בין רענונים
        </div>
      </div>
    </div>
  );
}

function CampaignScreen({ puzzles, playerState, onSelectPuzzle, onBack }) {
  const solvedSet = new Set(playerState.solvedPuzzles);
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <BackHeader title="עולם ראשון" subtitle="חידות פתיחה" onBack={onBack} />

        <div className="space-y-3">
          {puzzles.map((p, idx) => {
            const solved = solvedSet.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onSelectPuzzle(p.id)}
                className={`w-full rounded-2xl p-4 text-right shadow-sm hover:shadow-md transition-all border-2 flex items-center justify-between ${
                  solved ? 'bg-[#F5F5F0] border-[#00A86B]/30' : 'bg-white border-transparent'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-medium text-[#6B6B6B]">חידה {idx + 1}</span>
                    <LevelDots level={p.level} />
                  </div>
                  <div className="font-bold text-[#0A0A0A]">
                    {p.categoryVisible ? p.categoryLabel : 'קטגוריה נסתרת'}
                  </div>
                </div>
                {solved ? (
                  <div className="bg-[#00A86B] rounded-full p-2">
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <ChevronLeft className="w-6 h-6 text-[#6B6B6B]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PuzzleScreen({ puzzle, onSolve, onBack, isDaily }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setUserAnswer('');
    setHintsUsed(0);
    setFeedback(null);
  }, [puzzle.id]);

  function handleSubmit() {
    const result = checkAnswer(userAnswer, puzzle);
    if (result === 'empty') return;
    if (result === 'correct') {
      onSolve(puzzle.id, hintsUsed);
    } else if (result === 'close') {
      setFeedback('close');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else {
      setFeedback('wrong');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }

  function useHint() {
    if (hintsUsed < puzzle.maxHints) {
      setHintsUsed(hintsUsed + 1);
    }
  }

  const currentHint = hintsUsed > 0 ? puzzle.hints[hintsUsed] : null;
  const hintsRemaining = puzzle.maxHints - hintsUsed;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-6">
      <div className="w-full max-w-md">
        <BackHeader
          title={isDaily ? 'חידה יומית' : (puzzle.categoryVisible ? puzzle.categoryLabel : 'חידה')}
          subtitle={!isDaily ? `רמת קושי ${puzzle.level}` : null}
          onBack={onBack}
        />

        <div className={`mb-5 ${isShaking ? 'animate-shake' : ''}`}>
          <PuzzleCardDisplay puzzle={puzzle} />
        </div>

        {currentHint && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-900 text-sm leading-relaxed">{currentHint}</div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => { setUserAnswer(e.target.value); setFeedback(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="הקלד את התשובה ולחץ 'בדוק'..."
              dir="rtl"
              className={`w-full px-5 py-4 text-lg bg-white border-2 rounded-2xl focus:outline-none transition-colors ${
                feedback === 'wrong' ? 'border-red-300' :
                feedback === 'close' ? 'border-yellow-300' :
                'border-gray-200 focus:border-[#2E5BFF]'
              }`}
            />
            {feedback === 'close' && (
              <div className="mt-2 text-sm text-yellow-700 flex items-center gap-1">
                🎯 כמעט! נסה שוב
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <X className="w-4 h-4" /> לא נכון, נסה שוב
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="flex-1 bg-[#2E5BFF] text-white font-bold py-4 rounded-2xl hover:bg-[#1E4BEF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" strokeWidth={3} />
              <span>בדוק תשובה</span>
            </button>
            {hintsRemaining > 0 && (
              <button
                type="button"
                onClick={useHint}
                className="px-5 py-4 bg-yellow-100 text-yellow-800 font-medium rounded-2xl hover:bg-yellow-200 transition-colors flex items-center gap-2"
                title="כל רמז מפחית 20% מהניקוד"
              >
                <Lightbulb className="w-5 h-5" />
                <span>רמז ({hintsRemaining})</span>
              </button>
            )}
          </div>
        </div>

        {hintsUsed > 0 && (
          <div className="mt-4 text-center text-xs text-[#6B6B6B]">
            השתמשת ב-{hintsUsed} רמזים • {Math.round(Math.pow(0.8, hintsUsed) * 100)}% מהניקוד
          </div>
        )}
      </div>
    </div>
  );
}

function SolutionScreen({ puzzle, hintsUsed, onNext, onHome, isDaily }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const score = calculateScore(puzzle, hintsUsed);

  useEffect(() => {
    setVisibleSteps(0);
    const totalSteps = puzzle.explanation.steps.length;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setVisibleSteps(current);
      if (current >= totalSteps) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [puzzle.id]);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-[#00A86B] rounded-full p-4 mb-3">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
          <div className="text-2xl font-black text-[#0A0A0A] mb-1">כל הכבוד!</div>
          <div className="text-3xl font-black text-[#00A86B]">+{score} XP</div>
        </div>

        <div className="mb-5">
          <PuzzleCardDisplay puzzle={puzzle} size="small" />
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-md text-center">
          <div className="text-xs text-[#6B6B6B] mb-1 uppercase tracking-wider">התשובה</div>
          <div className="text-2xl font-black text-[#0A0A0A]">{puzzle.explanation.finalPhrase}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-6 shadow-md">
          <div className="text-xs font-bold text-[#6B6B6B] mb-3 uppercase tracking-wider">הסבר הפתרון</div>
          <div className="space-y-3">
            {puzzle.explanation.steps.map((step, i) => (
              <div
                key={i}
                className="flex gap-3 transition-all duration-500"
                style={{
                  opacity: i < visibleSteps ? 1 : 0,
                  transform: i < visibleSteps ? 'translateY(0)' : 'translateY(8px)',
                }}
              >
                <div className="flex-shrink-0 w-7 h-7 bg-[#2E5BFF]/10 text-[#2E5BFF] rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="text-[#0A0A0A] leading-relaxed pt-0.5 text-sm">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="px-6 py-4 bg-white text-[#0A0A0A] font-bold rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-colors"
          >
            בית
          </button>
          {!isDaily && (
            <button
              onClick={onNext}
              className="flex-1 bg-[#2E5BFF] text-white font-bold py-4 rounded-2xl hover:bg-[#1E4BEF] transition-colors flex items-center justify-center gap-2"
            >
              <span>חידה הבאה</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {isDaily && (
            <button
              onClick={onHome}
              className="flex-1 bg-[#2E5BFF] text-white font-bold py-4 rounded-2xl hover:bg-[#1E4BEF] transition-colors"
            >
              סיום
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ playerState, totalPuzzles, onBack, onImport, onReset }) {
  const [importFeedback, setImportFeedback] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        const puzzles = Array.isArray(data) ? data : data.puzzles || [];
        const valid = puzzles.filter(p => p.id && p.answer && p.answer.primary && p.answer.accepted);
        if (valid.length === 0) {
          setImportFeedback({ type: 'error', text: 'לא נמצאו חידות תקינות בקובץ' });
          return;
        }
        onImport(valid);
        setImportFeedback({ type: 'success', text: `יובאו ${valid.length} חידות בהצלחה 🎉` });
      } catch (err) {
        setImportFeedback({ type: 'error', text: 'שגיאה בקריאת הקובץ — ודא שזה JSON תקין' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const solvedCount = playerState.solvedPuzzles.length;
  const completionPercent = totalPuzzles > 0 ? Math.round((solvedCount / totalPuzzles) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <BackHeader title="הפרופיל שלי" onBack={onBack} />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
            <div className="text-3xl font-black text-[#0A0A0A]">{playerState.totalXp.toLocaleString()}</div>
            <div className="text-sm text-[#6B6B6B]">XP</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md">
            <Flame className="w-6 h-6 text-orange-500 mb-2" />
            <div className="text-3xl font-black text-[#0A0A0A]">{playerState.streak}</div>
            <div className="text-sm text-[#6B6B6B]">רצף</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[#0A0A0A]">התקדמות</div>
            <div className="text-sm text-[#6B6B6B]">{solvedCount}/{totalPuzzles}</div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A86B] transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
          <div className="font-bold text-[#0A0A0A] mb-1">ייבוא חידות</div>
          <div className="text-xs text-[#6B6B6B] mb-4">העלה JSON עם החידות שלך</div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-[#2E5BFF]/5 text-[#2E5BFF] font-medium rounded-xl hover:bg-[#2E5BFF]/10 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>העלה קובץ JSON</span>
          </button>

          {importFeedback && (
            <div className={`mt-3 text-sm text-center ${
              importFeedback.type === 'success' ? 'text-green-700' : 'text-red-600'
            }`}>
              {importFeedback.text}
            </div>
          )}
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 text-sm text-[#6B6B6B] hover:text-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>איפוס התקדמות</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function PuzzlitApp() {
  const [screen, setScreen] = useState('home');
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null);
  const [puzzleSource, setPuzzleSource] = useState('campaign');
  const [puzzles, setPuzzles] = useState(SEED_PUZZLES);
  const [playerState, setPlayerState] = useState({
    solvedPuzzles: [],
    totalXp: 0,
    streak: 0,
    lastSolveInfo: null,
  });

  const currentPuzzle = puzzles.find(p => p.id === currentPuzzleId);
  const totalPuzzles = puzzles.length;

  function getDailyPuzzle() {
    const dayNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const idx = dayNum % puzzles.length;
    return puzzles[idx];
  }

  function handleNavigate(target) {
    if (target === 'daily') {
      const daily = getDailyPuzzle();
      setCurrentPuzzleId(daily.id);
      setPuzzleSource('daily');
      setScreen('puzzle');
      return;
    }
    setScreen(target);
  }

  function handleSelectPuzzle(id) {
    setCurrentPuzzleId(id);
    setPuzzleSource('campaign');
    setScreen('puzzle');
  }

  function handleSolve(puzzleId, hintsUsed) {
    const p = puzzles.find(x => x.id === puzzleId);
    const alreadySolved = playerState.solvedPuzzles.includes(puzzleId);
    const score = calculateScore(p, hintsUsed);

    setPlayerState(prev => ({
      ...prev,
      solvedPuzzles: alreadySolved ? prev.solvedPuzzles : [...prev.solvedPuzzles, puzzleId],
      totalXp: alreadySolved ? prev.totalXp : prev.totalXp + score,
      streak: alreadySolved ? prev.streak : prev.streak + 1,
      lastSolveInfo: { puzzleId, hintsUsed, score },
    }));

    setScreen('solution');
  }

  function handleNextPuzzle() {
    const currentIdx = puzzles.findIndex(p => p.id === currentPuzzleId);
    const solvedSet = new Set(playerState.solvedPuzzles);

    for (let i = currentIdx + 1; i < puzzles.length; i++) {
      if (!solvedSet.has(puzzles[i].id)) {
        setCurrentPuzzleId(puzzles[i].id);
        setScreen('puzzle');
        return;
      }
    }
    for (let i = 0; i < currentIdx; i++) {
      if (!solvedSet.has(puzzles[i].id)) {
        setCurrentPuzzleId(puzzles[i].id);
        setScreen('puzzle');
        return;
      }
    }
    setScreen('home');
  }

  function handleImport(newPuzzles) {
    const existingIds = new Set(puzzles.map(p => p.id));
    const toAdd = newPuzzles.filter(p => !existingIds.has(p.id));
    setPuzzles([...puzzles, ...toAdd]);
  }

  function handleReset() {
    if (typeof window !== 'undefined' && window.confirm('לאפס את כל ההתקדמות?')) {
      setPlayerState({ solvedPuzzles: [], totalXp: 0, streak: 0, lastSolveInfo: null });
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: "'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800;900&display=swap');
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      {screen === 'home' && (
        <HomeScreen
          onNavigate={handleNavigate}
          playerState={playerState}
          totalPuzzles={totalPuzzles}
        />
      )}
      {screen === 'campaign' && (
        <CampaignScreen
          puzzles={puzzles}
          playerState={playerState}
          onSelectPuzzle={handleSelectPuzzle}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'puzzle' && currentPuzzle && (
        <PuzzleScreen
          puzzle={currentPuzzle}
          onSolve={handleSolve}
          onBack={() => setScreen(puzzleSource === 'daily' ? 'home' : 'campaign')}
          isDaily={puzzleSource === 'daily'}
        />
      )}
      {screen === 'solution' && currentPuzzle && playerState.lastSolveInfo && (
        <SolutionScreen
          puzzle={currentPuzzle}
          hintsUsed={playerState.lastSolveInfo.hintsUsed}
          onNext={handleNextPuzzle}
          onHome={() => setScreen('home')}
          isDaily={puzzleSource === 'daily'}
        />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          playerState={playerState}
          totalPuzzles={totalPuzzles}
          onBack={() => setScreen('home')}
          onImport={handleImport}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
