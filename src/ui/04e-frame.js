// ---------- UI · Ghép frame và Image to Image (mục 10.33) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, INPUTS, S, view } from './00-state.js';
import { $, assetKind, closeLayer, commit, confirmBox, esc, fmtNum, icon, imgVisual, openLayer, save, toast } from './01-core.js';
import { stateJson } from './01b-mediastore.js';
import { render } from './02-shell.js';
import { openSlot } from './04-week.js';
import { pvRefresh } from './04b-preview.js';
import { openTextDialog } from './04f-text.js';
import { designTplSection, openCropDialog, openTemplateDialog } from './04h-design.js';
import { versionToDataUrl } from './04i-studio.js';
import { apiGenImage, imageApiCall, openCoverDialog, openSubsDialog, providerLabel } from './04j-media.js';
import { fitImageToRatio, openImageEditor, openLibraryPicker, openPromptDialog } from './04m-imgtools.js';
import { lines } from './07-setup.js';
// Ghép frame vẽ thật bằng canvas trong trình duyệt. Image to Image là mô phỏng: ảnh thật được biến đổi bằng bộ lọc
// theo từ khoá của yêu cầu, ảnh mô phỏng sinh hình mới. Khi gắn API thật chỉ thay i2iEngine bên dưới.
const FRAME_FONT = '"Be Vietnam Pro", system-ui, sans-serif';
export function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh.')); i.src = src; }); }
// Ảnh nguồn của một phiên bản: ảnh thật, hoặc hình mô phỏng đổi thành SVG độc lập để vẽ lên canvas
export function versionImgSrc(v, ratio) {
  if (v.src) return v.src;
  const std = AC.FRAME_RATIOS[ratio] || [1200, 800];
  const svg = imgVisual(v, false, ratio).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${std[0]}" height="${std[1]}" `);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export function drawCover(g, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
  const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
  g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}
export function roundRectPath(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function hexAlpha(hex, a) { const n = parseInt(String(hex).slice(1, 7), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// Ngắt dòng theo bề rộng; chữ tự nhỏ lại tới 60% để vừa số dòng, quá nữa thì cắt bằng dấu …
function fitLines(g, text, maxW, size, lines, weight) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return { size, rows: [] };
  const wrap = sz => {
    g.font = `${weight} ${sz}px ${FRAME_FONT}`;
    const rows = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { rows.push(cur); cur = w; } });
    if (cur) rows.push(cur); return rows;
  };
  let sz = size, rows = wrap(sz);
  while (rows.length > lines && sz > size * 0.6) { sz = Math.round(sz * 0.92); rows = wrap(sz); }
  if (rows.length > lines) { rows = rows.slice(0, lines); let last = rows[lines - 1]; while (last && g.measureText(last + '…').width > maxW) last = last.replace(/\s*\S+$/, ''); rows[lines - 1] = (last || rows[lines - 1]) + '…'; }
  return { size: sz, rows };
}
function drawTextBlock(g, spec, text, W, H, st, weight, shadow) {
  if (!spec || !String(text || '').trim()) return;
  const size = Math.round(spec.size * W), x = spec.x * W, y = spec.y * H, maxW = spec.w * W;
  const { size: sz, rows } = fitLines(g, text, maxW, size, spec.lines || 2, weight);
  g.save(); g.font = `${weight} ${sz}px ${FRAME_FONT}`; g.textBaseline = 'top';
  g.fillStyle = spec.color === 'accent' ? st.accent : spec.color === 'brand' ? st.color : spec.color || '#ffffff';
  if (shadow) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = Math.round(W / 120); g.shadowOffsetY = Math.round(W / 540); }
  rows.forEach((r, i) => g.fillText(r, x, y + i * sz * 1.22));
  g.restore();
}
// Vẽ ảnh đã ghép frame; scale < 1 để xem trước nhanh. Trả data URL JPEG.
export async function renderFramed(fr, v, title, sub, scale) {
  const k = scale || 1; const [W0, H0] = AC.FRAME_RATIOS[fr.ratio] || [1080, 1080];
  const W = Math.round(W0 * k), H = Math.round(H0 * k); const st = AC.frameStyleOf(S);
  try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load(`700 40px ${FRAME_FONT}`), document.fonts.load(`500 40px ${FRAME_FONT}`)]); } catch (e) { /* dùng font dự phòng */ }
  const [img, over] = await Promise.all([loadImg(versionImgSrc(v, fr.ratio)), fr.kind === 'png' ? loadImg(fr.src) : null]);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const style = fr.kind === 'png' ? 'png' : fr.style;
  g.fillStyle = style === 'card' || style === 'cover' ? st.color : '#111'; g.fillRect(0, 0, W, H);
  const p = fr.photo, px = p.x * W, py = p.y * H, pw = p.w * W, ph = p.h * H;
  g.save();
  if (style === 'card') { roundRectPath(g, px, py, pw, ph, W * 0.025); g.clip(); }
  drawCover(g, img, px, py, pw, ph); g.restore();
  if (style === 'band') { g.fillStyle = st.color; g.fillRect(0, H * 0.75, W, H * 0.25); g.fillStyle = st.accent; g.fillRect(W * 0.06, H * 0.75 + H * 0.012, W * 0.12, Math.max(2, H * 0.008)); }
  if (style === 'story') { const gr = g.createLinearGradient(0, H * 0.45, 0, H); gr.addColorStop(0, hexAlpha(st.color, 0)); gr.addColorStop(0.45, hexAlpha(st.color, 0.82)); gr.addColorStop(1, hexAlpha(st.color, 0.96)); g.fillStyle = gr; g.fillRect(0, H * 0.45, W, H * 0.55); }
  if (style === 'thumb') { const gr = g.createLinearGradient(0, 0, W * 0.72, 0); gr.addColorStop(0, 'rgba(0,0,0,.82)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = st.accent; g.fillRect(W * 0.05, H * 0.15, W * 0.08, Math.max(2, H * 0.012)); }
  if (style === 'cover' || style === 'card') { g.fillStyle = st.accent; const t = fr.title; g.fillRect(t.x * W, t.y * H - H * 0.04, W * 0.07, Math.max(2, H * (style === 'cover' ? 0.012 : 0.007))); }
  if (over) g.drawImage(over, 0, 0, W, H);
  const shadow = style === 'story' || style === 'thumb' || style === 'png';
  drawTextBlock(g, fr.title, title, W, H, st, 700, shadow);
  drawTextBlock(g, fr.sub, sub, W, H, st, 500, shadow);
  if (style !== 'png' && st.logo) { // nhãn tên thương hiệu góc trên
    const fs = Math.round(W * 0.024); g.font = `700 ${fs}px ${FRAME_FONT}`;
    const tw = g.measureText(st.logo).width, padX = fs * 0.8, bh = fs * 1.9, bx = style === 'cover' ? W * 0.6 : W * 0.045, by = H * (style === 'story' ? 0.03 : 0.045);
    g.fillStyle = style === 'cover' ? hexAlpha('#ffffff', 0.14) : st.color; roundRectPath(g, bx, by, tw + padX * 2, bh, bh / 2); g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.fillText(st.logo, bx + padX, by + bh / 2);
  }
  return c.toDataURL('image/jpeg', 0.85);
}
function i2iFilter(f) { return `brightness(${f.brightness.toFixed(2)}) contrast(${f.contrast.toFixed(2)}) saturate(${f.saturate.toFixed(2)}) hue-rotate(${Math.round(f.hue)}deg) sepia(${f.sepia.toFixed(2)}) grayscale(${f.grayscale})${f.blur ? ` blur(${f.blur.toFixed(1)}px)` : ''}`; }
// Biến đổi ảnh thật theo bộ lọc (mô phỏng), cạnh dài tối đa 1280px
async function renderI2I(v, look) {
  const img = await loadImg(v.src); const iw = img.naturalWidth, ih = img.naturalHeight; const k = Math.min(1, 1280 / Math.max(iw, ih));
  const c = document.createElement('canvas'); c.width = Math.round(iw * k); c.height = Math.round(ih * k); const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.filter = i2iFilter(Object.assign({}, look, { blur: look.blur * c.width / 400 }));
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}
// Chỗ gắn API Image to Image thật: nhận phiên bản ảnh + yêu cầu, trả { src } (data URL) hoặc {} khi chỉ mô phỏng.
// Ảnh mô phỏng (không có src) trả {}: logic tự sinh hình mô phỏng mới.
async function i2iEngine(v, prompt, strength, ratio) {
  if (AC.imageApiOn(S)) { const out = await imageApiCall('i2i', { prompt, strength, ratio, image: await versionToDataUrl(v) }); return { src: out.src, ai: out.ai }; }
  if (!v.src) return {};
  return { src: await renderI2I(v, AC.i2iLook(prompt, strength)) };
}
export function curVersion(a) { return a && a.versions.find(x => x.n === a.current); }
// Dung lượng dữ liệu đang lưu (localStorage khoảng 5 triệu ký tự)
export function storeUse() { const n = stateJson(null).length; return { n, pct: Math.min(100, Math.round(n / 5e6 * 100)) }; }
export function afterImageDialog(s, msg) {
  closeLayer(); save(); render(); if (pvRefresh && pvRefresh(s.id)) {} else openSlot(s.id);
  const u = storeUse(); toast(msg + (u.pct >= 80 ? ` Bộ nhớ trình duyệt đã dùng ${u.pct}%: nên Sao lưu và xoá bớt ảnh cũ.` : ''), u.pct >= 80 ? 'bad' : undefined);
}
// Mở hộp thoại theo nút trên ảnh; trả true nếu đã xử lý
export function slotImageDialog(s, x, i) {
  if (x === 'img-gen' && AC.imageApiOn(S)) { apiGenImage(s, i); return true; }
  if (x === 'img-edit') { openImageEditor(s, i); return true; }
  if (x === 'img-prompt') { const lk = AC.slotLockMsg(S, s); if (lk) toast(lk, 'bad'); else openPromptDialog(s, i); return true; }
  if (!['img-frame', 'img-i2i', 'img-text', 'img-crop', 'img-tpl', 'img-lib', 'img-fit', 'vid-cover', 'vid-subs'].includes(x)) return false;
  const a = s.assets[i]; const v = curVersion(a);
  const lock = AC.slotLockMsg(S, s); if (lock) { toast(lock, 'bad'); return true; }
  if (x === 'vid-cover' || x === 'vid-subs') { if (!v || v.kind !== 'video') { toast('Ô này chưa có video.', 'bad'); return true; } (x === 'vid-cover' ? openCoverDialog : openSubsDialog)(s, i); return true; }
  if (x === 'img-lib') { if (a && assetKind(a) === 'video' && v) { toast('Kho chỉ chứa ảnh; ô này đang là video.', 'bad'); return true; } openLibraryPicker(s, i); return true; }
  if (!v || v.kind === 'video') { toast(v ? 'Chỉ dùng cho ảnh, không dùng cho video.' : 'Ô chưa có ảnh.', 'bad'); return true; }
  if (x === 'img-fit') { fitImageToRatio(s, i); return true; }
  ({ 'img-frame': openFrameDialog, 'img-text': openTextDialog, 'img-crop': openCropDialog, 'img-tpl': openTemplateDialog, 'img-i2i': openI2IDialog })[x](s, i);
  return true;
}

export function openFrameDialog(s, i) {
  const a = s.assets[i], v = curVersion(a), ratio = AC.assetRatioOf(a), list = AC.framesFor(S, ratio);
  const st = { id: list[0].id, title: AC.frameTitleHint(s), sub: '' };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Ghép frame · ${esc(a.name)} · bản v${v.n}</span><h2>Ghép frame vào ảnh</h2><p class="small muted">Chọn frame, sửa chữ rồi Xác nhận. Ảnh ghép thành một phiên bản mới; bản gốc v${v.n} vẫn giữ. Frame của công ty thêm ở Thiết lập → Frame ảnh.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="fr-dlg">
      <div class="stack" style="gap:8px;min-width:0"><span class="small muted">Frame (cùng tỉ lệ ô ảnh “${esc(AC.FRAME_RATIO_LABEL[ratio])}” xếp trước; frame khác tỉ lệ sẽ đổi tỉ lệ ô)</span>
        <div class="fr-grid" role="radiogroup" aria-label="Chọn frame">${list.map(f => `<button class="fr-opt ${f.ratio === ratio ? '' : 'off'}" role="radio" aria-checked="${f.id === st.id}" data-fr="${esc(f.id)}"><img data-frprev="${esc(f.id)}" alt=""><span class="small"><b>${esc(f.name)}</b><br><span class="faint">${esc(AC.FRAME_RATIO_LABEL[f.ratio])}${f.kind === 'png' ? ' · của công ty' : ''}</span></span></button>`).join('')}</div>
        <div class="field"><label for="fr-title">Tiêu đề trên ảnh</label><textarea id="fr-title" rows="2" maxlength="120">${esc(st.title)}</textarea></div>
        <div class="field"><label for="fr-sub">Phụ đề</label><input id="fr-sub" maxlength="80" placeholder="Ví dụ: website, hotline hoặc lời kêu gọi" value=""></div>
      </div>
      <div class="stack" style="gap:8px"><span class="small muted">Xem trước</span><div class="fr-prev" id="fr-prev"><span class="small faint">Đang dựng…</span></div></div>
    </div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="fr-ok">Xác nhận ghép</button></div>`, 'dialog');
  box.classList.add('wide');
  const frame = () => AC.frameOf(S, st.id);
  let tok = 0, tm = null;
  const preview = async () => {
    const my = ++tok; const f = frame(); const el = box.querySelector('#fr-prev');
    try { const src = await renderFramed(f, v, st.title, st.sub, 0.5); if (my === tok) { el.innerHTML = `<img src="${src}" alt="Xem trước ảnh ghép frame ${esc(f.name)}">`; } }
    catch (e) { if (my === tok) el.innerHTML = '<span class="small err">Không dựng được ảnh xem trước.</span>'; }
  };
  const later = () => { clearTimeout(tm); tm = setTimeout(preview, 200); };
  // ảnh nhỏ của từng frame với chính ảnh này
  box.querySelectorAll('[data-frprev]').forEach(async im => { try { im.src = await renderFramed(AC.frameOf(S, im.dataset.frprev), v, st.title, '', 0.2); } catch (e) { /* bỏ qua */ } });
  box.addEventListener('click', e => { const o = e.target.closest('[data-fr]'); if (!o) return; st.id = o.dataset.fr; box.querySelectorAll('[data-fr]').forEach(b => b.setAttribute('aria-checked', String(b === o))); preview(); });
  box.querySelector('#fr-title').addEventListener('input', e => { st.title = e.target.value; later(); });
  box.querySelector('#fr-sub').addEventListener('input', e => { st.sub = e.target.value; later(); });
  box.querySelector('#fr-ok').addEventListener('click', async e => {
    const b = e.currentTarget; const f = frame();
    if (f.ratio !== ratio && !(await confirmBox({ title: 'Đổi tỉ lệ ô ảnh?', body: `<p>Frame “${esc(f.name)}” là ${esc(AC.FRAME_RATIO_LABEL[f.ratio])}, còn ô này đang là ${esc(AC.FRAME_RATIO_LABEL[ratio])}. Ghép sẽ đổi tỉ lệ ô sang ${esc(AC.FRAME_RATIO_LABEL[f.ratio])}; nền tảng của slot có thể cắt ảnh.</p>`, ok: 'Đổi tỉ lệ và ghép' }))) return;
    b.disabled = true; b.textContent = 'Đang ghép…';
    try {
      const src = await renderFramed(f, v, st.title, st.sub, 1);
      const r = AC.addSlotImageVersion(S, s.id, i, { src, ext: 'jpg', frame: { id: f.id, name: f.name, from: v.n, title: st.title.trim(), sub: st.sub.trim() } });
      if (!r.ok) { b.disabled = false; b.textContent = 'Xác nhận ghép'; return toast(r.error, 'bad'); }
      if (f.ratio !== ratio) AC.setAssetRatio(S, s.id, i, f.ratio);
      afterImageDialog(s, `Đã ghép frame “${f.name}”, thành phiên bản ${r.version}. Bản gốc v${v.n} vẫn giữ.`);
    } catch (err) { b.disabled = false; b.textContent = 'Xác nhận ghép'; toast('Không ghép được frame: ' + err.message, 'bad'); }
  });
  preview();
}

const I2I_PRESETS = ['Làm sáng hơn', 'Tông ấm cổ điển', 'Tông lạnh xanh', 'Đen trắng', 'Tương phản mạnh', 'Nhẹ nhàng pastel', 'Màu rực rỡ', 'Xoá phông nền'];
export function openI2IDialog(s, i) {
  const a = s.assets[i], v = curVersion(a);
  const st = { prompt: '', strength: 0.5 };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Image to Image · ${AC.imageApiOn(S) ? 'qua ' + esc(providerLabel()) : 'mô phỏng'} · ${esc(a.name)} · bản v${v.n}</span><h2>Biến đổi ảnh theo yêu cầu</h2><p class="small muted">${AC.imageApiOn(S) ? `Ảnh đang dùng và yêu cầu được gửi tới ${esc(providerLabel())} để vẽ lại (tính phí theo nhà cung cấp). Ô bên phải chỉ xem gần đúng; ảnh thật có sau khi tạo.` : v.src ? 'Bản MVP biến đổi ảnh bằng bộ lọc màu theo từ khoá của yêu cầu (sáng, tối, ấm, lạnh, đen trắng, tương phản, pastel, xoá phông).' : 'Ảnh này là ảnh mô phỏng: bản MVP sinh một hình mô phỏng mới nối từ ảnh cũ.'} ${AC.imageApiOn(S) ? '' : 'Muốn AI vẽ lại thật: Setup → AI ảnh & video.'} Kết quả thành phiên bản mới; bản v${v.n} vẫn giữ.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="fr-dlg">
      <div class="stack" style="gap:8px;min-width:0">
        <div class="field"><label for="i2i-prompt">Yêu cầu</label><textarea id="i2i-prompt" rows="3" maxlength="300" placeholder="Ví dụ: tông ấm cổ điển, làm sáng hơn"></textarea></div>
        <div class="row" style="gap:6px;flex-wrap:wrap" aria-label="Gợi ý">${I2I_PRESETS.map(p => `<button class="btn sm" data-i2p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <div class="field"><label for="i2i-str">Mức biến đổi: <b id="i2i-strv">50%</b></label><input id="i2i-str" type="range" min="10" max="100" step="10" value="50"></div>
      </div>
      <div class="stack" style="gap:8px"><span class="small muted">Trước · Sau (gần đúng)</span><div class="i2i-pair"><div class="imgbox">${imgVisual(v, false, AC.assetRatioOf(a))}</div><div class="imgbox" id="i2i-after">${imgVisual(v, false, AC.assetRatioOf(a))}</div></div></div>
    </div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="i2i-ok" disabled>Tạo phiên bản mới</button></div>`, 'dialog');
  box.classList.add('wide');
  const ta = box.querySelector('#i2i-prompt'), ok = box.querySelector('#i2i-ok'), after = box.querySelector('#i2i-after');
  const upd = () => {
    ok.disabled = !st.prompt.trim();
    after.firstElementChild.style.filter = st.prompt.trim() ? i2iFilter(AC.i2iLook(st.prompt, st.strength)) : '';
  };
  ta.addEventListener('input', () => { st.prompt = ta.value; upd(); });
  box.querySelector('#i2i-str').addEventListener('input', e => { st.strength = Number(e.target.value) / 100; box.querySelector('#i2i-strv').textContent = e.target.value + '%'; upd(); });
  box.addEventListener('click', e => { const c = e.target.closest('[data-i2p]'); if (!c) return; const t = c.dataset.i2p; st.prompt = st.prompt.trim() ? `${st.prompt.trim()}, ${t.toLowerCase()}` : t; ta.value = st.prompt; upd(); });
  ok.addEventListener('click', async () => {
    ok.disabled = true; ok.textContent = 'Đang tạo…';
    try {
      const out = await i2iEngine(v, st.prompt, st.strength, AC.assetRatioOf(a));
      const r = AC.i2iSlotImage(S, s.id, i, { prompt: st.prompt, strength: st.strength, src: out.src, ai: out.ai });
      if (!r.ok) { ok.disabled = false; ok.textContent = 'Tạo phiên bản mới'; return toast(r.error, 'bad'); }
      afterImageDialog(s, `Đã tạo phiên bản ${r.version} bằng Image to Image (${out.ai ? 'qua ' + providerLabel() : 'mô phỏng'}).`);
    } catch (err) { ok.disabled = false; ok.textContent = 'Tạo phiên bản mới'; toast('Không biến đổi được ảnh: ' + err.message, 'bad'); }
  });
}

// ---------- Thiết lập → Frame ảnh ----------
const FR_SAMPLE = { n: 1, seed: 137, kind: 'image' };
const frThumbCache = new Map();
// Ảnh mẫu của các frame trong Thiết lập (vẽ sau mỗi lần render)
export function paintFrameThumbs(root) {
  const st = JSON.stringify(AC.frameStyleOf(S));
  root.querySelectorAll('img[data-frthumb]').forEach(async im => {
    const f = AC.frameOf(S, im.dataset.frthumb); if (!f) return;
    const key = `${f.id}|${st}|${f.src ? f.src.length : 0}|${JSON.stringify([f.photo, f.title, f.sub])}`;
    if (!frThumbCache.has(key)) frThumbCache.set(key, renderFramed(f, FR_SAMPLE, 'Tiêu đề mẫu trên ảnh của bài', 'Phụ đề mẫu', 0.3).catch(() => ''));
    const src = await frThumbCache.get(key); if (src && im.isConnected) im.src = src;
  });
}
const FR_DRAFT0 = () => ({ name: '', ratio: '1:1', src: '', photo: { x: 0, y: 0, w: 1, h: 1 }, title: { x: 0.06, y: 0.8, w: 0.88, size: 0.055, color: '#ffffff', lines: 2 }, sub: { x: 0.06, y: 0.93, w: 0.88, size: 0.03, color: '#ffffff', lines: 1 } });
export function framesTab() {
  const st = AC.frameStyleOf(S); const d = view.frDraft; const u = storeUse();
  const pct = (o, k) => Math.round(o[k] * 1000) / 10;
  const num = (grp, k, label) => `<div class="field"><label for="frd-${grp}-${k}">${label}</label><input id="frd-${grp}-${k}" type="number" min="0" max="100" step="0.5" value="${pct(d[grp], k)}" data-input="frd" data-g="${grp}" data-k="${k}"></div>`;
  return `<p class="muted">Frame là khung cố định của công ty ghép lên ảnh của slot (nút Frame trên ảnh khi xem slot). Khung dựng sẵn dùng màu thương hiệu dưới đây; khung riêng là ảnh PNG nền trong suốt, chừa trống vùng đặt ảnh.</p>
    <section class="card stack"><h3>Màu và nhãn của khung dựng sẵn</h3>
      <div class="row" style="gap:16px;align-items:flex-end;flex-wrap:wrap">
        <div class="field"><label for="frs-color">Màu chính</label><input id="frs-color" type="color" value="${esc(st.color)}"></div>
        <div class="field"><label for="frs-accent">Màu nhấn</label><input id="frs-accent" type="color" value="${esc(st.accent)}"></div>
        <div class="field" style="flex:1;min-width:200px"><label for="frs-logo">Nhãn thương hiệu trên ảnh (để trống thì không hiện)</label><input id="frs-logo" maxlength="40" value="${esc(st.logo)}"></div>
        <button class="btn" data-act="frs-save">Lưu màu</button>
      </div></section>
    <section class="stack"><h3>Danh sách frame</h3><div class="fr-list">${AC.framesOf(S).map(f => `<div class="fr-card"><img data-frthumb="${esc(f.id)}" alt="Mẫu frame ${esc(f.name)}" style="aspect-ratio:${AC.FRAME_RATIOS[f.ratio].join(' / ')}"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:nowrap"><span class="small"><b>${esc(f.name)}</b><br><span class="faint">${esc(AC.FRAME_RATIO_LABEL[f.ratio])} · ${f.kind === 'png' ? 'của công ty' : 'dựng sẵn'}</span></span>${f.kind === 'png' ? `<button class="btn sm ghost danger" data-act="fr-del" data-id="${esc(f.id)}" aria-label="Xoá frame ${esc(f.name)}">Xoá</button>` : ''}</div></div>`).join('')}</div></section>
    <section class="card stack"><h3>Thêm frame của công ty</h3>
      ${d ? `<div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="flex:1;min-width:180px"><label for="frd-name">Tên frame</label><input id="frd-name" value="${esc(d.name)}" data-input="frd" data-k="name" maxlength="60"></div>
          <div class="field"><label for="frd-ratio">Tỉ lệ</label><select id="frd-ratio" data-change="frd" data-k="ratio">${Object.keys(AC.FRAME_RATIOS).map(r => `<option value="${r}" ${d.ratio === r ? 'selected' : ''}>${esc(AC.FRAME_RATIO_LABEL[r])}</option>`).join('')}</select></div>
          <label class="btn" for="frd-file">${icon('upload')} ${d.src ? 'Đổi ảnh PNG' : 'Chọn ảnh PNG'}</label><input id="frd-file" type="file" accept="image/png,image/webp" class="sr" data-change="frd-file"></div>
        <div class="fr-edit"><div class="fr-prev" id="frd-prev">${d.src ? '' : '<span class="small faint">Chọn ảnh PNG để xem trước</span>'}</div>
          <div class="stack" style="gap:10px"><p class="small muted">Toạ độ tính theo % khổ ảnh, gốc ở góc trên trái.</p>
            <div class="fr-nums"><b class="small">Vùng đặt ảnh</b>${num('photo', 'x', 'Trái')}${num('photo', 'y', 'Trên')}${num('photo', 'w', 'Rộng')}${num('photo', 'h', 'Cao')}</div>
            <div class="fr-nums"><b class="small">Tiêu đề</b>${num('title', 'x', 'Trái')}${num('title', 'y', 'Trên')}${num('title', 'w', 'Rộng')}${num('title', 'size', 'Cỡ chữ')}<div class="field"><label for="frd-title-color">Màu</label><input id="frd-title-color" type="color" value="${esc(d.title.color.slice(0, 7))}" data-change="frd" data-g="title" data-k="color"></div></div>
            <div class="fr-nums"><b class="small">Phụ đề</b>${num('sub', 'x', 'Trái')}${num('sub', 'y', 'Trên')}${num('sub', 'w', 'Rộng')}${num('sub', 'size', 'Cỡ chữ')}<div class="field"><label for="frd-sub-color">Màu</label><input id="frd-sub-color" type="color" value="${esc(d.sub.color.slice(0, 7))}" data-change="frd" data-g="sub" data-k="color"></div></div>
          </div></div>
        <span class="err" id="frd-err" role="alert"></span>
        <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn ghost" data-act="frd-cancel">Hủy</button><button class="btn primary" data-act="frd-save">Lưu frame</button></div>`
      : `<div class="row"><button class="btn" data-act="frd-new">${icon('plus')} Thêm frame PNG</button><span class="small faint">Ảnh PNG được thu về đúng khổ của tỉ lệ đã chọn.</span></div>`}
    </section>
    ${designTplSection()}
    <p class="small ${u.pct >= 80 ? 'err' : 'faint'}">Dữ liệu đang lưu trong trình duyệt: khoảng ${fmtNum(Math.round(u.n / 1024))} KB, ${u.pct}% sức chứa ước tính. Ảnh tải lên, ảnh ghép frame và frame PNG chiếm nhiều chỗ nhất.</p>`;
}
export function paintFrameDraft() {
  const d = view.frDraft, el = document.querySelector('#frd-prev'); if (!d || !el || !d.src) return;
  const f = Object.assign({ id: 'draft', kind: 'png' }, d);
  renderFramed(f, FR_SAMPLE, 'Tiêu đề mẫu trên ảnh của bài', 'Phụ đề mẫu', 0.4).then(src => { if (el.isConnected) el.innerHTML = `<img src="${src}" alt="Xem trước frame">`; }).catch(() => { el.innerHTML = '<span class="small err">Không dựng được xem trước.</span>'; });
}
ACTIONS['frs-save'] = () => {
  const r = AC.setFrameStyle(S, { color: $('#frs-color').value, accent: $('#frs-accent').value, logo: $('#frs-logo').value });
  if (!r.ok) return toast(r.error, 'bad'); frThumbCache.clear(); commit('Đã lưu màu frame.');
};
ACTIONS['fr-del'] = async el => {
  const f = AC.frameOf(S, el.dataset.id); if (!f) return;
  if (!(await confirmBox({ title: 'Xoá frame?', body: `<p>Xoá frame “${esc(f.name)}”. Các ảnh đã ghép bằng frame này vẫn giữ nguyên.</p>`, ok: 'Xoá', danger: true }))) return;
  const r = AC.deleteFrame(S, f.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã xoá frame.');
};
ACTIONS['frd-new'] = () => { view.frDraft = FR_DRAFT0(); render(); };
ACTIONS['frd-cancel'] = () => { view.frDraft = null; render(); };
ACTIONS['frd-save'] = () => {
  const d = view.frDraft; if (!d) return;
  const r = AC.saveFrame(S, d); if (!r.ok) { const e = $('#frd-err'); if (e) e.textContent = r.error; return; }
  view.frDraft = null; commit(`Đã lưu frame “${r.frame.name}”.`);
};
INPUTS['frd'] = el => {
  const d = view.frDraft; if (!d) return;
  if (!el.dataset.g) { d[el.dataset.k] = el.value; return; }
  const v = Math.min(100, Math.max(0, Number(el.value) || 0)) / 100; d[el.dataset.g][el.dataset.k] = v; paintFrameDraft();
};
CHANGES['frd'] = el => {
  const d = view.frDraft; if (!d) return;
  if (el.dataset.g) { d[el.dataset.g][el.dataset.k] = el.value; paintFrameDraft(); return; }
  d[el.dataset.k] = el.value; render();
};
// PNG frame: thu về đúng khổ của tỉ lệ (giữ nền trong suốt)
CHANGES['frd-file'] = el => {
  const file = el.files && el.files[0]; const d = view.frDraft; if (!file || !d) return;
  if (!/^image\/(png|webp)$/.test(file.type)) return toast('Frame cần là ảnh PNG (hoặc WebP) có nền trong suốt.', 'bad');
  const rd = new FileReader();
  rd.onload = async () => {
    try {
      const img = await loadImg(rd.result); const [W, H] = AC.FRAME_RATIOS[d.ratio];
      const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
      d.src = c.toDataURL('image/png'); if (!d.name) d.name = file.name.replace(/\.\w+$/, '').slice(0, 60);
      if (Math.abs(img.naturalWidth / img.naturalHeight - W / H) > 0.02) toast(`Ảnh có tỉ lệ khác ${AC.FRAME_RATIO_LABEL[d.ratio]}: đã kéo về đúng khổ ${W}×${H}.`);
      render();
    } catch (e) { toast('Không đọc được ảnh PNG.', 'bad'); }
  };
  rd.readAsDataURL(file);
};
