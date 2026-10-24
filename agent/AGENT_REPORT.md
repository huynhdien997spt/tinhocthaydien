# ANTIGRAVITY EXECUTION REPORT

> File này do Antigravity cập nhật sau khi thực hiện `agent/NEXT_TASK.md`.

# Task

```text
Task ID: P4.1 + P4.2
Phase: Phase 4A
Task Name: Diagnostic Spec & Mastery Rules Design
```

# Git

```text
Repository: huynhdien997spt/tinhocthaydien
Branch: phase4-diagnostic-design-review
Base Commit: 0067f83080f9b6894f1ea7032a93d0f75f9a83c7
Application Baseline: ecc56e274739078b431cf8fe294040a9cb6bacf5
Final Commit: a4ae391219b6eb82372fbf00e57201c8014e7a83
Commit Message: docs(p4): define diagnostic and mastery evidence model
```

# Work Completed Summary

```text
1. P4.1 Diagnostic Specification (docs/phase4/diagnostic_spec.md):
   - Student-facing title: "Khám phá điểm xuất phát" (tuyệt đối không dùng "Thi đầu vào", "Kiểm tra đầu vào", "Xếp loại", "yếu", "kém", "mất gốc").
   - Thời lượng tối đa: ≤ 15 phút (10–12 phút probes, 2–3 phút self-report).
   - Phân bố probes:
     * Nhóm A (Thông tin và dữ liệu): 3 probes bao phủ G6-A-01, G6-A-02, G6-A-03, G6-A-04.
     * Nhóm B (Xử lí thông tin): 2 probes bao phủ G6-A-05, G6-A-06.
     * Nhóm C (Target Readiness Preview): 3 probes thăm dò mức độ sẵn sàng cho G6-A-07, G6-A-08, G6-A-09, G6-A-10.
     * Self-report: 2 câu hỏi về phong cách hỗ trợ và mức độ tự tin (chỉ là tín hiệu phụ, không thay thế minh chứng).
   - Anti-reductionism: Tuyệt đối không quy về 1 tổng điểm số học (7/10, 70%, Khá/Yếu).
   - Diagnostic Evidence Status: 4 mức khởi điểm (no_evidence, emerging_evidence, ready_evidence, conflicting_evidence).
   - 3 Profiles lộ trình học tập:
     * Profile A ("Cần củng cố nền"): Micro-review trực quan + mở sẵn Support Ladder Tier 1 ("Mình cùng ôn nhanh vài ý nền trước nhé").
     * Profile B ("Sẵn sàng học bài"): Đường học chuẩn Golden Lesson G6-L03.
     * Profile C ("Sẵn sàng mở rộng"): Tăng tình huống thử thách chuyển giao, giảm gợi ý ban đầu; TUYỆT ĐỐI KHÔNG miễn học YCCĐ bắt buộc.
   - Learning Path Governance: Diagnostic chỉ cấu hình nấc hỗ trợ và thứ tự gợi ý; không được miễn trừ YCCĐ, không bỏ qua sản phẩm bắt buộc, không auto-complete, không auto-mastery.

2. P4.2 Mastery Rules (docs/phase4/mastery_rules.md):
   - Đánh giá năng lực theo từng RequirementID độc lập; không tính theo lesson percent hay quiz total score.
   - 4 mức thành thạo chuẩn & mã máy:
     * 🌱 Chưa đủ minh chứng (insufficient_evidence)
     * 🌿 Đang hình thành (developing)
     * 🌳 Đạt yêu cầu (meets_requirement)
     * 🚀 Vận dụng mở rộng (transfer_extension)
   - Phân tầng minh chứng (Evidence Hierarchy): Knowledge, Performance, Product, Reflection.
   - Giới hạn của Diagnostic: Không bao giờ cấp trực tiếp 🌳 hay 🚀.
   - Xử lý câu trả lời mở: Giữ nguyên evaluationStatus="needs_teacher_review", isCorrect=null, score=null; không auto-grant full score; YCCĐ đòi hỏi sản phẩm mở (G6-A-07, G6-A-10) bắt buộc phải qua giáo viên phê duyệt mới được cấp 🌳/🚀.
   - Xử lý nhiều lần thử: Lưu trữ lịch sử lần thử và nấc hỗ trợ sử dụng; tiến bộ sau hỗ trợ là căn cứ tích cực, nhưng mức thành thạo phản ánh độ ổn định hiện tại.
   - Xử lý minh chứng mâu thuẫn (Conflicting Evidence): Trắc nghiệm đúng nhưng giải thích/sản phẩm sai -> giữ ở 🌿 và gắn cờ REVIEW_REQUIRED, không cấp 🌳.
   - Mức 🚀 đòi hỏi Transfer Evidence: Minh chứng chuyển giao thực tế trong bối cảnh mới.
   - Kịch bản minh chứng cụ thể cho Bài 3 (G6-A-07, G6-A-08, G6-A-09, G6-A-10); G6-A-09 bắt buộc có cả tên, độ lớn xấp xỉ hệ thập phân (1000) và quy đổi gần đúng.
   - Master Rule Table: Ma trận quy tắc hoàn chỉnh cho 4 YCCĐ.

3. Proposal Design Contract (docs/phase4/phase4_design_contract.json):
   - Hợp đồng thiết kế đề xuất ở định dạng JSON Draft 2020-12, proposalOnly=true, productionApproved=false.

4. Validation (tools/curriculum/verify-p4-design.js):
   - 5/5 kiểm tra đạt PASS 100%:
     * JSON Schema & parse valid.
     * Toàn bộ 10 RequirementIDs (G6-A-01..10) khớp chính xác trong data/requirements/requirements-g6.json.
     * officialText của 38 YCCĐ được bảo lưu nguyên vẹn 100%.
     * 0 file mã nguồn ứng dụng (assets/, backend/, schemas/) bị thay đổi.
```

# Files Created

```text
docs/phase4/diagnostic_spec.md (Đặc tả P4.1 "Khám phá điểm xuất phát")
docs/phase4/mastery_rules.md (Đặc tả P4.2 Mastery Model & Master Rule Table)
docs/phase4/phase4_design_contract.json (Bản thiết kế hợp đồng dữ liệu Phase 4A)
tools/curriculum/verify-p4-design.js (Harness kiểm tra tính toàn vẹn tài liệu và mã YCCĐ)
agent/NEXT_TASK.md (Cập nhật task Phase 4A)
agent/AGENT_REPORT.md (Báo cáo thực hiện Phase 4A)
```

# Application Files Changed

```text
None (0 files modified in assets/, backend/, data/, schemas/)
```

# Production Safety Checks

```text
Merge: NO
Push main: NO
Deploy GitHub Pages: NO
Deploy Apps Script: NO
Data Contract modified: NO
Production schemas modified: NO
officialText modified: NO
Start P4.3 / Engine implementation: NO
```

# Final Status

```text
P4.1 STATUS: READY_FOR_REVIEW
P4.2 STATUS: READY_FOR_REVIEW
```
