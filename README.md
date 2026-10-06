# TIN HỌC CÙNG THẦY DIỄN – V1 → V1.1 → V2 → V3 (bản 3.0.0-rc.1)

> Từ V1.1 mỗi học sinh có **tài khoản + mật khẩu riêng**. Việc chọn tên không còn là cách xác thực.
> Phần xác thực chạy ở **Google Apps Script** (thư mục `backend/`), website trên GitHub Pages chỉ gửi tài khoản/mật khẩu qua HTTPS.

## A. Tài khoản học sinh hoạt động như thế nào?
1. Học sinh vào web → **Đăng nhập** (tài khoản = StudentID, ví dụ `6A1-01`; mật khẩu tạm do giáo viên cấp).
2. Lần đầu bắt buộc **tạo mật khẩu mới**. Sau đó vào "Không gian học tập của em".
3. Backend kiểm tra mật khẩu, trả về một **mã phiên (token)** có hạn 8 giờ. Trình duyệt lưu token + hồ sơ hiển thị trong localStorage. Mật khẩu **không bao giờ** được lưu ở trình duyệt.
4. Mọi lần lưu dữ liệu, backend tự biết học sinh là ai **từ token** và bỏ qua mọi `studentUid` do trình duyệt gửi. Sửa localStorage không giúp ghi vào tài khoản người khác.
5. Máy phòng Tin học (`sharedDeviceMode`): nút **Đăng xuất** luôn hiện ở thanh trên; đăng xuất xóa sạch dữ liệu cục bộ; 30 phút không thao tác tự đăng xuất.

Mỗi học sinh có `StudentUID` bất biến (dạng `stu_...`) – khóa chính dài hạn. `StudentID`/`Username` có thể đổi, lớp/năm học có thể đổi mà lịch sử học vẫn giữ.

## B. Cài đặt backend (làm một lần, khoảng 10 phút)
### B1. Deploy Code.gs / kết nối Spreadsheet
1. Tạo một **Google Sheet mới** (đặt tên "Tin học – Tài khoản"). **Không chia sẻ** cho học sinh.
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**. Xóa code mẫu, dán toàn bộ `backend/Code.gs`.
3. (Tùy chọn) **Cài đặt dự án → Hiển thị tệp kê khai appsscript.json** rồi dán nội dung `backend/appsscript.json`.
4. Script gắn trong Sheet nên tự kết nối Spreadsheet đó. Nếu dùng script độc lập: **Cài đặt dự án → Thuộc tính tập lệnh**, thêm `SPREADSHEET_ID` = ID của Sheet.
5. **Triển khai → Triển khai mới → Ứng dụng web**: *Thực thi bằng*: **Tôi**; *Quyền truy cập*: **Bất kỳ ai**. Bấm Triển khai, cấp quyền, **sao chép URL (đuôi `/exec`)**.
6. Dán URL vào `assets/js/config.js` → `googleScriptUrl`. Mỗi lần sửa Code.gs phải **Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản mới**.

### B2. Chạy setupAuth()
Trong trình soạn thảo Apps Script chọn hàm `setupAuth` → **Chạy** (hoặc mở lại Sheet, dùng menu **Tin học – Tài khoản**). Hàm tạo các sheet `USERS`, `SESSIONS`, `IMPORT` cùng tiêu đề và khóa bí mật phiên. Sheet `PROGRESS` do `setupV2()` quản lý. Chạy lại bao nhiêu lần cũng an toàn, không xóa dữ liệu, không tạo sheet trùng.
Chạy thêm `benchmarkHash()` để biết 1 lần băm mất bao lâu (xem mục "Giới hạn kỹ thuật").

### B3. Import account
1. Mở web `tools/export-students.html` (xem trang này qua GitHub Pages hoặc Live Server) → **Tạo bảng** → **Sao chép**. Dán vào sheet `IMPORT` từ ô A2 (7 cột đầu; cột `Imported` để trống).
   Hoặc tự nhập: `StudentID, FullName, ClassID, Grade, SchoolLevel, SchoolYear, Role` (Role: `student`, `teacher`, `admin`; để trống = student).
2. **Tài khoản giáo viên**: thêm một dòng với `Role = teacher` (hoặc `admin`), ví dụ `GV-01 | Huỳnh Văn Diễn | | | | | teacher`.
3. Chạy `importUsers()`. Hệ thống tạo StudentUID, username (= StudentID), mật khẩu tạm, băm rồi lưu, đặt `MustChangePassword = TRUE`. Chạy lại không tạo trùng; nếu danh sách dài (> vài trăm), hàm tự dừng trước giới hạn 6 phút – chạy lại để làm tiếp.

### B4. Cấp password ban đầu
Danh sách `StudentID | Username | TemporaryPassword` xuất hiện ở sheet **NEW_ACCOUNTS**. **In hoặc ghi lại ngay, rồi chạy `clearNewAccounts()`** để xóa mật khẩu tạm khỏi Sheet. Sau bước này trong Sheet không còn mật khẩu thô nào. Phát mật khẩu cho từng học sinh (giấy, không đăng nhóm lớp).

## C. Vận hành hằng ngày
- **Reset password / học sinh quên password**: đăng nhập Teacher Mode (`teacher/index.html`) → bấm **Cấp lại mật khẩu** ở dòng học sinh. Mật khẩu tạm hiện **đúng một lần** – ghi lại rồi bấm "Đã ghi lại". Mật khẩu cũ và mọi phiên cũ bị vô hiệu; học sinh phải đổi mật khẩu khi đăng nhập.
- **Khóa / mở khóa account**: nút **Khóa / Mở khóa** ở Teacher Mode. Khóa sẽ hủy luôn các phiên đang mở. Đăng nhập sai 5 lần thì tự khóa 10 phút (mở sớm bằng nút Mở khóa).
- **Đổi session timeout**: `AUTH_CONFIG.sessionHours` trong `backend/Code.gs` (hạn tối đa của phiên, mặc định 8 giờ; nhớ deploy phiên bản mới) và `CONFIG.auth.sessionIdleMinutes` trong `assets/js/config.js` (tự thoát khi không thao tác, mặc định 30 phút). Số lần sai / thời gian khóa / độ dài mật khẩu: `maxFailedAttempts`, `lockMinutes`, `minPasswordLength` cùng nơi.
- Dọn phiên cũ: chạy `purgeExpiredSessions()` (có thể đặt Trigger theo ngày).

## D. Dữ liệu KHÔNG được đưa lên GitHub
- Mật khẩu (thật hoặc tạm), danh sách `NEW_ACCOUNTS`, file xuất từ Sheet `USERS`/`SESSIONS` (có hash, salt).
- URL của Sheet, `TOKEN_PEPPER`, `SPREADSHEET_ID`.
- Danh sách học sinh thật. Sau khi import xong, **hãy thay `data/students.js` bằng dữ liệu mẫu hoặc xóa file** (V1.1 không còn dùng nó; mọi tài khoản nằm trong Google Sheet). `googleScriptUrl` thì được phép công khai: mọi thao tác đều cần mật khẩu/token.

## E. Giới hạn kỹ thuật (nên biết)
- **Băm mật khẩu**: Apps Script không có bcrypt/Argon2. Backend dùng **PBKDF2-HMAC-SHA256** (chuẩn RFC 8018, dựng từ HMAC có sẵn) với salt ngẫu nhiên 16 byte cho từng học sinh; không tự chế thuật toán. Số vòng lặp mặc định 1000 (thấp hơn khuyến nghị hiện đại vì Apps Script chậm). Chạy `benchmarkHash()` rồi tăng `pbkdf2Iterations` nếu 1 lần băm còn dưới ~1 giây. Hash cũ vẫn đăng nhập được vì số vòng lặp được ghi cùng hash. Mật khẩu học sinh nên đủ khó đoán, đừng dùng `123456`.
- **Chống dò mật khẩu** theo từng tài khoản (khóa 5 lần). Apps Script không thấy IP nên không giới hạn theo IP; kẻ xấu vẫn có thể cố tình khóa tài khoản của học sinh bằng cách gõ sai nhiều lần (khóa chỉ 10 phút).
- **localStorage có thể bị đọc** (ví dụ qua lỗi XSS). Vì vậy: chỉ đặt bài học đáng tin trong repo (bài cùng repo đọc được localStorage). Bài ở web ngoài (khác địa chỉ) không đọc được token, chỉ nhận `lessonId`, `classId` trên URL.
- **Không dùng `no-cors`** cho đăng nhập. Frontend gửi `POST` với `Content-Type: text/plain` (không bị preflight CORS) và đọc được JSON trả về; Apps Script trả HTTP 302 sang `script.googleusercontent.com`, trình duyệt tự theo. Nếu Console báo lỗi CORS thường là do chưa triển khai "Bất kỳ ai" hoặc URL cũ – hãy tạo phiên bản triển khai mới.
- Phản hồi của Apps Script mất khoảng 1–3 giây. Dữ liệu và quyền luôn do backend kiểm tra; việc ẩn/hiện màn hình ở frontend không phải bảo mật.

## F. Migration V1 → V1.1
1. Làm B1–B4 ở trên. `tools/export-students.html` chuyển từng dòng `students.js` (`studentId`, `fullName`, `classId`, `grade`...) thành dòng sheet IMPORT; `importUsers()` sinh `StudentUID`, giữ `StudentID` làm `Username`.
2. Mã bài học cũ **không đổi** (`G6-B3`, `G9-B3`, `G11-B1`). Các bài hiện có vẫn chạy; bài trong repo dùng `LessonBridge.getStudent()` (bản cũ `TinHocBridge.getContext()` vẫn hoạt động).
3. Dữ liệu tiến độ cục bộ của V1 (khóa `thtd.studentId`, ...) không còn dùng và được xóa khi đăng xuất.

## G. Lỗi thường gặp
- "Hệ thống đăng nhập chưa được cài đặt": chưa điền `googleScriptUrl`.
- "Chưa kết nối được máy chủ": mất mạng, URL sai, hoặc chưa deploy phiên bản mới sau khi sửa Code.gs.
- Đăng nhập sai mãi dù đúng mật khẩu: kiểm tra cột `Active`, `LockedUntil` ở sheet USERS, hoặc cấp lại mật khẩu.

---
# V2 + V3 – Cloud Learning Data và Teacher Dashboard

**Kiến trúc:** V1 (giao diện, bài học) → V1.1 (tài khoản, StudentUID) → **V2 (lưu tiến độ, câu trả lời, Exit Ticket, thời gian học lên Google Sheet)** → **V3 (Teacher Dashboard đọc đúng dữ liệu V2)**.

## Trạng thái phát hành: `3.0.0-rc.1`
Mã V2 và V3 đã chạy cùng nhau trong kiểm thử tự động (Code.gs, StudentV2.gs, Teacher.gs chạy nguyên bản trong bản giả lập Apps Script + giao diện thật). Nhưng **chưa được thử trên Google Sheet và Apps Script thật**. Vì vậy `CONFIG.version` đang là `3.0.0-rc.1`. Khi thầy làm xong mục **"Kiểm thử thật"** bên dưới và tất cả đều đạt, đổi `version` trong `assets/js/config.js` (và `doGet` trong `backend/Code.gs`) thành `3.0.0`.

## Thứ tự cài đặt chuẩn (làm một lần)
Dán 3 file `backend/Code.gs`, `backend/StudentV2.gs`, `backend/Teacher.gs` vào **cùng một** project Apps Script, rồi:
1. `setupAuth()` – USERS, SESSIONS, IMPORT (mục B2).
2. **Nhập/tạo tài khoản** – điền sheet `IMPORT` (cả giáo viên: `Role = teacher`), chạy `importUsers()`, phát mật khẩu tạm, chạy `clearNewAccounts()` (mục B3–B4).
3. `setupV2()` – tạo đúng 6 sheet V2 (schema chính thức bên dưới). Nếu đang có `PROGRESS` đơn giản của V1.1, nó được **giữ nguyên** và đổi tên thành `PROGRESS_V1_1`.
4. `migrateV1_1ToV2()` – (a) tạo `ENROLLMENTS` từ `USERS` (mỗi học sinh một dòng: năm học, khối, lớp); (b) chuyển `PROGRESS_V1_1` sang `PROGRESS` chuẩn (`started`/`in-progress` → `in_progress`, `completed` giữ nguyên; giữ StudentUID, LessonID, UpdatedAt). Chạy lại không tạo trùng; không xóa gì.
5. `setupV3()` – chỉ tạo `TEACHER_ASSIGNMENTS`, `TEACHER_NOTES`, cột `TeacherUID`. **Không tạo sheet V2.** Chưa chạy `setupV2()` thì báo `V2_NOT_SETUP`.
6. `migrateV2ToV3()` – cấp `TeacherUID` (`tch_...`, bất biến) cho tài khoản `teacher/admin`, điền `AssignmentID`/`Active` trong `TEACHER_ASSIGNMENTS`.
7. **Điền `TEACHER_ASSIGNMENTS`** – mỗi dòng một lớp: `SchoolYear`, `ClassID`, `Subject`, `TeacherUsername` (ví dụ `GV-01`). Rồi chạy lại `migrateV2ToV3()` để tự điền `TeacherUID`, `Active = TRUE`. `Active = FALSE` để thu hồi quyền.
8. **Deploy Web App** (**Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản mới** mỗi lần sửa mã) – Thực thi bằng *Tôi*, quyền truy cập *Bất kỳ ai*.
9. **Cấu hình frontend** – dán URL `/exec` vào `assets/js/config.js` → `googleScriptUrl`; đẩy source lên GitHub Pages.
10. **Chạy kiểm thử tích hợp thật** (mục dưới).

## Schema chính thức (do `setupV2()` tạo; V3 đọc đúng các cột này)
| Sheet | Cột |
|---|---|
| `ENROLLMENTS` | EnrollmentID, StudentUID, SchoolYear, SchoolLevel, Grade, ClassID, Active, StartDate, EndDate, CreatedAt, UpdatedAt |
| `PROGRESS` | ProgressID, StudentUID, SchoolYear, LessonID, Status (`not_started`/`in_progress`/`completed`), CurrentActivityID, PercentComplete, Score, StartedAt, LastAccessAt, CompletedAt, TimeSpentSeconds, AttemptCount, UpdatedAt |
| `RESPONSES` | ResponseID, EventID, StudentUID, SchoolYear, LessonID, ActivityID, QuestionID, QuestionText, ResponseType, ResponseValue, IsCorrect, Score, MaxScore, AttemptNumber, Required, SubmittedAt, UpdatedAt |
| `EXIT_TICKETS` | ExitTicketID, EventID, StudentUID, SchoolYear, LessonID, UnderstandingLevel (`clear`/`good`/`unclear`/`need_support`), KeyLearning, StillConfused, ApplicationAnswer, SelfAssessment, SubmittedAt, UpdatedAt |
| `LEARNING_SESSIONS` | LearningSessionID, StudentUID, SchoolYear, LessonID, StartedAt, LastActivityAt, EndedAt, ActiveSeconds, DeviceType, Completed |
| `EVENT_LOG` | EventID, StudentUID, SchoolYear, LessonID, ActivityID, EventType, CreatedAt, ProcessedAt, Status |

Quy ước: khóa của PROGRESS là **StudentUID + SchoolYear + LessonID** (cập nhật, không tạo mới mỗi lần bấm "Next"). Một Exit Ticket chính cho mỗi học sinh + năm + bài (nộp lại = cập nhật). `RESPONSES` lưu **mỗi lần trả lời một dòng** (AttemptNumber tăng dần); Teacher Dashboard hiển thị lần mới nhất. **SchoolYear do backend quyết** (từ ENROLLMENTS), không nhận từ trình duyệt. Teacher Dashboard vẫn đọc được tên cột cũ (`Percent`, `Answer`, `Learned`, `Unclear`…) để tương thích dữ liệu thử nghiệm cũ, nhưng cột chính là cột trong bảng trên.

## Học sinh: dữ liệu được lưu thế nào
- Luồng duy nhất: **Bài học → `LessonBridge` → `ProgressService`/`ResponseService`/`LearningTimer` → `ApiClient` → Apps Script**. Bài học không tự gọi backend.
- Mọi thay đổi là một **sự kiện có `EventID` (UUID)**, đưa vào hàng đợi cục bộ rồi gửi qua `syncEvents` (gom nhiều sự kiện). Backend ghi `EventID` đã xử lý vào `EVENT_LOG`; gửi lại cùng EventID thì **không ghi trùng**.
- Với `RESPONSES`, backend còn kiểm tra trực tiếp `EventID` trong sheet câu trả lời trước khi append. Điều này giúp tự phục hồi nếu Google Sheet ghi được câu trả lời nhưng lỗi xảy ra ngay trước lúc ghi `EVENT_LOG`.
- **Mất mạng**: học sinh vẫn làm bài; thanh trạng thái hiện *"Chưa đồng bộ – sẽ tự lưu khi có mạng."*; khi có mạng tự gửi; trong lúc gửi *"Đang lưu…"*, xong *"Đã lưu"*. Nếu phản hồi bị mất giữa chừng, lần gửi lại là `duplicate` – không nhân đôi.
- **Khôi phục / đổi máy**: `getLessonProgress` trả đủ trạng thái, hoạt động đã xong, câu trả lời mới nhất, Exit Ticket. Dashboard học sinh hiển thị `Đang học · 50%` lấy từ cloud.
- **Thời gian học** (`LearningTimer`) chỉ cộng khi tab đang hiển thị **và** có thao tác chuột/bàn phím/chạm trong 5 phút gần nhất; nhịp tim ~60 giây; backend không cho `ActiveSeconds` vượt thời gian thực đã trôi qua.
- **Đăng xuất** cố gắng gửi nốt dữ liệu trước. Nếu chưa gửi được (mất mạng), dữ liệu chưa gửi của học sinh đó vẫn nằm trong localStorage (khóa `thtd.queue.<StudentUID>`) và chỉ được gửi khi **chính học sinh đó** đăng nhập lại; học sinh khác đăng nhập trên máy không gửi hộ được.
- **Hoàn thành bài**: không đánh dấu `completed` chỉ vì mở trang cuối. Backend kiểm tra `LESSON_RULES` (hoạt động bắt buộc đã xong + đã nộp Exit Ticket). Khai báo ở **hai nơi, phải khớp**: `completion: { requiredActivities: [...], requireExitTicket: true }` trong `data/lessons.js` và `LESSON_RULES` đầu `backend/StudentV2.gs`. Bài chưa khai báo: chỉ hoàn thành khi `PercentComplete = 100`.
- `IsCorrect`/`Score` do bài học (trình duyệt) tính – dùng cho đánh giá quá trình, **không** dùng làm điểm chính thức.

## Viết một bài học dùng V2
Xem `lessons/grade6/bai3/index.html` + `assets/js/lesson-demo.js` (bài mẫu hoàn chỉnh). Nạp các script theo thứ tự: `config, storage, session, auth-api, api-client, sync-manager, progress-service, response-service, learning-timer, lesson-bridge`; `<body data-lesson-id="...">`. API: `LessonBridge.getStudent / getProgress / startLesson / saveProgress / markActivityCompleted / saveResponse / submitExitTicket / completeLesson / startLearningSession / endLearningSession / mountSyncStatus`.

## API backend V2 (POST, cần `token`; studentUid/schoolYear gửi lên đều bị bỏ qua)
`getMyProfile` · `getMyLessons` · `getMyProgress` · `getLessonProgress` · `startLesson` · `saveProgressV2` · `completeActivity` · `completeLesson` · `saveResponse` · `saveResponsesBatch` · `submitExitTicket` · `startLearningSession` · `heartbeatLearningSession` · `endLearningSession` · `syncEvents`. API V1.1 `saveProgress` vẫn chạy (chuyển thành sự kiện V2).

## Kiểm thử thật (bắt buộc trước khi đổi sang 3.0.0)
Kiểm thử tự động của mình dùng bản giả lập Apps Script, **không thay thế** bước này. Cần: **Google Sheet thật + Apps Script Web App thật + 2 tài khoản học sinh test (A, B, cùng lớp 6A1) + 1 tài khoản giáo viên test được phân công 6A1** (và một lớp khác, ví dụ 9A2, không phân công). Dùng bài `G6-B3`.
1. **A/B cùng máy**: A đăng nhập → làm A1, A2 (50%) → thấy "Đã lưu" → Đăng xuất → B đăng nhập: B = 0%, không thấy gì của A → B đăng xuất → A đăng nhập lại: vẫn 50%.
2. **Đổi máy**: A học đến 60% ở máy 1; trên máy 2 (hoặc trình duyệt ẩn danh) A đăng nhập → thấy 60%; mở bài thấy các hoạt động đã xong.
3. **Response**: A trả lời Q1 → sheet `RESPONSES` có dòng với `ResponseValue` đúng; Teacher mở 6A1 · G6-B3 · tab "Câu trả lời" thấy đúng.
4. **Exit Ticket**: A nộp (KeyLearning, StillConfused, SelfAssessment…) → sheet `EXIT_TICKETS` đúng một dòng; Teacher tab "Exit Ticket" thấy "Điều đã học"/"Điều chưa rõ"; chọn "Cần hỗ trợ" thì A xuất hiện trong danh sách cần quan tâm.
5. **Offline**: ngắt mạng (F12 → Network → Offline), A làm A3 + trả lời; thấy "Chưa đồng bộ…"; bật mạng lại → tự "Đã lưu"; kiểm tra `EVENT_LOG`/`RESPONSES` không bị trùng.
6. **Bảo mật**: trong F12 → Application → Local Storage, sửa `thtd.profile.studentUid` thành UID của B rồi làm tiếp: dữ liệu vẫn ghi cho A.
7. **Dashboard**: giáo viên đăng nhập `teacher/index.html`, mở 6A1 · G6-B3: thấy tiến độ thật của A và B.
8. **Unauthorized**: giáo viên (chưa được phân công 9A2) không chọn được lớp 9A2; gọi API cho 9A2 trả `UNAUTHORIZED`.
Ghi lại kết quả; có mục nào hỏng thì **không** đổi version, gửi lỗi (ảnh Console + dòng sheet liên quan) để sửa.

## Teacher Dashboard (V3)
Chọn **Năm học → Cấp → Khối → Lớp → Bài**: số học sinh; đã bắt đầu / hoàn thành / đang học / chưa học / cần hỗ trợ; bảng tiến độ (tìm theo tên hoặc StudentID, sắp xếp, lọc); phân bố tiến độ; thời gian học (trung bình, trung vị, nhỏ nhất, lớn nhất – chỉ để tham khảo); hoạt động nào đang "kẹt" (từ `EVENT_LOG`); tỉ lệ đúng/sai từng câu; Exit Ticket; câu trả lời; "Học sinh cần quan tâm"; "Hoạt động gần đây". Bấm tên học sinh để mở **Hồ sơ học tập** (theo bài, từng Activity, câu trả lời, Exit Ticket, timeline từ `EVENT_LOG`). **Xuất CSV** (UTF-8 có BOM, không có mật khẩu/hash/token, chặn công thức Excel độc hại) cho tiến độ, Exit Ticket, câu trả lời.
- **Phân quyền**: giáo viên chỉ xem lớp được phân công (`TEACHER_ASSIGNMENTS`); admin xem tất cả. API trả `UNAUTHORIZED` nếu chưa được phân công, `FORBIDDEN` nếu không phải teacher/admin. Tab **Tài khoản** (cấp lại mật khẩu, khóa/mở khóa) cũng giới hạn theo lớp được phân công.
- **"Cần hỗ trợ"** chỉ hiện khi có điều kiện rõ ràng, kèm lý do: Exit Ticket mức hiểu = `need_support`; Tự đánh giá = `need_support`; câu bắt buộc sai từ 3 lần. "Chưa bắt đầu", "tiến độ thấp", "không hoạt động lâu" chỉ vào danh sách *Cần theo dõi / Chưa hoàn thành*, không gán nhãn tiêu cực. Hiển thị "hoạt động gần đây", không khẳng định học sinh đang online.
- **Cấu hình**: `CONFIG.teacher` (`autoRefresh`, `refreshSeconds` = 60 – đừng đặt quá thấp vì hạn mức Apps Script) và `V3_CONFIG` trong `Teacher.gs` (cache 30 giây, ngưỡng, `defaultSchoolYear` phải trùng `CONFIG.schoolYear`). Tên Activity: khai báo `activities` (id, title) trong `data/lessons.js`.

## Giới hạn cần biết
- Dữ liệu dashboard trễ tối đa ~30 giây (cache); nút **Làm mới** bỏ qua cache.
- Mỗi lần ghi, Apps Script đọc cột khóa/bảng liên quan và chạy dưới khóa script; nhiều học sinh ghi cùng lúc thì xếp hàng (mỗi lượt ~1–2 giây) – trình duyệt tự gom sự kiện và thử lại khi hệ thống báo bận. `EVENT_LOG` lớn dần theo thời gian (1 dòng/sự kiện); sau mỗi năm học nên lưu trữ sang file khác.
- `TEACHER_NOTES` mới chỉ là schema, chưa có giao diện ghi chú.
- Bài học lưu dữ liệu phải nằm **cùng repository** (dùng `LessonBridge`); bài ở web ngoài chưa lưu được tiến độ về hệ thống.

---
# Phần còn lại (V1.1 và V1)

## 1. Website hoạt động như thế nào
Một website duy nhất. Học sinh chọn **cấp học → khối → lớp → họ tên → xác nhận**, rồi vào "Không gian học tập của em" để chọn bài.
Danh sách cấp, khối, lớp, học sinh, bài học đều nằm trong thư mục `data/`. Mỗi bài học là một trang riêng trong `lessons/`.
Thông tin học sinh được nhớ bằng localStorage của trình duyệt (không cần tài khoản, mật khẩu).

## 2. Chạy trên máy (local)
Mở thư mục bằng VS Code, cài tiện ích **Live Server**, bấm "Go Live". (Mở trực tiếp file `index.html` vẫn xem được, nhưng nên dùng Live Server để giống GitHub Pages.)

## 3. Đưa lên GitHub
Tạo repository mới → **Add file → Upload files** → kéo toàn bộ nội dung thư mục này vào (giữ nguyên cấu trúc) → **Commit**.

## 4. Bật GitHub Pages
**Settings → Pages →** *Branch*: `main`, thư mục `/ (root)` → **Save**. Sau 1–2 phút có địa chỉ `https://<tài-khoản>.github.io/<tên-repo>/`.

## 5. Thêm cấp học
Mở `data/school-levels.js`, chép một dòng, đặt `levelId` mới. Các khối ở `data/grades.js` dùng `schoolLevel` trùng `levelId` đó.
(Muốn đổi màu theo cấp, thêm một dòng `body[data-level="..."]` trong `assets/css/variables.css`.)

## 6. Thêm lớp
`data/classes.js` – chép một dòng:
`{ classId: "6A2", className: "6A2", grade: 6, schoolLevel: "THCS", schoolYear: "2026-2027", active: true }`

## 7. Thêm học sinh (V1.1: thêm vào sheet IMPORT, rồi chạy `importUsers()`)
(Cách cũ, chỉ dùng làm nguồn migration) `data/students.js` – chép một dòng:
`{ studentId: "6A2-01", fullName: "Họ và tên", classId: "6A2", grade: 6, schoolLevel: "THCS", schoolYear: "2026-2027", active: true }`
StudentID có dạng `<classId>-<số 2 chữ số>` và **không đổi** trong cả năm học. Muốn ẩn học sinh: `active: false`.

## 8. Thêm bài học
1. Tạo thư mục, ví dụ `lessons/grade6/bai4/`, đặt `index.html` vào (chép từ bài mẫu `lessons/grade6/bai3/`).
2. Trong `data/lessons.js` chép một khối bài, sửa `lessonId`, `grade`, `title`, `description`, `url`, `status: "active"`.
3. Tải lại web: bài tự xuất hiện. Không sửa `index.html`.

## 9. Gắn bài web cũ
Đặt `url: "https://tai-khoan.github.io/ten-bai-cu/"`.
Web cũ sẽ nhận thêm trên địa chỉ: `?studentId=...&classId=...&lessonId=...` (không gửi họ tên). Web cũ nằm ở địa chỉ khác nên không đọc được localStorage của web này; hãy tra họ tên theo `studentId`.

## 10. Đổi năm học
Sửa `schoolYear` trong `assets/js/config.js`, rồi thêm lớp/học sinh năm mới vào `classes.js`, `students.js` với `schoolYear` mới. Lớp năm cũ tự ẩn khỏi danh sách chọn.

## 11. Đổi tên giáo viên
Sửa `teacherName` trong `assets/js/config.js`.

## 12. Reset localStorage khi test
Bấm **Đổi học sinh**. Hoặc F12 → Application → Local Storage → Clear (xóa các khóa bắt đầu bằng `thtd.`).

## 13. Vị trí Google Apps Script URL
`assets/js/config.js` → `googleScriptUrl` (xem mục B1). Bắt buộc để đăng nhập.

## 14. Phát triển tiếp
Xem `DEVELOPMENT.md`. Các hàm `saveProgress/saveResponse/saveExitTicket/loadProgress` trong `assets/js/storage.js` nay là lớp tương thích gọi dịch vụ V2.

## Lưu ý bảo mật
Teacher Mode V1 chỉ dùng để quản lý giao diện và xem dữ liệu công khai. Danh sách học sinh nằm trong mã nguồn nên ai cũng xem được; đừng đưa thông tin nhạy cảm (số điện thoại, ngày sinh...) vào. Các chức năng quản trị thật cần backend hoặc xác thực ở giai đoạn sau.
