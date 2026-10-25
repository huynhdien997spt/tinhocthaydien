# ACCOUNT MANAGEMENT API CONTRACT v1.0
## Interface Specifications for Web-Based Account Administration

- **API Version:** `1.0`
- **Specification Status:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED (Pre-Implementation Review)`
- **Protocol:** HTTPS POST (Google Apps Script Web App `doPost(e)` endpoint)
- **Content-Type:** `text/plain;charset=UTF-8` (tránh Preflight CORS trong browser)
- **Response Format:** `application/json`
- **Target Subsystem:** Google Apps Script (`backend/Code.gs`, `backend/Teacher.gs`)
- **Repository:** `huynhdien997spt/tinhocthaydien`
- **Working Branch:** `account-management-json-review`
- **Baseline Commit:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`

---

## 1. Kiến trúc Tổng quan và Ranh giới Thiết kế (Design Proposal)

Hệ thống quản lý tài khoản web-based là một **đề xuất thiết kế (DESIGN_PROPOSAL)** nhằm mở rộng kiến trúc xác thực hiện có của nền tảng mà **không làm thay đổi bất kỳ cơ chế cốt lõi nào**:
1. **Xác thực phiên (Session-Driven):** Mọi yêu cầu quản trị phải kèm theo `token` hợp lệ của phiên làm việc đang hoạt động.
2. **Kiểm soát vai trò nghiêm ngặt (Strict RBAC):** Quyền hạn được xác định tại backend từ thông tin phiên đã băm HMAC; không tin cậy dữ liệu vai trò do frontend gửi lên.
3. **Phạm vi phân công (Class Assignment Scoping):** Giáo viên chỉ được phép quản lý học sinh thuộc danh sách lớp được phân công trong bảng `TEACHER_ASSIGNMENTS` với cờ `Active = "TRUE"`.
4. **Chuẩn hóa cấu trúc phản hồi:**
   - Khi thành công:
     ```json
     {
       "success": true,
       "data": { ... },
       "error": null
     }
     ```
   - Khi thất bại:
     ```json
     {
       "success": false,
       "data": null,
       "error": {
         "code": "STRING_CONSTANT",
         "message": "Thông điệp mô tả thân thiện, rõ ràng",
         "details": []
       }
     }
     ```

---

## 2. Bảng Danh mục Mã lỗi (Error Codes Catalog)

| Mã lỗi (`code`) | Ý nghĩa nghiệp vụ | Phản ứng đề xuất cho Frontend |
|---|---|---|
| `INVALID_SESSION` | Token bị thiếu, không tồn tại hoặc đã bị thu hồi | Điều hướng về màn hình đăng nhập |
| `SESSION_EXPIRED` | Phiên làm việc đã quá 8 giờ hoặc quá hạn idle | Điều hướng về màn hình đăng nhập |
| `PASSWORD_CHANGE_REQUIRED` | Tài khoản quản trị đang mang cờ `MustChangePassword = TRUE` | Bắt buộc đổi mật khẩu trước khi gọi API quản lý |
| `FORBIDDEN` | Tài khoản không có vai trò phù hợp (ví dụ: học sinh gọi API quản trị, hoặc giáo viên cố tạo admin) | Báo thông báo không có quyền |
| `UNAUTHORIZED` | Giáo viên cố gắng tạo/truy cập/reset tài khoản học sinh ở lớp không được phân công | Báo thông báo lớp ngoài phạm vi phân công |
| `BAD_REQUEST` | Cấu trúc payload JSON không đúng định dạng hoặc thiếu trường bắt buộc | Yêu cầu kiểm tra cú pháp payload |
| `UNSUPPORTED_SCHEMA_VERSION` | `schemaVersion` khác `"1.0"` | Báo lỗi phiên bản tệp không được hỗ trợ |
| `INVALID_SCHOOL_YEAR` | Định dạng năm học sai hoặc hai năm không liên tiếp | Báo lỗi định dạng năm học (YYYY-YYYY) |
| `UNSUPPORTED_IMPORT_MODE` | `importMode` khác `"create_only"` | Chỉ cho phép chế độ `create_only` trong v1.0 |
| `FORBIDDEN_FIELD_INJECTED` | Payload chứa trường cấm do máy chủ quản lý (StudentUID, PasswordHash,...) | Từ chối tệp và liệt kê trường vi phạm |
| `ACCOUNT_ALREADY_EXISTS` | `accountId` / `Username` đã tồn tại trong bảng `USERS` | Không ghi đè; từ chối tạo mới |
| `COLLISION_EXISTING_ACCOUNT` | `accountId` trùng với tài khoản đã có nhưng không thuộc lô nạp lại hợp lệ | Từ chối bản ghi để chống nhận nhầm hoặc ghi đè danh tính |
| `STUDENT_ALREADY_ACTIVE` | Học sinh đã đổi mật khẩu hoặc đã bắt đầu học tập | Từ chối reset hàng loạt để bảo vệ tài khoản đang học |
| `BATCH_PROVENANCE_UNVERIFIED` | Không chứng minh được tài khoản thuộc lô nạp vừa tạo | Chặn reset hàng loạt; yêu cầu reset từng tài khoản có kiểm soát |
| `ASSIGNMENT_REVOKED` | Phân công lớp của giáo viên bị thay đổi giữa lúc thẩm định và ghi | Hủy bỏ tác vụ để bảo đảm an toàn phân quyền (chống TOCTOU) |
| `DUPLICATE_IN_BATCH` | `accountId` xuất hiện từ 2 lần trở lên trong cùng một lô JSON | Yêu cầu sửa các dòng trùng trong tệp |
| `GRADE_LEVEL_MISMATCH` | Khối lớp không phù hợp với cấp học (ví dụ: lớp 6 cấp Tiểu học) | Báo lỗi tương thích khối lớp |
| `FORMULA_INJECTION_DETECTED` | Trường dữ liệu bắt đầu bằng ký tự điều khiển/công thức (`=`, `+`, `-`, `@`) | Từ chối để chống tấn công CSV/Sheets injection |
| `BATCH_SIZE_EXCEEDED` | Lô vượt quá 100 tài khoản | Yêu cầu chia nhỏ tệp để tránh timeout 6 phút của GAS |
| `LOCK_ACQUISITION_TIMEOUT` | Bảng đang bị khóa bởi tiến trình khác sau 15–30 giây | Trả về `BUSY`, yêu cầu thử lại sau ít giây |
| `TARGET_NOT_FOUND` | Không tìm thấy tài khoản mục tiêu khi reset mật khẩu | Báo không tìm thấy tài khoản |
| `CANNOT_DISABLE_LAST_ADMIN` | Thao tác sẽ vô hiệu hóa quản trị viên hoạt động duy nhất | Chặn thao tác để bảo vệ quyền quản trị hệ thống |

---

## 3. Đặc tả Chi tiết các Hành động API (API Operations)

### 3.1. `validateAccountImport`
- **Mục đích:** Thẩm định cấu trúc và logic nghiệp vụ của một tệp JSON nhập tài khoản mà **hoàn toàn không ghi dữ liệu vào Google Sheets (Dry-Run Mode)**.
- **Quyền truy cập:** `teacher`, `admin`.
- **Luồng xử lý (Validation Pipeline):**
  1. Kiểm tra session hợp lệ và cờ `MustChangePassword === false`.
  2. Kiểm tra `schemaVersion === "1.0"`, `importMode === "create_only"`.
  3. Kiểm tra tính liên tiếp của `schoolYear`.
  4. Quét toàn bộ JSON để bảo đảm không chứa bất kỳ trường nào trong danh sách cấm (Mục 5 của Schema Spec).
  5. Kiểm tra phòng vệ chèn công thức Google Sheets (Formula Injection Defense).
  6. Kiểm tra trùng lặp nội bộ trong mảng `accounts` (Intra-batch uniqueness, case-insensitive).
  7. Đối với `teacher`: kiểm tra từng học sinh xem `classId` và `schoolYear` có thuộc `assignedSet_(actor)` hay không. Nếu có học sinh thuộc lớp khác, ghi nhận lỗi phân quyền theo từng dòng.
  8. Kiểm tra sự tồn tại trong bảng `USERS` (`taken[accountId.toUpperCase()]`). Nếu đã có, ghi nhận bản ghi trùng lặp.
  9. Trả về kết quả tổng hợp chi tiết theo từng dòng (Row-level diagnostic).

#### Request Payload
```json
{
  "action": "validateAccountImport",
  "token": "usr_sec_token_string_here",
  "importData": {
    "schemaVersion": "1.0",
    "schoolYear": "2026-2027",
    "importMode": "create_only",
    "accounts": [
      {
        "accountId": "6A1-01",
        "fullName": "Nguyễn Văn An",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "role": "student"
      },
      {
        "accountId": "6A1-02",
        "fullName": "=1+2",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "role": "student"
      }
    ]
  }
}
```

#### Response Payload (Thành công - Có phát hiện lỗi dữ liệu dòng)
```json
{
  "success": true,
  "data": {
    "schemaVersion": "1.0",
    "schoolYear": "2026-2027",
    "totalAccounts": 2,
    "validCount": 1,
    "invalidCount": 1,
    "duplicateCount": 0,
    "readyToImport": false,
    "errors": [
      {
        "index": 1,
        "accountId": "6A1-02",
        "field": "fullName",
        "code": "FORMULA_INJECTION_DETECTED",
        "message": "Họ và tên không được bắt đầu bằng ký tự công thức (=, +, -, @)."
      }
    ]
  },
  "error": null
}
```

---

### 3.2. `createAccount`
- **Mục đích:** Tạo một tài khoản duy nhất (học sinh, giáo viên hoặc quản trị viên).
- **Quyền truy cập:**
  - `teacher`: chỉ được tạo tài khoản với `role = "student"`, trong lớp mình được phân công (`assignedSet_`).
  - `admin`: được tạo tài khoản với mọi vai trò (`student`, `teacher`, `admin`).
- **Quy tắc an toàn & Đồng bộ Dữ liệu:**
  - Thực hiện trong `withLock_` của `LockService.getScriptLock()`.
  - Kiểm tra lại quyền phân công (`assignedSet_`) và sự tồn tại của `Username` ngay bên trong khóa ghi.
  - Sinh mật khẩu tạm bằng `generatePassword_()`.
  - Sinh `StudentUID` độc lập (`"stu_" + UUID`).
  - Nếu `role !== "student"`, sinh thêm `TeacherUID` (`"tch_" + UUID`).
  - Ghi bản ghi vào sheet `USERS` với `MustChangePassword = "TRUE"`.
  - **Đồng bộ ENROLLMENTS bắt buộc đối với `student`:** Nếu `role === "student"`, đồng thời tạo một bản ghi tương ứng trong bảng `ENROLLMENTS` (`V2_HEADERS.ENROLLMENTS`: `EnrollmentID = "enr_" + UUID`, `StudentUID`, `SchoolYear`, `SchoolLevel`, `Grade`, `ClassID`, `Active = "TRUE"`, `StartDate = YYYY-MM-DD`, `EndDate = ""`). Điều này bảo đảm học sinh xuất hiện chính xác trong `buildRosters_()` của Teacher Dashboard.
  - **Mật khẩu tạm chỉ được trả về duy nhất một lần trong đối tượng phản hồi**.

#### Request Payload
```json
{
  "action": "createAccount",
  "token": "usr_sec_token_string_here",
  "schoolYear": "2026-2027",
  "account": {
    "accountId": "6A1-15",
    "fullName": "Lê Bảo Khang",
    "classId": "6A1",
    "grade": 6,
    "schoolLevel": "THCS",
    "role": "student"
  }
}
```

#### Response Payload (Thành công)
```json
{
  "success": true,
  "data": {
    "studentUid": "stu_b5a1c3d4e5f67890123456789abcdef0",
    "enrollmentId": "enr_a1b2c3d4e5f67890123456789abcdef0",
    "enrollmentStatus": "created",
    "username": "6A1-15",
    "studentId": "6A1-15",
    "fullName": "Lê Bảo Khang",
    "classId": "6A1",
    "grade": 6,
    "schoolLevel": "THCS",
    "schoolYear": "2026-2027",
    "role": "student",
    "temporaryPassword": "mK7vQ9xP",
    "mustChangePassword": true
  },
  "error": null
}
```

---

### 3.3. `importAccountsBatch`
- **Mục đích:** Nhập hàng loạt tài khoản từ dữ liệu JSON đã qua thẩm định, bảo đảm tính nhất quán dữ liệu cả hai bảng `USERS` và `ENROLLMENTS`.
- **Quyền truy cập:** `teacher` (trong phạm vi phân công), `admin` (toàn hệ thống).
- **Rà soát Giới hạn Google Sheets & Cơ chế Phục hồi Sự cố (Fault Recovery Semantics):**
  > [!IMPORTANT]
  > **Thực tế kỹ thuật của Google Sheets:** Google Sheets là kho lưu trữ dạng bảng tính trên Google Drive, **KHÔNG hỗ trợ giao dịch ACID đa dòng và KHÔNG hỗ trợ rollback tự động**. Nếu tác vụ ghi bị ngắt quãng giữa chừng (do timeout 6 phút của Google Apps Script, lỗi mạng hoặc đứt kết nối phía client), các dòng đã ghi sẽ tồn tại vĩnh viễn trên Sheet mà không bị thu hồi.
  
  Do đó, thiết kế AUTH-A1 **KHÔNG tuyên bố tính nguyên tử toàn lô (Batch Atomicity) hay rollback**, mà áp dụng nghiêm ngặt các nguyên tắc sau:
  1. **Giới hạn kích thước:** Tối đa **100 tài khoản / 1 lần gọi batch** để đảm bảo thời gian chạy nằm an toàn trong quota (< 20 giây CPU).
  2. **Tiền thẩm định toàn lô trong RAM (Full Pre-validation):** Thẩm định cú pháp, cấp học, lớp học và phân quyền của 100% bản ghi trước khi thực hiện bất kỳ lệnh ghi nào vào Sheet.
  3. **Khóa đồng thời & Thẩm định lại bên trong Lock (Inside `withLock_`):**
     - Bắt buộc bọc trong `withLock_` (`LockService.getScriptLock()`).
     - **Tái kiểm tra phân quyền (Re-check RBAC):** Đọc lại bảng `TEACHER_ASSIGNMENTS` ngay trong lock. Nếu phân công của giáo viên bị thay đổi hoặc thu hồi sau bước pre-validation, lập tức hủy tác vụ với lỗi `ASSIGNMENT_REVOKED` (chống lỗ hổng TOCTOU).
  4. **Phân biệt Nhập lại Hợp lệ vs Xung đột Trùng lặp (True Idempotency vs Collision):**
     - Đọc toàn bộ danh sách `USERS` và `ENROLLMENTS` hiện thời.
     - Với từng tài khoản trong payload:
       + **Trường hợp 1 (Chưa tồn tại):** Tạo mới `StudentUID`, mật khẩu tạm, băm PBKDF2; chuẩn bị dòng ghi cho `USERS` và dòng ghi tương ứng cho `ENROLLMENTS` (đối với học sinh). Gắn nhãn `status: "created"`.
       + **Trường hợp 2 (Đã tồn tại nhưng là Genuine Batch Replay):** Nếu `Username` đã có trong `USERS`, nhưng `batchId`, `batchFingerprint`, họ tên, lớp và năm học trùng khớp hoàn toàn với lô vừa thực hiện:
         * Không sinh lại UID, không cấp lại mật khẩu. Gắn nhãn `status: "replayed"`.
         * **Tự hàn gắn bản ghi mồ côi (Enrollment Self-Healing):** Nếu `USERS` đã có nhưng `ENROLLMENTS` chưa có dòng tương ứng (do sự cố đứt mạng ở bước trước), hệ thống lập tức bổ sung dòng `ENROLLMENTS` bị thiếu và gắn nhãn `status: "replayed_and_healed"`.
       + **Trường hợp 3 (Xung đột với tài khoản khác - Collision):** Nếu `Username` đã tồn tại nhưng thuộc về một batch khác, hoặc thông tin học sinh không khớp:
         * **TUYỆT ĐỐI KHÔNG BỎ QUA NGẦM HOẶC GHI ĐÈ.**
         * Báo lỗi rõ ràng cho bản ghi đó: `code: "COLLISION_EXISTING_ACCOUNT"`, `status: "rejected_collision"`.
  5. **Tối ưu hóa ghi theo dải (Bulk Range Write):**
     - Bước 1: Ghi toàn bộ các dòng `USERS` mới qua `sheetUsers.getRange(nextUserRow, 1, newUsersCount, 18).setValues(newUsersRows)`.
     - Bước 2: Ghi toàn bộ các dòng `ENROLLMENTS` mới/hàn gắn qua `sheetEnrollments.getRange(nextEnrRow, 1, newEnrCount, 11).setValues(newEnrRows)`.
  6. **Phản hồi chi tiết:** Trả về kết quả phân định rõ `createdCount`, `replayedCount`, `healedCount`, `collisionCount`.

#### Request Payload
```json
{
  "action": "importAccountsBatch",
  "token": "usr_sec_token_string_here",
  "batchId": "batch_20261025_6A1_001",
  "batchFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "importData": {
    "schemaVersion": "1.0",
    "schoolYear": "2026-2027",
    "importMode": "create_only",
    "accounts": [
      {
        "accountId": "6A1-01",
        "fullName": "Nguyễn Văn An",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "role": "student"
      },
      {
        "accountId": "6A1-02",
        "fullName": "Trần Thị Bình",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "role": "student"
      }
    ]
  }
}
```

#### Response Payload (Thành công)
```json
{
  "success": true,
  "data": {
    "batchId": "batch_20261025_6A1_001",
    "batchFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "schoolYear": "2026-2027",
    "totalRequested": 2,
    "createdCount": 2,
    "replayedCount": 0,
    "healedCount": 0,
    "collisionCount": 0,
    "results": [
      {
        "accountId": "6A1-01",
        "status": "created",
        "studentUid": "stu_11112222333344445555666677778888",
        "enrollmentId": "enr_33334444555566667777888899990000",
        "enrollmentStatus": "created",
        "username": "6A1-01",
        "fullName": "Nguyễn Văn An",
        "classId": "6A1",
        "role": "student",
        "temporaryPassword": "uX8kM2wP"
      },
      {
        "accountId": "6A1-02",
        "status": "created",
        "studentUid": "stu_99998888777766665555444433332222",
        "enrollmentId": "enr_77778888999900001111222233334444",
        "enrollmentStatus": "created",
        "username": "6A1-02",
        "fullName": "Trần Thị Bình",
        "classId": "6A1",
        "role": "student",
        "temporaryPassword": "qR4yN7zL"
      }
    ]
  },
  "error": null
}
```

---

### 3.4. Tình huống Phản hồi Thất lạc và Cấp lại Mật khẩu An toàn (Lost Response & Re-Issuance Safety)

> [!CAUTION]
> **Tình huống sự cố:** Máy chủ Google Apps Script đã ghi thành công tài khoản vào bảng `USERS` và `ENROLLMENTS`, nhưng do mạng bị ngắt trước khi client nhận phản hồi HTTP chứa mật khẩu tạm, danh sách mật khẩu tạm bị thất lạc.

Theo chính sách **Zero Cleartext Persistence**:
- Máy chủ **tuyệt đối không lưu mật khẩu tạm dạng rõ** ở bất kỳ đâu (không lưu trong Sheet, không cache, không log).
- Máy chủ **KHÔNG THỂ và KHÔNG ĐƯỢC PHÉP trả lại mật khẩu tạm cũ**.

#### Quy tắc An toàn Nghiêm ngặt cho Hành động `reissueBatchPasswords`:
1. **Không cho phép reset tùy ý mọi tài khoản chỉ vì cùng `classId`:**
   - Hành động `reissueBatchPasswords` không được nhận payload dạng quét toàn lớp (như `"classId": "6A1"`), vì sẽ có nguy cơ xóa nhầm mật khẩu của các học sinh đã học ổn định.
2. **Xác minh nguồn gốc lô nạp (Batch Provenance Verification):**
   - Client bắt buộc phải cung cấp `batchId`, `batchFingerprint`, và danh sách `accountIds` khớp với lô nạp gần đây (trong vòng 24 giờ kể từ thời điểm tạo).
   - Nếu không chứng minh được tài khoản thuộc lô vừa tạo: Máy chủ **từ chối ngay lập tức với mã lỗi `BATCH_PROVENANCE_UNVERIFIED`** và yêu cầu giáo viên chuyển sang quy trình đặt lại mật khẩu từng tài khoản có kiểm soát (`resetAccountPassword`).
3. **Bảo vệ tài khoản học sinh đang hoạt động (Active Student Protection):**
   - Đối với từng tài khoản trong danh sách yêu cầu cấp lại:
     + Kiểm tra trường `MustChangePassword`: Nếu `MustChangePassword === "FALSE"`, nghĩa là học sinh **đã đăng nhập và tự đổi sang mật khẩu chính thức**.
     + Kiểm tra lịch sử học tập: Truy vấn các bảng `PROGRESS`, `RESPONSES`, và `LEARNING_SESSIONS`. Nếu học sinh **đã có bất kỳ dữ liệu học tập nào**:
     + **MÁY CHỦ BẮT BUỘC TỪ CHỐI RESET TÀI KHOẢN NÀY** với mã lỗi **`STUDENT_ALREADY_ACTIVE`**. Thao tác reset hàng loạt tuyệt đối không được phép phá vỡ quyền truy cập của học sinh đang học.
4. **Yêu cầu xác nhận rõ ràng (Explicit Confirmation):**
   - Payload bắt buộc phải mang cờ `confirmBatchReset: true` và `reason: "LOST_RESPONSE_RECOVERY"`.
5. **Cấp lại Mật khẩu Mới Hoàn toàn (Fresh Credentials Only):**
   - Máy chủ sinh **MẬT KHẨU TẠM HOÀN TOÀN MỚI** (8 ký tự ngẫu nhiên).
   - Sinh chuỗi muối mới, tính toán băm PBKDF2 mới và cập nhật vào `USERS`.
   - Cập nhật `MustChangePassword = "TRUE"`, `FailedAttempts = 0`, `LockedUntil = ""`.
   - Thu hồi toàn bộ phiên làm việc cũ nếu có (`revokeAll_`).
   - Mật khẩu cũ bị thất lạc lập tức vô hiệu lực vĩnh viễn.

#### Request Payload: `reissueBatchPasswords`
```json
{
  "action": "reissueBatchPasswords",
  "token": "usr_sec_token_string_here",
  "batchId": "batch_20261025_6A1_001",
  "batchFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "confirmBatchReset": true,
  "reason": "LOST_RESPONSE_RECOVERY",
  "accountIds": ["6A1-01", "6A1-02"],
  "schoolYear": "2026-2027"
}
```

#### Response Payload: `reissueBatchPasswords` (Thành công)
```json
{
  "success": true,
  "data": {
    "batchId": "batch_20261025_6A1_001",
    "schoolYear": "2026-2027",
    "reissuedCount": 2,
    "skippedActiveCount": 0,
    "results": [
      {
        "accountId": "6A1-01",
        "studentUid": "stu_11112222333344445555666677778888",
        "username": "6A1-01",
        "fullName": "Nguyễn Văn An",
        "temporaryPassword": "FreshPassword1",
        "status": "reissued"
      },
      {
        "accountId": "6A1-02",
        "studentUid": "stu_99998888777766665555444433332222",
        "username": "6A1-02",
        "fullName": "Trần Thị Bình",
        "temporaryPassword": "FreshPassword2",
        "status": "reissued"
      }
    ]
  },
  "error": null
}
```

---

### 3.5. `resetAccountPassword`
- **Mục đích:** Đặt lại mật khẩu tạm thời cho một tài khoản người dùng, đồng thời **thu hồi lập tức toàn bộ các phiên làm việc đang mở (session revocation)**.
- **Quy tắc phân quyền:**
  - `teacher`: Chỉ được reset tài khoản học sinh (`role = "student"`) thuộc lớp mình được phân công (`assignedSet_`). Tuyệt đối không được reset tài khoản giáo viên khác hoặc tài khoản admin.
  - `admin`: Được reset tài khoản học sinh, giáo viên và tài khoản admin khác (tuân thủ quy tắc chống tự khóa tài khoản).
  - Không cho phép người dùng tự reset mật khẩu của chính mình qua API này (phải dùng quy trình `changePassword`).
- **Luồng xử lý:**
  1. Kiểm tra session và vai trò người gọi.
  2. Tìm kiếm người dùng mục tiêu theo `studentUid`. Nếu không thấy, ném lỗi `NOT_FOUND`.
  3. Kiểm tra thẩm quyền quản lý thông qua hàm `assertCanManage_(actor, target)`.
  4. Thực thi trong `withLock_`:
     - Sinh mật khẩu tạm mới `temp = generatePassword_()`.
     - Sinh salt mới và tính toán `PasswordHash = hashPassword_(temp, salt)`.
     - Cập nhật bản ghi `USERS`: `MustChangePassword = "TRUE"`, `FailedAttempts = 0`, `LockedUntil = ""`.
     - Gọi hàm `revokeAll_(target.StudentUID)` để đánh dấu `Revoked = "TRUE"` cho toàn bộ các session của người này trong bảng `SESSIONS`.
  5. Trả về mật khẩu tạm duy nhất một lần.

#### Request Payload
```json
{
  "action": "resetAccountPassword",
  "token": "usr_sec_token_string_here",
  "studentUid": "stu_11112222333344445555666677778888"
}
```

#### Response Payload (Thành công)
```json
{
  "success": true,
  "data": {
    "studentUid": "stu_11112222333344445555666677778888",
    "username": "6A1-01",
    "fullName": "Nguyễn Văn An",
    "temporaryPassword": "vT5pA9kM",
    "sessionsRevoked": true
  },
  "error": null
}
```

---

### 3.6. `listManagedAccounts`
- **Mục đích:** Lấy danh sách tài khoản thuộc phạm vi quản lý của giáo viên hoặc quản trị viên để hiển thị bảng điều khiển.
- **Quy tắc bảo mật:**
  - **Tuyệt đối không bao giờ trả về:** `PasswordHash`, `PasswordSalt`, `temporaryPassword`, `SessionTokenHash`.
  - Bộ lọc phạm vi:
    - `teacher`: Chỉ trả về học sinh (`role = "student"`) thuộc các lớp đang được phân công (`isAssigned_`).
    - `admin`: Có thể lọc theo `classId`, `schoolYear` hoặc xem toàn bộ danh mục tài khoản (bao gồm cả tài khoản giáo viên).
- **Tham số truy vấn (tùy chọn):**
  - `classId`: Lọc theo mã lớp cụ thể.
  - `schoolYear`: Lọc theo năm học.

#### Request Payload
```json
{
  "action": "listManagedAccounts",
  "token": "usr_sec_token_string_here",
  "classId": "6A1",
  "schoolYear": "2026-2027"
}
```

#### Response Payload (Thành công)
```json
{
  "success": true,
  "data": {
    "totalCount": 2,
    "accounts": [
      {
        "studentUid": "stu_11112222333344445555666677778888",
        "studentId": "6A1-01",
        "username": "6A1-01",
        "fullName": "Nguyễn Văn An",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "schoolYear": "2026-2027",
        "role": "student",
        "active": true,
        "mustChangePassword": true,
        "lockedUntil": ""
      },
      {
        "studentUid": "stu_99998888777766665555444433332222",
        "studentId": "6A1-02",
        "username": "6A1-02",
        "fullName": "Trần Thị Bình",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "schoolYear": "2026-2027",
        "role": "student",
        "active": true,
        "mustChangePassword": false,
        "lockedUntil": ""
      }
    ]
  },
  "error": null
}
```

---

### 3.7. Cơ chế Nhật ký Kiểm toán Quản trị Độc lập: `AUTH_AUDIT` (PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL)

- **Ranh giới Phân định Dữ liệu:**
  + Bảng `EVENT_LOG` hiện hành (`backend/StudentV2.gs`, `backend/Teacher.gs`) là hạ tầng dữ liệu dành riêng cho việc ghi nhận hành vi học tập của học sinh (`LessonID`, `ActivityID`, `EventType`, `timeline_`).
  + **Tuyệt đối KHÔNG đưa các sự kiện quản trị tài khoản vào bảng `EVENT_LOG` hiện tại.**
- **Đề xuất cơ chế Audit riêng biệt:**
  + Thiết lập một bảng tính độc lập mang tên `AUTH_AUDIT` để ghi nhận toàn bộ vết kiểm toán an ninh quản trị tài khoản.
- **Cấu trúc trường dữ liệu đề xuất (`AUTH_AUDIT_HEADERS`):**
  `["AuditID", "Timestamp", "OperatorUID", "OperatorRole", "Action", "TargetUID", "TargetUsername", "TargetRole", "ClassID", "SchoolYear", "Status", "ErrorCode", "DetailsJSON", "ClientIP_MD5"]`
  + `AuditID`: Chuỗi định danh duy nhất (`"aud_" + uuid_()`).
  + `Timestamp`: Dấu thời gian chuẩn ISO 8601 UTC.
  + `OperatorUID`: `TeacherUID` hoặc `StudentUID` của giáo viên/quản trị viên thực hiện thao tác.
  + `OperatorRole`: Vai trò của người thực hiện (`"teacher"` hoặc `"admin"`).
  + `Action`: Mã định danh hành động (`"VALIDATE_IMPORT"`, `"CREATE_ACCOUNT"`, `"IMPORT_BATCH"`, `"REISSUE_BATCH_PASSWORDS"`, `"RESET_PASSWORD"`, `"LOCK_USER"`, `"UNLOCK_USER"`).
  + `TargetUID`: `StudentUID` của người dùng mục tiêu (hoặc `batchId` nếu là thao tác lô).
  + `TargetUsername`: `Username` của người dùng mục tiêu.
  + `TargetRole`: Vai trò của đối tượng mục tiêu (`"student"`, `"teacher"`, `"admin"`).
  + `ClassID`: Mã lớp học liên quan (nếu có).
  + `SchoolYear`: Năm học áp dụng (ví dụ `"2026-2027"`).
  + `Status`: Kết quả thực thi (`"SUCCESS"`, `"FAILED"`, `"REJECTED"`).
  + `ErrorCode`: Mã lỗi kỹ thuật nếu thao tác thất bại (ví dụ `"FORBIDDEN"`, `"STUDENT_ALREADY_ACTIVE"`, `""` nếu thành công).
  + `DetailsJSON`: Chuỗi JSON đã được làm sạch, chỉ chứa metadata thống kê không nhạy cảm (ví dụ `{"batchId":"bat_01","requested":25,"created":25,"healed":0}`).
  + `ClientIP_MD5`: Mã băm MD5 ẩn danh của địa chỉ IP client hoặc chuỗi rỗng.
- **Ràng buộc Bảo mật Bất biến:**
  + **TUYỆT ĐỐI KHÔNG LƯU TRỮ MẬT KHẨU RÕ, MẬT KHẨU TẠM, PASSWORD HASH, PASSWORD SALT, SESSION TOKEN HOẶC TOKEN HASH** vào bảng `AUTH_AUDIT` hay bất kỳ nhật ký nào.
- **Trạng thái Đề xuất:**
  + Việc tạo bảng mới `AUTH_AUDIT` được đánh dấu là **`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`**, bắt buộc phải có sự phê duyệt độc lập từ Project Controller trước khi áp dụng vào Apps Script live.

---

## 4. Tương thích Ngược và Chiến lược Tích hợp (Integration Strategy)

1. **Khả năng tương thích hoàn toàn với API hiện tại:**
   - Hành động `teacherListUsers`, `teacherResetPassword`, `teacherLockUser` hiện tại trong `Code.gs:186-224` tiếp tục hoạt động độc lập mà không bị sửa đổi.
   - Các hành động mới (`validateAccountImport`, `createAccount`, `importAccountsBatch`, `reissueBatchPasswords`, `resetAccountPassword`, `listManagedAccounts`) đóng vai trò là lớp API chuẩn hóa v1.0, tái sử dụng các hàm nền tảng (`withLock_`, `generatePassword_`, `hashPassword_`, `revokeAll_`, `assertCanManage_`, `assignedSet_`).
2. **Xử lý bảng `NEW_ACCOUNTS`:**
   - Trong luồng nhập mới qua JSON API, mật khẩu tạm thời được trả về qua giao thức HTTPS có mã hóa đường truyền trực tiếp cho phiên làm việc của người quản trị đã xác thực.
   - Hệ thống **không tự động ghi mật khẩu thô vào bảng `NEW_ACCOUNTS`** nhằm loại trừ rủi ro lưu trữ thông tin nhạy cảm dạng cleartext trên Google Drive. Tuy nhiên, hàm `clearNewAccounts()` và cấu trúc bảng `NEW_ACCOUNTS` cũ vẫn được giữ nguyên vẹn để phục vụ giáo viên nếu còn dùng quy trình nhập thủ công từ Sheet `IMPORT`.
