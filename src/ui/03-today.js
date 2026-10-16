// ---------- UI · Dashboard: tiêu đề tuần + chỉ số "Đăng đủ, đúng bài" (gộp từ màn Hôm nay cũ) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, S } from './00-state.js';
import { chTag, commit, confirmBox, curStart, curWeek, esc, fmtName, fmtNum, nowDate, nowTime, slotStateHtml, toast } from './01-core.js';
import { FAIL_TAG } from './04-week.js';
import { SETUP_TABS } from './07-setup.js';
export function slotRowHtml(s, showDate) {
  const late = s.state !== 'PUBLISHED' && `${s.date}T${s.time}` <= S.settings.demoNow;
  return `<button class="li" data-act="open-slot" data-id="${esc(s.id)}">
    <span class="mono">${showDate ? `${AC.WEEKDAY_SHORT[AC.weekdayOf(s.date)]} ` : ''}${esc(s.time)}</span>
    <span>${chTag(s.channelId)} <span class="muted">· ${esc(fmtName(s.formatId))}</span></span>
    <span class="row" style="gap:6px">${late ? FAIL_TAG : ''}${slotStateHtml(s)}</span>
  </button>`;
}
export function dashHeaderHtml(start, w, file) {
  const l = AC.weekLabelOf(start); const date = nowDate();
  const k = w ? AC.weekKpi(S, w.id) : { total: 0, ready: 0, due: 0, published: 0, asConfirmed: 0, late: [], tracking: false };
  const sc = w ? AC.slotCounts(S, w.id) : { total: 0, EMPTY: 0, APPROVED: 0, PUBLISHED: 0, needsUpdate: 0 };
  const chip = (v, label, title) => `<span class="kchip" title="${esc(title)}"><b>${esc(v)}</b> ${esc(label)}</span>`;
  const chips = [
    chip(`${k.ready}/${k.total}`, 'sẵn sàng', 'Sẵn sàng: đã duyệt hoặc đã đăng'),
    chip(k.tracking || k.due ? `${k.published}/${k.due}` : '—', 'đã đăng', 'Đã đăng / slot đã đến giờ'),
    chip(k.tracking ? `${k.asConfirmed}/${k.published}` : '—', 'đúng bản', 'Đúng bản đã chốt / đã đăng'),
    k.tracking ? chip(fmtNum(k.reach), 'tiếp cận/xem', 'Tổng Reach hoặc lượt xem của các bài đã đăng trong tuần (mô phỏng)') : '',
    k.tracking ? chip(fmtNum(k.eng), 'tương tác', 'Cảm xúc/thích + bình luận + chia sẻ + lưu (mô phỏng)') : '',
    k.late.length ? `<span class="kchip late" title="Slot đã quá giờ mà chưa đăng được"><b>${k.late.length}</b> đăng lỗi</span>` : '',
    w ? (() => { const v = AC.vidKpi(S, w.id); return `<button class="kchip${v.planned < v.min ? ' late' : ''}" data-act="nav" data-screen="shortvid" data-testid="dash-vid-kpi" title="Video ngắn có thành phẩm / kịch bản không hủy (mục tiêu ${v.target}, tối thiểu ${v.min}). Bấm để mở Short Vid."><b>${v.ready}/${v.planned}</b> video ngắn</button>`; })() : '',
  ].join('');
  const sub = sc.total ? `${sc.total} slot · ${sc.EMPTY} chưa có bài · ${sc.APPROVED + sc.PUBLISHED} sẵn sàng${sc.needsUpdate ? ` · ${sc.needsUpdate} cần cập nhật` : ''}` : 'Tuần chưa có slot. Bấm "Lập tuần" để chọn Tuần mẫu.';
  return `<div class="page-head dash-head"><div><span class="eyebrow">Dashboard · Tuần ${esc(l.iso.split('-W')[1])} · ${esc(l.range)}</span><h1>${file && file.theme ? esc(file.theme) : esc(l.short)}</h1>
      <p class="sub">${esc(sub)}</p>
      <p class="small faint mono">Hôm nay ${AC.WEEKDAY_LONG[AC.weekdayOf(date)].toLowerCase()}, ${esc(AC.dmyFull(date))} · ${esc(nowTime())} giờ demo</p></div>
    <div class="kchips" role="group" aria-label="Đăng đủ, đúng bài"><span class="eyebrow">Đăng đủ, đúng bài</span>${chips}</div></div>
    ${k.late.length ? `<details class="late-list"><summary>Slot đăng lỗi (${k.late.length})</summary><div class="list">${k.late.map(s => slotRowHtml(s, true)).join('')}</div></details>` : ''}`;
}

// ---- Nút demo từng bước (chỉ để trải nghiệm; dữ liệu mô phỏng, áp cho tuần đang chọn) ----
const DEMO_LABELS = { setup: 'Nạp Thiết lập', plan: 'Lập tuần', topics: 'Nạp Topic', write: 'Viết ma trận', approve: 'Duyệt ô', deal: 'Khóa Matrix + Viết tất cả', review: 'Duyệt slot + ảnh', confirm: 'Chốt lịch', clear: 'Làm trống tuần' };
export function demoBarHtml(steps) {
  const start = curStart();
  return `<section class="demobar" aria-label="Demo từng bước"><span class="demo-tag" title="Công cụ trải nghiệm, áp cho tuần ${esc(AC.weekLabelOf(start).range)}">Demo</span><div class="row">${steps.map(k => {
    const g = AC.demoGate(S, start, k);
    return `<button class="btn sm ghost ${k === 'clear' ? 'danger' : ''}" data-act="demo-step" data-step="${k}" ${g.ok ? '' : 'disabled'} title="${esc(g.ok ? `Chạy nhanh bước "${DEMO_LABELS[k]}" bằng dữ liệu mẫu` : g.reason)}">Demo: ${esc(DEMO_LABELS[k])}</button>`;
  }).join('')}</div></section>`;
}
ACTIONS['demo-step'] = async el => {
  const step = el.dataset.step;
  if (step === 'clear') {
    const w = curWeek(); const n = w ? AC.weekSlots(S, w.id).length : 0;
    const ok = await confirmBox({ title: 'Làm trống tuần này?', danger: true, ok: 'Làm trống', body: `<p>Xóa ${n} slot, các Topic và ô của tuần ${esc(AC.weekLabelOf(curStart()).range)} để trải nghiệm lại từ đầu. Các tuần khác không bị ảnh hưởng.</p>` });
    if (!ok) return;
  }
  const r = AC.demoRun(S, curStart(), step);
  if (!r.ok) return toast(r.error, 'bad');
  commit(r.msg);
};

// ---- Demo trong Setup: nạp mẫu cho mục đang xem, hoặc cả Thiết lập ----
export function demoSetupBarHtml(tab) {
  const label = (SETUP_TABS.find(t => t[0] === tab) || [])[1];
  const part = AC.SETUP_PARTS.includes(tab) ? tab : null;
  return `<section class="demobar" aria-label="Demo Thiết lập"><span class="demo-tag" title="Chỉ nạp phần Thiết lập; không đụng tới tuần, Topic, slot">Demo</span><div class="row">
    ${part ? `<button class="btn sm ghost" data-act="demo-setup" data-part="${part}">Demo: nạp ${esc(label)} mẫu</button>` : ''}
    <button class="btn sm ghost" data-act="demo-setup" data-part="all">Demo: nạp toàn bộ Thiết lập</button>
    <span class="small faint">Chỉ nạp phần Thiết lập; không đụng tới tuần, Topic, slot.</span></div></section>`;
}
ACTIONS['demo-setup'] = async el => {
  const part = el.dataset.part; const n = AC.demoSetupImpact(S, part);
  if (n) {
    const ok = await confirmBox({ title: part === 'all' ? 'Nạp toàn bộ Thiết lập mẫu?' : 'Nạp bản mẫu?', ok: 'Nạp mẫu', danger: true, body: `<p>${n} mục đang có sẽ bị ghi đè bằng bản mẫu (mục cùng mã). Mục bạn tự thêm giữ nguyên. Nội dung đã viết trong tuần không đổi.</p>` });
    if (!ok) return;
  }
  const r = AC.demoSetup(S, part);
  if (!r.ok) return toast(r.error, 'bad');
  commit(r.msg);
};
