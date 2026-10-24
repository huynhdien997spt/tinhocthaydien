# PHASE 3 / TASK P3.3 — GOLDEN LESSON `G6-L03` TRACEABILITY REPORT

**Lesson ID:** `G6-L03` (`legacyLessonId: "G6-B3"`)  
**Lesson Title:** Bài 3. Thông tin trong máy tính (2 tiết / 90 phút)  
**Spec Reference:** `https://docs.google.com/document/d/1jpTBFuBA9oVB1GE1eC4RtonT-8yXZ5TssBCSRYKr57Q/edit`

---

## 1. Quản trị Nguồn Chuẩn (Source Governance – Đọc trực tiếp từ `data/curriculum/sources-g6.json`)

| SourceID | Vai trò trong `G6-L03` | Tên nguồn chuẩn |
|---|---|---|
| `SRC-GDPT-2018-TIN6` | YCCĐ | Chương trình giáo dục phổ thông môn Tin học – Lớp 6 (Ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT ngày 26/12/2018) |
| `SRC-PPCT-VIETHOA-TIN6-2026` | thời lượng / vị trí bài | Phân phối chương trình (PPCT) môn Tin học 6 – Năm học 2026–2027 – Trường TH, THCS và THPT Việt Hoa |
| `SRC-SGK-KNTT-TIN6` | học liệu | Sách giáo khoa Tin học 6 – Bộ Kết nối tri thức với cuộc sống (NXB Giáo dục Việt Nam) |
| `SRC-PHULUC3-TIN6-VIETHOA-2026` | mapping NLS cụ thể | Phụ lục III – Kế hoạch giáo dục của giáo viên môn Tin học lớp 6 (Tích hợp Năng lực số) – Trường TH, THCS và THPT Việt Hoa |
| `SRC-KHBD-TIN6-BAI3-VIETHOA` | triển khai hoạt động | Kế hoạch bài dạy (KHBD) Tin học 6 – Bài 3: Thông tin trong máy tính – Trường TH, THCS và THPT Việt Hoa |
| `SRC-TT02-2025-NLS` | framework NLS | Thông tư số 02/2025/TT-BGDĐT ngày 24/01/2025 của Bộ GDĐT quy định Khung năng lực số cho người học (chỉ dùng cho framework NLS, không thay thế nguồn mapping cụ thể `SRC-PHULUC3-TIN6-VIETHOA-2026`) |

---

## 2. Bảng Đối chiếu YCCĐ – Hoạt động – Câu hỏi/Sản phẩm – Minh chứng – NLS – SourceRefs

| RequirementID | ActivityID | QuestionID / Product | EvidenceType | NLS code | SourceRefs |
|---|---|---|---|---|---|
| `G6-A-07` | `G6-L03-A01` | `G6-L03-Q001` | `quiz_response` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-07` | `G6-L03-A02` | `G6-L03-PROD-01` (Sản phẩm 1: Chuỗi bit 4×4 + câu giải thích `0` và `1`), `G6-L03-Q002` | `short_answer` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-07` | `G6-L03-A04` | `G6-L03-Q004` (Checkpoint Tiết 1) | `quiz_response`, `short_answer` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-08` | `G6-L03-A03` | `G6-L03-Q003` | `quiz_response` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-08` | `G6-L03-A04` | `G6-L03-Q005` (Checkpoint Tiết 1) | `quiz_response`, `short_answer` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-09` | `G6-L03-A05` | `G6-L03-WS-01` (Bảng quy đổi 3 ô học sinh tự nhập), `G6-L03-Q006`, `G6-L03-Q007` | `worksheet_table`, `quiz_response` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-09` | `G6-L03-A06` | `G6-L03-PROD-02` (Sản phẩm 2: `PHIẾU TƯ VẤN LƯU TRỮ`), `G6-L03-Q008` | `worksheet_table`, `quiz_response` | `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b` | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-PHULUC3-TIN6-VIETHOA-2026`, `SRC-KHBD-TIN6-BAI3-VIETHOA`, `SRC-TT02-2025-NLS` |
| `G6-A-10` | `G6-L03-A06` | `G6-L03-PROD-02` (Sản phẩm 2: `PHIẾU TƯ VẤN LƯU TRỮ`), `G6-L03-Q009` | `worksheet_table`, `quiz_response` | `1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b` | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-PHULUC3-TIN6-VIETHOA-2026`, `SRC-KHBD-TIN6-BAI3-VIETHOA`, `SRC-TT02-2025-NLS` |
| `G6-A-10` | `G6-L03-A07` | Kiểm tra dung lượng (`REAL_DEVICE` / `SIMULATION`), `G6-L03-Q010` | `quiz_response` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |
| `G6-A-10` | `G6-L03-A08` | Exit Ticket cuối bài (gồm câu hỏi vận dụng 6 GB dữ liệu) | `exit_ticket_reflection` | — | `SRC-GDPT-2018-TIN6`, `SRC-PPCT-VIETHOA-TIN6-2026`, `SRC-SGK-KNTT-TIN6`, `SRC-KHBD-TIN6-BAI3-VIETHOA` |

---

## 3. Nguyên văn YCCĐ (`officialText` trích xuất trực tiếp từ `data/requirements/requirements-g6.json`)

| RequirementID | `officialText` (trích nguyên văn từ `data/requirements/requirements-g6.json`) | Hoạt động đảm nhiệm | Câu hỏi / Sản phẩm đánh giá |
|---|---|---|---|
| `G6-A-07` | Giải thích được có thể biểu diễn thông tin chỉ với hai kí hiệu 0 và 1. | `G6-L03-A01`, `G6-L03-A02`, `G6-L03-A04` | `G6-L03-Q001`, `G6-L03-PROD-01`, `G6-L03-Q002`, `G6-L03-Q004` |
| `G6-A-08` | Biết được bit là đơn vị nhỏ nhất trong lưu trữ thông tin. | `G6-L03-A03`, `G6-L03-A04` | `G6-L03-Q003`, `G6-L03-Q005` |
| `G6-A-09` | Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) của các đơn vị cơ bản đo dung lượng thông tin: Byte, KB, MB, GB, quy đổi được một cách gần đúng giữa các đơn vị đo lường này. Ví dụ: 1 KB bằng xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte. | `G6-L03-A05`, `G6-L03-A06` | `G6-L03-WS-01`, `G6-L03-Q006`, `G6-L03-Q007`, `G6-L03-PROD-02`, `G6-L03-Q008` |
| `G6-A-10` | Nêu được sơ lược khả năng lưu trữ của các thiết bị nhớ thông dụng như đĩa cứng, USB, CD, thẻ nhớ,... | `G6-L03-A06`, `G6-L03-A07`, `G6-L03-A08` | `G6-L03-PROD-02`, `G6-L03-Q009`, `G6-L03-Q010`, Exit Ticket (câu vận dụng 6 GB) |

---

## 4. Truy vết Năng lực số (`SRC-PHULUC3-TIN6-VIETHOA-2026` & Framework `SRC-TT02-2025-NLS`) trong `G6-L03-A06`

| Mã NLS | Mapping ID | Yêu cầu cần đạt gắn kết | Nguồn mapping cụ thể | Framework NLS | Thể hiện trong quy trình 5 bước của `G6-L03-A06` (WebQuest “Cứu bộ nhớ”) |
|---|---|---|---|---|---|
| `1.3.TC1a` | `NLS-MAP-G6-L03-01` | `G6-A-09`, `G6-A-10` | `SRC-PHULUC3-TIN6-VIETHOA-2026` | `SRC-TT02-2025-NLS` | Bước 1 & Bước 2: Đọc dữ liệu dung lượng tệp, sắp xếp và ước lượng tổng dung lượng theo bảng quy chiếu có cấu trúc (`MB` → `GB`). |
| `5.2.TC1a` | `NLS-MAP-G6-L03-02` | `G6-A-09`, `G6-A-10` | `SRC-PHULUC3-TIN6-VIETHOA-2026` | `SRC-TT02-2025-NLS` | Bước 1 & Bước 3: Xác định rõ nhu cầu lưu trữ thực tế (loại tệp, mục đích mang đi học hay lưu lâu dài, tổng dung lượng cần thiết). |
| `5.2.TC1b` | `NLS-MAP-G6-L03-03` | `G6-A-09`, `G6-A-10` | `SRC-PHULUC3-TIN6-VIETHOA-2026` | `SRC-TT02-2025-NLS` | Bước 4 & Bước 5: Chọn thiết bị nhớ thông dụng phù hợp (`USB 16 GB`, `Thẻ nhớ 32 GB`, `Ổ cứng 500 GB`, không chọn `CD 700 MB` hay `USB 4 GB` cho ~6 GB dữ liệu) và hoàn thành **Sản phẩm 2 (`PHIẾU TƯ VẤN LƯU TRỮ`)**. |
