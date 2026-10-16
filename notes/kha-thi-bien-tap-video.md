# Khả thi của việc biên tập video theo popup Vid mẫu (16/10/2026)

Phạm vi: những gì `notes/mau-popup/popup-vid-mau.html` hứa với người dùng, và cần gì để app xuất ra được video thật. Phần "đã thử" là kết quả chạy thật trong môi trường này; phần còn lại là hiểu biết chung, chưa kiểm chứng.

## 1. Kết luận
Khả thi. Phần cốt lõi (ghép cảnh, cắt hình, chữ phủ, caption có kiểu, frame, trộn VO và nhạc, tự hạ nhạc) làm được bằng ffmpeg trên PC. Phần khó và rủi ro nằm ở: caption khớp nhịp giọng, giọng Gen AI tiếng Việt, và việc preview trong trình duyệt khớp với video xuất.

## 2. Đã thử (bản thử ffmpeg 6.1.1, môi trường này)
Một lệnh ffmpeg dựng 14 giây 1080x1920: 1 ảnh + 1 video ngắn giữ khung cuối, chữ phủ, caption tiếng Việt có tô từ khóa, 2 VO đặt đúng mốc đầu cảnh, nhạc nền tự hạ khi có giọng, chuẩn hóa âm lượng. Kết quả: H.264 + AAC, đúng 1080x1920, 14,0 giây, render 6,7 giây, không lỗi. Dấu tiếng Việt và tô từ hiển thị đúng. (Chuỗi ",0,0,0," thừa trên caption là lỗi cú pháp ở file caption thử của tôi, không phải giới hạn của ffmpeg.)
Chứng minh được: scale/crop lấp đầy, giữ khung cuối, chữ phủ, caption ASS, trộn và hạ nhạc, loudnorm, concat. Chưa thử: lặp, kéo chậm, frame PNG chồng, video quay điện thoại thật (HEVC, xoay, tốc độ khung không đều).

## 3. Từng tính năng của popup
| Tính năng | Khả thi | Cách làm |
|---|---|---|
| Ghép nhiều cảnh, nhiều hình/cảnh chia đều | Cao | concat các đoạn đã scale/crop |
| Lấp đầy / vừa khung | Cao | crop hoặc pad |
| Cắt đoạn, giữ khung cuối, lặp | Cao | trim, tpad, loop |
| Kéo chậm | Trung bình | setpts; chậm nhiều sẽ giật, không có nội suy khung hình |
| Chữ phủ từng cảnh | Cao | drawtext hoặc ASS |
| Caption có kiểu, tô từ khóa, vùng an toàn | Cao | ASS (libass) |
| Caption chạy từng từ | Trung bình | ASS karaoke, cần giây từng từ |
| Caption khớp nhịp giọng thật | Trung bình-thấp | cần nhận giọng nói (xem 5) |
| Frame thương hiệu | Cao | PNG trong suốt, overlay |
| VO cảnh bám đầu cảnh, VO toàn bài | Cao | adelay, amix |
| Nhạc nền, tự hạ, chuẩn hóa âm lượng | Cao | sidechaincompress, loudnorm |
| Sóng âm trên timeline | Cao | đã chạy thật trong bản mẫu |
| Tự cắt video dài cho vừa cảnh | Cao (cắt từ đoạn đầu hoặc theo khoảng lặng); thấp nếu muốn chọn đoạn hay nhất | cần AI nhìn khung hình mới chọn thông minh được |
| Gen AI giọng tiếng Việt | Chưa rõ | cần khóa API và nghe thử |
| Preview giống hệt video xuất | Trung bình | xem 4 |

## 4. Cần gì để làm
1. **Chọn bộ xuất.** Khuyến nghị: ffmpeg chạy trên PC qua một "trợ lý cục bộ" nhỏ (Node, mở cùng `chay.bat`), app HTML gửi lệnh dựng JSON sang trợ lý. Lý do: nhanh nhất (bản thử ~0,5 lần thời gian video), không bị giới hạn bộ nhớ trình duyệt, xử lý được mọi định dạng video điện thoại. Cần PC có ffmpeg (có thể gói kèm). Các hướng khác: Remotion (chữ và caption viết bằng React nên preview và xuất cùng một mã, nhưng nặng hơn, cài thêm Chromium, giấy phép cần đọc kỹ theo quy mô công ty); xuất trong trình duyệt bằng WebCodecs (không cài gì nhưng phải tự viết nhiều, giải mã video và âm thanh kém ổn định giữa trình duyệt); ffmpeg.wasm (chậm, giới hạn bộ nhớ ~2 GB).
2. **Kho tệp video bền vững.** Hiện app giữ tệp ở trình duyệt, giới hạn ~25 MB. Video 60 giây 1080p vài chục MB đến hàng trăm MB. Cần thư mục dự án trên PC để trợ lý đọc thẳng tệp gốc, app chỉ lưu đường dẫn.
3. **Một đặc tả dựng duy nhất.** Chốt bằng văn bản cách khớp khung, kiểu caption, vị trí, vùng an toàn, thứ tự lớp; sinh lệnh ffmpeg từ JSON theo đặc tả đó. Kiểm bằng cách xuất mẫu rồi so ảnh khung với preview.
4. **Bản xem nhẹ (proxy).** Video điện thoại HEVC/HDR thường không phát được trong Chrome; trợ lý nên tự tạo bản 720p H.264 để xem thử, xuất dùng tệp gốc.
5. **Nhận giọng nói (STT)** để caption khớp nhịp. Chọn nhà cung cấp, có khóa API, và thử độ chính xác tiếng Việt. Cách rẻ để cải thiện khi chưa có STT: dò khoảng lặng bằng ffmpeg để canh ranh giới câu.
6. **Đọc giọng (TTS) tiếng Việt** nếu giữ nút Gen AI. Cần chọn nhà cung cấp, khóa API, nghe thử, biết giá theo ký tự. Nếu TTS trả về độ dài thật của từng cảnh thì quy tắc "cảnh không ngắn hơn VO" mới chính xác.
7. **Font tiếng Việt kèm sẵn** (ví dụ Be Vietnam Pro, giấy phép OFL) để caption giống nhau mọi máy.
8. **Tiến độ, hủy, báo lỗi, dọn tệp tạm** cho việc xuất; xuất 60 giây vẫn mất vài chục giây đến vài phút tùy máy.
9. **Nhạc và giấy phép**: app chỉ lưu nguồn/giấy phép do người dùng ghi, không cấp nhạc.

## 5. Rủi ro chính
- Preview (DOM) lệch với video xuất (ffmpeg): giảm bằng đặc tả chung và kiểm khung hình mẫu.
- Caption lệch nhịp giọng nếu không có STT.
- Giọng AI tiếng Việt nghe không đạt: có thể phải để người dùng tự thu hoặc Up file.
- Phụ thuộc PC có cài ffmpeg: nên kiểm khi chạy và hướng dẫn cài.
- Chưa thử trên máy của người dùng: tốc độ thật trên PC của bạn có thể khác môi trường này.

## 6. Thứ tự làm đề xuất
1. Làm bản thử đầy đủ: đọc lệnh dựng JSON của Bàn dựng, sinh lệnh ffmpeg, xuất một video 60 giây từ video thật của bạn, đo thời gian. (Cần bạn gửi một clip mẫu hoặc chạy thử trên PC.)
2. Trợ lý cục bộ + thư mục dự án + proxy xem thử.
3. Gắn popup mới vào app, nút Hoàn thành gọi bộ xuất.
4. STT cho caption; TTS nếu thử tiếng Việt đạt.
5. AI nhìn khung hình để cắt thông minh, làm sau cùng.

## 7. Cần bạn chốt
- PC là Windows hay macOS? Chấp nhận chạy kèm một trợ lý cục bộ (Node) không?
- Nhà cung cấp STT và TTS dự định dùng, đã có khóa chưa?
- Chọn bộ xuất: ffmpeg (đề xuất), Remotion, hay trong trình duyệt.
