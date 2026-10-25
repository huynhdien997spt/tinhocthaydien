# ANTIGRAVITY EXECUTION REPORT

> File này do Antigravity cập nhật sau khi hoàn thành đợt rà soát tính bền vững nguồn gốc lô `AUTH-A1-R3: BATCH PROVENANCE PERSISTENCE REVIEW`.

---

# TASK ID: AUTH-A1-R3
**BRANCH:** `account-management-json-review`  
**BASE COMMIT:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`  
**REVIEWED COMMIT:** `ad61898`  
**TASK NAME:** Account Management Backend — Batch Provenance Persistence Review  
**STATUS:** **`READY_FOR_REVIEW`**

---

## 1. TỔNG QUAN HIỆU CHỈNH THIẾT KẾ R3 (DESIGN SUMMARY)

Đợt hiệu chỉnh thiết kế `AUTH-A1-R3` giải quyết triệt để vấn đề chứng cứ nguồn gốc lô nhập dữ liệu và hoàn thiện tính nhất quán phục hồi theo 4 yêu cầu trọng tâm:

### R3-01: Lưu trữ Bền vững Nguồn gốc Lô (Durable Batch Provenance)
1. **Xác định Vấn đề Kiến trúc:** Bảng `USERS` (18 cột) và `ENROLLMENTS` (11 cột) hiện hữu **không lưu trữ `batchId` hay `batchFingerprint`**. Do đó, nếu chỉ dựa vào tham số do client gửi lên mà không có dữ liệu đối chiếu bền vững trên máy chủ, hệ thống không thể xác minh một tài khoản có thực sự thuộc về lô nạp trước đó hay không.
2. **Cơ chế Lưu trữ Nguồn gốc Bền vững Đề xuất:** Hệ thống thiết lập 2 bảng metadata độc lập (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):
   - **Bảng `AUTH_IMPORT_BATCHES` (Metadata cấp lô - 12 cột):**
     `["BatchID", "BatchFingerprint", "OperatorUID", "OperatorRole", "SchoolYear", "ClassID", "TotalAccounts", "CreatedCount", "ReplayedCount", "Status", "CreatedAt", "ExpiresAt"]`
   - **Bảng `AUTH_IMPORT_ITEMS` (Chi tiết từng tài khoản trong lô - 7 cột):**
     `["ItemID", "BatchID", "StudentUID", "AccountId", "Username", "ItemStatus", "CreatedAt"]`
3. **Chính sách Zero Secret Persistence trong Metadata:** Tuyệt đối không lưu mật khẩu thô, mật khẩu tạm, password hash, salt hay token trong 2 bảng metadata này.
4. **Chuẩn hóa Chuẩn tắc (Canonical JSON Normalization) & Băm Độc quyền tại Máy chủ:**
   - Máy chủ **bỏ qua hoàn toàn và không tin cậy giá trị hash do client gửi lên**.
   - Máy chủ tự thực hiện chuẩn hóa:
     + Sắp xếp khóa cấp root theo thứ tự chữ cái: `["accounts", "importMode", "schoolYear", "schemaVersion"]`.
     + Sắp xếp khóa từng object tài khoản: `["accountId", "classId", "fullName", "grade", "role", "schoolLevel"]`.
     + Sắp xếp mảng `accounts` theo thứ tự chữ hoa tăng dần của `accountId.toUpperCase()` để đảm bảo tính tất định.
     + Trim khoảng trắng thừa, tuần tự hóa thu gọn (compact, không khoảng trắng dư).
     + Tính toán SHA-256 trên chuỗi byte UTF-8 $\rightarrow$ sinh ra chuỗi hex 64 ký tự chữ thường (`serverFingerprint`).
5. **Chống Giả mạo & Chiếm đoạt BatchId (Anti-Spoofing):**
   - Khi nhận `batchId` đã có trong `AUTH_IMPORT_BATCHES`:
     + Nếu `stored.OperatorUID !== session.uid` $\rightarrow$ Từ chối ngay với **`BATCH_ID_TAKEN`**.
     + Nếu `stored.BatchFingerprint !== serverFingerprint` $\rightarrow$ Từ chối ngay với **`BATCH_PAYLOAD_MISMATCH`**.
     + Chỉ khi cả hai khớp hoàn toàn mới xác nhận là Genuine Batch Replay.

---

### R3-02: Tính Nhất quán Phục hồi Sự cố (Recovery Consistency)
Hệ thống thiết lập ma trận xử lý dứt điểm cho toàn bộ các kịch bản gián đoạn:
1. **USERS đã ghi, ENROLLMENTS chưa ghi (`PARTIAL_WRITE_ORPHAN`):** Khi gửi lại cùng batch, hệ thống tự động phát hiện tài khoản mồ côi và chèn bổ sung dòng `ENROLLMENTS` tương ứng (`status: "replayed_and_healed"`).
2. **USERS & ENROLLMENTS đã ghi, nhưng batch metadata chưa hoàn tất (`PARTIAL_WRITE_UNPROVENANCED_BATCH`):** Khi gửi lại cùng `batchId` và payload, máy chủ đối chiếu nếu các tài khoản trong payload trùng khớp hoàn toàn với bản ghi vừa tạo trong 15 phút bởi chính phiên đó, máy chủ hoàn tất việc ghi metadata vào `AUTH_IMPORT_BATCHES` / `AUTH_IMPORT_ITEMS` (`status: "replayed_and_provenanced"`). Nếu không chứng minh được, từ chối với `COLLISION_EXISTING_ACCOUNT`.
3. **Mạng ngắt sau khi commit hoàn tất:** Khi gửi lại, máy chủ nhận diện Genuine Replay, trả về danh sách tài khoản kèm `temporaryPassword: null` và `passwordReissueAvailable: true` (tuân thủ Zero Cleartext).
4. **Client gửi lại `batchId` với payload khác:** Bị từ chối ngay lập tức với mã lỗi `BATCH_PAYLOAD_MISMATCH`.
5. **Hai giáo viên sử dụng trùng `batchId`:** Giáo viên thứ hai chiếm lock sau sẽ bị từ chối với mã lỗi `BATCH_ID_TAKEN`.
6. **Tài khoản trong batch đã đổi mật khẩu hoặc đã học:** Khi gọi `reissueBatchPasswords`, hệ thống kiểm tra `MustChangePassword === "FALSE"` hoặc có dữ liệu trong `PROGRESS`, `RESPONSES` $\rightarrow$ Từ chối reset với mã lỗi `STUDENT_ALREADY_ACTIVE`.
7. **Quy tắc An toàn Nguồn gốc:** Tuyệt đối không tự nhận một tài khoản cũ là tài khoản thuộc batch nếu thiếu bằng chứng máy chủ tin cậy. Nếu không chứng minh được nguồn gốc lô, từ chối chức năng `reissueBatchPasswords` (báo lỗi `BATCH_PROVENANCE_NOT_FOUND`) và chuyển sang quy trình `resetAccountPassword` từng tài khoản có kiểm soát.

---

### R3-03: Dọn dẹp An ninh và Nhật ký Kiểm toán (Security and Audit Cleanup)
1. **Rà soát & Loại bỏ `ClientIP_MD5` khỏi `AUTH_AUDIT`:**
   - *Hạn chế môi trường Apps Script:* Google Apps Script Web App chạy sau hạ tầng Edge Proxy của Google; đối tượng `doPost(e)` **không cung cấp địa chỉ IP nguồn của client** (không có `e.clientIp` hay `X-Forwarded-For`).
   - *Rủi ro mã hóa của MD5:* Không gian địa chỉ IPv4 chỉ gồm $2^{32} \approx 4.29 \times 10^9$ giá trị, dễ dàng bị dịch ngược bằng bảng cầu vồng (Rainbow Table).
   - *Quyết định:* Chính thức **LOẠI BỎ trường `ClientIP_MD5`** khỏi bảng `AUTH_AUDIT` (chuẩn hóa còn 13 cột) để phản ánh đúng thực tế kỹ thuật và tránh ảo tưởng bảo mật.
2. **Cách ly Kiểm toán Quản trị:** Khẳng định 100% không đưa bất kỳ sự kiện quản trị nào vào bảng dữ liệu học tập `EVENT_LOG`.
3. **Duy trì Trạng thái An ninh PBKDF2:** Giữ nguyên quyết định duy trì baseline 1.000 iterations ở trạng thái: **`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`**.
4. **Chuẩn hóa Ngôn ngữ Kỹ thuật:** Đã rà soát và loại bỏ toàn bộ các tuyên bố chủ quan ("bảo mật tuyệt đối", "tương thích 100% khi chưa kiểm thử"), thay bằng ngôn ngữ kỹ thuật chuẩn xác, có điều kiện và gắn nhãn `DESIGN_PROPOSAL / NOT_YET_VERIFIED`.

---

### R3-04: Kế hoạch Kiểm thử Mở rộng (Acceptance Test Suite)
Đã bổ sung Nhóm 7 gồm 9 Test Vectors chuyên sâu về Provenance và Recovery (Vectors 36–44), nâng tổng số lên **44 Acceptance Test Vectors**:
- **Vector 36:** Phát hiện và từ chối `batchId` giả mạo (`BATCH_PROVENANCE_NOT_FOUND` / `COLLISION_EXISTING_ACCOUNT`).
- **Vector 37:** Cùng `batchId` nhưng payload bị sửa đổi $\rightarrow$ Từ chối với `BATCH_PAYLOAD_MISMATCH`.
- **Vector 38:** Cùng payload nhưng `batchId` khác $\rightarrow$ Báo lỗi `COLLISION_EXISTING_ACCOUNT` cho tài khoản đã có.
- **Vector 39:** Xử lý sự cố metadata gián đoạn & kiểm soát phục hồi (`PARTIAL_WRITE_UNPROVENANCED_BATCH`).
- **Vector 40:** Từ chối reset khi không tồn tại batch provenance (`BATCH_PROVENANCE_NOT_FOUND`).
- **Vector 41:** Từ chối reset khi học sinh đã đổi mật khẩu hoặc đã có bài làm (`STUDENT_ALREADY_ACTIVE`).
- **Vector 42:** Từ chối reset khi lô đã quá hạn phục hồi 24 giờ (`BATCH_EXPIRED`).
- **Vector 43:** Băm SHA-256 được tính toán độc lập tại máy chủ (bỏ qua hash của client).
- **Vector 44:** Xác minh không lưu mật khẩu thô trong batch metadata (`AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`).

*(Toàn bộ 44 Test Vectors đều được gắn nhãn `DESIGN_PROPOSAL / NOT_YET_VERIFIED`).*

---

## 2. DANH MỤC CÁC TỆP ĐÃ HIỆU CHỈNH TRÊN NHÁNH REVIEW

Chỉ chỉnh sửa các tệp tài liệu trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`:
1. [`docs/auth/account-import-schema-v1.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-import-schema-v1.md):
   - Bổ sung đặc tả bảng `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS` tại Mục 7.2.
   - Bổ sung quy tắc Canonical JSON Normalization và tính băm SHA-256 độc quyền tại máy chủ.
   - Bổ sung cơ chế chống giả mạo `batchId` và ma trận phân định Replay vs Collision.
2. [`docs/auth/account-api-contract-v1.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-api-contract-v1.md):
   - Mở rộng Danh mục mã lỗi: `BATCH_PAYLOAD_MISMATCH`, `BATCH_ID_TAKEN`, `BATCH_PROVENANCE_NOT_FOUND`, `BATCH_EXPIRED`, `ACCOUNT_NOT_IN_BATCH`.
   - Cập nhật `importAccountsBatch`: quy trình tính băm máy chủ, xác minh quyền sở hữu `batchId`, ghi 4 bảng tuần tự trong lock.
   - Cập nhật `reissueBatchPasswords`: quy trình tra cứu chứng cứ máy chủ, kiểm tra hạn 24h, bảo vệ học sinh đang học.
   - Cập nhật Mục 3.7: Loại bỏ `ClientIP_MD5` khỏi `AUTH_AUDIT` (chuẩn hóa 13 cột), ghi rõ lý do kỹ thuật.
3. [`docs/auth/account-security-review.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-security-review.md):
   - Bổ sung phân tích an ninh Durable Batch Provenance.
   - Bổ sung Ma trận Tính Nhất quán Phục hồi Sự cố (Recovery Consistency Matrix - 6 kịch bản).
   - Cập nhật STRIDE T-01, T-02, T-03: loại bỏ IP, phòng vệ payload forgery và batch hijacking.
   - Loại bỏ các tuyên bố tuyệt đối hóa an ninh.
4. [`docs/auth/account-test-plan.md`](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-test-plan.md):
   - Bổ sung Nhóm 7 gồm 9 Test Vectors mới (Vectors 36–44).
   - Nâng tổng số test vectors lên 44 vectors.
5. [`agent/AGENT_REPORT.md`](file:///Users/huynhvandien/tinhocthaydien/agent/AGENT_REPORT.md):
   - Báo cáo Nghiệm thu Hiệu chỉnh Thiết kế Toàn diện R3.

---

## 3. CÁC QUYẾT ĐỊNH CHỜ CẤP CÓ THẨM QUYỀN PHÊ DUYỆT (PENDING APPROVAL DECISIONS)

1. **Phê duyệt 2 Bảng Metadata Nguồn gốc Lô (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):**
   - Phê duyệt cấu trúc 12 cột của `AUTH_IMPORT_BATCHES` và 7 cột của `AUTH_IMPORT_ITEMS`.
2. **Phê duyệt Bảng Kiểm toán Mới `AUTH_AUDIT` 13 Cột (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):**
   - Phê duyệt cấu trúc bảng audit không chứa trường IP để phản ánh đúng thực tế kỹ thuật của Google Apps Script.
3. **Chấp thuận Rủi ro Bảo mật PBKDF2 1.000 Vòng lặp (`SECURITY_RISK_ACCEPTED: PENDING_HUMAN_APPROVAL`):**
   - Phê duyệt việc duy trì tạm thời mức `pbkdf2Iterations: 1000` trên Google Apps Script, kèm lộ trình nâng cấp tương thích ngược khi có điều kiện.
4. **Phê duyệt Quy trình Cấp lại Mật khẩu Mới dựa trên Bằng chứng Máy chủ:**
   - Phê duyệt quy trình xác minh qua `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`, bảo vệ học sinh đang học và thời hạn phục hồi 24 giờ.

---

# FINAL STATUS: READY_FOR_REVIEW

> Toàn bộ các yêu cầu hiệu chỉnh thiết kế của **`AUTH-A1-R3`** đã được thực hiện nghiêm ngặt, chuẩn hóa đầy đủ trong thư mục `docs/auth/` và `agent/AGENT_REPORT.md`.  
> Hệ thống tuân thủ triệt để nguyên tắc an toàn: **DỪNG LẠI và CHỜ PHÊ DUYỆT (STOP)**. Tuyệt đối không tự ý bắt đầu triển khai mã nguồn backend `AUTH-A1` hay task giao diện `AUTH-A2`.
