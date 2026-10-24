# PHASE 2 / TASK P2.5 — CURRICULUM DATA FOUNDATION SCHEMA SPECIFICATION (`PHASE2_SCHEMA.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ONLY`
- **Chuẩn JSON Schema:** Draft 2020-12 (`https://json-schema.org/draft/2020-12/schema`)
- **Trạng thái Data Contract:** Tuân thủ nghiêm ngặt **Phase 2 – Data Contract Curriculum Engine** (được khóa tự động qua `validateDataContractLock()` trong [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js)). Mọi thay đổi trường bắt buộc nếu không có `APPROVED_CONTRACT_CHANGE` sẽ bị chặn với lỗi `CONTRACT_DRIFT_DETECTED`.

---

## 1. Cấu trúc thư mục Data Foundation

```text
data/
  curriculum/
    sources-g6.json              # 5 nguồn tài liệu chính thức đã kiểm chứng 2 lớp (Lớp A & Lớp B)
    topics-g6.json               # 6 chủ đề A–F lớp 6
    ppct-distribution-g6.json    # Phân bổ 35 tiết/năm (28 tiết bài học + 3 tiết ôn tập + 4 tiết kiểm tra)
  requirements/
    requirements-g6.json         # 38 YCCĐ riêng biệt (A=10, B=4, C=7, D=5, E=9, F=3) có officialText & studentFriendlyText
  competencies/
    competencies-g6.json         # NLa–NLe + NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b
    nls-mappings-g6.json         # Mapping NLS Bài 3 tách biệt rõ khung TT 02/2025 và Phụ lục III / KHBD trường
    ai-mappings-g6.json          # Mapping NL AI tách biệt (mặc định [])
  lessons/
    lessons-g6-ppct.json         # 16 bài học nội dung thực tế (Bài 1–13, 15–17; không có Bài 14)
    G6-L03.golden.json           # Golden Lesson fixture cho Bài 3 (isFixtureOnly = true)
  resources/
    resources-g6.json            # Danh mục học liệu chuẩn hóa lớp 6

schemas/
  source.schema.json
  topic.schema.json
  lesson.schema.json
  requirement.schema.json
  competency.schema.json
  nls-mapping.schema.json
  ai-competency-mapping.schema.json
  activity.schema.json
  question.schema.json
  evidence.schema.json
  resource.schema.json
  mastery-rule.schema.json

tools/
  curriculum/
    trusted-official-requirements-g6.json  # Trusted Official Snapshot 38 YCCĐ CTGDPT 2018
    validator.js                           # Bộ kiểm tra Schema + Data Contract Lock + 16 quy tắc chuyên môn & toàn vẹn
    importer.js                            # Bộ nạp Idempotent + IntermediateCurriculumAdapter
    test-p2-5.js                           # Bộ kiểm thử tự động 20 kịch bản Phase 2 / P2.5
    staging-store.json                     # Snapshot lưu trữ trung gian (94 thực thể, không chạm production)
    fixtures/                              # Các bộ test fixtures bắt buộc (valid & invalid)
```

---

## 2. Đặc tả chi tiết 12 JSON Schemas theo đúng Data Contract (Blocker 3)

### 2.1. `Source` ([schemas/source.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/source.schema.json))
- **Trường bắt buộc theo Data Contract & Source Verification:**
  `sourceId`, `title`, `sourceType`, `grade`, `versionOrSchoolYear`, `url`, `authority`, `priority`, `licenseNote`, `status`, `createdAt`, `updatedAt`, `verifiedAt`, `accessedAt`, `verificationStatus`, `scopeUsed`.
- **Quy tắc Validator:** Chặn URL dạng trang chủ chung (`SOURCE_URL_TOO_GENERIC`) và yêu cầu `verificationStatus === "verified"` (`SOURCE_NOT_VERIFIED`).

### 2.2. `Topic` ([schemas/topic.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/topic.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `topicId`, `grade`, `code`, `title`, `order`, `officialSourceId`, `status`.

### 2.3. `Lesson` ([schemas/lesson.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/lesson.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `lessonId`, `grade`, `topicId`, `title`, `order`, `durationMinutes`, `requirementIds[]`, `competencyIds[]`, `activityIds[]`, `assessmentPlan`, `resourceIds[]`, `status`, `version`, `sourceRefs[]`.
- **Quy tắc PPCT:** Chỉ chứa đúng 16 bài nội dung (`G6-L01..G6-L13`, `G6-L15..G6-L17`), nghiêm cấm `G6-L14` (`PHANTOM_LESSON_DETECTED`), và kiểm tra `durationMinutes === periods * 45` (`PPCT_PERIOD_MISMATCH`).

### 2.4. `Requirement` ([schemas/requirement.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/requirement.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `requirementId`, `grade`, `topicId`, `officialText`, `studentFriendlyText`, `officialSourceId`, `competencyIds[]`, `evidenceTypes[]`, `status`, `version`.
- **Trường mở rộng hợp lệ:** `lessonIds[]`, `nlsMappings[]`, `aiCompetencyMappings[]`, `officialTextHash`, `reviewStatus`, `supplementaryKnowledge`.

### 2.5. `Competency` ([schemas/competency.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/competency.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `competencyId`, `name`, `levelScope`, `officialDescription`, `officialSourceId`.

### 2.6. `Activity` ([schemas/activity.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/activity.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `activityId`, `lessonId`, `order`, `activityType`, `objective`, `instruction`, `requirementIds[]`, `expectedEvidenceTypes[]`, `required`, `supportPolicyId`.
- **Trường mở rộng hợp lệ:** `resourceIds[]`, `toolIds[]`, `estimatedMinutes`, `allowExternalNavigation`, `scoringMethod`, `educationalPurposeApproved`.

### 2.7. `Question` ([schemas/question.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/question.schema.json))
- **Trường bắt buộc theo Data Contract:**
  `questionId`, `grade`, `topicId`, `lessonId`, `requirementId`, `questionType`, `cognitiveLevel`, `questionText`, `correctAnswer`, `explanation`, `maxScore`, `status`.
- **Ghi chú `PROPOSED_CHANGE` (Chờ duyệt cho các Phase sau, chưa áp dụng trong P2.5):**
  > Trong P2.5, schema `Question` giữ nguyên trường đơn `requirementId` (string) theo đúng Data Contract đã chốt. Nếu ở Phase 3/4 xuất hiện câu hỏi vận dụng tổng hợp cần đo đồng thời nhiều YCCĐ, đề xuất (`PROPOSED_CHANGE`) bổ sung trường tùy chọn `secondaryRequirementIds?: string[]` trong khi vẫn giữ nguyên `requirementId` làm YCCĐ chính.

### 2.8. `Evidence` ([schemas/evidence.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/evidence.schema.json))
- **Bản chất:** Minh chứng học tập thật của học sinh (không phải template mô tả hoạt động).
- **Trường bắt buộc theo Data Contract:**
  `evidenceId`, `studentUid`, `schoolYear`, `lessonId`, `requirementId`, `evidenceType`, `sourceActivityId`, `submittedAt`, `evaluationStatus`.
- **Trường mở rộng hợp lệ:** `questionId`, `productId`, `score`, `maxScore`, `isCorrect`, `rubricResult`, `teacherFeedback`, `aiFeedback`.

### 2.9. `MasteryRule` ([schemas/mastery-rule.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/mastery-rule.schema.json))
- **Bản chất:** Đánh giá mức đạt theo từng `Requirement` (`requirementId`), với 4 trạng thái chuẩn: `insufficient_evidence`, `developing`, `achieved`, `extended`.
- **Trường bắt buộc theo Data Contract:**
  `masteryRuleId`, `requirementId`, `minimumEvidenceCount`, `requiredEvidenceTypes[]`, `thresholds`, `recencyRule`, `teacherOverrideAllowed`.

### 2.10. `NLSMapping`, `AICompetencyMapping`, `Resource`
- [schemas/nls-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/nls-mapping.schema.json): Bắt buộc tách biệt `frameworkSourceId` (`SRC-TT02-2025-NLS`) và `mappingSourceId` (`SRC-PHULUC3-KHBD-VIETHOA-2026`), đồng thời khóa `isOfficialGdpt2018Requirement: false`.
- [schemas/ai-competency-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/ai-competency-mapping.schema.json): Bắt buộc `teacherApproved = true` trước khi `status = "published"`.
- [schemas/resource.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/resource.schema.json): Bắt buộc `url` không rỗng khi `requiresUrl = true`.

---

## 3. Kết luận

```text
PHASE 2 / P2.5 FIX: READY_FOR_REVIEW
```
