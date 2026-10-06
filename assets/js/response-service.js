// response-service.js – câu trả lời (RESPONSES) và Exit Ticket (V2). Dùng trường chuẩn ResponseValue.
const ResponseService = {
  /** r = { activityId, questionId, questionText, responseType, responseValue, isCorrect, score, maxScore, required, attemptNumber? } */
  save(lessonId, r, opts) {
    const st = ProgressService.local(lessonId), prev = st.responses[r.questionId];
    const data = Object.assign({}, r, { attemptNumber: r.attemptNumber || ((prev && prev.attemptNumber) || 0) + 1 });
    const e = ProgressService._queue(lessonId, "response_saved", data, r.activityId);
    return e ? { eventId: e.eventId, attemptNumber: data.attemptNumber } : null;
  },
  batchSave(lessonId, list) { return list.map(r => this.save(lessonId, r)); },
  /** Danh sách câu trả lời mới nhất của mỗi câu hỏi (đã khôi phục từ backend). */
  async load(lessonId) { const st = await ProgressService.load(lessonId); return Object.keys(st.responses).map(k => st.responses[k]); },
  /** d = { understandingLevel: clear|good|unclear|need_support, keyLearning, stillConfused, applicationAnswer, selfAssessment }. Nộp lại = cập nhật bản cũ. */
  async submitExitTicket(lessonId, d) {
    const e = ProgressService._queue(lessonId, "exit_ticket_submitted", d);
    if (!e) return { submitted: false, error: "INVALID_SESSION" };
    const r = await SyncManager.flush(), res = r.results && r.results[e.eventId];
    if (!res) return { submitted: true, queued: true };
    return res.status === "rejected" ? { submitted: false, error: res.error } : { submitted: true, queued: false };
  }
};
