import WordCrack from '../games/wordcrack/WordCrack.jsx';
import Puzzlit from '../games/puzzlit/Puzzlit.jsx';
import Chain from '../games/chain/Chain.jsx';

// הרשימה של כל המשחקים ב-Hub. rules = מסך "איך משחקים" שמופיע בכניסה ובכפתור ה-?.
export const GAME_LIST = [
  {
    id: 'wordcrack',
    title: 'פיצוח מילים',
    subtitle: 'כמה מילים תצליחו לפצח בשתי דקות?',
    icon: '🧩',
    Component: WordCrack,
    theme: { bar: '#FAF5EC', ink: '#2B2A28', muted: '#8A8478', line: '#E7E0D2', accent: '#C1852F', font: "'Frank Ruhl Libre', serif" },
    rules: [
      'בכל סיבוב תקבלו רמז — מילה אחת הקשורה למילה הסודית',
      'ניחוש שגוי? מיד תקבלו רמז נוסף (עד 5 רמזים למילה)',
      'פחות רמזים = יותר נקודות: 5 על רמז ראשון, ועד נקודה אחת על החמישי',
      'יש לכם 2 דקות - כמה נקודות תאספו?',
    ],
    exitText: 'ההתקדמות בסיבוב הנוכחי תאבד אם תצאו עכשיו.',
  },
  {
    id: 'puzzlit',
    title: 'חידות ויזואליות',
    subtitle: 'איזה ביטוי מסתתר בתמונה?',
    icon: '🖼️',
    Component: Puzzlit,
    theme: { bar: '#FFFFFF', ink: '#0A0A0A', muted: '#6B6B6B', line: '#ECECEC', accent: '#2E5BFF', font: "'Assistant', sans-serif" },
    rules: [
      'כל תמונה מסתירה ביטוי, פתגם, מקום או סלנג',
      'מרכיבים את התשובה מאריחי האותיות שמתחת לתמונה (אפשר גם להקליד או לומר בקול)',
      'תקועים? יש שני רמזים לכל חידה, וכל רמז מוריד 20% מהנקודות',
      'אחרי הפתרון מקבלים הסבר צעד אחר צעד',
      'שישה שלבים, מהמתחילים ועד האגדות. כל החידות פתוחות',
    ],
    exitText: 'החידה הנוכחית לא תישמר כפתורה. חידות שכבר פתרתם נשמרות.',
  },
  {
    id: 'chain',
    title: 'שרשרת',
    subtitle: 'כמה מהר תחברו את המילים?',
    icon: '🔗',
    Component: Chain,
    theme: { bar: '#08081A', ink: '#FFFFFF', muted: 'rgba(255,255,255,.5)', line: 'rgba(255,255,255,.12)', accent: '#22D3EE', font: "'Assistant', sans-serif", dark: true },
    rules: [
      'מקבלים מילת פתיחה, ומתחתיה שרשרת מילים שרואים מהן רק את האות הראשונה',
      'כל מילה יוצרת צירוף מוכר עם המילה שמעליה (נר → שבת → שלום → בית…)',
      'אורך המילה לא נחשף אף פעם. ממשיכים להקליד אחרי האותיות הידועות',
      'רמז חושף את האות הבאה ומוסיף 5 שניות. אין הגבלה על מספר הרמזים',
      'התוצאה היא הזמן הכולל: כמה שיותר מהר, יותר נקודות',
    ],
    exitText: 'השעון יעצור, ותוכלו להמשיך מאותה נקודה כשתחזרו.',
  },
];

export const GAMES_BY_ID = Object.fromEntries(GAME_LIST.map(g => [g.id, g]));
