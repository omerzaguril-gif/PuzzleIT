// מסך ניהול: חידות ויזואליות, פיצוח מילים ושרשראות. הכל נשמר ב-Supabase ומופיע לכל השחקנים מיד.
// כניסה: קישור במייל (Supabase Auth). הרשאת כתיבה נאכפת בשרת (RLS, public.is_admin()).
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Download, LogOut, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/store.js';
import {
  getPuzzles, getChains, getWords, loadContent, importSeed,
  savePuzzle, deletePuzzle, uploadPuzzleImage, saveChain, deleteChain, saveWord, deleteWord,
} from '../lib/content.js';
import { validatePuzzle, validateWord, validateChain, cleanSpaces, suggestLink } from '../lib/validate.js';
import { imageUrl, stageOf } from '../games/puzzlit/logic.js';
import { ADMIN_EMAIL } from '../games/wordcrack/wordbank.js';

const ADMIN_EMAILS = [ADMIN_EMAIL];
const inputCls = 'w-full rounded-xl border-2 border-[var(--hub-line)] bg-white px-3 py-2 outline-none focus:border-[var(--hub-ink)]';
const btnDark = 'px-4 py-2.5 rounded-xl bg-[var(--hub-ink)] text-white font-bold disabled:opacity-40';
const btnLight = 'px-4 py-2.5 rounded-xl bg-white border border-[var(--hub-line)] font-bold';

export default function Admin({ onBack }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user?.email?.toLowerCase();
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = window.location.pathname;
  };

  let body;
  if (!supabase) body = <Card>מסך הניהול זמין רק כשהאפליקציה מחוברת לשרת.</Card>;
  else if (session === undefined) body = <Card>טוען…</Card>;
  else if (!email) body = <Login />;
  else if (!ADMIN_EMAILS.includes(email)) {
    body = (
      <Card>
        <div className="mb-3">המייל <b dir="ltr">{email}</b> לא מורשה לניהול.</div>
        <button className={btnLight} onClick={signOut}>התנתקות</button>
      </Card>
    );
  } else body = <Panel email={email} onSignOut={signOut} />;

  return (
    <div dir="rtl" className="min-h-screen px-4 py-5">
      <div className="max-w-[640px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[var(--hub-line)]" aria-label="חזרה">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-black">ניהול</h1>
        </div>
        {body}
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-white border border-[var(--hub-line)] rounded-2xl p-5 leading-relaxed">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const send = async () => {
    const v = email.trim().toLowerCase();
    if (!v) return;
    setState({ status: 'sending' });
    const { error } = await supabase.auth.signInWithOtp({
      email: v,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}?admin=1` },
    });
    setState(error ? { status: 'error', msg: error.message } : { status: 'sent', email: v });
  };
  if (state.status === 'sent') {
    return <Card>נשלח מייל ל-<b dir="ltr">{state.email}</b>. פתחו אותו <b>בדפדפן הזה</b> ולחצו על הקישור.</Card>;
  }
  return (
    <Card>
      <label className="block font-bold mb-2" htmlFor="admin-email">כניסה למנהל</label>
      <input id="admin-email" type="email" dir="ltr" className={inputCls + ' mb-3'} placeholder="email@example.com"
        value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
      <button className={btnDark + ' w-full'} onClick={send} disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'שולח…' : 'שליחת קישור כניסה למייל'}
      </button>
      {state.status === 'error' && <div className="text-[#B14A4A] text-sm mt-2" dir="ltr">{state.msg}</div>}
    </Card>
  );
}

// ------------------------------------------------------------------ panel
function Panel({ email, onSignOut }) {
  const [tab, setTab] = useState('puzzles');
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('טוען תוכן…');

  useEffect(() => {
    (async () => {
      try {
        const empty = await loadContent();
        const kinds = Object.keys(empty).filter(k => empty[k]);
        if (kinds.length) {
          setMsg('מעלה את התוכן ההתחלתי לשרת (פעם אחת)…');
          for (const k of kinds) await importSeed(k);
          await loadContent();
        }
        setReady(true);
      } catch (e) {
        setMsg('שגיאה: ' + e.message);
      }
    })();
  }, []);

  const backup = () => {
    const data = { exportedAt: new Date().toISOString(), puzzles: getPuzzles(), chains: getChains(), words: getWords() };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `puzzleit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-[var(--hub-muted)]" dir="ltr">{email}</span>
        <div className="flex gap-2">
          <button onClick={backup} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[var(--hub-line)] font-semibold">
            <Download className="w-3.5 h-3.5" /> גיבוי
          </button>
          <button onClick={onSignOut} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[var(--hub-line)] font-semibold">
            <LogOut className="w-3.5 h-3.5" /> יציאה
          </button>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {[['puzzles', 'חידות ויזואליות'], ['words', 'פיצוח מילים'], ['chains', 'שרשרת']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold border ${tab === id ? 'bg-[var(--hub-ink)] text-white border-transparent' : 'bg-white border-[var(--hub-line)]'}`}>
            {label}
          </button>
        ))}
      </div>
      {!ready ? <Card>{msg}</Card>
        : tab === 'puzzles' ? <PuzzlesAdmin />
        : tab === 'words' ? <WordsAdmin />
        : <ChainsAdmin />}
    </>
  );
}

function Toolbar({ q, setQ, onAdd, addLabel, count }) {
  return (
    <div className="flex gap-2 mb-3">
      <div className="flex-1 relative">
        <Search className="w-4 h-4 absolute top-3 right-3 text-[var(--hub-muted)]" />
        <input className={inputCls + ' pr-9'} placeholder={`חיפוש (${count})`} value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <button className={btnDark + ' flex items-center gap-1 whitespace-nowrap'} onClick={onAdd}>
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}

function Errors({ list }) {
  if (!list?.length) return null;
  return (
    <ul className="bg-[#FDECEC] text-[#8f3838] rounded-xl p-3 text-sm space-y-1 mb-3 list-disc ps-6">
      {list.map((e, i) => <li key={i}>{e}</li>)}
    </ul>
  );
}

function DeleteButton({ onConfirm }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className={btnLight + ' text-[#B14A4A] flex items-center gap-1'} onClick={() => setAsk(true)}><Trash2 className="w-4 h-4" /> מחיקה</button>;
  return (
    <span className="flex gap-2 items-center">
      <span className="text-sm font-bold">למחוק?</span>
      <button className="px-3 py-2 rounded-xl bg-[#B14A4A] text-white font-bold" onClick={onConfirm}>כן</button>
      <button className={btnLight} onClick={() => setAsk(false)}>לא</button>
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-bold mb-1">{label}</span>
      {children}
    </label>
  );
}

const lines = s => s.split('\n').map(cleanSpaces).filter(Boolean);

// ------------------------------------------------------------------ puzzles
function PuzzlesAdmin() {
  const [, bump] = useState(0);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // puzzle object or 'new'
  const all = getPuzzles();
  const list = useMemo(() => {
    const t = q.trim();
    return t ? all.filter(p => String(p.num) === t || p.answer.primary.includes(t)) : all;
  }, [all, q]);

  if (editing) {
    return <PuzzleEditor puzzle={editing === 'new' ? null : editing} onDone={() => { setEditing(null); bump(n => n + 1); }} />;
  }
  return (
    <>
      <Toolbar q={q} setQ={setQ} onAdd={() => setEditing('new')} addLabel="חידה חדשה" count={all.length} />
      <div className="space-y-2">
        {list.map(p => (
          <button key={p.id} onClick={() => setEditing(p)}
            className="w-full flex items-center gap-3 bg-white border border-[var(--hub-line)] rounded-2xl p-2 text-right">
            <img src={imageUrl(p)} alt="" loading="lazy" className="w-14 h-14 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{p.answer.primary}</div>
              <div className="text-xs text-[var(--hub-muted)]">#{p.num} · רמה {p.level} · שלב {stageOf(p)}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function PuzzleEditor({ puzzle, onDone }) {
  const all = getPuzzles();
  const nextNum = Math.max(0, ...all.map(p => p.num)) + 1;
  const [f, setF] = useState(() => ({
    imageFile: puzzle?.imageFile || '',
    num: String(puzzle?.num ?? nextNum),
    level: String(puzzle?.level ?? 1),
    primary: puzzle?.answer.primary || '',
    accepted: (puzzle?.answer.accepted || []).join('\n'),
    hint1: puzzle?.hints['1'] || '',
    hint2: puzzle?.hints['2'] || '',
    steps: (puzzle?.explanation.steps || []).join('\n'),
    finalPhrase: puzzle?.explanation.finalPhrase || '',
  }));
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState('');
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));

  const upload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('מעלה תמונה…');
    try {
      const url = await uploadPuzzleImage(file);
      setF(s => ({ ...s, imageFile: url }));
    } catch (err) {
      setErrors(['העלאת התמונה נכשלה: ' + err.message]);
    }
    setBusy('');
  };

  const save = async () => {
    const num = Number(f.num);
    const primary = cleanSpaces(f.primary);
    const p = {
      id: puzzle?.id || (all.some(x => x.id === `p_${String(num).padStart(3, '0')}`) ? `p_${Date.now().toString(36)}` : `p_${String(num).padStart(3, '0')}`),
      num,
      level: Number(f.level),
      imageFile: f.imageFile,
      answer: { primary, accepted: lines(f.accepted) },
      hints: { 1: cleanSpaces(f.hint1), 2: cleanSpaces(f.hint2) },
      explanation: { steps: lines(f.steps), finalPhrase: cleanSpaces(f.finalPhrase) || primary },
    };
    const errs = validatePuzzle(p, all);
    setErrors(errs);
    if (errs.length) return;
    setBusy('שומר…');
    try {
      await savePuzzle(p);
      onDone();
    } catch (err) {
      setErrors(['השמירה נכשלה: ' + err.message]);
      setBusy('');
    }
  };

  const remove = async () => {
    setBusy('מוחק…');
    try { await deletePuzzle(puzzle.id); onDone(); } catch (err) { setErrors(['המחיקה נכשלה: ' + err.message]); setBusy(''); }
  };

  const preview = f.imageFile ? imageUrl({ imageFile: f.imageFile }) : null;

  return (
    <div className="bg-white border border-[var(--hub-line)] rounded-2xl p-4">
      <div className="font-black text-lg mb-3">{puzzle ? `עריכת חידה #${puzzle.num}` : 'חידה חדשה'}</div>
      <div className="flex gap-3 items-center mb-3">
        {preview
          ? <img src={preview} alt="" className="w-28 h-28 rounded-xl object-cover border border-[var(--hub-line)]" />
          : <div className="w-28 h-28 rounded-xl bg-[#F3F1EC] grid place-items-center text-sm text-[var(--hub-muted)]">אין תמונה</div>}
        <label className={btnLight + ' cursor-pointer'}>
          {preview ? 'החלפת תמונה' : 'העלאת תמונה'}
          <input type="file" accept="image/*" className="hidden" onChange={upload} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="מספר"><input className={inputCls} inputMode="numeric" value={f.num} onChange={set('num')} /></Field>
        <Field label="רמה (1–10)">
          <select className={inputCls} value={f.level} onChange={set('level')}>
            {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </Field>
      </div>
      <Field label="תשובה"><input className={inputCls} value={f.primary} onChange={set('primary')} /></Field>
      <Field label="תשובות נוספות שמתקבלות (שורה לכל אחת, לא חובה)"><textarea className={inputCls} rows={2} value={f.accepted} onChange={set('accepted')} /></Field>
      <Field label="רמז 1"><input className={inputCls} value={f.hint1} onChange={set('hint1')} /></Field>
      <Field label="רמז 2"><input className={inputCls} value={f.hint2} onChange={set('hint2')} /></Field>
      <Field label="הסבר: שלב בכל שורה"><textarea className={inputCls} rows={3} value={f.steps} onChange={set('steps')} /></Field>
      <Field label="משפט סיום (ריק = התשובה)"><input className={inputCls} value={f.finalPhrase} onChange={set('finalPhrase')} /></Field>
      <Errors list={errors} />
      <div className="flex flex-wrap gap-2 items-center">
        <button className={btnDark} onClick={save} disabled={!!busy}>{busy || 'שמירה'}</button>
        <button className={btnLight} onClick={onDone} disabled={!!busy}>ביטול</button>
        <span className="flex-1" />
        {puzzle && <DeleteButton onConfirm={remove} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ word crack
function WordsAdmin() {
  const [, bump] = useState(0);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const all = getWords();
  const t = q.trim();
  const list = t ? all.filter(w => w.word.includes(t) || w.clues.some(c => c.includes(t))) : all;

  if (editing) {
    return <WordEditor word={editing === 'new' ? null : editing} onDone={() => { setEditing(null); bump(n => n + 1); }} />;
  }
  return (
    <>
      <Toolbar q={q} setQ={setQ} onAdd={() => setEditing('new')} addLabel="מילה חדשה" count={all.length} />
      <div className="space-y-1.5">
        {list.map(w => (
          <button key={w.word} onClick={() => setEditing(w)}
            className="w-full bg-white border border-[var(--hub-line)] rounded-xl px-3 py-2 text-right">
            <div className="font-bold">{w.word}</div>
            <div className="text-xs text-[var(--hub-muted)] truncate">{w.clues.join(' • ')}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function WordEditor({ word, onDone }) {
  const [w, setW] = useState(word?.word || '');
  const [clues, setClues] = useState(word?.clues ? [...word.clues] : ['', '', '', '', '']);
  const [accepts, setAccepts] = useState((word?.accepts || []).join(', '));
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState('');

  const move = (i, d) => setClues(c => { const n = [...c]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });

  const save = async () => {
    const obj = {
      word: cleanSpaces(w),
      clues: clues.map(cleanSpaces),
      accepts: accepts.split(/[,\n]/).map(cleanSpaces).filter(Boolean),
    };
    const errs = validateWord(obj, getWords(), word?.word);
    setErrors(errs);
    if (errs.length) return;
    setBusy('שומר…');
    try { await saveWord(obj, word?.word); onDone(); } catch (err) { setErrors(['השמירה נכשלה: ' + err.message]); setBusy(''); }
  };
  const remove = async () => {
    setBusy('מוחק…');
    try { await deleteWord(word.word); onDone(); } catch (err) { setErrors(['המחיקה נכשלה: ' + err.message]); setBusy(''); }
  };

  return (
    <div className="bg-white border border-[var(--hub-line)] rounded-2xl p-4">
      <div className="font-black text-lg mb-3">{word ? `עריכת "${word.word}"` : 'מילה חדשה'}</div>
      <Field label="המילה הסודית"><input className={inputCls} value={w} onChange={e => setW(e.target.value)} /></Field>
      <div className="text-sm font-bold mb-1">רמזים (מהספציפי לכללי, מילה אחת כל רמז)</div>
      {clues.map((c, i) => (
        <div key={i} className="flex gap-2 items-center mb-2">
          <span className="w-4 text-sm text-[var(--hub-muted)]">{i + 1}.</span>
          <input className={inputCls} value={c} onChange={e => setClues(cs => cs.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="p-2 rounded-lg bg-[#F3F1EC] disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="למעלה"><ArrowUp className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg bg-[#F3F1EC] disabled:opacity-30" disabled={i === 4} onClick={() => move(i, 1)} aria-label="למטה"><ArrowDown className="w-4 h-4" /></button>
        </div>
      ))}
      <Field label="תשובות נוספות שמתקבלות (מופרדות בפסיק, לא חובה)">
        <input className={inputCls} value={accepts} onChange={e => setAccepts(e.target.value)} />
      </Field>
      <Errors list={errors} />
      <div className="flex flex-wrap gap-2 items-center">
        <button className={btnDark} onClick={save} disabled={!!busy}>{busy || 'שמירה'}</button>
        <button className={btnLight} onClick={onDone} disabled={!!busy}>ביטול</button>
        <span className="flex-1" />
        {word && <DeleteButton onConfirm={remove} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ chains
function ChainsAdmin() {
  const [, bump] = useState(0);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const all = getChains();
  const t = q.trim();
  const list = all.map((c, i) => ({ c, i })).filter(({ c }) => !t || c.words.some(x => x.word.includes(t)));

  if (editing) {
    return <ChainEditor chain={editing === 'new' ? null : editing} onDone={() => { setEditing(null); bump(n => n + 1); }} />;
  }
  return (
    <>
      <Toolbar q={q} setQ={setQ} onAdd={() => setEditing('new')} addLabel="שרשרת חדשה" count={all.length} />
      <div className="space-y-1.5">
        {list.map(({ c, i }) => (
          <button key={c.id} onClick={() => setEditing(c)}
            className="w-full bg-white border border-[var(--hub-line)] rounded-xl px-3 py-2 text-right">
            <div className="font-bold">שרשרת {i + 1} · {c.difficulty}{c.theme ? ` · ${c.theme}` : ''}</div>
            <div className="text-xs text-[var(--hub-muted)] truncate">{c.words.map(x => x.word).join(' → ')}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function ChainEditor({ chain, onDone }) {
  const [difficulty, setDifficulty] = useState(chain?.difficulty || 'בינוני');
  const [theme, setTheme] = useState(chain?.theme || '');
  const [words, setWords] = useState(() => (chain?.words || [{ word: '', given: true }, { word: '' }, { word: '' }, { word: '' }, { word: '' }])
    .map(x => ({ word: x.word || '', link: x.link || '', displayWord: x.displayWord || '' })));
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState('');

  const setAt = (i, k, v) => setWords(ws => ws.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const build = () => words.map((x, i) => {
    const o = { word: cleanSpaces(x.word) };
    if (i === 0) o.given = true;
    const dw = cleanSpaces(x.displayWord);
    if (dw && dw !== o.word) o.displayWord = dw;
    return o;
  }).map((o, i, arr) => {
    if (i === 0) return o;
    const link = cleanSpaces(words[i].link) || suggestLink(arr[i - 1], o);
    return { ...o, link };
  });

  const save = async () => {
    const c = { id: chain?.id || `ch_${Date.now().toString(36)}`, difficulty, theme: cleanSpaces(theme), words: build() };
    const errs = validateChain(c);
    setErrors(errs);
    if (errs.length) return;
    setBusy('שומר…');
    try { await saveChain(c); onDone(); } catch (err) { setErrors(['השמירה נכשלה: ' + err.message]); setBusy(''); }
  };
  const remove = async () => {
    setBusy('מוחק…');
    try { await deleteChain(chain.id); onDone(); } catch (err) { setErrors(['המחיקה נכשלה: ' + err.message]); setBusy(''); }
  };

  return (
    <div className="bg-white border border-[var(--hub-line)] rounded-2xl p-4">
      <div className="font-black text-lg mb-3">{chain ? 'עריכת שרשרת' : 'שרשרת חדשה'}</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="רמת קושי">
          <select className={inputCls} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            {['קל', 'בינוני', 'קשה'].map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="נושא (לא מוצג לשחקן)"><input className={inputCls} value={theme} onChange={e => setTheme(e.target.value)} /></Field>
      </div>
      <div className="text-sm font-bold mb-2">מילים (5 עד 10)</div>
      <div className="space-y-2 mb-3">
        {words.map((x, i) => (
          <div key={i} className="rounded-xl bg-[#F8F6F1] p-2.5">
            <div className="flex gap-2 items-center">
              <span className="w-5 text-sm text-[var(--hub-muted)]">{i + 1}.</span>
              <input className={inputCls} placeholder={i === 0 ? 'מילת פתיחה' : 'מילה'} value={x.word} onChange={e => setAt(i, 'word', e.target.value)} />
              <input className={inputCls + ' max-w-[38%]'} placeholder="צורת סמיכות" value={x.displayWord} onChange={e => setAt(i, 'displayWord', e.target.value)} />
              {words.length > 5 && (
                <button className="p-2 rounded-lg bg-white border border-[var(--hub-line)]" onClick={() => setWords(ws => ws.filter((_, j) => j !== i))} aria-label="הסרה">
                  <Trash2 className="w-4 h-4 text-[#B14A4A]" />
                </button>
              )}
            </div>
            {i > 0 && (
              <input className={inputCls + ' mt-2'} value={x.link}
                placeholder={`צירוף: ${suggestLink({ word: cleanSpaces(words[i - 1].word), displayWord: cleanSpaces(words[i - 1].displayWord) }, { word: cleanSpaces(x.word) })}`}
                onChange={e => setAt(i, 'link', e.target.value)} />
            )}
          </div>
        ))}
      </div>
      {words.length < 10 && (
        <button className={btnLight + ' mb-3 flex items-center gap-1'} onClick={() => setWords(ws => [...ws, { word: '', link: '', displayWord: '' }])}>
          <Plus className="w-4 h-4" /> הוספת מילה
        </button>
      )}
      <Errors list={errors} />
      <div className="flex flex-wrap gap-2 items-center">
        <button className={btnDark} onClick={save} disabled={!!busy}>{busy || 'שמירה'}</button>
        <button className={btnLight} onClick={onDone} disabled={!!busy}>ביטול</button>
        <span className="flex-1" />
        {chain && <DeleteButton onConfirm={remove} />}
      </div>
    </div>
  );
}
