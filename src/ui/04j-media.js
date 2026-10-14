// ---------- Ảnh AI thật qua API, ảnh bìa và phụ đề video (mục 10.38) ----------
// Mỗi nhà cung cấp một khoá (OpenAI dùng chung cho ảnh và chữ): bộ nhớ, hoặc localStorage "autocontent.key.<nhà cung cấp>"
const KEY_PREFIX = 'autocontent.key.';
const keyMem = {};
function keyFor(p) { if (keyMem[p] != null) return keyMem[p]; try { return localStorage.getItem(KEY_PREFIX + p) || ''; } catch (e) { return ''; } }
function keyRememberedFor(p) { try { return !!localStorage.getItem(KEY_PREFIX + p); } catch (e) { return false; } }
function setKeyFor(p, k, remember) {
  keyMem[p] = k || '';
  try { if (remember && k) localStorage.setItem(KEY_PREFIX + p, k); else localStorage.removeItem(KEY_PREFIX + p); } catch (e) { /* trình duyệt chặn lưu: giữ trong bộ nhớ */ }
}
const apiKey = () => keyFor(AC.imageApiOf(S).provider);
const keyRemembered = () => keyRememberedFor(AC.imageApiOf(S).provider);
const setApiKey = (k, remember) => setKeyFor(AC.imageApiOf(S).provider, k, remember);
const maskKey = k => k ? `…${k.slice(-4)}` : '';
function dataUrlToBlob(d) {
  const i = d.indexOf(','); const mime = (/^data:([^;,]+)/.exec(d) || [])[1] || 'application/octet-stream';
  const bin = atob(d.slice(i + 1)); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return new Blob([u], { type: mime });
}
function blobToDataUrl(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Không đọc được dữ liệu ảnh.')); r.readAsDataURL(b); }); }
// Ảnh API thường 1–2 MB PNG: nén về JPEG cạnh dài tối đa 1600px cho vừa bộ nhớ trình duyệt
async function shrinkDataUrl(d, max) {
  const img = await loadImg(d); const k = Math.min(1, (max || 1600) / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88);
}
async function apiFetch(req, timeoutMs) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeoutMs || 120000);
  let body;
  if (req.form) { body = new FormData(); req.form.forEach(([k, v]) => { if (v && typeof v === 'object') body.append(k, dataUrlToBlob(v.file), v.name); else body.append(k, v); }); }
  else if (req.json) body = JSON.stringify(req.json);
  let host = req.url; try { host = new URL(req.url).host; } catch (e) { /* giữ nguyên */ }
  try {
    const r = await fetch(req.url, { method: body ? 'POST' : 'GET', headers: req.headers, body, signal: ctl.signal });
    const txt = await r.text(); let j = null;
    try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = { message: txt.slice(0, 200) }; }
    return { status: r.status, body: j };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('API không phản hồi kịp, thử lại sau.');
    throw new Error(`Không kết nối được tới ${host}. Trình xem artifact có thể chặn gọi ra ngoài, hoặc máy chủ không cho trình duyệt gọi thẳng. Thử tải tệp HTML về máy rồi mở bằng trình duyệt.`);
  } finally { clearTimeout(tm); }
}
const providerLabel = () => (AC.IMAGE_PROVIDERS[AC.imageApiOf(S).provider] || {}).label || '';
async function imageApiCall(mode, o) {
  const cfg = AC.imageApiOf(S); const req = AC.buildImageRequest(cfg, apiKey(), Object.assign({ mode }, o));
  if (!req.ok) throw new Error(req.error);
  const r = await apiFetch(req); const p = AC.parseImageResponse(cfg.provider, r.status, r.body);
  if (!p.ok) throw new Error(p.error);
  let src = p.src;
  if (!src) { const ir = await fetch(p.url).catch(() => null); if (!ir || !ir.ok) throw new Error('Không tải được ảnh từ địa chỉ API trả về.'); src = await blobToDataUrl(await ir.blob()); }
  return { src: await shrinkDataUrl(src), ai: { provider: cfg.provider, model: cfg.model, prompt: o.prompt, mode } };
}
const refreshSlot = s => { save(); render(); if (!(pvRefresh && pvRefresh(s.id))) openSlot(s.id); };
// Gen qua API (thay cho Gen mô phỏng khi đã bật ở Setup)
async function apiGenImage(s, i) {
  const a = s.assets[i]; if (!a) return;
  if (!a.prompt) return toast('Ô ảnh chưa có prompt.', 'bad');
  const lock = AC.slotLockMsg(S, s); if (lock) return toast(lock, 'bad');
  if (view.apiBusy) return toast('Đang tạo một ảnh khác, đợi xong đã.');
  view.apiBusy = true; toast(`Đang tạo ảnh qua ${providerLabel()}…`);
  try {
    const out = await imageApiCall('gen', { prompt: a.prompt, ratio: AC.assetRatioOf(a) });
    const r = AC.addSlotImageVersion(S, s.id, i, { src: out.src, ext: 'jpg', ai: out.ai }); if (!r.ok) throw new Error(r.error);
    refreshSlot(s); toast(`Đã tạo ảnh phiên bản ${r.version} qua ${providerLabel()}.`);
  } catch (e) {
    toast('Không tạo được ảnh: ' + e.message, 'bad', { label: 'Dùng mô phỏng', fn: () => { const g = AC.genSlotImage(S, s.id, i); if (!g.ok) return toast(g.error, 'bad'); refreshSlot(s); toast(`Đã tạo ảnh mô phỏng phiên bản ${g.version}.`); } });
  } finally { view.apiBusy = false; }
}

// ---------- Setup → AI ảnh & video ----------
function imageApiTab() {
  const c = AC.imageApiOf(S), P = AC.IMAGE_PROVIDERS, on = c.provider !== 'off', k = apiKey(), p = P[c.provider];
  return `<p class="muted">Bật để nút <b>Gen</b> và <b>Img2Img</b> gọi AI tạo ảnh thật thay cho ảnh mô phỏng, và để <b>Phụ đề</b> nhận giọng nói trong video. Mỗi lần gọi tính phí theo bảng giá của nhà cung cấp, vào tài khoản của khoá bạn nhập.</p>
    <div class="card stack" style="gap:12px;max-width:760px">
      <div class="field"><label for="ia-prov">Nhà cung cấp</label><select id="ia-prov" data-change="ia-prov">${Object.entries(P).map(([id, x]) => `<option value="${id}" ${id === c.provider ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
      ${on ? `<div class="row" style="gap:10px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:180px"><label for="ia-model">Model ảnh</label><input id="ia-model" value="${esc(c.model)}" placeholder="${esc(p.model || 'tuỳ máy chủ')}"></div>
        ${p.stt ? `<div class="field" style="flex:1;min-width:160px"><label for="ia-stt">Model nhận giọng nói</label><input id="ia-stt" value="${esc(c.sttModel)}"></div>` : ''}
      </div>
      <div class="field"><label for="ia-ep">Địa chỉ API</label><input id="ia-ep" value="${esc(c.endpoint)}" placeholder="https://…" spellcheck="false"></div>
      <div class="field"><label for="ia-key">Khoá API${p.key ? '' : ' (không bắt buộc; có thì gửi kèm dạng Bearer)'}</label><input id="ia-key" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? `Đã nhập (${esc(maskKey(k))}), để trống nếu giữ nguyên` : 'Dán khoá vào đây'}"></div>
      <label class="row small" style="gap:6px"><input type="checkbox" id="ia-remember" ${keyRemembered() ? 'checked' : ''}> Nhớ khoá trên trình duyệt này (bỏ chọn thì đóng trang là quên)</label>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="ia-save">Lưu</button>${c.provider !== 'custom' ? '<button class="btn" data-act="ia-check">Kiểm tra khoá</button>' : ''}${k ? '<button class="btn ghost danger" data-act="ia-forget">Xoá khoá</button>' : ''}<span class="small" id="ia-status" role="status"></span></div>` : '<p class="small muted">Đang dùng ảnh và phụ đề mô phỏng. Chọn nhà cung cấp để nhập khoá.</p>'}
    </div>
    <section class="stack" style="margin-top:16px;max-width:760px"><h3>Cần biết</h3><ul class="small muted" style="margin:0;padding-left:18px;display:grid;gap:4px">
      <li>Khoá chỉ nằm trong trình duyệt này, không vào bản Sao lưu hay tệp ZIP. Ai dùng chung máy và trình duyệt vẫn có thể đọc được, nên dùng khoá giới hạn hạn mức. Khi có máy chủ (R5), khoá sẽ giữ ở máy chủ.</li>
      <li>Trình xem artifact trên claude.ai có thể chặn trang gọi ra ngoài. Nếu Kiểm tra báo không kết nối được, tải tệp HTML về máy rồi mở bằng trình duyệt.</li>
      <li>OpenAI: Gen dùng <span class="mono">/images/generations</span>, Img2Img dùng <span class="mono">/images/edits</span> (không có mức biến đổi), phụ đề dùng <span class="mono">/audio/transcriptions</span> (tệp tối đa 25 MB). Stability AI: <span class="mono">/v2beta/stable-image/generate/sd3</span>, Img2Img có mức biến đổi.</li>
      <li>Máy chủ riêng: nhận POST JSON <span class="mono">{mode: "gen"|"i2i", prompt, ratio, width, height, strength, image}</span> (ảnh dạng data URL), trả <span class="mono">{image}</span> (data URL hoặc base64) hoặc <span class="mono">{url}</span>.</li>
      <li>Ảnh nhận về được nén thành JPEG cạnh dài tối đa 1600px, thành phiên bản mới có nhãn "AI thật". Lỗi thì thông báo có nút Dùng mô phỏng.</li>
    </ul></section>`;
}
CHANGES['ia-prov'] = el => { const r = AC.setImageApi(S, { provider: el.value }); if (!r.ok) return toast(r.error, 'bad'); save(); render(); };
ACTIONS['ia-save'] = () => {
  const v = id => { const e = $(id); return e ? e.value : undefined; };
  const r = AC.setImageApi(S, { model: v('#ia-model'), endpoint: v('#ia-ep'), sttModel: v('#ia-stt') });
  if (!r.ok) return toast(r.error, 'bad');
  const nk = (v('#ia-key') || '').trim(); const rem = !!($('#ia-remember') || {}).checked;
  setApiKey(nk || apiKey(), rem);
  save(); render(); toast(`Đã lưu cài đặt ${providerLabel()}.`);
};
ACTIONS['ia-forget'] = () => { setApiKey('', false); render(); toast('Đã xoá khoá khỏi trình duyệt.'); };
ACTIONS['ia-check'] = async () => {
  const st = $('#ia-status'); const nk = ($('#ia-key') || {}).value; const key = (nk || '').trim() || apiKey();
  const req = AC.buildCheckRequest(AC.imageApiOf(S), key); if (!req.ok) return toast(req.error, 'bad');
  if (!key) return toast('Chưa nhập khoá API.', 'bad');
  if (st) st.textContent = 'Đang kiểm tra…';
  try {
    const r = await apiFetch(req, 20000);
    const ok = r.status >= 200 && r.status < 300;
    const msg = ok ? 'Khoá dùng được.' : AC.parseImageResponse('openai', r.status, r.body).error;
    if (st) { st.textContent = msg; st.className = 'small ' + (ok ? 'ok' : 'err'); }
  } catch (e) { if (st) { st.textContent = e.message; st.className = 'small err'; } }
};

// ---------- Nút video: Bìa, Phụ đề ----------
function videoBtns(i, lk, has) {
  return `<button class="btn sm" data-x="vid-cover" data-i="${i}" ${!lk && has ? '' : 'disabled'} title="Chọn ảnh bìa từ khung hình của video hoặc tải ảnh lên">Bìa</button><button class="btn sm" data-x="vid-subs" data-i="${i}" ${!lk && has ? '' : 'disabled'} title="Tạo, sửa phụ đề; tải .srt/.vtt">Phụ đề</button>`;
}
function videoMetaLine(v) {
  if (!v || v.kind !== 'video' || !(v.cover || v.subs)) return '';
  return `<span class="small faint">Video: ${[v.cover ? `có ảnh bìa${v.cover.t != null ? ` (khung ${AC.fmtClock(v.cover.t)})` : ''}` : '', v.subs ? `phụ đề ${v.subs.cues.length} dòng${v.subs.source === 'script' ? ' (thời gian ước lượng)' : v.subs.source === 'api' ? ' (nhận giọng nói)' : ''}` : ''].filter(Boolean).join(' · ')}</span>`;
}
const videoReady = vd => new Promise(res => { if (vd.readyState >= 1) return res(); vd.addEventListener('loadedmetadata', () => res(), { once: true }); vd.addEventListener('error', () => res(), { once: true }); });
const seekTo = (vd, t) => new Promise(res => { if (Math.abs(vd.currentTime - t) < 0.01 && vd.readyState >= 2) return res(); const done = () => res(); vd.addEventListener('seeked', done, { once: true }); vd.currentTime = t; setTimeout(done, 1500); });

function openCoverDialog(s, i) {
  const a = s.assets[i], v = curVersion(a);
  const st = { t: v.cover && v.cover.t != null ? v.cover.t : 0, src: v.cover ? v.cover.src : '', at: v.cover ? v.cover.t : null, dirty: false };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Ảnh bìa video · ${esc(a.name)} · bản v${v.n}</span><h2>Chọn ảnh bìa</h2><p class="small muted">Kéo thanh thời gian tới khung đẹp rồi bấm Lấy khung này, hoặc tải ảnh của bạn. Ảnh bìa đi kèm video khi xuất ZIP; kênh nào cho đặt ảnh bìa thì dùng ảnh này khi đăng.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="cv-dlg">
      <div class="stack" style="gap:8px;min-width:0"><video id="cv-video" src="${esc(v.src)}" muted playsinline preload="auto"></video>
        <div class="field"><label for="cv-t">Thời điểm: <b id="cv-tv">${AC.fmtClock(st.t)}</b></label><input id="cv-t" type="range" min="0" max="1" step="0.1" value="${st.t}"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" id="cv-grab">Lấy khung này</button><label class="btn" for="cv-up">${icon('upload')} Tải ảnh bìa</label><input id="cv-up" type="file" accept="image/png,image/jpeg,image/webp" class="sr"></div></div>
      <div class="stack" style="gap:8px;min-width:0"><span class="small muted">Ảnh bìa</span><div class="cv-prev" id="cv-prev"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" id="cv-dl">Tải ảnh bìa xuống</button>${v.cover ? '<button class="btn sm ghost danger" id="cv-del">Bỏ ảnh bìa</button>' : ''}</div></div>
    </div>
    <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="cv-ok" disabled>Lưu ảnh bìa</button></div>`, 'dialog');
  box.classList.add('wide');
  const vd = box.querySelector('#cv-video'), rg = box.querySelector('#cv-t'), ok = box.querySelector('#cv-ok');
  const paint = () => {
    box.querySelector('#cv-prev').innerHTML = st.src ? `<img src="${esc(st.src)}" alt="Ảnh bìa">` : '<p class="small muted" style="padding:16px">Chưa có ảnh bìa.</p>';
    box.querySelector('#cv-dl').disabled = !st.src; ok.disabled = !(st.dirty && st.src);
  };
  paint();
  videoReady(vd).then(() => { const d = isFinite(vd.duration) ? vd.duration : 0; rg.max = String(Math.max(0.1, Math.floor(d * 10) / 10)); seekTo(vd, Math.min(st.t, d)); });
  rg.addEventListener('input', () => { st.t = Number(rg.value); box.querySelector('#cv-tv').textContent = AC.fmtClock(st.t); vd.currentTime = st.t; });
  box.querySelector('#cv-grab').addEventListener('click', async () => {
    await videoReady(vd); await seekTo(vd, st.t);
    if (!vd.videoWidth) return toast('Trình duyệt không đọc được khung hình của video này.', 'bad');
    const k = Math.min(1, 1280 / Math.max(vd.videoWidth, vd.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(vd.videoWidth * k); c.height = Math.round(vd.videoHeight * k);
    c.getContext('2d').drawImage(vd, 0, 0, c.width, c.height);
    try { st.src = c.toDataURL('image/jpeg', 0.88); st.at = st.t; st.dirty = true; paint(); } catch (e) { toast('Không lấy được khung hình: ' + e.message, 'bad'); }
  });
  box.querySelector('#cv-up').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { st.src = await readImageFile(f).then(x => x.src); st.at = null; st.dirty = true; paint(); } catch (err) { toast(err.message, 'bad'); }
  });
  box.querySelector('#cv-dl').addEventListener('click', () => { if (st.src) downloadBytes(`${AC.slugOf(a.name)}-bia.jpg`, AC.dataUrlBytes(st.src), 'image/jpeg'); });
  const del = box.querySelector('#cv-del');
  if (del) del.addEventListener('click', () => { const r = AC.setVideoCover(S, s.id, i, null); if (!r.ok) return toast(r.error, 'bad'); afterImageDialog(s, 'Đã bỏ ảnh bìa.'); });
  ok.addEventListener('click', () => { const r = AC.setVideoCover(S, s.id, i, { src: st.src, t: st.at }); if (!r.ok) return toast(r.error, 'bad'); afterImageDialog(s, 'Đã lưu ảnh bìa video.'); });
}

function openSubsDialog(s, i) {
  const a = s.assets[i], v = curVersion(a);
  const cfg = AC.imageApiOf(S), sttOk = !!(AC.IMAGE_PROVIDERS[cfg.provider] || {}).stt;
  const st = { cues: v.subs ? v.subs.cues.map(c => Object.assign({}, c)) : [], source: v.subs ? v.subs.source : 'manual', dur: 0, busy: false };
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="eyebrow">Phụ đề video · ${esc(a.name)} · bản v${v.n}</span><h2>Phụ đề</h2><p class="small muted">Tạo từ bài viết (thời gian ước lượng theo độ dài câu, mô phỏng), nhận giọng nói qua API, hoặc nhập tệp .srt/.vtt. Giờ ghi dạng phút:giây (1:05.5). Phụ đề hiện trên video để xem thử; khi xuất ZIP có kèm tệp .srt.</p></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="sb-dlg">
      <div class="stack" style="gap:6px;min-width:0"><video id="sb-video" src="${esc(v.src)}" controls playsinline preload="auto"></video><span class="small muted" id="sb-dur"></span></div>
      <div class="stack" style="gap:8px;min-width:0">
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" id="sb-script" ${s.text ? '' : 'disabled'} title="Chia bài thành câu phụ đề, thời gian ước lượng">Tạo từ bài (mô phỏng)</button><button class="btn sm" id="sb-stt" ${sttOk ? '' : 'disabled'} title="${sttOk ? `Gửi video tới ${esc(AC.IMAGE_PROVIDERS[cfg.provider].label)} để nhận giọng nói` : 'Cần chọn OpenAI ở Setup → AI ảnh & video'}">Nhận giọng nói (API)</button><label class="btn sm" for="sb-file">Nhập .srt/.vtt</label><input id="sb-file" type="file" accept=".srt,.vtt,text/vtt" class="sr"><button class="btn sm" id="sb-add">${icon('plus')} Thêm dòng</button></div>
        <div class="sb-list" id="sb-list" role="list"></div>
      </div>
    </div>
    <div class="actions"><span class="small muted" id="sb-count" style="margin-right:auto"></span>${v.subs ? '<button class="btn ghost danger" id="sb-del">Bỏ phụ đề</button>' : ''}<button class="btn" id="sb-srt">Tải .srt</button><button class="btn" id="sb-vtt">Tải .vtt</button><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="sb-ok">Lưu phụ đề</button></div>`, 'dialog');
  box.classList.add('wide');
  const vd = box.querySelector('#sb-video'), list = box.querySelector('#sb-list');
  let trackUrl = null, tmr = null;
  const sorted = () => AC.normCues(st.cues);
  const setTrack = () => {
    vd.querySelectorAll('track').forEach(t => t.remove()); if (trackUrl) URL.revokeObjectURL(trackUrl);
    const cs = sorted(); if (!cs.length) return;
    trackUrl = URL.createObjectURL(new Blob([AC.cuesToVtt(cs)], { type: 'text/vtt' }));
    const t = document.createElement('track'); t.kind = 'subtitles'; t.srclang = 'vi'; t.label = 'Tiếng Việt'; t.default = true; t.src = trackUrl; vd.appendChild(t);
    t.addEventListener('load', () => { if (t.track) t.track.mode = 'showing'; }); if (t.track) t.track.mode = 'showing';
  };
  const count = () => { const e = AC.validateCues(sorted()); box.querySelector('#sb-count').textContent = st.cues.length ? `${st.cues.length} dòng${e ? ' · ' + e : ''}` : 'Chưa có dòng nào'; box.querySelector('#sb-count').className = 'small ' + (e && st.cues.length ? 'err' : 'muted'); };
  const paint = () => {
    list.innerHTML = st.cues.length ? st.cues.map((c, k) => `<div class="sb-row" role="listitem" data-k="${k}">
      <button class="btn sm icon ghost" data-sb="seek" data-k="${k}" aria-label="Xem từ dòng ${k + 1}">${icon('right')}</button>
      <label class="sr" for="sb-s${k}">Bắt đầu dòng ${k + 1}</label><input id="sb-s${k}" class="inp sb-t" data-f="start" data-k="${k}" value="${AC.fmtClock(c.start)}" inputmode="decimal">
      <label class="sr" for="sb-e${k}">Kết thúc dòng ${k + 1}</label><input id="sb-e${k}" class="inp sb-t" data-f="end" data-k="${k}" value="${AC.fmtClock(c.end)}" inputmode="decimal">
      <label class="sr" for="sb-x${k}">Chữ dòng ${k + 1}</label><textarea id="sb-x${k}" data-f="text" data-k="${k}" rows="2" maxlength="200">${esc(c.text)}</textarea>
      <button class="btn sm icon ghost danger" data-sb="del" data-k="${k}" aria-label="Xoá dòng ${k + 1}">${icon('close')}</button></div>`).join('') : '<p class="small muted" style="padding:12px">Chưa có phụ đề. Bấm Tạo từ bài, Nhận giọng nói hoặc Nhập tệp.</p>';
    count(); setTrack();
  };
  const replace = async (cues, source) => {
    if (st.cues.length && !(await confirmBox({ title: 'Thay phụ đề đang có?', body: `<p>${st.cues.length} dòng đang có sẽ được thay bằng ${cues.length} dòng mới.</p>`, ok: 'Thay' }))) return;
    st.cues = cues.map(c => Object.assign({}, c)); st.source = source; paint();
  };
  videoReady(vd).then(() => { st.dur = isFinite(vd.duration) ? vd.duration : 0; box.querySelector('#sb-dur').textContent = st.dur ? `Thời lượng ${AC.fmtClock(st.dur)}` : 'Chưa đọc được thời lượng video.'; });
  paint();
  list.addEventListener('input', e => {
    const el = e.target.closest('[data-f]'); if (!el) return; const c = st.cues[Number(el.dataset.k)]; if (!c) return;
    if (el.dataset.f === 'text') c.text = el.value;
    else { const t = AC.parseClock(el.value); el.classList.toggle('bad', t == null); if (t != null) c[el.dataset.f] = t; }
    if (st.source !== 'manual' && st.source !== 'api') st.source = st.source === 'script' ? 'script' : 'manual';
    clearTimeout(tmr); tmr = setTimeout(() => { count(); setTrack(); }, 300);
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-sb]'); if (!b) return; const k = Number(b.dataset.k);
    if (b.dataset.sb === 'seek') { vd.currentTime = st.cues[k].start; vd.play().catch(() => {}); }
    if (b.dataset.sb === 'del') { st.cues.splice(k, 1); paint(); }
  });
  box.querySelector('#sb-add').addEventListener('click', () => {
    const last = sorted().slice(-1)[0]; const t0 = last ? last.end : Math.floor((vd.currentTime || 0) * 10) / 10;
    st.cues.push({ start: t0, end: t0 + 2, text: '' }); paint();
    const ta = list.querySelector(`#sb-x${st.cues.length - 1}`); if (ta) { ta.focus(); ta.scrollIntoView({ block: 'nearest' }); }
  });
  box.querySelector('#sb-script').addEventListener('click', async () => {
    await videoReady(vd); const r = AC.subtitleDraft(s.text, isFinite(vd.duration) ? vd.duration : 0);
    if (!r.ok) return toast(r.error, 'bad'); await replace(r.cues, 'script');
  });
  box.querySelector('#sb-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return; const r = AC.parseSubtitles(await f.text()); e.target.value = '';
    if (!r.ok) return toast(r.error, 'bad'); await replace(r.cues, 'file');
  });
  box.querySelector('#sb-stt').addEventListener('click', async e => {
    const b = e.currentTarget; if (st.busy) return;
    if (AC.dataUrlBytes(v.src).length > 25 * 1024 * 1024) return toast('Video quá 25 MB, API nhận giọng nói không nhận.', 'bad');
    const req = AC.buildSttRequest(AC.imageApiOf(S), apiKey(), v.src); if (!req.ok) return toast(req.error, 'bad');
    st.busy = true; b.disabled = true; b.textContent = 'Đang nghe…';
    try { const r = await apiFetch(req, 300000); const p = AC.parseSttResponse(r.status, r.body); if (!p.ok) throw new Error(p.error); await replace(p.cues, 'api'); }
    catch (err) { toast('Không nhận được giọng nói: ' + err.message, 'bad'); }
    finally { st.busy = false; b.disabled = false; b.textContent = 'Nhận giọng nói (API)'; }
  });
  const dl = (fmt) => { const cs = sorted(); const e = AC.validateCues(cs); if (e) return toast(e, 'bad'); downloadBytes(`${AC.slugOf(a.name)}.${fmt}`, new TextEncoder().encode(fmt === 'srt' ? AC.cuesToSrt(cs) : AC.cuesToVtt(cs)), fmt === 'srt' ? 'application/x-subrip' : 'text/vtt'); };
  box.querySelector('#sb-srt').addEventListener('click', () => dl('srt'));
  box.querySelector('#sb-vtt').addEventListener('click', () => dl('vtt'));
  const del = box.querySelector('#sb-del');
  if (del) del.addEventListener('click', () => { const r = AC.setVideoSubs(S, s.id, i, null); if (!r.ok) return toast(r.error, 'bad'); afterImageDialog(s, 'Đã bỏ phụ đề.'); });
  box.querySelector('#sb-ok').addEventListener('click', () => {
    const r = AC.setVideoSubs(S, s.id, i, sorted(), st.source); if (!r.ok) return toast(r.error, 'bad');
    if (trackUrl) URL.revokeObjectURL(trackUrl);
    afterImageDialog(s, `Đã lưu phụ đề ${r.count} dòng.`);
  });
}
