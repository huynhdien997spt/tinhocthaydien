# ANTIGRAVITY EXECUTION REPORT

> File này do Antigravity cập nhật sau khi hoàn thành đợt rà soát tính nhất quán thiết kế cuối cùng `AUTH-A1-R2: FINAL DESIGN CONSISTENCY REVIEW`.

---

# TASK ID: AUTH-A1-R2
**BRANCH:** `account-management-json-review`  
**BASE COMMIT:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`  
**REVIEWED COMMIT:** `1781b3f`  
**TASK NAME:** Account Management Backend — Standardized JSON Account Import Foundation (Final Design Consistency Review)  
**STATUS:** **`READY_FOR_REVIEW`**

---

## 1. TỔNG QUAN HIỆU CHỈNH THIẾT KẾ R2 (DESIGN SUMMARY)

Đợt hiệu chỉnh thiết kế `AUTH-A1-R2` giải quyết dứt điểm 6 phát hiện kiến trúc từ Project Controller, bảo đảm tính nhất quán tuyệt đối giữa tài liệu thiết kế và mã nguồn nền tảng:

### R2-01: Tính Nhất quán Danh sách Lớp qua Bảng ENROLLMENTS (Enrollment Consistency)
1. **Rà soát mã nguồn nền tảng:** Đã nghiên cứu kỹ `backend/StudentV2.gs` và `backend/Teacher.gs`, đặc biệt cấu trúc `V2_HEADERS.ENROLLMENTS` và hàm `buildRosters_()`.
2. **Nguy cơ Người dùng Mồ côi (Orphan User):** Trong `Teacher.gs`, hàm `buildRosters_()` xây dựng danh sách học sinh thuộc lớp dựa trên bảng `ENROLLMENTS`. Nếu tài khoản học sinh chỉ được ghi vào bảng `USERS` mà không có bản ghi trong `ENROLLMENTS`, học sinh đó sẽ **hoàn toàn vô hình trên Bảng điều khiển Giáo viên**, không thể nhận phân công bài học hay theo dõi tiến độ.
3. **Thiết kế Đồng bộ Bắt buộc:** Khi tạo tài khoản có `role = "student"` (qua `createAccount` hoặc `importAccountsBatch`), hệ thống bắt buộc tạo đồng thời bản ghi trong cả `USERS` và `ENROLLMENTS`.
4. **Đồng nhất dữ liệu đa trường:** `StudentUID`, `SchoolYear`, `ClassID`, `Grade`, và `SchoolLevel` giữa `USERS` và `ENROLLMENTS` phải hoàn toàn nhất quán.
5. **Cơ chế Tự Hàn gắn (Self-Healing):** Nếu quá trình ghi bị ngắt quãng khiến `USERS` đã ghi nhưng `ENROLLMENTS` chưa ghi (`PARTIAL_WRITE_ORPHAN`), khi gửi lại cùng lô (Replay) hoặc chạy tác vụ đối chiếu, hệ thống tự động phát hiện và bổ sung dòng `ENROLLMENTS` bị thiếu mà không tạo mới tài khoản hay đổi mật khẩu.
6. **Bảo tồn cấu trúc:** Giữ nguyên 100% cấu trúc 11 cột hiện có của bảng `ENROLLMENTS` (`EnrollmentID`, `StudentUID`, `SchoolYear`, `SchoolLevel`, `Grade`, `ClassID`, `Active`, `StartDate`, `EndDate`, `CreatedAt`, `UpdatedAt`).

---

### R2-02: Tách biệt Tuyệt đối Nhật ký Kiểm toán Xác thực (Authentication Audit Log)
1. **Ranh giới Viễn trắc Học tập:** Bảng `EVENT_LOG` hiện hành (`V2_HEADERS.EVENT_LOG`) là hạ tầng dữ liệu học tập của học sinh. Hàm `timeline_()` trong `Teacher.gs` sử dụng `EVENT_LOG` để dựng dòng thời gian học tập (nộp bài, Exit Ticket).
2. **Cấm ô nhiễm dữ liệu:** Tuyệt đối **KHÔNG đưa các sự kiện quản trị tài khoản vào bảng `EVENT_LOG`**.
3. **Đề xuất Cơ chế Audit Riêng biệt (`AUTH_AUDIT`):** Thiết lập bảng độc lập `AUTH_AUDIT` với hợp đồng dữ liệu tách rời.
4. **Cấu trúc trường chuẩn hóa:** `["AuditID", "Timestamp", "OperatorUID", "OperatorRole", "Action", "TargetUID", "TargetUsername", "TargetRole", "ClassID", "SchoolYear", "Status", "ErrorCode", "DetailsJSON", "ClientIP_MD5"]`.
5. **Chính sách Zero Secret Persistence:** Tuyệt đối không lưu mật khẩu thô, mật khẩu tạm, password hash, password salt, session token hay token hash trong nhật ký kiểm toán.
6. **Trạng thái:** Đánh dấu việc tạo sheet mới là **`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`** (chưa tạo sheet trên production, cần phê duyệt riêng).

---

### R2-03: Phân định Idempotency Thực sự và An toàn Xung đột (True Idempotency & Collision Safety)
1. **Bãi bỏ giả định sai lầm:** Không mặc nhiên xem mọi `Username` đã tồn tại trong `USERS` là kết quả của việc nạp lại thành công một lô dữ liệu.
2. **Phân định Genuine Batch Replay vs Existing-Account Collision:**
   - **Genuine Batch Replay:** Dựa trên cặp nhận diện `batchId` (UUID client) và `batchFingerprint` (SHA-256 của payload chuẩn hóa). Nếu thông tin tài khoản khớp hoàn toàn với lô vừa xử lý, gắn nhãn `status: "replayed"`. Nếu thiếu `ENROLLMENTS`, thực hiện tự hàn gắn (`status: "replayed_and_healed"`).
   - **Existing-Account Collision:** Nếu `Username` đã tồn tại nhưng thuộc về lô khác, hoặc họ tên/lớp không khớp: **TUYỆT ĐỐI KHÔNG gán nhãn `skipped_existing` hay báo thành công ngầm**. Bắt buộc từ chối với lỗi rõ ràng: **`COLLISION_EXISTING_ACCOUNT`**, ngăn chặn việc tệp mới nhận nhầm tài khoản cũ là vừa tạo mới.
3. **Thẩm định lại trong phạm vi khóa ghi (`withLock_`):** Mọi kiểm tra xung đột tài khoản và kiểm tra phân công lớp của giáo viên (`assignedSet_`) phải được thực hiện lại bên trong `withLock_`, triệt tiêu rủi ro tranh chấp tương tranh TOCTOU.

---

### R2-04: An toàn Cấp lại Mật khẩu Hàng loạt (Password Re-Issuance Safety)
1. **Không reset theo `classId`:** Cấm tuyệt đối việc gọi `reissueBatchPasswords` chỉ với tham số `classId` để quét toàn bộ lớp, tránh xóa nhầm mật khẩu của học sinh đã học ổn định.
2. **Xác minh nguồn gốc lô nạp (Batch Provenance):** Bắt buộc cung cấp `batchId`, `batchFingerprint` và danh sách `accountIds` khớp với lô nạp vừa tạo trong cửa sổ an toàn (24 giờ). Nếu không chứng minh được nguồn gốc, từ chối với lỗi `BATCH_PROVENANCE_UNVERIFIED`.
3. **Bảo vệ học sinh đang học (Active Student Protection):** Với từng tài khoản, hệ thống kiểm tra cờ `MustChangePassword` và lịch sử học tập trong `PROGRESS`, `RESPONSES`, `LEARNING_SESSIONS`. Nếu học sinh đã đổi mật khẩu (`MustChangePassword === "FALSE"`) hoặc đã có bài làm, **MÁY CHỦ BẮT BUỘC TỪ CHỐI RESET TÀI KHOẢN NÀY** với mã lỗi `STUDENT_ALREADY_ACTIVE`.
4. **Yêu cầu xác nhận rõ ràng:** Bắt buộc có cờ `confirmBatchReset: true` và lý do `reason: "LOST_RESPONSE_RECOVERY"`.
5. **Cấp lại Mật khẩu Mới Hoàn toàn (Zero Cleartext):** Luôn sinh mật khẩu tạm mới, muối mới, băm PBKDF2 mới và thu hồi toàn bộ session cũ. Không bao giờ lưu hay trả lại mật khẩu cũ.
6. **Chuyển hướng kiểm soát:** Nếu không đủ điều kiện reset hàng loạt, hệ thống yêu cầu giáo viên chuyển sang quy trình `resetAccountPassword` cho từng tài khoản với sự xác nhận thủ công.

---

### R2-05: Rà soát An ninh Mật khẩu PBKDF2 (Password Security Review)
1. **Phân định bản chất:** Ghi rõ cấu hình `pbkdf2Iterations: 1000` là **`LEGACY BASELINE`** từ mã nguồn ban đầu của dự án, **KHÔNG PHẢI là một tiêu chuẩn an ninh mới được phê duyệt**.
2. **Ranh giới bảo vệ chiều sâu:** Làm rõ rằng Account Lockout và Token Pepper chỉ phòng vệ tấn công trực tuyến (Online Brute-force) và đánh cắp phiên (Session Hijacking), **tuyệt đối không thể thay thế độ mạnh của password hashing** trong trường hợp rò rỉ cơ sở dữ liệu (Offline Cracking).
3. **Chuẩn hóa thông số:** Loại bỏ khẳng định thời gian băm 50–150ms là kết quả đã kiểm chứng; chuyển thành thông số lý thuyết cần đo lường benchmark thực tế trên live Apps Script (`NOT_YET_VERIFIED`).
4. **Đề xuất phương án nâng cấp tương thích ngược (chưa triển khai):**
   - *Phương án 1:* Lazy Migration on Login (nâng dần số vòng lặp khi người dùng đăng nhập bằng mật khẩu đúng).
   - *Phương án 2:* Offloaded Crypto Microservice (chuyển tác vụ băm sang Cloud Functions hỗ trợ native crypto).
5. **Trạng thái Chấp nhận Rủi ro:** Quyết định duy trì baseline 1.000 iterations được gắn nhãn chính thức: **`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`**.

---

### R2-06: Chuẩn hóa Schema và Nhất quán Thương hiệu (Schema & Branding)
1. **Sửa lỗi ví dụ JSON:** Đã loại bỏ `$schema` khỏi toàn bộ các ví dụ payload JSON để đáp ứng tuyệt đối ràng buộc `additionalProperties: false` của schema `AccountImportSchemaV1`.
2. **Thẩm định chéo ví dụ:** Toàn bộ các ví dụ JSON trong tài liệu đặc tả và API contract đều hợp lệ 100% theo JSON Schema v1.0.
3. **Thống nhất tên thương hiệu chính xác:** **Tin học Thầy Diễn**. Đã loại bỏ hoàn toàn mọi biến thể không chính xác (như "Tin học cùng Thầy Diễn").

---

## 2. BẢO TOÀN KIẾN TRÚC VÀ TÍNH TƯƠNG THÍCH NGƯỢC

1. **Khóa chính dữ liệu học tập bất biến:** `StudentUID` là khóa chính duy nhất liên kết với toàn bộ dữ liệu học tập (`PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `LEARNING_SESSIONS`, `EVENT_LOG`).
2. **Cấu trúc bảng Google Sheets:** Giữ nguyên 100% cấu trúc hiện hành của 8 bảng cốt lõi:
   - `USERS` (18 cột theo `USERS_HEADERS` tại `Code.gs:21-22`).
   - `SESSIONS` (8 cột theo `SESSIONS_HEADERS` tại `Code.gs:23`).
   - `ENROLLMENTS` (11 cột theo `V2_HEADERS.ENROLLMENTS` tại `StudentV2.gs:45`).
   - `TEACHER_ASSIGNMENTS` (7 cột theo `ASSIGNMENTS_HEADERS` tại `Teacher.gs:26`).
   - `PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `EVENT_LOG`.
3. **Không phá vỡ Phase trước:** 100% Data Contract Phase 2 (12 schemas, 38 YCCĐ) và Golden Lesson G6-L03 được bảo toàn nguyên vẹn.

---

## 3. KẾ HOẠCH KIỂM THỬ VÀ 35 ACCEPTANCE TEST VECTORS

Đặc tả chi tiết tại [account-test-plan.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-test-plan.md) (`DESIGN_PROPOSAL / NOT_YET_VERIFIED`).

Toàn bộ 35 Test Vectors đều được gắn nhãn **`DESIGN_PROPOSAL / NOT_YET_VERIFIED`** (tuyệt đối không báo PASS cho kiểm thử chưa chạy live):

| Nhóm kiểm thử | Dải Vector | Nội dung trọng tâm |
|---|---|---|
| **Nhóm 1: Schema & Cú pháp JSON** | Vector 01–10 | JSON hợp lệ, bắt lỗi cú pháp, thiếu trường, sai schemaVersion, trùng trong batch, lệch cấp-khối, sai năm học. |
| **Nhóm 2: Phân quyền RBAC** | Vector 11–15 | Phân quyền giáo viên đúng lớp, chặn tạo ngoài lớp, chặn tạo admin, chặn học sinh gọi quản trị, xác nhận quyền admin. |
| **Nhóm 3: Vòng đời Mật khẩu & Phiên** | Vector 16–19, 26 | Reset học sinh đúng lớp, chặn reset ngoài lớp, mật khẩu trả 1 lần, thu hồi session cũ, xử lý phản hồi thất lạc & cấp lại an toàn. |
| **Nhóm 4: Nhập Lô & Idempotency** | Vector 20–22 | Nhập lặp lại cùng tệp, ScriptLock khi đồng thời, phục hồi gián đoạn giữa chừng. |
| **Nhóm 5: Tương thích & PBKDF2** | Vector 23–25, 27 | Đăng nhập tài khoản cũ (zero regression), dữ liệu học tập liên kết đúng StudentUID, không rò rỉ secret, rà soát legacy baseline PBKDF2. |
| **Nhóm 6: Nhất quán Roster & Phòng vệ Nâng cao (Mới R2)** | Vector 28–35 | **Vector 28:** Phát hiện người dùng mồ côi & tự hàn gắn ENROLLMENTS.<br>**Vector 29:** Nhập lại cùng batch hợp lệ (Genuine Replay).<br>**Vector 30:** Từ chối xung đột tài khoản cũ (Collision Rejection).<br>**Vector 31:** Hai giáo viên nhập đồng thời với ScriptLock.<br>**Vector 32:** Phòng vệ TOCTOU khi phân công bị thu hồi trước khi ghi.<br>**Vector 33:** Chặn reset hàng loạt nhầm tài khoản học sinh đã đổi mật khẩu/đang học.<br>**Vector 34:** Tự thẩm định JSON Schema đối với ví dụ trong tài liệu.<br>**Vector 35:** Cách ly tuyệt đối kiểm toán quản trị khỏi EVENT_LOG học tập. |

---

## 4. DANH MỤC CÁC TỆP ĐÃ HIỆU CHỈNH (FILES CHANGED)

Chỉ chỉnh sửa các tệp tài liệu trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`:
1. [`docs/auth/account-import-schema-v1.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-import-schema-v1.md):
   - Chuẩn hóa tên thương hiệu **Tin học Thầy Diễn**.
   - Bỏ `$schema` khỏi Canonical Example.
   - Bổ sung Mục 7.2: Phân định True Idempotency vs Collision Safety.
   - Bổ sung Mục 7.3: Ánh xạ đồng bộ `ENROLLMENTS` và cơ chế tự hàn gắn `PARTIAL_WRITE_ORPHAN`.
   - Bổ sung Mục 7.4: Tách biệt nhật ký xác thực khỏi `EVENT_LOG`.
2. [`docs/auth/account-api-contract-v1.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-api-contract-v1.md):
   - Mở rộng Danh mục mã lỗi: `COLLISION_EXISTING_ACCOUNT`, `STUDENT_ALREADY_ACTIVE`, `BATCH_PROVENANCE_UNVERIFIED`, `ASSIGNMENT_REVOKED`.
   - Cập nhật `createAccount`: tạo đồng bộ `ENROLLMENTS` và trả `enrollmentId`.
   - Cập nhật `importAccountsBatch`: kiểm tra `assignedSet_` và collision inside `withLock_`, hỗ trợ tự hàn gắn `ENROLLMENTS`.
   - Cập nhật `reissueBatchPasswords`: áp dụng đủ 6 quy tắc an toàn (bảo vệ học sinh đang học, không reset theo classId, xác minh batch provenance, Zero Cleartext).
   - Bổ sung Mục 3.7: Hợp đồng dữ liệu kiểm toán độc lập `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`).
3. [`docs/auth/account-security-review.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-security-review.md):
   - Xác định PBKDF2 1000 vòng lặp là `LEGACY BASELINE`.
   - Loại bỏ khẳng định 50–150ms đã kiểm chứng; ghi nhận trạng thái `SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`.
   - Phân tích ranh giới an ninh: Account Lockout / Token Pepper không thay thế được độ mạnh của password hash trước offline cracking.
   - Đề xuất phương án nâng cấp tương thích ngược (Lazy Migration on Login).
   - Cập nhật STRIDE T-03: Chuyển nhật ký quản trị sang `AUTH_AUDIT`, cấm ghi vào `EVENT_LOG`.
4. [`docs/auth/account-test-plan.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-test-plan.md):
   - Cập nhật Test Vector 27 theo chuẩn Legacy Baseline.
   - Bổ sung Nhóm 6 và 8 Acceptance Test Vectors mới (Vectors 28–35).
   - Bảo toàn 100% các Test Vectors 01–27 cũ.
5. [`agent/AGENT_REPORT.md`](file:///Users/huynhvandien/tinhocthaydien/agent/AGENT_REPORT.md):
   - Báo cáo Nghiệm thu Hiệu chỉnh Thiết kế Toàn diện R2.

*(Cam kết: 0% sửa đổi mã nguồn ứng dụng hay backend production trong vòng thiết kế này).*

---

## 5. CÁC QUYẾT ĐỊNH CHỜ CẤP CÓ THẨM QUYỀN PHÊ DUYỆT (PENDING APPROVAL DECISIONS)

1. **Phê duyệt Bảng Kiểm toán Mới `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`):**
   - Phê duyệt cấu trúc 14 cột của bảng `AUTH_AUDIT` để ghi nhận sự kiện quản trị tài khoản, bảo vệ tính toàn vẹn của bảng học tập `EVENT_LOG`.
2. **Chấp thuận Rủi ro Bảo mật PBKDF2 1.000 Vòng lặp (`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`):**
   - Phê duyệt việc duy trì tạm thời mức `pbkdf2Iterations: 1000` trên Google Apps Script trong giai đoạn này, kèm lộ trình nâng cấp Lazy Migration on Login khi có điều kiện kỹ thuật.
3. **Phê duyệt Quy trình Cấp lại Mật khẩu Mới An toàn:**
   - Phê duyệt nguyên tắc không lưu trữ mật khẩu rõ và chỉ cho phép cấp lại mật khẩu tạm mới thông qua `reissueBatchPasswords` có xác minh nguồn gốc lô và bảo vệ học sinh đang học.
4. **Phê duyệt Đồng bộ Danh sách `ENROLLMENTS`:**
   - Phê duyệt cơ chế tự động tạo bản ghi `ENROLLMENTS` đồng thời với `USERS` và quy trình tự hàn gắn `PARTIAL_WRITE_ORPHAN`.

---

# FINAL STATUS: READY_FOR_REVIEW

> Toàn bộ các yêu cầu hiệu chỉnh thiết kế của **`AUTH-A1-R2`** đã được thực hiện nghiêm ngặt, chuẩn hóa đầy đủ trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`.  
> Hệ thống tuân thủ triệt để nguyên tắc an toàn: **DỪNG LẠI và CHỜ PHÊ DUYỆT (STOP)**. Tuyệt đối không tự ý bắt đầu triển khai mã nguồn backend `AUTH-A1` hay task giao diện `AUTH-A2`.
