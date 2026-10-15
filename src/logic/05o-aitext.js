// ---------- Viết bài bằng AI thật (mục 10.39) ----------
import { clone } from './01-util.js';
import { byId, cellView, log } from './05-model.js';
import { columnLayoutGuide, topicDirection } from './05g-format.js';
import { AI_OPS, HOOK_KINDS, snippetsFor } from './05k-assist.js';
import { parseImageResponse } from './05n-media.js';
import { blogAiBrief, isBlogSlot } from './05p-blogseo.js';
import { skillBlock, skillOwnerOf } from './05r-skill.js';
// Logic vẫn đồng bộ: giao diện chạy thử thao tác trên bản sao S để biết những ô/slot sẽ được viết (aiPlan),
// gọi AI cho từng việc, gửi kết quả vào setAiText, rồi chạy thao tác thật. Viết ô/slot lấy kết quả AI (takeAiText)
// thay cho bộ ghép mô phỏng; việc nào AI lỗi thì dùng bản mô phỏng như cũ.

export const TEXT_PROVIDERS = {
  off: { label: 'Mô phỏng (không gọi API)' },
  claudeai: { label: 'Claude của claude.ai (không cần khoá, chạy trong artifact)', model: '', endpoint: 'claude.ai', key: false, sample: true },
  anthropic: { label: 'Anthropic Claude', model: 'claude-sonnet-5-5', light: 'claude-haiku-5-5', endpoint: 'https://api.anthropic.com/v1', key: true },
  openai: { label: 'OpenAI', model: 'gpt-4.1-mini', light: '', endpoint: 'https://api.openai.com/v1', key: true },
  custom: { label: 'Máy chủ riêng', model: '', endpoint: '', key: false },
};
export function textApiOf(S) {
  const c = Object.assign({ provider: 'off', model: '', endpoint: '', lightModel: '' }, S.textApi || {});
  const p = TEXT_PROVIDERS[c.provider] || TEXT_PROVIDERS.off;
  return Object.assign(c, { model: c.model || p.model || '', endpoint: c.endpoint || p.endpoint || '' });
}
// Cấu hình gọi cho một loại việc: việc nhẹ (Sửa đoạn, Hook, CTA) dùng model nhẹ nếu đã khai báo, không thì dùng model chính (mục 10.44)
export function textCfgFor(S, light) { const c = textApiOf(S); return light && c.lightModel ? Object.assign({}, c, { model: c.lightModel }) : c; }
export function textApiOn(S) { return textApiOf(S).provider !== 'off'; }
export function setTextApi(S, patch) {
  const old = textApiOf(S); const P = patch || {};
  const c = Object.assign({}, old, P);
  if (!TEXT_PROVIDERS[c.provider]) return { ok: false, error: 'Nhà cung cấp không hợp lệ.' };
  if (P.provider && P.provider !== old.provider) { const d = TEXT_PROVIDERS[P.provider]; if (P.endpoint == null) c.endpoint = d.endpoint || ''; if (P.model == null) c.model = d.model || ''; if (P.lightModel == null) c.lightModel = d.light || ''; }
  const ep = c.provider === 'claudeai' ? 'claude.ai' : String(c.endpoint || '').trim().replace(/\/+$/, '');
  if (c.provider !== 'off') {
    if (c.provider === 'claudeai') { /* không có địa chỉ API */ } else {
    if (!/^https:\/\/[^\s/]+/i.test(ep) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(ep)) return { ok: false, error: 'Địa chỉ API phải bắt đầu bằng https:// (hoặc http://localhost khi thử trên máy).' };
    if (c.provider !== 'custom' && !String(c.model || '').trim()) return { ok: false, error: 'Nhập tên model.' };
    }
  }
  S.textApi = { provider: c.provider, model: String(c.model || '').trim().slice(0, 60), endpoint: ep, lightModel: c.provider === 'off' || c.provider === 'custom' || c.provider === 'claudeai' ? '' : String(c.lightModel || '').trim().slice(0, 60) };
  log(S, 'text-api', 'settings', c.provider, c.provider === 'off' ? 'mô phỏng' : `${c.provider} · ${S.textApi.model}`);
  return { ok: true, api: textApiOf(S) };
}
export function buildTextRequest(cfg, key, req) {
  const p = TEXT_PROVIDERS[cfg.provider];
  if (!p || cfg.provider === 'off') return { ok: false, error: 'Chưa bật AI viết bài (Setup → Kết nối AI).' };
  if (p.key && !String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API cho AI viết bài (Setup → Kết nối AI).' };
  const k = String(key || '').trim(); const max = req.maxTokens || 4000;
  if (cfg.provider === 'anthropic') return { ok: true, url: `${cfg.endpoint}/messages`, headers: { 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, json: { model: cfg.model, max_tokens: max, system: req.system, messages: [{ role: 'user', content: req.user }] } };
  if (cfg.provider === 'openai') return { ok: true, url: `${cfg.endpoint}/chat/completions`, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }, json: { model: cfg.model, messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }] } };
  return { ok: true, url: cfg.endpoint, headers: Object.assign({ 'Content-Type': 'application/json' }, k ? { Authorization: `Bearer ${k}` } : {}), json: { system: req.system, user: req.user, model: cfg.model || undefined, max_tokens: max } };
}
export function parseTextResponse(provider, status, body) {
  if (status >= 400 || !body) return parseImageResponse(provider, status || 500, body || {});
  let t = '';
  if (provider === 'anthropic') t = (body.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  else if (provider === 'openai') t = ((body.choices || [])[0] || {}).message ? body.choices[0].message.content : '';
  else t = body.text || body.output || '';
  t = String(t || '').trim();
  if (provider === 'anthropic' && body.stop_reason === 'refusal') return { ok: false, error: 'AI từ chối viết nội dung này.' };
  return t ? { ok: true, text: t, cut: body.stop_reason === 'max_tokens' || ((body.choices || [])[0] || {}).finish_reason === 'length' } : { ok: false, error: 'AI không trả về chữ.' };
}
// Lấy khối JSON trong câu trả lời (AI đôi khi bọc trong ```json)
export function extractJson(raw) {
  const s = String(raw || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

// ---- Kết quả AI chờ dùng (khoá "cell:<id>:<n>" hoặc "slot:<id>:<genN>") ----
const AI_TEXT = new Map();
let AI_REC = null;
export function setAiText(key, val) { AI_TEXT.set(key, val); }
export function takeAiText(key) { const v = AI_TEXT.get(key); AI_TEXT.delete(key); return v || null; }
export function clearAiText() { AI_TEXT.clear(); }
// Chạy thử thao tác trên bản sao để biết việc cần AI viết; trả danh sách {key, kind, label, system, user, criteria}
export function aiPlan(S, run) {
  const C = clone(S); AI_REC = [];
  try { run(C); } catch (e) { /* thao tác lỗi thì không có việc */ }
  const jobs = AI_REC; AI_REC = null; return jobs;
}
// Áp điểm AI theo tiêu chí; thiếu tiêu chí nào thì trả null để dùng điểm mô phỏng
export function aiScore(criteria, sc, tip) {
  if (!sc || typeof sc !== 'object' || !(criteria || []).length) return null;
  const scores = criteria.map(c => { const v = Math.round(Number(sc[c.id])); return v >= 1 && v <= 5 ? { criterionId: c.id, score: v } : null; });
  if (scores.some(x => !x)) return null;
  const total = Math.round(criteria.reduce((s, c, i) => s + c.weight * scores[i].score / 5, 0));
  return { scores, total, tip: String(tip || '').trim().slice(0, 200) || 'Giữ nguyên; bài đã cân đối.' };
}
// Gỡ rào ```json và lấy chữ trong khoá "text" của JSON hỏng/cụt; closed=false nghĩa là chuỗi chưa đóng (bài bị cắt)
export function salvageJsonText(raw) {
  const s = String(raw || ''); const m = /"text"\s*:\s*"/.exec(s); if (!m) return null;
  const esc = { n: '\n', t: '\t', r: '', '"': '"', '\\': '\\', '/': '/' };
  let i = m.index + m[0].length, out = '', closed = false;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      const n = s[i + 1]; if (n === undefined) break;
      if (n === 'u') { const h = s.slice(i + 2, i + 6); if (/^[0-9a-fA-F]{4}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 6; continue; } break; }
      out += n in esc ? esc[n] : n; i += 2; continue;
    }
    if (c === '"') { closed = true; break; }
    out += c; i++;
  }
  return { text: out, closed };
}
// Bài không phải JSON mà dừng ngay ở một đề mục thì coi là bị cắt
const endsOnHeading = t => /^\s*#{1,6}\s/.test(String(t || '').trim().split('\n').pop());
// Đọc bài AI viết: JSON {text, imagePrompt, scores, tip}; JSON hỏng thì cứu phần chữ; không phải JSON thì coi cả câu trả lời là bài.
// cut=true khi bài có vẻ chưa viết xong (giao diện sẽ xin viết tiếp)
export function parseAiPost(raw, criteria) {
  const j = extractJson(raw); let text, cut = false;
  if (j) text = typeof j.text === 'string' ? j.text : '';
  else {
    const sv = /^\s*(```|\{)/.test(String(raw || '')) || /"text"\s*:\s*"/.test(String(raw || '')) ? salvageJsonText(raw) : null;
    if (sv) { text = sv.text; cut = !sv.closed; }
    else { text = String(raw || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, ''); cut = endsOnHeading(text); }
  }
  const t = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!t) return { ok: false, error: 'AI không trả về bài viết.' };
  if (!cut && endsOnHeading(t)) cut = true;
  const seo = j && j.seo && typeof j.seo === 'object' ? ['seoTitle', 'metaDescription', 'excerpt', 'coverAlt'].reduce((o, k) => { if (typeof j.seo[k] === 'string' && j.seo[k].trim()) o[k] = j.seo[k].replace(/\s+/g, ' ').trim().slice(0, 400); return o; }, {}) : null;
  return { ok: true, text: t, cut, imagePrompt: j && typeof j.imagePrompt === 'string' ? j.imagePrompt.trim().slice(0, 600) : '', score: j ? aiScore(criteria, j.scores, j.tip) : null, seo: seo && Object.keys(seo).length ? seo : null };
}

// ---- Dựng lời nhắn cho AI ----
function rulesLine(r, unit) {
  const u = (r.lengthUnit || unit) === 'words' ? 'chữ' : 'ký tự';
  return [r.min || r.max ? `Độ dài: ${r.min ? 'tối thiểu ' + r.min : ''}${r.min && r.max ? ', ' : ''}${r.max ? 'tối đa ' + r.max : ''} ${u}.` : '',
    r.slideMin ? `Số slide: ${r.slideMin}–${r.slideMax || r.slideMin}, mỗi slide tối đa ${r.wordsPerSlideMax || 40} chữ.` : '',
    r.hashtagMax != null ? `Hashtag: tối đa ${r.hashtagMax}.` : '', r.requireCta ? 'Bắt buộc có lời kêu gọi hành động ở cuối.' : ''].filter(Boolean).join('\n');
}
export function aiSystem(S) {
  const banned = [...(S.settings.hypeWords || [])].join(', ');
  return [
    'Bạn là người viết content mạng xã hội cho thương hiệu dưới đây. Viết tiếng Việt tự nhiên, đúng giọng văn, câu ngắn dễ đọc trên điện thoại.',
    'Chỉ dùng số liệu, nguồn và sự thật có trong Topic hoặc hồ sơ thương hiệu. Không bịa số liệu, tên người, tên tổ chức.',
    S.settings.writingRules ? `# Quy tắc viết chung\n${String(S.settings.writingRules).trim()}` : '',
    banned ? `Không dùng các từ phóng đại: ${banned}.` : '',
    `# Hồ sơ thương hiệu\n${S.brand.md || '(chưa có)'}`, `# Giọng văn\n${S.voice.md || '(chưa có)'}`,
    'Trả lời bằng đúng một khối JSON, không thêm chữ nào khác: {"text": "bài viết hoàn chỉnh", "imagePrompt": "mô tả ảnh minh hoạ (tiếng Việt, một câu)", "scores": {"<mã tiêu chí>": 1-5}, "tip": "một gợi ý cải thiện ngắn"}. Chấm điểm trung thực theo các tiêu chí được nêu.',
  ].filter(Boolean).join('\n\n');
}
const withSkill = (S, ctx, sys) => { const o = skillOwnerOf(S, ctx); const b = o ? skillBlock(o, `Chỉ dẫn của ${o.layout ? 'Format' : 'Cột'} "${o.name}"`) : ''; return b ? `${sys}\n\n${b}` : sys; };
const criteriaText = cr => (cr || []).map(c => `- ${c.id}: ${c.name} (trọng số ${c.weight})`).join('\n');
// Các vị trí khác cùng loại Cột, cùng Topic đã có bài (10.53): nhắc AI chọn góc khác để không viết trùng
function siblingNote(S, cell) {
  const sib = S.cells.filter(c => c.id !== cell.id && c.weekId === cell.weekId && c.topicId === cell.topicId && c.columnId === cell.columnId)
    .map(c => cellView(S, c).text).filter(Boolean);
  return sib.length ? `# Bài khác của cùng Topic, cùng loại Cột (đã viết)\nMatrix có nhiều vị trí cùng loại Cột này. Hãy chọn ý chính, ví dụ và cách mở bài khác hẳn các bài dưới đây, không lặp lại.\n\n${sib.map((t, i) => `## Bài ${i + 1}\n${t.slice(0, 1200)}`).join('\n\n')}` : '';
}
function cellJob(S, cell, iv, col, context, mock, n) {
  const sk = skillBlock(col, `Chỉ dẫn viết cho Cột "${col.name}"`);
  const user = [`# Việc: viết bài cho Cột "${col.name}"`, sk || col.guideMd || '', col.structure && col.structure.length ? `Bố cục: ${col.structure.join(' → ')}. Mỗi phần mở bằng đề mục "## Tên phần".` : '', rulesLine(col.hardRules || {}),
    `# Khung trình bày\n${columnLayoutGuide(col)}`,
    `# Topic: ${iv.title}\n${topicDirection(iv) ? topicDirection(iv) + '\n\n' : ''}${iv.text}`, context ? `# Bối cảnh tuần\n${context}` : '',
    siblingNote(S, cell),
    sk ? '' : `# Bản nháp máy (chỉ để theo bố cục và độ dài; hãy viết lại hay hơn, không chép)\n${mock}`,
    n > 1 ? `Đây là lượt viết thứ ${n}: chọn góc mở bài khác các lượt trước.` : '',
    `# Tiêu chí chấm (1–5)\n${criteriaText(col.criteria)}`].filter(Boolean).join('\n\n');
  return { key: `cell:${cell.id}:${n}`, kind: 'cell', label: `${col.name} · ${iv.title}`, system: aiSystem(S), user, criteria: col.criteria || [] };
}
function slotJob(S, slot, f, cellText, iv, mock, n) {
  const ch = byId(S.channels, f.channelId) || {};
  const layoutHint = { carousel: 'Viết dạng "Slide 1: …", "Slide 2: …", mỗi slide một đoạn; slide 1 là bìa, slide cuối là CTA.', script: 'Viết kịch bản video ngắn, mỗi cảnh mở bằng nhãn trong ngoặc vuông như "[Hook · 0–3 giây]", "[CTA]".', longscript: 'Viết kịch bản video dài, các phần mở bằng nhãn trong ngoặc vuông có mốc giờ như "[Mở đầu · 0:00]".', article: 'Viết bài blog Markdown: "# Tiêu đề", các phần "## …".', post: 'Viết bài đăng mạng xã hội: đoạn ngắn, xuống dòng giữa các ý.' }[f.layout] || '';
  const sk = skillBlock(f, `Chỉ dẫn viết cho Format "${f.name}"`);
  const user = [`# Việc: chuyển bài gốc thành bài "${f.name}" cho kênh ${ch.name || ''}`, sk || f.guideMd || '', layoutHint,
    !sk && f.structure && f.structure.length ? `Bố cục: ${f.structure.join(' → ')}.` : '', rulesLine(f.hardRules || {}),
    ch.maxChars ? `Kênh giới hạn ${ch.maxChars} ký tự.` : '', ch.maxHashtags != null ? `Kênh cho tối đa ${ch.maxHashtags} hashtag.` : '',
    iv ? `# Topic: ${iv.title}` : '', isBlogSlot(S, slot) ? blogAiBrief(S, slot) : '', `# Bài gốc (đã duyệt)\n${cellText}`,
    sk ? '' : `# Bản nháp máy (chỉ để theo bố cục; hãy viết lại hay hơn)\n${mock}`,
    n > 1 ? `Đây là lượt viết thứ ${n}: thử cách mở bài khác.` : '',
    `# Tiêu chí chấm (1–5)\n${criteriaText(f.criteria)}`].filter(Boolean).join('\n\n');
  return { key: `slot:${slot.id}:${n}`, kind: 'slot', label: `${f.name} · ${slot.date} ${slot.time}`, system: aiSystem(S), user, criteria: f.criteria || [] };
}
// Gọi từ addCellGen / writeSlotFromCell: ghi việc khi đang chạy thử, lấy kết quả AI khi chạy thật
export function aiCellText(S, cell, iv, col, context, mock, n) {
  if (AI_REC) { AI_REC.push(cellJob(S, cell, iv, col, context, mock, n)); return null; }
  return takeAiText(`cell:${cell.id}:${n}`);
}
export function aiSlotText(S, slot, f, cellText, iv, mock, n) {
  if (AI_REC) { AI_REC.push(slotJob(S, slot, f, cellText, iv, mock, n)); return null; }
  return takeAiText(`slot:${slot.id}:${n}`);
}
// Sửa đoạn, hook, caption bằng AI: lời nhắn (trả lời là chữ hoặc JSON)
export function rewriteJob(S, text, op, instruction, ctx) {
  const what = op === 'custom' ? `Yêu cầu: ${instruction}` : `Cách sửa: ${AI_OPS[op] || op}.`;
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]) + '\n\nChỉ trả về đoạn đã sửa, không giải thích, không ngoặc kép bao quanh.', user: `${what}\n\n# Đoạn cần sửa\n${text}` };
}
export function hooksJob(S, text, ctx) {
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]), user: `Viết 5 câu mở đầu (hook) thay cho câu đầu của bài dưới đây, mỗi loại một câu: ${Object.entries(HOOK_KINDS).map(([k, v]) => `${k} (${v})`).join(', ')}. Mỗi câu tối đa 20 chữ.\nTrả về JSON: {"hooks": [{"kind": "question", "text": "…"}, …]}\n\n# Bài\n${text}` };
}
export function parseHooks(raw) {
  const j = extractJson(raw); const arr = j && Array.isArray(j.hooks) ? j.hooks : [];
  const out = Object.keys(HOOK_KINDS).map(k => { const h = arr.find(x => x && x.kind === k && x.text); return h ? { kind: k, label: HOOK_KINDS[k], text: String(h.text).trim(), simulated: false } : null; }).filter(Boolean);
  return out.length ? { ok: true, hooks: out } : { ok: false, error: 'AI không trả về hook đọc được.' };
}
export function captionsJob(S, text, ctx) {
  const tags = snippetsFor(S, ctx || {}, 'hashtag')[0]; const cta = snippetsFor(S, ctx || {}, 'cta')[0];
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]), user: `Viết 3 phương án caption cho bài dưới đây: ngắn (hook + CTA + hashtag), vừa (thêm 2 câu nội dung), đầy đủ (tới 6 câu). ${cta ? `CTA nên dùng: "${cta.text}".` : ''} ${tags ? `Hashtag: ${tags.text}.` : ''}\nTrả về JSON: {"captions": [{"kind": "short", "text": "…"}, {"kind": "medium", "text": "…"}, {"kind": "long", "text": "…"}]}\n\n# Bài\n${text}` };
}
export function parseCaptions(raw) {
  const j = extractJson(raw); const arr = j && Array.isArray(j.captions) ? j.captions : [];
  const L = { short: 'Ngắn', medium: 'Vừa', long: 'Đầy đủ' };
  const out = Object.keys(L).map(k => { const c = arr.find(x => x && x.kind === k && x.text); return c ? { kind: k, label: L[k], text: String(c.text).trim(), simulated: false } : null; }).filter(Boolean);
  return out.length ? { ok: true, captions: out } : { ok: false, error: 'AI không trả về caption đọc được.' };
}
