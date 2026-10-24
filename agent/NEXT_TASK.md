# CURRENT TASK

Antigravity phải đọc toàn bộ:

```text
agent/AGENT_RULES.md
agent/NEXT_TASK.md
```

trước khi thực hiện.

# Phase

```text
Phase 3
```

# Task ID

```text
P3.4-B
```

# Task Name

```text
Golden Lesson UAT – Isolation, Resume, Completion & Teacher Evidence
```

# Repository

```text
huynhdien997spt/tinhocthaydien
```

# Branch

```text
phase3-golden-lesson-review
```

# Current Branch Head Before This Task

```text
37bae401d7dae611bd06e8a803c9ac62da2ab63f
```

# Human UAT Round 1

Project Controller records teacher confirmation that Round 1 was completed:
- login succeeded;
- G6-L03 opened;
- Period 1 A01–A04 completed;
- checkpoint reached 50%;
- no blocking issue reported.

Treat this as HUMAN_UAT_ROUND1_PASS.

Do not alter production.

---

# Objective

Verify the remaining P3.4 contract:

1. student isolation on shared device;
2. resume after logout/login;
3. Period 2 unlock only after 50% checkpoint;
4. completion requires A05–A08 + Exit Ticket;
5. teacher-facing evidence is recoverable;
6. offline/idempotency behavior remains valid;
7. no regression.

---

# A. Pre-check

Run:

```bash
git fetch origin
git status
git branch --show-current
git rev-parse HEAD
```

Expected branch:

```text
phase3-golden-lesson-review
```

Application source baseline remains:

```text
ecc56e274739078b431cf8fe294040a9cb6bacf5
```

Later commits may contain only agent workflow docs unless a bug fix is explicitly required.

---

# B. Student Isolation Test

Use only TEST student accounts.

Scenario:

1. Student A has progress at 50% in G6-L03.
2. Logout Student A.
3. On the same browser/device, login Student B.
4. Student B must NOT see:
   - Student A progress;
   - Student A responses;
   - Student A products;
   - Student A Exit Ticket;
   - Student A offline queue;
   - Student A current activity.
5. Student B must start G6-L03 from 0% unless Student B independently already has valid data.

Verify identity isolation is governed by StudentUID/server session, not name/ClassID/client username alone.

Do not log passwords/tokens.

---

# C. Resume Test

For Student A:

1. Logout and login again.
2. Open G6-L03.
3. Restore expected state:

```text
percentComplete = 50
status = in_progress
nextActivityId = G6-L03-A05
Period 2 = unlocked
resume activity = A05
```

4. Verify A01–A04 evidence remains restored.
5. Verify Student B session/data cannot contaminate Student A.

---

# D. Period 2 / Completion Test

Complete:

```text
A05
A06
A07
A08
Exit Ticket
```

Check:

- A05 worksheet uses real student inputs, not hardcoded values.
- A06 Product 2 is student-created and open reasoning remains needs_teacher_review.
- activity gates cannot be bypassed.
- lesson must NOT complete before A01–A08 + valid Exit Ticket.
- after all evidence:

```text
percentComplete = 100
status = completed
```

Only then lesson completion is allowed.

Do not introduce mastery decision in Phase 3.

---

# E. Teacher Evidence Check

Using existing teacher/backend capabilities, verify teacher can recover for the test student:

```text
StudentUID
lesson progress
current/last activity
responses
products
attempts where available
Exit Ticket
learning/session time where available
```

For open products confirm:

```text
isCorrect = null/blank
score = null/blank
evaluationStatus = needs_teacher_review
```

The evaluationStatus may be stored inside parsed ResponseValue JSON according to current Data Contract.

Do not create a new schema solely for this task.

---

# F. Offline / Idempotency Verification

Use automated tests where possible.

Verify:

1. an answer/event can be queued while offline;
2. reconnect syncs the queued event;
3. EventID/idempotency prevents duplicate storage;
4. one student's queue cannot be replayed into another student's identity.

If safe browser automation is unavailable, validate existing test coverage and mark the remaining browser action HUMAN_UAT_REQUIRED.

---

# G. Regression

Run at minimum:

```text
P3.3 suite
P2.5 suite
Phase 1.5 suite
Phase 1 audit suite
```

Expected previous baseline:

```text
P3.3: 30/30
P2.5: 20/20
Phase 1.5: 27/27
Phase 1: 79/79
```

---

# H. Bug Policy

If a bug touches:

```text
auth
StudentUID
Data Contract
completion contract
progress restore
backend identity
source governance
```

do NOT silently redesign.

Record:

```text
BUG ID
Steps to reproduce
Expected
Actual
Evidence
Suspected files
Risk
PROPOSED_CHANGE if needed
```

and return BLOCKED if architecture approval is required.

Small UI defects may be fixed only if clearly within scope and regression-tested.

---

# I. Production Safety

Never:

```text
merge main
push main
deploy GitHub Pages
deploy Apps Script
change production architecture
change production data outside legitimate test-user UAT
start Phase 4
```

---

# Required Report

Update:

```text
agent/AGENT_REPORT.md
```

with:

```text
Task ID: P3.4-B
Branch:
Base/Application Commit:
Final Commit:

Student isolation:
Resume from 50%:
Period 2:
Completion:
Teacher evidence:
Offline/idempotency:
Regression:

Files changed:
Commits created:
Human UAT still required:

Final Status:
READY_FOR_REVIEW
```

or:

```text
BLOCKED
```

If remaining browser/human validation is needed, explicitly include:

```text
HUMAN_UAT_REQUIRED
```

Then STOP.

Do not start Phase 4.
