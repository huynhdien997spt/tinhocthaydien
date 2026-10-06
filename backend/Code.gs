/**
 * TIN HỌC CÙNG THẦY DIỄN – V1.1 + V2 + V3 – Authentication backend (V2: StudentV2.gs, V3: Teacher.gs) (Google Apps Script Web App)
 *
 * - Mật khẩu: PBKDF2-HMAC-SHA256 + salt ngẫu nhiên (xây từ HMAC có sẵn của Apps Script). KHÔNG lưu mật khẩu thô.
 * - Phiên: token ngẫu nhiên; trong sheet chỉ lưu HMAC-SHA256(token, pepper) (pepper nằm trong Script Properties).
 * - Danh tính luôn lấy từ token; mọi studentUid do frontend gửi lên đều bị bỏ qua.
 * - Không ghi mật khẩu vào Logger. Không trả hash/salt ra ngoài.
 */

const AUTH_CONFIG = {
  minPasswordLength: 6,
  maxPasswordLength: 100,
  maxFailedAttempts: 5,
  lockMinutes: 10,
  sessionHours: 8,
  pbkdf2Iterations: 1000,   // Apps Script chậm; chạy benchmarkHash() để chọn số phù hợp (xem README)
  tempPasswordLength: 8,
  sheets: { users: "USERS", sessions: "SESSIONS", import: "IMPORT", newAccounts: "NEW_ACCOUNTS" }
};

const USERS_HEADERS = ["StudentUID", "StudentID", "Username", "FullName", "ClassID", "Grade", "SchoolLevel", "SchoolYear",
  "PasswordHash", "PasswordSalt", "Role", "Active", "FailedAttempts", "LockedUntil", "MustChangePassword", "CreatedAt", "UpdatedAt", "TeacherUID"];
const SESSIONS_HEADERS = ["SessionID", "StudentUID", "SessionTokenHash", "CreatedAt", "ExpiresAt", "LastActivity", "Revoked", "DeviceInfo"];
const IMPORT_HEADERS = ["StudentID", "FullName", "ClassID", "Grade", "SchoolLevel", "SchoolYear", "Role", "Imported"];
const NEW_ACCOUNT_HEADERS = ["StudentID", "Username", "FullName", "ClassID", "Role", "TemporaryPassword"];

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Sai tài khoản hoặc mật khẩu.",
  ACCOUNT_LOCKED: "Tài khoản tạm thời bị khóa.",
  ACCOUNT_DISABLED: "Tài khoản đã bị khóa.",
  INVALID_SESSION: "Phiên không hợp lệ.",
  SESSION_EXPIRED: "Phiên đã hết hạn.",
  FORBIDDEN: "Không có quyền.",
  UNAUTHORIZED: "Chưa được phân công lớp này.",
  PASSWORD_CHANGE_REQUIRED: "Cần đổi mật khẩu trước.",
  WRONG_CURRENT_PASSWORD: "Mật khẩu hiện tại chưa đúng.",
  WEAK_PASSWORD: "Mật khẩu mới chưa đạt yêu cầu.",
  SAME_PASSWORD: "Mật khẩu mới phải khác mật khẩu cũ.",
  BAD_REQUEST: "Yêu cầu không hợp lệ.",
  NOT_FOUND: "Không tìm thấy.",
  UNKNOWN_ACTION: "Hành động không tồn tại.",
  NOT_SETUP: "Backend chưa được cài đặt (chạy setupAuth).",
  V2_NOT_SETUP: "Dữ liệu học tập V2 chưa được cài đặt (chạy setupV2).",
  BUSY: "Hệ thống đang bận, hãy thử lại.",
  INTERNAL_ERROR: "Lỗi hệ thống."
};

/* ============================ WEB APP ============================ */

function doGet() { return json_({ success: true, data: { service: "tin-hoc-auth", version: "3.0.0-rc.1" }, error: null }); }

function doPost(e) {
  let res;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    res = { success: true, data: dispatch_(req), error: null };
  } catch (err) {
    res = fail_(err);
  }
  return json_(res);
}

function dispatch_(req) {
  if (!req || typeof req !== "object") throw E_("BAD_REQUEST");
  switch (req.action) {
    case "login":                return login_(req);
    case "logout":               return logout_(req);
    case "validateSession":      return validateSession_(req);
    case "changePassword":       return changePassword_(req);
    case "saveProgress":         return saveProgressLegacy_(req);   // API V1.1 cũ, nay ghi vào PROGRESS chuẩn của V2
    // ---- V2: Cloud Learning Data (StudentV2.gs) ----
    case "getMyProfile":              return getMyProfile_(req);
    case "getMyLessons":              return getMyLessons_(req);
    case "getMyProgress":             return getMyProgress_(req);
    case "getLessonProgress":         return getLessonProgress_(req);
    case "startLesson":               return startLesson_(req);
    case "saveProgressV2":            return saveProgressV2_(req);
    case "completeActivity":          return completeActivity_(req);
    case "completeLesson":            return completeLesson_(req);
    case "saveResponse":              return saveResponse_(req);
    case "saveResponsesBatch":        return saveResponsesBatch_(req);
    case "submitExitTicket":          return submitExitTicket_(req);
    case "startLearningSession":      return startLearningSession_(req);
    case "heartbeatLearningSession":  return heartbeatLearningSession_(req);
    case "endLearningSession":        return endLearningSession_(req);
    case "syncEvents":                return syncEvents_(req);
    case "teacherListUsers":     return teacherListUsers_(req);
    case "teacherResetPassword": return teacherResetPassword_(req);
    case "teacherLockUser":      return teacherLockUser_(req);
    default:
      if (typeof dispatchTeacherV3_ === "function") return dispatchTeacherV3_(req);   // V3: Teacher.gs
      throw E_("UNKNOWN_ACTION");
  }
}

function E_(code) { const e = new Error(code); e.authCode = code; return e; }
function fail_(err) {
  const code = err && err.authCode ? err.authCode : "INTERNAL_ERROR";
  if (!err || !err.authCode) Logger.log("INTERNAL_ERROR: " + (err && err.message)); // chỉ log thông báo lỗi, không log dữ liệu yêu cầu
  return { success: false, data: null, error: { code: code, message: ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR } };
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ============================ AUTH ACTIONS ============================ */

function login_(req) {
  const username = str_(req.username, 100), password = typeof req.password === "string" ? req.password : "";
  if (!username || !password || password.length > 200) throw E_("INVALID_CREDENTIALS");
  let t = table_(AUTH_CONFIG.sheets.users);
  let user = findUser_(t, username);
  const now = Date.now();

  if (!user) { hashPassword_(password, randomBytes_(16)); throw E_("INVALID_CREDENTIALS"); } // làm chậm tương đương để khó dò tài khoản
  if (ms_(user.LockedUntil) > now) throw E_("ACCOUNT_LOCKED");

  const ok = verifyPassword_(password, user.PasswordHash, user.PasswordSalt);   // tính hash ngoài khóa để không chặn người khác
  if (!ok) {
    let locked = false;
    withLock_(function () {
      t = table_(AUTH_CONFIG.sheets.users); user = findUser_(t, username);
      const n = (Number(user.FailedAttempts) || 0) + 1;
      if (n >= AUTH_CONFIG.maxFailedAttempts) {
        locked = true;
        updateRow_(t, user, { FailedAttempts: 0, LockedUntil: iso_(now + AUTH_CONFIG.lockMinutes * 60000), UpdatedAt: iso_(now) });
      } else updateRow_(t, user, { FailedAttempts: n, UpdatedAt: iso_(now) });
    });
    throw E_(locked ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS");
  }
  if (!truthy_(user.Active)) throw E_("ACCOUNT_DISABLED");

  let session;
  withLock_(function () {
    t = table_(AUTH_CONFIG.sheets.users); user = findUser_(t, username);
    updateRow_(t, user, { FailedAttempts: 0, LockedUntil: "", UpdatedAt: iso_(now) });
    session = createSession_(user, req.deviceInfo);
  });
  return sessionPayload_(user, session);
}

function logout_(req) {
  const hash = tokenHash_(str_(req.token, 200));
  withLock_(function () {
    const s = table_(AUTH_CONFIG.sheets.sessions);
    s.rows.forEach(function (r) { if (r.SessionTokenHash === hash && !truthy_(r.Revoked)) updateRow_(s, r, { Revoked: "TRUE" }); });
  });
  return { loggedOut: true };
}

function validateSession_(req) {
  const ctx = requireSession_(req.token);
  return { student: profile_(ctx.user), expiresAt: ctx.session.ExpiresAt, mustChangePassword: truthy_(ctx.user.MustChangePassword) };
}

function changePassword_(req) {
  const ctx = requireSession_(req.token);
  const cur = typeof req.currentPassword === "string" ? req.currentPassword : "";
  const next = typeof req.newPassword === "string" ? req.newPassword : "";
  const now = Date.now();
  if (ms_(ctx.user.LockedUntil) > now) throw E_("ACCOUNT_LOCKED");

  if (!verifyPassword_(cur, ctx.user.PasswordHash, ctx.user.PasswordSalt)) {
    withLock_(function () { // đoán mật khẩu hiện tại bằng token bị đánh cắp cũng bị giới hạn
      const t = table_(AUTH_CONFIG.sheets.users), u = findByUid_(t, ctx.user.StudentUID), n = (Number(u.FailedAttempts) || 0) + 1;
      if (n >= AUTH_CONFIG.maxFailedAttempts) updateRow_(t, u, { FailedAttempts: 0, LockedUntil: iso_(now + AUTH_CONFIG.lockMinutes * 60000) });
      else updateRow_(t, u, { FailedAttempts: n });
    });
    throw E_("WRONG_CURRENT_PASSWORD");
  }
  if (next.length < AUTH_CONFIG.minPasswordLength || next.length > AUTH_CONFIG.maxPasswordLength || /^\s|\s$/.test(next)) throw E_("WEAK_PASSWORD");
  if (next === cur) throw E_("SAME_PASSWORD");
  if (next.toUpperCase() === String(ctx.user.Username).toUpperCase()) throw E_("WEAK_PASSWORD");

  const salt = randomBytes_(16), hash = hashPassword_(next, salt);
  let session, user;
  withLock_(function () {
    const t = table_(AUTH_CONFIG.sheets.users); user = findByUid_(t, ctx.user.StudentUID);
    updateRow_(t, user, { PasswordHash: hash, PasswordSalt: b64_(salt), MustChangePassword: "FALSE", FailedAttempts: 0, LockedUntil: "", UpdatedAt: iso_(now) });
    revokeAll_(user.StudentUID);
    session = createSession_(user, req.deviceInfo);
  });
  return sessionPayload_(user, session);
}

/* ============================ TEACHER ACTIONS ============================ */

function teacherListUsers_(req) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]);
  const t = table_(AUTH_CONFIG.sheets.users), now = Date.now(), admin = ctx.user.Role === "admin", set = admin ? null : assignedSet_(ctx.user);
  return {
    users: t.rows.filter(function (r) {
      return r.StudentUID && (admin || (r.Role === "student" && set[String(r.SchoolYear) + "|" + String(r.ClassID)] === true));   // V3: chỉ lớp được phân công
    }).map(function (r) {
      const o = Object.assign(profile_(r), { active: truthy_(r.Active), lockedUntil: ms_(r.LockedUntil) > now ? iso_(ms_(r.LockedUntil)) : "",
        mustChangePassword: truthy_(r.MustChangePassword) });
      if (admin && r.TeacherUID) o.teacherUid = r.TeacherUID;
      return o;
    })
  };
}

function teacherResetPassword_(req) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]);
  const temp = generatePassword_(), salt = randomBytes_(16), hash = hashPassword_(temp, salt);
  let target;
  withLock_(function () {
    const t = table_(AUTH_CONFIG.sheets.users); target = findByUid_(t, str_(req.studentUid, 80));
    assertCanManage_(ctx.user, target);
    updateRow_(t, target, { PasswordHash: hash, PasswordSalt: b64_(salt), MustChangePassword: "TRUE", FailedAttempts: 0, LockedUntil: "", UpdatedAt: iso_(Date.now()) });
    revokeAll_(target.StudentUID);
  });
  return { username: target.Username, fullName: target.FullName, temporaryPassword: temp }; // chỉ trả một lần, không lưu
}

function teacherLockUser_(req) {
  const ctx = requireRole_(req.token, ["teacher", "admin"]);
  const lock = req.locked === true;
  withLock_(function () {
    const t = table_(AUTH_CONFIG.sheets.users), target = findByUid_(t, str_(req.studentUid, 80));
    assertCanManage_(ctx.user, target);
    updateRow_(t, target, lock ? { Active: "FALSE", UpdatedAt: iso_(Date.now()) } : { Active: "TRUE", FailedAttempts: 0, LockedUntil: "", UpdatedAt: iso_(Date.now()) });
    if (lock) revokeAll_(target.StudentUID);
  });
  return { locked: lock };
}

function assertCanManage_(actor, target) {
  if (!target) throw E_("NOT_FOUND");
  if (target.StudentUID === actor.StudentUID) throw E_("FORBIDDEN");
  if (actor.Role !== "admin" && target.Role !== "student") throw E_("FORBIDDEN");
  if (actor.Role !== "admin" && !isAssigned_(actor, target.ClassID, String(target.SchoolYear))) throw E_("UNAUTHORIZED"); // V3
}

/* ============================ SESSION ============================ */

function createSession_(user, deviceInfo) {
  const token = b64web_(randomBytes_(32)), now = Date.now();
  const expires = iso_(now + AUTH_CONFIG.sessionHours * 3600000);
  table_(AUTH_CONFIG.sheets.sessions).sh.appendRow([Utilities.getUuid(), user.StudentUID, tokenHash_(token), iso_(now), expires, iso_(now), "FALSE", str_(deviceInfo, 200)]);
  return { token: token, expiresAt: expires };
}
function sessionPayload_(user, s) {
  return { sessionToken: s.token, expiresAt: s.expiresAt, mustChangePassword: truthy_(user.MustChangePassword), student: profile_(user) };
}

function requireSession_(token, opts) {
  token = str_(token, 200);
  if (!token) throw E_("INVALID_SESSION");
  const hash = tokenHash_(token), st = table_(AUTH_CONFIG.sheets.sessions);
  const s = st.rows.filter(function (r) { return safeEqual_(String(r.SessionTokenHash), hash); })[0];
  if (!s || truthy_(s.Revoked)) throw E_("INVALID_SESSION");
  const now = Date.now();
  if (ms_(s.ExpiresAt) <= now) throw E_("SESSION_EXPIRED");
  const user = findByUid_(table_(AUTH_CONFIG.sheets.users), s.StudentUID);
  if (!user || !truthy_(user.Active)) throw E_("INVALID_SESSION");
  if (now - ms_(s.LastActivity) > 60000) updateRow_(st, s, { LastActivity: iso_(now) });
  const o = opts || {};
  if (o.allowMustChange === false && truthy_(user.MustChangePassword)) throw E_("PASSWORD_CHANGE_REQUIRED");
  return { user: user, session: s };
}
function requireRole_(token, roles) {
  const ctx = requireSession_(token, { allowMustChange: false });
  if (roles.indexOf(ctx.user.Role) < 0) throw E_("FORBIDDEN"); // kiểm tra quyền ở backend, không tin frontend
  return ctx;
}
function revokeAll_(uid) {
  const s = table_(AUTH_CONFIG.sheets.sessions);
  s.rows.forEach(function (r) { if (r.StudentUID === uid && !truthy_(r.Revoked)) updateRow_(s, r, { Revoked: "TRUE" }); });
}

/* ============================ CRYPTO ============================ */

function utf8_(s) { return Utilities.newBlob(String(s)).getBytes(); }
function b64_(b) { return Utilities.base64Encode(b); }
function b64web_(b) { return Utilities.base64EncodeWebSafe(b).replace(/=+$/, ""); }
function hmac_(msg, key) { return Utilities.computeHmacSha256Signature(msg, key); }

/** Byte ngẫu nhiên từ UUID v4 (nguồn ngẫu nhiên của Google) qua SHA-256. */
function randomBytes_(n) {
  let out = [];
  while (out.length < n) out = out.concat(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
  return out.slice(0, n);
}
/** PBKDF2-HMAC-SHA256 (RFC 8018), 1 khối 32 byte. */
function pbkdf2_(password, salt, iterations) {
  const key = utf8_(password);
  let u = hmac_(salt.concat([0, 0, 0, 1]), key);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) { u = hmac_(u, key); for (let j = 0; j < 32; j++) t[j] = t[j] ^ u[j]; }
  return t;
}
function hashPassword_(password, saltBytes) {
  const it = AUTH_CONFIG.pbkdf2Iterations;
  return "pbkdf2-sha256$" + it + "$" + b64_(pbkdf2_(password, saltBytes, it));
}
function verifyPassword_(password, stored, saltB64) {
  const p = String(stored).split("$");
  if (p.length !== 3 || p[0] !== "pbkdf2-sha256") return false;
  const calc = b64_(pbkdf2_(password, Array.prototype.slice.call(Utilities.base64Decode(String(saltB64))), Number(p[1])));
  return safeEqual_(calc, p[2]);
}
function pepper_() {
  const v = PropertiesService.getScriptProperties().getProperty("TOKEN_PEPPER");
  if (!v) throw E_("NOT_SETUP");
  return v;
}
function tokenHash_(token) { return b64_(hmac_(utf8_(token), utf8_(pepper_()))); }
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function generatePassword_() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // bỏ ký tự dễ nhầm
  let out = "";
  while (out.length < AUTH_CONFIG.tempPasswordLength) {
    randomBytes_(32).forEach(function (b) { const v = b & 255; if (out.length < AUTH_CONFIG.tempPasswordLength && v < 216) out += A.charAt(v % A.length); });
  }
  return out;
}

/* ============================ SHEET HELPERS ============================ */

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw E_("NOT_SETUP");
  return ss;
}
function table_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw E_("NOT_SETUP");
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  const vals = lr >= 1 ? sh.getRange(1, 1, lr, lc).getValues() : [[]];
  const headers = vals[0].map(String);
  const rows = vals.slice(1).map(function (v, i) {
    const o = { _row: i + 2 }; headers.forEach(function (h, c) { o[h] = v[c]; }); return o;
  });
  return { sh: sh, headers: headers, rows: rows };
}
function updateRow_(t, row, changes) {
  Object.keys(changes).forEach(function (k) { row[k] = changes[k]; });
  t.sh.getRange(row._row, 1, 1, t.headers.length).setValues([t.headers.map(function (h) { return row[h] === undefined ? "" : row[h]; })]);
}
function findUser_(t, username) {
  const u = String(username).toUpperCase();
  return t.rows.filter(function (r) { return r.StudentUID && String(r.Username).toUpperCase() === u; })[0];
}
function findByUid_(t, uid) { return t.rows.filter(function (r) { return r.StudentUID === uid; })[0]; }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { throw E_("BUSY"); }   // hệ thống đang bận: client tự thử lại
  try { return fn(); } finally { lock.releaseLock(); }
}
function profile_(r) {
  return { studentUid: r.StudentUID, studentId: r.StudentID, username: r.Username, fullName: r.FullName, classId: r.ClassID,
    grade: Number(r.Grade) || null, schoolLevel: r.SchoolLevel, schoolYear: r.SchoolYear, role: r.Role };
}
function str_(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function truthy_(v) { return v === true || String(v).toUpperCase() === "TRUE"; }
function ms_(v) { return v instanceof Date ? v.getTime() : (v ? Date.parse(v) || 0 : 0); }
function iso_(ms) { return new Date(ms).toISOString(); }

/* ============================ DÀNH CHO GIÁO VIÊN / DEV (chạy trong trình soạn thảo hoặc menu Sheet) ============================ */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu("Tin học – Tài khoản")
      .addItem("1. Cài đặt (setupAuth)", "setupAuth").addItem("2. Nhập tài khoản (importUsers)", "importUsers")
      .addItem("3. Xóa danh sách mật khẩu tạm", "clearNewAccounts")
      .addItem("4. Cài đặt V3 (setupV3)", "setupV3").addItem("5. Nâng cấp V2→V3 (migrateV2ToV3)", "migrateV2ToV3").addToUi();
  } catch (e) {}
}

/** Tạo các sheet + tiêu đề + pepper. Chạy nhiều lần an toàn: không xóa dữ liệu, không tạo sheet trùng. */
function setupAuth() {
  const S = AUTH_CONFIG.sheets;
  ensureSheet_(S.users, USERS_HEADERS); ensureSheet_(S.sessions, SESSIONS_HEADERS);   // PROGRESS do setupV2() quản lý
  ensureSheet_(S.import, IMPORT_HEADERS);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TOKEN_PEPPER")) props.setProperty("TOKEN_PEPPER", b64web_(randomBytes_(32)));
  Logger.log("setupAuth: xong.");
}
function ensureSheet_(name, headers) {
  const ss = getSS_();
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const lc = sh.getLastColumn(), existing = sh.getLastRow() >= 1 && lc >= 1 ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
  headers.forEach(function (h) {
    if (existing.indexOf(h) < 0) { existing.push(h); sh.getRange(1, existing.length).setValue(h); }
  });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), existing.length).setNumberFormat("@"); // định dạng văn bản: tránh Sheets tự đổi kiểu
  return sh;
}

/** Đọc sheet IMPORT, tạo tài khoản + mật khẩu tạm, ghi danh sách phát vào NEW_ACCOUNTS (xóa bằng clearNewAccounts). */
function importUsers() {
  setupAuth();
  const imp = table_(AUTH_CONFIG.sheets.import), users = table_(AUTH_CONFIG.sheets.users);
  const out = ensureSheet_(AUTH_CONFIG.sheets.newAccounts, NEW_ACCOUNT_HEADERS);
  const taken = {}; users.rows.forEach(function (r) { if (r.Username) taken[String(r.Username).toUpperCase()] = true; });
  const started = Date.now(); let created = 0, dup = 0, partial = false;
  for (let i = 0; i < imp.rows.length; i++) {
    const r = imp.rows[i], sid = str_(String(r.StudentID), 60);
    if (!sid || String(r.Imported) === "DONE" || String(r.Imported) === "DUPLICATE") continue;
    if (Date.now() - started > 270000) { partial = true; break; }   // gần hết 6 phút: chạy lại để làm tiếp
    if (taken[sid.toUpperCase()]) { updateRow_(imp, r, { Imported: "DUPLICATE" }); dup++; continue; }
    const role = ["student", "teacher", "admin"].indexOf(String(r.Role)) >= 0 ? String(r.Role) : "student";
    const temp = generatePassword_(), salt = randomBytes_(16), now = iso_(Date.now());
    const uid = "stu_" + Utilities.getUuid().replace(/-/g, "");
    users.sh.appendRow([uid, sid, sid, str_(String(r.FullName), 100), str_(String(r.ClassID), 20), r.Grade, str_(String(r.SchoolLevel), 20), str_(String(r.SchoolYear), 20),
      hashPassword_(temp, salt), b64_(salt), role, "TRUE", 0, "", "TRUE", now, now,
      role === "student" ? "" : "tch_" + Utilities.getUuid().replace(/-/g, "")]);
    out.appendRow([sid, sid, r.FullName, r.ClassID, role, temp]);
    updateRow_(imp, r, { Imported: "DONE" });
    taken[sid.toUpperCase()] = true; created++;
  }
  Logger.log("importUsers: tạo " + created + ", trùng " + dup + (partial ? " (chưa xong, hãy chạy lại)" : "") +
    ". Hãy in/sao chép NEW_ACCOUNTS rồi chạy clearNewAccounts().");
}
/** Xóa mật khẩu tạm khỏi sheet NEW_ACCOUNTS sau khi đã phát cho học sinh. */
function clearNewAccounts() {
  const sh = getSS_().getSheetByName(AUTH_CONFIG.sheets.newAccounts);
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
}
/** Xóa phiên đã hết hạn hơn 7 ngày. Có thể đặt Trigger theo ngày. */
function purgeExpiredSessions() {
  const t = table_(AUTH_CONFIG.sheets.sessions), cut = Date.now() - 7 * 86400000;
  const keep = t.rows.filter(function (r) { return ms_(r.ExpiresAt) > cut; });
  if (keep.length === t.rows.length) return;
  if (t.rows.length) t.sh.getRange(2, 1, t.rows.length, t.headers.length).clearContent();
  if (keep.length) t.sh.getRange(2, 1, keep.length, t.headers.length).setValues(keep.map(function (r) { return t.headers.map(function (h) { return r[h]; }); }));
}
/** Đo thời gian băm 1 mật khẩu để chọn pbkdf2Iterations (không ghi mật khẩu thật). */
function benchmarkHash() {
  const t0 = Date.now(); hashPassword_("benchmark-only", randomBytes_(16));
  Logger.log("1 lần băm = " + (Date.now() - t0) + " ms với " + AUTH_CONFIG.pbkdf2Iterations + " vòng lặp");
}
