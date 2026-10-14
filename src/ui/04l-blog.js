// ---------- UI · Blog chuẩn SEO (mục 10.40): Thiết lập → Chuẩn Blog, Thông tin SEO của slot, thân bài có ảnh/video, gắn link, rà soát, gói xuất, gửi lên web ----------
const BLOG_KEY = 'blogapi';
const LINK_TYPE_LABEL = { internal: 'Nội bộ', source: 'Nguồn', cta: 'Kêu gọi' };

// ---- Thiết lập → Chuẩn Blog ----
function blogSetupTab() {
  const c = AC.blogSeoOf(S), api = AC.blogApiOf(S), tok = keyFor(BLOG_KEY);
  const num = (k, label, hint) => `<div class="field"><label for="bs-${k}">${label}</label><input id="bs-${k}" type="number" min="0" value="${esc(c[k])}" data-bs="${k}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const txt = (k, label, ph) => `<div class="field"><label for="bs-${k}">${label}</label><input id="bs-${k}" value="${esc(c[k])}" placeholder="${esc(ph || '')}" data-bs="${k}" spellcheck="false"></div>`;
  const posts = S.blogPosts || [];
  return `<p class="muted">Chuẩn chung cho mọi slot có Format loại “Bài Blog” (SEO, chấm điểm, chèn ảnh, link, gửi web chỉ có ở các slot này): AI viết theo chuẩn này, phần rà soát trong từng bài chấm theo chuẩn này. Từ khoá, tác giả, link CTA của từng bài khai báo ở Cấu hình slot → Thông tin SEO.</p>
  <section class="card stack" style="gap:12px"><h3>Chuẩn SEO</h3>
    <div class="bs-grid">${num('titleMax', 'Tiêu đề SEO tối đa (ký tự)')}${num('descMin', 'Mô tả tối thiểu (ký tự)')}${num('descMax', 'Mô tả tối đa (ký tự)')}${num('wordsMin', 'Bài tối thiểu (chữ)')}${num('wordsMax', 'Bài tối đa (chữ)')}${num('paraMaxWords', 'Một đoạn tối đa (chữ)')}${num('answerMaxWords', 'Câu trả lời dưới đề mục đầu (chữ)')}${num('kwDensityMax', 'Mật độ từ khoá tối đa (%)')}${num('internalMin', 'Link nội bộ tối thiểu')}${num('linksMax', 'Tổng link tối đa')}${num('coverMinW', 'Ảnh bìa rộng tối thiểu (px)', 'Google Discover cần ảnh từ 1200px.')}</div>
    <h4>Website</h4>
    <div class="bs-grid">${txt('siteUrl', 'Địa chỉ website', 'https://tenmien.vn')}${txt('blogPath', 'Đường dẫn blog', '/blog/')}${txt('defaultAuthor', 'Tác giả mặc định', 'Tên người viết')}${txt('utmSource', 'UTM source', 'autocontent')}${txt('utmMedium', 'UTM medium', 'blog')}</div>
    <div class="row"><button class="btn primary" data-act="bs-save">Lưu chuẩn</button><button class="btn ghost" data-act="bs-reset">Về mặc định</button><span class="err" id="bs-err" role="alert"></span></div>
  </section>
  <section class="card stack" style="gap:12px" id="blog-api"><h3>Đăng lên web qua API</h3>
    <p class="small muted">Bài đã duyệt và đạt các mục bắt buộc được gửi tới API của web bằng nút "Gửi lên web" trong bài. Web lưu bài và tự đăng theo giờ của slot. Token chỉ nằm trên trình duyệt này, không vào bản sao lưu hay gói xuất.</p>
    <label class="row small" style="gap:6px"><input type="checkbox" id="ba-on" ${api.on ? 'checked' : ''}> Bật gửi bài lên web</label>
    <div class="bs-grid">
      <div class="field" style="grid-column:1/-1"><label for="ba-ep">Địa chỉ API của web</label><input id="ba-ep" value="${esc(api.endpoint)}" placeholder="https://tenmien.vn/api/autocontent/posts" spellcheck="false"></div>
      <div class="field"><label for="ba-tok">Token</label><input id="ba-tok" type="password" autocomplete="off" spellcheck="false" placeholder="${tok ? `Đã nhập (${esc(maskKey(tok))}), để trống nếu giữ nguyên` : 'Dán token web cấp'}"></div>
      <div class="field"><label for="ba-hd">Header xác thực</label><input id="ba-hd" value="${esc(api.authHeader)}" spellcheck="false"></div>
      <div class="field"><label for="ba-sc">Tiền tố token</label><input id="ba-sc" value="${esc(api.authScheme)}" placeholder="Bearer (để trống nếu không có)" spellcheck="false"></div>
      <div class="field"><label for="ba-st">Khi gửi</label><select id="ba-st">${Object.entries(AC.BLOG_API_STATUS).map(([k, l]) => `<option value="${k}" ${api.status === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="ba-md">Ảnh, video</label><select id="ba-md">${[['images', 'Gửi kèm ảnh, không gửi video'], ['all', 'Gửi kèm ảnh và video'], ['none', 'Không gửi kèm (web lấy từ gói xuất)']].map(([k, l]) => `<option value="${k}" ${api.media === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <label class="row small" style="gap:6px"><input type="checkbox" id="ba-remember" ${keyRememberedFor(BLOG_KEY) ? 'checked' : ''}> Nhớ token trên trình duyệt này</label>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="ba-save">Lưu</button><button class="btn" data-act="ba-test">Thử kết nối</button>${tok ? '<button class="btn ghost danger" data-act="ba-forget">Xoá token</button>' : ''}<span class="small" id="ba-status" role="status">${api.on ? `Đang bật · ${esc(AC.BLOG_API_STATUS[api.status])}` : 'Đang tắt: bài Blog xuất bằng gói hoặc Sao chép HTML.'}</span></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><span class="small muted">Web chưa có API nhận bài? Gửi tài liệu này cho lập trình viên web:</span><button class="btn sm" data-act="ba-doc">Tải tài liệu API (.md)</button><button class="btn sm" data-act="ba-doc-copy">Sao chép tài liệu</button></div>
  </section>
  <section class="card stack" style="gap:12px"><h3>Kho bài đã đăng · ${posts.length} bài</h3>
    <p class="small muted">Danh sách bài đã có trên web để gợi ý link nội bộ và cảnh báo hai bài trùng từ khoá. Nhập tệp CSV (cột url, title, keyword) hoặc sitemap.xml; bài Blog đăng từ app tự vào kho.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm" for="bp-file">${icon('upload')} Chọn tệp CSV hoặc sitemap.xml</label><input id="bp-file" type="file" accept=".csv,.txt,.xml,text/csv,text/xml,application/xml" class="sr" data-change="bp-file">
      <input id="bp-url" class="inp" style="flex:1;min-width:220px" placeholder="https://tenmien.vn/sitemap.xml" spellcheck="false"><button class="btn sm" data-act="bp-fetch">Đọc sitemap</button></div>
    <details><summary class="small">Dán nội dung CSV hoặc sitemap.xml</summary><div class="stack" style="gap:6px;margin-top:6px"><textarea id="bp-paste" rows="5" spellcheck="false" placeholder="url,title,keyword&#10;https://tenmien.vn/blog/mau-cau-hop,20 mẫu câu họp tiếng Anh,mẫu câu họp tiếng anh"></textarea><div class="row"><button class="btn sm primary" data-act="bp-import">Nhập</button></div></div></details>
    ${posts.length ? `<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl bp-tbl"><thead><tr><th>Bài</th><th>Từ khoá chính</th><th></th></tr></thead><tbody>${posts.slice(0, 200).map(p => `<tr><td><b>${esc(p.title)}</b><br><a class="small mono" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></td><td><input class="inp" aria-label="Từ khoá của ${esc(p.title)}" value="${esc(p.keyword)}" data-change="bp-kw" data-id="${esc(p.id)}" placeholder="chưa có"></td><td><button class="btn sm ghost danger" data-act="bp-del" data-id="${esc(p.id)}" aria-label="Bỏ ${esc(p.title)}">Bỏ</button></td></tr>`).join('')}</tbody></table></div>${posts.length > 200 ? `<p class="small faint">Hiện 200/${posts.length} bài.</p>` : ''}<div class="row"><button class="btn sm ghost danger" data-act="bp-clear">Xoá cả kho</button></div>` : '<p class="small faint">Kho đang trống.</p>'}
  </section>`;
}
ACTIONS['bs-save'] = () => {
  const p = {}; document.querySelectorAll('[data-bs]').forEach(el => { p[el.dataset.bs] = el.value; });
  const r = AC.setBlogSeo(S, p); if (!r.ok) { const e = $('#bs-err'); if (e) e.textContent = r.error; return; }
  AC.weekSlots(S, curWeek() ? curWeek().id : '').forEach(s => AC.blogRefreshAuto(S, s));
  commit('Đã lưu Chuẩn Blog.');
};
ACTIONS['bs-reset'] = async () => {
  if (!(await confirmBox({ title: 'Về chuẩn mặc định?', body: '<p>Các con số và thông tin website về mặc định. Kho bài và cài đặt API giữ nguyên.</p>', ok: 'Về mặc định' }))) return;
  delete S.settings.blogSeo; commit('Đã về Chuẩn Blog mặc định.');
};
function readBlogApiForm() { const v = id => { const e = $(id); return e ? e.value : undefined; }; return { on: !!($('#ba-on') || {}).checked, endpoint: v('#ba-ep'), authHeader: v('#ba-hd'), authScheme: v('#ba-sc'), status: v('#ba-st'), media: v('#ba-md') }; }
ACTIONS['ba-save'] = () => {
  const r = AC.setBlogApi(S, readBlogApiForm()); if (!r.ok) return toast(r.error, 'bad');
  const nk = (($('#ba-tok') || {}).value || '').trim(); setKeyFor(BLOG_KEY, nk || keyFor(BLOG_KEY), !!($('#ba-remember') || {}).checked);
  commit(r.api.on ? 'Đã lưu và bật gửi bài lên web.' : 'Đã lưu cài đặt API web (đang tắt).');
};
ACTIONS['ba-forget'] = () => { setKeyFor(BLOG_KEY, '', false); render(); toast('Đã xoá token khỏi trình duyệt.'); };
ACTIONS['ba-test'] = async () => {
  const st = $('#ba-status'); const f = readBlogApiForm(); const cfg = Object.assign(AC.blogApiOf(S), f);
  const nk = (($('#ba-tok') || {}).value || '').trim(); if (nk) setKeyFor(BLOG_KEY, nk, !!($('#ba-remember') || {}).checked);
  const req = AC.buildBlogPostRequest(cfg, keyFor(BLOG_KEY), null, true);
  if (!req.ok) { if (st) { st.textContent = req.error; st.className = 'small err'; } return; }
  if (st) { st.textContent = 'Đang thử…'; st.className = 'small'; }
  try { const r = await apiFetch(req, 30000); const p = AC.parseBlogPostResponse(r.status, r.body); if (!p.ok) throw new Error(p.error); if (st) { st.textContent = `Đã kết nối được web (mã ${r.status}).`; st.className = 'small ok'; } }
  catch (e) { if (st) { st.textContent = e.message; st.className = 'small err'; } }
};
ACTIONS['ba-doc'] = () => downloadBytes('autocontent-blog-api.md', AC.utf8Bytes(AC.blogApiDoc(S)), 'text/markdown');
ACTIONS['ba-doc-copy'] = () => copyText(AC.blogApiDoc(S), 'Đã chép tài liệu API.');
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) { ok = false; } ta.remove(); toast(ok ? msg : 'Trình duyệt không cho chép; hãy tải tệp.', ok ? '' : 'bad'); }
}
function importPostsText(text, source) {
  const t = String(text || '').trim(); if (!t) return toast('Chưa có nội dung để nhập.', 'bad');
  const isXml = /^<\?xml|<(urlset|sitemapindex)[\s>]/i.test(t);
  const p = isXml ? AC.parseSitemap(t) : AC.parsePostsCsv(t);
  if (!p.ok) return toast(p.error, 'bad');
  if (p.index) return toast(`Đây là sitemap chỉ mục (${p.sitemaps.length} sitemap con). Mở sitemap bài viết, ví dụ ${p.sitemaps[0] || 'post-sitemap.xml'}, rồi nhập lại.`, 'bad');
  const r = AC.importBlogPosts(S, p.posts, source || (isXml ? 'sitemap' : 'csv'));
  commit(`Đã nhập ${r.added} bài mới${r.updated ? `, cập nhật ${r.updated}` : ''}${p.bad && p.bad.length ? `; bỏ ${p.bad.length} dòng thiếu link` : ''}. Kho có ${r.total} bài.`);
}
ACTIONS['bp-import'] = () => importPostsText(($('#bp-paste') || {}).value);
CHANGES['bp-file'] = el => { const f = el.files && el.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => importPostsText(String(rd.result)); rd.onerror = () => toast('Không đọc được tệp.', 'bad'); rd.readAsText(f); };
ACTIONS['bp-fetch'] = async () => {
  const u = (($('#bp-url') || {}).value || '').trim(); if (!AC.isValidUrl(u)) return toast('Nhập link sitemap.xml đầy đủ (https://…).', 'bad');
  try { const r = await fetch(u); if (!r.ok) throw new Error(`mã ${r.status}`); importPostsText(await r.text(), 'sitemap'); }
  catch (e) { toast(`Không đọc được ${u}: web không cho trình duyệt đọc trực tiếp (${e.message}). Mở link đó, lưu tệp rồi bấm "Chọn tệp".`, 'bad'); }
};
CHANGES['bp-kw'] = el => { const r = AC.updateBlogPost(S, el.dataset.id, { keyword: el.value }); if (r.ok) { save(); toast('Đã lưu từ khoá.'); } };
ACTIONS['bp-del'] = el => { AC.removeBlogPost(S, el.dataset.id); commit('Đã bỏ bài khỏi kho.'); };
ACTIONS['bp-clear'] = async () => { if (!(await confirmBox({ title: 'Xoá cả kho bài?', danger: true, ok: 'Xoá kho', body: '<p>Chỉ xoá danh sách trong app; bài trên web không bị ảnh hưởng.</p>' }))) return; S.blogPosts = []; commit('Đã xoá kho bài.'); };

// ---- Cấu hình slot → Thông tin SEO ----
function slotSeoSectionHtml(s, locked) {
  const seo = AC.slotSeoOf(s), c = AC.blogSeoOf(S), conf = AC.keywordConflicts(S, s.id, seo.keyword);
  const dis = locked ? 'disabled' : '';
  const auto = (k, ed) => seo[ed] ? '<span class="small faint">sửa tay · xoá trống để tự tạo lại</span>' : '<span class="small faint">tự tạo theo bài</span>';
  const cnt = (v, a, b) => `<span class="small mono ${v.length < a || v.length > b ? 'err' : 'ok'}">${v.length}/${b}</span>`;
  return `<section class="cfg-sec cfg-seo" id="slot-seo"><div class="cfg-h"><span class="cfg-n">3</span><h3>Thông tin SEO</h3></div>
    <p class="small muted">AI viết bài Blog theo các thông tin này khi Chia bài hoặc Tạo lại. Chuẩn chung (độ dài, số link…) ở Thiết lập → Chuẩn Blog.</p>
    <div class="cfg-sub stack" style="gap:10px">
      <div class="field"><label for="seo-kw">Từ khoá chính</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="seo-kw" value="${esc(seo.keyword)}" placeholder="cụm 2–5 chữ người đọc hay tìm" ${dis}>${seo.kwSource === 'suggest' && !seo.kwConfirmed && !locked ? '<button class="btn sm primary" data-x="seo-kwok">Xác nhận</button>' : ''}</div>
        ${seo.kwSource === 'suggest' && !seo.kwConfirmed ? '<span class="hint warn-t">Gợi ý từ Topic, chưa xác nhận: sửa hoặc bấm Xác nhận.</span>' : ''}${conf.length ? `<span class="hint warn-t">Trùng từ khoá với: ${conf.slice(0, 3).map(x => esc(x.label)).join('; ')}. Hai bài cùng từ khoá sẽ tranh thứ hạng của nhau.</span>` : ''}</div>
      <div class="field"><label for="seo-kws">Từ khoá phụ</label><input id="seo-kws" value="${esc(seo.keywords.join(', '))}" placeholder="cách nhau dấu phẩy" ${dis}></div>
      <div class="fgrid"><div class="field"><label for="seo-intent">Ý định tìm kiếm</label><select id="seo-intent" ${dis}>${Object.entries(AC.BLOG_INTENTS).map(([k, l]) => `<option value="${k}" ${seo.intent === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <div class="field"><label for="seo-author">Tác giả</label><input id="seo-author" value="${esc(seo.author)}" placeholder="${esc(c.defaultAuthor || 'Tên người viết')}" ${dis}></div></div>
      <div class="fgrid"><div class="field"><label for="seo-cat">Chuyên mục</label><input id="seo-cat" value="${esc(seo.category)}" ${dis}></div>
        <div class="field"><label for="seo-tags">Thẻ</label><input id="seo-tags" value="${esc(seo.tags.join(', '))}" placeholder="cách nhau dấu phẩy" ${dis}></div></div>
      <div class="field"><label for="seo-slug">Slug ${auto('slug', 'slugEdited')}</label><input id="seo-slug" value="${esc(seo.slugEdited ? seo.slug : '')}" placeholder="${esc(seo.slug || 'tự sinh từ tiêu đề')}" spellcheck="false" ${dis}><span class="hint">${c.siteUrl ? esc(`${c.siteUrl}${c.blogPath}${seo.slug}`) : 'Khai báo địa chỉ website ở Chuẩn Blog để có link chuẩn.'}</span></div>
      <div class="field"><label for="seo-rel">Bài liên quan cần dẫn link (mỗi dòng một link)</label><textarea id="seo-rel" rows="2" spellcheck="false" ${dis}>${esc(seo.related.join('\n'))}</textarea></div>
      <div class="fgrid"><div class="field"><label for="seo-cta">Link kêu gọi hành động</label><input id="seo-cta" value="${esc(seo.ctaUrl)}" placeholder="https://… trang đăng ký" spellcheck="false" ${dis}><span class="hint">App tự gắn UTM khi chèn link.</span></div>
        <div class="field"><label for="seo-ctat">Chữ neo CTA</label><input id="seo-ctat" value="${esc(seo.ctaText)}" placeholder="ví dụ: đăng ký học thử" ${dis}></div></div>
      <div class="field"><label for="seo-title">Tiêu đề SEO ${auto('seoTitle', 'seoTitleEdited')} ${cnt(seo.seoTitle, 10, c.titleMax)}</label><input id="seo-title" value="${esc(seo.seoTitleEdited ? seo.seoTitle : '')}" placeholder="${esc(seo.seoTitle || 'tự tạo khi có bài')}" ${dis}></div>
      <div class="field"><label for="seo-desc">Mô tả (meta description) ${auto('metaDesc', 'metaDescEdited')} ${cnt(seo.metaDesc, c.descMin, c.descMax)}</label><textarea id="seo-desc" rows="2" placeholder="${esc(seo.metaDesc || 'tự tạo khi có bài')}" ${dis}>${esc(seo.metaDescEdited ? seo.metaDesc : '')}</textarea></div>
      <div class="field"><label for="seo-exc">Tóm tắt ${auto('excerpt', 'excerptEdited')}</label><textarea id="seo-exc" rows="2" placeholder="${esc(seo.excerpt || 'tự tạo khi có bài')}" ${dis}>${esc(seo.excerptEdited ? seo.excerpt : '')}</textarea></div>
      <div class="field"><label for="seo-alt">Mô tả ảnh bìa (alt) ${auto('coverAlt', 'coverAltEdited')}</label><input id="seo-alt" value="${esc(seo.coverAltEdited ? seo.coverAlt : '')}" placeholder="${esc(seo.coverAlt || 'tự tạo khi có bài')}" ${dis}></div>
      ${locked ? '' : '<div class="cfg-foot"><span class="err" id="seo-err" role="alert"></span><button class="btn primary" data-x="seo-save">Lưu thông tin SEO</button></div>'}
    </div></section>`;
}
function readSeoForm(box) {
  const v = id => { const e = box.querySelector(id); return e ? e.value : undefined; };
  return { keyword: v('#seo-kw'), keywords: v('#seo-kws'), intent: v('#seo-intent'), author: v('#seo-author'), category: v('#seo-cat'), tags: v('#seo-tags'), slug: v('#seo-slug'), related: v('#seo-rel'), ctaUrl: v('#seo-cta'), ctaText: v('#seo-ctat'), seoTitle: v('#seo-title'), metaDesc: v('#seo-desc'), excerpt: v('#seo-exc'), coverAlt: v('#seo-alt') };
}
// Nút trong Cấu hình slot (data-x seo-*); trả true nếu đã xử lý
function blogCfgAction(s, x, box) {
  if (x === 'seo-save' || x === 'seo-kwok') {
    const p = readSeoForm(box); if (x === 'seo-kwok') p.confirm = true;
    const r = AC.setSlotSeo(S, s.id, p);
    if (!r.ok) { const e = box.querySelector('#seo-err'); if (e) e.textContent = r.error; else toast(r.error, 'bad'); return true; }
    save(); render(); openSlot(s.id);
    toast(r.conflicts.length ? `Đã lưu. Lưu ý: từ khoá trùng ${r.conflicts.length} bài khác.` : x === 'seo-kwok' ? 'Đã xác nhận từ khoá.' : 'Đã lưu thông tin SEO. Bấm Tạo lại nếu muốn AI viết lại theo thông tin mới.', r.conflicts.length ? 'bad' : '');
    const sec = document.getElementById('slot-seo'); if (sec) sec.scrollIntoView({ block: 'start' });
    return true;
  }
  return false;
}

// ---- Thân bài Blog trong Xem như khi đăng: khối chữ, ảnh/video chèn giữa bài, nút + giữa các khối ----
function blogBodyHtml(s, text, st, canIns) {
  const lines = String(text || '').split('\n');
  const groups = []; let cur = null;
  lines.forEach((l, i) => {
    const t = l.trim(); if (!t || /^#\s/.test(t)) { if (cur && cur.list && !t) return; cur = null; return; }
    const m = /^!\[([^\]]*)\]\(media:([\w-]+)(?:\s+"([^"]*)")?\)\s*$/.exec(t);
    if (m) { groups.push({ media: { alt: m[1], bid: m[2], cap: m[3] || '' }, end: i }); cur = null; return; }
    const list = /^([-*•]|\d+[.)])\s+/.test(t);
    if (cur && cur.list && list) { cur.lines.push(l); cur.end = i; return; }
    cur = { lines: [l], end: i, list }; groups.push(cur);
  });
  const ins = () => ''; // chèn ảnh/video chỉ khi Sửa (nút 🖼 Ảnh/video trên thanh công cụ), không chèn ở chế độ Xem (mục 10.45)
  const first = lines.findIndex(l => /^#\s/.test(l.trim()));
  return ins(first) + groups.map(g => {
    if (!g.media) return `<div class="content-text rich">${richText(g.lines.join('\n'))}</div>${ins(g.end)}`;
    const i = AC.blogMediaIndex(s, g.media.bid); const a = s.assets[i];
    if (!a) return `<p class="note warn small">Dòng ảnh trỏ tới ô không còn (media:${esc(g.media.bid)}). Sửa bài để xoá dòng này.</p>${ins(g.end)}`;
    const sel = false; // chế độ Xem chỉ đọc: mọi thay đổi ảnh đi qua nút Sửa (mục 10.45)
    return `<figure class="pv-bfig${sel ? ' sel' : ''}" data-bid="${esc(g.media.bid)}"><div class="pv-bfig-pick">${pvImageBase(a, (v => v && v.w && v.h ? `${v.w} / ${v.h}` : '16 / 9')(a.versions.find(x => x.n === a.current)), '')}</div>
      <figcaption>${g.media.cap ? esc(g.media.cap) : ''}<span class="small faint"> Mô tả (alt): ${g.media.alt ? esc(g.media.alt) : '<b class="err">trống</b>'}</span></figcaption>
      </figure>${ins(g.end)}`;
  }).join('');
}
function blogMediaTools(s, a, i, st, ref, editing) {
  const ci = a.versions.findIndex(v => v.n === a.current), cur = ci >= 0 ? a.versions[ci] : null, vid = assetKind(a) === 'video';
  const openP = st.promptOpen === i, openE = st.editOpen === i, openA = st.altOpen === i;
  return `${imgToolbar({ s, a, i, lk: false, via: 'pv', open: openP, extra: editing ? `<button class="btn sm ${openA ? 'primary' : ''}" data-pv="b-alt" data-i="${i}" aria-expanded="${openA}">Mô tả</button><button class="btn sm ghost danger" data-pv="b-del" data-bid="${esc(a.bid)}">Xoá</button>` : '' })}
    ${openP ? `<div class="pv-prompt"><label class="small" for="pv-prompt-${i}">Prompt ảnh</label><textarea id="pv-prompt-${i}" spellcheck="false">${esc(st.pdraft != null ? st.pdraft : a.prompt)}</textarea><div class="row" style="gap:8px"><button class="btn sm primary" data-pv="pgen" data-i="${i}">Lưu prompt và Gen</button><button class="btn sm" data-pv="psave" data-i="${i}">Chỉ lưu prompt</button><button class="btn sm ghost" data-pv="pclose">Đóng</button></div></div>` : ''}
    ${openE ? `<div class="pv-prompt"><label class="small" for="pv-medit-${i}">Yêu cầu chỉnh ảnh (mô phỏng)</label><input id="pv-medit-${i}" class="inp" placeholder="Ví dụ: làm sáng hơn" value="${esc(st.edraft || '')}"><div class="row" style="gap:8px"><button class="btn sm primary" data-pv="mapply" data-i="${i}">Áp dụng</button><button class="btn sm ghost" data-pv="mclose">Đóng</button></div></div>` : ''}
    ${openA && editing ? `<div class="pv-prompt"><label class="small" for="b-alt-${i}">Mô tả ảnh (alt, cho Google và người dùng trình đọc màn hình)</label><input id="b-alt-${i}" class="inp" value="${esc(ref.alt)}"><label class="small" for="b-cap-${i}">Chú thích dưới ảnh (không bắt buộc)</label><input id="b-cap-${i}" class="inp" value="${esc(ref.cap)}"><div class="row" style="gap:8px"><button class="btn sm primary" data-pv="b-altsave" data-i="${i}" data-bid="${esc(a.bid)}">Lưu</button><button class="btn sm ghost" data-pv="b-altclose">Đóng</button></div></div>` : ''}
    ${videoMetaLine(cur)}`;
}
// Khi Sửa bài Blog (mục 10.46): bài dạng khối theo đúng thứ tự: mỗi đoạn chữ là một ô soạn, mỗi ảnh/video là khối có ảnh xem trước và đủ công cụ ngay tại vị trí chèn.
// #pv-edit (ẩn) giữ bản ghép của cả bài; ghép lại bằng '\n' giữa các khối nên không đổi nội dung.
function blogBlocksHtml(st) {
  const s = st.s; const blocks = []; let cur = null;
  String(st.draft || '').split('\n').forEach(l => {
    const m = /^!\[([^\]]*)\]\(media:([\w-]+)(?:\s+"([^"]*)")?\)\s*$/.exec(l.trim()); const i = m ? AC.blogMediaIndex(s, m[2]) : -1;
    if (i >= 0) { blocks.push({ line: l, i, ref: { alt: m[1], bid: m[2], cap: m[3] || '' } }); cur = null; }
    else { if (!cur) { cur = { text: [] }; blocks.push(cur); } cur.text.push(l); }
  });
  if (!blocks.length) blocks.push({ text: [''] });
  let k = 0;
  return `<div class="pv-blk">${blocks.map(b => {
    if (b.text) return `<textarea class="pv-seg" data-md="full" data-slot="${esc(s.id)}" data-k="${k++}" rows="1" spellcheck="false" aria-label="Đoạn chữ">\n${esc(b.text.join('\n'))}</textarea>`;
    const a = s.assets[b.i];
    return `<figure class="pv-bfig pv-bblk" data-line="${esc(b.line)}" data-bid="${esc(b.ref.bid)}"><div class="pv-bfig-pick">${pvImageBase(a, null, '')}</div>
      <figcaption><b>${esc(a.name)}</b><span class="small faint"> Mô tả (alt): ${b.ref.alt ? esc(b.ref.alt) : '<b class="err">trống</b>'}</span></figcaption>
      ${blogMediaTools(s, a, b.i, st, b.ref, true)}</figure>`;
  }).join('')}</div>`;
}
// Hỏi loại và mô tả ảnh/video cần chèn
async function askBlogMedia() {
  return confirmBox({ title: 'Chèn ảnh hoặc video', ok: 'Chèn',
    body: '<p class="small muted">Ảnh chèn xong có ngay một bản mô phỏng; bấm vào ảnh để Gen, Up, Sửa, Frame, Cắt… như các ô ảnh khác. Video: bấm Up để chọn tệp.</p>',
    extra: `<div class="field"><label for="bm-kind">Loại</label><select id="bm-kind" data-collect="kind"><option value="image">Ảnh</option><option value="video">Video</option></select></div>
      <div class="field"><label for="bm-alt">Mô tả (alt)</label><input id="bm-alt" data-collect="alt" placeholder="Ví dụ: Nhân viên giơ tay phát biểu trong cuộc họp trực tuyến"></div>` });
}
function afterBlogInsert(s, r) {
  const a = s.assets[r.index];
  if (a && a.kind !== 'video') { if (AC.imageApiOn(S)) { save(); apiGenImage(s, r.index); } else AC.genSlotImage(S, s.id, r.index); }
}
// Thao tác b-* trong popup Xem như khi đăng của slot Blog
async function blogPvAction(s, st, k, b, paint) {
  const i = Number(b.dataset.i);
  if (k === 'b-sel') { st.sel = st.sel === i ? null : i; st.promptOpen = null; st.editOpen = null; st.altOpen = null; return paint(); }
  if (k === 'b-alt') { st.altOpen = st.altOpen === i ? null : i; return paint(); }
  if (k === 'b-altclose') { st.altOpen = null; return paint(); }
  if (k === 'b-altsave') {
    const alt = ($(`#b-alt-${i}`) || {}).value || '', cap = ($(`#b-cap-${i}`) || {}).value || '', bid = b.dataset.bid;
    if (alt.trim().length < 5) return toast('Mô tả ảnh cần ít nhất 5 ký tự, nói rõ ảnh có gì.', 'bad');
    const src0 = st.edit ? st.draft : s.text;
    const t = String(src0).split('\n').map(l => { const m = /^!\[[^\]]*\]\(media:([\w-]+)/.exec(l.trim()); return m && m[1] === bid ? AC.blogMediaLine(bid, alt, cap) : l; }).join('\n');
    if (st.edit) st.draft = t; else AC.setBlogText(S, s, t);
    st.altOpen = null; save(); render(); paint(); return toast(st.edit ? 'Đã đổi mô tả trong bản đang sửa. Bấm Lưu để giữ.' : 'Đã lưu mô tả ảnh.');
  }
  if (k === 'b-del') {
    if (!(await confirmBox({ title: 'Xoá ảnh/video khỏi bài?', danger: true, ok: 'Xoá', body: '<p>Bỏ dòng ảnh khỏi bài và bỏ ô ảnh này cùng mọi phiên bản.</p>' }))) return;
    const r = AC.removeBlogMedia(S, s.id, b.dataset.bid); if (!r.ok) return toast(r.error, 'bad');
    if (st.edit) st.draft = String(st.draft || '').split('\n').filter(l => { const m = /^!\[[^\]]*\]\(media:([\w-]+)/.exec(l.trim()); return !(m && m[1] === b.dataset.bid); }).join('\n').replace(/\n{3,}/g, '\n\n');
    st.sel = null; save(); render(); paint(); return toast('Đã xoá ảnh/video khỏi bài.');
  }
  if (k === 'b-ins') {
    const res = await askBlogMedia(); if (!res) return;
    const r = AC.insertBlogMedia(S, s.id, Number(b.dataset.l), res.kind, res.alt); if (!r.ok) return toast(r.error, 'bad');
    afterBlogInsert(s, r); st.sel = r.index; save(); render(); paint();
    return toast(res.kind === 'video' ? 'Đã chèn ô video. Bấm Up để chọn tệp.' : 'Đã chèn ảnh (mô phỏng). Bấm ảnh để đổi bằng Gen, Up, Kho…');
  }
  if (k === 'b-orph') {
    const a = s.assets[i]; if (!a) return;
    if (st.edit) { st.draft = `${st.draft}\n\n${AC.blogMediaLine(a.bid, a.name, '')}`; paint(); return toast('Đã chèn vào cuối bản đang sửa. Bấm Lưu để giữ.'); }
    AC.setBlogText(S, s, `${s.text}\n\n${AC.blogMediaLine(a.bid, a.name, '')}`); save(); render(); paint(); return toast('Đã chèn vào cuối bài. Bấm Sửa để chuyển tới chỗ khác.');
  }
  if (k === 'b-tidy') {
    const src = st.edit ? st.draft : s.text; const r = AC.blogTidy(src);
    if (r.text === src) return toast('Định dạng đã gọn, không có gì để đổi.');
    if (st.edit) { st.draft = r.text; paint(); return toast(`Đã chuẩn hoá trong bản đang sửa: ${r.changes.join(', ')}.`); }
    const e = AC.editSlot(S, s.id, r.text); if (!e.ok) return toast(e.error, 'bad');
    save(); render(); paint(); return toast(`Đã chuẩn hoá (${r.changes.join(', ')}), lưu thành bản ${e.n}.`);
  }
  if (k === 'b-kwok') { const r = AC.confirmKeyword(S, s.id); if (!r.ok) return toast(r.error, 'bad'); save(); render(); paint(); return toast('Đã xác nhận từ khoá.'); }
  if (k === 'b-seocfg') { if (st.edit && st.draft !== s.text) return toast('Lưu hoặc Hủy bản sửa trước.', 'bad'); openSlot(s.id, null, true); setTimeout(() => { const el = document.getElementById('slot-seo'); if (el) el.scrollIntoView({ block: 'start' }); }, 30); return; }
  if (k === 'b-link') {
    const id = b.dataset.id; const sug = (st.linkSug || []).find(x => x.id === id); if (!sug) return;
    const url = (($(`#b-url-${id}`) || {}).value || '').trim(); const anchor = (($(`#b-anc-${id}`) || {}).value || sug.anchor || '').trim();
    if (!anchor) return toast('Nhập chữ neo (cụm chữ có trong bài) để gắn link.', 'bad');
    const src = st.edit ? st.draft : s.text;
    const r = AC.applyLink(src, anchor, sug.type === 'cta' && url && !/utm_/.test(url) ? AC.utmUrl(url, AC.blogSeoOf(S), AC.slotSeoOf(s).slug) : url); if (!r.ok) return toast(r.error, 'bad');
    if (st.edit) { st.draft = r.text; paint(); return toast('Đã gắn link trong bản đang sửa.'); }
    const e = AC.editSlot(S, s.id, r.text); if (!e.ok) return toast(e.error, 'bad');
    save(); render(); paint(); return toast(`Đã gắn link "${anchor}". Slot chờ duyệt lại.`);
  }
  if (k === 'b-unlink') {
    const src = st.edit ? st.draft : s.text; const r = AC.unlinkAt(src, b.dataset.a, b.dataset.u); if (!r.ok) return toast(r.error, 'bad');
    if (st.edit) { st.draft = r.text; return paint(); }
    const e = AC.editSlot(S, s.id, r.text); if (!e.ok) return toast(e.error, 'bad'); save(); render(); paint(); return toast('Đã bỏ link.');
  }
  if (k === 'b-copyhtml' || k === 'b-copyjson' || k === 'b-copymd') {
    const p = AC.blogPackage(S, s, { inline: false }); if (!p.ok) return toast(p.error, 'bad');
    return copyText(k === 'b-copyhtml' ? p.html : k === 'b-copymd' ? p.md : p.jsonText, k === 'b-copyhtml' ? 'Đã chép HTML thân bài (không có H1; tiêu đề nằm ở trường title).' : k === 'b-copymd' ? 'Đã chép Markdown kèm thông tin SEO.' : 'Đã chép JSON của bài.');
  }
  if (k === 'b-zip') { const p = AC.blogPackage(S, s); if (!p.ok) return toast(p.error, 'bad'); return downloadBytes(`blog-${p.slug}.zip`, AC.zipFiles(p.files, S.settings.demoNow), 'application/zip'); }
  if (k === 'b-post') return blogPostWeb(s, paint);
}
async function blogPostWeb(s, paint) {
  const g = AC.blogPostGate(S, s); if (!g.ok) return toast(g.reason, 'bad');
  const cfg = AC.blogApiOf(S); const seo = AC.slotSeoOf(s);
  const again = s.webPost ? `<p class="note warn small">Bài đã gửi lúc ${esc(tsLabel(s.webPost.at))}. Gửi lại cùng mã ${esc(s.id)} để web cập nhật bài cũ.</p>` : '';
  if (!(await confirmBox({ title: 'Gửi bài lên web?', ok: s.webPost ? 'Gửi lại' : 'Gửi lên web', body: `<p><b>${esc(AC.blogH1(s.text))}</b></p><p class="small">Tới ${esc(cfg.endpoint)} · ${esc(AC.BLOG_API_STATUS[cfg.status])}${cfg.status === 'scheduled' ? ` (${esc(pvWhen(s))})` : ''} · slug ${esc(seo.slug)}</p>${again}` }))) return;
  const pkg = AC.blogPackage(S, s, { inline: cfg.media !== 'none', media: cfg.media });
  const req = AC.buildBlogPostRequest(cfg, keyFor(BLOG_KEY), pkg.post); if (!req.ok) return toast(req.error, 'bad');
  try {
    const r = await apiFetch(req, 120000); const p = AC.parseBlogPostResponse(r.status, r.body); if (!p.ok) throw new Error(p.error);
    const w = AC.recordWebPost(S, s.id, p); save(); render(); if (paint) paint();
    toast(w.published ? `Web đã nhận bài và đăng${p.url ? `: ${p.url}` : ''}.` : `Web đã nhận bài${cfg.status === 'draft' ? ' (bản nháp, duyệt trên web)' : `, sẽ đăng lúc ${pvWhen(s)}`}.`);
  } catch (e) { toast(e.message, 'bad'); }
}
// Mục SEO dưới khung bài: rà soát, điểm, gợi ý link, xuất, gửi lên web
function blogSeoPanelHtml(s, st, n) {
  const text = st.edit ? st.draft : s.text; if (!text) return '';
  const a = AC.seoAudit(S, s, text); const must = a.checks.filter(c => c.group === 'must'); const qual = a.checks.filter(c => c.group === 'quality' && !c.na);
  const bad = qual.filter(c => !c.ok);
  const ro = st.locked || !st.edit; // Xem chỉ đọc: gắn link, SEO, từ khoá, chuẩn hoá chỉ khi Sửa
  const fixBtn = c => c.fix === 'tidy' && !st.edit ? '' : c.fix === 'tidy' ? '<button class="btn sm" data-pv="b-tidy">Chuẩn hoá định dạng</button>' : c.fix === 'confirm-kw' && !ro ? '<button class="btn sm primary" data-pv="b-kwok">Xác nhận từ khoá</button>' : '';
  const row = c => `<li class="seo-c ${c.ok ? 'ok' : c.group === 'must' ? 'bad' : 'warn'}"><span class="seo-i" aria-hidden="true">${c.ok ? '✓' : c.group === 'must' ? '✕' : '!'}</span><span><b>${esc(c.label)}</b>${c.detail ? ` <span class="small muted">${esc(c.detail)}</span>` : ''}</span>${!c.ok && !ro ? fixBtn(c) : ''}</li>`;
  st.linkSug = ro ? [] : AC.linkSuggestions(S, s, text);
  const links = AC.linksOf(text);
  const mi = AC.blogMediaIssues(s, text);
  const gate = AC.blogPostGate(S, s); const api = AC.blogApiOf(S); const seo = a.seo;
  return `<section class="cfg-sec seo-panel" id="pv-seo"><div class="cfg-h"><span class="cfg-n">${n}</span><h3>SEO của bài</h3><span class="cfg-r seo-score"><b>${a.score}</b>/100 <span class="mock">ước lượng theo luật, không phải điểm Google</span></span></div>
    <p class="small ${a.mustOk ? 'ok' : 'err'}">${a.mustOk ? 'Đạt mọi mục bắt buộc kỹ thuật.' : `Còn ${a.mustFail} mục bắt buộc chưa đạt: chưa gửi lên web được.`}</p>
    <ul class="seo-list">${must.map(row).join('')}</ul>
    <details ${bad.length && bad.length <= 4 ? 'open' : ''}><summary class="small"><b>Chất lượng</b> · ${qual.length - bad.length}/${qual.length} đạt${bad.length ? ` · ${bad.length} cần xem` : ''} (chỉ cảnh báo, bạn quyết định)</summary><ul class="seo-list">${bad.map(row).join('')}${qual.filter(c => c.ok).map(row).join('')}</ul></details>
    <div class="seo-meta small"><div><span class="faint">Tiêu đề SEO</span> ${esc(seo.seoTitle || '—')}</div><div><span class="faint">Mô tả</span> ${esc(seo.metaDesc || '—')}</div><div><span class="faint">Slug</span> <span class="mono">${esc(seo.slug || '—')}</span> · <span class="faint">Từ khoá</span> ${esc(seo.keyword || '—')}${seo.kwSource === 'suggest' && !seo.kwConfirmed ? ' <span class="st st-need">gợi ý</span>' : ''}</div>
      ${ro ? '' : '<button class="btn sm ghost" data-pv="b-seocfg">Sửa thông tin SEO</button>'}</div>
    ${ro ? (st.locked ? '' : '<p class="small faint">Muốn gắn link, đổi thông tin SEO, xác nhận từ khoá hay chèn ảnh/video: bấm Sửa.</p>') : `<h4>Gắn liên kết</h4>${st.linkSug.length ? `<ul class="seo-links">${st.linkSug.map(x => `<li><span class="lk-t lk-${x.type}">${LINK_TYPE_LABEL[x.type]}</span><div class="stack" style="gap:4px;min-width:0;flex:1"><span class="small muted">${esc(x.why)}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap"><input id="b-anc-${x.id}" class="inp" style="flex:1;min-width:140px" aria-label="Chữ neo" value="${esc(x.anchor)}" placeholder="cụm chữ trong bài"><input id="b-url-${x.id}" class="inp" style="flex:2;min-width:180px" aria-label="Link" value="${esc(x.url)}" placeholder="https://…" spellcheck="false"><button class="btn sm primary" data-pv="b-link" data-id="${x.id}">Gắn link</button></div></div></li>`).join('')}</ul>` : '<p class="small faint">Chưa có gợi ý. Nhập kho bài đã đăng (Thiết lập → Chuẩn Blog) hoặc khai báo bài liên quan, link CTA ở Thông tin SEO.</p>'}
    <p class="small faint">Gắn link cho cụm khác: bấm Sửa, chọn chữ trong bài rồi bấm nút Link trên thanh công cụ.</p>
    ${links.length ? `<ul class="seo-links">${links.map(l => `<li><span class="lk-t lk-${AC.linkType(S, s, l.url)}">${LINK_TYPE_LABEL[AC.linkType(S, s, l.url)]}</span><span class="small" style="flex:1;min-width:0"><b>${esc(l.anchor)}</b> → <span class="mono faint">${esc(l.url)}</span></span>${ro ? '' : `<button class="btn sm ghost" data-pv="b-unlink" data-a="${esc(l.anchor)}" data-u="${esc(l.url)}">Bỏ link</button>`}</li>`).join('')}</ul>` : ''}
    ${mi.orphans.length ? `<p class="note warn small">Còn ${mi.orphans.length} ảnh/video chưa được chèn vào bài: ${mi.orphans.map(o => st.edit ? `${esc(o.name)} <button class="btn sm" data-pv="b-orph" data-i="${AC.blogMediaIndex(s, o.bid)}">Chèn cuối bài</button>` : esc(o.name)).join(', ')}${st.edit ? '' : '. Bấm Sửa để chèn.'}</p>` : ''}`}
    <h4>Xuất và đăng</h4>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-pv="b-copyhtml">Sao chép HTML</button><button class="btn sm" data-pv="b-copymd">Sao chép Markdown</button><button class="btn sm" data-pv="b-copyjson">Sao chép JSON</button><button class="btn sm" data-pv="b-zip">${icon('export')} Tải gói bài (.zip)</button>
      <button class="btn sm ${gate.ok ? 'primary' : ''}" data-pv="b-post" ${gate.ok && !st.edit ? '' : 'disabled'} title="${esc(st.edit ? 'Lưu bản sửa trước' : gate.ok ? 'Gửi bài tới API của web' : gate.reason)}">Gửi lên web</button></div>
    <p class="small faint">${s.webPost ? `Đã gửi lên web lúc ${esc(tsLabel(s.webPost.at))}${s.webPost.url ? ` · <a href="${esc(s.webPost.url)}" target="_blank" rel="noopener">${esc(s.webPost.url)}</a>` : ''} · ${esc(AC.BLOG_API_STATUS[s.webPost.status] || s.webPost.status)}.` : api.on ? esc(gate.ok ? 'Sẵn sàng gửi lên web.' : gate.reason) : 'Gửi lên web: bật ở Thiết lập → Chuẩn Blog khi web có API. Trong lúc chờ, dùng Sao chép HTML hoặc Tải gói bài.'}</p>
  </section>`;
}
// Thanh công cụ thêm khi sửa bài Blog: chèn ảnh/video tại con trỏ, gắn link cho chữ đang chọn
function blogEditTools() { return '<span class="mdsep"></span><button type="button" class="mdb" data-act="b-ins-cursor" title="Chèn ảnh hoặc video tại dòng đang đứng">🖼 Ảnh/video</button><button type="button" class="mdb" data-act="b-link-sel" title="Gắn link cho chữ đang chọn">🔗 Link</button>'; }
ACTIONS['b-ins-cursor'] = async () => {
  const ta = mdTa('pv-edit'); if (!ta) return; const s = AC.byId(S.slots, ta.dataset.slot); if (!s) return;
  const pos = ta.selectionEnd; const res = await askBlogMedia(); if (!res) return;
  const r = AC.addBlogMedia(S, s.id, res.kind, res.alt); if (!r.ok) return toast(r.error, 'bad');
  afterBlogInsert(s, r); save();
  const v = ta.value; let e = v.indexOf('\n', pos); if (e < 0) e = v.length;
  mdReplace(ta, e, e, `\n\n${r.line}\n`);
  if (pvRefresh) pvRefresh(s.id);
  toast('Đã chèn ảnh vào bài. Chỉnh ảnh (Gen, Up, Store, Edit, Mô tả) ngay tại vị trí vừa chèn; Lưu bản sửa để giữ.');
};
ACTIONS['b-link-sel'] = async () => {
  const ta = mdTa('pv-edit'); if (!ta) return; const a = ta.selectionStart, z = ta.selectionEnd; const sel = ta.value.slice(a, z);
  if (!sel.trim() || /\n/.test(sel)) return toast('Chọn (bôi đen) cụm chữ trong một dòng để gắn link.', 'bad');
  const res = await confirmBox({ title: 'Gắn link', ok: 'Gắn link', body: `<p>Chữ neo: <b>${esc(sel)}</b></p>`, extra: '<div class="field"><label for="lk-url">Link</label><input id="lk-url" data-collect="url" placeholder="https://… hoặc /blog/bai-khac" spellcheck="false"></div>' });
  if (!res) return;
  const u = String(res.url || '').trim(); if (!AC.isValidUrl(u) && !/^\/\S*$/.test(u)) return toast('Link phải bắt đầu bằng http://, https:// hoặc /.', 'bad');
  if (['bấm vào đây', 'tại đây', 'xem thêm', 'click', 'link', 'đây'].includes(sel.trim().toLowerCase())) toast('Chữ neo nên nói rõ trang đích, không dùng "bấm vào đây".', 'bad');
  mdReplace(ta, a, z, `[${sel}](${u})`);
};
