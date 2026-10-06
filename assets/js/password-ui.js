// password-ui.js – đổi mật khẩu / tạo mật khẩu mới lần đầu.
const PasswordUI = {
  render(el, opts) {
    const o = Object.assign({ forced: false, onDone() {} }, opts);
    el.innerHTML = `<section class="auth-card"><h1>${o.forced ? "Tạo mật khẩu mới" : "Đổi mật khẩu"}</h1>
      <p class="muted">${o.forced ? "Đây là lần đầu em đăng nhập. Em hãy tự đặt mật khẩu mới để bảo vệ tài khoản." : "Mật khẩu mới cần ít nhất 6 ký tự."}</p>
      <div class="alert" role="alert" id="pw-alert" hidden></div>
      <form id="pw-form" novalidate autocomplete="off">
        <label for="pw-cur">Mật khẩu hiện tại${o.forced ? " (mật khẩu tạm thầy cô cấp)" : ""}</label>
        <input id="pw-cur" class="input" type="password" autocomplete="off">
        <label for="pw-new">Mật khẩu mới</label>
        <input id="pw-new" class="input" type="password" autocomplete="new-password">
        <label for="pw-new2">Nhập lại mật khẩu mới</label>
        <input id="pw-new2" class="input" type="password" autocomplete="new-password">
        <label class="check"><input type="checkbox" id="pw-show"> Hiện mật khẩu</label>
        <button class="btn big" type="submit" id="pw-btn">Lưu mật khẩu mới</button>
      </form></section>`;
    const $ = id => el.querySelector("#" + id), box = $("pw-alert");
    const say = m => { box.textContent = m; box.hidden = false; };
    $("pw-show").addEventListener("change", e => ["pw-cur", "pw-new", "pw-new2"].forEach(i => { $(i).type = e.target.checked ? "text" : "password"; }));
    $("pw-form").addEventListener("submit", async e => {
      e.preventDefault(); box.hidden = true;
      const cur = $("pw-cur").value, n1 = $("pw-new").value, n2 = $("pw-new2").value;
      if (!cur || !n1) return say("Em hãy nhập đủ các ô nhé.");
      if (n1 !== n2) return say("Hai ô mật khẩu mới chưa giống nhau.");
      const btn = $("pw-btn"); btn.disabled = true;
      const res = await Auth.changePassword(cur, n1);
      btn.disabled = false;
      if (res.success) { ["pw-cur", "pw-new", "pw-new2"].forEach(i => { $(i).value = ""; }); return o.onDone(); }
      say(Auth.friendly(res.error && res.error.code));
      if (res.error && /SESSION|INVALID_SESSION/.test(res.error.code)) { await Auth.logout(Auth.friendly("SESSION_EXPIRED")); o.onDone(true); }
    });
  }
};
