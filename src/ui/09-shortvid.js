// ---------- UI · Short Vid: Topic → Insight → Kịch bản → Video (mục 10.72) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, RENDERERS, S, view } from './00-state.js';
import { $, closeLayer, commit, confirmBox, curStart, curWeek, esc, icon, openLayer, richText, save, toast } from './01-core.js';
import { render } from './02-shell.js';
import { vidMax } from './04-week.js';
import { coverDialog, subsDialog } from './04j-media.js';
import { textCall } from './04k-aitext.js';

const kindName = k => AC.VID_KINDS[k] || k;
const vfName = id => { const f = AC.byId(S.vidFormats || [], id); return f ? f.name : 'Format đã xóa'; };
const stateChip = v => { const [l, c] = AC.VID_STATES[AC.vidState(v)]; return `<span class="st ${c}">${esc(l)}</span>`; };
const fmtSec = s => s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`;
const fmtMb = b => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;

// KPI tuần (dùng ở Short Vid và Dashboard)
export function vidKpiText(weekId) {
  const k = AC.vidKpi(S, weekId);
  return { k, main: `${k.ready}/${k.planned}`, title: `Video ngắn có thành phẩm / kịch bản không hủy. Mục tiêu ${k.target} video/tuần (tối thiểu ${k.min}).` };
}
function kpiBarHtml(w) {
  const { k } = vidKpiText(w.id);
  const chip = (v, label, title, cls) => `<span class="kchip${cls ? ' ' + cls : ''}" title="${esc(title)}"><b>${esc(v)}</b> ${esc(label)}</span>`;
  const short = k.planned < k.min;
  return `<div class="kchips" role="group" aria-label="KPI video tuần" data-testid="sv-kpi"><span class="eyebrow">Video tuần</span>
    ${chip(`${k.ready}/${k.planned}`, 'có thành phẩm', 'Video đã tải lên / kịch bản không hủy (đã duyệt Insight)')}
    ${chip(`${k.planned}/${k.target}`, 'kịch bản so với mục tiêu', `Mục tiêu ${k.target} video/tuần, tối thiểu ${k.min}`, short ? 'late' : '')}
    ${chip(`${k.bantin}/${k.mix.bantin}`, 'Bản tin', 'Số kịch bản kiểu Bản tin / tỉ lệ mong muốn')}
    ${chip(`${k.noihet}/${k.mix.noihet}`, 'Người nói', 'Số kịch bản kiểu Người nói hết / tỉ lệ mong muốn')}
    ${k.ideas ? chip(k.ideas, 'đề xuất chờ duyệt', 'Insight AI đề xuất, chưa duyệt') : ''}
    ${k.cancelled ? chip(k.cancelled, 'đã hủy', 'Kịch bản đã hủy, không tính KPI') : ''}</div>`;
}

RENDERERS.shortvid = () => {
  AC.ensureShortVid(S);
  const start = curStart(); const w = curWeek(); const l = AC.weekLabelOf(start);
  const head = `<div class="page-head"><div><span class="eyebrow">Short Vid · ${esc(l.range)}</span><h1>Video ngắn</h1>
      <p class="sub">Từ Topic của tuần (dùng chung với Matrix) hoặc chủ đề nạp riêng cho video: phân tích ra các Insight, mỗi Insight một video 60 giây; viết kịch bản, rồi tải video thành phẩm vào ô Video.</p></div>
      ${w ? kpiBarHtml(w) : ''}</div>`;
  const tps = w ? AC.vidTopicsOf(S, w.id) : [];
  const importBtn = `<button class="btn ${tps.length ? '' : 'primary'}" data-act="sv-import">${icon('plus')} Nạp chủ đề cho video</button>`;
  if (!tps.length) return `${head}<div class="empty" data-testid="sv-empty"><p>Tuần này chưa có Topic. Topic nạp ở Matrix sẽ hiện ở đây; hoặc nạp chủ đề chỉ dùng cho video (không tạo ô trong Matrix).</p><div class="row">${importBtn}</div></div>`;
  if (!tps.some(t => t.row.id === view.svTopic)) view.svTopic = tps[0].row.id;
  const cur = tps.find(t => t.row.id === view.svTopic);
  const list = tps.map(t => {
    const vs = AC.vidsOf(S, w.id, t.row.id); const live = vs.filter(v => !v.cancelled && v.status !== 'IDEA');
    return `<button class="sv-topic" data-act="sv-topic" data-id="${esc(t.row.id)}" ${t.row.id === view.svTopic ? 'aria-current="true"' : ''}>
      <b>${esc(t.v.title)}</b><span class="small muted">${t.videoOnly ? 'Chỉ cho video · ' : `Topic ${t.row.order} · `}${t.v.words.toLocaleString('vi-VN')} chữ</span>
      <span class="small">${vs.length ? `${live.length} video · ${live.filter(v => v.file).length} sẵn sàng${vs.some(v => v.status === 'IDEA') ? ' · có đề xuất' : ''}` : '<span class="faint">Chưa phân tích</span>'}</span></button>`;
  }).join('');
  return `${head}
    <div class="sv-layout">
      <nav class="sv-topics stack" aria-label="Topic của tuần"><span class="eyebrow">Topic (${tps.length})</span>${list}${importBtn}</nav>
      <section class="stack" style="min-width:0" aria-label="Video của Topic" id="sv-main">${topicPanelHtml(w, cur)}</section>
    </div>`;
};

function topicPanelHtml(w, t) {
  const vs = AC.vidsOf(S, w.id, t.row.id); const ideas = vs.filter(v => v.status === 'IDEA'); const cards = vs.filter(v => v.status !== 'IDEA');
  const an = AC.vidAnalysisOf(S, w.id, t.row.id); const busy = view.svBusy;
  const dupes = AC.vidDupes(S, w.id); const todo = cards.filter(v => v.status === 'TODO' && !v.cancelled).length;
  const aiOn = AC.textApiOn(S);
  return `<section class="panel stack">
      <header><div><span class="eyebrow">${t.videoOnly ? 'Chủ đề chỉ cho video' : `Topic ${t.row.order} · dùng chung với Matrix`}</span><h2>${esc(t.v.title)}</h2></div>
        <div class="row"><button class="btn sm ghost" data-act="sv-topic-view" data-id="${esc(t.row.id)}">Xem Topic</button>${t.videoOnly ? `<button class="btn sm ghost danger" data-act="sv-topic-remove" data-id="${esc(t.row.id)}">Xóa chủ đề</button>` : ''}</div></header>
      <div class="row">
        <button class="btn ${vs.length ? '' : 'primary'}" data-act="sv-analyze" data-testid="sv-analyze" ${busy ? 'disabled' : ''} title="${aiOn ? 'AI đọc Topic, đề xuất số video kèm lý do' : 'Chưa bật AI viết bài: dùng bản mô phỏng (tách theo mục của Topic)'}">${icon('spark')} ${ideas.length || cards.length ? 'Phân tích lại' : 'Phân tích Topic'}${aiOn ? '' : ' (mô phỏng)'}</button>
        <button class="btn" data-act="sv-add" ${busy ? 'disabled' : ''}>${icon('plus')} Thêm Insight</button>
        ${todo ? `<button class="btn primary" data-act="sv-write-all" data-testid="sv-write-all" ${busy ? 'disabled' : ''}>Viết ${todo} kịch bản${aiOn ? '' : ' (mô phỏng)'}</button>` : ''}
        <span class="small muted" aria-live="polite" id="sv-busy">${busy ? esc(busy) : ''}</span>
      </div>
      ${an ? `<div class="note" data-testid="sv-reason"><b>Đề xuất ${an.total} video.</b> ${esc(an.reason)}</div>` : ''}
    </section>
    ${ideas.length ? ideasHtml(ideas) : ''}
    ${cards.length ? `<div class="stack" data-testid="sv-cards">${cards.map(v => cardHtml(v, dupes[v.id])).join('')}</div>` : ''}
    ${!vs.length ? '<p class="small muted">Bấm Phân tích Topic để có danh sách Insight, hoặc Thêm Insight để tự đặt.</p>' : ''}`;
}

// ---- Danh sách Insight đề xuất: tích để gộp, đổi Format/kiểu, sửa, bỏ, rồi Duyệt danh sách ----
function ideasHtml(ideas) {
  const fopts = sel => AC.vidFormatsOf(S, true).map(f => `<option value="${esc(f.id)}" ${f.id === sel ? 'selected' : ''}>${esc(f.name)}${f.active === false ? ' (đang tắt)' : ''}</option>`).join('');
  const kopts = sel => Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const picked = (view.svPick || []).filter(id => ideas.some(v => v.id === id));
  return `<section class="panel stack" data-testid="sv-ideas"><header><div><span class="eyebrow">Đề xuất chờ duyệt</span><h2>${ideas.length} Insight</h2></div>
      <div class="row"><button class="btn" data-act="sv-merge" ${picked.length === 2 ? '' : 'disabled'} title="Tích đúng 2 Insight để gộp">Gộp 2 mục đã chọn</button><button class="btn primary" data-act="sv-approve-ideas" data-testid="sv-approve-ideas">Duyệt danh sách (${ideas.length})</button></div></header>
    <div class="stack" style="gap:8px">${ideas.map((v, i) => `<div class="citem sv-idea" data-id="${esc(v.id)}">
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap;gap:10px">
        <label class="check" style="margin-top:2px"><input type="checkbox" data-change="sv-pick" data-id="${esc(v.id)}" ${picked.includes(v.id) ? 'checked' : ''}><span class="sr">Chọn để gộp</span></label>
        <div class="stack" style="gap:4px;min-width:0;flex:1"><b>${i + 1}. ${esc(v.insight.title)}</b>
          ${v.insight.idea ? `<span class="small">${esc(v.insight.idea)}</span>` : ''}
          ${v.insight.reason ? `<span class="small muted">Lý do: ${esc(v.insight.reason)}</span>` : ''}
          ${v.source ? `<details><summary class="small">Đoạn căn cứ trong Topic</summary><p class="small" style="white-space:pre-wrap">${esc(v.source)}</p></details>` : ''}
          <div class="row" style="gap:8px"><label class="sr" for="sv-f-${esc(v.id)}">Format</label><select id="sv-f-${esc(v.id)}" data-change="sv-idea-format" data-id="${esc(v.id)}">${fopts(v.formatId)}</select>
            <label class="sr" for="sv-k-${esc(v.id)}">Kiểu</label><select id="sv-k-${esc(v.id)}" data-change="sv-idea-kind" data-id="${esc(v.id)}">${kopts(v.kind)}</select>
            <button class="btn sm" data-act="sv-idea-edit" data-id="${esc(v.id)}">Sửa</button><button class="btn sm ghost danger" data-act="sv-idea-drop" data-id="${esc(v.id)}">Bỏ</button></div>
        </div></div></div>`).join('')}</div></section>`;
}

// ---- Thẻ kịch bản + ô Video ----
function scriptHtml(text) {
  return AC.vidSections(text).map(s => `<div class="sv-sec">${s.label ? `<span class="chip-col">${esc(s.label)}</span>` : ''}<p>${esc(s.text)}</p></div>`).join('');
}
function cardHtml(v, dupes) {
  const st = AC.vidState(v); const off = v.cancelled; const words = AC.vidWords(v.script);
  const issues = AC.vidIssues(S, v).concat(dupes || []); const busy = view.svBusy;
  const f = v.file;
  const videoCell = off ? '<p class="small muted">Đã hủy: không cần nộp video.</p>' : f
    ? `<div class="sv-video"><video src="${esc(f.src)}#t=0.1" ${f.cover ? `poster="${esc(f.cover.src)}"` : ''} controls playsinline preload="metadata"></video>
        <div class="stack" style="gap:6px;min-width:0"><span class="small"><b>${esc(f.name)}</b> · ${fmtMb(f.size || AC.dataUrlBytes(f.src).length)}</span>
        ${f.cover || f.subs ? `<span class="small faint">${[f.cover ? 'có ảnh bìa' : '', f.subs ? `phụ đề ${f.subs.cues.length} dòng` : ''].filter(Boolean).join(' · ')}</span>` : ''}
        <div class="row" style="gap:6px"><label class="btn sm" for="sv-up-${esc(v.id)}">Tải bản khác</label><button class="btn sm" data-act="sv-cover" data-id="${esc(v.id)}">Bìa</button><button class="btn sm" data-act="sv-subs" data-id="${esc(v.id)}">Phụ đề</button><button class="btn sm ghost danger" data-act="sv-file-del" data-id="${esc(v.id)}">Bỏ video</button></div></div></div>`
    : `<div class="row"><label class="btn ${v.status === 'APPROVED' ? 'primary' : ''}" for="sv-up-${esc(v.id)}">${icon('up')} Up video thành phẩm</label><span class="small muted">MP4, WebM, MOV; tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt.</span></div>`;
  return `<article class="panel stack sv-card${off ? ' sv-off' : ''}" data-testid="sv-card" data-id="${esc(v.id)}" aria-label="Video ${v.order}: ${esc(v.insight.title)}">
    <header><div><span class="eyebrow">Video ${v.order} · ${esc(vfName(v.formatId))} · ${esc(kindName(v.kind))}</span><h3>${esc(v.insight.title)}</h3></div>
      <div class="row">${stateChip(v)}${v.script ? `<span class="small mono" title="Số chữ lời nói, thời lượng ước tính">${words} chữ · ≈ ${fmtSec(AC.vidDuration(S, words))}</span>` : ''}</div></header>
    ${v.insight.idea ? `<p class="small muted">Insight: ${esc(v.insight.idea)}</p>` : ''}
    ${issues.length ? `<ul class="small sv-warn">${issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.script ? `<div class="sv-script">${scriptHtml(v.script)}</div>
      <details ${v.kind === 'bantin' ? 'open' : ''}><summary class="small">Prompt</summary><div class="stack small" style="gap:6px;margin-top:6px">
        <div><span class="eyebrow">Audio (đoạn máy nói)</span><p style="white-space:pre-wrap">${v.prompts.audio ? esc(v.prompts.audio) : '<span class="faint">Không có (người nói hết)</span>'}</p></div>
        <div><span class="eyebrow">Hình ảnh</span><p>${v.prompts.image ? esc(v.prompts.image) : '<span class="faint">Chưa có</span>'}</p></div></div></details>
      ${v.simulated ? '<span class="small faint">Kịch bản mô phỏng (chưa bật AI viết bài).</span>' : v.ai ? `<span class="small faint">AI viết${v.ai.skill ? ` · Skill "${esc(v.ai.skill.name)}" v${v.ai.skill.version}` : ''}${v.edited ? ' · đã sửa tay' : ''}</span>` : ''}`
      : `<p class="small muted">${off ? 'Chưa có kịch bản.' : 'Chưa có kịch bản. Bấm Viết kịch bản.'}</p>`}
    <div class="row">
      ${off ? '' : `<button class="btn ${v.script ? '' : 'primary'}" data-act="sv-write" data-id="${esc(v.id)}" ${busy ? 'disabled' : ''}>${v.script ? 'Tạo lại' : 'Viết kịch bản'}</button>
      <button class="btn" data-act="sv-edit" data-id="${esc(v.id)}">Sửa</button>
      ${v.script && v.status !== 'APPROVED' ? `<button class="btn primary" data-act="sv-approve" data-id="${esc(v.id)}">Duyệt kịch bản</button>` : ''}`}
      <button class="btn ${off ? 'primary' : 'ghost'}" data-act="sv-cancel" data-id="${esc(v.id)}" aria-pressed="${off}">${off ? 'Khôi phục' : 'Hủy'}</button>
    </div>
    <div class="sv-cell"><span class="eyebrow">Ô Video</span>${videoCell}<input id="sv-up-${esc(v.id)}" type="file" accept="video/*" class="sr" data-change="sv-upload" data-id="${esc(v.id)}"></div>
  </article>`;
}

// ---- Thao tác ----
ACTIONS['sv-topic'] = el => { view.svTopic = el.dataset.id; view.svPick = []; render(); };
const weekId = () => { const w = curWeek(); return w ? w.id : null; };
function setBusy(msg) { view.svBusy = msg || null; const b = $('#sv-busy'); if (b) b.textContent = msg || ''; }
async function aiOr(job, parse, what) {
  if (!AC.textApiOn(S) || !job) return null;
  setBusy(`AI đang ${what}…`); render();
  try { const r = parse(await textCall(job, 8000)); if (!r.ok) throw new Error(r.error); return r; }
  catch (e) {
    const ok = await confirmBox({ title: 'AI không làm được', body: `<p>${esc(e.message)}</p><p>Dùng bản mô phỏng thay thế? Chọn Hủy để dừng.</p>`, ok: 'Dùng mô phỏng' });
    return ok ? { fallback: true } : { stop: true };
  } finally { setBusy(null); }
}
ACTIONS['sv-analyze'] = async () => {
  const w = weekId(); const tid = view.svTopic; if (!w || !tid || view.svBusy) return;
  const old = AC.vidsOf(S, w, tid).filter(v => v.status === 'IDEA').length;
  if (old && !(await confirmBox({ title: 'Phân tích lại?', body: `<p>${old} đề xuất chưa duyệt sẽ được thay bằng kết quả mới. Kịch bản đã duyệt Insight giữ nguyên.</p>`, ok: 'Phân tích lại' }))) return;
  const ai = await aiOr(AC.vidAnalyzeJob(S, w, tid), raw => AC.parseVidInsights(S, raw), 'phân tích Topic');
  if (ai && ai.stop) return render();
  const cfg = AC.textApiOf(S);
  const r = AC.analyzeTopic(S, w, tid, ai && ai.ok ? ai : null); if (!r.ok) { render(); return toast(r.error, 'bad'); }
  view.svPick = []; commit(`Đề xuất ${r.count} video${r.simulated ? ' (mô phỏng)' : ` (${cfg.provider})`}. Xem lý do, chỉnh rồi Duyệt danh sách.`);
};
CHANGES['sv-pick'] = el => { const id = el.dataset.id; const p = (view.svPick || []).filter(x => x !== id); if (el.checked) p.push(id); view.svPick = p.slice(-2); render(); };
CHANGES['sv-idea-format'] = el => { const r = AC.editInsight(S, el.dataset.id, { formatId: el.value }); if (!r.ok) return toast(r.error, 'bad'); save(); };
CHANGES['sv-idea-kind'] = el => { const r = AC.editInsight(S, el.dataset.id, { kind: el.value }); if (!r.ok) return toast(r.error, 'bad'); commit(); };
ACTIONS['sv-idea-drop'] = el => { const r = AC.dropIdea(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã bỏ đề xuất.'); };
ACTIONS['sv-merge'] = () => {
  const p = view.svPick || []; if (p.length !== 2) return toast('Tích đúng 2 Insight để gộp.', 'bad');
  const r = AC.mergeIdeas(S, p[0], p[1]); if (!r.ok) return toast(r.error, 'bad'); view.svPick = []; commit('Đã gộp 2 Insight.');
};
ACTIONS['sv-approve-ideas'] = () => {
  const w = weekId(); const r = AC.approveIdeas(S, w, view.svTopic); if (!r.ok) return toast(r.error, 'bad');
  view.svPick = []; commit(`Đã duyệt ${r.count} Insight. Bấm Viết kịch bản.`);
};
function insightForm(v, title) {
  const fs = AC.vidFormatsOf(S, true); const fsel = v ? v.formatId : (AC.vidFormatsOf(S)[0] || {}).id; const kind = v ? v.kind : ((AC.byId(fs, fsel) || {}).kind || 'noihet');
  return `<header><div><span class="eyebrow">Insight</span><h2>${esc(title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="si-title">Tiêu đề</label><input id="si-title" value="${esc(v ? v.insight.title : '')}" maxlength="160"></div>
      <div class="field"><label for="si-idea">Ý chính</label><textarea id="si-idea" rows="3">${esc(v ? v.insight.idea : '')}</textarea></div>
      <div class="field"><label for="si-source">Đoạn căn cứ trong Topic</label><textarea id="si-source" rows="4">${esc(v ? v.source : '')}</textarea><span class="hint">AI và bản mô phỏng bám vào đoạn này; không thêm số liệu ngoài Topic.</span></div>
      <div class="field"><label for="si-reason">Lý do làm video này</label><input id="si-reason" value="${esc(v ? v.insight.reason : '')}"></div>
      <div class="row"><div class="field"><label for="si-format">Format</label><select id="si-format">${fs.map(f => `<option value="${esc(f.id)}" ${f.id === fsel ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="si-kind">Kiểu</label><select id="si-kind">${Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
      <span class="err" id="si-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="si-ok">Lưu</button></div>
    </div>`;
}
const insightVals = b => ({ title: $('#si-title', b).value, idea: $('#si-idea', b).value, source: $('#si-source', b).value, reason: $('#si-reason', b).value, formatId: $('#si-format', b).value, kind: $('#si-kind', b).value });
ACTIONS['sv-idea-edit'] = el => {
  const v = AC.byId(S.videos, el.dataset.id); if (!v) return;
  openLayer(insightForm(v, 'Sửa Insight'), 'drawer', b => $('#si-ok', b).addEventListener('click', () => {
    const r = AC.editInsight(S, v.id, insightVals(b)); if (!r.ok) { $('#si-err', b).textContent = r.error; return; }
    closeLayer(); commit('Đã lưu Insight.');
  }));
};
ACTIONS['sv-add'] = () => {
  const w = weekId(); if (!w) return;
  openLayer(insightForm(null, 'Thêm Insight'), 'drawer', b => $('#si-ok', b).addEventListener('click', () => {
    const r = AC.addVideo(S, w, view.svTopic, insightVals(b)); if (!r.ok) { $('#si-err', b).textContent = r.error; return; }
    closeLayer(); commit('Đã thêm Insight. Bấm Viết kịch bản.');
  }));
};
async function writeOne(id) {
  const ai = await aiOr(AC.vidScriptJob(S, id), AC.parseVidScript, 'viết kịch bản');
  if (ai && ai.stop) return { ok: false, stopped: true };
  const cfg = AC.textApiOf(S);
  return AC.writeVidScript(S, id, ai && ai.ok ? ai : null, { provider: cfg.provider, model: cfg.model });
}
ACTIONS['sv-write'] = async el => {
  const v = AC.byId(S.videos, el.dataset.id); if (!v || view.svBusy) return;
  if (v.script && !(await confirmBox({ title: 'Tạo lại kịch bản?', body: '<p>Kịch bản hiện tại được giữ trong lịch sử (5 bản gần nhất).</p>', ok: 'Tạo lại' }))) return;
  const r = await writeOne(v.id); if (!r.ok) { render(); return r.stopped ? null : toast(r.error, 'bad'); }
  commit(`Đã viết kịch bản ${r.words} chữ.`);
};
ACTIONS['sv-write-all'] = async () => {
  const w = weekId(); if (!w || view.svBusy) return;
  const ids = AC.vidsOf(S, w, view.svTopic).filter(v => v.status === 'TODO' && !v.cancelled).map(v => v.id); let n = 0;
  for (const id of ids) { const r = await writeOne(id); if (!r.ok) { if (!r.stopped) toast(r.error, 'bad'); break; } n++; save(); }
  commit(`Đã viết ${n}/${ids.length} kịch bản.`);
};
ACTIONS['sv-edit'] = el => {
  const v = AC.byId(S.videos, el.dataset.id); if (!v) return;
  const c = AC.vidSettingsOf(S);
  openLayer(`<header><div><span class="eyebrow">Video ${v.order} · ${esc(vfName(v.formatId))} · ${esc(kindName(v.kind))}</span><h2>${esc(v.insight.title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="se-script">Kịch bản (mỗi phần mở bằng nhãn trong ngoặc vuông, ví dụ [Hook])</label><textarea id="se-script" style="min-height:300px">${esc(v.script || (v.kind === 'bantin' ? '[Người dẫn]\n\n\n[Giọng máy]\n\n\n[Chốt]\n' : (AC.byId(S.vidFormats, v.formatId) || { structure: ['Hook', 'Nội dung', 'CTA'] }).structure.map(x => `[${x}]\n`).join('\n')))}</textarea><span class="hint" id="se-count" aria-live="polite"></span></div>
      <div class="field"><label for="se-audio">Prompt Audio (lời cho giọng máy)</label><textarea id="se-audio" rows="4">${esc(v.prompts.audio)}</textarea></div>
      <div class="field"><label for="se-image">Prompt Hình ảnh</label><textarea id="se-image" rows="2">${esc(v.prompts.image)}</textarea></div>
      ${(v.history || []).length ? `<details><summary class="small">Bản trước (${v.history.length})</summary>${v.history.map((h, i) => `<div class="citem stack" style="gap:4px"><span class="small muted">${esc(h.at || '')}${h.ai ? ' · AI' : ''}</span><p class="small" style="white-space:pre-wrap">${esc(h.script)}</p><button class="btn sm" data-h="${i}">Dùng bản này</button></div>`).join('')}</details>` : ''}
      <span class="err" id="se-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="se-ok">Lưu</button></div>
    </div>`, 'drawer', b => {
    const ta = $('#se-script', b); const cnt = () => { const n = AC.vidWords(ta.value); $('#se-count', b).textContent = `${n} chữ lời nói · ≈ ${fmtSec(AC.vidDuration(S, n))} · nên ${c.wordMin}–${c.wordMax} chữ`; };
    cnt(); ta.addEventListener('input', cnt);
    b.addEventListener('click', e => { const h = e.target.closest('[data-h]'); if (!h) return; const x = v.history[Number(h.dataset.h)]; ta.value = x.script; $('#se-audio', b).value = x.prompts.audio || ''; $('#se-image', b).value = x.prompts.image || ''; cnt(); });
    $('#se-ok', b).addEventListener('click', () => {
      const r = AC.editVidScript(S, v.id, { script: ta.value, audio: $('#se-audio', b).value, image: $('#se-image', b).value });
      if (!r.ok) { $('#se-err', b).textContent = r.error; return; }
      closeLayer(); commit(r.changed ? 'Đã lưu kịch bản. Bấm Duyệt kịch bản khi xong.' : 'Không có thay đổi.');
    });
  });
};
ACTIONS['sv-approve'] = el => { const r = AC.approveVidScript(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã duyệt kịch bản. Quay xong thì Up video vào ô Video.'); };
ACTIONS['sv-cancel'] = el => { const r = AC.toggleVidCancel(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit(r.cancelled ? 'Đã hủy kịch bản: không tính KPI, không cần nộp video.' : 'Đã khôi phục kịch bản.'); };
CHANGES['sv-upload'] = el => {
  const file = el.files && el.files[0]; const id = el.dataset.id; if (!file) return;
  if (!/^video\//.test(file.type)) { el.value = ''; return toast('Tệp không phải video (MP4, WebM, MOV).', 'bad'); }
  if (file.size > vidMax()) { el.value = ''; return toast(`Video quá lớn (tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt). Nén bớt rồi tải lại.`, 'bad'); }
  const rd = new FileReader(); rd.onerror = () => toast('Không đọc được tệp video.', 'bad');
  rd.onload = () => { const r = AC.setVidFile(S, id, { src: String(rd.result), name: file.name, size: file.size }); if (!r.ok) return toast(r.error, 'bad'); commit('Đã tải video thành phẩm. Video chuyển sang Sẵn sàng.'); };
  rd.readAsDataURL(file);
};
ACTIONS['sv-file-del'] = async el => {
  if (!(await confirmBox({ title: 'Bỏ video?', body: '<p>Video, ảnh bìa và phụ đề của ô này sẽ bị xóa khỏi app. Kịch bản giữ nguyên.</p>', ok: 'Bỏ video', danger: true }))) return;
  const r = AC.setVidFile(S, el.dataset.id, null); if (!r.ok) return toast(r.error, 'bad'); commit('Đã bỏ video.');
};
const vidTarget = v => ({ v: v.file, name: v.insight.title, ver: `Video ${v.order}`, text: AC.vidBody(v.script), done: msg => { closeLayer(); commit(msg); } });
ACTIONS['sv-cover'] = el => { const v = AC.byId(S.videos, el.dataset.id); if (!v || !v.file) return; coverDialog(Object.assign(vidTarget(v), { save: c => AC.setVidCover(S, v.id, c) })); };
ACTIONS['sv-subs'] = el => { const v = AC.byId(S.videos, el.dataset.id); if (!v || !v.file) return; subsDialog(Object.assign(vidTarget(v), { save: (c, src) => AC.setVidSubs(S, v.id, c, src) })); };

// ---- Chủ đề: xem, nạp riêng cho video, xóa ----
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
      view.svTopic = r.added[0].id; closeLayer();
      commit(`Đã nạp ${r.added.length} chủ đề cho video${r.skipped.length ? `, bỏ qua ${r.skipped.length} chủ đề trùng` : ''}.`);
    });
  });
};
ACTIONS['sv-topic-remove'] = async el => {
  const row = AC.vidTopicRow(S, el.dataset.id); if (!row) return; const n = S.videos.filter(v => v.topicId === row.id).length;
  if (!(await confirmBox({ title: 'Xóa chủ đề?', body: `<p>Xóa chủ đề "${esc(AC.topicCurrent(row).title)}"${n ? ` cùng ${n} Insight/kịch bản/video của nó` : ''}.</p>`, ok: 'Xóa', danger: true }))) return;
  const r = AC.removeVidTopic(S, row.id); if (!r.ok) return toast(r.error, 'bad'); view.svTopic = null; commit('Đã xóa chủ đề.');
};
