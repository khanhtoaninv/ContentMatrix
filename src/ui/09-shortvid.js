// ---------- UI · Short Vid: ma trận Topic × 7 thẻ Vid, popup từng thẻ (mục 10.72, 10.74, 10.77) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, RENDERERS, S, view } from './00-state.js';
import { $, closeAllLayers, closeLayer, commit, confirmBox, curStart, curWeek, esc, icon, openLayer, richText, save, toast } from './01-core.js';
import { go, render } from './02-shell.js';
import { downloadBytes } from './06-export.js';
import { vidMax } from './04-week.js';
import { coverDialog, subsDialog } from './04j-media.js';
import { textCall } from './04k-aitext.js';
import { findCuts, readMediaList, sttOk, transcribe } from './09b-vidfree.js';
import { bindMix, dyPaneHtml, lenRowHtml, lotHtml, mixBarExtras, mixSubOf, napPaneHtml, shootBannerHtml } from './09e-vidmix.js';
import { mountEditor, openGenImage } from './09c-videdit.js';
import { openSchedule, readyToSchedule, scheduleSelected, slotPaneHtml } from './09d-vidsched.js';

const kindName = k => AC.VID_KINDS[k] || k;
const vfName = id => { const f = AC.byId(S.vidFormats || [], id); return f ? f.name : 'Format đã xóa'; };
const stateChip = v => { const [l, c] = AC.VID_STATES[AC.vidState(v, S)]; return `<span class="st ${c}">${esc(l)}</span>`; };
const fmtSec = s => s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`;
const fmtMb = b => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;
const clamp = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const MAX = AC.VID_MAX_PER_TOPIC;
const weekId = () => { const w = curWeek(); return w ? w.id : null; };

// ---- KPI tuần ----
function kpiBarHtml(w) {
  const k = AC.vidKpi(S, w.id);
  const chip = (v, label, title, cls) => `<span class="kchip${cls ? ' ' + cls : ''}" title="${esc(title)}"><b>${esc(v)}</b> ${esc(label)}</span>`;
  return `<div class="kchips" role="group" aria-label="KPI video tuần" data-testid="sv-kpi"><span class="eyebrow">Video tuần</span>
    ${chip(`${k.ready}/${k.planned}`, 'có thành phẩm', 'Video đã tải lên / kịch bản không hủy (đã duyệt Insight)')}
    ${chip(`${k.planned}/${k.target}`, 'kịch bản so với mục tiêu', `Mục tiêu ${k.target} video/tuần, tối thiểu ${k.min}`, k.planned < k.min ? 'late' : '')}
    ${chip(`${k.bantin}/${k.mix.bantin}`, 'Bản tin', 'Số kịch bản kiểu Bản tin / tỉ lệ mong muốn')}
    ${chip(`${k.noihet}/${k.mix.noihet}`, 'Người nói', 'Số kịch bản kiểu Người nói hết / tỉ lệ mong muốn')}
    ${k.ideas ? chip(k.ideas, 'đề xuất chờ duyệt', 'Insight AI đề xuất, chưa duyệt') : ''}
    ${k.cancelled ? chip(k.cancelled, 'đã hủy', 'Kịch bản đã hủy, không tính KPI') : ''}</div>`;
}

// ---- Ma trận ----
const originName = v => AC.VID_ORIGINS[AC.vidOrigin(v)].name;
function cellHtml(v, dupes, pos) {
  const st = AC.vidState(v, S); const words = AC.vidWords(v.script); const free = AC.vidOrigin(v) !== 'topic';
  const issues = AC.vidIssues(S, v).length + (dupes[v.id] || []).length;
  const need = st === 'IDEA' || st === 'TODO' || st === 'DRAFT';
  return `<button class="cellbtn sv-vcell${v.cancelled ? ' sv-off' : ''}${st === 'IDEA' ? ' idea' : ''}${need ? ' need' : ''}" data-act="sv-open" data-id="${esc(v.id)}" data-testid="sv-card" aria-label="Thẻ Vid ${pos}: ${esc(v.insight.title)}">
    <span class="row" style="justify-content:space-between;gap:4px">${stateChip(v)}${v.script ? `<span class="mono small">${words}</span>` : ''}</span>
    <span class="sv-ct">${esc(clamp(v.insight.title.replace(/^[^:]{2,20}:\s*/, ''), 64))}</span>
    <span class="small muted">${esc(free ? originName(v) : vfName(v.formatId))} · ${esc(kindName(v.kind))}</span>
    ${issues ? `<span class="small" style="color:var(--warn)">${issues} cảnh báo</span>` : ''}
    ${v.file ? '<span class="small" style="color:var(--good)">Có video</span>' : v.edit && v.edit.scenes.length ? `<span class="small faint">Bàn dựng ${v.edit.scenes.length} cảnh</span>` : ''}
  </button>`;
}
function rowHeadHtml(t, vs, g) {
  const nRows = AC.vidGridOf(S, weekId()).length;
  const del = (label, cls) => `<button class="linkbtn small${cls ? ' ' + cls : ''}" data-act="sv-row-del" data-row="${esc(g.id)}">${label}</button>`;
  if (!t) return `<button class="btn" data-act="sv-row-topic" data-row="${esc(g.id)}" data-testid="sv-row-topic" aria-label="Thêm Topic cho hàng này" title="Chọn Topic từ Matrix hoặc nạp Topic ngoài">${icon('plus')}</button><br><span class="small muted">Thêm Topic. Hoặc bấm + ở ô bên cạnh để tạo Vid tự do.</span>${nRows > 1 ? `<br>${del('Bỏ hàng')}` : ''}`;
  if (t.row.free) return `<b>Video tự do</b> <span class="small faint">${vs.length}/${AC.VID_MAX_FREE} thẻ</span><br><span class="small muted">Không đi từ Topic: nạp ý tưởng, kịch bản, bài Matrix, giọng, clip, ảnh, số liệu… rồi lập dàn ý.</span>${vs.length ? '' : `<br>${del('Bỏ hàng', 'danger')}`}`;
  const live = vs.filter(v => !v.cancelled && v.status !== 'IDEA').length; const an = AC.vidAnalysisOf(S, t.row.weekId, t.row.id);
  const busy = view.svBusy;
  return `<b>${t.videoOnly ? 'Chủ đề riêng' : `Topic ${t.row.order}`}</b> <span class="small faint">${vs.length}/${MAX} thẻ</span><br>
    <button class="linkbtn small" data-act="sv-topic-view" data-id="${esc(t.row.id)}">${esc(t.v.title)}</button><br>
    <span class="small muted">${t.v.words.toLocaleString('vi-VN')} chữ · ${live} video</span><br>
    <button class="linkbtn small" data-act="sv-analyze" data-id="${esc(t.row.id)}" data-testid="sv-analyze" ${busy ? 'disabled' : ''} title="${AC.textApiOn(S) ? 'AI đọc Topic, đề xuất số video kèm lý do' : 'Chưa bật AI viết bài: dùng bản mô phỏng (tách theo mục của Topic)'}">${vs.length ? 'Phân tích lại' : 'Phân tích'}</button> ·
    ${del('Bỏ hàng', t.videoOnly ? 'danger' : '')}
    ${an ? `<details class="small"><summary class="small muted">Lý do đề xuất</summary><span class="small" data-testid="sv-reason">${esc(an.reason)}</span></details>` : ''}`;
}
// Hàng Video tự do chứa tới VID_MAX_FREE thẻ (một video dài tách thành nhiều Short): thêm cột cho vừa số thẻ
const colsOf = (w, g) => g.t && g.t.row.free ? Math.max(MAX, Math.min(AC.VID_MAX_FREE, AC.vidsOf(S, w.id, g.t.row.id).length + 1)) : MAX;
function cellsOfRow(w, g, dupes, n) {
  const t = g.t; const vs = t ? AC.vidsOf(S, w.id, t.row.id) : []; const out = []; const free = !t || t.row.free;
  const cap = t && t.row.free ? AC.VID_MAX_FREE : MAX;
  for (let i = 0; i < (n || colsOf(w, g)); i++) {
    if (vs[i]) out.push(cellHtml(vs[i], dupes, i + 1));
    else if (vs.length >= cap) out.push('<span class="faint small">—</span>');
    else out.push(free ? `<button class="cellbtn sv-add" data-act="sv-free-new" data-row="${esc(g.id)}" aria-label="Tạo Vid tự do">${icon('plus')}</button>` : `<button class="cellbtn sv-add" data-act="sv-add" data-id="${esc(t.row.id)}" aria-label="Thêm Vid Topic cho Topic ${esc(t.v.title)}">${icon('plus')}</button>`);
  }
  return out;
}
function matrixHtml(w, grid) {
  const dupes = AC.vidDupes(S, w.id);
  const N = Math.max(MAX, ...grid.map(g => colsOf(w, g)));
  const vsOf = g => g.t ? AC.vidsOf(S, w.id, g.t.row.id) : [];
  const head = `<div class="mc mhd">Topic \\ Thẻ Vid</div>${Array.from({ length: N }, (_, i) => `<div class="mc mhd">Vid ${i + 1}</div>`).join('')}`;
  const rows = grid.map(g => `<div class="mc mrow" data-testid="sv-row">${rowHeadHtml(g.t, vsOf(g), g)}</div>${cellsOfRow(w, g, dupes, N).map(c => `<div class="mc">${c}</div>`).join('')}`).join('');
  const cards = grid.map(g => `<section class="panel mcard" data-testid="sv-row-card"><div>${rowHeadHtml(g.t, vsOf(g), g)}</div><div class="cells">${cellsOfRow(w, g, dupes).map((c, i) => `<div class="stack" style="gap:4px"><span class="small muted">Vid ${i + 1}</span>${c}</div>`).join('')}</div></section>`).join('');
  return `<div class="matrix-wrap"><div class="matrix" data-testid="sv-matrix" style="grid-template-columns:190px repeat(${N}, minmax(124px, 1fr))">${head}${rows}</div></div><div class="mcards">${cards}</div>
    <div class="row"><button class="btn" data-act="sv-row-add" data-testid="sv-row-add" ${grid.length >= AC.VID_MAX_ROWS ? 'disabled' : ''}>${icon('plus')} Thêm hàng</button></div>`;
}
function countsHtml(w) {
  const all = AC.vidsOf(S, w.id); const k = AC.vidKpi(S, w.id);
  const n = f => all.filter(f).length;
  const sch = all.filter(v => !v.cancelled && AC.vidSlotsOf(S, v.id).length).length;
  return `<span>${all.length} thẻ:</span><span class="st st-done">${sch} đã lên lịch</span><span class="st st-done">${k.ready - sch} sẵn sàng</span><span class="st st-ok">${n(v => v.status === 'APPROVED' && !v.cancelled && !v.file)} đã duyệt kịch bản</span><span class="st st-need">${n(v => (v.status === 'TODO' || v.status === 'DRAFT') && !v.cancelled && !v.file)} chưa duyệt</span><span class="st st-need">${k.ideas} đề xuất</span><span class="st st-off">${k.cancelled} đã hủy</span>`;
}
RENDERERS.shortvid = () => {
  AC.ensureShortVid(S);
  const start = curStart(); const w = curWeek(); const l = AC.weekLabelOf(start);
  const head = `<div class="page-head"><div><span class="eyebrow">Short Vid · ${esc(l.range)}</span><h1>Video ngắn</h1>
      <p class="sub">Short Vid đi theo tuần đang chọn ở Dashboard. Bảng bắt đầu trống: dấu + ở cột Topic để thêm Topic (chọn từ Matrix hoặc nạp ngoài), mỗi Topic tối đa ${MAX} thẻ Vid; dấu + ở ô để tạo Vid. Bấm thẻ để viết kịch bản, mở Bàn dựng, tải video thành phẩm rồi Đưa vào lịch.</p></div>
      ${w ? kpiBarHtml(w) : ''}</div>`;
  const grid = w ? AC.vidGridOf(S, w.id) : [];
  const tops = grid.filter(g => g.t && !g.t.row.free).map(g => g.t);
  const work = tops.filter(t => { const vs = AC.vidsOf(S, w.id, t.row.id); return !vs.length || vs.some(v => !v.cancelled && (v.status === 'IDEA' || (v.status === 'TODO' && AC.vidOrigin(v) === 'topic'))); }).length;
  const aiOn = AC.textApiOn(S); const busy = view.svBusy;
  return `${head}<section class="work stack" aria-label="Ma trận Short Vid">
      <div class="work-bar"><div class="row small muted" id="sv-counts">${countsHtml(w)}</div></div>
      <div class="row">
        <button class="btn ${work ? 'primary' : ''}" data-act="sv-write-all" data-testid="sv-write-all" ${work && !busy ? '' : 'disabled'} title="Với mỗi Topic trong bảng: đề xuất Vid (nếu chưa có), duyệt và viết kịch bản. Muốn viết riêng thì bấm từng ô Vid Topic.">${icon('spark')} Viết tất cả Vid Topic${aiOn ? '' : ' (mô phỏng)'}</button>
        ${(() => { const n = readyToSchedule(S, w.id).length; return `<button class="btn ${n ? 'primary' : ''}" data-act="sv-schedule" data-testid="sv-schedule" ${n ? '' : 'disabled'} title="Xếp video thành phẩm vào lịch tuần, mỗi kênh video một slot">${icon('week')} Đưa ${n ? `${n} ` : ''}video vào lịch</button>`; })()}
        <span class="small muted sv-busy" aria-live="polite">${busy ? esc(busy) : ''}</span></div>
      <p class="small faint">Dấu + ở cột Topic: thêm Topic (chọn từ Matrix hoặc nạp ngoài). Dấu + ở ô: tạo Vid tự do khi hàng chưa có Topic, hoặc Vid Topic khi đã có. Thẻ viền cam: cần xử lý. Thẻ mờ: đã hủy, không tính KPI.</p>
      <div id="sv-table">${matrixHtml(w, grid)}</div>
    </section>`;
};

// ---- AI / mô phỏng ----
function setBusy(msg) { view.svBusy = msg || null; document.querySelectorAll('.sv-busy').forEach(b => { b.textContent = msg || ''; }); }
async function aiOr(job, parse, what) {
  if (!AC.textApiOn(S) || !job) return null;
  setBusy(`AI đang ${what}…`);
  try { const r = parse(await textCall(job, 8000)); if (!r.ok) throw new Error(r.error); return r; }
  catch (e) {
    setBusy(null);
    const ok = await confirmBox({ title: 'AI không làm được', body: `<p>${esc(e.message)}</p><p>Dùng bản mô phỏng thay thế? Chọn Hủy để dừng.</p>`, ok: 'Dùng mô phỏng' });
    return ok ? { fallback: true } : { stop: true };
  } finally { setBusy(null); }
}
async function analyzeOne(w, tid) {
  const ai = await aiOr(AC.vidAnalyzeJob(S, w, tid), raw => AC.parseVidInsights(S, raw), 'phân tích Topic');
  if (ai && ai.stop) return { ok: false, stopped: true };
  return AC.analyzeTopic(S, w, tid, ai && ai.ok ? ai : null);
}
ACTIONS['sv-analyze'] = async el => {
  const w = weekId(); const tid = el.dataset.id; if (!w || view.svBusy) return;
  const old = AC.vidsOf(S, w, tid).filter(v => v.status === 'IDEA').length;
  if (old && !(await confirmBox({ title: 'Phân tích lại?', body: `<p>${old} đề xuất chưa duyệt sẽ được thay bằng kết quả mới. Thẻ đã duyệt Insight giữ nguyên.</p>`, ok: 'Phân tích lại' }))) return;
  const r = await analyzeOne(w, tid); if (!r.ok) { render(); return r.stopped ? null : toast(r.error, 'bad'); }
  commit(`Đề xuất ${r.count} thẻ Vid${r.simulated ? ' (mô phỏng)' : ''}. Bấm từng thẻ để xem, chỉnh; rồi Duyệt đề xuất.`);
};
async function writeOne(id) {
  const ai = await aiOr(AC.vidScriptJob(S, id), AC.parseVidScript, 'viết kịch bản');
  if (ai && ai.stop) return { ok: false, stopped: true };
  const cfg = AC.textApiOf(S);
  return AC.writeVidScript(S, id, ai && ai.ok ? ai : null, { provider: cfg.provider, model: cfg.model });
}
ACTIONS['sv-write-all'] = async () => {
  const w = weekId(); if (!w || view.svBusy) return;
  const tops = AC.vidTopicsOf(S, w).filter(t => !t.row.free); let n = 0;
  for (const t of tops) {
    if (!AC.vidsOf(S, w, t.row.id).length) { const r = await analyzeOne(w, t.row.id); if (!r.ok) { if (!r.stopped) toast(r.error, 'bad'); break; } save(); }
    AC.approveIdeas(S, w, t.row.id);
  }
  const ids = AC.vidsOf(S, w).filter(v => v.status === 'TODO' && !v.cancelled && AC.vidOrigin(v) === 'topic').map(v => v.id);
  for (const id of ids) { const r = await writeOne(id); if (!r.ok) { if (!r.stopped) toast(r.error, 'bad'); break; } n++; save(); }
  commit(`Đã viết ${n}/${ids.length} kịch bản Vid Topic.`);
};

// ---- Hàng của bảng: thêm Topic (Matrix hoặc Khác), thêm hàng, bỏ hàng ----
ACTIONS['sv-row-add'] = () => { const r = AC.addVidRow(S, weekId()); if (!r.ok) return toast(r.error, 'bad'); commit('Đã thêm hàng. Chưa có Topic thì dấu + ở ô tạo Vid tự do.'); };
ACTIONS['sv-row-del'] = async el => {
  const w = weekId(); const g = AC.vidGridOf(S, w).find(x => x.id === el.dataset.row); if (!g) return;
  if (g.t) {
    const n = AC.vidsOf(S, w, g.t.row.id).length; const own = g.t.videoOnly && !g.t.row.free;
    if (!(await confirmBox({ title: 'Bỏ hàng?', body: own ? `<p>Xóa chủ đề "${esc(g.t.v.title)}"${n ? ` cùng ${n} thẻ Vid của nó` : ''}.</p>` : g.t.row.free ? '<p>Bỏ hàng Vid tự do (chưa có thẻ).</p>' : `<p>Topic "${esc(g.t.v.title)}" rời khỏi bảng${n ? `, ${n} đề xuất chưa duyệt bị xóa` : ''}. Topic vẫn còn ở Matrix.</p>`, ok: 'Bỏ hàng', danger: true }))) return;
  }
  const r = AC.removeVidRow(S, w, g.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã bỏ hàng.');
};
async function analyzeNew(w, ids) {
  let n = 0; for (const id of ids) { const r = await analyzeOne(w, id); if (!r.ok) { render(); if (!r.stopped) toast(r.error, 'bad'); return; } n += r.count; save(); }
  commit(`Đề xuất ${n} thẻ Vid${AC.textApiOn(S) ? '' : ' (mô phỏng)'}. Bấm thẻ để xem, chỉnh, hoặc bấm Viết tất cả Vid Topic.`);
}
ACTIONS['sv-row-topic'] = el => {
  const w = weekId(); if (!w) return; const gid = el.dataset.row; const ch = AC.vidTopicChoices(S, w);
  openLayer(`<header><div><span class="eyebrow">Short Vid</span><h2>Thêm Topic</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <p class="small muted">Chọn Topic đã có trong Matrix của tuần này. Hệ thống sẽ tự đề xuất số Vid cho Topic. Chọn Khác nếu Topic ở ngoài Matrix (chỉ dùng cho video, không tạo ô trong Matrix).</p>
      <div class="stack" role="radiogroup" aria-label="Chọn Topic" data-testid="vt-choices">
        ${ch.map((c, i) => `<label class="row" style="gap:8px;align-items:flex-start"><input type="radio" name="vt-pick" value="${esc(c.id)}" ${i ? '' : 'checked'}><span>Topic ${c.order}: ${esc(c.title)} <span class="small faint">${c.words.toLocaleString('vi-VN')} chữ</span></span></label>`).join('')}
        <label class="row" style="gap:8px"><input type="radio" name="vt-pick" value="__other" data-testid="vt-other" ${ch.length ? '' : 'checked'}><span><b>Khác</b> <span class="small muted">(nạp Topic từ ngoài)</span></span></label>
      </div>
      <div id="vt-other" class="stack" ${ch.length ? 'hidden' : ''}>
        <p class="small muted">Mỗi chủ đề một đề mục ##, các mục ### như Ngộ nhận, Cách làm… giúp tách ý tốt hơn.</p>
        <div class="field"><label>Từ tệp</label><div class="row"><label class="btn sm" for="vt-file">Chọn tệp .md</label><input id="vt-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" class="sr"></div></div>
        <div class="field"><label for="vt-md">Hoặc dán nội dung</label><textarea id="vt-md" style="min-height:200px" placeholder="## Tên chủ đề&#10;Nội dung…"></textarea></div>
      </div>
      <span class="err" id="vt-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="vt-ok" data-testid="vt-ok">Thêm</button></div>
    </div>`, 'drawer', b => {
    const pick = () => (b.querySelector('input[name=vt-pick]:checked') || {}).value;
    b.querySelectorAll('input[name=vt-pick]').forEach(r => r.addEventListener('change', () => { $('#vt-other', b).hidden = pick() !== '__other'; }));
    $('#vt-file', b).addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(x => { $('#vt-md', b).value = x.replace(/^﻿/, ''); }); });
    $('#vt-ok', b).addEventListener('click', () => {
      const v = pick(); if (!v) { $('#vt-err', b).textContent = 'Chọn một Topic.'; return; }
      if (v === '__other') {
        const r = AC.addVidTopics(S, curStart(), $('#vt-md', b).value, gid);
        if (!r.ok) { $('#vt-err', b).textContent = r.errors.map(e => e.text).join(' '); return; }
        closeLayer(); save(); render(); analyzeNew(w, r.added.map(x => x.id)); return;
      }
      const r = AC.setRowTopic(S, w, gid, v); if (!r.ok) { $('#vt-err', b).textContent = r.error; return; }
      closeLayer(); save(); render(); analyzeNew(w, [v]);
    });
  });
};

// ---- Chủ đề: xem ----
ACTIONS['sv-topic-view'] = el => {
  const row = AC.vidTopicRow(S, el.dataset.id); const v = row && AC.topicCurrent(row); if (!v) return;
  openLayer(`<header><div><span class="eyebrow">${row.videoOnly ? 'Chủ đề chỉ cho video' : `Topic ${row.order}`} · ${v.words.toLocaleString('vi-VN')} chữ</span><h2>${esc(v.title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body"><div class="rich">${richText(v.text)}</div></div>`, 'drawer');
};
// ---- Thêm Insight mới vào ô trống ----
function insightForm(title) {
  const fs = AC.vidFormatsOf(S, true); const f0 = AC.vidFormatsOf(S)[0] || {};
  return `<header><div><span class="eyebrow">Thẻ Vid</span><h2>${esc(title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="si-title">Tiêu đề Insight</label><input id="si-title" maxlength="160"></div>
      <div class="field"><label for="si-idea">Ý chính</label><textarea id="si-idea" rows="3"></textarea></div>
      <div class="field"><label for="si-source">Đoạn căn cứ trong Topic</label><textarea id="si-source" rows="4"></textarea><span class="hint">AI và bản mô phỏng bám vào đoạn này; không thêm số liệu ngoài Topic.</span></div>
      <div class="row"><div class="field"><label for="si-format">Format</label><select id="si-format">${fs.map(f => `<option value="${esc(f.id)}" ${f.id === f0.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="si-kind">Kiểu</label><select id="si-kind">${Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${k === f0.kind ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
      <span class="err" id="si-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="si-ok">Thêm</button></div>
    </div>`;
}
ACTIONS['sv-add'] = el => {
  const w = weekId(); const tid = el.dataset.id; if (!w) return;
  openLayer(insightForm('Thêm Insight'), 'drawer', b => {
    $('#si-format', b).addEventListener('change', () => { const f = AC.byId(S.vidFormats, $('#si-format', b).value); if (f) $('#si-kind', b).value = f.kind; });
    $('#si-ok', b).addEventListener('click', () => {
      const r = AC.addVideo(S, w, tid, { title: $('#si-title', b).value, idea: $('#si-idea', b).value, source: $('#si-source', b).value, formatId: $('#si-format', b).value, kind: $('#si-kind', b).value });
      if (!r.ok) { $('#si-err', b).textContent = r.error; return; }
      closeLayer(); save(); render(); openVid(r.video.id); toast('Đã thêm thẻ Vid. Bấm Viết kịch bản.');
    });
  });
};

// ---- Popup thẻ Vid (bản 4, mục 10.77) ----
const posOf = v => AC.vidsOf(S, v.weekId, v.topicId).findIndex(x => x.id === v.id) + 1;
// Bản kịch bản cũ: chỉ xem. Dựng một bản sao của thẻ với kịch bản, Insight và phần biên tập của bản đó
const clone = o => JSON.parse(JSON.stringify(o));
function ghostOf(v, n) {
  const h = n == null ? null : AC.vidVersions(v).find(x => x.n === n && !x.current); if (!h) return null;
  return Object.assign({}, v, { script: h.script || '', prompts: h.prompts || { audio: '', image: '' }, insight: Object.assign({}, v.insight, h.insight || {}), edit: h.edit ? AC.migrateEdit(clone(h.edit)) : null, verN: h.n, verAt: h.at || '', ro: true });
}
function popHtml(v, G) {
  const R = G || v; const ro = !!G;
  const row = AC.vidTopicRow(S, v.topicId); const tv = row && AC.topicCurrent(row);
  const idea = v.status === 'IDEA'; const off = v.cancelled; const lock = off || ro; const c = AC.vidSettingsOf(S, v); const f = v.file; const words = AC.vidWords(R.script);
  const issues = ro ? [] : AC.vidIssues(S, v).concat(AC.vidDupes(S, v.weekId)[v.id] || []);
  const fs = AC.vidFormatsOf(S, true); const kopt = Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const others = idea ? AC.vidsOf(S, v.weekId, v.topicId).filter(x => x.id !== v.id && x.status === 'IDEA') : [];
  const upOff = off || idea || ro;
  const o = AC.vidOrigin(v); const free = o !== 'topic'; const media = v.media || []; const slots = AC.vidSlotsOf(S, v.id);
  const mediaHtml = !free || o === 'script' || o === 'post' || o === 'mix' ? '' : `<section class="panel stack" style="gap:8px" data-testid="sp-media"><h3>Nguồn vào · ${esc(originName(v))}</h3>
    ${media.length ? media.map(m => `<div class="citem stack" style="gap:6px"><div class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap">
        ${m.kind === 'audio' ? `<audio src="${esc(m.src)}" controls preload="none" style="max-width:100%"></audio>` : `<img class="sv-mthumb" src="${esc(m.thumb || '')}" alt="" ${m.thumb ? '' : 'style="visibility:hidden"'}>`}
        <div class="stack" style="gap:2px;min-width:0;flex:1"><span class="small"><b>${esc(m.name)}</b>${m.dur ? ` · ${AC.fmtClock(m.dur)}` : ''}</span>
        ${m.kind !== 'audio' ? `<label class="small muted" for="sp-md-${esc(m.id)}">Mô tả${m.descSim ? ' (mô phỏng, sửa cho đúng)' : ''}</label><textarea id="sp-md-${esc(m.id)}" data-mdesc="${esc(m.id)}" rows="2" ${lock ? 'readonly' : ''}>${esc(m.desc)}</textarea>` : ''}</div>
        <button class="btn icon sm ghost danger" data-x="media-del" data-m="${esc(m.id)}" aria-label="Bỏ tệp" ${lock ? 'disabled' : ''}>${icon('close')}</button></div>
      ${m.segs ? `<details ${o === 'longroll' ? 'open' : ''}><summary class="small">${m.segs.length} đoạn đã tách (mô phỏng: chia đều ${m.segLen || 5} giây)</summary><div class="stack" style="gap:4px;margin-top:6px">${m.segs.map((g, i) => `<label class="small row" style="gap:6px;flex-wrap:nowrap"><span class="mono faint" style="min-width:86px">${AC.fmtClock(g.from)}–${AC.fmtClock(g.to)}</span><input data-seg="${esc(m.id)}|${esc(g.id)}" value="${esc(g.desc)}" aria-label="Mô tả đoạn ${i + 1}" ${lock ? 'readonly' : ''}></label>`).join('')}
        <div class="row" style="gap:6px"><label class="small">Mỗi đoạn <input id="sp-seglen" type="number" min="2" max="20" step="1" value="${m.segLen || 5}" style="width:60px"> giây</label><button class="btn sm" data-x="split" data-m="${esc(m.id)}" ${lock ? 'disabled' : ''}>Tách lại</button></div></div></details>` : ''}
      </div>`).join('') : '<p class="small muted">Chưa có tệp nguồn.</p>'}
    ${lock ? '' : `<div class="row"><label class="btn sm" for="sp-addmedia">${icon('plus')} Thêm tệp</label><input id="sp-addmedia" type="file" accept="${o === 'audio' ? 'audio/*' : o === 'talk' || o === 'longroll' ? 'video/*' : 'video/*,image/*'}" ${o === 'broll' ? 'multiple' : ''} class="sr"><span class="small faint">Đọc hiểu clip bằng AI nhìn khung hình: chưa có, mô tả hiện là mô phỏng.</span></div>`}
  </section>`;
  const ideasHtml = o === 'broll' || o === 'longroll' ? `<div class="stack" style="gap:6px"><div class="field"><label for="sp-request">Yêu cầu cho lời dẫn</label><textarea id="sp-request" rows="2" ${lock ? 'readonly' : ''} placeholder="Ví dụ: lời dẫn vui, xưng mình">${esc(v.request || '')}</textarea></div>
      <span class="small muted">Ý tưởng kịch bản (mô phỏng):</span><div class="row" style="gap:6px">${AC.brollIdeas(S, v.id).map(it => `<button class="btn sm ${v.ideaKey === it.key ? 'primary' : ''}" data-x="idea" data-k="${it.key}" title="${esc(it.idea)}" ${lock ? 'disabled' : ''}>${esc(it.title)}</button>`).join('')}</div></div>` : '';
  const videoCell = f ? `<div class="sv-video"><video src="${esc(f.src)}#t=0.1" ${f.cover ? `poster="${esc(f.cover.src)}"` : ''} controls playsinline preload="metadata"></video>
        <div class="stack" style="gap:4px;min-width:0"><span class="small"><b>${esc(f.name)}</b> · ${fmtMb(f.size || AC.dataUrlBytes(f.src).length)}</span>
        <span class="small faint">${[f.cover ? 'có ảnh bìa' : 'chưa có ảnh bìa', f.subs ? `phụ đề ${f.subs.cues.length} dòng` : 'chưa có phụ đề'].join(' · ')}</span></div></div>` : '';
  const hint = R.simulated ? 'Bản mô phỏng (chưa bật AI viết bài).' : R.ai ? `AI viết${R.ai.skill ? ` · Skill "${esc(R.ai.skill.name)}" v${R.ai.skill.version}` : ''}${v.edited && !ro ? ' · đã sửa tay' : ''}.` : '';
  const nav = navOf(v.id); const done = AC.vidEditDone(v); const mix = o === 'mix'; const hasScript = !!String(v.script || '').trim();
  const tab = (k, n, label, dis, title) => `<button role="tab" data-nav="tab:${k}" aria-selected="${nav.tab === k}" ${dis ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''} data-testid="sp-tab-${k}"><span class="vp-step">${n}</span>${label}</button>`;
  const insightPane = `<section class="panel stack" style="gap:8px"><h3>Insight</h3>
          <div class="field"><label for="sp-title">Tiêu đề</label><input id="sp-title" value="${esc(R.insight.title)}" maxlength="160" ${lock ? 'readonly' : ''}></div>
          <div class="field"><label for="sp-idea">Ý chính</label><textarea id="sp-idea" class="vp-r2" rows="2" ${lock ? 'readonly' : ''}>${esc(R.insight.idea)}</textarea></div>
          <div class="field"><label for="sp-reason">Lý do làm video này</label><textarea id="sp-reason" class="vp-r2" rows="2" ${lock ? 'readonly' : ''}>${esc(R.insight.reason)}</textarea></div>
          <div class="row"><div class="field"><label for="sp-format">Format</label><select id="sp-format" ${lock ? 'disabled' : ''}>${fs.map(x => `<option value="${esc(x.id)}" ${x.id === v.formatId ? 'selected' : ''}>${esc(x.name)}${x.active === false ? ' (đang tắt)' : ''}</option>`).join('')}</select></div>
            <div class="field"><label for="sp-kind">Kiểu</label><select id="sp-kind" ${lock ? 'disabled' : ''}>${kopt}</select></div></div>
          ${idea ? '' : lenRowHtml(R, lock)}
          <details ${idea ? 'open' : ''}><summary class="small">${free ? 'Nội dung nguồn' : 'Đoạn căn cứ trong Topic'}</summary><div class="field" style="margin-top:6px"><label class="sr" for="sp-source">Đoạn căn cứ</label><textarea id="sp-source" class="vp-r2" rows="2" ${lock ? 'readonly' : ''}>${esc(R.insight.source || v.source)}</textarea></div></details>
          ${others.length ? `<div class="row" style="gap:6px"><label class="sr" for="sp-merge">Gộp với</label><select id="sp-merge">${others.map(o2 => `<option value="${esc(o2.id)}">${esc(clamp(o2.insight.title, 50))}</option>`).join('')}</select><button class="btn sm" data-x="merge">Gộp vào thẻ này</button></div>` : ''}
        </section>`;
  // Phân cảnh: bảng cảnh (vẽ lại ở show) + Script thu gọn bên dưới
  const scriptSec = idea ? '<section class="panel"><p class="small muted">Duyệt Insight để viết kịch bản.</p></section>' : `<section class="panel stack" style="gap:8px">
        <div class="vp-stale" id="sp-stale" hidden>Kịch bản đã sửa sau khi chia cảnh. Cảnh không tự đổi theo. <button class="btn sm primary" data-x="resplit" data-testid="sp-resplit" ${lock ? 'disabled' : ''}>Chia lại cảnh</button></div>
        <details class="vp-src" id="sp-scrd" ${R.edit && R.edit.scenes.length ? '' : 'open'}><summary>Script · <span id="sp-scrc">${words} chữ · ≈ ${fmtSec(AC.vidDuration(S, words))}</span></summary>
          <div class="stack" style="gap:8px;margin-top:6px">${ideasHtml}
          ${issues.length ? `<ul class="small sv-warn" id="sp-warn">${issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <div class="field"><label for="sp-script">Lời nói (mỗi phần mở bằng nhãn trong ngoặc vuông, ví dụ [Hook])</label><textarea id="sp-script" style="min-height:220px" ${lock ? 'readonly' : ''}>${esc(R.script)}</textarea><span class="hint">Nên ${c.wordMin}–${c.wordMax} chữ (nhắm ${c.wordTarget}). ${hint}</span></div>
          <div class="row" style="gap:6px"><button class="btn sm" data-x="dl-script" ${R.script ? '' : 'disabled'}>Tải kịch bản</button><span class="small faint">Kho B-roll dùng chung: chưa có.</span></div></div></details>
        </section>`;
  const outPane = off ? '<p class="small muted">Đã hủy: không cần nộp video.</p>' : idea ? '<p class="small muted">Duyệt Insight rồi mới tải video.</p>' : `${videoCell}
        <label class="vp-drop${f ? ' has' : ''}" for="sp-up" data-testid="sp-drop"><span><b>＋</b><span class="vp-dt">${f ? 'Up lại để thay video' : 'Up video của bạn lên đây'}</span><span class="small muted">Dọc 9:16, MP4/WebM/MOV, tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt. Up lại bất cứ lúc nào.</span></span></label>
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn sm" data-x="cover" ${f && !ro ? '' : 'disabled'}>Bìa</button><button class="btn sm" data-x="subs" data-testid="sp-subs" ${f && !ro ? '' : 'disabled'}>Phụ đề</button>${f ? '<button class="btn sm" data-x="dl-video">Tải video</button>' : ''}<button class="btn sm ghost danger" data-x="file-del" ${f && !ro ? '' : 'disabled'}>Bỏ video</button></div>`;
  // Phiên bản kịch bản: ‹ Bản n/N › và Tạo Kịch bản (bản mới chưa có cảnh)
  const vers = AC.vidVersions(v); const N = vers[vers.length - 1].n; const vi = G ? vers.findIndex(x => x.n === G.verN) : vers.length - 1;
  const writeBtn = o === 'script' ? '' : o === 'audio' || o === 'talk'
    ? `<button class="btn sm ${v.script ? '' : 'primary'}" data-x="stt" ${off || ro || idea || !sttOk() ? 'disabled' : ''} title="${sttOk() ? 'Gửi tệp tới API nhận giọng nói để chép lời' : 'Cần chọn OpenAI ở Setup → AI ảnh & video; hoặc dán lời vào ô Lời nói'}">Chép lời (API)</button>`
    : `<button class="btn sm primary" data-x="write" ${off || ro || idea ? 'disabled' : ''} data-testid="sp-write" title="Viết kịch bản mới: bản đang có lùi vào danh sách bản cũ">Tạo Kịch bản</button>`;
  const verHtml = `<span class="vp-ver" data-testid="sp-ver"><button class="btn sm" data-x="vprev" ${vi > 0 ? '' : 'disabled'} title="Bản kịch bản trước" aria-label="Bản kịch bản trước">‹</button><span class="small vp-vn" id="sp-vn">Bản ${vers[vi].n}/${N}${ro ? ' · cũ' : ''}</span><button class="btn sm" data-x="vnext" ${ro ? '' : 'disabled'} title="Bản kịch bản sau" aria-label="Bản kịch bản sau">›</button>${writeBtn}</span>`;
  return `<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="eyebrow">Thẻ Vid ${posOf(v)} · ${esc(tv ? tv.title : '?')}</span><h2>${esc(R.insight.title)}</h2>
      <div class="row" style="gap:8px">${stateChip(v)}<span class="small muted">${esc(free ? originName(v) : vfName(v.formatId))} · ${esc(kindName(v.kind))}</span><span class="small mono" id="sp-count" title="Số chữ lời nói, thời lượng ước tính">${R.script ? `${words} chữ · ≈ ${fmtSec(AC.vidDuration(S, words))}` : ''}</span><span class="small muted sv-busy" aria-live="polite">${view.svBusy ? esc(view.svBusy) : ''}</span></div></div>
      <div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ${off ? 'primary' : 'ghost'}" data-x="cancel" data-testid="sp-cancel" aria-pressed="${off}" ${ro ? 'disabled' : ''}>${off ? 'Khôi phục' : 'Hủy thẻ'}</button><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></div></header>
    <div class="vp-h1"><div class="vp-tabs tabs" role="tablist" aria-label="Các bước của thẻ Vid">${mix ? tab('nap', (v.inputs || []).length ? '✓' : '1', 'Nạp nguyên liệu', false) + tab('dy', v.dyOk ? '✓' : '2', 'Dàn ý', !(v.cells || []).length, 'Cần nguyên liệu để lập dàn ý') : ''}${tab('ks', v.script && v.status !== 'DRAFT' && v.status !== 'TODO' && !idea ? '✓' : mix ? '3' : '1', 'Kịch bản', mix && !hasScript, mix && !hasScript ? 'Nạp nguyên liệu rồi Dựng nhanh hoặc lập Dàn ý' : '')}${tab('bt', done ? '✓' : mix ? '4' : '2', 'Biên tập', idea || off || (mix && !hasScript), idea ? 'Duyệt Insight trước' : '')}${tab('sl', slots.length ? '✓' : mix ? '5' : '3', 'Xếp Slot', !done || off || idea || ro, ro ? 'Xếp Slot dùng bản đang dùng' : done ? '' : 'Cần video thành phẩm hoặc hoàn thành biên tập trước')}</div>${verHtml}</div>
    ${ro ? `<div class="vp-old" data-testid="sp-old">Đang xem bản ${G.verN}${G.verAt ? ` (${esc(G.verAt)})` : ''}: chỉ xem, gồm kịch bản và phần biên tập của bản này.<button class="btn sm" data-x="usever" data-testid="sp-usever" ${off ? 'disabled' : ''}>Dùng bản này</button></div>` : ''}
    <div class="vp-bar" id="sp-bar">${barHtml(v, null)}</div>
    ${mix ? `<div id="sp-lot">${lotHtml(v)}</div>` : ''}
    <div class="sv-pop${off ? ' sv-off-pop' : ''}" style="display:block">
      ${mix ? '<div data-pane="nap" hidden id="sp-nap"></div><div data-pane="dy" hidden id="sp-dy"></div>' : ''}
      <div data-pane="ks" hidden><fieldset class="vp-fs" ${ro ? 'disabled' : ''}>
        <div data-sub="insight" hidden>${insightPane}</div>
        <div data-sub="scene" hidden><div id="sp-scenes"></div>${scriptSec}</div>
        ${mediaHtml ? `<div data-sub="nguon" hidden>${mediaHtml}</div>` : ''}
      </fieldset></div>
      <div data-pane="bt" hidden>
        <div data-bm="in" hidden><div id="sp-ed"></div></div>
        <div data-bm="out" hidden><fieldset class="vp-fs" ${ro ? 'disabled' : ''}><input id="sp-up" type="file" accept="video/*" class="sr" ${upOff ? 'disabled' : ''}>${outPane}</fieldset></div>
      </div>
      <div data-pane="sl" hidden id="sp-sl"></div>
    </div>
    <span class="err" id="sp-err" role="alert"></span>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Đóng</button><button class="btn primary" data-x="save" data-testid="sp-save" ${lock ? 'disabled' : ''}>Lưu</button></div>`;
}
// Hàng menu phụ: Kịch bản → Insight / Phân cảnh (+ Nguồn vào); Biên tập → Trong app / Ngoài app (+ hoàn tác); Xếp Slot
function barHtml(v, es) {
  const nav = navOf(v.id); const idea = v.status === 'IDEA'; const o = AC.vidOrigin(v); const free = o !== 'topic';
  const media = !(!free || o === 'script' || o === 'post' || o === 'mix');
  const b = (k, l, cur) => `<button data-nav="${k}" aria-selected="${cur === k.split(':')[1]}" data-testid="sp-sub-${k.split(':')[1]}">${l}</button>`;
  if (nav.tab === 'nap') return `<span class="small muted">Nạp mọi nguyên liệu của một video; app tự nhận diện loại${o === 'mix' && AC.lenSecOf(S, v) ? ` · video ${AC.lenSecOf(S, v)} giây` : ''}</span>`;
  if (nav.tab === 'dy') return '<span class="small muted">Duyệt các ô dùng cho kịch bản: kéo sang cột Dàn ý hoặc bấm ＋</span>';
  if (nav.tab === 'bt') {
    const m = AC.editModeOf(v);
    return `${b('mode:in', 'Biên tập trong app', m)}${b('mode:out', 'Biên tập ngoài app', m)}${m === 'out' ? '<span class="small muted">Tự dựng ở phần mềm khác rồi Up thành phẩm</span>' : ''}${mixBarExtras(v, 'bt')}
      ${m === 'in' && es && es.active && !es.ro ? `<span class="vp-sp"><span class="small muted" id="sp-saved">${esc(es.saved || '')}</span><button class="btn sm" data-x="undo" ${es.canUndo ? '' : 'disabled'} data-testid="ve-undo">↶ Hoàn tác</button><button class="btn sm" data-x="redo" ${es.canRedo ? '' : 'disabled'}>↷ Làm lại</button></span>` : ''}`;
  }
  if (nav.tab === 'sl') return `<span class="small muted">Lưới Thứ × Kênh: mỗi ô là một slot của video này</span>${mixBarExtras(v, 'sl')}`;
  const subs = [['insight', 'Insight'], ['scene', 'Phân cảnh']].concat(media ? [['nguon', 'Nguồn vào']] : []);
  return `${subs.map(([k, l]) => b(`ks:${k}`, l, nav.ks)).join('')}${idea ? `<span class="vp-sp"><button class="btn sm primary" data-x="approve-idea">Duyệt Insight</button><button class="btn sm ghost danger" data-x="drop-idea">Bỏ đề xuất</button></span>` : ''}`;
}
const NAV = {};
const startTab = id => { const v = AC.byId(S.videos, id); return v && v.origin === 'mix' && !String(v.script || '').trim() ? 'nap' : 'ks'; };
const navOf = id => { const n = NAV[id] || (NAV[id] = { tab: startTab(id), ks: 'insight', ver: null }); if (n.ks === 'script') n.ks = 'scene'; return n; };
const fmtS = x => String(Math.round(x * 10) / 10).replace('.', ',');
// Bảng Phân cảnh (tab Kịch bản): đọc từ dữ liệu biên tập; sửa lời và mô tả hình ngay trong bảng
function sceneListHtml(v) {
  if (!v.edit || !v.edit.scenes.length) return `<section class="panel stack" style="gap:8px;margin-bottom:12px"><h3>Phân cảnh</h3><p class="small muted">${v.script || (v.media || []).length ? 'Chưa chia cảnh. Bấm Chia cảnh: app chia kịch bản thành các cảnh có lời, mô tả hình và thời lượng; kịch bản được coi là đã duyệt.' : 'Cần kịch bản hoặc tệp nguồn để chia cảnh.'}</p><div class="row"><button class="btn sm primary" data-x="plan-scenes" data-testid="sp-plan" ${!v.ro && (v.script || (v.media || []).length) ? '' : 'disabled'}>Chia cảnh theo kịch bản</button></div></section>`;
  const tl = AC.editTimeline(v);
  return `${shootBannerHtml(v)}<section class="panel stack" style="gap:6px;margin-bottom:12px"><h3>Phân cảnh <span class="small muted">${tl.items.length} cảnh · ${fmtS(tl.total)} giây</span></h3>
    <div class="vp-phw"><table class="vp-phc"><thead><tr><th>STT</th><th>Timeline</th><th>Nội dung</th><th>Mô tả hình ảnh hoặc video minh hoạ</th></tr></thead><tbody>
    ${tl.items.map((it, i) => { const s = it.scene; return `<tr data-testid="sp-scene-row"><td class="n">${i + 1}</td><td class="t">${fmtS(it.t0)}–${fmtS(it.t1)}s<br><span class="small muted">${s.items.length ? `${s.items.length} hình` : s.ph ? 'thẻ giữ chỗ' : 'chưa có hình'}</span></td>
      <td><label class="sr" for="sp-pt-${esc(s.id)}">Lời cảnh ${i + 1}</label><textarea id="sp-pt-${esc(s.id)}" class="vp-r2" rows="2" data-pt="${esc(s.id)}">${esc(s.text)}</textarea></td>
      <td><label class="sr" for="sp-pp-${esc(s.id)}">Mô tả hình cảnh ${i + 1}</label><textarea id="sp-pp-${esc(s.id)}" class="vp-r2" rows="2" data-pp="${esc(s.id)}">${esc(s.prompt || '')}</textarea></td></tr>`; }).join('')}
    </tbody></table></div></section>`;
}
export function openVid(id) {
  const v0 = AC.byId(S.videos, id); if (!v0) return;
  const n0 = navOf(id); let G = ghostOf(v0, n0.ver); if (!G) n0.ver = null;
  const box = openLayer(popHtml(v0, G), 'dialog'); box.classList.add('wide', 'sv-dlg');
  const g = k => box.querySelector('#sp-' + k);
  const err = m => { g('err').textContent = m || ''; };
  const cur = () => G || AC.byId(S.videos, id);
  let ED = null; const sel = {};
  const reopen = msg => { if (ED) ED.stop(); closeAllLayers(); save(); render(); openVid(id); if (msg) toast(msg); };
  const bar = () => { const vv = AC.byId(S.videos, id); const el = g('bar'); if (vv && el) el.innerHTML = barHtml(vv, ED ? Object.assign(ED.state(), { ro: !!G }) : null); };
  const stale = () => { const el = g('stale'); const ta = g('script'); const ed = cur().edit; if (el && ta) el.hidden = !(ed && ed.scenes.length && ed.splitFrom != null && ta.value.trim() !== String(ed.splitFrom).trim()); };
  // Hiện đúng tab / menu phụ / chế độ biên tập; vẽ lại phần động (bảng cảnh, lưới slot, trình biên tập)
  const show = () => {
    const vv = AC.byId(S.videos, id); if (!vv) return; const n = navOf(id); const m = AC.editModeOf(vv);
    if (n.tab === 'ks' && n.ks === 'nguon' && !box.querySelector('[data-sub="nguon"]')) n.ks = 'insight';
    if (G && n.tab === 'sl') n.tab = 'ks';
    const done = AC.vidEditDone(vv); const mx = vv.origin === 'mix'; const hs = !!String(vv.script || '').trim();
    if (mx && !hs && n.tab !== 'nap' && n.tab !== 'dy') n.tab = 'nap';
    box.querySelectorAll('.vp-tabs [data-nav]').forEach(b => { const k = b.dataset.nav.split(':')[1]; b.setAttribute('aria-selected', String(n.tab === k)); if (k === 'sl') { b.disabled = !done || vv.cancelled || vv.status === 'IDEA' || !!G; b.querySelector('.vp-step').textContent = AC.vidSlotsOf(S, id).length ? '✓' : mx ? '5' : '3'; } if (k === 'bt') { b.querySelector('.vp-step').textContent = done ? '✓' : mx ? '4' : '2'; if (mx) b.disabled = !hs || vv.cancelled; } if (k === 'ks') { b.querySelector('.vp-step').textContent = vv.script && vv.status !== 'DRAFT' && vv.status !== 'TODO' && vv.status !== 'IDEA' ? '✓' : mx ? '3' : '1'; if (mx) b.disabled = !hs; } if (k === 'nap') b.querySelector('.vp-step').textContent = (vv.inputs || []).length ? '✓' : '1'; if (k === 'dy') { b.querySelector('.vp-step').textContent = vv.dyOk ? '✓' : '2'; b.disabled = !(vv.cells || []).length || !!G; } });
    box.querySelectorAll('[data-pane]').forEach(e => { e.hidden = e.dataset.pane !== n.tab; });
    box.querySelectorAll('[data-sub]').forEach(e => { e.hidden = e.dataset.sub !== n.ks; });
    box.querySelectorAll('[data-bm]').forEach(e => { e.hidden = e.dataset.bm !== m; });
    if (mx) { const lk = vv.cancelled || !!G; if (n.tab === 'nap') g('nap').innerHTML = napPaneHtml(vv, lk); if (n.tab === 'dy') g('dy').innerHTML = dyPaneHtml(vv, lk); const lot = g('lot'); if (lot) lot.innerHTML = lotHtml(vv); }
    if (n.tab !== 'bt' && ED) ED.pause();
    if (n.tab === 'ks' && n.ks === 'scene') { g('scenes').innerHTML = sceneListHtml(cur()); stale(); }
    if (n.tab === 'sl') g('sl').innerHTML = slotPaneHtml(vv, sel);
    if (n.tab === 'bt' && m === 'in' && !vv.cancelled && vv.status !== 'IDEA') { if (!ED) ED = mountEditor(g('ed'), id, { bar, view: G, done: () => { n.tab = 'sl'; show(); toast('Đã hoàn thành biên tập. Chọn ngày và kênh ở Xếp Slot.'); } }); else ED.render(); }
    bar();
  };
  // Ghi các ô đang sửa vào dữ liệu; trả false nếu có lỗi. Đang xem bản cũ thì không ghi gì
  const persist = () => {
    const v = AC.byId(S.videos, id); if (!v || v.cancelled || G) return true;
    if (g('request')) AC.setVidRequest(S, id, g('request').value);
    box.querySelectorAll('[data-mdesc]').forEach(el => AC.editVidMedia(S, id, el.dataset.mdesc, { desc: el.value }));
    box.querySelectorAll('[data-seg]').forEach(el => { const [mid, gid] = el.dataset.seg.split('|'); AC.editVidMedia(S, id, mid, { segs: [{ id: gid, desc: el.value }] }); });
    const r1 = AC.editInsight(S, id, { title: g('title').value, idea: g('idea').value, reason: g('reason').value, source: g('source').value, formatId: g('format').value, kind: g('kind').value });
    if (!r1.ok) { err(r1.error); return false; }
    if (g('script')) {
      const sc = g('script').value;
      if (!sc.trim() && !v.script) return true;
      const r2 = AC.editVidScript(S, id, { script: sc });
      if (!r2.ok) { err(r2.error); return false; }
    }
    return true;
  };
  if (g('script')) {
    const ta = g('script'); const c = AC.vidSettingsOf(S, v0);
    const cnt = () => { const n = AC.vidWords(ta.value); const t = ta.value.trim() ? `${n} chữ · ≈ ${fmtSec(AC.vidDuration(S, n))}` : ''; g('count').textContent = t; if (g('scrc')) g('scrc').textContent = t || '0 chữ'; g('count').style.color = n && (n < c.wordMin || n > c.wordMax) ? 'var(--warn)' : ''; stale(); };
    cnt(); ta.addEventListener('input', cnt);
  }
  g('format').addEventListener('change', () => { const f = AC.byId(S.vidFormats, g('format').value); if (f) g('kind').value = f.kind; });
  // Bảng Phân cảnh: sửa lời / mô tả hình ghi ngay vào cảnh
  box.addEventListener('change', e => {
    const el = e.target; const sid = el.dataset.pt || el.dataset.pp; if (!sid || G) return;
    const r = AC.editScene(S, id, sid, el.dataset.pt ? { text: el.value } : { prompt: el.value }); if (!r.ok) return err(r.error); save();
  });
  g('up').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (!/^video\//.test(file.type)) { e.target.value = ''; return toast('Tệp không phải video (MP4, WebM, MOV).', 'bad'); }
    if (file.size > vidMax()) { e.target.value = ''; return toast(`Video quá lớn (tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt). Nén bớt rồi tải lại.`, 'bad'); }
    if (!persist()) return;
    const rd = new FileReader(); rd.onerror = () => toast('Không đọc được tệp video.', 'bad');
    rd.onload = () => { const r = AC.setVidFile(S, id, { src: String(rd.result), name: file.name, size: file.size }); if (!r.ok) return toast(r.error, 'bad'); reopen('Đã tải video thành phẩm. Thẻ chuyển sang Sẵn sàng.'); };
    rd.readAsDataURL(file);
  });
  const addIn = g('addmedia');
  if (addIn) addIn.addEventListener('change', async e => {
    const files = [...(e.target.files || [])]; if (!files.length || !persist()) return;
    try { const ms = await readMediaList(files); for (const m of ms) { const r = AC.addVidMedia(S, id, m); if (!r.ok) return toast(r.error, 'bad'); } } catch (er) { return toast(er.message, 'bad'); }
    const v = AC.byId(S.videos, id); const o = AC.vidOrigin(v);
    if (o === 'longroll') { const m = v.media.filter(x => x.kind === 'video').slice(-1)[0]; if (m && !m.segs) AC.splitLongRoll(S, id, m.id, 5); }
    if (o === 'talk') await findCuts(id);
    reopen(`Đã thêm ${files.length} tệp.`);
  });
  box.addEventListener('click', e => {
    const nb = e.target.closest('[data-nav]'); if (!nb || nb.disabled) return; const [kind, val] = nb.dataset.nav.split(':'); const n = navOf(id);
    if (!persist()) return;
    if (kind === 'tab') n.tab = val; else if (kind === 'ks') { n.tab = 'ks'; n.ks = val; } else if (kind === 'mode') { if (!G) { AC.setEditMode(S, id, val); save(); } n.tab = 'bt'; }
    // Sang Biên tập là duyệt kịch bản
    const vv = AC.byId(S.videos, id); if (n.tab === 'bt' && !G && vv && vv.script && (vv.status === 'DRAFT' || vv.status === 'TODO')) { AC.approveVidScript(S, id); save(); render(); }
    show();
  });
  box.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]'); if (!x || x.disabled) return; const k = x.dataset.x; const v = AC.byId(S.videos, id); if (!v) return;
    err('');
    const n = navOf(id);
    if (k === 'vprev' || k === 'vnext') { if (!persist()) return; const vers = AC.vidVersions(v); const i = G ? vers.findIndex(h => h.n === G.verN) : vers.length - 1; const j = Math.max(0, Math.min(vers.length - 1, i + (k === 'vprev' ? -1 : 1))); n.ver = j === vers.length - 1 ? null : vers[j].n; if (n.tab === 'sl') n.tab = 'ks'; reopen(); return; }
    if (k === 'usever') { const from = G.verN; const r = AC.useVidVersion(S, id, from); if (!r.ok) return err(r.error); n.ver = null; reopen(`Đã dùng lại bản ${from}: thành bản ${r.n}, bản mới nhất.`); return; }
    if (k === 'dl-script') { const R = cur(); const t = `# ${R.insight.title}\n\n${g('script') ? g('script').value : R.script}\n`; return downloadBytes(`${AC.slugOf(R.insight.title) || 'kich-ban'}.md`, new TextEncoder().encode(t), 'text/markdown'); }
    if (k === 'undo') { if (ED) ED.undo(); return; }
    if (k === 'redo') { if (ED) ED.redo(); return; }
    if (k === 'dl-video') { if (v.file) return downloadBytes(v.file.name || 'video.mp4', AC.dataUrlBytes(v.file.src), (/^data:([^;,]+)/.exec(v.file.src) || [])[1] || 'video/mp4'); return; }
    if (G) return;   // bản cũ: chỉ xem
    if (k === 'save') { if (!persist()) return; reopen('Đã lưu thẻ Vid.'); return; }
    if (k === 'approve-idea') { if (!persist()) return; const r = AC.approveIdeas(S, v.weekId, v.topicId, [id]); if (!r.ok) return err(r.error); reopen('Đã duyệt Insight. Bấm Tạo Kịch bản.'); return; }
    if (k === 'drop-idea') { const r = AC.dropIdea(S, id); if (!r.ok) return err(r.error); closeAllLayers(); commit('Đã bỏ đề xuất.'); return; }
    if (k === 'merge') { if (!persist()) return; const r = AC.mergeIdeas(S, id, g('merge').value); if (!r.ok) return err(r.error); reopen('Đã gộp 2 Insight.'); return; }
    if (k === 'write') {
      if (view.svBusy) return;
      if (v.script && !(await confirmBox({ title: 'Tạo Kịch bản mới?', body: `<p>Bản đang có (kịch bản, Insight và phần biên tập) lùi vào danh sách bản cũ, xem lại bằng nút ‹ ›. App giữ ${AC.VID_KEEP_VERSIONS} bản gần nhất. Bản mới chưa có cảnh.</p>`, ok: 'Tạo Kịch bản' }))) return;
      if (!persist()) return;
      const r = await writeOne(id); if (!r.ok) { if (!r.stopped) err(r.error); return; }
      if (v.origin === 'mix') { const p = AC.mixPlan(S, id); n.ver = null; n.tab = 'ks'; n.ks = 'scene'; reopen(p.ok ? `Đã viết kịch bản ${r.words} chữ và chia ${p.count} cảnh${p.shoot ? `, ${p.shoot} cảnh cần quay` : ''}.` : `Đã viết kịch bản ${r.words} chữ.`); return; }
      n.ver = null; n.tab = 'ks'; n.ks = 'scene'; reopen(`Đã viết kịch bản ${r.words} chữ. Bấm Chia cảnh để duyệt.`); return;
    }
    if (k === 'cancel') { if (!v.cancelled && !persist()) return; const r = AC.toggleVidCancel(S, id); if (!r.ok) return err(r.error); reopen(r.cancelled ? 'Đã hủy thẻ: không tính KPI, không cần nộp video.' : 'Đã khôi phục thẻ.'); return; }
    if (k === 'file-del') { if (!(await confirmBox({ title: 'Bỏ video?', body: '<p>Video, ảnh bìa và phụ đề của thẻ này sẽ bị xóa khỏi app. Kịch bản giữ nguyên.</p>', ok: 'Bỏ video', danger: true }))) return; const r = AC.setVidFile(S, id, null); if (!r.ok) return err(r.error); reopen('Đã bỏ video.'); return; }
    if (k === 'plan-scenes') { if (!persist()) return; const r = AC.planEdit(S, id); if (!r.ok) return err(r.error); save(); render(); show(); toast(`Đã chia ${r.count} cảnh. Kịch bản đã duyệt; chỉnh tiếp ở Biên tập.`); return; }
    if (k === 'resplit') {
      const ed = v.edit; const has = ed && (ed.scenes.some(s => s.items.length || s.vo) || (ed.cues || []).length);
      if (has && !(await confirmBox({ title: 'Chia lại cảnh?', body: '<p>Chia cảnh lại theo kịch bản mới: hình, VO cảnh và cue đã thêm sẽ bị xóa. VO toàn bài, kiểu caption, frame, nhạc giữ nguyên.</p>', ok: 'Chia lại cảnh' }))) return;
      if (!persist()) return; const r = AC.planEdit(S, id); if (!r.ok) return err(r.error); save(); render(); show(); toast(`Đã chia lại ${r.count} cảnh.`); return;
    }
    if (k === 'cell') { const [d, ch] = x.dataset.k.split('|'); if (sel[ch] === d) delete sel[ch]; else sel[ch] = d; show(); return; }
    if (k === 'export-cmd') { if (!v.edit || !v.edit.scenes.length) return; downloadBytes(`${AC.slugOf(v.insight.title) || 'video'}-lenh-dung.json`, new TextEncoder().encode(JSON.stringify(AC.editCommands(S, v), null, 2)), 'application/json'); return toast('Đã xuất lệnh dựng (JSON).'); }
    if (k === 'slot-go') {
      if (!persist()) return; x.disabled = true;
      const r = await scheduleSelected(id, sel, g('sltime').value, setBusy); x.disabled = false;
      if (!r.ok) return err(r.error);
      closeAllLayers(); commit(`Đã đưa video vào lịch (${r.slots.length} slot${r.skipped.length ? `, bỏ qua ${r.skipped.join(', ')}: đã có slot` : ''}).`);
      toast('Xem và duyệt caption ở Dashboard.', '', { label: 'Mở Dashboard', fn: () => go({ screen: 'week' }) }); return;
    }
    if (k === 'sched') { if (!persist()) return; save(); closeAllLayers(); render(); openSchedule([id]); return; }
    if (k === 'unsched') { if (!(await confirmBox({ title: 'Bỏ khỏi lịch?', body: '<p>Xóa các slot của video này trên Dashboard (bài đã đăng giữ nguyên). Thẻ Vid và video giữ nguyên.</p>', ok: 'Bỏ khỏi lịch', danger: true }))) return; const r = AC.unscheduleVideo(S, id); reopen(`Đã bỏ ${r.removed} slot khỏi lịch${r.kept ? `, giữ ${r.kept} bài đã đăng` : ''}.`); return; }
    if (k === 'media-del') { if (!(await confirmBox({ title: 'Bỏ tệp nguồn?', body: '<p>Cảnh trong Bàn dựng đang dùng tệp này sẽ thành thẻ giữ chỗ.</p>', ok: 'Bỏ tệp', danger: true }))) return; if (!persist()) return; AC.removeVidMedia(S, id, x.dataset.m); reopen('Đã bỏ tệp nguồn.'); return; }
    if (k === 'split') { if (!persist()) return; const r = AC.splitLongRoll(S, id, x.dataset.m, Number(g('seglen').value)); if (!r.ok) return err(r.error); reopen(`Đã tách ${r.count} đoạn (mô phỏng).`); return; }
    if (k === 'idea') { if (!persist()) return; AC.useBrollIdea(S, id, x.dataset.k); reopen('Đã chọn ý tưởng. Bấm Tạo Kịch bản.'); return; }
    if (k === 'stt') {
      const m = (v.media || []).find(z => z.kind === 'audio' || z.kind === 'video'); if (!m || view.svBusy) return;
      if (v.script && !(await confirmBox({ title: 'Chép lời lại?', body: '<p>Lời hiện tại được thay bằng lời chép từ tệp.</p>', ok: 'Chép lời' }))) return;
      if (!persist()) return; setBusy('Đang gửi tệp tới API nhận giọng nói…');
      try { const t = await transcribe(m.src); setBusy(null); const r = AC.editVidScript(S, id, { script: t }); if (!r.ok) return err(r.error); reopen(`Đã chép lời: ${AC.vidWords(t)} chữ.`); } catch (er) { setBusy(null); err(er.message); }
      return;
    }
    if (k === 'cover' || k === 'subs') {
      if (!v.file || !persist()) return;
      const T = { v: v.file, name: v.insight.title, ver: `Thẻ Vid ${posOf(v)}`, text: AC.vidBody(v.script), done: msg => reopen(msg) };
      if (k === 'cover') coverDialog(Object.assign(T, { save: c => AC.setVidCover(S, id, c) })); else subsDialog(Object.assign(T, { save: (c, src) => AC.setVidSubs(S, id, c, src) }));
    }
  });
  bindMix(box, id, {
    show, reopen, err, persist, setBusy, nav: n0, ro: !!G, write: writeOne,
    open: oid => { closeAllLayers(); save(); render(); openVid(oid); },
    openNew: (oid, msg) => { closeAllLayers(); save(); render(); openVid(oid); if (msg) toast(msg); },
  });
  // Đóng popup thẻ Vid tự do mà chưa nạp gì: bỏ thẻ rỗng
  if (v0.origin === 'mix') {
    const mo = new MutationObserver(() => { if (box.isConnected) return; mo.disconnect(); if (AC.purgeEmptyMix(S)) { save(); render(); } });
    mo.observe($('#layer'), { childList: true, subtree: true });
  }
  show();
  return box;
}
ACTIONS['sv-open'] = el => openVid(el.dataset.id);
ACTIONS['sv-free-new'] = el => {
  const w = weekId(); if (!w) return; AC.purgeEmptyMix(S);
  const r = AC.newMixVideo(S, w, { rowId: el && el.dataset ? el.dataset.row : null }); if (!r.ok) return toast(r.error, 'bad');
  save(); render(); openVid(r.video.id);
};
ACTIONS['sv-schedule'] = () => openSchedule();
