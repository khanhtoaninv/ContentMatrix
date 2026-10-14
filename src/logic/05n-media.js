// ---------- Ảnh AI thật qua API, ảnh bìa và phụ đề video (mục 10.38) ----------
import { byId, log, slotLockMsg } from './05-model.js';
import { FRAME_RATIOS } from './05i-frames.js';
import { plainSentences } from './05m-studio.js';
// Gọi API: chạy thật khi người dùng nhập khoá (trình duyệt gọi thẳng nhà cung cấp). Khoá không nằm trong S (không vào bản sao lưu).
// Phụ đề "Tạo từ bài": MÔ PHỎNG thời gian (chia theo độ dài câu); "Nhận giọng nói" qua API là thật.

export const IMAGE_PROVIDERS = {
  off: { label: 'Mô phỏng (không gọi API)' },
  openai: { label: 'OpenAI', model: 'gpt-image-1', endpoint: 'https://api.openai.com/v1', key: true, stt: true },
  stability: { label: 'Stability AI', model: 'sd3.5-large', endpoint: 'https://api.stability.ai', key: true },
  custom: { label: 'Máy chủ riêng', model: '', endpoint: '', key: false },
};
export function imageApiOf(S) {
  const c = Object.assign({ provider: 'off', model: '', endpoint: '', sttModel: 'whisper-1' }, S.imageApi || {});
  const p = IMAGE_PROVIDERS[c.provider] || IMAGE_PROVIDERS.off;
  return Object.assign(c, { model: c.model || p.model || '', endpoint: c.endpoint || p.endpoint || '' });
}
export function imageApiOn(S) { return imageApiOf(S).provider !== 'off'; }
export function setImageApi(S, patch) {
  const old = imageApiOf(S); const P = patch || {};
  const c = Object.assign({}, old, P);
  if (P.provider && P.provider !== old.provider) { const d = IMAGE_PROVIDERS[P.provider] || {}; if (P.endpoint == null) c.endpoint = d.endpoint || ''; if (P.model == null) c.model = d.model || ''; }
  if (!IMAGE_PROVIDERS[c.provider]) return { ok: false, error: 'Nhà cung cấp không hợp lệ.' };
  const ep = String(c.endpoint || '').trim().replace(/\/+$/, '');
  if (c.provider !== 'off') {
    if (!/^https:\/\/[^\s/]+/i.test(ep) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(ep)) return { ok: false, error: 'Địa chỉ API phải bắt đầu bằng https:// (hoặc http://localhost khi thử trên máy).' };
    if (c.provider !== 'custom' && !String(c.model || '').trim()) return { ok: false, error: 'Nhập tên model.' };
  }
  S.imageApi = { provider: c.provider, model: String(c.model || '').trim().slice(0, 60), endpoint: ep, sttModel: String(c.sttModel || 'whisper-1').trim().slice(0, 60) || 'whisper-1' };
  log(S, 'image-api', 'settings', c.provider, c.provider === 'off' ? 'mô phỏng' : `${c.provider} · ${S.imageApi.model}`);
  return { ok: true, api: imageApiOf(S) };
}
// Khổ gửi API theo tỉ lệ ô ảnh
export function apiSizeFor(provider, ratio) {
  if (provider === 'openai') return ratio === '1:1' ? '1024x1024' : ['4:5', '9:16'].includes(ratio) ? '1024x1536' : '1536x1024';
  if (provider === 'stability') return { '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '16:9': '16:9', '1.91:1': '21:9' }[ratio] || '1:1';
  const wh = FRAME_RATIOS[ratio] || FRAME_RATIOS['1:1']; return `${wh[0]}x${wh[1]}`;
}
// Mô tả yêu cầu HTTP (giao diện dựng fetch). Ảnh gửi kèm ở dạng { file: dataUrl, name }.
export function buildImageRequest(cfg, key, req) {
  const p = IMAGE_PROVIDERS[cfg.provider];
  if (!p || cfg.provider === 'off') return { ok: false, error: 'Chưa bật gọi API ảnh (Setup → AI ảnh & video).' };
  if (p.key && !String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API (Setup → AI ảnh & video).' };
  const prompt = String(req.prompt || '').replace(/\s+/g, ' ').trim(); if (!prompt) return { ok: false, error: 'Thiếu prompt.' };
  const i2i = req.mode === 'i2i'; if (i2i && !req.image) return { ok: false, error: 'Thiếu ảnh gốc.' };
  const strength = Math.min(1, Math.max(0.1, Number(req.strength) || 0.5));
  const size = apiSizeFor(cfg.provider, req.ratio || '1:1');
  const auth = key ? { Authorization: `Bearer ${String(key).trim()}` } : {};
  if (cfg.provider === 'openai') {
    if (!i2i) return { ok: true, url: `${cfg.endpoint}/images/generations`, headers: Object.assign({ 'Content-Type': 'application/json' }, auth), json: { model: cfg.model, prompt, size, n: 1, quality: cfg.quality || 'low' } };
    return { ok: true, url: `${cfg.endpoint}/images/edits`, headers: auth, form: [['model', cfg.model], ['prompt', prompt], ['size', size], ['quality', cfg.quality || 'low'], ['image', { file: req.image, name: 'image.png' }]] };
  }
  if (cfg.provider === 'stability') {
    const form = [['prompt', prompt], ['model', cfg.model], ['output_format', 'jpeg'], ['mode', i2i ? 'image-to-image' : 'text-to-image']];
    if (i2i) form.push(['image', { file: req.image, name: 'image.jpg' }], ['strength', String(strength)]); else form.push(['aspect_ratio', size]);
    return { ok: true, url: `${cfg.endpoint}/v2beta/stable-image/generate/sd3`, headers: Object.assign({ Accept: 'application/json' }, auth), form };
  }
  const [w, h] = size.split('x').map(Number);
  return { ok: true, url: cfg.endpoint, headers: Object.assign({ 'Content-Type': 'application/json' }, auth), json: { mode: i2i ? 'i2i' : 'gen', prompt, ratio: req.ratio || '1:1', width: w, height: h, strength: i2i ? strength : undefined, image: i2i ? req.image : undefined, model: cfg.model || undefined } };
}
// Đọc kết quả: { ok, src } (data URL) hoặc { ok, url } (giao diện tải tiếp) hoặc lỗi dễ hiểu
export function parseImageResponse(provider, status, body) {
  const msg = body && (body.error && (body.error.message || body.error) || body.errors && [].concat(body.errors).join('; ') || body.message || body.detail);
  if (status === 401 || status === 403) return { ok: false, error: 'Khoá API sai, hết hạn hoặc không có quyền dùng model này.' };
  if (status === 429) return { ok: false, error: 'Nhà cung cấp báo vượt hạn mức hoặc hết tín dụng. Thử lại sau.' };
  if (status >= 400) return { ok: false, error: `API báo lỗi ${status}${msg ? ': ' + String(msg).slice(0, 200) : ''}.` };
  if (!body || typeof body !== 'object') return { ok: false, error: 'API trả về dữ liệu không đọc được.' };
  if (body.finish_reason === 'CONTENT_FILTERED') return { ok: false, error: 'Nhà cung cấp chặn ảnh vì nội dung. Sửa prompt rồi thử lại.' };
  const d = Array.isArray(body.data) ? body.data[0] : null;
  const b64 = (d && d.b64_json) || (typeof body.image === 'string' && !/^(data:|https?:)/.test(body.image) ? body.image : null) || body.b64_json;
  if (b64) return { ok: true, src: `data:image/${provider === 'stability' ? 'jpeg' : 'png'};base64,${b64}` };
  const any = (d && d.url) || body.image || body.url || (body.images && body.images[0]);
  if (typeof any === 'string' && /^data:image\//.test(any)) return { ok: true, src: any };
  if (typeof any === 'string' && /^https?:\/\//.test(any)) return { ok: true, url: any };
  return { ok: false, error: 'API không trả về ảnh.' };
}
// Kiểm tra khoá (không tốn phí): liệt kê model / xem tài khoản
export function buildCheckRequest(cfg, key) {
  if (cfg.provider === 'openai') return { ok: true, url: `${cfg.endpoint}/models`, headers: { Authorization: `Bearer ${String(key || '').trim()}` } };
  if (cfg.provider === 'stability') return { ok: true, url: `${cfg.endpoint}/v1/user/account`, headers: { Authorization: `Bearer ${String(key || '').trim()}` } };
  return { ok: false, error: cfg.provider === 'off' ? 'Đang ở chế độ mô phỏng.' : 'Máy chủ riêng: thử bằng cách Gen một ảnh.' };
}
// Nhận giọng nói thành phụ đề (OpenAI)
export function buildSttRequest(cfg, key, file) {
  if (!(IMAGE_PROVIDERS[cfg.provider] || {}).stt) return { ok: false, error: 'Nhận giọng nói cần nhà cung cấp OpenAI (Setup → AI ảnh & video).' };
  if (!String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API.' };
  return { ok: true, url: `${cfg.endpoint}/audio/transcriptions`, headers: { Authorization: `Bearer ${String(key).trim()}` },
    form: [['model', cfg.sttModel || 'whisper-1'], ['response_format', 'verbose_json'], ['timestamp_granularities[]', 'segment'], ['language', 'vi'], ['file', { file, name: 'video.' + (((/^data:video\/(\w+)/.exec(file) || [])[1] || 'mp4').replace('quicktime', 'mov')) }]] };
}
export function parseSttResponse(status, body) {
  if (status >= 400) return parseImageResponse('openai', status, body);
  const seg = body && Array.isArray(body.segments) ? body.segments : null;
  if (!seg || !seg.length) return body && body.text ? { ok: true, cues: [{ start: 0, end: Math.max(1, Number(body.duration) || 5), text: String(body.text).trim() }] } : { ok: false, error: 'Không nhận được lời nói trong video.' };
  return { ok: true, cues: normCues(seg.map(x => ({ start: x.start, end: x.end, text: x.text }))) };
}

// ---- Video: ảnh bìa ----
export function videoAt(S, slotId, idx) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô video.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const v = a.versions.find(x => x.n === a.current);
  if (!v || v.kind !== 'video') return { ok: false, error: 'Ô này chưa có video.' };
  return { ok: true, s, a, v };
}
export function setVideoCover(S, slotId, idx, cover, at) {
  const r = videoAt(S, slotId, idx); if (!r.ok) return r;
  if (!cover) { delete r.v.cover; log(S, 'video-cover', 'slot', slotId, `${r.a.name} · bỏ bìa`); return { ok: true }; }
  if (!/^data:image\/(png|jpeg|webp);/.test(cover.src || '')) return { ok: false, error: 'Ảnh bìa không hợp lệ.' };
  r.v.cover = { src: cover.src, t: cover.t != null ? Math.max(0, Math.round(Number(cover.t) * 10) / 10) : null, at: at || S.settings.demoNow };
  log(S, 'video-cover', 'slot', slotId, `${r.a.name} · ${cover.t != null ? 'khung ' + fmtClock(cover.t) : 'ảnh tải lên'}`);
  return { ok: true };
}

// ---- Video: phụ đề ----
export const SUB_MAX_CHARS = 84; // 2 dòng × 42 ký tự
export function fmtClock(t) { t = Math.max(0, Number(t) || 0); const m = Math.floor(t / 60); const s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }
export function parseClock(x) {
  const m = /^\s*(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)\s*$/.exec(String(x || '')) || /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(String(x || ''));
  if (!m) return null;
  if (m.length === 2) return Number(m[1].replace(',', '.'));
  return (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3].replace(',', '.'));
}
export function normCues(cues) {
  return (cues || []).map(c => ({ start: Math.max(0, Math.round(Number(c.start) * 1000) / 1000), end: Math.max(0, Math.round(Number(c.end) * 1000) / 1000), text: String(c.text || '').replace(/[ \t]+/g, ' ').trim() }))
    .filter(c => c.text).sort((a, b) => a.start - b.start);
}
export function validateCues(cues) {
  if (!cues.length) return 'Chưa có dòng phụ đề nào.';
  if (cues.length > 400) return 'Tối đa 400 dòng phụ đề.';
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (!(c.end > c.start)) return `Dòng ${i + 1}: giờ kết thúc phải sau giờ bắt đầu.`;
    if (c.text.length > 200) return `Dòng ${i + 1}: dài quá 200 ký tự.`;
    if (i && c.start < cues[i - 1].end - 0.001) return `Dòng ${i + 1} chồng thời gian với dòng ${i}.`;
  }
  return '';
}
// Câu của bài để làm phụ đề: bỏ nhãn [..], tiêu đề #, "Slide i:", hashtag; câu dài cắt theo dấu phẩy rồi theo từ
export function scriptLines(text) {
  const out = [];
  plainSentences(text).forEach(x => {
    x = x.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim(); if (!x) return;
    // câu dài: chia đều thành các đoạn ≤ SUB_MAX_CHARS, cắt ở dấu phẩy hoặc khoảng trắng gần điểm chia nhất
    let rest = x;
    while (rest.length > SUB_MAX_CHARS) {
      const target = Math.ceil(rest.length / Math.ceil(rest.length / SUB_MAX_CHARS));
      const cands = [...rest.slice(0, SUB_MAX_CHARS + 1).matchAll(/[,;:]? /g)].map(m => m.index + m[0].length - 1);
      let cut = cands.length ? cands.reduce((b, i) => Math.abs(i - target) - (rest[i - 1] === ',' ? 8 : 0) < Math.abs(b - target) - (rest[b - 1] === ',' ? 8 : 0) ? i : b) : SUB_MAX_CHARS;
      out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  });
  return out;
}
// Mô phỏng: chia thời lượng video theo độ dài từng câu (chưa nghe được video)
export function subtitleDraft(text, duration) {
  const lines = scriptLines(text); if (!lines.length) return { ok: false, error: 'Bài chưa có chữ để làm phụ đề.' };
  const D = Number(duration) > 0 && isFinite(duration) ? Number(duration) : Math.max(5, lines.length * 3);
  const w = lines.map(l => l.length + 10), sum = w.reduce((a, b) => a + b, 0);
  let t = 0;
  const cues = lines.map((l, i) => { const d = D * w[i] / sum; const c = { start: t, end: i === lines.length - 1 ? D : t + d, text: l }; t += d; return c; });
  return { ok: true, cues: normCues(cues), simulated: true };
}
export function srtTime(t, sep) { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; }
export function cuesToSrt(cues) { return cues.map((c, i) => `${i + 1}\n${srtTime(c.start, ',')} --> ${srtTime(c.end, ',')}\n${c.text}\n`).join('\n'); }
export function cuesToVtt(cues) { return 'WEBVTT\n\n' + cues.map(c => `${srtTime(c.start, '.')} --> ${srtTime(c.end, '.')}\n${c.text}\n`).join('\n'); }
export function parseSubtitles(text) {
  const t = String(text || '').replace(/\r/g, '').replace(/^\uFEFF/, '');
  const re = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  const sec = (h, m, s, ms) => Number(h || 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;
  const cues = []; let m;
  while ((m = re.exec(t))) cues.push({ start: sec(m[1], m[2], m[3], m[4]), end: sec(m[5], m[6], m[7], m[8]), text: m[9].split('\n').filter(l => !/^\d+$/.test(l.trim())).join(' ').replace(/<[^>]+>/g, '') });
  return cues.length ? { ok: true, cues: normCues(cues) } : { ok: false, error: 'Không đọc được tệp phụ đề (cần .srt hoặc .vtt).' };
}
export function setVideoSubs(S, slotId, idx, cues, source, at) {
  const r = videoAt(S, slotId, idx); if (!r.ok) return r;
  if (!cues) { delete r.v.subs; log(S, 'video-subs', 'slot', slotId, `${r.a.name} · bỏ phụ đề`); return { ok: true }; }
  const c = normCues(cues); const e = validateCues(c); if (e) return { ok: false, error: e };
  r.v.subs = { cues: c, source: ['script', 'file', 'api', 'manual'].includes(source) ? source : 'manual', lang: 'vi', at: at || S.settings.demoNow };
  log(S, 'video-subs', 'slot', slotId, `${r.a.name} · ${c.length} dòng`);
  return { ok: true, count: c.length };
}
