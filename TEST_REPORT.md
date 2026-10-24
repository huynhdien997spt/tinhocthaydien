# BÁO CÁO KIỂM THỬ TỔNG HỢP (`TEST_REPORT.md`)

- **Cập nhật mới nhất:** `PHASE 2 / TASK P2.5 ONLY`
- **Tổng số bài kiểm thử tự động toàn hệ thống:** **126 / 126 PASS (100%)**
  - **Phase 2 / P2.5 (Curriculum Data Foundation):** 20 / 20 PASS ([tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js))
  - **Phase 1.5 Regression (Agent Infra & Governance):** 27 / 27 PASS ([tools/agent-infra/demo-phase1-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/agent-infra/demo-phase1-5.js))
  - **Phase 1 Regression (Core Student/Teacher Runtime):** 79 / 79 PASS ([audit-test.js](file:///Users/huynhvandien/.gemini/antigravity/brain/8c553d9e-5d0c-4db2-934b-287be9ebd48a/scratch/audit-test.js))

---

## PHẦN A — KẾT QUẢ KIỂM THỬ PHASE 2 / TASK P2.5 (20/20 PASS)

Chạy lệnh:
```bash
node tools/curriculum/test-p2-5.js
```

| Mã Test | Hạng mục kiểm thử | Kỳ vọng | Kết quả | Bằng chứng chi tiết |
| :--- | :--- | :---: | :---: | :--- |
| `P25-01` | Cấu trúc thư mục `data/*`, `schemas/`, `tools/curriculum/` | PASS | **PASS** | Đủ 7 thư mục chuẩn theo đặc tả |
| `P25-02` | 12 JSON Schemas hợp lệ theo chuẩn Draft 2020-12 | PASS | **PASS** | Đủ 12 file `.schema.json` trong `schemas/` |
| `P25-03` | Materialize Chủ đề A–F (`G6-A` .. `G6-F`) | PASS | **PASS** | 6 chủ đề Lớp 6 đầy đủ |
| `P25-04` | Materialize toàn bộ YCCĐ `G6-A-01` ... `G6-F-03` kèm SHA-256 hash | PASS | **PASS** | 32 YCCĐ khớp 100% `officialTextHash` |
| `P25-05` | Materialize Năng lực `NLa`–`NLe` và NLS pilot (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) | PASS | **PASS** | 8 bản ghi năng lực chuẩn hóa |
| `P25-06` | Mapping PPCT Bài 1–17 (`G6-L01` .. `G6-L17`) | PASS | **PASS** | 17 bài học (35 tiết) gắn đầy đủ `requirementIds` |
| `P25-07` | Golden Lesson `G6-L03` đúng thông số đặc tả (chỉ làm fixture, không sửa UI) | PASS | **PASS** | `G6-L03`, 90 phút, `G6-A-07..10`, NLS `1.3.TC1a, 5.2.TC1a, 5.2.TC1b` |
| `P25-08` | Quy tắc AI: Không tự thêm NL AI vào Requirement Bank | PASS | **PASS** | 0 mã AI trong `requirements-g6.json` |
| `P25-09` | **Fixture 1:** `Valid Grade 6 dataset` → `PASS` | PASS | **PASS** | 85 thực thể hợp lệ, `errorCount = 0` |
| `P25-10` | **Fixture 2:** `Duplicate ID` → `FAIL` | PASS | **PASS** | Validator bắt đúng mã lỗi `DUPLICATE_ID` (`G6-A-01`, `G6-L03`) |
| `P25-11` | **Fixture 3:** `Missing RequirementID` → `FAIL` | PASS | **PASS** | Validator bắt đúng mã lỗi `PUBLISHED_LESSON_MISSING_REQUIREMENT` |
| `P25-12` | **Fixture 4:** `Dangling reference` → `FAIL` | PASS | **PASS** | Validator bắt đúng 3 lỗi `DANGLING_REFERENCE` |
| `P25-13` | **Fixture 5:** `Unapproved AI mapping` → `FAIL` | PASS | **PASS** | Validator bắt đúng mã lỗi `UNAPPROVED_AI_MAPPING` (`teacherApproved != true`) |
| `P25-14` | **Fixture 5b:** Tự ý chèn NL AI vào Requirement Bank → `FAIL` | PASS | **PASS** | Validator bắt đúng mã lỗi `UNAUTHORIZED_AI_IN_REQUIREMENT_BANK` |
| `P25-15` | **Fixture 6:** `Invalid question` (thiếu RequirementID / correctAnswer / explanation) → `FAIL` | PASS | **PASS** | Validator bắt đủ 3 mã lỗi `QUESTION_MISSING_REQUIREMENT`, `QUESTION_MISSING_CORRECT_ANSWER`, `QUESTION_MISSING_EXPLANATION` |
| `P25-16` | **Fixture 7:** Vi phạm quy tắc Activity, Resource thiếu URL, sửa trái phép `officialText` YCCĐ → `FAIL` | PASS | **PASS** | Validator bắt đủ `ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS`, `RESOURCE_MISSING_URL`, `OFFICIAL_REQUIREMENT_TEXT_TAMPERED` |
| `P25-17` | Importer nạp bộ dữ liệu hợp lệ vào `IntermediateCurriculumAdapter` | PASS | **PASS** | `inserted = 85`, xuất snapshot `tools/curriculum/staging-store.json` |
| `P25-18` | Importer Idempotency: chạy lại nhiều lần không sinh duplicate | PASS | **PASS** | Run 2 & Run 3: `inserted = 0, updated = 0, unchanged = 85, duplicatesCreated = 0` |
| `P25-19` | Importer từ chối nguyên tử (atomic rejection) khi dữ liệu không hợp lệ | PASS | **PASS** | Không có bản ghi lỗi nào lọt vào staging adapter (`totalInAdapter = 0`) |
| `P25-20` | Bảo toàn tuyệt đối toàn bộ file production (`StudentUID`, `Auth`, `Session`, `Progress`, `Responses`, `ExitTicket`, `Teacher`) | PASS | **PASS** | 21 file cốt lõi nguyên vẹn 100% (`git diff` rỗng) |

---

## PHẦN B — KẾT QUẢ REGRESSION PHASE 1.5 & PHASE 1 (106/106 PASS)

1. **Regression Phase 1.5 (`node tools/agent-infra/demo-phase1-5.js`):**
   - Kết quả: **27 / 27 PASS, 0 FAILED**.
   - Đảm bảo vòng đời `READY -> RUNNING -> READY_FOR_REVIEW`, `TraceID` xuyên suốt, chống duplicate khi retry, audit log và cổng phê duyệt `WAITING_FOR_TEACHER_APPROVAL` hoạt động ổn định.
2. **Regression Phase 1 (`node scratch/audit-test.js`):**
   - Kết quả: **79 / 79 PASS, 0 FAILED**.
   - Đảm bảo toàn bộ chức năng hiện hành (`Authentication`, `StudentUID`, `Session`, `Progress`, `Responses`, `Exit Ticket`, `Restore progress`, `Student isolation`, `Teacher permissions`, `Password reset`) không bị ảnh hưởng.

---

## KẾT LUẬN

```text
PHASE 2 / P2.5: PASS
```
