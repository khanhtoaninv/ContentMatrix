// ---------- 05t · Short Vid: Vid tự do, nguồn vào, bàn dựng mô phỏng, Đưa vào lịch (mục 10.75) ----------
import { countWords, fold, splitSentences } from './01-util.js';
import { addSlot, addSlotAsset, byId, cellLabel, cellView, cellsOf, deleteSlot, isLocked, log, topicCurrent, topicsOf, uploadSlotImage, weekOf } from './05-model.js';
import { editSlot } from './05c-slots.js';
import { fmtClock, setVideoCover, setVideoSubs } from './05n-media.js';
import { aiSystem, extractJson } from './05o-aitext.js';
import { VID_MAX_PER_TOPIC, ensureShortVid, newVideo, vidBody, vidSections, vidSettingsOf, vidTopicRow, vidsOf } from './05s-shortvid.js';
// Mọi cách vào cùng đổ về một "dự án dựng" (v.edit): danh sách cảnh, mỗi cảnh có lời, thời lượng, tài nguyên (clip, ảnh hoặc prompt),
// chữ phủ; kèm giọng đọc, caption, frame, nhạc nền và danh sách cắt. Bản HTML chỉ xem trước trong trình duyệt và xuất lệnh dựng (JSON);
// xuất video thật để dành cho bộ xuất (ffmpeg trên PC app hoặc máy chủ của web app).

export const VID_ORIGINS = {
  topic: { name: 'Từ Topic', hint: 'AI tách Insight từ Topic rồi viết kịch bản.' },
  script: { name: 'Có sẵn kịch bản', hint: 'Dán kịch bản. Bàn dựng chia cảnh, gợi ý hình cho từng cảnh, đọc bằng giọng máy, tạo caption.' },
  audio: { name: 'Có sẵn giọng đọc', hint: 'Nạp file giọng nói (MP3, M4A, WAV). Dán lời hoặc chép lời bằng API; bàn dựng chia cảnh theo lời, gợi ý hình.' },
  talk: { name: 'Quay người nói', hint: 'Nạp clip quay thô. App đo âm lượng để tìm khoảng lặng cần cắt, rồi tạo caption theo lời.' },
  post: { name: 'Từ bài Matrix', hint: 'Chọn một ô đã duyệt ở Matrix của tuần; app rút thành kịch bản khoảng 60 giây.' },
  broll: { name: 'B-roll ngắn', hint: 'Nạp vài clip ngắn. App mô tả từng clip (mô phỏng) và viết lời dẫn theo yêu cầu của bạn.' },
  longroll: { name: 'B-roll dài', hint: 'Nạp một clip dài. App tách thành các đoạn ngắn (mô phỏng), đề xuất ý tưởng rồi viết lời dẫn.' },
};
export const VID_VOICES = { tts: 'Giọng máy đọc lời', file: 'File giọng đã nạp', clip: 'Tiếng trong clip', self: 'Tự thu sau', none: 'Không lời' };
export const VID_CAPTION_MODES = { full: 'Phụ đề đầy đủ', key: 'Chữ nhấn ý', off: 'Không caption' };
export const VID_CAPTION_POS = { bottom: 'Dưới', middle: 'Giữa', top: 'Trên' };
export const VID_FRAMES = { none: 'Không frame', logo: 'Nhãn thương hiệu góc trên', band: 'Dải màu thương hiệu dưới' };
export const VID_CAPTION_STYLES = ['Trắng viền đen', 'Nền vàng', 'Nhấn từ khóa', 'Hộp tối'];
export const VID_FIT = { fill: 'Lấp đầy khung', fit: 'Vừa khung' };
export const VID_SHORT = { hold: 'Giữ khung cuối', loop: 'Lặp lại', slow: 'Kéo chậm' };
export const SCENE_FLOOR = 1.5;
export const VID_POPUP_VER = 4;   // số hiệu bản popup mẫu (notes/mau-popup/popup-vid-mau.html) đã được ráp vào app
export const ITEM_MIN = 1;        // mỗi hình trong cảnh ít nhất 1 giây
const MEDIA_RE = /^data:(video|audio|image)\//;
const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const r1 = x => Math.round(Number(x) * 10) / 10;
// Bài Matrix viết bằng Markdown (## Mục, gạch đầu dòng, **đậm**): bỏ đề mục và ký hiệu để thành lời nói
const plainMd = t => String(t || '').replace(/^\s*#{1,6}\s.*$/gm, '').replace(/^\s*([-*+]|\d+[.)])\s+/gm, '').replace(/\*\*|__|`/g, '').replace(/#[\p{L}\p{N}_]+/gu, '');
const vidGet = (S, id) => byId(S.videos || [], id);

// ---- Hàng "Video tự do" của tuần: thẻ không đi từ Topic ----
export const freeTopicId = weekId => `${weekId}-FREE`;
export function ensureFreeTopic(S, weekId) {
  ensureShortVid(S); const id = freeTopicId(weekId);
  let row = byId(S.vidTopics, id);
  if (!row) {
    row = { id, weekId, order: 9999, videoOnly: true, free: true, currentVersion: 1, versions: [{ n: 1, title: 'Video tự do', text: '', fields: {}, words: 0, hasCase: false, createdAt: S.settings.demoNow, reason: 'free' }] };
    S.vidTopics.push(row);
  }
  return row;
}
export const isFreeTopic = (S, topicId) => { const r = byId(S.vidTopics || [], topicId); return !!(r && r.free); };
export const vidOrigin = v => (v && VID_ORIGINS[v.origin] ? v.origin : 'topic');

// ---- Tài nguyên nguồn của thẻ (clip, giọng, ảnh) ----
export function mediaUnitName(m) { return String(m.name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim(); }
// Mô phỏng "đọc hiểu b-roll": chưa nhìn được khung hình, nên mô tả theo tên tệp và độ dài; người dùng sửa lại cho đúng
export function mockDescribe(m, i) {
  const nm = mediaUnitName(m) || `clip ${i + 1}`;
  return m.kind === 'image' ? `Ảnh: ${nm}.` : `Cảnh ${nm}${m.dur ? `, dài ${r1(m.dur).toString().replace('.', ',')} giây` : ''}.`;
}
export function addVidMedia(S, id, m) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  const mt = MEDIA_RE.exec(String(m && m.src || '')); if (!mt) return { ok: false, error: 'Tệp phải là video, audio hoặc ảnh.' };
  v.media = v.media || [];
  if (v.media.length >= 12) return { ok: false, error: 'Tối đa 12 tệp nguồn mỗi thẻ.' };
  let k = v.media.length + 1; while (v.media.some(x => x.id === `m${k}`)) k++;
  const x = { id: `m${k}`, kind: mt[1], name: String(m.name || mt[1]).slice(0, 120), src: m.src, size: Number(m.size) || 0, dur: Number(m.dur) > 0 ? r1(m.dur) : 0, thumb: m.thumb || '', desc: '', descSim: true, at: S.settings.demoNow };
  x.desc = String(m.desc || '').trim() || mockDescribe(x, v.media.filter(y => y.kind !== 'audio').length); if (m.desc) x.descSim = false;
  v.media.push(x); log(S, 'vid-media', 'video', id, x.name);
  return { ok: true, media: x };
}
export function editVidMedia(S, id, mid, patch) {
  const v = vidGet(S, id); const m = v && (v.media || []).find(x => x.id === mid); if (!m) return { ok: false, error: 'Không thấy tệp nguồn.' };
  if (patch.desc != null) { const d = String(patch.desc).trim().slice(0, 400); if (d !== m.desc) { m.desc = d; m.descSim = false; } }
  if (patch.segs && m.segs) patch.segs.forEach(p => { const g = m.segs.find(x => x.id === p.id); if (g && p.desc != null) { g.desc = String(p.desc).trim().slice(0, 300); g.descSim = false; } });
  return { ok: true };
}
export function removeVidMedia(S, id, mid) {
  const v = vidGet(S, id); if (!v || !(v.media || []).some(x => x.id === mid)) return { ok: false, error: 'Không thấy tệp nguồn.' };
  v.media = v.media.filter(x => x.id !== mid);
  if (v.edit) {
    migrateEdit(v.edit);
    v.edit.scenes.forEach(sc => { sc.items = sc.items.filter(it => it.mediaId !== mid); if (sc.vo && sc.vo.mediaId === mid) sc.vo = null; });
    if (v.edit.voAll && v.edit.voAll.mediaId === mid) v.edit.voAll = null;
    if (v.edit.voice && v.edit.voice.mediaId === mid) v.edit.voice = { mode: 'tts' };
  }
  return { ok: true };
}
// B-roll dài: chia đều thành đoạn segLen giây (mô phỏng; bản thật dò chuyển cảnh bằng so khung hình)
export function splitLongRoll(S, id, mid, segLen) {
  const v = vidGet(S, id); const m = v && (v.media || []).find(x => x.id === mid);
  if (!m || m.kind !== 'video') return { ok: false, error: 'Chọn một clip video để tách.' };
  if (!(m.dur > 0)) return { ok: false, error: 'Chưa đọc được độ dài clip.' };
  const L = Math.max(2, Math.min(20, Number(segLen) || 5)); const n = Math.max(1, Math.round(m.dur / L)); const d = m.dur / n;
  const nm = mediaUnitName(m) || 'clip';
  m.segs = Array.from({ length: n }, (_, i) => ({ id: `${m.id}s${i + 1}`, from: r1(i * d), to: r1(i === n - 1 ? m.dur : (i + 1) * d), desc: `Đoạn ${i + 1} của ${nm} (${fmtClock(i * d)}–${fmtClock(i === n - 1 ? m.dur : (i + 1) * d)}).`, descSim: true }));
  m.segLen = L; log(S, 'vid-split', 'video', id, `${n} đoạn`);
  return { ok: true, count: n, simulated: true };
}
// Đơn vị hình của thẻ b-roll: mỗi clip/ảnh (b-roll ngắn) hoặc mỗi đoạn đã tách (b-roll dài)
export function brollUnits(v) {
  const out = [];
  (v.media || []).forEach(m => {
    if (m.kind === 'audio') return;
    if (m.segs && m.segs.length) m.segs.forEach(g => out.push({ mediaId: m.id, from: g.from, to: g.to, dur: r1(g.to - g.from), desc: g.desc, label: g.id, kind: 'video' }));
    else out.push({ mediaId: m.id, from: 0, to: m.kind === 'image' ? 0 : m.dur, dur: m.kind === 'image' ? 3 : m.dur, desc: m.desc, label: m.id, kind: m.kind });
  });
  return out;
}
// Ý tưởng kịch bản cho b-roll (mô phỏng: theo số cảnh và mô tả; AI thật sẽ xem khung hình)
export function brollIdeas(S, id) {
  const v = vidGet(S, id); if (!v) return [];
  const u = brollUnits(v); const n = u.length; const first = u[0] ? short(u[0].desc.replace(/\.$/, ''), 50) : 'cảnh mở đầu';
  return [
    { key: 'gioithieu', title: 'Giới thiệu nhanh', idea: `Dẫn người xem đi qua ${n} cảnh, mỗi cảnh một câu, mở bằng ${first.toLowerCase()}.` },
    { key: 'tungbuoc', title: 'Từng bước', idea: `Biến ${n} cảnh thành ${n} bước làm theo, đánh số từng bước trên màn hình.` },
    { key: 'haucanh', title: 'Hậu trường và bài học', idea: 'Kể chuyện phía sau các cảnh quay, chốt bằng một bài học cho người xem.' },
  ];
}
export function useBrollIdea(S, id, key) {
  const v = vidGet(S, id); const it = brollIdeas(S, id).find(x => x.key === key); if (!v || !it) return { ok: false, error: 'Không thấy ý tưởng.' };
  v.insight.title = `${it.title}: ${short(v.insight.title.replace(/^[^:]{2,30}:\s*/, ''), 100)}`; v.insight.idea = it.idea; v.ideaKey = key;
  return { ok: true };
}
export function setVidRequest(S, id, text) { const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' }; v.request = String(text || '').trim().slice(0, 600); return { ok: true }; }

// ---- Tạo Vid tự do ----
const looksLabeled = t => /^\s*\[[^\]]+\]\s*$/m.test(t);
function labelParas(t) {
  const ps = String(t || '').replace(/\r/g, '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  return ps.map((p, i) => `[${i === 0 ? 'Hook' : i === ps.length - 1 && ps.length > 2 ? 'CTA' : `Đoạn ${i}`}]\n${p}`).join('\n\n');
}
export function postChoices(S, weekId) {
  const order = new Map(topicsOf(S, weekId).map(r => [r.id, r]));
  return cellsOf(S, weekId).filter(c => order.has(c.topicId) && cellView(S, c).state === 'APPROVED')
    .map(c => ({ id: c.id, label: `${cellLabel(S, c)} · ${topicCurrent(order.get(c.topicId)).title}`, words: countWords(cellView(S, c).text) }));
}
export function addFreeVideo(S, weekId, p) {
  ensureShortVid(S); const P = p || {};
  if (!weekOf(S, weekId)) return { ok: false, error: 'Không tìm thấy tuần.' };
  const origin = P.origin; if (!VID_ORIGINS[origin] || origin === 'topic') return { ok: false, error: 'Chọn cách nạp nội dung.' };
  const row = ensureFreeTopic(S, weekId);
  if (vidsOf(S, weekId, row.id).length >= VID_MAX_PER_TOPIC) return { ok: false, error: `Hàng Video tự do đã đủ ${VID_MAX_PER_TOPIC} thẻ.` };
  const media = (P.media || []).filter(m => m && MEDIA_RE.test(m.src || ''));
  let script = String(P.script || '').replace(/\r/g, '').trim(); let source = ''; let title = String(P.title || '').trim();
  if (origin === 'script') { if (!script) return { ok: false, error: 'Dán kịch bản trước.' }; if (!looksLabeled(script)) script = labelParas(script); source = vidBody(script); }
  if (origin === 'audio' && !media.some(m => /^data:audio\//.test(m.src))) return { ok: false, error: 'Nạp file giọng đọc (MP3, M4A, WAV).' };
  if (origin === 'talk' && !media.some(m => /^data:video\//.test(m.src))) return { ok: false, error: 'Nạp clip quay người nói.' };
  if ((origin === 'broll' || origin === 'longroll') && !media.some(m => /^data:(video|image)\//.test(m.src))) return { ok: false, error: origin === 'broll' ? 'Nạp ít nhất một clip hoặc ảnh.' : 'Nạp một clip dài.' };
  if (origin === 'post') {
    const cell = byId(S.cells, P.cellId); if (!cell || cell.weekId !== weekId) return { ok: false, error: 'Chọn một ô đã duyệt ở Matrix.' };
    const cv = cellView(S, cell); if (cv.state !== 'APPROVED') return { ok: false, error: 'Ô chưa được duyệt.' };
    source = plainMd(vidBody(cv.text)).replace(/\n{3,}/g, '\n\n').trim(); title = title || `Từ bài: ${short(splitSentences(source.replace(/\n+/g, ' '))[0] || cellLabel(S, cell), 90)}`;
  }
  if (!title) title = origin === 'script' ? short(splitSentences(vidBody(script).replace(/\n/g, ' '))[0] || 'Kịch bản nạp sẵn', 90) : `${VID_ORIGINS[origin].name}: ${short(media.map(mediaUnitName).filter(Boolean).join(', ') || 'chưa đặt tên', 80)}`;
  const v = newVideo(S, weekId, row.id, { title, idea: '', reason: VID_ORIGINS[origin].hint, source, kind: 'noihet', status: 'TODO', simulated: true });
  v.origin = origin; v.media = []; v.request = String(P.request || '').trim().slice(0, 600); if (P.cellId) v.cellId = P.cellId;
  S.videos.push(v);
  media.forEach(m => addVidMedia(S, v.id, m));
  if (origin === 'longroll') { const m = v.media.find(x => x.kind === 'video'); if (m && m.dur) splitLongRoll(S, v.id, m.id, P.segLen || 5); }
  if (script) { v.script = script; v.status = 'DRAFT'; v.writtenAt = S.settings.demoNow; }
  if (origin === 'post') writeFreeNow(S, v);
  log(S, 'vid-free', 'video', v.id, origin);
  return { ok: true, video: v };
}
function writeFreeNow(S, v) { const m = freeMockScript(S, v); if (m && m.script) { v.script = m.script; v.prompts = { audio: m.audio || '', image: m.image || '' }; v.status = 'DRAFT'; v.writtenAt = S.settings.demoNow; } }

// ---- Kịch bản cho thẻ tự do (gọi từ writeVidScript / vidScriptJob) ----
const CONNECT = ['Đầu tiên,', 'Tiếp theo,', 'Bạn để ý:', 'Ở cảnh này,', 'Rồi đến', 'Sau đó,', 'Cuối cùng,'];
function fillSentences(pool, target, max) { const out = []; let w = 0; for (const s of pool) { const n = countWords(s); if (w + n > max) continue; out.push(s); w += n; if (w >= target) break; } return out; }
export function freeMockScript(S, v) {
  const c = vidSettingsOf(S); const o = vidOrigin(v); const brandOpen = c.brand.opener, brandClose = c.brand.closer;
  const cta = [o === 'post' ? 'Đọc bài đầy đủ ở trang của kênh nhé.' : 'Lưu video lại và theo dõi kênh để xem phần tiếp theo.', brandClose].filter(Boolean).join(' ');
  if (o === 'script') return { error: 'Kịch bản do bạn nạp: sửa trực tiếp trong ô Lời nói.' };
  if (o === 'audio' || o === 'talk') return { error: 'Thẻ này lấy lời từ giọng nói: dán lời vào ô Lời nói hoặc bấm Chép lời (cần API nhận giọng nói ở Setup → AI ảnh & video).' };
  if (o === 'post') {
    const ss = splitSentences(plainMd(vidBody(v.source)).replace(/\n+/g, ' ')).filter(s => countWords(s) >= 3);
    if (!ss.length) return { error: 'Bài nguồn không có câu nào dùng được.' };
    const hook = [brandOpen, ss[0]].filter(Boolean).join(' ');
    const body = fillSentences(ss.slice(1), c.wordTarget - countWords(hook) - countWords(cta), c.wordMax - countWords(hook) - countWords(cta));
    const half = Math.ceil(body.length / 2);
    return { script: `[Hook]\n${hook}\n\n[Nội dung]\n${body.slice(0, half).join(' ') || '…'}\n\n[Ý chính]\n${body.slice(half).join(' ') || '…'}\n\n[CTA]\n${cta}`, audio: '', image: `Ảnh dọc ${c.ratio} minh hoạ: ${short(ss[0], 120)}${c.brand.visual ? ` ${c.brand.visual}` : ''}` };
  }
  // b-roll: mỗi cảnh một đoạn lời vừa với độ dài cảnh
  const units = brollUnits(v); if (!units.length) return { error: 'Thẻ chưa có clip hoặc ảnh nguồn.' };
  const req = String(v.request || '').trim();
  const about = (/(?:nói về|về|giới thiệu)\s+(.+)$/i.exec(req.replace(/[.!?…]+$/, '')) || [])[1] || v.insight.title.replace(/^[^:]{2,30}:\s*/, '');
  const hook = [brandOpen, `${short(about, 80).replace(/^\p{Ll}/u, m => m.toUpperCase())}: xem nhanh trong ${Math.round(units.reduce((a, u) => a + (u.dur || 3), 0))} giây nhé.`].filter(Boolean).join(' ');
  const parts = units.map((u, i) => {
    const d = String(u.desc || '').replace(/^(Cảnh|Ảnh:|Đoạn \d+ của)\s*/i, '').replace(/\s*\(\d+:[\d.]+–\d+:[\d.]+\)\.?$/, '').replace(/,? dài [\d,]+ giây/, '').replace(/[.]+$/, '').trim();
    return `[Cảnh ${i + 1}]\n${CONNECT[Math.min(i, CONNECT.length - 1)]} ${d ? d.charAt(0).toLowerCase() + d.slice(1) : 'cảnh tiếp theo'}.`;
  });
  return { script: [`[Hook]\n${hook}`].concat(parts, [`[CTA]\n${cta}`]).join('\n\n'), audio: '', image: '' };
}
export function freeScriptJob(S, v) {
  const c = vidSettingsOf(S); const o = vidOrigin(v);
  if (o === 'script' || o === 'audio' || o === 'talk') return null;
  const brand = [c.brand.opener ? `Câu mở thương hiệu: ${c.brand.opener}` : '', c.brand.closer ? `Câu chốt/CTA chung: ${c.brand.closer}` : ''].filter(Boolean).join('\n');
  const head = `# Việc: viết kịch bản video ngắn dọc ${c.ratio}, ${c.wordMin}–${c.wordMax} chữ (đọc ${c.wps} chữ/giây). Mỗi phần mở bằng nhãn trong ngoặc vuông trên một dòng riêng.`;
  let body;
  if (o === 'post') body = `Rút bài dưới đây thành kịch bản nói 60 giây: [Hook] → [Nội dung] → [Ý chính] → [CTA]. Giữ đúng sự thật trong bài, không thêm số liệu.\n\n# Bài nguồn\n${v.source}`;
  else {
    const units = brollUnits(v);
    body = `Viết lời dẫn cho các cảnh b-roll theo đúng thứ tự: [Hook], rồi mỗi cảnh một nhãn [Cảnh k], rồi [CTA]. Lời mỗi cảnh vừa thời lượng cảnh đó.\n${v.request ? `Yêu cầu của người dùng: ${v.request}\n` : ''}${v.insight.idea ? `Ý tưởng: ${v.insight.idea}\n` : ''}\n# Cảnh\n${units.map((u, i) => `- Cảnh ${i + 1} (${r1(u.dur || 3)} giây): ${u.desc}`).join('\n')}`;
  }
  const user = [head, brand, body, 'Trả lời bằng đúng một khối JSON: {"script": "kịch bản có nhãn", "audio": "", "image": "mô tả hình minh hoạ, một câu"}'].filter(Boolean).join('\n\n');
  return { key: `vid-script:${v.id}`, label: `${VID_ORIGINS[o].name} · ${short(v.insight.title, 40)}`, system: aiSystem(S).split('\n\nTrả lời bằng')[0], user };
}

// ---- Cắt khoảng lặng (quay người nói) ----
// levels: âm lượng RMS từng bước step giây (đo trong trình duyệt). Khoảng dưới ngưỡng dài ≥ minGap thì đề xuất cắt, chừa pad mỗi bên.
export function silenceCuts(levels, step, opts) {
  const O = Object.assign({ minGap: 0.6, pad: 0.12, rel: 0.12, floor: 0.008 }, opts || {});
  const L = (levels || []).map(Number); if (!L.length || !(step > 0)) return [];
  const th = Math.max(O.floor, O.rel * Math.max(...L)); const out = []; let a = -1;
  for (let i = 0; i <= L.length; i++) {
    const quiet = i < L.length && L[i] < th;
    if (quiet && a < 0) a = i;
    if (!quiet && a >= 0) {
      const from = a * step + (a ? O.pad : 0), to = i * step - (i < L.length ? O.pad : 0);
      if (to - from >= O.minGap - 2 * O.pad && to > from) out.push({ from: r1(from), to: r1(to), on: true, why: a === 0 ? 'Lặng đầu clip' : i === L.length ? 'Lặng cuối clip' : 'Khoảng lặng' });
      a = -1;
    }
  }
  return out;
}
// Không đo được âm thanh (clip không có tiếng, trình duyệt chặn): gợi ý mô phỏng mỗi khoảng 8 giây
export function mockCuts(dur) {
  const D = Number(dur) || 0; const out = [];
  for (let t = 6; t < D - 2; t += 8) out.push({ from: r1(t), to: r1(Math.min(D, t + 0.7)), on: true, why: 'Mô phỏng: chỗ có thể nói vấp' });
  return out;
}
export function keptRanges(dur, cuts) {
  const D = Number(dur) || 0; const cs = (cuts || []).filter(c => c.on !== false).map(c => [Math.max(0, c.from), Math.min(D, c.to)]).filter(c => c[1] > c[0]).sort((a, b) => a[0] - b[0]);
  const out = []; let t = 0;
  cs.forEach(([a, b]) => { if (a > t + 0.05) out.push({ from: r1(t), to: r1(a) }); t = Math.max(t, b); });
  if (D > t + 0.05) out.push({ from: r1(t), to: r1(D) });
  return out;
}
export function setVidCuts(S, id, cuts, simulated) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const ed = editOf(v); ed.cuts = (cuts || []).map(c => ({ from: r1(c.from), to: r1(c.to), on: c.on !== false, why: String(c.why || '') })).filter(c => c.to > c.from);
  ed.cutsSim = !!simulated; return { ok: true, count: ed.cuts.length };
}
export function toggleVidCut(S, id, i, on) { const v = vidGet(S, id); const c = v && v.edit && v.edit.cuts[i]; if (!c) return { ok: false, error: 'Không thấy đoạn cắt.' }; c.on = !!on; return { ok: true }; }

// ---- Bàn dựng: cảnh, giọng, caption, frame, nhạc ----
export function editOf(v) {
  if (!v.edit) v.edit = { scenes: [], voice: { mode: 'tts' }, voAll: null, captions: { mode: 'full', pos: 'bottom', style: 0 }, segs: null, capStale: false, frame: 'logo', music: null, cuts: [], seq: 1, plannedAt: null, tpl: 'script', doneAt: null };
  return migrateEdit(v.edit);
}
// Bản cũ (mục 10.75) mỗi cảnh một `asset`, giọng file nằm ở voice.mode; bản 1 của popup (mục 10.76) mỗi cảnh nhiều hình `items`, VO toàn bài `voAll`, VO cảnh `vo`
const itemOf = (a, dur) => { const d = a.kind === 'image' ? 0 : r1(a.to > a.from ? a.to - (a.from || 0) : (dur || 0)); return Object.assign({ kind: a.kind, name: a.name || '', from: r1(a.from || 0), to: a.kind === 'image' ? 0 : r1(a.to || 0), dur: d, short: 'hold', trim: 0 }, a.mediaId ? { mediaId: a.mediaId } : { src: a.src }, a.thumb ? { thumb: a.thumb } : {}); };
// Bản 4 (mục 10.77): mỗi hình có độ dài riêng `d` (cảnh = tổng các hình), chữ phủ cũ thành cue Text ở từ đầu cảnh, danh sách cue `cues`
export function migrateEdit(ed) {
  if (!ed || ed.v === 3) return ed;
  ed.voAll = ed.voAll || null; ed.segs = ed.segs || null; ed.capStale = !!ed.capStale; ed.tpl = ed.tpl || 'script'; ed.doneAt = ed.doneAt || null;
  ed.captions = Object.assign({ mode: 'full', pos: 'bottom', style: 0 }, ed.captions || {});
  if (ed.music && ed.music.duck == null) ed.music.duck = true;
  (ed.scenes || []).forEach(sc => {
    if (!Array.isArray(sc.items)) { sc.items = sc.asset ? [itemOf(sc.asset, sc.dur)] : []; }
    delete sc.asset; delete sc.voice;
    if (sc.defDur == null) sc.defDur = sc.dur;
    if (sc.fit == null) sc.fit = 'fill'; if (sc.vol == null) sc.vol = 100; if (sc.vo === undefined) sc.vo = null; sc.ph = !!sc.ph;
  });
  ed.cues = Array.isArray(ed.cues) ? ed.cues : []; ed.cueSeq = ed.cueSeq || 1;
  (ed.scenes || []).forEach(sc => {
    if (sc.items.length && sc.items.some(it => !(it.d > 0))) evenSplit(sc, sc.dur);
    const ov = String(sc.overlay || '').trim();
    if (ov && sceneWords(sc.text).length) ed.cues.push({ id: `cu${ed.cueSeq++}`, sc: sc.id, wi: 0, w: sceneWords(sc.text)[0], dt: 0, icon: null, text: { t: ov.slice(0, 80), st: 0, x: 50, y: 24, sz: 26, dur: Math.min(3, sc.dur), fx: 0 }, sfx: null, lost: false });
    delete sc.overlay;
  });
  ed.v = 3; return ed;
}
// ---- Độ dài từng hình: cảnh = tổng độ dài các hình ----
const sumItems = sc => r1((sc.items || []).reduce((a, it) => a + (it.d || 0), 0));
export function evenSplit(sc, tot) {
  const n = sc.items.length; if (!n) { sc.dur = r1(tot); return; }
  const each = Math.max(ITEM_MIN, Math.floor(tot / n * 10) / 10); sc.items.forEach(it => { it.d = each; }); sc.items[n - 1].d = r1(Math.max(ITEM_MIN, tot - each * (n - 1))); sc.dur = sumItems(sc);
}
// Đổi độ dài cả cảnh: các hình co giãn theo tỉ lệ trước (mỗi hình ≥ 1 giây), hình cuối nhận phần lẻ
export function setSceneDur(ed, sc, nd) {
  nd = r1(Math.max(sceneMin(ed, sc), Math.min(120, Number(nd) || 0)));
  if (!sc.items.length) { sc.dur = nd; return sc.dur; }
  const s = sumItems(sc) || 1; sc.items.forEach(it => { it.d = Math.max(ITEM_MIN, Math.floor((it.d || 0) * nd / s * 10) / 10); });
  let diff = r1(nd - sumItems(sc));
  for (let k = sc.items.length - 1; k >= 0 && Math.abs(diff) > 0.01; k--) { const it = sc.items[k]; const d2 = Math.max(ITEM_MIN, r1(it.d + diff)); diff = r1(diff - (d2 - it.d)); it.d = d2; }
  sc.dur = sumItems(sc); return sc.dur;
}
// Giờ bắt đầu từng hình trong cảnh (tính từ đầu cảnh)
export const itemOffsets = sc => { let a = 0; return sc.items.map(it => { const r = r1(a); a += it.d || 0; return r; }); };

// ---- Cue: mỗi cue bám vào một từ trong lời của cảnh; giây của từ tính theo VO ----
export const sceneWords = t => String(t || '').split(/\s+/).filter(Boolean);
export const normWord = w => fold(String(w)).replace(/[^a-z0-9]/g, '');
// Căn lời với VO (mô phỏng): chia theo độ dài chữ, ngắt câu dừng lâu hơn. Khi có mốc từng từ thật (dịch vụ giọng nói, Whisper) thì thay hàm này.
export function alignWords(text, dur, off) {
  const ws = sceneWords(text); const pz = w => /[.?!…]$/.test(w) ? 4 : /[,;:]$/.test(w) ? 2 : 0;
  const wt = ws.map(w => normWord(w).length + 1 + pz(w)); const sum = wt.reduce((a, b) => a + b, 0) || 1; const span = Math.max(0.2, dur - 0.2); let acc = 0.1;
  return ws.map((w, k) => { const s = acc, len = (wt[k] - pz(w)) / sum * span; acc += wt[k] / sum * span; return { w, s: Math.round((off + s) * 1000) / 1000, e: Math.round((off + s + len) * 1000) / 1000 }; });
}
// Giây (tuyệt đối trên timeline) của từng từ trong cảnh i; null khi cảnh chưa có VO
export function sceneWordTimes(ed, i) {
  const sc = ed && ed.scenes[i]; if (!sc) return null;
  if (ed.voAll && ed.voAll.dur > 0) { const A = alignWords(ed.scenes.map(x => x.text).join(' '), ed.voAll.dur, 0); let k0 = 0; for (let j = 0; j < i; j++) k0 += sceneWords(ed.scenes[j].text).length; return A.slice(k0, k0 + sceneWords(sc.text).length); }
  if (!sc.vo) return null; let t0 = 0; for (let j = 0; j < i; j++) t0 += ed.scenes[j].dur; return alignWords(sc.text, sc.vo.dur, t0);
}
export function cueTime(ed, c) {
  if (!ed || !c || c.lost) return null; const i = ed.scenes.findIndex(s => s.id === c.sc); if (i < 0) return null;
  const t = sceneWordTimes(ed, i); if (!t || !t[c.wi]) return null; return Math.max(0, Math.round((t[c.wi].s + (c.dt || 0)) * 1000) / 1000);
}
// Sửa lời cảnh: cue tìm lại từ cũ (gần chỗ cũ nhất); từ đã bị xóa thì cue báo mất để đặt lại
export function rematchCues(ed, sc, text) {
  const nw = sceneWords(text).map(normWord);
  (ed.cues || []).filter(c => c.sc === sc.id && !c.lost).forEach(c => {
    const tg = normWord(c.w); if (nw[c.wi] === tg) return; let best = -1;
    nw.forEach((x, j) => { if (x === tg && (best < 0 || Math.abs(j - c.wi) < Math.abs(best - c.wi))) best = j; });
    if (best >= 0) c.wi = best; else c.lost = true;
  });
}
const newScene = (ed, p) => { const sc = Object.assign({ id: `sc${ed.seq++}`, label: '', text: '', dur: 3, items: [], prompt: '', fit: 'fill', vol: 100, vo: null, ph: false }, p); if (sc.defDur == null) sc.defDur = sc.dur; return sc; };
const itemFromUnit = (u, sc) => ({ kind: u.kind, mediaId: u.mediaId, name: '', from: u.from, to: u.kind === 'image' ? 0 : r1(u.from + Math.min(u.dur || sc.dur, sc.dur)), dur: u.kind === 'image' ? 0 : r1(u.dur || 0), short: 'hold', trim: 0, d: sc.dur });
export function scenePrompt(S, v, text) { const c = vidSettingsOf(S); return `Hình dọc ${c.ratio} minh hoạ: ${short(text, 140) || short(v.insight.title, 100)}${c.brand.visual ? ` ${c.brand.visual}` : ''}`; }
// Tách đoạn lời dài thành nhiều cảnh (≈ 28 chữ ≈ 11 giây mỗi cảnh), cắt theo câu
function chunkText(text, maxW) {
  const ss = splitSentences(String(text || '').replace(/\n+/g, ' ')); const out = []; let cur = [];
  ss.forEach(s => { const w = countWords(cur.join(' ')) + countWords(s); if (cur.length && w > maxW) { out.push(cur.join(' ')); cur = []; } cur.push(s); });
  if (cur.length) out.push(cur.join(' '));
  return out.length ? out : [String(text || '').trim()];
}
// Lên kế hoạch tự động: kịch bản → cảnh, ghép clip/đoạn b-roll, prompt hình, giọng đọc. Giữ lựa chọn caption, frame, nhạc.
export function planEdit(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  const c = vidSettingsOf(S); const o = vidOrigin(v); const ed = editOf(v); ed.seq = ed.seq || 1;
  const dur = t => Math.max(1.5, r1(countWords(t) / c.wps));
  const scenes = [];
  if (o === 'talk') {
    const m = (v.media || []).find(x => x.kind === 'video'); if (!m) return { ok: false, error: 'Thẻ chưa có clip quay người nói.' };
    const keep = keptRanges(m.dur, ed.cuts); const words = vidBody(v.script).replace(/\n+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const total = keep.reduce((a, k) => a + k.to - k.from, 0) || 1; let wi = 0;
    keep.forEach((k, i) => {
      const n = i === keep.length - 1 ? words.length - wi : Math.round(words.length * (k.to - k.from) / total);
      scenes.push(newScene(ed, { label: `Đoạn giữ ${i + 1}`, text: words.slice(wi, wi + n).join(' '), dur: r1(k.to - k.from), items: [{ kind: 'video', mediaId: m.id, name: '', from: k.from, to: k.to, dur: r1(k.to - k.from), short: 'hold', trim: 0, d: r1(k.to - k.from) }] })); wi += n;
    });
    ed.voice = { mode: 'clip' };
  } else {
    const secs = v.script ? vidSections(v.script) : [];
    const units = o === 'broll' || o === 'longroll' ? brollUnits(v) : [];
    if (secs.length) secs.forEach(sec => chunkText(sec.text, 28).forEach((t, k) => scenes.push(newScene(ed, { label: sec.label + (k ? ` (${k + 1})` : ''), text: t, dur: dur(t) }))));
    else units.forEach((u, i) => scenes.push(newScene(ed, { label: `Cảnh ${i + 1}`, text: '', dur: u.dur || 3 })));
    if (!scenes.length) return { ok: false, error: 'Chưa có kịch bản hoặc tệp nguồn để chia cảnh.' };
    // B-roll: cảnh nhãn "Cảnh k" nhận đúng clip k; Hook/CTA mượn clip đầu/cuối. Không có b-roll: prompt hình theo lời từng cảnh.
    scenes.forEach((sc, i) => {
      const mk = /^Cảnh\s+(\d+)/i.exec(sc.label); let u = null;
      if (units.length) u = mk ? units[(Number(mk[1]) - 1) % units.length] : /^cta|chốt/i.test(sc.label) ? units[units.length - 1] : units[Math.min(i, units.length - 1)];
      if (u) sc.items = [itemFromUnit(u, sc)]; else sc.prompt = scenePrompt(S, v, sc.text);
      if (v.kind === 'bantin' && /dẫn/i.test(sc.label)) sc.prompt = 'Người dẫn nói trước camera, khung dọc, nền thương hiệu.';
    });
    const audio = (v.media || []).find(x => x.kind === 'audio');
    if (o === 'audio' && audio) {
      ed.voice = { mode: 'file', mediaId: audio.id }; ed.voAll = { kind: 'up', name: audio.name, mediaId: audio.id, dur: audio.dur || 0, peaks: null };
      const sum = scenes.reduce((a, s) => a + s.dur, 0); if (audio.dur > 0 && sum > 0) scenes.forEach(s => { s.dur = r1(s.dur * audio.dur / sum); if (s.items.length) evenSplit(s, s.dur); s.defDur = s.dur; });
    } else { if (!ed.voice || ed.voice.mode === 'clip' || ed.voice.mode === 'file') ed.voice = { mode: 'tts' }; if (ed.voAll && ed.voAll.mediaId && !(v.media || []).some(x => x.id === ed.voAll.mediaId)) ed.voAll = null; }
  }
  scenes.forEach(sc => { if (sc.items.length) evenSplit(sc, sc.dur); sc.defDur = sc.dur; });
  ed.scenes = scenes; ed.plannedAt = S.settings.demoNow; ed.simulated = true; ed.tpl = 'script'; ed.capStale = true; ed.segs = null; ed.cues = []; ed.splitFrom = v.script || '';
  // Chia cảnh là duyệt kịch bản (bản 4 bỏ nút Duyệt kịch bản)
  if (v.script && (v.status === 'DRAFT' || v.status === 'TODO')) v.status = 'APPROVED';
  log(S, 'vid-plan', 'video', id, `${scenes.length} cảnh`);
  return { ok: true, count: scenes.length };
}
const fmtSecVi = t => `${r1(t).toString().replace('.', ',')} giây`;
// Cảnh không ngắn hơn: độ dài VO của cảnh (khi không có VO toàn bài), 1 giây mỗi hình, hoặc mức sàn
export const sceneMin = (ed, sc) => r1(Math.max(SCENE_FLOOR, (sc.items || []).length, ed && !ed.voAll && sc.vo ? Math.ceil(sc.vo.dur * 10) / 10 : 0));
const sceneGet = (S, id, sid) => { const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); return { v, sc }; };
export function editScene(S, id, sid, patch) {
  const { sc } = sceneGet(S, id, sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const P = patch || {};
  if (P.dur != null) {
    const d = Number(String(P.dur).replace(',', '.')); if (!(d >= 0.5 && d <= 120)) return { ok: false, error: 'Thời lượng cảnh 0,5–120 giây.' };
    const ed = vidGet(S, id).edit; const mn = sceneMin(ed, sc); if (r1(d) < mn) return { ok: false, error: `Cảnh không ngắn hơn ${fmtSecVi(mn)} (độ dài VO hoặc 1 giây mỗi hình).` };
    if (r1(d) !== sc.dur) { setSceneDur(ed, sc, d); ed.capStale = true; }
  }
  ['text', 'prompt', 'label'].forEach(k => { if (P[k] != null) { const t = String(P[k]).trim().slice(0, k === 'text' ? 1200 : 400); if (k === 'text' && t !== sc.text) { const ed = vidGet(S, id).edit; ed.capStale = true; rematchCues(ed, sc, t); } sc[k] = t; } });
  if (P.fit != null && VID_FIT[P.fit]) sc.fit = P.fit;
  if (P.vol != null) sc.vol = Math.max(0, Math.min(100, Math.round(Number(P.vol)) || 0));
  if (P.ph != null) sc.ph = !!P.ph;
  return { ok: true };
}
// Gán hình cho cảnh: thay toàn bộ hình hiện có bằng một hình (bản cũ); thêm nhiều hình dùng addSceneItems
export function setSceneAsset(S, id, sid, a) {
  const { v, sc } = sceneGet(S, id, sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  if (!a) { sc.items = []; return { ok: true }; }
  const r = makeItem(v, sc, a); if (!r.ok) return r;
  sc.items = [r.item]; sc.ph = false; evenSplit(sc, Math.max(sc.dur, sceneMin(v.edit, sc))); return { ok: true };
}
function makeItem(v, sc, a) {
  if (a.mediaId) {
    const m = (v.media || []).find(x => x.id === a.mediaId); if (!m || m.kind === 'audio') return { ok: false, error: 'Không thấy clip nguồn.' };
    const from = Math.max(0, Number(a.from) || 0); const to = m.kind === 'image' ? 0 : Math.min(m.dur || from + sc.dur, a.to != null ? Number(a.to) : from + sc.dur);
    return { ok: true, item: { kind: m.kind, mediaId: m.id, name: m.name, from: r1(from), to: r1(to), dur: m.kind === 'image' ? 0 : r1(to - from), short: 'hold', trim: 0, d: 0 } };
  }
  const mt = /^data:(video|image)\//.exec(String(a.src || '')); if (!mt) return { ok: false, error: 'Tệp phải là ảnh hoặc video.' };
  const dur = mt[1] === 'video' ? r1(Number(a.dur) || sc.dur) : 0;
  const item = { kind: mt[1], src: a.src, name: String(a.name || '').slice(0, 120), from: 0, to: dur, dur, short: 'hold', trim: 0, d: 0 }; if (/^data:image\//.test(a.thumb || '')) item.thumb = a.thumb; if (a.gen) item.gen = true;
  return { ok: true, item };
}
export function addSceneItems(S, id, sid, list) {
  const { v, sc } = sceneGet(S, id, sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const made = []; for (const a of list || []) { const r = makeItem(v, sc, a); if (!r.ok) return r; made.push(r.item); }
  if (!made.length) return { ok: false, error: 'Chưa chọn tệp.' };
  if (sc.items.length + made.length > 12) return { ok: false, error: 'Tối đa 12 hình mỗi cảnh.' };
  // Thêm hình: chia đều lại độ dài cảnh cho các hình (không dưới 1 giây mỗi hình, không dưới VO)
  sc.items.push(...made); sc.ph = false; evenSplit(sc, Math.max(sc.dur, sceneMin(v.edit, sc))); v.edit.capStale = true;
  return { ok: true, count: made.length };
}
export function removeSceneItem(S, id, sid, k) {
  const { v, sc } = sceneGet(S, id, sid); if (!sc || !sc.items[k]) return { ok: false, error: 'Không thấy hình.' };
  sc.items.splice(k, 1); evenSplit(sc, Math.max(sc.dur, sceneMin(v.edit, sc))); v.edit.capStale = true; return { ok: true };
}
export function editSceneItem(S, id, sid, k, patch) {
  const { sc } = sceneGet(S, id, sid); const it = sc && sc.items[k]; if (!it) return { ok: false, error: 'Không thấy hình.' };
  if (patch.short != null && VID_SHORT[patch.short]) it.short = patch.short;
  if (patch.trim != null) it.trim = Math.max(0, r1(Number(patch.trim) || 0));
  return { ok: true };
}
export function addScene(S, id, afterSid) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const ed = editOf(v); const i = afterSid ? ed.scenes.findIndex(x => x.id === afterSid) : ed.scenes.length - 1;
  const sc = newScene(ed, { label: 'Cảnh mới', dur: 3, text: '' }); ed.scenes.splice(i + 1, 0, sc); ed.capStale = true; return { ok: true, scene: sc };
}
export function removeScene(S, id, sid) { const v = vidGet(S, id); if (!v || !v.edit) return { ok: false, error: 'Không thấy cảnh.' }; if (v.edit.scenes.length < 2) return { ok: false, error: 'Giữ ít nhất một cảnh.' }; v.edit.scenes = v.edit.scenes.filter(x => x.id !== sid); v.edit.cues = (v.edit.cues || []).filter(c => c.sc !== sid); v.edit.capStale = true; return { ok: true }; }
export function moveScene(S, id, sid, dir) {
  const v = vidGet(S, id); const a = v && v.edit && v.edit.scenes; const i = a ? a.findIndex(x => x.id === sid) : -1; const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= a.length) return { ok: false, error: 'Không đổi chỗ được.' };
  [a[i], a[j]] = [a[j], a[i]]; v.edit.capStale = true; return { ok: true };
}
export function setEditOptions(S, id, patch) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' }; const ed = editOf(v); const P = patch || {};
  if (P.voice != null) {
    if (!VID_VOICES[P.voice]) return { ok: false, error: 'Kiểu giọng không hợp lệ.' };
    const au = (v.media || []).find(x => x.kind === 'audio'), vd = (v.media || []).find(x => x.kind === 'video');
    if (P.voice === 'file' && !au) return { ok: false, error: 'Thẻ chưa có file giọng. Nạp ở mục Nguồn vào.' };
    if (P.voice === 'clip' && !vd) return { ok: false, error: 'Thẻ chưa có clip có tiếng.' };
    ed.voice = { mode: P.voice }; if (P.voice === 'file') ed.voice.mediaId = au.id;
  }
  if (P.captions != null && !VID_CAPTION_MODES[P.captions]) return { ok: false, error: 'Kiểu caption không hợp lệ.' };
  if (P.captions != null) ed.captions.mode = P.captions;
  if (P.pos != null && VID_CAPTION_POS[P.pos]) ed.captions.pos = P.pos;
  if (P.style != null) { const k = Number(P.style); if (!(k >= 0 && k < VID_CAPTION_STYLES.length)) return { ok: false, error: 'Kiểu caption không hợp lệ.' }; ed.captions.style = k; }
  if (P.frame != null) ed.frame = VID_FRAMES[P.frame] || /^fr-/.test(P.frame) ? P.frame : 'none';
  if (P.music !== undefined) {
    if (!P.music) ed.music = null;
    else { if (!/^data:audio\//.test(P.music.src || '')) return { ok: false, error: 'Nhạc nền phải là tệp audio.' }; ed.music = { src: P.music.src, name: String(P.music.name || 'nhạc nền').slice(0, 120), vol: 0.25, license: String(P.music.license || ''), duck: true, peaks: P.music.peaks || null }; }
  }
  if (P.musicVol != null && ed.music) ed.music.vol = Math.max(0, Math.min(1, Number(P.musicVol) || 0));
  if (P.musicDuck != null && ed.music) ed.music.duck = !!P.musicDuck;
  if (P.musicPeaks && ed.music) ed.music.peaks = P.musicPeaks;
  if (P.musicLicense != null && ed.music) ed.music.license = String(P.musicLicense).trim().slice(0, 200);
  return { ok: true };
}
export function editTimeline(v) {
  const sc = (v && v.edit ? v.edit.scenes : []); let t = 0;
  const items = sc.map(s => { const it = { scene: s, t0: r1(t), t1: r1(t + s.dur) }; t += s.dur; return it; });
  return { items, total: r1(t) };
}
// Caption: Phụ đề đầy đủ = cụm ≤ 7 chữ theo câu; Chữ nhấn ý = mỗi câu một cụm từ khoá (từ dài, bỏ hư từ). Thời gian chia theo số chữ.
const STOP = new Set('và là của có cho với những các một này thì mà để khi trong được không rằng như từ bạn mình nhé ạ'.split(' '));
export function captionChunks(text, dur, mode) {
  const D = Number(dur) || 0; const ss = splitSentences(String(text || '').replace(/\n+/g, ' ')).filter(Boolean); if (!ss.length || !D || mode === 'off') return [];
  const chunks = [];
  ss.forEach(s => {
    const w = s.split(/\s+/).filter(Boolean);
    if (mode === 'key') { const k = w.filter(x => !STOP.has(fold(x).replace(/[^a-z0-9]/g, '')) && x.replace(/[^\p{L}\p{N}]/gu, '').length >= 3).slice(0, 4).join(' ').replace(/[,.;:!?…]+$/, ''); chunks.push({ text: k.toUpperCase() || w.slice(0, 3).join(' '), weight: w.length }); return; }
    const n = Math.ceil(w.length / 7); const per = Math.ceil(w.length / n);
    for (let i = 0; i < w.length; i += per) chunks.push({ text: w.slice(i, i + per).join(' '), weight: Math.min(per, w.length - i) });
  });
  const sum = chunks.reduce((a, c) => a + c.weight, 0); let t = 0;
  return chunks.map((c, i) => { const d = D * c.weight / sum; const o = { t0: r1(t), t1: i === chunks.length - 1 ? r1(D) : r1(t + d), text: c.text }; t += d; return o; });
}
export function editIssues(S, v) {
  const out = []; const ed = v && v.edit; if (!ed || !ed.scenes.length) return out;
  const tl = editTimeline(v); const c = vidSettingsOf(S);
  if (tl.total > 90) out.push(`Video dài ${Math.round(tl.total)} giây; nên dưới 90 giây.`);
  const noAsset = ed.scenes.filter(s => !s.items.length).length; if (noAsset) out.push(`${noAsset} cảnh chưa có hình (đang dùng thẻ giữ chỗ kèm prompt).`);
  const noText = ed.scenes.filter(s => !s.text && ed.voice.mode !== 'none' && ed.voice.mode !== 'clip').length;
  if (ed.capStale && ed.captions.mode !== 'off') out.push('Caption chưa khớp timeline: bấm Gen caption.'); if (noText) out.push(`${noText} cảnh chưa có lời.`);
  if (ed.voice.mode === 'self') out.push('Giọng: tự thu sau. Xem trước không có tiếng.');
  if (ed.music && !ed.music.license) out.push('Nhạc nền chưa ghi nguồn/giấy phép (TikTok tài khoản doanh nghiệp chỉ dùng nhạc thương mại).');
  if (ed.scenes.some(s => s.dur > 15)) out.push('Có cảnh dài hơn 15 giây; nên chia nhỏ để giữ nhịp.');
  if (Math.abs(tl.total - countWords(vidBody(v.script)) / c.wps) > 20 && v.script && ed.voice.mode === 'tts') out.push('Tổng thời lượng cảnh lệch nhiều so với độ dài lời đọc.');
  return out;
}
// Lệnh dựng (JSON) cho bộ xuất: thứ tự cảnh, nguồn, đoạn cắt, chữ, caption có thời gian, giọng, frame, nhạc. Dữ liệu tệp ghi theo tên, không nhúng.
export function editCommands(S, v) {
  const ed = editOf(v); const tl = editTimeline(v); const c = vidSettingsOf(S);
  const mediaName = id => { const m = (v.media || []).find(x => x.id === id); return m ? m.name : id; };
  const voInfo = o => o ? { kind: o.kind, file: o.mediaId ? mediaName(o.mediaId) : o.kind === 'up' ? o.name : null, duration: o.dur, text: o.kind === 'ai' ? '' : undefined } : null;
  const capsOf = (s, t0, t1) => {
    if (ed.segs && ed.captions.mode !== 'off') {
      const mine = ed.segs.filter(g => g.sc === s.id);
      return mine.map((g, i) => ({ start: r1(g.at), end: r1(i + 1 < mine.length ? mine[i + 1].at : t1), text: g.t }));
    }
    return captionChunks(s.text, s.dur, ed.captions.mode).map(x => ({ start: r1(t0 + x.t0), end: r1(t0 + x.t1), text: x.text }));
  };
  return {
    app: 'Content Matrix', kind: 'vid-edit-list', version: 3, popup: VID_POPUP_VER, video: { id: v.id, title: v.insight.title, origin: vidOrigin(v) }, ratio: c.ratio, duration: tl.total,
    voice: Object.assign({}, ed.voice, ed.voice.mediaId ? { file: mediaName(ed.voice.mediaId) } : {}), voiceover: ed.voAll ? { scope: 'all', ...voInfo(ed.voAll) } : null,
    captions: Object.assign({}, ed.captions, { styleName: VID_CAPTION_STYLES[ed.captions.style] || '' }), frame: ed.frame,
    music: ed.music ? { file: ed.music.name, volume: ed.music.vol, duck: ed.music.duck !== false, license: ed.music.license || '' } : null,
    cuts: (ed.cuts || []).filter(x => x.on !== false).map(x => ({ from: x.from, to: x.to })),
    // Cue: giây tính theo VO; vị trí x, y là phần trăm khung (tâm lớp phủ), cỡ là px ở khung xem thử rộng 270 px
    cues: (ed.cues || []).map(c => ({ c, t: cueTime(ed, c) })).filter(x => x.t != null).sort((a, b) => a.t - b.t).map(({ c, t }) => ({ id: c.id, at: t, word: c.w,
      icon: c.icon ? { glyph: c.icon.g, x: c.icon.x, y: c.icon.y, size: c.icon.sz, duration: c.icon.dur, effect: c.icon.fx || 0 } : null,
      text: c.text ? { text: c.text.t, style: c.text.st, x: c.text.x, y: c.text.y, size: c.text.sz, duration: c.text.dur, effect: c.text.fx || 0 } : null,
      sfx: c.sfx ? { key: c.sfx.k, volume: c.sfx.vol / 100 } : null })),
    scenes: tl.items.map(({ scene: s, t0, t1 }) => {
      const offs = itemOffsets(s);
      return { id: s.id, start: t0, end: t1, label: s.label, text: s.text, fit: s.fit, volume: s.vol / 100,
        voiceover: ed.voAll ? null : s.vo ? { scope: 'scene', ...voInfo(s.vo), start: t0 } : null,
        sources: s.items.map((it, k) => ({ file: it.mediaId ? mediaName(it.mediaId) : it.name || 'tệp tải lên', kind: it.kind, from: r1((it.from || 0) + (it.trim || 0)), to: it.kind === 'image' ? 0 : r1((it.from || 0) + (it.trim || 0) + Math.min(it.d, it.dur || it.d)), start: r1(t0 + offs[k]), end: r1(t0 + offs[k] + it.d), whenShort: it.short || 'hold' })),
        ...(s.items.length ? {} : { placeholder: true, prompt: s.prompt }),
        captions: capsOf(s, t0, t1) };
    }),
    exportedAt: S.settings.demoNow,
  };
}

// ---- Đưa vào lịch (mục 10.75, thay phần "slot video" của Đợt 2) ----
// Kênh video ngắn: kênh có Format dạng kịch bản ngắn (layout script). Slot là slot tự do có videoId; Chia bài/Viết slot bỏ qua slot tự do.
const VIDEO_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'youtube'];
export function vidChannels(S) {
  return (S.channels || []).filter(ch => VIDEO_PLATFORMS.includes(ch.platform)).map(ch => ({ channel: ch, format: (S.formats || []).find(f => f.channelId === ch.id && f.layout === 'script') })).filter(x => x.format);
}
export const vidSlotsOf = (S, vidId) => (S.slots || []).filter(s => s.videoId === vidId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
export function mockCaption(S, v, ch) {
  const ss = splitSentences(plainMd(vidBody(v.script)).replace(/\n+/g, ' ')).filter(s => countWords(s) >= 3);
  const p = ch.platform; const max = ch.maxChars || 2200; const tagMax = ch.maxHashtags == null ? 3 : ch.maxHashtags;
  const row = vidTopicRow(S, v.topicId); const tv = row && topicCurrent(row);
  const tag = s => '#' + fold(s).replace(/[^a-z0-9]+/g, '').slice(0, 24);
  const brand = S.brand && S.brand.parsed && S.brand.parsed.name;
  const tags = [tv && !row.free ? tag(tv.title.split(/[:,–-]/)[0]) : '', brand ? tag(brand) : '', { youtube: '#shorts', instagram: '#reels', facebook: '#reels', tiktok: '#xuhuong' }[p]].filter(t => t && t.length > 2).slice(0, tagMax);
  const cta = { youtube: 'Đăng ký kênh để xem video mới mỗi ngày.', tiktok: 'Lưu lại và follow để luyện tiếp nhé.', instagram: 'Lưu bài để xem lại, gửi cho người cần.', facebook: 'Chia sẻ cho người đang cần nhé.' }[p] || '';
  const head = p === 'youtube' ? short(v.insight.title.replace(/^[^:]{2,30}:\s*/, ''), 90) : (ss[0] || v.insight.title);
  const body = p === 'tiktok' ? '' : (ss[1] || '');
  let text = [head, body, cta].filter(Boolean).join('\n\n') + (tags.length ? `\n\n${tags.join(' ')}` : '');
  if (text.length > max) text = text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  return text;
}
export function vidCaptionsJob(S, v, chans) {
  const list = chans.map(x => `- ${x.channel.id}: ${x.channel.name} (tối đa ${x.channel.maxChars || 2200} ký tự, ${x.channel.maxHashtags == null ? 3 : x.channel.maxHashtags} hashtag)`).join('\n');
  const user = [`# Việc: viết caption đăng kèm video ngắn cho từng kênh, từ kịch bản dưới đây (không viết từ bài khác)`, list,
    `# Kịch bản\n${vidBody(v.script)}`, 'Mỗi kênh một caption hợp thói quen kênh đó (YouTube Shorts: tiêu đề ngắn; TikTok: một câu và hashtag; Instagram/Facebook: 2–3 câu và lời mời). Trả lời bằng đúng một khối JSON: {"captions": {"<mã kênh>": "caption"}}'].join('\n\n');
  return { key: `vid-captions:${v.id}`, label: `Caption · ${short(v.insight.title, 40)}`, system: aiSystem(S).split('\n\nTrả lời bằng')[0], user };
}
export function parseVidCaptions(raw, chans) {
  const j = extractJson(raw); const c = j && j.captions; if (!c || typeof c !== 'object') return { ok: false, error: 'AI không trả về caption đọc được.' };
  const out = {}; chans.forEach(x => { if (typeof c[x.channel.id] === 'string' && c[x.channel.id].trim()) out[x.channel.id] = c[x.channel.id].trim(); });
  return Object.keys(out).length ? { ok: true, captions: out } : { ok: false, error: 'AI không viết caption cho kênh nào.' };
}
export function scheduleGate(S, vidId) {
  const v = vidGet(S, vidId); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  if (!v.file) return { ok: false, error: 'Chưa có video thành phẩm. Up video trước.' };
  if (isLocked(S, v.weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" ở Dashboard trước.' };
  return { ok: true, video: v };
}
// Ngày gợi ý: mỗi video một ngày, bắt đầu từ ngày đầu tuần chưa có video nào
export function suggestVidDates(S, weekId, n) {
  const w = weekOf(S, weekId); if (!w) return [];
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(`${w.startDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const used = new Set((S.slots || []).filter(s => s.weekId === weekId && s.videoId).map(s => s.date));
  const free = days.filter(d => !used.has(d)).concat(days.filter(d => used.has(d)));
  return Array.from({ length: n }, (_, i) => free[i % 7]);
}
export function scheduleVideo(S, vidId, p) {
  const g = scheduleGate(S, vidId); if (!g.ok) return g; const v = g.video; const P = p || {};
  const chans = vidChannels(S).filter(x => (P.channelIds || []).includes(x.channel.id)); if (!chans.length) return { ok: false, error: 'Chọn ít nhất một kênh.' };
  const have = new Set(vidSlotsOf(S, vidId).map(s => s.channelId)); const made = [], skipped = [];
  for (const x of chans) {
    if (have.has(x.channel.id)) { skipped.push(x.channel.name); continue; }
    const r = addSlot(S, v.weekId, { date: P.date, time: P.time, channelId: x.channel.id, formatId: x.format.id, free: true, columnId: null });
    if (!r.ok) { made.forEach(s => deleteSlot(S, s.id)); return { ok: false, error: r.error }; }
    const s = r.slot; s.videoId = v.id; s.assets = [];
    const ai = addSlotAsset(S, s.id, 'video'); s.assets[ai.index].name = 'Video Short Vid';
    const up = uploadSlotImage(S, s.id, ai.index, { src: v.file.src, name: v.file.name });
    if (!up.ok) { made.concat([s]).forEach(z => deleteSlot(S, z.id)); return { ok: false, error: up.error }; }
    if (v.file.cover) setVideoCover(S, s.id, ai.index, v.file.cover);
    if (v.file.subs) setVideoSubs(S, s.id, ai.index, v.file.subs.cues, v.file.subs.source);
    editSlot(S, s.id, (P.captions && P.captions[x.channel.id]) || mockCaption(S, v, x.channel));
    s.vidCaptionSim = !(P.captions && P.captions[x.channel.id]);
    made.push(s);
  }
  if (made.length) log(S, 'vid-schedule', 'video', vidId, `${made.length} slot ${P.date} ${P.time}`);
  return { ok: true, slots: made, skipped };
}
export function unscheduleVideo(S, vidId) {
  const list = vidSlotsOf(S, vidId); let n = 0, kept = 0;
  list.forEach(s => { if (s.state === 'PUBLISHED') { kept++; return; } const r = deleteSlot(S, s.id); if (r && r.ok === false) kept++; else n++; });
  if (n) log(S, 'vid-unschedule', 'video', vidId, `${n} slot`);
  return { ok: true, removed: n, kept };
}
