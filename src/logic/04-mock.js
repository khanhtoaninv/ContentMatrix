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
