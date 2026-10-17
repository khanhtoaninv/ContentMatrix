# Kế hoạch: Vid tự do "thả vào là dựng" (bản 3, chờ duyệt, 16/10/2026)

Mục tiêu: người dùng tốn ít công nhất và ra bài nhanh nhất. Họ chỉ làm 3 việc: **Thả nguyên liệu → Dựng cho tôi → Duyệt nhanh**.

## 0. Các điểm người dùng đã chốt (16/10/2026)
- **Video ra tối đa 5 phút**, tập trung vào video 1–2 phút.
- **Thông số Độ dài, mặc định 90 giây**: ô mới "Độ dài video" ở Setup → Short Vid (15–300 giây); từng thẻ chỉnh nhanh ở Ô nạp (30 / 60 / 90 / 120 / 180 giây hoặc tự gõ, tối đa 300). Độ dài là thông số để viết content và kịch bản: số chữ = độ dài × 2,5 chữ/giây (90 giây ≈ 225 chữ, lệch ±15%), số cảnh ≈ 1 cảnh mỗi 6–8 giây, hook trong 3 giây đầu.
- **Nguồn nạp vào được dài tới 60 phút** để cắt thành nhiều short (mục 6).
- Bỏ quay / ghi âm / ghi màn hình trong app và video hướng dẫn phần mềm. Giữ bảng số liệu và ảnh chụp bình luận.
- Link video (TikTok, Reels, YouTube) chỉ dùng làm mẫu; muốn dùng hình phải thả file.
- **Cần chốt thêm:** đổi mặc định sang 90 giây thì Vid từ Topic cũng đổi theo (hiện nhắm 150 chữ ≈ 60 giây). Kế hoạch tạm để **áp chung**.

## 1. Kiến trúc chung
Mọi nguồn được một **bộ đọc** chuyển thành 3 loại **nguyên liệu chuẩn**: **Chữ** (ý tưởng, kịch bản, bài viết, lời đã chép), **Giọng** (âm thanh có lời) và **Đoạn hình** (ảnh hoặc đoạn video từ giây đến giây, kèm mô tả). **Khuôn** (mặc định theo kênh, hoặc khuôn của tôi) quyết định độ dài, nhịp, số cảnh, caption và frame. **Bộ dựng** (Dựng tự động bản 112) ráp nguyên liệu vào khuôn. Cần nguồn mới thì chỉ thêm một bộ đọc.

Ưu tiên khi trộn: giọng có sẵn > kịch bản có sẵn > chữ nguồn > ý tưởng. Hình: người dùng nạp > kho asset của app > AI gen > Cần quay.

## 2. Các tình huống

| # | Tình huống | Đường dựng | Đợt |
|---|---|---|---|
| 1 | Chỉ có ý tưởng (1 dòng) | AI viết kịch bản đúng Độ dài; hình lấy từ kho asset, AI gen, hoặc Cần quay | A |
| 2 | Có sẵn chữ: kịch bản, ô Matrix, link bài viết, link sản phẩm | Chia cảnh; link thì Claude đọc trang rồi rút kịch bản | A (link ở C) |
| 3 | Có sẵn giọng: file giọng đọc, clip quay người nói | Chép lời, chia cảnh theo lời; clip nói cắt khoảng lặng thật, chèn b-roll | A |
| 4 | Có sẵn hình: b-roll, ảnh, slide | Mô tả hình, viết lời dẫn | A |
| 5 | Quay sau | Kịch bản + Danh sách cần quay; thả clip quay xong, app ghép đúng cảnh | A |
| 6 | Video dài tới 60 phút (podcast, livestream, webinar) | Lấy lời (file phụ đề hoặc chép lời theo khúc), AI chấm điểm, đề xuất 3–10 short đúng Độ dài, tích chọn rồi làm cả lô | B |
| 7 | Trộn nguồn | Giọng chính từ nguồn giọng, ảnh lấp các cảnh còn lại | A |
| 8 | Một nguồn ra nhiều kênh | Một thẻ giữ nhiều tỉ lệ 9:16, 1:1, 16:9; mỗi tỉ lệ vào slot của kênh tương ứng | B |
| 9 | Làm lại và làm theo khuôn | Làm lại video cũ (đổi hook, cắt ngắn, dịch); video mẫu → khuôn; khuôn của tôi cho series | C |
| 10 | Bảng số liệu | Mỗi cảnh một biểu đồ hoặc con số lớn, AI viết lời dẫn | C |
| 11 | Ảnh chụp bình luận | Cảnh 1 là bình luận nổi lên, các cảnh sau trả lời | C |

## 3. Kế hoạch từng đợt
Mỗi đợt: đọc lại HANDOFF → viết mã → build + test → cập nhật HANDOFF và đặc tả → đẩy Git → báo `git pull`. Trước mỗi đợt mình nhắc lại phạm vi một lần để bạn xác nhận.

### Đợt A: Ô nạp, Dựng cho tôi, Duyệt nhanh
**Kết quả bạn thấy:** bấm "Tạo Vid tự do" ra Ô nạp mới. Thả vào ý tưởng, kịch bản, giọng, clip hay ảnh (một hoặc trộn nhiều thứ), bấm Dựng cho tôi, sau vài giây có thẻ Vid đã chia cảnh, có hình, caption, nhạc. Màn Duyệt nhanh cho đổi từng cảnh rồi Duyệt.

Việc làm:
1. **Thông số Độ dài**: ô ở Setup → Short Vid (mặc định 90 giây) và ô chọn nhanh ở Ô nạp; nối vào lời nhắc AI (số chữ, số cảnh) và vào kịch bản mô phỏng; Duyệt nhanh báo lời dài / ngắn quá ngưỡng.
2. **Ô nạp** (thay hộp 6 nút radio ở `09b-vidfree.js`): vùng thả file, ô dán chữ, chọn ô Matrix; mỗi nguồn thành chip có nhãn tự đoán và sửa được; ô Yêu cầu thêm, Kênh, Độ dài, Khuôn.
3. **Tự nhận diện**: ảnh → Đoạn hình; audio → Giọng; video có tiếng nói nhiều → Clip người nói, ít tiếng → B-roll; chữ có nhãn cảnh hoặc dài → Kịch bản, ngắn 1–2 câu → Ý tưởng.
4. **Bộ đọc cho 5 nguồn**: ý tưởng, kịch bản / ô Matrix, giọng / clip nói, b-roll / ảnh, và trộn. 6 cách nạp cũ quy về đây; thẻ cũ vẫn mở bình thường.
5. **Dựng cho tôi**: viết kịch bản (hoặc chia cảnh từ chữ / lời có sẵn), chạy Dựng tự động để điền hình, áp caption, nhạc, frame theo kênh. Clip người nói: cắt khoảng lặng thật trên timeline (hiện chỉ đánh dấu).
6. **Quay sau**: cảnh không có hình thành "Cần quay"; nút Danh sách cần quay (mỗi cảnh: góc máy, thời lượng, lời nói; chép hoặc tải về); thả clip quay xong vào thẻ thì app ghép theo thứ tự cảnh, có STT thì ghép theo lời.
7. **Duyệt nhanh**: lưới cảnh (hình + lời), Đổi hình (mở Gợi ý hình), Sửa lời, Bỏ cảnh; nút Duyệt và Sửa sâu (mở popup 3 tab hiện có).

Dữ liệu thêm: `v.inputs[]` (nguồn đã thả và nhãn), `v.lenSec` (độ dài riêng của thẻ), `sc.needShoot` và `v.shotList[]`; `S.vidSettings.lenSec`.
Test: logic cho nhận diện, số chữ theo độ dài, ghép clip vào cảnh Cần quay, cắt khoảng lặng; UI cho Ô nạp, chip, Dựng cho tôi, Duyệt nhanh, Danh sách cần quay.
Rủi ro: nhận diện clip người nói và b-roll dựa trên đo âm lượng nên có lúc đoán sai, vì vậy chip luôn sửa được.

### Đợt B: Video dài ra nhiều short, nhiều kênh, làm theo lô
**Kết quả bạn thấy:** thả một podcast 40 phút (kèm file phụ đề nếu có), app đề xuất 3–10 đoạn hay, mỗi đoạn có điểm, lý do và hook gợi ý. Tích chọn rồi bấm Làm cả lô, mỗi đoạn thành một thẻ; Duyệt cả lô rồi app tự xếp vào slot trống của tuần. Một thẻ có thể bật thêm 1:1 hoặc 16:9 cho kênh khác.

Việc làm:
1. **Nguồn dài tới 60 phút**: không chép file vào trình duyệt mà giữ liên kết tới file trên máy (chọn lại file khi mở ở máy khác); chỉ lưu khung hình nhỏ, lời đã chép và các mốc đoạn.
2. **Lấy lời**: nhận file phụ đề `.srt` / `.vtt` (miễn phí); không có thì tách tiếng thành khúc 10 phút và gửi chép lời, có thanh tiến độ và dừng được.
3. **Chấm điểm đoạn**: AI chia lời thành đoạn ý trọn, chấm theo câu mở mạnh, ý trọn, có con số hay câu chuyện, độ dài khớp thông số; đề xuất 3–10 đoạn, sửa được mốc đầu / cuối.
4. **Làm theo lô**: tích nhiều đoạn → nhiều thẻ một lần; Duyệt cả lô; tự xếp lịch theo slot trống hợp kênh, không trùng ngày.
5. **Nhiều kênh / tỉ lệ**: thẻ giữ `outputs[]` theo kênh; xem thử theo từng tỉ lệ, tự căn khung giữa, kéo để chỉnh; mỗi tỉ lệ xếp vào slot của kênh đó.

Dữ liệu thêm: `media.ref` (liên kết file), `media.subs[]`, `v.clipFrom/clipTo`, `v.batchId`, `v.outputs[]`.
Test: đọc `.srt` / `.vtt`, chia đoạn, chấm điểm mô phỏng, tạo lô, xếp lịch tự động, chuyển tỉ lệ.
Rủi ro: tách tiếng file 60 phút trong trình duyệt có thể mất vài phút; có file phụ đề thì bỏ được bước này. Mở lại trên máy khác cần chọn lại file gốc.

### Đợt C: Link, làm lại, khuôn, số liệu, bình luận
**Kết quả bạn thấy:** dán link bài viết / sản phẩm ra kịch bản; thẻ Vid cũ có nút Làm lại (đổi hook, cắt ngắn, dịch); thả video mẫu để rút khuôn; lưu khuôn của tôi cho series; dán bảng số liệu ra video biểu đồ; thả ảnh bình luận ra video trả lời.

Việc làm:
1. **Link bài viết / sản phẩm**: gọi Claude kèm công cụ đọc web (cần khoá Anthropic, chạy trên PC); không có khoá thì nhờ dán chữ. Sản phẩm viết theo khung vấn đề, giải pháp, giá, kêu gọi.
2. **Làm lại video cũ**: nhân bản thẻ với lựa chọn đổi hook, cắt còn độ dài mới, dịch sang ngôn ngữ khác, đổi kênh.
3. **Khuôn**: rút từ video mẫu (đo nhịp cắt bằng so khung hình liên tiếp, độ dài hook, vị trí caption; lời mẫu chép bằng STT nếu có) hoặc lưu từ một thẻ đã ưng; kho `S.vidLib.templates`; Ô nạp chọn khuôn.
4. **Bảng số liệu**: dán từ Excel hoặc CSV; mỗi cảnh một biểu đồ cột / đường hoặc một con số lớn, có hiệu ứng chạy; AI viết lời dẫn.
5. **Ảnh bình luận**: đọc chữ trong ảnh (AI nhìn ảnh) hoặc gõ lại; cảnh 1 là bình luận nổi lên, các cảnh sau trả lời.

Test: rút khuôn từ video mẫu thử, áp khuôn, làm lại / dịch mô phỏng, đọc bảng số liệu, cảnh biểu đồ, cảnh bình luận.
Rủi ro: một số trang web chặn đọc tự động; đo nhịp cắt kém chính xác với video chuyển cảnh mờ.

## 4. Giới hạn chung
- Không xuất file MP4: vẫn xuất ở CapCut hoặc công cụ ngoài theo danh sách lệnh dựng.
- Phần nào mô phỏng thì app ghi rõ "mô phỏng".
- Chạy bản trên PC bằng Chrome hoặc Edge (liên kết file trên máy chỉ hai trình duyệt này có).

## 5. Điều kiện và chi phí
- **Khoá Anthropic**: viết kịch bản, mô tả hình, đọc link, đọc ảnh bình luận, chấm điểm đoạn. **Khoá OpenAI**: chép lời và Gen ảnh. Không cần máy chủ hay thuê bao; thiếu khoá thì chạy mô phỏng.
- Giá Claude theo bảng giá Anthropic 10/2026 (Haiku 5.5 $0,10 / $0,50, Sonnet 5.5 $2 / $10 mỗi triệu token vào / ra). Giá OpenAI là ước tính, cần kiểm lại. Tỷ giá ~26.000 đ/USD.

| Việc | Chi phí ước tính |
|---|---|
| 1 video 90 giây, không Gen ảnh | 300–2.600 đ (Haiku đến Sonnet) |
| 1 video 90 giây, Gen 6–10 ảnh chất lượng thấp | 2.000–6.500 đ |
| Nguồn dài 60 phút, có file phụ đề | ~1.000 đ cho cả lô short |
| Nguồn dài 60 phút, phải chép lời | ~10.000 đ cho cả lô short |
| 30 video/tháng | ~10.000–150.000 đ |

Phần đắt nhất là Gen ảnh, nên app ưu tiên hình người dùng nạp và kho asset trước.

## Trạng thái (17/10/2026): đã ráp vào app, bản 113
Cả ba đợt A/B/C làm một lượt. Thêm so với kế hoạch gốc: bước **Dàn ý** giữa Nạp và Kịch bản; Độ dài chọn nhanh 30/60/90 giây (tự nhập 15–300); biến thể tạo từ Vid cũ. Còn mô phỏng: trích ô theo luật, đọc link, tìm đoạn hay (chia đều), dịch tiếng Anh, xuất video thật. Cần gắn AI và công cụ cắt/ghép video để chạy thật.
