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

---

## 2. Danh mục 27 Bộ Test Vectors Chi tiết (Acceptance Test Suite)

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

#### Test Vector 27: Rà soát Baseline Thuật toán PBKDF2 (Algorithm Integrity & Quota Safety)
- **Trạng thái:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED`
- **Mục tiêu:** Đảm bảo thuật toán băm mật khẩu tuân thủ đúng baseline của hệ thống mà không làm vượt hạn mức thời gian CPU của Google Apps Script.
- **Kiểm tra kỹ thuật:**
  - Kiểm tra `AUTH_CONFIG.pbkdf2Iterations`: Bắt buộc là `1000`.
  - Kiểm tra cấu trúc hash: Bắt buộc định dạng `"pbkdf2-sha256$1000$" + base64(digest)`.
  - Đo lường thời gian thực thi: 1 lần băm trên môi trường Apps Script nằm trong khoảng `50–150 ms`.
  - Không tự ý tăng vòng lặp lên mức 600.000 (gây lỗi timeout 6 phút).
