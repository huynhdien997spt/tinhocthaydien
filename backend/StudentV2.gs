/**
 * StudentV2.gs – V2 CLOUD LEARNING DATA (cùng project Apps Script với Code.gs và Teacher.gs).
 *
 * SCHEMA CHÍNH THỨC (canonical): ENROLLMENTS, PROGRESS, RESPONSES, EXIT_TICKETS, LEARNING_SESSIONS, EVENT_LOG
 * (xem V2_HEADERS). setupV2() tạo đủ các sheet này; Teacher.gs (V3) đọc đúng schema này.
 *
 * BẢO MẬT: mọi API học sinh = sessionToken → requireSession_ → StudentUID lấy từ phiên.
 * req.studentUid / req.schoolYear do trình duyệt gửi bị BỎ QUA hoàn toàn.
 *
 * IDEMPOTENCY: mọi sự kiện quan trọng có EventID (UUID do client sinh). EVENT_LOG ghi EventID đã xử lý;
 * gửi lại cùng EventID → "duplicate", không ghi trùng. Sự kiện về phiên học (LEARNING_SESSIONS) không vào EVENT_LOG:
 * chúng idempotent theo LearningSessionID và ActiveSeconds tích lũy.
 */
const V2_CONFIG = {
  schoolYearFallback: "2026-2027",
  maxEventsPerSync: 100,
  maxTextChars: 2000,
  maxResponseValueChars: 5000,
  sessionSlackSeconds: 15,          // ActiveSeconds không được vượt thời gian thực trôi qua + số này
  maxSessionActiveSeconds: 6 * 3600,
  deviceTypes: ["desktop", "tablet", "mobile", "unknown"],
  understandingLevels: ["clear", "good", "unclear", "need_support"]
};

/** Điều kiện hoàn thành bài do BACKEND kiểm tra. Phải khớp `completion` trong data/lessons.js. Bài không khai báo: chỉ cần percent = 100. */
const LESSON_RULES = {
  "G6-B3": { requiredActivities: ["A1", "A2", "A3", "A4"], requireExitTicket: true }
};

const V2_SHEET_NAMES = { enrollments: "ENROLLMENTS", progress: "PROGRESS", responses: "RESPONSES", exitTickets: "EXIT_TICKETS", sessions: "LEARNING_SESSIONS", events: "EVENT_LOG" };
const V2_HEADERS = {
  ENROLLMENTS: ["EnrollmentID", "StudentUID", "SchoolYear", "SchoolLevel", "Grade", "ClassID", "Active", "StartDate", "EndDate", "CreatedAt", "UpdatedAt"],
  PROGRESS: ["ProgressID", "StudentUID", "SchoolYear", "LessonID", "Status", "CurrentActivityID", "PercentComplete", "Score", "StartedAt", "LastAccessAt", "CompletedAt", "TimeSpentSeconds", "AttemptCount", "UpdatedAt"],
  RESPONSES: ["ResponseID", "EventID", "StudentUID", "SchoolYear", "LessonID", "ActivityID", "QuestionID", "QuestionText", "ResponseType", "ResponseValue", "IsCorrect", "Score", "MaxScore", "AttemptNumber", "Required", "SubmittedAt", "UpdatedAt"],
  EXIT_TICKETS: ["ExitTicketID", "EventID", "StudentUID", "SchoolYear", "LessonID", "UnderstandingLevel", "KeyLearning", "StillConfused", "ApplicationAnswer", "SelfAssessment", "SubmittedAt", "UpdatedAt"],
  LEARNING_SESSIONS: ["LearningSessionID", "StudentUID", "SchoolYear", "LessonID", "StartedAt", "LastActivityAt", "EndedAt", "ActiveSeconds", "DeviceType", "Completed"],
  EVENT_LOG: ["EventID", "StudentUID", "SchoolYear", "LessonID", "ActivityID", "EventType", "CreatedAt", "ProcessedAt", "Status"]
};
const LEGACY_PROGRESS_SHEET = "PROGRESS_V1_1";

/* ============================ SETUP / MIGRATION ============================ */

function v2Ready_() {
  const ss = getSS_();
  return Object.keys(V2_HEADERS).every(function (n) { return !!ss.getSheetByName(n); });
}
function assertV2Ready_() { if (!v2Ready_()) throw new Error("V2_NOT_SETUP: hãy chạy setupV2() trước."); }

/** Tạo/chuẩn hóa toàn bộ database V2. Chạy nhiều lần an toàn; không xóa dữ liệu; không đụng V1.1 (USERS, SESSIONS...). */
function setupV2() {
  const ss = getSS_(), p = ss.getSheetByName(V2_SHEET_NAMES.progress);
  if (p && p.getLastRow() >= 1 && p.getLastColumn() >= 1) {
    const hdr = p.getRange(1, 1, 1, p.getLastColumn()).getValues()[0].map(String);
    if (hdr.indexOf("ProgressID") < 0) {              // PROGRESS đơn giản của V1.1: đổi tên (giữ nguyên dữ liệu) để tạo PROGRESS chuẩn
      const name = ss.getSheetByName(LEGACY_PROGRESS_SHEET) ? LEGACY_PROGRESS_SHEET + "_" + Date.now() : LEGACY_PROGRESS_SHEET;
      p.setName(name);
      Logger.log("setupV2: PROGRESS cũ (V1.1) được giữ lại ở sheet '" + name + "'. Chạy migrateV1_1ToV2() để chuyển dữ liệu.");
    }
  }
  Object.keys(V2_HEADERS).forEach(function (n) { ensureSheet_(n, V2_HEADERS[n]); });
  Logger.log("setupV2: xong. Sheet V2: " + Object.keys(V2_HEADERS).join(", "));
}

/** Chuyển dữ liệu V1.1 sang V2: (1) ENROLLMENTS từ USERS, (2) PROGRESS cũ → PROGRESS chuẩn. Chạy lại không tạo trùng. Không xóa gì. */
function migrateV1_1ToV2() {
  assertV2Ready_();
  const enr = migrateEnrollments_(), prog = migrateLegacyProgress_();
  Logger.log("migrateV1_1ToV2: ENROLLMENTS tạo " + enr + "; PROGRESS chuyển " + prog.moved + ", bỏ qua " + prog.skipped + " (đã có/không hợp lệ).");
}
function migrateEnrollments_() {
  const users = table_(AUTH_CONFIG.sheets.users).rows.filter(function (r) { return r.StudentUID && r.Role === "student" && r.ClassID && r.SchoolYear; });
  const info = sheetInfo_(V2_SHEET_NAMES.enrollments), have = {};
  readRows_(info).forEach(function (r) { have[r.StudentUID + "|" + r.SchoolYear] = true; });
  const now = iso_(Date.now()), rows = [];
  users.forEach(function (u) {
    if (have[u.StudentUID + "|" + u.SchoolYear]) return;
    rows.push({ EnrollmentID: "enr_" + uuid_(), StudentUID: u.StudentUID, SchoolYear: String(u.SchoolYear), SchoolLevel: u.SchoolLevel, Grade: u.Grade, ClassID: u.ClassID,
      Active: "TRUE", StartDate: String(u.CreatedAt || now).slice(0, 10), EndDate: "", CreatedAt: now, UpdatedAt: now });
  });
  appendObjs_(info, rows);
  return rows.length;
}
function migrateLegacyProgress_() {
  const legacy = getSS_().getSheetByName(LEGACY_PROGRESS_SHEET);
  if (!legacy || legacy.getLastRow() < 2) return { moved: 0, skipped: 0 };
  const lv = legacy.getRange(1, 1, legacy.getLastRow(), legacy.getLastColumn()).getValues(), h = lv[0].map(String);
  const ci = { uid: h.indexOf("StudentUID"), lesson: h.indexOf("LessonID"), status: h.indexOf("Status"), upd: h.indexOf("UpdatedAt") };
  if (ci.uid < 0 || ci.lesson < 0) return { moved: 0, skipped: lv.length - 1 };
  const users = {}; table_(AUTH_CONFIG.sheets.users).rows.forEach(function (r) { if (r.StudentUID) users[r.StudentUID] = r; });
  const info = sheetInfo_(V2_SHEET_NAMES.progress), have = {};
  readRows_(info).forEach(function (r) { have[r.StudentUID + "|" + r.SchoolYear + "|" + r.LessonID] = true; });
  const rows = []; let skipped = 0;
  for (let i = 1; i < lv.length; i++) {
    const uid = String(lv[i][ci.uid] || ""), lesson = String(lv[i][ci.lesson] || ""), u = users[uid];
    if (!uid || !lesson || !u) { skipped++; continue; }
    const year = String(u.SchoolYear || V2_CONFIG.schoolYearFallback), key = uid + "|" + year + "|" + lesson;
    if (have[key]) { skipped++; continue; }
    have[key] = true;
    const st = normStatusV2_(ci.status >= 0 ? lv[i][ci.status] : ""), upd = ci.upd >= 0 && lv[i][ci.upd] ? iso_(ms_(lv[i][ci.upd]) || Date.now()) : iso_(Date.now());
    rows.push({ ProgressID: "prg_" + uuid_(), StudentUID: uid, SchoolYear: year, LessonID: lesson, Status: st, CurrentActivityID: "", PercentComplete: st === "completed" ? 100 : 0, Score: "",
      StartedAt: st === "not_started" ? "" : upd, LastAccessAt: upd, CompletedAt: st === "completed" ? upd : "", TimeSpentSeconds: 0, AttemptCount: st === "not_started" ? 0 : 1, UpdatedAt: upd });
  }
  appendObjs_(info, rows);
  return { moved: rows.length, skipped: skipped };
}
/** started / in-progress / in_progress → in_progress ; completed → completed ; rỗng/khác → not_started. */
function normStatusV2_(v) {
  const n = String(v == null ? "" : v).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (n === "completed" || n === "complete" || n === "done") return "completed";
  if (n === "started" || n === "in_progress" || n === "inprogress" || n === "learning") return "in_progress";
  return "not_started";
}

/* ============================ SHEET HELPERS (theo tên cột, đọc theo lô) ============================ */

function uuid_() { return Utilities.getUuid().replace(/-/g, ""); }
function sheetInfo_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw E_("V2_NOT_SETUP");
  const lc = sh.getLastColumn(), idx = {};
  (lc ? sh.getRange(1, 1, 1, lc).getValues()[0] : []).forEach(function (h, i) { idx[String(h)] = i; });
  return { sh: sh, idx: idx, ncol: lc, name: name };
}
/** Đọc toàn bộ dòng dữ liệu của sheet thành mảng object (một lần getValues). */
function readRows_(info) {
  const lr = info.sh.getLastRow(); if (lr < 2) return [];
  const vals = info.sh.getRange(2, 1, lr - 1, info.ncol).getValues(), keys = Object.keys(info.idx);
  return vals.map(function (v, i) { const o = { _row: i + 2 }; keys.forEach(function (k) { o[k] = v[info.idx[k]]; }); return o; });
}
function appendObjs_(info, objs) {
  if (!objs.length) return;
  const rows = objs.map(function (o) { const a = new Array(info.ncol); for (let i = 0; i < info.ncol; i++) a[i] = ""; Object.keys(o).forEach(function (k) { if (info.idx[k] !== undefined) a[info.idx[k]] = o[k]; }); return a; });
  info.sh.getRange(info.sh.getLastRow() + 1, 1, rows.length, info.ncol).setValues(rows);
}
function updateObj_(info, rowObj, changes) {
  Object.keys(changes).forEach(function (k) { rowObj[k] = changes[k]; });
  const a = new Array(info.ncol); for (let i = 0; i < info.ncol; i++) a[i] = "";
  Object.keys(info.idx).forEach(function (k) { if (rowObj[k] !== undefined) a[info.idx[k]] = rowObj[k]; });
  info.sh.getRange(rowObj._row, 1, 1, info.ncol).setValues([a]);
}
/** Tìm dòng theo cột khóa: chỉ đọc đúng các cột khóa (ít ô) rồi đọc 1 dòng khớp. */
function findObj_(info, crit) {
  const lr = info.sh.getLastRow(); if (lr < 2) return null;
  const keys = Object.keys(crit); let cand = null;
  keys.forEach(function (k) {
    const col = info.sh.getRange(2, info.idx[k] + 1, lr - 1, 1).getValues();
    const set = {}; col.forEach(function (c, i) { if (String(c[0]) === String(crit[k])) set[i] = true; });
    cand = cand === null ? set : Object.keys(cand).reduce(function (o, i) { if (set[i]) o[i] = true; return o; }, {});
  });
  const hit = cand && Object.keys(cand)[0];
  if (hit === undefined) return null;
  const row = Number(hit) + 2, v = info.sh.getRange(row, 1, 1, info.ncol).getValues()[0], o = { _row: row };
  Object.keys(info.idx).forEach(function (k) { o[k] = v[info.idx[k]]; });
  return o;
}

/* ============================ NGỮ CẢNH HỌC SINH ============================ */

/** Năm học của học sinh: do BACKEND quyết (enrollment đang hoạt động mới nhất → USERS → mặc định). Không nhận từ client. */
function studentContext_(user) {
  const rows = readRows_(sheetInfo_(V2_SHEET_NAMES.enrollments)).filter(function (r) { return r.StudentUID === user.StudentUID && (r.Active === "" || truthy_(r.Active)); });
  rows.sort(function (a, b) { return String(b.StartDate).localeCompare(String(a.StartDate)) || String(b.SchoolYear).localeCompare(String(a.SchoolYear)); });
  const e = rows[0];
  return { studentUid: user.StudentUID, schoolYear: String(e ? e.SchoolYear : (user.SchoolYear || V2_CONFIG.schoolYearFallback)),
    classId: String(e ? e.ClassID : user.ClassID || ""), grade: Number(e ? e.Grade : user.Grade) || null, schoolLevel: String(e ? e.SchoolLevel : user.SchoolLevel || "") };
}
function studentCtx_(req) {
  const ctx = requireSession_(req.token, { allowMustChange: false });   // phải đổi mật khẩu tạm trước khi ghi dữ liệu
  if (ctx.user.Role !== "student") throw E_("FORBIDDEN");               // API học sinh chỉ dành cho học sinh
  return Object.assign({ user: ctx.user }, studentContext_(ctx.user));
}
function lessonIdOf_(v) { const s = str_(v, 40); if (!/^[A-Za-z0-9_-]{1,40}$/.test(s)) throw E_("BAD_REQUEST"); return s; }
function eventIdOf_(v) { const s = str_(v, 64); if (!/^[A-Za-z0-9_-]{8,64}$/.test(s)) throw E_("BAD_REQUEST"); return s; }
function actIdOf_(v) { const s = str_(v, 40); if (s && !/^[A-Za-z0-9_.-]{1,40}$/.test(s)) throw E_("BAD_REQUEST"); return s; }
function clampNum_(v, lo, hi) { const n = Number(v); if (!isFinite(n) || n < lo || n > hi) throw E_("BAD_REQUEST"); return n; }
function textOf_(v, max) { return String(v == null ? "" : v).slice(0, max); }

/* ============================ API HỌC SINH (đọc) ============================ */

function progressView_(r) {
  return { lessonId: String(r.LessonID), status: normStatusV2_(r.Status), currentActivityId: String(r.CurrentActivityID || ""), percentComplete: Number(r.PercentComplete) || 0,
    score: r.Score === "" || r.Score === undefined ? null : Number(r.Score), timeSpentSeconds: Number(r.TimeSpentSeconds) || 0, attemptCount: Number(r.AttemptCount) || 0,
    startedAt: isoOrEmpty_(r.StartedAt), lastAccessAt: isoOrEmpty_(r.LastAccessAt), completedAt: isoOrEmpty_(r.CompletedAt) };
}
function myProgressRows_(c) {
  return readRows_(sheetInfo_(V2_SHEET_NAMES.progress)).filter(function (r) { return r.StudentUID === c.studentUid && String(r.SchoolYear) === c.schoolYear; });
}
function getMyProfile_(req) {
  const c = studentCtx_(req);
  return { student: Object.assign(profile_(c.user), { classId: c.classId, grade: c.grade, schoolLevel: c.schoolLevel, schoolYear: c.schoolYear }) };
}
function getMyProgress_(req) {
  const c = studentCtx_(req);
  return { schoolYear: c.schoolYear, progress: myProgressRows_(c).map(progressView_) };
}
function getMyLessons_(req) {
  const c = studentCtx_(req), by = {};
  myProgressRows_(c).forEach(function (r) { by[r.LessonID] = progressView_(r); });
  return { schoolYear: c.schoolYear, grade: c.grade, lessons: Object.keys(by).sort().map(function (k) {
    const p = by[k]; return { lessonId: p.lessonId, status: p.status, percentComplete: p.percentComplete, currentActivityId: p.currentActivityId, lastAccessAt: p.lastAccessAt, timeSpentSeconds: p.timeSpentSeconds }; }) };
}
/** Khôi phục đầy đủ trạng thái một bài (đổi máy vẫn học tiếp). */
function getLessonProgress_(req) {
  const c = studentCtx_(req), lessonId = lessonIdOf_(req.lessonId);
  return restoreLesson_(c, lessonId);
}
function restoreLesson_(c, lessonId) {
  const p = myProgressRows_(c).filter(function (r) { return r.LessonID === lessonId; })[0];
  const resp = {};
  readRows_(sheetInfo_(V2_SHEET_NAMES.responses)).forEach(function (r) {
    if (r.StudentUID !== c.studentUid || String(r.SchoolYear) !== c.schoolYear || r.LessonID !== lessonId) return;
    const q = String(r.QuestionID), cur = resp[q], at = ms_(r.SubmittedAt), n = Number(r.AttemptNumber) || 1;
    if (!cur || n > cur.attemptNumber || (n === cur.attemptNumber && at >= cur.at)) resp[q] = { at: at, activityId: String(r.ActivityID || ""), questionId: q, questionText: String(r.QuestionText || ""), responseType: String(r.ResponseType || ""),
      responseValue: parseValue_(r.ResponseValue), isCorrect: r.IsCorrect === "" ? null : truthy_(r.IsCorrect), score: r.Score === "" ? null : Number(r.Score), maxScore: r.MaxScore === "" ? null : Number(r.MaxScore),
      attemptNumber: n, required: r.Required === "" ? true : truthy_(r.Required), submittedAt: isoOrEmpty_(r.SubmittedAt) };
  });
  const done = {}, ev = readRows_(sheetInfo_(V2_SHEET_NAMES.events));
  ev.forEach(function (r) { if (r.StudentUID === c.studentUid && String(r.SchoolYear) === c.schoolYear && r.LessonID === lessonId && r.EventType === "activity_completed" && r.ActivityID && String(r.Status) !== "rejected") done[r.ActivityID] = true; });
  const ex = readRows_(sheetInfo_(V2_SHEET_NAMES.exitTickets)).filter(function (r) { return r.StudentUID === c.studentUid && String(r.SchoolYear) === c.schoolYear && r.LessonID === lessonId; })[0];
  return Object.assign(p ? progressView_(p) : { lessonId: lessonId, status: "not_started", currentActivityId: "", percentComplete: 0, score: null, timeSpentSeconds: 0, attemptCount: 0, startedAt: "", lastAccessAt: "", completedAt: "" },
    { schoolYear: c.schoolYear, completedActivityIds: Object.keys(done).sort(), responses: Object.keys(resp).sort().map(function (q) { const o = resp[q]; delete o.at; return o; }),
      exitTicket: ex ? exitView_(ex) : null, serverTime: iso_(Date.now()) });
}
function parseValue_(v) { const s = String(v == null ? "" : v); if (s.charAt(0) === "[" || s.charAt(0) === "{") { try { return JSON.parse(s); } catch (e) {} } return s; }
function exitView_(r) {
  return { understandingLevel: String(r.UnderstandingLevel || ""), keyLearning: String(r.KeyLearning || ""), stillConfused: String(r.StillConfused || ""), applicationAnswer: String(r.ApplicationAnswer || ""),
    selfAssessment: String(r.SelfAssessment || ""), submittedAt: isoOrEmpty_(r.SubmittedAt), updatedAt: isoOrEmpty_(r.UpdatedAt) };
}

/* ============================ API HỌC SINH (ghi) – tất cả đi qua applyEvents_ ============================ */

function evFromReq_(type, req, extra) {
  return [Object.assign({ eventId: req.eventId || "srv_" + uuid_(), type: type, lessonId: req.lessonId, activityId: req.activityId, createdAt: req.createdAt }, { data: extra || {} })];
}
function one_(req, type, data) { const c = studentCtx_(req), r = applyEvents_(c, evFromReq_(type, req, data))[0]; return finishOne_(r); }
function finishOne_(r) { if (r.status === "rejected") throw E_(r.error || "BAD_REQUEST"); return r; }

function startLesson_(req)       { return one_(req, "lesson_started", {}); }
function saveProgressV2_(req)    { return one_(req, "progress_saved", { currentActivityId: req.currentActivityId, percentComplete: req.percentComplete, score: req.score }); }
function completeActivity_(req)  { return one_(req, "activity_completed", {}); }
function completeLesson_(req)    { return one_(req, "lesson_completed", {}); }
function saveResponse_(req)      { return one_(req, "response_saved", req.response || req); }
function submitExitTicket_(req)  { return one_(req, "exit_ticket_submitted", req.exitTicket || req); }
function saveResponsesBatch_(req) {
  const c = studentCtx_(req), list = Array.isArray(req.responses) ? req.responses : [];
  if (!list.length || list.length > 50) throw E_("BAD_REQUEST");
  return { results: applyEvents_(c, list.map(function (r) { return { eventId: r.eventId, type: "response_saved", lessonId: r.lessonId || req.lessonId, activityId: r.activityId, createdAt: r.createdAt, data: r }; })) };
}
function startLearningSession_(req)     { return one_(req, "session_started", { sessionId: req.sessionId, deviceType: req.deviceType }); }
function heartbeatLearningSession_(req) { return one_(req, "session_heartbeat", { sessionId: req.sessionId, activeSeconds: req.activeSeconds }); }
function endLearningSession_(req)       { return one_(req, "session_ended", { sessionId: req.sessionId, activeSeconds: req.activeSeconds, completed: req.completed }); }
function syncEvents_(req) {
  const c = studentCtx_(req), list = Array.isArray(req.events) ? req.events : [];
  if (list.length > V2_CONFIG.maxEventsPerSync) throw E_("BAD_REQUEST");
  return { results: applyEvents_(c, list), schoolYear: c.schoolYear, serverTime: iso_(Date.now()) };
}

/**
 * Xử lý một lô sự kiện của MỘT học sinh (c.studentUid từ token). Chạy dưới khóa, đọc EVENT_LOG một lần để chống ghi trùng.
 * Trả mảng { eventId, status: "processed" | "duplicate" | "rejected", error?, result? } theo đúng thứ tự đầu vào.
 */
function applyEvents_(c, events) {
  if (!events.length) return [];
  return withLock_(function () {
    const evInfo = sheetInfo_(V2_SHEET_NAMES.events), seen = {};
    const idCol = evInfo.sh.getLastRow() >= 2 ? evInfo.sh.getRange(2, evInfo.idx.EventID + 1, evInfo.sh.getLastRow() - 1, 1).getValues() : [];
    idCol.forEach(function (r) { seen[String(r[0])] = true; });
    const S = { c: c, ev: evInfo, seen: seen, logs: [], now: Date.now(), cache: {} }, out = [];
    events.forEach(function (e) {
      let eventId = "";
      try {
        if (!e || typeof e !== "object") throw E_("BAD_REQUEST");
        const type = str_(e.type, 40), isSession = /^session_/.test(type);
        eventId = isSession ? str_(e.eventId, 64) : eventIdOf_(e.eventId);
        if (!isSession && seen[eventId]) { out.push({ eventId: eventId, status: "duplicate" }); return; }
        const handler = EVENT_HANDLERS_[type];
        if (!handler) throw E_("BAD_REQUEST");
        const lessonId = type.indexOf("session_") === 0 && !e.lessonId ? "" : lessonIdOf_(e.lessonId);
        const result = handler(S, { eventId: eventId, lessonId: lessonId, activityId: actIdOf_(e.activityId), createdAt: isoOrEmpty_(e.createdAt) || iso_(S.now), data: e.data && typeof e.data === "object" ? e.data : {} });
        if (!isSession) {
          seen[eventId] = true;
          // Yêu cầu hoàn thành bài nhưng CHƯA đủ điều kiện: vẫn ghi EventID (chống xử lý lại) nhưng không gọi là lesson_completed, để timeline không hiện "Hoàn thành bài" sai.
          const logType = type === "lesson_completed" && result && result.completed === false ? "lesson_finish_attempt" : type;
          S.logs.push({ EventID: eventId, StudentUID: c.studentUid, SchoolYear: c.schoolYear, LessonID: lessonId, ActivityID: actIdOf_(e.activityId), EventType: logType,
            CreatedAt: isoOrEmpty_(e.createdAt) || iso_(S.now), ProcessedAt: iso_(Date.now()), Status: "processed" });
        }
        out.push({ eventId: eventId, status: "processed", result: result || null });
      } catch (err) {
        if (!err || !err.authCode) throw err;           // lỗi hệ thống: dừng, client sẽ thử lại cả lô (an toàn nhờ idempotency)
        out.push({ eventId: eventId, status: "rejected", error: err.authCode });
      }
    });
    flushProgress_(S);
    if (S.rows && S.rows.responses) appendObjs_(S.responseInfo || sheetInfo_(V2_SHEET_NAMES.responses), S.rows.responses);   // trước EVENT_LOG: nếu lỗi giữa chừng, thử lại chỉ có thể trùng (không mất) câu trả lời
    appendObjs_(evInfo, S.logs);
    return out;
  });
}

/* ---- bộ đệm PROGRESS trong một lô: đọc 1 lần, ghi 1 lần cho mỗi (bài) ---- */
function progressRow_(S, lessonId) {
  const key = S.c.studentUid + "|" + S.c.schoolYear + "|" + lessonId;
  if (S.cache[key]) return S.cache[key];
  if (!S.pinfo) S.pinfo = sheetInfo_(V2_SHEET_NAMES.progress);
  const row = findObj_(S.pinfo, { StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: lessonId });
  return (S.cache[key] = { row: row, isNew: !row, dirty: false, lessonId: lessonId });
}
function ensureProgress_(S, lessonId, createdAt) {
  const p = progressRow_(S, lessonId);
  if (!p.row) {
    const now = iso_(S.now);
    p.row = { ProgressID: "prg_" + uuid_(), StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: lessonId, Status: "not_started", CurrentActivityID: "", PercentComplete: 0, Score: "",
      StartedAt: "", LastAccessAt: createdAt || now, CompletedAt: "", TimeSpentSeconds: 0, AttemptCount: 0, UpdatedAt: now };
    p.isNew = true; p.dirty = true;
  }
  return p;
}
function touchProgress_(p, S, createdAt) {
  p.row.LastAccessAt = isoOrEmpty_(createdAt) > String(isoOrEmpty_(p.row.LastAccessAt)) ? isoOrEmpty_(createdAt) : (isoOrEmpty_(p.row.LastAccessAt) || iso_(S.now));
  p.row.UpdatedAt = iso_(S.now); p.dirty = true;
}
function flushProgress_(S) {
  const adds = [];
  Object.keys(S.cache).forEach(function (k) {
    const p = S.cache[k]; if (!p.dirty) return;
    if (p.isNew) adds.push(p.row); else updateObj_(S.pinfo, p.row, {});
  });
  if (adds.length) { if (!S.pinfo) S.pinfo = sheetInfo_(V2_SHEET_NAMES.progress); appendObjs_(S.pinfo, adds); }
}
function startedNow_(p, S) {
  if (normStatusV2_(p.row.Status) === "not_started") { p.row.Status = "in_progress"; p.row.StartedAt = iso_(S.now); p.row.AttemptCount = Math.max(1, Number(p.row.AttemptCount) || 0); }
}
function doneActivities_(S, lessonId) {
  const k = "done|" + lessonId;
  if (S.cache[k]) return S.cache[k];
  const done = {};
  if (S.ev.sh.getLastRow() >= 2) readRows_(S.ev).forEach(function (r) {
    if (r.StudentUID === S.c.studentUid && String(r.SchoolYear) === S.c.schoolYear && r.LessonID === lessonId && r.EventType === "activity_completed" && r.ActivityID) done[r.ActivityID] = true;
  });
  S.logs.forEach(function (l) { if (l.LessonID === lessonId && l.EventType === "activity_completed" && l.ActivityID) done[l.ActivityID] = true; });
  return (S.cache[k] = done);
}
function hasExitTicket_(S, lessonId) {
  if (S.cache["ex|" + lessonId] !== undefined) return S.cache["ex|" + lessonId];
  const info = sheetInfo_(V2_SHEET_NAMES.exitTickets);
  return (S.cache["ex|" + lessonId] = !!findObj_(info, { StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: lessonId }));
}

/* ---- xử lý từng loại sự kiện ---- */
const EVENT_HANDLERS_ = {
  lesson_started: function (S, e) {
    const p = ensureProgress_(S, e.lessonId, e.createdAt), wasNew = normStatusV2_(p.row.Status) === "not_started";
    startedNow_(p, S); touchProgress_(p, S, e.createdAt);
    return { status: normStatusV2_(p.row.Status), created: wasNew };
  },
  progress_saved: function (S, e) {
    const d = e.data, p = ensureProgress_(S, e.lessonId, e.createdAt);
    if (normStatusV2_(p.row.Status) === "completed") { touchProgress_(p, S, e.createdAt); return { status: "completed", percentComplete: 100 }; }  // bài đã hoàn thành: không lùi trạng thái
    if (d.percentComplete !== undefined) { const pc = clampNum_(d.percentComplete, 0, 100); p.row.PercentComplete = Math.max(Number(p.row.PercentComplete) || 0, Math.round(pc)); }
    if (d.currentActivityId !== undefined && d.currentActivityId !== null) p.row.CurrentActivityID = actIdOf_(d.currentActivityId);
    if (d.score !== undefined && d.score !== null && d.score !== "") p.row.Score = clampNum_(d.score, 0, 1000);
    startedNow_(p, S); touchProgress_(p, S, e.createdAt);
    return { status: normStatusV2_(p.row.Status), percentComplete: Number(p.row.PercentComplete) };
  },
  activity_completed: function (S, e) {
    if (!e.activityId) throw E_("BAD_REQUEST");
    const p = ensureProgress_(S, e.lessonId, e.createdAt); startedNow_(p, S); touchProgress_(p, S, e.createdAt);
    doneActivities_(S, e.lessonId)[e.activityId] = true;
    return { activityId: e.activityId };
  },
  response_saved: function (S, e) {
    const d = e.data, q = str_(String(d.questionId == null ? "" : d.questionId), 60);
    if (!/^[A-Za-z0-9_.-]{1,60}$/.test(q)) throw E_("BAD_REQUEST");
    const type = str_(d.responseType, 30) || "text"; if (!/^[a-z_]{1,30}$/.test(type)) throw E_("BAD_REQUEST");
    let val = d.responseValue; if (val !== null && typeof val === "object") val = JSON.stringify(val);
    val = textOf_(val, V2_CONFIG.maxResponseValueChars);
    const mx = d.maxScore === undefined || d.maxScore === null || d.maxScore === "" ? "" : clampNum_(d.maxScore, 0, 1000);
    const sc = d.score === undefined || d.score === null || d.score === "" ? "" : clampNum_(d.score, 0, 1000);
    const attempt = d.attemptNumber === undefined ? 1 : clampNum_(d.attemptNumber, 1, 1000);
    const now = iso_(S.now), p = ensureProgress_(S, e.lessonId, e.createdAt); startedNow_(p, S); touchProgress_(p, S, e.createdAt);

    // Lớp bảo vệ idempotency thứ hai: nếu lần trước đã append RESPONSES nhưng lỗi xảy ra trước khi ghi EVENT_LOG,
    // retry cùng EventID sẽ không append câu trả lời lần nữa; EVENT_LOG vẫn được ghi ở cuối applyEvents_ để "hàn" giao dịch dở dang.
    if (!S.responseEventIds) {
      const ri = sheetInfo_(V2_SHEET_NAMES.responses); S.responseInfo = ri; S.responseEventIds = {};
      if (ri.idx.EventID !== undefined && ri.sh.getLastRow() >= 2) {
        ri.sh.getRange(2, ri.idx.EventID + 1, ri.sh.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) S.responseEventIds[String(r[0])] = true; });
      }
    }
    if (S.responseEventIds[e.eventId]) return { questionId: q, attemptNumber: Math.round(attempt), recovered: true };

    S.rows = S.rows || {}; (S.rows.responses = S.rows.responses || []).push({ ResponseID: "rsp_" + uuid_(), EventID: e.eventId, StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: e.lessonId,
      ActivityID: e.activityId || actIdOf_(d.activityId), QuestionID: q, QuestionText: textOf_(d.questionText, 500), ResponseType: type, ResponseValue: val,
      IsCorrect: d.isCorrect === true ? "TRUE" : d.isCorrect === false ? "FALSE" : "", Score: sc, MaxScore: mx, AttemptNumber: Math.round(attempt),
      Required: d.required === false ? "FALSE" : "TRUE", SubmittedAt: e.createdAt, UpdatedAt: now });
    S.responseEventIds[e.eventId] = true;
    return { questionId: q, attemptNumber: Math.round(attempt) };
  },
  exit_ticket_submitted: function (S, e) {
    const d = e.data, lvl = str_(d.understandingLevel, 20), self = str_(d.selfAssessment, 20);
    if (V2_CONFIG.understandingLevels.indexOf(lvl) < 0) throw E_("BAD_REQUEST");
    if (self && V2_CONFIG.understandingLevels.indexOf(self) < 0) throw E_("BAD_REQUEST");
    const info = sheetInfo_(V2_SHEET_NAMES.exitTickets), now = iso_(S.now);
    const fields = { UnderstandingLevel: lvl, KeyLearning: textOf_(d.keyLearning, V2_CONFIG.maxTextChars), StillConfused: textOf_(d.stillConfused, V2_CONFIG.maxTextChars),
      ApplicationAnswer: textOf_(d.applicationAnswer, V2_CONFIG.maxTextChars), SelfAssessment: self, EventID: e.eventId, UpdatedAt: now };
    const row = findObj_(info, { StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: e.lessonId });   // một Exit Ticket / học sinh / năm / bài
    let created = false;
    if (row) updateObj_(info, row, fields);
    else { created = true; appendObjs_(info, [Object.assign({ ExitTicketID: "ext_" + uuid_(), StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: e.lessonId, SubmittedAt: e.createdAt }, fields)]); }
    S.cache["ex|" + e.lessonId] = true;
    const p = ensureProgress_(S, e.lessonId, e.createdAt); startedNow_(p, S); touchProgress_(p, S, e.createdAt);
    return { created: created };
  },
  lesson_completed: function (S, e) {
    const p = ensureProgress_(S, e.lessonId, e.createdAt);
    if (normStatusV2_(p.row.Status) === "completed") { touchProgress_(p, S, e.createdAt); return { completed: true, already: true }; }
    const rule = LESSON_RULES[e.lessonId], missing = [];
    if (rule) {
      const done = doneActivities_(S, e.lessonId);
      (rule.requiredActivities || []).forEach(function (a) { if (!done[a]) missing.push(a); });
      if (rule.requireExitTicket && !hasExitTicket_(S, e.lessonId)) missing.push("exit_ticket");
    } else if ((Number(p.row.PercentComplete) || 0) < 100) missing.push("percent_100");
    if (missing.length) { startedNow_(p, S); touchProgress_(p, S, e.createdAt); return { completed: false, missing: missing }; }   // KHÔNG đánh dấu hoàn thành chỉ vì mở trang cuối
    startedNow_(p, S); p.row.Status = "completed"; p.row.PercentComplete = 100; p.row.CompletedAt = iso_(S.now); touchProgress_(p, S, e.createdAt);
    return { completed: true, missing: [] };
  },
  session_started: function (S, e) {
    const d = e.data, sid = str_(d.sessionId, 64); if (!/^[A-Za-z0-9_-]{8,64}$/.test(sid)) throw E_("BAD_REQUEST");
    if (!e.lessonId) throw E_("BAD_REQUEST");
    const info = sheetInfo_(V2_SHEET_NAMES.sessions), ex = findObj_(info, { LearningSessionID: sid });
    if (ex) { if (ex.StudentUID !== S.c.studentUid) throw E_("FORBIDDEN"); return { sessionId: sid, existing: true }; }
    const dev = V2_CONFIG.deviceTypes.indexOf(str_(d.deviceType, 10)) >= 0 ? str_(d.deviceType, 10) : "unknown", now = iso_(S.now);
    const startedAt = Math.min(S.now, ms_(e.createdAt) || S.now);
    appendObjs_(info, [{ LearningSessionID: sid, StudentUID: S.c.studentUid, SchoolYear: S.c.schoolYear, LessonID: e.lessonId, StartedAt: iso_(startedAt), LastActivityAt: now, EndedAt: "", ActiveSeconds: 0, DeviceType: dev, Completed: "FALSE" }]);
    return { sessionId: sid };
  },
  session_heartbeat: function (S, e) { return sessionUpdate_(S, e, false); },
  session_ended: function (S, e) { return sessionUpdate_(S, e, true); }
};

/** ActiveSeconds là số tích lũy của phiên: gửi lại nhiều lần vẫn đúng. Không được vượt thời gian thực đã trôi qua. */
function sessionUpdate_(S, e, ending) {
  const d = e.data, sid = str_(d.sessionId, 64); if (!/^[A-Za-z0-9_-]{8,64}$/.test(sid)) throw E_("BAD_REQUEST");
  const info = sheetInfo_(V2_SHEET_NAMES.sessions), ses = findObj_(info, { LearningSessionID: sid });
  if (!ses) throw E_("NOT_FOUND");
  if (ses.StudentUID !== S.c.studentUid) throw E_("FORBIDDEN");            // không cập nhật phiên của người khác
  const elapsed = Math.max(0, Math.floor((S.now - ms_(ses.StartedAt)) / 1000)) + V2_CONFIG.sessionSlackSeconds;
  const asked = Math.round(clampNum_(d.activeSeconds === undefined ? 0 : d.activeSeconds, 0, V2_CONFIG.maxSessionActiveSeconds));
  const prev = Number(ses.ActiveSeconds) || 0, next = Math.max(prev, Math.min(asked, elapsed)), delta = next - prev;
  const changes = { LastActivityAt: iso_(S.now), ActiveSeconds: next };
  if (ending) { changes.EndedAt = String(ses.EndedAt) ? ses.EndedAt : iso_(S.now); if (d.completed === true) changes.Completed = "TRUE"; }
  updateObj_(info, ses, changes);
  if (ses.LessonID) { const p = ensureProgress_(S, ses.LessonID, e.createdAt); p.row.TimeSpentSeconds = (Number(p.row.TimeSpentSeconds) || 0) + delta; touchProgress_(p, S, e.createdAt); }
  return { sessionId: sid, activeSeconds: next };
}

/** API V1.1 cũ { action: "saveProgress", lessonId, status } vẫn chạy: chuyển thành sự kiện V2. */
function saveProgressLegacy_(req) {
  const st = normStatusV2_(req.status);
  return st === "completed" ? completeLesson_(req) : startLesson_(req);
}
