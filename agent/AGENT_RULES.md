# ANTIGRAVITY PROJECT RULES
## TIN HỌC CÙNG THẦY DIỄN

## 1. Nguồn giao việc

Trước mọi công việc, bắt buộc đọc:

```text
agent/AGENT_RULES.md
agent/NEXT_TASK.md
```

`NEXT_TASK.md` là task hiện hành duy nhất.

Không suy diễn task từ conversation cũ nếu khác với `NEXT_TASK.md`.

---

## 2. Source of Truth

Ưu tiên:

```text
1. CTGDPT / văn bản chính thức
2. Requirement Bank đã duyệt
3. PPCT
4. Golden Lesson Spec / QA Review
5. Source Catalog
6. Data Contract
7. NEXT_TASK.md
```

Không dùng AI output làm nguồn học thuật chính thức.

Không tự sửa `officialText`.

---

## 3. Git Safety

Trước khi sửa:

```bash
git status
git branch --show-current
git rev-parse HEAD
```

Phải kiểm đúng branch/base commit ghi trong `NEXT_TASK.md`.

Không được tự:

```text
merge main
push main
deploy GitHub Pages
deploy Apps Script
production data write
```

trừ khi `NEXT_TASK.md` ghi rõ được phép.

---

## 4. Scope Control

Chỉ làm đúng Phase/Task được giao.

Không tự mở rộng sang Phase kế tiếp.

Nếu phát hiện kiến trúc cần thay đổi ngoài scope, ghi:

```text
PROPOSED_CHANGE
```

vào `agent/AGENT_REPORT.md`.

Nếu thay đổi đó là blocker thì dừng.

---

## 5. Data Contract

Không tự thay:

```text
schemas
RequirementID
LessonID
StudentUID model
SourceID
NLS governance
completion contract
```

Nếu bắt buộc thay đổi:

```text
BLOCKED
PROPOSED_CHANGE
```

---

## 6. Quality Gate

Không coi test xanh là đủ.

Phải kiểm:

```text
content correctness
source traceability
real classroom usability
student evidence integrity
frontend/backend consistency
regression
```

Nguyên tắc dự án:

> Có thể triển khai chậm nhưng nội dung phải kỹ, bám sát thực tế.

---

## 7. Student Data

Identity authority:

```text
StudentUID
```

Không dùng:

```text
FullName
StudentID client-side
ClassID alone
```

làm khóa dữ liệu cá nhân.

Không tạo fake production student evidence.

Không ghi password, token hoặc dữ liệu nhạy cảm vào log/report.

---

## 8. Source Verification Gate

Với nội dung quan trọng:

- đối chiếu nguồn nội bộ đã duyệt;
- đối chiếu nguồn chính thức/đáng tin cậy khi task yêu cầu;
- AI không phải authority;
- nếu có xung đột nguồn: `REVIEW` hoặc `BLOCKED`;
- chỉ đề xuất PASS khi nguồn, logic lớp học, traceability và kỹ thuật cùng phù hợp.

---

## 9. Sau khi hoàn thành

Bắt buộc:

1. chạy test task hiện tại;
2. chạy regression được yêu cầu;
3. cập nhật `agent/AGENT_REPORT.md`;
4. commit;
5. push đúng branch;
6. dừng.

Không tự bắt đầu task tiếp theo.

---

## 10. Kết luận bắt buộc

Cuối `agent/AGENT_REPORT.md` chỉ được dùng một trong:

```text
READY_FOR_REVIEW
```

hoặc:

```text
BLOCKED
```

Không ghi `PASS` cuối cùng.

Quyền PASS thuộc bước review của ChatGPT/người phụ trách dự án.
