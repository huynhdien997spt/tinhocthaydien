// api-client.js – CỔNG DUY NHẤT từ trình duyệt tới Apps Script cho dữ liệu học tập (V2).
// Bài học KHÔNG được tự fetch backend: luồng là Lesson → LessonBridge → Progress/Response Service → ApiClient → Apps Script.
// Có hàng đợi cục bộ (localStorage, theo StudentUID) để học offline; mỗi sự kiện có EventID (UUID) để backend chống ghi trùng.
const ApiClient = {
  RETRIABLE: ["NETWORK", "BUSY", "BAD_RESPONSE"],
  uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    const h = n => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    return h(8) + "-" + h(4) + "-4" + h(3) + "-a" + h(3) + "-" + h(12);
  },
  /** Gọi API có sessionToken. studentUid KHÔNG được gửi: backend tự lấy từ token. */
  async authenticatedRequest(action, payload) {
    const s = AuthSession.get();
    if (!s) return AuthApi.fail("INVALID_SESSION");
    const res = await AuthApi.call(action, Object.assign({}, payload, { token: s.sessionToken }));
    const code = res.error && res.error.code;
    if (!res.success && (code === "INVALID_SESSION" || code === "SESSION_EXPIRED")) { res.sessionEnded = true; if (this.onSessionEnd) this.onSessionEnd(); }
    return res;
  },
  /** Thử lại khi lỗi tạm thời (mạng, hệ thống bận). fn trả về phản hồi { success, error }. */
  async retry(fn, opts) {
    const o = Object.assign({ tries: 3, baseMs: 500 }, opts);
    let res;
    for (let i = 0; i < o.tries; i++) {
      res = await fn();
      if (res.success || !this.RETRIABLE.includes(res.error && res.error.code)) return res;
      if (i < o.tries - 1) await new Promise(r => setTimeout(r, o.baseMs * Math.pow(2, i)));
    }
    return res;
  },

  // ---------- hàng đợi ----------
  key(uid) { return "queue." + uid; },
  loadQueue(uid) { return Store.getJSON(this.key(uid), []); },
  saveQueue(uid, q) { Store.setJSON(this.key(uid), q); },
  pendingCount() { const s = AuthSession.get(); return s ? this.loadQueue(s.studentUid).length : 0; },
  /** Thêm một sự kiện vào hàng đợi (có EventID + thời điểm tạo). Tiến độ/nhịp tim của cùng bài/phiên được gộp để hàng đợi không phình to. */
  queueEvent(evt) {
    const s = AuthSession.get(); if (!s) return null;
    const e = Object.assign({ eventId: this.uuid(), createdAt: new Date().toISOString(), data: {} }, evt);
    let q = this.loadQueue(s.studentUid);
    if (e.type === "progress_saved") q = q.filter(x => !(x.type === "progress_saved" && x.lessonId === e.lessonId));
    if (e.type === "session_heartbeat") q = q.filter(x => !(x.type === "session_heartbeat" && x.data.sessionId === e.data.sessionId));
    q.push(e); this.saveQueue(s.studentUid, q);
    return e;
  },
  /** Gửi hàng đợi lên backend (syncEvents). Chỉ xóa sự kiện khỏi hàng đợi khi backend đã xác nhận (processed/duplicate/rejected). */
  syncQueue() {
    if (this._busy) return this._busy;
    this._busy = (async () => {
      try {
        const s = AuthSession.get();
        if (!s) return { ok: false, reason: "no_session", remaining: 0, results: {} };
        const uid = s.studentUid, results = {};
        for (;;) {
          const q = this.loadQueue(uid); if (!q.length) break;
          const batch = q.slice(0, (CONFIG.sync && CONFIG.sync.batchSize) || 50);
          const res = await this.authenticatedRequest("syncEvents", { events: batch });
          if (!res.success) {
            const code = res.error && res.error.code;
            return { ok: false, code: code, offline: this.RETRIABLE.includes(code), sessionEnded: !!res.sessionEnded, remaining: this.loadQueue(uid).length, results: results };
          }
          const done = {}; res.data.results.forEach(r => { done[r.eventId] = r; results[r.eventId] = r; if (r.status === "rejected") this.lastRejected = r; });
          const cur = this.loadQueue(uid), next = cur.filter(e => !done[e.eventId]);
          this.saveQueue(uid, next);
          if (next.length === cur.length) break;          // không tiến triển → tránh vòng lặp vô hạn
        }
        return { ok: true, remaining: this.loadQueue(uid).length, results: results };
      } finally { this._busy = null; }
    })();
    return this._busy;
  }
};
