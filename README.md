# PuzzleIT

שלושה משחקי מילים בעברית תחת מסך ראשי אחד, עם ניקוד כולל וטבלת ליגה:
**פיצוח מילים**, **חידות ויזואליות (PUZZLIT)** ו**שרשרת**.

```bash
npm install
npm run dev          # פיתוח
npm run build        # בנייה ל-dist/
npm run check-data   # בדיקת המאגרים
```

האפליקציה מחוברת ל-Supabase (ליגה משותפת). הסכמה: `supabase/schema.sql`. למצב מקומי בלבד: ראו `.env.example`.

ההוראות המלאות לעבודה על הפרויקט: `CLAUDE.md`. היסטוריה והחלטות: `docs/HANDOFF.md`.
