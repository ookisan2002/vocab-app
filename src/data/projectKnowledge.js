/**
 * VocabMaster - Project Knowledge & App Specifications for IELTS AI Tutor
 * 
 * Contains complete knowledge about the application architecture,
 * learning pedagogy, bulk import formats, and operational guides.
 */

export const PROJECT_KNOWLEDGE = `
[THÔNG TIN DỰ ÁN & TRI THỨC HỆ THỐNG VOCABMASTER]:

1. TỔNG QUAN & BẢN CHẤT ỨNG DỤNG:
- Tên ứng dụng: VocabMaster
- Định vị: Ứng dụng học từ vựng IELTS chuyên sâu kết hợp kiểm tra thông minh xen kẽ (Interleaving Quiz) và thuật toán lặp lại ngắt quãng (Spaced Repetition System - SRS).
- Phương pháp khoa học:
  + Xen kẽ (Interleaving): Học một vài từ mới rồi ngay lập tức kiểm tra lại đan xen, giúp tăng cường khả năng khắc sâu trí nhớ dài hạn thay vì học dồn (cramming).
  + Gợi nhớ chủ động 2 chiều (Dual Active Recall): Thẻ trắc nghiệm hỏi cả 2 chiều: Chiều 1 (Tiếng Anh -> Tiếng Việt) và Chiều 2 (Tiếng Việt -> Tiếng Anh).
  + Kho từ gốc: 202 từ vựng học thuật IELTS cốt lõi (Band 6.5 - 8.5) được phân bổ theo 25 chủ đề thiết yếu.

2. QUY CHUẨN ĐỊNH DẠNG NHẬP HÀNG LOẠT (BULK IMPORT FORMAT):
- Cấu trúc nhóm chủ đề: Bắt đầu bằng dòng "### Tên chủ đề" (Ví dụ: ### Environment & Ecology).
- Cấu trúc mỗi dòng từ vựng:
  Từ tiếng Anh — Nghĩa tiếng Việt | Giải nghĩa tiếng Anh | Câu ví dụ ngữ cảnh | Dịch câu ví dụ tiếng Việt
- Ký tự phân cách:
  * Từ tiếng Anh và Nghĩa tiếng Việt: dấu gạch ngang " — " (hỗ trợ cả —, –, -, =, :)
  * Giữa Nghĩa tiếng Việt, Giải nghĩa tiếng Anh, Câu ví dụ ngữ cảnh và Dịch câu ví dụ: dấu gạch đứng " | "
- Ví dụ mẫu chuẩn 100%:
\`\`\`text
### Artificial Intelligence
machine learning — học máy | a branch of AI focused on building applications that learn from data | Machine learning is rapidly transforming healthcare. | Học máy đang nhanh chóng làm thay đổi lĩnh vực chăm sóc sức khỏe.
deep learning — học sâu | a subset of machine learning based on artificial neural networks | Deep learning powers modern voice and facial recognition systems. | Học sâu là nền tảng vận hành các hệ thống nhận diện giọng nói và khuôn mặt hiện đại.
natural language processing — xử lý ngôn ngữ tự nhiên | the ability of a computer program to understand human language | Natural language processing enables virtual assistants like Siri to understand voice commands. | Xử lý ngôn ngữ tự nhiên cho phép các trợ lý ảo như Siri hiểu được các khẩu lệnh bằng giọng nói.
\`\`\`

3. QUY TẮC CỐT LÕI CHO AI KHI TẠO TỪ MỚI (CORE INSTRUCTION FOR VOCABULARY GENERATION):
- Khi người dùng yêu cầu: "tạo từ mới", "gợi ý từ vựng", "tạo format thêm từ vào app", "cho từ để nhập hàng loạt", hoặc bấm nút "📋 Tạo 5 từ theo format thêm vào app":
- BẮT BUỘC: Bạn PHẢI trả về danh sách từ vựng tuân thủ 100% định dạng trên.
- BẮT BUỘC: Đặt toàn bộ danh sách từ đó trong một khối mã Markdown duy nhất (\`\`\`text ... \`\`\`) để người dùng có thể bấm nút "📋 Copy" và dán trực tiếp vào mục "➕ Thêm từ mới -> Nhập hàng loạt" trong app mà không gặp bất kỳ lỗi cú pháp nào.
- Từ vựng phải chuẩn phong cách IELTS Academic (Band 7.0+), câu ví dụ hay, tự nhiên và giàu ngữ cảnh học thuật.

4. HƯỚNG DẪN CHI TIẾT CÁC TÍNH NĂNG & CƠ CHẾ HOẠT ĐỘNG TRONG APP:
- Thẻ Học Từ Mới (Learn Card - Màu xanh tím):
  * Dành cho từ mới tiếp cận (trạng thái "unseen").
  * 2 chế độ hiển thị: Hiện sẵn nghĩa ngay hoặc Chế độ lật thẻ (Flip Card - bấm hoặc nhấn Space để lật xem nghĩa).
  * 2 nút hành động:
    + "Đã hiểu nghĩa • Tiếp tục" (hoặc phím Enter): Đưa từ vào danh sách "Chờ hỏi" (streak 0/2).
    + "Đã thuộc từ này": Chuyển từ thẳng sang "Đã thuộc" và kích hoạt chu kỳ hẹn giờ SRS.
- Thẻ Kiểm Tra Xen Kẽ (Quiz Card - Màu cam vàng):
  * Trắc nghiệm 4 lựa chọn ngẫu nhiên.
  * Kiểm tra 2 chiều: Lần 1 (Streak 0/2: Hỏi từ tiếng Anh -> Chọn nghĩa tiếng Việt), Lần 2 (Streak 1/2: Hỏi nghĩa tiếng Việt -> Chọn từ tiếng Anh).
  * Quy tắc Streak: Trả lời đúng 2 lần liên tiếp (2/2) sẽ trở thành "Đã thuộc" (Mastered). Nếu trả lời sai, streak lập tức bị reset về 0/2 và đưa về ôn lại.
  * Có nút "Tiếp tục câu tiếp theo ➔" (hoặc nhấn Space/Enter) sau khi trả lời, giúp người học đọc kỹ giải thích, không bị nhảy câu đột ngột.
- Cơ chế Tự động Lặp lại ngắt quãng (Spaced Repetition System - SRS):
  * Hệ thống quét ngầm mỗi 3 giây (Background Interval 3s).
  * Khi từ "Đã thuộc" tới hạn thời gian ôn tập (nextReviewAt <= hiện tại), hệ thống tự động đưa từ đó trở lại danh sách "Chờ hỏi" (với streak 1/2) để người học làm bài kiểm tra ôn lại trước khi quên.
  * 3 Chế độ chu kỳ SRS:
    + Chuẩn: 10 phút -> 1 giờ -> 6 giờ -> 1 ngày -> 3 ngày -> 7 ngày (thích hợp học bền vững).
    + Ôn nhanh: 2 phút -> 10 phút -> 30 phút -> 2 giờ -> 6 giờ -> 1 ngày (ôn dồn trong ngày).
    + Test siêu tốc: 15 giây -> 45 giây -> 2 phút -> 5 phút -> 15 phút -> 1 giờ (dành cho kiểm thử hoạt động SRS tức thì).
  * 4 Chế độ tần suất xen kẽ: Hỏi liên tục (2-3 thẻ mới / 1 quiz), Cân bằng (3-4 thẻ / quiz), Thư thả (5-6 thẻ / quiz), Chỉ kiểm tra (toàn quiz).
- Quản lý Dữ liệu & Đồng bộ Đám mây (Cloud Sync):
  * Đăng nhập an toàn bằng tài khoản Google (Google Sign-In Popup qua Firebase Auth).
  * Tự động đồng bộ tiến độ học và từ vựng người dùng tự thêm lên Firestore thời gian thực (đèn xanh báo "Đã đồng bộ Cloud").
  * Hộp thoại xác nhận an toàn trước khi Đăng xuất (tránh mất mát dữ liệu).
  * Tính năng "Đặt lại tiến độ": Đưa toàn bộ điểm số về 0 để học lại từ đầu nhưng BẢO LƯU 100% các từ vựng người dùng tự thêm vào.
  * Cửa sổ Danh sách từ (Vocab List): Cho phép lọc theo trạng thái, tìm kiếm, xem thời gian đếm ngược ôn tập SRS, và nút "Học ngay" / "Hỏi ngay" để ghim từ vào lượt hiển thị kế tiếp.
- Phím Tắt Học Siêu Tốc (Shortcuts):
  * [Space]: Lật thẻ ghi nhớ (ở chế độ Flip Card) hoặc Chuyển sang câu hỏi tiếp theo sau khi trả lời quiz.
  * [Enter]: Tiếp tục chuyển sang thẻ tiếp theo.
  * [1], [2], [3], [4]: Chọn nhanh 4 đáp án trắc nghiệm trên Quiz Card.
  * Hỗ trợ cử chỉ vuốt trái (Swipe Left) trên màn hình điện thoại cảm ứng.
`;
