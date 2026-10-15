// ---------- UI · Khung: menu, thanh trên, thanh tiến độ, điều hướng ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, RENDERERS, S, setS, view } from './00-state.js';
import { $, attr, closeLayer, commit, confirmBox, curStart, curWeek, esc, icon, mdApply, mdTa, nowDate, nowTime, openLayer, richText, store, toast } from './01-core.js';
import { paintFrameDraft, paintFrameThumbs } from './04e-frame.js';
// Trình chỉnh sửa Markdown (mục 10.28; hàm ở 01-core)
ACTIONS['md'] = el => { const ta = mdTa(el.dataset.for); if (ta) mdApply(ta, el.dataset.op, el.dataset.e); };
ACTIONS['md-tab'] = el => {
  const ta = mdTa(el.dataset.for); if (!ta) return; const wrap = ta.closest('.mded'); const pv = wrap.querySelector('.mded-pv');
  const prev = el.dataset.tab === 'preview';
  if (pv) { pv.innerHTML = richText(ta.value) || '<p class="faint">Chưa có nội dung.</p>'; pv.hidden = !prev; }
  ta.hidden = prev; wrap.classList.toggle('previewing', prev);
  wrap.querySelectorAll('[data-act="md-tab"]').forEach(x => x.setAttribute('aria-selected', String(x === el)));
  wrap.querySelectorAll('.mdb').forEach(x => { x.disabled = prev; });
};
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b' && e.target.matches && e.target.matches('textarea[data-md="full"]')) { e.preventDefault(); mdApply(e.target, 'bold'); }
});
const SCREENS = [
  { id: 'week', label: 'Dashboard', icon: 'week' },
  { id: 'matrix', label: 'Matrix', icon: 'matrix' },
  { id: 'report', label: 'Report', icon: 'chart' },
  { id: 'export', label: 'Export', icon: 'export' },
  { id: 'setup', label: 'Setup', icon: 'setup' },
];

export function go(target) {
  if (!target) return;
  if (target.screen) { view.screen = target.screen; if (target.screen === 'week') view.scrollToday = true; }
  if (target.setupTab) view.setupTab = target.setupTab;
  render();
  const m = $('#main'); if (m) { m.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  if (target.action && ACTIONS[target.action]) ACTIONS[target.action]();
}

export function renderNav() {
  const items = SCREENS.map(s => `<button ${attr({ 'data-act': 'nav', 'data-screen': s.id, 'aria-current': view.screen === s.id ? 'page' : null })}>${icon(s.icon)}<span>${s.label}</span></button>`).join('');
  $('#nav-side').innerHTML = items;
  $('#nav-bottom').innerHTML = items;
  const st = AC.setupStatus(S);
  $('#rail-foot').innerHTML = `
    <span class="small ${st.ok ? 'faint' : ''}" style="${st.ok ? '' : 'color:var(--warn)'}">${st.ok ? 'Thiết lập đủ' : `Thiết lập chưa đủ (${st.missing.length})`}</span>
    <span class="small faint">Đợt ${esc(AC.RELEASE)} · bản ${AC.BUILD} · dữ liệu ở trình duyệt này</span>`;
}
ACTIONS.nav = el => go({ screen: el.dataset.screen });

function weekStatusChip(w) {
  if (!w) return `<span class="status-chip">Chưa lập</span>`;
  if (w.status === 'CONFIRMED') return `<span class="status-chip locked">Đã chốt · bản ${w.revision}</span>`;
  if (w.status === 'REOPENED') return `<span class="status-chip reopened">Đang sửa</span>`;
  return `<span class="status-chip">Nháp</span>`;
}
function renderTopbar() {
  const w = curWeek(); const start = curStart(); const l = AC.weekLabelOf(start);
  const thisMonday = AC.mondayOf(nowDate());
  $('#topbar').innerHTML = `
    <div class="weekpick">
      <button class="btn icon ghost" data-act="week-step" data-d="-7" aria-label="Tuần trước">${icon('left')}</button>
      <span class="weeklabel" aria-live="polite"><b>${esc(l.short)}</b> <span class="small muted">${esc(l.range)}</span></span>
      <button class="btn icon ghost" data-act="week-step" data-d="7" aria-label="Tuần sau">${icon('right')}</button>
      <label class="sr" for="week-date">Nhảy tới ngày</label>
      <input id="week-date" type="date" value="${esc(start)}" data-change="week-date" title="Chọn một ngày bất kỳ để mở tuần chứa ngày đó">
      <button class="btn sm" data-act="week-today" ${start === thisMonday ? 'disabled' : ''}>Tuần này</button>
    </div>${weekStatusChip(w)}
    <span class="spacer"></span>
    <button class="btn sm ghost hide-sm mono clockbtn" data-act="demo-clock" title="Đồng hồ demo: bấm để tua giờ (tự đăng và số liệu chạy theo giờ này)">${icon('clock')} <span id="clockbtn-t">${esc(AC.dmyFull(nowDate()))} ${esc(nowTime())}</span></button>
    <button class="btn sm hide-sm" data-act="load-demo">Nạp dữ liệu demo</button>
    <button class="btn sm ghost hide-sm" data-act="reset">Reset</button>
    <button class="btn icon ghost" data-act="more-menu" aria-label="Thêm thao tác">${icon('more')}</button>`;
}
export function setWeekStart(date) { S.ui.weekStart = AC.mondayOf(date); view.monthAnchor = null; }
ACTIONS['week-step'] = el => { setWeekStart(AC.addDays(curStart(), Number(el.dataset.d))); commit(); };
ACTIONS['week-today'] = () => { setWeekStart(nowDate()); view.scrollToday = true; commit(); };
CHANGES['week-date'] = el => { if (!AC.isValidYMD(el.value)) return toast('Ngày không hợp lệ.', 'bad'); setWeekStart(el.value); commit(); };

ACTIONS['more-menu'] = () => {
  const box = openLayer(`
    <h2>Thao tác</h2>
    <div class="stack">
      <p class="small muted mono">Giờ demo: ${esc(AC.dmyFull(nowDate()))} ${esc(nowTime())}</p>
      <button class="btn" data-x="clock">${icon('clock')} Tua giờ demo</button>
      <button class="btn" data-x="theme">${icon('sun')} Đổi giao diện sáng/tối</button>
      <button class="btn" data-x="load-demo">Nạp dữ liệu demo</button>
      <button class="btn danger" data-x="reset">Reset về trống</button>
    </div>
    <div class="actions"><button class="btn" data-x="close">Đóng</button></div>`, 'dialog');
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    closeLayer();
    if (b.dataset.x === 'clock') ACTIONS['demo-clock']();
    if (b.dataset.x === 'theme') toggleTheme();
    if (b.dataset.x === 'load-demo') ACTIONS['load-demo']();
    if (b.dataset.x === 'reset') ACTIONS.reset();
  });
};
function toggleTheme() {
  const r = document.documentElement;
  const cur = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  r.setAttribute('data-theme', next); store.set('autocontent.theme', next);
}

ACTIONS['load-demo'] = async () => {
  const ok = await confirmBox({ title: 'Nạp dữ liệu demo?', body: `<p>Toàn bộ dữ liệu hiện có (${S.weeks.length} tuần, ${S.slots.length} slot) sẽ được thay bằng dữ liệu demo Nói Được English: 3 tuần (17 + 9 + 17 slot), mỗi tuần 3 Topic × 5 Cột = 15 ô.</p><p>Muốn giữ dữ liệu hiện tại thì vào Thiết lập → Sao lưu trước.</p>`, ok: 'Nạp dữ liệu demo', danger: true });
  if (!ok) return;
  setS(AC.buildSeed()); view.screen = 'week'; view.weekMode = 'week'; view.scrollToday = true; commit('Đã nạp dữ liệu demo.');
};
ACTIONS.reset = async () => {
  const ok = await confirmBox({ title: 'Reset về trống?', body: `<p>Xóa toàn bộ dữ liệu trên trình duyệt này: ${S.weeks.length} tuần, ${S.slots.length} slot, Thiết lập. Không hoàn tác được.</p><p>Nút "Nạp dữ liệu demo" vẫn dùng được sau khi reset.</p>`, ok: 'Xóa tất cả', danger: true });
  if (!ok) return;
  setS(AC.emptyState()); S.ui.weekStart = AC.mondayOf(nowDate()); view.screen = 'setup'; view.setupTab = 'brand'; commit('Đã reset. Ứng dụng đang trống.');
};

// ---- Thanh tiến độ 7 bước ----
const STEP_TARGET = [{ screen: 'week', action: 'plan-week' }, { screen: 'matrix' }, { screen: 'matrix' }, { screen: 'matrix' }, { screen: 'matrix' }, { screen: 'week' }, { screen: 'week' }];
export function progressHtml(weekId) {
  const p = AC.weekProgress(S, weekId);
  const cur = p.steps[p.current - 1];
  return `<div class="stack" style="gap:6px">
    <button class="progress-compact" data-act="toggle-progress" aria-expanded="${view.progressOpen}">
      <span><span class="eyebrow">Tiến độ tuần</span><br><b>${p.allDone ? `Đã chốt đủ ${AC.STEP_COUNT} bước` : `Bước ${p.current}/${AC.STEP_COUNT} · ${esc(cur.name)}`}</b>${!p.allDone && cur.reason ? ` <span class="small" style="color:var(--warn)">${esc(cur.reason)}</span>` : ''}</span>
      <span class="small muted">${view.progressOpen ? 'Thu gọn' : `Xem ${AC.STEP_COUNT} bước`}</span>
    </button>
    <div class="progress ${view.progressOpen ? 'open' : ''}" role="list" aria-label="Tiến độ ${AC.STEP_COUNT} bước">
      ${p.steps.map((s, i) => {
        const cls = s.done ? 'done' : (s.n === p.current ? 'cur' : '');
        const reason = !s.done && s.reason ? s.reason : '';
        return `<button role="listitem" class="pstep ${cls}" data-act="goto-step" data-i="${i}" title="${esc(s.name)}${s.done ? ' · xong' : ''}">
          <span class="pn">${s.n}</span><span class="pl">${esc(s.name)}${s.done ? '<span class="sr"> (xong)</span>' : ''}</span>${reason && s.n === p.current ? `<span class="pr">${esc(reason)}</span>` : ''}</button>`;
      }).join('')}
    </div></div>`;
}
ACTIONS['toggle-progress'] = () => { view.progressOpen = !view.progressOpen; render(); };
ACTIONS['goto-step'] = el => go(STEP_TARGET[Number(el.dataset.i)]);

export function nextBandHtml(weekId, noApproveAll) {
  const a = AC.nextAction(S, weekId);
  const later = releaseFor(a.step);
  const w = AC.weekOf(S, weekId);
  const canAll = !noApproveAll && !!w && w.status !== 'CONFIRMED' && !a.done && ((a.step === 4 && AC.bulkApprovable(S, weekId, true).length) || (a.step === 6 && AC.slotsApprovable(S, weekId, true).length));
  return `<section class="nextband" aria-label="Việc tiếp theo">
    <div class="what"><span class="eyebrow">Việc tiếp theo</span><strong>${esc(a.label)}</strong><span>${esc(a.detail || '')}${later ? ` · Nút thao tác có từ đợt ${esc(later)}` : ''}</span></div>
    ${a.done ? '' : `<div class="row" style="gap:8px;flex-wrap:wrap">${canAll ? '<button class="btn" data-act="approve-all">Duyệt tất cả</button>' : ''}<button class="btn primary" data-act="do-next">${esc(later ? 'Xem màn hình' : a.label)}</button></div>`}
  </section>`;
}
// Từ R4 mọi bước đều thao tác được
function releaseFor() { return ''; }
ACTIONS['do-next'] = () => { const a = AC.nextAction(S, AC.weekIdOf(curStart())); go(a.target); };

export function lockBannerHtml(w) {
  if (!w || w.status !== 'CONFIRMED') return '';
  return `<div class="note good row" style="justify-content:space-between"><span>Tuần đã chốt (bản ${w.revision}) nên chỉ xem. Muốn sửa slot, Cột hoặc nội dung thì mở lại tuần.</span><button class="btn sm" data-act="reopen-week">Mở lại để sửa</button></div>`;
}
ACTIONS['reopen-week'] = async () => {
  const w = curWeek();
  const pub = AC.weekSlots(S, w.id).filter(s => s.state === 'PUBLISHED').length;
  const ok = await confirmBox({ title: 'Mở lại tuần để sửa?', body: `<p>Tuần chuyển sang "Đang sửa". Sau khi sửa phải Xác nhận lịch lại, bản sẽ tăng từ ${w.revision} lên ${w.revision + 1}.</p>${pub ? `<p>${pub} slot đã đăng giữ trạng thái "Đã đăng"; slot nào bị đổi nội dung sẽ có nhãn "nội dung đã đổi sau khi đăng".</p>` : ''}`, ok: 'Mở lại để sửa' });
  if (!ok) return;
  AC.reopenWeek(S, w.id); commit('Tuần đang ở trạng thái Đang sửa.');
};

export function render() {
  if (!S.ui.weekStart || !AC.isValidYMD(S.ui.weekStart)) S.ui.weekStart = AC.mondayOf(nowDate());
  S.ui.weekStart = AC.mondayOf(S.ui.weekStart);
  renderNav(); renderTopbar();
  $('#banner').innerHTML = view.banner ? `<div class="note bad" style="margin:12px 24px 0">${view.banner}</div>` : '';
  const r = RENDERERS[view.screen];
  $('#main').innerHTML = r ? r() : '';
  if (view.screen === 'setup' && view.setupTab === 'frames') { paintFrameThumbs($('#main')); paintFrameDraft(); }
  document.title = 'AutoContent Content Matrix';
  if (view.scrollToday && view.screen === 'week') {
    view.scrollToday = false;
    const t = document.querySelector('.dl-day.today');
    if (t && getComputedStyle(t).display !== 'none') t.scrollIntoView({ block: 'nearest' });
  }
}
