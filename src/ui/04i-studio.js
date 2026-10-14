// ---------- UI · Kho tài sản, soạn carousel, chuyển bài sang kênh (mục 10.37) ----------
// Ảnh vào kho: nén JPEG cạnh dài ≤1600px (PNG có nền trong suốt giữ PNG ≤1200px) để đỡ tốn bộ nhớ trình duyệt
function readImageFile(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return rej(new Error('Chỉ nhận ảnh PNG, JPEG, WebP hoặc GIF.'));
    const rd = new FileReader();
    rd.onerror = () => rej(new Error('Không đọc được tệp.'));
    rd.onload = async () => {
      try {
        const img = await loadImg(rd.result); const png = file.type === 'image/png';
        const k = Math.min(1, (png ? 1200 : 1600) / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); const g = c.getContext('2d');
        if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        res({ src: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height });
      } catch (e) { rej(e); }
    };
    rd.readAsDataURL(file);
  });
}
async function addFilesToLibrary(files, tags) {
  let ok = 0; const errs = [];
  for (const f of files) {
    try { const d = await readImageFile(f); const r = AC.addLibraryItem(S, Object.assign(d, { name: f.name.replace(/\.\w+$/, ''), tags })); if (r.ok) ok++; else errs.push(r.error); }
    catch (e) { errs.push(`${f.name}: ${e.message}`); }
  }
  save(); return { ok, errs };
}
// Ảnh đang dùng của ô thành data URL (ảnh mô phỏng vẽ ra JPEG)
async function versionToDataUrl(v) {
  if (v.src) return v.src;
  const img = await loadImg(versionImgSrc(v)); const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
  const g = c.getContext('2d'); drawCover(g, img, 0, 0, 1200, 800); return c.toDataURL('image/jpeg', 0.85);
}
const libGrid = (list, act) => list.length ? `<div class="lib-grid">${list.map(x => `<button class="lib-item" data-${act}="${esc(x.id)}" title="${esc(x.name)}"><img src="${esc(x.src)}" alt="" loading="lazy"><span class="small"><b>${esc(x.name)}</b>${x.tags.length ? `<br><span class="faint">${esc(x.tags.map(t => '#' + t).join(' '))}</span>` : ''}</span></button>`).join('')}</div>` : '<p class="small muted">Không có ảnh hợp.</p>';

// ---------- Setup → Kho tài sản ----------
function libraryTab() {
  const q = view.libQ || '', tag = view.libTag || ''; const list = AC.libraryFind(S, q, tag); const tags = AC.libraryTags(S); const u = storeUse();
  return `<p class="muted">Ảnh dùng chung cho mọi bài: logo, ảnh sản phẩm, ảnh đội ngũ, ảnh đã dùng. Trên ảnh của slot bấm <b>Kho</b> để lấy ảnh từ đây. Ảnh được nén khi thêm vào (JPEG cạnh dài tối đa 1600px; PNG giữ nền trong suốt, tối đa 1200px).</p>
    <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:200px"><label for="libt-q">Tìm</label><input id="libt-q" value="${esc(q)}" data-input="lib-q" placeholder="Tên hoặc thẻ"></div>
      <div class="field"><label for="libt-tag">Thẻ</label><select id="libt-tag" data-change="lib-tag"><option value="">Mọi thẻ</option>${tags.map(t => `<option value="${esc(t)}" ${t === tag ? 'selected' : ''}>#${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label for="libt-newtags">Thẻ cho ảnh sắp tải</label><input id="libt-newtags" placeholder="logo, sản phẩm"></div>
      <label class="btn primary" for="libt-up">${icon('upload')} Tải ảnh vào kho</label><input id="libt-up" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple class="sr" data-change="lib-up">
    </div>
    ${AC.libraryOf(S).length ? `<div class="lib-table">${list.map(x => { const n = AC.libraryUses(S, x.id); return `<div class="lib-row"><img src="${esc(x.src)}" alt="" loading="lazy"><div class="field"><label class="sr" for="lib-n-${esc(x.id)}">Tên</label><input id="lib-n-${esc(x.id)}" value="${esc(x.name)}" data-change="lib-edit" data-id="${esc(x.id)}" data-k="name"></div><div class="field"><label class="sr" for="lib-t-${esc(x.id)}">Thẻ</label><input id="lib-t-${esc(x.id)}" value="${esc(x.tags.join(', '))}" placeholder="thẻ, cách nhau dấu phẩy" data-change="lib-edit" data-id="${esc(x.id)}" data-k="tags"></div><span class="small faint">${x.w ? `${x.w}×${x.h} · ` : ''}${n ? `dùng ${n} lần` : 'chưa dùng'}</span><button class="btn sm ghost danger" data-act="lib-del" data-id="${esc(x.id)}" aria-label="Xoá ${esc(x.name)}">Xoá</button></div>`; }).join('') || '<p class="small muted" style="padding:12px">Không có ảnh hợp.</p>'}</div>` : '<div class="empty"><p>Kho đang trống. Tải logo, ảnh sản phẩm hoặc ảnh hay dùng vào đây.</p></div>'}
    <p class="small ${u.pct >= 80 ? 'err' : 'faint'}">Dữ liệu đang lưu trong trình duyệt: khoảng ${fmtNum(Math.round(u.n / 1024))} KB, ${u.pct}% sức chứa ước tính.</p>`;
}
INPUTS['lib-q'] = el => { view.libQ = el.value; clearTimeout(view.libT); view.libT = setTimeout(() => { render(); const i = $('#libt-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
CHANGES['lib-tag'] = el => { view.libTag = el.value; render(); };
CHANGES['lib-up'] = async el => { const tags = ($('#libt-newtags') || {}).value || ''; const r = await addFilesToLibrary([...el.files], tags); render(); toast(`Đã thêm ${r.ok} ảnh vào kho.${r.errs.length ? ' ' + r.errs.join(' ') : ''}`, r.errs.length ? 'bad' : undefined); };
CHANGES['lib-edit'] = el => { const r = AC.updateLibraryItem(S, el.dataset.id, { [el.dataset.k]: el.value }); if (!r.ok) return toast(r.error, 'bad'); save(); render(); };
ACTIONS['lib-del'] = async el => {
  const it = AC.libraryOf(S).find(x => x.id === el.dataset.id); if (!it) return;
  if (!(await confirmBox({ title: 'Xoá ảnh khỏi kho?', body: `<p>Xoá “${esc(it.name)}” khỏi kho. Các slot đã dùng ảnh này vẫn giữ ảnh.</p>`, ok: 'Xoá', danger: true }))) return;
  AC.deleteLibraryItem(S, it.id); commit('Đã xoá ảnh khỏi kho.');
};

// ---------- Soạn carousel theo slide ----------
function openCarouselEditor(s, onDone) {
  const p = AC.carouselParse(s.text); const slideAssets = s.assets.filter(a => /^Slide\s*\d+/i.test(a.name));
  const st = { lead: p.lead, slides: p.slides.map((t, k) => ({ text: t, from: k })) };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Soạn carousel · ${esc(fmtFull(s.formatId))}</span><h2>Soạn từng slide</h2><p class="small muted">Mỗi thẻ là một slide: sửa chữ, đổi thứ tự (ảnh đi theo slide), thêm hoặc bỏ slide. Lưu tạo bản sửa mới của slot.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="field"><label for="car-lead">Chú thích bài (trước các slide, không bắt buộc)</label><textarea id="car-lead" rows="2">${esc(st.lead)}</textarea></div>
    <div class="car-strip" id="car-strip" role="list"></div>
    <div class="actions"><span class="small muted" id="car-count" style="margin-right:auto"></span><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="car-ok">Lưu carousel</button></div>`, 'dialog');
  box.classList.add('wide', 'car-dialog');
  const strip = box.querySelector('#car-strip');
  const paint = () => {
    const n = st.slides.length;
    strip.innerHTML = st.slides.map((x, k) => { const a = x.from != null ? slideAssets[x.from] : null; return `<div class="car-card" role="listitem" aria-label="Slide ${k + 1}">
      <div class="row" style="justify-content:space-between"><b>Slide ${k + 1}/${n}</b><span class="row" style="gap:2px"><button class="btn sm icon ghost" data-car="left" data-k="${k}" ${k ? '' : 'disabled'} aria-label="Đưa slide ${k + 1} lên trước">${icon('left')}</button><button class="btn sm icon ghost" data-car="right" data-k="${k}" ${k < n - 1 ? '' : 'disabled'} aria-label="Đưa slide ${k + 1} ra sau">${icon('right')}</button><button class="btn sm icon ghost" data-car="del" data-k="${k}" ${n > 1 ? '' : 'disabled'} aria-label="Bỏ slide ${k + 1}">${icon('close')}</button></span></div>
      ${a ? imgThumb(a) : '<div class="imgbox empty"><span class="small faint">Ô ảnh mới</span></div>'}
      <label class="sr" for="car-t${k}">Chữ slide ${k + 1}</label><textarea id="car-t${k}" data-k="${k}" rows="5">${esc(x.text)}</textarea></div>`; }).join('') + `<button class="car-add" data-car="add" ${n >= 20 ? 'disabled' : ''}>${icon('plus')}<span>Thêm slide</span></button>`;
    box.querySelector('#car-count').textContent = `${n} slide`;
  };
  strip.addEventListener('input', e => { const k = e.target.dataset.k; if (k != null) st.slides[Number(k)].text = e.target.value; });
  strip.addEventListener('click', e => {
    const b = e.target.closest('[data-car]'); if (!b || b.disabled) return; const k = Number(b.dataset.k); const L = st.slides;
    if (b.dataset.car === 'left') [L[k - 1], L[k]] = [L[k], L[k - 1]];
    if (b.dataset.car === 'right') [L[k + 1], L[k]] = [L[k], L[k + 1]];
    if (b.dataset.car === 'del') L.splice(k, 1);
    if (b.dataset.car === 'add') L.push({ text: '', from: null });
    paint();
    if (b.dataset.car === 'add') { const t = strip.querySelector(`#car-t${L.length - 1}`); if (t) { t.focus(); t.scrollIntoView({ block: 'nearest', inline: 'end' }); } }
  });
  box.querySelector('#car-lead').addEventListener('input', e => { st.lead = e.target.value; });
  box.querySelector('#car-ok').addEventListener('click', () => {
    const r = AC.saveCarouselSlides(S, s.id, st.lead, st.slides); if (!r.ok) return toast(r.error, 'bad');
    closeLayer(); onDone(); toast(`Đã lưu carousel ${r.slides} slide.${r.textChanged ? ' Slot chờ duyệt lại.' : ''}`);
  });
  paint();
}

// ---------- Chuyển bài sang kênh khác (mô phỏng) ----------
function openRepurposeDialog(s) {
  const fmts = S.formats.filter(f => f.id !== s.formatId);
  const st = { formatId: (fmts.find(f => f.channelId !== s.channelId) || fmts[0] || {}).id, date: s.date, time: s.time };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Chuyển bài sang kênh khác ${AI_SIM_NOTE_TXT}</span><h2>Viết lại cho kênh khác</h2><p class="small muted">Tạo một slot tự do mới từ bài này, viết lại theo khung của Format đích (carousel, kịch bản video, bài Blog, bài ngắn). Ảnh đang dùng được chép sang. Slot gốc giữ nguyên.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
      <div class="field" style="flex:1;min-width:240px"><label for="rp-f">Format đích</label><select id="rp-f">${S.channels.map(ch => { const fs = fmts.filter(f => f.channelId === ch.id); return fs.length ? `<optgroup label="${esc(ch.name)}">${fs.map(f => `<option value="${esc(f.id)}" ${f.id === st.formatId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></div>
      <div class="field"><label for="rp-d">Ngày đăng</label><input id="rp-d" type="date" value="${esc(st.date)}"></div>
      <div class="field"><label for="rp-t">Giờ</label><input id="rp-t" type="time" value="${esc(st.time)}"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Bài cho kênh mới (xem trước, sửa được sau khi tạo)</label><div class="rp-prev content-text rich" id="rp-prev"></div></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="rp-ok">Tạo slot mới</button></div>`, 'dialog');
  box.classList.add('wide');
  const paint = () => { const r = AC.convertPost(S, s.text, st.formatId, { columnId: AC.slotColumnId(S, s) }); box.querySelector('#rp-prev').innerHTML = r.ok ? richText(r.text) : `<p class="err">${esc(r.error)}</p>`; };
  box.querySelector('#rp-f').addEventListener('change', e => { st.formatId = e.target.value; paint(); });
  box.querySelector('#rp-d').addEventListener('change', e => { st.date = e.target.value; });
  box.querySelector('#rp-t').addEventListener('change', e => { st.time = e.target.value; });
  box.querySelector('#rp-ok').addEventListener('click', () => {
    const r = AC.repurposeSlot(S, s.id, st); if (!r.ok) return toast(r.error, 'bad');
    closeLayer(); save(); render(); const id = r.slot.id;
    toast(`Đã tạo slot ${fmtFull(r.slot.formatId)} ngày ${AC.dmy(r.slot.date)} ${r.slot.time}.`, undefined, { label: 'Mở', fn: () => { closeAllLayers(); openPreview(id); } });
  });
  paint();
}
