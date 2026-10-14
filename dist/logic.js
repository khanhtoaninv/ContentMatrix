(function (root) {
'use strict';
// ---------- 01 · Tiện ích thuần ----------
const DATA_VERSION = 'ac-edu-r4-0';
const STORAGE_KEY = 'autocontent.state';
const RELEASE = 'R4';

function clone(o) { return JSON.parse(JSON.stringify(o)); }

// FNV-1a 32-bit: dùng cho mock xác định (cùng đầu vào → cùng đầu ra)
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function pick(arr, seed) { return arr[hash32(String(seed)) % arr.length]; }

// SHA-256 thuần JS (chạy cả trình duyệt lẫn Node, không cần crypto.subtle)
function sha256(ascii) { return sha256Bytes(utf8Bytes(ascii)); }
// Băm mảng byte (dùng cho tệp ảnh/video khi xuất ZIP)
function sha256Bytes(bytes) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = bytes.length;
  const withOne = l + 1;
  const total = Math.ceil((withOne + 8) / 64) * 64;
  const m = new Uint8Array(total);
  m.set(bytes); m[l] = 0x80;
  const bitLen = l * 8;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 4, bitLen >>> 0);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  const w = new Uint32Array(64);
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = r(w[t-15], 7) ^ r(w[t-15], 18) ^ (w[t-15] >>> 3);
      const s1 = r(w[t-2], 17) ^ r(w[t-2], 19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = r(e,6) ^ r(e,11) ^ r(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = r(a,2) ^ r(a,13) ^ r(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [H[0]+a,H[1]+b,H[2]+c,H[3]+d,H[4]+e,H[5]+f,H[6]+g,H[7]+h].map(x => x >>> 0);
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}
function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  return Uint8Array.from(Buffer.from(str, 'utf8'));
}

// Chuẩn hóa để so khớp không phân biệt hoa thường/dấu; giữ bản đồ vị trí về chuỗi gốc
function foldChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'd');
}
function foldWithMap(text) {
  let out = ''; const map = [];
  for (let i = 0; i < text.length; i++) {
    const f = foldChar(text[i]);
    for (let k = 0; k < f.length; k++) { out += f[k]; map.push(i); }
  }
  return { out, map };
}
function fold(text) { return foldWithMap(String(text || '')).out; }

// ---------- Ngày giờ (chuỗi, không phụ thuộc múi giờ máy) ----------
function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function fmtYMD(ms) { const d = new Date(ms); return d.toISOString().slice(0, 10); }
function addDays(ymd, n) { return fmtYMD(parseYMD(ymd) + n * 86400000); }
function weekdayOf(ymd) { const w = new Date(parseYMD(ymd)).getUTCDay(); return w === 0 ? 7 : w; } // 1=T2 … 7=CN
function mondayOf(ymd) { return addDays(ymd, 1 - weekdayOf(ymd)); }
function isValidYMD(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && fmtYMD(parseYMD(s)) === s; }
function isValidTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
function isoWeek(ymd) {
  const ms = parseYMD(ymd); const d = new Date(ms);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - y0) / 86400000 + 1) / 7) };
}
function dmy(ymd) { const [y, m, d] = ymd.split('-'); return `${d}/${m}`; }
function dmyFull(ymd) { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; }
const WEEKDAY_SHORT = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_LONG = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
function minutesOf(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function splitSentences(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?…])\s+(?=[^\s])/).filter(Boolean);
}
// Dòng nhãn đoạn (mục 10.28): "## Tên đoạn" (định dạng của ô) hoặc "[Tên đoạn]" (bản cũ, kịch bản video); trả tên đoạn hoặc null
function labelOf(line) { const m = /^\s*(?:\[([^\]]+)\]|##\s+(.+?))\s*$/.exec(String(line || '')); return m ? (m[1] || m[2]).trim() : null; }
// Chia đoạn cho dễ đọc (mục 10.26): mỗi đoạn `per` câu (đoạn cuối không để lẻ một câu, tối đa per + 1), "Bước n:" mỗi bước một dòng.
// Đổi dấu cách thành xuống dòng (giữa các bước) hoặc dòng trống (giữa đoạn); độ dài theo ký tự gộp khoảng trắng nên không đổi; dòng nhãn [..], tiêu đề #, Slide n:, gạch đầu dòng để nguyên
const PARA_WORDS = 80; // một đoạn tối đa 80 chữ (mục 10.28)
function paraBreak(text, per = 3) {
  // Gom câu thành đoạn: tối đa `per` câu và không quá PARA_WORDS chữ; đoạn cuối không lẻ một câu ngắn
  const chunk = x => {
    const ss = x.split(/(?<=[.!?…])\s(?=\S)/); if (ss.length < 2) return x;
    const wc = s => s.split(/\s+/).filter(Boolean).length; let out = ss[0], n = 1, w = wc(ss[0]);
    ss.slice(1).forEach((s, k) => {
      const last = k === ss.length - 2; const brk = n >= per ? !(last && wc(s) < 12 && w + wc(s) <= PARA_WORDS) : w + wc(s) > PARA_WORDS;
      if (brk) { out += '\n\n' + s; n = 1; w = wc(s); } else { out += ' ' + s; n++; w += wc(s); }
    });
    return out;
  };
  return String(text || '').split('\n').map(line => {
    if (/^\s*(\[|#|Slide\s+\d+:|[-*•]\s|\d+[.)]\s)/.test(line)) return line;
    const steps = (line.match(/(^|\s)Bước\s*\d+:/g) || []).length >= 2;
    const parts = steps ? line.replace(/ (Bước\s*\d+:)/g, '\n$1').split('\n') : [line];
    return parts.map(x => {
      if (!steps || !/^Bước\s*\d+:/.test(x)) return chunk(x);
      const m = /^(.*?[.!?…])\s(?=\S)([\s\S]*)$/.exec(x); // bước: câu đầu một dòng, phần giải thích thêm xuống dòng
      return m ? `${m[1]}\n\n${chunk(m[2])}` : x;
    }).join('\n');
  }).join('\n');
}
function countWords(text) { const t = String(text || '').trim(); return t ? t.split(/\s+/).length : 0; }
function isValidUrl(s) { return /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(String(s || '').trim()); }

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
const TOPIC_MIN_LETTERS = 200, TOPIC_MAX = 10, TOPIC_SHORT_WORDS = 300, CONTEXT_MIN_CHARS = 60;
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

// ---------- 03 · Quy tắc cứng (ứng dụng tính, chỉ cảnh báo — D77) ----------
const RULE_NAMES = {
  'HR-01': 'Độ dài', 'HR-02': 'Cụm từ cấm', 'HR-03': 'CTA', 'HR-04': 'Cấu trúc',
  'HR-05': 'Số liệu mới', 'HR-06': 'Giới hạn kênh', 'HR-07': 'Từ cường điệu', 'HR-08': 'Xưng hô', 'HR-10': 'Ngoài Topic', 'HR-11': 'Lặp giữa ô', 'HR-12': 'Dẫn bài khác', 'HR-13': 'Trình bày', 'TPC-W': 'Topic',
};
const CTA_WORDS = ['đăng ký', 'dang ky', 'inbox', 'nhắn', 'bình luận', 'comment', 'học thử', 'lưu lại', 'lưu bài',
  'chia sẻ', 'thử ngay', 'thử câu', 'thử cách', 'theo dõi', 'follow', 'link', 'để lại', 'kể mình nghe', 'trả lời', 'bấm', 'tag'];
const REF_PHRASES = ['hôm qua', 'bài trước', 'phần trước', 'tập trước', 'kỳ trước', 'như mình đã nói', 'ở bài sau', 'bài tiếp theo'];
const DEFAULT_HYPE = ['100%', 'chắc chắn', 'cam kết', 'đảm bảo', 'tuyệt đối'];

function stripLabels(text) {
  return String(text || '')
    .replace(/^\s*(?:\[[^\]]*\]|##\s+.*)\s*$/gm, '')
    .replace(/^\s*Slide\s*\d+\s*[:·.-]\s*/gim, '')
    .replace(/\b(Bước|bước|Slide|slide)\s*\d+/g, '');
}
function extractNumbers(text) {
  const t = stripLabels(text).replace(/#\S+/g, '');
  const out = [];
  const re = /\d+(?:[.,]\d+)?\s?%?/g; let m;
  while ((m = re.exec(t))) out.push(m[0].replace(/\s/g, '').replace(',', '.'));
  return out;
}
function paragraphsOf(text) {
  return String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
}
function slidesOf(text) {
  const parts = String(text || '').split(/^\s*Slide\s*\d+\s*[:·.-]\s*/gim);
  return parts.slice(1).map(s => s.trim());
}
function hashtagsOf(text) { return (String(text || '').match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length; }
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
function lengthOf(text, unit) {
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
function checkRules(text, ctx) {
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
function summarizeWarnings(ws) {
  const errors = ws.filter(x => x.level === 'error').length;
  return { total: ws.length, errors, notes: ws.length - errors, label: ws.length ? `${ws.length} cảnh báo` : 'Không cảnh báo' };
}

// ---------- 04 · AI mô phỏng (xác định) ----------
// Cùng đầu vào → cùng đầu ra; genN khác → cách mở bài khác.

const TIP_BY_CRITERION = [
  ['hook', 'Mở bằng một tình huống cụ thể người đi làm gặp trong tuần.'],
  ['cta', 'Kết bằng một việc duy nhất người đọc làm được ngay.'],
  ['giọng', 'Rút câu dài thành hai câu ngắn để giữ giọng gần gũi.'],
  ['lợi ích', 'Nêu rõ người đọc được gì sau khi thử.'],
  ['bám', 'Nhắc lại ý chính của Topic ở câu thứ hai.'],
  ['chuyển thể', 'Tách ý thành từng đoạn ngắn để dễ cắt sang video và carousel.'],
  ['kênh', 'Rút gọn đoạn giữa cho hợp nhịp đọc của kênh.'],
  ['trình bày', 'Xuống dòng sau mỗi ý để dễ đọc trên điện thoại.'],
  ['mới', 'Thử một góc nhìn ít người nói tới trong chủ đề tuần.'],
  ['khách hàng', 'Gọi tên đúng tình huống của người đi làm 25–40 tuổi.'],
  ['chủ đề', 'Nối Idea với chủ đề tuần ngay ở tiêu đề.'],
  ['nhiều dạng', 'Chọn insight có thể kể, liệt kê và hỏi đáp.'],
];
function scoreText(text, criteria, salt) {
  const scores = (criteria || []).map(c => ({ criterionId: c.id, score: 3 + (hash32(`${salt}|${c.id}|${text}`) % 3) }));
  const total = Math.round((criteria || []).reduce((s, c, i) => s + c.weight * scores[i].score / 5, 0));
  let low = null;
  (criteria || []).forEach((c, i) => { if (!low || scores[i].score < low.score) low = { c, score: scores[i].score }; });
  let tip = 'Giữ nguyên; bài đã cân đối.';
  if (low && low.score < 5) {
    const name = fold(low.c.name);
    const hit = TIP_BY_CRITERION.find(([k]) => name.includes(fold(k)));
    tip = hit ? hit[1] : `Cải thiện tiêu chí "${low.c.name}".`;
  }
  return { scores, total, tip };
}

// ---- Bộ ghép có điều chỉnh độ dài ----
// Bài của ô: nhãn đoạn là đề mục Markdown "## Đoạn" (mục 10.28); kịch bản video của slot giữ nhãn "[Cảnh · mốc giờ]"
function renderLabeled(sections) {
  return sections.map(s => `## ${s.label}\n${s.sentences.join(' ')}`).join('\n\n');
}
function renderScript(sections) {
  return sections.map(s => `[${s.label}]\n${s.sentences.join(' ')}`).join('\n\n');
}
function renderPost(sections, hashtags) {
  const body = sections.map(s => s.sentences.join(' ')).filter(Boolean).join('\n\n');
  return hashtags && hashtags.length ? `${body}\n\n${hashtags.join(' ')}` : body;
}
function fitSections(sections, render, unit, min, max, fillers) {
  const len = () => lengthOf(render(sections), unit);
  const grow = sections.find(s => s.grow) || sections[Math.max(0, sections.length - 2)];
  const pool = [...(fillers || [])];
  let guard = 0;
  while (min && len() < min && pool.length && guard++ < 40) grow.sentences.push(pool.shift());
  guard = 0;
  while (max && len() > max && guard++ < 80) {
    const cands = sections.filter(s => s.trim !== false && s.sentences.length > 1);
    if (!cands.length) break;
    cands.sort((a, b) => b.sentences.join(' ').length - a.sentences.join(' ').length)[0].sentences.pop();
  }
  return render(sections);
}

// Câu chung không chứa số liệu, dùng khi Topic không đủ chất liệu để đạt độ dài tối thiểu
const CELL_FILLERS = {
  giaithich: ['Điều này cho thấy vấn đề không nằm ở việc bạn kém, mà ở thói quen.', 'Hiểu đúng nguyên nhân giúp bạn chọn đúng việc cần luyện trước.'],
  huongdan: [],
  batngo: ['Điều quen thuộc chưa chắc đã đúng.'],
  cauchuyen: ['Điều thay đổi không nằm ở ngữ pháp mà ở việc dám mở lời.'],
  luyentap: ['Không có câu trả lời sai, cứ thử trước rồi xem đáp án.'],
  generic: ['Ý chính là bắt đầu nhỏ và làm đều.', 'Bạn có thể áp dụng ngay trong tuần này.'],
};
// ---- Chất liệu từ Topic (mục 8.1) ----
function topicMaterial(iv) {
  const subs = topicSubsections(iv.text);
  const pick = keys => subs.filter(s => keys.some(k => s.key.includes(k))).map(s => s.text).join('\n');
  const plain = String(iv.text || '').replace(/^#{1,6}\s+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '');
  const sentences = splitSentences(plain);
  const items = txt => String(txt || '').split('\n').map(l => l.trim()).filter(l => /^([-*]|\d+[.)])\s+/.test(l)).map(l => l.replace(/^([-*]|\d+[.)])\s+/, '').trim());
  const pairs = (txt, a, b) => {
    const out = []; const re = new RegExp(`${a}\\s*:\\s*([\\s\\S]*?)\\s*${b}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\n|\\n?\\s*${a}\\s*:|$)`, 'gi');
    let m; while ((m = re.exec(String(txt || '')))) out.push([m[1].replace(/\s+/g, ' ').trim(), m[2].replace(/\s+/g, ' ').trim()]);
    return out;
  };
  return {
    subs, sentences,
    explain: splitSentences(pick(['so lieu', 'phat hien'])),
    why: splitSentences(pick(['vi sao', 'nguyen nhan'])),
    howItems: items(pick(['cach lam', 'huong dan', 'buoc'])),
    howText: splitSentences(pick(['cach lam', 'huong dan', 'buoc']).replace(/^\s*([-*]|\d+[.)])\s+.*$/gm, '')),
    myths: pairs(pick(['ngo nhan', 'bat ngo', 'su that']), 'Ngộ nhận', 'Thực tế'),
    story: splitSentences(pick(CASE_KEYS)),
    quiz: pairs(pick(['cau hoi', 'luyen tap', 'quiz']), 'Câu hỏi', 'Đáp án'),
    numeric: sentences.filter(s => /\d/.test(s)),
  };
}
const rot = (arr, k) => arr.length ? arr.slice(k % arr.length).concat(arr.slice(0, k % arr.length)) : arr;

// Viết một ô từ phiên bản Topic + Cột (AI-03). Trả về chuỗi có nhãn [Đoạn], hoặc null khi Cột Câu chuyện mà Topic không có trường hợp (D100).
function writeCell(iv, column, genN, context) { const t = writeCellRaw(iv, column, genN, context); return t == null ? t : paraBreak(t); }
function writeCellRaw(iv, column, genN, context) {
  const M = topicMaterial(iv);
  const f = iv.fields || {};
  const odd = genN % 2 === 1;
  const kind = column.kind || 'generic';
  const used = new Set();
  const take = list => list.filter(s => { if (used.has(s)) return false; used.add(s); return true; });
  let sections;
  switch (kind) {
    case 'giaithich': {
      const facts = take(M.explain.length ? M.explain : M.numeric);
      const why = take(M.why.length ? M.why : M.sentences.filter(s => /\b(vì|do|cho thấy|nguyên nhân)\b/i.test(s)));
      sections = [
        { label: 'Hook', sentences: [odd ? `${iv.title}: điều gì đang thực sự xảy ra?` : (facts[0] || `${iv.title}.`)], trim: false },
        { label: 'Vấn đề', sentences: odd ? facts : facts.slice(1), grow: true },
        { label: 'Vì sao', sentences: why.length ? why : [f.angle || 'Nguyên nhân nằm ở thói quen hơn là năng lực.'] },
        { label: 'Ý nghĩa', sentences: f.message ? [f.message] : ['Biết đúng nguyên nhân giúp bạn chọn đúng việc cần làm.'] },
        { label: 'CTA', sentences: ['Lưu bài này lại và chia sẻ cho đồng nghiệp cũng đang gặp chuyện này nhé.'], trim: false },
      ];
      break;
    }
    case 'huongdan': {
      const steps = M.howItems.length ? M.howItems : M.sentences.filter(s => /^(Hãy|Chọn|Nói|Ghi|Đặt|Dùng|Bắt đầu|Thử|Luyện|Chuẩn bị)\b/.test(s)).slice(0, 4);
      const example = M.sentences.find(s => /"[A-Za-z][^"]+"/.test(s) && !/^(Câu hỏi|Đáp án|Ngộ nhận|Thực tế)\s*:/i.test(s) && !/^(Chị|Anh|Cô|Ông|Bà|Họ|Em|Bạn ấy)\b/.test(s) && !steps.includes(s) && !steps.some(st => st.includes(s) || s.includes(st)));
      steps.forEach(s => used.add(s));
      if (example) used.add(example);
      sections = [
        { label: 'Hook', sentences: [odd ? `${iv.title}: làm theo ${Math.max(steps.length, 2)} bước này.` : (f.message || `${iv.title}.`)], trim: false },
        { label: 'Các bước', sentences: (steps.length ? steps : ['Chọn một câu mẫu.', 'Nói to ba lần.', 'Dùng trong cuộc họp gần nhất.']).map((s, i) => `Bước ${i + 1}: ${s.replace(/^Bước\s*\d+\s*[:.]\s*/i, '')}`), trim: false },
        { label: 'Ví dụ', sentences: [example || `Ví dụ: áp dụng "${String(iv.title).toLowerCase()}" vào một tình huống thật trong tuần này.`].concat(take(M.howText)), grow: true },
        { label: 'CTA', sentences: ['Lưu lại để làm theo, và bình luận "xong" khi bạn thử đủ các bước nhé.'], trim: false },
      ];
      break;
    }
    case 'batngo': {
      const pair = M.myths.length ? rot(M.myths, genN - 1)[0] : null;
      const fact = M.numeric[(genN - 1) % Math.max(1, M.numeric.length)] || M.sentences[0] || iv.title;
      sections = [
        { label: 'Hook', sentences: [odd ? `${iv.title}: sự thật có thể khiến bạn bất ngờ.` : (pair ? `Nhiều người vẫn nghĩ: ${pair[0]}` : 'Một sự thật ít người để ý.')], trim: false },
        { label: 'Ngộ nhận', sentences: [pair ? (odd ? `Nhiều người nghĩ rằng ${pair[0].charAt(0).toLowerCase()}${pair[0].slice(1)}` : 'Nghe thì hợp lý, nhưng dữ liệu nói khác.') : (f.angle || 'Nhiều người nghĩ vấn đề nằm ở vốn từ.')] },
        { label: 'Sự thật', sentences: pair ? [`Thực tế: ${pair[1]}`] : [fact], grow: true },
        { label: 'CTA', sentences: ['Lưu lại và gửi cho một người bạn hay nghĩ như vậy nhé.'], trim: false },
      ];
      break;
    }
    case 'cauchuyen': {
      if (!M.story.length) return null;
      // Giữ đúng trình tự câu chuyện; lượt chẵn đổi cách mở bài
      sections = [
        { label: 'Hook', sentences: [odd ? M.story[0] : 'Câu chuyện này có thể giống bạn.'], trim: false },
        { label: 'Câu chuyện', sentences: odd ? M.story.slice(1) : M.story, grow: true },
        { label: 'Bài học', sentences: [f.message || f.angle || 'Điều thay đổi không nằm ở ngữ pháp mà ở việc dám mở lời.'] },
        { label: 'CTA', sentences: ['Bạn cũng từng như vậy? Kể mình nghe ở bình luận nhé.'], trim: false },
      ];
      break;
    }
    case 'luyentap': {
      const q = M.quiz.length ? rot(M.quiz, genN - 1)[0] : null;
      const ex = M.sentences.find(s => /"[A-Za-z][^"]+"/.test(s));
      sections = [
        { label: 'Bối cảnh', sentences: [f.message || M.sentences[0] || iv.title] },
        { label: 'Câu hỏi', sentences: [q ? q[0] : (ex ? `Câu nào dùng để hỏi lại khi chưa nghe rõ? Gợi ý: ${ex}` : `${iv.title}: bạn sẽ nói câu gì đầu tiên?`)], trim: false },
        { label: 'Đáp án', sentences: [q ? q[1] : 'Câu ngắn, rõ ý là đủ.'], trim: false },
        { label: 'CTA', sentences: [odd ? 'Trả lời ở bình luận trước khi xem đáp án nhé.' : 'Bình luận câu trả lời của bạn rồi so với đáp án nhé.'], trim: false },
      ];
      break;
    }
    default: sections = (column.structure && column.structure.length ? column.structure : ['Hook', 'Nội dung', 'CTA']).map((lb, i, arr) => ({
      label: lb, sentences: i === 0 ? [iv.title] : i === arr.length - 1 ? ['Lưu lại và thử ngay hôm nay nhé.'] : take(M.sentences).slice(0, 4),
      grow: i === 1, trim: i !== arr.length - 1,
    }));
  }
  sections.forEach(s => { s.sentences = s.sentences.filter(Boolean); });
  const r = column.hardRules || {};
  // Phần thêm khi chưa đủ độ dài: câu còn lại của Topic (giữ đúng chất liệu), rồi câu chung không số liệu.
  // Chỉ lấy chất liệu đúng chức năng của Cột (không kéo câu của phần Cách làm vào Giải thích…)
  const pool = { giaithich: [...M.explain, ...M.why, ...M.story], huongdan: M.howText, batngo: M.explain, cauchuyen: M.story, luyentap: [] }[kind];
  const rest = take((pool || M.sentences).filter(s => !/^(Ngộ nhận|Thực tế|Câu hỏi|Đáp án)\s*:/i.test(s)));
  return fitSections(sections, renderLabeled, r.lengthUnit, r.min, r.max, rest.concat(CELL_FILLERS[kind] || CELL_FILLERS.generic));
}

// Prompt ảnh gợi ý đi kèm ô (AI-08): từ gợi ý ảnh của Cột và tên Topic; slot nhận lại và thêm ngữ cảnh của ô ảnh.
function writeImagePrompt(iv, column, genN) {
  const angle = ['Cận cảnh, một chủ thể rõ ràng.', 'Toàn cảnh, bố cục thoáng.', 'Tối giản, nhiều khoảng trống cho chữ.'][(genN - 1) % 3];
  return `${column.assetPrompt || 'Hình minh họa đơn giản, nền sáng.'} Chủ đề: ${iv.title}.${genN > 1 ? ' ' + angle : ''}`;
}

function parseLabeled(text) {
  const out = {}; let cur = null;
  String(text || '').split('\n').forEach(line => {
    const lb = labelOf(line);
    if (lb) { cur = lb.split('·')[0].trim(); out[cur] = ''; return; }
    if (cur) out[cur] = (out[cur] ? out[cur] + ' ' : '') + line.trim();
  });
  Object.keys(out).forEach(k => out[k] = out[k].trim());
  return out;
}

const SLOT_FILLERS = {
  post: ['Bắt đầu nhỏ, làm đều, rồi bạn sẽ thấy mình nói tự nhiên hơn.', 'Không ai yêu cầu bạn nói hoàn hảo ngay từ đầu.', 'Cứ thử một lần, lần sau sẽ dễ hơn.', 'Nói được trước, hoàn hảo sau.'],
  script: ['Nói chậm thôi, người nghe sẽ theo kịp.', 'Thử ngay sau khi xem video này.', 'Lần đầu vấp là chuyện bình thường.'],
  short: ['Nói được trước, hoàn hảo sau.', 'Thử ngay hôm nay nhé.'],
};
const HASHTAGS = ['#NoiDuocEnglish', '#TiengAnhDiLam', '#LuyenNoi'];

// Viết slot theo Format từ bài của ô. Không thêm số liệu mới (HR-05).
// Tạo lại slot cho kết quả khác theo bộ đếm: đổi câu mở theo lượt (không thêm ý hay số liệu mới)
const SLOT_OPENERS = ['Thử nghĩ xem: ', 'Nói thật nhé: ', 'Một điều nhỏ mà đáng nhớ: '];
function vary(sentence, genN) { return genN > 1 && sentence ? SLOT_OPENERS[(genN - 2) % SLOT_OPENERS.length] + sentence : sentence; }

// ---- Mẫu bài fanpage Facebook: mỗi mẫu có cách trình bày riêng, không thêm số liệu mới (HR-05) ----
const stripLead = s => String(s || '').replace(/^(Thực tế|Ngộ nhận|Nhiều người (vẫn )?nghĩ( rằng)?)\s*:?\s*/i, '').trim();
// Câu ngộ nhận của ô Bất ngờ: ở lượt chẵn, câu nằm trong Hook ("Nhiều người vẫn nghĩ: …")
const MYTH_RE = /^Nhiều người (vẫn )?nghĩ( rằng)?\s*:?\s*/i;
function mythOf(p, hook) { const c = [p['Ngộ nhận'], hook].map(x => String(x || '').trim()).find(x => MYTH_RE.test(x)); return c ? stripLead(c) : stripLead(p['Ngộ nhận'] || ''); }
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function fitFb(txt, r) {
  const tags = r.hashtagMax ? HASHTAGS.slice(0, Math.min(r.hashtagMax, 3)).join(' ') : '';
  let out = txt;
  if (r.max) {
    const paras = out.split(/\n\n/);
    while (out.length + (tags ? tags.length + 2 : 0) > r.max && paras.length > 2) { paras.splice(paras.length - 2, 1); out = paras.join('\n\n'); }
  }
  return tags ? `${out}\n\n${tags}` : out;
}
const FB_WRITERS = {
  // Ảnh số liệu: một con số lớn trong ảnh, bài đăng giải thích ngắn và ghi nguồn
  'fb-infographic'(p, c) {
    const facts = splitSentences(p['Vấn đề'] || c.middle[0] || '');
    const fact = facts.find(s => /\d/.test(s)) || facts[0];
    if (!fact) return null;
    const why = splitSentences(p['Vì sao'] || '').slice(0, 2).join(' ');
    const meaning = splitSentences(p['Ý nghĩa'] || '')[0] || '';
    return [vary(splitSentences(c.hook)[0] || '', c.genN), fact, why, meaning, c.cta || 'Lưu lại và chia sẻ cho đồng nghiệp nhé.'].filter(Boolean).join('\n\n');
  },
  // Ảnh trích dẫn: một câu nổi bật + một dòng giải thích
  'fb-quote'(p, c) {
    const truth = stripLead(p['Sự thật'] || c.middle[c.middle.length - 1] || '');
    const sents = splitSentences(truth);
    if (!sents.length) return null;
    const quote = cap1(sents[0]);
    const myth = mythOf(p, c.hook);
    const note = sents.slice(1).join(' ') || (myth ? `Nhiều người nghĩ ngược lại: “${cap1(myth.replace(/[.!?]+$/, ''))}.”` : '');
    return [`“${quote.replace(/[.!?]+$/, '')}.”`, vary(note, c.genN)].filter(Boolean).join('\n\n') + '\n\n— Nói Được English';
  },
  // Đúng hay Sai: nêu nhận định (ngộ nhận), mời bình chọn, đáp án ở bình luận
  'fb-truefalse'(p, c) {
    const claim = mythOf(p, c.hook);
    if (!claim) return null;
    const lead = vary('Nhiều người tin rằng như thế này.', c.genN);
    return [lead, `“${cap1(claim.replace(/[.!?]+$/, ''))}.”`, 'Theo bạn đây là đúng hay sai? Bình luận “Đúng” hoặc “Sai”, mình sẽ ghim đáp án và giải thích ở phần bình luận.'].join('\n\n');
  },
  // Chuyện học viên: kể ngắn một người học có thật trong Topic
  'fb-testimonial'(p, c) {
    const story = splitSentences(p['Câu chuyện'] || '');
    if (!story.length) return null;
    const lesson = splitSentences(p['Bài học'] || '')[0] || '';
    return [vary(splitSentences(c.hook)[0] || story[0], c.genN), story.slice(0, 5).join(' '), lesson ? `Điều đọng lại: ${lesson.charAt(0).toLowerCase()}${lesson.slice(1)}` : '', c.cta || 'Bạn cũng từng như vậy? Kể mình nghe ở bình luận nhé.'].filter(Boolean).join('\n\n');
  },
  // Bình chọn: câu hỏi + ba lựa chọn bấm cảm xúc
  'fb-poll'(p, c) {
    const q = (p['Câu hỏi'] || '').trim();
    if (!q) return null;
    const lead = splitSentences(p['Bối cảnh'] || c.hook)[0] || '';
    return [vary(lead, c.genN), q, '👍 Mình biết câu trả lời\n❤️ Mình đoán được một phần\n😮 Mình cần xem đáp án', 'Bấm một biểu tượng, rồi bình luận câu trả lời của bạn nhé?'].filter(Boolean).join('\n\n');
  },
  // Điền vào chỗ trống: câu tiếng Anh trong đáp án, bỏ một từ
  'fb-fill'(p, c) {
    const ans = (p['Đáp án'] || '').trim();
    const m = /"([A-Za-z][^"]+)"/.exec(ans) || /"([A-Za-z][^"]+)"/.exec(p['Câu hỏi'] || '') || (c.iv ? /"([A-Za-z][^"]{12,})"/.exec(c.iv.text || '') : null);
    const q = /"[A-Za-z][^"]+"/.test(ans + (p['Câu hỏi'] || '')) ? (p['Câu hỏi'] || '').trim() : 'Điền từ còn thiếu vào câu mẫu hay dùng trong họp:';
    if (!m) return null;
    const end = (m[1].match(/[.!?…]+$/) || ['.'])[0];
    const words = m[1].replace(/[.!?…]+$/, '').split(/\s+/);
    const idx = Math.min(words.length - 1, Math.max(1, Math.floor(words.length / 2)));
    const hint = words[idx];
    const blanked = words.map((w, i) => i === idx ? '_____' : w).join(' ');
    const lead = splitSentences(p['Bối cảnh'] || c.hook)[0] || '';
    return [vary(lead, c.genN), q, `“${blanked}${end}”`, `Gợi ý: từ cần điền bắt đầu bằng chữ “${hint.charAt(0).toUpperCase()}”. Điền vào bình luận, đáp án sẽ ghim sau nhé?`].filter(Boolean).join('\n\n');
  },
};
function writeSlot(cellText, format, genN, iv) { const t = writeSlotRaw(cellText, format, genN, iv); return t == null ? t : paraBreak(format && format.layout === 'article' ? t : plainSocial(t)); } // slot mạng xã hội không có Markdown (mục 10.28)
function writeSlotRaw(cellText, format, genN, iv) {
  const p = parseLabeled(cellText);
  const firstOf = (...keys) => keys.map(k => p[k]).find(Boolean) || '';
  const hook = firstOf('Hook', 'Bối cảnh');
  const cta = firstOf('CTA');
  const middle = Object.keys(p).filter(k => !['Hook', 'CTA'].includes(k)).map(k => p[k]);
  const r = format.hardRules || {};
  const kind = format.kind || '';
  const alt = genN % 2 === 0;
  const unit = r.lengthUnit;

  if (format.layout === 'carousel') {
    const max = r.wordsPerSlideMax || 40;
    const cap = s => { const words = s.split(/\s+/); return words.length <= max ? s : words.slice(0, max - 1).join(' ').replace(/[,;:]$/, '') + '…'; };
    let bodySentences = middle.flatMap(splitSentences);
    if (kind === 'fb-album' && bodySentences.some(s => /^Bước\s*\d+/.test(s))) bodySentences = bodySentences.filter(s => /^Bước\s*\d+/.test(s));
    let slides = [cap(iv ? iv.title : splitSentences(hook)[0] || hook)];
    bodySentences.forEach(s => slides.push(cap(s)));
    const closing = cap(kind === 'ig-data' ? 'Lưu lại để nhớ và chia sẻ cho đồng nghiệp nhé.' : 'Lưu lại để luyện theo và bình luận "xong" khi bạn làm được nhé.');
    const min = r.slideMin || 6, mx = r.slideMax || 8;
    const extra = ['Nói được trước, hoàn hảo sau.', 'Bắt đầu nhỏ, làm đều mỗi ngày.', 'Lần đầu vấp là chuyện bình thường.'];
    while (slides.length + 1 < min && extra.length) slides.push(extra.shift());
    while (slides.length + 1 > mx) slides.splice(slides.length - 1, 1);
    slides.push(closing);
    if (alt) slides[0] = cap(splitSentences(hook)[0] || slides[0]);
    slides[0] = cap(vary(slides[0], genN));
    return slides.map((s, i) => `Slide ${i + 1}: ${s}`).join('\n\n');
  }
  if (format.layout === 'article') {
    // Bài viết dài (Blog): tiêu đề, mở bài, các đoạn có đề mục theo đoạn của ô, kết
    const keys = Object.keys(p).filter(k => !['Hook', 'CTA'].includes(k));
    const sections = [
      { label: 'Tiêu đề', sentences: [`# ${iv ? iv.title : (splitSentences(hook)[0] || 'Bài viết')}`], trim: false },
      { label: 'Mở bài', sentences: splitSentences(hook).map((x, i) => i ? x : vary(x, genN)), trim: false },
      ...keys.map((k, i) => ({ label: k, sentences: [`## ${k}\n`].concat(splitSentences(p[k])), grow: i === 0 })),
      { label: 'Kết', sentences: [cta || 'Lưu bài này lại để đọc lại khi cần nhé.'], trim: false },
    ];
    return fitSections(sections, s => s.map(x => x.sentences.join(' ').replace(/\n /g, '\n')).join('\n\n'), unit, r.min, r.max, SLOT_FILLERS.post);
  }
  if (format.layout === 'longscript') {
    // Kịch bản video dài (YouTube): mỗi đoạn của ô thành một cảnh có mốc thời gian (≈ 2,5 chữ/giây)
    const keys = Object.keys(p).filter(k => !['Hook', 'CTA'].includes(k));
    const parts = [['Mở đầu', vary(hook, genN)], ...keys.map(k => [k, p[k]]), ['Kết', cta || 'Đăng ký kênh để xem video tiếp theo nhé.']];
    let sec = 0;
    const scenes = parts.map(([k, txt]) => {
      const mm = `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
      sec += countWords(txt) / 2.5;
      return { label: `${k} · ${mm}`, sentences: splitSentences(txt), grow: k === keys[0], trim: k !== 'Mở đầu' && k !== 'Kết' };
    });
    return fitSections(scenes, renderScript, unit, r.min, r.max, SLOT_FILLERS.script);
  }
  if (format.layout === 'script') {
    const body = middle.flatMap(splitSentences);
    const midLabel = (format.structure || [])[1] || 'Nội dung';
    const sections = [
      { label: 'Hook · 0–3 giây', sentences: [vary(splitSentences(hook)[0] || hook, genN)], trim: false },
      { label: midLabel, sentences: body, grow: true },
      { label: 'CTA', sentences: [splitSentences(cta).slice(-1)[0] || 'Theo dõi để xem mẹo tiếp theo nhé.'], trim: false },
    ];
    return fitSections(sections, renderScript, unit, r.min, r.max, SLOT_FILLERS.script);
  }
  // Mẫu bài fanpage Facebook (theo kind của Format)
  if (FB_WRITERS[kind]) {
    const txt = FB_WRITERS[kind](p, { hook, cta, middle, genN, iv, vary, format });
    if (txt) return fitFb(txt, r);
  }
  // Bài đăng thường (Facebook, Threads, Instagram hỏi đáp)
  const tags = r.hashtagMax ? HASHTAGS.slice(0, Math.min(r.hashtagMax, 3)) : [];
  let sections;
  if (r.ctaType === 'question') {
    const q = p['Câu hỏi'] || splitSentences(middle.join(' ')).find(s => s.includes('?')) || `${iv ? iv.title : 'Bạn nghĩ sao'}?`;
    const lead = splitSentences(p['Bối cảnh'] || hook).map((x, i) => i ? x : vary(x, genN));
    sections = (format.structure || []).length >= 2
      ? [{ label: 'Mở đầu', sentences: lead, grow: true }, { label: 'Câu hỏi', sentences: [q, 'Kể mình nghe ở phần trả lời nhé?'], trim: false }]
      : [{ label: 'Câu hỏi', sentences: [lead[0], q], grow: true, trim: true }];
    if (sections.length === 1) sections[0].sentences = sections[0].sentences.filter(Boolean);
  } else {
    const n = Math.max(1, (format.structure || []).length - 2);
    const mids = middle.length ? middle : [hook];
    const groups = [];
    for (let i = 0; i < n; i++) groups.push([]);
    mids.forEach((m, i) => groups[Math.min(i, n - 1)].push(...splitSentences(m)));
    sections = [
      { label: 'Hook', sentences: (alt ? [splitSentences(hook).slice(-1)[0] || hook] : splitSentences(hook)).map((x, i) => i ? x : vary(x, genN)), trim: false },
      ...groups.map((g, i) => ({ label: `Thân ${i + 1}`, sentences: g.length ? g : ['Bắt đầu nhỏ, làm đều.'], grow: i === groups.length - 1 })),
    ];
    if ((format.structure || []).includes('CTA') || r.requireCta) sections.push({ label: 'CTA', sentences: [cta || 'Lưu lại và thử ngay hôm nay nhé.'], trim: false });
  }
  const render = s => renderPost(s, tags);
  return fitSections(sections, render, unit, r.min, r.max, (r.max && r.max < 500) ? SLOT_FILLERS.short : SLOT_FILLERS.post);
}

// ---------- 05 · Mô hình dữ liệu và thao tác (v2.8) ----------
const DEFAULT_CELL_CRITERIA = [
  { id: 'c1', name: 'Bám Topic', weight: 25 }, { id: 'c2', name: 'Đúng giọng thương hiệu', weight: 20 },
  { id: 'c3', name: 'Hook, mở đầu thu hút', weight: 20 }, { id: 'c4', name: 'Rõ lợi ích với người đọc', weight: 20 },
  { id: 'c5', name: 'Dễ chuyển thể sang nhiều Format', weight: 15 },
];
const DEFAULT_SLOT_CRITERIA = [
  { id: 's1', name: 'Hợp kênh và Format', weight: 25 }, { id: 's2', name: 'Đúng giọng thương hiệu', weight: 20 },
  { id: 's3', name: 'Hook', weight: 20 }, { id: 's4', name: 'CTA rõ', weight: 20 }, { id: 's5', name: 'Trình bày dễ đọc', weight: 15 },
];
const LAYOUTS = { post: 'Bài đăng', script: 'Kịch bản ngắn', carousel: 'Carousel', article: 'Bài Blog', longscript: 'Kịch bản video dài' };

// Thiết lập mặc định v2.8: 6 kênh, 5 Cột theo chức năng (mục 1.3), 15 Format, 2 Tuần mẫu (mục 7.1)
function defaultSetup() {
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

function emptyState() {
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
function nextId(S, prefix) { return `${prefix}-${S.seq++}`; }
function log(S, action, entity, ref, note) {
  S.audit.push({ ts: S.settings.demoNow, action, entity, ref, note: note || '' });
  if (S.audit.length > 500) S.audit.splice(0, S.audit.length - 500);
}
const byId = (arr, id) => arr.find(x => x.id === id);

function setBrandMd(S, md) { const r = parseBrand(md); S.brand = { md, parsed: r.parsed, issues: r.issues, updatedAt: S.settings.demoNow }; }
function setVoiceMd(S, md) { const r = parseVoice(md); S.voice = { md, parsed: r.parsed, issues: r.issues, updatedAt: S.settings.demoNow }; }

// ---- Thiết lập đủ (mục 2.1) ----
function setupStatus(S) {
  const missing = [];
  if (!String(S.brand.md || '').trim()) missing.push({ key: 'brand', text: 'Chưa có Thương hiệu' });
  if (!String(S.voice.md || '').trim()) missing.push({ key: 'voice', text: 'Chưa có Giọng văn' });
  const active = S.columns.filter(c => c.active);
  if (!active.length) missing.push({ key: 'columns', text: 'Chưa có Cột nào đang bật' });
  active.forEach(c => { if (!S.formats.some(f => f.columnId === c.id)) missing.push({ key: 'formats', text: `Cột "${c.name}" chưa có Format nào` }); });
  if (!S.weekTemplates.some(t => t.slots.length)) missing.push({ key: 'templates', text: 'Chưa có Tuần mẫu nào có slot' });
  return { ok: !missing.length, missing };
}
function sumWeights(criteria) { return (criteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0); }

// ---- Kênh / Cột / Format ----
function validateFormat(S, f) {
  const errs = [];
  if (!String(f.name || '').trim()) errs.push('Cần đặt tên Format.');
  if (!f.channelId || !byId(S.channels, f.channelId)) errs.push('Cần chọn một kênh.');
  if (!f.columnId || !byId(S.columns, f.columnId)) errs.push('Cần chọn một Cột nguồn.');
  if (sumWeights(f.criteria) !== 100) errs.push(`Tổng trọng số tiêu chí phải bằng 100 (đang là ${sumWeights(f.criteria)}).`);
  const r = f.hardRules || {};
  if (r.min && r.max && Number(r.min) > Number(r.max)) errs.push('Độ dài tối thiểu lớn hơn tối đa.');
  return errs;
}
function validateColumn(S, c) {
  const errs = [];
  if (!String(c.name || '').trim()) errs.push('Cần đặt tên Cột.');
  if (sumWeights(c.criteria) !== 100) errs.push(`Tổng trọng số tiêu chí phải bằng 100 (đang là ${sumWeights(c.criteria)}).`);
  const r = c.hardRules || {};
  if (r.min && r.max && Number(r.min) > Number(r.max)) errs.push('Độ dài tối thiểu lớn hơn tối đa.');
  return errs;
}
function formatUsage(S, formatId) {
  const openWeeks = new Set(S.weeks.filter(w => w.status !== 'CONFIRMED').map(w => w.id));
  return {
    openSlots: S.slots.filter(s => s.formatId === formatId && openWeeks.has(s.weekId) && s.state !== 'PUBLISHED'),
    templates: S.weekTemplates.flatMap(t => t.slots.filter(x => x.formatId === formatId)),
    lockedSlots: S.slots.filter(s => s.formatId === formatId && !openWeeks.has(s.weekId) && s.state !== 'PUBLISHED'),
    publishedSlots: S.slots.filter(s => s.formatId === formatId && s.state === 'PUBLISHED'),
  };
}
// Xóa Format; slot ở tuần chưa chốt chuyển sang moveToId (bắt buộc nếu có), slot mẫu dùng Format đó bị xóa
function deleteFormat(S, formatId, moveToId) {
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
function templatesSorted(S) { return [...S.weekTemplates].sort((a, b) => a.order - b.order); }
function templateOf(S, id) { return byId(S.weekTemplates, id); }
function templateWarnings(S, tpl) {
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
function templateEmptyDays(tpl) { return [1, 2, 3, 4, 5, 6, 7].filter(d => !tpl.slots.some(t => t.weekday === d)); }
function templateColumnCounts(S, tpl) {
  const out = {};
  tpl.slots.forEach(t => { const f = byId(S.formats, t.formatId); if (f) out[f.columnId] = (out[f.columnId] || 0) + 1; });
  return out;
}
function addWeekTemplate(S, name, copyFromId) {
  const src = copyFromId ? templateOf(S, copyFromId) : null;
  const id = nextId(S, 'wt');
  const tpl = { id, name: String(name || '').trim() || 'Tuần mẫu mới', order: S.weekTemplates.reduce((m, t) => Math.max(m, t.order), 0) + 1,
    slots: src ? src.slots.map(s => Object.assign({}, s, { id: nextId(S, 'tpl') })) : [] };
  S.weekTemplates.push(tpl); log(S, 'create', 'weekTemplate', id);
  return tpl;
}
function deleteWeekTemplate(S, id) {
  if (!templateOf(S, id)) return { ok: false };
  S.weekTemplates = S.weekTemplates.filter(t => t.id !== id);
  templatesSorted(S).forEach((t, i) => { t.order = i + 1; });
  log(S, 'delete', 'weekTemplate', id);
  return { ok: true };
}
function moveWeekTemplate(S, id, dir) {
  const list = templatesSorted(S); const i = list.findIndex(t => t.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: false };
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((t, k) => { t.order = k + 1; });
  return { ok: true };
}
// Gợi ý Tuần mẫu kế tiếp sau Tuần mẫu của tuần liền trước (vòng A → B → … → A)
function suggestTemplateId(S, startDate) {
  const list = templatesSorted(S).filter(t => t.slots.length);
  if (!list.length) return null;
  const prev = weekOf(S, weekIdOf(addDays(startDate, -7)));
  if (prev && prev.templateId) {
    const i = list.findIndex(t => t.id === prev.templateId);
    if (i >= 0) return list[(i + 1) % list.length].id;
  }
  return list[0].id;
}
function previewTemplateWeek(S, startDate, templateId) {
  const tpl = templateOf(S, templateId); if (!tpl) return [];
  return tpl.slots.filter(t => byId(S.formats, t.formatId)).map(t => {
    const f = byId(S.formats, t.formatId);
    return { weekday: t.weekday, date: addDays(startDate, t.weekday - 1), time: t.time, channelId: f.channelId, formatId: t.formatId, columnId: f.columnId };
  }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
// Nút Tuần mẫu: chỉ dùng được khi tuần chưa có slot nào và chưa chốt
function canApplyTemplate(S, startDate) {
  const w = weekOf(S, weekIdOf(startDate));
  if (w && w.status === 'CONFIRMED') return { ok: false, reason: 'Tuần đã chốt. Mở lại tuần để sửa.' };
  const n = w ? weekSlots(S, w.id).length : 0;
  if (n) return { ok: false, reason: `Tuần đã có ${n} slot. Xóa hết slot của tuần nếu muốn dùng lại Tuần mẫu.` };
  const st = setupStatus(S);
  if (!st.ok) return { ok: false, reason: `Thiết lập chưa đủ: ${st.missing.map(m => m.text).join('; ')}.` };
  return { ok: true, reason: '' };
}
function applyTemplateWeek(S, startDate, templateId) {
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
function weekIdOf(startDate) { return `w-${startDate}`; }
function weekOf(S, weekId) { return byId(S.weeks, weekId); }
function isLocked(S, weekId) { const w = weekOf(S, weekId); return !!w && w.status === 'CONFIRMED'; }
// Slot không sửa được (mục 10.24): bài Đã đăng chỉ xem; tuần đã chốt thì phải Mở lại để sửa
const PUBLISHED_LOCK = 'Bài đã đăng chỉ xem, không sửa được. Đăng tay thì "Bỏ đánh dấu" trước nếu lỡ đánh dấu nhầm.';
function slotLockMsg(S, s) {
  if (s && s.state === 'PUBLISHED') return PUBLISHED_LOCK;
  if (s && isLocked(S, s.weekId)) return 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.';
  return '';
}
function weekLabelOf(startDate) {
  const end = addDays(startDate, 6);
  const iw = isoWeek(startDate);
  return { short: `Tuần ${dmy(startDate)}`, range: `${dmy(startDate)} – ${dmyFull(end)}`, iso: `${iw.year}-W${String(iw.week).padStart(2, '0')}` };
}
function weekLabel(w) { return weekLabelOf(w.startDate); }
function weekSlots(S, weekId) {
  return S.slots.filter(s => s.weekId === weekId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function newAsset(a) { const x = { name: a.name, hint: a.prompt || '', prompt: '', cellPrompt: '', versions: [], current: null, done: false, ref: '' }; if (a.ratio) x.ratio = a.ratio; return x; }
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
function ensureWeek(S, startDate) {
  if (!isValidYMD(startDate)) return { ok: false, error: 'Ngày không hợp lệ.' };
  if (weekdayOf(startDate) !== 1) return { ok: false, error: `${dmyFull(startDate)} không phải thứ Hai. Chọn thứ Hai ${dmyFull(mondayOf(startDate))}.` };
  const have = weekOf(S, weekIdOf(startDate));
  if (have) return { ok: true, week: have, created: false };
  const w = { id: weekIdOf(startDate), startDate, status: 'DRAFT', columnIds: matrixLayout(S), confirmedAt: null, revision: 0, templateId: null, dealtAt: null };
  S.weeks.push(w);
  log(S, 'create', 'week', w.id);
  return { ok: true, week: w, created: true };
}
function validateSlotInput(S, weekId, input) {
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
function clearSlotContent(s) {
  Object.assign(s, { sourceCellId: null, sourceStamp: null, text: '', prevText: null, state: s.state === 'PUBLISHED' ? 'PUBLISHED' : 'EMPTY', needsUpdate: false, scores: [], total: null, tip: '', keepReason: '' });
  s.assets.forEach(a => { a.cellPrompt = ''; a.prompt = ''; });
}
function addSlot(S, weekId, input) {
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
function addSlotToStart(S, startDate, input) {
  const r = ensureWeek(S, startDate); if (!r.ok) return r;
  return addSlot(S, r.week.id, input);
}
function updateSlot(S, slotId, patch) {
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
function moveSlotCheck(S, slotId, date) {
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
function moveSlot(S, slotId, date, opts = {}) {
  const c = moveSlotCheck(S, slotId, date); if (!c.ok) return c;
  if (c.needReopen && !opts.reopen) return { ok: false, error: 'Tuần đã chốt. Cần Mở lại để sửa trước khi chuyển slot.', needReopen: true };
  const s = byId(S.slots, slotId);
  if (c.needReopen) reopenWeek(S, s.weekId);
  s.date = date; log(S, 'move', 'slot', s.id, `${c.from} → ${date}`);
  return Object.assign(c, { reopened: !!c.needReopen });
}
// Hoàn tác chuyển ngày: về ngày cũ; tuần đã mở lại vì lần chuyển này thì chốt lại như trước
function undoMoveSlot(S, slotId, from, reopened) {
  const s = byId(S.slots, slotId); if (!s || s.state === 'PUBLISHED') return { ok: false, error: 'Không hoàn tác được.' };
  s.date = from; log(S, 'move', 'slot', s.id, `hoàn tác → ${from}`);
  const w = weekOf(S, s.weekId); if (reopened && w && w.status === 'REOPENED') w.status = 'CONFIRMED';
  return { ok: true };
}
// Cột của slot: slot tự do tự chọn (có thể không có Cột), slot thường theo Format
function slotColumnId(S, s) { if (s.free) return s.columnId || null; if (s.columnId) return s.columnId; const f = byId(S.formats, s.formatId); return f ? f.columnId : null; }
function deleteSlot(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  S.slots = S.slots.filter(x => x.id !== slotId); log(S, 'delete', 'slot', slotId);
  return { ok: true };
}
function reopenWeek(S, weekId) {
  const w = weekOf(S, weekId); if (!w || w.status !== 'CONFIRMED') return { ok: false };
  w.status = 'REOPENED'; log(S, 'reopen', 'week', weekId); return { ok: true };
}

// ---- Topic (hàng ma trận), ô ----
function topicsOf(S, weekId) { return S.topics.filter(i => i.weekId === weekId).sort((a, b) => a.order - b.order); }
function topicCurrent(row) { return row.currentVersion == null ? null : row.versions.find(v => v.n === row.currentVersion) || null; }
function cellsOf(S, weekId) { return S.cells.filter(c => c.weekId === weekId); }
function cellAt(S, weekId, topicId, columnId, k) { k = k || 0; return S.cells.find(c => c.weekId === weekId && c.topicId === topicId && c.columnId === columnId && (c.k || 0) === k); }
// Vị trí Cột của tuần (10.53): một loại Cột có thể đứng ở nhiều vị trí; k là lần xuất hiện thứ mấy của loại đó (0, 1, …)
function weekLanes(S, w) {
  const seen = {};
  return (w ? w.columnIds : []).map((colId, pos) => { const k = seen[colId] || 0; seen[colId] = k + 1; return { pos, colId, k }; })
    .map(l => Object.assign(l, { label: laneLabel(S, w, l.colId, l.k) }));
}
function laneLabel(S, w, colId, k) {
  const col = byId(S.columns, colId); const name = col ? col.name : '?';
  return w && w.columnIds.filter(x => x === colId).length > 1 ? `${name} ${(k || 0) + 1}` : name;
}
function cellLabel(S, cell) { return laneLabel(S, weekOf(S, cell.weekId), cell.columnId, cell.k || 0); }
// Cấu hình Matrix (10.53): danh sách loại Cột theo vị trí cho tuần mới; chưa cấu hình thì lấy các Cột đang bật
function matrixLayout(S) {
  const ids = (S.settings.matrixColumns || []).filter(id => byId(S.columns, id));
  return ids.length ? ids : S.columns.filter(c => c.active).map(c => c.id);
}
function setMatrixLayout(S, ids) {
  const clean = (ids || []).filter(id => byId(S.columns, id));
  if (!clean.length) return { ok: false, error: 'Matrix cần ít nhất 1 Cột.' };
  S.settings.matrixColumns = clean; log(S, 'matrix-layout', 'settings', '', clean.join(','));
  return { ok: true };
}
function cellView(S, cell) {
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
function slotsUsingCell(S, cellId) { return S.slots.filter(s => s.sourceCellId === cellId); }
function addWeekColumn(S, weekId, columnId) {
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
function removeColumnImpact(S, weekId, columnId, k) {
  const cells = cellsOf(S, weekId).filter(c => c.columnId === columnId && (c.k || 0) === (k || 0));
  const ids = new Set(cells.map(c => c.id));
  const slots = weekSlots(S, weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId));
  return { cells: cells.length, cellsWithContent: cells.filter(c => c.gens.length).length, slots: slots.length };
}
function removeWeekColumn(S, weekId, columnId, k) {
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
function refreshSlotFlags(S, weekId) {
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
function topicFileOf(S, weekId) { return (S.topicFiles || []).find(f => f.weekId === weekId) || null; }
function topicNumbersOf(S, cell) {
  const row = byId(S.topics, cell.topicId); const v = row ? topicCurrent(row) : null;
  if (!v) return null;
  const file = topicFileOf(S, cell.weekId);
  return extractNumbers(`${v.title}\n${v.text}\n${Object.values(v.fields || {}).join('\n')}\n${file ? file.context : ''}`);
}
function cellWarnings(S, cell, text) {
  const col = byId(S.columns, cell.columnId); if (!col) return [];
  const others = cellsOf(S, cell.weekId).filter(c => c.id !== cell.id && (c.topicId !== cell.topicId || c.columnId === cell.columnId)).map(c => cellView(S, c).text).filter(Boolean);
  return checkRules(text, Object.assign(ruleCtxBase(S), { kind: 'cell', rules: col.hardRules, structure: col.structure, layout: 'labeled',
    topicNumbers: topicNumbersOf(S, cell), otherCellTexts: others })).concat(layoutIssues(text));
}
// Cảnh báo ở Topic (TPC-03): ngắn, không có trường hợp cụ thể (D100)
function topicWarnings(S, row, v) {
  const w = []; if (!v) return w;
  if (v.words < TOPIC_SHORT_WORDS) w.push({ id: 'TPC-W', level: 'note', text: `Topic ngắn (${v.words} chữ): AI dễ phải thêm ý ngoài Topic; khuyến nghị khoảng 2.000 chữ.` });
  if (!v.hasCase) w.push({ id: 'TPC-W', level: 'note', text: 'Không có trường hợp cụ thể: ô Câu chuyện của Topic này không được viết (nên Hủy).' });
  return w;
}
function ensureCells(S, weekId) {
  const w = weekOf(S, weekId);
  topicsOf(S, weekId).forEach(i => weekLanes(S, w).forEach(({ colId, k }) => {
    if (!cellAt(S, weekId, i.id, colId, k)) S.cells.push(Object.assign({ id: nextId(S, 'cell'), weekId, topicId: i.id, columnId: colId, gens: [], byVersion: {} }, k ? { k } : {}));
  }));
}
// ---- Nạp tệp Topic (TPC-01..04) ----
function sameTopicContent(v, p) {
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
function previewTopics(S, weekId, md) {
  // Chuẩn hoá theo Khung Topic trước khi đọc (mục 10.30); r.normalized giữ tệp sau chuẩn hoá và danh sách thay đổi
  const n = normalizeTopicMd(S, md);
  const r = Object.assign(parseTopics(n.md), { normalized: n });
  if (r.errors.length) return Object.assign({ ok: false }, r);
  const d = diffTopics(S, weekId, r);
  return Object.assign({ ok: true }, r, d);
}
function uniqueTopicId(S, w, n) { let k = n; while (byId(S.topics, `${w.id}-topic-${k}`)) k++; return `${w.id}-topic-${k}`; }
function importTopics(S, weekId, md, at) {
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
const topicFieldLines = f => [['Thông điệp chính', 'message'], ['Đối tượng', 'audience'], ['Góc nhìn', 'angle']].filter(([, k]) => f && f[k]).map(([n, k]) => `${n}: ${f[k]}`);
function previewAddTopics(S, weekId, md) {
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
function addTopics(S, weekId, md, at) {
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
function topicImpact(S, weekId, topicId) {
  const cells = cellsOf(S, weekId).filter(c => c.topicId === topicId);
  const ids = new Set(cells.map(c => c.id));
  return { cells: cells.length, cellsWithContent: cells.filter(c => c.gens.length).length, slots: weekSlots(S, weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId)).length };
}
// Hủy Topic: bỏ hàng, các ô của hàng; slot dùng ô đó về "Chưa có bài"
function removeTopic(S, weekId, topicId) {
  const row = byId(S.topics, topicId);
  if (!row || row.weekId !== weekId) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  const impact = topicImpact(S, weekId, topicId);
  dropTopicRow(S, weekId, row);
  topicsOf(S, weekId).forEach((r, i) => { r.order = i + 1; });
  log(S, 'remove', 'topic', topicId);
  return { ok: true, impact };
}
function slotWarnings(S, slot) {
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
function dealGate(S, weekId) {
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
function dealSlots(S, weekId, at) {
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
function slotWriteGate(S, slotId) {
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
function writeSlotNow(S, slotId, at) {
  const g = slotWriteGate(S, slotId); if (!g.ok) return { ok: false, error: g.reason + '.' };
  const s = byId(S.slots, slotId);
  const order = new Map(topicsOf(S, s.weekId).map(r => [r.id, r.order]));
  const use = c => S.slots.filter(x => x.id !== s.id && x.sourceCellId === c.id).length;
  const cell = g.cells.slice().sort((a, b) => use(a) - use(b) || (order.get(a.topicId) || 0) - (order.get(b.topicId) || 0))[0];
  writeSlotFromCell(S, s, cell, at);
  log(S, 'write-slot', 'slot', slotId, cell.id);
  return { ok: true, slot: s, cellId: cell.id };
}
function composeAssetPrompt(cellPrompt, asset, i, total) {
  const part = total > 1 ? ` (ảnh ${i + 1}/${total})` : '';
  return `${cellPrompt} ${asset.name}${part}${asset.hint ? `: ${asset.hint}` : ''}`.replace(/\s+/g, ' ').trim();
}
function writeSlotFromCell(S, slot, cell, at) {
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
function slotCellChoices(S, slotId) {
  const s = byId(S.slots, slotId); if (!s) return [];
  const f = byId(S.formats, s.formatId); if (!f) return [];
  return cellsOf(S, s.weekId).filter(c => c.columnId === slotColumnId(S, s) && cellView(S, c).state === 'APPROVED').map(c => ({
    cell: c, topic: byId(S.topics, c.topicId), usedBy: S.slots.filter(x => x.sourceCellId === c.id && x.id !== s.id).length, current: s.sourceCellId === c.id,
  })).sort((a, b) => a.topic.order - b.topic.order);
}
function assignCell(S, slotId, cellId, at) {
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
function assetRef(slot, a, n) { const v = a.versions.find(x => x.n === n); return `assets/${slot.weekId}/${slot.id}-${fold(a.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-v${n}.${v && v.src ? (v.ext || 'jpg') : 'png'}`; }
function chooseSlotImage(S, slotId, idx, n) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a || !a.versions.some(v => v.n === n)) return { ok: false, error: 'Không có phiên bản ảnh này.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  a.current = n; a.done = true; a.ref = assetRef(s, a, n);
  return { ok: true };
}
// Sửa prompt của một ô ảnh (mục 10.11); prompt đã sửa tay được giữ khi slot viết lại
function setSlotImagePrompt(S, slotId, idx, prompt) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const p = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!p) return { ok: false, error: 'Prompt không được để trống.' };
  if (p !== a.prompt) { a.prompt = p; a.promptEdited = true; log(S, 'edit-image-prompt', 'slot', slotId, a.name); }
  return { ok: true };
}
function genSlotImage(S, slotId, idx, at) {
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
function editSlotImage(S, slotId, idx, instruction, at) {
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
function addSlotAsset(S, slotId, kind) {
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
function removeSlotAsset(S, slotId, idx) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  if (!a.extra && !s.free) return { ok: false, error: 'Chỉ bỏ được ô thêm; ô của Format giữ nguyên.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  s.assets.splice(idx, 1); log(S, 'remove-asset', 'slot', slotId);
  return { ok: true };
}
// Ảnh người dùng tải lên (mục 10.9): thành một phiên bản của ô ảnh, chọn ngay; không cần prompt
function uploadSlotImage(S, slotId, idx, file, at) {
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
const STEP_NAMES = ['Lập tuần', 'Nạp Topic', 'Viết ma trận', 'Duyệt ô', 'Chia bài', 'Duyệt slot và ảnh', 'Xác nhận và xuất'];
const STEP_COUNT = STEP_NAMES.length;
function matrixCounts(S, weekId) {
  const counts = { EMPTY: 0, DRAFT: 0, APPROVED: 0, CANCELLED: 0, total: 0 };
  const live = new Set(topicsOf(S, weekId).filter(r => topicCurrent(r)).map(r => r.id));
  cellsOf(S, weekId).forEach(c => {
    if (!live.has(c.topicId)) return;
    counts[cellView(S, c).state]++; counts.total++;
  });
  return counts;
}
function slotCounts(S, weekId) {
  const c = { EMPTY: 0, DRAFT: 0, APPROVED: 0, PUBLISHED: 0, needsUpdate: 0, total: 0 };
  weekSlots(S, weekId).forEach(s => { c[s.state]++; c.total++; if (s.needsUpdate) c.needsUpdate++; });
  return c;
}
function imageCounts(S, weekId) {
  const r = { boxes: 0, done: 0 };
  weekSlots(S, weekId).forEach(s => s.assets.forEach(a => { r.boxes++; if (a.done) r.done++; }));
  return r;
}
function weekProgress(S, weekId) {
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
function nextAction(S, weekId) {
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
function weekKpi(S, weekId) {
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
function weekForDate(S, ymd) { const m = mondayOf(ymd); return S.weeks.find(w => w.startDate === m) || null; }

// ---- Sao lưu (SET-10) ----
function exportBackup(S) {
  const state = clone(S); delete state.ui;
  const body = JSON.stringify(state);
  return JSON.stringify({ format: 'autocontent-backup', dataVersion: DATA_VERSION, createdAt: S.settings.demoNow, sha256: sha256(body), state }, null, 1);
}
function importBackup(text) {
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
function validateState(S) {
  if (!S || typeof S !== 'object') return { ok: false, error: 'không phải đối tượng' };
  if (S.dataVersion !== DATA_VERSION) return { ok: false, error: `phiên bản ${S.dataVersion}` };
  for (const k of ['channels', 'columns', 'formats', 'weekTemplates', 'weeks', 'topicFiles', 'topics', 'cells', 'slots', 'audit']) {
    if (!Array.isArray(S[k])) return { ok: false, error: `thiếu danh sách ${k}` };
  }
  if (!S.brand || !S.voice || !S.settings) return { ok: false, error: 'thiếu brand/voice/settings' };
  return { ok: true };
}
// Đọc dữ liệu đã lưu: hỏng thì trả về rescue để cứu bản thô (UX-10)
function loadStateFromRaw(raw) {
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

// ---------- 05b · R2′: Viết ma trận, thao tác ô, sửa Topic (MTX-01..08, TPC-08) ----------
// Ô Câu chuyện của Topic không có trường hợp cụ thể thì không viết (D100, MTX-07)
function cellNoCase(S, cell) {
  const col = byId(S.columns, cell.columnId); const row = byId(S.topics, cell.topicId);
  const v = row ? topicCurrent(row) : null;
  return !!col && col.kind === 'cauchuyen' && !!v && !v.hasCase;
}
function cellGuard(S, cell) {
  if (!cell) return 'Không tìm thấy ô.';
  if (isLocked(S, cell.weekId)) return 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.';
  const row = byId(S.topics, cell.topicId);
  if (!row || !topicCurrent(row)) return 'Không tìm thấy Topic của ô.';
  return '';
}
// Bài của một lượt sinh theo bản sửa (editRev = 0 là bản AI viết)
function genText(gen, editRev) {
  if (!gen) return '';
  const e = editRev ? gen.edits.find(x => x.rev === editRev) : null;
  return e ? e.text : gen.text;
}
function genImagePrompt(gen, editRev) {
  if (!gen) return '';
  const e = editRev ? gen.edits.find(x => x.rev === editRev) : null;
  return e && e.imagePrompt != null ? e.imagePrompt : gen.imagePrompt || '';
}
function lastEditRev(gen) { return gen && gen.edits.length ? gen.edits[gen.edits.length - 1].rev : 0; }

// ---- Viết ma trận (MTX-01): các ô Trống của phiên bản Topic hiện hành, theo thứ tự Topic rồi Cột ----
function writeQueue(S, weekId) {
  const w = weekOf(S, weekId); if (!w) return [];
  const out = [];
  topicsOf(S, weekId).filter(r => topicCurrent(r)).forEach(r => weekLanes(S, w).forEach(({ colId, k }) => {
    const c = cellAt(S, weekId, r.id, colId, k);
    if (c && cellView(S, c).state === 'EMPTY' && !cellNoCase(S, c)) out.push(c.id);
  }));
  return out;
}
function noCaseEmptyCount(S, weekId) {
  return cellsOf(S, weekId).filter(c => cellView(S, c).state === 'EMPTY' && cellNoCase(S, c) && topicCurrent(byId(S.topics, c.topicId) || {})).length;
}
function writeGate(S, weekId) {
  const w = weekOf(S, weekId);
  const rows = w ? topicsOf(S, weekId).filter(r => topicCurrent(r)) : [];
  const reasons = [];
  if (w && w.status === 'CONFIRMED') reasons.push('Tuần đã chốt');
  const queue = writeQueue(S, weekId);
  if (!rows.length) reasons.push('Chưa có Topic');
  else if (!queue.length) {
    const nc = noCaseEmptyCount(S, weekId);
    reasons.push(nc ? `Mọi ô viết được đã có bài; ${nc} ô Câu chuyện không viết (Topic không có trường hợp) · nên Hủy` : 'Mọi ô đã có bài');
  }
  return { ok: !reasons.length, reasons, count: queue.length, queue };
}
// Viết một ô Trống (một lượt sinh: một bài + một gợi ý ảnh, MTX-01/02)
function writeCellNow(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  if (cellView(S, cell).state !== 'EMPTY') return { ok: false, error: 'Ô đã có bài.' };
  if (cellNoCase(S, cell)) return { ok: false, error: 'Topic không có trường hợp cụ thể · nên Hủy ô Câu chuyện này.' };
  const row = byId(S.topics, cell.topicId);
  const gen = addCellGen(S, cell, row.currentVersion, 'DRAFT', at || S.settings.demoNow);
  if (!gen) return { ok: false, error: 'Không viết được ô này.' };
  refreshSlotFlags(S, cell.weekId);
  return { ok: true, gen };
}
// Viết toàn bộ hàng đợi (dùng cho test; giao diện viết từng ô để có nút Dừng)
function writeMatrix(S, weekId, at) {
  const gate = writeGate(S, weekId);
  if (!gate.ok) return { ok: false, reasons: gate.reasons, written: 0 };
  let written = 0;
  gate.queue.forEach(id => { if (writeCellNow(S, id, at).ok) written++; });
  log(S, 'write-matrix', 'week', weekId, `${written} ô`);
  return { ok: true, written };
}

// ---- Thao tác ô (MTX-03..06) ----
function approveCell(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (v.state !== 'DRAFT') return { ok: false, error: v.state === 'APPROVED' ? 'Ô đã duyệt.' : 'Ô chưa có bài để duyệt.' };
  const bv = cell.byVersion[v.topicVersion];
  bv.state = 'APPROVED'; bv.approvedAt = at || S.settings.demoNow;
  log(S, 'approve', 'cell', cellId);
  return { ok: true, warnings: cellWarnings(S, cell, v.text).length };
}
// Tạo lại: thêm một lượt sinh cho phiên bản Topic hiện hành; ô về Chưa duyệt (cả ô Trống, Đã duyệt, Đã hủy)
function regenCell(S, cellId, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  if (cellNoCase(S, cell)) return { ok: false, error: 'Topic không có trường hợp cụ thể nên ô Câu chuyện không viết được (D100).' };
  const row = byId(S.topics, cell.topicId);
  const gen = addCellGen(S, cell, row.currentVersion, 'DRAFT', at || S.settings.demoNow);
  if (!gen) return { ok: false, error: 'Không viết được ô này.' };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'regen', 'cell', cellId, `bản ${gen.n}`);
  return { ok: true, gen };
}
// Sửa tay bài và gợi ý ảnh của bản hiện hành: thêm một bản sửa, ô về Chưa duyệt
function editCell(S, cellId, text, imagePrompt, at) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (!v.gen) return { ok: false, error: 'Ô chưa có bài để sửa.' };
  const t = String(text || '').replace(/\r\n?/g, '\n').trim();
  const p = String(imagePrompt == null ? v.imagePrompt : imagePrompt).trim();
  if (!t) return { ok: false, error: 'Bài của ô không được để trống.' };
  if (t === v.text && p === v.imagePrompt && v.state !== 'CANCELLED') return { ok: false, error: 'Chưa có thay đổi.' };
  const rev = lastEditRev(v.gen) + 1;
  v.gen.edits.push({ rev, text: t, imagePrompt: p, at: at || S.settings.demoNow });
  cell.byVersion[v.topicVersion] = { state: 'DRAFT', currentRef: { genN: v.gen.n, editRev: rev }, approvedAt: null };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'edit', 'cell', cellId, `bản ${v.gen.n} · sửa ${rev}`);
  return { ok: true, rev };
}
function cancelCellNow(S, cellId) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const v = cellView(S, cell);
  if (v.state === 'CANCELLED') return { ok: false, error: 'Ô đã hủy.' };
  cancelCell(cell, v.topicVersion);
  refreshSlotFlags(S, cell.weekId);
  log(S, 'cancel', 'cell', cellId);
  return { ok: true, slots: slotsUsingCell(S, cellId).length };
}
// "Dùng bản này" (MTX-05): chọn một lượt sinh bất kỳ (kể cả viết từ phiên bản Topic cũ) làm bản hiện hành; ô về Chưa duyệt
function useCellGen(S, cellId, genN) {
  const cell = byId(S.cells, cellId);
  const err = cellGuard(S, cell); if (err) return { ok: false, error: err };
  const gen = cell.gens.find(g => g.n === genN);
  if (!gen) return { ok: false, error: 'Không tìm thấy bản này.' };
  const v = cellView(S, cell);
  const editRev = lastEditRev(gen);
  if (v.gen && v.gen.n === genN && v.editRev === editRev && v.state !== 'CANCELLED') return { ok: false, error: 'Đây đã là bản hiện hành.' };
  cell.byVersion[v.topicVersion] = { state: 'DRAFT', currentRef: { genN, editRev }, approvedAt: null };
  refreshSlotFlags(S, cell.weekId);
  log(S, 'use-gen', 'cell', cellId, `bản ${genN}`);
  return { ok: true };
}
// Duyệt hàng loạt (MTX-08): chỉ các ô Chưa duyệt không có cảnh báo
// Ô Chưa duyệt của Topic còn hiệu lực; withWarned = true thì gồm cả ô có cảnh báo (mục 10.55)
function bulkApprovable(S, weekId, withWarned) {
  if (isLocked(S, weekId)) return [];
  const live = new Set(topicsOf(S, weekId).filter(r => topicCurrent(r)).map(r => r.id));
  return cellsOf(S, weekId).filter(c => {
    if (!live.has(c.topicId)) return false;
    const v = cellView(S, c);
    return v.state === 'DRAFT' && (withWarned || !cellWarnings(S, c, v.text).length);
  });
}
function bulkWarned(S, weekId) {
  return bulkApprovable(S, weekId, true).map(c => ({ cell: c, warnings: cellWarnings(S, c, cellView(S, c).text) })).filter(x => x.warnings.length);
}
function approveCellsBulk(S, weekId, at, withWarned) {
  const list = bulkApprovable(S, weekId, withWarned);
  list.forEach(c => approveCell(S, c.id, at));
  const left = matrixCounts(S, weekId).DRAFT;
  if (list.length) log(S, 'approve-bulk', 'week', weekId, `${list.length} ô`);
  return { ok: true, approved: list.length, left };
}

// ---- Sửa Topic trực tiếp, back/next và "Dùng phiên bản này" (TPC-08) ----
function topicVersionImpact(S, topicId) {
  const row = byId(S.topics, topicId); if (!row) return { cells: 0, slots: 0 };
  const cells = cellsOf(S, row.weekId).filter(c => c.topicId === topicId);
  const ids = new Set(cells.map(c => c.id));
  return { cells: cells.filter(c => cellView(S, c).text).length, slots: weekSlots(S, row.weekId).filter(s => s.sourceCellId && ids.has(s.sourceCellId)).length };
}
function editTopic(S, topicId, input, at) {
  const row = byId(S.topics, topicId);
  if (!row) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, row.weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  const title = String(input.title || '').trim();
  const text = String(input.text || '').replace(/\r\n?/g, '\n').trim();
  const fields = { message: String((input.fields || {}).message || '').trim(), audience: String((input.fields || {}).audience || '').trim(), angle: String((input.fields || {}).angle || '').trim() };
  if (!title) return { ok: false, error: 'Topic cần có tên.' };
  if (!text) return { ok: false, error: 'Topic không có nội dung.' };
  const p = { title, text, fields };
  if (sameTopicContent(topicCurrent(row), p)) return { ok: false, error: 'Chưa có thay đổi.' };
  const impact = topicVersionImpact(S, topicId);
  const n = row.versions.length + 1;
  const words = countWords(text.replace(/^#{1,6}\s+/gm, ''));
  row.versions.push({ n, title, text, fields, words, hasCase: topicHasCase(text), createdAt: at || S.settings.demoNow, reason: 'edited' });
  row.currentVersion = n;
  refreshSlotFlags(S, row.weekId);
  log(S, 'edit', 'topic', topicId, `v${n}`);
  return { ok: true, version: n, impact };
}
function useTopicVersion(S, topicId, n) {
  const row = byId(S.topics, topicId);
  if (!row) return { ok: false, error: 'Không tìm thấy Topic.' };
  if (isLocked(S, row.weekId)) return { ok: false, error: 'Tuần đã chốt. Bấm "Mở lại để sửa" trước.' };
  if (!row.versions.some(v => v.n === n)) return { ok: false, error: 'Không có phiên bản này.' };
  if (row.currentVersion === n) return { ok: false, error: 'Đây đã là phiên bản hiện hành.' };
  const impact = topicVersionImpact(S, topicId);
  row.currentVersion = n;
  refreshSlotFlags(S, row.weekId);
  log(S, 'use-version', 'topic', topicId, `v${n}`);
  return { ok: true, impact };
}

// ---------- 05c · R3′: Chia bài, thao tác slot (DST-01..07, CAL-13..15) ----------
function slotGuard(S, s) {
  if (!s) return 'Không tìm thấy slot.';
  return slotLockMsg(S, s);
}
// Đánh dấu "nội dung đã đổi sau khi đăng" khi slot Đã đăng bị đổi bài (tuần Đang sửa)
function markChanged(s, before) { if (s.state === 'PUBLISHED' && s.text !== before) s.changedAfterPublish = true; }
// Chia bài (DST-01..05): viết slot trống từ ô; slot của Cột không có ô Đã duyệt giữ "Chưa có bài" kèm lý do
function dealWeek(S, weekId, at) {
  const r = dealSlots(S, weekId, at);
  if (!r.ok) return r;
  const w = weekOf(S, weekId);
  weekSlots(S, weekId).forEach(s => {
    if (s.state !== 'EMPTY' || s.free) { s.emptyReason = s.free && s.state === 'EMPTY' ? 'Slot tự do: bạn tự viết bài' : ''; return; }
    const f = byId(S.formats, s.formatId);
    const cid = slotColumnId(S, s), col = f ? byId(S.columns, cid) : null;
    s.emptyReason = !f ? 'Format đã xóa' : !w.columnIds.includes(cid) ? `Cột "${col ? col.name : '?'}" không có trong tuần` : `Cột "${col ? col.name : '?'}" không có ô Đã duyệt`;
  });
  return r;
}
function slotSourceCell(S, s) { return s && s.sourceCellId ? byId(S.cells, s.sourceCellId) : null; }
// Duyệt tất cả slot (10.56): slot Chưa duyệt có bài, không cần cập nhật; withWarned = true thì gồm cả slot có cảnh báo
function slotsApprovable(S, weekId, withWarned) {
  if (isLocked(S, weekId)) return [];
  return weekSlots(S, weekId).filter(s => s.state === 'DRAFT' && s.text && !s.needsUpdate && (withWarned || !slotWarnings(S, s).length));
}
function slotsWarned(S, weekId) {
  return slotsApprovable(S, weekId, true).map(s => ({ slot: s, warnings: slotWarnings(S, s) })).filter(x => x.warnings.length);
}
function approveSlotsBulk(S, weekId, at, withWarned) {
  const list = slotsApprovable(S, weekId, withWarned);
  list.forEach(s => approveSlot(S, s.id, at));
  const left = weekSlots(S, weekId).filter(s => s.state === 'DRAFT').length;
  if (list.length) log(S, 'approve-bulk', 'slots', weekId, `${list.length} slot`);
  return { ok: true, approved: list.length, left };
}
// Duyệt slot: cần có bài và không "cần cập nhật"
function approveSlot(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.text) return { ok: false, error: 'Slot chưa có bài.' };
  if (s.needsUpdate) return { ok: false, error: 'Slot cần cập nhật: chọn "Cập nhật từ ô" hoặc "Giữ bản slot" trước.' };
  if (s.state !== 'DRAFT') return { ok: false, error: s.state === 'APPROVED' ? 'Slot đã duyệt.' : 'Slot đã đăng.' };
  s.state = 'APPROVED'; s.approvedAt = at || S.settings.demoNow;
  log(S, 'approve', 'slot', slotId);
  return { ok: true, warnings: slotWarnings(S, s).length };
}
// Tạo lại: viết lại từ ô nguồn hiện hành (bản mới vào history; Hoàn tác một lần = dùng lại bản trước)
function regenSlot(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (s.free) return { ok: false, error: 'Slot tự do không có ô nguồn để tạo lại. Hãy sửa bài trực tiếp.' };
  const cell = slotSourceCell(S, s);
  if (!cell) return { ok: false, error: 'Slot chưa có ô nguồn. Bấm Chia bài ở Matrix hoặc chọn ô.' };
  if (cellView(S, cell).state !== 'APPROVED') return { ok: false, error: 'Ô nguồn chưa ở trạng thái Đã duyệt. Duyệt lại ô hoặc chọn ô khác.' };
  const before = s.text; const prevN = s.genN;
  writeSlotFromCell(S, s, cell, at);
  markChanged(s, before); s.undoN = prevN;
  log(S, 'regen', 'slot', slotId, `bản ${s.genN}`);
  return { ok: true, n: s.genN };
}
// Dùng một bản trong history (back/next, Hoàn tác): bài, ô nguồn và dấu theo bản đó; cờ "cần cập nhật" tính lại
function useSlotVersion(S, slotId, n) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  const h = (s.history || []).find(x => x.n === n);
  if (!h) return { ok: false, error: 'Không có bản này.' };
  if (s.text === h.text && s.sourceCellId === h.cellId) return { ok: false, error: 'Đây đã là bản đang dùng.' };
  const before = s.text;
  const f = byId(S.formats, s.formatId);
  const sc = scoreText(h.text, f ? f.criteria : [], `${s.id}|${n}`);
  Object.assign(s, { text: h.text, sourceCellId: h.cellId, sourceStamp: h.stamp, scores: sc.scores, total: sc.total, tip: sc.tip, keepReason: '', keepStamp: null, needsUpdate: false, undoN: null, curN: n });
  if (h.ai) s.ai = Object.assign({}, h.ai, { scored: false }); else delete s.ai;
  if (s.state !== 'PUBLISHED') s.state = 'DRAFT';
  markChanged(s, before); blogRefreshAuto(S, s);
  refreshSlotFlags(S, s.weekId);
  log(S, 'use-version', 'slot', slotId, `bản ${n}`);
  return { ok: true };
}
// Sửa tay bài slot: thêm một bản vào history, slot về Chưa duyệt
function editSlot(S, slotId, text, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.text && !s.free) return { ok: false, error: 'Slot chưa có bài để sửa.' };
  const t = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!t) return { ok: false, error: 'Bài không được để trống.' };
  if (t === s.text) return { ok: false, error: 'Chưa có thay đổi.' };
  const before = s.text;
  const n = Math.max(s.genN || 0, ...(s.history || []).map(h => h.n)) + 1;
  const f = byId(S.formats, s.formatId);
  const sc = scoreText(t, f ? f.criteria : [], `${s.id}|${n}`);
  delete s.ai; // sửa tay: không còn là bài AI viết nguyên bản
  s.history = (s.history || []).concat([{ n, text: t, createdAt: at || S.settings.demoNow, cellId: s.sourceCellId, stamp: s.sourceStamp, edited: true }]);
  Object.assign(s, { text: t, prevText: before, genN: n, curN: n, scores: sc.scores, total: sc.total, tip: sc.tip, undoN: null });
  if (s.state !== 'PUBLISHED') s.state = 'DRAFT';
  blogRefreshAuto(S, s);
  markChanged(s, before);
  log(S, 'edit', 'slot', slotId, `bản ${n}`);
  return { ok: true, n };
}
// "Cần cập nhật": Cập nhật từ ô (viết lại từ bản hiện hành của ô) hoặc Giữ bản slot (bắt buộc lý do)
function updateSlotFromCell(S, slotId, at) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  const cell = slotSourceCell(S, s);
  if (!cell) return { ok: false, error: 'Slot không còn ô nguồn.' };
  const st = cellView(S, cell).state;
  if (st !== 'APPROVED') return { ok: false, error: st === 'CANCELLED' ? 'Ô nguồn đã bị hủy. Chọn ô khác hoặc giữ bản slot.' : 'Ô nguồn chưa duyệt lại. Duyệt ô ở Matrix trước, hoặc giữ bản slot.' };
  const before = s.text;
  writeSlotFromCell(S, s, cell, at);
  s.keepStamp = null; s.undoN = null; markChanged(s, before);
  log(S, 'update-from-cell', 'slot', slotId);
  return { ok: true };
}
function keepSlotVersion(S, slotId, reason) {
  const s = byId(S.slots, slotId);
  const err = slotGuard(S, s); if (err) return { ok: false, error: err };
  if (!s.needsUpdate) return { ok: false, error: 'Slot không cần cập nhật.' };
  const r = String(reason || '').trim();
  if (r.length < 3) return { ok: false, error: 'Cần ghi lý do giữ bản slot.' };
  const cell = slotSourceCell(S, s);
  s.keepReason = r; s.keepStamp = cell ? cellView(S, cell).stamp : null; s.needsUpdate = false;
  log(S, 'keep', 'slot', slotId, r);
  return { ok: true };
}
// Đổi ô nguồn (DST-06): chỉ ô Đã duyệt cùng Cột; slot viết lại từ ô mới
function changeSlotCell(S, slotId, cellId, at) {
  const s = byId(S.slots, slotId); const before = s ? s.text : '';
  const prevN = s ? s.genN : 0;
  const r = assignCell(S, slotId, cellId, at);
  if (r.ok) { s.keepStamp = null; s.undoN = prevN; s.emptyReason = ''; markChanged(s, before); }
  return r;
}
// Ô ảnh: chọn phiên bản trước/sau (CAL-14)
function stepSlotImage(S, slotId, idx, dir) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a || !a.versions.length) return { ok: false, error: 'Chưa có ảnh.' };
  const i = a.versions.findIndex(v => v.n === a.current);
  const v = a.versions[i + dir];
  if (!v) return { ok: false, error: 'Hết phiên bản.' };
  return chooseSlotImage(S, slotId, idx, v.n);
}

// ---------- 05d · Nút demo từng bước (để trải nghiệm từng phần; chạy tức thì, dữ liệu mô phỏng) ----------
const DEMO_TOPIC_KEYS = ['2026-10-12', '2026-10-05', '2026-10-19'];
function demoTopicKey(startDate) { return DEMO_TOPIC_KEYS[Math.floor(parseYMD(startDate) / 604800000) % DEMO_TOPIC_KEYS.length]; }
function demoTopicMd(startDate) { const f = SEED_TOPIC_FILES[demoTopicKey(startDate)]; return f.v2 || f.v1; }
// Cổng của từng nút demo: { ok, reason, label }
function demoGate(S, startDate, step) {
  const wid = weekIdOf(startDate); const w = weekOf(S, wid);
  const locked = !!w && w.status === 'CONFIRMED';
  const no = reason => ({ ok: false, reason });
  if (step === 'setup') return setupStatus(S).ok ? no('Thiết lập đã đủ') : { ok: true, reason: '' };
  if (step === 'plan') { const g = canApplyTemplate(S, startDate); return g.ok ? { ok: true, reason: '' } : no(g.reason); }
  if (locked) return no('Tuần đã chốt. Bấm "Mở lại để sửa" trước.');
  if (step === 'topics') { const st = setupStatus(S); return st.ok ? { ok: true, reason: '' } : no('Thiết lập chưa đủ: dùng "Demo: Nạp Thiết lập" ở Dashboard hoặc Setup'); }
  if (step === 'write') { const g = w ? writeGate(S, wid) : { ok: false, reasons: ['Chưa có Topic'] }; return g.ok ? { ok: true, reason: '' } : no(g.reasons.join('; ')); }
  if (step === 'approve') { const n = w ? matrixCounts(S, wid).DRAFT : 0; return n ? { ok: true, reason: '' } : no(w && matrixCounts(S, wid).EMPTY ? 'Viết ma trận trước' : 'Không có ô nào chờ duyệt'); }
  if (step === 'deal') { const g = dealGate(S, wid); return g.ok ? { ok: true, reason: '' } : no(g.reasons.join('; ')); }
  if (step === 'review') {
    if (!w) return no('Chưa lập tuần');
    const sc = slotCounts(S, wid);
    const needImg = weekSlots(S, wid).some(s => s.assets.some(a => a.prompt && !a.versions.length));
    return (sc.DRAFT && !sc.needsUpdate) || needImg ? { ok: true, reason: '' } : no(sc.EMPTY ? 'Chia bài trước' : sc.needsUpdate ? 'Có slot cần cập nhật: xử lý trước' : 'Mọi slot đã duyệt và có ảnh');
  }
  if (step === 'confirm') {
    if (!w) return no('Chưa lập tuần');
    const sc = slotCounts(S, wid);
    return !sc.total ? no('Tuần chưa có slot') : sc.EMPTY ? no('Còn slot chưa có bài: Chia bài trước') : sc.needsUpdate ? no('Có slot cần cập nhật: xử lý trước') : { ok: true, reason: '' };
  }
  if (step === 'clear') return w ? { ok: true, reason: '' } : no('Tuần chưa có dữ liệu');
  return no('Bước không hợp lệ');
}
function demoRun(S, startDate, step, at) {
  const g = demoGate(S, startDate, step);
  if (!g.ok) return { ok: false, error: g.reason };
  const now = at || S.settings.demoNow;
  if (step === 'setup') return demoSetup(S, 'all');
  if (step === 'plan') { const r = applyTemplateWeek(S, startDate, suggestTemplateId(S, startDate)); return r.ok ? { ok: true, msg: `Đã tạo ${r.slots} slot từ "${templateOf(S, r.week.templateId).name}".` } : { ok: false, error: r.error }; }
  const e = ensureWeek(S, startDate); if (!e.ok) return { ok: false, error: e.error };
  const wid = e.week.id;
  if (step === 'topics') {
    const r = importTopics(S, wid, demoTopicMd(startDate), now);
    return r.ok ? { ok: true, msg: `Đã nạp ${r.topics.length} Topic mẫu.` } : { ok: false, error: r.errors[0].text };
  }
  if (step === 'write') { const r = writeMatrix(S, wid, now); return { ok: true, msg: `Đã viết ${r.written} ô (Chưa duyệt).` }; }
  if (step === 'approve') {
    let n = 0; const rows = cellsOf(S, wid).filter(c => cellView(S, c).state === 'DRAFT');
    rows.forEach(c => { if (approveCell(S, c.id, now).ok) n++; });
    return { ok: true, msg: `Đã duyệt ${n} ô (kể cả ô có cảnh báo).` };
  }
  if (step === 'deal') { const r = dealWeek(S, wid, now); return r.ok ? { ok: true, msg: `Đã viết ${r.written.length} slot · ${r.empty.length} slot chưa có bài.` } : { ok: false, error: r.reasons.join('; ') }; }
  if (step === 'review') {
    let a = 0, im = 0;
    weekSlots(S, wid).forEach(s => {
      s.assets.forEach((x, i) => { if (x.prompt && !x.versions.length && genSlotImage(S, s.id, i, now).ok) im++; });
      if (s.state === 'DRAFT' && !s.needsUpdate && approveSlot(S, s.id, now).ok) a++;
    });
    return { ok: true, msg: `Đã duyệt ${a} slot, tạo ${im} ảnh mô phỏng.` };
  }
  if (step === 'confirm') {
    let a = 0; weekSlots(S, wid).forEach(s => { if (s.state === 'DRAFT' && approveSlot(S, s.id, now).ok) a++; });
    const r = confirmWeek(S, wid); if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, msg: `${a ? `Đã duyệt ${a} slot và chốt` : 'Đã chốt'} lịch bản ${r.revision}${r.published ? `, tự đăng ${r.published} slot đã đến giờ` : ''}.` };
  }
  if (step === 'clear') {
    const ids = new Set(S.cells.filter(c => c.weekId === wid).map(c => c.id));
    S.slots = S.slots.filter(s => s.weekId !== wid); S.cells = S.cells.filter(c => !ids.has(c.id));
    S.topics = S.topics.filter(t => t.weekId !== wid); S.topicFiles = (S.topicFiles || []).filter(f => f.weekId !== wid);
    S.weeks = S.weeks.filter(w => w.id !== wid);
    log(S, 'demo-clear', 'week', wid);
    return { ok: true, msg: 'Đã làm trống tuần này.' };
  }
  return { ok: false, error: 'Bước không hợp lệ.' };
}
// Chạy các bước còn làm được, theo thứ tự
function demoRunAll(S, startDate, at) {
  const done = [];
  ['setup', 'plan', 'topics', 'write', 'approve', 'deal', 'review'].forEach(step => {
    if (step === 'topics' && topicsOf(S, weekIdOf(startDate)).length) return;
    const r = demoRun(S, startDate, step, at); if (r.ok) done.push(step);
  });
  return { ok: true, done };
}

// ---------- Demo cho Setup: nạp mẫu từng mục (mục cùng mã ghi đè bằng bản mẫu; mục người dùng tự thêm giữ nguyên) ----------
const SETUP_PARTS = ['brand', 'voice', 'channels', 'columns', 'formats', 'templates', 'rules'];
function demoSetupDefaults() { return defaultSetup(); }
function upsertById(list, items, onlyMissing) {
  let added = 0, replaced = 0;
  items.forEach(it => {
    const i = list.findIndex(x => x.id === it.id);
    if (i < 0) { list.push(clone(it)); added++; }
    else if (!onlyMissing && JSON.stringify(list[i]) !== JSON.stringify(it)) { list[i] = clone(it); replaced++; }
  });
  return { added, replaced };
}
// Số mục sẽ bị ghi đè (để hỏi xác nhận)
function demoSetupImpact(S, part) {
  const d = demoSetupDefaults();
  const diff = (list, items) => items.filter(it => { const x = list.find(y => y.id === it.id); return x && JSON.stringify(x) !== JSON.stringify(it); }).length;
  if (part === 'brand') return S.brand.md.trim() && S.brand.md !== TEMPLATES.brand ? 1 : 0;
  if (part === 'voice') return S.voice.md.trim() && S.voice.md !== TEMPLATES.voice ? 1 : 0;
  if (part === 'channels') return diff(S.channels, d.channels);
  if (part === 'columns') return diff(S.columns, d.columns);
  if (part === 'formats') return diff(S.formats, d.formats);
  if (part === 'templates') return diff(S.weekTemplates, d.weekTemplates);
  if (part === 'rules') return S.settings.reviewThreshold !== 70 || JSON.stringify(S.settings.hypeWords) !== JSON.stringify(DEFAULT_HYPE) ? 1 : 0;
  if (part === 'all') return SETUP_PARTS.reduce((n, p) => n + demoSetupImpact(S, p), 0);
  return 0;
}
function demoSetup(S, part) {
  const d = demoSetupDefaults(); const msg = [];
  const run = p => {
    if (p === 'brand') { setBrandMd(S, TEMPLATES.brand); msg.push('Thương hiệu'); }
    else if (p === 'voice') { setVoiceMd(S, TEMPLATES.voice); msg.push('Giọng văn'); }
    else if (p === 'channels') { upsertById(S.channels, d.channels); msg.push('6 kênh'); }
    else if (p === 'columns') { upsertById(S.columns, d.columns); msg.push('5 Cột'); }
    else if (p === 'formats') {   // Format cần kênh và Cột: thêm phần còn thiếu, không ghi đè
      upsertById(S.channels, d.channels, true); upsertById(S.columns, d.columns, true);
      upsertById(S.formats, d.formats); msg.push(`${d.formats.length} Format`);
    } else if (p === 'templates') {
      upsertById(S.channels, d.channels, true); upsertById(S.columns, d.columns, true); upsertById(S.formats, d.formats, true);
      upsertById(S.weekTemplates, d.weekTemplates); msg.push('2 Tuần mẫu');
    } else if (p === 'rules') { S.settings.reviewThreshold = 70; S.settings.hypeWords = [...DEFAULT_HYPE]; msg.push('Quy tắc'); }
  };
  if (part === 'all') SETUP_PARTS.forEach(run); else if (SETUP_PARTS.includes(part)) run(part); else return { ok: false, error: 'Mục không hợp lệ.' };
  log(S, 'demo-setup', 'setup', part);
  return { ok: true, msg: `Đã nạp mẫu: ${msg.join(', ')}.` };
}

// ---------- 05e · R4: Xác nhận lịch, đăng bài, số liệu, đồng hồ demo (mục 10.22) ----------
// Đăng và số liệu ở R4 là mô phỏng xác định; dữ liệu đã đúng dạng để R6–R7 nối API/Metricool/Postiz thật.

// ---- Thời điểm dạng 'YYYY-MM-DDTHH:MM' ----
function tsToMs(ts) { return parseYMD(ts.slice(0, 10)) + minutesOf(ts.slice(11, 16)) * 60000; }
function msToTs(ms) { return new Date(ms).toISOString().slice(0, 16); }
function tsAddMin(ts, m) { return msToTs(tsToMs(ts) + m * 60000); }
function isValidTs(ts) { return typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ts) && isValidYMD(ts.slice(0, 10)) && isValidTime(ts.slice(11, 16)); }
function slotTs(s) { return `${s.date}T${s.time}`; }

// ---- Nền tảng, cách đăng theo kênh ----
const PLATFORMS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', youtube: 'YouTube', blog: 'Blog', other: 'Khác' };
const PUBLISH_VIA = { api: 'API riêng', metricool: 'Metricool', postiz: 'Postiz' };
const METRICS_VIA = { api: 'API riêng', metricool: 'Metricool', postiz: 'Postiz', none: 'Không' };
const PLATFORM_OF_ID = { 'ch-fb': 'facebook', 'ch-ig': 'instagram', 'ch-tt': 'tiktok', 'ch-th': 'threads', 'ch-yt': 'youtube', 'ch-blog': 'blog' };
const DEFAULT_PUBLISH = {
  facebook: { mode: 'auto', via: 'api', metrics: 'api' }, instagram: { mode: 'auto', via: 'api', metrics: 'api' },
  threads: { mode: 'auto', via: 'metricool', metrics: 'metricool' }, youtube: { mode: 'auto', via: 'postiz', metrics: 'postiz' },
  tiktok: { mode: 'manual', via: 'metricool', metrics: 'metricool' }, blog: { mode: 'manual', via: 'api', metrics: 'none' },
  other: { mode: 'manual', via: 'metricool', metrics: 'metricool' },
};
function defaultPublish(platform) { return Object.assign({}, DEFAULT_PUBLISH[platform] || DEFAULT_PUBLISH.other); }
function channelPlatform(ch) { return ch && PLATFORMS[ch.platform] ? ch.platform : 'other'; }
function channelPublish(S, channelId) {
  const ch = byId(S.channels, channelId);
  return ch && ch.publish ? ch.publish : defaultPublish(channelPlatform(ch));
}
function setChannelPublish(S, channelId, patch) {
  const ch = byId(S.channels, channelId); if (!ch) return { ok: false, error: 'Không tìm thấy kênh.' };
  const next = Object.assign({}, channelPublish(S, channelId), patch);
  if (!['auto', 'manual'].includes(next.mode)) return { ok: false, error: 'Cách đăng không hợp lệ.' };
  if (!PUBLISH_VIA[next.via]) return { ok: false, error: 'Đường đăng không hợp lệ.' };
  if (!METRICS_VIA[next.metrics]) return { ok: false, error: 'Nguồn số liệu không hợp lệ.' };
  if (patch.platform) { if (!PLATFORMS[patch.platform]) return { ok: false, error: 'Nền tảng không hợp lệ.' }; ch.platform = patch.platform; delete next.platform; }
  ch.publish = { mode: next.mode, via: next.via, metrics: next.metrics };
  log(S, 'publish-config', 'channel', channelId, `${next.mode} · ${next.via} · ${next.metrics}`);
  return { ok: true };
}

// ---- Bộ chỉ số theo nền tảng (role: reach = Tiếp cận/xem, eng = Tương tác, avg = trung bình, sum = cộng dồn khác) ----
const METRIC_DEFS = {
  facebook: [{ k: 'reach', l: 'Reach', role: 'reach' }, { k: 'reactions', l: 'Cảm xúc', role: 'eng', r: [0.03, 0.08] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.005, 0.025] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.002, 0.012] }],
  instagram: [{ k: 'reach', l: 'Reach', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.04, 0.09] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.004, 0.015] }, { k: 'saves', l: 'Lưu', role: 'eng', r: [0.01, 0.04] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.003, 0.012] }],
  tiktok: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.04, 0.1] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.002, 0.01] }, { k: 'shares', l: 'Chia sẻ', role: 'eng', r: [0.002, 0.008] }, { k: 'avgWatch', l: 'Xem TB (giây)', role: 'avg', a: [7, 24] }],
  threads: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.03, 0.08] }, { k: 'replies', l: 'Trả lời', role: 'eng', r: [0.005, 0.02] }, { k: 'reposts', l: 'Đăng lại', role: 'eng', r: [0.002, 0.01] }],
  youtube: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'watchHours', l: 'Giờ xem', role: 'sum', r: [0.02, 0.06] }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.02, 0.05] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.002, 0.008] }],
  blog: [{ k: 'pageviews', l: 'Lượt xem trang', role: 'reach' }, { k: 'avgTime', l: 'Đọc TB (giây)', role: 'avg', a: [70, 210] }],
  other: [{ k: 'views', l: 'Lượt xem', role: 'reach' }, { k: 'likes', l: 'Thích', role: 'eng', r: [0.02, 0.06] }, { k: 'comments', l: 'Bình luận', role: 'eng', r: [0.003, 0.01] }],
};
// Tiếp cận/xem sau 7 ngày (mô phỏng) theo nền tảng
const REACH_RANGE = { facebook: [1600, 6200], instagram: [900, 3600], tiktok: [2500, 24000], threads: [400, 2600], youtube: [450, 4200], blog: [150, 950], other: [300, 1500] };
const MILESTONES = [{ key: '1h', min: 60, f: 0.25, label: '1 giờ' }, { key: '24h', min: 1440, f: 0.8, label: '24 giờ' }, { key: '7d', min: 10080, f: 1, label: '7 ngày' }];
function metricDefs(S, s) {
  const p = channelPlatform(byId(S.channels, s.channelId));
  const defs = METRIC_DEFS[p].slice();
  const f = byId(S.formats, s.formatId);
  if (p === 'facebook' && f && f.layout === 'script') defs.splice(1, 0, { k: 'views', l: 'Lượt xem video', role: 'sum', r: [1.4, 2.6] });
  return defs;
}
function mockMetricValues(S, s, frac) {
  const p = channelPlatform(byId(S.channels, s.channelId));
  const u = k => hash32(`${s.id}|${s.date}|${k}`) / 4294967296;
  const [lo, hi] = REACH_RANGE[p];
  const reach = Math.round((lo + u('reach') * (hi - lo)) * frac);
  const out = {};
  metricDefs(S, s).forEach(d => {
    if (d.role === 'reach') out[d.k] = reach;
    else if (d.role === 'avg') out[d.k] = Math.round(d.a[0] + u(d.k) * (d.a[1] - d.a[0]));
    else { const rate = d.r[0] + u(d.k) * (d.r[1] - d.r[0]); out[d.k] = d.k === 'watchHours' ? Math.round(reach * rate * 10) / 10 : Math.round(reach * rate); }
  });
  return out;
}
// Tổng hợp một bộ giá trị thành Tiếp cận/xem và Tương tác
function metricTotals(S, s, values) {
  let reach = 0, eng = 0;
  metricDefs(S, s).forEach(d => { const v = Number(values[d.k]) || 0; if (d.role === 'reach') reach += v; if (d.role === 'eng') eng += v; });
  return { reach, eng };
}
// Số liệu tăng liên tục theo thời gian kể từ lúc đăng (mô phỏng): nội suy giữa các mốc 0 → 1 giờ → 24 giờ → 7 ngày
const LIVE_CURVE = [[0, 0], [60, 0.25], [1440, 0.8], [10080, 1]];
function liveFrac(min) {
  if (!(min > 0)) return 0;
  for (let i = 1; i < LIVE_CURVE.length; i++) {
    const [m1, f1] = LIVE_CURVE[i], [m0, f0] = LIVE_CURVE[i - 1];
    if (min <= m1) { const x = (min - m0) / (m1 - m0); return f0 + (f1 - f0) * Math.sqrt(x); }
  }
  return 1;
}
const LIVE_FIRST_MIN = 1; // lần lấy số liệu đầu tiên sau khi đăng (phút)
// Trạng thái số liệu của slot đã đăng tại thời điểm nowMs (mặc định = đồng hồ demo): giá trị hiện tại, nguồn, mốc mới nhất
function slotMetricsNow(S, s, nowMs) {
  if (s.state !== 'PUBLISHED' || !s.pub || !isValidTs(s.pub.at)) return { status: 'unpublished', snap: null };
  const src = channelPublish(S, s.channelId).metrics;
  const snap = (s.metrics || []).length ? s.metrics[s.metrics.length - 1] : null;
  if (src === 'none' && !snap) return { status: 'none', snap: null, source: src };
  if (s.pub.mode === 'manual' && !s.pub.url && src !== 'api' && !snap) return { status: 'nolink', snap: null, source: src };
  const now = nowMs == null ? tsToMs(S.settings.demoNow) : nowMs;
  const min = (now - tsToMs(s.pub.at)) / 60000;
  if (min < LIVE_FIRST_MIN) return { status: 'wait', snap: null, source: src, nextAt: tsAddMin(s.pub.at, LIVE_FIRST_MIN) };
  const values = src === 'none' ? snap.values : mockMetricValues(S, s, liveFrac(min));
  return Object.assign({ status: 'ok', snap, values, source: snap && src === 'none' ? snap.source : src, minutes: min }, metricTotals(S, s, values));
}
// Ba con số hiện trên thẻ slot: tiếp cận/xem, tương tác, và bình luận (hoặc chỉ số đặc trưng khi nền tảng không có bình luận)
function slotHeadline(S, s, m) {
  if (!m || m.status !== 'ok') return null;
  const defs = metricDefs(S, s);
  const r = defs.find(d => d.role === 'reach');
  const third = defs.find(d => /^(comments|replies)$/.test(d.k)) || defs.find(d => d.role === 'avg');
  return {
    reach: { l: r ? r.l : 'Tiếp cận', v: m.reach },
    eng: { l: 'Tương tác', v: m.eng },
    third: third ? { k: third.k, l: third.l, v: Number(m.values[third.k]) || 0, avg: third.role === 'avg' } : null,
  };
}
// Thêm các mốc số liệu đã qua theo đồng hồ demo (mô phỏng)
function syncSlotMetrics(S, s) {
  if (s.state !== 'PUBLISHED' || !s.pub || !isValidTs(s.pub.at)) return 0;
  const src = channelPublish(S, s.channelId).metrics;
  if (src === 'none') return 0;
  if (s.pub.mode === 'manual' && !s.pub.url && src !== 'api') return 0; // Metricool/Postiz khớp bài theo link
  s.metrics = s.metrics || [];
  let added = 0;
  MILESTONES.forEach(m => {
    const at = tsAddMin(s.pub.at, m.min);
    if (at > S.settings.demoNow || s.metrics.some(x => x.key === m.key)) return;
    s.metrics.push({ key: m.key, at, source: src, values: mockMetricValues(S, s, m.f), simulated: true });
    added++;
  });
  s.metrics.sort((a, b) => a.at.localeCompare(b.at));
  return added;
}
function syncMetrics(S) { let n = 0; S.slots.forEach(s => { n += syncSlotMetrics(S, s); }); return n; }

// ---- Link giả theo nền tảng (mô phỏng tự đăng) ----
function brandHandle(S) {
  const name = (S.brand && S.brand.parsed && S.brand.parsed.name) || 'thuonghieu';
  return fold(name.split('\n')[0]).replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'thuonghieu';
}
function mockPostUrl(S, s) {
  const h = brandHandle(S); const p = channelPlatform(byId(S.channels, s.channelId));
  const n = String(hash32(`${s.id}|url`)) + String(hash32(`${s.id}|url2`)).slice(0, 6);
  const code = (len) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789_-'; let x = ''; for (let i = 0; i < len; i++) x += a[hash32(`${s.id}|c${i}`) % a.length]; return x; };
  const f = byId(S.formats, s.formatId);
  if (p === 'facebook') return f && f.layout === 'script' ? `https://www.facebook.com/reel/${n}` : `https://www.facebook.com/${h}/posts/${n}`;
  if (p === 'instagram') return `https://www.instagram.com/p/${code(11)}/`;
  if (p === 'tiktok') return `https://www.tiktok.com/@${h}/video/${n}`;
  if (p === 'threads') return `https://www.threads.net/@${h}/post/${code(11)}`;
  if (p === 'youtube') return f && f.layout === 'script' ? `https://www.youtube.com/shorts/${code(11)}` : `https://www.youtube.com/watch?v=${code(11)}`;
  if (p === 'blog') return `https://${h}.vn/blog/${s.date}-${s.id}`;
  return `https://example.com/${h}/${s.id}`;
}

// ---- Xác nhận lịch (bước 7) ----
function confirmGate(S, weekId) {
  const w = weekOf(S, weekId);
  if (!w) return { ok: false, reason: 'Tuần chưa có slot', blockers: [] };
  if (w.status === 'CONFIRMED') return { ok: false, reason: `Tuần đã chốt (bản ${w.revision})`, blockers: [] };
  const slots = weekSlots(S, weekId);
  if (!slots.length) return { ok: false, reason: 'Tuần chưa có slot', blockers: [] };
  const blockers = [];
  slots.forEach(s => {
    if (s.needsUpdate) blockers.push({ slot: s, why: 'Cần cập nhật' });
    else if (s.state === 'EMPTY') blockers.push({ slot: s, why: 'Chưa có bài' });
    else if (s.state === 'DRAFT') blockers.push({ slot: s, why: 'Chưa duyệt' });
  });
  return { ok: !blockers.length, reason: blockers.length ? `${blockers.length} slot chưa đạt` : '', blockers };
}
function confirmSummary(S, weekId) {
  const slots = weekSlots(S, weekId); const now = S.settings.demoNow;
  const byChannel = {};
  let auto = 0, manual = 0, warned = 0, missingImages = 0, dueNow = 0;
  slots.forEach(s => {
    byChannel[s.channelId] = (byChannel[s.channelId] || 0) + 1;
    const p = channelPublish(S, s.channelId);
    if (s.state !== 'PUBLISHED') { if (p.mode === 'auto') auto++; else manual++; if (slotTs(s) <= now) dueNow++; }
    if (slotWarnings(S, s).length) warned++;
    missingImages += (s.assets || []).filter(a => !a.done).length;
  });
  return { total: slots.length, byChannel, auto, manual, warned, missingImages, dueNow, published: slots.filter(s => s.state === 'PUBLISHED').length };
}
function confirmWeek(S, weekId) {
  const g = confirmGate(S, weekId); if (!g.ok) return { ok: false, error: g.reason, blockers: g.blockers };
  const w = weekOf(S, weekId);
  w.status = 'CONFIRMED'; w.revision = (w.revision || 0) + 1; w.confirmedAt = S.settings.demoNow;
  weekSlots(S, weekId).forEach(s => { s.confirmedText = s.text; });
  log(S, 'confirm', 'week', weekId, `bản ${w.revision}`);
  const r = runScheduler(S);
  return { ok: true, revision: w.revision, published: r.published.length };
}

// ---- Tự đăng (mô phỏng) ----
function publishNow(S, s, mode, at, extra) {
  s.state = 'PUBLISHED';
  s.pub = Object.assign({ mode, via: channelPublish(S, s.channelId).via, url: '', at, asConfirmed: s.confirmedText == null || s.text === s.confirmedText, simulated: mode === 'auto' }, extra || {});
  s.metrics = [];
}
function runScheduler(S) {
  const now = S.settings.demoNow; const published = [];
  S.weeks.filter(w => w.status === 'CONFIRMED').forEach(w => {
    weekSlots(S, w.id).forEach(s => {
      if (s.state !== 'APPROVED' || slotTs(s) > now) return;
      // Bài Blog đã gửi lên web qua API (lên lịch theo giờ slot): tới giờ thì thành Đã đăng với link web trả về (mục 10.40)
      if (s.webPost && s.webPost.status !== 'draft') { publishNow(S, s, 'auto', slotTs(s), { url: s.webPost.url || '', simulated: false, via: 'api' }); log(S, 'auto-publish', 'slot', s.id, 'api'); published.push(s.id); return; }
      if (channelPublish(S, s.channelId).mode !== 'auto') return;
      let at = slotTs(s); if (w.confirmedAt && w.confirmedAt > at) at = w.confirmedAt;
      at = tsAddMin(at, hash32(`${s.id}|jit`) % 4); if (at > now) at = now;
      publishNow(S, s, 'auto', at, { url: mockPostUrl(S, s) });
      log(S, 'auto-publish', 'slot', s.id, s.pub.via);
      published.push(s.id);
    });
  });
  syncMetrics(S);
  return { published };
}

// ---- Đánh dấu đã đăng (thủ công) và sửa thông tin đăng ----
function publishGate(S, s) {
  if (!s) return { ok: false, reason: 'Không tìm thấy slot.' };
  const w = weekOf(S, s.weekId);
  if (!w || !(w.revision >= 1)) return { ok: false, reason: 'Chốt lịch trước (Xác nhận lịch).' };
  if (s.state !== 'APPROVED' && s.state !== 'PUBLISHED') return { ok: false, reason: 'Slot cần Đã duyệt.' };
  return { ok: true, reason: '' };
}
function markPublished(S, slotId, input) {
  const s = byId(S.slots, slotId); const g = publishGate(S, s); if (!g.ok) return { ok: false, error: g.reason };
  const at = String(input.at || slotTs(s)).slice(0, 16);
  const url = String(input.url || '').trim();
  if (!isValidTs(at)) return { ok: false, error: 'Giờ đăng không hợp lệ.' };
  if (at > S.settings.demoNow) return { ok: false, error: 'Giờ đăng ở sau giờ hiện tại (giờ demo).' };
  if (url && !isValidUrl(url)) return { ok: false, error: 'Link phải bắt đầu bằng http:// hoặc https://.' };
  const asConfirmed = input.asConfirmed !== false;
  if (s.state === 'PUBLISHED' && s.pub && s.pub.mode === 'auto') return { ok: false, error: 'Bài tự đăng chỉ xem; thông tin đăng lấy từ nền tảng.' };
  if (s.state === 'PUBLISHED' && s.pub) {
    const timeChanged = s.pub.at !== at; const linkAdded = !s.pub.url && url;
    Object.assign(s.pub, { url, at, asConfirmed });
    if (timeChanged || linkAdded) s.metrics = [];
    log(S, 'edit-publish', 'slot', s.id);
  } else {
    publishNow(S, s, 'manual', at, { url, asConfirmed, simulated: false });
    log(S, 'mark-published', 'slot', s.id);
  }
  syncSlotMetrics(S, s);
  return { ok: true, slot: s };
}
function unmarkPublished(S, slotId) {
  const s = byId(S.slots, slotId); if (!s || s.state !== 'PUBLISHED') return { ok: false, error: 'Slot chưa đăng.' };
  if (s.pub && s.pub.mode === 'auto') return { ok: false, error: 'Bài tự đăng không bỏ đánh dấu được.' };
  s.state = 'APPROVED'; s.pub = null; s.metrics = []; s.changedAfterPublish = false;
  log(S, 'unmark-published', 'slot', s.id);
  return { ok: true };
}

// ---- Đồng hồ demo (D127) ----
function setDemoNow(S, ts) {
  if (!isValidTs(ts)) return { ok: false, error: 'Ngày giờ không hợp lệ.' };
  S.settings.demoNow = ts;
  if (S.settings.clock && S.settings.clock.running) S.settings.clock.anchor = null; // neo lại ở lần chạy tới
  const r = runScheduler(S);
  return { ok: true, published: r.published.length };
}
// Đồng hồ demo chạy theo giờ thật: neo {demoMs, realMs}; giờ demo = demoMs + (giờ thật − realMs)
function clockOf(S) { if (!S.settings.clock) S.settings.clock = { running: true, anchor: null }; return S.settings.clock; }
function clockNowMs(S, realMs) {
  const c = clockOf(S); const base = tsToMs(S.settings.demoNow);
  if (!c.running) return base;
  if (!c.anchor) c.anchor = { demoMs: base, realMs };
  return Math.max(base, c.anchor.demoMs + (realMs - c.anchor.realMs));
}
// Một nhịp đồng hồ: cập nhật demoNow theo phút, chạy lịch tự đăng và mốc số liệu; trả về giờ ms và các thay đổi
function clockTick(S, realMs) {
  const ms = clockNowMs(S, realMs);
  const ts = msToTs(Math.floor(ms / 60000) * 60000);
  let changed = false, published = 0, metrics = 0;
  if (ts > S.settings.demoNow) {
    S.settings.demoNow = ts; changed = true;
    published = runScheduler(S).published.length;
    metrics = syncMetrics(S);
  }
  return { ms, changed, published, metrics };
}
function setClockRunning(S, on, realMs) {
  const c = clockOf(S);
  if (!on && c.running) clockTick(S, realMs);
  c.running = !!on; c.anchor = on ? { demoMs: tsToMs(S.settings.demoNow), realMs } : null;
  return { ok: true };
}

// ---- Báo cáo (màn Báo cáo, header Dashboard) ----
// filter: { from, to (YYYY-MM-DD, gồm cả hai đầu; bỏ trống = toàn bộ), channels: [] }
function reportStats(S, filter) {
  const f = filter || {};
  const posts = S.slots.filter(s => s.state === 'PUBLISHED' && s.pub
    && (!f.from || s.date >= f.from) && (!f.to || s.date <= f.to)
    && (!f.channels || !f.channels.length || f.channels.includes(s.channelId)));
  const blank = () => ({ posts: 0, reach: 0, eng: 0, tracked: 0, onTime: 0, asConfirmed: 0, values: {} });
  const add = (b, s, m) => {
    b.posts++; if (isOnTime(s)) b.onTime++; if (s.pub.asConfirmed) b.asConfirmed++;
    if (m.status === 'ok') { b.tracked++; b.reach += m.reach; b.eng += m.eng; Object.entries(m.values).forEach(([k, v]) => { b.values[k] = (b.values[k] || 0) + v; }); }
  };
  const total = blank(); const byChannel = {}; const byColumn = {}; const byFormat = {}; const byDay = {}; const byWeek = {};
  const rows = [];
  posts.forEach(s => {
    const m = slotMetricsNow(S, s);
    add(total, s, m);
    add(byChannel[s.channelId] = byChannel[s.channelId] || blank(), s, m);
    const col = slotColumnId(S, s) || '';
    add(byColumn[col] = byColumn[col] || blank(), s, m);
    add(byFormat[s.formatId] = byFormat[s.formatId] || blank(), s, m);
    add(byDay[s.date] = byDay[s.date] || blank(), s, m);
    const wk = mondayOf(s.date); add(byWeek[wk] = byWeek[wk] || blank(), s, m);
    rows.push({ slot: s, reach: m.status === 'ok' ? m.reach : 0, eng: m.status === 'ok' ? m.eng : 0, status: m.status });
  });
  [total].concat(Object.values(byChannel), Object.values(byColumn), Object.values(byFormat), Object.values(byDay), Object.values(byWeek)).forEach(b => {
    b.engRate = b.reach ? b.eng / b.reach : 0;
    // trung bình cho chỉ số "avg" (cộng dồn ở trên): chia cho số bài có số liệu
    ['avgWatch', 'avgTime'].forEach(k => { if (b.values[k] != null && b.tracked) b.values[k] = Math.round(b.values[k] / b.tracked); });
  });
  const top = rows.filter(r => r.status === 'ok').sort((a, b) => b.eng - a.eng || b.reach - a.reach).slice(0, 5);
  return { total, byChannel, byColumn, byFormat, byDay, byWeek, rows, top };
}
function isOnTime(s) { return !!(s.pub && isValidTs(s.pub.at)) && tsToMs(s.pub.at) - tsToMs(slotTs(s)) <= 30 * 60000; }

// ---- Di trú dữ liệu trước R4 (cùng DATA_VERSION) ----
function migrateState(S) {
  if (!Array.isArray(S.blogPosts)) S.blogPosts = [];
  (S.slots || []).forEach(s => stampRatios(S, s)); // chuẩn ảnh theo nền tảng (mục 10.42)
  (S.channels || []).forEach(ch => {
    if (!ch.platform) ch.platform = PLATFORM_OF_ID[ch.id] || 'other';
    if (!ch.publish) ch.publish = defaultPublish(ch.platform);
  });
  const confirmed = new Set((S.weeks || []).filter(w => w.revision >= 1).map(w => w.id));
  (S.slots || []).forEach(s => {
    if (s.pub === undefined) {
      s.pub = s.state === 'PUBLISHED' ? { mode: 'manual', via: channelPublish(S, s.channelId).via, url: s.publishedUrl || '', at: s.publishedAt || slotTs(s), asConfirmed: s.publishedAsConfirmed !== false, simulated: false } : null;
    }
    if (!Array.isArray(s.metrics)) s.metrics = [];
    if (s.confirmedText === undefined) s.confirmedText = confirmed.has(s.weekId) ? s.text : null;
    delete s.publishedAt; delete s.publishedUrl; delete s.publishedAsConfirmed;
  });
  return S;
}

// ---------- 05f · R4: Gói xuất ZIP của tuần đã chốt (mục 5.9, 10.22) ----------
// Tệp: schedule.csv, schedule.json, slots/*.md, matrix.md, topics.md, metrics.csv, assets/*, manifest.json

// ---- Byte, base64, CRC32 ----
// Bài sang Markdown (mục 10.26): nhãn [Mục] thành đề mục cấp `level`; mỗi dòng một đoạn (Markdown cần dòng trống giữa các đoạn)
function mdBody(text, level) {
  return String(text || '').split('\n').map(l => { const lb = labelOf(l); return lb ? `${'#'.repeat(level)} ${lb}` : l; }).join('\n')
    .replace(/([^\n])\n(?=[^\n])/g, '$1\n\n');
}
function b64ToBytes(b64) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = String(b64).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let buf = 0, bits = 0, j = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | A.indexOf(clean[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out[j++] = (buf >> bits) & 0xff; }
  }
  return out.slice(0, j);
}
function dataUrlBytes(src) { const i = String(src).indexOf(','); return i < 0 ? new Uint8Array(0) : b64ToBytes(src.slice(i + 1)); }
let CRC_TABLE = null;
function crc32(bytes) {
  if (!CRC_TABLE) { CRC_TABLE = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- ZIP không nén (store), tên tệp UTF-8 ----
function zipFiles(files, ts) {
  const t = isValidTs(ts) ? ts : '2026-01-01T00:00';
  const y = Number(t.slice(0, 4)), mo = Number(t.slice(5, 7)), d = Number(t.slice(8, 10)), h = Number(t.slice(11, 13)), mi = Number(t.slice(14, 16));
  const dosTime = (h << 11) | (mi << 5), dosDate = ((y - 1980) << 9) | (mo << 5) | d;
  const parts = []; const central = []; let offset = 0;
  files.forEach(f => {
    const name = utf8Bytes(f.path); const data = f.bytes; const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = parts.concat(central, [new Uint8Array(end.buffer)]);
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let k = 0; all.forEach(p => { out.set(p, k); k += p.length; });
  return out;
}

// ---- Nội dung gói ----
function csvCell(v) { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function csvOf(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'; }
function slugOf(text, max) { return fold(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max || 40) || 'x'; }
function exportFileName(S, weekId) { const w = weekOf(S, weekId); const l = weekLabel(w); return `autocontent-${l.iso}-r${w.revision}.zip`; }
// Ảnh mô phỏng (cùng hình với giao diện) ghi ra SVG
function mockImageSvg(v, label, ratio) {
  const g = mockArt(v.seed, ratio); const std = FRAME_RATIOS[ratio] || [1200, 800];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${std[0]}" height="${std[1]}" viewBox="0 0 ${g.W} ${g.H}">${g.inner}<text x="4" y="${(g.H * 0.9125).toFixed(1)}" font-family="sans-serif" font-size="5" fill="#fff">Ảnh mô phỏng · ${String(label).replace(/[<&>]/g, '')}</text></svg>\n`;
}
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
function versionExt(v) {
  if (!v.src) return 'svg';
  const m = /^data:([^;,]+)/.exec(v.src); return (m && MIME_EXT[m[1]]) || v.ext || (v.kind === 'video' ? 'mp4' : 'jpg');
}
function slotTopic(S, s) {
  const c = s.sourceCellId ? byId(S.cells, s.sourceCellId) : null; const row = c ? byId(S.topics, c.topicId) : null;
  const tv = row ? topicCurrent(row) : null;
  return { row, title: tv ? tv.title : '' };
}
function slotTitle(S, s) {
  const t = slotTopic(S, s).title; if (t) return t;
  const first = String(s.text || '').split('\n').map(x => x.replace(/^(?:\[[^\]]*\]|#+\s)\s*/, '').trim()).find(Boolean) || '';
  return first.slice(0, 80);
}
function buildExportFiles(S, weekId) {
  const w = weekOf(S, weekId); if (!w) return { ok: false, error: 'Không tìm thấy tuần.' };
  const l = weekLabel(w); const slots = weekSlots(S, weekId);
  const chName = id => { const c = byId(S.channels, id); return c ? (c.short || c.name) : ''; };
  const fmtName = id => { const f = byId(S.formats, id); return f ? f.name : ''; };
  const colName = id => { const c = id ? byId(S.columns, id) : null; return c ? c.name : ''; };
  const files = []; const used = new Set();
  const addText = (path, text) => files.push({ path, bytes: utf8Bytes(text) });
  const scheduleRows = [['week', 'revision', 'date', 'time', 'channel', 'format', 'column', 'topic', 'title', 'caption_file', 'image_files', 'status', 'publish_mode', 'published_at', 'url']];
  const json = [];
  const metricRows = [['date', 'time', 'channel', 'format', 'url', 'milestone', 'measured_at', 'source', 'metric', 'value']];
  slots.forEach(s => {
    let base = `${s.date}_${s.time.replace(':', '')}_${slugOf(chName(s.channelId), 12)}_${slugOf(fmtName(s.formatId), 24)}`;
    if (used.has(base)) base += `_${s.id}`; used.add(base);
    const caption = `slots/${base}.md`;
    const imgs = [];
    (s.assets || []).forEach((a, i) => {
      const v = a.versions.find(x => x.n === a.current); if (!v) return;
      const path = `assets/${base}_${i + 1}.${versionExt(v)}`;
      files.push({ path, bytes: v.src ? dataUrlBytes(v.src) : utf8Bytes(mockImageSvg(v, a.name, assetRatioFor(S, s, a))) });
      imgs.push(path);
      // video: ảnh bìa và phụ đề đi kèm (mục 10.38)
      if (v.cover) files.push({ path: `assets/${base}_${i + 1}_bia.${versionExt({ src: v.cover.src })}`, bytes: dataUrlBytes(v.cover.src) });
      if (v.subs) files.push({ path: `assets/${base}_${i + 1}.srt`, bytes: utf8Bytes(cuesToSrt(v.subs.cues)) });
    });
    const tp = slotTopic(S, s); const pub = method => (s.pub ? s.pub[method] : '') || '';
    const mode = channelPublish(S, s.channelId).mode;
    scheduleRows.push([l.iso, w.revision, s.date, s.time, chName(s.channelId), fmtName(s.formatId), colName(slotColumnId(S, s)), tp.row ? `Topic ${tp.row.order}` : '', slotTitle(S, s), caption, imgs.join(';'), s.state, s.pub ? s.pub.mode : mode, pub('at').replace('T', ' '), pub('url')]);
    json.push({ id: s.id, date: s.date, time: s.time, channel: chName(s.channelId), format: fmtName(s.formatId), column: colName(slotColumnId(S, s)), topic: tp.row ? tp.row.order : null, title: slotTitle(S, s), free: !!s.free,
      state: s.state, text: s.text, captionFile: caption, images: imgs, imageInfo: (s.assets || []).filter(a => a.versions.some(v => v.n === a.current)).map((a, i) => Object.assign({ name: a.name }, imageInfoOf(S, s, a))), publish: s.pub ? Object.assign({}, s.pub) : { mode, via: channelPublish(S, s.channelId).via }, metrics: s.metrics || [] });
    (s.metrics || []).forEach(m => Object.entries(m.values).forEach(([k, v]) => metricRows.push([s.date, s.time, chName(s.channelId), fmtName(s.formatId), pub('url'), m.key, m.at.replace('T', ' '), m.source, k, v])));
    const md = [`# ${slotTitle(S, s) || fmtName(s.formatId)}`, '',
      `- Ngày giờ: ${dmyFull(s.date)} ${s.time}`, `- Kênh · Format: ${chName(s.channelId)} · ${fmtName(s.formatId)}`, `- Cột: ${colName(slotColumnId(S, s)) || 'Không'}${s.free ? ' (slot tự do)' : ''}`,
      tp.row ? `- Topic ${tp.row.order}: ${tp.title}` : null, `- Trạng thái: ${s.state}`,
      s.pub ? `- Đã đăng: ${s.pub.at.replace('T', ' ')} · ${s.pub.mode === 'auto' ? 'tự đăng' : 'thủ công'}${s.pub.url ? ` · ${s.pub.url}` : ''}` : `- Cách đăng: ${mode === 'auto' ? 'tự đăng qua ' + PUBLISH_VIA[channelPublish(S, s.channelId).via] : 'thủ công'}`,
      imgs.length ? `- Ảnh/video: ${imgs.map(p => `../${p}`).join(', ')}` : null, '', '## Nội dung', '', s.text ? mdBody(s.text, 3) : '(chưa có bài)', ''].filter(x => x != null).join('\n');
    addText(caption, md);
    // Bài Blog: gói cho web (post.json, post.md, post.html, ảnh bìa, ảnh/video trong bài) (mục 10.40)
    if (isBlogSlot(S, s) && s.text) { const bp = blogPackage(S, s); if (bp.ok) bp.files.forEach(f => files.push({ path: `blog/${base}_${bp.slug}/${f.path}`, bytes: f.bytes })); }
  });
  addText('schedule.csv', csvOf(scheduleRows));
  addText('schedule.json', JSON.stringify({ week: l.iso, startDate: w.startDate, revision: w.revision, status: w.status, confirmedAt: w.confirmedAt, slots: json }, null, 2) + '\n');
  addText('metrics.csv', csvOf(metricRows));
  // matrix.md: Topic và bản hiện hành của mọi ô (kèm gợi ý ảnh)
  const mx = [`# Ma trận ${l.range}`, ''];
  topicsOf(S, weekId).forEach(row => {
    const tv = topicCurrent(row); if (!tv) return;
    mx.push(`## Topic ${row.order} · ${tv.title} (v${tv.n})`, '');
    weekLanes(S, w).forEach(({ colId, k, label }) => {
      const c = cellAt(S, weekId, row.id, colId, k); if (!c) return;
      const cv = cellView(S, c);
      mx.push(`### ${label} · ${cv.state}`, '', cv.text ? mdBody(cv.text, 4) : '(trống)', '');
      if (cv.imagePrompt) mx.push(`Gợi ý ảnh: ${cv.imagePrompt}`, '');
    });
  });
  addText('matrix.md', mx.join('\n'));
  const tf = topicFileOf(S, weekId); addText('topics.md', tf ? tf.md : '(Tuần chưa nạp tệp Topic)\n');
  files.sort((a, b) => a.path.localeCompare(b.path));
  const manifest = { format: 'autocontent-export', week: l.iso, revision: w.revision, createdAt: S.settings.demoNow, dataVersion: DATA_VERSION,
    files: files.map(f => ({ path: f.path, bytes: f.bytes.length, sha256: sha256Bytes(f.bytes) })) };
  files.push({ path: 'manifest.json', bytes: utf8Bytes(JSON.stringify(manifest, null, 2) + '\n') });
  return { ok: true, files, name: exportFileName(S, weekId), manifest };
}

// ---------- 05g · Khung trình bày bài của ô, lệnh cho AI, quy tắc Trình bày (mục 10.28) ----------
// Khung mặc định theo Cấu trúc của Cột: mỗi đoạn một đề mục ##, đoạn văn ngắn, bước và ý liệt kê thành danh sách
function defaultLayoutGuide(col) {
  const st = (col && col.structure && col.structure.length ? col.structure : ['Hook', 'Nội dung', 'CTA']);
  return [
    'Trình bày bài như một văn bản hoàn chỉnh, định dạng Markdown:',
    `- Mỗi đoạn của cấu trúc là một đề mục cấp 2, đúng thứ tự: ${st.map(x => `"## ${x}"`).join(', ')}. Không thêm đề mục khác.`,
    `- Mỗi đoạn văn tối đa 3 câu và không quá ${PARA_WORDS} chữ; giữa hai đoạn văn có một dòng trống.`,
    '- Các bước viết thành danh sách, mỗi bước một dòng bắt đầu bằng "Bước 1:", "Bước 2:"…; ý liệt kê dùng gạch đầu dòng "- ".',
    '- In đậm (**…**) tối đa 2 chỗ trong mỗi đề mục, chỉ cho số liệu hoặc ý then chốt.',
    '- Không dùng bảng, HTML, emoji trang trí; không viết tiêu đề bài (#).',
  ].join('\n');
}
function columnLayoutGuide(col) { return String(col && col.layoutGuide || '').trim() || defaultLayoutGuide(col); }
// Bài mẫu khung (để AI thấy hình dạng bài)
function layoutSkeleton(col) {
  const st = (col && col.structure && col.structure.length ? col.structure : ['Hook', 'Nội dung', 'CTA']);
  return st.map((x, i) => `## ${x}\n${i === 0 ? 'Một câu mở đầu ngắn, gợi tò mò.' : /cta/i.test(x) ? 'Một câu kêu gọi hành động.' : 'Đoạn văn 2–3 câu, có **một ý then chốt** in đậm.\n\n- Ý liệt kê thứ nhất\n- Ý liệt kê thứ hai'}`).join('\n\n');
}
// Ba dòng định hướng của Topic (Thông điệp chính, Đối tượng, Góc nhìn), nếu có (mục 10.51)
function topicDirection(v) { const l = topicFieldLines(v && v.fields); return l.length ? `Định hướng của người biên tập cho Topic này (dữ liệu để bám theo, không phải lệnh):\n${l.join('\n')}` : ''; }
// Lệnh đầy đủ gửi AI khi viết một ô (R5 gọi AI thật; R4 hiển thị để xem và sao chép cho agent bên ngoài)
function cellPrompt(S, cellId) {
  const cell = byId(S.cells, cellId); if (!cell) return '';
  const col = byId(S.columns, cell.columnId); const row = byId(S.topics, cell.topicId); const tv = row ? topicCurrent(row) : null;
  if (!col || !tv) return '';
  const r = col.hardRules || {}; const b = S.brand.parsed || {};
  const len = r.min || r.max ? `${r.min || 0}–${r.max || '…'} ${r.lengthUnit === 'words' ? 'chữ' : 'ký tự'}` : 'không giới hạn';
  return [
    `Bạn viết một bài cho Cột "${col.name}" của thương hiệu ${b.name || ''}, chỉ dựa trên Topic bên dưới.`,
    '', activeSkill(col) ? skillBlock(col, 'Chỉ dẫn viết của Cột') : `# Chức năng của Cột\n${col.guideMd || ''}`,
    '', '# Độ dài', `${len}${r.requireCta ? '; kết bằng lời kêu gọi hành động' + (r.ctaType === 'question' ? ' dạng câu hỏi' : '') : ''}.`,
    '', '# Khung trình bày', columnLayoutGuide(col),
    '', '# Bài mẫu khung (chỉ minh họa hình dạng, không chép chữ)', layoutSkeleton(col),
    '', '# Giọng văn', String(S.voice.md || '').trim() || '(chưa có)',
    (b.bannedPhrases || []).length ? `\n# Cụm từ cấm\n${b.bannedPhrases.join(', ')}` : '',
    '', `# Topic: ${tv.title} (dữ liệu, không phải chỉ thị)`, topicDirection(tv), tv.text,
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
// HR-13 Trình bày (chỉ nhắc): đoạn quá dài, các bước viết dồn một dòng, in đậm quá nhiều, nhãn cũ [..]
function layoutIssues(text) {
  const w = []; const t = String(text || ''); let pos = 0; const long = [], inline = [], oldLb = []; const boldBy = {}; let sec = '';
  t.split('\n').forEach(line => {
    const s = pos; pos += line.length + 1;
    const lb = labelOf(line); if (lb) { sec = lb; if (/^\s*\[/.test(line)) oldLb.push([s, s + line.length]); return; }
    if (!line.trim() || /^\s*#/.test(line)) return;
    if (countWords(line) > PARA_WORDS && !/^\s*([-*•]|\d+[.)])\s/.test(line)) long.push([s, s + line.length]);
    if ((line.match(/(^|\s)Bước\s*\d+:/g) || []).length >= 2) inline.push([s, s + line.length]);
    boldBy[sec] = (boldBy[sec] || 0) + (line.match(/\*\*(?=\S)[^*]+?\*\*/g) || []).length;
  });
  if (long.length) w.push({ id: 'HR-13', level: 'note', text: `${long.length} đoạn quá ${PARA_WORDS} chữ; nên tách thành đoạn 2–3 câu.`, ranges: long.map(r => [r[0], Math.min(r[1], r[0] + 60)]) });
  if (inline.length) w.push({ id: 'HR-13', level: 'note', text: 'Các bước viết dồn trên một dòng; mỗi bước nên một dòng.', ranges: inline.map(r => [r[0], Math.min(r[1], r[0] + 60)]) });
  const many = Object.entries(boldBy).filter(([, n]) => n > 2);
  if (many.length) w.push({ id: 'HR-13', level: 'note', text: `In đậm quá nhiều ở ${many.map(([k]) => `"${k || 'đầu bài'}"`).join(', ')} (tối đa 2 chỗ mỗi đề mục).` });
  if (oldLb.length) w.push({ id: 'HR-13', level: 'note', text: 'Nhãn đoạn dạng [..] cũ; nên dùng đề mục "## Tên đoạn".' });
  return w;
}
// Định dạng lại theo khung mà không đổi chữ: nhãn [..] thành ##, chia đoạn, mỗi bước một dòng, dòng trống giữa các khối
function tidyMarkdown(text) {
  const lines = paraBreak(String(text || '').replace(/\r\n?/g, '\n')).split('\n').map(l => { const lb = labelOf(l); return lb ? `## ${lb}` : l.replace(/\s+$/, ''); });
  const out = [];
  lines.forEach(l => {
    const prev = out.length ? out[out.length - 1] : null;
    const listy = x => /^\s*([-*•]\s|\d+[.)]\s|Bước\s*\d+:)/.test(x || '');
    if (prev != null && l.trim() && prev.trim() && !(listy(prev) && listy(l))) out.push('');
    if (!(l.trim() === '' && (prev == null || prev.trim() === ''))) out.push(l);
  });
  return out.join('\n').trim();
}
function reformatCell(S, cellId, at) {
  const v = cellView(S, byId(S.cells, cellId) || {});
  if (!v || !v.gen) return { ok: false, error: 'Ô chưa có bài.' };
  const t = tidyMarkdown(v.text);
  if (t === v.text) return { ok: false, error: 'Bài đã đúng khung trình bày.' };
  return editCell(S, cellId, t, null, at);
}
// Bài mạng xã hội không hiển thị Markdown: bỏ dấu in đậm, đề mục thành dòng thường, gạch đầu dòng thành "•"
function plainSocial(text) {
  return String(text || '').split('\n').map(l => l.replace(/^(\s*)##+\s+/, '$1').replace(/^(\s*)[-*]\s+/, '$1• ').replace(/\*\*(?=\S)([^*]+?)\*\*/g, '$1')).join('\n');
}

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

// ---------- Frame ảnh của công ty và Image to Image (mục 10.33) ----------
// Frame: khung cố định của công ty ghép lên ảnh (vẽ thật trong trình duyệt). Toạ độ là tỉ lệ 0–1 theo khổ ảnh ra.
const FRAME_RATIOS = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1280, 720], '1.91:1': [1200, 630] };
const FRAME_RATIO_LABEL = { '1:1': 'Vuông 1:1', '4:5': 'Dọc 4:5', '9:16': 'Story 9:16', '16:9': 'Ngang 16:9', '1.91:1': 'Ảnh bìa 1200×630' };
// Khung dựng sẵn: vẽ bằng màu thương hiệu (Setup → Frame); khung tải lên là PNG nền trong suốt
const BUILTIN_FRAMES = [
  { id: 'fr-band', name: 'Dải thương hiệu', ratio: '1:1', kind: 'builtin', style: 'band', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.06, y: 0.785, w: 0.88, size: 0.056, color: '#ffffff', lines: 2 }, sub: { x: 0.06, y: 0.935, w: 0.88, size: 0.03, color: '#ffffffcc', lines: 1 } },
  { id: 'fr-card', name: 'Thẻ chữ dưới ảnh', ratio: '4:5', kind: 'builtin', style: 'card', photo: { x: 0.06, y: 0.05, w: 0.88, h: 0.58 },
    title: { x: 0.08, y: 0.68, w: 0.84, size: 0.058, color: '#ffffff', lines: 3 }, sub: { x: 0.08, y: 0.92, w: 0.84, size: 0.03, color: '#ffffffcc', lines: 1 } },
  { id: 'fr-story', name: 'Story chữ lớn', ratio: '9:16', kind: 'builtin', style: 'story', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.08, y: 0.64, w: 0.84, size: 0.072, color: '#ffffff', lines: 4 }, sub: { x: 0.08, y: 0.9, w: 0.84, size: 0.034, color: '#ffffffd9', lines: 2 } },
  { id: 'fr-thumb', name: 'Thumbnail video', ratio: '16:9', kind: 'builtin', style: 'thumb', photo: { x: 0, y: 0, w: 1, h: 1 },
    title: { x: 0.05, y: 0.2, w: 0.56, size: 0.085, color: 'accent', lines: 3 }, sub: { x: 0.05, y: 0.82, w: 0.56, size: 0.045, color: '#ffffff', lines: 1 } },
  { id: 'fr-cover', name: 'Ảnh bìa Blog', ratio: '1.91:1', kind: 'builtin', style: 'cover', photo: { x: 0, y: 0, w: 0.56, h: 1 },
    title: { x: 0.6, y: 0.2, w: 0.36, size: 0.06, color: '#ffffff', lines: 3 }, sub: { x: 0.6, y: 0.8, w: 0.36, size: 0.038, color: '#ffffffcc', lines: 2 } },
];
function frameStyleOf(S) {
  const st = S.frameStyle || {};
  return { color: st.color || '#1f3a93', accent: st.accent || '#ffd43b', logo: st.logo != null ? st.logo : ((S.brand && S.brand.parsed && S.brand.parsed.name) || '') };
}
function setFrameStyle(S, st) {
  const hex = x => /^#[0-9a-f]{6}$/i.test(String(x || ''));
  if (!hex(st.color) || !hex(st.accent)) return { ok: false, error: 'Màu phải ở dạng #RRGGBB.' };
  S.frameStyle = { color: st.color, accent: st.accent, logo: String(st.logo || '').trim().slice(0, 40) };
  return { ok: true };
}
function framesOf(S) { return BUILTIN_FRAMES.concat(S.frames || []); }
function frameOf(S, id) { return framesOf(S).find(f => f.id === id) || null; }
// Tỉ lệ của ô ảnh, đoán từ tên ô (như khung xem trước)
function assetRatio(name) { return ratioFromName(name) || '1:1'; }
// Frame xếp theo mức hợp: cùng tỉ lệ với ô ảnh lên đầu
function framesFor(S, ratio) { return framesOf(S).slice().sort((a, b) => (b.ratio === ratio) - (a.ratio === ratio)); }
const inUnit = v => typeof v === 'number' && v >= 0 && v <= 1;
function validateFrame(f) {
  const errs = [];
  if (!String(f.name || '').trim()) errs.push('Cần đặt tên frame.');
  if (!FRAME_RATIOS[f.ratio]) errs.push('Tỉ lệ không hợp lệ.');
  if (!/^data:image\/(png|webp);/.test(f.src || '')) errs.push('Frame cần là ảnh PNG (hoặc WebP) có nền trong suốt.');
  const p = f.photo || {};
  if (![p.x, p.y, p.w, p.h].every(inUnit) || p.w < 0.05 || p.h < 0.05 || p.x + p.w > 1.001 || p.y + p.h > 1.001) errs.push('Vùng đặt ảnh không hợp lệ.');
  ['title', 'sub'].forEach(k => { const t = f[k]; if (t && ![t.x, t.y, t.w].every(inUnit)) errs.push(`Vị trí ${k === 'title' ? 'tiêu đề' : 'phụ đề'} không hợp lệ.`); });
  return errs;
}
function saveFrame(S, f) {
  const fr = { id: f.id || nextId(S, 'frame'), name: String(f.name || '').trim(), ratio: f.ratio, kind: 'png', src: f.src, photo: clone(f.photo),
    title: Object.assign({ x: 0.06, y: 0.8, w: 0.88, size: 0.055, color: '#ffffff', lines: 2 }, f.title || {}),
    sub: Object.assign({ x: 0.06, y: 0.93, w: 0.88, size: 0.03, color: '#ffffff', lines: 1 }, f.sub || {}) };
  const errs = validateFrame(fr); if (errs.length) return { ok: false, error: errs.join(' ') };
  S.frames = S.frames || [];
  const i = S.frames.findIndex(x => x.id === fr.id);
  if (i >= 0) S.frames[i] = fr; else S.frames.push(fr);
  log(S, i >= 0 ? 'edit' : 'add', 'frame', fr.id, fr.name);
  return { ok: true, frame: fr };
}
function deleteFrame(S, id) {
  if (BUILTIN_FRAMES.some(f => f.id === id)) return { ok: false, error: 'Frame dựng sẵn không xoá được.' };
  const n = (S.frames || []).length; S.frames = (S.frames || []).filter(f => f.id !== id);
  return n === S.frames.length ? { ok: false, error: 'Không tìm thấy frame.' } : { ok: true };
}
// Chữ gợi ý cho tiêu đề ảnh: câu đầu của bài (bỏ nhãn, hashtag, emoji đầu dòng)
function frameTitleHint(s) {
  const t = String((s && s.text) || '').split('\n').map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s.*|Slide\s*\d+:)\s*/i, '').trim()).find(l => l.length > 8) || '';
  const first = splitSentences(t)[0] || t;
  const h = first.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return h.length <= 90 ? h : h.slice(0, 90).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '') + '…'; // cắt ở ranh giới từ
}

// Phiên bản ảnh mới do trình duyệt dựng (ghép frame, Image to Image trên ảnh thật); chọn ngay
function addSlotImageVersion(S, slotId, idx, data, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!data || !/^data:image\//.test(data.src || '')) return { ok: false, error: 'Ảnh dựng ra không hợp lệ.' };
  const n = a.versions.length + 1;
  const v = { n, seed: hash32(`${slotId}|${idx}|${n}|${data.src.length}`), createdAt: at || S.settings.demoNow, src: data.src, kind: 'image', ext: data.ext || 'jpg' };
  if (data.frame) v.frame = clone(data.frame);
  if (data.i2i) v.i2i = clone(data.i2i);
  if (data.crop) v.crop = clone(data.crop);
  if (data.tpl) v.tpl = clone(data.tpl);
  if (data.lib) v.lib = clone(data.lib);
  if (data.ai) v.ai = clone(data.ai);
  if (data.text) { const e = validateTextLayers(data.text.layers); if (e) return { ok: false, error: e }; v.text = { from: data.text.from, layers: data.text.layers.map(normTextLayer) }; }
  a.versions.push(v); chooseSlotImage(S, slotId, idx, n);
  log(S, data.ai ? 'ai-image' : data.lib ? 'library-image' : data.crop ? 'crop-image' : data.frame ? 'frame-image' : data.text ? 'text-image' : 'i2i-image', 'slot', slotId, `${a.name} v${n}`);
  return { ok: true, version: n };
}
// Image to Image (mô phỏng): ảnh đang dùng + yêu cầu → phiên bản mới. Ảnh thật được trình duyệt biến đổi (src gửi kèm);
// ảnh mô phỏng thì sinh hình mô phỏng mới nối từ hình cũ. Khi gắn API thật chỉ thay phần dựng ảnh.
function i2iSlotImage(S, slotId, idx, req, at) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const cur = a.versions.find(v => v.n === a.current);
  if (!cur) return { ok: false, error: 'Ô chưa có ảnh để biến đổi.' };
  if (cur.kind === 'video') return { ok: false, error: 'Image to Image chỉ dùng cho ảnh.' };
  const prompt = String((req && req.prompt) || '').replace(/\s+/g, ' ').trim();
  if (!prompt) return { ok: false, error: 'Nhập yêu cầu biến đổi ảnh.' };
  const strength = Math.min(1, Math.max(0.1, Number(req.strength) || 0.5));
  const meta = { from: cur.n, prompt, strength, simulated: !req.ai };
  if (req.ai) { meta.provider = req.ai.provider; meta.model = req.ai.model; }
  if (req.src) return addSlotImageVersion(S, slotId, idx, { src: req.src, ext: 'jpg', i2i: meta }, at);
  if (cur.src) return { ok: false, error: 'Thiếu ảnh dựng ra từ trình duyệt.' };
  const n = a.versions.length + 1;
  a.versions.push({ n, seed: hash32(`${slotId}|${idx}|${n}|${cur.seed}|${prompt}|${strength}`), createdAt: at || S.settings.demoNow, i2i: meta, edit: prompt });
  chooseSlotImage(S, slotId, idx, n);
  log(S, 'i2i-image', 'slot', slotId, `${a.name} v${n} · ${prompt}`);
  return { ok: true, version: n };
}
// Cách biến đổi mô phỏng theo từ khoá trong yêu cầu (trình duyệt áp bằng bộ lọc ảnh)
function i2iLook(prompt, strength) {
  const p = fold(prompt || ''); const k = Math.min(1, Math.max(0.1, Number(strength) || 0.5));
  const f = { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, blur: 0 };
  if (/\b(sang|ruc ro|tuoi)\b/.test(p)) f.brightness += 0.25 * k;
  if (/\b(toi|dem|huyen bi)\b/.test(p)) f.brightness -= 0.3 * k;
  if (/\b(am|vang|hoang hon|co dien|vintage)\b/.test(p)) f.sepia += 0.6 * k;
  if (/\b(lanh|xanh|bien)\b/.test(p)) f.hue += 25 * k;
  if (/\b(den trang|trang den|xam)\b/.test(p)) f.grayscale = 1;
  if (/\b(tuong phan|noi bat|manh)\b/.test(p)) f.contrast += 0.3 * k;
  if (/\b(nhat|diu|pastel|mem)\b/.test(p)) { f.saturate -= 0.4 * k; f.contrast -= 0.1 * k; }
  if (/\b(mo nen|xoa phong|bokeh)\b/.test(p)) f.blur = 2 * k;
  if (/\b(ruc ro|tuoi|bat mat)\b/.test(p)) f.saturate += 0.5 * k;
  const known = Object.keys(f).some(x => f[x] !== { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, blur: 0 }[x]);
  if (!known) f.hue = ((hash32(p) % 61) - 30) * k; // yêu cầu khác: đổi tông nhẹ để thấy là bản mới
  return f;
}

// ---------- Thêm chữ lên ảnh (mục 10.34) ----------
// Mỗi lớp chữ: nội dung, font, cỡ (tỉ lệ theo bề rộng ảnh), màu, đậm/nghiêng, căn lề, hiệu ứng, vị trí x/y (0–1).
// x là mép trái / tâm / mép phải tuỳ căn lề; y là mép trên của khối chữ. Trình duyệt vẽ bằng canvas.
const TEXT_FONTS = [
  { id: 'be-vietnam', name: 'Be Vietnam Pro', css: '"Be Vietnam Pro", sans-serif' },
  { id: 'roboto', name: 'Roboto', css: '"Roboto", sans-serif' },
  { id: 'montserrat', name: 'Montserrat', css: '"Montserrat", sans-serif' },
  { id: 'oswald', name: 'Oswald (chữ cao)', css: '"Oswald", sans-serif' },
  { id: 'playfair', name: 'Playfair Display (có chân)', css: '"Playfair Display", serif' },
  { id: 'dancing', name: 'Dancing Script (viết tay)', css: '"Dancing Script", cursive' },
];
const TEXT_EFFECTS = { none: 'Không', shadow: 'Bóng đổ', outline: 'Viền chữ', box: 'Nền mờ sau chữ' };
const TEXT_PLACES = { top: { y: 0.06, label: 'Trên' }, middle: { y: 0.42, label: 'Giữa' }, bottom: { y: 0.74, label: 'Dưới' } };
const clampN = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
function newTextLayer(over) {
  return normTextLayer(Object.assign({ text: 'Nhập chữ', font: 'be-vietnam', size: 0.07, color: '#ffffff', bold: true, italic: false, align: 'center', effect: 'shadow', x: 0.5, y: 0.42, w: 0.86 }, over || {}));
}
function normTextLayer(l) {
  l = l || {};
  return {
    text: String(l.text == null ? '' : l.text).replace(/\r/g, '').slice(0, 200),
    font: TEXT_FONTS.some(f => f.id === l.font) ? l.font : 'be-vietnam',
    size: clampN(l.size, 0.02, 0.2, 0.07),
    color: /^#[0-9a-f]{6}$/i.test(String(l.color || '')) ? l.color : '#ffffff',
    bold: !!l.bold, italic: !!l.italic,
    align: ['left', 'center', 'right'].includes(l.align) ? l.align : 'center',
    effect: TEXT_EFFECTS[l.effect] ? l.effect : 'none',
    x: clampN(l.x, 0, 1, 0.5), y: clampN(l.y, 0, 1, 0.42), w: clampN(l.w, 0.1, 1, 0.86),
  };
}
// Đặt nhanh: căn giữa theo chiều ngang, y theo vị trí đã chọn
function placeTextLayer(l, where) {
  const p = TEXT_PLACES[where]; if (!p) return normTextLayer(l);
  return normTextLayer(Object.assign({}, l, { y: p.y, x: 0.5, align: 'center' }));
}
function textFontCss(id) { const f = TEXT_FONTS.find(x => x.id === id) || TEXT_FONTS[0]; return f.css; }
// Kiểm tra trước khi tạo phiên bản: cần ít nhất một lớp có chữ, tối đa 8 lớp
function validateTextLayers(layers) {
  if (!Array.isArray(layers) || !layers.length) return 'Thêm ít nhất một lớp chữ.';
  if (layers.length > 8) return 'Tối đa 8 lớp chữ trên một ảnh.';
  if (!layers.some(l => String(l.text || '').trim())) return 'Các lớp chữ đang trống.';
  return '';
}

// ---------- Trợ lý viết: sửa đoạn bằng AI, phương án hook/caption, thư viện hashtag & CTA (mục 10.35) ----------
// Sửa đoạn và phương án hook/caption là MÔ PHỎNG (biến đổi theo quy tắc, xác định theo đầu vào).
// Khi gắn AI thật: thay aiRewrite / hookOptions / captionOptions bằng gọi mô hình (qua máy chủ), giữ nguyên dạng trả về.

const AI_OPS = {
  short: 'Ngắn lại', long: 'Viết dài hơn', casual: 'Thân mật hơn', formal: 'Trang trọng hơn',
  cta: 'Thêm lời kêu gọi', emoji: 'Thêm emoji', hook: 'Mở bài hấp dẫn hơn', fix: 'Sửa chính tả, dấu câu',
};
// Từ ngữ trang trọng ↔ thân mật (đổi hai chiều)
const TONE_PAIRS = [['sử dụng', 'dùng'], ['tuy nhiên', 'nhưng'], ['do đó', 'vì vậy'], ['thực hiện', 'làm'], ['bởi vì', 'vì'], ['hãy', 'cứ'], ['rất nhiều', 'cả đống'], ['nhanh chóng', 'nhanh gọn'], ['vô cùng', 'cực kỳ']];
const EMOJI_BY_WORD = [['nói', '🗣️'], ['nghe', '🎧'], ['học', '📚'], ['bước', '👣'], ['ngày', '📅'], ['họp', '💼'], ['mẹo', '💡'], ['sai', '⚠️'], ['đúng', '✅'], ['thử', '🔥'], ['cà phê', '☕'], ['ghi âm', '🎙️']];
const AI_FILLERS = ['Điều quan trọng là bắt đầu nhỏ và làm đều mỗi ngày.', 'Bạn có thể thử ngay trong tuần này để thấy khác biệt.', 'Nhiều người bỏ qua bước này, nhưng chính nó tạo ra thay đổi.', 'Cứ làm chậm mà chắc, kết quả sẽ tự đến.'];
const DEFAULT_CTAS = ['Lưu bài để làm theo và bình luận "xong" khi bạn thử nhé.', 'Bạn đã thử cách này chưa? Kể cho mình nghe dưới bình luận nhé.', 'Chia sẻ cho một người bạn cũng đang cần nhé.'];

const capFirst = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
const lowFirst = t => t && !/^[A-ZĐ]{2,}/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
function swapWords(text, pairs, dir) {
  let out = text;
  pairs.forEach(([a, b]) => { const [from, to] = dir ? [a, b] : [b, a]; out = out.replace(new RegExp(`(^|[^\\p{L}])(${from})(?=[^\\p{L}]|$)`, 'giu'), (m, pre, w) => pre + (w[0] === w[0].toUpperCase() ? capFirst(to) : to)); });
  return out;
}
// Đoán thao tác từ yêu cầu tự do
function aiOpsOf(instruction) {
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
function aiRewrite(text, op, opts) {
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
const HOOK_KINDS = { question: 'Câu hỏi', number: 'Con số', surprise: 'Bất ngờ', story: 'Câu chuyện', benefit: 'Lợi ích' };
// Ý chính của bài: câu đầu, bỏ nhãn đoạn, hashtag, dấu chấm cuối
function coreIdea(text) {
  const line = String(text || '').split('\n').map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s+|Slide\s*\d+:|[-*•]\s+)/i, '').trim()).find(l => l && !/^#\S/.test(l)) || '';
  let c = (splitSentences(line)[0] || line).replace(/\*\*/g, '').replace(/[.!?:…]+$/, '').trim();
  const head = c.split(/:\s/)[0]; if (head.length >= 12 && head !== c) c = head; // "Chủ đề: chi tiết" → lấy chủ đề
  if (c.length > 70) { const k = c.indexOf(', '); if (k >= 12) c = c.slice(0, k); }
  return c;
}
function hookOptions(text, opts) {
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
function replaceHook(text, hook) {
  const lines = String(text || '').split('\n');
  const i = lines.findIndex(l => l.trim() && !/^\s*(\[[^\]]+\]|#{1,6}\s)/.test(l.trim()) && !/^#\S/.test(l.trim()));
  if (i < 0) return `${hook}\n\n${text}`;
  const m = lines[i].match(/^(\s*(?:Slide\s*\d+:\s*)?)(.*)$/i); const rest = splitSentences(m[2]).slice(1).join(' ');
  lines[i] = m[1] + hook + (rest ? '\n\n' + rest : '');
  return lines.join('\n');
}
// Ba phương án caption theo độ dài, dùng hashtag và CTA hợp ngữ cảnh
function captionOptions(S, text, ctx) {
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
function setSlotHookKind(S, slotId, kind) {
  const s = byId(S.slots, slotId); if (!s) return { ok: false, error: 'Không tìm thấy slot.' };
  if (!HOOK_KINDS[kind]) return { ok: false, error: 'Loại hook không hợp lệ.' };
  s.hookKind = kind; return { ok: true };
}

// ---- Thư viện hashtag & CTA (chạy thật) ----
const DEFAULT_SNIPPETS = [
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
function snippetsOf(S) { return S.snippets || (S.isDemo ? DEFAULT_SNIPPETS : []); }
function ownSnippets(S) { if (!S.snippets) S.snippets = clone(snippetsOf(S)); return S.snippets; }
// Hợp ngữ cảnh: đúng Cột + kênh > đúng một trong hai > dùng chung; sau đó dùng nhiều trước
function snippetsFor(S, ctx, kind, q) {
  const c = ctx || {}; const fq = fold(q || '');
  return snippetsOf(S).filter(x => (!kind || x.kind === kind) && (!x.columnId || !c.columnId || x.columnId === c.columnId) && (!x.channelId || !c.channelId || x.channelId === c.channelId) && (!fq || fold(x.text).includes(fq)))
    .map(x => ({ x, w: (x.columnId && x.columnId === c.columnId ? 2 : 0) + (x.channelId && x.channelId === c.channelId ? 2 : 0) + (x.uses || 0) / 1000 }))
    .sort((a, b) => b.w - a.w).map(o => o.x);
}
function saveSnippet(S, sn) {
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
function deleteSnippet(S, id) {
  const list = ownSnippets(S); const n = list.length; S.snippets = list.filter(x => x.id !== id);
  return n === S.snippets.length ? { ok: false, error: 'Không tìm thấy mục.' } : { ok: true };
}
function useSnippet(S, id) { const x = ownSnippets(S).find(y => y.id === id); if (x) x.uses = (x.uses || 0) + 1; return x || null; }

// ---------- Cắt, xoay, đổi tỉ lệ ảnh và Mẫu thiết kế (mục 10.36) — chạy thật trong trình duyệt ----------
const CROP_RATIOS = { orig: { label: 'Giữ tỉ lệ gốc', r: null }, '1:1': { label: '1:1', r: 1 }, '4:5': { label: '4:5', r: 0.8 }, '9:16': { label: '9:16', r: 9 / 16 }, '16:9': { label: '16:9', r: 16 / 9 }, '1.91:1': { label: '1200×630', r: 1200 / 630 } };
// Vùng cắt trên ảnh đã xoay (iw × ih): tỉ lệ r, phóng z (1 = lớn nhất vừa ảnh), tâm (cx, cy) theo 0–1; tự kẹp để không ra ngoài ảnh
function cropRect(iw, ih, ratio, zoom, cx, cy) {
  const r = (CROP_RATIOS[ratio] && CROP_RATIOS[ratio].r) || iw / ih;
  const z = Math.min(4, Math.max(1, Number(zoom) || 1));
  let w = iw, h = iw / r; if (h > ih) { h = ih; w = ih * r; }
  w /= z; h /= z;
  const x = Math.min(iw - w, Math.max(0, (Number.isFinite(cx) ? cx : 0.5) * iw - w / 2));
  const y = Math.min(ih - h, Math.max(0, (Number.isFinite(cy) ? cy : 0.5) * ih - h / 2));
  return { x, y, w, h };
}
// Khổ ảnh ra: tỉ lệ có tên dùng khổ chuẩn của kênh; giữ gốc thì theo vùng cắt, cạnh dài tối đa 1600px
function cropOutSize(ratio, w, h) {
  if (FRAME_RATIOS[ratio]) return FRAME_RATIOS[ratio].slice();
  const k = Math.min(1, 1600 / Math.max(w, h)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}
function normRotation(deg) { return ((Math.round((Number(deg) || 0) / 90) * 90) % 360 + 360) % 360; }

// ---- Mẫu thiết kế: bộ lớp chữ (+ frame tuỳ chọn) dùng lại cho ảnh khác ----
function designTemplatesOf(S) { return S.designTemplates || []; }
function saveDesignTemplate(S, t) {
  const name = String((t && t.name) || '').trim().slice(0, 60);
  if (!name) return { ok: false, error: 'Đặt tên cho mẫu.' };
  const layers = ((t && t.layers) || []).map(normTextLayer);
  const e = validateTextLayers(layers); if (e) return { ok: false, error: e };
  const frameId = t.frameId && frameOf(S, t.frameId) ? t.frameId : null;
  S.designTemplates = S.designTemplates || [];
  const item = { id: t.id || nextId(S, 'tpl'), name, frameId, layers };
  const i = S.designTemplates.findIndex(x => x.id === item.id);
  if (i >= 0) S.designTemplates[i] = item; else S.designTemplates.push(item);
  log(S, i >= 0 ? 'edit' : 'add', 'template', item.id, name);
  return { ok: true, template: item };
}
function deleteDesignTemplate(S, id) {
  const n = designTemplatesOf(S).length; S.designTemplates = designTemplatesOf(S).filter(x => x.id !== id);
  return n === S.designTemplates.length ? { ok: false, error: 'Không tìm thấy mẫu.' } : { ok: true };
}
// Áp mẫu: giữ vị trí, font, màu của mẫu; thay nội dung bằng chữ người dùng nhập (ô trống giữ chữ mẫu)
function applyDesignTemplate(tpl, texts) {
  return tpl.layers.map((l, i) => normTextLayer(Object.assign({}, l, texts && texts[i] != null && String(texts[i]).trim() ? { text: texts[i] } : {})));
}

// ---------- Kho tài sản, soạn carousel theo slide, chuyển bài sang kênh khác (mục 10.37) ----------
// Kho tài sản và soạn carousel: chạy thật. Chuyển bài sang kênh: MÔ PHỎNG (convertPost ghép lại câu theo khung Format đích).

// ---- Kho tài sản ----
function libraryOf(S) { return S.library || []; }
function addLibraryItem(S, it, at) {
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
function updateLibraryItem(S, id, patch) {
  const it = libraryOf(S).find(x => x.id === id); if (!it) return { ok: false, error: 'Không tìm thấy ảnh trong kho.' };
  if (patch.name != null) { const n = String(patch.name).trim().slice(0, 80); if (!n) return { ok: false, error: 'Tên không được để trống.' }; it.name = n; }
  if (patch.tags != null) it.tags = normTags(patch.tags);
  return { ok: true, item: it };
}
function deleteLibraryItem(S, id) {
  const n = libraryOf(S).length; S.library = libraryOf(S).filter(x => x.id !== id);
  return n === S.library.length ? { ok: false, error: 'Không tìm thấy ảnh trong kho.' } : { ok: true };
}
function libraryFind(S, q, tag) {
  const f = fold(q || '');
  return libraryOf(S).filter(x => (!tag || x.tags.includes(tag)) && (!f || fold(x.name + ' ' + x.tags.join(' ')).includes(f)));
}
function libraryTags(S) { return [...new Set(libraryOf(S).flatMap(x => x.tags))].sort(); }
// Số lần ảnh trong kho đã được dùng ở slot
function libraryUses(S, id) { let n = 0; S.slots.forEach(s => s.assets.forEach(a => a.versions.forEach(v => { if (v.lib && v.lib.id === id) n++; }))); return n; }
function useLibraryItem(S, slotId, idx, libId, at) {
  const it = libraryOf(S).find(x => x.id === libId); if (!it) return { ok: false, error: 'Không tìm thấy ảnh trong kho.' };
  const m = /^data:image\/(\w+);/.exec(it.src); const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg';
  return addSlotImageVersion(S, slotId, idx, { src: it.src, ext, lib: { id: it.id, name: it.name } }, at);
}

// ---- Soạn carousel theo slide ----
// Tách bài carousel: phần trước "Slide 1" (chú thích) và nội dung từng slide
function carouselParse(text) {
  const t = String(text || ''); const m = /^\s*Slide\s*\d+\s*[:·.-]/im.exec(t);
  return { lead: m ? t.slice(0, m.index).trim() : '', slides: slidesOf(t) };
}
function carouselCompose(lead, slides) {
  const body = slides.map((x, i) => `Slide ${i + 1}: ${String(x).replace(/\s+$/, '')}`).join('\n\n');
  return lead && lead.trim() ? `${lead.trim()}\n\n${body}` : body;
}
const isSlideAsset = a => /^Slide\s*\d+/i.test(a.name);
// slides: [{ text, from }] — from là chỉ số slide cũ (ảnh đi theo), null là slide mới (ô ảnh trống)
function saveCarouselSlides(S, slotId, lead, slides, at) {
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
function plainSentences(text) {
  const body = String(text || '').split('\n')
    .filter(l => !/^\s*#\S/.test(l.trim()) || /^\s*#{1,6}\s/.test(l))
    .map(l => l.replace(/^\s*(\[[^\]]+\]|#{1,6}\s+|Slide\s*\d+\s*[:·.-]|[-*•]\s+|\d+[.)]\s+)/i, '').trim())
    .filter(Boolean).map(l => /[.!?…:"”)]$/.test(l) ? l : l + '.').join(' ').replace(/\*\*/g, '');
  return splitSentences(body).filter(x => x.length > 3);
}
function convertPost(S, text, toFormatId, ctx) {
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
function repurposeSlot(S, fromId, req, at) {
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

// ---------- Ảnh AI thật qua API, ảnh bìa và phụ đề video (mục 10.38) ----------
// Gọi API: chạy thật khi người dùng nhập khoá (trình duyệt gọi thẳng nhà cung cấp). Khoá không nằm trong S (không vào bản sao lưu).
// Phụ đề "Tạo từ bài": MÔ PHỎNG thời gian (chia theo độ dài câu); "Nhận giọng nói" qua API là thật.

const IMAGE_PROVIDERS = {
  off: { label: 'Mô phỏng (không gọi API)' },
  openai: { label: 'OpenAI', model: 'gpt-image-1', endpoint: 'https://api.openai.com/v1', key: true, stt: true },
  stability: { label: 'Stability AI', model: 'sd3.5-large', endpoint: 'https://api.stability.ai', key: true },
  custom: { label: 'Máy chủ riêng', model: '', endpoint: '', key: false },
};
function imageApiOf(S) {
  const c = Object.assign({ provider: 'off', model: '', endpoint: '', sttModel: 'whisper-1' }, S.imageApi || {});
  const p = IMAGE_PROVIDERS[c.provider] || IMAGE_PROVIDERS.off;
  return Object.assign(c, { model: c.model || p.model || '', endpoint: c.endpoint || p.endpoint || '' });
}
function imageApiOn(S) { return imageApiOf(S).provider !== 'off'; }
function setImageApi(S, patch) {
  const old = imageApiOf(S); const P = patch || {};
  const c = Object.assign({}, old, P);
  if (P.provider && P.provider !== old.provider) { const d = IMAGE_PROVIDERS[P.provider] || {}; if (P.endpoint == null) c.endpoint = d.endpoint || ''; if (P.model == null) c.model = d.model || ''; }
  if (!IMAGE_PROVIDERS[c.provider]) return { ok: false, error: 'Nhà cung cấp không hợp lệ.' };
  const ep = String(c.endpoint || '').trim().replace(/\/+$/, '');
  if (c.provider !== 'off') {
    if (!/^https:\/\/[^\s/]+/i.test(ep) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(ep)) return { ok: false, error: 'Địa chỉ API phải bắt đầu bằng https:// (hoặc http://localhost khi thử trên máy).' };
    if (c.provider !== 'custom' && !String(c.model || '').trim()) return { ok: false, error: 'Nhập tên model.' };
  }
  S.imageApi = { provider: c.provider, model: String(c.model || '').trim().slice(0, 60), endpoint: ep, sttModel: String(c.sttModel || 'whisper-1').trim().slice(0, 60) || 'whisper-1' };
  log(S, 'image-api', 'settings', c.provider, c.provider === 'off' ? 'mô phỏng' : `${c.provider} · ${S.imageApi.model}`);
  return { ok: true, api: imageApiOf(S) };
}
// Khổ gửi API theo tỉ lệ ô ảnh
function apiSizeFor(provider, ratio) {
  if (provider === 'openai') return ratio === '1:1' ? '1024x1024' : ['4:5', '9:16'].includes(ratio) ? '1024x1536' : '1536x1024';
  if (provider === 'stability') return { '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '16:9': '16:9', '1.91:1': '21:9' }[ratio] || '1:1';
  const wh = FRAME_RATIOS[ratio] || FRAME_RATIOS['1:1']; return `${wh[0]}x${wh[1]}`;
}
// Mô tả yêu cầu HTTP (giao diện dựng fetch). Ảnh gửi kèm ở dạng { file: dataUrl, name }.
function buildImageRequest(cfg, key, req) {
  const p = IMAGE_PROVIDERS[cfg.provider];
  if (!p || cfg.provider === 'off') return { ok: false, error: 'Chưa bật gọi API ảnh (Setup → AI ảnh & video).' };
  if (p.key && !String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API (Setup → AI ảnh & video).' };
  const prompt = String(req.prompt || '').replace(/\s+/g, ' ').trim(); if (!prompt) return { ok: false, error: 'Thiếu prompt.' };
  const i2i = req.mode === 'i2i'; if (i2i && !req.image) return { ok: false, error: 'Thiếu ảnh gốc.' };
  const strength = Math.min(1, Math.max(0.1, Number(req.strength) || 0.5));
  const size = apiSizeFor(cfg.provider, req.ratio || '1:1');
  const auth = key ? { Authorization: `Bearer ${String(key).trim()}` } : {};
  if (cfg.provider === 'openai') {
    if (!i2i) return { ok: true, url: `${cfg.endpoint}/images/generations`, headers: Object.assign({ 'Content-Type': 'application/json' }, auth), json: { model: cfg.model, prompt, size, n: 1, quality: cfg.quality || 'low' } };
    return { ok: true, url: `${cfg.endpoint}/images/edits`, headers: auth, form: [['model', cfg.model], ['prompt', prompt], ['size', size], ['quality', cfg.quality || 'low'], ['image', { file: req.image, name: 'image.png' }]] };
  }
  if (cfg.provider === 'stability') {
    const form = [['prompt', prompt], ['model', cfg.model], ['output_format', 'jpeg'], ['mode', i2i ? 'image-to-image' : 'text-to-image']];
    if (i2i) form.push(['image', { file: req.image, name: 'image.jpg' }], ['strength', String(strength)]); else form.push(['aspect_ratio', size]);
    return { ok: true, url: `${cfg.endpoint}/v2beta/stable-image/generate/sd3`, headers: Object.assign({ Accept: 'application/json' }, auth), form };
  }
  const [w, h] = size.split('x').map(Number);
  return { ok: true, url: cfg.endpoint, headers: Object.assign({ 'Content-Type': 'application/json' }, auth), json: { mode: i2i ? 'i2i' : 'gen', prompt, ratio: req.ratio || '1:1', width: w, height: h, strength: i2i ? strength : undefined, image: i2i ? req.image : undefined, model: cfg.model || undefined } };
}
// Đọc kết quả: { ok, src } (data URL) hoặc { ok, url } (giao diện tải tiếp) hoặc lỗi dễ hiểu
function parseImageResponse(provider, status, body) {
  const msg = body && (body.error && (body.error.message || body.error) || body.errors && [].concat(body.errors).join('; ') || body.message || body.detail);
  if (status === 401 || status === 403) return { ok: false, error: 'Khoá API sai, hết hạn hoặc không có quyền dùng model này.' };
  if (status === 429) return { ok: false, error: 'Nhà cung cấp báo vượt hạn mức hoặc hết tín dụng. Thử lại sau.' };
  if (status >= 400) return { ok: false, error: `API báo lỗi ${status}${msg ? ': ' + String(msg).slice(0, 200) : ''}.` };
  if (!body || typeof body !== 'object') return { ok: false, error: 'API trả về dữ liệu không đọc được.' };
  if (body.finish_reason === 'CONTENT_FILTERED') return { ok: false, error: 'Nhà cung cấp chặn ảnh vì nội dung. Sửa prompt rồi thử lại.' };
  const d = Array.isArray(body.data) ? body.data[0] : null;
  const b64 = (d && d.b64_json) || (typeof body.image === 'string' && !/^(data:|https?:)/.test(body.image) ? body.image : null) || body.b64_json;
  if (b64) return { ok: true, src: `data:image/${provider === 'stability' ? 'jpeg' : 'png'};base64,${b64}` };
  const any = (d && d.url) || body.image || body.url || (body.images && body.images[0]);
  if (typeof any === 'string' && /^data:image\//.test(any)) return { ok: true, src: any };
  if (typeof any === 'string' && /^https?:\/\//.test(any)) return { ok: true, url: any };
  return { ok: false, error: 'API không trả về ảnh.' };
}
// Kiểm tra khoá (không tốn phí): liệt kê model / xem tài khoản
function buildCheckRequest(cfg, key) {
  if (cfg.provider === 'openai') return { ok: true, url: `${cfg.endpoint}/models`, headers: { Authorization: `Bearer ${String(key || '').trim()}` } };
  if (cfg.provider === 'stability') return { ok: true, url: `${cfg.endpoint}/v1/user/account`, headers: { Authorization: `Bearer ${String(key || '').trim()}` } };
  return { ok: false, error: cfg.provider === 'off' ? 'Đang ở chế độ mô phỏng.' : 'Máy chủ riêng: thử bằng cách Gen một ảnh.' };
}
// Nhận giọng nói thành phụ đề (OpenAI)
function buildSttRequest(cfg, key, file) {
  if (!(IMAGE_PROVIDERS[cfg.provider] || {}).stt) return { ok: false, error: 'Nhận giọng nói cần nhà cung cấp OpenAI (Setup → AI ảnh & video).' };
  if (!String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API.' };
  return { ok: true, url: `${cfg.endpoint}/audio/transcriptions`, headers: { Authorization: `Bearer ${String(key).trim()}` },
    form: [['model', cfg.sttModel || 'whisper-1'], ['response_format', 'verbose_json'], ['timestamp_granularities[]', 'segment'], ['language', 'vi'], ['file', { file, name: 'video.' + (((/^data:video\/(\w+)/.exec(file) || [])[1] || 'mp4').replace('quicktime', 'mov')) }]] };
}
function parseSttResponse(status, body) {
  if (status >= 400) return parseImageResponse('openai', status, body);
  const seg = body && Array.isArray(body.segments) ? body.segments : null;
  if (!seg || !seg.length) return body && body.text ? { ok: true, cues: [{ start: 0, end: Math.max(1, Number(body.duration) || 5), text: String(body.text).trim() }] } : { ok: false, error: 'Không nhận được lời nói trong video.' };
  return { ok: true, cues: normCues(seg.map(x => ({ start: x.start, end: x.end, text: x.text }))) };
}

// ---- Video: ảnh bìa ----
function videoAt(S, slotId, idx) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô video.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  const v = a.versions.find(x => x.n === a.current);
  if (!v || v.kind !== 'video') return { ok: false, error: 'Ô này chưa có video.' };
  return { ok: true, s, a, v };
}
function setVideoCover(S, slotId, idx, cover, at) {
  const r = videoAt(S, slotId, idx); if (!r.ok) return r;
  if (!cover) { delete r.v.cover; log(S, 'video-cover', 'slot', slotId, `${r.a.name} · bỏ bìa`); return { ok: true }; }
  if (!/^data:image\/(png|jpeg|webp);/.test(cover.src || '')) return { ok: false, error: 'Ảnh bìa không hợp lệ.' };
  r.v.cover = { src: cover.src, t: cover.t != null ? Math.max(0, Math.round(Number(cover.t) * 10) / 10) : null, at: at || S.settings.demoNow };
  log(S, 'video-cover', 'slot', slotId, `${r.a.name} · ${cover.t != null ? 'khung ' + fmtClock(cover.t) : 'ảnh tải lên'}`);
  return { ok: true };
}

// ---- Video: phụ đề ----
const SUB_MAX_CHARS = 84; // 2 dòng × 42 ký tự
function fmtClock(t) { t = Math.max(0, Number(t) || 0); const m = Math.floor(t / 60); const s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }
function parseClock(x) {
  const m = /^\s*(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)\s*$/.exec(String(x || '')) || /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(String(x || ''));
  if (!m) return null;
  if (m.length === 2) return Number(m[1].replace(',', '.'));
  return (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3].replace(',', '.'));
}
function normCues(cues) {
  return (cues || []).map(c => ({ start: Math.max(0, Math.round(Number(c.start) * 1000) / 1000), end: Math.max(0, Math.round(Number(c.end) * 1000) / 1000), text: String(c.text || '').replace(/[ \t]+/g, ' ').trim() }))
    .filter(c => c.text).sort((a, b) => a.start - b.start);
}
function validateCues(cues) {
  if (!cues.length) return 'Chưa có dòng phụ đề nào.';
  if (cues.length > 400) return 'Tối đa 400 dòng phụ đề.';
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (!(c.end > c.start)) return `Dòng ${i + 1}: giờ kết thúc phải sau giờ bắt đầu.`;
    if (c.text.length > 200) return `Dòng ${i + 1}: dài quá 200 ký tự.`;
    if (i && c.start < cues[i - 1].end - 0.001) return `Dòng ${i + 1} chồng thời gian với dòng ${i}.`;
  }
  return '';
}
// Câu của bài để làm phụ đề: bỏ nhãn [..], tiêu đề #, "Slide i:", hashtag; câu dài cắt theo dấu phẩy rồi theo từ
function scriptLines(text) {
  const out = [];
  plainSentences(text).forEach(x => {
    x = x.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim(); if (!x) return;
    // câu dài: chia đều thành các đoạn ≤ SUB_MAX_CHARS, cắt ở dấu phẩy hoặc khoảng trắng gần điểm chia nhất
    let rest = x;
    while (rest.length > SUB_MAX_CHARS) {
      const target = Math.ceil(rest.length / Math.ceil(rest.length / SUB_MAX_CHARS));
      const cands = [...rest.slice(0, SUB_MAX_CHARS + 1).matchAll(/[,;:]? /g)].map(m => m.index + m[0].length - 1);
      let cut = cands.length ? cands.reduce((b, i) => Math.abs(i - target) - (rest[i - 1] === ',' ? 8 : 0) < Math.abs(b - target) - (rest[b - 1] === ',' ? 8 : 0) ? i : b) : SUB_MAX_CHARS;
      out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  });
  return out;
}
// Mô phỏng: chia thời lượng video theo độ dài từng câu (chưa nghe được video)
function subtitleDraft(text, duration) {
  const lines = scriptLines(text); if (!lines.length) return { ok: false, error: 'Bài chưa có chữ để làm phụ đề.' };
  const D = Number(duration) > 0 && isFinite(duration) ? Number(duration) : Math.max(5, lines.length * 3);
  const w = lines.map(l => l.length + 10), sum = w.reduce((a, b) => a + b, 0);
  let t = 0;
  const cues = lines.map((l, i) => { const d = D * w[i] / sum; const c = { start: t, end: i === lines.length - 1 ? D : t + d, text: l }; t += d; return c; });
  return { ok: true, cues: normCues(cues), simulated: true };
}
function srtTime(t, sep) { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; }
function cuesToSrt(cues) { return cues.map((c, i) => `${i + 1}\n${srtTime(c.start, ',')} --> ${srtTime(c.end, ',')}\n${c.text}\n`).join('\n'); }
function cuesToVtt(cues) { return 'WEBVTT\n\n' + cues.map(c => `${srtTime(c.start, '.')} --> ${srtTime(c.end, '.')}\n${c.text}\n`).join('\n'); }
function parseSubtitles(text) {
  const t = String(text || '').replace(/\r/g, '').replace(/^\uFEFF/, '');
  const re = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  const sec = (h, m, s, ms) => Number(h || 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;
  const cues = []; let m;
  while ((m = re.exec(t))) cues.push({ start: sec(m[1], m[2], m[3], m[4]), end: sec(m[5], m[6], m[7], m[8]), text: m[9].split('\n').filter(l => !/^\d+$/.test(l.trim())).join(' ').replace(/<[^>]+>/g, '') });
  return cues.length ? { ok: true, cues: normCues(cues) } : { ok: false, error: 'Không đọc được tệp phụ đề (cần .srt hoặc .vtt).' };
}
function setVideoSubs(S, slotId, idx, cues, source, at) {
  const r = videoAt(S, slotId, idx); if (!r.ok) return r;
  if (!cues) { delete r.v.subs; log(S, 'video-subs', 'slot', slotId, `${r.a.name} · bỏ phụ đề`); return { ok: true }; }
  const c = normCues(cues); const e = validateCues(c); if (e) return { ok: false, error: e };
  r.v.subs = { cues: c, source: ['script', 'file', 'api', 'manual'].includes(source) ? source : 'manual', lang: 'vi', at: at || S.settings.demoNow };
  log(S, 'video-subs', 'slot', slotId, `${r.a.name} · ${c.length} dòng`);
  return { ok: true, count: c.length };
}

// ---------- Viết bài bằng AI thật (mục 10.39) ----------
// Logic vẫn đồng bộ: giao diện chạy thử thao tác trên bản sao S để biết những ô/slot sẽ được viết (aiPlan),
// gọi AI cho từng việc, gửi kết quả vào setAiText, rồi chạy thao tác thật. Viết ô/slot lấy kết quả AI (takeAiText)
// thay cho bộ ghép mô phỏng; việc nào AI lỗi thì dùng bản mô phỏng như cũ.

const TEXT_PROVIDERS = {
  off: { label: 'Mô phỏng (không gọi API)' },
  claudeai: { label: 'Claude của claude.ai (không cần khoá, chạy trong artifact)', model: '', endpoint: 'claude.ai', key: false, sample: true },
  anthropic: { label: 'Anthropic Claude', model: 'claude-sonnet-5-5', light: 'claude-haiku-5-5', endpoint: 'https://api.anthropic.com/v1', key: true },
  openai: { label: 'OpenAI', model: 'gpt-4.1-mini', light: '', endpoint: 'https://api.openai.com/v1', key: true },
  custom: { label: 'Máy chủ riêng', model: '', endpoint: '', key: false },
};
function textApiOf(S) {
  const c = Object.assign({ provider: 'off', model: '', endpoint: '', lightModel: '' }, S.textApi || {});
  const p = TEXT_PROVIDERS[c.provider] || TEXT_PROVIDERS.off;
  return Object.assign(c, { model: c.model || p.model || '', endpoint: c.endpoint || p.endpoint || '' });
}
// Cấu hình gọi cho một loại việc: việc nhẹ (Sửa đoạn, Hook, CTA) dùng model nhẹ nếu đã khai báo, không thì dùng model chính (mục 10.44)
function textCfgFor(S, light) { const c = textApiOf(S); return light && c.lightModel ? Object.assign({}, c, { model: c.lightModel }) : c; }
function textApiOn(S) { return textApiOf(S).provider !== 'off'; }
function setTextApi(S, patch) {
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
function buildTextRequest(cfg, key, req) {
  const p = TEXT_PROVIDERS[cfg.provider];
  if (!p || cfg.provider === 'off') return { ok: false, error: 'Chưa bật AI viết bài (Setup → Kết nối AI).' };
  if (p.key && !String(key || '').trim()) return { ok: false, error: 'Chưa nhập khoá API cho AI viết bài (Setup → Kết nối AI).' };
  const k = String(key || '').trim(); const max = req.maxTokens || 4000;
  if (cfg.provider === 'anthropic') return { ok: true, url: `${cfg.endpoint}/messages`, headers: { 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, json: { model: cfg.model, max_tokens: max, system: req.system, messages: [{ role: 'user', content: req.user }] } };
  if (cfg.provider === 'openai') return { ok: true, url: `${cfg.endpoint}/chat/completions`, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }, json: { model: cfg.model, messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }] } };
  return { ok: true, url: cfg.endpoint, headers: Object.assign({ 'Content-Type': 'application/json' }, k ? { Authorization: `Bearer ${k}` } : {}), json: { system: req.system, user: req.user, model: cfg.model || undefined, max_tokens: max } };
}
function parseTextResponse(provider, status, body) {
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
function extractJson(raw) {
  const s = String(raw || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

// ---- Kết quả AI chờ dùng (khoá "cell:<id>:<n>" hoặc "slot:<id>:<genN>") ----
const AI_TEXT = new Map();
let AI_REC = null;
function setAiText(key, val) { AI_TEXT.set(key, val); }
function takeAiText(key) { const v = AI_TEXT.get(key); AI_TEXT.delete(key); return v || null; }
function clearAiText() { AI_TEXT.clear(); }
// Chạy thử thao tác trên bản sao để biết việc cần AI viết; trả danh sách {key, kind, label, system, user, criteria}
function aiPlan(S, run) {
  const C = clone(S); AI_REC = [];
  try { run(C); } catch (e) { /* thao tác lỗi thì không có việc */ }
  const jobs = AI_REC; AI_REC = null; return jobs;
}
// Áp điểm AI theo tiêu chí; thiếu tiêu chí nào thì trả null để dùng điểm mô phỏng
function aiScore(criteria, sc, tip) {
  if (!sc || typeof sc !== 'object' || !(criteria || []).length) return null;
  const scores = criteria.map(c => { const v = Math.round(Number(sc[c.id])); return v >= 1 && v <= 5 ? { criterionId: c.id, score: v } : null; });
  if (scores.some(x => !x)) return null;
  const total = Math.round(criteria.reduce((s, c, i) => s + c.weight * scores[i].score / 5, 0));
  return { scores, total, tip: String(tip || '').trim().slice(0, 200) || 'Giữ nguyên; bài đã cân đối.' };
}
// Đọc bài AI viết: JSON {text, imagePrompt, scores, tip}; không phải JSON thì coi cả câu trả lời là bài
function parseAiPost(raw, criteria) {
  const j = extractJson(raw);
  const text = j && typeof j.text === 'string' ? j.text : (j ? '' : String(raw || ''));
  const t = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!t) return { ok: false, error: 'AI không trả về bài viết.' };
  const seo = j && j.seo && typeof j.seo === 'object' ? ['seoTitle', 'metaDescription', 'excerpt', 'coverAlt'].reduce((o, k) => { if (typeof j.seo[k] === 'string' && j.seo[k].trim()) o[k] = j.seo[k].replace(/\s+/g, ' ').trim().slice(0, 400); return o; }, {}) : null;
  return { ok: true, text: t, imagePrompt: j && typeof j.imagePrompt === 'string' ? j.imagePrompt.trim().slice(0, 600) : '', score: j ? aiScore(criteria, j.scores, j.tip) : null, seo: seo && Object.keys(seo).length ? seo : null };
}

// ---- Dựng lời nhắn cho AI ----
function rulesLine(r, unit) {
  const u = (r.lengthUnit || unit) === 'words' ? 'chữ' : 'ký tự';
  return [r.min || r.max ? `Độ dài: ${r.min ? 'tối thiểu ' + r.min : ''}${r.min && r.max ? ', ' : ''}${r.max ? 'tối đa ' + r.max : ''} ${u}.` : '',
    r.slideMin ? `Số slide: ${r.slideMin}–${r.slideMax || r.slideMin}, mỗi slide tối đa ${r.wordsPerSlideMax || 40} chữ.` : '',
    r.hashtagMax != null ? `Hashtag: tối đa ${r.hashtagMax}.` : '', r.requireCta ? 'Bắt buộc có lời kêu gọi hành động ở cuối.' : ''].filter(Boolean).join('\n');
}
function aiSystem(S) {
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
function aiCellText(S, cell, iv, col, context, mock, n) {
  if (AI_REC) { AI_REC.push(cellJob(S, cell, iv, col, context, mock, n)); return null; }
  return takeAiText(`cell:${cell.id}:${n}`);
}
function aiSlotText(S, slot, f, cellText, iv, mock, n) {
  if (AI_REC) { AI_REC.push(slotJob(S, slot, f, cellText, iv, mock, n)); return null; }
  return takeAiText(`slot:${slot.id}:${n}`);
}
// Sửa đoạn, hook, caption bằng AI: lời nhắn (trả lời là chữ hoặc JSON)
function rewriteJob(S, text, op, instruction, ctx) {
  const what = op === 'custom' ? `Yêu cầu: ${instruction}` : `Cách sửa: ${AI_OPS[op] || op}.`;
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]) + '\n\nChỉ trả về đoạn đã sửa, không giải thích, không ngoặc kép bao quanh.', user: `${what}\n\n# Đoạn cần sửa\n${text}` };
}
function hooksJob(S, text, ctx) {
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]), user: `Viết 5 câu mở đầu (hook) thay cho câu đầu của bài dưới đây, mỗi loại một câu: ${Object.entries(HOOK_KINDS).map(([k, v]) => `${k} (${v})`).join(', ')}. Mỗi câu tối đa 20 chữ.\nTrả về JSON: {"hooks": [{"kind": "question", "text": "…"}, …]}\n\n# Bài\n${text}` };
}
function parseHooks(raw) {
  const j = extractJson(raw); const arr = j && Array.isArray(j.hooks) ? j.hooks : [];
  const out = Object.keys(HOOK_KINDS).map(k => { const h = arr.find(x => x && x.kind === k && x.text); return h ? { kind: k, label: HOOK_KINDS[k], text: String(h.text).trim(), simulated: false } : null; }).filter(Boolean);
  return out.length ? { ok: true, hooks: out } : { ok: false, error: 'AI không trả về hook đọc được.' };
}
function captionsJob(S, text, ctx) {
  const tags = snippetsFor(S, ctx || {}, 'hashtag')[0]; const cta = snippetsFor(S, ctx || {}, 'cta')[0];
  return { system: withSkill(S, ctx, aiSystem(S).split('\n\nTrả lời bằng')[0]), user: `Viết 3 phương án caption cho bài dưới đây: ngắn (hook + CTA + hashtag), vừa (thêm 2 câu nội dung), đầy đủ (tới 6 câu). ${cta ? `CTA nên dùng: "${cta.text}".` : ''} ${tags ? `Hashtag: ${tags.text}.` : ''}\nTrả về JSON: {"captions": [{"kind": "short", "text": "…"}, {"kind": "medium", "text": "…"}, {"kind": "long", "text": "…"}]}\n\n# Bài\n${text}` };
}
function parseCaptions(raw) {
  const j = extractJson(raw); const arr = j && Array.isArray(j.captions) ? j.captions : [];
  const L = { short: 'Ngắn', medium: 'Vừa', long: 'Đầy đủ' };
  const out = Object.keys(L).map(k => { const c = arr.find(x => x && x.kind === k && x.text); return c ? { kind: k, label: L[k], text: String(c.text).trim(), simulated: false } : null; }).filter(Boolean);
  return out.length ? { ok: true, captions: out } : { ok: false, error: 'AI không trả về caption đọc được.' };
}

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

// ---------- Chuẩn ảnh theo nền tảng (mục 10.42) ----------
// Mỗi ô ảnh (a.ratio) mang một tỉ lệ lấy từ bảng chuẩn nền tảng; xem, sửa, Gen, xuất đều theo tỉ lệ đó.
const IMG_RATIOS = ['1:1', '4:5', '9:16', '16:9', '1.91:1'];
const RATIO_NUM = { '1:1': 1, '4:5': 0.8, '9:16': 9 / 16, '16:9': 16 / 9, '1.91:1': 1200 / 630 };
const RATIO_CSS = { '1:1': '1 / 1', '4:5': '4 / 5', '9:16': '9 / 16', '16:9': '16 / 9', '1.91:1': '1200 / 630' };
const PLATFORM_IMG_DEFAULT = { facebook: '1:1', instagram: '4:5', threads: '1:1', tiktok: '9:16', youtube: '16:9', blog: '1.91:1' };
// Bảng chuẩn (tham chiếu, theo hướng dẫn công khai của nền tảng; kiểm lại khi nền tảng đổi)
const IMG_STANDARDS = [
  { platform: 'Facebook', use: 'Ảnh đơn trên bảng tin', ratios: ['1:1', '4:5', '1.91:1'], sizes: '1080×1080, 1080×1350, 1200×630', show: 'Hiện trọn ảnh tới 4:5; cao hơn thì cắt còn 4:5' },
  { platform: 'Facebook', use: 'Album nhiều ảnh', ratios: ['1:1', '4:5'], sizes: '1080×1080, 1080×1350', show: 'Bảng tin xếp lưới (cắt ô), mở ra xem trọn ảnh' },
  { platform: 'Facebook, Instagram', use: 'Reels, Story', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình; chừa vùng an toàn trên, dưới cho nút và chữ' },
  { platform: 'Instagram', use: 'Ảnh, carousel trên bảng tin', ratios: ['4:5', '1:1'], sizes: '1080×1350, 1080×1080', show: 'Hiện trọn; carousel lấy tỉ lệ slide đầu cho mọi slide; lưới trang cá nhân cắt 3:4' },
  { platform: 'Threads', use: 'Ảnh kèm bài', ratios: ['1:1', '4:5'], sizes: '1080×1080, 1080×1350', show: 'Hiện trọn ảnh' },
  { platform: 'TikTok', use: 'Video, ảnh bìa', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình; chừa vùng an toàn' },
  { platform: 'YouTube', use: 'Thumbnail, video ngang', ratios: ['16:9'], sizes: '1280×720 (thumbnail), 1920×1080 (video)', show: 'Trọn khung 16:9' },
  { platform: 'YouTube', use: 'Shorts', ratios: ['9:16'], sizes: '1080×1920', show: 'Trọn màn hình' },
  { platform: 'Blog', use: 'Ảnh bìa (chia sẻ, Google)', ratios: ['1.91:1'], sizes: '1200×630', show: 'Hiện trọn ở đầu bài và khi chia sẻ link' },
  { platform: 'Blog', use: 'Ảnh trong bài', ratios: ['16:9'], sizes: 'rộng từ 1200', show: 'Hiện trọn theo bề ngang bài' },
];
// Tỉ lệ ghi rõ trong tên ô ("1080×1080", "9:16", "ngang"…); không ghi thì rỗng
function ratioFromName(name) {
  const n = String(name || '');
  const m = /\[(1:1|4:5|9:16|16:9|1\.91:1)\]/.exec(n); if (m) return m[1];
  if (/9\s*:\s*16|dọc/i.test(n)) return '9:16';
  if (/16\s*:\s*9|1280\s*×\s*720|ngang/i.test(n)) return '16:9';
  if (/1200\s*×\s*630/.test(n)) return '1.91:1';
  if (/1080\s*×\s*1350|4\s*:\s*5/.test(n)) return '4:5';
  if (/1080\s*×\s*1080|vuông|1\s*:\s*1/i.test(n)) return '1:1';
  return '';
}
function imgDefaultRatio(S, channelId) {
  const d = S.settings && S.settings.imgDefaults && S.settings.imgDefaults[channelId]; if (RATIO_NUM[d]) return d;
  const ch = byId(S.channels, channelId); return (ch && PLATFORM_IMG_DEFAULT[channelPlatform(ch)]) || '1:1';
}
// Tỉ lệ của ô ảnh: đã ghi (a.ratio) → ghi trong tên → ảnh trong bài Blog 16:9 → mặc định của kênh
function assetRatioFor(S, slot, a) {
  if (RATIO_NUM[a.ratio]) return a.ratio;
  return ratioFromName(a.name) || (a.blog ? '16:9' : imgDefaultRatio(S, slot.channelId));
}
// Không cần S (giao diện nhỏ lẻ): ô chưa được ghi tỉ lệ thì đoán theo tên
function assetRatioOf(a) { return (a && RATIO_NUM[a.ratio] && a.ratio) || ratioFromName(a && a.name) || '1:1'; }
function stampRatios(S, slot) { (slot.assets || []).forEach(a => { if (!RATIO_NUM[a.ratio]) a.ratio = assetRatioFor(S, slot, a); }); return slot; }
function setAssetRatio(S, slotId, idx, ratio) {
  const s = byId(S.slots, slotId); const a = s && s.assets[idx];
  if (!a) return { ok: false, error: 'Không tìm thấy ô ảnh.' };
  { const e = slotLockMsg(S, s); if (e) return { ok: false, error: e }; }
  if (!RATIO_NUM[ratio]) return { ok: false, error: 'Tỉ lệ không hợp lệ.' };
  if (a.ratio !== ratio) { a.ratio = ratio; log(S, 'ratio-asset', 'slot', slotId, `${a.name} ${ratio}`); }
  return { ok: true };
}
function setImgDefault(S, channelId, ratio) {
  if (!byId(S.channels, channelId)) return { ok: false, error: 'Không tìm thấy kênh.' };
  if (!RATIO_NUM[ratio]) return { ok: false, error: 'Tỉ lệ không hợp lệ.' };
  if (!S.settings.imgDefaults) S.settings.imgDefaults = {};
  S.settings.imgDefaults[channelId] = ratio; log(S, 'update', 'imgDefault', channelId, ratio);
  return { ok: true };
}

// ---- Kích thước thật của ảnh (đọc đầu tệp PNG, JPEG, GIF, WebP) ----
function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b.length >= 30) { // RIFF....WEBP
    const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (t === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (t === 'VP8L') { const n = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: 1 + (n & 0x3fff), h: 1 + ((n >>> 14) & 0x3fff) }; }
    if (t === 'VP8 ') return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}
// Kích thước phiên bản ảnh: w, h đã ghi, hoặc đọc từ đầu tệp (chỉ ảnh, không phải video)
function versionSize(v) {
  if (!v || v.kind === 'video') return null;
  if (v.w > 0 && v.h > 0) return { w: v.w, h: v.h };
  if (!v.src || !/^data:image\//.test(v.src)) return null;
  const i = v.src.indexOf(','); if (i < 0) return null;
  try { const sz = imageSize(b64ToBytes(v.src.slice(i + 1, i + 1 + 120000))); return sz && sz.w > 0 && sz.h > 0 ? sz : null; } catch (e) { return null; }
}
// Lệch tỉ lệ quá 3% so với ô thì coi là sai tỉ lệ
function ratioMismatch(size, ratio) { return !!size && Math.abs(size.w / size.h / RATIO_NUM[ratio] - 1) > 0.03; }
function nearestRatio(size) { let best = '1:1', d = 9; IMG_RATIOS.forEach(r => { const x = Math.abs(Math.log(size.w / size.h / RATIO_NUM[r])); if (x < d) { d = x; best = r; } }); return best; }
// Mỗi ô ảnh của slot: ảnh đang dùng có sai tỉ lệ hoặc nhỏ hơn chuẩn không
function imageIssues(S, slot) {
  const out = [];
  (slot.assets || []).forEach((a, i) => {
    const v = a.versions.find(x => x.n === a.current); const sz = versionSize(v); if (!sz) return;
    const r = assetRatioFor(S, slot, a); const std = FRAME_RATIOS[r];
    if (ratioMismatch(sz, r)) out.push({ i, name: a.name, kind: 'ratio', ratio: r, size: sz, text: `Ảnh “${a.name}” là ${sz.w}×${sz.h}, ô cần ${r} (${std[0]}×${std[1]}). Nền tảng sẽ cắt ảnh; bấm Cắt về ${r}.` });
    else if (std && sz.w < std[0] * 0.9) out.push({ i, name: a.name, kind: 'small', ratio: r, size: sz, text: `Ảnh “${a.name}” rộng ${sz.w}px, chuẩn ${r} là ${std[0]}px; ảnh có thể bị mờ.` });
  });
  return out;
}
function imageInfoOf(S, slot, a) {
  const v = a.versions.find(x => x.n === a.current); const sz = versionSize(v); const r = assetRatioFor(S, slot, a); const std = FRAME_RATIOS[r] || [0, 0];
  return { ratio: r, standard: `${std[0]}×${std[1]}`, width: sz ? sz.w : null, height: sz ? sz.h : null, ok: sz ? !ratioMismatch(sz, r) : null };
}
// Hình mô phỏng theo tỉ lệ ô: dùng chung cho giao diện (viewBox) và tệp SVG xuất ra
function mockArt(seed, ratio) {
  const r = RATIO_NUM[ratio] || 1.5, W = 120, H = Math.round(W / r * 100) / 100;
  const h = seed % 360, h2 = (h + 50) % 360, k = Math.min(W, H) / 80;
  const rad = Math.min((18 + seed % 30) * k, W * 0.4), cx = W * (0.25 + (seed % 60) / 120), cy = H * (0.35 + (seed % 20) / 80);
  const num = x => Math.round(x * 100) / 100;
  return { W, H, inner: `<rect width="${W}" height="${H}" fill="hsl(${h} 45% 82%)"/><circle cx="${num(cx)}" cy="${num(cy)}" r="${num(rad)}" fill="hsl(${h2} 50% 62%)"/><rect x="0" y="${num(H * 0.725)}" width="${W}" height="${num(H * 0.275)}" fill="hsl(${h} 35% 55%)"/>` };
}

// ---------- 05r · Skill (bộ chỉ dẫn) gắn riêng cho từng Cột và từng Format (mục 10.49) ----------
// Mỗi Cột/Format có danh sách `skills` [{id, name, version, body, note, updatedAt, history}] và `activeSkillId`.
// Tại thời điểm gen chỉ dùng đúng một Skill (đang chọn). Không chọn: dùng hướng dẫn cũ (guideMd). Quy tắc cứng luôn thắng Skill.
const SKILL_KEEP = 5, SKILL_WARN_CHARS = 6000;
const skillsOf = o => (o && Array.isArray(o.skills)) ? o.skills : [];
function activeSkill(o) { const id = o && o.activeSkillId; return id ? skillsOf(o).find(s => s.id === id) || null : null; }
function skillRefOf(o) { const s = activeSkill(o); return s ? { id: s.id, name: s.name, version: s.version } : null; }
const skillTag = o => { const r = skillRefOf(o); return r ? { skill: r } : {}; };
function skillWarnings(body) {
  const w = []; const t = String(body || '');
  if (t.length > SKILL_WARN_CHARS) w.push(`Skill dài ${t.length} ký tự (> ${SKILL_WARN_CHARS}): tốn phí và dễ loãng; nên rút gọn.`);
  const ex = (t.match(/<example>/g) || []).length;
  if (t.trim() && !ex) w.push('Chưa có bài mẫu (<example>…</example>): nên có 3–5 bài mẫu khác nhau.');
  else if (ex && ex < 3) w.push(`Mới ${ex} bài mẫu; nên 3–5 bài, đa dạng.`);
  if (ex > 5) w.push(`Có ${ex} bài mẫu; quá nhiều dễ khiến AI chép lại.`);
  return w;
}
function addSkill(S, o, { name, body, note } = {}) {
  const nm = String(name || '').trim(); if (!nm) return { ok: false, error: 'Skill cần có tên.' };
  if (!String(body || '').trim()) return { ok: false, error: 'Nội dung Skill đang trống.' };
  o.skills = skillsOf(o).slice();
  let k = o.skills.length + 1; while (o.skills.some(s => s.id === `sk-${k}`)) k++;
  const s = { id: `sk-${k}`, name: nm, version: 1, body: String(body), note: String(note || ''), updatedAt: S.settings.demoNow || '', history: [] };
  o.skills.push(s); if (!o.activeSkillId) o.activeSkillId = s.id;
  return { ok: true, skill: s };
}
// Sửa Skill: tăng version, giữ SKILL_KEEP bản cũ
function updateSkill(S, o, id, { name, body, note } = {}) {
  const s = skillsOf(o).find(x => x.id === id); if (!s) return { ok: false, error: 'Không thấy Skill.' };
  const nm = name == null ? s.name : String(name).trim(); if (!nm) return { ok: false, error: 'Skill cần có tên.' };
  const nb = body == null ? s.body : String(body); if (!nb.trim()) return { ok: false, error: 'Nội dung Skill đang trống.' };
  if (nb !== s.body) {
    s.history = [{ version: s.version, name: s.name, body: s.body, note: s.note, updatedAt: s.updatedAt }].concat(s.history || []).slice(0, SKILL_KEEP);
    s.version += 1;
  }
  s.name = nm; s.body = nb; if (note != null) s.note = String(note); s.updatedAt = S.settings.demoNow || s.updatedAt;
  return { ok: true, skill: s };
}
function restoreSkill(S, o, id, version) {
  const s = skillsOf(o).find(x => x.id === id); const h = s && (s.history || []).find(x => x.version === version);
  if (!h) return { ok: false, error: 'Không thấy bản cũ.' };
  return updateSkill(S, o, id, { name: h.name, body: h.body, note: h.note });
}
function setActiveSkill(o, id) {
  if (id && !skillsOf(o).some(s => s.id === id)) return { ok: false, error: 'Không thấy Skill.' };
  o.activeSkillId = id || ''; return { ok: true };
}
function deleteSkill(o, id) {
  o.skills = skillsOf(o).filter(s => s.id !== id); if (o.activeSkillId === id) o.activeSkillId = '';
  return { ok: true };
}
// Chủ của Skill khi sửa đoạn/hook/caption: slot → Format của slot; ô → Cột của ô
function skillOwnerOf(S, ctx) {
  if (!ctx) return null;
  if (ctx.slotId) { const s = byId(S.slots, ctx.slotId); return s ? byId(S.formats, s.formatId) : null; }
  return ctx.columnId ? byId(S.columns, ctx.columnId) : null;
}
const skillBlock = (o, title) => { const s = activeSkill(o); return s ? `# ${title} (Skill "${s.name}" v${s.version}; nếu mâu thuẫn quy tắc cứng về độ dài, CTA, từ cấm thì quy tắc cứng thắng)\n${s.body.trim()}` : ''; };

// ---------- 06a · Tệp Topic demo (mô phỏng, như agent bên ngoài chuẩn bị; mọi số liệu là số kiểm thử) ----------
// Mỗi Topic khoảng 2.000 chữ (mục 7.2). T3 · Topic 3 cố ý không có "### Trường hợp" (D100).

const T1_TOPIC_1_V1 = `## Học quá nhiều một lúc nên bỏ dở
Thông điệp chính: Kế hoạch quá nặng là lý do chính khiến người đi làm bỏ khóa học.
Đối tượng: Người đi làm từng bỏ dở khóa tiếng Anh.
Góc nhìn: Bỏ dở không phải vì lười mà vì kế hoạch không vừa sức sau giờ làm.

### Số liệu và phát hiện
Nhiều người đi làm đăng ký khóa học trực tuyến nhưng không duy trì qua tháng đầu. Theo Trung tâm Dữ liệu Giáo dục (mô phỏng): 41% người đi làm từng bỏ dở khóa học trực tuyến trong tháng đầu. Phần lớn người học bắt đầu rất tích cực trong tuần đầu, rồi lịch học thưa dần khi công việc dồn lại.

Con số bốn mươi mốt phần trăm nói trên đến từ một cuộc khảo sát trực tuyến dành cho người đang đi làm toàn thời gian, phần đông là nhân viên văn phòng, kỹ sư, kế toán và người làm kinh doanh ở các thành phố lớn. Người trả lời được hỏi họ đã từng đăng ký những khóa học nào trong vài năm gần đây, học được bao lâu thì dừng, và điều gì xảy ra ngay trước lúc họ dừng. Nói cách khác, cứ khoảng mười người thì có hơn bốn người từng bỏ ngang một khóa học ngay trong tháng đầu tiên, khi khóa học mới chỉ đi được một đoạn ngắn.

Điều đáng chú ý không nằm ở việc người ta bỏ, mà ở hình dạng của quá trình bỏ. Nhóm nghiên cứu mô tả một đường cong khá giống nhau ở nhiều người: tuần đầu học dày, có người học gần như mỗi tối và còn học thêm vào cuối tuần; tuần thứ hai bắt đầu có buổi lỡ; sang tuần thứ ba thì khoảng cách giữa các buổi dài ra, và đến cuối tháng thì khóa học nằm im trong ứng dụng. Ít ai bỏ vì một quyết định rõ ràng kiểu hôm nay mình thôi không học nữa. Phần lớn chỉ trôi dần ra xa cho đến khi quay lại trở thành một việc quá nặng nề.

Khảo sát cũng ghi nhận rằng người bỏ dở không phải là người thiếu động lực ban đầu. Ngược lại, nhiều người trong nhóm này lại là những người đặt mục tiêu tham vọng nhất lúc đăng ký: học một tiếng mỗi tối, hoàn thành cả khóa trong sáu tuần, hay học thêm từ vựng vào giờ nghỉ trưa. Nhóm duy trì được lâu hơn thường đặt mục tiêu khiêm tốn đến mức chính họ cũng thấy hơi ngại khi nói ra. Phát hiện này gợi ý rằng sự hăng hái lúc đầu, nếu biến thành một kế hoạch quá dày, có thể trở thành gánh nặng ở những tuần sau.

Cần đọc các con số này với sự thận trọng. Đây là dữ liệu tự khai, phản ánh cách người học nhớ và kể lại trải nghiệm của mình, chứ không phải nhật ký học được ghi tự động. Dù vậy, hình mẫu học dày rồi thưa dần xuất hiện đủ thường xuyên để trở thành điểm xuất phát hữu ích cho người đang muốn học lại.

Khi được hỏi điều gì sẽ giúp họ học tiếp, nhóm từng bỏ dở ít khi nhắc đến giáo trình hay giáo viên. Câu trả lời lặp lại nhiều nhất xoay quanh thời gian và sức lực: giá như mỗi buổi ngắn hơn, giá như lỡ một buổi thì không bị tụt lại quá xa, giá như có cách quay lại mà không phải học bù. Những mong muốn này cho thấy nội dung khóa học chưa hẳn là vấn đề chính; vấn đề nằm ở cách người học tự xếp khóa học vào cuộc sống của mình.

### Vì sao
Nhóm bỏ dở thường nêu cùng một lý do: kế hoạch ban đầu đặt quá nặng so với quỹ thời gian thực tế sau giờ làm. Khi lỡ một buổi, họ cảm thấy nợ bài và càng ngại quay lại.

Khi lập kế hoạch, người ta thường hình dung một buổi tối lý tưởng: về nhà đúng giờ, ăn tối xong là ngồi vào bàn, đầu óc còn minh mẫn. Nhưng tuần làm việc thật hiếm khi như vậy. Có tối phải ở lại công ty chốt báo cáo, có tối con ốm, có tối chỉ đơn giản là quá mệt sau một ngày họp liên tục. Một kế hoạch dựa trên buổi tối lý tưởng sẽ vỡ ngay ở buổi tối không lý tưởng đầu tiên.

Cảm giác nợ bài là mắt xích quan trọng nhất. Nếu mục tiêu là một tiếng mỗi tối, thì lỡ một tối nghĩa là đang thiếu một tiếng, lỡ ba tối là thiếu ba tiếng. Khoản nợ đó lớn dần trong đầu người học, và mỗi lần mở ứng dụng ra, họ không thấy một buổi học mới mà thấy cả đống việc còn tồn. Để tránh cảm giác khó chịu ấy, cách dễ nhất là không mở ứng dụng nữa. Đó là lý do nhiều người tưởng mình lười, trong khi thực ra họ đang né một cảm giác thất bại do chính kế hoạch tạo ra.

Thử hình dung một chuyên viên dự án tên Hùng. Anh đặt mục tiêu học bốn mươi lăm phút mỗi tối trong khóa tiếng Anh giao tiếp. Tuần đầu anh làm được. Tuần thứ hai, dự án vào giai đoạn bàn giao, anh về nhà lúc chín giờ tối và bỏ hai buổi liền. Cuối tuần anh định học bù, nhưng nghĩ đến việc phải ngồi gần hai tiếng thì lại thôi. Sang tuần thứ ba, anh không còn nhớ mình đang học đến bài nào. Không có lúc nào anh quyết định bỏ, nhưng kết quả vẫn là bỏ.

Một kế hoạch vừa sức hoạt động theo chiều ngược lại. Khi mục tiêu chỉ là nói hai câu, lỡ một tối cũng chẳng tạo ra khoản nợ đáng kể nào, và quay lại chỉ tốn một phút. Người học ít phải dùng ý chí hơn, nên nguồn ý chí vốn đã cạn sau giờ làm được dành cho công việc và gia đình. Nhịp đều được giữ không nhờ sự cố gắng phi thường mà nhờ việc mỗi buổi học quá nhỏ để có lý do né tránh.

Còn một lý do ít được nói ra: kế hoạch nặng khiến người học đo thành công bằng việc hoàn thành bài, chứ không phải bằng việc dùng được tiếng Anh. Khi tiêu chí là xong đủ bốn mươi lăm phút, một buổi chỉ học được mười phút bị coi là thất bại, dù mười phút ấy có thể đã giúp người học nói trôi chảy hơn một chút. Đổi tiêu chí sang một hành động nhỏ, dễ thấy, như nói thành tiếng vài câu về ngày làm việc, giúp người học nhận ra mình đang tiến lên thay vì chỉ thấy mình đang thiếu.

### Cách làm
- Đặt mục tiêu nhỏ đến mức không thể bỏ, ví dụ nói to hai câu mỗi tối.
- Gắn buổi học vào một thói quen có sẵn trong ngày.
- Đánh dấu một ô trên lịch sau mỗi lần luyện.

Khi chọn mục tiêu nhỏ, hãy tự hỏi: vào tối tệ nhất trong tuần, mình có làm được việc này không? Nếu câu trả lời là không, mục tiêu vẫn còn quá lớn. Hai câu nói to về ngày làm việc là một điểm khởi đầu tốt, vì nó không cần sách vở, không cần mạng, và chỉ mất chưa đến một phút. Bạn có thể bắt đầu bằng những câu rất quen như "Today I had a long meeting." (Hôm nay mình có một cuộc họp dài.) hoặc "I sent an email to the client." (Mình đã gửi email cho khách hàng.). Vào những tối còn sức, cứ nói thêm, nhưng mục tiêu ghi trên giấy vẫn chỉ là hai câu.

Việc gắn buổi học vào thói quen có sẵn giúp bạn không phải nhớ hay tự nhắc. Hãy chọn một việc bạn làm gần như mỗi tối mà không cần suy nghĩ, chẳng hạn đánh răng, rửa bát hay cắm sạc điện thoại. Rồi đặt quy tắc thật cụ thể: sau khi cắm sạc điện thoại, mình nói hai câu tiếng Anh về ngày hôm nay. Quy tắc càng rõ, càng ít chỗ cho sự lưỡng lự.

Ô đánh dấu trên lịch có tác dụng hơn vẻ ngoài của nó. Nhìn thấy một chuỗi ô liền nhau tạo ra cảm giác muốn giữ chuỗi, và ngay cả khi chuỗi bị đứt, bạn vẫn thấy rõ mình đã làm được bao nhiêu ngày. Nên dùng lịch giấy treo ở chỗ dễ thấy, hoặc một ứng dụng ghi chú đơn giản, thay vì phải mở một ứng dụng học phức tạp chỉ để đánh dấu.

Một lưu ý khi áp dụng: đừng vội tăng mục tiêu sau vài ngày suôn sẻ. Nhiều người thấy tuần đầu dễ quá nên nâng lên mười câu, rồi lặp lại đúng vòng quá tải cũ. Hãy giữ mức hai câu ít nhất vài tuần, cho đến khi việc nói trở thành thứ bạn làm mà không cần cân nhắc. Khi muốn nâng, chỉ thêm một câu, chẳng hạn một câu nói về việc ngày mai như "Tomorrow I will check the budget." (Ngày mai mình sẽ kiểm tra ngân sách.).

Nếu bạn từng bỏ dở và đang ngại bắt đầu lại, đừng mở lại khóa học cũ ở đúng chỗ mình dừng. Việc phải học tiếp từ giữa chừng dễ gợi lại cảm giác nợ bài. Hãy coi đây là một khởi đầu mới với mục tiêu mới, nhỏ hơn hẳn, và chỉ quay lại giáo trình cũ khi thói quen nói mỗi tối đã đứng vững. Tối đầu tiên, có thể chỉ cần nói "I am starting again today." (Hôm nay mình bắt đầu lại.) là đủ.

### Ngộ nhận thường gặp
Ngộ nhận: Muốn giỏi nhanh thì phải học thật nhiều mỗi ngày. Thực tế: Kế hoạch quá nặng là lý do phổ biến nhất khiến người đi làm bỏ dở trong tháng đầu.

Suy nghĩ này nghe rất hợp lý, vì ai cũng hiểu rằng học nhiều thì tiến bộ nhiều. Vấn đề là nó chỉ đúng khi người học duy trì được khối lượng ấy. Với người đi làm, thời gian và sức lực buổi tối không cố định, nên một kế hoạch dày thường không kéo dài quá vài tuần. Tổng số giờ học thực tế của người đặt mục tiêu lớn rồi bỏ giữa chừng có khi còn ít hơn người đặt mục tiêu nhỏ nhưng giữ được nhiều tháng.

Ngoài ra, giỏi nhanh là một kỳ vọng dễ gây thất vọng. Khả năng nói tiếng Anh trong công việc lớn lên qua rất nhiều lần nói ngắn, lặp đi lặp lại, chứ hiếm khi qua vài buổi học dồn. Đặt kỳ vọng vào nhịp đều thay vì tốc độ giúp người học ít tự trách hơn và dễ quay lại hơn sau những tuần bận rộn.

### Trường hợp
Anh Tuấn, kỹ sư ba mươi tư tuổi, từng đăng ký ba khóa học và đều bỏ ở tuần thứ ba. Lần này anh chỉ đặt mục tiêu nói hai câu mỗi tối về công việc trong ngày. Sau một tháng, anh vẫn giữ được nhịp và bắt đầu dám nói vài câu trong cuộc họp ngắn với đồng nghiệp nước ngoài.

Ba lần bỏ dở trước đó của anh đều bắt đầu giống nhau: anh mua khóa học, lập bảng kế hoạch chi tiết đến từng buổi, và học rất hăng trong tuần đầu. Lần này anh gắn việc nói hai câu vào lúc tắt máy tính cuối ngày, vẫn ngồi ở bàn làm việc. Có những tối anh chỉ nói đúng hai câu ngắn như "I fixed a bug in the login page." (Mình đã sửa một lỗi ở trang đăng nhập.). Anh kể rằng điều thay đổi lớn nhất là anh không còn thấy sợ khi mở lại việc học sau một tối bận.

### Câu hỏi luyện tập
Câu hỏi: Câu nào phù hợp để kể việc bạn làm hôm nay? Đáp án: "Today I finished the weekly report."
`;

const T1_TOPIC_1_V2 = `## Học ít mà đều thắng học nhiều mà bỏ
Thông điệp chính: Mỗi ngày một bài luyện nói ngắn thay vì một buổi dài cuối tuần.
Đối tượng: Người đi làm bận rộn muốn học lại tiếng Anh.
Góc nhìn: Tháng đầu là lúc dễ bỏ nhất; nhịp đều quan trọng hơn khối lượng.

### Số liệu và phát hiện
Nhiều người đi làm đăng ký khóa học trực tuyến nhưng không duy trì qua tháng đầu. Theo Trung tâm Dữ liệu Giáo dục (mô phỏng): 41% người đi làm từng bỏ dở khóa học trực tuyến trong tháng đầu. Hai nhóm người học được theo dõi trong nhiều tuần với cùng nội dung: nhóm luyện nói vài phút mỗi ngày giữ được thói quen đều đặn hơn và ít bỏ buổi hơn nhóm học dồn cuối tuần.

Tỷ lệ bốn mươi mốt phần trăm cho thấy tháng đầu là giai đoạn mong manh nhất của bất kỳ kế hoạch học nào. Đây là quãng thời gian thói quen chưa hình thành, mọi buổi học vẫn còn phải dựa vào ý chí, và chỉ cần vài tuần công việc dồn dập là kế hoạch bị đẩy sang một bên. Vì thế, câu hỏi hữu ích nhất cho người muốn học lại không phải là học gì, mà là làm sao đi qua được tháng đầu.

Trong phần theo dõi hai nhóm, người tham gia được chia theo cách họ muốn sắp xếp thời gian. Một nhóm chọn luyện nói ngắn vào một thời điểm cố định mỗi ngày, thường là buổi tối hoặc sáng sớm. Nhóm còn lại gom cùng lượng thời gian ấy vào một buổi dài, phần lớn rơi vào sáng hoặc chiều Chủ Nhật. Nội dung bài học của hai nhóm giống nhau, chỉ khác cách chia nhỏ.

Khác biệt rõ nhất xuất hiện ở số buổi bị lỡ. Nhóm học dồn cuối tuần chỉ có một cơ hội mỗi tuần, nên khi buổi đó bị chiếm bởi đám cưới, việc nhà hay một chuyến về quê, họ mất trọn một tuần. Hai lần như vậy liên tiếp là đủ để nhiều người cảm thấy mình đã rời khỏi khóa học. Nhóm luyện mỗi ngày cũng lỡ buổi, nhưng một buổi lỡ chỉ là một ngày trống giữa nhiều ngày có học, và hôm sau họ đã có dịp làm lại.

Người tham gia ở nhóm luyện mỗi ngày còn kể một điều thú vị: sau vài tuần, việc mở miệng nói tiếng Anh vào giờ quen thuộc bắt đầu diễn ra gần như tự động, giống việc đánh răng. Nhóm học dồn hiếm khi mô tả cảm giác này, vì mỗi buổi học của họ cách nhau cả tuần, đủ lâu để mỗi lần bắt đầu lại phải khởi động từ đầu. Các ghi nhận này dựa trên lời kể của người học, nên nên được xem là gợi ý về xu hướng hơn là kết luận cho mọi người.

Một chi tiết nhỏ khác trong phần theo dõi cũng đáng nhắc: những người ở nhóm luyện mỗi ngày, khi lỡ buổi, thường quay lại ngay trong vòng một hai ngày. Ở nhóm học dồn, khoảng cách giữa buổi lỡ và buổi quay lại thường dài hơn nhiều, có người phải mất vài tuần mới mở lại bài. Nói cách khác, sự khác biệt không chỉ nằm ở việc ai bỏ ít hơn, mà còn ở việc ai quay lại nhanh hơn sau khi bị gián đoạn.

### Vì sao
Dù tổng số giờ học tương đương, độ đều quan trọng hơn độ dài của từng buổi, đặc biệt ở giai đoạn hình thành thói quen. Kế hoạch quá nặng làm người học thấy nợ bài sau mỗi buổi lỡ.

Thói quen hình thành qua sự lặp lại trong cùng một bối cảnh. Khi bạn luyện nói vào cùng một giờ, sau cùng một việc, mỗi ngày, bối cảnh đó dần trở thành tín hiệu nhắc bạn bắt đầu. Một buổi học mỗi tuần không có đủ số lần lặp để tạo ra tín hiệu như vậy, nên mỗi lần học vẫn là một quyết định riêng cần đến sức cố gắng.

Kỹ năng nói cũng hưởng lợi từ việc gặp lại thường xuyên. Một mẫu câu được nói ra hôm nay, rồi nói lại vào ngày mai và ngày kia, sẽ trôi chảy hơn hẳn so với việc nói hai mươi lần trong một buổi rồi để đó cả tuần. Người học dồn thường nhận ra rằng đến Chủ Nhật tuần sau, phần lớn những gì họ luyện đã mờ đi, và họ phải dành một nửa buổi để ôn lại.

Buổi dài cuối tuần còn có một điểm yếu khác: nó đặt quá nhiều kỳ vọng vào một khoảng thời gian duy nhất. Khi buổi đó diễn ra không như ý, chẳng hạn bị con gọi giữa chừng hay chỉ ngồi được nửa tiếng, người học cảm thấy cả tuần coi như hỏng. Ngược lại, với buổi ngắn mỗi ngày, một buổi không trọn vẹn chỉ là chuyện nhỏ, vì ngày mai lại có cơ hội khác.

Hãy nghĩ đến một trưởng nhóm bán hàng tên Quân. Anh định học hai tiếng mỗi sáng thứ Bảy. Tuần đầu ổn, tuần thứ hai công ty tổ chức đi dã ngoại, tuần thứ ba anh phải gặp khách. Đến tuần thứ tư, anh mở lại bài và thấy lạ lẫm như mới học. Nếu cùng tháng đó anh dành vài phút mỗi tối để nói về khách hàng mình gặp trong ngày, anh có thể đã có hàng chục lần luyện nói thay vì một lần.

Cuối cùng là chuyện cảm xúc. Nhịp đều mang lại một chuỗi thành công nhỏ, mỗi ngày một lần, và chính những thành công nhỏ ấy nuôi động lực cho ngày hôm sau. Học dồn chỉ cho một cảm giác hoàn thành mỗi tuần, quá thưa để giữ được hứng thú khi công việc bắt đầu bận.

Với người đi làm bận rộn, điều này càng rõ. Lịch làm việc thay đổi theo tuần, theo dự án, theo mùa cao điểm. Một kế hoạch chỉ dựa vào một khung giờ duy nhất trong tuần rất dễ bị công việc nuốt mất. Trong khi đó, vài phút mỗi ngày gần như luôn tìm được chỗ, kể cả trong tuần bận nhất, vì nó đủ nhỏ để chen vào giữa những việc khác.

### Cách làm
- Chọn một việc bạn đã làm mỗi tối, ví dụ pha cà phê.
- Ngay sau việc đó, luyện nói một bài ngắn.
- Ghi lại số ngày liên tiếp bạn giữ được.
- Nếu lỡ một ngày, hôm sau chỉ cần nói một câu để nối lại nhịp.

Việc làm mốc nên là thứ diễn ra đều đặn kể cả vào những ngày bận nhất, nên hãy tránh chọn những việc thất thường như đi tập thể dục hay nấu ăn. Pha cà phê, tắm xong, hay ngồi xuống ghế sofa sau bữa tối đều là mốc tốt. Hãy nói thành lời quy tắc của mình một lần cho rõ, ví dụ: cứ pha xong cà phê tối là mình luyện nói, rồi dán một tờ giấy nhỏ cạnh máy pha để nhắc trong những tuần đầu.

Bài nói ngắn không cần phức tạp. Một khung đơn giản gồm ba ý thường là đủ: hôm nay mình đã làm gì, có gì khó, và ngày mai sẽ làm gì. Bạn có thể dùng những câu như "This morning I joined a call with our supplier." (Sáng nay mình tham gia cuộc gọi với nhà cung cấp.), "The hardest part was the price discussion." (Phần khó nhất là bàn về giá.) và "Tomorrow I need to send the contract." (Ngày mai mình cần gửi hợp đồng.). Nói to, nói chậm, không cần dừng lại sửa từng lỗi.

Khi ghi số ngày liên tiếp, hãy viết ở nơi bạn thấy mỗi ngày, chẳng hạn trên màn hình khóa điện thoại hoặc một tờ giấy dán tủ lạnh. Con số này không phải để khoe hay tự ép mình, mà để bạn thấy nhịp của mình rõ ràng. Nhiều người nhận ra rằng chỉ riêng việc không muốn con số quay về con số không đã đủ để họ nói vài câu vào những tối lười biếng.

Bước cuối cùng là bước quan trọng nhất cho tháng đầu. Khi lỡ một ngày, phản xạ thường gặp là muốn học bù gấp đôi, và chính phản xạ đó dẫn đến cảm giác nợ bài. Thay vào đó, hôm sau chỉ cần một câu như "I am back today." (Hôm nay mình quay lại rồi.) là nhịp đã được nối. Một ngày lỡ không làm hỏng thói quen; hai ngày lỡ liền nhau mới là lúc cần cảnh giác, nên ưu tiên không để khoảng trống kéo dài.

Trong hai tuần đầu, hãy giữ bài nói ở mức rất ngắn, chừng vài phút, dù bạn thấy mình còn có thể nói lâu hơn. Mục đích của giai đoạn này là dựng nhịp, không phải luyện cho thật nhiều. Khi nhịp đã ổn, bạn có thể thêm một chút độ khó, chẳng hạn kể lại một cuộc trao đổi với đồng nghiệp hoặc tập nói câu hỏi lại như "Sorry, which file do you mean?" (Xin lỗi, anh đang nói đến tệp nào?). Những câu ngắn dùng được ngay trong công việc thường mang lại cảm giác tiến bộ rõ nhất.

### Ngộ nhận thường gặp
Ngộ nhận: Học dồn một buổi dài cuối tuần cũng hiệu quả như học ít mỗi ngày. Thực tế: Với cùng tổng thời gian, nhóm luyện ngắn mỗi ngày giữ thói quen tốt hơn và ít bỏ buổi hơn.

Lối nghĩ này xuất phát từ cách tính giờ đơn giản: nếu tổng thời gian bằng nhau thì kết quả cũng phải bằng nhau. Nhưng học nói không giống đổ nước vào bình. Điều quyết định là bạn có tiếp tục học qua tháng đầu hay không, và khả năng nói được củng cố qua bao nhiêu lần gặp lại. Ở cả hai điểm này, buổi ngắn mỗi ngày đều có lợi thế.

Điều này không có nghĩa là buổi dài cuối tuần vô ích. Nếu bạn đã có thói quen luyện nói mỗi ngày, một buổi dài hơn vào cuối tuần để xem phim, đọc bài hoặc ôn lại có thể là phần bổ sung tốt. Vấn đề chỉ nảy sinh khi buổi dài ấy là cơ hội duy nhất trong tuần, vì khi đó mỗi lần lỡ đều quá đắt.

Một số người cũng lo rằng vài phút mỗi ngày là quá ít để tạo ra thay đổi. Thực ra, giá trị của những buổi ngắn nằm ở chỗ chúng cộng dồn qua nhiều tuần và nhiều tháng. Người học đều đặn có thể không thấy khác biệt sau vài ngày, nhưng khi nhìn lại sau một mùa làm việc, họ thường nhận ra mình đã quen miệng với nhiều mẫu câu hơn hẳn.

### Trường hợp
Chị Hà, kế toán ba mươi hai tuổi, từng học ba tiếng mỗi Chủ Nhật nhưng hay lỡ hẹn vì việc nhà. Chị chuyển sang luyện nói ngắn mỗi tối sau bữa cơm. Lần đầu tiên chị học qua được tháng thứ hai và tự tin hỏi lại sếp bằng tiếng Anh khi chưa nghe rõ.

Chị kể rằng những Chủ Nhật trước kia thường bị chiếm bởi giỗ chạp, đưa con đi học thêm hay dọn nhà, và mỗi lần lỡ chị lại tự hứa sẽ học bù vào tuần sau. Khi đổi cách, chị chọn lúc rửa bát xong làm mốc và nói vài câu về công việc kế toán trong ngày, như "I checked the invoices from three suppliers." (Mình đã kiểm tra hóa đơn của ba nhà cung cấp.). Có những tối chị chỉ nói một câu, nhưng con số ngày liên tiếp trên tủ lạnh vẫn tăng đều.

Lần chị hỏi lại sếp trong cuộc họp, chị dùng đúng mẫu câu đã nói đi nói lại suốt nhiều tối, nên nó bật ra khá tự nhiên. Chị nói điều khiến chị bất ngờ không phải là câu tiếng Anh, mà là việc chị không phải đắn đo trước khi nói.

### Câu hỏi luyện tập
Câu hỏi: Khi chưa nghe rõ trong cuộc họp, bạn nói câu nào? Đáp án: "Could you say that again, please?"
`;

const T1_TOPIC_2 = `## Sau giờ làm, não cần bài tập nhẹ
Thông điệp chính: Khi đã mệt, chọn bài nói to thay vì đọc ngữ pháp.
Đối tượng: Người đi làm chỉ có thời gian buổi tối.
Góc nhìn: Buổi tối khả năng tập trung giảm mạnh, nên bài học phải ngắn và chủ động.

### Số liệu và phát hiện
Khả năng tập trung giảm rõ vào buổi tối sau một ngày làm việc. Theo Tạp chí Tâm lý Lao động (mô phỏng): Sau 18 giờ, thời gian tập trung trung bình giảm còn khoảng 12 phút. Một khảo sát khác cho thấy lý do chính khiến người đi làm học lại tiếng Anh là nhu cầu cụ thể trong công việc. Theo Bản tin Nhân sự Việt (mô phỏng): 3 trên 5 người đi làm học tiếng Anh vì phải họp với đối tác.

Nghiên cứu của tạp chí được thực hiện với nhân viên văn phòng làm việc theo giờ hành chính, phần lớn ngồi máy tính cả ngày và tham gia nhiều cuộc họp. Người tham gia được yêu cầu làm những bài kiểm tra chú ý ngắn ở các thời điểm khác nhau: đầu giờ sáng, sau bữa trưa, cuối giờ chiều và buổi tối. Mỗi lần, nhóm nghiên cứu ghi lại người tham gia giữ được sự chú ý trong bao lâu trước khi bắt đầu mắc lỗi hoặc tự nhận là bị phân tâm.

Kết quả cho thấy sau sáu giờ tối, khoảng thời gian tập trung trung bình chỉ còn chừng mười hai phút. Con số này không có nghĩa là sau mười hai phút người học không thể học gì nữa, mà là sau mốc đó, chất lượng chú ý bắt đầu đi xuống nhanh, đầu óc dễ trôi sang chuyện khác và việc ghi nhớ kém đi. Những người có nhiều cuộc họp trong ngày, hoặc phải xử lý nhiều việc gấp, thường có khoảng tập trung buổi tối ngắn hơn mức trung bình.

Khảo sát của bản tin nhân sự bổ sung một góc nhìn khác: động lực học. Cứ năm người đi làm học lại tiếng Anh thì có ba người làm vậy vì phải họp với đối tác. Họ không học để thi lấy chứng chỉ hay để đọc sách văn học, mà để nghe hiểu và trả lời được trong những cuộc họp có thật. Nhiều người trong nhóm này cho biết nỗi lo lớn nhất của họ là im lặng khi được hỏi, chứ không phải viết sai chính tả.

Đặt hai phát hiện cạnh nhau, ta thấy một mâu thuẫn quen thuộc. Người đi làm cần kỹ năng nói cho công việc, nhưng thời gian họ có để luyện lại rơi vào buổi tối, lúc sức tập trung thấp nhất trong ngày. Nhiều người giải quyết mâu thuẫn này bằng cách chọn bài học nhẹ nhàng nhất mà họ nghĩ ra được, thường là đọc lại sách ngữ pháp hoặc xem lướt danh sách từ vựng. Khảo sát ghi nhận rằng đây cũng chính là nhóm hay kể về việc ngủ gật hoặc học mà không nhớ gì.

Cũng cần lưu ý rằng các con số trên là mức trung bình của một nhóm người cụ thể. Mỗi người có nhịp sinh học và khối lượng công việc khác nhau; có người vẫn khá tỉnh táo lúc chín giờ tối, có người đã kiệt sức từ lúc rời văn phòng. Điều đáng giữ lại là xu hướng chung: buổi tối không phải là lúc phù hợp cho những bài học dài và thụ động.

Một điểm thú vị khác là khi được hỏi họ thường học gì vào buổi tối, đa số người trả lời chọn hoạt động đọc hoặc nghe thụ động, còn số người chọn nói thành tiếng khá ít. Lý do họ đưa ra thường là ngại làm ồn trong nhà, sợ người thân nghe thấy, hoặc nghĩ rằng nói to chỉ dành cho người đã giỏi. Những lý do này đều có thể xử lý được bằng cách chọn chỗ đứng riêng và nói nhỏ vừa đủ nghe.

### Vì sao
Nghiên cứu đo khả năng tập trung của nhân viên văn phòng ở nhiều thời điểm trong ngày. Chất lượng chú ý đi xuống rõ rệt vào buổi tối, nhất là với người vừa trải qua một ngày họp liên tục. Hoạt động chủ động như nói to và lặp lại giữ người học tỉnh táo lâu hơn đọc thụ động.

Sự chú ý giống như một nguồn năng lượng bị tiêu dần trong ngày. Mỗi email phải trả lời, mỗi quyết định phải đưa ra, mỗi cuộc họp phải theo dõi đều lấy đi một phần. Đến tối, phần còn lại không nhiều, và não có xu hướng tìm cách tiết kiệm bằng việc giảm mức tỉnh táo. Khi bạn ngồi yên đọc một trang ngữ pháp, não nhận được rất ít tín hiệu cần phải thức, nên cơn buồn ngủ đến nhanh hơn.

Nói to thì khác. Khi nói, bạn phải nghĩ ra ý, chọn từ, phát âm và nghe lại giọng của chính mình, tất cả cùng lúc. Cơ thể cũng tham gia: hơi thở, cơ miệng, đôi khi cả tay và tư thế đứng. Sự tham gia của nhiều giác quan khiến não khó trôi vào trạng thái lơ mơ. Đó là lý do nhiều người thấy họ có thể nói to mười phút mà không buồn ngủ, trong khi đọc mười phút đã bắt đầu díp mắt.

Còn một lý do nằm ở mục tiêu học. Với những người học tiếng Anh vì phải họp với đối tác, đọc ngữ pháp chỉ giúp gián tiếp. Họ có thể hiểu rất rõ quy tắc chia thì nhưng vẫn lúng túng khi phải mở miệng trả lời một câu hỏi bất ngờ. Bài nói to, ngược lại, luyện trực tiếp đúng kỹ năng họ cần: lấy ý trong đầu và nói thành câu trong thời gian ngắn. Nhờ vậy, mười hai phút tỉnh táo hiếm hoi buổi tối được dùng cho đúng việc.

Thử hình dung một chuyên viên mua hàng tên Thảo, ngày nào cũng có hai ba cuộc gọi với nhà cung cấp nước ngoài. Tối về chị mở sách ngữ pháp, đọc về mệnh đề quan hệ, và sau vài trang thì không nhớ mình vừa đọc gì. Nếu chị dùng cùng khoảng thời gian đó để nói to về cuộc gọi trong ngày, kể lại nhà cung cấp hỏi gì và mình trả lời ra sao, chị vừa tỉnh táo hơn, vừa có ngay những câu dùng được cho cuộc gọi sáng mai.

Cuối cùng, bài tập ngắn và chủ động còn giúp bảo vệ thói quen. Khi bài học nặng nề và buồn ngủ, người học dần gắn việc học tiếng Anh với cảm giác mệt mỏi, và đến một lúc họ né luôn. Một bài nói ngắn, kết thúc khi vẫn còn hứng, để lại cảm giác dễ chịu và khiến hôm sau việc bắt đầu nhẹ nhàng hơn.

### Cách làm
- Đứng dậy, đừng học trên giường.
- Nói to một đoạn ngắn về ngày làm việc của bạn.
- Dừng khi vẫn còn muốn nói thêm, để hôm sau dễ bắt đầu.

Đứng dậy là bước nhỏ nhưng có tác dụng rõ. Tư thế nằm hay ngồi lún trong ghế sofa là tín hiệu nghỉ ngơi quen thuộc với cơ thể, nên rất khó giữ tỉnh táo khi học trong tư thế đó. Bạn có thể đứng cạnh cửa sổ, đi chậm quanh phòng, hoặc đứng trước gương. Nếu thật sự muốn ngồi, hãy ngồi thẳng ở bàn, không ở nơi bạn vẫn dùng để thư giãn.

Đoạn nói về ngày làm việc nên bám vào những việc thật vừa diễn ra, vì chúng còn tươi trong trí nhớ và bạn không phải nghĩ ra chủ đề. Một khung gợi ý là kể một việc đã làm, một người đã gặp và một điều cần làm tiếp. Ví dụ: "I had a call with our partner in Japan." (Mình có cuộc gọi với đối tác ở Nhật.), "They asked about the delivery date." (Họ hỏi về ngày giao hàng.), "I need to confirm it with the warehouse tomorrow." (Ngày mai mình cần xác nhận với kho.). Đừng dừng lại tra từ giữa chừng; nếu thiếu từ, hãy nói vòng bằng từ mình biết rồi đi tiếp.

Bạn cũng có thể đóng vai cuộc họp sắp tới. Hãy tưởng tượng đối tác hỏi một câu quen thuộc và tự trả lời to thành tiếng, chẳng hạn "What is the status of the project?" (Dự án đang tiến triển ra sao?) rồi đáp "We are on track, but we need one more week for testing." (Chúng mình đang đúng tiến độ, nhưng cần thêm một tuần để kiểm thử.). Kiểu luyện này đặc biệt hợp với những người học vì phải họp với đối tác, vì nó giống tình huống thật nhất.

Việc dừng khi vẫn còn muốn nói thêm nghe có vẻ ngược đời, nhưng đây là cách giữ hứng thú cho ngày hôm sau. Nếu bạn nói cho đến lúc cạn ý và mệt, lần sau bạn sẽ nhớ đến cảm giác cạn kiệt ấy. Nếu bạn dừng khi vẫn còn vài điều muốn kể, bạn mang theo một chút tò mò sang hôm sau. Một khoảng chừng năm đến mười phút là vừa, nằm gọn trong khoảng tập trung buổi tối.

Một lưu ý cuối: hãy để sách ngữ pháp cho những lúc bạn còn sức, chẳng hạn sáng cuối tuần hoặc giờ nghỉ trưa. Ngữ pháp vẫn có ích, chỉ là buổi tối mệt mỏi không phải lúc phù hợp để học nó.

Nếu ở nhà có người thân và bạn ngại bị nghe thấy, hãy nói ở ban công, trong phòng riêng, hoặc ngay lúc đi bộ từ bãi gửi xe về nhà. Nói nhỏ vẫn hơn đọc thầm, miễn là miệng bạn thật sự phát ra âm thanh.

### Ngộ nhận thường gặp
Ngộ nhận: Học buổi tối thì nên đọc sách ngữ pháp cho nhẹ nhàng. Thực tế: Khi đã mệt, đọc thụ động dễ buồn ngủ hơn; nói to giữ đầu óc tỉnh táo hơn.

Chữ nhẹ nhàng ở đây dễ gây hiểu lầm. Đọc ngữ pháp nhẹ với cơ thể, vì bạn chỉ cần ngồi yên, nhưng lại nặng với một bộ óc đã mệt, vì nó đòi hỏi tập trung vào những quy tắc trừu tượng trong thời gian dài. Nói to thì ngược lại: có vẻ tốn sức hơn một chút, nhưng chính sự vận động ấy giữ đầu óc tỉnh.

Nhiều người cũng nghĩ rằng phải nắm chắc ngữ pháp rồi mới nên nói, nên họ dành hết buổi tối cho sách. Kết quả là họ đọc mãi mà vẫn chưa dám nói. Với người cần tiếng Anh cho các cuộc họp, nói thường xuyên với những câu đơn giản, kể cả có lỗi nhỏ, giúp họ tiến gần mục tiêu hơn là hiểu sâu một chương ngữ pháp mà không bao giờ dùng đến.

### Trường hợp
Chị Mai, nhân viên bán hàng hai mươi chín tuổi, về nhà là mệt rã rời và thường ngủ gật trên sách ngữ pháp. Chị đổi sang nói to một đoạn ngắn về ngày làm việc ngay khi vừa thay đồ. Chị thấy tỉnh hơn, nhớ từ lâu hơn và giữ được thói quen suốt cả tháng.

Công việc của chị gồm nhiều cuộc gặp khách hàng, trong đó có một số khách nước ngoài đến xem hàng mẫu. Đoạn nói mỗi tối của chị thường xoay quanh những cuộc gặp đó, như "A customer from Korea asked about our new model." (Một khách từ Hàn Quốc hỏi về mẫu mới của chúng mình.). Chị đứng ngay cạnh tủ quần áo mà nói, rồi mới đi ăn tối, và kể rằng nhờ thế mà những lần khách hỏi lại, chị trả lời được nhanh hơn trước.

### Câu hỏi luyện tập
Câu hỏi: Câu nào giúp bạn có thêm vài giây suy nghĩ? Đáp án: "Let me think about it for a second."
`;

const T1_TOPIC_3 = `## Có bạn học thì dễ giữ nhịp
Thông điệp chính: Rủ một đồng nghiệp cùng luyện và hẹn giờ cố định.
Đối tượng: Người đi làm hay bỏ cuộc khi học một mình.
Góc nhìn: Có người nhắc nên khó bỏ cuộc hơn, nhưng cách học phù hợp vẫn tùy từng người.

### Số liệu và phát hiện
Cuộc khảo sát hỏi thành viên một cộng đồng học tiếng Anh về cách họ giữ lịch học. Theo Cộng đồng Người học Tiếng Anh (mô phỏng): Người học có bạn đồng hành duy trì lịch học cao gấp 2 lần. Người học một mình thường nói không có ai biết khi mình bỏ, nên việc bỏ buổi trở nên rất dễ dàng.

Người tham gia khảo sát là thành viên đang sinh hoạt trong cộng đồng, phần lớn là người đi làm ở độ tuổi từ cuối hai mươi đến đầu bốn mươi, làm trong các ngành như kinh doanh, công nghệ, tài chính và chăm sóc khách hàng. Họ được hỏi họ học một mình hay cùng người khác, bao lâu thì luyện một lần, và trong vài tháng gần nhất họ đã giữ được lịch học đến mức nào. Bạn đồng hành ở đây được hiểu khá rộng: có thể là đồng nghiệp, bạn bè, người thân, hoặc một thành viên quen qua cộng đồng.

Kết quả cho thấy nhóm có bạn đồng hành giữ lịch học cao gấp đôi nhóm học một mình. Điều đáng chú ý là hình thức đồng hành trong nhiều trường hợp rất đơn giản. Không phải ai cũng học chung một lớp hay gặp nhau trực tiếp; nhiều cặp chỉ nhắn tin cho nhau mỗi tối, gửi một đoạn ghi âm ngắn hoặc báo đã luyện xong. Có vẻ chính sự hiện diện của một người khác, người biết bạn có học hay không, mới là yếu tố tạo khác biệt, hơn là nội dung học chung.

Ở chiều ngược lại, những người học một mình mô tả một trải nghiệm khá giống nhau. Khi một buổi bị bỏ, không có hệ quả nào xảy ra, không ai hỏi, không ai thất vọng. Buổi bỏ thứ hai còn dễ hơn buổi đầu, và đến buổi thứ ba thì việc không học đã trở thành mặc định. Nhiều người nói họ không thiếu động lực khi bắt đầu, mà thiếu một lý do để không bỏ vào những tối mệt.

Khảo sát cũng hỏi về những cặp đồng hành không thành. Một số cặp tan rã khi hai người có mục tiêu quá khác nhau, chẳng hạn một người muốn luyện thi, một người chỉ cần nói trong họp. Một số khác dừng vì lịch không khớp, người này rảnh buổi sáng, người kia chỉ rảnh đêm muộn. Những chi tiết này cho thấy bạn đồng hành có ích nhất khi hai bên có mục tiêu gần nhau và một khung giờ chung dễ giữ.

Cũng như mọi khảo sát dựa trên lời tự kể, kết quả này phản ánh trải nghiệm của những người đang tham gia cộng đồng, vốn có thể đã có động lực học cao hơn mặt bằng chung. Vì thế, con số gấp đôi nên được xem như một tín hiệu đáng thử nghiệm, chứ không phải quy luật cho tất cả mọi người.

### Vì sao
Những người có một bạn đồng hành, dù chỉ nhắn nhau mỗi tối, kể rằng họ ngại là người bỏ trước nên giữ lịch tốt hơn. Một số giáo viên lưu ý rằng có người học tốt hơn với buổi dài cuối tuần nếu có mục tiêu rõ, nên không nên khẳng định một cách học đúng cho mọi người.

Khi học một mình, lời hứa với chính mình rất dễ thương lượng lại. Tối nay mệt quá, mai học bù cũng được; tuần này bận, tuần sau tính. Không có ai phản đối, nên lý do nào nghe cũng hợp lý. Khi có một người đang chờ tin nhắn của bạn, lời hứa ấy trở thành lời hứa với người khác, và phần lớn chúng ta coi trọng lời hứa với người khác hơn lời hứa với bản thân.

Tâm lý ngại là người bỏ trước hoạt động theo cách khá tinh tế. Không ai bắt buộc ai, cũng không có hình phạt nào, nhưng ý nghĩ rằng bạn mình vẫn đang cố gắng còn mình thì bỏ cuộc tạo ra một chút áy náy đủ để kéo người ta ngồi xuống luyện vài phút. Mỗi người vừa là người được nhắc, vừa là người nhắc, nên trách nhiệm được chia đều và không ai cảm thấy bị giám sát.

Bạn đồng hành còn mang lại một lợi ích ít được nhắc đến: có người nghe thật. Khi luyện nói một mình, bạn nói vào khoảng không và khó biết người khác có hiểu mình không. Khi gửi tin nhắn thoại cho đồng nghiệp, bạn đang giao tiếp thật, dù ở quy mô rất nhỏ. Người kia trả lời, hỏi lại hoặc phản hồi, và cuộc trao đổi ấy gần với các tình huống công việc hơn nhiều so với tự nói với gương.

Ví dụ, hai chuyên viên chăm sóc khách hàng tên Nga và Đạt cùng phải trả lời cuộc gọi của khách nước ngoài. Họ thống nhất mỗi tối chín giờ, mỗi người gửi một tin nhắn thoại kể lại một tình huống khó trong ngày. Nhờ nghe nhau, họ học được cách xử lý của người kia, và vì biết bạn đang chờ, cả hai hiếm khi bỏ lượt.

Tuy vậy, lưu ý của các giáo viên là có cơ sở. Có những người thấy việc phải báo cáo với ai đó là một áp lực khó chịu, hoặc lịch làm việc của họ quá thất thường để hẹn giờ cố định với ai. Có người lại học tốt nhất với một buổi dài, tập trung, vào cuối tuần, khi họ có mục tiêu cụ thể như chuẩn bị cho một chuyến công tác. Bạn đồng hành là một công cụ hữu ích, không phải con đường duy nhất.

Điều quan trọng là nhận ra kiểu người học của chính mình. Nếu bạn từng bắt đầu nhiều lần rồi lặng lẽ bỏ mà không ai hay biết, đó là dấu hiệu khá rõ rằng bạn sẽ hưởng lợi từ một người đồng hành. Nếu bạn vốn tự giữ lịch tốt và chỉ thấy khó chịu khi phải nhắn tin báo cáo, có lẽ bạn nên giữ cách học riêng và chỉ tìm bạn luyện nói khi cần một người nghe thật.

### Cách làm
- Rủ một đồng nghiệp có cùng mục tiêu.
- Hẹn một giờ cố định mỗi tối.
- Gửi cho nhau một tin nhắn thoại tiếng Anh ngắn.
- Mở tin nhắn bằng câu "How was your day?" rồi kể một việc trong ngày.
- Nếu một người bận, người kia vẫn gửi tin nhắn để giữ nhịp cho cả hai.

Khi tìm bạn đồng hành, hãy ưu tiên người có nhu cầu tiếng Anh giống bạn, chẳng hạn cùng phải họp với một đối tác hoặc cùng làm việc với một nhóm ở nước ngoài. Trình độ không cần ngang nhau; điều quan trọng hơn là cả hai cùng muốn luyện nói và đều thấy việc này có ích cho công việc. Lời rủ có thể rất nhẹ nhàng, ví dụ: thử cùng nhau hai tuần xem sao, nếu không hợp thì thôi. Một thời hạn ngắn giúp người kia dễ nhận lời hơn.

Giờ cố định nên là giờ mà cả hai đều chắc mình đã về nhà và có vài phút yên tĩnh. Nhiều cặp chọn một khoảng thời gian chứ không phải một phút chính xác, chẳng hạn từ tám đến chín giờ tối. Hãy cài nhắc nhở trên điện thoại cho cả hai, và thống nhất trước điều gì xảy ra khi có người phải tăng ca hay đi công tác.

Tin nhắn thoại nên ngắn, khoảng một phút là đủ, để người nghe không thấy nặng nề. Sau câu mở "How was your day?" (Hôm nay của bạn thế nào?), bạn có thể kể một việc như "I presented the sales numbers to my manager." (Mình trình bày số liệu bán hàng với quản lý.) rồi thêm một câu cảm nhận như "I was a bit nervous, but it went well." (Mình hơi lo, nhưng mọi việc ổn.). Người nhận có thể đáp lại bằng một câu hỏi tiếp như "What did your manager say?" (Quản lý của bạn nói gì?), để tối hôm sau có sẵn chủ đề.

Nếu ngại nói lúc đầu, hai bạn có thể bắt đầu bằng tin nhắn chữ trong vài ngày rồi chuyển dần sang tin nhắn thoại. Tuy nhiên, đừng dừng lại ở tin nhắn chữ quá lâu, vì mục tiêu của cả hai là luyện nói. Một mẹo nhỏ là nghe tin nhắn của bạn mình xong rồi mới ghi âm câu trả lời, để phần đáp lại tự nhiên như một cuộc trò chuyện thật.

Hai bên nên thống nhất từ đầu rằng mục đích là luyện nói, không phải chấm lỗi. Nếu muốn góp ý, mỗi lần chỉ góp một điểm, và nói theo hướng gợi ý, chẳng hạn "Maybe you can say it this way." (Có lẽ bạn có thể nói theo cách này.). Việc sửa quá nhiều dễ khiến người kia ngại gửi tin nhắn tiếp.

Bước cuối cùng là chỗ dựa khi một người chùng xuống. Thay vì cùng nhau nghỉ, người còn sức vẫn gửi tin nhắn như thường, có thể kèm một câu động viên như "No pressure, just send me one sentence tomorrow." (Không áp lực đâu, mai gửi mình một câu thôi.). Như vậy nhịp chung không bị đứt, và người kia có đường quay lại dễ dàng.

### Ngộ nhận thường gặp
Ngộ nhận: Học tiếng Anh là việc phải tự lực một mình. Thực tế: Có bạn đồng hành giúp giữ lịch học đều hơn rõ rệt.

Quan niệm tự lực xuất phát từ cách nhiều người từng học ở trường: mỗi người tự làm bài, tự ôn thi, và kết quả là của riêng mình. Nhưng với người đi làm, khó khăn chính thường không nằm ở việc hiểu bài mà ở việc giữ nhịp qua nhiều tuần bận rộn. Ở điểm này, một người đồng hành giúp được nhiều hơn bất kỳ giáo trình nào.

Có người lại lo rằng rủ đồng nghiệp học cùng sẽ lộ điểm yếu của mình. Thật ra, đa số người đi làm đều có những lúc lúng túng khi nói tiếng Anh, và việc thừa nhận điều đó với một người tin cậy thường làm hai bên thoải mái hơn. Dù vậy, học cùng người khác vẫn là một lựa chọn; nếu bạn thật sự thấy học một mình hiệu quả hơn, đó cũng là cách hợp lệ.

### Trường hợp
Linh và Phong cùng phòng kinh doanh, cùng phải họp với đối tác Singapore. Họ hẹn nhau mỗi tối gửi một tin nhắn thoại tiếng Anh về công việc trong ngày. Không ai muốn là người bỏ trước, nên cả hai giữ được nhịp suốt hai tháng và bắt đầu chủ động nói trong cuộc họp.

Ý tưởng bắt đầu sau một cuộc họp mà cả hai đều im lặng khi đối tác hỏi về kế hoạch giao hàng. Trên đường về, Linh rủ Phong thử gửi tin nhắn thoại cho nhau trong hai tuần. Có những tuần Phong đi công tác, Linh vẫn gửi đều mỗi tối và Phong trả lời bằng vài câu ngắn từ khách sạn. Đến cuộc họp tiếp đó với đối tác, Phong là người lên tiếng tóm tắt lịch giao hàng, bằng chính những câu anh đã nói nhiều lần trong tin nhắn với Linh.

Sau buổi họp đó, hai người đặt thêm một quy ước nhỏ: tối nào có họp với đối tác, mỗi người kể lại một câu mình đã nói được và một câu mình muốn nói mà chưa nói ra.

### Câu hỏi luyện tập
Câu hỏi: Câu hỏi thăm ngắn nào hợp để mở tin nhắn thoại cho bạn học? Đáp án: "How was your day?"
`;

const T3_TOPIC_1 = `## Giới thiệu bản thân trong 60 giây
Thông điệp chính: Chia phần giới thiệu thành ba ý: hiện tại, thành tích, mong muốn.
Đối tượng: Người đi làm chuẩn bị phỏng vấn bằng tiếng Anh.
Góc nhìn: Nhà tuyển dụng nhớ câu trả lời có cấu trúc hơn câu trả lời trôi chảy.

### Số liệu và phát hiện
Cuộc khảo sát lấy ý kiến của những người trực tiếp phỏng vấn ứng viên cho vị trí cần dùng tiếng Anh. Theo Bản tin Nhân sự Việt (mô phỏng): 72% nhà tuyển dụng ưu tiên câu trả lời có cấu trúc hơn câu trả lời lưu loát. Theo Blog Kỹ năng Văn phòng (mô phỏng): Phần giới thiệu bản thân lý tưởng kéo dài khoảng 60 giây.

Nhóm được hỏi gồm trưởng phòng nhân sự, chuyên viên tuyển dụng và quản lý trực tiếp ở những công ty thường xuyên làm việc với đối tác nước ngoài, từ doanh nghiệp vừa và nhỏ đến văn phòng đại diện của các tập đoàn. Người trả lời được mời nhớ lại những ứng viên gần đây mà họ còn ấn tượng, rồi mô tả điều gì khiến phần giới thiệu của người đó đọng lại trong trí nhớ. Các câu trả lời sau đó được nhóm biên tập gom thành từng cụm ý để xem tiêu chí nào được nhắc đi nhắc lại nhiều nhất.

Con số bảy mươi hai phần trăm cho thấy cứ mười người phỏng vấn thì có khoảng bảy người sẵn sàng chọn một phần giới thiệu gọn gàng, rõ ý thay vì một phần giới thiệu trôi chảy nhưng lan man. Nhiều người giải thích rằng họ phải ghi chép trong lúc nghe, nên câu trả lời có các ý tách bạch giúp họ điền phiếu đánh giá nhanh và chính xác hơn. Một số người phỏng vấn nói thẳng rằng ở phút đầu tiên họ chưa chấm phát âm, mà chấm xem ứng viên có hiểu mình đang làm gì và muốn đi về đâu.

Về thời lượng, khoảng sáu mươi giây được mô tả là vừa đủ để nói ba ý mà chưa làm người nghe sốt ruột. Nhiều người phỏng vấn kể rằng khi phần mở đầu kéo dài quá lâu, họ bắt đầu nhìn xuống hồ sơ hoặc tìm cách cắt lời một cách lịch sự. Ngược lại, phần giới thiệu quá ngắn, chỉ một hai câu, lại buộc họ phải hỏi thêm hàng loạt câu cơ bản, và cuộc trò chuyện mất nhịp ngay từ đầu.

Một phát hiện đáng chú ý khác là người phỏng vấn nhớ những thành tích có kết quả cụ thể lâu hơn hẳn so với một danh sách nhiệm vụ. Câu như "I helped my team cut the reporting time in half." (Mình giúp nhóm rút ngắn một nửa thời gian làm báo cáo.) được nhắc lại nhiều hơn những câu liệt kê chức danh hay tên dự án. Điều này gợi ý rằng phần thành tích nên là trọng tâm của sáu mươi giây, còn phần hiện tại và phần mong muốn đóng vai trò mở đầu và khép lại.

Khảo sát cũng ghi nhận khác biệt giữa các nhóm người phỏng vấn. Quản lý trực tiếp, những người sẽ làm việc hằng ngày với ứng viên, đặc biệt chú ý đến phần thành tích vì nó cho họ hình dung về cách ứng viên giải quyết công việc. Chuyên viên tuyển dụng thì quan tâm nhiều hơn đến phần mong muốn, vì nó giúp họ đoán xem ứng viên có gắn bó lâu với vị trí hay không. Dù nhấn vào phần nào, cả hai nhóm đều mô tả phần giới thiệu tốt là phần họ có thể tóm lại trong một câu ngay sau khi ứng viên nói xong.

### Vì sao
Ấn tượng ban đầu đến từ việc ứng viên có đi thẳng vào ý chính hay không. Câu trả lời có cấu trúc rõ, dù từ vựng đơn giản, được đánh giá cao hơn câu trả lời dài và hoa mỹ nhưng khó theo dõi. Ứng viên thường mắc lỗi kể lại toàn bộ quá trình học tập và làm việc, khiến người nghe mất tập trung.

Ở phút đầu tiên, người phỏng vấn chưa có nhiều thông tin, nên họ đang tìm một khung để đặt ứng viên vào: người này đang làm gì, giỏi ở điểm nào, có hợp với vị trí đang tuyển không. Một phần giới thiệu chia ba ý trả lời đúng ba câu hỏi ngầm đó, nên người nghe không phải tự sắp xếp lại thông tin. Khi ứng viên kể theo dòng thời gian từ thời đại học, người nghe phải chờ rất lâu mới đến phần liên quan trực tiếp đến công việc.

Với người dùng tiếng Anh như ngôn ngữ thứ hai, cấu trúc còn là chỗ dựa khi căng thẳng. Nếu biết mình đang ở ý thứ hai, bạn dễ quay lại mạch dù vừa vấp một từ hay quên một cụm từ. Nếu nói tự do mà không có khung, chỉ một lần quên từ cũng đủ làm bạn mất hướng, rồi câu sau nối câu trước một cách lộn xộn.

Hãy hình dung hai ứng viên cùng ứng tuyển vị trí điều phối dự án. Người thứ nhất nói rất trôi chảy về trường đại học, các câu lạc bộ từng tham gia, ba công ty đã đi qua và sở thích đọc sách. Người thứ hai nói chậm hơn, dùng từ đơn giản, nhưng nêu rõ mình đang điều phối dự án gì, vừa giúp nhóm bàn giao một hạng mục khó đúng hạn, và muốn học thêm về làm việc với đối tác quốc tế. Sau buổi phỏng vấn, người phỏng vấn thường viết được nhận xét cụ thể về người thứ hai, còn về người thứ nhất chỉ nhớ mang máng là "nói hay".

Từ vựng hoa mỹ cũng có rủi ro riêng. Khi dùng những từ mình chưa thật quen, người nói dễ phát âm sai hoặc đặt từ sai ngữ cảnh, và người nghe phải đoán ý. Từ đơn giản đặt đúng chỗ giúp người nghe dồn sự chú ý vào nội dung thay vì vào cách diễn đạt, và giúp bạn nói ổn định hơn khi hồi hộp.

Còn một lý do thực tế nữa: phần giới thiệu thường định hướng các câu hỏi sau đó. Người phỏng vấn hay hỏi tiếp vào điều ứng viên vừa nhắc đến, nên khi bạn chủ động đưa ra một thành tích rõ ràng, bạn đang mời họ hỏi về điều mình kể tốt nhất. Nếu phần giới thiệu dàn trải, câu hỏi tiếp theo có thể rơi vào một chi tiết bạn chỉ nhắc qua và chưa chuẩn bị kỹ.

### Cách làm
- Viết hai câu về công việc hiện tại.
- Thêm hai câu về một thành tích cụ thể.
- Kết bằng hai câu về điều bạn muốn làm tiếp.
- Nói thử và bấm giờ cho vừa khoảng một phút.

Khi viết hai câu về công việc hiện tại, hãy nêu chức danh và phạm vi việc bạn phụ trách, thay vì chỉ nói tên công ty. Có thể bắt đầu bằng "I currently work as a project coordinator at a logistics company." (Hiện mình là điều phối viên dự án tại một công ty hậu cần.), rồi thêm "I am responsible for keeping our client projects on schedule." (Mình phụ trách giữ cho các dự án của khách hàng đúng tiến độ.). Hai câu này cần trả lời được câu hỏi: mỗi ngày bạn thực sự làm gì.

Với phần thành tích, chọn một việc có kết quả nhìn thấy được, tốt nhất là việc gắn với vị trí đang ứng tuyển. Mẫu câu hữu ích là "Last year, I led a project that ..." (Năm ngoái, mình dẫn dắt một dự án ...) và "As a result, ..." (Nhờ đó, ...). Đừng cố nhồi ba thành tích vào hai câu; một thành tích được kể rõ ràng có sức nặng hơn ba thành tích kể vội.

Phần mong muốn nên nối với công việc đang tuyển, không chỉ nói chung chung về phát triển bản thân. Bạn có thể dùng "I am now looking for a role where I can ..." (Bây giờ mình đang tìm một vị trí mà ở đó mình có thể ...) hoặc "That is why I am interested in this position." (Đó là lý do mình quan tâm đến vị trí này.). Câu cuối này giúp trao lượt nói lại cho người phỏng vấn một cách tự nhiên.

Khi bấm giờ, hãy ghi âm bằng điện thoại thay vì chỉ nhìn đồng hồ. Nghe lại, bạn sẽ thấy chỗ nào mình nói nhanh vì hồi hộp, chỗ nào ngập ngừng vì chưa nắm chắc ý. Nếu bản ghi vượt quá một phút, hãy cắt bớt chi tiết ở phần hiện tại trước, giữ nguyên phần thành tích vì đó là phần người nghe nhớ lâu nhất.

Một lưu ý quan trọng là chỉ thuộc ba ý, không thuộc từng chữ. Mỗi lần tập, hãy thử diễn đạt lại theo cách hơi khác một chút, để khi vào phòng phỏng vấn bạn không bị phụ thuộc vào một câu cố định. Nên chuẩn bị thêm một phiên bản rút gọn khoảng ba mươi giây cho trường hợp người phỏng vấn nói rõ là thời gian có hạn, và một phiên bản dài hơn đôi chút nếu được mời kể thêm.

Nếu phỏng vấn trực tuyến, bạn có thể để một mẩu giấy ghi ba từ khóa cho ba ý ngay cạnh màn hình, nhưng đừng cúi xuống đọc. Chỉ cần liếc qua từ khóa là đủ giữ thứ tự ý, trong khi mắt vẫn hướng về camera để người phỏng vấn cảm thấy bạn đang nói chuyện với họ.

### Ngộ nhận thường gặp
Ngộ nhận: Giới thiệu bản thân càng dài càng thể hiện được nhiều kinh nghiệm. Thực tế: Nhà tuyển dụng ưu tiên câu trả lời có cấu trúc, và phần giới thiệu lý tưởng chỉ khoảng 60 giây.

Ngộ nhận này phổ biến vì nhiều người nghĩ người phỏng vấn chưa đọc hồ sơ, nên mình phải kể lại tất cả. Thật ra hồ sơ đã nằm sẵn trên bàn, và điều người phỏng vấn muốn nghe là cách bạn chọn lọc và kể lại những gì quan trọng nhất. Một phần giới thiệu quá dài thường cho thấy ứng viên chưa biết điều gì trong kinh nghiệm của mình là đáng chú ý.

Cũng có người tin rằng nói nhanh và nói nhiều sẽ che được lỗi ngữ pháp. Cách này thường phản tác dụng, vì nói nhanh làm lỗi phát âm lộ rõ hơn và khiến người nghe khó theo kịp. Nói ở tốc độ vừa phải, có ngắt nghỉ giữa các ý, giúp người nghe có thời gian tiếp nhận và giúp bạn kiểm soát câu chữ tốt hơn.

Ngắn gọn không có nghĩa là bỏ bớt kinh nghiệm. Những gì không nói trong sáu mươi giây vẫn có thể xuất hiện khi người phỏng vấn hỏi sâu hơn, và đó mới là lúc kể chi tiết phát huy tác dụng nhất.

### Trường hợp
Chị Thảo, chuyên viên marketing ba mươi tuổi, từng kể cả quá trình học hành khi được hỏi giới thiệu bản thân. Chị tập lại theo ba ý ngắn: hiện tại, thành tích, mong muốn. Ở buổi phỏng vấn sau, người phỏng vấn hỏi sâu vào đúng thành tích chị muốn kể và buổi nói chuyện trở nên tự nhiên hơn.

Nhìn lại, phần giới thiệu cũ của chị kéo dài gần ba phút, bắt đầu từ năm nhất đại học và chỉ chạm đến công việc hiện tại ở những câu cuối. Khi tập lại, chị viết ra sáu câu, ghi âm và nghe lại vào buổi tối, mỗi lần chỉ mất vài phút. Phần thành tích chị chọn là chiến dịch quảng bá sản phẩm mới do chính chị lên kế hoạch, thay vì liệt kê mọi dự án từng tham gia. Chị kể rằng điều thay đổi lớn nhất không nằm ở vốn tiếng Anh, mà ở chỗ chị biết mình sẽ nói gì tiếp theo nên bớt hồi hộp hẳn.

### Câu hỏi luyện tập
Câu hỏi: Câu mở đầu nào phù hợp cho phần giới thiệu hiện tại? Đáp án: "I currently lead a small sales team."
`;

const T3_TOPIC_2_V1 = `## Sợ câu hỏi bất ngờ khi phỏng vấn
Thông điệp chính: Chuẩn bị ý chính thay vì học thuộc câu trả lời.
Đối tượng: Người đi làm sắp phỏng vấn bằng tiếng Anh.
Góc nhìn: Ứng viên dễ khựng nhất khi gặp câu hỏi ngoài dự kiến.

### Số liệu và phát hiện
Cộng đồng người học chia sẻ những khoảnh khắc họ thấy khó nhất khi phỏng vấn. Theo Cộng đồng Người học Tiếng Anh (mô phỏng): 65% ứng viên cho biết câu hỏi bất ngờ là lúc họ dễ bị khựng nhất. Nhiều người cho biết họ im lặng vài giây rồi mất bình tĩnh, dù thực ra biết cách trả lời.

Dữ liệu đến từ các bài chia sẻ và phiếu hỏi trong một nhóm trực tuyến gồm người đi làm đang chuẩn bị phỏng vấn bằng tiếng Anh, phần lớn thuộc lĩnh vực công nghệ, tài chính và dịch vụ khách hàng. Thành viên được hỏi họ thấy khó nhất ở thời điểm nào: phần giới thiệu, phần câu hỏi chuyên môn, phần câu hỏi tình huống, hay lúc bị hỏi điều không chuẩn bị trước. Họ cũng được mời mô tả lại cảm giác của mình ngay khoảnh khắc bị khựng.

Con số sáu mươi lăm phần trăm nghĩa là cứ ba ứng viên thì có khoảng hai người chọn câu hỏi bất ngờ là điểm yếu nhất của mình. Điều đáng chú ý là nhóm này không chỉ gồm người mới học. Nhiều người có trình độ khá, đọc tài liệu chuyên môn bằng tiếng Anh hằng ngày, vẫn mô tả cảm giác đầu óc trống rỗng khi câu hỏi rẽ sang một hướng lạ.

Khi đọc kỹ các mô tả, nhóm biên tập nhận ra một mẫu chung: người hay khựng thường là người đã chuẩn bị rất kỹ theo kiểu viết sẵn từng câu trả lời. Họ kể rằng trong đầu họ lục tìm câu trả lời đã thuộc, không tìm thấy, và chính khoảng tìm kiếm đó kéo dài thành im lặng. Những người chuẩn bị bằng ghi chú ý chính ít nhắc đến cảm giác này hơn, dù họ cũng thừa nhận có lúc nói chưa trôi.

Một số thành viên còn liệt kê những câu hỏi khiến họ bất ngờ nhất, chẳng hạn kể về một thất bại trong công việc, sẽ làm gì nếu bất đồng với quản lý, hay một câu rất đời thường như cuối tuần thường làm gì. Những câu này không khó về nội dung, nhưng khó vì người trả lời không có sẵn kịch bản cho chúng.

Nhóm biên tập cũng để ý đến thời điểm người học bắt đầu chuẩn bị. Những người dồn việc chuẩn bị vào vài ngày cuối thường chọn cách học thuộc, vì đó là cách tạo cảm giác tiến bộ nhanh nhất. Những người bắt đầu sớm hơn có xu hướng tập nói nhiều lần theo ý, nhờ vậy họ quen với việc tự tìm từ trong lúc nói. Điều này gợi ý rằng cách chuẩn bị chịu ảnh hưởng lớn từ áp lực thời gian, chứ không chỉ từ trình độ tiếng Anh.

### Vì sao
Khi người phỏng vấn đổi câu hỏi một chút, người học thuộc thường trả lời lệch hoặc nghe như đang đọc. Bộ nhớ của câu trả lời học thuộc gắn với đúng câu hỏi cũ, nên khó điều chỉnh tại chỗ.

Học thuộc là kiểu ghi nhớ theo chuỗi: câu thứ nhất gợi ra câu thứ hai, câu thứ hai gợi ra câu thứ ba. Khi điểm khởi đầu thay đổi, chẳng hạn người phỏng vấn hỏi "Tell me about a time you disagreed with your manager." thay vì "How do you handle conflict?", chuỗi đó không được kích hoạt, dù nội dung cần nói gần như giống nhau. Người trả lời biết câu trả lời nằm đâu đó trong đầu nhưng không lấy ra được.

Trong khi đó, chuẩn bị theo ý chính giống như có trong tay một tấm bản đồ thay vì chỉ thuộc một lối đi duy nhất. Nếu bạn biết mình có một câu chuyện về làm việc nhóm, một câu chuyện về khách hàng khó tính và một câu chuyện về sai sót đã khắc phục, bạn có thể chọn câu chuyện hợp với bất kỳ cách đặt câu hỏi nào. Ngôn từ để kể được tạo ra ngay tại chỗ, nên nghe tự nhiên và có hồn hơn.

Áp lực trong phòng phỏng vấn làm vấn đề nặng thêm. Khi hồi hộp, khả năng nhớ lại nguyên văn từng câu bị ảnh hưởng nhiều, còn khả năng nói về điều mình hiểu rõ thì vững hơn. Vì vậy người học thuộc thường khựng đúng vào lúc cần bình tĩnh nhất.

Ngoài ra, người phỏng vấn có kinh nghiệm thường nhận ra câu trả lời học thuộc qua nhịp nói đều đều và cách dùng từ trau chuốt khác hẳn phần còn lại của cuộc trò chuyện. Một số người cố ý hỏi một câu lệch hướng để xem ứng viên phản ứng ra sao khi rời khỏi kịch bản, vì công việc thật cũng đầy những tình huống không báo trước.

Cũng cần nhớ rằng câu hỏi bất ngờ hiếm khi nhằm gài bẫy ứng viên. Thường thì người phỏng vấn chỉ muốn nghe một ví dụ thật từ kinh nghiệm của bạn, hoặc muốn biết bạn suy nghĩ thế nào trước một vấn đề mới. Khi hiểu như vậy, bạn sẽ bớt sợ câu hỏi lạ và dễ tập trung vào việc kể một câu chuyện có thật mà mình nắm rõ từng chi tiết.

### Cách làm
- Liệt kê ba ý chính cho mỗi chủ đề có thể bị hỏi.
- Nói lại mỗi ý bằng hai cách khác nhau.
- Nhờ bạn hỏi ngẫu nhiên để luyện phản xạ.

Để liệt kê ý chính, hãy bắt đầu từ những chủ đề gần như buổi phỏng vấn nào cũng có: bản thân, công việc hiện tại, điểm mạnh, điểm cần cải thiện, một lần làm việc nhóm, một lần gặp khó khăn và lý do muốn đổi việc. Với mỗi chủ đề, chỉ ghi ba từ khóa hoặc ba cụm ngắn, không viết thành câu hoàn chỉnh. Ví dụ, ghi chú cho chủ đề điểm mạnh có thể chỉ là "cẩn thận, giải thích kỹ thuật cho khách, học công cụ mới nhanh".

Khi nói lại mỗi ý bằng hai cách, hãy thay đổi cả điểm bắt đầu của câu. Cách thứ nhất có thể là "One of my strengths is attention to detail." (Một điểm mạnh của mình là sự cẩn thận.), cách thứ hai là "People on my team often ask me to double-check their work." (Đồng nghiệp trong nhóm hay nhờ mình kiểm tra lại phần việc của họ.). Hai câu nói cùng một ý nhưng đi từ hai hướng, giúp bạn xoay xở được khi câu hỏi được đặt theo kiểu lạ.

Khi nhờ bạn hỏi ngẫu nhiên, hãy đưa cho bạn danh sách chủ đề chứ đừng đưa sẵn câu hỏi, để người hỏi tự đặt câu theo cách của họ. Nếu không có người luyện cùng, có thể viết các câu hỏi ra thẻ giấy, xáo trộn rồi rút ngẫu nhiên, trả lời trong vòng vài giây và ghi âm lại. Sau mỗi lượt, tự hỏi: mình đã nói được ý chính chưa, hay đang cố nhớ lại một câu cụ thể.

Khi gặp câu hỏi hoàn toàn mới trong buổi phỏng vấn thật, hãy tìm xem nó gần với chủ đề nào trong danh sách của bạn, rồi lấy một ý chính từ chủ đề đó làm điểm tựa. Câu nối như "That reminds me of a project I worked on." (Câu hỏi này làm mình nhớ đến một dự án mình từng làm.) giúp bạn kéo câu hỏi lạ về vùng mình đã chuẩn bị. Đừng lo nếu câu nói chưa hoàn hảo; người phỏng vấn quan tâm đến nội dung và cách suy nghĩ hơn là từng chữ.

Nếu cần thêm một chút thời gian, bạn có thể hỏi lại để làm rõ, ví dụ "Do you mean in my current role or in general?" (Ý anh/chị là trong vị trí hiện tại hay nói chung?). Câu hỏi làm rõ vừa cho bạn vài giây để nghĩ, vừa giúp câu trả lời đi đúng hướng người phỏng vấn mong đợi.

Một cách luyện khác là lấy một câu chuyện và tự nghĩ ra nhiều cách hỏi khác nhau cùng dẫn đến nó. Câu chuyện về lần bạn cứu một dự án trễ hạn, chẳng hạn, có thể dùng để trả lời câu hỏi về áp lực, về làm việc nhóm, về giải quyết vấn đề hay về thành tích đáng tự hào. Khi thấy một câu chuyện phục vụ được nhiều câu hỏi, bạn sẽ bớt lo về số lượng câu hỏi có thể gặp.

### Ngộ nhận thường gặp
Ngộ nhận: Học thuộc thật nhiều câu trả lời mẫu là cách chuẩn bị tốt nhất. Thực tế: Học thuộc nguyên văn khiến câu trả lời nghe máy móc khi bị hỏi ngoài kịch bản.

Học thuộc câu trả lời mẫu tạo cảm giác an toàn trong lúc chuẩn bị, vì bạn thấy mình có sẵn đáp án cho mọi thứ. Nhưng cảm giác đó chỉ đúng khi câu hỏi được đặt y hệt như trong danh sách, điều hiếm khi xảy ra ngoài đời. Số câu trả lời mẫu càng nhiều, bạn càng tốn công phân biệt chúng và càng dễ trộn lẫn khi căng thẳng.

Điều này không có nghĩa là phải bỏ hẳn câu mẫu. Đọc các câu trả lời mẫu vẫn có ích để học cách diễn đạt, cấu trúc câu và từ vựng theo chủ đề. Khác biệt nằm ở cách dùng: lấy câu mẫu làm nguồn học, rồi tự nói lại bằng lời của mình, thay vì chép nguyên văn vào trí nhớ.

Một vài câu ngắn thì đáng học thuộc, chẳng hạn câu chào mở đầu, câu xin nhắc lại câu hỏi hay câu cảm ơn cuối buổi. Những câu này dùng được trong hầu hết tình huống, nên không gây ra vấn đề như câu trả lời thuộc lòng cho một câu hỏi cố định.

### Trường hợp
Anh Khoa, lập trình viên hai mươi bảy tuổi, học thuộc mười câu trả lời mẫu trước buổi phỏng vấn. Người phỏng vấn hỏi một câu không có trong danh sách và anh im lặng khá lâu. Lần sau anh chỉ chuẩn bị ý chính và luyện nói lại bằng lời khác, nên bình tĩnh hơn hẳn.

Câu hỏi khiến anh khựng là kể về một lần anh không đồng ý với quyết định của trưởng nhóm. Anh có sẵn một câu chuyện phù hợp, nhưng vì đã thuộc lòng câu trả lời cho câu hỏi về xử lý mâu thuẫn theo cách diễn đạt khác, anh không nhận ra hai câu hỏi gần nhau đến thế. Khi chuẩn bị lại, anh viết ra bảy chủ đề, mỗi chủ đề ba ý, và nhờ một đồng nghiệp hỏi ngẫu nhiên vào giờ nghỉ trưa. Anh kể rằng những lần đầu vẫn nói chưa trôi, nhưng không còn cảm giác trống rỗng vì lúc nào cũng có một ý để bám vào.

Ở buổi phỏng vấn kế tiếp, anh gặp một câu hỏi cũng không có trong ghi chú: nếu được làm lại dự án gần nhất, anh sẽ thay đổi điều gì. Anh nhận ra câu này gần với chủ đề sai sót đã khắc phục, nên kể về lần nhóm phải viết lại một phần mã vì thiếu kiểm thử từ sớm và bài học anh rút ra từ đó.

### Câu hỏi luyện tập
Câu hỏi: Câu nào giúp bạn có vài giây trước khi trả lời một câu hỏi khó? Đáp án: "That is a good question."
`;

const T3_TOPIC_2_V2 = `## Mua thời gian khi gặp câu hỏi khó
Thông điệp chính: Học ba câu đệm để có vài giây suy nghĩ trước khi trả lời.
Đối tượng: Người đi làm sắp phỏng vấn hoặc thuyết trình bằng tiếng Anh.
Góc nhìn: Một câu đệm ngắn giúp sắp xếp ý mà người nghe không thấy lúng túng.

### Số liệu và phát hiện
Cộng đồng người học chia sẻ những khoảnh khắc họ thấy khó nhất khi phỏng vấn. Theo Cộng đồng Người học Tiếng Anh (mô phỏng): 65% ứng viên cho biết câu hỏi bất ngờ là lúc họ dễ bị khựng nhất. Theo Diễn đàn Giáo viên (mô phỏng): Một câu đệm 2 đến 3 giây giúp người nói sắp xếp ý mà không bị coi là lúng túng.

Hai nguồn trong phần này nhìn cùng một vấn đề từ hai phía. Nguồn thứ nhất là trải nghiệm của chính người đi phỏng vấn, được gom từ các bài chia sẻ trong một nhóm học tiếng Anh dành cho người đi làm. Nguồn thứ hai là nhận xét của các giáo viên dạy kỹ năng nói, những người thường ngồi ở vị trí người nghe trong các buổi phỏng vấn thử và luyện thuyết trình.

Ở phía người học, con số sáu mươi lăm phần trăm cho thấy khoảnh khắc khó nhất không nằm ở câu hỏi chuyên môn mà ở lúc bị hỏi điều không lường trước. Khi được hỏi họ thường phản ứng thế nào, nhiều người mô tả hai kiểu: hoặc im lặng trong lúc nghĩ, hoặc nói ngay bất cứ điều gì vừa nảy ra rồi càng nói càng lạc ý. Cả hai kiểu đều bắt nguồn từ cảm giác phải đáp lại ngay lập tức.

Ở phía giáo viên, nhận xét chung là khoảng hai đến ba giây đi kèm một câu đệm gần như không bị người nghe để ý. Các giáo viên cho biết họ chỉ bắt đầu thấy người nói lúng túng khi khoảng lặng kéo dài mà không có tín hiệu gì, hoặc khi cùng một câu đệm bị lặp lại liên tục. Một câu đệm nói rõ ràng, kèm ánh mắt hướng về người hỏi, thường được hiểu là người nói đang cân nhắc nghiêm túc.

Đặt hai nguồn cạnh nhau, có thể thấy một khoảng cách giữa cảm nhận của người nói và người nghe. Người nói thấy vài giây suy nghĩ dài như cả phút, trong khi người nghe gần như không nhận ra nếu khoảng đó được lấp bằng một câu tự nhiên. Hiểu được khoảng cách này giúp nhiều người bớt sợ việc dừng lại.

Một số giáo viên còn chia sẻ rằng trong các buổi luyện thử, họ thường đề nghị học viên xem lại video của chính mình. Nhiều học viên ngạc nhiên khi thấy khoảng dừng mà họ tưởng rất dài thực ra chỉ thoáng qua, và câu đệm họ lo là gượng gạo lại nghe khá tự nhiên. Trải nghiệm tận mắt này thường giúp học viên đổi cách nhìn về việc dừng lại nhanh hơn mọi lời khuyên.

### Vì sao
Những câu đệm như nhắc lại câu hỏi hoặc khen câu hỏi hay chiếm rất ít thời gian nhưng cho người nói khoảng nghỉ để sắp xếp ý. Người nghe thường không coi đó là dấu hiệu lúng túng nếu câu đệm được nói tự nhiên. Ngược lại, im lặng kéo dài dễ bị hiểu là không biết trả lời.

Não cần một chút thời gian để chuyển từ nghe sang nói, nhất là khi cả hai việc đều diễn ra bằng ngôn ngữ thứ hai. Trong vài giây sau câu hỏi, bạn vừa phải hiểu đúng người kia hỏi gì, vừa chọn ý để trả lời, vừa tìm từ tiếng Anh phù hợp. Một câu đệm quen thuộc gần như được nói ra tự động, nên phần lớn sự chú ý vẫn dành cho việc sắp xếp ý.

Câu đệm còn gửi đi một tín hiệu xã hội. Khi bạn nói "That is a good question." hay nhắc lại một phần câu hỏi, người nghe hiểu rằng bạn đã tiếp nhận câu hỏi và đang xử lý nó. Im lặng hoàn toàn thì không có tín hiệu đó, nên người nghe có thể đoán bạn không hiểu câu hỏi, và đôi khi họ sẽ chen vào gợi ý, làm bạn càng rối hơn.

Thử hình dung một buổi thuyết trình báo cáo quý, khi một thành viên ban giám đốc hỏi vì sao chi phí tháng cuối tăng. Nếu người trình bày đứng lặng nhìn màn hình, cả phòng sẽ cảm nhận được sự căng thẳng. Nếu người đó nói "Let me make sure I understand. You are asking about the increase in the last month, right?" (Để mình xem mình hiểu đúng chưa. Anh đang hỏi về khoản tăng trong tháng cuối, phải không?) rồi mới trả lời, khoảng thời gian gần như bằng nhau nhưng cảm giác của người nghe hoàn toàn khác.

Câu đệm cũng giúp chính người nói lấy lại bình tĩnh. Bắt đầu bằng một câu quen thuộc tạo cảm giác mình vẫn đang làm chủ cuộc trò chuyện, nhịp thở chậm lại và giọng nói ổn định hơn ở câu tiếp theo.

Trong thuyết trình, câu đệm còn giữ nhịp cho cả phòng. Khi phần hỏi đáp diễn ra liên tục, một câu đệm ngắn báo cho mọi người biết câu trả lời sắp đến, giúp họ tiếp tục chú ý thay vì quay sang việc khác. Người trình bày cũng có dịp nhìn quanh phòng và nhận ra ai đang chờ câu trả lời nhất.

### Cách làm
- Học thuộc ba câu đệm ngắn.
- Luyện nói câu đệm rồi dừng một nhịp thở.
- Trả lời bằng ý chính trước, chi tiết sau.
- Chuẩn bị sẵn câu "Let me think about that for a moment." để dùng khi bị hỏi dồn.

Ba câu đệm nên thuộc ba kiểu khác nhau để có thể dùng xoay vòng. Kiểu thứ nhất là ghi nhận câu hỏi, ví dụ "That is a fair question." (Đó là một câu hỏi xác đáng.). Kiểu thứ hai là nhắc lại câu hỏi, ví dụ "So you are asking about how I handle tight deadlines." (Vậy là anh/chị đang hỏi về cách mình xử lý thời hạn gấp.). Kiểu thứ ba là xin một chút thời gian, ví dụ "Give me a second to put my thoughts together." (Cho mình một giây để sắp xếp ý.). Có đủ ba kiểu giúp bạn không phải lặp lại một câu suốt buổi.

Khi luyện dừng một nhịp thở, hãy đứng trước gương hoặc bật camera, nói câu đệm, hít vào nhẹ bằng mũi, rồi mới bắt đầu câu trả lời. Ban đầu nhịp dừng này có thể thấy gượng, nhưng khi xem lại video bạn sẽ nhận ra nó ngắn hơn nhiều so với cảm giác lúc nói. Mục tiêu là để câu đệm và nhịp dừng trở thành một động tác liền mạch.

Sau khoảng dừng, câu đầu tiên nên là ý chính, gói gọn trong một câu. Chẳng hạn, khi được hỏi về điểm yếu, bạn có thể mở đầu bằng "I sometimes spend too long on details." (Đôi khi mình dành quá nhiều thời gian cho chi tiết.), rồi mới kể ví dụ và cách bạn đang cải thiện. Nói ý chính trước giúp người nghe nắm ngay câu trả lời, và nếu bị cắt ngang, bạn vẫn kịp nói điều quan trọng nhất.

Câu "Let me think about that for a moment." đặc biệt có ích khi bị hỏi dồn nhiều câu liên tiếp hoặc khi một câu hỏi có hai ba vế. Lúc đó bạn có thể thêm "Could you repeat the second part?" (Anh/chị có thể nhắc lại phần thứ hai không?) để không bỏ sót vế nào.

Cần lưu ý tránh lạm dụng. Nếu câu hỏi nào cũng được mở đầu bằng cùng một câu khen, người nghe sẽ thấy máy móc. Với câu hỏi dễ, hãy trả lời luôn; để dành câu đệm cho những lúc thật sự cần vài giây sắp xếp ý.

Khi chọn câu đệm, hãy ưu tiên những câu bạn phát âm thoải mái và thấy hợp với giọng của mình. Một câu đơn giản nói tự nhiên có tác dụng hơn một câu cầu kỳ nói vấp. Có thể ghi ba câu đệm vào mẩu giấy dán cạnh bàn làm việc, mỗi ngày đọc to vài lần cho đến khi chúng bật ra mà không cần nghĩ. Sau đó, hãy thử dùng chúng trong các cuộc họp nội bộ, nơi áp lực thấp hơn nhiều so với phòng phỏng vấn.

### Ngộ nhận thường gặp
Ngộ nhận: Dừng lại suy nghĩ trước khi trả lời sẽ bị đánh giá là kém. Thực tế: Một câu đệm 2 đến 3 giây giúp sắp xếp ý mà không bị coi là lúng túng.

Ngộ nhận này thường đến từ trải nghiệm ở trường, khi trả lời nhanh được xem là dấu hiệu thuộc bài. Trong phỏng vấn và thuyết trình ở môi trường làm việc, người nghe đánh giá chất lượng câu trả lời nhiều hơn tốc độ. Một câu trả lời đến chậm vài giây nhưng rõ ràng, đúng trọng tâm thường để lại ấn tượng tốt hơn một câu trả lời nhanh mà lạc đề.

Điều người nghe thực sự để ý là cách bạn dùng khoảng thời gian đó. Ngồi im, nhìn xuống bàn và thở dài dễ bị hiểu là bối rối, còn một câu đệm điềm tĩnh kèm ánh mắt hướng về người hỏi lại cho thấy sự chín chắn. Trong nhiều môi trường làm việc quốc tế, việc dừng lại suy nghĩ trước một câu hỏi khó còn được xem là tôn trọng người hỏi.

Cũng cần phân biệt câu đệm với những âm lấp chỗ trống như "uh" hay "um" lặp đi lặp lại. Những âm này không mang nghĩa, và khi xuất hiện dày đặc sẽ khiến câu trả lời nghe thiếu tự tin. Một câu đệm có nội dung rõ ràng là cách thay thế tốt hơn nhiều.

Có người lại lo rằng dùng câu đệm là một kiểu đánh lừa người nghe. Thật ra câu đệm không che giấu điều gì; nó chỉ cho thấy bạn đang suy nghĩ một cách có kiểm soát, giống cách người bản ngữ vẫn làm hằng ngày khi gặp câu hỏi cần cân nhắc.

### Trường hợp
Anh Khoa, lập trình viên hai mươi bảy tuổi, từng im lặng khá lâu khi bị hỏi về điểm yếu của bản thân. Anh học ba câu đệm và luyện dừng một nhịp thở trước khi trả lời. Ở buổi phỏng vấn sau, anh trả lời bình tĩnh, có ý chính rõ ràng và được hỏi tiếp về dự án đã làm.

Câu hỏi về điểm yếu từng làm anh lúng túng vì anh sợ nói ra điều bất lợi, nên đầu óc trống trơn trong lúc cân nhắc. Khi luyện, anh chọn một câu khen câu hỏi, một câu nhắc lại câu hỏi và một câu xin thời gian suy nghĩ, rồi tập vài phút trước gương vào mỗi buổi tối. Lần phỏng vấn sau, khi lại bị hỏi về điểm yếu, anh nói câu đệm, dừng một nhịp, rồi trả lời rằng anh đôi khi ôm quá nhiều việc và đang học cách chia việc cho đồng đội. Anh kể rằng khoảng dừng ngắn ấy đủ để anh nhớ ra ví dụ cụ thể mà anh định kể từ đầu.

Về sau, anh tiếp tục dùng các câu đệm trong buổi họp hằng tuần với khách hàng nước ngoài, và thấy mình ít bị cuống hơn khi khách hỏi những điều nằm ngoài nội dung đã chuẩn bị.

### Câu hỏi luyện tập
Câu hỏi: Câu đệm nào vừa khen câu hỏi vừa cho bạn thời gian nghĩ? Đáp án: "That is an interesting point, let me think."
Câu hỏi: Sau câu đệm, bạn nên nói gì trước? Đáp án: Ý chính trước, chi tiết sau.
`;

const T3_TOPIC_3 = `## Slide ít chữ, nói nhiều hơn
Thông điệp chính: Mỗi slide một ý và vài chữ khóa, phần còn lại để bạn nói.
Đối tượng: Người đi làm phải thuyết trình bằng tiếng Anh.
Góc nhìn: Slide nhiều chữ khiến người nói đọc lại slide thay vì nói chuyện với người nghe.

### Số liệu và phát hiện
Nghiên cứu về trình bày kết hợp quan sát người nghe trong các buổi báo cáo nội bộ. Theo Tạp chí Truyền thông Doanh nghiệp (mô phỏng): Slide dưới 20 chữ giúp người nghe nhớ ý chính tốt hơn. Khi slide chứa nhiều chữ, người nói có xu hướng đọc lại slide và ít nhìn người nghe.

Phần quan sát được thực hiện ở các buổi báo cáo nội bộ của nhiều phòng ban, nơi người trình bày dùng tiếng Anh vì có đồng nghiệp hoặc quản lý người nước ngoài tham dự. Người quan sát ghi lại lượng chữ trên từng slide, khoảng thời gian người nói quay mặt về phía màn hình, và sau buổi họp thì hỏi người nghe xem họ còn nhớ những ý chính nào.

Ngưỡng dưới hai mươi chữ không phải là một con số kỳ diệu, mà là mốc mà từ đó sự khác biệt bắt đầu rõ rệt. Với những slide gọn như vậy, người nghe thường nhắc lại được ý chính khá sát với điều người nói muốn truyền đạt. Với những slide dày đặc chữ, người nghe hay nhớ các chi tiết rời rạc, hoặc nhớ cảm giác mệt mỏi hơn là nội dung.

Ghi chép về cách người nói hành xử cũng đáng chú ý. Khi slide nhiều chữ, người nói thường xoay người về phía màn hình, đọc gần như nguyên văn, giọng đều và nhanh hơn bình thường. Khi slide chỉ có vài từ khóa, người nói nhìn người nghe nhiều hơn, dùng cử chỉ tay tự nhiên hơn và hay dừng lại hỏi xem mọi người có thắc mắc gì không.

Người quan sát cũng nhận thấy những người dùng tiếng Anh như ngôn ngữ thứ hai có xu hướng đưa nhiều chữ lên slide hơn. Khi được hỏi, nhiều người giải thích rằng họ sợ quên từ hoặc sợ người nghe không quen giọng mình, nên muốn mọi thứ hiện sẵn trên màn hình. Chính lựa chọn ấy lại khiến họ đọc nhiều hơn và trò chuyện với người nghe ít hơn.

Người quan sát còn ghi nhận một chi tiết nhỏ nhưng đáng giá: ở các buổi dùng slide gọn, phần hỏi đáp cuối buổi thường sôi nổi hơn. Người nghe có nhiều câu hỏi hơn vì họ đã theo được mạch trình bày và muốn đào sâu thêm. Ở các buổi dùng slide dày chữ, phần hỏi đáp thường ngắn, và câu hỏi hay xoay quanh việc làm rõ những gì đã viết trên màn hình.

### Vì sao
Slide tối giản với từ khóa giúp người nói giữ kết nối và giúp người nghe nhớ ý chính lâu hơn. Người nghe không thể vừa đọc một đoạn dài trên màn hình vừa nghe người nói, nên một trong hai kênh sẽ bị bỏ qua. Khi mỗi slide chỉ giữ một ý, người nói chuyển ý dễ hơn và người nghe ít bị rối giữa chừng. Người nghe cũng có thời gian ghi nhớ ý vừa nghe trước khi sang slide kế tiếp.

Chữ viết và lời nói cùng đi vào một kênh xử lý ngôn ngữ trong đầu người nghe. Khi màn hình hiện một đoạn văn dài, mắt người nghe tự động bắt đầu đọc, và trong lúc đọc, họ gần như không theo được lời giải thích của người nói. Kết quả là người nói nói một đằng, người nghe đọc một nẻo, và cả hai đều mất công.

Hình ảnh và vài chữ khóa thì khác. Chúng đóng vai trò mốc neo: người nghe liếc qua một lần là nắm được chủ đề, rồi quay lại lắng nghe người nói phát triển ý. Từ khóa trên màn hình và lời giải thích bổ sung cho nhau thay vì tranh giành sự chú ý.

Với người nói, slide nhiều chữ là chiếc phao dễ dùng nhưng phải trả giá. Khi đọc từ màn hình, bạn quay lưng một phần về phía người nghe, giọng mất đi ngữ điệu tự nhiên, và bạn khó nhận ra ai đang bối rối hay muốn đặt câu hỏi. Người nghe có cảm giác bạn đang đọc cho họ nghe chứ không phải đang nói chuyện với họ.

Mỗi slide một ý cũng giúp người nói kiểm soát thời gian tốt hơn. Khi biết mỗi slide chỉ cần nói khoảng một hai phút, bạn dễ nhận ra mình đang chậm hay nhanh so với kế hoạch và điều chỉnh ngay. Với slide chứa ba bốn ý, người nói thường sa vào ý đầu tiên quá lâu rồi phải lướt vội những ý sau, khiến phần quan trọng nhất đôi khi lại bị nói qua loa. Người nghe cũng cảm nhận được nhịp đều đặn đó và yên tâm theo dõi đến cuối bài.

Hãy hình dung một chuyên viên tài chính trình bày kết quả kinh doanh cho đối tác nước ngoài. Nếu slide chứa toàn bộ phần phân tích, đối tác sẽ tự đọc, có thể đi đến kết luận trước khi người trình bày nói xong, thậm chí hiểu sai một chi tiết. Nếu slide chỉ ghi "Revenue up, costs flat" (Doanh thu tăng, chi phí giữ nguyên), người trình bày có cơ hội dẫn dắt người nghe qua từng lý do và trả lời thắc mắc ngay khi nó xuất hiện.

Slide ít chữ còn buộc người nói chuẩn bị kỹ hơn. Khi không thể dựa vào màn hình, bạn phải thật sự hiểu ý mình muốn truyền đạt và luyện cách diễn đạt nó bằng tiếng Anh. Chính quá trình chuẩn bị đó là phần luyện nói có giá trị nhất.

Trong các cuộc họp trực tuyến, vấn đề càng lộ rõ. Khi màn hình chia sẻ là thứ duy nhất người nghe nhìn thấy, slide đầy chữ khiến họ đọc lướt rồi dễ mở sang một cửa sổ khác. Slide gọn đi cùng giọng nói có ngữ điệu giúp giữ người nghe ở lại với bạn, kể cả khi không ai nhìn thấy khuôn mặt bạn.

### Cách làm
- Chọn một ý duy nhất cho mỗi slide.
- Giữ lại vài từ khóa cho ý đó.
- Tập nói ý đó mà không nhìn màn hình.
- Chuẩn bị câu chuyển slide bằng tiếng Anh, ví dụ "Let me walk you through the main idea."

Để chọn một ý cho mỗi slide, hãy thử viết tiêu đề slide thành một câu nêu kết luận, chẳng hạn "Customer complaints dropped after the new process" (Khiếu nại của khách hàng giảm sau khi áp dụng quy trình mới), thay vì tiêu đề chung chung như "Customer feedback". Nếu không thể tóm ý của slide trong một câu, nhiều khả năng slide đó đang chứa hai ý và nên tách làm hai.

Khi giữ từ khóa, hãy ưu tiên danh từ và động từ mang nội dung, bỏ các từ nối và phần giải thích. Một câu dài như "Our team has been able to reduce the processing time of customer requests significantly" có thể rút lại thành "Faster request handling". Phần còn lại sẽ do bạn nói ra, và đó là lúc bạn thể hiện hiểu biết của mình.

Những thông tin bạn sợ quên nên đưa vào phần ghi chú dành cho người trình bày, không đưa lên slide. Phần ghi chú nên viết dưới dạng ý ngắn bằng tiếng Anh, đủ để nhắc chứ không đủ để đọc nguyên văn. Như vậy bạn có chỗ dựa khi cần mà không bị cuốn vào việc đọc.

Khi tập nói không nhìn màn hình, hãy in các slide ra giấy hoặc mở trên điện thoại, nhìn mỗi slide vài giây rồi úp xuống và nói ý đó trong khoảng một phút. Lặp lại cho đến khi bạn nói được trôi chảy chỉ với từ khóa. Sau đó ghi âm một lần chạy thử toàn bộ để nghe xem chỗ nào bạn bị ngắt quãng hoặc chuyển ý chưa mượt.

Câu chuyển slide giúp bài nói liền mạch và cho bạn vài giây để nhớ ý tiếp theo. Ngoài câu mẫu trong danh sách, có thể chuẩn bị thêm "Now let us move on to the budget." (Bây giờ chúng ta chuyển sang phần ngân sách.), "This brings me to my next point." (Điều này dẫn mình đến ý tiếp theo.) và "So what does this mean for us?" (Vậy điều này có ý nghĩa gì với chúng ta?). Câu cuối đặc biệt hữu ích khi chuyển từ số liệu sang kết luận.

Với những slide buộc phải có nhiều số liệu như bảng hay biểu đồ, hãy làm nổi bật con số quan trọng nhất và làm mờ phần còn lại, hoặc đưa bảng đầy đủ vào tài liệu gửi sau buổi họp. Người nghe sẽ biết cần nhìn vào đâu, còn bạn có thêm thời gian để giải thích ý nghĩa của con số đó.

Trước buổi thuyết trình, hãy rà lại toàn bộ slide với một câu hỏi: nếu tắt máy chiếu, mình có nói được bài này không. Nếu câu trả lời là chưa, phần cần luyện thêm là lời nói, không phải thêm chữ vào slide. Có thể nhờ một đồng nghiệp ngồi nghe thử và chỉ ra slide nào khiến họ phải đọc thay vì nghe; đó thường là những slide nên cắt bớt trước tiên.

Khi mới chuyển sang slide ít chữ, đừng đổi toàn bộ bài trong một lần. Hãy bắt đầu với vài slide quan trọng nhất, luyện nói trôi chảy với chúng, rồi dần áp dụng cho các slide còn lại ở những buổi trình bày sau đó.

### Ngộ nhận thường gặp
Ngộ nhận: Slide càng nhiều chữ thì người nghe càng hiểu rõ. Thực tế: Slide dưới 20 chữ giúp người nghe nhớ ý chính tốt hơn.

Ngộ nhận này dễ hiểu vì nhiều người coi slide là tài liệu, nơi mọi thông tin cần được ghi đủ để người nghe xem lại. Nhưng slide trình chiếu và tài liệu đọc có hai chức năng khác nhau. Slide hỗ trợ lời nói trong lúc trình bày, còn tài liệu phục vụ việc đọc kỹ sau đó. Cố gộp hai thứ làm một thường khiến cả hai đều kém đi.

Người nghe không cần thấy mọi chi tiết trên màn hình mới hiểu được vấn đề. Họ cần biết ý chính là gì, vì sao nó quan trọng và nó liên quan đến họ thế nào. Ba điều này người nói truyền đạt bằng lời tốt hơn nhiều so với một khối chữ.

Cũng cần nói rõ rằng ít chữ không đồng nghĩa với slide trống trải hay thiếu thông tin. Một biểu đồ đơn giản, một hình ảnh minh họa đúng ý hoặc một con số lớn đặt giữa màn hình đều có thể truyền tải nhiều hơn cả một đoạn văn. Điều quan trọng là mỗi thứ xuất hiện trên slide đều phục vụ ý chính bạn đang nói.

Một biến thể khác của ngộ nhận này là nghĩ rằng slide ít chữ trông thiếu chuyên nghiệp, hoặc cho thấy người trình bày chuẩn bị qua loa. Thật ra, rút một ý phức tạp thành vài từ khóa đòi hỏi nhiều công sức hơn là chép nguyên đoạn văn, và người nghe trong môi trường quốc tế đã quen với phong cách slide tối giản.

Với người nói tiếng Anh chưa tự tin, slide nhiều chữ trông như một tấm lưới an toàn. Nhưng nếu người nghe đọc được hết trên màn hình, vai trò của người nói gần như biến mất. Khi chuyển phần chữ sang lời nói, bạn lấy lại vai trò đó, và mỗi buổi thuyết trình trở thành một lần luyện nói thực sự.

### Câu hỏi luyện tập
Câu hỏi: Một slide nên có bao nhiêu ý? Đáp án: Một ý, kèm vài từ khóa.
`;

// ---- T2: bản dài (mỗi Topic khoảng 1.300 chữ) ----
const T2_TOPIC_1 = `## Vượt qua nỗi ngại phát biểu
Thông điệp chính: Rào cản lớn nhất khi nói tiếng Anh trong họp là tâm lý, không phải vốn từ.
Đối tượng: Người đi làm 25–40 tuổi họp với đối tác hoặc đồng nghiệp nước ngoài.
Góc nhìn: Một lần phát biểu thành công, dù ngắn, làm giảm rõ nỗi ngại ở các lần sau.

### Số liệu và phát hiện
Phần lớn người đi làm được hỏi cho biết ngại phát biểu trong cuộc họp bằng tiếng Anh. Theo Viện Nghiên cứu Nhân lực (mô phỏng): 58% người được hỏi ngại phát biểu trong họp bằng tiếng Anh. Khảo sát được thực hiện với hơn bốn nghìn người đi làm tại các thành phố lớn, thuộc nhiều ngành như tài chính, công nghệ, sản xuất và dịch vụ. Kỹ năng đọc hiểu và viết email được đánh giá tự tin hơn nhiều so với kỹ năng nói trực tiếp, đặc biệt trong các cuộc họp có nhiều người tham dự.

Một khảo sát khác của cộng đồng người học tìm hiểu điều khiến họ ngại nhất khi nói. Theo Cộng đồng Người học Tiếng Anh (mô phỏng): 64% người học sợ nói sai ngữ pháp hơn sợ không hiểu người khác. Nhiều người kể rằng họ thường soạn sẵn cả câu trong đầu rồi mới nói, và vì chờ câu hoàn hảo nên bỏ lỡ thời điểm phát biểu.

Ở phía quản lý, bản tin nhân sự phỏng vấn nhiều người đang điều hành đội làm việc cùng đồng nghiệp ở các quốc gia khác nhau. Theo Bản tin Nhân sự Việt (mô phỏng): 7 trên 10 quản lý đánh giá cao nhân viên dám hỏi lại khi chưa hiểu. Nhiều quản lý cho biết họ không đánh giá nhân viên qua độ hoàn hảo của ngữ pháp, mà quan tâm đến việc người đó có làm rõ yêu cầu, tóm tắt lại điều đã thống nhất và nêu được vướng mắc kịp thời hay không.

Về phương pháp, bảng hỏi được gửi qua các hội nhóm nghề nghiệp và bộ phận nhân sự của doanh nghiệp, người trả lời tự đánh giá mức tự tin ở từng kỹ năng theo thang điểm từ thấp đến cao. Con số năm mươi tám phần trăm vì vậy phản ánh cảm nhận của chính người đi làm chứ không phải kết quả một bài kiểm tra năng lực. Khi tách theo vị trí, những người thường xuyên phải trình bày như bán hàng hay quản lý dự án vẫn cho biết họ ngại lên tiếng, điều gợi ý rằng họp nhiều tự nó chưa làm nỗi ngại biến mất.

Ở khảo sát của cộng đồng người học, sáu mươi tư phần trăm sợ nói sai hơn sợ không hiểu, tức cứ ba người thì gần hai người đặt nỗi lo về hình thức câu nói lên trên việc nắm được nội dung. Nhiều câu trả lời mở mô tả cùng một cảnh: biết mình muốn nói gì, nhưng phân vân giữa thì quá khứ và hiện tại hoàn thành, rồi cuộc họp trôi qua lúc nào không hay. Một số người còn kể rằng họ thoải mái khi trò chuyện riêng với đồng nghiệp nước ngoài, nhưng lại căng thẳng khi có cấp trên người Việt cùng dự, vì sợ bị đánh giá bởi chính người dễ nhận ra lỗi của mình.

Với nhận định bảy trên mười quản lý đánh giá cao nhân viên dám hỏi lại, điều đáng chú ý là phần lớn quản lý được phỏng vấn cũng không phải người bản ngữ. Họ hiểu rằng một câu hỏi lại đúng lúc có thể tránh được cả tuần làm sai yêu cầu, nên coi đó là dấu hiệu của sự cẩn thận chứ không phải yếu kém. Ba nguồn này khác nhau về cách thu thập, nhưng cùng chỉ về một hướng: khoảng cách giữa năng lực thật và mức sẵn sàng lên tiếng ở người đi làm là khá lớn.

### Vì sao
Khi được hỏi lý do ngại phát biểu, người trả lời nêu ba nhóm nguyên nhân. Nhóm thứ nhất là sợ nói sai ngữ pháp trước đồng nghiệp. Nhóm thứ hai là không kịp suy nghĩ vì cuộc họp diễn ra nhanh. Nhóm thứ ba là cảm giác ý của mình chưa đủ quan trọng để làm gián đoạn cuộc thảo luận. Điều đáng chú ý là nhiều người có vốn từ đủ dùng nhưng vẫn chọn im lặng, cho thấy rào cản chủ yếu nằm ở tâm lý và thói quen hơn là kiến thức.

Khảo sát tìm thấy mối liên hệ giữa mức sợ sai và thói quen luyện nói. Người ít có cơ hội nói thành tiếng thường sợ nhiều hơn, trong khi người nói đều đặn dù chỉ với một người bạn lại ít lo lắng hơn. Nhiều người cho rằng chính những lần được người khác chấp nhận lỗi nhỏ, mà vẫn hiểu ý, đã giúp họ bớt áp lực.

Nhóm tác giả cũng ghi nhận rằng người đã từng phát biểu thành công một lần trong họp có xu hướng phát biểu lại cao hơn hẳn. Một trải nghiệm tích cực, dù ngắn, làm giảm đáng kể mức ngại ở những lần sau. Ở các công ty có văn hóa chấp nhận lỗi nhỏ, tỷ lệ ngại phát biểu thấp hơn đáng kể, cho thấy môi trường làm việc cũng là một yếu tố quan trọng chứ không chỉ năng lực cá nhân.

Có thể hình dung cơ chế này như một vòng lặp. Càng im lặng lâu, người ta càng có ít bằng chứng rằng mình nói được, nên nỗi lo càng có chỗ bám. Khi nỗi lo tăng, họ lại chọn im lặng ở cuộc họp sau. Một lần phát biểu thành công phá vỡ vòng lặp đó vì nó tạo ra một ký ức cụ thể: mình đã nói, người khác đã hiểu, và không có điều gì tệ xảy ra. Ký ức ấy có sức thuyết phục hơn nhiều so với lời động viên chung chung.

Lấy ví dụ một buổi họp tiến độ hằng tuần với đối tác ở Úc. Người điều phối hỏi nhanh xem có ai thấy vướng mắc ở hạng mục này không. Một nhân viên biết rằng dữ liệu đầu vào đang bị chậm, nhưng mất vài giây để nghĩ nên nói "delay" hay "late", và trong vài giây đó buổi họp đã chuyển sang mục khác. Vấn đề không nằm ở việc thiếu từ, mà ở chỗ người đó chưa có sẵn một câu mở lời để giữ lượt nói. Chỉ cần câu "Sorry, one quick point" là cả phòng đã dừng lại chờ.

Áp lực thời gian còn làm trí nhớ làm việc bị quá tải. Khi vừa phải nghe, vừa dịch trong đầu, vừa soát ngữ pháp, não không còn đủ chỗ để sắp xếp ý. Vì thế những câu mở lời thuộc sẵn có tác dụng như một lối tắt: chúng giải phóng phần chú ý để người nói tập trung vào nội dung. Môi trường cũng tác động theo cùng hướng, bởi khi người chủ trì kiên nhẫn chờ và phản hồi tích cực, cái giá của một lỗi nhỏ trở nên thấp và việc lên tiếng bớt đáng sợ.

### Cách làm
- Chuẩn bị trước một câu mở lời ngắn cho mỗi cuộc họp, ví dụ "From my side, I think…".
- Đặt mục tiêu chỉ nói một câu trong cuộc họp tiếp theo, không cần dài.
- Khi chưa hiểu, hỏi lại ngay bằng "Could you say that again, please?" thay vì gật đầu cho qua.
- Cuối cuộc họp, tóm tắt lại một điều đã thống nhất bằng "Just to confirm, we will…".
- Sau mỗi lần nói, ghi lại một điều làm tốt để lần sau tự tin hơn.

Người quản lý cũng có thể giúp bằng cách đề nghị mọi người nói chậm, nhắc lại ý chính cuối mỗi phần và dành thời gian cuối mục để hỏi ý kiến từng người. Một quản lý kể rằng sau khi làm như vậy trong cuộc họp đầu tiên của đội mới, những nhân viên trước đây im lặng bắt đầu đặt câu hỏi.

Hãy bắt đầu từ mục tiêu nhỏ nhất có thể. Trước mỗi cuộc họp, dành năm phút đọc chương trình họp và chọn một mục mà bạn có điều muốn hỏi hoặc bổ sung. Viết ra giấy đúng một câu, nói thầm hai ba lần cho quen miệng. Câu mở lời có thể rất đơn giản, ví dụ "Can I add something here?" (Mình bổ sung một ý được không?) hoặc "I have a quick question about the timeline" (Mình có một câu hỏi nhanh về tiến độ). Khi đã có sẵn câu đầu tiên, phần còn lại thường trôi chảy hơn bạn nghĩ.

Nếu sợ chen ngang, hãy tận dụng những khoảnh khắc người chủ trì mời ý kiến, như khi họ hỏi "Any thoughts?" hay "Anything else?". Đó là lúc lên tiếng ít bị coi là bất lịch sự nhất. Khi hỏi lại, bạn không cần giải thích vì sao mình chưa hiểu; chỉ cần nói "Sorry, I missed the last part" (Xin lỗi, mình chưa nghe kịp đoạn cuối). Khi tóm tắt cuối buổi, có thể dùng thêm "So the next step is…, right?" (Vậy bước tiếp theo là…, đúng không?) để vừa xác nhận vừa mời người khác sửa nếu mình hiểu sai.

Phần ghi chép sau cuộc họp nên thật ngắn: một dòng về câu mình đã nói, một dòng về phản ứng của người nghe. Sau vài tuần, cuốn sổ này trở thành bằng chứng cụ thể giúp bạn bớt nghi ngờ bản thân. Không nên tự đặt mục tiêu quá lớn như phát biểu ở mọi mục, vì một lần không đạt dễ kéo bạn về thói quen im lặng. Tăng dần từ một câu lên hai ba câu khi cảm thấy thoải mái là cách bền hơn.

### Ngộ nhận thường gặp
Ngộ nhận: Phải nói đúng ngữ pháp thì mới nên phát biểu trong họp. Thực tế: Quản lý đánh giá cao việc dám hỏi lại và làm rõ yêu cầu hơn độ hoàn hảo của ngữ pháp.

Ngộ nhận: Người ngại nói là vì vốn từ chưa đủ. Thực tế: Nhiều người có vốn từ đủ dùng nhưng vẫn im lặng; rào cản chủ yếu nằm ở tâm lý và thói quen.

Hai ngộ nhận này thường đi cùng nhau và củng cố lẫn nhau. Người tin rằng phải nói đúng mới được nói sẽ dành thời gian học thêm từ và ngữ pháp, nhưng vì không tập lên tiếng nên vẫn im lặng, rồi lại kết luận rằng vốn từ của mình chưa đủ. Thoát khỏi vòng này đòi hỏi đổi cách đo tiến bộ: thay vì hỏi mình biết bao nhiêu từ, hãy hỏi tuần này mình đã lên tiếng bao nhiêu lần. Trong công việc, một câu chưa trọn ngữ pháp nhưng nói đúng lúc thường có giá trị hơn một câu hoàn hảo nói quá muộn.

### Trường hợp
Chị Lan, chuyên viên tài chính ba mươi mốt tuổi, gần như im lặng trong mọi cuộc họp với văn phòng khu vực suốt một năm. Chị luôn soạn câu trong đầu và chờ đến khi thật đúng mới định nói, nhưng lúc đó cuộc thảo luận đã sang ý khác. Chị đổi cách: mỗi cuộc họp chỉ đặt mục tiêu hỏi lại một lần khi chưa rõ. Lần đầu chị chỉ nói được một câu "Could you say that again, please?", và người quản lý cảm ơn vì câu hỏi giúp cả nhóm làm rõ số liệu. Sau vài tuần, chị bắt đầu chủ động tóm tắt điều đã thống nhất ở cuối cuộc họp.

Chị Lan kể rằng điều khiến chị ngạc nhiên nhất là không ai để ý đến lỗi ngữ pháp nhỏ trong câu của chị, mọi người chỉ quan tâm đến con số cần làm rõ. Chị bắt đầu ghi vào sổ mỗi câu đã nói và phản hồi nhận được. Đến cuối quý, chị đã nêu được một rủi ro về ngân sách ngay trong cuộc họp thay vì gửi email riêng sau đó, và người quản lý giao cho chị phần trình bày ngắn ở buổi họp khu vực kế tiếp.

### Câu hỏi luyện tập
Câu hỏi: Theo khảo sát, người học sợ điều gì hơn: nói sai ngữ pháp hay không hiểu người khác? Đáp án: Sợ nói sai ngữ pháp.
Câu hỏi: Câu nào dùng để hỏi lại khi chưa nghe rõ? Đáp án: "Could you say that again, please?"
`;

const T2_TOPIC_2 = `## Luyện nói ngắn mỗi ngày
Thông điệp chính: Mỗi ngày vài phút nói thành tiếng hiệu quả hơn một buổi dài cuối tuần.
Đối tượng: Người đi làm bận rộn, tự học sau giờ làm.
Góc nhìn: Độ đều quan trọng hơn độ dài của từng buổi, nhất là khi luyện độ trôi chảy.

### Số liệu và phát hiện
Báo cáo tổng hợp dữ liệu từ nhật ký sử dụng của các ứng dụng học ngoại ngữ và một khảo sát bổ sung với người đi làm. Theo Trung tâm Dữ liệu Giáo dục (mô phỏng): Người đi làm dành trung bình 22 phút mỗi ngày cho tự học. Thời gian tự học thực tế thấp hơn nhiều so với mức người học tự kỳ vọng khi đăng ký khóa học, và phần lớn diễn ra vào buổi tối hoặc cuối tuần.

Một nghiên cứu theo dõi hai nhóm người học trưởng thành có trình độ trung cấp trong tám tuần. Nhóm thứ nhất luyện nói ngắn mỗi ngày theo kịch bản gần với tình huống công việc; nhóm thứ hai học dồn một buổi dài vào cuối tuần với tổng thời gian tương đương. Theo Tạp chí Ngôn ngữ Ứng dụng (mô phỏng): Nhóm luyện nói ngắn mỗi ngày trong 8 tuần trôi chảy hơn rõ rệt so với nhóm học dồn.

Báo cáo chia người học thành ba nhóm theo mức duy trì. Nhóm đều đặn học ít nhất năm ngày mỗi tuần, nhưng mỗi buổi rất ngắn. Nhóm thất thường học dồn vài buổi dài rồi nghỉ nhiều ngày liền. Nhóm bỏ dở dừng hẳn sau tháng đầu tiên. Nhóm đều đặn có tổng thời gian học mỗi tuần không hơn nhóm thất thường, nhưng tiến bộ rõ hơn ở các bài kiểm tra nói.

Con số hai mươi hai phút là mức trung bình, nên nó che đi sự chênh lệch lớn giữa các ngày trong tuần. Dữ liệu nhật ký cho thấy nhiều người gần như không học vào những ngày giữa tuần bận rộn, rồi bù lại bằng một buổi dài vào thứ Bảy hoặc Chủ Nhật. Khảo sát bổ sung hỏi về khung giờ thường dùng, và câu trả lời phổ biến là sau bữa tối hoặc trước khi ngủ, khi năng lượng đã xuống thấp. Điều này giải thích vì sao nhiều buổi học dự định kéo dài lại kết thúc sớm hơn kế hoạch.

Trong nghiên cứu tám tuần, người tham gia làm bài kiểm tra nói ở đầu và cuối giai đoạn với cùng một dạng đề: kể lại một việc đã làm và trả lời một câu hỏi bất ngờ về công việc. Giám khảo chấm độc lập và không biết người được chấm thuộc nhóm nào. Tiêu chí gồm độ trôi chảy, số lần ngắt quãng, độ rõ ràng của ý và mức chính xác của câu. Nhóm luyện ngắn mỗi ngày tiến bộ rõ ở những tiêu chí gắn với tốc độ và mạch nói, còn độ chính xác ngữ pháp của hai nhóm thay đổi không khác nhau nhiều.

Ở phần phân nhóm theo mức duy trì, điều đáng chú ý là nhóm bỏ dở không phải những người có ít thời gian nhất. Nhiều người trong nhóm này khởi đầu bằng kế hoạch rất tham vọng, học dài mỗi tối trong tuần đầu, rồi dừng hẳn khi công việc dồn lại. Ngược lại, nhóm đều đặn thường bắt đầu nhỏ và giữ gần như nguyên mức đó suốt quá trình theo dõi.

Từ góc nhìn của người làm báo cáo, phát hiện quan trọng nhất không nằm ở con số thời gian mà ở hình dạng của lịch học. Hai người cùng dành khoảng hai tiếng rưỡi mỗi tuần có thể có kết quả rất khác nhau, tùy thời gian ấy được rải đều hay dồn vào một chỗ. Nhóm nghiên cứu khuyến nghị các ứng dụng nên hiển thị số ngày luyện nói trong tuần thay vì chỉ hiển thị tổng số phút, để người học nhìn thấy đúng điều đang tạo ra tiến bộ.

### Vì sao
Các tác giả giải thích rằng việc nói thường xuyên giữ cho các cụm câu quen thuộc luôn sẵn sàng, nên người nói ít phải nghĩ từng từ khi cần phản hồi nhanh. Nhóm học dồn cải thiện chậm hơn và có nhiều người giảm phong độ ở đầu tuần sau, khi phải khởi động lại. Kết quả chấm cho thấy cải thiện rõ nhất nằm ở số lần ngắt quãng, trong khi độ rõ ràng của ý tăng ở cả hai nhóm.

Thông điệp học thật nhiều mỗi ngày khó thực hiện với người đi làm và có thể làm họ nản khi bỏ lỡ một buổi. Mục tiêu nhỏ, cụ thể và có thể hoàn thành ngay cả vào ngày bận giúp người học giữ cảm giác tiến bộ thay vì cảm giác nợ bài. Người học cũng thường tính cả thời gian nghe thụ động vào thời gian học, nên đo bằng số lần nói thành tiếng phản ánh đúng mức luyện tập hơn số phút mở ứng dụng.

Nghiên cứu có hạn chế: mẫu khảo sát nhỏ và chủ yếu là người tự nguyện, nên kết luận chưa thể áp dụng cho mọi người. Một số giáo viên cũng cho rằng người thiếu nền ngữ pháp có thể lặp lại một lỗi nhiều tháng; họ đề nghị dành thời gian ngắn mỗi buổi để sửa lỗi phổ biến nhất. Hai hướng không loại trừ nhau, và thứ tự ưu tiên nên theo mục tiêu của người học.

Có thể so sánh việc nói với việc đi một con đường quen. Con đường được đi mỗi ngày luôn thông thoáng, còn con đường mỗi tuần mới đi một lần thì lần nào cũng phải dò lại. Khi người học nói một cụm như "I'm working on the report" hằng ngày, cụm đó dần thành một khối, và lúc cần dùng trong cuộc họp, họ không phải ráp từng từ. Người học dồn có thể nói khá tốt trong buổi học, nhưng đến thứ Hai các khối ấy đã lỏng ra.

Một ví dụ cụ thể: một nhân viên phải cập nhật tiến độ với trưởng nhóm người nước ngoài vào sáng thứ Hai. Nếu buổi luyện nói gần nhất đã cách gần một tuần, những câu quen như "Last week I finished…" phải nghĩ lại từ đầu. Nếu tối thứ Sáu và tối Chủ Nhật vừa nói vài phút về chính công việc ấy, câu chữ đã có sẵn, và phần chú ý được dành cho nội dung.

Về mặt động lực, mỗi buổi ngắn hoàn thành là một lần tự khẳng định nhỏ. Chuỗi ngày liên tiếp tạo ra mong muốn giữ nhịp, trong khi một kế hoạch dài bị lỡ dễ biến thành cảm giác thất bại và khiến người học trì hoãn tiếp. Vì vậy, mục tiêu nhỏ mà ngày mệt vẫn làm được có giá trị hơn mục tiêu lớn chỉ đạt được vào ngày rảnh. Những hạn chế mà nghiên cứu nêu ra cũng nhắc rằng luyện đều là điều kiện cần cho độ trôi chảy, nhưng không thay được phản hồi về lỗi; kết hợp cả hai sẽ cân bằng hơn.

Còn một lý do thực tế nữa: buổi ngắn ít bị công việc chen ngang. Một buổi dài cuối tuần rất dễ bị hủy vì việc gia đình, một cuộc hẹn hay đơn giản là mệt, và khi đã hủy thì cả tuần trôi qua không luyện gì. Vài phút mỗi tối thì gần như luôn tìm được chỗ trong lịch, kể cả trong tuần cao điểm cuối quý.

### Cách làm
- Chọn một khung giờ cố định mỗi ngày, gắn với một việc bạn đã làm sẵn.
- Nói to vài phút về một tình huống công việc có thật trong ngày.
- Ghi âm, nghe lại một lần và chọn đúng một lỗi để sửa.
- Đếm số ngày liên tiếp có nói thành tiếng, thay vì đếm số phút học.
- Ngày bận chỉ cần nói một câu để không đứt nhịp.

Gắn khung giờ với một việc sẵn có là chìa khóa của cả quy trình. Ví dụ, nói ngay sau khi pha cà phê buổi sáng, trong lúc chờ thang máy về nhà, hoặc sau khi tắm buổi tối. Khi việc luyện nói bám vào một thói quen đã vững, bạn không cần dùng ý chí để nhớ ra phải học. Chủ đề nên lấy từ chính ngày làm việc: việc đã xong, việc đang vướng, việc ngày mai. Có thể dùng khung ba câu "Today I worked on…" (Hôm nay mình làm…), "The tricky part was…" (Phần khó là…) và "Tomorrow I will…" (Ngày mai mình sẽ…).

Khi nghe lại bản ghi âm, đừng cố sửa mọi thứ. Chọn lỗi lặp lại nhiều nhất hoặc chỗ bạn ngập ngừng lâu nhất, rồi nói lại đúng câu đó vài lần cho trơn. Nếu khó tự nhận ra lỗi, có thể nhờ một đồng nghiệp nghe giúp hoặc dùng công cụ chuyển giọng nói thành chữ để xem máy có hiểu đúng ý không. Cách đếm chuỗi ngày có thể làm thật đơn giản: đánh dấu lên tờ lịch giấy dán cạnh bàn, mỗi ngày có nói thành tiếng là một dấu.

Với ngày bận, câu duy nhất có thể là "Today was busy, but I finished the client report" (Hôm nay bận, nhưng mình đã xong báo cáo cho khách hàng). Một câu như vậy nghe có vẻ không đáng kể, nhưng nó giữ cho chuỗi không đứt và giữ thói quen ở đúng chỗ. Chỉ nên tăng thời lượng thật chậm, khi việc luyện đã trở nên tự nhiên trong vài tuần liền; tăng quá sớm dễ đưa bạn trở lại kiểu học dồn.

### Ngộ nhận thường gặp
Ngộ nhận: Học dồn một buổi dài cuối tuần cũng hiệu quả như luyện ngắn mỗi ngày. Thực tế: Với tổng thời gian tương đương, nhóm luyện nói ngắn mỗi ngày trong 8 tuần trôi chảy hơn rõ rệt.

Ngộ nhận: Mở ứng dụng nghe nhiều là đã luyện nhiều. Thực tế: Thời gian nghe thụ động không thay được số lần nói thành tiếng.

Hai ngộ nhận này bắt nguồn từ cùng một thói quen: lấy số phút làm thước đo. Số phút dễ đếm và cho cảm giác đã nỗ lực, nhưng nó không cho biết miệng đã thực sự luyện được bao nhiêu câu. Một buổi ba tiếng cuối tuần có thể dành phần lớn cho đọc ghi chú và nghe, trong khi vài phút nói mỗi tối buộc người học tự tạo câu. Nghe vẫn có ích cho phát âm và vốn từ, nhưng đó là phần bổ trợ, không phải phần thay thế cho việc tự nói.

### Trường hợp
Anh Minh, kỹ sư phần mềm hai mươi tám tuổi, từng dành trọn sáng Chủ Nhật để học tiếng Anh nhưng đến thứ Hai lại quên gần hết. Anh chuyển sang nói to vài phút mỗi tối về việc đã làm trong ngày, ghi âm và chỉ sửa một lỗi mỗi lần. Sau hai tháng, anh nhận ra mình ít phải dừng giữa câu hơn trong các buổi trao đổi với nhóm ở nước ngoài.

Anh Minh kể rằng tuần đầu anh thấy nói một mình khá ngượng, nên chọn nói lúc đang rửa bát để bớt cảm giác đang học. Lỗi anh sửa nhiều nhất là quên chia động từ ở thì quá khứ khi kể việc đã làm. Có những tối mệt, anh chỉ nói đúng một câu, nhưng nhờ vậy chuỗi ngày trên lịch không bị đứt. Trưởng nhóm của anh nhận xét rằng phần cập nhật đầu tuần của anh ngắn gọn và rõ hơn trước.

### Câu hỏi luyện tập
Câu hỏi: Trong nghiên cứu tám tuần, nhóm nào trôi chảy hơn? Đáp án: Nhóm luyện nói ngắn mỗi ngày.
Câu hỏi: Nên đo việc luyện tập bằng gì? Đáp án: Bằng số lần nói thành tiếng, không phải số phút mở ứng dụng.
`;

const T2_TOPIC_3 = `## Mẫu câu cho cuộc họp trực tuyến
Thông điệp chính: Một nhóm nhỏ mẫu câu dùng đúng lúc đủ để tham gia hầu hết cuộc họp nội bộ.
Đối tượng: Nhân viên văn phòng họp trực tuyến với đồng nghiệp nước ngoài.
Góc nhìn: Học mẫu câu theo chức năng giúp dùng đúng lúc hơn học từ vựng chuyên ngành.

### Số liệu và phát hiện
Báo cáo thống kê về làm việc từ xa ghi nhận số cuộc họp trực tuyến mà nhân viên văn phòng tham dự trong một tuần điển hình. Theo Báo cáo Làm việc Từ xa (mô phỏng): Nhân viên văn phòng dự trung bình 6 cuộc họp trực tuyến mỗi tuần. Nhóm làm việc với đối tác nước ngoài họp nhiều hơn và thường xuyên phải dùng tiếng Anh ở ít nhất một cuộc mỗi tuần.

Một blog kỹ năng văn phòng tổng hợp các mẫu câu xuất hiện thường xuyên trong họp nội bộ bằng tiếng Anh, từ mở đầu, xin ý kiến, đồng ý, phản biện nhẹ cho đến chốt hành động. Theo Blog Kỹ năng Văn phòng (mô phỏng): Khoảng 20 mẫu câu bao phủ phần lớn tình huống trong họp nội bộ. Tác giả thu thập từ biên bản họp của nhiều công ty, sau đó loại những câu quá đặc thù và giữ lại các mẫu dùng được ở nhiều ngành.

Sáu cuộc họp mỗi tuần nghĩa là trung bình hơn một cuộc mỗi ngày làm việc, và với nhiều người, đó là nơi họ nói tiếng Anh nhiều nhất. Báo cáo tổng hợp từ khảo sát nhân viên ở các doanh nghiệp có văn phòng hoặc đối tác ở nước ngoài, hỏi về số cuộc họp, thời lượng và ngôn ngữ chính được dùng. Phần lớn các cuộc họp tiếng Anh là họp nội bộ ngắn như cập nhật tiến độ, rà soát công việc hay họp nhanh đầu tuần, chứ không phải các buổi đàm phán hay thuyết trình lớn.

Về con số khoảng hai mươi mẫu câu, tác giả nhấn mạnh rằng đây là kết quả gom nhóm theo chức năng chứ không phải đếm câu nguyên văn. Mỗi mẫu có thể có vài biến thể, chẳng hạn "Could you say that again?" và "Sorry, could you repeat that?" được tính là cùng một mẫu xin làm rõ. Khi xếp theo tần suất, các mẫu xin làm rõ và xác nhận lại xuất hiện nhiều nhất, tiếp theo là các mẫu bày tỏ ý kiến ngắn và chốt việc. Thuật ngữ chuyên ngành có xuất hiện, nhưng thường nằm trong phần nội dung do người phụ trách trình bày, ít khi là câu người tham dự phải tự tạo ra.

Hai nguồn trên thu thập theo cách khác nhau, một dựa vào khảo sát, một dựa vào biên bản họp, nên không thể ghép trực tiếp thành một kết luận định lượng. Tuy vậy, khi đặt cạnh nhau, chúng gợi ra một bức tranh dễ hiểu: người đi làm họp trực tuyến khá thường xuyên, và phần ngôn ngữ cần cho các cuộc họp đó lặp lại nhiều hơn người học tưởng.

Báo cáo cũng ghi nhận những khó khăn mà người tham dự tự kể, như âm thanh bị vọng, nhiều người cùng nói một lúc, hay người chủ trì chuyển chủ đề quá nhanh. Trong các tình huống đó, nhóm mẫu câu xin làm rõ trở nên đặc biệt cần thiết, vì người nghe không thể dựa vào khẩu hình hay ngữ cảnh trong phòng như khi ngồi cùng bàn. Một số người trả lời cho biết họ từng đồng ý với một đầu việc mà không hiểu hết, chỉ vì ngại hỏi lại qua màn hình.

### Vì sao
Họp trực tuyến có nhịp phát biểu nhanh hơn và khoảng lặng ngắn hơn họp trực tiếp. Người tham gia khó có thời gian nghĩ câu trả lời, trong khi chậm một nhịp là người khác đã nói tiếp. Nhiều người phát biểu ít đi vì ngại chen ngang qua màn hình, nhất là khi âm thanh bị trễ, và tỷ lệ bật camera thấp hơn khi cuộc họp dùng tiếng Anh vì họ ngại bị nhìn thấy khi đang tìm từ.

Người học thường ôn quá nhiều từ vựng chuyên ngành mà bỏ qua các mẫu câu nền tảng. Trong khi đó, phần lớn thời gian của một cuộc họp nội bộ dùng đi dùng lại một nhóm nhỏ câu quen thuộc. Học thuộc và luyện nói to những câu đó là cách nhanh nhất để tăng sự tự tin ở cuộc họp tiếp theo. Các câu nối nhỏ như "Let me think about that" hay "Good point" không mang thông tin chính nhưng cho người nói thêm một hai giây suy nghĩ.

Ở họp trực tiếp, người ta có thể dùng ánh mắt, cử chỉ hoặc hơi nghiêng người về phía trước để báo hiệu muốn nói. Trên màn hình, những tín hiệu ấy gần như biến mất, nên lời nói phải tự làm nhiệm vụ giữ lượt. Đó là lý do các câu như "Can I jump in here?" (Mình xen vào một chút được không?) quan trọng hơn hẳn trong họp trực tuyến. Chúng không chứa nội dung chuyên môn, nhưng mở ra khoảng trống để nội dung được nói ra.

Hãy hình dung một cuộc họp rà soát với đội ở Ấn Độ, khi trưởng nhóm hỏi liệu hạn chót thứ Sáu có khả thi không. Người biết dữ liệu đang chậm có thể mất nhiều giây để ghép câu từ đầu. Nhưng nếu đã quen với "From my side, I think we need two more days", câu trả lời đến gần như ngay lập tức. Học theo chức năng giúp người nói biết ngay mình đang cần loại câu nào, thay vì lục trong trí nhớ một từ chuyên ngành phù hợp.

Học mẫu câu theo nhóm chức năng cũng giúp nhớ lâu hơn, vì mỗi câu gắn với một khoảnh khắc cụ thể trong cuộc họp. Khi khoảnh khắc đó lặp lại, như lúc cần xác nhận hay lúc kết thúc, câu tương ứng tự bật ra. Từ vựng chuyên ngành thì người học đã tiếp xúc hằng ngày qua tài liệu và email, nên thường không phải là điểm nghẽn khi nói.

Ngoài ra, họp trực tuyến thường có cấu trúc khá giống nhau: chào hỏi, điểm qua chương trình, cập nhật từng mục, hỏi đáp và chốt việc. Chính sự lặp lại này làm cho mẫu câu theo chức năng phát huy tác dụng. Người tham dự chỉ cần biết mình đang ở giai đoạn nào của cuộc họp là có thể đoán được loại câu sẽ cần, giống như người lái xe quen đường biết trước chỗ nào phải rẽ.

### Cách làm
- Nhóm xin làm rõ: "Could you say that again?" và "Just to confirm, you mean…".
- Nhóm bày tỏ ý kiến: "From my side, I think…" và "One thing to add is…".
- Nhóm chốt việc: "Let me summarize the next steps" và "I will send the notes by tomorrow".
- Chọn ba câu nối quen miệng nhất và luyện nói thật nhanh cho đến khi không phải nghĩ.
- Khi chưa chen vào được, dùng phần trò chuyện chữ để nêu ý rồi xin nói thêm.

Các nhóm cũng có thể đặt quy ước phát biểu, như dành thời gian cuối mỗi mục để hỏi ý kiến từng người, giúp người ngại nói tiếng Anh có điểm vào rõ ràng. Bật micro từng người một cách nhẹ nhàng cũng giúp giảm cảm giác bị quan sát.

Bắt đầu bằng việc chọn hai câu từ mỗi nhóm, tổng cộng sáu câu, và chỉ dùng chừng đó trong tuần đầu. Trước mỗi cuộc họp, đọc to cả sáu câu một lượt để đánh thức chúng. Trong cuộc họp, đặt mục tiêu dùng ít nhất một câu, ưu tiên nhóm xin làm rõ vì đó là nhóm có nhiều cơ hội dùng nhất. Khi đã quen, thêm dần các biến thể như "Sorry, you cut out for a second" (Xin lỗi, tiếng của bạn vừa bị mất một chút) cho lúc đường truyền kém, hay "I agree with Nam's point" (Mình đồng ý với ý của Nam) khi muốn ủng hộ ý người khác.

Với câu nối, nên chọn những câu bạn thấy tự nhiên khi nói, như "That makes sense" (Nghe hợp lý đấy), "Good question" (Câu hỏi hay) hoặc "Let me check and get back to you" (Để mình kiểm tra rồi phản hồi lại). Nói nhanh vài lần mỗi ngày cho đến khi câu bật ra như tiếng Việt. Khung trò chuyện chữ cũng rất hữu ích: gõ "I have a question about the budget" rồi chờ người chủ trì mời nói là cách lịch sự để giữ chỗ khi chưa tìm được lúc chen vào.

Để luyện trước, có thể mô phỏng một cuộc họp ngắn với chính mình: bật chế độ ghi hình trên máy tính, đọc một đoạn tình huống giả định rồi trả lời bằng đúng các mẫu câu đã chọn. Cách này giúp bạn quen với việc nói trước màn hình và nghe lại giọng mình qua loa, điều mà nhiều người thấy lạ trong những lần đầu. Nếu có đồng nghiệp cùng muốn luyện, hai người có thể thay nhau đóng vai người chủ trì và người tham dự trong mười lăm phút giờ nghỉ trưa.

Khi áp dụng, không cần dùng mẫu câu một cách máy móc. Nếu nghe đồng nghiệp nước ngoài dùng một cách nói khác cho cùng chức năng, hãy ghi lại và thử dùng ở buổi họp sau. Cuối mỗi tuần, xem lại danh sách và thay những câu chưa từng dùng bằng câu bạn thực sự cần.

### Ngộ nhận thường gặp
Ngộ nhận: Muốn họp tốt bằng tiếng Anh phải học thật nhiều từ vựng chuyên ngành. Thực tế: Khoảng 20 mẫu câu bao phủ phần lớn tình huống trong họp nội bộ.

Ngộ nhận: Tắt camera và micro là an toàn nhất khi chưa tự tin. Thực tế: Im lặng suốt buổi khiến cuộc họp kém hiệu quả; một câu mẫu dùng đúng lúc đã đủ để tham gia.

Ngộ nhận về từ vựng chuyên ngành dễ hiểu, vì nó cho cảm giác học đúng trọng tâm công việc. Nhưng phần lớn thuật ngữ người đi làm đã gặp hằng ngày qua tài liệu, còn chỗ họ hay mắc lại là những câu rất bình thường như xin nói lại hay hẹn gửi biên bản. Với việc tắt camera và micro, im lặng giúp tránh lỗi trước mắt, nhưng khiến người khác không biết bạn đã hiểu hay chưa, và lâu dần làm bạn mất chỗ đứng trong nhóm. Bật camera ở phần đầu và cuối buổi, nơi thường có lời chào và phần chốt việc dễ đoán, là một bước trung gian hợp lý.

### Trường hợp
Chị Vy, điều phối dự án hai mươi chín tuổi, mỗi tuần có vài cuộc họp trực tuyến với nhóm ở Singapore nhưng thường chỉ nhắn ý kiến qua tin nhắn sau buổi họp. Chị in ra sáu mẫu câu theo ba nhóm xin làm rõ, bày tỏ ý kiến và chốt việc, dán cạnh màn hình. Tuần đầu chị dùng được câu "Just to confirm, you mean…", tuần sau chị tự tóm tắt các bước tiếp theo ở cuối buổi họp.

Chị Vy kể rằng tờ giấy cạnh màn hình giúp chị bớt hoảng mỗi khi được gọi tên, vì chỉ cần liếc qua là có câu để bắt đầu. Có buổi đường truyền chập chờn, chị gõ trước câu hỏi vào phần trò chuyện chữ rồi mới bật micro nói thêm. Sau khoảng một tháng, chị gỡ tờ giấy xuống vì đã thuộc, và thay bằng vài câu mới học được từ cách nói của đồng nghiệp ở Singapore.

### Câu hỏi luyện tập
Câu hỏi: Câu nào dùng để chốt việc ở cuối cuộc họp? Đáp án: "Let me summarize the next steps."
Câu hỏi: Theo báo cáo, nhân viên văn phòng dự trung bình bao nhiêu cuộc họp trực tuyến mỗi tuần? Đáp án: 6 cuộc.
`;

function topicFileMd(title, context, parts) {
  return `# ${title}\n\n${context}\n\n${parts.join('\n')}`;
}
const SEED_TOPIC_FILES = {
  '2026-10-05': {
    v1: topicFileMd('Bắt đầu lại với tiếng Anh sau giờ làm', 'Bối cảnh chung: ba Topic cùng trả lời câu hỏi làm sao người đi làm giữ được việc học tiếng Anh sau giờ làm. Topic 1 nói về khối lượng học, Topic 2 về thời điểm học, Topic 3 về người học cùng.', [T1_TOPIC_1_V1, T1_TOPIC_2, T1_TOPIC_3]),
    v2: topicFileMd('Bắt đầu lại với tiếng Anh sau giờ làm', 'Bối cảnh chung: ba Topic cùng trả lời câu hỏi làm sao người đi làm giữ được việc học tiếng Anh sau giờ làm. Topic 1 nói về khối lượng học, Topic 2 về thời điểm học, Topic 3 về người học cùng.', [T1_TOPIC_1_V2, T1_TOPIC_2, T1_TOPIC_3]),
  },
  '2026-10-12': {
    v1: topicFileMd('Nói tiếng Anh trong cuộc họp', 'Bối cảnh chung: ba Topic dưới đây cùng xoay quanh việc người đi làm dám nói trong cuộc họp bằng tiếng Anh. Topic 1 nói về nỗi ngại và vì sao nó xuất hiện, Topic 2 về cách luyện để nói trôi chảy hơn, Topic 3 về các mẫu câu dùng được ngay trong họp trực tuyến. Ba Topic bổ sung cho nhau: hiểu rào cản, luyện nền, rồi có công cụ để dùng.', [T2_TOPIC_1, T2_TOPIC_2, T2_TOPIC_3]),
  },
  '2026-10-19': {
    v1: topicFileMd('Thuyết trình và phỏng vấn bằng tiếng Anh', 'Bối cảnh chung: ba Topic cùng giúp người đi làm nói có cấu trúc khi bị đánh giá: mở đầu bằng phần giới thiệu, xử lý câu hỏi khó, và trình bày bằng slide.', [T3_TOPIC_1, T3_TOPIC_2_V1, T3_TOPIC_3]),
    v2: topicFileMd('Thuyết trình và phỏng vấn bằng tiếng Anh', 'Bối cảnh chung: ba Topic cùng giúp người đi làm nói có cấu trúc khi bị đánh giá: mở đầu bằng phần giới thiệu, xử lý câu hỏi khó, và trình bày bằng slide.', [T3_TOPIC_1, T3_TOPIC_2_V2, T3_TOPIC_3]),
  },
};

// ---------- 06 · Dữ liệu demo v2.8 — Nói Được English (mọi số liệu là số kiểm thử, mô phỏng) ----------
// Viết một lượt sinh cho ô theo phiên bản Topic (AI-03). Trả về null khi Cột Câu chuyện mà Topic không có trường hợp (D100).
function addCellGen(S, cell, topicVersionN, state, createdAt) {
  const row = byId(S.topics, cell.topicId);
  const iv = row.versions.find(v => v.n === topicVersionN);
  const col = byId(S.columns, cell.columnId);
  const file = topicFileOf(S, cell.weekId);
  const n = cell.gens.length + 1;
  const mock = writeCell(iv, col, n, file ? file.context : '');
  if (mock == null) return null;
  // AI thật (mục 10.39): kết quả đã chuẩn bị sẵn thì dùng, không thì bản mô phỏng
  const ai = aiCellText(S, cell, iv, col, file ? file.context : '', mock, n);
  const text = ai ? ai.text : mock;
  const sc = (ai && ai.score) || scoreText(text, col.criteria, `${cell.id}|${n}`);
  const gen = { n, topicVersion: topicVersionN, createdAt: createdAt || S.settings.demoNow, text, imagePrompt: (ai && ai.imagePrompt) || writeImagePrompt(iv, col, n), scores: sc.scores, total: sc.total, tip: sc.tip, edits: [] };
  if (ai) gen.ai = { provider: ai.provider, model: ai.model, scored: !!ai.score, ...skillTag(col) };
  cell.gens.push(gen);
  cell.byVersion[topicVersionN] = { state: state || 'DRAFT', currentRef: { genN: n, editRev: 0 }, approvedAt: state === 'APPROVED' ? gen.createdAt : null };
  return gen;
}
function cancelCell(cell, topicVersionN) { cell.byVersion[topicVersionN] = { state: 'CANCELLED', currentRef: null, approvedAt: null }; }

function buildSeed() {
  const S = emptyState();
  Object.assign(S, defaultSetup());
  S.isDemo = true;
  setBrandMd(S, TEMPLATES.brand); setVoiceMd(S, TEMPLATES.voice);
  const at = (d, t) => `${d}T${t}`;
  // Viết mọi ô (Topic × Cột) chưa có bài cho phiên bản Topic hiện hành; Câu chuyện không có trường hợp thì Hủy
  const writeCells = (w, filter, state, when) => {
    cellsOf(S, w.id).forEach(c => {
      const row = byId(S.topics, c.topicId);
      if (c.byVersion[row.currentVersion] || (filter && !filter(c))) return;
      if (addCellGen(S, c, row.currentVersion, state, when) == null) cancelCell(c, row.currentVersion);
    });
  };
  const images = (w, perSlot) => weekSlots(S, w.id).forEach((s, i) => s.assets.forEach((a, k) => { for (let n = 0; n < perSlot(i, k); n++) genSlotImage(S, s.id, k, s.date + 'T08:00'); }));

  // ---- T1: 05/10, Tuần chuẩn, đã chốt, đã đăng đủ; Topic 1 có v1 và v2 ----
  const t1 = ensureWeek(S, '2026-10-05').week;
  importTopics(S, t1.id, SEED_TOPIC_FILES['2026-10-05'].v1, at('2026-10-01', '08:30'));
  const r1 = topicsOf(S, t1.id);
  // v1 của Topic 1: viết 4 trong 5 ô (ô Luyện tập chưa từng viết cho v1)
  writeCells(t1, c => c.topicId === r1[0].id && c.columnId !== 'col-luyentap', 'APPROVED', at('2026-10-01', '10:02'));
  importTopics(S, t1.id, SEED_TOPIC_FILES['2026-10-05'].v2, at('2026-10-01', '15:30'));
  writeCells(t1, null, 'APPROVED', at('2026-10-01', '16:05'));
  applyTemplateWeek(S, '2026-10-05', 'wt-1');
  dealSlots(S, t1.id, at('2026-10-02', '09:00'));
  // Đã đăng đủ: kênh Tự động có link giả, kênh Thủ công đã dán link (mục 10.22); số liệu thêm ở cuối theo giờ demo
  weekSlots(S, t1.id).forEach((s, i) => {
    s.confirmedText = s.text;
    const auto = channelPublish(S, s.channelId).mode === 'auto';
    publishNow(S, s, auto ? 'auto' : 'manual', tsAddMin(slotTs(s), auto ? hash32(`${s.id}|jit`) % 4 : 4 + i % 9), { url: mockPostUrl(S, s), asConfirmed: !(i === 3 || i === 8), simulated: auto });
  });
  images(t1, (i, k) => (i % 5 === 0 ? 1 : 0)); // Chia bài đã tạo bản 1; vài ảnh được gen thêm bản 2
  Object.assign(t1, { status: 'CONFIRMED', revision: 1, confirmedAt: at('2026-10-04', '21:00') });

  // ---- T2: 12/10 (tuần hiện tại), Tuần nhẹ, Topic dài; đã Chia bài, slot chưa duyệt ----
  const t2 = ensureWeek(S, '2026-10-12').week;
  applyTemplateWeek(S, '2026-10-12', 'wt-2');
  importTopics(S, t2.id, SEED_TOPIC_FILES['2026-10-12'].v1, at('2026-10-11', '20:10'));
  writeCells(t2, null, 'APPROVED', at('2026-10-11', '21:00'));
  dealSlots(S, t2.id, at('2026-10-12', '08:30'));
  // Chia bài đã tạo luôn ảnh cho mọi ô ảnh (mục 10.8)

  // ---- T3: 19/10, Tuần chuẩn; slot đã lập nhưng chưa Chia bài; ô đang duyệt; Topic 2 có v1 và v2; Topic 3 không có trường hợp ----
  const t3 = ensureWeek(S, '2026-10-19').week;
  applyTemplateWeek(S, '2026-10-19', 'wt-1');
  importTopics(S, t3.id, SEED_TOPIC_FILES['2026-10-19'].v1, at('2026-10-10', '09:00'));
  const r3 = topicsOf(S, t3.id);
  writeCells(t3, c => c.topicId === r3[1].id, 'APPROVED', at('2026-10-10', '10:15'));
  importTopics(S, t3.id, SEED_TOPIC_FILES['2026-10-19'].v2, at('2026-10-11', '14:20'));
  writeCells(t3, null, 'APPROVED', at('2026-10-11', '15:00'));
  const draft = (row, colId) => { const c = cellAt(S, t3.id, row.id, colId); const v = row.currentVersion; Object.assign(c.byVersion[v], { state: 'DRAFT', approvedAt: null }); return c.gens[c.gens.length - 1]; };
  // Ô có cụm từ cấm (HR-02)
  { const g = draft(r3[0], 'col-batngo'); g.text = g.text.replace('## CTA', 'Chỉ cần dám mở lời, bạn sẽ chắc chắn nói giỏi trước hội đồng.\n\n## CTA'); }
  // Ô quá dài (HR-01): chèn thêm câu của chính Topic 2
  { const g = draft(r3[1], 'col-luyentap');
    const extra = splitSentences(topicCurrent(r3[1]).text.replace(/^#{1,6}\s+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '')).slice(0, 8).join(' ');
    g.text = g.text.replace('## Câu hỏi', `${extra}\n\n## Câu hỏi`); }
  // Ô chưa duyệt, không cảnh báo
  draft(r3[2], 'col-huongdan');

  S.ui.weekStart = '2026-10-12';
  syncMetrics(S);
  S.audit = [];
  log(S, 'seed', 'state', 'demo', 'Nạp dữ liệu demo');
  return S;
}

// ---------- 99 · Xuất API ----------
const AC = {
  DATA_VERSION, STORAGE_KEY, RELEASE, TEMPLATES, STEP_NAMES, STEP_COUNT, RULE_NAMES, WEEKDAY_SHORT, WEEKDAY_LONG, LAYOUTS,
  DEFAULT_CELL_CRITERIA, DEFAULT_SLOT_CRITERIA, BRAND_HEADINGS, VOICE_HEADINGS, TOPIC_MAX, TOPIC_SHORT_WORDS,
  clone, hash32, sha256, fold, foldWithMap, addDays, weekdayOf, mondayOf, isValidYMD, isValidTime, isoWeek, dmy, dmyFull, minutesOf, parseYMD, fmtYMD,
  countWords, splitSentences, isValidUrl,
  parseBrand, parseVoice, parseTopics, topicSubsections, parseFrontmatter,
  checkRules, summarizeWarnings, extractNumbers, lengthOf, slidesOf, hashtagsOf, paragraphsOf,
  scoreText, paraBreak, labelOf, defaultLayoutGuide, columnLayoutGuide, layoutSkeleton, cellPrompt, layoutIssues, tidyMarkdown, reformatCell, plainSocial, TOPIC_STYLES, DEFAULT_TOPIC_FRAME, topicFrameOf, validateTopicFrame, setTopicFrame, resetTopicFrame, matchTopicSection, topicFramePrompt, agentPromptOf, normalizeTopicMd, FRAME_RATIOS, FRAME_RATIO_LABEL, BUILTIN_FRAMES, frameStyleOf, setFrameStyle, framesOf, frameOf, assetRatio, framesFor, validateFrame, saveFrame, deleteFrame, frameTitleHint, addSlotImageVersion, i2iSlotImage, i2iLook,
  TEXT_FONTS, TEXT_EFFECTS, TEXT_PLACES, newTextLayer, normTextLayer, placeTextLayer, textFontCss, validateTextLayers,
  AI_OPS, HOOK_KINDS, aiOpsOf, aiRewrite, coreIdea, hookOptions, replaceHook, captionOptions, setSlotHookKind, DEFAULT_SNIPPETS, snippetsOf, snippetsFor, saveSnippet, deleteSnippet, useSnippet,
  CROP_RATIOS, cropRect, cropOutSize, normRotation, designTemplatesOf, saveDesignTemplate, deleteDesignTemplate, applyDesignTemplate, dataUrlBytes, slugOf,
  libraryOf, addLibraryItem, updateLibraryItem, deleteLibraryItem, libraryFind, libraryTags, libraryUses, useLibraryItem, carouselParse, carouselCompose, saveCarouselSlides, plainSentences, convertPost, repurposeSlot, writeCell, writeImagePrompt, writeSlot, parseLabeled, topicMaterial,
  defaultSetup, emptyState, nextId, byId, setBrandMd, setVoiceMd, setupStatus, sumWeights,
  validateFormat, validateColumn, formatUsage, deleteFormat,
  templatesSorted, templateOf, templateWarnings, templateEmptyDays, templateColumnCounts, addWeekTemplate, deleteWeekTemplate, moveWeekTemplate, suggestTemplateId, previewTemplateWeek, canApplyTemplate, applyTemplateWeek,
  weekIdOf, weekOf, isLocked, weekLabel, weekLabelOf, weekSlots, ensureWeek, addSlot, addSlotToStart, updateSlot, deleteSlot, slotLockMsg, moveSlotCheck, moveSlot, undoMoveSlot, reopenWeek, validateSlotInput, clearSlotContent,
  topicsOf, topicCurrent, topicFileOf, previewTopics, importTopics, previewAddTopics, addTopics, topicWarnings, topicImpact, removeTopic, ensureCells,
  cellsOf, cellAt, cellView, weekLanes, laneLabel, cellLabel, matrixLayout, setMatrixLayout, slotsUsingCell, addWeekColumn, removeWeekColumn, removeColumnImpact, refreshSlotFlags,
  dealGate, dealSlots, writeSlotFromCell, slotCellChoices, assignCell, slotWriteGate, writeSlotNow, composeAssetPrompt, genSlotImage, uploadSlotImage, addSlotAsset, slotColumnId, editSlotImage, removeSlotAsset, setSlotImagePrompt, chooseSlotImage, assetRef,
  cellWarnings, slotWarnings, matrixCounts, slotCounts, imageCounts, weekProgress, nextAction, weekKpi, weekForDate,
  exportBackup, importBackup, validateState, loadStateFromRaw,
  buildSeed, addCellGen, cancelCell, log,
  cellNoCase, genText, genImagePrompt, writeQueue, writeGate, writeCellNow, writeMatrix, approveCell, regenCell, editCell, cancelCellNow, useCellGen,
  bulkApprovable, bulkWarned, approveCellsBulk, topicVersionImpact, editTopic, useTopicVersion, noCaseEmptyCount,
  dealWeek, approveSlot, slotsApprovable, slotsWarned, approveSlotsBulk, regenSlot, useSlotVersion, editSlot, updateSlotFromCell, keepSlotVersion, changeSlotCell, stepSlotImage,
  tsToMs, msToTs, tsAddMin, isValidTs, slotTs, PLATFORMS, PUBLISH_VIA, METRICS_VIA, MILESTONES, defaultPublish, channelPlatform, channelPublish, setChannelPublish,
  metricDefs, metricTotals, slotMetricsNow, slotHeadline, liveFrac, clockNowMs, clockTick, setClockRunning, clockOf, syncMetrics, syncSlotMetrics, mockPostUrl, confirmGate, confirmSummary, confirmWeek, runScheduler,
  publishGate, markPublished, unmarkPublished, setDemoNow, reportStats, isOnTime, migrateState, sha256Bytes, utf8Bytes,
  buildExportFiles, zipFiles, crc32, exportFileName,
  IMAGE_PROVIDERS, imageApiOf, imageApiOn, setImageApi, apiSizeFor, buildImageRequest, parseImageResponse, buildCheckRequest, buildSttRequest, parseSttResponse,
  videoAt, setVideoCover, SUB_MAX_CHARS, fmtClock, parseClock, normCues, validateCues, scriptLines, subtitleDraft, srtTime, cuesToSrt, cuesToVtt, parseSubtitles, setVideoSubs,
  TEXT_PROVIDERS, textApiOf, textCfgFor, textApiOn, setTextApi, buildTextRequest, parseTextResponse, extractJson, setAiText, takeAiText, clearAiText, aiPlan, aiScore, parseAiPost,
  aiSystem, rewriteJob, hooksJob, parseHooks, captionsJob, parseCaptions,
  IMG_RATIOS, RATIO_NUM, RATIO_CSS, PLATFORM_IMG_DEFAULT, IMG_STANDARDS, ratioFromName, imgDefaultRatio, assetRatioFor, assetRatioOf, stampRatios, setAssetRatio, setImgDefault, imageSize, versionSize, ratioMismatch, nearestRatio, imageIssues, imageInfoOf, mockArt,
  BLOG_SEO_DEFAULT, BLOG_INTENTS, BLOG_API_DEFAULT, BLOG_API_STATUS, blogSeoOf, setBlogSeo, isBlogSlot, slotSeoOf, vnSlug, setSlotSeo, keywordConflicts, suggestKeyword, confirmKeyword,
  blogH1, linksOf, blogDoc, blogPlain, blogAutoMeta, blogRefreshAuto, seoWeave, blogMediaLine, blogMediaAssets, blogMediaIndex, addBlogMedia, insertBlogMedia, setBlogText, removeBlogMedia, blogMediaIssues, keepBlogMedia,
  utmUrl, linkType, anchorSpots, applyLink, unlinkAt, linkSuggestions, blogTidy, seoAudit, mdToHtml, blogPackage, bytesToB64, parsePostsCsv, parseSitemap, importBlogPosts, updateBlogPost, removeBlogPost, blogInventory,
  blogApiOf, setBlogApi, buildBlogPostRequest, parseBlogPostResponse, blogPostGate, recordWebPost, blogApiDoc, blogAiBrief, slotPublishAt,
  SKILL_KEEP, SKILL_WARN_CHARS, skillTag, skillsOf, activeSkill, skillRefOf, skillWarnings, addSkill, updateSkill, restoreSkill, setActiveSkill, deleteSkill, skillOwnerOf, skillBlock,
  demoGate, demoRun, demoRunAll, demoTopicKey, demoSetup, demoSetupImpact, SETUP_PARTS,
};
if (typeof module !== 'undefined' && module.exports) module.exports = AC;
root.AC = AC;

})(typeof window !== 'undefined' ? window : globalThis);
