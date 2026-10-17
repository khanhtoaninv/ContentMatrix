# AutoContent — Content Matrix MVP — Đặc tả v2.8

**Phiên bản:** 2.8 (thay thế v2.7; tổng hợp các quyết định ngày 13/10/2026 sau khi xem R1′ bản v2.7)
**Trạng thái:** căn cứ để dựng R1′–R4. R1′, R2′, R3′ và **R4 đã dựng** (13/10/2026; R4 ở mục 10.22, cập nhật 10.23–10.49, bản artifact 74) cùng các điều chỉnh giao diện 10.3–10.21. Từ R4 trở đi, các đợt đánh số không có dấu phẩy (R4, R5, …). Mục 10.x xếp mới nhất lên trên; khi hai mục khác nhau, mục số lớn hơn là hiện hành.
**Thương hiệu demo:** Nói Được English (dữ liệu mô phỏng). AI chỉ là mô phỏng (mock); Claude thật tắt trong MVP.
**Thiết bị:** điện thoại và máy tính để bàn đều là mục tiêu chính.

---

# 0. Tóm tắt thay đổi và quyết định

## 0.1. Mô hình trong một đoạn

Ứng dụng xoay quanh **một lịch liên tục cả năm**; tuần nào chưa tới thì để trống. Người dùng thiết lập một lần: Thương hiệu, Giọng văn, **5 Cột theo chức năng nội dung**, các **Format** và **nhiều Tuần mẫu** (bộ slot dựng sẵn, đủ 7 ngày). Mỗi tuần có bảy bước: **Lập tuần** (chọn một Tuần mẫu, bấm Tạo slot; slot mới chỉ có ngày, giờ, kênh, Format) → **Nạp Topic** (một tệp gồm bối cảnh chung và các Topic, mỗi Topic là một mini-research khoảng 2.000 chữ do agent bên ngoài chuẩn bị) → **Viết ma trận** (AI viết **mọi ô** Topic × Cột; mỗi ô có kèm gợi ý ảnh) → **Duyệt ô** → **Chia bài** (hệ thống tự chọn ô cho từng slot và viết lại theo Format; đổi ô được sau đó) → **Duyệt slot và ảnh** (sửa, tạo lại, Gen ảnh) → **Xác nhận và xuất**. Hệ thống chỉ **tham khảo và cảnh báo**; người dùng quyết định.

## 0.2. So với v2.7

| Chủ đề | v2.7 | v2.8 |
|---|---|---|
| Tên đầu vào | Input | **Topic** (nhãn giao diện "Topic"; "Chủ đề" dành cho chủ đề chung của tuần) (D101) |
| Số hàng | 1–5, cài đặt "Input mỗi tuần" | **Tự do** (kỹ thuật tối đa 10, từ bản 79; trước là 8); bỏ cài đặt (D101) |
| Viết ma trận | Chỉ viết ô cần dùng (D98) | **Viết mọi ô** (Topic × Cột); không còn "ô cần dùng / không có slot dùng" (D102) |
| Tạo tuần | Bước riêng, sao lịch mẫu duy nhất | **Bỏ bước tạo tuần**: lịch liên tục; **Lập tuần** = chọn **Tuần mẫu** (D103, D104) |
| Lịch mẫu | Một lịch mẫu 17 slot | **Nhiều Tuần mẫu**, đặt tên, xếp thứ tự xoay vòng, app gợi ý mẫu kế tiếp (D104) |
| Sau khi duyệt ô | Xác nhận ma trận → Phân bổ | **Chia bài**: một nút ở Matrix, tự chọn ô cho slot, đổi được (D105) |
| Ảnh | Checklist asset chỉ nhắc | **Gợi ý ảnh đi theo ô**; slot có ô ảnh nhận prompt, Gen và `<` `>` chọn phiên bản (D106) |
| Menu | Dashboard · Content (3 tab) · Xuất · Thiết lập | **Dashboard · Matrix · Export · Setup**; Matrix là **một bảng** (D107) |
| Quy trình | 8 bước | **7 bước** (D108) |
| Hủy Topic | Không có | **Hủy Topic** (bỏ hàng, các ô, slot dùng ô về "Chưa có bài") |

## 0.3. Quyết định mới (D101 trở đi; D73–D100 còn hiệu lực trừ khi bị thay)

| # | Quyết định | Thay |
|---|---|---|
| D101 | **Input đổi tên thành Topic.** Số Topic của một tuần do tệp nạp vào quyết định (kỹ thuật tối đa 10, từ bản 79). Bỏ cài đặt "số Input mỗi tuần" và cảnh báo "số Input khác cài đặt". Topic **thuộc về tuần** (mặc định). | D94 (phần 1–5), M-6 |
| D102 | **Phương án B: Matrix viết toàn bộ ô, slot viết lại từ ô.** Chuỗi là Topic → ô (15 ô với 3 Topic × 5 Cột) → duyệt ô → Chia bài → slot. Ô là **nội dung gốc đã duyệt** và là nguồn duy nhất của slot; slot viết lại từ ô theo Format (độ dài, cấu trúc, tông kênh, hashtag, CTA), không chỉ "chỉnh giọng". Lý do chọn B thay vì viết thẳng từ Topic vào slot: (1) giữ một điểm duyệt nội dung gốc, người duyệt so sánh được các Topic cùng một Cột; (2) mỗi slot chỉ còn bài toán trình bày, ít rủi ro thêm ý hoặc số liệu ngoài nguồn; (3) một ô nuôi được nhiều slot (TikTok và Reels) mà không viết lại từ đầu; (4) chi phí thêm 1 ô so với v2.7 (15 so với 14) là không đáng kể. Bỏ "ô cần dùng" và "không có slot dùng". | D98 |
| D103 | **Lịch liên tục cả năm, không có bước "Tạo tuần".** Bản ghi tuần tạo khi người dùng chạm tới (chọn Tuần mẫu, nạp Topic, hoặc thêm slot bằng **+**). Tuần chưa chạm tới hiện trống. Điều hướng: mũi tên tuần trước/sau, ô chọn ngày, nút **Tuần này**, lịch tháng (mọi ngày bấm được). | WK-01 |
| D104 | **Tuần mẫu:** nhiều Tuần mẫu có tên, mỗi mẫu là danh sách slot (thứ, giờ, kênh, Format) đủ hoặc không đủ 7 ngày; thứ tự do người dùng sắp ở Setup là **thứ tự xoay vòng**; khi Lập tuần app **gợi ý** mẫu kế tiếp sau mẫu của tuần liền trước (không có tuần trước thì mẫu đầu). **Nút Tuần mẫu bị khóa khi tuần đã có ít nhất một slot hoặc đã chốt**; muốn dùng lại phải xóa hết slot. Slot tạo ra **chỉ có ngày, giờ, kênh, Format**; nội dung và ô ảnh trống. Sau đó người dùng thêm/sửa/xóa slot bằng tay. Sửa Tuần mẫu không đổi tuần đã lập. | Lịch mẫu duy nhất |
| D105 | **Chia bài.** Nút ở Matrix, **chỉ bật khi**: tuần có slot; có Topic; không còn ô Trống hoặc Chưa duyệt (ô Đã hủy được tính là đã xử lý); ≥ 1 ô Đã duyệt; còn slot chưa có bài. Hệ thống **tự chọn ô** cho từng slot (như chia bài) theo công thức DST-02, viết slot từ ô, rồi người dùng đổi ô ở chi tiết slot (chỉ ô Đã duyệt cùng Cột). Bấm lần nữa chỉ điền slot còn trống. Cột không có ô Đã duyệt thì slot để trống kèm lý do. Thay cho "Xác nhận ma trận" và "Phân bổ" của v2.7. | D98, DST-01, MTX-09 |
| D106 | **Ảnh đi theo ô.** Mỗi lượt sinh của ô gồm bài và **gợi ý ảnh** (prompt). Khi Chia bài, ô ảnh của slot nhận prompt ghép từ gợi ý của ô + tên và gợi ý của ô ảnh trong Format. **Chia bài tạo luôn ảnh** (bản 1) cho mọi ô ảnh và xếp ảnh vào vị trí khớp bài (mục 10.8). Ở slot: **Gen** tạo thêm phiên bản ảnh, `<` `>` chọn phiên bản. Ảnh chỉ nhắc, không chặn Xác nhận lịch. MVP: ảnh là hình giữ chỗ mô phỏng. | Checklist asset |
| D107 | **Menu bốn mục: Dashboard · Matrix · Export · Setup.** Dashboard: lịch tuần (đổi sang tháng được), thao tác **Lập tuần** và **Duyệt slot**. Matrix: một bảng, hàng là Topic (nạp, nạp lại, hủy), cột là Cột; thao tác ô (viết, sửa, duyệt, tạo lại, hủy) và **Chia bài**; Matrix đi theo tuần đang chọn ở Dashboard. | Menu v2.7 |
| D108 | **Thanh tiến độ 7 bước:** Lập tuần · Nạp Topic · Viết ma trận · Duyệt ô · Chia bài · Duyệt slot và ảnh · Xác nhận và xuất. Bỏ khái niệm "Xác nhận ma trận". | 8 bước |
| D109 | **Chia bài tạo luôn ảnh**, bố trí theo bài: carousel mỗi slide một ảnh, ảnh-thẻ có chữ trên ảnh lấy từ bài (mục 10.8). | D106 (Gen tay sau Chia bài) |
| D110 | **Tải ảnh của bạn lên** ô ảnh của slot, thành một phiên bản; viết lại slot không gen đè ảnh tải lên (mục 10.9). | — |
| D111 | **Sửa và Duyệt trong popup Xem như khi đăng**: sửa chữ ngay trong khung bài, ảnh/quy tắc/điểm ở dưới (mục 10.10). | — |
| D112 | **Sửa ảnh ngay trên khung bài** khi bấm Sửa: <, >, Gen, Prompt, Up; prompt sửa tay được giữ khi slot viết lại (mục 10.11). | — |
| D113 | **Tạo bài ngay trong slot** (nút Tạo bài, Thêm và tạo bài) khi Cột có ô Đã duyệt; hướng thứ hai bên cạnh Chia bài (mục 10.12). | — |
| D114 | **Cấu hình slot ở giữa màn hình**, phần trên là **sơ đồ layout của Format** (mục 10.13). | Chi tiết slot trượt từ bên phải |
| D115 | **Cấu hình slot** (bỏ nội dung), bấm thẻ ra View, **bánh răng** thay mắt mở Cấu hình slot (mục 10.14). | Chi tiết slot, nút mắt |
| D116 | Nút "Mở ô" đổi thành **Mở Cell**; **Chi tiết Cell** hiện giữa màn hình (mục 10.15). | — |
| D117 | **Phân cấp thị giác** cho Ô nguồn và Vị trí đăng trong Cấu hình slot (mục 10.16). | — |
| D118 | **Thẻ slot**: ảnh xếp chồng kèm số ảnh (bỏ chữ "Ảnh"); nút **Duyệt** cạnh nút Cấu hình, tắt khi đã duyệt (mục 10.17). | Chip hiện "Ảnh n/m" |
| D119 | **Slot tự do**: kênh + Format, tự viết bài, tải ảnh/video; không lấy nguồn từ Matrix (mục 10.18). | Mọi slot lấy từ ô |
| D120 | **Cột của slot tự do là tuỳ chọn**: khi tạo, hệ thống đề xuất Cột theo Format, người dùng giữ hoặc chọn "Không" (None, đứng đầu danh sách); sửa lại ở Cấu hình slot (mục 10.19). | Cột bắt buộc theo Format |
| D121 | **Slot chọn được Cột khác Cột đề xuất của Format**: danh sách Cột gồm Không (None), Cột đề xuất, các Cột khác; mặc định Cột đề xuất (mục 10.20). | Format gắn cứng 1 Cột |
| D122 | **Slot tự do: layout chỉ để xem, ảnh/video chọn ở mục media bên dưới**; layout hiện đúng số ô đã có media theo cách từng kênh hiển thị (mục 10.21). | Nút ảnh nằm trên khung bài |
| D123 | **Đăng bài theo kênh: Tự động hoặc Thủ công.** Mỗi kênh chọn cách đăng ở Setup → Kênh. Tự động đi qua một trong ba đường: API riêng của nền tảng, Metricool hoặc Postiz; đăng xong hệ thống tự gắn link vào slot. Thủ công: người dùng tự đăng, dán link vào slot và bấm Đánh dấu đã đăng. MVP (R4): đường Tự động là **mô phỏng** (link giả). | Chỉ đánh dấu tay |
| D124 | **Chỉ tự đăng slot của tuần Đã chốt.** Slot Đã duyệt của tuần Nháp/Đang sửa không tự đăng dù đến giờ (hiện là Trễ). | Tự đăng mọi slot đã duyệt |
| D125 | **Số liệu bài đăng theo mốc 1 giờ, 24 giờ, 7 ngày**, mỗi nền tảng một bộ chỉ số riêng; nguồn số liệu chọn theo kênh (API, Metricool, Postiz, Không). Bài đăng thủ công chỉ lấy được số liệu khi đã có link (Metricool khớp bài theo link). MVP: số liệu mô phỏng xác định. | Một bộ chỉ số chung |
| D126 | **Màn Report** (trước gọi là Báo cáo) (menu mới): Overview, Tuần, Tháng; lọc theo kênh; so với kỳ trước. | Chỉ chip chỉ số ở Dashboard |
| D127 | **Đồng hồ demo tua được** (+1 giờ, +1 ngày, +1 tuần, đặt giờ) để thấy tự đăng và số liệu chạy theo thời gian. Bỏ khi có máy chủ thật (R5). | Giờ demo cố định |
| D128 | **Lộ trình sau MVP:** R5 máy chủ + cơ sở dữ liệu + lịch đăng chạy nền; R6 nối thật kênh đầu tiên (Metricool hoặc Meta FB + IG); R7 các kênh còn lại, khớp số liệu bài đăng tay theo link; sau đó quản lý mạng xã hội (gom và trả lời bình luận). | — |
| D129 | Thẻ slot đã đăng ở Dashboard có **hàng chỉ số trực tiếp**: tiếp cận/xem, tương tác, bình luận (hoặc chỉ số đặc trưng), kèm ▲ phần tăng; đồng hồ demo chạy theo giờ thật, làm mới 30 giây. Màn Báo cáo đổi tên **Report**. | 13/10/2026 |
| D130 | **Bài Đã đăng chỉ xem**, kể cả khi tuần Mở lại để sửa: không sửa chữ, ảnh, giờ, kênh, Format, không xóa. Chỉ bài chưa đăng và bài **Đăng lỗi** (quá giờ mà chưa đăng được) mới sửa được. Bài đăng tay giữ "Sửa thông tin đăng" (link, giờ) và "Bỏ đánh dấu"; bài tự đăng không có hai nút này. | 13/10/2026 |
| D131 | Kênh hiển thị bằng **icon chính xác của nền tảng** (Simple Icons, CC0, nhúng SVG trong trang) thay ô màu. Thẻ slot chỉ hiện icon (tên ở title và cho trình đọc màn hình); nút lọc, Report, Setup hiện icon + tên. | 13/10/2026 |
| D132 | Bài trong Cell, Slot, Topic hiển thị có cấu trúc: nhãn [Mục] và # ## ### thành tiêu đề, mỗi dòng một đoạn, các bước và gạch đầu dòng thành danh sách. Bài mô phỏng chia đoạn 3 câu. Toàn app **một font Be Vietnam Pro** (bỏ Bricolage Grotesque), mono chỉ cho ô sửa Markdown; cỡ chữ theo thang 7 bậc 12/13/14/15/18/22/28px. | 13/10/2026 |
| D133 | Chi tiết Topic mở **giữa màn hình** như Cell. Hộp Topic và Cell phân cấp thị giác chung: đầu hộp (tên, trạng thái, thao tác) → định hướng (viền màu) → nội dung chính (thẻ nổi, tiêu đề lớn nhất) → thẻ phụ → mục thu gọn. | 13/10/2026 |
| D134 | Sửa Topic/Cell bằng **trình chỉnh sửa Markdown cơ bản** (Tiêu đề mục, Đậm, •, 1., Bước, Hoàn tác; Viết/Xem trước); sửa slot mạng xã hội chỉ có •, danh sách số, emoji (nền tảng không hiện Markdown), Blog có thanh đầy đủ. Bài ô viết theo **Khung trình bày** của Cột (đề mục `## Tên đoạn`, đoạn ≤3 câu/80 chữ, mỗi bước một dòng, ≤2 chỗ in đậm mỗi mục), khung đi kèm lệnh cho AI; quy tắc **HR-13 Trình bày** (mức nhắc) và nút **Định dạng lại**. Chia bài gỡ Markdown cho slot mạng xã hội. | 13/10/2026 |
| D135 | View của bài **Đã đăng** hiện số liệu **sát icon nền tảng** như bài thật (số gọn, rê chuột ra số đầy đủ và giờ đo, nhãn đọc màn hình); số không có icon trên bài thật (Reach, Giờ xem, Đọc TB) và tỷ lệ tương tác nằm ở dải **"Chỉ bạn thấy"** dưới khung bài kèm nút Xem bảng số liệu. Bài chưa đăng không hiện số (bỏ các số 0 giả). | 13/10/2026 |
| D136 | **Khung Topic** (Setup → Khung Topic): danh sách mục chuẩn của một Topic theo thứ tự, mỗi mục có tên gọi khác và kiểu hiển thị (Đoạn văn, Số liệu nổi bật, Các bước đánh số, Ngộ nhận ↔ Thực tế, Hỏi – đáp, Khung trích dẫn), đánh dấu không bắt buộc. Tệp Topic được **chuẩn hoá theo khung khi nạp** (xem trước danh sách thay đổi, giữ tệp gốc), Topic hiển thị theo kiểu từng mục, lệnh cho agent nghiên cứu ghép từ khung. | 13/10/2026 |
| D137 | Đổi ngày slot bằng **kéo thả** trên lịch tuần, trong cùng tuần, **giữ giờ**; thả xong luôn hỏi **xác nhận** (từ ngày, sang ngày, giờ, cảnh báo), có **Hoàn tác**. Không kéo bài Đã đăng, không chuyển về ngày giờ đã qua; tuần đã chốt thì xác nhận kèm Mở lại tuần. Trên điện thoại dùng ô Ngày trong Cấu hình slot. | 13/10/2026 |
| D138 | **Ghép frame** (vẽ thật bằng canvas trong trình duyệt): thư viện frame ở Setup → Frame ảnh gồm 5 khung dựng sẵn theo màu thương hiệu (Vuông 1:1, Dọc 4:5, Story 9:16, Ngang 16:9, Ảnh bìa 1200×630) và frame PNG nền trong suốt của công ty (vùng đặt ảnh, vị trí và cỡ chữ tiêu đề/phụ đề). Nút **Frame** trên ảnh: chọn frame (cùng tỉ lệ ô ảnh xếp trước), sửa tiêu đề (gợi ý từ câu đầu bài) và phụ đề, xem trước, Xác nhận → **phiên bản ảnh mới** (JPEG), bản gốc giữ nguyên. **Image to Image** chạy **mô phỏng**: ảnh thật được đổi màu bằng bộ lọc theo từ khoá yêu cầu và mức biến đổi; ảnh mô phỏng sinh hình mô phỏng mới; khi gắn API thật chỉ thay phần dựng ảnh (`i2iEngine`). | 13/10/2026 |
| D139 | **Thêm chữ lên ảnh** (vẽ thật bằng canvas): nút **Chữ** trên ảnh mở trình soạn nhiều lớp chữ (tối đa 8), mỗi lớp chọn nội dung, font (6 font hỗ trợ tiếng Việt), cỡ, màu, đậm/nghiêng, căn lề, bề rộng khối, hiệu ứng (bóng đổ, viền chữ, nền mờ); **kéo chữ trên ảnh** hoặc phím mũi tên để đặt vị trí, có Đặt nhanh Trên/Giữa/Dưới. Xác nhận → phiên bản ảnh mới, bản gốc giữ nguyên. | 13/10/2026 |
| D140 | **Trợ lý viết** trên thanh soạn bài (slot và ô): **✨ Sửa đoạn** (đoạn bôi đen hoặc đoạn chứa con trỏ; Ngắn lại, Dài hơn, Thân mật, Trang trọng, Thêm CTA, Thêm emoji, Mở bài hấp dẫn hơn, Sửa chính tả, hoặc gõ yêu cầu; xem và sửa kết quả trước khi thay), **Hook** (5 hook theo loại Câu hỏi, Con số, Bất ngờ, Câu chuyện, Lợi ích; 3 caption Ngắn, Vừa, Đầy đủ; loại hook đã chọn lưu vào slot để so với số liệu sau). Hai phần này **mô phỏng** (mục 0.6). **# CTA**: thư viện hashtag và lời kêu gọi **chạy thật**, quản lý ở Setup → Hashtag & CTA, lọc theo Cột và kênh, đếm lượt dùng. | 13/10/2026 |
| D141 | **Cắt, xoay, đổi tỉ lệ ảnh** (nút **Cắt** trên ảnh, chạy thật): tỉ lệ Giữ gốc, 1:1, 4:5, 9:16, 16:9, 1200×630 (tỉ lệ của ô ảnh chọn sẵn), xoay 90°, lật ngang, phóng tới 400%, kéo khung để chọn vùng; Xác nhận → phiên bản mới; **Tải đủ 5 khổ (ZIP)** từ cùng một ảnh cho các kênh. **Mẫu thiết kế** (chạy thật): trong hộp Chữ bấm **Lưu thành mẫu** (bộ lớp chữ + frame tuỳ chọn); nút **Mẫu** trên ảnh áp mẫu, chỉ đổi chữ; quản lý ở Setup → Frame ảnh. | 13/10/2026 |
| D142 | **Kho tài sản** (chạy thật): Setup → Kho tài sản (tải nhiều ảnh, nén khi thêm, đặt tên, thẻ, tìm, lọc, đếm lượt dùng, xoá); nút **Kho** trên ảnh chọn ảnh từ kho hoặc lưu ảnh đang dùng vào kho. **Soạn carousel** (chạy thật): sửa chữ từng slide, đổi thứ tự (ảnh đi theo), thêm, bỏ slide. **Chuyển kênh** (mô phỏng): viết lại bài cho Format kênh khác thành slot tự do mới, chép ảnh đang dùng. | 13/10/2026 |
| D143 | **Ảnh AI thật qua API** (Setup → AI ảnh & video): chọn OpenAI, Stability AI hoặc máy chủ riêng, nhập model, địa chỉ, khoá (khoá chỉ ở trình duyệt, không vào sao lưu); Gen và Img2Img gọi API, ảnh về nén JPEG thành phiên bản "AI thật"; lỗi thì có nút Dùng mô phỏng. **Video:** nút **Bìa** (lấy khung hình hoặc tải ảnh) và **Phụ đề** (tạo từ bài: mô phỏng thời gian; nhận giọng nói qua OpenAI; nhập/tải .srt, .vtt; sửa từng dòng); ZIP xuất kèm ảnh bìa và .srt. | 13/10/2026 |
| D144 | **AI viết bài thật** (Setup → Kết nối AI → AI viết bài: Anthropic Claude mặc định `claude-sonnet-5-5`, OpenAI, máy chủ riêng; khoá riêng từng nhà cung cấp): Viết ma trận, Tạo lại ô/slot, Chia bài, Thêm và tạo bài, Cập nhật từ ô, Đổi ô nguồn, Sửa đoạn, Hook/caption gọi AI; AI viết theo hồ sơ Thương hiệu, Giọng văn, quy tắc Cột/Format/kênh, bản nháp máy làm khung bố cục, và chấm điểm theo tiêu chí. Lỗi thì hỏi dùng mô phỏng. **Ảnh, video cất IndexedDB** (chạy thật): localStorage chỉ giữ khoá, ảnh giống nhau cất một lần, video tối đa 25 MB. | 13/10/2026 |
| D145 | **Blog chuẩn SEO** (gộp kế hoạch bản 64, 65, 66 vào một bản): chuẩn SEO chung ở Setup → Chuẩn Blog; Thông tin SEO từng slot (từ khoá chính xác nhận tay, slug, tiêu đề SEO, mô tả, tóm tắt, mô tả ảnh bìa tự tạo theo bài trừ ô đã sửa tay); rà soát SEO có mục bắt buộc chặn Gửi lên web; chèn ảnh/video vào giữa bài (dòng `![mô tả](media:bm-N "chú thích")`, giữ khi viết lại); gắn link nội bộ/nguồn/CTA có UTM; kho bài đã đăng (CSV, sitemap) để gợi ý link và báo trùng từ khoá; gói bài JSON/MD/HTML + ảnh; **đăng lên web qua API của web** (token chỉ ở trình duyệt, tài liệu API tải về cho lập trình viên web). Search Console, sitemap tự động để ở R5. | 14/10/2026 |
| D146 | **Thanh công cụ ảnh gọn** ở mọi chỗ có ảnh (Xem như khi đăng, danh sách ảnh, ô media slot tự do, ảnh trong bài Blog): `<` `>` **Gen** **Up** **Store** **Edit**. Rê chuột (hoặc focus) lên Gen hiện nút Prompt nhỏ phía trên; ô chưa có prompt thì Gen mở ô Prompt. **Store** là kho ảnh chung dạng gallery. **Edit** mở giao diện sửa có tab Frame, Chữ, Img2Img, Cắt, Mẫu (video: Bìa, Phụ đề). Bỏ nút "Sửa" mô phỏng riêng (Img2Img thay). | 14/10/2026 |
| D147 | **Chuẩn ảnh theo nền tảng.** Mỗi ô ảnh có tỉ lệ rõ (`a.ratio`) lấy từ bảng chuẩn: Facebook 1:1, Instagram 4:5, Threads 1:1, TikTok 9:16, YouTube 16:9, Blog bìa 1.91:1 (1200×630), ảnh trong bài Blog 16:9; sửa được ở Setup → Chuẩn ảnh. Mọi nơi hiện **trọn ảnh** theo tỉ lệ ô (bỏ khung cắt 420px của Facebook). Gen, Frame, Cắt, Chữ, Mẫu, xuất đều theo tỉ lệ ô. Ảnh tải lên lệch tỉ lệ: cảnh báo IMG-01 (không chặn Duyệt) kèm nút **Cắt về X** (cắt giữa, phiên bản mới, giữ bản gốc), không tự cắt. Frame khác tỉ lệ ô: hỏi trước khi đổi tỉ lệ ô. Tính năng Blog (SEO, chấm điểm, chèn media, link, AI brief, gói, gửi web) chỉ khi Format có kiểu **Bài Blog** (`isBlogSlot` chỉ xét layout). | 14/10/2026 |
| D148 | **Slot tự do đếm slide theo ảnh (M-11).** Quy tắc HR-06 số slide của Album/Carousel với slot tự do dùng số ô có ảnh hiện tại; thông báo ghi "N ảnh, cần tối thiểu X". Giới hạn chữ mỗi slide vẫn tính theo chữ. | 14/10/2026 |
| D149 | **Hai model cho AI viết chữ.** Setup → Kết nối AI có ô "Model cho việc nhẹ" (tuỳ chọn; gợi ý claude-haiku-5-5 khi chọn Anthropic). Việc nhẹ (Sửa đoạn, Hook, CTA/caption) dùng model nhẹ; việc nặng (Chia bài, Tạo lại, Viết ma trận, bài Blog, chấm điểm) và nút Thử viết luôn dùng model chính. Để trống = dùng model chính cho mọi việc. Cùng một khoá API. | 14/10/2026 |
| D150 | **Nguyên tắc: Xem chỉ đọc, sửa hay thay đổi nội dung đều đi qua nút Sửa** (người dùng chốt 14/10/2026). Áp cho bài Blog: ở chế độ Xem không còn nút chèn ảnh/video, không có công cụ trên ảnh trong bài, không có Xoá, Mô tả, Chèn cuối bài, Chuẩn hoá, Gắn link, Bỏ link, Xác nhận từ khoá, Sửa thông tin SEO; slot tự do ẩn mục Ảnh và video ở chế độ Xem. Ở chế độ Sửa: nút 🖼 Ảnh/video chèn tại con trỏ; ảnh/video hiện tại vị trí chèn kèm đủ công cụ (xem D151); thay đổi nằm trong bản nháp, ghi khi Lưu (riêng Xoá ảnh bỏ ngay ô ảnh sau khi xác nhận). Chưa áp cho các nút quy trình ở Xem (Tạo lại, Duyệt, Đăng, Hoàn tác, Dùng bản cũ). | 14/10/2026 |
| D151 | **Ô Sửa bài Blog dạng khối** (theo góp ý 14/10/2026): ảnh/video hiện ngay tại vị trí chèn, giữa hai đoạn chữ, kèm ảnh xem trước và đủ nút (Gen, Up, Store, Edit, Mô tả, Xoá). Mỗi đoạn chữ là một ô soạn; thanh Markdown, Sửa đoạn, 🖼 Ảnh/video, Link tác động lên đoạn đang đứng; Hook và CTA tác động lên đoạn đầu. Lưu thì ghép lại thành một bài Markdown như cũ. Hạn chế: không bôi đen chữ liền qua một ảnh. | 14/10/2026 |
| D152 | **Mục Short Vid** trên menu (Dashboard · Matrix · Short Vid · Report · Export · Setup). Dùng chung kho Topic của tuần với Matrix, nạp thêm được chủ đề chỉ cho video (không tạo ô Matrix). Mỗi video tự đứng được, một Insight; kịch bản gồm Insight · Script · Prompt (Audio cho đoạn máy nói, Hình ảnh). | 16/10/2026 |
| D153 | **Số video theo Topic do AI đề xuất kèm lý do**, không cố định; người dùng bỏ, gộp, sửa, đổi Format/kiểu rồi Duyệt danh sách. Kịch bản 140–200 chữ (nhắm 150, ≈ 60 giây ở 2,5 chữ/giây). Hai kiểu: Bản tin (người dẫn 15–25 chữ, phần tin giọng máy, chốt một câu) và Người nói hết; mục tiêu tuần 7 video (tối thiểu 3), tỉ lệ 3 Bản tin / 4 Người nói, chỉnh ở Setup. | 16/10/2026 |
| D154 | **7 Format Short Vid** ở Setup → Short Vid (thêm, sửa, tắt, xóa; mỗi Format gắn Skill như Cột/Format): Giải thích nhanh, Mẹo một kỹ năng, Ngộ nhận và sự thật, Thử thách nhanh, Câu chuyện học viên, Bản tin kiến thức, Trả lời câu hỏi người xem. Căn cứ và độ tin cậy: `notes/short-vid-format-va-cong-cu.md`. | 16/10/2026 |
| D155 | **Hủy / Khôi phục** từng kịch bản: kịch bản hủy mờ đi, giữ nội dung, không cần nộp video, không tính KPI. KPI tuần "x/y có thành phẩm" (y = kịch bản đã duyệt Insight, không hủy) ở Short Vid và Dashboard. | 16/10/2026 |
| D156 | **Vid tự do và nguồn vào**: hàng "Video tự do" (không đi từ Topic) trong ma trận Short Vid, tối đa 7 thẻ. Sáu cách nạp: có sẵn kịch bản, có sẵn giọng đọc, quay người nói, từ bài Matrix (ô Đã duyệt), b-roll ngắn, b-roll dài. Mọi cách đổ về cùng một dự án dựng (`v.edit`). | 16/10/2026 |
| D157 | **Bàn dựng mô phỏng ở MVP**: cảnh (lời, thời lượng, hình/clip hoặc thẻ giữ chỗ kèm prompt, chữ phủ), giọng (giọng máy của trình duyệt, file giọng, tiếng trong clip, tự thu), caption (đầy đủ / chữ nhấn ý; dưới/giữa/trên), frame (nhãn thương hiệu, dải màu, PNG 9:16 của Setup → Frame), nhạc nền có ô nguồn/giấy phép; xem trước theo dòng thời gian trong trình duyệt; xuất **lệnh dựng JSON** (không nhúng tệp). Chưa xuất file video: để dành bộ xuất của PC app/web app. Đo khoảng lặng của clip quay người nói là thật (Web Audio); đọc hiểu b-roll và tách đoạn b-roll dài là mô phỏng. | 16/10/2026 |
| D158 | **Đưa vào lịch** thay phần slot video của Đợt 2: video có thành phẩm → mỗi kênh video ngắn (kênh TikTok/Instagram/Facebook/YouTube có Format layout `script`) một **slot tự do có `videoId`**, cùng ngày giờ; caption từng kênh viết từ kịch bản (AI hoặc mô phỏng), sửa và duyệt trong View. Viết slot bỏ qua (slot tự do). Không thêm Format slot mới, không thêm Tuần mẫu video; thẻ Vid có trạng thái Đã lên lịch / Đã đăng; Bỏ khỏi lịch xóa slot chưa đăng. | 16/10/2026 |
| D159 | **Popup thẻ Vid bản 1** (mẫu `notes/mau-popup/popup-vid-mau.html`, `AC.VID_POPUP_VER` = 1): header 2 tầng. Tầng trên **Kịch bản / Biên tập / Xếp Slot** (Xếp Slot khóa đến khi có video hoặc bấm Hoàn thành ở Biên tập); tầng dưới là menu phụ: Kịch bản = Insight / Script / Scene (+ Nguồn vào cho Vid tự do), Biên tập = Trong app / Ngoài app, Xếp Slot = lưới Thứ × Kênh. Mọi chỉnh sửa popup thử ở file mẫu trước (bản 2, 3…), người dùng duyệt rồi mới ráp vào app. | 16/10/2026 |
| D160 | **Cảnh nhiều hình, VO toàn bài và VO cảnh**: mỗi cảnh có `items[]` (thay `asset`), chia đều thời lượng cho các hình, mỗi hình tối thiểu 1 giây, cảnh không dưới 1,5 giây và không ngắn hơn VO của cảnh. VO (toàn bài cạnh ô Mẫu, cảnh thay nút Thu giọng) đều Up hoặc Gen AI; VO toàn bài đã có tệp thì VO cảnh bị khóa nhưng dữ liệu giữ; VO cảnh bám đầu hình đầu tiên của cảnh. Có VO toàn bài: kéo mép cảnh là dời ranh giới hai cảnh, tổng cố định; không có: các cảnh sau dồn theo. Hoàn trả đưa về độ dài mặc định. | 16/10/2026 |
| D161 | **Caption theo timeline**: kéo cảnh không tự đổi caption, chỉ hiện nhãn "Caption chưa khớp timeline"; bấm Gen caption mới chia lại theo timeline mới, giữ chữ đã sửa tay (Chia lại hết thì bỏ). Quản lý caption: sửa chữ, giây bắt đầu, Tách, Gộp. 4 kiểu hiển thị, vị trí, vùng an toàn, frame minh họa (frame của ảnh 9:16), nhạc nền tự hạ khi có giọng, hoàn tác/làm lại 40 bước, tự lưu. | 16/10/2026 |
| D162 | **Xếp Slot theo ô**: người dùng chọn ô Thứ × Kênh (mỗi kênh một ngày cho mỗi video; ô đã có video khác bị khóa); Đưa vào lịch vẫn cần file video thành phẩm (bộ xuất chưa có), nếu chưa có thì tab giải thích và cho Xuất lệnh dựng (JSON, bản 2) hoặc sang Ngoài app để Up video. | 16/10/2026 |
| D163 | **Popup thẻ Vid bản 4** (`AC.VID_POPUP_VER` = 4, mẫu `notes/mau-popup/popup-vid-mau.html`, bản 1–3 lưu `popup-vid-mau-ban1/2/3.html`): tab bên trái; bên phải ‹ Bản n/N › và **Tạo Kịch bản** (thay Viết kịch bản / Tạo lại; Vid nạp sẵn kịch bản không có nút này, Vid từ ghi âm / quay người nói vẫn là Chép lời). Một phiên bản gồm kịch bản, Insight và toàn bộ phần biên tập; giữ 5 bản gần nhất; bản cũ chỉ xem, có **Dùng bản này** (chép thành bản mới nhất). Tạo Kịch bản tạo bản mới chưa có cảnh. Bỏ nút Duyệt kịch bản: Chia cảnh hoặc sang tab Biên tập là duyệt (trạng thái APPROVED giữ để KPI không đổi); Duyệt Insight vẫn giữ. Kịch bản: menu Insight / Phân cảnh (+ Nguồn vào); Phân cảnh là bảng STT / Timeline / Nội dung / Mô tả hình ảnh / Gen ảnh, Script thu gọn bên dưới, sửa Script sau khi chia thì báo và có Chia lại cảnh. Ô Prompt Audio / Hình ảnh bỏ khỏi giao diện (dữ liệu giữ). | 16/10/2026 |
| D164 | **Độ dài từng hình**: mỗi hình có `d` (giây); cảnh = tổng các hình, mỗi hình ≥ 1 giây, cảnh không ngắn hơn VO cảnh. Kéo mép cảnh: các hình co giãn theo tỉ lệ; kéo vạch giữa hai hình: chỉ hình đó đổi (cảnh dài theo); có VO toàn bài thì tổng cố định, kéo chỉ dời ranh giới. Thêm VO cảnh thì cảnh dài đúng bằng VO. Gen ảnh mở khung riêng (mô tả lấy từ Phân cảnh, 4 phương án, chọn nhiều ảnh), gọi API ảnh khi đã bật ở Setup, chưa bật thì ảnh mô phỏng. Thẻ cảnh bỏ ô Mô tả hình, Chữ phủ. | 16/10/2026 |
| D165 | **Cue thay Chữ phủ**: cue bám vào một từ trong lời cảnh (`ed.cues`: cảnh, thứ tự từ, từ, lệch ±5 giây), giây của cue = giây của từ đó trong VO, nên cue dời theo khi cảnh trước dài ra hay ngắn lại. Giây từng từ hiện là mô phỏng (chia theo độ dài chữ, ngắt câu dừng lâu hơn; `alignWords`), thay bằng mốc từ thật của dịch vụ giọng nói hoặc Whisper ở một hàm. Cảnh chưa có VO thì cue chưa có giây. Sửa lời: cue tìm lại từ cũ, từ bị xóa thì cue báo đỏ để đặt lại. Mỗi cue có Icon, Text, SFX (bật riêng từng phần, hiệu ứng Hiện ngay / Nảy / Mờ dần, vị trí và cỡ kéo trên khung xem thử); lớp cue nằm trên hình. Chữ phủ cũ chuyển thành cue Text ở từ đầu cảnh. | 16/10/2026 |
| D166 | **Kho Icon / SFX dùng chung**: 40 icon, 35 SFX trong 6 nhóm (âm tổng hợp bằng trình duyệt, mô phỏng; bản thật là file có giấy phép). Yêu thích và Gần đây lưu ở `S.vidLib`, dùng chung mọi video và đi theo tệp sao lưu. Cue trên timeline: rê chuột xem tóm tắt, bấm mở popup sửa, ✕ ở góc để xóa. Lệnh dựng version 3 thêm `cues` và giờ bắt đầu / kết thúc từng hình. | 16/10/2026 |
| D167 | **Hiệu ứng tự động, chỉnh khi cần** (popup bản 5): chuyển cảnh (Cắt, Mờ dần, Trượt, Zoom, Wipe, Nháy sáng) và chuyển động ảnh tĩnh (Đứng yên, Zoom vào/ra, Lia 4 hướng, Ken Burns). Mặc định chung ở Cài đặt → Hiệu ứng, ban đầu "Tự động"; mỗi scene có chip ✦ mở cửa sổ chỉnh riêng và nút Về tự động. Tự động: ảnh luân phiên Zoom vào, Lia trái, Zoom ra, Lia phải; chuyển cảnh Cắt, Mờ dần khi sang phần mới và vào scene chốt. | 16/10/2026 |
| D168 | **Chuyển động chỉ áp dụng cho ảnh**: video không bao giờ nhận chuyển động, kể cả trong scene lẫn ảnh và video, và kể cả khi scene hoặc cài đặt chung chọn kiểu riêng (kiểm theo từng hình trong `motionOf`). Scene chỉ có video khóa ô Chuyển động. Chuyển cảnh vẫn áp dụng cho cả scene. | 16/10/2026 |
| D169 | **Scene 1 mặc định không có hiệu ứng vào** (Cắt, cài đặt chung không áp), người dùng vẫn chọn được. | 16/10/2026 |
| D170 | **Bố cục Biên tập gọn**: hàng Mẫu dựng / VO toàn bài / Up / Gen AI / ↺ Kịch bản gốc / Tổng một dòng; cột Scene cao bằng khung xem thử và cuộn bên trong; Scene chọn ở một bên thì khối bên kia sáng, chọn ở timeline thì Scene cuộn lên mép trên. Thanh thời gian dưới khung xem thử, nút Phát + Replay. Xóa scene và Kịch bản gốc đều hỏi xác nhận. Tên hiển thị "Scene n". | 16/10/2026 |
| D171 | **Ô → Slot một chiều có điều kiện**: slot chỉ viết khi người dùng bấm (Tạo bài, Tạo lại), từ bản mới nhất của ô lúc đó; ô đổi sau đó không lan sang slot. Bỏ cờ "Cần cập nhật", "Cập nhật từ ô", "Giữ bản slot"; Chốt lịch không bị chặn vì nguồn đổi. Ô nguồn có bản mới thì slot hiện dấu **"!" vàng** ở góc: bấm để Tạo lại theo bản mới hoặc Tắt cảnh báo (hiện lại khi ô có bản mới hơn nữa). Tạo lại cần Matrix đã khóa ("Vui lòng đóng khóa Matrix") và hỏi lại khi ô đã đổi. Lịch sử slot giữ 5 bản. | 17/10/2026 |
| D172 | **Duyệt là khóa**: slot Đã duyệt hiện icon khóa, không Sửa / Tạo lại / đổi ô được; bấm Mở khóa thì slot về Chưa duyệt. Chốt lịch tuần và tự đăng giữ như cũ. | 17/10/2026 |
| D173 | **Xóa ở tầng trên không xóa bài slot**: xóa ô, Topic, Cột, cả Matrix, hay đổi Format/Cột của slot thì slot giữ bài (nhãn "Ô nguồn đã bị xóa"); Tạo lại sẽ viết từ một ô Đã duyệt khác cùng Cột. | 17/10/2026 |
| D174 | **Kịch bản → Biên tập một chiều**: khóa kịch bản = Đã duyệt (nút Khóa Kịch bản / Mở khóa, icon khóa, ô lời nói chỉ đọc khi khóa). Chia cảnh, Hoàn thành, Ren, đổi mẫu dựng, dùng bản biên tập cũ chỉ làm khi kịch bản đã khóa; sang tab Biên tập tự khóa. Tạo Kịch bản mới, dùng bản kịch bản cũ, sửa lời không xóa phần biên tập; Biên tập báo **"Kịch bản đã đổi"** với Cập nhật theo kịch bản (chia lại cảnh, bản cũ vào lịch sử) hoặc Bỏ qua. Lịch sử kịch bản và **lịch sử biên tập** tách riêng, mỗi loại 5 bản. Thẻ ghi phiên bản Topic đã dùng; Topic đổi thì báo "Topic đã đổi". | 17/10/2026 |
| D175 | **Video → Slot video**: slot chép video lúc xếp; xóa ở Kho hay Bỏ video ở thẻ không ảnh hưởng slot. Ren lại hoặc Up tệp khác thì slot chưa đăng hiện dấu "!" vàng: Cập nhật video (chép video, phụ đề mới; caption giữ; slot Đã duyệt về Chưa duyệt để duyệt lại), Cập nhật cả các slot của thẻ, hoặc Tắt cảnh báo. Thumbnail vẫn tự sang bìa slot như 10.87. | 17/10/2026 |
| D176 | **Icon khóa là trạng thái**: khóa đóng = đang khóa (không sửa nội dung, không Tạo Kịch bản mới), khóa mở = đang mở. Áp dụng cho slot (Duyệt), Matrix, Kịch bản, Biên tập. | 17/10/2026 |
| D177 | **Xong khâu nào khóa khâu đó**: tab Biên tập chỉ mở khi Kịch bản đã khóa (xong Phân cảnh; bỏ việc tự khóa khi sang Biên tập); Hoàn thành = Biên tập khóa (Ren, Xuất lệnh dựng, Thumbnail vẫn làm được; Mở khóa để sửa); tab Xếp Slot chỉ mở khi đã Ren hoặc Up video. Matrix khóa thì Nạp Topic, Nạp lại, Thêm/Bớt Cột mờ. Nút Lưu giữ nguyên (tự lưu làm sau). | 17/10/2026 |
| D178 | **Duyệt = lưu bản (Short Vid)**: Kịch bản có menu `‹ Bản n/N ›` + **Duyệt Kịch bản** (đã duyệt thì thành **Sửa Kịch bản**); bản chỉ lưu khi bấm Duyệt, bản đang sửa là "nháp" mang số kế tiếp. Bỏ bước Duyệt Insight: Insight sửa như cũ, lọc đề xuất ở màn chính giữ nguyên. Phân cảnh có **Tạo mới** = viết kịch bản + chia cảnh (ghi đè bản nháp, không thêm bản). Đã duyệt thì cả Kịch bản mờ, tên tab có icon khóa. Bỏ nút Đóng/Lưu dưới đáy, tự lưu; giữ X để đóng. | 17/10/2026 |
| D179 | **Biên tập chỉ còn trong app**: bỏ "Biên tập ngoài app" (Up video cho slot làm ở Dashboard). Menu `‹ Bản n/N ›` + **Duyệt Biên tập** (duyệt cả nội dung các cảnh và video đã ren) / **Sửa Biên tập**. Ren được nhiều lần khi đang sửa; mỗi bản Biên tập = nội dung + video ren mới nhất (nếu có), lưu khi Duyệt. Duyệt được khi chưa ren; đã có video thì video phải khớp bản biên tập (lệch thì Ren lại trước). Xếp Slot chỉ mở khi Biên tập đã duyệt và có video khớp (= video thành phẩm, ô Vid ở màn chính có icon ✓ tròn). Khi đang sửa có **Hủy Biên tập** ở đáy: bỏ mọi thay đổi (kể cả video ren sau đó), về bản đã duyệt gần nhất và khóa lại. Đã duyệt thì tên tab có icon khóa. Thẻ cũ có video Up ngoài app vẫn dùng được. | 17/10/2026 |

## 0.4. Mặc định (đổi được ở Setup)

| Mục | Mặc định |
|---|---|
| Số Topic mỗi tuần | Theo tệp nạp (tối đa kỹ thuật 8) |
| Số Cột | 5 (thêm/bớt được, tối thiểu 1) |
| Tuần mẫu | 3: "Tuần chuẩn" 17 slot, "Tuần nhẹ" 9 slot (đều đủ 7 ngày); "Fanpage Facebook" 8 slot, chỉ Facebook, T2–T6 (10.65) |
| Số phương án mỗi lượt sinh | 1 |
| Ngưỡng "nên xem lại" của điểm AI | tổng < 70/100 (chỉ là nhãn) |
| Múi giờ | UTC+7; đồng hồ demo `demoNow` mặc định 12/10/2026 09:00 |

## 0.5. Mục mở

| # | Vấn đề | Đề xuất (dựng theo đề xuất nếu không có ý kiến khác) |
|---|---|---|
| M-1 | Nạp lại Topic sau khi đã Chia bài | Topic đổi nội dung → phiên bản mới, ô của phiên bản mới Trống (nên Chia bài khóa lại); slot dùng ô cũ "cần cập nhật". |
| M-2 | Viết ma trận có viết lại ô Đã hủy không? | Không. Muốn có bài thì bấm Tạo lại ở chính ô đó. |
| M-3 | Di trú dữ liệu cũ | Hoãn: cất bản thô, nạp demo mới. |
| M-5 | Cột Luyện tập lấy chất liệu từ Topic **tuần trước** (lặp cách quãng) | **P2, hoãn.** |
| M-7 | Sửa Topic trực tiếp (không nạp lại tệp) | **Đã dựng ở R2′:** sửa tay tạo phiên bản mới (lý do "sửa tay"); tệp Topic đã nạp giữ nguyên. |
| M-8 | Chia bài khi tuần đã có slot có nội dung | Chỉ điền slot còn trống; không động tới slot đã có bài. |
| M-9 | Đổi Format của slot sang Cột khác sau Chia bài | Hộp xác nhận; slot mất ô nguồn và về "Chưa có bài" (giữ các bản ảnh đã Gen). |
| M-10 | Nút **Sửa** trên ô ảnh/video (mục 10.21) nghĩa là gì? | **Đã chốt (13/10/2026):** sửa ảnh theo yêu cầu: nhập yêu cầu chỉnh ảnh, tạo thêm một phiên bản (mô phỏng). |
| M-11 | Quy tắc kênh của slot tự do | **Đã dựng (10.43, 14/10/2026):** slot tự do dạng Album/Carousel đếm số slide theo số ô có ảnh; slot lấy từ Matrix vẫn đếm "Slide" trong chữ. |
| M-12 | Một Format có nhiều Cột đề xuất? | Hiện mỗi Format một Cột đề xuất; slot chọn được Cột khác (10.20). Nhiều Cột đề xuất chưa làm. |

## 0.6. Tính năng mô phỏng và chỗ thay khi gắn thật

Danh sách các phần trong MVP đang **giả lập** (cho kết quả xác định theo đầu vào, giao diện ghi "Mô phỏng"), và chỗ thay khi gắn AI, API hoặc máy chủ thật. Phần không có ở đây là **chạy thật** trong trình duyệt. Cập nhật mỗi khi thêm tính năng.

| Tính năng | Đang làm gì (mô phỏng) | Thay ở đâu khi gắn thật | Mục |
|---|---|---|---|
| Viết bài ô và slot (Sinh, Tạo lại, Chia bài) | Khi chưa bật AI viết bài: ghép câu từ Topic theo khung Cột, chấm điểm theo hash. **Khi bật (Setup → Kết nối AI): AI thật viết và chấm điểm** (Anthropic Claude, OpenAI, máy chủ riêng); bài AI lỗi thì dùng bản mô phỏng | Bộ ghép `src/logic/04-mock.js`; đường thật `aiPlan`/`aiCellText`/`aiSlotText`/`parseAiPost` (`src/logic/05o-aitext.js`), `withAiText` (`src/ui/04k-aitext.js`) | D101–D110, 10.39 |
| Ảnh Gen theo prompt, Sửa ảnh theo yêu cầu | Hình giữ chỗ SVG theo seed khi chưa bật API. **Gen đã gọi API thật được** (OpenAI, Stability AI, máy chủ riêng) khi bật ở Setup → AI ảnh & video; "Sửa" (ảnh mô phỏng) vẫn mô phỏng | `genSlotImage`, `editSlotImage` (05-model); đường thật: `apiGenImage`, `imageApiCall` (`src/ui/04j-media.js`), `buildImageRequest`/`parseImageResponse` (`src/logic/05n-media.js`); khi có máy chủ (R5) chuyển gọi API sang máy chủ để giấu khoá | D106, 10.21, 10.38 |
| Image to Image | Khi chưa bật API: ảnh thật được lọc màu theo từ khoá (`i2iLook`), ảnh mô phỏng sinh hình mới. Khi bật API: gọi thật (OpenAI `/images/edits`, Stability `image-to-image`, máy chủ riêng) | `i2iEngine` (`src/ui/04e-frame.js`) | 10.33, 10.38 |
| Sửa đoạn bằng AI | Khi chưa bật AI: biến đổi theo quy tắc: rút câu, đổi từ trang trọng ↔ thân mật, thêm CTA/emoji, sửa dấu câu | `aiRewrite` (`src/logic/05k-assist.js`), giữ dạng trả về `{ok, text, ops}` ; khi bật: AI thật (`rewriteJob`) | 10.35, 10.39 |
| Phương án hook và caption | Khi chưa bật AI: 5 mẫu câu theo loại hook từ ý chính; 3 caption ghép hook + câu đầu + CTA + hashtag | `hookOptions`, `captionOptions` (05k-assist) ; khi bật: AI thật (`hooksJob`, `captionsJob`) | 10.35, 10.39 |
| Chuyển bài sang kênh khác | Ghép lại câu của bài gốc theo khung Format đích (carousel, kịch bản, bài dài, bài thường), thêm hook, CTA, hashtag theo giới hạn kênh | `convertPost` (`src/logic/05m-studio.js`) trả `{ok, text}`; `repurposeSlot` giữ nguyên | 10.37 |
| Phụ đề "Tạo từ bài" | Chia bài thành câu phụ đề, thời gian ước lượng theo độ dài câu (chưa nghe video). "Nhận giọng nói" qua OpenAI là thật | `subtitleDraft` (`src/logic/05n-media.js`); đường thật `buildSttRequest`/`parseSttResponse` | 10.38 |
| Phân tích Topic và viết kịch bản Short Vid | Khi chưa bật AI viết bài: tách ý theo mục chuẩn của Topic (Ngộ nhận, Câu hỏi, Cách làm, Vì sao, Trường hợp, số liệu), khoảng 250 chữ Topic cho một video, cân đối kiểu theo tỉ lệ; kịch bản ghép câu của Topic theo bố cục Format, không trùng câu giữa các video. Khi bật: AI trả JSON Insight / kịch bản | `mockInsights`, `mockScript` (`src/logic/05s-shortvid.js`); lời nhắn `vidAnalyzeJob`, `vidScriptJob` | 10.72 |
| Vid tự do, bàn dựng, Đưa vào lịch | Mô tả b-roll theo tên tệp và độ dài; b-roll dài chia đều N giây; ý tưởng kịch bản b-roll theo mẫu; lời dẫn ghép theo mô tả; gợi ý cắt mỗi 8 giây khi không đọc được tiếng clip; xem trước bằng DOM + SpeechSynthesis; caption đăng kèm theo mẫu từng nền tảng. Thật: đo khoảng lặng (Web Audio), chép lời bằng API nhận giọng nói (OpenAI, Setup → AI ảnh & video), AI viết lời dẫn/caption khi bật | `mockDescribe`, `splitLongRoll`, `brollIdeas`, `freeMockScript`, `mockCuts`, `mockCaption` (`src/logic/05t-videdit.js`); bộ xuất thay `editCommands` → ffmpeg/máy chủ | 10.75 |
| Tự đăng bài, link bài | Đăng giả khi đến giờ, link giả | `05e-publish.js` → API nền tảng / Metricool / Postiz (R6–R7) | D123 |
| Số liệu bài đăng | Số xác định theo mốc thời gian | `slotMetricsNow` (05e) → lấy số liệu thật | D125 |
| Từ khoá gợi ý và lồng từ khoá (Blog) | Khi chưa bật AI viết bài: từ khoá gợi ý lấy từ tiêu đề Topic (bỏ từ nối), bản mô phỏng chèn từ khoá vào H1 và đoạn mở. Khi bật AI: AI viết theo từ khoá, trả kèm tiêu đề SEO, mô tả, tóm tắt, mô tả ảnh bìa | `suggestKeyword`, `seoWeave` (`src/logic/05p-blogseo.js`); AI thật qua `blogAiBrief` + `parseAiPost(...).seo` | 10.40 |
| Gửi bài Blog lên web | **Chạy thật** khi nhập địa chỉ API và token (Setup → Chuẩn Blog), mới kiểm bằng máy chủ giả trong test; web phải làm theo tài liệu API (CORS, mã trả về). Chưa có web thật để thử | `buildBlogPostRequest`, `parseBlogPostResponse`, `recordWebPost` (05p); `blogPostWeb` (`src/ui/04l-blog.js`) | 10.40 |
| Search Console, sitemap, chỉ mục | Chưa có. Kho bài đã đăng nhập tay bằng CSV/sitemap; trình duyệt thường không đọc được sitemap của web khác (CORS) | Máy chủ R5: đọc Search Console, sitemap định kỳ | 10.40 |
| Lưu dữ liệu | localStorage cho dữ liệu chữ (khoảng 5 MB); ảnh, video lớn cất IndexedDB của trình duyệt (vài trăm MB tới vài GB tuỳ máy), chỉ một máy, một trình duyệt | Máy chủ + cơ sở dữ liệu + kho tệp (R5); thay `save`/`mediaHydrate` (`src/ui/01-core.js`, `src/ui/01b-mediastore.js`) | 10.39 |

Chạy thật (không mô phỏng): Cất ảnh, video trong IndexedDB, Ghép frame, Thêm chữ lên ảnh, Cắt/xoay/đổi tỉ lệ và tải 5 khổ, Mẫu thiết kế, Thư viện hashtag & CTA, Kho tài sản, Soạn carousel theo slide, Ảnh bìa video (lấy khung hình), sửa và tải phụ đề .srt/.vtt, nhập tệp phụ đề, gọi API ảnh và nhận giọng nói khi có khoá, tải ảnh/video lên, xuất ZIP, kéo thả lịch, khung Topic, trình soạn Markdown.

---

# 1. Tổng quan và thuật ngữ

## 1.1. Mục đích

Giúp một đội nhỏ (1–3 người) làm **content cho cả tuần** nhanh và nhất quán: từ các Topic đã chuẩn bị kỹ ra lịch đăng đủ 7 ngày, mỗi bài đúng chức năng nội dung, đúng giọng văn và quy tắc kênh, có ảnh kèm. Người dùng là người quyết định; hệ thống viết, chấm điểm và cảnh báo.

## 1.2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Thương hiệu | Hồ sơ Markdown: tên, sản phẩm, thị trường, khách hàng, triết lý, cụm từ cấm, sự thật đã xác minh |
| Giọng văn | Hồ sơ Markdown: tông, xưng hô, nên/không nên, ví dụ mẫu |
| Tệp Topic | Một tệp .md mỗi tuần: tiêu đề (tên chủ đề tuần, tùy chọn), **Bối cảnh chung** (tùy chọn), các Topic (mỗi Topic một đề mục `##`) |
| Topic | Một mini-research khoảng 2.000 chữ về một nội dung của tuần; là một **hàng** của ma trận; có phiên bản; thuộc tuần |
| Chủ đề | Chủ đề chung của tuần (tiêu đề tệp Topic), hiện làm tiêu đề Dashboard và Matrix |
| Bối cảnh chung | Phần trước Topic đầu tiên: nêu mạch chung và quan hệ giữa các Topic; AI đọc kèm khi viết mọi ô |
| Cột | **Chức năng nội dung** (Giải thích, Hướng dẫn…). Không phải định dạng |
| Format | Cách trình bày một Cột trên một kênh (ví dụ "Instagram · Carousel từng bước"). Thuộc đúng một kênh, đúng một Cột |
| Kênh | Facebook, Instagram, TikTok, Threads, YouTube, Blog… với giới hạn riêng |
| Chuyên mục | Cột của Format của slot; tên Cột hiện trên slot |
| Tuần mẫu | Danh sách slot dựng sẵn (thứ, giờ, kênh, Format) có tên và thứ tự ở Setup |
| Lập tuần | Chọn một Tuần mẫu cho tuần trống và bấm **Tạo slot** |
| Slot | Một vị trí đăng: ngày, giờ, kênh, Format; có nội dung và ô ảnh sau Chia bài |
| Ma trận | Một bảng Topic × Cột; nội dung gốc, **không phải bài đăng** |
| Ô | Giao của một Topic và một Cột; có lịch sử lượt sinh; mỗi lượt gồm bài + gợi ý ảnh |
| Lượt sinh | Một lần hệ thống viết ô: **một** bài, **một** gợi ý ảnh, điểm AI, gắn phiên bản Topic đã dùng |
| Viết ma trận | Nút: AI viết các ô còn Trống |
| Chia bài | Nút: hệ thống chọn ô Đã duyệt cho từng slot trống và viết slot theo Format |
| Ô ảnh | Chỗ chứa ảnh của slot, theo `assetNeeds` của Format; có prompt, các phiên bản ảnh, phiên bản đang chọn |
| Cần cập nhật | Slot có ô nguồn đã đổi so với lúc slot được viết |
| Cảnh báo | Kết quả quy tắc cứng hoặc điểm AI; không chặn |
| Đăng đủ, đúng bài | Chỉ số tiến độ tính từ lịch (mục 5.9) |

## 1.3. Năm Cột mặc định và căn cứ

| Cột | Chức năng | Căn cứ | Độ dài ô |
|---|---|---|---|
| **Giải thích** (Insight) | Vì sao, ý nghĩa của phát hiện và số liệu trong Topic | Nội dung hữu ích, gây hứng thú được chia sẻ nhiều hơn (Berger & Milkman, *Journal of Marketing Research* 2012) | 200–1.200 chữ (nuôi Format dài) |
| **Hướng dẫn** | Làm thế nào: các bước, câu mẫu | Hiệu ứng ví dụ mẫu (worked-example effect, lý thuyết tải nhận thức) | 70–1.000 chữ |
| **Bất ngờ và ngộ nhận** | Sự thật trái kỳ vọng, sửa hiểu lầm phổ biến | Văn bản bác bỏ ngộ nhận: hiệu quả mức vừa, g = 0,41 qua 44 so sánh (Schroeder & Kucera 2022); nội dung bất ngờ được chia sẻ nhiều hơn (Berger & Milkman 2012) | 40–220 chữ |
| **Câu chuyện** | Một trường hợp cụ thể có trong Topic | Phân tích tổng hợp 132 hệ số ảnh hưởng về sức thuyết phục của câu chuyện (van Laer và cộng sự 2014) | 60–400 chữ |
| **Luyện tập** | Câu hỏi tự kiểm tra, thử thách, có đáp án | Hiệu ứng kiểm tra: nhớ lại lặp lại tăng mức ghi nhớ sau một tuần hơn 100% so với bỏ khỏi luyện tập (Karpicke & Roediger 2007) | 30–200 chữ |

**Đã cân nhắc và loại khỏi ma trận:** Bài dài, Nội dung ngắn, Carousel, infographic, quote (là định dạng); Ưu đãi/lời mời học thử, Hậu trường (không lấy từ Topic; CTA của từng Format đảm nhận lời mời); Tin tức/xu hướng (phụ thuộc thời điểm). Funfact gộp vào "Bất ngờ và ngộ nhận".

**Giới hạn của căn cứ:** các nghiên cứu chứng minh từng chức năng có tác dụng, phần lớn trong giáo dục hoặc với báo điện tử; áp sang mạng xã hội là suy luận. Content marketing matrix (giải trí · giáo dục · truyền cảm hứng · thuyết phục) dùng để kiểm độ phủ, không phải mô hình đã kiểm chứng.

---

# 2. Luồng vận hành

## 2.1. Thiết lập một lần (và chỉnh khi cần)

1. Thương hiệu (md). 2. Giọng văn (md). 3. Kênh và giới hạn. 4. Cột (mặc định 5). 5. Format (kênh + Cột nguồn + cách trình bày + quy tắc + ô ảnh). 6. **Tuần mẫu** (nhiều mẫu, tên, thứ tự). 7. Quy tắc cứng chung, ngưỡng, tiêu chí chấm.

Ứng dụng báo **"Thiết lập đủ"** khi: có Thương hiệu và Giọng văn; ≥ 1 Cột đang bật; mỗi Cột đang bật có ≥ 1 Format; có ≥ 1 Tuần mẫu có slot. Chưa đủ thì không Lập tuần được và nêu từng thành phần thiếu. Nút **Nạp dữ liệu demo** luôn dùng được.

## 2.2. Chu trình của một tuần — thanh tiến độ 7 bước

| # | Bước (tên hiển thị) | Người dùng làm (màn hình) | Hoàn thành khi |
|---|---|---|---|
| 1 | Lập tuần | Dashboard: chọn tuần, **Lập tuần** → chọn Tuần mẫu → **Tạo slot**; hoặc thêm slot bằng **+** | Tuần có ≥ 1 slot |
| 2 | Nạp Topic | Matrix: nạp tệp .md (hoặc dán) | Có ≥ 1 Topic |
| 3 | Viết ma trận | Matrix: **Viết ma trận** | Không còn ô Trống |
| 4 | Duyệt ô | Matrix: mỗi ô Duyệt / Tạo lại / Sửa / Hủy | Mọi ô Đã duyệt hoặc Đã hủy, ≥ 1 ô Đã duyệt |
| 5 | Chia bài | Matrix: **Chia bài** → về Dashboard | Không còn slot "Chưa có bài" |
| 6 | Duyệt slot và ảnh | Dashboard: mỗi slot Duyệt / Tạo lại `<` `>` / Sửa; ô ảnh: Gen, `<` `>` (ảnh chỉ nhắc) | Mọi slot Đã duyệt, không slot "cần cập nhật" |
| 7 | Xác nhận và xuất | Dashboard: **Xác nhận lịch**; Export | Tuần "Đã chốt" |

Thanh tiến độ chỉ **hiển thị** vị trí và lý do chưa qua bước; không khóa menu. Bước 1 và 2 có thể làm theo thứ tự nào cũng được (nạp Topic trước khi Lập tuần vẫn hợp lệ); bước hiện tại luôn là bước đầu tiên chưa hoàn thành.

## 2.3. Trạng thái

**Tuần:** chưa có bản ghi ("Chưa lập") → `DRAFT` ("Nháp") → `CONFIRMED` ("Đã chốt", chỉ đọc) → `REOPENED` ("Đang sửa") → `CONFIRMED` sau khi Xác nhận lịch lại.

**Topic:** không có trạng thái duyệt. Có **phiên bản**: nạp lại với nội dung khác tạo phiên bản mới; phiên bản hiện hành là mới nhất, chuyển về bản cũ được (R2′).

**Ô (theo từng phiên bản Topic):** `EMPTY` ("Trống") → `DRAFT` ("Chưa duyệt") → `APPROVED` ("Đã duyệt"); `CANCELLED` ("Đã hủy"). Mọi thay đổi bản hiện hành (Tạo lại, Sửa, Dùng bản này) đưa ô về `DRAFT`. Ô `CANCELLED` được tính là **đã xử lý** ở bước 3–5.

**Slot:** `EMPTY` ("Chưa có bài") → `DRAFT` ("Chưa duyệt") → `APPROVED` ("Đã duyệt"; ở tuần đã chốt và kênh Tự động hiện "Chờ tự đăng") → `PUBLISHED` ("Đã đăng": tự đăng hoặc đánh dấu tay; chỉ xem, mục 10.24). Chưa đăng mà quá giờ hiện "Đăng lỗi". Cờ: `needsUpdate`, `changedAfterPublish`, `warnings[]`. Đã đăng mang `pub{mode, via, url, at, asConfirmed}` và `metrics[]` (mục 10.22).

## 2.4. Cổng (điều kiện mở nút)

Các cổng chỉ xét **trạng thái**, không xét cảnh báo (D77).

| Nút | Mở khi | Nếu chưa mở được |
|---|---|---|
| Lập tuần · Tuần mẫu | Thiết lập đủ; tuần chưa chốt; tuần **chưa có slot nào** | Nêu thành phần thiếu / "Tuần đã có N slot. Xóa hết slot của tuần nếu muốn dùng lại" / "Tuần đã chốt" |
| Viết ma trận | Có ≥ 1 Topic; có ≥ 1 ô `EMPTY` | "Chưa có Topic" / "Mọi ô đã có bài" |
| Chia bài | Tuần có slot; có Topic; không ô `EMPTY` hoặc `DRAFT`; ≥ 1 ô `APPROVED`; còn ≥ 1 slot `EMPTY`; tuần chưa chốt | Nút khóa, nêu từng lý do ("3 ô chưa duyệt", "Chưa có slot (Lập tuần trước)", "Mọi slot đã có bài") |
| Xác nhận lịch | Tuần có slot; không slot `EMPTY`, `DRAFT`, `needsUpdate`; tuần chưa chốt | Liệt kê slot chưa đạt (bấm để mở) |
| Đánh dấu đã đăng | Slot `APPROVED` ở tuần đã chốt ít nhất một lần (`revision ≥ 1`); không cần Mở lại | "Chốt lịch trước" |
| Xuất (chính thức) | Tuần `CONFIRMED` | Chỉ xem trước, ghi "chưa chốt" |

## 2.5. Lan truyền thay đổi

| Thay đổi | Hệ quả |
|---|---|
| Nạp lại tệp Topic | Topic có nội dung đổi → phiên bản mới, ô của phiên bản mới `EMPTY`; slot dùng ô của Topic đó `needsUpdate`; Topic không đổi giữ nguyên; Topic bớt: bỏ hàng và ô, slot dùng ô đó về `EMPTY` |
| **Hủy Topic** | Có xác nhận nêu số ô (kể cả ô đã có bài) và số slot; bỏ hàng và các ô; slot dùng ô đó về `EMPTY` |
| Chuyển phiên bản Topic (R2′) | Ô hiện trạng thái mới nhất theo phiên bản đó; slot dùng ô của Topic đó `needsUpdate` |
| Tạo lại / Sửa / Hủy / "Dùng bản này" ở một ô | Ô về `DRAFT` (hoặc `CANCELLED`); slot dùng ô đó `needsUpdate` (D82) |
| Thêm Cột cho tuần | Thêm ô `EMPTY` cho mỗi Topic |
| Bớt Cột | Có xác nhận; loại ô của Cột; slot dùng các ô đó → `EMPTY` |
| Thêm/bớt/sửa slot | Chỉ ảnh hưởng slot đó; xóa **hết** slot thì nút Tuần mẫu mở lại |
| Đổi ô nguồn của slot | Slot viết lại từ ô mới (giữ lịch sử bản slot) |
| Đổi Format của slot cùng Cột | Slot `needsUpdate` |
| Đổi Format của slot sang Cột khác | Hộp xác nhận; slot mất ô nguồn, về `EMPTY`; ô ảnh theo Format mới |
| Đổi Format/quy tắc/Tuần mẫu ở Setup | Chấm lại cảnh báo; nội dung và tuần đã lập không tự đổi |
| Tuần `CONFIRMED` | Mọi thao tác sửa bị khóa; phải "Mở lại để sửa" |
| Slot `PUBLISHED` bị đổi nội dung khi `REOPENED` | Giữ `PUBLISHED`, gắn `changedAfterPublish` |

Cơ chế kỹ thuật: mỗi slot lưu `sourceStamp = {cellId, topicVersion, genN, editRev}` lúc được viết; khác dấu bản hiện hành của ô ⇒ `needsUpdate`. Xử lý: **Cập nhật từ ô** hoặc **Giữ bản slot hiện tại** (bắt buộc ghi lý do).

## 2.6. Chuỗi nội dung: mỗi bước chỉ viết lại từ bước ngay trước

| Bước | Viết từ | Không được | Công cụ kiểm |
|---|---|---|---|
| Ô | Phiên bản hiện hành của Topic + Bối cảnh chung, theo chức năng của Cột | Thêm số liệu ngoài Topic; bịa trường hợp (D100) | HR-10, HR-11, HR-12; HR-02, HR-07 |
| Slot | **Một** ô đã duyệt cùng Cột với Format của slot, theo giọng văn và Format | Thêm ý hoặc số liệu mới ngoài ô nguồn | HR-05; HR-06; HR-12 |
| Prompt ảnh của slot | Gợi ý ảnh của ô nguồn + tên/gợi ý ô ảnh của Format | Thêm chủ thể không có trong ô | — |

**Gắn Cột với Format (không để AI quyết):**
1. Mỗi Format thuộc đúng **một Cột** và đúng một kênh.
2. Slot mang một Format, nên Cột của slot xác định sẵn. Chia bài chỉ lấy ô `APPROVED` **cùng Cột** (DST-02).
3. Trong cùng Cột, ô nào vào slot nào do công thức DST-02 quyết định; người dùng đổi tay được trong các ô đã duyệt cùng Cột (DST-06).
4. AI chỉ **viết**, không chọn Cột, ô hay Format.

**Mỗi bài tự đứng được:** tiếp cận tự nhiên trung bình chỉ vài phần trăm người theo dõi (Socialinsider 2026), nên không viết câu dẫn sang bài khác (HR-12). Việc quay lại cùng chủ đề nhiều lần trong tuần vẫn có lợi cho ghi nhớ (Cepeda và cộng sự 2006).

---

# 3. Điều hướng và màn hình

## 3.1. Menu

Máy tính: thanh bên trái. Điện thoại: thanh dưới 5 mục (mục chạm ≥ 44 px). **Thanh trên** có điều hướng tuần: mũi tên tuần trước/sau, nhãn tuần ("Tuần 12/10 · 12/10 – 18/10/2026"), ô chọn ngày, nút **Tuần này**, nhãn trạng thái tuần ("Chưa lập", "Nháp", "Đã chốt · bản n", "Đang sửa"), giờ demo, **Nạp dữ liệu demo**, **Reset**. Không có nút "Tạo tuần".

| Mục | Nội dung |
|---|---|
| Dashboard | Header (tiêu đề tuần = Chủ đề, giờ demo, chỉ số "đăng đủ, đúng bài", **một** nút việc tiếp theo); thanh tiến độ 7 bước; thanh công cụ: **Tuần / Tháng**, **Lập tuần · Tuần mẫu**, lọc kênh; lịch tuần (nút **+** mỗi ngày, hoạt động cả ở tuần chưa lập) hoặc lịch tháng (điều hướng tháng, mọi ngày bấm được để mở tuần chứa ngày đó); slot hiện chuyên mục |
| Matrix | Của tuần đang chọn: tệp Topic (Nạp / Nạp lại, tệp mẫu, lệnh cho agent, tìm trong Topic); đếm trạng thái ô; **Viết ma trận**, **Chia bài**; **một bảng** hàng Topic × cột Cột |
| Report | Overview, Tuần, Tháng: số bài, tiếp cận/lượt xem, tương tác, đúng giờ, đúng bản; theo kênh, Cột, Format; top bài (mục 10.22) |
| Export | Tệp tích hợp từ lịch đã chốt |
| Setup | Thương hiệu, Giọng văn, Kênh, Cột, Format, **Tuần mẫu**, Quy tắc & tiêu chí, Sao lưu |

## 3.2. Thanh tiến độ tuần

Hiện ở Dashboard và Matrix: 7 bước, bước hiện tại nhấn mạnh, bước chưa qua có lý do ngắn bằng chữ ("3 ô chưa duyệt", "9 slot chưa duyệt · 2/8 ảnh"). Bấm bước để nhảy: bước 1 mở hộp Lập tuần (nếu được), bước 2–5 mở Matrix, bước 6–7 mở Dashboard. Điện thoại: "Bước 4/7 · Duyệt ô", mở rộng khi chạm.

## 3.3. Danh sách màn hình

| ID | Màn hình | Nội dung chính |
|---|---|---|
| SCR-01 | Dashboard (header) | Tiêu đề tuần, ngày giờ demo, chỉ số (sẵn sàng · đã đăng · đúng bản · trễ), **một** nút việc tiếp theo, ghi chú đợt dựng cho nút chưa có |
| SCR-02 | Dashboard (lịch tuần) | Lưới 7 ngày; nút **+** mỗi ngày; chip slot: giờ, kênh, Format, chuyên mục, trạng thái bằng chữ; lọc kênh. Điện thoại: danh sách theo ngày |
| SCR-03 | Lịch tháng | Ô ngày có số slot; **mọi ngày bấm được** (tuần chưa lập vẫn mở); nút tháng trước/sau |
| SCR-04 | Thêm/sửa slot | Kênh → Format (lọc theo kênh) → ngày, giờ; Xóa slot (có xác nhận) |
| SCR-05 | Chi tiết slot | Nội dung; **ô nguồn** (chọn/đổi ô trong các ô Đã duyệt cùng Cột); cảnh báo; điểm AI; nút **Duyệt · Tạo lại · `<` `>` · Sửa**; **ô ảnh** (ảnh, prompt, **Gen**, `<` `>`); vị trí đăng |
| SCR-06 | Hộp Lập tuần | Danh sách Tuần mẫu (nút chọn, nhãn "Gợi ý"), xem trước bảng slot sẽ tạo, **Tạo slot** |
| SCR-07 | Matrix | Mục 3.1; bảng Topic × Cột; mỗi hàng: Topic n, phiên bản "v1/2", tên, số chữ, số lưu ý, **Hủy Topic**; mỗi ô: trạng thái, điểm, cảnh báo, trích đoạn, "nuôi n slot". Điện thoại: thẻ theo Topic |
| SCR-08 | Chi tiết ô | Nội dung (cảnh báo tô sáng); **gợi ý ảnh**; điểm từng tiêu chí + một gợi ý; Duyệt / Tạo lại / Sửa / Hủy; back/next lượt sinh; "Dùng bản này"; các slot ô đang nuôi |
| SCR-09 | Chi tiết Topic | Trường tùy chọn, cảnh báo Topic, nguyên văn (tô sáng khi đang tìm), các phiên bản |
| SCR-10 | (bỏ) | Màn Phân bổ của v2.7 không còn; Chia bài là một nút ở Matrix |
| SCR-11 | Export | `schedule.csv`, `schedule.json`, nội dung từng slot `.md`, ảnh đã chọn, ZIP + manifest |
| SCR-12..19 | Setup | Thương hiệu · Giọng văn · Kênh · Cột · Format · **Tuần mẫu** · Quy tắc & tiêu chí · Sao lưu |
| SCR-20 | Hộp xác nhận | Luôn nêu hệ quả bằng số |

## 3.4. Bố cục và phân cấp thị giác

Mỗi màn hình có đúng **một** hành động chính nổi nhất. Lịch là vùng chính của Dashboard, bảng là vùng chính của Matrix. Ba mức nhấn của slot và ô: **cần hành động** (viền đậm + chữ), **ổn** (nhạt), **xong** (mờ + "Đã đăng"). Nút chưa có ở đợt dựng hiện tại hiển thị **khóa** kèm "từ đợt Rn′". Cảnh báo dùng chữ, không dùng màu đỏ chặn.

---

# 4. Mô hình dữ liệu

Tất cả nằm trong `S` (localStorage, khóa `autocontent.state`), `DATA_VERSION = ac-edu-r4-0`.

| Thực thể | Trường chính |
|---|---|
| `brand`, `voice` | như v2.6 |
| `channels[]` | `id, name, short, maxChars, maxHashtags, notes, **platform** (facebook/instagram/tiktok/threads/youtube/blog/other), **publish{mode(auto/manual), via(api/metricool/postiz), metrics(api/metricool/postiz/none)}**` |
| `columns[]` | `id, kind, name, active, guideMd, structure[], hardRules{…}, criteria[], assetPrompt` |
| `formats[]` | `id, name, channelId, columnId, layout(post/script/carousel/article/longscript), guideMd, structure[], hardRules{…}, criteria[], assetNeeds[]` |
| `weekTemplates[]` | `id, name, order, slots[{id, weekday(1–7), time, formatId, channelId}]` (thay `slotTemplates`) |
| `weeks[]` | `id ('w-YYYY-MM-DD'), startDate, status, columnIds[], confirmedAt, revision, templateId, dealtAt` (không còn `matrixStatus`) |
| `topicFiles[]` | `weekId, md, title, theme, context, importedAt, warnings[]` (một bản hiện hành mỗi tuần) |
| `topics[]` | `id, weekId, order, currentVersion, versions[]` |
| `topics[].versions[]` | `n, title, text, fields{message, audience, angle}, words, hasCase, createdAt, reason(imported/reimported/edited)` |
| `cells[]` | `id, weekId, topicId, columnId, gens[], byVersion{ [topicVersion]: {state, currentRef, approvedAt} }` |
| `cells[].gens[]` | `n, topicVersion, createdAt, text, **imagePrompt**, scores[], total, tip, edits[{rev, text, imagePrompt, at}]` |
| `slots[]` | `id, weekId, date, time, channelId, formatId, state, sourceCellId, sourceStamp{cellId, topicVersion, genN, editRev}, text, genN, curN, undoN, **history[{n, text, createdAt, cellId, stamp, edited}]**, scores, total, tip, needsUpdate, keepReason, keepStamp, emptyReason, changedAfterPublish, **assets[]**, **confirmedText, pub{mode, via, url, at, asConfirmed, simulated}, metrics[{key(1h/24h/7d), at, source, values{}}]**` |
| `slots[].assets[]` | `name, hint, **prompt**, **cellPrompt**, **versions[{n, seed, createdAt}]**, **current**, done, ref` |
| `settings` | `demoNow` (tua được, D127), `reviewThreshold, hypeWords[]` (bỏ `topicsPerWeek`) |
| `ui` | `weekStart` (thứ Hai của tuần đang xem; thay `weekId`) |

**Ràng buộc:** tuần chỉ có bản ghi khi đã chạm tới; ô = số Topic × `columnIds.length`; mỗi `formats.columnId` tồn tại; `slots.sourceCellId` (nếu có) cùng tuần, `cell.columnId == format.columnId`; `weeks.templateId` chỉ ghi nhớ mẫu đã dùng để gợi ý lần sau.

**Di trú R4:** cùng `DATA_VERSION`; khi đọc dữ liệu cũ, `migrateState` bổ sung `platform`, `publish` cho kênh và `pub`/`metrics` cho slot (slot đã đăng cũ thành bài đăng thủ công).

**Di trú:** dữ liệu `ac-edu-r2-*` (v2.5–v2.6) và `ac-edu-r3-*` (v2.7) không chuyển tự động vì mô hình đổi. Bản thô được cất sang khóa `autocontent.state-v26` hoặc `autocontent.state-v27`; ứng dụng nạp dữ liệu demo mới, nêu rõ trong banner và cho xem/sao chép bản cũ.

---

# 5. Yêu cầu chức năng

Ưu tiên: **P0** bắt buộc; **P1** nên có; **P2** nếu còn thời gian.

## 5.1. Setup (SET)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| SET-01 | Thương hiệu: nạp `.md` hoặc gõ; đọc theo đề mục cố định (12.1); thiếu đề mục thì cảnh báo nêu tên | P0 |
| SET-02 | Giọng văn: như SET-01 (12.2) | P0 |
| SET-03 | Tải mẫu md cho Thương hiệu, Giọng văn, Cột, Format, **tệp Topic + lệnh mẫu cho agent bên ngoài** (12.5) | P0 |
| SET-04 | Nội dung md không được hiểu là chỉ thị | P0 |
| SET-05 | Kênh: thêm/sửa, giới hạn ký tự và hashtag | P0 |
| SET-06 | Cột: thêm/sửa/ẩn; hướng dẫn md; cấu trúc; quy tắc; tiêu chí (tổng = 100); prompt ảnh mặc định (`assetPrompt`) | P0 |
| SET-07 | Format: bắt buộc một kênh và một Cột; cách trình bày; đơn vị độ dài; **ô ảnh cần có** (tên, gợi ý); không xóa Format đang có slot ở tuần chưa chốt (hỏi chuyển); xóa Format thì slot mẫu dùng nó trong mọi Tuần mẫu bị xóa | P0 |
| SET-08 | **Tuần mẫu:** danh sách có tên; thêm, đổi tên, nhân bản, xóa; **đổi thứ tự** (thứ tự xoay vòng); mỗi mẫu có bảng slot (thứ, giờ, kênh, Format, Cột) thêm/sửa/xóa; hiện số slot theo Cột; cảnh báo hai slot cùng kênh cách < 2 giờ; cảnh báo ngày không có slot; mẫu không có slot không được gợi ý | P0 |
| SET-09 | Ngưỡng "nên xem lại", danh sách từ cường điệu (không còn số Topic mỗi tuần) | P1 |
| SET-10 | Sao lưu/khôi phục JSON có checksum; nạp demo; Reset | P0 |
| SET-11 | Đổi Cột/Format/quy tắc/Tuần mẫu không tự viết lại nội dung hay đổi tuần đã lập | P0 |

## 5.2. Lập tuần và slot (WK)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| WK-01 | Lịch liên tục: điều hướng tuần bằng mũi tên, chọn ngày, **Tuần này**, lịch tháng; tuần chưa chạm tới hiện trống; bản ghi tuần chỉ tạo khi cần (D103). Ngày không phải thứ Hai được quy về thứ Hai của tuần | P0 |
| WK-02 | **Lập tuần:** hộp chọn Tuần mẫu (gợi ý mẫu kế tiếp theo vòng), xem trước bảng slot, **Tạo slot** tạo slot `EMPTY` chỉ có ngày, giờ, kênh, Format; ô ảnh theo Format nhưng trống | P0 |
| WK-02b | **Nút Tuần mẫu khóa** khi tuần đã có slot hoặc đã chốt, nêu lý do; xóa hết slot thì mở lại (D104) | P0 |
| WK-03 | Nút **+** mỗi ngày (kể cả tuần chưa lập): kênh → Format của kênh → giờ | P0 |
| WK-04 | Sửa/xóa slot; đổi Format sang Cột khác thì bỏ ô nguồn | P0 |
| WK-05 | Bật/tắt và thêm/bớt Cột cho tuần | P0 |
| WK-06 | Xóa tuần cần xác nhận | P1 |
| WK-07 | Slot quá giờ chưa đăng hiện "trễ" | P1 |

## 5.3. Topic (TPC)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| TPC-01 | Nạp **một tệp .md** (hoặc dán) theo 12.5: tiêu đề `#` (tùy chọn), Bối cảnh chung (tùy chọn), mỗi Topic một đề mục `##`. Không có `##` thì cả tệp là 1 Topic. Nạp được cả khi tuần chưa có slot | P0 |
| TPC-02 | Trường tùy chọn ở đầu mỗi Topic: `Thông điệp chính:`, `Đối tượng:`, `Góc nhìn:` | P0 |
| TPC-03 | Lỗi (không nạp, giữ dữ liệu cũ): tệp rỗng hoặc dưới 200 ký tự chữ; hơn 10 Topic. Cảnh báo (vẫn nạp): Topic dưới 300 chữ; Topic không có trường hợp cụ thể (D100) | P0 |
| TPC-04 | Nạp lại: Topic khớp theo thứ tự; nội dung đổi → phiên bản mới; hộp xác nhận nêu Topic đổi / thêm / bớt, số ô và slot bị ảnh hưởng | P0 |
| TPC-05 | Xem: mỗi hàng Matrix có tên Topic bấm được để đọc nguyên văn, số chữ, phiên bản, cảnh báo | P0 |
| TPC-06 | **Tìm trong Topic** (ở Matrix): không phân biệt hoa thường và dấu; lọc các hàng có chỗ khớp; số chỗ khớp; tô sáng khi mở Topic | P0 |
| TPC-07 | **Hủy Topic:** bỏ hàng, các ô, slot dùng ô về "Chưa có bài"; hộp xác nhận nêu số ô và slot; khóa khi tuần đã chốt | P0 |
| TPC-08 | Sửa Topic trực tiếp; back/next phiên bản và **Dùng phiên bản này** (hộp xác nhận nêu số ô và slot bị ảnh hưởng) | P1 (R2′) |

## 5.4. Matrix (MTX)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| MTX-01 | **Viết ma trận:** viết các ô `EMPTY` của phiên bản Topic hiện hành; không viết ô `DRAFT`, `APPROVED`, `CANCELLED`; mỗi ô một lượt sinh gồm **một** bài và **một** gợi ý ảnh; viết lần lượt, nút **Dừng** | P0 (R2′) |
| MTX-02 | Mỗi lượt sinh: điểm từng tiêu chí (0–5), tổng 0–100, **một gợi ý**, cảnh báo có vị trí | P0 (R2′) |
| MTX-03 | Ô: **Duyệt**, **Tạo lại**, **Sửa** (bài và gợi ý ảnh), **Hủy** | P0 (R2′) |
| MTX-04 | Duyệt được ô có cảnh báo (nhắc "Ô này có N cảnh báo") | P0 (R2′) |
| MTX-05 | Back/next lượt sinh qua mọi phiên bản Topic; "Dùng bản này" | P0 (R2′) |
| MTX-06 | Ô `CANCELLED` có **Tạo lại** | P0 (R2′) |
| MTX-07 | Ô Câu chuyện của Topic không có trường hợp: không viết, hiện "Topic không có trường hợp cụ thể · nên Hủy" (D100); ô Hủy được tính là đã xử lý | P0 |
| MTX-08 | Duyệt hàng loạt các ô không cảnh báo (có xác nhận) | P1 |
| MTX-09 | Bảng một lưới Topic × Cột; ô hiện trạng thái bằng chữ, điểm, số cảnh báo, trích đoạn, số slot ô đang nuôi; đếm tổng ("15 ô: 11 đã duyệt · 3 chưa duyệt · 0 trống · 1 đã hủy") | P0 |
| MTX-10 | Điện thoại: thẻ theo Topic, không cuộn ngang | P0 |
| MTX-11 | Matrix đi theo tuần đang chọn ở Dashboard; tuần chưa lập vẫn xem và nạp Topic được | P0 |

## 5.5. Chia bài và viết slot (DST)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| DST-01 | **Chia bài** theo cổng 2.4 (D105); chỉ xử lý slot `EMPTY`; bấm lại chỉ điền slot còn trống | P0 (R3′) |
| DST-02 | Chọn ô: với mỗi Cột (thứ tự `c` = 0, 1, … theo Cột của tuần), xếp slot của Format thuộc Cột đó theo thời gian, đánh `k` = 0, 1, …; ứng viên là các ô `APPROVED` của Cột đó theo vòng bắt đầu từ Topic `((c + k) mod N) + 1` (N = số Topic); chọn ứng viên **đang nuôi ít slot nhất** (hòa thì lấy ứng viên đứng trước theo vòng); Cột không có ô `APPROVED` thì slot giữ `EMPTY` và ghi lý do | P0 (R3′) |
| DST-03 | Viết slot **từ ô** theo Format (cách trình bày, cấu trúc, độ dài, tông kênh, hashtag, CTA, số slide); không thêm số liệu mới; slot → `DRAFT`; lưu `sourceStamp` và một bản trong `history` của slot | P0 (R3′) |
| DST-04 | Ô ảnh của slot nhận prompt ghép từ gợi ý ảnh của ô + tên/gợi ý ô ảnh; xong thì chuyển Dashboard: "Đã viết N slot · M slot chưa có bài" | P0 (R3′) |
| DST-05 | Slot chưa có bài (chặn Xác nhận lịch); ô Đã duyệt chưa được dùng chỉ là thông tin | P0 (R3′) |
| DST-06 | Ở chi tiết slot: danh sách các ô `APPROVED` cùng Cột (ghi "đang nuôi n slot khác"); chọn ô khác → slot viết lại từ ô đó | P0 (R3′) |
| DST-07 | Một ô nuôi nhiều slot (ví dụ cùng ô cho TikTok và Reels) | P0 (R3′) |

## 5.6. Duyệt slot, ảnh và lịch (CAL)

Giữ CAL-01..CAL-11 của v2.6 (lịch tuần/tháng, lọc kênh, chi tiết slot, Duyệt, Tạo lại + Hoàn tác một lần, Sửa, cần cập nhật, cảnh báo lịch, Xác nhận lịch, Mở lại để sửa, Đánh dấu đã đăng), thay "asset" bằng "ô ảnh". Bổ sung:

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| CAL-12 | Chip slot hiện **chuyên mục** (tên Cột của Format) | P0 |
| CAL-13 | Slot có bài: nút `<` `>` xem các bản slot trước/sau (`history`), Tạo lại, Sửa, Duyệt | P0 (R3′) |
| CAL-14 | **Ô ảnh:** hiện ảnh đang chọn (hoặc "Chưa có ảnh"), prompt, **Gen** (thêm phiên bản ảnh, tự chọn phiên bản mới), `<` `>` chọn phiên bản; Gen cần có prompt (chưa Chia bài thì khóa); không chặn Xác nhận lịch. Mô phỏng bằng hình giữ chỗ gắn nhãn "Mô phỏng" | P0 (R3′) |
| CAL-15 | Ô ảnh giữ các phiên bản khi slot được viết lại hoặc về "Chưa có bài" | P1 |

## 5.7. Dashboard: header (TOD)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| TOD-01 | Cột hôm nay tô nổi; điện thoại tự cuộn tới hôm nay | P0 |
| TOD-02 | **Một** nút việc tiếp theo: "Lập tuần: chọn Tuần mẫu", "Nạp Topic", "Viết ma trận (15 ô)", "Duyệt 3 ô", "Chia bài (17 slot)", "Duyệt 9 slot", "Cập nhật 2 slot", "Xác nhận lịch"; ở R1′ nút ghi "Xem màn hình" cho bước chưa có thao tác | P0 |
| TOD-03 | Chỉ số "Đăng đủ, đúng bài" ở header; danh sách "Slot trễ" | P0 |
| TOD-04 | Nút **Tuần này** ở thanh trên | P0 |

## 5.8. Chỉ số "Đăng đủ, đúng bài"

Như v2.6: Sẵn sàng (`APPROVED`/`PUBLISHED` ÷ tổng slot); Đã đăng (`PUBLISHED` ÷ slot đã đến giờ); Đúng bản (`pub.asConfirmed` ÷ `PUBLISHED`); Đăng lỗi (trước gọi là Trễ). Chưa có slot đã đăng thì hai chỉ số sau hiện "chưa theo dõi". Báo cáo tiến độ, không phải mục tiêu. R4 thêm hai chip tổng của tuần: **Tiếp cận/xem** và **Tương tác** (mục 10.22).

## 5.9. Export (EXP)

`schedule.csv`: `week, revision, date, time, channel, format, column, topic, title, caption_file, image_files, status, publish_mode, published_at, url`. `metrics.csv`: mỗi slot đã đăng × mỗi mốc × mỗi chỉ số. `matrix.md` gồm Topic và bản hiện hành của mọi ô (kèm gợi ý ảnh); `topics.md` (tệp Topic đã nhập); thư mục `assets/` chứa ảnh phiên bản đã chọn của từng ô ảnh. R1′: chỉ xem trước bảng `schedule`; gói ZIP ở R4.

---

# 6. Cảnh báo, tiêu chí chấm

## 6.1. Hai loại thông tin tham khảo, đều **không chặn**

Quy tắc cứng do **ứng dụng** tính (xác định), mức Lỗi hoặc Lưu ý, kèm vị trí. Điểm AI (mô phỏng) 0–5 mỗi tiêu chí, tổng 0–100, một gợi ý. Hiển thị tách biệt.

## 6.2. Quy tắc cứng

| ID | Quy tắc | Mức | Ô | Slot |
|---|---|---|---|---|
| HR-01 | Độ dài trong `min–max` theo đơn vị của Cột/Format (ký tự hoặc chữ) | Lỗi | ✔ | ✔ |
| HR-02 | Cụm từ cấm của Thương hiệu, Cột hoặc Format | Lỗi | ✔ | ✔ |
| HR-03 | Có CTA khi `requireCta` | Lỗi | ✔ | ✔ |
| HR-04 | Đủ các đoạn cấu trúc bắt buộc | Lỗi | ✔ | ✔ |
| HR-05 | Slot không thêm số liệu mới ngoài ô nguồn (số thuộc Sự thật đã xác minh được miễn) | Lỗi | — | ✔ |
| HR-06 | Giới hạn kênh: hashtag, số slide, chữ mỗi slide, ký tự tối đa | Lỗi | — | ✔ |
| HR-07 | Từ cường điệu | Lưu ý | ✔ | ✔ |
| HR-08 | Xưng hô khác Giọng văn | Lưu ý | ✔ | ✔ |
| HR-09 | Lặp nguyên văn ≥ 40 ký tự giữa hai slot cùng tuần | Lưu ý | — | ✔ |
| HR-10 | **Số liệu không thấy trong Topic** của hàng (và Bối cảnh chung, Sự thật đã xác minh). Số nguyên 1–10 không kèm % được bỏ qua | Lưu ý | ✔ | — |
| HR-11 | **Lặp nguyên văn giữa hai ô của hai Topic khác nhau** (một câu ≥ 40 ký tự trùng; không tính đoạn CTA) | Lưu ý | ✔ | — |
| HR-12 | **Dẫn sang bài khác**: "hôm qua", "bài trước", "phần trước", "tập trước", "như mình đã nói", "ở bài sau" | Lưu ý | ✔ | ✔ |
| TPC-W | Cảnh báo ở Topic: dưới 300 chữ; không có trường hợp cụ thể (kéo theo Câu chuyện không viết, D100) | Lưu ý | Topic | — |

## 6.3. Tiêu chí chấm AI (mặc định; tổng = 100; chỉnh ở Setup)

**Ô (mỗi Cột có thể riêng):** Bám Topic 25 · Đúng giọng thương hiệu 20 · Hook, mở đầu thu hút 20 · Rõ lợi ích với người đọc 20 · Dễ chuyển thể sang nhiều Format 15.

**Slot (mỗi Format có thể riêng):** Hợp kênh và Format 25 · Đúng giọng thương hiệu 20 · Hook 20 · CTA rõ 20 · Trình bày dễ đọc 15.

Tổng = Σ(trọng số × điểm ÷ 5). Tổng < ngưỡng (mặc định 70) thì nhãn "nên xem lại".

---

# 7. Dữ liệu demo (seed) — Nói Được English

Nạp bằng **Nạp dữ liệu demo** (thay toàn bộ, có xác nhận). Mọi con số là số kiểm thử, mô phỏng.

## 7.1. Thiết lập

- **Thương hiệu / Giọng văn:** như v2.6 (4 cụm cấm, 2 sự thật đã xác minh, xưng "mình – bạn").
- **Kênh (6):** Facebook (≤ 1.500 ký tự, ≤ 3 hashtag), Instagram (carousel 6–8 slide, ≤ 40 chữ/slide), TikTok, Threads (≤ 500 ký tự), YouTube (video dài và Shorts), Blog.
- **Cột (5):** như 1.3.
- **Format (23):** 15 Format như v2.7 và 8 mẫu bài fanpage Facebook thêm ở mục 10.5 (Giải thích 4, Hướng dẫn 6, Bất ngờ và ngộ nhận 5, Câu chuyện 3, Luyện tập 5); thông số theo 12.6. Mỗi Format khai báo ô ảnh cần có (ví dụ Blog: Ảnh bìa 1200×630; YouTube · Video giải thích: Thumbnail 1280×720 và Cảnh quay ngang 16:9; carousel: Bộ ảnh slide; Facebook · Bài hướng dẫn: Ảnh vuông 1080×1080; TikTok/Reels/Shorts: Cảnh quay dọc 9:16; Threads · Sự thật bất ngờ và Quiz: không có ô ảnh).
- **Tuần mẫu (2):**

**Tuần chuẩn (17 slot, chuyên mục theo ngày)** — như lịch mẫu v2.7:

| Thứ | Giờ | Kênh · Format | Cột |
|---|---|---|---|
| T2 | 12:00 | Threads · Sự thật bất ngờ | Bất ngờ và ngộ nhận |
| T2 | 19:30 | Facebook · Ảnh số liệu | Giải thích |
| T3 | 11:30 | Facebook · Bài hướng dẫn | Hướng dẫn |
| T3 | 19:30 | Facebook · Reels mẹo ngắn | Hướng dẫn |
| T4 | 07:30 | Blog · Bài phân tích | Giải thích |
| T4 | 12:00 | Facebook · Đúng hay Sai | Bất ngờ và ngộ nhận |
| T4 | 20:00 | Facebook · Bình chọn | Luyện tập |
| T5 | 11:30 | Facebook · Bài kể chuyện | Câu chuyện |
| T5 | 19:30 | Facebook · Chuyện học viên | Câu chuyện |
| T6 | 12:00 | Facebook · Album từng bước | Hướng dẫn |
| T6 | 19:00 | YouTube · Shorts hướng dẫn | Hướng dẫn |
| T6 | 20:30 | Facebook · Điền vào chỗ trống | Luyện tập |
| T7 | 09:00 | YouTube · Video giải thích | Giải thích |
| T7 | 19:30 | Facebook · Ảnh trích dẫn | Bất ngờ và ngộ nhận |
| CN | 10:00 | Instagram · Carousel quiz | Luyện tập |
| CN | 19:00 | Facebook · Bài kể chuyện | Câu chuyện |
| CN | 20:00 | Threads · Quiz | Luyện tập |

**Tuần nhẹ (9 slot, đủ 7 ngày):**

| Thứ | Giờ | Kênh · Format | Cột |
|---|---|---|---|
| T2 | 12:00 | Threads · Sự thật bất ngờ | Bất ngờ và ngộ nhận |
| T3 | 11:30 | Facebook · Bài hướng dẫn | Hướng dẫn |
| T4 | 07:30 | Blog · Bài phân tích | Giải thích |
| T4 | 20:00 | Facebook · Bình chọn | Luyện tập |
| T5 | 11:30 | Facebook · Bài kể chuyện | Câu chuyện |
| T6 | 12:00 | Facebook · Album từng bước | Hướng dẫn |
| T7 | 09:00 | YouTube · Video giải thích | Giải thích |
| T7 | 19:30 | Facebook · Ảnh trích dẫn | Bất ngờ và ngộ nhận |
| CN | 10:00 | Instagram · Carousel quiz | Luyện tập |

## 7.2. Bốn tuần trong lịch demo

| Tuần | Trạng thái | Mục đích kiểm thử |
|---|---|---|
| **T1** (05/10/2026) | `CONFIRMED`, `revision` 1; Tuần chuẩn (17 slot); 3 Topic (2.015 / 1.973 / 1.990 chữ; Topic 1 có v1 1.993 chữ và v2); 15 ô Đã duyệt; 17/17 slot `PUBLISHED` (15 đúng bản, 2 không); ô ảnh đã Gen | Lịch tháng; chỉ số; Mở lại để sửa; phiên bản Topic; nút Tuần mẫu khóa vì tuần đã chốt |
| **T2** (12/10/2026, tuần hiện tại) | `DRAFT`; **Tuần nhẹ** (9 slot); tệp Topic: Bối cảnh chung + 3 Topic (2.056 / 1.965 / 1.977 chữ); 15 ô Đã duyệt; **9 slot đã Chia bài, Chưa duyệt**; 20/20 ô ảnh đã có ảnh (tạo khi Chia bài) | Bước 6 (Duyệt slot và ảnh); chi tiết slot có ô nguồn, prompt, ô ảnh; nút Tuần mẫu khóa vì tuần có slot |
| **T3** (19/10/2026) | `DRAFT`; Tuần chuẩn (17 slot, **trống**); 3 Topic (2.030 / 1.963 / 1.982 chữ; Topic 2 có v1 1.942 chữ và v2; Topic 3 không có trường hợp); 15 ô: **11 Đã duyệt, 3 Chưa duyệt, 1 Đã hủy** (Topic 3 × Câu chuyện); 2 ô có cảnh báo Lỗi (cụm cấm ở Topic 1 × Bất ngờ; quá dài ở Topic 2 × Luyện tập); ô ảnh trống | Bước 4 (Duyệt 3 ô); Chia bài khóa với lý do; sau khi duyệt đủ thì Chia bài điền 17/17 |
| **T4** (26/10/2026) | **Không có bản ghi** (tuần chưa chạm tới) | Tuần trống: Lập tuần gợi ý "Tuần nhẹ" (tuần trước dùng "Tuần chuẩn"); thêm slot bằng **+**; nạp Topic trước khi lập tuần |

`demoNow` = 12/10/2026 09:00 (UTC+7).

## 7.3. Số kiểm thử cố định

| Mục | Số |
|---|---|
| Kênh / Cột / Format | 6 / 5 / 23 |
| Tuần mẫu / slot mỗi mẫu | 2 / 17 và 9 (cả hai đủ 7 ngày) |
| Slot T1 / T2 / T3 | 17 / 9 / 17 |
| Topic mỗi tuần demo | 3 |
| Ô mỗi tuần demo | 15 (3 Topic × 5 Cột) |
| Số chữ mỗi Topic demo (mọi phiên bản) | 1.900–2.100; không Topic demo nào có cảnh báo "ngắn" |
| T1: slot `PUBLISHED` / đúng bản | 17 / 15 |
| T1: ô Topic 1 có bài cho v1 / v2 | 4 / 5 |
| T2: slot `DRAFT`; ô ảnh có ảnh | 9; 20/20 (Chia bài tạo luôn ảnh; carousel mỗi slide một ô ảnh) |
| T3: ô Đã duyệt / Chưa duyệt / Đã hủy | 11 / 3 / 1 |
| T3: ô có cảnh báo Lỗi | 2 |
| Cụm từ cấm (Thương hiệu) | 4 |
| Tuần mẫu gợi ý cho 26/10 và cho 12/10 | Tuần nhẹ |

Kèm tệp kiểm thử: tệp Topic T2 (Bối cảnh + 3 Topic), tệp chỉ một Topic (không `##`), tệp 9 Topic (lỗi), tệp rỗng, Thương hiệu/Giọng văn thiếu đề mục.

---

# 8. AI (mô phỏng) và giao diện

## 8.1. Tác vụ AI

Mô phỏng xác định: cùng đầu vào cho cùng đầu ra; tạo lại cho kết quả khác theo bộ đếm. Nội dung gắn nhãn "Mô phỏng".

| ID | Tác vụ | Đầu vào | Đầu ra |
|---|---|---|---|
| AI-03 | Viết ô | Phiên bản Topic + Bối cảnh chung, Cột (chức năng, cấu trúc, độ dài), Thương hiệu, Giọng văn | **Một** bài; Câu chuyện không có trường hợp thì không viết |
| AI-03b | Gợi ý ảnh của ô | Tiêu đề Topic, `assetPrompt` của Cột, bộ đếm lượt | **Một** prompt ảnh |
| AI-04 | Chấm ô | Bài, tiêu chí Cột | Điểm + gợi ý |
| AI-05 | Viết slot | Bài hiện hành của ô, Format (cách trình bày, cấu trúc, độ dài, tông kênh), Giọng văn | Bài slot, không số liệu mới |
| AI-06 | Chấm slot | Bài slot, tiêu chí Format | Điểm + gợi ý |
| AI-07 | Prompt ô ảnh | Gợi ý ảnh của ô, tên và gợi ý của ô ảnh | Prompt điền sẵn |
| AI-08 | Gen ảnh | Prompt ô ảnh | Phiên bản ảnh (MVP: hình giữ chỗ sinh từ `seed`) |

Mock lấy chất liệu từ Topic theo chức năng Cột: ưu tiên các đề mục `###` trong Topic nếu có ("Số liệu và phát hiện", "Vì sao", "Cách làm", "Ngộ nhận thường gặp", "Trường hợp", "Câu hỏi luyện tập"), không có thì chọn câu theo dấu hiệu.

## 8.2. Yêu cầu giao diện

Như v2.6 (UX-01..UX-11), đổi Idea/Input thành Topic: ma trận điện thoại dạng thẻ theo Topic; tên hiển thị "Topic 1", "Cột Hướng dẫn"; không mã chữ cái; nút chưa có ở đợt hiện tại **khóa** và ghi đợt có; mục chạm ≥ 44 px; chữ đủ tương phản ở chế độ tối; không cuộn ngang ở 360 px.

---

# 9. Nghiệm thu và kiểm thử

## 9.1. Tiêu chí nghiệm thu

| ID | Tiêu chí |
|---|---|
| V8-01 | Menu 4 mục Dashboard · Matrix · Export · Setup; không có tab Input/Ma trận/Phân bổ; thanh trên không có "Tạo tuần". |
| V8-02 | Thiết lập đủ khi có Thương hiệu, Giọng văn, ≥ 1 Cột (mỗi Cột ≥ 1 Format), ≥ 1 Tuần mẫu có slot. |
| V8-03 | Seed có 6 kênh, 5 Cột, 23 Format, 2 Tuần mẫu (17 và 9 slot, đều đủ 7 ngày). |
| V8-04 | Điều hướng tuần: mũi tên ±7 ngày, ô chọn ngày, Tuần này; lịch tháng mọi ngày bấm được và mở được tuần chưa lập. |
| V8-05 | Lập tuần ở tuần trống: hộp Tuần mẫu gợi ý đúng mẫu kế tiếp, xem trước đúng số slot, **Tạo slot** tạo slot trống (không nội dung, ô ảnh trống); nút Tuần mẫu khóa ngay sau đó. |
| V8-06 | Nút Tuần mẫu khóa khi tuần có slot hoặc đã chốt, có lý do; xóa hết slot thì mở lại. |
| V8-07 | Nạp tệp Topic: 3 Topic + Bối cảnh chung; không `##` → 1 Topic; 11 Topic → lỗi "tối đa 10", không nạp; tệp rỗng → lỗi; Topic ngắn hoặc thiếu trường hợp → cảnh báo, vẫn nạp; nạp được khi tuần chưa lập. |
| V8-08 | Nạp lại tệp với Topic 3 đổi → Topic 3 có v2; ô của v2 trống; slot dùng ô của Topic 3 cần cập nhật; Topic khác giữ nguyên. |
| V8-09 | Tìm "dang chuyen" (không dấu) trong Matrix lọc đúng hàng Topic và hiện số chỗ khớp. |
| V8-10 | Hủy Topic: hộp xác nhận nêu số ô và slot; sau hủy còn đúng số hàng và ô; slot dùng ô về "Chưa có bài". |
| V8-11 | Chia bài khóa khi còn ô Trống/Chưa duyệt (nêu số ô), khi chưa lập tuần, khi chưa có Topic, khi tuần đã chốt, khi mọi slot đã có bài. |
| V8-12 | Mỗi ô có gợi ý ảnh; slot đã Chia bài có ô ảnh mang prompt xuất phát từ gợi ý của ô nguồn; slot chưa Chia bài có ô ảnh trống. |
| V8-13 | Chia bài (T3 sau khi duyệt đủ): 17/17 slot có bài, mỗi slot lấy ô cùng Cột, hai slot đầu cùng Cột lấy hai Topic khác nhau, ô Đã hủy không được dùng; Chia bài lại không viết đè. |
| V8-14 | Đổi ô nguồn của slot chỉ chọn được ô Đã duyệt cùng Cột; slot viết lại và có thêm bản trong `history`. |
| V8-15 | Gen ảnh cần prompt; mỗi lần Gen thêm một phiên bản và chọn nó; `<` `>` đổi phiên bản. |
| V8-16 | Dữ liệu v2.6 và v2.7 được cất sang `autocontent.state-v26` / `-v27`, banner nêu đúng phiên bản, không báo "dữ liệu hỏng". |
| V8-17 | HR-10/11/12 hiện Lưu ý đúng trường hợp (so với Topic của hàng). |
| V8-18 | Chỉ số T1: Sẵn sàng 17/17, Đã đăng 17/17, Đúng bản 15/17. |
| V8-19 | Giữ các tiêu chí còn hiệu lực của v2.6: V5-11, 12, 15–19, 21–24 (đổi "Idea" thành "Topic"). |

## 9.2. Kịch bản kiểm thử

| ID | Kịch bản | Mong đợi | TC |
|---|---|---|---|
| L1 | Mở app lần đầu | Dashboard tuần 12/10, Tuần nhẹ 9 slot, việc tiếp theo "Duyệt 9 slot" | V8-03 |
| L2 | Sang tuần 09/11 từ lịch tháng | Tuần "Chưa lập", 0 slot, việc tiếp theo "Lập tuần: chọn Tuần mẫu" | V8-04 |
| L3 | Lập tuần 09/11 | Gợi ý Tuần chuẩn (không có tuần trước); đổi sang Tuần nhẹ xem trước 9 slot; Tạo slot → 9 slot trống, nút khóa | V8-05 |
| L4 | Xóa 9 slot rồi thêm 1 slot bằng + | Nút mở lại sau khi xóa hết; sau khi thêm slot lại khóa | V8-06 |
| L5 | Tuần 19/10 → Matrix | Bảng 3 × 5; 11 đã duyệt / 3 chưa duyệt / 1 đã hủy; Chia bài khóa "3 ô chưa duyệt" | V8-11 |
| L6 | Hủy Topic 3 | Hộp nêu 5 ô; sau hủy còn 2 hàng, 10 ô | V8-10 |
| L7 | Nạp Topic vào tuần chưa lập | Có bảng Topic; Chia bài khóa "Chưa có slot"; việc tiếp theo vẫn là Lập tuần | V8-07 |
| L8 | Nạp tệp 9 Topic / quá ngắn | Lỗi, nút nạp khóa, dữ liệu giữ nguyên | V8-07 |
| L9 | Chi tiết slot T2 (Facebook) | Ô nguồn, ô ảnh có prompt; Duyệt/Tạo lại/Sửa/Gen khóa "từ đợt R3′" | V8-12 |
| L10 | Setup · Tuần mẫu | Đổi tên, đưa lên/xuống, nhân bản, xóa, thêm slot mẫu; gợi ý khi Lập tuần đổi theo thứ tự | V8-05 |
| L11 | Mở dữ liệu v2.6 và v2.7 cũ | Cất đúng khóa, banner đúng phiên bản, demo mới | V8-16 |
| L12 | 360 px: Dashboard, Matrix, Setup · Tuần mẫu | Không cuộn ngang; Matrix dạng thẻ | UX |
| C1 | (R3′) T3 duyệt 3 ô → Chia bài | 17/17 slot có bài | V8-13 |
| C2 | (R3′) Đổi ô nguồn của slot Facebook · Hướng dẫn | Chỉ 3 ô Hướng dẫn Đã duyệt; slot viết lại, history 2 bản | V8-14 |
| C3 | (R3′) Gen ảnh slot T2 | Phiên bản 1, 2; `<` quay lại phiên bản 1 | V8-15 |

Giữ các kịch bản còn hiệu lực của v2.6: U1–U7, X3–X12, Y1–Y3, Y6, Z1–Z10 (số theo 7.3). Tự động hóa ở R1′: 43 kiểm thử logic (Node) và 68 kịch bản giao diện (Playwright); sau R2′: 51 và 86, gồm điện thoại 360 px, chế độ tối, dữ liệu cũ, dữ liệu hỏng, localStorage bị chặn.

---

# 10. Kế hoạch dựng

| Đợt | Nội dung | Kiểm thử chính |
|---|---|---|
| **R1′ (cập nhật theo v2.8)** | Nền tảng, Setup (5 Cột, 6 kênh, 15 Format, **nhiều Tuần mẫu**), Dashboard với điều hướng tuần/tháng, **Lập tuần bằng Tuần mẫu**, thêm/sửa/xóa slot, **nạp Topic** (tệp/dán, phiên bản khi nạp lại, tìm, **Hủy Topic**), **Matrix một bảng chỉ đọc** (có gợi ý ảnh), chi tiết slot (ô nguồn, ô ảnh, nút khóa), cảnh báo HR-10/11/12, seed v2.8, di trú cất dữ liệu cũ | L1–L12, Z |
| **R2′ — Viết ma trận** | Viết ma trận (mọi ô, kèm gợi ý ảnh), Dừng, Duyệt/Tạo lại/Sửa/Hủy ô, lịch sử lượt sinh, back/next và Dùng phiên bản Topic, sửa Topic trực tiếp, duyệt hàng loạt | MTX, W |
| **R3′ — Chia bài và slot** | Chia bài (tự chọn ô, đổi ô), viết slot theo 5 cách trình bày, Duyệt/Tạo lại/`<` `>`/Sửa slot, cần cập nhật, **ô ảnh: Gen và `<` `>`** | C1–C3, P, X |
| **R4 — Chốt, đăng, số liệu, xuất** (đã dựng) | Xác nhận lịch (hai lần xác nhận), Mở lại, cách đăng theo kênh (Tự động qua API/Metricool/Postiz hoặc Thủ công), tự đăng mô phỏng, đánh dấu đã đăng + link, số liệu mô phỏng theo mốc, chỉ số trên thẻ slot và header, màn Report (Overview/Tuần/Tháng), đồng hồ demo tua được, xuất ZIP (kèm ảnh, manifest sha256) | Y, Z5–Z6, mục 10.22 |
| R5 | Máy chủ, cơ sở dữ liệu, đăng nhập, lịch đăng chạy nền | — |
| R6 | Nối thật kênh đầu tiên (Metricool hoặc Meta FB + IG) | — |
| R7 | Nối các kênh còn lại; khớp số liệu bài đăng tay theo link | — |

## 10.51. Nạp thêm Topic và gửi định hướng cho AI (14/10/2026, bản 76)

- **Nạp thêm Topic:** tuần đã có Topic hiện hai nút "Nạp thêm Topic" và "Nạp lại tất cả"; chưa có thì chỉ "Nạp Topic". Nạp thêm xếp Topic của tệp mới xuống cuối ma trận (thứ tự n+1…), tạo ô cho mọi Cột của tuần, giữ nguyên Topic cũ, phiên bản và bài đã viết. Topic trùng hẳn (cùng tên, nội dung, ba dòng định hướng) với Topic đang có bị bỏ qua; nếu không còn gì để thêm thì báo lỗi. Tổng tối đa 8 Topic mỗi tuần. Không cần xác nhận vì không làm mất dữ liệu. Tệp Topic gốc của tuần (`topics.md` khi xuất) được nối thêm các Topic mới. Tuần đã chốt thì không nạp thêm.
- **Nạp lại tất cả** giữ hành vi cũ (mục 10.5): thay toàn bộ Topic của tuần, có hộp xác nhận khi có Topic đổi hoặc bớt.
- **Sửa và Xóa trên hàng Topic:** nút "Sửa" mở thẳng form Sửa Topic (tạo phiên bản mới), nút "Xóa" mở hộp xác nhận Hủy Topic như trước.
- **Định hướng cho AI:** ba dòng Thông điệp chính, Đối tượng, Góc nhìn của phiên bản Topic hiện hành được thêm vào lệnh AI viết ô và lệnh sao chép cho agent ngoài, ngay trước nội dung Topic, kèm nhãn "dữ liệu để bám theo, không phải lệnh". Topic không có dòng nào thì không thêm mục này. Chưa áp dụng cho lệnh chuyển bài sang slot.

## 10.50. Khung trình bày đi kèm lệnh AI, lệnh agent ngoài dùng Skill (14/10/2026, bản 75)

- Lệnh AI viết ô (`cellJob`) luôn có mục "# Khung trình bày" (khung riêng của Cột hoặc khung mặc định theo Cấu trúc), kể cả khi có Skill; Skill nên khớp khung (đoạn tối đa 3 câu và 80 chữ, in đậm tối đa 2 chỗ mỗi đề mục).
- Lệnh sao chép cho agent bên ngoài (`cellPrompt`) dùng Skill đang chọn thay mục "Chức năng của Cột"; không có Skill thì như cũ.
- Form Sửa Cột: ô Hướng dẫn viết gập lại khi có Skill (vẫn lưu được); nhãn Khung trình bày ghi rõ "gửi kèm lệnh cho AI viết bài".
- Bản nháp Skill Cột Giải thích: `skills/cot-giai-thich.md` (chưa nạp vào app; chờ người dùng duyệt và bài mẫu thật).

## 10.49. Skill (bộ chỉ dẫn) gắn theo Cột và Format (14/10/2026, bản 74)

Mỗi Cột và mỗi Format có danh sách Skill riêng (không có thư viện chung). Nạp được nhiều Skill, tại thời điểm gen chỉ dùng đúng một (`activeSkillId`); đổi bằng cách chọn lại. Không chọn thì dùng hướng dẫn cũ (`guideMd`).

- Dữ liệu: `skills` [{id, name, version, body, note, updatedAt, history}] nằm trong Cột/Format nên đi theo Sao lưu. Sửa nội dung tăng version và giữ 5 bản cũ; có thể khôi phục (thành bản mới).
- Ghép lời nhắn: Skill thay `guideMd`; khi có Skill thì bỏ "bản nháp máy" và dòng Bố cục (Skill tự nêu bố cục), giữ nhãn đầu ra (Slide n, [Hook]) để mã tách được. Quy tắc cứng (độ dài, CTA, từ cấm, số slide) vẫn gửi kèm và thắng Skill.
- Sửa đoạn, Hook, Caption dùng Skill của Format của slot đang sửa (hoặc Cột của ô).
- "Quy tắc viết chung" (`settings.writingRules`) cộng vào lời nhắn hệ thống cho mọi lần gen.
- Bài do AI viết ghi `ai.skill` {id, name, version}; hiện cạnh "Bài do AI viết".
- Soạn trong Setup (Cột/Format → Quản lý Skill). "Xem AI sẽ đọc gì" cho xem phần chỉ dẫn gửi kèm; "Xuất để so mù" xuất tệp bài có/không Skill đã xáo trộn kèm đáp án ở cuối.
- Cảnh báo mềm: dài quá 6000 ký tự, thiếu hoặc quá nhiều bài mẫu `<example>` (khuyến nghị 3–5).
- Chưa đo: Skill có làm bài tốt hơn không (cần so mù); chi phí thực tế.

## 10.48. Gen ảnh OpenAI mặc định chất lượng thấp (14/10/2026, bản 73)

Yêu cầu Gen và Img2Img gửi OpenAI thêm `quality: 'low'` (mặc định, có thể ghi đè bằng `cfg.quality`). Trước đó không gửi tham số này nên model tự chọn mức cao, giá khoảng 10 lần mức thấp. Chưa có ô chọn chất lượng trong Setup.

## 10.47. AI chữ qua Claude của claude.ai (14/10/2026, bản 72)

Khung artifact claude.ai chặn `fetch` ra ngoài, nên Anthropic/OpenAI trực tiếp không chạy được trong artifact (đã kiểm: Thử viết một câu báo "Không kết nối được"). Thêm nhà cung cấp `claudeai` cho AI viết bài: gọi qua quyền `sample` của artifact, dùng tài khoản claude.ai đang xem, không cần khoá và không có địa chỉ API. Việc nhẹ (Sửa đoạn, Hook, CTA) dùng `modelTier` quick, còn lại default. Lần đầu hiện hộp xin phép; hạn mức tính vào gói claude.ai. Không chạy ở bản HTML mở ở máy. AI ảnh và phụ đề vẫn dùng fetch nên vẫn bị chặn trong artifact (mở: dùng bản chạy ở máy, máy chủ riêng hoặc proxy).

## 10.46. Ô Sửa Blog dạng khối (14/10/2026, bản 71)

UI: `blogBlocksHtml(st)` (04l) tách bản nháp thành đoạn chữ (`.pv-seg`) và khối ảnh/video (`.pv-bblk`, giữ dòng gốc trong `data-line`); `#pv-edit` thành ô ẩn giữ bản ghép (ghép bằng `\n`, nên mọi mã đọc `#pv-edit`, `st.draft` vẫn chạy); `mdTa(id, first)` (01-core) cho thanh công cụ và trợ lý AI biết đoạn đang đứng; nối sự kiện ở `paint` (04b). Test giao diện 353.

## 10.45. Xem chỉ đọc, thay đổi qua nút Sửa (14/10/2026, bản 69)

UI: `blogBodyHtml` bỏ `ins` và công cụ ảnh (04l-blog); `blogEditMediaHtml(st)` (danh sách ảnh/video trong bản đang sửa, nối vào `pvEditBox` ở 04b); `blogMediaTools(..., editing)` chỉ có Mô tả, Xoá khi sửa; `blogSeoPanelHtml` dùng `ro = locked || !edit`; `b-altsave`, `b-del`, `b-orph` ghi vào `st.draft` khi đang sửa; slot tự do chỉ hiện `pvMediaHtml` khi sửa. Test giao diện 353.

## 10.44. Model riêng cho việc nhẹ (14/10/2026, bản 68)

`S.textApi.lightModel`; `textCfgFor(S, light)` (05o-aitext); UI `textCall(job, maxTokens, light)` (04k), gọi với `light = true` ở Sửa đoạn và Hook/CTA (04g). Nhà cung cấp Máy chủ riêng không có ô này. Test logic 106, giao diện 350.

## 10.43. Slot tự do đếm slide theo ảnh (14/10/2026, bản 67)

`checkRules` nhận `ctx.slideCount`; `slotWarnings` truyền số ô có phiên bản ảnh hiện tại khi `slot.free`. Slot từ Matrix không đổi. Test logic 106.

## 10.42. Chuẩn ảnh theo nền tảng và phạm vi Blog theo Format (14/10/2026, bản 66)

**Vấn đề:** ảnh gốc và ảnh sau Frame hiển thị khác nhau (khung cắt ảnh, tỉ lệ đoán từ tên ô). **Cách làm:**
- Logic `src/logic/05q-imgspec.js`: `PLATFORM_IMG_DEFAULT`, `IMG_STANDARDS` (bảng tham chiếu, ghi theo hướng dẫn công khai của nền tảng, cần kiểm lại khi nền tảng đổi), `assetRatioFor` (a.ratio → `[4:5]`/tên ô → ảnh Blog 16:9 → mặc định kênh), `stampRatios` (gọi khi tạo, sửa slot, migrate), `imageSize` (đọc đầu tệp PNG/JPEG/GIF/WebP), `ratioMismatch` (lệch quá 3%), `imageIssues` (IMG-01: sai tỉ lệ hoặc rộng dưới 90% chuẩn), `imageInfoOf`, `mockArt`.
- Tỉ lệ đặt cho ô bằng cách ghi `[4:5]`, `[9:16]`… trong tên ô ảnh của Format, hoặc dùng mặc định kênh ở Setup → Chuẩn ảnh (`S.settings.imgDefaults`). Chưa có ô chọn tỉ lệ riêng cho từng ô ngoài Cắt và Frame.
- Giao diện: ảnh luôn trọn theo tỉ lệ ô (xem bài, danh sách, mini, Frame, Chữ, Cắt, Img2Img); nhãn "Ảnh W×H · ô X" khi lệch; nút "Cắt về X" (`img-fit`); Frame hoặc Cắt sang tỉ lệ khác đổi tỉ lệ ô sau khi hỏi.
- Xuất: SVG mô phỏng đúng tỉ lệ ô; `schedule.json` mỗi slot có `imageInfo` (tỉ lệ, chuẩn, kích thước thật, ok).
- Blog theo Format: `isBlogSlot` = Format có layout `article` (nhãn "Bài Blog"); slot tự do trên kênh Blog không có SEO nếu Format không phải Bài Blog; ô từ khoá khi thêm slot và thanh Markdown theo cùng điều kiện.
- Test: logic 105, UI theo mục 10.42.

## 10.41. Thanh công cụ ảnh gọn: < > Gen Up Store Edit (14/10/2026, theo góp ý người dùng)

Thay thanh 11 nút (Gen, Prompt, Sửa, Frame, Chữ, Mẫu, Cắt, Kho, Img2Img, Up…) bằng **một thanh dùng chung** `imgToolbar` (`src/ui/04m-imgtools.js`) ở mọi chỗ có ảnh: ảnh trên khung bài khi Sửa, danh sách ảnh của slot nhiều ảnh, ô media của slot tự do, ảnh/video trong bài Blog.

- **`<` `>`**: đổi phiên bản như trước.
- **Gen**: bấm là Gen lại (phiên bản mới từ prompt; gọi API khi đã bật). Rê chuột hoặc focus bàn phím lên Gen hiện **nút Prompt nhỏ phía trên**; bấm để sửa prompt (ô Prompt ngay dưới ảnh trong Xem như khi đăng; hộp thoại ở danh sách ảnh). Máy cảm ứng (không có hover) luôn hiện nút Prompt cạnh Gen. Ô chưa có prompt: bấm Gen mở ô Prompt. Ô video: Gen tắt.
- **Up**: tải ảnh (hoặc video ở ô cho phép) lên làm phiên bản mới.
- **Store**: kho ảnh chung dạng **gallery** (lưới ảnh vuông, tên và số lần dùng ở chân ảnh, rê chuột hiện "Dùng ảnh này"), tìm theo tên/thẻ, lọc theo thẻ (chip), lọc **Chưa dùng**, nút xem lớn từng ảnh, Lưu ảnh đang dùng vào kho, Tải ảnh vào kho. Bấm ảnh: dùng cho ô này (phiên bản mới). Quản lý tên, thẻ, xoá vẫn ở Setup → Kho tài sản.
- **Edit**: mở trang sửa có thanh tab **Ảnh · Frame · Chữ · Img2Img · Cắt · Mẫu** (video: **Bìa · Phụ đề**). Tab Ảnh hiện ảnh lớn và thẻ mô tả từng công cụ. Chọn tab mở đúng công cụ đã có (10.33–10.38) ngay trong cùng khung, thanh tab giữ ở trên để chuyển qua lại; xác nhận ở công cụ nào cũng tạo phiên bản mới như trước. Tab Mẫu khi chưa có mẫu: nhắc và quay về tab Ảnh.

Nút "Sửa" (sửa ảnh theo yêu cầu, mô phỏng) bỏ khỏi thanh: Img2Img làm việc này. Logic không đổi.

## 10.40. Blog chuẩn SEO: thông tin SEO, ảnh trong bài, liên kết, gói bài và đăng qua API (14/10/2026, theo kế hoạch Blog đã duyệt)

Gộp ba bước của kế hoạch (bản 64 chuẩn SEO, 65 ảnh và link, 66 kho bài và API) vào **bản artifact 64**. Áp cho slot Blog: kênh nền tảng Blog hoặc Format bố cục bài dài (`isBlogSlot`).

**Setup → Chuẩn Blog** (tab mới trước Kết nối AI). Chuẩn SEO chung (mặc định): tiêu đề SEO tối đa 60 ký tự; mô tả 140–160; bài 300–2 500 chữ; một đoạn tối đa 120 chữ; câu trả lời dưới đề mục đầu tối đa 60 chữ; mật độ từ khoá tối đa 3%; ít nhất 1 link nội bộ; tổng tối đa 15 link; ảnh bìa rộng từ 1 200px. Website: địa chỉ, đường dẫn blog (mặc định `/blog/`), tác giả mặc định, UTM source/medium. Phần **Gửi bài lên web qua API** và **Kho bài đã đăng** ở dưới.

**Thông tin SEO của slot** (Cấu hình slot, mục 3 "Thông tin SEO"): từ khoá chính, từ khoá phụ, ý định tìm kiếm (tìm hiểu, hướng dẫn, so sánh, mua/đăng ký), tác giả, chuyên mục, thẻ, slug, bài liên quan cần dẫn link, link CTA và chữ neo, tiêu đề SEO, mô tả, tóm tắt, mô tả ảnh bìa. Slot tạo từ Tuần mẫu nhận **từ khoá gợi ý** từ tiêu đề Topic (nhãn "Gợi ý, chưa xác nhận"); người dùng bấm **Xác nhận** (ở đây hoặc trong mục SEO khi xem bài). Thêm slot Blog có ô từ khoá. Slug, tiêu đề SEO, mô tả, tóm tắt, mô tả ảnh bìa **tự tạo theo bài** và tự cập nhật khi bài đổi, trừ ô đã sửa tay (xoá trắng ô để quay về tự tạo). Từ khoá trùng slot Blog khác hoặc bài trong kho thì báo khi lưu.

**AI viết theo chuẩn.** Lời nhắn AI cho slot Blog thêm khối SEO (từ khoá, ý định, cấu trúc H1/H2, đoạn trả lời ngắn dưới đề mục đầu, nguồn số liệu, CTA) và yêu cầu trả trường `seo` (tiêu đề SEO, mô tả, tóm tắt, mô tả ảnh bìa). Ô người dùng đã sửa tay không bị ghi đè. Viết lại bài (Tạo lại, Cập nhật từ ô, Dùng bản khác) **giữ ảnh đã chèn** ở vị trí tương ứng.

**Xem như khi đăng (slot Blog).** Giữa mỗi khối bài có nút **+** để chèn ảnh hoặc video (mô tả ảnh bắt buộc từ 5 ký tự). Bài lưu dòng `![mô tả](media:bm-N "chú thích")`; ô media là tài sản của slot (`a.blog`, `a.bid`), dùng đủ công cụ như ảnh bìa (Gen, Up, Kho, Img2Img, Cắt, Sửa) cùng **Mô tả** (alt, chú thích) và **Xoá**. Chèn ảnh đổi bài ngay trên bản đang dùng (không tạo bản mới); slot đã duyệt về chờ duyệt. Khi Sửa có nút chèn ảnh tại con trỏ và gắn link cho chữ đang chọn. Dưới khung bài là mục **SEO**: điểm 0–100, **mục bắt buộc** (từ khoá đã xác nhận, có H1, độ dài, không còn nhãn khung/hashtag/bảng/thẻ HTML, mô tả ảnh, link hỏng…) và mục chất lượng; nút **Chuẩn hoá định dạng** (`blogTidy`: dòng đầu thành H1, bỏ nhãn [Mở bài], hashtag, bảng, thẻ HTML, sửa đề mục nhảy cấp). **Gợi ý link**: nội bộ (bài trong kho, bài liên quan), nguồn ("Theo X:"), CTA (tự gắn UTM `utm_source/medium/campaign=slug`); nhập link rồi Gắn. Danh sách link đã gắn có nút Bỏ link.

**Gói bài.** Sao chép HTML (thân bài sạch, không class, không H1), Markdown (kèm front matter), JSON; **Tải gói ZIP** (`post.json`, `post.md`, `post.html`, `cover.*`, `media/bm-N.*`). JSON `autocontent.blog/1` có slug, tiêu đề, tiêu đề SEO, mô tả, tóm tắt, từ khoá, ý định, tác giả, chuyên mục, thẻ, `publishAt` (giờ slot, +07:00), canonical, ảnh bìa và alt, media, link kèm loại, CTA, `bodyMarkdown`, `bodyHtml`, `jsonLd` (BlogPosting). ZIP tuần thêm thư mục `blog/<slot>_<slug>/`.

**Kho bài đã đăng.** Nhập CSV (cột url, title, keyword; dấu phẩy, chấm phẩy hoặc tab) hoặc sitemap.xml (chọn tệp, dán, hoặc đọc qua link nếu web cho phép); sửa từ khoá từng bài, xoá. Bài Blog gửi lên web hoặc đã đăng có link cũng vào kho. Kho dùng để gợi ý link nội bộ và báo trùng từ khoá.

**Đăng lên web qua API (chạy thật, chờ web cấp API).** Setup → Chuẩn Blog: bật, địa chỉ API (https, hoặc http://localhost khi thử), token, tên header (mặc định `Authorization`), tiền tố (`Bearer`), khi gửi (bản nháp, lên lịch theo giờ slot, đăng ngay), ảnh/video (gửi kèm ảnh dạng data URL, kèm cả video, hoặc không gửi). **Token chỉ ở trình duyệt** (khoá `blogapi`, như khoá AI), không vào dữ liệu lưu, sao lưu hay ZIP; "Nhớ token" để giữ qua lần mở sau. **Thử kết nối** gửi `{"schema":"autocontent.blog/1","test":true}`. **Tải tài liệu API (.md)**/Sao chép tài liệu: hợp đồng cho lập trình viên web (phương thức, header, CORS, trường JSON, mã trả về 200/201/401/409/413/422, gửi lại cùng `id` thì cập nhật bài) kèm danh sách SEO phía web (thẻ title, meta, canonical, JSON-LD, sitemap, Open Graph, ảnh lazy, tốc độ). Nút **Gửi lên web** trong mục SEO chỉ bật khi slot đã duyệt và đạt mọi mục bắt buộc; hỏi xác nhận, gửi JSON, ghi `s.webPost` (giờ gửi, link, mã bài). Web trả link: tới giờ slot (tuần đã chốt) slot thành Đã đăng với link thật, cách đăng "api"; Đăng ngay thì đăng luôn; Bản nháp thì chờ người duyệt trên web. Lỗi báo theo mã (token sai, sai địa chỉ, trùng slug, quá lớn, web từ chối, máy chủ lỗi).

**Chưa làm (R5).** Đọc Search Console, sitemap tự động, đăng chạy nền khi trình duyệt tắt. Chưa thử với web thật: kiểm bằng máy chủ giả trong test giao diện.

Logic `src/logic/05p-blogseo.js`: `BLOG_SEO_DEFAULT`, `blogSeoOf`/`setBlogSeo`, `isBlogSlot`, `slotSeoOf`/`setSlotSeo`, `vnSlug`, `keywordConflicts`, `suggestKeyword`, `confirmKeyword`, `blogDoc`, `blogAutoMeta`/`blogRefreshAuto`, `seoWeave`, `addBlogMedia`/`insertBlogMedia`/`removeBlogMedia`/`setBlogText`, `blogMediaIssues`, `keepBlogMedia`, `utmUrl`, `linkType`, `anchorSpots`, `applyLink`/`unlinkAt`, `linkSuggestions`, `blogTidy`, `seoAudit`, `mdToHtml`, `blogPackage`, `parsePostsCsv`, `parseSitemap`, `importBlogPosts`, `blogInventory`, `blogApiOf`/`setBlogApi`, `buildBlogPostRequest`, `parseBlogPostResponse`, `blogPostGate`, `recordWebPost`, `blogApiDoc`, `blogAiBrief`. Giao diện `src/ui/04l-blog.js`. Test: logic 103, giao diện thêm 15 kịch bản 10.40.

## 10.39. Viết bài bằng AI thật và cất ảnh, video trong IndexedDB (13/10/2026, theo rà soát quy trình)

**Setup → Kết nối AI** (tab đổi tên từ "AI ảnh & video") có hai phần: **AI viết bài** (mới) và AI ảnh và video (10.38). AI viết bài: nhà cung cấp Mô phỏng (mặc định), Anthropic Claude (`claude-sonnet-5-5`, `https://api.anthropic.com/v1`, gọi thẳng từ trình duyệt bằng tiêu đề `anthropic-dangerous-direct-browser-access`), OpenAI (`gpt-4.1-mini`, `/chat/completions`), Máy chủ riêng (POST `{system, user, model, max_tokens}` → `{text}`); model và địa chỉ sửa được; **Thử viết một câu** để kiểm tra khoá. Khoá lưu riêng theo nhà cung cấp (`autocontent.key.<nhà cung cấp>` khi chọn Nhớ khoá; OpenAI dùng chung cho chữ và ảnh), không nằm trong S.

**Cách chạy.** Logic giữ đồng bộ. Khi bật AI, giao diện **chạy thử** thao tác trên bản sao S (`aiPlan`) để biết ô/slot nào sẽ được viết và dựng lời nhắn cho từng việc; gọi AI song song tối đa 3 việc, thanh tiến độ trên cùng màn hình ("Anthropic Claude đang viết 2/9 bài…", nút **Dừng**: không đổi gì); rồi chạy thao tác thật, `addCellGen` và `writeSlotFromCell` lấy kết quả theo khoá `cell:<id>:<lượt>` / `slot:<id>:<lượt>`. Việc nào AI lỗi thì dùng bản mô phỏng (thông báo số bài lỗi); lỗi tất cả thì hỏi "Dùng mô phỏng?". Áp dụng cho Viết ma trận, Tạo lại ô, Chia bài, Tạo lại slot (View, Cấu hình slot), Thêm và tạo bài, Tạo bài cho slot trống, Cập nhật từ ô, Đổi ô nguồn. Dữ liệu demo nạp sẵn vẫn là mô phỏng.

**Lời nhắn cho AI.** Hệ thống: vai trò, tiếng Việt, chỉ dùng số liệu có trong Topic/hồ sơ (không bịa), từ phóng đại cấm, toàn văn hồ sơ Thương hiệu và Giọng văn, yêu cầu trả JSON `{text, imagePrompt, scores, tip}`. Việc ô: Cột (hướng dẫn, bố cục "## phần", độ dài, CTA), Topic, bối cảnh tuần, **bản nháp máy làm khung bố cục**, lượt viết, tiêu chí chấm. Việc slot: Format, kênh (giới hạn ký tự, hashtag), cách trình bày theo layout (Slide i:, [nhãn cảnh], Markdown blog…), bài gốc đã duyệt, bản nháp máy, tiêu chí. Kết quả: `parseAiPost` đọc JSON (cả khi bọc ```json); điểm đủ mọi tiêu chí 1–5 thì dùng điểm AI, thiếu thì điểm mô phỏng. Bản viết ghi `gen.ai` / `slot.ai {provider, model, scored}`; khối điểm ghi "AI chấm · <nhà cung cấp>" và nhãn "Bài do AI viết"; sửa tay thì bỏ nhãn.

**Sửa đoạn, Hook, caption** gọi AI khi bật (nhãn "AI thật · <nhà cung cấp>"); "Thử cách khác"/"Thử bộ khác" gọi lại với yêu cầu viết khác. Chuyển kênh (10.37) vẫn mô phỏng.

**Ảnh, video cất IndexedDB (chạy thật).** Khi lưu, mọi chuỗi data URL dài hơn 4 096 ký tự được thay bằng `idb:<khoá>` trong localStorage; nội dung cất ở IndexedDB `autocontent-media` theo khoá băm nội dung (ảnh giống nhau, ví dụ ảnh kho dùng ở nhiều slot, chỉ cất một lần). Ghi IndexedDB xong mới ghi localStorage, các lần lưu xếp hàng. Mở trang: nạp lại nội dung, khoá thiếu thì thay ô xám và báo; dọn nội dung không còn dùng. Trình duyệt chặn IndexedDB thì lưu như cũ. Video tối đa 25 MB (3 MB khi không có IndexedDB). Sao lưu và ZIP vẫn chứa đủ ảnh, video.

Logic `src/logic/05o-aitext.js`: `TEXT_PROVIDERS`, `textApiOf`, `textApiOn`, `setTextApi`, `buildTextRequest`, `parseTextResponse`, `extractJson`, `setAiText`/`takeAiText`/`clearAiText`, `aiPlan`, `aiScore`, `parseAiPost`, `rewriteJob`, `hooksJob`, `parseHooks`, `captionsJob`, `parseCaptions`. Giao diện `src/ui/04k-aitext.js` (`textCall`, `aiBusy`, `withAiText`, `textApiSection`, `aiConnectTab`), `src/ui/01b-mediastore.js` (`mediaOpen`, `mediaKey`, `stateJson`, `mediaPutAll`, `mediaHydrate`, `mediaGc`).

## 10.38. Ảnh AI thật qua API, ảnh bìa và phụ đề video (13/10/2026, mục 10 của danh sách đề xuất)

**Setup → AI ảnh & video.** Nhà cung cấp: Mô phỏng (mặc định), OpenAI, Stability AI, Máy chủ riêng. Đổi nhà cung cấp điền sẵn model và địa chỉ (OpenAI `gpt-image-1`, `https://api.openai.com/v1`; Stability `sd3.5-large`, `https://api.stability.ai`); sửa được. Địa chỉ phải là https:// (cho phép http://localhost khi thử). OpenAI có thêm ô Model nhận giọng nói (`whisper-1`). **Khoá API** nhập ở ô mật khẩu; mặc định chỉ giữ trong bộ nhớ (đóng trang là quên), chọn "Nhớ khoá" thì lưu ở localStorage riêng `autocontent.imgkey`; khoá **không nằm trong dữ liệu S**, nên không vào Sao lưu hay ZIP. **Kiểm tra khoá** gọi API miễn phí (OpenAI `/models`, Stability `/v1/user/account`). Trang ghi rõ: mỗi lần gọi tính phí vào tài khoản của khoá; trình xem artifact có thể chặn gọi ra ngoài (khi đó tải tệp HTML về máy mà mở).

**Gen và Img2Img gọi API thật** khi đã bật: Gen (nút Gen, "Lưu prompt và Gen") gửi prompt và khổ theo tỉ lệ ô ảnh (OpenAI 1024×1024 / 1024×1536 / 1536×1024; Stability theo tỉ lệ); Img2Img gửi ảnh đang dùng (ảnh mô phỏng được vẽ ra JPEG trước) và yêu cầu (OpenAI `/images/edits` không có mức biến đổi; Stability có `strength`). Máy chủ riêng nhận POST JSON `{mode, prompt, ratio, width, height, strength, image}` và trả `{image}` hoặc `{url}`. Ảnh nhận về nén JPEG cạnh dài tối đa 1600px, thành phiên bản mới: `v.ai {provider, model, prompt, mode}` (nhãn "AI thật") hoặc `v.i2i.simulated = false` (nhãn "Img2Img AI"). Lỗi (khoá sai, hết hạn mức, bị chặn nội dung, không kết nối được) báo bằng lời dễ hiểu kèm nút **Dùng mô phỏng**. Thanh ảnh trong View ghi nhãn phiên bản cạnh số bản.

**Ảnh bìa video (chạy thật).** Nút **Bìa** ở ô đang chứa video (View khi Sửa, Cấu hình slot): kéo thanh thời gian, **Lấy khung này** (canvas, JPEG cạnh dài tối đa 1280px) hoặc tải ảnh lên; Tải ảnh bìa xuống; Lưu (`v.cover {src, t}`), Bỏ ảnh bìa. Video hiện ảnh bìa làm poster.

**Phụ đề (một phần mô phỏng).** Nút **Phụ đề**: video xem thử có phụ đề chạy theo; danh sách dòng (giờ bắt đầu, kết thúc dạng phút:giây, chữ tối đa 200 ký tự, nút xem từ dòng, xoá); **Tạo từ bài (mô phỏng)**: bỏ nhãn [..], tiêu đề, "Slide i:", hashtag, chia câu dài thành đoạn ≤ 84 ký tự (2 dòng × 42), chia thời lượng video theo độ dài đoạn; **Nhận giọng nói (API)** (OpenAI, tệp ≤ 25 MB, tiếng Việt) thay bằng các đoạn có giờ thật; **Nhập .srt/.vtt**; **Thêm dòng**. Giờ sai thì ô đỏ; dòng chồng giờ hoặc kết thúc trước bắt đầu thì báo khi Lưu. **Tải .srt / .vtt**; Lưu (`v.subs {cues, source: script|file|api|manual, lang}`), Bỏ phụ đề. Xuất ZIP kèm `<tệp>_bia.jpg` và `<tệp>.srt` cạnh video.

Logic `src/logic/05n-media.js`: `IMAGE_PROVIDERS`, `imageApiOf`, `imageApiOn`, `setImageApi`, `apiSizeFor`, `buildImageRequest`, `parseImageResponse`, `buildCheckRequest`, `buildSttRequest`, `parseSttResponse`, `videoAt`, `setVideoCover`, `fmtClock`, `parseClock`, `normCues`, `validateCues`, `scriptLines`, `subtitleDraft`, `cuesToSrt`, `cuesToVtt`, `parseSubtitles`, `setVideoSubs`. Giao diện `src/ui/04j-media.js`. Giới hạn: khoá ở trình duyệt chỉ hợp cho thử nghiệm; khi có máy chủ (R5) mọi lệnh gọi API chuyển qua máy chủ.

## 10.37. Kho tài sản, soạn carousel theo slide, chuyển bài sang kênh khác (13/10/2026, theo kế hoạch 8 mục)

Bản này hoàn tất kế hoạch 8 mục (10.35–10.37). Mục 9 và 10 trong danh sách đề xuất để sau.

**Kho tài sản (chạy thật).** Setup → **Kho tài sản**: tải nhiều ảnh một lần (PNG, JPEG, WebP, GIF; nén khi thêm: JPEG cạnh dài tối đa 1600px, PNG giữ nền trong suốt tối đa 1200px), ô "Thẻ cho ảnh sắp tải"; mỗi ảnh có tên và thẻ sửa tại chỗ (thẻ cách nhau dấu phẩy, bỏ dấu #, tối đa 8), khổ ảnh, số lần đã dùng, Xoá (slot đã dùng vẫn giữ ảnh). Tìm theo tên hoặc thẻ (không phân biệt dấu), lọc theo thẻ. Nút **Kho** trên ảnh (View khi Sửa, slot tự do, Cấu hình slot; dùng được cả khi ô chưa có ảnh): hộp chọn có ô tìm, lưới ảnh, **Lưu ảnh đang dùng vào kho**, **Tải ảnh vào kho**; bấm một ảnh → phiên bản mới (`v.lib {id, name}`), nhãn "Từ kho". Giới hạn: ảnh kho được chép vào phiên bản (tốn chỗ localStorage); khi có máy chủ (R5) sẽ lưu một lần và tham chiếu.

**Soạn carousel theo slide (chạy thật).** Nút **Soạn carousel** trên thanh View của bài có layout carousel (khi chưa khoá). Hộp thoại: ô Chú thích bài (phần trước "Slide 1"), dải thẻ slide cuộn ngang, mỗi thẻ có ảnh của slide, ô chữ, nút dời trái/phải, Bỏ slide; Thêm slide (tối đa 20). Lưu → bài ghép lại dạng "Slide i: …", ô ảnh "Slide i/n" đi theo slide khi đổi thứ tự, slide mới có ô ảnh trống, slide bị bỏ thì ô ảnh bỏ theo (ô ảnh khác giữ nguyên). Chữ đổi thì bài về Bản nháp như khi Sửa.

**Chuyển bài sang kênh khác (mô phỏng).** Nút **Chuyển kênh** trên thanh View (cả khi bài đã khoá) cho bài đã có chữ. Hộp thoại: chọn Format đích (theo kênh, khác Format hiện tại), ngày, giờ, xem trước bài mới. `convertPost` tách câu của bài gốc rồi ghép theo layout đích: carousel (slide ý chính, tới 6 slide nội dung, slide CTA), kịch bản ngắn ([Hook · 0–3 giây], [Ý chính], [CTA]), kịch bản dài (4 phần có mốc giờ), bài viết (# tiêu đề, ## Vấn đề, ## Cách làm, ## Kết luận), bài thường (hook Bất ngờ + câu vừa giới hạn ký tự kênh + CTA + hashtag tối đa theo kênh). CTA và hashtag lấy từ thư viện hợp Cột và kênh đích. Tạo → slot tự do mới cùng Cột (`slot.repurposedFrom {slotId, formatId, simulated}`), chép ảnh đang dùng của ô ảnh đầu; tuần đã chốt thì báo lỗi. Thông báo có nút Mở.

Logic `src/logic/05m-studio.js`: `libraryOf`, `addLibraryItem`, `normTags`, `updateLibraryItem`, `deleteLibraryItem`, `libraryFind`, `libraryTags`, `libraryUses`, `useLibraryItem`; `carouselParse`, `carouselCompose`, `saveCarouselSlides`; `plainSentences`, `convertPost`, `repurposeSlot`. Giao diện `src/ui/04i-studio.js`.

## 10.36. Cắt, xoay, đổi tỉ lệ ảnh và mẫu thiết kế (13/10/2026, theo kế hoạch 8 mục)

**Cắt (chạy thật).** Nút Cắt cạnh Chữ, Mẫu, Frame, Img2Img (View khi Sửa, slot tự do, Cấu hình slot; chỉ ảnh; khoá bài Đã đăng/tuần đã chốt). Hộp thoại: ảnh với khung cắt (vùng ngoài tối đi, lưới 1/3), kéo hoặc phím mũi tên để dời khung; tỉ lệ Giữ tỉ lệ gốc, 1:1, 4:5, 9:16, 16:9, 1200×630 (tỉ lệ đoán từ tên ô ảnh chọn sẵn); Xoay trái/phải 90°, Lật ngang, Về ban đầu; Phóng to 100–400%. Dòng "Ảnh ra" ghi khổ (khổ chuẩn của tỉ lệ: 1080×1080, 1080×1350, 1080×1920, 1280×720, 1200×630; giữ gốc thì cạnh dài tối đa 1600px) và báo khi vùng cắt nhỏ hơn khổ ra (ảnh sẽ mờ). Xác nhận cắt → phiên bản mới (`v.crop {from, ratio, rot, flip, zoom}`), nhãn "Đã cắt". **Tải đủ 5 khổ (ZIP):** cắt cùng tâm và mức phóng ra 5 khổ chuẩn, tải tệp `<tên ô>-v<n>-5-kho.zip` (không đổi dữ liệu slot).

**Mẫu thiết kế (chạy thật).** Trong hộp Chữ: **Lưu thành mẫu** (tên, kèm frame hoặc không) lưu các lớp chữ (vị trí, font, cỡ, màu, hiệu ứng); **Bắt đầu từ mẫu** nạp lớp chữ của mẫu để chỉnh tiếp. Nút **Mẫu** trên ảnh: chọn mẫu, mỗi lớp một ô chữ (lớp 1 điền sẵn câu đầu của bài; ô để trống giữ chữ mẫu), xem trước; mẫu có frame thì ghép frame (không chữ frame) rồi vẽ lớp chữ lên. Kết quả là phiên bản mới (`v.tpl {id, name, frameId}`, `v.text`), nhãn "Áp mẫu". Setup → Frame ảnh có mục Mẫu thiết kế (số lớp, font, frame, Xoá; ảnh đã áp mẫu giữ nguyên khi xoá mẫu).

Logic `src/logic/05l-design.js`: `CROP_RATIOS`, `cropRect` (kẹp vùng trong ảnh, phóng 1–4), `cropOutSize`, `normRotation`, `designTemplatesOf`, `saveDesignTemplate`, `deleteDesignTemplate`, `applyDesignTemplate`.

## 10.35. Trợ lý viết: sửa đoạn, hook và caption, hashtag & CTA (13/10/2026, theo yêu cầu người dùng)

Kế hoạch 8 mục (người dùng duyệt 13/10/2026): bản 59 gồm (1) Sửa đoạn bằng AI, (2) Phương án hook/caption, (8) Thư viện hashtag & CTA; bản 60: (3) Cắt, xoay, đổi tỉ lệ ảnh, (4) Mẫu thiết kế; bản 61: (5) Kho tài sản, (6) Soạn carousel theo slide, (7) Chuyển bài sang kênh khác. Phần mô phỏng ghi ở mục 0.6.

**Thanh soạn bài** (ô Sửa trong View của slot, hộp Sửa ô) có thêm nhóm ✨ Sửa đoạn, Hook, # CTA (ô sửa Topic không có).

- **✨ Sửa đoạn (mô phỏng):** đoạn bôi đen, hoặc cả đoạn (giữa hai dòng trống) chứa con trỏ. Hộp thoại trích đoạn gốc, 8 cách sửa và ô yêu cầu tự do (nhận ra từ khoá: ngắn, dài, thân mật, trang trọng, CTA, emoji, hook, chính tả). Kết quả hiện trong ô sửa được; "Thử cách khác" cho phương án khác; "Thay vào bài" thay đúng đoạn đó (Ctrl+Z hoàn tác). Thêm CTA lấy câu từ thư viện hợp ngữ cảnh.
- **Hook (mô phỏng):** tab 5 hook (mỗi loại một câu, "Thử bộ khác" đổi mẫu) thay câu mở đầu, giữ phần còn lại; tab 3 caption (Ngắn: hook + CTA + hashtag; Vừa: thêm 2 câu; Đầy đủ: thêm tới 6 câu) thay cả bài. Khi Lưu bản sửa, loại hook đã chọn ghi vào `slot.hookKind` (question, number, surprise, story, benefit) để đợt sau so hiệu quả theo số liệu.
- **# CTA (chạy thật):** hộp chèn liệt kê Hashtag và Lời kêu gọi; mục đúng Cột và kênh của bài xếp trước, rồi dùng chung, rồi theo lượt dùng; ô tìm; bấm để chèn vào chỗ con trỏ (con trỏ ở đầu bài thì chèn cuối bài, hashtag xuống đoạn mới). **Setup → Hashtag & CTA:** thêm mục (loại, nội dung, Cột hoặc Mọi Cột, kênh hoặc Mọi kênh), xoá, xem lượt dùng. Hashtag tự thêm dấu # và chỉ nhận chữ, số, gạch dưới; tối đa 200 ký tự. Dữ liệu demo có sẵn 10 mục; dữ liệu mới bắt đầu trống.

## 10.34. Thêm chữ lên ảnh (13/10/2026, theo yêu cầu người dùng)

**Nút Chữ** cạnh Frame và Img2Img (thanh ảnh khi Sửa trong View, mục Ảnh và video của slot tự do, Cấu hình slot); chỉ cho ảnh, khoá với bài Đã đăng và tuần đã chốt. Trình soạn: bên trái ảnh xem trước (canvas), bên phải bảng lớp chữ.

- **Lớp chữ:** tối đa 8 lớp (Chữ 1, Chữ 2…, Thêm lớp, Xoá lớp này). Lớp đầu điền sẵn câu đầu của bài (như gợi ý tiêu đề frame), đặt ở dưới ảnh.
- **Kiểu chữ:** nội dung (Enter để xuống dòng, tối đa 200 ký tự, tự ngắt dòng theo bề rộng khối), font Be Vietnam Pro, Roboto, Montserrat, Oswald, Playfair Display, Dancing Script (Google Fonts, có bộ ký tự tiếng Việt), cỡ 2–20% bề rộng ảnh (hiện số px trên ảnh ra), màu, Đậm, Nghiêng, căn Trái/Giữa/Phải (đổi căn lề giữ nguyên chỗ khối chữ), bề rộng khối 10–100%, hiệu ứng cho dễ đọc: Không, Bóng đổ, Viền chữ (viền đen cho chữ sáng, viền trắng cho chữ tối), Nền mờ sau chữ.
- **Vị trí:** kéo khối chữ trên ảnh (khung nét đứt đánh dấu lớp đang chọn; bấm vào chữ để chọn lớp), phím mũi tên dời 1% (Shift: 5%), Đặt nhanh Trên/Giữa/Dưới (căn giữa ngang). Toạ độ lưu theo tỉ lệ 0–1 nên ảnh ra giống xem trước.
- **Ảnh ra:** ảnh thật giữ tỉ lệ gốc, cạnh dài tối đa 1600px; ảnh mô phỏng theo khổ của tỉ lệ ô ảnh. JPEG chất lượng 0,88, thành phiên bản mới (`v.text {from, layers}`), chọn ngay; nhãn "Đã thêm chữ". Lớp chữ được lưu kèm phiên bản để sau này mở sửa lại khi cần.

Logic `src/logic/05j-textlayer.js`: `TEXT_FONTS`, `TEXT_EFFECTS`, `TEXT_PLACES`, `newTextLayer`, `normTextLayer` (kẹp mọi giá trị về miền hợp lệ), `placeTextLayer`, `textFontCss`, `validateTextLayers`; `addSlotImageVersion` nhận `text`.

## 10.33. Ghép frame và Image to Image (13/10/2026, theo yêu cầu người dùng)

**Frame ảnh (Setup → Frame ảnh).** Màu chính, màu nhấn và nhãn thương hiệu (mặc định là tên thương hiệu) dùng cho 5 khung dựng sẵn: Dải thương hiệu (1:1), Thẻ chữ dưới ảnh (4:5), Story chữ lớn (9:16), Thumbnail video (16:9, tiêu đề màu nhấn), Ảnh bìa Blog (1200×630). Thêm frame của công ty: tải PNG (hoặc WebP) nền trong suốt, chọn tỉ lệ (ảnh được kéo về đúng khổ 1080×1080, 1080×1350, 1080×1920, 1280×720 hoặc 1200×630), nhập vùng đặt ảnh và vị trí, cỡ chữ, màu của tiêu đề và phụ đề theo % khổ ảnh, xem trước bằng ảnh mẫu. Khung dựng sẵn không xoá được; xoá frame của công ty không ảnh hưởng ảnh đã ghép. Cuối tab hiện dung lượng dữ liệu đang lưu trong trình duyệt (ước tính trên 5 triệu ký tự).

**Ghép frame.** Nút Frame ở thanh ảnh khi Sửa trong View, ở mục Ảnh và video của slot tự do và ở Cấu hình slot (chỉ ảnh, không dùng cho video, khoá với bài Đã đăng và tuần đã chốt). Hộp thoại: lưới frame có ảnh nhỏ dựng từ chính ảnh đang dùng (cùng tỉ lệ ô ảnh xếp trước và chọn sẵn), Tiêu đề (gợi ý từ câu đầu của bài, bỏ nhãn, hashtag, `**`, cắt ở ranh giới từ, tối đa 90 ký tự), Phụ đề, xem trước sống. Chữ tự ngắt dòng và tự nhỏ lại tới 60% để vừa số dòng của khung, quá nữa thì cắt bằng "…". Xác nhận ghép tạo phiên bản mới (`v.frame {id, name, from, title, sub}`, JPEG chất lượng 0,85) và chọn ngay; bản gốc vẫn ở các phiên bản trước. Nhãn ảnh: "Đã ghép frame".

**Image to Image (mô phỏng).** Nút Img2Img: yêu cầu, gợi ý nhanh (Làm sáng hơn, Tông ấm cổ điển, Tông lạnh xanh, Đen trắng, Tương phản mạnh, Nhẹ nhàng pastel, Màu rực rỡ, Xoá phông nền), mức biến đổi 10–100%, ảnh Trước/Sau gần đúng. Ảnh thật (tải lên, đã ghép frame) được trình duyệt đổi màu bằng bộ lọc theo từ khoá (`i2iLook`), cạnh dài tối đa 1280px; ảnh mô phỏng sinh hình mô phỏng mới. Phiên bản mới ghi `v.i2i {from, prompt, strength, simulated}`; nhãn "Img2Img mô phỏng". Gắn API thật: thay `i2iEngine(v, prompt, strength)` để trả `{src}` từ dịch vụ (qua máy chủ ở R5, không nhúng khoá API vào trang).

**Lưu và xuất.** Ảnh ghép là data URL JPEG trong dữ liệu trình duyệt nên View, lịch và ZIP (assets/, đuôi .jpg) dùng như ảnh tải lên. localStorage có giới hạn khoảng 5 MB: sau khi ghép hoặc biến đổi, nếu dữ liệu vượt 80% sức chứa thì nhắc Sao lưu và xoá bớt ảnh cũ.

## 10.32. Font bài Blog trong View (13/10/2026, theo yêu cầu người dùng)

Khung xem bài Blog bỏ font Georgia (serif), dùng font chính Be Vietnam Pro và cùng bộ hiển thị `richText` với Cell/Topic: tiêu đề bài 22px đậm, đề mục ## thành tiêu đề mục có gạch ngăn, đoạn 15px giãn dòng 1,7, danh sách, in đậm, các bước. Khung bài vẫn nền trắng như trang web thật ở cả chế độ tối (gạch ngăn và nền trích dẫn dùng màu sáng cố định). Các khung mạng xã hội giữ font hệ thống để giống nền tảng.

## 10.31. Kéo thả slot giữa các ngày (13/10/2026, theo yêu cầu người dùng)

**Thao tác:** ở lịch tuần (màn rộng), kéo thẻ slot sang cột ngày khác. Khi kéo, cột thả được tô viền màu chính; cột không thả được (ngày giờ đã qua) tô đỏ; cột hiện tại không tô. Thả xong hiện hộp **"Chuyển slot sang ngày khác?"**: giờ · kênh · Format, "Từ T2 19/10 sang T7 24/10, giờ đăng giữ nguyên 19:30", cảnh báo nếu có; bấm **Chuyển** mới đổi, Hủy thì giữ nguyên. Sau khi chuyển, thông báo có nút **Hoàn tác** (7 giây).

**Quy tắc** (`moveSlotCheck`, `moveSlot`, `undoMoveSlot` ở `05-model.js`):
- Chỉ trong cùng tuần; giờ giữ nguyên; lịch ngày mới tự xếp theo giờ.
- Bài **Đã đăng** không kéo được (thẻ không có `draggable`).
- Không chuyển tới ngày giờ đã qua (so với giờ demo); slot Đăng lỗi chuyển sang ngày sau được.
- Cảnh báo (vẫn chuyển được): ngày mới đã có slot cùng kênh cùng giờ; hoặc đã có từ 2 slot cùng kênh.
- Tuần đã chốt: nút xác nhận đổi thành "Mở lại và chuyển"; chuyển xong tuần ở Đang sửa, cần Xác nhận lịch lại. Hoàn tác đưa slot về ngày cũ và chốt lại tuần nếu tuần được mở lại vì lần chuyển này.
- Trạng thái, nội dung, ô nguồn, ảnh của slot không đổi.

**Màn hẹp / điện thoại:** đổi ngày bằng ô **Ngày** trong Cấu hình slot → Vị trí đăng (đã có).

## 10.30. Khung Topic: chuẩn hoá tệp khi nạp, hiển thị theo mục (13/10/2026, theo yêu cầu người dùng)

**Khung Topic** (`S.topicFrame`; trống thì dùng `DEFAULT_TOPIC_FRAME`, logic ở `src/logic/05h-topicframe.js`): mỗi mục có tên chuẩn, tên gọi khác, kiểu hiển thị (`TOPIC_STYLES`: para, stats, steps, myth, qa, case) và cờ không bắt buộc. Mặc định 6 mục: Số liệu và phát hiện (Số liệu nổi bật), Vì sao (Đoạn văn), Cách làm (Các bước), Ngộ nhận thường gặp (Ngộ nhận ↔ Thực tế), Trường hợp (Khung trích dẫn, không bắt buộc), Câu hỏi luyện tập (Hỏi – đáp). Sửa ở **Setup → Khung Topic** (thêm, xóa, đổi thứ tự, Lưu khung, Dùng mặc định); tên trống hoặc trùng thì không lưu.

**Khớp đề mục** (`matchTopicSection`): trùng tên chuẩn, hoặc trùng/bắt đầu/chứa một tên gọi khác (từ 4 ký tự, bỏ dấu, không phân biệt hoa thường).

**Chuẩn hoá khi nạp** (`normalizeTopicMd`, gọi trong `previewTopics`; `importTopics` lưu tệp đã chuẩn hoá vào `topicFiles[].md` và tệp gốc vào `rawMd` khi khác):
1. Bỏ thẻ HTML, ảnh; link chỉ giữ chữ; bỏ dấu khối mã; bảng thành danh sách "- ô · ô".
2. Đề mục #### trở xuống thành dòng in đậm trong mục (không tách thành mục riêng).
3. Tệp một Topic dùng ## cho các mục (từ 2 đề mục ## khớp khung, không có ###): đổi thành ###, thêm "## tên Topic" lấy từ #.
4. Nối dòng bị ngắt giữa câu (dòng trước không kết thúc bằng dấu câu, dòng sau không phải đề mục, danh sách, trích dẫn, "Bước n:" hay "Nhãn: …").
5. Mỗi Topic: đổi tên mục về tên chuẩn, xếp theo thứ tự khung (mục lạ đi theo mục chuẩn đứng trước), báo mục bắt buộc còn thiếu.
6. Một dòng trống giữa các khối.
Tệp đã đúng khung thì không đổi (dữ liệu demo không đổi).

**Xem trước khi nạp:** dưới tóm tắt có khung "Đã chuẩn hoá theo Khung Topic" liệt kê từng thay đổi, cảnh báo mục còn thiếu, và "Xem trước n Topic sau chuẩn hoá" đã trình bày theo khung. Bấm Nạp mới lưu.

**Hiển thị Topic** (`topicRich` ở `01-core.js`): mỗi mục ### là một khối `.tsec.tsec-<kiểu>`: Số liệu tô đậm con số (phần trăm, số từ 2 chữ số); Các bước thành danh sách số tròn; dòng "Ngộ nhận: … Thực tế: …" thành thẻ hai cột đỏ/xanh; "Câu hỏi: … Đáp án: …" thành thẻ hỏi–đáp; Trường hợp có viền và chữ nghiêng. `richText` thêm chữ nghiêng (`*…*`, `_…_`) và trích dẫn (`> `) cho mọi nơi hiển thị.

**Lệnh cho agent nghiên cứu** (`agentPromptOf`, `topicFramePrompt`): ghép từ khung hiện hành (tên mục, thứ tự, cách viết từng kiểu, quy tắc trình bày); dùng ở nút "Lệnh cho agent" của Matrix và ở Setup → Khung Topic.

## 10.29. Số liệu trong View, bám icon nền tảng (13/10/2026, theo yêu cầu người dùng)

**Khi nào hiện:** chỉ khi slot Đã đăng, đang xem bản hiện hành, không ở chế độ sửa (`pvMetrics`). Bài chưa đăng giữ hàng icon không số; các số "0" giả trước đây (Facebook "👍❤️ 0 · 0 bình luận", YouTube "0 lượt xem") đã bỏ.

**Vị trí số theo nền tảng:**
- Facebook: hàng trên nút Thích: 👍❤️ cảm xúc bên trái; "lượt xem (video) · bình luận · lượt chia sẻ" bên phải.
- Instagram: số ngay sau ♡ 💬 ↗, ⌑ Lưu ở mép phải. Threads: ♡ 💬 ⟲ (↗ không có số).
- Video dọc (TikTok, Reels, Shorts): số dưới từng icon ở cột phải; lượt xem "▷ 1,3K" ở góc trên trái.
- YouTube: "1,9K lượt xem · 👍 45" ở dòng kênh. Blog: lượt xem trang và đọc TB ở dòng thông tin bài.

**Dải "Chỉ bạn thấy"** (`pvInsight`) dưới khung bài: các chỉ số của nền tảng không có icon trên bài thật (Reach, Lượt xem Threads, Giờ xem, Xem TB…), Tương tác và tỷ lệ tương tác, nhãn Mô phỏng, nút **Xem bảng số liệu** (cuộn tới bảng theo mốc 1 giờ / 24 giờ / 7 ngày `#pv-metrics` bên dưới). Chưa có link, chờ số đầu tiên, hoặc kênh không lấy số liệu thì dải ghi rõ lý do.

**Định dạng:** số gọn kiểu nền tảng (`pvCompact`: 1,2K, 12K, 1,2Tr); `title` có số đầy đủ và giờ đo; `aria-label` đầy đủ ("74 bình luận"). Mỗi số mang `data-pvm`/`data-k`; `patchLive` cập nhật từng số theo nhịp đồng hồ demo và nháy nền khi tăng (tắt khi người dùng giảm chuyển động).

## 10.28. Trình chỉnh sửa Markdown, khung trình bày cho bài ô (13/10/2026, theo yêu cầu người dùng)

**Trình chỉnh sửa** (`mdEditorHtml`, `mdToolbarHtml`, `mdApply` ở `01-core.js`; hành động `md`, `md-tab` ở `02-shell.js`):
- Sửa ô và Sửa Topic: thanh công cụ **Tiêu đề mục** (`## `), **Đậm** (`**…**`, Ctrl+B), **Gạch đầu dòng** (`- `), **Danh sách số**, **Bước** (`Bước n: `), **Hoàn tác** (dùng lịch sử của trình duyệt); tab **Viết | Xem trước** (xem trước bằng `richText`, như khi xem ô). Ô viết dùng font chính, cỡ 15px; hộp sửa rộng 820px.
- Sửa slot trong View: Blog có thanh đầy đủ (không tab); mạng xã hội chỉ có **•**, **1.** và 6 emoji, vì Facebook/Instagram/YouTube không hiển thị Markdown.

**Khung trình bày theo Cột:**
- Cột có trường `layoutGuide` (Setup → Cột → "Khung trình bày"); để trống thì dùng `defaultLayoutGuide(col)`: mỗi đoạn cấu trúc là `## Tên đoạn` đúng thứ tự, đoạn văn tối đa 3 câu và 80 chữ, các bước "Bước n:" mỗi bước một dòng, liệt kê bằng "- ", tối đa 2 chỗ in đậm mỗi đề mục, không bảng/HTML/đề mục cấp 1.
- `cellPrompt(S, cellId)` ghép lệnh gửi AI: chức năng Cột, độ dài/CTA, **Khung trình bày**, **bài mẫu khung** (`layoutSkeleton`), giọng văn, cụm cấm, nội dung Topic. Xem và chép ở chi tiết ô → "Lệnh cho AI".
- Bài ô mô phỏng ghi nhãn đoạn dạng `## Hook` (trước là `[Hook]`); bài cũ dạng `[..]` vẫn đọc được (`labelOf` nhận cả hai).

**Quy tắc HR-13 "Trình bày"** (mức nhắc, `layoutIssues`): đoạn quá 80 chữ, nhiều bước dồn một dòng, quá 2 chỗ in đậm trong một đề mục, nhãn `[..]` cũ. Khi ô hiện hành có HR-13 và tuần chưa chốt, đầu hộp ô có nút **Định dạng lại** (`reformatCell`: `tidyMarkdown` đổi `[..]` thành `##`, chia đoạn, mỗi bước một dòng, dòng trống giữa khối; không đổi chữ) và lưu thành một bản sửa, ô về Chưa duyệt.

**Chia bài:** slot mạng xã hội nhận bài đã gỡ Markdown (`plainSocial`: bỏ `**`, đề mục thành dòng thường, "- " thành "• "); Blog giữ Markdown. Kịch bản video vẫn ghi nhãn `[..]`.

## 10.27. Topic giữa màn hình, phân cấp hộp Topic và Cell (13/10/2026, theo yêu cầu người dùng)

**Vị trí.** Bấm tên Topic ở Matrix: chi tiết Topic hiện **giữa màn hình** (trước là ngăn trượt bên phải), cùng kiểu với chi tiết Cell (mục 10.15). Hộp rộng tối đa 780px; điện thoại vừa màn hình.

**Phân cấp chung** (class `.drawer.center.dv`):
1. **Đầu hộp** (không cuộn): nhãn nhỏ (Topic n · vX, hoặc Topic × Cột), tên 22px, chip trạng thái và thời gian, hàng thao tác (mũi tên phiên bản, Sửa/Tạo lại/Duyệt/Hủy).
2. **Định hướng** (thẻ viền màu bên trái): Topic: Thông điệp, Đối tượng, Góc nhìn, cảnh báo của Topic; Cell: Chức năng của Cột.
3. **Nội dung chính** (thẻ nổi, có bóng, tiêu đề 18px đậm, số chữ bên phải): Nội dung Topic / Bài của ô, trình bày theo mục 10.26. Tiêu đề cao nhất trong bài hiện là cấp 2 (Topic dùng ### cho các mục).
4. **Thẻ phụ** (tiêu đề 14px màu nhạt): Cell có Cảnh báo và Điểm AI cạnh nhau (xuống hàng khi hẹp), Gợi ý ảnh, Đang nuôi n slot.
5. **Mục thu gọn** (viền đứt): Phiên bản của Topic, Lịch sử ô (mở sẵn khi có từ 2 bản).

Nền hộp tối hơn thẻ để các khối tách rõ; chế độ tối dùng cùng biến màu.

## 10.26. Trình bày bài có tiêu đề, một font cho toàn app (13/10/2026, theo yêu cầu người dùng)

**Vấn đề.** Bài mô phỏng dồn cả mục thành một khối (có khối 20 câu); ô hiển thị nguyên văn nên nhãn "[Hook]" trông như chữ thường. App dùng 3 font và khoảng 20 cỡ chữ lẻ.

**Hiển thị bài** (`richText(text, marks)` ở `01-core.js`, dùng cho Bài của ô, Topic, slot): dòng `[Mục]` và `##` thành tiêu đề cấp 2 (vạch ngăn phía trên), `#` cấp 1, `###` cấp 3; mỗi dòng không trống là một đoạn; `- `/`* `/`• ` thành danh sách chấm, `1. ` danh sách số; dòng bắt đầu "Bước n:" hoặc "Slide n:" thành danh sách bước (nhãn đậm, vạch màu bên trái); `**đậm**` thành chữ đậm. Chữ 15px, giãn dòng 1.7, mỗi dòng tối đa khoảng 70 ký tự. Tô cảnh báo quy tắc và từ khóa tìm giữ nguyên (vị trí trên văn bản gốc, `warnMarks`, `foldMarks`). Văn bản lưu không đổi định dạng; ô sửa vẫn là văn bản thô.

**Xem như khi đăng** giữ kiểu nền tảng: Facebook, Threads, Instagram hiện xuống dòng như bài thật; Blog mỗi dòng một đoạn, `##` là đề mục.

**Bài mô phỏng chia đoạn** (`paraBreak` ở `01-util.js`, gọi ở cuối `writeCell`, `writeSlot`): mỗi đoạn 3 câu, cách nhau một dòng trống, đoạn cuối không lẻ một câu; "Bước n:" mỗi bước một dòng; dòng nhãn, tiêu đề, Slide, gạch đầu dòng để nguyên. Độ dài theo ký tự nay gộp khoảng trắng liền nhau (xuống dòng, dòng trống tính một ký tự) nên chia đoạn không làm đổi độ dài; độ dài theo chữ không đổi.

**Xuất ZIP.** Tệp slot .md và matrix.md đổi `[Mục]` thành đề mục Markdown (### trong slot, #### trong matrix.md) và chèn dòng trống giữa các dòng để Markdown hiểu là đoạn (`mdBody` ở `05f-export.js`). schedule.json giữ văn bản gốc.

**Font.** Một font **Be Vietnam Pro** (400, 500, 600, 700, nghiêng 400) cho chữ thường, tiêu đề (700; h3 600), giờ và số (chữ số đều cột `tabular-nums`). Bỏ Bricolage Grotesque. IBM Plex Mono chỉ còn ở ô sửa Markdown, ô sửa Topic và mẫu tệp. Cỡ chữ theo biến `--fs-1`…`--fs-7` = 12, 13, 14, 15, 18, 22, 28px (thay khoảng 20 cỡ lẻ). Khung Xem như khi đăng giữ font giống nền tảng (hệ thống, Georgia cho Blog).

## 10.25. Icon nền tảng thay ô màu (13/10/2026, theo yêu cầu người dùng)

**Icon.** Facebook, Instagram, Threads, YouTube, TikTok dùng logo từ Simple Icons 13.21 (giấy phép CC0), nhúng thẳng trong trang dạng SVG (`PF_PATH`, `pfIcon` ở `01-core.js`), không tải từ ngoài. Giữ nguyên hình logo; tô màu thương hiệu: Facebook #0866FF, Instagram #FF0069, YouTube #FF0000. Threads và TikTok (logo đen) theo màu chữ để chế độ tối vẫn rõ. Blog và nền tảng "Khác" dùng icon trang viết. Icon chọn theo **Nền tảng** của kênh (Setup → Kênh), không theo mã kênh.

**Chỗ dùng.** Mọi nhãn kênh đi qua `chTag(id, label)`: thẻ slot lịch tuần và danh sách ngày trên điện thoại chỉ hiện icon (16px), tên ẩn về mặt hình nhưng vẫn có trong `title` và cho trình đọc màn hình; nút lọc kênh ở Dashboard và Report, thẻ kênh và top bài ở Report, bảng Kênh và nhóm Format ở Setup, danh sách Hôm nay, hộp Xác nhận lịch, xem trước Tuần mẫu hiện icon + tên. Ô màu cũ (`.ch::before`) bỏ.

## 10.24. Bài đã đăng chỉ xem, nhãn Đăng lỗi (13/10/2026, theo yêu cầu người dùng)

**Quy tắc.** Slot Đã đăng là bản ghi của bài đã lên kênh nên chỉ xem, kể cả khi tuần đang ở trạng thái Mở lại để sửa. Chỉ sửa được slot chưa đăng, gồm slot **Đăng lỗi**: đã quá giờ đăng mà chưa đăng được.

**Logic chặn ở mọi hàm sửa slot** (`slotLockMsg` trong `05-model.js`, dùng chung với khóa tuần đã chốt): sửa bài, tạo lại, dùng bản cũ, cập nhật từ ô, giữ bản, đổi ô nguồn, duyệt, sửa cấu hình (giờ, kênh, Format, Cột), xóa slot, ảnh (chọn phiên bản, prompt, Gen, sửa ảnh, tải lên, thêm/bỏ ô) đều trả lỗi "Bài đã đăng chỉ xem". Slot Đã đăng không bị gắn "Cần cập nhật" khi ô nguồn đổi. Xóa Format đang có bài đã đăng bị chặn; đổi kênh/Cột của Format đó cũng bị chặn. Bài tự đăng: `markPublished` (sửa thông tin đăng) và `unmarkPublished` bị từ chối. Bài đăng tay: vẫn sửa link/giờ đăng và Bỏ đánh dấu (khi lỡ đánh dấu nhầm); bỏ đánh dấu xong slot về Đã duyệt và sửa được.

**Giao diện.** Thẻ slot Đã đăng chỉ còn nút 👁 Xem (không Duyệt, không bánh răng). Popup View của bài đã đăng không có Sửa, Tạo lại, Cấu hình slot; thanh thao tác ghi "Bài đã đăng nên chỉ xem". Hộp Cấu hình slot (nếu mở) chỉ xem. Slot chưa đăng mà đã quá giờ hiện **Đăng lỗi** màu đỏ trên thẻ, trong hộp slot và danh sách ở màn Hôm nay (trước gọi là "Trễ"); riêng slot đăng tay đã duyệt ở tuần đã chốt vẫn ghi "Cần đăng tay". Nhãn "Trễ" trong mục Đã đăng (giờ đăng thực tế muộn hơn lịch) giữ nguyên.

**Mô phỏng.** R4 chưa mô phỏng lỗi từ nền tảng (mất kết nối, bị từ chối); Đăng lỗi hiện là slot quá giờ mà chưa đăng. Ở R5, lỗi trả về từ API/Metricool/Postiz cũng vào trạng thái này kèm lý do.

## 10.23. Số liệu trực tiếp trên thẻ slot, đổi tên Report (13/10/2026, theo yêu cầu người dùng)

**Mục tiêu.** Nhìn lịch tuần là thấy bài nào đang chạy tốt, số liệu tự tăng theo thời gian như khi nối nền tảng thật.

**Hàng chỉ số trên thẻ slot Đã đăng.** Một hàng ngăn bằng vạch đứt ở cuối thẻ: 👁 tiếp cận/lượt xem (theo nền tảng), ♡ tương tác (tổng các chỉ số vai trò `eng`), 💬 bình luận/trả lời (Blog: thời gian đọc TB). Sau mỗi lần làm mới, số nào tăng hiện "▲ phần tăng" màu xanh và nháy nhẹ (tắt khi người dùng chọn giảm chuyển động). Chấm xanh nhấp nháy cuối hàng = trực tiếp; di chuột xem giờ cập nhật và nguồn (API/Metricool/Postiz, mô phỏng). Điện thoại (≤ 640px) chỉ hiện 2 số đầu. Slot chưa đăng giữ dòng cũ ("Tự đăng hh:mm", "Đăng tay", "Chưa có link"); vừa đăng dưới 1 phút: "Vừa đăng · chờ số liệu". Kênh có Nguồn số liệu = Không thì không có hàng.

**Số liệu liên tục.** `slotMetricsNow(S, s, nowMs)` tính giá trị tại thời điểm bất kỳ: tỉ lệ so với mức 7 ngày nội suy theo đường cong 0 → 25% (1 giờ) → 80% (24 giờ) → 100% (7 ngày) (`liveFrac`, căn bậc hai trong từng đoạn để tăng nhanh rồi chậm). Các mốc 1h/24h/7d vẫn lưu vào `metrics[]` như R4 (dùng cho bảng trong View và metrics.csv); bảng Số liệu trong View thêm cột **Hiện tại**. Dashboard, Report dùng giá trị hiện tại.

**Đồng hồ demo chạy theo giờ thật.** `settings.clock = {running, anchor:{demoMs, realMs}}`; giờ demo = `demoMs + (giờ thật − realMs)` (`clockNowMs`). Mỗi 30 giây `clockTick`: tiến `demoNow` theo phút, chạy lịch tự đăng và mốc số liệu, rồi vá các hàng chỉ số đang hiện (không vẽ lại cả màn để không mất ô đang gõ, hộp thoại đang mở). Có slot vừa tự đăng thì vẽ lại màn (khi không có hộp thoại, ô nhập đang mở) và báo. Mặc định chạy; hộp Đồng hồ demo có nút **Dừng đồng hồ / Chạy theo giờ thật**; tua +1 giờ/ngày/tuần vẫn dùng được và neo lại từ giờ mới. Đóng app rồi mở lại thì giờ demo đã trôi đúng khoảng thời gian đó. Ở R5 (máy chủ) giờ là giờ thật và nhịp làm mới là nhịp gọi API/Metricool.

**Đổi tên.** Menu, tiêu đề màn và đặc tả: Báo cáo → **Report**.

**Mã.** Logic `05e-publish.js`: `liveFrac`, `slotMetricsNow(S, s, nowMs)`, `slotHeadline`, `clockOf`, `clockNowMs`, `clockTick`, `setClockRunning`. UI `04d-publish.js`: `liveCellsHtml`, `patchLive`, `liveTick` (`LIVE_TICK_MS` 30000); khởi động ở `99-boot.js`. Test UI đặt `window.__AC_CLOCK_OFF` để giờ demo cố định; test 10.23 tăng tốc `Date.now` để thấy số tăng.

## 10.22. R4: Xác nhận lịch, đăng bài, số liệu, Report, xuất ZIP (13/10/2026, theo yêu cầu người dùng)
Người dùng muốn app tự đăng bài và tự lấy link, tự cập nhật số liệu (View, Reach, Comment hoặc chỉ số riêng của từng nền tảng) với kênh xin được API; kênh không có API thì gắn link tay và lấy số liệu qua Metricool. Về lâu dài app thành công cụ quản lý mạng xã hội; đi từng bước. R4 chạy hoàn toàn trong trình duyệt nên phần đăng và số liệu là **mô phỏng**, nhưng dữ liệu đã đúng dạng để R6–R7 thay bằng kết nối thật.

**Xác nhận lịch (bước 7).** Nút ở thanh công cụ Dashboard và ở Việc tiếp theo. Cổng: tuần có slot, không slot Chưa có bài / Chưa duyệt / Cần cập nhật; chưa đạt thì hộp liệt kê từng slot (bấm để mở). Hai lần xác nhận: (1) tóm tắt tuần: số slot theo kênh, số slot tự đăng / thủ công, cảnh báo quy tắc, ô ảnh còn thiếu (chỉ nhắc); (2) "Chốt bản N": nói rõ slot Tự động sẽ đăng đúng giờ, tuần chỉ đọc. Khi chốt: `status = CONFIRMED`, `revision + 1`, `confirmedAt`, mỗi slot lưu `confirmedText` (để so "đúng bản"). Mở lại để sửa giữ như cũ.

**Cách đăng theo kênh (Setup → Kênh).** Mỗi kênh có `platform` (quyết định bộ chỉ số) và `publish`: *Cách đăng* Tự động / Thủ công; *Đăng qua* API riêng / Metricool / Postiz (khi Tự động); *Nguồn số liệu* API / Metricool / Postiz / Không. Mặc định demo: Facebook, Instagram tự đăng qua API (Meta); Threads tự đăng qua Metricool; YouTube tự đăng qua Postiz; TikTok và Blog thủ công, số liệu qua Metricool (Blog: Không).

**Tự đăng (mô phỏng).** `runScheduler(S)` chạy khi mở app và mỗi lần tua đồng hồ demo: slot `APPROVED` của tuần `CONFIRMED`, kênh Tự động, đã đến giờ → `PUBLISHED`, `pub = {mode:'auto', via, url (link giả theo nền tảng), at = max(giờ slot, giờ chốt) + 0–3 phút, asConfirmed = (text == confirmedText), simulated: true}`. Thẻ slot chờ hiện nhãn "Tự đăng hh:mm".

**Đánh dấu đã đăng (thủ công).** Trong View của slot Đã duyệt (tuần đã chốt ít nhất một lần): hộp nhập giờ đăng thực tế (mặc định giờ slot), link (không bắt buộc, phải là http/https), "Đúng bản đã chốt" Có/Không. Slot Đã đăng: **Sửa link / thông tin đăng**, **Bỏ đánh dấu** (về Đã duyệt, xóa số liệu). Các thao tác này không cần Mở lại tuần.

**Số liệu.** `metrics[]` mỗi mốc một bản `{key: '1h'|'24h'|'7d', at, source, values}`; `syncMetrics(S)` thêm mốc đã qua theo đồng hồ demo. Bộ chỉ số: Facebook Reach, Cảm xúc, Bình luận, Chia sẻ (Reels thêm Lượt xem); Instagram Reach, Thích, Bình luận, Lưu, Chia sẻ; TikTok Lượt xem, Thích, Bình luận, Chia sẻ, Xem TB (giây); Threads Lượt xem, Thích, Trả lời, Đăng lại; YouTube Lượt xem, Giờ xem, Thích, Bình luận; Blog Lượt xem trang, Thời gian đọc TB (giây). Hai chỉ số gộp dùng cho tổng và Báo cáo: **Tiếp cận/xem** (Reach hoặc Lượt xem) và **Tương tác** (cảm xúc/thích + bình luận/trả lời + chia sẻ/đăng lại + lưu). Bài thủ công chưa có link: "Chưa có link, chưa khớp được số liệu". Nguồn Không: không có số liệu. Giá trị mô phỏng xác định theo slot (FNV-1a), tăng theo mốc (1 giờ ≈ 25%, 24 giờ ≈ 80%, 7 ngày = 100%).

**Dashboard.** Thẻ slot đã đăng hiện một dòng "Tiếp cận · Tương tác" (vd. "2,4K · 186"); header thêm chip Tiếp cận/xem và Tương tác của tuần. View của slot đã đăng có thẻ **Đã đăng** (cách đăng, link mở tab mới, giờ, đúng bản) và **Số liệu** (bảng chỉ số × mốc, nhãn Mô phỏng).

**Report (menu mới; tên cũ Báo cáo).** Ba tab, lọc theo kênh (chip). *Overview*: toàn bộ bài đã đăng: số bài, Tiếp cận/xem, Tương tác, tỷ lệ tương tác, đăng đúng giờ (≤ 30 phút so với giờ slot), đúng bản; thẻ từng kênh với chỉ số riêng; top 5 bài theo Tương tác. *Tuần*: tuần đang chọn ở thanh trên, so với tuần trước; biểu đồ cột theo ngày; bảng kênh × chỉ số; danh sách bài. *Tháng*: tháng chứa tuần đang chọn, so với tháng trước; biểu đồ theo tuần; bảng theo kênh, theo Cột, theo Format.

**Đồng hồ demo.** Bấm giờ demo ở thanh trên (hoặc menu ⋯) để tua: +1 giờ, +1 ngày, +1 tuần, đặt ngày giờ, về giờ demo gốc 12/10/2026 09:00. Tua xong chạy `runScheduler` + `syncMetrics` và báo số bài vừa tự đăng. Lùi giờ không xóa bài đã đăng.

**Xuất ZIP (Export).** Chỉ khi tuần Đã chốt (chưa chốt: chỉ xem trước). Gói `autocontent-YYYY-Www-rN.zip` (ZIP không nén, tự đóng gói): `schedule.csv`, `schedule.json`, `slots/*.md` (mỗi slot một tệp: thông tin, nội dung, ảnh, đăng), `matrix.md`, `topics.md`, `metrics.csv`, `assets/` (ảnh/video tải lên ghi đúng đuôi `.jpg/.png/.mp4/.webm/.mov`, ảnh mô phỏng ghi `.svg`), `manifest.json` (đường dẫn, kích thước, sha256 từng tệp).

**Demo.** Thanh Demo ở Dashboard thêm **Demo: Chốt lịch** (duyệt các slot còn lại rồi chốt). Seed: tuần 05/10 đã đăng đủ 17 bài với link và số liệu đủ ba mốc (theo cách đăng của từng kênh: TikTok/Blog thủ công có link).

**Logic mới** (`src/logic/05e-publish.js`, `src/logic/05f-export.js`): `confirmGate`, `confirmWeek`, `confirmSummary`, `channelPublish`, `runScheduler`, `markPublished`, `unmarkPublished`, `syncMetrics`, `slotMetricsNow`, `metricDefs`, `reportStats`, `setDemoNow`, `buildExportFiles`, `zipFiles`, `migrateState`. UI: `src/ui/08-report.js`, `src/ui/06-export.js`, phần đăng trong `04b-preview.js`.

**Chưa làm (để R5–R7):** đăng thật, lỗi đăng và thử lại, hàng đợi khi tắt máy, khớp số liệu thật theo link, quản lý bình luận.

## 10.21. Mục media của slot tự do (13/10/2026, theo yêu cầu người dùng)
- View của slot tự do: khung bài ở trên **chỉ để xem** (không còn nút ảnh trên khung); bên dưới là mục **Ảnh và video của slot**, đặt **trên** Quy tắc kênh (slot thường khi Sửa cũng đặt media trên quy tắc).
- Mỗi ô media nhận **ảnh hoặc video** (loại theo bản đang dùng) và có `<` `>` (đổi bản), **Gen**, **Prompt**, **Sửa**, **Up**, **Xóa**. Ô đang là video: Gen, Prompt, Sửa tắt (chưa tạo/sửa video bằng AI). Nút **+ Thêm ảnh/video** thêm một ô; Xóa bỏ ô (slot tự do bỏ được cả ô sinh theo Format).
- **Sửa** = nhập yêu cầu chỉnh ảnh, tạo thêm một phiên bản (mô phỏng, lưu `version.edit`). Ảnh/video người dùng tải lên không sửa được, chỉ tải bản thay thế. (Người dùng đã chốt cách này ngày 13/10/2026.)
- Layout chỉ vẽ các ô đã có ảnh/video: Facebook 1 ảnh = ảnh đơn, 2 ảnh trở lên = album (tối đa 4, "+n"); Instagram nhiều ảnh = carousel theo số ảnh; Reels/TikTok/Shorts/YouTube dùng ô đầu; Blog dùng ô đầu làm ảnh bìa; Threads hiện tất cả. Chưa có media thì layout hiện khung trống.
- Logic: `editSlotImage`; `addSlotAsset(S, id)` không nêu loại tạo ô "Media thêm n"; `removeSlotAsset` cho phép mọi ô của slot tự do; `uploadSlotImage` nhận video ở mọi ô slot tự do và cập nhật `a.kind`.
- Còn lại: quy tắc kênh của slot tự do vẫn đếm "slide" từ chữ (ví dụ Album báo thiếu slide); chưa điều chỉnh theo số ảnh.
- Phân cấp thị giác (bản 42): các mục dưới khung bài trong View là thẻ trắng có số và tiêu đề (1 Ảnh và video, 2 Quy tắc kênh, 3 Điểm AI) trên nền xám nhạt, giống Cấu hình slot (`.cfg-sec`, `.cfg-h`, `.cfg-n`). Số mục đánh theo thứ tự đang hiện.
- Bề rộng (bản 43): View và Sửa cùng bề rộng popup (640px); khung bài (layout) và các thẻ mục bên dưới rộng bằng nhau (khung bài là thẻ viền như các mục; video dọc nằm trong thẻ cùng bề rộng).

## 10.20. Chọn Cột cho mọi slot (13/10/2026)
- Mỗi Format vẫn có một **Cột đề xuất** (`format.columnId`). Mọi slot có ô **Cột** với thứ tự: **Không (None)**, Cột đề xuất (nhãn "(đề xuất)"), rồi các Cột khác. Mặc định chọn sẵn Cột đề xuất; đổi Format thì đề xuất đổi theo.
- Slot tự do: Cột chỉ để phân loại, được chọn Không. Slot lấy từ Matrix: bắt buộc có Cột; chọn Không thì báo "dùng slot tự do". Trong Cấu hình slot của slot lấy từ Matrix, danh sách bỏ mục Không.
- `slot.columnId` chỉ lưu khi khác Cột đề xuất (null = theo Format). `slotColumnId(S, s)` là Cột thực dùng cho Chia bài, Tạo bài, chọn ô nguồn, hiển thị. Chia bài và Tạo bài lấy ô đúng Cột của slot.
- Đổi sang Cột khác thì slot mất ô nguồn và bài (có hộp xác nhận nếu đang có ô nguồn), về "Chưa có bài".
- Nút trong hộp Thêm slot (bản 40): bỏ "Thêm slot trống" và "Thêm slot tự do" tách rời. Có Cột: **Thêm slot** (slot trống) và **Thêm và tạo bài**. Chọn Cột **Không**: chỉ còn **Tạo slot tự do** (vào View ở chế độ Sửa).

## 10.19. Cột của slot tự do (13/10/2026)
- Slot tự do chọn Kênh và Format như thường, **Cột là tuỳ chọn** (`slot.columnId`, `null` = Không). Cột chỉ để phân loại/lọc, không kéo bài từ Matrix.
- Thêm slot: sau khi chọn Format, ô Cột tự đề xuất Cột của Format (nhãn "(đề xuất)"); đổi Format/Kênh thì đề xuất đổi theo. Đầu danh sách là "Không (None)". Ô Cột chỉ có tác dụng với nút "Thêm slot tự do".
- Cấu hình slot (slot tự do): mục Vị trí đăng có Kênh, Format, **Cột** (Không đứng đầu). Đổi Format không xoá bài và ảnh đã có (slot Đã duyệt về Chưa duyệt); chỉ bổ sung ô ảnh theo Format mới.
- Slot thường vẫn theo Cột của Format. `slotColumnId(S, slot)` trả Cột thực dùng cho hiển thị (thẻ lịch, xuất nhật ký).

## 10.18. Slot tự do (13/10/2026, theo đề xuất người dùng; bản đầu)

> **Đã thay một phần:** cách tạo (nút riêng "Thêm slot tự do") thay bằng chọn Cột **Không** ở mục 10.20; mục ảnh/video (+ Thêm ảnh / + Thêm video, nút trên khung bài) thay bằng mục media ở 10.21. Phần còn lại vẫn đúng.

Định hướng: app là dashboard quản lý **toàn bộ lịch và nội dung đăng của thương hiệu trên các kênh**, nên bên cạnh slot lấy nguồn từ Matrix (Chia bài, Tạo bài) có **slot tự do**: không lấy nguồn từ Matrix; người dùng chọn Kênh và Format rồi tự viết nội dung, tải ảnh và video của mình. Cách tạo: hộp **Thêm slot** có nút **Thêm slot tự do** (cạnh Thêm slot trống và Thêm và tạo bài); xong mở thẳng **View ở chế độ Sửa** (ô viết trống ngay trong khung bài, bên dưới là quy tắc kênh theo chữ đang viết, **Ảnh và video của slot**, điểm AI sau khi lưu). Đặc điểm: dữ liệu `free: true`, không có ô nguồn và không bị Chia bài/Tạo bài/Tạo lại/Cập nhật từ ô đụng tới (Chia bài bỏ qua; Tạo lại báo "Slot tự do không có ô nguồn"); thẻ có nhãn **Tự viết**; Cấu hình slot hiện thẻ "Slot tự do" thay cho Ô nguồn (Cột chỉ để phân loại). Viết bài lần đầu = một bản trong lịch sử slot (qua `editSlot`), slot về Chưa duyệt, rồi Duyệt như thường; Format vẫn cho sơ đồ layout, quy tắc kênh, ảnh-thẻ, xem trước. **Ảnh và video**: mỗi ô của Format có **Tải lên** (ảnh PNG/JPG/WebP/GIF; riêng slot tự do thêm video MP4/WebM/MOV); bấm **+ Thêm ảnh / + Thêm video** để thêm ô ngoài Format (ô thêm có nút **Bỏ**); ảnh vẫn có thể Gen mô phỏng sau khi tự viết prompt. Video bị giới hạn **3 MB** trong bản MVP vì lưu trong trình duyệt; tệp xuất dùng đuôi theo loại (`.mp4`, `.webm`, `.mov`, `.jpg`). Hàm: `addSlot(..., {free:true})`, `addSlotAsset`, `removeSlotAsset`, `uploadSlotImage` (nhận video) trong `05-model.js`. **Chưa làm** (đợt sau): tuần chỉ có slot tự do vẫn hiển thị thanh tiến độ 7 bước theo Matrix; chuyển slot tự do ↔ lấy từ ô; kho ảnh/video riêng của thương hiệu và lưu video thật (cần máy chủ lưu trữ); ngày lập lịch ngoài tuần đang mở.

## 10.17. Thẻ slot gọn: ảnh xếp chồng và nút Duyệt (13/10/2026, theo đề nghị người dùng)

Trên thẻ slot (lịch tuần, danh sách theo ngày): các ảnh của slot **xếp chồng, hở một ít ở mép** (tối đa 3 ảnh thu nhỏ) kèm **số ảnh** bên cạnh, không còn chữ "Ảnh" (ví dụ chồng ảnh và "7"); nếu còn ô ảnh chưa có ảnh thì ghi "đã có/tổng" màu cảnh báo (ví dụ "2/6"); slot không cần ảnh vẫn ghi "Không cần ảnh". Cạnh nút **Cấu hình** (bánh răng) có nút **Duyệt**: bật khi slot chưa duyệt (có bài, tuần chưa chốt); **tắt** (kèm dấu ✓) khi slot đã Đã duyệt hoặc Đã đăng, chưa có bài hoặc tuần đã chốt. Bấm Duyệt hỏi lại nếu slot có cảnh báo, như trong View. Hàm: `slotImgsHtml`, `slotGearBtn`, `ACTIONS['slot-approve']` (`04-week.js`).

## 10.16. Bố cục Cấu hình slot: mỗi khối một section (13/10/2026, theo yêu cầu người dùng)

Sau sơ đồ layout (tham khảo), Cấu hình slot có đúng hai section, mỗi section **một khung duy nhất** (viền mảnh, không khung lồng, không đổi nền): **1 · Ô nguồn** gồm nhãn Cột và trạng thái ô, tên Topic cỡ lớn, "Viết từ Topic vX · bản n của ô · đang nuôi n slot khác", nút **Mở Cell**, rồi (ngăn bằng một đường kẻ) ô chọn **Đổi ô** (slot chưa có ô thì dòng hướng dẫn chọn ô hoặc Tạo bài). **2 · Vị trí đăng** gồm dòng tóm tắt (thứ, ngày, **giờ** cỡ lớn; kênh và Format), rồi (đường kẻ) form Ngày, Giờ, Kênh, Format, và hàng cuối: **Xóa slot** (chữ đỏ nhẹ) bên trái, **Lưu vị trí** (nút chính) bên phải. Nhìn là biết bài lấy từ đâu, đăng khi nào, ở đâu. Nền của trang Cấu hình slot là **xám nhẹ** (`--surface-2`); header, sơ đồ layout, hai section (và mục Đã đăng nếu có) là các thẻ trắng viền mảnh nổi trên nền đó.

## 10.15. Mở Cell và Chi tiết Cell ở giữa màn hình (13/10/2026, theo yêu cầu người dùng)

Trong Cấu hình slot, nút mở ô nguồn đổi tên từ "Mở ô" thành **Mở Cell**. **Chi tiết Cell** (Duyệt, Tạo lại, Sửa, Hủy, lượt sinh, lịch sử ô) mở **giữa màn hình** (hộp rộng tối đa 640px) từ mọi nơi: Matrix và Cấu hình slot. Các giao diện Topic vẫn trượt từ bên phải.

## 10.14. Cấu hình slot và View: đổi tên, tách việc (13/10/2026, theo yêu cầu người dùng)

"Chi tiết slot" đổi tên thành **Cấu hình slot** và **bỏ phần nội dung** (bài, quy tắc, điểm AI, ảnh, lịch sử bản; các việc này làm ở View). Cách mở: **bấm thẻ slot** (ở lịch tuần, danh sách theo ngày, danh sách Dashboard) ra **View** (Xem như khi đăng, mục 10.7, 10.10); thẻ **chưa có bài** thì ra Cấu hình slot (có nút **Tạo bài**, mục 10.12). Nút **bánh răng** ở góc thẻ (thay nút mắt) mở **Cấu hình slot** ở giữa màn hình; trong View có nút **Cấu hình slot** cùng ý nghĩa. Cấu hình slot gồm: trạng thái, sơ đồ layout của Format (10.13), Tạo bài (slot trống) hoặc Cập nhật từ ô / Giữ bản slot (slot cần cập nhật), Ô nguồn (đổi ô, mở ô), Đã đăng (nếu có), Vị trí đăng (ngày, giờ, kênh, Format, Lưu, Xóa slot). Header chỉ có nút **Back**: về View nếu mở từ View, đóng nếu mở từ bánh răng. Hệ quả: duyệt bản cũ trong lịch sử (`<` `>`, Dùng bản này) tạm chưa có ở giao diện (logic còn).

## 10.13. Cấu hình slot ở giữa màn hình, có sơ đồ layout của Format (13/10/2026, theo yêu cầu người dùng)

Chi tiết slot (mở từ chip lịch hay từ popup) và hộp Thêm slot đều hiện **giữa màn hình**. Phần trên của giao diện cấu hình slot (hộp Thêm slot; chi tiết slot chưa có bài; chi tiết mở từ popup) là **sơ đồ layout của Format** dạng khung dây, đổi ngay khi chọn kênh hoặc Format: bài đăng (đầu bài, nhãn các phần theo cấu trúc, dòng chữ, ảnh theo tỉ lệ ô ảnh; ảnh-thẻ fanpage ghi rõ chữ trên ảnh như "Câu trích lớn", "Nhận định + Đúng hay Sai?"; bình chọn có ba lựa chọn), carousel/album (dải slide Bìa, 2, 3…, CTA, số slide tối thiểu–tối đa), video dọc (khung 9:16 có phụ đề + danh sách cảnh), video ngang YouTube (thumbnail 16:9, tiêu đề, mục lục), blog (trình duyệt, ảnh bìa 1200×630, H1, các mục H2). Dưới sơ đồ: hướng dẫn của Format và các nhãn kênh, Cột, độ dài, cấu trúc, CTA, hashtag, ảnh cần có. Bấm **Thêm và tạo bài** hoặc **Tạo bài** thì vào thẳng popup Xem như khi đăng (mục 10.12). Hàm: `formatLayoutHtml` (`04c-layout.js`).

## 10.12. Tạo bài ngay trong slot (13/10/2026, theo đề xuất người dùng)

Hai hướng tạo nội dung cho slot: **Chia bài** (cả tuần, ở Matrix, khi mọi ô đã duyệt) và **Tạo bài** (từng slot, bất cứ lúc nào). Tạo bài dùng khi lịch đã chia mà muốn thêm bài: hộp **Thêm slot** có nút **Thêm và tạo bài**; slot chưa có bài có nút **Tạo bài** ở chi tiết slot. Điều kiện (`slotWriteGate`): tuần chưa chốt và **Cột của Format có ít nhất một ô Đã duyệt** (Topic còn hiệu lực); không cần cả ma trận duyệt xong. Hệ thống chọn ô Đã duyệt của Cột mà ít slot đang dùng nhất (hòa thì Topic đứng trước), viết bài và tạo ảnh như Chia bài (mục 10.8), slot về Chưa duyệt, rồi mở ngay popup Xem như khi đăng để xem, sửa, duyệt. Không đạt điều kiện: nút Tạo bài khóa kèm lý do ("Cột … chưa có ô Đã duyệt (duyệt ô ở Matrix trước)"); "Thêm và tạo bài" vẫn thêm slot và báo lý do. Muốn chọn ô cụ thể thì vẫn dùng ô chọn "Chọn ô cho slot này". Hàm: `slotWriteGate`, `writeSlotNow` (`05-model.js`).

## 10.11. Sửa ảnh ngay trên khung bài (13/10/2026, theo yêu cầu người dùng)

> Còn đúng cho slot lấy từ Matrix. Slot tự do: nút ảnh chuyển xuống mục media dưới khung bài (10.21).

Khi bấm **Sửa** trong popup Xem như khi đăng, ngay dưới ảnh trong khung hiện thanh nút: **<**, **>** (đổi phiên bản), **Gen** (tạo phiên bản mới từ prompt hiện có), **Prompt** (mở ô sửa prompt ngay dưới ảnh, có "Lưu prompt và Gen", "Chỉ lưu prompt", "Đóng") và **Up** (tải ảnh của bạn lên, như mục 10.9), kèm tên ô ảnh và "vn/m". Với carousel, thanh nút đi theo slide đang lật; với Album Facebook (4 ảnh nhỏ) chỉnh ảnh ở phần "Ảnh của slot" bên dưới, phần này chỉ hiện khi slot có hơn một ảnh. Chữ đang sửa không mất khi thao tác ảnh. Prompt sửa tay (`promptEdited`) được **giữ** khi slot viết lại; chỉ khi ô ảnh dùng prompt do hệ thống ghép thì mới cập nhật theo bài mới. Hàm: `setSlotImagePrompt` (`05-model.js`), `pvImgTools` (`04b-preview.js`). Tuần đã chốt khóa các nút.

## 10.10. Sửa và Duyệt ngay trong Xem như khi đăng (13/10/2026, theo yêu cầu người dùng)

Popup Xem như khi đăng (mở từ nút mắt trên chip slot hoặc trong chi tiết slot) có thanh thao tác phía trên: **Sửa**, **Duyệt** (thành "Đã duyệt" khi đã duyệt), **Tạo lại** (viết lại bài và ảnh từ ô nguồn, bản cũ giữ trong lịch sử; sau đó hiện **Hoàn tác** để quay lại bản trước), **Mở chi tiết slot** (ô nguồn, lịch sử bản, vị trí đăng) và nhãn trạng thái. Bấm **Sửa**: chữ bài trong khung mô phỏng chuyển thành ô sửa ngay tại chỗ (cùng vị trí, cùng cỡ chữ; ảnh và chữ trên ảnh vẫn hiện quanh đó; carousel và video vẫn lật slide/cảnh theo chữ đang sửa). **Bên dưới khung bài** hiện: độ dài và Quy tắc kênh tính lại theo chữ đang gõ, Ảnh của slot (Gen, `<` `>`, Tải lên như ở chi tiết slot), Điểm AI của bản đang dùng. **Lưu bản sửa** tạo một bản mới trong lịch sử slot (slot về Chưa duyệt, như Sửa ở chi tiết slot); **Hủy** hỏi lại nếu có thay đổi chưa lưu. **Duyệt** hỏi lại khi slot có cảnh báo, như ở chi tiết slot. Bản cũ và tuần đã chốt chỉ xem. **Mở chi tiết slot** từ popup này hiện **giữa màn hình** (hộp cùng kiểu popup, rộng tối đa 640px) và **chỉ có thông tin cấu hình như lúc lập tuần**: trạng thái, Ô nguồn (đổi ô, mở ô), Đã đăng (nếu có), Vị trí đăng (kênh, Format, ngày, giờ, Lưu, Xóa slot). Không có nội dung bài, ảnh, quy tắc, điểm AI; header chỉ có nút **Back** (về popup xem thử), không có `<` `>`, Tạo lại, Sửa, Duyệt, Cập nhật từ ô (các thao tác nội dung nằm ở popup). (Từ mục 10.14, mở từ thẻ slot thì vào View, bánh răng mới vào Cấu hình slot.) Đánh giá: hợp lý cho bước 6 (duyệt slot), vì người duyệt nhìn bài như người đọc sẽ thấy rồi sửa ngay chỗ đó; chi tiết slot vẫn giữ cho các việc ít dùng (đổi ô nguồn, lịch sử, vị trí đăng).

## 10.9. Tải ảnh của bạn lên ô ảnh (13/10/2026, theo yêu cầu người dùng)

Mỗi ô ảnh trong chi tiết slot có nút **Tải lên** cạnh Gen (PNG, JPG, WebP, GIF; tối đa 15 MB). Ảnh được thu nhỏ cạnh dài về 1.600px, lưu dạng JPEG trong dữ liệu của trình duyệt, thành **một phiên bản mới** của ô ảnh và được chọn ngay (nhãn "Ảnh của bạn · vn/m"; tệp xuất `…-vn.jpg`). Không cần prompt. `<` `>` vẫn đổi qua lại giữa ảnh tải lên và ảnh tạo. Khi slot viết lại, ô ảnh đang dùng ảnh tải lên **không bị gen đè** (prompt vẫn cập nhật). Chip lịch và Xem như khi đăng hiện đúng ảnh tải lên (không in chữ đè lên ảnh của bạn). Tuần đã chốt khóa nút. Lưu ý: ảnh nằm trong bộ nhớ trình duyệt (giới hạn vài MB); nếu đầy, ứng dụng báo không lưu được và nên dùng Sao lưu. Hàm: `uploadSlotImage` (`05-model.js`), `CHANGES['img-upload']` (`04-week.js`).

## 10.8. Chia bài tạo luôn ảnh và bố trí ảnh (13/10/2026, theo yêu cầu người dùng)

Bấm **Chia bài** thì mỗi slot nhận bài **và ảnh**: người dùng chỉ vào xem và sửa chỗ chưa ưng. Ô ảnh của slot được dựng lại theo bài (`slotImagePlan`, `layoutSlotImages` trong `05-model.js`): carousel (Instagram, Album Facebook) có **một ô ảnh mỗi slide** (tên "Slide i/n", vị trí Bìa, Slide i, Slide cuối (CTA), chữ trên ảnh là chữ của slide); ảnh-thẻ fanpage có **chữ trên ảnh** lấy từ bài (Trích dẫn, Điền chỗ trống: câu trong ngoặc; Đúng hay Sai: nhận định + "Đúng hay Sai?"; Bình chọn: câu hỏi; Ảnh số liệu: câu có con số); bài Blog có ảnh bìa đầu bài mang tiêu đề; video có Thumbnail mang tiêu đề, cảnh quay mang câu mở đầu. Prompt ảnh = gợi ý ảnh của ô + tên và gợi ý ô ảnh + chữ trên ảnh. Ảnh bản 1 được tạo ngay (mô phỏng). Khi slot viết lại (Tạo lại, Cập nhật từ ô, đổi ô) ô ảnh nào đổi chữ thì có thêm phiên bản ảnh mới, phiên bản cũ giữ lại. Chi tiết slot hiện **Vị trí** và **Chữ trên ảnh** của từng ô ảnh; chip ở lịch hiện tối đa 3 ảnh thu nhỏ và "+n"; Xem như khi đăng dùng ảnh riêng của từng slide. Tuần đã chốt không tạo ảnh.

## 10.7. Xem như khi đăng (13/10/2026, theo yêu cầu người dùng)

Mỗi slot có bài có nút **Xem như khi đăng** (biểu tượng mắt trên chip ở lịch tuần và danh sách điện thoại; nút trong chi tiết slot, kể cả khi đang xem bản cũ). Nút mở hộp mô phỏng giao diện bài trên kênh của slot, dùng bài, ảnh (ảnh giữ chỗ nếu chưa Gen, đúng tỉ lệ ô ảnh của Format), tên thương hiệu và giờ đăng của slot: Facebook (bài đăng, cắt "Xem thêm" ở khoảng 360 ký tự, album 4 ảnh với "+n", ảnh-thẻ in câu chính cho các mẫu Ảnh trích dẫn, Đúng hay Sai, Bình chọn, Điền vào chỗ trống, Ảnh số liệu; Reels dạng dọc), Instagram (carousel lật từng slide, chấm trang), TikTok/Reels/Shorts (khung 9:16, phụ đề theo từng cảnh của kịch bản, danh sách cảnh bên cạnh để chọn), Threads, YouTube (khung 16:9, tiêu đề là tên Topic, mục lục theo mốc thời gian), Blog (khung trình duyệt, ảnh bìa, đề mục, số phút đọc). Chỉ để hình dung, không đổi dữ liệu; tuần đã chốt vẫn xem được.

## 10.6. Phân cấp thị giác (13/10/2026, theo góp ý người dùng)

Người dùng thấy mọi thứ "đều đều", khó biết đâu là chính. Mỗi màn chia ba cấp: **Tập trung** (Việc tiếp theo và tiến độ 7 bước gộp một khối, viền vàng, đổ bóng, chữ lớn nhất sau tiêu đề trang; Matrix cũng có khối này); **Vùng làm việc** (lịch tuần hoặc ma trận trong một bề mặt trắng nổi, thanh công cụ và số đếm nằm bên trong); **Phụ** (Cột của tuần, Tệp Topic: viền nét đứt, không bóng, tiêu đề nhỏ; ở Matrix, Tệp Topic dời xuống dưới bảng). Thanh demo thành một dòng nút nhỏ có nhãn DEMO. Chip slot và ô cần xử lý có vạch vàng bên trái và nền vàng nhạt; slot đã đăng vạch xanh, nhạt đi. Chỉ số "Đăng đủ, đúng bài" lùi thành chip nhỏ không nền.

## 10.5. Mẫu bài fanpage Facebook (13/10/2026, theo yêu cầu người dùng)

Thêm 8 Format cho kênh Facebook, chọn từ các dạng bài fanpage thường dùng (ảnh có con số/infographic, album nhiều ảnh, Reels ngắn, ảnh trích dẫn, bình chọn/hỏi đáp tương tác, câu chuyện người học, bài điền chỗ trống), mỗi mẫu gắn một Cột: Giải thích (Ảnh số liệu), Hướng dẫn (Album từng bước, Reels mẹo ngắn), Bất ngờ và ngộ nhận (Ảnh trích dẫn, Đúng hay Sai), Câu chuyện (Chuyện học viên), Luyện tập (Bình chọn, Điền vào chỗ trống). Bảng thông số ở 12.6. Mock `writeSlot` có cách trình bày riêng cho từng mẫu (`FB_WRITERS` trong `04-mock.js`): thẻ trích dẫn ghi “câu nổi bật” kèm dòng ngộ nhận; Đúng hay Sai nêu nhận định và mời bình luận; Bình chọn có ba lựa chọn bấm cảm xúc; Điền vào chỗ trống lấy câu mẫu tiếng Anh có trong ô hoặc Topic, bỏ một từ (gợi ý bằng chữ cái đầu, không thêm số). Hai Tuần mẫu dùng các mẫu mới thay một số slot Threads, TikTok, Instagram (số slot giữ 17 và 9). Nguồn tham khảo: các tổng hợp về loại bài Facebook (Slate Team; SocialPilot; Outfy; Publer; M2 Communications).

## 10.4. Dữ liệu demo như thật (13/10/2026)

Theo yêu cầu người dùng, 11 bản Topic demo (3 tuần, gồm phiên bản) được viết dài đủ khoảng 2.000 chữ: giữ nguyên câu cũ, thêm bối cảnh khảo sát, cơ chế, hướng dẫn chi tiết kèm câu mẫu tiếng Anh có nghĩa (xưng "mình"), giải thích ngộ nhận, chi tiết trường hợp; phần thêm không có số liệu mới (số viết bằng chữ), không thêm cặp Ngộ nhận/Câu hỏi. Mock viết ô: Ý nghĩa chỉ dùng thông điệp; Ví dụ không lấy câu mở bằng đại từ và không lặp câu ví dụ; Bất ngờ mở theo tên Topic; prompt ảnh chỉ thêm góc chụp khi tạo lại. Ô quá dài cố ý (T3 Topic 2 × Luyện tập) chèn 8 câu đầu của Topic thay vì cả Topic.

## 10.3. Nút demo từng bước (13/10/2026, theo yêu cầu người dùng để trải nghiệm nhanh)

Nút **Nạp dữ liệu demo** ở thanh trên vẫn nạp cho tất cả (3 tuần). Thêm thanh **Demo từng bước** áp cho tuần đang chọn, mỗi nút chạy tức thì bằng dữ liệu mẫu và tự khóa (kèm lý do ở tooltip) khi chưa tới bước hoặc đã xong:
- Dashboard: **Demo: Lập tuần** (Tuần mẫu gợi ý), **Demo: Duyệt slot + ảnh** (duyệt mọi slot Chưa duyệt, Gen ảnh cho ô ảnh có prompt mà chưa có ảnh), **Demo: Làm trống tuần**.
- Matrix: **Demo: Nạp Topic** (tệp Topic mẫu, xoay vòng theo tuần), **Demo: Viết ma trận**, **Demo: Duyệt ô** (duyệt cả ô có cảnh báo), **Demo: Chia bài**, **Demo: Làm trống tuần**.
- Setup: mỗi mục (Thương hiệu, Giọng văn, Kênh, Cột, Format, Tuần mẫu, Quy tắc) có **Demo: nạp … mẫu**, và **Demo: nạp toàn bộ Thiết lập**; Dashboard có **Demo: Nạp Thiết lập** (bật khi Thiết lập chưa đủ, ví dụ sau Reset). Mục cùng mã ghi đè bằng bản mẫu (có xác nhận nêu số mục), mục tự thêm giữ nguyên; Format và Tuần mẫu tự kéo theo kênh, Cột, Format còn thiếu; không đụng tới tuần, Topic, slot. Các nút demo tuần khóa khi Thiết lập chưa đủ.
Làm trống tuần xóa slot, Topic, ô của đúng tuần đó (có xác nhận), không đụng tuần khác. Nút demo bị khóa khi tuần đã chốt. Logic ở `src/logic/05d-demo.js`. Đây là công cụ trải nghiệm, bỏ khi giao bản chính thức.

## 10.2. Ghi chú dựng R3′ (13/10/2026)

Đã dựng: nút **Chia bài** ở Matrix (cổng 2.4; xong thì về Dashboard, báo "Đã viết N slot · M slot chưa có bài"; slot của Cột không có ô Đã duyệt giữ "Chưa có bài" kèm lý do `emptyReason`); chi tiết slot có **Duyệt · Tạo lại · Hoàn tác · Sửa**, `<` `>` qua `history` và **Dùng bản này**; **đổi ô nguồn** (chỉ ô Đã duyệt cùng Cột, ghi "đang nuôi n slot khác"; slot chưa có bài cũng chọn ô được); slot **cần cập nhật** có **Cập nhật từ ô** (ô phải Đã duyệt) hoặc **Giữ bản slot** (bắt buộc lý do); **ô ảnh: Gen, `<` `>`** (giữ phiên bản khi slot viết lại, CAL-15). Slot Đã đăng bị đổi bài khi tuần Đang sửa thì gắn "Nội dung đã đổi sau khi đăng".

Cách hiểu đã chọn:
1. **Duyệt slot** khóa khi slot cần cập nhật; slot có cảnh báo hỏi "Vẫn duyệt".
2. **Tạo lại** viết lại từ bản hiện hành của ô nguồn (ô phải Đã duyệt), thêm bản vào `history`; **Hoàn tác** một lần = dùng lại bản ngay trước.
3. **Sửa** lưu bản mới vào `history` (đánh dấu sửa tay), slot về Chưa duyệt.
4. **Giữ bản slot** ghi `keepReason` và dấu ô lúc giữ (`keepStamp`); ô đổi lần nữa thì slot lại cần cập nhật.
5. Mock viết slot: Tạo lại đổi câu mở theo bộ đếm (không thêm ý, số liệu).

Kiểm thử tự động sau R3′: 58 kiểm thử logic (Node), 95 kịch bản giao diện (Playwright); sau nút demo từng bước (gồm Setup): 61 và 110.

## 10.1. Ghi chú dựng R2′ (13/10/2026)

Đã dựng: Viết ma trận (viết lần lượt các ô Trống của phiên bản Topic hiện hành, hiện "Đang viết n/N ô", nút **Dừng**); chi tiết ô có **Duyệt · Tạo lại · Sửa · Hủy ô**, `<` `>` qua mọi lượt sinh (kể cả lượt viết từ phiên bản Topic cũ) và **Dùng bản này**; **Duyệt hàng loạt** các ô Chưa duyệt không cảnh báo (có xác nhận); chi tiết Topic có `<` `>` phiên bản, **Dùng phiên bản này** và **Sửa Topic** (có xác nhận nêu số ô, số slot). Nút việc tiếp theo bước 3–4 thao tác được; Chia bài vẫn khóa đến R3′.

Cách hiểu đã chọn (đổi được nếu người dùng muốn khác):
1. **MTX-07:** ô Câu chuyện của Topic không có trường hợp để **Trống** kèm "nên Hủy"; Viết ma trận bỏ qua ô đó; bước 3 ghi "N ô Câu chuyện nên Hủy" và việc tiếp theo là "Hủy N ô Câu chuyện". (Dữ liệu demo vẫn hủy sẵn ô này ở T3.)
2. **Duyệt ô có cảnh báo:** hộp xác nhận "Ô này có N cảnh báo", nút "Vẫn duyệt".
3. **Sửa ô** lưu một bản sửa (`edits[]`) của lượt sinh đang dùng, gồm bài và gợi ý ảnh; "Dùng bản này" chọn bản sửa mới nhất của lượt sinh đó.
4. **Hủy ô** giữ lịch sử lượt sinh; Tạo lại hoặc "Dùng bản này" đưa ô về Chưa duyệt.
5. **Sửa Topic** không đổi nội dung tệp Topic đã nạp (`topicFiles`); nạp lại tệp sau đó sẽ so với phiên bản hiện hành.
6. Tạo lại, Sửa, Hủy, Dùng bản này, Sửa Topic và Dùng phiên bản khác đều làm slot đang dùng ô của Topic/ô đó "cần cập nhật" (theo `sourceStamp`).

Kiểm thử tự động sau R2′: 51 kiểm thử logic (Node), 86 kịch bản giao diện (Playwright). Chip slot ở Dashboard hiện ô ảnh (ảnh thu nhỏ của phiên bản đang chọn, từ 10.17 xếp chồng kèm số ảnh; Format không có ô ảnh ghi "Không cần ảnh").

Quy tắc dựng giữ như v2.6/v2.7 (một trang HTML tự chứa, cùng đường dẫn artifact; test Node + Playwright; dừng sau mỗi đợt để nhận phản hồi).

---

# 11. Kế thừa, bỏ, hoãn

**Giữ:** hai tầng Cột → Format; lịch là trung tâm; Dashboard; Thương hiệu/Giọng văn bằng Markdown; lịch sử lượt sinh ở ô; `sourceStamp` và "cần cập nhật"; tạo lại slot ghi đè + hoàn tác một lần; hai lần xác nhận cuối và Mở lại để sửa; chỉ số "Đăng đủ, đúng bài"; xuất CSV/JSON/ZIP/manifest; không mã chữ cái; báo cáo đã thẩm định nên không xác minh nguồn; cảnh báo chỉ tham khảo.

**Bỏ khỏi MVP so với v2.7:** bước "Tạo tuần" riêng; lịch mẫu duy nhất; cài đặt "số Input mỗi tuần" (1–5); "ô cần dùng / không có slot dùng"; Xác nhận ma trận; màn Phân bổ (thay bằng nút Chia bài); tab Content; checklist asset chỉ để tick (thay bằng ô ảnh có prompt và phiên bản).

**Hoãn:** app tách research thành Topic (khi có AI thật); Luyện tập ôn Topic tuần trước (M-5); sinh ảnh thật; đo lường hiệu quả; Claude thật; backend, đồng bộ nhiều thiết bị; đăng tự động.

**Không làm:** viết slot thẳng từ Topic không qua ô (D102).

---

# 12. Phụ lục

## 12.1. Mẫu Markdown Thương hiệu, 12.2. Giọng văn, 12.3. Cột, 12.4. Format

Như v2.6 (tiêu chí "Bám Topic"; Format có khóa `layout` và `assetNeeds`).

## 12.5. Tệp Topic và lệnh mẫu cho agent bên ngoài

```markdown
# Nói tiếng Anh trong cuộc họp

Bối cảnh chung: ba Topic dưới đây cùng xoay quanh việc người đi làm dám nói trong họp.
Topic 1 nói về nỗi ngại, Topic 2 về cách luyện, Topic 3 về công cụ (mẫu câu) để dùng ngay.

## Vượt qua nỗi ngại phát biểu
Thông điệp chính: Rào cản lớn nhất là tâm lý, không phải vốn từ.
Đối tượng: Người đi làm 25–40 tuổi họp với đối tác nước ngoài.
Góc nhìn: Một lần phát biểu thành công làm giảm nỗi ngại ở các lần sau.

### Số liệu và phát hiện
…
### Vì sao
…
### Cách làm
- …
### Ngộ nhận thường gặp
Ngộ nhận: … Thực tế: …
### Trường hợp
…
### Câu hỏi luyện tập
…

## Luyện nói ngắn mỗi ngày
…

## Mẫu câu cho cuộc họp trực tuyến
…
```

**Quy tắc đọc:**
1. Tiêu đề `#` đầu tệp (nếu có) là **Chủ đề** của tuần; front matter `theme` (nếu có) được ưu tiên.
2. Nội dung trước `##` đầu tiên (bỏ tiêu đề), nếu dài ≥ 60 ký tự, là **Bối cảnh chung**.
3. Mỗi `##` là một Topic; tên Topic là chữ của đề mục. Không có `##` thì cả tệp là 1 Topic.
4. Các dòng `Thông điệp chính:`, `Đối tượng:`, `Góc nhìn:` ngay đầu Topic là trường tùy chọn.
5. Các đề mục `###` trong Topic là tùy chọn; nếu có, mock và AI dùng chúng để lấy đúng chất liệu cho từng Cột. Topic có `### Trường hợp` (hoặc "Câu chuyện") được coi là có trường hợp cụ thể.
6. Lỗi: tệp rỗng hoặc dưới 200 ký tự chữ; hơn 10 Topic. Số Topic khác nhau giữa các tuần là bình thường (không còn cảnh báo). Dòng giống chỉ thị chỉ là văn bản.

**Lệnh mẫu cho agent bên ngoài** (app cung cấp nút sao chép):

> Từ báo cáo nghiên cứu tuần này, hãy viết các Topic cho ứng dụng Content Matrix (mặc định 3 Topic, có quan hệ với nhau trong cùng một mạch). Mỗi Topic khoảng 2.000 chữ, bắt đầu bằng đề mục `##` là tên Topic, ba dòng "Thông điệp chính:", "Đối tượng:", "Góc nhìn:", rồi các phần `###`: Số liệu và phát hiện (kèm nguồn ngay trong câu), Vì sao, Cách làm (các bước, câu mẫu), Ngộ nhận thường gặp (dạng "Ngộ nhận: … Thực tế: …"), Trường hợp (chỉ trường hợp có thật; không có thì bỏ phần này), Câu hỏi luyện tập (kèm đáp án). Trước Topic đầu tiên, viết một đoạn Bối cảnh chung nêu quan hệ giữa các Topic. Chỉ dùng số liệu có trong báo cáo.

## 12.6. Thông số mặc định theo Format (seed)

| Format | Cách trình bày | Độ dài / giới hạn | CTA |
|---|---|---|---|
| Blog · Bài phân tích | `article` | 200–1.500 chữ; tiêu đề, mở bài, các đoạn có đề mục, kết | Có |
| YouTube · Video giải thích | `longscript` | 200–1.500 chữ; cảnh có mốc thời gian | Có |
| Instagram · Carousel giải thích | `carousel` | 6–8 slide, ≤ 40 chữ/slide | Có |
| Facebook · Bài hướng dẫn | `post` | 500–1.500 ký tự, ≤ 3 hashtag | Có |
| TikTok · Mẹo nhanh | `script` | 60–150 chữ, hook 3 giây | Có |
| Instagram · Carousel từng bước | `carousel` | 6–8 slide, ≤ 40 chữ/slide | Có |
| YouTube · Shorts hướng dẫn | `script` | 50–130 chữ | Có |
| Threads · Sự thật bất ngờ | `post` | 150–500 ký tự | Không bắt buộc |
| TikTok · Bạn có biết | `script` | 40–110 chữ | Có |
| Instagram · Carousel ngộ nhận | `carousel` | 6–8 slide, ≤ 40 chữ/slide | Có |
| Facebook · Bài kể chuyện | `post` | 500–1.500 ký tự | Có |
| Instagram · Reels kể chuyện | `script` | 60–150 chữ | Có |
| Threads · Quiz | `post` | 100–500 ký tự | Câu hỏi |
| Facebook · Thử thách | `post` | 200–1.000 ký tự | Câu hỏi |
| Instagram · Carousel quiz | `carousel` | 6–8 slide, ≤ 40 chữ/slide | Có |
| Facebook · Ảnh số liệu | `post` | 200–800 ký tự, ≤ 3 hashtag | Có |
| Facebook · Album từng bước | `carousel` | 4–10 ảnh, ≤ 40 chữ/ảnh | Có |
| Facebook · Reels mẹo ngắn | `script` | 50–130 chữ | Có |
| Facebook · Ảnh trích dẫn | `post` | 60–300 ký tự, ≤ 2 hashtag | Không bắt buộc |
| Facebook · Đúng hay Sai | `post` | 150–600 ký tự, ≤ 3 hashtag | Câu hỏi |
| Facebook · Chuyện học viên | `post` | 300–900 ký tự, ≤ 3 hashtag | Có |
| Facebook · Bình chọn | `post` | 100–400 ký tự, ≤ 3 hashtag | Câu hỏi |
| Facebook · Điền vào chỗ trống | `post` | 100–400 ký tự, ≤ 3 hashtag | Câu hỏi |

## 12.7. Nguồn tham khảo cho các quyết định nội dung

- Berger, J. & Milkman, K. (2012). What makes online content viral? *Journal of Marketing Research*, 49(2).
- Schroeder, N. & Kucera, A. (2022). Refutation text facilitates learning: a meta-analysis. *Educational Psychology Review*.
- van Laer, T., de Ruyter, K., Visconti, L. & Wetzels, M. (2014). The extended transportation-imagery model. *Journal of Consumer Research*, 40(5).
- Karpicke, J. & Roediger, H. (2007). Repeated retrieval during learning is the key to long-term retention. *Journal of Memory and Language*, 57.
- Sweller, J. và cộng sự: worked-example effect, cognitive load theory.
- Cepeda, N. và cộng sự (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin*, 132(3).
- Buffer (2026). Best content format on social platforms (45M+ posts).
- Socialinsider (2026). Social media reach benchmarks.

---

*Hết tài liệu v2.8.*


## 10.52. Nạp Skill từ tệp (14/10/2026, bản 77)
Trình sửa Skill có nút "Chọn tệp Skill (.md)". Tệp .md/.markdown/.txt tối đa 2 MB được đọc tại trình duyệt; phần đầu dạng `---…---` bị bỏ; nội dung thay ô Nội dung; tên Skill lấy từ tên tệp nếu ô tên trống. Không lưu tự động: người dùng bấm Lưu (Skill mới) hoặc Lưu (Skill đang sửa, tăng phiên bản, giữ bản cũ). Cảnh báo độ dài và số ví dụ chạy lại sau khi nạp.

## 10.53. Cấu hình Matrix (14/10/2026, bản 78)
Setup → Cấu hình Matrix: danh sách vị trí Cột (mặc định 5 = các Cột đang bật). Mỗi vị trí chọn một loại nội dung từ mục Cột; được chọn trùng. Có Thêm vị trí, Xóa, đổi thứ tự, Về mặc định. Áp cho tuần tạo mới; tuần đã tạo giữ nguyên và vẫn thêm/bớt Cột ở màn hình Tuần (được thêm loại đã có). Khi một loại xuất hiện nhiều lần, tiêu đề ghi số thứ tự ("Giải thích 1", "Giải thích 2"). Các vị trí cùng loại dùng chung Skill, hướng dẫn, Format; khi AI viết một ô, các bài đã có ở vị trí cùng loại của cùng Topic được gửi kèm để AI chọn góc khác; cảnh báo trùng nội dung cũng so với các ô đó. Chia bài lấy ô Đã duyệt từ mọi vị trí cùng loại.

## 10.54. Tối đa 10 Topic, giao diện Cấu hình Matrix (14/10/2026, bản 79)
Mỗi tuần tối đa 10 Topic (tệp nạp hơn 10 Topic báo lỗi, không nạp; Nạp thêm không vượt 10). Cấu hình Matrix hiển thị trong một panel: mỗi vị trí một hàng gồm số thứ tự, ô chọn loại Cột cùng kiểu ô nhập của app, dòng phụ (cấu trúc, số Format, Skill đang dùng, tiêu đề trong Matrix khi trùng loại) và ba nút biểu tượng Lên, Xuống, Xóa.

## 10.55. Duyệt ô ngay trong Matrix và duyệt hàng loạt gồm ô có cảnh báo (14/10/2026, bản 80)
Mỗi ô Chưa duyệt trong Matrix có nút Duyệt nằm trong cùng thẻ ô, dưới phần nội dung (bản 81); ô không cảnh báo duyệt luôn, ô có cảnh báo hỏi "Duyệt ô có cảnh báo?" rồi duyệt, không mở hộp chi tiết. Nút Duyệt hàng loạt hiện khi có ô Chưa duyệt, ghi tổng số ô; hộp xác nhận duyệt các ô không cảnh báo và có ô đánh dấu "Duyệt cả N ô có cảnh báo" kèm danh sách Topic × Cột và số cảnh báo (mặc định không chọn; nếu không có ô sạch nào thì chọn sẵn).

## 10.56. Chỉnh giao diện Matrix, Tuần mẫu, Dashboard (14/10/2026, bản 82)
- Setup: mục "Cấu hình Matrix" đổi tên "Matrix"; dòng chọn Cột chỉ còn ô chọn (và "Tiêu đề trong Matrix" khi một loại Cột đứng nhiều vị trí).
- Matrix: nút Duyệt trong thẻ ô không có biểu tượng, cùng kiểu nút Duyệt của slot, căn lề phải trong thẻ (bản 83); nút "Duyệt hàng loạt" đổi tên "Duyệt tất cả" (hộp xác nhận tên "Duyệt tất cả").
- Dashboard: dải "Việc tiếp theo" có nút "Duyệt tất cả" ở bước 4 (duyệt ô) và bước 6 (duyệt slot), cùng hộp xác nhận: mặc định duyệt mục không cảnh báo, có ô đánh dấu duyệt cả mục có cảnh báo kèm danh sách.
- Setup → Tuần mẫu: slot mẫu hiện trên lịch 7 ngày cùng bố cục lịch tuần (giờ, kênh, Format, Cột); dấu + ở từng ngày thêm slot vào ngày đó; bấm slot mở hộp sửa Thứ, Giờ, Kênh, Format hoặc Xóa slot; trên điện thoại lịch xếp theo ngày dọc.

## 10.57. Format theo kênh trong một khung (14/10/2026, bản 84)
Setup → Format: một khung chia đôi. Nửa trái liệt kê các kênh, mỗi kênh một nút kèm số Format; nửa phải hiện Format của kênh đang chọn (tên, Cột nguồn, cấu trúc, quy tắc, asset; nút Sửa, Xóa) và nút Thêm Format đặt sẵn kênh đang chọn. Kênh chưa có Format hiện số 0 màu cảnh báo. Trên điện thoại danh sách kênh nằm ngang phía trên.

## 10.58. Chuẩn hóa mã nguồn cho lập trình viên (14/10/2026, bản 85)
Không đổi tính năng, giao diện hay dữ liệu. Mã nguồn chuyển sang ES module (mỗi tệp khai báo `import`/`export`), đóng gói bằng Vite (`npm run build`) thành một tệp `dist/index.html` tự chứa như trước; người dùng vẫn `git pull` rồi mở tệp này, không cần cài Node. Dữ liệu giữ khóa `autocontent.state` và cấu trúc cũ. Lập trình viên đọc `DEVELOPERS.md` (lệnh, cách ghép mã, quy ước, sơ đồ module).

## 10.59. AI viết bài: cứu JSON cụt, thử lại, viết tiếp (15/10/2026, bản 86)
Khi AI trả JSON hỏng hoặc bài dừng giữa chừng, app lấy phần chữ trong khoá "text" thay vì dán JSON thô vào ô. Phản hồi rỗng được thử lại 1 lần. Bài bị cắt (JSON chưa đóng, hoặc dừng ngay ở một đề mục) được xin viết tiếp tối đa 2 lượt rồi ghép lại; nếu vẫn thiếu, hiện thông báo để người dùng viết lại bài đó. Không đổi dữ liệu lưu.

## 10.60. Viết tiếp bài: bỏ bản dở khi AI viết lại từ đầu (15/10/2026, bản 87)
Khi bài AI dừng giữa chừng và lượt viết tiếp mở bằng đúng đề mục đầu của bài dở, app dùng bản viết lại làm bài và bỏ phần dở, để ô không chứa hai bản liền nhau. Trường hợp thường vẫn nối phần viết tiếp vào cuối bài dở.

## 10.61. Nhãn bài mô phỏng và tên model (15/10/2026, bản 88)
Khung Điểm AI của ô và slot: bài do AI viết ghi "Bài do AI viết · [model] · Skill [tên] v[số]"; bài không do AI viết ghi "Bài mô phỏng (không phải AI)", để người dùng không nhầm bài ghép mẫu (không áp dụng Skill) với bài AI, kể cả khi AI lỗi và app tự dùng mô phỏng.

## 10.62. AI viết bài: thử lại, chẩn đoán và nhận bài cụt (15/10/2026, bản 89)
Mỗi lần gọi AI viết bài thử tối đa 3 lần: phản hồi rỗng được nhắc lại đúng dạng JSON, lỗi tạm thời (hết hạn mức, quá tải, hết giờ chờ) chờ 2 rồi 5 giây. Khi vẫn thất bại, thông báo ghi lý do dừng, số token và số lần đã thử. Bài bị cắt (API báo hết giới hạn, hoặc bài có đề mục kết thúc giữa câu) được xin viết tiếp; nếu lượt viết tiếp lỗi thì giữ phần đã có và báo bài chưa xong. Giới hạn đầu ra mặc định 8000 token, thời gian chờ 5 phút, tối đa 2 bài gọi song song với API khoá (3 với claude.ai).

## 10.63. Nạp nhiều tệp Topic và hàng chờ Viết ma trận (15/10/2026, bản 90)

- Hộp Nạp Topic cho chọn nhiều tệp. Các tệp được sắp theo tên tự nhiên, ghép thành một văn bản; tệp không có đề mục `##` thành 1 Topic (tên từ `#` hoặc tên tệp). Xem trước hiện thứ tự tệp. Mỗi tệp tối đa 2 MB. Dùng được cho cả "Nạp" và "Nạp thêm".
- Viết ma trận chạy tuần tự từng ô. AI đang bận việc khác thì chờ và thử lại. AI lỗi: hỏi một lần; chọn mô phỏng thì mọi ô còn lại viết mô phỏng (có nhãn "Bài mô phỏng"), Hủy thì dừng.
## 10.64. Viết lại ma trận và dòng tiến độ AI (15/10/2026, bản 91)

- Nút Viết ma trận chỉ tính ô Trống, nên Hủy hết ô thì khóa ("Mọi ô đã có bài"). Nay `writeQueue(S, weekId, 'redo')` trả các ô Đã hủy (trừ ô Câu chuyện không có trường hợp). `writeGate` thấy hết ô Trống mà còn ô Đã hủy thì trả `redo: true`, `mode: 'redo'`; nút ghi "Viết lại ma trận (n ô)". Còn ô Trống thì vẫn chỉ viết ô Trống (ô Đã hủy cố ý không bị sống lại). `writeCellNow` nhận cả ô Đã hủy: thêm bản mới, bản cũ vẫn trong lịch sử ô; ô Nháp và Đã duyệt không bị đụng. Lượt chạy giữ `mode` nên không lẫn hai hàng chờ.
- Thanh tiến độ góc dưới (`aiBusy`, 04k-aitext.js) ghi "Claude - Đang viết <Cột · Topic> (ô n/tổng)…" (Viết ma trận truyền `progress`); việc nhiều bài ghi "(n/tổng bài)"; tên nhà cung cấp có "Claude" rút thành "Claude". Nhãn lấy từ `label` của việc AI (`cellJob`/`slotJob`), cập nhật khi mỗi việc bắt đầu.
- Test 114 logic (thêm "Viết lại ma trận") và 382 giao diện đạt. Ghi chú môi trường: thư mục dự án (ổ gắn) không cho tạo symlink nên `npm install` phải chạy ở bản sao (`cp` sang /home/claude/ac), rồi chép `dist/` về.

## 10.65. Tuần mẫu "Fanpage Facebook" (15/10/2026, bản 92)

- Thêm Tuần mẫu mặc định thứ ba `wt-3` "Fanpage Facebook" (`05-model.js`, slot `tpl-c-*`), chỉ dùng Format Facebook đang có: T2 10:00 Album từng bước; T3 10:00 Ảnh số liệu, 14:00 Reels mẹo ngắn; T4 11:00 Đúng hay Sai, 18:00 Bài kể chuyện; T5 11:00 Bình chọn, 15:00 Reels mẹo ngắn; T6 10:00 Ảnh trích dẫn. Theo Cột: Hướng dẫn 3, Bất ngờ và ngộ nhận 2, Giải thích 1, Câu chuyện 1, Luyện tập 1. Cuối tuần để trống nên Setup báo "ngày không có slot" (cố ý).
- Căn cứ: 8 bài/tuần theo mức trung bình ngành Giáo dục (Hootsuite, quý 1/2025); ngày và giờ trong khung tốt của ngành giáo dục, cuối tuần kém nhất (Sprout Social); tỷ lệ ảnh/Reels/album/bài chữ theo Socialinsider (bỏ bài link). Chi tiết và giới hạn ở `notes/tuan-mau-facebook.md`; danh sách Format đề xuất ở `notes/de-xuat-format-facebook.md`.
- Xoay vòng gợi ý (D104) nay là Tuần chuẩn → Tuần nhẹ → Fanpage Facebook. Người dùng đang có dữ liệu cũ nhận mẫu mới qua Setup → Tuần mẫu → nút "Demo: nạp Tuần mẫu mẫu" (ghi đè Tuần chuẩn, Tuần nhẹ nếu đã sửa, có hộp xác nhận; thông báo đếm số mẫu theo dữ liệu mặc định).
- Test 115 logic (thêm "10.65 · Tuần mẫu Fanpage Facebook") và 382 giao diện đạt.

## 10.66. Hoàn thành Matrix và Viết tất cả slot (15/10/2026, bản 93)

Thay nút "Chia bài" của Matrix. Quy trình mới: duyệt hết ô, bấm Hoàn thành ở Matrix để khóa, rồi bấm Viết tất cả slot ở Dashboard.
- **Hoàn thành** (`completeMatrix`, `completeGate`; `week.matrixDoneAt`): bật khi tuần chưa chốt, có Topic, không còn ô Trống hoặc Chưa duyệt (ô Đã hủy tính là đã xử lý) và có ít nhất một ô Đã duyệt. Khi Hoàn thành, mọi thao tác ghi lên ô và Topic (viết, tạo lại, sửa, duyệt, hủy, dùng bản cũ, nạp, thêm, bớt Topic, thêm/bớt Cột của tuần) bị logic từ chối với thông báo `MATRIX_LOCK_MSG`; nút trên giao diện chỉ tắt theo.
- **Sửa** (`reopenMatrix`): nút cạnh Hoàn thành, có hộp xác nhận, mở khóa Matrix. Slot đã viết giữ nguyên; slot dùng ô bị sửa tự báo "cần cập nhật". Tuần đã chốt phải Mở lại tuần trước.
- **Viết tất cả slot** (nút `data-testid="deal"` ở thanh công cụ Dashboard; `dealGate`): chỉ bật khi Matrix đã Hoàn thành, tuần có slot và còn slot trống viết được. Viết lần lượt từng slot (`dealQueue`, `dealNext`, `dealFinish`), có nút Dừng và tiến độ "n/tổng"; không bao giờ ghi đè slot đã có bài. Thuật toán phân bổ giữ nguyên (xoay vòng Cột, ô Đã duyệt ít slot dùng nhất, D100) nhưng tách thành `dealPlan` thuần nên viết từng slot hay cả tuần cho cùng kết quả (`dealSlots`, `dealWeek` dùng cho test, Demo và AI plan).
- **Tạo bài** ở từng slot giữ nguyên, nhưng chỉ bật khi Matrix đã Hoàn thành ("Matrix chưa Hoàn thành (bấm Hoàn thành ở Matrix trước)").
- Bước 5 của thanh tiến độ đổi tên "Viết slot"; việc tiếp theo là "Hoàn thành Matrix" rồi "Viết tất cả slot (n slot)".
- Tuần đã Chia bài ở bản cũ được coi là đã Hoàn thành khi mở dữ liệu cũ (`migrateState`).
- Tuần mẫu "Fanpage Facebook" thêm T7 19:30 Bài kể chuyện và CN 10:00 Điền vào chỗ trống (10 slot, đủ 7 ngày). Theo Cột: Hướng dẫn 3, Bất ngờ và ngộ nhận 2, Câu chuyện 2, Luyện tập 2, Giải thích 1. Căn cứ cuối tuần: nhu cầu của người dùng (mục tiêu thêm nội dung cuối tuần); giờ T7, CN nằm ngoài khung "tốt nhất" của Sprout Social cho ngành giáo dục, là lựa chọn của người dùng, nên chỉnh theo Page Insights sau 4 tuần.
- Mục 10.65 bên trên: phần "Chỉ T2–T6, cuối tuần để trống" nay không còn đúng. Mọi chỗ ghi "Chia bài" ở các mục cũ nghĩa là Viết tất cả slot sau khi Hoàn thành.
- Test 115 logic và 387 giao diện đạt.

## 10.67. Một ổ khóa cho Matrix (15/10/2026, bản 96)

Chỉnh 10.66 theo ý người dùng: nút **Hoàn thành** và **Sửa** gộp thành một nút ổ khóa ở thanh công cụ Matrix.
- Khóa mở: nút "Khóa Matrix" (biểu tượng ổ khóa mở). Chỉ bấm được khi mọi ô đã duyệt hoặc hủy (`completeGate`); chưa đủ thì nút tắt và dòng chú thích nêu lý do.
- Khóa đóng: nút "Đã khóa" (ổ khóa đóng); bấm lần nữa là mở khóa, không hỏi xác nhận (`reopenMatrix`). Tuần đã chốt thì ổ khóa tắt.
- Khóa đóng thì mọi nút sửa trong ô và Topic bị tắt (Duyệt, Tạo lại, Sửa, Hủy ô, Dùng bản này, Sửa/Xóa Topic, Sửa Topic, Dùng phiên bản này) và Viết ma trận tắt. Logic vẫn chặn ở `MATRIX_LOCK_MSG`.
- **Viết tất cả** (đổi tên từ "Viết tất cả slot") chỉ có ở Dashboard, bật khi khóa đóng, tắt khi khóa mở. Việc tiếp theo: bước 4 "Khóa Matrix", bước 5 "Viết tất cả (n slot)".
- Không đặt nút Viết tất cả ở Matrix: người dùng khóa xong sang Dashboard bấm Viết tất cả hoặc Tạo bài từng slot.
- Thanh bên hiện số hiệu bản ("Đợt R4 · bản N"), hằng `BUILD` trong `01-util.js`, tăng 1 mỗi lần publish.
- Các chỗ ghi "Hoàn thành" và "Sửa" của Matrix ở 10.66 nay đọc là khóa và mở khóa.

## 10.68. Gen AI cho ảnh của slot (15/10/2026, bản 97)

Gộp Gen, Prompt và Image to Image thành một hộp thoại **Gen AI**.
- Viết slot chỉ ghi **Mô tả ảnh** (tiếng Việt, 1–2 câu: bức ảnh trông thế nào), không viết prompt tạo ảnh. Dữ liệu cũ giữ nguyên: trường `prompt` của ô ảnh chính là Mô tả ảnh; `genPrompt` là prompt người dùng gõ.
- Nút **Gen AI** thay Gen và nút Prompt nhỏ (popup bài, Cấu hình slot, danh sách ảnh). Hộp thoại có: Mô tả ảnh (sửa được, giữ khi slot viết lại); dấu **+** đính ảnh tham chiếu (tối đa 3) và nút "Dùng ảnh hiện tại" (không tự đính); thanh chat với nút **Prompt** (tạo prompt từ Mô tả ảnh, ghi đè chữ đang có, có Hoàn tác); **Enter** để tạo ảnh (Shift+Enter xuống dòng). Chưa bấm Prompt thì Enter dùng Mô tả ảnh.
- Có ảnh tham chiếu thì chạy Image to Image (API `/images/edits` khi bật AI ảnh, dùng ảnh tham chiếu đầu tiên); không có thì tạo ảnh mới. Chế độ mô phỏng: ảnh tham chiếu chỉ đổi sáng, màu theo từ khoá trong prompt. Mỗi lần tạo là một phiên bản mới, ghi `genai: {prompt, ref}`; bản cũ giữ nguyên.
- Tab **Img2Img** trong Edit được bỏ (Edit còn Ảnh, Frame, Chữ, Cắt, Mẫu). Ảnh video vẫn chưa Gen AI được.
- Nút Prompt hiện chỉ ghép Mô tả ảnh với tỉ lệ và yêu cầu hình (mô phỏng); nối AI chữ để viết prompt tốt hơn là việc sau.
- Test 116 logic, 385 giao diện đạt.

## 10.69. Chỉnh giao diện Gen AI (15/10/2026, bản 98)

Thay bố cục hộp thoại Gen AI của 10.68 (chức năng giữ nguyên). Nút Gen AI chỉ còn chữ, không biểu tượng.
- Từ trên xuống: **khung ảnh** đúng tỉ lệ ô ảnh (xám khi ô chưa có ảnh hoặc đang tạo, ô đã có ảnh thì hiện ảnh đang dùng); hai nút **< >** hai bên xem lại và chọn phiên bản, dòng nhỏ dưới khung ghi "vN/tổng · nhãn"; **Mô tả ảnh** ngay dưới khung; **thanh chat** có dấu + và nút Tạo ảnh (Enter hoặc bấm), ảnh tham chiếu hiện trong thanh và thanh cao hơn khi có ảnh; hàng nút dưới thanh: **Dùng ảnh hiện tại**, **Prompt**, **Hoàn tác** (hiện sau khi bấm Prompt).
- Xem phiên bản nào bằng < > thì phiên bản đó là ảnh đang dùng của ô. Tạo xong hộp thoại giữ mở để gen tiếp; đóng thì trang và khung bài tự cập nhật.
- Test 116 logic, 386 giao diện đạt.

## 10.70. Chia sẻ ảnh giữa các slot (15/10/2026, bản 99)

Một ảnh đẹp ở slot này có thể dùng ngay cho slot khác trong cùng tuần.
- **Nút Chia sẻ** trên thanh ảnh (sau Edit). Hộp thoại có: hình bản đang hiển thị; cách chia sẻ **Chia sẻ** (mặc định) hoặc **Sao chép**; danh sách slot cùng tuần có ô ảnh (ghi giờ, ngày, Format, tỉ lệ, lý do nếu không nhận được); phần **Lưu vào Store** (tên, nhãn).
- **Chia sẻ** = dùng chung một ảnh: hai ô cùng một lịch sử phiên bản và cùng phiên bản đang chọn. Gen AI, Up, Frame, Chữ, Cắt, Img2Img và < > ở slot nào cũng đổi cho mọi slot trong nhóm. Chỉ cho ô ảnh **cùng tỉ lệ**; slot nguồn phải chưa khóa. Lấy bản đang hiển thị lúc chia sẻ (kèm frame, chữ nếu đã ghép; hộp thoại cảnh báo và gợi ý Sao chép).
- **Sao chép** = thêm một phiên bản mới vào ô nhận (ghi `copiedFrom`), hai ô độc lập sau đó. Khác tỉ lệ và là ảnh thật thì tự cắt giữa về tỉ lệ ô nhận (thành thêm một phiên bản).
- Slot nhận đã duyệt thì về Chưa duyệt vì ảnh đổi. Slot đã đăng và tuần đã chốt không nhận được. Sửa ảnh ở một ô trong nhóm mà ô khác đang bị khóa (đã đăng, tuần chốt) hoặc khác tỉ lệ thì ô đó tự **tách** thành bản riêng giữ ảnh cũ; đổi tỉ lệ ô hoặc tải video lên cũng tách. Ảnh bạn tải lên hoặc AI đã tạo sẵn ở ô nhận được giữ lại thành phiên bản của nhóm; ảnh mô phỏng thì bỏ.
- **Tách ảnh** trong hộp thoại: ô thành bản sao riêng, ảnh đang dùng giữ nguyên. Viết slot lại không tự Gen ảnh mới cho ô dùng chung. Thẻ lịch hiện dấu liên kết khi có ảnh dùng chung.
- **Lưu vào Store**: lưu bản đang hiển thị (ảnh mô phỏng được vẽ ra JPEG) vào kho, dùng giữa các tuần qua nút Store; khi lấy về slot là sao chép như trước. Chưa chia sẻ trực tiếp giữa các tuần.
- Kỹ thuật: dữ liệu lưu mỗi ô một bản; `relinkShares` nối lại cùng một mảng khi nạp. Ảnh lớn đã dedupe theo khoá nội dung ở kho IndexedDB nên không tốn gấp đôi.
- Test 117 logic, 396 giao diện đạt.

## 10.71. Lịch mini chọn slot nhận ảnh chia sẻ (15/10/2026, bản 100)

Trong hộp thoại Chia sẻ (10.70), danh sách slot nhận được thay bằng lịch tuần thu nhỏ 7 cột.
- Mỗi ô: thumbnail ảnh hiện có, giờ, icon nền tảng. Tiêu đề, tỉ lệ và lý do không nhận được nằm trong chú thích khi rê chuột hoặc chạm và trong chữ ẩn cho trình đọc màn hình.
- Ô nguồn có viền đậm và nhãn "Nguồn". Ô không nhận được (đã khóa, video, đã dùng chung, khác tỉ lệ khi Chia sẻ) mờ đi. Ô chưa có ảnh viền nét đứt. Ô đã chọn có viền xanh và dấu tick.
- Bấm ô để chọn; bấm tên ngày để chọn hoặc bỏ chọn cả ngày. Màn hình hẹp xếp 4 cột.
- Cách chia sẻ, cảnh báo frame/chữ, Tách ảnh và Lưu vào Store giữ nguyên.

## 10.72. Short Vid đợt 1: Topic → Insight → Kịch bản → Video (16/10/2026, bản 101)
Kế hoạch: `notes/ke-hoach-short-vid.md` (Đợt 1). Quyết định D152–D155.
- Dữ liệu (`src/logic/05s-shortvid.js`): `S.vidFormats` (7 mặc định, `key`, `kind`, `structure`, `guideMd`, `needs` '' | 'case' | 'question', `basis`, `active`, `skills`, `activeSkillId`), `S.vidSettings` (weekTarget 7, weekMin 3, mix {bantin 3, noihet 4}, wordMin 140, wordTarget 150, wordMax 200, wps 2,5, ratio 9:16, brand {opener, closer, visual} = Khuôn video thương hiệu), `S.vidTopics` (chủ đề chỉ cho video, cùng dạng Topic, id `<tuần>-V<n>`), `S.videos`, `S.vidAnalyses` (lý do tổng mỗi lần phân tích). `migrateState` gọi `ensureShortVid` để dữ liệu cũ có mặc định.
- Video: `{id, weekId, topicId, order, status IDEA|TODO|DRAFT|APPROVED, cancelled, insight {title, idea, reason}, source, formatId, kind bantin|noihet, script, prompts {audio, image}, history (5 bản), file {src, name, size, cover, subs}, slotIds, ai, simulated}`. Trạng thái hiển thị `vidState`: Đề xuất → Chờ viết → Có kịch bản → Đã duyệt kịch bản → Sẵn sàng (có tệp); Đã hủy đứng riêng. `slotIds` để dành cho Đợt 2.
- Kịch bản viết có nhãn `[Phần]` trên dòng riêng; đếm chữ bỏ nhãn (`vidWords`), thời lượng = chữ / wps. Bản tin: `[Người dẫn]` · `[Giọng máy]` · `[Chốt]`, phần Giọng máy thành Prompt Audio. Cảnh báo `vidIssues`: ngoài khoảng chữ, người dẫn ngoài 12–30 chữ, Bản tin thiếu Prompt Audio. Kiểm trùng `vidDupes` trong tuần: trùng đoạn căn cứ (chuỗi ≥ 40 ký tự), câu mở giống, câu chốt giống (câu chốt = câu đầu phần [Chốt] hoặc câu cuối phần trước CTA; CTA chung theo khuôn không tính).
- Phân tích lại chỉ thay đề xuất chưa duyệt; video đã duyệt Insight giữ nguyên. Viết kịch bản cần duyệt Insight trước; sửa kịch bản đã duyệt thì về Có kịch bản. Hủy chỉ cho video đã duyệt Insight (đề xuất thì Bỏ).
- AI: giao diện gọi `textCall` trực tiếp (không qua `withAiText`) với `vidAnalyzeJob` → `parseVidInsights`, `vidScriptJob` → `parseVidScript`; lỗi thì hỏi dùng mô phỏng. Lời nhắn có Skill đang chọn của Format video, Khuôn thương hiệu, câu mở các video khác trong tuần.
- Giao diện: `ui/09-shortvid.js` (màn Short Vid: cột trái Topic của tuần, bên phải Phân tích, danh sách Insight, thẻ kịch bản, ô Video Up/Bìa/Phụ đề/Bỏ video), `ui/07c-shortvid.js` (Setup → Short Vid), KPI chip `dash-vid-kpi` trên Dashboard dẫn sang Short Vid. Hộp Bìa và Phụ đề tách thành `coverDialog(T)`, `subsDialog(T)` trong `04j-media.js` dùng chung cho slot và video. Video tối đa 25 MB (IndexedDB), giống slot.
- Chưa làm (Đợt 2+): slot `shortvid`, Đưa vào lịch, caption theo kênh, Report/Export theo video, công cụ dựng.
- Test: 121 logic, 416 UI.

## 10.73. Short Vid trình bày theo bảng (16/10/2026, bản 102)
Theo góp ý người dùng: nhất quán UI/UX với phần còn lại của app. Cách chọn: nội dung ngắn, cần so sánh theo cột thì dùng bảng; nội dung dài, nhiều nút thì dùng thẻ.
- Đầu màn: bảng tổng quan video của tuần (như Matrix: khung `.work`, dải đếm trạng thái, bảng). Bấm Insight thì nhảy tới thẻ chi tiết.
- Insight đề xuất dạng bảng: Chọn, Insight (ý chính, đoạn căn cứ thu gọn), Format, Kiểu, Lý do, Sửa/Bỏ.
- Chọn Topic bằng hàng chip (như lọc kênh ở Dashboard); chủ đề nạp riêng ghi "Riêng cho video".
- Thẻ kịch bản và ô Video giữ dạng thẻ. Điện thoại: bảng thành thẻ có nhãn cột, ẩn Topic và số thứ tự.
- Sửa lỗi: thanh tab dưới điện thoại 5 cột nhưng có 6 mục.

## 10.74. Short Vid dạng ma trận Topic × 7 thẻ Vid, popup từng thẻ (16/10/2026, bản 103)
Theo yêu cầu người dùng, thay bố cục bảng ở 10.73.
- Hàng là Topic (dùng chung với Matrix, thêm chủ đề riêng cho video, hoặc ẩn Topic của Matrix khỏi Short Vid); cột là 7 thẻ Vid, tối đa 7 video mỗi Topic. AI chỉ đề xuất tới 7.
- Thẻ Vid hiện trạng thái, số chữ, tiêu đề Insight, Format, kiểu, cảnh báo, "Có video". Viền cam là cần xử lý; mờ là đã hủy.
- Bấm thẻ mở popup giữa màn: đầu popup là công cụ (Kịch bản, Biên tập video, Tài nguyên), thân là Insight, Kịch bản, Prompt, Ô Video, lịch sử kịch bản. Công cụ cắt/crop/frame/nhạc nền (Đợt 3) và kho B-roll/SFX/giọng đọc (Đợt 4) có chỗ sẵn, chưa bật.
- Thanh công cụ tuần: phân tích hàng loạt, duyệt đề xuất hàng loạt, viết kịch bản hàng loạt.

## 10.75. Short Vid: Vid tự do, Bàn dựng mô phỏng, b-roll, Đưa vào lịch (16/10/2026, bản 104)
Theo quy trình người dùng đề xuất (nạp chủ đề → ô Vid theo Topic → ô Vid tự do nhiều cách nạp → lưu file và gắn slot), làm cả ba bước đã thống nhất. Quyết định D156–D158.
- **Vid tự do** (`addFreeVideo`, hàng `${weekId}-FREE` trong `S.vidTopics` có `free: true`): hộp Tạo Vid tự do chọn 1 trong 6 cách nạp (`VID_ORIGINS`), mỗi cách có ô nhập riêng. Có sẵn kịch bản: không có nhãn thì mỗi đoạn thành một phần (Hook … CTA), không có nút Tạo lại. Giọng đọc / quay người nói: lời dán tay hoặc **Chép lời (API)**; quay người nói tự đo khoảng lặng (`measureLevels` → `silenceCuts`, không đọc được tiếng thì `mockCuts`). Từ bài Matrix: chọn ô Đã duyệt, bỏ Markdown, rút thành kịch bản Hook/Nội dung/Ý chính/CTA. B-roll ngắn: nhiều clip/ảnh, mô tả mô phỏng sửa được, ô Yêu cầu, 3 ý tưởng, Viết lời dẫn (mỗi clip một [Cảnh k]). B-roll dài: một clip tách đều (2–20 giây, Tách lại), mô tả từng đoạn.
- **Popup thẻ** thêm: nút **Bàn dựng** (nhóm Biên tập video), mục **Nguồn vào** (tệp, mô tả, đoạn, Thêm tệp, Bỏ tệp), mục **Lịch đăng** (Đưa vào lịch / danh sách slot / Bỏ khỏi lịch).
- **Bàn dựng** (`ui/09c-videdit.js`, logic `planEdit`, `editScene`, `setSceneAsset`, `addScene`, `removeScene`, `moveScene`, `setEditOptions`, `editTimeline`, `captionChunks`, `editIssues`, `editCommands`): tự lên kế hoạch khi mở lần đầu (đoạn dài chia ≈ 28 chữ/cảnh; b-roll: [Cảnh k] nhận clip k; Bản tin: cảnh Người dẫn là tự quay; giọng đọc: co giãn cảnh theo độ dài file; quay người nói: cảnh = đoạn giữ giữa các chỗ cắt, giọng = tiếng trong clip). Khung 9:16 xem trước có Phát/Dừng, Từ đầu, tua, cảnh đang phát được tô viền; ảnh có hiệu ứng phóng chậm. Danh sách cảnh: lời, giây, chữ phủ, chọn hình từ tệp nguồn hoặc Up riêng, prompt hình (thẻ giữ chỗ), lên/xuống/xóa, Thêm cảnh. Cảnh báo: cảnh thiếu hình, thiếu lời, video > 90 giây, cảnh > 15 giây, nhạc chưa ghi giấy phép.
- **Đưa vào lịch** (`ui/09d-vidsched.js`, logic `vidChannels`, `scheduleVideo`, `unscheduleVideo`, `suggestVidDates`, `mockCaption`, `vidCaptionsJob`): nút trên thanh công cụ (mọi video có thành phẩm chưa lên lịch) hoặc trong popup; chọn kênh, ngày (gợi ý mỗi video một ngày chưa có video), giờ. Slot mang video thành phẩm (cùng ảnh bìa, phụ đề), caption theo kênh (YouTube: tiêu đề, #shorts; TikTok: một câu, #xuhuong; Instagram/Facebook: 2 câu và lời mời), nhãn **Short Vid** trên thẻ slot. `vidState(v, S)` thêm SCHEDULED, POSTED.
- Chưa làm (ghi nhận): xuất file video thật; AI nhìn khung hình để mô tả b-roll; gợi ý cắt câu vấp so với kịch bản; kho B-roll dùng chung, SFX; Report gộp số liệu theo video; Export ZIP thêm `videos/*.md`; tên Format trên slot video vẫn là Format kịch bản ngắn của kênh (ví dụ "Reels mẹo ngắn").

## 10.76. Short Vid: popup thẻ Vid bản 1 (16/10/2026, bản 105)
Ráp toàn bộ popup mẫu "bản 1" vào app theo logic và giao diện của bản chính. Quyết định D159–D162.
- **Logic** `src/logic/05u-vidpop.js` (mới) và sửa `05t-videdit.js`: `migrateEdit` nâng dữ liệu cũ (`asset` → `items[]`, `voice: 'self'` bỏ, thêm `fit`, `vol`, `vo`, `ph`, `defDur`, `voAll`, `segs`, `capStale`, `captions.style`, `tpl`, `doneAt`; chạy khi nạp dữ liệu trong `ensureShortVid`). Cảnh: `sceneMin`, `resizeScene` (rolling/ripple), `nudgeScene`, `resetDurations`, `addSceneItems`, `removeSceneItem`, `editSceneItem` (giữ khung cuối / lặp / kéo chậm, trim). VO: `setVoAll`, `clearVoAll`, `setSceneVo`, `clearSceneVo`, `setVoPeaks`, `voLocked`, `voPeaks` (sóng âm giả cho VO AI mô phỏng). Caption: `genCaptions`, `editSeg`, `splitSeg`, `mergeSeg`, `captionAt`. Mẫu: `VID_TEMPLATES` (Theo kịch bản, Hỏi đáp 3 bước, Chữ nhấn ý, Người nói + b-roll), `applyTemplate`, `suggestTemplate` (gợi ý theo Format). Hoàn thành: `editBlockers`, `completeEdit`, `vidEditDone`, `setEditMode`, `editModeOf`. Slot: `weekDays`, `busyCells`, `scheduleCells`. `editCommands` lên version 2 (thêm `popup`, VO, nguồn nhiều hình có `start`/`end`/`whenShort`, caption theo đoạn đã chia).
- **Giao diện** `ui/09-shortvid.js` (popup 3 tab, menu phụ `barHtml`, panes giữ trong DOM để Lưu vẫn ghi mọi ô), `ui/09c-videdit.js` (viết lại: trình biên tập nhúng trong popup, `mountEditor`, xem thử có tiếng, timeline kéo mép/phím mũi tên, sóng âm, hoàn tác bằng ảnh chụp `v.edit`), `ui/09d-vidsched.js` (`slotPaneHtml`, `scheduleSelected`), CSS `.vp-*` trong `style.css` (bỏ `.ve-*`). Bàn dựng mở riêng không còn: Biên tập nằm trong popup.
- **Hành vi cần biết**: mở Biên tập lần đầu tự chia cảnh theo kịch bản (như Bàn dựng cũ); Gen AI cho VO là mô phỏng (xem thử đọc bằng giọng có sẵn của trình duyệt, chưa tạo file); chưa có xuất video thật nên Xếp Slot cần file Up ở Ngoài app; Đưa vào lịch từ thanh công cụ Short Vid (nhiều video) vẫn dùng drawer cũ.
- **Kiểm thử**: logic 127 (thêm 2 test 10.76), UI thay các bước Bàn dựng cũ và thêm khối 10.76. Mock `notes/mau-popup/popup-vid-mau.html` ghi rõ "bản 1".
- Chưa làm: bộ xuất video (ffmpeg qua trình trợ giúp trên PC là phương án nghiêng về; xem `notes/kha-thi-bien-tap-video.md`), chép lời bằng API để caption khớp nhịp giọng thật, Gen AI giọng thật, kiểm khung hẹp trên điện thoại thật.

## 10.77. Short Vid: popup thẻ Vid bản 4 (16/10/2026, bản 106)
Ráp popup mẫu "bản 4" vào app. Quyết định D163–D166.
- **Logic**: `05t-videdit.js` (`migrateEdit` lên `v: 3`: thêm `cues`, `cueSeq`, độ dài `d` cho từng hình, chữ phủ cũ thành cue; `evenSplit`, `setSceneDur`, `itemOffsets`, `ITEM_MIN`; căn từ `sceneWords`, `normWord`, `alignWords`, `sceneWordTimes`, `cueTime`, `rematchCues`; `planEdit` ghi `splitFrom` và duyệt kịch bản; `editCommands` version 3). `05u-vidpop.js` (`resizeItem`; `resizeScene`, `fitTotal`, `resetDurations` theo từng hình; `setSceneVo` đặt cảnh = VO; caption bám giây từng từ khi có VO; kho `VID_ICONS`, `VID_SFX`, `VID_SFX_GROUPS`, `VID_CUE_FX`, `VID_CUE_TEXT_STYLES`, `sfxOf`, `vidLibOf`, `toggleVidFav`; cue `addCue`, `moveCue`, `removeCue`, `editCue`, `cueOf`, `cueLabel`; mẫu dựng thôi tạo chữ phủ). `05s-shortvid.js` (`VID_KEEP_VERSIONS` = 5, `vidVersions`, `useVidVersion`; `writeVidScript` đẩy bản đang có vào `v.history` cùng phần biên tập rồi xóa `v.edit`; sửa tay không tạo bản mới).
- **Giao diện**: `ui/09-shortvid.js` (header có ‹ › và Tạo Kịch bản, bản cũ dựng bản sao chỉ xem `ghostOf`, bảng Phân cảnh sửa lời / mô tả hình ngay, Script thu gọn có báo Chia lại cảnh, sang Biên tập là duyệt). `ui/09c-videdit.js` (thẻ cảnh: ảnh chính, ảnh nhỏ ghi giây và ✕, + Up, Gen ảnh, Nội dung, VO cảnh một hàng, dòng Cue, lấp đầy / âm lượng; timeline có hàng Cue trên hàng hình, vạch kéo giữa các hình; lớp cue trên khung xem thử kéo được; popup Cue Icon / Text / SFX với ★ Yêu thích, Gần đây, Thư viện có tìm và lọc nhóm; tooltip; SFX phát đúng giây khi xem thử; `openGenImage`; chế độ chỉ xem cho bản cũ qua `hooks.view`). CSS `.vp-*` mới trong `style.css`.
- **Kiểm thử**: logic 128 (thêm test 10.77), UI sửa khối 10.72/10.75/10.76 theo giao diện mới và thêm khối 10.77.
- Chưa làm: mốc từng từ thật (TTS có timestamp hoặc Whisper), file SFX thật, xuất file video (WebCodecs trong trình duyệt hoặc Cloudflare Containers + ffmpeg).

## 10.78. Short Vid: sóng VO không tràn khỏi cảnh (16/10/2026, bản 107)
- **Lỗi**: sóng VO có 50–120 vạch, mỗi vạch rộng tối thiểu 1px cộng khe 1px, nên ở cảnh ngắn (ví dụ 7.1s) các vạch tràn sang phía sau, nhìn như VO dài hơn cảnh dù độ dài VO đúng.
- **Sửa**: khung sóng `.vp-wv` cắt gọn (`overflow:hidden`), vạch co theo độ rộng khung (`flex:1 1 0`, không khe cố định). Sửa cả mock. Test UI thêm 1 kiểm tra các vạch nằm trong vùng sóng.

## 10.79. Short Vid: popup thẻ Vid bản 5, hiệu ứng và bố cục Biên tập (16/10/2026, bản 108)
Ráp popup mẫu "bản 5" vào app. Quyết định D167–D170.
- **Logic**: `05t-videdit.js` thêm `VID_TRANS`, `VID_MOTIONS`, `VID_FX_DURS`, `motionTransform`, `autoMotion`, `motionOf`, `autoTransition`, `transOf`, `sceneImgCount`, `sceneVidCount`; dữ liệu `ed.fxTr` / `fxMo` ("auto" hoặc kiểu), `ed.fxDur` (0,3 / 0,5 / 0,8 giây), cảnh `tr`, `mo` (null = theo chung), `sec` (cảnh mở phần mới của mẫu Hỏi đáp); `migrateEdit` bổ sung cho dữ liệu cũ, `editScene` nhận `tr` / `mo`, `setEditOptions` nhận `fxTr` / `fxMo` / `fxDur`, `clearSceneFx` đưa mọi scene về tự động. `editCommands` thêm `effects`, `transitionIn` từng scene, `motion` từng nguồn (video luôn `none`), `popup: 5`. `VID_POPUP_VER` = 5.
- **Giao diện**: `09c-videdit.js` (chip ✦ và cửa sổ `#vp-fxpop` đóng khi bấm ngoài, bấm lại chip, ✕ hoặc Esc; nhóm Hiệu ứng ở Cài đặt; dấu ◆ trên timeline; `fxPaint` chạy chuyển động và chuyển cảnh khi xem thử; thanh thời gian; Replay; đồng bộ Scene và Timeline; xác nhận khi xóa scene và khi Kịch bản gốc dùng `applyTemplate` với mẫu đang chọn), `style.css` (nền xám, scene nền trắng, scene chọn xanh nhạt, nhóm Cài đặt dạng section trắng).
- **Kiểm thử**: logic 129 (thêm 10.79), UI 517 (thêm khối 10.79).
- Chưa làm: xuất file video (hiệu ứng đã ghi trong lệnh dựng để bộ xuất dùng), mốc từng từ thật, TTS tiếng Việt có mốc từ.

## 10.80. Short Vid: tinh chỉnh bố cục Biên tập (16/10/2026, bản 109)
Phát/Replay chỉ icon, Vùng an toàn cùng hàng; vạch cảnh đậm và vạch ảnh mờ trên thanh thời gian; nút Upload/Gen AI in đậm; ô Nội dung bo 12px chữ 13px; ô chọn Cài đặt bo như nút Up nhạc; nền xám nhẹ cho cột Scene, Cài đặt và Timeline. Không đổi dữ liệu. Kiểm thử: logic 129, UI 517.

## 10.81. Short Vid: tab Cài đặt, caption và thư viện (16/10/2026, bản 110)
Giãn khoảng cách Cài đặt. Quản lý caption: Enter tách tại con trỏ, Backspace ở đầu ô gộp lên trên. Frame: thư viện frame 9:16, 4 Yêu thích hiện ngoài. Nhạc nền: thư viện nhạc (tối đa 8 bài đã Up, nghe thử, dùng, xóa), chưa có nhạc có sẵn. Ô Giọng đủ chữ. Kiểm thử: logic 130, UI 521.

## 10.82. Short Vid: chỉnh Phân cảnh và Biên tập (16/10/2026, bản 111)
Bảng Phân cảnh: ô nội dung và mô tả hình rộng đủ ô, bỏ nút Gen ảnh (chỉ mô tả hình hoặc video minh hoạ). Thẻ scene: Upload / Gen AI cùng kiểu chữ với Gen AI của VO cảnh. Popup Cue: ô tìm rộng, bo góc. Timeline: hàng Cue không nền. Kiểm thử: logic 130, UI 521.

## 10.83. Short Vid: Dựng tự động, bản mô phỏng (16/10/2026, bản 112)
Hai cách: dựng cả video (điền scene trống) và gợi ý hình theo từng scene. Khớp theo chữ giữa mô tả hình/lời scene và mô tả đoạn b-roll trong Nguồn vào; clip dài tự cắt khoảng giữa đúng độ dài scene; không đè hình đã có; scene không khớp đánh dấu. Chạy mô phỏng, chưa dùng AI xem hình. Hướng tiếp theo: hồ sơ mô tả `.json` do agent ngoài tạo, đồng bộ qua thư mục Drive, tìm trong kho asset chung. Kiểm thử: logic 131, UI 523.

## 10.84. Short Vid: Vid tự do "thả vào là dựng" (17/10/2026, bản 113)
Thẻ Vid tự do (`origin:'mix'`) có 5 tab: Nạp nguyên liệu, Dàn ý, Kịch bản, Biên tập, Xếp Slot. Nạp tối đa 20 nguồn (16 loại, tự nhận, chỉ đổi loại trong cùng họ), trích thành ô theo luật; Dàn ý chọn và sắp ô; Dựng nhanh đi thẳng tới Biên tập. Cảnh thiếu hình đánh dấu Cần quay và có danh sách quay. Độ dài video 30/60/90 giây hoặc 15–300 giây, mặc định 90 giây (áp cả Vid từ Topic); số chữ = giây × tốc độ đọc, ±15%. Mẫu dựng của người dùng lưu ở `S.vidLib.tpls`. Video dài: Tìm đoạn hay, Làm cả lô, Hoàn thành cả lô, Tự xếp cả lô (cần file video). Tối đa 30 thẻ Vid tự do mỗi tuần. Mô phỏng: trích ô, đọc link, tìm đoạn hay, dịch biến thể, xuất video. Chi tiết: HANDOFF mục 10.84, `notes/ke-hoach-vid-tu-do.md`.

## 10.85. Short Vid: bảng do người dùng dựng (17/10/2026, bản 114)
Màn Short Vid mở ra chỉ có một hàng trống, mọi ô là dấu +. Dấu + ở cột Topic mở hộp chọn Topic của Matrix (chưa dùng) và mục Khác để nạp Topic ngoài; chọn xong, hệ thống tự đề xuất số Vid (tối đa 7) vào các ô, ô còn lại là dấu + tạo Vid Topic. Hàng chưa có Topic: dấu + tạo Vid tự do. Nút Thêm hàng (tối đa 12 hàng) và Bỏ hàng. Header chỉ còn Viết tất cả Vid Topic (đề xuất, duyệt, viết kịch bản cho mọi Topic trong bảng) và Đưa video vào lịch. Dữ liệu: `S.vidRows`. Chi tiết: HANDOFF mục 10.85.

## 10.86. Short Vid: Ren Vid, Kho và Xếp Slot (17/10/2026, bản 115)
Mọi thẻ Vid (Topic và tự do) đi chung một quy trình: Biên tập → Hoàn thành → Ren Vid → tự lưu Kho → Xếp Slot. Ren Vid hiện là bản mô phỏng (video giữ chỗ); biên tập đổi sau khi ren thì video lỗi thời và nút thành Ren lại. Kho nhận thêm video (kèm ảnh bìa, độ dài, thẻ Vid ren). Xếp Slot là bảng Kênh × Ngày đều cột: bấm ô chọn giờ đăng (hộp kèm ảnh nhỏ các bài của kênh trong ngày), bấm ô để sửa, kéo ô trong cùng kênh sang ngày khác rồi xác nhận. Trùng lịch (cùng kênh, cùng ngày, dưới 30 phút) tự đẩy +30 phút kèm cảnh báo. Ren cả hàng, Ren cả lô. Chi tiết: HANDOFF mục 10.86, `notes/phan-tich-ren-vid-xep-slot.md`.

## 10.87. Short Vid: Thumbnail của video và slot video ở Dashboard (17/10/2026, bản 116)
- Tab Cài đặt trong Biên tập có mục **Thumbnail**. Mặc định hệ thống tự sinh (hình cảnh đầu có hình làm nền, tiêu đề ở dưới). Người dùng có thể Tự sinh lại, Chọn cảnh trong video, Up ảnh, lấy từ Store, Gen AI, Cắt về 9:16; mỗi lần là một phiên bản mới, chuyển bằng ‹ ›, xóa được bản đang xem (hết bản thì về ảnh tự sinh). Lưu Store và Tải xuống thumbnail đang dùng.
- Thumbnail đang dùng là **ảnh bìa** của video khi xếp vào Slot; đổi thumbnail thì bìa ở các slot chưa đăng (tuần chưa chốt) đổi theo. Đổi thumbnail không bắt ren lại video.
- Dashboard: slot video không còn nhãn "Không Cột" và "Short Vid". Ô ảnh của slot hiện thumbnail của video, bên cạnh là biểu tượng thước phim (giống icon menu Short Vid).

## 10.88. Tạo lại nội dung khi Topic đã triển khai: quan hệ một chiều có điều kiện (17/10/2026, bản 117)
Phân tích và sơ đồ: `notes/phan-tich-tao-lai-noi-dung.md`, `notes/so-do-tao-lai-noi-dung.html`, phương án người dùng chốt `notes/phuong-an-mot-chieu-co-dieu-kien.md`. Quyết định D171–D175.
- **Ô → Slot**: `slotSrcState` thay `refreshSlotFlags`/`needsUpdate`; dấu "!" (`.src-bang`) trên thẻ slot, hộp "Ô nguồn có bản mới" (Tạo lại theo bản mới / Tắt cảnh báo `dismissSlotSrc`, lưu `s.srcAck`). `slotRegenInfo` / `regenFlow`: cần Matrix khóa, ô đổi thì hỏi lại; ô cũ mất thì chọn ô Đã duyệt khác cùng Cột (`slotRegenCell`). Lịch sử slot 5 bản (`SLOT_KEEP`). Duyệt = khóa (`APPROVED_LOCK`, `unlockSlot`); xóa ô/Topic/Cột giữ bài (`detachSlotSource`, `s.srcGone`). Dữ liệu cũ: bỏ `needsUpdate`, `keepReason`.
- **Kịch bản → Biên tập**: `scriptOpen`, `unlockVidScript`, `SCRIPT_LOCK_MSG` chặn `applyTemplate`, `completeEdit`, `renderBlockers`, `useEditVersion`; `planEdit` (Chia cảnh) tự khóa. `v.editHist` (5 bản, `snapEdit` trước chia lại cảnh, đổi mẫu, dùng bản cũ, lúc Ren; `useEditVersion`); bản kịch bản (`v.history`) không còn chứa phần biên tập, dữ liệu cũ chuyển sang `editHist`. `scriptChanged` / `ackScriptChange` (`ed.splitAck`) cho băng "Kịch bản đã đổi" trong Biên tập; ô "Lịch sử biên tập" ở chân Biên tập. `v.topicVer`, `vidTopicChanged`.
- **Video → Slot video**: `vidOutSig` (tệp + phụ đề), slot ghi `s.vidSig` lúc xếp; `slotSrcState` trả `{kind:'video'}` khi khác; `updateVideoSlot`, `updateVideoSlots`, `vidSlotsPending`; tab Xếp Slot của thẻ báo "N slot đang dùng video cũ". Slot đã đăng, tuần đã chốt không báo/không cập nhật.
- **Kiểm thử**: logic 148 (thêm 3 test 10.88), UI thêm khối 10.88 (16 kiểm tra).

## 10.89. Khóa từng khâu, icon khóa theo trạng thái (17/10/2026, bản 118)
Quyết định D176–D177.
- **Icon**: `icon('lock')` khi đang khóa, `icon('unlock')` khi đang mở: nút Duyệt của slot, Mở khóa slot (Cấu hình, View), nút khóa Kịch bản (`Đã khóa · Mở khóa` / `Khóa Kịch bản`), nút Biên tập (`Hoàn thành` / `Đã khóa · Mở khóa`); Matrix đã đúng từ trước.
- **Kịch bản khóa** (`status APPROVED`): cả vùng Kịch bản (Insight, Độ dài, Phân cảnh, Lời nói, Nguồn vào) chỉ xem; Tạo Kịch bản, Chép lời mờ. Danh sách Cần quay (thẻ Vid tự do) nằm ngoài vùng khóa vì là nạp clip cho cảnh.
- **Cổng từng tab**: `AC.vidStageGate(v)` → `{bt, sl}` kèm lý do; tab mờ kèm tooltip; đang ở tab bị khóa thì quay về Kịch bản.
- **Biên tập khóa**: `AC.editLocked(v)` (= `edit.doneAt`), `AC.unlockEdit`; trình biên tập chỉ xem khi khóa (băng "Kịch bản đã đổi" nhắc Mở khóa để cập nhật); `planEdit` / đổi mẫu mở khóa lại (`doneAt = null`).
- **Matrix khóa**: nút Nạp Topic / Nạp thêm / Nạp lại tất cả, Thêm Cột, × Bớt Cột mờ, tooltip `MATRIX_LOCK_MSG`. Hộp Bớt Cột nói slot giữ bài, tách khỏi ô nguồn.
- Short Vid: nút Thêm hàng cách bảng 16px (`.sv-addrow`).
- **Kiểm thử**: logic 149, UI 653.

## 10.90. Duyệt và khóa Short Vid: Duyệt là lưu bản, Biên tập chỉ trong app (17/10/2026, bản 119)
Quyết định D178–D179. Áp dụng thử cho Short Vid trước; Matrix và Slot làm sau khi cơ chế này ổn.
- **Phiên bản Kịch bản**: `v.apprSnap` = bản đã duyệt gần nhất (kịch bản, lời nhắc, Insight). `approveVidScript` khác `apprSnap` thì đẩy bản đó vào `v.history` (giữ 5 bản) và tăng `verN`; giống thì không thêm bản (`{added}`). `writeVidScript` (Tạo mới) và `useVidVersion` không thêm bản, chỉ nạp vào bản nháp. `vidVersions` trả bản đang dùng kèm `draft`; nháp khác bản đã duyệt mang số kế tiếp. `scriptDraft(v)`. Dữ liệu cũ: thẻ APPROVED chưa có `apprSnap` thì `ensureShortVid` chụp.
- **Tạo mới** (menu Phân cảnh, `sp-write`): viết kịch bản (AI hoặc mô phỏng) rồi `planEdit`; thẻ đề xuất (IDEA) viết thẳng, thành DRAFT. Thẻ "Có kịch bản sẵn" thì Tạo mới = chia lại cảnh; Audio / Người nói giữ Chép lời. `planEdit` không còn tự duyệt kịch bản. Dựng nhanh của thẻ tự do (`mixPlan`, cả lô) vẫn tự duyệt kịch bản vì là đường tắt.
- **Bảng Phân cảnh**: ô Nội dung và Mô tả hình tự cao theo chữ (`.vp-ag`, không kéo giãn).
- **Tự lưu**: gõ ở tab Kịch bản thì tự ghi sau 0,7 giây, đổi ô chọn hoặc rời ô thì ghi ngay, đóng popup thì ghi nốt. Bỏ nút Đóng/Lưu.
- **Biên tập**: bỏ chế độ Ngoài app (`editMode`, ô Up video). `renderBlockers` không còn đòi Hoàn thành; Ren khi Biên tập đã duyệt (vd. Ren cả lô) gắn video vào đúng bản đã duyệt. `completeEdit` = Duyệt Biên tập → `approveEdit`: chặn khi video ren lệch, đặt `doneAt`, `snapEdit` ghi bản `{n, edit, file}` (giống bản trên cùng thì chỉ cập nhật video), `v.editAppr` = bản đã duyệt. `unlockEdit` = Sửa. `cancelEdit` / `canCancelEdit` = Hủy Biên tập: trả `edit`, `file` (và mục Kho cùng mã) về `editAppr`; video ren trong lúc sửa mà bản đã duyệt chưa có video thì bỏ khỏi Kho. `useEditVersion` nạp nội dung + video của bản cũ để sửa. `editSig` chuyển sang 05s. Bỏ `snapEdit` ở chia cảnh, đổi mẫu, Ren.
- **Video thành phẩm**: `AC.vidFinal(v)` = Biên tập đã duyệt và video khớp (hoặc thẻ cũ có video Up). `vidStageGate.sl`, `scheduleGate`, Tự xếp cả lô dùng `vidFinal`. Ô Vid ở màn chính có icon ✓ tròn (`sv-fin`).
- **Giao diện popup**: hàng phiên bản đổi theo tab (`#sp-verw`): Kịch bản `‹ › Duyệt/Sửa Kịch bản` (`sp-slock`/`sp-sunlock`), Biên tập `‹ › Duyệt/Sửa Biên tập` (`ve-done`/`ve-unlock`, xem bản cũ `sp-eold` + Dùng bản này `sp-euse`). Tên tab có icon khóa khi đã duyệt (`sp-lock-ks`, `sp-lock-bt`). Đáy popup: Hủy Biên tập (`sp-ecancel`) chỉ hiện khi đang sửa và đã có bản duyệt. Chân trình biên tập còn Xuất lệnh dựng và Ren Vid (khi đang sửa). Thẻ tự do: "Duyệt Biên tập cả lô".
- **Kiểm thử**: logic 150 (thêm test 10.90), UI 664 (thêm khối 10.90).

## 10.91. Short Vid: sửa giao diện, xóa thẻ Vid, bỏ icon AI (17/10/2026, bản 120)
- Ba nút Kịch bản, Biên tập, Xếp Slot trong popup thẻ Vid giữ kiểu bản 115: số tròn, chữ cùng dòng, cùng chiều cao; khóa thì có icon khóa nhỏ cạnh chữ.
- Ô Topic: bỏ nút Ren cả hàng; tên Topic và Phân tích lại đậm hơn; Bỏ hàng là dấu x ở góc phải phía trên ô.
- Xóa thẻ Vid: thẻ chưa hoàn thành (Biên tập chưa duyệt, chưa có video) có dấu x ở góc phải phía trên ô, bấm và xác nhận là xóa. Thẻ đã hoàn thành không xóa nhanh: mở thẻ, bấm Xóa thẻ cạnh Hủy thẻ. Xóa thẻ chỉ xóa nội dung đã biên tập; video đã ren vẫn ở Kho, slot đã xếp vẫn giữ video.
- Bỏ mọi icon gắn với AI trong app (hình ngôi sao lấp lánh ✦, ✨).

## 10.92. Short Vid: Xếp Slot khóa tới khi Biên tập duyệt, xóa cảnh, Hoàn tác (17/10/2026, bản 121)
- Thẻ Xếp Slot mặc định tắt; chỉ mở khi Biên tập đã Duyệt và có video khớp bản biên tập.
- Bảng Phân cảnh: dấu x ở góc phải phía trên ô STT để xóa cảnh; cảnh dưới tự dồn lên, STT đánh lại. Cảnh đã có hình hoặc VO thì hỏi trước khi xóa. Kịch bản đã duyệt thì không xóa được (bấm Sửa Kịch bản trước); luôn giữ ít nhất một cảnh.
- Nút Hoàn tác bên phải Tạo mới: đưa trạng thái và nội dung các cảnh về đúng như ngay sau lần Tạo mới gần nhất. Tắt khi chưa Tạo mới lần nào hoặc cảnh chưa đổi.

