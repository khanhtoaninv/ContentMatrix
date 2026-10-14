// ---------- 03 · Quy tắc cứng (ứng dụng tính, chỉ cảnh báo — D77) ----------
import { countWords, fold, foldWithMap, labelOf, splitSentences } from './01-util.js';
export const RULE_NAMES = {
  'HR-01': 'Độ dài', 'HR-02': 'Cụm từ cấm', 'HR-03': 'CTA', 'HR-04': 'Cấu trúc',
  'HR-05': 'Số liệu mới', 'HR-06': 'Giới hạn kênh', 'HR-07': 'Từ cường điệu', 'HR-08': 'Xưng hô', 'HR-10': 'Ngoài Topic', 'HR-11': 'Lặp giữa ô', 'HR-12': 'Dẫn bài khác', 'HR-13': 'Trình bày', 'TPC-W': 'Topic',
};
const CTA_WORDS = ['đăng ký', 'dang ky', 'inbox', 'nhắn', 'bình luận', 'comment', 'học thử', 'lưu lại', 'lưu bài',
  'chia sẻ', 'thử ngay', 'thử câu', 'thử cách', 'theo dõi', 'follow', 'link', 'để lại', 'kể mình nghe', 'trả lời', 'bấm', 'tag'];
const REF_PHRASES = ['hôm qua', 'bài trước', 'phần trước', 'tập trước', 'kỳ trước', 'như mình đã nói', 'ở bài sau', 'bài tiếp theo'];
export const DEFAULT_HYPE = ['100%', 'chắc chắn', 'cam kết', 'đảm bảo', 'tuyệt đối'];

function stripLabels(text) {
  return String(text || '')
    .replace(/^\s*(?:\[[^\]]*\]|##\s+.*)\s*$/gm, '')
    .replace(/^\s*Slide\s*\d+\s*[:·.-]\s*/gim, '')
    .replace(/\b(Bước|bước|Slide|slide)\s*\d+/g, '');
}
export function extractNumbers(text) {
  const t = stripLabels(text).replace(/#\S+/g, '');
  const out = [];
  const re = /\d+(?:[.,]\d+)?\s?%?/g; let m;
  while ((m = re.exec(t))) out.push(m[0].replace(/\s/g, '').replace(',', '.'));
  return out;
}
export function paragraphsOf(text) {
  return String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
}
export function slidesOf(text) {
  const parts = String(text || '').split(/^\s*Slide\s*\d+\s*[:·.-]\s*/gim);
  return parts.slice(1).map(s => s.trim());
}
export function hashtagsOf(text) { return (String(text || '').match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length; }
function hasCta(text, type) {
  const paras = paragraphsOf(stripLabels(text));
  const tail = (paras.slice(-2).join(' ') || String(text || ''));
  if (type === 'question') return /\?/.test(tail);
  const f = fold(tail);
  return CTA_WORDS.some(w => f.includes(fold(w)));
}
function findPhrase(text, phrase) {
  const { out, map } = foldWithMap(text);
  const p = fold(phrase).trim(); if (!p) return [];
  const ranges = []; let i = out.indexOf(p);
  while (i >= 0) { ranges.push([map[i], map[i + p.length - 1] + 1]); i = out.indexOf(p, i + p.length); }
  return ranges;
}
// Như findPhrase nhưng chỉ khớp trọn từ (không khớp "nợ bài sau" với "ở bài sau")
function findWord(text, phrase) {
  const s = String(text || '');
  return findPhrase(s, phrase).filter(([a, b]) => !/[\p{L}\p{N}]/u.test(s[a - 1] || ' ') && !/[\p{L}\p{N}]/u.test(s[b] || ' '));
}
export function lengthOf(text, unit) {
  return unit === 'words' ? countWords(stripLabels(text)) : String(text || '').trim().replace(/\s+/g, ' ').length; // ký tự: khoảng trắng liền nhau (xuống dòng, dòng trống) tính là một
}

function checkStructure(text, structure, layout) {
  if (!structure || !structure.length) return [];
  if (layout === 'carousel') return []; // slide được kiểm ở HR-06
  if (layout === 'labeled' || layout === 'script' || layout === 'longscript') {
    const labels = String(text).split('\n').map(labelOf).filter(Boolean).map(l => fold(l.split('·')[0].trim()));
    return structure.filter(p => !labels.some(l => l.startsWith(fold(p))));
  }
  // bài đăng thường: đủ số đoạn
  const paras = paragraphsOf(text).filter(p => !/^#[^\s#]/.test(p)); // bỏ dòng hashtag, giữ đề mục Markdown
  return paras.length >= structure.length ? [] : structure.slice(paras.length);
}

/**
 * ctx: { kind:'cell'|'slot', rules, structure, layout, channel, banned[], hypeWords[], pronouns, sourceNumbers[], verifiedFacts[] }
 * Trả về danh sách cảnh báo {id, level:'error'|'note', text, ranges}
 */
export function checkRules(text, ctx) {
  const w = []; const r = ctx.rules || {}; const t = String(text || '');
  const unit = r.lengthUnit === 'words' ? 'words' : 'chars';
  const unitName = unit === 'words' ? 'chữ' : 'ký tự';
  // HR-01
  if (ctx.layout !== 'carousel' && (r.min || r.max)) {
    const len = lengthOf(t, unit);
    if (r.min && len < r.min) w.push({ id: 'HR-01', level: 'error', text: `Ngắn: ${len} ${unitName}, cần tối thiểu ${r.min}.` });
    if (r.max && len > r.max) w.push({ id: 'HR-01', level: 'error', text: `Dài: ${len} ${unitName}, tối đa ${r.max}.` });
  }
  // HR-02
  const banned = [...(ctx.banned || []), ...((r.extraBanned) || [])];
  banned.forEach(ph => {
    const ranges = findPhrase(t, ph);
    if (ranges.length) w.push({ id: 'HR-02', level: 'error', text: `Có cụm từ cấm "${ph}"${ranges.length > 1 ? ` (${ranges.length} lần)` : ''}.`, ranges });
  });
  // HR-03
  if (r.requireCta && !hasCta(t, r.ctaType)) w.push({ id: 'HR-03', level: 'error', text: r.ctaType === 'question' ? 'Thiếu câu hỏi mời trả lời ở cuối.' : 'Thiếu lời kêu gọi hành động (CTA) ở cuối.' });
  // HR-04
  const missing = checkStructure(t, ctx.structure, ctx.layout);
  if (missing.length) w.push({ id: 'HR-04', level: 'error', text: `Thiếu đoạn: ${missing.join(', ')}.` });
  // HR-10: số liệu trong ô không thấy trong Topic của hàng (D99). Chỉ nhắc; số nguyên 1–10 không kèm % được bỏ qua.
  if (ctx.kind === 'cell' && ctx.topicNumbers) {
    const allowed = new Set([...ctx.topicNumbers, ...extractNumbers((ctx.verifiedFacts || []).join(' '))]);
    const extra = [...new Set(extractNumbers(t))].filter(n => !allowed.has(n) && !/^(?:[1-9]|10)$/.test(n));
    if (extra.length) w.push({ id: 'HR-10', level: 'note', text: `Số liệu không thấy trong Topic: ${extra.join(', ')}.` });
  }
  // HR-11: một câu ≥ 40 ký tự trùng nguyên văn với ô của Topic khác
  if (ctx.kind === 'cell' && ctx.otherCellTexts && ctx.otherCellTexts.length) {
    const noCta = x => { let cta = false; return String(x || '').split('\n').filter(l => { const lb = labelOf(l); if (lb) cta = /^CTA/i.test(lb); return !cta; }).join('\n'); }; // CTA là câu chuẩn của thương hiệu, không tính lặp
    const others = ctx.otherCellTexts.map(x => fold(stripLabels(noCta(x))).replace(/\s+/g, ' '));
    const dup = splitSentences(stripLabels(noCta(t))).filter(s => s.length >= 40 && others.some(o => o.includes(fold(s).replace(/\s+/g, ' '))));
    if (dup.length) w.push({ id: 'HR-11', level: 'note', text: `${dup.length} câu trùng nguyên văn với ô của Topic khác (ví dụ: "${dup[0].slice(0, 60)}${dup[0].length > 60 ? '…' : ''}").` });
  }
  // HR-12: dẫn sang bài khác — mỗi bài phải tự đứng được
  const refHits = [];
  REF_PHRASES.forEach(ph => { const rg = findWord(t, ph); if (rg.length) refHits.push({ ph, rg }); });
  if (refHits.length) w.push({ id: 'HR-12', level: 'note', text: `Bài dẫn sang bài khác (${refHits.map(h => `"${h.ph}"`).join(', ')}); mỗi bài nên tự đứng được.`, ranges: refHits.flatMap(h => h.rg) });
  if (ctx.kind === 'slot') {
    // HR-05
    const allowed = new Set([...(ctx.sourceNumbers || []), ...extractNumbers((ctx.verifiedFacts || []).join(' '))]);
    const extra = [...new Set(extractNumbers(t))].filter(n => !allowed.has(n));
    if (extra.length) w.push({ id: 'HR-05', level: 'error', text: `Có số liệu không có trong ô nguồn: ${extra.join(', ')}.` });
    // HR-06
    const ch = ctx.channel || {};
    const tagMax = Math.min(r.hashtagMax ?? Infinity, ch.maxHashtags ?? Infinity);
    const tags = hashtagsOf(t);
    if (isFinite(tagMax) && tags > tagMax) w.push({ id: 'HR-06', level: 'error', text: `${tags} hashtag, tối đa ${tagMax}.` });
    if (ch.maxChars && t.trim().length > ch.maxChars) w.push({ id: 'HR-06', level: 'error', text: `Vượt giới hạn kênh ${ch.maxChars} ký tự.` });
    if (ctx.layout === 'carousel') {
      const slides = slidesOf(t); const nSlide = ctx.slideCount == null ? slides.length : ctx.slideCount; // slot tự do đếm theo số ô có ảnh (M-11)
      if (r.slideMin && nSlide < r.slideMin) w.push({ id: 'HR-06', level: 'error', text: `${nSlide} ${ctx.slideCount == null ? 'slide' : 'ảnh'}, cần tối thiểu ${r.slideMin}.` });
      if (r.slideMax && nSlide > r.slideMax) w.push({ id: 'HR-06', level: 'error', text: `${nSlide} ${ctx.slideCount == null ? 'slide' : 'ảnh'}, tối đa ${r.slideMax}.` });
      if (r.wordsPerSlideMax) slides.forEach((s, i) => {
        const n = countWords(s);
        if (n > r.wordsPerSlideMax) w.push({ id: 'HR-06', level: 'error', text: `Slide ${i + 1} có ${n} chữ, tối đa ${r.wordsPerSlideMax}.` });
      });
    }
  }
  // HR-07
  const hypeHits = [];
  (ctx.hypeWords || DEFAULT_HYPE).forEach(hw => {
    if (banned.some(b => fold(b).includes(fold(hw)) && findPhrase(t, b).length)) return; // đã báo ở HR-02
    const ranges = findPhrase(t, hw); if (ranges.length) hypeHits.push({ hw, ranges });
  });
  if (hypeHits.length) w.push({ id: 'HR-07', level: 'note', text: `Từ cường điệu: ${hypeHits.map(h => `"${h.hw}"`).join(', ')}.`, ranges: hypeHits.flatMap(h => h.ranges) });
  // HR-08
  const pr = fold(ctx.pronouns || '');
  if (pr.includes('minh') && pr.includes('ban')) {
    // so khớp giữ dấu: "tối" (buổi tối) không phải "tôi"
    const lower = ' ' + stripLabels(t).normalize('NFC').toLowerCase().replace(/[.,!?;:"'()\[\]…\n]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const bad = ['tôi', 'chúng tôi', 'quý khách', 'anh chị', 'các em'].filter(x => lower.includes(` ${x} `));
    if (bad.length) w.push({ id: 'HR-08', level: 'note', text: `Xưng hô khác quy định "mình – bạn" (gặp: ${bad.length} chỗ).` });
  }
  return w;
}
export function summarizeWarnings(ws) {
  const errors = ws.filter(x => x.level === 'error').length;
  return { total: ws.length, errors, notes: ws.length - errors, label: ws.length ? `${ws.length} cảnh báo` : 'Không cảnh báo' };
}
