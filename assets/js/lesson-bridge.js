// lesson-bridge.js – DÙNG TRONG CÁC BÀI HỌC nằm cùng repository. Bài học KHÔNG gọi Google Apps Script trực tiếp.
//   Lesson → LessonBridge → ProgressService / ResponseService / LearningTimer → ApiClient → Apps Script
//
// Bài chỉ cần đọc thông tin học sinh: nạp riêng file này, dùng LessonBridge.getStudent().
// Bài cần lưu tiến độ: nạp thêm (theo thứ tự) config.js, storage.js, session.js, auth-api.js, api-client.js, sync-manager.js,
//   progress-service.js, response-service.js, learning-timer.js, rồi lesson-bridge.js.
//
// Chỉ đọc "thtd.profile" (thông tin hiển thị). KHÔNG có mật khẩu/hash/salt/token trong giá trị trả về.
(function () {
  // Các dịch vụ khai báo bằng const (không nằm trên window) nên kiểm tra bằng typeof trong phạm vi toàn cục.
  const need = n => { if (new Function("return typeof " + n)() === "undefined") throw new Error("LessonBridge: thiếu script '" + n + "' (xem hướng dẫn đầu file lesson-bridge.js)"); };
  const lessonId = () => (document.body && document.body.dataset.lessonId) || null;
  const needLesson = () => { const l = lessonId(); if (!l) throw new Error("LessonBridge: <body> cần thuộc tính data-lesson-id"); return l; };

  window.LessonBridge = {
    prefix: "thtd.",
    read(key) { try { return JSON.parse(localStorage.getItem(this.prefix + key)); } catch (e) { return null; } },
    getStudent() {
      const auth = this.read("auth"), p = this.read("profile");
      if (!auth || !p || !p.studentUid || !(Date.parse(auth.expiresAt) > Date.now())) return null;
      return { studentUid: p.studentUid, studentId: p.studentId, fullName: p.fullName, classId: p.classId, grade: p.grade,
               schoolLevel: p.schoolLevel, schoolYear: p.schoolYear, lessonId: lessonId() };
    },
    // ---- V2: dữ liệu học tập ----
    getProgress()            { need("ProgressService"); return ProgressService.load(needLesson()); },                 // khôi phục từ cloud
    startLesson()            { need("ProgressService"); return ProgressService.start(needLesson()); },
    saveProgress(p)          { need("ProgressService"); return ProgressService.update(needLesson(), p); },             // { currentActivityId, percentComplete, score }
    markActivityCompleted(a) { need("ProgressService"); return ProgressService.completeActivity(needLesson(), a); },
    saveResponse(r)          { need("ResponseService"); return ResponseService.save(needLesson(), r); },
    saveResponses(list)      { need("ResponseService"); return ResponseService.batchSave(needLesson(), list); },
    getResponses()           { need("ResponseService"); return ResponseService.load(needLesson()); },
    submitExitTicket(d)      { need("ResponseService"); return ResponseService.submitExitTicket(needLesson(), d); },
    completeLesson()         { need("ProgressService"); return ProgressService.complete(needLesson()); },              // backend kiểm tra điều kiện hoàn thành
    startLearningSession()   { need("LearningTimer"); return LearningTimer.start(needLesson()); },
    endLearningSession(done) { need("LearningTimer"); return LearningTimer.stop(done); },
    getActiveSeconds()       { need("LearningTimer"); return LearningTimer.getActiveSeconds(); },
    onSyncStatus(cb)         { need("SyncManager"); SyncManager.init(); SyncManager.onStatus(cb); },
    mountSyncStatus(el)      { need("SyncManager"); SyncManager.init(); SyncManager.mountStatus(el); },
    syncNow()                { need("SyncManager"); return SyncManager.flush(); }
  };
  window.TinHocBridge = { getContext() { const s = window.LessonBridge.getStudent(); return s && Object.assign({ studentName: s.fullName }, s); } }; // tương thích bài V1
})();
