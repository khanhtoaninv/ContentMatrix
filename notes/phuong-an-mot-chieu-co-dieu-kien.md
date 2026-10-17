# Phương án "liên quan một chiều có điều kiện" (người dùng đề xuất 17/10/2026)

Đối chiếu với mã bản 116. Phương án này thay cho N3, N4, N8 của `phan-tich-tao-lai-noi-dung.md`; N5 (giữ bài khi nguồn bị xóa) và N7 (nạp lại ghép theo tên) vẫn cần. Chưa sửa mã.

## Đánh giá chung

Phương án hợp lý và đơn giản hơn đề xuất trước. Tầng dưới là **bản sao độc lập**: nó chỉ đọc nguồn **lúc người dùng bấm tạo**, sau đó nguồn đổi thế nào cũng không chạm vào. App không còn phải theo dõi liên tục, nên bỏ được cờ "Cần cập nhật" và cặp nút "Cập nhật từ ô / Giữ bản slot". Điểm kiểm soát chuyển sang **cổng khóa**: muốn tạo tầng dưới thì tầng trên phải khóa (Matrix khóa, Kịch bản khóa).

## A. Matrix → Slot

| Ý của bạn | Mã hiện tại | Cần đổi |
|---|---|---|
| Slot chỉ viết khi người dùng bấm | Đúng: Viết tất cả, Tạo lại | Giữ |
| Viết theo bản mới nhất của ô lúc bấm | Đúng: `regenSlot` lấy bản hiện hành, ô phải Đã duyệt | Giữ |
| Ô đổi không ảnh hưởng slot | Sai: `refreshSlotFlags` bật Cần cập nhật; slot có cờ không Duyệt, không Chốt được. Đổi Format slot cũng bật cờ | Bỏ cờ tự động, bỏ Cập nhật từ ô / Giữ bản slot, bỏ chặn ở Chốt lịch |
| Lưu 5 bản gần nhất | `slot.history` không giới hạn | Giữ 5 (gồm cả bản sửa tay) |
| Phải khóa Matrix mới tạo bài | Viết tất cả đã cần khóa (`dealGate`); **Tạo lại từng slot thì không** | Thêm kiểm tra vào Tạo lại: "Vui lòng đóng khóa Matrix" |
| Bấm Tạo lại mà ô đã đổi thì cảnh báo | Chưa có | So dấu nguồn lưu ở slot với ô hiện tại; khác thì hỏi "Ô nguồn đã đổi (bản x → bản y). Viết theo bản mới?" Tiếp tục / Hủy |

Chỗ cần làm rõ:

1. **Nguồn bị xóa sau khi slot đã viết** (Hủy ô, Hủy Topic, xóa Cột). Hiện tại slot bị xóa bài (`dropTopicRow`, `removeWeekColumn`). Theo nguyên tắc "không ảnh hưởng" thì slot **giữ bài**; bấm Tạo lại thì báo "Ô nguồn không còn", chỉ sửa tay được.
2. **Matrix đang mở khóa thì slot làm được gì?** Đề xuất: sửa tay, Duyệt, Chốt vẫn được; chỉ chặn "viết từ ô". Như vậy mở khóa Matrix để sửa 1 ô không làm đứng cả lịch.
3. **Đổi Format hoặc Cột của slot.** Hiện bật cờ hoặc xóa bài. Đề xuất: giữ bài, lần Tạo lại sau viết theo Format/ô mới (có cảnh báo nguồn đổi).
4. **Ảnh.** Tạo lại slot: ảnh người dùng tải lên giữ nguyên, ảnh Gen thì Gen lại nếu mô tả đổi (`layoutSlotImages`). 5 bản lịch sử chỉ là chữ; ảnh có phiên bản riêng ở từng ô ảnh.
5. **Có báo thụ động không?** Theo ý bạn thì không: chỉ biết khi bấm Tạo lại. Nhưng bên Vid lại có dấu "!" vàng, nên hai bên không đồng nhất (xem mục C).
6. Lỗi nạp lại theo thứ tự (Topic 2 nhận nội dung Topic 3) không còn làm hỏng slot, nhưng ô vẫn sai Topic. Vẫn nên ghép theo tên.

## B. Short Vid

### B1. Kịch bản → Biên tập

| Ý của bạn | Mã hiện tại | Cần đổi |
|---|---|---|
| Kịch bản có Khóa; chỉ Biên tập khi đã khóa | Không có khóa; sang Biên tập/Chia cảnh là coi như duyệt (D159–D166) | Thêm Khóa / Mở khóa Kịch bản (gồm Insight, Kịch bản, lời VO). Chưa khóa thì tab Biên tập chỉ xem, ghi "Vui lòng khóa Kịch bản" |
| Đã vào Biên tập thì không quan tâm kịch bản trước đó | **Ngược lại**: Tạo Kịch bản mới xóa sạch Biên tập (`writeVidScript` đặt `v.edit = null`), vì một "phiên bản" đang gói chung kịch bản + Insight + biên tập | **Tách hai lịch sử**: Kịch bản (5 bản) và Biên tập (5 bản). Tạo Kịch bản mới không đụng Biên tập |
| Tạo cảnh mới bám kịch bản mới nhất | Đúng: Chia cảnh dùng kịch bản hiện tại, ghi `ed.splitFrom` | Giữ |
| Biên tập tự lưu lịch sử | Chưa có lịch sử riêng | Chụp ở các mốc: Chia cảnh, Cập nhật theo kịch bản, Hoàn thành, Ren. Không chụp từng thao tác (ảnh, âm thanh nặng) |
| Mở khóa sửa thì báo Biên tập; Cập nhật hoặc Bỏ qua | Đã có dòng báo "Chia lại cảnh" khi kịch bản khác `splitFrom`, nhưng chỉ hiện ở tab Kịch bản (`09-shortvid.js:368`) | Chuyển báo sang tab Biên tập và thẻ Vid, nút "Cập nhật theo kịch bản" / "Bỏ qua" |

Chỗ cần làm rõ:

1. **"Cập nhật theo kịch bản" làm gì?**
   - (a) Chia lại toàn bộ cảnh. Đơn giản, chắc chắn đúng. Hình đã chọn mất, nhưng bản trước nằm trong lịch sử Biên tập nên quay lại được.
   - (b) Ghép thông minh: cảnh có lời giữ nguyên thì giữ hình, cảnh đổi lời thì làm mới, cảnh thêm thì chèn vào. Khó, dễ sai khi cảnh bị tách hoặc gộp.
   - Đề xuất làm (a) trước.
2. **Mở khóa Kịch bản thì Biên tập đứng.** Muốn sửa một chữ thì phải mở khóa, Biên tập và Ren tạm chặn, khóa lại mới làm tiếp. Giống Matrix, chấp nhận được.
3. **Sửa lời ngay trong Biên tập** (VO từng cảnh) không chảy ngược về Kịch bản. Một chiều, nhưng cần ghi rõ cho người dùng.
4. **Topic → Kịch bản** dùng cùng quy tắc: Topic đổi không ảnh hưởng thẻ Vid; Tạo Kịch bản mới lấy Topic mới nhất, cảnh báo nếu Topic đã đổi. Cần ghi phiên bản Topic vào thẻ.
5. **Vid tự do** có thêm tầng Dàn ý → Kịch bản. Đề xuất: không khóa Dàn ý, chỉ áp "đọc nguồn lúc bấm".

### B2. Video thành phẩm → Slot

| Ý của bạn | Mã hiện tại | Cần đổi |
|---|---|---|
| Xếp xong thì slot không bị ảnh hưởng | Đúng: slot **chép** file lúc xếp (`scheduleVideo`) | Giữ |
| "trừ khi file bị xóa trong Kho" | Slot giữ bản chép riêng, nên xóa trong Kho **không** làm hỏng slot | Chọn: giữ chép (an toàn, tốn dung lượng × số kênh) hay trỏ tới Kho (nhẹ, nhưng xóa Kho làm hỏng slot, phải chặn xóa hoặc báo đỏ) |
| Ren lại / Up file khác → "!" vàng ở góc slot, Cập nhật hoặc Tắt cảnh báo | Chưa có | Slot ghi chữ ký video đã dùng; thẻ có video khác thì "!" vàng. Cập nhật = chép video mới (cùng bìa, phụ đề, giữ caption của kênh). Tắt = nhớ đã thấy bản này, bản sau lại báo |

Lưu ý: Ren lại hiện **ghi đè** mục Kho cũ (`addLibraryVideo` với `replaceId`). Nếu chọn trỏ tới Kho thì phải đổi thành thêm bản mới, nếu không slot sẽ tự đổi video mà không ai biết.

Chỗ cần làm rõ:

1. **Cập nhật video ở slot Đã duyệt.** Đề xuất về Nháp, duyệt lại (giống bài). Tuần đã chốt thì nút Cập nhật bị khóa.
2. Một thẻ xếp ra nhiều kênh: "!" hiện ở mọi slot, thêm nút "Cập nhật mọi slot của video này".
3. Đổi Thumbnail sau khi xếp cũng báo "!" (bìa là thứ người xem thấy đầu tiên).
4. Slot đã đăng không bao giờ báo.

## C. Bảng nhất quán

| Quan hệ | Cổng khóa | Nguồn đổi sau khi tạo | Bấm tạo lại |
|---|---|---|---|
| Topic → Ô Matrix | Matrix khóa thì Topic khóa | Ô không đổi | Lấy Topic mới nhất |
| Ô → Slot bài | Phải khóa Matrix | Slot không đổi; **không báo** (theo ý bạn) | Hỏi nếu ô đã đổi |
| Topic → Kịch bản Vid | (không) | Thẻ không đổi | Hỏi nếu Topic đã đổi |
| Kịch bản → Biên tập | Phải khóa Kịch bản | Biên tập không đổi; **báo** Cập nhật / Bỏ qua | Chia cảnh theo kịch bản mới nhất |
| Video → Slot video | (không, video là thành phẩm) | Slot không đổi; **"!" vàng** Cập nhật / Tắt | – |

Chỗ lệch duy nhất: slot bài không có báo thụ động, còn Biên tập và slot video thì có. Đề xuất đồng nhất bằng cách cho slot bài cùng dấu "!" vàng khi ô nguồn có bản mới. Dấu này chỉ để biết, Tắt được, không chặn gì.

## D. Phần bỏ đi so với mã hiện tại

- Cờ Cần cập nhật, Cập nhật từ ô, Giữ bản slot + lý do, chặn Duyệt/Chốt vì nguồn (`05c-slots.js`, `05e-publish.js` confirmGate, `04-week.js`, các test liên quan).
- Phiên bản Vid gói chung kịch bản + biên tập (D159–D166): tách thành hai lịch sử.

## E. Bất lợi chấp nhận

- Nếu slot bài không có "!" vàng, slot có thể đăng bài theo ô cũ mà không ai để ý.
- Khóa Matrix bắt buộc: sửa 1 ô phải mở khóa, ô đã tạo lại phải Duyệt thì mới khóa lại được, trong lúc đó slot không viết từ ô được.
- Khóa Kịch bản: sửa nhỏ kịch bản cũng làm Biên tập tạm đứng.
- "Cập nhật theo kịch bản" kiểu chia lại toàn bộ làm mất công chọn hình (có lịch sử để quay lại).

## F. Câu cần chốt (phương án đầu là đề xuất)

1. Slot bài có dấu "!" vàng như slot video không? **Có** / Không.
2. Cập nhật theo kịch bản: **Chia lại toàn bộ cảnh** / Ghép thông minh.
3. Slot video: **chép file như hiện tại** / trỏ tới Kho.
4. Cập nhật video ở slot Đã duyệt: **về Nháp** / giữ Đã duyệt.
5. Ô, Topic hoặc Cột bị xóa: **slot giữ bài** / xóa bài như hiện tại.

## G. Người dùng đã chốt (17/10/2026, 10:50)

1. Slot bài **có dấu "!" vàng** khi ô nguồn có bản mới. Bấm vào thì Tạo lại theo ô mới (có xác nhận), hoặc Tắt cảnh báo. Không chặn gì.
2. Cập nhật Biên tập theo kịch bản = **chia lại toàn bộ cảnh**; bản biên tập trước vào lịch sử Biên tập.
3. Slot video **chép file như hiện tại**; xóa trong Kho không ảnh hưởng slot.
4. Cập nhật video ở slot: như bình thường, tức slot về Nháp và phải **Duyệt lại**. Duyệt là khóa (hiện icon khóa).
5. Slot **luôn giữ bài**, kể cả khi xóa hết các ô hoặc cả Matrix.
