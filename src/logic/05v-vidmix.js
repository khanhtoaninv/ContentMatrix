// ---------- 05v · Short Vid: Vid tự do kiểu mới (Nạp → Dàn ý → Kịch bản → Biên tập → Xếp Slot), mục 10.84 ----------
import { countWords, splitSentences } from './01-util.js';
import { byId, cellView, log } from './05-model.js';
import { aiSystem } from './05o-aitext.js';
import { fmtClock } from './05n-media.js';
import { VID_LEN_MAX, VID_LEN_MIN, lenWords, newVideo, vidBody, vidSections, vidSettingsOf, vidWords, vidsOf } from './05s-shortvid.js';
import { FREE_HOOKS, VID_MAX_FREE, addSceneItems, addVidMedia, autoBuild, editOf, ensureFreeTopic, planEdit, scheduleVideo, suggestVidDates, vidChannels, vidSlotsOf } from './05t-videdit.js';
import { VID_TEMPLATES, applyTemplate, completeEdit, vidLibOf } from './05u-vidpop.js';
// Một Vid tự do = nhiều nguyên liệu (v.inputs) → các ô trích ra (v.cells) → dàn ý đã duyệt (v.outline) → kịch bản → cảnh (v.edit).
// Trích ô bằng luật đơn giản (số liệu, câu kêu gọi, trích dẫn…); chưa gọi AI. Link bài / sản phẩm / video không đọc được từ trình duyệt: dán nội dung vào ô văn bản.

export const MIX_KINDS = {
  idea: { name: 'Ý tưởng', text: true }, script: { name: 'Kịch bản có sẵn', text: true }, matrix: { name: 'Bài Matrix', text: true },
  voice: { name: 'Giọng đọc', media: 'audio' }, talk: { name: 'Clip người nói', media: 'video' }, broll: { name: 'B-roll', media: 'video' },
  image: { name: 'Ảnh', media: 'image' }, long: { name: 'Video dài', media: 'video' }, subs: { name: 'Phụ đề / bản chép lời', text: true },
  article: { name: 'Bài viết', text: true }, product: { name: 'Sản phẩm', text: true }, vlink: { name: 'Video mẫu (chỉ lấy khuôn)', text: true },
  sample: { name: 'Mẫu dựng', text: true }, data: { name: 'Bảng số liệu', text: true }, comment: { name: 'Ảnh bình luận', media: 'image' }, oldvid: { name: 'Thẻ Vid cũ', text: true },
};
export const MIX_CELL_TYPES = ['Ý chính', 'Số liệu', 'Lời nói', 'Ví dụ', 'Kêu gọi', 'Hình', 'Mẫu dựng'];
export const MIX_MAX_INPUTS = 20;
export const MIX_VARIANTS = { hook: 'Hook mới', short: 'Cắt ngắn 30 giây', en: 'Dịch tiếng Anh' };
const FILL = ['Hãy thử áp dụng ngay hôm nay để thấy khác biệt.', 'Chỉ cần vài phút mỗi ngày là đủ để bắt đầu.', 'Làm đều đặn quan trọng hơn làm thật nhiều trong một lần.', 'Bạn sẽ thấy tiến bộ rõ sau vài tuần kiên trì.', 'Đây là điều nhiều người bỏ qua nhưng lại rất quan trọng.',
  'Bắt đầu từ việc nhỏ nhất rồi tăng dần mức độ khó.', 'Đừng so sánh mình với người khác, hãy so với chính mình của tuần trước.', 'Ghi lại những gì bạn làm được để thấy mình đang tiến lên.', 'Sai không đáng sợ, bỏ cuộc mới đáng tiếc.', 'Nếu thấy khó, hãy chia nhỏ việc ra và làm từng phần một.', 'Một thói quen tốt cần vài tuần để hình thành, nên hãy kiên nhẫn.', 'Chia sẻ video này cho người bạn cũng đang cần nó.'];
const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const endDot = s => { s = String(s || '').trim(); return /[.!?…]$/.test(s) ? s : s + '.'; };
const plain = t => String(t || '').replace(/^\s*#{1,6}\s+/gm, '').replace(/^\s*([-*+]|\d+[.)])\s+/gm, '').replace(/\*\*|__|`/g, '').replace(/\r/g, '');
const vidGet = (S, id) => byId(S.videos || [], id);
const isMix = v => !!v && v.origin === 'mix';

// ---- Nhận diện loại nguyên liệu ----
export function detectKind(p) {
  const P = p || {}; const name = String(P.name || '').toLowerCase(); const type = String(P.type || ''); const text = String(P.text || '').trim(); const url = String(P.url || '').trim();
  if (url && !text) { if (/youtu\.?be|tiktok|vimeo|facebook\.com\/(watch|reel|.*videos)|instagram\.com\/reel/i.test(url)) return 'vlink'; if (/shop|product|san-pham|sanpham|tiki|lazada|amazon|\/p\/|\/dp\//i.test(url)) return 'product'; return 'article'; }
  if (/^audio\//.test(type)) return 'voice';
  if (/^image\//.test(type)) return /binh-?luan|comment|cmt|chat|zalo|inbox|messenger|review/.test(name) ? 'comment' : 'image';
  if (/^video\//.test(type)) return Number(P.dur) > 300 ? 'long' : /talk|noi|phong-?van|interview|nguoi-?noi/.test(name) ? 'talk' : 'broll';
  if (/\.(srt|vtt)$/.test(name) || /^\d+\s*\n\s*\d\d:\d\d:\d\d/.test(text) || /\d\d:\d\d:\d\d[.,]\d+\s*-->/.test(text)) return 'subs';
  if (/\.(csv|tsv)$/.test(name) || (text.split('\n').filter(l => l.trim()).length >= 3 && text.split('\n').filter(l => l.trim()).every(l => /[,;\t]/.test(l)) && /\d/.test(text))) return 'data';
  if (/^\s*\[[^\]]+\]\s*$/m.test(text)) return 'script';
  if (/^(mẫu dựng|khuôn)/i.test(text)) return 'sample';
  if (text && text.length < 220 && !/\n\s*\n/.test(text)) return 'idea';
  return text ? 'article' : 'idea';
}

// ---- Trích ô từ nguyên liệu ----
function classify(sent) {
  const s = sent.trim();
  if (/["“”«»]/.test(s)) return 'Lời nói';
  if (/^(ví dụ|chẳng hạn|như)\b/i.test(s)) return 'Ví dụ';
  if (/\d/.test(s) && /(%|triệu|nghìn|tỷ|\d{2,}|lần|giờ|phút|ngày|tuần|tháng)/i.test(s)) return 'Số liệu';
  if (countWords(s) <= 22 && /(theo dõi|lưu (lại )?video|bình luận|đăng ký|bấm|liên hệ|inbox|follow|comment|chia sẻ|đặt lịch|thử ngay|tải|nhắn)/i.test(s)) return 'Kêu gọi';
  return 'Ý chính';
}
const stripSubs = t => plain(t).replace(/^\s*\d+\s*$/gm, '').replace(/^.*-->.*$/gm, '').replace(/^WEBVTT.*$/gim, '').replace(/\n{2,}/g, '\n').trim();
function textCells(text, cap) {
  const ss = splitSentences(plain(text).replace(/\n+/g, ' ')).filter(s => countWords(s) >= 3); const per = {}; const out = [];
  for (const s of ss) { const t = classify(s); per[t] = (per[t] || 0) + 1; if (per[t] > (t === 'Ý chính' ? 5 : 3)) continue; out.push({ t, text: s.trim() }); if (out.length >= (cap || 10)) break; }
  return out;
}
function dataCells(text) {
  const rows = plain(text).split('\n').map(l => l.trim()).filter(Boolean); const out = [];
  const body = rows.length > 1 && !/\d/.test(rows[0].split(/[,;\t]/).slice(1).join('')) ? rows.slice(1) : rows;
  body.slice(0, 8).forEach(r => out.push({ t: 'Số liệu', text: r.split(/[,;\t]/).map(x => x.trim()).filter(Boolean).join(': ') }));
  return out;
}
function scriptCells(text) {
  const secs = vidSections(text); const out = [];
  secs.forEach((s, i) => { const t = /^cta|chốt|kêu gọi/i.test(s.label) ? 'Kêu gọi' : i === 0 || /hook/i.test(s.label) ? 'Ý chính' : 'Lời nói'; if (s.text) out.push({ t, text: s.text, label: s.label }); });
  return out;
}
function urlWords(url) { try { const u = new URL(url); return { host: u.hostname.replace(/^www\./, ''), slug: decodeURIComponent(u.pathname).split('/').filter(Boolean).pop() || '' }; } catch (e) { return { host: url, slug: '' }; } }
export function extractCells(S, v, inp) {
  const k = inp.kind; const out = []; const text = String(inp.text || '');
  const add = (t, tx, extra) => out.push(Object.assign({ t, text: String(tx).trim() }, extra || {}));
  if (MIX_KINDS[k].media) {
    const m = (v.media || []).find(x => x.id === inp.mediaId);
    const nm = (m && m.name || inp.name || 'tệp').replace(/\.[a-z0-9]{2,4}$/i, '');
    if (k === 'voice' || k === 'talk') {
      if (text.trim()) textCells(text, 8).forEach(c => add(c.t === 'Ý chính' ? 'Lời nói' : c.t, c.text));
      else add('Lời nói', `Lời trong "${nm}" (chưa chép; bấm Chép lời hoặc dán lời vào ô nguyên liệu)`, { sim: true });
      if (k === 'talk' && m) add('Hình', `Clip người nói: ${nm}`, { mediaId: m.id });
    } else if (k === 'long') add('Hình', `Video dài: ${nm}${m && m.dur ? ` (${fmtClock(m.dur)})` : ''}`, { mediaId: m && m.id });
    else add('Hình', (m && m.desc) || `${k === 'comment' ? 'Ảnh bình luận' : 'Hình'}: ${nm}`, { mediaId: m && m.id });
    return out;
  }
  if (k === 'script') scriptCells(text).forEach(c => add(c.t, c.text, { label: c.label }));
  else if (k === 'data') dataCells(text).forEach(c => add(c.t, c.text));
  else if (k === 'subs') textCells(stripSubs(text), 8).forEach(c => add(c.t === 'Ý chính' ? 'Lời nói' : c.t, c.text));
  else if (k === 'sample' || k === 'vlink') {
    add('Mẫu dựng', short(text || inp.name || inp.url || 'Khuôn dựng mẫu', 140), { sim: !text });
    if (k === 'vlink') add('Ý chính', 'Chỉ lấy khuôn dựng (nhịp cảnh, chữ nhấn); không lấy nội dung video mẫu.', { sim: true });
  } else if (k === 'oldvid') {
    const o = byId(S.videos || [], inp.vidId);
    if (o) { vidSections(o.script || '').slice(0, 6).forEach((s, i) => s.text && add(/cta|chốt/i.test(s.label) ? 'Kêu gọi' : i === 0 ? 'Ý chính' : 'Lời nói', s.text, { label: s.label })); add('Mẫu dựng', `Cách dựng của thẻ "${short(o.insight.title, 50)}"`); }
  } else if (text.trim()) {
    const cells = textCells(text, k === 'idea' ? 4 : 10); cells.forEach(c => add(c.t, c.text));
  } else if (inp.url) { const u = urlWords(inp.url); add('Ý chính', `${cap1(u.slug.replace(/[-_]+/g, ' ') || 'Nội dung')} (từ ${u.host}; chưa đọc được link, dán nội dung bài để trích đúng)`, { sim: true }); }
  if (!out.length) add('Ý chính', short(text || inp.name || 'Nguyên liệu', 160));
  return out;
}
const newCell = (v, inputId, c) => { v.cellSeq = (v.cellSeq || 1); return Object.assign({ id: `c${v.cellSeq++}`, src: inputId }, c); };
function fillCells(S, v, inp) { extractCells(S, v, inp).forEach(c => v.cells.push(newCell(v, inp.id, c))); }
function dropCells(v, inputId) { const ids = new Set(v.cells.filter(c => c.src === inputId).map(c => c.id)); v.cells = v.cells.filter(c => !ids.has(c.id)); v.outline = (v.outline || []).filter(id => !ids.has(id)); v.dyOk = false; }

// ---- Thẻ Vid tự do mới ----
export function newMixVideo(S, weekId, P) {
  const row = ensureFreeTopic(S, weekId);
  if (vidsOf(S, weekId, row.id).length >= VID_MAX_FREE) return { ok: false, error: `Hàng Video tự do đã đủ ${VID_MAX_FREE} thẻ.` };
  const v = newVideo(S, weekId, row.id, { title: String((P && P.title) || 'Vid tự do mới'), idea: '', reason: 'Nạp nguyên liệu, lập dàn ý rồi viết kịch bản.', source: '', kind: 'noihet', status: 'TODO', simulated: true });
  Object.assign(v, { origin: 'mix', media: [], inputs: [], cells: [], outline: [], dyOk: false, draft: true, lenSec: null, gen: false, tplId: 'script', request: '', cellSeq: 1, inputSeq: 1 });
  S.videos.push(v); log(S, 'vid-mix', 'video', v.id, 'mới'); return { ok: true, video: v };
}
// Thẻ mở ra mà chưa nạp gì: bỏ đi, không để lại thẻ rỗng
export function purgeEmptyMix(S) {
  const before = (S.videos || []).length;
  S.videos = (S.videos || []).filter(v => !(isMix(v) && v.draft && !(v.inputs || []).length && !v.script));
  return before - S.videos.length;
}
export function setVidLen(S, id, sec) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const n = Number(sec); if (!Number.isInteger(n) || n < VID_LEN_MIN || n > VID_LEN_MAX) return { ok: false, error: `Độ dài video phải là số nguyên ${VID_LEN_MIN}–${VID_LEN_MAX} giây.` };
  v.lenSec = n; return { ok: true, lenSec: n, words: lenWords(n, vidSettingsOf(S).wps) };
}
export const lenSecOf = (S, v) => (v && v.lenSec) || vidSettingsOf(S).lenSec;
// Kịch bản đang dài bao lâu so với độ dài đã chọn; lệch quá 15% thì báo
export function lenCheck(S, v) {
  const c = vidSettingsOf(S, v); const w = vidWords(v.script); const want = lenSecOf(S, v); const sec = Math.round(w / c.wps);
  return { want, sec, words: w, target: c.wordTarget, min: c.wordMin, max: c.wordMax, pct: want ? Math.round((sec - want) * 100 / want) : 0, ok: !w || (w >= c.wordMin && w <= c.wordMax) };
}

// ---- Nguyên liệu ----
export function addMixInput(S, id, p) {
  const v = vidGet(S, id); if (!isMix(v)) return { ok: false, error: 'Thẻ này không phải Vid tự do.' };
  if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  const P = p || {}; if ((v.inputs || []).length >= MIX_MAX_INPUTS) return { ok: false, error: `Tối đa ${MIX_MAX_INPUTS} nguyên liệu mỗi video.` };
  const media = P.media && P.media.src ? P.media : null; const text = String(P.text || '').replace(/\r/g, '').trim().slice(0, 20000); const url = String(P.url || '').trim().slice(0, 500);
  const type = media ? (/^data:([a-z]+)\//.exec(media.src) || [])[1] + '/' : '';
  let kind = P.kind || detectKind({ name: P.name || (media && media.name), type, text, url, dur: media && media.dur });
  if (!MIX_KINDS[kind]) return { ok: false, error: 'Loại nguyên liệu không hợp lệ.' };
  const inp = { id: `i${v.inputSeq = (v.inputSeq || 1)}`, kind, name: String(P.name || (media && media.name) || '').slice(0, 120), text, url };
  if (MIX_KINDS[kind].media) {
    if (!media) return { ok: false, error: 'Chọn tệp cho nguyên liệu này.' };
    const fam = (/^data:([a-z]+)\//.exec(media.src) || [])[1]; if (fam !== MIX_KINDS[kind].media) return { ok: false, error: `${MIX_KINDS[kind].name} cần tệp ${MIX_KINDS[kind].media === 'audio' ? 'âm thanh' : MIX_KINDS[kind].media === 'video' ? 'video' : 'ảnh'}.` };
    const r = addVidMedia(S, id, media); if (!r.ok) return r; inp.mediaId = r.media.id; inp.dur = r.media.dur || 0; if (!inp.name) inp.name = r.media.name;
  } else if (kind === 'matrix') {
    const cell = byId(S.cells || [], P.cellId); if (!cell || cell.weekId !== v.weekId) return { ok: false, error: 'Chọn một ô đã duyệt ở Matrix.' };
    const cv = cellView(S, cell); if (cv.state !== 'APPROVED') return { ok: false, error: 'Ô chưa được duyệt.' };
    inp.cellId = cell.id; inp.text = plain(vidBody(cv.text)).trim(); inp.name = inp.name || 'Bài Matrix';
  } else if (kind === 'oldvid') {
    const o = byId(S.videos || [], P.vidId); if (!o || o.id === id) return { ok: false, error: 'Chọn một thẻ Vid khác.' };
    inp.vidId = o.id; inp.name = inp.name || short(o.insight.title, 60); inp.text = '';
  } else if (!text && !url) return { ok: false, error: 'Dán nội dung hoặc link.' };
  v.inputs.push(inp); v.inputSeq++; fillCells(S, v, inp); v.dyOk = false; v.draft = false;
  if (v.inputs.length === 1 || /^Vid tự do mới$/.test(v.insight.title)) v.insight.title = short(`Vid tự do: ${inp.name || inp.text || inp.url || MIX_KINDS[kind].name}`.replace(/\s+/g, ' '), 100);
  log(S, 'vid-mix-input', 'video', id, kind);
  return { ok: true, input: inp, cells: v.cells.filter(c => c.src === inp.id) };
}
export function removeMixInput(S, id, iid) {
  const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid); if (!inp) return { ok: false, error: 'Không thấy nguyên liệu.' };
  dropCells(v, iid); v.inputs = v.inputs.filter(x => x !== inp);
  if (inp.mediaId && !v.inputs.some(x => x.mediaId === inp.mediaId)) { v.media = v.media.filter(m => m.id !== inp.mediaId); if (v.edit) v.edit.scenes.forEach(sc => { sc.items = sc.items.filter(it => it.mediaId !== inp.mediaId); }); }
  return { ok: true };
}
export function moveMixInput(S, id, iid, dir) {
  const v = vidGet(S, id); const a = v && v.inputs; const i = a ? a.findIndex(x => x.id === iid) : -1; if (i < 0) return { ok: false, error: 'Không thấy nguyên liệu.' };
  const j = i + (dir < 0 ? -1 : 1); if (j < 0 || j >= a.length) return { ok: false, error: 'Không dời được.' };
  [a[i], a[j]] = [a[j], a[i]]; v.dyOk = false; return { ok: true };
}
// Đổi loại nhận diện: trích lại ô của nguyên liệu đó (chỉ đổi trong cùng họ: chữ ↔ chữ, tệp ↔ tệp cùng kiểu)
export function setMixInputKind(S, id, iid, kind) {
  const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid); if (!inp) return { ok: false, error: 'Không thấy nguyên liệu.' };
  if (!MIX_KINDS[kind]) return { ok: false, error: 'Loại không hợp lệ.' };
  const a = MIX_KINDS[inp.kind], b = MIX_KINDS[kind];
  if (!!a.media !== !!b.media || (a.media && a.media !== b.media)) return { ok: false, error: `Không đổi "${a.name}" thành "${b.name}" được vì khác loại tệp.` };
  if (kind === 'matrix' && !inp.cellId) return { ok: false, error: 'Bài Matrix chọn từ ô Matrix.' };
  if (kind === 'oldvid' && !inp.vidId) return { ok: false, error: 'Thẻ Vid cũ chọn từ danh sách thẻ.' };
  if (inp.kind === kind) return { ok: true, cells: v.cells.filter(c => c.src === iid) };
  dropCells(v, iid); inp.kind = kind; fillCells(S, v, inp); return { ok: true, cells: v.cells.filter(c => c.src === iid) };
}
export function setMixInputText(S, id, iid, text) {
  const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid); if (!inp) return { ok: false, error: 'Không thấy nguyên liệu.' };
  inp.text = String(text || '').trim().slice(0, 20000); dropCells(v, iid); fillCells(S, v, inp); return { ok: true };
}
export function editMixCell(S, id, cid, patch) {
  const v = vidGet(S, id); const c = v && (v.cells || []).find(x => x.id === cid); if (!c) return { ok: false, error: 'Không thấy ô.' };
  if (patch.t != null) { if (!MIX_CELL_TYPES.includes(patch.t)) return { ok: false, error: 'Loại ô không hợp lệ.' }; c.t = patch.t; }
  if (patch.text != null) { const t = String(patch.text).trim().slice(0, 600); if (!t) return { ok: false, error: 'Ô không để trống.' }; c.text = t; c.sim = false; }
  v.dyOk = false; return { ok: true };
}

// ---- Dữ liệu mẫu để trải nghiệm ----
const svg = (w, h, bg, label) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="#fff" font-size="${Math.round(w / 12)}" font-family="sans-serif" text-anchor="middle">${label}</text></svg>`)}`;
export function loadMixSample(S, id) {
  const v = vidGet(S, id); if (!isMix(v)) return { ok: false, error: 'Thẻ này không phải Vid tự do.' };
  const set = [
    { kind: 'idea', name: 'Ý tưởng', text: '3 lỗi phát âm khiến người Việt bị hiểu nhầm khi nói tiếng Anh.' },
    { kind: 'article', name: 'Bài: lỗi phát âm', url: 'https://noiduoc.example/loi-phat-am', text: 'Nhiều người học nói đúng từ nhưng vẫn bị hiểu sai vì phát âm đuôi. Khoảng 68% học viên bỏ âm cuối khi nói nhanh. Ví dụ, "cats" bị nói thành "cat" nên người nghe không biết bạn nói số nhiều. Hãy luyện đọc chậm từng từ rồi tăng tốc dần. Lưu video lại để luyện mỗi sáng.' },
    { kind: 'data', name: 'so-lieu-hoc-vien.csv', text: 'Lỗi,Tỉ lệ học viên mắc\nBỏ âm đuôi -s,68%\nNuốt âm cuối,54%\nSai trọng âm,41%' },
    { kind: 'image', name: 'canh-lop-hoc.svg', media: { src: svg(270, 480, '#2f6f8f', 'Lớp học'), name: 'canh-lop-hoc.svg', size: 400, dur: 0, thumb: '' } },
    { kind: 'comment', name: 'binh-luan-hoc-vien.svg', media: { src: svg(270, 480, '#8f4f2f', 'Bình luận'), name: 'binh-luan-hoc-vien.svg', size: 400, dur: 0, thumb: '' } },
    { kind: 'sample', name: 'Mẫu 60 giây', text: 'Mẫu dựng: hook câu hỏi 3 giây, ba ý mỗi ý một cảnh, chữ nhấn ý, chốt kêu gọi.' },
  ];
  let n = 0; for (const s of set) { if (v.inputs.length >= MIX_MAX_INPUTS) break; const r = addMixInput(S, id, s); if (r.ok) n++; }
  return { ok: true, count: n };
}

// ---- Dàn ý ----
export function mixOutlineAdd(S, id, cid, at) {
  const v = vidGet(S, id); if (!v || !(v.cells || []).some(c => c.id === cid)) return { ok: false, error: 'Không thấy ô.' };
  if (v.outline.includes(cid)) return { ok: false, error: 'Ô đã có trong dàn ý.' };
  if (at != null && at >= 0 && at <= v.outline.length) v.outline.splice(at, 0, cid); else v.outline.push(cid);
  v.dyOk = false; return { ok: true };
}
export function mixOutlineAddAll(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  let n = 0; (v.inputs || []).forEach(inp => v.cells.filter(c => c.src === inp.id && !v.outline.includes(c.id)).forEach(c => { v.outline.push(c.id); n++; }));
  if (n) v.dyOk = false; return { ok: true, count: n };
}
export function mixOutlineRemove(S, id, cid) { const v = vidGet(S, id); if (!v || !v.outline.includes(cid)) return { ok: false, error: 'Ô không có trong dàn ý.' }; v.outline = v.outline.filter(x => x !== cid); v.dyOk = false; return { ok: true }; }
export function mixOutlineMove(S, id, cid, dir) {
  const v = vidGet(S, id); const a = v && v.outline; const i = a ? a.indexOf(cid) : -1; if (i < 0) return { ok: false, error: 'Ô không có trong dàn ý.' };
  const j = i + (dir < 0 ? -1 : 1); if (j < 0 || j >= a.length) return { ok: false, error: 'Không dời được.' };
  [a[i], a[j]] = [a[j], a[i]]; v.dyOk = false; return { ok: true };
}
export function mixOutlineCells(v) { const m = new Map((v.cells || []).map(c => [c.id, c])); return (v.outline || []).map(id => m.get(id)).filter(Boolean); }
export function confirmMixOutline(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const cs = mixOutlineCells(v); if (!cs.length) return { ok: false, error: 'Dàn ý chưa có ô nào. Kéo ô sang cột bên phải hoặc bấm Thêm tất cả.' };
  if (!cs.some(c => c.t !== 'Hình' && c.t !== 'Mẫu dựng')) return { ok: false, error: 'Dàn ý cần ít nhất một ô chữ (Ý chính, Số liệu, Lời nói, Ví dụ, Kêu gọi).' };
  v.dyOk = true; return { ok: true, count: cs.length };
}

// ---- Kịch bản từ dàn ý ----
const labelParas = t => { const ps = String(t || '').replace(/\r/g, '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean); return ps.map((p, i) => `[${i === 0 ? 'Hook' : i === ps.length - 1 && ps.length > 2 ? 'CTA' : `Đoạn ${i}`}]\n${p}`).join('\n\n'); };
const sentOf = c => c.t === 'Số liệu' ? `Con số đáng chú ý: ${c.text}` : c.t === 'Ví dụ' ? (/^(ví dụ|chẳng hạn)/i.test(c.text) ? c.text : `Ví dụ: ${c.text}`) : c.text;
const chunk = (list, maxW) => { const out = []; let cur = [], w = 0; list.forEach(s => { const n = countWords(s); if (cur.length && w + n > maxW) { out.push(cur); cur = []; w = 0; } cur.push(s); w += n; }); if (cur.length) out.push(cur); return out; };
export function mixSourceCells(v) { const o = mixOutlineCells(v); return o.length ? o : (v.cells || []); }
function mixMock(S, v) {
  // Chỉ có kịch bản nạp sẵn (và hình/mẫu dựng): giữ nguyên kịch bản của người dùng, không viết lại
  const srcCells = mixSourceCells(v); const textCells = srcCells.filter(x => x.t !== 'Hình' && x.t !== 'Mẫu dựng');
  const scr = (v.inputs || []).filter(i => i.kind === 'script');
  if (scr.length === 1 && textCells.length && textCells.every(x => x.src === scr[0].id) && scr[0].text.trim()) return { script: /^\s*\[[^\]]+\]\s*$/m.test(scr[0].text) ? scr[0].text.trim() : labelParas(scr[0].text), audio: '', image: '' };
  const c = vidSettingsOf(S, v); const cells = mixSourceCells(v).filter(x => x.t !== 'Hình' && x.t !== 'Mẫu dựng' && !x.sim);
  const simOnly = mixSourceCells(v).filter(x => x.t !== 'Hình' && x.t !== 'Mẫu dựng' && x.sim);
  const use = cells.length ? cells : simOnly; if (!use.length) return { error: 'Chưa có ô chữ nào để viết kịch bản. Nạp ý tưởng, bài viết hoặc dán lời, rồi thử lại.' };
  const ctaCells = use.filter(x => x.t === 'Kêu gọi'); const rest = use.filter(x => x.t !== 'Kêu gọi');
  const hookCell = rest.find(x => x.t === 'Ý chính') || rest[0]; let prevNum = false; const body = rest.filter(x => x !== hookCell).map(x => { const t = x.t === 'Số liệu' && prevNum ? endDot(x.text) : endDot(sentOf(x)); prevNum = x.t === 'Số liệu'; return t; });
  const hook = [c.brand.opener, endDot(hookCell ? hookCell.text : v.insight.title)].filter(Boolean).join(' ');
  const cta = [ctaCells.length ? ctaCells.map(x => endDot(x.text)).join(' ') : 'Lưu video lại và theo dõi kênh để xem phần tiếp theo.', c.brand.closer].filter(Boolean).join(' ');
  const fixed = countWords(hook) + countWords(cta); const used = new Set(body); let w = body.reduce((a, s) => a + countWords(s), 0);
  // Thiếu chữ so với độ dài đã chọn: lấy thêm câu có sẵn trong nguyên liệu, rồi câu chung
  const pool = []; (v.inputs || []).forEach(inp => { if (MIX_KINDS[inp.kind].media || ['sample', 'vlink', 'data'].includes(inp.kind)) return; splitSentences(plain(inp.kind === 'subs' ? stripSubs(inp.text) : inp.text).replace(/\n+/g, ' ')).filter(s => countWords(s) >= 4).forEach(s => pool.push(endDot(s))); });
  for (const s of pool.concat(FILL)) { if (fixed + w >= c.wordTarget) break; if (used.has(s) || s === hook || (hookCell && s === endDot(hookCell.text))) continue; used.add(s); body.push(s); w += countWords(s); }
  // Dư chữ: bỏ câu cuối
  while (body.length > 1 && fixed + w > c.wordMax) { w -= countWords(body.pop()); }
  const parts = chunk(body, 28).map((g, i) => `[Cảnh ${i + 1}]\n${g.join(' ')}`);
  const imgs = mixSourceCells(v).filter(x => x.t === 'Hình'); const first = imgs[0];
  return { script: [`[Hook]\n${hook}`].concat(parts, [`[CTA]\n${cta}`]).join('\n\n'), audio: '', image: first ? first.text : '' };
}
function mixJob(S, v) {
  const c = vidSettingsOf(S, v); const cells = mixSourceCells(v);
  const brand = [c.brand.opener ? `Câu mở thương hiệu: ${c.brand.opener}` : '', c.brand.closer ? `Câu chốt/CTA chung: ${c.brand.closer}` : ''].filter(Boolean).join('\n');
  const list = cells.map((x, i) => `${i + 1}. [${x.t}] ${x.text}`).join('\n');
  const tpl = (v.inputs || []).filter(i => i.kind === 'sample' || i.kind === 'vlink').map(i => i.text || i.name).filter(Boolean).join('\n');
  const user = [`# Việc: viết kịch bản video ngắn dọc ${c.ratio}, dài ${lenSecOf(S, v)} giây: ${c.wordMin}–${c.wordMax} chữ (nhắm ${c.wordTarget} chữ, đọc ${c.wps} chữ/giây). Mỗi phần mở bằng nhãn trong ngoặc vuông trên một dòng riêng: [Hook], rồi [Cảnh 1], [Cảnh 2]…, rồi [CTA].`, brand,
    `Viết đúng theo dàn ý đã duyệt dưới đây, đúng thứ tự, chỉ dùng sự thật và số liệu có trong các ô. Ô loại Hình chỉ để biết hình minh hoạ, không đọc thành lời.\n\n# Dàn ý\n${list}`,
    tpl ? `# Khuôn dựng tham khảo (chỉ lấy nhịp, không lấy nội dung)\n${tpl}` : '', v.request ? `Yêu cầu của người dùng: ${v.request}` : '',
    'Trả lời bằng đúng một khối JSON: {"script": "kịch bản có nhãn", "audio": "", "image": "mô tả hình minh hoạ, một câu"}'].filter(Boolean).join('\n\n');
  return { key: `vid-script:${v.id}`, label: `Vid tự do · ${short(v.insight.title, 40)}`, system: aiSystem(S).split('\n\nTrả lời bằng')[0], user };
}
FREE_HOOKS.mix = { mock: mixMock, job: mixJob };

// ---- Dựng cảnh từ kịch bản: gán hình từ ô Hình, dựng tự động, đánh dấu cảnh cần quay ----
export function mixTemplates(S) {
  const lib = vidLibOf(S); const own = (lib.tpls || []).map(t => ({ id: t.id, name: t.name, own: true }));
  return Object.entries(VID_TEMPLATES).map(([k, t]) => ({ id: k, name: t.name })).concat(own);
}
export function mixPlan(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (!String(v.script || '').trim()) return { ok: false, error: 'Chưa có kịch bản để chia cảnh.' };
  let r = planEdit(S, id); if (!r.ok) return r;
  const lib = vidLibOf(S); const own = (lib.tpls || []).find(t => t.id === v.tplId);
  if (v.tplId && VID_TEMPLATES[v.tplId] && v.tplId !== 'script') { const a = applyTemplate(S, id, v.tplId); if (a.ok) r = a; }
  const ed = editOf(v); ed.scenes.forEach(sc => { sc.items = []; sc.ph = false; sc.shoot = false; sc.autoMiss = false; });
  if (own) { Object.assign(ed.captions, own.captions || {}); if (own.frame) ed.frame = own.frame; ed.scenes.forEach((sc, i) => { const f = (own.fx || [])[i % Math.max(1, (own.fx || []).length)]; if (f) { sc.tr = f.tr || null; sc.mo = f.mo || null; } }); }
  // Hình từ ô Hình (theo thứ tự dàn ý), trải đều trên các cảnh; đoạn cắt từ video dài chia theo thời gian
  const n = ed.scenes.length; const imgs = mixSourceCells(v).filter(x => x.t === 'Hình' && x.mediaId);
  const clips = []; const stills = [];
  imgs.forEach(x => { const inp = (v.inputs || []).find(i => i.id === x.src); const m = (v.media || []).find(y => y.id === x.mediaId); if (!m) return; if (inp && inp.clip && m.kind === 'video') clips.push({ m, clip: inp.clip }); else stills.push(m); });
  stills.forEach((m, j) => { const sc = ed.scenes[Math.min(n - 1, Math.floor(j * n / stills.length))]; addSceneItems(S, id, sc.id, [{ mediaId: m.id, from: 0, to: m.kind === 'image' ? 0 : Math.min(m.dur || sc.dur, sc.dur) }]); });
  clips.forEach(({ m, clip }) => { let t = clip.from; ed.scenes.forEach(sc => { if (t >= clip.to - 0.1) return; const to = Math.min(clip.to, t + sc.dur); addSceneItems(S, id, sc.id, [{ mediaId: m.id, from: t, to }]); t = to; }); });
  let auto = null; if (ed.scenes.some(sc => !sc.items.length)) { const a = autoBuild(S, id); auto = a.ok ? a : null; }
  // Cảnh vẫn trống: Gen AI bật thì để prompt chờ tạo ảnh; không thì đánh dấu Cần quay
  let shoot = 0; ed.scenes.forEach(sc => { if (sc.items.length) { sc.autoMiss = false; return; } if (v.gen) return; sc.shoot = true; sc.ph = true; shoot++; });
  return { ok: true, count: n, shoot, auto };
}
// Dựng nhanh: bỏ qua Dàn ý (lấy hết ô), viết kịch bản (ai = kết quả AI nếu có), chia cảnh, duyệt
export function quickBuildPrep(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (!(v.inputs || []).length) return { ok: false, error: 'Nạp ít nhất một nguyên liệu.' };
  if (!v.outline.length) mixOutlineAddAll(S, id);
  return confirmMixOutline(S, id);
}

// ---- Cần quay ----
export function shootList(v) {
  const ed = v && v.edit; if (!ed) return [];
  return ed.scenes.map((sc, i) => ({ n: i + 1, sid: sc.id, label: sc.label, text: sc.text, prompt: sc.prompt || '', dur: sc.dur, shoot: !!sc.shoot })).filter(x => x.shoot);
}
export function shootDone(S, id, sid, media) {
  const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  if (media) {
    const r = addVidMedia(S, id, media); if (!r.ok) return r;
    const a = addSceneItems(S, id, sid, [{ mediaId: r.media.id, from: 0, to: r.media.kind === 'image' ? 0 : Math.min(r.media.dur || sc.dur, sc.dur) }]); if (!a.ok) return a;
  }
  sc.shoot = false; if (sc.items.length) sc.ph = false; return { ok: true };
}
export function shootText(S, v) {
  const l = shootList(v); if (!l.length) return '';
  return [`DANH SÁCH CẦN QUAY: ${v.insight.title}`, ''].concat(l.map(x => `Cảnh ${x.n} (${String(x.dur).replace('.', ',')} giây): ${x.prompt || 'Quay minh hoạ cho lời'}\n  Lời: ${x.text}`)).join('\n');
}

// ---- Mẫu dựng của mình ----
export function saveMixTemplate(S, id, name) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed || !ed.scenes.length) return { ok: false, error: 'Thẻ chưa có cảnh để lưu thành mẫu.' };
  const nm = String(name || '').trim().slice(0, 60); if (!nm) return { ok: false, error: 'Đặt tên cho mẫu.' };
  const lib = vidLibOf(S); lib.tpls = lib.tpls || []; lib.tplSeq = (lib.tplSeq || 0) + 1;
  const t = { id: `ut${lib.tplSeq}`, name: nm, captions: Object.assign({}, ed.captions), frame: ed.frame || 'none', fx: ed.scenes.slice(0, 12).map(sc => ({ tr: sc.tr || null, mo: sc.mo || null })) };
  lib.tpls.push(t); if (lib.tpls.length > 12) lib.tpls.shift(); return { ok: true, template: t };
}
export function setMixOptions(S, id, p) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (p.tplId != null) { if (!mixTemplates(S).some(t => t.id === p.tplId)) return { ok: false, error: 'Mẫu dựng không có.' }; v.tplId = p.tplId; }
  if (p.gen != null) v.gen = !!p.gen;
  if (p.request != null) v.request = String(p.request).slice(0, 600);
  return { ok: true };
}

// ---- Chi phí API (ước tính) ----
const PRICES = [[/haiku/i, 1, 5], [/sonnet/i, 3, 15], [/opus/i, 5, 25], [/gpt|o\d/i, 2.5, 10]];
export function mixCost(S, v, model) {
  const c = vidSettingsOf(S, v); const chars = (v.inputs || []).reduce((a, i) => a + String(i.text || '').length, 0) + mixSourceCells(v).reduce((a, x) => a + x.text.length, 0);
  const tin = Math.round(chars / 3.5) + 700; const tout = Math.round(c.wordTarget * 1.8);
  const p = PRICES.find(x => x[0].test(model || '')) || [null, 0, 0]; const text = (tin * p[1] + tout * p[2]) / 1e6;
  const shots = v.gen ? Math.max(1, Math.round(lenSecOf(S, v) / 6)) : 0; const img = shots * 0.04;
  return { tin, tout, text: Math.round(text * 10000) / 10000, shots, img: Math.round(img * 100) / 100, total: Math.round((text + img) * 10000) / 10000, priced: !!p[0] };
}

// ---- Video dài → tìm đoạn hay → lô nhiều Short ----
export function findMixSegments(S, id, iid) {
  const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid && x.kind === 'long'); if (!inp) return { ok: false, error: 'Chọn nguyên liệu Video dài.' };
  const m = (v.media || []).find(x => x.id === inp.mediaId); const dur = m && m.dur; if (!(dur > 0)) return { ok: false, error: 'Chưa đọc được độ dài video.' };
  const len = Math.min(lenSecOf(S, v), dur); const n = Math.max(1, Math.min(12, Math.floor(dur / len)));
  const step = (dur - len) / Math.max(1, n - 1);
  // Mô phỏng: chia đều thành n đoạn dài bằng độ dài đã chọn; bản thật chấm điểm đoạn hay bằng lời chép và AI
  inp.segs = Array.from({ length: n }, (_, i) => { const from = Math.round((n === 1 ? 0 : i * step) * 10) / 10; return { id: `g${i + 1}`, from, to: Math.round(Math.min(dur, from + len) * 10) / 10, title: `Đoạn ${i + 1} · ${fmtClock(from)}`, on: true }; });
  inp.segSim = true; return { ok: true, count: n, simulated: true };
}
export function toggleMixSeg(S, id, iid, gid) { const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid); const g = inp && (inp.segs || []).find(x => x.id === gid); if (!g) return { ok: false, error: 'Không thấy đoạn.' }; g.on = !g.on; return { ok: true, on: g.on }; }
export const batchOf = (S, v) => v && v.batchId ? (S.videos || []).filter(x => x.batchId === v.batchId).sort((a, b) => a.order - b.order) : [];
// Mỗi đoạn được chọn thành một thẻ Short; thẻ đang mở nhận đoạn đầu
export function makeMixBatch(S, id, iid) {
  const v = vidGet(S, id); const inp = v && (v.inputs || []).find(x => x.id === iid && x.kind === 'long'); if (!inp || !(inp.segs || []).length) return { ok: false, error: 'Bấm Tìm đoạn hay trước.' };
  const segs = inp.segs.filter(g => g.on); if (!segs.length) return { ok: false, error: 'Chọn ít nhất một đoạn.' };
  const row = ensureFreeTopic(S, v.weekId); const room = VID_MAX_FREE - vidsOf(S, v.weekId, row.id).length + 1;
  if (segs.length > room) return { ok: false, error: `Hàng Video tự do chỉ còn chỗ cho ${room} thẻ. Bỏ bớt đoạn.` };
  const m = v.media.find(x => x.id === inp.mediaId); v.batchId = v.batchId || `b${S.seq++}`; const ids = [];
  const others = v.inputs.filter(x => x !== inp);
  segs.forEach((g, k) => {
    let t = v;
    if (k > 0) {
      const r = newMixVideo(S, v.weekId); if (!r.ok) return; t = r.video; t.batchId = v.batchId; t.lenSec = v.lenSec; t.tplId = v.tplId; t.gen = v.gen; t.request = v.request;
      const a = addMixInput(S, t.id, { kind: 'long', name: inp.name, media: { src: m.src, name: m.name, size: m.size, dur: m.dur, thumb: m.thumb } });
      if (!a.ok) return; a.input.clip = { from: g.from, to: g.to };
      others.filter(x => x.kind === 'sample' || x.kind === 'vlink' || x.kind === 'idea').forEach(x => addMixInput(S, t.id, { kind: x.kind, name: x.name, text: x.text, url: x.url }));
    } else { inp.clip = { from: g.from, to: g.to }; }
    t.insight.title = short(`Short ${k + 1}/${segs.length}: ${v.insight.title.replace(/^Vid tự do:\s*/, '')} (${fmtClock(g.from)}–${fmtClock(g.to)})`, 120);
    t.draft = false; t.dyOk = false; dropAllCells(t); (t.inputs || []).forEach(i2 => fillCells(S, t, i2)); mixOutlineAddAll(S, t.id); ids.push(t.id);
  });
  inp.segs = null; log(S, 'vid-mix-batch', 'video', id, `${ids.length} thẻ`);
  return { ok: true, ids, batchId: v.batchId };
}
function dropAllCells(v) { v.cells = []; v.outline = []; v.cellSeq = 1; }
export function finishMixBatch(S, id) {
  const v = vidGet(S, id); const list = batchOf(S, v); if (!list.length) return { ok: false, error: 'Thẻ này không thuộc lô nào.' };
  const done = [], blocked = [];
  list.forEach(x => { if (x.cancelled) return; const sh = shootList(x).length; if (!x.edit || !x.edit.scenes.length) { blocked.push({ id: x.id, why: 'chưa có cảnh' }); return; } if (sh) { blocked.push({ id: x.id, why: `${sh} cảnh cần quay` }); return; } const r = completeEdit(S, x.id); if (r.ok) done.push(x.id); else blocked.push({ id: x.id, why: r.error }); });
  return { ok: true, done, blocked };
}
// Tự xếp cả lô: mỗi thẻ một ngày (rải đều trong tuần), cùng giờ, trên các kênh chọn. Thẻ chưa có video thành phẩm thì bỏ qua.
export function autoSlotBatch(S, id, p) {
  const v = vidGet(S, id); const list = batchOf(S, v); const P = p || {}; if (!list.length) return { ok: false, error: 'Thẻ này không thuộc lô nào.' };
  const chans = (P.channelIds && P.channelIds.length ? P.channelIds : vidChannels(S).map(x => x.channel.id)); if (!chans.length) return { ok: false, error: 'Chưa có kênh video ngắn.' };
  const todo = list.filter(x => !x.cancelled && !vidSlotsOf(S, x.id).length); const days = suggestVidDates(S, v.weekId, todo.length || 1);
  const made = [], skipped = [];
  todo.forEach((x, i) => { if (!x.file) { skipped.push(x.id); return; } const r = scheduleVideo(S, x.id, { date: days[i], time: P.time || '19:00', channelIds: chans, captions: P.captions && P.captions[x.id] }); if (r.ok) made.push({ id: x.id, slots: r.slots.length, date: days[i] }); else skipped.push(x.id); });
  return { ok: true, made, skipped };
}

// ---- Biến thể từ thẻ Vid cũ ----
export function makeMixVariant(S, id, type) {
  const o = vidGet(S, id); if (!o) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (!MIX_VARIANTS[type]) return { ok: false, error: 'Loại biến thể không hợp lệ.' };
  if (!String(o.script || '').trim()) return { ok: false, error: 'Thẻ gốc chưa có kịch bản.' };
  const r = newMixVideo(S, o.weekId); if (!r.ok) return r; const t = r.video;
  const a = addMixInput(S, t.id, { kind: 'oldvid', vidId: id }); if (!a.ok) { S.videos = S.videos.filter(x => x !== t); return a; }
  t.lenSec = type === 'short' ? 30 : o.lenSec; t.tplId = o.tplId || 'script'; t.insight.title = short(`${MIX_VARIANTS[type]}: ${o.insight.title.replace(/^[^:]{2,30}:\s*/, '')}`, 120);
  const c = vidSettingsOf(S, t); const secs = vidSections(o.script); let out;
  if (type === 'hook') {
    const alt = [`Bạn có biết: ${(secs[1] || secs[0] || { text: o.insight.title }).text.split(/(?<=[.!?…])\s/)[0]}`, `Khoan đã, đừng lướt qua: ${short(o.insight.title.replace(/^[^:]{2,30}:\s*/, ''), 80)}`][0];
    out = secs.map((s, i) => `[${s.label}]\n${i === 0 ? alt : s.text}`).join('\n\n');
  } else if (type === 'short') {
    const keep = []; let w = 0; secs.forEach((s, i) => { const n = countWords(s.text); if (i === 0 || i === secs.length - 1 || w + n <= c.wordTarget - 30) { keep.push(s); w += n; } });
    out = keep.map(s => `[${s.label}]\n${s.text}`).join('\n\n');
  } else out = secs.map(s => `[${s.label}]\n[EN, bản dịch mô phỏng] ${s.text}`).join('\n\n');
  t.script = out; t.status = 'DRAFT'; t.writtenAt = S.settings.demoNow; t.simulated = true; t.dyOk = true; t.draft = false; mixOutlineAddAll(S, t.id);
  log(S, 'vid-mix-variant', 'video', t.id, type);
  return { ok: true, video: t, simulated: type === 'en' };
}
