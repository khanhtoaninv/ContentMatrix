// ---------- 05r · Skill (bộ chỉ dẫn) gắn riêng cho từng Cột và từng Format (mục 10.49) ----------
import { byId } from './05-model.js';
// Mỗi Cột/Format có danh sách `skills` [{id, name, version, body, note, updatedAt, history}] và `activeSkillId`.
// Tại thời điểm gen chỉ dùng đúng một Skill (đang chọn). Không chọn: dùng hướng dẫn cũ (guideMd). Quy tắc cứng luôn thắng Skill.
export const SKILL_KEEP = 5, SKILL_WARN_CHARS = 6000;
export const skillsOf = o => (o && Array.isArray(o.skills)) ? o.skills : [];
export function activeSkill(o) { const id = o && o.activeSkillId; return id ? skillsOf(o).find(s => s.id === id) || null : null; }
export function skillRefOf(o) { const s = activeSkill(o); return s ? { id: s.id, name: s.name, version: s.version } : null; }
export const skillTag = o => { const r = skillRefOf(o); return r ? { skill: r } : {}; };
export function skillWarnings(body) {
  const w = []; const t = String(body || '');
  if (t.length > SKILL_WARN_CHARS) w.push(`Skill dài ${t.length} ký tự (> ${SKILL_WARN_CHARS}): tốn phí và dễ loãng; nên rút gọn.`);
  const ex = (t.match(/<example>/g) || []).length;
  if (t.trim() && !ex) w.push('Chưa có bài mẫu (<example>…</example>): nên có 3–5 bài mẫu khác nhau.');
  else if (ex && ex < 3) w.push(`Mới ${ex} bài mẫu; nên 3–5 bài, đa dạng.`);
  if (ex > 5) w.push(`Có ${ex} bài mẫu; quá nhiều dễ khiến AI chép lại.`);
  return w;
}
export function addSkill(S, o, { name, body, note } = {}) {
  const nm = String(name || '').trim(); if (!nm) return { ok: false, error: 'Skill cần có tên.' };
  if (!String(body || '').trim()) return { ok: false, error: 'Nội dung Skill đang trống.' };
  o.skills = skillsOf(o).slice();
  let k = o.skills.length + 1; while (o.skills.some(s => s.id === `sk-${k}`)) k++;
  const s = { id: `sk-${k}`, name: nm, version: 1, body: String(body), note: String(note || ''), updatedAt: S.settings.demoNow || '', history: [] };
  o.skills.push(s); if (!o.activeSkillId) o.activeSkillId = s.id;
  return { ok: true, skill: s };
}
// Sửa Skill: tăng version, giữ SKILL_KEEP bản cũ
export function updateSkill(S, o, id, { name, body, note } = {}) {
  const s = skillsOf(o).find(x => x.id === id); if (!s) return { ok: false, error: 'Không thấy Skill.' };
  const nm = name == null ? s.name : String(name).trim(); if (!nm) return { ok: false, error: 'Skill cần có tên.' };
  const nb = body == null ? s.body : String(body); if (!nb.trim()) return { ok: false, error: 'Nội dung Skill đang trống.' };
  if (nb !== s.body) {
    s.history = [{ version: s.version, name: s.name, body: s.body, note: s.note, updatedAt: s.updatedAt }].concat(s.history || []).slice(0, SKILL_KEEP);
    s.version += 1;
  }
  s.name = nm; s.body = nb; if (note != null) s.note = String(note); s.updatedAt = S.settings.demoNow || s.updatedAt;
  return { ok: true, skill: s };
}
export function restoreSkill(S, o, id, version) {
  const s = skillsOf(o).find(x => x.id === id); const h = s && (s.history || []).find(x => x.version === version);
  if (!h) return { ok: false, error: 'Không thấy bản cũ.' };
  return updateSkill(S, o, id, { name: h.name, body: h.body, note: h.note });
}
export function setActiveSkill(o, id) {
  if (id && !skillsOf(o).some(s => s.id === id)) return { ok: false, error: 'Không thấy Skill.' };
  o.activeSkillId = id || ''; return { ok: true };
}
export function deleteSkill(o, id) {
  o.skills = skillsOf(o).filter(s => s.id !== id); if (o.activeSkillId === id) o.activeSkillId = '';
  return { ok: true };
}
// Chủ của Skill khi sửa đoạn/hook/caption: slot → Format của slot; ô → Cột của ô
export function skillOwnerOf(S, ctx) {
  if (!ctx) return null;
  if (ctx.slotId) { const s = byId(S.slots, ctx.slotId); return s ? byId(S.formats, s.formatId) : null; }
  return ctx.columnId ? byId(S.columns, ctx.columnId) : null;
}
export const skillBlock = (o, title) => { const s = activeSkill(o); return s ? `# ${title} (Skill "${s.name}" v${s.version}; nếu mâu thuẫn quy tắc cứng về độ dài, CTA, từ cấm thì quy tắc cứng thắng)\n${s.body.trim()}` : ''; };
