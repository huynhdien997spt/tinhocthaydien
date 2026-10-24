# CURRENT TASK

Antigravity phải đọc toàn bộ:

```text
agent/AGENT_RULES.md
agent/NEXT_TASK.md
```

trước khi thực hiện.

# Phase

```text
Phase 3
```

# Task ID

```text
P3.4
```

# Task Name

```text
Golden Lesson Local UAT Preview
```

# Repository

```text
huynhdien997spt/tinhocthaydien
```

# Branch bắt buộc

```text
phase3-golden-lesson-review
```

# Base Commit đã PASS P3.3

```text
ecc56e274739078b431cf8fe294040a9cb6bacf5
```

# Golden Lesson

```text
LessonID: G6-L03
LegacyLessonID: G6-B3
Bài 3. Thông tin trong máy tính
Khối 6
Thời lượng: 90 phút / 2 tiết
```

---

# Objective

Tạo môi trường **local preview** để giáo viên UAT Golden Lesson `G6-L03`.

Không thay đổi production.

Không merge vào `main`.

Không deploy GitHub Pages.

Không deploy Apps Script.

---

# 1. Git Pre-check

Chạy:

```bash
git status
git branch --show-current
git rev-parse HEAD
```

Expected:

```text
branch = phase3-golden-lesson-review
HEAD = ecc56e274739078b431cf8fe294040a9cb6bacf5
```

Nếu HEAD khác base commit trên:

```text
STOP
BLOCKED
```

và ghi rõ vào `agent/AGENT_REPORT.md`.

---

# 2. Không thực hiện

Không:

```text
merge main
push main
deploy GitHub Pages
deploy Apps Script
đổi googleScriptUrl
ghi production data ngoài thao tác UAT hợp lệ
tạo commit chỉ để chạy local preview
tự sửa auth architecture
```

Nếu không phát hiện bug thì không sửa file ứng dụng.

---

# 3. Apps Script Endpoint

Frontend phải tiếp tục dùng endpoint đã cấu hình trong:

```text
assets/js/config.js
```

Endpoint production hiện tại đã được giáo viên kiểm tra và đang phản hồi:

```json
{
  "success": true,
  "data": {
    "service": "tin-hoc-auth",
    "version": "3.0.0-rc.1"
  },
  "error": null
}
```

Không thay endpoint.

---

# 4. Local HTTP Server

Từ root repository chạy:

```bash
python3 -m http.server 8000
```

Nếu port `8000` đang được dùng, chọn port khác và ghi rõ trong report.

Không mở website bằng:

```text
file://
```

---

# 5. URL UAT dự kiến

```text
http://localhost:8000/
http://localhost:8000/index.html#/login
http://localhost:8000/lessons/grade6/bai3/index.html
```

Nếu dùng port khác, thay `8000` bằng port thực tế.

---

# 6. Smoke Test trước khi giao giáo viên

Kiểm tra HTTP 200:

```text
/
index.html
assets/js/config.js
data/lessons/G6-L03.golden.json
lessons/grade6/bai3/index.html
```

Đồng thời xác nhận các script Golden Lesson mà HTML thực tế đang dùng đều tải được.

Parse:

```text
data/lessons/G6-L03.golden.json
```

Expected:

```text
lessonId = G6-L03
activities = 8
questions = 10
```

---

# 7. Golden Lesson Shell

Kiểm tra:

```text
lessons/grade6/bai3/index.html
```

phải dùng:

```text
data-lesson-id="G6-L03"
```

và kết nối đúng renderer/services hiện có.

Không hard-code lại nội dung bài học vào HTML.

---

# 8. Login Connectivity

Mở:

```text
http://localhost:8000/index.html#/login
```

Kiểm tra không còn thông báo:

```text
Chưa kết nối được máy chủ
```

Không ghi password/token vào console hoặc report.

Nếu login lỗi:

- kiểm browser console;
- kiểm Network request tới Apps Script;
- ghi HTTP status;
- ghi response/error;
- ghi CORS/redirect nếu có;
- không tự sửa auth architecture.

---

# 9. Golden Lesson Visibility

Sau login bằng tài khoản test học sinh hợp lệ:

Dashboard phải thấy:

```text
Bài 3. Thông tin trong máy tính
G6-L03
```

Mở bài.

Tiết 1 phải có:

```text
A01
A02
A03
A04
```

Tiết 2 phải bị khóa trước checkpoint.

Expected message tương đương:

```text
Hoàn thành Checkpoint Tiết 1 để mở Tiết 2.
```

---

# 10. Evidence Gate

## A01

Không trả lời `Q001`.

Bấm hoàn thành.

Expected:

```text
BLOCKED
Còn thiếu Q001
```

Sau đó trả lời `Q001`.

Expected:

```text
A01 complete
```

## A02

Không nộp Product 1.

Expected:

```text
BLOCKED
```

Sau đó nộp đủ:

```text
bitString
explanation
Q002
```

Expected:

```text
A02 complete
```

## A03 / A04

Thực hiện tương tự theo required evidence.

Không cho phép hoàn thành hoạt động chỉ bằng click nếu thiếu evidence.

---

# 11. Checkpoint Tiết 1

Sau A04:

Expected:

```text
percentComplete = 50
status = in_progress
nextActivityId = G6-L03-A05
activePeriod = 1
```

Phải hiển thị thông báo kết thúc Tiết 1 tương đương:

```text
Em đã hoàn thành Tiết 1.
Lần sau em sẽ tiếp tục từ Nhiệm vụ A05.
```

Không tự hoàn thành lesson.

Không tự chuyển sang 100%.

Không gọi completion cuối bài.

---

# 12. Dừng UAT vòng đầu tại 50%

Khi Stage 1–11 đạt yêu cầu:

ghi:

```text
P3.4 LOCAL UAT – CHECKPOINT READY
```

Giữ local server chạy để giáo viên tiếp tục trải nghiệm.

Không cần tự thực hiện Student B / resume / hoàn thành Tiết 2 trong task này trừ khi `NEXT_TASK.md` được cập nhật.

---

# 13. Nếu phát hiện bug

Không sửa ngay nếu bug ảnh hưởng:

```text
auth
StudentUID
Data Contract
completion rule
progress restore
backend
```

Ghi vào report:

```text
BUG ID:
Description:
Steps to reproduce:
Expected:
Actual:
Console/Network evidence:
Suspected files:
Risk:
```

Nếu chỉ là lỗi UI nhỏ, vẫn ghi report trước khi sửa.

---

# Required Tests

Tối thiểu:

```text
Local HTTP asset smoke test
Golden JSON parse/shape validation
Login connectivity
Golden Lesson visibility
Period 2 lock
Evidence gate
50% checkpoint
Regression tests hiện có nếu không cần thay code
```

---

# Required Output

Cập nhật:

```text
agent/AGENT_REPORT.md
```

theo mẫu dự án, gồm tối thiểu:

```text
Branch:
Base Commit:
Final Commit:
Local server URL:
Login page URL:
Golden Lesson URL:

Apps Script endpoint:
Endpoint smoke test:

Static asset checks:
Golden JSON validation:

Login connectivity:
Golden Lesson visible:
Period 2 lock:
Evidence gate:
50% checkpoint:

Files changed:
Commits created:

Final Status:
READY_FOR_REVIEW
```

hoặc:

```text
BLOCKED
```

Sau đó:

```text
STOP
```

Không merge.

Không deploy.

Không tự bắt đầu Phase/Task khác.
