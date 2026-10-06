// auth.js – logic đăng nhập/đăng xuất/kiểm tra phiên/tự thoát khi không hoạt động.
const AuthUtil = {
  esc: s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
};

const Auth = {
  MESSAGES: {
    INVALID_CREDENTIALS: "Tài khoản hoặc mật khẩu chưa đúng. Em hãy kiểm tra lại nhé.",
    ACCOUNT_LOCKED: "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Em hãy chờ một lúc rồi thử lại, hoặc báo thầy cô.",
    ACCOUNT_DISABLED: "Tài khoản này đang bị khóa. Em hãy liên hệ giáo viên.",
    SESSION_EXPIRED: "Phiên học của em đã kết thúc. Hãy đăng nhập lại để tiếp tục.",
    INVALID_SESSION: "Phiên học của em đã kết thúc. Hãy đăng nhập lại để tiếp tục.",
    IDLE: "Phiên học đã kết thúc vì em không thao tác một lúc. Hãy đăng nhập lại để tiếp tục.",
    NETWORK: "Chưa kết nối được máy chủ. Em hãy kiểm tra mạng rồi thử lại.",
    NOT_CONFIGURED: "Hệ thống đăng nhập chưa được cài đặt. Em hãy báo giáo viên.",
    WRONG_CURRENT_PASSWORD: "Mật khẩu hiện tại chưa đúng.",
    WEAK_PASSWORD: "Mật khẩu mới chưa đạt yêu cầu (ít nhất 6 ký tự, không trùng tài khoản, không có khoảng trắng ở đầu/cuối).",
    SAME_PASSWORD: "Mật khẩu mới phải khác mật khẩu cũ.",
    FORBIDDEN: "Em không có quyền dùng chức năng này.",
    UNAUTHORIZED: "Bạn chưa được phân công lớp này.",
    V2_NOT_SETUP: "Dữ liệu học tập (V2) chưa được cài đặt. Hãy chạy setupV2() trong Apps Script.",
    BUSY: "Hệ thống đang bận, hãy thử lại sau ít giây.",
    NOT_FOUND: "Không tìm thấy dữ liệu.",
    BAD_REQUEST: "Yêu cầu chưa hợp lệ.",
    PASSWORD_CHANGE_REQUIRED: "Em cần tạo mật khẩu mới trước."
  },
  friendly(code) { return this.MESSAGES[code] || "Có lỗi xảy ra. Em hãy thử lại hoặc báo giáo viên."; },
  device() { return (navigator.userAgent || "").slice(0, 150); },

  async login(username, password) {
    const res = await AuthApi.call("login", { username: username, password: password, deviceInfo: this.device() });
    if (res.success) { AuthSession.save(res.data); this.watchIdle(); }
    return res;
  },
  async logout(flashMessage) {
    const s = AuthSession.get();
    if (s && typeof SyncManager !== "undefined") { try { await SyncManager.flushBeforeLogout(); } catch (e) {} }   // lưu nốt dữ liệu học tập trước khi đăng xuất
    if (s) { try { await AuthApi.call("logout", { token: s.sessionToken }); } catch (e) {} }
    AuthSession.clear();
    if (flashMessage) AuthSession.setFlash(flashMessage);
  },
  /** Hỏi backend xem phiên còn hiệu lực không. Trả { ok, network }. */
  async validate() {
    const s = AuthSession.get();
    if (!s) return { ok: false };
    const res = await AuthApi.call("validateSession", { token: s.sessionToken });
    if (res.success) { AuthSession.refresh(res.data); return { ok: true }; }
    const code = res.error && res.error.code;
    if (code === "NETWORK" || code === "NOT_CONFIGURED" || code === "BAD_RESPONSE") return { ok: false, network: true, code: code };
    AuthSession.clear(); AuthSession.setFlash(this.friendly("SESSION_EXPIRED"));
    return { ok: false, code: code };
  },
  async changePassword(current, next) {
    const s = AuthSession.get();
    if (!s) return AuthApi.fail("INVALID_SESSION");
    const res = await AuthApi.call("changePassword", { token: s.sessionToken, currentPassword: current, newPassword: next, deviceInfo: this.device() });
    if (res.success) AuthSession.save(res.data);   // backend đã hủy phiên cũ và cấp phiên mới
    return res;
  },

  /** Tự đăng xuất khi hết hạn hoặc không hoạt động. onEnd() được gọi sau khi đã xóa phiên. */
  watchIdle(onEnd) {
    if (onEnd) this._onEnd = onEnd;
    if (this._timer) return;
    this._last = Date.now();
    const bump = () => { this._last = Date.now(); };
    ["click", "keydown", "touchstart", "mousemove"].forEach(ev => document.addEventListener(ev, bump, { passive: true }));
    this._timer = setInterval(async () => {
      if (!AuthSession.get() && !AuthSession.hasExpired()) return;
      const idle = (Date.now() - this._last) > CONFIG.auth.sessionIdleMinutes * 60000;
      if (AuthSession.hasExpired()) { await this.logout(this.friendly("SESSION_EXPIRED")); this._onEnd && this._onEnd(); }
      else if (idle) { await this.logout(this.friendly("IDLE")); this._onEnd && this._onEnd(); }
    }, 15000);
  }
};
