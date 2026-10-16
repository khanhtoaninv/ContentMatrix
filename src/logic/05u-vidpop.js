// ---------- 05u · Short Vid: popup thẻ Vid (bản 1 mục 10.76, bản 4 mục 10.77): cảnh nhiều hình, độ dài từng hình, VO toàn bài / VO cảnh, co giãn timeline, caption theo timeline, cue, mẫu, Hoàn thành, xếp slot theo ô ----------
import { countWords, addDays } from './01-util.js';
import { byId, deleteSlot, weekOf } from './05-model.js';
import { vidBody, vidSettingsOf } from './05s-shortvid.js';
import { ITEM_MIN, SCENE_FLOOR, VID_CAPTION_MODES, captionChunks, cueTime, editOf, editTimeline, evenSplit, planEdit, sceneWordTimes, sceneWords, scenePrompt, sceneMin, scheduleGate, scheduleVideo, setSceneDur, vidChannels } from './05t-videdit.js';
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
    const tot = r1(a.dur + b.dur); d = Math.min(d, tot - sceneMin(ed, b)); setSceneDur(ed, a, d); setSceneDur(ed, b, r1(tot - a.dur));
  } else setSceneDur(ed, a, d);
  if (a.dur !== was) ed.capStale = true;
  return { ok: true, dur: a.dur, changed: a.dur !== was };
}
// Kéo vạch giữa hình k và k+1: không có VO toàn bài thì chỉ hình k đổi (cảnh dài/ngắn theo, không dưới VO); có VO toàn bài thì dời ranh giới hai hình (cảnh không đổi)
export function resizeItem(S, id, sid, k, nd) {
  const v = vidGet(S, id); const ed = v && v.edit; const sc = ed && ed.scenes.find(x => x.id === sid); const it = sc && sc.items[k]; if (!it) return { ok: false, error: 'Không thấy hình.' };
  const was = it.d; let d = Number(nd) || 0;
  if (ed.voAll) { const nx = sc.items[k + 1]; if (!nx) return { ok: false, error: 'Hình cuối: kéo mép cảnh.' }; const tot = r1(it.d + nx.d); d = Math.max(ITEM_MIN, Math.min(tot - ITEM_MIN, d)); it.d = r1(d); nx.d = r1(tot - it.d); }
  else { const other = sc.items.reduce((a, x, j) => a + (j === k ? 0 : x.d), 0); const vo = sc.vo ? Math.ceil(sc.vo.dur * 10) / 10 : 0; d = Math.max(ITEM_MIN, vo - other, SCENE_FLOOR - other, Math.min(60, d)); it.d = r1(d); }
  sc.dur = r1(sc.items.reduce((a, x) => a + x.d, 0)); if (it.d !== was) ed.capStale = true;
  return { ok: true, d: it.d, changed: it.d !== was };
}
export function nudgeScene(S, id, sid, delta) { const v = vidGet(S, id); const sc = v && v.edit && v.edit.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' }; return resizeScene(S, id, sid, sc.dur + Number(delta)); }
// Co/giãn các cảnh cho tổng đúng `target` giây (theo tỉ lệ, không dưới mức tối thiểu của cảnh)
function fitTotal(ed, target) {
  const sum = ed.scenes.reduce((a, s) => a + s.dur, 0); if (!(target > 0) || !(sum > 0)) return;
  ed.scenes.forEach(s => { s.dur = r1(Math.max(sceneMin(ed, s), s.dur * target / sum)); });
  const diff = r1(target - ed.scenes.reduce((a, s) => a + s.dur, 0));
  if (diff > 0) ed.scenes[ed.scenes.length - 1].dur = r1(ed.scenes[ed.scenes.length - 1].dur + diff);
  else if (diff < 0) for (let i = ed.scenes.length - 1, left = -diff; i >= 0 && left > 0; i--) { const room = ed.scenes[i].dur - sceneMin(ed, ed.scenes[i]); const cut = Math.min(room, left); ed.scenes[i].dur = r1(ed.scenes[i].dur - cut); left = r1(left - cut); }
  ed.scenes.forEach(s => { if (s.items.length) { const d = s.dur; s.items.forEach(it => { it.d = it.d || 1; }); setSceneDur(ed, s, d); } s.defDur = s.dur; });
}
// Hoàn trả: về timeline mặc định (độ dài lúc chia cảnh hoặc lúc đổi mẫu), không dưới mức tối thiểu
export function resetDurations(S, id) {
  const v = vidGet(S, id); const ed = v && v.edit; if (!ed || !ed.scenes.length) return { ok: false, error: 'Chưa có cảnh.' };
  ed.scenes.forEach(s => { const d = r1(Math.max(s.defDur || SCENE_FLOOR, sceneMin(ed, s))); if (s.items.length) evenSplit(s, d); else s.dur = d; });
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
  // Mặc định tổng độ dài các hình = VO (cảnh co/giãn đúng bằng VO, trừ khi số hình × 1 giây dài hơn)
  sc.vo = r.vo; setSceneDur(ed, sc, Math.ceil(r.vo.dur * 10) / 10); ed.capStale = true; return { ok: true, vo: sc.vo };
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
    const n = texts.reduce((a, g) => a + countWords(g.t), 0) || 1; let acc = 0; const tw = mode === 'key' ? null : sceneWordTimes(ed, ed.scenes.indexOf(sc));
    texts.forEach(g => { res.push({ t: g.t, sc: sc.id, at: tw && tw[acc] ? r1(tw[acc].s) : r1(st + acc / n * span), ed: g.ed ? 1 : 0 }); acc += countWords(g.t); });
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
export const VID_TEMPLATES = {
  script: { name: 'Theo kịch bản (tự chia)', hint: 'Mỗi phần có nhãn trong kịch bản thành một hay vài cảnh.' },
  hoidap: { name: 'Hỏi đáp 3 bước', w: [2, 1, 2, 2], hints: ['Người nói, cận mặt', 'B-roll minh họa vấn đề', 'Biểu đồ hoặc sơ đồ đơn giản', 'Người nói, chốt việc làm ngay'] },
  chunhan: { name: 'Chữ nhấn ý', w: [2, 2, 1, 2], hints: ['Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn', 'Nền đơn sắc, chữ lớn'] },
  nguoinoi: { name: 'Người nói + b-roll', w: [1, 2, 1, 2, 1], hints: ['Người nói, cận mặt', 'B-roll minh họa ý đầu', 'Người nói, nhấn ý chính', 'B-roll minh họa cách làm', 'Người nói, chốt'] },
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
  ed.seq = ed.seq || 1;
  ed.scenes = texts.map((t, i) => { const d = Math.max(SCENE_FLOOR, r1(countWords(t) / c.wps)); return { id: `sc${ed.seq++}`, label: `Cảnh ${i + 1}`, text: t, dur: d, defDur: d, items: [], prompt: T.hints[i] || scenePrompt(S, v, t), fit: 'fill', vol: 100, vo: null, ph: false }; });
  if (ed.voAll && ed.voAll.dur > 0 && ed.voAll.kind === 'up') fitTotal(ed, ed.voAll.dur);
  ed.tpl = key; ed.segs = null; ed.capStale = true; ed.doneAt = null; ed.plannedAt = S.settings.demoNow; ed.cues = []; ed.splitFrom = v.script || '';
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

// ---- Cue (bản 4, mục 10.77): mỗi cue bám một từ trong lời cảnh; Icon / Text / SFX hiện hoặc phát ở giây của từ đó trong VO ----
// Kho mẫu: icon là emoji (bản thật dùng bộ Lucide/Fluent Emoji), SFX tổng hợp bằng âm thanh trình duyệt (bản thật dùng tệp có giấy phép Pixabay/Mixkit)
export const VID_ICONS = [['🔥', 'lửa nóng hot'], ['💡', 'ý tưởng bóng đèn mẹo'], ['✅', 'đúng đồng ý ok'], ['❌', 'sai không'], ['⚠️', 'cảnh báo chú ý'], ['❓', 'hỏi câu hỏi'], ['❗', 'chú ý quan trọng'], ['⏰', 'đồng hồ báo thức giờ'], ['⏱️', 'bấm giờ hẹn giờ phút'], ['📚', 'sách học'],
  ['🧠', 'não trí nhớ tập trung'], ['😴', 'buồn ngủ mệt'], ['😮', 'bất ngờ wow'], ['🤔', 'suy nghĩ'], ['👍', 'tốt like'], ['👉', 'chỉ tay'], ['⬆️', 'lên tăng'], ['⬇️', 'xuống giảm'], ['📈', 'tăng biểu đồ'], ['📉', 'giảm biểu đồ'],
  ['💯', '100 tuyệt đối'], ['⭐', 'sao nổi bật'], ['🎯', 'mục tiêu'], ['🚀', 'nhanh tên lửa'], ['📱', 'điện thoại'], ['☕', 'cà phê nghỉ'], ['🏃', 'vận động chạy'], ['💪', 'mạnh cố gắng'], ['❤️', 'tim yêu'], ['🎉', 'chúc mừng'],
  ['🔑', 'chìa khóa bí quyết'], ['📌', 'ghim lưu'], ['🔔', 'chuông nhắc'], ['💤', 'ngủ'], ['✨', 'lấp lánh'], ['➡️', 'mũi tên sang'], ['1️⃣', 'số một 1'], ['2️⃣', 'số hai 2'], ['3️⃣', 'số ba 3'], ['4️⃣', 'số bốn 4']];
// [mã, tên, nhóm, giây, kiểu tổng hợp, cao độ]
export const VID_SFX = [['ding', 'Ting', 'Nhấn', 0.6, 'ding', 1], ['pop', 'Pop', 'Nhấn', 0.1, 'pop', 1], ['pop2', 'Pop cao', 'Nhấn', 0.1, 'pop', 1.6], ['boom', 'Bùm', 'Nhấn', 0.8, 'boom', 1], ['drum', 'Trống', 'Nhấn', 0.3, 'drum', 1], ['snap', 'Búng tay', 'Nhấn', 0.1, 'snap', 1], ['click', 'Click', 'Nhấn', 0.1, 'click', 1], ['knock', 'Gõ bàn', 'Nhấn', 0.3, 'knock', 1],
  ['whoosh', 'Vút', 'Chuyển cảnh', 0.5, 'whoosh', 1], ['rise', 'Vút lên', 'Chuyển cảnh', 0.6, 'rise', 1], ['fall', 'Vút xuống', 'Chuyển cảnh', 0.6, 'fall', 1], ['swipe', 'Lướt', 'Chuyển cảnh', 0.3, 'swipe', 1], ['swipe2', 'Quét nhanh', 'Chuyển cảnh', 0.2, 'swipe', 1.8], ['wind', 'Gió', 'Chuyển cảnh', 1.2, 'wind', 1],
  ['chime', 'Đúng (ting ting)', 'Đúng/Sai', 0.6, 'chime', 1], ['buzz', 'Sai (bíp)', 'Đúng/Sai', 0.4, 'buzz', 1], ['bell', 'Chuông', 'Đúng/Sai', 1.2, 'bell', 1], ['dingdong', 'Ding dong', 'Đúng/Sai', 0.8, 'dingdong', 1], ['whistle', 'Còi', 'Đúng/Sai', 0.4, 'whistle', 1],
  ['boing', 'Boing', 'Vui', 0.5, 'boing', 1], ['bubble', 'Bong bóng', 'Vui', 0.15, 'bubble', 1], ['sparkle', 'Lấp lánh', 'Vui', 0.4, 'sparkle', 1], ['magic', 'Phép thuật', 'Vui', 0.6, 'sparkle', 0.7], ['fanfare', 'Kèn vui', 'Vui', 0.8, 'fanfare', 1], ['heart', 'Tim đập', 'Vui', 0.4, 'heart', 1],
  ['key', 'Gõ phím', 'Giao diện', 0.05, 'key', 1], ['notify', 'Thông báo', 'Giao diện', 0.4, 'notify', 1], ['shutter', 'Chụp ảnh', 'Giao diện', 0.2, 'shutter', 1], ['tick', 'Tích tắc', 'Giao diện', 0.6, 'tick', 1], ['page', 'Lật trang', 'Giao diện', 0.2, 'page', 1], ['unlock', 'Mở khóa', 'Giao diện', 0.2, 'unlock', 1],
  ['roll', 'Trống dồn', 'Không khí', 1, 'roll', 1], ['drone', 'Hồi hộp', 'Không khí', 2, 'drone', 1], ['bigboom', 'Bùm lớn', 'Không khí', 1.2, 'boom', 0.6], ['gong', 'Chiêng', 'Không khí', 1.6, 'bell', 0.45]];
export const VID_SFX_GROUPS = ['Chuyển cảnh', 'Nhấn', 'Đúng/Sai', 'Vui', 'Giao diện', 'Không khí'];
export const VID_CUE_FX = ['Hiện ngay', 'Nảy', 'Mờ dần'];
export const VID_CUE_TEXT_STYLES = ['Trắng nổi', 'Nền vàng', 'Nhãn đỏ'];
export const sfxOf = k => VID_SFX.find(x => x[0] === k) || null;
const iconOk = g => VID_ICONS.some(x => x[0] === g);
// Yêu thích và Gần đây: dùng chung cho mọi video (nằm trong dữ liệu chung, đi theo tệp sao lưu)
export function vidLibOf(S) {
  if (!S.vidLib) S.vidLib = { favS: ['ding', 'pop', 'whoosh', 'chime', 'buzz', 'boom', 'sparkle', 'tick'], favI: ['🔥', '💡', '✅', '❌', '❓', '⏰', '🧠', '👉', '⭐', '🎯', '📈', '🎉'], recS: [], recI: [] };
  return S.vidLib;
}
export function toggleVidFav(S, kind, key) {
  const L = vidLibOf(S); const a = kind === 'sfx' ? L.favS : L.favI; if (kind === 'sfx' ? !sfxOf(key) : !iconOk(key)) return { ok: false, error: 'Không có trong kho.' };
  const i = a.indexOf(key); if (i >= 0) a.splice(i, 1); else a.push(key); return { ok: true, fav: i < 0 };
}
const pushRecent = (a, x) => { const i = a.indexOf(x); if (i >= 0) a.splice(i, 1); a.unshift(x); if (a.length > 10) a.length = 10; };
const cueGet = (S, id, cid) => { const v = vidGet(S, id); const ed = v && v.edit; return { v, ed, c: ed && (ed.cues || []).find(x => x.id === cid) }; };
export const cueOf = (ed, cid) => (ed && ed.cues || []).find(x => x.id === cid) || null;
// Đặt cue ở từ thứ wi của cảnh; đã có cue ở từ đó thì trả cue đó
export function addCue(S, id, sid, wi) {
  const v = vidGet(S, id); const ed = v && v.edit; const sc = ed && ed.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const ws = sceneWords(sc.text); const k = Math.round(Number(wi)); if (!(k >= 0 && k < ws.length)) return { ok: false, error: 'Không thấy từ trong lời cảnh.' };
  ed.cues = ed.cues || []; const old = ed.cues.find(c => c.sc === sid && c.wi === k && !c.lost); if (old) return { ok: true, cue: old, existed: true };
  if (ed.cues.length >= 60) return { ok: false, error: 'Tối đa 60 cue mỗi video.' };
  ed.cueSeq = ed.cueSeq || 1; const c = { id: `cu${ed.cueSeq++}`, sc: sid, wi: k, w: ws[k], dt: 0, icon: null, text: null, sfx: null, lost: false }; ed.cues.push(c); return { ok: true, cue: c };
}
// Đặt lại cue (vd. từ cũ đã bị xóa) vào từ khác
export function moveCue(S, id, cid, sid, wi) {
  const { ed, c } = cueGet(S, id, cid); if (!c) return { ok: false, error: 'Không thấy cue.' }; const sc = ed.scenes.find(x => x.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const ws = sceneWords(sc.text); const k = Math.round(Number(wi)); if (!(k >= 0 && k < ws.length)) return { ok: false, error: 'Không thấy từ trong lời cảnh.' };
  if (ed.cues.some(x => x !== c && x.sc === sid && x.wi === k && !x.lost)) return { ok: false, error: 'Từ này đã có cue.' };
  Object.assign(c, { sc: sid, wi: k, w: ws[k], dt: 0, lost: false }); return { ok: true, cue: c };
}
export function removeCue(S, id, cid) { const { ed, c } = cueGet(S, id, cid); if (!c) return { ok: false, error: 'Không thấy cue.' }; ed.cues = ed.cues.filter(x => x !== c); return { ok: true }; }
const num = (x, lo, hi, d) => { const n = Number(x); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// Sửa cue: patch.icon / text / sfx = null để tắt, = {...} để bật hoặc đổi; dt = độ lệch so với từ (giây)
export function editCue(S, id, cid, patch) {
  const { v, c } = cueGet(S, id, cid); if (!c) return { ok: false, error: 'Không thấy cue.' }; const P = patch || {}; const L = vidLibOf(S);
  if (P.dt != null) c.dt = r1(num(P.dt, -5, 5, 0));
  if (P.icon !== undefined) {
    if (!P.icon) c.icon = null;
    else { const o = Object.assign({ g: '💡', x: 78, y: 30, sz: 56, dur: 1.5, fx: 1 }, c.icon || {}, P.icon); if (!iconOk(o.g)) return { ok: false, error: 'Icon không có trong kho.' };
      c.icon = { g: o.g, x: r1(num(o.x, 0, 100, 50)), y: r1(num(o.y, 0, 100, 30)), sz: Math.round(num(o.sz, 12, 160, 56)), dur: r1(num(o.dur, 0.5, 10, 1.5)), fx: Math.round(num(o.fx, 0, VID_CUE_FX.length - 1, 0)) };
      if (P.icon.g) pushRecent(L.recI, o.g); }
  }
  if (P.text !== undefined) {
    if (!P.text) c.text = null;
    else { const o = Object.assign({ t: String(c.w || '').replace(/[.,?!…]/g, '').toUpperCase(), st: 1, x: 50, y: 34, sz: 24, dur: 2, fx: 1 }, c.text || {}, P.text); const t = String(o.t || '').trim().slice(0, 80); if (!t) return { ok: false, error: 'Chữ của cue đang trống.' };
      c.text = { t, st: Math.round(num(o.st, 0, VID_CUE_TEXT_STYLES.length - 1, 0)), x: r1(num(o.x, 0, 100, 50)), y: r1(num(o.y, 0, 100, 34)), sz: Math.round(num(o.sz, 12, 160, 24)), dur: r1(num(o.dur, 0.5, 10, 2)), fx: Math.round(num(o.fx, 0, VID_CUE_FX.length - 1, 0)) }; }
  }
  if (P.sfx !== undefined) {
    if (!P.sfx) c.sfx = null;
    else { const o = Object.assign({ k: L.favS[0] || 'ding', vol: 80 }, c.sfx || {}, P.sfx); if (!sfxOf(o.k)) return { ok: false, error: 'Âm thanh không có trong kho.' }; c.sfx = { k: o.k, vol: Math.round(num(o.vol, 0, 100, 80)) }; if (P.sfx.k) pushRecent(L.recS, o.k); }
  }
  return { ok: true, cue: c, time: cueTime(v.edit, c) };
}
export const cueLabel = c => [c.icon ? c.icon.g : '', c.text ? 'T' : '', c.sfx ? '♪' : ''].join('') || '•';
