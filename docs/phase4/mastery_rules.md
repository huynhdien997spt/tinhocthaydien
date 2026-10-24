# QUY TẮC ĐÁNH GIÁ MỨC ĐỘ THÀNH THẠO (MASTERY RULES)
## MÔ HÌNH ĐÁNH GIÁ DỰA TRÊN MINH CHỨNG THEO YÊU CẦU CẦN ĐẠT
### TÀI LIỆU THIẾT KẾ PHASE 4A (P4.2) — DESIGN ONLY / NO ENGINE CODE

> **Mã tài liệu:** `DOC-P4-MASTERY-RULES-01`  
> **Trạng thái:** `PROPOSAL_DESIGN` (Chỉ dùng cho đặc tả thiết kế, chưa triển khai mã nguồn Engine)  
> **Áp dụng cho:** Bài học mẫu `G6-L03` (*Bài 3. Thông tin trong máy tính* — 2 tiết / 90 phút)  
> **Căn cứ nguồn chuẩn:** [requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json), [G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json), [PHASE3_TRACEABILITY_REPORT.md](file:///Users/huynhvandien/tinhocthaydien/PHASE3_TRACEABILITY_REPORT.md).

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE PHILOSOPHY)

1. **Đánh giá theo từng Yêu cầu cần đạt (Requirement-Centered Evaluation):**
   - Mức độ thành thạo (Mastery) được tính toán độc lập cho **từng `RequirementID` riêng biệt** (`G6-A-07`, `G6-A-08`, `G6-A-09`, `G6-A-10`).
   - **TUYỆT ĐỐI KHÔNG ĐƯỢC TÍNH TOÁN BẰNG:**
     - Tỉ lệ hoàn thành bài học (ví dụ: `percentComplete = 100%` chỉ phản ánh việc hoàn thành các bước, không đồng nghĩa với đạt mức thành thạo cao nhất).
     - Tổng điểm trắc nghiệm (ví dụ: `8/10` điểm quiz không thể kết luận học sinh đạt yêu cầu nếu thiếu sản phẩm thực hành bắt buộc).
     - Số lượng hoạt động đã mở hoặc thời gian ngồi trước màn hình.
2. **Minh chứng là căn cứ duy nhất (Evidence-Based Decision):**
   - Không có minh chứng hợp lệ = Không thể cấp mức đạt yêu cầu.
   - Minh chứng phải đa dạng, bao hàm từ nhận thức đến thao tác thực hành và giải thích lập luận.

---

## 2. BỐN MỨC ĐỘ THÀNH THẠO CHUẨN (4 MASTERY LEVELS)

Hệ thống sử dụng biểu tượng trực quan giàu tính sư phạm kết hợp với mã máy chuẩn hóa (Machine Codes) không đổi:

| Biểu tượng sư phạm | Tên gọi chuẩn | Mã máy chuẩn (Machine Code) | Định nghĩa sư phạm | Thông điệp hiển thị cho học sinh (Student-Facing Message) |
|---|---|---|---|---|
| 🌱 | **Chưa đủ minh chứng** | `insufficient_evidence` | Chưa có dữ liệu, thiếu minh chứng bắt buộc của YCCĐ, hoặc minh chứng mâu thuẫn mạnh cần kiểm tra thêm. | *"Mình cần thêm một vài minh chứng để biết em đã hiểu phần này đến đâu."* |
| 🌿 | **Đang hình thành** | `developing` | Đã có minh chứng hợp lệ nhưng chưa ổn định, cần sự trợ giúp đáng kể từ Support Ladder, còn nhầm lẫn nhỏ, hoặc chưa vận dụng được. | *"Em đang tiến bộ rất tốt! Hãy luyện tập thêm một chút để nắm thật vững nhé."* |
| 🌳 | **Đạt yêu cầu** | `meets_requirement` | Hoàn thành đầy đủ mọi minh chứng bắt buộc của YCCĐ; không còn quan niệm sai lầm cốt lõi; minh chứng mở (nếu có) đã được thẩm định đạt. | *"Chúc mừng em đã làm chủ trọn vẹn mục tiêu học tập này!"* |
| 🚀 | **Vận dụng mở rộng** | `transfer_extension` | Đã đạt mức 🌳 VÀ tạo ra minh chứng chuyển giao (transfer evidence) trong tình huống thực tế mới; giải thích lập luận sâu sắc được giáo viên phê duyệt. | *"Xuất sắc! Em đã biết vận dụng kiến thức linh hoạt vào các tình huống thực tế mới."* |

---

## 3. PHÂN TẦNG MINH CHỨNG (EVIDENCE HIERARCHY)

Không phải mọi minh chứng đều có trọng số và vai trò như nhau. Hệ thống chia thành 4 nhóm minh chứng:

```mermaid
graph TD
    subgraph K["1. Minh chứng Kiến thức (Knowledge Evidence)"]
        K1["quiz_response (Trắc nghiệm khách quan)"]
        K2["short_answer (Điền khuyết / trả lời ngắn)"]
    end
    subgraph P["2. Minh chứng Thao tác (Performance Evidence)"]
        P1["worksheet_table (Bảng quy đổi dung lượng A05)"]
        P2["simulation / device_inspection (Thao tác kiểm tra A07)"]
    end
    subgraph PR["3. Minh chứng Sản phẩm (Product Evidence)"]
        PR1["pixel_grid_product (Sản phẩm 1: Lưới bit 4×4 A02)"]
        PR2["storage_advisory_product (Sản phẩm 2: Phiếu tư vấn A06)"]
    end
    subgraph R["4. Minh chứng Phản ánh (Reflection Evidence)"]
        R1["exit_ticket_reflection (Phiếu Exit Ticket A08)"]
        R2["self_explanation (Câu giải thích tự luận)"]
    end
    
    K --> BASE["Xác nhận nhận thức cơ bản (Điều kiện cần cho 🌿/🌳)"]
    P --> CORE["Xác nhận kỹ năng thao tác (Bắt buộc cho 🌳)"]
    PR --> TEACHER["Đánh giá lập luận & giải quyết vấn đề (Cần Teacher Review cho 🌳/🚀)"]
    R --> EXT["Xác nhận mức độ hiểu sâu & chuyển giao (Điều kiện cho 🚀)"]
```

1. **Minh chứng Kiến thức (Knowledge Evidence):**
   - Vai trò: Kiểm tra khả năng nhận biết khái niệm, ghi nhớ thuật ngữ, định danh các thành phần.
   - Mức tối đa có thể đạt độc lập: **🌿 Đang hình thành**. Một câu trắc nghiệm đơn lẻ không bao giờ đủ để cấp 🌳 Đạt yêu cầu nếu YCCĐ đó yêu cầu năng lực giải thích hoặc vận dụng.
2. **Minh chứng Thao tác (Performance Evidence):**
   - Vai trò: Chứng minh học sinh biết thực hiện hành vi cụ thể (tự nhập số quy đổi gần đúng, thao tác nhấp chuột kiểm tra dung lượng ổ đĩa).
   - Là điều kiện tiên quyết cho mức **🌳 Đạt yêu cầu** ở các YCCĐ thực hành (`G6-A-09`, `G6-A-10`).
3. **Minh chứng Sản phẩm (Product Evidence):**
   - Vai trò: Minh chứng chất lượng cao nhất về năng lực tích hợp của học sinh (Sản phẩm 1 biểu diễn bit; Sản phẩm 2 tư vấn lưu trữ).
   - Bắt buộc phải qua cơ chế thẩm định giáo viên (Teacher Review) nếu chứa phần lập luận tự luận mở.
4. **Minh chứng Phản ánh (Reflection Evidence):**
   - Vai trò: Ghi nhận khả năng tự đánh giá mức độ hiểu, tự nhận diện điểm chưa rõ và đề xuất giải pháp cho tình huống mở (Exit Ticket 6 GB).
   - Là căn cứ cốt lõi để nâng cấp từ **🌳 Đạt yêu cầu** lên **🚀 Vận dụng mở rộng**.

---

## 4. NGUYÊN TẮC RA QUYẾT ĐỊNH THÀNH THẠO (DECISION PRINCIPLES)

### 4.1. Giới hạn của Hoạt động Chẩn đoán (Diagnostic Limitation)
- Kết quả từ hoạt động "Khám phá điểm xuất phát" (Phase 4.1) **TUYỆT ĐỐI KHÔNG ĐƯỢC** trực tiếp quyết định mức `🌳 Đạt yêu cầu` hay `🚀 Vận dụng mở rộng`.
- Diagnostic chỉ tạo ra:
  - Trạng thái minh chứng giả định ban đầu (`tentative evidence state`).
  - Gợi ý cấu hình lộ trình học tập (`learning path profile`).
  - Dự báo vùng cần can thiệp sư phạm.

### 4.2. Xử lý câu trả lời mở và thẩm định của giáo viên (Open Response Policy)
- Khi học sinh nộp sản phẩm có phần tự luận giải thích mở (Sản phẩm 1 ở A02, Sản phẩm 2 ở A06):
  - Bản ghi minh chứng được lưu trữ với:
    ```json
    {
      "evaluationStatus": "needs_teacher_review",
      "isCorrect": null,
      "score": null
    }
    ```
  - **Quy tắc chặn tự động (Auto-award prohibition):** Hệ thống không được phép tự động gán `isCorrect = true` hay full điểm cho câu trả lời tự luận mở chỉ vì học sinh điền đủ ký tự.
  - **Điều kiện đạt 🌳 hoặc 🚀:** Nếu một YCCĐ đòi hỏi năng lực giải thích hoặc lập luận (như `G6-A-07` và `G6-A-10`), học sinh chỉ có thể được chốt mức `🌳 Đạt yêu cầu` hoặc `🚀 Vận dụng mở rộng` sau khi giáo viên đã xem xét và chấp thuận minh chứng mở này trong Teacher Mode.

### 4.3. Xử lý nhiều lần thử và thang hỗ trợ (Multiple Attempts & Support Ladder)
- Hệ thống không đánh giá học sinh chỉ dựa trên lần thử đầu tiên (First attempt bias), cũng không chỉ lấy điểm cao nhất duy nhất (Best score illusion).
- Dữ liệu lịch sử lần thử được lưu trữ đầy đủ:
  - Số lần thử (`attemptNumber`).
  - Các nấc hỗ trợ đã sử dụng (`supportTierUsed: 1, 2, 3`).
  - Quỹ đạo sửa sai (Error resolution trajectory).
- **Quy tắc phân cấp:**
  - Nếu học sinh trả lời đúng ngay lần đầu hoặc lần 2 với gợi ý nhỏ (Tier 1): Đủ điều kiện xét **🌳 Đạt yêu cầu**.
  - Nếu học sinh phải dùng đến gợi ý chi tiết (Tier 3: Xem bài mẫu tương tự) mới làm đúng: Tạm thời xếp ở mức **🌿 Đang hình thành**, cần thêm 1 câu hỏi kiểm tra độ ổn định độc lập để xét 🌳.

### 4.4. Xử lý minh chứng mâu thuẫn (Conflicting Evidence Policy)
- Trường hợp học sinh trả lời đúng câu hỏi trắc nghiệm nhưng sản phẩm thực hành hoặc câu giải thích tự luận lại bộc lộ hiểu sai bản chất:
  - Hệ thống ghi nhận cờ **`conflicting_evidence`**.
  - **TUYỆT ĐỐI KHÔNG CẤP 🌳 ĐẠT YÊU CẦU**.
  - Trạng thái được giữ ở mức **🌿 Đang hình thành** và gửi thông báo `REVIEW_REQUIRED` lên bảng điều khiển của giáo viên.

---

## 5. VÍ DỤ MINH CHỨNG CỤ THỂ CHO BÀI 3 (`G6-L03`)

### 5.1. YCCĐ `G6-A-07`: *Giải thích được có thể biểu diễn thông tin chỉ với hai kí hiệu 0 và 1.*
- **Minh chứng yêu cầu:**
  - Sản phẩm 1 (`G6-L03-PROD-01`): Lưới bit 4×4 tạo thành chữ T (1111 0100 0100 0100) + Câu giải thích số 0 đại diện cho ô trắng và số 1 đại diện cho ô được tô màu.
  - Câu hỏi nhận thức: `G6-L03-Q001`, `G6-L03-Q002`, `G6-L03-Q004`.
- **Phân loại 4 mức:**
  - 🌱 **Chưa đủ minh chứng:** Chưa thao tác trên lưới bit, hoặc chuỗi bit không khớp hình vẽ và bỏ trống câu giải thích.
  - 🌿 **Đang hình thành:** Tạo được hình chữ T nhưng câu giải thích chỉ viết chung chung "đây là chữ T" mà không nêu được vai trò của 0 và 1; hoặc trả lời sai câu hỏi Q002 về nguyên lý biểu diễn.
  - 🌳 **Đạt yêu cầu:** Tạo đúng chuỗi 16 bit chữ T; viết được câu giải thích rõ ràng "Số 0 biểu diễn ô không tô màu và số 1 biểu diễn ô được tô màu trên lưới"; trả lời đúng Q001, Q002, Q004; giáo viên thẩm định đạt Sản phẩm 1.
  - 🚀 **Vận dụng mở rộng:** Đạt mức 🌳 VÀ giải thích được cách mở rộng biểu diễn: ví dụ tự mã hóa thêm một chữ cái khác (chữ H, chữ L) bằng ma trận bit, hoặc giải thích được nguyên lý biểu diễn ảnh đen trắng có kích thước lớn hơn trong thực tế.

---

### 5.2. YCCĐ `G6-A-08`: *Biết được bit là đơn vị nhỏ nhất trong lưu trữ thông tin.*
- **Minh chứng yêu cầu:**
  - Câu hỏi nhận thức: `G6-L03-Q003`, `G6-L03-Q005`.
  - Sự nhất quán trong giải thích Sản phẩm 1.
- **Phân loại 4 mức:**
  - 🌱 **Chưa đủ minh chứng:** Bỏ qua câu hỏi hoặc chọn nhầm Byte/MB là đơn vị nhỏ nhất.
  - 🌿 **Đang hình thành:** Nhận biết bit nhận giá trị 0 hoặc 1 nhưng còn lúng túng khi so sánh kích thước giữa bit và Byte (ví dụ nhầm 1 bit = 8 byte).
  - 🌳 **Đạt yêu cầu:** Trả lời chính xác và nhất quán trong cả Q003 và Q005 rằng bit là đơn vị nhỏ nhất trong lưu trữ thông tin, mỗi bit chỉ nhận một trong hai trạng thái 0 hoặc 1.
  - 🚀 **Vận dụng mở rộng:** Đạt mức 🌳 VÀ liên hệ được vì sao bit là đơn vị nhỏ nhất với cơ chế vật lý của thiết bị điện tử (trạng thái đóng/ngắt công tắc điện, có/không có điện tích).

---

### 5.3. YCCĐ `G6-A-09`: *Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) của các đơn vị cơ bản đo dung lượng thông tin: Byte, KB, MB, GB, quy đổi được một cách gần đúng giữa các đơn vị đo lường này.*
> **Quy tắc bất biến:** Không được công nhận 🌳 chỉ vì học sinh nhớ vẹt tên các chữ viết tắt KB, MB, GB. Bắt buộc phải có minh chứng đầy đủ về cả 3 vế: **(1) Tên đơn vị**, **(2) Độ lớn xấp xỉ hệ thập phân**, và **(3) Quy đổi gần đúng**.
- **Minh chứng yêu cầu:**
  - Bảng quy đổi dung lượng (`G6-L03-WS-01`): Học sinh tự gõ số vào 3 ô: `1 KB ≈ 1000 byte`, `1 MB ≈ 1000 KB`, `1 GB ≈ 1000 MB`.
  - Câu hỏi nhận thức & tính toán: `G6-L03-Q006`, `G6-L03-Q007`, `G6-L03-Q008`.
  - Bước ước lượng dung lượng trong Sản phẩm 2 (`G6-L03-PROD-02`).
- **Phân loại 4 mức:**
  - 🌱 **Chưa đủ minh chứng:** Bảng quy đổi A05 chưa làm hoặc để trống các câu hỏi tính toán.
  - 🌿 **Đang hình thành:** Kể được tên Byte, KB, MB, GB nhưng điền sai bảng quy đổi (ví dụ gõ 100 hoặc nhầm lẫn giữa KB và MB); hoặc chỉ nhớ số 1000 nhưng không biết áp dụng tính toán tổng dung lượng ở Q007.
  - 🌳 **Đạt yêu cầu:** Điền đúng cả 3 ô quy đổi hệ thập phân (1000); tính toán đúng quy đổi 3 xấp văn bản thành xấp xỉ 3000 KB ở Q007; nhận biết đúng thứ tự sắp xếp độ lớn các đơn vị từ nhỏ đến lớn (Byte < KB < MB < GB).
  - 🚀 **Vận dụng mở rộng:** Đạt mức 🌳 VÀ quy đổi thành thạo trong các bài toán thực tiễn phức hợp (ví dụ: tính toán xem một USB 16 GB có thể chứa xấp xỉ bao nhiêu bức ảnh 4 MB hoặc bao nhiêu video ngắn 500 MB).

---

### 5.4. YCCĐ `G6-A-10`: *Nêu được sơ lược khả năng lưu trữ của các thiết bị nhớ thông dụng như đĩa cứng, USB, CD, thẻ nhớ,...*
- **Minh chứng yêu cầu:**
  - Sản phẩm 2 (`G6-L03-PROD-02`): Phiếu tư vấn lưu trữ gồm 4 trường (Nhu cầu, Dung lượng ước lượng ~6 GB, Thiết bị lựa chọn, Lí do lựa chọn logic).
  - Khám phá thiết bị nhớ (`G6-L03-A07`): Hoàn thành thao tác xem dung lượng ổ đĩa qua chế độ `REAL_DEVICE` hoặc `SIMULATION` + câu hỏi `G6-L03-Q010`.
  - Phiếu Exit Ticket (`G6-L03-A08`): Câu hỏi vận dụng thực tế phương án lưu 6 GB dữ liệu.
- **Phân loại 4 mức:**
  - 🌱 **Chưa đủ minh chứng:** Chưa nộp Sản phẩm 2 hoặc chưa hoàn thành câu hỏi Q010.
  - 🌿 **Đang hình thành:** Kể được tên các thiết bị nhưng chọn phương án dung lượng không hợp lí (ví dụ: chọn CD 700 MB hoặc USB 4 GB để mang 6 GB dữ liệu); lý do lập luận sơ sài không căn cứ vào dung lượng.
  - 🌳 **Đạt yêu cầu:** Hoàn thành Sản phẩm 2 chọn đúng thiết bị có dung lượng lớn hơn 6 GB (USB 16 GB, Thẻ nhớ 32 GB, Ổ cứng 500 GB) với lập luận logic (16 GB > 6 GB và nhỏ gọn dễ mang đến trường); thực hiện đúng thao tác đọc dung lượng ở A07; giáo viên thẩm định duyệt đạt Sản phẩm 2.
  - 🚀 **Vận dụng mở rộng:** Đạt mức 🌳 VÀ đưa ra giải pháp tư vấn đa chiều trong câu hỏi Exit Ticket: So sánh được ưu nhược điểm giữa các phương án (ví dụ: chọn USB 16 GB vì tính di động hàng ngày, nhưng đề xuất dùng thêm Ổ cứng ngoài để sao lưu dài hạn tại nhà).

---

## 6. BẢNG MA TRẬN QUY TẮC ĐÁNH GIÁ (MASTER RULE TABLE)

Bảng quy chuẩn logic quyết định mức độ thành thạo cho 4 YCCĐ của Bài học mẫu `G6-L03`:

| RequirementID | RequiredEvidence (Minh chứng bắt buộc) | SupportingEvidence (Minh chứng bổ trợ) | TeacherReviewRequired (Bắt buộc GV duyệt) | InsufficientRule (🌱 Chưa đủ minh chứng) | DevelopingRule (🌿 Đang hình thành) | MeetsRule (🌳 Đạt yêu cầu) | ExtensionRule (🚀 Vận dụng mở rộng) | ConflictRule (Quy tắc xử lý mâu thuẫn) |
|---|---|---|:---:|---|---|---|---|---|
| **`G6-A-07`** *(Biểu diễn 0 và 1)* | `G6-L03-PROD-01`, `G6-L03-Q001`, `G6-L03-Q002` | `G6-L03-Q004`, Diagnostic Probe 6 | **CÓ** (Duyệt Sản phẩm 1) | Thiếu PROD-01 hoặc Q001/Q002 chưa làm. | Chuỗi bit đúng nhưng giải thích 0/1 chưa rõ, hoặc cần gợi ý Tier 2/3. | PROD-01 chuỗi bit chuẩn + câu giải thích đúng + Q001/Q002 đúng + GV duyệt đạt. | Đạt 🌳 + biểu diễn được ký tự mới hoặc giải thích mở rộng ảnh số. | Q001 đúng nhưng PROD-01 vẽ sai hoặc giải thích sai -> Giữ ở 🌿, gắn cờ `REVIEW_REQUIRED`. |
| **`G6-A-08`** *(Bit là đơn vị nhỏ nhất)* | `G6-L03-Q003`, `G6-L03-Q005` | PROD-01 bit logic, Diagnostic Probe 6 | **KHÔNG** (Trắc nghiệm khách quan) | Thiếu cả Q003 và Q005. | Đúng 1 trong 2 câu nhưng còn phân vân, cần thử lại lần 2. | Đúng cả Q003 và Q005 khẳng định bit là đơn vị nhỏ nhất. | Đạt 🌳 + giải thích được mối liên hệ giữa bit và trạng thái vật lý thiết bị. | Q003 chọn bit nhưng Q005 lại chọn Byte -> Giữ ở 🌿. |
| **`G6-A-09`** *(Tên, độ lớn xấp xỉ & quy đổi Byte/KB/MB/GB)* | `G6-L03-WS-01`, `G6-L03-Q006`, `G6-L03-Q007` | `G6-L03-Q008`, Diagnostic Probe 7 | **KHÔNG** (Tự động chấm theo bảng số) | Bảng WS-01 chưa điền hoặc sai cả 3 ô. | Thuộc tên đơn vị nhưng quy đổi sai bảng WS-01, hoặc tính toán Q007 sai. | WS-01 điền đúng 1000 cả 3 ô + Q006/Q007 đúng + nắm vững thứ tự độ lớn. | Đạt 🌳 + giải quyết bài toán quy đổi đa bước trong tình huống thực tế. | Thuộc vẹt thứ tự độ lớn ở Q006 nhưng tính toán quy đổi sai ở Q007 -> Giữ ở 🌿. |
| **`G6-A-10`** *(Khả năng lưu trữ thiết bị nhớ)* | `G6-L03-PROD-02`, `G6-L03-A07` (Q010), `G6-L03-A08` (Exit Ticket) | `G6-L03-Q009`, Diagnostic Probe 8 | **CÓ** (Duyệt Sản phẩm 2) | Thiếu PROD-02 hoặc chưa nộp Exit Ticket. | Chọn thiết bị dung lượng nhỏ hơn nhu cầu (< 6 GB), hoặc lý do không logic. | PROD-02 chọn đúng thiết bị ≥ 6 GB kèm lý do logic + Q010 đúng + GV duyệt đạt. | Đạt 🌳 + so sánh toàn diện ưu nhược điểm các thiết bị trong Exit Ticket. | Q009 chọn đúng USB nhưng PROD-02 lại chọn CD 700 MB cho 6 GB -> Giữ ở 🌿. |

---

## 7. BẢNG TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CHECKLIST P4.2)

| Tiêu chí | Mô tả yêu cầu | Trạng thái đạt được |
|---|---|---|
| **Đánh giá theo RequirementID** | Không dùng lesson percent hay quiz total score; tính toán độc lập cho `G6-A-07`..`10`. | **ĐẠT (PASS)** |
| **Đủ 4 mức độ chuẩn** | Có đủ 🌱 `insufficient_evidence`, 🌿 `developing`, 🌳 `meets_requirement`, 🚀 `transfer_extension`. | **ĐẠT (PASS)** |
| **Diagnostic không auto-mastery** | Diagnostic không bao giờ cấp mức 🌳 hay 🚀. | **ĐẠT (PASS)** |
| **Thẩm định minh chứng mở** | Sản phẩm mở có `needs_teacher_review` bắt buộc phải qua giáo viên phê duyệt mới được cấp 🌳/🚀. | **ĐẠT (PASS)** |
| **Xử lý minh chứng mâu thuẫn** | Có quy tắc `ConflictRule` ngăn chặn cấp 🌳 khi trắc nghiệm đúng nhưng thực hành/tự luận sai. | **ĐẠT (PASS)** |
| **Đánh giá nhiều lần thử** | Ghi nhận số lần thử và nấc hỗ trợ đã dùng, không chỉ lấy điểm lần đầu hay điểm cao nhất duy nhất. | **ĐẠT (PASS)** |
| **Mức 🚀 đòi hỏi Transfer Evidence** | Mức Vận dụng mở rộng bắt buộc phải có minh chứng chuyển giao thực tiễn, không cấp vì điểm cao hay làm nhanh. | **ĐẠT (PASS)** |
| **Ví dụ chi tiết cho Bài 3** | Viết kịch bản minh chứng cụ thể cho cả 4 YCCĐ `G6-A-07` đến `G6-A-10` của `G6-L03`. | **ĐẠT (PASS)** |
