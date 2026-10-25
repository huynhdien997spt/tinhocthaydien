# ANTIGRAVITY EXECUTION REPORT

> File này do Antigravity cập nhật sau khi hoàn thành thiết kế và rà soát kiến trúc cho task `AUTH-A1: ACCOUNT MANAGEMENT JSON v1.0`.

---

# TASK ID: AUTH-A1
**BRANCH:** `account-management-json-review`  
**BASE COMMIT:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`  
**TASK NAME:** Account Management Backend — Standardized JSON Account Import Foundation (Design Review)

---

## 1. DESIGN SUMMARY

Task `AUTH-A1` thiết lập nền tảng kiến trúc và đặc tả dữ liệu chuẩn hóa cho hệ thống quản lý tài khoản học sinh, giáo viên và quản trị viên của nền tảng **Tin học cùng Thầy Diễn**. Thiết kế này đóng vai trò là hợp đồng giao tiếp (Data Contract) để chuẩn bị cho việc xây dựng giao diện quản trị trên website trong task tiếp theo (`AUTH-A2`), giúp giáo viên cấp tài khoản và đặt lại mật khẩu trực tiếp mà không cần thao tác thủ công trên Google Sheets.

Các trụ cột thiết kế chính:
1. **Phân tách rạch ròi ranh giới dữ liệu:** Tách biệt tuyệt đối các trường do người dùng/client khai báo (`Client-Supplied Fields`) và các trường an ninh do máy chủ sở hữu (`Server-Owned Fields`).
2. **Kiểm soát xác thực Zero-Trust:** Quyền quản trị được suy diễn tại backend từ phiên làm việc (`requireSession_` và `requireRole_`); tuyệt đối không tin cậy dữ liệu phân quyền do client gửi lên.
3. **Phạm vi quản lý theo lớp phân công (Class-Scoping):** Giáo viên chỉ được phép quản lý học sinh thuộc các lớp được phân công trong bảng `TEACHER_ASSIGNMENTS` với cờ `Active = "TRUE"`.
4. **Vòng đời mật khẩu tạm an toàn (Zero Cleartext Persistence):** Mật khẩu tạm thời chỉ được trả về duy nhất một lần qua HTTPS trong phản hồi của thao tác được cấp quyền; không lưu bản rõ lâu dài trên Google Drive; thu hồi ngay lập tức toàn bộ các phiên làm việc cũ khi reset mật khẩu.
5. **Thẩm định hai tầng (Pre-validation & Bulk Atomic Write):** Thẩm định độc lập toàn bộ lô dữ liệu trong bộ nhớ RAM trước khi ghi; cơ chế Idempotency đảm bảo an toàn khi người dùng bấm lặp lại hoặc khi đường truyền bị gián đoạn.

---

## 2. EXISTING ARCHITECTURE COMPATIBILITY

Hệ thống bảo toàn 100% tính tương thích ngược với cấu trúc cơ sở dữ liệu và mã nguồn hiện hành tại baseline `ecc56e2`:

1. **Cấu trúc bảng Google Sheets được giữ nguyên vẹn:**
   - `USERS` (18 cột theo `USERS_HEADERS` tại `backend/Code.gs:21-22`).
   - `SESSIONS` (8 cột theo `SESSIONS_HEADERS` tại `backend/Code.gs:23`).
   - `TEACHER_ASSIGNMENTS` (7 cột theo `ASSIGNMENTS_HEADERS` tại `backend/Teacher.gs:26`).
   - `ENROLLMENTS`, `PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `EVENT_LOG`, `NEW_ACCOUNTS` hoàn toàn giữ nguyên, không xóa cột, không đổi tên cột.
2. **Khóa chính dữ liệu học tập bất biến:**
   - Khóa chính liên kết xuyên suốt của hệ sinh thái học tập là `StudentUID` (dạng chuỗi `"stu_" + UUID`).
   - `Username` và `StudentID` là định danh đăng nhập và hiển thị, có thể cập nhật trong tương lai mà không làm mất hoặc phá vỡ tính liên tục của dữ liệu học tập.
   - Tuyệt đối không lấy `FullName`, `ClassID` hoặc `StudentID` riêng lẻ làm khóa định danh dữ liệu học tập.
3. **Khả năng cùng tồn tại song song (Co-existence):**
   - Các hàm hiện có trong `backend/Code.gs` (`importUsers()`, `clearNewAccounts()`, `teacherResetPassword()`, `teacherLockUser()`) tiếp tục hoạt động độc lập cho quy trình quản trị thủ công qua Google Sheets.
   - Các API mới mở rộng khả năng quản trị qua web mà không làm thay đổi logic đăng nhập hay phân quyền của người dùng hiện tại.
4. **Bảo toàn dữ liệu các Phase trước:**
   - 100% Data Contract của Phase 2 (12 schemas, 38 YCCĐ CTGDPT 2018).
   - 100% Golden Lesson G6-L03 và các bài học Phase 3, Phase 4.

---

## 3. ACCOUNT IMPORT SCHEMA v1.0

Đặc tả chi tiết tại [account-import-schema-v1.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-import-schema-v1.md).

- **Cấp gốc (Root):**
  - `schemaVersion`: Bắt buộc, giá trị hằng số `"1.0"`.
  - `schoolYear`: Bắt buộc, định dạng `YYYY-YYYY` (ví dụ `"2026-2027"`), hai năm phải liên tiếp nhau.
  - `importMode`: Bắt buộc, giá trị `"create_only"` (chỉ hỗ trợ tạo mới, không cho phép ghi đè).
  - `accounts`: Bắt buộc, mảng chứa từ 1 đến 100 đối tượng tài khoản (giới hạn an toàn chống timeout Google Apps Script).
- **Cấp bản ghi tài khoản (`accounts[*]`):**
  - `accountId`: Bắt buộc; độ dài 3–60 ký tự; regex `^[A-Za-z0-9._-]{3,60}$`; không trùng lặp trong tệp và trong hệ thống.
  - `fullName`: Bắt buộc; độ dài 2–100 ký tự; họ tên tiếng Việt hợp lệ; không chứa ký tự công thức.
  - `role`: Bắt buộc; enum `["student", "teacher", "admin"]`.
  - `classId`: Bắt buộc đối với `student` (regex `^[A-Za-z0-9._-]{1,30}$`); rỗng đối với `teacher` và `admin`.
  - `grade`: Bắt buộc đối với `student` (số nguyên `1..12`); phải là `null` đối với `teacher` và `admin`.
  - `schoolLevel`: Bắt buộc đối với `student` (`"TIEUHOC"`, `"THCS"`, `"THPT"`); rỗng đối với `teacher` và `admin`.
- **Ma trận tương thích Cấp học & Khối lớp:**
  - `TIEUHOC`: Khối `1`, `2`, `3`, `4`, `5`.
  - `THCS`: Khối `6`, `7`, `8`, `9` (Khối 6 thuộc cấp THCS).
  - `THPT`: Khối `10`, `11`, `12`.

---

## 4. INTERNAL MAPPING

1. **Ánh xạ danh tính khởi tạo:**
   - `accountId` $\rightarrow$ `StudentID`
   - `accountId` $\rightarrow$ `Username`
2. **Các trường do máy chủ tự sinh độc lập:**
   - `StudentUID`: Tự sinh dạng `"stu_" + UUID` không gạch nối.
   - `TeacherUID`: Tự sinh dạng `"tch_" + UUID` (chỉ khi `role` là `teacher` hoặc `admin`; rỗng đối với `student`).
   - `PasswordHash` & `PasswordSalt`: Sinh salt ngẫu nhiên 16 bytes và băm PBKDF2-HMAC-SHA256 (1000 iterations).
   - `Active`: Mặc định `"TRUE"`.
   - `FailedAttempts`: Mặc định `0`.
   - `LockedUntil`: Mặc định chuỗi rỗng `""`.
   - `MustChangePassword`: Mặc định `"TRUE"`.
   - `CreatedAt` & `UpdatedAt`: Dấu thời gian ISO UTC hiện tại.
3. **Danh sách 16 trường cấm tuyệt đối (Server-Owned Forbidden Fields):**
   - `StudentUID`, `TeacherUID`, `PasswordHash`, `PasswordSalt`, `TemporaryPassword`, `MustChangePassword`, `SessionID`, `SessionToken`, `SessionTokenHash`, `FailedAttempts`, `LockedUntil`, `CreatedAt`, `UpdatedAt`, `Active`, `Revoked`, `DeviceInfo`.
   - Nếu phát hiện bất kỳ trường nào trong danh sách trên: Từ chối gói tin ngay lập tức với lỗi `FORBIDDEN_FIELD_INJECTED`.
4. **Quy tắc xử lý trùng lặp (Collision Policy):**
   - So khớp `Username` trong bảng `USERS` không phân biệt hoa thường (`taken[accountId.toUpperCase()]`).
   - Nếu trùng: Báo lỗi `ACCOUNT_ALREADY_EXISTS`.
   - Không xóa, không ghi đè, không sửa bản ghi cũ, không gộp người dùng dựa trên họ tên.

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
8. `classId` hợp lệ theo danh mục lớp của hệ sinh thái.
9. Không có `accountId` trùng lặp trong cùng một lô JSON (Intra-batch uniqueness).
10. Không có `Username` trùng lặp với tài khoản đang có trong hệ sinh thái (Database uniqueness).
11. Không chứa bất kỳ trường cấm nội bộ nào (`additionalProperties: false`).
12. Phòng vệ chèn công thức Google Sheets (Formula Injection Defense): Các trường văn bản không được bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`.
13. Giới hạn kích thước lô: Không vượt quá 100 tài khoản / 1 tệp JSON.
14. Chống leo thang đặc quyền: Kiểm tra vai trò của người nhập dữ liệu.
15. Kiểm tra phạm vi phân công lớp của giáo viên qua `TEACHER_ASSIGNMENTS`.

Bộ thẩm định trả về báo cáo chẩn đoán chi tiết đến từng dòng:
- `validCount`: Số bản ghi hợp lệ.
- `invalidCount`: Số bản ghi không hợp lệ.
- `duplicateCount`: Số bản ghi trùng lặp.
- `errors`: Mảng các lỗi chi tiết `{ index, accountId, field, code, message }`.
- `readyToImport`: Trạng thái sẵn sàng (`true` khi không có lỗi và không có trùng lặp).

---

## 6. API CONTRACTS

Đặc tả chi tiết tại [account-api-contract-v1.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-api-contract-v1.md).

Hệ thống định nghĩa 5 hành động quản trị chuẩn hóa:

| Hành động API | Quyền hạn | Mục đích nghiệp vụ | Đặc điểm an toàn |
|---|---|---|---|
| `validateAccountImport` | `teacher`, `admin` | Thẩm định cấu trúc và phân quyền tệp JSON | **Chế độ Dry-Run**: Không ghi dữ liệu vào Google Sheets |
| `createAccount` | `teacher` (chỉ học sinh trong lớp), `admin` (toàn quyền) | Tạo một tài khoản duy nhất | Trả mật khẩu tạm 1 lần duy nhất; đặt `MustChangePassword = TRUE` |
| `importAccountsBatch` | `teacher` (trong lớp), `admin` (toàn quyền) | Nhập hàng loạt tài khoản từ JSON | Chạy trong `withLock_`; kiểm tra Idempotency; ghi khối một lần |
| `resetAccountPassword` | `teacher` (trong lớp), `admin` (toàn quyền) | Cấp lại mật khẩu tạm cho học sinh | Thu hồi toàn bộ session cũ (`revokeAll_`); trả mật khẩu 1 lần |
| `listManagedAccounts` | `teacher` (trong lớp), `admin` (toàn quyền) | Lấy danh mục tài khoản để hiển thị | **Không bao giờ trả mật khẩu, token, hash hoặc salt** |

---

## 7. ROLE & SECURITY REVIEW

Đặc tả chi tiết tại [account-security-review.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-security-review.md).

1. **Mô hình hóa mối đe dọa STRIDE:** Đã phân tích và thiết lập kiểm soát phòng vệ cho 6 kịch bản tấn công: Giả mạo (T-01), Can thiệp công thức Sheets (T-02), Chối bỏ trách nhiệm (T-03), Lộ lọt mật khẩu (T-04), Từ chối dịch vụ (T-05), và Leo thang đặc quyền (T-06).
2. **Ma trận phân quyền (RBAC):**
   - Học sinh (`student`): Bị cấm tuyệt đối mọi hành vi quản trị (`FORBIDDEN`).
   - Giáo viên (`teacher`): Chỉ được quản lý học sinh thuộc lớp mình được phân công (`assignedSet_`). Tuyệt đối không được tạo/reset tài khoản giáo viên hoặc admin.
   - Quản trị viên (`admin`): Quản trị toàn hệ thống kèm chính sách chống tự khóa (Anti-Lockout: không được khóa hoặc xóa tài khoản admin hoạt động duy nhất).
3. **Entropy mật khẩu tạm:** 8 ký tự an toàn sinh ngẫu nhiên từ tập 54 ký tự ($7.23 \times 10^{13}$ tổ hợp), chống gây nhầm lẫn thị giác.
4. **Bảo vệ đồng thời (Concurrency):** Toàn bộ các thao tác ghi đều được bảo vệ bởi khóa phân tán `LockService.getScriptLock()` với thời gian chờ tối đa 15 giây.
5. **Chính sách bảo mật lưu trữ:** Không lưu mật khẩu rõ vào cơ sở dữ liệu `USERS` hay Google Drive qua luồng API mới.

---

## 8. TEST PLAN

Đặc tả chi tiết tại [account-test-plan.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-test-plan.md).

Hệ thống thiết lập bộ 25 Acceptance Test Vectors toàn diện:
- **Vector 01–05:** Thẩm định JSON hợp lệ, bắt lỗi cú pháp, thiếu trường bắt buộc, sai schema version, và trùng lặp trong nội bộ tệp.
- **Vector 06–10:** Xử lý trùng tài khoản có sẵn trong DB, ngăn chặn chèn `StudentUID` / `TemporaryPassword`, bắt lỗi lệch khối-cấp và sai định dạng năm học.
- **Vector 11–15:** Phân quyền giáo viên đúng lớp, chặn giáo viên tạo học sinh ngoài lớp, chặn giáo viên tạo admin, chặn học sinh gọi API quản trị, xác nhận quyền admin hợp lệ.
- **Vector 16–19:** Reset mật khẩu học sinh đúng lớp, chặn reset học sinh ngoài lớp, xác minh mật khẩu tạm chỉ trả 1 lần, xác minh thu hồi lập tức toàn bộ phiên cũ.
- **Vector 20–22:** Kiểm thử tính Idempotency khi nhập lại cùng một tệp, kiểm thử ScriptLock khi 2 tiến trình chạy đồng thời, kiểm thử phục hồi khi tác vụ bị gián đoạn giữa chừng.
- **Vector 23–25:** Xác minh tài khoản cũ vẫn đăng nhập bình thường (zero regression), xác minh dữ liệu học tập liên kết đúng `StudentUID`, xác minh không rò rỉ bất kỳ dữ liệu nhạy cảm nào qua API danh sách.

*Toàn bộ kiểm thử tuân thủ nguyên tắc sử dụng 100% dữ liệu giả lập (synthetic data), cách ly hoàn toàn khỏi dữ liệu thật.*

---

## 9. FILES CHANGED

Các tệp tài liệu và đặc tả mới được khởi tạo trên nhánh `account-management-json-review`:
1. `docs/auth/account-import-schema-v1.md`: Đặc tả chi tiết Hợp đồng Dữ liệu và JSON Schema v1.0.
2. `docs/auth/account-api-contract-v1.md`: Đặc tả 5 hành động API quản lý tài khoản web-based.
3. `docs/auth/account-security-review.md`: Đánh giá an toàn thông tin, STRIDE threat modeling và chính sách RBAC.
4. `docs/auth/account-test-plan.md`: Kế hoạch kiểm thử và bộ 25 Acceptance Test Vectors.
5. `agent/AGENT_REPORT.md`: Báo cáo nghiệm thu thiết kế toàn diện.

*Lưu ý: Không can thiệp hoặc chỉnh sửa bất kỳ dòng mã nguồn ứng dụng hay backend production nào trong vòng thiết kế này.*

---

## 10. RISKS & BLOCKERS

### Rủi ro Kỹ thuật (Technical Risks)
1. **Giới hạn thời gian thực thi của Google Apps Script:** Hạn mức 6 phút / lần chạy. Với thuật toán PBKDF2 thực thi bằng JavaScript đơn luồng trong Apps Script, mỗi lần tính hash mất khoảng 50–150ms. Một lô 100 tài khoản sẽ mất khoảng 10–15 giây để băm mật khẩu. Lô 100 tài khoản nằm hoàn toàn trong ngưỡng an toàn, nhưng không nên nâng giới hạn lô vượt quá 200 tài khoản.
2. **Không có cơ chế Rollback tự động nhiều dòng (Lack of Atomic Multi-Row Rollback):** Google Sheets API không hỗ trợ rollback transaction. Giải pháp đã thiết kế là: Thẩm định 100% trước khi ghi + Cơ chế Idempotency dựa trên `Username` + Ghi theo dải `setValues()`.

### Các Quyết định cần Cấp Thẩm quyền Phê duyệt (Approval Decisions)
1. **Phê duyệt Schema v1.0:** Chấp thuận cấu trúc tệp JSON chuẩn hóa và ma trận tương thích Khối lớp - Cấp học.
2. **Phê duyệt Danh mục 5 API Action Names:** Chấp thuận tên gọi và payload của `validateAccountImport`, `createAccount`, `importAccountsBatch`, `resetAccountPassword`, `listManagedAccounts`.
3. **Phê duyệt Chính sách Mật khẩu Tạm thời:** Thống nhất việc trả mật khẩu một lần qua API response và không ghi bản rõ vào bảng `NEW_ACCOUNTS` trên Google Drive đối với luồng JSON API.

---

# FINAL STATUS: READY_FOR_REVIEW

> Toàn bộ nội dung thiết kế, đặc tả hợp đồng dữ liệu, đánh giá an toàn và kế hoạch kiểm thử của task `AUTH-A1` đã hoàn tất, được lưu vết đầy đủ trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`.  
> Hệ thống tuân thủ nghiêm ngặt ranh giới thực thi: **DỪNG LẠI và CHỜ PHÊ DUYỆT (STOP)**. Tuyệt đối không tự ý triển khai mã nguồn backend hoặc chuyển sang task giao diện `AUTH-A2`.
