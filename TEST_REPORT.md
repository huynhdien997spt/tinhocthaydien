# BÁO CÁO KIỂM THỬ TỔNG HỢP (`TEST_REPORT.md`)

- **Cập nhật mới nhất:** `PHASE 2 / P2.5 FIX ONLY`
- **Tổng số bài kiểm thử tự động toàn hệ thống:** **126 / 126 PASS (100%)**
  - **Phase 2 / P2.5 Fix (Curriculum Data Foundation & Content Quality):** 20 / 20 PASS ([tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js))
  - **Phase 1.5 Regression (Agent Infra & Governance):** 27 / 27 PASS ([tools/agent-infra/demo-phase1-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/agent-infra/demo-phase1-5.js))
  - **Phase 1 Regression (Core Student/Teacher Runtime):** 79 / 79 PASS ([audit-test.js](file:///Users/huynhvandien/.gemini/antigravity/brain/8c553d9e-5d0c-4db2-934b-287be9ebd48a/scratch/audit-test.js))

---

## PHẦN A — KẾT QUẢ KIỂM THỬ PHASE 2 / TASK P2.5 FIX (20/20 PASS)

Chạy lệnh:
```bash
node tools/curriculum/test-p2-5.js
```

| Mã Test | Hạng mục kiểm thử | Kỳ vọng | Kết quả | Bằng chứng chi tiết |
| :--- | :--- | :---: | :---: | :--- |
| `P25-01` | Cấu trúc thư mục `data/*`, `schemas/`, `tools/curriculum/` | PASS | **PASS** | Đủ 7 thư mục chuẩn theo đặc tả |
| `P25-02` | 12 JSON Schemas hợp lệ và vượt qua kiểm tra `Data Contract Lock` (Blocker 3 & 7.7) | PASS | **PASS** | 12 schemas khớp 100% trường bắt buộc của Data Contract |
| `P25-03` | Materialize Chủ đề A–F (`G6-A` .. `G6-F`) | PASS | **PASS** | 6 chủ đề Lớp 6 đầy đủ `order`, `officialSourceId` |
| `P25-04` | Số lượng YCCĐ = `38` và số lượng từng chủ đề `A=10, B=4, C=7, D=5, E=9, F=3` (Blocker 1.1, 7.1, 7.2) | PASS | **PASS** | `Total=38 (A=10, B=4, C=7, D=5, E=9, F=3)` |
| `P25-05` | Đối chiếu `Trusted Official Snapshot`, `studentFriendlyText`, và không có `TB` trong `officialText` của `G6-A-09` (Blocker 1.3–1.5, 7.3) | PASS | **PASS** | 38/38 YCCĐ khớp `trusted-official-requirements-g6.json` |
| `P25-06` | PPCT Trường Việt Hoa: 16 bài nội dung (`1–13, 15–17`), không có Bài 14, đúng số tiết (`Bài 3=2t/90p, Bài 8=1t/45p, Bài 13=1t/45p, Bài 17=1t/45p`) & 35 tiết/năm (Blocker 2, 7.4–7.6) | PASS | **PASS** | 16 bài học (28 tiết) + 7 tiết ôn tập/kiểm tra = 35 tiết/năm |
| `P25-07` | Kiểm chứng Source Catalog cụ thể & 2 lớp nguồn (Blocker 4 & 5) | PASS | **PASS** | 5 nguồn `verified` với URL/Drive ID cụ thể |
| `P25-08` | Phân tách Khung NLS (TT 02/2025) với Mapping trường (Phụ lục III/KHBD) & Cấm AI trong Requirement Bank (Blocker 6) | PASS | **PASS** | `isOfficialGdpt2018Requirement=false`; 0 mã AI trong Requirement Bank |
| `P25-09` | Golden Lesson `G6-L03` đúng thông số và gắn cờ `isFixtureOnly=true` (Blocker 7.8 & 8) | PASS | **PASS** | `G6-L03`, 2 tiết, 90 phút, `G6-A-07..10`, `isFixtureOnly=true` |
| `P25-10` | **Fixture 1:** `Valid Grade 6 dataset` → `PASS` | PASS | **PASS** | 94 thực thể hợp lệ, `errorCount = 0` |
| `P25-11` | **Fixture 2:** `Duplicate ID` → `FAIL` | PASS | **PASS** | Bắt đúng `DUPLICATE_ID` (`G6-A-01`, `G6-L03`) |
| `P25-12` | **Fixture 3:** `Missing RequirementID` → `FAIL` | PASS | **PASS** | Bắt đúng `PUBLISHED_LESSON_MISSING_REQUIREMENT` |
| `P25-13` | **Fixture 4:** `Dangling reference` → `FAIL` | PASS | **PASS** | Bắt đúng 3 lỗi `DANGLING_REFERENCE` |
| `P25-14` | **Fixture 5:** `Unapproved AI mapping` & `AI in Requirement Bank` → `FAIL` | PASS | **PASS** | Bắt đúng `UNAPPROVED_AI_MAPPING` & `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| `P25-15` | **Fixture 6:** `Invalid question` (thiếu `requirementId`, `correctAnswer`, `explanation`) → `FAIL` | PASS | **PASS** | Bắt đủ 3 mã lỗi `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| `P25-16` | **Fixture 7:** Vi phạm Activity, Resource thiếu URL, và giả mạo `officialText` kèm tự tính lại hash → `FAIL` | PASS | **PASS** | Trusted Snapshot bắt gọn hành vi sửa `officialText` rồi tự băm lại `officialTextHash` (`OFFICIAL_REQUIREMENT_TEXT_TAMPERED`) |
| `P25-17` | **Blocker 7 Negative Suite:** Sai tổng YCCĐ, sai YCCĐ theo chủ đề, xuất hiện Bài 14, sai số tiết Bài 8, URL nguồn chung chung, và lệch Data Contract → `FAIL` | PASS | **PASS** | Bắt đủ 6 mã lỗi: `REQUIREMENT_COUNT_MISMATCH`, `TOPIC_REQUIREMENT_COUNT_MISMATCH`, `PHANTOM_LESSON_DETECTED`, `PPCT_PERIOD_MISMATCH`, `SOURCE_URL_TOO_GENERIC`, `CONTRACT_DRIFT_DETECTED` |
| `P25-18` | Importer nạp 94 thực thể hợp lệ vào `IntermediateCurriculumAdapter` | PASS | **PASS** | `inserted = 94`, cập nhật `tools/curriculum/staging-store.json` |
| `P25-19` | Importer Idempotency: chạy lại nhiều lần không sinh duplicate | PASS | **PASS** | Run 2 & Run 3: `inserted = 0, updated = 0, unchanged = 94, duplicatesCreated = 0` |
| `P25-20` | Importer từ chối nguyên tử (atomic rejection) & Bảo toàn 100% file production | PASS | **PASS** | 0 bản ghi lỗi lọt vào staging; 19 file production nguyên vẹn |

---

## PHẦN B — KẾT QUẢ REGRESSION PHASE 1.5 & PHASE 1 (106/106 PASS)

1. **Regression Phase 1.5 (`node tools/agent-infra/demo-phase1-5.js`):** **27 / 27 PASS, 0 FAILED**.
2. **Regression Phase 1 (`node scratch/audit-test.js`):** **79 / 79 PASS, 0 FAILED**.

---

## KẾT LUẬN

```text
PHASE 2 / P2.5 FIX: READY_FOR_REVIEW
```
