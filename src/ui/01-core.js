// ---------- UI · Lõi: lưu trữ, tiện ích hiển thị, hộp thoại ----------
const AC = window.AC;
let S = null;               // trạng thái ứng dụng
const view = {              // trạng thái giao diện (không lưu)
  screen: 'week', scrollToday: true, setupTab: 'brand', weekMode: 'week', monthAnchor: null, tpcSearch: '',
  chFilter: [], progressOpen: false, banner: null,
};
const $ = (sel, el = document) => el.querySelector(sel);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function attr(o) { return Object.entries(o).filter(([, v]) => v != null && v !== false).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' '); }

// ---- Lưu trữ (an toàn khi localStorage bị chặn) ----
const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } },
};
let saveWarned = false;
function writeState(json) {
  const ok = store.set(AC.STORAGE_KEY, json);
  if (!ok && !saveWarned) { saveWarned = true; toast('Trình duyệt không cho lưu dữ liệu (hoặc đã đầy). Thay đổi chỉ còn đến khi bạn đóng trang; hãy dùng Sao lưu.', 'bad'); }
  return ok;
}
// Lưu: ảnh, video lớn cất IndexedDB trước, rồi mới ghi localStorage (mục 10.39); các lần lưu xếp hàng theo thứ tự
let saveQ = Promise.resolve(), saveBusy = 0;
function save() {
  if (!mediaOk) return writeState(JSON.stringify(S));
  const pend = new Map(); const json = stateJson(pend);
  if (!pend.size && !saveBusy) return writeState(json);
  saveBusy++;
  saveQ = saveQ.then(() => mediaPutAll(pend)).then(() => writeState(json), () => { mediaOk = false; toast('Không cất được ảnh vào bộ nhớ trình duyệt; chuyển về lưu thường.', 'bad'); writeState(JSON.stringify(S)); }).finally(() => { saveBusy--; });
  return true;
}
// Chờ các lần lưu đang xếp hàng (dùng trước khi tải lại trang)
function saveDone() { return saveQ; }
function commit(msg) { save(); render(); if (msg) toast(msg); }

// ---- Thông báo ----
function toast(text, kind, action) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = text;
  // Nút trong thông báo (vd. Hoàn tác, mục 10.31)
  if (action) { const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = action.label; b.addEventListener('click', () => { el.remove(); action.fn(); }); el.appendChild(b); }
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'bad' || action ? 7000 : 3200);
}

// ---- Lớp phủ: ngăn bên và hộp thoại ----
let layerStack = [];
function openLayer(html, kind, onMount) {
  const layer = $('#layer');
  const wrap = document.createElement('div');
  wrap.style.position = 'absolute'; wrap.style.inset = '0';
  wrap.innerHTML = `<div class="scrim" data-act="close-layer"></div><div class="${kind}" role="dialog" aria-modal="true">${html}</div>`;
  layer.appendChild(wrap);
  layer.style.pointerEvents = 'auto';
  layerStack.push(wrap);
  const box = wrap.querySelector('.' + kind);
  if (onMount) onMount(box);
  const focusable = box.querySelector('[autofocus], input, select, textarea, button');
  if (focusable) setTimeout(() => focusable.focus(), 30);
  return box;
}
function closeLayer() {
  const w = layerStack.pop(); if (w) w.remove();
  if (!layerStack.length) $('#layer').style.pointerEvents = 'none';
}
function closeAllLayers() { while (layerStack.length) closeLayer(); }

// Hộp xác nhận dựng trong trang (confirm() bị chặn trong artifact)
function confirmBox({ title, body, ok = 'Đồng ý', danger = false, extra = '' }) {
  return new Promise(resolve => {
    const box = openLayer(`
      <h2>${esc(title)}</h2>
      <div class="stack muted">${body}</div>
      ${extra}
      <div class="actions">
        <button class="btn" data-x="no">Hủy</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-x="yes">${esc(ok)}</button>
      </div>`, 'dialog');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const result = b.dataset.x === 'yes' ? (box.querySelector('[data-collect]') ? collect(box) : true) : false;
      closeLayer(); resolve(result);
    });
  });
}
function collect(box) {
  const out = {};
  box.querySelectorAll('[data-collect]').forEach(el => { out[el.dataset.collect] = el.type === 'checkbox' ? el.checked : el.value; });
  return out;
}

// ---- Biểu tượng (vẽ tay, nét 1.8) ----
const ICONS = {
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  today: '<path d="M4 7h16M4 7v12h16V7M4 7l1-3h14l1 3M9 12h6"/>',
  week: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  matrix: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  export: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
  setup: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>', gallery: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', msg: '<path d="M5 5h14v10H9l-4 4z"/>',
  chart: '<path d="M4 20h16M7 16v-5M12 16V7M17 16v-8"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`; }

// ---- Nhãn hiển thị (không mã chữ cái — UX-08) ----
const SLOT_STATE = {
  EMPTY: ['Chưa có bài', 'st-need'], DRAFT: ['Chưa duyệt', 'st-need'], APPROVED: ['Đã duyệt', 'st-ok'], PUBLISHED: ['Đã đăng', 'st-done'],
};
const CELL_STATE = { EMPTY: ['Trống', 'st-need'], DRAFT: ['Chưa duyệt', 'st-need'], APPROVED: ['Đã duyệt', 'st-ok'], CANCELLED: ['Đã hủy', 'st-off'] };
function freeTag(s) { return s.free ? '<span class="free-tag" title="Slot tự do: bạn tự viết bài, tải ảnh/video">Tự viết</span>' : ''; }
function slotStateHtml(s) {
  if (s.needsUpdate) return `<span class="st st-bad">Cần cập nhật</span>`;
  const [l, c] = SLOT_STATE[s.state] || [s.state, 'st-off'];
  return `<span class="st ${c}">${s.state === 'PUBLISHED' ? '✓ ' : ''}${l}</span>${freeTag(s)}`;
}
// Icon nền tảng (mục 10.25): logo lấy từ Simple Icons 13.21 (CC0), giữ nguyên hình, tô màu thương hiệu; Blog và nền tảng khác dùng icon trang viết
const PF_PATH = {
  facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  instagram: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  threads: 'M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
};
function pfIcon(pf) {
  return PF_PATH[pf] ? `<svg class="pfi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${PF_PATH[pf]}"/></svg>`
    : `<svg class="pfi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`;
}
// Nhãn kênh: icon nền tảng + tên (tên ẩn trên thẻ slot nhưng vẫn đọc được bằng trình đọc màn hình)
function chTag(id, label) {
  const c = AC.byId(S.channels, id); const pf = c ? AC.channelPlatform(c) : 'other'; const name = label || chName(id);
  return `<span class="ch pf-${pf}" title="${esc(name)}">${pfIcon(pf)}<span class="chn">${esc(name)}</span></span>`;
}
function chName(id) { const c = AC.byId(S.channels, id); return c ? (c.short || c.name) : 'Kênh đã xóa'; }
function fmtName(id) { const f = AC.byId(S.formats, id); return f ? f.name : 'Format đã xóa'; }
function fmtFull(id) { const f = AC.byId(S.formats, id); return f ? `${chName(f.channelId)} · ${f.name}` : 'Format đã xóa'; }
function colName(id) { const c = AC.byId(S.columns, id); return c ? c.name : 'Cột đã xóa'; }
function curStart() { return S.ui.weekStart; }
function curWeek() { return AC.weekOf(S, AC.weekIdOf(S.ui.weekStart)); }   // null nếu tuần chưa được chạm tới
// Mở bản ghi tuần hiện tại khi cần ghi dữ liệu (nạp Topic trước khi lập tuần)
function ensureCurWeek() { const r = AC.ensureWeek(S, curStart()); return r.ok ? r.week : null; }
// Ảnh minh họa mô phỏng: màu và khối sinh từ seed của phiên bản
// Hình của một phiên bản ảnh: ảnh tải lên (src) hoặc ảnh mô phỏng (SVG theo seed)
function imgVisual(v, controls, ratio) {
  if (v.src && v.kind === 'video') return `<video src="${esc(v.src)}#t=0.1" ${v.cover ? `poster="${esc(v.cover.src)}"` : ''} muted playsinline preload="metadata" ${controls ? 'controls' : ''}></video>`;
  if (v.src) return `<img src="${esc(v.src)}" alt="" loading="lazy">`;
  const g = AC.mockArt(v.seed, ratio);
  return `<svg viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g.inner}</svg>`;
}
// Loại của ô media: theo bản đang dùng (slot tự do: một ô nhận cả ảnh lẫn video)
function assetKind(a) { const v = a.versions.find(x => x.n === a.current); return v ? (v.kind === 'video' ? 'video' : 'image') : (a.kind === 'video' ? 'video' : 'image'); }
// Nhãn ngắn của một phiên bản ảnh/video
function versionLabel(v) { return v.kind === 'video' ? 'Video của bạn' + (v.cover ? ' · có bìa' : '') + (v.subs ? ' · phụ đề' : '') : v.ai ? 'AI thật' : v.lib ? 'Từ kho' : v.crop ? 'Đã cắt' : v.tpl ? 'Áp mẫu' : v.frame ? 'Đã ghép frame' : v.text ? 'Đã thêm chữ' : v.i2i ? (v.i2i.simulated === false ? 'Img2Img AI' : 'Img2Img mô phỏng') : v.src ? 'Ảnh của bạn' : 'Mô phỏng'; }
function imgThumb(a) {
  const v = a.versions.find(x => x.n === a.current);
  if (!v) return `<div class="imgbox empty" aria-label="Ô ảnh trống"><span class="small faint">${a.kind === 'video' ? 'Chưa có video' : 'Chưa có ảnh'}</span></div>`;
  return `<div class="imgbox" role="img" aria-label="${v.src ? 'Ảnh tải lên' : 'Ảnh mô phỏng'} phiên bản ${v.n}">${imgVisual(v, false, AC.assetRatioOf(a))}<span class="mock">${versionLabel(v)} · v${v.n}/${a.versions.length}</span></div>`;
}
// Số gọn kiểu Việt: 2.431 · 12,4K · 1,2Tr
function fmtNum(n) {
  n = Math.round(Number(n) || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(/,0$/, '') + 'Tr';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.', ',').replace(/,0$/, '') + 'K';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtPct(x) { return `${(Math.round(x * 1000) / 10).toString().replace('.', ',')}%`; }
function tsLabel(ts) { return ts ? `${AC.dmy(ts.slice(0, 10))} ${ts.slice(11, 16)}` : ''; }
function nowDate() { return S.settings.demoNow.slice(0, 10); }
function nowTime() { return S.settings.demoNow.slice(11, 16); }

// ---- Trình bày bài (mục 10.26): nhãn [Mục] và # ## ### thành tiêu đề, mỗi dòng một đoạn, - / 1. / "Bước n:" thành danh sách, **đậm**.
// marks: [{s, e, cls}] vị trí trong văn bản gốc (cảnh báo quy tắc, từ khóa tìm) — giữ nguyên khi chia khối
function richBlocks(text) {
  const out = []; let pos = 0;
  String(text || '').split('\n').forEach(line => {
    const s = pos; pos += line.length + 1;
    if (!line.trim()) return;
    const lead = line.length - line.trimStart().length; let m;
    if ((m = /^\[([^\]]+)\]\s*$/.exec(line.trim()))) return out.push({ t: 'h2', s: s + lead + 1, e: s + lead + 1 + m[1].length });
    if ((m = /^(#{1,3})\s+/.exec(line.trim()))) return out.push({ t: 'h' + m[1].length, s: s + lead + m[0].length, e: s + line.length });
    if ((m = /^>\s?/.exec(line.trim()))) return out.push({ t: 'quote', s: s + lead + m[0].length, e: s + line.length });
    if ((m = /^[-*•]\s+/.exec(line.trim()))) return out.push({ t: 'ul', s: s + lead + m[0].length, e: s + line.length });
    if ((m = /^\d+[.)]\s+/.exec(line.trim()))) return out.push({ t: 'ol', s: s + lead + m[0].length, e: s + line.length, n: parseInt(line.trim(), 10) });
    if (/^(Bước|Slide)\s*\d+:/.test(line.trim())) return out.push({ t: 'step', s: s + lead, e: s + line.length });
    out.push({ t: 'p', s: s + lead, e: s + line.length });
  });
  return out;
}
function richInline(text, s, e, marks) {
  const n = e - s; if (n <= 0) return '';
  const mk = new Array(n).fill(null), bold = new Uint8Array(n), hide = new Uint8Array(n), ital = new Uint8Array(n);
  (marks || []).forEach(m => { for (let i = Math.max(m.s, s); i < Math.min(m.e, e); i++) if (mk[i - s] == null) mk[i - s] = m.cls || ''; });
  const seg = text.slice(s, e); const re = /\*\*(?=\S)([^*]+?)\*\*/g; let m;
  while ((m = re.exec(seg))) { const a = m.index, z = a + m[0].length; hide[a] = hide[a + 1] = hide[z - 1] = hide[z - 2] = 1; for (let i = a + 2; i < z - 2; i++) bold[i] = 1; }
  // Nghiêng *chữ* hoặc _chữ_ (mục 10.30)
  const ire = /(^|[^*\p{L}\p{N}])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\p{L}\p{N}])|(^|[^\p{L}\p{N}_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\p{L}\p{N}_])/gu;
  while ((m = ire.exec(seg))) {
    const a = m.index + (m[1] != null ? m[1] : m[3] || '').length; const z = a + (m[2] != null ? m[2] : m[4]).length + 2;
    if (hide[a] || hide[z - 1] || bold[a]) continue;
    hide[a] = hide[z - 1] = 1; for (let i = a + 1; i < z - 1; i++) ital[i] = 1;
  }
  const step = /^(Bước|Slide)\s*\d+:/.exec(seg); if (step) for (let i = 0; i < step[0].length; i++) bold[i] = 1;
  // Liên kết [chữ](url) (mục 10.40): ẩn ngoặc và url, chữ neo thành link
  const lnk = new Array(n).fill(null); const lre = /(^|[^!])\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  while ((m = lre.exec(seg))) { const a = m.index + m[1].length, z = m.index + m[0].length, ae = a + 1 + m[2].length; hide[a] = 1; for (let i = ae; i < z; i++) hide[i] = 1; for (let i = a + 1; i < ae; i++) lnk[i] = m[3]; }
  let out = '', i = 0;
  while (i < n) {
    if (hide[i]) { i++; continue; }
    let j = i; while (j < n && !hide[j] && bold[j] === bold[i] && ital[j] === ital[i] && mk[j] === mk[i] && lnk[j] === lnk[i]) j++;
    let h = esc(seg.slice(i, j)); if (mk[i] != null) h = `<mark class="${mk[i]}">${h}</mark>`; if (ital[i]) h = `<em>${h}</em>`; if (bold[i]) h = `<strong>${h}</strong>`;
    if (lnk[i]) h = `<a class="rt-a" href="${esc(lnk[i])}" target="_blank" rel="noopener" title="${esc(lnk[i])}">${h}</a>`;
    out += h; i = j;
  }
  return out;
}
function richText(text, marks) {
  const t = String(text || ''); let out = '', list = '';
  const close = () => { if (list) { out += list === 'ol' ? '</ol>' : '</ul>'; list = ''; } };
  const blocks = richBlocks(t);
  // Tiêu đề cao nhất trong bài (trừ # tên bài) hiện là cấp 2: Topic dùng ### cho các mục thì ### thành cấp 2
  const lv = blocks.filter(b => /^h[23]$/.test(b.t)).map(b => +b.t[1]); const shift = lv.length && Math.min(...lv) === 3 ? 1 : 0;
  blocks.forEach(b => { if (shift && /^h[23]$/.test(b.t)) b.t = 'h' + (+b.t[1] - shift); });
  blocks.forEach(b => {
    const inner = richInline(t, b.s, b.e, marks);
    if (b.t === 'ul' || b.t === 'ol' || b.t === 'step') {
      if (list !== b.t) { close(); out += b.t === 'ol' ? `<ol${b.n > 1 ? ` start="${b.n}"` : ''}>` : b.t === 'step' ? '<ul class="steps">' : '<ul>'; list = b.t; }
      out += `<li>${inner}</li>`; return;
    }
    close();
    out += b.t === 'p' ? `<p>${inner}</p>` : b.t === 'quote' ? `<blockquote class="rt-q">${inner}</blockquote>` : `<${b.t} class="rt-${b.t}">${inner}</${b.t}>`;
  });
  close();
  return out;
}
// Nội dung Topic theo Khung Topic (mục 10.30): mỗi mục ### là một khối, trình bày theo kiểu của mục trong khung
const TP_PAIRS = { myth: ['Ngộ nhận', 'Thực tế'], qa: ['Câu hỏi', 'Đáp án'] };
function topicRich(text, marks) {
  const t = String(text || ''); const blocks = richBlocks(t);
  const groups = [{ h: null, style: 'para', bs: [] }];
  blocks.forEach(b => {
    if (/^h[123]$/.test(b.t)) { const sec = AC.matchTopicSection(S, t.slice(b.s, b.e)); groups.push({ h: b, style: sec ? sec.style : 'para', bs: [] }); }
    else groups[groups.length - 1].bs.push(b);
  });
  const nums = html => html.replace(/(^|>)([^<]+)/g, (_, a, x) => a + x.replace(/\d+(?:[.,]\d+)*\s?%|\d{2,}(?:[.,]\d+)*/g, n => `<b class="tnum">${n}</b>`));
  return groups.filter(g => g.h || g.bs.length).map(g => {
    let body = '', list = '';
    const close = () => { if (list) { body += list === 'ul' || list === 'step' ? '</ul>' : '</ol>'; list = ''; } };
    const pair = TP_PAIRS[g.style];
    g.bs.forEach(b => {
      let inner = null;
      if (pair) {
        const ln = t.slice(b.s, b.e);
        const ma = new RegExp(`^\\**\\s*${pair[0]}\\s*\\**\\s*:\\s*\\**`, 'iu').exec(ln);
        const mbAt = new RegExp(`\\**\\s*${pair[1]}\\s*\\**\\s*:\\s*\\**`, 'iu').exec(ln);
        if (ma && mbAt && mbAt.index > ma[0].length) {
          close();
          body += `<div class="tpair tpair-${g.style}"><div class="tp-a"><span class="tp-l">${esc(pair[0])}</span><span>${richInline(t, b.s + ma[0].length, b.s + mbAt.index, marks)}</span></div><div class="tp-b"><span class="tp-l">${esc(pair[1])}</span><span>${richInline(t, b.s + mbAt.index + mbAt[0].length, b.e, marks)}</span></div></div>`;
          return;
        }
        const one = ma || (mbAt && mbAt.index === 0 ? mbAt : null);
        if (one) { close(); body += `<p class="tline ${one === ma ? 'a' : 'b'}"><span class="tp-l">${esc(one === ma ? pair[0] : pair[1])}</span> ${richInline(t, b.s + one[0].length, b.e, marks)}</p>`; return; }
      }
      inner = richInline(t, b.s, b.e, marks);
      if (g.style === 'stats') inner = nums(inner);
      if (b.t === 'ul' || b.t === 'ol' || b.t === 'step') {
        const kind = g.style === 'steps' && b.t !== 'step' ? 'tsteps' : b.t;
        if (list !== kind) { close(); body += kind === 'tsteps' ? '<ol class="tsteps">' : kind === 'ol' ? `<ol${b.n > 1 ? ` start="${b.n}"` : ''}>` : kind === 'step' ? '<ul class="steps">' : '<ul>'; list = kind; }
        body += `<li>${inner}</li>`; return;
      }
      close();
      body += b.t === 'quote' ? `<blockquote class="rt-q">${inner}</blockquote>` : `<p>${inner}</p>`;
    });
    close();
    return `<section class="tsec tsec-${g.style}">${g.h ? `<h2 class="rt-h2">${richInline(t, g.h.s, g.h.e, marks)}</h2>` : ''}${body}</section>`;
  }).join('');
}
function warnMarks(ws) { const r = []; (ws || []).forEach(w => (w.ranges || []).forEach(x => r.push({ s: x[0], e: x[1], cls: w.level === 'note' ? 'note' : '' }))); return r; }
function warningsHtml(ws) {
  if (!ws.length) return `<p class="small" style="color:var(--good)">Không có cảnh báo quy tắc.</p>`;
  return `<div class="warns">${ws.map(w => `<div class="warn-i"><span class="lvl ${w.level}">${w.level === 'error' ? 'Lỗi' : 'Lưu ý'}</span><span>${esc(AC.RULE_NAMES[w.id] || '')}: ${esc(w.text)}</span></div>`).join('')}</div>
    <p class="faint small">Cảnh báo chỉ để tham khảo, không chặn duyệt hay xác nhận.</p>`;
}
function scoreHtml(scores, total, tip, criteria, ai) {
  if (total == null) return '';
  const thr = S.settings.reviewThreshold;
  return `<div class="score">
    <div class="tot"><b>${total}</b><span class="muted">/100</span><span class="mock">${ai && ai.scored ? `AI chấm · ${esc((AC.TEXT_PROVIDERS[ai.provider] || {}).label || ai.provider)}` : 'AI chấm · Mô phỏng'}</span>${ai ? `<span class="sim-tag real">Bài do AI viết</span>` : ''}${total < thr ? '<span class="st st-need">Nên xem lại</span>' : ''}</div>
    ${(criteria || []).map(c => { const s = (scores.find(x => x.criterionId === c.id) || {}).score || 0; return `<div class="bar"><span>${esc(c.name)}</span><i><span style="width:${s * 20}%"></span></i><span class="mono">${s}/5</span></div>`; }).join('')}
    ${tip ? `<p class="small"><b>Gợi ý:</b> ${esc(tip)}</p>` : ''}
  </div>`;
}

// ---- Trình chỉnh sửa Markdown cơ bản (mục 10.28): thanh công cụ + Viết/Xem trước; nội dung vẫn là văn bản Markdown ----
// mode 'full' (Topic, Cell, Blog): tiêu đề mục, đậm, danh sách; 'social' (Facebook, Threads…): gạch đầu dòng "•", danh sách số, emoji
const MD_EMOJI = ['👉', '✅', '💡', '📌', '❓', '🔥'];
function mdToolbarHtml(id, mode, preview, ai) {
  const b = (op, label, title, cls = '') => `<button type="button" class="mdb ${cls}" data-act="md" data-op="${op}" data-for="${id}" title="${esc(title)}" aria-label="${esc(title)}">${label}</button>`;
  const tools = mode === 'social'
    ? b('bullet', '•', 'Gạch đầu dòng •') + b('ol', '1.', 'Danh sách số') + '<span class="mdsep"></span>' + MD_EMOJI.map(e => b('emoji', e, `Chèn ${e}`, 'emo').replace('data-op="emoji"', `data-op="emoji" data-e="${e}"`)).join('')
    : b('h2', '<b>H</b>', 'Tiêu đề mục (## )') + b('bold', '<b>B</b>', 'In đậm (Ctrl+B)') + b('ul', '•', 'Gạch đầu dòng (- )') + b('ol', '1.', 'Danh sách số') + b('step', 'B1', 'Bước (Bước 1: …)');
  // Trợ lý viết (mục 10.35): sửa đoạn bằng AI và phương án hook là mô phỏng; hashtag & CTA lấy từ thư viện thật
  const aiTools = ai ? `<span class="mdsep"></span><button type="button" class="mdb mdb-ai" data-act="ai-edit" data-for="${id}" title="Sửa đoạn đang chọn bằng AI (mô phỏng)">✨ Sửa đoạn</button><button type="button" class="mdb mdb-ai" data-act="ai-hooks" data-for="${id}" title="Phương án hook và caption (mô phỏng)">Hook</button><button type="button" class="mdb mdb-ai" data-act="snip" data-for="${id}" title="Chèn hashtag hoặc lời kêu gọi từ thư viện"># CTA</button>` : '';
  return `<div class="mded-bar" role="toolbar" aria-label="Định dạng">${tools}${aiTools}<span class="mdsep"></span>${b('undo', icon('undo'), 'Hoàn tác (Ctrl+Z)')}${preview ? `<span class="mded-tabs" role="tablist"><button type="button" role="tab" data-act="md-tab" data-tab="write" data-for="${id}" aria-selected="true">Viết</button><button type="button" role="tab" data-act="md-tab" data-tab="preview" data-for="${id}" aria-selected="false">Xem trước</button></span>` : ''}</div>`;
}
// Ô soạn mà thanh công cụ tác động. Ô Sửa Blog dạng khối (mục 10.46): #pv-edit là bản ghép ẩn; công cụ tác động lên đoạn chữ đang đứng (hoặc đoạn đầu khi first)
let mdSegLast = 0;
function mdTa(id, first) {
  const m = document.getElementById(id); if (!m || !m.hidden || !m.classList.contains('pv-edit')) return m;
  const segs = [...document.querySelectorAll('.pv-seg')]; if (!segs.length) return m;
  return first ? segs[0] : segs.find(x => x === document.activeElement) || segs[mdSegLast] || segs[0];
}
function mdEditorHtml(id, value, opts = {}) {
  const mode = opts.mode || 'full'; const pv = mode === 'full' && opts.preview !== false;
  return `<div class="mded" data-mode="${mode}">${mdToolbarHtml(id, mode, pv, opts.ai)}<textarea id="${id}" class="mded-ta ${opts.cls || ''}" data-md="${mode}" spellcheck="false" ${opts.attrs || ''} style="min-height:${opts.h || 260}px">${esc(value || '')}</textarea>${pv ? `<div class="mded-pv content-text rich" data-pv-for="${id}" hidden></div>` : ''}</div>`;
}
// Thay đoạn [a, b) bằng chữ mới, giữ được Hoàn tác của trình duyệt khi có thể
function mdReplace(ta, a, b, text, selA, selB) {
  ta.focus(); ta.setSelectionRange(a, b);
  let ok = false; try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
  if (!ok) { ta.setRangeText(text, a, b, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  if (selA != null) ta.setSelectionRange(selA, selB == null ? selA : selB);
}
function mdApply(ta, op, arg) {
  const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
  if (op === 'undo') { ta.focus(); try { document.execCommand('undo'); } catch (er) { /* trình duyệt không hỗ trợ */ } return; }
  if (op === 'emoji') return mdReplace(ta, s, e, arg, s + arg.length);
  if (op === 'bold') {
    const sel = v.slice(s, e);
    if (/^\*\*[\s\S]+\*\*$/.test(sel)) return mdReplace(ta, s, e, sel.slice(2, -2), s, e - 4);
    if (v.slice(s - 2, s) === '**' && v.slice(e, e + 2) === '**') return mdReplace(ta, s - 2, e + 2, sel, s - 2, e - 2);
    return mdReplace(ta, s, e, `**${sel || 'chữ đậm'}**`, s + 2, s + 2 + (sel || 'chữ đậm').length);
  }
  // Thao tác theo dòng: bật/tắt tiền tố cho mọi dòng được chọn
  const a = v.lastIndexOf('\n', s - 1) + 1; let b = v.indexOf('\n', e > s && v[e - 1] === '\n' ? e - 1 : e); if (b < 0) b = v.length;
  const lines = v.slice(a, b).split('\n'); const body = lines.filter(l => l.trim());
  const RX = { h2: /^#{1,6}\s+/, ul: /^[-*]\s+/, bullet: /^•\s*/, ol: /^\d+[.)]\s+/, step: /^Bước\s*\d+:\s*/ };
  const rx = RX[op]; if (!rx) return;
  const on = body.length && body.every(l => rx.test(l.trimStart()));
  const strip = l => l.trimStart().replace(/^(#{1,6}\s+|[-*]\s+|•\s*|\d+[.)]\s+|Bước\s*\d+:\s*)/, '');
  let n = 0;
  const out = lines.map(l => { if (!l.trim()) return l; if (on) return strip(l); n++; const c = strip(l); return op === 'h2' ? `## ${c}` : op === 'ul' ? `- ${c}` : op === 'bullet' ? `• ${c}` : op === 'ol' ? `${n}. ${c}` : `Bước ${n}: ${c}`; }).join('\n');
  mdReplace(ta, a, b, out, a, a + out.length);
}

