# Kế hoạch ráp popup Vid bản 4 vào app (bản 106)

Mục tiêu: popup thẻ Vid trong app chạy giống `popup-vid-mau.html` bản 4. Logic và giao diện khớp mã chính. Các phần chưa có dịch vụ thật vẫn mô phỏng như hiện nay.

## 1. Header và phiên bản kịch bản
- Header chia hai phía:
  - Bên trái: 3 tab Kịch bản · Biên tập · Xếp Slot.
  - Bên phải: nút ‹ Bản n/N › và nút **Tạo Kịch bản**. Nút này thay nút "Tạo lại" / "Viết kịch bản" hiện có.
- Một phiên bản lưu đủ kịch bản, Insight và toàn bộ phần biên tập (cảnh, hình, VO, cue, caption). App giữ 5 bản gần nhất.
  - Mã: mở rộng `v.history` (hiện đã giữ 5 kịch bản cũ) thành `v.versions`. Dữ liệu cũ tự chuyển sang khi nạp.
- Bản cũ chỉ xem được, có nút "Dùng bản này". Bấm nút này thì bản cũ được chép thành bản mới nhất.
- Tạo Kịch bản tạo bản mới chưa có cảnh. Bản đang có lùi vào danh sách bản cũ.
- Bỏ nút **Duyệt kịch bản**. Kịch bản tự tính là đã duyệt khi bấm Chia cảnh, hoặc khi sang tab Biên tập. Trạng thái APPROVED vẫn giữ để KPI không đổi.
- Thẻ đang ở bước Insight (IDEA) vẫn có nút Duyệt Insight như cũ.

## 2. Tab Kịch bản
- Menu phụ chỉ còn Insight và Phân cảnh. Thẻ Vid tự do vẫn có thêm mục Nguồn vào.
- **Insight:** ô Ý chính và ô Lý do cao 2 hàng chữ, kéo góc để xem thêm.
- **Phân cảnh:**
  - Bảng gồm STT, Timeline, Nội dung, Mô tả hình ảnh, nút Gen ảnh.
  - Script nằm dưới bảng, thu gọn như Đoạn căn cứ.
  - Nếu sửa Script sau khi đã chia cảnh, popup báo và có nút "Chia lại cảnh".
- Bỏ ô Prompt Audio và Prompt Hình ảnh khỏi giao diện.
  - Dữ liệu vẫn giữ, vì kiểu Bản tin cần lời "[Giọng máy]" và lệnh dựng cũng đọc dữ liệu này.
  - Nút Tải kịch bản chuyển vào phần Script.

## 3. Tab Biên tập
- **Thẻ cảnh:**
  - Cột trái: ảnh chính, các ảnh nhỏ (mỗi ảnh ghi số giây và có ✕), rồi nút + Up và nút **Gen ảnh**.
  - Bên phải: Nội dung, VO cảnh trên một hàng, dòng Cue, rồi lấp đầy / vừa khung và âm lượng clip.
  - Bỏ ô Mô tả hình và ô Chữ phủ khỏi thẻ cảnh.
  - Bỏ dòng chữ "Làm theo từng cảnh".
- **Gen ảnh mở khung riêng:**
  - Ô mô tả lấy sẵn từ Phân cảnh. Chọn phong cách, tạo 4 ảnh, chọn một hoặc nhiều ảnh để thêm vào cảnh.
  - Đã bật AI ảnh ở Setup thì gọi API ảnh hiện có (`imageApiCall`). Chưa bật thì dùng ảnh mô phỏng.
- **Mỗi ảnh có độ dài riêng:**
  - Cảnh dài bằng tổng độ dài các ảnh. Mỗi ảnh ít nhất 1 giây, và cảnh không ngắn hơn VO.
  - Kéo mép cảnh thì các ảnh co giãn theo tỉ lệ. Kéo vạch giữa hai ảnh thì chỉnh riêng từng ảnh.
  - Có VO toàn bài thì tổng thời lượng cố định, kéo chỉ dời ranh giới.
  - Thêm VO cảnh thì cảnh dài đúng bằng VO.
- **Lớp phủ cũ (`overlay`):** khi nạp dữ liệu, chữ phủ cũ chuyển thành cue Text ở từ đầu tiên của cảnh, nên không mất.
  - Các mẫu dựng thôi tạo chữ phủ.

## 4. Cue
- **Dữ liệu:** `ed.cues = [{ id, sc, wi, w, dt, icon, text, sfx, lost }]`. Mỗi cue bám vào từ thứ `wi` trong lời của cảnh.
- **Giây của từng từ:** tính theo VO, tạm ước theo tỉ lệ số chữ (mô phỏng).
  - Có mốc từng từ thật từ dịch vụ giọng nói hoặc Whisper thì thay vào đúng một hàm.
  - Khi sửa lời cảnh, cue tự tìm lại từ cũ. Từ bị xóa thì cue báo đỏ để đặt lại.
- **Giao diện:** dòng Cue trong thẻ cảnh, hàng Cue trên timeline (đặt trên hàng hình), dấu ✕ để xóa, rê chuột để xem tóm tắt, bấm để mở popup.
  - Popup Cue chia 3 phần Icon / Text / SFX, kèm nhích ±0,1 giây.
- **Khung xem thử:** icon và chữ hiện đúng giây, kéo được vị trí và cỡ. SFX phát đúng lúc.
- **Kho:** 40 icon và 35 SFX tổng hợp bằng âm thanh trình duyệt (mô phỏng).
  - Yêu thích và Gần đây lưu trong dữ liệu chung (`S.vidLib`) nên dùng chung cho mọi video, và đi theo tệp sao lưu.
- **Lệnh dựng (JSON):** thêm cue (giây, icon, chữ, vị trí, cỡ, hiệu ứng, SFX) và giờ bắt đầu, kết thúc của từng ảnh. `VID_POPUP_VER` tăng lên 4.

## 5. Mã và kiểm thử
- **Logic:**
  - `05t-videdit.js`: độ dài từng ảnh, `migrateEdit` lên v3.
  - `05u-vidpop.js`: co giãn theo ảnh, cue, căn từ, phiên bản, kho Yêu thích.
  - `05s-shortvid.js`: Tạo Kịch bản thành bản mới, tự duyệt khi chia cảnh.
- **Giao diện:**
  - `09-shortvid.js`: header, Insight, bảng Phân cảnh.
  - `09c-videdit.js`: thẻ cảnh, timeline, cue, popup Cue, Gen ảnh.
  - `style.css`.
- **Test:**
  - Thêm test logic: co giãn ảnh, VO, cue bám từ, cue mất từ, phiên bản tối đa 5, chuyển dữ liệu cũ.
  - Sửa khối test giao diện 10.76 và thêm khối 10.77 theo thao tác mới.
- **Tài liệu:** cập nhật HANDOFF và đặc tả (mục 10.77, quyết định D163 trở đi). BUILD lên 106, rồi đẩy Git.

## Chưa làm trong đợt này
- Mốc từng từ thật (TTS có timestamp hoặc Whisper).
- File SFX thật.
- Xuất file video (dựng trong trình duyệt bằng WebCodecs, hoặc Cloudflare Containers).
