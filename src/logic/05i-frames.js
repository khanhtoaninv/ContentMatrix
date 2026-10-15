// ---------- Frame ảnh của công ty và Image to Image (mục 10.33) ----------
import { clone, fold, hash32, splitSentences } from './01-util.js';
import { byId, chooseSlotImage, genSlotImage, imgGuard, log, nextId, slotLockMsg } from './05-model.js';
import { normTextLayer, validateTextLayers } from './05j-textlayer.js';
import { assetRatioOf, ratioFromName } from './05q-imgspec.js';
// Frame: khung cố định của công ty ghép lên ảnh (vẽ thật trong trình duyệt). Toạ độ là tỉ lệ 0–1 theo khổ ảnh ra.
export const FRAME_RATIOS = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1280, 720], '1.91:1': [1200, 630] };
export const FRAME_RATIO_LABEL = { '1:1': 'Vuông 1:1', '4:5': 'Dọc 4:5', '9:16': 'Story 9:16', '16:9': 'Ngang 16:9', '1.91:1': 'Ảnh bìa 1200×630' };
// Khung dựng sẵn: vẽ bằng màu thương hiệu (Setup → Frame); khung tải lên là PNG nền trong suốt
export const BUILTIN_FRAMES = [
  { id: 'fr-band', name: 'Dải thương hiệu', ratio: '1:1', kind: 'builtin', style: 'band', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.06, y: 0.785, w: 0.88, size: 0.056, color: '#ffffff', lines: 2 }, sub: { x: 0.06, y: 0.935, w: 0.88, size: 0.03, color: '#ffffffcc', lines: 1 } },
  { id: 'fr-card', name: 'Thẻ chữ dưới ảnh', ratio: '4:5', kind: 'builtin', style: 'card', photo: { x: 0.06, y: 0.05, w: 0.88, h: 0.58 },
    title: { x: 0.08, y: 0.68, w: 0.84, size: 0.058, color: '#ffffff', lines: 3 }, sub: { x: 0.08, y: 0.92, w: 0.84, size: 0.03, color: '#ffffffcc', lines: 1 } },
  { id: 'fr-story', name: 'Story chữ lớn', ratio: '9:16', kind: 'builtin', style: 'story', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.08, y: 0.64, w: 0.84, size: 0.072, color: '#ffffff', lines: 4 }, sub: { x: 0.08, y: 0.9, w: 0.84, size: 0.034, color: '#ffffffd9', lines: 2 } },
  { id: 'fr-thumb', name: 'Thumbnail video', ratio: '16:9', kind: 'builtin', style: 'thumb', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.05, y: 0.2, w: 0.56, size: 0.085, color: 'accent', lines: 3 }, sub: { x: 0.05, y: 0.82, w: 0.56, size: 0.045, color: '#ffffff', lines: 1 } },
  { id: 'fr-cover', name: 'Ảnh bìa Blog', ratio: '1.91:1', kind: 'builtin', style: 'cover', photo: { x: 0, y: 0, w: 0.56, h: 1 },
    title: { x: 0.6, y: 0.2, w: 0.36, size: 0.06, color: '#ffffff', lines: 3 }, sub: { x: 0.6, y: 0.8, w: 0.36, size: 0.038, color: '#ffffffcc', lines: 2 } },
];
export function frameStyleOf(S) {
  const st = S.frameStyle || {};
  return { color: st.color || '#1f3a93', accent: st.accent || '#ffd43b', logo: st.logo != null ? st.logo : ((S.brand && S.brand.parsed && S.brand.parsed.name) || '') };
}
export function setFrameStyle(S, st) {
  const hex = x => /^#[0-9a-f]{6}$/i.test(String(x || ''));
  if (!hex(st.color) || !hex(st.accent)) return { ok: false, error: 'Màu phải ở dạng #RRGGBB.' };
  S.frameStyle = { color: st.color, accent: st.accent, logo: String(st.logo || '').trim().slice(0, 40) };
  return { ok: true };
}
export function framesOf(S) { return BUILTIN_FRAMES.concat(S.frames || []); }
export function frameOf(S, id) { return framesOf(S).find(f => f.id === id) || null; }
// Tỉ lệ của ô ảnh, đoán từ tên ô (như khung xem trước)
export function assetRatio(name) { return ratioFromName(name) || '1:1'; }
// Frame xếp theo mức hợp: cùng tỉ lệ với ô ảnh lên đầu
export function framesFor(S, ratio) { return framesOf(S).slice().sort((a, b) => (b.ratio === ratio) - (a.ratio === ratio)); }
const inUnit = v => typeof v === 'number' && v >= 0 && v <= 1;
export function validateFrame(f) {
  const errs = [];
  if (!String(f.name || '').trim()) errs.push('Cần đặt tên frame.');
  if (!FRAME_RATIOS[f.ratio]) errs.push('Tỉ lệ không hợp lệ.');
  if (!/^data:image\/(png|webp);/.test(f.src || '')) errs.push('Frame cần là ảnh PNG (hoặc WebP) có nền trong suốt.');
  const p = f.photo || {};
  if (![p.x, p.y, p.w, p.h].every(inUnit) || p.w < 0.05 || p.h < 0.05 || p.x + p.w > 1.001 || p.y + p.h > 1.001) errs.push('Vùng đặt ảnh không hợp lệ.');
  ['title', 'sub'].forEach(k => { const t = f[k]; if (t && ![t.x, t.y, t.w].every(inUnit)) errs.push(`Vị trí ${k === 'title' ? 'tiêu đề' : 'phụ đề'} không hợp lệ.`); });
  return errs;
}
export function saveFrame(S, f) {
  const fr = { id: f.id || nextId(S, 'frame'), name: String(f.name || '').trim(), ratio: f.ratio, kind: 'png', src: f.src, photo: clone(f.photo),
    title: Object.assign({ x: 0.06, y: 0.8, w: 0.88, size: 0.055, color: '#ffffff', lines: 2 }, f.title || {}),
    sub: Object.assign({ x: 0.06, y: 0.93, w: 0.88, size: 0.03, color: '#ffffff', lines: 1 }, f.sub || {}) };
  const errs = validateFrame(fr); if (errs.length) return { ok: false, error: errs.join(' ') };
  S.frames = S.frames || [];
  const i = S.frames.findIndex(x => x.id === fr.id);
  if (i >= 0) S.frames[i] = fr; else S.frames.push(fr);
  log(S, i >= 0 ? 'edit' : 'add', 'frame', fr.id, fr.name);
  return { ok: true, frame: fr };
}
export function deleteFrame(S, id) {
  if (BUILTIN_FRAMES.some(f => f.id === id)) return { ok: false, error: 'Frame dựng sẵn không xoá được.' };
  const n = (S.frames || []).length; S.frames = (S.frames || []).filter(f => f.id !== id);
  return n === S.frames.length ? { ok: false, error: 'Không tìm thấy frame.' } : { ok: true };
}
// Chữ gợi ý cho tiêu đề ảnh: câu đầu của bài (bỏ nhãn, hashtag, emoji đầu dòng)
export function frameTitleHint(s) {
  const t = String((s && s.text) || '').split('\n').map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s.*|Slide\s*\d+:)\s*/i, '').trim()).find(l => l.length > 8) || '';
  const first = splitSentences(t)[0] || t;
  const h = first.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return h.length <= 90 ? h : h.slice(0, 90).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '') + '…'; // cắt ở ranh giới từ
}

// Phiên bản ảnh mới do trình duyệt dựng (ghép frame, Image to Image trên ảnh thật); chọn ngay
export function addSlotImageVersion(S, slotId, idx, data, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!data || !/^data:image\//.test(data.src || '')) return { ok: false, error: 'Ảnh dựng ra không hợp lệ.' };
  imgGuard(S, s, a);
  const n = a.versions.length + 1;
  const v = { n, seed: hash32(`${slotId}|${idx}|${n}|${data.src.length}`), createdAt: at || S.settings.demoNow, src: data.src, kind: 'image', ext: data.ext || 'jpg' };
  if (data.frame) v.frame = clone(data.frame);
  if (data.i2i) v.i2i = clone(data.i2i);
  if (data.crop) v.crop = clone(data.crop);
  if (data.tpl) v.tpl = clone(data.tpl);
  if (data.lib) v.lib = clone(data.lib);
  if (data.ai) v.ai = clone(data.ai);
  if (data.text) { const e = validateTextLayers(data.text.layers); if (e) return { ok: false, error: e }; v.text = { from: data.text.from, layers: data.text.layers.map(normTextLayer) }; }
  a.versions.push(v); chooseSlotImage(S, slotId, idx, n);
  log(S, data.ai ? 'ai-image' : data.lib ? 'library-image' : data.crop ? 'crop-image' : data.frame ? 'frame-image' : data.text ? 'text-image' : 'i2i-image', 'slot', slotId, `${a.name} v${n}`);
  return { ok: true, version: n };
}
// Gen AI (hộp thoại một chỗ cho Gen và Image to Image): Mô tả ảnh (a.prompt) + prompt người dùng (a.genPrompt) + ảnh tham chiếu.
// Prompt sinh từ Mô tả ảnh (mô phỏng, không gọi AI): thêm tỉ lệ và yêu cầu hình
export function promptFromDesc(S, slotId, idx, desc) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  const d = String(desc != null ? desc : (a && a.prompt) || '').replace(/\s+/g, ' ').trim();
  if (!d) return '';
  const ratio = a ? assetRatioOf(a) : '1:1';
  return `${d.replace(/[.\s]+$/, '')}. Tỉ lệ ${ratio}, bố cục gọn, ánh sáng tự nhiên, màu theo nhận diện thương hiệu, không thêm chữ ngoài chữ đã nêu.`;
}
// req: { desc, prompt, ref (có ảnh tham chiếu), src, ai } — src là ảnh dựng ra từ API; không có src thì tạo ảnh mô phỏng
export function genAiSlotImage(S, slotId, idx, req, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const desc = String((req && req.desc) || '').replace(/\s+/g, ' ').trim();
  const prompt = String((req && req.prompt) || '').replace(/\s+/g, ' ').trim() || desc || a.prompt;
  if (!prompt) return { ok: false, error: 'Nhập mô tả ảnh hoặc prompt trước khi tạo ảnh.' };
  if (desc && desc !== a.prompt) { a.prompt = desc; a.promptEdited = true; log(S, 'edit-image-prompt', 'slot', slotId, a.name); }
  a.genPrompt = prompt === a.prompt ? '' : prompt;
  const genai = { prompt, ref: !!(req && req.ref) };
  if (req && req.src) {
    const r = addSlotImageVersion(S, slotId, idx, { src: req.src, ext: 'jpg', ai: req.ai }, at); if (!r.ok) return r;
    a.versions.find(v => v.n === r.version).genai = genai;
    return r;
  }
  const g = genSlotImage(S, slotId, idx, at, prompt, genai); if (g.ok) log(S, 'genai-image', 'slot', slotId, `${a.name} v${g.version}${genai.ref ? ' · có ảnh tham chiếu' : ''}`);
  return g;
}

// Image to Image (mô phỏng): ảnh đang dùng + yêu cầu → phiên bản mới. Ảnh thật được trình duyệt biến đổi (src gửi kèm);
// ảnh mô phỏng thì sinh hình mô phỏng mới nối từ hình cũ. Khi gắn API thật chỉ thay phần dựng ảnh.
export function i2iSlotImage(S, slotId, idx, req, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const cur = a.versions.find(v => v.n === a.current);
  if (!cur) return { ok: false, error: 'Ô chưa có ảnh để biến đổi.' };
  if (cur.kind === 'video') return { ok: false, error: 'Image to Image chỉ dùng cho ảnh.' };
  imgGuard(S, s, a);
  const prompt = String((req && req.prompt) || '').replace(/\s+/g, ' ').trim();
  if (!prompt) return { ok: false, error: 'Nhập yêu cầu biến đổi ảnh.' };
  const strength = Math.min(1, Math.max(0.1, Number(req.strength) || 0.5));
  const meta = { from: cur.n, prompt, strength, simulated: !req.ai };
  if (req.ai) { meta.provider = req.ai.provider; meta.model = req.ai.model; }
  if (req.src) return addSlotImageVersion(S, slotId, idx, { src: req.src, ext: 'jpg', i2i: meta }, at);
  if (cur.src) return { ok: false, error: 'Thiếu ảnh dựng ra từ trình duyệt.' };
  const n = a.versions.length + 1;
  a.versions.push({ n, seed: hash32(`${slotId}|${idx}|${n}|${cur.seed}|${prompt}|${strength}`), createdAt: at || S.settings.demoNow, i2i: meta, edit: prompt });
  chooseSlotImage(S, slotId, idx, n);
  log(S, 'i2i-image', 'slot', slotId, `${a.name} v${n} · ${prompt}`);
  return { ok: true, version: n };
}
// Cách biến đổi mô phỏng theo từ khoá trong yêu cầu (trình duyệt áp bằng bộ lọc ảnh)
export function i2iLook(prompt, strength) {
  const p = fold(prompt || ''); const k = Math.min(1, Math.max(0.1, Number(strength) || 0.5));
  const f = { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, blur: 0 };
  if (/\b(sang|ruc ro|tuoi)\b/.test(p)) f.brightness += 0.25 * k;
  if (/\b(toi|dem|huyen bi)\b/.test(p)) f.brightness -= 0.3 * k;
  if (/\b(am|vang|hoang hon|co dien|vintage)\b/.test(p)) f.sepia += 0.6 * k;
  if (/\b(lanh|xanh|bien)\b/.test(p)) f.hue += 25 * k;
  if (/\b(den trang|trang den|xam)\b/.test(p)) f.grayscale = 1;
  if (/\b(tuong phan|noi bat|manh)\b/.test(p)) f.contrast += 0.3 * k;
  if (/\b(nhat|diu|pastel|mem)\b/.test(p)) { f.saturate -= 0.4 * k; f.contrast -= 0.1 * k; }
  if (/\b(mo nen|xoa phong|bokeh)\b/.test(p)) f.blur = 2 * k;
  if (/\b(ruc ro|tuoi|bat mat)\b/.test(p)) f.saturate += 0.5 * k;
  const known = Object.keys(f).some(x => f[x] !== { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, blur: 0 }[x]);
  if (!known) f.hue = ((hash32(p) % 61) - 30) * k; // yêu cầu khác: đổi tông nhẹ để thấy là bản mới
  return f;
}
