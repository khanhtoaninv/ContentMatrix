// ---------- 05b · R2′: Viết ma trận, thao tác ô, sửa Topic (MTX-01..08, TPC-08) ----------
// Ô Câu chuyện của Topic không có trường hợp cụ thể thì không viết (D100, MTX-07)
function cellNoCase(S, cell) {
  const col = byId(S.columns, cell.columnId); const row = byId(S.topics, cell.topicId);
  const v = row ? topicCurrent(row) : null;
  return !!col && col.kind === 'cauchuyen' && !!v && !v.hasCase;
}
function cellGuard(S, cell) {
  if (!cell) return 'Không tìm thấy ô.';
  if (isLocked(S, cell.weekId)) return 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.';
  const row = byId(S.topics, cell.topicId);
  if (!row || !topicCurrent(row)) return 'Không tìm thấy Topic của ô.';
  return '';
}
// Bài của một lượt sinh theo bản sửa (editRev = 0 là bản AI viết)
function genText(gen, editRev) {
  if (!gen) return '';
  const e = editRev ? gen.edits.find(x => x.rev === editRev) : null;
  return e ? e.text : gen.text;
}
function genImagePrompt(gen, editRev) {
  if (!gen) return '';
  const e = editRev ? gen.edits.find(x => x.rev === editRev) : null;
  return e && e.imagePrompt != null ? e.imagePrompt : gen.imagePrompt || '';
}
function lastEditRev(gen) { return gen && gen.edits.length ? gen.edits[gen.edits.length - 1].rev : 0; }

// ---- Viết ma trận (MTX-01): các ô Trống của phiên bản Topic hiện hành, theo thứ tự Topic rồi Cột ----
function writeQueue(S, weekId) {
  const w = weekOf(S, weekId); if (!w) return [];
  const out = [];
  topicsOf(S, weekId).filter(r => topicCurrent(r)).forEach(r => weekLanes(S, w).forEach(({ colId, k }) => {
    const c = cellAt(S, weekId, r.id, colId, k);
    if (c && cellView(S, c).state === 'EMPTY' && !cellNoCase(S, c)) out.push(c.id);
  }));
  return out;
}
function noCaseEmptyCount(S, weekId) {
  return cellsOf(S, weekId).filter(c => cellView(S, c).state === 'EMPTY' && cellNoCase(S, c) && topicCurrent(byId(S.topics, c.topicId) || {})).length;
}
function writeGate(S, weekId) {
  const w = weekOf(S, weekId);
  const rows = w ? topicsOf(S, weekId).filter(r => topicCurrent(r)) : [];
  const reasons = [];
  if (w && w.status === 'CONFIRMED') reasons.push('Tuần đã chốt');
  const queue = writeQueue(S, weekId);
  if (!rows.length) reasons.push('Chưa có Topic');
  else if (!queue.length) {
    const nc = noCaseEmptyCount(S, weekId);
    reasons.push(nc ? `Mọi ô viết được đã có bài; ${nc} ô Câu chuyện không viết (Topic không có trường hợp) · nên Hủy` : 'Mọi ô đã có bài');
  }
  return { ok: !reasons.length, reasons, count: queue.length, queue };
}
// Viết một ô Trống (một lượt sinh: một bài + một gợi ý ảnh, MTX-01/02)
function writeCellNow(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  if (cellView(S, cell).state !== 'EMPTY') return { ok: false, error: 'Ô đã có bài.' };
  if (cellNoCase(S, cell)) return { ok: false, error: 'Topic không có trường hợp cụ thể · nên Hủy ô Câu chuyện này.' };
  const row = byId(S.topics, cell.topicId);
  const gen = addCellGen(S, cell, row.currentVersion, 'DRAFT', at || S.settings.demoNow);
  if (!gen) return { ok: false, error: 'Không viết được ô này.' };
  refreshSlotFlags(S, cell.weekId);
  return { ok: true, gen };
}
// Viết toàn bộ hàng đợi (dùng cho test; giao diện viết từng ô để có nút Dừng)
function writeMatrix(S, weekId, at) {
  const gate = writeGate(S, weekId);
  if (!gate.ok) return { ok: false, reasons: gate.reasons, written: 0 };
  let written = 0;
  gate.queue.forEach(id => { if (writeCellNow(S, id, at).ok) written++; });
  log(S, 'write-matrix', 'week', weekId, `${written} ô`);
  return { ok: true, written };
}

// ---- Thao tác ô (MTX-03..06) ----
function approveCell(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (v.state !== 'DRAFT') return { ok: false, error: v.state === 'APPROVED' ? 'Ô đã duyệt.' : 'Ô chưa có bài để duyệt.' };
  const bv = cell.byVersion[v.topicVersion];
  bv.state = 'APPROVED'; bv.approvedAt = at || S.settings.demoNow;
  log(S, 'approve', 'cell', cellId);
  return { ok: true, warnings: cellWarnings(S, cell, v.text).length };
}
// Tạo lại: thêm một lượt sinh cho phiên bản Topic hiện hành; ô về Chưa duyệt (cả ô Trống, Đã duyệt, Đã hủy)
function regenCell(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  if (cellNoCase(S, cell)) return { ok: false, error: 'Topic không có trường hợp cụ thể nên ô Câu chuyện không viết được (D100).' };
  const row = byId(S.topics, cell.topicId);
  const gen = addCellGen(S, cell, row.currentVersion, 'DRAFT', at || S.settings.demoNow);
  if (!gen) return { ok: false, error: 'Không viết được ô này.' };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'regen', 'cell', cellId, `bản ${gen.n}`);
  return { ok: true, gen };
}
// Sửa tay bài và gợi ý ảnh của bản hiện hành: thêm một bản sửa, ô về Chưa duyệt
function editCell(S, cellId, text, imagePrompt, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (!v.gen) return { ok: false, error: 'Ô chưa có bài để sửa.' };
  const t = String(text || '').replace(/\r\n?/g, '\n').trim();
  const p = String(imagePrompt == null ? v.imagePrompt : imagePrompt).trim();
  if (!t) return { ok: false, error: 'Bài của ô không được để trống.' };
  if (t === v.text && p === v.imagePrompt && v.state !== 'CANCELLED') return { ok: false, error: 'Chưa có thay đổi.' };
  const rev = lastEditRev(v.gen) + 1;
  v.gen.edits.push({ rev, text: t, imagePrompt: p, at: at || S.settings.demoNow });
  cell.byVersion[v.topicVersion] = { state: 'DRAFT', currentRef: { genN: v.gen.n, editRev: rev }, approvedAt: null };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'edit', 'cell', cellId, `bản ${v.gen.n} · sửa ${rev}`);
  return { ok: true, rev };
}
function cancelCellNow(S, cellId) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (v.state === 'CANCELLED') return { ok: false, error: 'Ô đã hủy.' };
  cancelCell(cell, v.topicVersion);
  refreshSlotFlags(S, cell.weekId);
  log(S, 'cancel', 'cell', cellId);
  return { ok: true, slots: slotsUsingCell(S, cellId).length };
}
// "Dùng bản này" (MTX-05): chọn một lượt sinh bất kỳ (kể cả viết từ phiên bản Topic cũ) làm bản hiện hành; ô về Chưa duyệt
function useCellGen(S, cellId, genN) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const gen = cell.gens.find(g => g.n === genN);
  if (!gen) return { ok: false, error: 'Không tìm thấy bản này.' };
  const v = cellView(S, cell);
  const editRev = lastEditRev(gen);
  if (v.gen && v.gen.n === genN && v.editRev === editRev && v.state !== 'CANCELLED') return { ok: false, error: 'Đây đã là bản hiện hành.' };
  cell.byVersion[v.topicVersion] = { state: 'DRAFT', currentRef: { genN, editRev }, approvedAt: null };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'use-gen', 'cell', cellId, `bản ${genN}`);
  return { ok: true };
}
// Duyệt hàng loạt (MTX-08): chỉ các ô Chưa duyệt không có cảnh báo
function bulkApprovable(S, weekId) {
  if (isLocked(S, weekId)) return [];
  const live = new Set(topicsOf(S, weekId).filter(r => topicCurrent(r)).map(r => r.id));
  return cellsOf(S, weekId).filter(c => {
    if (!live.has(c.topicId)) return false;
    const v = cellView(S, c);
    return v.state === 'DRAFT' && !cellWarnings(S, c, v.text).length;
  });
}
function approveCellsBulk(S, weekId, at) {
  const list = bulkApprovable(S, weekId);
  list.forEach(c => approveCell(S, c.id, at));
  const left = matrixCounts(S, weekId).DRAFT;
  if (list.length) log(S, 'approve-bulk', 'week', weekId, `${list.length} ô`);
  return { ok: true, approved: list.length, left };
}

// ---- Sửa Topic trực tiếp, back/next và "Dùng phiên bản này" (TPC-08) ----
function topicVersionImpact(S, topicId) {
  const row = byId(S.topics, topicId); if (!row) return { cells: 0, slots: 0 };
  const cells = cellsOf(S, row.weekId).filter(c => c.topicId === topicId);
  const ids = new Set(cells.map(c => c.id));
  return { cells: cells.filter(c => cellView(S, c).text).length, slots: weekSlots(S, row.weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId)).length };
}
function editTopic(S, topicId, input, at) {
  const row = byId(S.topics, topicId);
  if (!row) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, row.weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  const title = String(input.title || '').trim();
  const text = String(input.text || '').replace(/\r\n?/g, '\n').trim();
  const fields = { message: String((input.fields || {}).message || '').trim(), audience: String((input.fields || {}).audience || '').trim(), angle: String((input.fields || {}).angle || '').trim() };
  if (!title) return { ok: false, error: 'Topic cần có tên.' };
  if (!text) return { ok: false, error: 'Topic không có nội dung.' };
  const p = { title, text, fields };
  if (sameTopicContent(topicCurrent(row), p)) return { ok: false, error: 'Chưa có thay đổi.' };
  const impact = topicVersionImpact(S, topicId);
  const n = row.versions.length + 1;
  const words = countWords(text.replace(/^#{1,6}\s+/gm, ''));
  row.versions.push({ n, title, text, fields, words, hasCase: topicHasCase(text), createdAt: at || S.settings.demoNow, reason: 'edited' });
  row.currentVersion = n;
  refreshSlotFlags(S, row.weekId);
  log(S, 'edit', 'topic', topicId, `v${n}`);
  return { ok: true, version: n, impact };
}
function useTopicVersion(S, topicId, n) {
  const row = byId(S.topics, topicId);
  if (!row) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, row.weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  if (!row.versions.some(v => v.n === n)) return { ok: false, error: 'Không có phiên bản này.' };
  if (row.currentVersion === n) return { ok: false, error: 'Đây đã là phiên bản hiện hành.' };
  const impact = topicVersionImpact(S, topicId);
  row.currentVersion = n;
  refreshSlotFlags(S, row.weekId);
  log(S, 'use-version', 'topic', topicId, `v${n}`);
  return { ok: true, impact };
}
