// session.js – lưu phiên đăng nhập. Mọi thông tin hồ sơ chỉ để HIỂN THỊ; quyền thật do backend kiểm tra bằng token.
//   thtd.auth    = { token, expiresAt, mustChangePassword }   (bí mật, chỉ core đọc)
//   thtd.profile = { studentUid, studentId, fullName, classId, grade, schoolLevel, schoolYear, role }  (lesson-bridge đọc)
const AuthSession = {
  get() {
    const a = Store.getJSON("auth", null), p = Store.getJSON("profile", null);
    if (!a || !p || !a.token || !(Date.parse(a.expiresAt) > Date.now())) return null;
    return Object.assign({}, p, { sessionToken: a.token, expiresAt: a.expiresAt, mustChangePassword: !!a.mustChangePassword });
  },
  hasExpired() { const a = Store.getJSON("auth", null); return !!(a && a.token && !(Date.parse(a.expiresAt) > Date.now())); },
  save(data) {            // data: dữ liệu backend trả về sau login/changePassword
    Store.setJSON("auth", { token: data.sessionToken, expiresAt: data.expiresAt, mustChangePassword: !!data.mustChangePassword });
    Store.setJSON("profile", data.student);
  },
  refresh(data) {         // sau validateSession: ghi đè hồ sơ bằng dữ liệu server (chống sửa localStorage)
    const a = Store.getJSON("auth", null); if (!a) return;
    Store.setJSON("auth", Object.assign(a, { expiresAt: data.expiresAt, mustChangePassword: !!data.mustChangePassword }));
    Store.setJSON("profile", data.student);
  },
  clear() {
    Store.remove("auth"); Store.remove("profile");
    ["studentId", "studentName", "classId", "grade", "schoolLevel", "schoolYear", "lastLessonId", "lastAccess"].forEach(k => Store.remove(k)); // khóa V1
    if (CONFIG.auth.sharedDeviceMode) { Store.removeByPrefix("last."); Store.removeByPrefix("lp."); Store.removeByPrefix("mylessons."); Store.remove("progress"); }
    // KHÔNG xóa "queue.<uid>": dữ liệu chưa đồng bộ của học sinh phải được giữ để gửi khi chính học sinh đó đăng nhập lại.
  },
  setLastLesson(id) { const s = this.get(); if (s) Store.set("last." + s.studentUid, id); },
  getLastLesson()   { const s = this.get(); return s ? Store.get("last." + s.studentUid) : null; },
  setFlash(msg)  { try { sessionStorage.setItem("thtd.flash", msg); } catch (e) {} },
  takeFlash()    { try { const m = sessionStorage.getItem("thtd.flash"); sessionStorage.removeItem("thtd.flash"); return m; } catch (e) { return null; } }
};
