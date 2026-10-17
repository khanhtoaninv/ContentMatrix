// ---------- UI · Setup → Short Vid: Format video, độ dài, tỉ lệ kiểu, Khuôn video thương hiệu (mục 10.72) ----------
import { AC } from '../logic/99-export.js';
import { ACTIONS, S } from './00-state.js';
import { $, closeLayer, commit, confirmBox, esc, icon, openLayer, toast } from './01-core.js';
import { skillButtonHtml } from './07b-skill.js';

const RATIOS = ['9:16', '4:5', '1:1', '16:9'];
export function shortVidTab() {
  AC.ensureShortVid(S);
  const c = AC.vidSettingsOf(S);
  const num = (id, label, val, attrs, hint) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" value="${esc(val)}" ${attrs || ''}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const fs = AC.vidFormatsOf(S, true);
  return `<p class="muted">Cài đặt chung cho mục Short Vid: mục tiêu mỗi tuần, độ dài kịch bản, tỉ lệ hai kiểu video, Khuôn video thương hiệu và các Format video (mỗi Format gắn Skill như Cột/Format bài viết).</p>
    <section class="panel stack" data-testid="sv-settings"><h2>Mục tiêu và độ dài</h2>
      <div class="grid-3">
        ${num('sv-target', 'Video mỗi tuần', c.weekTarget, 'min="1" max="28" step="1"')}
        ${num('sv-min', 'Tối thiểu mỗi tuần', c.weekMin, 'min="0" max="28" step="1"', 'Dưới mức này KPI hiện màu cảnh báo.')}
        <div class="field"><label for="sv-ratio">Khung hình</label><select id="sv-ratio">${RATIOS.map(r => `<option ${r === c.ratio ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        ${num('sv-len', 'Độ dài video mặc định (giây)', c.lenSec, `min="${AC.VID_LEN_MIN}" max="${AC.VID_LEN_MAX}" step="1" list="sv-len-list"`, 'Gợi ý 30, 60, 90 hoặc tùy chọn 15–300. Đổi thì số chữ bên dưới tự tính lại (±15%); mỗi thẻ Vid vẫn chọn độ dài riêng.')}<datalist id="sv-len-list">${AC.VID_LEN_PICKS.map(x => `<option value="${x}">`).join('')}</datalist>
        ${num('sv-bantin', 'Tỉ lệ Bản tin', c.mix.bantin, 'min="0" max="28" step="1"', 'Người dẫn mở đầu, phần sau giọng máy.')}
        ${num('sv-noihet', 'Tỉ lệ Người nói hết', c.mix.noihet, 'min="0" max="28" step="1"')}
        ${num('sv-wps', 'Tốc độ nói (chữ/giây)', c.wps, 'min="1" max="5" step="0.1"', 'Dùng để ước tính thời lượng.')}
        ${num('sv-wmin', 'Kịch bản tối thiểu (chữ)', c.wordMin, 'min="40" max="600" step="1"')}
        ${num('sv-wtarget', 'Nhắm tới (chữ)', c.wordTarget, 'min="40" max="600" step="1"')}
        ${num('sv-wmax', 'Kịch bản tối đa (chữ)', c.wordMax, 'min="40" max="600" step="1"')}
      </div>
      <h3>Khuôn video thương hiệu</h3>
      <p class="small muted">AI và bản mô phỏng viết theo khuôn này. Nhận diện thương hiệu nên xuất hiện trong 2 giây đầu (System1/TikTok); logo phủ suốt video làm giảm nhận biết.</p>
      <div class="field"><label for="sv-opener">Câu mở cố định / dấu hiệu nhận diện 2 giây đầu</label><input id="sv-opener" value="${esc(c.brand.opener)}" placeholder="Ví dụ: Một phút tiếng Anh cùng …"></div>
      <div class="field"><label for="sv-closer">Câu chốt / CTA chung</label><input id="sv-closer" value="${esc(c.brand.closer)}" placeholder="Ví dụ: Theo dõi kênh để luyện mỗi ngày."></div>
      <div class="field"><label for="sv-visual">Ghi chú hình ảnh</label><input id="sv-visual" value="${esc(c.brand.visual)}" placeholder="Ví dụ: nền xanh nhạt, chữ trắng viền đen, logo góc trên trái"></div>
      <span class="err" id="sv-set-err" role="alert"></span>
      <div class="row"><button class="btn primary" data-act="sv-set-save">Lưu cài đặt</button></div>
    </section>
    <section class="panel stack" data-testid="sv-formats"><header><div><span class="eyebrow">Format video</span><h2>${fs.length} Format</h2></div>
      <div class="row"><button class="btn" data-act="sv-vf-edit">${icon('plus')} Thêm Format</button><button class="btn ghost" data-act="sv-vf-reset">Khôi phục 7 Format mặc định</button></div></header>
      <div class="stack" style="gap:8px">${fs.map(f => `<div class="citem stack${f.active === false ? ' sv-off' : ''}" style="gap:6px" data-vf="${esc(f.id)}">
        <div class="row" style="justify-content:space-between"><b>${esc(f.name)}</b><span class="small muted">${esc(AC.VID_KINDS[f.kind])}${f.active === false ? ' · đang tắt' : ''}</span></div>
        <span class="small">Bố cục: ${esc(f.structure.join(' → '))}</span>
        ${f.guideMd ? `<span class="small muted">${esc(f.guideMd)}</span>` : ''}
        ${f.needs ? `<span class="small" style="color:var(--warn)">Chỉ dùng khi ${esc(AC.VID_NEEDS[f.needs].toLowerCase())}.</span>` : ''}
        ${f.basis ? `<span class="small faint">Căn cứ: ${esc(f.basis)}</span>` : ''}
        ${skillButtonHtml('vf', f)}
        <div class="row"><button class="btn sm" data-act="sv-vf-edit" data-id="${esc(f.id)}">Sửa</button><button class="btn sm" data-act="sv-vf-toggle" data-id="${esc(f.id)}">${f.active === false ? 'Bật' : 'Tắt'}</button><button class="btn sm ghost danger" data-act="sv-vf-del" data-id="${esc(f.id)}">Xóa</button></div>
      </div>`).join('')}</div></section>`;
}
ACTIONS['sv-set-save'] = () => {
  const v = id => $(`#${id}`).value;
  const r = AC.setVidSettings(S, { weekTarget: v('sv-target'), weekMin: v('sv-min'), ratio: v('sv-ratio'), lenSec: v('sv-len'), wps: v('sv-wps'), wordMin: v('sv-wmin'), wordTarget: v('sv-wtarget'), wordMax: v('sv-wmax'),
    mix: { bantin: v('sv-bantin'), noihet: v('sv-noihet') }, brand: { opener: v('sv-opener'), closer: v('sv-closer'), visual: v('sv-visual') } });
  if (!r.ok) { $('#sv-set-err').textContent = r.error; return; }
  commit('Đã lưu cài đặt Short Vid.');
};
ACTIONS['sv-vf-edit'] = el => {
  const f = el.dataset.id ? AC.byId(S.vidFormats, el.dataset.id) : null;
  openLayer(`<header><div><span class="eyebrow">Format video</span><h2>${f ? 'Sửa Format' : 'Format mới'}</h2></div><button class="btn icon ghost" data-act="close-layer" aria-label="Đóng">${icon('close')}</button></header>
    <div class="body">
      <div class="field"><label for="vf-name">Tên</label><input id="vf-name" value="${esc(f ? f.name : '')}"></div>
      <div class="field"><label for="vf-kind">Kiểu mặc định</label><select id="vf-kind">${Object.entries(AC.VID_KINDS).map(([k, l]) => `<option value="${k}" ${f && f.kind === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="vf-struct">Bố cục (mỗi dòng một phần)</label><textarea id="vf-struct" rows="5">${esc(f ? f.structure.join('\n') : 'Hook\nNội dung\nCTA')}</textarea></div>
      <div class="field"><label for="vf-guide">Hướng dẫn viết (dùng khi không chọn Skill)</label><textarea id="vf-guide" rows="4">${esc(f ? f.guideMd : '')}</textarea></div>
      <div class="field"><label for="vf-needs">Điều kiện nguồn</label><select id="vf-needs">${Object.entries(AC.VID_NEEDS).map(([k, l]) => `<option value="${k}" ${(f ? f.needs : '') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="vf-basis">Căn cứ (ghi chú, không gửi AI)</label><input id="vf-basis" value="${esc(f ? f.basis || '' : '')}"></div>
      <span class="err" id="vf-err" role="alert"></span>
      <div class="actions"><button class="btn ghost" data-act="close-layer">Hủy</button><button class="btn primary" id="vf-ok">Lưu</button></div>
    </div>`, 'drawer', b => $('#vf-ok', b).addEventListener('click', () => {
    const r = AC.saveVidFormat(S, f ? f.id : null, { name: $('#vf-name', b).value, kind: $('#vf-kind', b).value, structure: $('#vf-struct', b).value.split('\n'), guideMd: $('#vf-guide', b).value, needs: $('#vf-needs', b).value, basis: $('#vf-basis', b).value });
    if (!r.ok) { $('#vf-err', b).textContent = r.error; return; }
    closeLayer(); commit(f ? 'Đã lưu Format.' : 'Đã thêm Format.');
  }));
};
ACTIONS['sv-vf-toggle'] = el => { const r = AC.toggleVidFormat(S, el.dataset.id); if (!r.ok) return toast(r.error, 'bad'); commit(r.active ? 'Đã bật Format.' : 'Đã tắt Format: phân tích Topic sẽ không đề xuất Format này.'); };
ACTIONS['sv-vf-del'] = async el => {
  const f = AC.byId(S.vidFormats, el.dataset.id); if (!f) return;
  const used = (S.videos || []).filter(v => v.formatId === f.id).length;
  if (!(await confirmBox({ title: 'Xóa Format?', body: `<p>Xóa "${esc(f.name)}" cùng Skill của nó.${used ? ` ${used} video đang dùng Format này sẽ hiện "Format đã xóa"; kịch bản giữ nguyên.` : ''}</p>`, ok: 'Xóa', danger: true }))) return;
  const r = AC.deleteVidFormat(S, f.id); if (!r.ok) return toast(r.error, 'bad'); commit('Đã xóa Format.');
};
ACTIONS['sv-vf-reset'] = async () => {
  if (!(await confirmBox({ title: 'Khôi phục 7 Format mặc định?', body: '<p>Thay toàn bộ danh sách Format video (kể cả Skill đã nạp) bằng 7 Format mặc định. Video đã có giữ nguyên.</p>', ok: 'Khôi phục', danger: true }))) return;
  AC.resetVidFormats(S); commit('Đã khôi phục 7 Format mặc định.');
};
