// ---------- UI · Short Vid: Đưa vào lịch (slot video trên các kênh video, caption từng kênh) (mục 10.75) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { $, closeAllLayers, closeLayer, commit, esc, icon, openLayer, save, toast } from './01-core.js';
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
    $('#sc-ok', box).disabled = true; let slots = 0, vids = 0; const shifted = [];
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
      slots += res.slots.length; vids++; shifted.push(...res.shifted); save();
    }
    busy.textContent = ''; $('#sc-ok', box).disabled = false;
    if (!vids) return;
    closeAllLayers(); commit(`Đã đưa ${vids} video vào lịch (${slots} slot).`);
    if (shifted.length) toast(`Trùng lịch, đã tự đẩy giờ: ${shifted.join(' ')}`, 'bad');
    toast('Xem và duyệt caption ở Dashboard.', '', { label: 'Mở Dashboard', fn: () => go({ screen: 'week' }) });
  });
  return box;
}

// ---- Tab "Xếp Slot" trong popup thẻ Vid (mục 10.76, làm lại ở 10.86): bảng Kênh × Ngày; bấm ô để chọn giờ đăng, kéo ô trong cùng kênh để đổi ngày ----
const posOfVid = (v2) => AC.vidsOf(S, v2.weekId, v2.topicId).findIndex(x => x.id === v2.id) + 1;
// Ảnh nhỏ của một slot: video của Short Vid dùng ảnh bìa; slot khác dùng ảnh đầu tiên có sẵn; không có thì ô giữ chỗ
function slotThumb(s) {
  let src = '';
  if (s.videoId) { const vd = AC.byId(S.videos, s.videoId); const li = vd && vd.file && vd.file.libId && AC.libraryOf(S).find(x => x.id === vd.file.libId); src = (vd && AC.vidThumbOf(vd).src) || (li && li.cover) || ''; }
  if (!src) { const a = (s.assets || []).find(x => x.versions.some(vv => vv.n === x.current && /^data:image\//.test(vv.src || ''))); if (a) src = a.versions.find(vv => vv.n === a.current).src; }
  return /^data:image\//.test(src) ? `<img src="${esc(src)}" alt="">` : `<span class="td-ph" aria-hidden="true">${s.videoId ? '▶' : 'Aa'}</span>`;
}
function slotName(s) { const vd = s.videoId && AC.byId(S.videos, s.videoId); if (vd) return vd.insight.title; const f = String(s.text || '').split('\n').map(x => x.replace(/^(?:\[[^\]]*\]|#+\s)\s*/, '').trim()).find(Boolean); return f || (AC.byId(S.formats, s.formatId) || {}).name || 'Bài'; }
const chanName = id => (AC.byId(S.channels, id) || {}).name || id;
// Hộp chọn giờ đăng cho một kênh trong một ngày: kèm ảnh nhỏ các bài đã có của kênh trong ngày đó. Trùng lịch (dưới 30 phút) thì tự đẩy giờ và báo, người dùng sửa lại hoặc xác nhận lần nữa.
// Trả về { time } hoặc { remove: true } hoặc null (Hủy)
export function timeDialog(o) {
  return new Promise(resolve => {
    const others = AC.channelDaySlots(S, o.weekId, o.channelId, o.date, o.except || []);
    const list = others.length ? `<div class="td-list" data-testid="td-list">${others.map(s => `<div class="td-it" data-t="${esc(s.time)}">${slotThumb(s)}<span class="mono">${esc(s.time)}</span><span class="small muted">${esc(slotName(s).slice(0, 28))}</span></div>`).join('')}</div>` : '<p class="small muted" data-testid="td-empty">Kênh này chưa có bài nào trong ngày.</p>';
    const box = openLayer(`<header><div><span class="eyebrow">${esc(chanName(o.channelId))} · ${esc(dayLabel(o.date))}</span><h2>${esc(o.title || 'Giờ đăng')}</h2></div></header>
      <div class="stack"><div class="field"><label for="td-time">Giờ đăng</label><input id="td-time" data-testid="td-time" type="time" value="${esc(o.time)}" style="width:130px"></div>
        <div class="stack" style="gap:4px"><span class="small"><b>Bài của kênh trong ngày</b></span>${list}</div>
        <div class="vp-note warn" id="td-warn" data-testid="td-warn" role="alert" hidden></div>
        <div class="actions">${o.canRemove ? '<button class="btn ghost danger" data-x="rm" data-testid="td-remove">Bỏ ô này</button>' : ''}<button class="btn ghost" data-x="no">Hủy</button><button class="btn primary" data-x="yes" data-testid="td-ok">Xác nhận</button></div></div>`, 'dialog');
    const inp = box.querySelector('#td-time'), warn = box.querySelector('#td-warn');
    const mark = t => box.querySelectorAll('.td-it').forEach(e => e.classList.toggle('clash', Math.abs(Number(e.dataset.t.slice(0, 2)) * 60 + Number(e.dataset.t.slice(3)) - (Number(t.slice(0, 2)) * 60 + Number(t.slice(3)))) < AC.SLOT_GAP_MIN));
    mark(o.time);
    inp.addEventListener('input', () => { if (AC.isValidTime(inp.value)) mark(inp.value); warn.hidden = true; });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'no') { closeTop(); resolve(null); return; }
      if (b.dataset.x === 'rm') { closeTop(); resolve({ remove: true }); return; }
      const ft = AC.freeSlotTime(S, o.weekId, o.channelId, o.date, inp.value, o.except || []);
      if (!ft.ok) { warn.hidden = false; warn.textContent = ft.error; return; }
      if (ft.shifted) { inp.value = ft.time; mark(ft.time); warn.hidden = false; warn.textContent = `Trùng lịch: ${AC.shiftMsg(S, o.channelId, o.date, ft)} Sửa giờ nếu muốn, hoặc bấm Xác nhận để dùng ${ft.time}.`; return; }
      closeTop(); resolve({ time: ft.time });
    });
  });
}
const closeTop = () => closeLayer();
export function slotPaneHtml(v, sel) {
  const days = AC.weekDays(S, v.weekId); const chans = AC.vidChannels(S); const own = AC.vidSlotsOf(S, v.id); const ownIds = own.map(s => s.id);
  const hasFile = !!v.file; const n = Object.keys(sel).length; const rs = AC.renderState(v);
  if (!chans.length) return '<p class="small muted">Chưa có kênh video ngắn (TikTok, Reels, Shorts) có Format kịch bản ngắn ở Setup.</p>';
  const cell = (d, ch) => {
    const c = ch.channel.id; const k = `${d}|${c}`; const o = own.find(s => s.channelId === c && s.date === d); const p = sel[c] && sel[c].date === d ? sel[c] : null;
    if (o) return o.state === 'PUBLISHED' ? `<button class="vp-slc on" data-x="own" data-s="${esc(o.id)}" data-k="${esc(k)}" title="Đã đăng, không sửa được">${esc(o.time)}</button>` : `<button class="vp-slc on" draggable="true" data-x="own" data-s="${esc(o.id)}" data-k="${esc(k)}" aria-label="Đã xếp ${esc(dayLabel(d))} ${esc(ch.channel.name)} lúc ${esc(o.time)}: bấm để sửa giờ, kéo sang ngày khác" title="Đã xếp: bấm để sửa giờ, kéo sang ngày khác cùng kênh">${esc(o.time)}</button>`;
    if (p) return `<button class="vp-slc pick" draggable="true" data-x="pick" data-k="${esc(k)}" aria-label="Đã chọn ${esc(dayLabel(d))} ${esc(ch.channel.name)} lúc ${esc(p.time)}: bấm để sửa giờ, kéo sang ngày khác" title="Đã chọn: bấm để sửa giờ, kéo sang ngày khác cùng kênh">${esc(p.time)}</button>`;
    const cnt = AC.channelDaySlots(S, v.weekId, c, d, ownIds).length;
    return `<button class="vp-slc" data-x="cell" data-k="${esc(k)}" aria-label="${esc(dayLabel(d))}, ${esc(ch.channel.name)}${cnt ? `, đã có ${cnt} bài` : ''}">＋${cnt ? `<i class="vp-n" title="Đã có ${cnt} bài của kênh trong ngày">${cnt}</i>` : ''}</button>`;
  };
  const grid = `<div class="vp-slwrap"><table class="vp-sl" data-testid="sp-slgrid"><thead><tr><th class="ch">Kênh</th>${days.map(d => `<th>${esc(dayLabel(d))}</th>`).join('')}</tr></thead><tbody>${chans.map(ch => `<tr><th class="ch" scope="row">${esc(ch.channel.name)}</th>${days.map(d => `<td data-drop="${esc(`${d}|${ch.channel.id}`)}">${cell(d, ch)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const slots = own.length ? `<div class="stack" style="gap:4px;margin-top:8px">${own.map(sl => `<div class="row small" style="gap:6px"><b>${esc(chanName(sl.channelId))}</b><span class="mono">${esc(AC.dmy(sl.date))} ${esc(sl.time)}</span><span class="muted">${sl.state === 'PUBLISHED' ? 'Đã đăng' : 'Chờ duyệt caption'}</span></div>`).join('')}
    <div class="row"><button class="btn sm ghost danger" data-x="unsched" ${own.every(sl => sl.state === 'PUBLISHED') ? 'disabled' : ''}>Bỏ khỏi lịch</button><span class="small faint">Caption từng kênh sửa và duyệt trong View ở Dashboard.</span></div></div>` : '';
  const why = AC.renderBlockers(v); const canRender = !hasFile && !why;
  const gate = hasFile ? (rs === 'stale' ? `<div class="vp-note warn" data-testid="sp-slstale"><b>Biên tập đã đổi sau lần ren cuối.</b> Video dùng để đăng là bản ren cũ.<div class="row" style="margin-top:6px"><button class="btn sm" data-x="render" data-testid="sp-rerender">Ren lại</button></div></div>` : '')
    : `<div class="vp-note warn" data-testid="sp-slgate"><b>Chưa có video thành phẩm.</b> ${canRender ? 'Ren Vid để tạo video (tự lưu vào Kho). Có thể chọn ô trước.' : esc(why === 'Chưa Hoàn thành biên tập.' ? 'Hoàn thành biên tập rồi Ren Vid ở tab Biên tập. Có thể chọn ô trước.' : `${why} Có thể chọn ô trước.`)}
    <div class="row" style="margin-top:6px">${canRender ? '<button class="btn sm primary" data-x="render" data-testid="sp-render">Ren Vid</button>' : ''}<button class="btn sm" data-nav="tab:bt">Sang tab Biên tập</button><button class="btn sm" data-x="export-cmd" ${v.edit && v.edit.scenes.length ? '' : 'disabled'}>Xuất lệnh dựng (JSON)</button></div></div>`;
  // Mục 10.88: slot đã xếp vẫn dùng bản chép cũ khi thẻ có video mới; cập nhật khi người dùng muốn
  const pend = AC.vidSlotsPending(S, v.id).length;
  const pendNote = pend ? `<div class="vp-note warn" data-testid="sp-slpend"><b>${pend} slot đang dùng video cũ.</b> Slot không tự đổi. Cập nhật thì slot nhận video mới, giữ caption, về Chưa duyệt để duyệt lại.<div class="row" style="margin-top:6px"><button class="btn sm primary" data-x="vslot-all" data-testid="sp-vslotall">Cập nhật cả ${pend} slot</button></div></div>` : '';
  return `${pendNote}<div class="eyebrow">Chọn ngày và giờ đăng <span class="cnt small muted">Bấm ô để chọn giờ; bấm ô đã chọn để sửa; kéo ô sang ngày khác trong cùng kênh</span></div>${gate}${grid}
    <div class="legend small muted"><span>＋ trống (số nhỏ = bài đã có của kênh)</span><span>Giờ xanh đậm = sẽ tạo slot</span><span>Giờ nền màu = đã có slot</span></div>
    <div class="row" style="gap:10px;margin-top:6px"><span class="small muted" id="sp-slsum">${n ? `Đã chọn ${n} ô` : 'Chưa chọn ô nào'}</span>
      <button class="btn primary" data-x="slot-go" data-testid="sp-slot-go" ${hasFile && n ? '' : 'disabled'}>Đưa vào lịch</button></div>${slots}
    <p class="small faint">Caption từng kênh được viết từ kịch bản${AC.textApiOn(S) ? ' (AI)' : ' (mô phỏng)'}, sửa trong View ở Dashboard. Xếp nhiều video cùng lúc dùng nút Đưa video vào lịch ở màn Short Vid.</p>`;
}
// Tạo slot cho các ô đã chọn: sel = { kênh: { date, time } } (có AI thì viết caption từng kênh trước)
export async function scheduleSelected(id, sel, setBusy) {
  const v = AC.byId(S.videos, id); if (!v) return { ok: false, error: 'Không thấy thẻ Vid.' };
  const chans = AC.vidChannels(S).filter(x => sel[x.channel.id]); let captions = null;
  if (AC.textApiOn(S) && chans.length) {
    setBusy(`AI đang viết caption cho "${v.insight.title.slice(0, 40)}"…`);
    try { const p = AC.parseVidCaptions(await textCall(AC.vidCaptionsJob(S, v, chans), 3000), chans); if (p.ok) captions = p.captions; } catch (e) { toast(`AI không viết được caption, dùng bản mô phỏng: ${e.message}`, 'bad'); }
    setBusy('');
  }
  return AC.scheduleCells(S, id, { cells: Object.entries(sel).map(([channelId, c]) => ({ channelId, date: c.date, time: c.time })), captions });
}
