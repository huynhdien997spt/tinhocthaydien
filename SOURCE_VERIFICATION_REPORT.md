# BÁO CÁO KIỂM CHỨNG NGUỒN DỮ LIỆU CHƯƠNG TRÌNH LỚP 6 (`SOURCE_VERIFICATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ONLY`
- **Phương pháp kiểm chứng:** Kiểm chứng 2 lớp nguồn (Lớp A: Nguồn chuẩn do giáo viên/nhà trường cung cấp; Lớp B: Nguồn pháp quy/nhà xuất bản chính thức của Bộ GDĐT & NXB Giáo dục Việt Nam). Không sử dụng AI hoặc blog cộng đồng làm nguồn gốc.

---

## 1. Bảng kiểm chứng nguồn chi tiết (Mandatory Source Verification Table)

| SourceID | Tên nguồn | Loại nguồn (`sourceType`) | Cơ quan phát hành (`authority`) | URL / Drive ID | Phiên bản / năm (`versionOrSchoolYear`) | Ngày kiểm tra (`verifiedAt`) | Phạm vi sử dụng (`scopeUsed`) | Mức ưu tiên (`priority`) | Trạng thái kiểm chứng (`verificationStatus`) | Mâu thuẫn phát hiện | Cách xử lý |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `SRC-GDPT-2018-TIN6` | Chương trình giáo dục phổ thông môn Tin học – Lớp 6 (Thông tư số 32/2018/TT-BGDĐT) | `curriculum_regulation` (Lớp A + Lớp B) | Bộ Giáo dục và Đào tạo | URL: `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=134517`<br>Drive ID: `15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw` | TT 32/2018/TT-BGDĐT (26/12/2018) | `2026-10-24T13:15:00+07:00` | Toàn bộ 38 Yêu cầu cần đạt (YCCĐ) môn Tin học lớp 6 (Chủ đề A–F) và 5 năng lực tin học cốt lõi (`NLa`–`NLe`). | `1` (Cao nhất về pháp quy YCCĐ) | `verified` | Bản cũ gộp các gạch đầu dòng thành 32 YCCĐ và tự thêm đơn vị `TB` vào `officialText` của `G6-A-09`. | Tách đúng từng gạch đầu dòng thành **38 YCCĐ độc lập** (`A=10, B=4, C=7, D=5, E=9, F=3`); khôi phục nguyên văn `officialText` của `G6-A-09` chỉ gồm `Byte, KB, MB, GB`; chuyển `TB` sang `supplementaryKnowledge` và `studentFriendlyText`; tạo `trusted-official-requirements-g6.json` để khóa SHA-256. |
| `SRC-PPCT-VIETHOA-TIN6-2026` | Phân phối chương trình (PPCT) môn Tin học 6 – Năm học 2026–2027 – Trường TH, THCS và THPT Việt Hoa | `school_ppct` (Lớp A) | Trường TH, THCS và THPT Việt Hoa – Tổ Tin học | URL: `https://docs.google.com/document/d/1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U/edit`<br>Drive ID: `1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U` | `2026-2027` | `2026-10-24T13:15:00+07:00` | Danh mục 16 bài học nội dung (Bài 1–13, Bài 15–17), thời lượng từng bài (1 tiết = 45 phút; Bài 3=2t, Bài 8=1t, Bài 13=1t, Bài 17=1t) và cấu trúc 35 tiết/năm. | `2` (Cao nhất về kế hoạch dạy học tại trường) | `verified` | Bản cũ lấy toàn bộ 17 bài trong mục lục SGK (bao gồm cả Bài 14 không dạy ở trường) và gán cứng mọi bài = 90 phút. | Loại bỏ hoàn toàn `G6-L14` (Bài 14); chuẩn hóa đúng **16 bài nội dung** (`G6-L01..G6-L13`, `G6-L15..G6-L17`); tính `durationMinutes = periods * 45`; tách riêng các tiết `review` (Ôn tập) và `assessment` (Kiểm tra giữa kỳ/cuối kỳ) trong [ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json). |
| `SRC-SGK-KNTT-TIN6` | Sách giáo khoa Tin học 6 – Bộ Kết nối tri thức với cuộc sống | `textbook` (Lớp A + Lớp B) | Nhà xuất bản Giáo dục Việt Nam (Bộ GDĐT phê duyệt) | URL: `https://hanhtrangso.nxbgd.vn/sach-dien-tu/tin-hoc-6-10762`<br>Drive ID: `1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U` | Tái bản 2025–2026 (ISBN 978-604-0-26018-5) | `2026-10-24T13:15:00+07:00` | Tên bài học Bài 1–13, Bài 15–17, cấu trúc hoạt động Bài 3 (Thông tin trong máy tính) và kiến thức mở rộng về đơn vị `TB`. | `3` | `verified` | SGK có giới thiệu thêm đơn vị `TB` và Bài 14 (Thực hành tổng hợp: Hoàn thiện sổ lưu niệm), dễ bị nhầm thành YCCĐ bắt buộc của CTGDPT 2018. | Không đưa ví dụ SGK ("sổ lưu niệm", `TB`) vào `officialText` của Requirement Bank; chỉ ghi nhận ở trường `supplementaryKnowledge` của bài học/YCCĐ. |
| `SRC-TT02-2025-NLS` | Thông tư số 02/2025/TT-BGDĐT ngày 24/01/2025 quy định Khung năng lực số cho người học | `digital_competency_framework` (Lớp B) | Bộ Giáo dục và Đào tạo | URL: `https://moet.gov.vn/van-ban/vanban/Pages/chi-tiet-van-ban.aspx?ItemID=1696`<br>Drive ID: `15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw` | TT 02/2025/TT-BGDĐT (24/01/2025) | `2026-10-24T13:15:00+07:00` | Định nghĩa khung năng lực số chính thức và các miền năng lực mức TC1 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`). | `4` | `verified` | Bản cũ dùng URL trang chủ chung `https://moet.gov.vn/` và chưa tách rõ khung pháp quy với bảng mapping bài học của trường. | Cập nhật URL văn bản cụ thể + Drive ID; bổ sung quy tắc `SOURCE_URL_TOO_GENERIC` trong Validator để chặn mọi URL trang chủ chung. |
| `SRC-PHULUC3-KHBD-VIETHOA-2026` | Phụ lục III – Kế hoạch giáo dục môn học & KHBD Bài 3 Tin học 6 (Tích hợp Năng lực số) | `school_deployment_appendix` (Lớp A) | Trường TH, THCS và THPT Việt Hoa – Tổ Tin học | URL: `https://docs.google.com/document/d/15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw/edit`<br>Drive ID: `15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw` | `2026-2027` | `2026-10-24T13:15:00+07:00` | Mapping cụ thể các chỉ báo NLS (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) vào Bài 3 (`G6-L03`). | `5` | `verified` | Cần phân biệt rõ chỉ báo NLS tích hợp theo Phụ lục III / KHBD của trường với YCCĐ gốc của CTGDPT 2018. | Trong [nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json), tách rõ `frameworkSourceId = "SRC-TT02-2025-NLS"`, `mappingSourceId = "SRC-PHULUC3-KHBD-VIETHOA-2026"`, `mappingOriginType = "school_deployment_appendix_khbd"`, và khóa `isOfficialGdpt2018Requirement = false`. |

---

## 2. Đối chiếu số lượng Yêu cầu cần đạt (38 YCCĐ) theo CTGDPT 2018

| Mã Chủ đề | Tên Chủ đề (CTGDPT 2018 – Lớp 6) | Số lượng YCCĐ chuẩn | Danh sách mã `RequirementID` đã materialize | Trạng thái khớp nguồn |
| :---: | :--- | :---: | :--- | :---: |
| **A** | Máy tính và cộng đồng | **10** | `G6-A-01` ... `G6-A-10` | `verified` (10/10) |
| **B** | Mạng máy tính và Internet | **4** | `G6-B-01` ... `G6-B-04` | `verified` (4/4) |
| **C** | Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin | **7** | `G6-C-01` ... `G6-C-07` | `verified` (7/7) |
| **D** | Đạo đức, pháp luật và văn hoá trong môi trường số | **5** | `G6-D-01` ... `G6-D-05` | `verified` (5/5) |
| **E** | Ứng dụng tin học | **9** | `G6-E-01` ... `G6-E-09` | `verified` (9/9) |
| **F** | Giải quyết vấn đề với sự trợ giúp của máy tính | **3** | `G6-F-01` ... `G6-F-03` | `verified` (3/3) |
| **TỔNG** | **6 Chủ đề (A–F)** | **38** | **38 Requirement riêng biệt** | **100% KHỚP NGUỒN** |

---

## 3. Đối chiếu Phân phối chương trình (PPCT 2026–2027 Trường Việt Hoa – 35 tiết/năm)

- **Bài học nội dung (`sessionType = "lesson"`):** **16 bài** (`Bài 1` đến `Bài 13`, `Bài 15` đến `Bài 17` — **không có Bài 14**):
  - Các bài **2 tiết (90 phút)**: Bài 1, Bài 2, Bài 3, Bài 4, Bài 6, Bài 7, Bài 9, Bài 10, Bài 11, Bài 12, Bài 15, Bài 16 (12 bài × 2 tiết = 24 tiết).
  - Các bài **1 tiết (45 phút)**: Bài 5, Bài 8, Bài 13, Bài 17 (4 bài × 1 tiết = 4 tiết).
  - Tổng số tiết bài học nội dung: **28 tiết**.
- **Các tiết Ôn tập & Kiểm tra định kỳ (`nonLessonSessions` trong [ppct-distribution-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/curriculum/ppct-distribution-g6.json)):**
  - Ôn tập (`sessionType = "review"`): **3 tiết** (`G6-REV-GK1`, `G6-REV-CK1`, `G6-REV-CK2`).
  - Kiểm tra định kỳ (`sessionType = "assessment"`): **4 tiết** (`G6-ASM-GK1`, `G6-ASM-CK1`, `G6-ASM-GK2`, `G6-ASM-CK2`).
  - Tổng cộng cả năm học: `28 tiết bài học + 3 tiết ôn tập + 4 tiết kiểm tra = 35 tiết` (không biến tiết ôn tập/kiểm tra thành `Lesson` kiến thức giả).

---

## 4. Kết luận

```text
PHASE 2 / P2.5 FIX: READY_FOR_REVIEW
```
