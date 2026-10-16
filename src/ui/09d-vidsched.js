// ---------- UI · Short Vid: Đưa vào lịch (slot video trên các kênh video, caption từng kênh) (mục 10.75) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { $, closeAllLayers, commit, esc, icon, openLayer, save, toast } from './01-core.js';
import { go } from './02-shell.js';
import { textCall } from './04k-aitext.js';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dayLabel = d => `${DOW[new Date(`${d}T00:00:00Z`).getUTCDay()]} ${AC.dmy(d)}`;
export const readyToSchedule = (S2, weekId) => AC.vidsOf(S2, weekId).filter(v => !v.cancelled && v.file && !AC.vidSlotsOf(S2, v.id).length);
export function openSchedule(ids) {
  const w = AC.weekOf(S, AC.weekIdOf(S.ui.weekStart)); if (!w) return;
  const list = readyToSchedule(S, w.id).filter(v => !ids || ids.includes(v.id));
  const chans = AC.vidChannels(S);
  if (!list.length) return toast('Chưa có thẻ Vid nào có video thành phẩm mà chưa lên lịch.', 'bad');
  if (!chans.length) return toast('Chưa có kênh video ngắn (TikTok, Reels, Shorts) có Format kịch bản ngắn ở Setup.', 'bad');
  if (AC.isLocked(S, w.id)) return toast('Tuần đã chốt. Bấm "Mở lại để sửa" ở Dashboard trước.', 'bad');
  const days = Array.from({ length: 7 }, (_, i) => AC.addDays(w.startDate, i)); const sug = AC.suggestVidDates(S, w.id, list.length);
  const aiOn = AC.textApiOn(S);
  const box = openLayer(`<header><div><span class="eyebrow">Short Vid · ${esc(AC.weekLabelOf(w.startDate).range)}</span><h2>Đưa vào lịch</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <p class="small muted">Mỗi video thành một slot trên từng kênh đã chọn, cùng ngày giờ. Slot video là slot tự do: Viết slot bỏ qua; caption viết từ kịch bản của video${aiOn ? ' (AI)' : ' (mô phỏng)'}, sửa được trong View ở Dashboard.</p>
      <fieldset class="stack" style="gap:6px"><legend class="small"><b>Kênh</b></legend><div class="row" style="gap:12px">${chans.map(x => `<label class="small row" style="gap:6px"><input type="checkbox" name="sc-ch" value="${esc(x.channel.id)}" checked> ${esc(x.channel.name)} <span class="faint">(${esc(x.format.name)})</span></label>`).join('')}</div></fieldset>
      <div class="stack" style="gap:6px">${list.map((v, i) => `<div class="citem row" style="gap:8px;align-items:center" data-v="${esc(v.id)}"><label class="row" style="gap:6px;flex:1;min-width:180px"><input type="checkbox" data-pick checked><span class="small"><b>${esc(v.insight.title)}</b></span></label>
        <label class="small"><span class="sr">Ngày</span><select data-date>${days.map(d => `<option value="${d}" ${d === sug[i] ? 'selected' : ''}>${dayLabel(d)}</option>`).join('')}</select></label>
        <label class="small"><span class="sr">Giờ</span><input data-time type="time" value="19:00" style="width:110px"></label></div>`).join('')}</div>
      <span class="err" id="sc-err" role="alert"></span><span class="small muted" id="sc-busy" aria-live="polite"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="sc-ok" data-testid="sc-ok">Đưa vào lịch</button></div>
    </div>`, 'drawer');
  $('#sc-ok', box).addEventListener('click', async () => {
    const err = $('#sc-err', box), busy = $('#sc-busy', box); err.textContent = '';
    const chIds = [...box.querySelectorAll('input[name="sc-ch"]:checked')].map(x => x.value); if (!chIds.length) { err.textContent = 'Chọn ít nhất một kênh.'; return; }
    const rows = [...box.querySelectorAll('[data-v]')].filter(r => r.querySelector('[data-pick]').checked); if (!rows.length) { err.textContent = 'Chọn ít nhất một video.'; return; }
    $('#sc-ok', box).disabled = true; let slots = 0, vids = 0;
    for (const r of rows) {
      const v = AC.byId(S.videos, r.dataset.v); const time = r.querySelector('[data-time]').value;
      if (!AC.isValidTime(time)) { err.textContent = 'Giờ không hợp lệ.'; break; }
      let captions = null;
      if (aiOn) {
        const cs = chans.filter(x => chIds.includes(x.channel.id)); busy.textContent = `AI đang viết caption cho "${v.insight.title.slice(0, 40)}"…`;
        try { const p = AC.parseVidCaptions(await textCall(AC.vidCaptionsJob(S, v, cs), 3000), cs); if (p.ok) captions = p.captions; } catch (e) { toast(`AI không viết được caption, dùng bản mô phỏng: ${e.message}`, 'bad'); }
      }
      const res = AC.scheduleVideo(S, v.id, { date: r.querySelector('[data-date]').value, time, channelIds: chIds, captions });
      if (!res.ok) { err.textContent = res.error; break; }
      slots += res.slots.length; vids++; save();
    }
    busy.textContent = ''; $('#sc-ok', box).disabled = false;
    if (!vids) return;
    closeAllLayers(); commit(`Đã đưa ${vids} video vào lịch (${slots} slot).`);
    toast('Xem và duyệt caption ở Dashboard.', '', { label: 'Mở Dashboard', fn: () => go({ screen: 'week' }) });
  });
  return box;
}

// ---- Tab "Xếp Slot" trong popup thẻ Vid (bản 1, mục 10.76): lưới Thứ × Kênh như Chia bài ảnh, mỗi ô là một slot ----
const posOfVid = (v2) => AC.vidsOf(S, v2.weekId, v2.topicId).findIndex(x => x.id === v2.id) + 1;
export function slotPaneHtml(v, sel) {
  const days = AC.weekDays(S, v.weekId); const chans = AC.vidChannels(S); const busy = AC.busyCells(S, v.weekId, v.id); const own = AC.vidSlotsOf(S, v.id);
  const ownAt = {}; own.forEach(s => { ownAt[`${s.date}|${s.channelId}`] = s; });
  const hasFile = !!v.file; const n = Object.keys(sel).length;
  if (!chans.length) return '<p class="small muted">Chưa có kênh video ngắn (TikTok, Reels, Shorts) có Format kịch bản ngắn ở Setup.</p>';
  const cell = (d, ch) => {
    const k = `${d}|${ch.channel.id}`; const o = ownAt[k]; const b = busy[k]; const picked = sel[ch.channel.id] === d;
    if (o) return `<button class="vp-slc on" disabled title="Đã xếp: ${esc(o.state === 'PUBLISHED' ? 'đã đăng' : 'chờ duyệt caption')}">Vid ${posOfVid(v)}</button>`;
    if (b) { const bv = AC.byId(S.videos, b); return `<button class="vp-slc busy" disabled title="${esc(bv ? bv.insight.title : 'Video khác')}">Vid ${bv ? posOfVid(bv) : '?'}</button>`; }
    return `<button class="vp-slc${picked ? ' pick' : ''}" data-x="cell" data-k="${esc(k)}" aria-pressed="${picked}" aria-label="${esc(dayLabel(d))}, ${esc(ch.channel.name)}">${picked ? 'Chọn' : '＋'}</button>`;
  };
  const grid = `<div class="vp-slwrap"><table class="vp-sl" data-testid="sp-slgrid"><thead><tr><th class="ch">Kênh</th>${days.map(d => `<th>${esc(dayLabel(d))}</th>`).join('')}</tr></thead><tbody>${chans.map(ch => `<tr><th class="ch">${esc(ch.channel.name)}</th>${days.map(d => `<td>${cell(d, ch)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const slots = own.length ? `<div class="stack" style="gap:4px;margin-top:8px">${own.map(sl => `<div class="row small" style="gap:6px"><b>${esc((AC.byId(S.channels, sl.channelId) || {}).name || sl.channelId)}</b><span class="mono">${esc(AC.dmy(sl.date))} ${esc(sl.time)}</span><span class="muted">${sl.state === 'PUBLISHED' ? 'Đã đăng' : sl.state === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt caption'}</span></div>`).join('')}
    <div class="row"><button class="btn sm ghost danger" data-x="unsched" ${own.every(sl => sl.state === 'PUBLISHED') ? 'disabled' : ''}>Bỏ khỏi lịch</button><span class="small faint">Caption từng kênh sửa và duyệt trong View ở Dashboard.</span></div></div>` : '';
  const gate = hasFile ? '' : `<div class="vp-note warn" data-testid="sp-slgate"><b>Chưa có file video thành phẩm.</b> Biên tập trong app hiện lưu lệnh dựng; bộ xuất video (ffmpeg trên PC app hoặc máy chủ) chưa có. Có thể chọn ô trước, nhưng chỉ Đưa vào lịch được khi đã có video: tải lên ở Biên tập → Ngoài app, hoặc xuất lệnh dựng để dựng bằng công cụ khác.
    <div class="row" style="margin-top:6px"><button class="btn sm" data-x="export-cmd" ${v.edit && v.edit.scenes.length ? '' : 'disabled'}>Xuất lệnh dựng (JSON)</button><button class="btn sm" data-nav="mode:out">Sang Ngoài app → Up video</button></div></div>`;
  return `<div class="eyebrow">Chọn ngày và kênh đăng <span class="cnt small muted">Mỗi kênh một slot cho video này; giống Chia bài ảnh</span></div>${gate}${grid}
    <div class="legend small muted"><span>＋ trống</span><span>Chọn = sẽ tạo slot</span><span>Vid n = đã có video</span></div>
    <div class="row" style="gap:10px;margin-top:6px"><label class="small">Giờ đăng <input id="sp-sltime" type="time" value="19:00" style="width:110px"></label><span class="small muted" id="sp-slsum">${n ? `Đã chọn ${n} ô` : 'Chưa chọn ô nào'}</span>
      <button class="btn primary" data-x="slot-go" data-testid="sp-slot-go" ${hasFile && n ? '' : 'disabled'}>Đưa vào lịch</button></div>${slots}
    <p class="small faint">Caption từng kênh được viết từ kịch bản${AC.textApiOn(S) ? ' (AI)' : ' (mô phỏng)'}, sửa trong View ở Dashboard. Xếp nhiều video cùng lúc dùng nút Đưa video vào lịch ở màn Short Vid.</p>`;
}
// Tạo slot cho các ô đã chọn (có AI thì viết caption từng kênh trước)
export async function scheduleSelected(id, sel, time, setBusy) {
  const v = AC.byId(S.videos, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  if (!AC.isValidTime(time)) return { ok: false, error: 'Giờ không hợp lệ.' };
  const chans = AC.vidChannels(S).filter(x => sel[x.channel.id]); let captions = null;
  if (AC.textApiOn(S) && chans.length) {
    setBusy(`AI đang viết caption cho "${v.insight.title.slice(0, 40)}"…`);
    try { const p = AC.parseVidCaptions(await textCall(AC.vidCaptionsJob(S, v, chans), 3000), chans); if (p.ok) captions = p.captions; } catch (e) { toast(`AI không viết được caption, dùng bản mô phỏng: ${e.message}`, 'bad'); }
    setBusy('');
  }
  return AC.scheduleCells(S, id, { cells: Object.entries(sel).map(([channelId, date]) => ({ channelId, date })), time, captions });
}
