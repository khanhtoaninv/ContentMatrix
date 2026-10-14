// ---------- UI · Skill (bộ chỉ dẫn) của Cột và Format (mục 10.49) ----------
// Soạn trong Setup; lưu trong chính Cột/Format (đi theo Sao lưu). Tại thời điểm gen chỉ dùng đúng 1 Skill đang chọn.
const skillOwner = (kind, id) => AC.byId(kind === 'fmt' ? S.formats : S.columns, id);
function skillButtonHtml(kind, o) {
  const a = AC.activeSkill(o), n = AC.skillsOf(o).length;
  return `<div class="field"><label>Skill (bộ chỉ dẫn cho AI)</label><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="skill-open" data-kind="${kind}" data-id="${esc(o.id)}">Quản lý Skill (${n})</button><span class="small muted">${a ? `Đang dùng: ${esc(a.name)} v${a.version}` : 'Chưa chọn Skill: AI dùng hướng dẫn ở trên'}</span></div><span class="hint">Mỗi lần gen chỉ dùng đúng 1 Skill; chọn Skill khác thì gen lần sau dùng Skill đó. Skill thay cho "Hướng dẫn" ở trên. Quy tắc cứng (độ dài, CTA, từ cấm) luôn thắng Skill.</span></div>`;
}
function skillSystemText() { return AC.aiSystem(S).split('\n\nTrả lời bằng')[0]; }
function openSkillLayer(kind, id, editId) {
  const o = skillOwner(kind, id); if (!o) return;
  const what = kind === 'fmt' ? 'Format' : 'Cột';
  const list = AC.skillsOf(o), a = AC.activeSkill(o);
  const edit = editId === 'new' ? { id: '', name: '', body: '', note: '', version: 0, history: [] } : list.find(s => s.id === editId);
  const reopen = e => { closeLayer(); openSkillLayer(kind, id, e); };
  let html;
  if (edit) {
    html = `<header><div><span class="eyebrow">${what} ${esc(o.name)}</span><h2>${edit.id ? `Sửa Skill (đang ở v${edit.version})` : 'Skill mới'}</h2></div><button class="btn icon ghost" data-x="back" aria-label="Quay lại">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="sk-name">Tên Skill</label><input id="sk-name" value="${esc(edit.name)}" placeholder="Ví dụ: Carousel 7 slide, giọng gần gũi"></div>
      <div class="field"><label for="sk-body">Nội dung (Markdown). Gợi ý khung: Dùng khi · Mục tiêu bài · Cấu trúc · Giọng và nhịp câu · Nên / Không nên · 3–5 bài mẫu trong &lt;example&gt;…&lt;/example&gt; · Nguồn của quy tắc</label><textarea id="sk-body" spellcheck="false" style="min-height:320px">${esc(edit.body)}</textarea><span class="hint" id="sk-warn" role="status"></span></div>
      <div class="field"><label for="sk-note">Ghi chú / nguồn (không gửi cho AI)</label><input id="sk-note" value="${esc(edit.note)}"></div>
      ${(edit.history || []).length ? `<div class="field"><label>Bản cũ (giữ ${AC.SKILL_KEEP} bản gần nhất)</label>${edit.history.map(h => `<div class="row" style="gap:8px"><span class="small">v${h.version} · ${esc(h.name)}</span><button class="btn sm" data-x="restore" data-v="${h.version}">Khôi phục (thành bản mới)</button></div>`).join('')}</div>` : ''}
      <span class="err" id="sk-err" role="alert"></span>
      <div class="actions"><button class="btn" data-x="back">Hủy</button><button class="btn" data-x="peek">Xem AI sẽ đọc gì</button><button class="btn primary" data-x="save">Lưu</button></div>
    </div>`;
  } else {
    html = `<header><div><span class="eyebrow">Skill của ${what}</span><h2>${esc(o.name)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <p class="small muted">Nạp được nhiều Skill; tại thời điểm gen chỉ dùng đúng 1 Skill đang chọn. Chọn "Không dùng Skill" để quay về hướng dẫn mặc định.</p>
      <div class="stack" role="radiogroup" aria-label="Skill đang dùng" style="gap:8px">
        <label class="check"><input type="radio" name="sk-pick" value="" ${!a ? 'checked' : ''}> Không dùng Skill (hướng dẫn mặc định)</label>
        ${list.map(s => `<div class="citem"><label class="check"><input type="radio" name="sk-pick" value="${esc(s.id)}" ${a && a.id === s.id ? 'checked' : ''}> <b>${esc(s.name)}</b> <span class="small muted">v${s.version}${s.note ? ' · ' + esc(s.note) : ''}</span></label>
          <div class="row"><button class="btn sm" data-x="edit" data-sid="${esc(s.id)}">Sửa</button><button class="btn sm ghost danger" data-x="del" data-sid="${esc(s.id)}">Xóa</button></div></div>`).join('')}
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-x="new">${icon('plus')} Thêm Skill</button><button class="btn" data-x="peek">Xem AI sẽ đọc gì</button><button class="btn" data-x="blind">Xuất để so mù</button></div>
      <span class="hint">"Xuất để so mù" gom các bài AI đã viết cho ${what} này, có Skill và không Skill, xáo trộn thành tệp để bạn chấm không biết bài nào dùng Skill.</span>
    </div>`;
  }
  const box = openLayer(html, 'drawer', b => {
    const warn = () => { const w = $('#sk-warn', b); if (w) w.textContent = AC.skillWarnings($('#sk-body', b).value).join(' '); };
    warn(); const ta = $('#sk-body', b); if (ta) ta.addEventListener('input', warn);
    b.addEventListener('change', e => { if (e.target.name === 'sk-pick') { AC.setActiveSkill(o, e.target.value); save(); render(); toast(e.target.value ? 'Đã chọn Skill. Gen lần sau sẽ dùng Skill này.' : 'Đã tắt Skill. Gen lần sau dùng hướng dẫn mặc định.'); } });
    b.addEventListener('click', async e => {
      const x = e.target.closest('[data-x]'); if (!x) return; const k = x.dataset.x;
      if (k === 'back') return reopen(null);
      if (k === 'new') return reopen('new');
      if (k === 'edit') return reopen(x.dataset.sid);
      if (k === 'del') {
        const s = list.find(v => v.id === x.dataset.sid);
        if (!(await confirmBox({ title: 'Xóa Skill?', body: `Xóa "${esc(s.name)}" cùng các bản cũ. Bài đã viết không đổi.`, ok: 'Xóa', danger: true }))) return;
        AC.deleteSkill(o, s.id); save(); render(); return reopen(null);
      }
      if (k === 'restore') { const r = AC.restoreSkill(S, o, edit.id, +x.dataset.v); if (!r.ok) return toast(r.error, 'bad'); save(); render(); return reopen(edit.id); }
      if (k === 'peek') {
        const body = edit ? $('#sk-body', b).value : (a ? a.body : '');
        const name = edit ? ($('#sk-name', b).value || 'Skill') : (a ? a.name : '');
        const tmp = { name: o.name, layout: o.layout, activeSkillId: 'p', skills: [{ id: 'p', name, version: edit ? edit.version + 1 : (a ? a.version : 1), body }] };
        const txt = body.trim() ? `${skillSystemText()}\n\n${AC.skillBlock(tmp, `Chỉ dẫn viết cho ${what} "${o.name}"`)}` : `${skillSystemText()}\n\n(Không dùng Skill: AI đọc hướng dẫn mặc định của ${what}.)`;
        const pb = openLayer(`<header><div><span class="eyebrow">AI sẽ đọc</span><h2>Phần chỉ dẫn gửi kèm mỗi lần gen</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header><div class="body"><p class="small muted">Gồm hướng dẫn chung, Hồ sơ thương hiệu, Giọng văn và Skill. Phần Topic, bài gốc, quy tắc cứng được ghép thêm lúc gen.</p><pre class="small" style="white-space:pre-wrap;max-height:60vh;overflow:auto">${esc(txt)}</pre></div>`, 'dialog'); pb.classList.add('wide'); return;
      }
      if (k === 'blind') return skillBlindExport(kind, o);
      if (k === 'save') {
        const v = { name: $('#sk-name', b).value, body: $('#sk-body', b).value, note: $('#sk-note', b).value };
        const r = edit.id ? AC.updateSkill(S, o, edit.id, v) : AC.addSkill(S, o, v);
        if (!r.ok) { $('#sk-err', b).textContent = r.error; return; }
        save(); render(); toast(edit.id ? `Đã lưu Skill (v${r.skill.version}).` : 'Đã thêm Skill.'); return reopen(null);
      }
    });
  });
  return box;
}
ACTIONS['skill-open'] = el => openSkillLayer(el.dataset.kind, el.dataset.id, null);
// Gom bài AI của Cột/Format, trộn bài có Skill và không Skill, xuất tệp chấm mù kèm đáp án ở cuối
function skillBlindExport(kind, o) {
  const items = [];
  if (kind === 'fmt') S.slots.filter(s => s.formatId === o.id).forEach(s => (s.history || []).forEach(h => { if (h.ai && h.text) items.push({ text: h.text, ref: h.ai.skill || null, where: `${s.date} ${s.time}` }); }));
  else S.cells.filter(c => c.columnId === o.id).forEach(c => c.gens.forEach(g => { if (g.ai && g.text) items.push({ text: g.text, ref: g.ai.skill || null, where: c.id }); }));
  const withS = items.filter(i => i.ref).slice(-6), without = items.filter(i => !i.ref).slice(-6);
  if (!withS.length || !without.length) return toast('Cần có cả bài AI viết có Skill và không Skill. Hãy gen vài lần với Skill, rồi tắt Skill gen vài lần nữa.', 'bad');
  const all = withS.concat(without).map(i => ({ i, r: Math.random() })).sort((x, y) => x.r - y.r).map(x => x.i);
  const md = [`# So mù · ${o.name}`, '', 'Chấm từng bài 1–5 (đọc đúng, giọng, bố cục, hay) mà chưa mở phần Đáp án ở cuối.', '',
    ...all.map((i, n) => `## Bài ${n + 1}\n\n${i.text}\n\nĐiểm của bạn: ___\n`), '---', '', '## Đáp án (đừng mở trước khi chấm)', '',
    ...all.map((i, n) => `- Bài ${n + 1}: ${i.ref ? `có Skill "${i.ref.name}" v${i.ref.version}` : 'không Skill'} (${i.where})`)].join('\n');
  downloadBytes(`so-mu-${o.id}.md`, new TextEncoder().encode(md), 'text/markdown');
}
// Quy tắc viết chung (thay đoạn cố định trong lời nhắn hệ thống): để trống thì không thêm gì
function writingRulesSection() {
  return `<section class="panel stack" style="margin-top:12px"><h2>Quy tắc viết chung</h2><p class="small muted">Áp cho mọi lần AI viết, mọi Cột và Format (ví dụ: tránh câu sáo kiểu máy viết, cách xưng hô). Để trống nếu không cần. Nên ngắn; quy tắc riêng của từng Cột/Format đặt trong Skill của chúng.</p>
    <div class="field"><label for="wr-text">Quy tắc viết chung</label><textarea id="wr-text" style="min-height:140px" data-input="writing-rules">${esc(S.settings.writingRules || '')}</textarea><span class="hint" id="wr-saved">Tự lưu khi gõ</span></div></section>`;
}
INPUTS['writing-rules'] = el => { S.settings.writingRules = el.value; save(); };
