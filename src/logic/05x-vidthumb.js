// ---------- 05x · Short Vid: Thumbnail của video (mục 10.87) ----------
// Mỗi thẻ Vid có một ô Thumbnail nhiều phiên bản (v.thumb = { current, versions:[{ n, src, kind, sid?, name, at }] }), như ô ảnh của slot.
// Chưa có phiên bản nào thì dùng bìa của video Up ngoài app (nếu có), không thì ảnh hệ thống TỰ SINH từ hình cảnh đầu và tiêu đề.
// Thumbnail đang dùng cũng là ẢNH BÌA của video khi xếp vào Slot: đổi thumbnail thì bìa ở các slot chưa đăng đổi theo.
import { byId, isLocked, log } from './05-model.js';
import { vidSlotsOf } from './05t-videdit.js';

export const THUMB_MAX = 12;
export const THUMB_KINDS = { auto: 'Tự sinh', scene: 'Cảnh', up: 'Ảnh Up', lib: 'Từ Kho', crop: 'Cắt 9:16', gen: 'Gen AI', file: 'Bìa video Up' };
const vidGet = (S, id) => byId(S.videos || [], id);
const xml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);/;

// Ảnh đại diện của một cảnh: hình đầu tiên (ảnh, hoặc ảnh thu nhỏ của clip)
export function sceneImageSrc(v, sc) {
  for (const it of (sc && sc.items) || []) {
    const m = it.mediaId ? (v.media || []).find(x => x.id === it.mediaId) : null;
    const src = it.kind === 'image' ? (m ? m.src : it.src) : (m ? m.thumb : it.thumb);
    if (IMG_RE.test(src || '')) return src;
  }
  return '';
}
export const thumbScenes = v => ((v.edit && v.edit.scenes) || []).map((sc, i) => ({ i, sid: sc.id, src: sceneImageSrc(v, sc) }));
// Ảnh tự sinh (SVG 9:16): nền là hình cảnh đầu có hình (nếu có), dải tối phía dưới ghi tiêu đề
export function autoThumbSrc(v) {
  const bg = thumbScenes(v).map(x => x.src).find(Boolean) || '';
  const words = String((v.insight && v.insight.title) || 'Video').trim().split(/\s+/); const lines = [''];
  for (const w of words) { const l = lines[lines.length - 1]; if ((l + ' ' + w).trim().length > 18 && l) { if (lines.length === 3) { lines[2] += '…'; break; } lines.push(w); } else lines[lines.length - 1] = (l + ' ' + w).trim(); }
  const y0 = 480 - 26 - lines.length * 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="270" height="480" viewBox="0 0 270 480"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a5c"/><stop offset="1" stop-color="#121a2c"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient></defs>`
    + `<rect width="270" height="480" fill="url(#g)"/>${bg ? `<image href="${xml(bg)}" xlink:href="${xml(bg)}" x="0" y="0" width="270" height="480" preserveAspectRatio="xMidYMid slice"/>` : ''}`
    + `<rect y="${y0 - 40}" width="270" height="${520 - y0}" fill="url(#b)"/>`
    + lines.map((l, k) => `<text x="16" y="${y0 + 22 + k * 30}" font-family="system-ui,sans-serif" font-size="23" font-weight="700" fill="#fff">${xml(l)}</text>`).join('')
    + '</svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
// Thumbnail đang dùng: { src, kind, n (0 = chưa có phiên bản), total, label }
export function vidThumbOf(v) {
  const t = v && v.thumb; const cur = t && t.versions.find(x => x.n === t.current);
  if (cur) return { src: cur.src, kind: cur.kind, n: cur.n, total: t.versions.length, label: thumbLabel(v, cur) };
  if (v && v.file && v.file.cover && v.file.cover.src) return { src: v.file.cover.src, kind: 'file', n: 0, total: 0, label: THUMB_KINDS.file };
  return { src: autoThumbSrc(v || {}), kind: 'auto', n: 0, total: 0, label: `${THUMB_KINDS.auto} (mặc định)` };
}
export function thumbLabel(v, x) {
  if (x.kind === 'scene') { const i = ((v.edit && v.edit.scenes) || []).findIndex(s => s.id === x.sid); return `${THUMB_KINDS.scene}${i >= 0 ? ' ' + (i + 1) : ''}`; }
  return THUMB_KINDS[x.kind] || x.kind;
}
// Đồng bộ bìa ở các slot video chưa đăng (tuần chưa chốt) theo thumbnail đang dùng; trả về số slot đã đổi
export function syncVidThumb(S, v) {
  const th = vidThumbOf(v); let n = 0;
  vidSlotsOf(S, v.id).forEach(s => {
    if (s.state === 'PUBLISHED' || isLocked(S, s.weekId)) return;
    s.assets.forEach(a => { const ver = a.versions.find(x => x.n === a.current); if (!ver || ver.kind !== 'video') return; ver.cover = { src: th.src, t: null, at: S.settings.demoNow, thumb: th.kind }; n++; });
  });
  return n;
}
export function addVidThumb(S, id, p) {
  const v = vidGet(S, id); const P = p || {}; if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (v.cancelled) return { ok: false, error: 'Thẻ đã hủy.' };
  const kind = THUMB_KINDS[P.kind] && P.kind !== 'file' ? P.kind : 'up';
  const src = String(P.src || '');
  if (!(IMG_RE.test(src) || (kind === 'auto' && src.startsWith('data:image/svg+xml;')))) return { ok: false, error: 'Thumbnail phải là ảnh PNG, JPEG, WebP hoặc GIF.' };
  const t = v.thumb || { current: 0, versions: [] };
  if (t.versions.length >= THUMB_MAX) return { ok: false, error: `Tối đa ${THUMB_MAX} bản thumbnail. Xóa bớt bản cũ trước.` };
  const n = t.versions.reduce((m, x) => Math.max(m, x.n), 0) + 1;
  const x = { n, src, kind, name: String(P.name || '').slice(0, 120), at: S.settings.demoNow }; if (kind === 'scene' && P.sid) x.sid = P.sid;
  t.versions.push(x); t.current = n; v.thumb = t;
  const slots = syncVidThumb(S, v); log(S, 'vid-thumb', 'video', id, `bản ${n} · ${thumbLabel(v, x)}`);
  return { ok: true, version: n, slots };
}
export const addAutoThumb = (S, id) => { const v = vidGet(S, id); return v ? addVidThumb(S, id, { src: autoThumbSrc(v), kind: 'auto', name: 'thumbnail-tu-sinh.svg' }) : { ok: false, error: 'Không thấy thẻ Vid.' }; };
export function addSceneThumb(S, id, sid) {
  const v = vidGet(S, id); const sc = v && ((v.edit && v.edit.scenes) || []).find(s => s.id === sid); if (!sc) return { ok: false, error: 'Không thấy cảnh.' };
  const src = sceneImageSrc(v, sc); if (!src) return { ok: false, error: 'Cảnh này chưa có hình.' };
  return addVidThumb(S, id, { src, kind: 'scene', sid, name: `canh-${v.edit.scenes.indexOf(sc) + 1}` });
}
// ‹ › : sang bản trước/sau
export function stepVidThumb(S, id, d) {
  const v = vidGet(S, id); const t = v && v.thumb; if (!t || !t.versions.length) return { ok: false, error: 'Chưa có bản thumbnail nào.' };
  const i = t.versions.findIndex(x => x.n === t.current) + d; if (i < 0 || i >= t.versions.length) return { ok: false, error: 'Không còn bản nào.' };
  t.current = t.versions[i].n; return { ok: true, version: t.current, slots: syncVidThumb(S, v) };
}
// Xóa bản đang xem; hết bản thì quay về ảnh mặc định
export function removeVidThumb(S, id) {
  const v = vidGet(S, id); const t = v && v.thumb; if (!t || !t.versions.length) return { ok: false, error: 'Chưa có bản thumbnail nào.' };
  const i = t.versions.findIndex(x => x.n === t.current); const gone = t.versions.splice(Math.max(0, i), 1)[0];
  if (t.versions.length) t.current = t.versions[Math.min(Math.max(0, i), t.versions.length - 1)].n; else delete v.thumb;
  log(S, 'vid-thumb', 'video', id, `xóa bản ${gone.n}`);
  return { ok: true, slots: syncVidThumb(S, v) };
}
