// ---------- UI · Matrix: Topic (hàng) × Cột (cột) · ô ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, INPUTS, RENDERERS, S, view } from './00-state.js';
import { CELL_STATE, closeAllLayers, closeLayer, commit, confirmBox, curStart, curWeek, ensureCurWeek, esc, fmtName, icon, mdEditorHtml, openLayer, richText, save, scoreHtml, toast, topicRich, warnMarks, warningsHtml } from './01-core.js';
import { go, lockBannerHtml, nextBandHtml, progressHtml, render } from './02-shell.js';
import { demoBarHtml, slotRowHtml } from './03-today.js';
import { withAiText } from './04k-aitext.js';
import { lines } from './07-setup.js';
function topicMatches(w) {
  const q = AC.fold(view.tpcSearch || '').trim();
  return AC.topicsOf(S, w.id).map(r => {
    const v = AC.topicCurrent(r); if (!v) return null;
    if (!q) return { r, v, n: 0 };
    const inTitle = AC.fold(v.title).includes(q);
    const n = AC.fold(v.text).split(q).length - 1 + (inTitle ? 1 : 0);
    return n ? { r, v, n } : null;
  }).filter(Boolean);
}
function mxCountsHtml(w) {
  const mc = AC.matrixCounts(S, w.id);
  return `<span>${mc.total} ô:</span><span class="st st-ok">${mc.APPROVED} đã duyệt</span><span class="st st-need">${mc.DRAFT} chưa duyệt</span><span class="st st-need">${mc.EMPTY} trống</span><span class="st st-off">${mc.CANCELLED} đã hủy</span>`;
}
function cellBtnHtml(w, row, col) {
  const c = AC.cellAt(S, w.id, row.id, col.id, col.k);
  if (!c) return '<span class="faint small">—</span>';
  const v = AC.cellView(S, c);
  const [label, cls] = CELL_STATE[v.state];
  const ws = v.text ? AC.cellWarnings(S, c, v.text) : [];
  const sum = AC.summarizeWarnings(ws);
  const need = v.state === 'DRAFT' || v.state === 'EMPTY';
  const noCase = col.kind === 'cauchuyen' && !(AC.topicCurrent(row) || {}).hasCase;
  const used = AC.slotsUsingCell(S, c.id).length;
  const quick = v.state === 'DRAFT' && w.status !== 'CONFIRMED' && AC.topicCurrent(row)
    ? `<button class="slot-ok cell-ok" data-act="cell-approve-quick" data-id="${esc(c.id)}" aria-label="Duyệt ô Topic ${row.order}, Cột ${esc(col.label || col.name)}${ws.length ? ` (có ${ws.length} cảnh báo)` : ''}">Duyệt</button>` : '';
  return `<div class="cellwrap${quick ? ` has-ok${need ? ' need' : ''}` : ''}"><button class="cellbtn ${need ? 'need' : ''}" data-act="open-cell" data-id="${esc(c.id)}" aria-label="Topic ${row.order}, Cột ${esc(col.label || col.name)}: ${label}">
      <span class="row" style="justify-content:space-between;gap:4px"><span class="st ${cls}">${label}</span>${v.gen ? `<span class="mono small">${v.gen.total}</span>` : ''}</span>
      ${ws.length ? `<span class="small" style="color:${sum.errors ? 'var(--bad)' : 'var(--warn)'}">${sum.label}</span>` : ''}
      ${noCase ? `<span class="small muted">Topic không có trường hợp${v.state === 'EMPTY' ? ' · nên Hủy' : ''}</span>` : ''}
      ${v.text ? `<span class="ex">${esc(v.text.replace(/\[[^\]]+\]\s*/g, '').slice(0, 120))}</span>` : ''}
      ${used ? `<span class="small faint">nuôi ${used} slot</span>` : ''}
    </button>${quick}</div>`;
}
function mxTableHtml(w) {
  const cols = AC.weekLanes(S, w).map(l => { const c = AC.byId(S.columns, l.colId); return c ? Object.assign({}, c, { k: l.k, label: l.label }) : null; }).filter(Boolean); // mỗi vị trí Cột một cột hiển thị (10.53)
  const ms = topicMatches(w); const q = (view.tpcSearch || '').trim();
  const locked = w.status === 'CONFIRMED';
  const mdone = AC.matrixDone(S, w.id);
  if (!ms.length) return `<p class="muted small" style="padding:8px 2px">Không có Topic nào chứa "${esc(q)}".</p>`;
  const rowHead = ({ r, v, n }) => {
    const tw = AC.topicWarnings(S, r, v);
    return `<b>Topic ${r.order}</b> <span class="faint">v${v.n}/${r.versions.length}</span>${q && n ? ` <span class="small muted">· ${n} chỗ khớp</span>` : ''}<br>
      <button class="linkbtn small" data-act="open-topic" data-id="${esc(r.id)}">${esc(v.title)}</button><br>
      <span class="small muted">${v.words.toLocaleString('vi-VN')} chữ</span>${tw.length ? ` <span class="small" style="color:var(--warn)">· ${tw.length} lưu ý</span>` : ''}<br>
      ${locked ? '' : `<button class="linkbtn small" data-act="topic-edit" data-id="${esc(r.id)}" ${mdone ? 'disabled' : ''}>Sửa</button> · <button class="linkbtn small danger" data-act="topic-remove" data-id="${esc(r.id)}" ${mdone ? 'disabled' : ''}>Xóa</button>`}`;
  };
  const head = `<div class="mc mhd">Topic \\ Cột</div>${cols.map(c => `<div class="mc mhd">${esc(c.label)}</div>`).join('')}`;
  const rowsHtml = ms.map(m => `<div class="mc mrow">${rowHead(m)}</div>${cols.map(col => `<div class="mc">${cellBtnHtml(w, m.r, col)}</div>`).join('')}`).join('');
  const cards = ms.map(m => `<section class="panel mcard"><div>${rowHead(m)}</div><div class="cells">${cols.map(col => `<div class="stack" style="gap:4px"><span class="small muted">${esc(col.label)}</span>${cellBtnHtml(w, m.r, col)}</div>`).join('')}</div></section>`).join('');
  return `<div class="matrix-wrap"><div class="matrix" style="grid-template-columns: 190px repeat(${cols.length}, minmax(130px, 1fr))">${head}${rowsHtml}</div></div><div class="mcards">${cards}</div>`;
}

RENDERERS.matrix = () => {
  const start = curStart(); const w = curWeek(); const l = AC.weekLabelOf(start);
  const file = w ? AC.topicFileOf(S, w.id) : null;
  const rows = w ? AC.topicsOf(S, w.id) : [];
  const locked = !!w && w.status === 'CONFIRMED';
  const wid = AC.weekIdOf(start);
  // Matrix đã khóa (mục 10.89): không nạp Topic được, nút mờ kèm lý do
  const mdone = !!w && AC.matrixDone(S, w.id); const mdis = mdone ? `disabled title="${esc(AC.MATRIX_LOCK_MSG)}"` : '';
  const importBtn = locked ? '' : rows.length
    ? `<button class="btn primary" data-act="topic-import" data-mode="add" ${mdis}>${icon('plus')} Nạp thêm Topic</button><button class="btn ghost" data-act="topic-import" data-mode="replace" ${mdis}>Nạp lại tất cả</button>`
    : `<button class="btn primary" data-act="topic-import" data-mode="replace" ${mdis}>${icon('plus')} Nạp Topic</button>`;
  const helpBtns = `<button class="btn ghost" data-act="show-template" data-t="topic">Xem tệp mẫu</button><button class="btn ghost" data-act="show-template" data-t="agentPrompt">Lệnh cho agent bên ngoài</button>`;
  const head = `<div class="page-head"><div><span class="eyebrow">Matrix · ${esc(l.range)}</span><h1>${file && file.theme ? esc(file.theme) : 'Ma trận Topic × Cột'}</h1></div></div>`;
  const demo = demoBarHtml(['topics', 'write', 'approve', 'deal', 'clear']);
  if (!rows.length) return `${head}${lockBannerHtml(w)}${demo}<section class="focus">${progressHtml(wid)}</section>
    <div class="empty"><p>Tuần này chưa có Topic. Nạp một tệp .md gồm Bối cảnh chung và các Topic (mỗi Topic một đề mục ##, khoảng 2.000 chữ), do bạn hoặc agent bên ngoài chuẩn bị. Số Topic tùy bạn.${w ? '' : ' Tuần chưa có slot nhưng bạn vẫn nạp Topic trước được; Lập tuần ở Dashboard.'}</p><div class="row">${importBtn}${helpBtns}</div></div>`;
  const words = rows.reduce((a, r) => a + ((AC.topicCurrent(r) || {}).words || 0), 0);
  return `${head}${lockBannerHtml(w)}${demo}<section class="focus">${nextBandHtml(wid, true)}${progressHtml(wid)}</section>
    <section class="work stack" aria-label="Ma trận">
      <div class="work-bar"><div class="row small muted" id="mx-counts">${mxCountsHtml(w)}</div></div>
      ${mxToolsHtml(w)}
      <div id="mx-table">${mxTableHtml(w)}</div>
    </section>
    <section class="panel quiet stack secondary">
      <header><div><span class="eyebrow">Tệp Topic</span><h2>${esc(file && (file.theme || file.title) || 'Chưa đặt tiêu đề')}</h2></div><span class="small muted">${rows.length} Topic · ${words.toLocaleString('vi-VN')} chữ · nạp lúc <span class="mono">${esc(file ? file.importedAt.replace('T', ' ') : '')}</span></span></header>
      <div class="row">${importBtn}${helpBtns}</div>
      ${file && file.context ? `<div class="stack" style="gap:4px"><span class="eyebrow">Bối cảnh chung</span><p class="small">${esc(file.context)}</p></div>` : ''}
      <div class="field"><label for="tpc-search">Tìm trong Topic</label><input id="tpc-search" type="search" autocomplete="off" placeholder="Gõ từ khóa, ví dụ: phát biểu" value="${esc(view.tpcSearch || '')}" data-input="topic-search"></div>
      <div id="tpc-count" class="small muted" aria-live="polite">${searchCountText(w)}</div>
    </section>`;
};
function mxToolsHtml(w) {
  const wg = AC.writeGate(S, w.id);
  const bulk = AC.bulkApprovable(S, w.id, true).length;
  const run = view.mxRun;
  const done = AC.matrixDone(S, w.id);
  const cg = AC.completeGate(S, w.id);
  const locked = w.status === 'CONFIRMED';
  const writeBtn = run
    ? `<button class="btn danger" data-act="mx-stop">Dừng</button><span class="small" id="mx-run" aria-live="polite">Đang viết ${run.done}/${run.total} ô…</span>`
    : `<button class="btn ${wg.ok && !done ? 'primary' : ''}" data-act="mx-write" ${wg.ok && !done ? '' : 'disabled'} title="${esc(done ? AC.MATRIX_LOCK_MSG : wg.ok ? (wg.redo ? `Viết lại ${wg.count} ô Đã hủy` : `Viết ${wg.count} ô Trống`) : wg.reasons.join('; '))}">${wg.redo ? 'Viết lại ma trận' : 'Viết ma trận'}${wg.ok && !done ? ` (${wg.count} ô)` : ''}</button>`;
  const lockBtn = `<button class="btn ${done ? '' : cg.ok && !run ? 'primary' : ''}" data-act="mx-lock" data-testid="mx-lock" aria-pressed="${done}" ${(done ? locked : !cg.ok) || run ? 'disabled' : ''} title="${esc(done ? (locked ? 'Tuần đã chốt. Mở lại tuần trước.' : 'Bấm để mở khóa Matrix và sửa ô, Topic') : cg.ok ? 'Bấm để khóa Matrix, sau đó mới Viết tất cả ở Dashboard' : 'Chưa khóa được: ' + cg.reasons.join('; '))}">${icon(done ? 'lock' : 'unlock')} ${done ? 'Đã khóa' : 'Khóa Matrix'}</button>`;
  return `<div class="row" id="mx-tools">
      ${writeBtn}
      ${bulk && !run && !done ? `<button class="btn" data-act="mx-bulk">Duyệt tất cả (${bulk} ô)</button>` : ''}
      ${lockBtn}
    </div>
    <p class="${done ? 'sr' : 'small faint'}" id="deal-why">${done ? `${AC.MATRIX_LOCK_MSG} Qua Dashboard bấm "Viết tất cả".` : cg.ok ? 'Mọi ô đã xử lý: bấm Khóa Matrix, rồi Viết tất cả ở Dashboard.' : `${!wg.ok && !run ? `Viết ma trận: ${esc(wg.reasons.join('; '))}. ` : ''}Chưa khóa được: ${esc(cg.reasons.join('; '))}.`}</p>`;
}
ACTIONS['mx-lock'] = () => {
  const w = curWeek(); if (!w) return;
  if (AC.matrixDone(S, w.id)) { const r = AC.reopenMatrix(S, w.id); if (!r.ok) return toast(r.error, 'bad'); return commit('Đã mở khóa Matrix.'); }
  const r = AC.completeMatrix(S, w.id); if (!r.ok) return toast(r.error, 'bad');
  commit('Đã khóa Matrix. Qua Dashboard bấm "Viết tất cả".');
};
// ---- Viết ma trận (MTX-01): viết lần lượt từng ô, có nút Dừng ----
ACTIONS['mx-write'] = () => {
  const w = curWeek(); if (!w || view.mxRun) return;
  const g = AC.writeGate(S, w.id); if (!g.ok) return toast(g.reasons.join('; '), 'bad');
  view.mxRun = { weekId: w.id, total: g.count, done: 0, stop: false, mode: g.mode };
  render(); mxStep();
};
async function mxStep() {
  const run = view.mxRun; if (!run) return;
  const q = AC.writeQueue(S, run.weekId, run.mode === 'redo' ? 'redo' : undefined);
  if (run.stop || !q.length || AC.weekIdOf(curStart()) !== run.weekId) {
    view.mxRun = null; save();
    const left = AC.writeQueue(S, run.weekId, run.mode === 'redo' ? 'redo' : undefined).length;
    render();
    toast(run.stop || left ? `Đã viết ${run.done} ô · còn ${left} ô ${run.mode === 'redo' ? 'Đã hủy' : 'Trống'}.` : `Đã viết ${run.done} ô. Mời bạn duyệt từng ô.`);
    return;
  }
  const r = await withAiText(C => AC.writeCellNow(C, q[0]), { noAi: run.mock, fallbackAll: true, progress: run });
  if (r.busy && !run.stop) { setTimeout(mxStep, MX_BUSY_WAIT); return; }   // AI đang bận việc khác: chờ rồi thử lại, không bỏ hàng chờ
  if (r.fellBack) run.mock = true;
  if (!r.ok) { view.mxRun = null; save(); render(); toast(r.error, 'bad'); return; }
  run.done++; save();
  if (view.screen === 'matrix') {
    const t = document.getElementById('mx-table'), c = document.getElementById('mx-counts'), m = document.getElementById('mx-run');
    if (t) t.innerHTML = mxTableHtml(curWeek());
    if (c) c.innerHTML = mxCountsHtml(curWeek());
    if (m) m.textContent = `Đang viết ${run.done}/${run.total} ô…`;
  }
  setTimeout(mxStep, MX_DELAY);
}
const MX_BUSY_WAIT = 1500;
const MX_DELAY = 160;   // mô phỏng thời gian AI viết một ô
ACTIONS['mx-stop'] = () => { if (view.mxRun) view.mxRun.stop = true; };
// Duyệt tất cả (10.56): dùng chung cho ô (Matrix, Dashboard bước 4) và slot (Dashboard bước 6)
async function approveAllFlow(kind, w) {
  const isCell = kind === 'cell';
  const clean = isCell ? AC.bulkApprovable(S, w.id) : AC.slotsApprovable(S, w.id);
  const warned = isCell ? AC.bulkWarned(S, w.id) : AC.slotsWarned(S, w.id);
  const unit = isCell ? 'ô' : 'slot';
  const name = x => { if (isCell) { const r = AC.byId(S.topics, x.cell.topicId); return `Topic ${r ? r.order : '?'} × ${AC.cellLabel(S, x.cell)}`; } return `${x.slot.time} ${AC.dmy(x.slot.date)} · ${fmtName(x.slot.formatId)}`; };
  if (!clean.length && !warned.length) return toast(`Không có ${unit} nào chờ duyệt.`, 'bad');
  const extra = warned.length ? `<label class="check"><input type="checkbox" data-collect="all" ${clean.length ? '' : 'checked'}> Duyệt cả ${warned.length} ${unit} có cảnh báo</label>
    <ul class="small" style="max-height:180px;overflow:auto;margin:6px 0 0">${warned.map(x => `<li>${esc(name(x))}: ${esc(AC.summarizeWarnings(x.warnings).label)}</li>`).join('')}</ul>` : '';
  const res = await confirmBox({ title: 'Duyệt tất cả', ok: 'Duyệt', extra,
    body: `<p>${clean.length} ${unit} Chưa duyệt không có cảnh báo sẽ được duyệt.${warned.length ? ` ${warned.length} ${unit} có cảnh báo (chỉ để tham khảo): đánh dấu ô bên dưới nếu muốn duyệt luôn, hoặc để lại xem từng ${unit}.` : ''}</p>` });
  if (!res) return;
  const all = res === true ? false : !!res.all;
  if (!all && !clean.length) return toast(`Chưa duyệt ${unit} nào: đánh dấu "Duyệt cả ${unit} có cảnh báo" hoặc duyệt từng ${unit}.`, 'bad');
  const r = isCell ? AC.approveCellsBulk(S, w.id, null, all) : AC.approveSlotsBulk(S, w.id, null, all);
  commit(`Đã duyệt ${r.approved} ${unit}.${r.left ? ` Còn ${r.left} ${unit} chưa duyệt.` : ''}`);
}
ACTIONS['mx-bulk'] = () => { const w = curWeek(); if (w) return approveAllFlow('cell', w); };
ACTIONS['approve-all'] = () => { const w = curWeek(); if (!w) return; return approveAllFlow(AC.weekProgress(S, w.id).current === 6 ? 'slot' : 'cell', w); };
function searchCountText(w) { const q = (view.tpcSearch || '').trim(); return q ? `${topicMatches(w).length} Topic khớp "${q}"` : ''; }
INPUTS['topic-search'] = el => {
  view.tpcSearch = el.value;
  const w = curWeek(); if (!w) return;
  const t = document.getElementById('mx-table'), cnt = document.getElementById('tpc-count');
  if (t) t.innerHTML = mxTableHtml(w);
  if (cnt) cnt.textContent = searchCountText(w);
};

ACTIONS['topic-remove'] = async el => {
  const w = curWeek(); const r = AC.byId(S.topics, el.dataset.id); if (!w || !r) return;
  const v = AC.topicCurrent(r); const imp = AC.topicImpact(S, w.id, r.id);
  const ok = await confirmBox({ title: `Hủy Topic ${r.order}?`, danger: true, ok: 'Hủy Topic', body: `<p>Bỏ hàng "${esc(v ? v.title : '')}" khỏi ma trận.</p><ul><li>${imp.cells} ô của Topic bị xóa${imp.cellsWithContent ? ` (${imp.cellsWithContent} ô đã có bài, mất cả lịch sử)` : ''}.</li><li>${imp.slots} slot đang lấy bài từ các ô đó về "Chưa có bài".</li></ul>` });
  if (!ok) return;
  const res = AC.removeTopic(S, w.id, r.id);
  if (!res.ok) return toast(res.error, 'bad');
  commit(`Đã hủy Topic. ${res.impact.slots ? `${res.impact.slots} slot về "Chưa có bài".` : ''}`.trim());
};

// ---- Chi tiết Topic: back/next phiên bản, Dùng phiên bản này, Sửa Topic (TPC-05, TPC-08) ----
ACTIONS['open-topic'] = el => showTopic(el.dataset.id, el.dataset.v ? Number(el.dataset.v) : null);
function showTopic(topicId, vn) {
  const r = AC.byId(S.topics, topicId); if (!r) return;
  const cur = AC.topicCurrent(r); if (!cur) return;
  const v = r.versions.find(x => x.n === vn) || cur;
  const isCur = v.n === cur.n;
  const locked = AC.isLocked(S, r.weekId);
  const idx = r.versions.indexOf(v);
  const prev = r.versions[idx - 1], next = r.versions[idx + 1];
  const REASON = { imported: 'nạp tệp', reimported: 'nạp lại tệp', edited: 'sửa tay' };
  closeAllLayers();
  const fieldsHtml = v.fields.message || v.fields.audience || v.fields.angle ? `<dl class="kv">${v.fields.message ? `<dt>Thông điệp</dt><dd>${esc(v.fields.message)}</dd>` : ''}${v.fields.audience ? `<dt>Đối tượng</dt><dd>${esc(v.fields.audience)}</dd>` : ''}${v.fields.angle ? `<dt>Góc nhìn</dt><dd>${esc(v.fields.angle)}</dd>` : ''}</dl>` : '';
  // Chi tiết Topic giữa màn hình, phân cấp: đầu hộp (tên, trạng thái, thao tác) → định hướng → nội dung chính → phiên bản (thu gọn) (mục 10.27)
  const box = openLayer(`<header><div class="dv-head"><span class="eyebrow">Topic ${r.order} · v${v.n}/${r.versions.length}</span><h2>${esc(v.title)}</h2>
      <div class="row dv-meta">${isCur ? '<span class="st st-ok">Hiện hành</span>' : `<span class="st st-off">Bản cũ · hiện hành là v${cur.n}</span>`}<span class="small muted">${esc(REASON[v.reason] || '')} · <span class="mono">${esc(v.createdAt.replace('T', ' '))}</span></span></div>
      <div class="row dv-acts" id="tp-actions">
        ${r.versions.length > 1 ? `<button class="btn icon" data-act="open-topic" data-id="${esc(r.id)}" data-v="${prev ? prev.n : ''}" ${prev ? '' : 'disabled'} aria-label="Phiên bản trước">${icon('left')}</button><button class="btn icon" data-act="open-topic" data-id="${esc(r.id)}" data-v="${next ? next.n : ''}" ${next ? '' : 'disabled'} aria-label="Phiên bản sau">${icon('right')}</button>` : ''}
        ${locked ? '<span class="small faint">Tuần đã chốt nên chỉ xem.</span>' : isCur ? `<button class="btn" data-act="topic-edit" data-id="${esc(r.id)}" ${AC.matrixDone(S, r.weekId) ? 'disabled' : ''}>Sửa Topic</button>` : `<button class="btn primary" data-act="topic-use" data-id="${esc(r.id)}" data-v="${v.n}" ${AC.matrixDone(S, r.weekId) ? 'disabled' : ''}>Dùng phiên bản này</button>`}
      </div></div>
      <button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <section class="dv-sec ctx"><div class="dv-h"><h3>Định hướng</h3><span class="meta small faint">dữ liệu cho AI, không phải chỉ thị</span></div>
        ${fieldsHtml || '<p class="small faint">Topic không ghi thông điệp, đối tượng, góc nhìn.</p>'}
        ${warningsHtml(AC.topicWarnings(S, r, v))}</section>
      <section class="dv-sec main"><div class="dv-h"><h3>Nội dung Topic</h3><span class="meta small faint">${v.words.toLocaleString('vi-VN')} chữ</span></div>
        <div class="content-text rich topic-rich">${topicRich(v.text, foldMarks(v.text, view.tpcSearch))}</div></section>
      ${r.versions.length > 1 ? `<details class="dv-more"><summary>Phiên bản <span class="faint">(${r.versions.length})</span></summary><div class="list">${r.versions.map(x => `<button class="li" data-act="open-topic" data-id="${esc(r.id)}" data-v="${x.n}" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="mono">v${x.n}</span><span class="small">${esc(x.title)} · ${esc(REASON[x.reason] || '')} · <span class="mono">${esc(x.createdAt.replace('T', ' '))}</span></span>${x.n === r.currentVersion ? '<span class="st st-ok">Hiện hành</span>' : x.n === v.n ? '<span class="small muted">đang xem</span>' : ''}</button>`).join('')}</div></details>` : ''}
      <p class="small faint dv-foot">Sửa Topic tạo phiên bản mới: các ô của Topic về Trống để viết lại; slot đang dùng ô của Topic sẽ cần cập nhật. Bài đã viết cho phiên bản cũ vẫn giữ, dùng lại được bằng "Dùng phiên bản này".</p>
    </div>`, 'drawer');
  box.classList.add('center', 'dv');
}
ACTIONS['topic-use'] = async el => {
  const r = AC.byId(S.topics, el.dataset.id); const n = Number(el.dataset.v); if (!r) return;
  const imp = AC.topicVersionImpact(S, r.id);
  const ok = await confirmBox({ title: `Dùng phiên bản ${n} của Topic ${r.order}?`, body: `<p>Ma trận hiện bài và trạng thái mà các ô đã có với phiên bản ${n} (ô chưa từng viết cho bản này sẽ Trống).</p><ul><li>${imp.cells} ô đang có bài theo phiên bản hiện hành sẽ không còn hiện (vẫn giữ trong lịch sử).</li><li>${imp.slots} slot đang dùng ô của Topic này sẽ cần cập nhật.</li></ul>`, ok: 'Dùng phiên bản này' });
  if (!ok) return;
  const res = AC.useTopicVersion(S, r.id, n);
  if (!res.ok) return toast(res.error, 'bad');
  save(); render(); showTopic(r.id); toast(`Topic ${r.order} dùng phiên bản ${n}.`);
};
ACTIONS['topic-edit'] = el => {
  const r = AC.byId(S.topics, el.dataset.id); const v = r && AC.topicCurrent(r); if (!v) return;
  const box = openLayer(`<h2>Sửa Topic ${r.order}</h2>
    <p class="small muted">Lưu tạo phiên bản v${r.versions.length + 1}. Nội dung Topic chỉ là dữ liệu cho AI, không phải chỉ thị.</p>
    <div class="field"><label for="tp-title">Tên Topic</label><input id="tp-title" value="${esc(v.title)}"></div>
    <div class="field"><label for="tp-msg">Thông điệp chính (tùy chọn)</label><input id="tp-msg" value="${esc(v.fields.message || '')}"></div>
    <div class="field"><label for="tp-aud">Đối tượng (tùy chọn)</label><input id="tp-aud" value="${esc(v.fields.audience || '')}"></div>
    <div class="field"><label for="tp-ang">Góc nhìn (tùy chọn)</label><input id="tp-ang" value="${esc(v.fields.angle || '')}"></div>
    <div class="field"><label for="tp-text">Nội dung (Markdown; giữ các đề mục ### như "Trường hợp" để AI lấy đúng chất liệu)</label>${mdEditorHtml('tp-text', v.text, { h: 320 })}</div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" data-act="topic-save" data-id="${esc(r.id)}">Lưu phiên bản mới</button></div>`, 'dialog');
  box.classList.add('wide');
};
ACTIONS['topic-save'] = async el => {
  const r = AC.byId(S.topics, el.dataset.id); if (!r) return;
  const val = id => (document.getElementById(id) || {}).value || '';
  const input = { title: val('tp-title'), text: val('tp-text'), fields: { message: val('tp-msg'), audience: val('tp-aud'), angle: val('tp-ang') } };
  const imp = AC.topicVersionImpact(S, r.id);
  if (imp.cells || imp.slots) {
    const ok = await confirmBox({ title: 'Lưu phiên bản mới?', body: `<ul><li>${imp.cells} ô đã có bài của Topic ${r.order} về Trống cho phiên bản mới (bài cũ vẫn giữ).</li><li>${imp.slots} slot đang dùng các ô đó sẽ cần cập nhật.</li></ul>`, ok: 'Lưu' });
    if (!ok) return;
  }
  const res = AC.editTopic(S, r.id, input);
  if (!res.ok) return toast(res.error, 'bad');
  save(); render(); showTopic(r.id); toast(`Đã lưu Topic ${r.order} v${res.version}.`);
};

// Vị trí từ khóa tìm (không dấu) trong văn bản gốc, để tô trong richText
function foldMarks(text, q) {
  const f = AC.fold(q || '').trim(); if (!f) return [];
  const { out: ft, map } = AC.foldWithMap(text); const r = []; let pos = 0, i;
  while ((i = ft.indexOf(f, pos)) >= 0) { r.push({ s: map[i], e: map[i + f.length - 1] + 1, cls: 'note' }); pos = i + f.length; }
  return r;
}
// ---- Nạp tệp Topic (INP-01..04) ----
let topicImportMode = 'replace'; // 'replace' = nạp lại cả tuần; 'add' = nạp thêm vào cuối (mục 10.51)
ACTIONS['topic-import'] = el => {
  const w = curWeek();
  const had = !!w && AC.topicsOf(S, w.id).length > 0;
  topicImportMode = had && el && el.dataset && el.dataset.mode === 'add' ? 'add' : 'replace';
  const add = topicImportMode === 'add';
  const nHave = had ? AC.topicsOf(S, w.id).length : 0;
  openLayer(`<h2>${add ? 'Nạp thêm Topic' : had ? 'Nạp lại tất cả Topic' : 'Nạp Topic'}</h2>
    <p class="small muted">${add
      ? `Tuần đang có ${nHave} Topic. Các Topic trong tệp mới được xếp xuống cuối ma trận; Topic cũ và bài đã viết giữ nguyên. Tối đa ${AC.TOPIC_MAX} Topic mỗi tuần. Topic trùng hẳn (cùng tên và nội dung) với Topic đã có sẽ được bỏ qua.`
      : `Một tệp .md: tiêu đề # (tùy chọn), Bối cảnh chung (tùy chọn), mỗi Topic một đề mục ##. Không có ## thì cả tệp là 1 Topic. Số Topic tùy bạn (kỹ thuật tối đa ${AC.TOPIC_MAX}).${had ? ' Nạp lại thay toàn bộ Topic của tuần: Topic có nội dung đổi sẽ thành phiên bản mới, Topic không còn trong tệp bị loại. Muốn giữ Topic cũ thì dùng "Nạp thêm Topic".' : ''}`}</p>
    <div class="row"><label class="btn sm" for="inp-file">Chọn tệp .md (được chọn nhiều tệp)</label><input id="inp-file" type="file" multiple accept=".md,.markdown,.txt,text/markdown,text/plain" class="sr" data-change="topic-file"></div>
    <div class="field"><label for="inp-text">Hoặc dán nội dung tệp</label><textarea id="inp-text" spellcheck="false" style="min-height:220px;font-family:var(--f-mono);font-size:var(--fs-2)" data-input="topic-text"></textarea></div>
    <div id="inp-preview" class="small muted" aria-live="polite">Chưa có nội dung.</div>
    <div id="inp-norm"></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="inp-go" data-act="topic-go" disabled>${add ? 'Thêm Topic' : 'Nạp Topic'}</button></div>`, 'dialog').classList.add('wide');
};
function inputPreview() {
  const ta = document.getElementById('inp-text'), pv = document.getElementById('inp-preview'), go = document.getElementById('inp-go');
  const w = curWeek();
  if (!ta || !pv) return;
  const nb = document.getElementById('inp-norm'); if (nb) nb.innerHTML = '';
  if (!ta.value.trim()) { pv.className = 'small muted'; pv.textContent = 'Chưa có nội dung.'; go.disabled = true; return; }
  const add = topicImportMode === 'add';
  const r = add ? AC.previewAddTopics(S, AC.weekIdOf(curStart()), ta.value) : AC.previewTopics(S, AC.weekIdOf(curStart()), ta.value);
  if (nb && r.normalized) nb.innerHTML = topicNormHtml(r);
  if (!r.ok) { pv.className = 'note bad'; pv.textContent = r.errors.map(e => e.text).join(' '); go.disabled = true; return; }
  if (add) {
    pv.className = r.warnings.length ? 'note warn' : 'note good';
    pv.innerHTML = `<b>Thêm ${r.add.length} Topic</b> (tổng sau khi thêm: ${r.total}/${AC.TOPIC_MAX}): ${r.add.map(i => `${esc(i.title)} (${i.words} chữ)`).join(' · ')}${r.skipped.length ? `<br>Bỏ qua ${r.skipped.length} Topic đã có: ${r.skipped.map(i => esc(i.title)).join(' · ')}` : ''}${r.warnings.length ? `<br>${r.warnings.map(x => esc(x.text)).join('<br>')}` : ''}`;
    go.disabled = false; return;
  }
  const ch = r.changes;
  const diff = w && AC.topicsOf(S, w.id).length ? ` · đổi ${ch.changed.length}, thêm ${ch.added.length}, bớt ${ch.removed.length}, giữ ${ch.same.length}` : '';
  pv.className = r.warnings.length ? 'note warn' : 'note good';
  pv.innerHTML = `<b>${r.topics.length} Topic</b>${r.context ? ' + Bối cảnh chung' : ''}${diff}: ${r.topics.map(i => `${esc(i.title)} (${i.words} chữ)`).join(' · ')}${r.warnings.length ? `<br>${r.warnings.map(x => esc(x.text)).join('<br>')}` : ''}`;
  go.disabled = false;
}
// Xem trước khi nạp (mục 10.30): thay đổi do chuẩn hoá theo Khung Topic, mục còn thiếu, Topic đã trình bày
function topicNormHtml(r) {
  const n = r.normalized;
  const ch = n.changes.length ? `<div class="tf-changes"><b>Đã chuẩn hoá theo Khung Topic</b> <span class="faint">(tệp gốc vẫn được giữ)</span><ul>${n.changes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '<p class="small faint">Tệp đã đúng Khung Topic, không cần chuẩn hoá.</p>';
  const miss = n.missing.length ? `<div class="note warn small">${n.missing.map(m => `Topic ${m.order}${m.title ? ` "${esc(m.title)}"` : ''} thiếu mục: ${m.names.map(esc).join(', ')}.`).join('<br>')}</div>` : '';
  const pv = r.ok && r.topics.length ? `<details class="tf-prev" open><summary>Xem trước ${r.topics.length} Topic sau chuẩn hoá</summary>${r.topics.map(i => `<div class="tf-prev-t"><span class="eyebrow">Topic ${i.order}</span><h3>${esc(i.title)}</h3><div class="content-text rich topic-rich">${topicRich(i.text)}</div></div>`).join('')}</details>` : '';
  return `<div class="stack" style="gap:8px">${ch}${miss}${pv}</div>`;
}
INPUTS['topic-text'] = () => inputPreview();
CHANGES['topic-file'] = async el => {
  const files = Array.from(el.files || []); if (!files.length) return;
  if (files.some(f => f.size > 2 * 1024 * 1024)) { toast('Có tệp quá lớn (tối đa 2 MB mỗi tệp).', 'bad'); return; }
  let read;
  try { read = await Promise.all(files.map(f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok({ name: f.name, text: String(r.result) }); r.onerror = no; r.readAsText(f); }))); }
  catch (e) { toast('Không đọc được tệp.', 'bad'); return; }
  const ta = document.getElementById('inp-text'); if (!ta) return;
  if (read.length === 1) { ta.value = read[0].text; inputPreview(); return; }
  const m = AC.mergeTopicFiles(read);
  ta.value = m.text; inputPreview();
  const pv = document.getElementById('inp-preview');
  if (pv) pv.insertAdjacentHTML('beforeend', `<br><b>Thứ tự ${m.order.length} tệp:</b> ${m.order.map((o, i) => `${i + 1}. ${esc(o.name)} → ${esc(o.title)}`).join(' · ')}`);
};
ACTIONS['topic-go'] = async () => {
  const ta = document.getElementById('inp-text'); if (!ta) return;
  const w = ensureCurWeek(); if (!w) return toast('Không mở được tuần.', 'bad');
  const md = ta.value;
  if (topicImportMode === 'add') {
    const ra = AC.addTopics(S, w.id, md);
    if (!ra.ok) { toast(ra.errors[0].text, 'bad'); return; }
    closeLayer(); save(); render(); toast(`Đã thêm ${ra.add.length} Topic${ra.skipped.length ? `, bỏ qua ${ra.skipped.length} trùng` : ''}.`);
    return;
  }
  const p = AC.previewTopics(S, w.id, md);
  if (!p.ok) { toast(p.errors[0].text, 'bad'); return; }
  const ch = p.changes;
  if (ch.changed.length || ch.removed.length) {
    const lines = [];
    if (ch.changed.length) lines.push(`Topic ${ch.changed.join(', ')} đổi nội dung → phiên bản mới, các ô của Topic đó về Trống để viết lại.`);
    if (ch.added.length) lines.push(`Thêm Topic ${ch.added.join(', ')}.`);
    if (ch.removed.length) lines.push(`Bớt Topic ${ch.removed.join(', ')}: ô của Topic đó bị loại.`);
    lines.push(`${p.impact.cells} ô đã có bài thuộc Topic đổi/bớt; ${p.impact.slots} slot đang dùng các ô đó sẽ cần cập nhật hoặc về "Chưa có bài".`);
    const ok = await confirmBox({ title: 'Nạp lại Topic?', body: lines.map(x => `<p>${esc(x)}</p>`).join(''), ok: 'Nạp lại' });
    if (!ok) return;
  }
  const r = AC.importTopics(S, w.id, md);
  if (!r.ok) { toast(r.errors[0].text, 'bad'); return; }
  closeLayer(); save(); render(); toast(`Đã nạp ${r.topics.length} Topic.`);
};

// ---- Chi tiết ô: Duyệt · Tạo lại · Sửa · Hủy · back/next lượt sinh · Dùng bản này (MTX-02..06) ----
ACTIONS['open-cell'] = el => showCell(el.dataset.id, el.dataset.gen ? Number(el.dataset.gen) : null);
function showCell(cellId, browseN) {
  const c = AC.byId(S.cells, cellId); if (!c) return;
  const row = AC.byId(S.topics, c.topicId); const col = AC.byId(S.columns, c.columnId);
  if (!row || !col) return;
  const v = AC.cellView(S, c); const iv = AC.topicCurrent(row);
  const locked = AC.isLocked(S, c.weekId);
  const noCase = AC.cellNoCase(S, c);
  // Bản đang xem: mặc định bản hiện hành; back/next đi qua mọi lượt sinh (mọi phiên bản Topic)
  const g = c.gens.find(x => x.n === browseN) || v.gen || null;
  const isCur = !!g && !!v.gen && g.n === v.gen.n;
  const rev = isCur ? v.editRev : (g && g.edits.length ? g.edits[g.edits.length - 1].rev : 0);
  const text = g ? AC.genText(g, rev) : '';
  const imgP = g ? AC.genImagePrompt(g, rev) : '';
  const ws = text && isCur ? AC.cellWarnings(S, c, text) : [];
  const [label, cls] = CELL_STATE[v.state];
  const used = AC.slotsUsingCell(S, c.id);
  const gi = g ? c.gens.indexOf(g) : -1;
  const prev = c.gens[gi - 1], next = c.gens[gi + 1];
  const unit = col.hardRules.lengthUnit;
  const mdone = AC.matrixDone(S, c.weekId);
  const btn = (act, lbl, extra = '') => `<button class="btn ${extra}" data-act="${act}" data-id="${esc(c.id)}" ${mdone ? 'disabled' : ''}>${lbl}</button>`;
  let actions = '';
  if (locked) actions = '<span class="small faint">Tuần đã chốt nên chỉ xem. Muốn sửa: Mở lại để sửa.</span>';
  else if (g && !isCur) actions = `<button class="btn primary" data-act="cell-use" data-id="${esc(c.id)}" data-gen="${g.n}" ${mdone ? 'disabled' : ''}>Dùng bản này</button>`;
  else {
    if (v.state === 'DRAFT') actions += btn('cell-approve', 'Duyệt', 'primary');
    if (!noCase) actions += btn('cell-regen', v.state === 'EMPTY' ? 'Viết ô này' : 'Tạo lại', v.state === 'EMPTY' ? 'primary' : '');
    if (v.gen) actions += btn('cell-edit', 'Sửa');
    if (v.gen && v.state !== 'CANCELLED' && ws.some(w => w.id === 'HR-13')) actions += btn('cell-reformat', 'Định dạng lại');
    if (v.state !== 'CANCELLED') actions += btn('cell-cancel', 'Hủy ô', noCase ? 'primary' : 'danger');
  }
  closeAllLayers();
  // Chi tiết Cell giữa màn hình (mục 10.15), phân cấp như Topic (mục 10.27): định hướng Cột → bài của ô → cảnh báo, điểm → ảnh → slot → lịch sử (thu gọn)
  const cellBox = openLayer(`
    <header><div class="dv-head"><span class="eyebrow">Topic ${row.order}${iv ? ` v${iv.n}` : ''} × Cột ${esc(AC.cellLabel(S, c))}</span><h2>${esc(iv ? iv.title : '')}</h2>
      <div class="row dv-meta"><span class="st ${cls}">${label}</span>${g ? `<span class="small muted">${isCur ? '' : '<b>Đang xem bản cũ</b> · '}bản ${g.n}/${c.gens.length}${rev ? ` · sửa tay lần ${rev}` : ''} · viết từ Topic v${g.topicVersion} · <span class="mono">${esc(g.createdAt.replace('T', ' '))}</span></span>` : ''}</div>
      <div class="row dv-acts" id="cell-actions">
        ${c.gens.length > 1 ? `<button class="btn icon" data-act="open-cell" data-id="${esc(c.id)}" data-gen="${prev ? prev.n : ''}" ${prev ? '' : 'disabled'} aria-label="Bản trước">${icon('left')}</button><button class="btn icon" data-act="open-cell" data-id="${esc(c.id)}" data-gen="${next ? next.n : ''}" ${next ? '' : 'disabled'} aria-label="Bản sau">${icon('right')}</button>` : ''}
        ${actions}
      </div></div>
      <button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <section class="dv-sec ctx"><div class="dv-h"><h3>Chức năng của Cột ${esc(col.name)}</h3></div><p class="small">${esc(col.guideMd)}</p></section>
      ${g && (isCur ? v.state !== 'CANCELLED' : true) ? `<section class="dv-sec main"><div class="dv-h"><h3>Bài của ô</h3><span class="meta small faint">${AC.lengthOf(text, unit)} ${unit === 'words' ? 'chữ' : 'ký tự'} <span class="mock">Mô phỏng</span></span></div><div class="content-text rich">${richText(text, warnMarks(ws))}</div></section>
        <div class="dv-grid">${isCur ? `<section class="dv-sec"><div class="dv-h"><h3>Cảnh báo</h3></div>${warningsHtml(ws)}</section>` : ''}
          <section class="dv-sec"><div class="dv-h"><h3>Điểm AI</h3></div>${scoreHtml(g.scores, g.total, g.tip, col.criteria, g.ai)}</section></div>
        <section class="dv-sec"><div class="dv-h"><h3>Gợi ý ảnh</h3></div><p class="small">${esc(imgP || '(chưa có)')}</p><p class="small faint">Prompt này đi theo ô: khi Viết slot, ô ảnh của slot nhận prompt này.</p></section>`
      : `<section class="dv-sec main"><div class="empty"><p>${noCase ? 'Topic không có trường hợp cụ thể nên ô Câu chuyện không được viết (không bịa trường hợp). Nên Hủy ô; ô hủy được tính là đã xử lý khi khóa Matrix.' : v.state === 'CANCELLED' ? 'Ô đã hủy. Bấm Tạo lại để viết bài mới, hoặc xem bản cũ bằng mũi tên rồi "Dùng bản này".' : 'Ô chưa có bài cho phiên bản Topic hiện hành. Bấm "Viết ô này" hoặc "Viết ma trận" để viết mọi ô Trống.'}</p></div></section>`}
      ${used.length ? `<section class="dv-sec"><div class="dv-h"><h3>Đang nuôi ${used.length} slot</h3></div><p class="small faint">Tạo lại, Sửa, Hủy hoặc Dùng bản khác sẽ làm các slot này "cần cập nhật".</p><div class="list">${used.map(s => slotRowHtml(s, true)).join('')}</div></section>` : ''}
      ${isCur || !g ? `<details class="dv-more" id="cell-prompt"><summary>Lệnh cho AI <span class="faint">(khung trình bày của Cột)</span></summary><div class="row" style="justify-content:flex-end;margin:6px 0"><button class="btn sm" data-act="cell-prompt-copy" data-id="${esc(c.id)}">Chép lệnh</button></div><pre class="prompt-pre">${esc(AC.cellPrompt(S, c.id))}</pre></details>` : ''}
      ${c.gens.length ? `<details class="dv-more"${c.gens.length > 1 ? ' open' : ''}><summary>Lịch sử ô <span class="faint">(${c.gens.length} bản)</span></summary><div class="list">${c.gens.map(x => `<button class="li" data-act="open-cell" data-id="${esc(c.id)}" data-gen="${x.n}" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="mono">bản ${x.n}</span><span class="small">viết từ Topic v${x.topicVersion}${x.edits.length ? ` · ${x.edits.length} lần sửa` : ''} · <span class="mono">${esc(x.createdAt.replace('T', ' '))}</span></span>${v.gen && v.gen.n === x.n ? '<span class="st st-ok">Hiện hành</span>' : g && g.n === x.n ? '<span class="small muted">đang xem</span>' : ''}</button>`).join('')}</div></details>` : ''}
    </div>`, 'drawer');
  cellBox.classList.add('center', 'dv');
}
function cellDone(c, msg, res) {
  if (!res.ok) return toast(res.error, 'bad');
  save(); render(); showCell(c.id); if (msg) toast(msg);
}
ACTIONS['cell-approve'] = async el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const v = AC.cellView(S, c); const n = AC.cellWarnings(S, c, v.text).length;
  if (n) {
    const ok = await confirmBox({ title: 'Duyệt ô có cảnh báo?', body: `<p>Ô này có ${n} cảnh báo. Cảnh báo chỉ để tham khảo; bạn vẫn duyệt được.</p>`, ok: 'Vẫn duyệt' });
    if (!ok) return;
  }
  cellDone(c, 'Đã duyệt ô.', AC.approveCell(S, c.id));
};
// Duyệt ngay trên ô trong Matrix (mục 10.55): ô có cảnh báo vẫn hỏi xác nhận; không mở hộp chi tiết
ACTIONS['cell-approve-quick'] = async el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const v = AC.cellView(S, c); const n = AC.cellWarnings(S, c, v.text).length;
  if (n && !(await confirmBox({ title: 'Duyệt ô có cảnh báo?', body: `<p>${esc(AC.cellLabel(S, c))} có ${n} cảnh báo. Cảnh báo chỉ để tham khảo; bạn vẫn duyệt được.</p>`, ok: 'Vẫn duyệt' }))) return;
  const r = AC.approveCell(S, c.id);
  if (r && r.ok === false) return toast(r.error || 'Không duyệt được ô.', 'bad');
  commit(`Đã duyệt ô ${AC.cellLabel(S, c)}.`);
};
ACTIONS['cell-regen'] = async el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const was = AC.cellView(S, c).state;
  const res = await withAiText(C => AC.regenCell(C, c.id));
  cellDone(c, res.ok ? (was === 'EMPTY' ? 'Đã viết ô.' : `Đã tạo bản ${res.gen.n}. Bản cũ vẫn trong lịch sử.`) : '', res);
};
ACTIONS['cell-cancel'] = async el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const used = AC.slotsUsingCell(S, c.id).length;
  const ok = await confirmBox({ title: 'Hủy ô này?', body: `<p>Ô chuyển sang "Đã hủy" và được tính là đã xử lý khi khóa Matrix. Bài cũ vẫn giữ trong lịch sử; Tạo lại để viết lại.</p>${used ? `<p>${used} slot đang dùng ô này sẽ cần cập nhật.</p>` : ''}`, ok: 'Hủy ô', danger: true });
  if (!ok) return;
  cellDone(c, 'Đã hủy ô.', AC.cancelCellNow(S, c.id));
};
ACTIONS['cell-use'] = el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  cellDone(c, `Ô dùng bản ${el.dataset.gen}, chờ duyệt lại.`, AC.useCellGen(S, c.id, Number(el.dataset.gen)));
};
ACTIONS['cell-edit'] = el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const v = AC.cellView(S, c);
  const col = AC.byId(S.columns, c.columnId);
  const box = openLayer(`<h2>Sửa ô</h2>
    <p class="small muted">Lưu thành một bản sửa của bản ${v.gen.n}; ô về Chưa duyệt. Mỗi đoạn là một đề mục "## Tên đoạn" (${esc((col ? col.structure : []).join(', '))}) để kiểm tra cấu trúc.</p>
    <div class="field"><label for="ce-text">Bài của ô</label>${mdEditorHtml('ce-text', v.text, { h: 320, ai: true, attrs: `data-cell="${esc(c.id)}"` })}</div>
    <div class="field"><label for="ce-img">Gợi ý ảnh</label><textarea id="ce-img" style="min-height:80px">${esc(v.imagePrompt)}</textarea></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" data-act="cell-save" data-id="${esc(c.id)}">Lưu</button></div>`, 'dialog');
  box.classList.add('wide');
};
// Định dạng lại (mục 10.28): sửa khung trình bày, giữ nguyên chữ; lưu thành một bản sửa
ACTIONS['cell-reformat'] = el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  cellDone(c, 'Đã định dạng lại theo khung trình bày. Ô chờ duyệt lại.', AC.reformatCell(S, c.id));
};
ACTIONS['cell-prompt-copy'] = el => copyText(AC.cellPrompt(S, el.dataset.id));
ACTIONS['cell-save'] = el => {
  const c = AC.byId(S.cells, el.dataset.id); if (!c) return;
  const res = AC.editCell(S, c.id, document.getElementById('ce-text').value, document.getElementById('ce-img').value);
  cellDone(c, 'Đã lưu bản sửa. Ô chờ duyệt lại.', res);
};

ACTIONS['show-template'] = el => {
  const t = el.dataset.t;
  const title = { topic: 'Tệp Topic mẫu', agentPrompt: 'Lệnh mẫu cho agent bên ngoài', brand: 'Mẫu Thương hiệu', voice: 'Mẫu Giọng văn', column: 'Mẫu Cột', format: 'Mẫu Format' }[t] || 'Mẫu';
  openLayer(`<h2>${esc(title)}</h2>
    ${t === 'agentPrompt' ? '<p class="small muted">Dán lệnh này cho agent bạn dùng để làm research; kết quả nạp thẳng ở Matrix.</p>' : ''}
    <pre class="content-text mono small" style="max-height:50vh;overflow:auto;white-space:pre-wrap">${esc(tplText(t))}</pre>
    <div class="actions"><button class="btn" data-act="copy-template" data-t="${esc(t)}">Sao chép</button><button class="btn primary" data-act="close-layer">Đóng</button></div>`, 'dialog');
};
// Lệnh cho agent nghiên cứu ghép theo Khung Topic hiện hành (mục 10.30)
function tplText(t) { return t === 'agentPrompt' ? AC.agentPromptOf(S) : AC.TEMPLATES[t]; }
ACTIONS['copy-template'] = el => copyText(tplText(el.dataset.t));
export function copyText(text) {
  try {
    navigator.clipboard.writeText(text).then(() => toast('Đã sao chép.'), () => toast('Không sao chép được. Hãy bôi đen và sao chép thủ công.', 'bad'));
  } catch (e) { toast('Không sao chép được. Hãy bôi đen và sao chép thủ công.', 'bad'); }
}
