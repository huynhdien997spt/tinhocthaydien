// auth-api.js – gọi Google Apps Script. Dùng "simple request" (POST, text/plain) để không bị preflight CORS,
// và ĐỌC được phản hồi JSON (không dùng no-cors). Apps Script chuyển hướng 302 sang googleusercontent.com, fetch tự theo.
const AuthApi = {
  fail(code) { return { success: false, data: null, error: { code: code, message: "" } }; },
  async call(action, payload) {
    const url = CONFIG.googleScriptUrl;
    if (!url) return this.fail("NOT_CONFIGURED");
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({}, payload, { action: action })), signal: ctl.signal, redirect: "follow" });
      const json = await res.json();
      return json && typeof json.success === "boolean" ? json : this.fail("BAD_RESPONSE");
    } catch (e) { return this.fail("NETWORK"); }
    finally { clearTimeout(timer); }
  }
};
