// ---------- UI · Short Vid: Tạo Vid tự do, đọc tệp nguồn, đo khoảng lặng, chép lời (mục 10.75) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { $, closeLayer, esc, icon, openLayer, save, toast } from './01-core.js';
import { render } from './02-shell.js';
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

// ---- Hộp Tạo Vid tự do ----
const ORDER = ['script', 'audio', 'talk', 'post', 'broll', 'longroll'];
function fieldsHtml(o, wId) {
  const lyric = lbl => `<div class="field"><label for="fo-script">${lbl}</label><textarea id="fo-script" rows="5" placeholder="Có lời sẵn thì dán vào; không có thì để trống, chép lời sau."></textarea></div>`;
  const req = `<div class="field"><label for="fo-request">Yêu cầu cho lời dẫn</label><textarea id="fo-request" rows="2" placeholder="Ví dụ: lời dẫn vui, xưng mình, nói về cách ghi chú từ mới"></textarea></div>`;
  const file = (id, accept, multi, hint) => `<div class="field"><label>Tệp</label><div class="row"><label class="btn sm" for="${id}">${icon('up')} Chọn tệp</label><input id="${id}" type="file" accept="${accept}" ${multi ? 'multiple' : ''} class="sr"><span class="small muted" id="${id}-name">Chưa chọn</span></div><span class="hint">${hint} Mỗi tệp tối đa ${vidMax() / 1048576} MB.</span></div>`;
  if (o === 'script') return `<div class="field"><label for="fo-script">Kịch bản</label><textarea id="fo-script" rows="8" placeholder="[Hook]&#10;…&#10;&#10;[Nội dung]&#10;…&#10;&#10;[CTA]&#10;…"></textarea><span class="hint">Có nhãn [Phần] thì giữ; không có thì mỗi đoạn thành một phần (đầu là Hook, cuối là CTA).</span></div>`;
  if (o === 'audio') return file('fo-file', 'audio/*', false, 'MP3, M4A, WAV.') + lyric('Lời (nếu có)');
  if (o === 'talk') return file('fo-file', 'video/*', false, 'Clip quay thô, có tiếng. App đo âm lượng để tìm khoảng lặng.') + lyric('Lời (nếu có)');
  if (o === 'post') {
    const ch = AC.postChoices(S, wId);
    return ch.length ? `<div class="field"><label for="fo-cell">Ô đã duyệt ở Matrix</label><select id="fo-cell">${ch.map(c => `<option value="${esc(c.id)}">${esc(c.label)} · ${c.words} chữ</option>`).join('')}</select></div>` : '<p class="small muted">Tuần này chưa có ô nào Đã duyệt ở Matrix.</p>';
  }
  if (o === 'broll') return file('fo-file', 'video/*,image/*', true, 'Chọn nhiều clip ngắn hoặc ảnh, theo thứ tự muốn xuất hiện.') + req;
  if (o === 'longroll') return file('fo-file', 'video/*', false, 'Một clip dài.') + `<div class="field"><label for="fo-seg">Độ dài mỗi đoạn (giây)</label><input id="fo-seg" type="number" min="2" max="20" step="1" value="5"></div>` + req;
  return '';
}
export function openFreeCreate(onDone) {
  const w = AC.weekOf(S, AC.weekIdOf(S.ui.weekStart)); if (!w) return;
  const box = openLayer(`<header><div><span class="eyebrow">Short Vid · Video tự do</span><h2>Tạo Vid tự do</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <p class="small muted">Thẻ không đi từ Topic. Chọn cách nạp nội dung; mọi cách đều vào cùng một bàn dựng (cảnh, hình, giọng đọc, caption, frame). Phần đọc hiểu clip và tách đoạn là mô phỏng.</p>
      <div class="sv-origins" role="radiogroup" aria-label="Cách nạp nội dung">${ORDER.map((o, i) => `<label class="sv-origin"><input type="radio" name="fo" value="${o}" ${i ? '' : 'checked'}><span><b>${esc(AC.VID_ORIGINS[o].name)}</b><span class="small muted">${esc(AC.VID_ORIGINS[o].hint)}</span></span></label>`).join('')}</div>
      <div class="field"><label for="fo-title">Tiêu đề (không bắt buộc)</label><input id="fo-title" maxlength="160"></div>
      <div id="fo-fields" class="stack" style="gap:10px"></div>
      <span class="err" id="fo-err" role="alert"></span><span class="small muted" id="fo-busy" aria-live="polite"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="fo-ok" data-testid="fo-ok">Tạo thẻ Vid</button></div>
    </div>`, 'drawer');
  const cur = () => (box.querySelector('input[name="fo"]:checked') || {}).value;
  const paint = () => {
    $('#fo-fields', box).innerHTML = fieldsHtml(cur(), w.id);
    const f = $('#fo-file', box); if (f) f.addEventListener('change', () => { $('#fo-file-name', box).textContent = f.files.length ? [...f.files].map(x => x.name).join(', ') : 'Chưa chọn'; });
  };
  box.querySelectorAll('input[name="fo"]').forEach(r => r.addEventListener('change', paint)); paint();
  $('#fo-ok', box).addEventListener('click', async () => {
    const o = cur(); const err = $('#fo-err', box), busy = $('#fo-busy', box); const btn = $('#fo-ok', box); err.textContent = '';
    const val = id => { const el = $('#' + id, box); return el ? el.value : ''; };
    let media = [];
    const fi = $('#fo-file', box);
    if (fi && fi.files.length) { btn.disabled = true; busy.textContent = 'Đang đọc tệp…'; try { media = await readMediaList([...fi.files]); } catch (e) { err.textContent = e.message; btn.disabled = false; busy.textContent = ''; return; } }
    const r = AC.addFreeVideo(S, w.id, { origin: o, title: val('fo-title'), script: val('fo-script'), request: val('fo-request'), cellId: val('fo-cell'), segLen: Number(val('fo-seg')) || 5, media });
    if (!r.ok) { err.textContent = r.error; btn.disabled = false; busy.textContent = ''; return; }
    if (o === 'talk') { busy.textContent = 'Đang đo âm lượng để tìm khoảng lặng…'; await findCuts(r.video.id); }
    busy.textContent = ''; closeLayer(); save(); render();
    toast(`Đã tạo thẻ Vid (${AC.VID_ORIGINS[o].name}).${o === 'talk' ? ' Mở Bàn dựng để xem các đoạn cắt.' : ''}`);
    if (onDone) onDone(r.video.id);
  });
  return box;
}
