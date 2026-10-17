// ---------- 05w · Short Vid: Ren Vid (bản MÔ PHỎNG, mục 10.86) ----------
// Ren Vid biến "lệnh dựng" (v.edit) thành file video của thẻ rồi tự lưu vào Kho. Bản này chưa ghép hình/giọng thật: file là một video ngắn
// giữ chỗ, đủ để chạy toàn luồng Biên tập → Ren Vid → Kho → Xếp Slot → Dashboard. Bộ ren thật (ffmpeg.wasm trong trình duyệt, hoặc ffmpeg
// trên PC app / máy chủ) chỉ cần thay hàm `simRender`; mọi thứ khác giữ nguyên. Dùng chung cho Vid Topic và Vid tự do.
import { byId, log } from './05-model.js';
import { editBlockers } from './05u-vidpop.js';
import { addLibraryVideo } from './05m-studio.js';
import { editTimeline } from './05t-videdit.js';
import { slugOf } from './05f-export.js';
import { vidsOf } from './05s-shortvid.js';

const SIM_WEBM = 'data:video/webm;base64,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';
const vidGet = (S, id) => byId(S.videos || [], id);
// Chữ ký của phần biên tập: đổi kịch bản hoặc dự án dựng thì video đã ren thành "lỗi thời"
export function editSig(v) {
  const e = Object.assign({}, v.edit || {}); delete e.doneAt; delete e.plannedAt;
  const s = JSON.stringify([v.script || '', e]); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
// Lý do chưa ren được ('' nếu ren được)
export function renderBlockers(v) {
  if (!v) return 'Không thấy thẻ Vid.'; if (v.cancelled) return 'Thẻ đã hủy.';
  if (!v.edit || !v.edit.scenes.length) return 'Chưa có cảnh để ren.';
  const bl = editBlockers(v); if (bl.length) return `Cảnh ${bl.map(x => x.i + 1).join(', ')} chưa có hình.`;
  if (!v.edit.doneAt) return 'Chưa Hoàn thành biên tập.';
  if (v.file && !v.file.rendered) return 'Thẻ đang dùng video Up ngoài app. Bỏ video đó trước nếu muốn ren.';
  return '';
}
// 'none' chưa có video, 'fresh' đã ren và khớp bản biên tập, 'stale' đã ren nhưng biên tập đã đổi, 'ext' video Up ngoài app
export function renderState(v) {
  if (!v || !v.file) return 'none'; if (!v.file.rendered) return 'ext';
  return v.file.sig === editSig(v) ? 'fresh' : 'stale';
}
const coverSvg = (title, dur) => { const t = String(title || 'Video').slice(0, 40).replace(/[<>&"]/g, ' '); return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="270" height="480" fill="#1f2a44"/><polygon points="105,200 105,280 175,240" fill="#fff" opacity=".85"/><text x="135" y="340" font-size="18" fill="#fff" text-anchor="middle" font-family="sans-serif">${t}</text><text x="135" y="368" font-size="14" fill="#aab" text-anchor="middle" font-family="sans-serif">${dur} giây</text></svg>`)}`; };
function simRender(v) { return { src: SIM_WEBM, size: Math.round(SIM_WEBM.length * 0.75), cover: coverSvg(v.insight.title, Math.round(editTimeline(v).total)) }; }
export function renderVid(S, id) {
  const v = vidGet(S, id); const why = renderBlockers(v); if (why) return { ok: false, error: why };
  const out = simRender(v); const dur = Math.round(editTimeline(v).total); const name = `${slugOf(v.insight.title) || 'video'}.webm`;
  const lib = addLibraryVideo(S, { name: v.insight.title.slice(0, 80), src: out.src, cover: out.cover, dur, vidId: v.id, replaceId: v.file && v.file.libId }, S.settings.demoNow);
  if (!lib.ok) return lib;
  v.file = { kind: 'video', src: out.src, name, size: out.size, at: S.settings.demoNow, rendered: true, sim: true, sig: editSig(v), dur, libId: lib.item.id };
  log(S, 'vid-render', 'video', id, `${dur} giây · Kho ${lib.item.id}${lib.updated ? ' (thay bản cũ)' : ''}`);
  return { ok: true, video: v, library: lib.item, updated: !!lib.updated };
}
// Thẻ trong danh sách ren được ngay (đã Hoàn thành biên tập; chưa ren hoặc đã lỗi thời) và thẻ bị bỏ qua kèm lý do
export function renderTargets(S, ids) {
  const todo = [], skipped = [];
  ids.map(i => vidGet(S, i)).filter(x => x && !x.cancelled && x.status !== 'IDEA').forEach(v => {
    const why = renderBlockers(v); if (why) return skipped.push({ id: v.id, why });
    if (renderState(v) === 'fresh') return; todo.push(v.id);
  });
  return { todo, skipped };
}
export const rowRenderTargets = (S, weekId, topicId) => renderTargets(S, vidsOf(S, weekId, topicId).map(v => v.id));
