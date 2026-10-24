#!/usr/bin/env node
/**
 * PHASE 4A-R1 — HARDENED VALIDATION SCRIPT FOR P4.1 & P4.2 DESIGN SPECIFICATIONS
 *
 * Verifies:
 *   1. docs/phase4/diagnostic_spec.md exists and contains hardened R1 specifications:
 *      - Probe 4 digital scenario (camera -> thu nhận, lưu file -> lưu trữ, chỉnh ảnh -> xử lí, gửi mail -> truyền).
 *      - selfReportInfluence = support_only (self-report never chooses profile).
 *      - Deterministic 3-step prioritized profile routing (Step 1 -> Step 2 -> Step 3).
 *   2. docs/phase4/mastery_rules.md exists and contains:
 *      - G6-A-09 explicit 3-dimension breakdown (unit_names, decimal_approximation, approximate_conversion).
 *      - Structured requiredEvidence without bare ActivityIDs.
 *      - Master rule table for all 4 YCCĐ.
 *   3. docs/phase4/phase4_design_contract.json is valid JSON with:
 *      - proposal-only metadata.
 *      - deterministic profileDecisionRules with decisionPriority.
 *      - structured evidence objects with evidenceId, activityId, sourceType, evidenceType.
 *   4. Official Text Integrity:
 *      - Exactly compares requirements-g6.json against base commit 0067f83080f9b6894f1ea7032a93d0f75f9a83c7 (38/38 exact match).
 *   5. Application Source Diff:
 *      - Verifies 0 application files (assets/, backend/, data/, schemas/, lessons/, teacher/, index.html) modified against base.
 *   6. Evidence Reference Integrity:
 *      - All evidenceId references match G6-L03.golden.json questions/products.
 *      - No bare ActivityID used as evidenceId.
 *   7. Three-dimension mapping for G6-A-09 validated with DESIGN_GAP: null.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../..');
const BASE_COMMIT = '0067f83080f9b6894f1ea7032a93d0f75f9a83c7';

console.log('================================================================');
console.log('PHASE 4A-R1 — HARDENED P4.1 & P4.2 DESIGN SPEC VALIDATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function check(id, title, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${id}: ${title}`);
    passed++;
  } catch (e) {
    console.error(`❌ [FAIL] ${id}: ${title}`);
    console.error('   ', e.message);
    failed++;
  }
}

// --------------------------------------------------------------------------
// 1. Check diagnostic_spec.md
// --------------------------------------------------------------------------
check('V4A-R1-01', 'diagnostic_spec.md satisfies all R1 requirements (digital Probe 4, selfReport support_only, deterministic rules)', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/diagnostic_spec.md');
  assert(fs.existsSync(p), 'diagnostic_spec.md does not exist');
  const content = fs.readFileSync(p, 'utf8');

  // Title and terminology
  assert(content.includes('Khám phá điểm xuất phát'), 'Missing student-facing title');
  assert(!content.includes('Thi đầu vào') || content.includes('TUYỆT ĐỐI KHÔNG GỌI'), 'Forbidden term used positively');

  // Flow and structure
  assert(content.includes('15-MINUTE FLOW'), 'Missing 15-minute flow');
  assert(content.includes('DIAG-PROBE-01') && content.includes('DIAG-PROBE-08'), 'Missing 8 probes');
  assert(content.includes('DIAG-SELF-01') && content.includes('DIAG-SELF-02'), 'Missing 2 reflection prompts');

  // Probe 4 digital scenario
  assert(content.includes('Camera') && content.includes('kyniem.jpg') && content.includes('email'), 'Probe 4 must use digital photo scenario');
  assert(!content.includes('cơ thể hành động = truyền thông tin') && !content.includes('bước chân về lớp học đó'), 'Probe 4 still contains bodily action analogy');

  // Self-report auxiliary only
  assert(content.includes('selfReportInfluence = "support_only"'), 'Missing selfReportInfluence = support_only');
  assert(content.includes('TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP TỰ QUYẾT ĐỊNH LEARNING PROFILE'), 'Self-report must not determine profile');

  // Deterministic 3-step routing
  assert(content.includes('BƯỚC 1 — Critical Support Check'), 'Missing Step 1 rule');
  assert(content.includes('BƯỚC 2 — Extension Readiness Check'), 'Missing Step 2 rule');
  assert(content.includes('BƯỚC 3 — Default Standard Path'), 'Missing Step 3 default rule');
});

// --------------------------------------------------------------------------
// 2. Check mastery_rules.md
// --------------------------------------------------------------------------
check('V4A-R1-02', 'mastery_rules.md contains 4 levels, G6-A-09 three dimensions, structured evidence references and master table', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/mastery_rules.md');
  assert(fs.existsSync(p), 'mastery_rules.md does not exist');
  const content = fs.readFileSync(p, 'utf8');

  // 4 levels and symbols
  assert(content.includes('insufficient_evidence') && content.includes('developing') && content.includes('meets_requirement') && content.includes('transfer_extension'), 'Missing 4 machine codes');
  assert(content.includes('🌱') && content.includes('🌿') && content.includes('🌳') && content.includes('🚀'), 'Missing 4 symbols');

  // Open response & teacher review
  assert(content.includes('needs_teacher_review'), 'Missing open response policy');

  // G6-A-09 3 dimensions
  assert(content.includes('unit_names') && content.includes('decimal_approximation') && content.includes('approximate_conversion'), 'Missing G6-A-09 3-dimension mapping');
  assert(content.includes('DESIGN_GAP: None'), 'Missing DESIGN_GAP confirmation for G6-A-09');

  // G6-A-10 structured evidence (no bare ActivityID as evidenceId in Master Table)
  const g6a10Row = content.split('\n').find(l => l.includes('G6-A-10') && l.includes('G6-L03-PROD-02'));
  assert(g6a10Row, 'Missing G6-A-10 row in Master Rule Table');
  assert(!g6a10Row.includes('evidenceId: G6-L03-A07') && !g6a10Row.includes('`G6-L03-A07`'), 'Bare ActivityID G6-L03-A07 used as evidence');
  assert(g6a10Row.includes('G6-L03-Q010'), 'Missing structured Q010 reference in Master Table');

  // Master rule table
  assert(content.includes('BẢNG MA TRẬN QUY TẮC ĐÁNH GIÁ (MASTER RULE TABLE)'), 'Missing Master Rule Table');
});

// --------------------------------------------------------------------------
// 3. Check phase4_design_contract.json
// --------------------------------------------------------------------------
check('V4A-R1-03', 'phase4_design_contract.json is valid JSON with deterministic decision rules and structured evidence', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/phase4_design_contract.json');
  assert(fs.existsSync(p), 'phase4_design_contract.json does not exist');
  const raw = fs.readFileSync(p, 'utf8');
  const contract = JSON.parse(raw);

  // Metadata
  assert(contract.contractMetadata.proposalOnly === true, 'proposalOnly must be true');
  assert(contract.contractMetadata.productionApproved === false, 'productionApproved must be false');

  // Self-report support only
  assert(contract.diagnosticSpec.selfReportInfluence === 'support_only', 'selfReportInfluence must be support_only');
  assert(contract.diagnosticSpec.governanceRules.selfReportCanChooseProfile === false, 'selfReportCanChooseProfile must be false');

  // Deterministic profile rules
  const rules = contract.diagnosticSpec.profileDecisionRules;
  assert(Array.isArray(rules.decisionPriority) && rules.decisionPriority.length === 3, 'Must have 3 priority steps');
  assert(rules.decisionPriority[0] === 'step1_critical_support', 'Step 1 must be critical support check');
  assert(rules.decisionPriority[1] === 'step2_extension_readiness', 'Step 2 must be extension readiness check');
  assert(rules.decisionPriority[2] === 'step3_default', 'Step 3 must be default');
  assert(rules.defaultProfile === 'standard_readiness', 'Default profile must be standard_readiness');

  // G6-A-09 3 dimensions in contract
  const g6a09 = contract.masterySpec.lessonRules['G6-L03']['G6-A-09'];
  assert(g6a09.dimensions && g6a09.dimensions.unit_names && g6a09.dimensions.decimal_approximation && g6a09.dimensions.approximate_conversion, 'G6-A-09 missing 3 dimensions in contract');
  assert(g6a09.designGap === null, 'G6-A-09 designGap must be null');

  // G6-A-10 structured evidence
  const g6a10 = contract.masterySpec.lessonRules['G6-L03']['G6-A-10'];
  assert(Array.isArray(g6a10.requiredEvidence), 'G6-A-10 requiredEvidence must be array');
  for (const ev of g6a10.requiredEvidence) {
    if (ev.evidenceId) {
      assert(!/^G6-L03-A\d\d$/.test(ev.evidenceId), `Bare ActivityID used as evidenceId: ${ev.evidenceId}`);
    }
  }
});

// --------------------------------------------------------------------------
// 4. Official Text Integrity Check against BASE_COMMIT
// --------------------------------------------------------------------------
check('V4A-R1-04', 'Verbatim CTGDPT 2018 officialText (38/38) exact match against base commit 0067f830', () => {
  const currentPath = path.join(REPO_ROOT, 'data/requirements/requirements-g6.json');
  const currentReqs = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  assert(currentReqs.length === 38, `Expected 38 requirements, got ${currentReqs.length}`);

  // Fetch base requirements from git
  let baseReqsRaw;
  try {
    baseReqsRaw = execSync(`git show ${BASE_COMMIT}:data/requirements/requirements-g6.json`, { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Failed to fetch base requirements via git show: ${e.message}`);
  }
  const baseReqs = JSON.parse(baseReqsRaw);
  assert(baseReqs.length === 38, `Base had ${baseReqs.length} requirements`);

  const baseMap = new Map(baseReqs.map(r => [r.requirementId, r]));
  for (const cur of currentReqs) {
    const base = baseMap.get(cur.requirementId);
    assert(base, `RequirementID ${cur.requirementId} not found in base`);
    assert.strictEqual(cur.officialText, base.officialText, `officialText mismatch for ${cur.requirementId}`);
    assert.strictEqual(cur.officialTextHash, base.officialTextHash, `officialTextHash mismatch for ${cur.requirementId}`);
  }
});

// --------------------------------------------------------------------------
// 5. Application Source Diff Check against BASE_COMMIT
// --------------------------------------------------------------------------
check('V4A-R1-05', 'Application source directories (assets/, backend/, data/, schemas/, lessons/, teacher/) have 0 modifications against base', () => {
  let diffOutput;
  try {
    diffOutput = execSync(`git diff --name-only ${BASE_COMMIT}..HEAD`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    throw new Error(`git diff failed: ${e.message}`);
  }

  const modifiedFiles = diffOutput.split('\n').map(s => s.trim()).filter(Boolean);
  const forbiddenDirs = ['assets/', 'backend/', 'data/', 'schemas/', 'lessons/', 'teacher/'];
  const violations = [];

  for (const f of modifiedFiles) {
    for (const d of forbiddenDirs) {
      if (f.startsWith(d) || f === 'index.html') {
        violations.push(f);
      }
    }
  }

  assert(violations.length === 0, `Forbidden application files modified against base commit: ${violations.join(', ')}`);
});

// --------------------------------------------------------------------------
// 6. Evidence Reference Integrity in phase4_design_contract.json
// --------------------------------------------------------------------------
check('V4A-R1-06', 'All evidence references in phase4_design_contract.json exist in G6-L03.golden.json', () => {
  const goldenPath = path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json');
  const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

  const validQuestions = new Set(goldenData.lesson.questionIds);
  const validActivities = new Set(goldenData.lesson.activityIds);
  const validProducts = new Set(['G6-L03-PROD-01', 'G6-L03-PROD-02', 'G6-L03-WS-01']);

  const contractPath = path.join(REPO_ROOT, 'docs/phase4/phase4_design_contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const lessonRules = contract.masterySpec.lessonRules['G6-L03'];

  for (const [reqId, rule] of Object.entries(lessonRules)) {
    if (rule.requiredEvidence) {
      for (const ev of rule.requiredEvidence) {
        if (ev.activityId) {
          assert(validActivities.has(ev.activityId), `Unknown activityId: ${ev.activityId} in ${reqId}`);
        }
        if (ev.evidenceId) {
          const isQ = validQuestions.has(ev.evidenceId);
          const isP = validProducts.has(ev.evidenceId);
          assert(isQ || isP, `Unknown evidenceId: ${ev.evidenceId} in ${reqId}`);
        }
      }
    }
    if (rule.dimensions) {
      for (const [dimKey, dim] of Object.entries(rule.dimensions)) {
        for (const ev of dim.evidence) {
          if (ev.activityId) {
            assert(validActivities.has(ev.activityId), `Unknown activityId: ${ev.activityId} in ${reqId}.${dimKey}`);
          }
          if (ev.evidenceId) {
            const isQ = validQuestions.has(ev.evidenceId);
            const isP = validProducts.has(ev.evidenceId);
            assert(isQ || isP, `Unknown evidenceId: ${ev.evidenceId} in ${reqId}.${dimKey}`);
          }
        }
      }
    }
  }
});

console.log('\n================================================================');
console.log(`PHASE 4A-R1 VALIDATION SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
