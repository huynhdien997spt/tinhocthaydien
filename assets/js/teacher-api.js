// teacher-api.js – gọi các API Teacher V3. Luôn gửi sessionToken; quyền thật do backend kiểm tra.
const TeacherApi = {
  onSessionEnd: null,
  async call(action, payload) {
    const s = AuthSession.get();
    if (!s) { this.onSessionEnd && this.onSessionEnd(); return AuthApi.fail("INVALID_SESSION"); }
    const res = await AuthApi.call(action, Object.assign({}, payload, { token: s.sessionToken }));
    const code = res.error && res.error.code;
    if (!res.success && (code === "INVALID_SESSION" || code === "SESSION_EXPIRED")) {   // hết hạn → về trang đăng nhập
      await Auth.logout(Auth.friendly("SESSION_EXPIRED"));
      this.onSessionEnd && this.onSessionEnd();
    }
    return res;
  }
};
