# PHASE 3 / TASK P3.3 — GOLDEN LESSON `G6-L03` IMPLEMENTATION REPORT (FIX ROUND 1)

**Phase:** Phase 3 / P3.3 ONLY (Fix Round 1)  
**Branch:** `phase3-golden-lesson-review`  
**Base Branch:** `phase2-data-foundation-review`  
**Base Commit:** `8e574b19d3a9d922e3cbbe3af49971b90c9c978e`  
**Canonical Lesson ID:** `G6-L03` (`legacyLessonId: "G6-B3"`)  
**Title:** Bài 3. Thông tin trong máy tính (2 tiết / 90 phút)  
**Spec Reference:** `https://docs.google.com/document/d/1jpTBFuBA9oVB1GE1eC4RtonT-8yXZ5TssBCSRYKr57Q/edit`  
**QA Review Reference:** `https://docs.google.com/document/d/1vls2ZriPZ1MdpkCrtd5LfGFrDGi_9qcW4k9yUl1AWmU/edit`

---

## 1. Mục tiêu và Phạm vi P3.3

Triển khai trọn vẹn **Golden Lesson `G6-L03` (`Bài 3. Thông tin trong máy tính`, 2 tiết / 90 phút)** theo đặc tả P3.1/P3.2 và Data Contract Phase 2 đã được duyệt, đồng thời xây dựng **Reference Renderer cho `G6-L03`** tách rời dữ liệu bài học khỏi HTML shell:

- **Canonical ID:** `G6-L03` (`legacyLessonId = G6-B3`)
- **YCCĐ (CTGDPT 2018):** `G6-A-07`, `G6-A-08`, `G6-A-09`, `G6-A-10`
- **Năng lực cốt lõi Tin học:** `NLa`, `NLc`
- **Năng lực số (`SRC-PHULUC3-TIN6-VIETHOA-2026` / Framework `SRC-TT02-2025-NLS`):** `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`
- **Năng lực AI (QĐ 3439):** `[]` (không bắt buộc tích hợp AI ở Bài 3)
- **Tuân thủ tuyệt đối ranh giới P3.3:** Không merge `main`, không deploy GitHub Pages, không deploy Apps Script, không ghi dữ liệu production, không sửa dữ liệu nền tảng Phase 2 (`38 YCCĐ`, `officialText`, Source Catalog, PPCT, Core Competencies `NLa`–`NLe`, Data Contract, `schemas/*.schema.json`), không xây Phase 5 generic Learning Engine.

---

## 2. Các Cải tiến Trọng tâm trong P3.3 Fix Round 1

### 2.1. `student input required` — Học sinh Tự Nhập Dữ liệu, Không Prefill Đáp án
1. **Hoạt động `G6-L03-A05` (Bảng quy đổi dung lượng):**
   - Render 3 ô nhập liệu thực tế đang để trống (`value=""` khi chưa nộp):
     - `1 KB ≈ [____] byte` (`#ws-kb-byte`)
     - `1 MB ≈ [____] KB` (`#ws-mb-kb`)
     - `1 GB ≈ [____] MB` (`#ws-gb-mb`)
   - Khi bấm nộp, trình duyệt đọc trực tiếp giá trị học sinh đã nhập và truyền vào `submitCapacityWorksheet({ "1KB_in_byte": valueStudentEntered, "1MB_in_KB": valueStudentEntered, "1GB_in_MB": valueStudentEntered })` — tuyệt đối không hard-code đáp án trong handler hay prefill `1000` trong ô input.
   - Nếu học sinh nhập sai hoặc bỏ trống, hệ thống hiển thị phản hồi:
     ```text
     Chưa chính xác.
     Em hãy xem lại thang dung lượng và thử lại.
     ```
     cho phép nhập lại và sử dụng Support Ladder 3 mức (`Em chưa làm được`).
2. **Hoạt động `G6-L03-A06` (`PHIẾU TƯ VẤN LƯU TRỮ` – Sản phẩm 2):**
   - Hiển thị tĩnh tình huống: *"Bạn An cần mang khoảng 6 GB dữ liệu học tập (gồm khoảng 4000 MB video bài giảng và 2000 MB tài liệu, hình ảnh) sang máy tính ở trường."*
   - Toàn bộ phần trả lời của học sinh trong cả `G6-L03.golden.json` lẫn `golden-lesson-renderer.js` đều để trống mặc định (`value=""`):
     - `need`: ô nhập trống
     - `estimatedCapacity`: ô nhập trống (`<input ... value="">`)
     - `selectedDevice`: bộ thẻ radio + `<select>` gồm 5 phương án (`CD 700 MB`, `USB 4 GB`, `USB 16 GB`, `Thẻ nhớ 32 GB`, `Ổ cứng 500 GB`) chưa chọn sẵn phương án nào
     - `reason`: ô nhập văn bản trống để học sinh tự viết lí do
   - Sản phẩm 2 lưu cấu trúc chuẩn: `{ need, estimatedCapacity, selectedDevice, reason }`.

### 2.2. `submission validity != correctness` — Không Tự Gán Full Điểm cho Sản phẩm Mở
1. **Sản phẩm 1 (`G6-L03-PROD-01` tại `A02`):**
   - Hệ thống kiểm tra tự động phần khách quan `bitString` khớp mẫu chữ T trên lưới 4×4 (`1111010001000100`) và kiểm tra học sinh đã nhập câu giải thích `explanationSentence`.
   - Đối với phần câu giải thích mở (`explanationSentence`), do chưa có rubric chấm tự động được duyệt, hệ thống **không tự gán `isCorrect = true` hay `score = 1`**, mà lưu minh chứng với `evaluationStatus = "needs_teacher_review"`, `isCorrect = null`, `score = null`, `maxScore = 1` để giáo viên đánh giá trên Teacher Dashboard V3.
2. **Sản phẩm 2 (`G6-L03-PROD-02` tại `A06`):**
   - Hệ thống kiểm tra tính hợp lệ logic: `estimatedCapacity` hợp lí với nhu cầu ~6 GB, `selectedDevice` có dung lượng đủ chứa (>= 6 GB; từ chối nếu chọn `CD 700 MB` hoặc `USB 4 GB`), và `reason` không rỗng.
   - Sau khi qua bước kiểm tra hợp lệ, hệ thống **không tự gán `isCorrect = true` hay full điểm `score = 2`**, mà lưu minh chứng với `evaluationStatus = "needs_teacher_review"`, `isCorrect = null`, `score = null`, `maxScore = 2` để giáo viên đánh giá.
   - Cả `schemas/evidence.schema.json` và `backend/StudentV2.gs` (`RESPONSES`) + `backend/Teacher.gs` đều hỗ trợ sẵn `isCorrect = null`, `score = null`, `evaluationStatus = "needs_teacher_review"` mà không cần sửa đổi bất kỳ JSON Schema hay Data Contract nào.

### 2.3. `activity evidence gates` — Chặn Hoàn thành Hoạt động Khi Chưa Có Minh chứng (`canCompleteActivity`)
Hàm `canCompleteActivity(activityId)` kiểm tra chặt chẽ minh chứng trước khi cho phép `completeActivity(activityId)` đánh dấu hoàn thành:
- `G6-L03-A01`: bắt buộc đã nộp `G6-L03-Q001`
- `G6-L03-A02`: bắt buộc đã nộp `G6-L03-PROD-01` **VÀ** `G6-L03-Q002`
- `G6-L03-A03`: bắt buộc đã nộp `G6-L03-Q003`
- `G6-L03-A04`: bắt buộc `A01–A03` đã hoàn thành **VÀ** đã nộp `G6-L03-Q004` **VÀ** `G6-L03-Q005`
- `G6-L03-A05`: bắt buộc Tiết 1 đã hoàn thành **VÀ** bảng quy đổi `G6-L03-WS-01` đã làm đúng **VÀ** đã nộp `G6-L03-Q006` **VÀ** `G6-L03-Q007`
- `G6-L03-A06`: bắt buộc Tiết 1 đã hoàn thành **VÀ** đã nộp `G6-L03-PROD-02` (`Phiếu tư vấn lưu trữ`) **VÀ** `G6-L03-Q008` **VÀ** `G6-L03-Q009`
- `G6-L03-A07`: bắt buộc Tiết 1 đã hoàn thành **VÀ** đã nộp `G6-L03-Q010`
- `G6-L03-A08`: bắt buộc Tiết 1 đã hoàn thành **VÀ** đã nộp Exit Ticket hợp lệ

Nếu còn thiếu minh chứng, `completeActivity(activityId)` trả về `blocked = true`, **không** gọi `markActivityCompleted`, và hiển thị danh sách cụ thể các mục còn thiếu (ví dụ: `"Còn thiếu:\n- Phiếu tư vấn lưu trữ\n- Câu Q009"`).

### 2.4. `period 2 locked until checkpoint` — Khóa Tiết 2 Trước Khi Hoàn thành `A01–A04`
- Trước khi cả 4 hoạt động `A01`, `A02`, `A03`, `A04` đều hoàn thành:
  - `Tiết 2 = locked` (`isPeriod2Unlocked() === false`)
  - Hiển thị thông báo: `"Hoàn thành Checkpoint Tiết 1 để mở Tiết 2."`
  - Mọi thao tác bấm sang Tiết 2 (`switchPeriod(2)` hoặc `enterPeriod2Explicitly()`) đều bị chặn và giữ nguyên ở Tiết 1.
- Ngay sau khi hoàn thành `A04`:
  - Tiến độ đạt `50%`, `status = in_progress`, `nextActivityId = G6-L03-A05`, gọi `endLearningSession(false)`, **không** gọi `completeLesson()`.
  - Hiển thị màn hình thông báo cuối Tiết 1:
    ```text
    Em đã hoàn thành Tiết 1.
    Lần sau em sẽ tiếp tục từ Nhiệm vụ A05.
    ```
  - **Không tự động mở nội dung Tiết 2** (`activePeriod` vẫn ở `1`). Chỉ khi học sinh chủ động bấm nút `"Tiếp tục Tiết 2"` mới chuyển sang Tiết 2 tại `A05`.
- Khi học sinh quay lại học tiếp vào tuần sau ở mốc `50%` (`A01–A04` đã hoàn thành):
  - `Tiết 2 unlocked`, tự động mở Tiết 2 và chọn `G6-L03-A05`.

---

## 3. Thiết kế 8 Hoạt động Học tập (2 Tiết / 90 Phút)

| ActivityID | Tiết | Loại | Thời lượng | YCCĐ | Evidence Gate (`canCompleteActivity`) |
|---|---:|---|---:|---|---|
| `G6-L03-A01` | 1 | `opening` | 5 phút | `G6-A-07` | Đã nộp `G6-L03-Q001` |
| `G6-L03-A02` | 1 | `knowledge` | 18 phút | `G6-A-07` | Đã nộp `G6-L03-PROD-01` + `G6-L03-Q002` |
| `G6-L03-A03` | 1 | `knowledge` | 12 phút | `G6-A-08` | Đã nộp `G6-L03-Q003` |
| `G6-L03-A04` | 1 | `reflection` | 10 phút | `G6-A-07`, `G6-A-08` | Đã hoàn thành `A01–A03` + đã nộp `G6-L03-Q004` + `G6-L03-Q005` |
| `G6-L03-A05` | 2 | `knowledge` | 15 phút | `G6-A-09` | Tiết 1 đã xong + bảng quy đổi `G6-L03-WS-01` đúng + đã nộp `G6-L03-Q006` + `G6-L03-Q007` |
| `G6-L03-A06` | 2 | `application` | 20 phút | `G6-A-09`, `G6-A-10` | Tiết 1 đã xong + đã nộp `G6-L03-PROD-02` + `G6-L03-Q008` + `G6-L03-Q009` |
| `G6-L03-A07` | 2 | `application` | 5 phút | `G6-A-10` | Tiết 1 đã xong + đã nộp `G6-L03-Q010` |
| `G6-L03-A08` | 2 | `reflection` | 5 phút | `G6-A-10` | Tiết 1 đã xong + đã nộp Exit Ticket hợp lệ |
