// ---------- 05 · Mô hình dữ liệu và thao tác (v2.8) ----------
import { DATA_VERSION, WEEKDAY_LONG, WEEKDAY_SHORT, addDays, clone, dmy, dmyFull, fold, hash32, isValidTime, isValidYMD, isoWeek, minutesOf, mondayOf, sha256, splitSentences, weekdayOf } from './01-util.js';
import { TOPIC_MAX, TOPIC_SHORT_WORDS, parseBrand, parseTopics, parseVoice } from './02-parse.js';
import { DEFAULT_HYPE, checkRules, extractNumbers, paragraphsOf, slidesOf } from './03-rules.js';
import { scoreText, writeSlot } from './04-mock.js';
import { genImagePrompt, genText, noCaseEmptyCount, writeQueue } from './05b-cells.js';
import { PLATFORM_OF_ID, channelPublish, defaultPublish, migrateState, slotMetricsNow } from './05e-publish.js';
import { cellPrompt, layoutIssues } from './05g-format.js';
import { normalizeTopicMd } from './05h-topicframe.js';
import { aiSlotText } from './05o-aitext.js';
import { blogMediaAssets, blogPlain, blogRefreshAuto, isBlogSlot, keepBlogMedia, seoWeave, slotSeoOf, suggestKeyword } from './05p-blogseo.js';
import { imageIssues, stampRatios } from './05q-imgspec.js';
import { skillTag } from './05r-skill.js';
export const DEFAULT_CELL_CRITERIA = [
  { id: 'c1', name: 'Bám Topic', weight: 25 }, { id: 'c2', name: 'Đúng giọng thương hiệu', weight: 20 },
  { id: 'c3', name: 'Hook, mở đầu thu hút', weight: 20 }, { id: 'c4', name: 'Rõ lợi ích với người đọc', weight: 20 },
  { id: 'c5', name: 'Dễ chuyển thể sang nhiều Format', weight: 15 },
];
export const DEFAULT_SLOT_CRITERIA = [
  { id: 's1', name: 'Hợp kênh và Format', weight: 25 }, { id: 's2', name: 'Đúng giọng thương hiệu', weight: 20 },
  { id: 's3', name: 'Hook', weight: 20 }, { id: 's4', name: 'CTA rõ', weight: 20 }, { id: 's5', name: 'Trình bày dễ đọc', weight: 15 },
];
export const LAYOUTS = { post: 'Bài đăng', script: 'Kịch bản ngắn', carousel: 'Carousel', article: 'Bài Blog', longscript: 'Kịch bản video dài' };

// Thiết lập mặc định v2.8: 6 kênh, 5 Cột theo chức năng (mục 1.3), 15 Format, 2 Tuần mẫu (mục 7.1)
export function defaultSetup() {
  const channels = [
    { id: 'ch-fb', name: 'Fanpage Facebook', short: 'Facebook', maxChars: 1500, maxHashtags: 3, notes: 'Bài văn bản, ảnh' },
    { id: 'ch-ig', name: 'Instagram', short: 'Instagram', maxChars: 2200, maxHashtags: 5, notes: 'Carousel 6–8 slide, Reels' },
    { id: 'ch-tt', name: 'TikTok', short: 'TikTok', maxChars: 2200, maxHashtags: 5, notes: 'Kịch bản video ngắn' },
    { id: 'ch-th', name: 'Threads', short: 'Threads', maxChars: 500, maxHashtags: 1, notes: 'Bài ngắn' },
    { id: 'ch-yt', name: 'YouTube', short: 'YouTube', maxChars: null, maxHashtags: 3, notes: 'Video dài và Shorts' },
    { id: 'ch-blog', name: 'Blog', short: 'Blog', maxChars: null, maxHashtags: 0, notes: 'Bài viết dài, chuẩn SEO' },
  ];
  channels.forEach(c => { c.platform = PLATFORM_OF_ID[c.id]; c.publish = defaultPublish(c.platform); }); // cách đăng theo kênh (mục 10.22)
  const col = (id, kind, name, guide, structure, min, max, assetPrompt) => ({
    id, kind, name, active: true, guideMd: guide, structure,
    hardRules: { lengthUnit: 'words', min, max, requireCta: true, ctaType: 'action', extraBanned: [] },
    criteria: clone(DEFAULT_CELL_CRITERIA), assetPrompt,
  });
  const columns = [
    col('col-giaithich', 'giaithich', 'Giải thích', 'Giải thích vì sao và ý nghĩa của phát hiện trong Topic; chỉ dẫn số liệu có trong Topic. Bài dài vì nuôi cả Blog và video dài.', ['Hook', 'Vấn đề', 'Vì sao', 'Ý nghĩa', 'CTA'], 200, 1200, 'Biểu đồ đơn giản một con số lớn, nền sáng.'),
    col('col-huongdan', 'huongdan', 'Hướng dẫn', 'Các bước làm được ngay, mỗi bước một câu, kèm câu mẫu.', ['Hook', 'Các bước', 'Ví dụ', 'CTA'], 70, 1000, 'Ảnh chụp màn hình từng bước hoặc cảnh quay tay.'),
    col('col-batngo', 'batngo', 'Bất ngờ và ngộ nhận', 'Một ngộ nhận phổ biến và sự thật, hoặc một sự thật trái kỳ vọng, giải thích ngắn.', ['Hook', 'Ngộ nhận', 'Sự thật', 'CTA'], 40, 220, 'Nền chữ lớn "Ngộ nhận / Sự thật".'),
    col('col-cauchuyen', 'cauchuyen', 'Câu chuyện', 'Kể lại một trường hợp có trong Topic: trước, bước ngoặt, sau. Topic không có trường hợp thì không viết.', ['Hook', 'Câu chuyện', 'Bài học', 'CTA'], 60, 400, 'Ảnh chân dung (đã có đồng ý), ánh sáng tự nhiên.'),
    col('col-luyentap', 'luyentap', 'Luyện tập', 'Một câu hỏi tự kiểm tra hoặc thử thách dựa trên Topic, có đáp án.', ['Bối cảnh', 'Câu hỏi', 'Đáp án', 'CTA'], 30, 200, 'Nền chữ lớn với câu hỏi.'),
  ];
  const fmt = (id, name, channelId, columnId, layout, structure, rules, assetNeeds, guide) => ({
    id, kind: id.replace(/^f-/, ''), name, channelId, columnId, layout, structure, guideMd: guide || '',
    hardRules: Object.assign({ lengthUnit: 'chars', min: null, max: null, requireCta: true, ctaType: 'action', hashtagMax: null, slideMin: null, slideMax: null, wordsPerSlideMax: null, extraBanned: [] }, rules),
    criteria: clone(DEFAULT_SLOT_CRITERIA), assetNeeds,
  });
  const words = (min, max, extra) => Object.assign({ lengthUnit: 'words', min, max }, extra || {});
  const carousel = { slideMin: 6, slideMax: 8, wordsPerSlideMax: 40 };
  const slides = { name: 'Bộ ảnh slide', prompt: 'Slide nền sáng, một ý mỗi slide' };
  const vertical = { name: 'Cảnh quay dọc 9:16', prompt: 'Người nói trước camera, phụ đề tiếng Việt' };
  const formats = [
    fmt('f-blog-explain', 'Bài phân tích', 'ch-blog', 'col-giaithich', 'article', ['Tiêu đề', 'Mở bài', 'Thân bài', 'Kết'], words(200, 1500), [{ name: 'Ảnh bìa 1200×630', prompt: 'Ảnh bìa bài viết, tối giản' }], 'Tiêu đề rõ, mở bài 2–3 câu, mỗi đoạn có đề mục, kết bằng lời mời.'),
    fmt('f-yt-explain', 'Video giải thích', 'ch-yt', 'col-giaithich', 'longscript', ['Mở đầu', 'Kết'], words(200, 1500), [{ name: 'Thumbnail 1280×720', prompt: 'Một con số lớn và gương mặt người nói' }, { name: 'Cảnh quay ngang 16:9', prompt: 'Người nói trước camera, chèn biểu đồ' }], 'Mỗi cảnh một ý, có mốc thời gian.'),
    fmt('f-ig-explain', 'Carousel giải thích', 'ch-ig', 'col-giaithich', 'carousel', ['Bìa', 'Nội dung', 'CTA'], Object.assign({}, carousel), [slides], 'Slide 1 là bìa, slide cuối là CTA.'),
    fmt('f-fb-howto', 'Bài hướng dẫn', 'ch-fb', 'col-huongdan', 'post', ['Hook', 'Thân bài', 'CTA'], { min: 500, max: 1500, hashtagMax: 3 }, [{ name: 'Ảnh vuông 1080×1080', prompt: 'Ảnh minh họa các bước' }], 'Ngắt đoạn ngắn, mỗi bước một dòng.'),
    fmt('f-tt-howto', 'Mẹo nhanh', 'ch-tt', 'col-huongdan', 'script', ['Hook', 'Các bước', 'CTA'], words(60, 150), [vertical], 'Kịch bản 20–60 giây. 3 giây đầu là hook.'),
    fmt('f-ig-howto', 'Carousel từng bước', 'ch-ig', 'col-huongdan', 'carousel', ['Bìa', 'Các bước', 'CTA'], Object.assign({}, carousel), [slides], 'Mỗi bước một slide.'),
    fmt('f-yt-short-howto', 'Shorts hướng dẫn', 'ch-yt', 'col-huongdan', 'script', ['Hook', 'Các bước', 'CTA'], words(50, 130), [vertical], 'Dưới 60 giây.'),
    fmt('f-fb-infographic', 'Ảnh số liệu', 'ch-fb', 'col-giaithich', 'post', ['Hook', 'Thân bài', 'CTA'], { min: 200, max: 800, hashtagMax: 3 }, [{ name: 'Infographic 1080×1350', prompt: 'Một con số lớn, nền sáng, nguồn ghi dưới ảnh' }], 'Ảnh có một con số lớn; bài đăng giải thích ngắn con số đó và ghi nguồn.'),
    fmt('f-fb-album', 'Album từng bước', 'ch-fb', 'col-huongdan', 'carousel', ['Bìa', 'Các bước', 'CTA'], { slideMin: 4, slideMax: 10, wordsPerSlideMax: 40 }, [{ name: 'Bộ ảnh album', prompt: 'Mỗi bước một ảnh, nền sáng, chữ lớn' }], 'Album nhiều ảnh: ảnh đầu là bìa, mỗi bước một ảnh, ảnh cuối là CTA.'),
    fmt('f-fb-reel', 'Reels mẹo ngắn', 'ch-fb', 'col-huongdan', 'script', ['Hook', 'Các bước', 'CTA'], words(50, 130), [vertical], 'Reels dưới 45 giây, phụ đề tiếng Việt.'),
    fmt('f-fb-quote', 'Ảnh trích dẫn', 'ch-fb', 'col-batngo', 'post', ['Trích dẫn'], { min: 60, max: 300, requireCta: false, hashtagMax: 2 }, [{ name: 'Thẻ trích dẫn 1080×1080', prompt: 'Nền màu đơn sắc, một câu trích lớn' }], 'Một câu nổi bật làm ảnh; bài đăng nhắc lại và thêm một dòng giải thích.'),
    fmt('f-fb-truefalse', 'Đúng hay Sai', 'ch-fb', 'col-batngo', 'post', ['Mở đầu', 'Câu hỏi'], { min: 150, max: 600, ctaType: 'question', hashtagMax: 3 }, [{ name: 'Thẻ Đúng/Sai', prompt: 'Nền chữ lớn "Đúng hay Sai?"' }], 'Nêu một nhận định, mời bình luận Đúng hay Sai, đáp án trả lời ở bình luận ghim.'),
    fmt('f-fb-testimonial', 'Chuyện học viên', 'ch-fb', 'col-cauchuyen', 'post', ['Hook', 'Câu chuyện', 'CTA'], { min: 300, max: 900, hashtagMax: 3 }, [{ name: 'Ảnh chân dung (có quyền)', prompt: 'Chân dung, ánh sáng tự nhiên' }], 'Kể ngắn một người học thật: trước, bước ngoặt, sau. Chỉ dùng trường hợp có trong Topic.'),
    fmt('f-fb-poll', 'Bình chọn', 'ch-fb', 'col-luyentap', 'post', ['Câu hỏi', 'Lựa chọn'], { min: 100, max: 400, ctaType: 'question', hashtagMax: 3 }, [{ name: 'Thẻ bình chọn', prompt: 'Nền chữ lớn với câu hỏi và ba lựa chọn' }], 'Một câu hỏi ngắn và ba lựa chọn để bấm cảm xúc hoặc bình luận.'),
    fmt('f-fb-fill', 'Điền vào chỗ trống', 'ch-fb', 'col-luyentap', 'post', ['Câu hỏi', 'Gợi ý'], { min: 100, max: 400, ctaType: 'question', hashtagMax: 3 }, [{ name: 'Thẻ điền chỗ trống', prompt: 'Nền chữ lớn, một câu có chỗ trống' }], 'Một câu mẫu có chỗ trống để người đọc điền vào bình luận.'),
    fmt('f-th-fact', 'Sự thật bất ngờ', 'ch-th', 'col-batngo', 'post', ['Hook', 'Sự thật'], { min: 150, max: 500, requireCta: false }, [], 'Một ý, đọc trong 10 giây.'),
    fmt('f-tt-fact', 'Bạn có biết', 'ch-tt', 'col-batngo', 'script', ['Hook', 'Sự thật', 'CTA'], words(40, 110), [vertical], 'Mở bằng câu hỏi gây tò mò.'),
    fmt('f-ig-myth', 'Carousel ngộ nhận', 'ch-ig', 'col-batngo', 'carousel', ['Bìa', 'Ngộ nhận', 'CTA'], Object.assign({}, carousel), [slides], 'Slide ngộ nhận rồi slide sự thật.'),
    fmt('f-fb-story', 'Bài kể chuyện', 'ch-fb', 'col-cauchuyen', 'post', ['Hook', 'Câu chuyện', 'Bài học', 'CTA'], { min: 500, max: 1500, hashtagMax: 3 }, [{ name: 'Ảnh chân dung (có quyền)', prompt: 'Chân dung, ánh sáng tự nhiên' }], 'Kể theo trình tự trước – bước ngoặt – sau.'),
    fmt('f-ig-reel-story', 'Reels kể chuyện', 'ch-ig', 'col-cauchuyen', 'script', ['Hook', 'Câu chuyện', 'CTA'], words(60, 150), [vertical], 'Kịch bản nói, câu ngắn.'),
    fmt('f-th-quiz', 'Quiz', 'ch-th', 'col-luyentap', 'post', ['Câu hỏi'], { min: 100, max: 500, ctaType: 'question' }, [], 'Một câu hỏi, đáp án để ở bình luận.'),
    fmt('f-fb-quiz', 'Thử thách', 'ch-fb', 'col-luyentap', 'post', ['Mở đầu', 'Câu hỏi'], { min: 200, max: 1000, ctaType: 'question', hashtagMax: 3 }, [{ name: 'Ảnh nền', prompt: 'Nền chữ lớn với câu hỏi' }], 'Mở bằng bối cảnh ngắn rồi hỏi.'),
    fmt('f-ig-quiz', 'Carousel quiz', 'ch-ig', 'col-luyentap', 'carousel', ['Bìa', 'Câu hỏi', 'CTA'], Object.assign({}, carousel), [slides], 'Câu hỏi ở đầu, đáp án ở slide cuối.'),
  ];
  const mk = (prefix, list) => list.map((t, i) => ({ id: `${prefix}-${i + 1}`, weekday: t[0], time: t[1], formatId: t[2], channelId: formats.find(f => f.id === t[2]).channelId }));
  const standard = mk('tpl-a', [
    [1, '12:00', 'f-th-fact'], [1, '19:30', 'f-fb-infographic'],
    [2, '11:30', 'f-fb-howto'], [2, '19:30', 'f-fb-reel'],
    [3, '07:30', 'f-blog-explain'], [3, '12:00', 'f-fb-truefalse'], [3, '20:00', 'f-fb-poll'],
    [4, '11:30', 'f-fb-story'], [4, '19:30', 'f-fb-testimonial'],
    [5, '12:00', 'f-fb-album'], [5, '19:00', 'f-yt-short-howto'], [5, '20:30', 'f-fb-fill'],
    [6, '09:00', 'f-yt-explain'], [6, '19:30', 'f-fb-quote'],
    [7, '10:00', 'f-ig-quiz'], [7, '19:00', 'f-fb-story'], [7, '20:00', 'f-th-quiz'],
  ]);
  const light = mk('tpl-b', [
    [1, '12:00', 'f-th-fact'], [2, '11:30', 'f-fb-howto'], [3, '07:30', 'f-blog-explain'], [3, '20:00', 'f-fb-poll'],
    [4, '11:30', 'f-fb-story'], [5, '12:00', 'f-fb-album'], [6, '09:00', 'f-yt-explain'], [6, '19:30', 'f-fb-quote'], [7, '10:00', 'f-ig-quiz'],
  ]);
  const weekTemplates = [
    { id: 'wt-1', name: 'Tuần chuẩn', order: 1, slots: standard },
    { id: 'wt-2', name: 'Tuần nhẹ', order: 2, slots: light },
  ];
  return { channels, columns, formats, weekTemplates };
}

export function emptyState() {
  return {
    dataVersion: DATA_VERSION, seq: 1, isDemo: false,
    brand: { md: '', parsed: parseBrand('').parsed, issues: [], updatedAt: null },
    voice: { md: '', parsed: parseVoice('').parsed, issues: [], updatedAt: null },
    channels: [], columns: [], formats: [], weekTemplates: [],
    weeks: [], topicFiles: [], topics: [], cells: [], slots: [], audit: [], blogPosts: [],
    settings: { demoNow: '2026-10-12T09:00', reviewThreshold: 70, hypeWords: [...DEFAULT_HYPE] },
    archive: {}, ui: { weekStart: null },
  };
}
export function nextId(S, prefix) { return `${prefix}-${S.seq++}`; }
export function log(S, action, entity, ref, note) {
  S.audit.push({ ts: S.settings.demoNow, action, entity, ref, note: note || '' });
  if (S.audit.length > 500) S.audit.splice(0, S.audit.length - 500);
}
export const byId = (arr, id) => arr.find(x => x.id === id);

export function setBrandMd(S, md) { const r = parseBrand(md); S.brand = { md, parsed: r.parsed, issues: r.issues, updatedAt: S.settings.demoNow }; }
export function setVoiceMd(S, md) { const r = parseVoice(md); S.voice = { md, parsed: r.parsed, issues: r.issues, updatedAt: S.settings.demoNow }; }

// ---- Thiết lập đủ (mục 2.1) ----
export function setupStatus(S) {
  const missing = [];
  if (!String(S.brand.md || '').trim()) missing.push({ key: 'brand', text: 'Chưa có Thương hiệu' });
  if (!String(S.voice.md || '').trim()) missing.push({ key: 'voice', text: 'Chưa có Giọng văn' });
  const active = S.columns.filter(c => c.active);
  if (!active.length) missing.push({ key: 'columns', text: 'Chưa có Cột nào đang bật' });
  active.forEach(c => { if (!S.formats.some(f => f.columnId === c.id)) missing.push({ key: 'formats', text: `Cột "${c.name}" chưa có Format nào` }); });
  if (!S.weekTemplates.some(t => t.slots.length)) missing.push({ key: 'templates', text: 'Chưa có Tuần mẫu nào có slot' });
  return { ok: !missing.length, missing };
}
export function sumWeights(criteria) { return (criteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0); }

// ---- Kênh / Cột / Format ----
export function validateFormat(S, f) {
  const errs = [];
  if (!String(f.name || '').trim()) errs.push('Cần đặt tên Format.');
  if (!f.channelId || !byId(S.channels, f.channelId)) errs.push('Cần chọn một kênh.');
  if (!f.columnId || !byId(S.columns, f.columnId)) errs.push('Cần chọn một Cột nguồn.');
  if (sumWeights(f.criteria) !== 100) errs.push(`Tổng trọng số tiêu chí phải bằng 100 (đang là ${sumWeights(f.criteria)}).`);
  const r = f.hardRules || {};
  if (r.min && r.max && Number(r.min) > Number(r.max)) errs.push('Độ dài tối thiểu lớn hơn tối đa.');
  return errs;
}
export function validateColumn(S, c) {
  const errs = [];
  if (!String(c.name || '').trim()) errs.push('Cần đặt tên Cột.');
  if (sumWeights(c.criteria) !== 100) errs.push(`Tổng trọng số tiêu chí phải bằng 100 (đang là ${sumWeights(c.criteria)}).`);
  const r = c.hardRules || {};
  if (r.min && r.max && Number(r.min) > Number(r.max)) errs.push('Độ dài tối thiểu lớn hơn tối đa.');
  return errs;
}
export function formatUsage(S, formatId) {
  const openWeeks = new Set(S.weeks.filter(w => w.status !== 'CONFIRMED').map(w => w.id));
  return {
    openSlots: S.slots.filter(s => s.formatId === formatId && openWeeks.has(s.weekId) && s.state !== 'PUBLISHED'),
    templates: S.weekTemplates.flatMap(t => t.slots.filter(x => x.formatId === formatId)),
    lockedSlots: S.slots.filter(s => s.formatId === formatId && !openWeeks.has(s.weekId) && s.state !== 'PUBLISHED'),
    publishedSlots: S.slots.filter(s => s.formatId === formatId && s.state === 'PUBLISHED'),
  };
}
// Xóa Format; slot ở tuần chưa chốt chuyển sang moveToId (bắt buộc nếu có), slot mẫu dùng Format đó bị xóa
export function deleteFormat(S, formatId, moveToId) {
  const u = formatUsage(S, formatId);
  if (u.publishedSlots.length) return { ok: false, error: `Format đang có ${u.publishedSlots.length} bài đã đăng (chỉ xem) nên không xóa được.` };
  if (u.lockedSlots.length) return { ok: false, error: `Format đang có ${u.lockedSlots.length} slot ở tuần đã chốt. Mở lại tuần đó trước.` };
  if (u.openSlots.length) {
    const target = byId(S.formats, moveToId);
    if (!target || target.id === formatId) return { ok: false, needsMove: true, count: u.openSlots.length, error: `Format đang có ${u.openSlots.length} slot ở tuần chưa chốt. Chọn Format để chuyển sang.` };
    u.openSlots.forEach(s => updateSlot(S, s.id, { formatId: target.id, channelId: target.channelId }));
  }
  S.weekTemplates.forEach(t => { t.slots = t.slots.filter(x => x.formatId !== formatId); });
  S.formats = S.formats.filter(f => f.id !== formatId);
  log(S, 'delete', 'format', formatId);
  return { ok: true, moved: u.openSlots.length, templatesRemoved: u.templates.length };
}

// ---- Tuần mẫu (WK-01..WK-04) ----
export function templatesSorted(S) { return [...S.weekTemplates].sort((a, b) => a.order - b.order); }
export function templateOf(S, id) { return byId(S.weekTemplates, id); }
export function templateWarnings(S, tpl) {
  const out = [];
  if (!tpl) return out;
  const list = [...tpl.slots].sort((a, b) => a.weekday - b.weekday || minutesOf(a.time) - minutesOf(b.time));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.weekday === b.weekday && a.channelId === b.channelId && Math.abs(minutesOf(a.time) - minutesOf(b.time)) < 120) {
      const ch = byId(S.channels, a.channelId);
      out.push({ ids: [a.id, b.id], text: `${WEEKDAY_LONG[a.weekday]}: hai slot ${ch ? ch.short || ch.name : ''} cách nhau dưới 2 giờ (${a.time} và ${b.time}).` });
    }
  }
  return out;
}
export function templateEmptyDays(tpl) { return [1, 2, 3, 4, 5, 6, 7].filter(d => !tpl.slots.some(t => t.weekday === d)); }
export function templateColumnCounts(S, tpl) {
  const out = {};
  tpl.slots.forEach(t => { const f = byId(S.formats, t.formatId); if (f) out[f.columnId] = (out[f.columnId] || 0) + 1; });
  return out;
}
export function addWeekTemplate(S, name, copyFromId) {
  const src = copyFromId ? templateOf(S, copyFromId) : null;
  const id = nextId(S, 'wt');
  const tpl = { id, name: String(name || '').trim() || 'Tuần mẫu mới', order: S.weekTemplates.reduce((m, t) => Math.max(m, t.order), 0) + 1,
    slots: src ? src.slots.map(s => Object.assign({}, s, { id: nextId(S, 'tpl') })) : [] };
  S.weekTemplates.push(tpl); log(S, 'create', 'weekTemplate', id);
  return tpl;
}
export function deleteWeekTemplate(S, id) {
  if (!templateOf(S, id)) return { ok: false };
  S.weekTemplates = S.weekTemplates.filter(t => t.id !== id);
  templatesSorted(S).forEach((t, i) => { t.order = i + 1; });
  log(S, 'delete', 'weekTemplate', id);
  return { ok: true };
}
export function moveWeekTemplate(S, id, dir) {
  const list = templatesSorted(S); const i = list.findIndex(t => t.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: false };
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((t, k) => { t.order = k + 1; });
  return { ok: true };
}
// Gợi ý Tuần mẫu kế tiếp sau Tuần mẫu của tuần liền trước (vòng A → B → … → A)
export function suggestTemplateId(S, startDate) {
  const list = templatesSorted(S).filter(t => t.slots.length);
  if (!list.length) return null;
  const prev = weekOf(S, weekIdOf(addDays(startDate, -7)));
  if (prev && prev.templateId) {
    const i = list.findIndex(t => t.id === prev.templateId);
    if (i >= 0) return list[(i + 1) % list.length].id;
  }
  return list[0].id;
}
export function previewTemplateWeek(S, startDate, templateId) {
  const tpl = templateOf(S, templateId); if (!tpl) return [];
  return tpl.slots.filter(t => byId(S.formats, t.formatId)).map(t => {
    const f = byId(S.formats, t.formatId);
    return { weekday: t.weekday, date: addDays(startDate, t.weekday - 1), time: t.time, channelId: f.channelId, formatId: t.formatId, columnId: f.columnId };
  }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
// Nút Tuần mẫu: chỉ dùng được khi tuần chưa có slot nào và chưa chốt
export function canApplyTemplate(S, startDate) {
  const w = weekOf(S, weekIdOf(startDate));
  if (w && w.status === 'CONFIRMED') return { ok: false, reason: 'Tuần đã chốt. Mở lại tuần để sửa.' };
  const n = w ? weekSlots(S, w.id).length : 0;
  if (n) return { ok: false, reason: `Tuần đã có ${n} slot. Xóa hết slot của tuần nếu muốn dùng lại Tuần mẫu.` };
  const st = setupStatus(S);
  if (!st.ok) return { ok: false, reason: `Thiết lập chưa đủ: ${st.missing.map(m => m.text).join('; ')}.` };
  return { ok: true, reason: '' };
}
export function applyTemplateWeek(S, startDate, templateId) {
  const gate = canApplyTemplate(S, startDate);
  if (!gate.ok) return { ok: false, error: gate.reason };
  const tpl = templateOf(S, templateId);
  if (!tpl || !tpl.slots.length) return { ok: false, error: 'Chọn một Tuần mẫu có slot.' };
  const r = ensureWeek(S, startDate); if (!r.ok) return r;
  const list = previewTemplateWeek(S, startDate, templateId);
  list.forEach(t => S.slots.push(newSlot(S, r.week.id, t.date, t.time, t.formatId)));
  r.week.templateId = templateId;
  log(S, 'apply-template', 'week', r.week.id, `${tpl.name} · ${list.length} slot`);
  return { ok: true, week: r.week, slots: list.length };
}

// ---- Tuần và slot ----
export function weekIdOf(startDate) { return `w-${startDate}`; }
export function weekOf(S, weekId) { return byId(S.weeks, weekId); }
export function isLocked(S, weekId) { const w = weekOf(S, weekId); return !!w && w.status === 'CONFIRMED'; }
// Slot không sửa được (mục 10.24): bài Đã đăng chỉ xem; tuần đã chốt thì phải Mở lại để sửa
const PUBLISHED_LOCK = 'Bài đã đăng chỉ xem, không sửa được. Đăng tay thì "Bỏ đánh dấu" trước nếu lỡ đánh dấu nhầm.';
export function slotLockMsg(S, s) {
  if (s && s.state === 'PUBLISHED') return PUBLISHED_LOCK;
  if (s && isLocked(S, s.weekId)) return 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.';
  return '';
}
export function weekLabelOf(startDate) {
  const end = addDays(startDate, 6);
  const iw = isoWeek(startDate);
  return { short: `Tuần ${dmy(startDate)}`, range: `${dmy(startDate)} – ${dmyFull(end)}`, iso: `${iw.year}-W${String(iw.week).padStart(2, '0')}` };
}
export function weekLabel(w) { return weekLabelOf(w.startDate); }
export function weekSlots(S, weekId) {
  return S.slots.filter(s => s.weekId === weekId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
export function newAsset(a) { const x = { name: a.name, hint: a.prompt || '', prompt: '', cellPrompt: '', versions: [], current: null, done: false, ref: '' }; if (a.ratio) x.ratio = a.ratio; return x; }
function newSlot(S, weekId, date, time, formatId) {
  const f = byId(S.formats, formatId);
  return stampRatios(S, {
    id: nextId(S, 'slot'), weekId, date, time, channelId: f.channelId, formatId,
    sourceCellId: null, sourceStamp: null, state: 'EMPTY', text: '', prevText: null, genN: 0, history: [],
    scores: [], total: null, tip: '', assets: (f.assetNeeds || []).map(newAsset),
    needsUpdate: false, keepReason: '', changedAfterPublish: false, free: false, columnId: null,
    confirmedText: null, pub: null, metrics: [],
  });
}
// Mở (tạo bản ghi) tuần chứa ngày thứ Hai đã cho; chưa có slot. Gọi khi nạp Topic hoặc dựng slot.
export function ensureWeek(S, startDate) {
  if (!isValidYMD(startDate)) return { ok: false, error: 'Ngày không hợp lệ.' };
  if (weekdayOf(startDate) !== 1) return { ok: false, error: `${dmyFull(startDate)} không phải thứ Hai. Chọn thứ Hai ${dmyFull(mondayOf(startDate))}.` };
  const have = weekOf(S, weekIdOf(startDate));
  if (have) return { ok: true, week: have, created: false };
  const w = { id: weekIdOf(startDate), startDate, status: 'DRAFT', columnIds: matrixLayout(S), confirmedAt: null, revision: 0, templateId: null, dealtAt: null };
  S.weeks.push(w);
  log(S, 'create', 'week', w.id);
  return { ok: true, week: w, created: true };
}
export function validateSlotInput(S, weekId, input) {
  const w = weekOf(S, weekId); const errs = [];
  if (!w) errs.push('Không tìm thấy tuần.');
  if (!isValidTime(input.time)) errs.push('Giờ không hợp lệ (dạng HH:MM).');
  const f = byId(S.formats, input.formatId);
  if (!input.channelId) errs.push('Cần chọn kênh.');
  if (!f) errs.push('Cần chọn Format.');
  else if (f.channelId !== input.channelId) errs.push('Format không thuộc kênh đã chọn.');
  if (input.columnId && !byId(S.columns, input.columnId)) errs.push('Cột không tồn tại.');
  if (!input.free && input.columnId === '') errs.push('Slot lấy bài từ Matrix cần một Cột. Muốn không gắn Cột thì dùng slot tự do.');
  if (w && (input.date < w.startDate || input.date > addDays(w.startDate, 6))) errs.push('Ngày nằm ngoài tuần.');
  return errs;
}
// Đưa slot về "Chưa có bài" (giữ nguyên các bản ảnh đã tạo; prompt ảnh nhận lại khi Chia bài)
export function clearSlotContent(s) {
  Object.assign(s, { sourceCellId: null, sourceStamp: null, text: '', prevText: null, state: s.state === 'PUBLISHED' ? 'PUBLISHED' : 'EMPTY', needsUpdate: false, scores: [], total: null, tip: '', keepReason: '' });
  s.assets.forEach(a => { a.cellPrompt = ''; a.prompt = ''; });
}
export function addSlot(S, weekId, input) {
  if (isLocked(S, weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  const errs = validateSlotInput(S, weekId, input);
  if (errs.length) return { ok: false, error: errs.join(' ') };
  const s = newSlot(S, weekId, input.date, input.time, input.formatId); const f0 = byId(S.formats, input.formatId);
  if (input.free) { s.free = true; s.columnId = input.columnId === undefined ? (f0 ? f0.columnId : null) : (input.columnId || null); }
  else if (input.columnId && f0 && input.columnId !== f0.columnId) s.columnId = input.columnId; // Cột khác Cột đề xuất của Format (mục 10.20) // Slot tự do (mục 10.18): không lấy nguồn từ Matrix, người dùng tự viết và tải ảnh/video
  S.slots.push(s); log(S, input.free ? 'create-free' : 'create', 'slot', s.id);
  return { ok: true, slot: s };
}
// Thêm slot khi tuần chưa có bản ghi (nút + trên lịch của tuần trống)
export function addSlotToStart(S, startDate, input) {
  const r = ensureWeek(S, startDate); if (!r.ok) return r;
  return addSlot(S, r.week.id, input);
}
export function updateSlot(S, slotId, patch) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const next = Object.assign({}, s, patch);
  const errs = validateSlotInput(S, s.weekId, next);
  if (errs.length) return { ok: false, error: errs.join(' ') };
  const formatChanged = patch.formatId && patch.formatId !== s.formatId;
  const oldCol = slotColumnId(S, s);
  const newF = byId(S.formats, next.formatId);
  if (s.free) { if (patch.columnId === '') next.columnId = null; }
  else if (patch.columnId !== undefined || formatChanged) next.columnId = patch.columnId && patch.columnId !== newF.columnId ? patch.columnId : null; // chỉ lưu khi khác Cột đề xuất
  const colChanged = !s.free && oldCol !== slotColumnId(S, next);
  let cleared = false;
  if (s.free) {
    if (formatChanged) {
      // Slot tự do: đổi Format không mất bài/ảnh đã có; chỉ bổ sung ô ảnh theo Format mới
      if (s.state === 'APPROVED') next.state = 'DRAFT';
      const keep = (s.assets || []).filter(a => a.extra || a.versions.some(v => v.src));
      next.assets = keep.concat((newF.assetNeeds || []).filter(n => !keep.some(a => a.name === n.name)).map(newAsset));
    }
  } else if (formatChanged || colChanged) {
    if (colChanged || !byId(S.formats, s.formatId)) { clearSlotContent(next); cleared = !s.sourceCellId; }
    else if (s.state !== 'EMPTY') { next.needsUpdate = true; if (s.state === 'APPROVED') next.state = 'DRAFT'; }
    if (formatChanged) next.assets = (newF.assetNeeds || []).map(newAsset);
  }
  Object.assign(s, next); stampRatios(S, s); log(S, 'update', 'slot', s.id);
  return { ok: true, slot: s, cleared: cleared || (colChanged && !s.text) };
}
// ---- Chuyển slot sang ngày khác trong tuần (mục 10.31): giữ giờ; lịch tự xếp theo giờ ----
export function moveSlotCheck(S, slotId, date) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  if (s.state === 'PUBLISHED') return { ok: false, error: PUBLISHED_LOCK };
  const w = weekOf(S, s.weekId);
  if (!w || date < w.startDate || date > addDays(w.startDate, 6)) return { ok: false, error: 'Chỉ chuyển được trong cùng tuần.' };
  if (date === s.date) return { ok: false, error: 'Slot đã ở ngày này.', same: true };
  if (`${date}T${s.time}` <= S.settings.demoNow) return { ok: false, error: `${WEEKDAY_SHORT[weekdayOf(date)]} ${dmy(date)} lúc ${s.time} đã qua, không chuyển về quá khứ được.` };
  const warnings = [];
  const clash = S.slots.filter(x => x.id !== s.id && x.weekId === s.weekId && x.date === date && x.channelId === s.channelId && x.time === s.time);
  if (clash.length) warnings.push(`Ngày mới đã có ${clash.length} slot cùng kênh lúc ${s.time}.`);
  const sameCh = S.slots.filter(x => x.id !== s.id && x.weekId === s.weekId && x.date === date && x.channelId === s.channelId).length;
  if (sameCh >= 2 && !clash.length) warnings.push(`Ngày mới đã có ${sameCh} slot cùng kênh.`);
  return { ok: true, from: s.date, to: date, time: s.time, warnings, needReopen: w.status === 'CONFIRMED' };
}
export function moveSlot(S, slotId, date, opts = {}) {
  const c = moveSlotCheck(S, slotId, date); if (!c.ok) return c;
  if (c.needReopen && !opts.reopen) return { ok: false, error: 'Tuần đã chốt. Cần Mở lại để sửa trước khi chuyển slot.', needReopen: true };
  const s = byId(S.slots, slotId);
  if (c.needReopen) reopenWeek(S, s.weekId);
  s.date = date; log(S, 'move', 'slot', s.id, `${c.from} → ${date}`);
  return Object.assign(c, { reopened: !!c.needReopen });
}
// Hoàn tác chuyển ngày: về ngày cũ; tuần đã mở lại vì lần chuyển này thì chốt lại như trước
export function undoMoveSlot(S, slotId, from, reopened) {
  const s = byId(S.slots, slotId); if (!s || s.state === 'PUBLISHED') return { ok: false, error: 'Không hoàn tác được.' };
  s.date = from; log(S, 'move', 'slot', s.id, `hoàn tác → ${from}`);
  const w = weekOf(S, s.weekId); if (reopened && w && w.status === 'REOPENED') w.status = 'CONFIRMED';
  return { ok: true };
}
// Cột của slot: slot tự do tự chọn (có thể không có Cột), slot thường theo Format
export function slotColumnId(S, s) { if (s.free) return s.columnId || null; if (s.columnId) return s.columnId; const f = byId(S.formats, s.formatId); return f ? f.columnId : null; }
export function deleteSlot(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  S.slots = S.slots.filter(x => x.id !== slotId); log(S, 'delete', 'slot', slotId);
  return { ok: true };
}
export function reopenWeek(S, weekId) {
  const w = weekOf(S, weekId); if (!w || w.status !== 'CONFIRMED') return { ok: false };
  w.status = 'REOPENED'; log(S, 'reopen', 'week', weekId); return { ok: true };
}

// ---- Topic (hàng ma trận), ô ----
export function topicsOf(S, weekId) { return S.topics.filter(i => i.weekId === weekId).sort((a, b) => a.order - b.order); }
export function topicCurrent(row) { return row.currentVersion == null ? null : row.versions.find(v => v.n === row.currentVersion) || null; }
export function cellsOf(S, weekId) { return S.cells.filter(c => c.weekId === weekId); }
export function cellAt(S, weekId, topicId, columnId, k) { k = k || 0; return S.cells.find(c => c.weekId === weekId && c.topicId === topicId && c.columnId === columnId && (c.k || 0) === k); }
// Vị trí Cột của tuần (10.53): một loại Cột có thể đứng ở nhiều vị trí; k là lần xuất hiện thứ mấy của loại đó (0, 1, …)
export function weekLanes(S, w) {
  const seen = {};
  return (w ? w.columnIds : []).map((colId, pos) => { const k = seen[colId] || 0; seen[colId] = k + 1; return { pos, colId, k }; })
    .map(l => Object.assign(l, { label: laneLabel(S, w, l.colId, l.k) }));
}
export function laneLabel(S, w, colId, k) {
  const col = byId(S.columns, colId); const name = col ? col.name : '?';
  return w && w.columnIds.filter(x => x === colId).length > 1 ? `${name} ${(k || 0) + 1}` : name;
}
export function cellLabel(S, cell) { return laneLabel(S, weekOf(S, cell.weekId), cell.columnId, cell.k || 0); }
// Cấu hình Matrix (10.53): danh sách loại Cột theo vị trí cho tuần mới; chưa cấu hình thì lấy các Cột đang bật
export function matrixLayout(S) {
  const ids = (S.settings.matrixColumns || []).filter(id => byId(S.columns, id));
  return ids.length ? ids : S.columns.filter(c => c.active).map(c => c.id);
}
export function setMatrixLayout(S, ids) {
  const clean = (ids || []).filter(id => byId(S.columns, id));
  if (!clean.length) return { ok: false, error: 'Matrix cần ít nhất 1 Cột.' };
  S.settings.matrixColumns = clean; log(S, 'matrix-layout', 'settings', '', clean.join(','));
  return { ok: true };
}
export function cellView(S, cell) {
  const row = byId(S.topics, cell.topicId);
  const v = row ? row.currentVersion : null;
  const bv = v == null ? null : cell.byVersion[v];
  const state = bv ? bv.state : 'EMPTY';
  let gen = null, text = '', editRev = 0;
  if (bv && bv.currentRef) {
    gen = cell.gens.find(g => g.n === bv.currentRef.genN) || null;
    editRev = bv.currentRef.editRev || 0;
    if (gen) text = genText(gen, editRev);
  }
  return { state, gen, text, editRev, imagePrompt: gen ? genImagePrompt(gen, editRev) : '', topicVersion: v, stamp: gen ? { cellId: cell.id, topicVersion: v, genN: gen.n, editRev } : null };
}
function sameStamp(a, b) { return !!a && !!b && a.cellId === b.cellId && a.topicVersion === b.topicVersion && a.genN === b.genN && (a.editRev || 0) === (b.editRev || 0); }
export function slotsUsingCell(S, cellId) { return S.slots.filter(s => s.sourceCellId === cellId); }
export function addWeekColumn(S, weekId, columnId) {
  const w = weekOf(S, weekId);
  if (!w || !byId(S.columns, columnId)) return { ok: false };
  if (isLocked(S, weekId)) return { ok: false, error: 'Tuần đã chốt.' };
  const k = w.columnIds.filter(x => x === columnId).length;
  w.columnIds.push(columnId);
  let added = 0;
  topicsOf(S, weekId).forEach(i => { S.cells.push(Object.assign({ id: nextId(S, 'cell'), weekId, topicId: i.id, columnId, gens: [], byVersion: {} }, k ? { k } : {})); added++; });
  log(S, 'add-column', 'week', weekId, columnId);
  return { ok: true, cellsAdded: added };
}
export function removeColumnImpact(S, weekId, columnId, k) {
  const cells = cellsOf(S, weekId).filter(c => c.columnId === columnId && (c.k || 0) === (k || 0));
  const ids = new Set(cells.map(c => c.id));
  const slots = weekSlots(S, weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId));
  return { cells: cells.length, cellsWithContent: cells.filter(c => c.gens.length).length, slots: slots.length };
}
export function removeWeekColumn(S, weekId, columnId, k) {
  const w = weekOf(S, weekId); k = k || 0;
  if (!w || w.columnIds.filter(x => x === columnId).length <= k) return { ok: false };
  if (isLocked(S, weekId)) return { ok: false, error: 'Tuần đã chốt.' };
  if (w.columnIds.length <= 1) return { ok: false, error: 'Tuần cần ít nhất 1 Cột.' };
  const impact = removeColumnImpact(S, weekId, columnId, k);
  const ids = new Set(cellsOf(S, weekId).filter(c => c.columnId === columnId && (c.k || 0) === k).map(c => c.id));
  weekSlots(S, weekId).forEach(s => { if (s.sourceCellId && ids.has(s.sourceCellId)) clearSlotContent(s); });
  S.cells = S.cells.filter(c => !ids.has(c.id));
  cellsOf(S, weekId).forEach(c => { if (c.columnId === columnId && (c.k || 0) > k) { c.k -= 1; if (!c.k) delete c.k; } }); // các vị trí cùng loại phía sau lùi lên
  let seen = -1; const at = w.columnIds.findIndex(id => id === columnId && ++seen === k);
  w.columnIds.splice(at, 1);
  log(S, 'remove-column', 'week', weekId, columnId);
  return { ok: true, impact };
}

// ---- Cập nhật cờ "cần cập nhật" ----
export function refreshSlotFlags(S, weekId) {
  weekSlots(S, weekId).forEach(s => {
    if (!s.sourceCellId || !s.sourceStamp || s.state === 'PUBLISHED') return;
    const cell = byId(S.cells, s.sourceCellId);
    const cur = cell ? cellView(S, cell).stamp : null;
    const stale = !sameStamp(cur, s.sourceStamp);
    const kept = !!s.keepReason && JSON.stringify(cur || null) === JSON.stringify(s.keepStamp || null);
    if (stale && !kept) s.needsUpdate = true;
  });
}

// ---- Cảnh báo theo ngữ cảnh ----
function ruleCtxBase(S) {
  return { banned: S.brand.parsed.bannedPhrases || [], hypeWords: S.settings.hypeWords, pronouns: S.voice.parsed.pronouns, verifiedFacts: S.brand.parsed.verifiedFacts || [] };
}
export function topicFileOf(S, weekId) { return (S.topicFiles || []).find(f => f.weekId === weekId) || null; }
function topicNumbersOf(S, cell) {
  const row = byId(S.topics, cell.topicId); const v = row ? topicCurrent(row) : null;
  if (!v) return null;
  const file = topicFileOf(S, cell.weekId);
  return extractNumbers(`${v.title}\n${v.text}\n${Object.values(v.fields || {}).join('\n')}\n${file ? file.context : ''}`);
}
export function cellWarnings(S, cell, text) {
  const col = byId(S.columns, cell.columnId); if (!col) return [];
  const others = cellsOf(S, cell.weekId).filter(c => c.id !== cell.id && (c.topicId !== cell.topicId || c.columnId === cell.columnId)).map(c => cellView(S, c).text).filter(Boolean);
  return checkRules(text, Object.assign(ruleCtxBase(S), { kind: 'cell', rules: col.hardRules, structure: col.structure, layout: 'labeled',
    topicNumbers: topicNumbersOf(S, cell), otherCellTexts: others })).concat(layoutIssues(text));
}
// Cảnh báo ở Topic (TPC-03): ngắn, không có trường hợp cụ thể (D100)
export function topicWarnings(S, row, v) {
  const w = []; if (!v) return w;
  if (v.words < TOPIC_SHORT_WORDS) w.push({ id: 'TPC-W', level: 'note', text: `Topic ngắn (${v.words} chữ): AI dễ phải thêm ý ngoài Topic; khuyến nghị khoảng 2.000 chữ.` });
  if (!v.hasCase) w.push({ id: 'TPC-W', level: 'note', text: 'Không có trường hợp cụ thể: ô Câu chuyện của Topic này không được viết (nên Hủy).' });
  return w;
}
export function ensureCells(S, weekId) {
  const w = weekOf(S, weekId);
  topicsOf(S, weekId).forEach(i => weekLanes(S, w).forEach(({ colId, k }) => {
    if (!cellAt(S, weekId, i.id, colId, k)) S.cells.push(Object.assign({ id: nextId(S, 'cell'), weekId, topicId: i.id, columnId: colId, gens: [], byVersion: {} }, k ? { k } : {}));
  }));
}
// ---- Nạp tệp Topic (TPC-01..04) ----
export function sameTopicContent(v, p) {
  return !!v && v.title === p.title && v.text === p.text && JSON.stringify(v.fields || {}) === JSON.stringify(p.fields || {});
}
function diffTopics(S, weekId, parsed) {
  const rows = topicsOf(S, weekId);
  const changes = { added: [], removed: [], changed: [], same: [] };
  parsed.topics.forEach((p, k) => {
    const row = rows[k];
    if (!row) changes.added.push(k + 1);
    else if (sameTopicContent(topicCurrent(row), p)) changes.same.push(k + 1);
    else changes.changed.push(k + 1);
  });
  rows.slice(parsed.topics.length).forEach(r => changes.removed.push(r.order));
  const affectedRows = rows.filter(r => changes.changed.includes(r.order) || changes.removed.includes(r.order));
  const cellIds = new Set(cellsOf(S, weekId).filter(c => affectedRows.some(r => r.id === c.topicId)).map(c => c.id));
  const impact = {
    cells: cellsOf(S, weekId).filter(c => cellIds.has(c.id) && cellView(S, c).text).length,
    slots: weekSlots(S, weekId).filter(s => s.sourceCellId && cellIds.has(s.sourceCellId)).length,
  };
  return { changes, impact };
}
export function previewTopics(S, weekId, md) {
  // Chuẩn hoá theo Khung Topic trước khi đọc (mục 10.30); r.normalized giữ tệp sau chuẩn hoá và danh sách thay đổi
  const n = normalizeTopicMd(S, md);
  const r = Object.assign(parseTopics(n.md), { normalized: n });
  if (r.errors.length) return Object.assign({ ok: false }, r);
  const d = diffTopics(S, weekId, r);
  return Object.assign({ ok: true }, r, d);
}
function uniqueTopicId(S, w, n) { let k = n; while (byId(S.topics, `${w.id}-topic-${k}`)) k++; return `${w.id}-topic-${k}`; }
export function importTopics(S, weekId, md, at) {
  const w = weekOf(S, weekId);
  if (!w) return { ok: false, errors: [{ text: 'Không tìm thấy tuần.' }] };
  if (isLocked(S, weekId)) return { ok: false, errors: [{ text: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' }] };
  const r = previewTopics(S, weekId, md);
  if (!r.ok) return r;
  const now = at || S.settings.demoNow;
  const rows = topicsOf(S, weekId);
  r.topics.forEach((p, k) => {
    let row = rows[k];
    if (!row) { row = { id: uniqueTopicId(S, w, k + 1), weekId, order: k + 1, currentVersion: null, versions: [] }; S.topics.push(row); }
    if (sameTopicContent(topicCurrent(row), p)) return;
    const n = row.versions.length + 1;
    row.versions.push({ n, title: p.title, text: p.text, fields: clone(p.fields), words: p.words, hasCase: p.hasCase, createdAt: now, reason: n === 1 ? 'imported' : 'reimported' });
    row.currentVersion = n;
  });
  rows.slice(r.topics.length).forEach(row => dropTopicRow(S, weekId, row));
  topicsOf(S, weekId).forEach((row, i) => { row.order = i + 1; });
  ensureCells(S, weekId);
  refreshSlotFlags(S, weekId);
  S.topicFiles = (S.topicFiles || []).filter(f => f.weekId !== weekId);
  S.topicFiles.push({ weekId, md: r.normalized.md, rawMd: r.normalized.changed ? String(md) : undefined, title: r.title, theme: r.theme, context: r.context, importedAt: now, warnings: r.warnings });
  const ch = r.changes;
  log(S, 'import', 'topics', weekId, `${r.topics.length} Topic · đổi ${ch.changed.length}, thêm ${ch.added.length}, bớt ${ch.removed.length}`);
  return r;
}
// ---- Nạp thêm Topic (mục 10.51): xếp Topic của tệp mới xuống cuối tuần, không đụng Topic đang có ----
export const topicFieldLines = f => [['Thông điệp chính', 'message'], ['Đối tượng', 'audience'], ['Góc nhìn', 'angle']].filter(([, k]) => f && f[k]).map(([n, k]) => `${n}: ${f[k]}`);
export function previewAddTopics(S, weekId, md) {
  const n = normalizeTopicMd(S, md);
  const r = Object.assign(parseTopics(n.md), { normalized: n });
  if (r.errors.length) return Object.assign({ ok: false }, r);
  const rows = topicsOf(S, weekId);
  const add = [], skipped = [];
  r.topics.forEach(p => { (rows.some(row => sameTopicContent(topicCurrent(row), p)) ? skipped : add).push(p); });
  if (rows.length + add.length > TOPIC_MAX) {
    return Object.assign({ ok: false }, r, { errors: [{ text: `Tuần đã có ${rows.length} Topic, thêm ${add.length} sẽ vượt tối đa ${TOPIC_MAX}. Hủy bớt Topic hoặc nạp ít hơn.` }] });
  }
  if (!add.length) return Object.assign({ ok: false }, r, { errors: [{ text: 'Mọi Topic trong tệp đã có trong tuần (trùng tên và nội dung), không có gì để thêm.' }] });
  return Object.assign({ ok: true }, r, { add, skipped, total: rows.length + add.length });
}
export function addTopics(S, weekId, md, at) {
  const w = weekOf(S, weekId);
  if (!w) return { ok: false, errors: [{ text: 'Không tìm thấy tuần.' }] };
  if (isLocked(S, weekId)) return { ok: false, errors: [{ text: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' }] };
  const r = previewAddTopics(S, weekId, md);
  if (!r.ok) return r;
  const now = at || S.settings.demoNow;
  r.add.forEach(p => {
    const k = topicsOf(S, weekId).length + 1;
    S.topics.push({ id: uniqueTopicId(S, w, k), weekId, order: k, currentVersion: 1, versions: [{ n: 1, title: p.title, text: p.text, fields: clone(p.fields), words: p.words, hasCase: p.hasCase, createdAt: now, reason: 'imported' }] });
  });
  ensureCells(S, weekId);
  refreshSlotFlags(S, weekId);
  const block = r.add.map(p => [`## ${p.title}`, ...topicFieldLines(p.fields), '', p.text].join('\n')).join('\n\n');
  const old = topicFileOf(S, weekId);
  if (old) {
    old.md = `${String(old.md || '').trimEnd()}\n\n${block}\n`; old.rawMd = undefined;
    if (!old.context && r.context) old.context = r.context;
    if (!old.title && r.title) old.title = r.title;
    if (!old.theme && r.theme) old.theme = r.theme;
    old.warnings = (old.warnings || []).concat(r.warnings);
  } else {
    S.topicFiles = (S.topicFiles || []).concat([{ weekId, md: `${block}\n`, title: r.title, theme: r.theme, context: r.context, importedAt: now, warnings: r.warnings }]);
  }
  log(S, 'import', 'topics', weekId, `thêm ${r.add.length} Topic${r.skipped.length ? `, bỏ qua ${r.skipped.length} trùng` : ''}`);
  return r;
}
function dropTopicRow(S, weekId, row) {
  const ids = new Set(cellsOf(S, weekId).filter(c => c.topicId === row.id).map(c => c.id));
  weekSlots(S, weekId).forEach(s => { if (s.sourceCellId && ids.has(s.sourceCellId)) clearSlotContent(s); });
  S.cells = S.cells.filter(c => !ids.has(c.id));
  S.topics = S.topics.filter(x => x.id !== row.id);
}
export function topicImpact(S, weekId, topicId) {
  const cells = cellsOf(S, weekId).filter(c => c.topicId === topicId);
  const ids = new Set(cells.map(c => c.id));
  return { cells: cells.length, cellsWithContent: cells.filter(c => c.gens.length).length, slots: weekSlots(S, weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId)).length };
}
// Hủy Topic: bỏ hàng, các ô của hàng; slot dùng ô đó về "Chưa có bài"
export function removeTopic(S, weekId, topicId) {
  const row = byId(S.topics, topicId);
  if (!row || row.weekId !== weekId) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  const impact = topicImpact(S, weekId, topicId);
  dropTopicRow(S, weekId, row);
  topicsOf(S, weekId).forEach((r, i) => { r.order = i + 1; });
  log(S, 'remove', 'topic', topicId);
  return { ok: true, impact };
}
export function slotWarnings(S, slot) {
  if (!slot.text) return [];
  const f = byId(S.formats, slot.formatId); if (!f) return [];
  const cell = slot.sourceCellId ? byId(S.cells, slot.sourceCellId) : null;
  const src = cell ? cellView(S, cell).text : '';
  const ws = checkRules(f.layout === 'article' ? blogPlain(slot.text) : slot.text, Object.assign(ruleCtxBase(S), {
    kind: 'slot', rules: f.hardRules, structure: f.structure, layout: f.layout, channel: byId(S.channels, f.channelId), sourceNumbers: extractNumbers(src),
    slideCount: slot.free ? slot.assets.filter(a => a.versions.some(v => v.n === a.current)).length : null, // M-11
  }));
  return ws.concat(imageIssues(S, slot).map(x => ({ id: 'IMG-01', level: 'warn', text: x.text }))); // ảnh sai tỉ lệ hoặc nhỏ (mục 10.42)
}

// ---- Chia bài (DST-01..07) ----
// Điều kiện bật nút: tuần có slot; có Topic; không còn ô Trống hoặc Chưa duyệt; ≥ 1 ô Đã duyệt; còn slot chưa có bài
export function dealGate(S, weekId) {
  const reasons = [];
  const w = weekOf(S, weekId);
  if (!w) return { ok: false, reasons: ['Chưa lập tuần'], willFill: 0 };
  if (w.status === 'CONFIRMED') reasons.push('Tuần đã chốt');
  const sc = slotCounts(S, weekId);
  if (!sc.total) reasons.push('Chưa có slot (Lập tuần trước)');
  const rows = topicsOf(S, weekId).filter(r => topicCurrent(r));
  if (!rows.length) reasons.push('Chưa có Topic');
  else {
    const mc = matrixCounts(S, weekId);
    if (mc.EMPTY) reasons.push(`${mc.EMPTY} ô chưa viết`);
    if (mc.DRAFT) reasons.push(`${mc.DRAFT} ô chưa duyệt`);
    if (!mc.EMPTY && !mc.DRAFT && !mc.APPROVED) reasons.push('Chưa có ô nào được duyệt');
  }
  if (sc.total && !sc.EMPTY) reasons.push('Mọi slot đã có bài');
  return { ok: !reasons.length, reasons, willFill: sc.EMPTY };
}
// Mỗi Cột (thứ tự c) xếp slot theo thời gian (k = 0, 1, …); slot k ưu tiên Topic (c + k) mod N, lùi sang Topic kế tiếp theo vòng;
// trong các ô Đã duyệt ứng viên, chọn ô đang nuôi ít slot nhất (hòa thì giữ thứ tự vòng) để hạn chế lặp (DST-02).
export function dealSlots(S, weekId, at) {
  const gate = dealGate(S, weekId);
  if (!gate.ok) return { ok: false, reasons: gate.reasons };
  const w = weekOf(S, weekId);
  const rows = topicsOf(S, weekId).filter(r => topicCurrent(r));
  const N = rows.length; const written = [];
  const usage = new Map();
  S.slots.filter(s => s.weekId === weekId && s.sourceCellId).forEach(s => usage.set(s.sourceCellId, (usage.get(s.sourceCellId) || 0) + 1));
  [...new Set(w.columnIds)].forEach((colId, c) => {
    weekSlots(S, weekId).filter(s => { const f = byId(S.formats, s.formatId); return f && !s.free && slotColumnId(S, s) === colId; }).forEach((s, k) => {
      if (s.state !== 'EMPTY' || s.sourceCellId || s.free) return;
      let best = null;
      for (let t = 0; t < N; t++) {
        const tid = rows[(c + k + t) % N].id;
        cellsOf(S, weekId).filter(x => x.topicId === tid && x.columnId === colId && cellView(S, x).state === 'APPROVED').forEach(cell => { // mọi vị trí cùng loại Cột
          const u = usage.get(cell.id) || 0;
          if (!best || u < best.u) best = { cell, u };
        });
      }
      if (!best) return;
      writeSlotFromCell(S, s, best.cell, at);
      usage.set(best.cell.id, best.u + 1); written.push(s.id);
    });
  });
  w.dealtAt = at || S.settings.demoNow;
  const empty = weekSlots(S, weekId).filter(s => s.state === 'EMPTY').map(s => s.id);
  log(S, 'deal', 'week', weekId, `${written.length} viết, ${empty.length} trống`);
  return { ok: true, written, empty };
}
// Tạo bài cho một slot (mục 10.12): hướng thứ hai bên cạnh Chia bài, dùng khi thêm slot sau khi đã chia.
// Điều kiện: Cột của Format có ít nhất một ô Đã duyệt (của Topic còn hiệu lực). Chọn ô ít slot dùng nhất, hòa thì Topic đầu.
export function slotWriteGate(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, reason: 'Không tìm thấy slot.' };
  if (s.free) return { ok: false, reason: 'Slot tự do: bạn tự viết bài' };
  if (s.state === 'PUBLISHED') return { ok: false, reason: 'Bài đã đăng chỉ xem' };
  if (isLocked(S, s.weekId)) return { ok: false, reason: 'Tuần đã chốt' };
  const f = byId(S.formats, s.formatId); if (!f) return { ok: false, reason: 'Slot chưa có Format' };
  const live = new Set(topicsOf(S, s.weekId).filter(r => topicCurrent(r)).map(r => r.id));
  const cells = cellsOf(S, s.weekId).filter(c => c.columnId === slotColumnId(S, s) && live.has(c.topicId) && cellView(S, c).state === 'APPROVED');
  const col = byId(S.columns, slotColumnId(S, s));
  if (!cells.length) return { ok: false, reason: `Cột "${col ? col.name : slotColumnId(S, s)}" chưa có ô Đã duyệt (duyệt ô ở Matrix trước)`, cells };
  return { ok: true, reason: '', cells };
}
export function writeSlotNow(S, slotId, at) {
  const g = slotWriteGate(S, slotId); if (!g.ok) return { ok: false, error: g.reason + '.' };
  const s = byId(S.slots, slotId);
  const order = new Map(topicsOf(S, s.weekId).map(r => [r.id, r.order]));
  const use = c => S.slots.filter(x => x.id !== s.id && x.sourceCellId === c.id).length;
  const cell = g.cells.slice().sort((a, b) => use(a) - use(b) || (order.get(a.topicId) || 0) - (order.get(b.topicId) || 0))[0];
  writeSlotFromCell(S, s, cell, at);
  log(S, 'write-slot', 'slot', slotId, cell.id);
  return { ok: true, slot: s, cellId: cell.id };
}
export function composeAssetPrompt(cellPrompt, asset, i, total) {
  const part = total > 1 ? ` (ảnh ${i + 1}/${total})` : '';
  return `${cellPrompt} ${asset.name}${part}${asset.hint ? `: ${asset.hint}` : ''}`.replace(/\s+/g, ' ').trim();
}
export function writeSlotFromCell(S, slot, cell, at) {
  const view = cellView(S, cell);
  const f = byId(S.formats, slot.formatId);
  const row = byId(S.topics, cell.topicId);
  const tv = topicCurrent(row);
  const genN = (slot.genN || 0) + 1;
  const blog = isBlogSlot(S, slot);
  if (blog) { const seo = slotSeoOf(slot); if (!seo.keyword && tv) { seo.keyword = suggestKeyword(tv.title); seo.kwSource = 'suggest'; seo.kwConfirmed = false; } slot.seo = seo; } // Tuần mẫu chưa khai báo từ khoá: gợi ý từ Topic (mục 10.40)
  let mock = writeSlot(view.text, f, genN, tv);
  if (blog && mock) mock = seoWeave(mock, slot.seo.keyword);
  const ai = aiSlotText(S, slot, f, view.text, tv, mock, genN); // AI thật (mục 10.39)
  let text = ai ? ai.text : mock;
  if (blog && slot.text) text = keepBlogMedia(slot.text, text, blogMediaAssets(slot).map(x => x.a.bid)); // giữ ảnh/video đã chèn
  const sc = (ai && ai.score) || scoreText(text, f.criteria, `${slot.id}|${genN}`);
  const when = at || S.settings.demoNow;
  Object.assign(slot, { sourceCellId: cell.id, sourceStamp: view.stamp, text, prevText: slot.text || null, genN, curN: genN, emptyReason: '', scores: sc.scores, total: sc.total, tip: sc.tip, needsUpdate: false, keepReason: '' });
  slot.history = (slot.history || []).concat([Object.assign({ n: genN, text, createdAt: when, cellId: cell.id, stamp: view.stamp }, ai ? { ai: { provider: ai.provider, model: ai.model, scored: !!ai.score, ...skillTag(f) } } : {})]);
  if (ai) slot.ai = { provider: ai.provider, model: ai.model, scored: !!ai.score, ...skillTag(f) }; else delete slot.ai;
  if (slot.state !== 'PUBLISHED') slot.state = 'DRAFT';
  layoutSlotImages(S, slot, view.imagePrompt, at);
  if (blog) blogRefreshAuto(S, slot, ai && ai.seo);
  return slot;
}
// ---- Ảnh đi kèm bài (Chia bài tạo luôn ảnh): bố trí ô ảnh theo bài rồi Gen ----
// Carousel: mỗi slide một ảnh, chữ trên ảnh là chữ của slide. Mẫu ảnh-thẻ (trích dẫn, Đúng/Sai, bình chọn, điền chỗ trống,
// số liệu): chữ trên ảnh là câu chính của bài. Video: thumbnail/cảnh quay mang câu mở đầu. Blog: ảnh bìa mang tiêu đề.
function slotImagePlan(f, text, title) {
  const needs = f.assetNeeds || [];
  if (!needs.length) return [];
  const paras = paragraphsOf(text);
  const firstSent = s => splitSentences(s || '')[0] || '';
  if (f.layout === 'carousel') {
    const base = needs[0];
    return slidesOf(text).map((sl, i, arr) => ({ name: `Slide ${i + 1}/${arr.length}`, hint: base.prompt || '', caption: sl, place: i === 0 ? 'Bìa' : i === arr.length - 1 ? 'Slide cuối (CTA)' : `Slide ${i + 1}` }));
  }
  let caption = '';
  const k = f.kind || '';
  const q = /“([^”]+)”/.exec(text);
  if (k === 'fb-quote' || k === 'fb-fill') caption = q ? q[1] : firstSent(paras[0]);
  else if (k === 'fb-truefalse') caption = q ? `${q[1]}\nĐúng hay Sai?` : 'Đúng hay Sai?';
  else if (k === 'fb-poll') caption = paras[1] || firstSent(paras[0]);
  else if (k === 'fb-infographic') caption = (splitSentences(text).find(x => /\d/.test(x)) || '').replace(/^Theo [^:]+:\s*/, '');
  return needs.map((a, i) => {
    let cap = caption, place = 'Ảnh của bài';
    if (f.layout === 'article') { cap = title || ''; place = 'Ảnh bìa, đầu bài'; }
    else if (f.layout === 'longscript' || f.layout === 'script') {
      const hook = firstSent(String(text).replace(/^\s*\[[^\]]+\]\s*$/gm, '').trim());
      if (/thumbnail/i.test(a.name)) { cap = title || hook; place = 'Thumbnail'; } else { cap = hook; place = 'Cảnh mở đầu (3 giây đầu)'; }
    } else if (!cap) place = 'Ảnh của bài, dưới phần chữ';
    else place = 'Ảnh thẻ có chữ, dưới phần chữ';
    return { name: a.name, hint: a.prompt || '', caption: cap, place };
  });
}
function layoutSlotImages(S, slot, cellPrompt, at) {
  const f = byId(S.formats, slot.formatId); if (!f) return;
  const cell = slot.sourceCellId ? byId(S.cells, slot.sourceCellId) : null;
  const row = cell ? byId(S.topics, cell.topicId) : null;
  const plan = slotImagePlan(f, slot.text, row && topicCurrent(row) ? topicCurrent(row).title : '');
  const old = (slot.assets || []).filter(a => !a.blog); const blogMedia = (slot.assets || []).filter(a => a.blog); // ảnh/video chèn trong bài Blog giữ nguyên
  const changed = [];
  slot.assets = plan.map((p, i) => {
    const a = old[i] && (old[i].name === p.name || (f.layout === 'carousel' && /^Slide /.test(old[i].name))) ? old[i] : newAsset({ name: p.name, prompt: p.hint });
    a.name = p.name; a.hint = p.hint; a.caption = p.caption; a.place = p.place; a.cellPrompt = cellPrompt || '';
    const prompt = `${cellPrompt || ''} ${p.name}${p.hint ? `: ${p.hint}` : ''}.${p.caption ? ` Chữ trên ảnh: "${p.caption.replace(/\n/g, ' / ').replace(/^["“]+|["”]+$/g, '')}".` : ''}`.replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
    const mine = (a.versions.find(v => v.n === a.current) || {}).src; // ảnh người dùng tải lên thì giữ, không gen đè
    if (!mine && (!a.promptEdited && a.prompt !== prompt || !a.versions.length)) changed.push(i);
    if (!a.promptEdited) a.prompt = prompt;
    return a;
  }).concat(blogMedia);
  stampRatios(S, slot);
  if (!isLocked(S, slot.weekId)) changed.forEach(i => genSlotImage(S, slot.id, i, at));
}
// Các ô Đã duyệt cùng Cột với Format của slot (để đổi ô nguồn)
export function slotCellChoices(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return [];
  const f = byId(S.formats, s.formatId); if (!f) return [];
  return cellsOf(S, s.weekId).filter(c => c.columnId === slotColumnId(S, s) && cellView(S, c).state === 'APPROVED').map(c => ({
    cell: c, topic: byId(S.topics, c.topicId), usedBy: S.slots.filter(x => x.sourceCellId === c.id && x.id !== s.id).length, current: s.sourceCellId === c.id,
  })).sort((a, b) => a.topic.order - b.topic.order);
}
export function assignCell(S, slotId, cellId, at) {
  const s = byId(S.slots, slotId); const c = byId(S.cells, cellId);
  if (!s || !c) return { ok: false, error: 'Không tìm thấy slot hoặc ô.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const f = byId(S.formats, s.formatId);
  if (c.weekId !== s.weekId || !f || c.columnId !== slotColumnId(S, s)) return { ok: false, error: 'Ô phải cùng tuần và cùng Cột với slot.' };
  if (cellView(S, c).state !== 'APPROVED') return { ok: false, error: 'Chỉ chọn được ô Đã duyệt.' };
  writeSlotFromCell(S, s, c, at);
  log(S, 'assign-cell', 'slot', slotId, cellId);
  return { ok: true, slot: s };
}

// ---- Ảnh của slot (mô phỏng): mỗi lần Gen thêm một phiên bản; `current` là phiên bản đang chọn ----
export function assetRef(slot, a, n) { const v = a.versions.find(x => x.n === n); return `assets/${slot.weekId}/${slot.id}-${fold(a.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-v${n}.${v && v.src ? (v.ext || 'jpg') : 'png'}`; }
export function chooseSlotImage(S, slotId, idx, n) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a || !a.versions.some(v => v.n === n)) return { ok: false, error: 'Không có phiên bản ảnh này.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  a.current = n; a.done = true; a.ref = assetRef(s, a, n);
  return { ok: true };
}
// Sửa prompt của một ô ảnh (mục 10.11); prompt đã sửa tay được giữ khi slot viết lại
export function setSlotImagePrompt(S, slotId, idx, prompt) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const p = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!p) return { ok: false, error: 'Prompt không được để trống.' };
  if (p !== a.prompt) { a.prompt = p; a.promptEdited = true; log(S, 'edit-image-prompt', 'slot', slotId, a.name); }
  return { ok: true };
}
export function genSlotImage(S, slotId, idx, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  if (!a.prompt) return { ok: false, error: 'Ô ảnh chưa có prompt. Prompt đến từ ô khi Chia bài.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const n = a.versions.length + 1;
  a.versions.push({ n, seed: hash32(`${slotId}|${idx}|${n}|${a.prompt}`), createdAt: at || S.settings.demoNow });
  chooseSlotImage(S, slotId, idx, n);
  log(S, 'gen-image', 'slot', slotId, `${a.name} v${n}`);
  return { ok: true, version: n };
}

// Sửa ảnh theo yêu cầu (mô phỏng): tạo phiên bản mới từ ảnh do hệ thống tạo; ảnh/video người dùng tải lên thì không sửa được
export function editSlotImage(S, slotId, idx, instruction, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const cur = a.versions.find(v => v.n === a.current);
  if (!cur) return { ok: false, error: 'Ô chưa có ảnh để sửa.' };
  if (cur.src || cur.kind === 'video') return { ok: false, error: 'Chỉ sửa được ảnh do hệ thống tạo. Ảnh, video bạn tải lên thì tải bản mới thay thế.' };
  const ins = String(instruction || '').trim();
  if (!ins) return { ok: false, error: 'Nhập yêu cầu chỉnh ảnh.' };
  const n = a.versions.length + 1;
  a.versions.push({ n, seed: hash32(`${slotId}|${idx}|${n}|${cur.seed}|${ins}`), createdAt: at || S.settings.demoNow, edit: ins });
  chooseSlotImage(S, slotId, idx, n);
  log(S, 'edit-image', 'slot', slotId, `${a.name} v${n} · ${ins}`);
  return { ok: true, version: n };
}
// Slot tự do: thêm / bỏ ô ảnh hoặc video ngoài các ô của Format (mục 10.18)
export function addSlotAsset(S, slotId, kind) {
  const s = byId(S.slots, slotId);
  if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  if (!s.free) return { ok: false, error: 'Chỉ slot tự do mới thêm ô ảnh/video.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const video = kind === 'video';
  // Không nêu loại: ô media chung (nhận ảnh hoặc video tuỳ tệp tải lên)
  const n = kind ? s.assets.filter(a => a.extra && (a.kind === 'video') === video).length + 1 : s.assets.filter(a => a.extra).length + 1;
  const a = newAsset({ name: kind ? `${video ? 'Video' : 'Ảnh'} thêm ${n}` : `Media thêm ${n}`, prompt: '' });
  a.extra = true; a.kind = video ? 'video' : 'image';
  s.assets.push(a); stampRatios(S, s); log(S, 'add-asset', 'slot', slotId, a.name);
  return { ok: true, index: s.assets.length - 1 };
}
export function removeSlotAsset(S, slotId, idx) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  if (!a.extra && !s.free) return { ok: false, error: 'Chỉ bỏ được ô thêm; ô của Format giữ nguyên.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  s.assets.splice(idx, 1); log(S, 'remove-asset', 'slot', slotId);
  return { ok: true };
}
// Ảnh người dùng tải lên (mục 10.9): thành một phiên bản của ô ảnh, chọn ngay; không cần prompt
export function uploadSlotImage(S, slotId, idx, file, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const isVideo = /^data:video\//.test((file && file.src) || '');
  if (!file || !(isVideo || /^data:image\//.test(file.src || ''))) return { ok: false, error: 'Tệp không phải ảnh hoặc video.' };
  if (isVideo && !(s.free || a.kind === 'video' || a.blog)) return { ok: false, error: 'Video chỉ tải lên được ở slot tự do, ô video hoặc ảnh/video chèn trong bài Blog.' };
  const n = a.versions.length + 1;
  a.versions.push({ n, seed: hash32(`${slotId}|${idx}|${n}|upload`), createdAt: at || S.settings.demoNow, src: file.src, kind: isVideo ? 'video' : 'image', ext: isVideo ? ((/^data:video\/(\w+)/.exec(file.src) || [])[1] || 'mp4').replace('quicktime', 'mov') : 'jpg', fileName: String(file.name || (isVideo ? 'video' : 'anh')).slice(0, 120), w: file.w || 0, h: file.h || 0 });
  if (s.free || a.blog) a.kind = isVideo ? 'video' : 'image';
  chooseSlotImage(S, slotId, idx, n);
  log(S, 'upload-image', 'slot', slotId, `${a.name} v${n} · ${file.name || ''}`);
  return { ok: true, version: n };
}

// ---- Tiến độ 7 bước (mục 2.2) ----
export const STEP_NAMES = ['Lập tuần', 'Nạp Topic', 'Viết ma trận', 'Duyệt ô', 'Chia bài', 'Duyệt slot và ảnh', 'Xác nhận và xuất'];
export const STEP_COUNT = STEP_NAMES.length;
export function matrixCounts(S, weekId) {
  const counts = { EMPTY: 0, DRAFT: 0, APPROVED: 0, CANCELLED: 0, total: 0 };
  const live = new Set(topicsOf(S, weekId).filter(r => topicCurrent(r)).map(r => r.id));
  cellsOf(S, weekId).forEach(c => {
    if (!live.has(c.topicId)) return;
    counts[cellView(S, c).state]++; counts.total++;
  });
  return counts;
}
export function slotCounts(S, weekId) {
  const c = { EMPTY: 0, DRAFT: 0, APPROVED: 0, PUBLISHED: 0, needsUpdate: 0, total: 0 };
  weekSlots(S, weekId).forEach(s => { c[s.state]++; c.total++; if (s.needsUpdate) c.needsUpdate++; });
  return c;
}
export function imageCounts(S, weekId) {
  const r = { boxes: 0, done: 0 };
  weekSlots(S, weekId).forEach(s => s.assets.forEach(a => { r.boxes++; if (a.done) r.done++; }));
  return r;
}
export function weekProgress(S, weekId) {
  const w = weekOf(S, weekId);
  if (!w) return { steps: STEP_NAMES.map((name, i) => ({ n: i + 1, name, done: false, reason: i === 0 ? 'Tuần chưa có slot' : '' })), current: 1, allDone: false, mc: { EMPTY: 0, DRAFT: 0, APPROVED: 0, CANCELLED: 0, total: 0 }, sc: { EMPTY: 0, DRAFT: 0, APPROVED: 0, PUBLISHED: 0, needsUpdate: 0, total: 0 }, gate: dealGate(S, weekId) };
  const rows = topicsOf(S, weekId).filter(i => topicCurrent(i));
  const mc = matrixCounts(S, weekId);
  const sc = slotCounts(S, weekId);
  const ic = imageCounts(S, weekId);
  const written = rows.length > 0 && mc.total > 0 && mc.EMPTY === 0;
  const approved = written && mc.DRAFT === 0 && mc.APPROVED > 0;
  const dealt = sc.total > 0 && sc.EMPTY === 0;
  const st = [];
  st.push({ done: sc.total > 0, reason: sc.total ? '' : 'Tuần chưa có slot' });
  st.push({ done: rows.length > 0, reason: rows.length ? `${rows.length} Topic` : 'Chưa có Topic' });
  const nc = mc.EMPTY ? noCaseEmptyCount(S, weekId) : 0;
  st.push({ done: written, reason: rows.length && mc.EMPTY ? (mc.EMPTY > nc ? `${mc.EMPTY - nc}/${mc.total} ô chưa viết` : `${nc} ô Câu chuyện nên Hủy`) : '' });
  st.push({ done: approved, reason: written && mc.DRAFT ? `${mc.DRAFT} ô chưa duyệt` : '' });
  st.push({ done: dealt, reason: sc.EMPTY ? `${sc.EMPTY} slot chưa có bài` : '' });
  st.push({ done: dealt && sc.DRAFT === 0 && sc.needsUpdate === 0, reason: sc.needsUpdate ? `${sc.needsUpdate} slot cần cập nhật` : (dealt && sc.DRAFT ? `${sc.DRAFT} slot chưa duyệt${ic.boxes ? ` · ${ic.done}/${ic.boxes} ảnh` : ''}` : '') });
  st.push({ done: w.status === 'CONFIRMED', reason: w.status === 'REOPENED' ? 'Đang sửa' : (w.status === 'CONFIRMED' ? `Đã chốt · bản ${w.revision}` : '') });
  const steps = st.map((s, i) => Object.assign({ n: i + 1, name: STEP_NAMES[i] }, s));
  const firstOpen = steps.find(s => !s.done);
  return { steps, current: firstOpen ? firstOpen.n : STEP_COUNT, allDone: !firstOpen, mc, sc, ic, gate: dealGate(S, weekId) };
}

// ---- Việc tiếp theo (TOD-02) ----
export function nextAction(S, weekId) {
  if (!setupStatus(S).ok) return { label: 'Hoàn tất Thiết lập', detail: setupStatus(S).missing[0].text, target: { screen: 'setup' } };
  const w = weekOf(S, weekId);
  const p = weekProgress(S, weekId);
  if (p.allDone) {
    const due = weekSlots(S, weekId).filter(s => s.state !== 'PUBLISHED' && `${s.date}T${s.time}` <= S.settings.demoNow);
    const waiting = weekSlots(S, weekId).filter(s => s.state === 'APPROVED' && channelPublish(S, s.channelId).mode === 'auto').length;
    return due.length
      ? { label: `Đánh dấu đã đăng ${due.length} slot`, detail: 'Slot đăng thủ công đã đến giờ: đăng rồi dán link vào slot.', target: { screen: 'week', action: 'open-due' } }
      : { label: 'Tuần đã chốt', detail: `Lịch đã xác nhận, bản ${w.revision}.${waiting ? ` ${waiting} slot chờ tự đăng.` : ''}`, target: { screen: 'week' }, done: true };
  }
  const step = p.current;
  const map = {
    1: { label: 'Lập tuần: chọn Tuần mẫu', target: { screen: 'week', action: 'plan-week' } },
    2: { label: 'Nạp Topic', target: { screen: 'matrix' } },
    3: (() => { const n = writeQueue(S, weekId).length; return n ? { label: `Viết ma trận (${n} ô)`, target: { screen: 'matrix' } } : { label: `Hủy ${p.mc.EMPTY} ô Câu chuyện`, target: { screen: 'matrix' } }; })(),
    4: { label: `Duyệt ${p.mc.DRAFT} ô`, target: { screen: 'matrix' } },
    5: { label: `Chia bài (${p.sc.EMPTY} slot)`, target: { screen: 'matrix' } },
    6: { label: p.sc.needsUpdate ? `Cập nhật ${p.sc.needsUpdate} slot` : `Duyệt ${p.sc.DRAFT} slot`, target: { screen: 'week' } },
    7: { label: 'Xác nhận lịch', target: { screen: 'week', action: 'confirm-week' } },
  };
  return Object.assign({ step, detail: `Bước ${step}/${STEP_COUNT} · ${STEP_NAMES[step - 1]}` }, map[step]);
}

// ---- Chỉ số "Đăng đủ, đúng bài" (5.9) ----
export function weekKpi(S, weekId) {
  const slots = weekSlots(S, weekId); const now = S.settings.demoNow;
  const due = slots.filter(s => `${s.date}T${s.time}` <= now);
  const published = slots.filter(s => s.state === 'PUBLISHED');
  const ready = slots.filter(s => s.state === 'APPROVED' || s.state === 'PUBLISHED');
  const late = due.filter(s => s.state !== 'PUBLISHED');
  const tracking = published.length > 0;
  return {
    total: slots.length, ready: ready.length, due: due.length, published: published.length,
    asConfirmed: published.filter(s => s.pub && s.pub.asConfirmed).length, late, tracking,
    reach: published.reduce((n, s) => { const m = slotMetricsNow(S, s); return n + (m.status === 'ok' ? m.reach : 0); }, 0),
    eng: published.reduce((n, s) => { const m = slotMetricsNow(S, s); return n + (m.status === 'ok' ? m.eng : 0); }, 0),
  };
}
export function weekForDate(S, ymd) { const m = mondayOf(ymd); return S.weeks.find(w => w.startDate === m) || null; }

// ---- Sao lưu (SET-10) ----
export function exportBackup(S) {
  const state = clone(S); delete state.ui;
  const body = JSON.stringify(state);
  return JSON.stringify({ format: 'autocontent-backup', dataVersion: DATA_VERSION, createdAt: S.settings.demoNow, sha256: sha256(body), state }, null, 1);
}
export function importBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'Không đọc được JSON. Kiểm tra lại nội dung đã dán.' }; }
  if (!obj || obj.format !== 'autocontent-backup' || !obj.state) return { ok: false, error: 'Đây không phải tệp sao lưu AutoContent.' };
  if (obj.dataVersion !== DATA_VERSION) return { ok: false, error: `Bản sao lưu dùng phiên bản dữ liệu ${obj.dataVersion}; ứng dụng cần ${DATA_VERSION}.` };
  if (sha256(JSON.stringify(obj.state)) !== obj.sha256) return { ok: false, error: 'Checksum không khớp: nội dung đã bị sửa hoặc dán thiếu.' };
  const S = migrateState(obj.state); S.ui = { weekStart: null };
  const v = validateState(S);
  if (!v.ok) return { ok: false, error: `Dữ liệu không hợp lệ: ${v.error}` };
  return { ok: true, state: S };
}
export function validateState(S) {
  if (!S || typeof S !== 'object') return { ok: false, error: 'không phải đối tượng' };
  if (S.dataVersion !== DATA_VERSION) return { ok: false, error: `phiên bản ${S.dataVersion}` };
  for (const k of ['channels', 'columns', 'formats', 'weekTemplates', 'weeks', 'topicFiles', 'topics', 'cells', 'slots', 'audit']) {
    if (!Array.isArray(S[k])) return { ok: false, error: `thiếu danh sách ${k}` };
  }
  if (!S.brand || !S.voice || !S.settings) return { ok: false, error: 'thiếu brand/voice/settings' };
  return { ok: true };
}
// Đọc dữ liệu đã lưu: hỏng thì trả về rescue để cứu bản thô (UX-10)
export function loadStateFromRaw(raw) {
  if (raw == null) return { status: 'none' };
  try {
    const S = JSON.parse(raw);
    // Dữ liệu v2.5–v2.7 (Research/Idea hoặc Input, lịch mẫu phẳng) không chuyển tự động: trả về 'old' để cất bản thô và nạp demo mới (mục 4)
    const m = S && typeof S.dataVersion === 'string' && /^ac-edu-r([23])-/.exec(S.dataVersion);
    if (m) return { status: 'old', version: S.dataVersion, label: m[1] === '2' ? 'v2.6' : 'v2.7' };
    const v = validateState(S);
    if (!v.ok) return { status: 'corrupt', error: v.error };
    if (!S.ui) S.ui = { weekStart: null };
    migrateState(S);
    return { status: 'ok', state: S };
  } catch (e) { return { status: 'corrupt', error: 'JSON hỏng' }; }
}

// Nạp nhiều tệp Topic một lúc (10.63): sắp theo tên (số theo giá trị: topic-2 trước topic-10), ghép thành một văn bản.
// Tệp không có đề mục ## được gói thành 1 Topic, lấy tên từ dòng # hoặc từ tên tệp, để không dính vào Topic trước.
export function mergeTopicFiles(files) {
  const list = (files || []).filter(f => f && typeof f.text === 'string' && f.text.trim());
  const coll = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
  list.sort((a, b) => coll.compare(a.name, b.name));
  const order = []; const parts = [];
  list.forEach((f, i) => {
    let t = f.text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
    const lines = t.split('\n');
    const hasH2 = lines.some(l => /^##\s/.test(l));
    const h1 = lines.findIndex(l => /^#\s+\S/.test(l));
    const base = String(f.name || '').replace(/^.*[\\/]/, '').replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Topic ' + (i + 1);
    if (!hasH2) {
      const title = h1 >= 0 ? lines[h1].replace(/^#\s+/, '').trim() : base;
      if (h1 >= 0) lines.splice(h1, 1);
      t = `## ${title}\n\n${lines.join('\n').trim()}`;
      order.push({ name: f.name, title });
    } else {
      if (i > 0 && h1 >= 0) lines.splice(h1, 1);   // chỉ tệp đầu giữ tiêu đề # và Bối cảnh chung
      t = lines.join('\n').trim();
      order.push({ name: f.name, title: (lines.find(l => /^##\s/.test(l)) || '').replace(/^##\s+/, '').trim() });
    }
    parts.push(t);
  });
  return { text: parts.join('\n\n'), order };
}
