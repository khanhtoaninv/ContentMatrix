// ---------- 02 · Mẫu Markdown và bộ đọc ----------
const TEMPLATES = {
  brand: `---
template: autocontent-brand-v1
---

## Tên thương hiệu
Nói Được English

## Sản phẩm
Khóa luyện nói tiếng Anh 15 phút mỗi ngày cho người đi làm.

## Thị trường
Việt Nam, khu vực thành thị.

## Khách hàng
Người đi làm 25–40 tuổi, cần nói tiếng Anh trong công việc nhưng ít thời gian.

## Triết lý
Nói được trước, hoàn hảo sau.

## Cụm từ cấm
- giảm cân
- cam kết 100%
- chắc chắn nói giỏi
- học một tuần là giỏi

## Sự thật đã xác minh
- Mỗi buổi luyện 15 phút
- Lớp tối đa 8 người
`,
  voice: `---
template: autocontent-voice-v1
---

## Tông
Gần gũi, thực tế, khích lệ, không lên lớp.

## Xưng hô
Mình – bạn.

## Nên
- Câu ngắn, ví dụ cụ thể
- Mở bằng tình huống người đi làm hay gặp

## Không nên
- Thuật ngữ ngữ pháp nặng
- Hứa hẹn kết quả tuyệt đối

## Ví dụ mẫu
> Họp bằng tiếng Anh mà cứ im lặng? Mình thử 15 phút mỗi ngày nhé.
`,
  column: `---
template: autocontent-column-v1
name: Mẹo ngắn
---

## Hướng dẫn viết
Một mẹo dùng được ngay trong 1 phút, có ví dụ.

## Cấu trúc
- Hook
- Mẹo
- Ví dụ
- CTA

## Quy tắc cứng
- length_unit: chars
- min: 300
- max: 900
- require_cta: true

## Tiêu chí chấm
- Bám Idea và Nguồn: 25
- Đúng giọng thương hiệu: 20
- Hook, mở đầu thu hút: 20
- Rõ lợi ích với người đọc: 20
- Dễ chuyển thể sang nhiều Format: 15

## Prompt asset
Ảnh minh họa tình huống họp bằng tiếng Anh, phong cách tối giản.
`,
  format: `---
template: autocontent-format-v1
name: TikTok · Hướng dẫn
channel: TikTok
column: Hướng dẫn từng bước
---

## Hướng dẫn trình bày
Kịch bản 20–45 giây. 3 giây đầu là hook. Mỗi bước một câu ngắn kèm gợi ý cảnh quay.

## Cấu trúc
- Hook
- Các bước
- CTA

## Quy tắc cứng
- length_unit: words
- min: 60
- max: 130
- require_cta: true

## Tiêu chí chấm
- Hợp kênh và Format: 25
- Đúng giọng thương hiệu: 20
- Hook: 20
- CTA rõ: 20
- Trình bày dễ đọc: 15

## Yêu cầu asset
- Cảnh quay dọc 9:16: Người nói trước camera, phụ đề tiếng Việt
`,
  topic: `# Nói tiếng Anh trong cuộc họp

Bối cảnh chung: ba Topic dưới đây cùng xoay quanh việc người đi làm dám nói trong họp. Topic 1 nói về nỗi ngại, Topic 2 về cách luyện, Topic 3 về mẫu câu dùng ngay.

## Vượt qua nỗi ngại phát biểu
Thông điệp chính: Rào cản lớn nhất là tâm lý, không phải vốn từ.
Đối tượng: Người đi làm 25–40 tuổi họp với đối tác nước ngoài.
Góc nhìn: Một lần phát biểu thành công làm giảm nỗi ngại ở các lần sau.

### Số liệu và phát hiện
(số liệu kèm nguồn ngay trong câu)

### Vì sao
…

### Cách làm
- Bước 1 …
- Bước 2 …

### Ngộ nhận thường gặp
Ngộ nhận: … Thực tế: …

### Trường hợp
(chỉ trường hợp có thật; không có thì bỏ phần này)

### Câu hỏi luyện tập
Câu hỏi: … Đáp án: …

## Luyện nói ngắn mỗi ngày
…

## Mẫu câu cho cuộc họp trực tuyến
…
`,
  agentPrompt: 'Từ báo cáo nghiên cứu tuần này, hãy viết 3 Topic cho ứng dụng Content Matrix. Ba Topic là ba chủ đề có quan hệ với nhau trong cùng một mạch. Mỗi Topic khoảng 2.000 chữ, bắt đầu bằng đề mục "##" là tên Topic, ba dòng "Thông điệp chính:", "Đối tượng:", "Góc nhìn:", rồi các phần "###": Số liệu và phát hiện (kèm nguồn ngay trong câu), Vì sao, Cách làm (các bước, câu mẫu), Ngộ nhận thường gặp (dạng "Ngộ nhận: … Thực tế: …"), Trường hợp (chỉ trường hợp có thật; không có thì bỏ phần này), Câu hỏi luyện tập (dạng "Câu hỏi: … Đáp án: …"). Trước Topic đầu tiên, viết một đoạn Bối cảnh chung nêu quan hệ giữa ba Topic. Chỉ dùng số liệu có trong báo cáo.',
};

const BRAND_HEADINGS = ['Tên thương hiệu', 'Sản phẩm', 'Thị trường', 'Khách hàng', 'Triết lý', 'Cụm từ cấm', 'Sự thật đã xác minh'];
const VOICE_HEADINGS = ['Tông', 'Xưng hô', 'Nên', 'Không nên', 'Ví dụ mẫu'];

// Chỉ đọc frontmatter, đề mục "## " và danh sách "- ". Mọi dòng khác là văn bản thường,
// kể cả dòng trông như chỉ thị (SET-04): không có gì trong md được thực thi.
function parseFrontmatter(md) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*(\n|$)/.exec(md || '');
  const fm = {}; let body = md || '';
  if (m) {
    m[1].split('\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
    body = (md || '').slice(m[0].length);
  }
  return { fm, body };
}
function parseSections(body) {
  const sections = {}; const order = [];
  let cur = null;
  String(body || '').split('\n').forEach((line, idx) => {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { cur = h[1]; if (!sections[cur]) { sections[cur] = []; order.push(cur); } return; }
    if (cur) sections[cur].push(line);
  });
  return { sections, order };
}
function sectionText(lines) { return (lines || []).join('\n').trim(); }
function sectionList(lines) {
  return (lines || []).map(l => /^\s*[-*]\s+(.*)$/.exec(l)).filter(Boolean).map(m => m[1].trim()).filter(Boolean);
}
function findSection(sections, name) {
  const key = Object.keys(sections).find(k => fold(k) === fold(name));
  return key ? sections[key] : null;
}

function parseBrand(md) {
  const { fm, body } = parseFrontmatter(md);
  const { sections } = parseSections(body);
  const issues = [];
  if (!String(md || '').trim()) issues.push({ level: 'error', text: 'Chưa có nội dung Thương hiệu.' });
  else {
    if (fm.template && fm.template !== 'autocontent-brand-v1') issues.push({ level: 'warn', text: `Mẫu "${fm.template}" khác mẫu chuẩn autocontent-brand-v1.` });
    BRAND_HEADINGS.forEach(h => { if (!findSection(sections, h)) issues.push({ level: 'warn', text: `Thiếu đề mục "${h}".`, heading: h }); });
  }
  const g = h => findSection(sections, h);
  const parsed = {
    name: sectionText(g('Tên thương hiệu')), products: sectionText(g('Sản phẩm')),
    market: sectionText(g('Thị trường')), customers: sectionText(g('Khách hàng')),
    philosophy: sectionText(g('Triết lý')),
    bannedPhrases: sectionList(g('Cụm từ cấm')), verifiedFacts: sectionList(g('Sự thật đã xác minh')),
  };
  return { parsed, issues };
}
function parseVoice(md) {
  const { fm, body } = parseFrontmatter(md);
  const { sections } = parseSections(body);
  const issues = [];
  if (!String(md || '').trim()) issues.push({ level: 'error', text: 'Chưa có nội dung Giọng văn.' });
  else {
    if (fm.template && fm.template !== 'autocontent-voice-v1') issues.push({ level: 'warn', text: `Mẫu "${fm.template}" khác mẫu chuẩn autocontent-voice-v1.` });
    VOICE_HEADINGS.forEach(h => { if (!findSection(sections, h)) issues.push({ level: 'warn', text: `Thiếu đề mục "${h}".`, heading: h }); });
  }
  const g = h => findSection(sections, h);
  const samples = (g('Ví dụ mẫu') || []).map(l => l.replace(/^>\s?/, '').trim()).filter(Boolean);
  return {
    parsed: { tone: sectionText(g('Tông')), pronouns: sectionText(g('Xưng hô')), do: sectionList(g('Nên')), dont: sectionList(g('Không nên')), samples },
    issues,
  };
}

// Tệp Topic (v2.7, mục 12.5): tiêu đề # (tùy chọn), Bối cảnh chung (tùy chọn), mỗi Topic một đề mục ##.
const TOPIC_MIN_LETTERS = 200, TOPIC_MAX = 8, TOPIC_SHORT_WORDS = 300, CONTEXT_MIN_CHARS = 60;
const TOPIC_FIELDS = { 'thong diep chinh': 'message', 'thong diep': 'message', 'doi tuong': 'audience', 'goc nhin': 'angle' };
const CASE_KEYS = ['truong hop', 'cau chuyen'];
function topicSubsections(text) {
  const out = []; let cur = null;
  String(text || '').split('\n').forEach(line => {
    const m = /^###\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) { cur = { name: m[1].trim(), key: fold(m[1]).trim(), lines: [] }; out.push(cur); return; }
    if (cur) cur.lines.push(line);
  });
  return out.map(s => ({ name: s.name, key: s.key, text: s.lines.join('\n').trim() }));
}
function topicHasCase(text) { return topicSubsections(text).some(s => s.text && CASE_KEYS.some(k => s.key.includes(k))); }
function parseTopics(md) {
  const errors = [], warnings = [];
  const raw = String(md || '').replace(/\r\n?/g, '\n');
  const { fm, body } = parseFrontmatter(raw);
  const letters = body.replace(/[^\p{L}\p{N}]/gu, '').length;
  const res = { title: '', theme: fm.theme || '', context: '', topics: [], errors, warnings };
  if (!raw.trim()) { errors.push({ text: 'Tệp Topic trống, chưa nạp.' }); return res; }
  if (letters < TOPIC_MIN_LETTERS) { errors.push({ text: `Tệp Topic quá ngắn (${letters} ký tự chữ, cần từ ${TOPIC_MIN_LETTERS}), chưa nạp.` }); return res; }
  const lines = body.split('\n');
  const heads = []; let fence = false;
  lines.forEach((ln, idx) => {
    if (/^\s*```/.test(ln)) { fence = !fence; return; }
    if (fence) return;
    const m = /^(#{1,2})\s+(.+?)\s*#*\s*$/.exec(ln);
    if (m) heads.push({ idx, level: m[1].length, text: m[2].trim() });
  });
  const h2 = heads.filter(h => h.level === 2);
  const firstH2 = h2.length ? h2[0].idx : lines.length;
  const titleHead = heads.find(h => h.level === 1 && h.idx < firstH2) || null;
  res.title = titleHead ? titleHead.text : '';
  res.theme = fm.theme || res.title;
  const blocks = [];
  if (!h2.length) {
    blocks.push({ title: res.title || 'Topic 1', lines: lines.filter((l, i) => !(titleHead && i === titleHead.idx)) });
  } else {
    const pre = lines.slice(0, firstH2).filter((l, i) => !(titleHead && i === titleHead.idx)).join('\n').trim();
    if (pre.length >= CONTEXT_MIN_CHARS) res.context = pre.replace(/^Bối cảnh chung\s*:\s*/i, '');
    h2.forEach((h, k) => blocks.push({ title: h.text, lines: lines.slice(h.idx + 1, k + 1 < h2.length ? h2[k + 1].idx : lines.length) }));
  }
  if (blocks.length > TOPIC_MAX) { errors.push({ text: `Tệp có ${blocks.length} Topic, tối đa ${TOPIC_MAX}. Chưa nạp.` }); return res; }
  blocks.forEach((b, k) => {
    const fields = { message: '', audience: '', angle: '' };
    let i = 0;
    for (; i < b.lines.length; i++) {
      const l = b.lines[i];
      if (!l.trim()) continue;
      const m = /^\s*[-*]?\s*([^:]{2,30}):\s*(.+)$/.exec(l);
      const key = m && TOPIC_FIELDS[fold(m[1]).trim()];
      if (!key) break;
      fields[key] = m[2].trim();
    }
    const text = b.lines.slice(i).join('\n').trim();
    const words = countWords(text.replace(/^#{1,6}\s+/gm, ''));
    const inp = { order: k + 1, title: b.title, text, fields, words, hasCase: topicHasCase(text) };
    if (!text) errors.push({ text: `Topic ${k + 1} "${b.title}" không có nội dung.` });
    else {
      if (words < TOPIC_SHORT_WORDS) warnings.push({ order: k + 1, text: `Topic ${k + 1} ngắn (${words} chữ): AI dễ phải thêm ý ngoài Topic; khuyến nghị khoảng 2.000 chữ.` });
      if (!inp.hasCase) warnings.push({ order: k + 1, text: `Topic ${k + 1} không có trường hợp cụ thể: ô Câu chuyện của Topic này nên Hủy.` });
    }
    res.topics.push(inp);
  });
  return res;
}
