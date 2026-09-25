# PUZZLIT — עדכון: הוספת משחק "שרשרת" כחידה יומית

עדכון לאפליקציה הקיימת. מוסיפים סוג משחק שני לצד החידות הוויזואליות: משחק חשיבה מילולי בשם **שרשרת**, שמתחדש כל יום.

---

## 1. מהו המשחק

השחקן מקבל מילת פתיחה, ומתחתיה שרשרת של מילים חסומות. כל מילה חסומה חושפת **רק את האות הראשונה שלה**, והיא חייבת ליצור צירוף מוכר עם המילה שמעליה — סמיכות, שם ותואר, או ביטוי כבול.

דוגמה מלאה:

```
נר          ← מילת הפתיחה, נתונה
ש…          ← שבת      (נר שבת)
ש…          ← שלום     (שבת שלום)
ב…          ← בית      (שלום בית)
ס…          ← ספר      (בית ספר)
ת…          ← תורה     (ספר תורה)
```

השחקן מקליד ניחוש. נכון — המילה נפתחת והצירוף מוצג מתחתיה, ועוברים למילה הבאה. שגוי — התיבה מתנקה והוא מנסה שוב, בלי הגבלת ניסיונות.

---

## 2. כללי ליבה — שלושה דברים קריטיים

### 2.1 אורך המילה לעולם לא נחשף
זו נקודת הקושי המרכזית של המשחק ואסור לוותר עליה.

`בית` + האות `ס` יכול להיות **ספר** או **סוהר**. השחקן צריך לנחש, להיכשל, ולנסות את השני. אם נציג משבצות ריקות לפי אורך המילה — הדו-משמעות נעלמת והמשחק מאבד את מה שהופך אותו למאתגר.

לכן:
- מילה שטרם נפתרה מוצגת כ**אות ראשונה + שלוש נקודות**: `ס…`
- המילה הנוכחית מוצגת כ**רישא שנחשפה + שלוש נקודות**: `סו…`
- **אין** משבצות ריקות, **אין** מונה אותיות, **אין** רמז לאורך בשום מקום — כולל ב-placeholder של שדה הקלט (ראו סעיף 6 לגבי אופן הקלדת הפתרון).

### 2.2 רמזים ללא הגבלה
כל לחיצה על "רמז" חושפת את **האות הבאה** במילה הנוכחית ומוסיפה **3 שניות** לזמן.

- אין תקרה למספר הרמזים. שחקן שרוצה לחשוף מילה שלמה אות-אות — רשאי, והוא פשוט ישלם על זה בזמן.
- הכפתור נשאר פעיל כל עוד נותרה אות חסויה. כשהמילה חשופה במלואה, הכפתור מציג "המילה חשופה" ומושבת — לא בגלל מכסה, אלא כי אין מה לחשוף.
- אחרי מעבר למילה הבאה, מונה החשיפה מתאפס לאות אחת והרמזים זמינים שוב מיד.

### 2.3 ניקוד לפי זמן
התוצאה היא **זמן הפתירה הכולל**, ונמוך יותר טוב יותר.

```
זמן סופי = שניות שחלפו מתחילת המשחק + (3 × מספר הרמזים)
```

הטיימר מתחיל ברגע פתיחת החידה ונעצר בפתירת המילה האחרונה. ניחושים שגויים אינם קונסים ישירות — הם עולים בזמן שלוקח להקליד אותם, וזה מספיק.

במסך הסיום מציגים: הזמן הסופי, מספר הרמזים והקנס שנצבר מהם, ומספר הניחושים השגויים.

---

## 3. חידה אחת ליום

**שרשרת אחת בלבד זמינה בכל יום.** אין רשימה של שרשראות לבחירה ואין ארכיון פתוח — בדיוק כמו וורדל.

- לכל שרשרת יש שדה `scheduled_date` שקובע באיזה תאריך היא מוצגת.
- האפליקציה טוענת את השרשרת שה-`scheduled_date` שלה הוא היום לפי שעון ישראל.
- אם לא הוגדרה שרשרת ליום הנוכחי, מציגים מסך "השרשרת של היום עוד לא מוכנה, חזרו מחר" — **לא** בוחרים שרשרת אקראית, כדי שכל השחקנים תמיד יראו את אותה חידה ותוצאותיהם יהיו ברות השוואה.
- שחקן שכבר פתר את השרשרת של היום רואה את התוצאה שלו ולא יכול לשחק שוב באותו יום.
- התקדמות ותוצאות נשמרות פר-משתמש בדיוק כמו בחידות הוויזואליות.

---

## 4. שינויים בסכימה

```sql
-- שרשרת = חידה יומית אחת
create table if not exists public.chains (
  id              text primary key,           -- "chain_001"
  theme           text,                       -- כותרת פנימית, לא מוצגת לשחקן
  difficulty      text check (difficulty in ('קל','בינוני','קשה')),
  words           jsonb not null,             -- [{position, word, given, link}]
  scheduled_date  date unique,                -- היום שבו השרשרת מוצגת. null = לא משובצת
  status          text not null default 'draft' check (status in ('published','draft')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists chains_date_idx on public.chains(scheduled_date);

alter table public.chains enable row level security;

-- שחקן רואה רק את השרשרת של היום. חשיפת שרשראות עתידיות תשבור את המשחק.
create policy "today's chain is public"
  on public.chains for select
  using ((status = 'published' and scheduled_date = current_date) or public.is_admin());

create policy "admins write chains"
  on public.chains for all
  using (public.is_admin()) with check (public.is_admin());

-- תוצאות
create table if not exists public.chain_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  chain_id      text references public.chains(id) on delete cascade,
  played_date   date not null default current_date,
  seconds_total numeric(8,2) not null,        -- כולל קנס הרמזים
  hints_used    integer not null default 0,
  wrong_guesses integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, played_date)               -- ניסיון אחד ליום
);

alter table public.chain_results enable row level security;

create policy "own results readable"
  on public.chain_results for select
  using (auth.uid() = user_id or public.is_admin());

create policy "own results writable"
  on public.chain_results for insert
  with check (auth.uid() = user_id);
```

**הערה על `words`:** המבנה `{position, word, given, link, displayWord?}`. `given: true` רק במילה הראשונה. `link` הוא הצירוף שנוצר עם המילה שמעליה, ומוצג **רק אחרי** שהמילה נפתרה — הוא חלק מהתגמול, לא מהרמז.

**שדה אופציונלי `displayWord` — תמיכה בצורת סמיכות (construct state):** לפעמים מילה שכבר נפתרה משנה את האיות שלה כשהיא הופכת לחלק הראשון בצירוף הבא — למשל מילה נקבית שמסתיימת ב-ה' לוקחת ת' בסמיכות (מדינה→מדינת, משטרה→משטרת, ממשלה→ממשלת, טיסה→טיסת), ולפעמים שינויים אחרים (לימוד→לימודי). ל-`word` עצמו **אסור** להשתנות — הוא תמיד הצורה הבסיסית שהשחקן מקליד ושממנה נחשפות אותיות הרמז. כשמילה כזו הופכת לחלק ראשון בצירוף הבא, מוסיפים לה `displayWord` עם הצורה המשתנה, וזו הצורה שתוצג על סולם השרשרת **אחרי** שהמילה נפתרת (או אם היא מילת הפתיחה) — לעולם לא לפני. דוגמה: `{ word: "מדינה", link: "עד מדינה", displayWord: "מדינת" }` ואז `{ word: "ישראל", link: "מדינת ישראל" }`. אם מילת הפתיחה עצמה תמיד מופיעה בצורת סמיכות (כמו "עוגת", "תשומת"), אפשר לכתוב את הצורה הזו ישירות בשדה `word` שלה בלי `displayWord`, כי אין לה ניחוש לבדוק. ברוב הצירופים (למשל שם עצם ואחריו תואר) אין שינוי איות בכלל, ואז `displayWord` פשוט לא קיים.

---

## 5. הוספה לפאנל הבקרה

בפאנל הקיים (`/admin`) יש כרגע ניהול חידות ויזואליות. מוסיפים לצידו מסך **`/admin/chains`** עם קישור בתפריט הראשי של הפאנל.

הגישה נשארת נעולה לאותם שני מיילים דרך אותם שלושה מנגנונים — middleware, בדיקת ה-API, ו-RLS.

### 5.1 תצוגת לוח שנה — המסך המרכזי
תצוגה חודשית שמראה איזו שרשרת משובצת לכל יום:

- יום עם שרשרת משובצת: מציג את התֵמה ואת רמת הקושי, בצבע לפי הרמה.
- יום ריק: מסומן בבירור כחור בלוח, עם כפתור "שיבוץ שרשרת".
- **התראה בולטת** אם יש ימים ריקים בשבועיים הקרובים — זו התקלה שהכי קל לפספס ושהכי מורגשת לשחקנים.
- גרירה של שרשרת מיום ליום מחליפה תאריכים.
- שרשרת אחת בלבד ליום, נאכף ב-`unique` על `scheduled_date`.

### 5.2 מאגר השרשראות
רשימה של כל השרשראות עם סינון לפי סטטוס (משובצת / ממתינה / טיוטה) ולפי רמת קושי, וחיפוש לפי מילה.

לכל שרשרת בעריכה:
- **מילים** — עריכה של כל מילה בשרשרת, הוספה והסרה של מילים (4 עד 7 מילים).
- **צירופים** — לכל מילה, הצירוף שהיא יוצרת עם הקודמת. זה השדה שמוצג לשחקן אחרי פתירה.
- **רמת קושי** — קל / בינוני / קשה.
- **תאריך** — בורר תאריך. אם התאריך תפוס, מציגים איזו שרשרת יושבת שם ומאפשרים החלפה.
- **סטטוס** — טיוטה או מפורסמת. טיוטה לעולם לא מוצגת לשחקנים גם אם יש לה תאריך.

### 5.3 ולידציה בשמירה
לפני שמירה של שרשרת מפורסמת, בדקו ודחו עם הודעה ברורה:

1. לפחות 4 מילים ולכל היותר 7.
2. המילה הראשונה מסומנת `given`, כל השאר לא.
3. לכל מילה שאיננה הראשונה יש `link` לא ריק.
4. כל מילה היא אותיות עבריות ורווחים בלבד — **בלי ספרות ובלי לטינית**, כמו בחידות הוויזואליות.
5. אין מילה שחוזרת פעמיים באותה שרשרת.
6. ה-`link` מכיל בפועל את שתי המילים שהוא מחבר. זו הבדיקה שתופסת שגיאות הקלדה בעריכה.

**אזהרה, לא חסימה:** אם שתי מילים עוקבות מתחילות באותה אות — מותר, אבל שווה להציג הערה, כי זה מקשה על השחקן לעקוב.

### 5.4 סטטיסטיקות
לכל שרשרת שכבר שוחקה, בטבלת המאגר:
- כמה שחקנים פתרו
- זמן חציוני לפתירה
- ממוצע רמזים
- ממוצע ניחושים שגויים
- **המילה שהכי תקעה** — אצל איזו מילה בשרשרת נרשמו הכי הרבה ניחושים שגויים

הנתון האחרון הוא החשוב. מילה עם הרבה ניחושים שגויים היא או מילה מעורפלת מדי, או — וזה המקרה המעניין — נקודת דו-משמעות טובה ששווה לשחזר בשרשראות הבאות.

---

## 6. נראות

אותה אסתטיקה של האפליקציה: רקע `#08081A` עם gradients רדיאליים, פונט Assistant, Space Mono לטיימר, גוונים ציאן (`#22D3EE`) וסגול (`#8B5CF6`).

**סולם השרשרת** (מוצג מעל שדה הקלט, ומראה את ההתקדמות בכל השרשרת):

- כל מילה בשרשרת היא **גלולה מלבנית מעוגלת** (`rounded-2xl`), ממורכזת, ברוחב מינימלי אחיד — **רוחב אחיד חשוב**, אחרת רוחב הגלולה מסגיר את אורך המילה.
- מילת הפתיחה: רקע לבן שקוף, מסגרת מלאה.
- מילה שנפתרה: gradient ציאן-סגול עדין, מסגרת זוהרת, והצירוף בטקסט קטן מתחתיה.
- המילה הנוכחית: מסגרת ציאן בולטת, מציגה את הרישא שנחשפה + `…`.
- מילה עתידית: מסגרת מקווקוות עמומה, מציגה אות ראשונה + `…`.

**שדה הקלט — הפתרון נכתב על גבי האותיות הידועות, לא בתיבה ריקה נפרדת:**

זו נקודה קריטית לחוויית המשחק. שדה הקלט **אינו** תיבה ריקה עם placeholder טקסטואלי כמו "מילה שמתחילה ב-X". הדפוס הנכון:

- תיבת הקלט מציגה בתוכה, כטקסט קבוע ולא ניתן למחיקה, את כל האותיות שכבר ידועות במילה הנוכחית — האות הראשונה (ידועה תמיד מרגע הופעת המילה בסולם) ועוד כל אות נוספת שנחשפה ברמז.
- הסמן ממתין מיד אחרי האותיות הידועות, בתוך **אותה תיבה בדיוק**, והשחקן ממשיך להקליד את שאר המילה כאילו הוא משלים מילה שכבר התחילה להיכתב — לא פותח שדה חדש וריק לצידה.
- לדוגמה: אם המילה הנוכחית מתחילה ב-"ס" (מוצגת "ס…" בסולם) והשחקן לוקח רמז שחושף גם את ה-"ו", בתוך תיבת הקלט יופיע "סו" כטקסט קבוע, והשחקן ממשיך להקליד מיד אחרי זה (למשל "ף" להשלמת "סוף").
- אם השחקן כבר הקליד אות שממש נחשפת ברמז (למשל התחיל להקליד "סוף" ואז לקח רמז שחושף את ה-ו לפני שהספיק לשלוח), האות המשותפת לא נמחקת מההקלדה שלו — היא פשוט הופכת לחלק מהקידומת הקבועה, וההמשך שהקליד נשאר.
- חשוב: אורך המילה עדיין **לעולם לא נחשף** גם בדפוס הזה — תיבת הקלט גדלה חופשית לפי מספר התווים שהוקלדו בפועל, ואין מספר תווים קבוע מראש, ואין משבצות ריקות ממתינות.

**מתחת לשדה הקלט:** הניחושים השגויים של המילה הנוכחית מוצגים כצ'יפים אדומים עם קו חוצה — כל צ'יפ מציג את **המילה המלאה שנוסתה** (הקידומת הידועה + מה שהשחקן הקליד), ולא רק את החלק שהוא הקליד, כדי שיהיה ברור בדיוק מה כבר נפסל.

**טיימר** בפינה, רץ בזמן אמת.

---

## 7. מלאי השרשראות

17 שרשראות מוכנות. כולן עם `scheduled_date: null` ו-`status: "draft"` — **השיבוץ לתאריכים נעשה בפאנל הבקרה**, לא בקוד.

9 שרשראות באורך 6 מילים ו-8 באורך 5. כל קישור נבדק ידנית כצירוף עברי אמיתי.

```json
[
  { "id": "chain_001", "theme": "ערב שבת", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "נר", "given": true, "link": null },
    { "position": 1, "word": "שבת", "given": false, "link": "נר שבת" },
    { "position": 2, "word": "שלום", "given": false, "link": "שבת שלום" },
    { "position": 3, "word": "בית", "given": false, "link": "שלום בית" },
    { "position": 4, "word": "ספר", "given": false, "link": "בית ספר" },
    { "position": 5, "word": "תורה", "given": false, "link": "ספר תורה" }
  ]},
  { "id": "chain_002", "theme": "מזל טוב", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "בר", "given": true, "link": null },
    { "position": 1, "word": "מזל", "given": false, "link": "בר מזל" },
    { "position": 2, "word": "טוב", "given": false, "link": "מזל טוב" },
    { "position": 3, "word": "לב", "given": false, "link": "טוב לב" },
    { "position": 4, "word": "זהב", "given": false, "link": "לב זהב" },
    { "position": 5, "word": "שחור", "given": false, "link": "זהב שחור" }
  ]},
  { "id": "chain_003", "theme": "דרך ארץ", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "לילה", "given": true, "link": null },
    { "position": 1, "word": "טוב", "given": false, "link": "לילה טוב" },
    { "position": 2, "word": "לב", "given": false, "link": "טוב לב" },
    { "position": 3, "word": "אבן", "given": false, "link": "לב אבן" },
    { "position": 4, "word": "דרך", "given": false, "link": "אבן דרך" },
    { "position": 5, "word": "ארץ", "given": false, "link": "דרך ארץ" }
  ]},
  { "id": "chain_004", "theme": "סוף שבוע", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "טוב", "given": true, "link": null },
    { "position": 1, "word": "לב", "given": false, "link": "טוב לב" },
    { "position": 2, "word": "ים", "given": false, "link": "לב ים" },
    { "position": 3, "word": "סוף", "given": false, "link": "ים סוף" },
    { "position": 4, "word": "שבוע", "given": false, "link": "סוף שבוע" },
    { "position": 5, "word": "הבא", "given": false, "link": "שבוע הבא" }
  ]},
  { "id": "chain_005", "theme": "בית דין", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "בית", "given": true, "link": null },
    { "position": 1, "word": "דין", "given": false, "link": "בית דין" },
    { "position": 2, "word": "תורה", "given": false, "link": "דין תורה" },
    { "position": 3, "word": "חיים", "given": false, "link": "תורת חיים" },
    { "position": 4, "word": "לילה", "given": false, "link": "חיי לילה" },
    { "position": 5, "word": "טוב", "given": false, "link": "לילה טוב" }
  ]},
  { "id": "chain_006", "theme": "זמן וים", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "שעון", "given": true, "link": null },
    { "position": 1, "word": "חול", "given": false, "link": "שעון חול" },
    { "position": 2, "word": "ים", "given": false, "link": "חול ים" },
    { "position": 3, "word": "סוף", "given": false, "link": "ים סוף" },
    { "position": 4, "word": "עולם", "given": false, "link": "סוף עולם" },
    { "position": 5, "word": "התחתון", "given": false, "link": "עולם התחתון" }
  ]},
  { "id": "chain_007", "theme": "קור רוח", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "חשבון", "given": true, "link": null },
    { "position": 1, "word": "בנק", "given": false, "link": "חשבון בנק" },
    { "position": 2, "word": "דם", "given": false, "link": "בנק דם" },
    { "position": 3, "word": "קר", "given": false, "link": "דם קר" },
    { "position": 4, "word": "רוח", "given": false, "link": "קר רוח" },
    { "position": 5, "word": "רפאים", "given": false, "link": "רוח רפאים" }
  ]},
  { "id": "chain_008", "theme": "מטבח", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "עוגת", "given": true, "link": null },
    { "position": 1, "word": "שוקולד", "given": false, "link": "עוגת שוקולד" },
    { "position": 2, "word": "חלב", "given": false, "link": "שוקולד חלב" },
    { "position": 3, "word": "אם", "given": false, "link": "חלב אם" },
    { "position": 4, "word": "בית", "given": false, "link": "אם בית" },
    { "position": 5, "word": "ספר", "given": false, "link": "בית ספר" }
  ]},
  { "id": "chain_009", "theme": "אור ומדינה", "difficulty": "קשה", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "קרן", "given": true, "link": null },
    { "position": 1, "word": "אור", "given": false, "link": "קרן אור" },
    { "position": 2, "word": "ירוק", "given": false, "link": "אור ירוק" },
    { "position": 3, "word": "עד", "given": false, "link": "ירוק עד" },
    { "position": 4, "word": "מדינה", "given": false, "link": "עד מדינה" },
    { "position": 5, "word": "ישראל", "given": false, "link": "מדינת ישראל" }
  ]},
  { "id": "chain_010", "theme": "צדק", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "שלום", "given": true, "link": null },
    { "position": 1, "word": "בית", "given": false, "link": "שלום בית" },
    { "position": 2, "word": "משפט", "given": false, "link": "בית משפט" },
    { "position": 3, "word": "צדק", "given": false, "link": "משפט צדק" },
    { "position": 4, "word": "חברתי", "given": false, "link": "צדק חברתי" }
  ]},
  { "id": "chain_011", "theme": "מלח הארץ", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "תשומת", "given": true, "link": null },
    { "position": 1, "word": "לב", "given": false, "link": "תשומת לב" },
    { "position": 2, "word": "ים", "given": false, "link": "לב ים" },
    { "position": 3, "word": "מלח", "given": false, "link": "ים מלח" },
    { "position": 4, "word": "הארץ", "given": false, "link": "מלח הארץ" }
  ]},
  { "id": "chain_012", "theme": "ראש השנה", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "כאב", "given": true, "link": null },
    { "position": 1, "word": "ראש", "given": false, "link": "כאב ראש" },
    { "position": 2, "word": "שנה", "given": false, "link": "ראש שנה" },
    { "position": 3, "word": "טובה", "given": false, "link": "שנה טובה" },
    { "position": 4, "word": "הנאה", "given": false, "link": "טובת הנאה" }
  ]},
  { "id": "chain_013", "theme": "קשר עין", "difficulty": "בינוני", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "איש", "given": true, "link": null },
    { "position": 1, "word": "קשר", "given": false, "link": "איש קשר" },
    { "position": 2, "word": "עין", "given": false, "link": "קשר עין" },
    { "position": 3, "word": "טובה", "given": false, "link": "עין טובה" },
    { "position": 4, "word": "הנאה", "given": false, "link": "טובת הנאה" }
  ]},
  { "id": "chain_014", "theme": "מים חיים", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "כוס", "given": true, "link": null },
    { "position": 1, "word": "מים", "given": false, "link": "כוס מים" },
    { "position": 2, "word": "חיים", "given": false, "link": "מים חיים" },
    { "position": 3, "word": "לילה", "given": false, "link": "חיי לילה" },
    { "position": 4, "word": "לבן", "given": false, "link": "לילה לבן" }
  ]},
  { "id": "chain_015", "theme": "חגיגה", "difficulty": "קל", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "גן", "given": true, "link": null },
    { "position": 1, "word": "חיות", "given": false, "link": "גן חיות" },
    { "position": 2, "word": "בר", "given": false, "link": "חיות בר" },
    { "position": 3, "word": "מצווה", "given": false, "link": "בר מצווה" },
    { "position": 4, "word": "גדולה", "given": false, "link": "מצווה גדולה" }
  ]},
  { "id": "chain_016", "theme": "שדה קרב", "difficulty": "קשה", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "אם", "given": true, "link": null },
    { "position": 1, "word": "בית", "given": false, "link": "אם בית" },
    { "position": 2, "word": "משפט", "given": false, "link": "בית משפט" },
    { "position": 3, "word": "שדה", "given": false, "link": "משפט שדה" },
    { "position": 4, "word": "קרב", "given": false, "link": "שדה קרב" }
  ]},
  { "id": "chain_017", "theme": "צדק פואטי", "difficulty": "קשה", "scheduled_date": null, "status": "draft", "words": [
    { "position": 0, "word": "אם", "given": true, "link": null },
    { "position": 1, "word": "בית", "given": false, "link": "אם בית" },
    { "position": 2, "word": "דין", "given": false, "link": "בית דין" },
    { "position": 3, "word": "צדק", "given": false, "link": "דין צדק" },
    { "position": 4, "word": "פואטי", "given": false, "link": "צדק פואטי" }
  ]}
]
```

---

## 8. סדר עבודה

1. יצירת הטבלאות `chains` ו-`chain_results` עם ה-RLS
2. טעינת 17 השרשראות כטיוטות
3. בניית מסך המשחק — סולם השרשרת, שדה הקלט (עם הפתרון נכתב על גבי האותיות הידועות, ראו סעיף 6), רמזים, טיימר
4. חיבור לוגיקת היום: טעינת השרשרת של התאריך הנוכחי, חסימת משחק חוזר
5. הוספת `/admin/chains` — לוח שנה, מאגר, עריכה, ולידציה
6. שיבוץ השרשראות לתאריכים דרך הפאנל
7. הוספת כניסה למשחק במסך הבית של האפליקציה, לצד החידות הוויזואליות

## 9. קריטריוני קבלה

- ✅ אורך המילה לא נחשף בשום מקום בממשק, כולל בשדה הקלט
- ✅ שדה הקלט מציג את האותיות הידועות (מילת פתיחה + רמזים שנחשפו) כטקסט קבוע בתוך התיבה, וההקלדה ממשיכה מיד אחריהן באותה תיבה — לא בתיבה ריקה נפרדת
- ✅ מילה שמשנה איות בהפיכתה לחלק ראשון בצירוף הבא (סמיכות) מוצגת על הסולם בצורתה המשתנה (`displayWord`) אחרי שנפתרה, בעוד שהקלדה ובדיקת ניחוש תמיד מתבססות על הצורה הבסיסית (`word`)
- ✅ רמזים ללא הגבלה, כל אחד חושף אות אחת ומוסיף 3 שניות
- ✅ שרשרת אחת ליום, זהה לכל השחקנים
- ✅ יום בלי שרשרת משובצת מציג הודעה, לא שרשרת אקראית
- ✅ אי אפשר לשחק פעמיים באותו יום
- ✅ שרשראות עתידיות לא נחשפות דרך ה-API
- ✅ אפשר לערוך כל שרשרת ולשבץ אותה לתאריך מהפאנל
- ✅ הפאנל מתריע על ימים ריקים בשבועיים הקרובים
