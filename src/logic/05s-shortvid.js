// ---------- 05s · Short Vid: Topic → Insight → Kịch bản → Video (mục 10.72) ----------
import { clone, countWords, fold, splitSentences } from './01-util.js';
import { parseTopics, topicSubsections } from './02-parse.js';
import { topicMaterial } from './04-mock.js';
import { byId, ensureWeek, log, topicCurrent, topicsOf, weekOf } from './05-model.js';
import { topicDirection } from './05g-format.js';
import { normalizeTopicMd } from './05h-topicframe.js';
import { normCues, validateCues } from './05n-media.js';
import { aiSystem, extractJson } from './05o-aitext.js';
import { skillBlock, skillRefOf } from './05r-skill.js';
import { freeMockScript, freeScriptJob, migrateEdit } from './05t-videdit.js';
// Mỗi video tự đứng được, một ý (Insight). Kịch bản 140–200 chữ (≈ 60 giây ở 2,5 chữ/giây). Hai kiểu: Bản tin (người dẫn mở,
// phần sau giọng máy đọc Prompt Audio) và Người nói hết. Kịch bản hủy không cần nộp video, không tính KPI.

export const VID_MAX_PER_TOPIC = 7; // ma trận Short Vid: tối đa 7 thẻ Vid mỗi Topic
export const VID_KINDS = { bantin: 'Bản tin', noihet: 'Người nói hết' };
export const VID_STATES = {
  IDEA: ['Đề xuất', 'st-need'], TODO: ['Chờ viết', 'st-need'], DRAFT: ['Có kịch bản', 'st-need'],
  APPROVED: ['Đã duyệt kịch bản', 'st-ok'], READY: ['Sẵn sàng', 'st-done'], SCHEDULED: ['Đã lên lịch', 'st-done'], POSTED: ['Đã đăng', 'st-done'], CANCELLED: ['Đã hủy', 'st-off'],
};
export const VID_NEEDS = { '': 'Không', case: 'Topic có trường hợp thật', question: 'Topic có câu hỏi người xem' };
const BANTIN_LAYOUT = ['Người dẫn', 'Giọng máy', 'Chốt'];
const VF = (id, key, name, kind, structure, guideMd, needs, basis) => ({ id, key, name, kind, structure, guideMd, needs: needs || '', basis: basis || '', active: true, skills: [], activeSkillId: '' });
export function defaultVidFormats() {
  return [
    VF('vf-giaithich', 'giaithich', 'Giải thích nhanh', 'noihet', ['Hook', 'Cơ chế', 'Ý nghĩa', 'CTA'], 'Mở bằng câu hỏi "Vì sao…" gây tò mò, giải thích đúng một cơ chế bằng lời thường, nói rõ ý nghĩa với người xem.', '', 'Nội dung hữu ích được chia sẻ nhiều hơn (Berger & Milkman 2012).'),
    VF('vf-meo', 'meo', 'Mẹo một kỹ năng', 'noihet', ['Vấn đề', 'Các bước', 'Kết quả', 'CTA'], 'Một vấn đề cụ thể, 2–3 bước làm được ngay, mỗi bước một ví dụ mẫu ngắn.', '', 'Hiệu ứng ví dụ mẫu.'),
    VF('vf-ngonhan', 'ngonhan', 'Ngộ nhận và sự thật', 'noihet', ['Ngộ nhận', 'Sự thật', 'Vì sao hay nhầm', 'CTA'], 'Nêu một ngộ nhận phổ biến, nói sự thật kèm căn cứ trong Topic, giải thích vì sao hay nhầm.', '', 'Văn bản bác bỏ ngộ nhận, g = 0,41 (Schroeder & Kucera 2022).'),
    VF('vf-thuthach', 'thuthach', 'Thử thách nhanh', 'noihet', ['Bối cảnh', 'Câu hỏi', 'Đáp án', 'Mời bình luận'], 'Đặt bối cảnh, hỏi một câu (dừng 2–3 giây để người xem nghĩ), rồi đáp án và giải thích.', '', 'Hiệu ứng kiểm tra (Karpicke & Roediger 2007); chưa có dữ liệu trên TikTok.'),
    VF('vf-cauchuyen', 'cauchuyen', 'Câu chuyện học viên', 'noihet', ['Trước', 'Bước ngoặt', 'Sau', 'Bài học', 'CTA'], 'Chỉ kể trường hợp có trong Topic (đã có đồng ý): trước, bước ngoặt, sau, bài học.', 'case', 'Câu chuyện thuyết phục (van Laer 2014); người thật giữ chú ý (System1).'),
    VF('vf-bantin', 'bantin', 'Bản tin kiến thức', 'bantin', BANTIN_LAYOUT.slice(), 'Người dẫn mở 15–25 chữ, phần tin 2–3 ý do giọng máy đọc hoặc chữ trên hình, chốt một câu. Tin kiến thức, không chỉ thời sự.', '', 'Chưa có căn cứ; cần đo riêng sau vài tuần.'),
    VF('vf-hoidap', 'hoidap', 'Trả lời câu hỏi người xem', 'noihet', ['Câu hỏi', 'Trả lời', 'Mời hỏi tiếp'], 'Trích câu hỏi hoặc bình luận thật, trả lời đúng một ý, mời hỏi tiếp. Topic không có câu hỏi thật thì không viết.', 'question', 'Tăng tương tác hai chiều là suy luận.'),
  ];
}
export function defaultVidSettings() {
  return { weekTarget: 7, weekMin: 3, mix: { bantin: 3, noihet: 4 }, lenSec: 90, wordMin: 190, wordMax: 260, wordTarget: 225, wps: 2.5, ratio: '9:16', brand: { opener: '', closer: '', visual: '' } };
}
// Độ dài video (giây) → khoảng chữ: nhắm giây × tốc độ nói, chấp nhận ±15%
export const VID_LEN_MIN = 15, VID_LEN_MAX = 300, VID_LEN_PICKS = [30, 60, 90];
export const lenWords = (sec, wps) => { const t = Math.round(Number(sec) * Number(wps || 2.5)); return { target: t, min: Math.round(t * 0.85), max: Math.round(t * 1.15) }; };
// v (không bắt buộc): thẻ có độ dài riêng `lenSec` thì khoảng chữ theo độ dài đó
export function vidSettingsOf(S, v) {
  const d = defaultVidSettings(); const c = S.vidSettings || {};
  const o = Object.assign(d, c, { mix: Object.assign(d.mix, c.mix || {}), brand: Object.assign(d.brand, c.brand || {}) });
  if (v && v.lenSec >= VID_LEN_MIN && v.lenSec <= VID_LEN_MAX) { const w = lenWords(v.lenSec, o.wps); Object.assign(o, { lenSec: v.lenSec, wordMin: w.min, wordMax: w.max, wordTarget: w.target }); }
  return o;
}
export function ensureShortVid(S) {
  if (!Array.isArray(S.vidFormats)) S.vidFormats = defaultVidFormats();
  if (!Array.isArray(S.videos)) S.videos = [];
  if (!Array.isArray(S.vidTopics)) S.vidTopics = [];
  if (!Array.isArray(S.vidAnalyses)) S.vidAnalyses = [];
  if (!Array.isArray(S.vidHidden)) S.vidHidden = [];
  if (!Array.isArray(S.vidRows)) {   // mục 10.85: bảng gồm các hàng người dùng tự thêm; dữ liệu cũ: mỗi Topic đã có thẻ / chủ đề riêng / hàng tự do thành một hàng
    S.vidRows = []; const seen = new Set();
    const add = (weekId, topicId) => { if (seen.has(topicId)) return; seen.add(topicId); S.vidRows.push({ id: `vr-${S.vidRows.length + 1}`, weekId, topicId }); };
    (S.topics || []).forEach(r => { if (!(S.vidHidden || []).includes(r.id) && S.videos.some(v => v.topicId === r.id)) add(r.weekId, r.id); });
    (S.vidTopics || []).slice().sort((a, b) => a.order - b.order).forEach(r => add(r.weekId, r.id));
  }
  if (!S.vidSettings || typeof S.vidSettings !== 'object') S.vidSettings = defaultVidSettings();
  // Dữ liệu cũ chưa có độ dài (giây): còn đúng mức mặc định cũ 140–200 chữ thì đổi sang 90 giây; đã tự chỉnh thì giữ và suy ra số giây
  if (S.vidSettings.lenSec == null) { const c = S.vidSettings; const wps = Number(c.wps) || 2.5; if (c.wordMin === 140 && c.wordMax === 200 && c.wordTarget === 150) Object.assign(c, { lenSec: 90 }, (({ min, max, target }) => ({ wordMin: min, wordMax: max, wordTarget: target }))(lenWords(90, wps))); else c.lenSec = Math.max(VID_LEN_MIN, Math.min(VID_LEN_MAX, Math.round((Number(c.wordTarget) || 225) / wps))); }
  S.videos.forEach(v => {
    if (v.edit) migrateEdit(v.edit);   // mục 10.76: cảnh nhiều hình, VO toàn bài
    // Mục 10.88: phần biên tập trong bản kịch bản cũ chuyển sang lịch sử biên tập riêng
    if ((v.history || []).some(h => h.edit)) { const H = v.editHist = v.editHist || []; v.history.forEach(h => { if (h.edit && (h.edit.scenes || []).length && H.length < EDIT_KEEP) { v.editN = (v.editN || 0) + 1; H.push({ n: v.editN, edit: migrateEdit(h.edit), at: h.at || '', why: `Theo kịch bản bản ${h.n}` }); } delete h.edit; }); }
  });
  return S;
}
export function setVidSettings(S, patch) {
  const c = vidSettingsOf(S); const P = patch || {};
  const n = (v, d) => v == null || v === '' ? d : Number(v);
  const out = Object.assign({}, c, {
    weekTarget: n(P.weekTarget, c.weekTarget), weekMin: n(P.weekMin, c.weekMin), wordMin: n(P.wordMin, c.wordMin), wordMax: n(P.wordMax, c.wordMax),
    wordTarget: n(P.wordTarget, c.wordTarget), wps: n(P.wps, c.wps), ratio: P.ratio || c.ratio, lenSec: n(P.lenSec, c.lenSec),
    mix: { bantin: n(P.mix && P.mix.bantin, c.mix.bantin), noihet: n(P.mix && P.mix.noihet, c.mix.noihet) },
    brand: Object.assign({}, c.brand, P.brand || {}),
  });
  const int = v => Number.isInteger(v);
  if (!int(out.lenSec) || out.lenSec < VID_LEN_MIN || out.lenSec > VID_LEN_MAX) return { ok: false, error: `Độ dài video phải là số nguyên ${VID_LEN_MIN}–${VID_LEN_MAX} giây.` };
  // Đổi độ dài (giây) thì khoảng chữ tính lại theo độ dài đó
  if (P.lenSec != null && P.lenSec !== '' && out.lenSec !== c.lenSec && out.wps > 0) { const w = lenWords(out.lenSec, out.wps); Object.assign(out, { wordMin: w.min, wordMax: w.max, wordTarget: w.target }); }
  if (!int(out.weekTarget) || out.weekTarget < 1 || out.weekTarget > 28) return { ok: false, error: 'Số video mỗi tuần phải là số nguyên 1–28.' };
  if (!int(out.weekMin) || out.weekMin < 0 || out.weekMin > out.weekTarget) return { ok: false, error: 'Mức tối thiểu phải từ 0 đến số video mỗi tuần.' };
  if (!int(out.wordMin) || !int(out.wordMax) || out.wordMin < 40 || out.wordMax > 900 || out.wordMin > out.wordMax) return { ok: false, error: 'Độ dài chữ không hợp lệ (40–900, tối thiểu ≤ tối đa).' };
  if (!int(out.wordTarget) || out.wordTarget < out.wordMin || out.wordTarget > out.wordMax) return { ok: false, error: 'Độ dài mục tiêu phải nằm trong khoảng tối thiểu–tối đa.' };
  if (!(out.wps >= 1 && out.wps <= 5)) return { ok: false, error: 'Tốc độ nói phải từ 1 đến 5 chữ/giây.' };
  if (!int(out.mix.bantin) || !int(out.mix.noihet) || out.mix.bantin < 0 || out.mix.noihet < 0) return { ok: false, error: 'Tỉ lệ Bản tin / Người nói phải là số nguyên ≥ 0.' };
  ['opener', 'closer', 'visual'].forEach(k => { out.brand[k] = String(out.brand[k] || '').slice(0, 600); });
  S.vidSettings = out; log(S, 'vid-settings', 'settings', 'shortvid');
  return { ok: true, settings: out };
}

// ---- Format Short Vid ----
export const vidFormatsOf = (S, all) => (S.vidFormats || []).filter(f => all || f.active !== false);
export function validateVidFormat(S, f, id) {
  const e = [];
  const nm = String(f.name || '').trim(); if (!nm) e.push('Format cần có tên.');
  if ((S.vidFormats || []).some(x => x.id !== id && fold(x.name).trim() === fold(nm).trim())) e.push('Đã có Format cùng tên.');
  if (!VID_KINDS[f.kind]) e.push('Kiểu mặc định không hợp lệ.');
  if (!Array.isArray(f.structure) || f.structure.filter(x => String(x).trim()).length < 2) e.push('Bố cục cần ít nhất 2 phần.');
  if (f.needs && !VID_NEEDS[f.needs]) e.push('Điều kiện nguồn không hợp lệ.');
  return e;
}
export function saveVidFormat(S, id, patch) {
  ensureShortVid(S);
  const old = id ? byId(S.vidFormats, id) : null; if (id && !old) return { ok: false, error: 'Không thấy Format.' };
  const f = Object.assign({}, old || { active: true, skills: [], activeSkillId: '', basis: '' }, patch || {});
  f.name = String(f.name || '').trim(); f.structure = (f.structure || []).map(x => String(x).trim()).filter(Boolean); f.guideMd = String(f.guideMd || ''); f.needs = f.needs || '';
  const e = validateVidFormat(S, f, id); if (e.length) return { ok: false, error: e.join(' ') };
  if (old) { Object.assign(old, f); log(S, 'vid-format', 'vidFormat', old.id, 'sửa'); return { ok: true, format: old }; }
  let k = S.vidFormats.length + 1; while (S.vidFormats.some(x => x.id === `vf-${k}`)) k++;
  f.id = `vf-${k}`; f.key = f.key || f.id; S.vidFormats.push(f); log(S, 'vid-format', 'vidFormat', f.id, 'thêm');
  return { ok: true, format: f };
}
export function toggleVidFormat(S, id) {
  const f = byId(S.vidFormats || [], id); if (!f) return { ok: false, error: 'Không thấy Format.' };
  if (f.active !== false && vidFormatsOf(S).length <= 1) return { ok: false, error: 'Cần giữ ít nhất một Format đang bật.' };
  f.active = f.active === false; return { ok: true, active: f.active };
}
export function deleteVidFormat(S, id) {
  const f = byId(S.vidFormats || [], id); if (!f) return { ok: false, error: 'Không thấy Format.' };
  if (vidFormatsOf(S).filter(x => x.id !== id).length < 1) return { ok: false, error: 'Cần giữ ít nhất một Format đang bật.' };
  const used = (S.videos || []).filter(v => v.formatId === id).length;
  S.vidFormats = S.vidFormats.filter(x => x.id !== id); log(S, 'vid-format', 'vidFormat', id, 'xóa');
  return { ok: true, used };
}
export function resetVidFormats(S) { S.vidFormats = defaultVidFormats(); return { ok: true }; }

// ---- Topic cho video: dùng chung kho Topic của tuần (Matrix) + chủ đề chỉ cho video ----
export function vidTopicRow(S, id) { return byId(S.topics, id) || byId(S.vidTopics || [], id) || null; }
// ---- Hàng của bảng (mục 10.85): người dùng tự thêm; hàng trống chỉ có dấu +; chọn Topic từ Matrix hoặc nạp Topic ngoài (Khác); chưa chọn Topic thì dấu + ở ô tạo Vid tự do ----
export const VID_MAX_ROWS = 12;
const gridRows = (S, weekId) => (S.vidRows || []).filter(r => r.weekId === weekId);
function newGridRow(S, weekId, topicId) {
  let k = S.vidRows.length + 1; while (S.vidRows.some(r => r.id === `vr-${k}`)) k++;
  const r = { id: `vr-${k}`, weekId, topicId: topicId || null }; S.vidRows.push(r); return r;
}
// Hàng của tuần (luôn có ít nhất một hàng); t = null nếu hàng trống
export function vidGridOf(S, weekId) {
  ensureShortVid(S);
  gridRows(S, weekId).forEach(g => { if (g.topicId && !vidTopicRow(S, g.topicId)) g.topicId = null; });
  if (!gridRows(S, weekId).length) newGridRow(S, weekId);
  return gridRows(S, weekId).map(g => { const row = g.topicId ? vidTopicRow(S, g.topicId) : null; const v = row && topicCurrent(row); return { id: g.id, t: v ? { row, v, videoOnly: !byId(S.topics, row.id) } : null }; });
}
export const vidTopicsOf = (S, weekId) => vidGridOf(S, weekId).filter(g => g.t).map(g => g.t);
// Thẻ mới của Topic nào thì Topic đó phải có hàng: dùng hàng trống đầu tiên, không có thì thêm hàng
export function attachVidRow(S, weekId, topicId, gridId) {
  ensureShortVid(S); if (gridRows(S, weekId).some(g => g.topicId === topicId)) return;
  const g = (gridId && gridRows(S, weekId).find(x => x.id === gridId && !x.topicId)) || gridRows(S, weekId).find(x => !x.topicId);
  if (g) g.topicId = topicId; else newGridRow(S, weekId, topicId);
}
export function vidTopicChoices(S, weekId) {
  const used = new Set(gridRows(S, weekId).map(g => g.topicId));
  return topicsOf(S, weekId).filter(r => !used.has(r.id)).map(r => { const v = topicCurrent(r); return { id: r.id, order: r.order, title: v.title, words: v.words }; });
}
export function setRowTopic(S, weekId, gridId, topicId) {
  vidGridOf(S, weekId); const g = gridRows(S, weekId).find(x => x.id === gridId);
  if (!g) return { ok: false, error: 'Không thấy hàng.' }; if (g.topicId) return { ok: false, error: 'Hàng này đã có Topic.' };
  if (!vidTopicChoices(S, weekId).some(c => c.id === topicId)) return { ok: false, error: 'Topic không có trong tuần hoặc đã nằm ở hàng khác.' };
  g.topicId = topicId; log(S, 'vid-row', 'topic', topicId, 'chọn Topic cho hàng'); return { ok: true };
}
export function addVidRow(S, weekId) {
  const rows = vidGridOf(S, weekId); if (rows.length >= VID_MAX_ROWS) return { ok: false, error: `Tối đa ${VID_MAX_ROWS} hàng.` };
  return { ok: true, row: newGridRow(S, weekId) };
}
// Bỏ hàng: Topic của Matrix chỉ rời bảng (vẫn ở Matrix); chủ đề nạp riêng bị xóa cùng thẻ; hàng tự do chỉ bỏ khi chưa có thẻ
export function removeVidRow(S, weekId, gridId) {
  vidGridOf(S, weekId); const g = gridRows(S, weekId).find(x => x.id === gridId); if (!g) return { ok: false, error: 'Không thấy hàng.' };
  const id = g.topicId;
  if (id) {
    const row = vidTopicRow(S, id);
    if (row && row.free) { if (S.videos.some(v => v.topicId === id)) return { ok: false, error: 'Hàng Vid tự do còn thẻ. Hủy hoặc xóa từng thẻ trước.' }; S.vidTopics = S.vidTopics.filter(x => x.id !== id); }
    else if (row && !byId(S.topics, id)) return removeVidTopic(S, id);
    else {
      if (S.videos.some(v => v.topicId === id && v.status !== 'IDEA')) return { ok: false, error: 'Topic đã có thẻ Vid đã duyệt. Hủy từng thẻ nếu không dùng.' };
      S.videos = S.videos.filter(v => v.topicId !== id); S.vidAnalyses = S.vidAnalyses.filter(a => a.topicId !== id);
    }
  }
  S.vidRows = S.vidRows.filter(x => x !== g); log(S, 'vid-row', 'week', weekId, 'bỏ hàng'); return { ok: true };
}
export function addVidTopics(S, startDate, md, gridId) {
  ensureShortVid(S);
  const n = normalizeTopicMd(S, md); const r = parseTopics(n.md);
  if (r.errors.length) return { ok: false, errors: r.errors };
  const wk = ensureWeek(S, startDate); if (!wk.ok) return { ok: false, errors: [{ text: wk.error }] };
  const w = wk.week; const now = S.settings.demoNow; const have = vidTopicsOf(S, w.id).concat(topicsOf(S, w.id).map(r => ({ v: topicCurrent(r) })));
  const added = [], skipped = [];
  r.topics.forEach(p => {
    if (have.some(h => fold(h.v.title) === fold(p.title) && h.v.text === p.text)) { skipped.push(p.title); return; }
    const order = S.vidTopics.filter(x => x.weekId === w.id).length + 1;
    let k = order; while (S.vidTopics.some(x => x.id === `${w.id}-V${k}`)) k++;
    const row = { id: `${w.id}-V${k}`, weekId: w.id, order, videoOnly: true, currentVersion: 1, versions: [{ n: 1, title: p.title, text: p.text, fields: clone(p.fields || {}), words: p.words, hasCase: p.hasCase, createdAt: now, reason: 'imported' }] };
    S.vidTopics.push(row); added.push(row); attachVidRow(S, w.id, row.id, gridId);
  });
  if (!added.length) return { ok: false, errors: [{ text: 'Mọi chủ đề trong tệp đã có trong tuần, không có gì để thêm.' }] };
  log(S, 'vid-topic', 'week', w.id, `thêm ${added.length} chủ đề cho video`);
  return { ok: true, added, skipped, warnings: r.warnings };
}
export function removeVidTopic(S, id) {
  const row = byId(S.vidTopics || [], id); if (!row) return { ok: false, error: 'Chỉ xóa được chủ đề nạp riêng cho video.' };
  const n = S.videos.filter(v => v.topicId === id).length;
  S.vidTopics = S.vidTopics.filter(x => x.id !== id); S.videos = S.videos.filter(v => v.topicId !== id);
  S.vidAnalyses = S.vidAnalyses.filter(a => a.topicId !== id); S.vidRows = (S.vidRows || []).filter(g => g.topicId !== id);
  log(S, 'vid-topic', 'topic', id, `xóa · ${n} video`);
  return { ok: true, removed: n };
}

// ---- Video ----
export function vidsOf(S, weekId, topicId) {
  return (S.videos || []).filter(v => v.weekId === weekId && (!topicId || v.topicId === topicId)).sort((a, b) => a.order - b.order);
}
// Có S thì xét cả lịch: slot video còn trong lịch → Đã lên lịch; có slot đã đăng → Đã đăng
export function vidState(v, S) {
  if (v.cancelled) return 'CANCELLED';
  const sl = S ? (S.slots || []).filter(s => s.videoId === v.id) : [];
  if (sl.some(s => s.state === 'PUBLISHED')) return 'POSTED';
  if (sl.length) return 'SCHEDULED';
  return v.file ? 'READY' : v.status;
}
export const vidBody = t => String(t || '').split('\n').filter(l => !/^\s*\[[^\]]+\]\s*$/.test(l)).join('\n').replace(/^\s*\[[^\]]+\]\s*/gm, '');
export const vidWords = t => countWords(vidBody(t));
export function vidDuration(S, words) { return Math.round(words / vidSettingsOf(S).wps); }
// Chia kịch bản theo nhãn [Phần]
export function vidSections(text) {
  const out = []; let cur = null;
  String(text || '').split('\n').forEach(line => {
    const m = /^\s*\[([^\]]+)\]\s*(.*)$/.exec(line);
    if (m) { cur = { label: m[1].trim(), text: m[2] || '' }; out.push(cur); return; }
    if (!cur) { cur = { label: '', text: '' }; out.push(cur); }
    cur.text += (cur.text ? '\n' : '') + line;
  });
  return out.map(s => ({ label: s.label, text: s.text.trim() })).filter(s => s.label || s.text);
}
export function vidIssues(S, v) {
  const c = vidSettingsOf(S, v); const out = []; if (!v.script) return out;
  const w = vidWords(v.script);
  if (w < c.wordMin) out.push(`Kịch bản ${w} chữ, ngắn hơn ${c.wordMin} chữ (≈ ${vidDuration(S, w)} giây).`);
  if (w > c.wordMax) out.push(`Kịch bản ${w} chữ, dài hơn ${c.wordMax} chữ (≈ ${vidDuration(S, w)} giây).`);
  if (v.kind === 'bantin') {
    const a = vidSections(v.script)[0]; const aw = a ? countWords(a.text) : 0;
    if (aw && (aw < 12 || aw > 30)) out.push(`Phần người dẫn ${aw} chữ; nên 15–25 chữ.`);
    if (!String(v.prompts && v.prompts.audio || '').trim()) out.push('Bản tin chưa có Prompt Audio cho đoạn giọng máy.');
  }
  return out;
}
export function newVideo(S, weekId, topicId, p) {
  attachVidRow(S, weekId, topicId);
  const order = S.videos.filter(v => v.weekId === weekId).reduce((m, v) => Math.max(m, v.order), 0) + 1;
  return {
    id: `vid-${S.seq++}`, weekId, topicId, order, status: p.status || 'IDEA', cancelled: false,
    insight: { title: String(p.title || '').trim().slice(0, 160), idea: String(p.idea || '').trim().slice(0, 600), reason: String(p.reason || '').trim().slice(0, 400) },
    source: String(p.source || '').trim().slice(0, 1500), formatId: p.formatId, kind: VID_KINDS[p.kind] ? p.kind : 'noihet',
    script: '', prompts: { audio: '', image: '' }, history: [], file: null, slotIds: [], createdAt: S.settings.demoNow, simulated: !!p.simulated,
  };
}
const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const firstSentence = s => splitSentences(s)[0] || String(s || '');

// Đề xuất mô phỏng: tách các ý có trong Topic theo Format đang bật
export function mockInsights(S, weekId, topicId) {
  const row = vidTopicRow(S, topicId); const iv = row && topicCurrent(row);
  if (!iv) return { ok: false, error: 'Không thấy Topic.' };
  const M = topicMaterial(iv); const fm = {}; vidFormatsOf(S).forEach(f => { if (!fm[f.key]) fm[f.key] = f; });
  const out = [];
  const add = (key, title, idea, source, reason) => { const f = fm[key]; if (f) out.push({ formatId: f.id, kind: f.kind, title, idea, source, reason }); };
  M.myths.forEach(([a, b]) => add('ngonhan', `Ngộ nhận: ${short(a, 70)}`, short(b, 200), `Ngộ nhận: ${a}\nThực tế: ${b}`, 'Topic có cặp Ngộ nhận/Thực tế; bác bỏ ngộ nhận giúp người xem nhớ đúng.'));
  M.quiz.forEach(([q, a]) => add('thuthach', `Thử thách: ${short(q, 70)}`, short(a, 200), `Câu hỏi: ${q}\nĐáp án: ${a}`, 'Topic có câu hỏi kèm đáp án; tự kiểm tra giúp nhớ lâu.'));
  const how = M.howItems;
  for (let k = 0; k < how.length && k < 6; k += 3) { const part = how.slice(k, k + 3); if (part.length >= 2 || !k) add('meo', `Mẹo: ${short(part[0], 70)}`, `${part.length} bước làm được ngay.`, part.map((x, i) => `${i + 1}. ${x}`).join('\n'), 'Topic có các bước làm cụ thể; ví dụ mẫu từng bước dễ làm theo.'); }
  const why = M.why.length ? M.why : M.explain;
  for (let k = 0; k < why.length && k < 6; k += 3) add('giaithich', `Vì sao: ${short(why[k], 70)}`, short(why.slice(k, k + 3).join(' '), 240), why.slice(k, k + 3).join(' '), 'Topic có phần giải thích nguyên nhân; video một cơ chế dễ hiểu và dễ chia sẻ.');
  if (iv.hasCase && M.story.length) add('cauchuyen', `Câu chuyện: ${short(M.story[0], 70)}`, short(M.story.slice(0, 3).join(' '), 240), M.story.slice(0, 6).join(' '), 'Topic có trường hợp thật; câu chuyện người thật giữ chú ý.');
  const nums = M.numeric.filter(s => !out.some(o => o.source.includes(s)));
  for (let k = 0; k < nums.length && k < 6; k += 3) { const part = nums.slice(k, k + 3); if (part.length >= 2) add('bantin', `Bản tin: ${short(part[0], 70)}`, short(part.join(' '), 240), part.join(' '), 'Topic có nhiều số liệu/phát hiện; hợp dạng bản tin kiến thức.'); }
  const qs = topicSubsections(iv.text).filter(s => /hoi dap|nguoi xem|binh luan|cau hoi thuong gap|faq/.test(s.key) && s.text);
  qs.forEach(s => add('hoidap', `Hỏi đáp: ${short(firstSentence(s.text), 70)}`, short(s.text, 240), s.text.slice(0, 800), 'Topic có câu hỏi thật của người xem.'));
  if (!out.length) {
    const ss = M.sentences.filter(s => countWords(s) >= 6);
    for (let k = 0; k < ss.length && out.length < 3; k += 4) add('giaithich', `Ý ${out.length + 1}: ${short(ss[k], 70)}`, short(ss.slice(k, k + 4).join(' '), 240), ss.slice(k, k + 4).join(' '), 'Topic chưa có mục chuẩn (Ngộ nhận, Cách làm…); tách theo đoạn.');
  }
  const cap = Math.max(1, Math.min(VID_MAX_PER_TOPIC, Math.round((iv.words || countWords(iv.text)) / 250)));
  const items = out.slice(0, Math.max(cap, Math.min(out.length, 2)));
  // Cân đối kiểu theo tỉ lệ tuần (Bản tin / Người nói): đổi các ý hợp dạng tin (Ngộ nhận, Giải thích) sang Bản tin cho đủ phần
  const mix = vidSettingsOf(S).mix; const want = mix.bantin + mix.noihet ? Math.round(items.length * mix.bantin / (mix.bantin + mix.noihet)) : 0;
  let have = items.filter(i => i.kind === 'bantin').length; let switched = 0;
  ['ngonhan', 'giaithich'].forEach(key => items.forEach(i => { if (have < want && i.kind !== 'bantin' && (byId(S.vidFormats, i.formatId) || {}).key === key) { i.kind = 'bantin'; have++; switched++; } }));
  const byFmt = {}; items.forEach(i => { const f = byId(S.vidFormats, i.formatId); byFmt[f.name] = (byFmt[f.name] || 0) + 1; });
  const reason = `Topic ${iv.words || countWords(iv.text)} chữ, tách được ${out.length} ý độc lập; đề xuất ${items.length} video (${Object.entries(byFmt).map(([k, n]) => `${n} ${k}`).join(', ')}), mỗi video một ý, không dùng chung đoạn căn cứ.${out.length > items.length ? ` Bỏ ${out.length - items.length} ý vì Topic ngắn (khoảng 250 chữ Topic cho một video; tối đa ${VID_MAX_PER_TOPIC} video mỗi Topic).` : ''}${switched ? ` Chuyển ${switched} ý sang kiểu Bản tin theo tỉ lệ ${mix.bantin}/${mix.noihet}.` : ''} (Mô phỏng)`;
  return { ok: true, total: items.length, reason, items, simulated: true };
}
// Lời nhắn AI: phân tích Topic → danh sách Insight (JSON)
export function vidAnalyzeJob(S, weekId, topicId) {
  const row = vidTopicRow(S, topicId); const iv = row && topicCurrent(row); if (!iv) return null;
  const c = vidSettingsOf(S);
  const fl = vidFormatsOf(S).map(f => `- ${f.id}: ${f.name} (kiểu mặc định ${VID_KINDS[f.kind]}; bố cục ${f.structure.join(' → ')}${f.needs ? `; chỉ dùng khi ${VID_NEEDS[f.needs].toLowerCase()}` : ''}). ${f.guideMd}`).join('\n');
  const others = vidsOf(S, weekId).filter(v => v.topicId !== topicId && !v.cancelled).map(v => `- ${v.insight.title}`).join('\n');
  const user = [
    '# Việc: phân tích Topic để lên danh sách video ngắn (mỗi video 60 giây, một ý, tự đứng được)',
    `Đề xuất số video phù hợp với lượng ý thật sự có trong Topic, không cố định số lượng nhưng tối đa ${VID_MAX_PER_TOPIC}; nêu lý do. Mỗi video một Insight khác nhau, có đoạn căn cứ trích nguyên văn từ Topic, không hai video dùng chung đoạn căn cứ. Kịch bản sau này dài ${c.wordMin}–${c.wordMax} chữ, nên mỗi Insight phải đủ chất liệu cho chừng ấy.`,
    `Mục tiêu tuần: ${c.weekTarget} video (${c.mix.bantin} Bản tin, ${c.mix.noihet} Người nói hết); đây là gợi ý cân đối kiểu, không ép số lượng.`,
    `# Format video được dùng\n${fl}`,
    `# Topic: ${iv.title}\n${topicDirection(iv) ? topicDirection(iv) + '\n\n' : ''}${iv.text}`,
    others ? `# Video đã có trong tuần (không lặp ý)\n${others}` : '',
    'Trả lời bằng đúng một khối JSON: {"total": số video, "reason": "lý do chọn số video này", "insights": [{"title": "tiêu đề ngắn", "idea": "ý chính 1–2 câu", "source": "đoạn trích nguyên văn từ Topic", "formatId": "mã Format ở trên", "kind": "bantin hoặc noihet", "reason": "vì sao ý này đáng làm video"}]}',
  ].filter(Boolean).join('\n\n');
  return { key: `vid-analyze:${topicId}`, label: `Phân tích ${iv.title}`, system: aiSystem(S).split('\n\nTrả lời bằng')[0], user };
}
export function parseVidInsights(S, raw) {
  const j = extractJson(raw); const arr = j && Array.isArray(j.insights) ? j.insights : null;
  if (!arr) return { ok: false, error: 'AI không trả về danh sách Insight đọc được.' };
  const fs = vidFormatsOf(S);
  const items = arr.filter(x => x && String(x.title || '').trim()).slice(0, 12).map(x => {
    const f = fs.find(f => f.id === x.formatId) || fs.find(f => fold(f.name) === fold(x.formatId || x.format || '')) || fs[0];
    return { formatId: f.id, kind: VID_KINDS[x.kind] ? x.kind : f.kind, title: String(x.title).trim(), idea: String(x.idea || '').trim(), source: String(x.source || '').trim(), reason: String(x.reason || '').trim() };
  });
  if (!items.length) return { ok: false, error: 'AI không đề xuất video nào.' };
  return { ok: true, total: items.length, reason: String(j.reason || '').trim().slice(0, 600), items, simulated: false };
}
// Áp kết quả phân tích: thay các đề xuất chưa duyệt của Topic, giữ video đã duyệt
export function analyzeTopic(S, weekId, topicId, res) {
  ensureShortVid(S);
  if (!weekOf(S, weekId)) return { ok: false, error: 'Không tìm thấy tuần.' };
  { const row = vidTopicRow(S, topicId); if (row && row.free) return { ok: false, error: 'Hàng Video tự do không đi từ Topic: tạo từng thẻ bằng Tạo Vid tự do.' }; }
  const r = res && res.ok ? res : mockInsights(S, weekId, topicId); if (!r.ok) return r;
  const room = VID_MAX_PER_TOPIC - vidsOf(S, weekId, topicId).filter(v => v.status !== 'IDEA').length;
  if (room <= 0) return { ok: false, error: `Topic đã đủ ${VID_MAX_PER_TOPIC} thẻ Vid. Bỏ hoặc hủy bớt rồi phân tích lại.` };
  const dropped = S.videos.filter(v => v.weekId === weekId && v.topicId === topicId && v.status === 'IDEA').length;
  S.videos = S.videos.filter(v => !(v.weekId === weekId && v.topicId === topicId && v.status === 'IDEA'));
  const vids = r.items.slice(0, room).map(it => { const v = newVideo(S, weekId, topicId, Object.assign({ simulated: r.simulated }, it)); S.videos.push(v); return v; });
  S.vidAnalyses = S.vidAnalyses.filter(a => !(a.weekId === weekId && a.topicId === topicId));
  S.vidAnalyses.push({ weekId, topicId, total: vids.length, reason: r.reason, at: S.settings.demoNow, simulated: !!r.simulated });
  log(S, 'vid-analyze', 'topic', topicId, `${vids.length} đề xuất${r.simulated ? ' (mô phỏng)' : ''}`);
  return { ok: true, count: vids.length, dropped, reason: r.reason, simulated: !!r.simulated, ids: vids.map(v => v.id) };
}
export const vidAnalysisOf = (S, weekId, topicId) => (S.vidAnalyses || []).find(a => a.weekId === weekId && a.topicId === topicId) || null;
export function addVideo(S, weekId, topicId, p) {
  ensureShortVid(S);
  if (!weekOf(S, weekId) || !vidTopicRow(S, topicId)) return { ok: false, error: 'Không thấy tuần hoặc Topic.' };
  if (vidsOf(S, weekId, topicId).length >= VID_MAX_PER_TOPIC) return { ok: false, error: `Topic đã đủ ${VID_MAX_PER_TOPIC} thẻ Vid.` };
  const P = p || {}; const f = byId(S.vidFormats, P.formatId) || vidFormatsOf(S)[0];
  if (!String(P.title || '').trim()) return { ok: false, error: 'Insight cần có tiêu đề.' };
  const v = newVideo(S, weekId, topicId, Object.assign({ kind: f.kind, status: 'TODO' }, P, { formatId: f.id })); S.videos.push(v);
  log(S, 'vid-add', 'video', v.id); return { ok: true, video: v };
}
const vidGet = (S, id) => byId(S.videos || [], id);
export function editInsight(S, id, patch) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  const P = patch || {};
  if (P.title != null && !String(P.title).trim()) return { ok: false, error: 'Insight cần có tiêu đề.' };
  ['title', 'idea', 'reason'].forEach(k => { if (P[k] != null) v.insight[k] = String(P[k]).trim(); });
  if (P.source != null) v.source = String(P.source).trim();
  if (P.formatId != null) { if (!byId(S.vidFormats, P.formatId)) return { ok: false, error: 'Không thấy Format.' }; v.formatId = P.formatId; }
  if (P.kind != null) { if (!VID_KINDS[P.kind]) return { ok: false, error: 'Kiểu không hợp lệ.' }; v.kind = P.kind; }
  return { ok: true, video: v };
}
export function dropIdea(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.status !== 'IDEA') return { ok: false, error: 'Chỉ bỏ được đề xuất chưa duyệt; kịch bản đã duyệt thì bấm Hủy.' };
  S.videos = S.videos.filter(x => x.id !== id); return { ok: true };
}
export function mergeIdeas(S, idA, idB) {
  const a = vidGet(S, idA), b = vidGet(S, idB);
  if (!a || !b || a === b) return { ok: false, error: 'Chọn hai đề xuất khác nhau để gộp.' };
  if (a.status !== 'IDEA' || b.status !== 'IDEA') return { ok: false, error: 'Chỉ gộp được đề xuất chưa duyệt.' };
  if (a.topicId !== b.topicId) return { ok: false, error: 'Chỉ gộp hai đề xuất của cùng Topic.' };
  a.insight.idea = [a.insight.idea, b.insight.idea].filter(Boolean).join(' ');
  a.insight.reason = `Gộp "${short(a.insight.title, 40)}" và "${short(b.insight.title, 40)}". ${a.insight.reason}`.trim();
  a.source = [a.source, b.source].filter(Boolean).join('\n');
  S.videos = S.videos.filter(x => x.id !== idB); return { ok: true, video: a };
}
export function approveIdeas(S, weekId, topicId, ids) { // topicId rỗng: cả tuần
  const list = vidsOf(S, weekId, topicId || null).filter(v => v.status === 'IDEA' && (!ids || ids.includes(v.id)));
  if (!list.length) return { ok: false, error: 'Không có đề xuất nào để duyệt.' };
  list.forEach(v => { v.status = 'TODO'; });
  log(S, 'vid-approve-ideas', 'topic', topicId, `${list.length} Insight`);
  return { ok: true, count: list.length };
}

// ---- Viết kịch bản ----
function pickFill(pool, used, target, max, start) {
  const out = []; let w = start;
  for (const s of pool) {
    if (used.has(s)) continue; const n = countWords(s);
    if (w + n > max) continue;
    out.push(s); used.add(s); w += n; if (w >= target) break;
  }
  return { out, words: w };
}
function mockScript(S, v) {
  if (v.origin && v.origin !== 'topic') return freeMockScript(S, v);
  const c = vidSettingsOf(S, v); const f = byId(S.vidFormats, v.formatId) || vidFormatsOf(S)[0];
  const row = vidTopicRow(S, v.topicId); const iv = row && topicCurrent(row); if (!iv) return null;
  const M = topicMaterial(iv);
  const othersSrc = new Set(); vidsOf(S, v.weekId, v.topicId).filter(x => x.id !== v.id && !x.cancelled).forEach(x => splitSentences(String(x.source || '').replace(/\n/g, ' ')).concat(splitSentences(vidBody(x.script).replace(/\n/g, ' '))).forEach(s => othersSrc.add(s.replace(/^(Thực tế|Đáp án):\s*/i, '').trim())));
  const src = splitSentences(String(v.source || '').replace(/\n/g, ' '));
  const fpool = { giaithich: M.why.concat(M.explain), meo: M.howText.concat(M.howItems.map(x => /[.!?…]$/.test(x) ? x : x + '.')), ngonhan: M.explain.concat(M.why), thuthach: M.explain, cauchuyen: M.story, bantin: M.numeric, hoidap: M.explain.concat(M.why) }[f.key] || [];
  const myth = (/^Ngộ nhận:\s*(.+)$/m.exec(v.source) || [])[1], ques = (/^Câu hỏi:\s*(.+)$/m.exec(v.source) || [])[1];
  const pool = src.concat(fpool, M.sentences).filter(s => !othersSrc.has(s) || src.includes(s)).filter(s => !/^(Ngộ nhận|Câu hỏi):/i.test(s) && s !== myth && s !== ques)
    .map(s => s.replace(/^(Thực tế|Đáp án):\s*/i, '').trim()).filter(s => countWords(s) >= 3);
  const t = (myth || ques || v.insight.title.replace(/^[^:]{2,20}:\s*/, '')).replace(/…$/, '').trim();
  const lc = x => x.replace(/[.?!]$/, '').replace(/^\p{Lu}/u, m => m.toLowerCase());
  const hooks = { giaithich: `Vì sao ${lc(t)}?`, meo: `Mẹo làm được ngay: ${lc(t)}.`, ngonhan: `Bạn có tin rằng ${lc(t)}? Thực tế không hẳn vậy.`, thuthach: `Thử sức 10 giây nhé: ${t}`, cauchuyen: `Chuyện của một học viên: ${lc(t)}.`, bantin: `Tin kiến thức hôm nay: ${lc(t)}.`, hoidap: `Có bạn hỏi: ${t}` };
  const ctas = { thuthach: 'Bình luận đáp án của bạn trước khi xem lời giải nhé.', hoidap: 'Bạn còn câu hỏi nào? Để lại bình luận, mình trả lời ở video sau.' };
  const hook = [c.brand.opener, hooks[f.key] || t].filter(Boolean).join(' ');
  const cta = [ctas[f.key] || 'Lưu video lại và theo dõi kênh để xem phần tiếp theo.', c.brand.closer].filter(Boolean).join(' ');
  const used = new Set();
  if (v.kind === 'bantin') {
    const lead = pickFill(pool, used, 18, 25, countWords(hook));
    const anchor = [hook].concat(lead.words < 15 ? lead.out : []).join(' ');
    if (lead.words >= 15) lead.out.forEach(s => used.delete(s));
    const close = `Ghi nhớ: ${short(v.insight.idea || t, 120).replace(/[.…]?$/, '.')}`; splitSentences(v.insight.idea).forEach(x => used.add(x));
    const fill = pickFill(pool, used, c.wordTarget, c.wordMax, countWords(anchor) + countWords(close) + countWords(cta));
    const body = fill.out.join(' ');
    return { script: `[Người dẫn]\n${anchor}\n\n[Giọng máy]\n${body}\n\n[Chốt]\n${close} ${cta}`, audio: body, image: imagePromptOf(S, v, iv) };
  }
  const mids = f.structure.slice(1, -1); const fixed = countWords(hook) + countWords(cta);
  const fill = pickFill(pool, used, c.wordTarget, c.wordMax, fixed);
  const per = Math.max(1, Math.ceil(fill.out.length / Math.max(1, mids.length)));
  const parts = mids.map((m, i) => `[${m}]\n${fill.out.slice(i * per, (i + 1) * per).join(' ') || '…'}`);
  const script = [`[${f.structure[0]}]\n${hook}`].concat(parts, [`[${f.structure[f.structure.length - 1]}]\n${cta}`]).join('\n\n');
  return { script, audio: '', image: imagePromptOf(S, v, iv) };
}
function imagePromptOf(S, v, iv) {
  const c = vidSettingsOf(S);
  const src = firstSentence(String(v.source || '').replace(/^(Ngộ nhận|Câu hỏi):\s*/i, '')) || v.insight.idea;
  return `Ảnh dọc ${c.ratio} minh hoạ "${short(v.insight.title.replace(/^[^:]{2,20}:\s*/, ''), 80)}" (Topic: ${short(iv.title, 60)}): ${short(src, 140)}${c.brand.visual ? ` ${c.brand.visual}` : ''}`;
}
export function vidScriptJob(S, id) {
  const v = vidGet(S, id); if (!v) return null;
  if (v.origin && v.origin !== 'topic') return freeScriptJob(S, v);
  const c = vidSettingsOf(S, v); const f = byId(S.vidFormats, v.formatId) || vidFormatsOf(S)[0];
  const row = vidTopicRow(S, v.topicId); const iv = row && topicCurrent(row); if (!iv) return null;
  const sk = skillBlock(f, `Chỉ dẫn viết cho Format video "${f.name}"`);
  const layout = v.kind === 'bantin' ? BANTIN_LAYOUT : f.structure;
  const sib = vidsOf(S, v.weekId).filter(x => x.id !== v.id && x.script && !x.cancelled).map(x => `- ${short(firstSentence(vidBody(x.script)), 120)}`).join('\n');
  const mock = mockScript(S, v);
  const user = [
    `# Việc: viết kịch bản video ngắn dọc ${c.ratio}, Format "${f.name}", kiểu ${VID_KINDS[v.kind]}`,
    sk || f.guideMd,
    `Bố cục: ${layout.join(' → ')}. Mỗi phần mở bằng nhãn trong ngoặc vuông trên một dòng riêng, ví dụ "[${layout[0]}]".`,
    `Độ dài lời nói: video ${c.lenSec} giây = ${c.wordMin}–${c.wordMax} chữ, nhắm ${c.wordTarget} chữ (đọc ${c.wps} chữ/giây). Câu ngắn, dễ nói, mở bằng hook trong 3 giây đầu.`,
    v.kind === 'bantin' ? 'Kiểu Bản tin: [Người dẫn] 15–25 chữ do người thật nói; [Giọng máy] là phần tin do giọng máy đọc, đưa nguyên văn phần này vào "audio"; [Chốt] một câu và lời kêu gọi.' : 'Kiểu Người nói hết: một người nói toàn bộ, xưng hô gần gũi.',
    [c.brand.opener ? `Câu mở thương hiệu (dùng ở đầu): ${c.brand.opener}` : '', c.brand.closer ? `Câu chốt/CTA chung (dùng ở cuối): ${c.brand.closer}` : '', c.brand.visual ? `Ghi chú hình ảnh thương hiệu: ${c.brand.visual}` : ''].filter(Boolean).join('\n'),
    `# Insight\nTiêu đề: ${v.insight.title}\nÝ chính: ${v.insight.idea}\nĐoạn căn cứ trong Topic:\n${v.source}`,
    `# Topic: ${iv.title}\n${iv.text}`,
    sib ? `# Câu mở của các video khác trong tuần (đừng mở giống)\n${sib}` : '',
    sk || !mock ? '' : `# Bản nháp máy (chỉ để theo bố cục và độ dài; viết lại hay hơn, không chép)\n${mock.script}`,
    'Chỉ dùng sự thật, số liệu có trong Topic. Trả lời bằng đúng một khối JSON: {"script": "kịch bản có nhãn", "audio": "lời cho giọng máy (để trống nếu không có)", "image": "mô tả hình ảnh minh hoạ, một câu"}',
  ].filter(Boolean).join('\n\n');
  return { key: `vid-script:${v.id}`, label: `${f.name} · ${short(v.insight.title, 40)}`, system: aiSystem(S).split('\n\nTrả lời bằng')[0], user };
}
export function parseVidScript(raw) {
  const j = extractJson(raw);
  const script = j && typeof j.script === 'string' ? j.script : (!j ? String(raw || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '') : '');
  const t = script.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!t) return { ok: false, error: 'AI không trả về kịch bản.' };
  return { ok: true, script: t, audio: j && typeof j.audio === 'string' ? j.audio.trim() : '', image: j && typeof j.image === 'string' ? j.image.trim().slice(0, 600) : '', simulated: false };
}
export function writeVidScript(S, id, res, meta) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy. Bấm Khôi phục trước.' };
  if (v.status === 'IDEA') return { ok: false, error: 'Duyệt danh sách Insight trước khi viết kịch bản.' };
  let r = res && res.ok ? res : null;
  if (!r) { const m = mockScript(S, v); if (!m) return { ok: false, error: 'Không thấy Topic của video.' }; if (m.error) return { ok: false, error: m.error }; r = Object.assign({ simulated: true }, m); }
  const f = byId(S.vidFormats, v.formatId);
  // Tạo Kịch bản = bản mới: bản đang có (kịch bản, Insight, phần biên tập) lùi vào danh sách bản cũ; bản mới chưa có cảnh
  // Mục 10.88: phần biên tập không bị xóa; Biên tập báo "Kịch bản đã đổi" để người dùng chọn Cập nhật hoặc Bỏ qua
  if (v.script) pushVersion(v);
  v.script = r.script; v.prompts = { audio: r.audio || (v.kind === 'bantin' ? ((vidSections(r.script).find(s => /máy/i.test(s.label)) || {}).text || '') : ''), image: r.image || '' };
  v.status = 'DRAFT'; v.writtenAt = S.settings.demoNow; v.simulated = !!r.simulated; v.topicVer = vidTopicVer(S, v);
  v.ai = r.simulated ? null : Object.assign({ provider: (meta || {}).provider || '', model: (meta || {}).model || '' }, f && skillRefOf(f) ? { skill: skillRefOf(f) } : {});
  log(S, 'vid-script', 'video', id, r.simulated ? 'mô phỏng' : 'AI');
  return { ok: true, video: v, words: vidWords(v.script) };
}
export function editVidScript(S, id, patch) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy. Bấm Khôi phục trước.' };
  const P = patch || {};
  if (P.script != null && !String(P.script).trim()) return { ok: false, error: 'Kịch bản đang trống.' };
  const changed = (P.script != null && P.script !== v.script) || (P.audio != null && P.audio !== v.prompts.audio) || (P.image != null && P.image !== v.prompts.image);
  if (!changed) return { ok: true, changed: false };
  if (P.script != null) { v.script = String(P.script).replace(/\r/g, '').trim(); v.edited = true; }
  if (P.audio != null) v.prompts.audio = String(P.audio).trim();
  if (P.image != null) v.prompts.image = String(P.image).trim();
  if (v.status === 'APPROVED' || v.status === 'TODO') v.status = 'DRAFT';
  v.writtenAt = S.settings.demoNow; log(S, 'vid-edit', 'video', id);
  return { ok: true, changed: true };
}
// ---- Phiên bản kịch bản (bản 4, mục 10.77; mục 10.88 tách phần biên tập ra lịch sử riêng): mỗi bản gồm kịch bản và Insight; giữ 5 bản gần nhất (bản đang dùng + 4 bản cũ trong v.history, mới nhất đứng đầu) ----
export const VID_KEEP_VERSIONS = 5;
export function vidVersions(v) {
  const H = v.history = v.history || []; if (!(v.verN > 0)) v.verN = H.length + 1;
  H.forEach((h, i) => { if (!(h.n > 0)) h.n = Math.max(1, v.verN - 1 - i); });
  return H.slice().reverse().concat([{ n: v.verN, current: true, script: v.script, prompts: v.prompts, insight: v.insight, at: v.writtenAt || '', ai: v.ai || null }]);
}
function pushVersion(v) {
  vidVersions(v);
  v.history = [{ n: v.verN, script: v.script, prompts: clone(v.prompts), insight: clone(v.insight), at: v.writtenAt || '', ai: v.ai || null, topicVer: v.topicVer == null ? null : v.topicVer }].concat(v.history).slice(0, VID_KEEP_VERSIONS - 1);
  v.verN = Math.max(v.verN, ...v.history.map(h => h.n)) + 1;
}
// Dùng một bản cũ: chép bản đó thành bản mới nhất (bản đang dùng lùi vào danh sách bản cũ)
export function useVidVersion(S, id, n) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' }; if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy. Bấm Khôi phục trước.' };
  vidVersions(v); const h = v.history.find(x => x.n === Number(n)); if (!h) return { ok: false, error: 'Không thấy bản này.' };
  const src = clone(h); pushVersion(v);
  v.script = src.script || ''; v.prompts = src.prompts || { audio: '', image: '' }; if (src.insight) v.insight = Object.assign({}, v.insight, src.insight); v.ai = src.ai || null; v.topicVer = src.topicVer == null ? null : src.topicVer;
  v.status = 'DRAFT'; v.writtenAt = S.settings.demoNow; log(S, 'vid-version', 'video', id, `từ bản ${h.n}`);
  return { ok: true, n: v.verN, from: h.n };
}
// ---- Khóa kịch bản (mục 10.88): khóa = trạng thái Đã duyệt. Biên tập, Hoàn thành, Ren chỉ làm khi kịch bản đã khóa ----
export const SCRIPT_LOCK_MSG = 'Vui lòng khóa Kịch bản trước khi biên tập.';
export const scriptOpen = v => !!(v && String(v.script || '').trim() && v.status !== 'APPROVED');
export function unlockVidScript(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' }; if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy.' };
  if (v.status !== 'APPROVED') return { ok: true, changed: false };
  v.status = 'DRAFT'; log(S, 'vid-unlock', 'video', id); return { ok: true, changed: true };
}
// Phiên bản Topic lúc viết kịch bản; Topic đổi sau đó thì thẻ báo "Topic đã đổi"
export function vidTopicVer(S, v) { if (v.origin && v.origin !== 'topic') return null; const row = byId(S.topics || [], v.topicId); return row && row.currentVersion != null ? row.currentVersion : null; }
export function vidTopicChanged(S, v) {
  if (!v || v.topicVer == null || !v.script) return null; const now = vidTopicVer(S, v);
  return now != null && now !== v.topicVer ? { from: v.topicVer, to: now } : null;
}
// ---- Lịch sử biên tập (mục 10.88): giữ 5 bản, chụp trước khi chia lại cảnh, đổi mẫu dựng, dùng bản cũ, và lúc Ren ----
export const EDIT_KEEP = 5;
const normScript = t => String(t || '').replace(/\s+/g, ' ').trim();
export function snapEdit(S, v, why) {
  const ed = v && v.edit; if (!ed || !(ed.scenes || []).length) return null;
  const H = v.editHist = v.editHist || []; const j = JSON.stringify(ed);
  if (H[0] && JSON.stringify(H[0].edit) === j) return H[0];
  const n = (v.editN = Math.max(v.editN || 0, ...H.map(h => h.n)) + 1);
  const h = { n, edit: JSON.parse(j), at: S.settings.demoNow, why: String(why || '') }; v.editHist = [h].concat(H).slice(0, EDIT_KEEP); return h;
}
export const editVersions = v => (v && v.editHist) || [];
export function useEditVersion(S, id, n) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' }; if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  if (scriptOpen(v)) return { ok: false, error: SCRIPT_LOCK_MSG };
  const h = editVersions(v).find(x => x.n === Number(n)); if (!h) return { ok: false, error: 'Không thấy bản biên tập này.' };
  const src = clone(h.edit); snapEdit(S, v, `Trước khi dùng lại bản ${h.n}`); v.edit = migrateEdit(src); log(S, 'vid-edit-version', 'video', id, `từ bản ${h.n}`);
  return { ok: true, from: h.n };
}
// Kịch bản đã đổi sau khi chia cảnh (và người dùng chưa bấm Bỏ qua cho đúng bản này)
export function scriptChanged(v) {
  const ed = v && v.edit; if (!ed || !(ed.scenes || []).length || ed.splitFrom == null) return false;
  const cur = normScript(v.script); return cur !== normScript(ed.splitFrom) && cur !== normScript(ed.splitAck);
}
export function ackScriptChange(S, id) { const v = vidGet(S, id); if (!v || !v.edit) return { ok: false, error: 'Chưa có phần biên tập.' }; v.edit.splitAck = v.script || ''; log(S, 'vid-split-ack', 'video', id); return { ok: true }; }
// Xong khâu nào khóa khâu đó (mục 10.89): Biên tập bật khi Kịch bản đã khóa; Xếp Slot bật khi đã có video (Ren hoặc Up)
export function vidStageGate(v) {
  const has = !!String((v && v.script) || '').trim(); const idea = !v || v.status === 'IDEA'; const off = !v || v.cancelled; const mix = v && v.origin === 'mix';
  const src = has || ((v && v.media) || []).length > 0 || !!(v && v.edit && (v.edit.scenes || []).length);
  const bt = idea ? 'Duyệt Insight trước' : off ? 'Thẻ đã hủy' : mix && !has ? 'Nạp nguyên liệu rồi Dựng nhanh hoặc lập Dàn ý' : !src ? 'Chưa có kịch bản hoặc tệp nguồn' : scriptOpen(v) ? 'Khóa Kịch bản (xong Phân cảnh) trước khi biên tập' : '';
  const sl = idea ? 'Duyệt Insight trước' : off ? 'Thẻ đã hủy' : !v.file ? 'Cần Ren Vid hoặc Up video trước' : '';
  return { bt: { ok: !bt, why: bt }, sl: { ok: !sl, why: sl } };
}
// Biên tập đã Hoàn thành = khóa; Mở khóa để sửa tiếp (video đã ren thành lỗi thời khi biên tập đổi)
export const editLocked = v => !!(v && v.edit && v.edit.doneAt);
export function unlockEdit(S, id) {
  const v = vidGet(S, id); if (!v || !v.edit) return { ok: false, error: 'Chưa có phần biên tập.' }; if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  if (!v.edit.doneAt) return { ok: true, changed: false };
  v.edit.doneAt = null; log(S, 'vid-edit-unlock', 'video', id); return { ok: true, changed: true };
}
export function approveVidScript(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy.' };
  if (!String(v.script || '').trim()) return { ok: false, error: 'Chưa có kịch bản để duyệt.' };
  v.status = 'APPROVED'; log(S, 'vid-approve', 'video', id); return { ok: true };
}
export function toggleVidCancel(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.status === 'IDEA') return { ok: false, error: 'Đề xuất chưa duyệt thì bấm Bỏ, không cần Hủy.' };
  v.cancelled = !v.cancelled; log(S, v.cancelled ? 'vid-cancel' : 'vid-restore', 'video', id);
  return { ok: true, cancelled: v.cancelled };
}

// ---- Ô Video: tệp thành phẩm, bìa, phụ đề ----
export function setVidFile(S, id, file) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy video.' };
  if (v.cancelled) return { ok: false, error: 'Kịch bản đã hủy, không cần nộp video.' };
  if (v.status === 'IDEA') return { ok: false, error: 'Duyệt Insight trước khi tải video.' };
  if (!file) { v.file = null; log(S, 'vid-file', 'video', id, 'bỏ tệp'); return { ok: true }; }
  if (!/^data:video\//.test(String(file.src || ''))) return { ok: false, error: 'Tệp không phải video (MP4, WebM, MOV).' };
  v.file = { kind: 'video', src: file.src, name: String(file.name || 'video').slice(0, 120), size: Number(file.size) || 0, at: S.settings.demoNow };
  log(S, 'vid-file', 'video', id, v.file.name); return { ok: true };
}
export function setVidCover(S, id, cover) {
  const v = vidGet(S, id); if (!v || !v.file) return { ok: false, error: 'Chưa có video.' };
  if (!cover) { delete v.file.cover; return { ok: true }; }
  if (!/^data:image\/(png|jpeg|webp);/.test(cover.src || '')) return { ok: false, error: 'Ảnh bìa không hợp lệ.' };
  v.file.cover = { src: cover.src, t: cover.t != null ? Math.max(0, Math.round(Number(cover.t) * 10) / 10) : null, at: S.settings.demoNow };
  log(S, 'video-cover', 'video', id); return { ok: true };
}
export function setVidSubs(S, id, cues, source) {
  const v = vidGet(S, id); if (!v || !v.file) return { ok: false, error: 'Chưa có video.' };
  if (!cues) { delete v.file.subs; return { ok: true }; }
  const c = normCues(cues); const e = validateCues(c); if (e) return { ok: false, error: e };
  v.file.subs = { cues: c, source: ['script', 'file', 'api', 'manual'].includes(source) ? source : 'manual', lang: 'vi', at: S.settings.demoNow };
  log(S, 'video-subs', 'video', id, `${c.length} dòng`); return { ok: true, count: c.length };
}

// ---- Kiểm trùng trong tuần: cùng đoạn căn cứ, câu mở/câu chốt giống nhau ----
const runs = (s, n) => { const t = fold(s).replace(/\s+/g, ' ').trim(); const out = new Set(); for (let i = 0; i + n <= t.length; i += 10) out.add(t.slice(i, i + n)); return { t, out }; };
const overlaps = (a, b, n = 40) => { const A = runs(a, n), B = fold(b).replace(/\s+/g, ' ').trim(); if (A.t.length < n || B.length < n) return A.t && A.t === B; for (const x of A.out) if (B.includes(x)) return true; return false; };
const lastSentence = s => { const a = splitSentences(s); return a[a.length - 1] || ''; };
// Câu chốt: câu đầu của phần [Chốt], không thì câu cuối của phần đứng trước CTA (CTA dùng chung theo khuôn thương hiệu nên không tính)
const CTA_LABEL = /^(cta|mời|kêu gọi)/i;
function closingOf(secs) {
  const ch = secs.find(x => /^chốt/i.test(x.label)); if (ch) return firstSentence(ch.text);
  const body = secs.filter(x => !CTA_LABEL.test(x.label)); return body.length > 1 ? lastSentence(body[body.length - 1].text) : '';
}
export function vidDupes(S, weekId) {
  const list = vidsOf(S, weekId).filter(v => !v.cancelled); const out = {};
  const add = (v, msg) => { (out[v.id] = out[v.id] || []).push(msg); };
  for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) {
    const a = list[i], b = list[k]; const nm = x => `"${short(x.insight.title, 40)}"`;
    if (a.source && b.source && overlaps(a.source, b.source)) { add(a, `Trùng đoạn căn cứ với ${nm(b)}`); add(b, `Trùng đoạn căn cứ với ${nm(a)}`); }
    if (a.script && b.script) {
      const sa = vidSections(a.script), sb = vidSections(b.script);
      const fa = firstSentence((sa[0] || {}).text || ''), fb = firstSentence((sb[0] || {}).text || '');
      if (fa && fb && (fold(fa) === fold(fb) || overlaps(fa, fb))) { add(a, `Câu mở giống ${nm(b)}`); add(b, `Câu mở giống ${nm(a)}`); }
      const la = closingOf(sa), lb = closingOf(sb);
      if (la && lb && fold(la) === fold(lb)) { add(a, `Câu chốt giống ${nm(b)}`); add(b, `Câu chốt giống ${nm(a)}`); }
    }
  }
  return out;
}
// KPI tuần: x/y video có thành phẩm; y = kịch bản đã duyệt Insight, không hủy
export function vidKpi(S, weekId) {
  const c = vidSettingsOf(S); const all = vidsOf(S, weekId);
  const plan = all.filter(v => !v.cancelled && v.status !== 'IDEA');
  const by = k => plan.filter(v => v.kind === k).length;
  return {
    target: c.weekTarget, min: c.weekMin, planned: plan.length, ready: plan.filter(v => v.file).length,
    scripted: plan.filter(v => v.status === 'APPROVED' || v.file).length, ideas: all.filter(v => v.status === 'IDEA').length,
    cancelled: all.filter(v => v.cancelled).length, bantin: by('bantin'), noihet: by('noihet'), mix: c.mix,
  };
}
