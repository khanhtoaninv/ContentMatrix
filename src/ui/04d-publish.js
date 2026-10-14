// ---------- UI · R4: Xác nhận lịch, đăng bài, số liệu, đồng hồ demo (mục 10.22) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, S, view } from './00-state.js';
import { $, chName, chTag, closeLayer, commit, confirmBox, curWeek, esc, fmtFull, fmtName, fmtNum, fmtPct, icon, layerStack, nowDate, nowTime, openLayer, save, toast, tsLabel } from './01-core.js';
import { render } from './02-shell.js';
import { openPreview, pvMText, pvMVal } from './04b-preview.js';
export const VIA_LABEL = { api: 'API riêng', metricool: 'Metricool', postiz: 'Postiz', none: 'Không' };
function pubModeText(S, channelId) {
  const p = AC.channelPublish(S, channelId);
  return p.mode === 'auto' ? `Tự động qua ${VIA_LABEL[p.via]}` : 'Thủ công (tự đăng, dán link)';
}
// Dòng nhỏ trên thẻ slot: số liệu bài đã đăng, hoặc "Tự đăng hh:mm" khi chờ
export function slotPubLine(s) {
  const w = AC.weekOf(S, s.weekId);
  if (s.state === 'PUBLISHED') {
    const m = AC.slotMetricsNow(S, s, liveMs());
    if (m.status === 'ok') return `<span class="mrow2" data-live="${esc(s.id)}">${liveCellsHtml(s, m)}</span>`;
    if (m.status === 'nolink') return `<span class="pubm need" title="Bài đăng thủ công chưa có link nên chưa lấy được số liệu">${icon('link')}Chưa có link</span>`;
    if (m.status === 'wait') return `<span class="pubm" data-live="${esc(s.id)}" title="Vừa đăng, số liệu đầu tiên có sau ít phút">Vừa đăng · chờ số liệu</span>`;
    return '';
  }
  const manualWait = s.state === 'APPROVED' && w && w.status === 'CONFIRMED' && AC.channelPublish(S, s.channelId).mode !== 'auto';
  if (`${s.date}T${s.time}` <= S.settings.demoNow && !manualWait) return `<span class="pubm bad" title="Đã quá giờ mà chưa đăng được. Bài vẫn sửa được; sửa, duyệt rồi Xác nhận lịch để đăng lại.">Đăng lỗi</span>`;
  if (s.state === 'APPROVED' && w && w.status === 'CONFIRMED') {
    const auto = AC.channelPublish(S, s.channelId).mode === 'auto';
    const due = `${s.date}T${s.time}` <= S.settings.demoNow;
    return auto ? `<span class="pubm" title="Sẽ tự đăng đúng giờ (mô phỏng)">${icon('clock')}Tự đăng ${esc(s.time)}</span>` : `<span class="pubm ${due ? 'need' : ''}" title="Kênh đăng thủ công">${due ? 'Cần đăng tay' : 'Đăng tay'}</span>`;
  }
  return '';
}

// ---- Số liệu trực tiếp trên thẻ slot (mục 10.23): đồng hồ demo chạy theo giờ thật, số tăng liên tục, nhịp làm mới 30 giây ----
export const LIVE_TICK_MS = 30000;
export const clockOff = () => !!window.__AC_CLOCK_OFF;
export function liveMs() { return clockOff() ? AC.tsToMs(S.settings.demoNow) : AC.clockNowMs(S, Date.now()); }
function clockRunning() { return !clockOff() && AC.clockOf(S).running; }
const liveSeen = {}; // slotId → { vals: {reach, eng, third}, d: {…} } phần tăng của lần làm mới gần nhất
function liveCellsHtml(s, m, flash) {
  const h = AC.slotHeadline(S, s, m); if (!h) return '';
  const seen = liveSeen[s.id];
  const vals = { reach: h.reach.v, eng: h.eng.v, third: h.third ? h.third.v : 0 };
  const d = seen ? seen.d : {};
  const cell = (k, ic, label, v, isAvg) => `<span class="mc-i ${k === 'third' ? 'm3' : ''} ${flash && flash[k] ? 'flash' : ''}" title="${esc(label)}">${icon(ic)}<b>${esc(isAvg ? `${v}s` : fmtNum(v))}</b>${!isAvg && d[k] > 0 ? `<i class="up">▲${esc(fmtNum(d[k]))}</i>` : ''}</span>`;
  const src = VIA_LABEL[m.source] || '';
  const tip = `${clockRunning() ? 'Trực tiếp' : 'Đồng hồ dừng'} · cập nhật ${tsLabel(AC.msToTs(liveMs()))}${src ? ` · nguồn ${src}` : ''} · mô phỏng`;
  if (!seen) liveSeen[s.id] = { vals, d: {} };
  return `${cell('reach', 'eye', h.reach.l, h.reach.v)}${cell('eng', 'heart', 'Tương tác', h.eng.v)}${h.third ? cell('third', h.third.avg ? 'clock' : 'msg', h.third.l, h.third.v, h.third.avg) : ''}<span class="livedot ${clockRunning() ? 'on' : ''}" title="${esc(tip)}" aria-label="${esc(tip)}"></span>`;
}
// Làm mới các hàng số liệu đang hiện mà không vẽ lại cả màn (giữ ô nhập, hộp thoại)
function patchLive() {
  const now = liveMs();
  document.querySelectorAll('[data-live]').forEach(el => {
    const s = AC.byId(S.slots, el.dataset.live); if (!s) return;
    const m = AC.slotMetricsNow(S, s, now);
    if (m.status !== 'ok') return;
    const h = AC.slotHeadline(S, s, m);
    const vals = { reach: h.reach.v, eng: h.eng.v, third: h.third ? h.third.v : 0 };
    const seen = liveSeen[s.id];
    const flash = {};
    if (seen) { const d = {}; ['reach', 'eng', 'third'].forEach(k => { d[k] = vals[k] - seen.vals[k]; if (d[k] > 0) flash[k] = true; }); if (Object.keys(flash).length) liveSeen[s.id] = { vals, d }; }
    if (el.classList.contains('pubm')) { el.outerHTML = `<span class="mrow2" data-live="${esc(s.id)}">${liveCellsHtml(s, m)}</span>`; return; }
    el.innerHTML = liveCellsHtml(s, m, flash);
  });
  // Số liệu trong View (mục 10.29): cập nhật từng số, nháy khi tăng
  const ms = {};
  document.querySelectorAll('[data-pvm]').forEach(el => {
    const id = el.dataset.pvm; const s = AC.byId(S.slots, id); if (!s) return;
    const m = ms[id] || (ms[id] = AC.slotMetricsNow(S, s, now)); if (m.status !== 'ok') return;
    const k = el.dataset.k; const v = k === '_rate' ? (m.reach ? m.eng / m.reach : 0) : pvMVal(m, k);
    const old = Number(el.dataset.v); el.dataset.v = v; el.textContent = pvMText(k, v);
    el.title = el.title.replace(/đo lúc [^·]+·/, `đo lúc ${tsLabel(AC.msToTs(now))} ·`);
    if (v > old) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  });
  const cb = document.getElementById('clockbtn-t'); if (cb) cb.textContent = `${AC.dmyFull(nowDate())} ${nowTime()}`;
}
export function liveTick() {
  if (clockOff() || !S) return;
  const r = AC.clockTick(S, Date.now());
  if (r.changed) save();
  const busy = layerStack.length || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  if (r.published && !busy) { render(); toast(`Đã tự đăng ${r.published} slot (mô phỏng).`); return; }
  if (r.changed && !busy && (view.screen === 'report')) { render(); return; }
  patchLive();
}

// ---- Xác nhận lịch ----
export function confirmBtnHtml(w) {
  if (!w || w.status === 'CONFIRMED' || !AC.weekSlots(S, w.id).length) return '';
  const g = AC.confirmGate(S, w.id);
  return `<button class="btn ${g.ok ? 'primary' : ''}" data-act="confirm-week" title="${esc(g.ok ? 'Chốt lịch tuần này' : `${g.reason}: bấm để xem`)}">${icon('check')} Xác nhận lịch</button>`;
}
ACTIONS['confirm-week'] = async () => {
  const w = curWeek(); if (!w) return toast('Tuần chưa có slot.', 'bad');
  const g = AC.confirmGate(S, w.id);
  if (!g.ok) {
    if (!g.blockers.length) return toast(g.reason, 'bad');
    const box = openLayer(`<h2>Chưa xác nhận được lịch</h2>
      <p class="small muted">Còn ${g.blockers.length} slot chưa đạt. Xác nhận lịch cần mọi slot Đã duyệt và không slot nào cần cập nhật. Bấm một slot để mở.</p>
      <div class="list">${g.blockers.map(b => `<button class="li" data-x="open" data-id="${esc(b.slot.id)}"><span class="mono">${AC.WEEKDAY_SHORT[AC.weekdayOf(b.slot.date)]} ${esc(b.slot.time)}</span><span>${chTag(b.slot.channelId)} <span class="muted">· ${esc(fmtName(b.slot.formatId))}</span></span><span class="st st-need">${esc(b.why)}</span></button>`).join('')}</div>
      <div class="actions"><button class="btn primary" data-x="close">Đóng</button></div>`, 'dialog');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      closeLayer();
      if (b.dataset.x === 'open') ACTIONS['open-slot'](b);
    });
    return;
  }
  const sum = AC.confirmSummary(S, w.id);
  const chs = Object.entries(sum.byChannel).map(([id, n]) => `${esc(chName(id))} ${n}`).join(' · ');
  const ok1 = await confirmBox({ title: `Xác nhận lịch ${AC.weekLabel(w).range}`, ok: 'Tiếp tục',
    body: `<p><b>${sum.total} slot</b>: ${chs}.</p>
      <ul><li>${sum.auto} slot sẽ <b>tự đăng</b> đúng giờ (mô phỏng); ${sum.manual} slot <b>đăng thủ công</b>, đăng xong dán link vào slot.</li>
      ${sum.published ? `<li>${sum.published} slot đã đăng từ trước, giữ nguyên.</li>` : ''}
      ${sum.dueNow ? `<li>${sum.dueNow} slot đã quá giờ: slot tự đăng sẽ đăng ngay khi chốt (tính là trễ).</li>` : ''}
      <li>${sum.warned ? `${sum.warned} slot còn cảnh báo quy tắc (chỉ tham khảo).` : 'Không slot nào có cảnh báo quy tắc.'}</li>
      <li>${sum.missingImages ? `${sum.missingImages} ô ảnh chưa có ảnh (chỉ nhắc, không chặn).` : 'Mọi ô ảnh đã có ảnh.'}</li></ul>` });
  if (!ok1) return;
  const ok2 = await confirmBox({ title: `Chốt lịch bản ${(w.revision || 0) + 1}?`, ok: `Chốt bản ${(w.revision || 0) + 1}`,
    body: `<p>Sau khi chốt, tuần chỉ xem; muốn sửa phải bấm "Mở lại để sửa" rồi chốt lại (bản tăng lên). Nội dung từng slot được lưu làm "bản đã chốt" để so khi đăng.</p>` });
  if (!ok2) return;
  const r = AC.confirmWeek(S, w.id); if (!r.ok) return toast(r.error, 'bad');
  commit(`Đã chốt lịch bản ${r.revision}.${r.published ? ` Đã tự đăng ${r.published} slot quá giờ.` : ''}`);
};
// Việc tiếp theo "Đánh dấu đã đăng": mở slot đăng tay đầu tiên đã đến giờ
ACTIONS['open-due'] = () => {
  const w = curWeek(); if (!w) return;
  const s = AC.weekSlots(S, w.id).find(x => x.state !== 'PUBLISHED' && `${x.date}T${x.time}` <= S.settings.demoNow);
  if (s) openPreview(s.id);
};

// ---- Đồng hồ demo (D127) ----
ACTIONS['demo-clock'] = () => {
  const now = S.settings.demoNow;
  const box = openLayer(`<h2>Đồng hồ demo</h2>
    <p class="small muted">Giờ hiện tại của bản demo: <b class="mono">${esc(AC.dmyFull(now.slice(0, 10)))} ${esc(now.slice(11))}</b>. Tua giờ để thấy slot tự đăng và số liệu tăng theo mốc 1 giờ, 24 giờ, 7 ngày. Khi có máy chủ thật (R5), giờ là giờ thật.</p>
    <div class="row"><span class="small">${clockRunning() ? '<span class="livedot on"></span> Đồng hồ đang chạy theo giờ thật: slot tự đăng, số liệu tăng liên tục.' : 'Đồng hồ đang dừng.'}</span>${clockOff() ? '' : `<button class="btn sm" data-x="run">${clockRunning() ? 'Dừng đồng hồ' : 'Chạy theo giờ thật'}</button>`}</div>
    <div class="row"><button class="btn" data-x="add" data-m="60">+1 giờ</button><button class="btn" data-x="add" data-m="1440">+1 ngày</button><button class="btn" data-x="add" data-m="10080">+1 tuần</button></div>
    <div class="field"><label for="clk-at">Đặt ngày giờ</label><div class="row"><input id="clk-at" type="datetime-local" value="${esc(now)}"><button class="btn" data-x="set">Đặt</button></div></div>
    <div class="actions"><button class="btn ghost" data-x="reset">Về 12/10/2026 09:00</button><button class="btn" data-x="close">Đóng</button></div>`, 'dialog');
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x; if (x === 'close') return closeLayer();
    if (x === 'run') { AC.setClockRunning(S, !clockRunning(), Date.now()); closeLayer(); return commit(clockRunning() ? 'Đồng hồ demo chạy theo giờ thật.' : 'Đã dừng đồng hồ demo.'); }
    const ts = x === 'add' ? AC.tsAddMin(AC.msToTs(Math.floor(liveMs() / 60000) * 60000), Number(b.dataset.m)) : x === 'reset' ? '2026-10-12T09:00' : String($('#clk-at', box).value || '').slice(0, 16);
    const r = AC.setDemoNow(S, ts); if (!r.ok) return toast(r.error, 'bad');
    closeLayer();
    commit(`Giờ demo: ${AC.dmyFull(ts.slice(0, 10))} ${ts.slice(11)}.${r.published ? ` Đã tự đăng ${r.published} slot.` : ''}`);
  });
};

// ---- Đánh dấu đã đăng / sửa thông tin đăng ----
export async function publishDialog(s) {
  const editing = s.state === 'PUBLISHED' && s.pub;
  const at = editing ? s.pub.at : (`${s.date}T${s.time}` <= S.settings.demoNow ? `${s.date}T${s.time}` : S.settings.demoNow);
  const res = await confirmBox({ title: editing ? 'Sửa thông tin đăng' : 'Đánh dấu đã đăng', ok: editing ? 'Lưu' : 'Đánh dấu đã đăng',
    body: `<p>${esc(fmtFull(s.formatId))} · ${esc(tsLabel(`${s.date}T${s.time}`))}. ${'Đăng bài trên kênh xong thì dán link vào đây để lấy số liệu (Metricool khớp bài theo link).'}</p>`,
    extra: `<div class="field"><label for="pb-at">Giờ đăng thực tế</label><input id="pb-at" type="datetime-local" data-collect="at" value="${esc(at)}" max="${esc(S.settings.demoNow)}"></div>
      <div class="field"><label for="pb-url">Link bài đăng</label><input id="pb-url" type="url" data-collect="url" placeholder="https://…" value="${esc(editing ? s.pub.url : '')}"><span class="hint">Không bắt buộc, nhưng chưa có link thì chưa lấy được số liệu.</span></div>
      <div class="field"><label for="pb-ok">Đúng bản đã chốt?</label><select id="pb-ok" data-collect="ok"><option value="1" ${!editing || s.pub.asConfirmed ? 'selected' : ''}>Có, đăng đúng bản đã chốt</option><option value="0" ${editing && !s.pub.asConfirmed ? 'selected' : ''}>Không, bài đăng khác bản đã chốt</option></select></div>` });
  if (!res) return false;
  const r = AC.markPublished(S, s.id, { at: res.at, url: res.url, asConfirmed: res.ok === '1' });
  if (!r.ok) { toast(r.error, 'bad'); return false; }
  save(); render(); toast(editing ? 'Đã lưu thông tin đăng.' : 'Đã đánh dấu đã đăng.');
  return true;
}
export function pubButtonsHtml(s) {
  if (s.state === 'PUBLISHED' && s.pub && s.pub.mode === 'auto') return '';
  if (s.state === 'PUBLISHED') return `<button class="btn sm" data-pv="pub">${icon('link')} Sửa thông tin đăng</button><button class="btn ghost sm" data-pv="unpub">Bỏ đánh dấu</button>`;
  const g = AC.publishGate(S, s);
  if (s.state !== 'APPROVED' || !g.ok) return '';
  const auto = AC.channelPublish(S, s.channelId).mode === 'auto';
  return `<button class="btn ${auto ? '' : 'primary'} sm" data-pv="pub" title="${auto ? 'Kênh tự đăng; đánh dấu tay nếu bạn đã đăng trước' : 'Đăng xong thì dán link'}">${icon('check')} Đánh dấu đã đăng</button>`;
}
// Thẻ "Đăng bài" và "Số liệu" dưới khung bài (View)
export function pubSectionsHtml(s, n0) {
  const w = AC.weekOf(S, s.weekId); let n = n0;
  if (s.state !== 'PUBLISHED' && !(w && w.revision >= 1)) return '';
  const head = (t, r) => `<div class="cfg-h"><span class="cfg-n">${++n}</span><h3>${t}</h3>${r ? `<span class="small faint cfg-r">${r}</span>` : ''}</div>`;
  if (s.state !== 'PUBLISHED') {
    const auto = AC.channelPublish(S, s.channelId).mode === 'auto';
    const txt = s.state !== 'APPROVED' ? 'Slot cần Đã duyệt và tuần đã chốt mới đăng được.'
      : w.status !== 'CONFIRMED' ? 'Tuần đang sửa: slot không tự đăng cho tới khi Xác nhận lịch lại.'
      : auto ? `Sẽ tự đăng lúc ${tsLabel(`${s.date}T${s.time}`)} (mô phỏng); hệ thống tự gắn link.` : 'Kênh đăng thủ công: đăng bài trên kênh, rồi bấm "Đánh dấu đã đăng" và dán link.';
    return `<section class="cfg-sec">${head('Đăng bài', esc(pubModeText(S, s.channelId)))}<p class="small muted">${esc(txt)}</p></section>`;
  }
  const p = s.pub || {};
  const pubSec = `<section class="cfg-sec">${head('Đã đăng', p.simulated ? '<span class="mock">Mô phỏng</span>' : '')}
    <dl class="kv"><dt>Cách đăng</dt><dd>${p.mode === 'auto' ? `Tự động qua ${esc(VIA_LABEL[p.via] || '')}` : 'Thủ công'}</dd>
    <dt>Giờ đăng</dt><dd class="mono">${esc(tsLabel(p.at))}${AC.isOnTime(s) ? '' : ' <span class="st st-need">Trễ</span>'}</dd>
    <dt>Link</dt><dd>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="pv-link">${esc(p.url)}</a>` : '<span class="faint">Chưa có link</span>'}</dd>
    <dt>Đúng bản đã chốt</dt><dd>${p.asConfirmed ? 'Có' : '<span style="color:var(--warn)">Không, bài đăng khác bản đã chốt</span>'}</dd></dl>
    ${s.changedAfterPublish ? '<p class="small" style="color:var(--warn)">Nội dung đã đổi sau khi đăng.</p>' : ''}</section>`;
  const m = AC.slotMetricsNow(S, s, liveMs());
  const src = VIA_LABEL[m.source] || '';
  let body;
  if (m.status === 'ok') {
    const defs = AC.metricDefs(S, s); const snaps = (s.metrics || []).concat([{ key: 'now', at: AC.msToTs(liveMs()), values: m.values }]);
    body = `<div class="tbl-wrap"><table class="tbl mtbl"><thead><tr><th>Chỉ số</th>${snaps.map(x => `<th class="num" title="Đo lúc ${esc(tsLabel(x.at))}">${esc(x.key === 'now' ? 'Hiện tại' : (AC.MILESTONES.find(k => k.key === x.key) || {}).label || x.key)}</th>`).join('')}</tr></thead>
      <tbody>${defs.map(d => `<tr><td>${esc(d.l)}</td>${snaps.map(x => `<td class="num mono">${esc(d.k === 'watchHours' ? String(x.values[d.k]).replace('.', ',') : fmtNum(x.values[d.k]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="small faint">Tiếp cận/xem ${esc(fmtNum(m.reach))} · Tương tác ${esc(fmtNum(m.eng))}${m.reach ? ` (${esc(fmtPct(m.eng / m.reach))})` : ''}.</p>`;
  } else if (m.status === 'nolink') body = `<p class="small muted">Chưa có link nên ${esc(src)} chưa khớp được bài. Bấm "Sửa thông tin đăng" và dán link.</p>`;
  else if (m.status === 'none') body = `<p class="small muted">Kênh này không lấy số liệu (Setup → Kênh → Nguồn số liệu).</p>`;
  else body = `<p class="small muted">Số liệu đầu tiên có lúc ${esc(tsLabel(m.nextAt))} (mốc 1 giờ).</p>`;
  return pubSec + `<section class="cfg-sec" id="pv-metrics">${head('Số liệu', `${src ? `Nguồn: ${esc(src)} · ` : ''}<span class="mock">Mô phỏng</span>`)}${body}</section>`;
}
