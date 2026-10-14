// ---------- UI · Xuất (SCR-11) — R4: gói ZIP của tuần đã chốt ----------
// Tải mảng byte về máy: trong trình xem artifact dùng quyền downloads (người xem xác nhận); mở tệp HTML trực tiếp thì dùng liên kết tải
let dlCap = null;
function downloadsCap() {
  if (!dlCap) dlCap = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
  return dlCap;
}
async function downloadBytes(name, bytes, mime) {
  const dl = await downloadsCap();
  if (dl) {
    try { await dl.save({ filename: name, data: new Blob([bytes]) }); toast(`Đã lưu ${name}.`); }
    catch (e) { const c = e && e.code; if (c !== 'declined') toast(c === 'rate_limited' ? 'Đang có một hộp lưu tệp mở; thử lại sau.' : 'Trang này chưa được phép lưu tệp.', 'bad'); }
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Đang tải ${name}.`);
  } catch (e) { toast('Trình duyệt không cho tải tệp từ trang này.', 'bad'); }
}
function fileSize(n) { return n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`; }
RENDERERS.export = () => {
  const w = curWeek();
  if (!w) return `<div class="page-head"><div><span class="eyebrow">Export · ${esc(AC.weekLabelOf(curStart()).range)}</span><h1>Chưa lập tuần</h1></div></div><div class="empty"><p>Tuần này chưa có slot nên chưa có gì để xuất.</p><button class="btn primary" data-act="nav" data-screen="week">Về Dashboard</button></div>`;
  const l = AC.weekLabel(w);
  const rows = AC.weekSlots(S, w.id);
  const confirmed = w.status === 'CONFIRMED';
  const pack = confirmed ? AC.buildExportFiles(S, w.id) : null;
  const total = pack ? pack.files.reduce((n, f) => n + f.bytes.length, 0) : 0;
  const groups = pack ? [['Lịch', p => /^schedule|^metrics/.test(p)], ['Nội dung slot', p => p.startsWith('slots/')], ['Ảnh và video', p => p.startsWith('assets/')], ['Ma trận, Topic, manifest', p => /^(matrix|topics|manifest)/.test(p)]].map(([label, fn]) => { const fs = pack.files.filter(f => fn(f.path)); return { label, n: fs.length, size: fs.reduce((k, f) => k + f.bytes.length, 0) }; }) : [];
  return `<div class="page-head"><div><span class="eyebrow">Export · ${esc(l.range)}</span><h1>${confirmed ? esc(pack.name) : 'schedule.csv'}</h1><p class="sub">${confirmed ? `Tuần đã chốt, bản ${w.revision} · ${pack.files.length} tệp · ${fileSize(total)}` : 'Tuần chưa chốt: chỉ xem trước.'}</p></div>
      <button class="btn primary" data-act="export-zip" ${confirmed ? '' : 'disabled title="Xác nhận lịch trước"'}>${icon('export')} Tải gói ZIP</button></div>
    ${confirmed ? `<div class="note good">Gói gồm schedule.csv, schedule.json, mỗi slot một tệp .md, matrix.md, topics.md, metrics.csv, thư mục assets/ (ảnh, video tải lên giữ nguyên tệp; ảnh mô phỏng ghi .svg) và manifest.json có sha256 từng tệp.</div>
      <div class="kchips">${groups.map(g => `<span class="kchip"><b>${g.n}</b> ${esc(g.label)} · ${fileSize(g.size)}</span>`).join('')}</div>`
    : `<div class="note warn row" style="justify-content:space-between"><span>Chưa chốt · xem trước. Xuất chính thức chỉ khi tuần đã Xác nhận lịch.</span><button class="btn sm" data-act="nav" data-screen="week">Về Dashboard</button></div>`}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>week</th><th>revision</th><th>date</th><th>time</th><th>channel</th><th>format</th><th>column</th><th>topic</th><th>status</th><th>publish</th><th>url</th></tr></thead><tbody>
      ${rows.map(s => { const c = s.sourceCellId ? AC.byId(S.cells, s.sourceCellId) : null; const row = c ? AC.byId(S.topics, c.topicId) : null; const ci = AC.slotColumnId(S, s);
        return `<tr class="mono small"><td>${esc(l.iso)}</td><td>${w.revision}</td><td>${esc(s.date)}</td><td>${esc(s.time)}</td><td>${esc(chName(s.channelId))}</td><td>${esc(fmtName(s.formatId))}</td><td>${ci ? esc(colName(ci)) : ''}</td><td>${row ? `Topic ${row.order}` : ''}</td><td>${esc(s.state)}</td><td>${esc(s.pub ? s.pub.mode : AC.channelPublish(S, s.channelId).mode)}</td><td class="ellip">${s.pub && s.pub.url ? esc(s.pub.url) : ''}</td></tr>`; }).join('')}
    </tbody></table></div>`;
};
ACTIONS['export-zip'] = () => {
  const w = curWeek(); if (!w || w.status !== 'CONFIRMED') return toast('Xác nhận lịch trước khi xuất.', 'bad');
  const r = AC.buildExportFiles(S, w.id); if (!r.ok) return toast(r.error, 'bad');
  downloadBytes(r.name, AC.zipFiles(r.files, S.settings.demoNow), 'application/zip');
};
