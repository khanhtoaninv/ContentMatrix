// ---------- Khung Topic (mục 10.30): mục chuẩn, tên gọi khác, kiểu hiển thị; chuẩn hoá tệp Topic khi nạp ----------
const TOPIC_STYLES = { para: 'Đoạn văn', stats: 'Số liệu nổi bật', steps: 'Các bước đánh số', myth: 'Ngộ nhận ↔ Thực tế', qa: 'Hỏi – đáp', case: 'Khung trích dẫn' };
const TOPIC_STYLE_HINT = {
  para: 'đoạn văn 2–4 câu, mỗi đoạn một dòng',
  stats: 'mỗi phát hiện một dòng "- ", con số kèm nguồn ngay trong câu',
  steps: 'mỗi bước một dòng "Bước n: …", câu mẫu nằm ngay trong bước',
  myth: 'mỗi cặp một dòng "Ngộ nhận: … Thực tế: …"',
  qa: 'mỗi câu một dòng "Câu hỏi: … Đáp án: …"',
  case: 'chỉ trường hợp có thật, kể thành đoạn văn; không có thì bỏ mục này',
};
const DEFAULT_TOPIC_FRAME = [
  { name: 'Số liệu và phát hiện', aliases: ['Số liệu', 'Phát hiện', 'Dữ liệu', 'Thống kê', 'Data', 'Findings', 'Key facts'], style: 'stats', optional: false },
  { name: 'Vì sao', aliases: ['Tại sao', 'Nguyên nhân', 'Lý do', 'Why'], style: 'para', optional: false },
  { name: 'Cách làm', aliases: ['Hướng dẫn', 'Các bước', 'Cách thực hiện', 'Giải pháp', 'How to'], style: 'steps', optional: false },
  { name: 'Ngộ nhận thường gặp', aliases: ['Ngộ nhận', 'Hiểu lầm', 'Sai lầm thường gặp', 'Myth', 'Myths'], style: 'myth', optional: false },
  { name: 'Trường hợp', aliases: ['Câu chuyện', 'Case study', 'Case', 'Ví dụ thực tế'], style: 'case', optional: true },
  { name: 'Câu hỏi luyện tập', aliases: ['Câu hỏi', 'Luyện tập', 'Bài tập', 'Quiz', 'Q&A'], style: 'qa', optional: false },
];
function topicFrameOf(S) { return S && S.topicFrame && S.topicFrame.length ? S.topicFrame : DEFAULT_TOPIC_FRAME; }
function validateTopicFrame(frame) {
  const errs = []; const seen = new Set();
  if (!frame || !frame.length) errs.push('Khung cần ít nhất một mục.');
  (frame || []).forEach((s, i) => {
    const n = String(s.name || '').trim();
    if (!n) errs.push(`Mục ${i + 1} chưa có tên.`);
    else if (seen.has(fold(n))) errs.push(`Tên mục "${n}" bị trùng.`);
    seen.add(fold(n));
    if (!TOPIC_STYLES[s.style]) errs.push(`Mục ${i + 1}: kiểu hiển thị không hợp lệ.`);
  });
  return errs;
}
function setTopicFrame(S, frame) {
  const clean = (frame || []).map(s => ({ name: String(s.name || '').trim(), aliases: (s.aliases || []).map(a => String(a).trim()).filter(Boolean), style: s.style, optional: !!s.optional }));
  const errs = validateTopicFrame(clean);
  if (errs.length) return { ok: false, error: errs.join(' ') };
  S.topicFrame = clean; log(S, 'edit', 'topicFrame', '', `${clean.length} mục`);
  return { ok: true };
}
function resetTopicFrame(S) { delete S.topicFrame; return { ok: true }; }
// Đề mục ứng với mục nào của khung: trùng tên, hoặc bắt đầu/chứa một tên gọi khác (từ 4 ký tự)
function matchTopicSection(S, name) {
  const k = fold(String(name || '').replace(/[*_`]/g, '')).replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!k) return null;
  const fr = topicFrameOf(S);
  const norm = x => fold(x).replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return fr.find(s => norm(s.name) === k) || fr.find(s => [s.name].concat(s.aliases || []).some(a => { const c = norm(a); return c && (k === c || (c.length >= 4 && (k.startsWith(c + ' ') || k.includes(c)))); })) || null;
}
// Lệnh cho AI nghiên cứu: phần khung (đề mục, thứ tự, cách viết từng mục)
function topicFramePrompt(S) {
  const fr = topicFrameOf(S);
  return ['Mỗi Topic bắt đầu bằng đề mục "## Tên Topic", ngay dưới là ba dòng "Thông điệp chính:", "Đối tượng:", "Góc nhìn:", rồi các mục "###" theo đúng tên và thứ tự sau:']
    .concat(fr.map((s, i) => `${i + 1}. ### ${s.name}: ${TOPIC_STYLE_HINT[s.style]}${s.optional ? ' (không bắt buộc)' : ''}.`))
    .concat(['Trình bày: mỗi đoạn viết liền trên một dòng (không ngắt dòng giữa câu), dòng trống giữa các đoạn; được dùng **in đậm**, "- " và "1."; không dùng bảng, HTML, link, ảnh hay đề mục "####".'])
    .join('\n');
}
function agentPromptOf(S) {
  return ['Từ báo cáo nghiên cứu tuần này, hãy viết 3 Topic cho ứng dụng Content Matrix. Ba Topic là ba chủ đề có quan hệ với nhau trong cùng một mạch, mỗi Topic khoảng 2.000 chữ.',
    'Tệp bắt đầu bằng "# Chủ đề tuần", rồi một đoạn "Bối cảnh chung:" nêu quan hệ giữa ba Topic.',
    topicFramePrompt(S), 'Chỉ dùng số liệu có trong báo cáo; nêu nguồn ngay trong câu.'].join('\n\n');
}

// Chuẩn hoá tệp Topic theo khung; trả về tệp mới, danh sách thay đổi (để xem trước) và mục còn thiếu
const TF_STRUCT = /^\s*(#{1,6}\s|[-*•+]\s|\d+[.)]\s|>|\|)/;
const TF_FIELD = /^\s*(?:[-*]\s*)?[^:\n]{2,30}:\s*\S/;
function normalizeTopicMd(S, md) {
  const changes = []; const missing = [];
  const raw = String(md || '').replace(/\r\n?/g, '\n');
  const fmm = /^---\s*\n[\s\S]*?\n---\s*(\n|$)/.exec(raw);
  const head = fmm ? fmm[0] : ''; let body = raw.slice(head.length);
  const count = (re, s) => (s.match(re) || []).length;
  // HTML, ảnh, link
  const nHtml = count(/<\/?[a-z][^>]*>/gi, body);
  if (nHtml) { body = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, ''); changes.push(`Bỏ ${nHtml} thẻ HTML.`); }
  const nImg = count(/!\[[^\]]*\]\([^)]*\)/g, body);
  if (nImg) { body = body.replace(/!\[[^\]]*\]\([^)]*\)/g, ''); changes.push(`Bỏ ${nImg} ảnh (Topic chỉ nhận chữ).`); }
  const nLink = count(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, body);
  if (nLink) { body = body.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1'); changes.push(`Bỏ đường dẫn của ${nLink} link, giữ chữ.`); }
  let lines = body.split('\n');
  // Khối mã: bỏ dấu ```, giữ chữ
  const nFence = lines.filter(l => /^\s*```/.test(l)).length;
  if (nFence) { lines = lines.filter(l => !/^\s*```/.test(l)); changes.push('Bỏ dấu khối mã ```, giữ chữ bên trong.'); }
  // Bảng → danh sách
  let nTable = 0, inTable = false;
  lines = lines.flatMap(l => {
    if (!/^\s*\|.*\|\s*$/.test(l)) { inTable = false; return [l]; }
    if (!inTable) { nTable++; inTable = true; }
    if (/^\s*\|?\s*:?-{2,}/.test(l)) return [];
    const cells = l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()).filter(Boolean);
    return cells.length ? [`- ${cells.join(' · ')}`] : [];
  });
  if (nTable) changes.push(`Đổi ${nTable} bảng thành danh sách.`);
  // Đề mục sâu hơn ###: thành dòng in đậm (tiêu đề nhỏ trong mục), để không tách thành mục riêng
  const nDeep = lines.filter(l => /^#{4,6}\s/.test(l)).length;
  if (nDeep) { lines = lines.map(l => l.replace(/^#{4,6}\s+(.+?)\s*#*\s*$/, (_, x) => `**${x.replace(/\*\*/g, '')}**`)); changes.push(`Đổi ${nDeep} đề mục #### trở xuống thành dòng in đậm trong mục.`); }
  // Tệp một Topic nhưng dùng ## cho các mục: đổi ## thành ###, thêm ## tên Topic
  const h2 = lines.map((l, i) => [l, i]).filter(([l]) => /^##\s/.test(l));
  const hasH3 = lines.some(l => /^###\s/.test(l));
  const secLike = h2.filter(([l]) => matchTopicSection(S, l.replace(/^##\s+/, ''))).length;
  if (h2.length >= 2 && !hasH3 && secLike >= 2 && secLike >= h2.length - 1) {
    const h1i = lines.findIndex(l => /^#\s/.test(l));
    const firstSec = h2.find(([l]) => matchTopicSection(S, l.replace(/^##\s+/, '')));
    const titleFromH2 = !matchTopicSection(S, h2[0][0].replace(/^##\s+/, '')) ? h2[0][1] : -1;
    lines = lines.map((l, i) => (/^##\s/.test(l) && i !== titleFromH2 ? '#' + l : l));
    if (titleFromH2 < 0) {
      const title = h1i >= 0 ? lines[h1i].replace(/^#\s+/, '').trim() : 'Topic 1';
      lines.splice(h1i >= 0 && h1i < firstSec[1] ? h1i + 1 : firstSec[1], 0, `## ${title}`);
    }
    changes.push(`Tệp chỉ có 1 Topic: đổi ${secLike} đề mục ## thành ### (mục bên trong Topic).`);
  }
  // Nối dòng bị ngắt cứng giữa câu
  let nJoin = 0; const joined = [];
  lines.forEach(l => {
    const prev = joined.length ? joined[joined.length - 1] : '';
    if (l.trim() && prev.trim() && !/^\s*#/.test(prev) && !/^\s*\|/.test(prev) && !/^\s*\*\*[^*]+\*\*\s*$/.test(prev) && !TF_STRUCT.test(l) && !TF_FIELD.test(l) && !/^(Bước|Slide)\s*\d+:/.test(l.trim())
      && !/[.!?…:;"”)\]]\s*$/.test(prev)) { joined[joined.length - 1] = prev.replace(/\s+$/, '') + ' ' + l.trim(); nJoin++; return; }
    joined.push(l.replace(/\s+$/, ''));
  });
  if (nJoin) changes.push(`Nối ${nJoin} dòng bị ngắt giữa câu thành đoạn.`);
  lines = joined;
  // Từng Topic: đổi tên mục theo khung, xếp đúng thứ tự, ghi mục còn thiếu
  const fr = topicFrameOf(S);
  const topicStarts = lines.map((l, i) => (/^##\s/.test(l) ? i : -1)).filter(i => i >= 0);
  const ranges = topicStarts.length ? topicStarts.map((s, k) => [s, k + 1 < topicStarts.length ? topicStarts[k + 1] : lines.length]) : [[-1, lines.length]];
  const renamed = []; let reordered = 0;
  const out = topicStarts.length ? lines.slice(0, topicStarts[0]) : [];
  ranges.forEach(([s, e], k) => {
    const blk = lines.slice(s < 0 ? 0 : s + 1, e);
    const title = s < 0 ? '' : lines[s].replace(/^##\s+/, '').trim();
    let pre = [], secs = [], cur = null;
    blk.forEach(l => {
      const m = /^###\s+(.+?)\s*#*\s*$/.exec(l);
      if (m) { const sec = matchTopicSection(S, m[1]); const name = sec ? sec.name : m[1].trim(); if (sec && name !== m[1].trim()) renamed.push(`"${m[1].trim()}" → "${name}"`); cur = { sec, name, lines: [] }; secs.push(cur); return; }
      (cur ? cur.lines : pre).push(l);
    });
    // Mục lạ đi theo mục chuẩn đứng trước nó; nhóm xếp theo thứ tự khung
    const groups = []; secs.forEach(x => { if (x.sec || !groups.length) groups.push({ key: x.sec ? fr.indexOf(x.sec) : -1, items: [x] }); else groups[groups.length - 1].items.push(x); });
    const sorted = groups.map((g, i) => [g, i]).sort((a, b) => a[0].key - b[0].key || a[1] - b[1]).flatMap(a => a[0].items);
    if (sorted.some((x, i) => x !== secs[i])) reordered++;
    const have = new Set(secs.filter(x => x.sec).map(x => x.sec.name));
    const miss = fr.filter(x => !x.optional && !have.has(x.name)).map(x => x.name);
    if (secs.length && miss.length) missing.push({ order: k + 1, title, names: miss });
    if (s >= 0) out.push(lines[s]);
    out.push(...pre);
    sorted.forEach(x => { out.push(`### ${x.name}`, ...x.lines); });
  });
  if (renamed.length) changes.push(`Đổi tên mục theo khung: ${[...new Set(renamed)].join(', ')}.`);
  if (reordered) changes.push(`Xếp lại các mục theo thứ tự khung ở ${reordered} Topic.`);
  // Dòng trống: tối đa một dòng trống liền nhau; một dòng trống trước mỗi đề mục
  const tidy = [];
  out.forEach(l => {
    if (/^#{1,3}\s/.test(l) && tidy.length && tidy[tidy.length - 1].trim()) tidy.push('');
    if (!l.trim() && (!tidy.length || !tidy[tidy.length - 1].trim())) return;
    tidy.push(l);
  });
  const result = head + tidy.join('\n').trim() + '\n';
  return { md: result, changes, missing, changed: result.trim() !== raw.trim() };
}
