// ---------- 05e · R4: Xác nhận lịch, đăng bài, số liệu, đồng hồ demo (mục 10.22) ----------
import { fold, hash32, isValidTime, isValidUrl, isValidYMD, minutesOf, mondayOf, parseYMD } from './01-util.js';
import { byId, log, relinkShares, slotColumnId, slotWarnings, weekOf, weekSlots } from './05-model.js';
import { stampRatios } from './05q-imgspec.js';
// Đăng và số liệu ở R4 là mô phỏng xác định; dữ liệu đã đúng dạng để R6–R7 nối API/Metricool/Postiz thật.

// ---- Thời điểm dạng 'YYYY-MM-DDTHH:MM' ----
export function tsToMs(ts) { return parseYMD(ts.slice(0, 10)) + minutesOf(ts.slice(11, 16)) * 60000; }
export function msToTs(ms) { return new Date(ms).toISOString().slice(0, 16); }
export function tsAddMin(ts, m) { return msToTs(tsToMs(ts) + m * 60000); }
export function isValidTs(ts) { return typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ts) && isValidYMD(ts.slice(0, 10)) && isValidTime(ts.slice(11, 16)); }
export function slotTs(s) { return `${s.date}T${s.time}`; }

// ---- Nền tảng, cách đăng theo kênh ----
export const PLATFORMS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', youtube: 'YouTube', blog: 'Blog', other: 'Khác' };
export const PUBLISH_VIA = { api: 'API riêng', metricool: 'Metricool', postiz: 'Postiz' };
export const METRICS_VIA = { api: 'API riêng', metricool: 'Metricool', postiz: 'Postiz', none: 'Không' };
export const PLATFORM_OF_ID = { 'ch-fb': 'facebook', 'ch-ig': 'instagram', 'ch-tt': 'tiktok', 'ch-th': 'threads', 'ch-yt': 'youtube', 'ch-blog': 'blog' };
const DEFAULT_PUBLISH = {
  facebook: { mode: 'auto', via: 'api', metrics: 'api' }, instagram: { mode: 'auto', via: 'api', metrics: 'api' },
  threads: { mode: 'auto', via: 'metricool', metrics: 'metricool' }, youtube: { mode: 'auto', via: 'postiz', metrics: 'postiz' },
  tiktok: { mode: 'manual', via: 'metricool', metrics: 'metricool' }, blog: { mode: 'manual', via: 'api', metrics: 'none' },
  other: { mode: 'manual', via: 'metricool', metrics: 'metricool' },
};
export function defaultPublish(platform) { return Object.assign({}, DEFAULT_PUBLISH[platform] || DEFAULT_PUBLISH.other); }
export function channelPlatform(ch) { return ch && PLATFORMS[ch.platform] ? ch.platform : 'other'; }
export function channelPublish(S, channelId) {
  const ch = byId(S.channels, channelId);
  return ch && ch.publish ? ch.publish : defaultPublish(channelPlatform(ch));
}
export function setChannelPublish(S, channelId, patch) {
  const ch = byId(S.channels, channelId); if (!ch) return { ok: false, error: 'Không tìm thấy kênh.' };
  const next = Object.assign({}, channelPublish(S, channelId), patch);
  if (!['auto', 'manual'].includes(next.mode)) return { ok: false, error: 'Cách đăng không hợp lệ.' };
  if (!PUBLISH_VIA[next.via]) return { ok: false, error: 'Đường đăng không hợp lệ.' };
  if (!METRICS_VIA[next.metrics]) return { ok: false, error: 'Nguồn số liệu không hợp lệ.' };
  if (patch.platform) { if (!PLATFORMS[patch.platform]) return { ok: false, error: 'Nền tảng không hợp lệ.' }; ch.platform = patch.platform; delete next.platform; }
  ch.publish = { mode: next.mode, via: next.via, metrics: next.metrics };
  log(S, 'publish-config', 'channel', channelId, `${next.mode} · ${next.via} · ${next.metrics}`);
  return { ok: true };
}

// ---- Bộ chỉ số theo nền tảng (role: reach = Tiếp cận/xem, eng = Tương tác, avg = trung bình, sum = cộng dồn khác) ----
const METRIC_DEFS = {
  facebook: [{ k: 'reach', l: 'Reach', role: 'reach' }, { k: 'reactions', l: 'Cảm xúc', role: 'eng', r: [0.03, 0.08] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.005, 0.025] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.002, 0.012] }],
  instagram: [{ k: 'reach', l: 'Reach', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.04, 0.09] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.004, 0.015] }, { k: 'saves', l: 'Lưu', role: 'eng', r: [0.01, 0.04] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.003, 0.012] }],
  tiktok: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.04, 0.1] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.002, 0.01] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.002, 0.008] }, { k: 'avgWatch', l: 'Xem TB (giây)', role: 'avg', a: [7, 24] }],
  threads: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.03, 0.08] }, { k: 'replies', l: 'Trả lời', role: 'eng', r: [0.005, 0.02] }, { k: 'reposts', l: 'Đăng lại', role: 'eng', r: [0.002, 0.01] }],
  youtube: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'watchHours', l: 'Giờ xem', role: 'sum', r: [0.02, 0.06] }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.02, 0.05] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.002, 0.008] }],
  blog: [{ k: 'pageviews', l: 'Lượt xem trang', role: 'reach' }, { k: 'avgTime', l: 'Đọc TB (giây)', role: 'avg', a: [70, 210] }],
  other: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.02, 0.06] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.003, 0.01] }],
};
// Tiếp cận/xem sau 7 ngày (mô phỏng) theo nền tảng
const REACH_RANGE = { facebook: [1600, 6200], instagram: [900, 3600], tiktok: [2500, 24000], threads: [400, 2600], youtube: [450, 4200], blog: [150, 950], other: [300, 1500] };
export const MILESTONES = [{ key: '1h', min: 60, f: 0.25, label: '1 giờ' }, { key: '24h', min: 1440, f: 0.8, label: '24 giờ' }, { key: '7d', min: 10080, f: 1, label: '7 ngày' }];
export function metricDefs(S, s) {
  const p = channelPlatform(byId(S.channels, s.channelId));
  const defs = METRIC_DEFS[p].slice();
  const f = byId(S.formats, s.formatId);
  if (p === 'facebook' && f && f.layout === 'script') defs.splice(1, 0, { k: 'views', l: 'Lượt xem video', role: 'sum', r: [1.4, 2.6] });
  return defs;
}
function mockMetricValues(S, s, frac) {
  const p = channelPlatform(byId(S.channels, s.channelId));
  const u = k => hash32(`${s.id}|${s.date}|${k}`) / 4294967296;
  const [lo, hi] = REACH_RANGE[p];
  const reach = Math.round((lo + u('reach') * (hi - lo)) * frac);
  const out = {};
  metricDefs(S, s).forEach(d => {
    if (d.role === 'reach') out[d.k] = reach;
    else if (d.role === 'avg') out[d.k] = Math.round(d.a[0] + u(d.k) * (d.a[1] - d.a[0]));
    else { const rate = d.r[0] + u(d.k) * (d.r[1] - d.r[0]); out[d.k] = d.k === 'watchHours' ? Math.round(reach * rate * 10) / 10 : Math.round(reach * rate); }
  });
  return out;
}
// Tổng hợp một bộ giá trị thành Tiếp cận/xem và Tương tác
export function metricTotals(S, s, values) {
  let reach = 0, eng = 0;
  metricDefs(S, s).forEach(d => { const v = Number(values[d.k]) || 0; if (d.role === 'reach') reach += v; if (d.role === 'eng') eng += v; });
  return { reach, eng };
}
// Số liệu tăng liên tục theo thời gian kể từ lúc đăng (mô phỏng): nội suy giữa các mốc 0 → 1 giờ → 24 giờ → 7 ngày
const LIVE_CURVE = [[0, 0], [60, 0.25], [1440, 0.8], [10080, 1]];
export function liveFrac(min) {
  if (!(min > 0)) return 0;
  for (let i = 1; i < LIVE_CURVE.length; i++) {
    const [m1, f1] = LIVE_CURVE[i], [m0, f0] = LIVE_CURVE[i - 1];
    if (min <= m1) { const x = (min - m0) / (m1 - m0); return f0 + (f1 - f0) * Math.sqrt(x); }
  }
  return 1;
}
const LIVE_FIRST_MIN = 1; // lần lấy số liệu đầu tiên sau khi đăng (phút)
// Trạng thái số liệu của slot đã đăng tại thời điểm nowMs (mặc định = đồng hồ demo): giá trị hiện tại, nguồn, mốc mới nhất
export function slotMetricsNow(S, s, nowMs) {
  if (s.state !== 'PUBLISHED' || !s.pub || !isValidTs(s.pub.at)) return { status: 'unpublished', snap: null };
  const src = channelPublish(S, s.channelId).metrics;
  const snap = (s.metrics || []).length ? s.metrics[s.metrics.length - 1] : null;
  if (src === 'none' && !snap) return { status: 'none', snap: null, source: src };
  if (s.pub.mode === 'manual' && !s.pub.url && src !== 'api' && !snap) return { status: 'nolink', snap: null, source: src };
  const now = nowMs == null ? tsToMs(S.settings.demoNow) : nowMs;
  const min = (now - tsToMs(s.pub.at)) / 60000;
  if (min < LIVE_FIRST_MIN) return { status: 'wait', snap: null, source: src, nextAt: tsAddMin(s.pub.at, LIVE_FIRST_MIN) };
  const values = src === 'none' ? snap.values : mockMetricValues(S, s, liveFrac(min));
  return Object.assign({ status: 'ok', snap, values, source: snap && src === 'none' ? snap.source : src, minutes: min }, metricTotals(S, s, values));
}
// Ba con số hiện trên thẻ slot: tiếp cận/xem, tương tác, và bình luận (hoặc chỉ số đặc trưng khi nền tảng không có bình luận)
export function slotHeadline(S, s, m) {
  if (!m || m.status !== 'ok') return null;
  const defs = metricDefs(S, s);
  const r = defs.find(d => d.role === 'reach');
  const third = defs.find(d => /^(comments|replies)$/.test(d.k)) || defs.find(d => d.role === 'avg');
  return {
    reach: { l: r ? r.l : 'Tiếp cận', v: m.reach },
    eng: { l: 'Tương tác', v: m.eng },
    third: third ? { k: third.k, l: third.l, v: Number(m.values[third.k]) || 0, avg: third.role === 'avg' } : null,
  };
}
// Thêm các mốc số liệu đã qua theo đồng hồ demo (mô phỏng)
export function syncSlotMetrics(S, s) {
  if (s.state !== 'PUBLISHED' || !s.pub || !isValidTs(s.pub.at)) return 0;
  const src = channelPublish(S, s.channelId).metrics;
  if (src === 'none') return 0;
  if (s.pub.mode === 'manual' && !s.pub.url && src !== 'api') return 0; // Metricool/Postiz khớp bài theo link
  s.metrics = s.metrics || [];
  let added = 0;
  MILESTONES.forEach(m => {
    const at = tsAddMin(s.pub.at, m.min);
    if (at > S.settings.demoNow || s.metrics.some(x => x.key === m.key)) return;
    s.metrics.push({ key: m.key, at, source: src, values: mockMetricValues(S, s, m.f), simulated: true });
    added++;
  });
  s.metrics.sort((a, b) => a.at.localeCompare(b.at));
  return added;
}
export function syncMetrics(S) { let n = 0; S.slots.forEach(s => { n += syncSlotMetrics(S, s); }); return n; }

// ---- Link giả theo nền tảng (mô phỏng tự đăng) ----
function brandHandle(S) {
  const name = (S.brand && S.brand.parsed && S.brand.parsed.name) || 'thuonghieu';
  return fold(name.split('\n')[0]).replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'thuonghieu';
}
export function mockPostUrl(S, s) {
  const h = brandHandle(S); const p = channelPlatform(byId(S.channels, s.channelId));
  const n = String(hash32(`${s.id}|url`)) + String(hash32(`${s.id}|url2`)).slice(0, 6);
  const code = (len) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789_-'; let x = ''; for (let i = 0; i < len; i++) x += a[hash32(`${s.id}|c${i}`) % a.length]; return x; };
  const f = byId(S.formats, s.formatId);
  if (p === 'facebook') return f && f.layout === 'script' ? `https://www.facebook.com/reel/${n}` : `https://www.facebook.com/${h}/posts/${n}`;
  if (p === 'instagram') return `https://www.instagram.com/p/${code(11)}/`;
  if (p === 'tiktok') return `https://www.tiktok.com/@${h}/video/${n}`;
  if (p === 'threads') return `https://www.threads.net/@${h}/post/${code(11)}`;
  if (p === 'youtube') return f && f.layout === 'script' ? `https://www.youtube.com/shorts/${code(11)}` : `https://www.youtube.com/watch?v=${code(11)}`;
  if (p === 'blog') return `https://${h}.vn/blog/${s.date}-${s.id}`;
  return `https://example.com/${h}/${s.id}`;
}

// ---- Xác nhận lịch (bước 7) ----
export function confirmGate(S, weekId) {
  const w = weekOf(S, weekId);
  if (!w) return { ok: false, reason: 'Tuần chưa có slot', blockers: [] };
  if (w.status === 'CONFIRMED') return { ok: false, reason: `Tuần đã chốt (bản ${w.revision})`, blockers: [] };
  const slots = weekSlots(S, weekId);
  if (!slots.length) return { ok: false, reason: 'Tuần chưa có slot', blockers: [] };
  const blockers = [];
  slots.forEach(s => {
    if (s.needsUpdate) blockers.push({ slot: s, why: 'Cần cập nhật' });
    else if (s.state === 'EMPTY') blockers.push({ slot: s, why: 'Chưa có bài' });
    else if (s.state === 'DRAFT') blockers.push({ slot: s, why: 'Chưa duyệt' });
  });
  return { ok: !blockers.length, reason: blockers.length ? `${blockers.length} slot chưa đạt` : '', blockers };
}
export function confirmSummary(S, weekId) {
  const slots = weekSlots(S, weekId); const now = S.settings.demoNow;
  const byChannel = {};
  let auto = 0, manual = 0, warned = 0, missingImages = 0, dueNow = 0;
  slots.forEach(s => {
    byChannel[s.channelId] = (byChannel[s.channelId] || 0) + 1;
    const p = channelPublish(S, s.channelId);
    if (s.state !== 'PUBLISHED') { if (p.mode === 'auto') auto++; else manual++; if (slotTs(s) <= now) dueNow++; }
    if (slotWarnings(S, s).length) warned++;
    missingImages += (s.assets || []).filter(a => !a.done).length;
  });
  return { total: slots.length, byChannel, auto, manual, warned, missingImages, dueNow, published: slots.filter(s => s.state === 'PUBLISHED').length };
}
export function confirmWeek(S, weekId) {
  const g = confirmGate(S, weekId); if (!g.ok) return { ok: false, error: g.reason, blockers: g.blockers };
  const w = weekOf(S, weekId);
  w.status = 'CONFIRMED'; w.revision = (w.revision || 0) + 1; w.confirmedAt = S.settings.demoNow;
  weekSlots(S, weekId).forEach(s => { s.confirmedText = s.text; });
  log(S, 'confirm', 'week', weekId, `bản ${w.revision}`);
  const r = runScheduler(S);
  return { ok: true, revision: w.revision, published: r.published.length };
}

// ---- Tự đăng (mô phỏng) ----
export function publishNow(S, s, mode, at, extra) {
  s.state = 'PUBLISHED';
  s.pub = Object.assign({ mode, via: channelPublish(S, s.channelId).via, url: '', at, asConfirmed: s.confirmedText == null || s.text === s.confirmedText, simulated: mode === 'auto' }, extra || {});
  s.metrics = [];
}
export function runScheduler(S) {
  const now = S.settings.demoNow; const published = [];
  S.weeks.filter(w => w.status === 'CONFIRMED').forEach(w => {
    weekSlots(S, w.id).forEach(s => {
      if (s.state !== 'APPROVED' || slotTs(s) > now) return;
      // Bài Blog đã gửi lên web qua API (lên lịch theo giờ slot): tới giờ thì thành Đã đăng với link web trả về (mục 10.40)
      if (s.webPost && s.webPost.status !== 'draft') { publishNow(S, s, 'auto', slotTs(s), { url: s.webPost.url || '', simulated: false, via: 'api' }); log(S, 'auto-publish', 'slot', s.id, 'api'); published.push(s.id); return; }
      if (channelPublish(S, s.channelId).mode !== 'auto') return;
      let at = slotTs(s); if (w.confirmedAt && w.confirmedAt > at) at = w.confirmedAt;
      at = tsAddMin(at, hash32(`${s.id}|jit`) % 4); if (at > now) at = now;
      publishNow(S, s, 'auto', at, { url: mockPostUrl(S, s) });
      log(S, 'auto-publish', 'slot', s.id, s.pub.via);
      published.push(s.id);
    });
  });
  syncMetrics(S);
  return { published };
}

// ---- Đánh dấu đã đăng (thủ công) và sửa thông tin đăng ----
export function publishGate(S, s) {
  if (!s) return { ok: false, reason: 'Không tìm thấy slot.' };
  const w = weekOf(S, s.weekId);
  if (!w || !(w.revision >= 1)) return { ok: false, reason: 'Chốt lịch trước (Xác nhận lịch).' };
  if (s.state !== 'APPROVED' && s.state !== 'PUBLISHED') return { ok: false, reason: 'Slot cần Đã duyệt.' };
  return { ok: true, reason: '' };
}
export function markPublished(S, slotId, input) {
  const s = byId(S.slots, slotId); const g = publishGate(S, s); if (!g.ok) return { ok: false, error: g.reason };
  const at = String(input.at || slotTs(s)).slice(0, 16);
  const url = String(input.url || '').trim();
  if (!isValidTs(at)) return { ok: false, error: 'Giờ đăng không hợp lệ.' };
  if (at > S.settings.demoNow) return { ok: false, error: 'Giờ đăng ở sau giờ hiện tại (giờ demo).' };
  if (url && !isValidUrl(url)) return { ok: false, error: 'Link phải bắt đầu bằng http:// hoặc https://.' };
  const asConfirmed = input.asConfirmed !== false;
  if (s.state === 'PUBLISHED' && s.pub && s.pub.mode === 'auto') return { ok: false, error: 'Bài tự đăng chỉ xem; thông tin đăng lấy từ nền tảng.' };
  if (s.state === 'PUBLISHED' && s.pub) {
    const timeChanged = s.pub.at !== at; const linkAdded = !s.pub.url && url;
    Object.assign(s.pub, { url, at, asConfirmed });
    if (timeChanged || linkAdded) s.metrics = [];
    log(S, 'edit-publish', 'slot', s.id);
  } else {
    publishNow(S, s, 'manual', at, { url, asConfirmed, simulated: false });
    log(S, 'mark-published', 'slot', s.id);
  }
  syncSlotMetrics(S, s);
  return { ok: true, slot: s };
}
export function unmarkPublished(S, slotId) {
  const s = byId(S.slots, slotId); if (!s || s.state !== 'PUBLISHED') return { ok: false, error: 'Slot chưa đăng.' };
  if (s.pub && s.pub.mode === 'auto') return { ok: false, error: 'Bài tự đăng không bỏ đánh dấu được.' };
  s.state = 'APPROVED'; s.pub = null; s.metrics = []; s.changedAfterPublish = false;
  log(S, 'unmark-published', 'slot', s.id);
  return { ok: true };
}

// ---- Đồng hồ demo (D127) ----
export function setDemoNow(S, ts) {
  if (!isValidTs(ts)) return { ok: false, error: 'Ngày giờ không hợp lệ.' };
  S.settings.demoNow = ts;
  if (S.settings.clock && S.settings.clock.running) S.settings.clock.anchor = null; // neo lại ở lần chạy tới
  const r = runScheduler(S);
  return { ok: true, published: r.published.length };
}
// Đồng hồ demo chạy theo giờ thật: neo {demoMs, realMs}; giờ demo = demoMs + (giờ thật − realMs)
export function clockOf(S) { if (!S.settings.clock) S.settings.clock = { running: true, anchor: null }; return S.settings.clock; }
export function clockNowMs(S, realMs) {
  const c = clockOf(S); const base = tsToMs(S.settings.demoNow);
  if (!c.running) return base;
  if (!c.anchor) c.anchor = { demoMs: base, realMs };
  return Math.max(base, c.anchor.demoMs + (realMs - c.anchor.realMs));
}
// Một nhịp đồng hồ: cập nhật demoNow theo phút, chạy lịch tự đăng và mốc số liệu; trả về giờ ms và các thay đổi
export function clockTick(S, realMs) {
  const ms = clockNowMs(S, realMs);
  const ts = msToTs(Math.floor(ms / 60000) * 60000);
  let changed = false, published = 0, metrics = 0;
  if (ts > S.settings.demoNow) {
    S.settings.demoNow = ts; changed = true;
    published = runScheduler(S).published.length;
    metrics = syncMetrics(S);
  }
  return { ms, changed, published, metrics };
}
export function setClockRunning(S, on, realMs) {
  const c = clockOf(S);
  if (!on && c.running) clockTick(S, realMs);
  c.running = !!on; c.anchor = on ? { demoMs: tsToMs(S.settings.demoNow), realMs } : null;
  return { ok: true };
}

// ---- Báo cáo (màn Báo cáo, header Dashboard) ----
// filter: { from, to (YYYY-MM-DD, gồm cả hai đầu; bỏ trống = toàn bộ), channels: [] }
export function reportStats(S, filter) {
  const f = filter || {};
  const posts = S.slots.filter(s => s.state === 'PUBLISHED' && s.pub
    && (!f.from || s.date >= f.from) && (!f.to || s.date <= f.to)
    && (!f.channels || !f.channels.length || f.channels.includes(s.channelId)));
  const blank = () => ({ posts: 0, reach: 0, eng: 0, tracked: 0, onTime: 0, asConfirmed: 0, values: {} });
  const add = (b, s, m) => {
    b.posts++; if (isOnTime(s)) b.onTime++; if (s.pub.asConfirmed) b.asConfirmed++;
    if (m.status === 'ok') { b.tracked++; b.reach += m.reach; b.eng += m.eng; Object.entries(m.values).forEach(([k, v]) => { b.values[k] = (b.values[k] || 0) + v; }); }
  };
  const total = blank(); const byChannel = {}; const byColumn = {}; const byFormat = {}; const byDay = {}; const byWeek = {};
  const rows = [];
  posts.forEach(s => {
    const m = slotMetricsNow(S, s);
    add(total, s, m);
    add(byChannel[s.channelId] = byChannel[s.channelId] || blank(), s, m);
    const col = slotColumnId(S, s) || '';
    add(byColumn[col] = byColumn[col] || blank(), s, m);
    add(byFormat[s.formatId] = byFormat[s.formatId] || blank(), s, m);
    add(byDay[s.date] = byDay[s.date] || blank(), s, m);
    const wk = mondayOf(s.date); add(byWeek[wk] = byWeek[wk] || blank(), s, m);
    rows.push({ slot: s, reach: m.status === 'ok' ? m.reach : 0, eng: m.status === 'ok' ? m.eng : 0, status: m.status });
  });
  [total].concat(Object.values(byChannel), Object.values(byColumn), Object.values(byFormat), Object.values(byDay), Object.values(byWeek)).forEach(b => {
    b.engRate = b.reach ? b.eng / b.reach : 0;
    // trung bình cho chỉ số "avg" (cộng dồn ở trên): chia cho số bài có số liệu
    ['avgWatch', 'avgTime'].forEach(k => { if (b.values[k] != null && b.tracked) b.values[k] = Math.round(b.values[k] / b.tracked); });
  });
  const top = rows.filter(r => r.status === 'ok').sort((a, b) => b.eng - a.eng || b.reach - a.reach).slice(0, 5);
  return { total, byChannel, byColumn, byFormat, byDay, byWeek, rows, top };
}
export function isOnTime(s) { return !!(s.pub && isValidTs(s.pub.at)) && tsToMs(s.pub.at) - tsToMs(slotTs(s)) <= 30 * 60000; }

// ---- Di trú dữ liệu trước R4 (cùng DATA_VERSION) ----
export function migrateState(S) {
  if (!Array.isArray(S.blogPosts)) S.blogPosts = [];
  (S.slots || []).forEach(s => stampRatios(S, s)); // chuẩn ảnh theo nền tảng (mục 10.42)
  relinkShares(S); // ảnh dùng chung giữa các slot (10.70): nối lại cùng một mảng phiên bản
  (S.channels || []).forEach(ch => {
    if (!ch.platform) ch.platform = PLATFORM_OF_ID[ch.id] || 'other';
    if (!ch.publish) ch.publish = defaultPublish(ch.platform);
  });
  // Hoàn thành Matrix (10.66): tuần đã Chia bài trước đó coi như đã Hoàn thành
  (S.weeks || []).forEach(w => {
    if (w.matrixDoneAt === undefined) w.matrixDoneAt = w.dealtAt || ((S.slots || []).some(s => s.weekId === w.id && s.sourceCellId) ? (S.settings && S.settings.demoNow) || w.startDate : null);
  });
  const confirmed = new Set((S.weeks || []).filter(w => w.revision >= 1).map(w => w.id));
  (S.slots || []).forEach(s => {
    if (s.pub === undefined) {
      s.pub = s.state === 'PUBLISHED' ? { mode: 'manual', via: channelPublish(S, s.channelId).via, url: s.publishedUrl || '', at: s.publishedAt || slotTs(s), asConfirmed: s.publishedAsConfirmed !== false, simulated: false } : null;
    }
    if (!Array.isArray(s.metrics)) s.metrics = [];
    if (s.confirmedText === undefined) s.confirmedText = confirmed.has(s.weekId) ? s.text : null;
    delete s.publishedAt; delete s.publishedUrl; delete s.publishedAsConfirmed;
  });
  return S;
}
