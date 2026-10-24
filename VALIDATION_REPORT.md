# PHASE 2 / TASK P2.5 — VALIDATION & IMPORTER EVIDENCE REPORT (`VALIDATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ONLY`
- **Công cụ kiểm định:** [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) & [tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js)
- **Trusted Official Snapshot:** [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json)

---

## 1. Kết quả kiểm định bộ dữ liệu chuẩn Lớp 6 (94 thực thể – 100% PASS)

| Bảng thực thể | File nguồn | Số lượng bản ghi | Kết quả Schema & Data Contract | Kết quả Kiểm chứng Chuyên môn & Tham chiếu |
| :--- | :--- | :---: | :---: | :---: |
| `sources` | [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) | 5 | PASS | PASS (`verificationStatus = "verified"`, URL/Drive ID cụ thể) |
| `topics` | [data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json) | 6 (`G6-A`..`G6-F`) | PASS | PASS (`A=10, B=4, C=7, D=5, E=9, F=3`) |
| `competencies` | [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json) | 8 (`NLa`..`NLe` + 3 NLS) | PASS | PASS |
| `requirements` | [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) | **38** (`G6-A-01`..`G6-F-03`) | PASS | PASS (Khớp 100% Trusted Snapshot, có `studentFriendlyText`, `G6-A-09` không chứa `TB` trong `officialText`) |
| `nlsMappings` | [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json) | 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | PASS | PASS (Tách rõ TT 02/2025 và Phụ lục III/KHBD Trường Việt Hoa) |
| `aiMappings` | [data/competencies/ai-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/ai-mappings-g6.json) | 0 | PASS | PASS (0 mã AI trong Requirement Bank) |
| `lessons` | [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json) | **16** (`G6-L01..13`, `G6-L15..17`) | PASS | PASS (Không có Bài 14; đúng số tiết PPCT: Bài 3=2t/90p, Bài 8=1t/45p, Bài 13=1t/45p, Bài 17=1t/45p) |
| `activities` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-A1`..`A4`) | PASS | PASS (`isFixtureOnly = true`) |
| `questions` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-Q01`..`Q04`) | PASS | PASS (Dùng `requirementId` đơn và `questionText`) |
| `evidences` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`EVD-G6-L03-01`..`04`) | PASS | PASS (Đúng cấu trúc minh chứng học sinh theo Data Contract) |
| `resources` | [data/resources/resources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/resources/resources-g6.json) | 2 (`RES-G6-L03-01`..`02`) | PASS | PASS |
| `masteryRules` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`MR-G6-A-07`..`MR-G6-A-10`) | PASS | PASS (Đánh giá theo từng `requirementId` với 4 mức ngưỡng) |
| **TỔNG CỘNG** | **10 files dữ liệu chuẩn hóa** | **94 thực thể** | **0 lỗi** | **PASS (100%)** |

---

## 2. Bằng chứng kiểm định các Fixtures & Content Quality Negative Tests

| Kịch bản kiểm định | Kỳ vọng | Kết quả thực tế | Mã lỗi Validator bắt được (Exact Reason Codes) |
| :--- | :---: | :---: | :--- |
| **1. Valid Grade 6 dataset (94 entities)** | `PASS` | **PASS** (`errorCount: 0`) | Không có lỗi |
| **2. Duplicate ID** | `FAIL` | **FAIL** | `DUPLICATE_ID` (`G6-A-01`, `G6-L03`) |
| **3. Missing RequirementID** | `FAIL` | **FAIL** | `PUBLISHED_LESSON_MISSING_REQUIREMENT` (`G6-L03`) |
| **4. Dangling reference** | `FAIL` | **FAIL** | `DANGLING_REFERENCE` (`G6-NON-EXISTENT-TOPIC`, `G6-Z-99`, `G6-L999`) |
| **5. Unapproved AI mapping & AI in Req Bank** | `FAIL` | **FAIL** | `UNAPPROVED_AI_MAPPING`, `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| **6. Invalid question** | `FAIL` | **FAIL** | `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| **7. Sửa `officialText` và tự tính lại SHA-256 hash** | `FAIL` | **FAIL** | `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` (Bị phát hiện nhờ đối chiếu với `trusted-official-requirements-g6.json`) |
| **8. Thiếu số lượng YCCĐ (< 38) hoặc sai số lượng theo Topic** | `FAIL` | **FAIL** | `REQUIREMENT_COUNT_MISMATCH`, `TOPIC_REQUIREMENT_COUNT_MISMATCH` |
| **9. Xuất hiện Bài 14 (`G6-L14`) trong PPCT** | `FAIL` | **FAIL** | `PHANTOM_LESSON_DETECTED` |
| **10. Sai số tiết/thời lượng PPCT (ví dụ Bài 8 = 2 tiết)** | `FAIL` | **FAIL** | `PPCT_PERIOD_MISMATCH` |
| **11. Source dùng URL trang chủ chung (`https://moet.gov.vn/`)** | `FAIL` | **FAIL** | `SOURCE_URL_TOO_GENERIC` |
| **12. Thay đổi schema bắt buộc trái Data Contract** | `FAIL` | **FAIL** | `CONTRACT_DRIFT_DETECTED` |

---

## 3. Bằng chứng tính Idempotent của Importer ([tools/curriculum/staging-store.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/staging-store.json))

| Lần chạy | `traceId` | `totalProcessed` | `totalInserted` | `totalUpdated` | `totalUnchanged` | `duplicatesCreated` | Tổng bản ghi trong Adapter |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run 1 (Khởi tạo)** | `TRACE-P25-RUN-1` | 94 | **94** | 0 | 0 | **0** | 94 |
| **Run 2 (Retry #1)** | `TRACE-P25-RUN-2` | 94 | **0** | 0 | **94** | **0** | 94 |
| **Run 3 (Retry #2)** | `TRACE-P25-RUN-3` | 94 | **0** | 0 | **94** | **0** | 94 |
| **Run 4 (Dữ liệu lỗi)** | `TRACE-P25-REJECT` | 0 (Aborted) | **0** | 0 | 0 | **0** | 0 (Atomic rollback) |

---

## 4. Kết luận

```text
PHASE 2 / P2.5 FIX: READY_FOR_REVIEW
```
