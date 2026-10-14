// ---------- UI · Sơ đồ layout của Format (mục 10.13): khung dây giúp hình dung bài trước khi tạo ----------
const FL_CARD_KINDS = { 'fb-quote': 'Câu trích lớn', 'fb-truefalse': 'Nhận định + "Đúng hay Sai?"', 'fb-poll': 'Câu hỏi bình chọn', 'fb-fill': 'Câu có chỗ trống ___', 'fb-infographic': 'Con số nổi bật' };
function flLines(n, w) { return Array.from({ length: n }, (_, i) => `<i class="fl-line" style="width:${i === n - 1 ? w || 60 : 100}%"></i>`).join(''); }
function flImg(name, label, ratio) {
  return `<div class="fl-img" style="aspect-ratio:${ratio || pvRatio(name)}"><span>${esc(label || name)}</span></div>`;
}
function formatLayoutHtml(formatId) {
  const f = AC.byId(S.formats, formatId);
  if (!f) return '<div class="fl-wrap"><p class="small muted">Chọn Format để xem layout bài.</p></div>';
  const hr = f.hardRules || {}; const unit = hr.lengthUnit === 'words' ? 'chữ' : 'ký tự';
  const assets = f.assetNeeds || []; const k = f.kind || '';
  const parts = f.structure || [];
  let frame = '';
  if (f.layout === 'carousel') {
    const n = Math.max(hr.slideMin || 4, Math.min(hr.slideMax || 6, 6));
    const tiles = Array.from({ length: n }, (_, i) => `<div class="fl-slide"><b>${i === 0 ? 'Bìa' : i === n - 1 ? 'CTA' : i + 1}</b>${flLines(i === 0 ? 1 : 2, 70)}</div>`).join('');
    frame = `<div class="fl-card"><div class="fl-head"><i class="fl-ava"></i>${flLines(1, 40)}</div><div class="fl-strip">${tiles}</div><div class="fl-pad">${flLines(2, 50)}</div></div>
      <p class="fl-note">${hr.slideMin || '?'}–${hr.slideMax || '?'} slide, mỗi slide một ảnh vuông có chữ${hr.wordsPerSlideMax ? `, tối đa ${hr.wordsPerSlideMax} chữ/slide` : ''}; chú thích ngắn dưới album.</p>`;
  } else if (f.layout === 'script') {
    frame = `<div class="fl-row"><div class="fl-vert"><span>9:16</span><i class="fl-sub"></i></div><ol class="fl-scenes">${(parts.length ? parts : ['Hook', 'Nội dung', 'CTA']).map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
      <p class="fl-note">Video dọc, phụ đề theo từng cảnh của kịch bản; ảnh là khung cảnh quay dọc.</p>`;
  } else if (f.layout === 'longscript') {
    frame = `<div class="fl-card">${flImg('', 'Thumbnail 16:9 · tiêu đề', '16 / 9')}<div class="fl-pad"><i class="fl-title"></i>${flLines(2, 60)}</div><ol class="fl-chapters">${parts.map(p => `<li><span class="mono">0:00</span> ${esc(p)}</li>`).join('')}</ol></div>
      <p class="fl-note">Video ngang có mục lục theo mốc thời gian; thumbnail mang tiêu đề Topic.</p>`;
  } else if (f.layout === 'article') {
    frame = `<div class="fl-card"><div class="fl-browser"><i></i><i></i><i></i></div>${flImg('1200×630', 'Ảnh bìa 1200×630 · tiêu đề', '1200 / 630')}<div class="fl-pad"><i class="fl-title"></i>${parts.map(p => `<b class="fl-h2">${esc(p)}</b>${flLines(2, 80)}`).join('')}</div></div>
      <p class="fl-note">Bài blog có H1, các mục H2 theo cấu trúc, ảnh bìa đầu bài.</p>`;
  } else {
    const card = FL_CARD_KINDS[k];
    const img = assets.length ? (card ? `<div class="fl-img fl-cardimg" style="aspect-ratio:${pvRatio(assets[0].name)}"><em>${esc(card)}</em><span>${esc(assets[0].name)}</span></div>` : flImg(assets[0].name)) : '';
    const poll = k === 'fb-poll' ? `<div class="fl-pad fl-opts"><span>👍 Lựa chọn A</span><span>❤️ Lựa chọn B</span><span>😮 Lựa chọn C</span></div>` : '';
    frame = `<div class="fl-card"><div class="fl-head"><i class="fl-ava"></i>${flLines(1, 40)}</div><div class="fl-pad">${parts.map(p => `<span class="fl-part">${esc(p)}</span>`).join('')}${flLines(card ? 2 : 4, 55)}</div>${img}${poll}<div class="fl-acts"><i></i><i></i><i></i></div></div>
      <p class="fl-note">${assets.length ? (card ? 'Ảnh-thẻ có chữ lấy từ bài, đặt dưới phần chữ.' : 'Ảnh đặt dưới phần chữ.') : 'Chỉ có chữ, không cần ảnh.'}</p>`;
  }
  const facts = [`${chName(f.channelId)}`, `Cột ${colName(f.columnId)}`, hr.min || hr.max ? `${hr.min || 0}–${hr.max || '…'} ${unit}` : '', parts.length ? parts.join(' → ') : '', hr.requireCta ? 'Cần CTA' : '', hr.hashtagMax != null ? `Tối đa ${hr.hashtagMax} hashtag` : '', assets.length ? `Ảnh: ${assets.map(a => a.name).join(', ')}` : 'Không cần ảnh'].filter(Boolean);
  return `<div class="fl-wrap" aria-label="Layout của Format ${esc(f.name)}"><div class="fl-top"><span class="eyebrow">Layout · ${esc(f.name)}</span>${f.guideMd ? `<span class="small muted">${esc(f.guideMd)}</span>` : ''}</div>${frame}<div class="fl-facts">${facts.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`;
}
