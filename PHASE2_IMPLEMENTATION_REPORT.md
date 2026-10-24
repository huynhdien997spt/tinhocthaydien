# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / TASK P2.5 ONLY`
- **Mục tiêu:** Xây dựng JSON Schemas + Validator + Idempotent Importer + Test Fixtures cho Data Foundation Lớp 6.
- **Nguyên tắc an toàn:** Không xây dựng Learning Engine, không sửa UI, không migrate dữ liệu production, không sửa API production (`StudentUID`, `Authentication`, `Session`, `Progress`, `Responses`, `Exit Ticket`, `Teacher permissions`).

---

## 1. Tóm tắt hạng mục đã triển khai

### 1.1. Chuẩn hóa 12 JSON Schemas (`schemas/`)
Đã thiết kế và xuất bản đầy đủ 12 file JSON Schema chuẩn Draft 2020-12 cho toàn bộ các thực thể của Curriculum Engine:
- `Source`, `Topic`, `Lesson`, `Requirement`, `Competency`, `NLSMapping`, `AICompetencyMapping`, `Activity`, `Question`, `Evidence`, `Resource`, `MasteryRule`.

### 1.2. Materialize dữ liệu chuẩn hóa Lớp 6 (`data/`)
1. **Chủ đề A–F ([data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json)):**
   - `G6-A`: Máy tính và cộng đồng (6 tiết)
   - `G6-B`: Mạng máy tính và Internet (5 tiết)
   - `G6-C`: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin (6 tiết)
   - `G6-D`: Đạo đức, pháp luật và văn hoá trong môi trường số (3 tiết)
   - `G6-E`: Ứng dụng tin học (9 tiết)
   - `G6-F`: Giải quyết vấn đề với sự trợ giúp của máy tính (6 tiết)
2. **Ngân hàng Yêu cầu cần đạt ([data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json)):**
   - Đầy đủ 32 mã YCCĐ từ `G6-A-01` đến `G6-F-03` (`G6-A-01..10`, `G6-B-01..04`, `G6-C-01..05`, `G6-D-01..04`, `G6-E-01..06`, `G6-F-01..03`).
   - Mỗi YCCĐ lưu kèm `officialTextHash` (SHA-256), `version: 1`, `reviewStatus: "approved_official"`, liên kết tới chủ đề, bài học PPCT và năng lực tin học cốt lõi.
3. **Khung năng lực & Năng lực số ([data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json) & [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json)):**
   - 5 năng lực tin học cốt lõi: `NLa`, `NLb`, `NLc`, `NLd`, `NLe`.
   - 3 chỉ báo Năng lực số pilot cho Bài 3 (`G6-L03`): `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`.
   - Tuân thủ tuyệt đối quy tắc AI: Không tự thêm năng lực AI vào Requirement Bank (`data/competencies/ai-mappings-g6.json` khởi tạo rỗng `[]`).
4. **Phân phối chương trình Bài 1–17 ([data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json)):**
   - Chuẩn hóa đầy đủ 17 bài học `G6-L01` ... `G6-L17` (tổng 35 tiết thực học).
5. **Golden Lesson Fixture `G6-L03` ([data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json)):**
   - `lessonId = "G6-L03"`, `title = "Thông tin trong máy tính"`, `topicId = "G6-A"`, `durationMinutes = 90`.
   - `requirementIds = ["G6-A-07", "G6-A-08", "G6-A-09", "G6-A-10"]`.
   - `nlsCodes = ["1.3.TC1a", "5.2.TC1a", "5.2.TC1b"]`.
   - Gồm 4 Activities (`G6-L03-A1..A4`), 4 Questions (`G6-L03-Q01..Q04`), 4 Evidences (`EVD-G6-L03-01..04`), 2 Resources (`RES-G6-L03-01..02`) và 1 MasteryRule (`MR-G6-L03`). Chỉ dùng làm fixture dữ liệu, không can thiệp UI.

### 1.3. Bộ kiểm tra toàn vẹn dữ liệu ([tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js))
Kiểm tra đồng thời JSON Schema và 10 quy tắc nghiệp vụ bắt buộc:
1. `DUPLICATE_ID`: Phát hiện trùng ID trong cùng bảng hoặc xuyên bảng.
2. `DANGLING_REFERENCE`: Phát hiện khóa ngoại / tham chiếu tới ID không tồn tại.
3. `PUBLISHED_LESSON_MISSING_REQUIREMENT`: Bài học `status = "published"` nhưng không có `RequirementID`.
4. `QUESTION_MISSING_REQUIREMENT`: Câu hỏi thiếu `RequirementID`.
5. `QUESTION_MISSING_CORRECT_ANSWER`: Câu hỏi thiếu `correctAnswer`.
6. `QUESTION_MISSING_EXPLANATION`: Câu hỏi thiếu `explanation`.
7. `ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS`: Hoạt động không gắn `requirementIds` và cũng không có `educationalPurposeApproved = true`.
8. `RESOURCE_MISSING_URL`: Học liệu cần URL (`requiresUrl = true` hoặc loại trực tuyến) nhưng `url` rỗng.
9. `UNAPPROVED_AI_MAPPING` & `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK`: Mapping AI ở trạng thái `published` nhưng `teacherApproved !== true`, hoặc tự ý gắn mã AI vào Requirement Bank.
10. `OFFICIAL_REQUIREMENT_TEXT_TAMPERED`: Nội dung `officialText` của YCCĐ bị sửa đổi không khớp mã băm `officialTextHash` / trạng thái review.

### 1.4. Bộ nạp Idempotent & Adapter trung gian ([tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js))
- `CurriculumImporter` luôn gọi `CurriculumValidator.validateDataset()` trước khi nạp; nếu có bất kỳ lỗi nào sẽ hủy toàn bộ giao dịch nạp (0 partial writes).
- `IntermediateCurriculumAdapter` quản lý 12 bảng dữ liệu chuẩn hóa trong bộ nhớ trung gian và xuất snapshot ra [tools/curriculum/staging-store.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/staging-store.json), tách biệt hoàn toàn với Google Sheets production.
- Tính toán `contentHash` (SHA-256 canonical JSON) trên từng bản ghi theo khóa chính: khi chạy lại (retry) cùng dữ liệu, 100% bản ghi đi vào nhánh `unchanged`, `duplicatesCreated = 0`.

---

## 2. Danh sách file tạo mới và file sửa đổi

### 2.1. Danh sách file tạo mới (33 files)

**JSON Schemas (12 files):**
1. [schemas/source.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/source.schema.json)
2. [schemas/topic.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/topic.schema.json)
3. [schemas/lesson.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/lesson.schema.json)
4. [schemas/requirement.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/requirement.schema.json)
5. [schemas/competency.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/competency.schema.json)
6. [schemas/nls-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/nls-mapping.schema.json)
7. [schemas/ai-competency-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/ai-competency-mapping.schema.json)
8. [schemas/activity.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/activity.schema.json)
9. [schemas/question.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/question.schema.json)
10. [schemas/evidence.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/evidence.schema.json)
11. [schemas/resource.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/resource.schema.json)
12. [schemas/mastery-rule.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/mastery-rule.schema.json)

**Normalized Pilot Data Lớp 6 (9 files):**
13. [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json)
14. [data/curriculum/topics-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/topics-g6.json)
15. [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json)
16. [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json)
17. [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json)
18. [data/competencies/ai-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/ai-mappings-g6.json)
19. [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json)
20. [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json)
21. [data/resources/resources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/resources/resources-g6.json)

**Tools, Fixtures & Staging Store (11 files):**
22. [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js)
23. [tools/curriculum/importer.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/importer.js)
24. [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js)
25. [tools/curriculum/staging-store.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/staging-store.json)
26. [tools/curriculum/fixtures/valid-grade6.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/valid-grade6.fixture.json)
27. [tools/curriculum/fixtures/duplicate-id.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/duplicate-id.fixture.json)
28. [tools/curriculum/fixtures/missing-requirement-id.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/missing-requirement-id.fixture.json)
29. [tools/curriculum/fixtures/dangling-reference.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/dangling-reference.fixture.json)
30. [tools/curriculum/fixtures/unapproved-ai-mapping.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/unapproved-ai-mapping.fixture.json)
31. [tools/curriculum/fixtures/invalid-question.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/invalid-question.fixture.json)
32. [tools/curriculum/fixtures/policy-violations.fixture.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/fixtures/policy-violations.fixture.json)

**Báo cáo Phase 2 / P2.5 (3 báo cáo mới):**
33. [PHASE2_SCHEMA.md](file:///Users/huynhvandien/tinhocthaydien/PHASE2_SCHEMA.md), [PHASE2_IMPLEMENTATION_REPORT.md](file:///Users/huynhvandien/tinhocthaydien/PHASE2_IMPLEMENTATION_REPORT.md), [VALIDATION_REPORT.md](file:///Users/huynhvandien/tinhocthaydien/VALIDATION_REPORT.md)

### 2.2. Danh sách file sửa đổi
- **Production code (`index.html`, `teacher/index.html`, `assets/js/**`, `backend/StudentV2.gs`, `backend/Teacher.gs`, `data/*.js`):** **0 file bị sửa đổi** (`git diff` sạch 100%).
- **Báo cáo kiểm thử tổng hợp:** Cập nhật [TEST_REPORT.md](file:///Users/huynhvandien/tinhocthaydien/TEST_REPORT.md) bổ sung kết quả kiểm thử Phase 2 / P2.5 và kết quả regression Phase 1 + Phase 1.5.

---

## 3. Kết luận

```text
PHASE 2 / P2.5: PASS
```
