# PHASE 2 / TASK P2.5 — VALIDATION & IMPORTER EVIDENCE REPORT (`VALIDATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / TASK P2.5 ONLY`
- **Công cụ kiểm định:** [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) & [tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js)
- **Bộ chạy kiểm thử:** [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js)

---

## 1. Kết quả kiểm định bộ dữ liệu chuẩn Lớp 6 (100% Normalized Grade 6 Data)

| Bảng thực thể | File nguồn | Số lượng bản ghi | Kết quả Schema | Kết quả Tham chiếu & Nghiệp vụ |
| :--- | :--- | :---: | :---: | :---: |
| `sources` | [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) | 4 | PASS | PASS |
| `topics` | [data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json) | 6 (`G6-A`..`G6-F`) | PASS | PASS |
| `competencies` | [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json) | 8 (`NLa`..`NLe` + 3 NLS) | PASS | PASS |
| `requirements` | [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) | 32 (`G6-A-01`..`G6-F-03`) | PASS | PASS (SHA-256 khớp 100%) |
| `nlsMappings` | [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json) | 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | PASS | PASS |
| `aiMappings` | [data/competencies/ai-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/ai-mappings-g6.json) | 0 | PASS | PASS (Không tự chèn AI) |
| `lessons` | [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json) | 17 (`G6-L01`..`G6-L17`) | PASS | PASS |
| `activities` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-A1`..`A4`) | PASS | PASS |
| `questions` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`G6-L03-Q01`..`Q04`) | PASS | PASS |
| `evidences` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 4 (`EVD-G6-L03-01`..`04`) | PASS | PASS |
| `resources` | [data/resources/resources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/resources/resources-g6.json) | 2 (`RES-G6-L03-01`..`02`) | PASS | PASS |
| `masteryRules` | [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json) | 1 (`MR-G6-L03`) | PASS | PASS |
| **TỔNG CỘNG** | **9 files dữ liệu chuẩn hóa** | **85 thực thể** | **0 lỗi** | **PASS (100%)** |

---

## 2. Bằng chứng kiểm định các Fixtures bắt buộc (Valid & Invalid Fixtures)

| Fixture | File Fixture | Kỳ vọng | Kết quả thực tế | Mã lỗi Validator bắt được (Exact Reason Codes) |
| :--- | :--- | :---: | :---: | :--- |
| **1. Valid Grade 6 dataset** | [valid-grade6.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/valid-grade6.fixture.json) | `PASS` | **PASS** (`valid: true, errorCount: 0`) | Không có lỗi |
| **2. Duplicate ID** | [duplicate-id.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/duplicate-id.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `DUPLICATE_ID` trên `Requirement (G6-A-01)` và `Lesson (G6-L03)` |
| **3. Missing RequirementID** | [missing-requirement-id.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/missing-requirement-id.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `PUBLISHED_LESSON_MISSING_REQUIREMENT` trên `Lesson (G6-L03)` |
| **4. Dangling reference** | [dangling-reference.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/dangling-reference.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `DANGLING_REFERENCE` trên `Lesson.topicId (G6-NON-EXISTENT-TOPIC)`, `Lesson.requirementIds (G6-Z-99)`, `Question.lessonId (G6-L999)` |
| **5. Unapproved AI mapping** | [unapproved-ai-mapping.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/unapproved-ai-mapping.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `UNAPPROVED_AI_MAPPING` (`status="published"` nhưng `teacherApproved=false`) & `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| **6. Invalid question** | [invalid-question.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/invalid-question.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| **7. Policy violations (Activity, Resource, Tampered YCCĐ)** | [policy-violations.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/policy-violations.fixture.json) | `FAIL` | **FAIL** (`valid: false`) | `ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS`, `RESOURCE_MISSING_URL`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |

---

## 3. Bằng chứng tính Idempotent của Importer ([tools/curriculum/staging-store.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/staging-store.json))

Đã thực thi 3 lần nạp liên tiếp cùng bộ dữ liệu chuẩn Lớp 6 (85 thực thể) vào `IntermediateCurriculumAdapter`:

| Lần chạy | `traceId` | `totalProcessed` | `totalInserted` | `totalUpdated` | `totalUnchanged` | `duplicatesCreated` | Tổng bản ghi trong Adapter |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run 1 (Khởi tạo)** | `TRACE-P25-RUN-1` | 85 | **85** | 0 | 0 | **0** | 85 |
| **Run 2 (Retry #1)** | `TRACE-P25-RUN-2` | 85 | **0** | 0 | **85** | **0** | 85 |
| **Run 3 (Retry #2)** | `TRACE-P25-RUN-3` | 85 | **0** | 0 | **85** | **0** | 85 |
| **Run 4 (Dữ liệu lỗi)** | `TRACE-P25-REJECT` | 0 (Aborted) | **0** | 0 | 0 | **0** | 0 (Atomic rollback) |

---

## 4. Kết luận

```text
PHASE 2 / P2.5: PASS
```
