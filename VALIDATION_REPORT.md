# PHASE 2 / TASK P2.5 — VALIDATION & IMPORTER EVIDENCE REPORT (`VALIDATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 2 ONLY`
- **Công cụ kiểm định:** [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) & [tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js)
- **Trusted Official Snapshot:** [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json) (đầy đủ provenance `sourceId`, `sourceDocumentDriveId = "13o_7GOH_en10qIrlgLTyqrIlJSgCZxma"`, `sourceOfficialUrl` `ItemID=146721`, `sourceSection`, `verifiedAt`)

---

## 1. Kết quả kiểm định bộ dữ liệu chuẩn Lớp 6 (95 thực thể + PPCT Distribution – 100% PASS)

| Bảng thực thể | File nguồn | Số lượng bản ghi | Kết quả Schema & Data Contract | Kết quả Kiểm chứng Chuyên môn & Tham chiếu (Round 2) |
| :--- | :--- | :---: | :---: | :--- |
| `sources` | [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) | **6** | PASS | PASS (Đúng 5 Drive ID gốc của thầy + VBPL `ItemID=146721` & `175173`; không có Doc ID trung gian; không overclaim external verification) |
| `topics` | [data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json) | 6 (`G6-A`..`G6-F`) | PASS | PASS (`A=10, B=4, C=7, D=5, E=9, F=3`) |
| `competencies` | [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json) | 8 (`NLa`..`NLe` + 3 NLS) | PASS | PASS |
| `requirements` | [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) | **38** (`G6-A-01`..`G6-F-03`) | PASS | PASS (Khớp 100% Trusted Snapshot V2; giữ bất biến `A05/A06`, `B02/B03`, `E01..E09`; nguyên văn `G6-A-09`, `G6-B-03`, `G6-C-01`, `G6-C-07`, `G6-D-01..05`) |
| `nlsMappings` | [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json) | 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | PASS | PASS (Dẫn nguồn `SRC-TT02-2025-NLS` + `SRC-PHULUC3-TIN6-VIETHOA-2026` + `SRC-KHBD-TIN6-BAI3-VIETHOA`) |
| `aiMappings` | [data/competencies/ai-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/ai-mappings-g6.json) | 0 | PASS | PASS (0 mã AI trong Requirement Bank) |
| `lessons` | [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json) | **16** (`G6-L01..13`, `G6-L15..17`) | PASS | PASS (Tổng **29 tiết bài học**; **Bài 5 = 2 tiết / 90 phút**; Bài 8, 13, 17 = 1 tiết / 45 phút; không có Bài 14) |
| `ppctDistribution` | [data/curriculum/ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json) | 1 (`35 tiết/năm`) | PASS | PASS (`29 lesson + 2 review + 4 assessment = 35 tiết`; không có `"Ôn tập giữa học kì I"`; khớp lịch `periodSchedule` 1..35) |
| `activities` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-A1`..`A4`) | PASS | PASS (`isFixtureOnly = true`) |
| `questions` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-Q01`..`Q04`) | PASS | PASS (Dùng `requirementId` đơn và `questionText`) |
| `evidences` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`EVD-G6-L03-01`..`04`) | PASS | PASS |
| `resources` | [data/resources/resources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/resources/resources-g6.json) | 2 (`RES-G6-L03-01`..`02`) | PASS | PASS |
| `masteryRules` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`MR-G6-A-07`..`MR-G6-A-10`) | PASS | PASS |
| **TỔNG CỘNG** | **10 files dữ liệu chuẩn hóa** | **95 thực thể** | **0 lỗi** | **PASS (100%)** |

---

## 2. Bằng chứng kiểm định các Fixtures & Content Quality Negative Tests (Round 1 + Round 2)

| Kịch bản kiểm định | Kỳ vọng | Kết quả thực tế | Mã lỗi Validator bắt được (Exact Reason Codes) |
| :--- | :---: | :---: | :--- |
| **1. Valid Grade 6 dataset (95 entities + 35-period schedule)** | `PASS` | **PASS** (`errorCount: 0`) | Không có lỗi |
| **2. Duplicate ID** | `FAIL` | **FAIL** | `DUPLICATE_ID` (`G6-A-01`, `G6-L03`) |
| **3. Missing RequirementID** | `FAIL` | **FAIL** | `PUBLISHED_LESSON_MISSING_REQUIREMENT` (`G6-L03`) |
| **4. Dangling reference** | `FAIL` | **FAIL** | `DANGLING_REFERENCE` (`G6-NON-EXISTENT-TOPIC`, `G6-Z-99`, `G6-L999`) |
| **5. Unapproved AI mapping & AI in Req Bank** | `FAIL` | **FAIL** | `UNAPPROVED_AI_MAPPING`, `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| **6. Invalid question** | `FAIL` | **FAIL** | `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| **7. Sửa `officialText` và tự tính lại SHA-256 hash** | `FAIL` | **FAIL** | `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **8. Thiếu số lượng YCCĐ (< 38) hoặc sai số lượng theo Topic** | `FAIL` | **FAIL** | `REQUIREMENT_COUNT_MISMATCH`, `TOPIC_REQUIREMENT_COUNT_MISMATCH` |
| **9. Đảo mã `RequirementID` (`A05/A06`, `B02/B03`, `E01..E09`)** | `FAIL` | **FAIL** | `REQUIREMENT_STABLE_ID_DRIFT` |
| **10. Xuất hiện Bài 14 (`G6-L14`) hoặc `"Ôn tập giữa học kì I"`** | `FAIL` | **FAIL** | `PHANTOM_LESSON_DETECTED`, `PHANTOM_REVIEW_SESSION_DETECTED` |
| **11. Sai số tiết Bài 5 (1 tiết thay vì 2 tiết)** | `FAIL` | **FAIL** | `PPCT_PERIOD_MISMATCH` |
| **12. Dùng Drive ID trung gian (`1dadBF...` / `15pCBh...`) hoặc URL chung** | `FAIL` | **FAIL** | `FORBIDDEN_INTERMEDIATE_DRIVE_ID`, `SOURCE_URL_TOO_GENERIC` |
| **13. Trusted Snapshot thiếu provenance (`sourceDocumentDriveId`)** | `FAIL` | **FAIL** | `TRUSTED_SNAPSHOT_MISSING_PROVENANCE` |
| **14. Thay đổi schema bắt buộc trái Data Contract** | `FAIL` | **FAIL** | `CONTRACT_DRIFT_DETECTED` |

---

## 3. Bằng chứng tính Idempotent của Importer ([tools/curriculum/staging-store.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/staging-store.json))

| Lần chạy | `traceId` | `totalProcessed` | `totalInserted` | `totalUpdated` | `totalUnchanged` | `duplicatesCreated` | Tổng bản ghi trong Adapter |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run 1 (Khởi tạo)** | `TRACE-P25-RUN-1` | 95 | **95** | 0 | 0 | **0** | 95 |
| **Run 2 (Retry #1)** | `TRACE-P25-RUN-2` | 95 | **0** | 0 | **95** | **0** | 95 |
| **Run 3 (Retry #2)** | `TRACE-P25-RUN-3` | 95 | **0** | 0 | **95** | **0** | 95 |
| **Run 4 (Dữ liệu lỗi)** | `TRACE-P25-REJECT` | 0 (Aborted) | **0** | 0 | 0 | **0** | 0 (Atomic rollback) |

---

## 4. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 2: READY_FOR_REVIEW
```
