# PHASE 2 / TASK P2.5 — CURRICULUM DATA FOUNDATION SCHEMA SPECIFICATION (`PHASE2_SCHEMA.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 2 ONLY`
- **Chuẩn JSON Schema:** Draft 2020-12 (`https://json-schema.org/draft/2020-12/schema`)
- **Trạng thái Data Contract:** Tuân thủ nghiêm ngặt **Phase 2 – Data Contract Curriculum Engine** (được khóa tự động qua `validateDataContractLock()` trong [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js)). Mọi thay đổi trường bắt buộc nếu không có `APPROVED_CONTRACT_CHANGE` sẽ bị chặn với lỗi `CONTRACT_DRIFT_DETECTED`.

---

## 1. Cấu trúc thư mục Data Foundation

```text
data/
  curriculum/
    sources-g6.json              # 6 nguồn tài liệu chuẩn hóa (5 Drive ID gốc của thầy + VBPL ItemID=146721 & 175173)
    topics-g6.json               # 6 chủ đề A–F lớp 6
    ppct-distribution-g6.json    # Phân bổ 35 tiết/năm (29 lesson + 2 review + 4 assessment = 35 tiết) & lịch periodSchedule 1..35
  requirements/
    requirements-g6.json         # 38 YCCĐ riêng biệt (A=10, B=4, C=7, D=5, E=9, F=3) với RequirementID bất biến & nguyên văn CTGDPT 2018
  competencies/
    competencies-g6.json         # NLa–NLe + NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b
    nls-mappings-g6.json         # Mapping NLS Bài 3 dẫn nguồn TT 02/2025 + Phụ lục III (1eB5ZVwD...) + KHBD Bài 3 (1vMj4Yly...)
    ai-mappings-g6.json          # Mapping NL AI tách biệt (mặc định [])
  lessons/
    lessons-g6-ppct.json         # 16 bài học nội dung thực tế = 29 tiết (Bài 1–13, 15–17; Bài 5 = 2 tiết; không có Bài 14)
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
    trusted-official-requirements-g6.json  # Trusted Official Snapshot 38 YCCĐ kèm đầy đủ provenance
    validator.js                           # Bộ kiểm tra Schema + Data Contract Lock + Provenance + PPCT Schedule + Immutable IDs
    importer.js                            # Bộ nạp Idempotent + IntermediateCurriculumAdapter
    test-p2-5.js                           # Bộ kiểm thử tự động 20 kịch bản Phase 2 / P2.5 Round 2
    staging-store.json                     # Snapshot lưu trữ trung gian (95 thực thể, không chạm production)
    fixtures/                              # Các bộ test fixtures bắt buộc (valid & invalid)
```

---

## 2. Đặc tả chi tiết 12 JSON Schemas theo đúng Data Contract

### 2.1. `Source` ([schemas/source.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/source.schema.json))
- **Trường bắt buộc:**
  `sourceId`, `title`, `sourceType`, `grade`, `versionOrSchoolYear`, `url`, `authority`, `priority`, `licenseNote`, `status`, `createdAt`, `updatedAt`, `verifiedAt`, `accessedAt`, `verificationStatus`, `scopeUsed`.
- **Trường kiểm chứng mở rộng (Round 2):**
  `driveId`, `internalVerificationStatus` (`verified` | `pending` | `not_applicable`), `externalVerificationStatus` (`verified` | `pending` | `not_applicable_internal_only`), `externalReferenceUrl`, `verificationNote`.
- **Quy tắc Validator:**
  - Chặn URL trang chủ chung (`SOURCE_URL_TOO_GENERIC`).
  - Chặn các Google Doc ID trung gian của ChatGPT (`1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U`, `15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw`) với lỗi `FORBIDDEN_INTERMEDIATE_DRIVE_ID`.
  - Chặn hành vi overclaim `both_verified` / `official_internet_verified` khi `externalVerificationStatus === "pending"` (`SOURCE_OVERCLAIMED_VERIFICATION`).

### 2.2. `Topic` ([schemas/topic.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/topic.schema.json))
- **Trường bắt buộc:** `topicId`, `grade`, `code`, `title`, `order`, `officialSourceId`, `status`.

### 2.3. `Lesson` ([schemas/lesson.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/lesson.schema.json))
- **Trường bắt buộc:**
  `lessonId`, `grade`, `topicId`, `title`, `order`, `durationMinutes`, `requirementIds[]`, `competencyIds[]`, `activityIds[]`, `assessmentPlan`, `resourceIds[]`, `status`, `version`, `sourceRefs[]`.
- **Trường lịch dạy thực tế:** `periods`, `scheduledPeriods[]` (ví dụ `G6-L04` dạy ở tiết `[7, 9]`, `G6-L05` dạy ở tiết `[10, 11]`, `G6-L12` dạy ở tiết `[25, 27]`).
- **Quy tắc PPCT:** Chỉ chứa đúng 16 bài nội dung = 29 tiết (`G6-L01..G6-L13`, `G6-L15..G6-L17`), nghiêm cấm `G6-L14` (`PHANTOM_LESSON_DETECTED`), và kiểm tra `durationMinutes === periods * 45` (`PPCT_PERIOD_MISMATCH`).

### 2.4. `Requirement` ([schemas/requirement.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/requirement.schema.json))
- **Trường bắt buộc:**
  `requirementId`, `grade`, `topicId`, `officialText`, `studentFriendlyText`, `officialSourceId`, `competencyIds[]`, `evidenceTypes[]`, `status`, `version`.
- **Bảo toàn `RequirementID` bất biến & Nguyên văn CTGDPT 2018:**
  Validator kiểm tra chữ ký ngữ nghĩa bất biến (`IMMUTABLE_REQUIREMENT_SIGNATURES`) cho `G6-A-05/A-06`, `G6-B-02/B-03`, `G6-C-01/C-07`, `G6-D-01..05`, `G6-E-01..09` (`REQUIREMENT_STABLE_ID_DRIFT`) và đối chiếu SHA-256 với [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json) (`OFFICIAL_REQUIREMENT_TEXT_TAMPERED`).

### 2.5. `Competency`, `Activity`, `Question`, `Evidence`, `MasteryRule`, `NLSMapping`, `AICompetencyMapping`, `Resource`
- Giữ nguyên 100% trường bắt buộc theo Data Contract đã chốt.
- Trong [schemas/nls-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/nls-mapping.schema.json), bổ sung `mappingDriveId`, `supplementaryLessonPlanSourceId` (`SRC-KHBD-TIN6-BAI3-VIETHOA`), và `supplementaryLessonPlanDriveId` (`1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp`).

---

## 3. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 2: READY_FOR_REVIEW
```
