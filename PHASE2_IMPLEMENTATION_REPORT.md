# PHASE 2 / TASK P2.5 — IMPLEMENTATION REPORT (`PHASE2_IMPLEMENTATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 4 ONLY`
- **Branch:** `phase2-data-foundation-review`
- **Mục tiêu:** Sửa dứt điểm 5 câu `officialText` còn khác biệt nhỏ so với PDF CTGDPT 2018 gốc (`13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`), tách riêng file `source transcript` độc lập để chống lỗi tự khớp vòng tròn, cập nhật `REQUIREMENT_TEXT_AUDIT.md` và bổ sung Negative Tests cho cả 5 câu, trong khi giữ nguyên toàn bộ kết quả đã PASS ở Round 3.

---

## 1. Tổng hợp các nội dung đã thực hiện trong Round 4

### 1.1. Sửa 5 `officialText` khớp 100% PDF CTGDPT 2018 gốc (`13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`)
1. **`G6-A-09`:**
   - `officialText`: `"Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) của các đơn vị cơ bản đo dung lượng thông tin: Byte, KB, MB, GB, quy đổi được một cách gần đúng giữa các đơn vị đo lường này. Ví dụ: 1 KB bằng xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte."`
   - Chuẩn hóa khoảng trắng OCR `1KB → 1 KB` và giữ nguyên từ `"bằng"`.
2. **`G6-D-01`:**
   - `officialText`: `"Giới thiệu được sơ lược về một số tác hại và nguy cơ bị hại khi tham gia Internet. Nêu và thực hiện được một số biện pháp phòng ngừa cơ bản với sự hướng dẫn của giáo viên."`
   - Giữ nguyên từ `"về"` và dấu chấm tách câu `". Nêu"`.
3. **`G6-D-05`:**
   - `officialText`: `"Nhận diện được một số thông điệp (chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...) lừa đảo hoặc mang nội dung xấu."`
   - Giữ nguyên phần ví dụ trong ngoặc đơn `"(chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...)"`.
4. **`G6-E-07`:**
   - `officialText`: `"Sắp xếp được một cách logic và trình bày được dưới dạng sơ đồ tư duy các ý tưởng, khái niệm."`
   - Giữ nguyên cách viết `"logic"` của PDF gốc (không đổi thành `"lôgic"`).
5. **`G6-F-03`:**
   - `officialText`: `"Biết được chương trình là mô tả một thuật toán để máy tính “hiểu” và thực hiện được."`
   - Giữ nguyên dấu ngoặc kép quanh từ `“hiểu”`.

### 1.2. Tách biệt cơ chế Source Transcript → Trusted Snapshot → Requirement Bank → Validator
- Tạo file bản chép nguồn độc lập [tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/source-transcripts/ctgdpt2018-tin6-yccd.source.json) chứa `rawSourceText` (bản chép sát từng dòng PDF gốc), `normalizationApplied`, `normalizedOfficialText` và đầy đủ metadata (`sourceDocumentDriveId`, `sourceOfficialUrl`, `sourceSection`, `transcribedAt`, `verifiedAt`, `transcriptionPolicy`, `reviewStatus`).
- Tạo công cụ kiểm định độc lập [tools/curriculum/audit-requirement-text.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/audit-requirement-text.js) thực thi hàm chuẩn hóa thuần (`applyAllowedNormalization`) để kiểm tra `ctgdpt2018-tin6-yccd.source.json` → sinh [tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json) → đối chiếu với [data/requirements/requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/requirements/requirements-g6.json) → xuất báo cáo [REQUIREMENT_TEXT_AUDIT.md](file:///Users/huynhvandien/tinhocthaydien/REQUIREMENT_TEXT_AUDIT.md) với **38/38 `ExactAfterAllowedNormalization = TRUE`**.

### 1.3. Bổ sung Negative Tests cho 5 lỗi ở Round 4
- Cập nhật [tools/curriculum/validator.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/validator.js) và [tools/curriculum/test-p2-5.js](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/test-p2-5.js) để FAIL ngay nếu:
  - `G6-A-09` thiếu cụm `"1 KB bằng xấp xỉ"`;
  - `G6-D-01` viết `"Giới thiệu được sơ lược một số"` (thiếu `"về"`) hoặc `"Internet; nêu"` (đổi `". Nêu"`);
  - `G6-D-05` thiếu cụm `"(chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...)"`;
  - `G6-E-07` viết `"lôgic"` thay cho `"logic"`;
  - `G6-F-03` mất dấu ngoặc kép quanh `“hiểu”`.

---

## 2. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 4: READY_FOR_REVIEW
```
