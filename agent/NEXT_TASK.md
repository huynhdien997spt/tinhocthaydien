# CURRENT TASK

Antigravity phải đọc toàn bộ:

```text
agent/AGENT_RULES.md
agent/NEXT_TASK.md
```

trước khi thực hiện.

# Phase

```text
Phase 4A
```

# Task ID

```text
P4A-R1
```

# Task Name

```text
Correct P4.1 Diagnostic Routing + P4.2 Evidence Contract (Revision)
```

# Repository

```text
huynhdien997spt/tinhocthaydien
```

# Branch bắt buộc

```text
phase4-diagnostic-design-review
```

# Base Reviewed Commit

```text
9b7173562332b613d5bcb1bc9471390b0f309d18
```

# Phase 3 Base

```text
0067f83080f9b6894f1ea7032a93d0f75f9a83c7
```

# Application Baseline

```text
ecc56e274739078b431cf8fe294040a9cb6bacf5
```

# Golden Lesson

```text
G6-L03
Bài 3. Thông tin trong máy tính
Khối 6
Thời lượng: 90 phút / 2 tiết
```

---

# Objective

Sửa đổi và chuẩn hóa tài liệu thiết kế đặc tả Phase 4A:
1. FIX 1 & 4: Self-report auxiliary only (`selfReportInfluence = "support_only"`). Tách biệt `profileDecision` và `supportConfiguration`. Self-report KHÔNG được tự quyết định Profile.
2. FIX 2: Profile rules deterministic & non-overlapping:
   - Step 1 (Priority 1): Critical support check (critical misconception / conflicting evidence / >= 2 non-ready prerequisites) -> `PROFILE A` (`foundation_consolidation`).
   - Step 2 (Priority 2): Extension readiness check (6/6 ready + no conflict + target readiness aware/partially_aware) -> `PROFILE C` (`extension_readiness`).
   - Step 3 (Priority 3): Default standard path -> `PROFILE B` (`standard_readiness`).
3. FIX 3: Probe 4 chuyển sang ngữ cảnh số chuẩn hóa (Camera -> Thu nhận, Lưu file -> Lưu trữ, Chỉnh ảnh -> Xử lí, Gửi mail -> Truyền).
4. FIX 5: Required evidence không trộn bare ActivityID với EvidenceID. G6-A-10 cấu trúc rõ ràng (`evidenceId`, `activityId`, `sourceType`, `evidenceType`).
5. FIX 6: Đối soát toàn diện 3 chiều kích của G6-A-09 (`unit_names`, `decimal_approximation`, `approximate_conversion`). Ghi nhận `DESIGN_GAP: None`.
6. FIX 7: Profile C không nhầm lẫn "đã nghe qua" (awareness) với "đã hiểu sâu sắc".
7. Hardened Validator: `tools/curriculum/verify-p4-design.js` kiểm tra git diff thật, so khớp 38/38 officialText với base commit 0067f830, kiểm tra tính toàn vẹn minh chứng và profile rules.
8. KHÔNG implement Diagnostic Engine / Learning Path Engine / Mastery Engine.
9. KHÔNG sửa frontend, backend, Data Contract production, Requirement Bank, G6-L03.golden.json.
10. KHÔNG merge main, deploy, start P4.3.
