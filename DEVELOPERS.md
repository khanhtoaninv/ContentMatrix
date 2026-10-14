# AutoContent Content Matrix — hướng dẫn cho lập trình viên

Ứng dụng chạy hoàn toàn trong trình duyệt. Mã nguồn ở `src/` (ES module), đóng gói bằng Vite thành **một tệp tự chứa** `dist/index.html` (CSS, JS nhúng sẵn), mở thẳng bằng file:// hoặc đăng làm artifact. `dist/index.html` được commit để người dùng chỉ cần `git pull` rồi mở (`chay.bat`), không cần Node.

## Cài đặt và lệnh
Cần Node ≥ 20.19 (khuyên 22). Kiểm thử giao diện cần thêm Python 3 và `pip install playwright`.

```bash
npm install          # một lần
npm run dev          # máy chủ phát triển, sửa src/ là trình duyệt tải lại
npm run build        # tạo dist/index.html
npm run test:logic   # 113 kiểm thử logic (node --test, nhập thẳng từ src/logic)
npm run test:ui      # 381 kịch bản giao diện (Playwright, chạy trên dist/index.html)
npm test             # build + cả hai bộ kiểm thử
```
Nếu Chromium của Playwright không khớp máy: đặt `PW_CHROMIUM=/đường/dẫn/chromium` trước `npm run test:ui`.

## Cách mã được ghép
- `src/main.js` là điểm vào: nạp `logic/99-export.js` (tạo đối tượng `AC`, gán cả `window.AC`), rồi lần lượt các tệp `ui/`; `ui/99-boot.js` chạy sau cùng.
- `scripts/build.mjs` gọi Vite đóng gói `src/main.js` thành một bó IIFE, rồi ghép `ui/head.html` (chèn `ui/style.css` vào chỗ `/*CSS*/`) + `ui/body.html` + `<script>` thành `dist/index.html`. Tệp này không có `<!doctype>`/`<html>` vì artifact tự bọc khung trang; giữ đúng như bản trước khi chuẩn hóa.
- `vite.config.js` + `index.html` (gốc) chỉ dùng cho `npm run dev`.
- Mỗi tệp khai báo rõ `import`/`export`. Tên tệp giữ tiền tố số để dễ tìm theo đặc tả (mục 10.x trong `spec/`).

## Quy ước
- **Logic** (`src/logic`): hàm thuần nhận trạng thái `S` làm tham số, không chạm DOM. Giao diện chỉ gọi logic qua `AC.tênHàm` (xem danh sách xuất ở `99-export.js`). Thêm hàm mới mà giao diện cần thì nhớ thêm vào `AC`.
- **Giao diện** (`src/ui`): dựng chuỗi HTML, gắn thao tác bằng thuộc tính `data-act` / `data-change` / `data-input`; hàm xử lý đăng ký vào `ACTIONS` / `CHANGES` / `INPUTS` (ở `00-state.js`), `99-boot.js` bắt sự kiện và gọi. Màn hình đăng ký vào `RENDERERS`.
- Trạng thái: `S` (dữ liệu, lưu localStorage khóa `autocontent.state`, ảnh lớn ở IndexedDB) và `view` (trạng thái giao diện, không lưu) ở `00-state.js`. Module khác đọc `S` trực tiếp; thay cả đối tượng thì dùng `setS(...)`. Tương tự `setMediaOk`, `setMdSegLast`.
- Đổi cấu trúc dữ liệu thì tăng `DATA_VERSION` và viết chuyển đổi trong `migrateState` (05e).

## Sơ đồ module
| Tệp | Nội dung |
|---|---|
| `logic/01-util.js` | 01 · Tiện ích thuần |
| `logic/02-parse.js` | 02 · Mẫu Markdown và bộ đọc |
| `logic/03-rules.js` | 03 · Quy tắc cứng (ứng dụng tính, chỉ cảnh báo — D77) |
| `logic/04-mock.js` | 04 · AI mô phỏng (xác định) |
| `logic/05-model.js` | 05 · Mô hình dữ liệu và thao tác (v2.8) |
| `logic/05b-cells.js` | 05b · R2′: Viết ma trận, thao tác ô, sửa Topic (MTX-01..08, TPC-08) |
| `logic/05c-slots.js` | 05c · R3′: Chia bài, thao tác slot (DST-01..07, CAL-13..15) |
| `logic/05d-demo.js` | 05d · Nút demo từng bước (để trải nghiệm từng phần; chạy tức thì, dữ liệu mô phỏng) |
| `logic/05e-publish.js` | 05e · R4: Xác nhận lịch, đăng bài, số liệu, đồng hồ demo (mục 10.22) |
| `logic/05f-export.js` | 05f · R4: Gói xuất ZIP của tuần đã chốt (mục 5.9, 10.22) |
| `logic/05g-format.js` | 05g · Khung trình bày bài của ô, lệnh cho AI, quy tắc Trình bày (mục 10.28) |
| `logic/05h-topicframe.js` | Khung Topic (mục 10.30): mục chuẩn, tên gọi khác, kiểu hiển thị; chuẩn hoá tệp Topic khi nạp |
| `logic/05i-frames.js` | Frame ảnh của công ty và Image to Image (mục 10.33) |
| `logic/05j-textlayer.js` | Thêm chữ lên ảnh (mục 10.34) |
| `logic/05k-assist.js` | Trợ lý viết: sửa đoạn bằng AI, phương án hook/caption, thư viện hashtag & CTA (mục 10.35) |
| `logic/05l-design.js` | Cắt, xoay, đổi tỉ lệ ảnh và Mẫu thiết kế (mục 10.36) — chạy thật trong trình duyệt |
| `logic/05m-studio.js` | Kho tài sản, soạn carousel theo slide, chuyển bài sang kênh khác (mục 10.37) |
| `logic/05n-media.js` | Ảnh AI thật qua API, ảnh bìa và phụ đề video (mục 10.38) |
| `logic/05o-aitext.js` | Viết bài bằng AI thật (mục 10.39) |
| `logic/05p-blogseo.js` | Blog chuẩn SEO (mục 10.40): chuẩn chung, thông tin SEO của slot, rà soát, chèn ảnh/video, liên kết, gói xuất, kho bài, đăng qua API |
| `logic/05q-imgspec.js` | Chuẩn ảnh theo nền tảng (mục 10.42) |
| `logic/05r-skill.js` | 05r · Skill (bộ chỉ dẫn) gắn riêng cho từng Cột và từng Format (mục 10.49) |
| `logic/06-seed-topics.js` | 06a · Tệp Topic demo (mô phỏng, như agent bên ngoài chuẩn bị; mọi số liệu là số kiểm thử) |
| `logic/06-seed.js` | 06 · Dữ liệu demo v2.8 — Nói Được English (mọi số liệu là số kiểm thử, mô phỏng) |
| `logic/99-export.js` | 99 · Xuất API |
| `ui/00-state.js` | UI · Trạng thái dùng chung: dữ liệu, giao diện, bảng xử lý thao tác |
| `ui/01-core.js` | UI · Lõi: lưu trữ, tiện ích hiển thị, hộp thoại |
| `ui/01b-mediastore.js` | Ảnh, video cất trong IndexedDB (mục 10.39) |
| `ui/02-shell.js` | UI · Khung: menu, thanh trên, thanh tiến độ, điều hướng |
| `ui/03-today.js` | UI · Dashboard: tiêu đề tuần + chỉ số "Đăng đủ, đúng bài" (gộp từ màn Hôm nay cũ) |
| `ui/04-week.js` | UI · Tuần: lịch tuần, lịch tháng, slot, Cột của tuần |
| `ui/04b-preview.js` | UI · Xem như khi đăng: mô phỏng giao diện bài trên từng kênh (chỉ để hình dung) |
| `ui/04c-layout.js` | UI · Sơ đồ layout của Format (mục 10.13): khung dây giúp hình dung bài trước khi tạo |
| `ui/04d-publish.js` | UI · R4: Xác nhận lịch, đăng bài, số liệu, đồng hồ demo (mục 10.22) |
| `ui/04e-frame.js` | UI · Ghép frame và Image to Image (mục 10.33) |
| `ui/04f-text.js` | UI · Thêm chữ lên ảnh (mục 10.34) |
| `ui/04g-assist.js` | UI · Trợ lý viết (mục 10.35) |
| `ui/04h-design.js` | UI · Cắt, xoay, đổi tỉ lệ ảnh và Mẫu thiết kế (mục 10.36) — chạy thật bằng canvas |
| `ui/04i-studio.js` | UI · Kho tài sản, soạn carousel, chuyển bài sang kênh (mục 10.37) |
| `ui/04j-media.js` | Ảnh AI thật qua API, ảnh bìa và phụ đề video (mục 10.38) |
| `ui/04k-aitext.js` | Viết bài bằng AI thật (mục 10.39) |
| `ui/04l-blog.js` | UI · Blog chuẩn SEO (mục 10.40): Thiết lập → Chuẩn Blog, Thông tin SEO của slot, thân bài có ảnh/video, gắn link, rà soát, gói xuất, gửi lên web |
| `ui/04m-imgtools.js` | Thanh công cụ ảnh gọn: < > Gen Up Store Edit (mục 10.41) |
| `ui/05-matrix.js` | UI · Matrix: Topic (hàng) × Cột (cột) · ô |
| `ui/06-export.js` | UI · Xuất (SCR-11) — R4: gói ZIP của tuần đã chốt |
| `ui/07-setup.js` | UI · Thiết lập (SCR-12..19) |
| `ui/07b-skill.js` | UI · Skill (bộ chỉ dẫn) của Cột và Format (mục 10.49) |
| `ui/08-report.js` | UI · Report kênh: Overview, Tuần, Tháng (mục 10.22; số liệu mô phỏng) |
| `ui/99-boot.js` | UI · Khởi động |
| `ui/style.css`, `ui/head.html`, `ui/body.html` | Giao diện tĩnh: CSS, phần đầu trang, khung trang |

Tài liệu nghiệp vụ: `spec/AutoContent_Spec_v2_8_ContentMatrix_MVP.md`. Lịch sử từng đợt và quy tắc làm việc với người dùng: `HANDOFF.md`.
