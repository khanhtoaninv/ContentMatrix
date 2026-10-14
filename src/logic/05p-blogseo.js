// ---------- Blog chuẩn SEO (mục 10.40): chuẩn chung, thông tin SEO của slot, rà soát, chèn ảnh/video, liên kết, gói xuất, kho bài, đăng qua API ----------
// Bài Blog vẫn là Markdown: đúng một "# Tiêu đề", đề mục "## / ###", đoạn ngắn, danh sách, **đậm**, *nghiêng*, [liên kết](url), > trích dẫn.
// Ảnh/video chèn giữa bài là một dòng riêng: ![mô tả ảnh](media:bm-12 "chú thích"), trỏ tới ô media của slot (a.bid).
const BLOG_SEO_DEFAULT = {
  titleMax: 60, descMin: 140, descMax: 160, wordsMin: 300, wordsMax: 2500, paraMaxWords: 120, answerMaxWords: 60,
  kwDensityMax: 3, internalMin: 1, linksMax: 15, coverMinW: 1200,
  siteUrl: '', blogPath: '/blog/', defaultAuthor: '', utmSource: 'autocontent', utmMedium: 'blog',
};
const BLOG_INTENTS = { info: 'Tìm hiểu thông tin', howto: 'Hướng dẫn cách làm', compare: 'So sánh, lựa chọn', buy: 'Mua hoặc đăng ký' };
const BLOG_NUM_KEYS = ['titleMax', 'descMin', 'descMax', 'wordsMin', 'wordsMax', 'paraMaxWords', 'answerMaxWords', 'kwDensityMax', 'internalMin', 'linksMax', 'coverMinW'];
const MEDIA_LINE = /^!\[([^\]]*)\]\(media:([\w-]+)(?:\s+"([^"]*)")?\)\s*$/;
const LINK_RX = /(^|[^!])\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const BAD_ANCHORS = ['bấm vào đây', 'nhấn vào đây', 'tại đây', 'ở đây', 'click', 'click here', 'xem thêm', 'link', 'đây', 'here'];

function blogSeoOf(S) { return Object.assign({}, BLOG_SEO_DEFAULT, (S.settings && S.settings.blogSeo) || {}); }
function setBlogSeo(S, patch) {
  const cur = blogSeoOf(S); const next = Object.assign({}, cur);
  const errs = [];
  BLOG_NUM_KEYS.forEach(k => { if (patch[k] === undefined || patch[k] === '') return; const v = Number(patch[k]); if (!isFinite(v) || v < 0) errs.push(`"${k}" phải là số không âm.`); else next[k] = v; });
  ['siteUrl', 'blogPath', 'defaultAuthor', 'utmSource', 'utmMedium'].forEach(k => { if (patch[k] !== undefined) next[k] = String(patch[k] || '').trim(); });
  if (next.siteUrl && !isValidUrl(next.siteUrl)) errs.push('Địa chỉ website phải bắt đầu bằng http:// hoặc https://.');
  next.siteUrl = next.siteUrl.replace(/\/+$/, '');
  next.blogPath = '/' + next.blogPath.replace(/^\/+|\/+$/g, '') + (next.blogPath.replace(/\//g, '') ? '/' : '');
  if (next.descMin > next.descMax) errs.push('Mô tả: tối thiểu lớn hơn tối đa.');
  if (next.wordsMin > next.wordsMax) errs.push('Độ dài bài: tối thiểu lớn hơn tối đa.');
  if (next.titleMax < 20) errs.push('Tiêu đề SEO tối đa nên từ 20 ký tự trở lên.');
  if (errs.length) return { ok: false, error: errs.join(' ') };
  S.settings.blogSeo = next; log(S, 'update', 'blogSeo', 'settings');
  return { ok: true, cfg: next };
}
function isBlogSlot(S, s) {
  if (!s) return false;
  const f = byId(S.formats, s.formatId);
  return !!f && f.layout === 'article'; // chỉ Format loại Bài Blog (mục 10.42)
}
function slotSeoOf(s) {
  if (!s.seo) s.seo = {};
  return Object.assign({ keyword: '', keywords: [], intent: 'info', author: '', category: '', tags: [], slug: '', slugEdited: false, related: [], ctaUrl: '', ctaText: '',
    kwSource: '', kwConfirmed: false, seoTitle: '', seoTitleEdited: false, metaDesc: '', metaDescEdited: false, excerpt: '', excerptEdited: false, coverAlt: '', coverAltEdited: false }, s.seo);
}
// Slug không dấu, chữ thường, gạch nối
function vnSlug(text, max) {
  const s = fold(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length <= (max || 70)) return s;
  return s.slice(0, max || 70).replace(/-[^-]*$/, '') || s.slice(0, max || 70);
}
const kwNorm = k => fold(k).replace(/[^a-z0-9]+/g, ' ').trim();
const listOf = v => (Array.isArray(v) ? v : String(v || '').split(/[,\n;]/)).map(x => String(x).trim()).filter(Boolean);
function setSlotSeo(S, slotId, patch) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!isBlogSlot(S, s)) return { ok: false, error: 'Chỉ slot Blog mới có thông tin SEO.' };
  const cur = slotSeoOf(s); const next = Object.assign({}, cur); const errs = [];
  if (patch.keyword !== undefined) { const k = String(patch.keyword || '').trim().replace(/\s+/g, ' '); if (k !== cur.keyword || patch.confirm) { next.keyword = k; next.kwSource = k ? 'user' : ''; next.kwConfirmed = !!k; } }
  if (patch.confirm && next.keyword) { next.kwConfirmed = true; }
  if (patch.keywords !== undefined) next.keywords = listOf(patch.keywords).slice(0, 10);
  if (patch.intent !== undefined) { if (!BLOG_INTENTS[patch.intent]) errs.push('Ý định tìm kiếm không hợp lệ.'); else next.intent = patch.intent; }
  ['author', 'category', 'ctaText'].forEach(k => { if (patch[k] !== undefined) next[k] = String(patch[k] || '').trim(); });
  if (patch.tags !== undefined) next.tags = listOf(patch.tags).slice(0, 15);
  if (patch.related !== undefined) {
    next.related = listOf(patch.related);
    const bad = next.related.filter(u => !isValidUrl(u) && !/^\/[^\s]*$/.test(u));
    if (bad.length) errs.push(`Link bài liên quan không hợp lệ: ${bad.join(', ')}.`);
  }
  if (patch.ctaUrl !== undefined) { next.ctaUrl = String(patch.ctaUrl || '').trim(); if (next.ctaUrl && !isValidUrl(next.ctaUrl)) errs.push('Link CTA phải bắt đầu bằng http:// hoặc https://.'); }
  if (patch.slug !== undefined) {
    const raw = String(patch.slug || '').trim();
    if (!raw) { next.slugEdited = false; next.slug = vnSlug(blogH1(s.text) || ''); }
    else { const sl = vnSlug(raw, 90); if (sl !== raw) errs.push(`Slug chỉ gồm chữ thường không dấu, số và gạch nối (gợi ý: ${sl}).`); else if (sl !== cur.slug) { next.slug = sl; next.slugEdited = true; } }
  }
  [['seoTitle', 'seoTitleEdited'], ['metaDesc', 'metaDescEdited'], ['excerpt', 'excerptEdited'], ['coverAlt', 'coverAltEdited']].forEach(([k, ed]) => {
    if (patch[k] === undefined) return;
    const v = String(patch[k] || '').replace(/\s+/g, ' ').trim();
    if (!v) next[ed] = false; else if (v !== cur[k]) { next[k] = v; next[ed] = true; }
  });
  if (errs.length) return { ok: false, error: errs.join(' ') };
  s.seo = next; blogRefreshAuto(S, s);
  log(S, 'update-seo', 'slot', slotId);
  return { ok: true, seo: s.seo, conflicts: keywordConflicts(S, slotId, s.seo.keyword) };
}
// Trùng từ khoá chính với slot Blog khác hoặc bài đã đăng trong kho (hai bài tranh cùng một từ khoá)
function keywordConflicts(S, slotId, kw) {
  const k = kwNorm(kw); if (!k) return [];
  const out = [];
  S.slots.forEach(x => { if (x.id !== slotId && x.seo && kwNorm(x.seo.keyword) === k && isBlogSlot(S, x)) out.push({ type: 'slot', id: x.id, label: `${x.date} ${x.time} · ${blogH1(x.text) || 'slot Blog'}` }); });
  (S.blogPosts || []).forEach(p => { if (kwNorm(p.keyword) === k) out.push({ type: 'post', id: p.id, label: p.title || p.url, url: p.url }); });
  return out;
}
// Gợi ý từ khoá từ tiêu đề Topic (slot tạo từ Tuần mẫu chưa khai báo)
function suggestKeyword(title) {
  const w = String(title || '').toLowerCase().replace(/["“”'’:;,.!?()[\]]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['và', 'của', 'là', 'những', 'các', 'một', 'cho', 'với', 'để', 'khi', 'bạn', 'thế', 'nào', 'gì', 'sao']);
  while (w.length && stop.has(w[w.length - 1])) w.pop();
  while (w.length && stop.has(w[0])) w.shift();
  return w.slice(0, 6).join(' ');
}
function confirmKeyword(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  const seo = slotSeoOf(s); if (!seo.keyword) return { ok: false, error: 'Slot chưa có từ khoá.' };
  return setSlotSeo(S, slotId, { keyword: seo.keyword, confirm: true });
}

// ---- Đọc bài Blog ----
function blogH1(text) { const l = String(text || '').split('\n').find(x => /^#\s+\S/.test(x)); return l ? l.replace(/^#\s+/, '').trim() : ''; }
function linksOf(text) {
  const out = []; String(text || '').split('\n').forEach((line, li) => {
    if (MEDIA_LINE.test(line.trim())) return;
    let m; LINK_RX.lastIndex = 0;
    while ((m = LINK_RX.exec(line))) out.push({ anchor: m[2], url: m[3], line: li, at: m.index + m[1].length });
  });
  return out;
}
function blogDoc(text) {
  const d = { h1: [], headings: [], paras: [], media: [], junk: [], lines: String(text || '').split('\n') };
  d.lines.forEach((raw, i) => {
    const line = raw.trim(); if (!line) return; let m;
    if ((m = MEDIA_LINE.exec(line))) return d.media.push({ alt: m[1].trim(), bid: m[2], cap: (m[3] || '').trim(), line: i });
    if (/^#\s+/.test(line)) return d.h1.push({ text: line.replace(/^#\s+/, ''), line: i });
    if ((m = /^(#{2,6})\s+(.*)$/.exec(line))) return d.headings.push({ level: m[1].length, text: m[2].trim(), line: i });
    if (/^\[[^\]]+\]$/.test(line)) d.junk.push({ line: i, text: line, why: 'Nhãn trong ngoặc vuông' });
    else if (/^(Slide|Cảnh)\s*\d+\s*[:·]/i.test(line)) d.junk.push({ line: i, text: line, why: 'Nhãn slide/cảnh' });
    else if (/^\|.*\|$/.test(line)) d.junk.push({ line: i, text: line, why: 'Bảng' });
    else if (/<\/?[a-z][a-z0-9]*[^>]*>/i.test(line)) d.junk.push({ line: i, text: line, why: 'Thẻ HTML' });
    else if (/(^|\s)#[\p{L}\p{N}_]+/u.test(line)) d.junk.push({ line: i, text: line, why: 'Hashtag' });
    const kind = /^([-*•]|\d+[.)])\s+/.test(line) ? 'li' : /^>/.test(line) ? 'quote' : 'p';
    const plain = line.replace(/^([-*•]|\d+[.)]|>)\s*/, '').replace(LINK_RX, '$1$2').replace(/\*\*|__/g, '');
    d.paras.push({ text: plain, kind, line: i, words: countWords(plain) });
  });
  d.links = linksOf(text);
  return d;
}
// Chữ để đếm và kiểm tra quy tắc: bỏ dòng ảnh/video, liên kết chỉ còn chữ neo
function blogPlain(text) {
  return String(text || '').split('\n').filter(l => !MEDIA_LINE.test(l.trim())).join('\n').replace(LINK_RX, '$1$2').replace(/\n{3,}/g, '\n\n').trim();
}
const hasKw = (text, kw) => !!kwNorm(kw) && (' ' + kwNorm(text) + ' ').includes(' ' + kwNorm(kw) + ' ');
function kwCount(text, kw) { const k = kwNorm(kw); if (!k) return 0; const t = ' ' + kwNorm(text) + ' '; let n = 0, i = 0; while ((i = t.indexOf(' ' + k + ' ', i)) >= 0) { n++; i += k.length + 1; } return n; }

// ---- Trường SEO tự tạo (khi chưa sửa tay) ----
function cutWords(t, max) { t = String(t || '').trim(); if (t.length <= max) return t; const c = t.slice(0, max + 1).replace(/\s+\S*$/, '').replace(/[,:;–-]\s*$/, ''); return c || t.slice(0, max); }
function blogAutoMeta(S, s) {
  const cfg = blogSeoOf(S); const seo = slotSeoOf(s); const d = blogDoc(s.text); const h1 = d.h1.length ? d.h1[0].text : '';
  const kw = seo.keyword;
  let title = h1;
  if (kw && !hasKw(title, kw) && (title.length + kw.length + 3) <= cfg.titleMax) title = `${title}: ${kw.charAt(0).toUpperCase()}${kw.slice(1)}`;
  title = cutWords(title, cfg.titleMax);
  const paras = d.paras.filter(p => p.kind === 'p').map(p => p.text);
  const sents = paras.flatMap(p => splitSentences(p));
  const first = kw ? sents.findIndex(x => hasKw(x, kw)) : -1;
  const order = first > 0 && first < 6 ? [sents[first]].concat(sents.filter((_, i) => i !== first)) : sents;
  let desc = '';
  for (const x of order) { if (desc.length >= cfg.descMin) break; const next = desc ? `${desc} ${x}` : x; if (next.length > cfg.descMax && desc.length >= Math.min(80, cfg.descMin)) break; desc = next; }
  desc = desc.length > cfg.descMax ? cutWords(desc, cfg.descMax - 1).replace(/[.,;:]?$/, '.') : desc;
  const excerpt = cutWords(paras[0] || '', 300);
  return { seoTitle: title, metaDesc: desc, excerpt, coverAlt: h1 ? `Ảnh bìa bài viết: ${h1}` : '' };
}
// Cập nhật các trường tự tạo theo bài hiện tại (giữ trường đã sửa tay); slug theo tiêu đề nếu chưa sửa tay
function blogRefreshAuto(S, s, ai) {
  if (!isBlogSlot(S, s) || !s.text) return;
  const seo = slotSeoOf(s); const auto = blogAutoMeta(S, Object.assign({}, s, { seo }));
  const a = ai || {};
  if (!seo.seoTitleEdited) seo.seoTitle = cutWords(a.seoTitle || auto.seoTitle, blogSeoOf(S).titleMax);
  if (!seo.metaDescEdited) seo.metaDesc = a.metaDescription || auto.metaDesc;
  if (!seo.excerptEdited) seo.excerpt = a.excerpt || auto.excerpt;
  if (!seo.coverAltEdited) seo.coverAlt = a.coverAlt || auto.coverAlt;
  if (!seo.slugEdited) seo.slug = vnSlug(blogH1(s.text) || seo.keyword || s.id);
  if (!seo.author && blogSeoOf(S).defaultAuthor) seo.author = blogSeoOf(S).defaultAuthor;
  s.seo = seo;
}
// Bài mô phỏng: lồng từ khoá vào tiêu đề và mở bài (AI thật tự viết theo khai báo)
function seoWeave(text, kw) {
  if (!kw) return text;
  const lines = String(text || '').split('\n'); const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
  const hi = lines.findIndex(l => /^#\s+/.test(l));
  if (hi >= 0 && !hasKw(lines[hi], kw)) lines[hi] = `${lines[hi]}: ${kw}`;
  const pi = lines.findIndex((l, i) => i > hi && l.trim() && !/^#/.test(l) && !MEDIA_LINE.test(l.trim()));
  if (pi >= 0 && !hasKw(lines[pi], kw)) lines[pi] = `${cap} là điều nhiều người đi làm đang quan tâm. ${lines[pi]}`;
  return lines.join('\n');
}

// ---- Ảnh/video chèn trong bài ----
function blogMediaLine(bid, alt, cap) { return `![${String(alt || '').replace(/[\]\n]/g, ' ').trim()}](media:${bid}${cap ? ` "${String(cap).replace(/["\n]/g, ' ').trim()}"` : ''})`; }
function blogMediaAssets(s) { return (s.assets || []).map((a, i) => ({ a, i })).filter(x => x.a.blog && x.a.bid); }
function blogMediaIndex(s, bid) { return (s.assets || []).findIndex(a => a.blog && a.bid === bid); }
// Khối (đoạn, đề mục, mục danh sách, ảnh) theo thứ tự dòng: dùng để chèn ảnh "sau khối thứ k"
function blogBlocks(text) { return String(text || '').split('\n').map((l, i) => ({ l, i })).filter(x => x.l.trim()).map(x => x.i); }
function insertLineAfter(text, lineIdx, line) {
  const lines = String(text || '').split('\n');
  const at = lineIdx < 0 ? 0 : Math.min(lines.length, lineIdx + 1);
  lines.splice(at, 0, '', line, '');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
// Thêm một ô media cho bài Blog (không đổi chữ)
function addBlogMedia(S, slotId, kind, alt) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!isBlogSlot(S, s)) return { ok: false, error: 'Chỉ chèn ảnh/video vào bài Blog.' };
  const video = kind === 'video';
  const n = blogMediaAssets(s).length + 1; const bid = nextId(S, 'bm');
  const a = newAsset({ name: `${video ? 'Video' : 'Ảnh'} trong bài ${n}`, prompt: '' });
  const h1 = blogH1(s.text);
  Object.assign(a, { extra: true, blog: true, bid, kind: video ? 'video' : 'image', place: 'Trong thân bài' });
  if (!video) a.prompt = `${h1 ? h1 + '. ' : ''}${alt ? alt : 'Ảnh minh hoạ trong bài'}, ảnh ngang 16:9, sáng, rõ chủ thể`.replace(/\s+/g, ' ').trim();
  s.assets.push(a); stampRatios(S, s); log(S, 'add-blog-media', 'slot', slotId, bid);
  return { ok: true, index: s.assets.length - 1, bid, line: blogMediaLine(bid, alt || (video ? 'Video minh hoạ' : 'Ảnh minh hoạ'), '') };
}
// Chèn ảnh/video sau dòng lineIdx (-1 = đầu bài) ngay trên bài đang dùng (không tạo bản mới; bản đang dùng trong lịch sử cập nhật theo)
function insertBlogMedia(S, slotId, lineIdx, kind, alt) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  if (!s.text) return { ok: false, error: 'Slot chưa có bài.' };
  const r = addBlogMedia(S, slotId, kind, alt); if (!r.ok) return r;
  setBlogText(S, s, insertLineAfter(s.text, lineIdx, r.line));
  return r;
}
function setBlogText(S, s, text) {
  const before = s.text; s.text = text;
  const h = (s.history || []).find(x => x.n === (s.curN || s.genN)); if (h) h.text = text;
  if (s.state === 'APPROVED') s.state = 'DRAFT';
  if (s.state === 'PUBLISHED' && before !== text) s.changedAfterPublish = true;
  blogRefreshAuto(S, s);
}
function removeBlogMedia(S, slotId, bid) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const i = blogMediaIndex(s, bid); if (i < 0) return { ok: false, error: 'Không tìm thấy ảnh/video này.' };
  s.assets.splice(i, 1);
  const t = String(s.text || '').split('\n').filter(l => { const m = MEDIA_LINE.exec(l.trim()); return !(m && m[2] === bid); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t !== s.text) setBlogText(S, s, t);
  log(S, 'remove-blog-media', 'slot', slotId, bid);
  return { ok: true };
}
// Ô media chưa có dòng trong bài, và dòng trỏ tới ô không còn
function blogMediaIssues(s, text) {
  const d = blogDoc(text != null ? text : s.text);
  const refs = new Set(d.media.map(m => m.bid)); const have = new Set(blogMediaAssets(s).map(x => x.a.bid));
  return { orphans: blogMediaAssets(s).filter(x => !refs.has(x.a.bid)).map(x => x.a), broken: d.media.filter(m => !have.has(m.bid)) };
}
// Viết lại bài (Tạo lại, Cập nhật từ ô): giữ ảnh đã chèn ở vị trí tương ứng trong bài mới
function keepBlogMedia(oldText, newText, keepBids) {
  const old = String(oldText || '').split('\n'); const keep = keepBids ? new Set(keepBids) : null;
  const refs = []; const blocks = old.filter(l => l.trim() && !MEDIA_LINE.test(l.trim())).length || 1;
  let k = 0;
  old.forEach(l => { const t = l.trim(); if (!t) return; const m = MEDIA_LINE.exec(t); if (m) { if (!keep || keep.has(m[2])) refs.push({ line: t, bid: m[2], frac: k / blocks }); } else k++; });
  let text = String(newText || '');
  refs.forEach(r => {
    if (blogDoc(text).media.some(m => m.bid === r.bid)) return;
    const nb = blogBlocks(text).filter(i => !MEDIA_LINE.test(text.split('\n')[i].trim()));
    const pos = Math.max(1, Math.round(r.frac * nb.length)); // không chèn trước tiêu đề
    text = insertLineAfter(text, nb[Math.min(nb.length - 1, pos - 1)] != null ? nb[Math.min(nb.length - 1, pos - 1)] : -1, r.line);
  });
  return text;
}

// ---- Liên kết ----
function utmUrl(url, cfg, campaign) {
  if (!url || /[?&]utm_source=/.test(url)) return url;
  const p = [cfg.utmSource && `utm_source=${encodeURIComponent(cfg.utmSource)}`, cfg.utmMedium && `utm_medium=${encodeURIComponent(cfg.utmMedium)}`, campaign && `utm_campaign=${encodeURIComponent(campaign)}`].filter(Boolean).join('&');
  if (!p) return url;
  const hash = url.indexOf('#'); const base = hash >= 0 ? url.slice(0, hash) : url; const tail = hash >= 0 ? url.slice(hash) : '';
  return `${base}${base.includes('?') ? '&' : '?'}${p}${tail}`;
}
const urlBase = u => String(u || '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
function linkType(S, s, url) {
  const cfg = blogSeoOf(S); const seo = slotSeoOf(s);
  if (seo.ctaUrl && urlBase(url) === urlBase(seo.ctaUrl)) return 'cta';
  if (/^\//.test(url)) return 'internal';
  let host = ''; try { host = new URL(url).host; } catch (e) { /* bỏ qua */ }
  let site = ''; try { site = cfg.siteUrl ? new URL(cfg.siteUrl).host : ''; } catch (e) { /* bỏ qua */ }
  if (site && host === site) return 'internal';
  if (blogInventory(S, s.id).some(p => urlBase(p.url) === urlBase(url)) || seo.related.some(u => urlBase(u) === urlBase(url))) return 'internal';
  return 'source';
}
// Vị trí cụm chữ trong bài mà chưa nằm trong liên kết, đề mục H1 hay dòng ảnh
function anchorSpots(text, anchor) {
  const out = []; if (!anchor) return out;
  const lines = String(text || '').split('\n'); let pos = 0;
  lines.forEach((line, li) => {
    const start = pos; pos += line.length + 1;
    if (!line.trim() || /^#\s/.test(line) || MEDIA_LINE.test(line.trim())) return;
    const busy = []; let m; LINK_RX.lastIndex = 0;
    while ((m = LINK_RX.exec(line))) busy.push([m.index, m.index + m[0].length]);
    const fl = foldWithMap(line); const fa = fold(anchor); let i = 0;
    while ((i = fl.out.indexOf(fa, i)) >= 0) {
      const a = fl.map[i], z = fl.map[i + fa.length - 1] + 1;
      const before = fl.out[i - 1], after = fl.out[i + fa.length];
      if (!busy.some(([x, y]) => a < y && z > x) && !/[a-z0-9]/.test(before || ' ') && !/[a-z0-9]/.test(after || ' ')) out.push({ line: li, s: start + a, e: start + z, text: line.slice(a, z) });
      i += fa.length;
    }
  });
  return out;
}
function applyLink(text, anchor, url, nth) {
  const u = String(url || '').trim();
  if (!u) return { ok: false, error: 'Nhập đường link.' };
  if (!isValidUrl(u) && !/^\/[^\s]*$/.test(u)) return { ok: false, error: 'Link phải bắt đầu bằng http://, https:// hoặc / (trang trong web).' };
  const spots = anchorSpots(text, anchor); const sp = spots[nth || 0];
  if (!sp) return { ok: false, error: `Không tìm thấy cụm "${anchor}" (hoặc cụm đã có link).` };
  const t = String(text);
  return { ok: true, text: `${t.slice(0, sp.s)}[${sp.text}](${u})${t.slice(sp.e)}` };
}
function unlinkAt(text, anchor, url) {
  let done = false;
  const t = String(text || '').replace(LINK_RX, (all, pre, a, u) => { if (!done && a === anchor && u === url) { done = true; return pre + a; } return all; });
  return done ? { ok: true, text: t } : { ok: false, error: 'Không tìm thấy liên kết này.' };
}
// Gợi ý đoạn nên gắn link: nội bộ (bài trong kho, bài liên quan), nguồn ("Theo …"), kêu gọi hành động (link CTA kèm UTM)
function linkSuggestions(S, s, text) {
  const t = text != null ? text : s.text || ''; const seo = slotSeoOf(s); const cfg = blogSeoOf(S);
  const linked = new Set(linksOf(t).map(l => urlBase(l.url)));
  const out = []; const seenAnchor = new Set();
  const push = x => { const k = fold(x.anchor || '') + '|' + x.type; if (seenAnchor.has(k)) return; seenAnchor.add(k); out.push(Object.assign({ id: `lk${out.length + 1}` }, x)); };
  const posts = blogInventory(S, s.id).concat(seo.related.filter(u => !blogInventory(S, s.id).some(p => urlBase(p.url) === urlBase(u))).map(u => ({ url: u, title: '', keyword: '' })));
  posts.forEach(p => {
    if (linked.has(urlBase(p.url))) return;
    const cands = [p.keyword, p.title].filter(Boolean);
    const words = String(p.title || '').split(/\s+/);
    for (let n = Math.min(5, words.length); n >= 2; n--) for (let i = 0; i + n <= words.length; i++) cands.push(words.slice(i, i + n).join(' ').replace(/[,:;.!?]+$/, ''));
    const hit = cands.find(c => c && c.length >= 6 && anchorSpots(t, c).length);
    if (hit) push({ type: 'internal', anchor: anchorSpots(t, hit)[0].text, url: p.url, why: `Bài liên quan: ${p.title || p.url}` });
    else if (seo.related.some(u => urlBase(u) === urlBase(p.url))) push({ type: 'internal', anchor: '', url: p.url, why: `Bài liên quan chưa có chỗ gắn: ${p.title || p.url}. Thêm một câu dẫn rồi gắn link.` });
  });
  const re = /Theo ([^:().\n]{3,60}?)(?:\s*\([^)]*\))?\s*:/g; let m;
  while ((m = re.exec(t))) { const a = m[1].trim(); if (anchorSpots(t, a).length) push({ type: 'source', anchor: a, url: '', why: 'Số liệu có nguồn: gắn link tới trang gốc của nguồn.' }); }
  if (seo.ctaUrl && !linked.has(urlBase(seo.ctaUrl))) {
    const paras = blogDoc(t).paras.filter(p => p.kind !== 'quote'); const tail = paras.slice(-2).map(p => p.text).join(' ');
    const vm = /(đăng ký|tải|nhận|xem|liên hệ|tham gia|thử|đặt|lưu)[^.,!?\n]{0,40}/i.exec(tail);
    const anchor = seo.ctaText && anchorSpots(t, seo.ctaText).length ? seo.ctaText : vm ? vm[0].trim().split(/\s+/).slice(0, 7).join(' ') : '';
    push({ type: 'cta', anchor: anchor && anchorSpots(t, anchor).length ? anchorSpots(t, anchor)[0].text : '', url: utmUrl(seo.ctaUrl, cfg, seo.slug), why: 'Lời kêu gọi hành động: link đăng ký có UTM để đo nguồn.' });
  }
  return out;
}

// ---- Chuẩn hoá định dạng ----
function blogTidy(text) {
  const changes = []; let h1Seen = false; let prev = 1;
  const drop = new Set(['tiêu đề', 'mở bài', 'kết', 'cta', 'hook', 'thân bài']);
  let lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const firstText = lines.findIndex(l => l.trim());
  if (!lines.some(l => /^#\s+\S/.test(l.trim())) && firstText >= 0 && lines[firstText].trim().length <= 120 && !/^[#\-*•>\d[!]/.test(lines[firstText].trim())) { lines[firstText] = `# ${lines[firstText].trim()}`; changes.push('Dòng đầu thành tiêu đề H1'); }
  lines = lines.map(raw => {
    let l = raw.trim(); if (!l) return '';
    if (MEDIA_LINE.test(l)) return l;
    let m;
    if ((m = /^\[([^\]]+)\]$/.exec(l))) { const lb = m[1].replace(/\s*·.*$/, '').trim(); changes.push(`Bỏ nhãn [${m[1]}]`); return drop.has(lb.toLowerCase()) ? null : `## ${lb}`; }
    if (/^(Slide|Cảnh)\s*\d+\s*[:·]\s*/i.test(l)) { changes.push('Bỏ nhãn Slide/Cảnh'); l = l.replace(/^(Slide|Cảnh)\s*\d+\s*[:·]\s*/i, ''); }
    if (/^\|?\s*:?-{2,}/.test(l) && /\|/.test(l)) { changes.push('Bỏ dòng kẻ bảng'); return null; }
    if (/^\|.*\|$/.test(l)) { changes.push('Bảng thành dòng chữ'); l = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim()).filter(Boolean).join(' – '); }
    if (/<\/?[a-z][a-z0-9]*[^>]*>/i.test(l)) { changes.push('Bỏ thẻ HTML'); l = l.replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '').trim(); }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
      let lv = m[1].length;
      if (lv === 1) { if (h1Seen) { lv = 2; changes.push('Tiêu đề H1 thứ hai thành H2'); } else { h1Seen = true; return `# ${m[2].replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '').trim()}`; } }
      if (lv > prev + 1) { changes.push(`Đề mục nhảy cấp H${lv} thành H${prev + 1}`); lv = prev + 1; }
      prev = lv; return `${'#'.repeat(lv)} ${m[2].trim()}`;
    }
    if (/(^|\s)#[\p{L}\p{N}_]+/u.test(l)) { changes.push('Bỏ hashtag'); l = l.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1').replace(/\s{2,}/g, ' ').trim(); }
    return l || null;
  }).filter(l => l !== null);
  const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: out, changes: [...new Set(changes)] };
}

// ---- Rà soát và chấm điểm ----
function sentencesSet(t) { return new Set(splitSentences(blogPlain(t)).map(x => fold(x).replace(/[^a-z0-9]+/g, ' ').trim()).filter(x => x.length >= 40)); }
function seoAudit(S, s, text) {
  const t = text != null ? text : s.text || '';
  const cfg = blogSeoOf(S); const seo = Object.assign({}, slotSeoOf(s));
  if (text != null && text !== s.text) Object.assign(seo, (() => { const auto = blogAutoMeta(S, Object.assign({}, s, { text: t, seo })); return { seoTitle: seo.seoTitleEdited ? seo.seoTitle : auto.seoTitle, metaDesc: seo.metaDescEdited ? seo.metaDesc : auto.metaDesc, slug: seo.slugEdited ? seo.slug : vnSlug(blogH1(t) || seo.keyword || s.id) }; })());
  const d = blogDoc(t); const kw = seo.keyword; const plain = blogPlain(t); const words = countWords(plain.replace(/^#.*$/gm, ''));
  const checks = [];
  const add = (id, group, ok, label, detail, extra) => checks.push(Object.assign({ id, group, ok: !!ok, label, detail: detail || '' }, extra || {}));
  // Bắt buộc kỹ thuật: thiếu thì không đăng lên web được
  add('h1', 'must', d.h1.length === 1, 'Đúng một tiêu đề H1', d.h1.length === 0 ? 'Chưa có dòng "# Tiêu đề".' : d.h1.length > 1 ? `Có ${d.h1.length} dòng "# ". Bấm Chuẩn hoá để đổi các dòng sau thành H2.` : '', { fix: d.h1.length > 1 || !d.h1.length ? 'tidy' : '' });
  let prev = 1; const skip = d.headings.find(h => { const bad = h.level > prev + 1; prev = h.level; return bad; });
  add('levels', 'must', !skip, 'Đề mục không nhảy cấp', skip ? `"${skip.text}" là H${skip.level} nhưng đứng sau cấp thấp hơn.` : '', { fix: skip ? 'tidy' : '' });
  add('junk', 'must', !d.junk.length, 'Không còn nhãn, hashtag, bảng, thẻ HTML', d.junk.length ? d.junk.slice(0, 3).map(j => `${j.why}: ${j.text.slice(0, 40)}`).join(' · ') : '', { fix: d.junk.length ? 'tidy' : '' });
  const slugDup = seo.slug && (S.slots.some(x => x.id !== s.id && x.seo && x.seo.slug === seo.slug && isBlogSlot(S, x)) || (S.blogPosts || []).some(p => p.slug === seo.slug));
  add('slug', 'must', !!seo.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seo.slug) && !slugDup, 'Slug hợp lệ, không trùng', !seo.slug ? 'Chưa có slug.' : slugDup ? `Slug "${seo.slug}" đã có ở bài khác.` : '');
  add('seoTitle', 'must', seo.seoTitle.length >= 10 && seo.seoTitle.length <= cfg.titleMax, `Tiêu đề SEO tối đa ${cfg.titleMax} ký tự`, `${seo.seoTitle.length} ký tự.`);
  add('metaDesc', 'must', seo.metaDesc.length >= cfg.descMin && seo.metaDesc.length <= cfg.descMax, `Mô tả ${cfg.descMin} đến ${cfg.descMax} ký tự`, `${seo.metaDesc.length} ký tự.`);
  const cover = (s.assets || []).find(a => !a.blog && a.current != null);
  const badAlt = d.media.filter(m => m.alt.length < 5 || /^(ảnh|hình|image|video|ảnh minh hoạ|video minh hoạ)$/i.test(m.alt));
  add('alt', 'must', (!cover || (seo.coverAlt || '').length >= 5) && !badAlt.length, 'Ảnh có mô tả (alt)', [cover && (seo.coverAlt || '').length < 5 ? 'Ảnh bìa chưa có mô tả.' : '', badAlt.length ? `${badAlt.length} ảnh/video trong bài có mô tả quá chung ("${badAlt[0].alt || 'trống'}"). Sửa chữ trong ![…] cho cụ thể.` : ''].filter(Boolean).join(' '));
  add('kw', 'must', !!kw && (seo.kwSource !== 'suggest' || seo.kwConfirmed), 'Từ khoá chính đã xác nhận', !kw ? 'Chưa có từ khoá chính (Cấu hình slot → Thông tin SEO).' : seo.kwSource === 'suggest' && !seo.kwConfirmed ? `"${kw}" là gợi ý, chưa xác nhận.` : '', { fix: kw && seo.kwSource === 'suggest' && !seo.kwConfirmed ? 'confirm-kw' : '' });
  const mi = blogMediaIssues(s, t);
  add('media', 'must', !mi.broken.length, 'Dòng ảnh trong bài trỏ đúng ô ảnh', mi.broken.length ? `${mi.broken.length} dòng ảnh trỏ tới ô không còn (media:${mi.broken[0].bid}).` : '');
  // Chất lượng: chỉ cảnh báo, cộng điểm
  const q = (id, w, ok, label, detail, extra) => add(id, 'quality', ok, label, detail, Object.assign({ w }, extra || {}));
  const h1 = d.h1.length ? d.h1[0].text : '';
  q('kwH1', 12, hasKw(h1, kw), 'Từ khoá có trong tiêu đề H1', kw ? '' : 'Chưa có từ khoá.');
  q('kwTitle', 5, hasKw(seo.seoTitle, kw), 'Từ khoá có trong tiêu đề SEO');
  const intro = d.paras.filter(p => p.line > (d.h1.length ? d.h1[0].line : -1)).slice(0, 2).map(p => p.text).join(' ').split(/\s+/).slice(0, 100).join(' ');
  q('kwIntro', 10, hasKw(intro, kw), 'Từ khoá có trong 100 chữ đầu');
  const kws = [kw].concat(seo.keywords || []).filter(Boolean);
  q('kwHeading', 8, d.headings.some(h => kws.some(k => hasKw(h.text, k))), 'Từ khoá chính hoặc phụ có trong một đề mục');
  const dens = words ? kwCount(plain, kw) * countWords(kw) / words * 100 : 0;
  q('kwDensity', 5, !kw || dens <= cfg.kwDensityMax, `Không nhồi từ khoá (tối đa ${cfg.kwDensityMax}%)`, kw ? `Mật độ ${(Math.round(dens * 10) / 10).toString().replace('.', ',')}%.` : '');
  q('kwMeta', 4, hasKw(seo.metaDesc, kw), 'Từ khoá có trong mô tả');
  q('length', 8, words >= cfg.wordsMin && words <= cfg.wordsMax, `Độ dài ${cfg.wordsMin} đến ${cfg.wordsMax} chữ`, `${words} chữ.`);
  q('h2', 5, d.headings.filter(h => h.level === 2).length >= 2, 'Có ít nhất 2 đề mục H2');
  const longP = d.paras.filter(p => p.kind === 'p' && p.words > cfg.paraMaxWords);
  q('paras', 5, !longP.length, `Đoạn ngắn (tối đa ${cfg.paraMaxWords} chữ)`, longP.length ? `${longP.length} đoạn dài, dài nhất ${Math.max(...longP.map(p => p.words))} chữ.` : '');
  const fh = d.headings[0]; const ans = fh ? d.paras.find(p => p.line > fh.line && p.kind === 'p') : null;
  q('answer', 4, !!ans && ans.words <= cfg.answerMaxWords, 'Câu trả lời ngắn ngay dưới đề mục đầu', ans ? `${ans.words} chữ (nên ≤ ${cfg.answerMaxWords} để Google dễ trích).` : 'Chưa có đề mục.');
  const types = d.links.map(l => linkType(S, s, l.url));
  const inv = blogInventory(S, s.id).length + seo.related.length;
  q('internal', 8, types.filter(x => x === 'internal').length >= cfg.internalMin, `Ít nhất ${cfg.internalMin} link nội bộ`, inv ? '' : 'Kho bài đã đăng còn trống: nhập ở Thiết lập → Chuẩn Blog để có gợi ý.');
  const srcNeed = /Theo [^:\n]{3,60}:/.test(t);
  q('sources', 5, !srcNeed || types.includes('source'), 'Số liệu có link nguồn', srcNeed ? '' : 'Bài không trích nguồn số liệu.', { na: !srcNeed });
  q('cta', 5, !seo.ctaUrl || types.includes('cta'), 'Có link kêu gọi hành động', seo.ctaUrl ? '' : 'Chưa khai báo link CTA trong Thông tin SEO.', { na: !seo.ctaUrl });
  const bad = d.links.filter(l => BAD_ANCHORS.includes(l.anchor.trim().toLowerCase()) || l.anchor.trim().length < 3);
  q('anchors', 4, !bad.length, 'Chữ neo mô tả rõ (không "bấm vào đây")', bad.length ? `"${bad[0].anchor}"` : '');
  const dup = d.links.map(l => urlBase(l.url)).filter((u, i, a) => a.indexOf(u) !== i);
  q('dupLinks', 2, !dup.length, 'Không gắn trùng một link', dup.length ? dup[0] : '');
  q('linkCount', 2, d.links.length <= cfg.linksMax, `Không quá ${cfg.linksMax} link`, `${d.links.length} link.`);
  q('eeat', 5, !!seo.author, 'Có tên tác giả', seo.author ? '' : 'Thêm tác giả ở Thông tin SEO hoặc tác giả mặc định ở Chuẩn Blog.');
  const mine = sentencesSet(t);
  const sib = s.sourceCellId ? S.slots.filter(x => x.id !== s.id && x.sourceCellId === s.sourceCellId && x.text && !isBlogSlot(S, x)) : [];
  const overlap = sib.reduce((mx, x) => { const o = sentencesSet(x.text); const n = [...mine].filter(y => o.has(y)).length; return Math.max(mx, mine.size ? n / mine.size : 0); }, 0);
  q('unique', 5, overlap < 0.3, 'Khác bài mạng xã hội cùng ý', overlap ? `Trùng ${Math.round(overlap * 100)}% câu với bài khác cùng ô nguồn.` : '', { na: !sib.length });
  const conf = keywordConflicts(S, s.id, kw);
  q('cannibal', 5, !conf.length, 'Không trùng từ khoá với bài khác', conf.length ? `Trùng với: ${conf.slice(0, 2).map(c => c.label).join('; ')}` : '');
  q('orphans', 3, !mi.orphans.length, 'Mọi ảnh/video thêm đã chèn vào bài', mi.orphans.length ? `Còn ${mi.orphans.length} ảnh/video chưa được chèn.` : '', { na: !blogMediaAssets(s).length });
  const cv = cover ? cover.versions.find(v => v.n === cover.current) : null;
  q('cover', 3, !!cv && (!cv.src || !cv.w || cv.w >= cfg.coverMinW), `Ảnh bìa rộng từ ${cfg.coverMinW}px`, !cv ? 'Chưa có ảnh bìa.' : cv.src && cv.w && cv.w < cfg.coverMinW ? `Ảnh bìa rộng ${cv.w}px.` : '');
  const must = checks.filter(c => c.group === 'must'); const qs = checks.filter(c => c.group === 'quality' && !c.na);
  const total = qs.reduce((n, c) => n + c.w, 0); const got = qs.reduce((n, c) => n + (c.ok ? c.w : 0), 0);
  return { checks, mustOk: must.every(c => c.ok), mustFail: must.filter(c => !c.ok).length, score: total ? Math.round(got / total * 100) : 0, words, seo };
}

// ---- Markdown → HTML sạch (không class, không style) ----
const escHtml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inlineHtml(t) {
  const links = []; let x = String(t).replace(LINK_RX, (all, pre, a, u) => { links.push([a, u]); return `${pre}\u0001${links.length - 1}\u0002`; });
  x = escHtml(x).replace(/\*\*(?=\S)([^*]+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\p{L}\p{N}])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\p{L}\p{N}])/gu, '$1<em>$2</em>').replace(/(^|[^\p{L}\p{N}_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>');
  return x.replace(/\u0001(\d+)\u0002/g, (_, i) => { const [a, u] = links[+i]; return `<a href="${escHtml(u)}">${inlineHtml(a)}</a>`; });
}
function mdToHtml(md, opts) {
  const o = opts || {}; const out = []; let list = '';
  const close = () => { if (list) { out.push(`</${list}>`); list = ''; } };
  String(md || '').split('\n').forEach(raw => {
    const l = raw.trim(); if (!l) { close(); return; } let m;
    if ((m = MEDIA_LINE.exec(l))) {
      close(); const r = o.media ? o.media(m[2]) : null; if (!r) return;
      const alt = escHtml(m[1].trim()), cap = (m[3] || '').trim();
      const el = r.kind === 'video' ? `<video controls preload="metadata" src="${escHtml(r.src)}"${r.poster ? ` poster="${escHtml(r.poster)}"` : ''} aria-label="${alt}"></video>` : `<img src="${escHtml(r.src)}" alt="${alt}"${r.w ? ` width="${r.w}"` : ''}${r.h ? ` height="${r.h}"` : ''} loading="lazy">`;
      out.push(`<figure>${el}${cap ? `<figcaption>${inlineHtml(cap)}</figcaption>` : ''}</figure>`); return;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { close(); if (m[1].length === 1 && o.skipH1) return; out.push(`<h${m[1].length}>${inlineHtml(m[2])}</h${m[1].length}>`); return; }
    if ((m = /^>\s?(.*)$/.exec(l))) { close(); out.push(`<blockquote><p>${inlineHtml(m[1])}</p></blockquote>`); return; }
    if ((m = /^(?:[-*•])\s+(.*)$/.exec(l)) || (m = /^\d+[.)]\s+(.*)$/.exec(l))) {
      const k = /^\d/.test(l) ? 'ol' : 'ul'; if (list !== k) { close(); out.push(`<${k}>`); list = k; }
      out.push(`<li>${inlineHtml(m[1])}</li>`); return;
    }
    close(); out.push(`<p>${inlineHtml(l)}</p>`);
  });
  close();
  return out.join('\n');
}

// ---- Gói bài (JSON + Markdown + HTML + tệp ảnh) cho web ----
function slotPublishAt(s) { return `${s.date}T${s.time}:00+07:00`; }
function blogPackage(S, s, opts) {
  const o = Object.assign({ inline: false, media: 'images' }, opts || {});
  if (!s || !s.text) return { ok: false, error: 'Slot chưa có bài.' };
  const cfg = blogSeoOf(S); const seo = slotSeoOf(s); const slug = seo.slug || vnSlug(blogH1(s.text) || s.id);
  const files = []; const mediaOut = [];
  const pick = (a, path) => {
    const v = a.versions.find(x => x.n === a.current); if (!v) return null;
    const ext = versionExt(v); const file = `${path}.${ext}`;
    const isVid = v.kind === 'video';
    const bytes = v.src ? dataUrlBytes(v.src) : utf8Bytes(mockImageSvg(v, a.name, assetRatioFor(S, s, a)));
    files.push({ path: file, bytes });
    const inline = o.inline && (!isVid || o.media === 'all') && o.media !== 'none';
    const src = inline ? (v.src || `data:image/svg+xml;base64,${bytesToB64(utf8Bytes(mockImageSvg(v, a.name, assetRatioFor(S, s, a))))}`) : file;
    return { kind: isVid ? 'video' : 'image', file, src, w: v.w || (v.src ? 0 : (FRAME_RATIOS[assetRatioFor(S, s, a)] || [1200, 800])[0]), h: v.h || (v.src ? 0 : (FRAME_RATIOS[assetRatioFor(S, s, a)] || [1200, 800])[1]), simulated: !v.src, poster: v.cover ? v.cover.src : '' };
  };
  const coverA = (s.assets || []).find(a => !a.blog);
  const cover = coverA ? pick(coverA, 'cover') : null;
  const map = {};
  blogMediaAssets(s).forEach(({ a }) => { const r = pick(a, `media/${a.bid}`); if (r) { map[a.bid] = r; } });
  const d = blogDoc(s.text);
  d.media.forEach(m => { const r = map[m.bid]; if (r) mediaOut.push({ id: m.bid, kind: r.kind, file: r.file, src: o.inline ? r.src : undefined, alt: m.alt, caption: m.cap, width: r.w || undefined, height: r.h || undefined, simulated: r.simulated || undefined }); });
  const body = String(s.text).split('\n').filter(l => !/^#\s+/.test(l.trim())).join('\n').replace(/^\n+/, '');
  const resolve = bid => map[bid] ? { kind: map[bid].kind, src: o.inline ? map[bid].src : map[bid].file, w: map[bid].w, h: map[bid].h } : null;
  const bodyMarkdown = body.split('\n').map(l => { const m = MEDIA_LINE.exec(l.trim()); if (!m) return l; const r = map[m[2]]; return r ? `![${m[1]}](${o.inline ? r.src : r.file}${m[3] ? ` "${m[3]}"` : ''})` : ''; }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const bodyHtml = mdToHtml(body, { media: resolve, skipH1: true });
  const title = blogH1(s.text);
  const canonical = cfg.siteUrl ? `${cfg.siteUrl}${cfg.blogPath}${slug}` : '';
  const links = d.links.map(l => ({ anchor: l.anchor, url: l.url, type: linkType(S, s, l.url) }));
  const jsonLd = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: seo.seoTitle || title, description: seo.metaDesc, datePublished: slotPublishAt(s), dateModified: `${S.settings.demoNow}:00+07:00`,
    author: seo.author ? { '@type': 'Person', name: seo.author } : undefined, keywords: [seo.keyword].concat(seo.keywords || []).filter(Boolean).join(', ') || undefined,
    image: cover ? [canonical && !o.inline ? `${cfg.siteUrl}${cfg.blogPath}${slug}/${cover.file}` : cover.file] : undefined, mainEntityOfPage: canonical || undefined,
    publisher: S.brand.parsed && S.brand.parsed.name ? { '@type': 'Organization', name: S.brand.parsed.name } : undefined };
  const post = { schema: 'autocontent.blog/1', id: s.id, slug, title, seoTitle: seo.seoTitle, metaDescription: seo.metaDesc, excerpt: seo.excerpt,
    keyword: seo.keyword, keywords: seo.keywords, searchIntent: seo.intent, author: seo.author, category: seo.category, tags: seo.tags,
    publishAt: slotPublishAt(s), updatedAt: `${S.settings.demoNow}:00+07:00`, canonical,
    cover: cover ? { file: cover.file, src: o.inline ? cover.src : undefined, alt: seo.coverAlt, width: cover.w || undefined, height: cover.h || undefined, simulated: cover.simulated || undefined } : null,
    media: mediaOut, links, cta: seo.ctaUrl ? { url: utmUrl(seo.ctaUrl, cfg, slug), text: seo.ctaText } : null,
    bodyMarkdown, bodyHtml, jsonLd: JSON.parse(JSON.stringify(jsonLd)) };
  const fm = ['---', `title: ${JSON.stringify(title)}`, `seo_title: ${JSON.stringify(seo.seoTitle)}`, `description: ${JSON.stringify(seo.metaDesc)}`, `slug: ${slug}`, `date: ${slotPublishAt(s)}`,
    seo.author ? `author: ${JSON.stringify(seo.author)}` : null, seo.category ? `category: ${JSON.stringify(seo.category)}` : null, seo.tags.length ? `tags: [${seo.tags.map(x => JSON.stringify(x)).join(', ')}]` : null,
    seo.keyword ? `keyword: ${JSON.stringify(seo.keyword)}` : null, cover ? `cover: ${cover.file}` : null, cover ? `cover_alt: ${JSON.stringify(seo.coverAlt)}` : null, canonical ? `canonical: ${canonical}` : null, '---'].filter(x => x != null).join('\n');
  const md = `${fm}\n\n# ${title}\n\n${bodyMarkdown}\n`;
  const jsonText = JSON.stringify(post, null, 2) + '\n';
  files.push({ path: 'post.json', bytes: utf8Bytes(jsonText) }, { path: 'post.md', bytes: utf8Bytes(md) }, { path: 'post.html', bytes: utf8Bytes(bodyHtml + '\n') });
  return { ok: true, slug, post, jsonText, md, html: bodyHtml, files };
}
function bytesToB64(bytes) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + (i + 1 < bytes.length ? A[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? A[n & 63] : '=');
  }
  return out;
}

// ---- Kho bài đã đăng (nhập CSV hoặc sitemap.xml) ----
function csvRows(text) {
  const t = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n'); const first = t.split('\n')[0] || '';
  const delim = [',', ';', '\t'].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}
function titleFromUrl(u) { const seg = String(u).replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() || ''; const t = decodeURIComponent(seg).replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : u; }
function parsePostsCsv(text) {
  const rows = csvRows(text); if (!rows.length) return { ok: false, error: 'Tệp trống.' };
  const h = rows[0].map(x => fold(x));
  const col = names => h.findIndex(x => names.some(n => x === n || x.startsWith(n)));
  const hasHead = col(['url', 'link', 'duong dan']) >= 0;
  const iu = hasHead ? col(['url', 'link', 'duong dan']) : 0, it = hasHead ? col(['title', 'tieu de', 'ten bai']) : 1, ik = hasHead ? col(['keyword', 'tu khoa']) : 2;
  const posts = []; const bad = [];
  rows.slice(hasHead ? 1 : 0).forEach((r, i) => {
    const url = (r[iu] || '').trim();
    if (!isValidUrl(url) && !/^\/\S+$/.test(url)) { bad.push(i + (hasHead ? 2 : 1)); return; }
    posts.push({ url, title: (it >= 0 && r[it]) || titleFromUrl(url), keyword: (ik >= 0 && r[ik]) || '' });
  });
  return posts.length ? { ok: true, posts, bad } : { ok: false, error: 'Không có dòng nào có link hợp lệ (cột url).', bad };
}
function parseSitemap(xml) {
  const t = String(xml || ''); if (!/<(urlset|sitemapindex)[\s>]/i.test(t)) return { ok: false, error: 'Không phải tệp sitemap.xml.' };
  const index = /<sitemapindex[\s>]/i.test(t); const un = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
  const items = []; const re = /<(url|sitemap)>([\s\S]*?)<\/\1>/gi; let m;
  while ((m = re.exec(t))) { const loc = /<loc>([\s\S]*?)<\/loc>/i.exec(m[2]); const lm = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(m[2]); if (loc) items.push({ url: un(loc[1]), lastmod: lm ? un(lm[1]) : '' }); }
  if (index) return { ok: true, index: true, sitemaps: items.map(x => x.url), posts: [] };
  return { ok: true, index: false, posts: items.filter(x => isValidUrl(x.url)).map(x => ({ url: x.url, title: titleFromUrl(x.url), keyword: '', lastmod: x.lastmod })) };
}
function importBlogPosts(S, list, source) {
  if (!Array.isArray(S.blogPosts)) S.blogPosts = [];
  let added = 0, updated = 0;
  (list || []).forEach(p => {
    const have = S.blogPosts.find(x => urlBase(x.url) === urlBase(p.url));
    const slug = vnSlug(String(p.url).replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() || '', 90);
    if (have) { if (p.title && p.title !== have.title) have.title = p.title; if (p.keyword) have.keyword = p.keyword; if (p.lastmod) have.lastmod = p.lastmod; updated++; }
    else { S.blogPosts.push({ id: nextId(S, 'bp'), url: p.url, title: p.title || titleFromUrl(p.url), keyword: p.keyword || '', slug, lastmod: p.lastmod || '', source: source || 'csv', addedAt: S.settings.demoNow }); added++; }
  });
  log(S, 'import', 'blogPosts', source || 'csv', `${added} thêm, ${updated} cập nhật`);
  return { ok: true, added, updated, total: S.blogPosts.length };
}
function updateBlogPost(S, id, patch) {
  const p = (S.blogPosts || []).find(x => x.id === id); if (!p) return { ok: false, error: 'Không tìm thấy bài.' };
  if (patch.title !== undefined) p.title = String(patch.title).trim() || p.title;
  if (patch.keyword !== undefined) p.keyword = String(patch.keyword).trim();
  return { ok: true };
}
function removeBlogPost(S, id) { const n = (S.blogPosts || []).length; S.blogPosts = (S.blogPosts || []).filter(x => x.id !== id); return { ok: S.blogPosts.length < n }; }
// Kho = bài nhập vào + bài Blog đã đăng/đã gửi lên web từ app (có link)
function blogInventory(S, exceptSlotId) {
  const own = S.slots.filter(s => s.id !== exceptSlotId && isBlogSlot(S, s) && ((s.pub && s.pub.url) || (s.webPost && s.webPost.url)))
    .map(s => ({ id: s.id, url: (s.webPost && s.webPost.url) || s.pub.url, title: blogH1(s.text), keyword: s.seo ? s.seo.keyword : '', slug: s.seo ? s.seo.slug : '', source: 'app' }));
  const ext = (S.blogPosts || []).filter(p => !own.some(o => urlBase(o.url) === urlBase(p.url)));
  return own.concat(ext);
}

// ---- Đăng lên web qua API (mục 10.40): web nhận POST JSON kèm token; web tự lên lịch theo publishAt ----
const BLOG_API_DEFAULT = { on: false, endpoint: '', authHeader: 'Authorization', authScheme: 'Bearer', status: 'scheduled', media: 'images' };
const BLOG_API_STATUS = { draft: 'Bản nháp (người duyệt trên web)', scheduled: 'Lên lịch theo giờ của slot', publish: 'Đăng ngay' };
function blogApiOf(S) { return Object.assign({}, BLOG_API_DEFAULT, S.blogApi || {}); }
function setBlogApi(S, patch) {
  const c = Object.assign(blogApiOf(S), {});
  if (patch.endpoint !== undefined) c.endpoint = String(patch.endpoint || '').trim();
  if (patch.authHeader !== undefined) c.authHeader = String(patch.authHeader || '').trim() || 'Authorization';
  if (patch.authScheme !== undefined) c.authScheme = String(patch.authScheme || '').trim();
  if (patch.status !== undefined) { if (!BLOG_API_STATUS[patch.status]) return { ok: false, error: 'Chế độ đăng không hợp lệ.' }; c.status = patch.status; }
  if (patch.media !== undefined) { if (!['none', 'images', 'all'].includes(patch.media)) return { ok: false, error: 'Cách gửi ảnh không hợp lệ.' }; c.media = patch.media; }
  if (patch.on !== undefined) c.on = !!patch.on;
  if (c.endpoint && !/^https:\/\/\S+$/i.test(c.endpoint) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/\S*)?$/i.test(c.endpoint)) return { ok: false, error: 'Địa chỉ API phải là https:// (hoặc http://localhost khi thử trên máy).' };
  if (c.on && !c.endpoint) return { ok: false, error: 'Nhập địa chỉ API trước khi bật.' };
  if (!/^[A-Za-z0-9-]+$/.test(c.authHeader)) return { ok: false, error: 'Tên header xác thực chỉ gồm chữ, số, gạch nối.' };
  S.blogApi = c; log(S, 'update', 'blogApi', c.on ? 'on' : 'off');
  return { ok: true, api: c };
}
function buildBlogPostRequest(cfg, token, payload, test) {
  if (!cfg.endpoint) return { ok: false, error: 'Chưa nhập địa chỉ API của web (Thiết lập → Chuẩn Blog).' };
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers[cfg.authHeader || 'Authorization'] = cfg.authScheme ? `${cfg.authScheme} ${token}` : token;
  const json = test ? { schema: 'autocontent.blog/1', test: true } : Object.assign({}, payload, { status: cfg.status });
  return { ok: true, url: cfg.endpoint, headers, json };
}
function parseBlogPostResponse(status, body) {
  const b = body || {};
  if (status >= 200 && status < 300) {
    const url = b.url || b.link || b.permalink || (b.data && (b.data.url || b.data.link)) || '';
    return { ok: true, url: isValidUrl(url) ? url : '', id: b.id != null ? String(b.id) : (b.data && b.data.id != null ? String(b.data.id) : ''), status: b.status || '', test: !!b.test };
  }
  const msg = b.error && (b.error.message || b.error) || b.message || '';
  const why = status === 401 || status === 403 ? 'Token không đúng hoặc không có quyền' : status === 404 ? 'Sai địa chỉ API' : status === 409 ? 'Slug đã có trên web' : status === 413 ? 'Bài hoặc ảnh quá lớn với máy chủ web' : status === 422 || status === 400 ? 'Web từ chối dữ liệu' : status >= 500 ? 'Máy chủ web lỗi' : 'Không đăng được';
  return { ok: false, error: `${why} (mã ${status})${msg ? `: ${String(msg).slice(0, 160)}` : ''}.` };
}
function blogPostGate(S, s) {
  if (!s || !isBlogSlot(S, s)) return { ok: false, reason: 'Chỉ slot Blog.' };
  if (!s.text) return { ok: false, reason: 'Slot chưa có bài.' };
  const api = blogApiOf(S);
  if (!api.on || !api.endpoint) return { ok: false, reason: 'Chưa bật đăng qua API (Thiết lập → Chuẩn Blog).' };
  if (s.state !== 'APPROVED' && s.state !== 'PUBLISHED') return { ok: false, reason: 'Duyệt slot trước khi gửi lên web.' };
  const a = seoAudit(S, s); if (!a.mustOk) return { ok: false, reason: `Còn ${a.mustFail} mục bắt buộc SEO chưa đạt.` };
  return { ok: true, reason: '' };
}
// Ghi nhận kết quả gửi lên web; tới giờ đăng (hoặc đăng ngay) thì slot thành Đã đăng với link thật
function recordWebPost(S, slotId, res) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  const api = blogApiOf(S);
  s.webPost = { at: S.settings.demoNow, url: res.url || '', id: res.id || '', status: res.status || api.status, endpoint: api.endpoint };
  log(S, 'web-post', 'slot', slotId, res.url || res.id || '');
  const w = weekOf(S, s.weekId);
  const due = api.status === 'publish' || slotTs(s) <= S.settings.demoNow;
  if (s.state === 'APPROVED' && due && api.status !== 'draft' && w && w.revision >= 1) publishNow(S, s, 'auto', api.status === 'publish' ? S.settings.demoNow : slotTs(s) > S.settings.demoNow ? S.settings.demoNow : slotTs(s), { url: res.url || '', simulated: false, via: 'api' });
  return { ok: true, published: s.state === 'PUBLISHED' };
}
// Hợp đồng API cho lập trình viên web (tệp Markdown)
function blogApiDoc(S) {
  const cfg = blogSeoOf(S); const api = blogApiOf(S);
  return `# API nhận bài Blog từ AutoContent

AutoContent gửi mỗi bài Blog đã duyệt tới web bằng một yêu cầu HTTP. Web lưu bài, tự lên lịch theo \`publishAt\`, và trả lại link bài.

## Yêu cầu

- Phương thức: \`POST\`
- Địa chỉ: ${api.endpoint ? `\`${api.endpoint}\`` : 'do web cung cấp (https)'}
- Header: \`Content-Type: application/json\`, \`${api.authHeader || 'Authorization'}: ${api.authScheme ? api.authScheme + ' ' : ''}<token>\`
- Web phải cho phép trình duyệt gọi trực tiếp (CORS): trả \`Access-Control-Allow-Origin\` và cho phép header \`Content-Type\`, \`${api.authHeader || 'Authorization'}\`, phương thức \`POST, OPTIONS\`.
- Nút "Thử kết nối" gửi \`{"schema": "autocontent.blog/1", "test": true}\`: web chỉ kiểm tra token rồi trả \`200 {"ok": true, "test": true}\`, không tạo bài.

## Thân yêu cầu (JSON)

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| schema | chuỗi | Luôn là \`autocontent.blog/1\` |
| id | chuỗi | Mã slot trong AutoContent; gửi lại cùng id nghĩa là cập nhật bài cũ |
| status | chuỗi | \`draft\` (chờ duyệt trên web), \`scheduled\` (đăng lúc publishAt), \`publish\` (đăng ngay) |
| slug | chuỗi | Đường dẫn bài, không dấu, gạch nối; web nên báo 409 nếu trùng bài khác |
| title | chuỗi | Tiêu đề hiện trên trang (thẻ H1); thân bài không có H1 |
| seoTitle | chuỗi | Nội dung thẻ \`<title>\` (tối đa ${cfg.titleMax} ký tự) |
| metaDescription | chuỗi | Thẻ \`<meta name="description">\` (${cfg.descMin} đến ${cfg.descMax} ký tự) |
| excerpt | chuỗi | Tóm tắt cho trang danh sách bài |
| keyword, keywords | chuỗi, mảng | Từ khoá chính, phụ (tham khảo, không cần in ra trang) |
| searchIntent | chuỗi | info, howto, compare, buy |
| author, category, tags | chuỗi, chuỗi, mảng | Tác giả, chuyên mục, thẻ |
| publishAt, updatedAt | chuỗi ISO 8601 | Giờ đăng và giờ cập nhật, múi giờ +07:00 |
| canonical | chuỗi | Link chuẩn của bài (rỗng nếu chưa khai báo địa chỉ web) |
| cover | đối tượng | \`{file, src, alt, width, height}\`: ảnh bìa; \`src\` là data URL khi gửi kèm ảnh |
| media | mảng | Ảnh/video trong bài \`{id, kind, file, src, alt, caption}\`; thân bài đã trỏ tới \`src\` hoặc \`file\` |
| links | mảng | Các link trong bài \`{anchor, url, type: internal, source, cta}\` |
| cta | đối tượng | \`{url, text}\`: link kêu gọi hành động đã có UTM |
| bodyMarkdown | chuỗi | Thân bài Markdown (không có H1) |
| bodyHtml | chuỗi | Thân bài HTML sạch: chỉ h2–h6, p, ul, ol, li, strong, em, a, blockquote, figure, img, video, figcaption; không class, không style |
| jsonLd | đối tượng | Dữ liệu cấu trúc BlogPosting: in nguyên vào \`<script type="application/ld+json">\` |

Ảnh và video: ${api.media === 'none' ? 'không gửi kèm; web lấy từ gói xuất (thư mục media/).' : api.media === 'all' ? 'gửi kèm cả ảnh và video dưới dạng data URL trong trường src.' : 'ảnh gửi kèm dạng data URL trong trường src; video không gửi kèm (dung lượng lớn), web tải từ gói xuất.'} Web nên lưu tệp về kho ảnh của mình rồi thay \`src\` trong bodyHtml bằng link thật.

## Trả lời

- Thành công: \`200\` hoặc \`201\` với \`{"id": "...", "url": "https://.../blog/slug", "status": "scheduled"}\`. AutoContent lưu \`url\` làm link bài để đo số liệu.
- Lỗi: \`400/422\` dữ liệu sai, \`401/403\` token sai, \`409\` trùng slug, \`413\` quá lớn, \`5xx\` lỗi máy chủ; kèm \`{"error": "lý do"}\`.

## Việc web cần làm để đạt chuẩn SEO

1. Render HTML phía máy chủ (không chỉ dựng bằng JavaScript), mỗi bài một URL \`${cfg.blogPath}<slug>\`.
2. In \`seoTitle\` vào \`<title>\`, \`metaDescription\` vào meta description, thẻ \`<link rel="canonical">\`, thẻ Open Graph (og:title, og:description, og:image = ảnh bìa), và \`jsonLd\`.
3. Đúng một H1 là \`title\`; thân bài lấy từ \`bodyHtml\`; áp CSS của web cho các thẻ trong thân bài.
4. Ảnh có \`alt\`, có kích thước, tải chậm (\`loading="lazy"\`); ảnh bìa rộng từ ${cfg.coverMinW}px.
5. Cập nhật \`sitemap.xml\` khi có bài mới; đổi slug thì chuyển hướng 301 từ link cũ.
6. Trang nhanh và hiển thị tốt trên điện thoại.
`;
}
// Lời nhắn thêm cho AI khi viết bài Blog: viết theo Thông tin SEO của slot và Chuẩn Blog
function blogAiBrief(S, s) {
  const cfg = blogSeoOf(S); const seo = slotSeoOf(s);
  return ['# Chuẩn SEO cho bài Blog',
    seo.keyword ? `Từ khoá chính: "${seo.keyword}"${seo.kwSource === 'suggest' ? ' (gợi ý, có thể chỉnh cho tự nhiên)' : ''}. Đặt trong dòng "# Tiêu đề", trong 100 chữ đầu và trong một đề mục "##"; viết tự nhiên, không nhồi (tối đa ${cfg.kwDensityMax}% số chữ).` : 'Chưa có từ khoá: chọn một cụm 2–5 chữ người đọc hay tìm, đặt trong tiêu đề và mở bài.',
    seo.keywords.length ? `Từ khoá phụ (dùng tự nhiên, có thể trong đề mục): ${seo.keywords.join(', ')}.` : '',
    `Ý định tìm kiếm: ${BLOG_INTENTS[seo.intent] || BLOG_INTENTS.info}. Độ dài ${cfg.wordsMin}–${cfg.wordsMax} chữ.`,
    `Định dạng bắt buộc: đúng một dòng "# Tiêu đề"; các phần "## …", ý con "### …", không nhảy cấp; đoạn ngắn (tối đa ${cfg.paraMaxWords} chữ); ngay dưới đề mục "##" đầu tiên là một câu trả lời trực tiếp (tối đa ${cfg.answerMaxWords} chữ). Được dùng danh sách "- " hoặc "1. ", **đậm**, *nghiêng*, "> " trích dẫn. Không nhãn trong ngoặc vuông, không "Slide", không hashtag, không bảng, không HTML.`,
    'Giữ nguyên mọi dòng dạng ![…](media:…) nếu bài nháp có. Câu có số liệu ghi rõ "Theo <tên nguồn>:".',
    'Bài Blog phải khác bài mạng xã hội cùng ý: viết sâu hơn, có ví dụ, không chép nguyên câu.',
    `Trong JSON trả lời, thêm trường "seo": {"seoTitle": "tối đa ${cfg.titleMax} ký tự, có từ khoá", "metaDescription": "${cfg.descMin}–${cfg.descMax} ký tự, có từ khoá", "excerpt": "tóm tắt 1–2 câu", "coverAlt": "mô tả ảnh bìa cụ thể"}.`,
  ].filter(Boolean).join('\n');
}
