// ---------- UI · Short Vid: biên tập trong popup thẻ Vid, bản 5 (mục 10.76, 10.77, 10.79) ----------
// Trái: Scene / Cài đặt (+ Quản lý caption). Phải: xem thử 9:16 có lớp cue (icon, chữ) trên hình. Dưới: hàng Cue, hàng cảnh và ảnh, sóng âm.
// Dữ liệu đi qua AC (resizeScene, resizeItem, addCue, editCue…); module này chỉ vẽ, phát thử, tổng hợp SFX và hoàn tác. Xem trước mô phỏng, chưa ghép thành file video.
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { closeLayer, confirmBox, esc, icon, openLayer, save, toast } from './01-core.js';
import { downloadBytes } from './06-export.js';
import { imageApiCall, providerLabel } from './04j-media.js';
import { findCuts, readMedia, readMediaList } from './09b-vidfree.js';

const fmt = t => AC.fmtClock(t).replace(/\.\d$/, '');
const r1 = x => Math.round(x * 10) / 10;
const f1 = x => String(r1(x)).replace('.', ',');
const f3 = x => x.toFixed(3).replace('.', ',');
const vOf = id => AC.byId(S.videos, id);
const mediaOf = (v, o) => (v.media || []).find(m => m.id === (o && o.mediaId));
const srcOf = (v, o) => !o ? '' : o.src || (mediaOf(v, o) || {}).src || '';
const thumbOf = (v, it) => it.kind === 'image' ? srcOf(v, it) : it.thumb || (mediaOf(v, it) || {}).thumb || '';
const thumbHtml = (v, it) => thumbOf(v, it) ? `<img src="${esc(thumbOf(v, it))}" alt="">` : '<span class="small">Clip</span>';
const peaksOf = (o, seed) => (o && o.peaks && o.peaks.length ? o.peaks : AC.voPeaks(seed, 80));
const bars = p => p.map(x => `<i style="height:${x}%"></i>`).join('');
const opt = (o, cur) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
const layerRoot = () => document.getElementById('layer') || document.body;
const ST = {};   // trạng thái xem thử theo thẻ (không lưu vào dữ liệu)

// ---- Hoàn tác: ảnh chụp v.edit; chuỗi data URL dài chỉ cất một lần trong `pool` để khỏi nhân bản hàng MB ----
const pool = [];
const poolIx = new Map();
const refOf = s => { let i = poolIx.get(s); if (i == null) { i = pool.length; pool.push(s); poolIx.set(s, i); } return '\u0001' + i; };
const snapOf = ed => JSON.stringify(ed, (k, x) => typeof x === 'string' && x.length > 300 ? refOf(x) : x);
const unsnap = j => JSON.parse(j, (k, x) => typeof x === 'string' && x.charCodeAt(0) === 1 ? pool[Number(x.slice(1))] : x);

async function decodePeaks(src, n) {
  const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx || !/^data:audio\//.test(src)) return null;
  let ctx = null;
  try {
    ctx = new Ctx(); const b = AC.dataUrlBytes(src);
    const buf = await Promise.race([ctx.decodeAudioData(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), new Promise((_, rej) => setTimeout(() => rej(new Error('quá lâu')), 8000))]);
    const ch = buf.getChannelData(0), step = Math.max(1, Math.floor(ch.length / n)); const p = []; let mx = 0.001;
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step && j < ch.length; j += 7) m = Math.max(m, Math.abs(ch[j])); p.push(m); mx = Math.max(mx, m); }
    return p.map(x => Math.max(12, Math.round(x / mx * 100)));
  } catch (e) { return null; } finally { try { if (ctx) ctx.close(); } catch (e) { /* bỏ qua */ } }
}
const audioDur = src => new Promise(res => { const a = new Audio(); a.onloadedmetadata = () => res(isFinite(a.duration) ? a.duration : 0); a.onerror = () => res(0); a.src = src; });

// ---- SFX mô phỏng: tổng hợp bằng âm thanh trình duyệt. Bản thật: file âm thanh có giấy phép ----
let ACX = null;
const actx = () => { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null; return ACX || (ACX = new Ctx()); };
export function playSfx(k, vol) {
  try {
    const E = AC.sfxOf(k); const a = actx(); if (!E || !a) return; const P = E[5], t = a.currentTime, g = a.createGain(); g.gain.value = (vol == null ? 80 : vol) / 100 * 0.5; g.connect(a.destination);
    const tone = (f, d, type = 'sine', f2, at = 0, amp = 1) => { const o = a.createOscillator(), e = a.createGain(); o.type = type; o.frequency.setValueAtTime(f * P, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2 * P, t + at + d); e.gain.setValueAtTime(0.0001, t + at); e.gain.exponentialRampToValueAtTime(amp, t + at + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + at + d); o.connect(e); e.connect(g); o.start(t + at); o.stop(t + at + d + 0.05); };
    const noise = (d, f, f2, at = 0, amp = 1, q = 1) => { const b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f * P, t + at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2 * P, t + at + d); const e = a.createGain(); e.gain.setValueAtTime(0.0001, t + at); e.gain.exponentialRampToValueAtTime(amp, t + at + d * 0.3); e.gain.exponentialRampToValueAtTime(0.0001, t + at + d); s.connect(fl); fl.connect(e); e.connect(g); s.start(t + at); };
    const SYN = {
      ding: () => tone(1320, 0.6), pop: () => tone(600, 0.12, 'sine', 180), boom: () => { tone(120, 0.8, 'sine', 40); noise(0.4, 200, 60); }, drum: () => { tone(150, 0.3, 'sine', 50); noise(0.1, 1500); }, snap: () => noise(0.05, 2000, 0, 0, 1, 2), click: () => noise(0.03, 3000), knock: () => { noise(0.08, 300, 0, 0, 1, 3); noise(0.08, 300, 0, 0.15, 1, 3); },
      whoosh: () => noise(0.5, 400, 3000, 0, 1, 0.8), rise: () => tone(300, 0.6, 'sawtooth', 1500, 0, 0.3), fall: () => tone(1500, 0.6, 'sawtooth', 300, 0, 0.3), swipe: () => noise(0.3 / P, 2500, 500, 0, 1, 0.7), wind: () => noise(1.2, 600, 1200, 0, 0.6, 0.5),
      chime: () => { tone(1047, 0.3); tone(1568, 0.5, 'sine', 0, 0.15); }, buzz: () => tone(160, 0.4, 'square', 0, 0, 0.3), bell: () => { tone(880, 1.2); tone(1760, 0.8, 'sine', 0, 0, 0.4); }, dingdong: () => { tone(784, 0.5); tone(659, 0.6, 'sine', 0, 0.3); }, whistle: () => tone(1000, 0.4, 'square', 800, 0, 0.15),
      boing: () => tone(300, 0.5, 'triangle', 120), bubble: () => tone(400, 0.15, 'sine', 1000), sparkle: () => [0, 0.07, 0.14, 0.21].forEach((at, i) => tone(2000 + i * 400, 0.2, 'sine', 0, at, 0.5)), fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0, i * 0.15, 0.25)), heart: () => { tone(70, 0.15); tone(60, 0.15, 'sine', 0, 0.22); },
      key: () => noise(0.02, 5000, 0, 0, 1, 2), notify: () => { tone(880, 0.2); tone(1175, 0.3, 'sine', 0, 0.12); }, shutter: () => { noise(0.05, 3000); noise(0.08, 1500, 0, 0.08); }, tick: () => { noise(0.03, 4000); noise(0.03, 2500, 0, 0.5); }, page: () => noise(0.2, 1200, 3000, 0, 1, 0.5), unlock: () => { tone(700, 0.1); tone(1400, 0.15, 'sine', 0, 0.08); },
      roll: () => { for (let i = 0; i < 12; i++) noise(0.06, 800, 0, i * 0.08, 0.8, 2); }, drone: () => { tone(55, 2, 'sawtooth', 0, 0, 0.2); tone(82, 2, 'sine', 0, 0, 0.3); },
    };
    (SYN[E[4]] || SYN.ding)();
  } catch (e) { /* trình duyệt chặn âm thanh: bỏ qua */ }
}

// ---- Gen ảnh: khung riêng; ô mô tả hình chỉ có ở đây (điền sẵn từ Phân cảnh). Bật AI ảnh ở Setup thì gọi API, chưa bật thì ảnh mô phỏng ----
const GEN_STYLES = ['Ảnh chụp thật', 'Minh họa phẳng', '3D', 'Tranh vẽ tay'];
function mockGenImg(desc, seed) {
  const c = document.createElement('canvas'); c.width = 360; c.height = 640; const x = c.getContext('2d'); if (!x) return '';
  const h = (seed * 67) % 360; const g = x.createLinearGradient(0, 0, 360, 640); g.addColorStop(0, `hsl(${h} 45% 38%)`); g.addColorStop(1, `hsl(${(h + 50) % 360} 50% 18%)`); x.fillStyle = g; x.fillRect(0, 0, 360, 640);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.font = 'bold 22px system-ui'; x.fillText('Ảnh Gen AI (mô phỏng)', 20, 44); x.font = '20px system-ui'; let y = 96, line = '';
  for (const w of String(desc).split(' ')) { if (x.measureText(line + w).width > 310) { x.fillText(line, 20, y); y += 28; line = ''; if (y > 600) break; } line += w + ' '; }
  x.fillText(line, 20, y); return c.toDataURL('image/png');
}
export function openGenImage(id, sid, done) {
  const v0 = vOf(id); const sc0 = v0 && v0.edit && v0.edit.scenes.find(x => x.id === sid); if (!sc0) return;
  const api = AC.imageApiOn(S); const st = { opts: null, pick: new Set(), pr: sc0.prompt || '', stl: GEN_STYLES[0], busy: false };
  const idx = () => vOf(id).edit.scenes.findIndex(x => x.id === sid);
  const html = () => { const sc = vOf(id).edit.scenes.find(x => x.id === sid) || sc0; return `<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Gen ảnh · Scene ${idx() + 1} · ${api ? `qua ${esc(providerLabel())}` : 'mô phỏng'}</span><h2>Tạo ảnh cho cảnh</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body stack" style="gap:8px">
      <div class="field"><label for="vg-p">Mô tả hình ảnh (prompt)</label><textarea id="vg-p" rows="3">${esc(st.pr)}</textarea></div>
      <div class="row" style="gap:8px;align-items:flex-end"><div class="field"><label for="vg-s">Phong cách</label><select id="vg-s">${GEN_STYLES.map(x => `<option ${x === st.stl ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Khung</label><select disabled><option>Dọc 9:16</option></select></div>
        <button class="btn primary" id="vg-do" data-testid="vg-do" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Đang tạo…' : st.opts ? 'Tạo lại' : 'Tạo 4 ảnh'}</button></div>
      <p class="small muted" style="margin:0">Lời cảnh: ${esc(sc.text)}</p>
      ${st.opts ? `<div class="vp-gopts">${st.opts.map((s, k) => `<img src="${esc(s)}" data-gk="${k}" aria-pressed="${st.pick.has(k)}" alt="Phương án ${k + 1}" role="button" tabindex="0">`).join('')}</div>` : ''}
      <div class="actions"><span class="small muted" style="margin-right:auto">${st.opts ? 'Bấm chọn một hoặc nhiều ảnh' : api ? 'Mỗi ảnh là một lần gọi API ảnh.' : 'Mô phỏng: bật AI ảnh ở Setup để gọi dịch vụ Gen ảnh thật'}</span><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="vg-add" data-testid="vg-add" ${st.pick.size ? '' : 'disabled'}>Thêm vào cảnh</button></div></div>`; };
  const box = openLayer(html(), 'dialog');
  const draw = () => { box.innerHTML = html(); };
  const keep = () => { const p = box.querySelector('#vg-p'), s = box.querySelector('#vg-s'); if (p) st.pr = p.value; if (s) st.stl = s.value; };
  box.addEventListener('click', async e => {
    const im = e.target.closest('[data-gk]'); if (im) { keep(); const k = Number(im.dataset.gk); if (st.pick.has(k)) st.pick.delete(k); else st.pick.add(k); draw(); return; }
    if (e.target.closest('#vg-do')) {
      keep(); if (!st.pr.trim()) return toast('Nhập mô tả hình ảnh trước.', 'bad');
      AC.editScene(S, id, sid, { prompt: st.pr }); save(); const prompt = `${st.pr.trim()}. Phong cách: ${st.stl}. Khung dọc 9:16.`;
      st.busy = true; st.pick.clear(); draw();
      if (api) {
        const rs = await Promise.allSettled([0, 1, 2, 3].map(() => imageApiCall('gen', { prompt, ratio: '9:16' })));
        const ok = rs.filter(r => r.status === 'fulfilled').map(r => r.value.src); st.busy = false;
        if (!ok.length) { st.opts = null; draw(); return toast(`Không tạo được ảnh: ${rs[0].reason && rs[0].reason.message || 'lỗi API'}`, 'bad'); }
        st.opts = ok;
      } else { st.opts = [0, 1, 2, 3].map(k => mockGenImg(`${st.pr} · ${st.stl}`, idx() * 7 + k + Date.now() % 97)); st.busy = false; }
      draw(); return;
    }
    if (e.target.closest('#vg-add')) {
      const list = [...st.pick].sort().map((k, j) => ({ src: st.opts[k], name: `gen-ai-${idx() + 1}-${j + 1}.png`, gen: true }));
      const r = AC.addSceneItems(S, id, sid, list); if (!r.ok) return toast(r.error, 'bad');
      closeLayer(); if (done) done(`Đã thêm ${list.length} ảnh Gen vào scene ${idx() + 1}.`);
    }
  });
  box.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-gk]')) { e.preventDefault(); e.target.click(); } });
}

// ---- Khung giao diện ----
function voRow(v, sc, i) {
  const ed = v.edit;
  if (ed.voAll) return `<div class="vp-voline"><span>🎙 VO cảnh</span><span class="small muted vp-nm">khóa vì đang dùng VO toàn bài${sc.vo ? ` (vẫn giữ ${esc(sc.vo.name)})` : ''}</span></div>`;
  if (sc.vo) return `<div class="vp-voline"><span>🎙 VO cảnh</span><b class="vp-nm">${esc(sc.vo.name)}</b><span class="small muted">${f1(sc.vo.dur)}s</span><span class="vp-tag">${sc.vo.kind === 'ai' ? 'AI' : 'Up'}</span><span class="small muted">cảnh tối thiểu ${f1(AC.sceneMin(ed, sc))}s</span><button class="btn icon sm ghost" data-a="vox" data-i="${i}" aria-label="Gỡ VO cảnh" style="margin-left:auto">${icon('close')}</button></div>`;
  return `<div class="vp-voline"><span>🎙 VO cảnh</span><button class="btn sm" data-a="voup" data-i="${i}">Up</button><button class="btn sm" data-a="voai" data-i="${i}" data-testid="ve-voai">Gen AI</button><span class="small muted">chưa có</span></div>`;
}
function cueRow(v, sc, i, st) {
  const ed = v.edit, t = AC.sceneWordTimes(ed, i), ws = AC.sceneWords(sc.text), mine = (ed.cues || []).filter(c => c.sc === sc.id);
  const lost = mine.filter(c => c.lost).map(c => `<button class="vp-cw lost" data-a="lostcue" data-c="${esc(c.id)}" title="Từ này đã bị xóa khỏi lời: bấm rồi chọn từ mới">⚠ ${esc(c.w)}</button>`).join('');
  if (!t) return `<div class="vp-cuerow off" data-testid="ve-cuerow"><b>Cue</b>&nbsp;<span class="small muted">cần VO của cảnh để tính giây từng từ${mine.length ? ` · ${mine.length} cue đang chờ` : ''}</span>${lost}</div>`;
  return `<div class="vp-cuerow" data-testid="ve-cuerow"><b>Cue</b>&nbsp;${ws.map((w, k) => { const c = mine.find(x => !x.lost && x.wi === k); return `<button class="vp-cw${c ? ' on' : ''}" data-a="cw" data-i="${i}" data-j="${k}" title="${f3(t[k].s)}–${f3(t[k].e)}s${c ? ` · ${AC.cueLabel(c)}` : ''}">${c && c.icon ? `${c.icon.g} ` : ''}${esc(w)}${c ? `<span class="vp-cx" data-a="cuex" data-c="${esc(c.id)}" title="Xóa cue" aria-label="Xóa cue">✕</span>` : ''}</button>`; }).join('')}${lost}<span class="small muted vp-cuenote">${st.reCue ? 'Bấm một từ để đặt lại cue · ' : ''}${ed.voAll ? 'theo VO toàn bài' : 'đã căn với VO'} (mô phỏng)</span></div>`;
}
const mmss = t => { t = Math.max(0, Math.round(t * 10) / 10); const m = Math.floor(t / 60), x = t - m * 60; return `${m}:${x < 10 ? '0' : ''}${x.toFixed(1).replace('.', ',')}`; };
function tbarHtml(v, st) {
  // vạch đậm và cao giữa các cảnh; vạch mờ và ngắn giữa các ảnh trong cảnh
  const T = AC.editTimeline(v).total || 1; let a = 0; const ticks = v.edit.scenes.map((s, i) => { let o = ''; const t0 = a; if (i) o += `<i class="vp-tk" style="left:${t0 / T * 100}%"></i>`; let x = t0; s.items.slice(0, -1).forEach(m => { x += m.d; o += `<i class="vp-tk im" style="left:${x / T * 100}%"></i>`; }); a += s.dur; return o; }).join('');
  return `<div class="vp-tbar"><div class="vp-trk"><input type="range" id="vp-time" data-testid="ve-time" min="0" max="${Math.round(T * 10)}" step="1" value="${Math.round(st.t * 10)}" aria-label="Thanh thời gian video" aria-valuetext="${mmss(st.t)} trên ${mmss(T)}">${ticks}</div><span class="vp-tt" id="vp-tt">${mmss(st.t)} / ${mmss(T)}</span></div>`;
}
// Chip hiệu ứng ở đầu cảnh: tóm tắt chuyển động + chuyển cảnh; "tự động" khi cảnh không chỉnh riêng
function fxSum(v, i) {
  const ed = v.edit, sc = ed.scenes[i], ki = sc.items.findIndex(m => m.kind !== 'video');
  const mo = !sc.items.length ? '—' : ki < 0 ? 'Video giữ nguyên' : AC.VID_MOTIONS[AC.motionOf(ed, i, ki)] + (AC.sceneImgCount(sc) > 1 && !sc.mo ? ' …' : '') + (AC.sceneVidCount(sc) ? ' (chỉ ảnh)' : '');
  return `✦ ${mo}${i || sc.tr ? ` · vào: ${AC.VID_TRANS[AC.transOf(ed, i)]}` : ''}${sc.mo || sc.tr ? '' : ' · tự động'}`;
}
function fxBox(v, i) {
  const ed = v.edit, sc = ed.scenes[i], n = sc.items.length, nImg = AC.sceneImgCount(sc), nVid = AC.sceneVidCount(sc), vid = n && !nImg, mix = nImg && nVid;
  const fi = sc.items.findIndex(m => m.kind !== 'video'), am = n && fi >= 0 ? AC.VID_MOTIONS[ed.fxMo !== 'auto' ? ed.fxMo : AC.autoMotion(ed, i, fi)] : '—';
  const at = AC.VID_TRANS[ed.fxTr !== 'auto' ? ed.fxTr : AC.autoTransition(ed, i)];
  return `<div class="vp-fxbox"><label>Chuyển động <select data-a="fmo" data-i="${i}" ${vid ? 'disabled title="Scene chỉ có video: giữ chuyển động gốc"' : ''}><option value="">Tự động (${vid ? 'giữ nguyên' : esc(am)})</option>${Object.entries(AC.VID_MOTIONS).map(([k, nm]) => `<option value="${k}" ${sc.mo === k ? 'selected' : ''}>${esc(nm)}</option>`).join('')}</select></label>
    <label>Vào scene <select data-a="ftr" data-i="${i}"><option value="">${i ? `Tự động (${esc(at)})` : 'Mặc định (Không, bắt đầu ngay)'}</option>${Object.entries(AC.VID_TRANS).map(([k, nm]) => `<option value="${k}" ${sc.tr === k ? 'selected' : ''}>${esc(nm)}</option>`).join('')}</select></label>
    ${vid ? '<span class="small muted">Scene chỉ có video: giữ chuyển động gốc của clip.</span>' : mix ? `<span class="small muted">Chuyển động chỉ áp dụng cho ${nImg} ảnh; ${nVid} video trong scene giữ nguyên.</span>` : ''}
    <button class="btn sm" data-a="fauto" data-i="${i}" ${sc.mo || sc.tr ? '' : 'disabled'}>Về tự động</button></div>`;
}
const curItem = (sc, loc) => { let k = 0, off = 0; const n = sc.items.length; while (k < n - 1 && loc >= off + sc.items[k].d) { off += sc.items[k].d; k++; } return { k, off }; };
function sceneCard(v, it, i, n, st) {
  const sc = it.scene, k = sc.items.length, cur = st.cur === i;
  const ik = cur && k ? curItem(sc, Math.max(0, st.t - it.t0)).k : 0;
  const main = k ? thumbHtml(v, sc.items[Math.min(ik, k - 1)]) : sc.ph ? 'Thẻ giữ chỗ' : icon('plus');
  const shorts = sc.items.map((m, j) => {
    if (m.kind !== 'video' || !(m.dur > 0)) return '';
    if (m.dur < m.d - 0.3) return `<div class="vp-tools small">Ảnh ${j + 1} là clip ${f1(m.dur)}s, ngắn hơn ${f1(m.d)}s: <select data-a="short" data-i="${i}" data-j="${j}" aria-label="Cách xử lý clip ngắn">${opt(AC.VID_SHORT, m.short || 'hold')}</select></div>`;
    if (m.dur > m.d + 0.5) return `<div class="vp-tools small">Clip ${j + 1} (${f1(m.dur)}s): lấy ${f1(m.d)}s từ giây <input type="range" min="0" max="${Math.max(0, Math.floor(m.dur - m.d))}" value="${m.trim || 0}" data-a="trim" data-i="${i}" data-j="${j}" aria-label="Điểm bắt đầu lấy clip"> <b>${m.trim || 0}</b></div>`;
    return '';
  }).join('');
  const units = AC.brollUnits(v);
  return `<div class="vp-sc" data-sid="${esc(sc.id)}" data-c="${i}" aria-current="${cur}" data-testid="ve-scene">
    <div class="vp-mcol"><div class="vp-add${k ? ' has' : sc.ph ? ' ph' : ''}" data-a="up" data-i="${i}" role="button" tabindex="0" aria-label="${k ? `Up thêm hình cho scene ${i + 1}` : `Up hình hoặc video cho scene ${i + 1}`}">${main}</div>
      ${k ? `<div class="vp-thumbs">${sc.items.map((m, j) => `<span class="vp-th" data-a="pick" data-i="${i}" data-j="${j}" aria-current="${cur && j === ik}" title="Ảnh ${j + 1}: ${f1(m.d)} giây">${thumbHtml(v, m)}<span class="vp-d">${f1(m.d)}s</span><button class="vp-x" data-a="itx" data-i="${i}" data-j="${j}" aria-label="Bỏ ảnh ${j + 1}">✕</button></span>`).join('')}</div>` : ''}
      <button class="vp-plus" data-a="up" data-i="${i}" title="Upload ${k ? 'thêm ' : ''}hình hoặc video"><b>Upload</b></button><button class="vp-plus" data-a="gen" data-i="${i}" data-testid="ve-gen" title="Tạo ảnh bằng AI từ mô tả hình"><b>Gen AI</b></button></div>
    <div class="vp-scb">
      <div class="vp-hd"><b>Scene ${i + 1}</b><span class="small muted">${fmt(it.t0)}–${fmt(it.t1)}</span>
        <span><button class="btn icon sm ghost" data-a="dd" data-i="${i}" data-d="-0.5" title="Ngắn hơn 0,5 giây" aria-label="Ngắn hơn 0,5 giây">−</button><button class="btn icon sm ghost" data-a="dd" data-i="${i}" data-d="0.5" title="Dài hơn 0,5 giây" aria-label="Dài hơn 0,5 giây">+</button></span>
        <button class="vp-fxc${sc.mo || sc.tr ? ' own' : ''}" data-a="fxo" data-i="${i}" data-testid="ve-fxchip" aria-expanded="${st.fx === i}" title="Hiệu ứng của scene: bấm để chỉnh riêng">${esc(fxSum(v, i))}</button>
        <span class="vp-r"><button class="btn icon sm ghost" data-a="mv" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Lên">↑</button><button class="btn icon sm ghost" data-a="mv" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'} aria-label="Xuống">↓</button><button class="btn icon sm ghost danger" data-a="del" data-i="${i}" ${n < 2 ? 'disabled' : ''} aria-label="Xóa scene">${icon('close')}</button></span></div>
      <label class="vp-f" for="vp-t-${esc(sc.id)}">Nội dung</label><textarea id="vp-t-${esc(sc.id)}" class="vp-r2" data-sf="text" data-i="${i}" rows="2" placeholder="Lời của cảnh">${esc(sc.text)}</textarea>
      ${voRow(v, sc, i)}${cueRow(v, sc, i, st)}
      <div class="vp-tools small">${k ? `<label class="sr" for="vp-fit-${esc(sc.id)}">Cách đặt hình</label><select id="vp-fit-${esc(sc.id)}" data-a="fit" data-i="${i}">${opt(AC.VID_FIT, sc.fit)}</select><label>🔊 Âm clip <input type="range" min="0" max="100" value="${sc.vol}" data-a="vol" data-i="${i}"></label>`
        : `<button class="btn sm ${sc.ph ? 'primary' : ''}" data-a="ph" data-i="${i}" aria-pressed="${!!sc.ph}">Dùng thẻ giữ chỗ</button>${units.length ? `<label class="sr" for="vp-u-${esc(sc.id)}">Chọn từ tệp nguồn</label><select id="vp-u-${esc(sc.id)}" data-a="unit" data-i="${i}"><option value="">Từ nguồn vào…</option>${units.map((u, x) => `<option value="${x}">${esc(`${u.label.includes('s') ? 'Đoạn' : 'Tệp'} ${x + 1}: ${u.desc}`.slice(0, 60))}</option>`).join('')}</select>` : ''}`}</div>
      ${shorts}
    </div></div>`;
}
function cutsHtml(v) {
  const ed = v.edit; if (AC.vidOrigin(v) !== 'talk') return '';
  const cs = ed.cuts || []; const on = cs.filter(c => c.on !== false);
  return `<section class="panel stack" style="gap:6px;margin-bottom:8px" data-testid="ve-cuts"><h3>Cắt khoảng lặng</h3>
    <p class="small muted">${cs.length ? `${cs.length} chỗ đề xuất cắt (${ed.cutsSim ? 'mô phỏng: không đọc được tiếng của clip' : 'đo âm lượng thật trong trình duyệt'}), bỏ ${f1(on.reduce((a, c) => a + c.to - c.from, 0))} giây. Bỏ tích chỗ muốn giữ; cảnh chia lại ngay (chỉnh tay trên cảnh sẽ mất).` : 'Không thấy khoảng lặng nào đáng cắt.'}</p>
    <div class="stack" style="gap:2px;max-height:140px;overflow:auto">${cs.map((c, i) => `<label class="small row" style="gap:6px"><input type="checkbox" data-a="cut" data-i="${i}" ${c.on !== false ? 'checked' : ''}> <span class="mono">${fmt(c.from)}–${fmt(c.to)}</span> ${esc(c.why)}</label>`).join('')}</div>
    <div class="row"><button class="btn sm" data-a="remeasure">Đo lại</button><span class="small faint">Gợi ý cắt câu vấp, câu thừa so với kịch bản cần API nhận giọng nói.</span></div></section>`;
}
function scenePane(v, st) {
  const ed = v.edit, tl = AC.editTimeline(v), n = tl.items.length, vo = ed.voAll;
  const sug = AC.suggestTemplate(S, v);
  const voAll = vo ? `<b class="vp-nm">${esc(vo.name)}</b> <span class="small muted">${f1(vo.dur)}s · ${vo.kind === 'ai' ? 'AI' : 'Up'}</span><button class="btn icon sm ghost" data-a="voallx" aria-label="Gỡ VO toàn bài">${icon('close')}</button>`
    : `<button class="btn sm" data-a="voallup">Up</button><button class="btn sm" data-a="voallai" data-testid="ve-voallai">Gen AI</button>`;
  return `<div class="vp-pane">${cutsHtml(v)}<div class="vp-ctl"><label class="vp-lb2" for="ve-tpl">Mẫu dựng</label><select id="ve-tpl" data-a="tpl">${opt(Object.fromEntries(Object.entries(AC.VID_TEMPLATES).map(([k, t]) => [k, t.name + (k === sug ? ' (gợi ý)' : '')])), ed.tpl)}</select>
      <span class="vp-lb2">VO toàn bài</span><div class="vp-vo1">${voAll}</div><button class="btn sm" data-a="origscr" data-testid="ve-orig" title="Chia lại scene theo kịch bản gốc và mẫu dựng đang chọn">↺ Kịch bản gốc</button><span class="small muted vp-tot">Tổng <b>${f1(tl.total)}s</b></span></div>
    ${tl.items.map((it, i) => sceneCard(v, it, i, n, st)).join('')}
    <button class="btn sm" data-a="add">${icon('plus')} Thêm cảnh</button></div>`;
}
const FRAME_TILE = { none: '', logo: '<span class="vp-fm-logo"></span>', band: '<span class="vp-fm-band"></span>' };
function settingsPane(v) {
  const ed = v.edit, mus = ed.music;
  const fr = [['none', 'Không frame'], ['logo', 'Nhãn góc'], ['band', 'Dải dưới']].concat(AC.vidFavFrames(S).filter(f => f.kind === 'png' && f.ratio === '9:16').map(f => [f.id, f.name]));
  return `<div class="vp-pane"><div class="vp-grp"><div class="eyebrow">Caption <button class="btn sm" data-a="capopen" data-testid="ve-capopen">Quản lý caption →</button></div>
      <div class="vp-styles">${AC.VID_CAPTION_STYLES.map((n, i) => `<button class="vp-cs s${i}" data-a="cstyle" data-i="${i}" aria-pressed="${ed.captions.style === i}">Aa<small>${esc(n)}</small></button>`).join('')}</div>
      <div class="vp-tools small"><label>Kiểu <select id="ve-cap">${opt(AC.VID_CAPTION_MODES, ed.captions.mode)}</select></label><label>Vị trí <select id="ve-pos">${opt(AC.VID_CAPTION_POS, ed.captions.pos)}</select></label></div></div>
    <div class="vp-grp"><div class="eyebrow">Hiệu ứng <span class="small muted" style="text-transform:none;letter-spacing:0">áp dụng cho mọi scene chưa chỉnh riêng</span></div><div class="vp-fxg">
      <label for="ve-gtr">Chuyển cảnh</label><select id="ve-gtr"><option value="auto" ${ed.fxTr === 'auto' ? 'selected' : ''}>Tự động (Cắt; Mờ dần khi sang phần mới và scene chốt)</option>${opt(AC.VID_TRANS, ed.fxTr)}</select>
      <label for="ve-gmo">Chuyển động ảnh tĩnh</label><select id="ve-gmo"><option value="auto" ${ed.fxMo === 'auto' ? 'selected' : ''}>Tự động (luân phiên Zoom vào, Lia, Zoom ra)</option>${opt(AC.VID_MOTIONS, ed.fxMo)}</select>
      <label for="ve-gdu">Thời gian chuyển</label><select id="ve-gdu">${AC.VID_FX_DURS.map(x => `<option value="${x}" ${ed.fxDur === x ? 'selected' : ''}>${f1(x)} giây</option>`).join('')}</select></div>
      <div class="vp-tools small">${(() => { const own = ed.scenes.filter(x => x.mo || x.tr).length; return own ? `<span class="muted">${own} scene đang chỉnh riêng, giữ lựa chọn của scene đó.</span><button class="btn sm" data-a="fxclr">Đưa mọi scene về tự động</button>` : '<span class="muted">Chuyển động chỉ áp dụng cho ảnh; video giữ nguyên chuyển động gốc. Chỉnh riêng từng scene bằng chip ✦ ở đầu scene.</span>'; })()}</div></div>
    <div class="vp-grp"><div class="eyebrow">Frame <button class="btn sm" data-a="frlib" data-testid="ve-frlib">Thư viện frame →</button></div><div class="vp-frames">${fr.map(([k, n]) => {
      const pf = (S.frames || []).find(f => f.id === k);
      return `<button class="vp-fr" data-a="frame" data-k="${esc(k)}" aria-pressed="${ed.frame === k}" title="${esc(n)}"><i>${pf ? `<img src="${esc(pf.src)}" alt="">` : FRAME_TILE[k] || ''}</i>${esc(n)}</button>`;
    }).join('')}</div></div>
    <div class="vp-grp"><div class="eyebrow">Nhạc nền <button class="btn sm" data-a="mulib" data-testid="ve-mulib">Thư viện nhạc →</button></div>${mus ? `<b class="small">${esc(mus.name)}</b> <button class="btn icon sm ghost" data-a="musx" aria-label="Gỡ nhạc">${icon('close')}</button>` : `<button class="btn sm" data-a="musup">${icon('up')} Up nhạc</button>`}
      ${mus ? `<div class="vp-tools small"><label>Âm lượng <input type="range" min="0" max="100" value="${Math.round(mus.vol * 100)}" data-a="musvol"></label><label><input type="checkbox" data-a="duck" ${mus.duck !== false ? 'checked' : ''}> Tự hạ khi có giọng</label></div><div class="vp-tools"><input id="ve-lic" data-a="lic" placeholder="Nguồn / giấy phép (bắt buộc khi có nhạc)" value="${esc(mus.license || '')}"></div>` : '<p class="small muted">Nhạc nền chưa chọn.</p>'}</div>
    <div class="vp-grp"><div class="eyebrow">Giọng</div><label class="sr" for="ve-voice">Nguồn giọng</label><select id="ve-voice" ${ed.voAll ? 'disabled' : ''}>${opt(AC.VID_VOICES, ed.voice.mode)}</select>
      <p class="small muted">${ed.voAll ? 'Đang dùng VO toàn bài.' : 'Giọng máy đọc lời bằng giọng có sẵn của trình duyệt khi xem thử.'}</p></div></div>`;
}
function capPane(v, ro) {
  const ed = v.edit; if (!ed.segs && !ro) AC.genCaptions(S, v.id, { full: true });
  const segs = ed.segs || [];
  return `<div class="vp-pane"><div class="eyebrow"><button class="btn sm" data-a="capback" data-ro="1">← Cài đặt</button><span>Quản lý caption</span></div>
    <div class="vp-note ${ed.capStale ? 'warn' : ''}" id="vp-capnote">① ${ed.capStale ? '<b>Timeline đã đổi, caption chưa khớp.</b> ' : ''}Bấm Gen caption để chia lại theo timeline mới nhất; chữ bạn đã sửa tay được giữ, chỉ tính lại giây. Có VO thì caption bám giây từng từ. <button class="btn sm ${ed.capStale ? 'primary' : ''}" data-a="gencap" data-testid="ve-gencap">Gen caption</button> <button class="btn sm" data-a="gencapall" title="Chia lại hết, bỏ cả chữ đã sửa">Chia lại hết</button></div>
    ${ed.captions.mode === 'off' ? '<p class="small muted">Kiểu caption đang là Không caption: đổi ở Cài đặt để hiện chữ.</p>' : ''}
    ${segs.map((g, i) => `<div class="vp-seg" data-g="${i}"><input class="vp-sat" type="number" step="0.1" min="0" value="${g.at}" data-a="segat" data-i="${i}" aria-label="Giây bắt đầu đoạn ${i + 1}"><input data-a="segt" data-i="${i}" value="${esc(g.t)}" aria-label="Chữ đoạn ${i + 1}"><span><button class="btn sm" data-a="seek" data-ro="1" data-t="${g.at}" title="Xem thử đoạn này">▶</button> <button class="btn sm" data-a="split" data-i="${i}">Tách</button> <button class="btn sm" data-a="merge" data-i="${i}" ${i ? '' : 'disabled'}>Gộp ↑</button></span></div>`).join('')}
    <p class="small muted">② Số ở đầu mỗi dòng là giây bắt đầu đoạn; sửa được trong khoảng giữa hai đoạn kề nhau.</p></div>`;
}
function timelineHtml(v, st) {
  const ed = v.edit, tl = AC.editTimeline(v), T = tl.total || 1, roll = !!ed.voAll;
  const cues = (ed.cues || []).map(c => ({ c, t: AC.cueTime(ed, c) })).filter(x => x.t != null);
  const ctrack = `<div class="vp-ctrack" id="vp-ctrack" data-testid="ve-ctrack">${cues.map(({ c, t }) => `<button class="vp-cb" data-a="cb" data-c="${esc(c.id)}" style="left:${t / T * 100}%" aria-current="${st.cue === c.id}" aria-label="Cue “${esc(c.w)}”, ${f3(t)} giây">${esc(AC.cueLabel(c))}<span class="vp-cx" data-a="cuex" data-c="${esc(c.id)}" title="Xóa cue" aria-label="Xóa cue">✕</span></button>`).join('')}${cues.length ? '' : '<span class="small muted vp-chint">Hàng Cue: bấm một từ ở dòng Cue của cảnh (cảnh cần có VO)</span>'}</div>`;
  const blocks = tl.items.map((it, i) => { const s = it.scene, k = s.items.length; let acc = 0;
    const segs = s.items.map((m, j) => { const l = acc / s.dur * 100, w = m.d / s.dur * 100; acc += m.d; return `<span class="vp-seg2" style="left:${l}%;width:${w}%">${f1(m.d)}s</span>${j < k - 1 ? `<span class="vp-ih" data-ih="${i},${j}" tabindex="0" role="slider" aria-label="Ranh giới ảnh ${j + 1} và ${j + 2} của cảnh ${i + 1}" aria-valuenow="${m.d}" style="left:${acc / s.dur * 100}%"></span>` : ''}`; }).join('');
    return `<div class="vp-blk${k || s.ph ? '' : ' empty'}" data-i="${i}" style="width:${s.dur / T * 100}%" aria-current="${st.cur === i}"><span class="vp-bl">${i + 1} · ${f1(s.dur)}s${k ? ` · ${k} hình` : s.ph ? ' · ▢' : ' · ＋'}</span>${segs}${AC.transOf(ed, i) !== 'cut' ? `<span class="vp-trm" title="Vào scene: ${esc(AC.VID_TRANS[AC.transOf(ed, i)])}">◆</span>` : ''}${s.vo && !roll ? `<span class="vp-vob" style="width:${Math.min(100, s.vo.dur / s.dur * 100)}%"></span>` : ''}<span class="vp-hdl" data-h="${i}" tabindex="0" role="slider" aria-label="Độ dài cảnh ${i + 1}" aria-valuenow="${s.dur}" aria-valuemin="${AC.sceneMin(ed, s)}" ${roll && i === tl.items.length - 1 ? 'hidden' : ''}></span></div>`; }).join('');
  return `<div class="vp-tlw"><div class="vp-tlh"><span>Timeline${roll ? ' · VO toàn bài cố định: kéo mép = dời ranh giới hai cảnh, kéo vạch = dời ranh giới hai ảnh' : ''}</span><span>${ed.capStale && ed.captions.mode !== 'off' ? '<span class="vp-badge" data-testid="ve-stale">Caption chưa khớp timeline</span> ' : ''}<button class="btn sm" data-a="reset" data-testid="ve-reset">Hoàn trả mặc định</button> <span class="mono" id="vp-tlt"></span></span></div>
    ${ctrack}<div class="vp-tl" id="vp-tl">${blocks}<div class="vp-phl" id="vp-phl"></div></div><div class="vp-wave" id="vp-wave">${waveHtml(v)}</div>
    ${ed.music ? `<div class="vp-wave m" id="vp-wave2"><div class="vp-wv m" style="left:0;width:100%">${bars(peaksOf(ed.music, 3))}</div></div>` : ''}
    <div class="small muted" style="margin-top:2px">Hàng Cue: rê chuột để xem, bấm để sửa, ✕ để xóa; cue bám theo từ trong VO · Hàng giữa: cảnh và ảnh · Hàng đỏ: VO (bám đầu ảnh thứ nhất của cảnh).</div></div>`;
}
function waveHtml(v) {
  const ed = v.edit, tl = AC.editTimeline(v), T = tl.total || 1;
  if (ed.voAll) return `<div class="vp-wv" style="left:0;width:100%">${bars(peaksOf(ed.voAll, 7))}</div>`;
  return tl.items.map((it, i) => it.scene.vo ? `<div class="vp-wv" style="left:${it.t0 / T * 100}%;width:${Math.min(it.scene.vo.dur, it.scene.dur) / T * 100}%">${bars(peaksOf(it.scene.vo, i + 1))}</div>` : '').join('');
}
function bodyHtml(v, st, ro) {
  const ed = v.edit; const dis = ro ? 'disabled' : '';
  const left = st.cap ? capPane(v, ro) : st.sub === 'scene' ? scenePane(v, st) : settingsPane(v);
  const bl = AC.editBlockers(v); const iss = ro ? [] : AC.editIssues(S, v);
  return `<div class="vp-ed"><div class="vp-l"><div class="vp-mini" role="tablist" aria-label="Công cụ biên tập"><button role="tab" data-a="sub" data-k="scene" aria-selected="${st.sub === 'scene' && !st.cap}" data-testid="ve-sub-scene">Scene</button><button role="tab" data-a="sub" data-k="set" aria-selected="${st.sub === 'set' || st.cap}" data-testid="ve-sub-set">Cài đặt</button></div><fieldset class="vp-fs" ${dis}>${left}</fieldset></div>
    <div class="vp-pv"><div class="vp-box" id="vp-box" data-testid="ve-stage"></div>${tbarHtml(v, st)}
      <div class="vp-pvbar"><button class="btn sm primary vp-ico" data-a="play" id="vp-play" data-testid="ve-play" title="Phát" aria-label="Phát">▶</button><button class="btn sm vp-ico" data-a="replay" data-testid="ve-replay" title="Phát lại từ đầu" aria-label="Phát lại từ đầu">↺</button><label class="small vp-safe-l"><input type="checkbox" data-a="safe" ${st.safe ? 'checked' : ''}> Vùng an toàn</label></div></div></div>
    <fieldset class="vp-fs" ${dis}>${timelineHtml(v, st)}</fieldset>
    ${ro ? '<div class="vp-foot"><span class="small muted">Bản cũ: chỉ xem. Bấm Dùng bản này để sửa tiếp.</span></div>' : `<div class="vp-foot"><span class="small ${bl.length ? '' : 'muted'}" id="ve-issues">${bl.length ? bl.map(x => `<a href="#" data-a="goto" data-i="${x.i}">Scene ${x.i + 1} chưa có hình</a>`).join(' · ') : ed.doneAt ? 'Đã hoàn thành. Lệnh dựng đã lưu; file video có khi bộ xuất chạy.' : 'Đủ hình cho mọi cảnh'}${iss.filter(x => !/chưa có hình/.test(x)).length ? `<br><span class="vp-warn">${iss.filter(x => !/chưa có hình/.test(x)).map(esc).join(' · ')}</span>` : ''}</span>
      <button class="btn" data-a="export" data-testid="ve-export">Xuất lệnh dựng (JSON)</button><button class="btn primary" data-a="done" data-testid="ve-done" ${bl.length ? 'disabled' : ''}>${ed.doneAt ? 'Đã hoàn thành ✓' : 'Hoàn thành'}</button></div>`}
    <input type="file" id="vp-file" accept="image/*,video/*" multiple class="sr" tabindex="-1"><input type="file" id="vp-fileA" accept="audio/*" class="sr" tabindex="-1"><input type="file" id="vp-fileM" accept="audio/*" class="sr" tabindex="-1">`;
}
function emptyHtml(v, ro) {
  const ok = !ro && !!(v.script || (v.media || []).length);
  return `<div class="vp-empty"><p>${ro ? 'Bản này chưa chia cảnh.' : ok ? 'Chưa chia cảnh. App chia kịch bản thành các cảnh có lời, gợi ý hình và thời lượng; sau đó bạn Up hình, thêm VO, đặt cue, chỉnh timeline.' : 'Chưa có kịch bản hoặc tệp nguồn để chia cảnh. Viết kịch bản ở tab Kịch bản trước.'}</p>${ro ? '' : `<button class="btn primary" data-a="plan" data-testid="ve-plan" ${ok ? '' : 'disabled'}>${icon('spark')} Chia cảnh theo kịch bản</button>`}</div>`;
}

// ---- Popup Cue: Icon / Text / SFX, kho dùng chung (Yêu thích, Gần đây) ----
const fxName = i => AC.VID_CUE_FX[i || 0] || AC.VID_CUE_FX[0];
const sfxName = k => (AC.sfxOf(k) || [k, k])[1];
function iconLib(c, st) {
  const L = AC.vidLibOf(S), tab = st.iTab || 'fav', q = (st.cueQ || '').toLowerCase();
  const full = g => AC.VID_ICONS.find(x => x[0] === g) || [g, ''];
  const list = tab === 'fav' ? L.favI.map(full) : tab === 'rec' ? L.recI.map(full) : AC.VID_ICONS.filter(([, n]) => !q || n.includes(q));
  return list.map(([g, n]) => `<button data-ig="${esc(g)}" aria-pressed="${!!c.icon && c.icon.g === g}" title="${esc(n)}">${g}</button>`).join('') || `<span class="small muted">${tab === 'rec' ? 'Chưa dùng icon nào' : tab === 'fav' ? 'Chưa có icon yêu thích: chọn icon rồi bấm ☆' : 'Không thấy icon'}</span>`;
}
function sfxLib(c, st) {
  const L = AC.vidLibOf(S), tab = st.sTab || 'fav', q = (st.sQ || '').toLowerCase(), gr = st.sGrp || '';
  const list = tab === 'fav' ? L.favS.map(AC.sfxOf).filter(Boolean) : tab === 'rec' ? L.recS.map(AC.sfxOf).filter(Boolean) : AC.VID_SFX.filter(x => (!gr || x[2] === gr) && (!q || x[1].toLowerCase().includes(q) || x[2].toLowerCase().includes(q)));
  return list.map(([k, n, , d]) => { const fav = L.favS.includes(k); return `<div class="vp-sfi" aria-pressed="${!!c.sfx && c.sfx.k === k}"><button class="vp-ic" data-sp="${esc(k)}" title="Nghe thử" aria-label="Nghe thử ${esc(n)}">▶</button><button class="vp-ic vp-sfn" data-sk="${esc(k)}">${esc(n)}</button><span class="vp-ln">${f1(d)}s</span><button class="vp-ic vp-star${fav ? ' on' : ''}" data-sf="${esc(k)}" title="${fav ? 'Bỏ yêu thích' : 'Yêu thích'}" aria-label="${fav ? 'Bỏ yêu thích' : 'Yêu thích'}">${fav ? '★' : '☆'}</button></div>`; }).join('') || `<span class="small muted">${tab === 'rec' ? 'Chưa dùng âm nào' : tab === 'fav' ? 'Chưa có âm yêu thích: bấm ☆ ở Thư viện' : 'Không thấy âm thanh'}</span>`;
}
function cueHtml(v, c, st, ro) {
  const ed = v.edit, t = AC.cueTime(ed, c), si = ed.scenes.findIndex(s => s.id === c.sc), sec = st.cueSec || 'icon', L = AC.vidLibOf(S);
  const sum = { icon: c.icon ? `${c.icon.g} · ${f1(c.icon.dur)}s · ${fxName(c.icon.fx)}` : 'tắt', text: c.text ? `“${esc(c.text.t)}” · ${f1(c.text.dur)}s` : 'tắt', sfx: c.sfx ? `${esc(sfxName(c.sfx.k))} · ${c.sfx.vol}%` : 'tắt' };
  const head = (k, l) => `<div class="vp-shd" data-sec="${k}" role="button" tabindex="0" aria-expanded="${sec === k}"><input type="checkbox" data-ct="${k}" ${c[k] ? 'checked' : ''} aria-label="Bật ${l}"><b>${l}</b><span class="vp-sum">${sum[k]}</span><span class="vp-chev">${sec === k ? '▾' : '▸'}</span></div>`;
  const tabs = (nm, cur, list) => `<div class="vp-subt">${list.map(([k, l]) => `<button data-${nm}="${k}" aria-selected="${cur === k}">${l}</button>`).join('')}</div>`;
  const fxSel = k => `<label>Hiệu ứng <select data-cfx="${k}">${AC.VID_CUE_FX.map((n, j) => `<option value="${j}" ${(c[k].fx || 0) === j ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  const dur = k => `<label>Hiện <input type="number" step="0.5" min="0.5" max="10" value="${c[k].dur}" data-cd="${k}" style="width:62px">s</label>`;
  const it = st.iTab || 'fav', stb = st.sTab || 'fav'; let body = '';
  if (sec === 'icon') body = `${c.icon ? `<div class="vp-curr">Đang dùng <span style="font-size:20px">${c.icon.g}</span><button class="vp-ic vp-star${L.favI.includes(c.icon.g) ? ' on' : ''}" data-if title="Yêu thích" aria-label="Yêu thích icon này">${L.favI.includes(c.icon.g) ? '★' : '☆'}</button><label style="margin-left:auto">Cỡ <input type="range" min="24" max="140" value="${c.icon.sz}" data-csz="icon" style="width:90px"></label></div><div class="vp-tools small" style="margin:0">${dur('icon')}${fxSel('icon')}</div>` : ''}
    ${tabs('itab', it, [['fav', '★ Yêu thích'], ['rec', 'Gần đây'], ['all', 'Tất cả']])}${it === 'all' ? `<input placeholder="Tìm icon (vd: giờ, não, sao)…" value="${esc(st.cueQ || '')}" data-cq aria-label="Tìm icon" style="margin-bottom:4px">` : ''}<div class="vp-lib" id="vp-clib">${iconLib(c, st)}</div>`;
  if (sec === 'text') body = c.text ? `<input value="${esc(c.text.t)}" data-ctt aria-label="Chữ của cue" maxlength="80" style="margin:4px 0"><div class="vp-tools small" style="margin:0"><select data-cst aria-label="Kiểu chữ">${AC.VID_CUE_TEXT_STYLES.map((n, k) => `<option value="${k}" ${c.text.st === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><label>Cỡ <input type="range" min="14" max="56" value="${c.text.sz}" data-csz="text"></label></div><div class="vp-tools small">${dur('text')}${fxSel('text')}</div>` : '<p class="small muted" style="margin:4px 0">Bật công tắc để thêm chữ (mặc định là từ được đặt cue).</p>';
  if (sec === 'sfx') body = `${c.sfx ? `<div class="vp-curr">Đang dùng <b>${esc(sfxName(c.sfx.k))}</b><button class="vp-ic" data-sp="${esc(c.sfx.k)}" title="Nghe thử" aria-label="Nghe thử">▶</button><label style="margin-left:auto">🔊 <input type="range" min="0" max="100" value="${c.sfx.vol}" data-csv aria-label="Âm lượng SFX" style="width:90px"></label></div>` : ''}
    ${tabs('stab', stb, [['fav', '★ Yêu thích'], ['rec', 'Gần đây'], ['lib', 'Thư viện']])}${stb === 'lib' ? `<input placeholder="Tìm âm thanh (vd: vút, chuông)…" value="${esc(st.sQ || '')}" data-sq aria-label="Tìm âm thanh" style="margin-bottom:4px"><div class="vp-subt" style="flex-wrap:wrap;margin-top:0">${['', ...AC.VID_SFX_GROUPS].map(g => `<button data-sg="${esc(g)}" aria-selected="${(st.sGrp || '') === g}">${esc(g || 'Tất cả')}</button>`).join('')}</div>` : ''}<div class="vp-sfxl" id="vp-sfxl">${sfxLib(c, st)}</div>`;
  return `<fieldset class="vp-fs" ${ro ? 'disabled' : ''}><div class="eyebrow" style="margin-bottom:4px"><span>Cue · “${esc(c.w)}” · Scene ${si + 1}</span><button class="vp-ic" data-cpx title="Đóng" aria-label="Đóng">✕</button></div>
    <div class="vp-tools small" style="margin:0">${c.lost ? '<span style="color:var(--bad)">Từ này đã bị xóa khỏi lời cảnh. Bấm một từ ở dòng Cue để đặt lại.</span>' : t == null ? '<span class="muted">Cảnh chưa có VO nên chưa có giây</span>' : `<b data-testid="ve-cuetime">${f3(t)}s</b><button class="btn sm" data-nud="-0.1">‹ −0,1s</button><button class="btn sm" data-nud="0.1">+0,1s ›</button>${c.dt ? `<span class="muted">${c.dt > 0 ? '+' : ''}${f1(c.dt)}s so với từ</span>` : ''}`}</div>
    <div class="vp-csec">${head('icon', 'Icon')}${sec === 'icon' ? body : ''}</div><div class="vp-csec">${head('text', 'Text')}${sec === 'text' ? body : ''}</div><div class="vp-csec">${head('sfx', 'SFX')}${sec === 'sfx' ? body : ''}</div>
    <div class="vp-tools small" style="margin-top:8px;border-top:1px solid var(--line);padding-top:6px"><span class="muted">Kéo icon/chữ trên khung xem thử để đổi vị trí. Yêu thích dùng chung cho mọi video.</span><button class="btn sm danger" data-cdel style="margin-left:auto">Xóa cue</button></div></fieldset>`;
}

// ---- Gắn vào popup ----
// hooks.view: bản kịch bản cũ (chỉ xem); khi có, mọi thao tác ghi dữ liệu bị chặn
export function mountEditor(host, id, hooks) {
  const H = hooks || {}; const RO = !!H.view; const key = RO ? `${id}#${H.view.verN}` : id;
  const st = ST[key] = ST[key] && ST[key].keep ? Object.assign(ST[key], { play: false, cue: null, reCue: null, fx: null, scrub: false }) : { cur: 0, t: 0, play: false, sub: 'scene', cap: false, safe: false, hist: [], fut: [], saved: '', keep: true, cue: null };
  let timer = 0; const au = { list: [], music: null }; let drag = false;
  const v = () => H.view || vOf(id);
  const tot = () => AC.editTimeline(v()).total;
  const starts = () => { let a = 0; return v().edit.scenes.map(s => { const r = a; a += s.dur; return r; }); };

  const snapNow = () => { const vv = v(); if (vv && vv.edit) st.hist.push(snapOf(vv.edit)); if (st.hist.length > 40) st.hist.shift(); st.fut = []; };
  const stamp = () => { const d = new Date(); st.saved = `Đã tự lưu ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; if (H.bar) H.bar(); };
  const commit = () => { if (RO) return; snapNow(); save(); stamp(); };
  const restore = j => { const vv = v(); vv.edit = unsnap(j); AC.migrateEdit(vv.edit); st.cur = Math.min(st.cur, vv.edit.scenes.length - 1); save(); stamp(); render(); };
  const undo = () => { if (RO) return; if (st.hist.length > 1) { st.fut.push(st.hist.pop()); restore(st.hist[st.hist.length - 1]); } };
  const redo = () => { if (RO) return; if (st.fut.length) { const j = st.fut.pop(); st.hist.push(j); restore(j); } };
  // Thực hiện một thay đổi dữ liệu: lỗi thì báo, đúng thì lưu + vẽ lại
  const act = (r, msg) => { if (r && r.ok === false) { toast(r.error, 'bad'); return false; } commit(); render(); if (msg) toast(msg); return true; };

  function stopAudio() { au.list.forEach(a => { try { a.pause(); } catch (e) { /* bỏ qua */ } }); au.list = []; try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } if (au.music) { try { au.music.pause(); } catch (e) { /* bỏ qua */ } au.music = null; } }
  function startAudio() {
    stopAudio(); if (!st.play) return; const vv = v(), ed = vv.edit; const sts = starts(); const sc = ed.scenes[st.cur]; if (!sc) return; const loc = st.t - sts[st.cur]; let voice = false;
    const speak = text => { try { if (!('speechSynthesis' in window) || !text) return false; const u = new SpeechSynthesisUtterance(text); u.lang = 'vi-VN'; const vi = window.speechSynthesis.getVoices().find(x => /^vi/i.test(x.lang)); if (vi) u.voice = vi; u.rate = Math.max(0.7, Math.min(1.6, AC.vidSettingsOf(S).wps / 2.5)); window.speechSynthesis.speak(u); return true; } catch (e) { return false; } };
    const play = (src, from) => { const a = new Audio(src); try { a.currentTime = Math.max(0, from); } catch (e) { /* bỏ qua */ } a.play().catch(() => {}); au.list.push(a); };
    if (ed.voAll) { const src = srcOf(vv, ed.voAll); if (src) { play(src, st.t); voice = st.t < ed.voAll.dur; } else if (loc < 0.6) voice = speak(sc.text); }
    else if (sc.vo) { const src = srcOf(vv, sc.vo); if (src) { play(src, loc); voice = loc < sc.vo.dur; } else if (loc < 0.6) voice = speak(sc.text); }
    else if (ed.voice.mode === 'tts' && sc.text && loc < 0.6) voice = speak(sc.text);
    if (ed.music && ed.music.src) { const a = new Audio(ed.music.src); a.loop = true; a.volume = ed.music.vol * (voice && ed.music.duck !== false ? 0.35 : 1); a.play().catch(() => {}); au.music = a; }
  }
  function vidTime(it, rel, share, el) {
    const base = it.from || 0, d = it.dur || 0;
    if (d > 0 && d < share - 0.3) { const m = it.short || 'hold'; if (m === 'loop') { el.playbackRate = 1; return base + rel % d; } if (m === 'slow') { el.playbackRate = Math.max(0.25, d / share); return base + rel * d / share; } el.playbackRate = 1; return base + Math.min(rel, Math.max(0, d - 0.05)); }
    el.playbackRate = 1; return base + (it.trim || 0) + rel;
  }
  function frameHtml(vv, ed) {
    const f = ed.frame, stl = AC.frameStyleOf(S);
    if (f === 'logo') return `<span class="vp-flogo" style="background:${esc(stl.color || 'var(--accent)')}">${esc(stl.logo || 'Logo')}</span>`;
    if (f === 'band') return `<div class="vp-fband" style="background:${esc(stl.color || '#333')}"><span style="background:${esc(stl.accent || '#fff')}"></span>${esc(vv.insight.title.replace(/^[^:]{2,30}:\s*/, '').slice(0, 70))}</div>`;
    const pf = (S.frames || []).find(x => x.id === f); return pf ? `<img src="${esc(pf.src)}" alt="" class="vp-fimg">` : '';
  }
  function paint() {
    const box = host.querySelector('#vp-box'); const vv = v(); if (!box || !vv || !vv.edit || !vv.edit.scenes.length) return; const ed = vv.edit;
    const T = tot(); if (st.t > T) st.t = T; const sts = starts(); st.cur = Math.min(st.cur, ed.scenes.length - 1);
    const sc = ed.scenes[st.cur], t0 = sts[st.cur], k = sc.items.length, loc = Math.max(0, st.t - t0); const { k: ik, off } = k ? curItem(sc, loc) : { k: 0, off: 0 }; const it = k ? sc.items[ik] : null;
    const txt = AC.captionAt(vv, Math.max(0, st.t)) || ''; const style = ed.captions.style || 0;
    let ct = esc(txt); if (style === 2 && txt) { const w = txt.split(' '); let li = 0; w.forEach((x, i) => { if (x.length > w[li].length) li = i; }); ct = w.map((x, i) => i === li ? `<em>${esc(x)}</em>` : esc(x)).join(' '); }
    const src = it ? srcOf(vv, it) : '';
    const key2 = [st.cur, ik, sc.fit, ed.frame, style, ed.captions.pos, ed.captions.mode, st.safe, src.length, src.slice(-24), sc.prompt, sc.ph].join('|');
    if (box.dataset.k !== key2) {
      box.dataset.k = key2; let h = '';
      if (it && src) h += it.kind === 'video' ? `<video class="vp-media${sc.fit === 'fit' ? ' contain' : ''}" src="${esc(src)}" playsinline preload="auto"></video>` : `<img class="vp-media${sc.fit === 'fit' ? ' contain' : ''}" src="${esc(src)}" alt="">`;
      else h += `<div class="vp-ph"><b>Thẻ giữ chỗ</b><span>${esc(sc.prompt || 'Chưa có mô tả hình')}</span></div>`;
      h += `<div class="vp-flash"></div>${k > 1 ? `<div class="vp-ovk">ảnh ${ik + 1}/${k}</div>` : ''}<div class="vp-cap pos-${esc(ed.captions.pos)} s${style}" ${ed.captions.mode === 'off' ? 'hidden' : ''}><span></span></div><div class="vp-lys" id="vp-lys" data-testid="ve-layers"></div><div class="vp-fm">${frameHtml(vv, ed)}</div>${st.safe ? '<div class="vp-safe"></div>' : ''}`;
      box.innerHTML = h;
      host.querySelectorAll('.vp-th').forEach(e => e.setAttribute('aria-current', String(Number(e.dataset.i) === st.cur && Number(e.dataset.j) === ik)));
      const mn = host.querySelector(`.vp-sc[data-c="${st.cur}"] .vp-add.has`); if (mn && it && mn.dataset.src !== src.slice(-40)) { mn.dataset.src = src.slice(-40); mn.innerHTML = thumbHtml(vv, it); }
    }
    const el = box.querySelector('video');
    if (el) { el.muted = ed.voice.mode !== 'clip'; el.volume = Math.max(0, Math.min(1, sc.vol / 100)); try { const tt = vidTime(it, loc - off, it.d, el); if (!st.play || Math.abs(el.currentTime - tt) > 0.5) el.currentTime = tt; if (st.play && el.paused) el.play().catch(() => {}); if (!st.play) el.pause(); } catch (e) { /* chưa sẵn sàng */ } }
    fxPaint(box, ed, ik, it, loc, off);
    const cs = box.querySelector('.vp-cap span'); if (cs) cs.innerHTML = ct;
    // Lớp cue (icon, chữ) đang hiện ở giây hiện tại; nằm trên hình và caption
    const ly = box.querySelector('#vp-lys');
    if (ly && !drag) {
      const on = []; (ed.cues || []).forEach(c => { const a = AC.cueTime(ed, c); if (a == null) return; ['icon', 'text'].forEach(kk => { const o = c[kk]; if (o && st.t >= a - 0.001 && st.t < a + o.dur) on.push([c, kk, o]); }); });
      const lk = on.map(([c, kk, o]) => [c.id, kk, o.x, o.y, o.sz, o.g, o.t, o.st, o.fx, st.cue === c.id].join(':')).join('|');
      if (ly.dataset.k !== lk) { ly.dataset.k = lk; ly.innerHTML = on.map(([c, kk, o]) => `<div class="vp-ly fx${o.fx || 0} ${kk === 'text' ? `lt${o.st}` : ''}${st.cue === c.id ? ' sel' : ''}" data-ly="${esc(c.id)},${kk}" style="left:${o.x}%;top:${o.y}%;font-size:${o.sz}px" title="${RO ? 'Cue' : 'Kéo để đổi vị trí'}">${kk === 'icon' ? o.g : esc(o.t)}${RO ? '' : '<span class="vp-rz" title="Kéo để đổi cỡ"></span>'}</div>`).join(''); }
    }
    host.querySelectorAll('.vp-cb').forEach(b => b.setAttribute('aria-current', String(st.cue === b.dataset.c)));
    { const tb = host.querySelector('#vp-time'); if (tb && !st.scrub) { tb.max = String(Math.round(T * 10)); tb.value = String(Math.round(st.t * 10)); tb.setAttribute('aria-valuetext', `${mmss(st.t)} trên ${mmss(T)}`); } const tx = host.querySelector('#vp-tt'); if (tx) tx.textContent = `${mmss(st.t)} / ${mmss(T)}`; }
    const pl = host.querySelector('#vp-play'); if (pl) { pl.textContent = st.play ? '⏸' : '▶'; pl.title = st.play ? 'Dừng' : 'Phát'; pl.setAttribute('aria-label', st.play ? 'Dừng' : 'Phát'); }
    const ph = host.querySelector('#vp-phl'); if (ph) ph.style.left = `${st.t / (T || 1) * 100}%`; const tt = host.querySelector('#vp-tlt'); if (tt) tt.textContent = `${st.t.toFixed(1)}s / ${f1(T)}s`;
    host.querySelectorAll('.vp-seg').forEach(e => { const g = vv.edit.segs && vv.edit.segs[Number(e.dataset.g)]; e.classList.toggle('now', !!g && txt === g.t && g.at <= st.t); });
  }
  // Chuyển động chỉ áp dụng cho ảnh (AC.motionOf trả 'none' cho video); chuyển cảnh chỉ chạy khi đang phát
  function fxPaint(box, ed, ik, it, loc, off) {
    const md = box.querySelector('.vp-media'), fl = box.querySelector('.vp-flash'); if (fl) fl.style.opacity = '0'; if (!md || !it) return;
    const p = Math.max(0, Math.min(1, (loc - off) / (it.d || 1))), mt = AC.motionTransform(AC.motionOf(ed, st.cur, ik), p);
    const tr = AC.transOf(ed, st.cur), D = ed.fxDur || 0.5, q = st.play && ik === 0 && loc < D ? Math.max(0, loc / D) : 1;
    let pre = '', op = 1, clip = 'none';
    if (q < 1) { if (tr === 'fade') op = q; else if (tr === 'slide') pre = `translateX(${(1 - q) * 100}%) `; else if (tr === 'zoom') { pre = `scale(${0.75 + 0.25 * q}) `; op = q; } else if (tr === 'wipe') clip = `inset(0 ${(1 - q) * 100}% 0 0)`; else if (tr === 'flash' && fl) fl.style.opacity = String(1 - q); }
    md.style.transform = (pre + (it.kind === 'video' ? '' : mt)).trim() || 'none'; md.style.opacity = String(op); md.style.clipPath = clip;
  }
  // Đồng bộ Scene ↔ Timeline: cảnh được chọn ở một bên thì bên kia sáng lên; chọn ở timeline thì cột Scene cuộn cảnh đó lên mép trên
  function revealScene(i, flash) {
    const pc = host.querySelector('.vp-pane'), el = host.querySelector(`.vp-sc[data-c="${i}"]`); if (!pc || !el) return;
    const a = pc.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (b.top < a.top + 4 || b.bottom > a.bottom - 4) pc.scrollTo({ top: pc.scrollTop + b.top - a.top - 8, behavior: 'smooth' });
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  function flashBlk(i) { const b = host.querySelector(`.vp-blk[data-i="${i}"]`); if (!b) return; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); const r = b.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  // ---- Thư viện frame và thư viện nhạc nền (hộp thoại) ----
  function openFrameLib() {
    const all = (S.frames || []).filter(f => f.kind === 'png' && f.ratio === '9:16');
    const box = openLayer(`<h2>Thư viện frame</h2>${all.length ? `<div class="vp-frames vp-libgrid">${all.map(f => `<button class="vp-fr" data-fl="${esc(f.id)}" aria-pressed="${v().edit.frame === f.id}" title="${esc(f.name)}"><i><img src="${esc(f.src)}" alt=""></i>${esc(f.name)}</button>`).join('')}</div><p class="small muted">Chọn một frame để dùng ngay; frame vừa chọn lên hàng Yêu thích (tối đa 4).</p>` : '<p class="muted">Chưa có frame PNG 9:16. Thêm frame ở mục Frame của app, rồi quay lại đây.</p>'}<div class="actions"><button class="btn" data-x="no">Đóng</button></div>`, 'dialog');
    box.addEventListener('click', e => { const b = e.target.closest('[data-fl]'), x = e.target.closest('[data-x]'); if (x) { closeLayer(); return; } if (!b) return; AC.vidPinFrame(S, b.dataset.fl); AC.setEditOptions(S, id, { frame: b.dataset.fl }); closeLayer(); commit(); render(); });
  }
  function openMusicLib() {
    const lib = AC.vidLibOf(S), list = lib.music || []; let prev = null; const stop = () => { if (prev) { try { prev.pause(); } catch (e) { /* bỏ qua */ } prev = null; } };
    const body = () => list.length ? list.map(t => `<div class="vp-mu" data-mu="${esc(t.id)}"><b class="small">${esc(t.name)}</b><span class="small muted">${esc(t.license || 'chưa ghi giấy phép')}</span><span class="vp-mub"><button class="btn sm" data-mp="${esc(t.id)}" aria-label="Nghe thử ${esc(t.name)}">▶</button><button class="btn sm primary" data-mu-use="${esc(t.id)}">Dùng</button><button class="btn sm ghost" data-mu-del="${esc(t.id)}" aria-label="Xóa ${esc(t.name)} khỏi thư viện">✕</button></span></div>`).join('') : '<p class="muted">Thư viện trống. Bấm Up nhạc để thêm bài đầu tiên; bài đã Up tự vào đây (lưu tối đa 8 bài).</p>';
    const box = openLayer(`<h2>Thư viện nhạc nền</h2><div class="vp-mulist">${body()}</div><div class="actions"><button class="btn" data-x="no">Đóng</button></div>`, 'dialog');
    box.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'), u = e.target.closest('[data-mu-use]'), d = e.target.closest('[data-mu-del]'), p = e.target.closest('[data-mp]');
      if (x) { stop(); closeLayer(); return; }
      if (p) { const t = list.find(q => q.id === p.dataset.mp); const was = prev && prev.dataset && prev.dataset.id === t.id; stop(); if (t && !was) { prev = new Audio(t.src); prev.dataset = { id: t.id }; prev.volume = 0.6; prev.play().catch(() => { /* bỏ qua */ }); } return; }
      if (u) { const t = list.find(q => q.id === u.dataset.muUse); if (!t) return; stop(); const r = AC.setEditOptions(S, id, { music: { src: t.src, name: t.name, license: t.license, peaks: t.peaks } }); if (r.ok === false) { toast(r.error, 'bad'); return; } closeLayer(); if (st.play) startAudio(); commit(); render(); toast('Đã dùng nhạc nền từ thư viện.'); return; }
      if (d) { AC.vidMusicDel(S, d.dataset.muDel); const i = list.findIndex(q => q.id === d.dataset.muDel); if (i >= 0) list.splice(i, 1); save(); box.querySelector('.vp-mulist').innerHTML = body(); }
    });
  }
  // ---- Cửa sổ chỉnh hiệu ứng riêng của scene ----
  const fxEl = () => document.getElementById('vp-fxpop');
  function fxPos() { const p = fxEl(), a = st.fx == null ? null : host.querySelector(`[data-a="fxo"][data-i="${st.fx}"]`); if (!p || !a) return; const r = a.getBoundingClientRect(), h = p.offsetHeight, w = p.offsetWidth; let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6); p.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left))}px`; p.style.top = `${y}px`; }
  function closeFx() { st.fx = null; const p = fxEl(); if (p) p.remove(); host.querySelectorAll('[data-a="fxo"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  function drawFx() {
    let p = fxEl(); const vv = v();
    if (st.fx == null || RO || st.sub !== 'scene' || st.cap || !vv || !vv.edit || !vv.edit.scenes[st.fx]) { if (p) p.remove(); if (st.fx != null && (!vv || !vv.edit || !vv.edit.scenes[st.fx])) st.fx = null; return; }
    if (!p) { p = document.createElement('div'); p.id = 'vp-fxpop'; p.className = 'vp-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Hiệu ứng scene'); p.dataset.testid = 've-fxpop'; layerRoot().appendChild(p);
      p.addEventListener('change', e => { const el = e.target, a = el.dataset.a; if (a !== 'fmo' && a !== 'ftr') return; const i = Number(el.dataset.i), sc = v().edit.scenes[i]; if (!sc) return; if (act(AC.editScene(S, id, sc.id, { [a === 'fmo' ? 'mo' : 'tr']: el.value || null }))) { seekScene(i); st.play = true; startAudio(); paint(); } });
      p.addEventListener('click', e => { const b = e.target.closest('[data-a="fauto"]'); if (!b || b.disabled) return; const sc = v().edit.scenes[Number(b.dataset.i)]; if (sc) act(AC.editScene(S, id, sc.id, { mo: null, tr: null })); }); }
    p.innerHTML = `<div class="eyebrow" style="margin-bottom:6px"><span>Hiệu ứng · Scene ${st.fx + 1}</span><button class="vp-ic" data-fxx title="Đóng" aria-label="Đóng">✕</button></div>${fxBox(vv, st.fx)}`;
    p.querySelector('[data-fxx]').onclick = closeFx; fxPos(); const pc = host.querySelector('.vp-pane'); if (pc) pc.onscroll = fxPos;
  }
  function mark() { host.querySelectorAll('.vp-sc').forEach(e => e.setAttribute('aria-current', String(Number(e.dataset.c) === st.cur))); host.querySelectorAll('.vp-blk').forEach(e => e.setAttribute('aria-current', String(Number(e.dataset.i) === st.cur))); }
  function seekT(t) { st.t = Math.round(Math.max(0, Math.min(tot() - 0.05, t)) * 1000) / 1000; const sts = starts(); let c = 0; sts.forEach((x, i) => { if (st.t >= x) c = i; }); st.cur = c; if (st.play) startAudio(); mark(); paint(); }
  function seekScene(i, j) { const sc = v().edit.scenes[i]; let t = starts()[i] || 0; for (let q = 0; q < (j || 0); q++) t += sc.items[q].d; st.cur = i; st.t = r1(t); if (st.play) startAudio(); mark(); paint(); }
  function cleanup() { stopAudio(); closeCue(); closeFx(); hideTip(); document.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', fxKey, true); }
  function tick() {
    if (!host.isConnected) { clearInterval(timer); cleanup(); return; }
    if (!st.play) return; const p0 = st.t; st.t = Math.round((st.t + 0.1) * 10) / 10; const T = tot(); const ed = v().edit;
    (ed.cues || []).forEach(c => { if (!c.sfx) return; const a = AC.cueTime(ed, c); if (a != null && a > p0 && a <= st.t + 1e-9) playSfx(c.sfx.k, c.sfx.vol); });
    if (st.t >= T) { st.t = 0; st.cur = 0; st.play = false; stopAudio(); mark(); paint(); return; }
    const sts = starts(); let c = 0; sts.forEach((x, i) => { if (st.t >= x) c = i; });
    if (c !== st.cur) { st.cur = c; mark(); startAudio(); const ae = document.activeElement; if (!(ae && ae.closest && ae.closest('.vp-pane') && ae.matches('textarea,input'))) revealScene(c, false); } paint();
  }

  // ---- Cue: tooltip khi rê chuột, popup khi bấm ----
  const cueById = cid => AC.cueOf(v().edit, cid);
  function showTip(c, el) {
    if (!c) return; let tp = document.getElementById('vp-tip'); if (!tp) { tp = document.createElement('div'); tp.id = 'vp-tip'; tp.className = 'vp-tip'; tp.setAttribute('role', 'tooltip'); layerRoot().appendChild(tp); }
    const t = AC.cueTime(v().edit, c);
    tp.innerHTML = `<div><b>${t == null ? '—' : `${f3(t)}s`}</b> · “${esc(c.w)}”</div>${c.icon ? `<div>${c.icon.g} Icon · ${f1(c.icon.dur)}s · ${esc(fxName(c.icon.fx))}</div>` : ''}${c.text ? `<div>T “${esc(c.text.t)}” · ${f1(c.text.dur)}s</div>` : ''}${c.sfx ? `<div>♪ ${esc(sfxName(c.sfx.k))} · ${c.sfx.vol}%</div>` : ''}${!c.icon && !c.text && !c.sfx ? '<div>Chưa có nội dung</div>' : ''}<div style="opacity:.65">${RO ? 'Bấm để xem' : 'Bấm để sửa · ✕ để xóa'}</div>`;
    tp.hidden = false; const r = el.getBoundingClientRect(); tp.style.left = `${Math.max(8, Math.min(innerWidth - tp.offsetWidth - 8, r.left + r.width / 2 - tp.offsetWidth / 2))}px`; tp.style.top = `${Math.max(8, r.top - tp.offsetHeight - 8)}px`;
  }
  function hideTip() { const tp = document.getElementById('vp-tip'); if (tp) tp.hidden = true; }
  const popEl = () => document.getElementById('vp-cuepop');
  function closeCue() { st.cue = null; st.reCue = null; const p = popEl(); if (p) p.remove(); host.querySelectorAll('.vp-cb').forEach(b => b.setAttribute('aria-current', 'false')); const ly = host.querySelector('#vp-lys'); if (ly) ly.dataset.k = ''; }
  function openCue(cid, anchor) {
    if (st.cue !== cid) st.cueQ = ''; st.cue = cid; let p = popEl();
    if (!p) { p = document.createElement('div'); p.id = 'vp-cuepop'; p.className = 'vp-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Cue'); p.dataset.testid = 've-cuepop'; p.setAttribute('data-testid', 've-cuepop'); layerRoot().appendChild(p); bindPop(p); }
    drawCue();
    if (anchor) { const r = anchor.getBoundingClientRect(), h = p.offsetHeight, w = p.offsetWidth; let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6); p.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`; p.style.top = `${y}px`; }
    const ly = host.querySelector('#vp-lys'); if (ly) ly.dataset.k = ''; paint();
  }
  function drawCue() { const p = popEl(); if (!p) return; const c = cueById(st.cue); if (!c) { closeCue(); return; } p.innerHTML = cueHtml(v(), c, st, RO); }
  const showCueTime = c => { const a = AC.cueTime(v().edit, c); if (a != null) seekT(a); };
  // Mọi thay đổi cue đi qua AC.editCue; xong thì lưu, vẽ lại (popup vẽ lại theo)
  const cueEdit = (c, patch, after) => { if (RO) return; const r = AC.editCue(S, id, c.id, patch); if (!r.ok) { toast(r.error, 'bad'); drawCue(); return; } commit(); render(); if (after) after(); };
  function bindPop(p) {
    p.addEventListener('click', e => {
      const c = cueById(st.cue); if (!c) return; const T = e.target;
      if (T.closest('[data-cpx]')) { closeCue(); return; }
      const sp = T.closest('[data-sp]'); if (sp) { playSfx(sp.dataset.sp, c.sfx ? c.sfx.vol : 80); return; }
      const sh = T.closest('[data-sec]'); if (sh && !T.matches('input')) { st.cueSec = sh.dataset.sec; drawCue(); return; }
      const tb = T.closest('[data-itab],[data-stab],[data-sg]'); if (tb) { if (tb.dataset.itab) st.iTab = tb.dataset.itab; else if (tb.dataset.stab) st.sTab = tb.dataset.stab; else st.sGrp = tb.dataset.sg; drawCue(); return; }
      if (RO) return;
      const nd = T.closest('[data-nud]'); if (nd) { cueEdit(c, { dt: r1((c.dt || 0) + Number(nd.dataset.nud)) }, () => showCueTime(c)); return; }
      if (T.closest('[data-cdel]')) { delCue(c.id); return; }
      const ig = T.closest('[data-ig]'); if (ig) { cueEdit(c, { icon: { g: ig.dataset.ig } }, () => showCueTime(c)); return; }
      if (T.closest('[data-if]') && c.icon) { AC.toggleVidFav(S, 'icon', c.icon.g); save(); drawCue(); return; }
      const sk = T.closest('[data-sk]'); if (sk) { cueEdit(c, { sfx: { k: sk.dataset.sk } }, () => playSfx(c.sfx.k, c.sfx.vol)); return; }
      const sf = T.closest('[data-sf]'); if (sf) { AC.toggleVidFav(S, 'sfx', sf.dataset.sf); save(); drawCue(); }
    });
    p.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-sec]')) { e.preventDefault(); st.cueSec = e.target.dataset.sec; drawCue(); } if (e.key === 'Escape') { e.stopPropagation(); closeCue(); } });
    p.addEventListener('input', e => {
      const c = cueById(st.cue); if (!c || RO) return; const T = e.target;
      if (T.matches('[data-cq]')) { st.cueQ = T.value; p.querySelector('#vp-clib').innerHTML = iconLib(c, st); return; }
      if (T.matches('[data-sq]')) { st.sQ = T.value; p.querySelector('#vp-sfxl').innerHTML = sfxLib(c, st); return; }
      // xem trước ngay khi kéo; ghi vào dữ liệu khi thả (change)
      if (T.matches('[data-csz]') && c[T.dataset.csz]) { c[T.dataset.csz].sz = Number(T.value); paint(); return; }
      if (T.matches('[data-ctt]') && c.text) { c.text.t = T.value; paint(); return; }
      if (T.matches('[data-csv]') && c.sfx) c.sfx.vol = Number(T.value);
    });
    p.addEventListener('change', e => {
      const c = cueById(st.cue); if (!c || RO) return; const T = e.target;
      if (T.matches('[data-ct]')) { const kk = T.dataset.ct; st.cueSec = kk; cueEdit(c, { [kk]: T.checked ? {} : null }, () => { if (kk === 'sfx' && c.sfx) playSfx(c.sfx.k, c.sfx.vol); showCueTime(c); }); return; }
      if (T.matches('[data-csz]')) { cueEdit(c, { [T.dataset.csz]: { sz: Number(T.value) } }); return; }
      if (T.matches('[data-cd]')) { cueEdit(c, { [T.dataset.cd]: { dur: Number(T.value) } }); return; }
      if (T.matches('[data-cfx]')) { cueEdit(c, { [T.dataset.cfx]: { fx: Number(T.value) } }, () => showCueTime(c)); return; }
      if (T.matches('[data-ctt]')) { cueEdit(c, { text: { t: T.value } }); return; }
      if (T.matches('[data-cst]')) { cueEdit(c, { text: { st: Number(T.value) } }); return; }
      if (T.matches('[data-csv]')) { cueEdit(c, { sfx: { vol: Number(T.value) } }, () => playSfx(c.sfx.k, c.sfx.vol)); }
    });
  }
  function delCue(cid) { if (RO) return; const r = AC.removeCue(S, id, cid); if (!r.ok) return toast(r.error, 'bad'); if (st.cue === cid) closeCue(); hideTip(); commit(); render(); }
  function fxKey(e) { if (e.key === 'Escape' && st.fx != null) { closeFx(); e.stopPropagation(); } }   // bắt ở window để Esc chỉ đóng cửa sổ hiệu ứng, không đóng cả popup Vid
  window.addEventListener('keydown', fxKey, true);
  function outside(e) { if (st.fx != null && !e.target.closest('#vp-fxpop,[data-a="fxo"]')) closeFx(); if (st.cue && !e.target.closest('#vp-cuepop,.vp-cb,.vp-cw,.vp-ly')) closeCue(); }
  document.addEventListener('pointerdown', outside, true);
  // Kéo icon / chữ trên khung xem thử: đổi vị trí; góc dưới phải: đổi cỡ
  host.addEventListener('pointerdown', e => {
    const el = e.target.closest('.vp-ly'); if (!el) return; e.preventDefault(); e.stopPropagation();
    const [cid, kk] = el.dataset.ly.split(','); const c = cueById(cid); if (!c) return; if (RO) { openCue(c.id, el); return; }
    const o = c[kk], box = host.querySelector('#vp-box').getBoundingClientRect(), rz = e.target.classList.contains('vp-rz'), x0 = e.clientX, y0 = e.clientY, ox = o.x, oy = o.y, os = o.sz; let moved = false; drag = true;
    const mv = ev => { const dx = ev.clientX - x0, dy = ev.clientY - y0; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (rz) { o.sz = Math.round(Math.max(12, Math.min(160, os + (dx + dy) / 2))); el.style.fontSize = `${o.sz}px`; } else { o.x = r1(Math.max(0, Math.min(100, ox + dx / box.width * 100))); o.y = r1(Math.max(0, Math.min(100, oy + dy / box.height * 100))); el.style.left = `${o.x}%`; el.style.top = `${o.y}%`; } };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); drag = false; if (moved) { const r = AC.editCue(S, id, c.id, { [kk]: { x: o.x, y: o.y, sz: o.sz } }); if (r.ok) commit(); } openCue(c.id, el); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  host.addEventListener('mouseover', e => { const b = e.target.closest('.vp-cb'); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) showTip(cueById(b.dataset.c), b); });
  host.addEventListener('mouseout', e => { const b = e.target.closest('.vp-cb'); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) hideTip(); });

  function render() {
    const vv = v(); if (!vv) return; const keepScroll = host.querySelector('.vp-pane'); const sy = keepScroll ? keepScroll.scrollTop : 0;
    if (!st.play) stopAudio();
    if (!vv.edit || !vv.edit.scenes.length) { host.innerHTML = emptyHtml(vv, RO); return; }
    if (!st.hist.length && !RO) st.hist.push(snapOf(vv.edit));
    hideTip(); host.innerHTML = bodyHtml(vv, st, RO); const p = host.querySelector('.vp-pane'); if (p) p.scrollTop = sy;
    drawFx(); bindTl(); paint();
    if (st.cue) { if (cueById(st.cue)) drawCue(); else closeCue(); }
  }
  function bindTl() {
    if (RO) return;
    host.querySelectorAll('.vp-hdl').forEach(h => { h.onpointerdown = e => dragStart(e, Number(h.dataset.h)); h.onkeydown = e => keyNudge(e, Number(h.dataset.h)); });
    host.querySelectorAll('.vp-ih').forEach(h => { const [i, j] = h.dataset.ih.split(',').map(Number); h.onpointerdown = e => dragStart(e, i, j); h.onkeydown = e => keyItem(e, i, j); });
  }
  // Vẽ lại riêng timeline khi đang kéo (khỏi vẽ lại cả thẻ cảnh)
  function liveTl() { const w = host.querySelector('.vp-tlw'); if (!w) return; const tmp = document.createElement('div'); tmp.innerHTML = timelineHtml(v(), st); w.replaceWith(tmp.firstElementChild); bindTl(); paint(); }
  // Kéo mép cảnh (j null) hoặc vạch giữa ảnh j và j+1: mỗi lần di chuyển tính lại từ độ dài lúc bắt đầu kéo
  function dragStart(e, i, j) {
    e.preventDefault(); e.stopPropagation(); const ed = v().edit; const tl = host.querySelector('#vp-tl'); const W = tl.getBoundingClientRect().width || 1, T0 = tot(), x0 = e.clientX;
    const base = ed.scenes.map(s => ({ dur: s.dur, d: s.items.map(m => m.d) })); const sid = ed.scenes[i].id; const was = ed.capStale; const item = j != null; const d0 = item ? ed.scenes[i].items[j].d : base[i].dur;
    const back = () => ed.scenes.forEach((s, q) => { s.dur = base[q].dur; s.items.forEach((m, z) => { m.d = base[q].d[z]; }); });
    const mv = ev => { back(); const nd = r1(d0 + (ev.clientX - x0) / W * T0); if (item) AC.resizeItem(S, id, sid, j, nd); else AC.resizeScene(S, id, sid, nd); liveTl(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const ch = ed.scenes.some((s, q) => s.dur !== base[q].dur || s.items.some((m, z) => m.d !== base[q].d[z])); if (ch) commit(); else ed.capStale = was; render(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function keyNudge(e, i) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const sc = v().edit.scenes[i]; const r = AC.nudgeScene(S, id, sc.id, (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 2 : 0.5));
    if (r.ok && r.changed) { commit(); render(); } else if (!r.ok) toast(r.error, 'bad');
    const n = host.querySelector(`.vp-hdl[data-h="${i}"]`); if (n) n.focus();
  }
  function keyItem(e, i, j) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const sc = v().edit.scenes[i]; const d = sc.items[j].d; const r = AC.resizeItem(S, id, sc.id, j, d + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 2 : 0.5));
    if (!r.ok) toast(r.error, 'bad'); else if (sc.items[j].d !== d) { commit(); render(); }
    const n = host.querySelector(`.vp-ih[data-ih="${i},${j}"]`); if (n) n.focus();
  }

  // ---- Tải tệp ----
  let upTarget = null;
  const pick = (sel, target) => { upTarget = target; const f = host.querySelector(sel); if (f) f.click(); };
  async function onFiles(e) {
    const el = e.target; const files = [...(el.files || [])]; el.value = ''; if (!files.length || RO) return;
    try {
      if (el.id === 'vp-file') { const sid = v().edit.scenes[upTarget].id; const ms = await readMediaList(files); act(AC.addSceneItems(S, id, sid, ms.map(m => ({ src: m.src, name: m.name, dur: m.dur, thumb: m.thumb }))), `Đã thêm ${ms.length} hình vào cảnh ${upTarget + 1}.`); return; }
      if (el.id === 'vp-fileM') { const m = await readMedia(files[0]); if (!act(AC.setEditOptions(S, id, { music: { src: m.src, name: m.name } }), 'Đã thêm nhạc nền. Ghi nguồn/giấy phép bên dưới.')) return; const p = await decodePeaks(m.src, 200); if (p) AC.setEditOptions(S, id, { musicPeaks: p }); AC.vidMusicAdd(S, { name: m.name, src: m.src, peaks: p || null }); save(); render(); return; }
      if (el.id === 'vp-fileA') {
        const m = await readMedia(files[0]); const dur = m.dur || (await audioDur(m.src)); const tgt = upTarget; const all = tgt === 'all';
        const r = all ? AC.setVoAll(S, id, { kind: 'up', name: m.name, src: m.src, dur }) : AC.setSceneVo(S, id, v().edit.scenes[tgt].id, { kind: 'up', name: m.name, src: m.src, dur });
        if (!act(r, all ? '' : 'Đã thêm VO cảnh: cảnh dài đúng bằng VO.')) return; const p = await decodePeaks(m.src, all ? 200 : 60);
        if (p) { AC.setVoPeaks(S, id, all ? 'all' : v().edit.scenes[tgt].id, p); save(); render(); }
      }
    } catch (er) { toast(er.message, 'bad'); }
  }
  host.addEventListener('change', e => {
    if (e.target.type === 'file') { onFiles(e); return; }
    const el = e.target; const a = el.dataset.a;
    if (a === 'safe') { st.safe = el.checked; paint(); return; }
    if (el.id === 'vp-time') { st.scrub = false; paint(); return; }
    if (RO) return;
    const i = Number(el.dataset.i); const ed = v().edit; const sc = ed && ed.scenes[i];
    if (el.dataset.sf && sc) { const r = AC.editScene(S, id, sc.id, { [el.dataset.sf]: el.value }); if (r.ok) { commit(); if (el.dataset.sf === 'text') render(); else paint(); } else { toast(r.error, 'bad'); render(); } return; }
    if (a === 'tpl') { applyTpl(el.value); return; }
    if (el.id === 've-gtr') { act(AC.setEditOptions(S, id, { fxTr: el.value })); return; }
    if (el.id === 've-gmo') { act(AC.setEditOptions(S, id, { fxMo: el.value })); return; }
    if (el.id === 've-gdu') { act(AC.setEditOptions(S, id, { fxDur: Number(el.value) })); return; }
    if (a === 'fit') { AC.editScene(S, id, sc.id, { fit: el.value }); commit(); paint(); return; }
    if (a === 'vol') { AC.editScene(S, id, sc.id, { vol: el.value }); commit(); return; }
    if (a === 'short') { AC.editSceneItem(S, id, sc.id, Number(el.dataset.j), { short: el.value }); commit(); paint(); return; }
    if (a === 'trim') { AC.editSceneItem(S, id, sc.id, Number(el.dataset.j), { trim: el.value }); commit(); render(); return; }
    if (a === 'unit') { if (el.value === '') return; const u = AC.brollUnits(v())[Number(el.value)]; if (u) act(AC.addSceneItems(S, id, sc.id, [{ mediaId: u.mediaId, from: u.from, to: u.kind === 'image' ? 0 : u.to }])); return; }
    if (a === 'cut') { AC.toggleVidCut(S, id, i, el.checked); AC.planEdit(S, id); st.cur = 0; act({ ok: true }, 'Đã chia lại cảnh theo đoạn giữ.'); return; }
    if (a === 'musvol') { AC.setEditOptions(S, id, { musicVol: Number(el.value) / 100 }); commit(); return; }
    if (a === 'duck') { AC.setEditOptions(S, id, { musicDuck: el.checked }); commit(); return; }
    if (a === 'lic') { AC.setEditOptions(S, id, { musicLicense: el.value }); commit(); render(); return; }
    if (a === 'segt') { const r = AC.editSeg(S, id, i, { t: el.value }); if (r.ok) { commit(); paint(); } else { toast(r.error, 'bad'); render(); } return; }
    if (a === 'segat') { AC.editSeg(S, id, i, { at: el.value }); commit(); render(); return; }
    if (el.id === 've-voice') { act(AC.setEditOptions(S, id, { voice: el.value })); return; }
    if (el.id === 've-cap') { AC.setEditOptions(S, id, { captions: el.value }); const e2 = v().edit; e2.capStale = true; act({ ok: true }); return; }
    if (el.id === 've-pos') { AC.setEditOptions(S, id, { pos: el.value }); commit(); paint(); }
  });
  host.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'vp-time') { st.scrub = true; seekT(Number(el.value) / 10); revealScene(st.cur, false); return; }
    if (RO) return;
    if (el.dataset.a === 'musvol') { const ed = v().edit; if (ed.music) ed.music.vol = Number(el.value) / 100; if (au.music) au.music.volume = ed.music.vol; }
    if (el.dataset.a === 'trim') { const sc = v().edit.scenes[Number(el.dataset.i)]; sc.items[Number(el.dataset.j)].trim = Number(el.value); if (el.nextElementSibling) el.nextElementSibling.textContent = el.value; st.cur = Number(el.dataset.i); paint(); }
  });
  async function applyTpl(k) {
    const ed = v().edit; const has = ed.scenes.some(s => s.items.length || s.vo) || (ed.cues || []).length;
    if (has && !(await confirmBox({ title: 'Đổi mẫu?', body: '<p>Chia lại cảnh theo mẫu mới: hình, VO cảnh và cue đã thêm sẽ bị xóa. VO toàn bài, kiểu caption, frame, nhạc giữ nguyên.</p>', ok: 'Đổi mẫu' }))) { render(); return; }
    st.cur = 0; st.t = 0; closeCue(); act(AC.applyTemplate(S, id, k), 'Đã chia cảnh theo mẫu.');
  }
  host.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('.vp-sc'); if (!c) return; const i = Number(c.dataset.c); if (st.cur !== i) { st.cur = i; st.t = starts()[i]; if (st.play) startAudio(); mark(); paint(); flashBlk(i); } });
  host.addEventListener('keydown', e => {
    const el = e.target; if (!el.matches || !el.matches('input[data-a="segt"]') || e.isComposing) return; const i = Number(el.dataset.i), segs = v().edit.segs || [];
    const back = (j, caret) => { const n = host.querySelector(`input[data-a="segt"][data-i="${j}"]`); if (n) { n.focus(); n.setSelectionRange(caret, caret); n.scrollIntoView({ block: 'nearest' }); } };
    if (e.key === 'Enter') { e.preventDefault(); el.dataset.a = 'segx'; if (act(AC.splitSegAt(S, id, i, el.selectionStart, el.value))) back(i + 1, 0); return; }
    if (e.key === 'Backspace' && i > 0 && el.selectionStart === 0 && el.selectionEnd === 0) { e.preventDefault(); const g = segs[i]; if (g) g.t = el.value.trim() || g.t; el.dataset.a = 'segx'; const len = segs[i - 1].t.length + 1; if (act(AC.mergeSeg(S, id, i))) back(i - 1, len); }
  });
  host.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.vp-add')) { e.preventDefault(); e.target.click(); } });
  // Thao tác chỉ xem, dùng được cả ở bản cũ
  const VIEW_ACTS = new Set(['sub', 'capopen', 'capback', 'play', 'replay', 'seek', 'goto', 'pick', 'cb']);
  host.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled || b.tagName === 'SELECT' || b.tagName === 'INPUT' && b.type !== 'button') {
      const c = e.target.closest('.vp-sc'); if (c && !e.target.closest('button,select,input,textarea,.vp-add,.vp-th,summary,a')) { seekScene(Number(c.dataset.c)); flashBlk(Number(c.dataset.c)); }
      const blk = e.target.closest('.vp-blk'); if (blk && !e.target.closest('.vp-hdl,.vp-ih')) { const bi = Number(blk.dataset.i); if (st.sub !== 'scene' || st.cap) { st.sub = 'scene'; st.cap = false; seekScene(bi); render(); } else seekScene(bi); revealScene(bi, true); }
      return;
    }
    const a = b.dataset.a; if (RO && !VIEW_ACTS.has(a)) return;
    const i = Number(b.dataset.i); const vv = v(); const ed = vv.edit; const sc = ed && ed.scenes[i];
    if (a === 'plan') { const r = AC.planEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); st.hist = []; st.cur = 0; st.t = 0; commit(); render(); return toast(`Đã chia ${r.count} cảnh. Kịch bản đã duyệt.`); }
    if (a === 'sub') { st.sub = b.dataset.k; st.cap = false; render(); return; }
    if (a === 'capopen') { st.sub = 'set'; st.cap = true; render(); return; }
    if (a === 'capback') { st.cap = false; render(); return; }
    if (a === 'play') { st.play = !st.play; if (st.play) startAudio(); else stopAudio(); paint(); return; }
    if (a === 'replay') { st.play = true; seekScene(0); startAudio(); revealScene(0, false); paint(); return; }
    if (a === 'pick') return seekScene(i, Number(b.dataset.j));
    if (a === 'cb') { e.stopPropagation(); hideTip(); const c = cueById(b.dataset.c); if (!c) return; showCueTime(c); revealScene(st.cur, false); openCue(c.id, b); return; }
    if (a === 'cuex') { e.stopPropagation(); delCue(b.dataset.c); return; }
    if (a === 'cw') {
      const k = Number(b.dataset.j);
      if (st.reCue) { const r = AC.moveCue(S, id, st.reCue, sc.id, k); if (!r.ok) return toast(r.error, 'bad'); const cid = st.reCue; st.reCue = null; commit(); render(); const nb = host.querySelector(`.vp-cw[data-i="${i}"][data-j="${k}"]`); showCueTime(r.cue); openCue(cid, nb); return; }
      const r = AC.addCue(S, id, sc.id, k); if (!r.ok) return toast(r.error, 'bad'); if (!r.existed) commit();
      st.cueSec = st.cueSec || 'icon'; render(); const nb = host.querySelector(`.vp-cw[data-i="${i}"][data-j="${k}"]`); showCueTime(r.cue); openCue(r.cue.id, nb); return;
    }
    if (a === 'lostcue') { st.reCue = b.dataset.c; openCue(b.dataset.c, b); render(); toast('Bấm một từ ở dòng Cue để đặt lại cue.'); return; }
    if (a === 'up') { pick('#vp-file', i); return; }
    if (a === 'gen') { openGenImage(id, sc.id, msg => { commit(); render(); if (msg) toast(msg); }); return; }
    if (a === 'ph') { act(AC.editScene(S, id, sc.id, { ph: !sc.ph })); return; }
    if (a === 'itx') { act(AC.removeSceneItem(S, id, sc.id, Number(b.dataset.j))); return; }
    if (a === 'mv') { const d = Number(b.dataset.d); if (act(AC.moveScene(S, id, sc.id, d))) { st.cur = i + d; mark(); paint(); } return; }
    if (a === 'del') {
      const lost = [sc.items.length ? `${sc.items.length} hình` : '', sc.vo ? 'VO cảnh' : '', (ed.cues || []).some(c => c.sc === sc.id) ? 'cue' : ''].filter(Boolean);
      if (!(await confirmBox({ title: `Xóa Scene ${i + 1}?`, body: `<p>${lost.length ? `Sẽ mất ${esc(lost.join(', '))} của scene này.` : 'Scene này chưa có hình, VO hay cue.'}</p>`, ok: 'Xóa scene' }))) return;
      if (act(AC.removeScene(S, id, sc.id))) { st.cur = 0; st.t = 0; closeFx(); render(); } return;
    }
    if (a === 'origscr') {
      if (!(await confirmBox({ title: 'Quay về kịch bản gốc?', body: '<p>Các scene được chia lại theo kịch bản và mẫu dựng đang chọn. Scene đã thêm, xóa, sửa, hình, VO cảnh và cue đã làm sẽ mất. VO toàn bài, caption, frame, nhạc giữ nguyên.</p>', ok: 'Quay về kịch bản gốc' }))) return;
      st.cur = 0; st.t = 0; st.play = false; closeCue(); closeFx(); act(AC.applyTemplate(S, id, ed.tpl || 'script'), 'Đã chia lại scene theo kịch bản gốc.'); return;
    }
    if (a === 'fxo') { e.stopPropagation(); if (st.fx === i) { closeFx(); return; } st.fx = i; if (st.cur !== i) seekScene(i); render(); return; }
    if (a === 'fxclr') { act(AC.clearSceneFx(S, id)); return; }
    if (a === 'add') { const r = AC.addScene(S, id, ed.scenes[st.cur].id); if (act(r)) { st.cur = Math.min(ed.scenes.length - 1, st.cur + 1); render(); } return; }
    if (a === 'dd') { const r = AC.nudgeScene(S, id, sc.id, Number(b.dataset.d)); if (r.ok && !r.changed) return toast('Đã đến mức tối thiểu của cảnh.'); act(r); return; }
    if (a === 'reset') { act(AC.resetDurations(S, id), 'Đã hoàn trả timeline mặc định. Caption cần Gen lại.'); return; }
    if (a === 'voallup') { pick('#vp-fileA', 'all'); return; }
    if (a === 'voallai') { act(AC.setVoAll(S, id, { kind: 'ai', name: 'vo-ai-toan-bai.mp3' }), 'VO toàn bài AI (mô phỏng): xem thử bằng giọng trình duyệt. VO cảnh đã khóa.'); return; }
    if (a === 'voallx') { act(AC.clearVoAll(S, id), 'Đã gỡ VO toàn bài. VO cảnh dùng lại được.'); return; }
    if (a === 'voup') { pick('#vp-fileA', i); return; }
    if (a === 'voai') { act(AC.setSceneVo(S, id, sc.id, { kind: 'ai', name: `vo-canh-${i + 1}-ai.mp3` }), 'VO cảnh AI (mô phỏng): cảnh dài đúng bằng VO. Bấm một từ ở dòng Cue để đặt cue.'); return; }
    if (a === 'vox') { act(AC.clearSceneVo(S, id, sc.id)); return; }
    if (a === 'cstyle') { AC.setEditOptions(S, id, { style: i }); commit(); render(); return; }
    if (a === 'frame') { AC.setEditOptions(S, id, { frame: b.dataset.k }); commit(); render(); return; }
    if (a === 'musup') { pick('#vp-fileM', null); return; }
    if (a === 'frlib') { openFrameLib(); return; }
    if (a === 'mulib') { openMusicLib(); return; }
    if (a === 'musx') { AC.setEditOptions(S, id, { music: null }); if (st.play) startAudio(); act({ ok: true }); return; }
    if (a === 'gencap' || a === 'gencapall') { const r = AC.genCaptions(S, id, { full: a === 'gencapall' }); act(r, `Đã chia ${r.count} đoạn caption theo timeline mới nhất.`); return; }
    if (a === 'split') { act(AC.splitSeg(S, id, i)); return; }
    if (a === 'merge') { act(AC.mergeSeg(S, id, i)); return; }
    if (a === 'seek') { seekT(Number(b.dataset.t)); return; }
    if (a === 'goto') { e.preventDefault(); st.sub = 'scene'; st.cap = false; st.cur = i; render(); const el = host.querySelectorAll('.vp-sc')[i]; if (el) el.scrollIntoView({ block: 'center' }); return; }
    if (a === 'remeasure') { b.disabled = true; const r = await findCuts(id); if (!r.ok) { toast(r.error, 'bad'); return render(); } AC.planEdit(S, id); st.cur = 0; act({ ok: true }, `${r.count} chỗ đề xuất cắt${r.simulated ? ' (mô phỏng)' : ''}.`); return; }
    if (a === 'export') { const cmd = AC.editCommands(S, vv); ed.exportedAt = S.settings.demoNow; save(); downloadBytes(`${AC.slugOf(vv.insight.title) || 'video'}-lenh-dung.json`, new TextEncoder().encode(JSON.stringify(cmd, null, 2)), 'application/json'); return toast('Đã xuất lệnh dựng (JSON). Bộ xuất của PC app/web app sẽ đọc tệp này để dựng video.'); }
    if (a === 'done') { const r = AC.completeEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); commit(); render(); if (H.done) H.done(); }
  });

  { const vv = v(); if (!RO && vv && !(vv.edit && vv.edit.scenes.length) && (vv.script || (vv.media || []).length) && !vv.cancelled) { const r = AC.planEdit(S, id); if (r.ok) save(); } }   // lần đầu mở Biên tập: tự chia cảnh theo kịch bản (là duyệt kịch bản)
  timer = setInterval(tick, 100);
  render();
  return {
    undo, redo, render, pause: () => { st.play = false; stopAudio(); closeCue(); hideTip(); }, stop: () => { st.play = false; clearInterval(timer); cleanup(); },
    state: () => ({ canUndo: st.hist.length > 1, canRedo: st.fut.length > 0, saved: st.saved, active: !!(v() && v().edit && v().edit.scenes.length) }),
  };
}
