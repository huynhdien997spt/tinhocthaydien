# ACCOUNT MANAGEMENT TEST PLAN & ACCEPTANCE VECTORS
## Comprehensive Test Strategy, Acceptance Test Suite, and Non-Production Test Vectors for AUTH-A1

- **Document Version:** `1.0`
- **Status:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED (Pre-Implementation Review)`
- **Scope:** Account Management Backend (Task ID: `AUTH-A1`)
- **Repository:** `huynhdien997spt/tinhocthaydien`
- **Working Branch:** `account-management-json-review`
- **Baseline Commit:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`

---

## 1. Chiến lược Kiểm thử (Testing Strategy)

### 1.1. Ranh giới và Nguyên tắc Thực thi
1. **Phạm vi phi sản xuất (Non-Production Isolation):**
   - 100% dữ liệu kiểm thử phải là dữ liệu giả lập (synthetic data).
   - Tuyệt đối không sử dụng họ tên, mã định danh, hoặc thông tin cá nhân của học sinh và giáo viên thật.
   - Toàn bộ các ca kiểm thử trong giai đoạn thiết kế AUTH-A1 được đặc tả dưới dạng **Test Vectors và Expected Results**.
   - > [!IMPORTANT]
     > Trong giai đoạn Design Review của AUTH-A1, toàn bộ các kịch bản kiểm thử dưới đây đều ở trạng thái **DESIGN_PROPOSAL / NOT_YET_VERIFIED**. Tuyệt đối không tuyên bố trạng thái `PASS` hay khẳng định hoàn tất khi các bài test chưa được chạy trực tiếp trên môi trường Google Apps Script.
2. **Không sửa đổi Data Contract hiện có:**
   - Bảo toàn 38/38 yêu cầu cần đạt (YCCĐ) và toàn bộ các bộ test Phase 1, Phase 2, Phase 3, Phase 4.
   - Kiểm tra tính tương thích hồi quy (regression compatibility) đối với các tài khoản và cấu trúc dữ liệu cũ.
3. **Phân nhóm Kiểm thử:**
   - Nhóm 1: Thẩm định Cấu trúc & Cú pháp JSON Schema (Test Vectors 01–10).
   - Nhóm 2: Phân quyền vai trò và Phạm vi quản lý RBAC (Test Vectors 11–15).
   - Nhóm 3: Vòng đời Mật khẩu Tạm & Quản lý Phiên (Test Vectors 16–19, 26).
   - Nhóm 4: Nhập hàng loạt, Tính Idempotency & Concurrency (Test Vectors 20–22).
   - Nhóm 5: Tương thích ngược, Bảo mật & Thuật toán PBKDF2 (Test Vectors 23–25, 27).
   - Nhóm 6: Tính Nhất quán Danh sách, Kiểm toán Tách biệt & Phòng vệ Nâng cao (Test Vectors 28–35).
   - Nhóm 7: Bằng chứng Nguồn gốc Lô & Kiểm thử Phục hồi Nâng cao (Test Vectors 36–44).

---

## 2. Danh mục 44 Bộ Test Vectors Chi tiết (Acceptance Test Suite)

### Nhóm 1: Thẩm định Cấu trúc & Cú pháp JSON Schema

#### Test Vector 01: Nhập tệp JSON hợp lệ (Valid Student & Teacher Import)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận hệ thống chấp nhận tệp JSON hợp lệ chứa cả học sinh và giáo viên.
- **Dữ liệu đầu vào:**
  ```json
  {
    "schemaVersion": "1.0",
    "schoolYear": "2026-2027",
    "importMode": "create_only",
    "accounts": [
      {
        "accountId": "TEST-6A1-01",
        "fullName": "Nguyễn Giả Lập A",
        "classId": "6A1",
        "grade": 6,
        "schoolLevel": "THCS",
        "role": "student"
      },
      {
        "accountId": "TEST-GV-01",
        "fullName": "Trần Giáo Viên Mẫu",
        "classId": "",
        "grade": null,
        "schoolLevel": "",
        "role": "teacher"
      }
    ]
  }
  ```
- **Điều kiện tiên quyết:** Người gọi là `admin`.
- **Hành vi kỳ vọng:**
  - `validateAccountImport`: `success = true`, `validCount = 2`, `invalidCount = 0`, `readyToImport = true`.
  - `importAccountsBatch`: `success = true`, tạo 2 tài khoản mới, sinh `StudentUID` và mật khẩu tạm tương ứng.

#### Test Vector 02: JSON sai cú pháp (Malformed JSON Syntax)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận parser bắt lỗi cú pháp an toàn, không làm sập tiến trình.
- **Dữ liệu đầu vào:** Chuỗi ký tự JSON bị thiếu dấu đóng ngoặc nhọn: `{"schemaVersion": "1.0", "accounts": [`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "BAD_REQUEST"`.
  - Không có bất kỳ dữ liệu nào được ghi vào Google Sheets.

#### Test Vector 03: Thiếu trường bắt buộc (Missing Mandatory Fields)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận hệ thống từ chối bản ghi thiếu `accountId`, `fullName` hoặc `role`.
- **Dữ liệu đầu vào:**
  ```json
  {
    "schemaVersion": "1.0",
    "schoolYear": "2026-2027",
    "importMode": "create_only",
    "accounts": [
      {
        "accountId": "TEST-6A1-02",
        "role": "student"
      }
    ]
  }
  ```
- **Hành vi kỳ vọng:**
  - `success = true` (ở chế độ validate), `validCount = 0`, `invalidCount = 1`, `readyToImport = false`.
  - `errors[0].field = "fullName"`, `errors[0].code = "MISSING_REQUIRED_FIELD"`.

#### Test Vector 04: Sai phiên bản Schema (Unsupported Schema Version)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận hệ thống từ chối các phiên bản schema không hỗ trợ.
- **Dữ liệu đầu vào:** Cung cấp `schemaVersion = "2.0"` hoặc `schemaVersion = "0.9"`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "UNSUPPORTED_SCHEMA_VERSION"`.

#### Test Vector 05: Trùng `accountId` trong cùng một tệp JSON (Intra-batch Duplicate)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc một file chứa 2 dòng cùng có `accountId = "TEST-6A1-05"`.
- **Dữ liệu đầu vào:** Mảng `accounts` chứa 2 phần tử có cùng `accountId = "TEST-6A1-05"` (hoặc `"test-6a1-05"`).
- **Hành vi kỳ vọng:**
  - `readyToImport = false`, `duplicateCount = 1`.
  - Báo lỗi `DUPLICATE_IN_BATCH` tại dòng xuất hiện lần thứ hai.

#### Test Vector 06: Trùng tài khoản đang tồn tại trong hệ thống (Database Collision)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Không ghi đè hoặc tạo lại tài khoản đã có trong bảng `USERS`.
- **Điều kiện tiên quyết:** Bảng `USERS` đã có tài khoản với `Username = "6A1-01"`.
- **Dữ liệu đầu vào:** Tệp JSON chứa bản ghi có `accountId = "6A1-01"`.
- **Hành vi kỳ vọng:**
  - `validateAccountImport`: Báo trạng thái `ACCOUNT_ALREADY_EXISTS` cho dòng đó.
  - Bản ghi cũ của `6A1-01` trong bảng `USERS` giữ nguyên vẹn 100% (không đổi UID, không đổi mật khẩu, không đổi hash).

#### Test Vector 07: Client cố tình chèn `StudentUID` (Forbidden Field Injected)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn client tự gán `StudentUID`.
- **Dữ liệu đầu vào:** Bản ghi chứa thuộc tính `StudentUID: "stu_malicious_injected_uid"`.
- **Hành vi kỳ vọng:**
  - Toàn bộ gói tin bị từ chối.
  - Phản hồi: `success = false`, `error.code = "FORBIDDEN_FIELD_INJECTED"`.

#### Test Vector 08: Client cố tình chèn `TemporaryPassword` hoặc `PasswordHash`
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn client tự đặt mật khẩu hoặc can thiệp băm bảo mật.
- **Dữ liệu đầu vào:** Bản ghi chứa thuộc tính `TemporaryPassword: "MyPassword123"`.
- **Hành vi kỳ vọng:**
  - Bị từ chối ngay ở bước Schema Validation.
  - Phản hồi: `error.code = "FORBIDDEN_FIELD_INJECTED"`.

#### Test Vector 09: Sai khối lớp hoặc cấp học (Grade vs SchoolLevel Mismatch)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra ma trận tương thích giữa `grade` và `schoolLevel`.
- **Dữ liệu đầu vào:** Bản ghi khai báo `grade = 6` nhưng `schoolLevel = "TIEUHOC"`, hoặc `grade = 10` nhưng `schoolLevel = "THCS"`.
- **Hành vi kỳ vọng:**
  - Báo lỗi thẩm định: `error.code = "GRADE_LEVEL_MISMATCH"`.

#### Test Vector 10: Sai định dạng năm học (Malformed School Year)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra tính hợp lệ và liên tiếp của năm học.
- **Dữ liệu đầu vào:** `schoolYear = "2026-2028"` (hai năm không liên tiếp) hoặc `schoolYear = "2026"` (thiếu năm kết thúc).
- **Hành vi kỳ vọng:**
  - Phản hồi: `error.code = "INVALID_SCHOOL_YEAR"`.

---

### Nhóm 2: Phân quyền Vai trò & Phạm vi Quản lý (RBAC)

#### Test Vector 11: Giáo viên tạo học sinh đúng lớp được phân công
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận giáo viên quản lý thành công lớp mình dạy.
- **Điều kiện tiên quyết:** Giáo viên `GV-01` có phân công `ClassID = "6A1"`, `SchoolYear = "2026-2027"` trong bảng `TEACHER_ASSIGNMENTS`.
- **Dữ liệu đầu vào:** Tạo học sinh lớp `6A1`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = true`, tài khoản học sinh được khởi tạo thành công.

#### Test Vector 12: Giáo viên tạo học sinh ngoài lớp được phân công
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn giáo viên can thiệp vào lớp của đồng nghiệp khác.
- **Điều kiện tiên quyết:** Giáo viên `GV-01` chỉ được phân công lớp `6A1`.
- **Dữ liệu đầu vào:** Giáo viên gửi yêu cầu tạo học sinh thuộc lớp `9A2`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "UNAUTHORIZED"`.

#### Test Vector 13: Giáo viên cố tình tạo tài khoản `teacher` hoặc `admin`
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn tấn công leo thang đặc quyền (Privilege Escalation).
- **Điều kiện tiên quyết:** Người gọi có vai trò `teacher`.
- **Dữ liệu đầu vào:** Yêu cầu tạo tài khoản có trường `role = "admin"` hoặc `role = "teacher"`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "FORBIDDEN"`.

#### Test Vector 14: Học sinh gọi API quản trị tài khoản
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn học sinh sử dụng token học tập để gọi các chức năng quản trị.
- **Điều kiện tiên quyết:** Người gọi là học sinh (`role = "student"`).
- **Dữ liệu đầu vào:** Gọi `validateAccountImport` hoặc `resetAccountPassword`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "FORBIDDEN"`.

#### Test Vector 15: Admin thực hiện thao tác hợp lệ toàn hệ thống
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận Admin có quyền quản trị toàn diện.
- **Điều kiện tiên quyết:** Người gọi là `admin`.
- **Dữ liệu đầu vào:** Tạo tài khoản giáo viên mới và học sinh ở bất kỳ lớp nào.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = true`, tài khoản được tạo đúng vai trò.

---

### Nhóm 3: Vòng đời Mật khẩu Tạm & Quản lý Phiên

#### Test Vector 16: Reset mật khẩu một tài khoản học sinh hợp lệ
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận chức năng cấp lại mật khẩu cho học sinh trong lớp phân công.
- **Điều kiện tiên quyết:** Giáo viên phụ trách lớp `6A1`, học sinh thuộc lớp `6A1`.
- **Hành động:** Gọi `resetAccountPassword` với `studentUid` của học sinh.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = true`, trả về chuỗi `temporaryPassword` mới (8 ký tự).
  - Bản ghi trong bảng `USERS`: `MustChangePassword = "TRUE"`, `FailedAttempts = 0`.
  - Mật khẩu cũ không còn đăng nhập được.

#### Test Vector 17: Reset mật khẩu học sinh ngoài phạm vi phân công
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn giáo viên reset mật khẩu học sinh lớp khác.
- **Điều kiện tiên quyết:** Giáo viên `GV-01` (dạy `6A1`) gọi reset mật khẩu cho học sinh lớp `9A2`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = false`, `error.code = "UNAUTHORIZED"`.

#### Test Vector 18: Mật khẩu tạm chỉ được trả về duy nhất một lần
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Bảo vệ bí mật thông tin xác thực.
- **Hành động:**
  1. Gọi `resetAccountPassword` -> Nhận được `temporaryPassword`.
  2. Ngay sau đó gọi `listManagedAccounts` hoặc bất kỳ API truy vấn nào khác.
- **Hành vi kỳ vọng:**
  - Danh sách trả về từ `listManagedAccounts` hoàn toàn không có trường `temporaryPassword`, `PasswordHash`, hoặc `PasswordSalt`.

#### Test Vector 19: Thu hồi toàn bộ phiên làm việc cũ sau khi reset mật khẩu
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn kẻ chiếm đoạt phiên cũ tiếp tục duy trì hoạt động sau khi tài khoản đã được reset.
- **Điều kiện tiên quyết:** Học sinh đang có 2 phiên đăng nhập hoạt động trên 2 thiết bị trong sheet `SESSIONS`.
- **Hành động:** Giáo viên thực hiện `resetAccountPassword` cho học sinh đó.
- **Hành vi kỳ vọng:**
  - Toàn bộ các dòng tương ứng của học sinh trong sheet `SESSIONS` được cập nhật `Revoked = "TRUE"`.
  - Hai thiết bị cũ gửi bất kỳ yêu cầu nào đều bị từ chối với mã lỗi `INVALID_SESSION`.

#### Test Vector 26: Xử lý phản hồi thất lạc & Cấp lại mật khẩu mới an toàn (Lost Response Recovery)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra quy trình phục hồi khi máy chủ đã tạo tài khoản thành công nhưng mạng bị ngắt trước khi client nhận được phản hồi chứa mật khẩu tạm.
- **Kịch bản:**
  1. Máy chủ ghi nhận 2 tài khoản `6A1-01` và `6A1-02` vào bảng `USERS` với mật khẩu tạm ban đầu $P_1, P_2$. Phản hồi mạng bị rớt.
  2. Client gửi lại yêu cầu `importAccountsBatch` hoặc truy vấn -> Nhận `status: "skipped_existing"` kèm `temporaryPassword: null` và `passwordReissueAvailable: true`. Máy chủ tuyệt đối không trả lại $P_1, P_2$ cũ vì không lưu trữ bản rõ.
  3. Giáo viên gọi `reissueBatchPasswords` cho danh sách tài khoản này.
- **Hành vi kỳ vọng:**
  - Máy chủ sinh mật khẩu tạm hoàn toàn mới $P_1', P_2'$ ($P' \neq P$), sinh muối mới và băm PBKDF2 mới.
  - Bảng `USERS` được cập nhật hash mới, `MustChangePassword = "TRUE"`.
  - Phản hồi trả về $P_1', P_2'$. Mật khẩu cũ $P_1, P_2$ vĩnh viễn không thể đăng nhập được nữa.

---

### Nhóm 4: Nhập Hàng loạt, Tính Idempotency & Concurrency

#### Test Vector 20: Nhập lặp lại cùng một lô JSON (Per-Record Idempotency Verification)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc bấm nút "Nhập" 2 lần tạo ra bản ghi rác hoặc trùng lặp.
- **Hành động:**
  1. Gửi `importAccountsBatch` với lô 5 tài khoản -> Tạo thành công 5 tài khoản (`createdCount = 5`).
  2. Gửi lại chính xác payload trên lần thứ hai.
- **Hành vi kỳ vọng:**
  - Lần 2: `success = true`, `createdCount = 0`, `skippedCount = 5`.
  - Trạng thái từng dòng: `status = "skipped_existing"`.
  - Số dòng trong sheet `USERS` không tăng thêm; không sinh thêm `StudentUID` mới.

#### Test Vector 21: Hai thao tác nhập thực hiện đồng thời (ScriptLock Contention)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra khả năng đồng bộ hóa của `withLock_`.
- **Hành động:** Kích hoạt đồng thời 2 tiến trình nhập tài khoản từ 2 phiên giáo viên khác nhau.
- **Hành vi kỳ vọng:**
  - Tiến trình thứ hai chờ trong giới hạn thời gian khóa (tối đa 15 giây).
  - Cả hai tiến trình lần lượt hoàn thành mà không làm xáo trộn số thứ tự dòng hoặc làm hỏng dữ liệu trong Google Sheets.

#### Test Vector 22: Phục hồi khi tác vụ nhập bị gián đoạn giữa chừng (Interrupted Batch Recovery)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo hệ thống không bị lỗi dữ liệu mồ côi nếu kết nối bị đứt giữa chừng.
- **Kịch bản mô phỏng:** Lô gồm 20 tài khoản; 10 tài khoản đầu đã được ghi nhận vào `USERS` trước khi xảy ra sự cố ngắt kết nối.
- **Hành động:** Người dùng kích hoạt lại tác vụ nhập cho toàn bộ tệp 20 tài khoản.
- **Hành vi kỳ vọng:**
  - 10 tài khoản đầu được nhận diện là đã có (`skipped_existing`).
  - 10 tài khoản sau tiếp tục được tạo mới bình thường (`created`).
  - Kết quả cuối cùng đạt đủ 20 tài khoản hợp lệ, không có tài khoản nào bị nhân đôi.

---

### Nhóm 5: Tương thích Ngược, Bảo mật & Thuật toán PBKDF2

#### Test Vector 23: Tài khoản cũ vẫn đăng nhập bình thường (Zero Regression)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo hệ thống tài khoản mới không phá vỡ logic đăng nhập của người dùng hiện tại.
- **Điều kiện tiên quyết:** Tài khoản mẫu `6A1-01` được tạo từ các phase trước.
- **Hành động:** Học sinh `6A1-01` gọi `login_` với mật khẩu đã cấp (`StudentA#2026`).
- **Hành vi kỳ vọng:**
  - Đăng nhập thành công, nhận sessionToken và profile đầy đủ.

#### Test Vector 24: Dữ liệu học tập tiếp tục liên kết đúng `StudentUID`
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo khóa chính bất biến hoạt động chính xác.
- **Điều kiện tiên quyết:** Học sinh `6A1-01` đã có tiến độ bài học ở `G6-L03` (50% hoặc 100%) liên kết với `StudentUID = "stu_..."`.
- **Hành vi kỳ vọng:**
  - Gọi `getLessonProgress` cho bài `G6-L03` -> Toàn bộ tiến độ, câu trả lời và sản phẩm học tập được khôi phục chính xác 100%.

#### Test Vector 25: Xác minh không rò rỉ dữ liệu nhạy cảm qua API (Zero Secret Leakage)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Quét kiểm tra toàn bộ dữ liệu trả về từ tất cả các endpoint quản trị tài khoản.
- **Hành vi kỳ vọng:**
  - Không có bất kỳ trường nào chứa: chuỗi băm `PasswordHash`, chuỗi muối `PasswordSalt`, token phiên `SessionTokenHash`, hoặc khóa bí mật `TOKEN_PEPPER`.

#### Test Vector 27: Rà soát Baseline Thuật toán PBKDF2 (Legacy Baseline & Security Risk Status)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận thuật toán băm mật khẩu tuân thủ đúng baseline kế thừa từ mã nguồn ban đầu của hệ thống, đồng thời ghi nhận trạng thái chờ phê duyệt rủi ro bảo mật.
- **Kiểm tra kỹ thuật:**
  - Kiểm tra `AUTH_CONFIG.pbkdf2Iterations`: Bắt buộc là `1000` (xác định rõ đây là **`LEGACY BASELINE`**, không phải tiêu chuẩn an ninh mới).
  - Kiểm tra cấu trúc hash: Bắt buộc định dạng `"pbkdf2-sha256$1000$" + base64(digest)`.
  - Benchmark thời gian thực thi: Cần đo lường benchmark thực tế trên môi trường live Google Apps Script (loại bỏ khẳng định 50–150ms khi chưa có số liệu đo đạc chính thức).
  - Không tự ý tăng vòng lặp lên mức 600.000 để tránh làm sập quota 6 phút của Apps Script.
  - Ghi nhận trạng thái quyết định an ninh: **`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`**.

---

### Nhóm 6: Tính Nhất quán Danh sách, Kiểm toán Tách biệt & Phòng vệ Nâng cao (Test Vectors 28–35)

#### Test Vector 28: Phát hiện Người dùng Mồ côi & Tự Hàn gắn Danh sách (Orphan User & Enrollment Self-Healing)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Phát hiện tài khoản học sinh có trong `USERS` nhưng thiếu bản ghi trong `ENROLLMENTS` (`PARTIAL_WRITE_ORPHAN`), tự động hàn gắn để hiển thị đúng trên danh sách lớp của giáo viên.
- **Điều kiện tiên quyết:** Mô phỏng sự cố ghi gián đoạn, tài khoản học sinh `TEST-6A1-99` tồn tại trong `USERS` (`Role = "student"`, `ClassID = "6A1"`, `SchoolYear = "2026-2027"`) nhưng không có bản ghi tương ứng trong `ENROLLMENTS`.
- **Kiểm tra tiền đề:** Khi gọi `buildRosters_()` trong `Teacher.gs`, học sinh `TEST-6A1-99` **không xuất hiện** trên danh sách lớp của giáo viên do bảng `ENROLLMENTS` có dữ liệu nhưng thiếu UID này.
- **Hành động:** Người dùng kích hoạt lại tác vụ nạp lô (Replay) hoặc gọi chức năng đối chiếu đồng bộ danh sách.
- **Hành vi kỳ vọng:**
  - Hệ thống phát hiện tài khoản `student` thiếu bản ghi lớp học.
  - Tự động tạo bản ghi mới vào sheet `ENROLLMENTS`: `EnrollmentID = "enr_" + UUID`, `StudentUID = u.StudentUID`, `SchoolYear = "2026-2027"`, `SchoolLevel = "THCS"`, `Grade = 6`, `ClassID = "6A1"`, `Active = "TRUE"`.
  - Gọi lại `buildRosters_()`: Học sinh `TEST-6A1-99` lập tức hiển thị chính xác trong danh sách lớp 6A1 mà không cần cấp lại UID hay đổi mật khẩu.

#### Test Vector 29: Nhập lại cùng Lô Hợp lệ (Genuine Batch Replay Verification)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận hệ thống nhận diện chính xác việc nạp lại một lô dữ liệu hợp lệ mà không tạo trùng dữ liệu hay báo lỗi xung đột giả.
- **Dữ liệu đầu vào:** Lô gồm 5 tài khoản học sinh mang `batchId = "bat_test_01"` và `batchFingerprint = "fp_test_hash_01"`.
- **Hành động:**
  1. Gửi `importAccountsBatch` lần 1 -> Tạo thành công 5 tài khoản (`createdCount = 5`).
  2. Gửi lại chính xác yêu cầu `importAccountsBatch` với cùng `batchId` và `batchFingerprint`.
- **Hành vi kỳ vọng:**
  - Phản hồi: `success = true`, `createdCount = 0`, `replayedCount = 5`, `collisionCount = 0`.
  - Trạng thái từng dòng: `status: "replayed"`.
  - Sheet `USERS` và `ENROLLMENTS` không tăng số lượng dòng; không sinh UID mới; toàn bộ mật khẩu và hash cũ được giữ nguyên vẹn 100%.

#### Test Vector 30: Xung đột Tài khoản đã Tồn tại (Existing-Account Collision Rejection)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc một tệp mới nhận nhầm tài khoản cũ là tài khoản vừa tạo hoặc ghi đè danh tính học sinh khác.
- **Điều kiện tiên quyết:** Tài khoản `6A1-01` đã tồn tại trong `USERS` từ trước phiên làm việc hiện tại hoặc thuộc về một học sinh khác.
- **Hành động:** Giáo viên gửi yêu cầu nạp một lô mới mang `batchId = "bat_new_99"` chứa `accountId: "6A1-01"`.
- **Hành vi kỳ vọng:**
  - Hệ thống đối chiếu và xác định đây không phải là Genuine Batch Replay của cùng một lô.
  - **TUYỆT ĐỐI KHÔNG gán nhãn `skipped_existing` rồi báo thành công ngầm.**
  - Báo lỗi rõ ràng cho bản ghi đó: `status: "rejected_collision"`, `code: "COLLISION_EXISTING_ACCOUNT"`.
  - Tài khoản cũ được giữ nguyên vẹn 100%, không bị sửa đổi, không bị cấp lại mật khẩu.

#### Test Vector 31: Hai Giáo viên Nhập Đồng thời với ScriptLock (Lock Contention)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra cơ chế khóa phân tán `withLock_` tuần tự hóa an toàn các thao tác ghi đồng thời.
- **Hành động:** Kích hoạt đồng thời 2 yêu cầu `importAccountsBatch` từ 2 phiên giáo viên khác nhau (Giáo viên 1 nhập lớp `6A1`, Giáo viên 2 nhập lớp `6A2`).
- **Hành vi kỳ vọng:**
  - Giáo viên 1 chiếm được khóa `LockService.getScriptLock()`, ghi tuần tự vào `USERS` và `ENROLLMENTS`.
  - Giáo viên 2 chờ trong hàng đợi khóa (`waitLock(15000)`). Khi Giáo viên 1 hoàn tất và giải phóng khóa, Giáo viên 2 đọc lại vị trí dòng mới nhất và thực hiện ghi an toàn.
  - Cả hai lớp đều được nhập đủ số lượng tài khoản, không có dòng nào bị ghi đè chéo (No Race Condition).

#### Test Vector 32: Thu hồi Phân công Lớp giữa Bước Thẩm định và Bước Ghi (TOCTOU Assignment Revocation Race)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm tra cơ chế phòng vệ lỗ hổng Time-of-Check to Time-of-Use trong phân quyền giáo viên.
- **Hành động:**
  1. Giáo viên gọi `validateAccountImport` cho lớp `6A1` -> Kết quả thẩm định RAM báo `validCount = 10`, `readyToImport = true`.
  2. Ngay trước khi gửi lệnh ghi, Quản trị viên thu hồi phân công lớp `6A1` của giáo viên đó trong bảng `TEACHER_ASSIGNMENTS` (`Active = "FALSE"`).
  3. Giáo viên gửi yêu cầu `importAccountsBatch` cho lớp `6A1`.
- **Hành vi kỳ vọng:**
  - Bên trong khối `withLock_`, máy chủ đọc lại danh sách phân công `assignedSet_` của giáo viên.
  - Phát hiện giáo viên không còn quyền đối với lớp `6A1`.
  - Lập tức hủy bỏ tác vụ ghi với mã lỗi `code: "ASSIGNMENT_REVOKED"`.
  - Không có bất kỳ tài khoản nào được ghi vào `USERS` hay `ENROLLMENTS`.

#### Test Vector 33: Bảo vệ Học sinh Đang Hoạt động khi Reset Hàng loạt (Active Student Protection in Batch Reset)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc thao tác `reissueBatchPasswords` xóa nhầm mật khẩu của học sinh đã đăng nhập và đang học tập.
- **Điều kiện tiên quyết:** Học sinh `6A1-05` đã đổi mật khẩu (`MustChangePassword = "FALSE"`), và đã có 2 bản ghi bài làm trong bảng `RESPONSES`.
- **Hành động:** Giáo viên gửi yêu cầu `reissueBatchPasswords` cho danh sách tài khoản trong đó có `6A1-05`.
- **Hành vi kỳ vọng:**
  - Máy chủ kiểm tra trạng thái tài khoản và lịch sử học tập.
  - Phát hiện `6A1-05` là học sinh đang hoạt động (`MustChangePassword === "FALSE"` hoặc đã có bản ghi trong `RESPONSES`).
  - **MÁY CHỦ BẮT BUỘC TỪ CHỐI RESET TÀI KHOẢN NÀY** với mã lỗi `code: "STUDENT_ALREADY_ACTIVE"`, `status: "skipped_active"`.
  - Mật khẩu cá nhân của học sinh `6A1-05` được giữ nguyên vẹn 100%, phiên học không bị gián đoạn.

#### Test Vector 34: Tự Thẩm định Schema đối với Ví dụ JSON trong Tài liệu (Schema Self-Validation)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận ví dụ JSON chuẩn cung cấp trong tài liệu đặc tả hoàn toàn tuân thủ chặt chẽ `AccountImportSchemaV1`.
- **Hành động:** Nạp định nghĩa JSON Schema v1.0 (với `additionalProperties: false`) và thẩm định đối tượng Canonical JSON Example tại Mục 2 của `account-import-schema-v1.md`.
- **Hành vi kỳ vọng:**
  - Ví dụ không chứa thuộc tính lạ (như `$schema` ở cấp payload).
  - Đầy đủ các trường bắt buộc cấp root: `schemaVersion`, `schoolYear`, `importMode`, `accounts`.
  - Quan hệ giữa `grade` và `schoolLevel` tương thích 100% với ma trận cấp học.
  - Bộ kiểm định JSON Schema đánh giá kết quả là `VALID` (Không có lỗi).

#### Test Vector 35: Cách ly Tuyệt đối Kiểm toán Quản trị khỏi EVENT_LOG Học tập (Audit Isolation from Learning Telemetry)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo toàn bộ các sự kiện quản trị tài khoản không làm sai lệch bảng dữ liệu học tập `EVENT_LOG`.
- **Hành động:** Thực hiện lần lượt các thao tác quản trị: `createAccount`, `importAccountsBatch`, `resetAccountPassword`, `reissueBatchPasswords`.
- **Hành vi kỳ vọng:**
  - Bảng `EVENT_LOG` (dành cho viễn trắc học tập `V2_HEADERS.EVENT_LOG`) không tăng thêm bất kỳ dòng nào (`rowCount` giữ nguyên).
  - Dòng thời gian học tập trong `timeline_()` của `Teacher.gs` không xuất hiện các nhãn lạ ngoài hoạt động học tập.
  - Toàn bộ nhật ký quản trị được định tuyến độc lập vào bảng đề xuất `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`).

---

### Nhóm 7: Bằng chứng Nguồn gốc Lô & Kiểm thử Phục hồi Nâng cao (Test Vectors 36–44)

#### Test Vector 36: Phát hiện và Từ chối BatchId Giả mạo (Spoofed BatchId Replay Detection)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc client gửi một `batchId` ngẫu nhiên hoặc của giáo viên khác nhằm chiếm đoạt trạng thái lô hoặc bỏ qua quy trình kiểm tra.
- **Hành động:** Client gửi yêu cầu `importAccountsBatch` với `batchId = "bat_spoofed_random_99"`.
- **Hành vi kỳ vọng:**
  - Máy chủ tra cứu bảng `AUTH_IMPORT_BATCHES` và không tìm thấy `batchId` này $\rightarrow$ Xử lý như một lô mới.
  - Nếu bất kỳ tài khoản nào bên trong payload trùng với tài khoản đã có trong `USERS`, máy chủ lập tức từ chối với mã lỗi `COLLISION_EXISTING_ACCOUNT`.
  - Nếu client gửi yêu cầu `reissueBatchPasswords` với `batchId = "bat_spoofed_random_99"`, máy chủ từ chối ngay lập tức với mã lỗi `code: "BATCH_PROVENANCE_NOT_FOUND"`.

#### Test Vector 37: Cùng BatchId nhưng Payload bị Thay đổi (Payload Forgery Detection)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Phát hiện và chặn đứng hành vi tái sử dụng `batchId` cũ nhưng gửi kèm payload JSON đã bị chỉnh sửa (thay đổi danh sách học sinh hoặc sửa họ tên).
- **Điều kiện tiên quyết:** Lô `bat_valid_01` đã commit thành công với 5 tài khoản và có dấu vân tay `storedFingerprint` trong `AUTH_IMPORT_BATCHES`.
- **Hành động:** Client gửi lại `importAccountsBatch` với cùng `batchId = "bat_valid_01"` nhưng nội dung mảng `accounts` bị sửa đổi hoặc thêm bớt phần tử.
- **Hành vi kỳ vọng:**
  - Máy chủ chuẩn hóa canonical JSON của payload mới và tính toán `serverFingerprint`.
  - Phát hiện `serverFingerprint !== storedFingerprint`.
  - Máy chủ **lập tức từ chối yêu cầu** với mã lỗi `code: "BATCH_PAYLOAD_MISMATCH"`, ngăn chặn việc giả mạo hoặc ghi đè dưới định danh lô cũ.

#### Test Vector 38: Cùng Payload nhưng BatchId Khác (Identical Payload with New BatchId)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận hệ thống phân định rõ ràng giữa nạp lại một lô cũ và nạp một lô mới có nội dung trùng lặp tài khoản.
- **Điều kiện tiên quyết:** Lô 1 (`bat_01`) đã tạo thành công tài khoản học sinh `6A1-01`.
- **Hành động:** Giáo viên gửi một tệp mới mang `batchId = "bat_02"` nhưng nội dung mảng `accounts` vẫn chứa tài khoản `6A1-01`.
- **Hành vi kỳ vọng:**
  - Máy chủ nhận diện `bat_02` là một lô mới độc lập (chưa có trong `AUTH_IMPORT_BATCHES`).
  - Khi kiểm tra trùng lặp trên `USERS`, phát hiện `6A1-01` đã tồn tại trong cơ sở dữ liệu.
  - Máy chủ **bắt buộc từ chối bản ghi đó** với mã lỗi `code: "COLLISION_EXISTING_ACCOUNT"`, ngăn chặn việc lô mới nhận nhầm tài khoản cũ là vừa tạo.

#### Test Vector 39: Mất Dữ liệu Batch Metadata sau khi Ghi USERS (Unprovenanced Partial Batch Recovery)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Kiểm soát và phục hồi an toàn tình huống gián đoạn: `USERS` và `ENROLLMENTS` đã ghi thành công nhưng kết nối mạng bị đứt trước khi kịp ghi `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`.
- **Kịch bản mô phỏng:** Trạng thái `PARTIAL_WRITE_UNPROVENANCED_BATCH`.
- **Hành động:** Client gửi lại cùng `batchId` và payload chuẩn tắc trong vòng 15 phút.
- **Hành vi kỳ vọng:**
  - Máy chủ đối chiếu nếu toàn bộ danh sách học sinh trong payload khớp hoàn toàn với các bản ghi vừa được tạo trong bảng `USERS` trong vòng 15 phút bởi chính phiên làm việc đó.
  - Máy chủ hoàn tất việc ghi bổ sung metadata vào `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`, gắn nhãn `status: "replayed_and_provenanced"`.
  - Nếu không thể đối chiếu chứng minh nguồn gốc (ví dụ tài khoản đã tạo từ lâu hoặc khác phiên), hệ thống từ chối với `COLLISION_EXISTING_ACCOUNT`.

#### Test Vector 40: Từ chối Reset khi Không Tồn tại Batch Provenance (Batch Provenance Missing Fallback)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo không thể kích hoạt reset hàng loạt nếu thiếu chứng cứ nguồn gốc máy chủ đáng tin cậy.
- **Hành động:** Giáo viên gọi `reissueBatchPasswords` với một `batchId` không có bản ghi trong bảng `AUTH_IMPORT_BATCHES`.
- **Hành vi kỳ vọng:**
  - Máy chủ từ chối thao tác với mã lỗi `code: "BATCH_PROVENANCE_NOT_FOUND"`.
  - Hệ thống yêu cầu giáo viên chuyển sang quy trình `resetAccountPassword` cho từng tài khoản có kiểm soát và xác nhận riêng biệt.

#### Test Vector 41: Từ chối Reset khi Học sinh Đã Đổi Mật khẩu hoặc Đã Có Bài Làm (Active Student Protection)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận máy chủ từ chối reset tài khoản của học sinh đang hoạt động dù lô nạp hợp lệ.
- **Điều kiện tiên quyết:** Lô `bat_01` hợp lệ trong `AUTH_IMPORT_BATCHES`. Học sinh `6A1-01` thuộc lô đã đổi mật khẩu (`MustChangePassword === "FALSE"`).
- **Hành động:** Giáo viên gọi `reissueBatchPasswords` cho `bat_01`.
- **Hành vi kỳ vọng:**
  - Máy chủ kiểm tra `MustChangePassword` và các bảng `PROGRESS`, `RESPONSES`.
  - Máy chủ **bắt buộc từ chối reset tài khoản `6A1-01`** với mã lỗi `code: "STUDENT_ALREADY_ACTIVE"`.
  - Mật khẩu hiện tại của học sinh được giữ nguyên vẹn 100%, phiên học không bị gián đoạn.

#### Test Vector 42: Từ chối Reset khi Lô Đã Quá Hạn Phục hồi 24 Giờ (Batch Expiration Safety)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Ngăn chặn việc sử dụng chức năng khôi phục khẩn cấp cho các lô nạp đã quá cũ.
- **Điều kiện tiên quyết:** Lô `bat_01` trong `AUTH_IMPORT_BATCHES` có `CreatedAt` từ 3 ngày trước (`ExpiresAt < now`).
- **Hành động:** Giáo viên gọi `reissueBatchPasswords` cho `bat_01`.
- **Hành vi kỳ vọng:**
  - Máy chủ kiểm tra `Date.now() > stored.ExpiresAt`.
  - Máy chủ từ chối với mã lỗi `code: "BATCH_EXPIRED"`.
  - Khóa chức năng reset hàng loạt, yêu cầu reset từng tài khoản.

#### Test Vector 43: Băm SHA-256 được Tính toán Độc lập tại Máy chủ (Server-Side Canonical Fingerprint Verification)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Xác nhận máy chủ bỏ qua hoàn toàn băm do client gửi lên và tự chuẩn hóa JSON chuẩn tắc trước khi băm.
- **Hành động:** Client gửi payload kèm chuỗi băm giả lập `batchFingerprint: "fake_client_hash_12345"`.
- **Hành vi kỳ vọng:**
  - Máy chủ bỏ qua chuỗi băm do client gửi.
  - Máy chủ tự sắp xếp các khóa JSON, sắp xếp mảng `accounts` theo `accountId.toUpperCase()`, tính SHA-256 nội bộ.
  - Giá trị lưu vào `AUTH_IMPORT_BATCHES.BatchFingerprint` là giá trị băm do chính máy chủ tính toán.

#### Test Vector 44: Xác minh Không Lưu Mật khẩu Thô trong Batch Metadata (Zero Cleartext in Metadata)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Quét kiểm tra toàn bộ cấu trúc và dữ liệu lưu trong 2 bảng `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`.
- **Hành vi kỳ vọng:**
  - Cả 2 bảng metadata hoàn toàn không có bất kỳ cột nào chứa: mật khẩu thô, mật khẩu tạm, password hash, password salt hay session token.
  - Chỉ lưu vết quan hệ định danh: `BatchID`, `StudentUID`, `AccountId`, `Username`, `Fingerprint`, `Timestamps`.
