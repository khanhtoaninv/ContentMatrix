// ---------- UI · Short Vid: Vid tự do kiểu mới — tab Nạp nguyên liệu, Dàn ý, lô, Cần quay, Độ dài (mục 10.84) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { $, closeLayer, confirmBox, esc, icon, openLayer, save, toast } from './01-core.js';
import { downloadBytes } from './06-export.js';
import { readMedia, sttOk, transcribe } from './09b-vidfree.js';

const GL = { idea: 'Ý', script: 'KB', matrix: 'MX', voice: '♪', talk: 'Nói', broll: 'Clip', image: 'Ảnh', long: 'Dài', subs: 'Sub', article: 'Bài', product: 'SP', vlink: 'Link', sample: 'Mẫu', data: 'Số', comment: 'BL', oldvid: 'Vid' };
const TG = { 'Ý chính': '', 'Số liệu': 'so', 'Lời nói': '', 'Ví dụ': '', 'Kêu gọi': 'kg', 'Hình': 'hinh', 'Mẫu dựng': 'mau' };
const SUB = {};   // thẻ → 'in' | 'seg' (tab Nạp)
const fmtT = s => { s = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const usd = n => n >= 0.01 ? `~${n.toFixed(2).replace('.', ',')} USD` : `< 0,01 USD`;
const getV = id => AC.byId(S.videos, id);

// Độ dài (giây): dùng cho mọi thẻ, kể cả Vid từ Topic. Báo khi kịch bản lệch hơn 15% so với độ dài đã chọn
export function lenRowHtml(v, lock) {
  if (!v) return '';
  const L = AC.lenSecOf(S, v); const ck = AC.lenCheck(S, v); const pick = AC.VID_LEN_PICKS.includes(L);
  const off = v.script && !ck.ok;
  return `<div class="field" id="sp-lenrow" data-testid="sp-lenrow"><span class="vm-f">Độ dài video (thông số viết kịch bản)</span>
    <div class="vm-lens">${AC.VID_LEN_PICKS.map(x => `<button type="button" data-mx="vlen" data-v="${x}" aria-pressed="${L === x}" ${lock ? 'disabled' : ''}>${x} giây</button>`).join('')}
      <input type="number" id="sp-lenx" min="${AC.VID_LEN_MIN}" max="${AC.VID_LEN_MAX}" value="${L}" aria-label="Độ dài tùy chọn, giây" ${lock ? 'disabled' : ''}><span class="u">${pick ? 'Hoặc nhập 15–300 giây' : 'Tùy chọn (15–300 giây)'}${v.lenSec ? '' : ' · theo Setup'}</span></div>
    <span class="hint">${v.script ? `Kịch bản ${ck.words} chữ / mục tiêu ${ck.target} (±15%: ${ck.min}–${ck.max}) · ≈ ${fmtT(ck.sec)}.` : `Mục tiêu ${ck.target} chữ (${ck.min}–${ck.max}).`}</span>
    ${off ? `<div class="vp-note warn" style="margin-top:6px">Kịch bản ${ck.words > ck.max ? 'dài' : 'ngắn'} hơn độ dài ${L} giây. <button type="button" class="btn sm primary" data-mx="rewrite" ${lock ? 'disabled' : ''}>Viết lại đúng độ dài</button></div>` : ''}</div>`;
}

export function lenBoxHtml(v, lock) {
  const L = AC.lenSecOf(S, v);
  return `<span class="vm-f">Độ dài mỗi video</span><div class="vm-lens">${AC.VID_LEN_PICKS.map(x => `<button type="button" data-mx="vlen" data-v="${x}" aria-pressed="${L === x}" ${lock ? 'disabled' : ''}>${x} giây</button>`).join('')}<input type="number" id="vm-lenx" min="${AC.VID_LEN_MIN}" max="${AC.VID_LEN_MAX}" value="${L}" aria-label="Độ dài, giây" ${lock ? 'disabled' : ''}><span class="u">Tuỳ chọn, 15–300 giây</span></div>`;
}
// ---- Tab 1: Nạp nguyên liệu ----
function modeOf(v) {
  const ins = v.inputs || []; if (!ins.length) return 'empty';
  if (ins.some(i => i.kind === 'long' && i.dur > 0)) return 'long';
  if (ins.every(i => i.kind === 'oldvid')) return 'remake';
  return 'build';
}
function warnOf(i) {
  if (i.kind === 'vlink') return 'Không tải được hình từ link. Chỉ dùng làm mẫu; thả file nếu muốn dùng hình.';
  if (i.kind === 'long' && i.dur > 3600) return 'Dài hơn 60 phút. Cắt bớt rồi nạp lại.';
  if (['talk', 'broll', 'voice'].includes(i.kind) && i.dur > 300) return 'Dài hơn 5 phút: đổi sang Video dài ở bước Dàn ý để cắt thành nhiều short.';
  if ((i.kind === 'article' || i.kind === 'product') && !i.text) return 'Chưa đọc được trang từ trình duyệt: dán chữ của trang vào ô bên trên để trích đúng.';
  return '';
}
function chipSub(v, i) {
  const m = (v.media || []).find(x => x.id === i.mediaId); const p = [];
  if (i.dur) p.push(fmtT(i.dur)); if (m && m.size) p.push(`${(m.size / 1048576).toFixed(1).replace('.', ',')} MB`);
  if (i.text && !['matrix'].includes(i.kind)) p.push(`“${i.text.replace(/\s+/g, ' ').slice(0, 70)}${i.text.length > 70 ? '…' : ''}”`);
  if (i.url) p.push(i.url); if (i.clip) p.push(`đoạn ${fmtT(i.clip.from)}–${fmtT(i.clip.to)}`);
  return p.join(' · ');
}
function tnHtml(v, i) {
  const m = (v.media || []).find(x => x.id === i.mediaId); const th = m && (m.thumb || (m.kind === 'image' ? m.src : ''));
  return th ? `<span class="vm-tn"><img src="${esc(th)}" alt=""></span>` : `<span class="vm-tn" aria-hidden="true">${esc(GL[i.kind])}</span>`;
}
function napHtml(v, lock) {
  const ins = v.inputs || []; const mode = modeOf(v); const c = AC.vidSettingsOf(S, v); const L = AC.lenSecOf(S, v);
  const chips = ins.map((i, ix) => `<div class="vm-chip" data-testid="vm-chip">${tnHtml(v, i)}<div style="min-width:0"><div class="vm-nm" title="${esc(i.name)}">${esc(i.name || AC.MIX_KINDS[i.kind].name)}</div><div class="vm-sub">${esc(chipSub(v, i))}</div>
      <div class="vm-sub">Nhận diện: <b>${esc(AC.MIX_KINDS[i.kind].name)}</b></div>${warnOf(i) ? `<div class="vm-sub warn">${esc(warnOf(i))}</div>` : ''}
      ${(i.kind === 'voice' || i.kind === 'talk') && !i.text ? `<div class="vm-sub"><button type="button" class="btn sm" data-mx="stt" data-i="${esc(i.id)}" ${sttOk() && !lock ? '' : 'disabled'} title="${sttOk() ? 'Gửi tệp tới API nhận giọng nói để chép lời' : 'Cần chọn OpenAI ở Setup → AI ảnh & video; hoặc dán lời vào ô bên trên'}">Chép lời (API)</button></div>` : ''}</div>
      <span class="vm-pdb"><button type="button" class="vm-ic" data-mx="mv" data-i="${esc(i.id)}" data-d="-1" ${ix && !lock ? '' : 'disabled'} title="Lên" aria-label="Chuyển ${esc(i.name)} lên">↑</button><button type="button" class="vm-ic" data-mx="mv" data-i="${esc(i.id)}" data-d="1" ${ix < ins.length - 1 && !lock ? '' : 'disabled'} title="Xuống" aria-label="Chuyển ${esc(i.name)} xuống">↓</button><button type="button" class="vm-ic bad" data-mx="del" data-i="${esc(i.id)}" ${lock ? 'disabled' : ''} title="Bỏ" aria-label="Bỏ ${esc(i.name)}">✕</button></span></div>`).join('');
  const tpls = AC.mixTemplates(S).map(t => `<option value="${esc(t.id)}" ${v.tplId === t.id ? 'selected' : ''}>${esc(t.name)}${t.own ? ' (của bạn)' : ''}</option>`).join('');
  const audio = ins.find(i => i.kind === 'voice' && i.dur > 0);
  const voiceLen = audio && mode === 'build' ? `<div class="vm-note">Có giọng sẵn nên độ dài theo giọng: ~${fmtT(audio.dur)} (thông số ${fmtT(L)}).${Math.abs(audio.dur - L) > L * 0.15 ? ' Lệch hơn 15%, tab Kịch bản sẽ báo.' : ''}</div>` : '';
  const cells = (v.cells || []).length; const cost = AC.mixCost(S, v, AC.textApiOf(S).model);
  const tcfg = AC.textApiOf(S);
  const plan = ins.length ? `<ul>
      <li><b>Nguồn</b><span>${ins.length} nguyên liệu, trích ${cells} ô</span></li>
      <li><b>Độ dài</b><span>${L} giây ≈ ${c.wordTarget} chữ (${c.wordMin}–${c.wordMax})</span></li>
      <li><b>Làm gì</b><span>${mode === 'long' ? 'Tìm đoạn hay trong video dài, rồi làm cả lô Short' : mode === 'remake' ? 'Tạo biến thể từ thẻ Vid cũ' : 'Dàn ý, kịch bản, chia cảnh, gán hình có sẵn'}</span></li>
      <li><b>Hình</b><span>${v.gen ? 'Cảnh thiếu hình: Gen ảnh AI' : 'Cảnh thiếu hình: đánh dấu Cần quay'}</span></li></ul>
      <label class="vm-chk"><input type="checkbox" id="vm-gen" ${v.gen ? 'checked' : ''} ${lock ? 'disabled' : ''}> Gen ảnh AI cho cảnh thiếu hình (~${cost.shots || Math.max(1, Math.round(L / 6))} ảnh). Tắt thì cảnh thiếu hình thành Cần quay</label>
      <div class="cost">Chi phí API ước tính: <strong>${cost.priced || cost.img ? usd(cost.total) : 'chưa tính được'}</strong><br>AI chữ: ${AC.textApiOn(S) ? esc(`${tcfg.provider} · ${tcfg.model}`) : 'chưa bật (dùng bản mô phỏng, không tốn phí)'} · đổi ở Setup. Ước tính theo giá tham khảo.</div>`
    : '<div class="vm-empty" style="border:0">Thả hoặc dán ít nhất một nguồn: ý tưởng, chữ, giọng, clip hay ảnh.</div>';
  const foot = mode === 'long' ? `<span class="l">Nguồn dài: tìm đoạn hay trước, rồi chọn đoạn để làm.</span><button type="button" class="btn primary" data-mx="segs" ${lock ? 'disabled' : ''}>Tìm đoạn hay →</button>`
    : mode === 'remake' ? `<span class="l">Thẻ cũ: chọn cách làm biến thể.</span><button type="button" class="btn primary" data-mx="variant" data-id="${esc(ins[0].vidId)}" ${lock ? 'disabled' : ''}>Tạo biến thể →</button>`
      : `<span class="l">${ins.length ? (AC.textApiOn(S) ? 'AI viết kịch bản; trích ô và chọn hình theo luật có sẵn.' : 'Mô phỏng: chưa gọi AI; trích ô, kịch bản và chọn hình theo luật có sẵn.') : 'Thêm nguồn để bắt đầu.'}</span>
        <button type="button" class="btn" data-mx="quick" data-testid="vm-quick" ${ins.length && !lock ? '' : 'disabled'} title="Bỏ qua Dàn ý: dùng mọi ô, dựng thẳng sang Biên tập">Dựng nhanh</button><button type="button" class="btn primary" data-mx="dy" data-testid="vm-dy" ${ins.length && !lock ? '' : 'disabled'}>Dàn ý →</button>`;
  return `<div class="vm-nap"><div>
    <div class="vm-dz" id="vm-dz" data-testid="vm-dz"><div class="big">Thả file vào đây</div><div class="small">Clip, ảnh, file giọng, video dài tới 60 phút, phụ đề .srt / .vtt, bảng số liệu .csv. Nhận nhiều file một lần; app tự đoán loại, đoán sai thì đổi ở bước Dàn ý.</div>
      <div class="vm-acts"><button type="button" class="btn" data-mx="pick" ${lock ? 'disabled' : ''}>Chọn tệp</button><button type="button" class="btn" data-mx="cell" ${lock ? 'disabled' : ''}>Chọn ô Matrix</button><button type="button" class="btn" data-mx="oldvid" ${lock ? 'disabled' : ''}>Chọn thẻ Vid cũ</button><button type="button" class="btn" data-mx="demo" data-testid="vm-demo" ${lock ? 'disabled' : ''}>Nạp dữ liệu mẫu</button></div>
      <div class="vm-paste"><label class="sr" for="vm-paste">Dán chữ hoặc link</label><textarea id="vm-paste" placeholder="Dán chữ: ý tưởng, kịch bản, link bài / sản phẩm / video, bảng số liệu"></textarea><button type="button" class="btn" data-mx="paste" ${lock ? 'disabled' : ''}>Thêm</button></div>
      <input id="vm-file" type="file" multiple class="sr" tabindex="-1"></div>
    <div class="vm-chips">${chips}</div>
    <div class="vm-opts">
      <div class="full"><label class="vm-f" for="vm-req">Yêu cầu thêm (tuỳ chọn)</label><input type="text" id="vm-req" value="${esc(v.request || '')}" maxlength="600" placeholder="Ví dụ: giọng vui, nhắm học sinh lớp 12, kết bằng câu hỏi" ${lock ? 'readonly' : ''}></div>
      <div id="vm-lenbox">${lenBoxHtml(v, lock)}</div>
      <div><label class="vm-f" for="vm-tpl">Mẫu dựng</label><select id="vm-tpl" ${lock ? 'disabled' : ''}>${tpls}</select></div>
    </div>${voiceLen}
    <div class="vm-foot">${foot}</div></div>
    <aside class="vm-plan" aria-label="App sẽ dựng"><div class="eyebrow">App sẽ dựng</div>${plan}</aside></div>`;
}

// ---- Tab 2: Dàn ý ----
function dyHtml(v, lock) {
  const inO = id => (v.outline || []).includes(id); const ins = v.inputs || [];
  const left = ins.map(i => {
    const cs = v.cells.filter(c => c.src === i.id); const fam = AC.MIX_KINDS[i.kind].media;
    const opts = Object.keys(AC.MIX_KINDS).filter(k => AC.MIX_KINDS[k].media === fam && !((k === 'matrix' && !i.cellId) || (k === 'oldvid' && !i.vidId))).map(k => `<option value="${k}" ${k === i.kind ? 'selected' : ''}>${esc(AC.MIX_KINDS[k].name)}</option>`).join('');
    return `<div class="vm-grp">
      <div class="vm-gh">${tnHtml(v, i)}<b title="${esc(i.name)}">${esc(i.name || AC.MIX_KINDS[i.kind].name)}</b><select data-vk="${esc(i.id)}" aria-label="Loại nguồn: đổi nếu app nhận sai" ${lock ? 'disabled' : ''}>${opts}</select></div>
      ${cs.length ? cs.map(c => `<div class="vm-cell${inO(c.id) ? ' have' : ''}" draggable="${inO(c.id) || lock ? 'false' : 'true'}" data-cell="${esc(c.id)}"><span class="vm-tg ${TG[c.t]}">${esc(c.t)}</span><span>${esc(c.text)}${c.label ? `<span class="vm-src">${esc(c.label)}</span>` : ''}${c.sim ? '<span class="vm-src">mô phỏng</span>' : ''}</span>
        <button type="button" class="vm-ic" data-mx="cadd" data-c="${esc(c.id)}" ${inO(c.id) || lock ? 'disabled' : ''} title="Thêm vào dàn ý" aria-label="Thêm vào dàn ý">${inO(c.id) ? '✓' : '＋'}</button></div>`).join('') : '<div class="small faint">Không có ô trích: nguồn này dùng ở bước khác.</div>'}</div>`;
  }).join('');
  const o = AC.mixOutlineCells(v); const w = o.filter(c => c.t !== 'Hình' && c.t !== 'Mẫu dựng').reduce((a, c) => a + c.text.split(/\s+/).length, 0);
  const right = o.length ? o.map((c, ix) => `<div class="vm-cell in" draggable="${lock ? 'false' : 'true'}" data-cell="${esc(c.id)}" data-o="${ix}"><span class="vm-n">${ix + 1}</span><span class="vm-tg ${TG[c.t]}">${esc(c.t)}</span><span>${esc(c.text)}<span class="vm-src">từ ${esc((ins.find(i => i.id === c.src) || {}).name || '')}</span></span>
      <span class="vm-cacts"><button type="button" class="vm-ic" data-mx="cmv" data-c="${esc(c.id)}" data-d="-1" ${ix && !lock ? '' : 'disabled'} aria-label="Lên">↑</button><button type="button" class="vm-ic" data-mx="cmv" data-c="${esc(c.id)}" data-d="1" ${ix < o.length - 1 && !lock ? '' : 'disabled'} aria-label="Xuống">↓</button><button type="button" class="vm-ic bad" data-mx="cdel" data-c="${esc(c.id)}" ${lock ? 'disabled' : ''} aria-label="Bỏ khỏi dàn ý">✕</button></span></div>`).join('')
    : '<div class="vm-empty">Kéo ô từ cột bên trái vào đây, hoặc bấm ＋ ở từng ô.</div>';
  const n = o.length;
  return `<div class="vm-dy"><div class="vm-col"><div class="vm-dyh"><b>Dữ liệu trích từ nguyên liệu</b><span class="sp"><button type="button" class="btn sm" data-mx="dyall" data-testid="vm-dyall" ${lock ? 'disabled' : ''}>Thêm tất cả</button></span></div><span class="small faint">App nhận diện loại và trích ý cần dùng. Sai loại thì đổi ở ô chọn của từng nguồn.</span>${left}</div>
    <div class="vm-col r" id="vm-dyr"><div class="vm-dyh"><b>Dàn ý (${n} ô)</b><span class="small faint">${w ? `≈ ${w} chữ nguồn · video ${fmtT(AC.lenSecOf(S, v))}` : ''}</span></div>${right}</div></div>
    <div class="vm-foot"><span class="l">${n ? `${n} ô trong dàn ý. Ô không đưa vào sẽ không có trong kịch bản.${v.dyOk ? ' Đã xác nhận.' : ''}` : 'Chưa có ô nào trong dàn ý.'}${v.script ? ' Xác nhận lại sẽ viết kịch bản mới từ dàn ý này (bản cũ vẫn giữ trong danh sách bản).' : ''}</span>
      <button type="button" class="btn primary" data-mx="dyok" data-testid="vm-dyok" ${n && !lock ? '' : 'disabled'}>Xác nhận dàn ý →</button></div>`;
}
function segHtml(v, lock) {
  const inp = (v.inputs || []).find(i => i.kind === 'long'); if (!inp || !inp.segs) return '<p class="small muted">Chưa tìm đoạn. Quay lại Nguyên liệu rồi bấm Tìm đoạn hay.</p>';
  const D = inp.dur || 1; const L = AC.lenSecOf(S, v); const n = inp.segs.filter(g => g.on).length;
  return `<div class="row" style="gap:8px;margin-bottom:8px"><b>${esc(inp.name)}</b><span class="vm-tg">${fmtT(D)}</span><span class="small faint">${inp.segs.length} đoạn đề xuất · chọn ${n} (mô phỏng: chia đều theo độ dài ${L} giây; bản thật chấm điểm bằng lời chép và AI)</span></div>
    <div class="vm-lane" aria-hidden="true">${inp.segs.map(g => `<i class="${g.on ? 'on' : ''}" style="left:${g.from / D * 100}%;width:${Math.max(0.6, (g.to - g.from) / D * 100)}%"></i>`).join('')}</div>
    <div class="vm-segs">${inp.segs.map(g => `<label class="vm-sgm${g.on ? ' on' : ''}"><input type="checkbox" data-mx="sg" data-g="${esc(g.id)}" ${g.on ? 'checked' : ''} ${lock ? 'disabled' : ''} aria-label="Chọn ${esc(g.title)}"><span><b>${esc(g.title)}</b></span><span class="tm">${fmtT(g.from)} – ${fmtT(g.to)} · ${fmtT(g.to - g.from)}${Math.abs(g.to - g.from - L) > L * 0.15 ? ' · lệch độ dài' : ''}</span></label>`).join('')}</div>
    <div class="vm-foot"><span class="l">Mỗi đoạn chọn thành một thẻ Vid, dùng chung mẫu dựng.</span><button type="button" class="btn" data-mx="insub" data-v="in">Quay lại nguyên liệu</button><button type="button" class="btn primary" data-mx="batch" data-testid="vm-batch" ${n && !lock ? '' : 'disabled'}>Làm cả lô (${n} thẻ) →</button></div>`;
}
export function napPaneHtml(v, lock) { return (SUB[v.id] === 'seg' && modeOf(v) === 'long') ? segHtml(v, lock) : napHtml(v, lock); }
export function dyPaneHtml(v, lock) { return dyHtml(v, lock); }
export const mixSubOf = id => SUB[id] || 'in';

// ---- Thanh lô, Cần quay ----
export function lotHtml(v) {
  const list = AC.batchOf(S, v); if (list.length < 2) return '';
  return `<div class="vm-lot" data-testid="vm-lot"><b>Lô ${list.length} thẻ:</b>${list.map((x, i) => `<button type="button" class="it" data-mx="cur" data-id="${esc(x.id)}" aria-pressed="${x.id === v.id}" title="${esc(x.insight.title)}">${AC.vidEditDone(x) ? '✓ ' : ''}${i + 1} · ${esc(x.insight.title.replace(/^Short \d+\/\d+:\s*/, '').slice(0, 24))}</button>`).join('')}<span class="r"><button type="button" class="btn sm" data-mx="doneAll" data-testid="vm-doneall">Hoàn thành cả lô</button></span></div>`;
}
export function shootBannerHtml(v) {
  const l = AC.shootList(v); if (!l.length) return '';
  return `<div class="vm-shoot" data-testid="vm-shoot"><b>${l.length} cảnh cần quay</b><span>Chưa có hình cho: ${l.map(x => `cảnh ${x.n}`).join(', ')}. Quay hoặc tìm hình rồi nạp vào, hoặc bật Gen ảnh AI.</span><div class="row"><button type="button" class="btn sm" data-mx="shot">Danh sách cần quay</button></div></div>`;
}
export function mixBarExtras(v, tab) {
  if (!v || v.origin !== 'mix') return '';
  if (tab === 'bt') return `<span class="vp-sp">${AC.shootList(v).length ? `<button type="button" class="btn sm" data-mx="shot">Danh sách cần quay (${AC.shootList(v).length})</button>` : ''}<button type="button" class="btn sm" data-mx="variant" data-id="${esc(v.id)}">Tạo biến thể</button><button type="button" class="btn sm" data-mx="savetpl" ${v.edit && v.edit.scenes.length ? '' : 'disabled'}>Lưu thành Mẫu dựng</button></span>`;
  if (tab === 'sl' && AC.batchOf(S, v).length > 1) return `<span class="vp-sp"><button type="button" class="btn sm" data-mx="autoslot" data-testid="vm-autoslot">Tự xếp cả lô</button></span>`;
  return '';
}

// ---- Hộp chọn nhỏ (Matrix, thẻ cũ, biến thể, tên mẫu) ----
function pickDialog(title, body, okLabel, onOk, extraMount) {
  const box = openLayer(`<header><div><span class="eyebrow">Vid tự do</span><h2>${esc(title)}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">${body}<span class="err" id="vm-perr" role="alert"></span><div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="vm-pok">${esc(okLabel)}</button></div></div>`, 'drawer');
  if (extraMount) extraMount(box);
  $('#vm-pok', box).addEventListener('click', async () => { const e = await onOk(box); if (e === 'keep') return; if (e) $('#vm-perr', box).textContent = e; else closeLayer(); });
  return box;
}

// ---- Gắn xử lý vào popup ----
// ctx: { show, reopen, err, persist, write(id) → kết quả viết kịch bản, setBusy, open(id), nav }
export function bindMix(box, id, ctx) {
  const v0 = getV(id); const isMix = v0 && v0.origin === 'mix'; const cur = () => getV(id);
  // Vẽ lại pane có thể làm ô đang gõ mất tiêu điểm và phát lại sự kiện change: chặn vẽ lồng nhau
  let rend = false; const show = () => { if (rend) return; rend = true; try { ctx.show(); } finally { rend = false; } };
  const lockOf = () => { const v = cur(); return !v || v.cancelled; };
  const afterPlan = (r, msg) => { save(); ctx.reopen(msg || `Đã chia ${r.count} cảnh${r.shoot ? `, ${r.shoot} cảnh cần quay` : ''}.`); };
  async function buildOne(tid) {
    ctx.setBusy('Đang viết kịch bản…'); const w = await ctx.write(tid); ctx.setBusy(null);
    if (!w.ok) return { ok: false, error: w.error, stopped: w.stopped };
    const p = AC.mixPlan(S, tid); save(); return p;
  }
  async function addFiles(files) {
    let n = 0, bad = '';
    for (const f of files) {
      try {
        let r;
        if (/\.(srt|vtt|csv|tsv|txt|md)$/i.test(f.name) || /^text\//.test(f.type)) r = AC.addMixInput(S, id, { name: f.name, text: await f.text() });
        else r = AC.addMixInput(S, id, { name: f.name, media: await readMedia(f) });
        if (r.ok) n++; else bad = r.error;
      } catch (e) { bad = e.message; }
    }
    if (bad) toast(bad, 'bad'); if (n) { save(); show(); toast(`Đã thêm ${n} nguyên liệu. Xem “Nhận diện” ở từng dòng.`); }
  }
  // Độ dài (mọi thẻ)
  const rerenderLen = () => { const el = box.querySelector('#sp-lenrow'); if (el) el.outerHTML = lenRowHtml(cur(), lockOf() || !!ctx.ro); };
  const setLen = val => { if (ctx.ro) return; const r = AC.setVidLen(S, id, val); if (!r.ok) { ctx.err(r.error); return; } ctx.err(''); save(); show(); rerenderLen(); };
  box.addEventListener('change', e => {
    const el = e.target; if (rend) return; if (el.id === 'sp-lenx' || el.id === 'vm-lenx') setLen(el.value);
  });
  if (!isMix) {
    box.addEventListener('click', e => { const b = e.target.closest('[data-mx="vlen"]'); if (b && !b.disabled) setLen(Number(b.dataset.v)); });
    box.addEventListener('click', e => { const b = e.target.closest('[data-mx="rewrite"]'); if (!b || b.disabled) return; const w = box.querySelector('[data-x="write"]'); if (w) w.click(); });
    return;
  }
  // --- chỉ thẻ Vid tự do ---
  const dz = () => box.querySelector('#vm-dz');
  box.addEventListener('dragover', e => { const z = e.target.closest('#vm-dz'); if (z) { e.preventDefault(); z.classList.add('over'); } const r = e.target.closest('#vm-dyr'); if (r) { e.preventDefault(); r.classList.add('over'); } });
  box.addEventListener('dragleave', e => { const z = e.target.closest('#vm-dz'); if (z) z.classList.remove('over'); const r = e.target.closest('#vm-dyr'); if (r) r.classList.remove('over'); });
  box.addEventListener('drop', async e => {
    const z = e.target.closest('#vm-dz'); const r = e.target.closest('#vm-dyr');
    if (z) {
      e.preventDefault(); z.classList.remove('over'); if (lockOf()) return;
      const fl = [...(e.dataTransfer.files || [])]; if (fl.length) return addFiles(fl);
      const t = e.dataTransfer.getData('text'); if (t) addText(t);
    } else if (r) {
      e.preventDefault(); r.classList.remove('over'); if (lockOf()) return;
      const cid = e.dataTransfer.getData('text/x-cell'); if (!cid) return;
      const tgt = e.target.closest('.vm-cell.in'); const v = cur(); let at = tgt ? Number(tgt.dataset.o) : v.outline.length;
      const old = v.outline.indexOf(cid); if (old >= 0) { AC.mixOutlineRemove(S, id, cid); if (old < at) at--; }
      const rr = AC.mixOutlineAdd(S, id, cid, at); if (!rr.ok) ctx.err(rr.error); save(); show();
    }
  });
  box.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.vm-cell[data-cell]'); if (!c) return; e.dataTransfer.setData('text/x-cell', c.dataset.cell); e.dataTransfer.setData('text/plain', c.dataset.cell); e.dataTransfer.effectAllowed = 'move'; });
  function addText(t) {
    const s = String(t || '').trim(); if (!s) return;
    const isUrl = /^https?:\/\/\S+$/i.test(s); const r = AC.addMixInput(S, id, isUrl ? { url: s, name: s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60) } : { text: s });
    if (!r.ok) return ctx.err(r.error); ctx.err(''); save(); show(); toast(`Nhận diện: ${AC.MIX_KINDS[r.input.kind].name}. Sai thì đổi ở bước Dàn ý.`);
  }
  box.addEventListener('change', async e => {
    const el = e.target; if (rend || lockOf() || ctx.ro) return;
    if (el.id === 'vm-file') { const fl = [...(el.files || [])]; el.value = ''; if (fl.length) await addFiles(fl); return; }
    if (el.id === 'vm-req') { AC.setMixOptions(S, id, { request: el.value }); save(); return; }
    if (el.id === 'vm-tpl') { const r = AC.setMixOptions(S, id, { tplId: el.value }); if (!r.ok) ctx.err(r.error); save(); return; }
    if (el.id === 'vm-gen') { AC.setMixOptions(S, id, { gen: el.checked }); save(); show(); return; }
    if (el.dataset.vk) { const r = AC.setMixInputKind(S, id, el.dataset.vk, el.value); if (!r.ok) { ctx.err(r.error); } else ctx.err(''); save(); show(); return; }
  });
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-mx]'); if (!b || b.disabled) return; const k = b.dataset.mx; const v = cur(); if (!v) return;
    if (ctx.ro && k !== 'cur') return; ctx.err('');
    if (k === 'vlen') return setLen(Number(b.dataset.v));
    if (k === 'rewrite') { const w = box.querySelector('[data-x="write"]'); if (w) w.click(); return; }
    if (k === 'cur') { if (!ctx.persist()) return; ctx.open(b.dataset.id); return; }
    if (k === 'pick') { const f = box.querySelector('#vm-file'); if (f) f.click(); return; }
    if (k === 'paste') { const t = box.querySelector('#vm-paste'); if (t && t.value.trim()) { addText(t.value); } else ctx.err('Dán chữ hoặc link vào ô trước.'); return; }
    if (k === 'demo') { const r = AC.loadMixSample(S, id); if (!r.ok) return ctx.err(r.error); save(); show(); toast(`Đã nạp ${r.count} nguyên liệu mẫu. Bấm Dàn ý hoặc Dựng nhanh.`); return; }
    if (k === 'mv') { const r = AC.moveMixInput(S, id, b.dataset.i, Number(b.dataset.d)); if (!r.ok) ctx.err(r.error); save(); show(); return; }
    if (k === 'del') { const r = AC.removeMixInput(S, id, b.dataset.i); if (!r.ok) ctx.err(r.error); save(); show(); return; }
    if (k === 'stt') {
      const inp = v.inputs.find(i => i.id === b.dataset.i); const m = inp && v.media.find(x => x.id === inp.mediaId); if (!m) return;
      ctx.setBusy('Đang gửi tệp tới API nhận giọng nói…'); try { const t = await transcribe(m.src); ctx.setBusy(null); AC.setMixInputText(S, id, inp.id, t); save(); show(); toast(`Đã chép lời: ${AC.vidWords(t)} chữ.`); } catch (er) { ctx.setBusy(null); ctx.err(er.message); }
      return;
    }
    if (k === 'cell') {
      const ch = AC.postChoices(S, v.weekId); if (!ch.length) return ctx.err('Tuần này chưa có ô Matrix đã duyệt.');
      pickDialog('Chọn ô Matrix', `<div class="field"><label for="vm-pc">Ô đã duyệt</label><select id="vm-pc">${ch.map(c => `<option value="${esc(c.id)}">${esc(c.label)} (${c.words} chữ)</option>`).join('')}</select></div>`, 'Thêm nguyên liệu', box2 => {
        const r = AC.addMixInput(S, id, { kind: 'matrix', cellId: $('#vm-pc', box2).value }); if (!r.ok) return r.error; save(); show(); return '';
      }); return;
    }
    if (k === 'oldvid') {
      const list = S.videos.filter(x => x.id !== id && x.weekId === v.weekId && x.script && !x.cancelled); if (!list.length) return ctx.err('Tuần này chưa có thẻ Vid nào có kịch bản.');
      pickDialog('Chọn thẻ Vid cũ', `<div class="field"><label for="vm-ov">Thẻ Vid có kịch bản</label><select id="vm-ov">${list.map(x => `<option value="${esc(x.id)}">${esc(x.insight.title.slice(0, 70))}</option>`).join('')}</select></div>`, 'Thêm nguyên liệu', box2 => {
        const r = AC.addMixInput(S, id, { kind: 'oldvid', vidId: $('#vm-ov', box2).value }); if (!r.ok) return r.error; save(); show(); return '';
      }); return;
    }
    if (k === 'variant') {
      const src = b.dataset.id || id;
      pickDialog('Tạo biến thể', `<p class="small muted">Tạo một thẻ Vid mới từ kịch bản của thẻ này; thẻ gốc giữ nguyên.</p><div class="stack" style="gap:6px">${Object.entries(AC.MIX_VARIANTS).map(([t, l], i) => `<label class="row" style="gap:8px"><input type="radio" name="vm-var" value="${t}" ${i ? '' : 'checked'}> ${esc(l)}${t === 'en' ? ' <span class="small faint">(dịch mô phỏng, cần người xem lại)</span>' : ''}</label>`).join('')}</div>`, 'Tạo biến thể', box2 => {
        const t = (box2.querySelector('input[name="vm-var"]:checked') || {}).value; const r = AC.makeMixVariant(S, src, t); if (!r.ok) return r.error; save(); ctx.openNew(r.video.id, 'Đã tạo biến thể. Xem ở Kịch bản, rồi Biên tập.'); return 'keep';
      }); return;
    }
    if (k === 'savetpl') {
      pickDialog('Lưu thành Mẫu dựng', `<div class="field"><label for="vm-tn">Tên mẫu</label><input id="vm-tn" maxlength="60" placeholder="Ví dụ: Mẹo 60 giây nhấn ý"></div><p class="small muted">Lưu kiểu caption, frame và chuyển cảnh của thẻ này để dùng lại ở ô Mẫu dựng.</p>`, 'Lưu mẫu', box2 => {
        const r = AC.saveMixTemplate(S, id, $('#vm-tn', box2).value); if (!r.ok) return r.error; save(); toast('Đã lưu Mẫu dựng. Chọn ở tab Nạp nguyên liệu.'); return '';
      }); return;
    }
    if (k === 'shot') { openShoot(id, ctx); return; }
    if (k === 'dyall') { AC.mixOutlineAddAll(S, id); save(); show(); return; }
    if (k === 'cadd') { const r = AC.mixOutlineAdd(S, id, b.dataset.c); if (!r.ok) ctx.err(r.error); save(); show(); return; }
    if (k === 'cdel') { AC.mixOutlineRemove(S, id, b.dataset.c); save(); show(); return; }
    if (k === 'cmv') { AC.mixOutlineMove(S, id, b.dataset.c, Number(b.dataset.d)); save(); show(); return; }
    if (k === 'dy') { if (!AC.mixSourceCells(v).length) return ctx.err('Chưa trích được ô nào từ nguyên liệu.'); ctx.nav.tab = 'dy'; show(); return; }
    if (k === 'insub') { SUB[id] = b.dataset.v; show(); return; }
    if (k === 'segs') { const inp = v.inputs.find(i => i.kind === 'long'); const r = AC.findMixSegments(S, id, inp.id); if (!r.ok) return ctx.err(r.error); SUB[id] = 'seg'; save(); show(); toast(`Tìm được ${r.count} đoạn (mô phỏng). Chọn đoạn rồi Làm cả lô.`); return; }
    if (k === 'sg') { const inp = v.inputs.find(i => i.kind === 'long'); AC.toggleMixSeg(S, id, inp.id, b.dataset.g); save(); show(); return; }
    if (k === 'batch') {
      const inp = v.inputs.find(i => i.kind === 'long'); if (!ctx.persist()) return;
      const r = AC.makeMixBatch(S, id, inp.id); if (!r.ok) return ctx.err(r.error);
      let n = 0; for (const tid of r.ids) { ctx.setBusy(`Đang dựng thẻ ${n + 1}/${r.ids.length}…`); AC.confirmMixOutline(S, tid); const p = await buildOne(tid); if (!p.ok) { if (!p.stopped) toast(p.error, 'bad'); break; } n++; save(); }
      ctx.setBusy(null); SUB[id] = 'in'; ctx.nav.tab = 'bt'; ctx.reopen(`Đã dựng lô ${n}/${r.ids.length} thẻ. Chuyển thẻ ở thanh Lô.`); return;
    }
    if (k === 'quick') {
      if (!ctx.persist()) return;
      if (v.script && !(await confirmBox({ title: 'Dựng lại?', body: '<p>Kịch bản và phần biên tập hiện có lùi vào danh sách bản cũ (xem bằng nút ‹ ›), thẻ dựng lại từ nguyên liệu.</p>', ok: 'Dựng lại' }))) return;
      const pr = AC.quickBuildPrep(S, id); if (!pr.ok) return ctx.err(pr.error);
      const p = await buildOne(id); if (!p.ok) { if (!p.stopped) ctx.err(p.error); return; }
      ctx.nav.tab = 'bt'; afterPlan(p, `Đã dựng nhanh ${p.count} cảnh${p.shoot ? `, ${p.shoot} cảnh cần quay` : ''}. Kiểm tra ở Biên tập.`); return;
    }
    if (k === 'dyok') {
      if (!ctx.persist()) return;
      const cf = AC.confirmMixOutline(S, id); if (!cf.ok) return ctx.err(cf.error);
      if (v.script && !(await confirmBox({ title: 'Viết lại kịch bản?', body: '<p>Kịch bản và phần biên tập hiện có lùi vào danh sách bản cũ (xem bằng nút ‹ ›); thẻ có kịch bản mới từ dàn ý này.</p>', ok: 'Viết lại' }))) return;
      const p = await buildOne(id); if (!p.ok) { if (!p.stopped) ctx.err(p.error); return; }
      ctx.nav.tab = 'ks'; ctx.nav.ks = 'scene'; afterPlan(p, `Đã viết kịch bản và chia ${p.count} cảnh. Sửa nếu cần rồi bấm Biên tập để duyệt.`); return;
    }
    if (k === 'doneAll') {
      if (!ctx.persist()) return;
      const r = AC.finishMixBatch(S, id); if (!r.ok) return ctx.err(r.error); save(); show();
      toast(`Hoàn thành ${r.done.length} thẻ.${r.blocked.length ? ` ${r.blocked.length} thẻ chưa xong (${r.blocked.map(x => x.why).join('; ')}).` : ''}`, r.blocked.length ? 'bad' : ''); return;
    }
    if (k === 'autoslot') {
      if (!ctx.persist()) return;
      const r = AC.autoSlotBatch(S, id, { time: '19:00' }); if (!r.ok) return ctx.err(r.error); save(); show();
      toast(r.made.length ? `Đã xếp ${r.made.length} thẻ vào lịch.${r.skipped.length ? ` ${r.skipped.length} thẻ chưa có video thành phẩm nên chưa xếp.` : ''}` : `Chưa xếp được: ${r.skipped.length} thẻ chưa có video thành phẩm (up video ở Biên tập → Ngoài app).`, r.made.length ? '' : 'bad'); return;
    }
  });
}

// Danh sách cần quay: xem, tải về, nạp clip vừa quay cho từng cảnh
function openShoot(id, ctx) {
  const v = getV(id); const l = AC.shootList(v); if (!l.length) return toast('Không còn cảnh nào cần quay.');
  const box = openLayer(`<header><div><span class="eyebrow">Vid tự do · ${esc(v.insight.title.slice(0, 50))}</span><h2>Danh sách cần quay (${l.length})</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body"><p class="small muted">Quay các cảnh dưới đây (dọc 9:16), rồi nạp clip hoặc ảnh vào đúng cảnh.</p>
      <div class="stack" style="gap:8px">${l.map(x => `<div class="citem stack" style="gap:6px" data-sid="${esc(x.sid)}"><b>Cảnh ${x.n} · ${String(x.dur).replace('.', ',')} giây</b><span class="small">${esc(x.prompt || 'Quay minh hoạ cho lời')}</span><span class="small faint">Lời: ${esc(x.text)}</span>
        <div class="row" style="gap:6px"><label class="btn sm" for="vm-sf-${esc(x.sid)}">Nạp clip / ảnh đã quay</label><input id="vm-sf-${esc(x.sid)}" type="file" accept="video/*,image/*" class="sr" data-sf="${esc(x.sid)}"><button type="button" class="btn sm ghost" data-sx="${esc(x.sid)}">Bỏ đánh dấu</button></div></div>`).join('')}</div>
      <div class="actions"><button class="btn" id="vm-sdl">Tải danh sách (.txt)</button><button class="btn ghost" data-act="close-layer">Đóng</button></div></div>`, 'drawer');
  $('#vm-sdl', box).addEventListener('click', () => downloadBytes(`${AC.slugOf(v.insight.title) || 'video'}-can-quay.txt`, new TextEncoder().encode(AC.shootText(S, v) + '\n'), 'text/plain'));
  box.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; const sid = e.target.dataset.sf; if (!f || !sid) return;
    try { const m = await readMedia(f); const r = AC.shootDone(S, id, sid, m); if (!r.ok) return toast(r.error, 'bad'); save(); closeLayer(); ctx.reopen('Đã nạp hình cho cảnh.'); } catch (er) { toast(er.message, 'bad'); }
  });
  box.addEventListener('click', e => { const x = e.target.closest('[data-sx]'); if (!x) return; AC.shootDone(S, id, x.dataset.sx, null); save(); closeLayer(); ctx.reopen('Đã bỏ đánh dấu Cần quay (cảnh để thẻ giữ chỗ).'); });
}
