// ---------- Thanh công cụ ảnh gọn: < > Gen Up Store Edit (mục 10.41) ----------
// Gen: tạo lại theo prompt; rê chuột (hoặc focus) hiện nút Prompt nhỏ phía trên. Ô chưa có prompt: Gen mở ô Prompt.
// Store: kho ảnh chung dạng gallery. Edit: giao diện sửa ảnh có các tab Frame, Chữ, Img2Img, Cắt, Mẫu (video: Bìa, Phụ đề).
const ED_TABS_IMG = [['img-frame', 'Frame', 'Ghép frame của công ty kèm tiêu đề lên ảnh'], ['img-text', 'Chữ', 'Thêm chữ lên ảnh: font, cỡ, màu, kéo đặt vị trí'], ['img-i2i', 'Img2Img', 'Biến đổi ảnh theo yêu cầu bằng chữ'], ['img-crop', 'Cắt', 'Cắt, xoay, lật, đổi tỉ lệ ảnh'], ['img-tpl', 'Mẫu', 'Áp mẫu thiết kế đã lưu (chữ và frame)']];
const ED_TABS_VID = [['vid-cover', 'Bìa', 'Chọn ảnh bìa từ khung hình hoặc tải ảnh lên'], ['vid-subs', 'Phụ đề', 'Tạo, sửa phụ đề; tải .srt/.vtt']];

// o: { s, a, i, lk, via: 'pv' (ô Prompt ngay dưới ảnh) | 'dlg' (hộp thoại), open (ô Prompt đang mở), accept, extra, meta }
function imgToolbar(o) {
  const { s, a, i, lk } = o; const ci = a.versions.findIndex(v => v.n === a.current), cur = ci >= 0 ? a.versions[ci] : null;
  const vid = assetKind(a) === 'video' || (cur && cur.kind === 'video');
  const pAttr = o.via === 'pv' ? `data-pv="prompt" data-i="${i}" aria-expanded="${!!o.open}"` : `data-x="img-prompt" data-i="${i}"`;
  const gen = vid
    ? `<span class="gen-wrap"><button class="btn sm" disabled title="Chưa tạo video bằng AI được">${icon('spark')} Gen</button></span>`
    : `<span class="gen-wrap"><button class="btn xs gen-p ${o.open ? 'primary' : ''}" ${pAttr} ${lk ? 'disabled' : ''} title="Sửa prompt ảnh">Prompt</button><button class="btn sm" ${a.prompt ? `data-x="img-gen" data-i="${i}"` : pAttr} ${lk ? 'disabled' : ''} title="${a.prompt ? 'Gen lại: tạo phiên bản ảnh mới từ prompt' : 'Chưa có prompt: bấm để viết prompt rồi Gen'}">${icon('spark')} Gen</button></span>`;
  const cellR = AC.assetRatioOf(a), sz = cur && !vid ? AC.versionSize(cur) : null, bad = !lk && !!sz && AC.ratioMismatch(sz, cellR);
  const acc = o.accept || (s.free || vid ? 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp,image/gif');
  return `<div class="pv-imgtools imgbar" role="toolbar" aria-label="Công cụ ${esc(a.name)}">
    <button class="btn sm icon" data-x="img-prev" data-i="${i}" ${!lk && ci > 0 ? '' : 'disabled'} aria-label="Bản trước">${icon('left')}</button><button class="btn sm icon" data-x="img-next" data-i="${i}" ${!lk && ci >= 0 && ci < a.versions.length - 1 ? '' : 'disabled'} aria-label="Bản sau">${icon('right')}</button>
    ${gen}
    <label class="btn sm ${lk ? 'disabled' : ''}" for="pvup-${o.idp || ''}${i}" title="Tải ${acc.includes('video') ? 'ảnh hoặc video' : 'ảnh'} của bạn lên làm phiên bản mới">${icon('upload')} Up</label><input id="pvup-${o.idp || ''}${i}" type="file" accept="${acc}" class="sr" data-change="img-upload" data-id="${esc(s.id)}" data-i="${i}" ${lk ? 'disabled' : ''}>
    <button class="btn sm" data-x="img-lib" data-i="${i}" ${lk ? 'disabled' : ''} title="Store: chọn ảnh từ kho ảnh chung">${icon('gallery')} Store</button>
    <button class="btn sm" data-x="img-edit" data-i="${i}" ${!lk && cur ? '' : 'disabled'} title="${cur ? (vid ? 'Sửa video: Bìa, Phụ đề' : 'Sửa ảnh: Frame, Chữ, Img2Img, Cắt, Mẫu') : 'Ô chưa có ảnh'}">${icon('edit')} Edit</button>
    ${bad ? `<button class="btn sm warn-b" data-x="img-fit" data-i="${i}" title="Ảnh ${sz.w}×${sz.h} không đúng tỉ lệ ô ${esc(cellR)}: cắt giữa về ${esc(cellR)} (thành phiên bản mới, bản gốc giữ nguyên)">Cắt về ${esc(cellR)}</button>` : ''}
    ${o.extra || ''}
    ${o.meta === false ? '' : `<span class="small pv-imgmeta">${esc(a.name)} · ${cur ? `v${a.current}/${a.versions.length} · ${versionLabel(cur)}` : 'chưa có ảnh'}</span>`}
  </div>`;
}

// Ô Prompt dạng hộp thoại (Cấu hình slot)
function openPromptDialog(s, i) {
  const a = s.assets[i];
  const box = openLayer(`<header><span class="eyebrow">Prompt ảnh · ${esc(a.name)}</span><h2>Sửa prompt</h2><p class="small muted">Mô tả ảnh cần tạo. Gen tạo một phiên bản mới; bản cũ vẫn giữ, bấm mũi tên để quay lại.</p></header>
    <div class="field"><label for="pd-text">Prompt</label><textarea id="pd-text" rows="5" spellcheck="false">${esc(a.prompt || '')}</textarea></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn" id="pd-save">Chỉ lưu prompt</button><button class="btn primary" id="pd-gen">Lưu prompt và Gen</button></div>`, 'dialog');
  const go = gen => {
    const r = AC.setSlotImagePrompt(S, s.id, i, box.querySelector('#pd-text').value); if (!r.ok) return toast(r.error, 'bad');
    if (!gen) { closeLayer(); save(); render(); if (!(pvRefresh && pvRefresh(s.id))) openSlot(s.id); return toast('Đã lưu prompt.'); }
    if (AC.imageApiOn(S)) { closeLayer(); save(); render(); return apiGenImage(s, i); }
    const g = AC.genSlotImage(S, s.id, i); if (!g.ok) return toast(g.error, 'bad');
    afterImageDialog(s, `Đã tạo ảnh phiên bản ${g.version} từ prompt mới.`);
  };
  box.querySelector('#pd-save').addEventListener('click', () => go(false));
  box.querySelector('#pd-gen').addEventListener('click', () => go(true));
}

// ---- Edit: giao diện sửa ảnh có tab ----
function edTabsHtml(a, active) {
  const vid = (curVersion(a) || {}).kind === 'video';
  const tabs = [['home', vid ? 'Video' : 'Ảnh', '']].concat(vid ? ED_TABS_VID : ED_TABS_IMG);
  return `<nav class="ed-tabs" role="tablist" aria-label="Công cụ sửa">${tabs.map(([x, l, t]) => `<button type="button" role="tab" class="ed-tab" data-ed="${x}" aria-selected="${x === active}" ${t ? `title="${esc(t)}"` : ''}>${esc(l)}</button>`).join('')}</nav>`;
}
function edBind(box, s, i) {
  box.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-selected') !== 'true') edGo(s, i, b.dataset.ed); }));
}
async function edGo(s, i, x) {
  closeLayer();
  if (x === 'home') return openImageEditor(s, i);
  const n = layerStack.length;
  await ({ 'img-frame': openFrameDialog, 'img-text': openTextDialog, 'img-crop': openCropDialog, 'img-tpl': openTemplateDialog, 'img-i2i': openI2IDialog, 'vid-cover': openCoverDialog, 'vid-subs': openSubsDialog })[x](s, i);
  if (layerStack.length <= n) return openImageEditor(s, i); // không mở được (ví dụ chưa có mẫu): quay lại trang Edit
  const box = layerStack[layerStack.length - 1].querySelector('[role="dialog"]');
  const nav = document.createElement('div'); nav.innerHTML = edTabsHtml(s.assets[i], x);
  const head = box.querySelector('header'); if (head) head.after(nav.firstElementChild); else box.prepend(nav.firstElementChild);
  box.classList.add('ed-box'); edBind(box, s, i);
}
function openImageEditor(s, i) {
  const a = s.assets[i], v = curVersion(a);
  const lock = AC.slotLockMsg(S, s); if (lock) return toast(lock, 'bad');
  if (!v) return toast('Ô chưa có ảnh để sửa.', 'bad');
  const vid = v.kind === 'video'; const tabs = vid ? ED_TABS_VID : ED_TABS_IMG;
  const noTpl = !vid && !AC.designTemplatesOf(S).length;
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Edit · ${esc(a.name)} · bản v${v.n}/${a.versions.length}</span><h2>${vid ? 'Sửa video' : 'Sửa ảnh'}</h2><p class="small muted">Chọn công cụ ở thanh trên. Mỗi lần xác nhận tạo một phiên bản mới; bản gốc vẫn giữ.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    ${edTabsHtml(a, 'home')}
    <div class="ed-home"><div class="ed-prev">${pvImageBase(a, null)}<span class="small faint">${esc(versionLabel(v))}</span></div>
      <div class="ed-cards">${tabs.map(([x, l, t]) => `<button type="button" class="ed-card" data-ed="${x}"><b>${esc(l)}</b><span class="small muted">${esc(t)}${x === 'img-tpl' && noTpl ? ' · chưa có mẫu: soạn ở Chữ rồi Lưu thành mẫu' : ''}</span></button>`).join('')}</div></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Đóng</button></div>`, 'dialog');
  box.classList.add('wide', 'ed-box'); edBind(box, s, i);
}

// ---- Store: kho ảnh chung dạng gallery ----
function openLibraryPicker(s, i) {
  const a = s.assets[i], v = curVersion(a);
  const st = { q: '', tag: '', unused: false };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Store · ${esc(a.name)}</span><h2>Kho ảnh chung</h2><p class="small muted">Logo, ảnh sản phẩm, ảnh đội ngũ, ảnh đã dùng. Bấm một ảnh để dùng cho ô này (thành phiên bản mới). Quản lý tên, thẻ ở Setup → Kho tài sản.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="gal-bar"><div class="field" style="flex:1;min-width:180px;margin:0"><label class="sr" for="lib-q">Tìm theo tên hoặc thẻ</label><input id="lib-q" type="search" placeholder="Tìm theo tên hoặc thẻ"></div>
      <label class="row small" style="gap:6px"><input type="checkbox" id="lib-unused"> Chưa dùng</label>
      ${v && v.kind !== 'video' ? '<button class="btn sm" id="lib-save">Lưu ảnh đang dùng vào kho</button>' : ''}
      <label class="btn sm primary" for="lib-up">${icon('upload')} Tải ảnh vào kho</label><input id="lib-up" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple class="sr"></div>
    <div id="lib-tags" class="gal-tags"></div>
    <div id="lib-list"></div>
    <div class="actions"><span class="small faint" id="lib-count" style="margin-right:auto"></span><button class="btn ghost" data-act="close-layer">Đóng</button></div>`, 'dialog');
  box.classList.add('wide', 'gal-box');
  const paint = () => {
    const tags = AC.libraryTags(S);
    box.querySelector('#lib-tags').innerHTML = tags.length ? [['', 'Tất cả']].concat(tags.map(t => [t, '#' + t])).map(([t, l]) => `<button type="button" class="chip ${st.tag === t ? 'on' : ''}" data-tag="${esc(t)}" aria-pressed="${st.tag === t}">${esc(l)}</button>`).join('') : '';
    const list = AC.libraryFind(S, st.q, st.tag).map(x => Object.assign({ uses: AC.libraryUses(S, x.id) }, x)).filter(x => !st.unused || !x.uses).reverse();
    box.querySelector('#lib-count').textContent = `${list.length}/${AC.libraryOf(S).length} ảnh`;
    box.querySelector('#lib-list').innerHTML = !AC.libraryOf(S).length ? '<div class="gal-empty"><p class="muted">Kho đang trống.</p><p class="small faint">Tải ảnh vào kho, hoặc lưu ảnh đang dùng để dùng lại cho bài khác.</p></div>'
      : list.length ? `<div class="gal-grid">${list.map(x => `<div class="gal-tile"><button type="button" class="gal-use" data-lib="${esc(x.id)}" title="Dùng ảnh “${esc(x.name)}” cho ô này"><img src="${esc(x.src)}" alt="${esc(x.name)}" loading="lazy"><span class="gal-cap"><b>${esc(x.name)}</b><span>${x.uses ? `dùng ${x.uses} lần` : 'chưa dùng'}${x.w ? ` · ${x.w}×${x.h}` : ''}</span></span><span class="gal-hover">Dùng ảnh này</span></button><button type="button" class="gal-zoom btn icon xs" data-zoom="${esc(x.id)}" aria-label="Xem lớn ${esc(x.name)}">${icon('eye')}</button></div>`).join('')}</div>`
      : '<p class="small muted">Không có ảnh hợp.</p>';
  };
  box.querySelector('#lib-q').addEventListener('input', e => { st.q = e.target.value; paint(); });
  box.querySelector('#lib-unused').addEventListener('change', e => { st.unused = e.target.checked; paint(); });
  box.querySelector('#lib-up').addEventListener('change', async e => { const r = await addFilesToLibrary([...e.target.files]); paint(); toast(`Đã thêm ${r.ok} ảnh vào kho.${r.errs.length ? ' ' + r.errs.join(' ') : ''}`, r.errs.length ? 'bad' : undefined); });
  const sv = box.querySelector('#lib-save');
  if (sv) sv.addEventListener('click', async () => {
    try { const src = await versionToDataUrl(v); const r = AC.addLibraryItem(S, { name: `${a.name} v${v.n}`, src }); if (!r.ok) return toast(r.error, 'bad'); save(); paint(); toast('Đã lưu ảnh vào kho.'); }
    catch (e) { toast('Không lưu được ảnh: ' + e.message, 'bad'); }
  });
  box.addEventListener('click', e => {
    const tg = e.target.closest('[data-tag]'); if (tg) { st.tag = tg.dataset.tag; return paint(); }
    const z = e.target.closest('[data-zoom]'); if (z) return libZoom(s, i, z.dataset.zoom);
    const o = e.target.closest('[data-lib]'); if (!o) return;
    if (a && assetKind(a) === 'video' && v) return toast('Kho chỉ chứa ảnh; ô này đang là video.', 'bad');
    const r = AC.useLibraryItem(S, s.id, i, o.dataset.lib); if (!r.ok) return toast(r.error, 'bad');
    afterImageDialog(s, `Đã dùng ảnh từ kho, thành phiên bản ${r.version}.`);
  });
  paint();
}
function libZoom(s, i, id) {
  const x = AC.libraryOf(S).find(y => y.id === id); if (!x) return;
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Store</span><h2>${esc(x.name)}</h2><p class="small muted">${x.tags.length ? esc(x.tags.map(t => '#' + t).join(' ')) + ' · ' : ''}${x.w ? `${x.w}×${x.h} · ` : ''}dùng ${AC.libraryUses(S, x.id)} lần</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="gal-big"><img src="${esc(x.src)}" alt="${esc(x.name)}"></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Quay lại</button><button class="btn primary" id="lz-use">Dùng ảnh này</button></div>`, 'dialog');
  box.classList.add('wide');
  box.querySelector('#lz-use').addEventListener('click', () => {
    const r = AC.useLibraryItem(S, s.id, i, id); if (!r.ok) return toast(r.error, 'bad');
    closeLayer(); afterImageDialog(s, `Đã dùng ảnh từ kho, thành phiên bản ${r.version}.`);
  });
}

// Cắt giữa về đúng tỉ lệ của ô (một bấm); muốn chọn vùng cắt thì dùng Edit → Cắt
async function fitImageToRatio(s, i) {
  const a = s.assets[i], v = curVersion(a), r = AC.assetRatioOf(a);
  let img; try { img = await loadImg(versionImgSrc(v, r)); } catch (e) { return toast('Không đọc được ảnh.', 'bad'); }
  const out = cropToDataUrl(orientImage(img, 0, false), r, 1, 0.5, 0.5);
  const res = AC.addSlotImageVersion(S, s.id, i, { src: out.src, ext: 'jpg', crop: { from: v.n, ratio: r, rot: 0, flip: false, zoom: 1 } });
  if (!res.ok) return toast(res.error, 'bad');
  afterImageDialog(s, `Đã cắt giữa về ${r} (${out.W}×${out.H}), thành phiên bản ${res.version}. Bản gốc v${v.n} vẫn giữ.`);
}

// ---------- Setup → Chuẩn ảnh: bảng chuẩn theo nền tảng và tỉ lệ mặc định của từng kênh ----------
function imgStdTab() {
  return `<p class="muted">Mỗi ô ảnh có một tỉ lệ lấy từ chuẩn của nền tảng. Xem bài, danh sách ảnh, Gen, Frame, Cắt và xuất tệp đều theo tỉ lệ đó, ảnh hiện trọn, không cắt ngầm. Ảnh sai tỉ lệ hoặc nhỏ hơn chuẩn được cảnh báo ở slot (không chặn Duyệt) kèm nút Cắt về đúng tỉ lệ.</p>
    <section class="card stack"><h3>Tỉ lệ mặc định theo kênh</h3><p class="small faint">Dùng cho ô ảnh không ghi tỉ lệ trong tên. Ô đã có giữ nguyên; ô tạo mới theo mặc định này.</p>
      <div class="row" style="gap:16px;flex-wrap:wrap">${S.channels.map(ch => `<div class="field"><label for="imgdef-${esc(ch.id)}">${esc(ch.name)}</label><select id="imgdef-${esc(ch.id)}" data-change="imgdef" data-ch="${esc(ch.id)}">${AC.IMG_RATIOS.map(r => `<option value="${r}" ${AC.imgDefaultRatio(S, ch.id) === r ? 'selected' : ''}>${esc(AC.FRAME_RATIO_LABEL[r])}</option>`).join('')}</select></div>`).join('')}</div></section>
    <section class="card stack"><h3>Chuẩn theo nền tảng</h3><p class="small faint">Theo hướng dẫn công khai của các nền tảng; nền tảng đổi thì kiểm lại.</p>
      <div style="overflow-x:auto"><table class="imgstd"><thead><tr><th>Nền tảng</th><th>Dùng cho</th><th>Tỉ lệ</th><th>Kích thước</th><th>Nền tảng hiển thị</th></tr></thead><tbody>${AC.IMG_STANDARDS.map(r => `<tr><td><b>${esc(r.platform)}</b></td><td>${esc(r.use)}</td><td>${r.ratios.map(x => `<span class="rt">${esc(x)}</span>`).join('')}</td><td>${esc(r.sizes)}</td><td>${esc(r.show)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
CHANGES['imgdef'] = el => { const r = AC.setImgDefault(S, el.dataset.ch, el.value); if (!r.ok) return toast(r.error, 'bad'); commit('Đã lưu tỉ lệ mặc định.'); };
