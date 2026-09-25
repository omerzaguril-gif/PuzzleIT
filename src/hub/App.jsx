import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, User, Wrench } from 'lucide-react';
import { store, isShared } from '../lib/store.js';
import { GAME_LIST, GAMES_BY_ID } from './games.js';
import GameShell from './GameShell.jsx';
import Admin from './Admin.jsx';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState({ name: 'home' });

  useEffect(() => {
    (async () => {
      try {
        setProfile(await store.init());
        setTotal(await store.getTotal());
      } catch (e) {
        setError(e.message || String(e));
      }
    })();
  }, []);

  // כל משחק מדווח נקודות Hub דרך הפונקציה הזו. הן מצטברות לניקוד כולל אחד.
  const onScore = useCallback(async (game, points, meta) => {
    if (!points) return;
    setTotal(t => t + points);
    try {
      await store.addScore(game, points, meta);
    } catch (e) {
      console.error('addScore failed', e);
    }
  }, []);

  const home = () => setScreen({ name: 'home' });

  if (error) {
    return <Center><div className="text-center"><div className="text-xl font-bold mb-2">לא הצלחנו להתחבר לשרת</div><div className="text-sm text-[#7A756C]" dir="ltr">{error}</div></div></Center>;
  }
  if (!profile) return <Center><div className="text-[#7A756C]">טוען…</div></Center>;

  if (screen.name === 'game') {
    const game = GAMES_BY_ID[screen.id];
    return (
      <GameShell key={screen.key} game={game} onExit={home}
        onScore={(points, meta) => onScore(game.id, points, meta)} />
    );
  }
  if (screen.name === 'leaderboard') return <Leaderboard profile={profile} onBack={home} />;
  if (screen.name === 'profile') {
    return <Profile profile={profile} total={total} onBack={home}
      onRename={async name => { await store.setDisplayName(name); setProfile(p => ({ ...p, displayName: name })); }} />;
  }
  if (screen.name === 'admin') return <Admin onBack={home} />;

  return (
    <div dir="rtl" className="min-h-screen px-4 py-6">
      <div className="max-w-[460px] mx-auto">
        <div className="flex items-center justify-between mb-7">
          <button onClick={() => setScreen({ name: 'profile' })}
            className="flex items-center gap-2 bg-white border border-[var(--hub-line)] rounded-2xl ps-2 pe-3 py-1.5">
            <span className="w-7 h-7 rounded-full bg-[var(--hub-ink)] text-white grid place-items-center"><User className="w-4 h-4" /></span>
            <span className="text-sm font-semibold" dir="ltr">{profile.displayName}</span>
          </button>
          <div className="text-left">
            <div className="text-[11px] text-[var(--hub-muted)] font-semibold">ניקוד כולל</div>
            <div className="text-2xl font-black leading-none">{total.toLocaleString('he-IL')}</div>
          </div>
        </div>

        <h1 className="text-center text-4xl font-black tracking-tight mb-1">PuzzleIT</h1>
        <p className="text-center text-[var(--hub-muted)] mb-7">שלושה משחקי מילים. ניקוד אחד.</p>

        <div className="space-y-3.5">
          {GAME_LIST.map(g => (
            <GameTile key={g.id} game={g} onClick={() => setScreen({ name: 'game', id: g.id, key: Date.now() })} />
          ))}
        </div>

        <button onClick={() => setScreen({ name: 'leaderboard' })}
          className="w-full mt-5 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--hub-ink)] text-white font-bold text-lg">
          <Trophy className="w-5 h-5" /> טבלת הליגה
        </button>

        <div className="text-center text-xs text-[var(--hub-muted)] mt-4">
          {isShared ? '🟢 מחובר לליגה המשותפת' : '⚪ מצב מקומי: הניקוד נשמר רק במכשיר הזה'}
        </div>

        <button onClick={() => setScreen({ name: 'admin' })}
          className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-[var(--hub-muted)]">
          <Wrench className="w-3.5 h-3.5" /> ניהול
        </button>
      </div>
    </div>
  );
}

function GameTile({ game, onClick }) {
  const t = game.theme;
  const bg = t.dark
    ? 'radial-gradient(ellipse at top,#1B1B3A 0%,transparent 60%),#08081A'
    : t.bar;
  return (
    <button onClick={onClick}
      className="w-full text-right rounded-3xl p-5 flex items-center gap-4 border-[1.5px] shadow-[0_10px_30px_rgba(43,42,40,0.06)] transition-transform hover:-translate-y-0.5"
      style={{ background: bg, borderColor: t.dark ? '#22D3EE55' : t.line, color: t.ink }}>
      <div className="w-14 h-14 shrink-0 rounded-2xl grid place-items-center text-3xl"
        style={{ background: t.dark ? 'linear-gradient(135deg,#22D3EE,#8B5CF6)' : `${t.accent}1f` }}>
        {game.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold" style={{ fontFamily: t.font }}>{game.title}</div>
        <div className="text-sm" style={{ color: t.muted }}>{game.subtitle}</div>
      </div>
      <ChevronLeft className="w-5 h-5 shrink-0" style={{ color: t.muted }} />
    </button>
  );
}

function Leaderboard({ profile, onBack }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { store.getLeaderboard().then(setRows).catch(() => setRows([])); }, []);
  return (
    <Page title="טבלת הליגה" onBack={onBack}>
      {!isShared && (
        <div className="text-sm bg-[#FFF6E0] border border-[#F0DDA8] rounded-2xl p-3 mb-4 leading-relaxed">
          מצב מקומי: הטבלה מציגה רק את המכשיר הזה. ליגה משותפת לכל המשתמשים תופעל אחרי חיבור Supabase.
        </div>
      )}
      {!rows ? <div className="text-center text-[var(--hub-muted)]">טוען…</div> : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const me = r.userId === profile.id;
            return (
              <li key={r.userId} className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${me ? 'bg-[var(--hub-ink)] text-white border-transparent' : 'bg-white border-[var(--hub-line)]'}`}>
                <span className="w-7 text-center font-black">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <span className="flex-1 font-semibold truncate" dir="ltr" style={{ textAlign: 'right' }}>{r.displayName}{me && ' (את/ה)'}</span>
                <span className="font-black">{r.total.toLocaleString('he-IL')}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Page>
  );
}

function Profile({ profile, total, onBack, onRename }) {
  const [name, setName] = useState(profile.displayName);
  const [msg, setMsg] = useState('');
  const save = async () => {
    const v = name.trim();
    if (v.length < 2 || v.length > 24) { setMsg('שם בין 2 ל-24 תווים'); return; }
    try { await onRename(v); setMsg('נשמר ✓'); } catch { setMsg('השמירה נכשלה'); }
  };
  return (
    <Page title="הפרופיל שלי" onBack={onBack}>
      <div className="bg-white border border-[var(--hub-line)] rounded-3xl p-5 mb-4 text-center">
        <div className="text-sm text-[var(--hub-muted)]">ניקוד כולל</div>
        <div className="text-4xl font-black">{total.toLocaleString('he-IL')}</div>
      </div>
      <label className="block text-sm font-semibold mb-1.5">שם תצוגה בליגה</label>
      <div className="flex gap-2">
        <input value={name} onChange={e => { setName(e.target.value); setMsg(''); }}
          className="flex-1 rounded-xl border-2 border-[var(--hub-line)] px-3 py-2.5 bg-white outline-none focus:border-[var(--hub-ink)]" />
        <button onClick={save} className="px-5 rounded-xl bg-[var(--hub-ink)] text-white font-bold">שמירה</button>
      </div>
      <div className="text-sm text-[var(--hub-muted)] mt-2 min-h-5">{msg}</div>
      <p className="text-sm text-[var(--hub-muted)] mt-4 leading-relaxed">
        {profile.isAnonymous
          ? 'אתם משחקים כאורחים. הרשמה עם אימייל (כדי לשמור את הניקוד בין מכשירים) תתווסף בשלב הבא.'
          : ''}
      </p>
    </Page>
  );
}

function Page({ title, onBack, children }) {
  return (
    <div dir="rtl" className="min-h-screen px-4 py-5">
      <div className="max-w-[460px] mx-auto">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[var(--hub-line)]" aria-label="חזרה">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-black">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div dir="rtl" className="min-h-screen grid place-items-center p-6">{children}</div>;
}
