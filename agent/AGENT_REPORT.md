# ANTIGRAVITY EXECUTION REPORT

> File này do Antigravity cập nhật sau khi thực hiện đợt hiệu chỉnh thiết kế `AUTH-A1-R1: DESIGN REVIEW CORRECTIONS`.

---

# TASK ID: AUTH-A1-R1
**BRANCH:** `account-management-json-review`  
**BASE COMMIT:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`  
**TASK NAME:** Account Management Backend — Standardized JSON Account Import Foundation (Design Review Corrections)

---

## 1. DESIGN SUMMARY & CORRECTIONS R1

Đợt hiệu chỉnh thiết kế `AUTH-A1-R1` hoàn thiện và chuẩn hóa các nội dung theo yêu cầu rà soát kiến trúc:

1. **Thu hồi tuyên bố "Bulk Atomic Write" & Khẳng định thực tế Google Sheets:**
   - Xác định rõ ràng: Google Sheets **KHÔNG PHẢI là cơ sở dữ liệu quan hệ (RDBMS)**, **KHÔNG hỗ trợ giao dịch ACID đa dòng và KHÔNG có cơ chế rollback tự động**.
   - Thu hồi hoàn toàn các tuyên bố về "tính nguyên tử" hay "atomic rollback" của lô nhập.
   - Thay thế bằng **Cơ chế Idempotency theo từng bản ghi (Per-Record Idempotency)** và **Quy trình Phục hồi gián đoạn (Interrupted Batch Recovery)**.
2. **Xử lý tình huống Phản hồi Thất lạc (Lost Response Handling):**
   - Giải quyết tình huống máy chủ đã tạo tài khoản thành công nhưng mạng bị ngắt trước khi client nhận được phản hồi chứa mật khẩu tạm.
   - Tuân thủ nghiêm ngặt chính sách **Zero Cleartext Persistence**: Máy chủ tuyệt đối không lưu trữ bản rõ của mật khẩu tạm để gửi lại.
   - Thiết lập quy trình **Cấp lại mật khẩu mới an toàn (Fresh Re-Issuance Protocol)** qua hành động `reissueBatchPasswords` hoặc `resetAccountPassword`: máy chủ sinh mật khẩu mới, muối mới, băm PBKDF2 mới, thu hồi session cũ và cập nhật đè lên bảng `USERS`. Mật khẩu cũ bị thất lạc lập tức vô hiệu hóa.
3. **Rà soát Chính sách Băm PBKDF2:**
   - Phân định rõ ràng:
     + **Hiện trạng thực tế trong `Code.gs:283-294`:** `pbkdf2Iterations: 1000`, 1 khối 32 byte, salt 16 byte, chạy bằng JavaScript thuần trong Google Apps Script (~50–150 ms/hash).
     + **Tiêu chuẩn hiện đại bên ngoài (NIST / OWASP):** Khuyến nghị 600.000+ vòng lặp trên phần cứng máy chủ có crypto native.
     + **Rào cản kỹ thuật:** Nếu áp dụng 600.000 vòng lặp trên Google Apps Script, 1 phép tính hash sẽ mất 60–90 giây, làm sập toàn bộ ứng dụng do chạm trần giới hạn thời gian thực thi (6 phút).
     + **Quyết định kiến trúc:** Giữ nguyên chính xác cấu hình 1000 vòng lặp hiện có (`DESIGN_PROPOSAL`); không tự ý thay đổi thuật toán; bù đắp an ninh bằng chính sách khóa tài khoản (Account Lockout: 5 lần sai khóa 10 phút) và băm token phiên với `TOKEN_PEPPER`.
4. **Chuẩn hóa Trạng thái Khẳng định:**
   - Toàn bộ các khẳng định về hành vi chưa chạy trên môi trường live Apps Script đều được chuyển sang trạng thái **`DESIGN_PROPOSAL`** hoặc **`NOT_YET_VERIFIED`**.

---

## 2. EXISTING ARCHITECTURE COMPATIBILITY

Hệ thống bảo toàn 100% tính tương thích ngược với cấu trúc cơ sở dữ liệu và mã nguồn hiện hành tại baseline `ecc56e2`:

1. **Khóa chính dữ liệu học tập bất biến:**
   - `StudentUID` (dạng `"stu_" + UUID v4`) là khóa chính duy nhất liên kết với toàn bộ dữ liệu học tập (`PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `LEARNING_SESSIONS`, `EVENT_LOG`).
   - `Username` và `StudentID` đóng vai trò là định danh đăng nhập và hiển thị, không dùng làm khóa chính định danh dữ liệu học tập.
2. **Cấu trúc bảng Google Sheets được giữ nguyên vẹn:**
   - `USERS` (18 cột theo `USERS_HEADERS` tại `backend/Code.gs:21-22`).
   - `SESSIONS` (8 cột theo `SESSIONS_HEADERS` tại `backend/Code.gs:23`).
   - `TEACHER_ASSIGNMENTS` (7 cột theo `ASSIGNMENTS_HEADERS` tại `backend/Teacher.gs:26`).
   - `ENROLLMENTS`, `PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `EVENT_LOG`, `NEW_ACCOUNTS` giữ nguyên vẹn 100%.
3. **Quy trình truyền thống hoạt động độc lập:**
   - Các hàm `importUsers()`, `clearNewAccounts()`, `teacherResetPassword()`, `teacherLockUser()` trong `Code.gs` và `Teacher.gs` tiếp tục hoạt động độc lập cho quy trình quản trị qua Google Sheets.
4. **Bảo tồn dữ liệu các Phase trước:**
   - 100% Data Contract của Phase 2 (12 schemas, 38 YCCĐ CTGDPT 2018).
   - 100% Golden Lesson G6-L03 và các bài học Phase 3, Phase 4.

---

## 3. ACCOUNT IMPORT SCHEMA v1.0

Đặc tả chi tiết tại [account-import-schema-v1.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-import-schema-v1.md) (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).

- **Cấp gốc (Root):**
  - `schemaVersion`: Bắt buộc, giá trị hằng số `"1.0"`.
  - `schoolYear`: Bắt buộc, định dạng `YYYY-YYYY` (ví dụ `"2026-2027"`), hai năm phải liên tiếp nhau.
  - `importMode`: Bắt buộc, giá trị `"create_only"`.
  - `accounts`: Bắt buộc, mảng chứa từ 1 đến 100 đối tượng tài khoản.
- **Cấp bản ghi tài khoản (`accounts[*]`):**
  - `accountId`: Bắt buộc; độ dài 3–60 ký tự; regex `^[A-Za-z0-9._-]{3,60}$`; duy nhất trong tệp và trong hệ thống.
  - `fullName`: Bắt buộc; độ dài 2–100 ký tự; họ tên tiếng Việt hợp lệ; không chứa ký tự công thức.
  - `role`: Bắt buộc; enum `["student", "teacher", "admin"]`.
  - `classId`: Bắt buộc đối với `student` (regex `^[A-Za-z0-9._-]{1,30}$`); rỗng đối với `teacher` và `admin`.
  - `grade`: Bắt buộc đối với `student` (số nguyên `1..12`); phải là `null` đối với `teacher` và `admin`.
  - `schoolLevel`: Bắt buộc đối với `student` (`"TIEUHOC"`, `"THCS"`, `"THPT"`); rỗng đối với `teacher` và `admin`.
- **Ma trận tương thích Cấp học & Khối lớp:**
  - `TIEUHOC`: Khối `1`, `2`, `3`, `4`, `5`.
  - `THCS`: Khối `6`, `7`, `8`, `9`.
  - `THPT`: Khối `10`, `11`, `12`.

---

## 4. INTERNAL MAPPING

1. **Ánh xạ danh tính khởi tạo:**
   - `accountId` $\rightarrow$ `StudentID`
   - `accountId` $\rightarrow$ `Username`
2. **Các trường do máy chủ tự sinh độc lập:**
   - `StudentUID`: Tự sinh dạng `"stu_" + UUID` không gạch nối.
   - `TeacherUID`: Tự sinh dạng `"tch_" + UUID` (chỉ khi `role` là `teacher` hoặc `admin`; rỗng đối với `student`).
   - `PasswordHash` & `PasswordSalt`: Sinh salt ngẫu nhiên 16 bytes và băm PBKDF2-HMAC-SHA256 (1000 iterations theo baseline).
   - `Active`: Mặc định `"TRUE"`.
   - `FailedAttempts`: Mặc định `0`.
   - `LockedUntil`: Mặc định chuỗi rỗng `""`.
   - `MustChangePassword`: Mặc định `"TRUE"`.
   - `CreatedAt` & `UpdatedAt`: Dấu thời gian ISO UTC hiện tại.
3. **Danh sách 16 trường cấm tuyệt đối (Server-Owned Forbidden Fields):**
   - `StudentUID`, `TeacherUID`, `PasswordHash`, `PasswordSalt`, `TemporaryPassword`, `MustChangePassword`, `SessionID`, `SessionToken`, `SessionTokenHash`, `FailedAttempts`, `LockedUntil`, `CreatedAt`, `UpdatedAt`, `Active`, `Revoked`, `DeviceInfo`.
   - Nếu phát hiện bất kỳ trường nào trong danh sách trên: Từ chối gói tin ngay lập tức với lỗi `FORBIDDEN_FIELD_INJECTED`.
4. **Quy tắc xử lý trùng lặp (Per-Record Idempotency):**
   - So khớp `Username` trong bảng `USERS` không phân biệt hoa thường (`taken[accountId.toUpperCase()]`).
   - Nếu trùng: Đánh dấu `status = "skipped_existing"`, không xóa, không sửa, không đổi mật khẩu của bản ghi cũ, không gộp người dùng dựa trên họ tên.

---

## 5. VALIDATION

Hệ thống thiết lập 15 quy tắc kiểm tra nghiêm ngặt chạy hoàn toàn trong bộ nhớ RAM ở chế độ Dry-Run:
1. JSON đúng cú pháp parser.
2. `schemaVersion === "1.0"`.
3. Đầy đủ các trường bắt buộc theo từng vai trò.
4. Đúng kiểu dữ liệu và giới hạn độ dài.
5. Định dạng năm học `YYYY-YYYY` và tính liên tiếp của hai năm.
6. `grade` là số nguyên `1..12` đối với học sinh.
7. Ma trận tương thích `grade` và `schoolLevel`.
8. `classId` hợp lệ theo danh mục lớp.
9. Không có `accountId` trùng lặp trong cùng một lô JSON (Intra-batch uniqueness).
10. Không có `Username` trùng lặp với tài khoản đang có trong hệ thống (Database collision).
11. Không chứa bất kỳ trường cấm nội bộ nào (`additionalProperties: false`).
12. Phòng vệ chèn công thức Google Sheets (Formula Injection Defense): Các trường văn bản không được bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`.
13. Giới hạn kích thước lô: Không vượt quá 100 tài khoản / 1 lần gọi.
14. Chống leo thang đặc quyền: Kiểm tra vai trò của người nhập dữ liệu.
15. Kiểm tra phạm vi phân công lớp của giáo viên qua `TEACHER_ASSIGNMENTS`.

---

## 6. API CONTRACTS

Đặc tả chi tiết tại [account-api-contract-v1.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-api-contract-v1.md) (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).

Hệ thống định nghĩa 6 hành động quản trị web-based chuẩn hóa:

| Hành động API | Quyền hạn | Mục đích nghiệp vụ | Đặc điểm an toàn |
|---|---|---|---|
| `validateAccountImport` | `teacher`, `admin` | Thẩm định cấu trúc và phân quyền tệp JSON | **Chế độ Dry-Run**: Không ghi dữ liệu vào Google Sheets |
| `createAccount` | `teacher` (học sinh trong lớp), `admin` (toàn quyền) | Tạo một tài khoản duy nhất | Trả mật khẩu tạm 1 lần duy nhất; đặt `MustChangePassword = TRUE` |
| `importAccountsBatch` | `teacher` (trong lớp), `admin` (toàn quyền) | Nhập hàng loạt tài khoản từ JSON | Chạy trong `withLock_`; kiểm tra Idempotency từng dòng; ghi dải `setValues` |
| `reissueBatchPasswords` | `teacher` (trong lớp), `admin` (toàn quyền) | Cấp lại mật khẩu mới khi phản hồi batch bị mất mạng | **Sinh mật khẩu mới hoàn toàn**, cập nhật băm mới, vô hiệu hóa mật khẩu cũ |
| `resetAccountPassword` | `teacher` (trong lớp), `admin` (toàn quyền) | Cấp lại mật khẩu tạm cho 1 học sinh | Thu hồi toàn bộ session cũ (`revokeAll_`); trả mật khẩu 1 lần |
| `listManagedAccounts` | `teacher` (trong lớp), `admin` (toàn quyền) | Lấy danh mục tài khoản để hiển thị | **Không bao giờ trả mật khẩu, token, hash hoặc salt** |

---

## 7. ROLE & SECURITY REVIEW

Đặc tả chi tiết tại [account-security-review.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-security-review.md) (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).

1. **Phân tích STRIDE:** Đã mô hình hóa và thiết lập cơ chế phòng vệ cho 6 mối đe dọa (Giả mạo, Can thiệp công thức, Chối bỏ trách nhiệm, Lộ lọt mật khẩu, Từ chối dịch vụ, và Leo thang đặc quyền).
2. **Ma trận phân quyền RBAC:**
   - Học sinh (`student`): Bị cấm tuyệt đối mọi hành vi quản trị (`FORBIDDEN`).
   - Giáo viên (`teacher`): Chỉ quản lý học sinh thuộc lớp mình được phân công (`assignedSet_`). Tuyệt đối không được tạo/reset tài khoản giáo viên hay admin.
   - Quản trị viên (`admin`): Quản trị toàn hệ thống kèm chính sách chống tự khóa (Anti-Lockout Policy: không được tự khóa hoặc vô hiệu hóa admin đang hoạt động duy nhất).
3. **Entropy mật khẩu tạm:** 8 ký tự an toàn sinh ngẫu nhiên từ tập 54 ký tự ($7.23 \times 10^{13}$ tổ hợp), chống gây nhầm lẫn thị giác.
4. **Bảo vệ đồng thời:** Toàn bộ thao tác ghi chạy trong khối `withLock_` với ScriptLock chờ tối đa 15 giây.
5. **Chính sách Zero Cleartext Persistence:** Không lưu trữ mật khẩu rõ trên Google Sheets hay cache phía máy chủ; quy trình cấp lại mật khẩu tạo ra mật khẩu mới độc lập.

---

## 8. TEST PLAN

Đặc tả chi tiết tại [account-test-plan.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-test-plan.md) (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).

Hệ thống thiết lập bộ 27 Acceptance Test Vectors toàn diện (mọi vector đều được gắn nhãn `DESIGN_PROPOSAL / NOT_YET_VERIFIED`):
- **Vector 01–05:** Thẩm định JSON hợp lệ, bắt lỗi cú pháp, thiếu trường bắt buộc, sai schemaVersion, trùng lặp nội bộ tệp.
- **Vector 06–10:** Trùng tài khoản trong DB, ngăn chặn chèn StudentUID/TemporaryPassword, lệch khối-cấp, sai định dạng năm học.
- **Vector 11–15:** Phân quyền giáo viên đúng lớp, chặn giáo viên tạo học sinh ngoài lớp, chặn giáo viên tạo admin, chặn học sinh gọi API quản trị, xác nhận quyền admin.
- **Vector 16–19:** Reset mật khẩu học sinh đúng lớp, chặn reset học sinh ngoài lớp, xác minh mật khẩu tạm chỉ trả 1 lần, xác minh thu hồi lập tức phiên cũ.
- **Vector 20–22:** Kiểm thử tính Idempotency khi nhập lại cùng một tệp, kiểm thử ScriptLock khi 2 tiến trình chạy đồng thời, kiểm thử phục hồi khi tác vụ bị gián đoạn giữa chừng.
- **Vector 23–25:** Xác minh tài khoản cũ vẫn đăng nhập bình thường (zero regression), dữ liệu học tập gắn đúng StudentUID, không rò rỉ dữ liệu nhạy cảm qua API danh sách.
- **Vector 26:** Xác minh quy trình xử lý phản hồi thất lạc & cấp lại mật khẩu tạm mới an toàn (`reissueBatchPasswords`).
- **Vector 27:** Rà soát baseline PBKDF2 (1000 vòng lặp, băm 32-byte, an toàn hạn mức CPU Google Apps Script).

---

## 9. FILES CHANGED

Các tệp tài liệu và đặc tả trên nhánh `account-management-json-review`:
1. `docs/auth/account-import-schema-v1.md`: Đặc tả Hợp đồng Dữ liệu và JSON Schema v1.0 (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).
2. `docs/auth/account-api-contract-v1.md`: Đặc tả 6 hành động API quản lý tài khoản web-based (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).
3. `docs/auth/account-security-review.md`: Đánh giá An toàn Thông tin, Rà soát PBKDF2, Google Sheets Limits, STRIDE Threat Model và Chính sách RBAC (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).
4. `docs/auth/account-test-plan.md`: Kế hoạch Kiểm thử và 27 Acceptance Test Vectors (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).
5. `agent/AGENT_REPORT.md`: Báo cáo Nghiệm thu Hiệu chỉnh Thiết kế Toàn diện.

*(Cam kết: Không sửa đổi bất kỳ tệp mã nguồn ứng dụng hay backend production nào trong vòng thiết kế này).*

---

## 10. RISKS & BLOCKERS

### Rủi ro Kỹ thuật (Technical Risks)
1. **Google Sheets không có ACID Transaction / Rollback:** Đã xử lý bằng thiết kế tiền thẩm định 100% trong RAM + Idempotency theo từng bản ghi + Khóa phân tán ScriptLock.
2. **Hạn mức CPU của Google Apps Script (Giới hạn 6 phút):** Thuật toán PBKDF2-HMAC-SHA256 chạy trong pure JS mất 50–150ms/hash. Lô 100 tài khoản mất 10–15 giây CPU. Bắt buộc giữ giới hạn $\le 100$ tài khoản / batch để tránh timeout.
3. **Mất phản hồi chứa mật khẩu tạm thời:** Đã thiết kế quy trình cấp lại mật khẩu mới an toàn (`reissueBatchPasswords`), bảo đảm máy chủ không lưu bản rõ của mật khẩu cũ.

### Các Quyết định cần Cấp Thẩm quyền Phê duyệt (Approval Decisions)
1. Phê duyệt Account Import Schema v1.0 (`DESIGN_PROPOSAL`).
2. Phê duyệt danh mục 6 API Action Names (`validateAccountImport`, `createAccount`, `importAccountsBatch`, `reissueBatchPasswords`, `resetAccountPassword`, `listManagedAccounts`).
3. Phê duyệt việc duy trì baseline `AUTH_CONFIG.pbkdf2Iterations: 1000` (không nâng lên 600.000 để tránh sập Apps Script).
4. Phê duyệt quy trình xử lý phản hồi thất lạc bằng cách cấp lại mật khẩu mới thay vì tìm cách lưu bản rõ trên Google Drive.

---

# FINAL STATUS: READY_FOR_REVIEW

> Toàn bộ các hiệu chỉnh theo yêu cầu rà soát thiết kế `AUTH-A1-R1` đã hoàn tất, được lưu vết đầy đủ trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`.  
> Hệ thống tuân thủ nghiêm ngặt ranh giới thực thi: **DỪNG LẠI và CHỜ PHÊ DUYỆT (STOP)**. Tuyệt đối không tự ý triển khai mã nguồn backend hoặc chuyển sang task giao diện `AUTH-A2`.
