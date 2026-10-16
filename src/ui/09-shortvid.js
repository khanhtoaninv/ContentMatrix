// ---------- UI · Short Vid: ma trận Topic × 7 thẻ Vid, popup từng thẻ (mục 10.72, 10.74) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, RENDERERS, S, view } from './00-state.js';
import { $, closeAllLayers, closeLayer, commit, confirmBox, curStart, curWeek, esc, icon, openLayer, richText, save, toast } from './01-core.js';
import { render } from './02-shell.js';
import { copyText } from './05-matrix.js';
import { downloadBytes } from './06-export.js';
import { vidMax } from './04-week.js';
import { coverDialog, subsDialog } from './04j-media.js';
import { textCall } from './04k-aitext.js';
import { findCuts, openFreeCreate, readMediaList, sttOk, transcribe } from './09b-vidfree.js';
import { openEditor } from './09c-videdit.js';
import { openSchedule, readyToSchedule } from './09d-vidsched.js';

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
function rowHeadHtml(t, vs) {
  if (t.row.free) return `<b>Video tự do</b> <span class="small faint">${vs.length}/${MAX} thẻ</span><br><span class="small muted">Không đi từ Topic: kịch bản, giọng đọc, bài Matrix, quay người nói, b-roll.</span><br>
    <button class="linkbtn small" data-act="sv-free-new" ${vs.length >= MAX ? 'disabled' : ''}>Tạo Vid tự do</button>${vs.length ? '' : ` · <button class="linkbtn small danger" data-act="sv-topic-remove" data-id="${esc(t.row.id)}">Bỏ hàng</button>`}`;
  const live = vs.filter(v => !v.cancelled && v.status !== 'IDEA').length; const an = AC.vidAnalysisOf(S, t.row.weekId, t.row.id);
  const busy = view.svBusy;
  return `<b>${t.videoOnly ? 'Chủ đề riêng' : `Topic ${t.row.order}`}</b> <span class="small faint">${vs.length}/${MAX} thẻ</span><br>
    <button class="linkbtn small" data-act="sv-topic-view" data-id="${esc(t.row.id)}">${esc(t.v.title)}</button><br>
    <span class="small muted">${t.v.words.toLocaleString('vi-VN')} chữ · ${live} video</span><br>
    <button class="linkbtn small" data-act="sv-analyze" data-id="${esc(t.row.id)}" data-testid="sv-analyze" ${busy ? 'disabled' : ''} title="${AC.textApiOn(S) ? 'AI đọc Topic, đề xuất số video kèm lý do' : 'Chưa bật AI viết bài: dùng bản mô phỏng (tách theo mục của Topic)'}">${vs.length ? 'Phân tích lại' : 'Phân tích'}</button> ·
    ${t.videoOnly ? `<button class="linkbtn small danger" data-act="sv-topic-remove" data-id="${esc(t.row.id)}">Xóa</button>` : `<button class="linkbtn small" data-act="sv-topic-hide" data-id="${esc(t.row.id)}" title="Bỏ Topic này khỏi Short Vid (vẫn ở Matrix)">Ẩn</button>`}
    ${an ? `<details class="small"><summary class="small muted">Lý do đề xuất</summary><span class="small" data-testid="sv-reason">${esc(an.reason)}</span></details>` : ''}`;
}
function cellsOfRow(w, t, dupes) {
  const vs = AC.vidsOf(S, w.id, t.row.id); const out = [];
  for (let i = 0; i < MAX; i++) {
    if (vs[i]) out.push(cellHtml(vs[i], dupes, i + 1));
    else if (i === vs.length) out.push(t.row.free ? `<button class="cellbtn sv-add" data-act="sv-free-new" aria-label="Tạo Vid tự do">${icon('plus')}<span class="small muted">Tạo Vid tự do</span></button>` : `<button class="cellbtn sv-add" data-act="sv-add" data-id="${esc(t.row.id)}" aria-label="Thêm Insight cho Topic ${esc(t.v.title)}">${icon('plus')}<span class="small muted">Thêm Insight</span></button>`);
    else out.push('<span class="faint small">—</span>');
  }
  return out;
}
function matrixHtml(w, tps) {
  const dupes = AC.vidDupes(S, w.id);
  const head = `<div class="mc mhd">Topic \\ Thẻ Vid</div>${Array.from({ length: MAX }, (_, i) => `<div class="mc mhd">Vid ${i + 1}</div>`).join('')}`;
  const rows = tps.map(t => { const vs = AC.vidsOf(S, w.id, t.row.id); return `<div class="mc mrow">${rowHeadHtml(t, vs)}</div>${cellsOfRow(w, t, dupes).map(c => `<div class="mc">${c}</div>`).join('')}`; }).join('');
  const cards = tps.map(t => { const vs = AC.vidsOf(S, w.id, t.row.id); return `<section class="panel mcard"><div>${rowHeadHtml(t, vs)}</div><div class="cells">${cellsOfRow(w, t, dupes).map((c, i) => `<div class="stack" style="gap:4px"><span class="small muted">Vid ${i + 1}</span>${c}</div>`).join('')}</div></section>`; }).join('');
  return `<div class="matrix-wrap"><div class="matrix" data-testid="sv-matrix" style="grid-template-columns:190px repeat(${MAX}, minmax(124px, 1fr))">${head}${rows}</div></div><div class="mcards">${cards}</div>`;
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
      <p class="sub">Short Vid đi theo tuần đang chọn ở Dashboard. Hàng là Topic (dùng chung với Matrix, hoặc chủ đề nạp riêng), mỗi Topic tối đa ${MAX} thẻ Vid, mỗi thẻ một Insight; hàng Video tự do cho thẻ không đi từ Topic. Bấm thẻ để viết kịch bản, mở Bàn dựng, tải video thành phẩm rồi Đưa vào lịch.</p></div>
      ${w ? kpiBarHtml(w) : ''}</div>`;
  const tps = w ? AC.vidTopicsOf(S, w.id) : []; const hidden = w ? AC.vidHiddenOf(S, w.id) : [];
  const importBtn = `<button class="btn ${tps.length ? '' : 'primary'}" data-act="sv-import">${icon('plus')} Nạp chủ đề cho video</button>`;
  const freeBtn = `<button class="btn" data-act="sv-free-new" data-testid="sv-free-new">${icon('plus')} Tạo Vid tự do</button>`;
  if (!tps.length) return `${head}<div class="empty" data-testid="sv-empty"><p>Tuần này chưa có Topic cho video. Topic nạp ở Matrix sẽ hiện ở đây; hoặc nạp chủ đề chỉ dùng cho video (không tạo ô trong Matrix), hoặc tạo Vid tự do từ kịch bản, giọng đọc, clip có sẵn.</p><div class="row">${importBtn}${freeBtn}${hidden.length ? `<button class="btn" data-act="sv-unhide">Hiện lại ${hidden.length} Topic đã ẩn</button>` : ''}</div></div>`;
  const noVid = tps.filter(t => !AC.vidsOf(S, w.id, t.row.id).length).length;
  const ideas = AC.vidKpi(S, w.id).ideas; const todo = AC.vidsOf(S, w.id).filter(v => v.status === 'TODO' && !v.cancelled).length;
  const aiOn = AC.textApiOn(S); const busy = view.svBusy;
  return `${head}<section class="work stack" aria-label="Ma trận Short Vid">
      <div class="work-bar"><div class="row small muted" id="sv-counts">${countsHtml(w)}</div></div>
      <div class="row">${importBtn}${freeBtn}
        <button class="btn ${noVid ? 'primary' : ''}" data-act="sv-analyze-all" data-testid="sv-analyze-all" ${noVid && !busy ? '' : 'disabled'} title="Phân tích lần lượt các Topic chưa có thẻ Vid">${icon('spark')} Phân tích ${noVid ? `${noVid} Topic chưa có video` : 'xong'}${aiOn ? '' : ' (mô phỏng)'}</button>
        <button class="btn" data-act="sv-approve-ideas" data-testid="sv-approve-ideas" ${ideas ? '' : 'disabled'}>Duyệt ${ideas ? `${ideas} ` : ''}đề xuất</button>
        <button class="btn ${todo ? 'primary' : ''}" data-act="sv-write-all" data-testid="sv-write-all" ${todo && !busy ? '' : 'disabled'}>Viết ${todo ? `${todo} ` : ''}kịch bản${aiOn ? '' : ' (mô phỏng)'}</button>
        ${(() => { const n = readyToSchedule(S, w.id).length; return `<button class="btn ${n ? 'primary' : ''}" data-act="sv-schedule" data-testid="sv-schedule" ${n ? '' : 'disabled'} title="Xếp video thành phẩm vào lịch tuần, mỗi kênh video một slot">${icon('week')} Đưa ${n ? `${n} ` : ''}video vào lịch</button>`; })()}
        ${hidden.length ? `<button class="btn ghost" data-act="sv-unhide">Hiện lại ${hidden.length} Topic đã ẩn</button>` : ''}
        <span class="small muted sv-busy" aria-live="polite">${busy ? esc(busy) : ''}</span></div>
      <p class="small faint">Thẻ viền cam: cần xử lý (đề xuất chờ duyệt, chưa có kịch bản hoặc chưa duyệt). Thẻ mờ: đã hủy, không tính KPI.</p>
      <div id="sv-table">${matrixHtml(w, tps)}</div>
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
ACTIONS['sv-analyze-all'] = async () => {
  const w = weekId(); if (!w || view.svBusy) return;
  const list = AC.vidTopicsOf(S, w).filter(t => !AC.vidsOf(S, w, t.row.id).length); let n = 0;
  for (const t of list) { const r = await analyzeOne(w, t.row.id); if (!r.ok) { if (!r.stopped) toast(r.error, 'bad'); break; } n += r.count; save(); }
  commit(`Đã đề xuất ${n} thẻ Vid cho ${list.length} Topic.`);
};
ACTIONS['sv-approve-ideas'] = () => {
  const w = weekId(); const r = AC.approveIdeas(S, w, null); if (!r.ok) return toast(r.error, 'bad');
  commit(`Đã duyệt ${r.count} Insight. Bấm Viết kịch bản.`);
};
async function writeOne(id) {
  const ai = await aiOr(AC.vidScriptJob(S, id), AC.parseVidScript, 'viết kịch bản');
  if (ai && ai.stop) return { ok: false, stopped: true };
  const cfg = AC.textApiOf(S);
  return AC.writeVidScript(S, id, ai && ai.ok ? ai : null, { provider: cfg.provider, model: cfg.model });
}
ACTIONS['sv-write-all'] = async () => {
  const w = weekId(); if (!w || view.svBusy) return;
  const ids = AC.vidsOf(S, w).filter(v => v.status === 'TODO' && !v.cancelled).map(v => v.id); let n = 0;
  for (const id of ids) { const r = await writeOne(id); if (!r.ok) { if (!r.stopped) toast(r.error, 'bad'); break; } n++; save(); }
  commit(`Đã viết ${n}/${ids.length} kịch bản.`);
};

// ---- Chủ đề: xem, nạp riêng, ẩn, xóa ----
ACTIONS['sv-topic-view'] = el => {
  const row = AC.vidTopicRow(S, el.dataset.id); const v = row && AC.topicCurrent(row); if (!v) return;
  openLayer(`<header><div><span class="eyebrow">${row.videoOnly ? 'Chủ đề chỉ cho video' : `Topic ${row.order}`} · ${v.words.toLocaleString('vi-VN')} chữ</span><h2>${esc(v.title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body"><div class="rich">${richText(v.text)}</div></div>`, 'drawer');
};
ACTIONS['sv-import'] = () => {
  openLayer(`<header><div><span class="eyebrow">Short Vid</span><h2>Nạp chủ đề cho video</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <p class="small muted">Chủ đề nạp ở đây chỉ dùng cho video, không tạo ô trong Matrix. Cùng định dạng tệp Topic: mỗi chủ đề một đề mục ##, các mục ### như Ngộ nhận, Cách làm… giúp tách ý tốt hơn. Topic nạp ở Matrix đã tự có ở Short Vid.</p>
      <div class="field"><label>Từ tệp</label><div class="row"><label class="btn sm" for="vt-file">Chọn tệp .md</label><input id="vt-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" class="sr"></div></div>
      <div class="field"><label for="vt-md">Hoặc dán nội dung</label><textarea id="vt-md" style="min-height:240px" placeholder="## Tên chủ đề&#10;Nội dung…"></textarea></div>
      <span class="err" id="vt-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="vt-ok">Nạp</button></div>
    </div>`, 'drawer', b => {
    $('#vt-file', b).addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { $('#vt-md', b).value = t.replace(/^﻿/, ''); }); });
    $('#vt-ok', b).addEventListener('click', () => {
      const r = AC.addVidTopics(S, curStart(), $('#vt-md', b).value);
      if (!r.ok) { $('#vt-err', b).textContent = r.errors.map(e => e.text).join(' '); return; }
      closeLayer(); commit(`Đã nạp ${r.added.length} chủ đề cho video${r.skipped.length ? `, bỏ qua ${r.skipped.length} chủ đề trùng` : ''}.`);
    });
  });
};
ACTIONS['sv-topic-remove'] = async el => {
  const row = AC.vidTopicRow(S, el.dataset.id); if (!row) return; const n = S.videos.filter(v => v.topicId === row.id).length;
  if (!(await confirmBox({ title: 'Xóa chủ đề?', body: `<p>Xóa chủ đề "${esc(AC.topicCurrent(row).title)}"${n ? ` cùng ${n} thẻ Vid (Insight, kịch bản, video) của nó` : ''}.</p>`, ok: 'Xóa', danger: true }))) return;
  const r = AC.removeVidTopic(S, row.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã xóa chủ đề.');
};
ACTIONS['sv-topic-hide'] = el => { const r = AC.hideVidTopic(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã ẩn Topic khỏi Short Vid (vẫn ở Matrix).'); };
ACTIONS['sv-unhide'] = () => { const n = AC.showVidTopics(S, weekId()); commit(`Đã hiện lại ${n} Topic.`); };

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

// ---- Popup thẻ Vid ----
const posOf = v => AC.vidsOf(S, v.weekId, v.topicId).findIndex(x => x.id === v.id) + 1;
function popHtml(v) {
  const row = AC.vidTopicRow(S, v.topicId); const tv = row && AC.topicCurrent(row);
  const idea = v.status === 'IDEA'; const off = v.cancelled; const c = AC.vidSettingsOf(S); const f = v.file; const words = AC.vidWords(v.script);
  const issues = AC.vidIssues(S, v).concat(AC.vidDupes(S, v.weekId)[v.id] || []);
  const fs = AC.vidFormatsOf(S, true); const kopt = Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const others = idea ? AC.vidsOf(S, v.weekId, v.topicId).filter(x => x.id !== v.id && x.status === 'IDEA') : [];
  const upOff = off || idea;
  const o = AC.vidOrigin(v); const free = o !== 'topic'; const media = v.media || []; const slots = AC.vidSlotsOf(S, v.id);
  const canEdit = !idea && !off && (!!v.script || media.length > 0);
  const writeBtn = o === 'script' ? '' : o === 'audio' || o === 'talk'
    ? `<button class="btn sm ${v.script ? '' : 'primary'}" data-x="stt" ${off || !sttOk() ? 'disabled' : ''} title="${sttOk() ? 'Gửi tệp tới API nhận giọng nói để chép lời' : 'Cần chọn OpenAI ở Setup → AI ảnh & video; hoặc dán lời vào ô Lời nói'}">Chép lời (API)</button>`
    : `<button class="btn sm ${v.script ? '' : 'primary'}" data-x="write" ${off ? 'disabled' : ''} data-testid="sp-write">${v.script ? 'Tạo lại' : o === 'broll' || o === 'longroll' ? 'Viết lời dẫn' : 'Viết kịch bản'}</button>`;
  const mediaHtml = !free || o === 'script' || o === 'post' ? '' : `<section class="panel stack" style="gap:8px" data-testid="sp-media"><h3>Nguồn vào · ${esc(originName(v))}</h3>
    ${media.length ? media.map(m => `<div class="citem stack" style="gap:6px"><div class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap">
        ${m.kind === 'audio' ? `<audio src="${esc(m.src)}" controls preload="none" style="max-width:100%"></audio>` : `<img class="sv-mthumb" src="${esc(m.thumb || '')}" alt="" ${m.thumb ? '' : 'style="visibility:hidden"'}>`}
        <div class="stack" style="gap:2px;min-width:0;flex:1"><span class="small"><b>${esc(m.name)}</b>${m.dur ? ` · ${AC.fmtClock(m.dur)}` : ''}</span>
        ${m.kind !== 'audio' ? `<label class="small muted" for="sp-md-${esc(m.id)}">Mô tả${m.descSim ? ' (mô phỏng, sửa cho đúng)' : ''}</label><textarea id="sp-md-${esc(m.id)}" data-mdesc="${esc(m.id)}" rows="2" ${off ? 'readonly' : ''}>${esc(m.desc)}</textarea>` : ''}</div>
        <button class="btn icon sm ghost danger" data-x="media-del" data-m="${esc(m.id)}" aria-label="Bỏ tệp" ${off ? 'disabled' : ''}>${icon('close')}</button></div>
      ${m.segs ? `<details ${o === 'longroll' ? 'open' : ''}><summary class="small">${m.segs.length} đoạn đã tách (mô phỏng: chia đều ${m.segLen || 5} giây)</summary><div class="stack" style="gap:4px;margin-top:6px">${m.segs.map((g, i) => `<label class="small row" style="gap:6px;flex-wrap:nowrap"><span class="mono faint" style="min-width:86px">${AC.fmtClock(g.from)}–${AC.fmtClock(g.to)}</span><input data-seg="${esc(m.id)}|${esc(g.id)}" value="${esc(g.desc)}" aria-label="Mô tả đoạn ${i + 1}" ${off ? 'readonly' : ''}></label>`).join('')}
        <div class="row" style="gap:6px"><label class="small">Mỗi đoạn <input id="sp-seglen" type="number" min="2" max="20" step="1" value="${m.segLen || 5}" style="width:60px"> giây</label><button class="btn sm" data-x="split" data-m="${esc(m.id)}" ${off ? 'disabled' : ''}>Tách lại</button></div></div></details>` : ''}
      </div>`).join('') : '<p class="small muted">Chưa có tệp nguồn.</p>'}
    ${off ? '' : `<div class="row"><label class="btn sm" for="sp-addmedia">${icon('plus')} Thêm tệp</label><input id="sp-addmedia" type="file" accept="${o === 'audio' ? 'audio/*' : o === 'talk' || o === 'longroll' ? 'video/*' : 'video/*,image/*'}" ${o === 'broll' ? 'multiple' : ''} class="sr"><span class="small faint">Đọc hiểu clip bằng AI nhìn khung hình: chưa có, mô tả hiện là mô phỏng.</span></div>`}
  </section>`;
  const ideasHtml = o === 'broll' || o === 'longroll' ? `<div class="stack" style="gap:6px"><div class="field"><label for="sp-request">Yêu cầu cho lời dẫn</label><textarea id="sp-request" rows="2" ${off ? 'readonly' : ''} placeholder="Ví dụ: lời dẫn vui, xưng mình">${esc(v.request || '')}</textarea></div>
      <span class="small muted">Ý tưởng kịch bản (mô phỏng):</span><div class="row" style="gap:6px">${AC.brollIdeas(S, v.id).map(it => `<button class="btn sm ${v.ideaKey === it.key ? 'primary' : ''}" data-x="idea" data-k="${it.key}" title="${esc(it.idea)}" ${off ? 'disabled' : ''}>${esc(it.title)}</button>`).join('')}</div></div>` : '';
  const schedHtml = idea || (!f && !slots.length) ? '' : `<section class="panel stack" style="gap:6px" data-testid="sp-sched"><h3>Lịch đăng</h3>
    ${slots.length ? `${slots.map(sl => `<div class="row small" style="gap:6px"><b>${esc((AC.byId(S.channels, sl.channelId) || {}).name || sl.channelId)}</b><span class="mono">${esc(AC.dmy(sl.date))} ${esc(sl.time)}</span><span class="muted">${sl.state === 'PUBLISHED' ? 'Đã đăng' : sl.state === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt caption'}</span></div>`).join('')}
      <div class="row"><button class="btn sm ghost danger" data-x="unsched" ${slots.every(sl => sl.state === 'PUBLISHED') ? 'disabled' : ''}>Bỏ khỏi lịch</button><span class="small faint">Caption từng kênh sửa và duyệt trong View ở Dashboard.</span></div>`
      : off ? '' : '<div class="row"><button class="btn sm primary" data-x="sched" data-testid="sp-sched-btn">Đưa vào lịch</button><span class="small faint">Mỗi kênh video một slot, caption viết từ kịch bản.</span></div>'}</section>`;
  const videoCell = off ? '<p class="small muted">Đã hủy: không cần nộp video.</p>' : idea ? '<p class="small muted">Duyệt Insight rồi mới tải video.</p>' : f
    ? `<div class="sv-video"><video src="${esc(f.src)}#t=0.1" ${f.cover ? `poster="${esc(f.cover.src)}"` : ''} controls playsinline preload="metadata"></video>
        <div class="stack" style="gap:4px;min-width:0"><span class="small"><b>${esc(f.name)}</b> · ${fmtMb(f.size || AC.dataUrlBytes(f.src).length)}</span>
        <span class="small faint">${[f.cover ? 'có ảnh bìa' : 'chưa có ảnh bìa', f.subs ? `phụ đề ${f.subs.cues.length} dòng` : 'chưa có phụ đề'].join(' · ')}</span></div></div>`
    : `<p class="small muted">Chưa có video. MP4, WebM, MOV; tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt.</p>`;
  const hint = v.simulated ? 'Bản mô phỏng (chưa bật AI viết bài).' : v.ai ? `AI viết${v.ai.skill ? ` · Skill "${esc(v.ai.skill.name)}" v${v.ai.skill.version}` : ''}${v.edited ? ' · đã sửa tay' : ''}.` : '';
  return `<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="eyebrow">Thẻ Vid ${posOf(v)} · ${esc(tv ? tv.title : '?')}</span><h2>${esc(v.insight.title)}</h2>
      <div class="row" style="gap:8px">${stateChip(v)}<span class="small muted">${esc(vfName(v.formatId))} · ${esc(kindName(v.kind))}</span><span class="small mono" id="sp-count" title="Số chữ lời nói, thời lượng ước tính">${v.script ? `${words} chữ · ≈ ${fmtSec(AC.vidDuration(S, words))}` : ''}</span><span class="small muted sv-busy" aria-live="polite">${view.svBusy ? esc(view.svBusy) : ''}</span></div></div>
      <button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="sv-tools" role="toolbar" aria-label="Công cụ của thẻ Vid">
      <div class="sv-tg"><span class="eyebrow">${idea ? 'Insight' : 'Kịch bản'}</span><div class="row" style="gap:6px">
        ${idea ? `<button class="btn sm primary" data-x="approve-idea">Duyệt Insight</button><button class="btn sm ghost danger" data-x="drop-idea">Bỏ đề xuất</button>`
        : `${writeBtn}
        <button class="btn sm ${v.script && v.status !== 'APPROVED' && !off ? 'primary' : ''}" data-x="approve" data-testid="sp-approve" ${off || !v.script ? 'disabled' : ''}>Duyệt kịch bản</button>
        <button class="btn sm ${off ? 'primary' : 'ghost'}" data-x="cancel" data-testid="sp-cancel" aria-pressed="${off}">${off ? 'Khôi phục' : 'Hủy thẻ'}</button>`}</div></div>
      <div class="sv-tg"><span class="eyebrow">Biên tập video</span><div class="row" style="gap:6px">
        <label class="btn sm ${v.status === 'APPROVED' && !f ? 'primary' : ''}" for="sp-up" style="${upOff ? 'opacity:.5;pointer-events:none' : ''}">${icon('up')} ${f ? 'Tải bản khác' : 'Up video'}</label><input id="sp-up" type="file" accept="video/*" class="sr" ${upOff ? 'disabled' : ''}>
        <button class="btn sm" data-x="cover" ${f && !off ? '' : 'disabled'}>Bìa</button><button class="btn sm" data-x="subs" data-testid="sp-subs" ${f && !off ? '' : 'disabled'}>Phụ đề</button>
        <button class="btn sm ghost danger" data-x="file-del" ${f && !off ? '' : 'disabled'}>Bỏ video</button></div>
        <div class="row" style="gap:6px"><button class="btn sm ${canEdit && !f ? 'primary' : ''}" data-x="edit" data-testid="sp-edit" ${canEdit ? '' : 'disabled'} title="Chia cảnh, gán hình/clip, giọng đọc, caption, frame, nhạc nền; xem trước (mô phỏng)">${icon('film')} Bàn dựng${v.edit && v.edit.scenes.length ? ` · ${v.edit.scenes.length} cảnh` : ''}</button></div></div>
      <div class="sv-tg"><span class="eyebrow">Tài nguyên</span><div class="row" style="gap:6px">
        <button class="btn sm" data-x="copy-audio" ${v.prompts.audio ? '' : 'disabled'}>Chép Prompt Audio</button><button class="btn sm" data-x="copy-image" ${v.prompts.image ? '' : 'disabled'}>Chép Prompt Hình ảnh</button>
        <button class="btn sm" data-x="dl-script" ${v.script ? '' : 'disabled'}>Tải kịch bản</button>${f ? '<button class="btn sm" data-x="dl-video">Tải video</button>' : ''}</div>
        <span class="small faint">Kho B-roll dùng chung, SFX: chưa có.</span></div>
    </div>
    <div class="sv-pop${off ? ' sv-off-pop' : ''}">
      <div class="stack" style="gap:12px;min-width:0">
        <section class="panel stack" style="gap:8px"><h3>Insight</h3>
          <div class="field"><label for="sp-title">Tiêu đề</label><input id="sp-title" value="${esc(v.insight.title)}" maxlength="160" ${off ? 'readonly' : ''}></div>
          <div class="field"><label for="sp-idea">Ý chính</label><textarea id="sp-idea" rows="2" ${off ? 'readonly' : ''}>${esc(v.insight.idea)}</textarea></div>
          <div class="field"><label for="sp-reason">Lý do làm video này</label><textarea id="sp-reason" rows="2" ${off ? 'readonly' : ''}>${esc(v.insight.reason)}</textarea></div>
          <div class="row"><div class="field"><label for="sp-format">Format</label><select id="sp-format" ${off ? 'disabled' : ''}>${fs.map(x => `<option value="${esc(x.id)}" ${x.id === v.formatId ? 'selected' : ''}>${esc(x.name)}${x.active === false ? ' (đang tắt)' : ''}</option>`).join('')}</select></div>
            <div class="field"><label for="sp-kind">Kiểu</label><select id="sp-kind" ${off ? 'disabled' : ''}>${kopt}</select></div></div>
          <details ${idea ? 'open' : ''}><summary class="small">${free ? 'Nội dung nguồn' : 'Đoạn căn cứ trong Topic'}</summary><div class="field" style="margin-top:6px"><label class="sr" for="sp-source">Đoạn căn cứ</label><textarea id="sp-source" rows="4" ${off ? 'readonly' : ''}>${esc(v.source)}</textarea></div></details>
          ${others.length ? `<div class="row" style="gap:6px"><label class="sr" for="sp-merge">Gộp với</label><select id="sp-merge">${others.map(o => `<option value="${esc(o.id)}">${esc(clamp(o.insight.title, 50))}</option>`).join('')}</select><button class="btn sm" data-x="merge">Gộp vào thẻ này</button></div>` : ''}
        </section>
        <section class="panel stack" style="gap:8px"><h3>Kịch bản</h3>
          ${idea ? '<p class="small muted">Duyệt Insight để viết kịch bản.</p>' : `${ideasHtml}
          ${issues.length ? `<ul class="small sv-warn" id="sp-warn">${issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <div class="field"><label for="sp-script">Lời nói (mỗi phần mở bằng nhãn trong ngoặc vuông, ví dụ [Hook])</label><textarea id="sp-script" style="min-height:260px" ${off ? 'readonly' : ''}>${esc(v.script)}</textarea><span class="hint">Nên ${c.wordMin}–${c.wordMax} chữ (nhắm ${c.wordTarget}). ${hint}</span></div>
          <div class="field"><label for="sp-audio">Prompt Audio (lời cho giọng máy)</label><textarea id="sp-audio" rows="3" ${off ? 'readonly' : ''}>${esc(v.prompts.audio)}</textarea></div>
          <div class="field"><label for="sp-image">Prompt Hình ảnh</label><textarea id="sp-image" rows="2" ${off ? 'readonly' : ''}>${esc(v.prompts.image)}</textarea></div>`}
        </section>
      </div>
      <div class="stack" style="gap:12px;min-width:0">
        <section class="panel stack" style="gap:8px"><h3>Ô Video</h3>${videoCell}</section>
        ${schedHtml}${mediaHtml}
        ${(v.history || []).length ? `<section class="panel stack" style="gap:6px"><h3>Bản kịch bản trước (${v.history.length})</h3>${v.history.map((h, i) => `<div class="citem stack" style="gap:4px"><span class="small muted">${esc(h.at || '')}${h.ai ? ' · AI' : ''} · ${AC.vidWords(h.script)} chữ</span><p class="small" style="white-space:pre-wrap;max-height:120px;overflow:auto">${esc(h.script)}</p><button class="btn sm" data-x="use-hist" data-h="${i}" ${off ? 'disabled' : ''}>Dùng bản này</button></div>`).join('')}</section>` : ''}
      </div>
    </div>
    <span class="err" id="sp-err" role="alert"></span>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Đóng</button><button class="btn primary" data-x="save" data-testid="sp-save" ${off ? 'disabled' : ''}>Lưu</button></div>`;
}
export function openVid(id) {
  const v0 = AC.byId(S.videos, id); if (!v0) return;
  const box = openLayer(popHtml(v0), 'dialog'); box.classList.add('wide', 'sv-dlg');
  const g = k => box.querySelector('#sp-' + k);
  const err = m => { g('err').textContent = m || ''; };
  const reopen = msg => { closeAllLayers(); save(); render(); openVid(id); if (msg) toast(msg); };
  // Ghi các ô đang sửa vào dữ liệu; trả false nếu có lỗi
  const persist = () => {
    const v = AC.byId(S.videos, id); if (!v || v.cancelled) return true;
    if (g('request')) AC.setVidRequest(S, id, g('request').value);
    box.querySelectorAll('[data-mdesc]').forEach(el => AC.editVidMedia(S, id, el.dataset.mdesc, { desc: el.value }));
    box.querySelectorAll('[data-seg]').forEach(el => { const [mid, gid] = el.dataset.seg.split('|'); AC.editVidMedia(S, id, mid, { segs: [{ id: gid, desc: el.value }] }); });
    const r1 = AC.editInsight(S, id, { title: g('title').value, idea: g('idea').value, reason: g('reason').value, source: g('source').value, formatId: g('format').value, kind: g('kind').value });
    if (!r1.ok) { err(r1.error); return false; }
    if (g('script')) {
      const sc = g('script').value;
      if (!sc.trim() && !v.script) { if (g('audio').value.trim() || g('image').value.trim()) { const r = AC.editVidScript(S, id, { audio: g('audio').value, image: g('image').value }); if (!r.ok) { err(r.error); return false; } } return true; }
      const r2 = AC.editVidScript(S, id, { script: sc, audio: g('audio').value, image: g('image').value });
      if (!r2.ok) { err(r2.error); return false; }
    }
    return true;
  };
  if (g('script')) {
    const ta = g('script'); const c = AC.vidSettingsOf(S);
    const cnt = () => { const n = AC.vidWords(ta.value); g('count').textContent = ta.value.trim() ? `${n} chữ · ≈ ${fmtSec(AC.vidDuration(S, n))}` : ''; g('count').style.color = n && (n < c.wordMin || n > c.wordMax) ? 'var(--warn)' : ''; };
    cnt(); ta.addEventListener('input', cnt);
  }
  g('format').addEventListener('change', () => { const f = AC.byId(S.vidFormats, g('format').value); if (f) g('kind').value = f.kind; });
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
  box.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]'); if (!x || x.disabled) return; const k = x.dataset.x; const v = AC.byId(S.videos, id); if (!v) return;
    err('');
    if (k === 'save') { if (!persist()) return; reopen('Đã lưu thẻ Vid.'); return; }
    if (k === 'approve-idea') { if (!persist()) return; const r = AC.approveIdeas(S, v.weekId, v.topicId, [id]); if (!r.ok) return err(r.error); reopen('Đã duyệt Insight. Bấm Viết kịch bản.'); return; }
    if (k === 'drop-idea') { const r = AC.dropIdea(S, id); if (!r.ok) return err(r.error); closeAllLayers(); commit('Đã bỏ đề xuất.'); return; }
    if (k === 'merge') { if (!persist()) return; const r = AC.mergeIdeas(S, id, g('merge').value); if (!r.ok) return err(r.error); reopen('Đã gộp 2 Insight.'); return; }
    if (k === 'write') {
      if (view.svBusy) return;
      if (v.script && !(await confirmBox({ title: 'Tạo lại kịch bản?', body: '<p>Kịch bản hiện tại được giữ trong lịch sử (5 bản gần nhất).</p>', ok: 'Tạo lại' }))) return;
      if (!persist()) return;
      const r = await writeOne(id); if (!r.ok) { if (!r.stopped) err(r.error); return; }
      reopen(`Đã viết kịch bản ${r.words} chữ.`); return;
    }
    if (k === 'approve') { if (!persist()) return; const r = AC.approveVidScript(S, id); if (!r.ok) return err(r.error); reopen('Đã duyệt kịch bản. Quay xong thì Up video.'); return; }
    if (k === 'cancel') { if (!v.cancelled && !persist()) return; const r = AC.toggleVidCancel(S, id); if (!r.ok) return err(r.error); reopen(r.cancelled ? 'Đã hủy thẻ: không tính KPI, không cần nộp video.' : 'Đã khôi phục thẻ.'); return; }
    if (k === 'file-del') { if (!(await confirmBox({ title: 'Bỏ video?', body: '<p>Video, ảnh bìa và phụ đề của thẻ này sẽ bị xóa khỏi app. Kịch bản giữ nguyên.</p>', ok: 'Bỏ video', danger: true }))) return; const r = AC.setVidFile(S, id, null); if (!r.ok) return err(r.error); reopen('Đã bỏ video.'); return; }
    if (k === 'use-hist') { const h = v.history[Number(x.dataset.h)]; if (!h || !g('script')) return; g('script').value = h.script; g('audio').value = h.prompts.audio || ''; g('image').value = h.prompts.image || ''; g('script').dispatchEvent(new Event('input')); return; }
    if (k === 'edit') { if (!persist()) return; save(); closeAllLayers(); openEditor(id, () => { render(); openVid(id); }); return; }
    if (k === 'sched') { if (!persist()) return; save(); closeAllLayers(); render(); openSchedule([id]); return; }
    if (k === 'unsched') { if (!(await confirmBox({ title: 'Bỏ khỏi lịch?', body: '<p>Xóa các slot của video này trên Dashboard (bài đã đăng giữ nguyên). Thẻ Vid và video giữ nguyên.</p>', ok: 'Bỏ khỏi lịch', danger: true }))) return; const r = AC.unscheduleVideo(S, id); reopen(`Đã bỏ ${r.removed} slot khỏi lịch${r.kept ? `, giữ ${r.kept} bài đã đăng` : ''}.`); return; }
    if (k === 'media-del') { if (!(await confirmBox({ title: 'Bỏ tệp nguồn?', body: '<p>Cảnh trong Bàn dựng đang dùng tệp này sẽ thành thẻ giữ chỗ.</p>', ok: 'Bỏ tệp', danger: true }))) return; if (!persist()) return; AC.removeVidMedia(S, id, x.dataset.m); reopen('Đã bỏ tệp nguồn.'); return; }
    if (k === 'split') { if (!persist()) return; const r = AC.splitLongRoll(S, id, x.dataset.m, Number(g('seglen').value)); if (!r.ok) return err(r.error); reopen(`Đã tách ${r.count} đoạn (mô phỏng).`); return; }
    if (k === 'idea') { if (!persist()) return; AC.useBrollIdea(S, id, x.dataset.k); reopen('Đã chọn ý tưởng. Bấm Viết lời dẫn.'); return; }
    if (k === 'stt') {
      const m = (v.media || []).find(z => z.kind === 'audio' || z.kind === 'video'); if (!m || view.svBusy) return;
      if (v.script && !(await confirmBox({ title: 'Chép lời lại?', body: '<p>Lời hiện tại được giữ trong lịch sử.</p>', ok: 'Chép lời' }))) return;
      if (!persist()) return; setBusy('Đang gửi tệp tới API nhận giọng nói…');
      try { const t = await transcribe(m.src); setBusy(null); const r = AC.editVidScript(S, id, { script: t }); if (!r.ok) return err(r.error); reopen(`Đã chép lời: ${AC.vidWords(t)} chữ.`); } catch (er) { setBusy(null); err(er.message); }
      return;
    }
    if (k === 'copy-audio') return copyText(g('audio') ? g('audio').value : v.prompts.audio);
    if (k === 'copy-image') return copyText(g('image') ? g('image').value : v.prompts.image);
    if (k === 'dl-script') { const t = `# ${v.insight.title}\n\n${g('script') ? g('script').value : v.script}\n\n## Prompt Audio\n${v.prompts.audio}\n\n## Prompt Hình ảnh\n${v.prompts.image}\n`; return downloadBytes(`${AC.slugOf(v.insight.title) || 'kich-ban'}.md`, new TextEncoder().encode(t), 'text/markdown'); }
    if (k === 'dl-video') { if (v.file) return downloadBytes(v.file.name || 'video.mp4', AC.dataUrlBytes(v.file.src), (/^data:([^;,]+)/.exec(v.file.src) || [])[1] || 'video/mp4'); return; }
    if (k === 'cover' || k === 'subs') {
      if (!v.file || !persist()) return;
      const T = { v: v.file, name: v.insight.title, ver: `Thẻ Vid ${posOf(v)}`, text: AC.vidBody(v.script), done: msg => reopen(msg) };
      if (k === 'cover') coverDialog(Object.assign(T, { save: c => AC.setVidCover(S, id, c) })); else subsDialog(Object.assign(T, { save: (c, src) => AC.setVidSubs(S, id, c, src) }));
    }
  });
  return box;
}
ACTIONS['sv-open'] = el => openVid(el.dataset.id);
ACTIONS['sv-free-new'] = () => openFreeCreate(id => openVid(id));
ACTIONS['sv-schedule'] = () => openSchedule();
