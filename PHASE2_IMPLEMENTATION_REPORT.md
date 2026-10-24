# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 5 ONLY`
- **Branch:** `phase2-data-foundation-review`
- **Mục tiêu:** Sửa dứt điểm mục `G6-E-03` theo đúng nguyên văn PDF CTGDPT 2018 gốc (`Drive ID: 13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`), đồng bộ cả 3 lớp (`source transcript` → `trusted snapshot` → `Requirement Bank`), bổ sung Negative Test bắt lỗi thêm cụm `"văn bản"` vào `G6-E-03`, và giữ nguyên toàn bộ các kết quả đã PASS.

---

## 1. Nội dung sửa trong Round 5

### 1.1. Sửa `G6-E-03` theo đúng PDF CTGDPT 2018 gốc
- **Trước khi sửa (`G6-E-03 before`):**
  `"Sử dụng được công cụ tìm kiếm và thay thế của phần mềm soạn thảo văn bản."`
- **Sau khi sửa (`G6-E-03 after`):**
  `"Sử dụng được công cụ tìm kiếm và thay thế của phần mềm soạn thảo."`
- **SHA-256 (`officialTextHash`) mới của `G6-E-03`:**
  `7b9e6c1317e3c9c92a495be0279282040a49689a398f8d85fd64e5f34394ab50`

### 1.2. Đồng bộ 3 lớp dữ liệu & Audit 38/38
1. [tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json): Cập nhật `rawSourceText` và `normalizedOfficialText` của `G6-E-03`.
2. [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json): Tự động sinh lại từ `source transcript` (`TRUSTED-CTGDPT2018-TIN6-SNAPSHOT-V5`).
3. [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json): Đồng bộ `officialText`, `officialTextHash` và `version: "2018.5"`.
4. [REQUIREMENT_TEXT_AUDIT.md](file:///Users/huynhvandien/tinhocthaydien/REQUIREMENT_TEXT_AUDIT.md): Chạy `node tools/curriculum/audit-requirement-text.js` đạt **38 / 38 EXACT MATCH (`0 mismatch`, `exit code 0`)**.

### 1.3. Thêm Negative Test riêng cho `G6-E-03`
- Trong [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) và [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js):
  - Nếu `G6-E-03` chứa `"Sử dụng được công cụ tìm kiếm và thay thế của phần mềm soạn thảo văn bản."` (thêm cụm `"văn bản"`), validator lập tức FAIL với mã lỗi `OFFICIAL_TEXT_PARAPHRASED_OR_MODIFIED`, `REQUIREMENT_STABLE_ID_DRIFT` và `OFFICIAL_REQUIREMENT_TEXT_TAMPERED`.

---

## 2. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 5: READY_FOR_FINAL_REVIEW
```
