// ---------- 05c · R3′: Chia bài, thao tác slot (DST-01..07, CAL-13..15) ----------
import { scoreText } from './04-mock.js';
import { assignCell, byId, cellView, chooseSlotImage, dealSlots, isLocked, log, refreshSlotFlags, slotColumnId, slotLockMsg, slotWarnings, weekOf, weekSlots, writeSlotFromCell } from './05-model.js';
import { blogRefreshAuto } from './05p-blogseo.js';
function slotGuard(S, s) {
  if (!s) return 'Không tìm thấy slot.';
  return slotLockMsg(S, s);
}
// Đánh dấu "nội dung đã đổi sau khi đăng" khi slot Đã đăng bị đổi bài (tuần Đang sửa)
function markChanged(s, before) { if (s.state === 'PUBLISHED' && s.text !== before) s.changedAfterPublish = true; }
// Chia bài (DST-01..05): viết slot trống từ ô; slot của Cột không có ô Đã duyệt giữ "Chưa có bài" kèm lý do
export function dealWeek(S, weekId, at) {
  const r = dealSlots(S, weekId, at);
  if (!r.ok) return r;
  const w = weekOf(S, weekId);
  weekSlots(S, weekId).forEach(s => {
    if (s.state !== 'EMPTY' || s.free) { s.emptyReason = s.free && s.state === 'EMPTY' ? 'Slot tự do: bạn tự viết bài' : ''; return; }
    const f = byId(S.formats, s.formatId);
    const cid = slotColumnId(S, s), col = f ? byId(S.columns, cid) : null;
    s.emptyReason = !f ? 'Format đã xóa' : !w.columnIds.includes(cid) ? `Cột "${col ? col.name : '?'}" không có trong tuần` : `Cột "${col ? col.name : '?'}" không có ô Đã duyệt`;
  });
  return r;
}
function slotSourceCell(S, s) { return s && s.sourceCellId ? byId(S.cells, s.sourceCellId) : null; }
// Duyệt tất cả slot (10.56): slot Chưa duyệt có bài, không cần cập nhật; withWarned = true thì gồm cả slot có cảnh báo
export function slotsApprovable(S, weekId, withWarned) {
  if (isLocked(S, weekId)) return [];
  return weekSlots(S, weekId).filter(s => s.state === 'DRAFT' && s.text && !s.needsUpdate && (withWarned || !slotWarnings(S, s).length));
}
export function slotsWarned(S, weekId) {
  return slotsApprovable(S, weekId, true).map(s => ({ slot: s, warnings: slotWarnings(S, s) })).filter(x => x.warnings.length);
}
export function approveSlotsBulk(S, weekId, at, withWarned) {
  const list = slotsApprovable(S, weekId, withWarned);
  list.forEach(s => approveSlot(S, s.id, at));
  const left = weekSlots(S, weekId).filter(s => s.state === 'DRAFT').length;
  if (list.length) log(S, 'approve-bulk', 'slots', weekId, `${list.length} slot`);
  return { ok: true, approved: list.length, left };
}
// Duyệt slot: cần có bài và không "cần cập nhật"
export function approveSlot(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.text) return { ok: false, error: 'Slot chưa có bài.' };
  if (s.needsUpdate) return { ok: false, error: 'Slot cần cập nhật: chọn "Cập nhật từ ô" hoặc "Giữ bản slot" trước.' };
  if (s.state !== 'DRAFT') return { ok: false, error: s.state === 'APPROVED' ? 'Slot đã duyệt.' : 'Slot đã đăng.' };
  s.state = 'APPROVED'; s.approvedAt = at || S.settings.demoNow;
  log(S, 'approve', 'slot', slotId);
  return { ok: true, warnings: slotWarnings(S, s).length };
}
// Tạo lại: viết lại từ ô nguồn hiện hành (bản mới vào history; Hoàn tác một lần = dùng lại bản trước)
export function regenSlot(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (s.free) return { ok: false, error: 'Slot tự do không có ô nguồn để tạo lại. Hãy sửa bài trực tiếp.' };
  const cell = slotSourceCell(S, s);
  if (!cell) return { ok: false, error: 'Slot chưa có ô nguồn. Bấm Chia bài ở Matrix hoặc chọn ô.' };
  if (cellView(S, cell).state !== 'APPROVED') return { ok: false, error: 'Ô nguồn chưa ở trạng thái Đã duyệt. Duyệt lại ô hoặc chọn ô khác.' };
  const before = s.text; const prevN = s.genN;
  writeSlotFromCell(S, s, cell, at);
  markChanged(s, before); s.undoN = prevN;
  log(S, 'regen', 'slot', slotId, `bản ${s.genN}`);
  return { ok: true, n: s.genN };
}
// Dùng một bản trong history (back/next, Hoàn tác): bài, ô nguồn và dấu theo bản đó; cờ "cần cập nhật" tính lại
export function useSlotVersion(S, slotId, n) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  const h = (s.history || []).find(x => x.n === n);
  if (!h) return { ok: false, error: 'Không có bản này.' };
  if (s.text === h.text && s.sourceCellId === h.cellId) return { ok: false, error: 'Đây đã là bản đang dùng.' };
  const before = s.text;
  const f = byId(S.formats, s.formatId);
  const sc = scoreText(h.text, f ? f.criteria : [], `${s.id}|${n}`);
  Object.assign(s, { text: h.text, sourceCellId: h.cellId, sourceStamp: h.stamp, scores: sc.scores, total: sc.total, tip: sc.tip, keepReason: '', keepStamp: null, needsUpdate: false, undoN: null, curN: n });
  if (h.ai) s.ai = Object.assign({}, h.ai, { scored: false }); else delete s.ai;
  if (s.state !== 'PUBLISHED') s.state = 'DRAFT';
  markChanged(s, before); blogRefreshAuto(S, s);
  refreshSlotFlags(S, s.weekId);
  log(S, 'use-version', 'slot', slotId, `bản ${n}`);
  return { ok: true };
}
// Sửa tay bài slot: thêm một bản vào history, slot về Chưa duyệt
export function editSlot(S, slotId, text, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.text && !s.free) return { ok: false, error: 'Slot chưa có bài để sửa.' };
  const t = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!t) return { ok: false, error: 'Bài không được để trống.' };
  if (t === s.text) return { ok: false, error: 'Chưa có thay đổi.' };
  const before = s.text;
  const n = Math.max(s.genN || 0, ...(s.history || []).map(h => h.n)) + 1;
  const f = byId(S.formats, s.formatId);
  const sc = scoreText(t, f ? f.criteria : [], `${s.id}|${n}`);
  delete s.ai; // sửa tay: không còn là bài AI viết nguyên bản
  s.history = (s.history || []).concat([{ n, text: t, createdAt: at || S.settings.demoNow, cellId: s.sourceCellId, stamp: s.sourceStamp, edited: true }]);
  Object.assign(s, { text: t, prevText: before, genN: n, curN: n, scores: sc.scores, total: sc.total, tip: sc.tip, undoN: null });
  if (s.state !== 'PUBLISHED') s.state = 'DRAFT';
  blogRefreshAuto(S, s);
  markChanged(s, before);
  log(S, 'edit', 'slot', slotId, `bản ${n}`);
  return { ok: true, n };
}
// "Cần cập nhật": Cập nhật từ ô (viết lại từ bản hiện hành của ô) hoặc Giữ bản slot (bắt buộc lý do)
export function updateSlotFromCell(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  const cell = slotSourceCell(S, s);
  if (!cell) return { ok: false, error: 'Slot không còn ô nguồn.' };
  const st = cellView(S, cell).state;
  if (st !== 'APPROVED') return { ok: false, error: st === 'CANCELLED' ? 'Ô nguồn đã bị hủy. Chọn ô khác hoặc giữ bản slot.' : 'Ô nguồn chưa duyệt lại. Duyệt ô ở Matrix trước, hoặc giữ bản slot.' };
  const before = s.text;
  writeSlotFromCell(S, s, cell, at);
  s.keepStamp = null; s.undoN = null; markChanged(s, before);
  log(S, 'update-from-cell', 'slot', slotId);
  return { ok: true };
}
export function keepSlotVersion(S, slotId, reason) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.needsUpdate) return { ok: false, error: 'Slot không cần cập nhật.' };
  const r = String(reason || '').trim();
  if (r.length < 3) return { ok: false, error: 'Cần ghi lý do giữ bản slot.' };
  const cell = slotSourceCell(S, s);
  s.keepReason = r; s.keepStamp = cell ? cellView(S, cell).stamp : null; s.needsUpdate = false;
  log(S, 'keep', 'slot', slotId, r);
  return { ok: true };
}
// Đổi ô nguồn (DST-06): chỉ ô Đã duyệt cùng Cột; slot viết lại từ ô mới
export function changeSlotCell(S, slotId, cellId, at) {
  const s = byId(S.slots, slotId); const before = s ? s.text : '';
  const prevN = s ? s.genN : 0;
  const r = assignCell(S, slotId, cellId, at);
  if (r.ok) { s.keepStamp = null; s.undoN = prevN; s.emptyReason = ''; markChanged(s, before); }
  return r;
}
// Ô ảnh: chọn phiên bản trước/sau (CAL-14)
export function stepSlotImage(S, slotId, idx, dir) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a || !a.versions.length) return { ok: false, error: 'Chưa có ảnh.' };
  const i = a.versions.findIndex(v => v.n === a.current);
  const v = a.versions[i + dir];
  if (!v) return { ok: false, error: 'Hết phiên bản.' };
  return chooseSlotImage(S, slotId, idx, v.n);
}
