// login-ui.js – form đăng nhập dùng chung cho trang chính và Teacher Mode.
const LoginUI = {
  render(el, opts) {
    const o = Object.assign({ title: "Đăng nhập", intro: "Em dùng tài khoản thầy cô cấp để vào học.", onSuccess() {} }, opts);
    const shared = CONFIG.auth.sharedDeviceMode, flash = AuthSession.takeFlash();
    el.innerHTML = `<section class="auth-card"><h1>${AuthUtil.esc(o.title)}</h1><p class="muted">${AuthUtil.esc(o.intro)}</p>
      <div class="alert" role="alert" id="login-alert" ${flash ? "" : "hidden"}>${AuthUtil.esc(flash || "")}</div>
      <form id="login-form" novalidate autocomplete="off">
        <label for="login-user">Tài khoản</label>
        <input id="login-user" class="input" type="text" autocomplete="${shared ? "off" : "username"}" autocapitalize="off" spellcheck="false" placeholder="Ví dụ: 6A1-01">
        <label for="login-pass">Mật khẩu</label>
        <input id="login-pass" class="input" type="password" autocomplete="${shared ? "off" : "current-password"}">
        <label class="check"><input type="checkbox" id="login-show"> Hiện mật khẩu</label>
        <button class="btn big" type="submit" id="login-btn">Đăng nhập</button>
      </form>
      <details class="forgot"><summary>Quên mật khẩu?</summary><p>Hãy liên hệ giáo viên để được cấp lại mật khẩu.</p></details></section>`;
    const $ = id => el.querySelector("#" + id), alertBox = $("login-alert");
    $("login-show").addEventListener("change", e => { $("login-pass").type = e.target.checked ? "text" : "password"; });
    $("login-form").addEventListener("submit", async e => {
      e.preventDefault();
      const u = $("login-user").value.trim(), p = $("login-pass").value;
      if (!u || !p) { alertBox.textContent = "Em hãy nhập tài khoản và mật khẩu nhé."; alertBox.hidden = false; return; }
      const btn = $("login-btn"); btn.disabled = true; btn.textContent = "Đang đăng nhập…"; alertBox.hidden = true;
      const res = await Auth.login(u, p);
      if (res.success) { $("login-pass").value = ""; o.onSuccess(res.data); return; }
      $("login-pass").value = ""; btn.disabled = false; btn.textContent = "Đăng nhập";
      alertBox.textContent = Auth.friendly(res.error && res.error.code); alertBox.hidden = false; $("login-pass").focus();
    });
  }
};
