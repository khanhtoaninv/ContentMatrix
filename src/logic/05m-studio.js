// ---------- Kho tài sản, soạn carousel theo slide, chuyển bài sang kênh khác (mục 10.37) ----------
import { clone, fold, mondayOf, paraBreak, splitSentences } from './01-util.js';
import { slidesOf } from './03-rules.js';
import { addSlotToStart, byId, log, newAsset, nextId, slotColumnId, slotLockMsg } from './05-model.js';
import { editSlot } from './05c-slots.js';
import { addSlotImageVersion } from './05i-frames.js';
import { DEFAULT_CTAS, coreIdea, hookOptions, snippetsFor } from './05k-assist.js';
import { stampRatios } from './05q-imgspec.js';
// Kho tài sản và soạn carousel: chạy thật. Chuyển bài sang kênh: MÔ PHỎNG (convertPost ghép lại câu theo khung Format đích).

// ---- Kho tài sản ----
export function libraryOf(S) { return S.library || []; }
export function addLibraryItem(S, it, at) {
  const name = String((it && it.name) || '').trim().slice(0, 80);
  if (!name) return { ok: false, error: 'Đặt tên cho ảnh.' };
  if (!/^data:image\/(png|jpeg|webp|gif);/.test((it && it.src) || '')) return { ok: false, error: 'Kho chỉ nhận ảnh PNG, JPEG, WebP hoặc GIF.' };
  const tags = normTags(it.tags);
  const item = { id: nextId(S, 'lib'), name, src: it.src, w: it.w || null, h: it.h || null, tags, addedAt: at || S.settings.demoNow };
  S.library = libraryOf(S).concat([item]); log(S, 'add', 'library', item.id, name);
  return { ok: true, item };
}
function normTags(t) {
  const arr = Array.isArray(t) ? t : String(t || '').split(',');
  return arr.map(x => String(x).trim().replace(/^#/, '')).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 8);
}
export function updateLibraryItem(S, id, patch) {
  const it = libraryOf(S).find(x => x.id === id); if (!it) return { ok: false, error: 'Không tìm thấy ảnh trong kho.' };
  if (patch.name != null) { const n = String(patch.name).trim().slice(0, 80); if (!n) return { ok: false, error: 'Tên không được để trống.' }; it.name = n; }
  if (patch.tags != null) it.tags = normTags(patch.tags);
  return { ok: true, item: it };
}
export function deleteLibraryItem(S, id) {
  const n = libraryOf(S).length; S.library = libraryOf(S).filter(x => x.id !== id);
  return n === S.library.length ? { ok: false, error: 'Không tìm thấy ảnh trong kho.' } : { ok: true };
}
export function libraryFind(S, q, tag) {
  const f = fold(q || '');
  return libraryOf(S).filter(x => (!tag || x.tags.includes(tag)) && (!f || fold(x.name + ' ' + x.tags.join(' ')).includes(f)));
}
export function libraryTags(S) { return [...new Set(libraryOf(S).flatMap(x => x.tags))].sort(); }
// Số lần ảnh trong kho đã được dùng ở slot
export function libraryUses(S, id) { let n = 0; S.slots.forEach(s => s.assets.forEach(a => a.versions.forEach(v => { if (v.lib && v.lib.id === id) n++; }))); return n; }
export function useLibraryItem(S, slotId, idx, libId, at) {
  const it = libraryOf(S).find(x => x.id === libId); if (!it) return { ok: false, error: 'Không tìm thấy ảnh trong kho.' };
  const m = /^data:image\/(\w+);/.exec(it.src); const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg';
  return addSlotImageVersion(S, slotId, idx, { src: it.src, ext, lib: { id: it.id, name: it.name } }, at);
}

// ---- Soạn carousel theo slide ----
// Tách bài carousel: phần trước "Slide 1" (chú thích) và nội dung từng slide
export function carouselParse(text) {
  const t = String(text || ''); const m = /^\s*Slide\s*\d+\s*[:·.-]/im.exec(t);
  return { lead: m ? t.slice(0, m.index).trim() : '', slides: slidesOf(t) };
}
export function carouselCompose(lead, slides) {
  const body = slides.map((x, i) => `Slide ${i + 1}: ${String(x).replace(/\s+$/, '')}`).join('\n\n');
  return lead && lead.trim() ? `${lead.trim()}\n\n${body}` : body;
}
const isSlideAsset = a => /^Slide\s*\d+/i.test(a.name);
// slides: [{ text, from }] — from là chỉ số slide cũ (ảnh đi theo), null là slide mới (ô ảnh trống)
export function saveCarouselSlides(S, slotId, lead, slides, at) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!Array.isArray(slides) || !slides.length) return { ok: false, error: 'Carousel cần ít nhất một slide.' };
  if (slides.length > 20) return { ok: false, error: 'Tối đa 20 slide.' };
  if (slides.some(x => !String(x.text || '').trim())) return { ok: false, error: 'Có slide đang trống chữ.' };
  const text = carouselCompose(lead, slides.map(x => String(x.text).trim()));
  const oldSlides = s.assets.filter(isSlideAsset), others = s.assets.filter(a => !isSlideAsset(a));
  const n = slides.length;
  const assets = slides.map((x, i) => {
    const a = x.from != null && oldSlides[x.from] ? oldSlides[x.from] : newAsset({ name: '', prompt: '', ratio: oldSlides[0] && oldSlides[0].ratio });
    a.name = `Slide ${i + 1}/${n}`; return a;
  });
  // ảnh của slide bị xoá không mất hẳn: còn trong lịch sử bản của slot
  const textChanged = text !== s.text;
  if (textChanged) { const r = editSlot(S, slotId, text, at); if (!r.ok) return r; }
  s.assets = assets.concat(others); stampRatios(S, s);
  log(S, 'carousel', 'slot', slotId, `${n} slide`);
  return { ok: true, slides: n, textChanged };
}

// ---- Chuyển bài sang kênh khác (mô phỏng) ----
export function plainSentences(text) {
  const body = String(text || '').split('\n')
    .filter(l => !/^\s*#\S/.test(l.trim()) || /^\s*#{1,6}\s/.test(l))
    .map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s+|Slide\s*\d+\s*[:·.-]|[-*•]\s+|\d+[.)]\s+)/i, '').trim())
    .filter(Boolean).map(l => /[.!?…:"”)]$/.test(l) ? l : l + '.').join(' ').replace(/\*\*/g, '');
  return splitSentences(body).filter(x => x.length > 3);
}
export function convertPost(S, text, toFormatId, ctx) {
  const f = byId(S.formats, toFormatId); if (!f) return { ok: false, error: 'Không tìm thấy Format.' };
  const ch = byId(S.channels, f.channelId);
  const core = coreIdea(text) || 'Bài mới'; const ss = plainSentences(text);
  const first = ss[0] && fold(ss[0]).startsWith(fold(core).slice(0, 20)) ? ss.slice(1) : ss;
  const c = Object.assign({}, ctx || {}, { channelId: f.channelId });
  const ctaS = snippetsFor(S, c, 'cta')[0]; const cta = ctaS ? ctaS.text : DEFAULT_CTAS[0];
  const maxTags = ch && ch.maxHashtags != null ? ch.maxHashtags : 3;
  const tagS = snippetsFor(S, c, 'hashtag')[0];
  const tags = maxTags && tagS ? tagS.text.split(' ').slice(0, maxTags).join(' ') : '';
  const hook = hookOptions(text)[2].text; // Bất ngờ
  let out;
  if (f.layout === 'carousel') {
    const body = first.slice(0, 6);
    out = carouselCompose('', [core, ...body, cta]) + (tags ? `\n\n${tags}` : '');
  } else if (f.layout === 'script') {
    out = `[Hook · 0–3 giây]\n${hook}\n\n[Ý chính]\n${first.slice(0, 4).join('\n')}\n\n[CTA]\n${cta}`;
  } else if (f.layout === 'longscript') {
    out = `[Mở đầu · 0:00]\n${hook}\n\n[Vấn đề · 0:20]\n${first.slice(0, 3).join(' ')}\n\n[Giải thích · 1:30]\n${first.slice(3, 7).join(' ') || first.slice(0, 2).join(' ')}\n\n[Kết · 4:00]\n${cta}`;
  } else if (f.layout === 'article') {
    const g = (a, b) => first.slice(a, b).join(' ');
    out = `# ${core}\n\n${hook}\n\n## Vấn đề\n${g(0, 3) || core + '.'}\n\n## Cách làm\n${g(3, 7) || g(0, 2)}\n\n## Kết luận\n${g(7, 10) || cta}`;
  } else {
    const limit = (ch && ch.maxChars) || 1500; const parts = [hook]; let len = hook.length;
    for (const x of first) { if (len + x.length + cta.length + tags.length + 8 > limit) break; parts.push(x); len += x.length + 1; }
    out = paraBreak([parts[0], parts.slice(1).join(' ')].filter(Boolean).join('\n\n'), 3) + `\n\n${cta}` + (tags ? `\n\n${tags}` : '');
  }
  return { ok: true, text: out.replace(/\n{3,}/g, '\n\n').trim(), simulated: true, format: f };
}
// Tạo slot tự do mới ở kênh khác từ bài của slot gốc; ảnh đang dùng của ô đầu được chép sang
export function repurposeSlot(S, fromId, req, at) {
  const src = byId(S.slots, fromId); if (!src) return { ok: false, error: 'Không tìm thấy slot gốc.' };
  if (!src.text) return { ok: false, error: 'Slot gốc chưa có bài.' };
  const f = byId(S.formats, req.formatId); if (!f) return { ok: false, error: 'Chọn Format đích.' };
  if (f.id === src.formatId) return { ok: false, error: 'Chọn Format khác Format hiện tại.' };
  const colId = slotColumnId(S, src);
  const conv = convertPost(S, src.text, f.id, { columnId: colId }); if (!conv.ok) return conv;
  const r = addSlotToStart(S, mondayOf(req.date), { date: req.date, time: req.time, channelId: f.channelId, formatId: f.id, free: true, columnId: colId || null });
  if (!r.ok) return r;
  const s = r.slot;
  const e = editSlot(S, s.id, conv.text, at); if (!e.ok) return e;
  s.repurposedFrom = { slotId: src.id, formatId: src.formatId, simulated: true };
  const a0 = src.assets.find(a => a.versions.some(v => v.n === a.current && v.kind !== 'video'));
  if (a0) {
    const v = clone(a0.versions.find(x => x.n === a0.current));
    if (!s.assets.length) s.assets.push(Object.assign(newAsset({ name: 'Ảnh 1', prompt: '' }), { extra: true }));
    stampRatios(S, s); const t = s.assets[0]; v.n = t.versions.length + 1; t.versions.push(v); t.current = v.n; t.prompt = t.prompt || a0.prompt || '';
  }
  log(S, 'repurpose', 'slot', s.id, `${src.id} → ${f.id}`);
  return { ok: true, slot: s };
}
