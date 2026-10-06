# RC2 review fixes

Bản này kế thừa `3.0.0-rc.1` và chỉ sửa các điểm an toàn/nhất quán trước khi deploy thật:

1. Đồng bộ nhãn version trong `Teacher.gs` về `3.0.0-rc.1`.
2. Sửa README: `setupAuth()` không tạo `PROGRESS`; `setupV2()` quản lý schema V2.
3. Đánh dấu hướng dẫn `no-cors` cũ trong DEVELOPMENT là lịch sử V1, không áp dụng.
4. Tăng độ bền idempotency cho `RESPONSES`: nếu append câu trả lời thành công nhưng ghi `EVENT_LOG` thất bại, retry cùng `EventID` không tạo dòng câu trả lời trùng và sẽ hoàn tất EVENT_LOG.

Không đổi schema, API, StudentUID, LessonID hay luồng triển khai. Vẫn cần kiểm thử thật trên Google Sheet + Apps Script trước khi đổi version thành `3.0.0`.
