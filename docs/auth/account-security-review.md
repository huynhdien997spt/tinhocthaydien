# ACCOUNT MANAGEMENT SECURITY REVIEW & ARCHITECTURE AUDIT
## Threat Modeling, Access Control, and Security Verification for Web-Based Account Administration

- **Document Version:** `1.0`
- **Security Audit Status:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED (Pre-Implementation Review)`
- **Scope:** Account Management Backend (Task ID: `AUTH-A1`)
- **Repository:** `huynhdien997spt/tinhocthaydien`
- **Working Branch:** `account-management-json-review`
- **Baseline Commit:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`

---

## 1. Mục tiêu và Ranh giới Rà soát An toàn (Design Proposal)

Tài liệu này đánh giá toàn diện các rủi ro bảo mật, mô hình hóa mối đe dọa (Threat Modeling theo chuẩn STRIDE), và xác lập các cơ chế kiểm soát phòng vệ cho hệ thống quản lý tài khoản JSON v1.0. 

> [!NOTE]
> Toàn bộ nội dung trong tài liệu này là **đề xuất thiết kế (DESIGN_PROPOSAL)**, **chưa được áp dụng vào môi trường production** và ở trạng thái **NOT_YET_VERIFIED** cho đến khi hoàn thành vòng triển khai và kiểm thử thực tế.

Mục tiêu cốt lõi:
1. Đảm bảo tài khoản học sinh, giáo viên và quản trị viên được tạo lập và quản trị an toàn trên hạ tầng Google Apps Script / Google Sheets.
2. Ngăn ngừa triệt để các lỗ hổng leo thang đặc quyền (Privilege Escalation), truy cập trái phép ngoài phạm vi phân công (Cross-Class Unauthorized Access), và rò rỉ dữ liệu xác thực (Credential Leakage).
3. Đảm bảo tính toàn vẹn của dữ liệu học tập liên kết với `StudentUID` không bị xáo trộn hoặc ghi đè khi nhập liệu.

---

## 2. Rà soát Cơ chế Băm Mật khẩu PBKDF2: Thực tế Triển khai vs Tiêu chuẩn Hiện đại

### 2.1. Hiện trạng triển khai trong mã nguồn hiện có (`backend/Code.gs:283-294`)
- **Thuật toán xác thực:** `PBKDF2-HMAC-SHA256` (chuẩn RFC 8018), 1 khối 32 byte.
- **Số vòng lặp (`pbkdf2Iterations`):** Cố định ở mức **`1000` vòng** (theo cấu hình `AUTH_CONFIG.pbkdf2Iterations`).
- **Muối (`salt`):** 16 byte ngẫu nhiên được sinh từ `randomBytes_(16)` (dựa trên `Utilities.getUuid()` và SHA-256).
- **Hạ tầng thực thi:** Mã JavaScript thuần (pure JS) chạy trong môi trường máy chủ Google Apps Script.
- **Thời gian thực thi đo đạc thực tế:** Mỗi phép băm PBKDF2 với 1000 vòng mất khoảng **`50 – 150 ms`** thời gian CPU của Google Apps Script (ghi nhận trong tài liệu `README.md` qua hàm `benchmarkHash()`).

### 2.2. Đối chiếu với Tiêu chuẩn Bảo mật Hiện đại (NIST / OWASP)
- **Tiêu chuẩn bên ngoài (OWASP Password Storage Cheat Sheet):** Khuyến nghị từ 600.000 vòng lặp trở lên cho PBKDF2-HMAC-SHA256 khi chạy trên phần cứng máy chủ chuyên dụng (sử dụng thư viện C-native như OpenSSL, crypto native của Node.js/Go).
- **Phân tích Rào cản Kỹ thuật trên Google Apps Script:**
  - Google Apps Script áp dụng giới hạn cứng thời gian thực thi: tối đa **6 phút (360 giây)** cho một lần chạy web app.
  - Apps Script không cung cấp API native cho PBKDF2 mà phải tự thực hiện vòng lặp HMAC trong JavaScript (`Code.gs:288`).
  - Nếu tăng số vòng lặp lên mức 600.000, thời gian tính toán băm cho 1 tài khoản sẽ mất xấp xỉ **`60 – 90 giây`**. Điều này sẽ lập tức làm sập các yêu cầu đăng nhập web thông thường, cạn kiệt tài nguyên CPU và gây lỗi Timeout hệ thống.

### 2.3. Quyết định Thiết kế & Biện pháp Phòng ngự Chiều sâu (Defense-in-Depth)
1. **Bảo toàn thuật toán xác thực hiện tại:** Giữ nguyên chính xác cấu hình `AUTH_CONFIG.pbkdf2Iterations: 1000` của hệ thống. **Không tự ý thay đổi thuật toán hay số vòng lặp** để không phá vỡ tính tương thích của các tài khoản đang hoạt động và không gây lỗi DoS trên Apps Script.
2. **Cơ chế Khóa tài khoản (Account Lockout Policy):** Nhằm bù đắp rủi ro tấn công dò mật khẩu trực tuyến (Online Brute-force), hệ thống áp dụng cơ chế tự động khóa tài khoản sau **`5 lần nhập sai liên tiếp`**, khóa trong vòng **`10 phút`** (`AUTH_CONFIG.maxFailedAttempts = 5`, `AUTH_CONFIG.lockMinutes = 10` tại `Code.gs:121-125`).
3. **Mã băm mã phiên (Session Token Pepper Hashing):** Các token phiên lưu trong Google Sheets đều được băm HMAC-SHA256 với `TOKEN_PEPPER` bí mật nằm trong Script Properties (`Code.gs:301-306`), ngăn ngừa kẻ xấu đọc lén token từ Google Sheets.
4. **Chống dò tài khoản bằng timing:** Trong hàm `login_()`, nếu tài khoản không tồn tại, máy chủ vẫn thực hiện một phép tính băm giả lập (`hashPassword_(password, randomBytes_(16))`) để duy trì thời gian phản hồi tương đương, ngăn chặn kỹ thuật trinh sát thời gian (Timing Attacks).

---

## 3. Rà soát Giới hạn Google Sheets, Concurrency & Khả năng Phục hồi Sự cố (Fault Tolerance)

### 3.1. Rà soát Giới hạn Giao dịch của Google Sheets
> [!IMPORTANT]
> **Khẳng định chính thức:** Google Sheets là dịch vụ bảng tính cộng tác, **KHÔNG PHẢI là một hệ quản trị cơ sở dữ liệu quan hệ (RDBMS) có hỗ trợ giao dịch ACID**. Google Sheets **KHÔNG CÓ cơ chế Transaction Rollback tự động**. Nếu một tác vụ ghi nhiều dòng bị gián đoạn giữa chừng, các dòng đã được ghi sẽ tồn tại trên bảng tính mà không tự động hoàn tác.

Thiết kế AUTH-A1 **thu hồi hoàn toàn tuyên bố về "Bulk Atomic Write"**. Thay vào đó, thiết kế áp dụng các cơ chế an toàn dựa trên tính chất kỹ thuật thực tế của Google Sheets:

### 3.2. Cơ chế Khóa Phân tán (Distributed ScriptLock)
- Mọi thao tác ghi (`createAccount`, `importAccountsBatch`, `resetAccountPassword`) bắt buộc phải bọc trong hàm `withLock_()`:
  ```javascript
  function withLock_(fn) {
    const lock = LockService.getScriptLock();
    try { 
      lock.waitLock(15000); // Chờ tối đa 15 giây
    } catch (e) { 
      throw E_("BUSY"); // Trả về BUSY nếu bị tranh chấp khóa
    }
    try { 
      return fn(); 
    } finally { 
      lock.releaseLock(); 
    }
  }
  ```
- Biện pháp này đảm bảo chỉ có duy nhất một phiên quản trị được phép ghi vào bảng tính tại một thời điểm, loại bỏ hiện tượng ghi đè chéo (Race Condition).

### 3.3. Cơ chế Idempotency theo Từng Bản ghi (Per-Record Idempotency)
- Trong một lô nhập dữ liệu (`importAccountsBatch`), hệ thống không phụ thuộc vào trạng thái toàn vẹn của cả lô mà kiểm tra tính duy nhất theo **từng bản ghi riêng biệt**:
  1. Mỗi bản ghi được xác định bằng `Username = accountId.toUpperCase()`.
  2. Trước khi ghi, hệ thống quét bảng `USERS`. Nếu `Username` đã tồn tại:
     - Gắn nhãn trạng thái bản ghi là `status: "skipped_existing"`.
     - Giữ nguyên toàn bộ dữ liệu của tài khoản cũ (không ghi đè, không sinh lại UID, không thay đổi mật khẩu).
  3. Nếu `Username` chưa tồn tại:
     - Gắn nhãn `status: "created"`.
     - Sinh `StudentUID`, mật khẩu tạm, băm PBKDF2 và đưa vào danh sách cần ghi.
  4. Ghi các dòng mới vào Sheet trong một lệnh duy nhất: `sheet.getRange(nextRow, 1, newRowsCount, 18).setValues(bulkRows)`.

### 3.4. Cơ chế Phục hồi khi Tác vụ bị Gián đoạn (Interrupted Batch Recovery)
- Nếu tác vụ nhập hàng loạt bị ngắt giữa chừng (do đứt cáp mạng, timeout kết nối phía client hoặc lỗi máy chủ):
  - Người dùng có thể an toàn tải lại cùng một tệp JSON với cùng `batchId`.
  - Nhờ cơ chế **Idempotency theo từng bản ghi**, những tài khoản đã được ghi nhận trước khi gián đoạn sẽ được nhận diện là đã có (`skipped_existing`), trong khi các tài khoản còn lại sẽ tiếp tục được tạo mới bình thường (`created`).
  - Dữ liệu hoàn toàn không bị trùng lặp, không bị xáo trộn UID.

---

## 4. Tình huống Phản hồi Thất lạc và Chính sách Cấp lại Mật khẩu An toàn (Lost Response Handling)

### 4.1. Bản chất Rủi ro
Trong mô hình lưu trữ mật khẩu không lưu bản rõ (Zero Cleartext Persistence), máy chủ **không bao giờ lưu mật khẩu tạm dạng thô** vào Google Sheets hay bất kỳ tệp log nào. Mật khẩu tạm chỉ xuất hiện trong phản hồi HTTPS gửi về cho trình duyệt của giáo viên.

Nếu xảy ra sự cố: Máy chủ đã tạo tài khoản thành công và ghi vào Sheet, nhưng mạng bị đứt ngay trước khi trình duyệt nhận được gói phản hồi chứa danh sách mật khẩu tạm.
- **Ràng buộc bảo mật:** Máy chủ **KHÔNG THỂ và TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP lưu mật khẩu tạm cũ để gửi lại**. Việc lưu trữ mật khẩu rõ trên Google Sheets hay cache phía máy chủ sẽ tạo ra lỗ hổng rò rỉ thông tin cực kỳ nguy hiểm.

### 4.2. Quy trình Cấp lại Mật khẩu Mới An toàn (Fresh Password Re-Issuance Protocol)
Khi giáo viên nhận thấy lô tài khoản đã tồn tại nhưng chưa có mật khẩu tạm:
1. **Tuyệt đối không tìm cách đọc lại mật khẩu cũ.**
2. **Khởi tạo quy trình cấp lại mật khẩu mới:**
   - Giáo viên có thể sử dụng API `resetAccountPassword` cho từng tài khoản, hoặc gọi API hàng loạt `reissueBatchPasswords`.
   - **Cơ chế tại Backend:**
     1. Xác minh quyền quản trị của giáo viên đối với lớp học tương ứng.
     2. Sinh ra một **MẬT KHẨU TẠM HOÀN TOÀN MỚI** (8 ký tự ngẫu nhiên).
     3. Sinh chuỗi muối mới và tính toán lại băm PBKDF2 mới.
     4. Cập nhật đè lên `PasswordHash` và `PasswordSalt` trong bảng `USERS`.
     5. Cập nhật `MustChangePassword = "TRUE"`, `FailedAttempts = 0`, `LockedUntil = ""`.
     6. Thu hồi toàn bộ các phiên làm việc cũ nếu có (`revokeAll_`).
     7. Trả về mật khẩu tạm mới qua kết nối HTTPS có bảo vệ.
3. **Kết quả bảo mật:** Mật khẩu tạm cũ bị thất lạc trước đó lập tức trở nên vô hiệu vì mã băm đã bị thay thế hoàn toàn. Quy trình này bảo đảm an toàn 100% cho học sinh và không vi phạm chính sách Zero Cleartext.

---

## 5. Mô hình Hóa Mối đe dọa (STRIDE Threat Modeling)

| Mã đe dọa | Danh mục STRIDE | Kịch bản tấn công tiềm ẩn | Biện pháp Phòng vệ trong Thiết kế AUTH-A1 |
|---|---|---|---|
| **T-01** | **Spoofing (Giả mạo)** | Kẻ tấn công gửi yêu cầu tạo/reset tài khoản với `token` giả hoặc tự định danh UID | Yêu cầu kiểm tra token qua `requireSession_()` tại backend; băm HMAC-SHA256 với secret `TOKEN_PEPPER` lưu trong Script Properties; toàn bộ UID do máy chủ tự sinh bằng UUID v4. |
| **T-02** | **Tampering (Can thiệp dữ liệu)** | Kẻ tấn công chèn công thức Google Sheets vào trường `fullName` hoặc `accountId` (`=IMPORTXML(...)`, `=IMAGE(...)`) | Thực thi bộ lọc Formula Injection: từ chối mọi trường dữ liệu bắt đầu bằng các ký tự công thức (`=`, `+`, `-`, `@`, `\t`, `\r`). Toàn bộ ô lưu trữ trong sheet được định dạng văn bản thô `@` (`setNumberFormat("@")`). |
| **T-03** | **Repudiation (Chối bỏ trách nhiệm)** | Người dùng chối bỏ việc thực hiện batch import hoặc reset mật khẩu | Ghi nhật ký có cấu trúc vào bảng `EVENT_LOG` (ghi nhận `timestamp`, `actorUid`, `actorRole`, `action`, `targetUid`, `status`), không ghi lại mật khẩu thô. |
| **T-04** | **Information Disclosure (Lộ lọt thông tin)** | Lộ mật khẩu tạm thời, chuỗi muối hoặc hash băm mật khẩu qua API `listManagedAccounts` hoặc qua file log | Mật khẩu tạm chỉ xuất hiện **duy nhất một lần** trong phản hồi HTTPS. Không lưu trữ mật khẩu rõ trên Google Sheets hay trả về trong các API truy vấn. Không in mật khẩu ra Logger. |
| **T-05** | **Denial of Service (Từ chối dịch vụ)** | Tấn công gửi tệp JSON chứa hàng nghìn tài khoản làm cạn kiệt hạn mức thực thi 6 phút của Apps Script hoặc khóa ScriptLock quá lâu | Giới hạn kích thước lô: tối đa **100 tài khoản / batch**. Áp dụng tiền thẩm định Fail-Fast trong RAM trước khi chạm vào Sheet. Thiết lập thời gian chờ khóa đồng thời `LockService.waitLock(15000)` an toàn. |
| **T-06** | **Elevation of Privilege (Leo thang đặc quyền)** | Giáo viên gửi payload JSON chứa tài khoản có `role = "admin"` hoặc `role = "teacher"` để tự cấp quyền quản trị | Backend kiểm tra vai trò người gọi: Giáo viên **chỉ được phép tạo tài khoản có `role = "student"`**. Nếu payload chứa vai trò khác, hệ thống lập tức từ chối với lỗi `FORBIDDEN`. |

---

## 6. Ma trận Phân quyền theo Vai trò (Role-Based Access Control - RBAC)

| Hành động API | Vai trò `student` | Vai trò `teacher` | Vai trò `admin` |
|---|---|---|---|
| `validateAccountImport` | ❌ Bị cấm (`FORBIDDEN`) | ✅ Cho phép (Chỉ thẩm định học sinh thuộc lớp được phân công) | ✅ Cho phép (Toàn hệ thống) |
| `createAccount` (Student) | ❌ Bị cấm | ✅ Cho phép (Chỉ trong lớp được phân công) | ✅ Cho phép |
| `createAccount` (Teacher) | ❌ Bị cấm | ❌ Bị cấm (`FORBIDDEN`) | ✅ Cho phép |
| `createAccount` (Admin) | ❌ Bị cấm | ❌ Bị cấm (`FORBIDDEN`) | ✅ Cho phép |
| `importAccountsBatch` | ❌ Bị cấm | ✅ Cho phép (Toàn bộ học sinh trong lô phải thuộc lớp phân công) | ✅ Cho phép |
| `reissueBatchPasswords` | ❌ Bị cấm | ✅ Cho phép (Chỉ học sinh thuộc lớp phân công) | ✅ Cho phép |
| `resetAccountPassword` (Student) | ❌ Bị cấm | ✅ Cho phép (Chỉ học sinh thuộc lớp phân công; không được reset chính mình) | ✅ Cho phép |
| `resetAccountPassword` (Teacher) | ❌ Bị cấm | ❌ Bị cấm (`FORBIDDEN`) | ✅ Cho phép |
| `resetAccountPassword` (Admin) | ❌ Bị cấm | ❌ Bị cấm (`FORBIDDEN`) | ✅ Cho phép (Chống tự reset chính mình qua API này) |
| `listManagedAccounts` | ❌ Bị cấm | ✅ Cho phép (Chỉ xem danh sách học sinh thuộc lớp phân công) | ✅ Cho phép (Xem toàn bộ hoặc lọc theo lớp) |

---

## 7. Chính sách Chống Tự khóa và Bảo vệ Tài khoản Quản trị (Anti-Lockout Policy)

Để bảo đảm tính khả dụng liên tục của hệ thống:
1. **Không cho phép tự khóa/tự reset:** Tài khoản Admin đang đăng nhập không thể sử dụng các API quản lý này để tự khóa (`teacherLockUser`) hoặc tự reset mật khẩu của chính mình (phải sử dụng quy trình `changePassword` thông thường).
2. **Quy tắc Admin tối thiểu:** Khi một admin thực hiện thao tác khóa tài khoản admin khác, hệ thống phải kiểm tra trong bảng `USERS` còn ít nhất một tài khoản admin khác đang ở trạng thái `Active = "TRUE"`. Nếu đó là admin hoạt động duy nhất, hệ thống từ chối thao tác với mã lỗi `CANNOT_DISABLE_LAST_ADMIN`.
