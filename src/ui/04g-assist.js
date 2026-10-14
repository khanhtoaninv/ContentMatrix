// ---------- UI · Trợ lý viết (mục 10.35) ----------
// Sửa đoạn bằng AI, phương án hook/caption: MÔ PHỎNG (AC.aiRewrite, AC.hookOptions, AC.captionOptions).
// Thư viện hashtag & CTA: chạy thật (Setup → Hashtag & CTA).
function aiCtxOf(ta) {
  const s = ta.dataset.slot && AC.byId(S.slots, ta.dataset.slot);
  if (s) return { slotId: s.id, columnId: AC.slotColumnId(S, s), channelId: s.channelId };
  const c = ta.dataset.cell && AC.byId(S.cells, ta.dataset.cell);
  return c ? { columnId: c.columnId } : {};
}
// Đoạn để sửa: phần đang bôi đen, hoặc cả đoạn chứa con trỏ
function aiRange(ta) {
  const v = ta.value; let a = ta.selectionStart, b = ta.selectionEnd;
  if (a === b) {
    a = v.lastIndexOf('\n\n', a - 1); a = a < 0 ? 0 : a + 2;
    b = v.indexOf('\n\n', b); b = b < 0 ? v.length : b;
  }
  while (a < b && /\s/.test(v[a])) a++; while (b > a && /\s/.test(v[b - 1])) b--;
  return [a, b];
}
// Ghi đè cả bài (giữ Hoàn tác của trình duyệt)
function aiReplaceAll(ta, text) { mdReplace(ta, 0, ta.value.length, text); }
const AI_SIM_NOTE_TXT = '<span class="sim-tag" title="Bản MVP biến đổi theo quy tắc; bật AI thật ở Setup → Kết nối AI">Mô phỏng</span>';
const aiNote = () => AC.textApiOn(S) ? `<span class="sim-tag real">AI thật · ${esc(textProviderLabel())}</span>` : AI_SIM_NOTE_TXT;

ACTIONS['ai-edit'] = el => {
  const ta = mdTa(el.dataset.for); if (!ta) return;
  const [a, b] = aiRange(ta); const src = ta.value.slice(a, b);
  if (!src.trim()) return toast('Bôi đen một đoạn, hoặc đặt con trỏ vào đoạn cần sửa.', 'bad');
  const st = { op: null, n: 0, ins: '' };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Trợ lý viết ${aiNote()}</span><h2>Sửa đoạn bằng AI</h2><p class="small muted">${ta.selectionStart !== ta.selectionEnd ? 'Đoạn bạn bôi đen' : 'Đoạn chứa con trỏ'} sẽ được thay bằng kết quả. Bạn sửa tiếp kết quả được trước khi thay.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <blockquote class="ai-src">${esc(src)}</blockquote>
    <div class="row ai-ops" style="gap:6px;flex-wrap:wrap" role="group" aria-label="Cách sửa">${Object.entries(AC.AI_OPS).map(([k, l]) => `<button class="btn sm" data-aiop="${k}" aria-pressed="false">${esc(l)}</button>`).join('')}</div>
    <div class="row" style="gap:8px;align-items:flex-end;margin-top:8px"><div class="field" style="flex:1"><label for="ai-ins">Hoặc gõ yêu cầu</label><input id="ai-ins" placeholder="Ví dụ: ngắn gọn và thân mật hơn, thêm emoji"></div><button class="btn" data-aiop="custom">Sửa theo yêu cầu</button></div>
    <div class="field" style="margin-top:12px"><label for="ai-out">Kết quả</label><textarea id="ai-out" style="min-height:140px" placeholder="Chọn một cách sửa ở trên."></textarea></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn" id="ai-again" disabled>Thử cách khác</button><button class="btn primary" id="ai-ok" disabled>Thay vào bài</button></div>`, 'dialog');
  box.classList.add('wide');
  const out = box.querySelector('#ai-out'), again = box.querySelector('#ai-again'), ok = box.querySelector('#ai-ok');
  const run = async () => {
    if (AC.textApiOn(S)) {
      out.value = 'AI đang viết…'; out.disabled = true; again.disabled = true; ok.disabled = true;
      const ins = st.op === 'custom' ? st.ins : st.n ? `${AC.AI_OPS[st.op]}; viết khác các lần trước (lần ${st.n + 1})` : '';
      try { out.value = await textCall(AC.rewriteJob(S, src, ins ? 'custom' : st.op, ins), 1500, true); again.disabled = false; ok.disabled = false; }
      catch (e) { out.value = ''; toast('AI không sửa được: ' + e.message, 'bad'); }
      finally { out.disabled = false; }
      box.querySelectorAll('[data-aiop]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.aiop === st.op)));
      return;
    }
    const r = AC.aiRewrite(src, st.op, { n: st.n, instruction: st.ins, cta: (AC.snippetsFor(S, aiCtxOf(ta), 'cta')[st.n] || {}).text });
    if (!r.ok) return toast(r.error, 'bad');
    out.value = r.text; again.disabled = false; ok.disabled = false;
    box.querySelectorAll('[data-aiop]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.aiop === st.op || (st.op === 'custom' && r.ops.includes(x.dataset.aiop)))));
  };
  box.addEventListener('click', e => {
    const o = e.target.closest('[data-aiop]'); if (!o) return;
    st.op = o.dataset.aiop; st.n = 0; st.ins = box.querySelector('#ai-ins').value;
    if (st.op === 'custom' && !st.ins.trim()) return toast('Gõ yêu cầu trước.', 'bad');
    run();
  });
  box.querySelector('#ai-ins').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); box.querySelector('[data-aiop="custom"]').click(); } });
  again.addEventListener('click', () => { st.n++; run(); });
  ok.addEventListener('click', () => { const v = out.value; closeLayer(); mdReplace(ta, a, b, v, a, a + v.length); toast('Đã thay đoạn. Ctrl+Z để hoàn tác.'); });
};

ACTIONS['ai-hooks'] = el => {
  const ta = mdTa(el.dataset.for, true); if (!ta) return;
  if (!ta.value.trim()) return toast('Viết vài câu trước để có ý chính.', 'bad');
  const ctx = aiCtxOf(ta); const st = { tab: 'hook', n: 0, pick: 0 };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Trợ lý viết ${aiNote()}</span><h2>Phương án hook và caption</h2><p class="small muted">Hook thay câu mở đầu, giữ phần còn lại. Caption thay cả bài (Ctrl+Z để quay lại). Loại hook đã chọn được ghi vào slot để sau này so với số liệu.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="seg" role="tablist"><button role="tab" data-ht="hook" aria-selected="true">5 hook</button><button role="tab" data-ht="caption" aria-selected="false">3 caption</button></div>
    <div id="hk-list" class="hk-list" role="radiogroup"></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn" id="hk-more">Thử bộ khác</button><button class="btn primary" id="hk-ok">Dùng phương án này</button></div>`, 'dialog');
  box.classList.add('wide');
  // AI thật: mỗi tab, mỗi lượt "Thử bộ khác" gọi AI một lần rồi nhớ lại
  const cache = {};
  const list = () => {
    if (!AC.textApiOn(S)) return Promise.resolve(st.tab === 'hook' ? AC.hookOptions(ta.value, { n: st.n }) : AC.captionOptions(S, ta.value, Object.assign({ n: st.n }, ctx)));
    const k = `${st.tab}|${st.n}`; if (cache[k]) return cache[k];
    const job = st.tab === 'hook' ? AC.hooksJob(S, ta.value) : AC.captionsJob(S, ta.value, ctx);
    if (st.n) job.user += `\n\nLượt ${st.n + 1}: viết khác các lượt trước.`;
    cache[k] = textCall(job, 2000, true).then(raw => { const r = st.tab === 'hook' ? AC.parseHooks(raw) : AC.parseCaptions(raw); if (!r.ok) throw new Error(r.error); return r.hooks || r.captions; })
      .catch(e => { delete cache[k]; toast('AI không viết được: ' + e.message, 'bad'); return []; });
    return cache[k];
  };
  let shown = [];
  const paint = async () => {
    const lb = box.querySelector('#hk-list'); if (AC.textApiOn(S)) lb.innerHTML = '<p class="small muted" style="padding:12px">AI đang viết…</p>';
    const L = await list(); shown = L; st.pick = Math.max(0, Math.min(st.pick, L.length - 1));
    box.querySelector('#hk-list').innerHTML = L.map((h, k) => `<button class="hk-opt" role="radio" aria-checked="${k === st.pick}" data-hk="${k}"><span class="chip-col">${esc(h.label)}</span><span class="hk-text">${esc(h.text)}</span></button>`).join('');
    box.querySelectorAll('[data-ht]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.ht === st.tab)));
  };
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-ht]'); if (t) { st.tab = t.dataset.ht; st.pick = 0; paint(); return; }
    const o = e.target.closest('[data-hk]'); if (o) { st.pick = Number(o.dataset.hk); paint(); }
  });
  box.querySelector('#hk-more').addEventListener('click', () => { st.n++; paint(); });
  box.querySelector('#hk-ok').addEventListener('click', () => {
    const h = shown[st.pick]; if (!h) return; closeLayer();
    if (st.tab === 'hook') { aiReplaceAll(ta, AC.replaceHook(ta.value, h.text)); if ((ta.id === 'pv-edit' || ta.classList.contains('pv-seg')) && pvCtx) pvCtx.hookKind = h.kind; toast(`Đã dùng hook “${h.label}”. Lưu bản sửa để giữ.`); }
    else { aiReplaceAll(ta, h.text); toast(`Đã dùng caption ${h.label.toLowerCase()}. Ctrl+Z để quay lại.`); }
  });
  paint();
};

ACTIONS['snip'] = el => {
  const ta = mdTa(el.dataset.for); if (!ta) return;
  const ctx = aiCtxOf(ta); const pos = [ta.selectionStart, ta.selectionEnd];
  const scope = x => [x.columnId ? colName(x.columnId) : '', x.channelId ? chName(x.channelId) : ''].filter(Boolean).join(' · ') || 'Dùng chung';
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Thư viện</span><h2>Chèn hashtag hoặc lời kêu gọi</h2><p class="small muted">Mục hợp với Cột và kênh của bài xếp trước. Bấm để chèn vào chỗ con trỏ (hoặc cuối bài). Quản lý ở Setup → Hashtag &amp; CTA.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="field"><label for="sn-q">Tìm</label><input id="sn-q" placeholder="Gõ để lọc"></div>
    <div id="sn-list" class="stack" style="gap:12px;margin-top:8px"></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Đóng</button></div>`, 'dialog');
  const paint = () => {
    const q = box.querySelector('#sn-q').value;
    box.querySelector('#sn-list').innerHTML = [['hashtag', 'Hashtag'], ['cta', 'Lời kêu gọi (CTA)']].map(([k, lab]) => {
      const L = AC.snippetsFor(S, ctx, k, q);
      return `<section class="stack" style="gap:6px"><h3 class="small">${lab}</h3>${L.length ? L.map(x => `<button class="sn-opt" data-sn="${esc(x.id)}"><span>${esc(x.text)}</span><span class="small faint">${esc(scope(x))}${x.uses ? ` · đã dùng ${x.uses}` : ''}</span></button>`).join('') : '<p class="small muted">Không có mục hợp.</p>'}</section>`;
    }).join('');
  };
  box.querySelector('#sn-q').addEventListener('input', paint);
  box.addEventListener('click', e => {
    const o = e.target.closest('[data-sn]'); if (!o) return;
    const x = AC.useSnippet(S, o.dataset.sn); if (!x) return; save();
    closeLayer();
    const v = ta.value; let [a, b] = pos; if (a === 0 && b === 0 && v.length) { a = b = v.replace(/\s+$/, '').length; }
    const before = v.slice(0, a), sep = !before ? '' : /\n\s*$/.test(before) ? '' : x.kind === 'hashtag' && !/\n/.test(before.slice(-1)) && a === v.replace(/\s+$/, '').length ? '\n\n' : ' ';
    const ins = sep + x.text; mdReplace(ta, a, b, ins, a + ins.length);
    toast(`Đã chèn ${x.kind === 'hashtag' ? 'hashtag' : 'lời kêu gọi'}.`);
  });
  paint();
};

// ---------- Setup → Hashtag & CTA ----------
function snippetsTab() {
  const d = view.snDraft || (view.snDraft = { kind: 'hashtag', text: '', columnId: '', channelId: '' });
  const rows = AC.snippetsOf(S);
  const sel = (id, list, cur, all) => `<select id="${id}" data-change="sn-d" data-k="${id.slice(5)}"><option value="">${all}</option>${list.map(x => `<option value="${esc(x.id)}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
  return `<p class="muted">Hashtag và lời kêu gọi (CTA) dùng lại khi viết bài: nút “# CTA” trên thanh soạn bài chèn mục hợp với Cột và kênh của bài; Phương án caption cũng lấy từ đây.</p>
    <section class="card stack"><h3>Thêm mục</h3>
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="field"><label for="sn-d-kind">Loại</label><select id="sn-d-kind" data-change="sn-d" data-k="kind"><option value="hashtag" ${d.kind === 'hashtag' ? 'selected' : ''}>Hashtag</option><option value="cta" ${d.kind === 'cta' ? 'selected' : ''}>Lời kêu gọi</option></select></div>
        <div class="field" style="flex:1;min-width:240px"><label for="sn-d-text">${d.kind === 'hashtag' ? 'Hashtag (cách nhau dấu cách)' : 'Câu kêu gọi'}</label><input id="sn-d-text" maxlength="200" value="${esc(d.text)}" data-input="sn-d" data-k="text" placeholder="${d.kind === 'hashtag' ? '#MeoTiengAnh #TiengAnhCongSo' : 'Lưu bài để làm theo nhé.'}"></div>
        <div class="field"><label for="sn-d-columnId">Cột</label>${sel('sn-d-columnId', S.columns, d.columnId, 'Mọi Cột')}</div>
        <div class="field"><label for="sn-d-channelId">Kênh</label>${sel('sn-d-channelId', S.channels, d.channelId, 'Mọi kênh')}</div>
        <button class="btn primary" data-act="sn-add">${icon('plus')} Thêm</button>
      </div><span class="err" id="sn-err" role="alert"></span></section>
    ${[['hashtag', 'Hashtag'], ['cta', 'Lời kêu gọi (CTA)']].map(([k, lab]) => { const L = rows.filter(x => x.kind === k); return `<section class="stack"><h3>${lab} <span class="small faint">${L.length}</span></h3>${L.length ? `<div class="sn-table">${L.map(x => `<div class="sn-row"><span class="sn-t">${esc(x.text)}</span><span class="small muted">${esc(x.columnId ? colName(x.columnId) : 'Mọi Cột')} · ${esc(x.channelId ? chName(x.channelId) : 'Mọi kênh')}</span><span class="small faint">${x.uses ? `đã dùng ${x.uses}` : 'chưa dùng'}</span><button class="btn sm ghost danger" data-act="sn-del" data-id="${esc(x.id)}" aria-label="Xoá ${esc(x.text)}">Xoá</button></div>`).join('')}</div>` : '<p class="small muted">Chưa có mục nào.</p>'}</section>`; }).join('')}`;
}
INPUTS['sn-d'] = el => { if (view.snDraft) view.snDraft[el.dataset.k] = el.value; };
CHANGES['sn-d'] = el => { if (!view.snDraft) return; view.snDraft[el.dataset.k] = el.value; if (el.dataset.k === 'kind') render(); };
ACTIONS['sn-add'] = () => {
  const d = view.snDraft; if (!d) return;
  const r = AC.saveSnippet(S, d); if (!r.ok) { const e = $('#sn-err'); if (e) e.textContent = r.error; return; }
  view.snDraft = { kind: d.kind, text: '', columnId: d.columnId, channelId: d.channelId }; commit('Đã thêm vào thư viện.');
};
ACTIONS['sn-del'] = el => { const r = AC.deleteSnippet(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã xoá.'); };
