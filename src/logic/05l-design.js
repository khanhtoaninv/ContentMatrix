// ---------- Cắt, xoay, đổi tỉ lệ ảnh và Mẫu thiết kế (mục 10.36) — chạy thật trong trình duyệt ----------
const CROP_RATIOS = { orig: { label: 'Giữ tỉ lệ gốc', r: null }, '1:1': { label: '1:1', r: 1 }, '4:5': { label: '4:5', r: 0.8 }, '9:16': { label: '9:16', r: 9 / 16 }, '16:9': { label: '16:9', r: 16 / 9 }, '1.91:1': { label: '1200×630', r: 1200 / 630 } };
// Vùng cắt trên ảnh đã xoay (iw × ih): tỉ lệ r, phóng z (1 = lớn nhất vừa ảnh), tâm (cx, cy) theo 0–1; tự kẹp để không ra ngoài ảnh
function cropRect(iw, ih, ratio, zoom, cx, cy) {
  const r = (CROP_RATIOS[ratio] && CROP_RATIOS[ratio].r) || iw / ih;
  const z = Math.min(4, Math.max(1, Number(zoom) || 1));
  let w = iw, h = iw / r; if (h > ih) { h = ih; w = ih * r; }
  w /= z; h /= z;
  const x = Math.min(iw - w, Math.max(0, (Number.isFinite(cx) ? cx : 0.5) * iw - w / 2));
  const y = Math.min(ih - h, Math.max(0, (Number.isFinite(cy) ? cy : 0.5) * ih - h / 2));
  return { x, y, w, h };
}
// Khổ ảnh ra: tỉ lệ có tên dùng khổ chuẩn của kênh; giữ gốc thì theo vùng cắt, cạnh dài tối đa 1600px
function cropOutSize(ratio, w, h) {
  if (FRAME_RATIOS[ratio]) return FRAME_RATIOS[ratio].slice();
  const k = Math.min(1, 1600 / Math.max(w, h)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}
function normRotation(deg) { return ((Math.round((Number(deg) || 0) / 90) * 90) % 360 + 360) % 360; }

// ---- Mẫu thiết kế: bộ lớp chữ (+ frame tuỳ chọn) dùng lại cho ảnh khác ----
function designTemplatesOf(S) { return S.designTemplates || []; }
function saveDesignTemplate(S, t) {
  const name = String((t && t.name) || '').trim().slice(0, 60);
  if (!name) return { ok: false, error: 'Đặt tên cho mẫu.' };
  const layers = ((t && t.layers) || []).map(normTextLayer);
  const e = validateTextLayers(layers); if (e) return { ok: false, error: e };
  const frameId = t.frameId && frameOf(S, t.frameId) ? t.frameId : null;
  S.designTemplates = S.designTemplates || [];
  const item = { id: t.id || nextId(S, 'tpl'), name, frameId, layers };
  const i = S.designTemplates.findIndex(x => x.id === item.id);
  if (i >= 0) S.designTemplates[i] = item; else S.designTemplates.push(item);
  log(S, i >= 0 ? 'edit' : 'add', 'template', item.id, name);
  return { ok: true, template: item };
}
function deleteDesignTemplate(S, id) {
  const n = designTemplatesOf(S).length; S.designTemplates = designTemplatesOf(S).filter(x => x.id !== id);
  return n === S.designTemplates.length ? { ok: false, error: 'Không tìm thấy mẫu.' } : { ok: true };
}
// Áp mẫu: giữ vị trí, font, màu của mẫu; thay nội dung bằng chữ người dùng nhập (ô trống giữ chữ mẫu)
function applyDesignTemplate(tpl, texts) {
  return tpl.layers.map((l, i) => normTextLayer(Object.assign({}, l, texts && texts[i] != null && String(texts[i]).trim() ? { text: texts[i] } : {})));
}
