# PHASE 3 / TASK P3.3 — GOLDEN LESSON `G6-L03` IMPLEMENTATION REPORT

**Phase:** Phase 3 / P3.3 ONLY  
**Branch:** `phase3-golden-lesson-review`  
**Base Branch:** `phase2-data-foundation-review`  
**Base Commit:** `8e574b19d3a9d922e3cbbe3af49971b90c9c978e`  
**Canonical Lesson ID:** `G6-L03` (`legacyLessonId: "G6-B3"`)  
**Title:** Bài 3. Thông tin trong máy tính (2 tiết / 90 phút)  
**Spec Reference:** `https://docs.google.com/document/d/1jpTBFuBA9oVB1GE1eC4RtonT-8yXZ5TssBCSRYKr57Q/edit`

---

## 1. Mục tiêu và Phạm vi P3.3

Triển khai trọn vẹn **Golden Lesson `G6-L03` (`Bài 3. Thông tin trong máy tính`, 2 tiết / 90 phút)** theo đặc tả P3.1/P3.2 và Data Contract Phase 2 đã được duyệt, đồng thời xây dựng **Reference Renderer cho `G6-L03`** tách rời dữ liệu bài học khỏi HTML shell:

- **Canonical ID:** `G6-L03` (`legacyLessonId = G6-B3`)
- **YCCĐ (CTGDPT 2018):** `G6-A-07`, `G6-A-08`, `G6-A-09`, `G6-A-10`
- **Năng lực cốt lõi Tin học:** `NLa`, `NLc`, `NLe`
- **Năng lực số (CV 3456 Phụ lục III / TT 02/2025):** `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`
- **Năng lực AI (QĐ 3439):** `[]` (không bắt buộc tích hợp AI ở Bài 3)
- **Tuân thủ tuyệt đối ranh giới P3.3:** Không merge `main`, không deploy GitHub Pages, không deploy Apps Script, không ghi dữ liệu production, không sửa dữ liệu nền tảng Phase 2 (`38 YCCĐ`, `officialText`, Source Catalog, PPCT, Core Competencies `NLa`–`NLe`, Data Contract, `schemas/*.schema.json`), không xây Phase 5 generic Learning Engine.

---

## 2. Nâng cấp `data/lessons/G6-L03.golden.json` từ Fixture lên Production Golden Lesson

File `data/lessons/G6-L03.golden.json` (và bản đồng bộ trong `data/lessons/lessons-g6-ppct.json`) đã được nâng cấp từ fixture mẫu Phase 2 thành **Production Golden Lesson**:

1. **Xóa toàn bộ cờ và dữ liệu fixture trong dữ liệu bài học:**
   - Đã loại bỏ `fixtureMetadata`, `isFixtureOnly`, `fixtureNote`, tiền tố `[Fixture]`, `approvedForProductionUI = false`, và dữ liệu học sinh giả lập (`STD-FIXTURE-SAMPLE-001`).
   - Dữ liệu mẫu `evidences` và `masteryRules` phục vụ regression test Phase 2 đã được tách sang `tools/curriculum/fixtures/p2-sample-evidences-mastery.fixture.json`.
2. **Cấu trúc đầy đủ của `data/lessons/G6-L03.golden.json`:**
   - `lesson`: Metadata chuẩn `G6-L03`, `legacyLessonId = "G6-B3"`, `periods = 2`, `durationMinutes = 90`, `periodAllocation` (Tiết 1 = `A01..A04` / 45 phút; Tiết 2 = `A05..A08` / 45 phút), `completionRule` đồng bộ frontend/backend, `reviewStatus = "approved"`, `status = "published"`.
   - `activities`: Đúng **8 hoạt động bắt buộc** (`G6-L03-A01` đến `G6-L03-A08`), mỗi hoạt động đều có `requirementIds` và `expectedEvidenceTypes` không rỗng.
   - `questions`: Đúng **10 câu hỏi đánh giá** (`G6-L03-Q001` đến `G6-L03-Q010`), mỗi câu gắn đúng 1 `requirementId`, có `explanation` sư phạm, không lộ đáp án trước lần thử đầu và cho phép làm lại khi sai (`retryAllowed = true`).
   - `resources`: 2 học liệu (`RES-G6-L03-01`, `RES-G6-L03-02`) đã duyệt.
   - `goldenLessonBlueprint`: Đặc tả chi tiết cho Reference Renderer (Pixel-to-Bit Lab 4×4, Checkpoint Tiết 1, Thang dung lượng xấp xỉ thập phân CTGDPT, WebQuest 5 bước + Sản phẩm 2, Thực hành dung lượng 2 chế độ `REAL_DEVICE` / `SIMULATION`, Exit Ticket bắt buộc, và hỗ trợ 3 mức `"Em chưa làm được"` tại `A02`, `A05`, `A06`).

---

## 3. Thiết kế 8 Hoạt động Học tập (2 Tiết / 90 Phút)

### Tiết 1 — Biểu diễn thông tin & Đơn vị Bit (45 phút: 5 + 18 + 12 + 10)

| ActivityID | Loại | Thời lượng | YCCĐ | Evidence Types | Nội dung & Sản phẩm học tập |
|---|---|---:|---|---|---|
| `G6-L03-A01` | `opening` | 5 phút | `G6-A-07` | `quiz_response` | **Khởi động: Thử thách 0–1** – Tình huống bóng đèn chỉ có `Tắt (0)` / `Bật (1)`, câu hỏi `G6-L03-Q001`. |
| `G6-L03-A02` | `knowledge` | 18 phút | `G6-A-07` | `short_answer` | **Phòng thí nghiệm Pixel → Bit** – Lưới 4×4 tương tác chạm/nhấp (mobile-compatible: `ô trắng = 0`, `ô tô = 1`), tự sinh chuỗi 16 kí tự `0`/`1`, **Sản phẩm 1 (`G6-L03-PROD-01`)**: chuỗi bit + câu giải thích `0` và `1` biểu diễn điều gì, câu hỏi `G6-L03-Q002`, hỗ trợ 3 mức `"Em chưa làm được"`. |
| `G6-L03-A03` | `knowledge` | 12 phút | `G6-A-08` | `quiz_response` | **Khám phá: Bit là gì?** – Khái niệm chuẩn CTGDPT (`bit là đơn vị nhỏ nhất trong lưu trữ thông tin`), hộp mở rộng `supplementaryKnowledge` (`1 Byte = 8 bit`), câu hỏi `G6-L03-Q003`. |
| `G6-L03-A04` | `reflection` | 10 phút | `G6-A-07`, `G6-A-08` | `quiz_response`, `short_answer` | **Checkpoint cuối Tiết 1** – Câu hỏi `G6-L03-Q004` (`G6-A-07`) và `G6-L03-Q005` (`G6-A-08`). Khi hoàn thành `A01–A04`: `percentComplete = 50`, `status = in_progress`, `nextActivityId = G6-L03-A05`, gọi `endLearningSession(false)`, **không** gọi `completeLesson()`, hiển thị thông báo dừng cuối Tiết 1 và không tự nhảy sang Tiết 2. |

### Tiết 2 — Thang dung lượng, WebQuest & Vận dụng thực tế (45 phút: 15 + 20 + 5 + 5)

| ActivityID | Loại | Thời lượng | YCCĐ | Evidence Types | Nội dung & Sản phẩm học tập |
|---|---|---:|---|---|---|
| `G6-L03-A05` | `knowledge` | 15 phút | `G6-A-09` | `worksheet_table`, `quiz_response` | **Khám phá: Thang dung lượng thông tin** – 4 đơn vị bắt buộc `Byte`, `KB`, `MB`, `GB` theo quy ước xấp xỉ thập phân CTGDPT (`1 KB ≈ 1000 byte`, `1 MB ≈ 1000 KB`, `1 GB ≈ 1000 MB`, không bắt buộc `1024`; `TB` để ở hộp `supplementaryKnowledge`), bảng sắp xếp thứ tự + `G6-L03-Q006`, `G6-L03-Q007`, hỗ trợ 3 mức `"Em chưa làm được"`. |
| `G6-L03-A06` | `application` | 20 phút | `G6-A-09`, `G6-A-10` | `worksheet_table`, `quiz_response` | **WebQuest “Cứu bộ nhớ”** – Tích hợp NLS `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b` qua quy trình 5 bước, lập **Sản phẩm 2 (`G6-L03-PROD-02` – `PHIẾU TƯ VẤN LƯU TRỮ`)** gồm 4 trường (`Nhu cầu`, `Dung lượng ước lượng`, `Thiết bị chọn`, `Lí do`), câu hỏi `G6-L03-Q008`, `G6-L03-Q009`, hỗ trợ 3 mức `"Em chưa làm được"`. |
| `G6-L03-A07` | `application` | 5 phút | `G6-A-10` | `quiz_response` | **Thực hành nhanh trên thiết bị đang dùng** – Hỗ trợ 2 chế độ `REAL_DEVICE` (nhập dung lượng máy đang dùng) và `SIMULATION` (thẻ thông số giả lập máy phòng Tin học / điện thoại / máy tính bảng để học sinh không bị chặn bởi quyền hệ điều hành), câu hỏi `G6-L03-Q010`. |
| `G6-L03-A08` | `reflection` | 5 phút | `G6-A-10` | `exit_ticket_reflection` | **Nhìn lại & Exit Ticket cuối bài** – 5 trường bắt buộc (`understandingLevel`, `keyLearning`, `stillConfused`, `applicationAnswer` cho câu hỏi *"Nếu em cần lưu khoảng 6 GB dữ liệu, em sẽ chọn thiết bị nào và vì sao?"*, `selfAssessment`). Chỉ sau khi hoàn tất `A01–A08` và nộp Exit Ticket mới gọi `completeLesson()`. |

---

## 4. Kiến trúc Shell UI & Reference Renderer (`golden-lesson-renderer.js`)

1. **Shell HTML thuần (`lessons/grade6/bai3/index.html`):**
   - Không còn chứa bất kỳ câu hỏi trắc nghiệm, đáp án hay Exit Ticket hard-coded nào trong HTML.
   - Chỉ giữ khung host (`#goldenLessonApp`, `data-lesson-id="G6-L03"`, `data-golden-json="../../../data/lessons/G6-L03.golden.json"`) và nạp `api.js`, `auth.js`, `data/lessons.js`, `lesson-bridge.js`, `golden-lesson-renderer.js`.
2. **Reference Renderer (`assets/js/golden-lesson-renderer.js`):**
   - Đọc trực tiếp `data/lessons/G6-L03.golden.json` (và fallback registry) để render header, thanh tiến độ `0% → 50% (Tiết 1) → 100% (Tiết 2)`, 8 thẻ hoạt động, Pixel-to-Bit Lab 4×4, Checkpoint Tiết 1, bảng đơn vị dung lượng, WebQuest 5 bước + Phiếu tư vấn lưu trữ, chế độ `REAL_DEVICE` / `SIMULATION`, và Exit Ticket.
   - Mọi thao tác lưu tiến độ, ghi minh chứng câu trả lời / sản phẩm học tập, nộp Exit Ticket, dừng cuối Tiết 1 và hoàn thành bài học đều đi qua **`LessonBridge`** (`initLesson`, `completeActivity`, `saveQuestionAnswer`, `submitExitTicket`, `endLearningSession`, `completeLesson`, `getProgress`, `getFirstIncompleteActivityId`, `getSavedResponses`, `getSavedExitTicket`) — không gọi trực tiếp Apps Script từ trang bài học.
3. **Đồng bộ Completion Rules Frontend & Backend:**
   - `data/lessons.js`, `data/lessons/G6-L03.golden.json`, và `backend/StudentV2.gs` (`LESSON_RULES["G6-L03"]`) quy định thống nhất:
     - `requiredActivityIds`: `["G6-L03-A01", "G6-L03-A02", "G6-L03-A03", "G6-L03-A04", "G6-L03-A05", "G6-L03-A06", "G6-L03-A07", "G6-L03-A08"]`
     - `requireExitTicket`: `true`
     - `minPercentToComplete`: `100`
   - Bảo toàn rule legacy `"G6-B3"` trong `backend/StudentV2.gs` để tương thích ngược tuyệt đối với Phase 1 regression tests.
   - Dữ liệu minh chứng sinh ra từ `G6-L03` tương thích 100% với các API Teacher Dashboard V3 (`getTeacherClassOverview`, `getTeacherLessonAnalytics`, `getTeacherStudentDetail`, `getTeacherExitTickets`, `getTeacherStrugglingStudents`).
