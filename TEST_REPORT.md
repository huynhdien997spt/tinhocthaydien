# BÁO CÁO KIỂM THỬ TỔNG HỢP (`TEST_REPORT.md`)

- **Cập nhật mới nhất:** `PHASE 2 / P2.5 FIX ROUND 2 ONLY`
- **Tổng số bài kiểm thử tự động toàn hệ thống:** **126 / 126 PASS (100%)**
  - **Phase 2 / P2.5 Fix Round 2 (Curriculum Data Foundation & Source/PPCT Verification):** 20 / 20 PASS ([tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js))
  - **Phase 1.5 Regression (Agent Infra & Governance):** 27 / 27 PASS ([tools/agent-infra/demo-phase1-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/agent-infra/demo-phase1-5.js))
  - **Phase 1 Regression (Core Student/Teacher Runtime):** 79 / 79 PASS ([audit-test.js](file:///Users/huynhvandien/.gemini/antigravity/brain/8c553d9e-5d0c-4db2-934b-287be9ebd48a/scratch/audit-test.js))

---

## PHẦN A — KẾT QUẢ KIỂM THỬ PHASE 2 / TASK P2.5 FIX ROUND 2 (20/20 PASS)

Chạy lệnh:
```bash
node tools/curriculum/test-p2-5.js
```

| Mã Test | Hạng mục kiểm thử | Kỳ vọng | Kết quả | Bằng chứng chi tiết |
| :--- | :--- | :---: | :---: | :--- |
| `P25-01` | Cấu trúc thư mục `data/*`, `schemas/`, `tools/curriculum/` | PASS | **PASS** | Đủ 7 thư mục chuẩn theo đặc tả |
| `P25-02` | 12 JSON Schemas hợp lệ và vượt qua kiểm tra `Data Contract Lock` | PASS | **PASS** | 12 schemas khớp 100% trường bắt buộc của Data Contract |
| `P25-03` | Materialize Chủ đề A–F (`G6-A` .. `G6-F`) | PASS | **PASS** | 6 chủ đề Lớp 6 đầy đủ `order`, `officialSourceId` |
| `P25-04` | Số lượng YCCĐ = `38` (`A=10, B=4, C=7, D=5, E=9, F=3`) và giữ bất biến `RequirementID` (`A05/A06`, `B02/B03`, `E01..E09`) | PASS | **PASS** | `G6-A-05` = Vai trò máy tính; `G6-A-06` = Các bước xử lí; `G6-B-02` = Mạng không dây; `G6-B-03` = Thành phần mạng; `G6-E-01..06` = Soạn thảo văn bản; `G6-E-07..09` = Sơ đồ tư duy |
| `P25-05` | Nguyên văn `officialText` CTGDPT 2018 (`G6-A-09` có câu ví dụ, `G6-B-03` dùng `"cáp nối"`, `G6-C-01`, `G6-C-07`, `G6-D-01..05`) & Provenance của Trusted Snapshot | PASS | **PASS** | 38/38 YCCĐ khớp `trusted-official-requirements-g6.json` kèm `sourceDocumentDriveId = 13o_7GOH...` và `ItemID=146721` |
| `P25-06` | PPCT Trường Việt Hoa (`1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`): **Bài 5 = 2 tiết (90p)**, **29 lesson + 2 review + 4 assessment = 35 tiết**, lịch `periodSchedule` 1..35 | PASS | **PASS** | 16 bài nội dung = 29 tiết; không có Bài 14; không có `"Ôn tập giữa học kì I"`; lịch 35 tiết khớp thứ tự thực tế |
| `P25-07` | Source Catalog dùng đúng 5 Drive ID gốc của thầy và VBPL `ItemID=146721` & `ItemID=175173` (không dùng Doc ID trung gian của ChatGPT) | PASS | **PASS** | 6 bản ghi nguồn xác thực; SGK đánh dấu `internal=verified, external=pending` trung thực |
| `P25-08` | NLS Mapping dẫn nguồn `SRC-TT02-2025-NLS`, `SRC-PHULUC3-TIN6-VIETHOA-2026` (`1eB5ZVwD...`) và `SRC-KHBD-TIN6-BAI3-VIETHOA` (`1vMj4Yly...`); 0 AI trong Requirement Bank | PASS | **PASS** | `isOfficialGdpt2018Requirement=false`; đủ 3 nguồn tham chiếu NLS |
| `P25-09` | Golden Lesson `G6-L03` đúng thông số và gắn cờ `isFixtureOnly=true` | PASS | **PASS** | `G6-L03`, 2 tiết, 90 phút, `G6-A-07..10`, `isFixtureOnly=true` |
| `P25-10` | **Fixture 1:** `Valid Grade 6 dataset` → `PASS` | PASS | **PASS** | 95 thực thể hợp lệ, `errorCount = 0` |
| `P25-11` | **Fixture 2:** `Duplicate ID` → `FAIL` | PASS | **PASS** | Bắt đúng `DUPLICATE_ID` (`G6-A-01`, `G6-L03`) |
| `P25-12` | **Fixture 3:** `Missing RequirementID` → `FAIL` | PASS | **PASS** | Bắt đúng `PUBLISHED_LESSON_MISSING_REQUIREMENT` |
| `P25-13` | **Fixture 4:** `Dangling reference` → `FAIL` | PASS | **PASS** | Bắt đúng 3 lỗi `DANGLING_REFERENCE` |
| `P25-14` | **Fixture 5:** `Unapproved AI mapping` & `AI in Requirement Bank` → `FAIL` | PASS | **PASS** | Bắt đúng `UNAPPROVED_AI_MAPPING` & `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| `P25-15` | **Fixture 6:** `Invalid question` (thiếu `requirementId`, `correctAnswer`, `explanation`) → `FAIL` | PASS | **PASS** | Bắt đủ 3 mã lỗi `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| `P25-16` | **Fixture 7:** Vi phạm Activity, Resource thiếu URL, và giả mạo `officialText` kèm tự tính lại hash → `FAIL` | PASS | **PASS** | Trusted Snapshot bắt gọn hành vi sửa `officialText` rồi tự băm lại `officialTextHash` (`OFFICIAL_REQUIREMENT_TEXT_TAMPERED`) |
| `P25-17` | **Round 1 & Round 2 Negative Suite:** Sai tổng YCCĐ, đảo `RequirementID`, thêm Bài 14, sai số tiết Bài 5, thêm `"Ôn tập giữa học kì I"`, dùng Drive ID trung gian `1dadBF...`, thiếu Provenance trong Trusted Snapshot, lệch Data Contract → `FAIL` | PASS | **PASS** | Bắt đủ 10 mã lỗi: `REQUIREMENT_COUNT_MISMATCH`, `TOPIC_REQUIREMENT_COUNT_MISMATCH`, `REQUIREMENT_STABLE_ID_DRIFT`, `PHANTOM_LESSON_DETECTED`, `PPCT_PERIOD_MISMATCH`, `PHANTOM_REVIEW_SESSION_DETECTED`, `SOURCE_URL_TOO_GENERIC`, `FORBIDDEN_INTERMEDIATE_DRIVE_ID`, `TRUSTED_SNAPSHOT_MISSING_PROVENANCE`, `CONTRACT_DRIFT_DETECTED` |
| `P25-18` | Importer nạp 95 thực thể hợp lệ vào `IntermediateCurriculumAdapter` | PASS | **PASS** | `inserted = 95`, cập nhật `tools/curriculum/staging-store.json` |
| `P25-19` | Importer Idempotency: chạy lại nhiều lần không sinh duplicate | PASS | **PASS** | Run 2 & Run 3: `inserted = 0, updated = 0, unchanged = 95, duplicatesCreated = 0` |
| `P25-20` | Importer từ chối nguyên tử (atomic rejection) & Bảo toàn 100% file production | PASS | **PASS** | 0 bản ghi lỗi lọt vào staging; 19 file production nguyên vẹn |

---

## PHẦN B — KẾT QUẢ REGRESSION PHASE 1.5 & PHASE 1 (106/106 PASS)

1. **Regression Phase 1.5 (`node tools/agent-infra/demo-phase1-5.js`):** **27 / 27 PASS, 0 FAILED**.
2. **Regression Phase 1 (`node scratch/audit-test.js`):** **79 / 79 PASS, 0 FAILED**.

---

## KẾT LUẬN

```text
PHASE 2 / P2.5 FIX ROUND 2: READY_FOR_REVIEW
```
