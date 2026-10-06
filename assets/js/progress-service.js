// progress-service.js – tiến độ bài học (V2): load / start / update / complete (+ completeActivity).
// Trạng thái cục bộ (lp.<uid>.<lessonId>) cập nhật ngay để học sinh thấy tiến độ; backend là nguồn đúng, được nạp lại bằng load().
const ProgressService = {
  _key(lessonId) { const s = AuthSession.get(); return s ? "lp." + s.studentUid + "." + lessonId : null; },
  blank(lessonId) { return { lessonId: lessonId, status: "not_started", currentActivityId: "", percentComplete: 0, score: null, timeSpentSeconds: 0, completedActivityIds: [], responses: {}, exitTicket: null, fromServer: false }; },
  local(lessonId) { const k = this._key(lessonId); return (k && Store.getJSON(k, null)) || this.blank(lessonId); },
  _save(lessonId, st) { const k = this._key(lessonId); if (k) Store.setJSON(k, st); return st; },

  /** Áp dụng một sự kiện lên trạng thái cục bộ (dùng cho cả sự kiện mới và sự kiện đang chờ trong hàng đợi). */
  applyLocal(st, e) {
    const d = e.data || {};
    const begin = () => { if (st.status === "not_started") st.status = "in_progress"; };
    if (e.type === "lesson_started") begin();
    else if (e.type === "progress_saved") { begin(); if (d.percentComplete !== undefined) st.percentComplete = Math.max(st.percentComplete, Math.round(d.percentComplete)); if (d.currentActivityId) st.currentActivityId = d.currentActivityId; if (d.score !== undefined && d.score !== null) st.score = d.score; }
    else if (e.type === "activity_completed") { begin(); if (e.activityId && !st.completedActivityIds.includes(e.activityId)) st.completedActivityIds.push(e.activityId); }
    else if (e.type === "response_saved") { begin(); st.responses[d.questionId] = Object.assign({}, d, { activityId: e.activityId || d.activityId }); }
    else if (e.type === "exit_ticket_submitted") { begin(); st.exitTicket = Object.assign({}, d); }
    return st;
  },
  _queue(lessonId, type, data, activityId) {
    const e = ApiClient.queueEvent({ type: type, lessonId: lessonId, activityId: activityId || "", data: data || {} });
    if (!e) return null;
    this._save(lessonId, this.applyLocal(this.local(lessonId), e));
    SyncManager.schedule();
    return e;
  },

  /** Khôi phục từ backend (đổi máy vẫn học tiếp), rồi áp lại các sự kiện chưa gửi. Mất mạng → dùng bản cục bộ. */
  async load(lessonId) {
    const s = AuthSession.get(); if (!s) return Object.assign(this.blank(lessonId), { error: "INVALID_SESSION" });
    await SyncManager.flush();                       // gửi nốt dữ liệu đang chờ để bản nạp về không cũ hơn bản cục bộ
    const res = await ApiClient.retry(() => ApiClient.authenticatedRequest("getLessonProgress", { lessonId: lessonId }), { tries: 2, baseMs: 400 });
    if (!res.success) return Object.assign(this.local(lessonId), { fromCache: true, error: res.error && res.error.code });
    const d = res.data, st = this.blank(lessonId);
    Object.assign(st, { status: d.status, currentActivityId: d.currentActivityId, percentComplete: d.percentComplete, score: d.score, timeSpentSeconds: d.timeSpentSeconds,
      completedActivityIds: d.completedActivityIds.slice(), exitTicket: d.exitTicket, fromServer: true });
    d.responses.forEach(r => { st.responses[r.questionId] = r; });
    ApiClient.loadQueue(s.studentUid).filter(e => e.lessonId === lessonId).forEach(e => this.applyLocal(st, e));
    return this._save(lessonId, st);
  },
  start(lessonId) { return this._queue(lessonId, "lesson_started", {}); },
  /** p = { currentActivityId, percentComplete (0–100), score } */
  update(lessonId, p) { p = p || {}; return this._queue(lessonId, "progress_saved", { currentActivityId: p.currentActivityId, percentComplete: p.percentComplete, score: p.score }, p.currentActivityId); },
  completeActivity(lessonId, activityId) { return this._queue(lessonId, "activity_completed", {}, activityId); },
  /** Yêu cầu hoàn thành bài. BACKEND kiểm tra điều kiện (hoạt động bắt buộc, Exit Ticket); trả { completed, missing } hoặc { queued:true } khi chưa có mạng. */
  async complete(lessonId) {
    const e = this._queue(lessonId, "lesson_completed", {});
    if (!e) return { completed: false, error: "INVALID_SESSION" };
    const r = await SyncManager.flush(), res = r.results && r.results[e.eventId];
    if (!res) return { completed: false, queued: true };
    if (res.status === "rejected") return { completed: false, error: res.error };
    if (res.result && res.result.completed) { const st = this.local(lessonId); st.status = "completed"; st.percentComplete = 100; this._save(lessonId, st); }
    return res.result || { completed: false };
  },

  // ---------- danh sách bài của học sinh (dashboard) ----------
  cachedMyLessons() { const s = AuthSession.get(); return s ? Store.getJSON("mylessons." + s.studentUid, []) : []; },
  async loadMyLessons() {
    const s = AuthSession.get(); if (!s) return { ok: false, lessons: [] };
    const res = await ApiClient.authenticatedRequest("getMyLessons", {});
    if (!res.success) return { ok: false, lessons: this.cachedMyLessons(), error: res.error && res.error.code };
    Store.setJSON("mylessons." + s.studentUid, res.data.lessons);
    return { ok: true, lessons: res.data.lessons, schoolYear: res.data.schoolYear };
  }
};
