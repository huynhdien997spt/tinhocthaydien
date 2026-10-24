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
    lessonId: "G6-L03", legacyLessonId: "G6-B3", schoolLevel: "THCS", grade: 6, subject: "Tin học",
    title: "Bài 3. Thông tin trong máy tính", shortTitle: "Thông tin trong máy tính",
    description: "Khám phá cách thông tin được biểu diễn bằng bit (0 và 1), thang dung lượng (Byte, KB, MB, GB) và các thiết bị nhớ thông dụng.",
    schoolYear: "2026-2027", status: "active", duration: 90, learningModel: "WebQuest",
    url: "lessons/grade6/bai3/index.html",
    requirements: ["G6-A-07", "G6-A-08", "G6-A-09", "G6-A-10"], qualities: [],
    competencies: { general: [], informatics: ["NLa", "NLc"], digital: ["1.3.TC1a", "5.2.TC1a", "5.2.TC1b"], ai: [] },
    activities: [
      { id: "G6-L03-A01", type: "opening", title: "A01 – Thử thách 0–1", objective: "HS nhận ra vấn đề: máy tính biểu diễn thông tin bằng 0 và 1.", task: "", instructions: "", product: "", assessment: "quiz_response", duration: 5, period: 1 },
      { id: "G6-L03-A02", type: "knowledge", title: "A02 – Phòng thí nghiệm Pixel → Bit", objective: "Giải thích được có thể biểu diễn thông tin chỉ với hai kí hiệu 0 và 1.", task: "", instructions: "", product: "Sản phẩm 1: Chuỗi bit 4×4 + 1 câu giải thích", assessment: "short_answer", duration: 18, period: 1 },
      { id: "G6-L03-A03", type: "knowledge", title: "A03 – Bit là gì?", objective: "Biết được bit là đơn vị nhỏ nhất trong lưu trữ thông tin.", task: "", instructions: "", product: "", assessment: "quiz_response", duration: 12, period: 1 },
      { id: "G6-L03-A04", type: "reflection", title: "A04 – Checkpoint Tiết 1", objective: "Củng cố G6-A-07 và G6-A-08 để khép lại Tiết 1 ở mốc 50%.", task: "", instructions: "", product: "", assessment: "quiz_response, short_answer", duration: 10, period: 1 },
      { id: "G6-L03-A05", type: "knowledge", title: "A05 – Thang dung lượng", objective: "Nêu được tên, độ lớn xấp xỉ hệ thập phân và quy đổi gần đúng giữa Byte, KB, MB, GB.", task: "", instructions: "", product: "", assessment: "worksheet_table, quiz_response", duration: 15, period: 2 },
      { id: "G6-L03-A06", type: "application", title: "A06 – WebQuest “Cứu bộ nhớ”", objective: "Vận dụng quy đổi dung lượng và chọn thiết bị nhớ phù hợp (NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b).", task: "", instructions: "", product: "Sản phẩm 2: PHIẾU TƯ VẤN LƯU TRỮ", assessment: "worksheet_table, quiz_response", duration: 20, period: 2 },
      { id: "G6-L03-A07", type: "application", title: "A07 – Vận dụng máy đang dùng", objective: "Đọc dung lượng ổ đĩa/thiết bị nhớ qua REAL_DEVICE hoặc SIMULATION.", task: "", instructions: "", product: "", assessment: "quiz_response", duration: 5, period: 2 },
      { id: "G6-L03-A08", type: "reflection", title: "A08 – Nhìn lại + Exit Ticket", objective: "Hoàn thành Exit Ticket và câu vận dụng chọn thiết bị cho khoảng 6 GB dữ liệu.", task: "", instructions: "", product: "Exit Ticket", assessment: "exit_ticket_reflection", duration: 5, period: 2 }
    ],
    completion: {
      requiredActivities: [
        "G6-L03-A01",
        "G6-L03-A02",
        "G6-L03-A03",
        "G6-L03-A04",
        "G6-L03-A05",
        "G6-L03-A06",
        "G6-L03-A07",
        "G6-L03-A08"
      ],
      requireExitTicket: true
    },   // backend/StudentV2.gs (LESSON_RULES) phải khớp
    resources: ["RES-G6-L03-01", "RES-G6-L03-02"]
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
