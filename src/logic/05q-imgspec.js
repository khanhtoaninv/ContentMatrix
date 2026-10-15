// ---------- Chuẩn ảnh theo nền tảng (mục 10.42) ----------
import { byId, log, slotLockMsg, unshareImage } from './05-model.js';
import { channelPlatform } from './05e-publish.js';
import { b64ToBytes } from './05f-export.js';
import { FRAME_RATIOS } from './05i-frames.js';
// Mỗi ô ảnh (a.ratio) mang một tỉ lệ lấy từ bảng chuẩn nền tảng; xem, sửa, Gen, xuất đều theo tỉ lệ đó.
export const IMG_RATIOS = ['1:1', '4:5', '9:16', '16:9', '1.91:1'];
export const RATIO_NUM = { '1:1': 1, '4:5': 0.8, '9:16': 9 / 16, '16:9': 16 / 9, '1.91:1': 1200 / 630 };
export const RATIO_CSS = { '1:1': '1 / 1', '4:5': '4 / 5', '9:16': '9 / 16', '16:9': '16 / 9', '1.91:1': '1200 / 630' };
export const PLATFORM_IMG_DEFAULT = { facebook: '1:1', instagram: '4:5', threads: '1:1', tiktok: '9:16', youtube: '16:9', blog: '1.91:1' };
// Bảng chuẩn (tham chiếu, theo hướng dẫn công khai của nền tảng; kiểm lại khi nền tảng đổi)
export const IMG_STANDARDS = [
  { platform: 'Facebook', use: 'Ảnh đơn trên bảng tin', ratios: ['1:1', '4:5', '1.91:1'], sizes: '1080×1080, 1080×1350, 1200×630', show: 'Hiện trọn ảnh tới 4:5; cao hơn thì cắt còn 4:5' },
  { platform: 'Facebook', use: 'Album nhiều ảnh', ratios: ['1:1', '4:5'], sizes: '1080×1080, 1080×1350', show: 'Bảng tin xếp lưới (cắt ô), mở ra xem trọn ảnh' },
  { platform: 'Facebook, Instagram', use: 'Reels, Story', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình; chừa vùng an toàn trên, dưới cho nút và chữ' },
  { platform: 'Instagram', use: 'Ảnh, carousel trên bảng tin', ratios: ['4:5', '1:1'], sizes: '1080×1350, 1080×1080', show: 'Hiện trọn; carousel lấy tỉ lệ slide đầu cho mọi slide; lưới trang cá nhân cắt 3:4' },
  { platform: 'Threads', use: 'Ảnh kèm bài', ratios: ['1:1', '4:5'], sizes: '1080×1080, 1080×1350', show: 'Hiện trọn ảnh' },
  { platform: 'TikTok', use: 'Video, ảnh bìa', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình; chừa vùng an toàn' },
  { platform: 'YouTube', use: 'Thumbnail, video ngang', ratios: ['16:9'], sizes: '1280×720 (thumbnail), 1920×1080 (video)', show: 'Trọn khung 16:9' },
  { platform: 'YouTube', use: 'Shorts', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình' },
  { platform: 'Blog', use: 'Ảnh bìa (chia sẻ, Google)', ratios: ['1.91:1'], sizes: '1200×630', show: 'Hiện trọn ở đầu bài và khi chia sẻ link' },
  { platform: 'Blog', use: 'Ảnh trong bài', ratios: ['16:9'], sizes: 'rộng từ 1200', show: 'Hiện trọn theo bề ngang bài' },
];
// Tỉ lệ ghi rõ trong tên ô ("1080×1080", "9:16", "ngang"…); không ghi thì rỗng
export function ratioFromName(name) {
  const n = String(name || '');
  const m = /\[(1:1|4:5|9:16|16:9|1\.91:1)\]/.exec(n); if (m) return m[1];
  if (/9\s*:\s*16|dọc/i.test(n)) return '9:16';
  if (/16\s*:\s*9|1280\s*×\s*720|ngang/i.test(n)) return '16:9';
  if (/1200\s*×\s*630/.test(n)) return '1.91:1';
  if (/1080\s*×\s*1350|4\s*:\s*5/.test(n)) return '4:5';
  if (/1080\s*×\s*1080|vuông|1\s*:\s*1/i.test(n)) return '1:1';
  return '';
}
export function imgDefaultRatio(S, channelId) {
  const d = S.settings && S.settings.imgDefaults && S.settings.imgDefaults[channelId]; if (RATIO_NUM[d]) return d;
  const ch = byId(S.channels, channelId); return (ch && PLATFORM_IMG_DEFAULT[channelPlatform(ch)]) || '1:1';
}
// Tỉ lệ của ô ảnh: đã ghi (a.ratio) → ghi trong tên → ảnh trong bài Blog 16:9 → mặc định của kênh
export function assetRatioFor(S, slot, a) {
  if (RATIO_NUM[a.ratio]) return a.ratio;
  return ratioFromName(a.name) || (a.blog ? '16:9' : imgDefaultRatio(S, slot.channelId));
}
// Không cần S (giao diện nhỏ lẻ): ô chưa được ghi tỉ lệ thì đoán theo tên
export function assetRatioOf(a) { return (a && RATIO_NUM[a.ratio] && a.ratio) || ratioFromName(a && a.name) || '1:1'; }
export function stampRatios(S, slot) { (slot.assets || []).forEach(a => { if (!RATIO_NUM[a.ratio]) a.ratio = assetRatioFor(S, slot, a); }); return slot; }
export function setAssetRatio(S, slotId, idx, ratio) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!RATIO_NUM[ratio]) return { ok: false, error: 'Tỉ lệ không hợp lệ.' };
  if (a.ratio !== ratio && a.shareId) unshareImage(S, slotId, idx); // đổi tỉ lệ thì tách khỏi nhóm dùng chung
  if (a.ratio !== ratio) { a.ratio = ratio; log(S, 'ratio-asset', 'slot', slotId, `${a.name} ${ratio}`); }
  return { ok: true };
}
export function setImgDefault(S, channelId, ratio) {
  if (!byId(S.channels, channelId)) return { ok: false, error: 'Không tìm thấy kênh.' };
  if (!RATIO_NUM[ratio]) return { ok: false, error: 'Tỉ lệ không hợp lệ.' };
  if (!S.settings.imgDefaults) S.settings.imgDefaults = {};
  S.settings.imgDefaults[channelId] = ratio; log(S, 'update', 'imgDefault', channelId, ratio);
  return { ok: true };
}

// ---- Kích thước thật của ảnh (đọc đầu tệp PNG, JPEG, GIF, WebP) ----
export function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b.length >= 30) { // RIFF....WEBP
    const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (t === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (t === 'VP8L') { const n = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: 1 + (n & 0x3fff), h: 1 + ((n >>> 14) & 0x3fff) }; }
    if (t === 'VP8 ') return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}
// Kích thước phiên bản ảnh: w, h đã ghi, hoặc đọc từ đầu tệp (chỉ ảnh, không phải video)
export function versionSize(v) {
  if (!v || v.kind === 'video') return null;
  if (v.w > 0 && v.h > 0) return { w: v.w, h: v.h };
  if (!v.src || !/^data:image\//.test(v.src)) return null;
  const i = v.src.indexOf(','); if (i < 0) return null;
  try { const sz = imageSize(b64ToBytes(v.src.slice(i + 1, i + 1 + 120000))); return sz && sz.w > 0 && sz.h > 0 ? sz : null; } catch (e) { return null; }
}
// Lệch tỉ lệ quá 3% so với ô thì coi là sai tỉ lệ
export function ratioMismatch(size, ratio) { return !!size && Math.abs(size.w / size.h / RATIO_NUM[ratio] - 1) > 0.03; }
export function nearestRatio(size) { let best = '1:1', d = 9; IMG_RATIOS.forEach(r => { const x = Math.abs(Math.log(size.w / size.h / RATIO_NUM[r])); if (x < d) { d = x; best = r; } }); return best; }
// Mỗi ô ảnh của slot: ảnh đang dùng có sai tỉ lệ hoặc nhỏ hơn chuẩn không
export function imageIssues(S, slot) {
  const out = [];
  (slot.assets || []).forEach((a, i) => {
    const v = a.versions.find(x => x.n === a.current); const sz = versionSize(v); if (!sz) return;
    const r = assetRatioFor(S, slot, a); const std = FRAME_RATIOS[r];
    if (ratioMismatch(sz, r)) out.push({ i, name: a.name, kind: 'ratio', ratio: r, size: sz, text: `Ảnh “${a.name}” là ${sz.w}×${sz.h}, ô cần ${r} (${std[0]}×${std[1]}). Nền tảng sẽ cắt ảnh; bấm Cắt về ${r}.` });
    else if (std && sz.w < std[0] * 0.9) out.push({ i, name: a.name, kind: 'small', ratio: r, size: sz, text: `Ảnh “${a.name}” rộng ${sz.w}px, chuẩn ${r} là ${std[0]}px; ảnh có thể bị mờ.` });
  });
  return out;
}
export function imageInfoOf(S, slot, a) {
  const v = a.versions.find(x => x.n === a.current); const sz = versionSize(v); const r = assetRatioFor(S, slot, a); const std = FRAME_RATIOS[r] || [0, 0];
  return { ratio: r, standard: `${std[0]}×${std[1]}`, width: sz ? sz.w : null, height: sz ? sz.h : null, ok: sz ? !ratioMismatch(sz, r) : null };
}
// Hình mô phỏng theo tỉ lệ ô: dùng chung cho giao diện (viewBox) và tệp SVG xuất ra
export function mockArt(seed, ratio) {
  const r = RATIO_NUM[ratio] || 1.5, W = 120, H = Math.round(W / r * 100) / 100;
  const h = seed % 360, h2 = (h + 50) % 360, k = Math.min(W, H) / 80;
  const rad = Math.min((18 + seed % 30) * k, W * 0.4), cx = W * (0.25 + (seed % 60) / 120), cy = H * (0.35 + (seed % 20) / 80);
  const num = x => Math.round(x * 100) / 100;
  return { W, H, inner: `<rect width="${W}" height="${H}" fill="hsl(${h} 45% 82%)"/><circle cx="${num(cx)}" cy="${num(cy)}" r="${num(rad)}" fill="hsl(${h2} 50% 62%)"/><rect x="0" y="${num(H * 0.725)}" width="${W}" height="${num(H * 0.275)}" fill="hsl(${h} 35% 55%)"/>` };
}
