# איך מעבירים ל-Claude Code (2 צעדים)

1. חלץ את ה-ZIP לתיקייה במחשב.
2. פתח את Claude Code בתוך התיקייה `word-games-app` והדבק את ההודעה הזו:

```
קרא את CLAUDE.md ואת docs/HANDOFF.md, ואז את הקוד והמפרט של שלושת המשחקים בתיקייה games.
תן לי סיכום קצר של המצב, ושאל אותי את השאלות הפתוחות לפני שאתה מתחיל לבנות את ה-Hub.
```

זהו. `CLAUDE.md` נטען אוטומטית, ובו כל ההוראות. `docs/HANDOFF.md` מכיל את כל ההיסטוריה, ההחלטות וההיגיון.

## מה יש בתיקייה

```
word-games-app/
├── START\_HERE.md                 ← הקובץ הזה
├── CLAUDE.md                     ← ההוראות ל-Claude Code (מחליף את הוראות הפרויקט)
├── docs/HANDOFF.md               ← היסטוריה, החלטות, היגיון, בעיות פתוחות וצעדים הבאים
└── games/
    ├── word-crack/               ← פיצוח מילים (HTML + מפרט)
    ├── puzzlit/                  ← חידות ויזואליות (JSX + פרומט בנייה)
    └── chain/                    ← שרשרת (JSX + מסמך עדכון Lovable)
```

* `PUZZLIT\_Visual\_Puzzles.md` ו-`PUZZLIT\_Images\_196.zip` (196 החידות): שים אותם ב-`games/puzzlit/`.
* את כל הקוד לשים בGITHUB תחת הפרויקט הזה:
https://github.com/omerzaguril-gif/PuzzleIT.git

