// ---------- UI · Xem như khi đăng: mô phỏng giao diện bài trên từng kênh (chỉ để hình dung) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, S } from './00-state.js';
import { assetKind, chName, confirmBox, esc, fmtFull, fmtName, fmtPct, icon, imgThumb, imgVisual, mdSegLast, mdToolbarHtml, openLayer, richText, save, scoreHtml, setMdSegLast, slotStateHtml, toast, tsLabel, warningsHtml } from './01-core.js';
import { render } from './02-shell.js';
import { lockNote, openSlot, regenFlow, slotImageAction, slotImageRowsHtml, srcDialog, unlockFlow, vidMax } from './04-week.js';
import { liveMs, pubButtonsHtml, pubSectionsHtml, publishDialog } from './04d-publish.js';
import { slotImageDialog } from './04e-frame.js';
import { openCarouselEditor, openRepurposeDialog } from './04i-studio.js';
import { apiGenImage, videoMetaLine } from './04j-media.js';
import { withAiText } from './04k-aitext.js';
import { blogBlocksHtml, blogBodyHtml, blogEditTools, blogPvAction, blogSeoPanelHtml } from './04l-blog.js';
import { imgToolbar } from './04m-imgtools.js';
ACTIONS['slot-preview'] = el => openPreview(el.dataset.id, el.dataset.n ? Number(el.dataset.n) : null);
const PV_FREE_EMPTY = 'Chưa có nội dung. Bấm Sửa để tự viết bài.';

// Tỉ lệ khung ảnh đoán từ tên ô ảnh của Format (1080×1080, 1200×630, 16:9, 9:16, 4:5)
export function pvRatio(name) {
  const n = String(name || '');
  if (/9\s*:\s*16|dọc/i.test(n)) return '9 / 16';
  if (/16\s*:\s*9|1280\s*×\s*720|ngang/i.test(n)) return '16 / 9';
  if (/1200\s*×\s*630/.test(n)) return '1200 / 630';
  if (/1080\s*×\s*1350/.test(n)) return '4 / 5';
  return '1 / 1';
}
// Ngữ cảnh chế độ Sửa của popup đang mở (để pvImage vẽ nút thao tác ngay trên ảnh)
export let pvCtx = null;
function pvImgTools(a, ti) {
  const c = pvCtx; if (!c || !c.edit || ti == null || !a || c.s.free) return ''; // slot tự do: layout chỉ để xem, thao tác ở mục media bên dưới
  const s = c.s, lk = c.locked; const ci = a.versions.findIndex(v => v.n === a.current);
  return `${imgToolbar({ s, a, i: ti, lk, via: 'pv' })}`;
}
// Slot tự do: mục Ảnh và video nằm dưới layout; layout chỉ hiện các ô đã có ảnh/video (mục 10.21)
function pvMediaHtml(s, st, lk) {
  const rows = s.assets.map((a, i) => {
    const ci = a.versions.findIndex(v => v.n === a.current), vid = assetKind(a) === 'video', cur = ci >= 0 ? a.versions[ci] : null;
    const openE = st.editOpen === i;
    const canEdit = !lk && cur && !vid && !cur.src;
    return `<div class="imgrow pv-mrow" data-img="${i}"><div>${imgThumb(a)}</div>
      <div class="stack" style="gap:6px;min-width:0">
        <div class="row" style="gap:8px"><b>${esc(a.name)}</b><span class="small muted">${cur ? `${vid ? 'Video' : 'Ảnh'} · v${a.current}/${a.versions.length}` : 'Trống'}</span></div>
        ${imgToolbar({ s, a, i, lk, via: 'pv', meta: false, extra: `<button class="btn sm ghost danger" data-x="asset-del" data-i="${i}" ${lk ? 'disabled' : ''} aria-label="Xóa ${esc(a.name)}">Xóa</button>` })}
        ${openE ? `<div class="pv-prompt"><label class="small" for="pv-medit-${i}">Yêu cầu chỉnh ảnh (tạo thêm một phiên bản, mô phỏng)</label><input id="pv-medit-${i}" class="inp" placeholder="Ví dụ: làm sáng hơn, bỏ chữ trên ảnh" value="${esc(st.edraft || '')}"><div class="row" style="gap:8px"><button class="btn sm primary" data-pv="mapply" data-i="${i}">Áp dụng</button><button class="btn sm ghost" data-pv="mclose">Đóng</button></div></div>` : ''}
        ${videoMetaLine(cur)}${cur && cur.ai ? `<span class="small faint">Bản này: tạo bằng ${esc((AC.IMAGE_PROVIDERS[cur.ai.provider] || {}).label || cur.ai.provider)}${cur.ai.model ? ' · ' + esc(cur.ai.model) : ''} (AI thật)</span>` : ''}
        ${cur && cur.crop ? `<span class="small faint">Bản này: cắt ${esc(AC.CROP_RATIOS[cur.crop.ratio] ? AC.CROP_RATIOS[cur.crop.ratio].label : '')} từ bản v${cur.crop.from}</span>` : cur && cur.tpl ? `<span class="small faint">Bản này: áp mẫu “${esc(cur.tpl.name)}” lên bản v${cur.text.from}</span>` : cur && cur.text ? `<span class="small faint">Bản này: thêm ${cur.text.layers.length} lớp chữ lên bản v${cur.text.from}</span>` : cur && cur.frame ? `<span class="small faint">Bản này: ghép frame “${esc(cur.frame.name)}” từ bản v${cur.frame.from}</span>` : cur && cur.i2i ? `<span class="small faint">Bản này: Image to Image “${esc(cur.i2i.prompt)}” từ bản v${cur.i2i.from} (${cur.i2i.simulated === false ? 'AI thật' : 'mô phỏng'})</span>` : cur && cur.edit ? `<span class="small faint">Bản này: sửa theo yêu cầu “${esc(cur.edit)}”</span>` : ''}
      </div></div>`;
  }).join('');
  return `<section class="stack"><h3>Ảnh và video của slot</h3><p class="small faint">Khung bài ở trên chỉ để xem: có ảnh hoặc video đến đâu thì khung hiện đến đó theo cách từng kênh hiển thị. Chọn và chỉnh ảnh, video ở đây; mỗi ô nhận ảnh hoặc video. Video tối đa ${vidMax() / 1048576} MB.</p>
    ${rows || '<p class="small muted">Chưa có ô nào. Bấm + Thêm bên dưới.</p>'}
    ${lk ? '' : '<div class="row"><button class="btn sm" data-x="asset-add">+ Thêm ảnh/video</button></div>'}</section>`;
}
function pvImage(a, ratio, overlay, ti) {
  return pvImageBase(a, ratio, overlay) + pvImgTools(a, ti);
}
export function pvImageBase(a, ratio, overlay) {
  const v = a && a.versions.find(x => x.n === a.current);
  const key = a ? AC.assetRatioOf(a) : '', r = ratio || (key ? AC.RATIO_CSS[key] : '1 / 1');
  const ov = overlay ? `<span class="pv-overlay">${esc(overlay)}</span>` : '';
  if (!v) return `<div class="pv-img empty" style="aspect-ratio:${r}">${ov || `<span class="small">Chưa có ảnh${a ? ` · ${esc(a.name)}` : ''}</span>`}</div>`;
  const sz = !ratio && key ? AC.versionSize(v) : null; const bad = sz && AC.ratioMismatch(sz, key);
  return `<div class="pv-img${bad ? ' pv-rbad' : ''}" style="aspect-ratio:${r}">${imgVisual(v, true, ratio ? '' : key)}${v.src ? '' : ov}${bad ? `<span class="pv-rbadge" title="Ảnh ${sz.w}×${sz.h}; nền tảng sẽ cắt ảnh cho vừa ô ${esc(key)}">Ảnh ${sz.w}×${sz.h} · ô ${esc(key)}</span>` : ''}</div>`;
}
// Chữ bài: xuống dòng giữ nguyên, hashtag tô màu như mạng xã hội
function pvText(t) { return esc(t).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="pv-tag">$2</span>'); }
function pvSections(text) {
  const out = []; let cur = null;
  String(text || '').split('\n').forEach(l => {
    const lb = AC.labelOf(l);
    if (lb) { cur = { label: lb, lines: [] }; out.push(cur); } else if (cur) cur.lines.push(l); else if (l.trim()) { cur = { label: '', lines: [l] }; out.push(cur); }
  });
  return out.map(s => ({ label: s.label, text: s.lines.join('\n').trim() })).filter(s => s.text);
}
function pvBrand() {
  const name = (S.brand.parsed && S.brand.parsed.name) || 'Trang của bạn';
  const handle = AC.fold(name).replace(/[^a-z0-9]+/g, '');
  return { name, handle: handle || 'brand', initial: name.trim().charAt(0).toUpperCase() || 'B' };
}
const PV_FB_FOLD = 360;
// ---- Số liệu trong View (mục 10.29): số đặt sát icon như bài thật; chỉ bài Đã đăng, không ở chế độ sửa, không ở bản cũ ----
function pvMetrics(s, st) {
  if (!st || st.edit || st.old || s.state !== 'PUBLISHED') return null;
  return AC.slotMetricsNow(S, s, liveMs());
}
const PV_AVG = { avgWatch: 1, avgTime: 1 };
function pvCompact(n) {
  n = Math.round(Number(n) || 0);
  const f = (x, u) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace('.', ',') + u;
  return n >= 1e6 ? f(n / 1e6, 'Tr') : n >= 1e3 ? f(n / 1e3, 'K') : String(n);
}
export function pvMVal(m, k) { return k === '_reach' ? m.reach : k === '_eng' ? m.eng : (m.values || {})[k]; }
export function pvMText(k, v) {
  if (k === '_rate') return fmtPct(v);
  if (PV_AVG[k]) return `${Math.round(v || 0)} giây`;
  if (k === 'watchHours') return `${String(v || 0).replace('.', ',')} giờ`;
  return pvCompact(v);
}
// Một số liệu: số gọn cạnh icon; rê chuột hiện số đầy đủ và giờ đo; nhãn đọc màn hình đầy đủ
function pvN(s, m, k, label, opts = {}) {
  const v = k === '_rate' ? (m.reach ? m.eng / m.reach : 0) : pvMVal(m, k);
  const full = k === '_rate' || PV_AVG[k] || k === 'watchHours' ? pvMText(k, v) : String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tip = `${full} ${label} · đo lúc ${tsLabel(AC.msToTs(liveMs()))} · mô phỏng`;
  return `${opts.ic ? `<span aria-hidden="true">${opts.ic}</span>` : ''}<span class="pvm" data-pvm="${esc(s.id)}" data-k="${esc(k)}" data-l="${esc(label)}" data-v="${esc(v)}" title="${esc(tip)}" aria-label="${esc(`${full} ${label}`)}">${esc(pvMText(k, v))}</span>${opts.after ? ` ${opts.after}` : ''}`;
}
// Dải "Chỉ bạn thấy" dưới khung bài: số không có icon trên bài thật (Reach, giờ xem, đọc TB) và tỷ lệ tương tác
function pvInsight(s, st) {
  const m = pvMetrics(s, st); if (!m) return '';
  if (m.status === 'nolink') return `<div class="pv-insight"><span class="faint">Chỉ bạn thấy</span><span>Chưa có link nên chưa lấy được số liệu.</span></div>`;
  if (m.status === 'wait') return `<div class="pv-insight"><span class="faint">Chỉ bạn thấy</span><span>Vừa đăng · số liệu đầu tiên có lúc ${esc(tsLabel(m.nextAt))}.</span></div>`;
  if (m.status === 'none') return `<div class="pv-insight"><span class="faint">Chỉ bạn thấy</span><span>Kênh này không lấy số liệu (Setup → Kênh → Nguồn số liệu).</span></div>`;
  if (m.status !== 'ok') return '';
  const shown = { facebook: ['reactions', 'comments', 'shares', 'views'], instagram: ['likes', 'comments', 'shares', 'saves'], tiktok: ['views', 'likes', 'comments', 'shares'], threads: ['likes', 'replies', 'reposts'], youtube: ['views', 'likes', 'comments'], blog: ['pageviews', 'avgTime'], other: ['views', 'likes', 'comments'] };
  const pf = AC.channelPlatform(AC.byId(S.channels, s.channelId) || {});
  const rest = AC.metricDefs(S, s).filter(d => !(shown[pf] || shown.other).includes(d.k));
  const items = rest.map(d => `<span>${esc(d.l.replace(/ \((giây|chữ)\)$/, ''))} <b>${pvN(s, m, d.k, d.l)}</b></span>`)
    .concat(m.reach ? [`<span>Tương tác <b>${pvN(s, m, '_eng', 'tương tác')}</b> (${pvN(s, m, '_rate', 'tỷ lệ tương tác')})</span>`] : []);
  return `<div class="pv-insight"><span class="faint">Chỉ bạn thấy</span>${items.join('')}<span class="mock">Mô phỏng</span><button class="btn sm ghost" data-pv="mtable">Xem bảng số liệu</button></div>`;
}
// Chữ in trên ảnh của các mẫu ảnh-thẻ fanpage (trích dẫn, Đúng/Sai, bình chọn, điền chỗ trống, số liệu)
function pvCardLine(f, text) {
  const k = f.kind || '';
  if (!/^fb-(quote|truefalse|poll|fill|infographic)$/.test(k)) return '';
  if (k === 'fb-infographic') return (AC.splitSentences(text).find(x => /\d/.test(x)) || '').replace(/^Theo [^:]+:\s*/, '');
  const q = /“([^”]+)”/.exec(text);
  if (k === 'fb-truefalse') return q ? `${q[1]}\nĐúng hay Sai?` : 'Đúng hay Sai?';
  if (k === 'fb-poll') return AC.paragraphsOf(text)[1] || '';
  return q ? q[1] : '';
} // bài dài trên bảng tin Facebook bị cắt "Xem thêm"

function pvFacebook(s, f, text, st) {
  const b = pvBrand();
  const long = text.length > PV_FB_FOLD && !st.more;
  const body = long ? `${pvText(text.slice(0, PV_FB_FOLD).replace(/\s+\S*$/, ''))}… <button class="pv-more" data-pv="more">Xem thêm</button>` : pvText(text);
  let media = '';
  if (s.free) {
    // Slot tự do: hiện đúng số ảnh/video đang có; nhiều hơn một thì xếp album như bảng tin Facebook
    const n = s.assets.length;
    media = !n ? '' : n === 1 && f.layout !== 'carousel' ? pvImage(s.assets[0], null, pvCardLine(f, text), 0)
      : `<div class="pv-album">${s.assets.slice(0, 4).map((a, i) => `<div class="pv-album-i">${pvImage(a, '1 / 1', '', i)}${i === 3 && n > 4 ? `<span class="pv-more-n">+${n - 4}</span>` : ''}</div>`).join('')}</div>`;
  } else if (f.layout === 'carousel') {
    const slides = AC.slidesOf(text);
    const a = s.assets[0];
    media = `<div class="pv-album">${slides.slice(0, 4).map((sl, i) => `<div class="pv-album-i">${pvImage(s.assets[i] || a, '1 / 1', sl)}${i === 3 && slides.length > 4 ? `<span class="pv-more-n">+${slides.length - 4}</span>` : ''}</div>`).join('')}</div>`;
  } else if (s.assets.length) media = pvImage(s.assets[0], null, pvCardLine(f, text), 0);
  const cap = f.layout === 'carousel' && !s.free ? `${esc(AC.slidesOf(text)[0] || '')}` : body;
  return `<div class="pv-card pv-fb">
    <div class="pv-head"><span class="pv-ava">${esc(b.initial)}</span><div><b>${esc(b.name)}</b><span class="pv-meta">${esc(pvWhen(s))} · 🌐</span></div><span class="pv-dots">···</span></div>
    ${st.edit ? pvEditBox(st) : `<div class="pv-body">${cap}</div>`}
    ${media}
    ${pvFbStats(s, st)}
    <div class="pv-fb-acts"><span>👍 Thích</span><span>💬 Bình luận</span><span>↗ Chia sẻ</span></div>
  </div>`;
}
function pvFbStats(s, st) {
  const m = pvMetrics(s, st); if (!m || m.status !== 'ok') return '';
  const v = m.values || {};
  const right = [v.views != null ? pvN(s, m, 'views', 'lượt xem', { after: 'lượt xem' }) : '', pvN(s, m, 'comments', 'bình luận', { after: 'bình luận' }), pvN(s, m, 'shares', 'lượt chia sẻ', { after: 'lượt chia sẻ' })].filter(Boolean);
  return `<div class="pv-stats"><span>${pvN(s, m, 'reactions', 'cảm xúc', { ic: '<i class="pv-rx">👍</i><i class="pv-rx">❤️</i>' })}</span><span>${right.join(' · ')}</span></div>`;
}
// Hàng icon Instagram/Threads: có số khi bài đã đăng
function pvIgActs(s, st, keys) {
  const m = pvMetrics(s, st); const ok = m && m.status === 'ok';
  const L = { likes: ['♡', 'lượt thích'], comments: ['💬', 'bình luận'], replies: ['💬', 'trả lời'], reposts: ['⟲', 'lượt đăng lại'], shares: ['↗', 'lượt chia sẻ'], saves: ['⌑', 'lượt lưu'] };
  return `<div class="pv-ig-acts${ok ? ' has-n' : ''}">${keys.map(k => { const [ic, l] = L[k]; const cell = ok && (m.values || {})[k] != null ? pvN(s, m, k, l, { ic }) : ic; return `<span class="pv-act${k === 'saves' ? ' end' : ''}">${cell}</span>`; }).join('')}</div>`;
}
function pvInstagram(s, f, text, st) {
  const b = pvBrand();
  if (f.layout === 'carousel') {
    const slides = s.free ? (s.assets.length ? s.assets.map(() => '') : ['']) : AC.slidesOf(text); const i = Math.min(st.slide, slides.length - 1);
    return `<div class="pv-card pv-ig">
      <div class="pv-head"><span class="pv-ava ig">${esc(b.initial)}</span><div><b>${esc(b.handle)}</b></div><span class="pv-dots">···</span></div>
      <div class="pv-slide">${pvImage(s.assets[i] || s.assets[0], null, slides[i] || '', s.assets[i] ? i : 0)}
        <button class="pv-nav prev" data-pv="prev" ${i ? '' : 'disabled'} aria-label="Slide trước">‹</button><button class="pv-nav next" data-pv="next" ${i < slides.length - 1 ? '' : 'disabled'} aria-label="Slide sau">›</button>
        <span class="pv-count">${i + 1}/${slides.length}</span></div>
      <div class="pv-dotsrow">${slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      ${pvIgActs(s, st, ['likes', 'comments', 'shares', 'saves'])}
      ${st.edit ? pvEditBox(st) : `<div class="pv-body small"><b>${esc(b.handle)}</b> ${pvText(s.free ? text : slides[0] || '')}</div>`}
    </div>`;
  }
  return pvVertical(s, f, text, st, 'Instagram Reels');
}
// Video dọc (TikTok, Reels, Shorts): phụ đề trên khung 9:16, kịch bản đầy đủ bên dưới
function pvVertical(s, f, text, st, label) {
  const b = pvBrand(); const secs = pvSections(text);
  const i = Math.min(st.slide, Math.max(0, secs.length - 1));
  const cur = secs[i] || { label: '', text };
  const caption = AC.splitSentences(cur.text).slice(0, 2).join(' ');
  return `<div class="pv-vert-wrap">
    <div class="pv-card pv-vert">${pvImage(s.assets[0], null, null, 0)}
      <span class="pv-vlabel">${esc(label)}</span>
      ${pvSide(s, st)}
      <div class="pv-sub">${esc(caption)}</div>
      <div class="pv-vfoot"><b>@${esc(b.handle)}</b><span>${pvText((text.match(/#[\p{L}\p{N}_]+/gu) || []).join(' '))}</span></div>
      <button class="pv-nav prev" data-pv="prev" ${i ? '' : 'disabled'} aria-label="Cảnh trước">‹</button><button class="pv-nav next" data-pv="next" ${i < secs.length - 1 ? '' : 'disabled'} aria-label="Cảnh sau">›</button>
    </div>
    ${st.edit ? pvEditBox(st) : ''}<ol class="pv-script" ${st.edit ? 'hidden' : ''}>${secs.map((x, k) => `<li class="${k === i ? 'on' : ''}"><button data-pv="goto" data-k="${k}"><b>${esc(x.label || `Cảnh ${k + 1}`)}</b><span>${esc(x.text)}</span></button></li>`).join('')}</ol>
  </div>`;
}
function pvSide(s, st) {
  const m = pvMetrics(s, st); const ok = m && m.status === 'ok'; const v = ok ? m.values || {} : {};
  const it = (ic, k, l) => `<span class="pv-sidei"><span aria-hidden="true">${ic}</span>${ok && v[k] != null ? pvN(s, m, k, l) : ''}</span>`;
  const views = ok && v.views != null ? `<span class="pv-vviews">▷ ${pvN(s, m, 'views', 'lượt xem')}</span>` : '';
  return `<div class="pv-side">${it('♡', 'likes', 'lượt thích')}${it('💬', 'comments', 'bình luận')}${it('↗', 'shares', 'lượt chia sẻ')}</div>${views}`;
}
function pvThreads(s, f, text, st) {
  const b = pvBrand();
  return `<div class="pv-card pv-th">
    <div class="pv-head"><span class="pv-ava">${esc(b.initial)}</span><div><b>${esc(b.handle)}</b><span class="pv-meta">${esc(pvWhen(s))}</span></div><span class="pv-dots">···</span></div>
    ${st && st.edit ? pvEditBox(st) : `<div class="pv-body">${pvText(text)}</div>`}
    ${s.free ? s.assets.map((a, i) => pvImage(a, null, null, i)).join('') : s.assets.length ? pvImage(s.assets[0], null, null, 0) : ''}
    ${pvIgActs(s, st, ['likes', 'replies', 'reposts', 'shares'])}
  </div>`;
}
function pvYoutube(s, f, text, st) {
  if (f.layout === 'script') return pvVertical(s, f, text, st, 'YouTube Shorts');
  const b = pvBrand(); const secs = pvSections(text);
  const row = s.sourceCellId ? AC.byId(S.topics, (AC.byId(S.cells, s.sourceCellId) || {}).topicId) : null;
  const title = row ? AC.topicCurrent(row).title : fmtName(s.formatId);
  const desc = secs.length ? secs[0].text : text;
  return `<div class="pv-card pv-yt">${pvImage(s.assets[0], null, title, 0)}
    <h3 class="pv-yt-title">${esc(title)}</h3>
    <div class="pv-head"><span class="pv-ava">${esc(b.initial)}</span><div><b>${esc(b.name)}</b><span class="pv-meta">${pvYtMeta(s, st)}${esc(pvWhen(s))}</span></div></div>
    ${st.edit ? pvEditBox(st) : `<div class="pv-desc">${pvText(desc)}</div>`}
    <ol class="pv-chapters">${secs.map(x => `<li><span class="mono">${esc((x.label.split('·')[1] || '').trim() || '–')}</span> ${esc(x.label.split('·')[0].trim())}</li>`).join('')}</ol>
  </div>`;
}
function pvYtMeta(s, st) {
  const m = pvMetrics(s, st); if (!m || m.status !== 'ok') return '';
  return `${pvN(s, m, 'views', 'lượt xem', { after: 'lượt xem' })} · ${pvN(s, m, 'likes', 'lượt thích', { ic: '👍 ' })} · `;
}
function pvBlogMeta(s, st) {
  const m = pvMetrics(s, st); if (!m || m.status !== 'ok') return '';
  return ` · ${pvN(s, m, 'pageviews', 'lượt xem trang', { after: 'lượt xem' })} · đọc TB ${pvN(s, m, 'avgTime', 'thời gian đọc trung bình')}`;
}
function pvBlog(s, f, text, st) {
  const b = pvBrand();
  const h1 = AC.blogH1(text);
  // Thân bài Blog dùng cùng bộ hiển thị với Cell/Topic (mục 10.32); ảnh/video chèn giữa bài và nút chèn giữa các khối (mục 10.40)
  const blog = AC.isBlogSlot(S, s);
  const canIns = !!(blog && st && !st.edit && !st.old && !st.locked && s.text && text === s.text);
  const body = `<div class="pv-blog-body">${blog ? blogBodyHtml(s, text, st, canIns) : `<div class="content-text rich">${richText(String(text).split('\n').filter(l => !/^#\s/.test(l)).join('\n'))}</div>`}</div>`;
  const ci = s.assets.findIndex(a => !a.blog); const seo = blog ? AC.slotSeoOf(s) : null;
  return `<div class="pv-card pv-blog">
    <div class="pv-browser"><i></i><i></i><i></i><span>${esc(b.handle)}.vn${seo && seo.slug ? `/blog/${esc(seo.slug)}` : '/blog'}</span></div>
    ${pvImage(ci >= 0 ? s.assets[ci] : null, null, null, ci >= 0 ? ci : null)}
    ${st && st.edit ? pvEditBox(st) : ''}<article ${st && st.edit ? 'hidden' : ''}><h3>${esc(h1)}</h3><p class="pv-meta">${esc(b.name)} · ${esc(pvWhen(s))} · ${Math.max(1, Math.round(AC.countWords(text) / 200))} phút đọc${pvBlogMeta(s, st)}</p>${body}</article>
  </div>`;
}
export function pvWhen(s) { return `${AC.WEEKDAY_SHORT[AC.weekdayOf(s.date)]} ${AC.dmy(s.date)} lúc ${s.time}`; }

// Ô sửa bài ngay trong khung bài (chữ dùng font của khung, giãn theo nội dung)
// Ô sửa bài slot (mục 10.28): Blog có thanh Markdown đầy đủ; mạng xã hội chỉ "•", danh sách số, emoji (nền tảng không hiện Markdown)
function pvEditBox(st) {
  const mode = st.s && AC.isBlogSlot(S, st.s) ? 'full' : 'social';
  const bar = mdToolbarHtml('pv-edit', mode, false, true); const blogBar = st.s && AC.isBlogSlot(S, st.s) ? bar.replace(/<\/div>$/, blogEditTools() + '</div>') : bar;
  const blocks = !!(st.s && AC.isBlogSlot(S, st.s)); // Blog: bài dạng khối, ảnh nằm đúng chỗ (mục 10.46)
  return `<div class="mded pv-mded${blocks ? ' pv-blocks' : ''}" data-mode="${mode}">${blogBar}<textarea class="pv-edit" id="pv-edit" data-md="${mode}" data-slot="${esc(st.s ? st.s.id : '')}" spellcheck="false" aria-label="Sửa bài" ${blocks ? 'hidden' : ''}>\n${esc(st.draft)}</textarea>${blocks ? blogBlocksHtml(st) : ''}</div>`;
}
export let pvRefresh = null; // vẽ lại popup đang mở sau thao tác ảnh; trả true nếu popup của slot đó đang mở
export function openPreview(id, n, opts) {
  const s = AC.byId(S.slots, id); if (!s) return;
  const f = AC.byId(S.formats, s.formatId); if (!f) return;
  const h = (s.history || []).find(x => x.n === n);
  const old = !!(h && h.n !== s.curN);
  if (!(h ? h.text : s.text) && !s.free) return toast('Slot chưa có bài để xem.', 'bad');
  const st = { slide: 0, more: false, edit: !!(opts && opts.edit && !old && !AC.isLocked(S, s.weekId) && s.state !== 'PUBLISHED'), draft: '' };
  if (st.edit) { st.draft = s.text || ''; st.more = true; }
  const ch = s.channelId;
  const locked = () => AC.weekOf(S, s.weekId).status === 'CONFIRMED' || s.state === 'PUBLISHED';
  const text = () => st.edit ? st.draft : (h && old ? h.text : s.text) || (s.free ? PV_FREE_EMPTY : '');
  pvCtx = st; st.s = s; st.old = old; st.locked = locked();
  const draw = () => { pvCtx = st; st.locked = locked(); const tx = text(); const sv = s.free ? Object.assign({}, s, { assets: s.assets.filter(a => a.versions.some(v => v.n === a.current)) }) : s; return pvDraw(sv, f, tx, st, ch) + pvInsight(s, st); };
  const pvDraw = (s, f, tx, st, ch) => { return ch === 'ch-fb' && f.layout === 'script' ? pvVertical(s, f, tx, st, 'Facebook Reels') : ch === 'ch-fb' ? pvFacebook(s, f, tx, st) : ch === 'ch-ig' ? pvInstagram(s, f, tx, st)
    : ch === 'ch-tt' ? pvVertical(s, f, tx, st, 'TikTok') : ch === 'ch-th' ? pvThreads(s, f, tx, st)
    : ch === 'ch-yt' ? pvYoutube(s, f, tx, st) : ch === 'ch-blog' ? pvBlog(s, f, tx, st)
    : f.layout === 'carousel' ? pvInstagram(s, f, tx, st) : f.layout === 'script' ? pvVertical(s, f, tx, st, chName(ch)) : f.layout === 'article' ? pvBlog(s, f, tx, st) : pvThreads(s, f, tx, st); };
  // Thanh thao tác trên popup: Sửa, Duyệt (bản đang dùng, tuần chưa chốt); khi sửa: Lưu, Hủy
  const bar = () => {
    if (old) return `<span class="small muted">Đang xem bản cũ, chỉ xem.</span>`;
    if (locked()) return `${pubButtonsHtml(s)}${s.text ? `<button class="btn sm" data-pv="repurpose" title="Viết lại bài này cho kênh khác thành slot mới (mô phỏng)">Chuyển kênh</button>` : ''}${slotStateHtml(s)}<span class="small muted">${esc(s.state === 'PUBLISHED' ? lockNote(s) : 'Tuần đã chốt: muốn sửa nội dung thì bấm "Mở lại để sửa".')}</span>`;
    if (st.edit) return `<button class="btn primary sm" data-pv="save">Lưu bản sửa</button><button class="btn ghost sm" data-pv="cancel">Hủy</button><span class="small muted">${s.free ? 'Sửa chữ trong khung bài; ảnh, video và quy tắc ở các mục bên dưới.' : 'Sửa chữ và thao tác ảnh ngay trong khung bài; quy tắc và điểm ở bên dưới.'}</span>`;
    // Duyệt là khóa (mục 10.88): slot Đã duyệt chỉ còn Mở khóa và các việc không đổi bài
    const sst = AC.slotSrcState(S, s); const srcBtn = sst ? (sst.kind === 'video' ? `<button class="btn sm warnbtn" data-pv="src" title="Thẻ Vid đã có video mới; slot không tự đổi">! Video có bản mới</button>` : `<button class="btn sm warnbtn" data-pv="src" title="Ô nguồn đã có bản mới; bài slot không tự đổi">! Ô nguồn có bản mới</button>`) : '';
    const common = `${s.text ? `<button class="btn sm" data-pv="repurpose" title="Viết lại bài này cho kênh khác thành slot mới (mô phỏng)">Chuyển kênh</button>` : ''}${pubButtonsHtml(s)}<button class="btn ghost sm" data-pv="detail">${icon('gear')} Cấu hình slot</button>${slotStateHtml(s)}`;
    if (s.state === 'APPROVED') return `<button class="btn sm" data-pv="unlock">${icon('unlock')} Mở khóa</button>${srcBtn}${common}`;
    const ok = s.state === 'PUBLISHED';
    return `<button class="btn sm" data-pv="edit">${icon('edit')} Sửa</button><button class="btn ${ok ? '' : 'primary'} sm" data-pv="approve" ${ok || !s.text ? 'disabled' : ''} ${!s.text ? 'title="Viết nội dung trước"' : ''}>${ok ? 'Đã duyệt' : 'Duyệt'}</button>${s.free ? '' : `<button class="btn sm" data-pv="regen" title="Viết lại bài và ảnh từ ô nguồn; bản cũ giữ trong lịch sử">Tạo lại</button>`}${srcBtn}${f.layout === 'carousel' && s.text ? `<button class="btn sm" data-pv="carousel" title="Soạn từng slide: chữ, thứ tự, thêm bớt slide">Soạn carousel</button>` : ''}${s.text ? `<button class="btn sm" data-pv="repurpose" title="Viết lại bài này cho kênh khác thành slot mới (mô phỏng)">Chuyển kênh</button>` : ''}${s.undoN && (s.history || []).some(x => x.n === s.undoN) ? `<button class="btn ghost sm" data-pv="undo">Hoàn tác</button>` : ''}${pubButtonsHtml(s)}<button class="btn ghost sm" data-pv="detail">${icon('gear')} Cấu hình slot</button>${slotStateHtml(s)}`;
  };
  // Phần dưới khung bài khi sửa: độ dài và quy tắc kênh theo chữ đang sửa, ảnh, điểm AI
  const live = () => {
    const tmp = Object.assign({}, s, { text: st.draft });
    const unit = f.hardRules.lengthUnit === 'words' ? 'chữ' : 'ký tự';
    const len = f.layout === 'carousel' ? `${AC.slidesOf(st.draft).length} slide` : `${AC.lengthOf(st.draft, f.hardRules.lengthUnit)} ${unit}`;
    return `<section class="cfg-sec"><div class="cfg-h"><span class="cfg-n">${st.liveN || 2}</span><h3>Quy tắc kênh</h3><span class="small faint cfg-r">${esc(len)}</span></div>${warningsHtml(AC.slotWarnings(S, tmp))}</section>`;
  };
  // Các mục dưới khung bài: thẻ có số và tiêu đề như Cấu hình slot (thứ tự: media, quy tắc kênh, điểm AI)
  const secify = (html, n) => html.replace(/^<section class="stack"><h3>([^<]*)<\/h3>/, (_, h) => `<section class="cfg-sec"><div class="cfg-h"><span class="cfg-n">${n}</span><h3>${h}</h3></div>`);
  const media = () => s.free && !old && st.edit ? pvMediaHtml(s, st, locked()) : st.edit && s.assets.length > 1 ? slotImageRowsHtml(s, locked()) : '';
  const below = () => {
    let n = 0; const m = media(); if (m) n++;
    st.liveN = st.edit ? ++n : 0;
    const sc = st.edit && s.total != null ? `<section class="cfg-sec"><div class="cfg-h"><span class="cfg-n">${++n}</span><h3>Điểm AI (bản đang dùng)</h3></div>${scoreHtml(s.scores, s.total, s.tip, f.criteria, s.ai)}</section>` : '';
    const seoP = AC.isBlogSlot(S, s) && !old && (st.edit ? st.draft : s.text) ? blogSeoPanelHtml(s, st, ++n) : '';
    const pubs = !st.edit && !old ? pubSectionsHtml(s, n) : '';
    return `${m ? secify(m, 1) : ''}${st.edit ? `<div id="pv-live">${live()}</div>` : ''}${sc}${seoP}${pubs}`;
  };
  const paint = () => {
    box.querySelector('#pv-bar').innerHTML = bar();
    box.querySelector('#pv-stage').innerHTML = draw();
    box.querySelector('#pv-below').innerHTML = below();
    box.classList.toggle('editing', st.edit);
    const ta = box.querySelector('#pv-edit');
    const blk = box.querySelector('.pv-blk');
    if (blk && ta) { // Sửa Blog dạng khối: ghép các khối vào #pv-edit (ẩn) mỗi lần gõ
      const fitS = x => { x.style.height = 'auto'; x.style.height = x.scrollHeight + 2 + 'px'; };
      const join = () => [...blk.children].map(n => n.matches('textarea') ? n.value : n.dataset.line).join('\n');
      blk.querySelectorAll('.pv-seg').forEach((x, k) => { fitS(x); x.addEventListener('focus', () => { setMdSegLast(k); fitS(x); }); x.addEventListener('input', () => { fitS(x); ta.value = join(); ta.dispatchEvent(new Event('input')); }); });
    }
    if (ta) { let seoT = null; const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }; fit(); ta.addEventListener('input', () => { st.draft = ta.value; fit(); box.querySelector('#pv-live').innerHTML = live(); const sp = box.querySelector('#pv-seo'); if (sp) { clearTimeout(seoT); seoT = setTimeout(() => { const cur = box.querySelector('#pv-seo'); if (cur) cur.outerHTML = blogSeoPanelHtml(s, st, cur.querySelector('.cfg-n').textContent); }, 300); } }); }
  };
  const box = openLayer(`
    <header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Xem như khi đăng · mô phỏng</span><h2>${esc(fmtFull(s.formatId))}</h2><p class="small muted">${esc(pvWhen(s))}${old ? ` · bản ${h.n} (bản cũ)` : ''}. Giao diện gần đúng để hình dung; kênh thật có thể hiển thị khác đôi chút.</p></div>
      <button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="row pv-bar" id="pv-bar"></div>
    <div class="pv-stage" id="pv-stage"></div>
    <div class="stack pv-below" id="pv-below"></div>`, 'dialog');
  box.classList.add('pv-dialog');
  pvRefresh = sid => { if (sid !== s.id || !box.isConnected) return false; paint(); return true; };
  paint();
  box.addEventListener('click', async e => {
    const xb = e.target.closest('[data-x]');
    if (xb && !xb.disabled) { const ta0 = box.querySelector('#pv-edit'); if (ta0) st.draft = ta0.value; if (slotImageDialog(s, xb.dataset.x, Number(xb.dataset.i))) return; const ia = slotImageAction(s, xb.dataset.x, Number(xb.dataset.i)); if (ia) { if (!ia[0].ok) return toast(ia[0].error, 'bad'); save(); render(); paint(); if (ia[1]) toast(ia[1]); } return; }
    const b = e.target.closest('[data-pv]'); if (!b || b.disabled) return;
    const k = b.dataset.pv;
    if (k.startsWith('b-')) { if (st.edit) { const ta1 = box.querySelector('#pv-edit'); if (ta1) st.draft = ta1.value; } await blogPvAction(s, st, k, b, paint); return; }
    if (k === 'mtable') { const t = box.querySelector('#pv-metrics'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (k === 'medit') { const i = Number(b.dataset.i); st.editOpen = st.editOpen === i ? null : i; st.edraft = ''; paint(); return; }
    if (k === 'mclose') { st.editOpen = null; paint(); return; }
    if (k === 'mapply') {
      const i = Number(b.dataset.i); const inp = box.querySelector(`#pv-medit-${i}`);
      const r = AC.editSlotImage(S, s.id, i, inp ? inp.value : ''); if (!r.ok) return toast(r.error, 'bad');
      st.editOpen = null; save(); render(); paint(); toast(`Đã tạo ảnh phiên bản ${r.version} theo yêu cầu.`); return;
    }
    if (k === 'pub') { if (await publishDialog(s)) paint(); return; }
    if (k === 'unpub') {
      if (!(await confirmBox({ title: 'Bỏ đánh dấu đã đăng?', body: '<p>Slot về "Đã duyệt"; link và số liệu của bài bị xóa. Bài trên kênh không bị gỡ.</p>', ok: 'Bỏ đánh dấu', danger: true }))) return;
      const r = AC.unmarkPublished(S, s.id); if (!r.ok) return toast(r.error, 'bad');
      save(); render(); paint(); toast('Đã bỏ đánh dấu đã đăng.'); return;
    }
    if (k === 'edit') { st.edit = true; st.draft = s.text; st.more = true; paint(); const ta = box.querySelector('.pv-seg') || box.querySelector('#pv-edit'); if (ta) ta.focus(); return; }
    if (k === 'cancel') {
      if (st.draft !== s.text && !(await confirmBox({ title: 'Bỏ các thay đổi?', body: '<p>Chữ bạn vừa sửa chưa được lưu.</p>', ok: 'Bỏ thay đổi', danger: true }))) return;
      st.edit = false; paint(); return;
    }
    if (k === 'save') {
      if (st.draft === s.text) { st.edit = false; paint(); return; }
      const r = AC.editSlot(S, s.id, st.draft); if (!r.ok) return toast(r.error, 'bad');
      if (st.hookKind) { AC.setSlotHookKind(S, s.id, st.hookKind); st.hookKind = null; }
      st.edit = false; save(); render(); paint(); toast('Đã lưu bản sửa. Slot chờ duyệt lại.'); return;
    }
    if (k === 'regen') { const r = await regenFlow(s); if (!r) return; st.slide = 0; st.more = false; paint(); toast(`Đã tạo bản ${r.n}. Bấm Hoàn tác để quay lại bản trước.`); return; }
    if (k === 'unlock') { if (await unlockFlow(s)) paint(); return; }
    if (k === 'src') { srcDialog(s, msg => { save(); render(); st.slide = 0; paint(); if (msg) toast(msg); }); return; }
    if (k === 'undo') { const r = AC.useSlotVersion(S, s.id, s.undoN); if (!r.ok) return toast(r.error, 'bad'); st.slide = 0; save(); render(); paint(); toast('Đã quay lại bản trước.'); return; }
    if (k === 'approve') {
      const nw = AC.slotWarnings(S, s).length;
      if (nw && !(await confirmBox({ title: 'Duyệt slot có cảnh báo?', body: `<p>Slot này có ${nw} cảnh báo. Cảnh báo chỉ để tham khảo; bạn vẫn duyệt được.</p>`, ok: 'Vẫn duyệt' }))) return;
      const r = AC.approveSlot(S, s.id); if (!r.ok) return toast(r.error, 'bad');
      save(); render(); paint(); toast('Đã duyệt slot.'); return;
    }
    if (k === 'carousel') { openCarouselEditor(s, () => { save(); render(); st.slide = 0; paint(); }); return; }
    if (k === 'repurpose') { openRepurposeDialog(s); return; }
    if (k === 'detail') { if (st.edit && st.draft !== s.text) return toast('Lưu hoặc Hủy bản sửa trước.', 'bad'); openSlot(s.id, null, true); return; }
    if (st.edit) { const ta = box.querySelector('#pv-edit'); if (ta) st.draft = ta.value; }
    if (k === 'more') st.more = true;
    if (k === 'prev') st.slide = Math.max(0, st.slide - 1);
    if (k === 'next') st.slide += 1;
    if (k === 'goto') st.slide = Number(b.dataset.k);
    paint();
  });
}
