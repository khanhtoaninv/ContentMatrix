// ---------- UI · Short Vid: biên tập trong popup thẻ Vid, bản 1 (mục 10.76) ----------
// Trái: Scene / Cài đặt (+ Quản lý caption). Phải: xem thử 9:16. Dưới: timeline có sóng âm, kéo mép đổi độ dài cảnh.
// Dữ liệu đi qua AC (resizeScene, setVoAll, genCaptions…); module này chỉ vẽ, phát thử và hoàn tác. Xem trước mô phỏng, chưa ghép thành file video.
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { confirmBox, esc, icon, save, toast } from './01-core.js';
import { copyText } from './05-matrix.js';
import { downloadBytes } from './06-export.js';
import { findCuts, readMedia, readMediaList } from './09b-vidfree.js';

const fmt = t => AC.fmtClock(t).replace(/\.\d$/, '');
const f1 = x => String(Math.round(x * 10) / 10).replace('.', ',');
const vOf = id => AC.byId(S.videos, id);
const mediaOf = (v, o) => (v.media || []).find(m => m.id === (o && o.mediaId));
const srcOf = (v, o) => !o ? '' : o.src || (mediaOf(v, o) || {}).src || '';
const thumbOf = (v, it) => it.kind === 'image' ? srcOf(v, it) : it.thumb || (mediaOf(v, it) || {}).thumb || '';
const peaksOf = (o, seed) => (o && o.peaks && o.peaks.length ? o.peaks : AC.voPeaks(seed, 80));
const bars = p => p.map(x => `<i style="height:${x}%"></i>`).join('');
const opt = (o, cur) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
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

// ---- Khung giao diện ----
function sceneCard(v, it, i, n) {
  const sc = it.scene, ed = v.edit, k = sc.items.length, share = k ? sc.dur / k : 0, locked = !!ed.voAll, mn = AC.sceneMin(ed, sc), cur = ST[v.id].cur === i;
  const first = sc.items[0];
  const thumb = k ? (thumbOf(v, first) ? `<img src="${esc(thumbOf(v, first))}" alt="">` : '<span class="small">Clip</span>') + (k > 1 ? `<span class="vp-cnt">${k}</span>` : '') : sc.ph ? 'Thẻ giữ chỗ' : icon('plus');
  const voRow = locked ? `<div class="vp-tools small muted">VO cảnh bị khóa vì đang dùng VO toàn bài${sc.vo ? ' (dữ liệu giữ nguyên)' : ''}</div>`
    : sc.vo ? `<div class="vp-tools small">VO cảnh: <b>${esc(sc.vo.name)}</b> · ${f1(sc.vo.dur)} giây <span class="vp-tag">${sc.vo.kind === 'ai' ? 'AI' : 'Up'}</span><button class="btn icon sm ghost" data-a="vox" data-i="${i}" aria-label="Gỡ VO cảnh">${icon('close')}</button></div>`
    : `<div class="vp-tools small">VO cảnh: <button class="btn sm" data-a="voup" data-i="${i}">${icon('up')} Up</button><button class="btn sm" data-a="voai" data-i="${i}" data-testid="ve-voai">Gen AI</button></div>`;
  const shorts = sc.items.map((m, j) => {
    if (m.kind !== 'video' || !(m.dur > 0)) return '';
    if (m.dur < share - 0.3) return `<div class="vp-tools small">Hình ${j + 1} (${f1(m.dur)} giây) ngắn hơn phần được chia (${f1(share)} giây): <select data-a="short" data-i="${i}" data-j="${j}" aria-label="Cách xử lý clip ngắn">${opt(AC.VID_SHORT, m.short || 'hold')}</select></div>`;
    if (m.dur > share + 0.5) return `<div class="vp-tools small">Hình ${j + 1} (${f1(m.dur)} giây): lấy ${f1(share)} giây từ giây <input type="range" min="0" max="${Math.max(0, Math.floor(m.dur - share))}" value="${m.trim || 0}" data-a="trim" data-i="${i}" data-j="${j}" aria-label="Điểm bắt đầu lấy clip"> <b>${m.trim || 0}</b></div>`;
    return '';
  }).join('');
  const units = AC.brollUnits(v);
  return `<div class="vp-sc" data-sid="${esc(sc.id)}" data-c="${i}" aria-current="${cur}" data-testid="ve-scene">
    <div class="vp-add${sc.ph && !k ? ' ph' : ''}" data-a="up" data-i="${i}" role="button" tabindex="0" aria-label="Up hình hoặc video cho cảnh ${i + 1}">${thumb}</div>
    <div class="vp-scb">
      <div class="vp-hd"><b>Cảnh ${i + 1}</b><span class="small muted">${fmt(it.t0)}–${fmt(it.t1)}</span>
        <span><button class="btn icon sm ghost" data-a="dd" data-i="${i}" data-d="-0.5" title="Ngắn hơn 0,5 giây" aria-label="Ngắn hơn 0,5 giây">−</button><button class="btn icon sm ghost" data-a="dd" data-i="${i}" data-d="0.5" title="Dài hơn 0,5 giây" aria-label="Dài hơn 0,5 giây">+</button></span>
        <span class="vp-r"><button class="btn icon sm ghost" data-a="mv" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Lên">↑</button><button class="btn icon sm ghost" data-a="mv" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'} aria-label="Xuống">↓</button><button class="btn icon sm ghost danger" data-a="del" data-i="${i}" ${n < 2 ? 'disabled' : ''} aria-label="Xóa cảnh">${icon('close')}</button></span></div>
      <label class="sr" for="vp-t-${esc(sc.id)}">Lời cảnh ${i + 1}</label><textarea id="vp-t-${esc(sc.id)}" data-sf="text" data-i="${i}" rows="2" placeholder="Lời của cảnh">${esc(sc.text)}</textarea>
      <div class="vp-tools small"><label>Chữ phủ <input data-sf="overlay" data-i="${i}" value="${esc(sc.overlay || '')}" placeholder="Chữ lớn trên hình" style="width:170px"></label></div>
      ${k ? `<div class="vp-thumbs">${sc.items.map((m, j) => `<span class="vp-th">${thumbOf(v, m) ? `<img src="${esc(thumbOf(v, m))}" alt="">` : '<span class="small">Clip</span>'}<button class="btn icon sm" data-a="itx" data-i="${i}" data-j="${j}" aria-label="Bỏ hình ${j + 1}">${icon('close')}</button></span>`).join('')}<button class="btn sm" data-a="up" data-i="${i}">${icon('plus')} Up thêm</button></div>
        <div class="vp-tools small"><label class="sr" for="vp-fit-${esc(sc.id)}">Cách đặt hình</label><select id="vp-fit-${esc(sc.id)}" data-a="fit" data-i="${i}">${opt(AC.VID_FIT, sc.fit)}</select><label>Âm lượng clip <input type="range" min="0" max="100" value="${sc.vol}" data-a="vol" data-i="${i}"></label></div>`
      : `<div class="vp-tools small"><button class="btn sm" data-a="up" data-i="${i}">${icon('up')} Up hình/video</button><button class="btn sm ${sc.ph ? 'primary' : ''}" data-a="ph" data-i="${i}" aria-pressed="${!!sc.ph}">Dùng thẻ giữ chỗ</button>
        ${units.length ? `<label class="sr" for="vp-u-${esc(sc.id)}">Chọn từ tệp nguồn</label><select id="vp-u-${esc(sc.id)}" data-a="unit" data-i="${i}"><option value="">Từ nguồn vào…</option>${units.map((u, x) => `<option value="${x}">${esc(`${u.label.includes('s') ? 'Đoạn' : 'Tệp'} ${x + 1}: ${u.desc}`.slice(0, 60))}</option>`).join('')}</select>` : ''}</div>
        <details><summary class="small">Prompt hình</summary><div class="stack" style="gap:4px;margin-top:4px"><textarea data-sf="prompt" data-i="${i}" rows="2">${esc(sc.prompt || '')}</textarea><button class="btn sm" data-a="copyp" data-i="${i}">Chép prompt</button></div></details>`}
      ${voRow}${shorts}
      ${k > 1 ? `<div class="small muted">${k} hình chia đều ${f1(share)} giây mỗi hình. VO bám đầu hình 1. Cảnh tối thiểu ${f1(mn)} giây.</div>` : sc.vo && !locked ? `<div class="small muted">Cảnh tối thiểu ${f1(mn)} giây (độ dài VO).</div>` : ''}
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
function scenePane(v) {
  const ed = v.edit, tl = AC.editTimeline(v), n = tl.items.length, vo = ed.voAll;
  const sug = AC.suggestTemplate(S, v);
  const voAll = vo ? `<b>${esc(vo.name)}</b> <span class="small muted">${f1(vo.dur)} giây · ${vo.kind === 'ai' ? 'AI' : 'Up'}</span><button class="btn icon sm ghost" data-a="voallx" aria-label="Gỡ VO toàn bài">${icon('close')}</button>`
    : `<button class="btn sm" data-a="voallup">${icon('up')} Up</button><button class="btn sm" data-a="voallai" data-testid="ve-voallai">Gen AI</button>`;
  return `<div class="vp-pane">${cutsHtml(v)}<div class="vp-tools" style="margin-bottom:8px"><label class="small">Mẫu <select data-a="tpl" aria-label="Mẫu dựng">${opt(Object.fromEntries(Object.entries(AC.VID_TEMPLATES).map(([k, t]) => [k, t.name + (k === sug ? ' (gợi ý)' : '')])), ed.tpl)}</select></label>
      <span class="small">VO toàn bài: ${voAll}</span><span class="small muted vp-r">Tổng ${f1(tl.total)} giây</span></div>
    ${tl.items.map((it, i) => sceneCard(v, it, i, n)).join('')}
    <button class="btn sm" data-a="add">${icon('plus')} Thêm cảnh</button></div>`;
}
const FRAME_TILE = { none: '', logo: '<span class="vp-fm-logo"></span>', band: '<span class="vp-fm-band"></span>' };
function settingsPane(v) {
  const ed = v.edit, mus = ed.music;
  const fr = [['none', 'Không frame'], ['logo', 'Nhãn góc'], ['band', 'Dải dưới']].concat((S.frames || []).filter(f => f.kind === 'png' && f.ratio === '9:16').map(f => [f.id, f.name]));
  return `<div class="vp-pane"><div class="vp-grp"><div class="eyebrow">Caption <button class="btn sm" data-a="capopen" data-testid="ve-capopen">Quản lý caption →</button></div>
      <div class="vp-styles">${AC.VID_CAPTION_STYLES.map((n, i) => `<button class="vp-cs s${i}" data-a="cstyle" data-i="${i}" aria-pressed="${ed.captions.style === i}">Aa<small>${esc(n)}</small></button>`).join('')}</div>
      <div class="vp-tools small"><label>Kiểu <select id="ve-cap">${opt(AC.VID_CAPTION_MODES, ed.captions.mode)}</select></label><label>Vị trí <select id="ve-pos">${opt(AC.VID_CAPTION_POS, ed.captions.pos)}</select></label></div></div>
    <div class="vp-grp"><div class="eyebrow">Frame</div><div class="vp-frames">${fr.map(([k, n]) => {
      const pf = (S.frames || []).find(f => f.id === k);
      return `<button class="vp-fr" data-a="frame" data-k="${esc(k)}" aria-pressed="${ed.frame === k}" title="${esc(n)}"><i>${pf ? `<img src="${esc(pf.src)}" alt="">` : FRAME_TILE[k] || ''}</i>${esc(n)}</button>`;
    }).join('')}</div></div>
    <div class="vp-grp"><div class="eyebrow">Nhạc nền</div>${mus ? `<b class="small">${esc(mus.name)}</b> <button class="btn icon sm ghost" data-a="musx" aria-label="Gỡ nhạc">${icon('close')}</button>` : `<button class="btn sm" data-a="musup">${icon('up')} Up nhạc</button>`}
      ${mus ? `<div class="vp-tools small"><label>Âm lượng <input type="range" min="0" max="100" value="${Math.round(mus.vol * 100)}" data-a="musvol"></label><label><input type="checkbox" data-a="duck" ${mus.duck !== false ? 'checked' : ''}> Tự hạ khi có giọng</label></div><div class="vp-tools"><input id="ve-lic" data-a="lic" placeholder="Nguồn / giấy phép (bắt buộc khi có nhạc)" value="${esc(mus.license || '')}"></div>` : '<p class="small muted">Nhạc nền chưa chọn.</p>'}</div>
    <div class="vp-grp"><div class="eyebrow">Giọng</div><label class="sr" for="ve-voice">Nguồn giọng</label><select id="ve-voice" ${ed.voAll ? 'disabled' : ''}>${opt(AC.VID_VOICES, ed.voice.mode)}</select>
      <p class="small muted">${ed.voAll ? 'Đang dùng VO toàn bài.' : 'Giọng máy đọc lời bằng giọng có sẵn của trình duyệt khi xem thử.'}</p></div></div>`;
}
function capPane(v) {
  const ed = v.edit; if (!ed.segs) AC.genCaptions(S, v.id, { full: true });
  const segs = ed.segs || [];
  return `<div class="vp-pane"><div class="eyebrow"><button class="btn sm" data-a="capback">← Cài đặt</button><span>Quản lý caption</span></div>
    <div class="vp-note ${ed.capStale ? 'warn' : ''}" id="vp-capnote">① ${ed.capStale ? '<b>Timeline đã đổi, caption chưa khớp.</b> ' : ''}Bấm Gen caption để chia lại theo timeline mới nhất; chữ bạn đã sửa tay được giữ, chỉ tính lại giây. <button class="btn sm ${ed.capStale ? 'primary' : ''}" data-a="gencap" data-testid="ve-gencap">Gen caption</button> <button class="btn sm" data-a="gencapall" title="Chia lại hết, bỏ cả chữ đã sửa">Chia lại hết</button></div>
    ${ed.captions.mode === 'off' ? '<p class="small muted">Kiểu caption đang là Không caption: đổi ở Cài đặt để hiện chữ.</p>' : ''}
    ${segs.map((g, i) => `<div class="vp-seg" data-g="${i}"><input class="vp-sat" type="number" step="0.1" min="0" value="${g.at}" data-a="segat" data-i="${i}" aria-label="Giây bắt đầu đoạn ${i + 1}"><input data-a="segt" data-i="${i}" value="${esc(g.t)}" aria-label="Chữ đoạn ${i + 1}"><span><button class="btn sm" data-a="seek" data-t="${g.at}" title="Xem thử đoạn này">▶</button> <button class="btn sm" data-a="split" data-i="${i}">Tách</button> <button class="btn sm" data-a="merge" data-i="${i}" ${i ? '' : 'disabled'}>Gộp ↑</button></span></div>`).join('')}
    <p class="small muted">② Số ở đầu mỗi dòng là giây bắt đầu đoạn; sửa được trong khoảng giữa hai đoạn kề nhau.</p></div>`;
}
function timelineHtml(v) {
  const ed = v.edit, tl = AC.editTimeline(v), T = tl.total || 1, st = ST[v.id], roll = !!ed.voAll;
  const blocks = tl.items.map((it, i) => { const s = it.scene, k = s.items.length;
    return `<div class="vp-blk${k || s.ph ? '' : ' empty'}" data-i="${i}" style="width:${s.dur / T * 100}%" aria-current="${st.cur === i}"><span class="vp-bl">${i + 1}${k ? ` ✓ ${k} hình` : s.ph ? ' ▢' : ' ＋'} · ${f1(s.dur)}s</span>${k > 1 ? s.items.map((_, x) => x ? `<span class="vp-tick" style="left:${x / k * 100}%"></span>` : '').join('') : ''}${s.vo && !roll ? `<span class="vp-vob" style="width:${Math.min(100, s.vo.dur / s.dur * 100)}%"></span>` : ''}<span class="vp-hdl" data-h="${i}" tabindex="0" role="slider" aria-label="Độ dài cảnh ${i + 1}" aria-valuenow="${s.dur}" aria-valuemin="${AC.sceneMin(ed, s)}" ${roll && i === tl.items.length - 1 ? 'hidden' : ''}></span></div>`; }).join('');
  return `<div class="vp-tlw"><div class="vp-tlh"><span>Timeline · ${roll ? 'VO toàn bài cố định: kéo mép = dời ranh giới hai cảnh' : 'kéo mép để đổi độ dài; cảnh không ngắn hơn VO của nó'}</span><span>${ed.capStale && ed.captions.mode !== 'off' ? '<span class="vp-badge" data-testid="ve-stale">Caption chưa khớp timeline</span> ' : ''}<button class="btn sm" data-a="reset" data-testid="ve-reset">Hoàn trả mặc định</button> <span class="mono" id="vp-tlt"></span></span></div>
    <div class="vp-tl" id="vp-tl">${blocks}<div class="vp-phl" id="vp-phl"></div></div><div class="vp-wave" id="vp-wave">${waveHtml(v)}</div>
    ${ed.music ? `<div class="vp-wave m" id="vp-wave2"><div class="vp-wv m" style="left:0;width:100%">${bars(peaksOf(ed.music, 3))}</div></div>` : ''}
    <div class="small muted" style="margin-top:2px">Sóng âm của VO bắt đầu từ đầu hình đầu tiên của cảnh.</div></div>`;
}
function waveHtml(v) {
  const ed = v.edit, tl = AC.editTimeline(v), T = tl.total || 1;
  if (ed.voAll) return `<div class="vp-wv" style="left:0;width:100%">${bars(peaksOf(ed.voAll, 7))}</div>`;
  return tl.items.map((it, i) => it.scene.vo ? `<div class="vp-wv" style="left:${it.t0 / T * 100}%;width:${Math.min(it.scene.vo.dur, it.scene.dur) / T * 100}%">${bars(peaksOf(it.scene.vo, i + 1))}</div>` : '').join('');
}
function bodyHtml(v) {
  const ed = v.edit, st = ST[v.id];
  const left = st.cap ? capPane(v) : st.sub === 'scene' ? scenePane(v) : settingsPane(v);
  const bl = AC.editBlockers(v); const iss = AC.editIssues(S, v);
  return `<div class="vp-ed"><div class="vp-l"><div class="vp-mini" role="tablist" aria-label="Công cụ biên tập"><button role="tab" data-a="sub" data-k="scene" aria-selected="${st.sub === 'scene' && !st.cap}" data-testid="ve-sub-scene">Scene</button><button role="tab" data-a="sub" data-k="set" aria-selected="${st.sub === 'set' || st.cap}" data-testid="ve-sub-set">Cài đặt</button></div>${left}</div>
    <div class="vp-pv"><div class="eyebrow"><span id="vp-pvt"></span></div><div class="vp-box" id="vp-box" data-testid="ve-stage"></div>
      <div class="vp-pvbar"><button class="btn sm" data-a="prev" aria-label="Cảnh trước">⏮</button><button class="btn sm primary" data-a="play" id="vp-play" data-testid="ve-play">▶ Phát</button><button class="btn sm" data-a="next" aria-label="Cảnh sau">⏭</button><label class="small" style="margin-left:8px"><input type="checkbox" data-a="safe" ${st.safe ? 'checked' : ''}> Vùng an toàn</label></div>
      <p class="small faint">Xem thử mô phỏng, chưa ghép thành file video. Giọng AI dùng giọng đọc có sẵn của trình duyệt.</p></div></div>
    ${timelineHtml(v)}
    <div class="vp-foot"><span class="small ${bl.length ? '' : 'muted'}" id="ve-issues">${bl.length ? bl.map(x => `<a href="#" data-a="goto" data-i="${x.i}">Cảnh ${x.i + 1} chưa có hình</a>`).join(' · ') : ed.doneAt ? 'Đã hoàn thành. Lệnh dựng đã lưu; file video có khi bộ xuất chạy.' : 'Đủ hình cho mọi cảnh'}${iss.filter(x => !/chưa có hình/.test(x)).length ? `<br><span class="vp-warn">${iss.filter(x => !/chưa có hình/.test(x)).map(esc).join(' · ')}</span>` : ''}</span>
      <button class="btn" data-a="export" data-testid="ve-export">Xuất lệnh dựng (JSON)</button><button class="btn primary" data-a="done" data-testid="ve-done" ${bl.length ? 'disabled' : ''}>${ed.doneAt ? 'Đã hoàn thành ✓' : 'Hoàn thành'}</button></div>
    <input type="file" id="vp-file" accept="image/*,video/*" multiple class="sr" tabindex="-1"><input type="file" id="vp-fileA" accept="audio/*" class="sr" tabindex="-1"><input type="file" id="vp-fileM" accept="audio/*" class="sr" tabindex="-1">`;
}
function emptyHtml(v) {
  const ok = !!(v.script || (v.media || []).length);
  return `<div class="vp-empty"><p>${ok ? 'Chưa chia cảnh. App chia kịch bản thành các cảnh có lời, gợi ý hình và thời lượng; sau đó bạn Up hình, thêm VO, chỉnh timeline.' : 'Chưa có kịch bản hoặc tệp nguồn để chia cảnh. Viết hoặc duyệt kịch bản ở tab Kịch bản trước.'}</p><button class="btn primary" data-a="plan" data-testid="ve-plan" ${ok ? '' : 'disabled'}>${icon('spark')} Chia cảnh theo kịch bản</button></div>`;
}

// ---- Gắn vào popup ----
export function mountEditor(host, id, hooks) {
  const H = hooks || {};
  const st = ST[id] = ST[id] && ST[id].keep ? Object.assign(ST[id], { play: false }) : { cur: 0, t: 0, play: false, sub: 'scene', cap: false, safe: false, hist: [], fut: [], saved: '', keep: true };
  let timer = 0; let au = { list: [], music: null }; let pending = null;
  const dragging = { on: false };
  const v = () => vOf(id);
  const tot = () => AC.editTimeline(v()).total;
  const starts = () => { let a = 0; return v().edit.scenes.map(s => { const r = a; a += s.dur; return r; }); };

  const snapNow = () => { const vv = v(); if (vv && vv.edit) st.hist.push(snapOf(vv.edit)); if (st.hist.length > 40) st.hist.shift(); st.fut = []; };
  const stamp = () => { const d = new Date(); st.saved = `Đã tự lưu ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; if (H.bar) H.bar(); };
  const commit = () => { snapNow(); save(); stamp(); };
  const restore = j => { const vv = v(); vv.edit = unsnap(j); AC.migrateEdit(vv.edit); st.cur = Math.min(st.cur, vv.edit.scenes.length - 1); save(); stamp(); render(); };
  const undo = () => { if (st.hist.length > 1) { st.fut.push(st.hist.pop()); restore(st.hist[st.hist.length - 1]); } };
  const redo = () => { if (st.fut.length) { const j = st.fut.pop(); st.hist.push(j); restore(j); } };
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
    const sc = ed.scenes[st.cur], t0 = sts[st.cur], k = sc.items.length, share = k ? sc.dur / k : 0, loc = Math.max(0, st.t - t0), ik = k ? Math.min(k - 1, Math.floor(loc / share)) : 0, it = k ? sc.items[ik] : null;
    const txt = AC.captionAt(vv, Math.max(0, st.t)) || ''; const style = ed.captions.style || 0;
    let ct = esc(txt); if (style === 2 && txt) { const w = txt.split(' '); let li = 0; w.forEach((x, i) => { if (x.length > w[li].length) li = i; }); ct = w.map((x, i) => i === li ? `<em>${esc(x)}</em>` : esc(x)).join(' '); }
    const src = it ? srcOf(vv, it) : '';
    const key = [st.cur, ik, sc.fit, ed.frame, style, ed.captions.pos, ed.captions.mode, st.safe, sc.overlay, src.length, src.slice(-24), sc.prompt, sc.ph].join('|');
    if (box.dataset.k !== key) {
      box.dataset.k = key; let h = '';
      if (it && src) h += it.kind === 'video' ? `<video class="vp-media${sc.fit === 'fit' ? ' contain' : ''}" src="${esc(src)}" playsinline preload="auto"></video>` : `<img class="vp-media${sc.fit === 'fit' ? ' contain' : ''}" src="${esc(src)}" alt="">`;
      else h += `<div class="vp-ph"><b>Thẻ giữ chỗ</b><span>${esc(sc.prompt || 'Chưa có prompt hình')}</span></div>`;
      h += `${sc.overlay ? `<div class="vp-ovl">${esc(sc.overlay)}</div>` : ''}<div class="vp-cap pos-${esc(ed.captions.pos)} s${style}" ${ed.captions.mode === 'off' ? 'hidden' : ''}><span></span></div><div class="vp-fm">${frameHtml(vv, ed)}</div>${st.safe ? '<div class="vp-safe"></div>' : ''}`;
      box.innerHTML = h;
    }
    const el = box.querySelector('video');
    if (el) { el.muted = ed.voice.mode !== 'clip'; el.volume = Math.max(0, Math.min(1, sc.vol / 100)); try { const tt = vidTime(it, loc - ik * share, share, el); if (!st.play || Math.abs(el.currentTime - tt) > 0.5) el.currentTime = tt; if (st.play && el.paused) el.play().catch(() => {}); if (!st.play) el.pause(); } catch (e) { /* chưa sẵn sàng */ } }
    const cs = box.querySelector('.vp-cap span'); if (cs) cs.innerHTML = ct;
    const pt = host.querySelector('#vp-pvt'); if (pt) pt.textContent = `Xem thử · cảnh ${st.cur + 1}`; const pl = host.querySelector('#vp-play'); if (pl) pl.textContent = st.play ? '⏸ Dừng' : '▶ Phát';
    const ph = host.querySelector('#vp-phl'); if (ph) ph.style.left = `${st.t / (T || 1) * 100}%`; const tt = host.querySelector('#vp-tlt'); if (tt) tt.textContent = `${st.t.toFixed(1)}s / ${f1(T)}s`;
    host.querySelectorAll('.vp-seg').forEach(e => { const g = vv.edit.segs && vv.edit.segs[Number(e.dataset.g)]; e.classList.toggle('now', !!g && txt === g.t && g.at <= st.t); });
  }
  function mark() { host.querySelectorAll('.vp-sc').forEach(e => e.setAttribute('aria-current', String(Number(e.dataset.c) === st.cur))); host.querySelectorAll('.vp-blk').forEach(e => e.setAttribute('aria-current', String(Number(e.dataset.i) === st.cur))); }
  function seekScene(i) { st.cur = i; st.t = starts()[i] || 0; if (st.play) startAudio(); mark(); paint(); }
  function tick() {
    if (!host.isConnected) { clearInterval(timer); stopAudio(); return; }
    if (!st.play) return; st.t = Math.round((st.t + 0.1) * 10) / 10; const T = tot();
    if (st.t >= T) { st.t = 0; st.cur = 0; st.play = false; stopAudio(); mark(); paint(); return; }
    const sts = starts(); let c = 0; sts.forEach((x, i) => { if (st.t >= x) c = i; });
    if (c !== st.cur) { st.cur = c; mark(); startAudio(); } paint();
  }

  function render() {
    const vv = v(); if (!vv) return; const keepScroll = host.querySelector('.vp-pane'); const sy = keepScroll ? keepScroll.scrollTop : 0;
    if (!st.play) stopAudio();
    if (!vv.edit || !vv.edit.scenes.length) { host.innerHTML = emptyHtml(vv); return; }
    if (!st.hist.length) st.hist.push(snapOf(vv.edit));
    host.innerHTML = bodyHtml(vv); const p = host.querySelector('.vp-pane'); if (p) p.scrollTop = sy;
    host.querySelectorAll('.vp-hdl').forEach(h => { h.onpointerdown = e => dragStart(e, Number(h.dataset.h)); h.onkeydown = e => keyNudge(e, Number(h.dataset.h)); });
    paint();
  }
  // Kéo mép khối cảnh: mỗi lần di chuyển tính lại từ độ dài lúc bắt đầu kéo
  function dragStart(e, i) {
    e.preventDefault(); e.stopPropagation(); const vv = v(), ed = vv.edit; const tl = host.querySelector('#vp-tl'); const W = tl.getBoundingClientRect().width || 1, T0 = tot(), x0 = e.clientX;
    const base = ed.scenes.map(s => s.dur); const sid = ed.scenes[i].id; dragging.on = true; const was = ed.capStale;
    const mv = ev => { ed.scenes.forEach((s, j) => { s.dur = base[j]; }); AC.resizeScene(S, id, sid, base[i] + Math.round((ev.clientX - x0) / W * T0)); const T = tot();
      host.querySelectorAll('.vp-blk').forEach((b, j) => { b.style.width = `${ed.scenes[j].dur / T * 100}%`; const l = b.querySelector('.vp-bl'); if (l) l.textContent = l.textContent.replace(/·.*$/, `· ${f1(ed.scenes[j].dur)}s`); });
      const w = host.querySelector('#vp-wave'); if (w) w.innerHTML = waveHtml(v()); paint(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); dragging.on = false; if (ed.scenes.some((s, j) => s.dur !== base[j])) commit(); else ed.capStale = was; render(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function keyNudge(e, i) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const sc = v().edit.scenes[i]; const r = AC.nudgeScene(S, id, sc.id, (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 2 : 0.5));
    if (r.ok && r.changed) { commit(); render(); } else if (!r.ok) toast(r.error, 'bad');
    const n = host.querySelector(`.vp-hdl[data-h="${i}"]`); if (n) n.focus();
  }

  // ---- Tải tệp ----
  let upTarget = null;
  const pick = (sel, target) => { upTarget = target; const f = host.querySelector(sel); if (f) f.click(); };
  async function onFiles(e) {
    const el = e.target; const files = [...(el.files || [])]; el.value = ''; if (!files.length) return;
    try {
      if (el.id === 'vp-file') { const sid = v().edit.scenes[upTarget].id; const ms = await readMediaList(files); act(AC.addSceneItems(S, id, sid, ms.map(m => ({ src: m.src, name: m.name, dur: m.dur, thumb: m.thumb }))), `Đã thêm ${ms.length} hình vào cảnh ${upTarget + 1}.`); return; }
      if (el.id === 'vp-fileM') { const m = await readMedia(files[0]); if (!act(AC.setEditOptions(S, id, { music: { src: m.src, name: m.name } }), 'Đã thêm nhạc nền. Ghi nguồn/giấy phép bên dưới.')) return; const p = await decodePeaks(m.src, 200); if (p) { AC.setEditOptions(S, id, { musicPeaks: p }); save(); render(); } return; }
      if (el.id === 'vp-fileA') {
        const m = await readMedia(files[0]); const dur = m.dur || (await audioDur(m.src)); const tgt = upTarget; const all = tgt === 'all';
        const r = all ? AC.setVoAll(S, id, { kind: 'up', name: m.name, src: m.src, dur }) : AC.setSceneVo(S, id, v().edit.scenes[tgt].id, { kind: 'up', name: m.name, src: m.src, dur });
        if (!act(r)) return; const p = await decodePeaks(m.src, all ? 200 : 60);
        if (p) { AC.setVoPeaks(S, id, all ? 'all' : v().edit.scenes[tgt].id, p); save(); render(); }
      }
    } catch (er) { toast(er.message, 'bad'); }
  }
  host.addEventListener('change', e => {
    if (e.target.type === 'file') { onFiles(e); return; }
    const el = e.target; const a = el.dataset.a; const i = Number(el.dataset.i); const ed = v().edit; const sc = ed && ed.scenes[i];
    if (el.dataset.sf && sc) { const r = AC.editScene(S, id, sc.id, { [el.dataset.sf]: el.value }); if (r.ok) { commit(); if (el.dataset.sf === 'text') render(); else paint(); } else { toast(r.error, 'bad'); render(); } return; }
    if (a === 'safe') { st.safe = el.checked; paint(); return; }
    if (a === 'tpl') { applyTpl(el.value); return; }
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
    if (el.id === 've-pos') { AC.setEditOptions(S, id, { pos: el.value }); commit(); paint(); return; }
  });
  host.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.a === 'musvol') { const ed = v().edit; if (ed.music) ed.music.vol = Number(el.value) / 100; if (au.music) au.music.volume = ed.music.vol; }
    if (el.dataset.a === 'trim') { const sc = v().edit.scenes[Number(el.dataset.i)]; sc.items[Number(el.dataset.j)].trim = Number(el.value); if (el.nextElementSibling) el.nextElementSibling.textContent = el.value; st.cur = Number(el.dataset.i); paint(); }
  });
  async function applyTpl(key) {
    const vv = v(), ed = vv.edit; const has = ed.scenes.some(s => s.items.length || s.vo);
    if (has && !(await confirmBox({ title: 'Đổi mẫu?', body: '<p>Chia lại cảnh theo mẫu mới: hình và VO cảnh đã thêm sẽ bị xóa. VO toàn bài, caption kiểu, frame, nhạc giữ nguyên.</p>', ok: 'Đổi mẫu' }))) { render(); return; }
    st.cur = 0; st.t = 0; act(AC.applyTemplate(S, id, key), 'Đã chia cảnh theo mẫu.');
  }
  host.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.vp-add')) { e.preventDefault(); e.target.click(); } });
  host.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled || b.tagName === 'SELECT' || b.tagName === 'INPUT' && b.type !== 'button') {
      const c = e.target.closest('.vp-sc'); if (c && !e.target.closest('button,select,input,textarea,.vp-add,summary,a')) seekScene(Number(c.dataset.c));
      const blk = e.target.closest('.vp-blk'); if (blk && !e.target.closest('.vp-hdl')) seekScene(Number(blk.dataset.i));
      return;
    }
    const a = b.dataset.a; const i = Number(b.dataset.i); const vv = v(); const ed = vv.edit; const sc = ed && ed.scenes[i];
    if (a === 'plan') { const r = AC.planEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); st.hist = []; st.cur = 0; st.t = 0; commit(); render(); return toast(`Đã chia ${r.count} cảnh.`); }
    if (a === 'sub') { st.sub = b.dataset.k; st.cap = false; render(); return; }
    if (a === 'capopen') { st.sub = 'set'; st.cap = true; render(); return; }
    if (a === 'capback') { st.cap = false; render(); return; }
    if (a === 'play') { st.play = !st.play; if (st.play) startAudio(); else stopAudio(); paint(); return; }
    if (a === 'prev') return seekScene(Math.max(0, st.cur - 1));
    if (a === 'next') return seekScene(Math.min(ed.scenes.length - 1, st.cur + 1));
    if (a === 'up') { pick('#vp-file', i); return; }
    if (a === 'ph') { act(AC.editScene(S, id, sc.id, { ph: !sc.ph })); return; }
    if (a === 'itx') { act(AC.removeSceneItem(S, id, sc.id, Number(b.dataset.j))); return; }
    if (a === 'mv') { const d = Number(b.dataset.d); if (act(AC.moveScene(S, id, sc.id, d))) { st.cur = i + d; mark(); paint(); } return; }
    if (a === 'del') { if (act(AC.removeScene(S, id, sc.id))) { st.cur = 0; st.t = 0; render(); } return; }
    if (a === 'add') { const r = AC.addScene(S, id, ed.scenes[st.cur].id); if (act(r)) { st.cur = Math.min(ed.scenes.length - 1, st.cur + 1); render(); } return; }
    if (a === 'dd') { const r = AC.nudgeScene(S, id, sc.id, Number(b.dataset.d)); if (r.ok && !r.changed) return toast('Đã đến mức tối thiểu của cảnh.'); act(r); return; }
    if (a === 'copyp') return copyText(sc.prompt || '');
    if (a === 'reset') { act(AC.resetDurations(S, id), 'Đã hoàn trả timeline mặc định. Caption cần Gen lại.'); return; }
    if (a === 'voallup') { pick('#vp-fileA', 'all'); return; }
    if (a === 'voallai') { act(AC.setVoAll(S, id, { kind: 'ai', name: 'vo-ai-toan-bai.mp3' }), 'VO toàn bài AI (mô phỏng): xem thử bằng giọng trình duyệt. VO cảnh đã khóa.'); return; }
    if (a === 'voallx') { act(AC.clearVoAll(S, id), 'Đã gỡ VO toàn bài. VO cảnh dùng lại được.'); return; }
    if (a === 'voup') { pick('#vp-fileA', i); return; }
    if (a === 'voai') { act(AC.setSceneVo(S, id, sc.id, { kind: 'ai', name: `vo-canh-${i + 1}-ai.mp3` }), 'VO cảnh AI (mô phỏng).'); return; }
    if (a === 'vox') { act(AC.clearSceneVo(S, id, sc.id)); return; }
    if (a === 'cstyle') { AC.setEditOptions(S, id, { style: i }); commit(); render(); return; }
    if (a === 'frame') { AC.setEditOptions(S, id, { frame: b.dataset.k }); commit(); render(); return; }
    if (a === 'musup') { pick('#vp-fileM', null); return; }
    if (a === 'musx') { AC.setEditOptions(S, id, { music: null }); if (st.play) startAudio(); act({ ok: true }); return; }
    if (a === 'gencap' || a === 'gencapall') { const r = AC.genCaptions(S, id, { full: a === 'gencapall' }); act(r, `Đã chia ${r.count} đoạn caption theo timeline mới nhất.`); return; }
    if (a === 'split') { act(AC.splitSeg(S, id, i)); return; }
    if (a === 'merge') { act(AC.mergeSeg(S, id, i)); return; }
    if (a === 'seek') { st.t = Number(b.dataset.t); const sts = starts(); let c = 0; sts.forEach((x, j) => { if (st.t >= x) c = j; }); st.cur = c; mark(); if (st.play) startAudio(); paint(); return; }
    if (a === 'goto') { e.preventDefault(); st.sub = 'scene'; st.cap = false; st.cur = i; render(); const el = host.querySelectorAll('.vp-sc')[i]; if (el) el.scrollIntoView({ block: 'center' }); return; }
    if (a === 'remeasure') { b.disabled = true; const r = await findCuts(id); if (!r.ok) { toast(r.error, 'bad'); return render(); } AC.planEdit(S, id); st.cur = 0; act({ ok: true }, `${r.count} chỗ đề xuất cắt${r.simulated ? ' (mô phỏng)' : ''}.`); return; }
    if (a === 'export') { const cmd = AC.editCommands(S, vv); ed.exportedAt = S.settings.demoNow; save(); downloadBytes(`${AC.slugOf(vv.insight.title) || 'video'}-lenh-dung.json`, new TextEncoder().encode(JSON.stringify(cmd, null, 2)), 'application/json'); return toast('Đã xuất lệnh dựng (JSON). Bộ xuất của PC app/web app sẽ đọc tệp này để dựng video.'); }
    if (a === 'done') { const r = AC.completeEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); commit(); render(); if (H.done) H.done(); return; }
  });

  { const vv = v(); if (vv && !(vv.edit && vv.edit.scenes.length) && (vv.script || (vv.media || []).length) && !vv.cancelled) { const r = AC.planEdit(S, id); if (r.ok) save(); } }   // lần đầu mở Biên tập: tự chia cảnh theo kịch bản
  timer = setInterval(tick, 100);
  render();
  return {
    undo, redo, render, pause: () => { st.play = false; stopAudio(); }, stop: () => { st.play = false; stopAudio(); clearInterval(timer); },
    state: () => ({ canUndo: st.hist.length > 1, canRedo: st.fut.length > 0, saved: st.saved, active: !!(vOf(id) && vOf(id).edit && vOf(id).edit.scenes.length) }),
  };
}
