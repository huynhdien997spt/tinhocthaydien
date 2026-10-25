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

## 2. Rà soát Cơ chế Băm Mật khẩu PBKDF2: Baseline Di sản vs Tiêu chuẩn Hiện đại

### 2.1. Hiện trạng triển khai trong mã nguồn hiện có (`backend/Code.gs:283-294`)
- **Thuật toán xác thực:** `PBKDF2-HMAC-SHA256` (chuẩn RFC 8018), 1 khối 32 byte.
- **Số vòng lặp (`pbkdf2Iterations`):** Cố định ở mức **`1000` vòng** (theo cấu hình `AUTH_CONFIG.pbkdf2Iterations`).
- **Phân loại bản chất:** Mức 1.000 vòng lặp là **`LEGACY BASELINE`** từ mã nguồn ban đầu của dự án, **KHÔNG PHẢI là một tiêu chuẩn an ninh mới được phê duyệt**.
- **Muối (`salt`):** 16 byte ngẫu nhiên được sinh từ `randomBytes_(16)` (dựa trên `Utilities.getUuid()` và SHA-256).
- **Hạ tầng thực thi:** Mã JavaScript thuần (pure JS) chạy trong môi trường máy chủ Google Apps Script (không có thư viện crypto native).
- **Thời gian thực thi:** Con số ước tính lý thuyết chưa qua benchmark chính thức trên production Apps Script với tải đồng thời. Mọi khẳng định về thời gian băm 50–150ms trước đây chỉ là giả định lý thuyết, cần được kiểm chứng qua benchmark thực tế (`NOT_YET_VERIFIED`).

### 2.2. Đối chiếu với Tiêu chuẩn Bảo mật Hiện đại (NIST / OWASP)
- **Tiêu chuẩn bên ngoài (OWASP Password Storage Cheat Sheet):** Khuyến nghị từ 600.000 vòng lặp trở lên cho PBKDF2-HMAC-SHA256 khi chạy trên phần cứng máy chủ chuyên dụng (sử dụng thư viện C-native như OpenSSL, crypto native của Node.js/Go).
- **Phân tích Rào cản Kỹ thuật trên Google Apps Script:**
  - Google Apps Script áp dụng giới hạn cứng thời gian thực thi: tối đa **6 phút (360 giây)** cho một lần chạy web app.
  - Apps Script không cung cấp API native cho PBKDF2 mà phải tự thực hiện vòng lặp HMAC trong JavaScript (`Code.gs:288`).
  - Nếu tăng số vòng lặp lên mức 600.000, thời gian tính toán băm cho 1 tài khoản ước tính sẽ mất hàng chục giây đến hơn một phút trong môi trường pure JS của Apps Script. Điều này sẽ làm cạn kiệt CPU quota và gây lỗi Timeout hệ thống ngay trong luồng đăng nhập thông thường.

### 2.3. Đánh giá Rủi ro và Ranh giới Phòng vệ
> [!WARNING]
> **Ranh giới Bảo mật:** Cơ chế Khóa tài khoản (Account Lockout) và mã băm token phiên (Token Pepper) chỉ có tác dụng phòng vệ đối với **tấn công dò quét trực tuyến (Online Brute-force)** và **chiếm đoạt phiên (Session Hijacking)**. Chúng **TUYỆT ĐỐI KHÔNG THỂ thay thế độ mạnh của thuật toán password hashing** trong trường hợp cơ sở dữ liệu Google Sheets bị rò rỉ hoặc bị trích xuất trái phép (Offline Cracking).

### 2.4. Đề xuất Phương án Nâng cấp Bảo mật Tương thích Ngược (PROPOSED_UPGRADE_PATH)
Hệ thống đề xuất các phương án nâng cấp trong tương lai (chưa triển khai trong AUTH-A1):
1. **Phương án Nâng cấp Tuần tự khi Đăng nhập (Lazy Migration on Login):**
   - Bổ sung trường phiên bản băm hoặc tiền tố định dạng (ví dụ `$pbkdf2$v2$iters$salt$hash`).
   - Khi người dùng đăng nhập thành công bằng mật khẩu đúng với hash cũ (1000 vòng), máy chủ tự động băm lại mật khẩu với số vòng lặp tối ưu cao hơn và ghi đè lại vào `USERS`.
2. **Phương án Chuyển giao Tính toán (Offloaded Crypto Microservice):**
   - Chuyển tác vụ tính toán băm mật khẩu sang Cloud Functions có hỗ trợ WebCrypto/OpenSSL native nếu trường học có hạ tầng GCP chuyên dụng.
3. **Cam kết hiện tại:** Không tự ý thay đổi thuật toán xác thực trên codebase hiện tại khi chưa có quyết định kiến trúc chính thức.

### 2.5. Trạng thái Quyết định Chấp nhận Rủi ro
- Việc duy trì cấu hình `pbkdf2Iterations: 1000` trong giai đoạn này được ghi nhận chính thức là: **`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`**.
- Cần có sự phê duyệt bằng văn bản từ Project Controller và Chủ nhiệm Đề tài trước khi đưa vào sản xuất.

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

### 3.3. Phân định Tính Bất biến Lô và An toàn Xung đột (True Idempotency & Collision Safety)
- Trong một lô nhập dữ liệu (`importAccountsBatch`), hệ thống không mặc nhiên xem mọi `Username` đã tồn tại là kết quả của việc nạp lại thành công.
- **Phân định rõ ràng giữa Replay và Collision:**
  1. **Nhập lại lô hợp lệ (Genuine Batch Replay):**
     - Xác định bằng cặp khóa nhận diện: `batchId` (UUID client) và `batchFingerprint` (chuỗi băm SHA-256 của payload chuẩn hóa).
     - Khi nhận yêu cầu có cùng `batchFingerprint` và `batchId`:
       + Hệ thống đối chiếu thông tin tài khoản đã có trong `USERS`: nếu `Username`, `StudentUID`, `FullName`, `ClassID` và `SchoolYear` hoàn toàn trùng khớp với thông tin đã lưu, hệ thống xác nhận đây là thao tác nạp lại hợp lệ (`status: "replayed"`).
       + Tuyệt đối không sinh UID mới, không ghi đè, không đổi mật khẩu của học sinh.
  2. **Xung đột tài khoản cũ (Existing-Account Collision):**
     - Nếu `Username` đã có trong `USERS` nhưng thuộc về một lô khác, hoặc họ tên/lớp không khớp:
       + Hệ thống **TUYỆT ĐỐI KHÔNG ĐƯỢC âm thầm bỏ qua hay ghi nhận là thành công (`skipped_existing`)**.
       + Phải từ chối bản ghi đó với mã lỗi rõ ràng: **`COLLISION_EXISTING_ACCOUNT`**, ngăn chặn triệt để nguy cơ nhận nhầm tài khoản cũ là vừa được tạo mới.
- **Thẩm định lại trong phạm vi khóa ghi (`withLock_`):**
  - Mọi thao tác kiểm tra xung đột tài khoản và kiểm tra phân công lớp của giáo viên (`assignedSet_`) bắt buộc phải được thực hiện lại bên trong khối `withLock_`, triệt tiêu rủi ro tranh chấp tương tranh TOCTOU khi hai giáo viên cùng nhập hoặc phân công bị thu hồi giữa chừng.

### 3.4. Cơ chế Phục hồi khi Tác vụ bị Gián đoạn & Tự Hàn gắn (Interrupted Batch Recovery & Self-Healing)
- Do Google Sheets không có giao dịch ACID đa bảng, tác vụ ghi có thể bị ngắt sau khi đã ghi `USERS` nhưng chưa kịp ghi `ENROLLMENTS`:
  - Trạng thái này được định danh là **`PARTIAL_WRITE_ORPHAN`**.
  - Học sinh có tài khoản trong `USERS` nhưng không có trong `ENROLLMENTS` sẽ bị vô hình trên danh sách lớp của giáo viên (`Teacher.gs:buildRosters_`).
  - **Cơ chế tự hàn gắn (Self-Healing):** Khi giáo viên gửi lại cùng lô dữ liệu (Replay) với cùng `batchFingerprint`, hệ thống phát hiện các tài khoản đã có trong `USERS` nhưng thiếu bản ghi trong `ENROLLMENTS`. Hệ thống tự động ghi bổ sung các dòng `ENROLLMENTS` bị thiếu theo đúng cấu trúc chuẩn `V2_HEADERS.ENROLLMENTS`, đưa cơ sở dữ liệu về trạng thái nhất quán hoàn toàn mà không làm thay đổi UID hay mật khẩu của học sinh.

---

## 4. Tình huống Phản hồi Thất lạc và Chính sách Cấp lại Mật khẩu An toàn (Lost Response Handling)

### 4.1. Bản chất Rủi ro
Trong mô hình lưu trữ mật khẩu không lưu bản rõ (Zero Cleartext Persistence), máy chủ **không bao giờ lưu mật khẩu tạm dạng thô** vào Google Sheets hay bất kỳ tệp log nào. Mật khẩu tạm chỉ xuất hiện trong phản hồi HTTPS gửi về cho trình duyệt của giáo viên.

Nếu xảy ra sự cố: Máy chủ đã tạo tài khoản thành công và ghi vào Sheet, nhưng mạng bị đứt ngay trước khi trình duyệt nhận được gói phản hồi chứa danh sách mật khẩu tạm.
- **Ràng buộc bảo mật:** Máy chủ **KHÔNG THỂ và TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP lưu mật khẩu tạm cũ để gửi lại**. Việc lưu trữ mật khẩu rõ trên Google Sheets hay cache phía máy chủ sẽ tạo ra lỗ hổng rò rỉ thông tin cực kỳ nguy hiểm.

### 4.2. Quy trình Cấp lại Mật khẩu Mới An toàn (Fresh Password Re-Issuance Protocol)
Khi giáo viên nhận thấy lô tài khoản đã tồn tại nhưng chưa nhận được mật khẩu tạm:
1. **Tuyệt đối không tìm cách đọc lại mật khẩu cũ.**
2. **Quy tắc an toàn nghiêm ngặt cho `reissueBatchPasswords`:**
   - **Không reset theo ClassID:** Không cho phép gọi API chỉ với tham số `classId` để quét toàn lớp, tránh xóa nhầm mật khẩu của học sinh đã học ổn định.
   - **Xác minh nguồn gốc lô nạp (Batch Provenance):** Bắt buộc cung cấp `batchId`, `batchFingerprint` và danh sách `accountIds` khớp với lô nạp vừa tạo. Nếu không chứng minh được tài khoản thuộc lô nạp, hệ thống từ chối với lỗi `BATCH_PROVENANCE_UNVERIFIED` và yêu cầu chuyển sang quy trình reset từng tài khoản.
   - **Bảo vệ tài khoản học sinh đang học (Active Student Protection):** Với từng tài khoản, hệ thống kiểm tra cờ `MustChangePassword` và dữ liệu học tập trong `PROGRESS`, `RESPONSES`, `LEARNING_SESSIONS`. Nếu học sinh đã đổi mật khẩu (`MustChangePassword === "FALSE"`) hoặc đã có dữ liệu học tập, hệ thống **LẬP TỨC TỪ CHỐI RESET TÀI KHOẢN NÀY** với mã lỗi `STUDENT_ALREADY_ACTIVE`.
   - **Yêu cầu xác nhận rõ ràng:** Bắt buộc có cờ `confirmBatchReset: true` và lý do `reason: "LOST_RESPONSE_RECOVERY"`.
   - **Cấp lại Mật khẩu Mới Hoàn toàn:**
     1. Sinh ra một **MẬT KHẨU TẠM HOÀN TOÀN MỚI** (8 ký tự ngẫu nhiên).
     2. Sinh chuỗi muối mới và tính toán lại băm PBKDF2 mới.
     3. Cập nhật đè lên `PasswordHash` và `PasswordSalt` trong bảng `USERS`.
     4. Cập nhật `MustChangePassword = "TRUE"`, `FailedAttempts = 0`, `LockedUntil = ""`.
     5. Thu hồi toàn bộ các phiên làm việc cũ nếu có (`revokeAll_`).
     6. Trả về mật khẩu tạm mới qua kết nối HTTPS có bảo vệ.
3. **Kết quả bảo mật:** Mật khẩu tạm cũ bị thất lạc trước đó lập tức trở nên vô hiệu vì mã băm đã bị thay thế hoàn toàn. Quy trình này bảo đảm an toàn 100% cho học sinh và không vi phạm chính sách Zero Cleartext.

---

## 5. Mô hình Hóa Mối đe dọa (STRIDE Threat Modeling)

| Mã đe dọa | Danh mục STRIDE | Kịch bản tấn công tiềm ẩn | Biện pháp Phòng vệ trong Thiết kế AUTH-A1 |
|---|---|---|---|
| **T-01** | **Spoofing (Giả mạo)** | Kẻ tấn công gửi yêu cầu tạo/reset tài khoản với `token` giả hoặc tự định danh UID | Yêu cầu kiểm tra token qua `requireSession_()` tại backend; băm HMAC-SHA256 với secret `TOKEN_PEPPER` lưu trong Script Properties; toàn bộ UID do máy chủ tự sinh bằng UUID v4. |
| **T-02** | **Tampering (Can thiệp dữ liệu)** | Kẻ tấn công chèn công thức Google Sheets vào trường `fullName` hoặc `accountId` (`=IMPORTXML(...)`, `=IMAGE(...)`) | Thực thi bộ lọc Formula Injection: từ chối mọi trường dữ liệu bắt đầu bằng các ký tự công thức (`=`, `+`, `-`, `@`, `\t`, `\r`). Toàn bộ ô lưu trữ trong sheet được định dạng văn bản thô `@` (`setNumberFormat("@")`). |
| **T-03** | **Repudiation (Chối bỏ trách nhiệm)** | Người dùng chối bỏ việc thực hiện batch import hoặc reset mật khẩu | **Tách biệt khỏi EVENT_LOG:** Tuyệt đối không ghi sự kiện quản trị vào bảng `EVENT_LOG` học tập. Đề xuất ghi nhật ký có cấu trúc vào bảng độc lập `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`), lưu vết: `Timestamp`, `OperatorUID`, `OperatorRole`, `Action`, `TargetUID`, `TargetUsername`, `TargetRole`, `ClassID`, `SchoolYear`, `Status`, `ErrorCode`, `DetailsJSON`, `ClientIP_MD5`. Tuyệt đối không lưu mật khẩu thô, hash, salt, hoặc token. |
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
