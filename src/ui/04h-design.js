// ---------- UI · Cắt, xoay, đổi tỉ lệ ảnh và Mẫu thiết kế (mục 10.36) — chạy thật bằng canvas ----------
// Ảnh đã xoay/lật (cạnh dài tối đa 2000px) làm nền cho vùng cắt
function orientImage(img, rot, flip) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.min(1, 2000 / Math.max(iw, ih));
  const w0 = Math.round(iw * k), h0 = Math.round(ih * k), sw = rot % 180 ? h0 : w0, sh = rot % 180 ? w0 : h0;
  const c = document.createElement('canvas'); c.width = sw; c.height = sh; const g = c.getContext('2d');
  g.translate(sw / 2, sh / 2); g.rotate(rot * Math.PI / 180); if (flip) g.scale(-1, 1); g.drawImage(img, -w0 / 2, -h0 / 2, w0, h0);
  return c;
}
function cropToDataUrl(oc, ratio, zoom, cx, cy) {
  const r = AC.cropRect(oc.width, oc.height, ratio, zoom, cx, cy); const [W, H] = AC.cropOutSize(ratio, r.w, r.h);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(oc, r.x, r.y, r.w, r.h, 0, 0, W, H);
  return { src: c.toDataURL('image/jpeg', 0.88), W, H };
}

async function openCropDialog(s, i) {
  const a = s.assets[i], v = curVersion(a);
  let img; try { img = await loadImg(versionImgSrc(v, AC.assetRatioOf(a))); } catch (e) { return toast('Không đọc được ảnh.', 'bad'); }
  const st = { ratio: AC.assetRatioOf(a), rot: 0, flip: false, zoom: 1, cx: 0.5, cy: 0.5, drag: null };
  let oc = orientImage(img, 0, false);
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Cắt ảnh · ${esc(a.name)} · bản v${v.n}</span><h2>Cắt, xoay và đổi tỉ lệ</h2><p class="small muted">Kéo khung để chọn phần ảnh giữ lại, phóng to để cắt sát hơn. Xác nhận tạo phiên bản mới; bản v${v.n} vẫn giữ. Có thể tải cùng lúc đủ 5 khổ cho các kênh.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="tx-dlg">
      <div class="tx-stage"><canvas id="cr-canvas" tabindex="0" role="img" aria-label="Ảnh và khung cắt. Kéo để dời khung; phím mũi tên dời từng chút."></canvas></div>
      <div class="stack" style="gap:12px;min-width:0">
        <div class="field"><span class="small muted">Tỉ lệ</span><div class="row" style="gap:6px;flex-wrap:wrap" role="radiogroup" aria-label="Tỉ lệ">${Object.entries(AC.CROP_RATIOS).map(([k, x]) => `<button class="btn sm" role="radio" data-cr="${k}" aria-checked="${k === st.ratio}" aria-pressed="${k === st.ratio}">${esc(x.label)}</button>`).join('')}</div></div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-crx="left" aria-label="Xoay trái 90 độ">⟲ Xoay trái</button><button class="btn sm" data-crx="right" aria-label="Xoay phải 90 độ">⟳ Xoay phải</button><button class="btn sm" data-crx="flip" aria-pressed="false">⇋ Lật ngang</button><button class="btn sm ghost" data-crx="reset">Về ban đầu</button></div>
        <div class="field"><label for="cr-zoom">Phóng to: <b id="cr-zoomv">100%</b></label><input id="cr-zoom" type="range" min="100" max="400" step="5" value="100"></div>
        <p class="small muted" id="cr-out"></p>
        <div class="row"><button class="btn sm" id="cr-all">${icon('export')} Tải đủ 5 khổ (ZIP)</button></div>
      </div>
    </div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="cr-ok">Xác nhận cắt</button></div>`, 'dialog');
  box.classList.add('wide');
  const cv = box.querySelector('#cr-canvas'), g = cv.getContext('2d');
  let k = 1; // tỉ lệ hiển thị
  const draw = () => {
    k = Math.min(1, 620 / oc.width, 520 / oc.height); cv.width = Math.round(oc.width * k); cv.height = Math.round(oc.height * k);
    g.drawImage(oc, 0, 0, cv.width, cv.height);
    const r = AC.cropRect(oc.width, oc.height, st.ratio, st.zoom, st.cx, st.cy), x = r.x * k, y = r.y * k, w = r.w * k, h = r.h * k;
    st.cx = (r.x + r.w / 2) / oc.width; st.cy = (r.y + r.h / 2) / oc.height; // kẹp tâm theo vùng hợp lệ
    g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.rect(x, y, w, h); g.fill('evenodd');
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath();
    [1, 2].forEach(n => { g.moveTo(x + w * n / 3, y); g.lineTo(x + w * n / 3, y + h); g.moveTo(x, y + h * n / 3); g.lineTo(x + w, y + h * n / 3); }); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.restore();
    const [W, H] = AC.cropOutSize(st.ratio, r.w, r.h);
    box.querySelector('#cr-out').textContent = `Ảnh ra: ${W}×${H}px${st.rot ? ` · xoay ${st.rot}°` : ''}${st.flip ? ' · lật ngang' : ''}${W > r.w * 1.05 ? ' · vùng cắt nhỏ hơn khổ ra nên ảnh sẽ hơi mờ' : ''}.`;
  };
  const reorient = () => { oc = orientImage(img, st.rot, st.flip); draw(); };
  box.addEventListener('click', e => {
    const r = e.target.closest('[data-cr]'); if (r) { st.ratio = r.dataset.cr; box.querySelectorAll('[data-cr]').forEach(b => { b.setAttribute('aria-checked', String(b === r)); b.setAttribute('aria-pressed', String(b === r)); }); draw(); return; }
    const x = e.target.closest('[data-crx]'); if (!x) return;
    if (x.dataset.crx === 'left') st.rot = AC.normRotation(st.rot - 90);
    if (x.dataset.crx === 'right') st.rot = AC.normRotation(st.rot + 90);
    if (x.dataset.crx === 'flip') { st.flip = !st.flip; x.setAttribute('aria-pressed', String(st.flip)); }
    if (x.dataset.crx === 'reset') { Object.assign(st, { rot: 0, flip: false, zoom: 1, cx: 0.5, cy: 0.5 }); box.querySelector('#cr-zoom').value = 100; box.querySelector('#cr-zoomv').textContent = '100%'; box.querySelector('[data-crx="flip"]').setAttribute('aria-pressed', 'false'); }
    reorient();
  });
  box.querySelector('#cr-zoom').addEventListener('input', e => { st.zoom = Number(e.target.value) / 100; box.querySelector('#cr-zoomv').textContent = e.target.value + '%'; draw(); });
  const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
  cv.addEventListener('pointerdown', e => { const [x, y] = pt(e); st.drag = { x, y, cx: st.cx, cy: st.cy }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); });
  cv.addEventListener('pointermove', e => { if (!st.drag) return; const [x, y] = pt(e), d = st.drag; st.cx = d.cx + (x - d.x) / cv.width; st.cy = d.cy + (y - d.y) / cv.height; draw(); });
  const end = () => { st.drag = null; cv.classList.remove('dragging'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return; e.preventDefault(); const sp = e.shiftKey ? 0.05 : 0.01; st.cx += d[0] * sp; st.cy += d[1] * sp; draw(); });
  box.querySelector('#cr-ok').addEventListener('click', e => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const out = cropToDataUrl(oc, st.ratio, st.zoom, st.cx, st.cy);
      const r = AC.addSlotImageVersion(S, s.id, i, { src: out.src, ext: 'jpg', crop: { from: v.n, ratio: st.ratio, rot: st.rot, flip: st.flip, zoom: st.zoom } });
      if (!r.ok) { b.disabled = false; return toast(r.error, 'bad'); }
      if (st.ratio !== 'orig' && st.ratio !== AC.assetRatioOf(a)) AC.setAssetRatio(S, s.id, i, st.ratio); // chọn tỉ lệ khác: ô đổi theo
      afterImageDialog(s, `Đã cắt ảnh ${out.W}×${out.H}, thành phiên bản ${r.version}. Bản gốc v${v.n} vẫn giữ.`);
    } catch (er) { b.disabled = false; toast('Không cắt được ảnh: ' + er.message, 'bad'); }
  });
  box.querySelector('#cr-all').addEventListener('click', async () => {
    const base = `${AC.slugOf(a.name, 30)}-v${v.n}`;
    const files = Object.keys(AC.FRAME_RATIOS).map(rk => ({ path: `${base}-${rk.replace(':', 'x')}.jpg`, bytes: AC.dataUrlBytes(cropToDataUrl(oc, rk, st.zoom, st.cx, st.cy).src) }));
    await downloadBytes(`${base}-5-kho.zip`, AC.zipFiles(files, S.settings.demoNow), 'application/zip');
  });
  draw();
}

// ---- Áp mẫu thiết kế lên ảnh ----
async function renderTemplateImage(tpl, a, v, texts, scale) {
  const k = scale || 1; let img, W, H;
  const fr = tpl.frameId && AC.frameOf(S, tpl.frameId);
  if (fr) { img = await loadImg(await renderFramed(fr, v, '', '', k)); [W, H] = AC.FRAME_RATIOS[fr.ratio]; }
  else { img = await loadImg(versionImgSrc(v, AC.assetRatioOf(a))); [W, H] = txOutSize(a, img, v); }
  W = Math.round(W * k); H = Math.round(H * k);
  const layers = AC.applyDesignTemplate(tpl, texts); await txLoadFonts(layers);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); drawCover(g, img, 0, 0, W, H); layers.forEach(l => drawTextLayer(g, l, W, H));
  return c.toDataURL('image/jpeg', 0.88);
}
function openTemplateDialog(s, i) {
  const a = s.assets[i], v = curVersion(a), list = AC.designTemplatesOf(S);
  if (!list.length) return toast('Chưa có mẫu. Bấm Chữ, soạn chữ rồi Lưu thành mẫu.', 'bad');
  const st = { id: list[0].id, texts: [] };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Mẫu thiết kế · ${esc(a.name)} · bản v${v.n}</span><h2>Áp mẫu lên ảnh</h2><p class="small muted">Chọn mẫu, đổi chữ cho bài này. Vị trí, font, màu theo mẫu; mẫu có frame thì ghép frame trước. Kết quả là phiên bản mới.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="fr-dlg"><div class="stack" style="gap:10px;min-width:0">
      <div class="field"><label for="tp-pick">Mẫu</label><select id="tp-pick">${list.map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.frameId ? ' · có frame' : ''}</option>`).join('')}</select></div>
      <div id="tp-fields" class="stack" style="gap:8px"></div></div>
      <div class="stack" style="gap:8px"><span class="small muted">Xem trước</span><div class="fr-prev" id="tp-prev"><span class="small faint">Đang dựng…</span></div></div></div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="tp-ok">Áp mẫu</button></div>`, 'dialog');
  box.classList.add('wide');
  const tpl = () => AC.designTemplatesOf(S).find(x => x.id === st.id);
  let tok = 0, tm = null;
  const preview = async () => { const my = ++tok; try { const src = await renderTemplateImage(tpl(), a, v, st.texts, 0.5); if (my === tok) box.querySelector('#tp-prev').innerHTML = `<img src="${src}" alt="Xem trước mẫu ${esc(tpl().name)}">`; } catch (e) { if (my === tok) box.querySelector('#tp-prev').innerHTML = '<span class="small err">Không dựng được xem trước.</span>'; } };
  const fields = () => {
    const t = tpl(); const hint = AC.frameTitleHint(s);
    st.texts = t.layers.map((l, k) => k === 0 && hint ? hint : l.text);
    box.querySelector('#tp-fields').innerHTML = t.layers.map((l, k) => `<div class="field"><label for="tp-t${k}">Chữ ${k + 1} <span class="faint">(${esc(AC.TEXT_FONTS.find(f => f.id === l.font).name)})</span></label><textarea id="tp-t${k}" data-k="${k}" rows="2" maxlength="200">${esc(st.texts[k])}</textarea></div>`).join('');
    preview();
  };
  box.querySelector('#tp-pick').addEventListener('change', e => { st.id = e.target.value; fields(); });
  box.querySelector('#tp-fields').addEventListener('input', e => { const k = e.target.dataset.k; if (k == null) return; st.texts[Number(k)] = e.target.value; clearTimeout(tm); tm = setTimeout(preview, 200); });
  box.querySelector('#tp-ok').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; const t = tpl();
    try {
      const src = await renderTemplateImage(t, a, v, st.texts, 1);
      const layers = AC.applyDesignTemplate(t, st.texts);
      const r = AC.addSlotImageVersion(S, s.id, i, { src, ext: 'jpg', text: { from: v.n, layers }, tpl: { id: t.id, name: t.name, frameId: t.frameId } });
      if (!r.ok) { b.disabled = false; return toast(r.error, 'bad'); }
      afterImageDialog(s, `Đã áp mẫu “${t.name}”, thành phiên bản ${r.version}.`);
    } catch (er) { b.disabled = false; toast('Không áp được mẫu: ' + er.message, 'bad'); }
  });
  fields();
}
// Thiết lập → Frame ảnh: danh sách mẫu thiết kế
function designTplSection() {
  const L = AC.designTemplatesOf(S);
  return `<section class="stack"><h3>Mẫu thiết kế <span class="small faint">${L.length}</span></h3><p class="small muted">Mẫu là bộ lớp chữ (vị trí, font, cỡ, màu) và frame tuỳ chọn. Tạo mẫu ở nút Chữ trên ảnh → Lưu thành mẫu; dùng mẫu bằng nút Mẫu trên ảnh.</p>
    ${L.length ? `<div class="sn-table">${L.map(x => `<div class="sn-row"><span class="sn-t"><b>${esc(x.name)}</b></span><span class="small muted">${x.layers.length} lớp chữ · ${esc(x.layers.map(l => AC.TEXT_FONTS.find(f => f.id === l.font).name.split(' (')[0]).filter((n, k, arr) => arr.indexOf(n) === k).join(', '))}</span><span class="small faint">${x.frameId ? esc((AC.frameOf(S, x.frameId) || {}).name || 'frame đã xoá') : 'không frame'}</span><button class="btn sm ghost danger" data-act="dtpl-del" data-id="${esc(x.id)}" aria-label="Xoá mẫu ${esc(x.name)}">Xoá</button></div>`).join('')}</div>` : '<p class="small muted">Chưa có mẫu nào.</p>'}</section>`;
}
ACTIONS['dtpl-del'] = async el => {
  const t = AC.designTemplatesOf(S).find(x => x.id === el.dataset.id); if (!t) return;
  if (!(await confirmBox({ title: 'Xoá mẫu thiết kế?', body: `<p>Xoá mẫu “${esc(t.name)}”. Ảnh đã áp mẫu vẫn giữ nguyên.</p>`, ok: 'Xoá', danger: true }))) return;
  const r = AC.deleteDesignTemplate(S, t.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã xoá mẫu.');
};
