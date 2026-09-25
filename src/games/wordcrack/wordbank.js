// מאגר פיצוח מילים. מקור האמת: טבלת wordcrack_words ב-Supabase (נערכת ממסך הניהול),
// עם words.js כתוכן ההתחלתי. (בגרסת ה-HTML העריכות נשמרו ב-localStorage; עכשיו הן משותפות לכולם.)
import { getWords } from '../../lib/content.js';

export const ADMIN_EMAIL = 'omerzaguril@gmail.com';

export function getEffectiveWords() {
  return getWords();
}
