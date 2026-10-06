// sync-manager.js – tự đồng bộ hàng đợi khi có mạng + trạng thái lưu cho giao diện.
//   "Đang lưu…"  |  "Đã lưu"  |  "Chưa đồng bộ – sẽ tự lưu khi có mạng."
const SyncManager = {
  status: "saved", _listeners: [], _fails: 0, _next: 0, _inited: false,
  TEXT: { saving: "Đang lưu…", saved: "Đã lưu", pending: "Chưa đồng bộ – sẽ tự lưu khi có mạng.", auth: "Phiên đã hết hạn – hãy đăng nhập lại để lưu tiếp." },
  init() {
    if (this._inited) return; this._inited = true;
    window.addEventListener("online", () => { this._fails = 0; this._next = 0; this.flush(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") this.flush(); });
    window.addEventListener("pagehide", () => this.flush());
    this._timer = setInterval(() => { if (ApiClient.pendingCount() > 0 && Date.now() >= this._next) this.flush(); }, 5000);
    this.refresh();
  },
  setStatus(s) { if (s === this.status) return; this.status = s; this._listeners.forEach(f => { try { f(s, this.TEXT[s]); } catch (e) {} }); },
  refresh() { if (ApiClient.pendingCount() === 0) this.setStatus("saved"); else if (this.status === "saved") this.setStatus("pending"); },
  onStatus(cb) { this._listeners.push(cb); cb(this.status, this.TEXT[this.status]); },
  /** Gắn dòng trạng thái vào một phần tử (aria-live). */
  mountStatus(el) { el.setAttribute("aria-live", "polite"); this.onStatus((s, t) => { el.textContent = t; el.dataset.state = s; }); },
  /** Gọi sau khi queueEvent: gom nhiều sự kiện trong vài trăm ms rồi gửi một lần. */
  schedule(ms) {
    this.init();
    if (ApiClient.pendingCount() > 0) this.setStatus("saving");
    clearTimeout(this._deb); this._deb = setTimeout(() => this.flush(), ms === undefined ? ((CONFIG.sync && CONFIG.sync.flushDebounceMs) || 400) : ms);
  },
  async flush() {
    this.init();
    if (ApiClient.pendingCount() === 0) { this.setStatus("saved"); return { ok: true, remaining: 0, results: {} }; }
    if (navigator.onLine === false) { this.setStatus("pending"); return { ok: false, offline: true, remaining: ApiClient.pendingCount(), results: {} }; }
    this.setStatus("saving");
    const r = await ApiClient.syncQueue();
    if (r.ok && r.remaining === 0) { this._fails = 0; this.setStatus("saved"); }
    else if (r.sessionEnded) this.setStatus("auth");
    else { this._fails++; const base = ((CONFIG.sync && CONFIG.sync.retryBaseSeconds) || 2) * 1000, max = ((CONFIG.sync && CONFIG.sync.retryMaxSeconds) || 60) * 1000;
      this._next = Date.now() + Math.min(max, base * Math.pow(2, this._fails)); this.setStatus(r.remaining === 0 ? "saved" : "pending"); }
    return r;
  },
  /** Trước khi đăng xuất: cố gắng gửi nốt (tối đa vài giây). Nếu chưa gửi được, dữ liệu vẫn nằm trong hàng đợi của chính học sinh đó. */
  async flushBeforeLogout(timeoutMs) {
    if (ApiClient.pendingCount() === 0) return { ok: true, remaining: 0 };
    const t = new Promise(r => setTimeout(() => r({ ok: false, timeout: true, remaining: ApiClient.pendingCount() }), timeoutMs || 4000));
    return Promise.race([this.flush(), t]);
  }
};
