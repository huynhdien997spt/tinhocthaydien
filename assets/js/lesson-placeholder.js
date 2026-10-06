// Trang bài học mẫu: hiển thị thông tin học sinh nhận được từ hệ thống để kiểm tra việc truyền dữ liệu.
(function () {
  const st = LessonBridge.getStudent();
  const lesson = (window.LESSONS || []).find(l => l.lessonId === document.body.dataset.lessonId);
  document.getElementById("f-lesson").textContent = lesson ? lesson.title : document.body.dataset.lessonId;
  if (!st) { document.getElementById("no-session").hidden = false; document.getElementById("info").hidden = true; return; }
  ["studentUid", "studentId", "fullName", "classId", "grade", "lessonId"].forEach(k => {
    const el = document.getElementById("f-" + k); if (el) el.textContent = st[k];
  });
})();
