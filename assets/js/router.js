// router.js – điều hướng theo hash (#/...) nên chạy tốt trên GitHub Pages và giữ nguyên khi reload.
const Router = {
  routes: [],
  notFound: null,
  guard: null,                       // guard(path) trả về đường dẫn khác nếu cần chuyển hướng
  add(pattern, handler) {            // pattern ví dụ "/class/:id"
    const names = [];
    const re = new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
    this.routes.push({ re, names, handler });
  },
  path() { return decodeURIComponent(location.hash.replace(/^#/, "")) || "/"; },
  go(path) { location.hash = "#" + path; },
  resolve() {
    const path = this.path();
    if (this.guard) { const to = this.guard(path); if (to && to !== path) { this.go(to); return; } }
    for (const r of this.routes) {
      const m = path.match(r.re);
      if (m) { const params = {}; r.names.forEach((n, i) => params[n] = m[i + 1]); return r.handler(params, path); }
    }
    return this.notFound && this.notFound(path);
  },
  start() { if (!this.started) { this.started = true; window.addEventListener("hashchange", () => this.resolve()); } this.resolve(); }
};
