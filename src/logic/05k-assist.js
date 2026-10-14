// ---------- Trợ lý viết: sửa đoạn bằng AI, phương án hook/caption, thư viện hashtag & CTA (mục 10.35) ----------
import { clone, fold, hash32, pick, splitSentences } from './01-util.js';
import { byId, nextId } from './05-model.js';
// Sửa đoạn và phương án hook/caption là MÔ PHỎNG (biến đổi theo quy tắc, xác định theo đầu vào).
// Khi gắn AI thật: thay aiRewrite / hookOptions / captionOptions bằng gọi mô hình (qua máy chủ), giữ nguyên dạng trả về.

export const AI_OPS = {
  short: 'Ngắn lại', long: 'Viết dài hơn', casual: 'Thân mật hơn', formal: 'Trang trọng hơn',
  cta: 'Thêm lời kêu gọi', emoji: 'Thêm emoji', hook: 'Mở bài hấp dẫn hơn', fix: 'Sửa chính tả, dấu câu',
};
// Từ ngữ trang trọng ↔ thân mật (đổi hai chiều)
const TONE_PAIRS = [['sử dụng', 'dùng'], ['tuy nhiên', 'nhưng'], ['do đó', 'vì vậy'], ['thực hiện', 'làm'], ['bởi vì', 'vì'], ['hãy', 'cứ'], ['rất nhiều', 'cả đống'], ['nhanh chóng', 'nhanh gọn'], ['vô cùng', 'cực kỳ']];
const EMOJI_BY_WORD = [['nói', '🗣️'], ['nghe', '🎧'], ['học', '📚'], ['bước', '👣'], ['ngày', '📅'], ['họp', '💼'], ['mẹo', '💡'], ['sai', '⚠️'], ['đúng', '✅'], ['thử', '🔥'], ['cà phê', '☕'], ['ghi âm', '🎙️']];
const AI_FILLERS = ['Điều quan trọng là bắt đầu nhỏ và làm đều mỗi ngày.', 'Bạn có thể thử ngay trong tuần này để thấy khác biệt.', 'Nhiều người bỏ qua bước này, nhưng chính nó tạo ra thay đổi.', 'Cứ làm chậm mà chắc, kết quả sẽ tự đến.'];
export const DEFAULT_CTAS = ['Lưu bài để làm theo và bình luận "xong" khi bạn thử nhé.', 'Bạn đã thử cách này chưa? Kể cho mình nghe dưới bình luận nhé.', 'Chia sẻ cho một người bạn cũng đang cần nhé.'];

const capFirst = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
const lowFirst = t => t && !/^[A-ZĐ]{2,}/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
function swapWords(text, pairs, dir) {
  let out = text;
  pairs.forEach(([a, b]) => { const [from, to] = dir ? [a, b] : [b, a]; out = out.replace(new RegExp(`(^|[^\\p{L}])(${from})(?=[^\\p{L}]|$)`, 'giu'), (m, pre, w) => pre + (w[0] === w[0].toUpperCase() ? capFirst(to) : to)); });
  return out;
}
// Đoán thao tác từ yêu cầu tự do
export function aiOpsOf(instruction) {
  const p = fold(instruction || ''); const ops = [];
  if (/ngan|gon|rut/.test(p)) ops.push('short');
  if (/dai|chi tiet|them y/.test(p)) ops.push('long');
  if (/than mat|gan gui|vui|tre/.test(p)) ops.push('casual');
  if (/trang trong|chuyen nghiep|lich su/.test(p)) ops.push('formal');
  if (/cta|keu goi|binh luan|luu bai/.test(p)) ops.push('cta');
  if (/emoji|icon|bieu tuong/.test(p)) ops.push('emoji');
  if (/hook|mo bai|cau dau/.test(p)) ops.push('hook');
  if (/chinh ta|dau cau|loi/.test(p)) ops.push('fix');
  return ops;
}
// Sửa một đoạn theo thao tác (mô phỏng). n: lần thử, đổi n cho cách viết khác.
export function aiRewrite(text, op, opts) {
  const o = opts || {}; const n = o.n || 0; let t = String(text || '');
  const ops = op === 'custom' ? aiOpsOf(o.instruction) : [op];
  if (!t.trim()) return { ok: false, error: 'Chọn hoặc viết một đoạn để sửa.' };
  if (!ops.length) ops.push(['casual', 'short', 'hook'][n % 3]); // yêu cầu chưa nhận ra: thử một cách gần nhất
  const pick = (arr, salt) => arr[(hash32(`${salt}|${t}`) + n) % arr.length];
  ops.forEach(k => {
    if (k === 'short') {
      const ss = splitSentences(t); const keep = Math.max(1, Math.ceil(ss.length * 0.6) - (n % 2));
      t = ss.length > 1 ? ss.slice(0, keep).join(' ') : t.replace(/\s*\([^)]*\)/g, '').replace(/,\s*[^,.!?]+(?=[.!?]?$)/, '');
    }
    if (k === 'long') t = `${t.replace(/\s+$/, '')} ${pick(AI_FILLERS, 'long')}`;
    if (k === 'casual') { t = swapWords(t, TONE_PAIRS, true); if (!/(nhé|nha|nè)[.!?]?\s*$/.test(t)) t = t.replace(/([.!?])?\s*$/, (m, p1) => ` nhé${p1 === '?' ? '?' : '!'}`); }
    if (k === 'formal') { t = swapWords(t, TONE_PAIRS, false).replace(/\s?[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?/gu, '').replace(/\s*(nhé|nha|nè)(?=[.,!?]|\s*$)/g, '').replace(/[ \t]+$/gm, ''); if (!/[.!?]$/.test(t)) t += '.'; }
    if (k === 'cta') t = `${t.replace(/\s+$/, '')}\n\n${o.cta || pick(DEFAULT_CTAS, 'cta')}`;
    if (k === 'emoji') {
      t = t.split('\n').map(line => { if (!line.trim() || /^\s*#/.test(line)) return line; const f = fold(line); const hit = EMOJI_BY_WORD.find(([w]) => f.includes(fold(w))); return hit && !line.includes(hit[1]) ? `${hit[1]} ${line}` : line; }).join('\n');
      if (!/[\u{1F300}-\u{1FAFF}]/u.test(t)) t = `${pick(['✨', '👉', '💡'], 'emo')} ${t}`;
    }
    if (k === 'hook') { const h = hookOptions(t, { n })[n % 5]; t = replaceHook(t, h.text); }
    if (k === 'fix') {
      t = t.replace(/[ \t]+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[^\s\d"'”)\n])/g, '$1 ')
        .replace(/(^|[^\p{L}])(\p{L}+) \2(?=[^\p{L}]|$)/giu, '$1$2').replace(/(^|[.!?]\s+|\n)(\p{Ll})/gu, (m, a, c) => a + c.toUpperCase());
    }
  });
  return { ok: true, text: t, ops, simulated: true };
}

// ---- Phương án hook ----
export const HOOK_KINDS = { question: 'Câu hỏi', number: 'Con số', surprise: 'Bất ngờ', story: 'Câu chuyện', benefit: 'Lợi ích' };
// Ý chính của bài: câu đầu, bỏ nhãn đoạn, hashtag, dấu chấm cuối
export function coreIdea(text) {
  const line = String(text || '').split('\n').map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s+|Slide\s*\d+:|[-*•]\s+)/i, '').trim()).find(l => l && !/^#\S/.test(l)) || '';
  let c = (splitSentences(line)[0] || line).replace(/\*\*/g, '').replace(/[.!?:…]+$/, '').trim();
  const head = c.split(/:\s/)[0]; if (head.length >= 12 && head !== c) c = head; // "Chủ đề: chi tiết" → lấy chủ đề
  if (c.length > 70) { const k = c.indexOf(', '); if (k >= 12) c = c.slice(0, k); }
  return c;
}
export function hookOptions(text, opts) {
  const n = (opts && opts.n) || 0; const core = coreIdea(text); const lc = lowFirst(core);
  const num = (String(text).match(/\b(\d{1,3})\b/) || [])[1] || '3';
  const T = {
    question: [`Vì sao ${lc} lại quan trọng đến vậy?`, `${capFirst(lc)}: bạn đã làm đúng chưa?`],
    number: [`${num} điều ít ai nói với bạn về ${lc}.`, `Chỉ ${num} phút để hiểu đúng về ${lc}.`],
    surprise: [`Sự thật bất ngờ về ${lc}.`, `Đừng làm theo lời khuyên cũ về ${lc}.`],
    story: [`Tuần trước, một học viên hỏi mình về ${lc}. Đây là câu trả lời.`, `Mình từng làm sai chuyện ${lc}, cho tới khi nhận ra điều này.`],
    benefit: [`Làm đúng ${lc}, bạn sẽ tự tin hơn hẳn trong công việc.`, `Muốn tiến bộ nhanh hơn? Bắt đầu từ ${lc}.`],
  };
  return Object.keys(HOOK_KINDS).map(k => ({ kind: k, label: HOOK_KINDS[k], text: T[k][n % 2], simulated: true }));
}
// Thay câu mở đầu (dòng/đoạn đầu không phải nhãn) bằng hook mới; giữ phần còn lại
export function replaceHook(text, hook) {
  const lines = String(text || '').split('\n');
  const i = lines.findIndex(l => l.trim() && !/^\s*(\[[^\]]+\]|#{1,6}\s)/.test(l.trim()) && !/^#\S/.test(l.trim()));
  if (i < 0) return `${hook}\n\n${text}`;
  const m = lines[i].match(/^(\s*(?:Slide\s*\d+:\s*)?)(.*)$/i); const rest = splitSentences(m[2]).slice(1).join(' ');
  lines[i] = m[1] + hook + (rest ? '\n\n' + rest : '');
  return lines.join('\n');
}
// Ba phương án caption theo độ dài, dùng hashtag và CTA hợp ngữ cảnh
export function captionOptions(S, text, ctx) {
  const hook = (hookOptions(text, ctx)[((ctx && ctx.n) || 0) % 5] || {}).text || coreIdea(text);
  const body = String(text || '').replace(/^\s*#\S.*$/gm, '').trim();
  const ss = splitSentences(body.replace(/^\s*(\[[^\]]+\]|#{1,6}\s+.*|Slide\s*\d+:)\s*$/gm, '').replace(/\n+/g, ' ')).slice(1);
  const tags = snippetsFor(S, ctx || {}, 'hashtag')[0]; const cta = snippetsFor(S, ctx || {}, 'cta')[0];
  const tail = [cta ? cta.text : DEFAULT_CTAS[0], tags ? tags.text : ''].filter(Boolean).join('\n\n');
  return [
    { kind: 'short', label: 'Ngắn', text: `${hook}\n\n${tail}`, simulated: true },
    { kind: 'medium', label: 'Vừa', text: `${hook}\n\n${ss.slice(0, 2).join(' ')}\n\n${tail}`, simulated: true },
    { kind: 'long', label: 'Đầy đủ', text: `${hook}\n\n${ss.slice(0, 6).join(' ')}\n\n${tail}`, simulated: true },
  ];
}
// Ghi loại hook đã chọn để sau này so với số liệu
export function setSlotHookKind(S, slotId, kind) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  if (!HOOK_KINDS[kind]) return { ok: false, error: 'Loại hook không hợp lệ.' };
  s.hookKind = kind; return { ok: true };
}

// ---- Thư viện hashtag & CTA (chạy thật) ----
export const DEFAULT_SNIPPETS = [
  { id: 'sn-1', kind: 'hashtag', text: '#NoiDuocEnglish #TiengAnhDiLam #LuyenNoi', columnId: null, channelId: null },
  { id: 'sn-2', kind: 'hashtag', text: '#MeoTiengAnh #TiengAnhCongSo', columnId: 'col-huongdan', channelId: null },
  { id: 'sn-3', kind: 'hashtag', text: '#SuThatTiengAnh #NgoNhan', columnId: 'col-batngo', channelId: null },
  { id: 'sn-4', kind: 'hashtag', text: '#ChuyenHocVien #HanhTrinhTiengAnh', columnId: 'col-cauchuyen', channelId: null },
  { id: 'sn-5', kind: 'hashtag', text: '#ThuThach7Ngay #LuyenTapMoiNgay', columnId: 'col-luyentap', channelId: null },
  { id: 'sn-6', kind: 'cta', text: 'Lưu bài để làm theo, và bình luận "xong" khi bạn thử nhé.', columnId: 'col-huongdan', channelId: null },
  { id: 'sn-7', kind: 'cta', text: 'Bạn đoán đúng không? Trả lời dưới bình luận nhé.', columnId: 'col-luyentap', channelId: null },
  { id: 'sn-8', kind: 'cta', text: 'Bạn từng nghĩ như vậy chưa? Kể cho mình nghe nhé.', columnId: 'col-batngo', channelId: null },
  { id: 'sn-9', kind: 'cta', text: 'Theo dõi kênh để nhận mẹo nói tiếng Anh mỗi tuần.', columnId: null, channelId: null },
  { id: 'sn-10', kind: 'cta', text: 'Đọc bài đầy đủ ở link trong bio nhé.', columnId: null, channelId: 'ch-ig' },
];
export function snippetsOf(S) { return S.snippets || (S.isDemo ? DEFAULT_SNIPPETS : []); }
function ownSnippets(S) { if (!S.snippets) S.snippets = clone(snippetsOf(S)); return S.snippets; }
// Hợp ngữ cảnh: đúng Cột + kênh > đúng một trong hai > dùng chung; sau đó dùng nhiều trước
export function snippetsFor(S, ctx, kind, q) {
  const c = ctx || {}; const fq = fold(q || '');
  return snippetsOf(S).filter(x => (!kind || x.kind === kind) && (!x.columnId || !c.columnId || x.columnId === c.columnId) && (!x.channelId || !c.channelId || x.channelId === c.channelId) && (!fq || fold(x.text).includes(fq)))
    .map(x => ({ x, w: (x.columnId && x.columnId === c.columnId ? 2 : 0) + (x.channelId && x.channelId === c.channelId ? 2 : 0) + (x.uses || 0) / 1000 }))
    .sort((a, b) => b.w - a.w).map(o => o.x);
}
export function saveSnippet(S, sn) {
  const kind = sn.kind === 'cta' ? 'cta' : 'hashtag';
  let text = String(sn.text || '').replace(/\s+/g, ' ').trim();
  if (kind === 'hashtag') {
    const tags = text.split(' ').filter(Boolean).map(w => w.startsWith('#') ? w : '#' + w);
    if (!tags.length) return { ok: false, error: 'Nhập ít nhất một hashtag.' };
    if (tags.some(w => !/^#[\p{L}\p{N}_]+$/u.test(w))) return { ok: false, error: 'Hashtag chỉ gồm chữ, số và dấu gạch dưới, không có dấu cách.' };
    text = tags.join(' ');
  } else if (!text) return { ok: false, error: 'Nhập câu kêu gọi.' };
  if (text.length > 200) return { ok: false, error: 'Tối đa 200 ký tự.' };
  const list = ownSnippets(S);
  const item = { id: sn.id || nextId(S, 'sn'), kind, text, columnId: sn.columnId || null, channelId: sn.channelId || null, uses: 0 };
  const i = list.findIndex(x => x.id === item.id);
  if (i >= 0) { item.uses = list[i].uses || 0; list[i] = item; } else list.push(item);
  return { ok: true, snippet: item };
}
export function deleteSnippet(S, id) {
  const list = ownSnippets(S); const n = list.length; S.snippets = list.filter(x => x.id !== id);
  return n === S.snippets.length ? { ok: false, error: 'Không tìm thấy mục.' } : { ok: true };
}
export function useSnippet(S, id) { const x = ownSnippets(S).find(y => y.id === id); if (x) x.uses = (x.uses || 0) + 1; return x || null; }
