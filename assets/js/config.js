// CẤU HÌNH CHUNG – giáo viên chỉ cần sửa file này để đổi năm học, tên, bật/tắt tính năng.
const CONFIG = {
  version: "3.0.0-rc.1",   // đổi thành 3.0.0 sau khi hoàn tất kiểm thử thật trên Google Sheet + Apps Script (xem README, mục "Kiểm thử thật")
  appName: "Tin học cùng Thầy Diễn",
  teacherName: "Huỳnh Văn Diễn",
  schoolYear: "2026-2027",
  // Dán Google Apps Script Web App URL (đuôi /exec) tại đây. Bắt buộc để đăng nhập.
  googleScriptUrl: "https://script.google.com/macros/s/AKfycbx9qGmv7_7UvtMWCijwvPUfdj0gGx4LVkf5PaGpi2g13g0EN6LpIsNfg1VhD7c92PCcIQ/exec",
  enableTeacherMode: true,
  enableSkills: false,
  enableProducts: false,
  learning: {
    idleMinutes: 5,              // không thao tác quá số phút này thì ngừng tính thời gian học
    heartbeatSeconds: 60,        // gửi nhịp tim (thời gian học tích lũy) mỗi ~60 giây
    tickMs: 1000
  },
  sync: {
    flushDebounceMs: 400,        // gom sự kiện rồi gửi một lần
    batchSize: 50,
    retryBaseSeconds: 2,         // thử lại với giãn cách tăng dần
    retryMaxSeconds: 60
  },
  teacher: {
    autoRefresh: true,
    refreshSeconds: 60,          // đừng đặt quá thấp: Apps Script/Google Sheets có hạn mức
    liveWindowMinutes: 15,       // 'Hoạt động gần đây' = có cập nhật trong khoảng này
    searchDebounceMs: 300
  },
  auth: {
    enabled: true,                 // dành cho tương lai (nhiều provider)
    provider: "google-apps-script",
    requireLogin: true,
    sharedDeviceMode: true,        // máy dùng chung (phòng Tin học): xóa sạch dữ liệu cục bộ khi đăng xuất
    sessionIdleMinutes: 30         // không thao tác quá số phút này sẽ tự đăng xuất
  }
};
