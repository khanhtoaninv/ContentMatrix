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
    v.edit.scenes.forEach(sc => { if (sc.asset && sc.asset.mediaId === mid) sc.asset = null; });
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
function editOf(v) {
  if (!v.edit) v.edit = { scenes: [], voice: { mode: 'tts' }, captions: { mode: 'full', pos: 'bottom' }, frame: 'logo', music: null, cuts: [], seq: 1, plannedAt: null };
  return v.edit;
}
const newScene = (ed, p) => Object.assign({ id: `sc${ed.seq++}`, label: '', text: '', dur: 3, asset: null, prompt: '', overlay: '', voice: '' }, p);
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
      scenes.push(newScene(ed, { label: `Đoạn giữ ${i + 1}`, text: words.slice(wi, wi + n).join(' '), dur: r1(k.to - k.from), asset: { kind: 'video', mediaId: m.id, from: k.from, to: k.to } })); wi += n;
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
      if (u) sc.asset = { kind: u.kind, mediaId: u.mediaId, from: u.from, to: u.kind === 'image' ? 0 : r1(u.from + Math.min(u.dur || sc.dur, sc.dur)) };
      else sc.prompt = scenePrompt(S, v, sc.text);
      if (v.kind === 'bantin' && /dẫn/i.test(sc.label)) { sc.voice = 'self'; sc.prompt = 'Người dẫn nói trước camera, khung dọc, nền thương hiệu.'; }
    });
    const audio = (v.media || []).find(x => x.kind === 'audio');
    if (o === 'audio' && audio) {
      ed.voice = { mode: 'file', mediaId: audio.id };
      const sum = scenes.reduce((a, s) => a + s.dur, 0); if (audio.dur > 0 && sum > 0) scenes.forEach(s => { s.dur = r1(s.dur * audio.dur / sum); });
    } else if (!ed.voice || ed.voice.mode === 'clip' || ed.voice.mode === 'file') ed.voice = { mode: 'tts' };
  }
  ed.scenes = scenes; ed.plannedAt = S.settings.demoNow; ed.simulated = true;
  log(S, 'vid-plan', 'video', id, `${scenes.length} cảnh`);
  return { ok: true, count: scenes.length };
}
const sceneGet = (S, id, sid) => { const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); return { v, sc }; };
export function editScene(S, id, sid, patch) {
  const { sc } = sceneGet(S, id, sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const P = patch || {};
  if (P.dur != null) { const d = Number(String(P.dur).replace(',', '.')); if (!(d >= 0.5 && d <= 120)) return { ok: false, error: 'Thời lượng cảnh 0,5–120 giây.' }; sc.dur = r1(d); }
  ['text', 'prompt', 'overlay', 'label'].forEach(k => { if (P[k] != null) sc[k] = String(P[k]).trim().slice(0, k === 'text' ? 1200 : 400); });
  if (P.voice != null) sc.voice = P.voice === 'self' ? 'self' : '';
  return { ok: true };
}
export function setSceneAsset(S, id, sid, a) {
  const { v, sc } = sceneGet(S, id, sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  if (!a) { sc.asset = null; return { ok: true }; }
  if (a.mediaId) {
    const m = (v.media || []).find(x => x.id === a.mediaId); if (!m || m.kind === 'audio') return { ok: false, error: 'Không thấy clip nguồn.' };
    const from = Math.max(0, Number(a.from) || 0); const to = m.kind === 'image' ? 0 : Math.min(m.dur || from + sc.dur, a.to != null ? Number(a.to) : from + sc.dur);
    sc.asset = { kind: m.kind, mediaId: m.id, from: r1(from), to: r1(to) }; return { ok: true };
  }
  const mt = /^data:(video|image)\//.exec(String(a.src || '')); if (!mt) return { ok: false, error: 'Tệp phải là ảnh hoặc video.' };
  sc.asset = { kind: mt[1], src: a.src, name: String(a.name || '').slice(0, 120), from: 0, to: mt[1] === 'video' ? r1(Number(a.dur) || sc.dur) : 0 }; if (/^data:image\//.test(a.thumb || '')) sc.asset.thumb = a.thumb;
  return { ok: true };
}
export function addScene(S, id, afterSid) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const ed = editOf(v); const i = afterSid ? ed.scenes.findIndex(x => x.id === afterSid) : ed.scenes.length - 1;
  const sc = newScene(ed, { label: 'Cảnh mới', dur: 3 }); ed.scenes.splice(i + 1, 0, sc); return { ok: true, scene: sc };
}
export function removeScene(S, id, sid) { const v = vidGet(S, id); if (!v || !v.edit) return { ok: false, error: 'Không thấy cảnh.' }; v.edit.scenes = v.edit.scenes.filter(x => x.id !== sid); return { ok: true }; }
export function moveScene(S, id, sid, dir) {
  const v = vidGet(S, id); const a = v && v.edit && v.edit.scenes; const i = a ? a.findIndex(x => x.id === sid) : -1; const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= a.length) return { ok: false, error: 'Không đổi chỗ được.' };
  [a[i], a[j]] = [a[j], a[i]]; return { ok: true };
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
  if (P.frame != null) ed.frame = VID_FRAMES[P.frame] || /^fr-/.test(P.frame) ? P.frame : 'none';
  if (P.music !== undefined) {
    if (!P.music) ed.music = null;
    else { if (!/^data:audio\//.test(P.music.src || '')) return { ok: false, error: 'Nhạc nền phải là tệp audio.' }; ed.music = { src: P.music.src, name: String(P.music.name || 'nhạc nền').slice(0, 120), vol: 0.25, license: String(P.music.license || '') }; }
  }
  if (P.musicVol != null && ed.music) ed.music.vol = Math.max(0, Math.min(1, Number(P.musicVol) || 0));
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
  const noAsset = ed.scenes.filter(s => !s.asset && s.voice !== 'self').length; if (noAsset) out.push(`${noAsset} cảnh chưa có hình (đang dùng thẻ giữ chỗ kèm prompt).`);
  const noText = ed.scenes.filter(s => !s.text && ed.voice.mode !== 'none' && ed.voice.mode !== 'clip').length; if (noText) out.push(`${noText} cảnh chưa có lời.`);
  if (ed.voice.mode === 'self') out.push('Giọng: tự thu sau. Xem trước không có tiếng.');
  if (ed.music && !ed.music.license) out.push('Nhạc nền chưa ghi nguồn/giấy phép (TikTok tài khoản doanh nghiệp chỉ dùng nhạc thương mại).');
  if (ed.scenes.some(s => s.dur > 15)) out.push('Có cảnh dài hơn 15 giây; nên chia nhỏ để giữ nhịp.');
  if (Math.abs(tl.total - countWords(vidBody(v.script)) / c.wps) > 20 && v.script && ed.voice.mode === 'tts') out.push('Tổng thời lượng cảnh lệch nhiều so với độ dài lời đọc.');
  return out;
}
// Lệnh dựng (JSON) cho bộ xuất: thứ tự cảnh, nguồn, đoạn cắt, chữ, caption có thời gian, giọng, frame, nhạc. Dữ liệu tệp ghi theo tên, không nhúng.
export function editCommands(S, v) {
  const ed = v.edit || editOf(v); const tl = editTimeline(v); const c = vidSettingsOf(S);
  const mediaName = id => { const m = (v.media || []).find(x => x.id === id); return m ? m.name : id; };
  return {
    app: 'Content Matrix', kind: 'vid-edit-list', version: 1, video: { id: v.id, title: v.insight.title, origin: vidOrigin(v) }, ratio: c.ratio, duration: tl.total,
    voice: Object.assign({}, ed.voice, ed.voice.mediaId ? { file: mediaName(ed.voice.mediaId) } : {}), captions: ed.captions, frame: ed.frame,
    music: ed.music ? { file: ed.music.name, volume: ed.music.vol, license: ed.music.license || '' } : null,
    cuts: (ed.cuts || []).filter(x => x.on !== false).map(x => ({ from: x.from, to: x.to })),
    scenes: tl.items.map(({ scene: s, t0, t1 }) => ({ id: s.id, start: t0, end: t1, label: s.label, text: s.text, overlay: s.overlay || '', voice: s.voice || ed.voice.mode,
      source: s.asset ? (s.asset.mediaId ? { file: mediaName(s.asset.mediaId), kind: s.asset.kind, from: s.asset.from, to: s.asset.to } : { file: s.asset.name || 'tệp tải lên', kind: s.asset.kind, from: s.asset.from, to: s.asset.to }) : { placeholder: true, prompt: s.prompt },
      captions: captionChunks(s.text, s.dur, ed.captions.mode).map(x => ({ start: r1(t0 + x.t0), end: r1(t0 + x.t1), text: x.text })) })),
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
