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
