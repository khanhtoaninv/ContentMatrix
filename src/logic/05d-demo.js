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
