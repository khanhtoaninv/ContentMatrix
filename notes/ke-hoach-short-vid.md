# Kế hoạch thực hiện mục Short Vid (16/10/2026; Đợt 1 đã làm ở bản 101, mục 10.72; Vid tự do, Bàn dựng mô phỏng, b-roll và Đưa vào lịch đã làm ở bản 104, mục 10.75)

Nguồn: thảo luận trong thread "Mở thread mới để thảo luận ý tưởng" (15–16/10/2026). Format và căn cứ chi tiết: `notes/short-vid-format-va-cong-cu.md`. Chưa có mã. Bản hiện tại là 100; Short Vid bắt đầu từ bản 101, quyết định mới đánh số từ D152, ghi chú dựng từ mục 10.72.

## 0. Đã chốt

- Menu: Dashboard · Matrix · **Short Vid** · Report · Export · Setup.
- Mục tiêu kênh: thương hiệu. Tuần 7 video (tối thiểu 3–4), một video đăng mọi nền tảng (TikTok, Reels Instagram, Reels Facebook, YouTube Shorts).
- Kịch bản 140–200 chữ (mặc định ≈ 150 chữ ≈ 60 giây), sửa tay được. Mỗi video tự đứng được, một ý.
- Hai kiểu: **Bản tin** (người dẫn mở đầu, phần sau giọng máy; tin kiến thức, không chỉ thời sự) và **Người nói hết**. Mặc định 3/4, chỉnh được.
- **7 Format Short Vid** ở Setup (thêm, bớt được), mỗi Format gắn Skill như Cột/Format hiện có: Giải thích nhanh, Mẹo một kỹ năng, Ngộ nhận và sự thật, Thử thách nhanh, Câu chuyện học viên, Bản tin kiến thức, Trả lời câu hỏi người xem.
- Một kho Topic dùng chung với Matrix; nạp thêm chủ đề chỉ cho video khi cần.
- AI đọc Topic, đề xuất số video kèm lý do; mỗi video một Insight khác nhau có căn cứ trong Topic; người dùng duyệt, bỏ, gộp. Kiểm trùng Insight và câu mở.
- Kịch bản gồm Insight · Script · Prompt (Audio cho đoạn máy nói, Hình ảnh liên quan).
- Hủy / Khôi phục từng kịch bản; kịch bản hủy không cần nộp video, không tính KPI.
- Ô Video dưới kịch bản; công cụ trong app càng nhiều càng tốt (cắt từng đoạn, crop, gợi ý cắt đoạn thừa, frame, caption có kiểu chữ, nhạc nền, sau này ghép B-roll, SFX, giọng đọc).
- Slot video chỉ lấy từ Short Vid; Chia bài bỏ qua slot video; caption từng kênh viết từ Script; dựng lại tuần mẫu; nút Đưa vào lịch.
- Bản HTML là MVP; đích là web app hoặc PC app. Vì vậy mọi chỉnh sửa video lưu thành **danh sách lệnh dựng**; **xuất video là chỗ thay được** (trình duyệt ở MVP, ffmpeg trên máy ở PC app, máy chủ ở web app).

Mặc định Claude chọn khi chưa có ý người dùng (sửa được): Bản tin = người dẫn 15–25 chữ + phần tin giọng máy đọc Prompt Audio + chốt 1 câu.

## Đợt 1 – Short Vid lõi (kịch bản), dự kiến bản 101–103

**1.1 Dữ liệu và Setup**
- `S.vidFormats[]`: 7 Format mặc định (tên, kiểu mặc định, bố cục đoạn, 140–200 chữ, hướng dẫn, tiêu chí chấm, `skills`/`activeSkillId` dùng lại `05r-skill.js`). Setup thêm tab **Short Vid**: danh sách Format (thêm, sửa, bật/tắt, Skill), tỉ lệ Bản tin/Người nói, độ dài chữ, tốc độ nói (mặc định 2,5 chữ/giây).
- **Khuôn video thương hiệu** (cùng tab): câu mở cố định hoặc dấu hiệu nhận diện 2 giây đầu, câu chốt/CTA chung, ghi chú hình ảnh. AI viết theo khuôn này.
- `S.videos[]`: id, weekId, topicId, nguồn (đoạn trích Topic), insight {tiêu đề, ý, lý do}, formatId, kind, script (đoạn có nhãn), prompts {audio, image}, status, cancelled + trạng thái trước hủy, ô video (dùng lại cấu trúc phiên bản tệp, bìa, phụ đề), slotIds. `migrateState` thêm mảng rỗng cho dữ liệu cũ.
- Topic: thêm cờ "chỉ cho video" để nạp chủ đề riêng mà không tạo ô trong Matrix.

**1.2 Màn Short Vid**
- Menu mới; chọn tuần như Matrix; cột trái danh sách Topic của tuần (cùng kho), nút Nạp chủ đề cho video.
- **Phân tích Topic**: AI (hoặc mô phỏng khi chưa bật AI) trả JSON danh sách Insight {tiêu đề, ý, đoạn căn cứ, Format, kiểu, lý do} + lý do tổng N video. Hiện dạng danh sách để Tích bỏ, Gộp hai Insight, Sửa, Đổi Format/kiểu, rồi **Duyệt danh sách**.
- **Viết kịch bản**: mỗi Insight thành thẻ; AI viết theo Format + Skill + Khuôn thương hiệu + kiểu; không thêm số liệu ngoài Topic. Thẻ hiện số chữ, thời lượng ước tính, cảnh báo ngoài 140–200 chữ. Sửa (trình soạn hiện có), Tạo lại, Duyệt kịch bản.
- **Kiểm trùng trong tuần**: cảnh báo khi hai thẻ cùng đoạn căn cứ hoặc câu mở/câu chốt giống nhau (dùng lại cách kiểm lặp ≥ 40 ký tự đang có).
- **Hủy / Khôi phục** trên mỗi thẻ (mờ đi, giữ nội dung).

**1.3 Ô Video và KPI**
- Ô Video dưới thẻ: Up, Bìa, Phụ đề (dùng lại công cụ hiện có). Có tệp → trạng thái Sẵn sàng.
- Trạng thái: Đề xuất → Kịch bản → Đã duyệt kịch bản → Sẵn sàng → (Đợt 2: Đã lên lịch → Đã đăng); Đã hủy đứng riêng.
- KPI "Video tuần: x/y có thành phẩm" (y = thẻ không hủy) ở đầu màn Short Vid và trên Dashboard.

**Test và nghiệm thu Đợt 1:** test logic cho tạo/duyệt/gộp Insight, viết kịch bản (mô phỏng), đếm chữ và thời lượng, kiểm trùng, Hủy/Khôi phục, KPI, migrate dữ liệu cũ; test giao diện cho menu, tab Setup, luồng một Topic ra N thẻ, Up video. Nghiệm thu: từ một Topic demo ra danh sách Insight có lý do, duyệt, viết đủ kịch bản 140–200 chữ, hủy một thẻ thì KPI giảm mẫu số.

## Đợt 2 – Nối lịch, dự kiến bản 104–105

- Format slot mới layout `shortvid` cho 4 kênh (TikTok, Reels Instagram, Reels Facebook, YouTube Shorts), không gắn Cột; quy tắc caption, hashtag theo kênh.
- Slot có `videoId`: View hiện video + Script (chỉ xem) + caption, hashtag sửa được. Caption viết từ Script (AI hoặc mô phỏng), không từ ô.
- **Chia bài bỏ qua slot `shortvid`**. Format video cũ (Mẹo nhanh, Shorts hướng dẫn, Reels mẹo ngắn, Reels kể chuyện, Bạn có biết) không dùng cho tuần mới; slot cũ đã có bài giữ nguyên.
- **Đưa vào lịch**: chọn nhiều video Sẵn sàng → xếp vào slot `shortvid` còn trống trong tuần (mỗi video mọi kênh cùng ngày, mặc định), viết caption từng kênh; chọn video từ kho ngay trong Cấu hình slot.
- Tuần mẫu: thêm "Video ngắn hằng ngày" (7 ngày × 4 kênh, giờ mặc định chỉnh được); sửa các tuần mẫu hiện có thay slot video cũ.
- Report: gộp số liệu theo video (cộng các kênh); Export ZIP thêm `videos/*.md` (Insight, Script, Prompt, nguồn).

## Đợt 3 – Bàn dựng và bản thử xuất video, dự kiến bản 106–108

- **Lệnh dựng** lưu trong thẻ Video, không sửa tệp gốc: cắt nhiều đoạn, crop khung 9:16, xem trước bỏ qua đoạn cắt.
- **Đọc nội dung video**: tách âm thanh trong trình duyệt → API nhận giọng nói (chữ có thời gian) → so với Script.
- **Gợi ý cắt**: khoảng lặng (đo âm lượng tại chỗ) + AI chỉ ra đoạn nói vấp, nói lại, câu thừa so với Script; người dùng tích chọn rồi áp.
- **Caption**: kiểu chữ (font, cỡ, màu, viền, nền, vị trí), số chữ mỗi dòng, ngắt theo cụm, nhấn từ khoá; hai chế độ Phụ đề đầy đủ / Chữ nhấn ý.
- **Frame** (dùng lại Frame ảnh, chừa vùng an toàn của nền tảng), **nhạc nền** từ Kho âm thanh (có trường nguồn/giấy phép, tự hạ nhạc khi có giọng).
- **Bản thử xuất video** trên PC người dùng với một video thật 60 giây: đo thời gian, dung lượng, chất lượng của cách mã hoá trong trình duyệt; định nghĩa giao diện "bộ xuất" để PC app/web app thay. Nâng giới hạn lưu video hoặc chỉ lưu bản xem nhẹ + đường dẫn tệp gốc theo kết quả bản thử.

## Đợt 4 – Dựng tự động (sau khi có kết quả bản thử)

- B-roll trong Store: tải video, AI xem khung hình để mô tả, gắn thẻ, đánh dấu đoạn dùng được.
- Script chia cảnh → AI đề xuất clip B-roll cho từng cảnh → người dùng duyệt.
- Giọng đọc từ Script (API chuyển chữ thành giọng, nghe thử tiếng Việt) hoặc tự thu; SFX từ Kho âm thanh; nhạc nền.
- Xem trước toàn bộ theo dòng thời gian; xuất bằng bộ xuất (trình duyệt cho video đơn giản) hoặc xuất tệp dự án (FCPXML/OpenTimelineIO, cần kiểm khả năng nhập của DaVinci Resolve).

## Phần mô phỏng ở MVP (ghi vào đặc tả mục 0.6 khi dựng)

Phân tích Topic, viết kịch bản, caption: mô phỏng khi chưa bật AI viết bài. Nhận giọng nói, đọc khung hình, giọng đọc: chỉ chạy khi có khoá API. Xuất video: trình duyệt ở MVP, thay bằng ffmpeg (PC app) hoặc máy chủ (web app).

## Rủi ro

- Bản tin kiến thức ít căn cứ nhất; đo riêng sau vài tuần.
- Giới hạn lưu video 25 MB trong trình duyệt; video 60 giây 1080p ước tính khoảng 60 MB.
- Nhạc nền: bản quyền (TikTok doanh nghiệp chỉ dùng thư viện nhạc thương mại); app không cung cấp nhạc.
- Nhận giọng nói có thể bỏ tiếng đệm "ừm, à" nên gợi ý cắt kém hơn mong đợi; phải thử với tiếng Việt.
- Phạm vi lớn: duyệt và làm từng đợt, không gộp.
