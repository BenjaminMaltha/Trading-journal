/* Trading Journal — Benjamin
   Vanilla JS + Supabase. Geen build-stap nodig. */
'use strict';

const SUPABASE_URL = 'https://qenyhsqommhcfcevxepr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t_Z9eDJa4Qaljd36OPpknw_NgfS3FTh';
const BUCKET = 'screenshots';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

/* ---------------- helpers ---------------- */
const $app = document.getElementById('app');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem('tj.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tj.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
const parseNum = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  if (s === '' || s === '-' || s === '+') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const numStr = (n) => (n == null ? '' : String(Math.abs(n)).replace('.', ','));
const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const fmtR = (r) => (r == null ? '–' : sign(r) + Math.abs(r).toFixed(1).replace('.', ',') + 'R');
const fmtR2 = (r) => (r == null ? '–' : sign(r) + Math.abs(r).toFixed(2).replace('.', ',') + 'R');
const fmtMoney = (m) => (m == null ? '–' : sign(m) + '$' + nf.format(Math.abs(m)));
const fmtBal = (m) => (m == null ? '–' : '$' + nf0.format(m));
const cls = (v) => (v == null ? 'be' : v > 0 ? 'win' : v < 0 ? 'loss' : 'be');
const resultOf = (t) => (t.result_r != null ? Number(t.result_r) : t.result_money != null ? Number(t.result_money) : null);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const dfDay = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
const dfDayY = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dfTime = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });
const dfFull = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const clean = (s) => s.replace(/\./g, '');
const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function dayLabel(d) {
  const now = new Date();
  const k = dayKey(d);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const base = clean(d.getFullYear() === now.getFullYear() ? dfDay.format(d) : dfDayY.format(d));
  if (k === dayKey(now)) return 'Vandaag · ' + base;
  if (k === dayKey(y)) return 'Gisteren · ' + base;
  return cap(base);
}
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
};
function sessionFor(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 1 && h < 9) return 'Azië';
  if (h >= 9 && h < 14.5) return 'Londen';
  if (h >= 14.5 && h < 22) return 'New York';
  return 'Buiten sessie';
}
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

/* ---------------- icons ---------------- */
const I = {
  trades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  accounts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#09090B" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 9v8H9"/></svg>',
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  cam: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  chevUp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
  warn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
  mark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/></svg>'
};

/* ---------------- asset logos ---------------- */
const FLAGS = {
  USD: '<svg viewBox="0 0 13 13" preserveAspectRatio="xMinYMid slice"><rect width="13" height="13" fill="#fff"/><g fill="#B22234"><rect y="0" width="13" height="1"/><rect y="2" width="13" height="1"/><rect y="4" width="13" height="1"/><rect y="6" width="13" height="1"/><rect y="8" width="13" height="1"/><rect y="10" width="13" height="1"/><rect y="12" width="13" height="1"/></g><rect width="6.5" height="7" fill="#3C3B6E"/></svg>',
  EUR: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#003399"/><g fill="#FFCC00"><circle cx="28" cy="18" r="1.8"/><circle cx="26.66" cy="23" r="1.8"/><circle cx="23" cy="26.66" r="1.8"/><circle cx="18" cy="28" r="1.8"/><circle cx="13" cy="26.66" r="1.8"/><circle cx="9.34" cy="23" r="1.8"/><circle cx="8" cy="18" r="1.8"/><circle cx="9.34" cy="13" r="1.8"/><circle cx="13" cy="9.34" r="1.8"/><circle cx="18" cy="8" r="1.8"/><circle cx="23" cy="9.34" r="1.8"/><circle cx="26.66" cy="13" r="1.8"/></g></svg>',
  GBP: '<svg viewBox="15 0 30 30" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>',
  JPY: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#fff"/><circle cx="18" cy="18" r="9" fill="#BC002D"/></svg>',
  CHF: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#DA291C"/><path d="M15 8h6v7h7v6h-7v7h-6v-7H8v-6h7z" fill="#fff"/></svg>',
  CAD: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#fff"/><rect width="9" height="36" fill="#D52B1E"/><rect x="27" width="9" height="36" fill="#D52B1E"/><path d="M18 9l2 4 3-1-1 6 3-1-1 3 2 1-6 3v3h-2v-3l-6-3 2-1-1-3 3 1-1-6 3 1z" fill="#D52B1E"/></svg>',
  AUD: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#012169"/><path d="M0,0 L18,9 M18,0 L0,9" stroke="#fff" stroke-width="2.4"/><path d="M9,0 V9 M0,4.5 H18" stroke="#fff" stroke-width="3.6"/><path d="M9,0 V9 M0,4.5 H18" stroke="#C8102E" stroke-width="2"/><g fill="#fff"><circle cx="10" cy="26" r="3"/><circle cx="27" cy="12" r="1.6"/><circle cx="24" cy="20" r="1.6"/><circle cx="30" cy="22" r="1.6"/><circle cx="27" cy="30" r="1.8"/></g></svg>',
  NZD: '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="#012169"/><path d="M0,0 L18,9 M18,0 L0,9" stroke="#fff" stroke-width="2.4"/><path d="M9,0 V9 M0,4.5 H18" stroke="#fff" stroke-width="3.6"/><path d="M9,0 V9 M0,4.5 H18" stroke="#C8102E" stroke-width="2"/><g fill="#CC142B" stroke="#fff" stroke-width="0.8"><circle cx="26" cy="11" r="1.8"/><circle cx="22" cy="19" r="1.8"/><circle cx="30" cy="18" r="1.8"/><circle cx="26" cy="29" r="2"/></g></svg>'
};
const METALS = { XAU: { t: 'Au', c: '' }, XAG: { t: 'Ag', c: 'silver' } };
function baseBadge(code, fs) {
  if (METALS[code]) return '<div class="coin ' + METALS[code].c + '" style="font-size:' + fs + 'px">' + METALS[code].t + '</div>';
  if (FLAGS[code]) return FLAGS[code];
  return '<div class="letters" style="font-size:' + Math.round(fs * 0.8) + 'px">' + esc(code.slice(0, 3)) + '</div>';
}
function splitPair(p) {
  const s = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) return [s.slice(0, 3), s.slice(3)];
  return [s, null];
}
function assetLogo(pair) {
  const [b, q] = splitPair(pair);
  return '<div class="logo" role="img" aria-label="' + esc(pair) + '"><div class="base">' + baseBadge(b, 14) + '</div>' +
    (q ? '<div class="quote">' + baseBadge(q, 8) + '</div>' : '') + '</div>';
}
function miniLogo(pair) {
  const [b] = splitPair(pair);
  return '<span class="mini-logo" aria-hidden="true">' + baseBadge(b, 9) + '</span>';
}

/* ---------------- state ---------------- */
const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD'];
const SETUPS = ['Liquidity sweep', 'FVG', 'Order block', 'BOS', 'CHoCH', 'Breaker', 'Killzone'];
const MISTAKES = ['FOMO', 'Te vroeg ingestapt', 'Te laat ingestapt', 'SL verplaatst', 'Te vroeg gesloten', 'Te groot risico', 'Tegen plan in', 'Revenge trade', 'Tijdens nieuws'];
const EMOTIONS = ['Rustig', 'Zelfverzekerd', 'Ongeduldig', 'Twijfel', 'Angstig', 'Gefrustreerd', 'Hebzuchtig'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4'];
const SESSIONS = ['Azië', 'Londen', 'New York', 'Buiten sessie'];

const S = {
  session: null, ready: false, loading: false, loaded: false,
  mode: ls.get('mode', 'live'),
  acc: ls.get('acc', { live: 'all', backtest: 'all' }),
  view: 'trades', pair: 'all', period: ls.get('period', 'all'),
  accounts: [], trades: [],
  form: null, detail: null, accForm: null, lightbox: null,
  toast: null, busy: false, loginErr: null
};
const urlCache = {};
let toastTimer = null;
function toast(msg) { S.toast = msg; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 2600); }
function savePrefs() { ls.set('mode', S.mode); ls.set('acc', S.acc); ls.set('period', S.period); }

const accountsOf = (mode) => S.accounts.filter((a) => a.mode === mode && !a.archived);
const accById = (id) => S.accounts.find((a) => a.id === id);
function currentAccId() {
  const v = S.acc[S.mode];
  if (v !== 'all' && !accById(v)) return 'all';
  return v;
}
function filteredTrades(opts) {
  const o = opts || {};
  const accId = currentAccId();
  let list = S.trades.filter((t) => t.mode === S.mode);
  if (accId !== 'all') list = list.filter((t) => t.account_id === accId);
  if (!o.ignorePair && S.pair !== 'all') list = list.filter((t) => t.pair === S.pair);
  if (S.period !== 'all') {
    const from = S.period === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date());
    list = list.filter((t) => new Date(t.opened_at) >= from);
  }
  return list;
}
function knownPairs() {
  const set = new Set(DEFAULT_PAIRS);
  S.trades.forEach((t) => set.add(t.pair));
  return Array.from(set);
}
function knownTags(field, base) {
  const set = new Set(base);
  S.trades.forEach((t) => (t[field] || []).forEach((x) => set.add(x)));
  return Array.from(set);
}

/* ---------------- data ---------------- */
async function loadAll() {
  S.loading = true; render();
  const [a, t] = await Promise.all([
    sb.from('accounts').select('*').order('created_at', { ascending: true }),
    sb.from('trades').select('*').order('opened_at', { ascending: false })
  ]);
  S.loading = false;
  if (a.error || t.error) {
    const e = a.error || t.error;
    console.error(e);
    toast(/relation|does not exist|schema cache/i.test(e.message) ? 'Database nog niet ingesteld: draai eerst de SQL in Supabase.' : 'Laden mislukt: ' + e.message);
    return;
  }
  S.accounts = a.data || [];
  S.trades = t.data || [];
  S.loaded = true;
  render();
}
async function ensureUrls(paths) {
  const need = paths.filter((p) => !urlCache[p] || urlCache[p].exp < Date.now() + 60000);
  if (!need.length) return;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(need, 3600);
  if (error) { console.error(error); return; }
  (data || []).forEach((d) => { if (d.signedUrl) urlCache[d.path] = { url: d.signedUrl, exp: Date.now() + 3600 * 1000 }; });
  render();
}
const urlOf = (p) => (urlCache[p] ? urlCache[p].url : '');

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = rej;
    img.src = url;
  });
}
async function compress(file) {
  try {
    const img = await loadImage(file);
    const max = 1800;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    return blob || file;
  } catch (e) { return file; }
}

/* ---------------- trade form ---------------- */
function lastTrade() { return S.trades.find((t) => t.mode === S.mode) || S.trades[0]; }
function openNew() {
  const now = new Date();
  const lt = lastTrade();
  const accId = currentAccId();
  const accs = accountsOf(S.mode);
  S.form = {
    id: null, mode: S.mode,
    account_id: accId !== 'all' ? accId : (accs[0] ? accs[0].id : ''),
    pair: lt ? lt.pair : 'XAUUSD', direction: 'long',
    opened_at: toLocalInput(now), session: sessionFor(now), sessionManual: false,
    timeframe: lt && lt.timeframe ? lt.timeframe : 'M15',
    outcome: null, r: '', money: '',
    entry: '', sl: '', tp: '', exit: '',
    setups: [], emotion: '', mistakes: [], notes: '',
    shots: [], newFiles: [], removed: [], more: false
  };
  S.detail = null;
  render();
}
function openEdit(t) {
  const r = t.result_r != null ? Number(t.result_r) : null;
  const m = t.result_money != null ? Number(t.result_money) : null;
  const ref = r != null ? r : m;
  S.form = {
    id: t.id, mode: t.mode, account_id: t.account_id || '',
    pair: t.pair, direction: t.direction,
    opened_at: toLocalInput(new Date(t.opened_at)), session: t.session || sessionFor(new Date(t.opened_at)), sessionManual: true,
    timeframe: t.timeframe || '',
    outcome: ref == null ? null : ref > 0 ? 'win' : ref < 0 ? 'loss' : 'be',
    r: numStr(r), money: numStr(m),
    entry: t.entry_price == null ? '' : String(t.entry_price), sl: t.stop_loss == null ? '' : String(t.stop_loss),
    tp: t.take_profit == null ? '' : String(t.take_profit), exit: t.exit_price == null ? '' : String(t.exit_price),
    setups: (t.setups || []).slice(), emotion: t.emotion || '', mistakes: (t.mistakes || []).slice(), notes: t.notes || '',
    shots: (t.screenshots || []).slice(), newFiles: [], removed: [],
    more: !!(t.entry_price || t.stop_loss || t.take_profit || t.exit_price || (t.setups || []).length || t.emotion || (t.mistakes || []).length)
  };
  S.detail = null;
  ensureUrls(S.form.shots);
  render();
}
function closeForm() {
  if (S.form) S.form.newFiles.forEach((f) => URL.revokeObjectURL(f.url));
  S.form = null; render();
}
function signed(v, outcome) {
  const n = parseNum(v);
  if (outcome === 'be') return n == null ? 0 : 0;
  if (n == null) return null;
  if (outcome === 'loss') return -Math.abs(n);
  if (outcome === 'win') return Math.abs(n);
  return n;
}
async function saveForm() {
  const f = S.form;
  if (!f || S.busy) return;
  if (!f.pair) { toast('Kies een pair.'); return; }
  if (f.outcome && f.outcome !== 'be' && parseNum(f.r) == null && parseNum(f.money) == null) { toast('Vul het resultaat in R of $ in.'); return; }
  S.busy = true; render();
  const uid = S.session.user.id;
  const row = {
    mode: f.mode,
    account_id: f.account_id || null,
    pair: f.pair.toUpperCase(),
    direction: f.direction,
    opened_at: new Date(f.opened_at).toISOString(),
    session: f.session || null,
    timeframe: f.timeframe || null,
    result_r: f.outcome ? signed(f.r, f.outcome) : null,
    result_money: f.outcome ? (f.outcome === 'be' && parseNum(f.money) == null ? 0 : signed(f.money, f.outcome)) : null,
    entry_price: parseNum(f.entry), stop_loss: parseNum(f.sl), take_profit: parseNum(f.tp), exit_price: parseNum(f.exit),
    setups: f.setups, emotion: f.emotion || null, mistakes: f.mistakes, notes: f.notes.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    let saved;
    if (f.id) {
      const { data, error } = await sb.from('trades').update(row).eq('id', f.id).select().single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await sb.from('trades').insert(row).select().single();
      if (error) throw error;
      saved = data;
    }
    let shots = f.shots.slice();
    for (let i = 0; i < f.newFiles.length; i++) {
      const blob = await compress(f.newFiles[i].file);
      const path = uid + '/' + saved.id + '/' + Date.now() + '-' + i + '.jpg';
      const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      shots.push(path);
    }
    if (f.removed.length) await sb.storage.from(BUCKET).remove(f.removed);
    const changed = f.newFiles.length || f.removed.length || (f.id && JSON.stringify(shots) !== JSON.stringify(saved.screenshots || []));
    if (changed) {
      const { data, error } = await sb.from('trades').update({ screenshots: shots }).eq('id', saved.id).select().single();
      if (error) throw error;
      saved = data;
    }
    S.trades = S.trades.filter((t) => t.id !== saved.id).concat([saved]).sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
    f.newFiles.forEach((x) => URL.revokeObjectURL(x.url));
    S.form = null; S.busy = false;
    toast(f.id ? 'Trade bijgewerkt' : 'Trade opgeslagen');
  } catch (e) {
    console.error(e);
    S.busy = false;
    toast('Opslaan mislukt: ' + (e.message || e));
  }
}
async function deleteTrade(id) {
  const t = S.trades.find((x) => x.id === id);
  if (!t || !confirm('Deze trade verwijderen? Dit kan niet ongedaan worden.')) return;
  if ((t.screenshots || []).length) await sb.storage.from(BUCKET).remove(t.screenshots);
  const { error } = await sb.from('trades').delete().eq('id', id);
  if (error) { toast('Verwijderen mislukt: ' + error.message); return; }
  S.trades = S.trades.filter((x) => x.id !== id);
  S.detail = null;
  toast('Trade verwijderd');
}

/* ---------------- accounts ---------------- */
function openAccForm(a) {
  S.accForm = a ? {
    id: a.id, mode: a.mode, name: a.name, firm: a.firm || '',
    starting_balance: a.starting_balance == null ? '' : String(a.starting_balance),
    profit_target_pct: a.profit_target_pct == null ? '' : String(a.profit_target_pct),
    daily_loss_pct: a.daily_loss_pct == null ? '' : String(a.daily_loss_pct),
    max_drawdown_pct: a.max_drawdown_pct == null ? '' : String(a.max_drawdown_pct),
    own_daily_stop_losses: a.own_daily_stop_losses == null ? '' : String(a.own_daily_stop_losses),
    own_daily_stop_pct: a.own_daily_stop_pct == null ? '' : String(a.own_daily_stop_pct)
  } : { id: null, mode: S.mode, name: '', firm: '', starting_balance: '', profit_target_pct: '', daily_loss_pct: '', max_drawdown_pct: '', own_daily_stop_losses: '', own_daily_stop_pct: '' };
  render();
}
async function saveAcc() {
  const f = S.accForm;
  if (!f || S.busy) return;
  if (!f.name.trim()) { toast('Geef het account een naam.'); return; }
  S.busy = true; render();
  const row = {
    mode: f.mode, name: f.name.trim(), firm: f.firm.trim() || null,
    starting_balance: parseNum(f.starting_balance), profit_target_pct: parseNum(f.profit_target_pct),
    daily_loss_pct: parseNum(f.daily_loss_pct), max_drawdown_pct: parseNum(f.max_drawdown_pct),
    own_daily_stop_losses: parseNum(f.own_daily_stop_losses) == null ? null : Math.round(parseNum(f.own_daily_stop_losses)),
    own_daily_stop_pct: parseNum(f.own_daily_stop_pct)
  };
  const q = f.id ? sb.from('accounts').update(row).eq('id', f.id).select().single() : sb.from('accounts').insert(row).select().single();
  const { data, error } = await q;
  S.busy = false;
  if (error) { toast('Opslaan mislukt: ' + error.message); return; }
  S.accounts = S.accounts.filter((a) => a.id !== data.id).concat([data]);
  if (!f.id) { S.acc[data.mode] = data.id; savePrefs(); }
  S.accForm = null;
  toast(f.id ? 'Account bijgewerkt' : 'Account toegevoegd');
}
async function deleteAcc(id) {
  const a = accById(id);
  if (!a || !confirm('Account "' + a.name + '" verwijderen? Je trades blijven bewaard, maar zonder account.')) return;
  const { error } = await sb.from('accounts').delete().eq('id', id);
  if (error) { toast('Verwijderen mislukt: ' + error.message); return; }
  S.accounts = S.accounts.filter((x) => x.id !== id);
  S.trades.forEach((t) => { if (t.account_id === id) t.account_id = null; });
  if (S.acc[a.mode] === id) { S.acc[a.mode] = 'all'; savePrefs(); }
  S.accForm = null;
  toast('Account verwijderd');
}
function accountStatus(a) {
  const trades = S.trades.filter((t) => t.account_id === a.id);
  const money = trades.reduce((s, t) => s + (t.result_money != null ? Number(t.result_money) : 0), 0);
  const start = a.starting_balance != null ? Number(a.starting_balance) : null;
  const today = dayKey(new Date());
  const todays = trades.filter((t) => dayKey(new Date(t.opened_at)) === today);
  const todayMoney = todays.reduce((s, t) => s + (t.result_money != null ? Number(t.result_money) : 0), 0);
  const todayLosses = todays.filter((t) => (resultOf(t) || 0) < 0).length;
  const balance = start != null ? start + money : null;
  const dayStart = balance != null ? balance - todayMoney : null;
  const out = { trades, money, start, balance, todays, todayMoney, todayLosses, dayStart, days: new Set(trades.map((t) => dayKey(new Date(t.opened_at)))).size };
  if (start != null && a.profit_target_pct != null) { out.target = start * a.profit_target_pct / 100; out.targetPct = clamp(pct(money, out.target), 0, 100); }
  if (dayStart != null && a.daily_loss_pct != null) { out.dailyLimit = start * a.daily_loss_pct / 100; out.dailyUsed = Math.max(0, -todayMoney); out.dailyFloor = dayStart - out.dailyLimit; }
  if (start != null && a.max_drawdown_pct != null) { out.ddLimit = start * a.max_drawdown_pct / 100; out.ddFloor = start - out.ddLimit; out.ddUsed = Math.max(0, start - balance); out.ddRoom = balance - out.ddFloor; }
  if (a.own_daily_stop_losses != null) out.ownLeft = a.own_daily_stop_losses - todayLosses;
  if (a.own_daily_stop_pct != null && start != null) { out.ownPctLimit = start * a.own_daily_stop_pct / 100; out.ownPctHit = -todayMoney >= out.ownPctLimit; }
  return out;
}
function stopAlert(a, st) {
  if (!a || a.mode !== 'live') return '';
  if ((st.ownLeft != null && st.ownLeft <= 0) || st.ownPctHit) return '<div class="alert bad" role="status">' + I.warn + '<span><strong>Dagstop bereikt.</strong> Stop met handelen voor vandaag.</span></div>';
  if (st.ownLeft === 1) return '<div class="alert" role="status">' + I.warn + '<span>Nog <strong>1 verliestrade</strong> tot je eigen dagstop. Daarna stop je vandaag.</span></div>';
  if (st.dailyLimit != null && st.dailyUsed >= st.dailyLimit * 0.75) return '<div class="alert bad" role="status">' + I.warn + '<span>Je zit op <strong>' + pct(st.dailyUsed, st.dailyLimit) + '%</strong> van je maximale dagverlies.</span></div>';
  return '';
}

/* ---------------- stats ---------------- */
function computeStats(list) {
  const closed = list.filter((t) => t.result_r != null).slice().sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));
  const rs = closed.map((t) => Number(t.result_r));
  const wins = rs.filter((r) => r > 0), losses = rs.filter((r) => r < 0);
  const total = rs.reduce((s, r) => s + r, 0);
  const gw = wins.reduce((s, r) => s + r, 0), gl = Math.abs(losses.reduce((s, r) => s + r, 0));
  let peak = 0, cum = 0, maxDD = 0, ws = 0, lsk = 0, bw = 0, bl = 0;
  const curve = [0];
  rs.forEach((r) => {
    cum += r; curve.push(cum);
    peak = Math.max(peak, cum); maxDD = Math.max(maxDD, peak - cum);
    if (r > 0) { ws++; lsk = 0; } else if (r < 0) { lsk++; ws = 0; } else { ws = 0; lsk = 0; }
    bw = Math.max(bw, ws); bl = Math.max(bl, lsk);
  });
  const money = list.reduce((s, t) => s + (t.result_money != null ? Number(t.result_money) : 0), 0);
  const groupBy = (keyFn) => {
    const m = {};
    closed.forEach((t) => {
      const keys = [].concat(keyFn(t)).filter(Boolean);
      keys.forEach((k) => { m[k] = m[k] || { n: 0, r: 0, w: 0 }; m[k].n++; m[k].r += Number(t.result_r); if (Number(t.result_r) > 0) m[k].w++; });
    });
    return Object.keys(m).map((k) => ({ k, ...m[k] })).sort((a, b) => b.r - a.r);
  };
  return {
    n: list.length, closed: closed.length, wins: wins.length, losses: losses.length, be: rs.length - wins.length - losses.length,
    winrate: wins.length + losses.length ? Math.round((wins.length / (wins.length + losses.length)) * 100) : null,
    total, avg: rs.length ? total / rs.length : null,
    avgWin: wins.length ? gw / wins.length : null, avgLoss: losses.length ? -gl / losses.length : null,
    pf: gl ? gw / gl : (gw ? Infinity : null), maxDD, bw, bl, curve, money,
    bySession: groupBy((t) => t.session), byPair: groupBy((t) => t.pair), bySetup: groupBy((t) => t.setups),
    byMistake: groupBy((t) => t.mistakes).sort((a, b) => a.r - b.r),
    byWeekday: groupBy((t) => ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][new Date(t.opened_at).getDay()]).sort((a, b) => ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].indexOf(a.k) - ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].indexOf(b.k))
  };
}

/* ---------------- views ---------------- */
function segHtml(small) {
  return '<div class="seg' + (small ? ' small' : '') + '" role="group" aria-label="Modus">' +
    '<button type="button" data-a="mode" data-v="live" aria-pressed="' + (S.mode === 'live') + '" class="' + (S.mode === 'live' ? 'on-live' : '') + '">LIVE</button>' +
    '<button type="button" data-a="mode" data-v="backtest" aria-pressed="' + (S.mode === 'backtest') + '" class="' + (S.mode === 'backtest' ? 'on-backtest' : '') + '">BACKTEST</button></div>';
}
function accSelectHtml() {
  const accId = currentAccId();
  const accs = accountsOf(S.mode);
  const opts = ['<option value="all"' + (accId === 'all' ? ' selected' : '') + '>' + (S.mode === 'live' ? 'Alle accounts' : 'Alle backtests') + '</option>']
    .concat(accs.map((a) => '<option value="' + a.id + '"' + (accId === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'));
  return '<div class="row grow"><span class="dot"></span><div class="select-wrap grow"><select class="select" data-filter="acc" aria-label="Account">' + opts.join('') + '</select></div></div>';
}
function navBtn(v, label) {
  return '<button type="button" class="navbtn' + (S.view === v ? ' active' : '') + '" data-a="view" data-v="' + v + '">' + I[v] + '<span>' + label + '</span></button>';
}
function sideLink(v, label) {
  return '<button type="button" class="side-link' + (S.view === v ? ' active' : '') + '" data-a="view" data-v="' + v + '">' + I[v] + label + '</button>';
}
const VIEW_TITLES = { trades: 'Trades', stats: 'Statistieken', accounts: 'Accounts', more: 'Meer' };

function shellHtml() {
  let body = '';
  if (!S.loaded) body = S.loading ? '<div class="empty"><div class="spinner"></div></div>' : '<div class="empty"><b>Kon je gegevens niet laden</b><button class="btn" data-a="reload">Opnieuw proberen</button></div>';
  else if (S.view === 'trades') body = tradesView();
  else if (S.view === 'stats') body = statsView();
  else if (S.view === 'accounts') body = accountsView();
  else body = moreView();
  return '<div class="shell">' +
    '<aside class="sidebar">' +
      '<div class="brand"><span class="brand-mark">' + I.mark + '</span>Trading Journal</div>' +
      segHtml(true) +
      '<nav class="side-nav" aria-label="Hoofdmenu">' + sideLink('trades', 'Trades') + sideLink('stats', 'Statistieken') + sideLink('accounts', 'Accounts') + sideLink('more', 'Meer') + '</nav>' +
      '<div class="side-foot"><button type="button" class="btn primary" data-a="new">+ Nieuwe trade</button></div>' +
    '</aside>' +
    '<div class="main">' +
      '<header class="topbar">' + segHtml(false) +
        '<div class="row between" style="width:100%;gap:12px"><h1 class="desk-title">' + VIEW_TITLES[S.view] + '</h1>' + accSelectHtml() + '</div>' +
      '</header>' +
      '<main class="content">' + body + '</main>' +
    '</div>' +
    '<nav class="bottomnav" aria-label="Hoofdmenu">' + navBtn('trades', 'Trades') + navBtn('stats', 'Statistieken') +
      '<button type="button" class="fab" data-a="new" aria-label="Nieuwe trade">' + I.plus + '</button>' +
      navBtn('accounts', 'Accounts') + navBtn('more', 'Meer') + '</nav>' +
  '</div>';
}

function filterChips() {
  const pairs = Array.from(new Set(filteredTrades({ ignorePair: true }).map((t) => t.pair)));
  if (S.pair !== 'all' && pairs.indexOf(S.pair) < 0) pairs.push(S.pair);
  const periods = [['all', 'Alles'], ['week', 'Deze week'], ['month', 'Deze maand']];
  return '<div class="chips">' +
    periods.map((p) => '<button type="button" class="chip' + (S.period === p[0] ? ' on' : '') + '" data-a="period" data-v="' + p[0] + '">' + p[1] + '</button>').join('') +
    (pairs.length > 1 || S.pair !== 'all' ? '<span style="width:1px;background:#2A2A30;margin:4px 2px"></span>' +
      '<button type="button" class="chip' + (S.pair === 'all' ? ' on' : '') + '" data-a="pair" data-v="all">Alle pairs</button>' +
      pairs.map((p) => '<button type="button" class="chip' + (S.pair === p ? ' on' : '') + '" data-a="pair" data-v="' + esc(p) + '">' + miniLogo(p) + esc(p) + '</button>').join('') : '') +
  '</div>';
}
function kpiHtml(l, v, c, s) {
  return '<div class="kpi"><span class="l">' + l + '</span><span class="v ' + (c || '') + '">' + v + '</span>' + (s ? '<span class="s">' + s + '</span>' : '') + '</div>';
}
function tradeCard(t) {
  const r = t.result_r != null ? Number(t.result_r) : null;
  const m = t.result_money != null ? Number(t.result_money) : null;
  const ref = resultOf(t);
  const d = new Date(t.opened_at);
  const acc = accById(t.account_id);
  const meta = [clean(dfTime.format(d)), t.session, t.timeframe].filter(Boolean).join(' · ');
  const tags = (t.setups || []).slice(0, 3).map((s) => '<span class="tag">' + esc(s) + '</span>').join('');
  const shots = (t.screenshots || []).length ? '<span class="cam">' + I.cam + (t.screenshots || []).length + '</span>' : '';
  return '<button type="button" class="trade" data-a="open" data-v="' + t.id + '">' + assetLogo(t.pair) +
    '<div class="mid"><div class="row"><span class="pair">' + esc(t.pair) + '</span><span class="dir ' + t.direction + '">' + t.direction.toUpperCase() + '</span>' + shots + '</div>' +
    '<span class="meta">' + esc(meta) + (currentAccId() === 'all' && acc ? ' · ' + esc(acc.name) : '') + '</span>' +
    (tags ? '<div class="row wrap" style="gap:4px">' + tags + '</div>' : '') + '</div>' +
    '<div class="res"><span class="r ' + cls(ref) + '">' + (r != null ? fmtR(r) : ref == null ? 'Open' : '') + '</span><span class="m ' + cls(ref) + '">' + (m != null ? fmtMoney(m) : '') + '</span></div>' +
  '</button>';
}
function tradesView() {
  const list = filteredTrades();
  const st = computeStats(list);
  const accId = currentAccId();
  const acc = accId !== 'all' ? accById(accId) : null;
  let html = '';
  if (acc) html += stopAlert(acc, accountStatus(acc));
  html += '<div class="kpis">' + kpiHtml('Trades', st.n) + kpiHtml('Winrate', st.winrate == null ? '–' : st.winrate + '%') +
    kpiHtml('Totaal R', fmtR(st.total), cls(st.total)) + kpiHtml('Resultaat', fmtMoney(st.money), cls(st.money)) + '</div>';
  html += filterChips();
  if (!list.length) {
    const none = !S.trades.some((t) => t.mode === S.mode);
    html += '<div class="empty"><b>' + (none ? (S.mode === 'live' ? 'Nog geen live trades' : 'Nog geen backtest-trades') : 'Geen trades met deze filters') + '</b>' +
      '<span>' + (none ? 'Tik op + om je eerste trade te loggen.' : 'Pas de filters aan of voeg een trade toe.') + '</span>' +
      (none && !accountsOf(S.mode).length ? '<button class="btn" data-a="acc-new">' + (S.mode === 'live' ? 'Eerst je prop firm-account toevoegen' : 'Backtest-set aanmaken') + '</button>' : '') + '</div>';
    return html;
  }
  const groups = [];
  const map = {};
  list.forEach((t) => {
    const d = new Date(t.opened_at); const k = dayKey(d);
    if (!map[k]) { map[k] = { label: dayLabel(d), trades: [], r: 0, has: false }; groups.push(map[k]); }
    map[k].trades.push(t);
    if (t.result_r != null) { map[k].r += Number(t.result_r); map[k].has = true; }
  });
  html += groups.map((g) => '<section class="group"><div class="group-head"><span class="d">' + esc(g.label) + '</span><span class="t ' + cls(g.has ? g.r : null) + '">' + (g.has ? fmtR(g.r) : '') + '</span></div>' +
    '<div class="trade-grid">' + g.trades.map(tradeCard).join('') + '</div></section>').join('');
  return html;
}
function barsHtml(rows, opts) {
  const o = opts || {};
  if (!rows.length) return '<span class="hint">' + (o.empty || 'Nog geen gegevens.') + '</span>';
  const max = Math.max.apply(null, rows.map((x) => Math.abs(x.r))) || 1;
  return '<div class="bars">' + rows.map((x) => {
    const w = Math.max(2, Math.round((Math.abs(x.r) / max) * 100));
    const col = x.r > 0 ? 'var(--win)' : x.r < 0 ? 'var(--loss)' : 'var(--muted)';
    return '<span class="n">' + (o.logo ? miniLogo(x.k) + ' ' : '') + esc(x.k) + ' <span class="muted">· ' + x.n + '</span></span><div class="track"><div class="fill" style="width:' + w + '%;background:' + col + '"></div></div><span class="val ' + cls(x.r) + '">' + fmtR(x.r) + '</span>';
  }).join('') + '</div>';
}
function curveSvg(curve) {
  if (curve.length < 2) return '<span class="hint">De equity curve verschijnt zodra je trades met een R-resultaat hebt.</span>';
  const W = 330, H = 120, pad = 8;
  const min = Math.min.apply(null, curve), max = Math.max.apply(null, curve);
  const span = max - min || 1;
  const x = (i) => (i / (curve.length - 1)) * W;
  const y = (v) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const pts = curve.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const last = curve[curve.length - 1];
  return '<svg role="img" aria-label="Equity curve van 0 naar ' + esc(fmtR(last)) + '" width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" fill="none">' +
    '<line x1="0" y1="' + y(0).toFixed(1) + '" x2="' + W + '" y2="' + y(0).toFixed(1) + '" stroke="#2A2A30" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>' +
    '<polyline points="' + pts + '" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>' +
    '<div class="row between hint"><span>Start 0R</span><span>Hoogste ' + fmtR(max) + ' · Nu <span class="' + cls(last) + '">' + fmtR(last) + '</span></span></div>';
}
function statsView() {
  const list = filteredTrades();
  const s = computeStats(list);
  let html = filterChips();
  if (!s.closed) return html + '<div class="empty"><b>Nog geen statistieken</b><span>Log trades met een resultaat in R, dan verschijnen hier je cijfers.</span></div>';
  html += '<div class="kpis three">' +
    kpiHtml('Winrate', s.winrate == null ? '–' : s.winrate + '%', '', s.wins + ' W · ' + s.losses + ' V' + (s.be ? ' · ' + s.be + ' BE' : '')) +
    kpiHtml('Totaal', fmtR(s.total), cls(s.total), s.closed + ' trades') +
    kpiHtml('Expectancy', fmtR2(s.avg), cls(s.avg), 'per trade') +
    kpiHtml('Profit factor', s.pf == null ? '–' : s.pf === Infinity ? '∞' : s.pf.toFixed(2).replace('.', ','), '', fmtR(s.avgWin) + ' / ' + fmtR(s.avgLoss)) +
    kpiHtml('Max drawdown', s.maxDD ? fmtR(-s.maxDD) : '0R', s.maxDD ? 'loss' : '', 'piek tot dal') +
    kpiHtml('Reeksen', s.bw + ' / ' + s.bl, '', 'winst / verlies') + '</div>';
  html += '<div class="card"><div class="row between"><h3>Equity curve</h3><span class="hint">in R</span></div>' + curveSvg(s.curve) + '</div>';
  html += '<div class="card"><h3>Per sessie</h3>' + barsHtml(s.bySession) + '</div>';
  html += '<div class="card"><h3>Per pair</h3>' + barsHtml(s.byPair, { logo: true }) + '</div>';
  html += '<div class="card"><h3>Per setup</h3>' + barsHtml(s.bySetup, { empty: 'Voeg setups toe bij "Meer details" om te zien welke het best werken.' }) + '</div>';
  html += '<div class="card"><h3>Per weekdag</h3>' + barsHtml(s.byWeekday) + '</div>';
  html += '<div class="card"><h3>Wat kost mij het meest</h3>' + (s.byMistake.length ? s.byMistake.map((m) =>
    '<div class="row between" style="font-size:13px"><span>' + esc(m.k) + ' <span class="muted">· ' + m.n + ' trade' + (m.n === 1 ? '' : 's') + '</span></span><span class="' + cls(m.r) + '">' + fmtR(m.r) + '</span></div>').join('')
    : '<span class="hint">Markeer fouten bij je trades (FOMO, te vroeg ingestapt…) om te zien wat je het meest kost.</span>') + '</div>';
  return html;
}
function monitorHtml(a) {
  const st = accountStatus(a);
  let h = stopAlert(a, st);
  h += '<div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
    kpiHtml('Balans', st.balance == null ? '–' : fmtBal(st.balance), '', st.start != null ? '<span class="' + cls(st.money) + '">' + fmtMoney(st.money) + ' · ' + (st.start ? sign(st.money) + Math.abs(st.money / st.start * 100).toFixed(2).replace('.', ',') + '%' : '') + '</span>' : 'Vul een startbalans in') +
    kpiHtml('Vandaag', fmtMoney(st.todayMoney), cls(st.todayMoney), st.todays.length + ' trade' + (st.todays.length === 1 ? '' : 's')) + '</div>';
  const bar = (title, right, w, col, sub) => '<div style="display:flex;flex-direction:column;gap:6px"><div class="row between" style="font-size:14px"><span style="font-weight:600">' + title + '</span><span style="color:var(--text-2)">' + right + '</span></div><div class="progress"><div style="width:' + w + '%;background:' + col + '"></div></div><span class="hint">' + sub + '</span></div>';
  const rows = [];
  if (st.target != null) rows.push(bar('Winstdoel ' + nf.format(a.profit_target_pct) + '%', fmtBal(Math.max(0, st.money)) + ' / ' + fmtBal(st.target), st.targetPct, 'var(--live)', st.money >= st.target ? 'Doel gehaald!' : 'Nog ' + fmtBal(st.target - st.money) + ' te gaan · ' + st.targetPct + '%'));
  if (st.dailyLimit != null) rows.push(bar('Dagverlies max ' + nf.format(a.daily_loss_pct) + '%', fmtBal(st.dailyUsed) + ' / ' + fmtBal(st.dailyLimit), clamp(pct(st.dailyUsed, st.dailyLimit), 0, 100), st.dailyUsed >= st.dailyLimit * 0.75 ? 'var(--loss)' : '#71717A', 'Dagstart ' + fmtBal(st.dayStart) + ' · ondergrens vandaag ' + fmtBal(st.dailyFloor)));
  if (st.ddLimit != null) rows.push(bar('Max drawdown ' + nf.format(a.max_drawdown_pct) + '%', fmtBal(st.ddUsed) + ' / ' + fmtBal(st.ddLimit), clamp(pct(st.ddUsed, st.ddLimit), 0, 100), st.ddUsed >= st.ddLimit * 0.75 ? 'var(--loss)' : '#71717A', 'Nooit onder ' + fmtBal(st.ddFloor) + ' · ruimte nu ' + fmtBal(st.ddRoom)));
  if (a.own_daily_stop_losses != null) rows.push(bar('Eigen dagstop', st.todayLosses + ' / ' + a.own_daily_stop_losses + ' verliezers', clamp(pct(st.todayLosses, a.own_daily_stop_losses), 0, 100), st.ownLeft <= 1 ? 'var(--warn)' : '#71717A', 'Max ' + a.own_daily_stop_losses + ' verliestrades' + (a.own_daily_stop_pct != null ? ' of ' + nf.format(a.own_daily_stop_pct) + '% per dag' : ' per dag')));
  if (rows.length) h += '<div class="card" style="gap:16px">' + rows.join('') + '</div>';
  else h += '<div class="card"><span class="hint">Vul je prop firm-regels in (startbalans, winstdoel, dagverlies, drawdown) om hier je voortgang en limieten te zien.</span><button class="btn" data-a="acc-edit" data-v="' + a.id + '">Regels invullen</button></div>';
  h += '<div class="card-list"><div class="li"><span>Handelsdagen</span><span style="color:var(--text-2)">' + st.days + '</span></div><div class="li"><span>Trades totaal</span><span style="color:var(--text-2)">' + st.trades.length + '</span></div><div class="li"><span>Dag telt als</span><span style="color:var(--text-2)">kalenderdag (NL-tijd)</span></div></div>';
  return h;
}
function accountsView() {
  const accs = accountsOf(S.mode);
  const accId = currentAccId();
  let html = '';
  const sel = accId !== 'all' ? accById(accId) : null;
  if (sel && sel.mode === 'live') html += '<div class="row between"><h2 style="margin:0;font-size:16px">' + esc(sel.name) + '</h2><button class="btn ghost" data-a="acc-edit" data-v="' + sel.id + '">Bewerken</button></div>' + monitorHtml(sel);
  html += '<div class="row between" style="margin-top:4px"><h2 style="margin:0;font-size:16px">' + (S.mode === 'live' ? 'Live accounts' : 'Backtest-sets') + '</h2><button class="btn" data-a="acc-new">+ Nieuw</button></div>';
  if (!accs.length) {
    html += '<div class="empty"><b>' + (S.mode === 'live' ? 'Nog geen accounts' : 'Nog geen backtest-sets') + '</b><span>' + (S.mode === 'live' ? 'Voeg bijvoorbeeld je Alpha Pro 8% · 10K toe met de regels van de challenge.' : 'Bijvoorbeeld "Goud NY-sweep · Q3 2025", zodat je backtests per strategie gegroepeerd blijven.') + '</span></div>';
    return html;
  }
  html += '<div class="card-list">' + accs.map((a) => {
    const st = accountStatus(a);
    return '<div class="li" style="min-height:60px"><button type="button" data-a="acc-pick" data-v="' + a.id + '" style="all:unset;cursor:pointer;flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:8px 0">' +
      '<span style="font-weight:600">' + (accId === a.id ? '<span class="dot" style="display:inline-block;margin-right:8px"></span>' : '') + esc(a.name) + '</span>' +
      '<span class="hint">' + [a.firm, st.trades.length + ' trades', st.balance != null ? fmtBal(st.balance) : null].filter(Boolean).map(esc).join(' · ') + '</span></button>' +
      '<span class="' + cls(st.money) + '" style="font-weight:600">' + fmtMoney(st.money) + '</span>' +
      '<button type="button" class="iconbtn" data-a="acc-edit" data-v="' + a.id + '" aria-label="' + esc(a.name) + ' bewerken" style="border:0">' + I.more + '</button></div>';
  }).join('') + '</div>';
  if (!sel && S.mode === 'live') html += '<span class="hint">Kies een account om de prop firm-bewaking te zien.</span>';
  return html;
}
function moreView() {
  const email = S.session && S.session.user ? S.session.user.email : '';
  return '<div class="card-list">' +
    '<div class="li"><span>Ingelogd als</span><span class="muted" style="text-align:right;overflow:hidden;text-overflow:ellipsis">' + esc(email) + '</span></div>' +
    '<div class="li"><span>Trades opgeslagen</span><span class="muted">' + S.trades.length + '</span></div>' +
  '</div>' +
  '<button class="btn" data-a="export">Exporteren als CSV (huidige filters)</button>' +
  '<button class="btn" data-a="reload">Gegevens verversen</button>' +
  '<button class="btn danger" data-a="logout">Uitloggen</button>' +
  '<span class="hint">Tip: tik in het notitieveld op het microfoontje van je toetsenbord om in te spreken.</span>';
}

/* ---------------- sheets ---------------- */
function optBtn(action, value, label, on, extra) {
  return '<button type="button" class="opt' + (on ? ' on' : '') + (extra ? ' ' + extra : '') + '" data-a="' + action + '" data-v="' + esc(value) + '" aria-pressed="' + !!on + '">' + label + '</button>';
}
function formSheet() {
  const f = S.form;
  const accs = accountsOf(f.mode);
  const pairs = knownPairs();
  if (pairs.indexOf(f.pair) < 0) pairs.push(f.pair);
  const accOpts = '<option value="">Geen account</option>' + accs.map((a) => '<option value="' + a.id + '"' + (f.account_id === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('');
  const outs = [['win', 'Winst', 'win-on'], ['loss', 'Verlies', 'loss-on'], ['be', 'Break-even', 'be-on']];
  const outCls = f.outcome === 'loss' ? 'loss' : f.outcome === 'win' ? 'win' : '';
  const sg = f.outcome === 'loss' ? '−' : f.outcome === 'win' ? '+' : '';
  const shots = f.shots.map((p) => '<div class="shot">' + (urlOf(p) ? '<img src="' + esc(urlOf(p)) + '" alt="Screenshot">' : '') + '<button type="button" class="x" data-a="f-rmshot" data-v="' + esc(p) + '" aria-label="Screenshot verwijderen">×</button></div>').join('') +
    f.newFiles.map((x, i) => '<div class="shot"><img src="' + x.url + '" alt="Nieuwe screenshot"><button type="button" class="x" data-a="f-rmnew" data-v="' + i + '" aria-label="Screenshot verwijderen">×</button></div>').join('');
  const chipList = (field, base, action) => { const all = knownTags(field, base); f[field].forEach((x) => { if (all.indexOf(x) < 0) all.push(x); }); return all; };
  const chipHtml = (field, base, action) => chipList(field, base, action)
    .map((s) => '<button type="button" class="chip' + (f[field].indexOf(s) >= 0 ? ' on' : '') + '" data-a="' + action + '" data-v="' + esc(s) + '">' + esc(s) + '</button>').join('');
  const more = f.more ? (
    '<div class="field"><span class="lab">Prijzen</span><div class="grid2">' +
      ['entry:Entry', 'sl:Stop loss', 'tp:Take profit', 'exit:Exit'].map((x) => { const [k, l] = x.split(':'); return '<label class="affix"><span>' + l + '</span><input inputmode="decimal" data-f="' + k + '" value="' + esc(f[k]) + '" aria-label="' + l + '" style="font-size:16px;font-weight:600"></label>'; }).join('') +
    '</div></div>' +
    '<div class="field"><span class="lab">Setups</span><div class="chips">' + chipHtml('setups', SETUPS, 'f-setup') + '<button type="button" class="chip add" data-a="f-addsetup">+ Eigen</button></div></div>' +
    '<div class="field"><span class="lab">Emotie</span><div class="chips">' + EMOTIONS.map((e) => '<button type="button" class="chip' + (f.emotion === e ? ' on' : '') + '" data-a="f-emo" data-v="' + e + '">' + e + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lab">Fouten</span><div class="chips">' + chipHtml('mistakes', MISTAKES, 'f-mistake') + '<button type="button" class="chip add" data-a="f-addmistake">+ Eigen</button></div></div>'
  ) : '';
  return '<div class="overlay" role="dialog" aria-modal="true" aria-label="' + (f.id ? 'Trade bewerken' : 'Nieuwe trade') + '"><div class="sheet">' +
    '<div class="sheet-head"><button type="button" class="iconbtn" data-a="close" aria-label="Sluiten">' + I.close + '</button>' +
      '<div class="sheet-title"><b>' + (f.id ? 'Trade bewerken' : 'Nieuwe trade') + '</b><span>' + (f.mode === 'live' ? 'Live trade' : 'Backtest') + '</span></div>' +
      '<span class="badge">' + f.mode.toUpperCase() + '</span></div>' +
    '<div class="sheet-body" data-keep="form">' +
      '<div class="field"><span class="lab">' + (f.mode === 'live' ? 'Account' : 'Backtest-set') + '</span><div class="select-wrap"><select class="select" data-f="account_id" style="min-height:48px;font-size:15px">' + accOpts + '</select></div></div>' +
      '<div class="field"><span class="lab">Pair</span><div class="grid4">' +
        pairs.map((p) => optBtn('f-pair', p, miniLogo(p) + esc(p), f.pair === p, 'tall')).join('') +
        '<button type="button" class="opt tall dashed" data-a="f-addpair" aria-label="Pair toevoegen" style="font-size:20px">+</button></div></div>' +
      '<div class="field"><span class="lab">Richting</span><div class="grid2">' +
        optBtn('f-dir', 'long', I.up + 'Long', f.direction === 'long', f.direction === 'long' ? 'win-on' : '') +
        optBtn('f-dir', 'short', I.down + 'Short', f.direction === 'short', f.direction === 'short' ? 'loss-on' : '') + '</div></div>' +
      '<div class="field"><span class="lab">Datum en tijd</span><div class="grid2">' +
        '<input class="input" type="datetime-local" data-f="opened_at" value="' + esc(f.opened_at) + '" aria-label="Datum en tijd" style="font-size:15px">' +
        '<div class="select-wrap"><select class="select" data-f="session" aria-label="Sessie" style="min-height:48px;font-size:15px">' + SESSIONS.map((s) => '<option' + (f.session === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
        '<div class="chips">' + TIMEFRAMES.map((tf) => '<button type="button" class="chip' + (f.timeframe === tf ? ' on' : '') + '" data-a="f-tf" data-v="' + tf + '">' + tf + '</button>').join('') + '</div></div>' +
      '<div class="field"><span class="lab">Resultaat</span><div class="grid3">' + outs.map((o) => optBtn('f-out', o[0], o[1], f.outcome === o[0], f.outcome === o[0] ? o[2] : '')).join('') + '</div>' +
        (f.outcome && f.outcome !== 'be' ? '<div class="grid2">' +
          '<label class="affix"><span>' + sg + 'R</span><input inputmode="decimal" data-f="r" value="' + esc(f.r) + '" placeholder="2,1" aria-label="Resultaat in R" class="' + outCls + '" style="color:var(--' + outCls + ')"></label>' +
          '<label class="affix"><span>' + sg + '$</span><input inputmode="decimal" data-f="money" value="' + esc(f.money) + '" placeholder="208" aria-label="Resultaat in dollar" style="color:var(--' + outCls + ')"></label></div>' : '') +
        (!f.outcome ? '<span class="hint">Nog open? Laat leeg en vul het resultaat later in.</span>' : '') + '</div>' +
      '<div class="field"><span class="lab">Screenshots</span><div class="shots">' + shots +
        '<label class="shot-add">' + I.camera + 'Foto, camera of bestand<input type="file" accept="image/*" multiple data-file="1" aria-label="Screenshots toevoegen"></label></div></div>' +
      '<div class="field"><span class="lab">Notitie</span><textarea class="textarea" data-f="notes" rows="4" placeholder="Waarom ingestapt, hoe voelde het, wat leer je ervan? Tik op de microfoon van je toetsenbord om in te spreken.">' + esc(f.notes) + '</textarea></div>' +
      '<button type="button" class="details-toggle" data-a="f-more" aria-expanded="' + f.more + '"><span><b>Meer details</b><small>Prijzen, setups, emotie, fouten</small></span>' + (f.more ? I.chevUp : I.chev) + '</button>' +
      more +
    '</div>' +
    '<div class="sheet-foot"><button type="button" class="btn primary block" data-a="save"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Opslaan…' : (f.id ? 'Wijzigingen opslaan' : 'Trade opslaan')) + '</button></div>' +
  '</div></div>';
}
function detailSheet() {
  const t = S.trades.find((x) => x.id === S.detail);
  if (!t) return '';
  const d = new Date(t.opened_at);
  const ref = resultOf(t);
  const acc = accById(t.account_id);
  const prices = [['Entry', t.entry_price], ['Stop loss', t.stop_loss], ['Take profit', t.take_profit], ['Exit', t.exit_price]].filter((p) => p[1] != null);
  const tagRow = (arr) => '<div class="row wrap" style="gap:6px">' + arr.map((s) => '<span class="tag" style="font-size:12px;padding:4px 8px">' + esc(s) + '</span>').join('') + '</div>';
  return '<div class="overlay" role="dialog" aria-modal="true" aria-label="Trade ' + esc(t.pair) + '"><div class="sheet">' +
    '<div class="sheet-head"><button type="button" class="iconbtn" data-a="close" aria-label="Terug">' + I.back + '</button>' +
      '<div class="sheet-title"><b>' + esc(t.pair) + ' · ' + t.direction.toUpperCase() + '</b><span>' + esc(cap(clean(dfFull.format(d)))) + '</span></div>' +
      '<span class="badge" style="' + (t.mode === 'backtest' ? 'color:var(--backtest);background:rgba(167,139,250,0.14)' : 'color:var(--live);background:rgba(79,140,255,0.14)') + '">' + t.mode.toUpperCase() + '</span></div>' +
    '<div class="sheet-body">' +
      '<div class="row" style="gap:14px">' + assetLogo(t.pair) + '<div class="grow"><div style="font-size:20px;font-weight:700">' + esc(t.pair) + ' <span class="dir ' + t.direction + '" style="vertical-align:middle">' + t.direction.toUpperCase() + '</span></div><div class="hint">' + esc([acc ? acc.name : null, t.session, t.timeframe].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div style="text-align:right"><div class="' + cls(ref) + '" style="font-size:24px;font-weight:700">' + (t.result_r != null ? fmtR(Number(t.result_r)) : ref == null ? 'Open' : '') + '</div><div class="' + cls(ref) + '">' + (t.result_money != null ? fmtMoney(Number(t.result_money)) : '') + '</div></div></div>' +
      (prices.length ? '<div class="card-list">' + prices.map((p) => '<div class="li"><span class="muted">' + p[0] + '</span><span>' + esc(String(p[1]).replace('.', ',')) + '</span></div>').join('') + '</div>' : '') +
      ((t.screenshots || []).length ? '<div class="field"><span class="lab">Screenshots</span>' + t.screenshots.map((p) => urlOf(p) ? '<button type="button" class="shot-big" data-a="lightbox" data-v="' + esc(p) + '" aria-label="Screenshot vergroten"><img src="' + esc(urlOf(p)) + '" alt="Screenshot van de trade"></button>' : '<div class="shot-big" style="height:160px;display:flex;align-items:center;justify-content:center"><div class="spinner"></div></div>').join('') + '</div>' : '') +
      (t.notes ? '<div class="field"><span class="lab">Notitie</span><div class="card" style="white-space:pre-wrap;font-size:15px;line-height:1.5">' + esc(t.notes) + '</div></div>' : '') +
      ((t.setups || []).length ? '<div class="field"><span class="lab">Setups</span>' + tagRow(t.setups) + '</div>' : '') +
      (t.emotion ? '<div class="field"><span class="lab">Emotie</span>' + tagRow([t.emotion]) + '</div>' : '') +
      ((t.mistakes || []).length ? '<div class="field"><span class="lab">Fouten</span>' + tagRow(t.mistakes) + '</div>' : '') +
    '</div>' +
    '<div class="sheet-foot"><button type="button" class="btn danger" data-a="del" data-v="' + t.id + '" style="height:54px;border-radius:14px">Verwijderen</button><button type="button" class="btn primary block" data-a="edit" data-v="' + t.id + '" style="flex:1">Bewerken</button></div>' +
  '</div></div>';
}
function accSheet() {
  const f = S.accForm;
  const inp = (k, label, ph, mode) => '<label class="field"><span class="lab">' + label + '</span><input class="input" ' + (mode ? 'inputmode="' + mode + '" ' : '') + 'data-af="' + k + '" value="' + esc(f[k]) + '" placeholder="' + esc(ph) + '"></label>';
  return '<div class="overlay" role="dialog" aria-modal="true" aria-label="Account"><div class="sheet">' +
    '<div class="sheet-head"><button type="button" class="iconbtn" data-a="acc-close" aria-label="Sluiten">' + I.close + '</button><div class="sheet-title"><b>' + (f.id ? 'Account bewerken' : 'Nieuw account') + '</b><span>' + (f.mode === 'live' ? 'Live / prop firm' : 'Backtest-set') + '</span></div><span style="width:44px"></span></div>' +
    '<div class="sheet-body">' +
      '<div class="field"><span class="lab">Soort</span><div class="grid2">' + optBtn('af-mode', 'live', 'Live', f.mode === 'live') + optBtn('af-mode', 'backtest', 'Backtest', f.mode === 'backtest') + '</div></div>' +
      inp('name', 'Naam', f.mode === 'live' ? 'Alpha Pro 8% · 10K · Fase 1' : 'Goud NY-sweep · Q3 2025') +
      (f.mode === 'live' ? inp('firm', 'Prop firm', 'Alpha Capital Group') +
        inp('starting_balance', 'Startbalans ($)', '10000', 'decimal') +
        '<div class="grid2">' + inp('profit_target_pct', 'Winstdoel (%)', '8', 'decimal') + inp('daily_loss_pct', 'Max dagverlies (%)', '4', 'decimal') + '</div>' +
        inp('max_drawdown_pct', 'Max drawdown (%)', '8', 'decimal') +
        '<div class="field"><span class="lab">Eigen dagstop</span><div class="grid2">' +
          '<label class="affix"><input inputmode="numeric" data-af="own_daily_stop_losses" value="' + esc(f.own_daily_stop_losses) + '" placeholder="2" style="font-size:16px"><span>verliezers</span></label>' +
          '<label class="affix"><input inputmode="decimal" data-af="own_daily_stop_pct" value="' + esc(f.own_daily_stop_pct) + '" placeholder="2" style="font-size:16px"><span>% per dag</span></label></div>' +
          '<span class="hint">Je eigen grens, strenger dan die van de prop firm. Je krijgt een waarschuwing als je dichtbij komt.</span></div>'
        : '<span class="hint">Groepeer je backtests per strategie of periode, zodat je ze kunt vergelijken.</span>') +
    '</div>' +
    '<div class="sheet-foot">' + (f.id ? '<button type="button" class="btn danger" data-a="acc-del" data-v="' + f.id + '" style="height:54px;border-radius:14px">Verwijderen</button>' : '') +
      '<button type="button" class="btn primary block" data-a="acc-save" style="flex:1"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Opslaan…' : 'Opslaan') + '</button></div>' +
  '</div></div>';
}
function loginHtml() {
  return '<div class="login"><form data-form="login">' +
    '<span class="brand-mark" style="width:48px;height:48px;border-radius:12px">' + I.mark + '</span>' +
    '<h1>Trading Journal</h1><span class="muted">Log in om je trades te zien.</span>' +
    '<label class="field"><span class="lab">E-mail</span><input class="input" type="email" name="email" autocomplete="username" required></label>' +
    '<label class="field"><span class="lab">Wachtwoord</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>' +
    (S.loginErr ? '<span class="err">' + esc(S.loginErr) + '</span>' : '') +
    '<button class="btn primary block" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Bezig…' : 'Inloggen') + '</button>' +
  '</form></div>';
}

/* ---------------- render ---------------- */
function render() {
  document.body.className = 'mode-' + S.mode;
  const keep = {};
  document.querySelectorAll('[data-keep]').forEach((el) => { keep[el.getAttribute('data-keep')] = el.scrollTop; });
  const active = document.activeElement;
  const activeKey = active && (active.getAttribute('data-f') || active.getAttribute('data-af'));
  let html;
  if (!S.ready) html = '<div class="login"><div class="spinner"></div></div>';
  else if (!S.session) html = loginHtml();
  else {
    html = shellHtml();
    if (S.form) html += formSheet();
    else if (S.detail) html += detailSheet();
    if (S.accForm) html += accSheet();
    if (S.lightbox) html += '<div class="lightbox" data-a="lbclose"><img src="' + esc(urlOf(S.lightbox)) + '" alt="Screenshot"><button type="button" class="iconbtn" data-a="lbclose" aria-label="Sluiten">' + I.close + '</button></div>';
  }
  if (S.toast) html += '<div class="toast" role="status">' + esc(S.toast) + '</div>';
  $app.innerHTML = html;
  document.documentElement.style.overflow = (S.form || S.detail || S.accForm || S.lightbox) ? 'hidden' : '';
  document.querySelectorAll('[data-keep]').forEach((el) => { const k = el.getAttribute('data-keep'); if (keep[k]) el.scrollTop = keep[k]; });
  if (activeKey) {
    const el = document.querySelector('[data-f="' + activeKey + '"],[data-af="' + activeKey + '"]');
    if (el && el.tagName !== 'SELECT') { el.focus({ preventScroll: true }); }
  }
}

/* ---------------- events ---------------- */
function addTag(field) {
  const v = prompt(field === 'setups' ? 'Naam van de setup' : 'Omschrijf de fout');
  if (!v || !v.trim()) return;
  const x = v.trim();
  if (S.form[field].indexOf(x) < 0) S.form[field].push(x);
  render();
}
function toggleIn(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.getAttribute('data-a');
  const v = el.getAttribute('data-v');
  const f = S.form;
  switch (a) {
    case 'mode': S.mode = v; S.pair = 'all'; savePrefs(); render(); break;
    case 'view': S.view = v; render(); window.scrollTo(0, 0); break;
    case 'period': S.period = v; savePrefs(); render(); break;
    case 'pair': S.pair = v; render(); break;
    case 'new': openNew(); break;
    case 'open': {
      S.detail = v; render();
      const t = S.trades.find((x) => x.id === v);
      if (t && (t.screenshots || []).length) ensureUrls(t.screenshots);
      break;
    }
    case 'close': if (S.form) closeForm(); else { S.detail = null; render(); } break;
    case 'edit': { const t = S.trades.find((x) => x.id === v); if (t) openEdit(t); break; }
    case 'del': deleteTrade(v); break;
    case 'save': saveForm(); break;
    case 'lightbox': S.lightbox = v; render(); break;
    case 'lbclose': S.lightbox = null; render(); break;
    case 'f-pair': f.pair = v; render(); break;
    case 'f-addpair': {
      const p = prompt('Welk pair? Bijvoorbeeld USDJPY, XAGUSD of NAS100');
      if (p && p.trim()) { f.pair = p.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); render(); }
      break;
    }
    case 'f-dir': f.direction = v; render(); break;
    case 'f-tf': f.timeframe = f.timeframe === v ? '' : v; render(); break;
    case 'f-out': f.outcome = f.outcome === v ? null : v; render(); break;
    case 'f-more': f.more = !f.more; render(); break;
    case 'f-setup': toggleIn(f.setups, v); render(); break;
    case 'f-mistake': toggleIn(f.mistakes, v); render(); break;
    case 'f-emo': f.emotion = f.emotion === v ? '' : v; render(); break;
    case 'f-addsetup': addTag('setups'); break;
    case 'f-addmistake': addTag('mistakes'); break;
    case 'f-rmshot': f.shots = f.shots.filter((p) => p !== v); f.removed.push(v); render(); break;
    case 'f-rmnew': { const i = Number(v); URL.revokeObjectURL(f.newFiles[i].url); f.newFiles.splice(i, 1); render(); break; }
    case 'acc-new': openAccForm(null); break;
    case 'acc-edit': openAccForm(accById(v)); break;
    case 'acc-pick': S.acc[S.mode] = S.acc[S.mode] === v ? 'all' : v; savePrefs(); render(); break;
    case 'acc-close': S.accForm = null; render(); break;
    case 'acc-save': saveAcc(); break;
    case 'acc-del': deleteAcc(v); break;
    case 'af-mode': S.accForm.mode = v; render(); break;
    case 'reload': loadAll(); break;
    case 'export': exportCsv(); break;
    case 'logout': if (confirm('Uitloggen?')) { await sb.auth.signOut(); } break;
    default: break;
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.hasAttribute('data-f') && S.form) S.form[t.getAttribute('data-f')] = t.value;
  else if (t.hasAttribute('data-af') && S.accForm) S.accForm[t.getAttribute('data-af')] = t.value;
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.getAttribute('data-filter') === 'acc') { S.acc[S.mode] = t.value; savePrefs(); render(); return; }
  if (t.hasAttribute('data-file') && S.form) {
    Array.from(t.files || []).forEach((file) => S.form.newFiles.push({ file, url: URL.createObjectURL(file) }));
    render(); return;
  }
  if (t.hasAttribute('data-f') && S.form) {
    const k = t.getAttribute('data-f');
    S.form[k] = t.value;
    if (k === 'session') S.form.sessionManual = true;
    if (k === 'opened_at' && !S.form.sessionManual && t.value) { S.form.session = sessionFor(new Date(t.value)); render(); }
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.getAttribute('data-form') !== 'login') return;
  e.preventDefault();
  S.busy = true; S.loginErr = null; render();
  const fd = new FormData(form);
  const { error } = await sb.auth.signInWithPassword({ email: String(fd.get('email')).trim(), password: String(fd.get('password')) });
  S.busy = false;
  if (error) { S.loginErr = /invalid/i.test(error.message) ? 'E-mail of wachtwoord klopt niet.' : error.message; render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (S.lightbox) S.lightbox = null;
  else if (S.accForm) S.accForm = null;
  else if (S.form) { closeForm(); return; }
  else if (S.detail) S.detail = null;
  else return;
  render();
});

function exportCsv() {
  const list = filteredTrades();
  const head = ['datum', 'modus', 'account', 'pair', 'richting', 'sessie', 'timeframe', 'resultaat_r', 'resultaat_dollar', 'entry', 'stop_loss', 'take_profit', 'exit', 'setups', 'emotie', 'fouten', 'notitie'];
  const q = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = list.map((t) => [toLocalInput(new Date(t.opened_at)).replace('T', ' '), t.mode, (accById(t.account_id) || {}).name, t.pair, t.direction, t.session, t.timeframe,
    t.result_r == null ? '' : String(t.result_r).replace('.', ','), t.result_money == null ? '' : String(t.result_money).replace('.', ','),
    t.entry_price, t.stop_loss, t.take_profit, t.exit_price, (t.setups || []).join(' | '), t.emotion, (t.mistakes || []).join(' | '), t.notes].map(q).join(';'));
  const blob = new Blob(['﻿' + [head.join(';')].concat(rows).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'trading-journal-' + dayKey(new Date()) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------- boot ---------------- */
sb.auth.onAuthStateChange((event, session) => {
  const was = !!S.session;
  S.session = session;
  S.ready = true;
  if (session && (!was || !S.loaded) && !S.loading) setTimeout(loadAll, 0);
  if (!session) { S.accounts = []; S.trades = []; S.loaded = false; S.form = null; S.detail = null; S.accForm = null; }
  render();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.session && S.loaded && !S.form && !S.accForm) loadAll(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
render();
