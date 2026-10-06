// teacher.js – Teacher Mode: đăng nhập giáo viên → Teacher Dashboard (V3) + Quản lý tài khoản (V1.1).
// Quyền do BACKEND kiểm tra (role + sessionToken + lớp được phân công). Kiểm tra ở đây chỉ để chọn màn hình hiển thị.
(function () {
  const root = document.getElementById("teacher-root"), esc = AuthUtil.esc;
  let users = [], filter = "", tab = "dashboard";

  const navUser = s => { document.getElementById("nav-user").innerHTML = s ? `<span class="who-name">${esc(s.fullName)}</span><button class="btn small ghost-light" data-action="logout">Đăng xuất</button>` : ""; };
  const msg = (icon, text, extra) => { Dashboard.unmount(); root.innerHTML = `<div class="empty"><p class="empty-icon" aria-hidden="true">${icon}</p><p>${text}</p>${extra || ""}</div>`; };

  function loginView() {
    Dashboard.unmount(); navUser(null);
    root.innerHTML = `<div id="slot"></div>`;
    LoginUI.render(document.getElementById("slot"), { title: "Đăng nhập giáo viên", intro: "Dành cho tài khoản giáo viên hoặc quản trị.", onSuccess: show });
  }
  function deniedView() { navUser(AuthSession.get()); msg("⛔", "Trang này dành cho giáo viên. Tài khoản của em không có quyền truy cập.", `<a class="btn" href="../index.html#/dashboard">Về trang học tập</a>`); }
  function passwordView() { Dashboard.unmount(); root.innerHTML = `<div id="slot"></div>`; PasswordUI.render(document.getElementById("slot"), { forced: true, onDone: ended => (ended ? loginView() : show()) }); }

  async function show() {
    if (!AuthSession.get()) return loginView();
    const v = await Auth.validate();
    if (v.network) return msg("📡", Auth.friendly(v.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "NETWORK"), `<button class="btn" data-action="retry">Thử lại</button>`);
    const s = AuthSession.get();
    if (!s) return loginView();
    navUser(s);
    if (s.role !== "teacher" && s.role !== "admin") return deniedView();
    if (s.mustChangePassword) return passwordView();
    shell(s);
  }

  function shell(s) {
    Dashboard.unmount();
    root.innerHTML = `<header class="t-head"><div><h1>TEACHER DASHBOARD</h1><p class="muted">Giáo viên: <strong>${esc(s.fullName)}</strong> · Năm học: <strong>${esc(CONFIG.schoolYear.replace("-", "–"))}</strong></p></div>
      <div class="tabs" role="tablist" aria-label="Khu vực"><button class="tab" role="tab" data-shell="dashboard" aria-selected="${tab === "dashboard"}">Dashboard lớp học</button>
      <button class="tab" role="tab" data-shell="accounts" aria-selected="${tab === "accounts"}">Tài khoản</button></div></header><div id="shell-body"></div>`;
    const body = document.getElementById("shell-body");
    if (tab === "dashboard") Dashboard.mount(body); else accountsView(body);
  }

  // ---------- Quản lý tài khoản (V1.1) ----------
  async function accountsView(body) {
    body.innerHTML = `<p class="muted loading">Đang tải…</p>`;
    const s = AuthSession.get(), res = await AuthApi.call("teacherListUsers", { token: s.sessionToken });
    if (!res.success) {
      const c = res.error && res.error.code;
      if (c === "FORBIDDEN") return deniedView();
      if (c === "INVALID_SESSION" || c === "SESSION_EXPIRED") { await Auth.logout(Auth.friendly("SESSION_EXPIRED")); return loginView(); }
      body.innerHTML = `<div class="empty-note error"><p>Không thể tải dữ liệu lúc này.</p><button class="btn small" data-action="retry">Thử lại</button></div>`; return;
    }
    users = res.data.users; renderAccounts();
  }
  function renderAccounts(notice) {
    const body = document.getElementById("shell-body"); if (!body) return;
    const classes = Array.from(new Set(users.filter(u => u.role === "student").map(u => u.classId))).sort(), rows = users.filter(u => !filter || u.classId === filter);
    body.innerHTML = `<h2>Quản lý tài khoản</h2><p class="muted">Mật khẩu tạm chỉ hiển thị một lần.</p><div id="notice">${notice || ""}</div>
      <div class="filters"><label for="f-acc">Lớp</label><select id="f-acc"><option value="">Tất cả lớp</option>${classes.map(c => `<option ${c === filter ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="stack"><caption class="sr">Tài khoản</caption><thead><tr><th scope="col">Tài khoản</th><th scope="col">Họ tên</th><th scope="col">Lớp</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>
      ${rows.length ? rows.map(u => `<tr><th scope="row" data-label="Tài khoản">${esc(u.username)}</th><td data-label="Họ tên">${esc(u.fullName)}</td><td data-label="Lớp">${esc(u.classId)}</td><td data-label="Vai trò">${esc(u.role)}</td>
        <td data-label="Trạng thái">${!u.active ? "Đã khóa" : u.lockedUntil ? "Tạm khóa" : u.mustChangePassword ? "Chờ đổi mật khẩu" : "Hoạt động"}</td>
        <td class="row-actions"><button class="btn small" data-act="reset" data-uid="${esc(u.studentUid)}">Cấp lại mật khẩu</button>
        <button class="btn small ghost" data-act="${u.active ? "lock" : "unlock"}" data-uid="${esc(u.studentUid)}">${u.active ? "Khóa" : "Mở khóa"}</button></td></tr>`).join("") : `<tr><td colspan="6">Chưa có tài khoản phù hợp.</td></tr>`}</tbody></table></div>
      <h2>Bài học</h2><div class="table-wrap"><table><thead><tr><th scope="col">LessonID</th><th scope="col">Khối</th><th scope="col">Tên bài</th><th scope="col">Trạng thái</th><th scope="col">URL</th><th scope="col">Kiểm tra</th></tr></thead><tbody>
      ${(window.LESSONS || []).map(l => { const href = /^https?:\/\//i.test(l.url) ? l.url : "../" + l.url;
        return `<tr><td>${esc(l.lessonId)}</td><td>${l.grade}</td><td>${esc(l.title)}</td><td>${esc(l.status)}</td><td class="url">${esc(l.url || "(chưa có)")}</td><td>${l.url ? `<a class="btn small" href="${esc(href)}" target="_blank" rel="noopener">Mở bài học</a>` : "—"}</td></tr>`; }).join("")}</tbody></table></div>`;
    document.getElementById("f-acc").addEventListener("change", e => { filter = e.target.value; renderAccounts(); });
  }
  async function act(kind, uid) {
    const s = AuthSession.get(), u = users.find(x => x.studentUid === uid); if (!s || !u) return;
    if (kind === "reset") {
      if (!window.confirm("Cấp lại mật khẩu cho " + u.fullName + " (" + u.username + ")? Mật khẩu cũ sẽ không dùng được nữa.")) return;
      const r = await AuthApi.call("teacherResetPassword", { token: s.sessionToken, studentUid: uid });
      if (!r.success) return show();
      await refreshUsers();
      renderAccounts(`<div class="card reveal" role="alert"><p>Mật khẩu tạm của <strong>${esc(r.data.fullName)}</strong> (tài khoản <strong>${esc(r.data.username)}</strong>):</p>
        <p class="temp-pass">${esc(r.data.temporaryPassword)}</p><p class="muted">Chỉ hiển thị một lần. Hãy ghi lại và đưa cho học sinh; học sinh sẽ phải đổi mật khẩu khi đăng nhập.</p>
        <button class="btn small" data-act="dismiss">Đã ghi lại</button></div>`);
    } else {
      if (kind === "lock" && !window.confirm("Khóa tài khoản " + u.username + "?")) return;
      const r = await AuthApi.call("teacherLockUser", { token: s.sessionToken, studentUid: uid, locked: kind === "lock" });
      if (!r.success) return show();
      await refreshUsers(); renderAccounts();
    }
  }
  async function refreshUsers() { const s = AuthSession.get(); if (!s) return; const r = await AuthApi.call("teacherListUsers", { token: s.sessionToken }); if (r.success) users = r.data.users; }

  root.addEventListener("click", e => {
    const sh = e.target.closest("[data-shell]");
    if (sh) { tab = sh.dataset.shell; const s = AuthSession.get(); return s && shell(s); }
    const b = e.target.closest("#shell-body [data-act='reset'],#shell-body [data-act='lock'],#shell-body [data-act='unlock'],#shell-body [data-act='dismiss'],[data-action='retry']"); if (!b) return;
    if (b.dataset.act === "dismiss") document.getElementById("notice").innerHTML = "";
    else if (b.dataset.act) act(b.dataset.act, b.dataset.uid);
    else show();
  });
  document.getElementById("nav-user").addEventListener("click", async e => { if (e.target.closest('[data-action="logout"]')) { Dashboard.unmount(); await Auth.logout(); loginView(); } });
  TeacherApi.onSessionEnd = loginView;
  Auth.watchIdle(loginView);
  (async function () { if (AuthSession.hasExpired()) await Auth.logout(Auth.friendly("SESSION_EXPIRED")); show(); })();
})();
