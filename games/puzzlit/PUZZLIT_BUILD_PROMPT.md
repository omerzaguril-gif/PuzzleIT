# פרומט לבניית PUZZLIT — MVP Web App

> **הקשר לכלי הבנייה (Cursor / Lovable / Claude Code):**
> אתה בונה MVP של אפליקציית משחק חידות ויזואליות בעברית בשם **PUZZLIT**. המשחק מציג לשחקן קלף ויזואלי (תמונה עם רכיבים ויזואליים — אותיות, מספרים, תמונות, צבעים, מיקום מרחבי), והשחקן צריך לפתור מה הביטוי/הפתגם/שם המקום/הסלנג שהקלף מייצג. המוצר מדגיש חשיבה לא ליניארית, בלי ידע אנציקלופדי.

---

## 1. Stack טכנולוגי — חובה

- **Framework**: Next.js 14+ עם App Router
- **שפה**: TypeScript עם `strict: true`
- **עיצוב**: Tailwind CSS
- **State**: Zustand (state management קליל)
- **אנימציות**: Framer Motion
- **פונט**: Assistant (Google Fonts) — עברית + לטינית
- **פרסיסטנס**: LocalStorage בלבד (ללא בקאנד ב-MVP)
- **דיפלוי**: Vercel

**הנחיה**: כל ה-UI חייב להיות RTL (`dir="rtl"` על ה-`<html>`). Tailwind צריך להיות מוגדר עם `dir="rtl"` utilities (`ms-*`, `me-*` במקום `ml-*`, `mr-*` איפה שאפשר).

---

## 2. מבנה תיקיות מומלץ

```
/app
  layout.tsx              # RTL, font, global styles
  page.tsx                # מסך בית
  /puzzle/[id]/page.tsx   # מסך חידה
  /daily/page.tsx         # חידה יומית
  /profile/page.tsx       # פרופיל / התקדמות
  /solution/[id]/page.tsx # מסך פתרון
/components
  PuzzleCard.tsx          # תצוגת הקלף
  AnswerInput.tsx         # שדה תשובה עם ולידציה
  HintPanel.tsx           # מערכת רמזים
  Timer.tsx               # טיימר אופציונלי
  SolutionReveal.tsx      # הצגת פתרון + הסבר לוגיקה
  ProgressBar.tsx         # התקדמות בעולם
  StreakBadge.tsx         # רצף ימים
/data
  puzzles.ts              # 20 חידות מקובעות (טיפוסים + נתונים)
  worlds.ts               # 2 עולמות MVP
/lib
  validate.ts             # נורמליזציה + Levenshtein
  scoring.ts              # נוסחת ניקוד
  storage.ts              # LocalStorage helpers
  daily.ts                # בחירת חידה יומית דטרמיניסטית לפי תאריך
/public/cards
  p_001.svg
  p_001_solution.svg
  ...                     # מעצב יוסיף בהמשך; ב-dev להשתמש בפלייסהולדרים
```

---

## 3. סכמת JSON של חידה

כל חידה מיוצגת ב-TypeScript object לפי הסכמה הזו. הוסף את הטיפוסים ל-`/data/puzzles.ts`:

```typescript
export type Mechanism =
  | 'embedding'          // הטמעת מילה בתוך מילה
  | 'repetition'         // חזרה = מספר
  | 'digit_in_text'      // ספרה שמחליפה מילה פונטית
  | 'spatial'            // מיקום מרחבי = מילה
  | 'negation'           // X = שלילה/הסרה
  | 'homophone'          // הומופון חזותי
  | 'color_flag'         // צבע = דגל/מושג
  | 'full_scene'         // סיטואציה כוללת
  | 'anagram';           // אנגרם

export type Level = 1 | 2 | 3 | 4 | 5;

export type Category =
  | 'proverb'      // פתגמים
  | 'place'        // שמות מקומות
  | 'movie'        // סרטים וטלוויזיה
  | 'slang'        // סלנג
  | 'brand'        // מותגים/שמות
  | 'quote';       // ציטוטים

export type Language = 'he' | 'en' | 'mixed';

export interface Puzzle {
  id: string;                    // 'p_001'
  worldId: string;               // 'w_proverbs'
  order: number;                 // 1-10 בתוך העולם
  level: Level;
  mechanisms: Mechanism[];       // מכניזם אחד או משולב
  category: Category;
  language: Language;
  categoryVisible: boolean;      // האם הקטגוריה גלויה לשחקן (לפי רמה)

  // Assets
  cardImage: string;             // '/cards/p_001.svg'
  solutionImage?: string;        // אופציונלי — קלף עם הסבר ויזואלי
  aspectRatio: '1:1';            // תמיד 1080×1080

  // Answer
  answer: {
    primary: string;             // התשובה הקנונית להצגה
    accepted: string[];          // רשימת גרסאות מקובלות אחרי נורמליזציה
    fuzzyTolerance: number;      // Levenshtein max distance (ברירת מחדל: 1)
  };

  // Hints — מוגבל לפי רמה
  hints: {
    level1: string;              // "יש שלילה — שים לב ל-X"
    level2: string;              // "הביטוי הוא סוג של פתגם עתיק"
    level3: string;              // "מתחיל ב-'א'"
  };
  maxHintsAllowed: number;       // לפי רמה: 1→3, 2→2, 3→1, 4→0-1, 5→0

  // Explanation — נחשף אחרי פתרון או ויתור
  explanation: {
    steps: string[];             // שלבי פתרון: ["השמש למעלה = 'תחת השמש'", "X על NEW = 'אין חדש'", ...]
    finalPhrase: string;         // הביטוי המלא
  };

  // Scoring
  basePoints: number;            // לפי רמה: 1→100, 2→200, 3→400, 4→700, 5→1200
  timerSeconds?: number;         // אופציונלי — טיימר לרמות 3+
}

export interface World {
  id: string;
  order: number;
  titleHe: string;
  descriptionHe: string;
  puzzleIds: string[];           // ids של 10 חידות
  themeColor: string;            // hex
  requiresUnlock: boolean;
  unlockRequirement?: {
    worldId: string;
    minSolved: number;           // כמה חידות בעולם הקודם צריך לפתור
  };
}
```

---

## 4. מנגנוני ליבה

### 4.1 ולידציית תשובות (`/lib/validate.ts`)

```typescript
// נורמליזציה: כל תשובה עוברת דרך הפייפליין הבא לפני השוואה
function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')        // הסרת ניקוד עברי
    .replace(/[.,!?"'׳״\-–—]/g, '')          // הסרת פיסוק
    .replace(/\s+/g, '');                    // הסרת רווחים
}

// השוואה: exact match אחרי נורמליזציה, או Levenshtein ≤ tolerance
function isCorrect(userAnswer: string, puzzle: Puzzle): {
  correct: boolean;
  closeMatch: boolean;   // "כמעט!" — Levenshtein 1-2
} {
  const normalized = normalize(userAnswer);
  const accepted = puzzle.answer.accepted.map(normalize);

  if (accepted.includes(normalized)) return { correct: true, closeMatch: false };

  const minDistance = Math.min(...accepted.map(a => levenshtein(normalized, a)));
  if (minDistance <= puzzle.answer.fuzzyTolerance) return { correct: true, closeMatch: false };
  if (minDistance <= puzzle.answer.fuzzyTolerance + 1) return { correct: false, closeMatch: true };

  return { correct: false, closeMatch: false };
}
```

**חשוב**: להתקין `fastest-levenshtein` או לממש בעצמך.

### 4.2 מערכת רמזים

- כל חידה מגיעה עם 3 רמזים (level1/2/3), עולים בהדרגה
- מספר רמזים מותרים תלוי ברמת החידה (`maxHintsAllowed`)
- **פנלטי לניקוד**: כל רמז שנוצל = הפחתה של 20% מהניקוד הסופי
- כפתור "רמז" מציג את הרמז הבא שעדיין לא נחשף
- אחרי מיצוי כל הרמזים — הכפתור מוסתר

### 4.3 ניקוד (`/lib/scoring.ts`)

```typescript
function calculateScore(puzzle: Puzzle, ctx: {
  hintsUsed: number;
  secondsToSolve: number;
  currentStreak: number;
}): number {
  const base = puzzle.basePoints;
  const hintPenalty = Math.pow(0.8, ctx.hintsUsed);    // 20% פחות פר רמז
  const speedMultiplier = puzzle.timerSeconds
    ? Math.max(0.5, 1 - (ctx.secondsToSolve / puzzle.timerSeconds) * 0.5)
    : 1;
  const streakMultiplier = Math.min(3, 1 + ctx.currentStreak * 0.1);   // מקסימום ×3

  return Math.round(base * hintPenalty * speedMultiplier * streakMultiplier);
}
```

### 4.4 חידה יומית דטרמיניסטית (`/lib/daily.ts`)

```typescript
// לפי תאריך UTC — כל השחקנים באותו יום מקבלים את אותה חידה
function getDailyPuzzleId(date: Date, allPuzzles: Puzzle[]): string {
  const daysSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const index = daysSinceEpoch % allPuzzles.length;
  return allPuzzles[index].id;
}
```

### 4.5 שמירה ב-LocalStorage (`/lib/storage.ts`)

```typescript
interface PlayerState {
  solvedPuzzleIds: string[];
  totalXp: number;
  currentStreak: number;
  lastPlayedDate: string;   // ISO date
  dailyHistory: { date: string; puzzleId: string; solved: boolean; score: number }[];
  hintsRemaining: number;   // מלאי גלובלי או פר-חידה — לבחור
}

// helpers: getPlayerState(), savePlayerState(), markPuzzleSolved(id, score), etc.
```

---

## 5. מסכים

### 5.1 מסך בית (`/`)

- כותרת: `PUZZLIT`
- 3 כרטיסים גדולים, מרכזיים, נגישים בקליק:
  - **קמפיין** → מוביל למסך בחירת עולם
  - **חידה יומית** → מוביל ל-`/daily`
  - **פרופיל** → מוביל ל-`/profile`
- בתחתית: תצוגת רצף ימים נוכחי (`StreakBadge`)
- **מצבי אימון / דו-קרב מוסתרים לחלוטין ב-MVP** — אבל השאר את הקוד מוכן להוספה עתידית

### 5.2 מסך חידה (`/puzzle/[id]`)

Layout (מלמעלה למטה):
1. Header קטן: שם עולם + מספר חידה (למשל "פתגמים • חידה 3/10") + כפתור יציאה
2. **הקלף הוויזואלי**: תמונה 1080×1080, ממוקמת במרכז, `max-width: min(90vw, 600px)`, `aspect-ratio: 1/1`
3. אם רמה 3+: טיימר קטן מתחת לקלף
4. שדה קלט תשובה עם autofocus, גדול, RTL
5. כפתור "בדוק" (או Enter מהמקלדת)
6. כפתור "רמז" — מציג כמה רמזים נותרו
7. פידבק בזמן אמת:
   - תשובה שגויה → רעד עדין של הקלף (Framer Motion)
   - תשובה קרובה → "כמעט! נסה שוב" מתחת לשדה
   - תשובה נכונה → אנימציית מעבר למסך פתרון

### 5.3 מסך פתרון (`/solution/[id]`)

- הקלף המקורי בראש, קטן יותר
- מתחת: הביטוי המלא בגדול (`explanation.finalPhrase`)
- מתחת: **הסבר צעד-אחר-צעד** — כל שלב מ-`explanation.steps` מופיע ברצף עם השהיה של 0.4 שניות (Framer Motion `staggerChildren`)
- ניקוד שהתקבל + מכפילים (`+320 XP • ×2 streak bonus`)
- שני כפתורים בתחתית: **חידה הבאה** ← / **חזרה לעולם**

### 5.4 פרופיל (`/profile`)

- שם שחקן (נשמר מהאונבורדינג — אחרת "שחקן")
- XP סה"כ
- רצף ימים
- אחוז השלמה פר עולם (progress bars)
- היסטוריית חידה יומית (7 ימים אחרונים — ✓ / ✗)

### 5.5 מסך בחירת עולם (חלק ממסך הבית או `/campaign`)

- 2 עולמות MVP כרטיסים:
  - **עולם 1: פתגמים ואמירות** — פתוח
  - **עולם 2: שמות מקומות** — פתוח אחרי 7/10 חידות בעולם 1
- כל עולם מציג: כותרת, תיאור קצר, progress ("3/10 נפתרו")

---

## 6. עיצוב

### פלטת צבעים
```css
--bg-primary: #FFFFFF;
--bg-secondary: #FAFAF7;
--text-primary: #0A0A0A;
--text-secondary: #6B6B6B;
--accent: #2E5BFF;         /* כחול לקישורים וכפתורי CTA */
--success: #00A86B;
--error: #E63946;
--card-bg: #FFFFFF;
--card-shadow: 0 4px 24px rgba(0,0,0,0.06);
```

### טיפוגרפיה
- פונט: Assistant (Google Fonts), 400/500/700
- גדלים: base 18px, headings scale (28/24/20/18)
- ניגודיות גבוהה, ריווח שורה נדיב (1.6)

### עקרונות עיצוב
- **הקלף הוא הכוכב** — כל השאר מינימלי, נקי, ללא עומס
- כפתורים: `rounded-2xl`, padding נדיב, hover state עדין
- אנימציות: קצרות (200-400ms), מרוסנות
- ללא צללים כבדים, ללא גרדיאנטים אגרסיביים

---

## 7. סקופ MVP — מה נכנס ומה לא

### ✅ IN scope (v0.1)
- 20 חידות מקובעות (2 עולמות × 10 חידות)
- עברית בלבד
- מסכי בית / קמפיין / חידה / פתרון / פרופיל
- חידה יומית דטרמיניסטית
- שמירת התקדמות ב-LocalStorage
- מערכת רמזים עם פנלטי לניקוד
- חישוב XP, streak, ומכפילים
- RTL מלא, פונט Assistant
- Responsive: mobile-first (עובד יפה גם על desktop)

### ❌ OUT of scope (v1.0+)
- חשבונות משתמש / auth
- מצב דו-קרב (דורש WebSocket/Realtime)
- טבלת מובילים
- מצב אימון
- חנות ומונטיזציה
- תוכן באנגלית
- CMS פנימי לעורכי תוכן
- UGC (תוכן מיוצר משתמש)
- אינטגרציית TikTok
- שיתוף לרשתות
- Push notifications

---

## 8. תוכן ראשוני — 20 חידות ל-MVP

**כרגע יש דוגמאות פזורות באיפיון. משימת המשך: להרחיב ל-20 חידות מלאות עם כל הנתונים בסכמה. אבל להתחלת הפיתוח, יש להשתמש ב-4 החידות הבאות כ-seed (מספיק כדי לפתח ולבדוק את כל הזרימות):**

```typescript
// /data/puzzles.ts — snippet
export const puzzles: Puzzle[] = [
  {
    id: 'p_001',
    worldId: 'w_proverbs',
    order: 1,
    level: 1,
    mechanisms: ['negation', 'spatial'],
    category: 'proverb',
    language: 'he',
    categoryVisible: true,
    cardImage: '/cards/p_001.svg',
    aspectRatio: '1:1',
    answer: {
      primary: 'אין חדש תחת השמש',
      accepted: ['אין חדש תחת השמש', 'אין חדש תחת השמש.'],
      fuzzyTolerance: 1,
    },
    hints: {
      level1: 'יש שלילה — שים לב ל-X האדום',
      level2: 'הביטוי הוא פתגם עתיק ממגילת קהלת',
      level3: 'מתחיל ב-"אין"',
    },
    maxHintsAllowed: 3,
    explanation: {
      steps: [
        'השמש בחלק העליון של הקלף = "תחת השמש"',
        'X אדום על המילה NEW = "אין חדש"',
        'צירוף: "אין חדש תחת השמש"',
      ],
      finalPhrase: 'אין חדש תחת השמש',
    },
    basePoints: 100,
  },
  // ... p_002 עד p_020 — Omer ישלים
];
```

**Placeholder לפיתוח**: לפני שהמעצב מוסיף SVGs, השתמש ב-`<div>` עם background gradient וטקסט "PUZZLE p_001" במרכז. הקוד חייב להתמודד עם `cardImage` שמצביע על נכס לא קיים באמצעות fallback.

---

## 9. Acceptance Criteria (קריטריוני קבלה)

יש לאמת ידנית לפני שהמוצר "מוכן":

- [ ] `dir="rtl"` פועל בכל האפליקציה; אין אלמנטים שגולשים או "בורחים" שמאלה
- [ ] פונט Assistant טוען נכון (גם fallback עברי סביר אם ה-CDN נופל)
- [ ] מסך חידה נפתח, מציג קלף (או placeholder), ומקבל קלט
- [ ] תשובה נכונה → מעבר למסך פתרון עם אנימציית reveal של השלבים
- [ ] תשובה שגויה → רעד עדין + הודעה
- [ ] תשובה קרובה (Levenshtein 2) → הודעת "כמעט!"
- [ ] תשובה עם ניקוד עברי (למשל "אֵין חָדָשׁ") מתקבלת
- [ ] תשובה עם פיסוק שונה מתקבלת
- [ ] כפתור רמז חושף רמזים בסדר עולה, פנלטי מחושב נכון
- [ ] LocalStorage שומר התקדמות; רענון דף לא מוחק
- [ ] חידה יומית זהה כל היום, מתחלפת ב-00:00 UTC
- [ ] רצף ימים עולה אם נכנסת ופתרת בכל יום; מתאפס אם דילגת יום
- [ ] מסך פרופיל מציג נתונים אמיתיים מ-LocalStorage
- [ ] עולם 2 נעול עד שיש 7/10 בעולם 1
- [ ] המוצר עובד יפה במובייל (viewport 375px רוחב) וב-desktop (1440px)
- [ ] אין שגיאות ב-console
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95

---

## 10. משימת פיתוח ראשונה — הצעה לרצף עבודה

1. Bootstrap: `create-next-app` + Tailwind + Assistant font + RTL setup
2. יצירת טיפוסי TypeScript ו-4 חידות seed ב-`/data/puzzles.ts`
3. `/lib/validate.ts` + טסטים ידניים ל-Levenshtein ונורמליזציה
4. `/lib/storage.ts` + `/lib/scoring.ts` + `/lib/daily.ts`
5. Layout כללי + מסך בית
6. מסך חידה + `PuzzleCard` + `AnswerInput`
7. `HintPanel` + חיווט לפנלטי ניקוד
8. מסך פתרון עם אנימציות Framer Motion
9. מסך פרופיל + מסך בחירת עולם
10. חידה יומית + streak logic
11. QA לפי Acceptance Criteria
12. Deploy ל-Vercel

---

## 11. הערות חשובות למפתח

- **RTL תמיד תבדוק בפועל** — לא מספיק להוסיף `dir="rtl"` ולסמוך על Tailwind. יש לוודא ידנית שמרווחים, אייקונים, ואנימציות מרגישים נכון.
- **פונט עברי**: Assistant מ-Google Fonts, לטעון עם `next/font/google` לביצועים מיטביים.
- **תמונות SVG**: להשתמש ב-`next/image` עם `unoptimized` ל-SVG, או `<img>` רגיל.
- **טיפוסים strict**: אל תשתמש ב-`any`. הסכמה למעלה שלמה.
- **הקוד צריך להיות מוכן להרחבה** ל-v1.0 (auth, backend, duel) — אבל אל תבנה תשתית מיותרת ל-MVP.

---

**סיום פרומט. התחל בבנייה שלב 1 (Bootstrap). לפני שאתה עובר לשלב 2, הצג את המבנה שיצרת ותאשר איתי לפני המשך.**
