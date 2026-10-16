// ---------- UI · Short Vid: Bàn dựng mô phỏng (cảnh, hình, giọng máy, caption, frame, nhạc), xem trước trong trình duyệt (mục 10.75) ----------
import { AC } from '../logic/99-export.js';
import { S } from './00-state.js';
import { closeAllLayers, confirmBox, esc, icon, openLayer, save, toast } from './01-core.js';
import { copyText } from './05-matrix.js';
import { downloadBytes } from './06-export.js';
import { findCuts, readMedia } from './09b-vidfree.js';

const fmt = t => AC.fmtClock(t).replace(/\.\d$/, '');
const vOf = id => AC.byId(S.videos, id);
const srcOf = (v, a) => !a ? '' : a.src || ((v.media || []).find(m => m.id === a.mediaId) || {}).src || '';
const thumbOf = (v, a) => { if (!a) return ''; if (a.kind === 'image') return srcOf(v, a); if (a.thumb) return a.thumb; const m = (v.media || []).find(x => x.id === a.mediaId); return m ? m.thumb : ''; };
function unitOptions(v, sc) {
  const units = AC.brollUnits(v); const a = sc.asset; const cur = a && a.mediaId ? `${a.mediaId}|${a.from}` : a ? 'up' : '';
  const opts = [`<option value="">Thẻ giữ chỗ (prompt hình)</option>`].concat(units.map((u, i) => { const k = `${u.mediaId}|${u.from}`; return `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(`${u.label.includes('s') ? 'Đoạn' : 'Tệp'} ${i + 1}: ${u.desc}`.slice(0, 70))}</option>`; }));
  if (a && !a.mediaId) opts.push(`<option value="up" selected>Tệp tải lên: ${esc(a.name || '')}</option>`);
  if (a && a.mediaId && !units.some(u => `${u.mediaId}|${u.from}` === cur)) { const m = (v.media || []).find(x => x.id === a.mediaId); opts.push(`<option value="${esc(cur)}" selected>${esc(m ? m.name : a.mediaId)} ${a.kind === 'video' ? `${fmt(a.from)}–${fmt(a.to)}` : ''}</option>`); }
  return opts.join('');
}
function sceneHtml(v, it, i, n) {
  const sc = it.scene; const th = thumbOf(v, sc.asset);
  return `<div class="ve-sc" data-sid="${esc(sc.id)}" data-testid="ve-scene">
    <div class="row" style="justify-content:space-between;gap:6px"><button class="linkbtn small" data-e="seek" data-t="${it.t0}" title="Xem từ cảnh này"><b>${i + 1}. ${esc(sc.label || 'Cảnh')}</b></button>
      <span class="row" style="gap:2px"><span class="mono small faint">${fmt(it.t0)}–${fmt(it.t1)}</span><button class="btn icon sm ghost" data-e="up" ${i ? '' : 'disabled'} aria-label="Lên">↑</button><button class="btn icon sm ghost" data-e="down" ${i < n - 1 ? '' : 'disabled'} aria-label="Xuống">↓</button><button class="btn icon sm ghost danger" data-e="del" aria-label="Xóa cảnh">${icon('close')}</button></span></div>
    <div class="ve-sc-grid">
      <div class="ve-thumb${sc.asset ? '' : ' ph'}">${th ? `<img src="${esc(th)}" alt="">` : sc.asset && sc.asset.kind === 'video' ? '<span class="small">Clip</span>' : sc.voice === 'self' ? '<span class="small">Người dẫn quay</span>' : '<span class="small">Giữ chỗ</span>'}</div>
      <div class="stack" style="gap:6px;min-width:0">
        <label class="sr" for="ve-t-${esc(sc.id)}">Lời cảnh ${i + 1}</label><textarea id="ve-t-${esc(sc.id)}" data-f="text" rows="2" placeholder="Lời của cảnh">${esc(sc.text)}</textarea>
        <div class="row" style="gap:6px"><label class="small">Giây <input data-f="dur" type="number" min="0.5" max="120" step="0.5" value="${sc.dur}" style="width:70px"></label>
          <label class="small" style="flex:1;min-width:120px">Chữ phủ <input data-f="overlay" value="${esc(sc.overlay || '')}" placeholder="Chữ lớn trên hình"></label></div>
        <div class="row" style="gap:6px"><label class="sr" for="ve-s-${esc(sc.id)}">Hình của cảnh</label><select id="ve-s-${esc(sc.id)}" data-f="src" style="flex:1;min-width:0">${unitOptions(v, sc)}</select>
          <label class="btn sm" for="ve-up-${esc(sc.id)}">${icon('up')} Up</label><input id="ve-up-${esc(sc.id)}" data-up="${esc(sc.id)}" type="file" accept="image/*,video/*" class="sr"></div>
        ${sc.asset ? '' : `<details><summary class="small">Prompt hình</summary><div class="stack" style="gap:4px;margin-top:4px"><textarea data-f="prompt" rows="2">${esc(sc.prompt || '')}</textarea><button class="btn sm" data-e="copy-prompt">Chép prompt</button></div></details>`}
      </div></div></div>`;
}
const opt = (o, cur) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
function frameOptions(cur) { const fr = (S.frames || []).filter(f => f.kind === 'png' && f.ratio === '9:16'); return opt(AC.VID_FRAMES, cur) + fr.map(f => `<option value="${esc(f.id)}" ${f.id === cur ? 'selected' : ''}>Frame: ${esc(f.name)}</option>`).join(''); }
function cutsHtml(v) {
  const ed = v.edit; if (AC.vidOrigin(v) !== 'talk') return '';
  const cs = ed.cuts || []; const on = cs.filter(c => c.on !== false);
  return `<section class="panel stack" style="gap:6px" data-testid="ve-cuts"><h3>Cắt khoảng lặng</h3>
    <p class="small muted">${cs.length ? `${cs.length} chỗ đề xuất cắt (${ed.cutsSim ? 'mô phỏng: không đọc được tiếng của clip' : 'đo âm lượng thật trong trình duyệt'}), bỏ ${on.reduce((a, c) => a + c.to - c.from, 0).toFixed(1).replace('.', ',')} giây. Bỏ tích chỗ muốn giữ; cảnh cập nhật ngay.` : 'Không thấy khoảng lặng nào đáng cắt.'}</p>
    <div class="stack" style="gap:2px;max-height:160px;overflow:auto">${cs.map((c, i) => `<label class="small row" style="gap:6px"><input type="checkbox" data-cut="${i}" ${c.on !== false ? 'checked' : ''}> <span class="mono">${fmt(c.from)}–${fmt(c.to)}</span> ${esc(c.why)}</label>`).join('')}</div>
    <div class="row"><button class="btn sm" data-e="remeasure">Đo lại</button><span class="small faint">Gợi ý cắt câu vấp, câu thừa so với kịch bản cần API nhận giọng nói (Đợt sau).</span></div></section>`;
}
function bodyHtml(v) {
  const ed = v.edit; const tl = AC.editTimeline(v); const iss = AC.editIssues(S, v);
  const mus = ed.music;
  return `<div class="ve-bar" role="toolbar" aria-label="Công cụ bàn dựng">
      <button class="btn sm" data-e="plan" title="Chia lại cảnh theo kịch bản, ghép clip, prompt hình">${icon('spark')} Lên kế hoạch lại</button>
      <label class="small">Giọng <select id="ve-voice">${opt(AC.VID_VOICES, ed.voice.mode)}</select></label>
      <label class="small">Caption <select id="ve-cap">${opt(AC.VID_CAPTION_MODES, ed.captions.mode)}</select></label>
      <label class="small"><span class="sr">Vị trí caption</span><select id="ve-pos">${opt(AC.VID_CAPTION_POS, ed.captions.pos)}</select></label>
      <label class="small">Frame <select id="ve-frame">${frameOptions(ed.frame)}</select></label>
      <span class="row" style="gap:4px"><label class="btn sm" for="ve-music">${icon('up')} ${mus ? 'Đổi nhạc' : 'Nhạc nền'}</label><input id="ve-music" type="file" accept="audio/*" class="sr">
        ${mus ? `<span class="small muted" title="${esc(mus.name)}">${esc(mus.name.slice(0, 18))}</span><label class="small"><span class="sr">Âm lượng nhạc</span><input id="ve-vol" type="range" min="0" max="1" step="0.05" value="${mus.vol}" style="width:70px"></label><input id="ve-lic" class="small" style="width:120px" placeholder="Nguồn/giấy phép" value="${esc(mus.license || '')}"><button class="btn sm ghost" data-e="music-del">Bỏ nhạc</button>` : ''}</span>
      <button class="btn sm" data-e="export" data-testid="ve-export">Xuất lệnh dựng (JSON)</button>
    </div>
    <div class="ve-main">
      <div class="stack ve-left" style="gap:8px">
        <div class="ve-stage" id="ve-stage" data-testid="ve-stage"><div class="ve-media"></div><div class="ve-ov"></div><div class="ve-cap ${esc(ed.captions.pos)}"></div><div class="ve-fr"></div></div>
        <div class="row" style="gap:6px"><button class="btn sm primary" data-e="play" data-testid="ve-play">▶ Phát</button><button class="btn sm" data-e="restart">Từ đầu</button><span class="mono small" id="ve-time">0:00 / ${fmt(tl.total)}</span></div>
        <label class="sr" for="ve-seek">Tua</label><input id="ve-seek" type="range" min="0" max="${tl.total}" step="0.1" value="0">
        <p class="small faint">Xem trước mô phỏng: giọng máy dùng giọng đọc có sẵn của trình duyệt (tiếng Việt tùy máy), chưa ghép thành file video. Xuất lệnh dựng để bộ xuất (PC app/web app) dựng thật.</p>
        ${iss.length ? `<ul class="small sv-warn" id="ve-issues">${iss.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${cutsHtml(v)}
      </div>
      <div class="stack ve-right" style="gap:8px"><div class="row" style="justify-content:space-between"><h3>${ed.scenes.length} cảnh · ${fmt(tl.total)}</h3><button class="btn sm" data-e="add">${icon('plus')} Thêm cảnh</button></div>
        <div class="stack" style="gap:8px" id="ve-scenes">${tl.items.map((it, i) => sceneHtml(v, it, i, tl.items.length)).join('')}</div></div>
    </div>`;
}

// ---- Trình xem trước ----
function player(box, id) {
  const st = { t: 0, playing: false, raf: 0, last: 0, cur: -1, el: null, voiceEl: null, musicEl: null };
  const stage = box.querySelector('#ve-stage');
  const q = s => stage.querySelector(s);
  const speakOk = 'speechSynthesis' in window;
  const stopSpeech = () => { try { if (speakOk) window.speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } };
  function mount(v, it, i) {
    st.cur = i; const media = q('.ve-media'); media.innerHTML = ''; st.el = null; stopSpeech();
    box.querySelectorAll('.ve-sc').forEach(el => el.classList.toggle('on', el.dataset.sid === (it && it.scene.id)));
    if (!it) return;
    const sc = it.scene, a = sc.asset, src = srcOf(v, a);
    if (a && src && a.kind === 'video') {
      const vd = document.createElement('video'); vd.src = src; vd.playsInline = true; vd.muted = v.edit.voice.mode !== 'clip'; vd.preload = 'auto';
      const seekIn = () => { try { vd.currentTime = (a.from || 0) + Math.max(0, st.t - it.t0); } catch (e) { /* chưa sẵn sàng */ } };
      vd.addEventListener('loadedmetadata', seekIn, { once: true }); seekIn();
      if (st.playing) vd.play().catch(() => {});
      media.appendChild(vd); st.el = vd;
    } else if (a && src) {
      const im = document.createElement('img'); im.src = src; im.alt = ''; im.className = 've-kb'; im.style.animationDuration = `${Math.max(1, sc.dur)}s`; im.style.animationPlayState = st.playing ? 'running' : 'paused'; media.appendChild(im); st.el = im;
    } else {
      const ph = document.createElement('div'); ph.className = 've-ph';
      ph.innerHTML = sc.voice === 'self' ? '<b>Người dẫn nói trước camera</b><span>Cảnh tự quay</span>' : `<b>Thẻ giữ chỗ</b><span>${esc(sc.prompt || 'Chưa có prompt hình')}</span>`;
      media.appendChild(ph);
    }
    const ov = q('.ve-ov'); ov.textContent = sc.overlay || ''; ov.style.display = sc.overlay ? '' : 'none';
    if (st.playing && v.edit.voice.mode === 'tts' && sc.voice !== 'self' && sc.text && speakOk) {
      try { const u = new SpeechSynthesisUtterance(sc.text); u.lang = 'vi-VN'; const vi = window.speechSynthesis.getVoices().find(x => /^vi/i.test(x.lang)); if (vi) u.voice = vi; u.rate = Math.max(0.7, Math.min(1.6, AC.vidSettingsOf(S).wps / 2.5)); window.speechSynthesis.speak(u); } catch (e) { /* trình duyệt không đọc được */ }
    }
  }
  function frame(v) {
    const fr = q('.ve-fr'); const f = v.edit.frame; const stl = AC.frameStyleOf(S);
    if (f === 'logo') fr.innerHTML = stl.logo ? `<span class="ve-logo" style="background:${esc(stl.color)}">${esc(stl.logo)}</span>` : '<span class="ve-logo" style="background:var(--accent)">Logo</span>';
    else if (f === 'band') fr.innerHTML = `<div class="ve-band" style="background:${esc(stl.color)}"><span style="background:${esc(stl.accent)}"></span>${esc(v.insight.title.replace(/^[^:]{2,30}:\s*/, '').slice(0, 70))}</div>`;
    else { const pf = (S.frames || []).find(x => x.id === f); fr.innerHTML = pf ? `<img src="${esc(pf.src)}" alt="">` : ''; }
  }
  function draw() {
    const v = vOf(id); if (!v || !v.edit) return; const T = AC.editTimeline(v);
    if (st.t > T.total) st.t = T.total;
    let i = T.items.findIndex(it => st.t < it.t1); if (i < 0) i = T.items.length - 1;
    const it = T.items[i]; if (i !== st.cur) mount(v, it, i);
    const cap = q('.ve-cap');
    if (it) { const loc = st.t - it.t0; const ch = AC.captionChunks(it.scene.text, it.scene.dur, v.edit.captions.mode); const c = ch.find(x => loc < x.t1) || ch[ch.length - 1]; cap.textContent = c ? c.text : ''; cap.className = `ve-cap ${v.edit.captions.pos}${v.edit.captions.mode === 'key' ? ' key' : ''}`; cap.style.display = c ? '' : 'none'; }
    const tm = box.querySelector('#ve-time'); if (tm) tm.textContent = `${fmt(st.t)} / ${fmt(T.total)}`;
    const sk = box.querySelector('#ve-seek'); if (sk && document.activeElement !== sk) { sk.max = String(T.total); sk.value = String(st.t); }
  }
  function audioEls(v) {
    const ed = v.edit;
    if (ed.voice.mode === 'file') { const m = (v.media || []).find(x => x.id === ed.voice.mediaId); if (m) { st.voiceEl = st.voiceEl || new Audio(m.src); try { st.voiceEl.currentTime = st.t; } catch (e) { /* bỏ qua */ } st.voiceEl.play().catch(() => {}); } }
    if (ed.music) { st.musicEl = st.musicEl || new Audio(ed.music.src); st.musicEl.loop = true; st.musicEl.volume = ed.music.vol; st.musicEl.play().catch(() => {}); }
  }
  function tick(now) {
    if (!box.isConnected) { pause(); return; }
    const dt = Math.min(0.25, (now - st.last) / 1000); st.last = now; st.t += dt;
    const v = vOf(id); const T = AC.editTimeline(v);
    if (st.t >= T.total) { st.t = T.total; draw(); pause(); return; }
    draw(); st.raf = requestAnimationFrame(tick);
  }
  function play() {
    const v = vOf(id); if (!v || !v.edit || !v.edit.scenes.length) return;
    if (st.t >= AC.editTimeline(v).total) st.t = 0;
    st.playing = true; st.last = performance.now(); st.cur = -1; draw(); audioEls(v);
    if (st.el && st.el.tagName === 'VIDEO') st.el.play().catch(() => {});
    st.raf = requestAnimationFrame(tick); label();
  }
  function pause() {
    st.playing = false; cancelAnimationFrame(st.raf); stopSpeech();
    [st.el && st.el.tagName === 'VIDEO' ? st.el : null, st.voiceEl, st.musicEl].forEach(m => { if (m) try { m.pause(); } catch (e) { /* bỏ qua */ } });
    if (st.el && st.el.tagName === 'IMG') st.el.style.animationPlayState = 'paused';
    label();
  }
  function label() { const b = box.querySelector('[data-e="play"]'); if (b) b.textContent = st.playing ? '❚❚ Dừng' : '▶ Phát'; }
  function seek(t) { const was = st.playing; pause(); st.t = Math.max(0, Number(t) || 0); st.cur = -1; if (st.voiceEl) try { st.voiceEl.currentTime = st.t; } catch (e) { /* bỏ qua */ } draw(); if (was) play(); }
  function reset() { pause(); st.voiceEl = null; st.musicEl = null; st.cur = -1; const v = vOf(id); if (v) frame(v); draw(); }
  return { play, pause, seek, reset, toggle: () => (st.playing ? pause() : play()), get t() { return st.t; }, get playing() { return st.playing; } };
}

export function openEditor(id, onClose) {
  const v0 = vOf(id); if (!v0) return;
  if (!v0.edit || !v0.edit.scenes.length) { const r = AC.planEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); save(); }
  const v = vOf(id); const pos = AC.vidsOf(S, v.weekId, v.topicId).findIndex(x => x.id === id) + 1;
  const box = openLayer(`<header class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="eyebrow">Bàn dựng · Thẻ Vid ${pos} · ${esc(AC.VID_ORIGINS[AC.vidOrigin(v)].name)}</span><h2>${esc(v.insight.title)}</h2></div>
      <button class="btn icon ghost" data-e="close" aria-label="Đóng">${icon('close')}</button></header>
    <div id="ve-body"></div>
    <div class="actions"><span class="small muted" id="ve-busy" aria-live="polite"></span><button class="btn" data-e="close">Đóng</button></div>`, 'dialog');
  box.classList.add('wide', 'sv-dlg', 've-dlg'); box.dataset.testid = 've-dlg';
  let P = null;
  const paint = () => { const t = P ? P.t : 0; if (P) P.pause(); box.querySelector('#ve-body').innerHTML = bodyHtml(vOf(id)); P = player(box, id); P.reset(); if (t) P.seek(t); };
  const done = () => { save(); paint(); };
  paint();
  const close = () => { if (P) P.pause(); closeAllLayers(); if (onClose) onClose(); };
  box.addEventListener('change', async e => {
    const el = e.target; const card = el.closest('.ve-sc'); const sid = card && card.dataset.sid;
    if (el.dataset.f && sid) {
      const f = el.dataset.f;
      if (f === 'src') {
        if (el.value === 'up') return;
        const [mid, from] = el.value.split('|'); const r = el.value ? AC.setSceneAsset(S, id, sid, { mediaId: mid, from: Number(from), to: (AC.brollUnits(vOf(id)).find(u => u.mediaId === mid && String(u.from) === from) || {}).to }) : AC.setSceneAsset(S, id, sid, null);
        if (!r.ok) return toast(r.error, 'bad'); return done();
      }
      const r = AC.editScene(S, id, sid, { [f]: el.value }); if (!r.ok) { toast(r.error, 'bad'); return done(); }
      save(); if (f === 'dur' || f === 'text') paint(); return;
    }
    if (el.dataset.up) {
      const file = el.files && el.files[0]; if (!file) return;
      try { const m = await readMedia(file); const r = AC.setSceneAsset(S, id, el.dataset.up, { src: m.src, name: m.name, dur: m.dur, thumb: m.thumb }); if (!r.ok) return toast(r.error, 'bad'); done(); } catch (er) { toast(er.message, 'bad'); }
      return;
    }
    if (el.dataset.cut != null) { AC.toggleVidCut(S, id, Number(el.dataset.cut), el.checked); AC.planEdit(S, id); return done(); }
    if (el.id === 've-voice') { const r = AC.setEditOptions(S, id, { voice: el.value }); if (!r.ok) toast(r.error, 'bad'); return done(); }
    if (el.id === 've-cap' || el.id === 've-pos' || el.id === 've-frame') { AC.setEditOptions(S, id, { captions: box.querySelector('#ve-cap').value, pos: box.querySelector('#ve-pos').value, frame: box.querySelector('#ve-frame').value }); return done(); }
    if (el.id === 've-vol') { AC.setEditOptions(S, id, { musicVol: el.value }); save(); return; }
    if (el.id === 've-lic') { const ed = vOf(id).edit; if (ed.music) ed.music.license = el.value.trim().slice(0, 200); return done(); }
    if (el.id === 've-music') {
      const file = el.files && el.files[0]; if (!file) return;
      try { const m = await readMedia(file); const r = AC.setEditOptions(S, id, { music: { src: m.src, name: m.name } }); if (!r.ok) return toast(r.error, 'bad'); done(); toast('Đã thêm nhạc nền. Ghi nguồn/giấy phép bên cạnh.'); } catch (er) { toast(er.message, 'bad'); }
    }
  });
  box.addEventListener('input', e => { if (e.target.id === 've-seek' && P) P.seek(e.target.value); });
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-e]'); if (!b || b.disabled) return; const k = b.dataset.e; const card = b.closest('.ve-sc'); const sid = card && card.dataset.sid;
    if (k === 'close') return close();
    if (k === 'play') return P.toggle();
    if (k === 'restart') return P.seek(0);
    if (k === 'seek') return P.seek(b.dataset.t);
    if (k === 'up' || k === 'down') { AC.moveScene(S, id, sid, k === 'up' ? -1 : 1); return done(); }
    if (k === 'del') { AC.removeScene(S, id, sid); return done(); }
    if (k === 'add') { AC.addScene(S, id, null); return done(); }
    if (k === 'copy-prompt') { const sc = vOf(id).edit.scenes.find(x => x.id === sid); return copyText(sc ? sc.prompt : ''); }
    if (k === 'plan') {
      if (!(await confirmBox({ title: 'Lên kế hoạch lại?', body: '<p>Chia lại cảnh theo kịch bản hiện tại, ghép lại clip và prompt hình. Chỉnh tay trên các cảnh sẽ mất; caption, frame, nhạc giữ nguyên.</p>', ok: 'Lên kế hoạch lại' }))) return;
      const r = AC.planEdit(S, id); if (!r.ok) return toast(r.error, 'bad'); done(); return toast(`Đã chia ${r.count} cảnh.`);
    }
    if (k === 'remeasure') { box.querySelector('#ve-busy').textContent = 'Đang đo âm lượng…'; const r = await findCuts(id); box.querySelector('#ve-busy').textContent = ''; if (!r.ok) return toast(r.error, 'bad'); AC.planEdit(S, id); done(); return toast(`${r.count} chỗ đề xuất cắt${r.simulated ? ' (mô phỏng)' : ''}.`); }
    if (k === 'music-del') { AC.setEditOptions(S, id, { music: null }); return done(); }
    if (k === 'export') {
      const vv = vOf(id); const cmd = AC.editCommands(S, vv); vv.edit.exportedAt = S.settings.demoNow; save();
      downloadBytes(`${AC.slugOf(vv.insight.title) || 'video'}-lenh-dung.json`, new TextEncoder().encode(JSON.stringify(cmd, null, 2)), 'application/json');
      return toast('Đã xuất lệnh dựng (JSON). Bộ xuất của PC app/web app sẽ đọc tệp này để dựng video.');
    }
  });
  return box;
}
