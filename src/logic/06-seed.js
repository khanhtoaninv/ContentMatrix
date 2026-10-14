// ---------- 06 · Dữ liệu demo v2.8 — Nói Được English (mọi số liệu là số kiểm thử, mô phỏng) ----------
import { hash32, splitSentences } from './01-util.js';
import { TEMPLATES } from './02-parse.js';
import { scoreText, writeCell, writeImagePrompt } from './04-mock.js';
import { applyTemplateWeek, byId, cellAt, cellsOf, dealSlots, defaultSetup, emptyState, ensureWeek, genSlotImage, importTopics, log, setBrandMd, setVoiceMd, topicCurrent, topicFileOf, topicsOf, weekSlots } from './05-model.js';
import { channelPublish, mockPostUrl, publishNow, slotTs, syncMetrics, tsAddMin } from './05e-publish.js';
import { aiCellText } from './05o-aitext.js';
import { skillTag } from './05r-skill.js';
import { SEED_TOPIC_FILES } from './06-seed-topics.js';
// Viết một lượt sinh cho ô theo phiên bản Topic (AI-03). Trả về null khi Cột Câu chuyện mà Topic không có trường hợp (D100).
export function addCellGen(S, cell, topicVersionN, state, createdAt) {
  const row = byId(S.topics, cell.topicId);
  const iv = row.versions.find(v => v.n === topicVersionN);
  const col = byId(S.columns, cell.columnId);
  const file = topicFileOf(S, cell.weekId);
  const n = cell.gens.length + 1;
  const mock = writeCell(iv, col, n, file ? file.context : '');
  if (mock == null) return null;
  // AI thật (mục 10.39): kết quả đã chuẩn bị sẵn thì dùng, không thì bản mô phỏng
  const ai = aiCellText(S, cell, iv, col, file ? file.context : '', mock, n);
  const text = ai ? ai.text : mock;
  const sc = (ai && ai.score) || scoreText(text, col.criteria, `${cell.id}|${n}`);
  const gen = { n, topicVersion: topicVersionN, createdAt: createdAt || S.settings.demoNow, text, imagePrompt: (ai && ai.imagePrompt) || writeImagePrompt(iv, col, n), scores: sc.scores, total: sc.total, tip: sc.tip, edits: [] };
  if (ai) gen.ai = { provider: ai.provider, model: ai.model, scored: !!ai.score, ...skillTag(col) };
  cell.gens.push(gen);
  cell.byVersion[topicVersionN] = { state: state || 'DRAFT', currentRef: { genN: n, editRev: 0 }, approvedAt: state === 'APPROVED' ? gen.createdAt : null };
  return gen;
}
export function cancelCell(cell, topicVersionN) { cell.byVersion[topicVersionN] = { state: 'CANCELLED', currentRef: null, approvedAt: null }; }

export function buildSeed() {
  const S = emptyState();
  Object.assign(S, defaultSetup());
  S.isDemo = true;
  setBrandMd(S, TEMPLATES.brand); setVoiceMd(S, TEMPLATES.voice);
  const at = (d, t) => `${d}T${t}`;
  // Viết mọi ô (Topic × Cột) chưa có bài cho phiên bản Topic hiện hành; Câu chuyện không có trường hợp thì Hủy
  const writeCells = (w, filter, state, when) => {
    cellsOf(S, w.id).forEach(c => {
      const row = byId(S.topics, c.topicId);
      if (c.byVersion[row.currentVersion] || (filter && !filter(c))) return;
      if (addCellGen(S, c, row.currentVersion, state, when) == null) cancelCell(c, row.currentVersion);
    });
  };
  const images = (w, perSlot) => weekSlots(S, w.id).forEach((s, i) => s.assets.forEach((a, k) => { for (let n = 0; n < perSlot(i, k); n++) genSlotImage(S, s.id, k, s.date + 'T08:00'); }));

  // ---- T1: 05/10, Tuần chuẩn, đã chốt, đã đăng đủ; Topic 1 có v1 và v2 ----
  const t1 = ensureWeek(S, '2026-10-05').week;
  importTopics(S, t1.id, SEED_TOPIC_FILES['2026-10-05'].v1, at('2026-10-01', '08:30'));
  const r1 = topicsOf(S, t1.id);
  // v1 của Topic 1: viết 4 trong 5 ô (ô Luyện tập chưa từng viết cho v1)
  writeCells(t1, c => c.topicId === r1[0].id && c.columnId !== 'col-luyentap', 'APPROVED', at('2026-10-01', '10:02'));
  importTopics(S, t1.id, SEED_TOPIC_FILES['2026-10-05'].v2, at('2026-10-01', '15:30'));
  writeCells(t1, null, 'APPROVED', at('2026-10-01', '16:05'));
  applyTemplateWeek(S, '2026-10-05', 'wt-1');
  dealSlots(S, t1.id, at('2026-10-02', '09:00'));
  // Đã đăng đủ: kênh Tự động có link giả, kênh Thủ công đã dán link (mục 10.22); số liệu thêm ở cuối theo giờ demo
  weekSlots(S, t1.id).forEach((s, i) => {
    s.confirmedText = s.text;
    const auto = channelPublish(S, s.channelId).mode === 'auto';
    publishNow(S, s, auto ? 'auto' : 'manual', tsAddMin(slotTs(s), auto ? hash32(`${s.id}|jit`) % 4 : 4 + i % 9), { url: mockPostUrl(S, s), asConfirmed: !(i === 3 || i === 8), simulated: auto });
  });
  images(t1, (i, k) => (i % 5 === 0 ? 1 : 0)); // Chia bài đã tạo bản 1; vài ảnh được gen thêm bản 2
  Object.assign(t1, { status: 'CONFIRMED', revision: 1, confirmedAt: at('2026-10-04', '21:00') });

  // ---- T2: 12/10 (tuần hiện tại), Tuần nhẹ, Topic dài; đã Chia bài, slot chưa duyệt ----
  const t2 = ensureWeek(S, '2026-10-12').week;
  applyTemplateWeek(S, '2026-10-12', 'wt-2');
  importTopics(S, t2.id, SEED_TOPIC_FILES['2026-10-12'].v1, at('2026-10-11', '20:10'));
  writeCells(t2, null, 'APPROVED', at('2026-10-11', '21:00'));
  dealSlots(S, t2.id, at('2026-10-12', '08:30'));
  // Chia bài đã tạo luôn ảnh cho mọi ô ảnh (mục 10.8)

  // ---- T3: 19/10, Tuần chuẩn; slot đã lập nhưng chưa Chia bài; ô đang duyệt; Topic 2 có v1 và v2; Topic 3 không có trường hợp ----
  const t3 = ensureWeek(S, '2026-10-19').week;
  applyTemplateWeek(S, '2026-10-19', 'wt-1');
  importTopics(S, t3.id, SEED_TOPIC_FILES['2026-10-19'].v1, at('2026-10-10', '09:00'));
  const r3 = topicsOf(S, t3.id);
  writeCells(t3, c => c.topicId === r3[1].id, 'APPROVED', at('2026-10-10', '10:15'));
  importTopics(S, t3.id, SEED_TOPIC_FILES['2026-10-19'].v2, at('2026-10-11', '14:20'));
  writeCells(t3, null, 'APPROVED', at('2026-10-11', '15:00'));
  const draft = (row, colId) => { const c = cellAt(S, t3.id, row.id, colId); const v = row.currentVersion; Object.assign(c.byVersion[v], { state: 'DRAFT', approvedAt: null }); return c.gens[c.gens.length - 1]; };
  // Ô có cụm từ cấm (HR-02)
  { const g = draft(r3[0], 'col-batngo'); g.text = g.text.replace('## CTA', 'Chỉ cần dám mở lời, bạn sẽ chắc chắn nói giỏi trước hội đồng.\n\n## CTA'); }
  // Ô quá dài (HR-01): chèn thêm câu của chính Topic 2
  { const g = draft(r3[1], 'col-luyentap');
    const extra = splitSentences(topicCurrent(r3[1]).text.replace(/^#{1,6}\s+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '')).slice(0, 8).join(' ');
    g.text = g.text.replace('## Câu hỏi', `${extra}\n\n## Câu hỏi`); }
  // Ô chưa duyệt, không cảnh báo
  draft(r3[2], 'col-huongdan');

  S.ui.weekStart = '2026-10-12';
  syncMetrics(S);
  S.audit = [];
  log(S, 'seed', 'state', 'demo', 'Nạp dữ liệu demo');
  return S;
}
