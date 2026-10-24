# PHASE 2 / TASK P2.5 — VALIDATION & IMPORTER EVIDENCE REPORT (`VALIDATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 4 ONLY`
- **Công cụ kiểm định:** [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js), [tools/curriculum/audit-requirement-text.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/audit-requirement-text.js) & [tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js)
- **Reviewed Source Transcript:** [tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json)
- **Trusted Official Snapshot:** [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json)

---

## 1. Kết quả kiểm định bộ dữ liệu chuẩn Lớp 6 (92 thực thể + PPCT Distribution – 100% PASS)

| Bảng thực thể | File nguồn | Số lượng bản ghi | Kết quả Schema & Data Contract | Kết quả Kiểm chứng Chuyên môn & Tham chiếu (Round 4) |
| :--- | :--- | :---: | :---: | :--- |
| `sources` | [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) | **6** | PASS | PASS (`SRC-TT02-2025-NLS` có `driveId = null`, `internal = not_available`, `external = verified`, `overall = official_external_verified`; 5 nguồn Drive gốc của thầy giữ nguyên) |
| `topics` | [data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json) | 6 (`G6-A`..`G6-F`) | PASS | PASS (`A=10, B=4, C=7, D=5, E=9, F=3`) |
| `competencies` | [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json) | **5** (`NLa`..`NLe`) | PASS | PASS (Đúng 5 năng lực cốt lõi `NLa`–`NLe`; không có `NLS-*`) |
| `requirements` | [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) | **38** (`G6-A-01`..`G6-F-03`) | PASS | PASS (**38/38 `ExactAfterAllowedNormalization = TRUE`** đối chiếu độc lập với `ctgdpt2018-tin6-yccd.source.json`; đã sửa `G6-A-09`, `G6-D-01`, `G6-D-05`, `G6-E-07`, `G6-F-03`) |
| `nlsMappings` | [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json) | 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | PASS | PASS (`1.3.TC1a, 5.2.TC1a, 5.2.TC1b -> G6-A-09, G6-A-10`; không map vào `G6-A-07`) |
| `aiMappings` | [data/competencies/ai-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/ai-mappings-g6.json) | 0 | PASS | PASS (0 mã AI trong Requirement Bank) |
| `lessons` | [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json) | **16** (`G6-L01..13`, `G6-L15..17`) | PASS | PASS (Tổng **29 tiết bài học**; **Bài 5 = 2 tiết / 90 phút**; không có Bài 14) |
| `ppctDistribution` | [data/curriculum/ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json) | 1 (`35 tiết/năm`) | PASS | PASS (`29 lesson + 2 review + 4 assessment = 35 tiết`; không có `"Ôn tập giữa học kì I"`; khớp lịch `periodSchedule` 1..35) |
| `activities` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-A1`..`A4`) | PASS | PASS (`isFixtureOnly = true`) |
| `questions` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-Q01`..`Q04`) | PASS | PASS |
| `evidences` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`EVD-G6-L03-01`..`04`) | PASS | PASS |
| `resources` | [data/resources/resources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/resources/resources-g6.json) | 2 (`RES-G6-L03-01`..`02`) | PASS | PASS |
| `masteryRules` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`MR-G6-A-07`..`MR-G6-A-10`) | PASS | PASS |
| **TỔNG CỘNG** | **10 files dữ liệu chuẩn hóa** | **92 thực thể** | **0 lỗi** | **PASS (100%)** |

---

## 2. Bằng chứng kiểm định các Negative Tests bắt buộc (Round 1 – Round 4)

| Kịch bản kiểm định âm tính (Negative Test) | Kỳ vọng | Kết quả | Mã lỗi Validator bắt được |
| :--- | :---: | :---: | :--- |
| **`G6-A-09` thiếu `"1 KB bằng xấp xỉ"`** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`G6-D-01` viết `"Giới thiệu được sơ lược một số"` hoặc `"Internet; nêu"`** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`G6-D-05` mất `"(chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...)"`** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`G6-E-07` dùng `"lôgic"` thay vì `"logic"`** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`G6-F-03` mất dấu ngoặc kép quanh `“hiểu”`** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`G6-B-03`, `G6-C-07`, `G6-E-01`, `G6-E-04` thêm/đổi từ** | `FAIL` | **FAIL** | `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| **`5.2.TC1a` map sang `G6-A-07`** | `FAIL` | **FAIL** | `INVALID_NLS_REQUIREMENT_MAPPING` |
| **Core Competency `!= 5` hoặc có `NLS-*`** | `FAIL` | **FAIL** | `CORE_COMPETENCY_COUNT_MISMATCH`, `UNAUTHORIZED_NLS_IN_CORE_COMPETENCY` |
| **`SRC-TT02-2025-NLS.driveId = "1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC"`** | `FAIL` | **FAIL** | `TT02_SOURCE_INVALID_DRIVE_ID` |
| **Trusted Snapshot thiếu provenance / `transcriptionPolicy`** | `FAIL` | **FAIL** | `TRUSTED_SNAPSHOT_MISSING_PROVENANCE` |

---

## 3. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 4: READY_FOR_REVIEW
```
