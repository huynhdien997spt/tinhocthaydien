# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 2 ONLY`
- **Branch:** `phase2-data-foundation-review`
- **Mục tiêu:** Sửa triệt để các điểm lệch nguồn được chỉ ra trong vòng QA Review thứ 2 của ChatGPT (commit `9904fedf82629dedfe519f76338cc23b36e12a5e`), bám sát 100% 5 file gốc trên Google Drive của thầy và CSDL Quốc gia về VBPL (`vbpl.vn`).

---

## 1. Tổng hợp các nội dung đã sửa trong Round 2

### 1.1. Sửa PPCT theo đúng file gốc Trường Việt Hoa (`1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`)
- Cập nhật `Bài 5. Internet` (`G6-L05`) trong [data/lessons/lessons-g6-ppct.json](file:///Users/huynhvandien/tinhocthaydien/data/lessons/lessons-g6-ppct.json) từ `1 tiết (45 phút)` thành **`2 tiết (90 phút)`**, dạy ở tiết `[10, 11]`.
- Tổng số tiết của **16 bài học nội dung** (`Bài 1..13`, `Bài 15..17`; không có `Bài 14`) đạt đúng **29 tiết**:
  - `Bài 1..7` = 2 tiết/bài (14 tiết)
  - `Bài 8` = 1 tiết
  - `Bài 9..12` = 2 tiết/bài (8 tiết)
  - `Bài 13` = 1 tiết
  - `Bài 15..16` = 2 tiết/bài (4 tiết)
  - `Bài 17` = 1 tiết
- Cập nhật [data/curriculum/ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json):
  - **Xóa bỏ hoàn toàn** bản ghi giả `"Ôn tập giữa học kì I"`.
  - Giữ đúng **2 tiết ôn tập** (`Ôn tập cuối HKI` – tiết 17; `Ôn tập cuối HKII` – tiết 34) và **4 tiết kiểm tra** (`Kiểm tra giữa HKI` – tiết 8; `Kiểm tra cuối HKI` – tiết 18; `Kiểm tra giữa HKII` – tiết 26; `Kiểm tra cuối HKII` – tiết 35).
  - Tổng cộng cả năm: **`29 lesson + 2 review + 4 assessment = 35 tiết`**.
  - Bổ sung mảng `periodSchedule` (tiết `1` đến `35`) phản ánh đúng thứ tự xen kẽ thực tế (Tiết 7: Bài 4 → Tiết 8: KT giữa HKI → Tiết 9: Bài 4; Tiết 25: Bài 12 → Tiết 26: KT giữa HKII → Tiết 27: Bài 12).

### 1.2. Thay thế toàn bộ Drive ID trung gian bằng 5 Drive ID tài liệu gốc của thầy & Sửa URL VBPL
- Cập nhật [data/curriculum/sources-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/sources-g6.json) (6 bản ghi nguồn):
  1. `SRC-GDPT-2018-TIN6` (CTGDPT 2018 môn Tin học): Drive ID `13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`, URL chính thức trên CSDL VBPL `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721` (thay cho `ItemID=134517`), ghi chú rõ Thông tư 17/2025/TT-BGDĐT không sửa đổi môn Tin học lớp 6.
  2. `SRC-PPCT-VIETHOA-TIN6-2026` (PPCT Tin học 6 Việt Hoa): Drive ID `1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`.
  3. `SRC-SGK-KNTT-TIN6` (SGK Tin học 6): Drive ID `1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj`, đánh dấu trung thực `internalVerificationStatus = "verified"`, `externalVerificationStatus = "pending"`, `verificationStatus = "internal_source_verified"`.
  4. `SRC-TT02-2025-NLS` (Thông tư 02/2025/TT-BGDĐT ngày 24/01/2025): URL chính thức trên CSDL VBPL `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=175173`.
  5. `SRC-PHULUC3-TIN6-VIETHOA-2026` (Phụ lục III lớp 6): Drive ID `1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`.
  6. `SRC-KHBD-TIN6-BAI3-VIETHOA` (KHBD Tin 6 – Bài 3): Drive ID `1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp`.

### 1.3. Khôi phục `RequirementID` bất biến & Sửa nguyên văn `officialText` theo đúng CTGDPT 2018
- Trong [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) và [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json):
  - Khôi phục thứ tự bất biến của `G6-A-05` (Vai trò máy tính) và `G6-A-06` (Các bước xử lí thông tin).
  - Khôi phục thứ tự bất biến của `G6-B-02` (Mạng không dây tiện dụng hơn mạng có dây) và `G6-B-03` (Thành phần mạng cơ bản).
  - Khôi phục thứ tự bất biến của Chủ đề E: `G6-E-01..06` là *Soạn thảo văn bản cơ bản*, `G6-E-07..09` là *Sơ đồ tư duy và phần mềm sơ đồ tư duy*; đồng thời cập nhật lại `requirementIds` của `G6-L10..G6-L13` cho khớp.
  - Sửa nguyên văn câu chữ CTGDPT 2018 cho `G6-A-09` (bổ sung câu `"Ví dụ: 1 KB xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte."`, giữ `TB` ở `supplementaryKnowledge`), `G6-B-03` (dùng `"cáp nối"` thay vì `"cáp xoắn"`), `G6-C-01`, `G6-C-07`, và `G6-D-01..05`.
- Bổ sung đầy đủ metadata provenance (`sourceId`, `sourceDocumentDriveId`, `sourceOfficialUrl`, `sourceSection`, `verifiedAt`) vào [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json).

### 1.4. Cập nhật nguồn Mapping Năng lực số & Bổ sung Validation Tests Round 2
- Cập nhật [data/competencies/nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json) trỏ `mappingSourceId = "SRC-PHULUC3-TIN6-VIETHOA-2026"` (`1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`) và `supplementaryLessonPlanSourceId = "SRC-KHBD-TIN6-BAI3-VIETHOA"` (`1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp`).
- Cập nhật [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) và [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js) để kiểm tra tự động toàn bộ các quy tắc của Round 2.

---

## 2. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 2: READY_FOR_REVIEW
```
