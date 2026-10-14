// ---------- UI · Thêm chữ lên ảnh (mục 10.34) ----------
// Trình soạn nhiều lớp chữ: chọn font, cỡ, màu, đậm/nghiêng, căn lề, hiệu ứng; kéo chữ trên ảnh để đặt vị trí.
// Vẽ thật bằng canvas; Xác nhận tạo phiên bản ảnh mới (JPEG), bản gốc giữ nguyên.
function txFont(l, sz) { return `${l.italic ? 'italic ' : ''}${l.bold ? 700 : 400} ${sz}px ${AC.textFontCss(l.font)}`; }
function txLayout(g, l, W, H) {
  const sz = Math.max(6, Math.round(l.size * W)); g.font = txFont(l, sz);
  const maxW = l.w * W, rows = [];
  String(l.text || '').split('\n').forEach(par => {
    const words = par.split(/\s+/).filter(Boolean); if (!words.length) { rows.push(''); return; }
    let cur = ''; words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (!cur || g.measureText(t).width <= maxW) cur = t; else { rows.push(cur); cur = w; } }); rows.push(cur);
  });
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  const blockW = Math.max(0, ...rows.map(r => g.measureText(r).width)), lh = sz * 1.25, h = rows.length * lh;
  const ax = l.x * W, left = l.align === 'left' ? ax : l.align === 'right' ? ax - blockW : ax - blockW / 2;
  return { sz, rows, blockW, lh, h, ax, left, top: l.y * H };
}
function txIsLight(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 150; }
// Vẽ một lớp chữ; trả khung bao (để chọn và kéo)
function drawTextLayer(g, l, W, H) {
  if (!String(l.text || '').trim()) return null;
  const L = txLayout(g, l, W, H); if (!L.rows.length) return null;
  g.save(); g.font = txFont(l, L.sz); g.textBaseline = 'top'; g.textAlign = l.align;
  if (l.effect === 'box') { const pad = L.sz * 0.35; g.fillStyle = txIsLight(l.color) ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)'; roundRectPath(g, L.left - pad, L.top - pad * 0.6, L.blockW + pad * 2, L.h + pad * 1.2, pad * 0.8); g.fill(); }
  if (l.effect === 'shadow') { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = L.sz * 0.2; g.shadowOffsetY = L.sz * 0.06; }
  L.rows.forEach((r, i) => {
    const y = L.top + i * L.lh + (L.lh - L.sz) / 2;
    if (l.effect === 'outline') { g.lineWidth = Math.max(2, L.sz * 0.14); g.lineJoin = 'round'; g.strokeStyle = txIsLight(l.color) ? '#000000' : '#ffffff'; g.strokeText(r, L.ax, y); }
    g.fillStyle = l.color; g.fillText(r, L.ax, y);
  });
  g.restore();
  return { x: L.left, y: L.top, w: L.blockW, h: L.h };
}
const txFontsReady = new Set();
function txLoadFonts(layers) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
  const need = layers.filter(l => String(l.text || '').trim()).map(l => [txFont(l, 40), l.text]).filter(([f, t]) => !txFontsReady.has(f + '|' + t));
  if (!need.length) return Promise.resolve(false);
  return Promise.all(need.map(([f, t]) => document.fonts.load(f, t).then(() => txFontsReady.add(f + '|' + t)).catch(() => {}))).then(() => true);
}
// Khổ ảnh ra: ảnh thật giữ tỉ lệ gốc (cạnh dài tối đa 1600px); ảnh mô phỏng theo tỉ lệ ô ảnh
function txOutSize(a, img, v) {
  if (v.src) { const iw = img.naturalWidth || 1080, ih = img.naturalHeight || 1080, k = Math.min(1, 1600 / Math.max(iw, ih)); return [Math.round(iw * k), Math.round(ih * k)]; }
  return AC.FRAME_RATIOS[AC.assetRatioOf(a)];
}
async function renderTextImage(img, W, H, layers) {
  await txLoadFonts(layers);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); drawCover(g, img, 0, 0, W, H);
  layers.forEach(l => drawTextLayer(g, l, W, H));
  return c.toDataURL('image/jpeg', 0.88);
}

async function openTextDialog(s, i) {
  const a = s.assets[i], v = curVersion(a);
  let img; try { img = await loadImg(versionImgSrc(v, AC.assetRatioOf(a))); } catch (e) { return toast('Không đọc được ảnh.', 'bad'); }
  const [W, H] = txOutSize(a, img, v);
  const pk = Math.min(1, 900 / Math.max(W, H)), PW = Math.round(W * pk), PH = Math.round(H * pk); // khung xem trước
  const hint = AC.frameTitleHint(s);
  const st = { layers: [AC.placeTextLayer(AC.newTextLayer({ text: hint || 'Nhập chữ', size: 0.055 }), 'bottom')], sel: 0, boxes: [], drag: null };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Thêm chữ · ${esc(a.name)} · bản v${v.n} · ${W}×${H}</span><h2>Thêm chữ lên ảnh</h2><p class="small muted">Gõ chữ, chọn font, cỡ, màu rồi kéo chữ trên ảnh để đặt vị trí (hoặc dùng phím mũi tên). Xác nhận tạo phiên bản mới; bản gốc v${v.n} vẫn giữ.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="tx-dlg">
      <div class="tx-stage"><canvas id="tx-canvas" width="${PW}" height="${PH}" tabindex="0" role="img" aria-label="Ảnh xem trước. Kéo chữ để đặt vị trí; phím mũi tên dời lớp chữ đang chọn."></canvas></div>
      <div class="stack" id="tx-panel" style="gap:10px;min-width:0"></div>
    </div>
    <div class="actions">${AC.designTemplatesOf(S).length ? `<label class="small muted" for="tx-from" style="margin-right:auto;display:flex;gap:6px;align-items:center">Bắt đầu từ mẫu <select id="tx-from"><option value="">Chọn mẫu…</option>${AC.designTemplatesOf(S).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>` : ''}<button class="btn" id="tx-tpl" title="Lưu bộ chữ này (vị trí, font, màu) để dùng lại cho ảnh khác">Lưu thành mẫu</button><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="tx-ok">Xác nhận thêm chữ</button></div>`, 'dialog');
  box.classList.add('wide');
  const cv = box.querySelector('#tx-canvas'), g = cv.getContext('2d'), panel = box.querySelector('#tx-panel');
  const cur = () => st.layers[st.sel];
  const draw = () => {
    g.clearRect(0, 0, PW, PH); drawCover(g, img, 0, 0, PW, PH);
    st.boxes = st.layers.map(l => drawTextLayer(g, l, PW, PH));
    const b = st.boxes[st.sel];
    if (b) { g.save(); g.setLineDash([6, 4]); g.lineWidth = 1.5; g.strokeStyle = '#ffffff'; g.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12); g.strokeStyle = '#2741b0'; g.lineDashOffset = 5; g.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12); g.restore(); }
    txLoadFonts(st.layers).then(changed => { if (changed) draw(); });
  };
  const opt = (o, v0) => Object.entries(o).map(([k, lab]) => `<option value="${k}" ${k === v0 ? 'selected' : ''}>${esc(lab)}</option>`).join('');
  const paintPanel = () => {
    const l = cur();
    panel.innerHTML = `<div class="row tx-layers" role="tablist" aria-label="Lớp chữ">${st.layers.map((x, k) => `<button class="btn sm ${k === st.sel ? 'primary' : ''}" role="tab" aria-selected="${k === st.sel}" data-txl="${k}">Chữ ${k + 1}</button>`).join('')}
        <button class="btn sm" data-tx="add" ${st.layers.length >= 8 ? 'disabled' : ''}>${icon('plus')} Thêm lớp</button></div>
      ${l ? `<div class="field"><label for="tx-text">Nội dung (Enter để xuống dòng)</label><textarea id="tx-text" rows="2" maxlength="200">${esc(l.text)}</textarea></div>
      <div class="tx-grid">
        <div class="field"><label for="tx-font">Font</label><select id="tx-font">${AC.TEXT_FONTS.map(f => `<option value="${f.id}" ${f.id === l.font ? 'selected' : ''} style="font-family:${esc(f.css)}">${esc(f.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="tx-size">Cỡ chữ: <b id="tx-sizev">${Math.round(l.size * W)} px</b></label><input id="tx-size" type="range" min="2" max="20" step="0.5" value="${l.size * 100}"></div>
        <div class="field"><label for="tx-color">Màu</label><input id="tx-color" type="color" value="${esc(l.color)}"></div>
        <div class="field"><label for="tx-w">Bề rộng khối chữ: <b id="tx-wv">${Math.round(l.w * 100)}%</b></label><input id="tx-w" type="range" min="10" max="100" step="2" value="${Math.round(l.w * 100)}"></div>
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-tx="bold" aria-pressed="${l.bold}" style="font-weight:700">Đậm</button><button class="btn sm" data-tx="italic" aria-pressed="${l.italic}" style="font-style:italic">Nghiêng</button>
        <span class="tx-sep" aria-hidden="true"></span>
        ${[['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']].map(([k, lab]) => `<button class="btn sm" data-txa="${k}" aria-pressed="${l.align === k}" aria-label="Căn ${lab.toLowerCase()}">${lab}</button>`).join('')}
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap;align-items:flex-end">
        <div class="field"><label for="tx-effect">Hiệu ứng cho dễ đọc</label><select id="tx-effect">${opt(AC.TEXT_EFFECTS, l.effect)}</select></div>
        <span class="small muted" style="margin-left:auto">Đặt nhanh:</span>${Object.entries(AC.TEXT_PLACES).map(([k, p]) => `<button class="btn sm" data-txp="${k}">${p.label}</button>`).join('')}
      </div>
      <div class="row"><button class="btn sm ghost danger" data-tx="del">Xoá lớp này</button></div>` : '<p class="small muted">Chưa có lớp chữ. Bấm Thêm lớp.</p>'}`;
    const on = (sel, ev, fn) => { const el = panel.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    const set = (k, val) => { st.layers[st.sel] = AC.normTextLayer(Object.assign({}, cur(), { [k]: val })); draw(); };
    on('#tx-text', 'input', e => set('text', e.target.value));
    on('#tx-font', 'change', e => set('font', e.target.value));
    on('#tx-size', 'input', e => { set('size', Number(e.target.value) / 100); panel.querySelector('#tx-sizev').textContent = Math.round(cur().size * W) + ' px'; });
    on('#tx-w', 'input', e => { set('w', Number(e.target.value) / 100); panel.querySelector('#tx-wv').textContent = e.target.value + '%'; });
    on('#tx-color', 'input', e => set('color', e.target.value));
    on('#tx-effect', 'change', e => set('effect', e.target.value));
  };
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const l = cur();
    if (b.dataset.txl) { st.sel = Number(b.dataset.txl); }
    else if (b.dataset.tx === 'add') { st.layers.push(AC.newTextLayer({ text: 'Chữ mới', y: 0.42 })); st.sel = st.layers.length - 1; }
    else if (b.dataset.tx === 'del') { st.layers.splice(st.sel, 1); st.sel = Math.max(0, Math.min(st.sel, st.layers.length - 1)); }
    else if (b.dataset.tx === 'bold' || b.dataset.tx === 'italic') st.layers[st.sel] = AC.normTextLayer(Object.assign({}, l, { [b.dataset.tx]: !l[b.dataset.tx] }));
    else if (b.dataset.txa) { // đổi căn lề giữ nguyên chỗ của khối chữ
      const bx = st.boxes[st.sel], nx = bx ? (b.dataset.txa === 'left' ? bx.x : b.dataset.txa === 'right' ? bx.x + bx.w : bx.x + bx.w / 2) / PW : l.x;
      st.layers[st.sel] = AC.normTextLayer(Object.assign({}, l, { align: b.dataset.txa, x: nx }));
    }
    else if (b.dataset.txp) st.layers[st.sel] = AC.placeTextLayer(l, b.dataset.txp);
    else return;
    paintPanel(); draw();
  });
  // Kéo chữ trên ảnh
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * PW / r.width, (e.clientY - r.top) * PH / r.height]; };
  cv.addEventListener('pointerdown', e => {
    const [x, y] = pt(e); let hit = -1;
    for (let k = st.boxes.length - 1; k >= 0; k--) { const b = st.boxes[k]; if (b && x >= b.x - 10 && x <= b.x + b.w + 10 && y >= b.y - 10 && y <= b.y + b.h + 10) { hit = k; break; } }
    if (hit < 0) return;
    if (hit !== st.sel) { st.sel = hit; paintPanel(); }
    st.drag = { x, y, lx: cur().x, ly: cur().y }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!st.drag) { const [x, y] = pt(e); cv.style.cursor = st.boxes.some(b => b && x >= b.x - 10 && x <= b.x + b.w + 10 && y >= b.y - 10 && y <= b.y + b.h + 10) ? 'move' : 'default'; return; }
    const [x, y] = pt(e), d = st.drag;
    st.layers[st.sel] = AC.normTextLayer(Object.assign({}, cur(), { x: d.lx + (x - d.x) / PW, y: d.ly + (y - d.y) / PH })); draw();
  });
  const end = () => { st.drag = null; cv.classList.remove('dragging'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', e => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!dir || !cur()) return;
    e.preventDefault(); const step = e.shiftKey ? 0.05 : 0.01;
    st.layers[st.sel] = AC.normTextLayer(Object.assign({}, cur(), { x: cur().x + dir[0] * step, y: cur().y + dir[1] * step })); draw();
  });
  box.querySelector('#tx-ok').addEventListener('click', async e => {
    const b = e.currentTarget; const err = AC.validateTextLayers(st.layers); if (err) return toast(err, 'bad');
    b.disabled = true; b.textContent = 'Đang tạo…';
    try {
      const src = await renderTextImage(img, W, H, st.layers);
      const r = AC.addSlotImageVersion(S, s.id, i, { src, ext: 'jpg', text: { from: v.n, layers: st.layers } });
      if (!r.ok) { b.disabled = false; b.textContent = 'Xác nhận thêm chữ'; return toast(r.error, 'bad'); }
      afterImageDialog(s, `Đã thêm chữ, thành phiên bản ${r.version}. Bản gốc v${v.n} vẫn giữ.`);
    } catch (er) { b.disabled = false; b.textContent = 'Xác nhận thêm chữ'; toast('Không tạo được ảnh: ' + er.message, 'bad'); }
  });
  // Mẫu thiết kế (mục 10.36): nạp bộ chữ từ mẫu, hoặc lưu bộ chữ đang soạn thành mẫu
  const from = box.querySelector('#tx-from');
  if (from) from.addEventListener('change', () => { const tp = AC.designTemplatesOf(S).find(x => x.id === from.value); if (!tp) return; st.layers = AC.applyDesignTemplate(tp); st.sel = 0; paintPanel(); draw(); toast(`Đã nạp mẫu “${tp.name}”.${tp.frameId ? ' Mẫu có frame: dùng nút Mẫu trên ảnh để ghép cả frame.' : ''}`); });
  box.querySelector('#tx-tpl').addEventListener('click', async () => {
    const err = AC.validateTextLayers(st.layers); if (err) return toast(err, 'bad');
    const r = await confirmBox({ title: 'Lưu thành mẫu thiết kế', ok: 'Lưu mẫu', body: `<p>Lưu ${st.layers.length} lớp chữ (vị trí, font, cỡ, màu, hiệu ứng). Lần sau bấm <b>Mẫu</b> trên ảnh khác, chỉ cần đổi chữ.</p>`,
      extra: `<div class="field"><label for="tpl-name">Tên mẫu</label><input id="tpl-name" data-collect="name" maxlength="60" placeholder="Ví dụ: Ảnh khuyến mãi"></div><div class="field"><label for="tpl-frame">Kèm frame (ghép trước rồi mới thêm chữ)</label><select id="tpl-frame" data-collect="frame"><option value="">Không kèm frame</option>${AC.framesOf(S).map(f => `<option value="${esc(f.id)}">${esc(f.name)} · ${esc(AC.FRAME_RATIO_LABEL[f.ratio])}</option>`).join('')}</select></div>` });
    if (!r) return;
    const sv = AC.saveDesignTemplate(S, { name: r.name, frameId: r.frame, layers: st.layers }); if (!sv.ok) return toast(sv.error, 'bad');
    save(); toast(`Đã lưu mẫu “${sv.template.name}”.`);
  });
  paintPanel(); draw();
}
