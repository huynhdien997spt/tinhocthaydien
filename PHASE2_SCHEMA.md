# PHASE 2 / TASK P2.5 — CURRICULUM DATA FOUNDATION SCHEMA SPECIFICATION (`PHASE2_SCHEMA.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 3 ONLY`
- **Chuẩn JSON Schema:** Draft 2020-12 (`https://json-schema.org/draft/2020-12/schema`)
- **Trạng thái Data Contract:** Tuân thủ nghiêm ngặt **Phase 2 – Data Contract Curriculum Engine** (được khóa tự động qua `validateDataContractLock()` trong [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js)).

---

## 1. Cấu trúc thư mục Data Foundation (Round 3)

```text
data/
  curriculum/
    sources-g6.json              # 6 nguồn tài liệu chuẩn hóa theo đúng 4 lớp Source Governance
    topics-g6.json               # 6 chủ đề A–F lớp 6
    ppct-distribution-g6.json    # Phân bổ 35 tiết/năm (29 lesson + 2 review + 4 assessment = 35 tiết) & lịch periodSchedule 1..35
  requirements/
    requirements-g6.json         # 38 YCCĐ nguyên văn CTGDPT 2018 (38/38 Match = TRUE trong REQUIREMENT_TEXT_AUDIT.md)
  competencies/
    competencies-g6.json         # ĐÚNG 5 bản ghi Core Competency (NLa–NLe); không chứa NLS-*
    nls-mappings-g6.json         # Mapping NLS Bài 3 (1.3.TC1a, 5.2.TC1a, 5.2.TC1b -> G6-A-09, G6-A-10)
    ai-mappings-g6.json          # Mapping NL AI tách biệt (mặc định [])
  lessons/
    lessons-g6-ppct.json         # 16 bài học nội dung thực tế = 29 tiết (Bài 1–13, 15–17; Bài 5 = 2 tiết; không có Bài 14)
    G6-L03.golden.json           # Golden Lesson fixture cho Bài 3 (isFixtureOnly = true)
  resources/
    resources-g6.json            # Danh mục học liệu chuẩn hóa lớp 6
```

---

## 2. Đặc tả quản trị `Competency`, `NLSMapping` và `Source` (Round 3)

1. **`Competency` ([schemas/competency.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/competency.schema.json) & [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json)):**
   - Chỉ lưu đúng **5 năng lực tin học cốt lõi (`NLa`, `NLb`, `NLc`, `NLd`, `NLe`)** theo CTGDPT 2018.
   - Validator chặn mọi bản ghi `NLS-*` hoặc số lượng khác 5 trong `competencies-g6.json` (`CORE_COMPETENCY_COUNT_MISMATCH`, `UNAUTHORIZED_NLS_IN_CORE_COMPETENCY`) nếu không có `APPROVED_CONTRACT_CHANGE`.
2. **`NLSMapping` ([schemas/nls-mapping.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/nls-mapping.schema.json) & [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json)):**
   - Lưu trữ mô tả triển khai của trường tại `description` và `mappingRationale` (theo đúng `SRC-PHULUC3-TIN6-VIETHOA-2026` – Drive ID `1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`), tách biệt với văn bản khung `frameworkSourceId = "SRC-TT02-2025-NLS"`.
   - Cả 3 chỉ báo của Bài 3 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) đều gắn với `["G6-A-09", "G6-A-10"]` (đơn vị đo dung lượng, ước lượng nhu cầu dung lượng cá nhân, chọn thiết bị nhớ phù hợp); nghiêm cấm gắn `5.2.TC1a` vào `G6-A-07` (`INVALID_NLS_REQUIREMENT_MAPPING`).
3. **`Source` ([schemas/source.schema.json](file:///Users/huynhvandien/tinhocthaydien/schemas/source.schema.json)):**
   - Cho phép `driveId: null` và `internalVerificationStatus: "not_available"` đối với nguồn văn bản pháp quy xác thực trực tiếp trên CSDL Quốc gia VBPL (`SRC-TT02-2025-NLS`, `verificationStatus: "official_external_verified"`).

---

## 3. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 3: READY_FOR_REVIEW
```
