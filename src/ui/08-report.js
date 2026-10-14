// ---------- UI · Report kênh: Overview, Tuần, Tháng (mục 10.22; số liệu mô phỏng) ----------
view.rpTab = 'overview'; view.rpCh = [];
const RP_TABS = [['overview', 'Overview'], ['week', 'Tuần'], ['month', 'Tháng']];
function rpRange() {
  const start = curStart();
  if (view.rpTab === 'week') return { from: start, to: AC.addDays(start, 6), prev: { from: AC.addDays(start, -7), to: AC.addDays(start, -1) }, label: `Tuần ${AC.weekLabelOf(start).range}`, prevLabel: 'tuần trước' };
  if (view.rpTab === 'month') {
    const y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
    const first = `${y}-${String(m).padStart(2, '0')}-01`; const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const pFirst = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
    return { from: first, to: AC.addDays(next, -1), prev: { from: pFirst, to: AC.addDays(first, -1) }, label: `Tháng ${m}/${y}`, prevLabel: 'tháng trước', y, m };
  }
  return { from: null, to: null, prev: null, label: 'Toàn bộ bài đã đăng', prevLabel: '' };
}
function rpDelta(cur, prev, label) {
  if (prev == null) return '';
  if (!prev) return `<span class="faint">${esc(label)}: chưa có</span>`;
  const d = (cur - prev) / prev; const up = d >= 0;
  return `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${esc(fmtPct(Math.abs(d)))}</span> <span class="faint">so với ${esc(label)}</span>`;
}
function rpTiles(t, p, prevLabel) {
  const P = p ? p.total : null;
  const tile = (label, value, cur, prev, hint) => `<div class="rtile" title="${esc(hint)}"><span class="eyebrow">${esc(label)}</span><b>${esc(value)}</b><span class="small">${P ? rpDelta(cur, prev, prevLabel) : ''}</span></div>`;
  return `<div class="rtiles">
    ${tile('Bài đã đăng', fmtNum(t.posts), t.posts, P && P.posts, 'Số slot Đã đăng trong kỳ')}
    ${tile('Tiếp cận/xem', fmtNum(t.reach), t.reach, P && P.reach, 'Reach hoặc lượt xem (mốc mới nhất của từng bài)')}
    ${tile('Tương tác', fmtNum(t.eng), t.eng, P && P.eng, 'Cảm xúc/thích + bình luận/trả lời + chia sẻ/đăng lại + lưu')}
    ${tile('Tỷ lệ tương tác', t.reach ? fmtPct(t.engRate) : '—', t.engRate, P && P.engRate, 'Tương tác ÷ Tiếp cận/xem')}
    ${tile('Đăng đúng giờ', t.posts ? fmtPct(t.onTime / t.posts) : '—', null, null, 'Đăng trong 30 phút sau giờ của slot')}
    ${tile('Đúng bản đã chốt', t.posts ? fmtPct(t.asConfirmed / t.posts) : '—', null, null, 'Bài đăng đúng nội dung đã chốt')}
  </div>`;
}
// Biểu đồ cột một chuỗi (Tiếp cận/xem); di chuột vào cột để xem số; bảng số nằm ngay dưới
function rpBars(items, title) {
  const max = Math.max(1, ...items.map(i => i.value));
  const W = 640, H = 180, pad = 26, gap = 14, bw = Math.min(64, Math.max(8, (W - gap * (items.length - 1)) / items.length)); const x0 = (W - (bw * items.length + gap * (items.length - 1))) / 2;
  const top = items.reduce((a, b) => (b.value > a.value ? b : a), items[0] || { value: 0 });
  return `<figure class="rchart"><figcaption class="small muted">${esc(title)}</figcaption>
    <svg viewBox="0 0 ${W} ${H + pad}" role="img" aria-label="${esc(title)}">
      <line x1="0" x2="${W}" y1="${H}" y2="${H}" class="rc-base"/>
      ${items.map((it, i) => { const h = it.value ? Math.max(3, Math.round(it.value / max * (H - 18))) : 0; const x = x0 + i * (bw + gap); const r = Math.min(4, bw / 2, h);
        return `<g class="rc-bar"><title>${esc(it.label)}: ${esc(fmtNum(it.value))} tiếp cận/xem · ${esc(fmtNum(it.eng || 0))} tương tác · ${it.posts || 0} bài</title>
          <rect x="${x}" y="0" width="${bw}" height="${H}" class="rc-hit"/>
          ${h ? `<path d="M${x},${H} V${H - h + r} Q${x},${H - h} ${x + r},${H - h} H${x + bw - r} Q${x + bw},${H - h} ${x + bw},${H - h + r} V${H} Z" class="rc-fill"/>` : ''}
          ${it === top && it.value ? `<text x="${x + bw / 2}" y="${H - h - 5}" text-anchor="middle" class="rc-val">${esc(fmtNum(it.value))}</text>` : ''}
          <text x="${x + bw / 2}" y="${H + 17}" text-anchor="middle" class="rc-lab">${esc(it.short || it.label)}</text></g>`; }).join('')}
    </svg></figure>`;
}
function rpTable(title, entries, nameOf) {
  if (!entries.length) return '';
  return `<section class="cfg-sec"><div class="cfg-h"><h3>${esc(title)}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(title.replace(/^Theo /, ''))}</th><th class="num">Bài</th><th class="num">Tiếp cận/xem</th><th class="num">Tương tác</th><th class="num">Tỷ lệ</th></tr></thead><tbody>
    ${entries.sort((a, b) => b[1].reach - a[1].reach).map(([k, b]) => `<tr><td>${nameOf(k)}</td><td class="num mono">${b.posts}</td><td class="num mono">${esc(fmtNum(b.reach))}</td><td class="num mono">${esc(fmtNum(b.eng))}</td><td class="num mono">${b.reach ? esc(fmtPct(b.engRate)) : '—'}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}
// Thẻ từng kênh với bộ chỉ số riêng của nền tảng
function rpChannelCards(st) {
  const ids = S.channels.map(c => c.id).filter(id => st.byChannel[id]);
  if (!ids.length) return '';
  return `<div class="rcards">${ids.map(id => {
    const b = st.byChannel[id]; const sample = st.rows.find(r => r.slot.channelId === id).slot;
    const defs = AC.metricDefs(S, sample).filter(d => b.values[d.k] != null);
    const p = AC.channelPublish(S, id);
    return `<section class="rcard"><header>${chTag(id)}<span class="small faint">${b.posts} bài · ${p.mode === 'auto' ? `tự đăng qua ${esc(VIA_LABEL[p.via])}` : 'đăng tay'}</span></header>
      <dl>${defs.map(d => `<div><dt>${esc(d.l)}</dt><dd class="mono">${esc(d.k === 'watchHours' ? String(Math.round(b.values[d.k] * 10) / 10).replace('.', ',') : fmtNum(b.values[d.k]))}</dd></div>`).join('')}
      <div><dt>Tỷ lệ tương tác</dt><dd class="mono">${b.reach ? esc(fmtPct(b.engRate)) : '—'}</dd></div></dl>
      ${b.tracked < b.posts ? `<p class="small faint">${b.posts - b.tracked} bài chưa có số liệu</p>` : ''}</section>`;
  }).join('')}</div>`;
}
function rpTop(st) {
  if (!st.top.length) return '';
  return `<section class="cfg-sec"><div class="cfg-h"><h3>Top bài theo tương tác</h3></div><div class="list">${st.top.map((r, i) => `<button class="li" data-act="open-slot" data-id="${esc(r.slot.id)}"><span class="mono">${i + 1}. ${esc(AC.dmy(r.slot.date))} ${esc(r.slot.time)}</span><span>${chTag(r.slot.channelId)} <span class="muted">· ${esc(fmtName(r.slot.formatId))}</span></span><span class="mono small">${esc(fmtNum(r.reach))} · <b>${esc(fmtNum(r.eng))}</b></span></button>`).join('')}</div></section>`;
}
function rpPosts(st) {
  if (!st.rows.length) return '';
  const label = { ok: '', nolink: 'Chưa có link', none: 'Không lấy số liệu', wait: 'Chờ số liệu' };
  return `<section class="cfg-sec"><div class="cfg-h"><h3>Bài đã đăng</h3><span class="small faint cfg-r">${st.rows.length} bài</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ngày giờ</th><th>Kênh · Format</th><th>Cách đăng</th><th class="num">Tiếp cận/xem</th><th class="num">Tương tác</th></tr></thead><tbody>
    ${st.rows.slice().sort((a, b) => (a.slot.date + a.slot.time).localeCompare(b.slot.date + b.slot.time)).map(r => `<tr class="clickrow" data-act="open-slot" data-id="${esc(r.slot.id)}"><td class="mono">${esc(AC.dmy(r.slot.date))} ${esc(r.slot.time)}</td><td>${chTag(r.slot.channelId)} · ${esc(fmtName(r.slot.formatId))}</td><td class="small">${r.slot.pub.mode === 'auto' ? 'Tự động' : 'Thủ công'}${r.slot.pub.url ? '' : ' · <span style="color:var(--warn)">chưa có link</span>'}</td><td class="num mono">${r.status === 'ok' ? esc(fmtNum(r.reach)) : `<span class="faint small">${esc(label[r.status])}</span>`}</td><td class="num mono">${r.status === 'ok' ? esc(fmtNum(r.eng)) : ''}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}
RENDERERS.report = () => {
  const rg = rpRange(); const ch = view.rpCh;
  const st = AC.reportStats(S, { from: rg.from, to: rg.to, channels: ch });
  const prev = rg.prev ? AC.reportStats(S, { from: rg.prev.from, to: rg.prev.to, channels: ch }) : null;
  const usedCh = S.channels.map(c => c.id).filter(id => S.slots.some(s => s.channelId === id && s.state === 'PUBLISHED'));
  let chart = '';
  if (view.rpTab === 'week') chart = rpBars([1, 2, 3, 4, 5, 6, 7].map(d => { const date = AC.addDays(rg.from, d - 1); const b = st.byDay[date] || {}; return { label: `${AC.WEEKDAY_LONG[d]} ${AC.dmy(date)}`, short: `${AC.WEEKDAY_SHORT[d]} ${AC.dmy(date)}`, value: b.reach || 0, eng: b.eng, posts: b.posts }; }), 'Tiếp cận/xem theo ngày');
  else {
    const weeks = view.rpTab === 'month'
      ? (() => { const out = []; for (let wk = AC.mondayOf(rg.from); wk <= rg.to; wk = AC.addDays(wk, 7)) out.push(wk); return out; })()
      : Object.keys(st.byWeek).sort();
    if (weeks.length) chart = rpBars(weeks.map(wk => { const b = st.byWeek[wk] || {}; return { label: `Tuần ${AC.weekLabelOf(wk).range}`, short: `T ${AC.dmy(wk)}`, value: b.reach || 0, eng: b.eng, posts: b.posts }; }), 'Tiếp cận/xem theo tuần');
  }
  const empty = !st.total.posts;
  return `<div class="page-head"><div><span class="eyebrow">Report kênh · số liệu mô phỏng</span><h1>${esc(rg.label)}</h1><p class="sub">${view.rpTab === 'overview' ? 'Mọi bài đã đăng.' : `Đổi ${view.rpTab === 'week' ? 'tuần' : 'tháng'} bằng mũi tên tuần ở thanh trên.`} Số liệu lấy mốc mới nhất (1 giờ, 24 giờ hoặc 7 ngày) của từng bài.</p></div></div>
    <section class="work">
      <div class="week-tools">
        <div class="seg" role="group" aria-label="Kỳ báo cáo">${RP_TABS.map(([id, l]) => `<button aria-pressed="${view.rpTab === id}" data-act="rp-tab" data-t="${id}">${l}</button>`).join('')}</div>
        <div class="filters" role="group" aria-label="Lọc theo kênh">${usedCh.length ? '<span class="small muted">Kênh:</span>' : ''}${usedCh.map(id => `<button class="fchip" aria-pressed="${ch.includes(id)}" data-act="rp-ch" data-ch="${esc(id)}">${chTag(id)}</button>`).join('')}${ch.length ? '<button class="linkbtn small" data-act="rp-ch-clear">Bỏ lọc</button>' : ''}</div>
      </div>
      ${rpTiles(st.total, prev, rg.prevLabel)}
      ${empty ? `<div class="note">Chưa có bài đã đăng trong kỳ này. Xác nhận lịch ở Dashboard rồi tua giờ demo (bấm giờ ở thanh trên) để thấy bài tự đăng và số liệu.</div>` : chart}
    </section>
    ${empty ? '' : `<div class="rgrid">${rpChannelCards(st)}${rpTop(st)}
      ${view.rpTab !== 'week' ? rpTable('Theo Cột', Object.entries(st.byColumn), k => k ? esc(colName(k)) : '<span class="faint">Không Cột</span>') + rpTable('Theo Format', Object.entries(st.byFormat), k => esc(fmtFull(k))) : rpPosts(st)}
      ${view.rpTab === 'overview' ? '' : view.rpTab === 'month' ? rpPosts(st) : rpTable('Theo Cột', Object.entries(st.byColumn), k => k ? esc(colName(k)) : '<span class="faint">Không Cột</span>')}</div>`}`;
};
ACTIONS['rp-tab'] = el => { view.rpTab = el.dataset.t; render(); };
ACTIONS['rp-ch'] = el => { const id = el.dataset.ch; view.rpCh = view.rpCh.includes(id) ? view.rpCh.filter(x => x !== id) : [...view.rpCh, id]; render(); };
ACTIONS['rp-ch-clear'] = () => { view.rpCh = []; render(); };
