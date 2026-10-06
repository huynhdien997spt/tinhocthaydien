# DEVELOPMENT.md – Hướng dẫn cho người phát triển tiếp

Phiên bản: **3.0.0-rc.1** = V1 (Foundation) → V1.1 (Account & Authentication) → **V2 (Cloud Learning Data)** → V3 (Teacher Dashboard). Chuyển thành `3.0.0` sau khi chạy xong checklist "Kiểm thử thật" trong README. Khi thêm chức năng: đọc file này → xác định module → mở rộng module → giữ tương thích dữ liệu cũ → tăng `CONFIG.version` → cập nhật file này.

## V2 – Cloud Learning Data (backend/StudentV2.gs + 5 module frontend)
**Schema chính thức** (khóa; mọi thay đổi phải tương thích ngược) – xem bảng trong README. `V2_HEADERS` trong `StudentV2.gs` là nguồn duy nhất; `setupV2()` tạo sheet theo đó. Teacher.gs đọc cùng schema (`COLS` ưu tiên tên chính thức, giữ bí danh cũ cho dữ liệu thử nghiệm).

### Nguyên tắc
1. **Danh tính chỉ từ sessionToken.** `studentCtx_(req)` → `requireSession_` → StudentUID; năm học lấy từ ENROLLMENTS đang hoạt động (fallback USERS). `req.studentUid`/`req.schoolYear` bị bỏ qua. API học sinh từ chối teacher/admin (`FORBIDDEN`) và tài khoản chưa đổi mật khẩu tạm.
2. **Một đường ghi duy nhất: `applyEvents_`.** Mọi API ghi (`startLesson`, `saveProgressV2`, `saveResponse`, `submitExitTicket`, `completeLesson`, sessions…) và `syncEvents` đều tạo sự kiện rồi gọi `applyEvents_(c, events)` dưới `withLock_`. Đọc cột EventID của EVENT_LOG **một lần**; sự kiện đã thấy → `duplicate`. Kết quả từng sự kiện: `processed | duplicate | rejected(error)`. Client chỉ xóa sự kiện khỏi hàng đợi khi nhận một trong ba trạng thái này.
3. **Idempotent theo bản chất**: Progress = upsert theo (StudentUID, SchoolYear, LessonID), `PercentComplete` chỉ tăng (`max`), bài `completed` không lùi; Exit Ticket = upsert theo (StudentUID, SchoolYear, LessonID); sessions: id do client sinh, `ActiveSeconds` tích lũy (`max`) và bị chặn ≤ thời gian thực trôi qua. Sự kiện `session_*` không vào EVENT_LOG (tránh ngập log); heartbeat không cần EventID.
4. **Hoàn thành bài do backend quyết** (`LESSON_RULES`): đủ `requiredActivities` (từ EVENT_LOG `activity_completed`) + Exit Ticket nếu yêu cầu. Chưa đủ → ghi `lesson_finish_attempt` (không phải `lesson_completed`) và trả `{ completed:false, missing:[...] }`.
5. **Event type chuẩn trong EVENT_LOG** (V3 timeline đọc các loại này): `lesson_started`, `progress_saved`, `activity_completed`, `response_saved`, `exit_ticket_submitted`, `lesson_completed`, `lesson_finish_attempt`.
6. **Hiệu năng ghi**: đọc theo tên cột (`sheetInfo_`), tìm dòng bằng `findObj_` (chỉ đọc các cột khóa), ghi theo lô (`appendObjs_`, một `setValues`). Giới hạn 100 sự kiện/lần `syncEvents`.

### Migration
`setupV2()` (đổi tên PROGRESS V1.1 → `PROGRESS_V1_1`, tạo sheet chuẩn) → `migrateV1_1ToV2()` (ENROLLMENTS từ USERS; PROGRESS cũ → chuẩn, chuẩn hóa `started`/`in-progress` → `in_progress`). Chạy lặp an toàn. `setupV3()` không tạo sheet V2 (báo `V2_NOT_SETUP`).

### Frontend V2
`api-client.js` (`authenticatedRequest`, `retry`, `queueEvent`, `syncQueue`; hàng đợi `thtd.queue.<StudentUID>`, gộp `progress_saved`/`session_heartbeat`) · `sync-manager.js` (tự gửi khi `online`/theo giãn cách tăng dần; trạng thái Đang lưu…/Đã lưu/Chưa đồng bộ…) · `progress-service.js` (`load/start/update/completeActivity/complete`, trạng thái cục bộ `lp.<uid>.<lesson>`, `loadMyLessons`) · `response-service.js` (`save/batchSave/load/submitExitTicket`, dùng `ResponseValue`) · `learning-timer.js` (active time) · `lesson-bridge.js` (API cho bài học). `storage.js` giữ `loadProgress/saveProgress/saveResponse/saveExitTicket` làm lớp tương thích. Bài học **không được** `fetch` trực tiếp.
Dữ liệu cục bộ khi đăng xuất (máy dùng chung): xóa `auth`, `profile`, `lp.*`, `mylessons.*`, `last.*`; **giữ** `queue.<uid>` (dữ liệu chưa gửi, chỉ gửi bằng phiên của chính học sinh đó).

### Kiểm thử (tự động) – tóm tắt
Backend V2 (53 kiểm tra: schema, migration, upsert, idempotency, completion, sessions, bảo mật), tích hợp giao diện ↔ backend (40: A/B cùng máy, đổi máy, response, Exit Ticket, offline + mất phản hồi, timer, bảo mật, dashboard giáo viên), cộng hồi quy V1.1 (38 + 38) và V3 (52 + 8). Chạy trên sandbox Apps Script giả lập (`SpreadsheetApp`, `Utilities`, `CacheService`, `LockService`…): đây là **kiểm thử logic**, không thay cho kiểm thử thật trên Google (xem README).

## V3 – Teacher Dashboard / Learning Analytics / Teacher Assignments
**Nguyên tắc:** V3 chỉ ĐỌC dữ liệu V2 (không ghi). Quyền do backend kiểm tra; frontend chỉ chọn màn hình hiển thị. Đọc đúng schema chính thức V2 (`COLS` trong `Teacher.gs`: ưu tiên `PercentComplete`, `ResponseValue`, `AttemptNumber`, `KeyLearning`, `StillConfused`, `ApplicationAnswer`, `TimeSpentSeconds`; vẫn nhận tên cũ để tương thích dữ liệu thử nghiệm). Hoạt động đã hoàn thành lấy từ `EVENT_LOG` (`activity_completed`), vì PROGRESS chuẩn không có cột này.

### Sheet mới
| Sheet | Cột |
|---|---|
| `TEACHER_ASSIGNMENTS` | AssignmentID, TeacherUID, SchoolYear, ClassID, Subject, Active, TeacherUsername (cột phụ để nhập) |
| `TEACHER_NOTES` (chỉ schema) | NoteID, TeacherUID, StudentUID, SchoolYear, LessonID, Note, CreatedAt, UpdatedAt |
| `USERS` (thêm cột) | `TeacherUID` (teacher/admin; bất biến, `tch_<uuid>`) |

### API Teacher (POST, cần `token`; role teacher/admin; lớp phải được phân công, admin: mọi lớp)
`getTeacherClasses` · `getClassOverview` · `getClassProgress` · `getStudentLearningProfile` · `getLessonAnalytics` · `getActivityAnalytics` · `getQuestionAnalytics` · `getClassExitTickets` · `getStudentsNeedingSupport` · `getClassResponses`.
Tham số: `schoolYear, classId, lessonId` (+ `studentUid` cho hồ sơ; `force:true` bỏ qua cache). Lỗi: `FORBIDDEN` (không phải teacher/admin), **`UNAUTHORIZED`** (chưa được phân công lớp), `INVALID_SESSION/SESSION_EXPIRED`, `BAD_REQUEST`.
Thứ tự kiểm tra: token → role → phân công lớp → (mới) cache/đọc dữ liệu. Backend chỉ trả dữ liệu của lớp+bài được hỏi và chỉ các trường trong danh sách trắng (không bao giờ có hash/salt/token/mật khẩu).
API V1.1 `teacherListUsers/ResetPassword/LockUser` nay cũng bị giới hạn theo phân công lớp (helper `assignedSet_/isAssigned_` ở cuối `Teacher.gs`).

### Hiệu năng
Mỗi API đọc từng sheet cần dùng **một lần** (`getValues` theo lô), lọc ở backend theo học sinh của lớp + bài, dựng map rồi tính. Cache `CacheService` 30 giây theo (năm, lớp, bài, API); không cache dữ liệu xác thực. Frontend: debounce tìm kiếm/bộ lọc, tự làm mới 60 giây (có nút tạm dừng, không chạy khi tab ẩn).

### Frontend
`assets/js/teacher-api.js` (gọi API, xử lý hết phiên) · `teacher-dashboard.js` (bộ lọc, thẻ lớp, các tab, hồ sơ học sinh) · `teacher-csv.js` (CSV UTF-8 BOM, chặn CSV injection) · `teacher.js` (đăng nhập giáo viên, tab Dashboard/Tài khoản) · `assets/css/teacher.css`.

### Việc không làm ở V3
AI chấm/đánh giá, chatbot, gợi ý tự động, phụ huynh, bảng xếp hạng, huy hiệu, thông báo đẩy, giao diện ghi chú (`TEACHER_NOTES` mới là schema).

## Kiến trúc V1.1
```
GitHub Pages
  ├── UI (index.html, teacher/index.html)
  ├── Core (router, app, session, auth, auth-api, login-ui, password-ui)
  ├── Lesson Modules (lessons/…, đọc phiên qua LessonBridge)
  │
  ↓  HTTPS POST (text/plain, đọc JSON)
Authentication API – Google Apps Script (backend/Code.gs)
  ├── USERS     (hash+salt, role, khóa tài khoản)
  ├── SESSIONS  (chỉ lưu hash của token)
  └── PROGRESS  (ví dụ API ghi theo StudentUID)
```
### Quyết định kiến trúc
- **StudentUID là khóa chính dài hạn** (`stu_<uuid>`, bất biến). Mọi dữ liệu học tập V2+ (Progress, Response, Product, ExitTicket…) phải gắn với **StudentUID**, không gắn với StudentID.
- **StudentID/Username là định danh người dùng, có thể thay đổi**; lớp, năm học cũng có thể đổi.
- **Danh tính chỉ lấy từ sessionToken ở backend.** Không API nào được tin `studentUid`/`role` do client gửi. API mới = gọi `requireSession_(token)` (hoặc `requireRole_`) rồi dùng `ctx.user.StudentUID`.
- Mật khẩu: PBKDF2-HMAC-SHA256 + salt/ người dùng; token: 256 bit ngẫu nhiên, lưu HMAC(token, pepper). Không log mật khẩu.
- Phản hồi thống nhất: `{ success, data, error: { code, message } }`. Thông báo cho học sinh nằm ở `Auth.MESSAGES` (frontend), không hiện mã lỗi kỹ thuật.
- localStorage coi như đọc/sửa được: `thtd.auth` (token, hạn) và `thtd.profile` (chỉ để hiển thị; được ghi đè bằng dữ liệu server mỗi lần `validateSession`).

### API (một endpoint, trường `action`)
`login` · `logout` · `validateSession` · `changePassword` · `saveProgress` · `teacherListUsers` · `teacherResetPassword` · `teacherLockUser`.
Thêm API: viết hàm `xxx_(req)` → thêm `case` trong `dispatch_` → dùng `requireSession_`/`requireRole_` → gọi bằng `AuthApi.call("xxx", { token, ... })`.
Lỗi: `INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_DISABLED, INVALID_SESSION, SESSION_EXPIRED, FORBIDDEN, PASSWORD_CHANGE_REQUIRED, WRONG_CURRENT_PASSWORD, WEAK_PASSWORD, SAME_PASSWORD, BAD_REQUEST, NOT_FOUND, UNKNOWN_ACTION, NOT_SETUP, INTERNAL_ERROR`; phía client thêm `NETWORK, NOT_CONFIGURED, BAD_RESPONSE`.

### Module frontend mới
`config.js` (CONFIG.auth) · `session.js` (AuthSession) · `auth-api.js` (AuthApi) · `auth.js` (Auth: login/logout/validate/changePassword/idle) · `login-ui.js` · `password-ui.js` · `router.js` (có `Router.guard`). `student-session.js` (V1) đã bị gỡ vì không còn dùng.
Router guard: `/dashboard /lessons /profile /change-password` cần đăng nhập; tài khoản `MustChangePassword` luôn bị đưa tới `/change-password`.

### Kiểm thử đã dùng ở V1.1
Code.gs được chạy nguyên bản trong sandbox Node với bản giả lập `SpreadsheetApp/Utilities/PropertiesService/LockService`, giao diện chạy trong jsdom gọi tới backend đó (15 kịch bản của đề bài). Mock không thay thế một lần thử thật trên Google; sau khi deploy hãy đăng nhập thử bằng một tài khoản thật.

### Gợi ý khi thêm API ghi mới
Thêm loại sự kiện vào `EVENT_HANDLERS_` (StudentV2.gs) + (nếu cần) quy tắc ở `LESSON_RULES`; frontend chỉ gọi qua service → `ApiClient.queueEvent`. Dữ liệu học tập luôn gắn **StudentUID + SchoolYear**.

## Kiến trúc V1 (nền tảng, vẫn đúng)
**CORE** (`assets/js`, `assets/css`, `index.html`)
- `config.js` – cấu hình, công tắc tính năng.
- `storage.js` – `Store` (localStorage có tiền tố `thtd.`) và các hàm `saveProgress/loadProgress` (V1.1: gọi API có xác thực).
- `session.js` – `AuthSession` (thay `StudentSession` của V1).
- `router.js` – điều hướng hash `#/...`. `Router.add("/path/:param", handler)`.
- `app.js` – `MENU`, `Catalog` (truy vấn dữ liệu), các view, một bộ lắng nghe `data-action`.
- CSS: `variables.css` (token + theme theo `body[data-level]`), `base.css`, `components.css`, `responsive.css`.

**DATA** (`data/`): `school-levels.js`, `grades.js`, `classes.js`, `students.js`, `lessons.js`. Chỉ là dữ liệu, không có logic.

**LESSON MODULES** (`lessons/gradeN/baiM/index.html` hoặc URL ngoài): độc lập; Core chỉ mở `url` trong `lessons.js`.
Bài trong repo đọc phiên bằng `assets/js/lesson-bridge.js` → `LessonBridge.getStudent()` (trả `studentUid, studentId, fullName, classId, grade, schoolLevel, schoolYear, lessonId`; `null` nếu chưa đăng nhập/hết hạn). `TinHocBridge.getContext()` của V1 vẫn chạy.
Bài ở web ngoài chỉ nhận `lessonId`, `classId` trên URL (không có token, họ tên).

Luồng: Login → backend xác thực → `AuthSession.save` → router guard → dashboard → mở bài → `LessonBridge` trong bài.

## Cách thêm một khối
Thêm `{ grade, schoolLevel }` vào `data/grades.js`; tạo thư mục `lessons/gradeN/`.

## Cách thêm lớp / học sinh / bài học
Xem README mục 6, 7, 8. Cấu trúc bài học có sẵn các trường `requirements`, `qualities`, `competencies{general,informatics,digital,ai}`, `activities[]` (type: opening, knowledge, practice, application, reflection, exit-ticket), `resources`, `learningModel` (WebQuest | PRIMM | PRIDAM | ActivityBased).
Các trường này V1 chưa hiển thị; thêm trường mới được phép, **không đổi tên/xóa trường cũ**.

## Cách thêm menu mới
1. Thêm một dòng vào mảng `MENU` trong `app.js`.
2. Viết hàm view và `Router.add("/ten", view)` ở cuối `app.js`.
3. Nếu là tính năng bật/tắt, thêm cờ `enableX` vào `config.js`.

## Cách thêm một module chức năng
Tạo `assets/js/<ten>.js`, nạp trong `index.html` trước `app.js`, tạo đối tượng toàn cục (như `StudentSession`), chỉ dùng `Store` để lưu, rồi đăng ký route. Không sửa `data/`.

## Cách phát triển Google Apps Script – LƯU Ý: phần V1 dưới đây chỉ để tham khảo lịch sử, KHÔNG áp dụng cho V2/V3 hiện tại
1. Tạo Apps Script gắn Google Sheet, viết `doPost(e)` đọc `JSON.parse(e.postData.contents)`, rẽ nhánh theo `action`
   (`saveStudentSession`, `saveProgress`, `saveResponse`, `saveProduct`, `saveExitTicket`) và ghi vào các sheet tương ứng.
2. Deploy dạng Web App (Execute as: Me; Access: Anyone) → dán URL vào `CONFIG.googleScriptUrl`, đặt `enableProgressSync: true`.
3. [LỊCH SỬ V1 – KHÔNG DÙNG] V1 từng dự kiến `mode: "no-cors"`. V1.1/V2/V3 hiện tại dùng `POST` text/plain và đọc JSON phản hồi; không quay lại `no-cors`.
4. Dữ liệu cục bộ vẫn là nguồn chính khi mất mạng.
Lưu ý: URL Web App công khai nên không tin dữ liệu gửi lên cho việc chấm điểm quan trọng nếu chưa có xác thực.

## Lộ trình
- **V1 Foundation** – website liên cấp, chọn học sinh, danh mục bài, module bài, localStorage. ✔
- **V2 Cloud data** – ✔ đã triển khai (tiến độ, Responses, Exit Ticket, phiên học, offline queue, idempotency).
- **V3 Teacher dashboard** – theo dõi lớp, tiến độ, điểm, thời gian, Exit Ticket.
- **V4 Student products** – kho sản phẩm: Mindmap, Scratch, OctoStudio, WebQuest, video, poster.
- **V5 Digital skills** – khu "Luyện kỹ năng Tin học".
- **V6 Learning portfolio** – hồ sơ học tập từng học sinh.
- **V7 AI support** – AI hỗ trợ học sinh, giáo viên, phản hồi, gợi ý học tập.
