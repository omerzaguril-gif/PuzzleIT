// מסך ניהול. כרגע: עורך הרמזים של פיצוח מילים (הועבר כמו שהוא מהקובץ המקורי).
// ניהול חידות ויזואליות ושרשראות יתווסף אחרי חיבור Supabase (צריך אחסון משותף לתמונות ולשיבוץ).
// ⚠️ שער האימייל הוא נוחות, לא אבטחה: אין כאן אימות אמיתי. אבטחה אמיתית תגיע עם Supabase Auth + RLS.
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import '../games/wordcrack/wordcrack.css';
import { ADMIN_EMAIL, loadOverrides, saveOverrides, getEffectiveWords } from '../games/wordcrack/wordbank.js';

const ADMIN_EMAILS = [ADMIN_EMAIL];

export default function Admin({ onBack }) {
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState('wordcrack');
  if (!ok) return <Gate onBack={onBack} onOk={() => setOk(true)} />;

  return (
    <div dir="rtl" className="min-h-screen px-4 py-5">
      <div className="max-w-[560px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-white border border-[var(--hub-line)]" aria-label="חזרה">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-black">ניהול</h1>
        </div>
        <div className="flex gap-2 mb-4">
          {[['wordcrack', 'פיצוח מילים'], ['puzzlit', 'חידות ויזואליות'], ['chain', 'שרשרת']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold border ${tab === id ? 'bg-[var(--hub-ink)] text-white border-transparent' : 'bg-white border-[var(--hub-line)]'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'wordcrack' ? <WordCrackAdmin /> : (
          <div className="bg-white border border-[var(--hub-line)] rounded-2xl p-5 text-[var(--hub-muted)] leading-relaxed">
            בקרוב. ניהול {tab === 'puzzlit' ? 'החידות (הוספה, הסרה והעלאת תמונות)' : 'השרשראות (לוח שנה ושיבוץ יומי)'} יתווסף אחרי חיבור Supabase.
          </div>
        )}
      </div>
    </div>
  );
}

function Gate({ onBack, onOk }) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const tryEnter = () => {
    if (ADMIN_EMAILS.includes(email.trim().toLowerCase())) onOk();
    else setErr('כתובת מייל לא מורשית');
  };
  return (
    <div className="wc">
      <div className="wrap">
        <div className="overlay">
          <h2>ניהול</h2>
          <p className="admin-gate-text">הזינו את כתובת המייל המורשית כדי לערוך את המאגרים.</p>
          <input type="email" id="adminEmailInput" placeholder="כתובת מייל" autoComplete="off" value={email}
            onChange={e => { setEmail(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && tryEnter()} />
          <div className="feedback" style={{ color: 'var(--bad)' }}>{err || ' '}</div>
          <button className="big-btn" onClick={tryEnter}>כניסה</button>
          <button className="secondary-btn" onClick={onBack}>חזרה לתפריט</button>
        </div>
      </div>
    </div>
  );
}

function WordCrackAdmin() {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [exportText, setExportText] = useState(null);
  const [, bump] = useState(0);
  const refresh = () => bump(n => n + 1);

  const ov = loadOverrides();
  const words = getEffectiveWords();
  const filtered = q.trim() ? words.filter(w => w.word.includes(q.trim())) : words;

  const persist = (word, clues) => {
    const o = loadOverrides();
    o[word] = { clues };
    saveOverrides(o);
    refresh();
  };
  const reset = word => {
    const o = loadOverrides();
    delete o[word];
    saveOverrides(o);
    refresh();
  };
  const openExport = () => {
    const lines = getEffectiveWords().map(w =>
      '  { word: ' + JSON.stringify(w.word) + ', clues: ' + JSON.stringify(w.clues) + ', accepts: ' + JSON.stringify(w.accepts) + ' },');
    setExportText('const WORDS_DEFAULT = [\n' + lines.join('\n') + '\n];');
  };

  return (
    <div className="wc" style={{ display: 'block', padding: 0, minHeight: 0, background: 'transparent' }}>
      <div className="admin-header">
        <div className="admin-header-title">ניהול רמזים <span>({words.length} מילים)</span></div>
        <button className="admin-export-btn" onClick={openExport}>ייצוא מאגר מעודכן</button>
      </div>
      <input type="text" className="admin-search" placeholder="חיפוש מילה..." value={q} onChange={e => setQ(e.target.value)} />
      <div className="admin-list" style={{ maxWidth: 'none' }}>
        {filtered.length === 0 && <div className="report-empty">לא נמצאו מילים תואמות</div>}
        {filtered.map(w => {
          const open = expanded === w.word;
          const toggle = () => setExpanded(open ? null : w.word);
          return (
            <div className="admin-word-row" key={w.word}>
              <div className="admin-word-head" onClick={toggle}>
                <span className={'admin-word-name' + (ov[w.word] ? ' overridden' : '')}>{w.word}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
              </div>
              <div className="admin-word-preview" onClick={toggle}>{w.clues.join(' • ')}</div>
              {open && (
                <div className="admin-word-editor" onClick={e => e.stopPropagation()}>
                  {w.clues.map((clue, i) => (
                    <div className="admin-clue-row" key={w.word + i + clue}>
                      <span className="admin-clue-num">{i + 1}.</span>
                      <input type="text" className="admin-clue-input" defaultValue={clue}
                        onBlur={e => {
                          const v = e.target.value.trim() || clue;
                          if (v !== clue) { const n = [...w.clues]; n[i] = v; persist(w.word, n); }
                        }} />
                      <div className="admin-reorder-btns">
                        <button disabled={i === 0} onClick={() => { const n = [...w.clues]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; persist(w.word, n); }}>↑</button>
                        <button disabled={i === w.clues.length - 1} onClick={() => { const n = [...w.clues]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; persist(w.word, n); }}>↓</button>
                      </div>
                    </div>
                  ))}
                  <div className="admin-word-actions">
                    <button className="admin-reset-btn" onClick={() => reset(w.word)}>איפוס לברירת מחדל</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {exportText != null && (
        <div className="modal-backdrop">
          <div className="modal-card export-modal-card">
            <div className="modal-title">ייצוא מאגר מעודכן</div>
            <p className="modal-text">זהו כל מאגר המילים, כולל כל העריכות שביצעת. העתיקו והדביקו את זה בחזרה לקלוד אם תרצו שאשלב את זה לצמיתות בקובץ.</p>
            <textarea className="export-textarea" readOnly value={exportText} />
            <div className="modal-btn-row">
              <button className="modal-btn" onClick={() => navigator.clipboard?.writeText(exportText)}>העתק</button>
              <button className="modal-btn" onClick={() => setExportText(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
