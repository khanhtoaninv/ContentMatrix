// ---------- UI · Tuần: lịch tuần, lịch tháng, slot, Cột của tuần ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, RENDERERS, S, view } from './00-state.js';
import { $, chName, chTag, closeAllLayers, closeLayer, colName, commit, confirmBox, curStart, curWeek, esc, fmtFull, fmtName, icon, imgThumb, imgVisual, nowDate, openLayer, richText, save, scoreHtml, slotStateHtml, toast, warnMarks, warningsHtml } from './01-core.js';
import { mediaOk } from './01b-mediastore.js';
import { lockBannerHtml, nextBandHtml, progressHtml, render, setWeekStart } from './02-shell.js';
import { dashHeaderHtml, demoBarHtml } from './03-today.js';
import { openPreview, pvRefresh } from './04b-preview.js';
import { formatLayoutHtml } from './04c-layout.js';
import { confirmBtnHtml, slotPubLine } from './04d-publish.js';
import { slotImageDialog } from './04e-frame.js';
import { withAiText } from './04k-aitext.js';
import { blogCfgAction, slotSeoSectionHtml } from './04l-blog.js';
import { imgToolbar } from './04m-imgtools.js';
function filteredSlots(weekId) {
  const f = view.chFilter;
  return AC.weekSlots(S, weekId).filter(s => !f.length || f.includes(s.channelId));
}
function slotLevel(s) {
  if (s.state === 'PUBLISHED') return 'done';
  if (s.needsUpdate || s.state === 'EMPTY' || s.state === 'DRAFT') return 'need';
  return '';
}
// Chuyên mục của slot = tên Cột của Format (D97, CAL-12)
function segName(s) { const id = AC.slotColumnId(S, s); return id ? colName(id) : s.free && !s.videoId ? 'Không Cột' : ''; }
// Slot chỉ xem (mục 10.24): bài Đã đăng không sửa; tuần đã chốt phải Mở lại để sửa
export function lockNote(s) { return s.state === 'PUBLISHED' ? `Bài đã đăng nên chỉ xem.${s.pub && s.pub.mode === 'manual' ? ' Lỡ đánh dấu nhầm thì bấm "Bỏ đánh dấu" rồi sửa.' : ''}` : 'Tuần đã chốt nên chỉ xem. Muốn sửa: Mở lại để sửa ở Dashboard.'; }
// Bài quá giờ mà chưa đăng được: Đăng lỗi (sửa được, rồi đăng lại)
export const FAIL_TAG = '<span class="st st-bad" title="Đã quá giờ mà chưa đăng được. Bài vẫn sửa được.">Đăng lỗi</span>';
function slotChipHtml(s) {
  // Kéo thả sang ngày khác (mục 10.31): mọi slot chưa đăng
  const drag = s.state !== 'PUBLISHED' ? ` draggable="true" data-drag="${esc(s.id)}" title="Kéo sang ngày khác để đổi ngày đăng"` : '';
  return `<div class="slotwrap"${drag}>${slotChipBtn(s)}${slotGearBtn(s)}</div>`;
}
// Nút trên thẻ slot: Duyệt (tắt khi đã duyệt/đã đăng/chưa có bài/tuần đã chốt) và Cấu hình (bánh răng)
function slotGearBtn(s) {
  if (s.state === 'PUBLISHED') return `<span class="slotbtns"><button class="slot-view" data-act="open-slot" data-id="${esc(s.id)}" title="Xem bài đã đăng (chỉ xem)" aria-label="Xem bài đã đăng: ${esc(`${s.time} ${fmtName(s.formatId)}`)}">${icon('eye')}</button></span>`;
  const w = AC.weekOf(S, s.weekId); const locked = !!w && w.status === 'CONFIRMED';
  const done = s.state === 'APPROVED';
  const why = locked ? 'Tuần đã chốt' : !s.text ? 'Chưa có bài' : done ? 'Slot đã duyệt' : 'Duyệt slot';
  return `<span class="slotbtns"><button class="slot-ok" data-act="slot-approve" data-id="${esc(s.id)}" ${locked || !s.text || done ? 'disabled' : ''} title="${esc(why)}" aria-label="Duyệt slot: ${esc(`${s.time} ${fmtName(s.formatId)}`)}">${done ? icon('check') + ' ' : ''}Duyệt</button><button class="slot-view" data-act="slot-config" data-id="${esc(s.id)}" title="Cấu hình slot" aria-label="Cấu hình slot: ${esc(`${s.time} ${fmtName(s.formatId)}`)}">${icon('gear')}</button></span>`;
}
// Duyệt slot từ thẻ (hỏi lại khi có cảnh báo, như ở View)
ACTIONS['slot-approve'] = async el => {
  const s = AC.byId(S.slots, el.dataset.id); if (!s) return;
  const n = AC.slotWarnings(S, s).length;
  if (n && !(await confirmBox({ title: 'Duyệt slot có cảnh báo?', body: `<p>Slot này có ${n} cảnh báo. Cảnh báo chỉ để tham khảo; bạn vẫn duyệt được.</p>`, ok: 'Vẫn duyệt' }))) return;
  const r = AC.approveSlot(S, s.id); if (!r.ok) return toast(r.error, 'bad');
  commit('Đã duyệt slot.');
};
function slotChipBtn(s) {
  return `<button class="slot ${slotLevel(s)}" data-act="open-slot" data-id="${esc(s.id)}" aria-label="${esc(`${s.time} ${chName(s.channelId)} ${fmtName(s.formatId)}`)}">
    <span class="top"><span class="t">${esc(s.time)}</span>${chTag(s.channelId)}</span>
    <span class="fmt">${esc(fmtName(s.formatId))}</span>
    <span class="seg-col">${esc(segName(s))}</span>
    <span>${slotStateHtml(s)}</span>
    ${slotPubLine(s)}${slotImgsHtml(s)}
  </button>`;
}
// Ô ảnh ngay trên chip slot (CAL-14): ảnh thu nhỏ của từng ô ảnh + số ô đã có ảnh
function slotImgsHtml(s) {
  if (s.videoId) return vidImgsHtml(s);
  if (!s.assets.length) return '<span class="imgs noimg small faint">Không cần ảnh</span>';
  const done = s.assets.filter(a => a.done).length; const n = s.assets.length;
  const shown = s.assets.slice(0, 3);
  return `<span class="imgs" title="${esc(s.assets.map(a => a.name).join(' · '))}"><span class="imgstack">${shown.map((a, i) => `<span class="stk" style="z-index:${shown.length - i}">${imgMini(a)}</span>`).join('')}</span><b class="imgn ${done < n ? 'need' : ''}" aria-label="${done} trên ${n} ảnh">${done < n ? `${done}/${n}` : n}</b>${s.assets.some(a => AC.shareCount(S, a) > 1) ? `<span class="shared" title="Ảnh dùng chung với slot khác" role="img" aria-label="Ảnh dùng chung với slot khác">${icon('link')}</span>` : ''}</span>`;
}
// Slot video từ Short Vid (mục 10.87): ảnh thumbnail của video (cũng là bìa) và biểu tượng thước phim
function vidImgsHtml(s) {
  const a = s.assets.find(x => x.versions.some(v => v.n === x.current && v.kind === 'video')); const ver = a && a.versions.find(v => v.n === a.current);
  const vd = AC.byId(S.videos || [], s.videoId); const src = (ver && ver.cover && ver.cover.src) || (vd ? AC.vidThumbOf(vd).src : '');
  return `<span class="imgs vid" title="Video Short Vid${vd ? ': ' + esc(vd.insight.title) : ''}"><span class="imgmini vthumb${src ? ' up' : ' none'}" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="">` : ''}</span><span class="vfilm" aria-label="Video">${icon('film')}</span></span>`;
}
function imgMini(a) {
  const v = a.versions.find(x => x.n === a.current);
  if (!v) return `<span class="imgmini none" aria-hidden="true"></span>`;
  return `<span class="imgmini${v.src ? ' up' : ''}" aria-hidden="true">${imgVisual(v, false, AC.assetRatioOf(a))}</span>`;
}
function weekGridHtml(start, w) {
  const locked = !!w && w.status === 'CONFIRMED';
  const slots = w ? filteredSlots(w.id) : [];
  const days = [1, 2, 3, 4, 5, 6, 7].map(d => ({ d, date: AC.addDays(start, d - 1) }));
  const plus = date => locked ? '' : `<button class="addslot" data-act="add-slot" data-date="${date}" aria-label="Thêm slot ${esc(AC.dmy(date))}">${icon('plus')}</button>`;
  const grid = `<div class="cal" role="grid" aria-label="Lịch tuần">${days.map(({ d, date }) => `
    <div class="day ${date === nowDate() ? 'today' : ''}" role="gridcell" data-drop-date="${date}">
      <div class="day-h"><span><b>${AC.WEEKDAY_SHORT[d]}</b> <span class="t">${esc(AC.dmy(date))}</span></span>${plus(date)}</div>
      <div class="day-b">${slots.filter(s => s.date === date).map(slotChipHtml).join('') || '<span class="small faint">Không có slot</span>'}</div>
    </div>`).join('')}</div>`;
  const list = `<div class="daylist">${days.map(({ d, date }) => {
    const ds = slots.filter(s => s.date === date);
    return `<div class="dl-day ${date === nowDate() ? 'today' : ''}">
      <div class="day-h"><span><b>${AC.WEEKDAY_LONG[d]}</b> <span class="t">${esc(AC.dmy(date))}</span></span>${plus(date)}</div>
      ${ds.length ? `<div class="dl-slots">${ds.map(s => `<div class="slotwrap"><button class="slot ${slotLevel(s)}" data-act="open-slot" data-id="${esc(s.id)}"><span class="t mono">${esc(s.time)}</span><span>${chTag(s.channelId)} <span class="fmt">· ${esc(fmtName(s.formatId))}</span> <span class="seg-col">· ${esc(segName(s.formatId))}</span><br>${slotStateHtml(s)} ${slotPubLine(s)} ${slotImgsHtml(s)}</span></button>${slotGearBtn(s)}</div>`).join('')}</div>` : '<p class="small faint" style="padding:8px 12px">Không có slot</p>'}
    </div>`;
  }).join('')}</div>`;
  return grid + list;
}
// ---- Kéo thả slot giữa các ngày (mục 10.31): thả xong hỏi xác nhận, có Hoàn tác ----
let dragSlotId = null; const dropPlan = {};
const dropClear = () => document.querySelectorAll('.drop-ok, .drop-no').forEach(x => x.classList.remove('drop-ok', 'drop-no'));
document.addEventListener('dragstart', e => {
  const el = e.target.closest && e.target.closest('[data-drag]'); if (!el) return;
  dragSlotId = el.dataset.drag; Object.keys(dropPlan).forEach(k => delete dropPlan[k]);
  try { e.dataTransfer.setData('text/plain', dragSlotId); e.dataTransfer.effectAllowed = 'move'; } catch (er) { /* trình duyệt cũ */ }
  el.classList.add('dragging'); document.body.classList.add('drag-slot');
});
document.addEventListener('dragend', () => { dragSlotId = null; dropClear(); document.body.classList.remove('drag-slot'); document.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging')); });
document.addEventListener('dragover', e => {
  const day = dragSlotId && e.target.closest && e.target.closest('[data-drop-date]'); if (!day) return;
  const d = day.dataset.dropDate; const p = dropPlan[d] || (dropPlan[d] = AC.moveSlotCheck(S, dragSlotId, d));
  e.preventDefault();
  try { e.dataTransfer.dropEffect = p.ok ? 'move' : 'none'; } catch (er) { /* bỏ qua */ }
  if (!day.classList.contains(p.ok ? 'drop-ok' : 'drop-no')) { dropClear(); if (!p.same) day.classList.add(p.ok ? 'drop-ok' : 'drop-no'); }
});
document.addEventListener('drop', e => {
  const day = dragSlotId && e.target.closest && e.target.closest('[data-drop-date]'); if (!day) return;
  e.preventDefault(); const id = dragSlotId; dragSlotId = null; dropClear();
  slotMoveFlow(id, day.dataset.dropDate);
});
async function slotMoveFlow(id, date) {
  const s = AC.byId(S.slots, id); if (!s) return;
  const p = AC.moveSlotCheck(S, id, date);
  if (!p.ok) { if (!p.same) toast(p.error, 'bad'); return; }
  const day = x => `${AC.WEEKDAY_SHORT[AC.weekdayOf(x)]} ${AC.dmy(x)}`;
  const body = `<p><b>${esc(s.time)} · ${esc(chName(s.channelId))} · ${esc(fmtName(s.formatId))}</b></p>
    <p>Từ <b>${esc(day(p.from))}</b> sang <b>${esc(day(p.to))}</b>, giờ đăng giữ nguyên <b>${esc(s.time)}</b>. Lịch ngày mới tự xếp theo giờ.</p>
    ${p.warnings.map(x => `<p class="note warn small">${esc(x)}</p>`).join('')}
    ${p.needReopen ? '<p class="note warn small">Tuần đã chốt: chuyển slot sẽ Mở lại tuần (Đang sửa); sửa xong cần Xác nhận lịch lại.</p>' : ''}`;
  if (!(await confirmBox({ title: 'Chuyển slot sang ngày khác?', body, ok: p.needReopen ? 'Mở lại và chuyển' : 'Chuyển' }))) return;
  const r = AC.moveSlot(S, id, date, { reopen: p.needReopen }); if (!r.ok) return toast(r.error, 'bad');
  save(); render();
  toast(`Đã chuyển sang ${day(date)} lúc ${s.time}.`, '', { label: 'Hoàn tác', fn: () => { const u = AC.undoMoveSlot(S, id, r.from, r.reopened); if (!u.ok) return toast(u.error, 'bad'); commit(`Đã đưa slot về ${day(r.from)}.`); } });
}
function monthHtml(start) {
  if (!view.monthAnchor) view.monthAnchor = `${start.slice(0, 7)}-01`;
  const anchor = view.monthAnchor;
  const y = Number(anchor.slice(0, 4)), m = Number(anchor.slice(5, 7));
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const mStart = AC.mondayOf(first);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = AC.addDays(mStart, i);
    if (i >= 35 && Number(date.slice(5, 7)) !== m) break;
    cells.push(date);
  }
  const head = AC.WEEKDAY_SHORT.slice(1).map(d => `<div class="mh">${d}</div>`).join('');
  const body = cells.map(date => {
    const wk = AC.weekForDate(S, date);
    const ds = wk ? AC.weekSlots(S, wk.id).filter(s => s.date === date && (!view.chFilter.length || view.chFilter.includes(s.channelId))) : [];
    const ok = ds.filter(s => s.state === 'APPROVED' || s.state === 'PUBLISHED').length;
    const out = Number(date.slice(5, 7)) !== m;
    const sel = AC.mondayOf(date) === start;
    return `<button class="mday ${out ? 'out' : ''} ${sel ? 'sel' : ''} ${date === nowDate() ? 'today' : ''}" data-act="month-pick" data-date="${date}" aria-label="${esc(AC.dmyFull(date))}${ds.length ? `, ${ds.length} slot, ${ok} sẵn sàng` : ', chưa có slot'}">
      <span class="d">${esc(date.slice(8))}</span>
      ${ds.length ? `<span class="c"><b>${ds.length}</b> slot · ${ok} sẵn sàng</span>` : '<span class="c faint">—</span>'}
    </button>`;
  }).join('');
  return `<div class="stack"><div class="row" style="justify-content:space-between"><h2>Tháng ${m}/${y}</h2>
      <div class="row" style="gap:4px"><button class="btn icon ghost" data-act="month-step" data-d="-1" aria-label="Tháng trước">${icon('left')}</button><button class="btn icon ghost" data-act="month-step" data-d="1" aria-label="Tháng sau">${icon('right')}</button></div></div>
    <div class="month" role="grid">${head}${body}</div><p class="small faint">Bấm một ngày để mở tuần chứa ngày đó (tuần chưa lập vẫn mở được). Ô tô màu là tuần đang chọn.</p></div>`;
}
ACTIONS['month-pick'] = el => { setWeekStart(el.dataset.date); view.weekMode = 'week'; commit(); };
ACTIONS['month-step'] = el => {
  const a = view.monthAnchor || `${curStart().slice(0, 7)}-01`;
  let y = Number(a.slice(0, 4)), m = Number(a.slice(5, 7)) + Number(el.dataset.d);
  if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
  view.monthAnchor = `${y}-${String(m).padStart(2, '0')}-01`; render();
};

function weekColumnsHtml(w) {
  const locked = w.status === 'CONFIRMED';
  const inWeek = AC.weekLanes(S, w).filter(l => AC.byId(S.columns, l.colId));
  const avail = S.columns;
  return `<section class="panel quiet" aria-label="Cột của tuần">
    <header><div><span class="eyebrow">Cột của tuần</span><h2>${inWeek.length} Cột${AC.topicsOf(S, w.id).length ? ` · ma trận ${AC.topicsOf(S, w.id).length * inWeek.length} ô` : ' · ma trận có sau khi nạp Topic'}</h2></div><span class="small faint">Cột là chức năng nội dung; mặc định 5, thêm hoặc bớt được</span></header>
    <div class="colchips">
      ${inWeek.map(l => `<span class="colchip">${esc(l.label)}${locked ? '' : `<button data-act="remove-col" data-col="${esc(l.colId)}" data-k="${l.k}" aria-label="Bớt Cột ${esc(l.label)}" title="Bớt Cột">×</button>`}</span>`).join('')}
      ${!locked && avail.length ? `<button class="colchip add" data-act="add-col">${icon('plus')} Thêm Cột</button>` : ''}
    </div>
  </section>`;
}
ACTIONS['remove-col'] = async el => {
  const w = curWeek(); const colId = el.dataset.col; const k = +(el.dataset.k || 0);
  if (w.columnIds.length <= 1) return toast('Tuần cần ít nhất 1 Cột.', 'bad');
  const imp = AC.removeColumnImpact(S, w.id, colId, k); const lbl = AC.laneLabel(S, w, colId, k); const dup = w.columnIds.filter(x => x === colId).length > 1;
  const fmtSlots = dup ? 0 : AC.weekSlots(S, w.id).filter(s => { const f = AC.byId(S.formats, s.formatId); return !s.free && f && AC.slotColumnId(S, s) === colId; }).length;
  const ok = await confirmBox({ title: `Bớt Cột "${lbl}"?`, danger: true, ok: 'Bớt Cột',
    body: `<p>Ma trận còn ${AC.topicsOf(S, w.id).length * (w.columnIds.length - 1)} ô.</p><ul>
      <li>${imp.cells} ô của Cột này bị loại khỏi tuần${imp.cellsWithContent ? ` (${imp.cellsWithContent} ô đã có bài, mất cả lịch sử)` : ''}.</li>
      <li>${imp.slots} slot đang lấy bài từ Cột này chuyển "Chưa có bài".</li>
      ${fmtSlots ? `<li>${fmtSlots} slot dùng Format của Cột này sẽ không có ô nguồn cho tới khi bạn bật lại Cột hoặc đổi Format.</li>` : ''}</ul>` });
  if (!ok) return;
  const r = AC.removeWeekColumn(S, w.id, colId, k);
  if (!r.ok) return toast(r.error || 'Không bớt được Cột.', 'bad');
  commit(`Đã bớt Cột "${lbl}".`);
};
ACTIONS['add-col'] = async () => {
  const w = curWeek();
  const avail = S.columns;
  const res = await confirmBox({ title: 'Thêm Cột cho tuần', ok: 'Thêm Cột',
    body: `<p>Thêm Cột tạo thêm ${Math.max(1, AC.topicsOf(S, w.id).length)} ô trống trong ma trận (mỗi Topic một ô).</p>`,
    extra: `<div class="field"><label for="add-col-sel">Cột</label><select id="add-col-sel" data-collect="col">${avail.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${w.columnIds.includes(c.id) ? ' (thêm một vị trí nữa)' : ''}${c.active ? '' : ' (đang ẩn ở Thiết lập)'}</option>`).join('')}</select></div>` });
  if (!res) return;
  const r = AC.addWeekColumn(S, w.id, res.col);
  if (!r.ok) return toast(r.error || 'Không thêm được Cột.', 'bad');
  commit(`Đã thêm Cột "${colName(res.col)}"${r.cellsAdded ? `, ${r.cellsAdded} ô trống mới` : ''}.`);
};

RENDERERS.week = () => {
  const start = curStart(); const w = curWeek();
  const file = w ? AC.topicFileOf(S, w.id) : null;
  const slots = w ? AC.weekSlots(S, w.id) : [];
  const usedCh = [...new Set(slots.map(s => s.channelId))];
  const gate = AC.canApplyTemplate(S, start);
  const wid = AC.weekIdOf(start);
  return `${dashHeaderHtml(start, w, file)}
    ${lockBannerHtml(w)}
    ${demoBarHtml(['setup', 'plan', 'review', 'confirm', 'clear'])}
    <section class="focus">${nextBandHtml(wid)}${progressHtml(wid)}</section>
    <section class="work" aria-label="Lịch">
    <div class="week-tools">
      <div class="seg" role="group" aria-label="Chế độ xem"><button aria-pressed="${view.weekMode === 'week'}" data-act="week-mode" data-m="week">Tuần</button><button aria-pressed="${view.weekMode === 'month'}" data-act="week-mode" data-m="month">Tháng</button></div>
      ${confirmBtnHtml(w)}
      ${dealBtnHtml(w)}
      <button class="btn ${slots.length ? '' : 'primary'}" data-act="plan-week" ${gate.ok ? '' : 'disabled'} title="${esc(gate.ok ? 'Chọn Tuần mẫu rồi tạo slot cho tuần này' : gate.reason)}">${icon('week')} Lập tuần · Tuần mẫu</button>
      <div class="filters" role="group" aria-label="Lọc theo kênh">
        ${usedCh.length ? '<span class="small muted">Kênh:</span>' : ''}
        ${usedCh.map(id => `<button class="fchip" aria-pressed="${view.chFilter.includes(id)}" data-act="ch-filter" data-ch="${esc(id)}">${chTag(id)}</button>`).join('')}
        ${view.chFilter.length ? '<button class="linkbtn small" data-act="ch-filter-clear">Bỏ lọc</button>' : ''}
      </div>
    </div>
    ${!w && gate.ok ? `<div class="note">Tuần này chưa có slot. Chọn <b>Lập tuần</b> để sao các slot từ một Tuần mẫu, hoặc bấm dấu + ở từng ngày để thêm từng slot.</div>` : ''}
    ${view.weekMode === 'month' ? monthHtml(start) : weekGridHtml(start, w)}
    </section>
    ${w ? `<div class="secondary">${weekColumnsHtml(w)}</div>` : ''}`;
};
ACTIONS['week-mode'] = el => { view.weekMode = el.dataset.m; render(); };
ACTIONS['ch-filter'] = el => { const id = el.dataset.ch; view.chFilter = view.chFilter.includes(id) ? view.chFilter.filter(x => x !== id) : [...view.chFilter, id]; render(); };
ACTIONS['ch-filter-clear'] = () => { view.chFilter = []; render(); };

// ---- Lập tuần: chọn Tuần mẫu → xem trước → Tạo slot ----
function templatePreviewHtml(tplId) {
  const list = AC.previewTemplateWeek(S, curStart(), tplId);
  if (!list.length) return '<p class="small muted">Tuần mẫu này chưa có slot.</p>';
  return `<div class="tbl-wrap" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Ngày</th><th>Giờ</th><th>Kênh · Format</th><th>Cột</th></tr></thead><tbody>${list.map(t => `<tr><td>${AC.WEEKDAY_SHORT[t.weekday]} ${esc(AC.dmy(t.date))}</td><td class="mono">${esc(t.time)}</td><td>${chTag(t.channelId)} · ${esc(fmtName(t.formatId))}</td><td class="small">${esc(colName(t.columnId))}</td></tr>`).join('')}</tbody></table></div>`;
}
ACTIONS['plan-week'] = () => {
  const start = curStart();
  const gate = AC.canApplyTemplate(S, start);
  if (!gate.ok) return toast(gate.reason, 'bad');
  const list = AC.templatesSorted(S).filter(t => t.slots.length);
  const sug = AC.suggestTemplateId(S, start);
  const l = AC.weekLabelOf(start);
  const box = openLayer(`
    <h2>Lập tuần · ${esc(l.range)}</h2>
    <p class="small muted">Chọn một Tuần mẫu. App gợi ý mẫu kế tiếp sau mẫu của tuần trước. Slot tạo ra chỉ có ngày, giờ, kênh, Format; nội dung và ảnh để trống cho tới khi Viết slot.</p>
    <fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sr">Tuần mẫu</legend>
      ${list.map(t => `<label class="radio-row"><input type="radio" name="tpl" value="${esc(t.id)}" ${t.id === sug ? 'checked' : ''}> <span><b>${esc(t.name)}</b> · ${t.slots.length} slot ${t.id === sug ? '<span class="st st-ok">Gợi ý</span>' : ''}</span></label>`).join('')}
    </fieldset>
    <div id="tpl-prev">${templatePreviewHtml(sug)}</div>
    <div class="actions"><button class="btn" data-x="no">Hủy</button><button class="btn primary" data-x="yes">Tạo slot</button></div>`, 'dialog');
  box.addEventListener('change', e => { if (e.target.name === 'tpl') $('#tpl-prev', box).innerHTML = templatePreviewHtml(e.target.value); });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'no') return closeLayer();
    const id = (box.querySelector('input[name=tpl]:checked') || {}).value;
    const r = AC.applyTemplateWeek(S, start, id);
    if (!r.ok) { toast(r.error, 'bad'); return; }
    closeLayer(); view.screen = 'week'; view.weekMode = 'week';
    commit(`Đã tạo ${r.slots} slot từ "${AC.templateOf(S, id).name}".`);
  });
};

// ---- Thêm / sửa slot (SCR-04) ----
export function channelOptions(sel) { return S.channels.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join(''); }
export function formatOptions(channelId, sel) {
  const fs = S.formats.filter(f => f.channelId === channelId);
  return fs.length ? fs.map(f => `<option value="${esc(f.id)}" ${f.id === sel ? 'selected' : ''}>${esc(f.name)}</option>`).join('') : '<option value="">Kênh này chưa có Format</option>';
}
// Cột của slot tự do: "Không" đứng đầu; Cột đề xuất (theo Format) được chọn sẵn và có nhãn
// Thứ tự: Không (None), Cột đề xuất của Format, rồi các Cột khác (mục 10.20); slot lấy từ Matrix đã có bài nguồn thì không cho None
function colOptions(sel, sugId, noNone) {
  const opt = c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}${c.id === sugId ? ' (đề xuất)' : ''}</option>`;
  const sug = S.columns.find(c => c.id === sugId);
  return (noNone ? '' : `<option value="" ${!sel ? 'selected' : ''}>Không (None)</option>`) + (sug ? opt(sug) : '') + S.columns.filter(c => c.id !== sugId).map(opt).join('');
}
function suggestedCol(formatId) { const f = AC.byId(S.formats, formatId); return f ? f.columnId : null; }
function slotFormHtml(start, s, date) {
  const ch = s ? s.channelId : (S.channels[0] || {}).id;
  return `<div class="fgrid">
      <div class="field"><label for="sf-date">Ngày</label><select id="sf-date">${[1, 2, 3, 4, 5, 6, 7].map(d => { const v = AC.addDays(start, d - 1); return `<option value="${v}" ${v === (s ? s.date : date) ? 'selected' : ''}>${AC.WEEKDAY_LONG[d]} ${AC.dmy(v)}</option>`; }).join('')}</select></div>
      <div class="field"><label for="sf-time">Giờ đăng</label><input id="sf-time" type="time" value="${esc(s ? s.time : '19:00')}"></div>
    </div>
    <div class="field"><label for="sf-ch">Kênh</label><select id="sf-ch">${channelOptions(ch)}</select></div>
    <div class="field"><label for="sf-fmt">Format</label><select id="sf-fmt">${formatOptions(ch, s && s.formatId)}</select><span class="hint">Chỉ hiện Format của kênh đã chọn.</span></div>
    ${(() => { const fid = s ? s.formatId : (S.formats.find(f => f.channelId === ch) || {}).id, sug = suggestedCol(fid); return `<div class="field"><label for="sf-col">Cột</label><select id="sf-col">${colOptions(s ? AC.slotColumnId(S, s) : sug, sug, s && !s.free)}</select><span class="hint">${s && !s.free ? 'Cột có ô nguồn của slot. Chọn Cột khác Cột đề xuất thì slot cần chọn lại ô.' : s ? 'Chỉ để phân loại; không kéo bài từ Matrix.' : 'Cột đề xuất theo Format nằm đầu. Chọn "Không" thì dùng nút Thêm slot tự do.'}</span></div>`; })()}
    <span class="err" id="sf-err"></span>`;
}
function bindSlotForm(box, free) {
  const col = () => box.querySelector('#sf-col');
  // đổi Format: Cột đề xuất đổi theo, trừ khi đang sửa slot tự do đã có Cột riêng (chỉ đổi lại khi người dùng bấm)
  const fl = (resetCol) => { const el = box.querySelector('#fmt-layout'); if (el) el.innerHTML = formatLayoutHtml($('#sf-fmt', box).value); const c = col(); if (c && resetCol) { const sug = suggestedCol($('#sf-fmt', box).value); c.innerHTML = colOptions(sug, sug, box.dataset.nonfree); } else if (c) { const cur = c.value, sug = suggestedCol($('#sf-fmt', box).value); c.innerHTML = colOptions(cur, sug, box.dataset.nonfree); } };
  $('#sf-ch', box).addEventListener('change', e => { $('#sf-fmt', box).innerHTML = formatOptions(e.target.value); fl(!box.dataset.free); });
  $('#sf-fmt', box).addEventListener('change', () => fl(!box.dataset.free));
}
function readSlotForm(box) { const c = box.querySelector('#sf-col'); const o = { date: $('#sf-date', box).value, time: $('#sf-time', box).value, channelId: $('#sf-ch', box).value, formatId: $('#sf-fmt', box).value }; if (c) o.columnId = c.value; return o; }

ACTIONS['add-slot'] = el => {
  const start = curStart();
  const form = slotFormHtml(start, null, el.dataset.date);
  const fid0 = (/<select id="sf-fmt">[\s\S]*?<option value="([^"]*)"/.exec(form) || [])[1];
  const box = openLayer(`<h2>Thêm slot</h2><div id="fmt-layout">${formatLayoutHtml(fid0)}</div>${form}
    <div class="field" id="sf-kw-f" hidden><label for="sf-kw">Từ khoá chính (SEO)</label><input id="sf-kw" placeholder="cụm 2–5 chữ người đọc hay tìm"><span class="hint">Bỏ trống thì khi viết bài app gợi ý từ Topic để bạn xác nhận. Các thông tin SEO khác ở Cấu hình slot.</span></div>
    <p class="small muted" id="sf-mode"></p>
    <div class="actions"><button class="btn" data-x="no">Hủy</button><button class="btn" data-x="yes">Thêm slot</button><button class="btn primary" data-x="write">Thêm và tạo bài</button></div>`, 'dialog', bindSlotForm);
  box.classList.add('slot-dialog');
  // Cột = Không (None): slot tự do (tự viết bài, tải ảnh/video), chỉ còn một nút Tạo; có Cột: Thêm slot trống hoặc Thêm và tạo bài từ ô Đã duyệt
  const mode = () => {
    const free = $('#sf-col', box).value === '';
    box.querySelector('[data-x="yes"]').textContent = free ? 'Tạo slot tự do' : 'Thêm slot';
    box.querySelector('[data-x="yes"]').classList.toggle('primary', free);
    box.querySelector('[data-x="write"]').hidden = free;
    const bf = AC.byId(S.formats, $('#sf-fmt', box).value); const ch0 = bf && AC.byId(S.channels, bf.channelId);
    $('#sf-kw-f', box).hidden = !(bf && bf.layout === 'article');
    $('#sf-mode', box).innerHTML = free ? 'Không gắn Cột: slot <b>tự do</b>, không lấy từ Matrix, bạn tự viết bài và tải ảnh/video.' : '<b>Thêm slot</b>: slot trống, tạo bài sau. <b>Thêm và tạo bài</b>: viết bài và ảnh từ một ô Đã duyệt của Cột.';
  };
  box.addEventListener('change', e => { if (e.target.id === 'sf-col' || e.target.id === 'sf-fmt' || e.target.id === 'sf-ch') mode(); });
  mode();
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'no') return closeLayer();
    const isFree = readSlotForm(box).columnId === '';
    const r = AC.addSlotToStart(S, start, Object.assign(readSlotForm(box), isFree ? { free: true } : {}));
    if (!r.ok) { $('#sf-err', box).textContent = r.error; return; }
    const kw = $('#sf-kw-f', box).hidden ? '' : $('#sf-kw', box).value.trim();
    if (kw) AC.setSlotSeo(S, r.slot.id, { keyword: kw });
    if (isFree) { closeLayer(); save(); render(); openPreview(r.slot.id, null, { edit: true }); toast('Đã thêm slot tự do. Viết bài và tải ảnh/video ngay trong khung.'); return; }
    if (b.dataset.x === 'write') {
      closeLayer();
      const g = await withAiText(C => AC.writeSlotNow(C, r.slot.id)); save(); render();
      if (!g.ok) return toast(`Đã thêm slot nhưng chưa tạo được bài: ${g.error}`, 'bad');
      openPreview(r.slot.id); toast('Đã thêm slot và tạo bài, ảnh. Xem và sửa nếu chưa ưng.'); return;
    }
    closeLayer(); commit(`Đã thêm slot ${r.slot.time} ${chName(r.slot.channelId)}.`);
  });
};

// ---- Cấu hình slot (SCR-05) ----
// Chi tiết slot hiện giữa màn hình (mục 10.13); mở từ popup Xem như khi đăng thì chỉ thông tin cấu hình (.cfg), giữ nguyên khi thao tác trong đó
let slotCentered = false;
ACTIONS['slot-back'] = el => { closeAllLayers(); if (slotCentered) openPreview(el.dataset.id); };
// Bấm thẻ slot: có bài thì vào View (Xem như khi đăng); chưa có bài thì vào Cấu hình slot (có nút Tạo bài). Bánh răng: Cấu hình slot.
ACTIONS['open-slot'] = el => { const s = AC.byId(S.slots, el.dataset.id); if (s && (s.text || s.free)) openPreview(s.id); else openSlot(el.dataset.id, null, false); };
ACTIONS['slot-config'] = el => openSlot(el.dataset.id, null, false);
export function openSlot(id, browseN, center) {
  const s = AC.byId(S.slots, id); if (!s) return;
  if (center !== undefined) slotCentered = center;
  closeAllLayers();
  const w = AC.weekOf(S, s.weekId); const locked = w.status === 'CONFIRMED' || s.state === 'PUBLISHED';
  const f = AC.byId(S.formats, s.formatId);
  const cell = s.sourceCellId ? AC.byId(S.cells, s.sourceCellId) : null;
  const row = cell ? AC.byId(S.topics, cell.topicId) : null;
  const ws = AC.slotWarnings(S, s);
  const late = s.state !== 'PUBLISHED' && `${s.date}T${s.time}` <= S.settings.demoNow;
  const unit = f && f.hardRules.lengthUnit === 'words' ? 'chữ' : 'ký tự';
  const len = f && s.text ? (f.layout === 'carousel' ? `${AC.slidesOf(s.text).length} slide` : `${AC.lengthOf(s.text, f.hardRules.lengthUnit)} ${unit}`) : '';
  // Bản đang xem trong history (CAL-13): mặc định bản đang dùng
  const hist = s.history || [];
  const curN = s.curN || (hist.length ? hist[hist.length - 1].n : 0);
  const hv = hist.find(h => h.n === browseN) || null;
  const viewing = hv && hv.n !== curN ? hv : null;
  const hi = hist.findIndex(h => h.n === (viewing ? viewing.n : curN));
  const prevH = hist[hi - 1], nextH = hist[hi + 1];
  const btn = (x, label, cls = '') => `<button class="btn ${cls}" data-x="${x}">${label}</button>`;
  let acts = '';
  if (locked) acts = `<span class="small faint">${esc(lockNote(s))}</span>`;
  else if (!s.text) { const g = AC.slotWriteGate(S, s.id); acts = `<button class="btn primary" data-x="write" ${g.ok ? '' : 'disabled'} title="${esc(g.ok ? 'Viết bài và ảnh từ một ô Đã duyệt của Cột' : g.reason)}">Tạo bài</button><span class="small muted">${esc(g.ok ? 'Tạo bài lấy một ô Đã duyệt của Cột (ô ít slot dùng nhất), hoặc chọn ô cụ thể bên dưới.' : g.reason + '.')}</span>`; }
  else if (viewing) acts = `<button class="btn primary" data-x="use" data-n="${viewing.n}">Dùng bản này</button>`;
  else {
    if (s.needsUpdate) acts += btn('update', 'Cập nhật từ ô', 'primary') + btn('keep', 'Giữ bản slot');
    else if (s.state === 'DRAFT') acts += btn('approve', 'Duyệt', 'primary');
    acts += btn('regen', 'Tạo lại');
    if (s.undoN && hist.some(h => h.n === s.undoN)) acts += `<button class="btn ghost" data-x="use" data-n="${s.undoN}">Hoàn tác</button>`;
    acts += btn('edit', 'Sửa');
  }
  const navH = hist.length > 1 ? `<button class="btn icon" data-act="open-slot" data-id="${esc(s.id)}" data-n="${prevH ? prevH.n : ''}" ${prevH ? '' : 'disabled'} aria-label="Bản trước">${icon('left')}</button><button class="btn icon" data-act="open-slot" data-id="${esc(s.id)}" data-n="${nextH ? nextH.n : ''}" ${nextH ? '' : 'disabled'} aria-label="Bản sau">${icon('right')}</button><span class="small muted">bản ${viewing ? viewing.n : curN} · ${hi + 1}/${hist.length}${(viewing || hist[hi] || {}).edited ? ' · sửa tay' : ''}</span>` : '';
  const shownText = viewing ? viewing.text : s.text;
  const choices = AC.slotCellChoices(S, s.id);
  const cfg = true; // Cấu hình slot: chỉ thông tin cấu hình, thao tác nội dung nằm ở popup View (slotCentered = mở từ View, Back quay về View)
  const html = `
    <header><div><span class="eyebrow">${esc(AC.WEEKDAY_LONG[AC.weekdayOf(s.date)])} ${esc(AC.dmy(s.date))} · <span class="mono">${esc(s.time)}</span></span>
      <h2>${esc(fmtFull(s.formatId))}</h2>
      <div class="row" style="margin-top:6px">${slotStateHtml(s)}${late ? FAIL_TAG : ''}${s.changedAfterPublish ? '<span class="st st-need">Nội dung đã đổi sau khi đăng</span>' : ''}</div></div>
      ${cfg ? `<button class="btn" data-act="slot-back" data-id="${esc(s.id)}">${icon('left')} Back</button>` : `<button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button>`}</header>
    <div class="body">
      ${cfg || !s.text ? `<div id="fmt-layout">${formatLayoutHtml(s.formatId)}</div>` : ''}
      ${cfg ? cfgActionsHtml(s, locked) : `<div class="row" id="slot-actions">${navH}${acts}</div>`}
      ${!cfg && s.needsUpdate && !viewing ? `<p class="note warn">Ô nguồn đã đổi sau khi slot được viết. "Cập nhật từ ô" viết lại slot theo bản mới của ô (ô phải Đã duyệt); "Giữ bản slot" cần ghi lý do.</p>` : ''}
      ${!cfg && s.keepReason && !s.needsUpdate ? `<p class="small muted">Đang giữ bản slot: ${esc(s.keepReason)}</p>` : ''}
      ${cfg ? '' : shownText ? `<section class="stack"><div class="row" style="justify-content:space-between"><h3>Nội dung bài${viewing ? ' (bản cũ)' : ''}</h3><span class="row" style="gap:8px"><span class="small faint">${esc(len)} <span class="mock">Mô phỏng</span></span><button class="btn sm" data-act="slot-preview" data-id="${esc(s.id)}" ${viewing ? `data-n="${viewing.n}"` : ''}>${icon('eye')} Xem như khi đăng</button></span></div>
        <div class="content-text rich">${richText(shownText, viewing ? [] : warnMarks(ws))}</div></section>` : `<div class="empty"><p><b>Chưa có bài.</b> ${s.emptyReason ? esc(s.emptyReason) + '. ' : ''}Bấm <b>Tạo bài</b> ở trên (cần Matrix đã khóa), hoặc <b>Viết tất cả slot</b> ở Dashboard cho cả tuần, hoặc chọn ô bên dưới. Cột của slot này: <b>${esc(colName(AC.slotColumnId(S, s)))}</b>.</p></div>`}
      <section class="cfg-sec cfg-src"><div class="cfg-h"><span class="cfg-n">1</span><h3>Ô nguồn</h3></div>
        ${s.free ? `<div class="srccard"><div class="srctop"><span class="chip-col">Slot tự do</span></div><h4 class="srctitle">Không lấy nguồn từ Matrix</h4><p class="small muted">Bạn tự viết bài và tải ảnh, video của riêng bạn. ${s.columnId ? `Cột ${esc(colName(s.columnId))}` : 'Không gắn Cột'} chỉ dùng để phân loại; đổi ở Vị trí đăng bên dưới.</p></div>` : cell && row ? `<div class="srccard"><div class="srctop"><span class="chip-col">Cột ${esc(colName(cell.columnId))}</span><span class="srcstate">${AC.cellView(S, cell).state === 'APPROVED' ? 'Ô Đã duyệt' : 'Ô chưa duyệt'}</span></div>
          <h4 class="srctitle">Topic ${row.order} · ${esc(AC.topicCurrent(row).title)}</h4>
          <p class="small muted">Viết từ Topic v${s.sourceStamp ? s.sourceStamp.topicVersion : '?'} · bản ${s.sourceStamp ? s.sourceStamp.genN : '?'} của ô${(() => { const n = S.slots.filter(x => x.id !== s.id && x.sourceCellId === cell.id).length; return n ? ` · đang nuôi ${n} slot khác` : ''; })()}</p>
          <div class="row"><button class="btn sm" data-act="open-cell" data-id="${esc(cell.id)}">Mở Cell</button></div></div>` : `<div class="srccard empty"><p><b>Chưa có ô nguồn.</b></p><p class="small muted">Chọn một ô Đã duyệt của Cột "${esc(colName(AC.slotColumnId(S, s)))}" bên dưới, hoặc bấm Tạo bài.</p></div>`}
        ${s.free ? '' : `<div class="cfg-sub">${choices.length ? `<div class="field"><label for="sl-cell">${s.sourceCellId ? 'Đổi ô dùng cho slot này' : 'Chọn ô cho slot này'} (ô Đã duyệt cùng Cột)</label><select id="sl-cell" data-change="slot-cell" data-id="${esc(s.id)}" ${locked ? 'disabled' : ''}>${s.sourceCellId && !choices.some(ch => ch.current) ? '<option selected disabled>Ô hiện tại không còn Đã duyệt</option>' : ''}${s.sourceCellId ? '' : '<option selected disabled value="">Chọn ô…</option>'}${choices.map(ch => `<option value="${esc(ch.cell.id)}" ${ch.current ? 'selected' : ''}>Topic ${ch.topic.order} · ${esc(AC.topicCurrent(ch.topic).title)}${ch.usedBy ? ` · đang nuôi ${ch.usedBy} slot khác` : ''}</option>`).join('')}</select><span class="hint">Chọn ô khác thì slot viết lại từ ô đó; bản cũ vẫn trong lịch sử của slot.</span></div>` : `<p class="small muted">Chưa có ô Đã duyệt nào của Cột "${esc(colName(AC.slotColumnId(S, s)))}".</p>`}</div>`}</section>
      ${s.text && !cfg ? `<section class="stack"><h3>Quy tắc kênh</h3>${warningsHtml(ws)}</section>
      <section class="stack"><h3>Điểm AI</h3>${scoreHtml(s.scores, s.total, s.tip, f ? f.criteria : [], s.ai)}</section>` : ''}
      ${cfg ? '' : slotImageRowsHtml(s, locked)}
      <section class="cfg-sec cfg-pos"><div class="cfg-h"><span class="cfg-n">2</span><h3>Vị trí đăng</h3></div>
        <div class="postsum"><b class="when">${esc(AC.WEEKDAY_LONG[AC.weekdayOf(s.date)])} ${esc(AC.dmy(s.date))} · <span class="mono">${esc(s.time)}</span></b><span class="where">${chTag(s.channelId)} · ${esc(fmtName(s.formatId))}</span></div>
        ${locked ? `<p class="muted small">${esc(lockNote(s))}</p>` : `<div class="cfg-sub">${slotFormHtml(w.startDate, s)}</div>
        <div class="cfg-foot"><button class="btn ghost danger sm" data-x="delete">Xóa slot</button><button class="btn primary" data-x="save">Lưu vị trí</button></div>`}
      </section>
      ${AC.isBlogSlot(S, s) ? slotSeoSectionHtml(s, locked) : ''}
    </div>`;
  const box = openLayer(html, 'drawer', locked ? null : (b => { if (s.free) b.dataset.free = '1'; else b.dataset.nonfree = '1'; bindSlotForm(b); }));
  box.classList.add('center', 'cfg');
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const done = (res, msg, keep) => { if (!res.ok) return toast(res.error, 'bad'); save(); render(); openSlot(s.id); if (msg) toast(msg); };
    const x = b.dataset.x;
    if (blogCfgAction(s, x, box)) return;
    if (x === 'free-write') { closeAllLayers(); return openPreview(s.id, null, { edit: true }); }
    if (x === 'write') { const r = await withAiText(C => AC.writeSlotNow(C, s.id)); if (!r.ok) return toast(r.error, 'bad'); save(); render(); closeAllLayers(); openPreview(s.id); return toast('Đã tạo bài và ảnh. Xem và sửa nếu chưa ưng.'); }
    if (x === 'approve') {
      const n = AC.slotWarnings(S, s).length;
      if (n && !(await confirmBox({ title: 'Duyệt slot có cảnh báo?', body: `<p>Slot này có ${n} cảnh báo. Cảnh báo chỉ để tham khảo; bạn vẫn duyệt được.</p>`, ok: 'Vẫn duyệt' }))) return;
      return done(AC.approveSlot(S, s.id), 'Đã duyệt slot.');
    }
    if (x === 'regen') { const r = await withAiText(C => AC.regenSlot(C, s.id)); return done(r, r.ok ? `Đã tạo bản ${r.n}. Bấm Hoàn tác để quay lại bản trước.` : ''); }
    if (x === 'use') return done(AC.useSlotVersion(S, s.id, Number(b.dataset.n)), 'Slot dùng lại bản đã chọn, chờ duyệt.');
    if (x === 'update') return done(await withAiText(C => AC.updateSlotFromCell(C, s.id)), 'Đã cập nhật slot từ ô.');
    if (x === 'keep') {
      const r = await confirmBox({ title: 'Giữ bản slot hiện tại?', body: '<p>Slot giữ bài hiện tại dù ô nguồn đã đổi. Ghi lý do để người khác hiểu.</p>', ok: 'Giữ bản slot', extra: '<div class="field"><label for="keep-why">Lý do</label><input id="keep-why" data-collect="reason" placeholder="Ví dụ: bản này đã gửi khách duyệt"></div>' });
      if (!r) return;
      return done(AC.keepSlotVersion(S, s.id, r.reason), 'Đã giữ bản slot.');
    }
    if (x === 'edit') {
      const box2 = openLayer(`<h2>Sửa bài slot</h2><p class="small muted">Lưu thành một bản mới trong lịch sử slot; slot về Chưa duyệt. Không thêm số liệu ngoài ô nguồn.</p>
        <div class="field"><label for="se-text">Bài</label><textarea id="se-text" spellcheck="false" style="min-height:300px">${esc(s.text)}</textarea></div>
        <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="se-save">Lưu</button></div>`, 'dialog');
      box2.querySelector('#se-save').addEventListener('click', () => done(AC.editSlot(S, s.id, box2.querySelector('#se-text').value), 'Đã lưu bản sửa. Slot chờ duyệt lại.'));
      return;
    }
    if (slotImageDialog(s, x, Number(b.dataset.i))) return;
    const ia = slotImageAction(s, x, Number(b.dataset.i)); if (ia) return done(ia[0], ia[1]);
    if (b.dataset.x === 'save') {
      const input = readSlotForm(box);
      const newF = AC.byId(S.formats, input.formatId), newCol = input.columnId || (newF && newF.columnId), oldCol = AC.slotColumnId(S, s);
      if (!s.free && s.sourceCellId && newF && newCol && newCol !== oldCol) {
        const ok = await confirmBox({ title: 'Đổi sang Cột khác?', danger: true, ok: 'Đổi Cột', body: `<p>Slot sẽ chuyển sang Cột "${esc(colName(newCol))}", khác Cột "${esc(colName(oldCol))}". Slot sẽ mất ô nguồn và bài hiện tại, chuyển "Chưa có bài".</p>` });
        if (!ok) return;
      }
      const r = AC.updateSlot(S, s.id, input);
      if (!r.ok) { $('#sf-err', box).textContent = r.error; return; }
      closeLayer(); commit(r.cleared ? 'Đã lưu. Slot chuyển "Chưa có bài".' : (r.slot.needsUpdate ? 'Đã lưu. Slot cần cập nhật theo Format mới.' : 'Đã lưu vị trí slot.'));
    }
    if (b.dataset.x === 'delete') {
      const ok = await confirmBox({ title: 'Xóa slot?', danger: true, ok: 'Xóa slot', body: `<p>Xóa slot ${esc(s.time)} ${esc(AC.dmy(s.date))} · ${esc(fmtFull(s.formatId))}${s.text ? ' cùng bài đã viết' : ''}. Ô nguồn trong ma trận không bị ảnh hưởng.${AC.weekSlots(S, s.weekId).length === 1 ? ' Đây là slot cuối của tuần: nút Tuần mẫu sẽ dùng lại được.' : ''}</p>` });
      if (!ok) return;
      AC.deleteSlot(S, s.id); closeLayer(); commit('Đã xóa slot.');
    }
  });
}
ACTIONS['close-layer'] = () => closeLayer();

// Tải ảnh của người dùng lên ô ảnh (mục 10.9): thu nhỏ cạnh dài về 1600px, lưu JPEG trong trình duyệt
const VID_MAX_BYTES = 3 * 1024 * 1024, VID_MAX_IDB = 25 * 1024 * 1024, IMG_MAX_BYTES = 15 * 1024 * 1024, IMG_MAX_SIDE = 1600;
export const vidMax = () => mediaOk ? VID_MAX_IDB : VID_MAX_BYTES;
CHANGES['img-upload'] = el => {
  const file = el.files && el.files[0]; if (!file) return;
  const id = el.dataset.id, i = Number(el.dataset.i);
  if (/^video\//.test(file.type)) {
    if (file.size > vidMax()) return toast(`Video quá lớn (tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt).`, 'bad');
    const vr = new FileReader();
    vr.onerror = () => toast('Không đọc được tệp video.', 'bad');
    vr.onload = () => {
      const r = AC.uploadSlotImage(S, id, i, { src: String(vr.result), name: file.name });
      if (!r.ok) return toast(r.error, 'bad');
      save(); render(); if (pvRefresh && pvRefresh(id)) {} else openSlot(id); toast(`Đã tải video lên, thành phiên bản ${r.version}.`);
    };
    vr.readAsDataURL(file); return;
  }
  if (!/^image\//.test(file.type)) return toast('Tệp không phải ảnh hoặc video (PNG, JPG, WebP, GIF, MP4, WebM).', 'bad');
  if (file.size > IMG_MAX_BYTES) return toast('Ảnh quá lớn (tối đa 15 MB).', 'bad');
  const reader = new FileReader();
  reader.onerror = () => toast('Không đọc được tệp ảnh.', 'bad');
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => toast('Không mở được ảnh này.', 'bad');
    img.onload = () => {
      const k = Math.min(1, IMG_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      let src = String(reader.result);
      try { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h); src = c.toDataURL('image/jpeg', 0.85); } catch (e) { /* giữ ảnh gốc */ }
      const r = AC.uploadSlotImage(S, id, i, { src, name: file.name, w, h });
      if (!r.ok) return toast(r.error, 'bad');
      save(); render(); if (pvRefresh && pvRefresh(id)) {} else openSlot(id); toast(`Đã tải ảnh lên, thành phiên bản ${r.version}.`);
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
};

// Cấu hình slot: chỉ việc chưa có bài (Tạo bài) và slot cần cập nhật; còn lại ở popup View
function cfgActionsHtml(s, locked) {
  if (locked) return `<p class="small faint">${esc(lockNote(s))}</p>`;
  if (s.free && !s.text) return `<div class="row" id="slot-actions"><button class="btn primary" data-x="free-write">Viết nội dung</button><span class="small muted">Slot tự do: bạn tự viết bài và tải ảnh/video trong View.</span></div>`;
  if (!s.text) { const g = AC.slotWriteGate(S, s.id); return `<div class="row" id="slot-actions"><button class="btn primary" data-x="write" ${g.ok ? '' : 'disabled'} title="${esc(g.ok ? 'Viết bài và ảnh từ một ô Đã duyệt của Cột' : g.reason)}">Tạo bài</button><span class="small muted">${esc(g.ok ? 'Tạo bài lấy một ô Đã duyệt của Cột (ô ít slot dùng nhất), hoặc chọn ô cụ thể bên dưới.' : g.reason + '.')}</span></div>`; }
  if (s.needsUpdate) return `<div class="note warn"><p>Ô nguồn đã đổi sau khi slot được viết.</p><div class="row" id="slot-actions"><button class="btn primary" data-x="update">Cập nhật từ ô</button><button class="btn" data-x="keep">Giữ bản slot</button></div></div>`;
  return '';
}
// Phần Ảnh của slot: dùng chung cho chi tiết slot và Sửa trong Xem như khi đăng
export function slotImageRowsHtml(s, locked) {
  const vid = a => a.kind === 'video';
  const acc = a => (s.free || vid(a)) ? 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp,image/gif';
  const addBar = s.free && !locked ? `<div class="row" style="gap:6px"><button class="btn sm" data-x="asset-add-image">+ Thêm ảnh</button><button class="btn sm" data-x="asset-add-video">+ Thêm video</button></div>` : '';
  return s.assets.length || s.free ? `<section class="stack"><h3>${s.free ? 'Ảnh và video của slot' : 'Ảnh của slot'}</h3><p class="small faint">${s.free ? `Slot tự do: tải ảnh hoặc video của bạn lên (video tối đa ${vidMax() / 1048576} MB), hoặc viết prompt rồi Gen ảnh mô phỏng. Thêm ô nếu bài cần nhiều ảnh/video.` : 'Viết slot đã tạo sẵn ảnh khớp bài (mô phỏng) và xếp vào vị trí trong bài. Chưa ưng thì Gen thêm phiên bản hoặc Tải lên ảnh của bạn; mũi tên đổi phiên bản. Ảnh chỉ nhắc, không chặn Xác nhận.'}</p>${s.assets.length ? '' : '<p class="small muted">Chưa có ô ảnh/video. Bấm Thêm bên dưới.</p>'}${s.assets.map((a, i) => { const ci = a.versions.findIndex(v => v.n === a.current); return `<div class="imgrow" data-img="${i}"><div>${imgThumb(a)}</div>
        <div class="stack" style="gap:2px;min-width:0"><b>${esc(a.name)}</b>${a.place ? `<span class="small">Vị trí: ${esc(a.place)}</span>` : ''}${a.caption ? `<span class="small">Chữ trên ảnh: “${esc(a.caption.replace(/^["“]+|["”]+$/g, ''))}”</span>` : ''}${a.hint ? `<span class="small faint">${esc(a.hint)}</span>` : ''}${vid(a) ? '' : `<span class="small muted">${a.prompt ? `Prompt: ${esc(a.prompt)}` : s.free ? 'Prompt: (trống)' : 'Prompt: (trống, nhận từ ô khi Viết slot)'}</span>`}${a.ref ? `<span class="small mono faint">${esc(a.ref)}</span>` : ''}</div><div class="imgrow-tools">${imgToolbar({ s, a, i, lk: locked, via: 'dlg', idp: 'cfg-', accept: acc(a), meta: false, extra: a.extra && !locked ? `<button class="btn sm ghost danger" data-x="asset-del" data-i="${i}" aria-label="Bỏ ô này">Bỏ</button>` : '' })}</div></div>`; }).join('')}${addBar}</section>` : '';
}
// Thao tác ảnh (data-x img-gen/img-prev/img-next); null nếu không phải thao tác ảnh
export function slotImageAction(s, x, i) {
  if (x === 'img-gen') { const r = AC.genSlotImage(S, s.id, i); return [r, r.ok ? `Đã tạo ảnh phiên bản ${r.version}.` : '']; }
  if (x === 'img-prev' || x === 'img-next') return [AC.stepSlotImage(S, s.id, i, x === 'img-prev' ? -1 : 1), ''];
  if (x === 'asset-add') { const r = AC.addSlotAsset(S, s.id); return [r, r.ok ? 'Đã thêm ô. Bấm Up để chọn ảnh hoặc video.' : '']; }
  if (x === 'asset-add-image' || x === 'asset-add-video') { const r = AC.addSlotAsset(S, s.id, x === 'asset-add-video' ? 'video' : 'image'); return [r, r.ok ? 'Đã thêm ô. Bấm Tải lên để chọn tệp.' : '']; }
  if (x === 'asset-del') return [AC.removeSlotAsset(S, s.id, i), 'Đã bỏ ô.'];
  return null;
}

// Đổi ô nguồn của slot (DST-06)
CHANGES['slot-cell'] = async el => {
  const s = AC.byId(S.slots, el.dataset.id); if (!s || !el.value) return;
  const r = await withAiText(C => AC.changeSlotCell(C, s.id, el.value));
  if (!r.ok) return toast(r.error, 'bad');
  save(); render(); openSlot(s.id); toast('Slot đã viết lại từ ô mới.');
};

// ---- Viết tất cả slot (10.66): viết lần lượt từng slot, có nút Dừng ----
function dealBtnHtml(w) {
  if (!w) return '';
  const run = view.dealRun;
  if (run) return `<button class="btn danger" data-act="deal-stop">Dừng</button><span class="small" id="deal-run" aria-live="polite">Đang viết ${run.done}/${run.total} slot…</span>`;
  const g = AC.dealGate(S, w.id);
  return `<button class="btn ${g.ok ? 'primary' : ''}" data-act="deal-all" data-testid="deal" ${g.ok ? '' : 'disabled'} title="${esc(g.ok ? `Viết ${g.willFill} slot còn trống từ ô Đã duyệt` : 'Chưa bật: ' + g.reasons.join('; '))}">Viết tất cả${g.ok ? ` (${g.willFill} slot)` : ''}</button>`;
}
const DEAL_BUSY_WAIT = 1500, DEAL_DELAY = 160;
ACTIONS['deal-all'] = () => {
  const w = curWeek(); if (!w || view.dealRun) return;
  const g = AC.dealGate(S, w.id); if (!g.ok) return toast(g.reasons.join('; '), 'bad');
  view.dealRun = { weekId: w.id, total: g.willFill, done: 0, stop: false };
  render(); dealStep();
};
ACTIONS['deal-stop'] = () => { if (view.dealRun) view.dealRun.stop = true; };
async function dealStep() {
  const run = view.dealRun; if (!run) return;
  const left = () => AC.dealQueue(S, run.weekId).length;
  if (run.stop || !left() || AC.weekIdOf(curStart()) !== run.weekId) {
    const rest = left();
    if (!rest) AC.dealFinish(S, run.weekId);
    view.dealRun = null; save(); render();
    toast(run.stop && rest ? `Đã viết ${run.done} slot · còn ${rest} slot.` : `Đã viết ${run.done} slot.`);
    return;
  }
  const r = await withAiText(C => AC.dealNext(C, run.weekId), { noAi: run.mock, fallbackAll: true, progress: run });
  if (r.busy && !run.stop) { setTimeout(dealStep, DEAL_BUSY_WAIT); return; }
  if (r.fellBack) run.mock = true;
  if (!r.ok) { view.dealRun = null; save(); render(); toast(r.error, 'bad'); return; }
  run.done++; save();
  if (view.screen === 'week') { render(); }
  setTimeout(dealStep, DEAL_DELAY);
}
