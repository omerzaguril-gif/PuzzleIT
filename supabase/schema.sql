-- ============================================================
-- PuzzleIT: סכמה משותפת ל-Hub (משתמשים, ניקוד, ליגה, התקדמות)
-- מריצים פעם אחת ב-Supabase: SQL Editor → New query → הדבקה → Run.
-- בנוסף: Authentication → Sign In / Providers → להפעיל "Allow anonymous sign-ins".
-- ============================================================

-- פרופיל לכל משתמש (כולל אנונימיים). display_name ברירת מחדל: user + 10 ספרות (נקבע בקליינט).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 24),
  is_anonymous  boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select using (true);
create policy "insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- כל פעם שמשתמש מקבל נקודות Hub ממשחק.
create table if not exists public.score_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game        text not null check (game in ('wordcrack', 'puzzlit', 'chain')),
  points      integer not null check (points >= 0 and points <= 1000),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists score_events_user_idx on public.score_events(user_id);

alter table public.score_events enable row level security;

create policy "own score events readable"
  on public.score_events for select using (auth.uid() = user_id);
create policy "insert own score events"
  on public.score_events for insert with check (auth.uid() = user_id);

-- הליגה: סכום הנקודות של כל משתמש. security definer כדי שכל אחד יראה את הסכומים של כולם
-- בלי לראות את האירועים הבודדים.
create or replace view public.leaderboard
with (security_invoker = false) as
  select p.id as user_id,
         p.display_name,
         coalesce(sum(e.points), 0)::integer as total
  from public.profiles p
  left join public.score_events e on e.user_id = p.id
  group by p.id, p.display_name;

grant select on public.leaderboard to anon, authenticated;

-- התקדמות בכל משחק (חידות שנפתרו, השרשרת של היום וכו'). אובייקט JSON חופשי לכל משחק.
create table if not exists public.game_progress (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game        text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, game)
);

alter table public.game_progress enable row level security;

create policy "own progress"
  on public.game_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
