# PHASE 3 / TASK P3.3 — GOLDEN LESSON `G6-L03` TEST REPORT (FIX ROUND 1)

**Executed At:** 2026-10-24  
**Branch:** `phase3-golden-lesson-review`  
**Base Commit:** `8e574b19d3a9d922e3cbbe3af49971b90c9c978e`

---

## 1. Tổng hợp Kết quả Kiểm thử (4 Test Suites)

| Bộ kiểm thử | Lệnh chạy | Kết quả | Chi tiết |
|---|---|---|---|
| **Phase 3 / P3.3 Golden Lesson Tests (incl. Fix Round 1)** | `node tools/golden-lesson/test-p3-3.js` | **30/30 PASS** | `P3-01` .. `P3-20` + `P3-FIX-01` .. `P3-FIX-10` + Realistic UI-like Student A / Student B / Student A Resume flow |
| **Phase 2 / P2.5 Curriculum Regression** | `node tools/curriculum/test-p2-5.js` | **20/20 PASS** | Schema validation, 38/38 verbatim CTGDPT `officialText`, PPCT 35 tiết, NLS mapping, Importer idempotency & negative fixtures (`P25-01` .. `P25-20`) |
| **Phase 1.5 Agent Infra Regression** | `node tools/agent-infra/demo-phase1-5.js` | **27/27 PASS** | Task lifecycle, quality gates, trace IDs, review queue (`27/27 PASS`) |
| **Phase 1 Audit Regression** | `node <scratch>/audit-test.js` | **79/79 PASS** | Auth isolation, StudentUID stability, LessonBridge tracking, Teacher Dashboard V3 APIs (`79/79 PASS`) |

---

## 2. Xác minh 4 Nguyên tắc Cốt lõi của P3.3 Fix Round 1

1. **`student input required`:**
   - `A05` render 3 ô nhập trống (`1 KB ≈ [____] byte`, `1 MB ≈ [____] KB`, `1 GB ≈ [____] MB`), không prefill `1000` và không hard-code đáp án trong handler (`P3-FIX-01` PASS).
   - `A06` không prefill đáp án cho `estimatedCapacity`, `selectedDevice`, `need`, `reason` (`P3-FIX-02`, `P3-FIX-03` PASS).
2. **`activity evidence gates`:**
   - `canCompleteActivity(activityId)` chặn `completeActivity` nếu học sinh chưa hoàn thành đầy đủ câu hỏi và sản phẩm của hoạt động đó (`P3-08`, `P3-15`, `P3-FIX-05`, `P3-FIX-06`, `P3-FIX-07` PASS).
3. **`submission validity != correctness`:**
   - Sản phẩm mở `G6-L03-PROD-01` (câu giải thích bit) và `G6-L03-PROD-02` (Phiếu tư vấn lưu trữ) chỉ kiểm tra tính hợp lệ khi nộp, lưu với `evaluationStatus = "needs_teacher_review"`, `isCorrect = null`, `score = null` để giáo viên đánh giá; tuyệt đối không tự gán `isCorrect = true` hay full điểm (`P3-FIX-04`, `P3-19` PASS).
4. **`period 2 locked until checkpoint`:**
   - Tiết 2 bị khóa kèm thông báo `"Hoàn thành Checkpoint Tiết 1 để mở Tiết 2."` cho đến khi `A01–A04` đều hoàn thành; sau khi xong `A04` hiện màn hình dừng cuối Tiết 1 và chỉ mở Tiết 2 khi học sinh bấm `"Tiếp tục Tiết 2"` hoặc khi resume từ mốc `50%` (`P3-08`, `P3-16`, `P3-FIX-08` PASS).

---

## 3. Chi tiết 30 Kiểm thử Bắt buộc (`P3-01` .. `P3-20` & `P3-FIX-01` .. `P3-FIX-10`)

| Test ID | Nội dung kiểm thử | Trạng thái |
|---|---|---|
| `P3-01` | Golden Lesson schema valid (`lesson`, `activities`, `questions`, `resources` đạt chuẩn JSON Schema & Data Contract Phase 2) | **PASS** |
| `P3-02` | Không còn `isFixtureOnly`, `fixtureMetadata`, `fixtureNote`, `[Fixture]`, hoặc `approvedForProductionUI=false` trong production lesson | **PASS** |
| `P3-03` | Không còn minh chứng học sinh giả lập (`STD-FIXTURE-SAMPLE-001`) trong dữ liệu bài học production | **PASS** |
| `P3-04` | Đúng 8 hoạt động bắt buộc (`G6-L03-A01` .. `G6-L03-A08`, `required = true`) | **PASS** |
| `P3-05` | Tổng thời lượng Tiết 1 (`A01–A04`) = 45 phút (`5 + 18 + 12 + 10`) | **PASS** |
| `P3-06` | Tổng thời lượng Tiết 2 (`A05–A08`) = 45 phút (`15 + 20 + 5 + 5`) | **PASS** |
| `P3-07` | Tổng thời lượng toàn bài (`A01–A08`) = 90 phút (2 tiết) | **PASS** |
| `P3-08` | Luồng học sinh thực tế Tiết 1 (Student A): chặn `completeActivity` khi thiếu minh chứng, khóa Tiết 2 trước `A04`, hoàn thành `A01–A04` đạt `50%`, `status = in_progress`, `next = A05`, gọi `endLearningSession(false)`, không tự nhảy sang Tiết 2 | **PASS** |
| `P3-09` | Bao phủ đầy đủ cả 4 YCCĐ (`G6-A-07`, `G6-A-08`, `G6-A-09`, `G6-A-10`) trên cả `activities` và `questions` | **PASS** |
| `P3-10` | Mọi hoạt động bắt buộc đều có `requirementIds` và `expectedEvidenceTypes` khác rỗng | **PASS** |
| `P3-11` | Mọi câu hỏi (`Q001–Q010`) gắn đúng 1 `RequirementID`, không lộ đáp án trước lần thử đầu và cho phép làm lại khi sai | **PASS** |
| `P3-12` | `A05` dùng quy ước xấp xỉ thập phân CTGDPT (`1 KB ≈ 1000 byte`, `1 MB ≈ 1000 KB`, `1 GB ≈ 1000 MB`), không bắt buộc `1024`, `TB` chỉ nằm ở `supplementaryKnowledge` | **PASS** |
| `P3-13` | `A06` có đủ NLS (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`), quy trình 5 bước, Sản phẩm 2 (`PHIẾU TƯ VẤN LƯU TRỮ`), và nút hỗ trợ 3 mức `"Em chưa làm được"` tại `A02`, `A05`, `A06` | **PASS** |
| `P3-14` | `A08` bắt buộc Exit Ticket với câu hỏi vận dụng 6 GB dữ liệu; `A07` hỗ trợ cả 2 chế độ `REAL_DEVICE` và `SIMULATION` | **PASS** |
| `P3-15` | Luồng học sinh thực tế Tiết 2 (Student A): chặn `A05` khi chưa nhập/nhập sai worksheet, phản hồi khi nhập sai & cho thử lại, chặn `A06` khi thiếu `PROD-02`/`Q009`, chặn `completeLesson()` trước Exit Ticket và cho phép hoàn thành sau `A01–A08` + Exit Ticket | **PASS** |
| `P3-16` | Student B dùng chung máy bắt đầu ở `0%` (không lộ dữ liệu Student A); Student A resume từ `50%` mở khóa Tiết 2 và chọn `G6-L03-A05` | **PASS** |
| `P3-17` | `lessons/grade6/bai3/index.html` là shell/host thuần túy, không chứa câu hỏi hard-coded trong HTML | **PASS** |
| `P3-18` | Quy tắc hoàn thành bài học (`completionRule`) khớp tuyệt đối giữa Frontend (`data/lessons.js`, `G6-L03.golden.json`) và Backend (`backend/StudentV2.gs` `LESSON_RULES["G6-L03"]`) | **PASS** |
| `P3-19` | Không gọi trực tiếp Apps Script từ trang bài học; Teacher Dashboard V3 đọc đầy đủ tiến độ, câu trả lời, sản phẩm mở chờ chấm (`isCorrect=null, score=null`) và Exit Ticket của `G6-L03` | **PASS** |
| `P3-20` | Phase 2 Curriculum Validator (94 entities, 0 errors) & Requirement Text Audit (`38/38 ExactAfterAllowedNormalization = TRUE`) regression PASS | **PASS** |
| `P3-FIX-01` | FAIL nếu `A05` handler chứa hard-coded `1000 / 1000 / 1000` thay vì đọc student input | **PASS** |
| `P3-FIX-02` | FAIL nếu `A06` `estimatedCapacity` có đáp án mặc định | **PASS** |
| `P3-FIX-03` | FAIL nếu `A06` `selectedDevice` có đáp án đúng mặc định | **PASS** |
| `P3-FIX-04` | FAIL nếu open product (`PROD-01`, `PROD-02`) tự gán `isCorrect=true` hoặc full score chỉ vì non-empty | **PASS** |
| `P3-FIX-05` | FAIL nếu `completeActivity(A02)` thành công mà `PROD-01` hoặc `Q002` chưa có | **PASS** |
| `P3-FIX-06` | FAIL nếu `completeActivity(A05)` thành công mà worksheet/`Q006`/`Q007` chưa có | **PASS** |
| `P3-FIX-07` | FAIL nếu `completeActivity(A06)` thành công mà `PROD-02`/`Q008`/`Q009` chưa có | **PASS** |
| `P3-FIX-08` | FAIL nếu học sinh có thể mở Tiết 2 trước khi hoàn thành `A01–A04` | **PASS** |
| `P3-FIX-09` | FAIL nếu bất kỳ `SourceID` nào trong `PHASE3_TRACEABILITY_REPORT.md` không tồn tại trong `sources-g6.json` | **PASS** |
| `P3-FIX-10` | FAIL nếu `officialText` trong `PHASE3_TRACEABILITY_REPORT.md` khác `requirements-g6.json` | **PASS** |

---

## 4. Ghi chú Điều kiện Tiên quyết cho P3.4 (UAT)

```text
P3.4_UAT_PRECONDITION: Apps Script deployment connectivity must be restored.
```
