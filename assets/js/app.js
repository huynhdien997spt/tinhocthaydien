// app.js – giao diện chính (V1.1: đăng nhập thay cho chọn tên). Logic xác thực nằm trong auth.js / session.js.
(function () {
  const $app = document.getElementById("app"), $nav = document.getElementById("nav"), $toast = document.getElementById("toast");
  const esc = AuthUtil.esc;

  const MENU = [ // Thêm menu mới: thêm một dòng ở đây + một route ở cuối file.
    { key: "home",     icon: "🏠", label: "Trang chủ",     path: "/" },
    { key: "lessons",  icon: "📚", label: "Bài học",       path: "/lessons" },
    { key: "skills",   icon: "🛠", label: "Luyện kỹ năng", path: "/skills" },
    { key: "products", icon: "🎨", label: "Sản phẩm",      path: "/products" },
    { key: "about",    icon: "ℹ️", label: "Giới thiệu",    path: "/about" }
  ];
  const STATUS = {
    active: { icon: "🟢", text: "Sẵn sàng" }, learning: { icon: "🟡", text: "Đang học" }, new: { icon: "⚪", text: "Chưa bắt đầu" },
    locked: { icon: "🔒", text: "Chưa mở" }, updating: { icon: "🚧", text: "Đang cập nhật" }
  };
  const PROTECTED = ["/dashboard", "/lessons", "/profile", "/change-password"];
  const by = (list, key, val) => list.find(x => x[key] === val);

  const Catalog = {
    level:   id => by(window.SCHOOL_LEVELS || [], "levelId", id),
    lessons: grade => (window.LESSONS || []).filter(l => l.grade === grade && l.status !== "hidden"),
    lesson:  id => by(window.LESSONS || [], "lessonId", id)
  };

  // ---------- Hiển thị ----------
  function render(html, level) {
    const s = AuthSession.get();
    document.body.dataset.level = level || (s && s.schoolLevel) || "";
    $app.innerHTML = html;
    const h = $app.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
    const first = Router.path().split("/")[1] || "";
    const key = ({ "": "home", login: "home", dashboard: "lessons" })[first] || first;
    $nav.querySelectorAll("a").forEach(a => a.toggleAttribute("aria-current", a.dataset.key === key));
    document.getElementById("nav-user").innerHTML = s
      ? `<span class="who-name">👤 ${esc(s.fullName)}</span><button class="btn small ghost-light" data-action="logout">Đăng xuất</button>` : "";
  }
  function toast(msg) { $toast.textContent = msg; $toast.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { $toast.hidden = true; }, 4000); }
  const empty = (icon, msg, extra) => `<div class="empty"><p class="empty-icon" aria-hidden="true">${icon}</p><p>${msg}</p>${extra || ""}</div>`;

  function lessonCard(l, last, prog) {
    const ready = l.status === "active" && !!l.url;
    let st = ready ? STATUS.active : (l.status === "locked" ? STATUS.locked : STATUS.updating), btn = ready ? "Bắt đầu học" : st.text;
    if (ready && last === l.lessonId) st = STATUS.learning;
    if (ready && prog && prog.status === "completed") { st = { icon: "✅", text: "Hoàn thành" }; btn = "Học lại"; }
    else if (ready && prog && prog.status === "in_progress") { st = { icon: "🟡", text: "Đang học · " + prog.percentComplete + "%" }; btn = "Tiếp tục học"; }
    return `<article class="card lesson"><span class="badge"><span aria-hidden="true">${st.icon}</span> ${st.text}</span>
      <h3>${esc(l.title)}</h3><p>${esc(l.description)}</p>
      <button class="btn" data-action="open" data-id="${esc(l.lessonId)}" ${ready ? "" : "disabled"}>${btn}</button></article>`;
  }
  function lessonList(s) {
    const list = Catalog.lessons(s.grade), last = AuthSession.getLastLesson(), pm = {};
    ProgressService.cachedMyLessons().forEach(x => { pm[x.lessonId] = x; });          // tiến độ lấy từ cloud (đã lưu tạm), cập nhật ngay sau đó
    return list.length ? `<div class="grid lessons">${list.map(l => lessonCard(l, last, pm[l.lessonId])).join("")}</div>` : empty("🚧", "Bài học đang được cập nhật.");
  }
  // Nạp tiến độ mới nhất từ backend; chỉ vẽ lại khi có thay đổi (đổi máy / học xong ở máy khác vẫn thấy đúng).
  function hydrateProgress() {
    const path = Router.path(), before = JSON.stringify(ProgressService.cachedMyLessons());
    ProgressService.loadMyLessons().then(r => { if (r.ok && JSON.stringify(r.lessons) !== before && Router.path() === path) Router.resolve(); });
  }
  // Giáo viên/quản trị đăng nhập ở trang chính thì chuyển sang Teacher Mode.
  function notStudent(s) {
    render(`<h1>Xin chào ${esc(s.fullName)}</h1>${empty("🧑‍🏫", "Tài khoản giáo viên dùng trang quản lý.", `<a class="btn" href="teacher/index.html">Mở Teacher Mode</a> <button class="btn ghost" data-action="logout">Đăng xuất</button>`)}`);
  }

  // ---------- Các trang ----------
  function home() {
    const s = AuthSession.get();
    render(`<section class="hero"><h1>TIN HỌC CÙNG THẦY DIỄN</h1>
      <p class="tagline">Học – Khám phá – Thực hành – Sáng tạo</p>
      <p class="teacher">Giáo viên: <strong>${esc(CONFIG.teacherName)}</strong></p>
      <p class="intro">Chào mừng các em đến với không gian học Tin học. Tại đây, các em sẽ cùng khám phá kiến thức, thực hành, giải quyết vấn đề và tạo ra những sản phẩm của riêng mình.</p>
      ${s ? `<a class="btn accent" href="#/dashboard">Vào không gian học tập của ${esc(s.fullName)}</a>` : `<a class="btn accent" href="#/login">Đăng nhập để học</a>`}
    </section>`, "");
  }

  function login() {
    render(`<div id="login-slot"></div>`, "");
    LoginUI.render(document.getElementById("login-slot"), {
      onSuccess(data) {
        if (data.student.role !== "student") { location.href = "teacher/index.html"; return; }
        Router.go(data.mustChangePassword ? "/change-password" : "/dashboard");
      }
    });
  }

  function dashboard() {
    const s = AuthSession.get(); if (!s) return;
    if (s.role !== "student") return notStudent(s);
    const lastId = AuthSession.getLastLesson(), last = lastId && Catalog.lesson(lastId);
    const soon = on => on ? "" : `<span class="badge">🚧 Đang phát triển</span>`;
    render(`<section class="welcome"><div><h1>Xin chào, ${esc(s.fullName)} 👋</h1>
        <p>Lớp ${esc(s.classId)} · Năm học ${esc(s.schoolYear)}</p></div>
        <div class="actions"><a class="btn ghost" href="#/change-password">Đổi mật khẩu</a><button class="btn ghost" data-action="logout">Đăng xuất</button></div></section>
      ${last && last.grade === s.grade && last.status === "active" && last.url ? `<section class="resume"><p>Tiếp tục bài học gần nhất:</p><strong>${esc(last.title)}</strong>
        <button class="btn accent" data-action="open" data-id="${esc(last.lessonId)}">Tiếp tục học</button></section>` : ""}
      <h2>📚 Bài học</h2>${lessonList(s)}
      <div class="grid two"><a class="card soon" href="#/skills"><strong>🛠 Luyện kỹ năng</strong>${soon(CONFIG.enableSkills)}</a>
        <a class="card soon" href="#/products"><strong>🎨 Sản phẩm của em</strong>${soon(CONFIG.enableProducts)}</a></div>`);
    hydrateProgress();
  }

  function lessonsPage() {
    const s = AuthSession.get(); if (!s) return;
    if (s.role !== "student") return notStudent(s);
    render(`<h1>Bài học của em</h1><p class="muted">${esc(s.fullName)} · Lớp ${esc(s.classId)} · Khối ${s.grade}</p>${lessonList(s)}`);
    hydrateProgress();
  }

  function profile() {
    const s = AuthSession.get(); if (!s) return;
    const lv = Catalog.level(s.schoolLevel);
    render(`<h1>Hồ sơ của em</h1><div class="card profile"><p>👤 <strong>${esc(s.fullName)}</strong></p><p>🏫 Lớp ${esc(s.classId || "")}</p>
      <p>📚 Khối ${esc(s.grade || "")}</p><p>🎓 ${esc(lv ? lv.name : s.schoolLevel || "")}</p><p>📅 Năm học ${esc(s.schoolYear || "")}</p>
      <div class="actions"><a class="btn" href="#/change-password">Đổi mật khẩu</a><button class="btn ghost" data-action="logout">Đăng xuất</button></div></div>`);
  }

  function changePassword() {
    const s = AuthSession.get(); if (!s) return;
    render(`<div id="pw-slot"></div>`);
    PasswordUI.render(document.getElementById("pw-slot"), {
      forced: s.mustChangePassword,
      onDone(sessionEnded) { if (sessionEnded) return toLogin(); toast("Đã đổi mật khẩu."); Router.go(s.role === "student" ? "/dashboard" : "/"); }
    });
  }

  const comingSoon = (title, on) => () => render(`<h1>${title}</h1>${empty("🚧", on ? "Tính năng sắp ra mắt." : "Tính năng đang được phát triển. Các em quay lại sau nhé!")}`);
  function about() {
    render(`<h1>Giới thiệu</h1><div class="card prose"><h2>TIN HỌC CÙNG THẦY DIỄN</h2><p>Giáo viên: <strong>${esc(CONFIG.teacherName)}</strong></p>
      <p>Website tạo một không gian học Tin học để học sinh:</p>
      <ul><li>chủ động học;</li><li>khám phá;</li><li>thực hành;</li><li>sáng tạo;</li><li>tạo sản phẩm;</li><li>phát triển năng lực Tin học và năng lực số.</li></ul>
      <p class="muted">Phiên bản ${esc(CONFIG.version)}</p></div>`, "");
  }
  const notFound = () => render(`<h1>Không tìm thấy trang</h1>${empty("🧭", "Trang này không tồn tại.", `<a class="btn" href="#/">Về trang chủ</a>`)}`, "");

  // ---------- Hành động ----------
  async function openLesson(id) {
    const s = AuthSession.get(), l = Catalog.lesson(id);
    if (!s) return Router.go("/login");
    if (!l || l.status !== "active" || !l.url) return toast("Bài học tạm thời chưa thể mở.");
    const external = /^https?:\/\//i.test(l.url);
    if (!external && /^https?:$/.test(location.protocol)) {
      try { const r = await fetch(l.url, { method: "HEAD" }); if (!r.ok) return toast("Bài học tạm thời chưa thể mở."); } catch (e) {}
    }
    AuthSession.setLastLesson(id);
    let url = l.url;
    if (external) { // web ngoài không đọc được localStorage; chỉ gửi mã bài và mã lớp, không gửi token/họ tên
      url += (url.includes("?") ? "&" : "?") + new URLSearchParams({ lessonId: id, classId: s.classId || "" });
    }
    location.href = url;
  }
  // Về trang đăng nhập; nếu đã ở đó thì vẽ lại ngay (để hiện thông báo), tránh vẽ hai lần.
  function toLogin() { if (Router.path() === "/login") Router.resolve(); else Router.go("/login"); }
  async function logout() { await Auth.logout(); toLogin(); }

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]"); if (!el || el.disabled) return;
    if (el.dataset.action === "open") openLesson(el.dataset.id);
    else if (el.dataset.action === "logout") logout();
  });

  // ---------- Guard + khởi động ----------
  Router.guard = path => {
    const s = AuthSession.get();
    if (PROTECTED.indexOf(path) >= 0 && CONFIG.auth.requireLogin && !s) return "/login";
    if (s && s.mustChangePassword && path !== "/change-password") return "/change-password";
    if (s && path === "/login") return "/dashboard";
    return null;
  };
  Router.add("/", home);
  Router.add("/login", login);
  Router.add("/dashboard", dashboard);
  Router.add("/lessons", lessonsPage);
  Router.add("/profile", profile);
  Router.add("/change-password", changePassword);
  Router.add("/skills", comingSoon("🛠 Luyện kỹ năng", CONFIG.enableSkills));
  Router.add("/products", comingSoon("🎨 Sản phẩm", CONFIG.enableProducts));
  Router.add("/about", about);
  Router.notFound = notFound;

  $nav.innerHTML = `<span class="logo">${esc(CONFIG.appName)}</span>` +
    MENU.map(m => `<a href="#${m.path}" data-key="${m.key}"><span aria-hidden="true">${m.icon}</span> ${m.label}</a>`).join("") + `<span id="nav-user" class="nav-user"></span>`;
  document.getElementById("footer-text").textContent = "© " + CONFIG.teacherName + " · Năm học " + CONFIG.schoolYear;
  const tl = document.getElementById("teacher-link"); if (tl) tl.hidden = !CONFIG.enableTeacherMode;

  async function boot() {
    if (AuthSession.hasExpired()) { await Auth.logout(Auth.friendly("SESSION_EXPIRED")); }
    if (AuthSession.get()) {
      $app.innerHTML = `<div class="empty"><p>Đang kiểm tra phiên học…</p></div>`;
      const v = await Auth.validate();
      if (v.network) {
        $app.innerHTML = empty("📡", Auth.friendly(v.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "NETWORK"),
          `<button class="btn" data-action="retry">Thử lại</button> <button class="btn ghost" data-action="logout">Đăng xuất</button>`);
        $app.querySelector('[data-action="retry"]').addEventListener("click", boot);
        return;
      }
    }
    Auth.watchIdle(toLogin);
    Router.start();
  }
  boot();
})();
