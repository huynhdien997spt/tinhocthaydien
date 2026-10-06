// Chuyển data/students.js (V1) → dữ liệu dán vào sheet IMPORT (cột: StudentID, FullName, ClassID, Grade, SchoolLevel, SchoolYear, Role).
// Các bản V1 cũ dùng "name"; V1 hiện tại dùng "fullName" – cả hai đều được chấp nhận.
document.getElementById("go").addEventListener("click", function () {
  var rows = (window.STUDENTS || []).filter(function (s) { return s.active !== false; }).map(function (s) {
    var level = s.schoolLevel || (s.grade <= 5 ? "TIEUHOC" : s.grade <= 9 ? "THCS" : "THPT");
    return [s.studentId, s.fullName || s.name, s.classId || s.className, s.grade, level, s.schoolYear || CONFIG.schoolYear, "student"].join("\t");
  });
  document.getElementById("out").value = rows.join("\n");
});
document.getElementById("copy").addEventListener("click", function () {
  var o = document.getElementById("out"); o.select();
  try { document.execCommand("copy"); } catch (e) {}
});
