// teacher-dashboard.js – Teacher Dashboard V3. Chỉ XEM dữ liệu; mọi dữ liệu do backend lọc theo lớp được phân công.
const Dashboard = (function () {
  const esc = AuthUtil.esc;
  const STATUS = { not_started: "Chưa bắt đầu", in_progress: "Đang học", completed: "Hoàn thành" };
  const LEVELS = { hieu_ro: "Hiểu rõ", kha_hieu: "Khá hiểu", chua_ro: "Chưa rõ", can_ho_tro: "Cần hỗ trợ" };
  const TABS = [["overview", "Tổng quan"], ["activities", "Hoạt động & câu hỏi"], ["responses", "Câu trả lời"], ["exit", "Exit Ticket"], ["live", "Hoạt động gần đây"]];
  const NEEDS = { overview: ["bundle", "progress"], activities: ["bundle"], responses: ["responses"], exit: ["exit"], live: ["progress"] };
  const ACTION = { bundle: "getLessonAnalytics", progress: "getClassProgress", exit: "getClassExitTickets", responses: "getClassResponses" };
  let root, st, timer, debounce;

  // ---------- tiện ích ----------
  const pad = n => String(n).padStart(2, "0");
  const fmtDT = iso => { if (!iso) return "—"; const d = new Date(iso); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const fmtClock = ms => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
  const fmtDur = s => (s === null || s === undefined || s <= 0) ? "—" : s < 60 ? "<1 phút" : s < 3600 ? Math.round(s / 60) + " phút" : Math.floor(s / 3600) + " giờ " + Math.round((s % 3600) / 60) + " phút";
  const rel = iso => { const m = Math.floor((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? "vừa cập nhật" : m < 60 ? m + " phút trước" : fmtDT(iso); };
  const plain = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const pct = v => v === null || v === undefined ? "—" : v + "%";
  const lessonsOf = grade => (window.LESSONS || []).filter(l => l.grade === Number(grade) && l.status !== "hidden");
  const lessonById = id => (window.LESSONS || []).find(l => l.lessonId === id);
  const lessonTitle = id => (lessonById(id) || {}).title || id;
  const actTitle = (lessonId, a) => { const x = ((lessonById(lessonId) || {}).activities || []).find(y => y.id === a); return a + (x && x.title ? " " + x.title : ""); };
  const yearLabel = y => String(y).replace("-", "–");
  const bar = v => `<span class="bar" role="img" aria-label="${v === null ? "không rõ" : v + " phần trăm"}"><span style="width:${v === null ? 0 : v}%"></span></span>`;
  const cls = () => (st.classes || []).find(c => c.classId === st.f.classId && c.schoolYear === st.f.year);

  // ---------- khởi tạo ----------
  function mount(el) {
    unmount(); root = el;
    st = { classes: null, f: { year: "", level: "", grade: "", classId: "", lessonId: "" }, tab: "overview", data: {}, q: "", filter: "all", sort: { key: "name", dir: 1 },
           qfilter: "", loadedAt: null, paused: !CONFIG.teacher.autoRefresh, loading: false, error: null, seq: 0, panel: null };
    root.innerHTML = `<section class="dash" aria-label="Teacher Dashboard"><div id="dash-filters"></div><div id="dash-content" aria-live="off"></div></section><div id="student-panel" hidden></div>`;
    root.addEventListener("click", onClick); root.addEventListener("change", onChange); root.addEventListener("input", onInput); document.addEventListener("keydown", onKey);
    document.getElementById("dash-content").innerHTML = `<p class="muted loading">Đang tải danh sách lớp…</p>`;
    loadClasses();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, CONFIG.teacher.refreshSeconds * 1000);
  }
  function unmount() {
    if (timer) { clearInterval(timer); timer = null; }
    clearTimeout(debounce); document.removeEventListener("keydown", onKey);
    if (root) { root.removeEventListener("click", onClick); root.removeEventListener("change", onChange); root.removeEventListener("input", onInput); }
    root = null;
  }
  async function loadClasses() {
    const r = await TeacherApi.call("getTeacherClasses", {});
    if (!root) return;
    if (!r.success) { st.error = r.error && r.error.code; return renderContent(); }
    st.classes = r.data.classes;
    const years = Array.from(new Set(st.classes.map(c => c.schoolYear))).sort().reverse();
    st.f.year = years.indexOf(CONFIG.schoolYear) >= 0 ? CONFIG.schoolYear : (years[0] || "");
    renderFilters(); renderContent();
  }

  // ---------- bộ lọc: Năm học → Cấp học → Khối → Lớp → Bài học ----------
  function renderFilters() {
    const f = st.f, all = st.classes || [], inYear = all.filter(c => c.schoolYear === f.year);
    const lv = Array.from(new Set(inYear.map(c => c.schoolLevel))).filter(Boolean), lvName = id => ((window.SCHOOL_LEVELS || []).find(l => l.levelId === id) || {}).name || id;
    const byLv = inYear.filter(c => !f.level || c.schoolLevel === f.level), gr = Array.from(new Set(byLv.map(c => c.grade))).filter(Boolean).sort((a, b) => a - b);
    const cs = byLv.filter(c => !f.grade || c.grade === Number(f.grade)), c0 = cls(), les = lessonsOf(c0 ? c0.grade : f.grade);
    const sel = (id, label, opts, val, all0, dis) => `<label for="${id}">${label}</label><select id="${id}" ${dis ? "disabled" : ""}>${all0 === null ? "" : `<option value="">${all0}</option>`}${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
    document.getElementById("dash-filters").innerHTML = `<div class="filters" role="group" aria-label="Bộ lọc">
      ${sel("f-year", "Năm học", Array.from(new Set(all.map(c => c.schoolYear))).sort().reverse().map(y => [y, yearLabel(y)]), f.year, null)}
      ${sel("f-level", "Cấp học", lv.map(l => [l, lvName(l)]), f.level, "Tất cả")}
      ${sel("f-grade", "Khối", gr.map(g => [g, "Khối " + g]), f.grade, "Tất cả")}
      ${sel("f-class", "Lớp", cs.map(c => [c.classId, c.classId]), f.classId, "Chọn lớp…")}
      ${sel("f-lesson", "Bài học", les.map(l => [l.lessonId, l.title]), f.lessonId, "Chọn bài…", !f.classId)}</div>`;
  }
  function onChange(e) {
    const id = e.target.id, v = e.target.value, f = st.f; if (!/^f-/.test(id) && id !== "qf") return;
    if (id === "qf") { st.qfilter = v; return renderResponsesTable(); }
    if (id === "f-year") Object.assign(f, { year: v, level: "", grade: "", classId: "", lessonId: "" });
    else if (id === "f-level") Object.assign(f, { level: v, grade: "", classId: "", lessonId: "" });
    else if (id === "f-grade") Object.assign(f, { grade: v, classId: "", lessonId: "" });
    else if (id === "f-class") { const c = (st.classes || []).find(x => x.classId === v && x.schoolYear === f.year); Object.assign(f, { classId: v, lessonId: "" });
      if (c) { f.grade = String(c.grade || ""); f.level = c.schoolLevel || f.level; if (c.activeLessonId && lessonsOf(c.grade).some(l => l.lessonId === c.activeLessonId)) f.lessonId = c.activeLessonId; } }
    else if (id === "f-lesson") f.lessonId = v;
    st.data = {}; st.error = null; st.q = ""; st.filter = "all"; closePanel(true);
    const keep = document.activeElement && document.activeElement.id; renderFilters(); const kn = keep && document.getElementById(keep); if (kn) kn.focus(); renderContent();   // hiện "Đang tải…" ngay, gọi API sau khi người dùng ngừng thao tác
    clearTimeout(debounce); debounce = setTimeout(() => load(false, false), 250);
  }

  // ---------- tải dữ liệu ----------
  const params = force => ({ classId: st.f.classId, lessonId: st.f.lessonId, schoolYear: st.f.year, force: !!force });
  async function load(force, silent, onlyMissing) {
    if (!root || !st.f.classId || !st.f.lessonId) return renderContent();
    const keys = NEEDS[st.tab].filter(k => !onlyMissing || !st.data[k]); if (!keys.length) return renderContent();
    const seq = ++st.seq, snapshot = JSON.stringify(st.f);
    if (!silent) { st.loading = true; renderContent(); } else setStamp("Đang cập nhật…");
    const res = await Promise.all(keys.map(k => TeacherApi.call(ACTION[k], params(force))));
    if (!root || seq !== st.seq || snapshot !== JSON.stringify(st.f)) return;   // bộ lọc đã đổi: bỏ kết quả cũ
    const bad = res.find(r => !r.success);
    if (bad) { st.error = (bad.error && bad.error.code) || "NETWORK"; }
    else { keys.forEach((k, i) => { st.data[k] = res[i].data; }); st.loadedAt = Date.now(); st.error = null; }
    st.loading = false; renderContent();
  }
  function tick() {   // tự làm mới (dùng cache backend 30s để nhẹ quota)
    if (!root || st.paused || document.hidden || !st.f.classId || !st.f.lessonId || st.loading) return;
    load(false, true);
  }

  // ---------- hiển thị ----------
  function setStamp(txt) { const s = document.getElementById("stamp"); if (s) s.textContent = txt; }
  function renderContent() {
    const el = document.getElementById("dash-content"); if (!el) return;
    const keep = document.activeElement && document.activeElement.id === "q" ? document.activeElement.selectionStart : null;
    if (st.error && !st.classes) { el.innerHTML = errorBox(); return; }
    if (!st.f.classId) { el.innerHTML = classCards(); return; }
    const c = cls(), head = `<div class="dash-bar"><div><h2>Lớp ${esc(st.f.classId)}${st.f.lessonId ? " · " + esc(lessonTitle(st.f.lessonId)) : ""}</h2>
      <p class="muted">${c ? c.studentCount + " học sinh" : ""} · Năm học ${esc(yearLabel(st.f.year))}</p></div>
      <div class="dash-tools"><span id="stamp" role="status" aria-live="polite">${st.loadedAt ? "Cập nhật lúc: " + fmtClock(st.loadedAt) : ""}</span>
      <button class="btn small" data-act="refresh" ${st.f.lessonId ? "" : "disabled"}>Làm mới</button>
      <button class="btn small ghost" data-act="pause" aria-pressed="${st.paused}">${st.paused ? "Bật tự làm mới" : "Tạm dừng tự làm mới"}</button>
      <button class="btn small ghost" data-act="classes">← Các lớp</button></div></div>`;
    if (!st.f.lessonId) { el.innerHTML = head + `<div class="empty-note">Hãy chọn một bài học ở bộ lọc để xem tiến độ lớp.</div>`; return; }
    const tabs = `<div class="tabs" role="tablist" aria-label="Nội dung">${TABS.map(t => `<button role="tab" class="tab" data-tab="${t[0]}" aria-selected="${st.tab === t[0]}">${t[1]}</button>`).join("")}</div>`;
    let body;
    if (st.error) body = errorBox();
    else if (st.loading || !NEEDS[st.tab].every(k => st.data[k])) body = `<p class="muted loading" role="status">Đang tải dữ liệu lớp…</p>`;
    else body = ({ overview: tabOverview, activities: tabActivities, responses: tabResponses, exit: tabExit, live: tabLive })[st.tab]();
    el.innerHTML = head + tabs + `<div class="panel" role="tabpanel">${body}</div>`;
    if (!st.error && !st.loading && st.tab === "overview" && st.data.progress) renderProgressTable();
    if (!st.error && !st.loading && st.tab === "responses" && st.data.responses) renderResponsesTable();
    if (keep !== null) { const q = document.getElementById("q"); if (q) { q.focus(); q.setSelectionRange(keep, keep); } }
  }
  const errorBox = () => `<div class="empty-note error" role="alert"><p>${st.error === "UNAUTHORIZED" ? "Bạn chưa được phân công lớp này." : "Không thể tải dữ liệu lúc này."}</p><button class="btn small" data-act="retry">Thử lại</button></div>`;

  function classCards() {
    const list = (st.classes || []).filter(c => c.schoolYear === st.f.year && (!st.f.level || c.schoolLevel === st.f.level) && (!st.f.grade || c.grade === Number(st.f.grade)));
    if (st.error) return errorBox();
    if (!st.classes) return `<p class="muted loading">Đang tải danh sách lớp…</p>`;
    if (!list.length) return `<div class="empty-note">Chưa có lớp nào được phân công cho bộ lọc này.</div>`;
    return `<h2>Các lớp đang dạy</h2><div class="class-grid">${list.map(c => `<article class="class-card"><h3>${esc(c.classId)}</h3><p>${c.studentCount} học sinh</p>
      <p class="muted">${c.activeLessonId ? "Bài gần đây: " + esc(lessonTitle(c.activeLessonId)) : "Chưa có hoạt động học tập"}</p>
      ${c.activeLessonId ? `<p>${c.started} đã bắt đầu · ${c.completed} hoàn thành</p>` : ""}
      <button class="btn small" data-act="open-class" data-class="${esc(c.classId)}">Mở lớp</button></article>`).join("")}</div>`;
  }

  function tabOverview() {
    const o = st.data.bundle.overview, ss = st.data.progress.students, att = ss.filter(s => s.group !== "none").sort((a, b) => (a.group === "support" ? 0 : 1) - (b.group === "support" ? 0 : 1));
    if (!ss.length) return `<div class="empty-note">Lớp này chưa có học sinh.</div>`;
    const empty = o.started === 0 ? `<div class="empty-note">Chưa có hoạt động học tập cho bài này.</div>` : "";
    const card = (n, v) => `<div class="stat"><strong>${v}</strong><span>${n}</span></div>`, d = o.distribution, mx = Math.max(1, ...d.counts), t = o.time;
    return `${empty}<div class="stats">${card("Tổng học sinh", o.totalStudents)}${card("Đã bắt đầu", o.started)}${card("Hoàn thành", o.completed)}${card("Đang học", o.inProgress)}${card("Chưa học", o.notStarted)}${card("Cần hỗ trợ", o.needsSupport)}</div>
      <div class="two-col"><section><h3>Phân bố tiến độ</h3><ul class="dist">${d.labels.map((l, i) => `<li><span class="lbl">${l}</span><span class="bar"><span style="width:${d.counts[i] * 100 / mx}%"></span></span><span class="cnt">${d.counts[i]}</span></li>`).join("")}</ul>${d.unknown ? `<p class="muted">${d.unknown} học sinh chưa có % tiến độ.</p>` : ""}</section>
      <section><h3>Thời gian hoạt động</h3>${t.n ? `<dl class="kv"><dt>Trung bình</dt><dd>${fmtDur(t.avg)}</dd><dt>Trung vị</dt><dd>${fmtDur(t.median)}</dd><dt>Ít nhất</dt><dd>${fmtDur(t.min)}</dd><dt>Nhiều nhất</dt><dd>${fmtDur(t.max)}</dd></dl>` : `<p class="muted">Chưa có dữ liệu thời gian.</p>`}<p class="muted small-note">Thời gian học chỉ mang tính tham khảo, không dùng để đánh giá học sinh.</p></section></div>
      <section><h3>Học sinh cần quan tâm</h3><p class="muted small-note">Dựa trên tiêu chí hiển thị bên cạnh từng em, chỉ để giáo viên chủ động hỗ trợ.</p>
      ${att.length ? `<ul class="attention">${att.map(s => `<li><button class="link" data-act="student" data-uid="${esc(s.studentUid)}">${esc(s.fullName)}</button> <span class="tag ${s.group}">${s.group === "support" ? "Cần hỗ trợ" : "Cần theo dõi"}</span> <span class="muted">${s.reasons.map(r => esc(r.label)).join(" · ")}</span></li>`).join("")}</ul>` : `<p class="muted">Hiện chưa có học sinh nào thuộc diện cần quan tâm.</p>`}</section>
      <section><div class="table-head"><h3>Tiến độ lớp</h3><div class="table-tools">
      <label class="sr" for="q">Tìm học sinh</label><input id="q" type="search" placeholder="Tìm theo tên hoặc StudentID" value="${esc(st.q)}" autocomplete="off">
      <label class="sr" for="sf">Lọc trạng thái</label><select id="sf" data-role="sf">${[["all", "Tất cả"], ["not_started", "Chưa học"], ["in_progress", "Đang học"], ["completed", "Hoàn thành"], ["needs_support", "Cần hỗ trợ"]].map(x => `<option value="${x[0]}" ${st.filter === x[0] ? "selected" : ""}>${x[1]}</option>`).join("")}</select>
      <label class="sr" for="so">Sắp xếp</label><select id="so" data-role="so">${[["name", "Tên"], ["percent", "Tiến độ"], ["time", "Thời gian"], ["last", "Lần cuối học"], ["status", "Trạng thái"]].map(x => `<option value="${x[0]}" ${st.sort.key === x[0] ? "selected" : ""}>Sắp xếp: ${x[1]}</option>`).join("")}</select>
      <button class="btn small ghost" data-act="dir" aria-label="Đổi chiều sắp xếp">${st.sort.dir > 0 ? "↑" : "↓"}</button>
      <button class="btn small" data-act="csv-progress">Xuất CSV</button></div></div><div id="ptable" class="table-wrap"></div></section>`;
  }
  function viewRows() {
    const ord = { not_started: 0, in_progress: 1, completed: 2 }, q = plain(st.q.trim());
    let rows = st.data.progress.students.filter(s => (!q || plain(s.fullName).includes(q) || plain(s.studentId).includes(q)) &&
      (st.filter === "all" || (st.filter === "needs_support" ? s.needsSupport : s.status === st.filter)));
    const k = st.sort.key, val = s => k === "percent" ? (s.progress.percent || 0) : k === "time" ? (s.progress.activeSeconds || 0) : k === "last" ? Date.parse(s.progress.lastAccessAt || 0) || 0 : k === "status" ? ord[s.status] : 0;
    // Tên người Việt: sắp theo tên gọi (từ cuối) rồi đến họ tên đầy đủ.
    const given = n => String(n).trim().split(/\s+/).pop(), viCmp = (a, b) => given(a.fullName).localeCompare(given(b.fullName), "vi") || a.fullName.localeCompare(b.fullName, "vi");
    rows = rows.slice().sort((a, b) => k === "name" ? st.sort.dir * viCmp(a, b) : st.sort.dir * (val(a) - val(b)) || viCmp(a, b));
    return rows;
  }
  function renderProgressTable() {
    const t = document.getElementById("ptable"); if (!t) return; const rows = viewRows();
    t.innerHTML = rows.length ? `<table class="stack"><caption class="sr">Tiến độ học sinh trong lớp</caption><thead><tr><th scope="col">Học sinh</th><th scope="col">StudentID</th><th scope="col">Trạng thái</th><th scope="col">Tiến độ</th><th scope="col">Thời gian học</th><th scope="col">Lần truy cập cuối</th><th scope="col">Exit Ticket</th></tr></thead><tbody>
      ${rows.map(s => `<tr><th scope="row" data-label="Học sinh"><button class="link" data-act="student" data-uid="${esc(s.studentUid)}">${esc(s.fullName)}</button></th><td data-label="StudentID">${esc(s.studentId)}</td>
        <td data-label="Trạng thái">${STATUS[s.status]}${s.needsSupport ? ` <span class="tag support">Cần hỗ trợ</span>` : ""}</td><td data-label="Tiến độ">${bar(s.progress.percent)} ${pct(s.progress.percent)}</td>
        <td data-label="Thời gian học">${fmtDur(s.progress.activeSeconds)}</td><td data-label="Lần truy cập cuối">${fmtDT(s.progress.lastAccessAt)}</td>
        <td data-label="Exit Ticket">${s.exitTicket.submitted ? esc(s.exitTicket.levelLabel || "Đã nộp") : "Chưa nộp"}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Không có học sinh phù hợp.</p>`;
  }

  function tabActivities() {
    const b = st.data.bundle, total = b.overview.totalStudents, defs = ((lessonById(st.f.lessonId) || {}).activities || []).map(a => a.id), got = {};
    b.activities.forEach(a => { got[a.activityId] = a; });
    const ids = defs.concat(b.activities.map(a => a.activityId).filter(i => defs.indexOf(i) < 0));
    const acts = ids.length ? `<ul class="act-list">${ids.map(i => { const a = got[i] || { completed: 0, inProgressNow: 0 }; return `<li><span class="lbl">${esc(actTitle(st.f.lessonId, i))}</span>${bar(total ? Math.round(a.completed * 100 / total) : 0)}<span class="cnt">${a.completed}/${total} hoàn thành${a.inProgressNow ? ` · ${a.inProgressNow} đang làm` : ""}</span></li>`; }).join("")}</ul>` : `<p class="muted">Chưa có dữ liệu hoạt động cho bài này.</p>`;
    const qs = b.questions.length ? `<ul class="q-list">${b.questions.map(q => `<li><strong>${esc(q.questionId)}</strong> ${esc(q.text || "")}
      <div>${q.correctPct === null ? `<span class="muted">Chưa chấm (${q.answered} trả lời)</span>` : `Đúng: ${q.correctPct}% · Sai: ${q.wrongPct}% ${bar(q.correctPct)}`}</div>
      ${q.distribution.length ? `<div class="chips">${q.distribution.map(d => `<span class="chip">${esc(d.answer)}: ${d.count}</span>`).join("")}</div>` : ""}</li>`).join("")}</ul>` : `<p class="muted">Chưa có câu trả lời nào được ghi nhận cho bài này.</p>`;
    return `<section><h3>Hoạt động: lớp đang dừng ở đâu?</h3>${acts}</section><section><h3>Câu hỏi</h3>${qs}</section>`;
  }

  function tabExit() {
    const e = st.data.exit, s = e.summary;
    const sum = [["hieu_ro", "Hiểu rõ"], ["kha_hieu", "Khá hiểu"], ["chua_ro", "Chưa rõ"], ["can_ho_tro", "Cần hỗ trợ"]].map(x => `<div class="stat"><strong>${s[x[0]]}</strong><span>${x[1]}</span></div>`).join("") + `<div class="stat"><strong>${s.notSubmitted}</strong><span>Chưa nộp</span></div>`;
    return `<h3>Exit Ticket</h3><p class="muted small-note">Chỉ tổng hợp những gì học sinh đã chọn và viết; không phải kết luận về năng lực.</p><div class="stats">${sum}</div>
      <div class="table-head"><span></span><button class="btn small" data-act="csv-exit">Xuất CSV</button></div><div class="table-wrap"><table class="stack"><caption class="sr">Exit Ticket của lớp</caption><thead><tr><th scope="col">Họ tên</th><th scope="col">Mức hiểu</th><th scope="col">Điều học được</th><th scope="col">Điều chưa rõ</th><th scope="col">Vận dụng</th><th scope="col">Tự đánh giá</th><th scope="col">Thời gian nộp</th></tr></thead><tbody>
      ${e.rows.map(r => `<tr><th scope="row" data-label="Họ tên"><button class="link" data-act="student" data-uid="${esc(r.studentUid)}">${esc(r.fullName)}</button></th><td data-label="Mức hiểu">${r.submitted ? esc(r.levelLabel || "—") : "Chưa nộp"}</td><td data-label="Điều học được">${esc(r.learned || "—")}</td><td data-label="Điều chưa rõ">${esc(r.unclear || "—")}</td><td data-label="Vận dụng">${esc(r.application || "—")}</td><td data-label="Tự đánh giá">${esc(r.selfLabel || "—")}</td><td data-label="Thời gian nộp">${fmtDT(r.submittedAt)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function tabResponses() {
    const rows = st.data.responses.rows, qs = Array.from(new Set(rows.map(r => r.questionId))).sort();
    if (!rows.length) return `<div class="empty-note">Chưa có câu trả lời nào cho bài này.</div>`;
    return `<h3>Câu trả lời của học sinh</h3><p class="muted small-note">Chỉ xem, không chỉnh sửa câu trả lời.</p><div class="table-head"><span><label class="sr" for="qf">Lọc theo câu hỏi</label><select id="qf"><option value="">Tất cả câu hỏi</option>${qs.map(q => `<option ${q === st.qfilter ? "selected" : ""}>${esc(q)}</option>`).join("")}</select></span><button class="btn small" data-act="csv-responses">Xuất CSV</button></div><div id="rtable" class="table-wrap"></div>`;
  }
  function renderResponsesTable() {
    const t = document.getElementById("rtable"); if (!t) return; const rows = st.data.responses.rows.filter(r => !st.qfilter || r.questionId === st.qfilter);
    t.innerHTML = `<table class="stack"><caption class="sr">Câu trả lời</caption><thead><tr><th scope="col">Học sinh</th><th scope="col">Câu hỏi</th><th scope="col">Câu trả lời</th><th scope="col">Điểm</th><th scope="col">Số lần thử</th><th scope="col">Thời gian nộp</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row" data-label="Học sinh">${esc(r.fullName)}</th><td data-label="Câu hỏi">${esc(r.questionId)}${r.questionText ? " – " + esc(r.questionText) : ""}</td><td data-label="Câu trả lời">${esc(r.answer)}${r.isCorrect === true ? " (đúng)" : r.isCorrect === false ? " (sai)" : ""}</td><td data-label="Điểm">${r.score === null ? "—" : r.score}</td><td data-label="Số lần thử">${r.attempts === null ? "—" : r.attempts}</td><td data-label="Thời gian nộp">${fmtDT(r.submittedAt)}</td></tr>`).join("")}</tbody></table>`;
  }

  function tabLive() {
    const win = CONFIG.teacher.liveWindowMinutes, lim = Date.now() - win * 60000;
    const act = st.data.progress.students.filter(s => s.progress.lastAccessAt && Date.parse(s.progress.lastAccessAt) >= lim).sort((a, b) => Date.parse(b.progress.lastAccessAt) - Date.parse(a.progress.lastAccessAt));
    return `<h3>Hoạt động gần đây (${win} phút qua)</h3><p class="muted small-note">Dựa trên lần cập nhật cuối của từng em; không phải trạng thái trực tuyến. Dữ liệu có thể trễ vài chục giây.</p>
      ${act.length ? `<ul class="live">${act.map(s => `<li><button class="link" data-act="student" data-uid="${esc(s.studentUid)}">${esc(s.fullName)}</button><span>${s.progress.currentActivity ? esc(actTitle(st.f.lessonId, s.progress.currentActivity)) : "—"}</span><span class="muted">${rel(s.progress.lastAccessAt)}</span></li>`).join("")}</ul>` : `<div class="empty-note">Chưa có hoạt động trong ${win} phút gần đây.</div>`}`;
  }

  // ---------- hồ sơ học sinh ----------
  async function openStudent(uid, opener) {
    const p = document.getElementById("student-panel"); st.panel = { uid: uid, opener: opener };
    p.hidden = false; p.className = "side"; p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true"); p.setAttribute("aria-labelledby", "sp-title");
    p.innerHTML = `<div class="side-inner"><button class="btn small ghost close" data-act="close">Đóng</button><h2 id="sp-title" tabindex="-1">HỒ SƠ HỌC TẬP</h2><p class="muted loading">Đang tải…</p></div>`;
    document.getElementById("sp-title").focus();
    const r = await TeacherApi.call("getStudentLearningProfile", { classId: st.f.classId, lessonId: st.f.lessonId, schoolYear: st.f.year, studentUid: uid, force: true });
    if (!root || !st.panel || st.panel.uid !== uid) return;
    const inner = p.querySelector(".side-inner");
    if (!r.success) { inner.innerHTML = `<button class="btn small ghost close" data-act="close">Đóng</button><h2 id="sp-title" tabindex="-1">HỒ SƠ HỌC TẬP</h2><div class="empty-note error">Không thể tải hồ sơ lúc này.</div>`; return; }
    const d = r.data, s = d.student, de = d.detail, L = st.f.lessonId;
    const defs = ((lessonById(L) || {}).activities || []).map(a => a.id);
    const ids = de ? defs.concat(de.doneActivities.filter(i => defs.indexOf(i) < 0), de.currentActivity && defs.indexOf(de.currentActivity) < 0 && de.doneActivities.indexOf(de.currentActivity) < 0 ? [de.currentActivity] : []) : [];
    inner.innerHTML = `<button class="btn small ghost close" data-act="close">Đóng</button><h2 id="sp-title" tabindex="-1">HỒ SƠ HỌC TẬP</h2>
      <dl class="kv"><dt>Họ tên</dt><dd>${esc(s.fullName)}</dd><dt>StudentID</dt><dd>${esc(s.studentId)}</dd><dt>Lớp</dt><dd>${esc(s.classId)}</dd><dt>Khối</dt><dd>${esc(s.grade || "—")}</dd><dt>Năm học</dt><dd>${esc(yearLabel(s.schoolYear))}</dd></dl>
      <h3>Các bài học</h3>${d.lessons.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Bài</th><th scope="col">Trạng thái</th><th scope="col">Tiến độ</th><th scope="col">Điểm</th><th scope="col">Thời gian</th><th scope="col">Lần học cuối</th></tr></thead><tbody>${d.lessons.map(l => `<tr><th scope="row">${esc(lessonTitle(l.lessonId))}</th><td>${STATUS[l.status]}</td><td>${pct(l.percent)}</td><td>${l.score === null ? "—" : l.score}</td><td>${fmtDur(l.activeSeconds)}</td><td>${fmtDT(l.lastAccessAt)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Chưa có hoạt động học tập.</p>`}
      ${de ? `<h3>${esc(lessonTitle(L))}</h3>${de.reasons.length ? `<p><span class="tag ${de.needsSupport ? "support" : "watch"}">${de.needsSupport ? "Cần hỗ trợ" : "Cần theo dõi"}</span> <span class="muted">${de.reasons.map(x => esc(x.label)).join(" · ")}</span></p>` : ""}
        <h4>Hoạt động</h4>${ids.length ? `<ul class="acts">${ids.map(i => `<li>${esc(actTitle(L, i))}: <strong>${de.doneActivities.indexOf(i) >= 0 ? "✓ Hoàn thành" : de.currentActivity === i && de.status !== "completed" ? "Đang học" : "Chưa làm"}</strong></li>`).join("")}</ul>` : `<p class="muted">Chưa có dữ liệu hoạt động.</p>`}
        <h4>Câu trả lời</h4>${de.responses.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Câu hỏi</th><th scope="col">Câu trả lời</th><th scope="col">Điểm</th><th scope="col">Số lần thử</th><th scope="col">Thời gian nộp</th></tr></thead><tbody>${de.responses.map(x => `<tr><th scope="row">${esc(x.questionId)}</th><td>${esc(x.answer)}${x.isCorrect === true ? " (đúng)" : x.isCorrect === false ? " (sai)" : ""}</td><td>${x.score === null ? "—" : x.score}</td><td>${x.attempts === null ? "—" : x.attempts}</td><td>${fmtDT(x.submittedAt)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Chưa có câu trả lời.</p>`}
        <h4>Exit Ticket</h4>${de.exitTicket.submitted ? `<dl class="kv"><dt>Mức hiểu</dt><dd>${esc(de.exitTicket.levelLabel || "—")}</dd><dt>Điều học được</dt><dd>${esc(de.exitTicket.learned || "—")}</dd><dt>Điều chưa rõ</dt><dd>${esc(de.exitTicket.unclear || "—")}</dd><dt>Câu trả lời vận dụng</dt><dd>${esc(de.exitTicket.application || "—")}</dd><dt>Tự đánh giá</dt><dd>${esc(de.exitTicket.selfLabel || "—")}</dd><dt>Thời gian nộp</dt><dd>${fmtDT(de.exitTicket.submittedAt)}</dd></dl>` : `<p class="muted">Chưa nộp.</p>`}
        <h4>Dòng thời gian</h4>${de.timeline.length ? `<ol class="timeline">${de.timeline.map(x => `<li><time>${fmtDT(x.at).slice(11)}</time> ${esc(x.label)}</li>`).join("")}</ol>` : `<p class="muted">Chưa có sự kiện.</p>`}` : ""}`;
    document.getElementById("sp-title").focus();
  }
  function closePanel(silent) {
    const p = document.getElementById("student-panel"); if (!p || p.hidden) return;
    p.hidden = true; p.innerHTML = ""; const pn = st.panel; st.panel = null;
    if (!silent && pn) { // nút mở hồ sơ có thể đã được vẽ lại khi tự làm mới → tìm lại theo uid để trả focus đúng chỗ
      let o = pn.opener && document.body.contains(pn.opener) ? pn.opener : Array.prototype.find.call(document.querySelectorAll('[data-act="student"]'), b => b.dataset.uid === pn.uid);
      if (o) o.focus();
    }
  }
  function onKey(e) { if (e.key === "Escape") closePanel(); }

  // ---------- thao tác ----------
  const dateStr = () => new Date().toISOString().slice(0, 10);
  function onClick(e) {
    const t = e.target.closest("[data-act],[data-tab]"); if (!t) return;
    if (t.dataset.tab) { st.tab = t.dataset.tab; renderContent(); return load(false, false, true); }
    const a = t.dataset.act, f = st.f;
    if (a === "open-class") { const c = st.classes.find(x => x.classId === t.dataset.class && x.schoolYear === f.year); Object.assign(f, { classId: c.classId, grade: String(c.grade || ""), level: c.schoolLevel || "", lessonId: c.activeLessonId && lessonsOf(c.grade).some(l => l.lessonId === c.activeLessonId) ? c.activeLessonId : "" }); st.data = {}; st.tab = "overview"; st.q = ""; st.filter = "all"; closePanel(true); renderFilters(); renderContent(); load(false, false); }
    else if (a === "classes") { Object.assign(f, { classId: "", lessonId: "" }); st.data = {}; closePanel(true); renderFilters(); renderContent(); }
    else if (a === "refresh") load(true, false);
    else if (a === "retry") { st.error = null; if (!st.classes) loadClasses(); else load(true, false); }
    else if (a === "pause") { st.paused = !st.paused; renderContent(); }
    else if (a === "dir") { st.sort.dir *= -1; renderContent(); }
    else if (a === "student") openStudent(t.dataset.uid, t);
    else if (a === "close") closePanel();
    else if (a === "csv-progress") Csv.download("tien-do_" + f.classId + "_" + f.lessonId + "_" + dateStr() + ".csv", ["Họ tên", "StudentID", "Lớp", "Bài", "Trạng thái", "Cần hỗ trợ", "Lý do", "Tiến độ (%)", "Thời gian học (phút)", "Hoạt động hiện tại", "Lần truy cập cuối", "Exit Ticket"],
      st.data.progress.students.map(s => [s.fullName, s.studentId, f.classId, f.lessonId, STATUS[s.status], s.needsSupport ? "Có" : "Không", s.reasons.map(r => r.label).join("; "), s.progress.percent, s.progress.activeSeconds ? Math.round(s.progress.activeSeconds / 60) : "", s.progress.currentActivity, s.progress.lastAccessAt, s.exitTicket.submitted ? (s.exitTicket.levelLabel || "Đã nộp") : "Chưa nộp"]));
    else if (a === "csv-exit") Csv.download("exit-ticket_" + f.classId + "_" + f.lessonId + "_" + dateStr() + ".csv", ["Họ tên", "StudentID", "Mức hiểu", "Điều học được", "Điều chưa rõ", "Vận dụng", "Tự đánh giá", "Thời gian nộp"],
      st.data.exit.rows.map(r => [r.fullName, r.studentId, r.submitted ? r.levelLabel : "Chưa nộp", r.learned, r.unclear, r.application, r.selfLabel, r.submittedAt]));
    else if (a === "csv-responses") Csv.download("cau-tra-loi_" + f.classId + "_" + f.lessonId + "_" + dateStr() + ".csv", ["Họ tên", "StudentID", "Hoạt động", "Câu hỏi", "Nội dung câu hỏi", "Câu trả lời", "Đúng/Sai", "Điểm", "Số lần thử", "Thời gian nộp"],
      st.data.responses.rows.map(r => [r.fullName, r.studentId, r.activityId, r.questionId, r.questionText, r.answer, r.isCorrect === true ? "Đúng" : r.isCorrect === false ? "Sai" : "", r.score, r.attempts, r.submittedAt]));
  }
  function onInput(e) {
    if (e.target.id === "q") { clearTimeout(debounce); debounce = setTimeout(() => { st.q = e.target.value; renderProgressTable(); }, CONFIG.teacher.searchDebounceMs); }
    else if (e.target.dataset && e.target.dataset.role === "sf") { st.filter = e.target.value; renderProgressTable(); }
    else if (e.target.dataset && e.target.dataset.role === "so") { st.sort.key = e.target.value; renderProgressTable(); }
  }
  return { mount: mount, unmount: unmount, _state: () => st };
})();
