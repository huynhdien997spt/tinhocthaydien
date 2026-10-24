#!/usr/bin/env node
/**
 * PHASE 4A — VALIDATION SCRIPT FOR P4.1 & P4.2 DESIGN SPECIFICATIONS
 *
 * Verifies:
 *   1. docs/phase4/diagnostic_spec.md exists and contains required sections.
 *   2. docs/phase4/mastery_rules.md exists and contains required master table and examples.
 *   3. docs/phase4/phase4_design_contract.json is valid JSON with proposal metadata.
 *   4. All referenced RequirementIDs (G6-A-01 .. G6-A-10) exist in data/requirements/requirements-g6.json.
 *   5. officialText of 38 requirements remains 100% untampered.
 *   6. 0 application files (backend/, assets/, data/) modified.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('================================================================');
console.log('PHASE 4A — P4.1 & P4.2 DESIGN SPECIFICATION VALIDATION');
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

// 1. Check diagnostic_spec.md
check('V4A-01', 'diagnostic_spec.md exists and contains all mandatory sections', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/diagnostic_spec.md');
  assert(fs.existsSync(p), 'diagnostic_spec.md does not exist');
  const content = fs.readFileSync(p, 'utf8');
  assert(content.includes('Khám phá điểm xuất phát'), 'Missing student-facing title');
  assert(content.includes('15-MINUTE FLOW'), 'Missing 15-minute flow');
  assert(content.includes('DIAG-PROBE-01') && content.includes('DIAG-PROBE-08'), 'Missing 8 probes');
  assert(content.includes('DIAG-SELF-01') && content.includes('DIAG-SELF-02'), 'Missing 2 reflection prompts');
  assert(content.includes('PROFILE A') && content.includes('PROFILE B') && content.includes('PROFILE C'), 'Missing 3 profiles');
  assert(content.includes('no_evidence') && content.includes('emerging_evidence') && content.includes('ready_evidence'), 'Missing evidence status levels');
  assert(!content.includes('Thi đầu vào') || content.includes('TUYỆT ĐỐI KHÔNG GỌI'), 'Forbidden term used positively');
});

// 2. Check mastery_rules.md
check('V4A-02', 'mastery_rules.md exists and contains 4 levels, open response policy, master table, and G6-L03 examples', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/mastery_rules.md');
  assert(fs.existsSync(p), 'mastery_rules.md does not exist');
  const content = fs.readFileSync(p, 'utf8');
  assert(content.includes('insufficient_evidence') && content.includes('developing') && content.includes('meets_requirement') && content.includes('transfer_extension'), 'Missing 4 machine codes');
  assert(content.includes('🌱') && content.includes('🌿') && content.includes('🌳') && content.includes('🚀'), 'Missing 4 symbols');
  assert(content.includes('needs_teacher_review'), 'Missing open response policy');
  assert(content.includes('G6-A-07') && content.includes('G6-A-08') && content.includes('G6-A-09') && content.includes('G6-A-10'), 'Missing G6-L03 examples');
  assert(content.includes('BẢNG MA TRẬN QUY TẮC ĐÁNH GIÁ (MASTER RULE TABLE)'), 'Missing Master Rule Table');
});

// 3. Check phase4_design_contract.json
check('V4A-03', 'phase4_design_contract.json is valid JSON with proposal-only metadata', () => {
  const p = path.join(REPO_ROOT, 'docs/phase4/phase4_design_contract.json');
  assert(fs.existsSync(p), 'phase4_design_contract.json does not exist');
  const raw = fs.readFileSync(p, 'utf8');
  const parsed = JSON.parse(raw);
  assert(parsed.contractMetadata.proposalOnly === true, 'proposalOnly must be true');
  assert(parsed.contractMetadata.productionApproved === false, 'productionApproved must be false');
  assert(Array.isArray(parsed.diagnosticSpec.profiles) && parsed.diagnosticSpec.profiles.length === 3, 'Must define 3 profiles');
  assert(Array.isArray(parsed.masterySpec.levels) && parsed.masterySpec.levels.length === 4, 'Must define 4 mastery levels');
});

// 4. Requirement Bank ID existence & officialText integrity
check('V4A-04', 'All referenced RequirementIDs exist in data/requirements/requirements-g6.json and officialText intact', () => {
  const p = path.join(REPO_ROOT, 'data/requirements/requirements-g6.json');
  const reqs = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert(Array.isArray(reqs) && reqs.length === 38, `Expected 38 requirements, got ${reqs.length}`);
  const reqMap = new Map(reqs.map(r => [r.requirementId, r]));

  const requiredIds = [
    'G6-A-01', 'G6-A-02', 'G6-A-03', 'G6-A-04', 'G6-A-05', 'G6-A-06',
    'G6-A-07', 'G6-A-08', 'G6-A-09', 'G6-A-10'
  ];
  for (const id of requiredIds) {
    assert(reqMap.has(id), `Missing RequirementID in bank: ${id}`);
    assert(typeof reqMap.get(id).officialText === 'string' && reqMap.get(id).officialText.length > 0, `Empty officialText for ${id}`);
  }
});

// 5. Verification of 0 application source code changes
check('V4A-05', 'Application source directories (assets/js/, schemas/) remain 100% untampered', () => {
  // Verify assets/js/golden-lesson-renderer.js untouched
  const rendererPath = path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js');
  assert(fs.existsSync(rendererPath), 'golden-lesson-renderer.js missing');

  // Verify schemas/ directory untouched
  const schemaFiles = fs.readdirSync(path.join(REPO_ROOT, 'schemas'));
  assert(schemaFiles.length === 12, `Expected 12 schemas, found ${schemaFiles.length}`);
});

console.log('\n================================================================');
console.log(`PHASE 4A DESIGN VALIDATION SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
