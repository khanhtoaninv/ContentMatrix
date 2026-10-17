// ---------- UI · Short Vid: đọc tệp nguồn, đo khoảng lặng, chép lời (mục 10.75; hộp Tạo Vid tự do cũ đã thay bằng tab Nạp nguyên liệu ở 09e, mục 10.84) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { vidMax } from './04-week.js';
import { readImageFile } from './04i-studio.js';
import { apiFetch, keyFor } from './04j-media.js';

const mediaMeta = (el, src) => new Promise(res => {
  const done = () => res(el); const tm = setTimeout(done, 5000);
  el.addEventListener('loadedmetadata', () => { clearTimeout(tm); done(); }, { once: true });
  el.addEventListener('error', () => { clearTimeout(tm); done(); }, { once: true });
  el.preload = 'metadata'; el.muted = true; el.src = src;
});
async function videoThumb(vd) {
  try {
    await new Promise(res => { const t = Math.min(1, (isFinite(vd.duration) ? vd.duration : 0) / 2); const tm = setTimeout(res, 1500); vd.addEventListener('seeked', () => { clearTimeout(tm); res(); }, { once: true }); vd.currentTime = t; });
    if (!vd.videoWidth) return '';
    const k = 240 / Math.max(vd.videoWidth, vd.videoHeight); const c = document.createElement('canvas'); c.width = Math.round(vd.videoWidth * k); c.height = Math.round(vd.videoHeight * k);
    c.getContext('2d').drawImage(vd, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7);
  } catch (e) { return ''; }
}
// Đọc một tệp nguồn thành {src, name, size, dur, thumb}; video/audio tối đa vidMax(), ảnh thu nhỏ như ô ảnh
export async function readMedia(file) {
  if (/^image\//.test(file.type)) { const r = await readImageFile(file); return { src: r.src, name: file.name, size: file.size, dur: 0, thumb: r.src }; }
  if (!/^(video|audio)\//.test(file.type)) throw new Error(`${file.name}: không phải video, audio hoặc ảnh.`);
  if (file.size > vidMax()) throw new Error(`${file.name}: quá lớn (tối đa ${vidMax() / 1048576} MB vì lưu trong trình duyệt). Nén bớt hoặc cắt ngắn rồi nạp lại.`);
  const src = await new Promise((res, rej) => { const rd = new FileReader(); rd.onerror = () => rej(new Error(`Không đọc được ${file.name}.`)); rd.onload = () => res(String(rd.result)); rd.readAsDataURL(file); });
  const el = document.createElement(/^video\//.test(file.type) ? 'video' : 'audio'); await mediaMeta(el, src);
  const dur = isFinite(el.duration) ? el.duration : 0; const thumb = el.tagName === 'VIDEO' ? await videoThumb(el) : '';
  el.removeAttribute('src'); el.load && el.load();
  return { src, name: file.name, size: file.size, dur, thumb };
}
export async function readMediaList(files) { const out = []; for (const f of files) out.push(await readMedia(f)); return out; }
// Đo âm lượng thật trong trình duyệt (Web Audio): RMS mỗi 0,05 giây. Không giải mã được (clip không có tiếng) thì trả null.
export async function measureLevels(src) {
  const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
  let ctx = null;
  try {
    ctx = new Ctx(); const bytes = AC.dataUrlBytes(src);
    const buf = await Promise.race([ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), new Promise((_, rej) => setTimeout(() => rej(new Error('quá lâu')), 8000))]);
    const ch = buf.getChannelData(0), step = 0.05, n = Math.max(1, Math.round(buf.sampleRate * step)); const levels = [];
    for (let i = 0; i < ch.length; i += n) { let s = 0; const e = Math.min(ch.length, i + n); for (let k = i; k < e; k++) s += ch[k] * ch[k]; levels.push(Math.sqrt(s / Math.max(1, e - i))); }
    return { levels, step };
  } catch (e) { return null; } finally { try { if (ctx) ctx.close(); } catch (e) { /* bỏ qua */ } }
}
export async function findCuts(id) {
  const v = AC.byId(S.videos, id); const m = v && (v.media || []).find(x => x.kind === 'video'); if (!m) return { ok: false, error: 'Thẻ chưa có clip.' };
  const lv = await measureLevels(m.src);
  const cuts = lv ? AC.silenceCuts(lv.levels, lv.step) : AC.mockCuts(m.dur);
  AC.setVidCuts(S, id, cuts, !lv); return { ok: true, count: cuts.length, simulated: !lv };
}
// Chép lời bằng API nhận giọng nói (Setup → AI ảnh & video, OpenAI)
export const sttOk = () => !!(AC.IMAGE_PROVIDERS[AC.imageApiOf(S).provider] || {}).stt;
export async function transcribe(src) {
  const cfg = AC.imageApiOf(S); const req = AC.buildSttRequest(cfg, keyFor(cfg.provider), src); if (!req.ok) throw new Error(req.error);
  const r = await apiFetch(req, 300000); const p = AC.parseSttResponse(r.status, r.body); if (!p.ok) throw new Error(p.error);
  return p.cues.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim();
}
