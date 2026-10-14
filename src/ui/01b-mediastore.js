// ---------- Ảnh, video cất trong IndexedDB (mục 10.39) ----------
// S trong bộ nhớ vẫn giữ data URL đầy đủ. Khi lưu, chuỗi data URL dài được thay bằng "idb:<khoá>" trong localStorage,
// còn nội dung cất ở IndexedDB theo khoá băm nội dung (ảnh giống nhau chỉ cất một lần). Mở trang thì nạp lại.
// IndexedDB không dùng được thì lưu thẳng vào localStorage như trước.
const MEDIA_MIN = 4096, MEDIA_DB = 'autocontent-media', MEDIA_OS = 'blobs';
let mediaOk = false, mediaDbP = null;
const mediaKeyCache = new Map(), mediaKnown = new Set();
function mediaOpen() {
  if (mediaDbP) return mediaDbP;
  mediaDbP = new Promise((res, rej) => {
    const tm = setTimeout(() => rej(new Error('IndexedDB không phản hồi')), 2500);
    try {
      const r = indexedDB.open(MEDIA_DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MEDIA_OS)) r.result.createObjectStore(MEDIA_OS); };
      r.onsuccess = () => { clearTimeout(tm); res(r.result); };
      r.onerror = () => { clearTimeout(tm); rej(r.error || new Error('IndexedDB lỗi')); };
    } catch (e) { clearTimeout(tm); rej(e); }
  });
  return mediaDbP;
}
// Khoá theo nội dung: độ dài + hai hàm băm 32 bit
function mediaKey(s) {
  const c = mediaKeyCache.get(s); if (c) return c;
  let h1 = 0x811c9dc5, h2 = 5381;
  for (let i = 0; i < s.length; i++) { const x = s.charCodeAt(i); h1 = Math.imul(h1 ^ x, 0x01000193); h2 = (Math.imul(h2, 33) + x) | 0; }
  const k = 'm' + s.length.toString(36) + '-' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
  if (mediaKeyCache.size > 2000) mediaKeyCache.clear();
  mediaKeyCache.set(s, k); return k;
}
const isBigMedia = v => typeof v === 'string' && v.length > MEDIA_MIN && v.startsWith('data:');
function mediaTx(mode) { return mediaOpen().then(db => db.transaction(MEDIA_OS, mode).objectStore(MEDIA_OS)); }
const idbReq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function mediaPutAll(pend) {
  if (!pend.size) return;
  const db = await mediaOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(MEDIA_OS, 'readwrite'); const os = tx.objectStore(MEDIA_OS);
    pend.forEach((v, k) => os.put(v, k));
    tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Hết chỗ lưu'));
  });
  pend.forEach((v, k) => mediaKnown.add(k));
}
// Chuỗi JSON để ghi localStorage; data URL lớn chưa cất thì đưa vào pend
function stateJson(pend) {
  if (!mediaOk) return JSON.stringify(S);
  return JSON.stringify(S, (k, v) => { if (!isBigMedia(v)) return v; const key = mediaKey(v); if (pend && !mediaKnown.has(key)) pend.set(key, v); return 'idb:' + key; });
}
// Thay "idb:<khoá>" bằng nội dung; khoá thiếu thì thay bằng ảnh xám và đếm
const MEDIA_MISSING = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8+x8AAuMB8DtXNJsAAAAASUVORK5CYII=';
async function mediaHydrate(obj) {
  const refs = new Set();
  const walk = (o, fn) => { if (Array.isArray(o)) o.forEach((x, i) => typeof x === 'string' ? fn(o, i, x) : walk(x, fn)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => typeof o[k] === 'string' ? fn(o, k, o[k]) : walk(o[k], fn)); };
  walk(obj, (o, k, v) => { if (v.startsWith('idb:')) refs.add(v.slice(4)); });
  if (!refs.size) return { missing: 0, refs };
  const os = await mediaTx('readonly'); const got = new Map();
  await Promise.all([...refs].map(k => idbReq(os.get(k)).then(v => { if (typeof v === 'string') { got.set(k, v); mediaKnown.add(k); mediaKeyCache.set(v, k); } })));
  let missing = 0;
  walk(obj, (o, k, v) => { if (!v.startsWith('idb:')) return; const d = got.get(v.slice(4)); if (d) o[k] = d; else { o[k] = MEDIA_MISSING; missing++; } });
  return { missing, refs };
}
// Dọn nội dung không còn ai dùng (chạy sau khi nạp)
async function mediaGc(refs) {
  try {
    const os = await mediaTx('readwrite'); const keys = await idbReq(os.getAllKeys());
    keys.forEach(k => { if (!refs.has(k)) { os.delete(k); mediaKnown.delete(k); } });
  } catch (e) { /* bỏ qua */ }
}
async function mediaUsage() {
  try { const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; return e ? { used: e.usage || 0, quota: e.quota || 0 } : null; } catch (e) { return null; }
}
