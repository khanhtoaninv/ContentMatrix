// ---------- Thêm chữ lên ảnh (mục 10.34) ----------
// Mỗi lớp chữ: nội dung, font, cỡ (tỉ lệ theo bề rộng ảnh), màu, đậm/nghiêng, căn lề, hiệu ứng, vị trí x/y (0–1).
// x là mép trái / tâm / mép phải tuỳ căn lề; y là mép trên của khối chữ. Trình duyệt vẽ bằng canvas.
export const TEXT_FONTS = [
  { id: 'be-vietnam', name: 'Be Vietnam Pro', css: '"Be Vietnam Pro", sans-serif' },
  { id: 'roboto', name: 'Roboto', css: '"Roboto", sans-serif' },
  { id: 'montserrat', name: 'Montserrat', css: '"Montserrat", sans-serif' },
  { id: 'oswald', name: 'Oswald (chữ cao)', css: '"Oswald", sans-serif' },
  { id: 'playfair', name: 'Playfair Display (có chân)', css: '"Playfair Display", serif' },
  { id: 'dancing', name: 'Dancing Script (viết tay)', css: '"Dancing Script", cursive' },
];
export const TEXT_EFFECTS = { none: 'Không', shadow: 'Bóng đổ', outline: 'Viền chữ', box: 'Nền mờ sau chữ' };
export const TEXT_PLACES = { top: { y: 0.06, label: 'Trên' }, middle: { y: 0.42, label: 'Giữa' }, bottom: { y: 0.74, label: 'Dưới' } };
const clampN = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function newTextLayer(over) {
  return normTextLayer(Object.assign({ text: 'Nhập chữ', font: 'be-vietnam', size: 0.07, color: '#ffffff', bold: true, italic: false, align: 'center', effect: 'shadow', x: 0.5, y: 0.42, w: 0.86 }, over || {}));
}
export function normTextLayer(l) {
  l = l || {};
  return {
    text: String(l.text == null ? '' : l.text).replace(/\r/g, '').slice(0, 200),
    font: TEXT_FONTS.some(f => f.id === l.font) ? l.font : 'be-vietnam',
    size: clampN(l.size, 0.02, 0.2, 0.07),
    color: /^#[0-9a-f]{6}$/i.test(String(l.color || '')) ? l.color : '#ffffff',
    bold: !!l.bold, italic: !!l.italic,
    align: ['left', 'center', 'right'].includes(l.align) ? l.align : 'center',
    effect: TEXT_EFFECTS[l.effect] ? l.effect : 'none',
    x: clampN(l.x, 0, 1, 0.5), y: clampN(l.y, 0, 1, 0.42), w: clampN(l.w, 0.1, 1, 0.86),
  };
}
// Đặt nhanh: căn giữa theo chiều ngang, y theo vị trí đã chọn
export function placeTextLayer(l, where) {
  const p = TEXT_PLACES[where]; if (!p) return normTextLayer(l);
  return normTextLayer(Object.assign({}, l, { y: p.y, x: 0.5, align: 'center' }));
}
export function textFontCss(id) { const f = TEXT_FONTS.find(x => x.id === id) || TEXT_FONTS[0]; return f.css; }
// Kiểm tra trước khi tạo phiên bản: cần ít nhất một lớp có chữ, tối đa 8 lớp
export function validateTextLayers(layers) {
  if (!Array.isArray(layers) || !layers.length) return 'Thêm ít nhất một lớp chữ.';
  if (layers.length > 8) return 'Tối đa 8 lớp chữ trên một ảnh.';
  if (!layers.some(l => String(l.text || '').trim())) return 'Các lớp chữ đang trống.';
  return '';
}
