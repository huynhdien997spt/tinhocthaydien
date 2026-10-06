// DANH SÁCH BÀI HỌC. Thêm bài mới: chép một khối { ... } rồi sửa. Không cần sửa index.html.
// status: "active" (sẵn sàng) | "updating" (đang cập nhật) | "locked" (chưa mở)
// url: đường dẫn trong repo ("lessons/...") hoặc web ngoài ("https://...").
// learningModel: "WebQuest" | "PRIMM" | "PRIDAM" | "ActivityBased"
// Các trường requirements, qualities, competencies, activities, resources để dành cho các phiên bản sau.
window.LESSONS = [
  {
    lessonId: "G4-B1", schoolLevel: "TIEUHOC", grade: 4, subject: "Tin học",
    title: "Bài 1. Làm quen với máy tính", shortTitle: "Làm quen với máy tính",
    description: "Em nhận biết các bộ phận quen thuộc của máy tính.",
    schoolYear: "2026-2027", status: "active", duration: 35, learningModel: "ActivityBased",
    url: "lessons/grade4/bai1/index.html",
    requirements: [], qualities: [],
    competencies: { general: [], informatics: [], digital: [], ai: [] },
    activities: [], resources: []
  },
  {
    lessonId: "G6-B3", schoolLevel: "THCS", grade: 6, subject: "Tin học",
    title: "Bài 3. Thông tin trong máy tính", shortTitle: "Thông tin trong máy tính",
    description: "Khám phá cách thông tin được biểu diễn trong máy tính.",
    schoolYear: "2026-2027", status: "active", duration: 90, learningModel: "WebQuest",
    url: "lessons/grade6/bai3/index.html",
    requirements: [], qualities: [],
    competencies: { general: [], informatics: [], digital: [], ai: [] },
    activities: [
      { id: "A1", type: "opening", title: "Khởi động", objective: "", task: "", instructions: "", product: "", assessment: "", duration: 10 },
      { id: "A2", type: "knowledge", title: "Khám phá", objective: "", task: "", instructions: "", product: "", assessment: "", duration: 25 },
      { id: "A3", type: "practice", title: "Luyện tập", objective: "", task: "", instructions: "", product: "", assessment: "", duration: 25 },
      { id: "A4", type: "application", title: "Vận dụng", objective: "", task: "", instructions: "", product: "", assessment: "", duration: 20 }
    ],
    completion: { requiredActivities: ["A1", "A2", "A3", "A4"], requireExitTicket: true },   // backend/StudentV2.gs (LESSON_RULES) phải khớp
    resources: []
  },
  {
    lessonId: "G9-B3", schoolLevel: "THCS", grade: 9, subject: "Tin học",
    title: "Bài 3. Đánh giá chất lượng thông tin", shortTitle: "Đánh giá chất lượng thông tin",
    description: "Học cách nhận biết thông tin đáng tin cậy trên Internet.",
    schoolYear: "2026-2027", status: "active", duration: 90, learningModel: "PRIDAM",
    url: "lessons/grade9/bai3/index.html",
    requirements: [], qualities: [],
    competencies: { general: [], informatics: [], digital: [], ai: [] },
    activities: [], resources: []
  },
  {
    lessonId: "G10-B1", schoolLevel: "THPT", grade: 10, subject: "Tin học",
    title: "Bài 1. Thông tin và xử lí thông tin", shortTitle: "Thông tin và xử lí thông tin",
    description: "Bài mẫu để kiểm tra hệ thống cho khối 10.",
    schoolYear: "2026-2027", status: "active", duration: 45, learningModel: "PRIMM",
    url: "lessons/grade10/bai1/index.html",
    requirements: [], qualities: [],
    competencies: { general: [], informatics: [], digital: [], ai: [] },
    activities: [], resources: []
  },
  {
    lessonId: "G11-B1", schoolLevel: "THPT", grade: 11, subject: "Tin học",
    title: "Bài 1. Hệ điều hành", shortTitle: "Hệ điều hành",
    description: "Tìm hiểu vai trò và chức năng của hệ điều hành.",
    schoolYear: "2026-2027", status: "active", duration: 90, learningModel: "ActivityBased",
    url: "lessons/grade11/bai1/index.html",
    requirements: [], qualities: [],
    competencies: { general: [], informatics: [], digital: [], ai: [] },
    activities: [], resources: []
  }
];
