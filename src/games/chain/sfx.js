// צלילי השרשרת — הועתקו כמו שהם מ-ChainItHebrew.jsx
let _ctx = null;
function ctx() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) { try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}
function tone({ freq, duration = 0.12, type = 'sine', volume = 0.12, delay = 0 }) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator(), gain = a.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t); osc.stop(t + duration + 0.05);
}
export const SFX = {
  correct: () => { tone({ freq: 523 }); tone({ freq: 659, delay: 0.06 }); tone({ freq: 784, duration: 0.2, delay: 0.12 }); },
  wrong:   () => { tone({ freq: 175, type: 'sawtooth', volume: 0.07 }); tone({ freq: 120, type: 'sawtooth', volume: 0.07, delay: 0.08 }); },
  hint:    () => { tone({ freq: 880, duration: 0.08, volume: 0.07 }); tone({ freq: 1174, duration: 0.09, volume: 0.06, delay: 0.05 }); },
  finish:  () => {
    tone({ freq: 55, duration: 1.0, volume: 0.18 });
    [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, duration: 1.3, volume: 0.09, delay: 0.35 + i * 0.02 }));
    tone({ freq: 1568, duration: 0.12, volume: 0.07, delay: 0.6 });
    tone({ freq: 2093, duration: 0.12, volume: 0.06, delay: 0.75 });
  },
};
