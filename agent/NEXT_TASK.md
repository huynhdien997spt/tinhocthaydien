# CURRENT TASK

Read `agent/AGENT_RULES.md` and this file completely before work.

## Task ID
P4A-R2

## Task Name
Phase 4A Design Review Corrections — Evidence Coverage, Typed References & Deterministic Readiness

## Branch / Baseline
- Repository: huynhdien997spt/tinhocthaydien
- Branch: phase4-diagnostic-design-review
- Reviewed R1 HEAD: c7cfe8f884f7617cec122f5383d666fc38cf78b9
- Phase 3 immutable base: 0067f83080f9b6894f1ea7032a93d0f75f9a83c7
- Application baseline: ecc56e274739078b431cf8fe294040a9cb6bacf5
- Golden Lesson: G6-L03

## Review outcome
P4A-R1 is **NOT YET APPROVED**. Its Git diff is documentation/validator-only, but three design issues remain. Do not start P4.3.

## Required fixes (design/docs/validator only)

### R2-01: G6-A-09 mastery evidence gap — do not claim complete coverage
The existing `G6-L03-WS-01` UI displays the labels "1 KB", "byte", "1 MB", "KB", "1 GB", "MB" and asks students to enter **only numeric conversion values**. `Q006` asks 1 GB ≈ ? MB and `Q007` asks 3 GB ≈ ? MB. These show approximate magnitude/conversion, but do not independently elicit students to **name all four units Byte, KB, MB, GB**.

- In `docs/phase4/mastery_rules.md` and `docs/phase4/phase4_design_contract.json`, mark `G6-A-09.dimensions.unit_names` as **DESIGN_GAP / evidence_not_yet_sufficient** for mastery; distinguish exposure to printed labels from a valid independent response demonstrating "nêu được tên".
- Remove `designGap: null` and `DESIGN_GAP: None` claims for this requirement. Record the precise gap and a **proposal only** for a future separately approved evidence probe (e.g. student independently names units); do NOT add that probe to Golden Lesson now.
- Preserve 100% lesson completion semantics separately from mastery: completion can be 100% while mastery for G6-A-09 is not yet `meets_requirement`.
- Review all G6-A-07..10 evidence dimensions for similar overclaims; document any gaps without altering application or lesson source.

### R2-02: Typed evidence references must match actual question/response types
The contract currently maps `G6-L03-Q002` and `G6-L03-Q005` to `evidenceType: quiz_response`, but their canonical `questionType` in `data/lessons/G6-L03.golden.json` is `short_answer`. The renderer saves `responseType: q.questionType`.

- Normalize the proposal's typed reference convention: `sourceType: response` for records from the existing response store, with `evidenceType` or `responseType` matching the canonical question type (`single_choice` / `short_answer`) OR clearly document a consistent umbrella mapping plus an explicit canonical responseType. Never silently label a short answer as a multiple-choice response.
- Preserve `worksheet_table`, product and exit-ticket distinctions and `needs_teacher_review` semantics.
- Enhance validator to derive QuestionIDs and their questionType/activityId/requirementId from the actual Golden Lesson JSON; derive product/worksheet IDs from its blueprint instead of a hardcoded whitelist. Reject type mismatches, mismatched activity/requirement mappings, bare ActivityIDs masquerading as EvidenceIDs, and nonexistent references. Allow Exit Ticket only by its documented activityId + sourceType + evidenceType mapping.
- Do not modify production schemas, Data Contract, StudentUID, auth, source governance or existing application responses.

### R2-03: Profile C target-readiness aggregation must be executable and conservative
Current `target_readiness_signal in ['partially_aware','aware']` is singular while there are three target probes. It does not specify aggregation and can route Profile C on a single weak awareness signal.

- Specify a deterministic per-probe-to-profile aggregation rule: Profile C requires 6/6 prerequisite `ready_evidence`, no critical conflict, AND at least **two** distinct target probes with credible `aware` evidence; at least one of those two must be objective recognition (not merely a student's statement that they have heard of a term). `partially_aware` alone does not satisfy the Profile C threshold.
- Probe 6's self-reported familiarity alone must not confer Profile C. Probes 7 and 8 should define how an objective response yields `aware`.
- Keep Step 1 (critical misconception/conflict/≥2 non-ready) highest priority, Step 2 extension, Step 3 standard default. Self-report prompts `DIAG-SELF-01/02` remain support-only.
- Add executable test vectors for: 4 ready + 2 emerging → A; 5 ready + 1 emerging → B; 6 ready + only one weak target signal → B; 6 ready + two credible aware target signals (≥1 objective) → C; 6 ready + self-report guided + insufficient target evidence → B; conflicting evidence → A.
- No diagnostic auto-mastery, skipping mandatory YCCĐ, or auto-completion.

## Validation and report
Run the enhanced `tools/curriculum/verify-p4-design.js` plus all relevant design checks. Keep exact 38/38 officialText integrity vs Phase 3 base and zero application-source changes (real git diff). Make validator assert gaps are truthfully represented, not just that text strings are present. Run regression only if source changes (source changes are prohibited in this task).

Allowed files: `docs/phase4/*`, `tools/curriculum/verify-p4-design.js`, `agent/AGENT_REPORT.md`, `agent/NEXT_TASK.md`.
Forbidden: `assets/`, `backend/`, `data/`, `schemas/`, `lessons/`, `teacher/`, `index.html`, `main` changes, deployment, production writes, Phase 4.3 engine.

Update `agent/AGENT_REPORT.md` with:
- Task ID P4A-R2; branch; reviewed R1 head; actual remote revision head (read from git, no recursive amend cycle).
- Unit-name evidence gap status and mastery implications.
- Typed reference validation and counts.
- Profile C aggregation and 6 test-vector outcomes.
- 38/38 officialText and 0 application source diff.
- Files changed, tests, blockers.
- Final status `READY_FOR_REVIEW` or `BLOCKED`.

Commit/push only to `phase4-diagnostic-design-review`, then STOP. Do not start P4.3.
