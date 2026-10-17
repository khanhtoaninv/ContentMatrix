// ---------- 01 · Tiện ích thuần ----------
export const DATA_VERSION = 'ac-edu-r4-0';
export const STORAGE_KEY = 'autocontent.state';
export const RELEASE = 'R4';
export const BUILD = 114; // số hiệu bản artifact, tăng 1 mỗi lần phát hành (hiện ở chân thanh bên)

export function clone(o) { return JSON.parse(JSON.stringify(o)); }

// FNV-1a 32-bit: dùng cho mock xác định (cùng đầu vào → cùng đầu ra)
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
export function pick(arr, seed) { return arr[hash32(String(seed)) % arr.length]; }

// SHA-256 thuần JS (chạy cả trình duyệt lẫn Node, không cần crypto.subtle)
export function sha256(ascii) { return sha256Bytes(utf8Bytes(ascii)); }
// Băm mảng byte (dùng cho tệp ảnh/video khi xuất ZIP)
export function sha256Bytes(bytes) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = bytes.length;
  const withOne = l + 1;
  const total = Math.ceil((withOne + 8) / 64) * 64;
  const m = new Uint8Array(total);
  m.set(bytes); m[l] = 0x80;
  const bitLen = l * 8;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 4, bitLen >>> 0);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  const w = new Uint32Array(64);
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = r(w[t-15], 7) ^ r(w[t-15], 18) ^ (w[t-15] >>> 3);
      const s1 = r(w[t-2], 17) ^ r(w[t-2], 19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = r(e,6) ^ r(e,11) ^ r(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = r(a,2) ^ r(a,13) ^ r(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [H[0]+a,H[1]+b,H[2]+c,H[3]+d,H[4]+e,H[5]+f,H[6]+g,H[7]+h].map(x => x >>> 0);
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}
export function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  return Uint8Array.from(Buffer.from(str, 'utf8'));
}

// Chuẩn hóa để so khớp không phân biệt hoa thường/dấu; giữ bản đồ vị trí về chuỗi gốc
function foldChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'd');
}
export function foldWithMap(text) {
  let out = ''; const map = [];
  for (let i = 0; i < text.length; i++) {
    const f = foldChar(text[i]);
    for (let k = 0; k < f.length; k++) { out += f[k]; map.push(i); }
  }
  return { out, map };
}
export function fold(text) { return foldWithMap(String(text || '')).out; }

// ---------- Ngày giờ (chuỗi, không phụ thuộc múi giờ máy) ----------
export function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }
export function fmtYMD(ms) { const d = new Date(ms); return d.toISOString().slice(0, 10); }
export function addDays(ymd, n) { return fmtYMD(parseYMD(ymd) + n * 86400000); }
export function weekdayOf(ymd) { const w = new Date(parseYMD(ymd)).getUTCDay(); return w === 0 ? 7 : w; } // 1=T2 … 7=CN
export function mondayOf(ymd) { return addDays(ymd, 1 - weekdayOf(ymd)); }
export function isValidYMD(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && fmtYMD(parseYMD(s)) === s; }
export function isValidTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
export function isoWeek(ymd) {
  const ms = parseYMD(ymd); const d = new Date(ms);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - y0) / 86400000 + 1) / 7) };
}
export function dmy(ymd) { const [y, m, d] = ymd.split('-'); return `${d}/${m}`; }
export function dmyFull(ymd) { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; }
export const WEEKDAY_SHORT = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WEEKDAY_LONG = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export function minutesOf(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

export function splitSentences(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?…])\s+(?=[^\s])/).filter(Boolean);
}
// Dòng nhãn đoạn (mục 10.28): "## Tên đoạn" (định dạng của ô) hoặc "[Tên đoạn]" (bản cũ, kịch bản video); trả tên đoạn hoặc null
export function labelOf(line) { const m = /^\s*(?:\[([^\]]+)\]|##\s+(.+?))\s*$/.exec(String(line || '')); return m ? (m[1] || m[2]).trim() : null; }
// Chia đoạn cho dễ đọc (mục 10.26): mỗi đoạn `per` câu (đoạn cuối không để lẻ một câu, tối đa per + 1), "Bước n:" mỗi bước một dòng.
// Đổi dấu cách thành xuống dòng (giữa các bước) hoặc dòng trống (giữa đoạn); độ dài theo ký tự gộp khoảng trắng nên không đổi; dòng nhãn [..], tiêu đề #, Slide n:, gạch đầu dòng để nguyên
export const PARA_WORDS = 80; // một đoạn tối đa 80 chữ (mục 10.28)
export function paraBreak(text, per = 3) {
  // Gom câu thành đoạn: tối đa `per` câu và không quá PARA_WORDS chữ; đoạn cuối không lẻ một câu ngắn
  const chunk = x => {
    const ss = x.split(/(?<=[.!?…])\s(?=\S)/); if (ss.length < 2) return x;
    const wc = s => s.split(/\s+/).filter(Boolean).length; let out = ss[0], n = 1, w = wc(ss[0]);
    ss.slice(1).forEach((s, k) => {
      const last = k === ss.length - 2; const brk = n >= per ? !(last && wc(s) < 12 && w + wc(s) <= PARA_WORDS) : w + wc(s) > PARA_WORDS;
      if (brk) { out += '\n\n' + s; n = 1; w = wc(s); } else { out += ' ' + s; n++; w += wc(s); }
    });
    return out;
  };
  return String(text || '').split('\n').map(line => {
    if (/^\s*(\[|#|Slide\s+\d+:|[-*•]\s|\d+[.)]\s)/.test(line)) return line;
    const steps = (line.match(/(^|\s)Bước\s*\d+:/g) || []).length >= 2;
    const parts = steps ? line.replace(/ (Bước\s*\d+:)/g, '\n$1').split('\n') : [line];
    return parts.map(x => {
      if (!steps || !/^Bước\s*\d+:/.test(x)) return chunk(x);
      const m = /^(.*?[.!?…])\s(?=\S)([\s\S]*)$/.exec(x); // bước: câu đầu một dòng, phần giải thích thêm xuống dòng
      return m ? `${m[1]}\n\n${chunk(m[2])}` : x;
    }).join('\n');
  }).join('\n');
}
export function countWords(text) { const t = String(text || '').trim(); return t ? t.split(/\s+/).length : 0; }
export function isValidUrl(s) { return /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(String(s || '').trim()); }
