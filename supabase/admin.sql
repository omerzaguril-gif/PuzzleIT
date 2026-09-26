-- ============================================================
-- PuzzleIT: תוכן המשחקים + מסך ניהול
-- מריצים פעם אחת ב-Supabase: SQL Editor → New query → הדבקה → Run.
-- (אחרי schema.sql)
-- ============================================================

-- מנהל = המשתמש שמחובר עם המייל הזה.
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in ('omerzaguril@gmail.com')
$$;

-- ---------------------------------------------------------------- PUZZLIT
create table if not exists public.puzzles (
  id           text primary key,                -- "p_002". קבוע, לא ממוחזר
  num          integer not null unique,         -- המספר שמוצג לשחקן
  level        integer not null check (level between 1 and 10),
  image        text not null,                   -- שם קובץ מהאתר ("2.jpg") או כתובת מלאה מ-Storage
  answer       jsonb not null,                  -- { primary, accepted[] }
  hints        jsonb not null,                  -- { "1": "...", "2": "..." }
  explanation  jsonb not null,                  -- { steps[], finalPhrase }
  archived     boolean not null default false,  -- בארכיון = לא מוצגת במשחק
  updated_at   timestamptz not null default now(),
  constraint puzzles_answer_hebrew check ((answer ->> 'primary') ~ '^[א-ת ]+$')
);

-- ---------------------------------------------------------------- שרשרת
create table if not exists public.chains (
  id          text primary key,
  sort        integer not null default 0,
  difficulty  text not null check (difficulty in ('קל', 'בינוני', 'קשה')),
  theme       text,                             -- פנימי, לא מוצג לשחקן
  words       jsonb not null,                   -- [{ word, given?, link?, displayWord? }]
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- פיצוח מילים
create table if not exists public.wordcrack_words (
  word        text primary key,
  sort        integer not null default 0,
  clues       jsonb not null,                   -- 5 רמזים, מהספציפי לכללי
  accepts     jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- הרשאות
alter table public.puzzles enable row level security;
alter table public.chains enable row level security;
alter table public.wordcrack_words enable row level security;

create policy "puzzles readable" on public.puzzles for select using (true);
create policy "puzzles admin write" on public.puzzles for all using (public.is_admin()) with check (public.is_admin());

create policy "chains readable" on public.chains for select using (true);
create policy "chains admin write" on public.chains for all using (public.is_admin()) with check (public.is_admin());

create policy "words readable" on public.wordcrack_words for select using (true);
create policy "words admin write" on public.wordcrack_words for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- תמונות
insert into storage.buckets (id, name, public)
values ('puzzle-images', 'puzzle-images', true)
on conflict (id) do nothing;

create policy "puzzle images admin insert" on storage.objects for insert
  with check (bucket_id = 'puzzle-images' and public.is_admin());
create policy "puzzle images admin update" on storage.objects for update
  using (bucket_id = 'puzzle-images' and public.is_admin());
create policy "puzzle images admin delete" on storage.objects for delete
  using (bucket_id = 'puzzle-images' and public.is_admin());

-- נוסף ב-26.9.2026 (לפרויקטים שהריצו את הקובץ לפני כן):
alter table public.puzzles add column if not exists archived boolean not null default false;
