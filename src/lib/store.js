// ============================================================
// שכבת הנתונים של ה-Hub: משתמש, ניקוד, ליגה והתקדמות בכל משחק.
// ============================================================
// שני מצבים עם אותו API:
//   - Supabase: כשמוגדרים VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY. ליגה משותפת לכל המשתמשים.
//   - מקומי: בלי הגדרות. הכל נשמר ב-localStorage של הדפדפן, והליגה מציגה רק את המכשיר הזה.
// הסכמה של Supabase נמצאת ב-supabase/schema.sql.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isShared = Boolean(SUPABASE_URL && SUPABASE_KEY);

// שם גנרי למשתמש שלא נרשם: user + 10 ספרות.
export function genericName() {
  let digits = String(Math.floor(1 + Math.random() * 9));
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  return 'user' + digits;
}

// ---------------------------------------------------------------- local
const LOCAL_KEY = 'puzzleit_v1';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || null;
  } catch {
    return null;
  }
}
function writeLocal(state) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch { /* storage full or blocked: the session keeps working in memory */ }
}

function createLocalStore() {
  let state = readLocal();
  if (!state) {
    state = {
      profile: { id: 'local-' + Date.now().toString(36), displayName: genericName(), isAnonymous: true },
      events: [],
      progress: {},
    };
    writeLocal(state);
  }
  const total = () => state.events.reduce((s, e) => s + e.points, 0);

  return {
    async init() {
      return { ...state.profile };
    },
    async setDisplayName(name) {
      state.profile.displayName = name;
      writeLocal(state);
    },
    async addScore(game, points, meta = {}) {
      state.events.push({ game, points, meta, at: new Date().toISOString() });
      writeLocal(state);
    },
    async getTotal() {
      return total();
    },
    async getLeaderboard() {
      return [{ userId: state.profile.id, displayName: state.profile.displayName, total: total() }];
    },
    async loadProgress(game) {
      return state.progress[game] ?? null;
    },
    async saveProgress(game, data) {
      state.progress[game] = data;
      writeLocal(state);
    },
  };
}

// ---------------------------------------------------------------- supabase
function createSupabaseStore() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  let userId = null;

  return {
    async init() {
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      userId = session.user.id;

      let { data: profile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!profile) {
        const row = { id: userId, display_name: genericName(), is_anonymous: session.user.is_anonymous ?? true };
        const { data, error } = await sb.from('profiles').insert(row).select().single();
        if (error) throw error;
        profile = data;
      }
      return { id: profile.id, displayName: profile.display_name, isAnonymous: profile.is_anonymous };
    },
    async setDisplayName(name) {
      const { error } = await sb.from('profiles').update({ display_name: name }).eq('id', userId);
      if (error) throw error;
    },
    async addScore(game, points, meta = {}) {
      const { error } = await sb.from('score_events').insert({ user_id: userId, game, points, meta });
      if (error) throw error;
    },
    async getTotal() {
      const { data } = await sb.from('leaderboard').select('total').eq('user_id', userId).maybeSingle();
      return data?.total ?? 0;
    },
    async getLeaderboard() {
      const { data, error } = await sb.from('leaderboard').select('*').order('total', { ascending: false }).limit(100);
      if (error) throw error;
      return data.map(r => ({ userId: r.user_id, displayName: r.display_name, total: r.total }));
    },
    async loadProgress(game) {
      const { data } = await sb.from('game_progress').select('data').eq('user_id', userId).eq('game', game).maybeSingle();
      return data?.data ?? null;
    },
    async saveProgress(game, data) {
      const { error } = await sb.from('game_progress')
        .upsert({ user_id: userId, game, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}

export const store = isShared ? createSupabaseStore() : createLocalStore();
