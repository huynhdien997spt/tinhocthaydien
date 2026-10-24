# PHASE 3 / TASK P3.3 — GOLDEN LESSON `G6-L03` TEST REPORT

**Executed At:** 2026-10-24  
**Branch:** `phase3-golden-lesson-review`  
**Base Commit:** `8e574b19d3a9d922e3cbbe3af49971b90c9c978e`

---

## 1. Tổng hợp Kết quả Kiểm thử (4 Test Suites)

| Bộ kiểm thử | Lệnh chạy | Kết quả | Chi tiết |
|---|---|---|---|
| **Phase 3 / P3.3 Golden Lesson Tests** | `node tools/golden-lesson/test-p3-3.js` | **20/20 PASS** | Kiểm tra đầy đủ `P3-01` đến `P3-20` + mock integration flow (0% → 50% Checkpoint Tiết 1 → Resume A05 → 100% + Exit Ticket → Teacher Dashboard V3) |
| **Phase 2 / P2.5 Curriculum Regression** | `node tools/curriculum/test-p2-5.js` | **20/20 PASS** | Schema validation, 38/38 verbatim CTGDPT `officialText`, PPCT 35 tiết, NLS mapping, Importer idempotency & negative fixtures (`P25-01` đến `P25-20`) |
| **Phase 1.5 Agent Infra Regression** | `node tools/agent-infra/demo-phase1-5.js` | **27/27 PASS** | Task lifecycle, quality gates, trace IDs, review queue (`27/27 PASS`) |
| **Phase 1 Audit Regression** | `node <scratch>/audit-test.js` | **79/79 PASS** | Auth isolation, StudentUID stability, LessonBridge tracking, Teacher Dashboard V3 APIs (`79/79 PASS`) |

---

## 2. Chi tiết 20 Kiểm thử Bắt buộc Phase 3 / P3.3 (`P3-01` .. `P3-20`)

| Test ID | Nội dung kiểm thử | Trạng thái |
|---|---|---|
| `P3-01` | Golden Lesson schema valid (`lesson`, `activities`, `questions`, `resources` đạt chuẩn JSON Schema & Data Contract Phase 2) | **PASS** |
| `P3-02` | Không còn `isFixtureOnly`, `fixtureMetadata`, `fixtureNote`, `[Fixture]`, hoặc `approvedForProductionUI=false` trong production lesson | **PASS** |
| `P3-03` | Không còn minh chứng học sinh giả lập (`STD-FIXTURE-SAMPLE-001`) trong dữ liệu bài học production | **PASS** |
| `P3-04` | Đúng 8 hoạt động bắt buộc (`G6-L03-A01` .. `G6-L03-A08`, `required = true`) | **PASS** |
| `P3-05` | Tổng thời lượng Tiết 1 (`A01–A04`) = 45 phút (`5 + 18 + 12 + 10`) | **PASS** |
| `P3-06` | Tổng thời lượng Tiết 2 (`A05–A08`) = 45 phút (`15 + 20 + 5 + 5`) | **PASS** |
| `P3-07` | Tổng thời lượng toàn bài (`A01–A08`) = 90 phút (2 tiết) | **PASS** |
| `P3-08` | Hoàn thành `A01–A04` đạt đúng `50%`, `status = in_progress`, `nextActivityId = G6-L03-A05`, gọi `endLearningSession(false)`, **không** gọi `completeLesson()` | **PASS** |
| `P3-09` | Bao phủ đầy đủ cả 4 YCCĐ (`G6-A-07`, `G6-A-08`, `G6-A-09`, `G6-A-10`) trên cả `activities` và `questions` | **PASS** |
| `P3-10` | Mọi hoạt động bắt buộc đều có `requirementIds` và `expectedEvidenceTypes` khác rỗng | **PASS** |
| `P3-11` | Mọi câu hỏi (`Q001–Q010`) gắn đúng 1 `RequirementID`, không lộ đáp án trước lần thử đầu và cho phép làm lại khi sai (`retryAllowed = true`) | **PASS** |
| `P3-12` | `A05` dùng quy ước xấp xỉ thập phân CTGDPT (`1 KB ≈ 1000 byte`, `1 MB ≈ 1000 KB`, `1 GB ≈ 1000 MB`), không bắt buộc `1024`, `TB` chỉ nằm ở `supplementaryKnowledge` | **PASS** |
| `P3-13` | `A06` có đủ NLS (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`), quy trình 5 bước, Sản phẩm 2 (`PHIẾU TƯ VẤN LƯU TRỮ`), và nút hỗ trợ 3 mức `"Em chưa làm được"` tại `A02`, `A05`, `A06` | **PASS** |
| `P3-14` | `A08` bắt buộc Exit Ticket với câu hỏi vận dụng 6 GB dữ liệu; `A07` hỗ trợ cả 2 chế độ `REAL_DEVICE` và `SIMULATION` | **PASS** |
| `P3-15` | `completeLesson()` bị chặn khi chưa đủ `A01–A08` hoặc chưa nộp Exit Ticket; chỉ thành công khi hoàn thành cả `A01–A08` + Exit Ticket | **PASS** |
| `P3-16` | Resume từ `50%` (`A01–A04` đã xong) xác định đúng hoạt động tiếp theo là `G6-L03-A05` và đảm bảo cách ly dữ liệu khi dùng chung thiết bị giữa 2 học sinh | **PASS** |
| `P3-17` | `lessons/grade6/bai3/index.html` là shell/host thuần túy, không chứa câu hỏi hard-coded trong HTML | **PASS** |
| `P3-18` | Quy tắc hoàn thành bài học (`completionRule`) khớp tuyệt đối giữa Frontend (`data/lessons.js`, `G6-L03.golden.json`) và Backend (`backend/StudentV2.gs` `LESSON_RULES["G6-L03"]`) | **PASS** |
| `P3-19` | Không gọi trực tiếp Apps Script từ trang bài học; toàn bộ dữ liệu tiến độ, câu trả lời và Exit Ticket của `G6-L03` đọc được qua các API Teacher Dashboard V3 | **PASS** |
| `P3-20` | Phase 2 Curriculum Validator (94 entities, 0 errors) & Requirement Text Audit (`38/38 ExactAfterAllowedNormalization = TRUE`) regression PASS | **PASS** |

---

## 3. Ghi chú Điều kiện Tiên quyết cho P3.4 (UAT)

```text
P3.4_UAT_PRECONDITION: Apps Script deployment connectivity must be restored.
```

- Toàn bộ luồng P3.3 đã được kiểm thử end-to-end qua mock backend (`backend/StudentV2.gs` + `LessonBridge` + `Auth` + `API`).
- Trước khi thực hiện kiểm thử UAT trực tiếp trên môi trường Apps Script thực tế ở bước **P3.4**, cần khôi phục kết nối deployment Apps Script Web App (`exec` endpoint).
