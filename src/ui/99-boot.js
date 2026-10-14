// ---------- UI · Khởi động ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layerStack.length) closeLayer(); });

let oldDataKey = '';
ACTIONS['show-old-data'] = () => {
  const raw = store.get(oldDataKey) || '';
  openLayer(`<h2>Dữ liệu cũ</h2><p class="small muted">Sao chép để lưu lại nếu cần. Ứng dụng v2.8 không đọc được bản này.</p>
    <textarea readonly class="mono small" style="width:100%;min-height:240px">${esc(raw)}</textarea>
    <div class="actions"><button class="btn" data-act="copy-old-data">Sao chép</button><button class="btn primary" data-act="close-layer">Đóng</button></div>`, 'dialog');
};
ACTIONS['copy-old-data'] = () => copyText(store.get(oldDataKey) || '');
// Cho kiểm thử đọc trạng thái trong bộ nhớ (ảnh lớn nằm ở IndexedDB, không ở localStorage)
window.__AC_S = () => S;
(async function boot() {
  const theme = store.get('autocontent.theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);
  const raw = store.get(AC.STORAGE_KEY);
  try { await mediaOpen(); mediaOk = true; } catch (e) { mediaOk = false; }
  const res = AC.loadStateFromRaw(raw);
  if (res.status === 'ok') {
    S = res.state;
    if (raw.includes('"idb:')) {
      try { const h = await mediaHydrate(S); if (h.missing) setTimeout(() => toast(`${h.missing} ảnh/video không còn trong bộ nhớ trình duyệt, đã thay bằng ô xám. Khôi phục từ bản Sao lưu nếu cần.`, 'bad'), 300); mediaGc(h.refs); }
      catch (e) { setTimeout(() => toast('Không đọc được ảnh, video đã cất trong trình duyệt.', 'bad'), 300); }
    } else if (mediaOk) mediaGc(new Set());
  }
  else if (res.status === 'corrupt') {
    store.set(AC.STORAGE_KEY + '-rescue', raw);
    S = AC.emptyState(); S.ui.weekStart = AC.mondayOf(nowDate()); view.screen = 'setup'; view.setupTab = 'backup';
    view.banner = `Dữ liệu đã lưu bị hỏng (${esc(res.error)}). Bản thô đã được cứu sang khóa "${esc(AC.STORAGE_KEY)}-rescue" và ứng dụng mở trống an toàn. Bạn có thể nạp dữ liệu demo hoặc khôi phục từ bản sao lưu.`;
    save();
  } else if (res.status === 'old') {
    // Dữ liệu v2.6 hoặc v2.7: cất bản thô, nạp demo v2.8 (mục 4, V8-16)
    const tag = res.label === 'v2.6' ? '-v26' : '-v27';
    oldDataKey = AC.STORAGE_KEY + tag;
    store.set(oldDataKey, raw);
    S = AC.buildSeed(); save();
    view.banner = `Ứng dụng đã chuyển sang mô hình Topic → Matrix → Chia bài (đặc tả v2.8) nên dữ liệu cũ (${esc(res.label)}, ${esc(res.version)}) không dùng tiếp được. Bản cũ được cất trong trình duyệt ở khóa "${esc(oldDataKey)}"; dữ liệu demo mới đã được nạp. <button class="linkbtn" data-act="show-old-data">Xem bản cũ</button>`;
  } else {
    S = AC.buildSeed(); save();
    setTimeout(() => toast('Lần đầu mở: đã nạp dữ liệu demo Nói Được English.'), 300);
  }
  // R4: slot tự đăng đã đến giờ và mốc số liệu đã qua (mô phỏng)
  if (!clockOff()) AC.clockTick(S, Date.now());
  if (AC.runScheduler(S).published.length || AC.syncMetrics(S)) save(); else save();
  render();
  if (!clockOff()) setInterval(liveTick, window.__AC_TICK_MS || LIVE_TICK_MS);
})();
