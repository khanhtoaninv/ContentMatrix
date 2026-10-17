# Tạo lại nội dung khi Topic đã triển khai: phân tích và quy tắc đề xuất

Ngày 17/10/2026, theo mã bản 116. Đây là bản phân tích để thảo luận, chưa sửa mã.

## 1. Chuỗi phụ thuộc hiện có

```
Topic (phiên bản v1, v2…)
 ├─ Matrix: Ô (Cell, nhiều lượt sinh) ──Viết slot──▶ Slot bài (Nháp → Đã duyệt) ──Chốt lịch──▶ Đã đăng
 └─ Short Vid: Thẻ Vid (Insight → Kịch bản → Biên tập → Ren) ──▶ Kho ──Xếp Slot──▶ Slot video ──▶ Đã đăng
```

Mỗi mũi tên là một chỗ có thể lệch: tầng trên đổi trong khi tầng dưới đã dùng bản cũ.

## 2. App đang xử lý thế nào

| Tình huống | Hiện tại | Đánh giá |
|---|---|---|
| Tạo lại / Sửa / Dùng bản khác của một Ô | Thêm lượt sinh mới, ô về Chưa duyệt. Slot dùng ô đó bật cờ **Cần cập nhật** (so `sourceStamp`), người dùng chọn "Cập nhật từ ô" hoặc "Giữ bản slot" kèm lý do. Slot đã đăng không bị đụng. Cờ chặn Duyệt slot và chặn Chốt lịch. (`05b-cells.js` regenCell, `05-model.js` refreshSlotFlags) | Đúng hướng, nên lấy làm mẫu chung |
| Sửa Topic / Dùng phiên bản Topic khác | Ô theo phiên bản Topic mới (chưa viết thì Trống), slot bật Cần cập nhật. | Đúng, nhưng **thẻ Vid không biết** Topic đã đổi |
| Matrix đã khóa / Tuần đã chốt | Khóa chặn sửa Topic, ô; tuần chốt chặn mọi sửa, phải "Mở lại". | Tốt |
| Hủy Topic, hoặc Nạp lại tất cả mà tệp mới ít Topic hơn | Xóa hàng và ô; **slot dùng ô đó bị xóa bài về "Chưa có bài", kể cả slot Đã duyệt** (`dropTopicRow`, `clearSlotContent`). Thẻ Vid của Topic đó **không bị xóa**: hàng Short Vid mất Topic nhưng thẻ và slot video vẫn còn, thành "mồ côi". | Hai lỗi: mất bài đã duyệt; dữ liệu mồ côi |
| Nạp lại tất cả Topic | Ghép Topic mới với cũ **theo thứ tự** trong tệp (`importTopics`, `rows[k]`). Đổi thứ tự trong tệp thì Topic 2 nhận nội dung Topic 3, cả hàng ô bị coi là đã đổi. | Dễ gây nhầm lớn |
| Tạo Kịch bản mới cho thẻ Vid đang biên tập | Bản đang có (kịch bản, Insight, biên tập) lùi vào bản cũ (giữ 5), bản mới chưa có cảnh. | Tốt |
| Tạo Kịch bản mới cho thẻ **đã Ren** | Phần biên tập bị làm mới, nhưng file video ren cũ vẫn gắn ở thẻ (trạng thái "lỗi thời"). | Chấp nhận được, cần nhãn rõ |
| Tạo Kịch bản mới / Ren lại cho thẻ **đã Xếp Slot** | Slot đã chép video lúc xếp, giữ video cũ. **Slot không có cờ nào** báo thẻ đã có kịch bản hoặc bản ren mới. Ô Xếp Slot có cảnh báo "Biên tập đã đổi sau lần ren cuối", nhưng Dashboard thì không. | Lệch ngầm: đây là lỗ hổng chính bên Vid |

## 3. Nguyên tắc đề xuất (một bộ dùng chung cho Matrix và Short Vid)

**N1. Tạo lại luôn là thêm phiên bản, không ghi đè.** Bản cũ đang được tầng dưới dùng thì được giữ (không bị đẩy ra khỏi giới hạn 5 bản của Vid).

**N2. Tầng dưới giữ bản chụp của tầng trên, kèm "dấu nguồn".** Slot bài đã có (`sourceStamp`). Cần thêm: thẻ Vid ghi phiên bản Topic đã dùng; slot video ghi chữ ký bản ren đã dùng.

**N3. Đổi ở tầng trên không bao giờ tự lan xuống, chỉ bật cờ "Nguồn đã đổi".** Ở tầng dưới, người dùng chọn một trong hai:
- **Cập nhật**: lấy bản mới (tầng dưới về Nháp, phải duyệt lại);
- **Giữ bản này**: ghi lý do, cờ tắt cho tới lần đổi nguồn tiếp theo.

**N4. Mức bảo vệ theo trạng thái của tầng dưới** (đây là chỗ người vận hành cần nhớ):

| Trạng thái tầng dưới | Khi nguồn đổi |
|---|---|
| Nháp / Chưa duyệt | Bật cờ; có nút "Cập nhật tất cả" cho nhanh |
| Đã duyệt | Giữ nguyên Đã duyệt, bật cờ; **cờ chặn Chốt lịch** (như hiện tại) |
| Đã chốt lịch (tuần khóa) | Không đổi được gì; muốn đổi thì "Mở lại để sửa" ở Dashboard |
| Đã đăng | Bất biến; nội dung mới là một bài mới |

**N5. Thao tác xóa ở tầng trên không xóa thành quả đã duyệt ở tầng dưới.** Hủy Topic hoặc bỏ Topic khi nạp lại:
- slot Nháp: xóa bài như hiện tại;
- slot Đã duyệt / slot video đã xếp: **giữ bài, tách khỏi nguồn** (thành slot tự do, nhãn "Nguồn đã xóa"); người dùng tự quyết xóa hay giữ;
- thẻ Vid chưa ren: hủy theo Topic; thẻ đã ren hoặc đã xếp: giữ, nhãn "Topic đã xóa".
Hộp xác nhận nêu rõ số lượng từng loại trước khi làm.

**N6. Topic là nguồn chung.** Sửa Topic thì báo cả ô Matrix lẫn thẻ Vid dùng Topic đó (thẻ Vid hiện "Topic đã đổi", chọn Tạo Kịch bản mới hoặc Giữ).

**N7. Nạp lại tất cả ghép theo tên Topic, không theo thứ tự.** Tên khớp thì là cùng Topic (lên phiên bản mới nếu nội dung đổi); tên mới là Topic mới; tên vắng mặt thì xử lý như Hủy Topic (N5). Xem trước hiện bảng ghép để người dùng sửa nếu đổi tên.

**N8. Vid đã xếp lịch: được Tạo Kịch bản mới và Ren lại, slot không tự đổi.** Ren xong thì slot video bật cờ "Có bản ren mới" với Cập nhật / Giữ (giống N3). Cờ chặn Chốt lịch như slot bài.

## 4. Bất lợi chấp nhận

- Nhiều cờ hơn phải xử lý trước Chốt lịch; bù lại có "Cập nhật tất cả" và đếm cờ ở Dashboard.
- Có thể có slot "mồ côi" (giữ bài nhưng mất nguồn); đổi lại không bao giờ mất bài đã duyệt.
- Giữ lâu bản cũ đang được dùng làm dữ liệu nặng hơn một chút.
- Không có hợp nhất tự động: muốn lấy một phần bản mới thì Cập nhật rồi sửa tay.

## 5. Câu cần người dùng chốt

1. Hủy Topic khi đã có slot Đã duyệt: **giữ bài, tách nguồn (đề xuất)** hay xóa bài như hiện tại?
2. Thẻ Vid đã xếp lịch: **cho Tạo Kịch bản / Ren lại, slot báo cờ (đề xuất)** hay bắt Gỡ lịch trước?
3. Nạp lại tất cả: **ghép theo tên (đề xuất)** hay giữ theo thứ tự?

## 6. Phạm vi sửa mã nếu duyệt (ước lượng)

- `05-model.js`: dropTopicRow tách nguồn thay vì xóa bài đã duyệt; importTopics ghép theo tên; refreshSlotFlags thêm slot video.
- `05s-shortvid.js`: thẻ Vid ghi `topicVer`, cờ Topic đã đổi; dọn thẻ khi Topic bị xóa theo N5; ghim bản đang được dùng.
- `05t-videdit.js` / `05w-vidrender.js`: slot video ghi chữ ký bản ren, cờ "Có bản ren mới", Cập nhật / Giữ.
- UI: nhãn cờ ở thẻ slot, thẻ Vid, Dashboard; nút Cập nhật tất cả; hộp xác nhận có số lượng.
- Test logic + UI cho từng tình huống ở mục 2.
