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

### 3.3. Cơ chế Write-Ahead Provenance & Lưu trữ Bền vững Nguồn gốc Lô (Write-Ahead Provenance & Collision Safety)
- **Hạn chế của Bảng Hiện hữu:** Bảng `USERS` và `ENROLLMENTS` hiện không lưu thông tin `batchId` hay `batchFingerprint`. Nếu máy chủ ghi trực tiếp vào `USERS` trước khi có chứng cứ nguồn gốc bền vững, một sự cố gián đoạn giữa chừng sẽ tạo ra các tài khoản mồ côi mà máy chủ không thể chứng minh thuộc về lô nào. Quy trình cũ (`USERS → ENROLLMENTS → AUTH_IMPORT_BATCHES → AUTH_IMPORT_ITEMS`) bị bãi bỏ hoàn toàn.
- **Quy trình Write-Ahead Provenance (WAL) 7 bước nghiêm ngặt bên trong `withLock_`:**
  1. **Bước 1 (Thẩm định & Cấp phát Trước UID trong RAM):** Thẩm định cú pháp, kiểm tra phân quyền (`assignedSet_`), kiểm tra xung đột với `USERS`. Sinh trước danh sách `StudentUID` bất biến (`"stu_" + uuid_()`) cho 100% tài khoản trong RAM.
  2. **Bước 2 (Ghi Trước Header Lô - PREPARING):** Ghi bản ghi vào `AUTH_IMPORT_BATCHES` (`Status = "PREPARING"`, `CreatedCount = 0`, `ReplayedCount = 0`, `ExpiresAt = now + 24h`).
  3. **Bước 3 (Ghi Trước Danh mục Từng Mục - PLANNED):** Ghi toàn bộ danh sách tài khoản dự kiến tạo vào `AUTH_IMPORT_ITEMS` với `ItemStatus = "PLANNED"`, gắn chặt với `StudentUID` đã cấp phát trước.
  4. **Bước 4 (Ghi Bảng USERS):** Chỉ sau khi chứng cứ nguồn gốc đã tồn tại bền vững trong `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`, máy chủ mới ghi các dòng mới vào `USERS` sử dụng đúng các `StudentUID` đã sinh trước.
  5. **Bước 5 (Ghi Bảng ENROLLMENTS):** Ghi các dòng tương ứng vào `ENROLLMENTS` (đối với học sinh) bằng đúng các `StudentUID` đó.
  6. **Bước 6 (Đối chiếu & Cập nhật Trạng thái Mục - CREATED):** Quét đối chiếu lại `USERS`, `ENROLLMENTS` và `AUTH_IMPORT_ITEMS`. Khi xác nhận các dòng đã tồn tại nhất quán, cập nhật các mục trong `AUTH_IMPORT_ITEMS` từ `"PLANNED"` sang `"CREATED"`.
  7. **Bước 7 (Chốt Hoàn tất Lô - COMMITTED):** Chỉ chuyển trạng thái của lô trong `AUTH_IMPORT_BATCHES` từ `"PREPARING"` sang `"COMMITTED"` khi 100% tài khoản được xác minh nhất quán.

- **Định dạng Chuẩn hóa Toàn hệ thống:**
  - `batchId`: Định dạng chuỗi duy nhất: **`^bat_[0-9a-f]{32}$`** (ví dụ: `"bat_c0a80101e5f67890123456789abcdef0"`).
  - `batchFingerprint`: Chuỗi băm SHA-256 gồm 64 ký tự hex chữ thường do **máy chủ tự tính toán độc quyền**, tuyệt đối không dùng hash rỗng `e3b0c442...`.

- **Cấu trúc 2 Bảng Lưu vết Nguồn gốc Độc lập (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):**
  1. `AUTH_IMPORT_BATCHES`: `["BatchID", "BatchFingerprint", "OperatorUID", "OperatorRole", "SchoolYear", "ClassID", "TotalAccounts", "CreatedCount", "ReplayedCount", "Status", "CreatedAt", "ExpiresAt"]`.
     - `Status` lifecycle: `"PREPARING"` $\rightarrow$ `"COMMITTED"` (hoặc `"FAILED"` / `"EXPIRED"`).
  2. `AUTH_IMPORT_ITEMS`: `["ItemID", "BatchID", "StudentUID", "AccountId", "Username", "ItemStatus", "CreatedAt"]`.
     - `ItemStatus` lifecycle: `"PLANNED"` $\rightarrow$ `"CREATED"` (hoặc `"REPLAYED"`).
  - *Ràng buộc an ninh:* Tuyệt đối không lưu mật khẩu thô, mật khẩu tạm, password hash, salt hay token trong các bảng này.

- **Quy tắc Chuẩn hóa Chuẩn tắc (Canonical JSON Normalization) & Tính Băm Độc quyền tại Máy chủ:**
  - Máy chủ **không tin cậy giá trị hash do client gửi lên**. Giá trị băm SHA-256 bắt buộc do chính máy chủ tự tính toán từ payload sau khi chuẩn hóa:
    + Sắp xếp khóa cấp root và khóa từng object tài khoản theo thứ tự chữ cái.
    + Sắp xếp danh sách `accounts` theo thứ tự `accountId.toUpperCase()`.
    + Trim khoảng trắng thừa, chuyển thành chuỗi JSON thu gọn (compact, không khoảng trắng dư).
    + Tính toán SHA-256 trên chuỗi byte UTF-8 $\rightarrow$ chuỗi hex 64 ký tự chữ thường (`serverFingerprint`).

- **Phân định Replay Hợp lệ vs Giả mạo BatchId (Anti-Spoofing):**
  1. **Genuine Batch Replay:** Cung cấp `batchId` đã tồn tại trong `AUTH_IMPORT_BATCHES` với `OperatorUID === session.uid` và `serverFingerprint === stored.BatchFingerprint`. Hệ thống tra cứu `AUTH_IMPORT_ITEMS` để lấy danh sách `StudentUID` thực tế đã tạo, đánh dấu `status: "replayed"` (hoặc `status: "replayed_and_healed"` nếu hàn gắn `ENROLLMENTS`).
  2. **Existing-Account Collision:** Nếu `Username` đã tồn tại trong `USERS` nhưng không nằm trong manifest `AUTH_IMPORT_ITEMS` của chính lô này: Bắt buộc từ chối bản ghi đó với lỗi **`COLLISION_EXISTING_ACCOUNT`**. Tuyệt đối không cho phép tệp mới nhận nhầm tài khoản cũ là vừa tạo.
  3. **Batch ID Spoofing / Hijacking:** Nếu client gửi `batchId` đã thuộc về một giáo viên khác $\rightarrow$ Bị từ chối ngay với **`BATCH_ID_TAKEN`**.
  4. **Payload Forgery:** Nếu client gửi `batchId` cũ nhưng sửa đổi nội dung JSON $\rightarrow$ Bị từ chối ngay với **`BATCH_PAYLOAD_MISMATCH`**.

### 3.4. Ma trận Tính Nhất quán Phục hồi Sự cố (Recovery Consistency Matrix - Failure States A–F)
Do Google Sheets không có cơ chế giao dịch đa bảng (multi-table transaction rollback), hệ thống xác lập phương thức ứng phó cho từng tình huống gián đoạn dựa trên bằng chứng máy chủ rõ ràng (tuyệt đối không dùng logic suy đoán heuristic kiểu "tạo trong 15 phút"):

| Tình huống Gián đoạn | Điểm Sự cố / Trạng thái Bằng chứng | Cơ chế Phục hồi & Phòng vệ Bằng chứng Máy chủ |
|---|---|---|
| **Trường hợp A: Đã tạo batch PREPARING nhưng chưa ghi đủ manifest** | `AUTH_IMPORT_BATCHES` là `"PREPARING"`, `AUTH_IMPORT_ITEMS` < `TotalAccounts`, `USERS` chưa có dữ liệu | Máy chủ làm sạch items dở dang, ghi lại đầy đủ manifest với trạng thái `"PLANNED"` cùng các `StudentUID` đã cấp phát, sau đó tiếp tục quy trình Write-Ahead. |
| **Trường hợp B: Đã ghi manifest PLANNED nhưng chưa ghi USERS** | `AUTH_IMPORT_ITEMS` đủ $N$ mục `"PLANNED"`, `USERS` chưa có dữ liệu | Sử dụng chính xác các `StudentUID` đã lưu trong `AUTH_IMPORT_ITEMS` để ghi vào `USERS`, ghi `ENROLLMENTS`, cập nhật `"CREATED"` và chốt `"COMMITTED"`. Tuyệt đối không sinh lại UID. |
| **Trường hợp C: Đã ghi USERS nhưng thiếu ENROLLMENTS** | `AUTH_IMPORT_ITEMS` là `"PLANNED"`, `USERS` đã có dữ liệu, `ENROLLMENTS` chưa có dòng | Không ghi lại `USERS`. Máy chủ thực hiện ghi bổ sung vào `ENROLLMENTS` từ dữ liệu chuẩn của `USERS`, cập nhật items sang `"CREATED"` và chốt batch `"COMMITTED"`. |
| **Trường hợp D: Đã ghi USERS và ENROLLMENTS nhưng chưa cập nhật trạng thái mục** | `USERS` và `ENROLLMENTS` đã đầy đủ, nhưng `AUTH_IMPORT_ITEMS` vẫn đang `"PLANNED"` | Máy chủ cập nhật các mục trong `AUTH_IMPORT_ITEMS` sang `"CREATED"`, sau đó chuyển batch sang `"COMMITTED"`. |
| **Trường hợp E: Đã hoàn tất CREATED nhưng chưa đánh dấu batch COMMITTED** | 100% mục trong `AUTH_IMPORT_ITEMS` đã là `"CREATED"`, `AUTH_IMPORT_BATCHES` vẫn là `"PREPARING"` | Máy chủ cập nhật `AUTH_IMPORT_BATCHES.Status = "COMMITTED"`. |
| **Trường hợp F: Đã COMMITTED nhưng phản hồi HTTP bị thất lạc** | `AUTH_IMPORT_BATCHES.Status === "COMMITTED"` | Máy chủ trả về kết quả Replay hợp lệ với `temporaryPassword: null` và `passwordReissueAvailable: true` (tuân thủ Zero Cleartext). Giáo viên dùng `reissueBatchPasswords` nếu cần cấp lại mật khẩu. |
| **Phát hiện mâu thuẫn dữ liệu không thể tự hàn gắn** | Dữ liệu sheet xung đột bất thường (ví dụ `StudentUID` trùng với học sinh khác đã tồn tại trước đó) | Đánh dấu batch là `"FAILED"`, từ chối ngay với mã lỗi **`BATCH_CORRUPTED_MANUAL_REVIEW`** để quản trị viên đối chiếu thủ công. |
| **Client gửi lại batchId với payload khác** | `serverFingerprint !== stored.BatchFingerprint` | Từ chối ngay với **`BATCH_PAYLOAD_MISMATCH`**. |
| **Hai giáo viên sử dụng cùng batchId** | `OperatorUID !== session.uid` | Giáo viên thứ hai bị từ chối ngay với **`BATCH_ID_TAKEN`**. |
| **Tài khoản trong batch đã đổi mật khẩu hoặc đã học** | `MustChangePassword === "FALSE"` hoặc đã có bài làm | Khi có yêu cầu `reissueBatchPasswords`, từ chối reset tài khoản đó với **`STUDENT_ALREADY_ACTIVE`**. |

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
   - **Xác minh nguồn gốc lô nạp dựa trên Bằng chứng Máy chủ (Server-Verified Batch Provenance):**
     + Bắt buộc cung cấp `batchId`. Máy chủ tra cứu `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`.
     + Kiểm tra `OperatorUID === session.uid` (hoặc admin).
     + Kiểm tra `ExpiresAt` (trong vòng 24 giờ kể từ thời điểm tạo). Nếu hết hạn $\rightarrow$ Từ chối với **`BATCH_EXPIRED`**.
     + Kiểm tra danh sách `accountIds`: Mọi tài khoản yêu cầu reset bắt buộc phải nằm trong danh sách `AUTH_IMPORT_ITEMS` của lô. Nếu có tài khoản ngoài lô $\rightarrow$ Từ chối với **`ACCOUNT_NOT_IN_BATCH`**.
     + Nếu không tìm thấy thông tin lô trên máy chủ $\rightarrow$ Từ chối với **`BATCH_PROVENANCE_NOT_FOUND`**.
   - **Bảo vệ tài khoản học sinh đang học (Active Student Protection):** Với từng tài khoản, hệ thống kiểm tra cờ `MustChangePassword` và dữ liệu học tập trong `PROGRESS`, `RESPONSES`, `LEARNING_SESSIONS`. Nếu học sinh đã đổi mật khẩu (`MustChangePassword === "FALSE"`) hoặc đã có dữ liệu học tập, hệ thống **LẬP TỨC TỪ CHỐI RESET TÀI KHOẢN NÀY** với mã lỗi `STUDENT_ALREADY_ACTIVE`.
   - **Yêu cầu xác nhận rõ ràng:** Bắt buộc có cờ `confirmBatchReset: true` và lý do `reason: "LOST_RESPONSE_RECOVERY"`.
   - **Cấp lại Mật khẩu Mới Hoàn toàn:**
     1. Sinh ra một **MẬT KHẨU TẠM HOÀN TOÀN MỚI** (8 ký tự ngẫu nhiên).
     2. Sinh chuỗi muối mới và tính toán lại băm PBKDF2 mới.
     3. Cập nhật đè lên `PasswordHash` và `PasswordSalt` trong bảng `USERS`.
     4. Cập nhật `MustChangePassword = "TRUE"`, `FailedAttempts = 0`, `LockedUntil = ""`.
     5. Thu hồi toàn bộ các phiên làm việc cũ nếu có (`revokeAll_`).
     6. Trả về mật khẩu tạm mới qua kết nối HTTPS có bảo vệ.
3. **Kết quả bảo mật:** Mật khẩu tạm cũ bị thất lạc trước đó lập tức trở nên vô hiệu vì mã băm đã bị thay thế hoàn toàn. Quy trình này thiết lập các lớp bảo vệ có thể kiểm chứng được, giảm thiểu rủi ro vận hành và tuân thủ chính sách Zero Cleartext.
4. **Quy trình Chuyển hướng khi Mất Nguồn gốc (Provenance Fallback):**
   - Nếu không chứng minh được nguồn gốc lô (do mất metadata, quá hạn 24 giờ, hoặc sai lệch dữ liệu), hệ thống từ chối chức năng `reissueBatchPasswords` và yêu cầu giáo viên sử dụng quy trình `resetAccountPassword` cho từng tài khoản có kiểm soát và xác nhận riêng biệt.

---

## 5. Mô hình Hóa Mối đe dọa (STRIDE Threat Modeling)

| Mã đe dọa | Danh mục STRIDE | Kịch bản tấn công tiềm ẩn | Biện pháp Phòng vệ trong Thiết kế AUTH-A1 |
|---|---|---|---|
| **T-01** | **Spoofing (Giả mạo)** | Kẻ tấn công gửi yêu cầu tạo/reset tài khoản với `token` giả, tự định danh UID, hoặc giả mạo `batchId` của giáo viên khác | Yêu cầu kiểm tra token qua `requireSession_()` tại backend; băm HMAC-SHA256 với secret `TOKEN_PEPPER` lưu trong Script Properties; toàn bộ UID do máy chủ tự sinh bằng UUID v4; xác minh quyền sở hữu `OperatorUID` đối với `batchId` trong `AUTH_IMPORT_BATCHES`. |
| **T-02** | **Tampering (Can thiệp dữ liệu)** | Kẻ tấn công chèn công thức Google Sheets vào trường `fullName` hoặc `accountId` (`=IMPORTXML(...)`, `=IMAGE(...)`), hoặc sửa đổi payload của một `batchId` cũ | Thực thi bộ lọc Formula Injection: từ chối mọi trường dữ liệu bắt đầu bằng các ký tự công thức (`=`, `+`, `-`, `@`, `\t`, `\r`). Toàn bộ ô lưu trữ trong sheet được định dạng văn bản thô `@` (`setNumberFormat("@")`). Máy chủ tự tính toán SHA-256 payload và đối chiếu `BatchFingerprint` để phát hiện sửa đổi payload (`BATCH_PAYLOAD_MISMATCH`). |
| **T-03** | **Repudiation (Chối bỏ trách nhiệm)** | Người dùng chối bỏ việc thực hiện batch import hoặc reset mật khẩu | **Tách biệt khỏi EVENT_LOG:** Tuyệt đối không ghi sự kiện quản trị vào bảng `EVENT_LOG` học tập. Đề xuất ghi nhật ký có cấu trúc vào bảng độc lập `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`), lưu vết: `Timestamp`, `OperatorUID`, `OperatorRole`, `Action`, `TargetUID`, `TargetUsername`, `TargetRole`, `ClassID`, `SchoolYear`, `Status`, `ErrorCode`, `DetailsJSON`. (Loại bỏ trường IP do hạn chế môi trường Google Apps Script và rủi ro tra cứu Rainbow Table). Tuyệt đối không lưu mật khẩu thô, hash, salt, hoặc token. |
| **T-04** | **Information Disclosure (Lộ lọt thông tin)** | Lộ mật khẩu tạm thời, chuỗi muối hoặc hash băm mật khẩu qua API `listManagedAccounts`, bảng batch metadata, hoặc qua file log | Mật khẩu tạm chỉ xuất hiện **duy nhất một lần** trong phản hồi HTTPS. Không lưu trữ mật khẩu rõ trên Google Sheets (`USERS`, `AUTH_IMPORT_BATCHES`, `AUTH_IMPORT_ITEMS`) hay trả về trong các API truy vấn. Không in mật khẩu ra Logger. |
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
