// storage.js – localStorage an toàn + các hàm lưu dữ liệu học tập.
// Giả định: localStorage có thể bị người dùng đọc/sửa. Không bao giờ lưu mật khẩu/hash/salt ở đây.
const Store = {
  prefix: "thtd.",
  get(key)        { try { return localStorage.getItem(this.prefix + key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(this.prefix + key, value); return true; } catch (e) { return false; } },
  remove(key)     { try { localStorage.removeItem(this.prefix + key); } catch (e) {} },
  getJSON(key, fallback) { try { return JSON.parse(this.get(key)) || fallback; } catch (e) { return fallback; } },
  setJSON(key, value)    { return this.set(key, JSON.stringify(value)); },
  removeByPrefix(p) {
    try { Object.keys(localStorage).forEach(k => { if (k.indexOf(this.prefix + p) === 0) localStorage.removeItem(k); }); } catch (e) {}
  }
};

// ---------- Dữ liệu học tập: lớp tương thích V1.1 → gọi dịch vụ V2 thật (không còn hàm giữ chỗ) ----------
// Backend tự xác định học sinh từ sessionToken nên KHÔNG gửi studentUid.
function loadProgress(lessonId) { return lessonId ? ProgressService.load(lessonId) : ProgressService.loadMyLessons(); }
function saveProgress(lessonId, status) {                 // status cũ: started | in-progress | completed
  return /^complet/i.test(status || "") ? ProgressService.complete(lessonId) : Promise.resolve(ProgressService.start(lessonId));
}
function saveResponse(lessonId, response)      { return Promise.resolve(ResponseService.save(lessonId, response)); }
function saveExitTicket(lessonId, exitTicket)  { return ResponseService.submitExitTicket(lessonId, exitTicket); }
// Dành cho V4 (sản phẩm của học sinh) – chưa thuộc phạm vi hiện tại:
function saveProduct() { return Promise.resolve({ success: false, data: null, error: { code: "NOT_IMPLEMENTED" } }); }
