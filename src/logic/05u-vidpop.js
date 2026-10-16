// ---------- 05u · Short Vid: popup thẻ Vid bản 1 (mục 10.76): cảnh nhiều hình, VO toàn bài / VO cảnh, co giãn timeline, caption theo timeline, mẫu, Hoàn thành, xếp slot theo ô ----------
import { countWords, addDays } from './01-util.js';
import { byId, deleteSlot, weekOf } from './05-model.js';
import { vidBody, vidSettingsOf } from './05s-shortvid.js';
import { SCENE_FLOOR, VID_CAPTION_MODES, captionChunks, editOf, editTimeline, planEdit, scenePrompt, sceneMin, scheduleGate, scheduleVideo, vidChannels } from './05t-videdit.js';
import { splitSentences } from './01-util.js';

const r1 = x => Math.round(Number(x) * 10) / 10;
const vidGet = (S, id) => byId(S.videos || [], id);
const AUDIO_RE = /^data:audio\//;

// ---- Sóng âm giả (khi chưa đọc được tệp: VO sinh bằng AI mô phỏng, nhạc chưa giải mã) ----
export function voPeaks(seed, n) {
  const a = []; let x = (Number(seed) || 1) * 9301 + 49297;
  for (let i = 0; i < n; i++) { x = (x * 9301 + 49297) % 233280; const r = x / 233280; a.push(Math.round((0.18 + 0.82 * Math.abs(Math.sin(i * 0.55 + seed) * 0.6 + r * 0.4)) * 100)); }
  return a;
}

// ---- Co giãn timeline ----
// Có VO toàn bài: tổng cố định, kéo mép = dời ranh giới giữa cảnh và cảnh sau (rolling). Không có: kéo giãn/co cảnh, các cảnh sau dồn theo (ripple).
export function resizeScene(S, id, sid, nd) {
  const v = vidGet(S, id); const ed = v && v.edit; const i = ed ? ed.scenes.findIndex(x => x.id === sid) : -1; if (i < 0) return { ok: false, error: 'Không thấy cảnh.' };
  const a = ed.scenes[i], b = ed.scenes[i + 1]; const was = a.dur;
  let d = Math.max(sceneMin(ed, a), Math.min(120, Number(nd) || 0));
  if (ed.voAll) {
    if (!b) return { ok: false, error: 'Cảnh cuối không kéo được khi dùng VO toàn bài: kéo mép cảnh trước.' };
    d = Math.min(d, a.dur + b.dur - sceneMin(ed, b)); const tot = a.dur + b.dur; a.dur = r1(d); b.dur = r1(tot - d);
  } else a.dur = r1(d);
  if (a.dur !== was) ed.capStale = true;
  return { ok: true, dur: a.dur, changed: a.dur !== was };
}
export function nudgeScene(S, id, sid, delta) { const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' }; return resizeScene(S, id, sid, sc.dur + Number(delta)); }
// Co/giãn các cảnh cho tổng đúng `target` giây (theo tỉ lệ, không dưới mức tối thiểu của cảnh)
function fitTotal(ed, target) {
  const sum = ed.scenes.reduce((a, s) => a + s.dur, 0); if (!(target > 0) || !(sum > 0)) return;
  ed.scenes.forEach(s => { s.dur = r1(Math.max(sceneMin(ed, s), s.dur * target / sum)); });
  const diff = r1(target - ed.scenes.reduce((a, s) => a + s.dur, 0));
  if (diff > 0) ed.scenes[ed.scenes.length - 1].dur = r1(ed.scenes[ed.scenes.length - 1].dur + diff);
  else if (diff < 0) for (let i = ed.scenes.length - 1, left = -diff; i >= 0 && left > 0; i--) { const room = ed.scenes[i].dur - sceneMin(ed, ed.scenes[i]); const cut = Math.min(room, left); ed.scenes[i].dur = r1(ed.scenes[i].dur - cut); left = r1(left - cut); }
  ed.scenes.forEach(s => { s.defDur = s.dur; });
}
// Hoàn trả: về timeline mặc định (độ dài lúc chia cảnh hoặc lúc đổi mẫu), không dưới mức tối thiểu
export function resetDurations(S, id) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed || !ed.scenes.length) return { ok: false, error: 'Chưa có cảnh.' };
  ed.scenes.forEach(s => { s.dur = r1(Math.max(s.defDur || SCENE_FLOOR, sceneMin(ed, s))); });
  if (ed.voAll && ed.voAll.dur > 0) fitTotal(ed, ed.voAll.dur);
  ed.capStale = true; return { ok: true };
}

// ---- VO toàn bài và VO cảnh ----
// VO toàn bài có tệp (Up hoặc Gen AI) thì VO cảnh bị khóa nhưng dữ liệu vẫn giữ; gỡ VO toàn bài thì VO cảnh dùng lại được.
const voFrom = (v, p, fallbackDur, seed) => {
  if (p.kind !== 'up' && p.kind !== 'ai') return { ok: false, error: 'VO phải là Up hoặc Gen AI.' };
  let src = '', mediaId = '';
  if (p.kind === 'up') {
    if (p.mediaId) { const m = (v.media || []).find(x => x.id === p.mediaId && x.kind === 'audio'); if (!m) return { ok: false, error: 'Không thấy file giọng.' }; mediaId = m.id; }
    else if (AUDIO_RE.test(p.src || '')) src = p.src; else return { ok: false, error: 'VO tải lên phải là tệp audio.' };
  }
  const dur = r1(Number(p.dur) > 0 ? p.dur : fallbackDur); if (!(dur > 0)) return { ok: false, error: 'Chưa đọc được độ dài VO.' };
  const nm = String(p.name || (p.kind === 'ai' ? 'vo-ai.mp3' : 'vo.mp3')).slice(0, 120);
  return { ok: true, vo: Object.assign({ kind: p.kind, name: nm, dur, peaks: Array.isArray(p.peaks) ? p.peaks.slice(0, 400) : p.kind === 'ai' ? voPeaks(seed, 80) : null }, mediaId ? { mediaId } : src ? { src } : { sim: true }) };
};
export function setVoAll(S, id, p) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' }; const ed = editOf(v);
  if (!ed.scenes.length) return { ok: false, error: 'Chia cảnh trước.' };
  const total = editTimeline(v).total; const r = voFrom(v, p || {}, total, 7); if (!r.ok) return r;
  if (r.vo.kind === 'ai') r.vo.dur = total;
  ed.voAll = r.vo; ed.voice = r.vo.kind === 'up' ? (r.vo.mediaId ? { mode: 'file', mediaId: r.vo.mediaId } : { mode: 'file' }) : { mode: 'tts' };
  if (r.vo.kind === 'up') fitTotal(ed, r.vo.dur); else ed.scenes.forEach(s => { s.defDur = s.dur; });
  ed.capStale = true; return { ok: true, vo: ed.voAll };
}
export function clearVoAll(S, id) { const v = vidGet(S, id); if (!v || !v.edit || !v.edit.voAll) return { ok: false, error: 'Chưa có VO toàn bài.' }; v.edit.voAll = null; if (v.edit.voice.mode === 'file') v.edit.voice = { mode: 'tts' }; v.edit.capStale = true; return { ok: true }; }
export function setSceneVo(S, id, sid, p) {
  const v = vidGet(S, id); const ed = v && v.edit; const sc = ed && ed.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  if (ed.voAll) return { ok: false, error: 'Đang dùng VO toàn bài: gỡ VO toàn bài trước khi làm VO cảnh.' };
  const i = ed.scenes.indexOf(sc); const r = voFrom(v, p || {}, r1((sc.defDur || sc.dur) * 0.85), i + 1); if (!r.ok) return r;
  if (r.vo.peaks && r.vo.peaks.length > 120) r.vo.peaks = r.vo.peaks.slice(0, 120);
  sc.vo = r.vo; if (sc.dur < r.vo.dur) sc.dur = r1(Math.ceil(r.vo.dur * 10) / 10); ed.capStale = true; return { ok: true, vo: sc.vo };
}
export function clearSceneVo(S, id, sid) { const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); if (!sc || !sc.vo) return { ok: false, error: 'Cảnh chưa có VO.' }; sc.vo = null; v.edit.capStale = true; return { ok: true }; }
export function setVoPeaks(S, id, target, peaks) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed || !Array.isArray(peaks)) return { ok: false, error: 'Không có dữ liệu sóng âm.' };
  const o = target === 'all' ? ed.voAll : (ed.scenes.find(x => x.id === target) || {}).vo; if (!o) return { ok: false, error: 'Không thấy VO.' };
  o.peaks = peaks.slice(0, 400).map(x => Math.max(0, Math.min(100, Math.round(Number(x) || 0)))); return { ok: true };
}
export const voLocked = v => !!(v && v.edit && v.edit.voAll);

// ---- Caption theo timeline ----
// Chia cụm ≤ 8 chữ (ngắt ở dấu câu khi đủ 6 chữ). Chữ nhấn ý: một cụm từ khoá mỗi câu. Chữ bạn đã sửa tay giữ nguyên khi Gen lại (full = true thì chia lại hết).
function chunkWords(text) {
  const w = String(text || '').split(/\s+/).filter(Boolean); const out = []; let c = [];
  for (const x of w) { c.push(x); if ((c.length >= 6 && /[.,?!…]$/.test(x)) || c.length >= 8) { out.push(c.join(' ')); c = []; } }
  if (c.length) out.push(c.join(' ')); return out;
}
export function genCaptions(S, id, opt) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed) return { ok: false, error: 'Chưa có cảnh.' };
  const full = !!(opt && opt.full); const mode = ed.captions.mode; const old = ed.segs || [];
  if (mode === 'off') { ed.segs = []; ed.capStale = false; return { ok: true, count: 0 }; }
  const res = []; let st = 0;
  ed.scenes.forEach(sc => {
    const mine = old.filter(g => g.sc === sc.id);
    const keep = !full && mine.some(g => g.ed);
    const texts = keep ? mine.map(g => ({ t: g.t, ed: g.ed })) : (mode === 'key' ? captionChunks(sc.text, 1, 'key').map(c => c.text) : chunkWords(sc.text)).map(t => ({ t }));
    const span = ed.voAll ? sc.dur * 0.92 : sc.vo ? Math.min(sc.vo.dur, sc.dur) : sc.dur * 0.92;
    const n = texts.reduce((a, g) => a + countWords(g.t), 0) || 1; let acc = 0;
    texts.forEach(g => { res.push({ t: g.t, sc: sc.id, at: r1(st + acc / n * span), ed: g.ed ? 1 : 0 }); acc += countWords(g.t); });
    st += sc.dur;
  });
  ed.segs = res; ed.capStale = false; return { ok: true, count: res.length };
}
export function editSeg(S, id, i, patch) {
  const v = vidGet(S, id); const ed = v && v.edit; const g = ed && ed.segs && ed.segs[i]; if (!g) return { ok: false, error: 'Không thấy đoạn caption.' };
  if (patch.t != null) { const t = String(patch.t).trim().slice(0, 200); if (!t) return { ok: false, error: 'Đoạn caption không để trống (dùng Gộp để bỏ).' }; g.t = t; g.ed = 1; }
  if (patch.at != null) {
    const tot = editTimeline(v).total; const lo = i ? ed.segs[i - 1].at : 0, hi = i + 1 < ed.segs.length ? ed.segs[i + 1].at : tot;
    g.at = r1(Math.max(lo, Math.min(hi, Number(String(patch.at).replace(',', '.')) || 0))); g.ed = 1;
  }
  return { ok: true };
}
export function splitSeg(S, id, i) {
  const v = vidGet(S, id); const ed = v && v.edit; const g = ed && ed.segs && ed.segs[i]; if (!g) return { ok: false, error: 'Không thấy đoạn caption.' };
  const w = g.t.split(/\s+/); if (w.length < 2) return { ok: false, error: 'Đoạn chỉ có một chữ.' };
  const h = Math.ceil(w.length / 2); const nx = ed.segs[i + 1] ? ed.segs[i + 1].at : editTimeline(v).total;
  ed.segs.splice(i, 1, { t: w.slice(0, h).join(' '), sc: g.sc, at: g.at, ed: 1 }, { t: w.slice(h).join(' '), sc: g.sc, at: r1((g.at + nx) / 2), ed: 1 }); return { ok: true };
}
export function mergeSeg(S, id, i) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed || !ed.segs || i < 1 || !ed.segs[i]) return { ok: false, error: 'Không gộp được.' };
  ed.segs[i - 1].t += ' ' + ed.segs[i].t; ed.segs[i - 1].ed = 1; ed.segs.splice(i, 1); return { ok: true };
}
// Caption hiện ở giây t: theo đoạn đã chia; chưa chia thì chia tạm theo kiểu caption
export function captionAt(v, t) {
  const ed = v && v.edit; if (!ed || !ed.scenes.length || ed.captions.mode === 'off') return '';
  if (ed.segs && ed.segs.length) { let r = ed.segs[0]; for (const g of ed.segs) if (g.at <= t && g.at >= r.at) r = g; return r.t; }
  const tl = editTimeline(v); const it = tl.items.find(x => t < x.t1) || tl.items[tl.items.length - 1]; const ch = captionChunks(it.scene.text, it.scene.dur, ed.captions.mode);
  const c = ch.find(x => t - it.t0 < x.t1) || ch[ch.length - 1]; return c ? c.text : '';
}

// ---- Mẫu dựng theo Format ----
// Mỗi mẫu chia các câu của kịch bản vào vài cảnh theo trọng số, gợi ý hình và chữ phủ; thời lượng theo số chữ.
const keyOf = t => (captionChunks(t, 1, 'key')[0] || {}).text || '';
export const VID_TEMPLATES = {
  script: { name: 'Theo kịch bản (tự chia)', hint: 'Mỗi phần có nhãn trong kịch bản thành một hay vài cảnh.' },
  hoidap: { name: 'Hỏi đáp 3 bước', w: [2, 1, 2, 2], hints: ['Người nói, cận mặt', 'B-roll minh họa vấn đề', 'Biểu đồ hoặc sơ đồ đơn giản', 'Người nói, chốt việc làm ngay'], overlays: () => ['', 'Vấn đề', 'Giải đáp', 'Làm ngay'] },
  chunhan: { name: 'Chữ nhấn ý', w: [2, 2, 1, 2], hints: ['Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn'], overlays: ts => ts.map(keyOf) },
  nguoinoi: { name: 'Người nói + b-roll', w: [1, 2, 1, 2, 1], hints: ['Người nói, cận mặt', 'B-roll minh họa ý đầu', 'Người nói, nhấn ý chính', 'B-roll minh họa cách làm', 'Người nói, chốt'], overlays: ts => ['', '', keyOf(ts[2]), '', 'Làm ngay'] },
};
// Gợi ý theo Format: giải thích → hỏi đáp, mẹo → chữ nhấn ý, còn lại → người nói + b-roll
export function suggestTemplate(S, v) {
  const f = (S.vidFormats || []).find(x => x.id === v.formatId); const k = f ? f.key || f.id : '';
  return /giaithich|hoidap|ngoxnhan|ngonhan/.test(k) ? 'hoidap' : /meo|thuthach/.test(k) ? 'chunhan' : 'nguoinoi';
}
export function applyTemplate(S, id, key) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const T = VID_TEMPLATES[key]; if (!T) return { ok: false, error: 'Mẫu không hợp lệ.' };
  if (key === 'script') { const ed0 = editOf(v); const keepAll = ed0.voAll; const r = planEdit(S, id); if (r.ok && keepAll && !v.edit.voAll) { /* planEdit giữ VO toàn bài còn tệp */ } return r.ok ? Object.assign(r, { template: key }) : r; }
  const ss = splitSentences(vidBody(v.script).replace(/\n+/g, ' ')); if (ss.length < 3) return { ok: false, error: 'Kịch bản quá ngắn để chia theo mẫu (cần ít nhất 3 câu).' };
  const ed = editOf(v); const c = vidSettingsOf(S);
  const k = Math.min(T.w.length, ss.length); const W = T.w.slice(0, k); const sum = W.reduce((a, x) => a + x, 0);
  const cuts = []; let acc = 0; W.forEach((x, i) => { acc += x; cuts.push(i === k - 1 ? ss.length : Math.max((cuts[i - 1] || 0) + 1, Math.min(ss.length - (k - 1 - i), Math.round(ss.length * acc / sum)))); });
  const texts = cuts.map((e, i) => ss.slice(i ? cuts[i - 1] : 0, e).join(' '));
  const ov = T.overlays(texts);
  ed.seq = ed.seq || 1;
  ed.scenes = texts.map((t, i) => { const d = Math.max(SCENE_FLOOR, r1(countWords(t) / c.wps)); return { id: `sc${ed.seq++}`, label: `Cảnh ${i + 1}`, text: t, dur: d, defDur: d, items: [], prompt: T.hints[i] || scenePrompt(S, v, t), overlay: ov[i] || '', fit: 'fill', vol: 100, vo: null, ph: false }; });
  if (ed.voAll && ed.voAll.dur > 0 && ed.voAll.kind === 'up') fitTotal(ed, ed.voAll.dur);
  ed.tpl = key; ed.segs = null; ed.capStale = true; ed.doneAt = null; ed.plannedAt = S.settings.demoNow;
  return { ok: true, count: ed.scenes.length, template: key };
}

// ---- Hoàn thành biên tập ----
export function editBlockers(v) { const ed = v && v.edit; return ed ? ed.scenes.map((s, i) => ({ i, id: s.id })).filter(x => !ed.scenes[x.i].items.length && !ed.scenes[x.i].ph) : []; }
export function completeEdit(S, id) {
  const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' }; if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  const ed = v.edit; if (!ed || !ed.scenes.length) return { ok: false, error: 'Chưa có cảnh để hoàn thành.' };
  const bl = editBlockers(v); if (bl.length) return { ok: false, error: `Cảnh ${bl.map(x => x.i + 1).join(', ')} chưa có hình: Up hình hoặc chọn Dùng thẻ giữ chỗ.` };
  ed.doneAt = S.settings.demoNow; return { ok: true };
}
export const vidEditDone = v => !!(v && (v.file || (v.edit && v.edit.doneAt)));
export function setEditMode(S, id, mode) { const v = vidGet(S, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' }; if (mode !== 'in' && mode !== 'out') return { ok: false, error: 'Chế độ biên tập không hợp lệ.' }; v.editMode = mode; return { ok: true }; }
export const editModeOf = v => v.editMode || (v.file && !(v.edit && v.edit.scenes.length) ? 'out' : 'in');

// ---- Xếp slot theo ô (Thứ × Kênh) ----
export function weekDays(S, weekId) { const w = weekOf(S, weekId); return w ? Array.from({ length: 7 }, (_, i) => addDays(w.startDate, i)) : []; }
// Ô đã có video khác: khóa
export function busyCells(S, weekId, vidId) {
  const m = {}; (S.slots || []).filter(s => s.weekId === weekId && s.videoId && s.videoId !== vidId).forEach(s => { m[`${s.date}|${s.channelId}`] = s.videoId; }); return m;
}
// Mỗi kênh tối đa một slot cho một video; chọn ô khác trên cùng kênh là đổi ngày
export function scheduleCells(S, vidId, p) {
  const g = scheduleGate(S, vidId); if (!g.ok) return g; const v = g.video; const P = p || {};
  const chIds = new Set(vidChannels(S).map(x => x.channel.id)); const byDate = {}; const seenCh = new Set();
  for (const c of P.cells || []) {
    if (!chIds.has(c.channelId)) return { ok: false, error: 'Kênh không phải kênh video ngắn.' };
    if (seenCh.has(c.channelId)) return { ok: false, error: 'Mỗi kênh một ngày cho mỗi video.' }; seenCh.add(c.channelId);
    (byDate[c.date] = byDate[c.date] || []).push(c.channelId);
  }
  if (!Object.keys(byDate).length) return { ok: false, error: 'Chọn ít nhất một ô ngày × kênh.' };
  const made = [], skipped = [];
  for (const date of Object.keys(byDate).sort()) {
    const r = scheduleVideo(S, vidId, { date, time: P.time, channelIds: byDate[date], captions: P.captions });
    if (!r.ok) { made.forEach(s => deleteSlot(S, s.id)); return r; }
    made.push(...r.slots); skipped.push(...r.skipped);
  }
  return { ok: true, slots: made, skipped };
}
