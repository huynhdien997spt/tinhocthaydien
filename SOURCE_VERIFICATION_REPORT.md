# BÁO CÁO KIỂM CHỨNG NGUỒN DỮ LIỆU CHƯƠNG TRÌNH LỚP 6 (`SOURCE_VERIFICATION_REPORT.md`)

- **Phase / Task:** `PHASE 2 / P2.5 FIX ROUND 2 ONLY`
- **Phương pháp kiểm chứng:** Kiểm chứng 2 lớp nguồn:
  - **Lớp A (Nguồn gốc do giáo viên / nhà trường cung cấp trên Google Drive):** Sử dụng **đúng 5 Drive ID tài liệu gốc của thầy** (tuyệt đối không dùng các Google Doc trung gian của ChatGPT).
  - **Lớp B (Nguồn pháp quy chính thức trên Internet):** CSDL Quốc gia về Văn bản pháp luật (`vbpl.vn`) với đúng `ItemID` của Thông tư 32/2018/TT-BGDĐT (`ItemID=146721`) và Thông tư 02/2025/TT-BGDĐT (`ItemID=175173`). Không overclaim trạng thái xác minh ngoài Internet nếu cổng bên ngoài cần tài khoản đăng nhập (`externalVerificationStatus = "pending"`).

---

## 1. Bảng kiểm chứng nguồn chi tiết (Mandatory Source Verification Table – Round 2)

| SourceID | Tên nguồn | Loại nguồn (`sourceType`) | Cơ quan phát hành (`authority`) | Drive ID gốc (Lớp A) & URL chính thức (Lớp B) | Phiên bản / năm (`versionOrSchoolYear`) | Ngày kiểm tra (`verifiedAt`) | Phạm vi sử dụng (`scopeUsed`) | Ưu tiên | Trạng thái kiểm chứng (`internal` / `external` / `overall`) | Ghi chú pháp lý & Xử lý mâu thuẫn |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `SRC-GDPT-2018-TIN6` | Chương trình giáo dục phổ thông môn Tin học – Lớp 6 (Ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT ngày 26/12/2018) | `curriculum_regulation` | Bộ Giáo dục và Đào tạo | **Drive ID gốc:** `13o_7GOH_en10qIrlgLTyqrIlJSgCZxma`<br>**VBPL URL:** `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721` | TT 32/2018/TT-BGDĐT (26/12/2018) | `2026-10-24T13:50:00+07:00` | Toàn bộ 38 Yêu cầu cần đạt (YCCĐ) môn Tin học lớp 6 (Chủ đề A–F) và 5 năng lực tin học cốt lõi (`NLa`–`NLe`). | `1` | `internal: verified`<br>`external: verified`<br>`overall: both_verified` | Đã sửa `ItemID` từ `134517` sang **`ItemID=146721`** (hồ sơ VBPL đúng của Thông tư 32/2018/TT-BGDĐT). **Ghi chú pháp lý:** Thông tư 17/2025/TT-BGDĐT chỉ sửa đổi một số nội dung thuộc các môn Lịch sử và Địa lí, Lịch sử, Địa lí và Giáo dục công dân; không thay đổi YCCĐ môn Tin học lớp 6 đang sử dụng. Khôi phục nguyên văn `officialText` và giữ bất biến mã `RequirementID` (`A05/A06`, `B02/B03`, `E01..E09`). |
| `SRC-PPCT-VIETHOA-TIN6-2026` | Phân phối chương trình (PPCT) môn Tin học 6 – Năm học 2026–2027 – Trường TH, THCS và THPT Việt Hoa | `school_ppct` | Trường TH, THCS và THPT Việt Hoa – Tổ Tin học | **Drive ID gốc:** `1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`<br>**URL:** `https://drive.google.com/file/d/1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM/view` | `2026-2027` | `2026-10-24T13:50:00+07:00` | Danh mục 16 bài học nội dung (`29 tiết`), `2 tiết ôn tập` (`CK1, CK2`), `4 tiết kiểm tra` (`GK1, CK1, GK2, CK2`) và lịch 35 tiết thực tế (`1..35`). | `2` | `internal: verified`<br>`external: not_applicable_internal_only`<br>`overall: internal_source_verified` | Đã thay Doc trung gian bằng file gốc PPCT của trường (`1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`). Sửa **Bài 5 = 2 tiết (90 phút)**; xóa bản ghi giả `"Ôn tập giữa học kì I"`; chuẩn hóa tổng **35 tiết = 29 lesson + 2 review + 4 assessment** và lịch `periodSchedule` (tiết 1–35). |
| `SRC-SGK-KNTT-TIN6` | Sách giáo khoa Tin học 6 – Bộ Kết nối tri thức với cuộc sống | `textbook` | Nhà xuất bản Giáo dục Việt Nam (Bộ GDĐT phê duyệt) | **Drive ID gốc:** `1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj`<br>**URL gốc:** `https://drive.google.com/file/d/1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj/view`<br>**External Ref:** `https://hanhtrangso.nxbgd.vn/sach-dien-tu/tin-hoc-6-10762` | Tái bản 2025–2026 (ISBN 978-604-0-26018-5) | `2026-10-24T13:50:00+07:00` | Tên bài học Bài 1–13, Bài 15–17, cấu trúc Bài 3 (Thông tin trong máy tính) và phần mở rộng kiến thức `TB`. | `3` | `internal: verified`<br>`external: pending`<br>`overall: internal_source_verified` | Bản gốc SGK trên Drive của thầy (`1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj`) đã xác minh (`internal = verified`); cổng Hành trang số yêu cầu đăng nhập nên ghi trung thực `externalVerificationStatus = "pending"` và `verificationStatus = "internal_source_verified"` (không overclaim `both_verified`). |
| `SRC-TT02-2025-NLS` | Thông tư số 02/2025/TT-BGDĐT ngày 24/01/2025 quy định Khung năng lực số cho người học | `digital_competency_framework` | Bộ Giáo dục và Đào tạo | **VBPL URL:** `https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=175173`<br>**Drive ID đối chiếu:** `1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC` | TT 02/2025/TT-BGDĐT (24/01/2025) | `2026-10-24T13:50:00+07:00` | Định nghĩa khung năng lực số chính thức và các miền năng lực mức TC1 (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`). | `4` | `internal: verified`<br>`external: verified`<br>`overall: both_verified` | Đã cập nhật URL chính thức trên CSDL Quốc gia về VBPL với **`ItemID=175173`** (Thông tư 02/2025/TT-BGDĐT ngày 24/01/2025). |
| `SRC-PHULUC3-TIN6-VIETHOA-2026` | Phụ lục III – Kế hoạch giáo dục của giáo viên môn Tin học lớp 6 (Tích hợp Năng lực số) – Trường TH, THCS và THPT Việt Hoa | `school_deployment_appendix` | Trường TH, THCS và THPT Việt Hoa – Tổ Tin học | **Drive ID gốc:** `1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`<br>**URL:** `https://drive.google.com/file/d/1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC/view` | `2026-2027` | `2026-10-24T13:50:00+07:00` | Nguồn gốc chính thức quy định mapping các mã NLS (`1.3.TC1a`, `5.2.TC1a`, `5.2.TC1b`) vào Bài 3 (`G6-L03`). | `5` | `internal: verified`<br>`external: not_applicable_internal_only`<br>`overall: internal_source_verified` | Đã trỏ trực tiếp tới file gốc Phụ lục III lớp 6 trên Drive (`1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC`). |
| `SRC-KHBD-TIN6-BAI3-VIETHOA` | Kế hoạch bài dạy (KHBD) Tin học 6 – Bài 3: Thông tin trong máy tính – Trường TH, THCS và THPT Việt Hoa | `teacher_lesson_plan` | Trường TH, THCS và THPT Việt Hoa – Giáo viên Tin học | **Drive ID gốc:** `1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp`<br>**URL:** `https://drive.google.com/file/d/1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp/view` | `2026-2027` | `2026-10-24T13:50:00+07:00` | Tham chiếu bổ sung (`supplementaryLessonPlanSourceId`) cho tổ chức hoạt động dạy học và tích hợp NLS trong Bài 3 (`G6-L03`). | `6` | `internal: verified`<br>`external: not_applicable_internal_only`<br>`overall: internal_source_verified` | Đã bổ sung bản ghi nguồn riêng cho KHBD Bài 3 (`1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp`) và gắn vào `supplementaryLessonPlanSourceId` trong [nls-mappings-g6.json](file:///Users/huynhvandien/tinhocthaydien/data/competencies/nls-mappings-g6.json). |

---

## 2. Đối chiếu 38 Yêu cầu cần đạt (YCCĐ) & Tính bất biến của `RequirementID`

- **Provenance trong Trusted Snapshot ([tools/curriculum/trusted-official-requirements-g6.json](file:///Users/huynhvandien/tinhocthaydien/tools/curriculum/trusted-official-requirements-g6.json)):**
  - `sourceId`: `"SRC-GDPT-2018-TIN6"`
  - `sourceDocumentDriveId`: `"13o_7GOH_en10qIrlgLTyqrIlJSgCZxma"`
  - `sourceOfficialUrl`: `"https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721"`
  - `sourceSection`: `"LỚP 6 – Chủ đề A–F"`
  - `verifiedAt`: `"2026-10-24T13:50:00+07:00"`
- **Khôi phục `RequirementID` bất biến (Immutable IDs):**
  - `G6-A-05`: Vai trò máy tính là công cụ hiệu quả thu thập, lưu trữ, xử lí và truyền thông tin + ví dụ minh hoạ.
  - `G6-A-06`: Nêu được các bước cơ bản trong xử lí thông tin.
  - `G6-A-09`: Nguyên văn đầy đủ cả câu ví dụ trong CTGDPT (`"...Ví dụ: 1 KB xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte."`), không đưa `TB` vào `officialText`.
  - `G6-B-02`: Nêu được ví dụ cụ thể về trường hợp mạng không dây tiện dụng hơn mạng có dây.
  - `G6-B-03`: Các thành phần mạng và thiết bị mạng cơ bản (`"...như máy tính, cáp nối, Switch, Access Point,..."` — dùng đúng `"cáp nối"`).
  - `G6-C-01`: `"Trình bày được sơ lược về các khái niệm WWW, website, địa chỉ của website, trình duyệt."`
  - `G6-C-07`: `"Biết cách đăng kí tài khoản email, thực hiện được một số thao tác cơ bản như đăng nhập tài khoản email, soạn và gửi email, thoát ra."`
  - `G6-D-01..05`: Giữ đúng 5 gạch đầu dòng nguyên văn của CTGDPT 2018 (`G6-D-03` = `"Bảo vệ được thông tin và tài khoản cá nhân với sự hỗ trợ của người lớn."`; `G6-D-05` = `"Nhận diện được một số thông điệp lừa đảo hoặc mang nội dung xấu."`).
  - `G6-E-01..06`: 6 YCCĐ thuộc tiểu mục *Soạn thảo văn bản cơ bản*.
  - `G6-E-07..09`: 3 YCCĐ thuộc tiểu mục *Sơ đồ tư duy và phần mềm sơ đồ tư duy*.

---

## 3. Đối chiếu PPCT thực tế Trường Việt Hoa (`1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM`) – 35 tiết/năm

- **16 bài học nội dung = 29 tiết:**
  - `Bài 1..7`: 2 tiết/bài (trong đó **Bài 5 = 2 tiết / 90 phút**) = 14 tiết
  - `Bài 8`: 1 tiết (45 phút) = 1 tiết
  - `Bài 9..12`: 2 tiết/bài = 8 tiết
  - `Bài 13`: 1 tiết (45 phút) = 1 tiết
  - `Bài 14`: **KHÔNG CÓ TRONG PPCT**
  - `Bài 15..16`: 2 tiết/bài = 4 tiết
  - `Bài 17`: 1 tiết (45 phút) = 1 tiết
  - **Tổng bài học nội dung:** **29 tiết**
- **6 tiết Ôn tập & Kiểm tra định kỳ (không có `"Ôn tập giữa học kì I"`):**
  - `Kiểm tra giữa HKI` (Tiết 8) = 1 tiết
  - `Ôn tập cuối HKI` (Tiết 17) = 1 tiết
  - `Kiểm tra cuối HKI` (Tiết 18) = 1 tiết
  - `Kiểm tra giữa HKII` (Tiết 26) = 1 tiết
  - `Ôn tập cuối HKII` (Tiết 34) = 1 tiết
  - `Kiểm tra cuối HKII` (Tiết 35) = 1 tiết
  - **Tổng cộng:** `29 lesson + 2 review + 4 assessment = 35 tiết` (xen kẽ Bài 4 ở tiết 7 & 9; Bài 12 ở tiết 25 & 27).

---

## 4. Kết luận

```text
PHASE 2 / P2.5 FIX ROUND 2: READY_FOR_REVIEW
```
