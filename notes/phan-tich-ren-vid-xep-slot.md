# Phân tích: Ren Vid, Xếp Slot, chữ cần bỏ (17/10/2026, chưa code)

## 1. Vì sao video biên tập xong chưa lên được Dashboard
Đúng như anh/chị hiểu. Slot ở Dashboard cần một **file video thật** (`v.file`; `scheduleVideo` báo "Chưa có video thành phẩm" nếu thiếu). Tab Biên tập hiện chỉ lưu **lệnh dựng** (cảnh, hình, VO, cue, hiệu ứng, caption), chưa xuất thành file. Nên tab Xếp Slot cho chọn ô trước nhưng nút Đưa vào lịch bị khóa, cho tới khi Up một video làm sẵn ở chế độ Ngoài app.

## 2. Đề xuất: nút Ren Vid
- Sau khi Biên tập xong có nút **Ren Vid**. Ren xong thì tự **lưu vào Kho tài sản** (có tên, ảnh bìa, độ dài), gắn làm video thành phẩm của thẻ và **mở khóa Xếp Slot**. App không tự đưa lên lịch, người dùng vẫn chọn ngày giờ.
- Sửa Biên tập sau khi đã Ren: video cũ đánh dấu "lỗi thời", phải Ren lại (hoặc giữ bản cũ trong Kho).
- Thẻ Vid hiện thêm trạng thái "Đang ren" (có thanh tiến độ, Hủy được) và "Đã ren".

Bộ ren thật là chỗ khó. Ba cách:
1. **Ren trong trình duyệt** (ffmpeg.wasm hoặc ghi canvas): không cần máy chủ, chạy ngay. Nhưng chậm (video 90 giây có thể mất vài phút), nặng máy, thêm ~30 MB, hiệu ứng chuyển cảnh và cue phải vẽ lại bằng bộ dựng hình riêng.
2. **Ren bằng ffmpeg trên PC app hoặc máy chủ** (đúng hướng đã ghi ở HANDOFF): nhanh, chất lượng tốt, nhưng phải dựng thêm máy chủ hoặc chương trình đi kèm.
3. **Làm luồng trước, ren giả**: nút Ren Vid tạo một video giữ chỗ để chạy thử toàn luồng (Ren → Kho → Xếp Slot → Dashboard), bộ ren thật gắn sau, thay đúng một hàm.

Đề nghị: làm **3 trước**, rồi làm **1** (hoặc 2 nếu anh/chị có máy chủ).

## 3. Các chữ sẽ bỏ
Bỏ hẳn 6 dòng chữ cố định: Tuần mẫu khóa (Dashboard), mô tả đầu trang Matrix, câu "Matrix đã khóa…", mô tả đầu trang Short Vid, chú thích dấu + dưới nút, và chữ "chưa có hình" ở cột Timeline của bảng Phân cảnh (Kịch bản).
Chưa chắc: "Matrix đã khóa…" và "Tuần mẫu khóa" còn là lý do khi bấm nút bị khóa. Mặc định: bỏ dòng chữ trên trang, **giữ lại ở tooltip/thông báo** khi bấm nút bị khóa để người dùng vẫn biết vì sao.

## 4. Giao diện Xếp Slot
- **Bảng nhất quán**: cột Kênh rộng cố định, cùng chiều cao hàng, cột ngày chia đều (`table-layout: fixed`), cột Kênh dính bên trái khi cuộn ngang.
- **Bấm ô trống** (hoặc đưa video vào): hộp chọn **Giờ đăng** cho kênh + ngày đó, kèm **thumbnail nhỏ các bài đã có trong ngày của kênh** (giờ, ảnh/video, loại) để chọn giờ tránh trùng. Bấm Xác nhận mới tạo slot.
- **Bấm ô đã xếp**: mở lại hộp để sửa giờ (hoặc Bỏ khỏi lịch).
- **Kéo ô qua lại trong cùng kênh**: thả vào ngày khác thì hiện hộp giống trên (thumbnail các bài của kênh ngày đó), chờ Xác nhận. Nếu **trùng lịch** (cùng kênh, cùng giờ) thì báo và buộc sửa giờ mới cho xác nhận. Slot đã đăng thì không kéo được.
- Kênh khác không kéo sang (mỗi kênh một slot riêng của video).
- Áp dụng cho cả tab Xếp Slot trong popup thẻ Vid lẫn hộp Đưa video vào lịch ở màn Short Vid.

## 5. Đồng bộ Vid Topic và Vid tự do (anh/chị bổ sung)
Cùng một quy trình cho mọi thẻ Vid, bất kể `origin`: Biên tập → **Ren Vid** → tự lưu Kho → **Xếp Slot** (hộp giờ, thumbnail, sửa, kéo, báo trùng) → Dashboard. Hai loại thẻ dùng chung một popup, một hàm ren, một tab Xếp Slot; không có nhánh riêng. Cả lô (Vid tự do chia từ video dài) có Ren cả lô và Tự xếp cả lô dùng đúng các bước này; Vid Topic cũng có thanh làm cả hàng (Ren, Xếp) để hai bên cùng thao tác.

## Cần anh/chị chốt
1. Bộ ren: làm theo đề nghị (3 rồi 1)?
2. Trùng lịch tính là **cùng kênh, cùng giờ**, hay cách nhau dưới một khoảng (ví dụ 30 phút)?
3. Chữ bị khóa: bỏ khỏi trang, giữ ở tooltip/thông báo, đúng ý chưa?
