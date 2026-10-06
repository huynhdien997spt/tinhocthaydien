/**
 * TIN HỌC CÙNG THẦY DIỄN – V3 – Teacher Dashboard & Classroom Analytics (Google Apps Script)
 * File này dùng chung phạm vi toàn cục với Code.gs. Tất cả API ở đây CHỈ ĐỌC (không ghi vào dữ liệu V2).
 *
 * Phân quyền: sessionToken hợp lệ + role teacher/admin (requireRole_) + lớp phải nằm trong TEACHER_ASSIGNMENTS
 * (admin xem được mọi lớp). Backend lọc theo lớp+bài rồi mới trả về; không bao giờ trả hash/salt/token.
 *
 * Dữ liệu V2 được đọc theo TÊN CỘT (không phân biệt hoa thường), thử lần lượt các bí danh trong COLS.
 * Nếu sheet V2 của thầy đặt tên cột khác, chỉ cần thêm bí danh vào COLS bên dưới.
 */

const V3_CONFIG = {
  version: "3.0.0-rc.1",
  defaultSchoolYear: "2026-2027",   // phải trùng CONFIG.schoolYear ở frontend
  cacheSeconds: 30,                 // cache kết quả tổng hợp theo (năm, lớp, bài); nút "Làm mới" bỏ qua cache
  lowProgressPercent: 25,           // "Tiến độ thấp": dưới ngưỡng này và không hoạt động trong liveWindowMinutes
  inactiveDays: 3,                  // "Không hoạt động lâu": đã bắt đầu, chưa xong, quá số ngày này
  repeatedErrorAttempts: 3,         // "làm sai nhiều lần": IsCorrect = sai và Attempts >= ngưỡng
  liveWindowMinutes: 15,
  useResponsesForSupport: true,     // đặt false nếu sheet RESPONSES quá lớn và muốn đọc nhanh hơn
  maxTextChars: 1500,
  sheets: { assignments: "TEACHER_ASSIGNMENTS", notes: "TEACHER_NOTES", enrollments: "ENROLLMENTS", progress: "PROGRESS",
            responses: "RESPONSES", exitTickets: "EXIT_TICKETS", sessions: "LEARNING_SESSIONS", events: "EVENT_LOG" }
};

const ASSIGNMENTS_HEADERS = ["AssignmentID", "TeacherUID", "SchoolYear", "ClassID", "Subject", "Active", "TeacherUsername"]; // TeacherUsername: cột phụ để nhập cho dễ
const NOTES_HEADERS = ["NoteID", "TeacherUID", "StudentUID", "SchoolYear", "LessonID", "Note", "CreatedAt", "UpdatedAt"];
const U_ = ["StudentUID"], L_ = ["LessonID"], Y_ = ["SchoolYear"];
const COLS = {
  assignments: { teacherUid: ["TeacherUID"], year: Y_, classId: ["ClassID"], subject: ["Subject"], active: ["Active"] },
  enrollments: { uid: U_, classId: ["ClassID"], year: Y_, active: ["Active"] },
  progress: { uid: U_, lesson: L_, year: Y_, status: ["Status"], percent: ["PercentComplete", "Percent", "ProgressPercent"], currentActivity: ["CurrentActivityID", "CurrentActivity"],
    activeSeconds: ["TimeSpentSeconds", "ActiveSeconds"], lastAccess: ["LastAccessAt", "UpdatedAt"], startedAt: ["StartedAt", "FirstAccessAt", "CreatedAt"],
    completedAt: ["CompletedAt"], score: ["Score"], completedActivities: ["CompletedActivities"], flag: ["TeacherFlag"] },
  responses: { uid: U_, lesson: L_, year: Y_, activity: ["ActivityID"], qid: ["QuestionID"], qtext: ["QuestionText"], qtype: ["ResponseType", "QuestionType"], answer: ["ResponseValue", "Answer", "Response"],
    correct: ["IsCorrect"], score: ["Score"], attempts: ["AttemptNumber", "AttemptCount", "Attempts"], at: ["SubmittedAt", "UpdatedAt"], required: ["Required"] },
  exitTickets: { uid: U_, lesson: L_, year: Y_, level: ["UnderstandingLevel"], learned: ["KeyLearning", "Learned"], unclear: ["StillConfused", "Unclear", "StillUnclear"], application: ["ApplicationAnswer"], self: ["SelfAssessment"], at: ["SubmittedAt", "CreatedAt"] },
  sessions: { uid: U_, lesson: L_, year: Y_, seconds: ["ActiveSeconds"] },
  events: { uid: U_, lesson: L_, year: Y_, type: ["EventType"], activity: ["ActivityID"], at: ["CreatedAt", "EventAt", "Timestamp"], status: ["Status"] }
};
const LEVEL_LABELS = { hieu_ro: "Hiểu rõ", kha_hieu: "Khá hiểu", chua_ro: "Chưa rõ", can_ho_tro: "Cần hỗ trợ" };

/* ============================ ĐIỂM VÀO ============================ */

function dispatchTeacherV3_(req) {
  switch (req.action) {
    case "getTeacherClasses":          return getTeacherClasses_(req);
    case "getClassOverview":           return scoped_(req, "overview", { lesson: true, cache: true }, overview_);
    case "getClassProgress":           return scoped_(req, "progress", { lesson: true, cache: true }, progressList_);
    case "getStudentsNeedingSupport":  return scoped_(req, "support", { lesson: true, cache: true }, supportList_);
    case "getActivityAnalytics":       return scoped_(req, "activity", { lesson: true, cache: true, activities: true }, activities_);
    case "getQuestionAnalytics":       return scoped_(req, "question", { lesson: true, cache: true }, questions_);
    case "getLessonAnalytics":         return scoped_(req, "lesson", { lesson: true, cache: true, activities: true }, lessonBundle_);
    case "getClassExitTickets":        return scoped_(req, "exit", { lesson: true }, exitTickets_);
    case "getClassResponses":          return scoped_(req, "responses", { lesson: true }, classResponses_);
    case "getStudentLearningProfile":  return studentProfile_(req);
    default: throw E_("UNKNOWN_ACTION");
  }
}

/** Xác thực + kiểm tra lớp được phân công TRƯỚC khi đọc dữ liệu hay dùng cache. */
function scoped_(req, name, o, build) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]);
  const scope = scopeOf_(req, ctx, o.lesson);
  const run = function () {
    const out = build(buildModel_(scope.classId, scope.year, scope.lessonId, o), ctx);
    out.classId = scope.classId; out.lessonId = scope.lessonId; out.schoolYear = scope.year; out.generatedAt = iso_(Date.now());
    return out;
  };
  return o.cache ? cached_(req, name, [scope.year, scope.classId, scope.lessonId], run) : run();
}
function scopeOf_(req, ctx, needLesson) {
  const classId = str_(req.classId, 30), year = str_(req.schoolYear, 20) || V3_CONFIG.defaultSchoolYear, lessonId = str_(req.lessonId, 40);
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(classId) || !/^[0-9]{4}-[0-9]{4}$/.test(year)) throw E_("BAD_REQUEST");
  if ((needLesson || lessonId) && !/^[A-Za-z0-9_-]{1,40}$/.test(lessonId)) throw E_("BAD_REQUEST");
  if (ctx.user.Role !== "admin") {
    const tuid = String(ctx.user.TeacherUID || "");
    const t = openV2_("assignments");
    const ok = !!tuid && t.data.some(function (r) {
      return String(c_(t, r, "teacherUid")) === tuid && String(c_(t, r, "classId")) === classId && String(c_(t, r, "year")) === year && truthy_(c_(t, r, "active"));
    });
    if (!ok) throw E_("UNAUTHORIZED");
  }
  return { classId: classId, year: year, lessonId: lessonId };
}
function cached_(req, name, parts, fn) {
  const key = ["v3", name].concat(parts).join("|").slice(0, 240), cache = CacheService.getScriptCache();
  if (!req.force && V3_CONFIG.cacheSeconds > 0) { try { const c = cache.get(key); if (c) return JSON.parse(c); } catch (e) {} }
  const out = fn();
  try { const s = JSON.stringify(out); if (s.length < 90000) cache.put(key, s, V3_CONFIG.cacheSeconds); } catch (e) {}
  return out;
}

/* ============================ ĐỌC SHEET THEO TÊN CỘT (batch) ============================ */

function openV2_(key) {
  const sh = getSS_().getSheetByName(V3_CONFIG.sheets[key]);
  if (!sh || sh.getLastRow() < 2) return { exists: !!sh, data: [], ix: {} };
  const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();   // MỘT lần đọc cho cả sheet
  const head = vals[0].map(function (h) { return String(h).trim().toLowerCase(); }), spec = COLS[key], ix = {};
  Object.keys(spec).forEach(function (k) {
    for (let i = 0; i < spec[k].length; i++) { const p = head.indexOf(spec[k][i].toLowerCase()); if (p >= 0) { ix[k] = p; break; } }
  });
  return { exists: true, data: vals.slice(1), ix: ix };
}
function c_(t, row, k) { const i = t.ix[k]; return i === undefined ? "" : row[i]; }
function num_(v) { if (v === "" || v === null || v === undefined) return null; const n = Number(v); return isFinite(n) ? n : null; }
function yearOk_(t, row, year) { if (t.ix.year === undefined) return true; const y = String(row[t.ix.year]).trim(); return !y || y === year; }
function tri_(v) { const s = String(v).trim().toLowerCase(); if (v === true || s === "true" || s === "1" || s === "đúng") return true; if (v === false || s === "false" || s === "0" || s === "sai") return false; return null; }
function text_(v) { return String(v === null || v === undefined ? "" : v).slice(0, V3_CONFIG.maxTextChars); }
function isoOrEmpty_(ms) { return ms > 0 ? iso_(ms) : ""; }
function plain_(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
/** ResponseValue có thể là JSON (nhiều lựa chọn) → hiển thị 'A, C'. */
function answerText_(v) {
  const s = text_(v);
  if (s.charAt(0) === "[") { try { const a = JSON.parse(s); if (Array.isArray(a)) return a.join(", "); } catch (e) {} }
  return s;
}
function level_(v) {
  const n = plain_(v);
  const m = { "4": "hieu_ro", hieu_ro: "hieu_ro", clear: "hieu_ro", "3": "kha_hieu", kha_hieu: "kha_hieu", "2": "chua_ro", chua_ro: "chua_ro", unclear: "chua_ro", good: "kha_hieu",
              "1": "can_ho_tro", can_ho_tro: "can_ho_tro", need_support: "can_ho_tro", needs_support: "can_ho_tro" };
  return m[n] || "";
}
function statusNorm_(v) {
  const n = plain_(v);
  if (/^(completed|complete|done|hoan_thanh)$/.test(n)) return "completed";
  if (/^(in_progress|started|learning|dang_hoc)$/.test(n)) return "in_progress";
  return "not_started";
}
function listOf_(v) {
  const s = String(v || "").trim(); if (!s) return [];
  if (s.charAt(0) === "[") { try { return JSON.parse(s).map(String); } catch (e) {} }
  return s.split(/[;,\s]+/).filter(Boolean);
}

/* ============================ LỚP HỌC (roster) ============================ */

/** key "năm|lớp" → { classId, year, members: [USERS rows của học sinh đang hoạt động] }. Dùng ENROLLMENTS nếu có dữ liệu, ngược lại dùng USERS. */
function buildRosters_() {
  const ut = table_(AUTH_CONFIG.sheets.users), byUid = {}, rosters = {};
  ut.rows.forEach(function (r) { if (r.StudentUID && r.Role === "student" && truthy_(r.Active)) byUid[r.StudentUID] = r; });
  const add = function (uid, classId, year) {
    const u = byUid[uid]; if (!u || !classId) return;
    const k = year + "|" + classId; (rosters[k] = rosters[k] || { classId: classId, year: year, members: [] }).members.push(u);
  };
  const en = openV2_("enrollments");
  if (en.exists && en.data.length) {
    en.data.forEach(function (r) {
      const a = c_(en, r, "active"); if (String(a) !== "" && !truthy_(a)) return;
      add(String(c_(en, r, "uid")), String(c_(en, r, "classId")), String(c_(en, r, "year")));
    });
  } else Object.keys(byUid).forEach(function (uid) { add(uid, String(byUid[uid].ClassID), String(byUid[uid].SchoolYear)); });
  Object.keys(rosters).forEach(function (k) { rosters[k].members.sort(function (a, b) { return String(a.StudentID).localeCompare(String(b.StudentID)); }); });
  return rosters;
}
function classMeta_(members, classId) {
  const g = {}, l = {};
  members.forEach(function (u) { g[u.Grade] = (g[u.Grade] || 0) + 1; l[u.SchoolLevel] = (l[u.SchoolLevel] || 0) + 1; });
  const top = function (o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0]; };
  let grade = Number(top(g)) || Number((String(classId).match(/^\d+/) || [0])[0]) || null;
  let level = top(l) || (grade ? (grade <= 5 ? "TIEUHOC" : grade <= 9 ? "THCS" : "THPT") : "");
  return { grade: grade, schoolLevel: level };
}

/* ============================ MÔ HÌNH LỚP + BÀI ============================ */

function progRec_(t, r) {
  const pct = num_(c_(t, r, "percent"));
  return { status: c_(t, r, "status"), percent: pct === null ? null : Math.max(0, Math.min(100, pct)), currentActivity: String(c_(t, r, "currentActivity") || ""),
    activeSeconds: num_(c_(t, r, "activeSeconds")), lastAccess: ms_(c_(t, r, "lastAccess")), startedAt: ms_(c_(t, r, "startedAt")), completedAt: ms_(c_(t, r, "completedAt")),
    score: num_(c_(t, r, "score")), flag: truthy_(c_(t, r, "flag")), done: t.ix.completedActivities === undefined ? null : listOf_(c_(t, r, "completedActivities")) };
}
function baseStatus_(p) {
  if (!p) return "not_started";
  if (statusNorm_(p.status) === "completed" || (p.percent !== null && p.percent >= 100)) return "completed";
  if (statusNorm_(p.status) === "in_progress" || (p.percent !== null && p.percent > 0) || p.activeSeconds > 0) return "in_progress";
  return "not_started";
}

function buildModel_(classId, year, lessonId, o) {
  o = o || {};
  if (!v2Ready_()) throw E_("V2_NOT_SETUP");
  const members = (buildRosters_()[year + "|" + classId] || { members: [] }).members, uidSet = {}, now = Date.now();
  members.forEach(function (u) { uidSet[u.StudentUID] = true; });
  const mine = function (t, r) { return uidSet[String(c_(t, r, "uid"))] && String(c_(t, r, "lesson")) === lessonId && yearOk_(t, r, year); };

  const pt = openV2_("progress"), prog = {};
  pt.data.forEach(function (r) {
    if (!mine(pt, r)) return;
    const uid = String(c_(pt, r, "uid")), cur = prog[uid];
    if (!cur || ms_(c_(pt, r, "lastAccess")) >= cur.lastAccess) { const rec = progRec_(pt, r); prog[uid] = rec; }
  });

  const resp = {}, rt = (V3_CONFIG.useResponsesForSupport || o.responses) ? openV2_("responses") : { data: [], ix: {} };
  rt.data.forEach(function (r) {
    if (!mine(rt, r)) return;
    const uid = String(c_(rt, r, "uid")), q = String(c_(rt, r, "qid")), at = ms_(c_(rt, r, "at")), m = (resp[uid] = resp[uid] || {});
    if (m[q] && m[q].at > at) return;
    m[q] = { activityId: String(c_(rt, r, "activity")), questionId: q, questionText: text_(c_(rt, r, "qtext")), type: String(c_(rt, r, "qtype")), answer: answerText_(c_(rt, r, "answer")),
      isCorrect: tri_(c_(rt, r, "correct")), score: num_(c_(rt, r, "score")), attempts: num_(c_(rt, r, "attempts")), at: at, required: rt.ix.required === undefined ? null : tri_(c_(rt, r, "required")) };
  });

  const et = openV2_("exitTickets"), exit = {};
  et.data.forEach(function (r) {
    if (!mine(et, r)) return;
    const uid = String(c_(et, r, "uid")), at = ms_(c_(et, r, "at"));
    if (!exit[uid] || at >= exit[uid].at) exit[uid] = { level: level_(c_(et, r, "level")), learned: text_(c_(et, r, "learned")), unclear: text_(c_(et, r, "unclear")), application: text_(c_(et, r, "application")), self: level_(c_(et, r, "self")), at: at };
  });

  const events = {};
  if (o.events || (o.activities && pt.ix.completedActivities === undefined)) {
    const ev = openV2_("events");
    ev.data.forEach(function (r) {
      if (!mine(ev, r)) return;
      const sst = ev.ix.status === undefined ? "" : String(r[ev.ix.status]).trim().toLowerCase(); if (sst && sst !== "processed") return;
      const uid = String(c_(ev, r, "uid")); (events[uid] = events[uid] || []).push({ type: String(c_(ev, r, "type")), activity: String(c_(ev, r, "activity")), at: ms_(c_(ev, r, "at")) });
    });
    Object.keys(events).forEach(function (k) { events[k].sort(function (a, b) { return a.at - b.at; }); });
  }
  if (pt.ix.activeSeconds === undefined) {   // dự phòng: cộng thời gian từ LEARNING_SESSIONS
    const st = openV2_("sessions");
    st.data.forEach(function (r) { if (mine(st, r)) { const p = prog[String(c_(st, r, "uid"))]; if (p) p.activeSeconds = (p.activeSeconds || 0) + (num_(c_(st, r, "seconds")) || 0); } });
  }

  const students = members.map(function (u) { return studentRec_(u, prog[u.StudentUID] || null, exit[u.StudentUID] || null, resp[u.StudentUID] || {}, events[u.StudentUID] || [], now); });
  return { members: members, students: students, events: events, activityIdsSeen: (function () {
    const s = {}; students.forEach(function (x) { x.doneActivities.forEach(function (a) { s[a] = 1; }); if (x.currentActivity) s[x.currentActivity] = 1; }); return s; })() };
}

function studentRec_(u, p, ex, resp, events, now) {
  const base = baseStatus_(p), pct = base === "completed" ? 100 : (p ? p.percent : 0), last = p ? p.lastAccess : 0;
  const done = p && p.done !== null ? p.done : events.filter(function (e) { return /complet/i.test(e.type) && e.activity && !/exit|lesson/i.test(e.type); }).map(function (e) { return e.activity; });
  const support = [], watch = [], recent = last && (now - last) <= V3_CONFIG.liveWindowMinutes * 60000;
  if (ex && ex.level === "can_ho_tro") support.push({ code: "exit_ticket", label: "Exit Ticket: Cần hỗ trợ" });
  if (ex && ex.self === "can_ho_tro") support.push({ code: "self_assessment", label: "Tự đánh giá: Cần hỗ trợ" });
  if (p && p.flag) support.push({ code: "teacher_flag", label: "Giáo viên đã đánh dấu" });
  const wrong = Object.keys(resp).filter(function (q) { const r = resp[q]; return r.isCorrect === false && r.attempts !== null && r.attempts >= V3_CONFIG.repeatedErrorAttempts && r.required !== false; });
  if (wrong.length) support.push({ code: "repeated_errors", label: "Làm sai nhiều lần: " + wrong.slice(0, 3).join(", ") });
  if (base === "not_started") watch.push({ code: "not_started", label: "Chưa bắt đầu" });
  if (base === "in_progress" && pct !== null && pct < V3_CONFIG.lowProgressPercent && !recent) watch.push({ code: "low_progress", label: "Tiến độ dưới " + V3_CONFIG.lowProgressPercent + "%" });
  if (base === "in_progress" && last && now - last > V3_CONFIG.inactiveDays * 86400000) watch.push({ code: "inactive", label: "Chưa hoạt động " + Math.floor((now - last) / 86400000) + " ngày" });
  if (ex && ex.level === "chua_ro") watch.push({ code: "exit_unclear", label: "Exit Ticket: Chưa rõ" });
  return {
    studentUid: u.StudentUID, studentId: u.StudentID, fullName: u.FullName, status: base, needsSupport: support.length > 0,
    group: support.length ? "support" : (watch.length ? "watch" : "none"), reasons: support.concat(watch),
    percent: pct, currentActivity: p ? p.currentActivity : "", activeSeconds: p ? p.activeSeconds : null, lastAccess: last, startedAt: p ? p.startedAt : 0,
    completedAt: p ? p.completedAt : 0, score: p ? p.score : null, doneActivities: done,
    exit: ex ? { submitted: true, level: ex.level, self: ex.self, learned: ex.learned, unclear: ex.unclear, application: ex.application, at: ex.at } : { submitted: false, level: "", self: "", learned: "", unclear: "", application: "", at: 0 },
    responses: Object.keys(resp).map(function (q) { return resp[q]; })
  };
}

/* ============================ ĐẦU RA CÁC API ============================ */

function publicStudent_(s) {
  return { studentUid: s.studentUid, studentId: s.studentId, fullName: s.fullName, status: s.status, needsSupport: s.needsSupport, group: s.group, reasons: s.reasons,
    progress: { status: s.status === "in_progress" ? "in_progress" : s.status, percent: s.percent, currentActivity: s.currentActivity, activeSeconds: s.activeSeconds,
      lastAccessAt: isoOrEmpty_(s.lastAccess), startedAt: isoOrEmpty_(s.startedAt), completedAt: isoOrEmpty_(s.completedAt), score: s.score },
    exitTicket: { submitted: s.exit.submitted, level: s.exit.level, levelLabel: LEVEL_LABELS[s.exit.level] || "", submittedAt: isoOrEmpty_(s.exit.at) } };
}
function overview_(m) {
  const ss = m.students, c = { totalStudents: ss.length, started: 0, completed: 0, inProgress: 0, notStarted: 0, needsSupport: 0 };
  const counts = [0, 0, 0, 0, 0], secs = [];
  let unknown = 0;
  ss.forEach(function (s) {
    if (s.status === "completed") { c.completed++; c.started++; } else if (s.status === "in_progress") { c.inProgress++; c.started++; } else c.notStarted++;
    if (s.needsSupport) c.needsSupport++;
    if (s.percent === null) unknown++; else counts[s.percent >= 100 ? 4 : s.percent > 75 ? 3 : s.percent > 50 ? 2 : s.percent > 25 ? 1 : 0]++;
    if (s.activeSeconds > 0) secs.push(s.activeSeconds);
  });
  secs.sort(function (a, b) { return a - b; });
  const n = secs.length, sum = secs.reduce(function (a, b) { return a + b; }, 0);
  c.distribution = { labels: ["0–25%", "26–50%", "51–75%", "76–99%", "100%"], counts: counts, unknown: unknown };
  c.time = { n: n, avg: n ? Math.round(sum / n) : 0, median: n ? (n % 2 ? secs[(n - 1) / 2] : Math.round((secs[n / 2 - 1] + secs[n / 2]) / 2)) : 0, min: n ? secs[0] : 0, max: n ? secs[n - 1] : 0 };
  return c;
}
function progressList_(m) { return { students: m.students.map(publicStudent_) }; }
function supportList_(m) {
  const rank = { support: 0, watch: 1 };
  return { students: m.students.filter(function (s) { return s.group !== "none"; }).sort(function (a, b) { return rank[a.group] - rank[b.group] || String(a.studentId).localeCompare(String(b.studentId)); }).map(publicStudent_) };
}
function activities_(m) {
  const total = m.students.length, out = Object.keys(m.activityIdsSeen).sort().map(function (id) {
    return { activityId: id, completed: m.students.filter(function (s) { return s.doneActivities.indexOf(id) >= 0; }).length,
      inProgressNow: m.students.filter(function (s) { return s.status === "in_progress" && s.currentActivity === id && s.doneActivities.indexOf(id) < 0; }).length, total: total };
  });
  return { activities: out, total: total };
}
function questions_(m) {
  const by = {};
  m.students.forEach(function (s) { s.responses.forEach(function (r) { (by[r.questionId] = by[r.questionId] || []).push(r); }); });
  const out = Object.keys(by).sort().map(function (q) {
    const rs = by[q], ok = rs.filter(function (r) { return r.isCorrect === true; }).length, bad = rs.filter(function (r) { return r.isCorrect === false; }).length, graded = ok + bad, dist = {};
    rs.forEach(function (r) {
      const items = r.answer.charAt(0) === "[" ? (function () { try { return JSON.parse(r.answer).map(String); } catch (e) { return [r.answer]; } })() : [r.answer];
      items.forEach(function (a) { if (a.length <= 60) dist[a] = (dist[a] || 0) + 1; });
    });
    const keys = Object.keys(dist);
    return { questionId: q, text: rs[0].questionText, type: rs[0].type, answered: rs.length, correct: ok, wrong: bad, ungraded: rs.length - graded,
      correctPct: graded ? Math.round(ok * 100 / graded) : null, wrongPct: graded ? Math.round(bad * 100 / graded) : null,
      distribution: keys.length && keys.length <= 8 ? keys.map(function (k) { return { answer: k, count: dist[k] }; }).sort(function (a, b) { return b.count - a.count; }) : [] };
  });
  return { questions: out, total: m.students.length };
}
function exitSummary_(m) {
  const s = { hieu_ro: 0, kha_hieu: 0, chua_ro: 0, can_ho_tro: 0, otherSubmitted: 0, notSubmitted: 0, total: m.students.length };
  m.students.forEach(function (x) { if (!x.exit.submitted) s.notSubmitted++; else if (s[x.exit.level] !== undefined) s[x.exit.level]++; else s.otherSubmitted++; });
  return s;
}
function exitTickets_(m) {
  return { summary: exitSummary_(m), rows: m.students.map(function (s) {
    return { studentUid: s.studentUid, studentId: s.studentId, fullName: s.fullName, submitted: s.exit.submitted, level: s.exit.level, levelLabel: LEVEL_LABELS[s.exit.level] || "",
      learned: s.exit.learned, unclear: s.exit.unclear, application: s.exit.application, selfAssessment: s.exit.self, selfLabel: LEVEL_LABELS[s.exit.self] || "", submittedAt: isoOrEmpty_(s.exit.at) };
  }) };
}
function classResponses_(m) {
  const rows = [];
  m.students.forEach(function (s) { s.responses.forEach(function (r) {
    rows.push({ studentUid: s.studentUid, studentId: s.studentId, fullName: s.fullName, activityId: r.activityId, questionId: r.questionId, questionText: r.questionText,
      answer: r.answer, isCorrect: r.isCorrect, score: r.score, attempts: r.attempts, submittedAt: isoOrEmpty_(r.at) });
  }); });
  return { rows: rows };
}
function lessonBundle_(m) { return { overview: overview_(m), activities: activities_(m).activities, questions: questions_(m).questions, exitSummary: exitSummary_(m) }; }

function studentProfile_(req) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]), scope = scopeOf_(req, ctx, false), uid = str_(req.studentUid, 80);
  const members = (buildRosters_()[scope.year + "|" + scope.classId] || { members: [] }).members;
  const u = members.filter(function (x) { return x.StudentUID === uid; })[0];
  if (!u) throw E_("NOT_FOUND");                       // học sinh không thuộc lớp này (hoặc lớp không được phép)
  const meta = classMeta_(members, scope.classId), out = { student: { studentUid: uid, fullName: u.FullName, studentId: u.StudentID, classId: scope.classId, grade: meta.grade, schoolLevel: meta.schoolLevel, schoolYear: scope.year } };
  const pt = openV2_("progress"), byLesson = {};
  pt.data.forEach(function (r) {
    if (String(c_(pt, r, "uid")) !== uid || !yearOk_(pt, r, scope.year)) return;
    const l = String(c_(pt, r, "lesson")), p = progRec_(pt, r);
    if (!byLesson[l] || p.lastAccess >= byLesson[l].lastAccess) byLesson[l] = p;
  });
  out.lessons = Object.keys(byLesson).sort().map(function (l) {
    const p = byLesson[l], st = baseStatus_(p);
    return { lessonId: l, status: st, percent: st === "completed" ? 100 : p.percent, score: p.score, activeSeconds: p.activeSeconds, lastAccessAt: isoOrEmpty_(p.lastAccess) };
  });
  if (scope.lessonId) {
    const m = buildModel_(scope.classId, scope.year, scope.lessonId, { events: true, activities: true, responses: true });
    const s = m.students.filter(function (x) { return x.studentUid === uid; })[0], ev = m.events[uid] || [];
    out.detail = { lessonId: scope.lessonId, status: s.status, needsSupport: s.needsSupport, reasons: s.reasons, percent: s.percent, currentActivity: s.currentActivity, doneActivities: s.doneActivities,
      activeSeconds: s.activeSeconds, lastAccessAt: isoOrEmpty_(s.lastAccess), score: s.score,
      responses: s.responses.sort(function (a, b) { return a.at - b.at; }).map(function (r) { return { activityId: r.activityId, questionId: r.questionId, questionText: r.questionText, answer: r.answer, isCorrect: r.isCorrect, score: r.score, attempts: r.attempts, submittedAt: isoOrEmpty_(r.at) }; }),
      exitTicket: { submitted: s.exit.submitted, level: s.exit.level, levelLabel: LEVEL_LABELS[s.exit.level] || "", selfAssessment: s.exit.self, selfLabel: LEVEL_LABELS[s.exit.self] || "", learned: s.exit.learned, unclear: s.exit.unclear, application: s.exit.application, submittedAt: isoOrEmpty_(s.exit.at) },
      timeline: timeline_(ev, s) };
  }
  out.generatedAt = iso_(Date.now());
  return out;
}
/** Dùng EVENT_LOG nếu có; nếu không có thì ghép từ mốc bắt đầu/hoàn thành/Exit Ticket đã lưu. Gộp các lần lưu liên tiếp. */
function timeline_(ev, s) {
  const out = [], lastSave = {};
  ev.forEach(function (e) {
    const t = e.type.toLowerCase();
    if (/exit/.test(t)) out.push({ at: e.at, label: "Nộp Exit Ticket" });
    else if (/lesson/.test(t) && /start/.test(t)) out.push({ at: e.at, label: "Bắt đầu bài" });
    else if (/lesson/.test(t) && /complet/.test(t)) out.push({ at: e.at, label: "Hoàn thành bài" });
    else if (/complet/.test(t) && e.activity) out.push({ at: e.at, label: "Hoàn thành " + e.activity });
    else if (/save/.test(t) && e.activity) lastSave[e.activity] = e.at;
    else if (/start/.test(t) && !e.activity) out.push({ at: e.at, label: "Bắt đầu bài" });
  });
  Object.keys(lastSave).forEach(function (a) { out.push({ at: lastSave[a], label: "Lưu " + a }); });
  if (!out.length) {
    if (s.startedAt) out.push({ at: s.startedAt, label: "Bắt đầu bài" });
    if (s.completedAt) out.push({ at: s.completedAt, label: "Hoàn thành bài" });
    if (s.exit.submitted && s.exit.at) out.push({ at: s.exit.at, label: "Nộp Exit Ticket" });
  }
  return out.sort(function (a, b) { return a.at - b.at; }).slice(0, 200).map(function (x) { return { at: isoOrEmpty_(x.at), label: x.label }; });
}

function getTeacherClasses_(req) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]);
  if (!v2Ready_()) throw E_("V2_NOT_SETUP");
  const rosters = buildRosters_(), list = [];
  if (ctx.user.Role === "admin") Object.keys(rosters).forEach(function (k) { list.push({ classId: rosters[k].classId, year: rosters[k].year, subject: "" }); });
  else {
    const tuid = String(ctx.user.TeacherUID || ""), t = openV2_("assignments"), seen = {};
    t.data.forEach(function (r) {
      const cls = String(c_(t, r, "classId")), y = String(c_(t, r, "year")), k = y + "|" + cls;
      if (tuid && String(c_(t, r, "teacherUid")) === tuid && truthy_(c_(t, r, "active")) && !seen[k]) { seen[k] = 1; list.push({ classId: cls, year: y, subject: String(r[t.ix.subject] || "") }); }
    });
  }
  const uidKeys = {}, stats = {};
  list.forEach(function (c) { c.key = c.year + "|" + c.classId; (rosters[c.key] ? rosters[c.key].members : []).forEach(function (u) { (uidKeys[u.StudentUID] = uidKeys[u.StudentUID] || []).push(c.key); }); stats[c.key] = {}; });
  const pt = openV2_("progress"), latest = {};
  pt.data.forEach(function (r) {
    const uid = String(c_(pt, r, "uid")); if (!uidKeys[uid]) return;
    const l = String(c_(pt, r, "lesson")), k = uid + "|" + l, p = progRec_(pt, r);
    if (!latest[k] || p.lastAccess >= latest[k].p.lastAccess) latest[k] = { uid: uid, lesson: l, p: p, year: pt.ix.year === undefined ? "" : String(r[pt.ix.year]).trim() };
  });
  Object.keys(latest).forEach(function (k) {
    const x = latest[k];
    uidKeys[x.uid].forEach(function (ck) {
      if (x.year && ck.split("|")[0] !== x.year) return;
      const L = (stats[ck][x.lesson] = stats[ck][x.lesson] || { last: 0, started: 0, completed: 0 }), st = baseStatus_(x.p);
      L.last = Math.max(L.last, x.p.lastAccess); if (st !== "not_started") L.started++; if (st === "completed") L.completed++;
    });
  });
  return { classes: list.map(function (c) {
    const members = rosters[c.key] ? rosters[c.key].members : [], meta = classMeta_(members, c.classId), ls = stats[c.key];
    const active = Object.keys(ls).sort(function (a, b) { return ls[b].last - ls[a].last; })[0] || "";
    return { classId: c.classId, schoolYear: c.year, subject: c.subject, grade: meta.grade, schoolLevel: meta.schoolLevel, studentCount: members.length,
      activeLessonId: active, started: active ? ls[active].started : 0, completed: active ? ls[active].completed : 0 };
  }).sort(function (a, b) { return String(b.schoolYear).localeCompare(String(a.schoolYear)) || String(a.classId).localeCompare(String(b.classId), "vi", { numeric: true }); }),
    generatedAt: iso_(Date.now()) };
}

/* ============================ SETUP / MIGRATION V3 (chạy trong trình soạn thảo hoặc menu Sheet) ============================ */

/** Chỉ tạo phần của V3: TEACHER_ASSIGNMENTS, TEACHER_NOTES (+ cột TeacherUID). Cần setupV2() đã chạy. Chạy nhiều lần an toàn, không xóa dữ liệu. */
function setupV3() {
  assertV2Ready_();                                     // V2_NOT_SETUP nếu chưa chạy setupV2(); setupV3 KHÔNG tạo sheet V2
  setupAuth();                                          // đảm bảo USERS có cột TeacherUID
  ensureSheet_(V3_CONFIG.sheets.assignments, ASSIGNMENTS_HEADERS);
  ensureSheet_(V3_CONFIG.sheets.notes, NOTES_HEADERS);
  fillAssignments_();
  Logger.log("setupV3: xong.");
}
/** Cấp TeacherUID cho tài khoản teacher/admin còn thiếu; điền AssignmentID/TeacherUID cho phân công. KHÔNG đụng StudentUID, PROGRESS, RESPONSES, EXIT_TICKETS. */
function migrateV2ToV3() {
  setupV3();
  const t = table_(AUTH_CONFIG.sheets.users); let n = 0;
  t.rows.forEach(function (r) {
    if (r.StudentUID && (r.Role === "teacher" || r.Role === "admin") && !r.TeacherUID) { updateRow_(t, r, { TeacherUID: "tch_" + Utilities.getUuid().replace(/-/g, "") }); n++; }
  });
  fillAssignments_();                                   // giờ đã có TeacherUID để điền cho phân công
  Logger.log("migrateV2ToV3: cấp TeacherUID cho " + n + " tài khoản. Hãy điền TEACHER_ASSIGNMENTS.");
}
function fillAssignments_() {
  const a = table_(V3_CONFIG.sheets.assignments), u = table_(AUTH_CONFIG.sheets.users);
  a.rows.forEach(function (r) {
    const ch = {};
    if (!r.AssignmentID && (r.ClassID || r.TeacherUsername)) ch.AssignmentID = "asg_" + Utilities.getUuid().replace(/-/g, "");
    if (!r.TeacherUID && r.TeacherUsername) {
      const m = findUser_(u, String(r.TeacherUsername));
      if (m && m.TeacherUID && (m.Role === "teacher" || m.Role === "admin")) ch.TeacherUID = m.TeacherUID;
    }
    if (String(r.Active) === "" && r.ClassID) ch.Active = "TRUE";
    if (Object.keys(ch).length) updateRow_(a, r, ch);
  });
}

/* ============================ PHÂN QUYỀN TÀI KHOẢN THEO LỚP (dùng bởi Code.gs: teacherListUsers/ResetPassword/LockUser) ============================ */

/** Tập {"năm|lớp": true} mà giáo viên được phân công (Active=TRUE). Admin không cần tập này. */
function assignedSet_(user) {
  const set = {}, tuid = String(user.TeacherUID || "");
  if (!tuid) return set;
  const t = openV2_("assignments");
  t.data.forEach(function (r) {
    if (String(c_(t, r, "teacherUid")) === tuid && truthy_(c_(t, r, "active"))) set[String(c_(t, r, "year")) + "|" + String(c_(t, r, "classId"))] = true;
  });
  return set;
}
function isAssigned_(actor, classId, year) { return actor.Role === "admin" || assignedSet_(actor)[String(year) + "|" + String(classId)] === true; }
