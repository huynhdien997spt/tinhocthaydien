// learning-timer.js – đo THỜI GIAN HỌC THỰC (active time), không phải (kết thúc − bắt đầu).
// Chỉ cộng giây khi: tab đang hiển thị VÀ có thao tác chuột/bàn phím/chạm/cuộn trong vòng idleMinutes (mặc định 5 phút).
// Cứ ~60 giây gửi nhịp tim (ActiveSeconds tích lũy). Backend còn giới hạn ActiveSeconds ≤ thời gian thực đã trôi qua.
const LearningTimer = {
  sessionId: null, lessonId: null, active: 0, _sinceBeat: 0, _timer: null, _lastInput: 0,
  clock() { return Date.now(); },                    // có thể thay trong kiểm thử
  cfg() { const c = CONFIG.learning || {}; return { idleMs: (c.idleMinutes || 5) * 60000, beatSec: c.heartbeatSeconds || 60, tickMs: c.tickMs || 1000 }; },
  deviceType() { const w = window.innerWidth || 1024; return w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop"; },
  noteInput() { this._lastInput = this.clock(); },
  start(lessonId) {
    if (this.sessionId) return this.sessionId;
    this.lessonId = lessonId; this.active = 0; this._sinceBeat = 0; this._lastInput = this.clock();
    this.sessionId = ApiClient.uuid();
    ApiClient.queueEvent({ type: "session_started", lessonId: lessonId, data: { sessionId: this.sessionId, deviceType: this.deviceType() } });
    SyncManager.schedule();
    if (!this._bound) {
      this._bound = true;
      ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach(ev => document.addEventListener(ev, () => this.noteInput(), { passive: true, capture: true }));
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && this.sessionId) this.heartbeat(); });
      window.addEventListener("pagehide", () => { if (this.sessionId) this.stop(); });
    }
    this._timer = setInterval(() => this.tick(1), this.cfg().tickMs);
    return this.sessionId;
  },
  /** Cộng `seconds` giây nếu học sinh đang thực sự hoạt động. */
  tick(seconds) {
    if (!this.sessionId) return false;
    const c = this.cfg(), visible = document.visibilityState !== "hidden", recent = this.clock() - this._lastInput < c.idleMs;
    if (visible && recent) { this.active += seconds; this._sinceBeat += seconds; }
    if (this._sinceBeat >= c.beatSec) this.heartbeat();
    return visible && recent;
  },
  heartbeat() {
    if (!this.sessionId) return;
    this._sinceBeat = 0;
    ApiClient.queueEvent({ type: "session_heartbeat", lessonId: this.lessonId, data: { sessionId: this.sessionId, activeSeconds: Math.round(this.active) } });
    SyncManager.schedule();
  },
  stop(completed) {
    if (!this.sessionId) return Promise.resolve();
    clearInterval(this._timer); this._timer = null;
    ApiClient.queueEvent({ type: "session_ended", lessonId: this.lessonId, data: { sessionId: this.sessionId, activeSeconds: Math.round(this.active), completed: completed === true } });
    this.sessionId = null;
    return SyncManager.flush();
  },
  getActiveSeconds() { return Math.round(this.active); }
};
