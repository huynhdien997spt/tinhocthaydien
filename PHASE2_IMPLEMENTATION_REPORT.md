# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ONLY`
- **Branch:** `phase2-data-foundation-review`
- **Mục tiêu:** Khắc phục triệt để 8 Blocker từ kết quả QA Review của ChatGPT về Requirement Bank Lớp 6, PPCT thực tế năm học 2026–2027 của Trường TH, THCS và THPT Việt Hoa, Data Contract, Source Verification, NLS Governance và Content Quality Tests.

---

## 1. Tổng hợp khắc phục 8 Blockers

### Blocker 1 — Requirement Bank khớp 100% CTGDPT 2018 (38 Requirements)
- Tách toàn bộ các gạch đầu dòng Yêu cầu cần đạt trong CTGDPT 2018 môn Tin học lớp 6 (Thông tư 32/2018/TT-BGDĐT) thành **38 Requirement riêng biệt** tại [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json):
  - Chủ đề A (`G6-A-01..10`): **10**
  - Chủ đề B (`G6-B-01..04`): **4**
  - Chủ đề C (`G6-C-01..07`): **7** (đã tách riêng xem thông tin chính trang web, khai thác thông tin trang web, công dụng máy tìm kiếm, xác định từ khóa, ưu/nhược điểm email, thao tác email)
  - Chủ đề D (`G6-D-01..05`): **5** (đã tách riêng nêu tác hại/nguy cơ và thực hiện biện pháp phòng ngừa có hướng dẫn của GV)
  - Chủ đề E (`G6-E-01..09`): **9** (3 YCCĐ sơ đồ tư duy + 6 YCCĐ soạn thảo văn bản cơ bản)
  - Chủ đề F (`G6-F-01..03`): **3**
  - **Tổng cộng: 38 Requirements.**
- Trong `G6-A-09`, giữ nguyên văn `officialText` chỉ gồm `Byte, KB, MB, GB` (bỏ `TB` khỏi `officialText`, chuyển `TB` sang `supplementaryKnowledge` và `studentFriendlyText`).
- Bổ sung đầy đủ trường `studentFriendlyText` cho cả 38 Requirements.
- Tạo file snapshot độc lập [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json) để đối chiếu `officialText` và `officialTextHash`.

### Blocker 2 — PPCT bám sát thực tế Trường TH, THCS và THPT Việt Hoa (2026–2027)
- Loại bỏ hoàn toàn `Bài 14. Thực hành tổng hợp: Hoàn thiện sổ lưu niệm` (`G6-L14`) khỏi [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json).
- Giữ đúng **16 bài nội dung**: `Bài 1..13` (`G6-L01..G6-L13`) và `Bài 15..17` (`G6-L15..G6-L17`).
- Cập nhật đúng số tiết và số phút (`1 tiết THCS = 45 phút`):
  - `Bài 3 (G6-L03)`: 2 tiết → `90 phút`
  - `Bài 5 (G6-L05)`: 1 tiết → `45 phút`
  - `Bài 8 (G6-L08)`: 1 tiết → `45 phút`
  - `Bài 13 (G6-L13)`: 1 tiết → `45 phút`
  - `Bài 17 (G6-L17)`: 1 tiết → `45 phút`
  - Các bài còn lại: 2 tiết → `90 phút`.
- Tạo [data/curriculum/ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json) mô tả rõ tổng **35 tiết/năm** = `28 tiết bài học (16 bài)` + `3 tiết ôn tập (sessionType = "review")` + `4 tiết kiểm tra định kỳ (sessionType = "assessment")`, không biến tiết ôn tập/kiểm tra thành `Lesson` giả.

### Blocker 3 — Khôi phục đúng Data Contract đã chốt
- Cập nhật toàn bộ 9 JSON Schemas (`Source`, `Topic`, `Lesson`, `Requirement`, `Competency`, `Activity`, `Question`, `Evidence`, `MasteryRule`) tại `schemas/` khớp chính xác danh sách trường bắt buộc của Data Contract:
  - `Question` dùng `requirementId` (đơn) và `questionText`.
  - `Evidence` biểu diễn minh chứng học tập thật của học sinh (`studentUid`, `schoolYear`, `lessonId`, `requirementId`, `evidenceType`, `sourceActivityId`, `submittedAt`, `evaluationStatus`).
  - `MasteryRule` đánh giá mức đạt theo từng `requirementId` với 4 mức `insufficient_evidence`, `developing`, `achieved`, `extended`.

### Blocker 4, 5, 6 — Kiểm chứng nguồn 2 lớp, Source Catalog cụ thể & Năng lực số
- Cập nhật [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) với URL văn bản cụ thể / Drive ID cụ thể và đầy đủ các trường `authority`, `priority`, `versionOrSchoolYear`, `verifiedAt`, `accessedAt`, `verificationStatus: "verified"`, `scopeUsed`.
- Xuất bản báo cáo [SOURCE_VERIFICATION_REPORT.md](file:///Users/huynhvandien/tinhocthaydien/SOURCE_VERIFICATION_REPORT.md).
- Trong [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json), tách rõ `frameworkSourceId` (`SRC-TT02-2025-NLS` – Thông tư 02/2025/TT-BGDĐT) và `mappingSourceId` (`SRC-PHULUC3-KHBD-VIETHOA-2026` – Phụ lục III & KHBD Trường Việt Hoa), với `isOfficialGdpt2018Requirement = false`.

### Blocker 7 & 8 — Bổ sung Content Quality Tests & Đánh dấu Golden Lesson Fixture
- Bổ sung kiểm tra `EXPECT_REQUIREMENT_COUNT_G6 = 38`, Topic Counts (`A=10, B=4, C=7, D=5, E=9, F=3`), Trusted Official Snapshot, Phantom Lesson (`Bài 14`), PPCT Content Lesson Count (`16`), PPCT Period Validation, và Contract Drift Test vào [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) và [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js).
- Đánh dấu tường minh `isFixtureOnly: true` trong [data/lessons/G6-L03.golden.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/G6-L03.golden.json).

---

## 2. Kết luận

```text
PHASE 2 / P2.5 FIX: READY_FOR_REVIEW
```
