// ---------- Viết bài bằng AI thật (mục 10.39) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, CHANGES, S } from './00-state.js';
import { $, confirmBox, esc, save, toast } from './01-core.js';
import { go, render } from './02-shell.js';
import { apiFetch, imageApiTab, keyFor, keyRememberedFor, maskKey, setKeyFor } from './04j-media.js';
export const textProviderLabel = () => (AC.TEXT_PROVIDERS[AC.textApiOf(S).provider] || {}).label || '';
// light = việc nhẹ (Sửa đoạn, Hook, CTA): dùng model nhẹ nếu đã khai báo
export async function textCall(job, maxTokens, light) {
  const cfg = AC.textCfgFor(S, light);
  if (cfg.provider === 'claudeai') return sampleText(job, light);
  const req = AC.buildTextRequest(cfg, keyFor(cfg.provider), { system: job.system, user: job.user, maxTokens });
  if (!req.ok) throw new Error(req.error);
  const r = await apiFetch(req, 180000); const p = AC.parseTextResponse(cfg.provider, r.status, r.body);
  if (!p.ok) throw new Error(p.error);
  return p.text;
}
// Nhà cung cấp 'claudeai': nhờ Claude của claude.ai qua quyền sample của artifact (không cần khoá, không bị chặn mạng)
async function sampleText(job, light) {
  let sample = null; try { sample = await window.claude.use('sample'); } catch (e) { /* không có */ }
  if (!sample) throw new Error('Cần mở app trong trình xem artifact của claude.ai (bản mở ở máy không có mục này). Hoặc chọn Anthropic Claude và nhập khoá.');
  try {
    const r = await sample(`${job.system}\n\n${job.user}`, { modelTier: light ? 'quick' : 'default', cache: false });
    const t = String((r && r.text) || '').trim(); if (!t) throw new Error('AI không trả về chữ.'); return t;
  } catch (e) {
    if (e && e.code === 'not_granted') throw new Error('Bạn chưa cho phép artifact nhờ Claude. Bấm lại và chọn Cho phép.');
    if (e && e.code === 'rate_limited') throw new Error('Đang bị giới hạn tốc độ, đợi một lúc rồi thử lại.');
    throw new Error((e && e.message) || 'Không gọi được Claude của claude.ai.');
  }
}
// Gọi AI; phản hồi rỗng thì thử lại một lần trước khi báo lỗi
const callRetry = async (job, maxTokens, light) => { try { return await textCall(job, maxTokens, light); } catch (e) { if (!/không trả về chữ/.test(e.message)) throw e; return textCall(job, maxTokens, light); } };
// Bài dừng giữa chừng: xin AI viết tiếp từ chỗ dừng, tối đa 2 lượt
async function finishPost(j, p) {
  for (let k = 0; k < 2 && p.cut; k++) {
    const more = AC.parseAiPost(await callRetry({ system: j.system, user: `${j.user}\n\n# Bài đang viết dở (bị dừng giữa chừng)\n${p.text}\n\nViết tiếp NGAY từ chỗ đang dừng cho đến hết bài, đủ các phần còn thiếu theo chỉ dẫn. Chỉ trả phần viết tiếp bằng chữ thường, không JSON, không lặp lại phần đã có.` }));
    if (!more.ok) break;
    p = Object.assign({}, p, { text: AC.joinContinuation(p.text, more.text), cut: more.cut });
  }
  return p;
}
// Thanh tiến độ góc dưới (không chặn màn hình); có nút Dừng
function aiBusy(total) {
  const el = document.createElement('div'); el.className = 'ai-busy'; el.setAttribute('role', 'status');
  let done = 0; const st = { stopped: false };
  const paint = () => { el.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${esc(textProviderLabel())} đang viết ${done}/${total} bài…</span><button class="btn sm ghost" type="button">Dừng</button>`; el.querySelector('button').addEventListener('click', () => { st.stopped = true; el.querySelector('span:nth-child(2)').textContent = 'Đang dừng…'; }); };
  paint(); document.body.appendChild(el);
  return Object.assign(st, { step() { done++; if (!st.stopped) paint(); }, close() { el.remove(); } });
}
// Chạy một thao tác viết ô/slot: AI thật thì chuẩn bị bài trước, rồi chạy thao tác trên S
let aiRunning = false;
export async function withAiText(run) {
  if (!AC.textApiOn(S)) return run(S);
  const jobs = AC.aiPlan(S, run); if (!jobs.length) return run(S);
  if (aiRunning) return { ok: false, error: 'AI đang viết bài khác, đợi xong đã.' };
  aiRunning = true;
  const cfg = AC.textApiOf(S); const bar = aiBusy(jobs.length); let fail = 0, firstErr = '', next = 0, unfinished = 0;
  const worker = async () => {
    while (next < jobs.length && !bar.stopped) {
      const j = jobs[next++];
      try {
        let p = AC.parseAiPost(await callRetry(j), j.criteria); if (!p.ok) throw new Error(p.error);
        if (p.cut) { p = await finishPost(j, p); if (p.cut) unfinished++; }
        AC.setAiText(j.key, Object.assign(p, { provider: cfg.provider, model: cfg.model }));
      } catch (e) { fail++; firstErr = firstErr || e.message; }
      bar.step();
    }
  };
  try { await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, worker)); }
  finally { bar.close(); aiRunning = false; }
  if (bar.stopped) { AC.clearAiText(); return { ok: false, error: 'Đã dừng viết bằng AI; chưa đổi gì.', stopped: true }; }
  if (fail === jobs.length) {
    AC.clearAiText();
    const go = await confirmBox({ title: 'AI không viết được', body: `<p>${esc(firstErr)}</p><p>Dùng bản mô phỏng cho ${jobs.length > 1 ? `${jobs.length} bài này` : 'bài này'}?</p>`, ok: 'Dùng mô phỏng' });
    return go ? run(S) : { ok: false, error: 'Chưa viết bài nào.', stopped: true };
  }
  const r = run(S); AC.clearAiText();
  if (unfinished) setTimeout(() => toast(`${unfinished} bài AI vẫn chưa viết xong (thiếu phần cuối); nên bấm viết lại bài đó.`, 'bad'), 80);
  if (fail) setTimeout(() => toast(`${fail}/${jobs.length} bài AI không viết được (${firstErr}); các bài đó dùng bản mô phỏng.`, 'bad'), 50);
  return r;
}

// ---------- Setup → Kết nối AI: phần AI viết bài ----------
function textApiSection() {
  const c = AC.textApiOf(S), P = AC.TEXT_PROVIDERS, on = c.provider !== 'off', p = P[c.provider], k = keyFor(c.provider);
  return `<section class="stack" style="gap:8px;max-width:760px"><h3>AI viết bài</h3>
    <p class="muted small">Bật để Viết ma trận, Tạo lại, Chia bài, Sửa đoạn và Hook dùng AI thật. AI nhận hồ sơ Thương hiệu, Giọng văn, Topic, quy tắc Cột, Format và kênh; bản nháp máy được gửi kèm để AI theo đúng bố cục. AI cũng chấm điểm theo tiêu chí của Cột/Format. Bài nào AI lỗi thì dùng bản mô phỏng.</p>
    <div class="card stack" style="gap:12px">
      <div class="field"><label for="ta-prov">Nhà cung cấp</label><select id="ta-prov" data-change="ta-prov">${Object.entries(P).map(([id, x]) => `<option value="${id}" ${id === c.provider ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
      ${on && c.provider === 'claudeai' ? '<p class="small muted">Dùng Claude của tài khoản claude.ai đang mở artifact, không cần khoá. Lần đầu sẽ hiện hộp xin phép. Hạn mức tính vào gói claude.ai của bạn. Chỉ chạy trong trình xem artifact.</p><div class="row" style="gap:8px"><button class="btn primary" data-act="ta-test">Thử viết một câu</button><span class="small" id="ta-status" role="status"></span></div>' : on ? `<div class="row" style="gap:10px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:180px"><label for="ta-model">Model</label><input id="ta-model" value="${esc(c.model)}" placeholder="${esc(p.model || 'tuỳ máy chủ')}"></div>
        ${c.provider === 'custom' ? '' : `<div class="field" style="flex:1;min-width:180px"><label for="ta-light">Model cho việc nhẹ (tuỳ chọn)</label><input id="ta-light" value="${esc(c.lightModel || '')}" placeholder="${esc(p.light || 'để trống = dùng model chính')}" spellcheck="false"><span class="hint">Sửa đoạn, Hook, CTA, hashtag dùng model này (rẻ, nhanh). Chia bài, Tạo lại, bài Blog luôn dùng model chính.</span></div>`}
        <div class="field" style="flex:2;min-width:240px"><label for="ta-ep">Địa chỉ API</label><input id="ta-ep" value="${esc(c.endpoint)}" placeholder="https://…" spellcheck="false"></div></div>
      <div class="field"><label for="ta-key">Khoá API${p.key ? '' : ' (không bắt buộc)'}${c.provider === 'openai' ? ' · dùng chung với AI ảnh nếu cũng chọn OpenAI' : ''}</label><input id="ta-key" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? `Đã nhập (${esc(maskKey(k))}), để trống nếu giữ nguyên` : 'Dán khoá vào đây'}"></div>
      <label class="row small" style="gap:6px"><input type="checkbox" id="ta-remember" ${keyRememberedFor(c.provider) ? 'checked' : ''}> Nhớ khoá trên trình duyệt này</label>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="ta-save">Lưu</button><button class="btn" data-act="ta-test">Thử viết một câu</button>${k ? '<button class="btn ghost danger" data-act="ta-forget">Xoá khoá</button>' : ''}<span class="small" id="ta-status" role="status"></span></div>
      ${c.provider === 'custom' ? '<p class="small muted">Máy chủ riêng nhận POST JSON <span class="mono">{system, user, model, max_tokens}</span>, trả <span class="mono">{text}</span>.</p>' : ''}` : '<p class="small muted">Đang dùng bộ viết mô phỏng.</p>'}
    </div></section>`;
}
export function aiConnectTab() {
  return `${textApiSection()}<h3 style="margin-top:24px">AI ảnh và video</h3>${imageApiTab()}`;
}
CHANGES['ta-prov'] = el => { const r = AC.setTextApi(S, { provider: el.value }); if (!r.ok) return toast(r.error, 'bad'); save(); render(); };
ACTIONS['ta-save'] = () => {
  const v = id => { const e = $(id); return e ? e.value : undefined; };
  const r = AC.setTextApi(S, { model: v('#ta-model'), endpoint: v('#ta-ep'), lightModel: v('#ta-light') }); if (!r.ok) return toast(r.error, 'bad');
  const p = r.api.provider, nk = (v('#ta-key') || '').trim();
  setKeyFor(p, nk || keyFor(p), !!($('#ta-remember') || {}).checked);
  save(); render(); toast(`Đã lưu cài đặt AI viết bài (${textProviderLabel()}).`);
};
ACTIONS['ta-forget'] = () => { setKeyFor(AC.textApiOf(S).provider, '', false); render(); toast('Đã xoá khoá khỏi trình duyệt.'); };
ACTIONS['ta-test'] = async () => {
  const st = $('#ta-status'); const nk = (($('#ta-key') || {}).value || '').trim();
  if (nk) setKeyFor(AC.textApiOf(S).provider, nk, !!($('#ta-remember') || {}).checked);
  if (st) { st.textContent = 'Đang thử…'; st.className = 'small'; }
  try { const t = await textCall({ system: 'Trả lời bằng tiếng Việt, một câu ngắn.', user: 'Chào bạn, hãy giới thiệu ngắn bạn là ai.' }, 100); if (st) { st.textContent = `Đã kết nối: “${t.slice(0, 120)}”`; st.className = 'small ok'; } }
  catch (e) { if (st) { st.textContent = e.message; st.className = 'small err'; } }
};
