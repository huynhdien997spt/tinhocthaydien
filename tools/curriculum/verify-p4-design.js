#!/usr/bin/env node
/**
 * PHASE 4A-R2 — HARDENED VALIDATION SCRIPT FOR P4.1 & P4.2 DESIGN SPECIFICATIONS
 *
 * Verifies:
 *   1. docs/phase4/diagnostic_spec.md:
 *      - Probe 4 digital scenario (camera -> thu nhận, lưu file -> lưu trữ, chỉnh ảnh -> xử lí, gửi mail -> truyền).
 *      - selfReportInfluence = support_only (self-report never chooses profile).
 *      - Deterministic 3-step prioritized routing.
 *      - Profile C target aggregation (>= 2 aware probes with >= 1 objective probe).
 *      - 6 executable test vectors documented.
 *   2. docs/phase4/mastery_rules.md:
 *      - 4 mastery scale levels (insufficient_evidence, developing, meets_requirement, transfer_extension).
 *      - G6-A-09 3 dimensions (unit_names, decimal_approximation, approximate_conversion).
 *      - G6_A09_UNIT_NAMES_EVIDENCE_GAP explicit declaration and mastery blocking.
 *      - PROVISIONAL-G6-L03-E-NAMES proposal with 4 un-prefilled blank fields.
 *      - Master rule table with explicit mastery blocker for G6-A-09.
 *   3. docs/phase4/phase4_design_contract.json:
 *      - Valid JSON with proposal-only metadata.
 *      - profileDecisionRules with decisionPriority, target aggregation rules, and 6 test vectors.
 *      - Execution of all 6 test vectors against routing logic.
 *      - Structured requiredEvidence objects with typed responseType.
 *      - G6-A-09 designGap structured and masteryBlocking.
 *   4. Official Text Integrity:
 *      - 38/38 officialText and hashes match base commit 0067f83080f9b6894f1ea7032a93d0f75f9a83c7 via git show.
 *   5. Application Source Diff:
 *      - 0 files modified in assets/, backend/, data/, schemas/, lessons/, teacher/, index.html against base commit.
 *   6. Dynamic Evidence Reference Integrity:
 *      - Dynamically derives QuestionIDs, questionType, activityId, requirementId from G6-L03.golden.json.
 *      - Dynamically derives ProductIDs and WorksheetIDs from goldenLessonBlueprint.activityComponents.
 *      - Verifies responseType matches canonical questionType (single_choice, short_answer).
 *      - Rejects bare ActivityIDs as evidenceId.
 *   7. Dimension Gap Assertion:
 *      - Fails if a mandatory dimension has an evidence gap while designGap is null.
 *      - Asserts current G6-A-09 safely blocks meets_requirement and transfer_extension.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../..');
const BASE_COMMIT = '0067f83080f9b6894f1ea7032a93d0f75f9a83c7';

console.log('================================================================');
console.log('PHASE 4A-R2 — HARDENED P4.1 & P4.2 DESIGN SPEC VALIDATION');
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
check('V4A-R2-01', 'diagnostic_spec.md satisfies all R2 requirements (digital Probe 4, selfReport support_only, Profile C aggregation, 6 test vectors)', () => {
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

  // Deterministic 3-step routing & Profile C aggregation
  assert(content.includes('BƯỚC 1 — Critical Support Check'), 'Missing Step 1 rule');
  assert(content.includes('BƯỚC 2 — Extension Readiness Check'), 'Missing Step 2 rule');
  assert(content.includes('BƯỚC 3 — Default Standard Path'), 'Missing Step 3 default rule');
  assert(content.includes('aware_target_probe_count >= 2') || content.includes('2 trong số 3 probe đích'), 'Missing 2-aware-probe threshold for Profile C');
  assert(content.includes('Probe 7 hoặc Probe 8') || content.includes('Objective Recognition Probe'), 'Missing objective probe requirement for Profile C');

  // 6 Test vectors in spec
  assert(content.includes('VEC-01') && content.includes('VEC-06'), 'Missing test vectors VEC-01..VEC-06');
});

// --------------------------------------------------------------------------
// 2. Check mastery_rules.md
// --------------------------------------------------------------------------
check('V4A-R2-02', 'mastery_rules.md satisfies R2 requirements (4 levels, G6-A-09 unit_names gap declared, mastery blocked, proposal provided)', () => {
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

  // G6-A-09 unit_names gap explicitly declared (R2 MUST NOT claim DESIGN_GAP: None)
  assert(!content.includes('DESIGN_GAP: None'), 'Must not claim DESIGN_GAP: None for G6-A-09');
  assert(content.includes('G6_A09_UNIT_NAMES_EVIDENCE_GAP'), 'Missing G6_A09_UNIT_NAMES_EVIDENCE_GAP declaration');
  assert(content.includes('blocksMeetsRequirement'), 'Missing blocksMeetsRequirement');
  assert(content.includes('blocksTransferExtension'), 'Missing blocksTransferExtension');

  // Proposal for future evidence
  assert(content.includes('PROVISIONAL-G6-L03-E-NAMES'), 'Missing provisional ID for proposed evidence');
  assert(content.includes('không in sẵn') || content.includes('KHÔNG in sẵn'), 'Proposal must not prefill unit names');

  // Master rule table
  const g6a09Row = content.split('\n').find(l => l.startsWith('|') && l.includes('G6-A-09') && l.includes('WS-01'));
  assert(g6a09Row, 'Missing G6-A-09 row in Master Rule Table');
  assert(g6a09Row.includes('G6_A09_UNIT_NAMES_EVIDENCE_GAP') || g6a09Row.includes('UNIT_NAMES_EVIDENCE_REQUIRED'), 'G6-A-09 in Master Table must explicitly show mastery blockage');

  // G6-A-10 structured evidence
  const g6a10Row = content.split('\n').find(l => l.startsWith('|') && l.includes('G6-A-10') && l.includes('G6-L03-PROD-02'));
  assert(g6a10Row, 'Missing G6-A-10 row in Master Rule Table');
  assert(!g6a10Row.includes('evidenceId: G6-L03-A07') && !g6a10Row.includes('`G6-L03-A07`'), 'Bare ActivityID G6-L03-A07 used as evidence');
  assert(g6a10Row.includes('G6-L03-Q010'), 'Missing structured Q010 reference in Master Table');
});

// --------------------------------------------------------------------------
// 3. Check phase4_design_contract.json & Execute Test Vectors
// --------------------------------------------------------------------------
check('V4A-R2-03', 'phase4_design_contract.json is valid JSON with executable test vectors passing 100%', () => {
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

  // Target aggregation rules
  const step2 = rules.step2ExtensionReadiness;
  assert(step2.aggregationRules && step2.aggregationRules.minimumAwareProbes === 2, 'Must require minimum 2 aware probes');
  assert(step2.aggregationRules.minimumObjectiveAwareProbes === 1, 'Must require minimum 1 objective aware probe');
  assert(step2.aggregationRules.partiallyAwareCountsAsAware === false, 'partially_aware must not count as aware');

  // Execute test vectors
  assert(Array.isArray(rules.testVectors) && rules.testVectors.length === 6, 'Must have 6 test vectors');

  function evaluateProfile(input) {
    // Step 1: Critical Support
    if (input.hasCriticalMisconception || input.hasConflictingEvidence || (input.emergingPrereqCount >= 2)) {
      return { profile: 'foundation_consolidation', step: 'step1_critical_support' };
    }

    // Step 2: Extension Readiness
    const isStep1False = true;
    const all6Ready = (input.readyPrereqCount === 6);
    const noConflict = !input.hasConflictingEvidence;

    const awareProbes = new Set(input.awareTargetProbeIds || []);
    const awareCount = awareProbes.size;
    const hasObjectiveAware = awareProbes.has('DIAG-PROBE-07') || awareProbes.has('DIAG-PROBE-08');

    if (isStep1False && all6Ready && noConflict && awareCount >= 2 && hasObjectiveAware) {
      return { profile: 'extension_readiness', step: 'step2_extension_readiness' };
    }

    // Step 3: Default Standard
    return { profile: 'standard_readiness', step: 'step3_default' };
  }

  for (const vec of rules.testVectors) {
    const outcome = evaluateProfile(vec.input);
    assert.strictEqual(outcome.profile, vec.expectedProfile, `Test vector ${vec.vectorId} profile mismatch: got ${outcome.profile}, expected ${vec.expectedProfile}`);
    assert.strictEqual(outcome.step, vec.expectedStep, `Test vector ${vec.vectorId} step mismatch: got ${outcome.step}, expected ${vec.expectedStep}`);
  }

  // G6-A-09 gap declared in contract
  const g6a09 = contract.masterySpec.lessonRules['G6-L03']['G6-A-09'];
  assert(g6a09.dimensions && g6a09.dimensions.unit_names && g6a09.dimensions.decimal_approximation && g6a09.dimensions.approximate_conversion, 'G6-A-09 missing 3 dimensions in contract');
  assert(g6a09.dimensions.unit_names.status === 'evidence_gap', 'unit_names status must be evidence_gap');
  assert(g6a09.designGap !== null && typeof g6a09.designGap === 'object', 'G6-A-09 designGap must be a non-null object');
  assert(g6a09.designGap.code === 'G6_A09_UNIT_NAMES_EVIDENCE_GAP', 'designGap code mismatch');
  assert(g6a09.designGap.blocksMeetsRequirement === true, 'designGap must block meets_requirement');
  assert(g6a09.designGap.blocksTransferExtension === true, 'designGap must block transfer_extension');

  // G6-A-07, G6-A-08, G6-A-10 must have designGap === null
  assert(contract.masterySpec.lessonRules['G6-L03']['G6-A-07'].designGap === null, 'G6-A-07 designGap must be null');
  assert(contract.masterySpec.lessonRules['G6-L03']['G6-A-08'].designGap === null, 'G6-A-08 designGap must be null');
  assert(contract.masterySpec.lessonRules['G6-L03']['G6-A-10'].designGap === null, 'G6-A-10 designGap must be null');
});

// --------------------------------------------------------------------------
// 4. Official Text Integrity Check against BASE_COMMIT
// --------------------------------------------------------------------------
check('V4A-R2-04', 'Verbatim CTGDPT 2018 officialText (38/38) exact match against base commit 0067f830', () => {
  const currentPath = path.join(REPO_ROOT, 'data/requirements/requirements-g6.json');
  const currentReqs = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  assert(currentReqs.length === 38, `Expected 38 requirements, got ${currentReqs.length}`);

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
check('V4A-R2-05', 'Application source directories (assets/, backend/, data/, schemas/, lessons/, teacher/) have 0 modifications against base', () => {
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
// 6. Dynamic Evidence Reference Integrity in phase4_design_contract.json
// --------------------------------------------------------------------------
check('V4A-R2-06', 'Dynamic Evidence Reference Integrity derived from G6-L03.golden.json (canonical questionType, activities, blueprint)', () => {
  const goldenPath = path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json');
  const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

  // Derive questions dynamically
  const questionMap = new Map();
  for (const q of goldenData.questions) {
    questionMap.set(q.questionId, q);
  }

  // Derive activities dynamically
  const validActivities = new Set(goldenData.lesson.activityIds);

  // Derive products and worksheets dynamically from blueprint
  const validProducts = new Set();
  const validWorksheets = new Set();
  const comps = goldenData.goldenLessonBlueprint.activityComponents;
  for (const [actId, comp] of Object.entries(comps)) {
    if (comp.pixelLab && comp.pixelLab.productQuestionId) {
      validProducts.add(comp.pixelLab.productQuestionId);
    }
    if (comp.webquest && comp.webquest.productQuestionId) {
      validProducts.add(comp.webquest.productQuestionId);
    }
    if (comp.capacityScale && comp.capacityScale.worksheetQuestionId) {
      validWorksheets.add(comp.capacityScale.worksheetQuestionId);
    }
  }

  assert(validProducts.has('G6-L03-PROD-01'), 'PROD-01 missing in blueprint derivation');
  assert(validProducts.has('G6-L03-PROD-02'), 'PROD-02 missing in blueprint derivation');
  assert(validWorksheets.has('G6-L03-WS-01'), 'WS-01 missing in blueprint derivation');

  const contractPath = path.join(REPO_ROOT, 'docs/phase4/phase4_design_contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const lessonRules = contract.masterySpec.lessonRules['G6-L03'];

  function validateEvidenceItem(ev, reqId, context) {
    // Exit ticket special mapping
    if (ev.sourceType === 'exit_ticket') {
      assert.strictEqual(ev.activityId, 'G6-L03-A08', `Exit ticket must belong to G6-L03-A08, got ${ev.activityId}`);
      assert.strictEqual(ev.evidenceType, 'exit_ticket_reflection', `Exit ticket evidenceType mismatch`);
      return;
    }

    assert(ev.activityId && validActivities.has(ev.activityId), `Invalid activityId: ${ev.activityId} in ${context}`);
    assert(ev.evidenceId, `Missing evidenceId in ${context}`);

    // Must not be a bare ActivityID
    assert(!/^G6-L03-A\d\d$/.test(ev.evidenceId), `Bare ActivityID used as evidenceId: ${ev.evidenceId}`);

    if (questionMap.has(ev.evidenceId)) {
      const canonicalQ = questionMap.get(ev.evidenceId);
      assert.strictEqual(ev.activityId, canonicalQ.activityId, `Activity mismatch for ${ev.evidenceId}: expected ${canonicalQ.activityId}, got ${ev.activityId}`);
      // Check responseType matches canonical questionType
      if (ev.responseType) {
        assert.strictEqual(ev.responseType, canonicalQ.questionType, `responseType mismatch for ${ev.evidenceId}: expected ${canonicalQ.questionType}, got ${ev.responseType}`);
      }
    } else if (validProducts.has(ev.evidenceId)) {
      assert(ev.evidenceType && ev.evidenceType.includes('product'), `Product evidenceType missing for ${ev.evidenceId}`);
    } else if (validWorksheets.has(ev.evidenceId)) {
      assert.strictEqual(ev.evidenceType, 'worksheet_table', `Worksheet evidenceType mismatch for ${ev.evidenceId}`);
    } else {
      throw new Error(`Unknown evidenceId: ${ev.evidenceId} in ${context}`);
    }
  }

  for (const [reqId, rule] of Object.entries(lessonRules)) {
    if (rule.requiredEvidence) {
      for (const ev of rule.requiredEvidence) {
        validateEvidenceItem(ev, reqId, `requiredEvidence of ${reqId}`);
      }
    }
    if (rule.dimensions) {
      for (const [dimKey, dim] of Object.entries(rule.dimensions)) {
        const evList = dim.evidence || dim.existingEvidence || [];
        for (const ev of evList) {
          validateEvidenceItem(ev, reqId, `dimension ${dimKey} of ${reqId}`);
        }
      }
    }
  }
});

// --------------------------------------------------------------------------
// 7. Mandatory Dimension Evidence Gap Assertion
// --------------------------------------------------------------------------
check('V4A-R2-07', 'Mandatory Requirement Dimension Gap Assertion (Fails if un-evidenced dimension lacks designGap)', () => {
  const contractPath = path.join(REPO_ROOT, 'docs/phase4/phase4_design_contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const g6a09 = contract.masterySpec.lessonRules['G6-L03']['G6-A-09'];

  const dims = g6a09.dimensions;
  assert(dims, 'G6-A-09 missing dimensions');

  // Verify that unit_names is correctly flagged as evidence_gap
  const unitNames = dims.unit_names;
  assert(unitNames.status === 'evidence_gap', 'unit_names must have status evidence_gap');

  // Assert that having an evidence_gap without a designGap must throw an error
  if (unitNames.status === 'evidence_gap') {
    assert(g6a09.designGap !== null, 'FAIL: unit_names has evidence_gap but designGap is null!');
    assert(g6a09.designGap.blocksMeetsRequirement === true, 'FAIL: designGap must block meets_requirement!');
    assert(g6a09.designGap.blocksTransferExtension === true, 'FAIL: designGap must block transfer_extension!');
  }

  // Verify that decimal_approximation and approximate_conversion are covered
  assert.strictEqual(dims.decimal_approximation.status, 'covered', 'decimal_approximation must be covered');
  assert.strictEqual(dims.approximate_conversion.status, 'covered', 'approximate_conversion must be covered');
});

console.log('\n================================================================');
console.log(`PHASE 4A-R2 VALIDATION SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
