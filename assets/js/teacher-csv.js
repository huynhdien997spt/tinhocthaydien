// teacher-csv.js – xuất CSV UTF-8 (có BOM để Excel đọc đúng tiếng Việt). Dữ liệu đưa vào chỉ lấy từ phản hồi API Teacher
// (không có mật khẩu/hash/salt/token). Ô bắt đầu bằng = + - @ được chặn công thức (CSV injection).
const Csv = {
  cell(v) {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  },
  build(header, rows) { return "\uFEFF" + [header].concat(rows).map(r => r.map(Csv.cell).join(",")).join("\r\n") + "\r\n"; },
  download(filename, header, rows) {
    const url = URL.createObjectURL(new Blob([Csv.build(header, rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
