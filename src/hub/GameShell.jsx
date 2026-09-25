import React, { useState } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';

// מעטפת אחידה לכל משחק:
//   - מסך "איך משחקים" בכניסה, עם כפתור "הבנתי".
//   - פס עליון קבוע: חזרה ל-Hub + כפתור ? שפותח שוב את ההסבר בלי לאפס את המשחק.
//   - בזמן שההסבר או אישור היציאה פתוחים, המשחק מקבל paused=true (טיימרים עוצרים).
export default function GameShell({ game, onExit, onScore }) {
  const [phase, setPhase] = useState('intro');
  const [help, setHelp] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const t = game.theme;
  const paused = help || confirmExit;
  const { Component } = game;

  const back = () => (phase === 'play' && inProgress ? setConfirmExit(true) : onExit());

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: t.bar, color: t.ink }}>
      <header className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 border-b"
        style={{ background: t.bar, borderColor: t.line }}>
        <button onClick={back} className="flex items-center gap-1 text-sm font-semibold px-2 py-1.5 rounded-xl"
          style={{ color: t.muted }}>
          <ChevronRight className="w-4 h-4" />
          <span>לתפריט</span>
        </button>
        <div className="font-bold text-base" style={{ fontFamily: t.font }}>{game.title}</div>
        <button onClick={() => phase === 'play' && setHelp(true)} aria-label="איך משחקים"
          className="p-1.5 rounded-xl" style={{ color: t.muted, visibility: phase === 'play' ? 'visible' : 'hidden' }}>
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 relative">
        {phase === 'intro' ? (
          <div className="px-4 py-8 flex justify-center">
            <RulesCard game={game} onOk={() => setPhase('play')} okText="הבנתי, בואו נשחק!" />
          </div>
        ) : (
          <Component
            paused={paused}
            onExit={onExit}
            onScore={onScore}
            setInProgress={setInProgress}
          />
        )}
      </main>

      {help && (
        <Backdrop>
          <RulesCard game={game} onOk={() => setHelp(false)} okText="הבנתי, חזרה למשחק" />
        </Backdrop>
      )}

      {confirmExit && (
        <Backdrop>
          <div className="bg-white text-[#1C1B1A] rounded-2xl p-6 max-w-[340px] w-full text-center shadow-2xl hub-pop">
            <div className="text-xl font-bold mb-2">לצאת מהמשחק?</div>
            <p className="text-sm text-[#7A756C] leading-relaxed mb-5">{game.exitText}</p>
            <div className="flex gap-2.5">
              <button onClick={() => { setConfirmExit(false); onExit(); }}
                className="flex-1 py-3 rounded-xl font-bold bg-[#B14A4A] text-white">כן, צא</button>
              <button onClick={() => setConfirmExit(false)}
                className="flex-1 py-3 rounded-xl font-bold bg-[#EDE8DD]">לא, המשך לשחק</button>
            </div>
          </div>
        </Backdrop>
      )}
    </div>
  );
}

function Backdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-5">{children}</div>
  );
}

function RulesCard({ game, onOk, okText }) {
  const t = game.theme;
  return (
    <div className="w-full max-w-[440px] rounded-3xl p-7 text-center shadow-xl hub-pop"
      style={{ background: t.dark ? '#14142B' : '#FFFFFF', color: t.ink, border: `1.5px solid ${t.line}` }}>
      <div className="text-4xl mb-2">{game.icon}</div>
      <h2 className="text-2xl font-black mb-4" style={{ fontFamily: t.font }}>איך משחקים</h2>
      <ul className="text-right list-disc ps-5 mb-6 space-y-2 text-[15px] leading-relaxed">
        {game.rules.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      <button onClick={onOk} className="w-full py-4 rounded-2xl text-lg font-bold"
        style={{ background: t.dark ? 'linear-gradient(135deg,#22D3EE,#8B5CF6)' : t.ink, color: t.dark ? '#fff' : t.bar }}>
        {okText}
      </button>
    </div>
  );
}
