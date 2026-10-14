// ---------- UI · Thiết lập (SCR-12..19) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, INPUTS, RENDERERS, S, setS, view } from './00-state.js';
import { $, chName, chTag, closeLayer, colName, commit, confirmBox, esc, fmtFull, fmtName, icon, openLayer, save, store, toast } from './01-core.js';
import { render, renderNav } from './02-shell.js';
import { demoSetupBarHtml } from './03-today.js';
import { channelOptions, formatOptions } from './04-week.js';
import { framesTab } from './04e-frame.js';
import { snippetsTab } from './04g-assist.js';
import { libraryTab } from './04i-studio.js';
import { aiConnectTab } from './04k-aitext.js';
import { blogSetupTab } from './04l-blog.js';
import { imgStdTab } from './04m-imgtools.js';
import { copyText } from './05-matrix.js';
import { downloadBytes } from './06-export.js';
import { skillButtonHtml, writingRulesSection } from './07b-skill.js';
export const SETUP_TABS = [
  ['brand', 'Thương hiệu'], ['voice', 'Giọng văn'], ['channels', 'Kênh'], ['matrix', 'Matrix'], ['columns', 'Cột'], ['topicframe', 'Khung Topic'],
  ['formats', 'Format'], ['imgstd', 'Chuẩn ảnh'], ['frames', 'Frame ảnh'], ['snippets', 'Hashtag & CTA'], ['library', 'Kho tài sản'], ['blog', 'Chuẩn Blog'], ['imageapi', 'Kết nối AI'], ['templates', 'Tuần mẫu'], ['rules', 'Quy tắc & tiêu chí'], ['backup', 'Sao lưu & demo'],
];
function setupTabOk(id) {
  const st = AC.setupStatus(S);
  const keyMap = { brand: 'brand', voice: 'voice', columns: 'columns', formats: 'formats', templates: 'templates' };
  return keyMap[id] ? !st.missing.some(m => m.key === keyMap[id]) : null;
}
RENDERERS.setup = () => {
  const st = AC.setupStatus(S);
  const tab = view.setupTab;
  const body = { brand: () => mdTab('brand'), voice: () => mdTab('voice') + writingRulesSection(), channels: channelsTab, matrix: matrixTab, columns: columnsTab, topicframe: topicFrameTab, formats: formatsTab, imgstd: imgStdTab, frames: framesTab, snippets: snippetsTab, library: libraryTab, blog: blogSetupTab, imageapi: aiConnectTab, templates: templatesTab, rules: rulesTab, backup: backupTab }[tab]();
  return `<div class="page-head"><div><span class="eyebrow">Thiết lập</span><h1>${esc(SETUP_TABS.find(t => t[0] === tab)[1])}</h1></div>
      <span class="st ${st.ok ? 'st-done' : 'st-need'}">${st.ok ? 'Thiết lập đủ' : `Chưa đủ: ${st.missing.length} mục`}</span></div>
    ${st.ok ? '' : `<div class="note warn"><b>Chưa lập được tuần.</b> ${st.missing.map(m => esc(m.text)).join(' · ')}. Nút "Nạp dữ liệu demo" luôn dùng được.</div>`}
    ${demoSetupBarHtml(tab)}
    <div class="setup">
      <nav class="subnav" aria-label="Mục thiết lập">${SETUP_TABS.map(([id, label]) => { const ok = setupTabOk(id); return `<button data-act="setup-tab" data-tab="${id}" ${view.setupTab === id ? 'aria-current="page"' : ''}><span>${label}</span>${ok === true ? '<span class="dotok">Đủ</span>' : ok === false ? '<span class="dotno">Thiếu</span>' : ''}</button>`; }).join('')}</nav>
      <div class="stack" style="gap:16px;min-width:0">${body}</div>
    </div>`;
};
ACTIONS['setup-tab'] = el => { if (view.setupTab !== el.dataset.tab) { view.tfDraft = null; view.frDraft = null; } view.setupTab = el.dataset.tab; render(); };

// ---- Khung Topic (mục 10.30): bản nháp trong view.tfDraft, bấm Lưu mới ghi ----
function topicFrameTab() {
  const cur = AC.topicFrameOf(S);
  if (!view.tfDraft) view.tfDraft = AC.clone(cur);
  const d = view.tfDraft; const dirty = JSON.stringify(d) !== JSON.stringify(cur);
  const custom = !!(S.topicFrame && S.topicFrame.length);
  const opt = s => Object.entries(AC.TOPIC_STYLES).map(([k, l]) => `<option value="${k}" ${s === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
  return `<p class="muted">Các mục chuẩn của một Topic. Khi nạp tệp Topic, đề mục ### được khớp theo tên hoặc tên gọi khác, đổi về tên chuẩn và xếp theo thứ tự dưới đây; mỗi mục hiển thị theo kiểu đã chọn. Khung cũng được ghép vào lệnh cho agent nghiên cứu.</p>
    <div class="tf-list">${d.map((s, i) => `<div class="tf-row">
      <span class="tf-n">${i + 1}</span>
      <div class="field"><label for="tf-name-${i}">Tên mục</label><input id="tf-name-${i}" value="${esc(s.name)}" data-input="tf" data-i="${i}" data-f="name"></div>
      <div class="field"><label for="tf-al-${i}">Tên gọi khác</label><input id="tf-al-${i}" placeholder="cách nhau dấu phẩy" title="${esc((s.aliases || []).join(', '))}" value="${esc((s.aliases || []).join(', '))}" data-input="tf" data-i="${i}" data-f="aliases"></div>
      <div class="field"><label for="tf-st-${i}">Kiểu hiển thị</label><select id="tf-st-${i}" data-change="tf" data-i="${i}" data-f="style">${opt(s.style)}</select></div>
      <label class="check"><input type="checkbox" ${s.optional ? 'checked' : ''} data-change="tf" data-i="${i}" data-f="optional"> Không bắt buộc</label>
      <div class="row tf-acts"><button class="btn icon sm ghost" data-act="tf-move" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Lên">↑</button><button class="btn icon sm ghost" data-act="tf-move" data-i="${i}" data-d="1" ${i < d.length - 1 ? '' : 'disabled'} aria-label="Xuống">↓</button><button class="btn icon sm ghost" data-act="tf-del" data-i="${i}" ${d.length > 1 ? '' : 'disabled'} aria-label="Xóa mục">${icon('close')}</button></div>
    </div>`).join('')}</div>
    <div class="row"><button class="btn" data-act="tf-add">${icon('plus')} Thêm mục</button><span style="flex:1"></span>
      ${custom ? '<button class="btn ghost" data-act="tf-reset">Dùng mặc định</button>' : '<span class="small faint">Đang dùng khung mặc định.</span>'}
      <button class="btn ${dirty ? 'primary' : ''}" data-act="tf-save" ${dirty ? '' : 'disabled'}>Lưu khung</button></div>
    <span class="err" id="tf-err" role="alert"></span>
    <section class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><h3>Lệnh cho agent nghiên cứu</h3><button class="btn sm" data-act="copy-template" data-t="agentPrompt">Chép lệnh</button></div>
      <pre class="prompt-pre">${esc(AC.agentPromptOf(S))}</pre></section>`;
}
const tfVal = el => { const d = view.tfDraft[Number(el.dataset.i)]; return d; };
INPUTS['tf'] = el => { const d = tfVal(el); if (!d) return; if (el.dataset.f === 'aliases') d.aliases = el.value.split(',').map(x => x.trim()).filter(Boolean); else d[el.dataset.f] = el.value; const b = document.querySelector('[data-act="tf-save"]'); if (b) { b.disabled = false; b.classList.add('primary'); } };
CHANGES['tf'] = el => { const d = tfVal(el); if (!d) return; d[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; render(); };
ACTIONS['tf-add'] = () => { view.tfDraft.push({ name: '', aliases: [], style: 'para', optional: true }); render(); const i = view.tfDraft.length - 1; const inp = document.getElementById(`tf-name-${i}`); if (inp) inp.focus(); };
ACTIONS['tf-del'] = el => { view.tfDraft.splice(Number(el.dataset.i), 1); render(); };
ACTIONS['tf-move'] = el => { const i = Number(el.dataset.i), j = i + Number(el.dataset.d); const d = view.tfDraft; if (j < 0 || j >= d.length) return; [d[i], d[j]] = [d[j], d[i]]; render(); };
ACTIONS['tf-save'] = () => { const r = AC.setTopicFrame(S, view.tfDraft); if (!r.ok) { const e = document.getElementById('tf-err'); if (e) e.textContent = r.error; return; } view.tfDraft = null; commit('Đã lưu Khung Topic. Tệp Topic nạp từ giờ sẽ theo khung này.'); };
ACTIONS['tf-reset'] = () => { AC.resetTopicFrame(S); view.tfDraft = null; commit('Đã về Khung Topic mặc định.'); };

// ---- Thương hiệu / Giọng văn ----
function mdPreviewHtml(kind) {
  const obj = S[kind]; const p = obj.parsed;
  const issues = obj.issues || [];
  const issuesHtml = issues.length ? `<div class="stack" style="gap:6px">${issues.map(i => `<div class="issue"><span class="lvl ${i.level === 'error' ? 'error' : 'note'}">${i.level === 'error' ? 'Lỗi' : 'Thiếu'}</span><span>${esc(i.text)}</span></div>`).join('')}</div>` : `<p class="small" style="color:var(--good)">Đủ đề mục theo mẫu.</p>`;
  if (kind === 'brand') return `${issuesHtml}
    <dl class="kv"><dt>Tên</dt><dd>${esc(p.name) || '<span class="faint">—</span>'}</dd><dt>Sản phẩm</dt><dd>${esc(p.products) || '—'}</dd><dt>Thị trường</dt><dd>${esc(p.market) || '—'}</dd><dt>Khách hàng</dt><dd>${esc(p.customers) || '—'}</dd><dt>Triết lý</dt><dd>${esc(p.philosophy) || '—'}</dd></dl>
    <div class="stack" style="gap:6px"><span class="eyebrow">Cụm từ cấm (${p.bannedPhrases.length}) · máy đọc</span><div class="tags">${p.bannedPhrases.map(b => `<span class="tag bad">${esc(b)}</span>`).join('') || '<span class="small faint">Chưa có</span>'}</div></div>
    <div class="stack" style="gap:6px"><span class="eyebrow">Sự thật đã xác minh (${p.verifiedFacts.length}) · máy đọc</span><div class="tags">${p.verifiedFacts.map(b => `<span class="tag">${esc(b)}</span>`).join('') || '<span class="small faint">Chưa có</span>'}</div></div>`;
  return `${issuesHtml}
    <dl class="kv"><dt>Tông</dt><dd>${esc(p.tone) || '—'}</dd><dt>Xưng hô</dt><dd>${esc(p.pronouns) || '—'}</dd><dt>Nên</dt><dd>${p.do.map(esc).join('<br>') || '—'}</dd><dt>Không nên</dt><dd>${p.dont.map(esc).join('<br>') || '—'}</dd><dt>Ví dụ</dt><dd>${p.samples.map(esc).join('<br>') || '—'}</dd></dl>`;
}
function mdTab(kind) {
  const name = kind === 'brand' ? 'Thương hiệu' : 'Giọng văn';
  return `<p class="muted">Viết hoặc nạp tệp Markdown theo mẫu ${kind === 'brand' ? 'autocontent-brand-v1' : 'autocontent-voice-v1'}. Ứng dụng chỉ đọc đề mục "## " và danh sách "- "; dòng nào trông như mệnh lệnh cũng chỉ là văn bản.</p>
    <div class="md-split">
      <section class="panel stack">
        <div class="row"><label class="btn sm" for="md-file-${kind}">Nạp tệp .md</label><input id="md-file-${kind}" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" class="sr" data-change="md-file" data-kind="${kind}">
          <button class="btn sm" data-act="md-template" data-kind="${kind}">Dùng mẫu</button><span class="small faint" id="md-saved-${kind}">Tự lưu khi gõ</span></div>
        <div class="field"><label for="md-${kind}">Nội dung ${name} (Markdown)</label><textarea id="md-${kind}" class="md" spellcheck="false" data-input="md-edit" data-kind="${kind}">${esc(S[kind].md)}</textarea></div>
      </section>
      <section class="panel stack" aria-live="polite"><header><h2>Ứng dụng đọc được</h2></header><div class="stack" id="md-preview-${kind}">${mdPreviewHtml(kind)}</div></section>
    </div>`;
}

let mdTimer = null;
INPUTS['md-edit'] = el => {
  clearTimeout(mdTimer);
  mdTimer = setTimeout(() => {
    const kind = el.dataset.kind;
    (kind === 'brand' ? AC.setBrandMd : AC.setVoiceMd)(S, el.value);
    save();
    const pv = $(`#md-preview-${kind}`); if (pv) pv.innerHTML = mdPreviewHtml(kind);
    const sv = $(`#md-saved-${kind}`); if (sv) sv.textContent = 'Đã lưu';
    renderNav();
  }, 350);
};
CHANGES['md-file'] = el => {
  const file = el.files && el.files[0]; if (!file) return;
  const kind = el.dataset.kind;
  const reader = new FileReader();
  reader.onload = () => { (kind === 'brand' ? AC.setBrandMd : AC.setVoiceMd)(S, String(reader.result)); commit(`Đã nạp ${file.name}.`); };
  reader.onerror = () => toast('Không đọc được tệp.', 'bad');
  reader.readAsText(file);
};
ACTIONS['md-template'] = async el => {
  const kind = el.dataset.kind;
  if (S[kind].md.trim()) {
    const ok = await confirmBox({ title: 'Thay bằng mẫu?', body: '<p>Nội dung hiện tại sẽ bị thay bằng mẫu Nói Được English.</p>', ok: 'Dùng mẫu', danger: true });
    if (!ok) return;
  }
  (kind === 'brand' ? AC.setBrandMd : AC.setVoiceMd)(S, AC.TEMPLATES[kind]); commit('Đã dùng mẫu.');
};

// ---- Kênh ----
function channelsTab() {
  return `<p class="muted">Giới hạn của kênh áp cho mọi Format thuộc kênh đó (quy tắc HR-06, chỉ cảnh báo).</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tên kênh</th><th>Tên ngắn</th><th>Tối đa ký tự</th><th>Tối đa hashtag</th><th>Ghi chú</th><th><span class="sr">Xóa</span></th></tr></thead><tbody>
    ${S.channels.map(c => `<tr>
      <td><input class="inp" id="ch-name-${esc(c.id)}" value="${esc(c.name)}" data-change="ch-edit" data-id="${esc(c.id)}" data-k="name" aria-label="Tên kênh"></td>
      <td><input class="inp" id="ch-short-${esc(c.id)}" value="${esc(c.short || '')}" data-change="ch-edit" data-id="${esc(c.id)}" data-k="short" aria-label="Tên ngắn" style="min-width:90px"></td>
      <td><input class="inp mono" id="ch-max-${esc(c.id)}" type="number" min="1" value="${c.maxChars}" data-change="ch-edit" data-id="${esc(c.id)}" data-k="maxChars" aria-label="Tối đa ký tự" style="min-width:80px"></td>
      <td><input class="inp mono" id="ch-tag-${esc(c.id)}" type="number" min="0" value="${c.maxHashtags}" data-change="ch-edit" data-id="${esc(c.id)}" data-k="maxHashtags" aria-label="Tối đa hashtag" style="min-width:70px"></td>
      <td><input class="inp" id="ch-notes-${esc(c.id)}" value="${esc(c.notes || '')}" data-change="ch-edit" data-id="${esc(c.id)}" data-k="notes" aria-label="Ghi chú" style="min-width:160px"></td>
      <td><button class="btn sm ghost danger" data-act="ch-delete" data-id="${esc(c.id)}">Xóa</button></td></tr>`).join('')}
    </tbody></table></div>
    <div><button class="btn" data-act="ch-add">${icon('plus')} Thêm kênh</button></div>
    ${channelPublishHtml()}`;
}
// Cách đăng và nguồn số liệu theo kênh (mục 10.22)
function channelPublishHtml() {
  const opts = (map, sel) => Object.entries(map).map(([k, l]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  return `<section class="cfg-sec"><div class="cfg-h"><h3>Cách đăng và số liệu</h3><span class="small faint cfg-r"><span class="mock">Mô phỏng ở bản MVP</span></span></div>
    <p class="small muted"><b>Tự động</b>: đến giờ hệ thống tự đăng (qua API riêng của nền tảng, Metricool hoặc Postiz) và tự gắn link vào slot. <b>Thủ công</b>: bạn tự đăng rồi dán link vào slot. Số liệu lấy theo mốc 1 giờ, 24 giờ, 7 ngày; bài đăng thủ công cần có link để Metricool/Postiz khớp bài. Chỉ slot của tuần đã Xác nhận lịch mới tự đăng.</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kênh</th><th>Nền tảng</th><th>Cách đăng</th><th>Đăng qua</th><th>Nguồn số liệu</th></tr></thead><tbody>
    ${S.channels.map(c => { const p = AC.channelPublish(S, c.id); const id = esc(c.id); return `<tr>
      <td>${chTag(c.id, c.short || c.name)}</td>
      <td><select class="inp" id="chp-plat-${id}" data-change="ch-pub" data-id="${id}" data-k="platform" aria-label="Nền tảng của ${esc(c.name)}">${opts(AC.PLATFORMS, AC.channelPlatform(c))}</select></td>
      <td><select class="inp" id="chp-mode-${id}" data-change="ch-pub" data-id="${id}" data-k="mode" aria-label="Cách đăng của ${esc(c.name)}">${opts({ auto: 'Tự động', manual: 'Thủ công' }, p.mode)}</select></td>
      <td><select class="inp" id="chp-via-${id}" data-change="ch-pub" data-id="${id}" data-k="via" aria-label="Đăng qua" ${p.mode === 'auto' ? '' : 'disabled title="Chỉ dùng khi Tự động"'}>${opts(AC.PUBLISH_VIA, p.via)}</select></td>
      <td><select class="inp" id="chp-met-${id}" data-change="ch-pub" data-id="${id}" data-k="metrics" aria-label="Nguồn số liệu">${opts(AC.METRICS_VIA, p.metrics)}</select></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="small faint">Bộ chỉ số theo nền tảng: Facebook Reach, Cảm xúc, Bình luận, Chia sẻ · Instagram Reach, Thích, Bình luận, Lưu, Chia sẻ · TikTok Lượt xem, Thích, Bình luận, Chia sẻ, Xem TB · Threads Lượt xem, Thích, Trả lời, Đăng lại · YouTube Lượt xem, Giờ xem, Thích, Bình luận · Blog Lượt xem trang, Đọc TB.</p></section>`;
}
CHANGES['ch-pub'] = el => {
  const r = AC.setChannelPublish(S, el.dataset.id, { [el.dataset.k]: el.value });
  if (!r.ok) return toast(r.error, 'bad');
  AC.runScheduler(S); commit('Đã lưu cách đăng của kênh.');
};
CHANGES['ch-edit'] = el => {
  const c = AC.byId(S.channels, el.dataset.id); const k = el.dataset.k;
  let v = el.value;
  if (k === 'maxChars' || k === 'maxHashtags') { v = Math.max(0, parseInt(v, 10) || 0); }
  if (k === 'name' && !String(v).trim()) { toast('Tên kênh không được để trống.', 'bad'); el.value = c.name; return; }
  c[k] = v; save(); renderNav(); toast('Đã lưu kênh.');
};
ACTIONS['ch-add'] = () => { const id = AC.nextId(S, 'ch'); S.channels.push({ id, name: 'Kênh mới', short: 'Kênh mới', maxChars: 1000, maxHashtags: 3, notes: '', platform: 'other', publish: AC.defaultPublish('other') }); commit('Đã thêm kênh. Đặt tên và giới hạn cho kênh.'); };
ACTIONS['ch-delete'] = async el => {
  const c = AC.byId(S.channels, el.dataset.id);
  const used = S.formats.filter(f => f.channelId === c.id);
  if (used.length) return toast(`Kênh đang có ${used.length} Format. Xóa hoặc chuyển các Format đó trước.`, 'bad');
  const ok = await confirmBox({ title: `Xóa kênh "${c.name}"?`, body: '<p>Kênh chưa có Format nào nên xóa an toàn.</p>', ok: 'Xóa kênh', danger: true });
  if (!ok) return;
  S.channels = S.channels.filter(x => x.id !== c.id); commit('Đã xóa kênh.');
};

// ---- Bộ soạn tiêu chí chấm ----
function criteriaEditorHtml(prefix, criteria) {
  return `<div class="stack" style="gap:6px" data-crit="${prefix}">
    <div class="row" style="justify-content:space-between"><span class="lb small" style="font-weight:600;color:var(--ink-2)">Tiêu chí chấm AI (tổng trọng số = 100)</span><span class="small mono" id="${prefix}-sum">Tổng ${AC.sumWeights(criteria)}</span></div>
    <div class="stack" style="gap:6px" id="${prefix}-rows">${criteria.map((c, i) => critRowHtml(prefix, c, i)).join('')}</div>
    <div><button class="btn sm" type="button" data-crit-add="${prefix}">${icon('plus')} Thêm tiêu chí</button></div>
  </div>`;
}
function critRowHtml(prefix, c, i) {
  return `<div class="crit" data-crit-row><input class="inp" id="${prefix}-n-${i}" value="${esc(c.name)}" aria-label="Tên tiêu chí" data-cid="${esc(c.id)}"><input class="inp mono" id="${prefix}-w-${i}" type="number" min="0" max="100" value="${c.weight}" aria-label="Trọng số"><button class="btn sm ghost" type="button" data-crit-del aria-label="Bỏ tiêu chí">×</button></div>`;
}
function bindCriteria(box, prefix) {
  const rows = $(`#${prefix}-rows`, box);
  const upd = () => { const sum = readCriteria(box, prefix).reduce((s, c) => s + c.weight, 0); const el = $(`#${prefix}-sum`, box); el.textContent = `Tổng ${sum}`; el.style.color = sum === 100 ? 'var(--good)' : 'var(--bad)'; };
  box.addEventListener('input', e => { if (e.target.closest(`#${prefix}-rows`)) upd(); });
  box.addEventListener('click', e => {
    if (e.target.closest(`[data-crit-add="${prefix}"]`)) { const i = rows.children.length + Math.floor(Math.random() * 1000); rows.insertAdjacentHTML('beforeend', critRowHtml(prefix, { id: `k${Date.now() % 100000}${i}`, name: '', weight: 0 }, i)); upd(); }
    const del = e.target.closest('[data-crit-del]'); if (del && rows.contains(del)) { del.closest('[data-crit-row]').remove(); upd(); }
  });
  upd();
}
function readCriteria(box, prefix) {
  return [...$(`#${prefix}-rows`, box).querySelectorAll('[data-crit-row]')].map(r => { const [n, w] = r.querySelectorAll('input'); return { id: n.dataset.cid, name: n.value.trim(), weight: parseInt(w.value, 10) || 0 }; }).filter(c => c.name);
}
export const lines = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
const commaList = t => String(t || '').split(',').map(s => s.trim()).filter(Boolean);
const numOrNull = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };

// ---- Cột ----
function rulesSummary(r, layout) {
  const unit = r.lengthUnit === 'words' ? 'chữ' : 'ký tự';
  const parts = [];
  if (layout === 'carousel') parts.push(`${r.slideMin || '?'}–${r.slideMax || '?'} slide, ≤ ${r.wordsPerSlideMax || '?'} chữ/slide`);
  else if (r.min || r.max) parts.push(`${r.min || 0}–${r.max || '∞'} ${unit}`);
  if (r.hashtagMax != null) parts.push(`≤ ${r.hashtagMax} hashtag`);
  parts.push(r.requireCta ? (r.ctaType === 'question' ? 'kết bằng câu hỏi' : 'có CTA') : 'không bắt buộc CTA');
  return parts.join(' · ');
}
// ---- Cấu hình Matrix (mục 10.53): mỗi vị trí chọn một loại Cột, được trùng; áp cho tuần mới ----
function matrixTab() {
  const ids = AC.matrixLayout(S); const custom = (S.settings.matrixColumns || []).length > 0;
  const w = { columnIds: ids };
  const opts = sel => S.columns.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}${c.active ? '' : ' (đang ẩn)'}</option>`).join('');
  const seen = {};
  const rows = ids.map((id, i) => {
    const k = seen[id] || 0; seen[id] = k + 1; const lbl = AC.laneLabel(S, w, id, k);
    return `<li class="mxrow">
      <span class="mxnum" aria-hidden="true">${i + 1}</span>
      <div class="mxmain"><label class="sr" for="mx-sel-${i}">Nội dung Cột ${i + 1}</label>
        <select id="mx-sel-${i}" class="inp" data-change="mx-pos" data-i="${i}">${opts(id)}</select>
        ${lbl !== AC.byId(S.columns, id).name ? `<span class="small muted">Tiêu đề trong Matrix: <b>${esc(lbl)}</b></span>` : ''}</div>
      <div class="mxacts">
        <button class="btn icon ghost" data-act="mx-move" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Đưa Cột ${i + 1} lên" title="Lên">${icon('up')}</button>
        <button class="btn icon ghost" data-act="mx-move" data-i="${i}" data-d="1" ${i < ids.length - 1 ? '' : 'disabled'} aria-label="Đưa Cột ${i + 1} xuống" title="Xuống">${icon('down')}</button>
        <button class="btn icon ghost danger" data-act="mx-del" data-i="${i}" ${ids.length > 1 ? '' : 'disabled'} aria-label="Xóa Cột ${i + 1}" title="Xóa">${icon('trash')}</button>
      </div></li>`;
  }).join('');
  return `<section class="panel stack">
      <header class="row" style="justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div class="stack" style="gap:4px"><h2>Các Cột của Matrix</h2>
        <p class="small muted">Mỗi vị trí chọn một loại nội dung trong mục Cột; được chọn trùng, ví dụ cả 5 vị trí đều là Giải thích. Các vị trí cùng loại dùng chung Skill, hướng dẫn và Format.</p></div>
        <span class="st ${custom ? 'st-ok' : 'st-off'}">${ids.length} Cột${custom ? '' : ' · mặc định'}</span></header>
      <ol class="mxlist" id="mx-layout">${rows}</ol>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="mx-add">${icon('plus')} Thêm vị trí Cột</button>${custom ? '<button class="btn ghost" data-act="mx-reset">Về mặc định</button>' : ''}</div>
      <p class="small faint">Áp cho tuần tạo mới. Tuần đã tạo giữ nguyên; muốn đổi thì thêm, bớt Cột ở màn hình Tuần. Sửa nội dung từng loại ở mục Cột.</p>
    </section>`;
}
const mxSet = (ids, msg) => { const r = AC.setMatrixLayout(S, ids); if (!r.ok) return toast(r.error, 'bad'); commit(msg); };
CHANGES['mx-pos'] = el => { const ids = AC.matrixLayout(S).slice(); ids[+el.dataset.i] = el.value; mxSet(ids, `Đã đổi Cột ${+el.dataset.i + 1}. Tuần mới dùng cấu hình này.`); };
ACTIONS['mx-add'] = () => { const ids = AC.matrixLayout(S).slice(); ids.push(ids[ids.length - 1] || S.columns[0].id); mxSet(ids, `Đã thêm Cột ${ids.length}. Chọn nội dung cho Cột này.`); };
ACTIONS['mx-del'] = el => { const ids = AC.matrixLayout(S).slice(); ids.splice(+el.dataset.i, 1); mxSet(ids, `Đã xóa Cột ${+el.dataset.i + 1}. Matrix tuần mới còn ${ids.length} Cột.`); };
ACTIONS['mx-move'] = el => { const ids = AC.matrixLayout(S).slice(); const i = +el.dataset.i, j = i + +el.dataset.d; [ids[i], ids[j]] = [ids[j], ids[i]]; mxSet(ids, 'Đã đổi thứ tự Cột.'); };
ACTIONS['mx-reset'] = () => { S.settings.matrixColumns = []; commit('Đã về mặc định: tuần mới lấy các Cột đang bật.'); };
function columnsTab() {
  const active = S.columns.filter(c => c.active).length;
  return `<p class="muted">Cột là chức năng nội dung (giải thích, hướng dẫn…), không phải định dạng; định dạng thuộc về Format. Đây là danh sách loại Cột để chọn; số Cột và thứ tự Cột của tuần mới đặt ở mục <button class="linkbtn" data-act="setup-tab" data-tab="matrix">Matrix</button>. Mỗi Cột cần ít nhất 1 Format.</p>
    <div class="cardlist">${S.columns.map(c => { const nf = S.formats.filter(f => f.columnId === c.id).length; return `<div class="citem ${c.active ? '' : 'off'}">
      <div class="stack" style="gap:4px"><b>${esc(c.name)}</b>${c.active ? '' : ' <span class="st st-off">Đang ẩn</span>'}
        <span class="small muted">${esc(c.structure.join(' → '))}</span>
        <span class="small">${esc(rulesSummary(c.hardRules))} · ${nf ? `${nf} Format` : '<span style="color:var(--warn)">chưa có Format</span>'}${AC.sumWeights(c.criteria) !== 100 ? ' · <span style="color:var(--bad)">trọng số chưa bằng 100</span>' : ''}</span></div>
      <div class="row"><button class="btn sm" data-act="col-edit" data-id="${esc(c.id)}">Sửa</button><button class="btn sm ghost" data-act="col-toggle" data-id="${esc(c.id)}">${c.active ? 'Ẩn' : 'Bật'}</button></div>
    </div>`; }).join('')}</div>
    <div class="row"><button class="btn" data-act="col-edit">${icon('plus')} Thêm Cột</button><button class="btn ghost" data-act="show-template" data-t="column">Xem mẫu Cột</button></div>`;
}
ACTIONS['col-toggle'] = el => { const c = AC.byId(S.columns, el.dataset.id); c.active = !c.active; commit(c.active ? `Đã bật Cột "${c.name}".` : `Đã ẩn Cột "${c.name}". Tuần đã tạo không đổi; tuần mới sẽ không có Cột này.`); };
ACTIONS['col-edit'] = el => {
  const isNew = !el.dataset.id;
  const c = isNew ? { id: '', kind: 'generic', name: '', active: true, guideMd: '', structure: ['Hook', 'Nội dung', 'CTA'], hardRules: { lengthUnit: 'chars', min: 300, max: 900, requireCta: true, ctaType: 'action', extraBanned: [] }, criteria: AC.clone(AC.DEFAULT_CELL_CRITERIA), assetPrompt: '' } : AC.clone(AC.byId(S.columns, el.dataset.id));
  const r = c.hardRules;
  const box = openLayer(`
    <header><div><span class="eyebrow">${isNew ? 'Cột mới' : 'Sửa Cột'}</span><h2>${esc(c.name || 'Cột mới')}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="cf-name">Tên Cột</label><input id="cf-name" value="${esc(c.name)}"></div>
      <label class="check"><input id="cf-active" type="checkbox" ${c.active ? 'checked' : ''}> Đang bật (tuần mới có Cột này)</label>
      ${(() => { const sk = AC.activeSkill(c); const f = `<div class="field"><label for="cf-guide">Hướng dẫn viết (Markdown)</label><textarea id="cf-guide">${esc(c.guideMd)}</textarea></div>`; return sk ? `<details class="field"><summary class="small muted">Hướng dẫn viết: không dùng khi có Skill "${esc(sk.name)}" v${sk.version} (bấm để xem)</summary>${f}</details>` : f; })()}
      ${isNew ? '<p class="small muted">Lưu Cột trước, rồi mở lại để nạp Skill.</p>' : skillButtonHtml('col', c)}
      <div class="field"><label for="cf-struct">Cấu trúc bắt buộc (mỗi dòng một đoạn)</label><textarea id="cf-struct" style="min-height:100px">${esc(c.structure.join('\n'))}</textarea><span class="hint">Ô ghi mỗi đoạn bằng đề mục "## Tên đoạn"; thiếu đoạn thì cảnh báo HR-04.</span></div>
      <div class="field"><label for="cf-layout">Khung trình bày (gửi kèm lệnh cho AI viết bài)</label><textarea id="cf-layout" style="min-height:130px" placeholder="${esc(AC.defaultLayoutGuide(c))}">${esc(c.layoutGuide || '')}</textarea><span class="hint">Để trống là dùng khung mặc định (chữ mờ). Quy tắc "Trình bày" (HR-13) nhắc khi bài sai khung. <button class="btn sm ghost" type="button" data-x="layout-default">Dùng mặc định</button></span></div>
      <div class="fgrid">
        <div class="field"><label for="cf-unit">Đơn vị độ dài</label><select id="cf-unit"><option value="chars" ${r.lengthUnit !== 'words' ? 'selected' : ''}>Ký tự</option><option value="words" ${r.lengthUnit === 'words' ? 'selected' : ''}>Chữ</option></select></div>
        <div class="field"><label for="cf-min">Tối thiểu</label><input id="cf-min" type="number" min="0" value="${r.min || ''}"></div>
        <div class="field"><label for="cf-max">Tối đa</label><input id="cf-max" type="number" min="0" value="${r.max || ''}"></div>
      </div>
      <label class="check"><input id="cf-cta" type="checkbox" ${r.requireCta ? 'checked' : ''}> Bắt buộc CTA ở cuối</label>
      <div class="field"><label for="cf-banned">Cụm từ cấm riêng của Cột (cách nhau dấu phẩy)</label><input id="cf-banned" value="${esc((r.extraBanned || []).join(', '))}"><span class="hint">Cộng thêm vào ${S.brand.parsed.bannedPhrases.length} cụm cấm của Thương hiệu.</span></div>
      ${criteriaEditorHtml('cfc', c.criteria)}
      <div class="field"><label for="cf-asset">Prompt asset</label><textarea id="cf-asset" style="min-height:70px">${esc(c.assetPrompt)}</textarea></div>
      <span class="err" id="cf-err" role="alert"></span>
      <div class="actions"><button class="btn" data-act="close-layer">Hủy</button><button class="btn primary" data-x="save">${isNew ? 'Thêm Cột' : 'Lưu Cột'}</button></div>
    </div>`, 'drawer', b => bindCriteria(b, 'cfc'));
  box.addEventListener('click', e => {
    if (e.target.closest('[data-x="layout-default"]')) { $('#cf-layout', box).value = ''; return; }
    if (!e.target.closest('[data-x="save"]')) return;
    const next = Object.assign(c, {
      name: $('#cf-name', box).value.trim(), active: $('#cf-active', box).checked, guideMd: $('#cf-guide', box).value,
      structure: lines($('#cf-struct', box).value), layoutGuide: $('#cf-layout', box).value.trim(), assetPrompt: $('#cf-asset', box).value,
      criteria: readCriteria(box, 'cfc'),
      hardRules: Object.assign(r, { lengthUnit: $('#cf-unit', box).value, min: numOrNull($('#cf-min', box).value), max: numOrNull($('#cf-max', box).value), requireCta: $('#cf-cta', box).checked, extraBanned: commaList($('#cf-banned', box).value) }),
    });
    const errs = AC.validateColumn(S, next);
    if (errs.length) { $('#cf-err', box).textContent = errs.join(' '); return; }
    if (isNew) { next.id = AC.nextId(S, 'col'); S.columns.push(next); } else { S.columns[S.columns.findIndex(x => x.id === next.id)] = next; }
    closeLayer(); commit(isNew ? `Đã thêm Cột "${next.name}". Nhớ tạo Format cho Cột này.` : `Đã lưu Cột "${next.name}". Nội dung đã viết không tự đổi; cảnh báo được chấm lại.`);
  });
};

// ---- Format ----
// Format theo kênh (10.57): một khung, kênh ở nửa trái, Format của kênh đang chọn ở nửa phải
function formatsTab() {
  if (!S.channels.length) return '<p class="muted">Chưa có kênh nên chưa thêm được Format. Thêm kênh ở mục Kênh trước.</p>';
  if (!AC.byId(S.channels, view.fmtCh)) view.fmtCh = S.channels[0].id;
  const ch = AC.byId(S.channels, view.fmtCh);
  const fs = S.formats.filter(f => f.channelId === ch.id);
  const left = S.channels.map(c => { const n = S.formats.filter(f => f.channelId === c.id).length; const on = c.id === ch.id;
    return `<button class="fmtch ${on ? 'on' : ''}" role="tab" aria-selected="${on}" data-act="fmt-channel" data-id="${esc(c.id)}">${chTag(c.id, c.name)}<span class="n ${n ? '' : 'zero'}" aria-label="${n} Format">${n}</span></button>`; }).join('');
  const cards = fs.map(f => `<div class="citem"><div class="stack" style="gap:4px"><b>${esc(f.name)}</b><span class="small muted">Cột nguồn: ${esc(colName(f.columnId))} · ${esc(f.structure.join(' → '))}</span><span class="small">${esc(rulesSummary(f.hardRules, f.layout))}${f.assetNeeds.length ? ` · asset: ${esc(f.assetNeeds.map(a => a.name).join(', '))}` : ''}</span></div>
        <div class="row"><button class="btn sm" data-act="fmt-edit" data-id="${esc(f.id)}">Sửa</button><button class="btn sm ghost danger" data-act="fmt-delete" data-id="${esc(f.id)}">Xóa</button></div></div>`).join('');
  return `<p class="muted">Format là cách trình bày một Cột trên một kênh. Mỗi Format thuộc đúng một kênh và đúng một Cột nguồn.</p>
    <section class="panel fmtsplit" aria-label="Format theo kênh">
      <div class="fmtl" role="tablist" aria-label="Kênh">${left}</div>
      <div class="fmtr" role="tabpanel"><header class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div class="stack" style="gap:2px"><span class="eyebrow">Kênh</span><h2>${esc(ch.name)}</h2></div>
        <div class="row" style="gap:8px"><span class="small faint">${fs.length} Format</span><button class="btn sm" data-act="fmt-edit" data-ch="${esc(ch.id)}">${icon('plus')} Thêm Format</button></div></header>
        <div class="cardlist">${cards || '<p class="small faint">Kênh này chưa có Format.</p>'}</div></div>
    </section>
    <div class="row"><button class="btn ghost" data-act="show-template" data-t="format">Xem mẫu Format</button></div>`;
}
ACTIONS['fmt-channel'] = el => { view.fmtCh = el.dataset.id; render(); };
ACTIONS['fmt-edit'] = el => {
  const isNew = !el.dataset.id;
  const f = isNew ? { id: '', kind: '', name: '', channelId: el.dataset.ch || '', columnId: '', layout: 'post', structure: ['Hook', 'Thân bài', 'CTA'], guideMd: '', hardRules: { lengthUnit: 'chars', min: 300, max: 1000, requireCta: true, ctaType: 'action', hashtagMax: 3, slideMin: null, slideMax: null, wordsPerSlideMax: null, extraBanned: [] }, criteria: AC.clone(AC.DEFAULT_SLOT_CRITERIA), assetNeeds: [] } : AC.clone(AC.byId(S.formats, el.dataset.id));
  const r = f.hardRules;
  const box = openLayer(`
    <header><div><span class="eyebrow">${isNew ? 'Format mới' : 'Sửa Format'}</span><h2>${esc(f.name ? fmtFull(f.id) : 'Format mới')}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="ff-name">Tên Format</label><input id="ff-name" value="${esc(f.name)}" placeholder="Ví dụ: Bài kể chuyện"></div>
      <div class="fgrid">
        <div class="field"><label for="ff-ch">Kênh (bắt buộc)</label><select id="ff-ch"><option value="">Chọn kênh</option>${S.channels.map(c => `<option value="${esc(c.id)}" ${c.id === f.channelId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ff-col">Cột nguồn (bắt buộc)</label><select id="ff-col"><option value="">Chọn Cột</option>${S.columns.map(c => `<option value="${esc(c.id)}" ${c.id === f.columnId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ff-layout">Dạng trình bày</label><select id="ff-layout">${Object.entries(AC.LAYOUTS).map(([v, l]) => `<option value="${v}" ${f.layout === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="ff-guide">Hướng dẫn trình bày (Markdown)</label><textarea id="ff-guide">${esc(f.guideMd)}</textarea></div>
      ${isNew ? '<p class="small muted">Lưu Format trước, rồi mở lại để nạp Skill.</p>' : skillButtonHtml('fmt', f)}
      <div class="field"><label for="ff-struct">Cấu trúc (mỗi dòng một đoạn)</label><textarea id="ff-struct" style="min-height:90px">${esc(f.structure.join('\n'))}</textarea></div>
      <div class="fgrid">
        <div class="field"><label for="ff-unit">Đơn vị độ dài</label><select id="ff-unit"><option value="chars" ${r.lengthUnit !== 'words' ? 'selected' : ''}>Ký tự</option><option value="words" ${r.lengthUnit === 'words' ? 'selected' : ''}>Chữ</option></select></div>
        <div class="field"><label for="ff-min">Tối thiểu</label><input id="ff-min" type="number" min="0" value="${r.min || ''}"></div>
        <div class="field"><label for="ff-max">Tối đa</label><input id="ff-max" type="number" min="0" value="${r.max || ''}"></div>
        <div class="field"><label for="ff-tag">Tối đa hashtag</label><input id="ff-tag" type="number" min="0" value="${r.hashtagMax ?? ''}"></div>
        <div class="field"><label for="ff-smin">Slide tối thiểu</label><input id="ff-smin" type="number" min="0" value="${r.slideMin || ''}"></div>
        <div class="field"><label for="ff-smax">Slide tối đa</label><input id="ff-smax" type="number" min="0" value="${r.slideMax || ''}"></div>
        <div class="field"><label for="ff-wps">Chữ mỗi slide tối đa</label><input id="ff-wps" type="number" min="0" value="${r.wordsPerSlideMax || ''}"></div>
      </div>
      <div class="fgrid">
        <label class="check"><input id="ff-cta" type="checkbox" ${r.requireCta ? 'checked' : ''}> Bắt buộc CTA</label>
        <div class="field"><label for="ff-ctat">Kiểu CTA</label><select id="ff-ctat"><option value="action" ${r.ctaType !== 'question' ? 'selected' : ''}>Lời kêu gọi hành động</option><option value="question" ${r.ctaType === 'question' ? 'selected' : ''}>Câu hỏi</option></select></div>
      </div>
      <div class="field"><label for="ff-banned">Cụm từ cấm riêng (cách nhau dấu phẩy)</label><input id="ff-banned" value="${esc((r.extraBanned || []).join(', '))}"></div>
      ${criteriaEditorHtml('ffc', f.criteria)}
      <div class="field"><label for="ff-assets">Yêu cầu asset (mỗi dòng "Tên: prompt"; ghi [4:5], [9:16]… trong tên để đặt tỉ lệ ảnh, không ghi thì theo kênh)</label><textarea id="ff-assets" style="min-height:80px">${esc(f.assetNeeds.map(a => `${a.name}: ${a.prompt}`).join('\n'))}</textarea></div>
      <span class="err" id="ff-err" role="alert"></span>
      <div class="actions"><button class="btn" data-act="close-layer">Hủy</button><button class="btn primary" data-x="save">${isNew ? 'Thêm Format' : 'Lưu Format'}</button></div>
    </div>`, 'drawer', b => bindCriteria(b, 'ffc'));
  box.addEventListener('click', e => {
    if (!e.target.closest('[data-x="save"]')) return;
    const tagV = $('#ff-tag', box).value;
    const next = Object.assign(f, {
      name: $('#ff-name', box).value.trim(), channelId: $('#ff-ch', box).value, columnId: $('#ff-col', box).value, layout: $('#ff-layout', box).value,
      guideMd: $('#ff-guide', box).value, structure: lines($('#ff-struct', box).value), criteria: readCriteria(box, 'ffc'),
      assetNeeds: lines($('#ff-assets', box).value).map(l => { const i = l.indexOf(':'); return i > 0 ? { name: l.slice(0, i).trim(), prompt: l.slice(i + 1).trim() } : { name: l, prompt: '' }; }),
      hardRules: Object.assign(r, { lengthUnit: $('#ff-unit', box).value, min: numOrNull($('#ff-min', box).value), max: numOrNull($('#ff-max', box).value), hashtagMax: tagV === '' ? null : Math.max(0, parseInt(tagV, 10) || 0), slideMin: numOrNull($('#ff-smin', box).value), slideMax: numOrNull($('#ff-smax', box).value), wordsPerSlideMax: numOrNull($('#ff-wps', box).value), requireCta: $('#ff-cta', box).checked, ctaType: $('#ff-ctat', box).value, extraBanned: commaList($('#ff-banned', box).value) }),
    });
    const errs = AC.validateFormat(S, next);
    if (errs.length) { $('#ff-err', box).textContent = errs.join(' '); return; }
    if (isNew) { next.id = AC.nextId(S, 'f'); S.formats.push(next); }
    else {
      const old = AC.byId(S.formats, next.id);
      if (old.columnId !== next.columnId || old.channelId !== next.channelId) {
        const fu = AC.formatUsage(S, next.id); const n = fu.openSlots.length + fu.lockedSlots.length + fu.publishedSlots.length;
        if (n) { $('#ff-err', box).textContent = `Format đang có ${n} slot. Không đổi kênh hoặc Cột của Format đang dùng; hãy tạo Format mới.`; return; }
      }
      S.formats[S.formats.findIndex(x => x.id === next.id)] = next;
    }
    closeLayer(); commit(isNew ? `Đã thêm Format "${fmtFull(next.id)}".` : `Đã lưu Format. Cảnh báo của slot dùng Format này được chấm lại.`);
  });
};
ACTIONS['fmt-delete'] = async el => {
  const f = AC.byId(S.formats, el.dataset.id);
  const u = AC.formatUsage(S, f.id);
  if (u.publishedSlots.length) return toast(`Format đang có ${u.publishedSlots.length} bài đã đăng (chỉ xem) nên không xóa được.`, 'bad');
  if (u.lockedSlots.length) return toast(`Format đang có ${u.lockedSlots.length} slot ở tuần đã chốt. Mở lại tuần đó trước.`, 'bad');
  const others = S.formats.filter(x => x.id !== f.id);
  const sameCol = others.filter(x => x.columnId === f.columnId);
  const extra = u.openSlots.length ? `<div class="field"><label for="fd-move">Chuyển ${u.openSlots.length} slot sang Format</label><select id="fd-move" data-collect="move">${[...sameCol, ...others.filter(x => x.columnId !== f.columnId)].map(x => `<option value="${esc(x.id)}">${esc(fmtFull(x.id))} · Cột ${esc(colName(x.columnId))}</option>`).join('')}</select><span class="hint">Chọn Format khác Cột thì slot mất ô nguồn.</span></div>` : '';
  const res = await confirmBox({ title: `Xóa Format "${fmtFull(f.id)}"?`, danger: true, ok: 'Xóa Format', extra,
    body: `<p>${u.openSlots.length ? `Format đang có ${u.openSlots.length} slot ở tuần chưa chốt.` : 'Không có slot nào ở tuần chưa chốt dùng Format này.'}${u.templates.length ? ` ${u.templates.length} slot mẫu trong các Tuần mẫu sẽ bị xóa.` : ''}</p>` });
  if (!res) return;
  const r = AC.deleteFormat(S, f.id, res.move);
  if (!r.ok) return toast(r.error, 'bad');
  commit(`Đã xóa Format${r.moved ? `, chuyển ${r.moved} slot` : ''}.`);
};

// ---- Tuần mẫu ----
function curTemplate() {
  const list = AC.templatesSorted(S);
  if (!view.tplSel || !AC.templateOf(S, view.tplSel)) view.tplSel = list[0] ? list[0].id : null;
  return view.tplSel ? AC.templateOf(S, view.tplSel) : null;
}
function templatesTab() {
  const all = AC.templatesSorted(S); const tpl = curTemplate();
  const head = `<p class="muted">Tuần mẫu là bộ slot dựng sẵn (ngày, giờ, kênh, Format). Ở Dashboard, Lập tuần chọn một Tuần mẫu để tạo slot cho tuần trống. Thứ tự dưới đây là thứ tự xoay vòng: app gợi ý mẫu kế tiếp sau mẫu của tuần trước. Đổi Tuần mẫu không đổi tuần đã lập.</p>
    <div class="row" role="tablist" aria-label="Danh sách Tuần mẫu">${all.map((t, i) => `<button class="fchip" role="tab" aria-selected="${tpl && tpl.id === t.id}" aria-pressed="${!!tpl && tpl.id === t.id}" data-act="tpl-select" data-id="${esc(t.id)}">${i + 1}. ${esc(t.name)} <span class="faint">(${t.slots.length})</span></button>`).join('')}
      <button class="btn sm" data-act="tpl-new">${icon('plus')} Thêm Tuần mẫu</button></div>`;
  if (!tpl) return `${head}<div class="note bad">Chưa có Tuần mẫu nên chưa lập được tuần.</div>`;
  const warns = AC.templateWarnings(S, tpl);
  const list = [...tpl.slots].sort((a, b) => a.weekday - b.weekday || AC.minutesOf(a.time) - AC.minutesOf(b.time));
  const cc = AC.templateColumnCounts(S, tpl);
  const perCol = S.columns.filter(c => c.active).map(c => [c.name, cc[c.id] || 0]);
  const emptyDays = AC.templateEmptyDays(tpl);
  const idx = all.findIndex(t => t.id === tpl.id);
  const colOf = t => { const f = AC.byId(S.formats, t.formatId); return f ? f.columnId : null; };
  return `${head}
    <section class="panel stack">
      <header><div><span class="eyebrow">Tuần mẫu ${idx + 1}/${all.length}</span><h2>${esc(tpl.name)}</h2></div>
        <div class="row" style="gap:4px"><button class="btn sm icon" data-act="tpl-move" data-id="${esc(tpl.id)}" data-d="-1" ${idx <= 0 ? 'disabled' : ''} aria-label="Đưa lên trước">${icon('left')}</button><button class="btn sm icon" data-act="tpl-move" data-id="${esc(tpl.id)}" data-d="1" ${idx >= all.length - 1 ? 'disabled' : ''} aria-label="Đưa ra sau">${icon('right')}</button>
        <button class="btn sm" data-act="tpl-dup" data-id="${esc(tpl.id)}">Nhân bản</button><button class="btn sm danger" data-act="tpl-del" data-id="${esc(tpl.id)}">Xóa</button></div></header>
      <div class="field"><label for="tpn-name">Tên Tuần mẫu</label><input id="tpn-name" value="${esc(tpl.name)}" data-change="tpl-name" data-id="${esc(tpl.id)}"></div>
      <div class="row small"><span class="muted">${list.length} slot · theo Cột:</span>${perCol.map(([n, k]) => `<span class="kchip"><b>${k}</b> ${esc(n)}</span>`).join('')}</div>
      ${emptyDays.length ? `<div class="note warn">Ngày chưa có slot: ${emptyDays.map(d => esc(AC.WEEKDAY_LONG[d])).join(', ')}.</div>` : ''}
      ${warns.length ? `<div class="note warn">${warns.map(w => esc(w.text)).join('<br>')}</div>` : ''}
      ${list.length ? '' : '<div class="note bad">Tuần mẫu này chưa có slot nên không được gợi ý và không dùng được.</div>'}
      ${tplCalHtml(list, colOf)}
      <div><button class="btn" data-act="tpl-add" data-day="1">${icon('plus')} Thêm slot mẫu</button></div>
    </section>`;
}
// Lịch của Tuần mẫu (10.56): cùng bố cục với lịch tuần; bấm slot để sửa, dấu + để thêm slot vào ngày
function tplCalHtml(list, colOf) {
  const days = [1, 2, 3, 4, 5, 6, 7];
  const plus = d => `<button class="addslot" data-act="tpl-add" data-day="${d}" aria-label="Thêm slot mẫu ${esc(AC.WEEKDAY_LONG[d])}">${icon('plus')}</button>`;
  const chip = t => `<button class="slot" data-act="tpl-slot-edit" data-id="${esc(t.id)}" aria-label="${esc(`${AC.WEEKDAY_LONG[t.weekday]} ${t.time} ${chName(t.channelId)} ${fmtName(t.formatId)}`)}">
      <span class="top"><span class="t mono">${esc(t.time)}</span>${chTag(t.channelId)}</span>
      <span class="fmt">${esc(fmtName(t.formatId))}</span>
      <span class="seg-col">${esc(colName(colOf(t)))}</span></button>`;
  const grid = `<div class="cal" role="grid" aria-label="Lịch Tuần mẫu">${days.map(d => `
    <div class="day" role="gridcell"><div class="day-h"><span><b>${AC.WEEKDAY_SHORT[d]}</b></span>${plus(d)}</div>
      <div class="day-b">${list.filter(t => t.weekday === d).map(chip).join('') || '<span class="small faint">Không có slot</span>'}</div></div>`).join('')}</div>`;
  const dl = `<div class="daylist">${days.map(d => { const ds = list.filter(t => t.weekday === d); return `<div class="dl-day"><div class="day-h"><span><b>${AC.WEEKDAY_LONG[d]}</b></span>${plus(d)}</div>
      ${ds.length ? `<div class="dl-slots">${ds.map(chip).join('')}</div>` : ''}</div>`; }).join('')}</div>`;
  return `<div class="tplcal">${grid}${dl}</div>`;
}
ACTIONS['tpl-slot-edit'] = el => {
  const tpl = curTemplate(); const t = tpl && tpl.slots.find(x => x.id === el.dataset.id); if (!t) return;
  const box = openLayer(`<h2>Sửa slot mẫu</h2>
    <div class="fgrid">
      <div class="field"><label for="ts-d">Thứ</label><select id="ts-d">${[1, 2, 3, 4, 5, 6, 7].map(d => `<option value="${d}" ${t.weekday === d ? 'selected' : ''}>${AC.WEEKDAY_LONG[d]}</option>`).join('')}</select></div>
      <div class="field"><label for="ts-t">Giờ</label><input id="ts-t" type="time" value="${esc(t.time)}"></div>
    </div>
    <div class="field"><label for="ts-c">Kênh</label><select id="ts-c">${channelOptions(t.channelId)}</select></div>
    <div class="field"><label for="ts-f">Format</label><select id="ts-f">${formatOptions(t.channelId, t.formatId)}</select><span class="hint" id="ts-col">Cột: ${esc(colName((AC.byId(S.formats, t.formatId) || {}).columnId))}</span></div>
    <span class="err" id="ts-err" role="alert"></span>
    <div class="actions"><button class="btn danger" data-x="del" style="margin-right:auto">Xóa slot</button><button class="btn" data-x="no">Hủy</button><button class="btn primary" data-x="save">Lưu</button></div>`, 'dialog');
  const colHint = () => { const f = AC.byId(S.formats, $('#ts-f', box).value); $('#ts-col', box).textContent = `Cột: ${f ? colName(f.columnId) : '(chưa có Format)'}`; };
  box.addEventListener('change', e => {
    if (e.target.id === 'ts-c') { $('#ts-f', box).innerHTML = formatOptions(e.target.value, ''); }
    if (e.target.id === 'ts-c' || e.target.id === 'ts-f') colHint();
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'no') return closeLayer();
    if (b.dataset.x === 'del') { tpl.slots = tpl.slots.filter(x => x.id !== t.id); closeLayer(); return commit('Đã xóa slot mẫu.'); }
    const time = $('#ts-t', box).value, fid = $('#ts-f', box).value;
    if (!AC.isValidTime(time)) { $('#ts-err', box).textContent = 'Giờ không hợp lệ.'; return; }
    if (!fid) { $('#ts-err', box).textContent = 'Kênh này chưa có Format. Chọn kênh khác hoặc tạo Format trước.'; return; }
    Object.assign(t, { weekday: Number($('#ts-d', box).value), time, channelId: $('#ts-c', box).value, formatId: fid });
    closeLayer(); commit('Đã lưu slot mẫu.');
  });
};
ACTIONS['tpl-select'] = el => { view.tplSel = el.dataset.id; render(); };
ACTIONS['tpl-new'] = () => { const t = AC.addWeekTemplate(S, '', null); view.tplSel = t.id; commit('Đã thêm Tuần mẫu mới. Đặt tên và thêm slot mẫu.'); };
ACTIONS['tpl-dup'] = el => { const src = AC.templateOf(S, el.dataset.id); const t = AC.addWeekTemplate(S, `${src.name} (bản sao)`, src.id); view.tplSel = t.id; commit('Đã nhân bản Tuần mẫu.'); };
ACTIONS['tpl-move'] = el => { AC.moveWeekTemplate(S, el.dataset.id, Number(el.dataset.d)); commit(); };
ACTIONS['tpl-del'] = async el => {
  const t = AC.templateOf(S, el.dataset.id);
  const used = S.weeks.filter(w => w.templateId === t.id).length;
  const ok = await confirmBox({ title: `Xóa Tuần mẫu "${t.name}"?`, danger: true, ok: 'Xóa Tuần mẫu', body: `<p>${t.slots.length} slot mẫu bị xóa.${used ? ` ${used} tuần đã lập từ mẫu này giữ nguyên slot.` : ''}</p>` });
  if (!ok) return;
  AC.deleteWeekTemplate(S, t.id); view.tplSel = null; commit('Đã xóa Tuần mẫu.');
};
CHANGES['tpl-name'] = el => { const t = AC.templateOf(S, el.dataset.id); const v = el.value.trim(); if (!v) { toast('Tên không được để trống.', 'bad'); return render(); } t.name = v; commit(); };
ACTIONS['tpl-add'] = el => {
  const tpl = curTemplate(); const f = S.formats[0]; if (!tpl) return; if (!f) return toast('Cần có ít nhất một Format trước.', 'bad');
  const day = Number(el && el.dataset && el.dataset.day) || 1;
  const t = { id: AC.nextId(S, 'tpl'), weekday: day, time: '09:00', channelId: f.channelId, formatId: f.id }; tpl.slots.push(t);
  commit(`Đã thêm slot mẫu ${AC.WEEKDAY_LONG[day]} 09:00. Bấm vào slot để chỉnh giờ, kênh và Format.`);
};

// ---- Quy tắc & tiêu chí ----
function rulesTab() {
  return `<section class="panel stack" id="rules-form">
      <header><div><span class="eyebrow">Tuần</span><h2>Ngưỡng và từ cường điệu</h2></div><span class="small faint">Chỉ để tham khảo, không chặn</span></header>
      <div class="fgrid">
        <div class="field"><label for="rl-thr">Ngưỡng "nên xem lại"</label><input id="rl-thr" type="number" min="0" max="100" value="${S.settings.reviewThreshold}"><span class="hint">Tổng điểm AI dưới ngưỡng thì hiện nhãn "Nên xem lại".</span></div>
      </div>
      <div class="field"><label for="rl-hype">Từ cường điệu (HR-07, cách nhau dấu phẩy)</label><input id="rl-hype" value="${esc(S.settings.hypeWords.join(', '))}"></div>
      <span class="err" id="rl-err" role="alert"></span>
      <div class="actions"><button class="btn primary" data-act="rules-save">Lưu quy tắc</button></div>
    </section>
    <section class="panel stack"><header><h2>Quy tắc cứng đang áp dụng</h2><span class="small faint">Ứng dụng tính · chỉ cảnh báo</span></header>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quy tắc</th><th>Mức</th><th>Áp cho</th></tr></thead><tbody>
      ${[['Độ dài theo Cột/Format (ký tự hoặc chữ)', 'Lỗi', 'Ô, slot'], ['Cụm từ cấm của Thương hiệu, Cột, Format', 'Lỗi', 'Ô, slot'], ['Có CTA khi bắt buộc', 'Lỗi', 'Ô, slot'], ['Đủ đoạn cấu trúc', 'Lỗi', 'Ô, slot'], ['Không thêm số liệu ngoài ô nguồn', 'Lỗi', 'Slot'], ['Giới hạn kênh: hashtag, slide, ký tự', 'Lỗi', 'Slot'], ['Từ cường điệu', 'Lưu ý', 'Ô, slot'], ['Xưng hô khác Giọng văn', 'Lưu ý', 'Ô, slot'], ['Số liệu không thấy trong Topic của hàng', 'Lưu ý', 'Ô'], ['Lặp nguyên văn với ô của Topic khác (trừ CTA)', 'Lưu ý', 'Ô'], ['Dẫn sang bài khác ("hôm qua", "bài trước"…)', 'Lưu ý', 'Ô, slot']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small faint">"Lỗi" là mức nhấn mạnh nên sửa, không chặn duyệt hay xác nhận. Ngưỡng độ dài sửa ở từng Cột và Format.</p></section>`;
}
ACTIONS['rules-save'] = () => {
  const thr = parseInt($('#rl-thr').value, 10);
  if (!(thr >= 0 && thr <= 100)) { $('#rl-err').textContent = 'Ngưỡng phải từ 0 đến 100.'; return; }
  S.settings.reviewThreshold = thr; S.settings.hypeWords = commaList($('#rl-hype').value);
  commit('Đã lưu quy tắc và tiêu chí.');
};

// ---- Sao lưu & demo ----
function backupTab() {
  const rescue = store.get(AC.STORAGE_KEY + '-rescue');
  return `<section class="panel stack"><header><div><span class="eyebrow">Đồng hồ demo</span><h2>Giờ hiện tại của ứng dụng</h2></div></header>
      <p class="small muted">Dùng để tính "hôm nay", slot đã đến giờ và slot trễ. Múi giờ UTC+7.</p>
      <div class="row"><div class="field"><label for="bk-now">Ngày giờ demo</label><input id="bk-now" type="datetime-local" value="${esc(S.settings.demoNow)}"></div>
        <button class="btn" data-act="set-now" style="align-self:end">Đặt giờ demo</button><button class="btn ghost" data-act="reset-now" style="align-self:end">Về 12/10/2026 09:00</button></div></section>
    <section class="panel stack"><header><div><span class="eyebrow">Sao lưu</span><h2>Xuất toàn bộ dữ liệu</h2></div></header>
      <p class="small muted">Dữ liệu chỉ nằm trong trình duyệt này. Sao chép nội dung dưới đây và giữ ở nơi an toàn. Có thể tải về thành tệp .json.</p>
      <button class="btn" data-act="backup-make">Tạo bản sao lưu</button>
      <div id="bk-out"></div></section>
    <section class="panel stack"><header><div><span class="eyebrow">Khôi phục</span><h2>Dán bản sao lưu</h2></div></header>
      <div class="field"><label for="bk-in">Nội dung JSON sao lưu</label><textarea id="bk-in" class="md" style="min-height:140px" spellcheck="false" placeholder='{"format":"autocontent-backup", …}'></textarea></div>
      <span class="err" id="bk-err" role="alert"></span>
      <div><button class="btn primary" data-act="backup-restore">Khôi phục</button></div></section>
    <section class="panel stack"><header><div><span class="eyebrow">Dữ liệu</span><h2>Demo và Reset</h2></div></header>
      <div class="row"><button class="btn" data-act="load-demo">Nạp dữ liệu demo</button><button class="btn danger" data-act="reset">Reset về trống</button></div>
      ${rescue ? `<div class="note warn">Có một bản dữ liệu hỏng đã được cứu (${rescue.length} ký tự). <button class="linkbtn" data-act="rescue-copy">Sao chép bản thô</button> · <button class="linkbtn" data-act="rescue-clear">Xóa bản cứu</button></div>` : ''}
      <p class="small faint">Phiên bản dữ liệu ${esc(AC.DATA_VERSION)} · ${S.audit.length} dòng nhật ký thao tác</p></section>`;
}
ACTIONS['set-now'] = () => { const v = String($('#bk-now').value || '').slice(0, 16); const r = AC.setDemoNow(S, v); if (!r.ok) return toast('Ngày giờ không hợp lệ.', 'bad'); S.ui.weekStart = AC.mondayOf(v.slice(0, 10)); commit(`Giờ demo: ${v.replace('T', ' ')}.${r.published ? ` Đã tự đăng ${r.published} slot.` : ''}`); };
ACTIONS['reset-now'] = () => { AC.setDemoNow(S, '2026-10-12T09:00'); S.ui.weekStart = '2026-10-12'; commit('Giờ demo về 12/10/2026 09:00.'); };
ACTIONS['backup-download'] = () => { const t = $('#bk-text'); if (t) downloadBytes(`autocontent-backup-${S.settings.demoNow.slice(0, 10)}.json`, AC.utf8Bytes(t.value), 'application/json'); };
ACTIONS['backup-make'] = () => {
  const txt = AC.exportBackup(S); const sha = JSON.parse(txt).sha256;
  $('#bk-out').innerHTML = `<div class="stack"><div class="row small"><span class="muted">sha256</span><span class="mono" style="overflow-wrap:anywhere">${sha}</span></div>
    <div class="field"><label for="bk-text">Bản sao lưu (${Math.round(txt.length / 1024)} KB)</label><textarea id="bk-text" class="md" style="min-height:140px" readonly>${esc(txt)}</textarea></div>
    <div class="row"><button class="btn" data-act="backup-copy">Sao chép</button><button class="btn" data-act="backup-download">Tải tệp .json</button></div></div>`;
};
ACTIONS['backup-copy'] = () => { const t = $('#bk-text'); try { navigator.clipboard.writeText(t.value).then(() => toast('Đã sao chép bản sao lưu.'), () => { t.select(); toast('Hãy nhấn Ctrl/Cmd+C để sao chép phần đã chọn.'); }); } catch (e) { t.select(); toast('Hãy nhấn Ctrl/Cmd+C để sao chép phần đã chọn.'); } };
ACTIONS['backup-restore'] = async () => {
  const r = AC.importBackup($('#bk-in').value);
  if (!r.ok) { $('#bk-err').textContent = r.error; return; }
  const ok = await confirmBox({ title: 'Khôi phục bản sao lưu?', danger: true, ok: 'Khôi phục', body: `<p>Thay dữ liệu hiện tại bằng bản sao lưu: ${r.state.weeks.length} tuần, ${r.state.slots.length} slot, ${r.state.cells.length} ô. Checksum đã khớp.</p>` });
  if (!ok) return;
  setS(r.state); commit('Đã khôi phục bản sao lưu.');
};
ACTIONS['rescue-copy'] = () => copyText(store.get(AC.STORAGE_KEY + '-rescue') || '');
ACTIONS['rescue-clear'] = () => { store.del(AC.STORAGE_KEY + '-rescue'); view.banner = null; render(); toast('Đã xóa bản cứu.'); };
