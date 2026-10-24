# BÁO CÁO KIỂM THỬ TỔNG HỢP (`TEST_REPORT.md`)

- **Cập nhật mới nhất:** `PHASE 2 / P2.5 FIX ROUND 5 ONLY`
- **Tổng số bài kiểm thử tự động toàn hệ thống:** **126 / 126 PASS (100%)** + **Requirement Text Audit 38 / 38 EXACT MATCH**
  - **Requirement Text Audit ([tools/curriculum/audit-requirement-text.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/audit-requirement-text.js)):** 38 / 38 EXACT MATCH (`0 mismatch`, `exit code 0`)
  - **Phase 2 / P2.5 Fix Round 5 ([tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js)):** 20 / 20 PASS
  - **Phase 1.5 Regression ([tools/agent-infra/demo-phase1-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/agent-infra/demo-phase1-5.js)):** 27 / 27 PASS
  - **Phase 1 Regression ([audit-test.js](file:///Users/huynhvandien/.gemini/antigravity/brain/8c553d9e-5d0c-4db2-934b-287be9ebd48a/scratch/audit-test.js)):** 79 / 79 PASS

---

## PHẦN A — KẾT QUẢ KIỂM THỬ PHASE 2 / TASK P2.5 FIX ROUND 5 (20/20 PASS)

Chạy lệnh:
```bash
node tools/curriculum/audit-requirement-text.js
node tools/curriculum/test-p2-5.js
```

| Test ID / Name | Purpose | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :---: |
| `P25-01`: Mandatory directories exist | Kiểm tra đủ 7 thư mục `data/*`, `schemas/`, `tools/curriculum/` | 7 thư mục tồn tại | Verified 7 directories | **PASS** |
| `P25-02`: 12 JSON Schemas & Locked Data Contract | Kiểm tra 12 schemas Draft 2020-12 và khóa Data Contract | `valid = true, drift = 0` | 12 schemas verified with 0 Data Contract drift | **PASS** |
| `P25-03`: Topics A–F & Core Competencies ONLY `NLa`–`NLe` | Kiểm tra 6 chủ đề A–F và đúng 5 Core Competencies (`NLa..NLe`), không có `NLS-*` | 6 topics, 5 core competencies | Topics: `G6-A..G6-F`; Core Competencies: `NLa..NLe` (5 records) | **PASS** |
| `P25-04`: Requirement Bank 38 items & Stable IDs | Kiểm tra tổng 38 YCCĐ (`A=10, B=4, C=7, D=5, E=9, F=3`) và giữ bất biến `A05/A06`, `B02/B03`, `E01..E09` | 38 YCCĐ, đúng phân bổ & ID bất biến | Total=38 (`A=10, B=4, C=7, D=5, E=9, F=3`) with immutable IDs verified | **PASS** |
| `P25-05`: Verbatim CTGDPT 2018 `officialText` (38/38), Source Transcript & `REQUIREMENT_TEXT_AUDIT.md` | Đối chiếu độc lập `ctgdpt2018-tin6-yccd.source.json` vs `requirements-g6.json` (bao gồm `A09`, `B03`, `C07`, `D01`, `D05`, `E01`, `E03`, `E04`, `E07`, `F03`) | 38/38 `ExactAfterAllowedNormalization = TRUE` | 38/38 `ExactAfterAllowedNormalization = TRUE` verified via independent source transcript | **PASS** |
| `P25-06`: Viet Hoa 2026–2027 PPCT (`1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`) | Kiểm tra Bài 5 = 2 tiết, `29 lesson + 2 review + 4 assessment = 35 tiết`, lịch `periodSchedule` 1..35 | 29 + 2 + 4 = 35 tiết, không có Bài 14 & Ôn tập giữa HKI | 29 lesson + 2 review + 4 assessment = 35 periods/year; 35-period schedule verified | **PASS** |
| `P25-07`: 4-Layer Source Governance & `SRC-TT02-2025-NLS` | Kiểm tra 5 Drive ID gốc của thầy, VBPL `146721` & `175173`, và `SRC-TT02-2025-NLS.driveId = null` | `TT02.driveId = null`, `internal = not_available`, `external = verified` | 4-layer source governance verified; `SRC-TT02-2025-NLS` has `driveId=null` & `ItemID=175173` | **PASS** |
| `P25-08`: NLS Mapping Bài 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | Kiểm tra cả 3 mã NLS gắn với `G6-A-09 & G6-A-10` (không gắn `5.2.TC1a` vào `G6-A-07`) | Map tới `["G6-A-09", "G6-A-10"]` | `1.3.TC1a, 5.2.TC1a, 5.2.TC1b` mapped to `G6-A-09 & G6-A-10` with Phụ lục III descriptions | **PASS** |
| `P25-09`: Golden Lesson `G6-L03` fixture | Kiểm tra `G6-L03` (2 tiết, 90 phút, `G6-A-07..10`, `isFixtureOnly=true`) | `isFixtureOnly = true` | `G6-L03` fixture verified (2 periods, 90m, `G6-A-07..10`, `isFixtureOnly=true`) | **PASS** |
| `P25-10`: Fixture 1 – Valid Grade 6 dataset | Kiểm định bộ dữ liệu chuẩn 92 thực thể | `valid = true, errorCount = 0` | PASS with 0 errors across 92 entities | **PASS** |
| `P25-11`: Fixture 2 – Duplicate ID | Kiểm định phát hiện trùng mã thực thể | FAIL với `DUPLICATE_ID` | FAIL as expected (`G6-A-01, G6-L03`) | **PASS** |
| `P25-12`: Fixture 3 – Missing RequirementID | Kiểm định bài học `published` thiếu `requirementIds` | FAIL với `PUBLISHED_LESSON_MISSING_REQUIREMENT` | FAIL as expected (`PUBLISHED_LESSON_MISSING_REQUIREMENT`) | **PASS** |
| `P25-13`: Fixture 4 – Dangling reference | Kiểm định khóa ngoại không tồn tại | FAIL với `DANGLING_REFERENCE` | FAIL as expected (3 dangling references caught) | **PASS** |
| `P25-14`: Fixture 5 – Unapproved AI mapping & AI in Req Bank | Kiểm định chặn AI chưa duyệt hoặc đưa AI vào Requirement Bank | FAIL với `UNAPPROVED_AI_MAPPING` & `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` | FAIL as expected | **PASS** |
| `P25-15`: Fixture 6 – Invalid question | Kiểm định câu hỏi thiếu `requirementId`, `correctAnswer`, `explanation` | FAIL với 3 mã lỗi Question | FAIL as expected | **PASS** |
| `P25-16`: Fixture 7 – Tampered `officialText` with recomputed self-hash | Kiểm định sửa `officialText` rồi tự tính lại SHA-256 | FAIL với `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` | FAIL as expected (Trusted Snapshot caught recomputed hash tampering) | **PASS** |
| `P25-17`: Round 1–5 Negative Tests | Kiểm định bắt lỗi `E03` thêm `"văn bản"`, `A09` thiếu `"bằng"`, `D01` thiếu `"về"` / `"; nêu"`, `D05` mất ví dụ ngoặc đơn, `E07` viết `"lôgic"`, `F03` mất `“hiểu”`, `B03/C07/E01/E04` diễn giải, `5.2.TC1a->G6-A-07`, `Core Competency != 5`, `TT02.driveId = Phụ lục III` | FAIL và bắt đủ 23 lỗi | Caught all 23 Round 1–5 content, transcription, and governance violations | **PASS** |
| `P25-18`: Importer initial load (92 entities) | Kiểm định nạp 92 thực thể vào `IntermediateCurriculumAdapter` | `inserted = 92, duplicates = 0` | Run 1: `inserted=92, totalInAdapter=92` | **PASS** |
| `P25-19`: Importer idempotency (Run 2 & Run 3) | Kiểm định chạy lại nhiều lần không sinh duplicate | `inserted = 0, updated = 0, unchanged = 92` | Run 2 & Run 3: `inserted=0, updated=0, unchanged=92, duplicatesCreated=0` | **PASS** |
| `P25-20`: Importer atomic rejection & Production isolation | Kiểm định từ chối nguyên tử khi dữ liệu lỗi & bảo toàn 19 file production | `adapterCount = 0`, 19 file nguyên vẹn | Rejected invalid dataset with 0 partial writes; 19 production files intact | **PASS** |

---

## PHẦN B — KẾT QUẢ REGRESSION PHASE 1.5 & PHASE 1 (106/106 PASS)

1. **Regression Phase 1.5 (`node tools/agent-infra/demo-phase1-5.js`):** **27 / 27 PASS, 0 FAILED**.
2. **Regression Phase 1 (`node scratch/audit-test.js`):** **79 / 79 PASS, 0 FAILED**.

---

## KẾT LUẬN

```text
PHASE 2 / P2.5 FIX ROUND 5: READY_FOR_FINAL_REVIEW
```
