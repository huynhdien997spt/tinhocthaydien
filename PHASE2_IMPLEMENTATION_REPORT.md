# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 3 ONLY`
- **Branch:** `phase2-data-foundation-review`
- **Mục tiêu:** Khắc phục triệt để các blocker còn lại từ vòng QA Review thứ 3 của ChatGPT (commit `3c355b83de9915b0ec000fd0438e796fb239200c`), bảo đảm giữ nguyên toàn bộ các kết quả đã đạt ở Round 2.

---

## 1. Tổng hợp các nội dung đã sửa trong Round 3

### 1.1. Rà soát 38/38 `officialText` nguyên văn CTGDPT 2018 & Xuất `REQUIREMENT_TEXT_AUDIT.md`
- Đọc lại toàn bộ 38 gạch đầu dòng Yêu cầu cần đạt Lớp 6 (Chủ đề A–F) từ nguồn chuẩn `CTGDPT 2018 môn Tin học` (`Drive ID: 13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`) theo quy tắc chỉ chuẩn hóa xuống dòng PDF / khoảng trắng thừa, tuyệt đối không thêm/đổi từ:
  - **`G6-B-03`:** Sửa thành `"Nêu được các thành phần chủ yếu của một mạng máy tính (máy tính và các thiết bị kết nối) và tên của một vài thiết bị mạng cơ bản như máy tính, cáp nối, Switch, Access Point,..."` (bỏ từ thêm `"kể được"`).
  - **`G6-C-07`:** Sửa thành `"Biết cách đăng kí tài khoản thư điện tử, thực hiện được một số thao tác cơ bản: đăng nhập tài khoản email, soạn và gửi email, thoát ra."` (khôi phục đúng `"tài khoản thư điện tử"` và dấu `":"`).
  - **`G6-E-01`:** Sửa thành `"Trình bày được tác dụng của công cụ căn lề, định dạng, tìm kiếm, thay thế trong phần mềm soạn thảo văn bản."` (bỏ cụm từ thêm `"một số"`).
  - **`G6-E-04`:** Sửa thành `"Trình bày được thông tin ở dạng bảng."` (bỏ cụm từ thêm `"bằng phần mềm soạn thảo văn bản"`).
- Xuất báo cáo [REQUIREMENT_TEXT_AUDIT.md](file:///Users/huynhvandien/tinhocthaydien/REQUIREMENT_TEXT_AUDIT.md) đối chiếu từng câu trong 38 Requirement (`38 / 38 Match = TRUE`).

### 1.2. Dựng độc lập `trusted-official-requirements-g6.json` trực tiếp từ bản chép CTGDPT
- Dựng [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json) trực tiếp từ bảng chép nguyên văn CTGDPT 2018 (`CTGDPT_G6_OFFICIAL_TRANSCRIPTION`), kèm đầy đủ provenance bắt buộc:
  - `sourceId = "SRC-GDPT-2018-TIN6"`
  - `sourceDocumentDriveId = "13o_7GOH_en10qIrlgLTyqrIlJSgCZxma"`
  - `sourceOfficialUrl = "https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721"`
  - `sourceSection = "LỚP 6 – Chủ đề A–F"`
  - `verifiedAt = "2026-10-24T14:25:00+07:00"`
  - `transcriptionPolicy = "Only whitespace/line-break/OCR normalization. No semantic edits."`

### 1.3. Sửa NLS Mapping Bài 3 theo đúng Phụ lục III (`1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`)
- Trong [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json):
  - `1.3.TC1a` → `["G6-A-09", "G6-A-10"]`: `"HS biết được các đơn vị đo dung lượng lưu trữ (Byte, KB, MB, GB) và khả năng lưu trữ của các thiết bị nhớ thông dụng."`
  - `5.2.TC1a` → `["G6-A-09", "G6-A-10"]` (bỏ hoàn toàn mapping sai sang `G6-A-07`): `"HS biết được lượng dung lượng lưu trữ cần thiết cho các nhu cầu cá nhân."`
  - `5.2.TC1b` → `["G6-A-09", "G6-A-10"]`: `"HS biết chọn thiết bị lưu trữ phù hợp với nhu cầu sử dụng."`
- Cập nhật `mappingRationale` mô tả rõ hoạt động ước lượng nhu cầu dung lượng, so sánh dung lượng và chọn thiết bị lưu trữ.

### 1.4. Giới hạn `competencies-g6.json` đúng 5 Core Competencies (`NLa`–`NLe`) & Không tự tạo `officialDescription` cho NLS
- Trong [data/competencies/competencies-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/competencies-g6.json): chỉ giữ đúng **5 bản ghi (`NLa`, `NLb`, `NLc`, `NLd`, `NLe`)**, loại bỏ hoàn toàn 3 bản ghi `NLS-1.3.TC1a`, `NLS-5.2.TC1a`, `NLS-5.2.TC1b` và các câu `officialDescription` tự diễn giải.

### 1.5. Sửa bản ghi nguồn `SRC-TT02-2025-NLS` & Tách bạch 4 lớp Source Governance
- Trong [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json): cập nhật `SRC-TT02-2025-NLS` với `driveId: null`, `internalVerificationStatus: "not_available"`, `externalVerificationStatus: "verified"`, `verificationStatus: "official_external_verified"` (CSDL VBPL `ItemID=175173`), không dùng Drive ID của Phụ lục III (`1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`).

---

## 2. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 3: READY_FOR_REVIEW
```
